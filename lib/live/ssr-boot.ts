import { upstreamGet, bridgeEnabled } from "./bridge-upstream";
import { fetchNodeSnapshot } from "./node-snapshot";
import { loadOEmbed, loadAuthor } from "./post-cache-server";
import { fetchScoutDataset } from "./scout-upstream";
import { computeStats24h } from "./stats24h";
import {
  deriveBackers,
  mapAnalyst,
  mapBasketPreview,
  mapOperatorBasket,
  mapSeedRow,
} from "./mapping";
import type { NodeAnalyst, NodeClassificationRow } from "./node-types";
import type { Analyst, Asset, SignalEvent, SimState } from "@/lib/sim/types";
import type { PostCacheSeed } from "@/lib/post-cache";

// ---------------------------------------------------------------------------
// SSR boot: the server sits next to the bridge, so the first paint should
// already CONTAIN the basket, roster, and seeded wire — hydration animates
// what's on screen instead of fetching it. Budget-bounded; any miss returns
// null and the page falls back to the client-boot path.
// ---------------------------------------------------------------------------

const SSR_SEED_LIMIT = 40;
// Post text for the cards actually on screen at first paint (feed shows 7):
// fetched server-side so the page never opens on a "resolving" shimmer.
const SSR_TEXT_LIMIT = 12;
const BUDGET_MS = 1_800;
const DAY_MS = 86_400_000;

async function upstreamJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const res = await upstreamGet(path, "application/json", signal);
  if (res.status !== 200) throw new Error(`upstream ${res.status}: ${path}`);
  const text = await new Response(res.body).text();
  return JSON.parse(text) as T;
}

function seedEventsLite(rows: NodeClassificationRow[]): {
  events: SignalEvent[];
  postIds: Map<string, number>;
} {
  const postIds = new Map<string, number>();
  if (!Array.isArray(rows)) return { events: [], postIds };
  if (rows.length === 0) return { events: [], postIds };
  // Variant scoping: dominant = the newest row's rule_version (DESIGN.md §4).
  const marker = rows[0].rule_version;
  const events: SignalEvent[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    if (row.rule_version !== marker) continue;
    if (seen.has(row.interpretation_id)) continue;
    seen.add(row.interpretation_id);
    const event = mapSeedRow(row);
    if (event) {
      events.push(event);
      postIds.set(event.id, row.logical_post_id);
    }
  }
  events.sort((a, b) => b.ts - a.ts);
  return { events, postIds };
}

// Resolve post text for the first paint's visible cards. Budget-shared: a
// miss just leaves that card on the client enrichment path.
async function attachSeedTexts(
  events: SignalEvent[],
  postIds: Map<string, number>,
  signal: AbortSignal,
): Promise<void> {
  await Promise.allSettled(
    events.slice(0, SSR_TEXT_LIMIT).map(async (event, i) => {
      const postId = postIds.get(event.id);
      if (postId == null) return;
      const post = await upstreamJson<{ text: string; url: string }>(
        `/api/posts/${postId}`,
        signal,
      );
      events[i] = {
        ...event,
        text: post.text,
        sourceUrl: post.url,
        textStatus: undefined,
      };
    }),
  );
}

function tally24h(events: SignalEvent[], trackedAnalysts: number) {
  const cutoff = Date.now() - DAY_MS;
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
  }
  return {
    total24h: total,
    used24h: used,
    noCall24h: noCall,
    discarded24h: discarded,
    trackedAnalysts,
    visibleAnalysts: trackedAnalysts,
  };
}

// Per-process micro-cache: the full upstream fan-out costs ~1.5s against
// the 1.8s budget, and EVERY cold visitor paid it. One fetch per 10s window
// serves everyone in it; caching the promise also coalesces concurrent
// requests. A null result (bridge down/miss) is cached too — that only
// defers recovery by ≤10s.
const SSR_CACHE_MS = 10_000;
export interface LiveBoot {
  state: SimState | null;
  posts: PostCacheSeed | null;
}
let ssrCache: { at: number; promise: Promise<LiveBoot> } | null = null;

/** Posts warmed above the fold. Beyond this the client fills in as it scrolls;
 *  warming all 40 would blow the SSR budget for rows nobody sees yet. */
const SSR_WARM_POSTS = 12;

/**
 * Resolve the post data for the first screenful so the wire is IN the first
 * paint rather than appearing seconds later. Shares post-cache-server's cache,
 * so the browser's own requests for these posts are hits.
 */
async function warmPosts(
  events: SignalEvent[],
  analystById: Map<string, Analyst>,
): Promise<PostCacheSeed> {
  const seed: PostCacheSeed = {
    width: 320,
    theme: "dark",
    oembed: {},
    authors: {},
  };
  const targets = events
    .filter((event) => event.sourceUrl)
    .slice(0, SSR_WARM_POSTS);
  await Promise.all(
    targets.map(async (event) => {
      const url = event.sourceUrl as string;
      const handle = analystById.get(event.analystId)?.handle;
      const [payload, author] = await Promise.all([
        loadOEmbed(url, "dark", 320),
        handle ? loadAuthor(handle) : Promise.resolve(null),
      ]);
      if (payload) seed.oembed[url] = payload;
      if (handle && author) seed.authors[handle.toLowerCase()] = author;
    }),
  );
  return seed;
}

export function fetchInitialLive(): Promise<LiveBoot> {
  if (ssrCache && Date.now() - ssrCache.at < SSR_CACHE_MS) {
    return ssrCache.promise;
  }
  const promise = fetchInitialLiveUncached();
  ssrCache = { at: Date.now(), promise };
  return promise;
}

async function fetchInitialLiveUncached(): Promise<LiveBoot> {
  if (!bridgeEnabled()) return { state: null, posts: null };
  const signal = AbortSignal.timeout(BUDGET_MS);
  try {
    const [snapshotR, analystsR, classificationsR, basketR, statsR] =
      await Promise.allSettled([
        fetchNodeSnapshot(signal),
        upstreamJson<{ analysts: NodeAnalyst[] }>("/api/analysts", signal),
        upstreamJson<{ classifications: NodeClassificationRow[] }>(
          `/api/classifications?limit=${SSR_SEED_LIMIT}`,
          signal,
        ),
        fetchScoutDataset("basket-entries", signal),
        computeStats24h(signal),
      ]);
    if (snapshotR.status === "rejected" || analystsR.status === "rejected") {
      // core boot data missing — client path handles it
      return { state: null, posts: null };
    }
    if (!Array.isArray(analystsR.value.analysts)) {
      return { state: null, posts: null };
    }
    const analysts = analystsR.value.analysts
      .map(mapAnalyst)
      .filter((analyst): analyst is Analyst => analyst !== null);
    let events: SignalEvent[] = [];
    if (
      classificationsR.status === "fulfilled" &&
      Array.isArray(classificationsR.value.classifications)
    ) {
      const seeded = seedEventsLite(classificationsR.value.classifications);
      events = seeded.events;
      await attachSeedTexts(events, seeded.postIds, signal);
    }

    let assets: Asset[] = [];
    let basketSource: "node-preview" | "operator-daily" | null = null;
    let basketComputedAt: string | null = null;
    let basketDatasetSource: "prod" | "snapshot" | null = null;
    let weightResidual: number | null = null;
    const preview = snapshotR.value.basket_preview;
    if (preview) {
      // A live-but-warming preview can be empty (allocation coverage still
      // initializing) — only claim it when it actually has entries.
      const previewAssets = mapBasketPreview(preview);
      if (previewAssets.length > 0) {
        assets = previewAssets;
        basketSource = "node-preview";
        basketComputedAt = preview.computed_at ?? null;
      }
    }
    if (
      assets.length === 0 &&
      (basketR.status !== "fulfilled" || !basketR.value)
    ) {
      console.warn(
        "[ssr-boot] no operator basket:",
        basketR.status === "fulfilled" ? "null body" : String(basketR.reason),
      );
    }
    if (
      assets.length === 0 &&
      basketR.status === "fulfilled" &&
      basketR.value
    ) {
      try {
        const parsed = JSON.parse(basketR.value) as {
          rows?: unknown;
          source?: unknown;
        };
        const datasetSource =
          parsed.source === "prod" || parsed.source === "snapshot"
            ? parsed.source
            : null;
        const operator = mapOperatorBasket(
          parsed.rows as Parameters<typeof mapOperatorBasket>[0],
        );
        if (datasetSource && operator.assets.length > 0) {
          assets = operator.assets;
          basketSource = "operator-daily";
          basketComputedAt = operator.computedAt;
          basketDatasetSource = datasetSource;
          weightResidual = operator.residualWeight;
        }
      } catch (err) {
        console.warn(
          "[ssr-boot] malformed operator basket:",
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Authoritative 24h baseline (budget-shared). A truncated walk is still
    // a FLOOR — surface it as one (saturated → "N+"), never as exact. With
    // no baseline at all, a full SSR seed page inside the window is itself
    // a floor (the 40-row seed can't see the rest of the 24h).
    const heldStats = tally24h(events, analysts.length);
    const seedIsFloor =
      events.length >= SSR_SEED_LIMIT &&
      events[events.length - 1].ts > Date.now() - DAY_MS;
    const stats =
      statsR.status === "fulfilled"
        ? statsR.value.complete
          ? {
              ...heldStats,
              total24h: Math.max(statsR.value.count, heldStats.total24h),
              authoritative: true,
            }
          : {
              ...heldStats,
              total24h: Math.max(statsR.value.count, heldStats.total24h),
              saturated: true,
            }
        : { ...heldStats, saturated: seedIsFloor };

    console.warn(
      `[ssr-boot] initial: analysts=${analysts.length} events=${events.length} assets=${assets.length} source=${basketSource} stats24h=${statsR.status === "fulfilled" ? `${statsR.value.count}/${statsR.value.complete}` : "miss"}`,
    );
    const analystById = new Map(analysts.map((a) => [a.id, a]));
    const posts = await warmPosts(events, analystById);

    const state: SimState = {
      mode: "live",
      live: {
        status: "boot",
        coverage: { trackedAnalysts: analysts.length },
        variantNote: null,
        basketSource,
        basketComputedAt,
        basketDatasetSource,
        navDatasetSource: null,
        navComputedAt: null,
        weightResidual,
      },
      fallbackReason: null,
      booted: true,
      now: Date.now(),
      analysts,
      assets: deriveBackers(assets, events),
      events,
      inFlight: null,
      rebalances: [],
      nav: [],
      benchmark: [],
      weightHistory: [],
      oracles: [],
      stats,
      lastRebalanceTs: 0,
      nextRebalanceTs: 0,
      driftPct: null,
      highlightTicker: null,
      highlightCalls: [],
      disputedExample: null,
      lastBasketMoves: null,
    };
    return { state, posts };
  } catch (err) {
    console.warn(
      "[ssr-boot] failed:",
      err instanceof Error ? err.message : err,
    );
    return { state: null, posts: null };
  }
}
