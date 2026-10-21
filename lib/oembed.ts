// Shared client for /api/bridge/oembed.
//
// Both post renderers read the SAME cached payload: the native X widget path
// uses `html`, the compact path uses the pre-split fields. One cache means
// switching between them costs no extra round trips to X.

export interface OEmbedPayload {
  html: string;
  author_name: string | null;
  author_url: string | null;
  /** Post text as X wrote it, entity links intact. Never re-wrapped. */
  text_html: string | null;
  lang: string | null;
  dir: string | null;
  permalink: string | null;
  date_text: string | null;
}

const MAX_CACHE_ENTRIES = 500;
const cache = new Map<string, OEmbedPayload>();
const inFlight = new Map<string, Promise<OEmbedPayload | null>>();

function remember(key: string, payload: OEmbedPayload) {
  cache.delete(key);
  cache.set(key, payload);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Seed the cache with server-resolved payloads (SSR hand-off). */
export function primeOEmbedCache(seed: {
  theme: string;
  width: number;
  oembed: Record<string, OEmbedPayload>;
}): void {
  for (const [url, payload] of Object.entries(seed.oembed)) {
    const key = oembedKey(url, seed.theme, seed.width);
    if (!cache.has(key)) remember(key, payload);
  }
}

export function oembedKey(url: string, theme: string, width: number) {
  return `${url}::${theme}::${width}`;
}

export function cachedOEmbed(key: string): OEmbedPayload | null {
  return cache.get(key) ?? null;
}

export function fetchOEmbed(
  url: string,
  theme: "dark" | "light",
  width: number,
): Promise<OEmbedPayload | null> {
  const key = oembedKey(url, theme, width);
  const hit = cache.get(key);
  if (hit !== undefined) return Promise.resolve(hit);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = fetch(
    `/api/bridge/oembed?url=${encodeURIComponent(url)}&theme=${theme}&w=${width}`,
    { headers: { Accept: "application/json" } },
  )
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json()) as Partial<OEmbedPayload>;
      if (typeof body.html !== "string") return null;
      const payload: OEmbedPayload = {
        html: body.html,
        author_name: body.author_name ?? null,
        author_url: body.author_url ?? null,
        text_html: body.text_html ?? null,
        lang: body.lang ?? null,
        dir: body.dir ?? null,
        permalink: body.permalink ?? null,
        date_text: body.date_text ?? null,
      };
      remember(key, payload);
      return payload;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}
