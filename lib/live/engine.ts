import type { Analyst, Asset, SignalEvent, SimState } from "@/lib/sim/types";
import type {
  NodeAnalystsResponse,
  NodeBasketPreview,
  NodeClassificationsResponse,
  NodePost,
  NodeSnapshot,
  StreamClassification,
  StreamReset,
} from "./node-types";
import {
  mapOperatorBasket,
  mapAnalystComposite,
  buildVerdict,
  deriveBackers,
  diffBasket,
  mapAnalyst,
  mapBasketPreview,
  matchClassificationRow,
  parseBasketPreview,
  mapSeedRow,
  mapStreamClassification,
  tweetKey,
  type ScoutIdentity,
  type ScoutPerformanceRow,
} from "./mapping";

// ---------------------------------------------------------------------------
// LiveEngine: the sim's swap surface (subscribe/getState/start/stop) fed by
// the oracle node through /api/bridge/*. Honesty rules (DESIGN.md v3):
// no invented numbers — NAV, rebalance clock, analyst metrics, dayMove and
// fund-vs-model drift are ABSENT (null/empty); weightDelta is always null
// (no per-post delta attribution); basket momentum comes from real preview
// diffs, unattributed.
// ---------------------------------------------------------------------------

// 100, not 400: the UI shows 7 cards + 14 chyron items, and the server
// stats baseline covers the 24h counts — parsing 400 rows on boot was pure
// mobile TBT. (SSR uses its own SSR_SEED_LIMIT=40.)
const SEED_LIMIT = 100;
const SEED_TEXT_LIMIT = 40; // newest seeds that get post-text enrichment
const SEED_TEXT_CONCURRENCY = 4;
const ENRICH_RETRIES = 3;
const ENRICH_GAP_MS = 600;
const FLUSH_MS = 150; // batched stream-emit cadence (hidden-tab fallback)
const FETCH_TIMEOUT_MS = 10_000; // hard per-request ceiling
// scout-upstream requests limit=10000 — a full page means truncation.
const SCOUT_ROW_LIMIT = 10_000;
const STALL_REPOLL_MS = 15_000;
const HIGHLIGHT_MS = 4_000;
const STAGE_CLASSIFYING_MS = 1_100; // arrival theatre: posted -> classifying
const STAGE_REVEAL_MS = 2_100; // -> classified (verdict was real all along)
const MAX_HELD_EVENTS = 1000;
const DAY_MS = 86_400_000;
const VARIANT_MATCH_FLOOR = 0.8;
const QUOTES_REFRESH_MS = 120_000; // real market quotes (bridge /quotes)
const STATS_REFRESH_MS = 300_000; // authoritative 24h baseline (/stats24h)
const MAX_QUOTE_SYMBOLS = 60; // the quotes route's validated ceiling

type Listener = () => void;

export interface LiveEngineDeps {
  fetchFn?: typeof fetch;
  createEventSource?: (url: string) => EventSource;
  now?: () => number;
  /** Fatal boot failure (snapshot/seed unreachable). Resolver falls back. */
  onFatal?: (reason: string) => void;
  initial?: SimState;
}

export class LiveEngine {
  private listeners = new Set<Listener>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private started = false;
  private primed = false; // one-shot: constructed from SSR-primed state
  private bootToken = 0; // bumped on stop/reset; async work checks it
  private abort: AbortController | null = null;
  private es: EventSource | null = null;
  private lastSeenCursor = 0;
  private heldKeys = new Map<string, string>(); // dedupe key -> event id
  // H1 guard: only ever apply a preview newer than the last applied one —
  // repoll snapshots + replayed stream events can arrive out of order.
  private lastPreviewMark: { generation: number; computedAt: number } | null =
    null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private repollTimer: ReturnType<typeof setTimeout> | null = null;
  private quotesTimer: ReturnType<typeof setTimeout> | null = null;
  private statsTimer: ReturnType<typeof setTimeout> | null = null;
  private esBackoffMs = 2_000;
  private seedPostIds = new Map<string, number>(); // event id → logical_post_id
  // Batched stream emits: state.events updates synchronously (ordering +
  // supersede semantics stay exact) but the expensive derives + listener
  // notifications flush at most once per frame / FLUSH_MS.
  private flushHandle:
    | { kind: "raf"; id: number }
    | { kind: "timer"; id: ReturnType<typeof setTimeout> }
    | null = null;
  private eventsDirty = false;
  // Coalesced enrichment: one shared in-flight classifications page serves
  // every pending unresolved key (they all read the same newest-100 page).
  private classificationsInFlight: Promise<NodeClassificationsResponse> | null =
    null;
  private navTruncationWarned = false;
  private scoutIdentity: ScoutIdentity | null = null;
  // Last real quotes by ticker; reapplied whenever assets are rebuilt.
  private lastQuotes: Record<
    string,
    { price: number | null; changePct: number | null }
  > = {};
  // Server-counted 24h baseline. Only a COMPLETE walk makes stats
  // authoritative; a truncated count is a floor and keeps held-window rules.
  private statsBaseline: {
    count: number;
    asOf: number;
    complete: boolean;
  } | null = null;

  private fetchFn: typeof fetch;
  private createEventSource: (url: string) => EventSource;
  private now: () => number;
  private onFatal: (reason: string) => void;

  state: SimState = emptyLiveState();

  constructor(deps: LiveEngineDeps = {}) {
    this.fetchFn = deps.fetchFn ?? ((...args) => fetch(...args));
    this.createEventSource =
      deps.createEventSource ?? ((url) => new EventSource(url));
    this.now = deps.now ?? (() => Date.now());
    this.onFatal = deps.onFatal ?? (() => {});
    if (deps.initial) {
      // SSR-primed: start from the server-rendered state so hydration is
      // seamless; the async boot re-seeds and supersedes it wholesale.
      this.state = deps.initial;
      this.primed = true;
    }
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = () => this.state;

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    // Primed state stays on screen while boot supersedes it wholesale —
    // wiping it here would blank the SSR-rendered basket for the boot
    // round-trip. The flag is one-shot: a restart after stop() must not
    // resurrect a stale primed snapshot.
    const wasPrimed = this.primed;
    if (!this.primed) this.state = emptyLiveState();
    this.primed = false;
    const token = this.bootToken;
    if (wasPrimed) {
      // SSR already painted real state — defer the client boot's fetch+parse
      // burst to idle so hydration doesn't pay for it (mobile TBT).
      const kick = () => {
        if (!this.stale(token)) void this.boot(token);
      };
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(kick, { timeout: 2_000 });
      } else {
        this.after(1, kick);
      }
    } else {
      void this.boot(token);
    }
  }

  stop() {
    this.bootToken++;
    this.abort?.abort();
    this.abort = null;
    this.es?.close();
    this.es = null;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.repollTimer = null;
    this.quotesTimer = null;
    this.statsTimer = null;
    // Stale handles would make startHeartbeat/startRepoll early-return
    // forever after a stop/start cycle — stats freeze on quiet streams.
    this.heartbeatTimer = null;
    this.lastPreviewMark = null;
    this.cancelFlush();
    this.eventsDirty = false;
    this.classificationsInFlight = null;
    this.lastQuotes = {};
    this.statsBaseline = null;
    this.scoutIdentity = null;
    this.heldKeys.clear();
    this.seedPostIds.clear();
    this.lastSeenCursor = 0;
    this.esBackoffMs = 2_000;
    this.started = false;
  }

  // -------------------------------------------------------------- helpers ---
  private emit(partial: Partial<SimState>) {
    this.state = { ...this.state, ...partial, now: this.now() };
    this.listeners.forEach((fn) => fn());
  }

  private emitLive(partial: Partial<NonNullable<SimState["live"]>>) {
    if (!this.state.live) return;
    this.emit({ live: { ...this.state.live, ...partial } });
  }

  // Stream-event state changes go through here: events update synchronously
  // so the next arrival supersedes/dedupes against current state, but the
  // deriveBackers/tallyLive rebuild + listener notification are batched —
  // one flush per animation frame (visible) or FLUSH_MS (hidden). During
  // backlog replay this collapses hundreds of emits into a handful.
  private commitEvents(token: number, events: SimState["events"]) {
    this.state = { ...this.state, events };
    this.eventsDirty = true;
    this.scheduleFlush(token);
  }

  private scheduleFlush(token: number) {
    if (this.flushHandle !== null) return;
    const flush = () => {
      this.flushHandle = null;
      if (this.stale(token) || !this.eventsDirty) return;
      this.eventsDirty = false;
      this.emit({
        events: this.state.events,
        assets: this.enrichAssets(this.state.assets, this.state.events),
        stats: this.tallyLive(this.state.events, this.state.analysts.length),
      });
    };
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "visible" &&
      typeof requestAnimationFrame === "function"
    ) {
      this.flushHandle = { kind: "raf", id: requestAnimationFrame(flush) };
    } else {
      this.flushHandle = { kind: "timer", id: this.after(FLUSH_MS, flush) };
    }
  }

  private cancelFlush() {
    if (this.flushHandle === null) return;
    if (this.flushHandle.kind === "raf") {
      cancelAnimationFrame(this.flushHandle.id);
    } else {
      clearTimeout(this.flushHandle.id);
      this.timers.delete(this.flushHandle.id);
    }
    this.flushHandle = null;
  }

  private after(delay: number, fn: () => void): ReturnType<typeof setTimeout> {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, delay);
    this.timers.add(t);
    return t;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.after(ms, resolve));
  }

  private stale(token: number): boolean {
    return token !== this.bootToken || !this.started;
  }

  private async fetchJson<T>(path: string): Promise<T> {
    if (!this.abort) this.abort = new AbortController();
    const res = await this.fetchFn(path, {
      // Engine-lifecycle abort + a hard 10s ceiling: a hung upstream must
      // never wedge boot/enrichment forever.
      signal: AbortSignal.any([
        this.abort.signal,
        AbortSignal.timeout(FETCH_TIMEOUT_MS),
      ]),
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return (await res.json()) as T;
  }

  // ----------------------------------------------------------------- boot ---
  private async boot(token: number, fatalOnFail = true) {
    this.abort?.abort();
    this.abort = new AbortController();
    this.classificationsInFlight = null;
    try {
      const snapshot = await this.fetchJson<NodeSnapshot>(
        "/api/bridge/snapshot",
      );
      if (this.stale(token)) return;
      if (!Number.isSafeInteger(snapshot.cursor) || snapshot.cursor < 0) {
        throw new Error("snapshot returned an invalid cursor");
      }
      this.lastSeenCursor = snapshot.cursor;
      // Cursor known — open the stream NOW so a slow scout call can't delay
      // live events. Events arriving pre-seed land in state.events via the
      // normal held-key dedupe; the boot emit below merges them with seeds.
      this.openStream(token);

      const [analystsRes, classificationsRes] = await Promise.all([
        this.fetchJson<NodeAnalystsResponse>("/api/bridge/analysts"),
        this.fetchJson<NodeClassificationsResponse>(
          `/api/bridge/classifications?limit=${SEED_LIMIT}`,
        ),
      ]);
      if (this.stale(token)) return;

      if (
        !Array.isArray(analystsRes.analysts) ||
        !Array.isArray(classificationsRes.classifications)
      ) {
        throw new Error("boot endpoints returned malformed collections");
      }

      const analysts = analystsRes.analysts
        .map(mapAnalyst)
        .filter((analyst): analyst is Analyst => analyst !== null);
      const { events: seeded, variantNote } = this.seedEvents(
        classificationsRes.classifications,
      );
      // Stream events that arrived while we seeded (live_s_ ids) are already
      // in heldKeys, so seedEvents skipped their seed-page rows — merging
      // here keeps them without double-counting.
      const streamed = this.state.events.filter((ev) =>
        ev.id.startsWith("live_s_"),
      );
      const events = [...streamed, ...seeded]
        .sort((a, b) => b.ts - a.ts)
        .slice(0, MAX_HELD_EVENTS);

      // basket_preview may be null upstream (local scoring still warming) —
      // in that case render the PROD operator's committed daily basket
      // (labeled with its provenance + date), never a fabrication. A stream
      // preview may ALSO have applied while we seeded (it sets
      // lastPreviewMark); never clobber it with the older snapshot preview.
      const streamPreviewApplied = this.lastPreviewMark !== null;
      let assets: Asset[] = streamPreviewApplied
        ? this.state.assets
        : snapshot.basket_preview
          ? mapBasketPreview(snapshot.basket_preview)
          : [];
      let basketSource: "node-preview" | "operator-daily" | null =
        assets.length > 0 ? "node-preview" : null;
      let basketComputedAt: string | null = streamPreviewApplied
        ? (this.state.live?.basketComputedAt ?? null)
        : assets.length > 0
          ? (snapshot.basket_preview?.computed_at ?? null)
          : null;
      let weightResidual: number | null = null;
      let basketDatasetSource: "prod" | "snapshot" | null = streamPreviewApplied
        ? (this.state.live?.basketDatasetSource ?? null)
        : null;
      this.scoutIdentity = null;
      if (assets.length === 0) {
        try {
          const scout = await this.fetchJson<{
            rows: Parameters<typeof mapOperatorBasket>[0];
            source?: unknown;
          }>("/api/bridge/scout/basket-entries");
          if (this.stale(token)) return;
          const datasetSource =
            scout.source === "prod" || scout.source === "snapshot"
              ? scout.source
              : null;
          const operator = mapOperatorBasket(scout.rows);
          if (
            datasetSource &&
            operator.assets.length > 0 &&
            operator.operator &&
            operator.variantIdentity
          ) {
            assets = operator.assets;
            basketSource = "operator-daily";
            basketComputedAt = operator.computedAt;
            weightResidual = operator.residualWeight;
            basketDatasetSource = datasetSource;
            this.scoutIdentity = {
              operator: operator.operator,
              variantIdentity: operator.variantIdentity,
            };
          }
        } catch {
          // scout unavailable — honest empty basket stands
        }
      }

      this.eventsDirty = false; // this emit supersedes any pending flush
      this.emit({
        mode: "live",
        live: {
          status: variantNote
            ? "degraded"
            : this.es && this.es.readyState === 1 /* EventSource.OPEN */
              ? "streaming"
              : "boot",
          coverage: { trackedAnalysts: analysts.length },
          variantNote,
          basketSource,
          basketComputedAt,
          basketDatasetSource,
          navDatasetSource: null,
          navComputedAt: null,
          weightResidual,
        },
        booted: true,
        analysts,
        assets: this.enrichAssets(assets, events),
        events,
        stats: this.tallyLive(events, analysts.length),
        driftPct: null,
        nav: [],
        benchmark: [],
        rebalances: [],
        weightHistory: [],
        oracles: [],
        lastRebalanceTs: 0,
        nextRebalanceTs: 0,
        disputedExample: null,
        lastBasketMoves: null,
      });

      this.startHeartbeat(token);
      this.startQuotesLoop(token);
      this.startStatsLoop(token);
      void this.loadCompositeNav(token);
      void this.enrichSeedTexts(
        token,
        events
          .filter((ev) => ev.textStatus === "resolving")
          .slice(0, SEED_TEXT_LIMIT),
      );
    } catch (err) {
      if (this.stale(token)) return;
      if (!fatalOnFail) {
        // Reset-path reboot (mid-session): contract says stall + retry,
        // never fall back to sim.
        this.emitLive({ status: "stalled" });
        this.startRepoll(token);
        this.after(STALL_REPOLL_MS, () => {
          if (!this.stale(token)) void this.boot(token, false);
        });
        return;
      }
      const reason = err instanceof Error ? err.message : String(err);
      this.onFatal(`live boot failed: ${reason}`);
    }
  }

  // Variant-scoped, deduped seeding (DESIGN.md §4): rows don't carry
  // identity_hash — the newest row's rule_version is the session marker.
  private seedEvents(rows: NodeClassificationsResponse["classifications"]): {
    events: SignalEvent[];
    variantNote: string | null;
  } {
    if (rows.length === 0) return { events: [], variantNote: null };
    const marker = rows[0].rule_version;
    const matching = rows.filter((r) => r.rule_version === marker);
    const variantNote =
      matching.length / rows.length < VARIANT_MATCH_FLOOR
        ? `seed window mixed rule versions — showing ${matching.length}/${rows.length} rows matching ${marker}`
        : null;

    // A re-seed (boot after SSR priming, stream reset) must not regress
    // cards whose post text is already on screen — same event id or same
    // tweet set ⇒ same post text.
    const priorText = new Map<string, SignalEvent>();
    for (const ev of this.state.events) {
      if (ev.text) {
        priorText.set(ev.id, ev);
        priorText.set(tweetKey(ev.tweetIds ?? []), ev);
      }
    }
    const events: SignalEvent[] = [];
    const seenInterpretations = new Set<number>();
    for (const row of matching) {
      if (seenInterpretations.has(row.interpretation_id)) continue;
      seenInterpretations.add(row.interpretation_id);
      const key = tweetKey(row.provider_post_ids);
      if (this.heldKeys.has(key)) continue;
      let event = mapSeedRow(row);
      if (event === null) continue; // malformed timestamp — skip
      const prior = priorText.get(event.id) ?? priorText.get(key);
      if (prior) {
        event = {
          ...event,
          text: prior.text,
          sourceUrl: prior.sourceUrl,
          textStatus: undefined,
        };
      }
      this.heldKeys.set(key, event.id);
      this.seedPostIds.set(event.id, row.logical_post_id);
      events.push(event);
    }
    events.sort((a, b) => b.ts - a.ts); // newest first
    return { events: events.slice(0, MAX_HELD_EVENTS), variantNote };
  }

  // Counts derive solely from held events. Once the held window spans 24h the
  // 24h cutoff applies exactly; before that, every held event counts and the
  // UI relabels the tiles to the held window ("SIGNALS · LAST Nh").
  private tallyLive(events: SignalEvent[], trackedAnalysts: number) {
    const now = this.now();
    // Fixed trailing 24h window: only events inside it count, always.
    const cutoff = now - DAY_MS;
    let used = 0,
      noCall = 0,
      discarded = 0,
      total = 0;
    for (const e of events) {
      if (e.ts < cutoff) continue;
      total++;
      if (e.verdict?.kind === "used") used++;
      else if (e.verdict?.kind === "no_call") noCall++;
      else if (e.verdict?.kind === "discarded") discarded++;
      // "review" counts toward total only — it is neither used nor rejected.
    }
    // Authoritative total: server-counted 24h baseline + held rows newer
    // than the baseline's newest counted row (same clock domain — both are
    // node interpreted_at/classified_at). Held events are deduped by key, so
    // counting ALL of them past asOf — streamed OR seeded after a cached
    // baseline — is disjoint from the walk. Only a COMPLETE walk is exact;
    // an INCOMPLETE walk is still a better floor than the held tally, so it
    // is surfaced as one (saturated → the UI renders "N+"), never as exact.
    // used/noCall/discarded remain HELD-WINDOW tallies in both branches (the
    // server gives no breakdown) — total24h alone is server-derived; don't
    // compute ratios across them.
    const baseline = this.statsBaseline;
    if (baseline) {
      let sinceBaseline = 0;
      for (const e of events) {
        if (e.ts > baseline.asOf) sinceBaseline++;
      }
      const floorTotal = Math.max(baseline.count + sinceBaseline, total);
      if (baseline.complete) {
        return {
          total24h: floorTotal,
          used24h: used,
          noCall24h: noCall,
          discarded24h: discarded,
          authoritative: true,
          trackedAnalysts,
          visibleAnalysts: trackedAnalysts,
        };
      }
      return {
        total24h: floorTotal,
        used24h: used,
        noCall24h: noCall,
        discarded24h: discarded,
        saturated: true,
        trackedAnalysts,
        visibleAnalysts: trackedAnalysts,
      };
    }
    const oldestHeld = events.length ? events[events.length - 1].ts : null;
    return {
      total24h: total,
      used24h: used,
      noCall24h: noCall,
      discarded24h: discarded,
      // No server baseline at all: the held tally is a floor whenever a FULL
      // seed page sits entirely inside the 24h window — anything between the
      // cutoff and the oldest held row is invisible to us. SEED_LIMIT, not
      // MAX_HELD_EVENTS: a full 100-row seed already means truncation.
      saturated:
        events.length >= SEED_LIMIT &&
        oldestHeld !== null &&
        oldestHeld > cutoff,
      trackedAnalysts,
      visibleAnalysts: trackedAnalysts,
    };
  }

  // --------------------------------------------------------------- stream ---
  private openStream(token: number) {
    if (this.stale(token)) return;
    this.es?.close();
    let es: EventSource;
    try {
      es = this.createEventSource(
        `/api/bridge/stream?cursor=${this.lastSeenCursor}`,
      );
    } catch {
      // Stream construction failed AFTER a successful seed — that is a
      // stall (retry + re-poll), never a boot failure / sim fallback.
      this.emitLive({ status: "stalled" });
      this.startRepoll(token);
      const backoff = this.esBackoffMs;
      this.esBackoffMs = Math.min(30_000, this.esBackoffMs * 2);
      this.after(backoff, () => this.openStream(token));
      return;
    }
    this.es = es;

    es.onopen = () => {
      if (this.stale(token)) return;
      this.esBackoffMs = 2_000;
      this.stopRepoll();
      this.emitLive({
        status: this.state.live?.variantNote ? "degraded" : "streaming",
      });
    };

    es.onerror = () => {
      if (this.stale(token)) return;
      // Mid-session loss NEVER falls back to sim — surface the stall and
      // retry (EventSource backoff + snapshot re-poll every 15s).
      this.emitLive({ status: "stalled" });
      this.startRepoll(token);
      // Numeric constant: the factory is injectable, so the global
      // EventSource may not exist in the host environment.
      if (es.readyState === 2 /* EventSource.CLOSED */) {
        const backoff = this.esBackoffMs;
        this.esBackoffMs = Math.min(30_000, this.esBackoffMs * 2);
        this.after(backoff, () => this.openStream(token));
      }
    };

    es.addEventListener("classification.created", (e) => {
      if (this.stale(token)) return;
      this.onClassification(token, e as MessageEvent<string>);
    });
    es.addEventListener("basket.preview.updated", (e) => {
      if (this.stale(token)) return;
      this.onBasketPreview(e as MessageEvent<string>);
    });
    es.addEventListener("stream.reset", (e) => {
      if (this.stale(token)) return;
      this.onStreamReset(e as MessageEvent<string>);
    });
  }

  private eventCursor(e: MessageEvent<string>): number | null {
    const id = Number(e.lastEventId);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    if (id <= this.lastSeenCursor) return null; // at/before snapshot cursor
    return id;
  }

  private onClassification(token: number, e: MessageEvent<string>) {
    const id = this.eventCursor(e);
    if (id === null) return;
    let payload: StreamClassification;
    try {
      payload = JSON.parse(e.data) as StreamClassification;
    } catch {
      return;
    }
    let event = mapStreamClassification(id, payload);
    if (event === null) return; // malformed timestamp — skip, never NaN
    this.lastSeenCursor = id;
    const key = tweetKey(event.tweetIds);
    const existingId = this.heldKeys.get(key);
    let events: typeof this.state.events;
    if (existingId !== undefined) {
      const idx = this.state.events.findIndex((ev) => ev.id === existingId);
      if (idx === -1) return; // replayed duplicate of an evicted card — drop
      // Legitimate re-classification (review → actionable, re-run):
      // supersede the held card; newest verdict wins. Same tweets
      // ⇒ same post: carry the already-resolved text/analyst instead of
      // resetting the card to a "resolving" shimmer (re-run bursts made
      // resolved cards visibly regress).
      const prior = this.state.events[idx];
      if (prior.text || prior.analystId) {
        event = {
          ...event,
          text: prior.text,
          sourceUrl: prior.sourceUrl,
          ...(prior.text ? { textStatus: undefined } : {}),
          analystId: event.analystId || prior.analystId,
        };
      }
      // The re-classification carries a NEW ts — move the card to its
      // chronological slot (newest-first) so the on-air list and lastUsed
      // lookups surface it as latest instead of leaving it buried at the
      // superseded card's old position.
      const superseding = event; // const for closure narrowing
      events = this.state.events.slice();
      events.splice(idx, 1);
      let insertAt = events.findIndex((ev) => ev.ts <= superseding.ts);
      if (insertAt === -1) insertAt = events.length;
      events.splice(insertAt, 0, superseding);
      this.heldKeys.set(key, superseding.id);
    } else {
      events = [event, ...this.state.events];
      this.heldKeys.set(key, event.id);
      if (events.length > MAX_HELD_EVENTS) {
        events = events.slice(0, MAX_HELD_EVENTS);
        // Prune keys only when eviction actually dropped events — the old
        // per-event full prune was an O(n²) hot spot during backlog replay.
        const heldIds = new Set(events.map((ev) => ev.id));
        for (const [k, v] of this.heldKeys) {
          if (!heldIds.has(v)) this.heldKeys.delete(k);
        }
      }
    }
    // Arrival theatre (new cards only; supersedes update instantly): the
    // verdict is real and already computed — we stage its reveal for pacing.
    // Stage changes ride the same batched flush; the visual stagger comes
    // from the per-card stage fields, not from per-emit timing.
    const isNew = existingId === undefined;
    if (isNew) {
      const idx = events.findIndex((ev) => ev.id === event.id);
      if (idx !== -1) events[idx] = { ...event, stage: "posted" };
      const setStage = (stage: "classifying" | "classified") => {
        if (this.stale(token)) return;
        this.commitEvents(
          token,
          this.state.events.map((ev) =>
            ev.id === event.id ? { ...ev, stage } : ev,
          ),
        );
      };
      this.after(STAGE_CLASSIFYING_MS, () => setStage("classifying"));
      this.after(STAGE_REVEAL_MS, () => setStage("classified"));
    }
    this.commitEvents(token, events);
    // Carried-over supersedes are already complete — no enrichment needed.
    if (!event.text || !event.analystId) {
      void this.enrichStreamEvent(token, event);
    }
  }

  private onBasketPreview(e: MessageEvent<string>) {
    const id = this.eventCursor(e);
    if (id === null) return;
    let payload: NodeBasketPreview;
    try {
      payload = JSON.parse(e.data) as NodeBasketPreview;
    } catch {
      return;
    }
    if (this.applyBasketPreview(payload)) this.lastSeenCursor = id;
  }

  private applyBasketPreview(preview: NodeBasketPreview): boolean {
    const mapped = parseBasketPreview(preview);
    if (mapped === null) return false;
    // H1 guard: replayed/older previews must never diff against newer state
    // (that fabricates reversed basket moves). generation is authoritative;
    // computed_at breaks ties for older payloads without one.
    const generation = Number(preview.generation ?? Number.NaN);
    const computedAt = Date.parse(preview.computed_at ?? "");
    const mark = {
      generation: Number.isFinite(generation) ? generation : -1,
      computedAt: Number.isFinite(computedAt) ? computedAt : -1,
    };
    const last = this.lastPreviewMark;
    if (last !== null) {
      const newer =
        mark.generation !== -1 && last.generation !== -1
          ? mark.generation > last.generation
          : mark.computedAt > last.computedAt;
      if (!newer) return true;
    }
    if (mapped.length === 0) {
      // Warming preview (allocation coverage initializing) — keep whatever
      // real basket is on screen; claim nothing. Do not mark it as applied:
      // a corrected same-generation preview is allowed to replace it.
      return true;
    }
    this.lastPreviewMark = mark;
    if (this.state.live && this.state.live.basketSource !== "node-preview") {
      // The local preview supersedes the operator's daily basket; do NOT
      // diff across sources (that would fabricate movements between two
      // different computations). The residual caption belongs to the
      // operator basket — clear it with the basket it described.
      const assetsNow = this.enrichAssets(mapped);
      this.emitLive({
        basketSource: "node-preview",
        basketComputedAt: preview.computed_at ?? null,
        basketDatasetSource: null,
        weightResidual: null,
      });
      this.emit({ assets: assetsNow });
      return true;
    }
    const nextAssets = this.enrichAssets(mapped);
    const hadPrevious = this.state.assets.length > 0;
    const moves = hadPrevious ? diffBasket(this.state.assets, nextAssets) : [];

    if (moves.length === 0) {
      this.emit({ assets: nextAssets });
      return true;
    }
    // Real per-symbol deltas from successive previews — unattributed to any
    // post ("BASKET UPDATED", not "▸ caused by …").
    const ts = this.now();
    this.emit({
      assets: nextAssets,
      highlightTicker: moves[0].ticker,
      highlightCalls: moves.map((m) => ({
        ticker: m.ticker,
        weightDelta: m.delta,
      })),
      lastBasketMoves: { ts, moves },
    });
    this.after(HIGHLIGHT_MS, () => {
      if (this.state.lastBasketMoves?.ts === ts) {
        this.emit({ highlightTicker: null, highlightCalls: [] });
      }
    });
    return true;
  }

  private onStreamReset(e: MessageEvent<string>) {
    try {
      JSON.parse(e.data) as StreamReset; // shape check only
    } catch {
      return;
    }
    // Full reboot: snapshot + reseed under a fresh token.
    this.bootToken++;
    const token = this.bootToken;
    this.es?.close();
    this.es = null;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.repollTimer = null;
    this.heartbeatTimer = null;
    this.quotesTimer = null;
    this.statsTimer = null;
    this.cancelFlush();
    this.eventsDirty = false;
    this.classificationsInFlight = null;
    this.heldKeys.clear();
    this.seedPostIds.clear(); // reseed repopulates; else grows across resets
    this.lastSeenCursor = 0;
    this.esBackoffMs = 2_000;
    this.emitLive({ status: "boot" });
    this.lastPreviewMark = null; // fresh snapshot re-derives ordering
    this.scoutIdentity = null;
    void this.boot(token, false);
  }

  // M2: a quiet-but-connected stream must not freeze the held-window
  // claim — re-tally every minute so "LAST {N}h" tracks the wall clock.
  // NAV in live mode: an EQUAL-WEIGHT COMPOSITE of the prod operator's
  // scored analysts' daily portfolio returns, indexed to 100 — real numbers,
  // declared derivation, labeled as such in the UI.
  private async loadCompositeNav(token: number) {
    try {
      const res = await this.fetchJson<{
        rows: ScoutPerformanceRow[];
        source?: unknown;
      }>("/api/bridge/scout/analyst-performance");
      if (this.stale(token)) return;
      const rows = res.rows;
      const datasetSource =
        res.source === "prod" || res.source === "snapshot" ? res.source : null;
      if (!datasetSource || !Array.isArray(rows)) return;
      // The upstream fetch requests limit=10000 (scout-upstream); a full
      // page means the series was truncated mid-day — the OLDEST day is
      // partial and would silently shift the series start.
      // Snapshot files are complete extracts and may legitimately exceed the
      // production page size, so only the paged API can trigger this guard.
      const truncated =
        datasetSource === "prod" && rows.length >= SCOUT_ROW_LIMIT;
      if (truncated && !this.navTruncationWarned) {
        this.navTruncationWarned = true;
        console.warn(
          "[live-bridge] analyst-performance hit the 10000-row page limit — dropping the oldest (partial) day from the composite NAV",
        );
      }
      const composite = mapAnalystComposite(
        rows,
        this.scoutIdentity,
        truncated,
      );
      if (composite.nav.length > 0) {
        this.emit({ nav: composite.nav });
        this.emitLive({
          navDatasetSource: datasetSource,
          navComputedAt: composite.computedAt,
        });
      }
    } catch {
      // scout unavailable — NAV tile stays NOT YET MEASURED
    }
  }

  private startHeartbeat(token: number) {
    if (this.heartbeatTimer !== null) return;
    const tick = () => {
      this.heartbeatTimer = null;
      if (this.stale(token)) return;
      this.emit({
        stats: this.tallyLive(this.state.events, this.state.analysts.length),
      });
      this.heartbeatTimer = this.after(60_000, tick);
    };
    this.heartbeatTimer = this.after(60_000, tick);
  }

  private startRepoll(token: number) {
    if (this.repollTimer !== null) return;
    const tick = async () => {
      if (this.stale(token) || this.state.live?.status !== "stalled") {
        this.repollTimer = null;
        return;
      }
      try {
        const snapshot = await this.fetchJson<NodeSnapshot>(
          "/api/bridge/snapshot",
        );
        if (this.stale(token)) return;
        if (snapshot.basket_preview) {
          this.applyBasketPreview(snapshot.basket_preview);
        }
      } catch {
        // still down — keep polling
      }
      if (this.stale(token)) return;
      this.repollTimer = this.after(STALL_REPOLL_MS, () => void tick());
    };
    this.repollTimer = this.after(STALL_REPOLL_MS, () => void tick());
  }

  private stopRepoll() {
    if (this.repollTimer !== null) {
      clearTimeout(this.repollTimer);
      this.timers.delete(this.repollTimer);
      this.repollTimer = null;
    }
  }

  // ----------------------------------------------------------- enrichment ---
  // The stream event carries the verdict (status/signals) but not the
  // author or post; the classification row (same transaction) provides
  // analyst, logical_post_id and rationales. Retry ×3, 600ms apart;
  // unresolved cards keep the honest tweet-id-only form.

  // Coalesced page fetch: during bursts every pending unresolved key reads
  // the SAME newest-100 page — one in-flight request serves all waiters
  // (each keeps its own retry budget; retries re-coalesce per round).
  private fetchClassificationsPage(): Promise<NodeClassificationsResponse> {
    if (this.classificationsInFlight === null) {
      const p: Promise<NodeClassificationsResponse> =
        this.fetchJson<NodeClassificationsResponse>(
          // 100, not 25: during re-run bursts (hundreds of rows/min) a small
          // window misses the matching row and strands the card unresolved.
          "/api/bridge/classifications?limit=100",
        ).finally(() => {
          if (this.classificationsInFlight === p) {
            this.classificationsInFlight = null;
          }
        });
      this.classificationsInFlight = p;
    }
    return this.classificationsInFlight;
  }

  private async enrichStreamEvent(token: number, event: SignalEvent) {
    for (let attempt = 0; attempt < ENRICH_RETRIES; attempt++) {
      try {
        const res = await this.fetchClassificationsPage();
        if (this.stale(token)) return;
        const row = matchClassificationRow(
          res.classifications,
          event.tweetIds,
          event.ts,
        );
        if (row) {
          this.updateEvent(event.id, (ev) => ({
            ...ev,
            analystId: String(row.analyst_id),
            verdict: buildVerdict(row.status, row.signals),
          }));
          await this.attachPostText(token, event.id, row.logical_post_id);
          return;
        }
      } catch {
        if (this.stale(token)) return;
      }
      await this.delay(ENRICH_GAP_MS);
      if (this.stale(token)) return;
    }
    this.updateEvent(event.id, (ev) => ({ ...ev, textStatus: "unresolved" }));
  }

  // Seed-text enrichment collects every resolved post and emits ONCE at the
  // end (single events-array rebuild + deriveBackers + tallyLive) — the old
  // per-fetch emits were 40 full state rebuilds during boot, pure mobile
  // TBT. Per-card updates remain only on the stream path (attachPostText).
  private async enrichSeedTexts(token: number, seeds: SignalEvent[]) {
    const resolved = new Map<
      string,
      { text: string; sourceUrl: string } | null
    >();
    const queue = [...seeds];
    const worker = async () => {
      while (queue.length > 0) {
        const ev = queue.shift();
        if (!ev || this.stale(token)) return;
        const postId = this.seedPostIds.get(ev.id) ?? null;
        if (postId === null) {
          resolved.set(ev.id, null);
          continue;
        }
        try {
          const post = await this.fetchJson<NodePost>(
            `/api/bridge/posts/${postId}`,
          );
          resolved.set(ev.id, { text: post.text, sourceUrl: post.url });
        } catch {
          if (this.stale(token)) return;
          resolved.set(ev.id, null);
        }
      }
    };
    await Promise.all(
      Array.from({ length: SEED_TEXT_CONCURRENCY }, () => worker()),
    );
    if (this.stale(token)) return;
    const events = this.state.events.map((ev) => {
      if (resolved.has(ev.id)) {
        const hit = resolved.get(ev.id);
        return hit
          ? {
              ...ev,
              text: hit.text,
              sourceUrl: hit.sourceUrl,
              textStatus: undefined,
            }
          : { ...ev, textStatus: "unresolved" as const };
      }
      // Seed rows past the enrichment budget render the tweet-id-only form.
      // Stream-arrived events keep their own in-flight enrichment (L1).
      if (ev.textStatus === "resolving" && ev.id.startsWith("live_c_")) {
        return { ...ev, textStatus: "unresolved" as const };
      }
      return ev;
    });
    this.emit({
      events,
      assets: this.enrichAssets(this.state.assets, events),
      stats: this.tallyLive(events, this.state.analysts.length),
    });
  }

  private async attachPostText(
    token: number,
    eventId: string,
    logicalPostId: number | null,
  ) {
    if (logicalPostId === null) {
      this.updateEvent(eventId, (ev) => ({ ...ev, textStatus: "unresolved" }));
      return;
    }
    try {
      const post = await this.fetchJson<NodePost>(
        `/api/bridge/posts/${logicalPostId}`,
      );
      if (this.stale(token)) return;
      this.updateEvent(eventId, (ev) => ({
        ...ev,
        text: post.text,
        sourceUrl: post.url,
        textStatus: undefined,
      }));
    } catch {
      if (this.stale(token)) return;
      this.updateEvent(eventId, (ev) => ({ ...ev, textStatus: "unresolved" }));
    }
  }

  private updateEvent(
    id: string,
    update: (ev: SignalEvent) => SignalEvent,
  ): void {
    let changed = false;
    const events = this.state.events.map((ev) => {
      if (ev.id !== id) return ev;
      changed = true;
      return update(ev);
    });
    if (!changed) return;
    // Enrichment can resolve an event's analystId — backers may change.
    // This emit already rebuilds everything a pending flush would.
    this.eventsDirty = false;
    this.emit({
      events,
      assets: this.enrichAssets(this.state.assets, events),
      stats: this.tallyLive(events, this.state.analysts.length),
    });
  }

  // ------------------------------------------------- asset enrichment ---
  // Rebuilds derived per-asset fields on top of whatever asset list is
  // current: backers from held USED calls, then the last real quotes.
  private enrichAssets(
    assets: Asset[],
    events: SignalEvent[] = this.state.events,
  ): Asset[] {
    return deriveBackers(assets, events).map((asset) => {
      const quote = this.lastQuotes[asset.ticker];
      if (!quote) return asset;
      return {
        ...asset,
        price: quote.price,
        priceChange24hPct: quote.changePct,
        // Mirror for existing dayMove readers — REAL 24h market data.
        dayMove: quote.changePct,
      };
    });
  }

  private startQuotesLoop(token: number) {
    if (this.quotesTimer !== null) return;
    const tick = async () => {
      this.quotesTimer = null;
      if (this.stale(token)) return;
      await this.refreshQuotes(token);
      if (this.stale(token)) return;
      this.quotesTimer = this.after(QUOTES_REFRESH_MS, () => void tick());
    };
    void tick();
  }

  private async refreshQuotes(token: number) {
    const symbols = [...new Set(this.state.assets.map((a) => a.ticker))].slice(
      0,
      MAX_QUOTE_SYMBOLS,
    );
    if (symbols.length === 0) return;
    try {
      const res = await this.fetchJson<{
        quotes: Record<
          string,
          { price: number | null; changePct: number | null }
        >;
      }>(`/api/bridge/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
      if (this.stale(token)) return;
      this.lastQuotes = res.quotes ?? {};
      this.emit({ assets: this.enrichAssets(this.state.assets) });
    } catch {
      // quotes unavailable — price fields keep their last value / stay null
    }
  }

  private startStatsLoop(token: number) {
    if (this.statsTimer !== null) return;
    const tick = async () => {
      this.statsTimer = null;
      if (this.stale(token)) return;
      await this.refreshStats(token);
      if (this.stale(token)) return;
      this.statsTimer = this.after(STATS_REFRESH_MS, () => void tick());
    };
    void tick();
  }

  private async refreshStats(token: number) {
    try {
      const res = await this.fetchJson<{
        count: number;
        asOf: number;
        complete: boolean;
      }>("/api/bridge/stats24h");
      if (this.stale(token)) return;
      if (!Number.isFinite(res.count) || !Number.isFinite(res.asOf)) return;
      this.statsBaseline = {
        count: res.count,
        asOf: res.asOf,
        complete: res.complete === true,
      };
      this.emit({
        stats: this.tallyLive(this.state.events, this.state.analysts.length),
      });
    } catch {
      // baseline unavailable — held-window stats stand (no fabrication)
    }
  }
}

function emptyLiveState(): SimState {
  return {
    mode: "live",
    live: {
      status: "boot",
      coverage: { trackedAnalysts: 0 },
      variantNote: null,
      basketSource: null,
      basketComputedAt: null,
      basketDatasetSource: null,
      navDatasetSource: null,
      navComputedAt: null,
      weightResidual: null,
    },
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
      visibleAnalysts: 0,
    },
    rebalances: [],
    nav: [],
    benchmark: [],
    weightHistory: [],
    oracles: [],
    lastRebalanceTs: 0,
    nextRebalanceTs: 0,
    driftPct: null,
    highlightTicker: null,
    highlightCalls: [],
    lastBasketMoves: null,
    disputedExample: null,
  };
}
