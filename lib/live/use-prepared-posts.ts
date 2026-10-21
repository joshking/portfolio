"use client";

import { useEffect, useRef, useState } from "react";
import type { SignalEvent } from "@/lib/sim/types";
import { fetchOEmbed, cachedOEmbed, oembedKey } from "@/lib/oembed";
import { fetchAuthor } from "@/lib/author";

// ---------------------------------------------------------------------------
// Hold a post out of the feed until it is whole.
//
// The wire used to insert a row the instant its event arrived, then grow it
// three times as the pieces landed: blank → text → avatar → verdict. Every
// step shoved the rows below it down.
//
// So nothing enters the tape until its post data has SETTLED. "Settled" means
// resolved either way — a deleted post (oEmbed 404) still enters, showing its
// permalink fallback, because silently dropping it would be a lie about the
// feed's contents.
//
// After insertion a card changes exactly once more: ANALYZING… becomes its
// verdict. That is the only loading state a reader ever sees, and it swaps a
// chip in place rather than resizing the row.
//
// That ANALYZING beat is held deliberately for 100-1000ms (`analyzingUntil`).
// Live events arrive on the node's `classification.created` stream, i.e. only
// AFTER adjudication, so without this the state would never be seen at all.
// The step it depicts is real; only its timing on screen is ours. The delay is
// derived from the event id, so it is stable across re-renders.
// ---------------------------------------------------------------------------

/** Stable 100-1000ms from an event id — no Math.random, so no flicker on
 *  re-render and no SSR/client divergence. */
function analyzingMs(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return 100 + (Math.abs(hash) % 901);
}

export function usePreparedPosts(
  events: readonly SignalEvent[],
  theme: "dark" | "light",
  width: number,
  handleOf: (event: SignalEvent) => string | undefined,
): SignalEvent[] {
  // Both sets are STATE, not refs: they are read during render, and the repo
  // lints refs-during-render as an error (React Compiler rules).
  // Seeded from whatever the SSR hand-off already primed, so those posts are
  // rendered on the FIRST paint rather than after a client round trip.
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => {
    const ready = new Set<string>();
    for (const event of events) {
      if (!event.sourceUrl) continue;
      if (cachedOEmbed(oembedKey(event.sourceUrl, theme, width))) {
        ready.add(event.id);
      }
    }
    return ready;
  });
  const [analyzing, setAnalyzing] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  // Effect-only bookkeeping, so a ref is fine here.
  const started = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const pending = events.filter(
      (event) =>
        !started.current.has(event.id) &&
        event.sourceUrl &&
        // Server-primed posts need no fetch and no ANALYZING beat — they were
        // already on screen when the page painted.
        !cachedOEmbed(oembedKey(event.sourceUrl, theme, width)),
    );
    for (const event of events) {
      if (
        event.sourceUrl &&
        cachedOEmbed(oembedKey(event.sourceUrl, theme, width))
      ) {
        started.current.add(event.id);
      }
    }
    if (pending.length === 0) return;
    for (const event of pending) started.current.add(event.id);

    void Promise.all(
      pending.map(async (event) => {
        const handle = handleOf(event);
        await Promise.all([
          fetchOEmbed(event.sourceUrl as string, theme, width),
          // Author identity is part of "whole": the avatar and verified mark
          // are required attribution, and popping them in later is a shift.
          handle ? fetchAuthor(handle) : Promise.resolve(null),
        ]);
        return event.id;
      }),
    ).then((ids) => {
      if (!active) return;
      setSettled((prev) => new Set([...prev, ...ids]));
      setAnalyzing((prev) => new Set([...prev, ...ids]));
      // Each post clears its own ANALYZING beat, so a burst does not all snap
      // to its verdict on the same frame.
      for (const id of ids) {
        window.setTimeout(() => {
          if (!active) return;
          setAnalyzing((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, analyzingMs(id));
      }
    });

    return () => {
      active = false;
    };
  }, [events, theme, width, handleOf]);

  // Simulated posts (REPLAY) carry their own text and no permalink — there is
  // nothing to fetch, so they are ready on arrival. Live posts wait for their
  // real data. Events with neither are mid-enrichment and are held back rather
  // than shown as a stub.
  return events
    .filter((event) =>
      event.sourceUrl != null
        ? settled.has(event.id)
        : event.textStatus !== "resolving" && Boolean(event.text),
    )
    .map((event) =>
      analyzing.has(event.id)
        ? // Still in its ANALYZING beat: present it as not-yet-adjudicated so
          // the card shows the pulse, then swaps the real verdict in.
          { ...event, verdict: null }
        : event,
    );
}
