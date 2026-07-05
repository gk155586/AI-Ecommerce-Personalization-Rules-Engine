import { RuleMatchResult, ShopperState } from '../types';

interface RuleDefinition {
  name: ShopperState;
  id: string;
  description: string;
  matchFn: (events: string[]) => boolean;
}

const RULES: RuleDefinition[] = [
  {
    name: 'Loyal Customer',
    id: 'RULE_LOYAL_CUSTOMER',
    description: 'User completed multiple purchases during their session, indicating high loyalty and repeat purchasing.',
    matchFn: (events) => {
      const purchases = events.filter(e => 
        /purchase completed|completed purchase/i.test(e)
      ).length;
      return purchases >= 2;
    }
  },
  {
    name: 'Impulse Buyer',
    id: 'RULE_IMPULSE_BUYER',
    description: 'User went from homepage or product view to purchase very quickly in a short span of events.',
    matchFn: (events) => {
      const hasPurchase = events.some(e => /purchase completed|completed purchase/i.test(e));
      const isShortSession = events.length <= 8;
      return hasPurchase && isShortSession;
    }
  },
  {
    name: 'Cart Abandoner',
    id: 'RULE_CART_ABANDONER',
    description: 'User added item(s) to the cart or started checkout but left the site without completing a purchase.',
    matchFn: (events) => {
      const hasCartAddition = events.some(e => /add.*to cart/i.test(e));
      const hasCheckoutStarted = events.some(e => /checkout started/i.test(e));
      const hasPurchase = events.some(e => /purchase completed|completed purchase/i.test(e));
      return (hasCartAddition || hasCheckoutStarted) && !hasPurchase;
    }
  },
  {
    name: 'Discount Seeker',
    id: 'RULE_DISCOUNT_SEEKER',
    description: 'User explicitly applied a coupon code or searched for discounts during their session.',
    matchFn: (events) => {
      return events.some(e => /coupon applied|coupon|discount|promo/i.test(e));
    }
  },
  {
    name: 'Comparer',
    id: 'RULE_COMPARER',
    description: 'User is comparing multiple products, prices, or product features.',
    matchFn: (events) => {
      const hasCompareEvent = events.some(e => /compare|compared/i.test(e));
      const productViews = events.filter(e => /viewed/i.test(e)).length;
      return hasCompareEvent || productViews >= 3;
    }
  },
  {
    name: 'Returning Customer',
    id: 'RULE_RETURNING_CUSTOMER',
    description: 'User session shows returning behavior (e.g. logging in, repeat visits, or single purchase).',
    matchFn: (events) => {
      const hasReturnIndicator = events.some(e => /logged in|sign in|returned|returning/i.test(e));
      const hasPurchase = events.some(e => /purchase completed|completed purchase/i.test(e));
      return hasReturnIndicator || hasPurchase;
    }
  },
  {
    name: 'Window Shopper',
    id: 'RULE_WINDOW_SHOPPER',
    description: 'User visited the homepage or landing page and left almost immediately without viewing specific products.',
    matchFn: (events) => {
      const isVeryShort = events.length <= 2;
      const hasLeft = events.some(e => /left website|exited/i.test(e));
      const noProductViews = !events.some(e => /viewed/i.test(e) && !/homepage/i.test(e));
      return isVeryShort && hasLeft && noProductViews;
    }
  },
  {
    name: 'Browser',
    id: 'RULE_BROWSER',
    description: 'User spent their session browsing products or categories without adding items to the cart or starting checkout.',
    matchFn: (events) => {
      const hasProductViews = events.some(e => /viewed/i.test(e));
      const hasCartAddition = events.some(e => /add.*to cart/i.test(e));
      const hasPurchase = events.some(e => /purchase completed|completed purchase/i.test(e));
      return hasProductViews && !hasCartAddition && !hasPurchase;
    }
  }
];

export function runDeterministicRules(events: string[]): RuleMatchResult {
  const matchedRules: string[] = [];
  let preliminaryClassification: ShopperState | null = null;
  const explanations: string[] = [];

  for (const rule of RULES) {
    if (rule.matchFn(events)) {
      matchedRules.push(rule.id);
      explanations.push(`${rule.name}: ${rule.description}`);
      
      // Select the first matched rule in our priority list as the preliminary classification
      if (!preliminaryClassification) {
        preliminaryClassification = rule.name;
      }
    }
  }

  return {
    matchedRules,
    preliminaryClassification,
    ruleExplanation: explanations.join('\n') || 'No deterministic rules matched the event stream.'
  };
}
