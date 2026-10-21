"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// The wire's scroll model, mirroring X's timeline.
//
//   1. Parked at top   — live. New posts flow straight in. Bottom fades
//                        (there is more below); top does not (nothing above).
//   2. Scrolled        — the feed FREEZES. Arriving posts are held back so the
//                        reader's position never jumps, and a pill offers them.
//                        Both edges fade.
//   3. At the bottom   — still frozen, but the bottom fade lifts: the reader
//                        can see they have reached the end of the tape.
//
// Freezing is driven from the scroll event, not an effect, so the held set is
// captured at the exact moment the reader leaves the top.
// ---------------------------------------------------------------------------

const EDGE_PX = 8;

export interface FeedScroll {
  atTop: boolean;
  atBottom: boolean;
  /** Ids frozen in place while scrolled; null means the feed is live. */
  heldIds: ReadonlySet<string> | null;
  /** Freeze now with this id set (called as posts are first rendered). */
  capture: (ids: string[]) => void;
  /** Scroll back to the top and let the held posts in. */
  release: () => void;
}

export function useFeedScroll(
  ref: React.RefObject<HTMLOListElement | null>,
): FeedScroll {
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [heldIds, setHeldIds] = useState<ReadonlySet<string> | null>(null);
  // Mirrors the rendered ids so a freeze can snapshot without a render pass.
  const visibleIds = useRef<string[]>([]);

  const capture = useCallback((ids: string[]) => {
    visibleIds.current = ids;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;

    const read = () => {
      const top = el.scrollTop <= EDGE_PX;
      const bottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - EDGE_PX;
      setAtTop(top);
      setAtBottom(bottom);
      // Leaving the top freezes the list; returning to it thaws.
      setHeldIds((prev) => {
        if (!top && prev === null) return new Set(visibleIds.current);
        if (top && prev !== null) return null;
        return prev;
      });
    };

    read();
    el.addEventListener("scroll", read, { passive: true });
    // The column's own height changes as posts land; re-evaluate the edges so
    // the bottom fade is right even when the reader hasn't moved.
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, [ref]);

  const release = useCallback(() => {
    const el = ref.current;
    if (el === null) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
    // Thaw immediately: the held posts animate in at the top while the scroll
    // is still travelling, which is what makes the motion read as one gesture.
    setHeldIds(null);
  }, [ref]);

  return { atTop, atBottom, heldIds, capture, release };
}

/**
 * Mask for the three states: fade an edge only when there is tape past it.
 */
export function feedMask(
  atTop: boolean,
  atBottom: boolean,
): string | undefined {
  const top = atTop ? null : "transparent 0, black 56px";
  const bottom = atBottom ? null : "black calc(100% - 56px), transparent 100%";
  if (top === null && bottom === null) return undefined;
  return `linear-gradient(to bottom, ${[top ?? "black 0", bottom ?? "black 100%"].join(", ")})`;
}
