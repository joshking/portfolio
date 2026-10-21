import { readFile } from "node:fs/promises";
import path from "node:path";

// Server-side scout access shared by the bridge route and SSR boot:
// prod-first (server-held key), extracted snapshot as offline fallback,
// short memory cache. Numeric strings pass through untouched.
const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; body: string }>();

function stampSource(body: string, source: "prod" | "snapshot"): string | null {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return JSON.stringify({ ...(parsed as Record<string, unknown>), source });
  } catch {
    return null;
  }
}

async function fromProd(
  dataset: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const base = process.env.SCOUT_API_URL;
  const key = process.env.SCOUT_API_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base.replace(/\/+$/, "")}/v1/network-fund/${dataset}?limit=10000`,
      {
        headers: {
          "x-api-key": key,
          // Cloudflare rejects default runtime UAs.
          "User-Agent": "network-fund-bridge/1.0",
          Accept: "application/json",
        },
        // Callers with a tighter budget (SSR boot) pass their own signal;
        // 10s stays the ceiling either way.
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
          : AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      console.warn(`[scout-upstream] prod ${dataset}: HTTP ${res.status}`);
      return null;
    }
    const body = stampSource(await res.text(), "prod");
    if (body === null) {
      console.warn(`[scout-upstream] prod ${dataset}: malformed response`);
    }
    return body;
  } catch (err) {
    console.warn(
      `[scout-upstream] prod ${dataset} failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function fromSnapshot(dataset: string): Promise<string | null> {
  const dir = process.env.SCOUT_SNAPSHOT_DIR;
  if (!dir) return null;
  try {
    const raw = await readFile(path.join(dir, `${dataset}.json`), "utf8");
    const rows = JSON.parse(raw) as unknown;
    if (!Array.isArray(rows)) return null;
    return JSON.stringify({ count: rows.length, rows, source: "snapshot" });
  } catch (err) {
    console.warn(
      `[scout-upstream] snapshot ${dataset} failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function fetchScoutDataset(
  dataset: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const cached = cache.get(dataset);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.body;
  const body =
    (await fromProd(dataset, signal)) ?? (await fromSnapshot(dataset));
  if (body !== null) cache.set(dataset, { at: Date.now(), body });
  return body;
}
