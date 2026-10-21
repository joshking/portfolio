import "server-only";

// ---------------------------------------------------------------------------
// In-process per-IP token bucket for the bridge routes that can reach a
// metered or third-party upstream (author lookup, oEmbed). Not a production
// boundary — one process, memory only — but it stops a single client from
// turning the dev bridge into an amplifier. See docs/SECURITY.md.
// ---------------------------------------------------------------------------

const CAPACITY = 60; // requests per window per IP
const WINDOW_MS = 60_000;
const REFILL_PER_MS = CAPACITY / WINDOW_MS;
const MAX_TRACKED_IPS = 5_000;

const buckets = new Map<string, { tokens: number; at: number }>();

/**
 * Forwarded headers are attacker-controlled unless a proxy we trust sets
 * them, so they are only honoured behind TRUST_PROXY=1 — and then the LAST
 * hop is taken (proxies append; the first hop is still client-supplied).
 * Without a trusted proxy every caller shares one bucket: an honest brake on
 * the loopback dev stack rather than a bypassable per-IP illusion.
 */
export function clientIp(request: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "local";
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const last = forwarded.split(",").at(-1)?.trim();
    if (last) return last;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "local";
}

/** 429 with Retry-After when the caller's bucket is empty, else null. */
export function rateLimitResponse(request: Request): Response | null {
  const ip = clientIp(request);
  const now = Date.now();
  const bucket = buckets.get(ip) ?? { tokens: CAPACITY, at: now };
  bucket.tokens = Math.min(
    CAPACITY,
    bucket.tokens + (now - bucket.at) * REFILL_PER_MS,
  );
  bucket.at = now;
  // Re-insert so Map order == recency; the oldest entry is the eviction target.
  buckets.delete(ip);
  buckets.set(ip, bucket);
  while (buckets.size > MAX_TRACKED_IPS) {
    const oldest = buckets.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
  if (bucket.tokens < 1) {
    const retryAfterSec = Math.ceil((1 - bucket.tokens) / REFILL_PER_MS / 1000);
    return Response.json(
      { error: "rate limited" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, retryAfterSec)),
          "Cache-Control": "no-store",
        },
      },
    );
  }
  bucket.tokens -= 1;
  return null;
}
