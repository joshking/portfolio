"use client";

import { useEffect, useRef, useState } from "react";
import type { Analyst, SignalEvent } from "@/lib/sim/types";
import { PostCardBody } from "./PostCard";

// The post deck: one card in front, the rest stacked behind it as offset
// plates — the newer ones peeking above, the older ones below — so the piles
// themselves say there is more to see. The wheel steps the deck one card at a
// time: down goes back in time, up returns toward the newest. At the newest
// post nothing sits above the card; at the oldest nothing sits below. The
// deck's top edge never moves: as passed cards pile above, the front card
// steps down to make room, so the stack grows toward the page foot. The deck
// is fixed-height like the front page's line, so every card shares one
// footprint and the shuffle is a pure transform.

const CARD_H = 197;
// Asymmetric steps: the pile of passed posts above sits tight, so the card
// in front stays near the top as you turn; the pile of posts to come below
// fans wider, since that is where the space is.
const STEP_UP = 8; // px each plate above peeks past the next
const STEP_DOWN = 18; // px each plate below peeks past the next
const SCALE_STEP = 0.009; // barely there: the pile reads as depth, not as a taper
const VISIBLE_UP = 3; // plates shown above before the pile stops
const VISIBLE_DOWN = 9; // plates shown below before the pile stops
const WHEEL_PER_CARD = 100; // px of wheel travel per card — one mouse notch
const WHEEL_IDLE_MS = 160; // a pause this long forgets partial travel
// The shuffle runs quicker the more cards a single wheel event turns, so a
// fast flick fans through the deck instead of queueing slow shuffles.
const SHUFFLE_MS = [260, 260, 190, 140, 110];

export function PostDeck({
  events,
  analyst,
  analystOf,
  onFrontChange,
  className,
  style,
}: {
  events: SignalEvent[];
  analyst: Analyst | null;
  /** Per-card author, for a deck that mixes accounts; wins over `analyst`. */
  analystOf?: (ev: SignalEvent) => Analyst | null;
  /** Fires with the card in front whenever the deck turns. */
  onFrontChange?: (ev: SignalEvent | null) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [index, setIndex] = useState(0);
  const [shuffleMs, setShuffleMs] = useState(SHUFFLE_MS[1]);
  const ref = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const accRef = useRef(0);
  const lastWheelRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Newer posts arrive at the head of the list; if the deck is turned to an
  // older card, hold that card rather than sliding it under.
  const lastCount = useRef(events.length);
  useEffect(() => {
    if (events.length < lastCount.current)
      setIndex((i) => Math.min(i, Math.max(0, events.length - 1)));
    lastCount.current = events.length;
  }, [events.length]);

  // Native wheel listener: React's is passive, and the deck must swallow the
  // wheel while it can still turn, then hand it back to the page at either end.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dir = Math.sign(e.deltaY);
      const i = indexRef.current;
      const last = events.length - 1;
      const atEnd = (dir > 0 && i >= last) || (dir < 0 && i <= 0);
      if (atEnd || dir === 0) return; // let the page take it
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelRef.current > WHEEL_IDLE_MS) accRef.current = 0;
      lastWheelRef.current = now;
      accRef.current += e.deltaY;
      // Speed sets traversal: travel turns cards in proportion, so a hard
      // flick jumps several at once and a slow roll turns them one by one.
      const steps = Math.trunc(accRef.current / WHEEL_PER_CARD);
      if (steps === 0) return;
      accRef.current -= steps * WHEEL_PER_CARD;
      const next = Math.min(last, Math.max(0, i + steps));
      setShuffleMs(
        SHUFFLE_MS[Math.min(Math.abs(next - i), SHUFFLE_MS.length - 1)],
      );
      setIndex(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [events.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const last = events.length - 1;
    setShuffleMs(SHUFFLE_MS[1]);
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowRight" ||
      e.key === "PageDown"
    ) {
      e.preventDefault();
      setIndex((i) => Math.min(last, i + 1));
    } else if (
      e.key === "ArrowUp" ||
      e.key === "ArrowLeft" ||
      e.key === "PageUp"
    ) {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(last);
    }
  };

  useEffect(() => {
    onFrontChange?.(events[index] ?? null);
  }, [events, index, onFrontChange]);

  // Passed cards pile above; the front card steps down to make room for them,
  // so the deck's top edge stays put and the stack grows downward.
  const above = Math.min(index, VISIBLE_UP) * STEP_UP;
  const front = events[index];

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-roledescription="post deck"
      aria-label={
        front
          ? `Post ${index + 1} of ${events.length}. Scroll or use arrow keys to move through the posts.`
          : "No posts"
      }
      onKeyDown={onKeyDown}
      className={`focus-visible:outline-cobalt relative rounded-[24px] focus-visible:outline-2 focus-visible:outline-offset-4 ${className ?? ""}`}
      style={{
        ...style,
        height: CARD_H + VISIBLE_UP * STEP_UP + VISIBLE_DOWN * STEP_DOWN,
      }}
    >
      {events.map((ev, i) => {
        const k = i - index; // <0 newer (above), 0 front, >0 older (below)
        const cap = k < 0 ? VISIBLE_UP : VISIBLE_DOWN;
        const depth = Math.min(Math.abs(k), cap + 1);
        const hidden = Math.abs(k) > cap;
        const isFront = k === 0;
        return (
          <article
            key={ev.id}
            aria-hidden={!isFront}
            className="absolute inset-x-0 flex flex-col rounded-[20px] bg-white p-3.5 transition-[transform,opacity,box-shadow] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
            style={{
              top: 0,
              height: CARD_H,
              transitionDuration: `${shuffleMs}ms`,
              zIndex: events.length - depth,
              transform: `translateY(${above + Math.sign(k) * depth * (k < 0 ? STEP_UP : STEP_DOWN)}px) scale(${1 - depth * SCALE_STEP})`,
              transformOrigin:
                k < 0 ? "50% 0%" : k > 0 ? "50% 100%" : "50% 50%",
              opacity: hidden ? 0 : 1,
              pointerEvents: isFront ? "auto" : "none",
              boxShadow: isFront
                ? "0 24px 60px rgba(1, 18, 44, 0.18)"
                : "0 6px 24px rgba(1, 18, 44, 0.08)",
            }}
          >
            {/* Buried cards are blank plates: their edges are the guide, their
                copy would only ghost through the card in front. */}
            <div
              className="flex min-h-0 flex-1 flex-col transition-opacity ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
              style={{
                opacity: isFront ? 1 : 0,
                transitionDuration: `${Math.round(shuffleMs * 0.75)}ms`,
              }}
            >
              <PostCardBody
                ev={ev}
                analyst={analystOf ? analystOf(ev) : analyst}
                stage={ev.stage === "classified" ? "result" : "processing"}
                showDelta
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
