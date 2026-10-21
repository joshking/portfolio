"use client";

import Link from "@/components/motion-link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSim } from "@/lib/sim/store";
import { simEngine } from "@/lib/sim/engine";
import { primeInitial } from "@/lib/data-source";
import { primePostCache } from "@/lib/post-cache";
import type { PostCacheSeed } from "@/lib/post-cache";
import type { SignalEvent, SimState } from "@/lib/sim/types";
import { fmtCount, fmtPct, fmtSigned, fmtSignedPp } from "@/lib/format";
import { Masthead } from "@/components/briefing/Masthead";
import { DriftSection } from "@/components/briefing/DriftSection";
import { PerformanceExhibit } from "@/components/briefing/PerformanceExhibit";
import { ClosingCta } from "@/components/briefing/ClosingCta";
import { BasketCanvas } from "./BasketCanvas";
import { Chyron } from "./Chyron";
import { LowerThird } from "./LowerThird";
import { TypedHeadline } from "./TypedHeadline";
import { usePreparedPosts } from "@/lib/live/use-prepared-posts";
import { useFeedScroll, feedMask } from "@/lib/live/use-feed-scroll";
import { NewPostsPill } from "./NewPostsPill";
import { PostStyleSwitch, usePostStyle, setPostStyle } from "./PostStyleSwitch";
import { usePtTheme } from "./ThemeSwitch";
import { SourceSwitch } from "./SourceSwitch";
import styles from "./primetime.module.css";

// The wire holds a deep tape: the column scrolls internally, so depth costs
// nothing vertically. Compact rows are plain DOM (no iframes), and oEmbed
// lookups are cached + deduped server-side, so 50 is comfortable.
const ON_AIR_CARDS = 50;

function formatDataDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The studio floor framed by the original site's editorial chrome: real
 *  masthead on top, the hero claim where the scoreboard used to shout, and
 *  the verdict wire docking to the top of the viewport once the reader has
 *  scrolled halfway through the basket floor. */
export function PrimeTimeStudio({
  initial = null,
  posts = null,
}: {
  initial?: SimState | null;
  /** Post data the server already resolved — primed before first render so
   *  the wire is IN the first paint instead of arriving seconds later. */
  posts?: PostCacheSeed | null;
} = {}) {
  // SSR priming must land before the store hook first reads state.
  // Server modules survive across requests. Passing null is intentional: a
  // bridge miss must clear a prior request's live SSR snapshot.
  primeInitial(initial);
  primePostCache(posts);
  const sim = useSim();
  const cold = !sim.booted;
  const liveMode = sim.mode === "live";

  // REPLAY on this page runs the sim at broadcast tempo — the demo should
  // feel like a heavy live day, not the editorial page's calm cadence.
  // "/" always stays editorial (tempo resets when this page unmounts).
  useEffect(() => {
    if (liveMode) return;
    simEngine.setTempo("broadcast");
    return () => simEngine.setTempo("editorial");
  }, [liveMode]);

  // Daylight only — feeds the canvas palette and the embed theme.
  const theme = usePtTheme();
  const postStyle = usePostStyle();

  // Bubble under the cursor — lights up its matching lower thirds.
  const [hoverTicker, setHoverTicker] = useState<string | null>(null);

  // The wire docks to the top of the viewport once the reader has scrolled
  // halfway through the basket floor — a 1px sentinel sits at the floor's
  // midpoint; when it crosses above the masthead line the wire slides in.
  const floorMidRef = useRef<HTMLSpanElement | null>(null);
  const [wireDocked, setWireDocked] = useState(false);
  useEffect(() => {
    const el = floorMidRef.current;
    if (el === null) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Root = everything below the masthead line (56px), extended far
        // past the viewport bottom: "intersecting" therefore means "the
        // midpoint has NOT yet been scrolled past". The two states cleanly
        // partition the page, so even instant jumps (anchor links) fire a
        // transition — a viewport-only root would swallow them. Batched
        // records arrive oldest-first; only the LAST one is current.
        setWireDocked(!entries[entries.length - 1].isIntersecting);
      },
      { rootMargin: "-56px 0px 100000px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const byId = useMemo(
    () => new Map(sim.analysts.map((a) => [a.id, a])),
    [sim.analysts],
  );
  const onAir: SignalEvent[] = useMemo(() => {
    const list = sim.inFlight ? [sim.inFlight, ...sim.events] : sim.events;
    return list.slice(0, ON_AIR_CARDS);
  }, [sim.inFlight, sim.events]);
  const handleOf = useCallback(
    (event: SignalEvent) => byId.get(event.analystId)?.handle,
    [byId],
  );
  // Rows enter only once their post is whole — see usePreparedPosts.
  const onAirReady = usePreparedPosts(
    onAir,
    theme === "daylight" ? "light" : "dark",
    320,
    handleOf,
  );
  // Scroll state owns whether arrivals flow in or wait behind the pill.
  const wireRef = useRef<HTMLOListElement | null>(null);
  const feed = useFeedScroll(wireRef);
  const shown = feed.heldIds
    ? onAirReady.filter((ev) => feed.heldIds?.has(ev.id))
    : onAirReady;
  const waiting = feed.heldIds
    ? onAirReady.filter((ev) => !feed.heldIds?.has(ev.id))
    : [];
  const offAirCount = Math.max(
    0,
    sim.events.length + (sim.inFlight ? 1 : 0) - shown.length,
  );
  const lastUsed = useMemo(
    () => sim.events.find((e) => e.verdict?.kind === "used") ?? null,
    [sim.events],
  );
  // Counts are a fixed trailing 24h window in both modes (engine-side).
  // When the server-counted baseline is in (authoritative) the N is exact —
  // plain number, no "+"; the "+" only marks a saturated held window.
  const windowSuffix = "24H";
  const signals24h = cold
    ? null
    : `${fmtCount(sim.stats.total24h)}${
        sim.stats.saturated && !sim.stats.authoritative ? "+" : ""
      }`;

  const shownIds = shown.map((ev) => ev.id).join(",");
  const capture = feed.capture;
  useEffect(() => {
    capture(shownIds === "" ? [] : shownIds.split(","));
  }, [capture, shownIds]);

  const sortedAssets = useMemo(
    () => [...sim.assets].sort((a, b) => b.targetWeight - a.targetWeight),
    [sim.assets],
  );

  return (
    <>
      <div className={styles.mastheadShim}>
        <Masthead
          actions={
            <span className="flex items-center gap-2">
              <PostStyleSwitch style={postStyle} onPick={setPostStyle} />
              <SourceSwitch onPaper />
            </span>
          }
        />
      </div>
      <main>
        <div className={`${styles.studio} min-h-screen`}>
          <div className="mx-auto max-w-[1280px] px-5 pt-8 pb-16 md:pt-10">
            {/* ------------------------------------------------ hero -------
                The original landing's header copy, minus live ornaments. */}
            <section aria-label="What the fund is">
              <TypedHeadline text="Analyst conviction, becoming a portfolio." />
              {sim.fallbackReason && (
                <p
                  role="status"
                  className="mt-4 inline-block border border-[var(--pt-gold)] px-2.5 py-1.5 font-mono text-[0.68rem] font-semibold tracking-[0.08em] text-[var(--pt-gold)]"
                >
                  LIVE FEED UNAVAILABLE · SHOWING SIMULATED REPLAY
                </p>
              )}
              {liveMode && sim.live?.variantNote && (
                <p
                  role="status"
                  className="mt-4 inline-block border border-[var(--pt-gold)] px-2.5 py-1.5 font-mono text-[0.68rem] font-semibold tracking-[0.08em] text-[var(--pt-gold)]"
                >
                  LIVE SEED DEGRADED · STREAM REMAINS ACTIVE
                </p>
              )}
            </section>

            {/* ---------------------------------------------- studio floor - */}
            <div
              id="wire"
              // Two stages, not three: the classification gate was folded
              // back INTO the wire once custom rendering let each post carry
              // its own verdict. Per-post adjudication beats an aggregate —
              // it shows which post moved which weight.
              className="mt-9 grid scroll-mt-24 gap-8 md:mt-11 lg:grid-cols-[minmax(320px,4fr)_9fr]"
            >
              <section
                aria-label="Breaking signals — live feed"
                className="relative min-w-0"
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-[var(--pt-line)] pb-2">
                  <h2 className="flex items-center gap-2 font-mono text-[0.75rem] font-bold tracking-[0.12em] text-[var(--pt-text)]">
                    <span
                      aria-hidden
                      className={`${styles.liveDot} ${cold ? styles.liveDotStandby : ""}`}
                    />
                    BREAKING SIGNALS
                    {/* DESIGN v3: stalls are surfaced, never silent. Gold —
                        the engine is retrying, nothing is wrong yet. */}
                    {liveMode && sim.live?.status === "stalled" && (
                      <span className="font-mono text-[0.65rem] font-semibold tracking-[0.1em] whitespace-nowrap text-[var(--pt-gold)]">
                        RECONNECTING&hellip;
                      </span>
                    )}
                  </h2>
                  <span className="flex items-center gap-2">
                    <span
                      className="font-mono text-[0.7rem] text-[var(--pt-muted)] tabular-nums"
                      suppressHydrationWarning
                    >
                      {signals24h === null
                        ? ""
                        : `${signals24h} SIGNALS / ${windowSuffix}`}
                    </span>
                    {/* X's display requirements allow the mark "upper-right
                        corner OR attached to timeline" — one here covers the
                        whole feed, so individual posts stay clean. */}
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      role="img"
                      aria-label="Posts from X"
                      className="shrink-0 text-[var(--pt-muted)]"
                    >
                      <path
                        fill="currentColor"
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                  </span>
                </div>
                {/* One continuous feed: posts butt against each other with a
                    shared hairline rule and the column scrolls internally, so
                    the pipeline's three columns always end together no matter
                    how long the tape gets. The bottom mask implies the feed
                    keeps running past the frame. */}
                <ol
                  ref={wireRef}
                  className="wire-scroll mt-3 flex flex-col border-x border-[var(--pt-line)] lg:max-h-[clamp(520px,68vh,800px)] lg:overflow-y-auto lg:overscroll-contain"
                  style={{ maskImage: feedMask(feed.atTop, feed.atBottom) }}
                >
                  {cold &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <li
                        key={i}
                        className="h-[88px] animate-pulse border-b border-[var(--pt-line)] bg-[var(--pt-panel)]"
                        aria-hidden
                      />
                    ))}
                  {!cold &&
                    shown.map((ev, i) => (
                      <LowerThird
                        key={ev.id}
                        event={ev}
                        analyst={byId.get(ev.analystId)}
                        related={
                          hoverTicker != null &&
                          ev.verdict?.ticker === hoverTicker
                        }
                        delayMs={i * 40}
                      />
                    ))}
                </ol>
                <NewPostsPill
                  count={waiting.length}
                  handles={waiting
                    .map((ev) => byId.get(ev.analystId)?.handle)
                    .filter((h): h is string => Boolean(h))}
                  onClick={feed.release}
                />
                {!cold && offAirCount > 0 && (
                  <p className="mt-3 font-mono text-[0.7rem] tracking-[0.08em] text-[var(--pt-muted)]">
                    + {fmtCount(offAirCount)} MORE IN THE {windowSuffix} TAPE
                    &mdash; OFF AIR
                  </p>
                )}
              </section>

              <section
                aria-label="The basket — model portfolio"
                className="min-w-0"
              >
                <div className="relative">
                  <BasketCanvas
                    assets={sim.assets}
                    analystsById={byId}
                    events={sim.events}
                    highlightCalls={sim.highlightCalls}
                    focusTicker={null}
                    theme={theme}
                    cold={cold || sim.assets.length === 0}
                    liveMode={liveMode}
                    onHoverTicker={setHoverTicker}
                  />
                  {/* Wire trigger: the floor's vertical midpoint. */}
                  <span
                    ref={floorMidRef}
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-0 h-px w-px"
                  />
                </div>

                {/* Upstream publishes capped weights without renormalizing —
                    say so instead of stretching the bubbles to a fake 100%. */}
                {!cold && liveMode && sim.live?.weightResidual != null && (
                  <p className="mt-2 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--pt-muted)]">
                    PUBLISHED WEIGHTS SUM TO{" "}
                    {fmtPct(1 - sim.live.weightResidual)} &mdash; REMAINDER
                    UNALLOCATED
                  </p>
                )}

                {!cold && liveMode && sim.live?.basketSource && (
                  <p className="mt-2 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--pt-muted)]">
                    {sim.live.basketSource === "node-preview"
                      ? "LOCAL NODE PREVIEW"
                      : sim.live.basketDatasetSource === "snapshot"
                        ? "OPERATOR DAILY · OFFLINE SCOUT SNAPSHOT"
                        : "OPERATOR DAILY · SCOUT API"}
                    {formatDataDate(sim.live.basketComputedAt)
                      ? ` · AS OF ${formatDataDate(sim.live.basketComputedAt)}`
                      : ""}
                  </p>
                )}

                {!cold && liveMode && sim.assets.length === 0 && (
                  <p
                    role="status"
                    className="mt-2 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--pt-gold)]"
                  >
                    BASKET DATA UNAVAILABLE · WAITING FOR A COHERENT SOURCE
                  </p>
                )}

                {/* The canvas is decoration; this table is its accessible
                  record (visually hidden, no focusable elements). The div
                  carries sr-only: a table ignores the 1px clip box and
                  would stretch the document sideways on mobile. */}
                {!cold && sortedAssets.length > 0 && (
                  <div className="sr-only">
                    <table aria-label="The basket — model portfolio holdings">
                      <thead>
                        <tr>
                          <th scope="col">Holding</th>
                          <th scope="col">Sector</th>
                          <th scope="col">Model weight</th>
                          <th scope="col">Day move</th>
                          <th scope="col">Backers</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAssets.map((asset) => (
                          <tr key={asset.ticker}>
                            <td>
                              {asset.ticker}
                              {asset.name ? ` (${asset.name})` : ""}
                            </td>
                            <td>{asset.sector || "—"}</td>
                            <td>{fmtPct(asset.targetWeight)}</td>
                            <td>
                              {asset.dayMove == null
                                ? "—"
                                : fmtSigned(asset.dayMove)}
                            </td>
                            <td>
                              {asset.supporters
                                .map((id) => byId.get(id)?.handle)
                                .filter(Boolean)
                                .map((h) => `@${h}`)
                                .join(", ") || "—"}
                            </td>
                          </tr>
                        ))}
                        {liveMode && sim.live?.weightResidual != null && (
                          <tr>
                            <td>Unallocated remainder</td>
                            <td>—</td>
                            <td>{fmtPct(sim.live.weightResidual)}</td>
                            <td>—</td>
                            <td>—</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {!cold && !liveMode && (
                  <JustMoved
                    lastUsed={lastUsed}
                    handle={
                      lastUsed
                        ? byId.get(lastUsed.analystId)?.handle
                        : undefined
                    }
                    live={
                      sim.highlightTicker != null &&
                      sim.highlightTicker === lastUsed?.verdict?.ticker
                    }
                    calls={lastUsed?.verdict?.calls}
                  />
                )}
              </section>
            </div>

            {/* The wire: hidden until the reader has scrolled halfway through
              the basket floor, then docked under the masthead. Reduced
              motion: appears without the slide. */}
            <div
              className={`${styles.wireDock} ${wireDocked ? styles.wireDockOn : ""}`}
              aria-hidden={!wireDocked}
            >
              <Chyron
                events={sim.events}
                analysts={sim.analysts}
                booted={sim.booted}
              />
            </div>
          </div>
        </div>

        {/* The page continues as the original landing. */}
        <div className="flex flex-col gap-20 py-20 md:gap-28 md:py-24">
          <DriftSection />
          <PerformanceExhibit />
          <ClosingCta />
        </div>
      </main>
    </>
  );
}

/** Names the tweet that last moved the basket; flares gold while it lands. */
function JustMoved({
  lastUsed,
  handle,
  live,
  calls,
}: {
  lastUsed: SignalEvent | null;
  handle: string | undefined;
  live: boolean;
  calls?: { ticker: string; weightDelta: number | null }[];
}) {
  const v = lastUsed?.verdict;
  if (!lastUsed || !v?.ticker) return null;
  // Legs without a delta are hidden from the ±pp claim — never render a
  // fabricated 0 (sim always fills deltas, so this is belt-and-braces).
  const legs = (
    calls && calls.length > 0
      ? calls
      : [{ ticker: v.ticker, weightDelta: v.weightDelta ?? null }]
  ).filter(
    (leg): leg is { ticker: string; weightDelta: number } =>
      leg.weightDelta != null,
  );
  if (legs.length === 0) return null;
  return (
    <div
      key={lastUsed.id}
      className={`${live ? styles.calloutIn : ""} mt-4 flex flex-wrap items-start gap-3 border bg-[var(--pt-panel)] p-3 ${
        live ? "border-[var(--pt-accent)]" : "border-[var(--pt-line)]"
      }`}
    >
      <span
        className="inline-block shrink-0 -skew-x-6 px-2 py-0.5"
        style={{
          background: live ? "var(--pt-accent-strong)" : "var(--pt-panel2)",
        }}
      >
        <span
          className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.1em]"
          style={{
            color: live ? "var(--pt-on-brand)" : "var(--pt-muted)",
          }}
        >
          {live ? "JUST MOVED" : "LAST MOVE"}
        </span>
      </span>
      <p className="min-w-0 flex-1 text-[0.875rem] leading-snug text-[var(--pt-body)]">
        {handle && (
          <Link
            href={`https://x.com/${handle}`}
            className="font-mono text-[0.78rem] font-semibold text-[var(--pt-text)] underline-offset-2 hover:text-[var(--pt-accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pt-accent)]"
          >
            @{handle}
          </Link>
        )}{" "}
        moved{" "}
        {legs.map((leg, i) => (
          <span key={leg.ticker}>
            {i > 0 && <span className="text-[var(--pt-muted)]"> and </span>}
            <Link
              href={`/#${leg.ticker}`}
              className="font-mono text-[0.78rem] font-bold text-[var(--pt-text)] underline-offset-2 hover:text-[var(--pt-accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pt-accent)]"
            >
              {leg.ticker}
            </Link>{" "}
            <span
              className="font-mono text-[0.78rem] font-bold tabular-nums"
              style={{
                color:
                  leg.weightDelta >= 0 ? "var(--pt-green)" : "var(--pt-red)",
              }}
            >
              {fmtSignedPp(leg.weightDelta)}
            </span>
          </span>
        ))}{" "}
        in the model &mdash; &ldquo;
        <span className="text-[var(--pt-muted)]">{lastUsed.text}</span>
        &rdquo;
      </p>
    </div>
  );
}
