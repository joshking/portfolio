"use client";

import { useEffect, useRef, useState } from "react";
import { useSim } from "@/lib/sim/store";
import type { Analyst, Asset } from "@/lib/sim/types";
import { GlassBasket } from "./GlassBasket";
import { GLASS_PRESET, GLASS_PARAMS_KEY } from "./glass-preset";

// The lab stage: a snapshot of the basket rendered as the glass basket, wrapped
// with live shader controls. The rendering itself (and its hover/lock/avatars)
// lives in GlassBasket, which the Time Machine reuses with the same values. The
// sliders default to GLASS_PRESET and persist to localStorage, so tweaks survive
// a reload instead of snapping back.

const CONTROLS = [
  { key: "u_refract", label: "Refraction", min: 0, max: 0.12, step: 0.002 },
  { key: "u_rim", label: "Rim", min: 0, max: 1.4, step: 0.02 },
  { key: "u_gloss", label: "Gloss", min: 6, max: 220, step: 2 },
  { key: "u_tint", label: "Tint", min: 0, max: 0.9, step: 0.02 },
  { key: "u_dither", label: "Dither", min: 0, max: 1, step: 0.02 },
] as const;

export function ShaderStage() {
  const sim = useSim();
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snapshot, setSnapshot] = useState<{
    assets: Asset[];
    analysts: Analyst[];
  } | null>(null);
  const [params, setParams] = useState<Record<string, number>>(() => ({
    ...GLASS_PRESET,
  }));

  // Restore any saved slider tweaks after mount (client only, so no hydration
  // mismatch; deferred so the set is out of the render pass). The lab remembers
  // where you left the dials.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(GLASS_PARAMS_KEY);
    } catch {
      /* ignore unavailable/blocked storage */
    }
    if (!saved) return;
    const id = setTimeout(() => {
      try {
        setParams((p) => ({ ...p, ...JSON.parse(saved) }));
      } catch {
        /* ignore malformed storage */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Capture the basket once it has booted; a stable snapshot, not live. The set
  // is deferred and scheduled exactly once so the churning sim.assets identity
  // can't starve it.
  useEffect(() => {
    if (snapshot || snapTimerRef.current || !sim.booted || !sim.assets.length)
      return;
    snapTimerRef.current = setTimeout(
      () => setSnapshot({ assets: sim.assets, analysts: sim.analysts }),
      0,
    );
  }, [snapshot, sim.booted, sim.assets, sim.analysts]);
  useEffect(
    () => () => {
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
    },
    [],
  );

  const onControl = (key: string, value: number) =>
    setParams((p) => {
      const next = { ...p, [key]: value };
      try {
        window.localStorage.setItem(GLASS_PARAMS_KEY, JSON.stringify(next));
      } catch {
        /* ignore unavailable/blocked storage */
      }
      return next;
    });

  return (
    <div
      className="relative h-[min(72vh,640px)] w-full overflow-hidden rounded-2xl"
      style={{ background: "var(--paper)" }}
    >
      <GlassBasket
        assets={snapshot?.assets ?? []}
        analysts={snapshot?.analysts ?? []}
        params={params}
      />
      <div
        className="absolute top-4 right-4 z-10 w-56 rounded-xl p-4"
        style={{
          background: "rgba(1, 18, 44, 0.5)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--hairline)",
        }}
      >
        {CONTROLS.map((c) => (
          <label key={c.key} className="mb-3 block last:mb-0">
            <span className="text-ink flex items-baseline justify-between text-[0.7rem] font-semibold tracking-[0.06em] uppercase">
              {c.label}
              <span className="text-ink-muted tabular-nums">
                {params[c.key].toFixed(c.step < 1 ? 3 : 0)}
              </span>
            </span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={params[c.key]}
              onChange={(e) => onControl(c.key, Number(e.target.value))}
              className="mt-1.5 w-full accent-white"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
