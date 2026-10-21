"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Analyst, Asset, SignalEvent } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import styles from "./organism.module.css";

// ---------------------------------------------------------------------------
// The habitat: a soft-body cluster of holdings on <canvas>. Decoration only —
// the canvas is aria-hidden; HoldingsList below is the accessible record.
// ---------------------------------------------------------------------------

const DPR_CAP = 2;
const FILL = 0.3; // share of habitat area covered by bubbles
const BULL = "227, 169, 78"; // warm amber — fed
const BEAR = "108, 178, 206"; // cold cyan — bruised
const GREY = "170, 184, 198"; // dissolving stimuli

interface OrgNode {
  ticker: string;
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
  color: string;
}

interface Ripple {
  ticker: string;
  age: number;
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
function stepPhysics(world: World, k: number, ts: number) {
  const { nodes, w, h } = world;
  const cx = w / 2;
  const cy = h / 2;
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.0011 * k;
    n.vy += (cy - n.y) * 0.0011 * k;
    n.vx += Math.sin(ts * 0.00037 + n.phase) * 0.007 * k;
    n.vy += Math.cos(ts * 0.00031 + n.phase * 1.7) * 0.007 * k;
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const min = a.r + b.r + 5;
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

export function OrganismCanvas({
  assets,
  analystsById,
  events,
  highlightCalls,
  focusTicker,
  cold,
}: {
  assets: Asset[];
  analystsById: Map<string, Analyst>;
  events: SignalEvent[];
  highlightCalls: { ticker: string; weightDelta: number }[];
  focusTicker: string | null;
  cold: boolean;
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
  });
  const reducedRef = useRef(false);
  const monoRef = useRef("ui-monospace, monospace");
  const highlightRef = useRef<Set<string>>(
    new Set(highlightCalls.map((hc) => hc.ticker)),
  );
  const focusRef = useRef<string | null>(focusTicker);
  const drawStaticRef = useRef<(() => void) | null>(null);
  const platePosRef = useRef<(() => void) | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // The plate mounts a render after the hit test, so place it once it exists
  // (the animation loop keeps it pinned afterwards; reduced mode has no loop).
  useEffect(() => {
    platePosRef.current?.();
  }, [hovered]);

  // ---- sync assets into physics nodes --------------------------------------
  useEffect(() => {
    const world = worldRef.current;
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
  }, [assets]);

  // ---- keep loop-facing refs fresh; reduced mode redraws on change ---------
  useEffect(() => {
    highlightRef.current = new Set(highlightCalls.map((hc) => hc.ticker));
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
      if (v.kind === "used" && v.ticker) {
        // A mixed post launches one stimulus per call — each flies to its
        // own bubble and feeds or bruises it independently.
        const calls = v.calls?.length
          ? v.calls
          : [{ ticker: v.ticker, weightDelta: v.weightDelta ?? 0 }];
        for (const call of calls) {
          // sim-only surface: sim always fills weightDelta
          world.particles.push({
            kind: (call.weightDelta ?? 0) < 0 ? "bear" : "bull",
            ticker: call.ticker,
            sx: -6,
            sy,
            cx: w * 0.32,
            cy: sy - h * 0.16,
            tx: centroidX,
            ty: centroidY,
            t: 0,
            dur: 950 + Math.random() * 250,
            size:
              2.5 + Math.min(5, Math.abs((call.weightDelta ?? 0) * 100) * 6),
            dieAt: 1,
            dim: false,
          });
        }
      } else {
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

    const stepEffects = (k: number) => {
      const nodeOf = (ticker: string | null) =>
        ticker ? world.nodes.find((n) => n.ticker === ticker) : undefined;
      world.particles = world.particles.filter((p) => {
        p.t += (k * 16.67) / p.dur;
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
              color: GREY,
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
                  color: BULL,
                });
              }
            } else {
              n.cool = 1;
              n.r = Math.max(4, n.r - 3);
              world.ripples.push({ ticker: n.ticker, age: 0 });
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
      ctx.clearRect(0, 0, w, h);
      const hoveredNow = world.hovered;
      const focusNow = focusRef.current;
      const highlightNow = highlightRef.current;
      const sorted = [...world.nodes].sort((a, b) => b.r - a.r);
      for (const n of sorted) {
        const lit =
          n.ticker === hoveredNow ||
          n.ticker === focusNow ||
          highlightNow.has(n.ticker);
        // membrane body
        const g = ctx.createRadialGradient(
          n.x - n.r * 0.35,
          n.y - n.r * 0.4,
          n.r * 0.15,
          n.x,
          n.y,
          n.r,
        );
        g.addColorStop(0, "rgba(150, 170, 192, 0.17)");
        g.addColorStop(0.7, "rgba(118, 138, 162, 0.08)");
        g.addColorStop(1, "rgba(108, 128, 152, 0.03)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        // bioluminescence: warm feed glow / cold bruise
        if (n.warm > 0.02) {
          const wg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          wg.addColorStop(0, `rgba(${BULL}, ${0.4 * n.warm})`);
          wg.addColorStop(1, `rgba(${BULL}, 0)`);
          ctx.fillStyle = wg;
          ctx.fill();
        }
        if (n.cool > 0.02) {
          const cg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
          cg.addColorStop(0, `rgba(${BEAR}, ${0.36 * n.cool})`);
          cg.addColorStop(1, `rgba(${BEAR}, 0)`);
          ctx.fillStyle = cg;
          ctx.fill();
        }
        // rim
        ctx.lineWidth = lit ? 1.5 : 1;
        ctx.strokeStyle =
          n.warm > 0.05
            ? `rgba(${BULL}, ${0.25 + 0.6 * n.warm})`
            : n.cool > 0.05
              ? `rgba(${BEAR}, ${0.25 + 0.6 * n.cool})`
              : `rgba(178, 198, 218, ${lit ? 0.55 : 0.2})`;
        ctx.stroke();
        // sustained highlight halo (~4s after a USED verdict)
        if (highlightNow.has(n.ticker)) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(214, 228, 240, 0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        // labels (decorative — the record below is the accessible surface)
        if (n.r >= 15) {
          const fs = Math.max(10, Math.min(15, n.r * 0.4));
          ctx.font = `600 ${fs}px ${monoRef.current}`;
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(231, 233, 228, ${n.r >= 22 ? 0.92 : 0.6})`;
          ctx.textBaseline = n.r >= 30 ? "alphabetic" : "middle";
          ctx.fillText(n.ticker, n.x, n.r >= 30 ? n.y - 2 : n.y);
          if (n.r >= 30) {
            ctx.font = `500 ${Math.max(9, fs * 0.72)}px ${monoRef.current}`;
            ctx.fillStyle = "rgba(168, 176, 186, 0.8)";
            ctx.textBaseline = "top";
            ctx.fillText(fmtPct(n.asset.targetWeight), n.x, n.y + 3);
          }
        }
      }
      // impact ripples
      for (const rp of world.ripples) {
        const n = world.nodes.find((nd) => nd.ticker === rp.ticker);
        if (!n) continue;
        const p = rp.age / 40;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 2 + p * 26, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${BEAR}, ${0.4 * (1 - p)})`;
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
        const color =
          p.kind === "bull" ? BULL : p.kind === "bear" ? BEAR : GREY;
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
        ctx.strokeStyle = `rgba(${color}, ${0.3 * fade})`;
        ctx.lineWidth = p.size * 0.6;
        ctx.stroke();
        // head
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${0.9 * fade})`;
        ctx.fill();
      }
      // dissolution motes
      for (const m of world.motes) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${m.color}, ${0.7 * Math.max(0, m.life)})`;
        ctx.fill();
      }
    };

    const positionPlate = () => {
      const plate = plateRef.current;
      if (!plate) return;
      const n = world.nodes.find((nd) => nd.ticker === world.hovered);
      if (!n) return;
      plate.style.left = `${Math.min(world.w - 110, Math.max(110, n.x))}px`;
      plate.style.top = `${Math.max(96, n.y - n.r - 10)}px`;
    };

    const settleAndDraw = () => {
      for (const n of world.nodes) {
        n.r = n.targetR;
        n.warm = 0;
        n.cool = 0;
      }
      for (let i = 0; i < 240; i++) stepPhysics(world, 1, i * 16.67);
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
    let last = performance.now();
    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        // The organism sleeps with the tab: no physics while hidden.
        last = ts;
        return;
      }
      const k = Math.min(2.5, Math.max(0.2, (ts - last) / 16.67));
      last = ts;
      stepPhysics(world, k, ts);
      stepEffects(k);
      draw();
      positionPlate();
    };
    if (!reducedRef.current) {
      raf = requestAnimationFrame(frame);
    } else {
      settleAndDraw();
    }

    const hitTest = (e: MouseEvent): OrgNode | null => {
      const box = canvas.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      let best: OrgNode | null = null;
      for (const n of world.nodes) {
        if (Math.hypot(n.x - x, n.y - y) <= n.r) {
          if (!best || n.r < best.r) best = n; // small bubbles win ties
        }
      }
      return best;
    };
    const onMove = (e: MouseEvent) => {
      const hit = hitTest(e);
      const ticker = hit?.ticker ?? null;
      if (ticker !== world.hovered) {
        world.hovered = ticker;
        canvas.style.cursor = ticker ? "pointer" : "default";
        setHovered(ticker);
        if (reducedRef.current) {
          draw();
          positionPlate();
        }
      }
    };
    const onLeave = () => {
      if (world.hovered !== null) {
        world.hovered = null;
        canvas.style.cursor = "default";
        setHovered(null);
        if (reducedRef.current) draw();
      }
    };
    const onClick = (e: MouseEvent) => {
      const hit = hitTest(e);
      if (hit) router.push(`/#${hit.ticker}`);
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
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
  const supporters = hoveredAsset
    ? hoveredAsset.supporters
        .map((id) => analystsById.get(id)?.handle)
        .filter((h): h is string => Boolean(h))
    : [];

  return (
    <div ref={wrapRef} className={styles.habitat} aria-hidden>
      <canvas ref={canvasRef} className={styles.habitatCanvas} />
      {cold ? (
        <p className={styles.dormant}>ORGANISM DORMANT — CONNECTING…</p>
      ) : (
        <p className={styles.habitatLegend}>
          <span>AREA = MODEL WEIGHT</span>
          <span className={styles.legendBull}>BULLISH — FEEDS</span>
          <span className={styles.legendBear}>BEARISH — BRUISES</span>
          <span className={styles.legendDissolve}>NO SIGNAL — DISSOLVES</span>
        </p>
      )}
      {hoveredAsset && (
        <div ref={plateRef} className={styles.plate}>
          <div className={styles.plateHead}>
            <span className={styles.plateTicker}>{hoveredAsset.ticker}</span>
            <span className={styles.plateSector}>{hoveredAsset.sector}</span>
          </div>
          <p className={styles.plateName}>{hoveredAsset.name}</p>
          <div className={styles.plateGrid}>
            <span>
              <span className={styles.plateLabel}>Fund</span>
              {fmtPct(hoveredAsset.weight)}
            </span>
            <span>
              <span className={styles.plateLabel}>Model</span>
              {fmtPct(hoveredAsset.targetWeight)}
            </span>
            <span
              // sim-only surface: sim always fills dayMove
              className={
                (hoveredAsset.dayMove ?? 0) >= 0 ? styles.up : styles.down
              }
            >
              <span className={styles.plateLabel}>Day</span>
              {fmtSigned(hoveredAsset.dayMove ?? 0)}
            </span>
          </div>
          {supporters.length > 0 && (
            <p className={styles.plateBackers}>
              FED BY {supporters.map((h) => `@${h}`).join(" ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
