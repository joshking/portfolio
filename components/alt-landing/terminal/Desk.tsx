"use client";

import Link from "@/components/motion-link";
import { useMemo } from "react";
import { useSim } from "@/lib/sim/store";
import type { Analyst, CallAction } from "@/lib/sim/types";
import { StatusStrip } from "./StatusStrip";
import { Tape } from "./Tape";
import { Ladder } from "./Ladder";
import { UntilShort } from "@/components/briefing/TimeAgo";
import styles from "./desk.module.css";

// The link between the two panels: which tape row moved which ladder row.
export interface HighlightLink {
  ticker: string;
  eventId: string;
  deltaBp: number; // signed basis points of model weight
  action: CallAction | null;
}

export type AnalystMap = Map<string, Analyst>;

export function Desk() {
  const sim = useSim();
  const cold = !sim.booted;

  const byId: AnalystMap = useMemo(
    () => new Map(sim.analysts.map((a) => [a.id, a])),
    [sim.analysts],
  );

  // highlightCalls pulses ~4s after a USED verdict — one entry per moved
  // ticker (a mixed post carries several). Trace them back to the tape row
  // that caused them so both ends of every move get the amber marker.
  const highlights = useMemo<HighlightLink[]>(() => {
    const first = sim.highlightCalls[0];
    if (!first) return [];
    const cause = sim.events.find(
      (e) =>
        e.verdict?.kind === "used" &&
        (e.verdict.ticker === first.ticker ||
          e.verdict.calls?.some((c) => c.ticker === first.ticker)),
    );
    const v = cause?.verdict;
    if (!cause || !v) return [];
    return sim.highlightCalls.map((hc) => {
      const call = v.calls?.find((c) => c.ticker === hc.ticker);
      return {
        ticker: hc.ticker,
        eventId: cause.id,
        deltaBp: Math.round(hc.weightDelta * 10000),
        action: call?.action ?? v.action ?? null,
      };
    });
  }, [sim.highlightCalls, sim.events]);

  return (
    <div className={`${styles.desk} min-h-screen font-mono`}>
      <div className={`${styles.scan} min-h-screen`}>
        <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
          {/* ------------------------------------------- desk masthead ---- */}
          <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p
              className={`${styles.glow} text-[13px] font-bold tracking-[0.14em] text-[var(--amber)] uppercase`}
            >
              NFD:4 &#9612; The Network Fund Desk
            </p>
            <p className="text-[11px] tracking-[0.08em] text-[var(--tx-mute)] uppercase">
              Signal in &middot; verdict out &middot; book moves
            </p>
            <nav className="ml-auto flex gap-4 text-[11px] tracking-[0.08em] uppercase">
              <Link
                href="/lab/network-fund/prime-time"
                className="text-[var(--tx-dim)] hover:text-[var(--amber)]"
              >
                &#8592; Variants
              </Link>
              <Link
                href="/lab"
                className="text-[var(--tx-dim)] hover:text-[var(--amber)]"
              >
                Briefing
              </Link>
            </nav>
          </header>

          <div className="mt-3">
            <StatusStrip sim={sim} />
          </div>

          {/* ------------------------------------------- the two panels --- */}
          <div className="mt-px grid gap-px border border-[var(--line)] bg-[var(--line)] lg:grid-cols-[minmax(340px,2fr)_3fr]">
            <Tape
              events={sim.events}
              inFlight={sim.inFlight}
              byId={byId}
              highlight={highlights[0] ?? null}
              cold={cold}
            />
            <Ladder
              assets={sim.assets}
              byId={byId}
              highlights={highlights}
              cold={cold}
            />
          </div>

          {/* ------------------------------------------- footer line ------ */}
          <p className="mt-2 text-[11px] leading-relaxed tracking-[0.04em] text-[var(--tx-mute)] uppercase">
            <span className="text-[var(--tx-dim)]">Protocol:</span> used calls
            accumulate in the model book &middot; the fund itself trades at the
            next rebalance
            <span className="text-[var(--amber)]" suppressHydrationWarning>
              <UntilShort ts={sim.nextRebalanceTs} prefix={" T−"} />
            </span>{" "}
            &middot; simulated feed &mdash; live wire lands with the oracle
            network
          </p>
        </div>
      </div>
    </div>
  );
}
