"use client";

import Link from "@/components/motion-link";
import { useMemo } from "react";
import type { Analyst, Asset, SignalEvent } from "@/lib/sim/types";
import { fmtPct, fmtSigned, fmtSignedPp } from "@/lib/format";
import { TimeAgo } from "@/components/briefing/TimeAgo";
import s from "./observatory.module.css";

interface DetailPlateProps {
  asset: Asset | null;
  analysts: Analyst[];
  events: SignalEvent[];
  booted: boolean;
}

function handles(ids: string[], byId: Map<string, Analyst>): string {
  const names = ids
    .map((id) => byId.get(id)?.handle)
    .filter((h): h is string => Boolean(h));
  if (names.length === 0) return "—";
  const shown = names.slice(0, 4).map((h) => `@${h}`);
  const extra = names.length - shown.length;
  return extra > 0 ? `${shown.join(" ")} +${extra}` : shown.join(" ");
}

/** Fixed-height reading plate under the instrument: fund summary by default,
 *  holding detail when an arc or log row is under the pointer or focus. */
export function DetailPlate({
  asset,
  analysts,
  events,
  booted,
}: DetailPlateProps) {
  const byId = useMemo(
    () => new Map(analysts.map((a) => [a.id, a])),
    [analysts],
  );

  const lastUsed = useMemo(
    () => events.find((e) => e.verdict?.kind === "used"),
    [events],
  );
  // Matches mixed posts too: any call touching this asset counts.
  const lastForAsset = useMemo(
    () =>
      asset
        ? events.find(
            (e) =>
              e.verdict?.kind === "used" &&
              (e.verdict.ticker === asset.ticker ||
                e.verdict.calls?.some((c) => c.ticker === asset.ticker)),
          )
        : undefined,
    [events, asset],
  );

  if (!booted) {
    return (
      <div className={s.plate}>
        <p className={s.plateHint}>Calibrating the instrument…</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className={s.plate}>
        <p className={s.plateHint}>
          Hover or focus an arc — or sweep the log — for holding detail
        </p>
        {lastUsed?.verdict?.ticker && (
          <p className={s.plateLast}>
            Latest signal through the instrument:{" "}
            <strong>@{byId.get(lastUsed.analystId)?.handle}</strong> moved{" "}
            {(lastUsed.verdict.calls?.length
              ? lastUsed.verdict.calls
              : [
                  {
                    ticker: lastUsed.verdict.ticker,
                    weightDelta: lastUsed.verdict.weightDelta ?? 0,
                  },
                ]
            ).map((c, i) => (
              <span key={c.ticker}>
                {i > 0 && " and "}
                {/* sim-only surface: sim always fills weightDelta */}
                <strong>{c.ticker}</strong> {fmtSignedPp(c.weightDelta ?? 0)}
              </span>
            ))}{" "}
            in the model basket. The fund itself trades at the next scheduled
            rebalance.
          </p>
        )}
      </div>
    );
  }

  const gap = asset.targetWeight - asset.weight;
  return (
    <div className={s.plate}>
      <div className={s.plateHead}>
        <span className={s.plateTicker}>{asset.ticker}</span>
        <span className={s.plateName}>{asset.name}</span>
        <span className={s.plateSector}>{asset.sector}</span>
        <Link
          href={`/#${asset.ticker}`}
          className={s.plateLink}
          aria-label={`Open the ${asset.ticker} dossier`}
        >
          Dossier →
        </Link>
      </div>
      <div className={s.plateMetrics}>
        <div>
          <p className={s.metricLabel}>Model</p>
          <p className={s.metricValue}>{fmtPct(asset.targetWeight)}</p>
        </div>
        <div>
          <p className={s.metricLabel}>Fund</p>
          <p className={s.metricValue}>{fmtPct(asset.weight)}</p>
        </div>
        <div>
          <p className={s.metricLabel}>Gap</p>
          <p
            className={`${s.metricValue} ${gap >= 0 ? s.metricUp : s.metricDown}`}
          >
            {fmtSignedPp(gap)}
          </p>
        </div>
        <div>
          <p className={s.metricLabel}>Day</p>
          <p
            // sim-only surface: sim always fills dayMove
            className={`${s.metricValue} ${(asset.dayMove ?? 0) >= 0 ? s.metricUp : s.metricDown}`}
          >
            {fmtSigned(asset.dayMove ?? 0, 1)}
          </p>
        </div>
      </div>
      <p className={s.plateCrowd}>
        <span>
          <b>LONG</b> {handles(asset.supporters, byId)}
        </span>
        <span>
          <b>TRIM</b> {handles(asset.opponents, byId)}
        </span>
        {lastForAsset?.verdict &&
          (() => {
            // On a mixed post, show THIS asset's own leg, not the primary.
            const own = lastForAsset.verdict.calls?.find(
              (c) => c.ticker === asset.ticker,
            );
            const action = own?.action ?? lastForAsset.verdict.action;
            const weightDelta =
              own?.weightDelta ?? lastForAsset.verdict.weightDelta ?? 0;
            return (
              <span suppressHydrationWarning>
                <b>LAST CALL</b> @{byId.get(lastForAsset.analystId)?.handle}{" "}
                {action} {fmtSignedPp(weightDelta)} ·{" "}
                <TimeAgo ts={lastForAsset.ts} />
              </span>
            );
          })()}
      </p>
    </div>
  );
}
