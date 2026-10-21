"use client";

import type { SimState } from "@/lib/sim/types";
import { fmtCount } from "@/lib/format";
import { UntilShort } from "@/components/briefing/TimeAgo";
import styles from "./desk.module.css";

// Round phase, drift, counts — the desk's top readout row.

function Cell({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "amber" | "up" | "down";
}) {
  const toneColor =
    tone === "amber"
      ? "text-[var(--amber)]"
      : tone === "up"
        ? "text-[var(--up)]"
        : tone === "down"
          ? "text-[var(--down)]"
          : "text-[var(--tx)]";
  return (
    <div className="flex items-baseline gap-2 px-3 py-1.5">
      <span className="text-[10px] tracking-[0.14em] text-[var(--tx-mute)] uppercase">
        {label}
      </span>
      <span
        className={`text-[12px] font-semibold tracking-[0.04em] uppercase ${toneColor}`}
      >
        {children}
      </span>
    </div>
  );
}

export function StatusStrip({ sim }: { sim: SimState }) {
  const cold = !sim.booted;
  const classifying = sim.inFlight !== null;

  return (
    <div className="flex flex-wrap items-stretch divide-x divide-[var(--line)] border border-[var(--line)] bg-[var(--panel-2)]">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className={`${styles.liveDot} rounded-full`} aria-hidden />
        <span
          className={`${styles.glow} text-[11px] font-bold tracking-[0.16em] text-[var(--amber)] uppercase`}
        >
          {cold ? "SYNC" : "LIVE"}
        </span>
      </div>

      <Cell label="Phase" tone={classifying ? "amber" : undefined}>
        {cold ? (
          "BOOT"
        ) : classifying ? (
          <span className={styles.blink}>ADJUDICATING</span>
        ) : (
          "LISTENING"
        )}
      </Cell>

      {/* sim-only surface: sim always fills driftPct */}
      <Cell label="Drift">
        {cold ? "—" : `${(sim.driftPct ?? 0).toFixed(2)}%`}
      </Cell>

      <Cell label="Rebal" tone="amber">
        <span suppressHydrationWarning>
          {cold ? "—" : <UntilShort ts={sim.nextRebalanceTs} prefix={"T−"} />}
        </span>
      </Cell>

      <Cell label="24H">
        {cold ? (
          "—"
        ) : (
          <>
            {fmtCount(sim.stats.total24h)} SIG &middot;{" "}
            <span className="text-[var(--up)]">
              {fmtCount(sim.stats.used24h)} USED
            </span>{" "}
            &middot; {fmtCount(sim.stats.noCall24h)} NC &middot;{" "}
            {fmtCount(sim.stats.discarded24h)} DISC
          </>
        )}
      </Cell>

      <Cell label="Crew">
        {cold
          ? "—"
          : `${fmtCount(sim.stats.visibleAnalysts)}/${fmtCount(sim.stats.trackedAnalysts)}`}
      </Cell>
    </div>
  );
}
