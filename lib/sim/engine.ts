import {
  ANALYST_SEED,
  ASSET_SEED,
  CALL_TEMPLATES,
  DISCARDED_TEMPLATES,
  FORMER_ASSET_SEED,
  MULTI_CALL_TEMPLATES,
  NO_CALL_TEMPLATES,
  ORACLE_SEED,
} from "./data";
import type {
  Analyst,
  Asset,
  NavPoint,
  Oracle,
  Rebalance,
  RebalanceMove,
  SignalEvent,
  SimState,
  Verdict,
  VerdictCall,
  VerdictKind,
  WeightSnapshot,
} from "./types";

// Deterministic PRNG so a session's replayed history is coherent; the live
// tail uses the same stream. Seed is fixed — this is a labeled simulation.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A photo portrait for a simulated analyst: 200 stock portraits (randomuser's
// free set, mirrored into public/portraits so no third-party host can throttle
// a page of avatars), picked deterministically so the prototype reads with
// real faces. Duplicates across 1,500 analysts are accepted — these stand in
// for the real X profile pictures the live feed supplies.
function simPortrait(r: () => number): string {
  const set = r() < 0.62 ? "men" : "women";
  return `/portraits/${set}/${Math.floor(r() * 100)}.jpg`;
}

// Simulated standing since the last close: most analysts barely move, a few
// jump or fall by dozens of places, and a sliver of the long tail is new to
// the board. Deterministic per analyst so the board holds still on reload.
function simStanding(
  r: () => number,
  tail: boolean,
): { rankDelta: number | null; debut: boolean } {
  const u = r();
  const sign = r() < 0.5 ? -1 : 1;
  if (tail && u > 0.97) return { rankDelta: null, debut: true };
  if (u < 0.18) return { rankDelta: 0, debut: false };
  const mag = Math.max(1, Math.floor(Math.pow(r(), 3) * 60));
  return { rankDelta: sign * mag, debut: false };
}

// Simulated 30-day return path for an analyst's implied basket: a daily walk
// whose drift follows the score (a high score leans up, a low one down), so
// the board's returns and its ranking mostly agree without being the same
// number. Deterministic per analyst.
function simReturn(
  r: () => number,
  score: number,
): { return30d: number; returnTrend: number[] } {
  const drift = ((score - 60) / 40) * 0.0045; // ≈ -0.45%…+0.4% per day
  const vol = 0.012 + r() * 0.014;
  const trend: number[] = [];
  let level = 1;
  for (let d = 0; d < 30; d++) {
    const shock = (r() + r() + r() - 1.5) * 2 * vol; // roughly bell-shaped
    level *= 1 + drift + shock;
    trend.push(level - 1);
  }
  return { return30d: trend[trend.length - 1], returnTrend: trend };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const CLASSIFY_DELAY_MS = 2_600; // posted -> classifying
const REVEAL_DELAY_MS = 2_400; // classifying -> classified
const DAY_MS = 86_400_000;
const VISIBLE_ANALYSTS = 24;
const DRIFT_THRESHOLD_PCT = 1.5;

type Listener = () => void;

// Calls per 30 days: a bell centred on 30 with most of the roster inside
// ±15 (three uniforms averaged ≈ normal, sd ≈ 7.5). Seeded apart from the
// analyst's other draws so adding it moved nobody's name, hue or portrait.
function simCalls(handle: string): number {
  const r = mulberry32(hashString(handle + ":calls"));
  const bell = (r() + r() + r()) / 3;
  return Math.max(0, Math.round(30 + (bell - 0.5) * 52));
}

class SimEngine {
  private rand = mulberry32(0x5eed_f00d);
  private listeners = new Set<Listener>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  // "editorial" = the original landing's calm cadence; "broadcast" = the
  // REPLAY demo profile — burst-heavy arrivals, more accepted calls, bigger
  // visible weight moves, occasional multi-analyst pile-ons. Only the
  // alt-landing REPLAY mode flips this; "/" never sees broadcast.
  private tempo: "editorial" | "broadcast" = "editorial";
  private eventCounter = 0;
  private started = false;

  state: SimState = emptyState();

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = () => this.state;

  private emit(partial: Partial<SimState>) {
    this.state = { ...this.state, ...partial, now: Date.now() };
    this.listeners.forEach((fn) => fn());
  }

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.boot();
    this.scheduleNext(3_500); // first live event arrives quickly
  }

  stop() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    // Drop the in-flight card so a later restart doesn't resurrect a stale
    // "posted" event whose classify timers died with this stop().
    if (this.state.inFlight) {
      this.state = { ...this.state, inFlight: null };
    }
    this.started = false;
  }

  // ---------------------------------------------------------------- boot ---
  private boot() {
    const now = Date.now();
    const analysts = this.buildAnalysts();
    let assets = this.buildAssets();
    const { lastRebalanceTs, nextRebalanceTs } = rebalanceWindow(now);
    const events = this.buildHistory(now, analysts, assets);
    assets = this.deriveArgument(events, assets);
    const rebalances = this.buildRebalances(assets, lastRebalanceTs);
    const nav = this.buildNav(now);
    const benchmark = this.buildBenchmark(now);
    const weightHistory = this.buildWeightHistory(now, assets);
    const oracles = this.buildOracles();
    const stats = tallyStats(events, now, analysts.length);

    // Drift accumulated since last rebalance = |target - actual| summed.
    const driftPct = computeDrift(assets);

    this.emit({
      mode: "sim",
      live: null,
      booted: true,
      inFlight: null,
      analysts,
      assets,
      events,
      rebalances,
      nav,
      benchmark,
      weightHistory,
      oracles,
      stats,
      lastRebalanceTs,
      nextRebalanceTs,
      driftPct,
      disputedExample: {
        text: "Great quarter guys 👏👏👏 ($SMCI)",
        votes: [
          { oracle: "TICKER-RES", read: "SMCI, confidence 0.97" },
          { oracle: "STANCE", read: "Long (literal read)" },
          { oracle: "CONTEXT", read: "Sarcasm — invert or discard" },
          { oracle: "CONVICTION", read: "Low sizing intent" },
          { oracle: "DEDUP", read: "Novel post" },
        ],
      },
    });
  }

  // The product tracks a 1–2k analyst universe: the 64 curated seeds carry
  // the feed's voice, and a procedurally generated long tail fills out the
  // population (low activity, so the wire stays readable).
  private buildAnalysts(): Analyst[] {
    const curated = this.buildCuratedAnalysts();
    const TOTAL = 1_000;
    const FIRST = [
      "alex",
      "sam",
      "jordan",
      "casey",
      "morgan",
      "riley",
      "drew",
      "quinn",
      "avery",
      "reese",
      "blake",
      "hayden",
      "kai",
      "rowan",
      "sage",
      "emerson",
    ];
    const WORD = [
      "macro",
      "delta",
      "yield",
      "basis",
      "vol",
      "carry",
      "tape",
      "flow",
      "edge",
      "alpha",
      "gamma",
      "theta",
      "spread",
      "tick",
      "quant",
      "signal",
      "ledger",
      "orbit",
      "vector",
      "drift",
    ];
    const SUFFIX = [
      "cap",
      "desk",
      "lab",
      "fund",
      "works",
      "notes",
      "view",
      "wire",
      "shop",
      "field",
    ];
    const FOCUS = [
      "Semis",
      "AI infra",
      "Megacap tech",
      "Rates & macro",
      "Energy transition",
      "Software",
      "Consumer",
      "Healthcare tech",
    ];
    const tail: Analyst[] = [];
    for (let i = curated.length; i < TOTAL; i++) {
      const r = mulberry32(hashString(`tail_${i}`));
      const handle = `${WORD[Math.floor(r() * WORD.length)]}${SUFFIX[Math.floor(r() * SUFFIX.length)]}${String(Math.floor(r() * 97)).padStart(2, "0")}`;
      const first = FIRST[Math.floor(r() * FIRST.length)];
      const name = `${first[0].toUpperCase()}${first.slice(1)} ${String.fromCharCode(65 + Math.floor(r() * 26))}.`;
      // Scores bunch the way a real roster's will: a bell centred in the
      // high 60s (three uniforms averaged ≈ normal, sd ≈ 8), so most of the
      // field sits between 60 and 80 and the tails are thin.
      const bell = (r() + r() + r()) / 3;
      const tailScore = Math.round(68 + (bell - 0.5) * 48);
      tail.push({
        id: `an_${i}`,
        handle,
        name,
        focus: FOCUS[Math.floor(r() * FOCUS.length)],
        score: tailScore,
        hitRate: 0.35 + r() * 0.3,
        calls30d: simCalls(handle),
        hue: Math.floor(r() * 360),
        // Long tail: rarely posts, so the visible wire keeps its cast while
        // universe-level stats reflect the real analyst scope.
        activity: 0.004 + r() * 0.05,
        avatarUrl: simPortrait(r),
        ...simStanding(r, true),
        ...simReturn(r, tailScore),
      });
    }
    return [...curated, ...tail].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0),
    ); // sim always fills score
  }

  private buildCuratedAnalysts(): Analyst[] {
    return ANALYST_SEED.map(([handle, name, focus], i) => {
      const r = mulberry32(hashString(handle));
      const score = Math.round(56 + r() * 39); // 56-95
      return {
        id: `an_${i}`,
        handle,
        name,
        focus,
        score,
        hitRate: 0.42 + r() * 0.29,
        calls30d: simCalls(handle),
        hue: Math.floor(r() * 360),
        activity: 0.35 + r() * 1.4,
        // Stand-in portrait — the same field a real X profilePicture URL
        // fills once the live feed is wired.
        avatarUrl: simPortrait(r),
        ...simStanding(r, false),
        ...simReturn(r, score),
      };
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)); // sim always fills score
  }

  private buildAssets(): Asset[] {
    const total = ASSET_SEED.reduce((s, a) => s + a[3], 0);
    return ASSET_SEED.map(([ticker, name, sector, base]) => {
      const r = mulberry32(hashString(ticker));
      const weight = base / total;
      // Live model target drifts from actual; scaled so total drift sits
      // near the 1.5% trading threshold and moves across it live.
      const drift = (r() - 0.45) * 0.11 * weight;
      return {
        ticker,
        name,
        sector,
        weight,
        targetWeight: Math.max(0.002, weight + drift),
        dayMove: +((r() - 0.47) * 4.6).toFixed(2),
        supporters: [],
        opponents: [],
      };
    });
  }

  // Supporters/opponents are DERIVED from classified calls since the last
  // 24h — never asserted independently of the visible event stream.
  private deriveArgument(events: SignalEvent[], assets: Asset[]): Asset[] {
    const bias = new Map<string, Map<string, number>>();
    for (const e of events) {
      const v = e.verdict;
      if (e.stage !== "classified" || v?.kind !== "used") continue;
      const calls =
        v.calls ??
        (v.ticker && v.weightDelta
          ? [{ ticker: v.ticker, weightDelta: v.weightDelta }]
          : []);
      for (const call of calls) {
        const m = bias.get(call.ticker) ?? new Map<string, number>();
        // sim-only surface: the sim always fills weightDelta
        m.set(e.analystId, (m.get(e.analystId) ?? 0) + (call.weightDelta ?? 0));
        bias.set(call.ticker, m);
      }
    }
    return assets.map((a) => {
      const m = bias.get(a.ticker);
      if (!m) return { ...a, supporters: [], opponents: [] };
      const entries = [...m.entries()];
      return {
        ...a,
        supporters: entries
          .filter(([, v]) => v > 0)
          .sort((x, y) => y[1] - x[1])
          .map(([id]) => id),
        opponents: entries
          .filter(([, v]) => v < 0)
          .sort((x, y) => x[1] - y[1])
          .map(([id]) => id),
      };
    });
  }

  // Arrival cadence: bursts, steady stretches, and real lulls (~9s mean — the designer's Cobalt tuning, shared with /).
  // Broadcast tempo compresses hard (~2.5s mean, rapid chains) — the feel of
  // a live backfill day. History generation always uses the calm shape.
  private historyGap(): number {
    const roll = this.rand();
    if (roll < 0.6) return 2_400 + this.rand() * 4_800;
    if (roll < 0.9) return 6_400 + this.rand() * 8_000;
    return 14_400 + this.rand() * 25_600;
  }

  private sampleGap(): number {
    if (this.tempo === "broadcast") {
      const roll = this.rand();
      if (roll < 0.55) return 300 + this.rand() * 700; // rapid chain
      if (roll < 0.9) return 1_400 + this.rand() * 2_200;
      return 4_500 + this.rand() * 4_500; // breather, never a dead lull
    }
    return this.historyGap();
  }

  private makeEvent(
    ts: number,
    analysts: Analyst[],
    assets: Asset[],
    resolved: boolean,
    forceCallTicker?: string,
  ): SignalEvent {
    const r = this.rand;
    const analyst = pickWeighted(analysts, (a) => a.activity, r);
    const broadcast = this.tempo === "broadcast";
    // Broadcast: more of the wire is accepted calls (0.38 vs 0.22) and the
    // per-call weight moves are larger — the basket visibly breathes.
    const usedShare = broadcast ? 0.38 : 0.22;
    const deltaScale = broadcast ? 1.8 : 1;
    const roll = forceCallTicker ? 0 : r();
    let text: string;
    let verdict: Verdict;

    if (roll < usedShare) {
      const makeCall = (
        action: VerdictCall["action"],
        ticker: string,
      ): VerdictCall => {
        const sign = action === "BUY" ? 1 : -1;
        return {
          action,
          ticker,
          confidence: 0.62 + r() * 0.36,
          weightDelta:
            sign *
            (0.0008 + r() * 0.0032) *
            deltaScale *
            (action === "TRIM" ? 0.55 : 1),
        };
      };
      const asset = forceCallTicker
        ? (assets.find((a) => a.ticker === forceCallTicker) ??
          pickWeighted(assets, (a) => a.targetWeight + 0.01, r))
        : pickWeighted(assets, (a) => a.targetWeight + 0.01, r);
      // Mixed two-ticker positions: ~18% of accepted posts (30% broadcast).
      // A pile-on stays single-ticker — the point is the crowd on one name.
      if (!forceCallTicker && r() < (broadcast ? 0.3 : 0.18)) {
        const [tpl, actionA, actionB] =
          MULTI_CALL_TEMPLATES[Math.floor(r() * MULTI_CALL_TEMPLATES.length)];
        let other = pickWeighted(assets, (a) => a.targetWeight + 0.01, r);
        for (let i = 0; i < 6 && other.ticker === asset.ticker; i++) {
          other = pickWeighted(assets, (a) => a.targetWeight + 0.01, r);
        }
        const calls = [
          makeCall(actionA, asset.ticker),
          makeCall(actionB, other.ticker),
        ];
        text = tpl
          .replace("{T}", `$${asset.ticker}`)
          .replace("{T2}", `$${other.ticker}`);
        verdict = {
          kind: "used",
          ...calls[0],
          calls,
          oracleAgreement: r() < 0.72 ? 1 : 0.8,
        };
      } else {
        const [tpl, action] =
          CALL_TEMPLATES[Math.floor(r() * CALL_TEMPLATES.length)];
        text = tpl.replace("{T}", `$${asset.ticker}`);
        const call = makeCall(action, asset.ticker);
        verdict = {
          kind: "used",
          ...call,
          calls: [call],
          oracleAgreement: r() < 0.72 ? 1 : 0.8,
        };
      }
    } else if (roll < (broadcast ? 0.85 : 0.77)) {
      text = NO_CALL_TEMPLATES[Math.floor(r() * NO_CALL_TEMPLATES.length)];
      verdict = { kind: "no_call", oracleAgreement: r() < 0.85 ? 1 : 0.8 };
    } else {
      const [tpl, reason] =
        DISCARDED_TEMPLATES[Math.floor(r() * DISCARDED_TEMPLATES.length)];
      text = tpl;
      verdict = {
        kind: "discarded",
        reason,
        oracleAgreement: r() < 0.6 ? 1 : 0.6,
      };
    }

    return {
      id: `ev_${this.eventCounter++}`,
      ts,
      analystId: analyst.id,
      text,
      stage: resolved ? "classified" : "posted",
      verdict, // precomputed; VerdictChip hides it until stage flips
    };
  }

  private buildHistory(
    now: number,
    analysts: Analyst[],
    assets: Asset[],
  ): SignalEvent[] {
    const events: SignalEvent[] = [];
    let t = now - DAY_MS;
    while (t < now - 40_000) {
      t += this.historyGap();
      events.push(this.makeEvent(t, analysts, assets, true));
    }
    return events.reverse(); // newest first
  }

  // The full 180-day ledger, newest first. Membership changes are scripted
  // deterministically: a few of today's holdings joined mid-window (their
  // first move has from=0), and every FORMER_ASSET_SEED position exits inside
  // the window (its last move has to=0). On a trading day every active
  // holding moves (~25 rows per window). A day whose drift never clears the
  // threshold has no window at all — the ledger only records trades — and a
  // day whose drift spikes early trades twice (an intraday window ahead of
  // the 16:00 close).
  private buildRebalances(
    assets: Asset[],
    lastRebalanceTs: number,
  ): Rebalance[] {
    const HISTORY_DAYS = 180;
    // d = days before today. A ticker is a tradable member on day d when
    // d < addedDay (after its add) and d > removedDay (before its exit).
    type MemberWindow = {
      ticker: string;
      weight: number;
      addedDay: number | null;
      removedDay: number | null;
    };
    const windows: MemberWindow[] = assets.map((a) => {
      const r = mulberry32(hashString(`mem_${a.ticker}`));
      const addedDay =
        r() < 0.3 ? Math.floor(15 + r() * (HISTORY_DAYS - 30)) : null;
      return { ticker: a.ticker, weight: a.weight, addedDay, removedDay: null };
    });
    for (const [ticker, , , base] of FORMER_ASSET_SEED) {
      const r = mulberry32(hashString(`mem_${ticker}`));
      const removedDay = Math.floor(10 + r() * (HISTORY_DAYS - 50));
      const added = removedDay + 25 + Math.floor(r() * 110);
      windows.push({
        ticker,
        weight: base,
        addedDay: r() < 0.45 && added < HISTORY_DAYS - 5 ? added : null,
        removedDay,
      });
    }

    const out: Rebalance[] = [];
    for (let d = 0; d <= HISTORY_DAYS; d++) {
      const ts = lastRebalanceTs - d * DAY_MS;
      const r = mulberry32(hashString(`reb${d}`));

      const adds: RebalanceMove[] = [];
      const exits: RebalanceMove[] = [];
      for (const w of windows) {
        if (w.addedDay === d)
          adds.push({
            ticker: w.ticker,
            from: 0,
            to: w.weight * (0.45 + r() * 0.4),
          });
        if (w.removedDay === d)
          exits.push({
            ticker: w.ticker,
            from: w.weight * (0.6 + r() * 0.5),
            to: 0,
          });
      }

      // A quiet day: drift never cleared the threshold, so nothing to record.
      // The most recent window (d=0) always trades so the live sections have
      // moves.
      if (!adds.length && !exits.length && d !== 0 && r() < 0.3) continue;

      const active = windows.filter(
        (w) =>
          (w.addedDay === null || d < w.addedDay) &&
          (w.removedDay === null || d > w.removedDay),
      );
      // Every active member re-weights on a trading day: the basket always
      // changes, so a window carries one move per holding plus its adds/exits.
      const jitter = (): RebalanceMove[] =>
        active.map((w) => {
          const from = w.weight * (0.9 + r() * 0.2);
          const to = w.weight * (0.9 + r() * 0.2);
          return { ticker: w.ticker, from, to };
        });
      const bySize = (a: RebalanceMove, b: RebalanceMove) =>
        Math.abs(b.to - b.from) - Math.abs(a.to - a.from);

      out.push({
        id: `reb_${d}`,
        ts,
        moves: [...adds, ...exits, ...jitter()].sort(bySize),
        signalsUsed: Math.round(1100 + r() * 420),
        driftBefore: +(1.5 + r() * 1.6).toFixed(2),
      });

      // A second window earlier the same day: drift spiked before the close
      // and the basket traded on it. Newest first, so it follows the close.
      if (d !== 0 && r() < 0.12) {
        const hoursEarly = 4 + Math.floor(r() * 5); // 07:00–11:00 UTC
        out.push({
          id: `reb_${d}_early`,
          ts: ts - hoursEarly * 3_600_000,
          moves: jitter().sort(bySize),
          signalsUsed: Math.round(600 + r() * 300),
          driftBefore: +(1.5 + r() * 1.0).toFixed(2),
        });
      }
    }
    return out;
  }

  private buildNav(now: number): NavPoint[] {
    const r = mulberry32(0xbeef);
    const points: NavPoint[] = [];
    let v = 100;
    for (let d = 180; d >= 0; d--) {
      points.push({ ts: now - d * DAY_MS, value: v });
      const shock = r() < 0.04 ? (r() - 0.5) * 0.06 : 0;
      v = Math.max(60, v * (1 + 0.0011 + (r() - 0.5) * 0.024 + shock));
    }
    return points;
  }

  // S&P 500 comparison tape: same 180-day window, indexed to 100 at the same
  // inception. Calmer walk than the fund — broad-index drift and volatility.
  private buildBenchmark(now: number): NavPoint[] {
    const r = mulberry32(0x5b500);
    const points: NavPoint[] = [];
    let v = 100;
    for (let d = 180; d >= 0; d--) {
      points.push({ ts: now - d * DAY_MS, value: v });
      const shock = r() < 0.02 ? (r() - 0.55) * 0.03 : 0;
      v = Math.max(70, v * (1 + 0.00045 + (r() - 0.5) * 0.011 + shock));
    }
    return points;
  }

  private buildWeightHistory(now: number, assets: Asset[]): WeightSnapshot[] {
    const top = [...assets].sort((a, b) => b.weight - a.weight).slice(0, 6);
    const r = mulberry32(0xcafe);
    const snaps: WeightSnapshot[] = [];
    const walk: Record<string, number> = {};
    top.forEach((a) => (walk[a.ticker] = a.weight * (0.55 + r() * 0.5)));
    for (let d = 180; d >= 0; d -= 4) {
      const weights: Record<string, number> = {};
      let sum = 0;
      top.forEach((a) => {
        walk[a.ticker] = Math.max(
          0.01,
          walk[a.ticker] * (1 + (r() - 0.495) * 0.06),
        );
        // pull gently toward today's weight so the series ends truthfully
        walk[a.ticker] += (a.weight - walk[a.ticker]) * (d < 20 ? 0.25 : 0.015);
        weights[a.ticker] = walk[a.ticker];
        sum += walk[a.ticker];
      });
      weights.OTHER = Math.max(0.1, 1 - sum);
      snaps.push({ ts: now - d * DAY_MS, weights });
    }
    return snaps;
  }

  private buildOracles(): Oracle[] {
    return ORACLE_SEED.map(([name, role], i) => {
      const r = mulberry32(hashString(name));
      return {
        id: `orc_${i}`,
        name,
        role,
        votes24h: Math.round(5600 + r() * 900),
        consensusRate: 0.86 + r() * 0.12,
      };
    });
  }

  setTempo(tempo: "editorial" | "broadcast") {
    this.tempo = tempo;
  }

  /** Dev look test: dress the most visible analysts (top of the score order)
   *  in real X avatars fetched by scripts/fetch-avatars.mjs. Identity fields
   *  are untouched — only the portrait changes. No-op without analysts. */
  applyAvatarPreview(urls: string[]) {
    if (!this.state.analysts.length || !urls.length) return;
    const analysts = this.state.analysts.map((a, i) =>
      i < urls.length ? { ...a, avatarUrl: urls[i] } : a,
    );
    this.emit({ analysts });
  }

  // ---------------------------------------------------------------- live ---
  // Timers remove themselves on fire so the set only holds pending handles.
  private after(delay: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, delay);
    this.timers.add(t);
  }

  private scheduleNext(delay: number) {
    this.after(delay, () => this.fireEvent());
  }

  private spawnEvent(forceCallTicker?: string) {
    const { analysts, assets } = this.state;
    const ev = this.makeEvent(
      Date.now(),
      analysts,
      assets,
      false,
      forceCallTicker,
    );
    const hidden: SignalEvent = { ...ev, stage: "posted", verdict: ev.verdict };
    this.emit({ inFlight: hidden });

    // Guards: a burst can fire the next event before this one resolves —
    // only touch inFlight if this event still owns the slot.
    this.after(CLASSIFY_DELAY_MS, () => {
      if (this.state.inFlight?.id === hidden.id)
        this.emit({ inFlight: { ...hidden, stage: "classifying" } });
    });

    this.after(CLASSIFY_DELAY_MS + REVEAL_DELAY_MS, () => {
      const classified: SignalEvent = { ...hidden, stage: "classified" };
      this.applyVerdict(classified);
    });

    return ev;
  }

  private fireEvent() {
    const ev = this.spawnEvent();

    // Broadcast drama: sometimes the crowd piles onto one name — a few more
    // analysts hit the same ticker seconds apart, and the bubble surges.
    // Pile-on events ride the theatre pipeline but never reschedule the
    // main chain (that would multiply it).
    if (
      this.tempo === "broadcast" &&
      ev.verdict?.kind === "used" &&
      ev.verdict.ticker &&
      this.rand() < 0.2
    ) {
      const ticker = ev.verdict.ticker;
      const extra = 2 + Math.floor(this.rand() * 2);
      for (let i = 1; i <= extra; i++) {
        this.after(i * (600 + this.rand() * 500), () => {
          if (this.tempo === "broadcast") this.spawnEvent(ticker);
        });
      }
    }

    this.scheduleNext(this.sampleGap());
  }

  private applyVerdict(ev: SignalEvent) {
    const state = this.state;
    let assets = state.assets;
    let highlightTicker: string | null = null;
    let highlightCalls: { ticker: string; weightDelta: number }[] = [];

    const calls =
      ev.verdict?.kind === "used"
        ? (ev.verdict.calls ??
          (ev.verdict.ticker && ev.verdict.weightDelta
            ? [
                {
                  ticker: ev.verdict.ticker,
                  weightDelta: ev.verdict.weightDelta,
                },
              ]
            : []))
        : [];
    if (calls.length > 0) {
      // sim-only surface: the sim always fills weightDelta
      const deltas = new Map(calls.map((c) => [c.ticker, c.weightDelta ?? 0]));
      assets = state.assets.map((a) =>
        deltas.has(a.ticker)
          ? {
              ...a,
              targetWeight: Math.max(
                0.002,
                a.targetWeight + deltas.get(a.ticker)!,
              ),
            }
          : a,
      );
      // renormalize targets to 1
      const sum = assets.reduce((s, a) => s + a.targetWeight, 0);
      assets = assets.map((a) => ({
        ...a,
        targetWeight: a.targetWeight / sum,
      }));
      highlightTicker = calls[0].ticker;
      highlightCalls = calls.map((c) => ({
        ticker: c.ticker,
        weightDelta: c.weightDelta ?? 0, // sim-only surface: always filled
      }));
    }

    const events = [ev, ...state.events];
    const cutoff = Date.now() - DAY_MS;
    while (events.length && events[events.length - 1].ts < cutoff) events.pop();

    if (ev.verdict?.kind === "used") {
      assets = this.deriveArgument(events, assets);
    }

    this.emit({
      events,
      assets,
      inFlight: this.state.inFlight?.id === ev.id ? null : this.state.inFlight,
      highlightTicker,
      highlightCalls,
      stats: tallyStats(events, Date.now(), state.analysts.length),
      driftPct: computeDrift(assets),
    });

    if (highlightTicker) {
      this.after(4_000, () => {
        if (this.state.highlightTicker === highlightTicker)
          this.emit({ highlightTicker: null, highlightCalls: [] });
      });
    }
  }
}

// ------------------------------------------------------------------ utils ---
function emptyState(): SimState {
  return {
    mode: "sim",
    live: null,
    fallbackReason: null,
    booted: false,
    now: 0,
    analysts: [],
    assets: [],
    events: [],
    inFlight: null,
    stats: {
      total24h: 0,
      used24h: 0,
      noCall24h: 0,
      discarded24h: 0,
      trackedAnalysts: 0,
      visibleAnalysts: VISIBLE_ANALYSTS,
    },
    rebalances: [],
    nav: [],
    benchmark: [],
    weightHistory: [],
    oracles: [],
    lastRebalanceTs: 0,
    nextRebalanceTs: 0,
    driftPct: 0,
    highlightTicker: null,
    highlightCalls: [],
    lastBasketMoves: null,
    disputedExample: null,
  };
}

function pickWeighted<T>(
  items: T[],
  weight: (t: T) => number,
  rand: () => number,
): T {
  const total = items.reduce((s, i) => s + weight(i), 0);
  let roll = rand() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rebalanceWindow(now: number) {
  // Daily rebalance at 16:00 UTC.
  const d = new Date(now);
  const today16 = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    16,
    0,
    0,
  );
  const lastRebalanceTs = now >= today16 ? today16 : today16 - DAY_MS;
  return { lastRebalanceTs, nextRebalanceTs: lastRebalanceTs + DAY_MS };
}

function tallyStats(
  events: SignalEvent[],
  now: number,
  trackedAnalysts: number,
) {
  const cutoff = now - DAY_MS;
  let used = 0,
    noCall = 0,
    discarded = 0,
    total = 0;
  for (const e of events) {
    if (e.ts < cutoff) break;
    total++;
    const k: VerdictKind | undefined = e.verdict?.kind;
    if (k === "used") used++;
    else if (k === "no_call") noCall++;
    else if (k === "discarded") discarded++;
  }
  return {
    total24h: total,
    used24h: used,
    noCall24h: noCall,
    discarded24h: discarded,
    trackedAnalysts,
    visibleAnalysts: VISIBLE_ANALYSTS,
  };
}

function computeDrift(assets: Asset[]): number {
  const sum = assets.reduce(
    (s, a) => s + Math.abs(a.targetWeight - a.weight),
    0,
  );
  return +(sum * 100).toFixed(2) / 2; // one-way turnover convention
}

export const DRIFT_THRESHOLD = DRIFT_THRESHOLD_PCT;
export const simEngine = new SimEngine();
