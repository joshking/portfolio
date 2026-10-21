"use client";

import { useState, type MutableRefObject } from "react";
import type { Analyst, Asset } from "@/lib/sim/types";
import { GlassBasket, type BasketApi } from "./GlassBasket";
import { GlassTreemap } from "./GlassTreemap";
import { BasketList } from "./BasketList";
import { GLASS_PRESET } from "./glass-preset";
import type { GlassTheme } from "./glass-palette";

type ChartKind = "bubbles" | "treemap" | "list";

// The basket panel: the signals' destination. It shows the live model the
// analysts' posts are accumulating into (target weights, moving with every
// accepted call); the basket as it stands since the last rebalance lives on
// the fund page. The chart control picks how it is drawn.
export function BasketPanel({
  assets,
  analysts,
  highlightTicker,
  apiRef,
  theme = "cobalt",
}: {
  assets: Asset[];
  analysts: Analyst[];
  highlightTicker: string | null;
  apiRef?: MutableRefObject<BasketApi | null>;
  theme?: GlassTheme;
}) {
  const [chart, setChart] = useState<ChartKind>("bubbles");
  const viewAssets = assets;

  const segBtn = (active: boolean, iconOnly = false) =>
    `flex items-center gap-1.5 rounded-full ${iconOnly ? "px-2.5 py-1.5" : "px-3 py-1"} text-[0.75rem] font-semibold tracking-[0.04em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
      active ? "bg-ink" : "text-ink-muted hover:text-ink bg-transparent"
    }`;
  const segStyle = (active: boolean) =>
    active ? { color: "var(--paper)" } : undefined;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-end gap-3">
        <div className="border-hairline flex rounded-full border p-0.5">
          <button
            onClick={() => setChart("bubbles")}
            aria-pressed={chart === "bubbles"}
            aria-label="Bubbles"
            title="Bubbles"
            className={segBtn(chart === "bubbles", true)}
            style={segStyle(chart === "bubbles")}
          >
            <IconBubbles />
          </button>
          <button
            onClick={() => setChart("treemap")}
            aria-pressed={chart === "treemap"}
            aria-label="Treemap"
            title="Treemap"
            className={segBtn(chart === "treemap", true)}
            style={segStyle(chart === "treemap")}
          >
            <IconTreemap />
          </button>
          <button
            onClick={() => setChart("list")}
            aria-pressed={chart === "list"}
            aria-label="List"
            title="List"
            className={segBtn(chart === "list", true)}
            style={segStyle(chart === "list")}
          >
            <IconList />
          </button>
        </div>
      </div>

      {/* The hard-edged views (table rows, treemap tiles) take more air below
          the toggles than the organic bubble cluster does. */}
      <div
        className={`${chart === "list" ? "mt-12" : chart === "treemap" ? "mt-8" : "mt-3"} min-h-0 flex-1`}
      >
        {chart === "bubbles" ? (
          <GlassBasket
            assets={viewAssets}
            analysts={analysts}
            params={GLASS_PRESET}
            showDeltas
            theme={theme}
            className="rounded-lg"
            ref={apiRef}
          />
        ) : chart === "treemap" ? (
          <GlassTreemap
            assets={viewAssets}
            analysts={analysts}
            params={GLASS_PRESET}
            showDeltas
            theme={theme}
            highlightTicker={highlightTicker}
            className="rounded-lg"
            ref={apiRef}
          />
        ) : (
          <BasketList assets={viewAssets} showDeltas ref={apiRef} />
        )}
      </div>
    </div>
  );
}

function IconBubbles() {
  return (
    <svg
      viewBox="0 0 14 14"
      width="13"
      height="13"
      aria-hidden
      fill="currentColor"
    >
      <circle cx="5" cy="9" r="3.6" />
      <circle cx="10.4" cy="4.4" r="2.5" />
      <circle cx="11.2" cy="10.4" r="1.7" />
    </svg>
  );
}

function IconList() {
  return (
    <svg
      viewBox="0 0 14 14"
      width="13"
      height="13"
      aria-hidden
      fill="currentColor"
    >
      <rect x="1" y="1.5" width="12" height="2.4" rx="0.8" />
      <rect x="1" y="5.8" width="12" height="2.4" rx="0.8" />
      <rect x="1" y="10.1" width="12" height="2.4" rx="0.8" />
    </svg>
  );
}

function IconTreemap() {
  return (
    <svg
      viewBox="0 0 14 14"
      width="13"
      height="13"
      aria-hidden
      fill="currentColor"
    >
      <rect x="1" y="1" width="7" height="12" rx="0.8" />
      <rect x="9.4" y="1" width="3.6" height="6.6" rx="0.8" />
      <rect x="9.4" y="9" width="3.6" height="4" rx="0.8" />
    </svg>
  );
}
