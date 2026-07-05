'use server';

import { analyzeShopperSession } from '@/lib/openai';
import { runDeterministicRules } from '@/lib/rules';
import { AnalysisResult, RuleMatchResult, ShopperSession, ShopperState } from '@/types';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { signToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export interface ActionResponse {
  success: boolean;
  data?: {
    user: string;
    events: string[];
    rules: RuleMatchResult;
    ai: AnalysisResult;
    abVariant: string;
    sessionId?: string; // DB ID of the saved session
    ragHistoryUsed?: string[]; // Log of what RAG history was sent
  };
  error?: string;
}

// Simple sleep utility to simulate API latency in mock mode
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Server Action to handle admin login
 */
export async function loginAction(username: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || user.password !== password) {
      return { error: 'Invalid username or password' };
    }

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1 day
    });
  } catch (err: any) {
    console.error('Login action error:', err);
    return { error: 'An unexpected database error occurred.' };
  }

  // Redirect to dashboard
  redirect('/');
}

/**
 * Server Action to handle admin logout
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  redirect('/login');
}

/**
 * Server Action to track shopper click conversion on recommendations
 */
export async function trackConversionAction(sessionId: string) {
  try {
    const shopperSession = await prisma.shopperSession.findUnique({
      where: { id: sessionId }
    });
    if (!shopperSession || shopperSession.isConversion) {
      return { success: false, error: 'Session not found or already converted.' };
    }
    // 2. Perform updates in a single transaction batch to minimize round-trip database latency
    const [updatedSession] = await prisma.$transaction([
      prisma.shopperSession.update({
        where: { id: sessionId },
        data: { isConversion: true }
      }),
      prisma.aBTestStats.update({
        where: {
          classification_variant: {
            classification: shopperSession.aiClassification || 'Browser',
            variant: shopperSession.abVariant
          }
        },
        data: {
          conversions: { increment: 1 }
        }
      })
    ]);

    console.log(`Conversion tracked for session ${sessionId} (${shopperSession.aiClassification}, Variant ${shopperSession.abVariant})`);
    return { success: true, data: updatedSession };
  } catch (err: any) {
    console.error('Error tracking conversion:', err);
    return { success: false, error: err.message || 'Error tracking conversion' };
  }
}

/**
 * Server Action to get database record count for the monitoring panel
 */
export async function getDatabaseMetricsAction() {
  try {
    const count = await prisma.shopperSession.count();
    return { success: true, count };
  } catch (err) {
    return { success: false, count: 0 };
  }
}

/**
 * Server Action to analyze shopper session event streams (integrating RAG, Database logging, and A/B Testing)
 */
export async function analyzeShopperAction(
  session: ShopperSession,
  useMock: boolean = false
): Promise<ActionResponse> {
  // Validate inputs
  if (!session.user || session.user.trim() === '') {
    return { success: false, error: 'User ID cannot be empty.' };
  }
  
  if (!session.events || session.events.length === 0) {
    return { success: false, error: 'Shopper event stream cannot be empty. Add some events or load sample data.' };
  }

  const cleanEvents = session.events
    .map(e => e.trim())
    .filter(e => e.length > 0);

  if (cleanEvents.length === 0) {
    return { success: false, error: 'Shopper event stream cannot contain only empty events.' };
  }

  try {
    // 1. Run deterministic rules
    const rules = runDeterministicRules(cleanEvents);

    // 2. Determine A/B Test Variant (deterministic based on the last char of User ID)
    const charCode = session.user.charCodeAt(session.user.length - 1) || 0;
    const abVariant = charCode % 2 === 0 ? 'A' : 'B';

    // 3. Retrieve customer history from DB for RAG (Retrieval-Augmented Generation)
    let historySummary = '';
    let ragHistoryUsed: string[] = [];

    try {
      const pastSessions = await prisma.shopperSession.findMany({
        where: { user: session.user },
        orderBy: { createdAt: 'desc' },
        take: 3 // Limit to last 3 sessions to keep context window compact
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
      console.warn('RAG Database query failed, continuing without history:', dbError);
    }

    let ai: AnalysisResult;

    if (useMock) {
      // Simulate network delay
      await sleep(1000);
      
      const suggestedState = (rules.preliminaryClassification as ShopperState) || 'Browser';
      
      // Generate realistic mock output matching the exact structure
      ai = generateMockAIResponse(suggestedState, cleanEvents);
    } else {
      // 4. Run OpenAI analysis with RAG customer history injected
      ai = await analyzeShopperSession(
        {
          user: session.user,
          events: cleanEvents
        },
        historySummary
      );
    }

    // 5. Persist the analyzed session to the SQLite database
    let savedSessionId: string | undefined;
    try {
      const savedSession = await prisma.shopperSession.create({
        data: {
          user: session.user,
          events: JSON.stringify(cleanEvents),
          rulePrediction: rules.preliminaryClassification,
          ruleExplanations: rules.matchedRules.join(', '),
          aiClassification: ai.classification,
          confidence: ai.confidence,
          evidence: JSON.stringify(ai.evidence),
          recommendedAction: ai.recommended_action,
          reasoning: ai.reasoning,
          abVariant,
          isConversion: false
        }
      });
      savedSessionId = savedSession.id;

      // 6. Record A/B test impression in ABTestStats
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
    } catch (dbSaveError) {
      console.error('Error saving session or stats to DB:', dbSaveError);
    }

    return {
      success: true,
      data: {
        user: session.user,
        events: cleanEvents,
        rules,
        ai,
        abVariant,
        sessionId: savedSessionId,
        ragHistoryUsed
      }
    };
  } catch (error: any) {
    console.error('Server Action Error:', error);
    return {
      success: false,
      error: error.message || 'An unknown error occurred during shopper analysis.'
    };
  }
}

// Generate realistic mock response based on deterministic state and events
function generateMockAIResponse(state: ShopperState, events: string[]): AnalysisResult {
  const responses: Record<ShopperState, AnalysisResult> = {
    'Loyal Customer': {
      classification: 'Loyal Customer',
      confidence: 96,
      evidence: [
        `Completed ${events.filter(e => /purchase/i.test(e)).length} purchases in this session`,
        'Logged in immediately upon arrival',
        'Added multiple brand items to shopping cart'
      ],
      recommended_action: 'Enroll in elite VIP program and offer 15% reward points on next order.',
      reasoning: 'The shopper exhibits high loyalty through multiple completed purchases and immediate account authentication. The rules engine correctly identified repeat buying patterns.'
    },
    'Impulse Buyer': {
      classification: 'Impulse Buyer',
      confidence: 91,
      evidence: [
        'Added item to cart within 30 seconds of viewing',
        'Directly proceeded to checkout and completed purchase',
        'Short session containing under 8 total actions'
      ],
      recommended_action: 'Display a post-purchase upsell for matching accessories with 1-click buy.',
      reasoning: 'The shopper completed a checkout sequence in a very short session window without comparing options, indicating spontaneous purchasing behavior.'
    },
    'Cart Abandoner': {
      classification: 'Cart Abandoner',
      confidence: 88,
      evidence: [
        'Added product to shopping cart',
        'Initialized checkout process',
        'Left website without completing payment'
      ],
      recommended_action: 'Send a cart recovery email after 30 minutes featuring a free shipping code.',
      reasoning: 'Shopper displayed strong purchase intent by starting checkout but abandoned the funnel. This is a classic cart abandonment pattern confirmed by our rules engine.'
    },
    'Discount Seeker': {
      classification: 'Discount Seeker',
      confidence: 94,
      evidence: [
        'Applied a promotional discount coupon',
        'Browsed clearance or seasonal discount sections',
        'Only completed checkout after coupon validation'
      ],
      recommended_action: 'Show a discount exit-intent overlay featuring top-rated sale items.',
      reasoning: 'Price sensitivity is the primary driver of this shopper’s session. Purchasing actions are contingent on coupon activations and discount views.'
    },
    'Comparer': {
      classification: 'Comparer',
      confidence: 89,
      evidence: [
        'Triggered product comparison views',
        'Viewed 3 or more alternative products in the same category',
        'Toggled price and specification filters'
      ],
      recommended_action: 'Display comparison specifications table and highlight positive customer reviews.',
      reasoning: 'The shopper is in the evaluation stage. They are actively comparing products, prices, and features to make an informed choice.'
    },
    'Returning Customer': {
      classification: 'Returning Customer',
      confidence: 90,
      evidence: [
        'Logged into their existing profile',
        'Navigated to recently viewed products',
        'Resumed session from previous interactions'
      ],
      recommended_action: 'Show "Welcome Back" card with custom recommendations based on last purchase.',
      reasoning: 'Shopper returns to resume active shopping sessions. Suggests loyalty potential; marketing should prioritize personalized greetings.'
    },
    'Window Shopper': {
      classification: 'Window Shopper',
      confidence: 95,
      evidence: [
        'Visited landing page or homepage',
        'Exited website in under 15 seconds',
        'Did not click on any catalog categories or products'
      ],
      recommended_action: 'Show a popup highlighting trending bestsellers to capture initial interest.',
      reasoning: 'Extremely brief interaction with no product exploration indicates very low buying intent or casual landing page testing.'
    },
    'Browser': {
      classification: 'Browser',
      confidence: 85,
      evidence: [
        'Visited multiple category pages',
        'Viewed various product details pages',
        'No additions to cart or checkout attempts detected'
      ],
      recommended_action: 'Show cross-sell recommendations on categories to increase click-through rate.',
      reasoning: 'Shopper is researching the catalog but shows no immediate purchase velocity. Focus on conversion optimization overlays.'
    }
  };

  return responses[state] || responses['Browser'];
}
