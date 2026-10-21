"use client";

import Link from "@/components/motion-link";
import { useMemo, useState } from "react";
import type { Analyst, Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned, fmtSignedPp } from "@/lib/format";
import styles from "./broadcast.module.css";

// Deterministic studio color per ticker — muted enough that the red/gold
// broadcast accents stay the loudest things on screen.
function tickerHue(ticker: string): number {
  let h = 0;
  for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * The basket as a 100% stacked composition bar. Widths re-flow as the model
 * weights move; the segment a USED verdict just hit strobes gold and carries
 * a directional badge. Hover/focus a segment to read its full card below;
 * click to open the asset page.
 */
export function CompositionBar({
  assets,
  analysts,
  highlightCalls,
}: {
  assets: Asset[];
  analysts: Analyst[];
  highlightCalls: { ticker: string; weightDelta: number }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  // A landing verdict steals the spotlight: detail card cuts to that asset
  // (the primary target of a mixed post).
  // State adjustment during render (not an effect) per React guidance.
  const primaryTicker = highlightCalls[0]?.ticker ?? null;
  const [prevHighlight, setPrevHighlight] = useState<string | null>(null);
  if (primaryTicker !== prevHighlight) {
    setPrevHighlight(primaryTicker);
    if (primaryTicker) setSelected(primaryTicker);
  }

  const byId = useMemo(
    () => new Map(analysts.map((a) => [a.id, a])),
    [analysts],
  );
  const total = assets.reduce((s, a) => s + a.targetWeight, 0) || 1;
  const topHolding = useMemo(
    () =>
      assets.length
        ? [...assets].sort((a, b) => b.targetWeight - a.targetWeight)[0]
        : null,
    [assets],
  );
  const sel = assets.find((a) => a.ticker === selected) ?? topHolding;

  return (
    <div>
      {/* Room above the bar for the directional badge. */}
      <div className="relative mt-9 flex h-16 w-full">
        {assets.map((a) => {
          const hotCall = highlightCalls.find((hc) => hc.ticker === a.ticker);
          const hot = hotCall !== undefined;
          const widthPct = (a.targetWeight / total) * 100;
          return (
            <Link
              key={a.ticker}
              href={`/#${a.ticker}`}
              onMouseEnter={() => setSelected(a.ticker)}
              onFocus={() => setSelected(a.ticker)}
              aria-label={`${a.ticker} — ${a.name}: target weight ${fmtPct(a.targetWeight)}, ${fmtSigned(a.dayMove ?? 0, 1)} today. Open asset page.`}
              className={`${styles.seg} ${hot ? styles.segFlash : ""} relative flex min-w-0 items-center justify-center border-r border-[#0c0d12] last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-gold)]`}
              style={{
                width: `${widthPct}%`,
                background: `oklch(0.5 0.09 ${tickerHue(a.ticker)})`,
              }}
            >
              {widthPct >= 4.5 && (
                <span className="min-w-0 truncate px-1 font-mono text-[0.7rem] font-bold tracking-[0.04em] text-white/90">
                  {a.ticker}
                </span>
              )}
              {hotCall && (
                <span
                  className={`${styles.calloutIn} absolute -top-8 left-1/2 z-10 -translate-x-1/2 bg-[var(--bc-gold)] px-2 py-0.5 font-mono text-[0.7rem] font-bold whitespace-nowrap text-[#0c0d12] tabular-nums`}
                >
                  {hotCall.weightDelta >= 0 ? "▲" : "▼"}{" "}
                  {fmtSignedPp(hotCall.weightDelta)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[0.68rem] tracking-[0.08em] text-[var(--studio-muted)] uppercase">
        Full bar = 100% of the model &middot; segment = target weight &middot;
        hover or tab for the card, click to open the asset
      </p>

      {sel && (
        <div className="mt-4 grid gap-x-6 gap-y-3 border border-[var(--studio-line)] bg-[var(--studio-panel)] p-4 sm:grid-cols-[auto_1fr]">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-1 inline-block h-8 w-2"
              style={{
                background: `oklch(0.5 0.09 ${tickerHue(sel.ticker)})`,
              }}
            />
            <div>
              <p className="text-[1.6rem] leading-none font-black tracking-[-0.02em]">
                {sel.ticker}
              </p>
              <p className="mt-1 font-mono text-[0.7rem] tracking-[0.06em] text-[var(--studio-muted)] uppercase">
                {sel.name} &middot; {sel.sector}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.75rem] tabular-nums">
            <span>
              <span className="text-[var(--studio-muted)]">TARGET </span>
              <span className="font-bold">{fmtPct(sel.targetWeight)}</span>
            </span>
            <span>
              <span className="text-[var(--studio-muted)]">HELD </span>
              <span className="font-bold">{fmtPct(sel.weight)}</span>
            </span>
            <span>
              <span className="text-[var(--studio-muted)]">TODAY </span>
              <span
                className="font-bold"
                style={{
                  // sim-only surface: sim always fills dayMove
                  color:
                    (sel.dayMove ?? 0) >= 0
                      ? "var(--bc-green)"
                      : "var(--bc-red)",
                }}
              >
                {fmtSigned(sel.dayMove ?? 0, 1)}
              </span>
            </span>
            <DeskList label="FOR" ids={sel.supporters} byId={byId} />
            <DeskList label="AGAINST" ids={sel.opponents} byId={byId} />
          </div>
        </div>
      )}
    </div>
  );
}

function DeskList({
  label,
  ids,
  byId,
}: {
  label: string;
  ids: string[];
  byId: Map<string, Analyst>;
}) {
  const handles = ids
    .map((id) => byId.get(id)?.handle)
    .filter((h): h is string => Boolean(h));
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className="text-[var(--studio-muted)]">{label}</span>
      {handles.length === 0 && <span>&mdash;</span>}
      {handles.slice(0, 3).map((h) => (
        <Link
          key={h}
          href={`https://x.com/${h}`}
          className="underline-offset-2 hover:text-[var(--bc-gold)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bc-gold)]"
        >
          @{h}
        </Link>
      ))}
      {handles.length > 3 && (
        <span className="text-[var(--studio-muted)]">
          +{handles.length - 3}
        </span>
      )}
    </span>
  );
}
