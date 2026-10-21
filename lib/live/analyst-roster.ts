import "server-only";

import { upstreamGet } from "./bridge-upstream";
import type { NodeAnalystsResponse } from "./node-types";

// ---------------------------------------------------------------------------
// The node's current analyst roster, as a lowercase handle set. This is the
// allowlist for the metered author lookup: only a handle the node actually
// tracks may trigger a TwitterAPI.io call. Cached ~10 min in memory; a
// bridge miss is remembered briefly so a down node isn't hammered, and it
// yields null — callers fail CLOSED (no metered call).
// ---------------------------------------------------------------------------

const ROSTER_TTL_MS = 10 * 60_000;
const MISS_TTL_MS = 30_000;

let roster: { at: number; handles: Set<string> | null } | null = null;
let loading: Promise<Set<string> | null> | null = null;

async function fetchRoster(): Promise<Set<string> | null> {
  try {
    const res = await upstreamGet(
      "/api/analysts",
      "application/json",
      AbortSignal.timeout(3_000),
    );
    if (res.status !== 200) {
      void res.body?.cancel().catch(() => {});
      return null;
    }
    const parsed = JSON.parse(
      await new Response(res.body).text(),
    ) as NodeAnalystsResponse;
    if (!Array.isArray(parsed.analysts)) return null;
    const handles = new Set<string>();
    for (const analyst of parsed.analysts) {
      if (typeof analyst.handle === "string") {
        handles.add(analyst.handle.toLowerCase());
      }
    }
    return handles;
  } catch {
    return null;
  }
}

/** Lowercase handle set, or null when the roster is unavailable. */
export async function analystRoster(): Promise<Set<string> | null> {
  if (roster) {
    const ttl = roster.handles ? ROSTER_TTL_MS : MISS_TTL_MS;
    if (Date.now() - roster.at < ttl) return roster.handles;
  }
  if (loading) return loading;
  loading = fetchRoster()
    .then((handles) => {
      roster = { at: Date.now(), handles };
      return handles;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}
