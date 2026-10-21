"use client";

import Link from "@/components/motion-link";
import { Fragment } from "react";
import type { Analyst, SignalEvent } from "@/lib/sim/types";
import { fmtPct, fmtSignedPp } from "@/lib/format";
import { TimeAgo } from "@/components/briefing/TimeAgo";
import styles from "./organism.module.css";

const FEED_CAP = 28;

// Slim stimuli column: compact cards, newest on top. Deliberately quiet next
// to the habitat — no aria-live, the list is readable on demand.
export function SignalFeed({
  events,
  inFlight,
  analystsById,
  cold,
  onFocusTicker,
}: {
  events: SignalEvent[];
  inFlight: SignalEvent | null;
  analystsById: Map<string, Analyst>;
  cold: boolean;
  onFocusTicker: (ticker: string | null) => void;
}) {
  const feed = (inFlight ? [inFlight, ...events] : events).slice(0, FEED_CAP);
  return (
    <section className={styles.feed} aria-label="Inbound analyst signals">
      <div className={styles.feedHead}>
        <h2 className={styles.feedTitle}>
          <span className={styles.pulseDot} aria-hidden />
          STIMULI
        </h2>
        <span className={styles.feedNote}>NEWEST FIRST</span>
      </div>
      <ol className={styles.feedList}>
        {cold
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className={styles.skeleton} aria-hidden />
            ))
          : feed.map((ev) => (
              <FeedCard
                key={ev.id}
                event={ev}
                analyst={analystsById.get(ev.analystId) ?? null}
                onFocusTicker={onFocusTicker}
              />
            ))}
      </ol>
    </section>
  );
}

function FeedCard({
  event,
  analyst,
  onFocusTicker,
}: {
  event: SignalEvent;
  analyst: Analyst | null;
  onFocusTicker: (ticker: string | null) => void;
}) {
  const v = event.stage === "classified" ? event.verdict : null;
  const rejected = v?.kind === "no_call" || v?.kind === "discarded";
  return (
    <li className={`${styles.card} ${rejected ? styles.cardDim : ""}`}>
      <div className={styles.cardTop}>
        {analyst ? (
          <Link
            href={`https://x.com/${analyst.handle}`}
            className={styles.cardHandle}
          >
            @{analyst.handle}
          </Link>
        ) : (
          <span className={styles.cardHandle}>@—</span>
        )}
        <span className={styles.cardTime} suppressHydrationWarning>
          <TimeAgo ts={event.ts} />
        </span>
      </div>
      <p className={styles.cardText}>{event.text}</p>
      <p className={styles.cardVerdict}>
        {!v && <span className={styles.verdictPending}>METABOLIZING…</span>}
        {v?.kind === "used" &&
          v.ticker &&
          ((v.calls?.length ?? 0) > 1 ? (
            // Mixed post: one bull/bear pill per call, each with its own move.
            v.calls?.map((call) => (
              <Fragment key={call.ticker}>
                <Link
                  href={`/#${call.ticker}`}
                  // sim-only surface: sim always fills weightDelta
                  className={`${styles.verdictCall} ${
                    (call.weightDelta ?? 0) < 0
                      ? styles.verdictCallBear
                      : styles.verdictCallBull
                  }`}
                  onMouseEnter={() => onFocusTicker(call.ticker)}
                  onMouseLeave={() => onFocusTicker(null)}
                  onFocus={() => onFocusTicker(call.ticker)}
                  onBlur={() => onFocusTicker(null)}
                  aria-label={`${call.action} ${call.ticker} — view asset`}
                >
                  {call.action} {call.ticker}
                </Link>
                <span className={styles.verdictMeta}>
                  {fmtSignedPp(call.weightDelta ?? 0)} ·{" "}
                  {fmtPct(call.confidence, 0)} CONF
                </span>
              </Fragment>
            ))
          ) : (
            <>
              <Link
                href={`/#${v.ticker}`}
                className={`${styles.verdictCall} ${
                  (v.weightDelta ?? 0) < 0
                    ? styles.verdictCallBear
                    : styles.verdictCallBull
                }`}
                onMouseEnter={() => onFocusTicker(v.ticker ?? null)}
                onMouseLeave={() => onFocusTicker(null)}
                onFocus={() => onFocusTicker(v.ticker ?? null)}
                onBlur={() => onFocusTicker(null)}
                aria-label={`${v.action} ${v.ticker} — view asset`}
              >
                {v.action} {v.ticker}
              </Link>
              <span className={styles.verdictMeta}>
                {fmtSignedPp(v.weightDelta ?? 0)}
                {v.confidence != null && ` · ${fmtPct(v.confidence, 0)} CONF`}
              </span>
            </>
          ))}
        {v?.kind === "no_call" && (
          <span className={styles.verdictNull}>NO CALL — DISSOLVES</span>
        )}
        {v?.kind === "discarded" && (
          <>
            <span className={styles.verdictDiscarded}>DISCARDED</span>
            {v.reason && (
              <span className={styles.verdictReason}>{v.reason}</span>
            )}
          </>
        )}
      </p>
    </li>
  );
}
