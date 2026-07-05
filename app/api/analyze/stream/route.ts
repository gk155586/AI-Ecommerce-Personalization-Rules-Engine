import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { runDeterministicRules } from '@/lib/rules';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  // 1. Verify user is authenticated
  const token = req.cookies.get('token')?.value;
  if (!token || !(await verifyToken(token))) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { user, events } = await req.json();

    if (!events || events.length === 0) {
      return new NextResponse(JSON.stringify({ error: 'Missing events' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const rulesResult = runDeterministicRules(events);

    // Determine A/B Test Variant (deterministic based on the last char of User ID)
    const charCode = user.charCodeAt(user.length - 1) || 0;
    const abVariant = charCode % 2 === 0 ? 'A' : 'B';

    // 2. Fetch customer history from database for RAG context
    let historySummary = '';
    let ragHistoryUsed: string[] = [];

    try {
      const pastSessions = await prisma.shopperSession.findMany({
        where: { user },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      if (pastSessions.length > 0) {
        ragHistoryUsed = pastSessions.map(
          ps => `${ps.createdAt.toLocaleDateString()}: Rule='${ps.rulePrediction}', AI='${ps.aiClassification}', Nudge='${ps.recommendedAction}', Converted=${ps.isConversion}`
        );

        historySummary = pastSessions.map((ps, idx) => {
          return `${idx + 1}. Session Date: ${ps.createdAt.toLocaleDateString()}
   - Rule Classification: ${ps.rulePrediction}
   - Final AI Classification: ${ps.aiClassification}
   - Recommendation Copy (Variant ${ps.abVariant}): "${ps.recommendedAction}"
   - User Converted on Nudge: ${ps.isConversion ? 'YES' : 'NO'}`;
        }).join('\n\n');
      }
    } catch (dbError) {
      console.warn('RAG Database query in route failed, continuing without history:', dbError);
    }

    // Get OpenAI client
    const openai = getOpenAIClient();

    const systemPrompt = `You are an ecommerce personalization expert and product strategist.
Your task is to classify a shopper's behavioral segment based on their session event stream.

Output your step-by-step reasoning process out loud first, showing your active logic for the user to watch in real-time.
At the very end of your response, you MUST output a structured JSON block containing the final classification and marketing actions.
This JSON block must be enclosed between <JSON_RESPONSE> and </JSON_RESPONSE> tags like this:

<JSON_RESPONSE>
{
  "classification": "One of: Browser, Comparer, Discount Seeker, Cart Abandoner, Loyal Customer, Impulse Buyer, Returning Customer, Window Shopper",
  "confidence": 92,
  "evidence": ["Evidence 1", "Evidence 2"],
  "recommended_action": "Concise action recommendation",
  "reasoning": "A concise paragraph explaining your final classification."
}
</JSON_RESPONSE>

Keep your live reasoning brief (1-2 paragraphs) before outputting the final JSON block.`;

    const userPrompt = `Shopper User ID: ${user}
Events: ${JSON.stringify(events, null, 2)}
Deterministic Rules Suggestion: ${JSON.stringify(rulesResult, null, 2)}
${historySummary ? `\n--- HISTORICAL SHOPPER CONTEXT (RAG) ---\n${historySummary}` : ''}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.2
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = '';
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          // Parse JSON block and persist to SQLite database
          const jsonMatch = fullText.match(/<JSON_RESPONSE>([\s\S]*?)<\/JSON_RESPONSE>/);
          if (jsonMatch && jsonMatch[1]) {
            try {
              const ai = JSON.parse(jsonMatch[1].trim());
              
              // Persist the session
              const savedSession = await prisma.shopperSession.create({
                data: {
                  user,
                  events: JSON.stringify(events),
                  rulePrediction: rulesResult.preliminaryClassification,
                  ruleExplanations: rulesResult.matchedRules.join(', '),
                  aiClassification: ai.classification,
                  confidence: ai.confidence,
                  evidence: JSON.stringify(ai.evidence),
                  recommendedAction: ai.recommended_action,
                  reasoning: ai.reasoning,
                  abVariant,
                  isConversion: false
                }
              });

              // Increment A/B test impression stats
              await prisma.aBTestStats.upsert({
                where: {
                  classification_variant: {
                    classification: ai.classification,
                    variant: abVariant
                  }
                },
                update: {
                  impressions: { increment: 1 }
                },
                create: {
                  classification: ai.classification,
                  variant: abVariant,
                  recommendation: ai.recommended_action,
                  impressions: 1,
                  conversions: 0
                }
              });

              // Stream metadata block containing DB ID and variant details
              const metaBlock = `\n<METADATA_RESPONSE>${JSON.stringify({
                sessionId: savedSession.id,
                abVariant,
                ragHistoryUsed
              })}</METADATA_RESPONSE>`;
              
              controller.enqueue(encoder.encode(metaBlock));
            } catch (dbErr) {
              console.error('Error saving streamed session to database:', dbErr);
            }
          }
        } catch (streamErr: any) {
          controller.enqueue(encoder.encode(`\n[Stream Error: ${streamErr.message}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Streaming API Error:', error);
    return new NextResponse(JSON.stringify({ error: error.message || 'API key missing or configuration error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
