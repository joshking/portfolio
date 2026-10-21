"use client";

import { useMemo } from "react";
import type { Analyst, SignalEvent } from "@/lib/sim/types";
import { fmtClock, fmtPct } from "@/lib/format";
import styles from "./primetime.module.css";

const CHYRON_MAX = 14;

/**
 * The verdict crawl. Pure CSS marquee: two copies of the tape, track
 * translates -50% and loops. Pauses on hover/focus; under reduced motion the
 * crawl stops and the strip becomes plainly scrollable. Positioning belongs
 * to the wire dock in PrimeTimeStudio (top-stuck, scroll-aware).
 */
export function Chyron({
  events,
  analysts,
  booted,
}: {
  events: SignalEvent[];
  analysts: Analyst[];
  booted: boolean;
}) {
  const byId = useMemo(
    () => new Map(analysts.map((a) => [a.id, a])),
    [analysts],
  );
  const tape = useMemo(
    () => events.filter((e) => e.stage === "classified").slice(0, CHYRON_MAX),
    [events],
  );

  return (
    <div className="flex items-stretch border-b-2 border-[var(--pt-accent-strong)] bg-[var(--pt-chyron-bg)]">
      <p className="flex shrink-0 items-center gap-2 bg-[var(--pt-accent-strong)] px-3 py-2 font-mono text-[0.7rem] font-bold tracking-[0.12em] whitespace-nowrap text-[var(--pt-on-brand)]">
        VERDICT WIRE
      </p>
      <div
        className={`${styles.chyronViewport} min-w-0 flex-1`}
        tabIndex={0}
        aria-label="Recent classification verdicts — crawl pauses while hovered or focused"
      >
        {!booted || tape.length === 0 ? (
          <p className="px-4 py-2 font-mono text-[0.75rem] tracking-[0.1em] text-[var(--pt-muted)]">
            STAND BY &mdash; ACQUIRING SIGNAL
          </p>
        ) : (
          <div className={styles.chyronTrack}>
            <ChyronTape tape={tape} byId={byId} />
            <ChyronTape tape={tape} byId={byId} ghost />
          </div>
        )}
      </div>
    </div>
  );
}

function ChyronTape({
  tape,
  byId,
  ghost = false,
}: {
  tape: SignalEvent[];
  byId: Map<string, Analyst>;
  ghost?: boolean;
}) {
  return (
    <ul
      className={`flex items-center whitespace-nowrap ${ghost ? styles.chyronCopy : ""}`}
      aria-hidden={ghost || undefined}
    >
      {tape.map((ev) => (
        <li
          key={ev.id}
          className="flex items-center gap-2 px-4 py-2 font-mono text-[0.75rem] tabular-nums"
        >
          <span aria-hidden className="text-[var(--pt-accent)]">
            ◆
          </span>
          <span className="text-[var(--pt-muted)]" suppressHydrationWarning>
            {fmtClock(ev.ts)}
          </span>
          <ChyronItem ev={ev} byId={byId} />
        </li>
      ))}
    </ul>
  );
}

function ChyronItem({
  ev,
  byId,
}: {
  ev: SignalEvent;
  byId: Map<string, Analyst>;
}) {
  // Live cards may not have resolved their author yet — omit the handle
  // rather than inventing one.
  const handle = byId.get(ev.analystId)?.handle ?? null;
  const at = handle ? (
    <span className="text-[var(--pt-body)]">@{handle}</span>
  ) : null;
  const v = ev.verdict;
  if (v?.kind === "used") {
    const calls =
      v.calls && v.calls.length > 0
        ? v.calls
        : v.ticker
          ? [{ action: v.action ?? "BUY", ticker: v.ticker }]
          : [];
    return (
      <>
        {calls.map((call) => (
          <span
            key={call.ticker}
            className="font-bold"
            style={{
              // Direction comes from the action, never from a delta sign.
              color:
                call.action === "BUY" ? "var(--pt-green)" : "var(--pt-red)",
            }}
          >
            {call.action} {call.ticker}
          </span>
        ))}
        {calls.length === 0 && (
          <span className="font-bold text-[var(--pt-green)]">USED</span>
        )}
        {at}
        {v.confidence != null && (
          <span className="text-[var(--pt-muted)]">
            CONF {fmtPct(v.confidence, 0)}
          </span>
        )}
      </>
    );
  }
  if (v?.kind === "review") {
    return (
      <>
        <span className="font-bold text-[var(--pt-gold)]">AMBIGUOUS</span>
        {at}
      </>
    );
  }
  if (v?.kind === "no_call") {
    return (
      <>
        <span className="font-bold text-[var(--pt-muted)]">NO CALL</span>
        {at}
      </>
    );
  }
  return (
    <>
      <span className="font-bold text-[var(--pt-muted)] line-through decoration-1">
        DISCARDED
      </span>
      {at}
    </>
  );
}
