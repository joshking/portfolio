import type { OEmbedPayload } from "@/lib/oembed";
import type { Author } from "@/lib/author";

/** Post data resolved during SSR and handed to the client to prime its caches. */
export interface PostCacheSeed {
  theme: "dark" | "light";
  width: number;
  /** Keyed by the post's permalink as the client will request it. */
  oembed: Record<string, OEmbedPayload>;
  /** Keyed by lowercased handle. */
  authors: Record<string, Author>;
}

// Client-side priming. Called during render (same shape as primeInitial) so
// the very first paint can render posts the server already resolved.
import { primeOEmbedCache } from "@/lib/oembed";
import { primeAuthorCache } from "@/lib/author";

export function primePostCache(seed: PostCacheSeed | null): void {
  if (!seed) return;
  primeOEmbedCache(seed);
  primeAuthorCache(seed.authors);
}
