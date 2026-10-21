"use client";

import { useEffect, useMemo, useState } from "react";
import { useSim } from "@/lib/sim/store";
import { useNow } from "@/lib/use-now";
import { DRIFT_THRESHOLD } from "@/lib/sim/engine";
import {
  fmtCount,
  fmtDate,
  fmtPct,
  fmtSignedPp,
  untilShort,
} from "@/lib/format";

export function DriftSection() {
  const sim = useSim();
  const now = useNow();
  const [replayStep, setReplayStep] = useState(-1); // -1 idle; else index into moves

  const liveMode = sim.mode === "live";
  const driftPct = sim.driftPct; // null in live mode: drift is unmeasured
  const lastRebalance = sim.rebalances[0] ?? null;

  useEffect(() => {
    if (replayStep < 0 || !lastRebalance) return;
    if (replayStep >= lastRebalance.moves.length) {
      const t = setTimeout(() => setReplayStep(-1), 2600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setReplayStep((s) => s + 1), 620);
    return () => clearTimeout(t);
  }, [replayStep, lastRebalance]);

  const drifted = useMemo(
    () =>
      [...sim.assets]
        .sort(
          (a, b) =>
            Math.abs(b.targetWeight - b.weight) -
            Math.abs(a.targetWeight - a.weight),
        )
        .slice(0, 8),
    [sim.assets],
  );
  const maxW = Math.max(
    ...drifted.map((a) => Math.max(a.weight, a.targetWeight)),
    0.01,
  );

  return (
    <section
      aria-labelledby="drift-h"
      id="rebalance"
      className="mx-auto max-w-[1280px] scroll-mt-24 px-5"
    >
      <div className="rule-strong pt-3">
        <p className="kicker">DRIFT &amp; REBALANCE · DAILY AT 16:00 UTC</p>
        <h2
          id="drift-h"
          className="text-ink mt-2 max-w-[26ch] text-[clamp(1.6rem,2.6vw,2.25rem)] leading-[1.08] font-extrabold tracking-[-0.015em]"
        >
          The model moves every minute. The fund trades once a day.
        </h2>
      </div>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,42ch)_1fr]">
        <div className="text-ink-secondary">
          <p>
            Every accepted call nudges the{" "}
            <strong className="text-ink font-semibold">model portfolio</strong>{" "}
            &mdash; the basket the signals want. The{" "}
            <strong className="text-ink font-semibold">fund</strong> itself
            holds yesterday&rsquo;s decision until the scheduled daily
            rebalance, and trades only when the gap between the two is worth
            paying for.
          </p>
          <p className="mt-4">
            {/* live: drift is unmeasured (null) — the sentence says so in
                plain words; a bare "—" mid-prose reads as a rendering bug */}
            {driftPct === null ? (
              <>
                That gap is <em>drift</em>. Right now it is not yet measured;
                the fund trades only when the gap clears the{" "}
                {DRIFT_THRESHOLD.toFixed(2)}% trading threshold.
              </>
            ) : (
              <>
                That gap is <em>drift</em>. Right now it is{" "}
                <span
                  className="agate text-ink font-semibold"
                  suppressHydrationWarning
                >
                  {`${driftPct.toFixed(2)}%`}
                </span>{" "}
                against a {DRIFT_THRESHOLD.toFixed(2)}% trading threshold.
              </>
            )}
          </p>

          <div className="plate mt-6 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="kicker">ACCUMULATED DRIFT</p>
              <p className="agate text-ink-muted" suppressHydrationWarning>
                NEXT REBALANCE{" "}
                {/* live: no rebalance clock exists — no countdown, no dash */}
                {sim.nextRebalanceTs > 0
                  ? `${
                      now ? `IN ${untilShort(sim.nextRebalanceTs, now)}` : "—"
                    } · 16:00 UTC`
                  : "16:00 UTC"}
              </p>
            </div>
            {driftPct === null ? (
              <p className="agate text-ink-muted mt-3">NOT YET MEASURED</p>
            ) : (
              <>
                <div className="relative mt-3 h-[14px] overflow-hidden rounded-[2px] bg-[#EBEBE6]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[2px] transition-[width] duration-700"
                    style={{
                      width: `${Math.min(100, (driftPct / (DRIFT_THRESHOLD * 2)) * 100)}%`,
                      background:
                        driftPct >= DRIFT_THRESHOLD
                          ? "var(--wire-cobalt)"
                          : "#B9C2F4",
                    }}
                  />
                  <span
                    className="bg-ink absolute inset-y-0 w-[2px]"
                    style={{ left: "50%" }}
                    title={`Threshold ${DRIFT_THRESHOLD}%`}
                  />
                </div>
                <p
                  className="agate text-ink-secondary mt-2"
                  suppressHydrationWarning
                >
                  {driftPct >= DRIFT_THRESHOLD
                    ? "ABOVE THRESHOLD — THE NEXT 16:00 UTC REBALANCE WILL TRADE"
                    : "BELOW THRESHOLD — THE NEXT REBALANCE MAY SKIP"}
                </p>
              </>
            )}
          </div>

          {lastRebalance && (
            <div className="plate mt-4 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="kicker">
                  LAST REBALANCE — {fmtDate(lastRebalance.ts).toUpperCase()}{" "}
                  16:00 UTC
                </p>
                <button
                  onClick={() => setReplayStep(0)}
                  disabled={replayStep >= 0}
                  className="agate border-hairline text-ink hover:text-cobalt-deep focus-visible:outline-cobalt rounded-[3px] border px-2.5 py-1 transition-colors hover:border-[rgba(41,70,232,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                >
                  {replayStep >= 0 ? "REPLAYING…" : "REPLAY ▸"}
                </button>
              </div>
              <p className="agate text-ink-muted mt-1">
                {fmtCount(lastRebalance.signalsUsed)} SIGNALS ACCUMULATED ·
                DRIFT {lastRebalance.driftBefore}% AT CLOSE
              </p>
              <ul className="agate mt-3 flex flex-col gap-1.5">
                {lastRebalance.moves.map((m, i) => {
                  const active = replayStep >= 0 && i === replayStep;
                  const done = replayStep < 0 || i < replayStep;
                  const delta = m.to - m.from;
                  return (
                    <li
                      key={m.ticker}
                      className="flex items-center gap-3 transition-opacity duration-300"
                      style={{ opacity: done || active ? 1 : 0.25 }}
                    >
                      <span
                        className={`w-14 font-semibold ${active ? "text-cobalt-deep" : "text-ink"}`}
                      >
                        {m.ticker}
                      </span>
                      <span className="text-ink-muted">{fmtPct(m.from)}</span>
                      <span aria-hidden className="text-ink-muted">
                        →
                      </span>
                      <span className="text-ink">{fmtPct(m.to)}</span>
                      <span
                        className={`ml-auto font-semibold ${delta >= 0 ? "text-up" : "text-down"}`}
                      >
                        {fmtSignedPp(delta)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* live: no committed fund basket exists — every fund-vs-model bar
            would be a fabricated zero drift, so the whole exhibit hides. */}
        {liveMode ? null : (
          <div>
            <h3 className="title border-ink border-b-2 pb-2">
              Largest open drifts: fund (ink) vs model (cobalt tick)
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {drifted.map((a) => {
                const delta = a.targetWeight - a.weight;
                return (
                  <li
                    key={a.ticker}
                    className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-3"
                  >
                    <span className="agate text-ink font-semibold">
                      {a.ticker}
                    </span>
                    <span className="relative block h-[18px]">
                      <span className="absolute inset-y-[3px] left-0 w-full rounded-r-[2px] bg-[#EBEBE6]" />
                      <span
                        className="bg-ink absolute inset-y-[3px] left-0 rounded-r-[2px] transition-[width] duration-700"
                        style={{ width: `${(a.weight / maxW) * 100}%` }}
                      />
                      <span
                        className="bg-cobalt absolute top-0 h-full w-[3px] transition-[left] duration-700"
                        style={{
                          left: `calc(${(a.targetWeight / maxW) * 100}% - 1px)`,
                        }}
                      />
                    </span>
                    <span
                      className={`agate text-right font-semibold ${delta >= 0 ? "text-up" : "text-down"}`}
                    >
                      {fmtSignedPp(delta)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="agate text-ink-muted mt-4">
              EACH ACCEPTED CALL MOVES A COBALT TICK. THE INK BAR MOVES ONLY AT
              16:00 UTC.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
