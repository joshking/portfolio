"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Real X embedded post (docs.x.com/x-for-websites/embedded-posts).
//
// widgets.js is loaded ONCE for the whole page and reused; each embed then
// calls twttr.widgets.load(el) to upgrade its own blockquote. Loading it per
// embed is what makes naive X-embed pages crawl.
//
// The oEmbed markup is cached module-level too, because the live wire mounts
// and unmounts the same cards as it churns — without this, scrolling the tape
// would refetch markup it already had.
// ---------------------------------------------------------------------------

interface Twttr {
  // load() resolves once the scanned fragment has been upgraded — that
  // resolution is what we gate reveal on.
  widgets: { load: (el?: HTMLElement) => Promise<unknown> };
}
declare global {
  interface Window {
    twttr?: Twttr;
  }
}

// CMS best practices name platform.x.com as the script host.
const WIDGETS_SRC = "https://platform.x.com/widgets.js";
let widgetsPromise: Promise<Twttr | null> | null = null;

function loadWidgets(): Promise<Twttr | null> {
  if (widgetsPromise) return widgetsPromise;
  widgetsPromise = new Promise<Twttr | null>((resolve) => {
    if (window.twttr?.widgets) return resolve(window.twttr);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGETS_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    const done = () => resolve(window.twttr ?? null);
    script.addEventListener("load", done, { once: true });
    // Network-blocked or ad-blocked: resolve null so callers fall back to the
    // permalink instead of hanging on a shimmer forever.
    script.addEventListener("error", () => resolve(null), { once: true });
    if (!existing) {
      script.src = WIDGETS_SRC;
      script.async = true;
      script.charset = "utf-8";
      document.head.appendChild(script);
    }
  });
  return widgetsPromise;
}

const markupCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

interface EmbedState {
  key: string;
  html: string | null;
  failed: boolean;
  /** True once widgets.js reports the post actually drawn. */
  drawn: boolean;
}

function freshState(key: string): EmbedState {
  return {
    key,
    html: markupCache.get(key) ?? null,
    failed: false,
    drawn: false,
  };
}

function fetchMarkup(url: string, theme: "dark" | "light", width: number) {
  const key = `${url}::${theme}::${width}`;
  const cached = markupCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);
  const pending = inFlight.get(key);
  if (pending) return pending;
  const request = fetch(
    `/api/bridge/oembed?url=${encodeURIComponent(url)}&theme=${theme}&w=${width}`,
    { headers: { Accept: "application/json" } },
  )
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json()) as { html?: unknown };
      if (typeof body.html !== "string") return null;
      markupCache.set(key, body.html);
      return body.html;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, request);
  return request;
}

/**
 * Compliant stand-in when the embed can't render (deleted, protected, blocked,
 * X unreachable).
 *
 * Deliberately shows NO post text. X's display requirements say post text "may
 * not be altered or modified", so our own stored copy could only be shown in
 * full with the complete attribution set (avatar + display name + @handle
 * linked to profile, permalink-linked timestamp, X logo, post actions, entity
 * links). A permalink is the honest minimum -- and it means a post deleted
 * upstream stops being readable here too.
 */
export function ViewOnX({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`inline-flex items-center gap-1 font-mono text-[0.72rem] tracking-[0.06em] underline-offset-2 hover:underline ${className}`}
    >
      VIEW ON X<span aria-hidden>↗</span>
    </a>
  );
}

/**
 * Renders the real X post via X's own widget, which satisfies the display
 * requirements by construction (attribution, timestamp, logo, post actions,
 * entity links) and stops rendering if the author deletes or protects it.
 * `fallback` covers the cases where it can't render.
 */
export function EmbeddedPost({
  url,
  theme,
  fallback,
  width = 220,
}: {
  url: string;
  theme: "dark" | "light";
  fallback: React.ReactNode;
  /** Target embed width; X clamps it to 220-550. */
  width?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const key = `${url}::${theme}::${width}`;
  // Keyed state, so switching post/theme resets to that key's cached markup
  // during render — no setState in an effect body to clear stale results.
  const [state, setState] = useState<EmbedState>(() => freshState(key));
  const current = state.key === key ? state : freshState(key);

  useEffect(() => {
    let active = true;
    fetchMarkup(url, theme, width).then((markup) => {
      if (!active) return;
      setState({
        key: `${url}::${theme}::${width}`,
        html: markup,
        failed: markup === null,
        drawn: false,
      });
    });
    return () => {
      active = false;
    };
  }, [url, theme, width]);

  const html = current.html;
  useEffect(() => {
    if (html === null || host.current === null) return;
    let active = true;
    loadWidgets().then((twttr) => {
      if (!active || host.current === null) return;
      if (twttr === null) {
        return setState((prev) => ({ ...prev, failed: true }));
      }
      // Scoped scan (CMS best practice: pass the fragment, don't re-scan the
      // whole document), and reveal only once it resolves.
      void twttr.widgets.load(host.current).then(() => {
        if (!active) return;
        setState((prev) => (prev.drawn ? prev : { ...prev, drawn: true }));
      });
    });
    return () => {
      active = false;
    };
  }, [html]);

  if (current.failed) return <>{fallback}</>;

  // Nothing at all until the post is actually drawn: the markup is mounted
  // off-screen (data-pending) so widgets.js can upgrade it, and the row only
  // takes space once it is final. No skeleton, no half-drawn frame.
  if (html === null) return null;

  return (
    <div
      ref={host}
      data-pending={current.drawn ? undefined : "true"}
      // No margin of its own: callers space it. The wire butts posts together
      // with zero gap, so built-in margin would break that.
      className="x-embed"
      // Trusted source: markup comes from X's own oEmbed endpoint via our
      // proxy, which rebuilds the URL and only ever reaches publish.x.com.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
