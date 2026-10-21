"use client";

import Link from "@/components/motion-link";
import { useMemo, useState } from "react";
import type { Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned, fmtSignedPp } from "@/lib/format";
import { StockLogo } from "./StockLogo";

export interface TileRect {
  asset: Asset;
  x: number; // percentages of the container
  y: number;
  w: number;
  h: number;
}

// Squarified treemap (Bruls et al.) over a normalized 100 x 100 canvas;
// the container's aspect-ratio does the rest. Exported so the lab's glass
// treemap can share the exact same layout.
export function squarify(assets: Asset[]): TileRect[] {
  const items = [...assets]
    .filter((a) => a.targetWeight > 0.0005)
    .sort((a, b) => b.targetWeight - a.targetWeight);
  const total = items.reduce((s, a) => s + a.targetWeight, 0);
  const rects: TileRect[] = [];

  let x = 0,
    y = 0,
    w = 100,
    h = 100;
  let row: Asset[] = [];
  let i = 0;

  const areaOf = (a: Asset) => (a.targetWeight / total) * 100 * 100;

  const worst = (row: Asset[], side: number) => {
    const sum = row.reduce((s, a) => s + areaOf(a), 0);
    let max = 0;
    for (const a of row) {
      const ar = areaOf(a);
      const rw = sum / side || 1;
      const rh = ar / rw;
      const ratio = Math.max(rw / rh, rh / rw);
      max = Math.max(max, ratio);
    }
    return max;
  };

  const layoutRow = (row: Asset[]) => {
    const sum = row.reduce((s, a) => s + areaOf(a), 0);
    const horizontal = w >= h;
    const side = horizontal ? h : w;
    const thickness = sum / side;
    let offset = 0;
    for (const a of row) {
      const len = areaOf(a) / thickness;
      if (horizontal) {
        rects.push({ asset: a, x, y: y + offset, w: thickness, h: len });
      } else {
        rects.push({ asset: a, x: x + offset, y, w: len, h: thickness });
      }
      offset += len;
    }
    if (horizontal) {
      x += thickness;
      w -= thickness;
    } else {
      y += thickness;
      h -= thickness;
    }
  };

  while (i < items.length) {
    const side = Math.min(w, h);
    const candidate = [...row, items[i]];
    if (row.length === 0 || worst(candidate, side) <= worst(row, side)) {
      row = candidate;
      i++;
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  return rects;
}

// Tiles stay light plates on the cobalt ground (the treemap is the bright
// exhibit); fill mix capped at 46% so the fixed dark tile text clears 4.5:1.
const TILE_INK = "#15181e";
function tileFill(move: number): string {
  const mag = Math.min(1, Math.abs(move) / 3);
  const pct = Math.round(mag * 46);
  const hue = move >= 0 ? "var(--up-teal)" : "var(--down-red)";
  return `color-mix(in oklab, ${hue} ${pct}%, #F0EFEA)`;
}

export function Treemap({
  assets,
  highlightTicker,
  className,
}: {
  assets: Asset[];
  highlightTicker: string | null;
  className?: string;
}) {
  const [hovered, setHovered] = useState<TileRect | null>(null);
  const rects = useMemo(() => squarify(assets), [assets]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        className="relative w-full overflow-hidden rounded-[3px]"
        style={{ aspectRatio: "16 / 11", background: "var(--paper)" }}
        onMouseLeave={() => setHovered(null)}
      >
        {rects.map((r) => {
          // Label tiers gated on both dimensions so text never crowds an edge.
          const showTicker = r.w > 9 && r.h > 9;
          const showMove = r.w > 12 && r.h > 14;
          const big = r.w > 28 && r.h > 26;
          // The Signed Figure Rule: a tile only wears direction color when it
          // carries the signed figure; smaller tiles stay neutral (hover has it).
          const bg = showMove ? tileFill(r.asset.dayMove ?? 0) : "#E9E9E4";
          const flash = highlightTicker === r.asset.ticker;
          return (
            <Link
              key={r.asset.ticker}
              href={`/#${r.asset.ticker}`}
              data-tile={r.asset.ticker}
              aria-label={`${r.asset.name} — model weight ${fmtPct(r.asset.targetWeight)}, today ${fmtSigned(r.asset.dayMove ?? 0)}`}
              onMouseEnter={() => setHovered(r)}
              onFocus={() => setHovered(r)}
              onBlur={() => setHovered(null)}
              className={`group focus-visible:outline-cobalt absolute block overflow-hidden focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${flash ? "tile-flash z-[5]" : ""}`}
              style={{
                left: `${r.x}%`,
                top: `${r.y}%`,
                width: `calc(${r.w}% - 2px)`,
                height: `calc(${r.h}% - 2px)`,
                margin: "1px",
                background: bg,
                color: TILE_INK,
                transition:
                  "left 700ms cubic-bezier(0.22,1,0.36,1), top 700ms cubic-bezier(0.22,1,0.36,1), width 700ms cubic-bezier(0.22,1,0.36,1), height 700ms cubic-bezier(0.22,1,0.36,1), background 400ms ease-out",
              }}
            >
              {showTicker && (
                <span className="pointer-events-none absolute inset-0 flex flex-col justify-between overflow-hidden p-1.5 sm:p-2">
                  <span className="flex items-center gap-1.5">
                    <StockLogo
                      ticker={r.asset.ticker}
                      size={big || (r.w > 20 && r.h > 20) ? 18 : 14}
                    />
                    <span
                      className="agate leading-none font-bold"
                      style={{
                        fontSize:
                          big || (r.w > 20 && r.h > 20)
                            ? "0.9375rem"
                            : "0.6875rem",
                      }}
                    >
                      {r.asset.ticker}
                    </span>
                  </span>
                  {showMove && (
                    <span className="flex items-end justify-between gap-1">
                      <span
                        className="agate leading-none opacity-90"
                        style={{ fontSize: "0.6875rem" }}
                      >
                        {fmtSigned(r.asset.dayMove ?? 0)}
                      </span>
                      {big && (
                        <span
                          className="agate leading-none opacity-75"
                          style={{ fontSize: "0.6875rem" }}
                        >
                          {fmtPct(r.asset.targetWeight)}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {hovered && (
        <div
          className="plate pointer-events-none absolute z-20 w-64 p-3"
          style={{
            left: `min(${hovered.x + hovered.w / 2}%, calc(100% - 17rem))`,
            top: `${Math.min(hovered.y + 6, 68)}%`,
            boxShadow: "0 2px 16px rgba(1,18,44,0.45)",
          }}
          role="status"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <StockLogo ticker={hovered.asset.ticker} size={20} />
              <span className="text-ink text-[0.9375rem] font-bold">
                {hovered.asset.name}
              </span>
            </span>
            <span className="agate text-ink-muted">{hovered.asset.sector}</span>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            <div>
              <dt className="kicker">MODEL</dt>
              <dd className="agate text-ink mt-0.5">
                {fmtPct(hovered.asset.targetWeight)}
              </dd>
            </div>
            <div>
              <dt className="kicker">FUND</dt>
              <dd className="agate text-ink mt-0.5">
                {fmtPct(hovered.asset.weight)}
              </dd>
            </div>
            <div>
              <dt className="kicker">DRIFT</dt>
              <dd className="agate text-ink mt-0.5">
                {fmtSignedPp(hovered.asset.targetWeight - hovered.asset.weight)}
              </dd>
            </div>
          </dl>
          <div className="border-hairline mt-2 border-t pt-2">
            {(() => {
              const buys = hovered.asset.supporters.length;
              const sells = hovered.asset.opponents.length;
              const total = buys + sells;
              if (total === 0) {
                return (
                  <p className="agate text-ink-muted">
                    SENTIMENT — NO LIVE CALLS, 24H
                  </p>
                );
              }
              const buyPct = Math.round((buys / total) * 100);
              return (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="kicker">SENTIMENT — 24H</span>
                    <span className="agate">
                      <span className="text-up font-semibold">
                        BUY {buyPct}%
                      </span>
                      <span className="text-ink-muted"> · </span>
                      <span className="text-down font-semibold">
                        SELL {100 - buyPct}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-[6px] overflow-hidden rounded-[2px]">
                    <span
                      style={{
                        width: `${buyPct}%`,
                        background: "var(--up-teal)",
                      }}
                    />
                    <span
                      style={{
                        width: `${100 - buyPct}%`,
                        background: "var(--down-red)",
                      }}
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
