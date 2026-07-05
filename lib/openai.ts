import OpenAI from 'openai';
import { runDeterministicRules } from './rules';
import { AnalysisResult, ShopperSession } from '../types';

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error('OpenAI API key is missing. Please set your OPENAI_API_KEY in the `.env.local` file at the root of the project.');
  }
  return new OpenAI({ apiKey });
};

export async function analyzeShopperSession(
  session: ShopperSession,
  historySummary: string = ''
): Promise<AnalysisResult> {
  if (!session.events || session.events.length === 0) {
    throw new Error('Shopper session contains no events to analyze.');
  }

  // Step 1: Run deterministic rules
  const rulesResult = runDeterministicRules(session.events);

  // Step 2: Initialize OpenAI client
  let client: OpenAI;
  try {
    client = getOpenAIClient();
  } catch (e: any) {
    // Bubble up missing API key error
    throw new Error(e.message || 'OpenAI client configuration error.');
  }

  // Step 3: Define prompts
  const systemPrompt = `You are an ecommerce personalization expert and product strategist.
Your task is to classify a shopper's behavioral segment based on their session event stream.

Classify the shopper into EXACTLY one of the following shopper states:
- Browser
- Comparer
- Discount Seeker
- Cart Abandoner
- Loyal Customer
- Impulse Buyer
- Returning Customer
- Window Shopper

Rules for classification:
1. Use only the supplied events. Do not invent information or events that are not in the list.
2. Review the raw event log carefully.
3. You will also see the results of a simple deterministic rules engine. You should combine the deterministic rules logic (e.g. if coupon applied -> Discount Seeker suggestion) with your advanced reasoning.
4. If the deterministic recommendation is correct, confirm it. If the subtle pattern in the events suggests another state fits better (e.g., they checked out fast so they are an Impulse Buyer, despite also matching another category), make that decision and explain your reason.
5. Always provide explicit evidence gathered from the event stream. For example: "Viewed 3 different sneakers", "Applied a coupon code", "Left site without checkout".
6. Suggest a high-impact personalized site action or nudge that matches their state (e.g., "Offer a 10% discount coupon", "Show urgency countdown", "Display reviews", "Show free shipping banner").

You MUST return valid JSON. Do not wrap in markdown fences or include any conversational filler.

Format:
{
  "classification": "One of the exact shopper states listed above",
  "confidence": 92, // An integer between 0 and 100
  "evidence": [
    "Evidence point 1",
    "Evidence point 2"
  ],
  "recommended_action": "Personalized action recommendation (be concise)",
  "reasoning": "A concise paragraph explaining your classification decision, how it compares to the rules engine, and why you assigned the confidence score."
}`;

  const userPrompt = `Shopper User ID: ${session.user}
Events: ${JSON.stringify(session.events, null, 2)}
Deterministic Rules Suggestion: ${JSON.stringify(rulesResult, null, 2)}
${historySummary ? `\n--- HISTORICAL SHOPPER CONTEXT (RAG) ---\n${historySummary}\nUse this past history to understand repeat behavior and trends, tailoring your reasoning and recommended action accordingly.` : ''}`;

  // Step 4: Call OpenAI
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1 // Keep it low for consistent classification
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received an empty response from the OpenAI API.');
    }

    const parsed = JSON.parse(content) as AnalysisResult;

    // Validate structure
    const validStates = [
      'Browser',
      'Comparer',
      'Discount Seeker',
      'Cart Abandoner',
      'Loyal Customer',
      'Impulse Buyer',
      'Returning Customer',
      'Window Shopper'
    ];

    if (!parsed.classification || !validStates.includes(parsed.classification)) {
      parsed.classification = (rulesResult.preliminaryClassification as any) || 'Browser';
    }

    if (typeof parsed.confidence !== 'number' || isNaN(parsed.confidence)) {
      parsed.confidence = 70;
    } else {
      parsed.confidence = Math.max(0, Math.min(100, parsed.confidence));
    }

    if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) {
      parsed.evidence = [
        `Events occurred: ${session.events.length} user actions`,
        rulesResult.preliminaryClassification ? `Matched pattern: ${rulesResult.preliminaryClassification}` : 'Observed general browsing pattern'
      ];
    }

    if (!parsed.recommended_action) {
      parsed.recommended_action = 'Optimize site layout for general browsing.';
    }

    if (!parsed.reasoning) {
      parsed.reasoning = 'No reasoning was returned by the AI. Classification falls back to deterministic rules.';
    }

    return parsed;
  } catch (error: any) {
    console.error('OpenAI Error:', error);
    // Handle typical OpenAI API errors
    if (error.status === 401) {
      throw new Error('Authentication failed: The provided OpenAI API key is invalid or expired. Check your .env.local file.');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded: You have sent too many requests in a short time. Please check your OpenAI limits.');
    } else if (error.code === 'ENOTFOUND' || error.syscall === 'getaddrinfo') {
      throw new Error('Network error: Unable to reach the OpenAI API. Please check your internet connection.');
    }
    
    throw new Error(error.message || 'An unexpected error occurred during AI analysis.');
  }
}
