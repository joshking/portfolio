"use client";

import Link from "@/components/motion-link";
import type { Analyst, SignalEvent, Verdict } from "@/lib/sim/types";
import { fmtPct, fmtSignedPp } from "@/lib/format";
import { TimeAgo } from "@/components/briefing/TimeAgo";
import { Avatar } from "@/components/briefing/Avatar";
import styles from "./broadcast.module.css";

function accentColor(event: SignalEvent): string {
  const v = event.verdict;
  if (event.stage !== "classified" || !v) return "var(--bc-gold)";
  if (v.kind === "used")
    return v.action === "BUY" ? "var(--bc-green)" : "var(--bc-red)";
  return "var(--studio-line)";
}

/** One breaking-news card: analyst strap, the post, and its verdict flag. */
export function LowerThird({
  event,
  analyst,
  delayMs = 0,
}: {
  event: SignalEvent;
  analyst: Analyst | undefined;
  delayMs?: number;
}) {
  return (
    <li
      className={`${styles.cutIn} relative border border-[var(--studio-line)] bg-[var(--studio-panel)] p-3 pl-4`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accentColor(event) }}
      />
      <div className="flex items-center gap-2">
        {analyst && <Avatar analyst={analyst} size={22} />}
        {analyst && (
          <Link
            href={`https://x.com/${analyst.handle}`}
            className="font-mono text-[0.75rem] font-semibold text-[var(--studio-text)] underline-offset-2 hover:text-[var(--bc-gold)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-gold)]"
          >
            @{analyst.handle}
          </Link>
        )}
        {analyst && (
          <span className="font-mono text-[0.68rem] tracking-[0.06em] text-[var(--studio-muted)]">
            {/* sim-only surface: sim always fills score */}
            SCORE {Math.round(analyst.score ?? 0)}
          </span>
        )}
        <span
          className="ml-auto font-mono text-[0.7rem] text-[var(--studio-muted)] tabular-nums"
          suppressHydrationWarning
        >
          <TimeAgo ts={event.ts} />
        </span>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[0.875rem] leading-snug text-[#c8ccd6]">
        {event.text}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <VerdictFlag
          verdict={event.stage === "classified" ? event.verdict : null}
        />
      </div>
    </li>
  );
}

/** Skewed on-air flag — the classification verdict as a broadcast strap. */
function VerdictFlag({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <span className="inline-flex -skew-x-6 items-center gap-1.5 border border-[var(--bc-gold)] px-2 py-0.5">
        <span className="inline-flex skew-x-6 items-center gap-1.5 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--bc-gold)]">
          <span
            aria-hidden
            className={`${styles.classifyPulse} inline-block h-1.5 w-1.5 rounded-full bg-[var(--bc-gold)]`}
          />
          <span className={styles.classifyPulse}>ANALYZING&hellip;</span>
        </span>
      </span>
    );
  }
  if (verdict.kind === "used") {
    const calls = verdict.calls ?? [];
    // Mixed post: one direction-colored strap per call, each with its own
    // confidence and weight move.
    if (calls.length > 1) {
      return (
        <>
          {calls.map((call, i) => {
            const up = (call.weightDelta ?? 0) >= 0; // sim-only surface
            const dirColor = up ? "var(--bc-green)" : "var(--bc-red)";
            return (
              <span
                key={call.ticker}
                className="inline-flex flex-wrap items-center gap-2"
              >
                <span
                  className="inline-block -skew-x-6 px-2 py-0.5"
                  style={{ background: dirColor }}
                >
                  <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[#0c0d12]">
                    {i === 0 ? "USED · " : ""}
                    {call.action} {call.ticker}
                  </span>
                </span>
                <span
                  className="font-mono text-[0.7rem] font-bold tracking-[0.06em] tabular-nums"
                  style={{ color: dirColor }}
                >
                  {fmtSignedPp(call.weightDelta ?? 0)}
                </span>
                <span className="font-mono text-[0.7rem] tracking-[0.06em] text-[var(--studio-muted)] tabular-nums">
                  CONF {fmtPct(call.confidence, 0)}
                </span>
              </span>
            );
          })}
        </>
      );
    }
    const bullish = verdict.action === "BUY";
    return (
      <>
        <span
          className="inline-block -skew-x-6 px-2 py-0.5"
          style={{
            background: bullish ? "var(--bc-green)" : "var(--bc-red)",
          }}
        >
          <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[#0c0d12]">
            USED &middot; {verdict.action} {verdict.ticker}
          </span>
        </span>
        {verdict.confidence != null && (
          <span className="font-mono text-[0.7rem] tracking-[0.06em] text-[var(--studio-muted)] tabular-nums">
            CONF {fmtPct(verdict.confidence, 0)}
          </span>
        )}
        {verdict.weightDelta != null && (
          <span
            className="font-mono text-[0.7rem] font-bold tracking-[0.06em] tabular-nums"
            style={{
              color:
                verdict.weightDelta >= 0 ? "var(--bc-green)" : "var(--bc-red)",
            }}
          >
            {fmtSignedPp(verdict.weightDelta)}
          </span>
        )}
      </>
    );
  }
  if (verdict.kind === "no_call") {
    return (
      <span className="inline-block -skew-x-6 border border-[var(--studio-line)] px-2 py-0.5">
        <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--studio-muted)]">
          NO CALL
        </span>
      </span>
    );
  }
  return (
    <>
      <span className="inline-block -skew-x-6 border border-[var(--studio-line)] px-2 py-0.5">
        <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--studio-muted)] line-through decoration-1">
          DISCARDED
        </span>
      </span>
      {verdict.reason && (
        <span className="font-mono text-[0.68rem] text-[var(--studio-muted)]">
          {verdict.reason.toUpperCase()}
        </span>
      )}
    </>
  );
}
