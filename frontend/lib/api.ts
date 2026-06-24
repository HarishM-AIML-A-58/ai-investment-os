import type {
  AgentAccuracy,
  BacktestLesson,
  BacktestRun,
  BacktestStats,
  DecisionOutcome,
  FiiDiiData,
  MemoryHit,
  Outperformer,
  Policy,
  RecommendationDetail,
  RecommendationSummary,
  RegimeData,
  ReportPayload,
  WatchlistItem,
  BrokerFunds,
  BrokerHoldings,
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5001";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => http<{ status: string }>("/health"),

  listRecommendations: (limit = 50) =>
    http<RecommendationSummary[]>(`/recommendations?limit=${limit}`),
  getRecommendation: (id: string) =>
    http<RecommendationDetail>(`/recommendations/${id}`),
  decide: (body: unknown) =>
    http<DecisionOutcome>("/recommendations/decide", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  scanNow: () =>
    http<{ scanned?: number; skipped?: string; symbols?: string[] }>("/recommendations/scan-now", {
      method: "POST",
    }),
  execute: (id: string, body: { quantity: number; order_type?: string }) =>
    http<unknown>(`/recommendations/${id}/execute`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getPolicy: () => http<Policy>("/policies"),
  putPolicy: (body: Policy) =>
    http<Policy>("/policies", { method: "PUT", body: JSON.stringify(body) }),

  agentAccuracy: () => http<AgentAccuracy[]>("/performance/agent-accuracy"),
  outperformers: () => http<Outperformer[]>("/performance/outperformers"),

  memorySearch: (q: string, limit = 8) =>
    http<MemoryHit[]>(`/memory/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  listWatchlist: () =>
    http<WatchlistItem[]>("/watchlist"),
  addWatchlist: (body: { symbol: string; exchange?: string; sector?: string }) =>
    http<WatchlistItem>("/watchlist", { method: "POST", body: JSON.stringify(body) }),

  generateReport: (report_date: string, report_type: string) =>
    http<{ payload: ReportPayload }>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({ report_date, report_type }),
    }),
  getReport: (date: string, type: string) =>
    http<{ payload: ReportPayload }>(`/reports/${date}/${type}`),

  // Backtesting
  runBacktest: (body: { symbol: string; start_date: string; end_date: string; holding_days: number; frequency: string }) =>
    http<{ symbol: string; queued: number; tasks: { date: string; task_id: string }[] }>("/backtest/run", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getBacktestStats: (symbol: string) =>
    http<BacktestStats>(`/backtest/${symbol}`),
  getBacktestRuns: (symbol: string, limit = 50) =>
    http<BacktestRun[]>(`/backtest/${symbol}/runs?limit=${limit}`),
  getBacktestLessons: (symbol: string, limit = 10) =>
    http<BacktestLesson[]>(`/backtest/${symbol}/lessons?limit=${limit}`),

  // Market intelligence
  getRegime: (force_refresh = false) =>
    http<RegimeData>(`/market/regime${force_refresh ? "?force_refresh=true" : ""}`),
  getFiiDii: (force_refresh = false) =>
    http<FiiDiiData>(`/market/fiidii${force_refresh ? "?force_refresh=true" : ""}`),

  // Watchlist helpers (remove by id)
  removeWatchlist: (id: string) =>
    http<void>(`/watchlist/${id}`, { method: "DELETE" }),

  // Broker endpoints via Groww MCP
  getBrokerFunds: () => http<BrokerFunds>("/broker/funds"),
  getBrokerHoldings: () => http<BrokerHoldings>("/broker/holdings"),
};

export { BASE as API_BASE };

