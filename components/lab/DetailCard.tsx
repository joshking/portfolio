"use client";

import { forwardRef, useMemo } from "react";
import type { Analyst, Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import { OrbitAvatar } from "./OrbitAvatar";
import { colorFor, hashTicker, rgbCss } from "./glass-palette";

// The focused holding's detail card, shared by the glass bubbles and the glass
// treemap. The shader morphs the clicked shape's glass into a card-shaped slab
// in place; this DOM node is the CONTENT only — positioned exactly over that
// glass (shader space is container CSS-px space, so the same rect drives both)
// and faded in once the shape has settled. Mount/unmount is driven by the
// caller's morph state machine, never by this element's own transitions.

export interface CardRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Illustrative signal tallies scaled to the holding's weight (the sim tracks
// biases, not raw counts), so a big holding reads like hundreds of buys
// against a handful of sells rather than a literal supporter count. Shared by
// the detail card and the list view so their numbers always agree.
export function signalTallies(asset: Asset) {
  const h = hashTicker(asset.ticker);
  return {
    buy: Math.round(asset.targetWeight * 2600 + (h % 160)),
    sell: Math.round(asset.targetWeight * 170 + (h % 26) + 4),
  };
}

// The focused stock's detail: weight, sentiment from supporters vs opponents,
// and its top-rated recommenders.
export function useBasketDetail(
  selected: string | null,
  assets: Asset[],
  analysts: Analyst[],
) {
  return useMemo(() => {
    if (!selected) return null;
    const asset = assets.find((a) => a.ticker === selected);
    if (!asset) return null;
    const byId = new Map(analysts.map((a) => [a.id, a]));
    const supporters = (asset.supporters ?? [])
      .map((id) => byId.get(id))
      .filter((a): a is Analyst => Boolean(a))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const { buy, sell } = signalTallies(asset);
    return {
      asset,
      color: colorFor(selected).bg,
      top: supporters.slice(0, 3),
      totalRec: supporters.length,
      buy,
      sell,
    };
  }, [selected, assets, analysts]);
}

export type BasketDetail = NonNullable<ReturnType<typeof useBasketDetail>>;

export const DetailCard = forwardRef<
  HTMLDivElement,
  {
    detail: BasketDetail;
    open: boolean;
    rect: CardRect | null;
    width: number;
    maxHeight?: number;
    onClose: () => void;
  }
>(function DetailCard({ detail, open, rect, width, maxHeight, onClose }, ref) {
  return (
    <div
      ref={ref}
      className="absolute z-50 flex flex-col overflow-hidden rounded-2xl"
      style={{
        // The card is a dark surface in every world — pin its ink tokens so an
        // inverted (light) page cannot flip its text to cobalt-on-navy.
        ["--ink" as string]: "#ffffff",
        ["--ink-secondary" as string]: "#D9E4F6",
        ["--ink-muted" as string]: "#AECAF0",
        ["--hairline" as string]: "rgba(255,255,255,0.24)",
        ["--up-teal" as string]: "#3FDFA0",
        ["--down-red" as string]: "#FF9C88",
        left: rect?.left ?? 0,
        top: rect?.top ?? 0,
        width,
        maxHeight,
        visibility: rect ? "visible" : "hidden",
        pointerEvents: open ? "auto" : "none",
        background: "rgba(4, 14, 36, 0.72)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--hairline)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.55)",
        opacity: open ? 1 : 0,
        transition: open ? "opacity 180ms ease 40ms" : "opacity 140ms ease",
      }}
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="text-ink-muted hover:text-ink absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Header: logo chip + ticker + name */}
      <div className="flex items-center gap-3 px-4 pt-5 pr-12 pb-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[0.9rem] font-bold text-white"
          style={{
            background: rgbCss(detail.color),
            boxShadow: `0 6px 16px ${rgbCss(detail.color, 0.5)}`,
          }}
        >
          {detail.asset.ticker.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="text-ink text-[1.25rem] leading-none font-bold tracking-tight">
            {detail.asset.ticker}
          </div>
          <div className="text-ink-muted mt-1 truncate text-[0.8rem]">
            {detail.asset.name}
          </div>
        </div>
      </div>

      <div className="border-hairline border-t" />

      {/* % of fund + sentiment as signal tallies */}
      <div className="grid grid-cols-2">
        <div className="border-hairline border-r px-4 py-3">
          <div className="text-ink-muted text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
            % of fund
          </div>
          <div className="text-ink mt-1 flex items-baseline gap-1.5 text-[1.15rem] font-bold tabular-nums">
            {fmtPct(detail.asset.targetWeight)}
            {Math.abs(detail.asset.targetWeight - detail.asset.weight) >=
              0.0005 && (
              <span
                className="text-[0.78rem] font-semibold"
                style={{
                  color:
                    detail.asset.targetWeight > detail.asset.weight
                      ? "var(--up-teal)"
                      : "var(--down-red)",
                }}
              >
                {fmtSigned(
                  (detail.asset.targetWeight - detail.asset.weight) * 100,
                )}
              </span>
            )}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-ink-muted text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
            Sentiment
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              className="text-[1.15rem] font-bold tabular-nums"
              style={{ color: "var(--up-teal)" }}
            >
              {detail.buy}
              <span className="ml-1 text-[0.68rem] font-semibold">buy</span>
            </span>
            <span
              className="text-[1.15rem] font-bold tabular-nums"
              style={{ color: "var(--down-red)" }}
            >
              {detail.sell}
              <span className="ml-1 text-[0.68rem] font-semibold">sell</span>
            </span>
          </div>
        </div>
      </div>

      <div className="border-hairline border-t" />

      {/* Recommended by — top three, then a link to the rest. */}
      <div className="px-4 py-3">
        <div className="text-ink-muted mb-2.5 text-[0.62rem] font-semibold tracking-[0.08em] uppercase">
          Recommended by top analysts
        </div>
        <ul className="flex flex-col gap-2.5">
          {detail.top.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5">
              <OrbitAvatar analyst={a} size={30} />
              <div className="min-w-0 flex-1">
                <div className="text-ink truncate text-[0.85rem] font-semibold">
                  {a.name}
                </div>
                <div className="text-ink-muted truncate text-[0.7rem]">
                  @{a.handle}
                </div>
              </div>
              <span className="text-ink text-[0.95rem] font-bold tabular-nums">
                {a.score ?? "—"}
              </span>
            </li>
          ))}
          {detail.top.length === 0 && (
            <li className="text-ink-muted text-[0.8rem]">
              No analysts long this yet.
            </li>
          )}
        </ul>
        {detail.totalRec > detail.top.length && (
          <button className="text-ink-secondary hover:text-ink mt-2.5 text-[0.78rem] font-semibold transition-colors">
            View all {detail.totalRec} analysts →
          </button>
        )}
      </div>

      {/* CTA */}
      <div className="p-3">
        <button
          className="text-ink flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[0.85rem] font-semibold tracking-[0.02em] transition-colors"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid var(--hairline)",
          }}
        >
          View {detail.asset.ticker} details
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});
