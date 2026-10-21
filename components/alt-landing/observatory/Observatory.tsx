"use client";

import Link from "@/components/motion-link";
import { useEffect, useMemo, useState } from "react";
import { useSim } from "@/lib/sim/store";
import { fmtCount } from "@/lib/format";
import { UntilShort } from "@/components/briefing/TimeAgo";
import { InstrumentRing } from "./InstrumentRing";
import { ObservatoryLog } from "./ObservatoryLog";
import { DetailPlate } from "./DetailPlate";
import s from "./observatory.module.css";

/** "The Observatory" — the basket as a radial instrument. Arcs are holdings,
 *  classified posts sweep in from the rim, momentum ripples through the ring.
 *  The log column is the accessible, chronological record of the same loop. */
export function Observatory() {
  const sim = useSim();
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const activeTicker = hovered ?? pinned;
  const cold = !sim.booted;

  // Direction of the pulsing highlight per target: a mixed post pulses every
  // moved arc, each with the sign of its own call.
  const highlightDirs = useMemo(() => {
    const dirs = new Map<string, "bull" | "bear">();
    for (const hc of sim.highlightCalls) {
      dirs.set(hc.ticker, hc.weightDelta >= 0 ? "bull" : "bear");
    }
    return dirs;
  }, [sim.highlightCalls]);

  const displayAsset = useMemo(
    () => sim.assets.find((a) => a.ticker === activeTicker) ?? null,
    [sim.assets, activeTicker],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className={s.field}>
      <div className={s.frame}>
        <header className={s.head}>
          <div>
            <Link href="/lab/network-fund/prime-time" className={s.backLink}>
              ← Alternatives
            </Link>
            <h1 className={s.title}>The Observatory</h1>
            <p className={s.subtitle}>
              Analyst calls, read by the Twitter Oracle, sweep in from the rim.
              The ring is the basket: every arc a holding, every ripple a call
              that made it through.
            </p>
          </div>
          <div className={s.headStats}>
            <span className={s.liveRow}>
              <span className={s.liveDot} aria-hidden />
              LIVE · SIMULATED SIGNAL
            </span>
            <span>
              {cold
                ? "CONNECTING…"
                : `${fmtCount(sim.stats.total24h)} POSTS / 24H · ${fmtCount(sim.stats.trackedAnalysts)} ANALYSTS`}
            </span>
          </div>
        </header>

        <div className={s.stage}>
          <div className={s.instrumentCol}>
            <div className={s.instrumentWrap}>
              <InstrumentRing
                assets={sim.assets}
                events={sim.events}
                booted={sim.booted}
                highlightDirs={highlightDirs}
                activeTicker={activeTicker}
                pinnedTicker={pinned}
                onActivate={setHovered}
                onPin={setPinned}
              />
              <div className={s.core}>
                {cold ? (
                  <p className={s.coreCold}>Acquiring signal…</p>
                ) : (
                  <>
                    <p className={s.coreLabel}>Accumulated drift</p>
                    {/* sim-only surface: sim always fills driftPct */}
                    <p className={s.coreBig}>
                      {(sim.driftPct ?? 0).toFixed(2)}%
                    </p>
                    <p className={s.coreLine} suppressHydrationWarning>
                      REBALANCE{" "}
                      <UntilShort ts={sim.nextRebalanceTs} prefix="IN " />
                    </p>
                    <p className={s.coreFaint}>
                      {sim.assets.length} HOLDINGS ·{" "}
                      {fmtCount(sim.stats.used24h)} CALLS USED / 24H
                    </p>
                  </>
                )}
              </div>
            </div>

            <p className={s.legend}>
              <span>
                <span className={s.legendBull}>▲ BULLISH</span> — ARC BREATHES
                OUT
              </span>
              <span>
                <span className={s.legendBear}>▼ BEARISH</span> — ARC CONTRACTS
              </span>
              <span>○ NO CALL / × DISCARDED FADE AT THE RIM</span>
            </p>

            <DetailPlate
              asset={displayAsset}
              analysts={sim.analysts}
              events={sim.events}
              booted={sim.booted}
            />
          </div>

          <ObservatoryLog
            events={sim.events}
            inFlight={sim.inFlight}
            analysts={sim.analysts}
            stats={sim.stats}
            booted={sim.booted}
            activeTicker={activeTicker}
            onHoverTicker={setHovered}
          />
        </div>
      </div>
    </main>
  );
}
