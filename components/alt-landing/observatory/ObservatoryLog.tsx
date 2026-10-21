"use client";

import Link from "@/components/motion-link";
import { Fragment, useMemo } from "react";
import type { Analyst, SignalEvent, SimStats } from "@/lib/sim/types";
import { fmtCount, fmtTime } from "@/lib/format";
import s from "./observatory.module.css";

const LOG_MAX = 80;

interface ObservatoryLogProps {
  events: SignalEvent[];
  inFlight: SignalEvent | null;
  analysts: Analyst[];
  stats: SimStats;
  booted: boolean;
  activeTicker: string | null;
  onHoverTicker: (ticker: string | null) => void;
}

function verdictGlyph(ev: SignalEvent): { glyph: string; cls: string } {
  if (ev.stage !== "classified") return { glyph: "…", cls: s.logGlyphPending };
  const v = ev.verdict;
  if (v?.kind === "used") {
    return (v.weightDelta ?? 0) >= 0
      ? { glyph: "▲", cls: s.logGlyphBull }
      : { glyph: "▼", cls: s.logGlyphBear };
  }
  if (v?.kind === "discarded") return { glyph: "×", cls: s.logGlyphMuted };
  return { glyph: "○", cls: s.logGlyphMuted };
}

function verdictTag(ev: SignalEvent): { tag: string; cls: string } {
  if (ev.stage !== "classified")
    return { tag: "CLASSIFYING", cls: s.logTagPending };
  const v = ev.verdict;
  if (v?.kind === "used" && v.action && v.ticker) {
    const conf =
      v.confidence !== undefined ? ` ·${Math.round(v.confidence * 100)}` : "";
    const cls = (v.weightDelta ?? 0) >= 0 ? s.logTagBull : s.logTagBear;
    return { tag: `${v.action} ${v.ticker}${conf}`, cls };
  }
  if (v?.kind === "discarded") return { tag: "DISCARDED", cls: s.logTagMuted };
  return { tag: "NO CALL", cls: s.logTagMuted };
}

/** Chronological readout beside the instrument — the accessible record of
 *  everything the ring shows. Deliberately not an aria-live region. */
export function ObservatoryLog({
  events,
  inFlight,
  analysts,
  stats,
  booted,
  activeTicker,
  onHoverTicker,
}: ObservatoryLogProps) {
  const byId = useMemo(
    () => new Map(analysts.map((a) => [a.id, a])),
    [analysts],
  );
  const rows = useMemo(() => {
    const list = inFlight ? [inFlight, ...events] : events;
    return list.slice(0, LOG_MAX);
  }, [inFlight, events]);

  return (
    <section className={s.log} aria-label="Observatory log — classified posts">
      <div className={s.logHead}>
        <h2 className={s.logTitle}>Observatory log</h2>
        <p className={s.logCounts}>
          {booted
            ? `24H · ${fmtCount(stats.used24h)} USED · ${fmtCount(stats.noCall24h)} NO CALL · ${fmtCount(stats.discarded24h)} DISC`
            : "CONNECTING…"}
        </p>
      </div>
      <ol className={s.logList}>
        {!booted &&
          Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className={s.logSkeleton} aria-hidden />
          ))}
        {rows.map((ev) => {
          const analyst = byId.get(ev.analystId);
          const { glyph, cls: glyphCls } = verdictGlyph(ev);
          const { tag, cls: tagCls } = verdictTag(ev);
          // Mixed post: one direction-colored entry per call in the tag
          // (and one glyph per call), instead of the single readout.
          const mixedCalls =
            ev.stage === "classified" &&
            ev.verdict?.kind === "used" &&
            (ev.verdict.calls?.length ?? 0) > 1
              ? (ev.verdict.calls ?? [])
              : null;
          const ticker = ev.verdict?.ticker ?? null;
          const isActive = ticker !== null && ticker === activeTicker;
          const rowCls = [
            s.logRow,
            isActive ? s.logRowActive : "",
            ev.stage === "posted" ? s.logRowPulse : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              key={ev.id}
              className={rowCls}
              onMouseEnter={() => onHoverTicker(ticker)}
              onMouseLeave={() => onHoverTicker(null)}
            >
              <span className={s.logTime}>{fmtTime(ev.ts)}</span>
              {mixedCalls ? (
                <span
                  className={s.logGlyph}
                  style={{ width: "auto" }}
                  aria-hidden
                >
                  {mixedCalls.map((c) => (
                    <span
                      key={c.ticker}
                      // sim-only surface: sim always fills weightDelta
                      className={
                        (c.weightDelta ?? 0) >= 0
                          ? s.logGlyphBull
                          : s.logGlyphBear
                      }
                    >
                      {(c.weightDelta ?? 0) >= 0 ? "▲" : "▼"}
                    </span>
                  ))}
                </span>
              ) : (
                <span className={`${s.logGlyph} ${glyphCls}`} aria-hidden>
                  {glyph}
                </span>
              )}
              <span className={s.logBody}>
                {analyst && (
                  <>
                    <Link
                      href={`https://x.com/${analyst.handle}`}
                      className={s.logHandle}
                    >
                      @{analyst.handle}
                    </Link>{" "}
                  </>
                )}
                {ev.text}
              </span>
              {mixedCalls ? (
                <span className={s.logTag}>
                  {mixedCalls.map((c, i) => (
                    <Fragment key={c.ticker}>
                      {i > 0 && " "}
                      <span
                        // sim-only surface: sim always fills weightDelta
                        className={
                          (c.weightDelta ?? 0) >= 0
                            ? s.logTagBull
                            : s.logTagBear
                        }
                      >
                        {c.action} {c.ticker} ·{Math.round(c.confidence * 100)}
                      </span>
                    </Fragment>
                  ))}
                </span>
              ) : (
                <span className={`${s.logTag} ${tagCls}`}>{tag}</span>
              )}
            </li>
          );
        })}
        {booted && (
          <li className={s.logFoot}>
            SHOWING THE LAST {Math.min(rows.length, LOG_MAX)} OF{" "}
            {fmtCount(stats.total24h)} POSTS / 24H
          </li>
        )}
      </ol>
    </section>
  );
}
