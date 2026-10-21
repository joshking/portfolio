"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Analyst, Asset, SignalEvent } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import { Avatar } from "@/components/briefing/Avatar";
import type { PtTheme } from "./ThemeSwitch";
import styles from "./primetime.module.css";

// ---------------------------------------------------------------------------
// The studio floor: the organism's soft-body basket dropped into the
// broadcast set. Decoration only — the canvas is aria-hidden; the record
// strip below is the accessible surface. Colors come from the active theme's
// --pt-cv-* vars, so the whole habitat re-skins with the chrome.
// ---------------------------------------------------------------------------

const DPR_CAP = 2;
const FILL = 0.38; // share of floor area covered by bubbles
const POINTER_REACH = 130; // px beyond a bubble's rim the cursor field reaches
const POKE_REACH = 110; // px beyond the poked bubble the impulse travels

interface Palette {
  bull: string; // "r, g, b" triplets
  bear: string;
  grey: string;
  body: string;
  label: string;
  accent: string;
  tintS: number; // per-stock hue tint, themed saturation/lightness
  tintL: number;
  plateBg: string; // badge/plate backing triplet
}

const FALLBACK: Palette = {
  bull: "47, 196, 130",
  bear: "233, 58, 49",
  grey: "170, 184, 198",
  body: "150, 170, 192",
  label: "242, 243, 247",
  tintS: 58,
  tintL: 62,
  plateBg: "12, 13, 18",
  accent: "125, 143, 245",
};

interface OrgNode {
  ticker: string;
  hue: number;
  asset: Asset;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  targetR: number;
  phase: number; // ambient drift offset
  warm: number; // 0..1 feed glow, decays
  cool: number; // 0..1 bruise flash, decays
  ghost?: boolean; // loading placeholder — no label, no hit test
}

// Loading state: unlabeled neutral bubbles breathing on the floor's own idle
// physics — the basket forming, not a spinner. Weights only shape radii.
const GHOST_WEIGHTS = [0.2, 0.16, 0.14, 0.12, 0.11, 0.1, 0.09];

function ghostAsset(targetWeight: number, i: number): Asset {
  return {
    ticker: `·${i}`,
    name: "",
    sector: "",
    weight: targetWeight,
    targetWeight,
    dayMove: null,
    supporters: [],
    opponents: [],
  };
}

interface Particle {
  kind: "bull" | "bear" | "fizzle";
  ticker: string | null; // live target for bull/bear
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  tx: number; // fixed target for fizzle
  ty: number;
  t: number; // 0..1 progress
  dur: number; // ms
  size: number;
  dieAt: number; // fizzle dissolves before arrival
  dim: boolean; // discarded = dimmer, dies earlier
}

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  tone: "bull" | "bear" | "grey";
}

interface Ripple {
  ticker: string;
  age: number;
  tone: "bear" | "accent"; // bearish impact vs. cursor poke
}

// Bridge quotes are nullable by design — "—" is the honest render, never 0.
function fmtPrice(p: number | null | undefined): string {
  if (p == null) return "—";
  const digits = p >= 1 ? 2 : 4;
  return `$${p.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

// Deterministic per-ticker hue (FNV-1a, same trick as the sim's analyst hues)
function tickerHue(ticker: string): number {
  let h = 2166136261;
  for (let i = 0; i < ticker.length; i++) {
    h ^= ticker.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

// Company logos from parqet's public asset CDN; decorative only, so a failed
// load silently falls back to the ticker label. Never read back (no taint use).
const iconCache = new Map<string, HTMLImageElement | "failed">();
// Per-ticker brand color sampled from the logo (same-origin proxy makes the
// canvas readable); falls back to the hash hue when sampling fails.
const brandColor = new Map<string, { h: number; s: number } | null>();

function sampleBrand(ticker: string, img: HTMLImageElement) {
  try {
    const size = 24;
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let rs = 0,
      gs = 0,
      bs = 0,
      n = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a < 200) continue;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      // skip near-white/near-black/greys — we want the brand accent
      if (mx > 235 && mn > 215) continue;
      if (mx < 40) continue;
      if (mx - mn < 24) continue;
      rs += r;
      gs += g;
      bs += b;
      n++;
    }
    if (n < 8) {
      brandColor.set(ticker, null);
      return;
    }
    const r = rs / n / 255;
    const g = gs / n / 255;
    const b = bs / n / 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const d = mx - mn;
    let h = 0;
    if (d > 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = (h * 60 + 360) % 360;
    }
    const l = (mx + mn) / 2;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    brandColor.set(ticker, { h, s: Math.min(1, sat) });
  } catch {
    brandColor.set(ticker, null); // tainted or unreadable — hash hue stands
  }
}

function iconFor(ticker: string): HTMLImageElement | null {
  const cached = iconCache.get(ticker);
  if (cached === "failed") return null;
  if (cached) return cached.complete && cached.naturalWidth > 0 ? cached : null;
  const img = new Image();
  img.onload = () => sampleBrand(ticker, img);
  img.onerror = () => {
    // proxy miss — fall back to parqet directly (renders, can't be sampled)
    const direct = new Image();
    direct.onerror = () => iconCache.set(ticker, "failed");
    direct.src = `https://assets.parqet.com/logos/symbol/${ticker}?format=png&size=128`;
    iconCache.set(ticker, direct);
  };
  img.src = `/api/bridge/logo/${ticker}`;
  iconCache.set(ticker, img);
  return null;
}

interface World {
  nodes: OrgNode[];
  particles: Particle[];
  motes: Mote[];
  ripples: Ripple[];
  processed: Set<string>;
  processedInit: boolean;
  w: number;
  h: number;
  hovered: string | null;
  px: number; // pointer position, canvas space
  py: number;
  pointerOn: boolean; // mouse inside — drives the force field
}

function radiiScale(w: number, h: number, assets: Asset[]): number {
  const total = assets.reduce(
    (s, a) => s + Math.max(0.0001, a.targetWeight),
    0,
  );
  if (total <= 0) return 0;
  return Math.sqrt((w * h * FILL) / (Math.PI * total));
}

function targetRadius(asset: Asset, scale: number, h: number): number {
  const r = Math.sqrt(Math.max(0.0001, asset.targetWeight)) * scale;
  return Math.min(h * 0.26, Math.max(9, r));
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function quad(a: number, c: number, b: number, u: number): number {
  return (1 - u) * (1 - u) * a + 2 * (1 - u) * u * c + u * u * b;
}

// The soft-body step: gentle centering, ambient drift, pairwise separation.
// `interactive` adds the cursor force field + hover buoyancy; the static
// settle pass (reduced motion, resize) runs with it off.
function stepPhysics(
  world: World,
  k: number,
  ts: number,
  interactive: boolean,
) {
  const { nodes, w, h } = world;
  const cx = w / 2;
  const cy = h / 2;
  for (const n of nodes) {
    // Softer centering: lets the cluster spread instead of compressing.
    n.vx += (cx - n.x) * 0.0009 * k;
    n.vy += (cy - n.y) * 0.0009 * k;
    n.vx += Math.sin(ts * 0.00037 + n.phase) * 0.007 * k;
    n.vy += Math.cos(ts * 0.00031 + n.phase * 1.7) * 0.007 * k;
    if (interactive && world.pointerOn && n.ticker !== world.hovered) {
      // Cursor force field: bubbles gently part around the pointer. The
      // falloff is smooth and the global damping keeps it fluid, not jittery.
      // The hovered bubble is exempt — repelling it away from a stationary
      // cursor would push its own hover plate out from under the reader.
      const dx = n.x - world.px;
      const dy = n.y - world.py;
      const dist = Math.hypot(dx, dy) || 0.001;
      const reach = n.r + POINTER_REACH;
      if (dist < reach) {
        const falloff = smooth(1 - dist / reach);
        n.vx += (dx / dist) * falloff * 0.16 * k;
        n.vy += (dy / dist) * falloff * 0.16 * k;
      }
    }
    if (interactive && n.ticker === world.hovered) {
      n.vy -= 0.02 * k; // slight buoyancy lift under the cursor
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const min = a.r + b.r + 10; // visible air between neighbors
      if (dist < min) {
        const push = ((min - dist) / dist) * 0.42 * Math.min(1, k);
        const wa = b.r / (a.r + b.r); // small bubbles yield to big ones
        a.x -= dx * push * wa;
        a.y -= dy * push * wa;
        b.x += dx * push * (1 - wa);
        b.y += dy * push * (1 - wa);
      }
    }
  }
  const damp = Math.pow(0.9, k);
  const decay = Math.pow(0.968, k);
  for (const n of nodes) {
    n.vx *= damp;
    n.vy *= damp;
    n.x += n.vx * k;
    n.y += n.vy * k;
    n.x = Math.min(w - n.r - 4, Math.max(n.r + 4, n.x));
    n.y = Math.min(h - n.r - 4, Math.max(n.r + 4, n.y));
    n.r += (n.targetR - n.r) * Math.min(1, 0.08 * k);
    n.warm *= decay;
    n.cool *= decay;
  }
}

export function BasketCanvas({
  assets,
  analystsById,
  events,
  highlightCalls,
  focusTicker,
  theme,
  cold,
  liveMode,
  onHoverTicker,
}: {
  assets: Asset[];
  analystsById: Map<string, Analyst>;
  events: SignalEvent[];
  highlightCalls: { ticker: string; weightDelta: number }[];
  focusTicker: string | null;
  theme: PtTheme;
  cold: boolean;
  /** Live mode: single-series model weights — the plate hides fund/day. */
  liveMode: boolean;
  onHoverTicker: (ticker: string | null) => void;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World>({
    nodes: [],
    particles: [],
    motes: [],
    ripples: [],
    processed: new Set(),
    processedInit: false,
    w: 0,
    h: 0,
    hovered: null,
    px: 0,
    py: 0,
    pointerOn: false,
  });
  const reducedRef = useRef(false);
  const monoRef = useRef("ui-monospace, monospace");
  const paletteRef = useRef<Palette>(FALLBACK);
  const highlightRef = useRef<Set<string>>(new Set());
  const focusRef = useRef<string | null>(focusTicker);
  const drawStaticRef = useRef<(() => void) | null>(null);
  const platePosRef = useRef<(() => void) | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // The plate mounts a render after the hit test, so place it once it exists
  // (pointermove keeps it pinned to the cursor afterwards).
  useEffect(() => {
    platePosRef.current?.();
  }, [hovered]);

  // ---- theme -> canvas palette (resolved from the --pt-cv-* vars) ----------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cs = getComputedStyle(wrap);
    const read = (name: string, fallback: string) =>
      cs.getPropertyValue(name).trim() || fallback;
    paletteRef.current = {
      bull: read("--pt-cv-bull", FALLBACK.bull),
      bear: read("--pt-cv-bear", FALLBACK.bear),
      grey: read("--pt-cv-grey", FALLBACK.grey),
      body: read("--pt-cv-body", FALLBACK.body),
      label: read("--pt-cv-label", FALLBACK.label),
      accent: read("--pt-cv-accent", FALLBACK.accent),
      // per-stock tint: saturation/lightness tuned per theme, hue per ticker
      tintS: theme === "daylight" ? 52 : 58,
      tintL: theme === "daylight" ? 40 : 62,
      plateBg: read(
        "--pt-cv-plate",
        theme === "daylight" ? "247, 246, 242" : FALLBACK.plateBg,
      ),
    };
    if (reducedRef.current) drawStaticRef.current?.();
  }, [theme]);

  // ---- sync assets into physics nodes --------------------------------------
  useEffect(() => {
    const world = worldRef.current;
    if (assets.length === 0) {
      // Cold floor: seed ghost bubbles so loading IS the basket forming.
      if (cold && world.nodes.length === 0) {
        const stubs = GHOST_WEIGHTS.map((w, i) => ghostAsset(w, i));
        const scale = radiiScale(world.w || 1, world.h || 1, stubs);
        stubs.forEach((stub, i) => {
          const angle = i * 2.39996;
          world.nodes.push({
            ticker: stub.ticker,
            hue: 0,
            asset: stub,
            ghost: true,
            x: world.w / 2 + Math.cos(angle) * (24 + i * 6),
            y: world.h / 2 + Math.sin(angle) * (24 + i * 6),
            vx: 0,
            vy: 0,
            r: 2,
            targetR: world.w > 0 ? targetRadius(stub, scale, world.h) : 12,
            phase: i * 1.31,
            warm: 0,
            cool: 0,
          });
        });
        if (reducedRef.current) drawStaticRef.current?.();
      }
      return;
    }
    // Real assets arrive: the ghosts give way to the true holdings.
    if (world.nodes.some((n) => n.ghost)) {
      world.nodes = world.nodes.filter((n) => !n.ghost);
    }
    const scale = radiiScale(world.w || 1, world.h || 1, assets);
    const seen = new Set<string>();
    assets.forEach((asset, i) => {
      seen.add(asset.ticker);
      const existing = world.nodes.find((n) => n.ticker === asset.ticker);
      if (existing) {
        existing.asset = asset;
        if (world.w > 0) {
          existing.targetR = targetRadius(asset, scale, world.h);
        }
        return;
      }
      const angle = i * 2.39996; // golden-angle scatter around center
      world.nodes.push({
        ticker: asset.ticker,
        hue: tickerHue(asset.ticker),
        asset,
        x: world.w / 2 + Math.cos(angle) * (20 + i * 4),
        y: world.h / 2 + Math.sin(angle) * (20 + i * 4),
        vx: 0,
        vy: 0,
        r: 2,
        targetR: world.w > 0 ? targetRadius(asset, scale, world.h) : 10,
        phase: i * 1.31,
        warm: 0,
        cool: 0,
      });
    });
    world.nodes = world.nodes.filter((n) => seen.has(n.ticker));
    if (reducedRef.current) drawStaticRef.current?.();
  }, [assets, cold]);

  // ---- keep loop-facing refs fresh; reduced mode redraws on change ---------
  useEffect(() => {
    highlightRef.current = new Set(highlightCalls.map((c) => c.ticker));
    focusRef.current = focusTicker;
    if (reducedRef.current) drawStaticRef.current?.();
  }, [highlightCalls, focusTicker]);

  // ---- newly classified events -> flight / dissolve animations -------------
  useEffect(() => {
    const world = worldRef.current;
    if (!world.processedInit) {
      // Don't replay boot history as a particle storm.
      for (const ev of events) {
        if (ev.stage === "classified") world.processed.add(ev.id);
      }
      world.processedInit = true;
      return;
    }
    for (const ev of events.slice(0, 12)) {
      if (ev.stage !== "classified" || !ev.verdict) continue;
      if (world.processed.has(ev.id)) continue;
      world.processed.add(ev.id);
      if (reducedRef.current || document.hidden) continue;
      const { w, h } = world;
      if (w === 0) continue;
      const sy = h * (0.28 + Math.random() * 0.44);
      const centroidX =
        world.nodes.reduce((s, n) => s + n.x, 0) / (world.nodes.length || 1);
      const centroidY =
        world.nodes.reduce((s, n) => s + n.y, 0) / (world.nodes.length || 1);
      const v = ev.verdict;
      const calls =
        v.kind === "used"
          ? (v.calls ??
            (v.ticker
              ? [
                  {
                    action: v.action ?? ("BUY" as const),
                    ticker: v.ticker,
                    confidence: v.confidence ?? 0,
                    weightDelta: v.weightDelta ?? null,
                  },
                ]
              : []))
          : [];
      for (const [ci, call] of calls.entries()) {
        // A call whose ticker has no bubble in THIS basket must not fly to
        // the cluster center: it dissolves like a no-call — the honest read,
        // since that call didn't move this basket. (Bubbles that do exist
        // are homed to per-frame: the draw loop reads the node's live x/y.)
        const hasBubble = world.nodes.some(
          (n) => !n.ghost && n.ticker === call.ticker,
        );
        if (!hasBubble) {
          world.particles.push({
            kind: "fizzle",
            ticker: null,
            sx: -6,
            sy: sy + ci * 14,
            cx: w * 0.3,
            cy: sy - h * 0.12 + ci * 10,
            tx: centroidX,
            ty: centroidY,
            t: 0,
            dur: 900,
            size: 2.2,
            dieAt: 0.58,
            dim: false,
          });
          continue;
        }
        // Direction comes from the call's action, never from a delta sign.
        // Live mode has no per-post delta — particles size by confidence.
        const delta = call.weightDelta;
        world.particles.push({
          kind: call.action === "BUY" ? "bull" : "bear",
          ticker: call.ticker,
          sx: -6,
          sy: sy + ci * 14,
          cx: w * 0.32,
          cy: sy - h * 0.16 + ci * 10,
          tx: centroidX,
          ty: centroidY,
          t: 0,
          dur: 950 + Math.random() * 250 + ci * 120,
          size:
            delta != null
              ? 2.5 + Math.min(5, Math.abs(delta * 100) * 6)
              : 2.5 + Math.min(5, call.confidence * 4),
          dieAt: 1,
          dim: false,
        });
      }
      if (calls.length === 0) {
        world.particles.push({
          kind: "fizzle",
          ticker: null,
          sx: -6,
          sy,
          cx: w * 0.3,
          cy: sy - h * 0.12,
          tx: centroidX,
          ty: centroidY,
          t: 0,
          dur: 900,
          size: 2.2,
          dieAt: v.kind === "discarded" ? 0.42 : 0.58,
          dim: v.kind === "discarded",
        });
      }
    }
    if (world.processed.size > 1200) {
      const keep = new Set(events.map((e) => e.id));
      world.processed = new Set(
        [...world.processed].filter((id) => keep.has(id)),
      );
    }
  }, [events]);

  // ---- canvas lifecycle: size, loop, pointer -------------------------------
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const agate = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-agate")
      .trim();
    if (agate) monoRef.current = `${agate}, ui-monospace, monospace`;

    const world = worldRef.current;
    let dpr = 1;

    const toneRgb = (tone: Mote["tone"]) => {
      const P = paletteRef.current;
      return tone === "bull" ? P.bull : tone === "bear" ? P.bear : P.grey;
    };

    const stepEffects = (k: number) => {
      const nodeOf = (ticker: string | null) =>
        ticker ? world.nodes.find((n) => n.ticker === ticker) : undefined;
      world.particles = world.particles.filter((p) => {
        p.t += (k * 16.67) / p.dur;
        // Target holding left the basket mid-flight (rebalance) — dissolve
        // where it is instead of sailing on to a stale snapshot point.
        if (p.kind !== "fizzle" && !nodeOf(p.ticker)) {
          p.kind = "fizzle";
          p.dieAt = Math.min(1, p.t + 0.12);
          p.dim = true;
        }
        if (p.kind === "fizzle" && p.t >= p.dieAt) {
          const u = smooth(p.dieAt);
          const x = quad(p.sx, p.cx, p.tx, u);
          const y = quad(p.sy, p.cy, p.ty, u);
          for (let i = 0; i < 7; i++) {
            world.motes.push({
              x,
              y,
              vx: (Math.random() - 0.5) * 1.2,
              vy: Math.random() * 0.8 + 0.2,
              life: p.dim ? 0.6 : 1,
              tone: "grey",
            });
          }
          return false;
        }
        if (p.t >= 1) {
          const n = nodeOf(p.ticker);
          if (n) {
            if (p.kind === "bull") {
              n.warm = 1;
              n.r += 3; // gulp — settles back via the radius lerp
              for (let i = 0; i < 6; i++) {
                const a = Math.random() * Math.PI * 2;
                world.motes.push({
                  x: n.x + Math.cos(a) * n.r,
                  y: n.y + Math.sin(a) * n.r,
                  vx: -Math.cos(a) * 0.8,
                  vy: -Math.sin(a) * 0.8,
                  life: 0.8,
                  tone: "bull",
                });
              }
            } else {
              n.cool = 1;
              n.r = Math.max(4, n.r - 3);
              world.ripples.push({ ticker: n.ticker, age: 0, tone: "bear" });
            }
          }
          return false;
        }
        return true;
      });
      world.motes = world.motes.filter((m) => {
        m.x += m.vx * k;
        m.y += m.vy * k;
        m.vy += 0.01 * k;
        m.life -= 0.022 * k;
        return m.life > 0;
      });
      world.ripples = world.ripples.filter((rp) => {
        rp.age += k;
        return rp.age < 40;
      });
    };

    const draw = () => {
      const { w, h } = world;
      const P = paletteRef.current;
      ctx.clearRect(0, 0, w, h);
      const hoveredNow = world.hovered;
      const focusNow = focusRef.current;
      const highlightNow = highlightRef.current;
      const sorted = [...world.nodes].sort((a, b) => b.r - a.r);
      for (const n of sorted) {
        if (n.ghost) {
          // Ghost bubble: a quiet neutral membrane, breathing. No label, no
          // logo, no badge — the shape of a holding before the data lands.
          const breath =
            1 + 0.045 * Math.sin(performance.now() * 0.0011 + n.phase * 2.3);
          const rr = n.r * breath;
          const gg = ctx.createRadialGradient(
            n.x - rr * 0.35,
            n.y - rr * 0.4,
            rr * 0.15,
            n.x,
            n.y,
            rr,
          );
          gg.addColorStop(0, `rgba(${P.grey}, 0.14)`);
          gg.addColorStop(0.7, `rgba(${P.grey}, 0.07)`);
          gg.addColorStop(1, `rgba(${P.grey}, 0.02)`);
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${P.grey}, 0.22)`;
          ctx.stroke();
          continue;
        }
        const lit =
          n.ticker === hoveredNow ||
          n.ticker === focusNow ||
          highlightNow.has(n.ticker);
        // membrane body — tinted by the stock's own hue
        const brand = brandColor.get(n.ticker);
        const hue = brand ? brand.h : n.hue;
        const sat = brand
          ? Math.round(Math.min(0.85, Math.max(0.35, brand.s)) * 100)
          : P.tintS;
        const tint = (a: number) => `hsla(${hue}, ${sat}%, ${P.tintL}%, ${a})`;
        const g = ctx.createRadialGradient(
          n.x - n.r * 0.35,
          n.y - n.r * 0.4,
          n.r * 0.15,
          n.x,
          n.y,
          n.r,
        );
        g.addColorStop(0, tint(0.34));
        g.addColorStop(0.7, tint(0.16));
        g.addColorStop(1, tint(0.06));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        // studio lights: bullish feed glow / bearish bruise
        if (n.warm > 0.02) {
          const wg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          wg.addColorStop(0, `rgba(${P.bull}, ${0.4 * n.warm})`);
          wg.addColorStop(1, `rgba(${P.bull}, 0)`);
          ctx.fillStyle = wg;
          ctx.fill();
        }
        if (n.cool > 0.02) {
          const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          cg.addColorStop(0, `rgba(${P.bear}, ${0.36 * n.cool})`);
          cg.addColorStop(1, `rgba(${P.bear}, 0)`);
          ctx.fillStyle = cg;
          ctx.fill();
        }
        // rim
        ctx.lineWidth = lit ? 1.5 : 1;
        ctx.strokeStyle =
          n.warm > 0.05
            ? `rgba(${P.bull}, ${0.25 + 0.6 * n.warm})`
            : n.cool > 0.05
              ? `rgba(${P.bear}, ${0.25 + 0.6 * n.cool})`
              : tint(lit ? 0.8 : 0.38);
        ctx.stroke();
        // sustained highlight halo (~4s after a USED verdict)
        if (highlightNow.has(n.ticker)) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${P.label}, 0.35)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // luminous hover ring
        if (n.ticker === hoveredNow) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${P.accent}, 0.85)`;
          ctx.lineWidth = 1.6;
          ctx.shadowColor = `rgba(${P.accent}, 0.9)`;
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // in-bubble composition (decorative — the record below is the
        // accessible surface): the logo IS the bubble face, padded evenly;
        // the weight badge sits at the lower rim; ticker text only as a
        // fallback when no logo loads.
        const icon = n.r >= 11 ? iconFor(n.ticker) : null;
        if (icon) {
          // Adaptive emblem: scales with the bubble (bigger presence on big
          // bubbles, near-fill on small ones).
          const ir =
            n.r < 16 ? n.r * 0.55 : Math.max(9, Math.min(n.r * 0.42, 40));
          const iy = n.r >= 16 ? n.y - n.r * 0.26 : n.y;
          ctx.save();
          ctx.beginPath();
          ctx.arc(n.x, iy, ir, 0, Math.PI * 2);
          ctx.clip();
          // soft backing so transparent logos stay legible on any tint
          ctx.fillStyle = `rgba(${P.label}, 0.1)`;
          ctx.fillRect(n.x - ir, iy - ir, ir * 2, ir * 2);
          ctx.globalAlpha = 0.96;
          ctx.drawImage(icon, n.x - ir, iy - ir, ir * 2, ir * 2);
          ctx.restore();
          ctx.globalAlpha = 1;
        } else if (n.r >= 13) {
          const fsT = Math.max(10, Math.min(n.r * 0.32, 16));
          ctx.font = `600 ${fsT}px ${monoRef.current}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `rgba(${P.label}, 0.9)`;
          ctx.fillText(n.ticker, n.x, n.y - (n.r >= 17 ? n.r * 0.18 : 0));
        }
        // weight badge on the lower rim — the headline number
        if (n.r >= 15) {
          const fsP = Math.max(9, Math.min(n.r * 0.2, 14));
          ctx.font = `700 ${fsP}px ${monoRef.current}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const by = n.y + n.r * 0.5;
          const label = fmtPct(n.asset.targetWeight);
          const tw = ctx.measureText(label).width;
          const padX = fsP * 0.42;
          const bh = fsP * 1.5;
          ctx.beginPath();
          ctx.roundRect(
            n.x - tw / 2 - padX,
            by - bh / 2,
            tw + padX * 2,
            bh,
            bh / 2,
          );
          ctx.fillStyle = `rgba(${P.plateBg}, 0.78)`;
          ctx.fill();
          ctx.strokeStyle = tint(0.55);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = `rgba(${P.label}, 0.98)`;
          ctx.fillText(label, n.x, by + 0.5);
        }
      }
      // impact / poke ripples
      for (const rp of world.ripples) {
        const n = world.nodes.find((nd) => nd.ticker === rp.ticker);
        if (!n) continue;
        const p = rp.age / 40;
        const rgb = rp.tone === "accent" ? P.accent : P.bear;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 2 + p * 26, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb}, ${0.4 * (1 - p)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      // stimuli in flight
      for (const p of world.particles) {
        const n = p.ticker
          ? world.nodes.find((nd) => nd.ticker === p.ticker)
          : undefined;
        const tx = n ? n.x : p.tx;
        const ty = n ? n.y : p.ty;
        const u = smooth(Math.min(1, p.t));
        const x = quad(p.sx, p.cx, tx, u);
        const y = quad(p.sy, p.cy, ty, u);
        const rgb =
          p.kind === "bull" ? P.bull : p.kind === "bear" ? P.bear : P.grey;
        const fade =
          p.kind === "fizzle"
            ? Math.max(0.15, 1 - p.t / p.dieAt) * (p.dim ? 0.6 : 1)
            : 1;
        // trail
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 1; s <= 6; s++) {
          const uu = Math.max(0, u - s * 0.02);
          ctx.lineTo(quad(p.sx, p.cx, tx, uu), quad(p.sy, p.cy, ty, uu));
        }
        ctx.strokeStyle = `rgba(${rgb}, ${0.3 * fade})`;
        ctx.lineWidth = p.size * 0.6;
        ctx.stroke();
        // head
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.9 * fade})`;
        ctx.fill();
      }
      // dissolution motes
      for (const m of world.motes) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${toneRgb(m.tone)}, ${0.7 * Math.max(0, m.life)})`;
        ctx.fill();
      }
    };

    // The plate anchors to the hovered bubble (not the cursor): it sits
    // beside the bubble, flips sides near the edges, stays fully inside the
    // floor, and eases toward its target so following feels fluid.
    const plateXY = { x: -9999, y: -9999, snapped: false };
    const positionPlate = () => {
      const plate = plateRef.current;
      if (!plate || world.hovered === null) {
        plateXY.snapped = false;
        return;
      }
      const n = world.nodes.find((nd) => nd.ticker === world.hovered);
      if (!n) return;
      const pw = plate.offsetWidth || 230;
      const ph = plate.offsetHeight || 140;
      const gap = 16;
      let tx = n.x + n.r + gap;
      if (tx + pw > world.w - 8) tx = n.x - n.r - gap - pw; // flip left
      tx = Math.min(world.w - pw - 8, Math.max(8, tx));
      let ty = n.y - ph / 2;
      ty = Math.min(world.h - ph - 8, Math.max(8, ty));
      if (!plateXY.snapped) {
        plateXY.x = tx;
        plateXY.y = ty;
        plateXY.snapped = true;
      } else {
        plateXY.x += (tx - plateXY.x) * 0.22;
        plateXY.y += (ty - plateXY.y) * 0.22;
      }
      plate.style.transform = `translate(${plateXY.x}px, ${plateXY.y}px)`;
    };

    const settleAndDraw = () => {
      world.pointerOn = false;
      for (const n of world.nodes) {
        n.r = n.targetR;
        n.warm = 0;
        n.cool = 0;
      }
      for (let i = 0; i < 240; i++) stepPhysics(world, 1, i * 16.67, false);
      world.particles = [];
      world.motes = [];
      world.ripples = [];
      draw();
      positionPlate();
    };
    drawStaticRef.current = settleAndDraw;
    platePosRef.current = positionPlate;

    const resize = () => {
      const box = wrap.getBoundingClientRect();
      dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      const prevW = world.w;
      const prevH = world.h;
      world.w = box.width;
      world.h = box.height;
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scale = radiiScale(
        world.w,
        world.h,
        world.nodes.map((n) => n.asset),
      );
      for (const n of world.nodes) {
        if (prevW > 0 && prevH > 0) {
          n.x = (n.x / prevW) * world.w;
          n.y = (n.y / prevH) * world.h;
        } else {
          n.x = world.w / 2 + (Math.random() - 0.5) * 60;
          n.y = world.h / 2 + (Math.random() - 0.5) * 60;
        }
        n.targetR = targetRadius(n.asset, scale, world.h);
      }
      if (reducedRef.current) settleAndDraw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    let raf = 0;
    let running = false;
    let inView = true;
    let last = performance.now();
    const frame = (ts: number) => {
      if (!running) return;
      const k = Math.min(2.5, Math.max(0.2, (ts - last) / 16.67));
      last = ts;
      stepPhysics(world, k, ts, true);
      stepEffects(k);
      draw();
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const startLoop = () => {
      if (reducedRef.current || running || !inView || document.hidden) {
        return;
      }
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              if (inView) startLoop();
              else stopLoop();
            },
            { rootMargin: "200px 0px" },
          )
        : null;
    io?.observe(wrap);
    if (reducedRef.current) {
      settleAndDraw();
    } else {
      startLoop();
    }

    const hitTest = (e: {
      clientX: number;
      clientY: number;
    }): OrgNode | null => {
      const box = canvas.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      let best: OrgNode | null = null;
      for (const n of world.nodes) {
        if (n.ghost) continue;
        if (Math.hypot(n.x - x, n.y - y) <= n.r) {
          if (!best || n.r < best.r) best = n; // small bubbles win ties
        }
      }
      return best;
    };
    const onMove = (e: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      world.px = e.clientX - box.left;
      world.py = e.clientY - box.top;
      // Force field is mouse-only and off under reduced motion.
      world.pointerOn = e.pointerType === "mouse" && !reducedRef.current;
      const hit = hitTest(e);
      const ticker = hit?.ticker ?? null;
      if (ticker !== world.hovered) {
        world.hovered = ticker;
        canvas.style.cursor = ticker ? "pointer" : "default";
        setHovered(ticker);
        onHoverTicker(ticker);
        if (reducedRef.current) draw();
      }
      positionPlate();
    };
    const onLeave = () => {
      world.pointerOn = false;
      if (world.hovered !== null) {
        world.hovered = null;
        canvas.style.cursor = "default";
        setHovered(null);
        onHoverTicker(null);
        if (reducedRef.current) draw();
      }
    };
    // Poke: a small radial impulse ripples the neighbors. Cosmetic only —
    // navigation happens on the click that follows.
    const onDown = (e: PointerEvent) => {
      if (reducedRef.current) return;
      const hit = hitTest(e);
      if (!hit) return;
      const reach = hit.r + POKE_REACH;
      for (const n of world.nodes) {
        if (n === hit) continue;
        const dx = n.x - hit.x;
        const dy = n.y - hit.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < reach) {
          const s = smooth(1 - dist / reach) * 2.4;
          n.vx += (dx / dist) * s;
          n.vy += (dy / dist) * s;
        }
      }
      hit.r = Math.max(4, hit.r - 2); // squash — settles back via radius lerp
      world.ripples.push({ ticker: hit.ticker, age: 0, tone: "accent" });
    };
    const onClick = (e: MouseEvent) => {
      const hit = hitTest(e);
      if (hit) router.push(`/#${hit.ticker}`);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("click", onClick);

    return () => {
      stopLoop();
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("click", onClick);
      drawStaticRef.current = null;
      platePosRef.current = null;
    };
    // Mount-once: data flows in through worldRef via the effects above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hoveredAsset = hovered
    ? (assets.find((a) => a.ticker === hovered) ?? null)
    : null;
  const backers = hoveredAsset
    ? hoveredAsset.supporters
        .map((id) => analystsById.get(id))
        .filter((a): a is Analyst => Boolean(a))
    : [];
  // The most recent held USED call for this ticker — the "why it's in".
  const latestUsed = hovered
    ? (events.find(
        (e) =>
          e.stage === "classified" &&
          e.verdict?.kind === "used" &&
          (e.verdict.calls?.some((c) => c.ticker === hovered) ??
            e.verdict.ticker === hovered),
      ) ?? null)
    : null;
  const latestCall = latestUsed?.verdict
    ? (latestUsed.verdict.calls?.find((c) => c.ticker === hovered) ??
      (latestUsed.verdict.ticker === hovered
        ? {
            action: latestUsed.verdict.action ?? ("BUY" as const),
            ticker: latestUsed.verdict.ticker,
            confidence: latestUsed.verdict.confidence ?? 0,
            weightDelta: latestUsed.verdict.weightDelta ?? null,
            rationale: undefined as string | undefined,
          }
        : null))
    : null;
  const latestCallBy = latestUsed
    ? (analystsById.get(latestUsed.analystId)?.handle ?? null)
    : null;
  // Rationale preferred; the post text (quoted) is the honest fallback.
  const callSnippet =
    latestCall?.rationale ?? (latestUsed?.text ? `“${latestUsed.text}”` : null);
  // 24h change: bridge quote when present, sim's measured day move otherwise.
  const change24h = hoveredAsset
    ? (hoveredAsset.priceChange24hPct ?? hoveredAsset.dayMove)
    : null;

  return (
    <div ref={wrapRef} className={styles.floor} aria-hidden>
      <canvas ref={canvasRef} className={styles.floorCanvas} />
      {cold && (
        <p className={styles.dormant}>
          {liveMode
            ? "LOADING BASKET — OPERATOR DAILY BASKET / LIVE PREVIEW"
            : "STAND BY — ACQUIRING BASKET…"}
        </p>
      )}
      {hoveredAsset && (
        <div ref={plateRef} className={styles.plate} key={hoveredAsset.ticker}>
          <div className={styles.plateHead}>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative logo, host known-public */}
            <img
              src={`https://assets.parqet.com/logos/symbol/${hoveredAsset.ticker}?format=png&size=64`}
              alt=""
              width={28}
              height={28}
              className={styles.plateLogo}
            />
            <span className={styles.plateHeadText}>
              <span className={styles.plateName}>{hoveredAsset.name}</span>
              <span className={styles.plateSector}>
                {hoveredAsset.ticker}
                {hoveredAsset.sector && <> &middot; {hoveredAsset.sector}</>}
              </span>
            </span>
          </div>
          <div className={styles.platePrice}>
            <span className={styles.platePriceValue}>
              {fmtPrice(hoveredAsset.price)}
            </span>
            <span
              className={
                change24h == null
                  ? styles.plateChangeFlat
                  : change24h >= 0
                    ? styles.up
                    : styles.down
              }
            >
              {change24h == null ? "—" : fmtSigned(change24h)}
              <span className={styles.plateChangeTag}>24H</span>
            </span>
          </div>
          <div className={styles.plateGrid}>
            <span>
              <span className={styles.plateLabel}>Model</span>
              {fmtPct(hoveredAsset.targetWeight)}
            </span>
            {/* Live: single-series model weights — no committed fund weight;
                show only what is real. */}
            {!liveMode && (
              <span>
                <span className={styles.plateLabel}>Fund</span>
                {fmtPct(hoveredAsset.weight)}
              </span>
            )}
          </div>
          {backers.length > 0 && (
            <p className={styles.plateBackers}>
              <span className={styles.plateLabel}>Backed by</span>
              {backers.slice(0, 3).map((a) => (
                <span key={a.id} className={styles.plateBacker}>
                  <Avatar analyst={a} size={15} />@{a.handle}
                </span>
              ))}
              {backers.length > 3 && (
                <span className={styles.plateMore}>+{backers.length - 3}</span>
              )}
            </p>
          )}
          {latestCall && (
            <div className={styles.plateCall}>
              <p className={styles.plateCallHead}>
                <span
                  className={
                    latestCall.action === "BUY" ? styles.up : styles.down
                  }
                >
                  {latestCall.action} {hoveredAsset.ticker}
                </span>
                {latestCallBy && (
                  <span className={styles.plateCallBy}>@{latestCallBy}</span>
                )}
              </p>
              {callSnippet && (
                <p className={styles.plateCallText}>{callSnippet}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
