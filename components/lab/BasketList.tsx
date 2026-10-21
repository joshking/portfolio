"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import type { BasketApi } from "./GlassBasket";
import { colorFor, rgbCss } from "./glass-palette";
import { signalTallies } from "./DetailCard";

// The list view: the basket as an editorial table — hairline row rules, the
// entity left, figures right, in the site's agate register. Proposed adds the
// delta vs the current basket (the same signed green/red chip the charts
// wear); Current is the basket as it stands, no delta. Exposes the same
// BasketApi as the charts so a landing call flies into its row and flashes it
// instead of being discarded.

export const BasketList = forwardRef<
  BasketApi,
  {
    assets: Asset[];
    /** Proposed view: adds the delta column vs the current basket. */
    showDeltas?: boolean;
    className?: string;
  }
>(function BasketList({ assets, showDeltas = false, className }, apiHandle) {
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(new Set());
  const flashTimers = useRef<Map<string, number>>(new Map());

  const rows = useMemo(
    () =>
      [...assets]
        .filter((a) => a.targetWeight > 0.0005)
        .sort((a, b) => b.targetWeight - a.targetWeight),
    [assets],
  );

  useImperativeHandle(
    apiHandle,
    () => ({
      getBubbleRect: (ticker) => {
        const el = rowRefs.current.get(ticker);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      },
      hasBubble: (ticker) => rows.some((a) => a.ticker === ticker),
      ripple: (ticker) => {
        rowRefs.current
          .get(ticker)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        window.clearTimeout(flashTimers.current.get(ticker));
        setFlashing((s) => new Set(s).add(ticker));
        flashTimers.current.set(
          ticker,
          window.setTimeout(
            () =>
              setFlashing((s) => {
                const next = new Set(s);
                next.delete(ticker);
                return next;
              }),
            900,
          ),
        );
      },
    }),
    [rows],
  );

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden ${className ?? ""}`}
    >
      {/* Column heads */}
      <div
        className="text-ink-muted grid items-center gap-3 px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase"
        style={{
          gridTemplateColumns: showDeltas
            ? "minmax(0,1fr) 5.5rem 5rem 4rem 4rem"
            : "minmax(0,1fr) 5.5rem 4rem 4rem",
        }}
      >
        <span>Holding</span>
        <span className="text-right">% of basket</span>
        {showDeltas && <span className="text-right">Δ</span>}
        <span className="text-right">Buy</span>
        <span className="text-right">Sell</span>
      </div>

      <ul className="border-hairline min-h-0 flex-1 overflow-y-auto border-t">
        {rows.map((a) => {
          const { buy, sell } = signalTallies(a);
          const delta = a.targetWeight - a.weight;
          const moved = Math.abs(delta) >= 0.0005;
          const flash = flashing.has(a.ticker);
          return (
            <li
              key={a.ticker}
              ref={(el) => {
                if (el) rowRefs.current.set(a.ticker, el);
                else rowRefs.current.delete(a.ticker);
              }}
              className="border-hairline grid items-center gap-3 border-b px-3 py-2.5 transition-colors duration-500"
              style={{
                gridTemplateColumns: showDeltas
                  ? "minmax(0,1fr) 5.5rem 5rem 4rem 4rem"
                  : "minmax(0,1fr) 5.5rem 4rem 4rem",
                background: flash ? "var(--plate-tint)" : "transparent",
              }}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.7rem] font-bold text-white"
                  style={{ background: rgbCss(colorFor(a.ticker).bg) }}
                >
                  {a.ticker.slice(0, 2)}
                </span>
                <span className="min-w-0">
                  <span className="text-ink block truncate text-[0.9rem] leading-tight font-bold">
                    {a.ticker}
                  </span>
                  <span className="text-ink-muted block truncate text-[0.75rem] leading-tight">
                    {a.name}
                  </span>
                </span>
              </span>
              <span className="text-ink text-right text-[0.9rem] font-bold tabular-nums">
                {fmtPct(a.targetWeight)}
              </span>
              {showDeltas && (
                <span
                  className="text-right text-[0.85rem] font-semibold tabular-nums"
                  style={{
                    color: !moved
                      ? "var(--ink-muted)"
                      : delta > 0
                        ? "var(--up-teal)"
                        : "var(--down-red)",
                  }}
                >
                  {moved ? fmtSigned(delta * 100) : "—"}
                </span>
              )}
              <span
                className="text-right text-[0.9rem] font-semibold tabular-nums"
                style={{ color: "var(--up-teal)" }}
              >
                {buy}
              </span>
              <span
                className="text-right text-[0.9rem] font-semibold tabular-nums"
                style={{ color: "var(--down-red)" }}
              >
                {sell}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
