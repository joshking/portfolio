"use client";

import Link from "@/components/motion-link";
import { useMemo } from "react";
import type { Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned, fmtSignedPp } from "@/lib/format";
import type { AnalystMap, HighlightLink } from "./Desk";
import styles from "./desk.module.css";

// The book: every asset as a ranked weight ladder. Current weight is the
// filled bar, target weight is the amber tick; the gap between them is what
// the next rebalance will trade. A USED verdict flashes its row and slides
// in a signed basis-point chip.

const GRID =
  "grid grid-cols-[1.5rem_3.4rem_minmax(70px,1fr)_3.4rem_3.4rem] items-center gap-x-2 sm:grid-cols-[1.5rem_3.6rem_minmax(110px,1fr)_3.4rem_3.6rem_4.2rem_3.6rem]";

function handles(ids: string[], byId: AnalystMap): string {
  return ids
    .map((id) => byId.get(id)?.handle)
    .filter(Boolean)
    .map((h) => `@${h}`)
    .join(" ");
}

function LadderRow({
  asset,
  rank,
  scale,
  byId,
  highlights,
}: {
  asset: Asset;
  rank: number;
  scale: number;
  byId: AnalystMap;
  highlights: HighlightLink[];
}) {
  const hot = highlights.find((h) => h.ticker === asset.ticker) ?? null;
  const gapPp = asset.targetWeight - asset.weight;
  const curPct = Math.min(
    100,
    (Math.min(asset.weight, asset.targetWeight) / scale) * 100,
  );
  const diffPct = Math.min(100 - curPct, (Math.abs(gapPp) / scale) * 100);

  return (
    <li
      className={`group relative border-b border-[var(--line)] ${
        hot ? styles.causeEdge : "border-l-2 border-l-transparent"
      }`}
    >
      {/* momentum flash overlay, retriggered per causing event */}
      {hot && (
        <span
          key={hot.eventId}
          className={`pointer-events-none absolute inset-0 ${
            hot.deltaBp < 0 ? styles.flashDown : styles.flashUp
          }`}
          aria-hidden
        />
      )}

      <div className={`${GRID} px-2.5 py-[7px]`}>
        <span className="text-[10px] text-[var(--tx-mute)]">
          {String(rank).padStart(2, "0")}
        </span>

        <Link
          href={`/#${asset.ticker}`}
          className="text-[13px] font-bold tracking-[0.04em] text-[var(--tx)] hover:text-[var(--amber)]"
        >
          {asset.ticker}
        </Link>

        {/* weight bar: filled = current, tick = target, gap segment = trade */}
        <span className="relative block h-[9px] bg-[rgba(255,255,255,0.05)]">
          <span
            className="absolute inset-y-0 left-0 bg-[rgba(201,211,204,0.32)]"
            style={{ width: `${curPct}%` }}
            aria-hidden
          />
          <span
            className={`absolute inset-y-0 ${
              gapPp >= 0 ? "bg-[var(--up-dim)]" : "bg-[var(--down-dim)]"
            }`}
            style={{ left: `${curPct}%`, width: `${diffPct}%` }}
            aria-hidden
          />
          <span
            className="absolute inset-y-[-2px] w-[2px] bg-[var(--amber)]"
            style={{ left: `${(asset.targetWeight / scale) * 100}%` }}
            aria-hidden
          />
          {/* delta chip: +Δbp / −Δbp slides in on a USED verdict */}
          {hot && (
            <span
              key={`${hot.eventId}-chip`}
              className={`${styles.chipIn} absolute top-1/2 right-0 z-10 px-1.5 py-px text-[10px] font-bold ${
                hot.deltaBp < 0
                  ? "bg-[var(--down-dim)] text-[var(--down)]"
                  : "bg-[var(--up-dim)] text-[var(--up)]"
              }`}
            >
              {hot.deltaBp > 0 ? "+" : ""}
              {hot.deltaBp}bp
            </span>
          )}
        </span>

        <span className="text-right text-[12px] font-semibold text-[var(--tx)]">
          {fmtPct(asset.weight, 1)}
        </span>

        <span className="hidden text-right text-[11px] text-[var(--amber)] sm:block">
          {fmtPct(asset.targetWeight, 1)}
        </span>

        <span
          className={`hidden text-right text-[11px] sm:block ${
            Math.abs(gapPp) < 0.0005
              ? "text-[var(--tx-mute)]"
              : gapPp > 0
                ? "text-[var(--up)]"
                : "text-[var(--down)]"
          }`}
        >
          {Math.abs(gapPp) < 0.0005 ? (
            "·"
          ) : (
            <>
              {gapPp > 0 ? "▲" : "▼"} {fmtSignedPp(gapPp, 1)}
            </>
          )}
        </span>

        <span
          // sim-only surface: sim always fills dayMove
          className={`text-right text-[11px] ${
            (asset.dayMove ?? 0) >= 0
              ? "text-[var(--up)]"
              : "text-[var(--down)]"
          }`}
        >
          {fmtSigned(asset.dayMove ?? 0, 1)}
        </span>
      </div>

      {/* hover / focus detail strip */}
      <div className="hidden flex-wrap items-baseline gap-x-4 gap-y-0.5 bg-[var(--panel-2)] px-2.5 py-1.5 text-[10px] tracking-[0.1em] text-[var(--tx-mute)] uppercase group-focus-within:flex group-hover:flex">
        <span className="text-[var(--tx-dim)]">
          {asset.name} / {asset.sector}
        </span>
        <span>
          CUR {fmtPct(asset.weight, 2)} &#8594; TGT{" "}
          {fmtPct(asset.targetWeight, 2)}
        </span>
        {asset.supporters.length > 0 && (
          <span className="text-[var(--up)]">
            LONG {handles(asset.supporters, byId)}
          </span>
        )}
        {asset.opponents.length > 0 && (
          <span className="text-[var(--down)]">
            SHORT {handles(asset.opponents, byId)}
          </span>
        )}
      </div>
    </li>
  );
}

export function Ladder({
  assets,
  byId,
  highlights,
  cold,
}: {
  assets: Asset[];
  byId: AnalystMap;
  highlights: HighlightLink[];
  cold: boolean;
}) {
  const ranked = useMemo(
    () => [...assets].sort((a, b) => b.targetWeight - a.targetWeight),
    [assets],
  );
  const scale = (ranked[0]?.targetWeight ?? 0.2) * 1.12;

  return (
    <section
      aria-label="The book — model basket as a ranked weight ladder"
      className="min-w-0 bg-[var(--panel)]"
    >
      <header className="flex items-baseline justify-between border-b border-[var(--line-strong)] px-2.5 py-2">
        <h2 className="text-[11px] font-bold tracking-[0.16em] text-[var(--tx)] uppercase">
          <span className="text-[var(--amber)]">&#9612;</span> BOOK / MODEL
          LADDER
        </h2>
        <span className="text-[10px] tracking-[0.12em] text-[var(--tx-mute)] uppercase">
          <span className="text-[var(--amber)]">&#9615;</span> = TARGET WEIGHT
        </span>
      </header>

      {/* column captions */}
      <div
        className={`${GRID} border-b border-[var(--line)] px-2.5 py-1 text-[9px] tracking-[0.14em] text-[var(--tx-mute)] uppercase`}
        aria-hidden
      >
        <span>#</span>
        <span>TKR</span>
        <span>WEIGHT</span>
        <span className="text-right">CUR</span>
        <span className="hidden text-right sm:block">TGT</span>
        <span className="hidden text-right sm:block">&#916; REBAL</span>
        <span className="text-right">24H</span>
      </div>

      <ol>
        {cold &&
          Array.from({ length: 9 }).map((_, i) => (
            <li
              key={i}
              className="border-b border-[var(--line)] px-2.5 py-2"
              aria-hidden
            >
              <div className="h-[9px] w-full bg-[var(--panel-2)] motion-safe:animate-pulse" />
            </li>
          ))}
        {!cold &&
          ranked.map((asset, i) => (
            <LadderRow
              key={asset.ticker}
              asset={asset}
              rank={i + 1}
              scale={scale}
              byId={byId}
              highlights={highlights}
            />
          ))}
      </ol>
    </section>
  );
}
