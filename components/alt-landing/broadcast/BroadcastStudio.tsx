"use client";

import Link from "@/components/motion-link";
import { useMemo } from "react";
import { useSim } from "@/lib/sim/store";
import type { SignalEvent } from "@/lib/sim/types";
import { fmtCount, fmtSignedPp } from "@/lib/format";
import { UntilShort } from "@/components/briefing/TimeAgo";
import { Chyron } from "./Chyron";
import { CompositionBar } from "./CompositionBar";
import { LowerThird } from "./LowerThird";
import { StudioClock } from "./StudioClock";
import styles from "./broadcast.module.css";

const ON_AIR_CARDS = 7;

/** "On Air" — the signal loop staged as a live television newsroom. */
export function BroadcastStudio() {
  const sim = useSim();
  const cold = !sim.booted;

  const byId = useMemo(
    () => new Map(sim.analysts.map((a) => [a.id, a])),
    [sim.analysts],
  );
  const onAir: SignalEvent[] = useMemo(() => {
    const list = sim.inFlight ? [sim.inFlight, ...sim.events] : sim.events;
    return list.slice(0, ON_AIR_CARDS);
  }, [sim.inFlight, sim.events]);
  const offAirCount = Math.max(
    0,
    sim.events.length + (sim.inFlight ? 1 : 0) - ON_AIR_CARDS,
  );
  const lastUsed = useMemo(
    () => sim.events.find((e) => e.verdict?.kind === "used") ?? null,
    [sim.events],
  );
  const navNow = sim.nav.length ? sim.nav[sim.nav.length - 1].value : null;

  return (
    <main className={`${styles.studio} min-h-screen`}>
      <div className="mx-auto max-w-[1280px] px-5 pt-8 pb-16">
        {/* ------------------------------------------------ masthead ------- */}
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b-2 border-[var(--bc-red)] pb-3">
          <p className="text-[1.3rem] leading-none font-black tracking-[-0.02em]">
            NFN{" "}
            <span className="font-bold text-[var(--studio-muted)]">
              &middot; NETWORK FUND NEWS
            </span>
          </p>
          <p className="inline-flex items-center gap-2 border border-[var(--bc-red)] px-2.5 py-1 font-mono text-[0.7rem] font-bold tracking-[0.12em] text-[var(--bc-red)]">
            <span
              aria-hidden
              className={`${styles.liveDot} ${cold ? styles.liveDotStandby : ""}`}
            />
            {cold ? "STAND BY" : "ON AIR"}
          </p>
          <p className="ml-auto flex items-center gap-4 font-mono text-[0.75rem] text-[var(--studio-muted)] tabular-nums">
            <span suppressHydrationWarning>
              {cold
                ? "TUNING…"
                : `TRACKING ${fmtCount(sim.stats.trackedAnalysts)} ANALYSTS`}
            </span>
            <StudioClock />
          </p>
        </header>

        {/* ------------------------------------------------ scoreboard ----- */}
        <section
          aria-label="Fund scoreboard"
          className="mt-6 grid grid-cols-2 gap-px border border-[var(--studio-line)] bg-[var(--studio-line)] lg:grid-cols-4"
        >
          <ScoreTile
            label="NAV INDEX"
            value={cold || navNow == null ? "—" : navNow.toFixed(2)}
            sub="100 = INCEPTION"
          />
          <ScoreTile
            label="MODEL DRIFT"
            // sim-only surface: sim always fills driftPct
            value={cold ? "—" : `${(sim.driftPct ?? 0).toFixed(2)}%`}
            sub="SINCE LAST REBALANCE"
            tone={!cold && (sim.driftPct ?? 0) >= 1 ? "gold" : undefined}
          />
          <ScoreTile
            label="SIGNALS / 24H"
            value={cold ? "—" : fmtCount(sim.stats.total24h)}
            sub={
              cold
                ? "AWAITING FEED"
                : `${fmtCount(sim.stats.used24h)} USED · ${fmtCount(sim.stats.noCall24h)} NO CALL · ${fmtCount(sim.stats.discarded24h)} CUT`
            }
          />
          <ScoreTile
            label="NEXT REBALANCE"
            value={
              cold ? (
                "—"
              ) : (
                <span suppressHydrationWarning>
                  <UntilShort ts={sim.nextRebalanceTs} />
                </span>
              )
            }
            sub="THE FUND TRADES DAILY"
          />
        </section>

        {/* ------------------------------------------------ studio floor --- */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(340px,5fr)_7fr]">
          <section
            aria-label="Breaking signals — live feed"
            className="min-w-0"
          >
            <div className="flex items-baseline justify-between border-b border-[var(--studio-line)] pb-2">
              <h2 className="flex items-center gap-2 font-mono text-[0.75rem] font-bold tracking-[0.12em] text-[var(--studio-text)]">
                <span
                  aria-hidden
                  className={`${styles.liveDot} ${cold ? styles.liveDotStandby : ""}`}
                />
                BREAKING SIGNALS
              </h2>
              <span
                className="font-mono text-[0.7rem] text-[var(--studio-muted)] tabular-nums"
                suppressHydrationWarning
              >
                {cold ? "" : `${fmtCount(sim.stats.total24h)} POSTS / 24H`}
              </span>
            </div>
            <ol className="mt-3 flex flex-col gap-2.5">
              {cold &&
                Array.from({ length: 5 }).map((_, i) => (
                  <li
                    key={i}
                    className="h-[88px] animate-pulse border border-[var(--studio-line)] bg-[var(--studio-panel)]"
                    aria-hidden
                  />
                ))}
              {!cold &&
                onAir.map((ev, i) => (
                  <LowerThird
                    key={ev.id}
                    event={ev}
                    analyst={byId.get(ev.analystId)}
                    delayMs={i * 40}
                  />
                ))}
            </ol>
            {!cold && offAirCount > 0 && (
              <p className="mt-3 font-mono text-[0.7rem] tracking-[0.08em] text-[var(--studio-muted)]">
                + {fmtCount(offAirCount)} MORE IN THE 24H TAPE — OFF AIR
              </p>
            )}
          </section>

          <section
            aria-label="The basket — model portfolio"
            className="min-w-0"
          >
            <div className="flex items-baseline justify-between border-b border-[var(--studio-line)] pb-2">
              <h2 className="font-mono text-[0.75rem] font-bold tracking-[0.12em] text-[var(--studio-text)]">
                THE BASKET &mdash; MODEL PORTFOLIO NOW
              </h2>
              <span className="font-mono text-[0.7rem] text-[var(--studio-muted)]">
                SIMULATED FEED
              </span>
            </div>
            {cold ? (
              <div
                className="mt-9 h-16 animate-pulse border border-[var(--studio-line)] bg-[var(--studio-panel)]"
                aria-hidden
              />
            ) : (
              <CompositionBar
                assets={sim.assets}
                analysts={sim.analysts}
                highlightCalls={sim.highlightCalls}
              />
            )}
            {!cold && (
              <JustMoved
                lastUsed={lastUsed}
                handle={
                  lastUsed ? byId.get(lastUsed.analystId)?.handle : undefined
                }
                live={
                  sim.highlightTicker != null &&
                  sim.highlightTicker === lastUsed?.verdict?.ticker
                }
              />
            )}
          </section>
        </div>
      </div>

      <Chyron events={sim.events} analysts={sim.analysts} booted={sim.booted} />
    </main>
  );
}

function ScoreTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  tone?: "gold";
}) {
  return (
    <div className="bg-[var(--studio-panel)] px-4 py-4">
      <p className="font-mono text-[0.68rem] font-bold tracking-[0.12em] text-[var(--studio-muted)]">
        {label}
      </p>
      <p
        className="mt-1 text-[clamp(1.9rem,3.4vw,2.7rem)] leading-none font-black tracking-[-0.03em] tabular-nums"
        style={tone === "gold" ? { color: "var(--bc-gold)" } : undefined}
      >
        {value}
      </p>
      <p className="mt-1.5 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--studio-muted)]">
        {sub}
      </p>
    </div>
  );
}

/** Names the tweet that last moved the basket; flares gold while it lands. */
function JustMoved({
  lastUsed,
  handle,
  live,
}: {
  lastUsed: SignalEvent | null;
  handle: string | undefined;
  live: boolean;
}) {
  const v = lastUsed?.verdict;
  if (!lastUsed || !v?.ticker) return null;
  // A mixed post lists every leg — each ticker with its own signed move.
  const moves =
    v.calls && v.calls.length > 1
      ? v.calls.map((c) => ({ ticker: c.ticker, weightDelta: c.weightDelta }))
      : [{ ticker: v.ticker, weightDelta: v.weightDelta ?? 0 }];
  return (
    <div
      key={lastUsed.id}
      className={`${live ? styles.calloutIn : ""} mt-5 flex flex-wrap items-start gap-3 border bg-[var(--studio-panel)] p-3 ${
        live ? "border-[var(--bc-gold)]" : "border-[var(--studio-line)]"
      }`}
    >
      <span
        className="inline-block shrink-0 -skew-x-6 px-2 py-0.5"
        style={{
          background: live ? "var(--bc-gold)" : "var(--studio-panel2)",
        }}
      >
        <span
          className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.1em]"
          style={{ color: live ? "#0c0d12" : "var(--studio-muted)" }}
        >
          {live ? "JUST MOVED" : "LAST MOVE"}
        </span>
      </span>
      <p className="min-w-0 flex-1 text-[0.875rem] leading-snug text-[#c8ccd6]">
        {handle && (
          <Link
            href={`https://x.com/${handle}`}
            className="font-mono text-[0.78rem] font-semibold text-[var(--studio-text)] underline-offset-2 hover:text-[var(--bc-gold)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-gold)]"
          >
            @{handle}
          </Link>
        )}{" "}
        moved{" "}
        {moves.map((m, i) => (
          <span key={m.ticker}>
            {i > 0 && " and "}
            <Link
              href={`/#${m.ticker}`}
              className="font-mono text-[0.78rem] font-bold text-[var(--studio-text)] underline-offset-2 hover:text-[var(--bc-gold)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-gold)]"
            >
              {m.ticker}
            </Link>{" "}
            <span
              className="font-mono text-[0.78rem] font-bold tabular-nums"
              style={{
                // sim-only surface: sim always fills weightDelta
                color:
                  (m.weightDelta ?? 0) >= 0
                    ? "var(--bc-green)"
                    : "var(--bc-red)",
              }}
            >
              {fmtSignedPp(m.weightDelta ?? 0)}
            </span>
          </span>
        ))}{" "}
        in the model &mdash; &ldquo;
        <span className="text-[var(--studio-muted)]">{lastUsed.text}</span>
        &rdquo;
      </p>
    </div>
  );
}
