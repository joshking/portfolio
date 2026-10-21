"use client";

import Link from "@/components/motion-link";
import { useMemo, useState } from "react";
import { useSim } from "@/lib/sim/store";
import { fmtCount } from "@/lib/format";
import { SimStamp } from "@/components/briefing/SimStamp";
import { OrganismCanvas } from "./OrganismCanvas";
import { SignalFeed } from "./SignalFeed";
import { HoldingsList } from "./HoldingsList";
import styles from "./organism.module.css";

// Variant 03 — The Organism. Same loop as the briefing (tweet -> verdict ->
// basket), rendered as a living cluster: bullish signals feed a holding,
// bearish signals bruise it, noise dissolves before it ever lands.
export function OrganismStage() {
  const sim = useSim();
  const [focusTicker, setFocusTicker] = useState<string | null>(null);
  const analystsById = useMemo(
    () => new Map(sim.analysts.map((a) => [a.id, a])),
    [sim.analysts],
  );
  const cold = !sim.booted;

  return (
    <main className={styles.world}>
      <div className={styles.frame}>
        <header>
          <p className={styles.kicker}>
            <Link href="/lab/network-fund/prime-time" className={styles.backlink}>
              DESIGN EXPLORATION
            </Link>{" "}
            · 03 — THE ORGANISM
          </p>
          <h1 className={styles.title}>The basket is alive.</h1>
          <p className={styles.lede}>
            Every analyst post is a stimulus. A bullish call streaks in and
            feeds its holding; a bearish call strikes and bruises it; noise
            dissolves before it ever reaches the cluster. What survives is the
            model portfolio, breathing below.
          </p>
          <p className={styles.vitals}>
            {cold ? (
              <span>ORGANISM DORMANT</span>
            ) : (
              <>
                <span>
                  24H METABOLISM — {fmtCount(sim.stats.total24h)} STIMULI
                </span>
                <span className={styles.vitalBull}>
                  {fmtCount(sim.stats.used24h)} ABSORBED
                </span>
                <span>{fmtCount(sim.stats.noCall24h)} DISSOLVED</span>
                <span>{fmtCount(sim.stats.discarded24h)} REJECTED</span>
                <span>
                  {fmtCount(sim.stats.trackedAnalysts)} ANALYSTS TRACKED
                </span>
              </>
            )}
            <SimStamp onInk />
          </p>
        </header>

        <div className={styles.stage}>
          <SignalFeed
            events={sim.events}
            inFlight={sim.inFlight}
            analystsById={analystsById}
            cold={cold}
            onFocusTicker={setFocusTicker}
          />
          <OrganismCanvas
            assets={sim.assets}
            analystsById={analystsById}
            events={sim.events}
            highlightCalls={sim.highlightCalls}
            focusTicker={focusTicker}
            cold={cold}
          />
        </div>

        <HoldingsList
          assets={sim.assets}
          analystsById={analystsById}
          highlightCalls={sim.highlightCalls}
          cold={cold}
          onFocusTicker={setFocusTicker}
        />
      </div>
    </main>
  );
}
