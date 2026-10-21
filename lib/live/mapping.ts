import type {
  Analyst,
  Asset,
  CallAction,
  NavPoint,
  SignalEvent,
  Verdict,
  VerdictCall,
  VerdictKind,
} from "@/lib/sim/types";
import type {
  NodeAnalyst,
  NodeBasketPreview,
  NodeClassificationRow,
  NodeSignal,
  StreamClassification,
} from "./node-types";
import { SYMBOL_META } from "./symbol-meta";

// ---------------------------------------------------------------------------
// Node → landing vocabulary. Verified against live data:
//   status:      actionable → USED · review → IN REVIEW · ignored → NO CALL
//   action_type: buy → BUY (bullish) · sell_exit/sell → SELL · trim → TRIM
// Unknown values NEVER invent USED or a direction: unknown status renders as
// the NO CALL-style neutral; unknown action drops the signal from calls[]
// (the verdict still shows its real status). Each unknown warns once.
// ---------------------------------------------------------------------------

const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[live-bridge] ${message}`);
}

export function mapStatus(status: unknown): VerdictKind {
  if (status === "actionable") return "used";
  if (status === "review") return "review";
  if (status === "ignored") return "no_call";
  warnOnce(
    `status:${String(status)}`,
    `unknown node status "${String(status)}" → NO CALL`,
  );
  return "no_call";
}

// Trusted-ish boundary, still guarded: a malformed timestamp must not put
// NaN into sort order or the held-window math.
function parseTs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function mapAction(actionType: unknown): CallAction | null {
  if (actionType === "buy") return "BUY";
  if (actionType === "sell_exit" || actionType === "sell") return "SELL";
  if (actionType === "trim") return "TRIM";
  // Known-and-directionless: the classifier could not commit to a side, so
  // neither do we — the signal is deliberately omitted (no warning).
  if (actionType === "ambiguous") return null;
  warnOnce(
    `action:${String(actionType)}`,
    `unmapped node action_type "${String(actionType)}" — signal omitted from calls`,
  );
  return null;
}

// Decimal strings parsed once, here, at the boundary — display precision only.
// Invalid values are rejected. Converting them to zero fabricates confidence
// and allocation claims that the upstream never made.
function parseForDisplay(decimal: unknown): number | null {
  if (typeof decimal !== "string" || decimal.trim() === "") return null;
  const n = Number(decimal);
  return Number.isFinite(n) ? n : null;
}

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.-]{0,11}$/;
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function validSymbol(value: unknown): value is string {
  return typeof value === "string" && SYMBOL_RE.test(value);
}

type SignalLike = Pick<NodeSignal, "symbol" | "action_type" | "confidence"> & {
  rationale?: string;
};

export function mapSignals(signals: unknown): VerdictCall[] {
  if (!Array.isArray(signals)) return [];
  const calls: VerdictCall[] = [];
  for (const candidate of signals) {
    if (!candidate || typeof candidate !== "object") continue;
    const s = candidate as Partial<SignalLike>;
    if (!validSymbol(s.symbol)) continue;
    const action = mapAction(s.action_type);
    if (!action) continue;
    const confidence = parseForDisplay(s.confidence);
    if (confidence === null || confidence < 0 || confidence > 1) continue;
    calls.push({
      action,
      ticker: s.symbol,
      confidence,
      weightDelta: null, // live mode never attributes deltas to posts
      ...(typeof s.rationale === "string" && s.rationale
        ? { rationale: s.rationale }
        : {}),
    });
  }
  return calls;
}

export function buildVerdict(status: unknown, signals: unknown): Verdict {
  const kind = mapStatus(status);
  if (kind !== "used") return { kind };
  const calls = mapSignals(signals);
  if (calls.length === 0) return { kind };
  return {
    kind,
    action: calls[0].action,
    ticker: calls[0].ticker,
    confidence: calls[0].confidence,
    calls,
  };
}

// Dedupe key: sorted tweet ids — the only key both the stream event and the
// classification row share.
export function tweetKey(tweetIds: unknown): string {
  if (
    !Array.isArray(tweetIds) ||
    tweetIds.length === 0 ||
    !tweetIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    return "";
  }
  return [...tweetIds].sort().join(",");
}

export function mapAnalyst(a: NodeAnalyst): Analyst | null {
  if (
    !a ||
    !Number.isSafeInteger(a.id) ||
    !HANDLE_RE.test(a.handle) ||
    typeof a.display_name !== "string" ||
    a.display_name.trim() === ""
  ) {
    return null;
  }
  return {
    id: String(a.id),
    handle: a.handle,
    name: a.display_name,
    // Not yet measured by the node — absent, never fabricated.
    score: null,
    hitRate: null,
    calls30d: null,
    focus: "",
    hue: hashHue(a.handle),
    activity: 0,
    // Real handle → real public avatar; initials fallback handled by <Avatar>.
    avatarUrl: `https://unavatar.io/twitter/${a.handle}`,
  };
}

export function mapSeedRow(row: NodeClassificationRow): SignalEvent | null {
  if (!row || typeof row !== "object") return null;
  const ts = parseTs(row.interpreted_at);
  const key = tweetKey(row.provider_post_ids);
  if (
    ts === null ||
    key === "" ||
    !Number.isSafeInteger(row.interpretation_id) ||
    !Number.isSafeInteger(row.analyst_id)
  ) {
    return null;
  }
  return {
    id: `live_c_${row.interpretation_id}`,
    ts,
    analystId: String(row.analyst_id),
    text: "",
    textStatus: "resolving", // post text arrives via /posts/[id] enrichment
    tweetIds: row.provider_post_ids,
    stage: "classified",
    verdict: buildVerdict(row.status, row.signals),
  };
}

export function mapStreamClassification(
  eventId: number,
  payload: StreamClassification,
): SignalEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const streamTs = parseTs(payload.classified_at);
  if (
    streamTs === null ||
    !Number.isSafeInteger(eventId) ||
    eventId <= 0 ||
    tweetKey(payload.tweet_ids) === "" ||
    !Array.isArray(payload.signals)
  ) {
    return null;
  }
  return {
    id: `live_s_${eventId}`,
    ts: streamTs,
    analystId: "", // unknown until enrichment matches the row
    text: "",
    textStatus: "resolving",
    tweetIds: payload.tweet_ids,
    stage: "classified",
    verdict: buildVerdict(payload.status, payload.signals),
  };
}

// Basket preview → assets. `weight` mirrors `targetWeight`: there is no
// committed basket locally — a single-series display, labeled as such in the
// mode-aware UI. dayMove is unmeasured → null.
export function parseBasketPreview(preview: unknown): Asset[] | null {
  if (!preview || typeof preview !== "object") return null;
  const entries = (preview as Partial<NodeBasketPreview>).entries;
  if (!Array.isArray(entries) || entries.length > 200) return null;
  const seen = new Set<string>();
  const assets: Asset[] = [];
  for (const candidate of entries) {
    if (!candidate || typeof candidate !== "object") return null;
    const entry = candidate as { symbol?: unknown; weight?: unknown };
    if (!validSymbol(entry.symbol) || seen.has(entry.symbol)) return null;
    const w = parseForDisplay(entry.weight);
    if (w === null || w < 0 || w > 1) return null;
    seen.add(entry.symbol);
    const meta = SYMBOL_META[entry.symbol];
    assets.push({
      ticker: entry.symbol,
      name: meta?.name ?? entry.symbol,
      sector: meta?.sector ?? "",
      weight: w,
      targetWeight: w,
      dayMove: null,
      supporters: [],
      opponents: [],
    });
  }
  return assets;
}

export function mapBasketPreview(preview: NodeBasketPreview): Asset[] {
  return parseBasketPreview(preview) ?? [];
}

// The prod operator's committed daily basket (scout warehouse rows).
// Slice: universe=all, daily_avg_return, position-ordered, deduped by symbol;
// residual rows (empty symbol) are skipped — the canvas renders tickers.
export interface ScoutBasketRow {
  symbol: string | null;
  weight: string;
  position: number | string;
  universe?: string;
  scoring_method?: string;
  computed_at?: string;
  operator?: string;
  inference_variant_identity?: string;
}

export interface ScoutIdentity {
  operator: string;
  variantIdentity: string;
}

export function mapOperatorBasket(rows: ScoutBasketRow[]): {
  assets: Asset[];
  computedAt: string | null;
  // Upstream caps weights without renormalizing (93.6% total seen live) —
  // the remainder is surfaced, never renormalized away. Null when the
  // published weights sum to ≥99.5%.
  residualWeight: number | null;
  operator: string | null;
  variantIdentity: string | null;
} {
  if (!Array.isArray(rows)) {
    return {
      assets: [],
      computedAt: null,
      residualWeight: null,
      operator: null,
      variantIdentity: null,
    };
  }
  // Dimension FIRST, then latest computed_at WITHIN that slice — a global
  // "latest" can select a batch holding only another universe's rows
  // (seen live: a 2-entry crypto basket).
  const dimension = rows.filter(
    (r) =>
      (r.universe ?? "all") === "all" &&
      (r.scoring_method ?? "daily_avg_return") === "daily_avg_return" &&
      r.symbol &&
      typeof r.operator === "string" &&
      r.operator.length > 0 &&
      typeof r.inference_variant_identity === "string" &&
      r.inference_variant_identity.length > 0,
  );
  const identities = new Set(
    dimension.map(
      (row) => `${row.operator}\u0000${row.inference_variant_identity}`,
    ),
  );
  // Reject an unfiltered multi-producer history even when one producer has a
  // newer batch. Freshness is not authorization to choose an operator.
  if (identities.size !== 1) {
    return {
      assets: [],
      computedAt: null,
      residualWeight: null,
      operator: null,
      variantIdentity: null,
    };
  }
  const identityKey = [...identities][0];
  const [operator, variantIdentity] = identityKey.split("\u0000");
  const coherentHistory = dimension.filter(
    (row) =>
      row.operator === operator &&
      row.inference_variant_identity === variantIdentity,
  );
  const latest = coherentHistory.reduce<string | null>(
    (max, r) =>
      r.computed_at && (!max || r.computed_at > max) ? r.computed_at : max,
    null,
  );
  const latestRows = coherentHistory.filter(
    (r) => !latest || r.computed_at === latest,
  );
  const seen = new Set<string>();
  const assets: Asset[] = [];
  const slice = [...latestRows].sort(
    (a, b) => Number(a.position) - Number(b.position),
  );
  for (const row of slice) {
    const ticker = String(row.symbol);
    const position = Number(row.position);
    const w = parseForDisplay(row.weight);
    if (
      !validSymbol(ticker) ||
      seen.has(ticker) ||
      !Number.isSafeInteger(position) ||
      position < 0 ||
      w === null ||
      w < 0 ||
      w > 1
    ) {
      return {
        assets: [],
        computedAt: null,
        residualWeight: null,
        operator: null,
        variantIdentity: null,
      };
    }
    seen.add(ticker);
    const meta = SYMBOL_META[ticker];
    assets.push({
      ticker,
      name: meta?.name ?? ticker,
      sector: meta?.sector ?? "",
      weight: w,
      targetWeight: w,
      dayMove: null,
      supporters: [],
      opponents: [],
    });
  }
  // A degenerate basket (<3 entries) is a slicing failure, not a portfolio.
  if (assets.length < 3) {
    return {
      assets: [],
      computedAt: null,
      residualWeight: null,
      operator: null,
      variantIdentity: null,
    };
  }
  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);
  if (totalWeight <= 0 || totalWeight > 1.005) {
    return {
      assets: [],
      computedAt: null,
      residualWeight: null,
      operator: null,
      variantIdentity: null,
    };
  }
  const residualWeight = totalWeight < 0.995 ? 1 - totalWeight : null;
  return {
    assets,
    computedAt: latest,
    residualWeight,
    operator,
    variantIdentity,
  };
}

export interface ScoutPerformanceRow {
  day?: string;
  analyst_handle?: string;
  universe?: string;
  portfolio_return?: string;
  operator?: string;
  inference_variant_identity?: string;
}

export function mapAnalystComposite(
  rows: ScoutPerformanceRow[],
  expectedIdentity: ScoutIdentity | null,
  truncated: boolean,
): {
  nav: NavPoint[];
  computedAt: string | null;
  identity: ScoutIdentity | null;
} {
  if (!Array.isArray(rows)) {
    return { nav: [], computedAt: null, identity: null };
  }
  const candidates = rows.filter(
    (row) =>
      (row.universe ?? "all") === "all" &&
      typeof row.operator === "string" &&
      row.operator.length > 0 &&
      typeof row.inference_variant_identity === "string" &&
      row.inference_variant_identity.length > 0,
  );
  const identityKeys = new Set(
    candidates.map(
      (row) => `${row.operator}\u0000${row.inference_variant_identity}`,
    ),
  );
  const identity = expectedIdentity
    ? expectedIdentity
    : identityKeys.size === 1
      ? (() => {
          const [operator, variantIdentity] = [...identityKeys][0].split(
            "\u0000",
          );
          return { operator, variantIdentity };
        })()
      : null;
  if (!identity) return { nav: [], computedAt: null, identity: null };

  const byDay = new Map<string, number[]>();
  const seen = new Set<string>();
  for (const row of candidates) {
    if (
      row.operator !== identity.operator ||
      row.inference_variant_identity !== identity.variantIdentity ||
      typeof row.day !== "string" ||
      typeof row.analyst_handle !== "string"
    ) {
      continue;
    }
    const ts = Date.parse(row.day);
    const value = parseForDisplay(row.portfolio_return);
    if (!Number.isFinite(ts) || value === null || value <= -1) continue;
    const key = `${row.day}\u0000${row.analyst_handle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const day = byDay.get(row.day) ?? [];
    day.push(value);
    byDay.set(row.day, day);
  }
  let days = [...byDay.keys()].sort();
  if (truncated) days = days.slice(1);
  let index = 100;
  const nav: NavPoint[] = [];
  for (const day of days) {
    const returns = byDay.get(day)!;
    const mean =
      returns.reduce((sum, value) => sum + value, 0) / returns.length;
    index *= 1 + mean;
    const ts = Date.parse(day);
    if (Number.isFinite(index) && Number.isFinite(ts)) {
      nav.push({ ts, value: index });
    }
  }
  return { nav, computedAt: days.at(-1) ?? null, identity };
}

// A tweet set is stable across reclassifications, so timestamp proximity is
// required as well. Otherwise a just-arrived verdict can be enriched with an
// older interpretation of the same post and visibly regress.
export function matchClassificationRow(
  rows: NodeClassificationRow[],
  tweetIds: unknown,
  eventTs: number,
): NodeClassificationRow | null {
  if (!Array.isArray(rows)) return null;
  const key = tweetKey(tweetIds);
  if (!key || !Number.isFinite(eventTs)) return null;
  const toleranceMs = 5_000;
  let match: NodeClassificationRow | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const row of rows) {
    if (tweetKey(row.provider_post_ids) !== key) continue;
    const rowTs = parseTs(row.interpreted_at);
    if (rowTs === null) continue;
    const distance = Math.abs(rowTs - eventTs);
    if (distance <= toleranceMs && distance < bestDistance) {
      match = row;
      bestDistance = distance;
    }
  }
  return match;
}

// Backers per ticker from held USED events' calls: BUY → supporters,
// SELL/TRIM → opponents. Events arrive newest-first, so lists are most-recent
// first; an analyst's LATEST stance on a ticker wins (never listed on both
// sides). Events without a resolved analystId (stream enrichment pending)
// contribute nothing.
export function deriveBackers(assets: Asset[], events: SignalEvent[]): Asset[] {
  // An analyst's LATEST stance per ticker wins — resolved by event ts, not
  // array position: array order is a display concern (the engine re-sorts
  // superseded cards) and must not decide stance recency.
  const latest = new Map<
    string,
    { ts: number; analystId: string; ticker: string; buy: boolean }
  >();
  for (const event of events) {
    if (event.verdict?.kind !== "used" || !event.verdict.calls) continue;
    const analystId = event.analystId;
    if (!analystId) continue;
    for (const call of event.verdict.calls) {
      const key = `${call.ticker} ${analystId}`;
      const prior = latest.get(key);
      if (prior && prior.ts >= event.ts) continue;
      latest.set(key, {
        ts: event.ts,
        analystId,
        ticker: call.ticker,
        buy: call.action === "BUY",
      });
    }
  }
  const supporters = new Map<string, string[]>();
  const opponents = new Map<string, string[]>();
  const stances = [...latest.values()].sort((a, b) => b.ts - a.ts);
  for (const stance of stances) {
    const side = stance.buy ? supporters : opponents;
    const list = side.get(stance.ticker) ?? [];
    list.push(stance.analystId);
    side.set(stance.ticker, list);
  }
  return assets.map((asset) => ({
    ...asset,
    supporters: supporters.get(asset.ticker) ?? [],
    opponents: opponents.get(asset.ticker) ?? [],
  }));
}

export function diffBasket(
  previous: Asset[],
  next: Asset[],
): { ticker: string; delta: number }[] {
  const before = new Map(previous.map((a) => [a.ticker, a.targetWeight]));
  const moves: { ticker: string; delta: number }[] = [];
  for (const a of next) {
    const prev = before.get(a.ticker) ?? 0;
    const delta = a.targetWeight - prev;
    if (Math.abs(delta) > 1e-9) moves.push({ ticker: a.ticker, delta });
  }
  for (const a of previous) {
    if (!next.some((n) => n.ticker === a.ticker)) {
      moves.push({ ticker: a.ticker, delta: -a.targetWeight });
    }
  }
  return moves.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
}

function hashHue(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}
