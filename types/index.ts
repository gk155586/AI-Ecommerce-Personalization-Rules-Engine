export interface ShopperSession {
  user: string;
  events: string[];
}

export interface RuleMatchResult {
  matchedRules: string[];
  preliminaryClassification: string | null;
  ruleExplanation: string;
}

export interface AnalysisResult {
  classification: string;
  confidence: number;
  evidence: string[];
  recommended_action: string;
  reasoning: string;
}

export interface ShopperAnalysis {
  user: string;
  events: string[];
  rules: RuleMatchResult;
  ai: AnalysisResult | null;
  loading?: boolean;
  error?: string | null;
  abVariant?: string;
  sessionId?: string;
  ragHistoryUsed?: string[];
}

export type ShopperState =
  | 'Browser'
  | 'Comparer'
  | 'Discount Seeker'
  | 'Cart Abandoner'
  | 'Loyal Customer'
  | 'Impulse Buyer'
  | 'Returning Customer'
  | 'Window Shopper';
