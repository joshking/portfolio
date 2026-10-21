"use client";

import { useMemo } from "react";
import type { Analyst, SignalEvent } from "@/lib/sim/types";
import { fmtClock, fmtPct } from "@/lib/format";
import styles from "./broadcast.module.css";

const CHYRON_MAX = 14;

/**
 * Bottom-of-screen verdict crawl. Pure CSS marquee: two copies of the tape,
 * track translates -50% and loops. Pauses on hover/focus; under reduced
 * motion the crawl stops and the strip becomes plainly scrollable.
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
    <div className="sticky bottom-0 z-20 flex items-stretch border-t-2 border-[var(--bc-red)] bg-[#101117]">
      <p className="flex shrink-0 items-center gap-2 bg-[var(--bc-red)] px-3 py-2 font-mono text-[0.7rem] font-bold tracking-[0.12em] whitespace-nowrap text-white">
        VERDICT WIRE
      </p>
      <div
        className={`${styles.chyronViewport} min-w-0 flex-1`}
        tabIndex={0}
        aria-label="Recent classification verdicts — crawl pauses while hovered or focused"
      >
        {!booted || tape.length === 0 ? (
          <p className="px-4 py-2 font-mono text-[0.75rem] tracking-[0.1em] text-[var(--studio-muted)]">
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
          <span aria-hidden className="text-[var(--bc-red)]">
            ◆
          </span>
          <span className="text-[var(--studio-muted)]">{fmtClock(ev.ts)}</span>
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
  const handle = byId.get(ev.analystId)?.handle ?? "unknown";
  const v = ev.verdict;
  if (v?.kind === "used") {
    const calls = v.calls ?? [];
    // Mixed post: every call crawls by with its own direction color.
    if (calls.length > 1) {
      return (
        <>
          {calls.map((call) => (
            <span
              key={call.ticker}
              className="font-bold"
              style={{
                // sim-only surface: sim always fills weightDelta
                color:
                  (call.weightDelta ?? 0) >= 0
                    ? "var(--bc-green)"
                    : "var(--bc-red)",
              }}
            >
              {call.action} {call.ticker}
            </span>
          ))}
          <span className="text-[#c8ccd6]">@{handle}</span>
        </>
      );
    }
    const bullish = v.action === "BUY";
    return (
      <>
        <span
          className="font-bold"
          style={{ color: bullish ? "var(--bc-green)" : "var(--bc-red)" }}
        >
          {v.action} {v.ticker}
        </span>
        <span className="text-[#c8ccd6]">@{handle}</span>
        {v.confidence != null && (
          <span className="text-[var(--studio-muted)]">
            CONF {fmtPct(v.confidence, 0)}
          </span>
        )}
      </>
    );
  }
  if (v?.kind === "no_call") {
    return (
      <>
        <span className="font-bold text-[var(--studio-muted)]">NO CALL</span>
        <span className="text-[#c8ccd6]">@{handle}</span>
      </>
    );
  }
  return (
    <>
      <span className="font-bold text-[var(--studio-muted)] line-through decoration-1">
        DISCARDED
      </span>
      <span className="text-[#c8ccd6]">@{handle}</span>
    </>
  );
}
