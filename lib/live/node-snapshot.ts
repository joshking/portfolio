import { upstreamGet } from "./bridge-upstream";
import type { NodeSnapshot } from "./node-types";

// ---------------------------------------------------------------------------
// Boot snapshot, derived rather than proxied.
//
// The node removed /api/realtime/snapshot (and /api/realtime/events) in schema
// v22 — migration 0002_remove_realtime_preview, "Remove the disabled realtime
// feed and live basket preview schema". The live wire now rides
// /api/classifications/events, whose cursor IS the interpretation id.
//
// The only field either boot path actually reads is `cursor`, so derive it
// from the newest classification row. basket_preview stays null: the node has
// no live preview to serve any more either, and both boot paths already treat
// null as "local scoring still warming".
//
// Shared by the bridge route (client boot) and ssr-boot (server boot) so the
// two can't drift on how the cursor is read.
// ---------------------------------------------------------------------------
export async function fetchNodeSnapshot(
  signal?: AbortSignal,
): Promise<NodeSnapshot> {
  const res = await upstreamGet(
    "/api/classifications?limit=1",
    "application/json",
    signal,
  );
  if (res.status !== 200) {
    void res.body?.cancel().catch(() => {});
    throw new Error(`upstream ${res.status}: /api/classifications`);
  }
  const parsed = JSON.parse(await new Response(res.body).text()) as {
    classifications?: { interpretation_id?: number; rule_version?: string }[];
  };
  const newest = parsed.classifications?.[0];
  // No classifications yet is a legitimate cold node: cursor 0 starts the
  // stream from the beginning.
  const cursor = Number(newest?.interpretation_id ?? 0);
  if (!Number.isSafeInteger(cursor) || cursor < 0) {
    throw new Error("node returned an invalid classification cursor");
  }
  return {
    schema_version: 1,
    cursor,
    replay_floor: 0,
    // Variant scoping is driven off the seeded rows' rule_version
    // (DESIGN.md §4); mirror it so the snapshot carries the same identity.
    variant: { slug: newest?.rule_version ?? "", identity_hash: "" },
    basket_preview: null,
  };
}
