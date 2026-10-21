"use client";

import Link from "@/components/motion-link";
import { useMemo, useState } from "react";
import type { Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import { fmtBp } from "./fmt-bp";
import styles from "./ledger.module.css";

/** Only segments wide enough to hold a caps label get one. */
const LABEL_MIN_WEIGHT = 0.03;

export interface BandCause {
  handle: string;
  // One entry per call — a mixed post moves several tickers at once.
  calls: { ticker: string; weightDelta: number }[];
}

/**
 * The basket as a single 100% band: one segment per token, widths morph via
 * CSS transitions as verdicts renormalize the target weights. A thin cobalt
 * tick marks the segment that just moved; the caption below names the cause.
 */
export function WeightBand({
  assets,
  cold,
  highlightCalls,
  hotTicker,
  onHot,
  cause,
}: {
  assets: Asset[];
  cold: boolean;
  highlightCalls: { ticker: string; weightDelta: number }[];
  hotTicker: string | null;
  onHot: (ticker: string | null) => void;
  cause: BandCause | null;
}) {
  // Plate opens only from the band itself (hover/focus on a segment); row
  // hover just tints the matching segment.
  const [plateTicker, setPlateTicker] = useState<string | null>(null);

  const segments = useMemo(() => {
    const out: { asset: Asset; center: number }[] = [];
    for (let i = 0, acc = 0; i < assets.length; i += 1) {
      out.push({ asset: assets[i], center: acc + assets[i].targetWeight / 2 });
      acc += assets[i].targetWeight;
    }
    return out;
  }, [assets]);

  const plate = plateTicker
    ? segments.find((s) => s.asset.ticker === plateTicker)
    : undefined;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="kicker">THE WEIGHT BAND — MODEL BASKET, 100%</h2>
        <span className="agate text-ink-muted max-sm:hidden">
          TARGET WEIGHTS · LIVE
        </span>
      </div>

      {cold ? (
        <div className="plate mt-2 h-12 animate-pulse" aria-hidden />
      ) : (
        <div className="relative mt-2">
          <div className="border-hairline flex h-12 w-full overflow-hidden rounded-[3px] border">
            {segments.map(({ asset }, i) => {
              const hot =
                hotTicker === asset.ticker || plateTicker === asset.ticker;
              return (
                <Link
                  key={asset.ticker}
                  href={`/#${asset.ticker}`}
                  aria-label={`${asset.ticker} — ${asset.name}, ${fmtPct(asset.targetWeight)} of the model basket`}
                  className={`${styles.segment} focus-visible:outline-cobalt flex min-w-[2px] items-center justify-center overflow-hidden focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2`}
                  style={{
                    width: `${asset.targetWeight * 100}%`,
                    background: hot
                      ? "#d7ddfc"
                      : i % 2 === 0
                        ? "#e6e6e2"
                        : "#d6d5cf",
                  }}
                  onMouseEnter={() => {
                    setPlateTicker(asset.ticker);
                    onHot(asset.ticker);
                  }}
                  onMouseLeave={() => {
                    setPlateTicker(null);
                    onHot(null);
                  }}
                  onFocus={() => {
                    setPlateTicker(asset.ticker);
                    onHot(asset.ticker);
                  }}
                  onBlur={() => {
                    setPlateTicker(null);
                    onHot(null);
                  }}
                >
                  {highlightCalls.some((hc) => hc.ticker === asset.ticker) && (
                    <span className={styles.tick} aria-hidden />
                  )}
                  {asset.targetWeight >= LABEL_MIN_WEIGHT && (
                    <span className="agate text-ink text-[0.625rem] tracking-[0.06em]">
                      {asset.ticker}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {plate && (
            <div
              className="plate pointer-events-none absolute top-full z-30 mt-2 w-[236px] -translate-x-1/2 p-3"
              style={{
                left: `clamp(118px, ${plate.center * 100}%, calc(100% - 118px))`,
                boxShadow: "0 2px 16px rgba(21,24,30,0.12)",
              }}
            >
              <p className="text-ink text-[0.9rem] leading-tight font-extrabold tracking-tight">
                {plate.asset.ticker}{" "}
                <span className="text-ink-secondary font-medium">
                  {plate.asset.name}
                </span>
              </p>
              <p className="agate text-ink-muted mt-1">
                {plate.asset.sector.toUpperCase()}
              </p>
              <p className="agate text-ink mt-2">
                MODEL {fmtPct(plate.asset.targetWeight)} · FUND{" "}
                {fmtPct(plate.asset.weight)}
              </p>
              <p className="agate mt-1">
                <span
                  // sim-only surface: sim always fills dayMove
                  className={
                    (plate.asset.dayMove ?? 0) >= 0 ? "text-up" : "text-down"
                  }
                >
                  {fmtSigned(plate.asset.dayMove ?? 0, 1)} TODAY
                </span>
                <span className="text-ink-muted">
                  {" "}
                  · {plate.asset.supporters.length} LONG ·{" "}
                  {plate.asset.opponents.length} SHORT
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      <p className="agate mt-2 flex min-h-[1.25rem] flex-wrap items-center gap-x-2">
        {cold ? (
          <span className="text-ink-muted">CONNECTING…</span>
        ) : cause ? (
          <>
            <span
              className="bg-cobalt inline-block h-1.5 w-1.5 rounded-full"
              aria-hidden
            />
            <span className="text-cobalt-deep font-semibold">
              @{cause.handle} just moved{" "}
              {cause.calls.length > 1 ? (
                // Mixed post: every leg named, each bp mark inked in its
                // own direction color.
                cause.calls.map((c, i) => (
                  <span key={c.ticker}>
                    {i > 0 && " · "}
                    {c.ticker}{" "}
                    <span
                      className={c.weightDelta >= 0 ? "text-up" : "text-down"}
                    >
                      {fmtBp(c.weightDelta)}
                    </span>
                  </span>
                ))
              ) : (
                <>
                  {cause.calls[0].ticker} {fmtBp(cause.calls[0].weightDelta)}
                </>
              )}
            </span>
            <span className="text-ink-muted">
              — the fund itself trades at the daily rebalance
            </span>
          </>
        ) : (
          <span className="text-ink-muted">
            WAITING FOR THE NEXT ACCEPTED CALL…
          </span>
        )}
      </p>
    </div>
  );
}
