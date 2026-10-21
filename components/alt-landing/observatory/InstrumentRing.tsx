"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Asset, SignalEvent } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import {
  CORE_R,
  CX,
  CY,
  RIM_R,
  RING_R,
  SECTOR_R,
  anchorFor,
  angleDeg,
  buildLayout,
  polar,
} from "./arcs";
import s from "./observatory.module.css";

const ORIGIN: CSSProperties = { transformOrigin: `${CX}px ${CY}px` };
const TRAVELER_TTL_MS = 2600;
const MIN_LABEL_LEN = 1.3; // pathLength units — smaller arcs label on hover

type GlyphKind = "bull" | "bear" | "nocall" | "discard";

interface Traveler {
  key: string;
  kind: GlyphKind;
  angle: number; // deg from 12 o'clock, clockwise
  toR: number;
}

function hashAngle(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

interface InstrumentRingProps {
  assets: Asset[];
  events: SignalEvent[];
  booted: boolean;
  // Per-ticker pulse direction — a mixed post lists every moved holding.
  highlightDirs: Map<string, "bull" | "bear">;
  activeTicker: string | null;
  pinnedTicker: string | null;
  onActivate: (ticker: string | null) => void;
  onPin: (ticker: string | null) => void;
}

/** The basket as a radial instrument: one arc per holding, length = model
 *  weight. Classified posts sweep in from the rim; non-calls die there. */
export function InstrumentRing({
  assets,
  events,
  booted,
  highlightDirs,
  activeTicker,
  pinnedTicker,
  onActivate,
  onPin,
}: InstrumentRingProps) {
  const layout = useMemo(() => buildLayout(assets), [assets]);

  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const seenRef = useRef<Set<string> | null>(null);

  // Spawn a rim glyph for every freshly classified event. First booted pass
  // marks the replayed history as seen so the boot doesn't fire 400 glyphs.
  useEffect(() => {
    if (!booted) return;
    const classified = events.filter((e) => e.stage === "classified");
    if (seenRef.current === null) {
      seenRef.current = new Set(classified.map((e) => e.id));
      return;
    }
    const seen = seenRef.current;
    const fresh = classified.filter((e) => !seen.has(e.id));
    if (fresh.length === 0) return;
    for (const e of fresh) seen.add(e.id);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const arcByTicker = new Map(layout.arcs.map((a) => [a.ticker, a]));
    const spawned: Traveler[] = fresh.flatMap((ev): Traveler[] => {
      const v = ev.verdict;
      if (v?.kind === "used" && v.ticker) {
        // A mixed post sweeps one glyph per call to its own arc.
        const calls = v.calls?.length
          ? v.calls
          : [{ ticker: v.ticker, weightDelta: v.weightDelta ?? 0 }];
        const spawnedCalls = calls.flatMap((call): Traveler[] => {
          const arc = arcByTicker.get(call.ticker);
          if (!arc) return [];
          return [
            {
              key: `${ev.id}:${call.ticker}`,
              kind: (call.weightDelta ?? 0) >= 0 ? "bull" : "bear", // sim-only surface
              angle: angleDeg(arc.mid),
              toR: RING_R + 14,
            },
          ];
        });
        if (spawnedCalls.length > 0) return spawnedCalls;
      }
      return [
        {
          key: ev.id,
          kind: v?.kind === "discarded" ? "discard" : "nocall",
          angle: hashAngle(ev.id),
          toR: RIM_R - 32,
        },
      ];
    });
    setTravelers((prev) => [...prev.slice(-8), ...spawned]);
    const keys = new Set(spawned.map((t) => t.key));
    // No cleanup: the effect re-runs on every feed tick, and clearing the
    // timer there would strand finished glyphs in the DOM.
    window.setTimeout(() => {
      setTravelers((prev) => prev.filter((t) => !keys.has(t.key)));
    }, TRAVELER_TTL_MS);
  }, [events, booted, layout]);

  const emphasized = pinnedTicker ?? activeTicker;

  return (
    <svg
      viewBox="0 0 640 640"
      className={s.svg}
      role="group"
      aria-labelledby="obs-ring-title obs-ring-desc"
    >
      <title id="obs-ring-title">
        The Network Fund basket as a radial instrument
      </title>
      <desc id="obs-ring-desc">
        Each arc is one holding; arc length is its model weight, grouped by
        sector. Classified analyst posts travel from the outer rim to their
        holding; posts with no call fade at the rim. The observatory log beside
        the instrument is the accessible record of the same activity.
      </desc>

      <circle
        cx={CX}
        cy={CY}
        r={RIM_R}
        className={`${s.rim} ${booted ? "" : s.rimCold}`}
      />
      <circle cx={CX} cy={CY} r={CORE_R} className={s.coreRing} />

      {/* Dash geometry lives in a -90deg group so unit 0 sits at 12 o'clock. */}
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {layout.sectors.map((sec) => (
          <circle
            key={sec.sector}
            cx={CX}
            cy={CY}
            r={SECTOR_R}
            pathLength={100}
            strokeDasharray={`${sec.len} ${100 - sec.len}`}
            strokeDashoffset={-sec.start}
            className={s.sectorBand}
          />
        ))}

        {layout.arcs.map((slot) => {
          const asset = assets.find((a) => a.ticker === slot.ticker);
          if (!asset) return null;
          const isEmphasized = emphasized === slot.ticker;
          const dir = highlightDirs.get(slot.ticker);
          const isBull = dir === "bull";
          const isBear = dir === "bear";
          const dash = {
            strokeDasharray: `${slot.len} ${100 - slot.len}`,
            strokeDashoffset: -slot.start,
          };
          const arcClass = [
            s.arc,
            slot.sectorIndex % 2 === 0 ? s.arcEven : s.arcOdd,
            isEmphasized ? s.arcActive : "",
            isBull ? s.arcBull : "",
            isBear ? s.arcBear : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <g
              key={slot.ticker}
              role="button"
              tabIndex={0}
              aria-label={`${asset.ticker} — ${asset.name}, ${asset.sector}. Model weight ${fmtPct(asset.targetWeight)}, fund weight ${fmtPct(asset.weight)}, ${fmtSigned(asset.dayMove ?? 0)} today. ${pinnedTicker === slot.ticker ? "Pinned — " : ""}press Enter to pin details.`}
              aria-pressed={pinnedTicker === slot.ticker}
              className={s.arcGroup}
              onMouseEnter={() => onActivate(slot.ticker)}
              onMouseLeave={() => onActivate(null)}
              onFocus={() => onActivate(slot.ticker)}
              onBlur={() => onActivate(null)}
              onClick={() =>
                onPin(pinnedTicker === slot.ticker ? null : slot.ticker)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPin(pinnedTicker === slot.ticker ? null : slot.ticker);
                }
              }}
            >
              <circle
                cx={CX}
                cy={CY}
                r={RING_R}
                pathLength={100}
                className={s.arcHit}
                {...dash}
              />
              <circle
                cx={CX}
                cy={CY}
                r={RING_R}
                pathLength={100}
                className={arcClass}
                style={ORIGIN}
                {...dash}
              />
            </g>
          );
        })}
      </g>

      {/* Ticker labels — horizontal, hidden for slivers until emphasized. */}
      {layout.arcs.map((slot) => {
        const p = polar(slot.mid, RING_R + 28);
        const isEmphasized = emphasized === slot.ticker;
        const dir = highlightDirs.get(slot.ticker);
        const isHighlight = dir !== undefined;
        const cls = [
          s.tickerLabel,
          slot.len < MIN_LABEL_LEN && !isEmphasized && !isHighlight
            ? s.tickerLabelHidden
            : "",
          isEmphasized ? s.tickerLabelActive : "",
          dir === "bull" ? s.tickerLabelBull : "",
          dir === "bear" ? s.tickerLabelBear : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <text
            key={slot.ticker}
            x={p.x}
            y={p.y}
            textAnchor={anchorFor(slot.mid)}
            dominantBaseline="middle"
            className={cls}
            aria-hidden
          >
            {slot.ticker}
          </text>
        );
      })}

      {/* Sector names for the sectors big enough to carry one. */}
      {layout.sectors
        .filter((sec) => sec.share >= 0.045)
        .map((sec) => {
          const p = polar(sec.mid, SECTOR_R + 18);
          return (
            <text
              key={sec.sector}
              x={p.x}
              y={p.y}
              textAnchor={anchorFor(sec.mid)}
              dominantBaseline="middle"
              className={s.sectorLabel}
              aria-hidden
            >
              {sec.sector}
            </text>
          );
        })}

      {/* Incoming glyphs + momentum ripples. Decorative: the log is the record. */}
      <g aria-hidden>
        {travelers.map((t) => {
          const vars = {
            ...ORIGIN,
            "--ang": `${t.angle}deg`,
            "--from-y": `${-RIM_R}px`,
            "--to-y": `${-t.toR}px`,
          } as CSSProperties;
          return (
            <g key={t.key} className={s.traveler} style={vars}>
              {t.kind === "bull" && (
                <>
                  <circle cx={CX} cy={CY} r={8} className={s.glyphHaloBull} />
                  <circle cx={CX} cy={CY} r={4} className={s.glyphBull} />
                </>
              )}
              {t.kind === "bear" && (
                <>
                  <circle cx={CX} cy={CY} r={8} className={s.glyphHaloBear} />
                  <circle cx={CX} cy={CY} r={4} className={s.glyphBear} />
                </>
              )}
              {t.kind === "nocall" && (
                <circle cx={CX} cy={CY} r={3.5} className={s.glyphNoCall} />
              )}
              {t.kind === "discard" && (
                <path
                  d={`M ${CX - 3.2} ${CY - 3.2} L ${CX + 3.2} ${CY + 3.2} M ${CX - 3.2} ${CY + 3.2} L ${CX + 3.2} ${CY - 3.2}`}
                  className={s.glyphDiscard}
                />
              )}
            </g>
          );
        })}
        {travelers
          .filter((t) => t.kind === "bull" || t.kind === "bear")
          .map((t) => (
            <circle
              key={`ripple-${t.key}`}
              cx={CX}
              cy={CY}
              r={RING_R}
              className={`${s.ripple} ${t.kind === "bull" ? s.rippleBull : s.rippleBear}`}
              style={ORIGIN}
            />
          ))}
      </g>
    </svg>
  );
}
