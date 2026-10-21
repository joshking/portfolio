"use client";

import Link from "@/components/motion-link";
import type { SignalEvent, Verdict } from "@/lib/sim/types";
import { fmtPct, fmtTime } from "@/lib/format";
import { TimeAgo } from "@/components/briefing/TimeAgo";
import type { AnalystMap, HighlightLink } from "./Desk";
import styles from "./desk.module.css";

const TAPE_MAX = 48;

// Orderbook-style flow of analyst posts. Each row: time / handle / verdict
// flag. Hover or keyboard focus expands the row into its full adjudication.

function bpLabel(weightDelta: number | undefined): string {
  const bp = Math.round((weightDelta ?? 0) * 10000);
  return `${bp > 0 ? "+" : ""}${bp}bp`;
}

function VerdictFlag({
  verdict,
  pending,
}: {
  verdict: Verdict | null;
  pending: boolean;
}) {
  if (pending || !verdict) {
    return (
      <span
        className={`${styles.blink} text-[11px] font-bold tracking-[0.08em] text-[var(--amber)] uppercase`}
      >
        &#9613; CLASSIFYING
      </span>
    );
  }
  if (verdict.kind === "used") {
    const calls = verdict.calls ?? [];
    // Mixed post: one compact direction flag per call — ▲NVDA ▼AMD.
    if (calls.length > 1) {
      return (
        <span className="inline-flex flex-wrap justify-end gap-x-2 text-[11px] font-bold tracking-[0.08em] uppercase">
          {calls.map((call) => (
            <span
              key={call.ticker}
              // sim-only surface: sim always fills weightDelta
              className={
                (call.weightDelta ?? 0) < 0
                  ? "text-[var(--down)]"
                  : "text-[var(--up)]"
              }
            >
              {(call.weightDelta ?? 0) < 0 ? "▼" : "▲"}
              <Link
                href={`/#${call.ticker}`}
                className="underline decoration-dotted underline-offset-2 hover:text-[var(--amber)]"
              >
                {call.ticker}
              </Link>
            </span>
          ))}
        </span>
      );
    }
    const bearish = (verdict.weightDelta ?? 0) < 0;
    const color = bearish ? "text-[var(--down)]" : "text-[var(--up)]";
    return (
      <span
        className={`text-[11px] font-bold tracking-[0.08em] uppercase ${color}`}
      >
        {bearish ? "▼" : "▲"} {verdict.action}{" "}
        {verdict.ticker ? (
          <Link
            href={`/#${verdict.ticker}`}
            className="underline decoration-dotted underline-offset-2 hover:text-[var(--amber)]"
          >
            {verdict.ticker}
          </Link>
        ) : null}
      </span>
    );
  }
  if (verdict.kind === "no_call") {
    return (
      <span className="text-[11px] tracking-[0.08em] text-[var(--tx-dim)] uppercase">
        &middot; NO CALL
      </span>
    );
  }
  return (
    <span className="text-[11px] tracking-[0.08em] text-[var(--tx-mute)] uppercase line-through decoration-[var(--tx-mute)]">
      DISCARDED
    </span>
  );
}

function TapeRow({
  ev,
  byId,
  isCause,
}: {
  ev: SignalEvent;
  byId: AnalystMap;
  isCause: boolean;
}) {
  const analyst = byId.get(ev.analystId);
  const pending = ev.stage !== "classified";
  const v = ev.verdict;

  return (
    <li
      data-tape-id={ev.id}
      className={`group border-b border-[var(--line)] px-2.5 py-1.5 ${
        ev.stage === "posted" ? styles.tapeArrive : ""
      } ${isCause ? styles.causeRow : "border-l-2 border-l-transparent"}`}
    >
      <div className="flex items-baseline gap-2.5">
        <span className="shrink-0 text-[10px] text-[var(--tx-mute)]">
          {fmtTime(ev.ts)}
        </span>
        {analyst ? (
          <Link
            href={`https://x.com/${analyst.handle}`}
            className="shrink-0 text-[11px] font-semibold text-[var(--tx-dim)] hover:text-[var(--amber)]"
          >
            @{analyst.handle}
          </Link>
        ) : null}
        <span className="ml-auto shrink-0">
          <VerdictFlag verdict={v} pending={pending} />
        </span>
        {isCause && (
          <span
            className="shrink-0 text-[10px] font-bold tracking-[0.08em] text-[var(--amber)] uppercase"
            aria-hidden
          >
            &#9656; BOOK
          </span>
        )}
      </div>
      <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-[var(--tx)] opacity-70 group-focus-within:line-clamp-none group-focus-within:opacity-100 group-hover:line-clamp-none group-hover:opacity-100">
        {ev.text}
      </p>
      {/* Expanded adjudication detail — hover / focus only. */}
      <div className="mt-1 hidden flex-wrap gap-x-4 gap-y-0.5 text-[10px] tracking-[0.1em] text-[var(--tx-mute)] uppercase group-focus-within:flex group-hover:flex">
        <span suppressHydrationWarning>
          <TimeAgo ts={ev.ts} />
        </span>
        {/* sim-only surface: sim always fills score */}
        {analyst && <span>SCR {Math.round(analyst.score ?? 0)}</span>}
        {v?.kind === "used" &&
          ((v.calls?.length ?? 0) > 1 ? (
            <>
              {v.calls?.map((call) => (
                <span
                  key={call.ticker}
                  // sim-only surface: sim always fills weightDelta
                  className={
                    (call.weightDelta ?? 0) < 0
                      ? "text-[var(--down)]"
                      : "text-[var(--up)]"
                  }
                >
                  {call.ticker} CONF {fmtPct(call.confidence, 0)}{" "}
                  {bpLabel(call.weightDelta ?? 0)}
                </span>
              ))}
              {v.oracleAgreement !== undefined && (
                <span>ORACLES {fmtPct(v.oracleAgreement, 0)} AGREE</span>
              )}
            </>
          ) : (
            <>
              {v.confidence !== undefined && (
                <span>CONF {fmtPct(v.confidence, 0)}</span>
              )}
              <span
                className={
                  (v.weightDelta ?? 0) < 0
                    ? "text-[var(--down)]"
                    : "text-[var(--up)]"
                }
              >
                IMPACT {bpLabel(v.weightDelta ?? 0)}
              </span>
              {v.oracleAgreement !== undefined && (
                <span>ORACLES {fmtPct(v.oracleAgreement, 0)} AGREE</span>
              )}
            </>
          ))}
        {v?.kind === "no_call" && (
          <span>SIGNAL WITHOUT AN ACTIONABLE CALL</span>
        )}
        {v?.kind === "discarded" && v.reason && <span>{v.reason}</span>}
        {pending && <span>ORACLE NETWORK VOTING&hellip;</span>}
      </div>
    </li>
  );
}

export function Tape({
  events,
  inFlight,
  byId,
  highlight,
  cold,
}: {
  events: SignalEvent[];
  inFlight: SignalEvent | null;
  byId: AnalystMap;
  highlight: HighlightLink | null;
  cold: boolean;
}) {
  const rows = (inFlight ? [inFlight, ...events] : events).slice(0, TAPE_MAX);

  return (
    <section
      aria-label="Signal tape — live analyst posts and their verdicts"
      className="flex min-w-0 flex-col bg-[var(--panel)]"
    >
      <header className="flex items-baseline justify-between border-b border-[var(--line-strong)] px-2.5 py-2">
        <h2 className="text-[11px] font-bold tracking-[0.16em] text-[var(--tx)] uppercase">
          <span className="text-[var(--amber)]">&#9612;</span> TAPE / SIGNAL
          WIRE
        </h2>
        <span className="text-[10px] tracking-[0.12em] text-[var(--tx-mute)] uppercase">
          {cold
            ? "NO CARRIER"
            : `LAST ${Math.min(rows.length, TAPE_MAX)} TICKS`}
        </span>
      </header>

      <div className="relative min-h-[320px] flex-1">
        <div
          className="absolute inset-0 [scrollbar-width:thin] overflow-y-auto max-lg:static max-lg:max-h-[55vh]"
          tabIndex={0}
          aria-label="Tape history — scroll for older posts"
        >
          <ol>
            {cold &&
              Array.from({ length: 10 }).map((_, i) => (
                <li
                  key={i}
                  className="border-b border-[var(--line)] px-2.5 py-2"
                  aria-hidden
                >
                  <div className="h-3 w-2/3 bg-[var(--panel-2)] motion-safe:animate-pulse" />
                  <div className="mt-1.5 h-3 w-full bg-[var(--panel-2)] motion-safe:animate-pulse" />
                </li>
              ))}
            {rows.map((ev) => (
              <TapeRow
                key={ev.id}
                ev={ev}
                byId={byId}
                isCause={highlight?.eventId === ev.id}
              />
            ))}
            {!cold && (
              <li className="px-2.5 py-2 text-center text-[10px] tracking-[0.12em] text-[var(--tx-mute)] uppercase">
                END OF TAPE BUFFER
              </li>
            )}
          </ol>
        </div>
      </div>
    </section>
  );
}
