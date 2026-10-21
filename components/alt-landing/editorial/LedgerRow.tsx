"use client";

import Link from "@/components/motion-link";
import type { Analyst, SignalEvent } from "@/lib/sim/types";
import { fmtPct, fmtTime } from "@/lib/format";
import { TimeAgo } from "@/components/briefing/TimeAgo";
import { fmtBp } from "./fmt-bp";
import styles from "./ledger.module.css";

/**
 * One typographic ledger line: agate timestamp, handle, the post as a quoted
 * entry, and the verdict set in the margin like an editor's mark. Hover or
 * focus unfolds the annotation line underneath.
 */
export function LedgerRow({
  ev,
  analyst,
  hot,
  sweeping,
  onHot,
}: {
  ev: SignalEvent;
  analyst: Analyst | undefined;
  hot: boolean;
  sweeping: boolean;
  onHot: (ticker: string | null) => void;
}) {
  const pending = ev.stage !== "classified";
  // The engine pre-computes verdicts on in-flight events; never read one
  // before the classified stage or the reveal beat is spoiled.
  const verdict = pending ? null : ev.verdict;
  const usedTicker =
    verdict?.kind === "used" && verdict.ticker ? verdict.ticker : null;
  const delta = verdict?.weightDelta ?? 0;
  // A mixed post carries several calls; length >= 2 gets one mark per call.
  const calls = verdict?.kind === "used" ? (verdict.calls ?? []) : [];
  const mixed = calls.length > 1;

  return (
    <li
      className={[
        styles.row,
        ev.stage === "posted" ? styles.arrive : "",
        hot ? styles.rowHot : "",
        sweeping ? styles.sweep : "",
        "border-hairline grid gap-x-5 gap-y-1 border-t py-3.5 sm:grid-cols-[84px_148px_minmax(0,1fr)_148px]",
      ].join(" ")}
      onMouseEnter={() => onHot(usedTicker)}
      onMouseLeave={() => onHot(null)}
    >
      <span className="agate text-ink-muted pt-[3px]">{fmtTime(ev.ts)}</span>

      <span className="min-w-0 truncate">
        {analyst && (
          <Link
            href={`https://x.com/${analyst.handle}`}
            className="agate text-ink hover:text-cobalt-deep font-semibold underline-offset-2 hover:underline"
          >
            @{analyst.handle}
          </Link>
        )}
      </span>

      <div className="min-w-0">
        <p
          className={`line-clamp-2 text-[0.95rem] leading-snug ${
            verdict && verdict.kind !== "used"
              ? "text-ink-secondary"
              : "text-ink"
          }`}
        >
          &ldquo;{ev.text}&rdquo;
        </p>
        <div className={styles.detailWrap}>
          <div className={styles.detailInner}>
            <p className="agate text-ink-muted pt-2">
              {pending && "AWAITING ORACLE READS"}
              {verdict?.kind === "used" &&
                (mixed ? (
                  <>
                    CONFIDENCE{" "}
                    {calls
                      .map(
                        (c) =>
                          // sim-only surface: sim always fills weightDelta
                          `${c.ticker} ${fmtPct(c.confidence, 0)} (${fmtBp(c.weightDelta ?? 0)})`,
                      )
                      .join(" · ")}{" "}
                    · ORACLES AGREE {fmtPct(verdict.oracleAgreement ?? 0, 0)}
                  </>
                ) : (
                  <>
                    CONFIDENCE {fmtPct(verdict.confidence ?? 0, 0)} · ORACLES
                    AGREE {fmtPct(verdict.oracleAgreement ?? 0, 0)}
                  </>
                ))}
              {verdict?.kind === "no_call" &&
                "READ AS COMMENTARY — NO POSITION TAKEN"}
              {verdict?.kind === "discarded" && (
                <>STRUCK{verdict.reason ? `: ${verdict.reason}` : ""}</>
              )}{" "}
              · <TimeAgo ts={ev.ts} />
            </p>
          </div>
        </div>
      </div>

      <div className="sm:text-right">
        {pending && (
          <span className="agate text-pending pending-pulse italic">
            classifying…
          </span>
        )}
        {verdict?.kind === "used" &&
          verdict.ticker &&
          (mixed ? (
            // Two (or more) inked marks in the margin — one per call.
            calls.map((call) => (
              <span
                key={call.ticker}
                className="chip-land agate block font-semibold whitespace-nowrap"
              >
                <span className="text-ink">{call.action}</span>{" "}
                <Link
                  href={`/#${call.ticker}`}
                  className="text-ink hover:text-cobalt-deep underline-offset-2 hover:underline"
                >
                  {call.ticker}
                </Link>{" "}
                <span
                  // sim-only surface: sim always fills weightDelta
                  className={
                    (call.weightDelta ?? 0) > 0 ? "text-up" : "text-down"
                  }
                >
                  {fmtBp(call.weightDelta ?? 0)}
                </span>
              </span>
            ))
          ) : (
            <span className="chip-land agate font-semibold whitespace-nowrap">
              <span className="text-ink">{verdict.action}</span>{" "}
              <Link
                href={`/#${verdict.ticker}`}
                className="text-ink hover:text-cobalt-deep underline-offset-2 hover:underline"
              >
                {verdict.ticker}
              </Link>{" "}
              <span className={delta > 0 ? "text-up" : "text-down"}>
                {fmtBp(delta)}
              </span>
            </span>
          ))}
        {verdict?.kind === "no_call" && (
          <span className="chip-land agate text-ink-muted">NO CALL</span>
        )}
        {verdict?.kind === "discarded" && (
          <span className="chip-land agate text-ink-muted line-through decoration-1">
            DISCARDED
          </span>
        )}
      </div>
    </li>
  );
}
