"use client";

import { useMemo, useRef, useState } from "react";
import { useSim } from "@/lib/sim/store";
import { fmtDate, fmtSigned } from "@/lib/format";

const W = 1240;
const H = 400;
const PAD = { l: 52, r: 130, t: 44, b: 56 };

const BENCH_COLOR = "#6B7280"; // S&P 500: recessive gray, dashed (light ground)

export function PerformanceExhibit() {
  const sim = useSim();
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<number | null>(null); // index into nav

  const nav = sim.nav;
  const bench = sim.benchmark;
  // Live: the plotted series is NOT the fund's NAV (the fund has not
  // launched). It is an equal-weight composite of the tracked analysts'
  // daily portfolio returns (scout warehouse), indexed to 100 — real data,
  // labeled as the derivation it is. Sim renders the designer's copy as-is.
  const liveMode = sim.mode === "live";
  // Live plots an analyst composite, never the fund — every label on the
  // chart must say so, not just the caption (honesty rules, DESIGN.md).
  const seriesLabel = liveMode ? "Analyst composite" : "Fund";
  const showBench = bench.length > 0;
  const scale = useMemo(() => {
    if (!nav.length) return null;
    const values = [...nav.map((p) => p.value), ...bench.map((p) => p.value)];
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Guard the 1-point series (fresh live deployment): 0/0 = NaN path.
    const span = Math.max(1, nav.length - 1);
    const x = (i: number) => PAD.l + (i / span) * (W - PAD.l - PAD.r);
    const y = (v: number) =>
      PAD.t + (1 - (v - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
    return { min, max, x, y };
  }, [nav, bench]);

  const linePath = useMemo(() => {
    if (!scale || !nav.length) return "";
    return nav
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${scale.x(i).toFixed(1)},${scale.y(p.value).toFixed(1)}`,
      )
      .join("");
  }, [nav, scale]);

  const benchPath = useMemo(() => {
    if (!scale || !bench.length) return "";
    return bench
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${scale.x(i).toFixed(1)},${scale.y(p.value).toFixed(1)}`,
      )
      .join("");
  }, [bench, scale]);

  const last = nav[nav.length - 1];
  const benchLast = bench[bench.length - 1];
  const totalReturn = last ? last.value - 100 : 0;
  const benchReturn = benchLast ? benchLast.value - 100 : 0;

  // Y ticks: pick a step that yields 4–7 labeled gridlines across the domain.
  const gridValues = useMemo(() => {
    if (!scale) return [];
    const range = scale.max - scale.min;
    const step = range <= 8 ? 1 : range <= 15 ? 2 : range <= 35 ? 5 : 10;
    const lo = Math.ceil(scale.min / step) * step;
    const out: number[] = [];
    for (let v = lo; v <= scale.max; v += step) out.push(v);
    return out;
  }, [scale]);

  // X ticks: one per month boundary on the daily tape.
  const monthTicks = useMemo(() => {
    if (!nav.length) return [];
    const out: { i: number; label: string }[] = [];
    let prevMonth = new Date(nav[0].ts).getMonth();
    nav.forEach((p, i) => {
      const d = new Date(p.ts);
      if (d.getMonth() !== prevMonth) {
        prevMonth = d.getMonth();
        out.push({
          i,
          label: d.toLocaleDateString("en-US", { month: "short" }),
        });
      }
    });
    return out;
  }, [nav]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !nav.length) return;
    const box = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    const idx = Math.round(
      ((px - PAD.l) / (W - PAD.l - PAD.r)) * (nav.length - 1),
    );
    setCursor(Math.max(0, Math.min(nav.length - 1, idx)));
  };

  const cursorPoint =
    cursor !== null && scale && nav[cursor] ? nav[cursor] : null;
  const cursorBench =
    cursor !== null && scale && bench[cursor] ? bench[cursor] : null;

  // Endpoint labels: keep the fund and S&P callouts from colliding when the
  // two tapes end close together.
  const endLabels = useMemo(() => {
    if (!scale || !last || !benchLast) return null;
    const fundY = scale.y(last.value) + 5;
    let benchY = scale.y(benchLast.value) + 5;
    const gap = 18;
    if (Math.abs(fundY - benchY) < gap) {
      if (fundY <= benchY) benchY = fundY + gap;
      else benchY = fundY - gap;
    }
    return { fundY, benchY };
  }, [scale, last, benchLast]);

  return (
    <section
      aria-labelledby="perf-h"
      id="performance"
      className="pt-16 md:pt-20"
    >
      <div id="rebalance" className="mx-auto max-w-[1280px] px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-10">
          <div className="max-w-[56ch]">
            <p className="text-ink-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
              {liveMode
                ? nav.length
                  ? `Performance · ${nav.length} days, indexed to 100`
                  : "Performance · awaiting data"
                : "Performance · 180 days, indexed to 100"}
            </p>
            <h2
              id="perf-h"
              className="mt-2 max-w-[26ch] text-[clamp(1.6rem,2.6vw,2.25rem)] leading-[1.08] font-extrabold tracking-[-0.015em]"
            >
              Performance over time
            </h2>
            <p className="text-ink-secondary mt-4">
              {liveMode
                ? "The fund has not launched. This is the daily history of an equal-weight composite of the tracked analysts\u2019 own returns, indexed to 100 — a read on the signal, not a fund NAV."
                : "The model moves every minute; the fund trades once a day at 16:00 UTC, and only when accumulated drift is worth paying for. This is what that discipline produces: the DTF\u2019s daily history against the S&P 500 over the same window."}
            </p>
          </div>

          <div>
            <p className="text-ink-muted text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
              {liveMode
                ? sim.live?.navDatasetSource === "snapshot"
                  ? "Analyst composite, scout snapshot — not fund NAV"
                  : sim.live?.navDatasetSource === "prod"
                    ? "Analyst composite, scout API — not fund NAV"
                    : "Awaiting scout data"
                : "The fund, since inception (simulated)"}
            </p>
            <p
              className="mt-1 text-[clamp(3.25rem,5vw,4.5rem)] leading-none font-black tracking-[-0.02em]"
              suppressHydrationWarning
            >
              {nav.length ? fmtSigned(totalReturn, 1) : "—"}
            </p>
            {showBench && (
              <p
                className="text-ink-secondary mt-2 text-[0.9375rem]"
                suppressHydrationWarning
              >
                S&amp;P 500 over the same window:{" "}
                <span className="text-ink font-semibold">
                  {fmtSigned(benchReturn, 1)}
                </span>
              </p>
            )}
          </div>
        </div>

        <figure className="mt-10 overflow-x-auto">
          {/* Fixed-height hover readout: appears without shifting the tape. */}
          <figcaption
            className="mb-2 flex min-h-[1.5rem] flex-wrap gap-x-4 gap-y-1 text-[0.9375rem]"
            style={{ color: "var(--ink-secondary)" }}
            role="status"
          >
            {cursorPoint && (
              <>
                <span>{fmtDate(cursorPoint.ts)}</span>
                <span>
                  {seriesLabel} {cursorPoint.value.toFixed(1)}
                </span>
                {cursorBench && (
                  <span>S&amp;P 500 {cursorBench.value.toFixed(1)}</span>
                )}
                {cursorBench && (
                  <span>
                    Spread{" "}
                    {fmtSigned(
                      cursorPoint.value - cursorBench.value,
                      1,
                      " pts",
                    )}
                  </span>
                )}
              </>
            )}
          </figcaption>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[880px] cursor-crosshair"
            role="img"
            aria-label={
              liveMode
                ? `Analyst composite indexed performance, ${nav.length} days: ${last ? last.value.toFixed(1) : "—"} from 100 — not fund NAV`
                : `DTF indexed performance versus the S&P 500, 180 days: fund at ${last ? last.value.toFixed(1) : "—"}, S&P 500 at ${benchLast ? benchLast.value.toFixed(1) : "—"}, both from 100 at inception`
            }
            onMouseMove={onMove}
            onMouseLeave={() => setCursor(null)}
          >
            {scale &&
              gridValues.map((v) => (
                <g key={v}>
                  <line
                    x1={PAD.l}
                    x2={W - PAD.r}
                    y1={scale.y(v)}
                    y2={scale.y(v)}
                    stroke="var(--hairline)"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.l - 10}
                    y={scale.y(v) + 4}
                    textAnchor="end"
                    fontSize={13}
                    fill="var(--ink-muted)"
                  >
                    {v}
                  </text>
                </g>
              ))}

            {/* x axis: baseline, month ticks, time labels */}
            {scale && (
              <g>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={H - PAD.b}
                  y2={H - PAD.b}
                  stroke="var(--hairline)"
                  strokeWidth={1}
                />
                {monthTicks.map(({ i, label }) => (
                  <g key={`m-${i}`}>
                    <line
                      x1={scale.x(i)}
                      x2={scale.x(i)}
                      y1={H - PAD.b}
                      y2={H - PAD.b + 6}
                      stroke="var(--ink-muted)"
                      strokeWidth={1}
                      opacity={0.6}
                    />
                    <text
                      x={scale.x(i)}
                      y={H - PAD.b + 24}
                      textAnchor="middle"
                      fontSize={13}
                      fill="var(--ink-muted)"
                    >
                      {label}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* the benchmark, recessive: gray and dashed so identity never rests
                on color alone */}
            {scale && benchPath && (
              <path
                d={benchPath}
                fill="none"
                stroke={BENCH_COLOR}
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* the fund line */}
            {scale && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--wire-cobalt)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* endpoint labels — both tapes named at the right edge */}
            {scale && last && endLabels && (
              <g>
                <circle
                  cx={scale.x(nav.length - 1)}
                  cy={scale.y(last.value)}
                  r={4.5}
                  fill="var(--wire-cobalt)"
                  stroke="var(--paper)"
                  strokeWidth={2}
                />
                <text
                  x={scale.x(nav.length - 1) + 12}
                  y={endLabels.fundY}
                  fontSize={15}
                  fontWeight={700}
                  fill="var(--ink)"
                  stroke="var(--paper)"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {`${last.value.toFixed(1)} ${seriesLabel}`}
                </text>
              </g>
            )}
            {scale && benchLast && endLabels && (
              <g>
                <circle
                  cx={scale.x(bench.length - 1)}
                  cy={scale.y(benchLast.value)}
                  r={4}
                  fill="#6B7280"
                  stroke="var(--paper)"
                  strokeWidth={2}
                />
                <text
                  x={scale.x(bench.length - 1) + 12}
                  y={endLabels.benchY}
                  fontSize={13}
                  fontWeight={700}
                  fill="#6B7280"
                  stroke="var(--paper)"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {`${benchLast.value.toFixed(1)} S&P 500`}
                </text>
              </g>
            )}

            {/* crosshair */}
            {scale && cursorPoint && cursor !== null && (
              <g>
                <line
                  x1={scale.x(cursor)}
                  x2={scale.x(cursor)}
                  y1={PAD.t}
                  y2={H - PAD.b}
                  stroke="var(--hairline-strong)"
                  strokeWidth={1}
                />
                <circle
                  cx={scale.x(cursor)}
                  cy={scale.y(cursorPoint.value)}
                  r={5}
                  fill="var(--wire-cobalt)"
                  stroke="var(--paper)"
                  strokeWidth={2}
                />
                {cursorBench && (
                  <circle
                    cx={scale.x(cursor)}
                    cy={scale.y(cursorBench.value)}
                    r={4}
                    fill="#6B7280"
                    stroke="var(--paper)"
                    strokeWidth={2}
                  />
                )}
              </g>
            )}
          </svg>
          {/* Legend, below the graph */}
          <div className="text-ink-secondary mt-4 flex items-center justify-center gap-8 text-[0.875rem] font-medium">
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="inline-block h-[2px] w-7 rounded-full"
                style={{ background: "var(--wire-cobalt)" }}
              />
              {liveMode ? "Analyst composite" : "The fund"}
            </span>
            {showBench && (
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="inline-block h-[2px] w-7"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #6B7280 0 6px, transparent 6px 10px)",
                    backgroundSize: "10px 2px",
                    backgroundRepeat: "repeat-x",
                  }}
                />
                S&amp;P 500
              </span>
            )}
          </div>
        </figure>
      </div>
    </section>
  );
}
