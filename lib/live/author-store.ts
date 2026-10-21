import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Author } from "@/lib/author";

// ---------------------------------------------------------------------------
// Durable author store — TwitterAPI.io is METERED, so this exists to make sure
// we never pay for the same analyst twice in a day.
//
// The previous in-memory Map lost everything on restart, and a dev session
// restarts the server constantly: each one re-fetched every analyst on screen.
// That was the real cost, not the traffic itself.
//
// Rules this enforces:
//   • at most ONE upstream call per analyst per 24h
//   • a negative result (suspended/renamed/not found) is cached too, so a
//     missing analyst is not retried on every render
//   • the store survives restarts, so a day's worth of lookups is paid once
//
// It is a JSON file, not a database: the roster is 1,000 analysts and this is
// a read-mostly cache. If it ever needs to be shared across processes, move it
// to the read-side API (scout-etl) rather than growing this.
// ---------------------------------------------------------------------------

const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 5_000;
const STORE_DIR = path.join(process.cwd(), ".cache");
const STORE_PATH = path.join(STORE_DIR, "authors.json");

interface Entry {
  at: number;
  value: Author | null;
}

let memory: Map<string, Entry> | null = null;
let loading: Promise<Map<string, Entry>> | null = null;
let flushTimer: NodeJS.Timeout | null = null;

async function load(): Promise<Map<string, Entry>> {
  if (memory) return memory;
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await readFile(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as Record<string, Entry>;
      memory = new Map(Object.entries(parsed));
    } catch {
      // No store yet (or corrupt) — start clean rather than failing the page.
      memory = new Map();
    }
    return memory;
  })();
  return loading;
}

/** Debounced write: a burst of lookups produces one flush, not forty. */
function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void (async () => {
      const store = await load();
      try {
        await mkdir(STORE_DIR, { recursive: true });
        await writeFile(
          STORE_PATH,
          JSON.stringify(Object.fromEntries(store)),
          "utf8",
        );
      } catch {
        // A cache that cannot persist is still a working in-memory cache.
      }
    })();
  }, 1_000);
}

/** Cached author, or undefined when we have never looked this handle up. */
export async function readAuthor(
  handle: string,
): Promise<Author | null | undefined> {
  const store = await load();
  const hit = store.get(handle.toLowerCase());
  if (!hit) return undefined;
  if (Date.now() - hit.at >= TTL_MS) return undefined;
  return hit.value;
}

export async function writeAuthor(
  handle: string,
  value: Author | null,
): Promise<void> {
  const store = await load();
  const key = handle.toLowerCase();
  store.delete(key);
  store.set(key, { at: Date.now(), value });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
  scheduleFlush();
}

/** Debug/ops view: how many analysts are cached and how fresh. */
export async function authorStoreStats() {
  const store = await load();
  const now = Date.now();
  let fresh = 0;
  let negative = 0;
  let withId = 0;
  for (const entry of store.values()) {
    if (now - entry.at < TTL_MS) fresh += 1;
    if (entry.value === null) negative += 1;
    else if (entry.value.id) withId += 1;
  }
  return { total: store.size, fresh, negative, withId };
}
