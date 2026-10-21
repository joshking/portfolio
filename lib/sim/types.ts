// "review" only occurs in live mode (node status "review") — the post is in
// the operator's review queue: neither used nor rejected. Sim never emits it.
export type VerdictKind = "used" | "no_call" | "discarded" | "review";

export type CallAction = "BUY" | "SELL" | "TRIM";

export interface Analyst {
  id: string;
  handle: string;
  name: string;
  // Per-analyst metrics are null in live mode — the node does not measure
  // them yet. Sim always fills numbers. Never render a fabricated 0.
  score: number | null; // 0-100 composite
  hitRate: number | null; // 0-1
  calls30d: number | null;
  focus: string;
  hue: number; // deterministic avatar hue
  activity: number; // relative posting frequency weight
  avatarUrl?: string | null; // real X profile picture when live data is wired
  // Standing since the last close: places gained (+) or lost (−). Undefined
  // or null = unmeasured (live); the sim always fills it.
  rankDelta?: number | null;
  // First close on the board — shown as "New" instead of a movement.
  debut?: boolean;
  // The analyst's implied basket over 30 days: compounded return (fraction)
  // and its daily path, oldest first, as cumulative fractions ending at
  // `return30d`. Undefined/null = unmeasured (live); the sim fills both.
  return30d?: number | null;
  returnTrend?: number[];
}

export interface Asset {
  ticker: string;
  name: string;
  sector: string;
  // Live enrichment (bridge quotes; null until fetched / when unavailable)
  price?: number | null;
  priceChange24hPct?: number | null;
  weight: number; // actual fund weight (as of last rebalance), 0-1
  targetWeight: number; // live model weight, 0-1
  dayMove: number | null; // % move today, e.g. +1.8; null in live mode (unmeasured)
  supporters: string[]; // analyst ids currently long-biased
  opponents: string[]; // analyst ids currently short/trim-biased
}

export type EventStage = "posted" | "classifying" | "classified";

// One ticker-level position inside a verdict. A single tweet can carry
// mixed calls (bullish NVDA, bearish AMD); each renders with its own
// direction color and moves its own asset.
export interface VerdictCall {
  action: CallAction;
  ticker: string;
  confidence: number; // 0-1
  // Signed, in weight points (0.01 = 1pp). Sim always fills it; live sets
  // null — the node does not attribute basket deltas to single posts.
  // Direction comes from `action`, never from this sign.
  weightDelta: number | null;
  rationale?: string; // live enrichment: the classifier's per-signal reasoning
}

export interface Verdict {
  kind: VerdictKind;
  // Primary call, mirrored from calls[0] — single-call consumers keep
  // working (and keep their simple design) without touching `calls`.
  action?: CallAction;
  ticker?: string;
  confidence?: number; // 0-1
  weightDelta?: number | null; // signed, in weight points (0.01 = 1pp); null in live
  calls?: VerdictCall[]; // all calls; length >= 2 marks a multicall
  reason?: string; // for discarded
  oracleAgreement?: number; // 0-1, share of oracles agreeing
}

export interface SignalEvent {
  id: string;
  ts: number;
  analystId: string; // "" in live mode until enrichment resolves the author
  text: string;
  stage: EventStage;
  verdict: Verdict | null;
  // Live-only enrichment state. Undefined (sim) means text is final.
  // "resolving": enrichment in flight; "unresolved": gave up — render the
  // tweet-id-only form, never invented copy.
  textStatus?: "resolving" | "unresolved";
  tweetIds?: string[]; // live only: the stream event's provider tweet ids
  sourceUrl?: string; // live only: x.com permalink once enrichment lands
}

export interface RebalanceMove {
  ticker: string;
  from: number;
  to: number;
}

export interface Rebalance {
  id: string;
  ts: number;
  moves: RebalanceMove[]; // a move with from=0 is an addition; to=0 a removal
  signalsUsed: number;
  driftBefore: number; // %
}

export interface NavPoint {
  ts: number;
  value: number; // indexed, 100 = inception
}

export interface WeightSnapshot {
  ts: number;
  weights: Record<string, number>;
}

export interface Oracle {
  id: string;
  name: string;
  role: string;
  votes24h: number;
  consensusRate: number; // 0-1 agreement with final verdict
}

export interface SimStats {
  total24h: number;
  used24h: number;
  noCall24h: number;
  discarded24h: number;
  trackedAnalysts: number;
  visibleAnalysts: number;
  // Live: the held window hit its cap while still inside 24h — the real
  // 24h total is at least this ("N+" display).
  saturated?: boolean;
  // Live: server-counted true 24h baseline (bridge /stats24h); when present
  // total24h is authoritative (baseline + streamed), no saturation marker.
  authoritative?: boolean;
}

// Live-mode meta. Present only when mode === "live"; the mode never mixes.
export interface LiveMeta {
  status: "boot" | "streaming" | "stalled" | "degraded";
  coverage: { trackedAnalysts: number };
  // Set when the seeded classification window mixed rule_versions (<80%
  // matched the newest) — the held window is variant-scoped best-effort.
  variantNote: string | null;
  // Where the rendered basket comes from: the local node's live preview, or
  // the prod operator's committed daily basket (with its computed_at date).
  basketSource: "node-preview" | "operator-daily" | null;
  basketComputedAt: string | null;
  // Scout data can come from the configured production API or an extracted
  // offline snapshot. The UI names the latter and its as-of date explicitly.
  basketDatasetSource: "prod" | "snapshot" | null;
  navDatasetSource: "prod" | "snapshot" | null;
  navComputedAt: string | null;
  // Operator-daily baskets can sum well under 100% (upstream caps weights
  // without renormalizing — 93.6% seen live). The unallocated remainder,
  // surfaced honestly instead of renormalized; null when weights ~sum to 1
  // or the basket is a node preview.
  weightResidual: number | null;
}

export interface SimState {
  mode: "sim" | "live";
  live: LiveMeta | null; // null exactly when mode === "sim"
  // Set by the resolver when a live boot failed and it fell back to sim —
  // labeling surfaces it so the fallback is never silent.
  fallbackReason: string | null;
  booted: boolean;
  now: number;
  analysts: Analyst[];
  assets: Asset[];
  events: SignalEvent[]; // newest first
  inFlight: SignalEvent | null;
  stats: SimStats;
  rebalances: Rebalance[]; // newest first
  nav: NavPoint[];
  benchmark: NavPoint[]; // S&P 500, indexed to 100 at the same inception
  weightHistory: WeightSnapshot[];
  oracles: Oracle[];
  lastRebalanceTs: number;
  nextRebalanceTs: number;
  driftPct: number | null; // current accumulated |drift| in %; null in live (unmeasured)
  highlightTicker: string | null; // primary momentum target (legacy single)
  // All momentum targets. In live mode these deltas are REAL (diff between
  // successive basket previews) but unattributed to any post.
  highlightCalls: { ticker: string; weightDelta: number }[];
  // Live only: the last basket.preview.updated diff, unlinked from any call.
  lastBasketMoves: {
    ts: number;
    moves: { ticker: string; delta: number }[];
  } | null;
  disputedExample: {
    text: string;
    votes: { oracle: string; read: string }[];
  } | null;
}
