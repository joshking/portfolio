import { upstreamGet } from "./bridge-upstream";
import type { NodeClassificationRow } from "./node-types";

// ---------------------------------------------------------------------------
// True trailing-24h classification count. Hardened nodes return an exact
// `total` for a timezone-qualified `since` filter. During a rolling upgrade,
// older nodes ignore `since` and omit `total`; the bounded legacy walk below
// keeps serving an explicitly incomplete floor instead of inventing accuracy.
// ---------------------------------------------------------------------------

export interface Stats24h {
  count: number;
  /** ms timestamp of the newest counted row (node clock domain). */
  asOf: number;
  /** true ⇒ the walk reached past the 24h boundary; count is exact. */
  complete: boolean;
}

const PAGE_LIMIT = 500;
const MAX_PAGES = 10;
const DAY_MS = 86_400_000;
const CACHE_MS = 60_000;

let cached: { at: number; value: Stats24h } | null = null;

async function fetchPage(
  since: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{
  rows: NodeClassificationRow[];
  total?: number;
}> {
  const res = await upstreamGet(
    `/api/classifications?limit=${limit}&since=${encodeURIComponent(since)}`,
    "application/json",
    signal,
  );
  if (res.status !== 200) throw new Error(`classifications ${res.status}`);
  const text = await new Response(res.body).text();
  const parsed = JSON.parse(text) as {
    classifications?: NodeClassificationRow[];
    total?: number;
  };
  return {
    rows: parsed.classifications ?? [],
    total: parsed.total,
  };
}

export async function computeStats24h(signal?: AbortSignal): Promise<Stats24h> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const cutoff = Date.now() - DAY_MS;
  const since = new Date(cutoff).toISOString();
  const countPage = await fetchPage(since, 1, signal);
  if (Number.isSafeInteger(countPage.total) && (countPage.total ?? -1) >= 0) {
    const newestAt = Date.parse(countPage.rows[0]?.interpreted_at ?? "");
    const value: Stats24h = {
      count: countPage.total ?? 0,
      asOf: Number.isFinite(newestAt) ? newestAt : Date.now(),
      complete: true,
    };
    cached = { at: Date.now(), value };
    return value;
  }

  const firstPage = await fetchPage(since, PAGE_LIMIT, signal);
  const seen = new Set<number>();
  let count = 0;
  let asOf = 0;
  let complete = false;
  let prevOldestId = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES && !complete; page++) {
    const rows =
      page === 0
        ? firstPage.rows
        : (await fetchPage(since, PAGE_LIMIT, signal)).rows;
    let newRows = 0;
    let oldestId = Number.POSITIVE_INFINITY;
    for (const row of rows) {
      oldestId = Math.min(oldestId, row.interpretation_id);
      if (seen.has(row.interpretation_id)) continue;
      seen.add(row.interpretation_id);
      newRows++;
      const ts = Date.parse(row.interpreted_at);
      if (!Number.isFinite(ts)) continue;
      if (ts < cutoff) {
        complete = true; // crossed the 24h boundary — everything is counted
      } else {
        count++;
        if (ts > asOf) asOf = ts;
      }
    }
    if (rows.length < PAGE_LIMIT) complete = true; // the API has no more rows
    // limit-only API: another fetch returns the same newest window. No new
    // rows / no backward progress ⇒ we cannot see past the cap. Stop honest.
    if (!complete && (newRows === 0 || oldestId >= prevOldestId)) break;
    prevOldestId = oldestId;
  }

  const value: Stats24h = { count, asOf: asOf || Date.now(), complete };
  cached = { at: Date.now(), value };
  return value;
}
