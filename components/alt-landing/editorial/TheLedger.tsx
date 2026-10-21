"use client";

import { useMemo, useState } from "react";
import { useSim } from "@/lib/sim/store";
import type { SignalEvent } from "@/lib/sim/types";
import { fmtCount } from "@/lib/format";
import { SimStamp } from "@/components/briefing/SimStamp";
import { WeightBand, type BandCause } from "./WeightBand";
import { LedgerRow } from "./LedgerRow";
import styles from "./ledger.module.css";

const PAGE = 30;

/**
 * "The Ledger" — Swiss editorial variant of the live loop. One quiet column:
 * the basket as a pinned 100% weight band up top, the wire as a typographic
 * ledger below it. Hovering a ledger line lights its token segment and vice
 * versa; an accepted call sweeps a cobalt rule from its row up to the band.
 */
export function TheLedger() {
  const sim = useSim();
  const cold = !sim.booted;
  const [hotTicker, setHotTicker] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const byId = useMemo(
    () => new Map(sim.analysts.map((a) => [a.id, a])),
    [sim.analysts],
  );

  const onTape = sim.events.length + (sim.inFlight ? 1 : 0);
  const entries: SignalEvent[] = useMemo(() => {
    const list = sim.inFlight ? [sim.inFlight, ...sim.events] : sim.events;
    return list.slice(0, visibleCount);
  }, [sim.inFlight, sim.events, visibleCount]);

  const lastUsed = useMemo(
    () => sim.events.find((e) => e.verdict?.kind === "used"),
    [sim.events],
  );
  const cause: BandCause | null =
    lastUsed?.verdict?.ticker != null
      ? {
          handle: byId.get(lastUsed.analystId)?.handle ?? "analyst",
          calls: lastUsed.verdict.calls?.length
            ? lastUsed.verdict.calls.map((c) => ({
                ticker: c.ticker,
                weightDelta: c.weightDelta ?? 0, // sim-only surface
              }))
            : [
                {
                  ticker: lastUsed.verdict.ticker,
                  weightDelta: lastUsed.verdict.weightDelta ?? 0,
                },
              ],
        }
      : null;

  return (
    <main className={`${styles.root} mx-auto max-w-[880px] px-5 pb-24`}>
      {/* ---------------------------------------------- masthead copy ----- */}
      <header className="pt-12 pb-10">
        <p className="kicker">DESIGN EXPLORATION 04 — THE LEDGER</p>
        <h1 className="text-ink mt-4 max-w-[16ch] text-[clamp(2.4rem,6.5vw,4.25rem)] leading-[1.02] font-extrabold tracking-[-0.025em]">
          The basket, kept like a ledger.
        </h1>
        <p className="text-ink-secondary mt-5 max-w-[54ch] text-[1.05rem] leading-relaxed">
          Every post is read and marked; accepted calls move the model basket.
          The fund itself trades at the daily rebalance.
        </p>
        <p className="agate text-ink-muted mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span suppressHydrationWarning>
            {cold
              ? "CONNECTING…"
              : `${fmtCount(sim.stats.total24h)} ENTRIES / 24H · ${fmtCount(
                  sim.stats.used24h,
                )} USED · ${fmtCount(sim.stats.noCall24h)} NO CALL · ${fmtCount(
                  sim.stats.discarded24h,
                )} DISCARDED · DRIFT ${(sim.driftPct ?? 0).toFixed(2)}%`}
          </span>
          <SimStamp />
        </p>
      </header>

      {/* ---------------------------------------------- the weight band --- */}
      {/* Pinned under the global masthead (h-14 + hairline = 57px) so the
          band keeps morphing in view while the reader is deep in the tape. */}
      <section
        aria-label="Model basket weight band"
        className="bg-paper border-hairline sticky top-[57px] z-40 -mx-5 border-b px-5 pt-3 pb-3"
      >
        <WeightBand
          assets={sim.assets}
          cold={cold}
          highlightCalls={sim.highlightCalls}
          hotTicker={hotTicker}
          onHot={setHotTicker}
          cause={cause}
        />
      </section>

      {/* ---------------------------------------------- the ledger -------- */}
      <section
        aria-label="The ledger — the last 24 hours of analyst posts"
        className="mt-12"
      >
        <div className="border-ink flex items-center justify-between border-b-2 pb-2">
          <h2 className="kicker kicker-live flex items-center gap-2">
            <span className="live-dot" aria-hidden />
            THE LEDGER — NEWEST FIRST
          </h2>
          <span className="agate text-ink-muted" suppressHydrationWarning>
            {cold ? "" : `${fmtCount(onTape)} ON THE 24H TAPE`}
          </span>
        </div>

        <div className="agate text-ink-muted border-hairline hidden gap-x-5 border-b py-2 sm:grid sm:grid-cols-[84px_148px_minmax(0,1fr)_148px]">
          <span>ENTERED</span>
          <span>ANALYST</span>
          <span>ENTRY</span>
          <span className="text-right">MARK</span>
        </div>

        <ol>
          {cold &&
            Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="border-hairline border-t py-3.5"
                aria-hidden
              >
                <div className="plate h-[46px] animate-pulse" />
              </li>
            ))}
          {!cold &&
            entries.map((ev) => (
              <LedgerRow
                key={ev.id}
                ev={ev}
                analyst={byId.get(ev.analystId)}
                hot={
                  hotTicker !== null &&
                  ev.stage === "classified" &&
                  (ev.verdict?.ticker === hotTicker ||
                    (ev.verdict?.calls?.some((c) => c.ticker === hotTicker) ??
                      false))
                }
                sweeping={
                  sim.highlightTicker !== null &&
                  ev.id === lastUsed?.id &&
                  ev.verdict?.ticker === sim.highlightTicker
                }
                onHot={setHotTicker}
              />
            ))}
        </ol>

        {!cold && visibleCount < onTape && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE)}
            className="agate border-hairline text-ink-secondary hover:text-cobalt-deep focus-visible:outline-cobalt mt-5 w-full rounded-[3px] border py-2.5 transition-colors duration-150 ease-out hover:border-[rgba(41,70,232,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            OPEN {fmtCount(Math.min(PAGE, onTape - visibleCount))} EARLIER
            ENTRIES
          </button>
        )}
        {!cold && visibleCount >= onTape && (
          <p className="agate text-ink-muted border-hairline border-t py-2.5 text-center">
            END OF THE 24H TAPE
          </p>
        )}
      </section>
    </main>
  );
}
