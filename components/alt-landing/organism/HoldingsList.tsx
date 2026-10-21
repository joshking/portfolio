"use client";

import Link from "@/components/motion-link";
import { useMemo } from "react";
import type { Analyst, Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned, fmtSignedPp } from "@/lib/format";
import { SimStamp } from "@/components/briefing/SimStamp";
import styles from "./organism.module.css";

// The record: the canvas is spectacle, this table is the accessible truth.
export function HoldingsList({
  assets,
  analystsById,
  highlightCalls,
  cold,
  onFocusTicker,
}: {
  assets: Asset[];
  analystsById: Map<string, Analyst>;
  highlightCalls: { ticker: string; weightDelta: number }[];
  cold: boolean;
  onFocusTicker: (ticker: string | null) => void;
}) {
  const sorted = useMemo(
    () => [...assets].sort((a, b) => b.targetWeight - a.targetWeight),
    [assets],
  );
  const maxWeight = sorted[0]?.targetWeight ?? 0;

  return (
    <section className={styles.record} aria-label="Holdings — the record">
      <div className={styles.recordHead}>
        <h2 className={styles.recordTitle}>THE RECORD — MODEL PORTFOLIO NOW</h2>
        <SimStamp onInk />
      </div>
      {cold ? (
        <p className={styles.recordFoot}>WAITING FOR THE FIRST HEARTBEAT…</p>
      ) : (
        <>
          <div className={styles.recordScroll}>
            <table className={styles.recordTable}>
              <thead>
                <tr>
                  <th scope="col">Holding</th>
                  <th scope="col">Sector</th>
                  <th scope="col" aria-label="Model weight, relative" />
                  <th scope="col" className={styles.num}>
                    Model
                  </th>
                  <th scope="col" className={styles.num}>
                    Fund
                  </th>
                  <th scope="col" className={styles.num}>
                    Drift
                  </th>
                  <th scope="col" className={styles.num}>
                    Day
                  </th>
                  <th scope="col">Backers</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((asset) => (
                  <HoldingRow
                    key={asset.ticker}
                    asset={asset}
                    analystsById={analystsById}
                    maxWeight={maxWeight}
                    lit={highlightCalls.some(
                      (hc) => hc.ticker === asset.ticker,
                    )}
                    onFocusTicker={onFocusTicker}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.recordFoot}>
            DRIFT = MODEL MINUS FUND, IN WEIGHT POINTS — THE FUND CATCHES UP AT
            THE NEXT REBALANCE.
          </p>
        </>
      )}
    </section>
  );
}

function HoldingRow({
  asset,
  analystsById,
  maxWeight,
  lit,
  onFocusTicker,
}: {
  asset: Asset;
  analystsById: Map<string, Analyst>;
  maxWeight: number;
  lit: boolean;
  onFocusTicker: (ticker: string | null) => void;
}) {
  const drift = asset.targetWeight - asset.weight;
  const supporters = asset.supporters
    .map((id) => analystsById.get(id)?.handle)
    .filter((h): h is string => Boolean(h));
  const shown = supporters.slice(0, 2);
  const extra = supporters.length - shown.length + asset.opponents.length;
  return (
    <tr
      className={`${styles.recordRow} ${lit ? styles.rowLit : ""}`}
      onMouseEnter={() => onFocusTicker(asset.ticker)}
      onMouseLeave={() => onFocusTicker(null)}
      onFocus={() => onFocusTicker(asset.ticker)}
      onBlur={() => onFocusTicker(null)}
    >
      <td>
        <Link href={`/#${asset.ticker}`} className={styles.recordTicker}>
          {asset.ticker}
        </Link>
        <span className={styles.recordName}>{asset.name}</span>
      </td>
      <td>
        <span className={styles.recordSector}>{asset.sector}</span>
      </td>
      <td aria-hidden>
        <span className={styles.weightBar}>
          <span
            className={styles.weightBarFill}
            style={{
              width: `${maxWeight > 0 ? (asset.targetWeight / maxWeight) * 100 : 0}%`,
            }}
          />
        </span>
      </td>
      <td className={styles.num}>{fmtPct(asset.targetWeight)}</td>
      <td className={styles.num}>{fmtPct(asset.weight)}</td>
      <td className={styles.num}>{fmtSignedPp(drift)}</td>
      <td
        // sim-only surface: sim always fills dayMove
        className={`${styles.num} ${(asset.dayMove ?? 0) >= 0 ? styles.up : styles.down}`}
      >
        {fmtSigned(asset.dayMove ?? 0)}
      </td>
      <td>
        <span className={styles.backers}>
          {shown.length > 0 ? shown.map((h) => `@${h}`).join(" ") : "—"}
          {extra > 0 && ` +${extra}`}
        </span>
      </td>
    </tr>
  );
}
