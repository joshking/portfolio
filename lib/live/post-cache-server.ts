import "server-only";

import type { OEmbedPayload } from "@/lib/oembed";
import type { Author } from "@/lib/author";
import { readAuthor, writeAuthor } from "./author-store";
import { analystRoster } from "./analyst-roster";

// ---------------------------------------------------------------------------
// Server-side post data, shared by the bridge routes AND the SSR boot.
//
// One cache for both paths matters: SSR warms it for the seeded wire, so the
// browser's own requests for those same posts are cache hits rather than a
// second round trip to X. Without this the first paint had a heading over an
// empty column for ~18s while the client fetched everything itself.
// ---------------------------------------------------------------------------

const OEMBED_FALLBACK_MS = 6 * 60 * 60 * 1000;
const OEMBED_MAX_MS = 24 * 60 * 60 * 1000;
const OEMBED_MAX_ENTRIES = 1_000;
const oembedCache = new Map<
  string,
  { at: number; ttl: number; value: OEmbedPayload }
>();

function rememberOEmbed(
  key: string,
  entry: { at: number; ttl: number; value: OEmbedPayload },
) {
  oembedCache.delete(key);
  oembedCache.set(key, entry);
  while (oembedCache.size > OEMBED_MAX_ENTRIES) {
    const oldest = oembedCache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    oembedCache.delete(oldest);
  }
}

const STATUS_PATH = /^\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,25})$/;
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/** Rebuild a canonical x.com permalink, or null if this is not one. */
export function canonicalPostUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "x.com" && host !== "twitter.com") return null;
  const match = STATUS_PATH.exec(parsed.pathname);
  if (match === null) return null;
  return `https://x.com/${match[1]}/status/${match[2]}`;
}

export function oembedCacheKey(url: string, theme: string, width: number) {
  return `${url}::${theme}::${width}`;
}

const LINK_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "t.co",
  "pbs.twimg.com",
]);

function safeHref(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.replace(/&amp;/g, "&"));
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!LINK_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  return parsed.href;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Allowlist sanitizer for the <p> body that lands in dangerouslySetInnerHTML.
 * Keeps the TEXT exactly as X encoded it (display requirements forbid touching
 * it) and only three pieces of markup: <br>, <a href="https://x.com|twitter.com|
 * t.co|pbs.twimg.com/…"> and its </a>. Every other tag and every other
 * attribute is dropped. This removes markup only, never characters of text.
 */
export function sanitizeCompactHtml(inner: string): string {
  let out = "";
  let openAnchors = 0;
  // Quote-aware: a raw ">" inside an attribute value must not end the tag,
  // or the tail leaks into visible text.
  const tag = /<\/?[A-Za-z](?:"[^"]*"|'[^']*'|[^'">])*>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(inner)) !== null) {
    out += inner.slice(last, match.index).replace(/</g, "&lt;");
    last = match.index + match[0].length;
    const token = match[0];
    if (/^<br\b/i.test(token)) {
      out += "<br>";
      continue;
    }
    if (/^<a\b/i.test(token)) {
      const href = /\bhref\s*=\s*"([^"]*)"/i.exec(token);
      const safe = href ? safeHref(href[1]) : null;
      if (safe === null) continue;
      out += `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">`;
      openAnchors += 1;
      continue;
    }
    if (/^<\/a\b/i.test(token) && openAnchors > 0) {
      out += "</a>";
      openAnchors -= 1;
    }
    // Anything else: dropped.
  }
  out += inner.slice(last).replace(/</g, "&lt;");
  while (openAnchors > 0) {
    out += "</a>";
    openAnchors -= 1;
  }
  return out;
}

/**
 * Pull the pieces a compact renderer needs out of X's own oEmbed markup.
 * The <p> text passes through UNMODIFIED, which is what the display
 * requirements demand; only its markup is reduced to the allowlist above.
 */
function parseCompact(html: string) {
  const para = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  const lang = /<p[^>]*\blang="([A-Za-z-]{2,12})"/i.exec(html);
  const dir = /<p[^>]*\bdir="(ltr|rtl)"/i.exec(html);
  const anchors = [
    ...html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
  ];
  const last = anchors.at(-1);
  return {
    text_html: para ? sanitizeCompactHtml(para[1]) : null,
    lang: lang ? lang[1] : null,
    dir: dir ? dir[1] : null,
    permalink: last ? canonicalPostUrl(last[1].replace(/&amp;/g, "&")) : null,
    date_text: last ? last[2].replace(/<[^>]+>/g, "").trim() : null,
  };
}

export function cachedOEmbedServer(key: string): OEmbedPayload | null {
  const hit = oembedCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value;
  return null;
}

export async function loadOEmbed(
  rawUrl: string,
  theme: "dark" | "light",
  width: number,
  signal?: AbortSignal,
): Promise<OEmbedPayload | null> {
  const url = canonicalPostUrl(rawUrl);
  if (url === null) return null;
  const key = oembedCacheKey(url, theme, width);
  const hit = cachedOEmbedServer(key);
  if (hit) return hit;

  // Smallest compliant footprint: display requirements forbid altering post
  // text, so the levers are media, thread context and width. dnt + omit_script
  // are pinned so no caller can drop them.
  const endpoint = new URL("https://publish.x.com/oembed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("theme", theme);
  endpoint.searchParams.set("omit_script", "true");
  endpoint.searchParams.set("hide_thread", "true");
  endpoint.searchParams.set("hide_media", "true");
  endpoint.searchParams.set("dnt", "true");
  endpoint.searchParams.set("maxwidth", String(width));

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: signal ?? AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      html?: unknown;
      author_name?: unknown;
      author_url?: unknown;
      cache_age?: unknown;
    };
    if (typeof body.html !== "string") return null;
    const value: OEmbedPayload = {
      html: body.html,
      author_name:
        typeof body.author_name === "string" ? body.author_name : null,
      author_url:
        typeof body.author_url === "string" ? safeHref(body.author_url) : null,
      ...parseCompact(body.html),
    };
    // Honour the lifetime X advertises (CMS best practices), bounded so a long
    // age can't pin a deleted post in memory.
    const advertised = Number(body.cache_age);
    const ttl = Number.isFinite(advertised)
      ? Math.min(OEMBED_MAX_MS, Math.max(60_000, advertised * 1000))
      : OEMBED_FALLBACK_MS;
    rememberOEmbed(key, { at: Date.now(), ttl, value });
    return value;
  } catch {
    return null;
  }
}

/**
 * Author identity, at most ONE metered call per analyst per 24h.
 *
 * The store is on disk, so restarts do not re-buy what we already have, and
 * negative results are remembered too — a suspended or renamed analyst must
 * not be retried on every render.
 *
 * Guards in front of the metered call:
 *   • single-flight: concurrent requests for one uncached handle share one call
 *   • roster allowlist: only handles the node currently tracks may trigger a
 *     call; unknown handle ⇒ null, no call, no cache write. Roster unavailable
 *     (bridge down) ⇒ fail closed, no call.
 *   • rename check: if the provider returns a different userName than we
 *     asked for, the handle has moved — cache a negative for the requested
 *     handle and never attribute one handle's avatar to another.
 */
const authorInFlight = new Map<string, Promise<Author | null>>();

export async function loadAuthor(
  handle: string,
  signal?: AbortSignal,
): Promise<Author | null> {
  if (!HANDLE_RE.test(handle)) return null;
  const cached = await readAuthor(handle);
  if (cached !== undefined) return cached;

  const key = handle.toLowerCase();
  const pending = authorInFlight.get(key);
  if (pending) return pending;
  const request = fetchAuthorUpstream(handle, signal).finally(() => {
    authorInFlight.delete(key);
  });
  authorInFlight.set(key, request);
  return request;
}

async function fetchAuthorUpstream(
  handle: string,
  signal?: AbortSignal,
): Promise<Author | null> {
  const apiKey = process.env.TWITTERAPI_IO_API_KEY;
  const base =
    process.env.TWITTERAPI_IO_BASE_URL ?? "https://api.twitterapi.io";
  // Unconfigured on purpose (metered API disabled) — no call, no cache write.
  if (!apiKey) return null;

  const roster = await analystRoster();
  if (roster === null || !roster.has(handle.toLowerCase())) return null;

  try {
    const res = await fetch(
      `${base.replace(/\/+$/, "")}/twitter/user/info?userName=${encodeURIComponent(handle)}`,
      {
        headers: { "X-API-Key": apiKey, Accept: "application/json" },
        signal: signal ?? AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (res.status === 404) {
      await writeAuthor(handle, null);
      return null;
    }
    // 401/429/5xx are OUR problem (key, quota, outage), not the analyst's —
    // never remember them as a 24h negative.
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Record<string, unknown> };
    const user = body.data;
    if (!user || typeof user !== "object") {
      await writeAuthor(handle, null);
      return null;
    }
    const returnedHandle =
      typeof user.userName === "string" ? user.userName : handle;
    if (returnedHandle.toLowerCase() !== handle.toLowerCase()) {
      // Provider answered for a different handle than asked — refuse to
      // attribute it. NOTE: a lookup by handle always returns the handle's
      // CURRENT owner, so a reassigned handle is NOT caught here; only the
      // node roster (and, later, id-keying) can catch that.
      await writeAuthor(handle, null);
      return null;
    }
    const value: Author = {
      id: typeof user.id === "string" ? user.id : null,
      name: typeof user.name === "string" ? user.name : null,
      handle: returnedHandle,
      avatarUrl:
        typeof user.profilePicture === "string" ? user.profilePicture : null,
      verified: user.isBlueVerified === true || user.isVerified === true,
    };
    await writeAuthor(handle, value);
    return value;
  } catch {
    return null;
  }
}
