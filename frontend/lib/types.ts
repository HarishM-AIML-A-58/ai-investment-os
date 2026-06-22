export type RecommendationSummary = {
  id: string;
  security_id: string;
  action: string;
  conviction: number;
  status: string;
  created_at: string;
  thesis: string | null;
};

export type AgentScore = {
  agent: string;
  score: number;
  weight: number | null;
  rationale: string | null;
  report?: string | null;
};

export type ConvictionComponent = {
  component: string;
  score: number;
  weight: number;
  contribution: number;
};

export type PolicyEval = { rule: string; passed: boolean; detail: string };
export type GuardCheck = { check_name: string; passed: boolean; detail: string };

export type RecommendationDetail = {
  id: string;
  security_id: string;
  symbol: string;
  exchange: string;
  action: string;
  conviction: number;
  base_score: number;
  band: string;
  status: string;
  thesis: string | null;
  created_at: string;
  agent_scores: AgentScore[];
  conviction_breakdown: ConvictionComponent[];
  policy_evaluations: PolicyEval[];
  trade_guard_results: GuardCheck[];
  health_score?: number | null;
  is_value_trap?: boolean | null;
  entry_price?: number | null;
  stop_loss?: number | null;
  target_price?: number | null;
  debate_transcript?: string | null;
  investment_plan?: string | null;
  conviction_adjustment?: number | null;
};

export type BacktestStats = {
  symbol: string;
  total_runs: number;
  avg_raw_return: number;
  avg_alpha: number;
  win_rate: number;
  wins: number;
  losses: number;
};

export type BacktestRun = {
  id: string;
  backtest_date: string;
  signal: string | null;
  conviction: number | null;
  entry_price: number | null;
  exit_price: number | null;
  raw_return_pct: number | null;
  nifty50_return_pct: number | null;
  alpha_pct: number | null;
  outcome: string | null;
  llm_reflection: string | null;
  status: string;
};

export type BacktestLesson = {
  id: string;
  symbol: string;
  lesson: string;
  alpha_pct: number | null;
  created_at: string;
};

export type Policy = {
  monthly_budget: string;
  risk_profile: string;
  max_position_pct: number;
  max_sector_pct: number;
  min_conviction: number;
  cash_reserve_pct: number;
  auto_execute: boolean;
  autonomy_tier: number;
};

export type DecisionOutcome = {
  recommendation_id: string;
  action: string;
  conviction: number;
  status: string;
  target_value: string;
  policy_allowed: boolean | null;
  guard_passed: boolean;
  can_auto_execute: boolean;
};

export type AgentAccuracy = { agent: string; samples: number; accuracy: number };
export type Outperformer = {
  recommendation_id: string;
  security_id: string;
  action: string;
  conviction: number;
  alpha: number;
};
export type MemoryHit = {
  content: string;
  kind: string;
  ref_id: string | null;
  distance: number;
};
export type WatchlistItem = {
  id: string;
  symbol: string;
  exchange: string;
  sector: string | null;
  active: boolean;
};

export type ReportPayload = {
  type: string;
  generated_for: string;
  top_opportunities: { recommendation_id: string; action: string; conviction: number; band: string }[];
  stocks_to_watch: string[];
};

export type RegimeData = {
  regime: "bull" | "bear" | "sideways" | "high_vol" | "unknown";
  confidence: number;
  details: Record<string, number | string>;
  cached: boolean;
  computed_at: string;
};

export type FiiDiiEntry = { date: string; fii_net: number; dii_net: number };

export type FiiDiiData = {
  score: number;
  net_7day_fii: number;
  net_7day_dii: number;
  entries: FiiDiiEntry[];
  cached: boolean;
  fetched_at: string;
  error?: string;
};
