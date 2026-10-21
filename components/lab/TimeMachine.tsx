"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSim } from "@/lib/sim/store";
import type { Asset, SignalEvent } from "@/lib/sim/types";
import { simEngine } from "@/lib/sim/engine";
import { useNow } from "@/lib/use-now";
import { fmtCount } from "@/lib/format";
import { BasketPanel } from "./BasketPanel";
import { PostCardBody, type ProcStage } from "./PostCard";
import type { BasketApi } from "./GlassBasket";
import styles from "./time-machine.module.css";

// The basket cycle runs open (last rebalance) to close (next), a 24h window.
function fmtUtc(ts: number): string {
  const d = new Date(ts);
  const mon = d
    .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${d.getUTCDate()}, ${hh}:${mm} UTC`;
}

// How many cards the stack holds. One extra renders fully transparent at the
// back so the oldest card fades out instead of vanishing.
const DEPTH = 6;

// Per-step recession: older cards slide straight up, shrink toward the
// bottom-center anchor, and melt into the page. Depth reads as atmosphere:
// cards stay opaque, but a page-color scrim thickens with distance until the
// oldest card is almost one with the background.
//
// Every card is the same fixed height — sized for three lines of post text,
// so a full-length (~140 char) tweet reads as one — and the step is sized so a
// receding card peeks its header strip (name and View pill), pulled 5px
// tighter than the full strip; the height that saves is spent as breathing
// room between the stack and the timeline below it.
const CARD_H = 197;
const STEP_Y = -57;
const STEP_SCALE = 0.09;
const STEP_FADE = 0.12;

// The toss: how long a non-signal verdict stays readable before the card
// flies, how long the flight lasts, and how much of the flight's tail end
// carries the fade (the card stays visible for the first part of the throw).
const TOSS_HOLD_MS = 1100;
const TOSS_MS = 800;
const TOSS_FADE_MS = 300;

// The front sequence: every tweet is Processing, then Signal received. Only a
// tweet that carries a call goes on to Weighing analyst score before its
// verdict lands — a non-call resolves straight to No call, because the score
// is never weighed on a tweet that made no call.
const PROC_MS = 1400;
const RECEIVED_MS = 900;
const WEIGH_MS = 1500;
const RESULT_MS = 2200;

// The line queues up to this many tweets during bursts before dropping.
const MAX_BACKLOG = 40;

// The scrub: wheel travel per card step, and how far back the wheel can go
// into the tape (the period is TBD; the tape itself holds 24h).
const SCRUB_NOTCH = 100;
const SCRUB_MAX = 200;

// Deeper gaps tighten slightly: a scaled-down card reveals more per pixel of
// travel, so the step shrinks to keep the peek at the header strip.
function recede(i: number): number {
  return i * STEP_Y + i * i * 1.3;
}

// The card mimics an X post, so it keeps X's own surface palette regardless
// of the page world: white paper, near-black ink, X grays and verified blue.

/**
 * Time Machine: the wire as a processing line with depth. Tweets from the sim
 * swap surface join the back (top, small), march forward, and reach the front
 * (bottom, full size) where the oldest sits classified. Each fresh arrival
 * advances the line and the front exits — noise flicked left, a signal
 * bubbled right into the basket.
 */
export function TimeMachine({
  theme = "cobalt",
}: { theme?: import("./glass-palette").GlassTheme } = {}) {
  const sim = useSim();
  const cold = !sim.booted;

  const byId = useMemo(
    () => new Map(sim.analysts.map((a) => [a.id, a])),
    [sim.analysts],
  );

  // Run the wire at broadcast tempo here: a heavier share of accepted buy/sell
  // calls (~38% vs the editorial 22%) so more signals bubble into the basket.
  // Resets to editorial when this experiment unmounts, so "/" stays calm.
  const liveMode = sim.mode === "live";
  useEffect(() => {
    if (liveMode) return;
    simEngine.setTempo("broadcast");
    return () => simEngine.setTempo("editorial");
  }, [liveMode]);

  // The conveyor: a managed processing line. Tweets march front-first (the
  // front card is the oldest, being classified); a fresh tweet joins the
  // back and advances the line, and the front exits — noise flicked left,
  // signals bubbled right into the basket. tossing/bubbling flag the two exits.
  const [line, setLine] = useState<string[]>([]); // front (oldest) -> back (newest)
  const [tossing, setTossing] = useState<ReadonlySet<string>>(new Set());
  const [bubbling, setBubbling] = useState<ReadonlySet<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const sceneRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  // The basket panel hands its imperative api up so a landing call can
  // locate its bubble on screen and knock it.
  const basketApiRef = useRef<BasketApi | null>(null);
  const basketBoxRef = useRef<HTMLDivElement>(null);
  // Tickers a call created that the sim's basket doesn't already carry — added
  // as light bubbles so the call has somewhere to land.
  const [extraAssets, setExtraAssets] = useState<Asset[]>([]);
  const basketAssets = useMemo(
    () => (extraAssets.length ? [...sim.assets, ...extraAssets] : sim.assets),
    [sim.assets, extraAssets],
  );
  const addExtra = (ticker: string) =>
    setExtraAssets((prev) =>
      prev.some((a) => a.ticker === ticker)
        ? prev
        : [
            ...prev,
            {
              ticker,
              name: ticker,
              sector: "—",
              price: null,
              priceChange24hPct: null,
              weight: 0.006,
              targetWeight: 0.006,
              dayMove: null,
              supporters: [],
              opponents: [],
            },
          ],
    );
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  // The scrub: the mouse wheel over the stack travels the tape. Scrolling
  // down steps into the past one card at a time; scrolling up returns
  // toward live. The position is anchored to an event id, not an index, so
  // new arrivals pile up in the future without shifting the view.
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<SignalEvent[]>([]);
  const wheelAcc = useRef(0);

  const tape: SignalEvent[] = useMemo(() => {
    return sim.inFlight ? [sim.inFlight, ...sim.events] : sim.events;
  }, [sim.inFlight, sim.events]);

  const signals: SignalEvent[] = useMemo(
    () => tape.filter((e) => e.verdict?.kind === "used"),
    [tape],
  );
  // A card in the line is at most ~DEPTH back, always inside the tape window,
  // so the tape itself is a sufficient id lookup.
  const tapeById = useMemo(() => new Map(tape.map((e) => [e.id, e])), [tape]);
  useEffect(() => {
    tapeRef.current = signals;
  }, [signals]);

  const anchorIdx = anchorId ? signals.findIndex((e) => e.id === anchorId) : -1;
  const scrubbing = anchorIdx >= 0;

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const step = (dir: 1 | -1) => {
      setAnchorId((cur) => {
        const t = tapeRef.current;
        // -1 is live; 0..n scrub through the signal ledger.
        const idx = cur ? t.findIndex((e) => e.id === cur) : -1;
        const next = Math.min(
          Math.max(idx + dir, -1),
          Math.min(t.length - 1, SCRUB_MAX),
        );
        return next < 0 ? null : (t[next]?.id ?? null);
      });
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAcc.current += e.deltaY;
      while (wheelAcc.current >= SCRUB_NOTCH) {
        wheelAcc.current -= SCRUB_NOTCH;
        step(1);
      }
      while (wheelAcc.current <= -SCRUB_NOTCH) {
        wheelAcc.current += SCRUB_NOTCH;
        step(-1);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cold]);

  const removeFromLine = (id: string) =>
    setLine((prev) => prev.filter((x) => x !== id));

  // The card flight: a clone of the front tweet swipes straight off the pile
  // sideways — right if its call's bubble sits to the right, left otherwise —
  // level, upright, easing out as it shrinks a touch and fades; onImpact
  // knocks that bubble like water as the card clears, onDone frees the line
  // slot. No rotation and no vertical travel. Falls back to a plain settle if
  // the card or a target can't be found (or reduced motion).
  const flyCard = (
    ev: SignalEvent,
    rect: { left: number; top: number; width: number; height: number } | null,
    onImpact: () => void,
    onDone: () => void,
  ) => {
    const root = sceneRef.current;
    const cardEl = root?.querySelector<HTMLElement>(
      `[data-tm-card="${ev.id}"]`,
    );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!root || !cardEl || !rect || reduced) {
      onImpact();
      onDone();
      return;
    }

    const rootBox = root.getBoundingClientRect();
    const cardBox = cardEl.getBoundingClientRect();
    const ghost = cardEl.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("data-tm-card");
    Object.assign(ghost.style, {
      position: "absolute",
      left: `${cardBox.left - rootBox.left}px`,
      top: `${cardBox.top - rootBox.top}px`,
      width: `${cardBox.width}px`,
      height: `${cardBox.height}px`,
      margin: "0",
      opacity: "1",
      // Above every card and basket label, but UNDER the invest surface
      // (z-40) so a flying post never crosses the expanded swap panel.
      zIndex: "30",
      pointerEvents: "none",
      transformOrigin: "50% 50%",
      transition: "none",
      willChange: "transform, opacity",
    });
    root.appendChild(ghost);

    // Sideways only: the bubble decides the direction, not the path.
    const cx0 = cardBox.left + cardBox.width / 2 - rootBox.left;
    const tx = rect.left + rect.width / 2 - rootBox.left;
    const dir = tx - cx0 >= 0 ? 1 : -1;
    const travel = dir * (cardBox.width * 1.15 + 80);

    const DUR = 640;
    const flight = ghost.animate(
      [
        { transform: "translateX(0px) scale(1)", opacity: 1, offset: 0 },
        // Well clear of the pile, still whole: the swipe reads before the fade.
        {
          transform: `translateX(${travel * 0.6}px) scale(0.96)`,
          opacity: 1,
          offset: 0.5,
        },
        {
          transform: `translateX(${travel}px) scale(0.86)`,
          opacity: 0,
          offset: 1,
        },
      ],
      {
        duration: DUR,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    );
    // Knock the bubble just as the card arrives.
    timersRef.current.push(window.setTimeout(onImpact, DUR * 0.9));
    flight.onfinish = () => {
      ghost.remove();
      onDone();
    };
  };

  const clearBubbling = (id: string) =>
    setBubbling((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });

  // The front (oldest, classified) leaves the line. A call flies into its
  // basket bubble; a no-call, or anything with no landing target, flicks
  // left and is discarded.
  const exitFront = (id: string) => {
    const ev = tapeById.get(id);
    const ticker =
      ev && ev.verdict?.kind === "used" ? ev.verdict.ticker : undefined;
    const api = basketApiRef.current;

    // Calls land in EITHER chart — bubbles and treemap both expose the same
    // imperative api. Only a missing api (e.g. the WebGL-failed fallback)
    // discards a call like a no-call.
    if (ev && ticker && api) {
      setBubbling((s) => new Set(s).add(id));
      const land = () => {
        const rect =
          api.getBubbleRect(ticker) ??
          basketBoxRef.current?.getBoundingClientRect() ??
          null;
        flyCard(
          ev,
          rect,
          () => api.ripple(ticker),
          () => {
            removeFromLine(id);
            clearBubbling(id);
          },
        );
      };
      if (!api.hasBubble(ticker)) {
        // No bubble yet — add one, then let it pack before the card lands.
        addExtra(ticker);
        timersRef.current.push(window.setTimeout(land, 200));
      } else {
        land();
      }
      return;
    }

    setTossing((s) => new Set(s).add(id));
    timersRef.current.push(
      window.setTimeout(() => {
        removeFromLine(id);
        setTossing((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }, TOSS_MS + 40),
    );
  };

  // Ingest: new tweets join the BACK of the line (oldest-first). At boot the
  // line seeds from the most recent window so it starts full.
  useEffect(() => {
    if (scrubbing) return;
    const seen = seenRef.current;
    if (seen.size === 0 && tape.length) {
      const seed = tape.slice(0, DEPTH + 1).reverse(); // oldest -> newest
      seed.forEach((e) => seen.add(e.id));
      const ids = seed.map((e) => e.id);
      const t = window.setTimeout(() => setLine(ids), 0);
      return () => window.clearTimeout(t);
    }
    const fresh: string[] = [];
    for (const e of tape) {
      if (seen.has(e.id)) break;
      fresh.push(e.id);
    }
    if (fresh.length === 0) return;
    fresh.reverse();
    fresh.forEach((id) => seen.add(id));
    // Cap the backlog: extreme bursts queue up to MAX_BACKLOG, then drop.
    const t = window.setTimeout(
      () => setLine((prev) => [...prev, ...fresh].slice(0, MAX_BACKLOG)),
      0,
    );
    return () => window.clearTimeout(t);
  }, [tape, scrubbing]);

  // Process the front: each front tweet runs a visible sequence — Processing,
  // then Signal received, then (calls only) Weighing analyst score — before
  // the verdict is revealed and it exits (noise flicked left, signal bubbled
  // right) and the line advances. Non-calls skip the weighing beat entirely.
  const [procStage, setProcStage] = useState<ProcStage>("processing");
  const procIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (scrubbing) return;
    const frontId = line[0];
    if (!frontId) {
      procIdRef.current = null;
      return;
    }
    if (procIdRef.current === frontId) return;
    procIdRef.current = frontId;
    setProcStage("processing");
    const isCall = tapeById.get(frontId)?.verdict?.kind === "used";
    const revealAt = PROC_MS + RECEIVED_MS + (isCall ? WEIGH_MS : 0);
    timersRef.current.push(
      window.setTimeout(() => setProcStage("received"), PROC_MS),
      window.setTimeout(() => setProcStage("result"), revealAt),
      window.setTimeout(() => exitFront(frontId), revealAt + RESULT_MS),
    );
    if (isCall)
      timersRef.current.push(
        window.setTimeout(
          () => setProcStage("weighing"),
          PROC_MS + RECEIVED_MS,
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- line[0] drives it; exit helpers are stable
  }, [line, scrubbing]);

  const stack: SignalEvent[] = scrubbing
    ? signals.slice(anchorIdx, anchorIdx + DEPTH + 1)
    : line
        .slice(0, DEPTH + 1)
        .map((id) => tapeById.get(id))
        .filter((e): e is SignalEvent => Boolean(e));

  // The scrub anchor drives the timeline's position when browsing history.
  const front = stack[0];

  return (
    <section>
      {cold ? (
        <div className="plate h-[490px] animate-pulse" aria-hidden />
      ) : (
        <div ref={sceneRef} className="relative">
          {/* The scene's floor sizes the hero to ~80% of the viewport: 80dvh
              minus the fixed chrome around it (masthead, headline block, and
              the invest capsule's slot, ~320px together). The basket stretches
              into it, the cycle footer rides the bottom edge, the card stack
              keeps its size; on short viewports the column's intrinsic height
              is the true floor. */}
          <div className="flex min-h-[calc(80dvh-320px)] gap-10">
            {/* The left column: the card line with the cycle footer (metrics
                and the timeline ruler) attached beneath it, the whole group
                anchored to the top of the column — extra hero height falls
                below the group. */}
            <div className="mx-auto flex w-full max-w-[333px] flex-col sm:mx-0 sm:shrink-0">
              <div ref={stackRef} className="relative h-[401px] w-full">
                {stack.map((ev, i) => {
                  const analyst = byId.get(ev.analystId);
                  const gone = i >= DEPTH;
                  const tossed = tossing.has(ev.id);
                  const leaving = bubbling.has(ev.id);
                  const back = !scrubbing && i === stack.length - 1;
                  return (
                    <article
                      key={ev.id}
                      data-tm-card={ev.id}
                      className={`absolute inset-x-0 bottom-0 flex flex-col rounded-[20px] p-3.5 motion-reduce:transition-none ${
                        tossed
                          ? ""
                          : scrubbing
                            ? "transition-[transform,opacity] duration-300 ease-out"
                            : "transition-[transform,opacity] duration-700 ease-out"
                      } ${back && ev.stage === "posted" ? styles.enterBack : ""}`}
                      style={{
                        background: "#ffffff",
                        height: CARD_H,
                        zIndex: tossed || leaving ? DEPTH + 2 : DEPTH + 1 - i,
                        transformOrigin: "50% 100%",
                        // The flick: the negative-dip bezier pulls the card back
                        // for a beat (the wind-up), then whips it out with most
                        // of the travel in the last third. The fade waits for
                        // the whip.
                        transition: tossed
                          ? `transform ${TOSS_MS}ms cubic-bezier(0.6, -0.28, 0.9, 0.2), opacity ${TOSS_FADE_MS}ms ease-in ${TOSS_MS - TOSS_FADE_MS}ms`
                          : undefined,
                        transform: tossed
                          ? `translate(-360px, ${recede(i)}px) scale(${1 - i * STEP_SCALE})`
                          : `translateY(${recede(i)}px) scale(${1 - i * STEP_SCALE})`,
                        opacity: gone || tossed || leaving ? 0 : 1,
                        pointerEvents:
                          i === 0 && !tossed && !leaving ? "auto" : "none",
                        boxShadow:
                          i === 0
                            ? "0 24px 60px rgba(1, 18, 44, 0.3)"
                            : "0 10px 30px rgba(1, 18, 44, 0.16)",
                      }}
                    >
                      <PostCardBody
                        ev={ev}
                        analyst={analyst ?? null}
                        stage={
                          scrubbing
                            ? "result"
                            : i === 0
                              ? procStage
                              : "processing"
                        }
                      />
                      {/* The atmosphere: a page-color scrim over the whole card,
                      thickening with depth so the past sinks into the page. */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[20px] transition-opacity duration-700 ease-out motion-reduce:transition-none"
                        style={{
                          background: "var(--paper)",
                          opacity: Math.min(1, i * STEP_FADE),
                        }}
                      />
                    </article>
                  );
                })}
              </div>

              {/* Cycle footer: the metrics that frame this basket window, then
                  the ruler that places us within it — the timeline lives with
                  the cards it scrubs. */}
              <div className="mt-10 hidden sm:block">
                <div className="flex items-end justify-between gap-6">
                  <Metric
                    label="Tweets this cycle"
                    value={fmtCount(sim.stats.total24h)}
                  />
                  <Metric
                    label="Basket updated"
                    value={fmtUtc(sim.lastRebalanceTs)}
                    align="right"
                  />
                </div>
                <TimelineRail
                  openTs={sim.lastRebalanceTs}
                  closeTs={sim.nextRebalanceTs}
                  anchorTs={scrubbing ? (front?.ts ?? null) : null}
                  onLive={() => setAnchorId(null)}
                />
              </div>
            </div>
            {/* The basket: the signals' destination. Stretches to match the
                cards-plus-timeline column. */}
            <div ref={basketBoxRef} className="hidden min-w-0 flex-1 sm:block">
              <BasketPanel
                theme={theme}
                assets={basketAssets}
                analysts={sim.analysts}
                highlightTicker={sim.highlightTicker}
                apiRef={basketApiRef}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// A cycle metric: a small tracked label over its value.
function Metric({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className={`shrink-0 ${align === "right" ? "text-right" : ""}`}>
      <p className="text-ink-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
        {label}
      </p>
      <p
        className="text-ink mt-1 text-[0.95rem] font-bold tracking-tight tabular-nums"
        suppressHydrationWarning
      >
        {value}
      </p>
    </div>
  );
}

// The timeline: the basket cycle made legible. The line spans the 24h window
// left to right — the open timestamp sits under the left end, the close
// timestamp under the right. The dot rides ON the line at now (pulsing
// white). The wheel scrubs it back through the elapsed part (toward the
// left, amber); it can never move forward past now.
function TimelineRail({
  openTs,
  closeTs,
  anchorTs,
  onLive,
}: {
  openTs: number;
  closeTs: number;
  anchorTs: number | null; // null = live (at now)
  onLive: () => void;
}) {
  const now = useNow();
  const span = Math.max(1, closeTs - openTs);
  // Position from the LEFT edge (0 = open, 1 = close): elapsed fraction.
  const posOf = (ts: number) => Math.min(1, Math.max(0, (ts - openTs) / span));
  const nowMs = now ?? openTs;
  const livePos = posOf(nowMs);
  const live = anchorTs === null;
  // Scrubbing only reaches the elapsed past (left of the live dot).
  const dotPos = live ? livePos : Math.min(livePos, posOf(anchorTs));

  return (
    <div className="relative mt-5 h-11 max-sm:hidden" suppressHydrationWarning>
      {/* The baseline: one clean hairline spanning the window. */}
      <span
        aria-hidden
        className="absolute right-0 left-0 h-px"
        style={{ top: 12, background: "var(--hairline-strong)" }}
      />

      {/* The window's bounds: open under the left end, close under the right. */}
      <span
        aria-hidden
        className="absolute top-6 left-0 text-[0.6875rem] leading-none font-semibold tracking-[0.06em] uppercase"
        style={{ color: "var(--ink-muted)" }}
      >
        {fmtUtc(openTs)}
      </span>
      <span
        aria-hidden
        className="absolute top-6 right-0 text-[0.6875rem] leading-none font-semibold tracking-[0.06em] uppercase"
        style={{ color: "var(--ink-muted)" }}
      >
        {fmtUtc(closeTs)}
      </span>

      {/* The playhead: a dot ON the line at now (amber when scrubbing). */}
      <span
        aria-hidden
        className={`absolute h-2 w-2 -translate-x-1/2 rounded-full transition-[left,background-color] duration-300 ease-out motion-reduce:transition-none ${
          live ? "live-dot" : ""
        }`}
        style={{
          top: 8.5,
          left: `${dotPos * 100}%`,
          background: live ? "var(--wire-cobalt)" : "var(--pending-amber)",
        }}
      />
      {!live && (
        <button
          onClick={onLive}
          className="text-ink absolute top-6 left-1/2 -translate-x-1/2 text-[0.6875rem] font-semibold tracking-[0.08em] whitespace-nowrap uppercase underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          View live
        </button>
      )}
    </div>
  );
}
