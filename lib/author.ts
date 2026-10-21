// Client for /api/bridge/author/[handle] — the avatar + verified mark the
// compact renderer needs for attribution. Module-level cache because the wire
// re-mounts the same authors constantly as it churns.

export interface Author {
  /** X numeric user id (as a string) when the provider gave one. The only
   *  stable author key; handles are mutable. */
  id: string | null;
  name: string | null;
  handle: string;
  avatarUrl: string | null;
  verified: boolean;
}

const MAX_CACHE_ENTRIES = 5_000;
const cache = new Map<string, Author | null>();
const inFlight = new Map<string, Promise<Author | null>>();

function remember(key: string, value: Author | null) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Seed the cache with server-resolved authors (SSR hand-off). */
export function primeAuthorCache(authors: Record<string, Author>): void {
  for (const [handle, author] of Object.entries(authors)) {
    if (!cache.has(handle)) remember(handle, author);
  }
}

export function cachedAuthor(handle: string): Author | null {
  return cache.get(handle.toLowerCase()) ?? null;
}

export function fetchAuthor(handle: string): Promise<Author | null> {
  const key = handle.toLowerCase();
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = fetch(`/api/bridge/author/${encodeURIComponent(handle)}`, {
    headers: { Accept: "application/json" },
  })
    .then(async (res) => {
      if (!res.ok) {
        // Unresolvable author is cached as null so we don't retry per mount.
        remember(key, null);
        return null;
      }
      const body = (await res.json()) as Partial<Author>;
      const value: Author = {
        id: body.id ?? null,
        name: body.name ?? null,
        handle: body.handle ?? handle,
        avatarUrl: body.avatarUrl ?? null,
        verified: body.verified === true,
      };
      remember(key, value);
      return value;
    })
    .catch(() => {
      remember(key, null);
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}
