"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Analyst, Asset } from "@/lib/sim/types";
import { fmtPct, fmtSigned } from "@/lib/format";
import { colorFor, GLASS_THEMES, type GlassTheme } from "./glass-palette";
import { type CardRect, DetailCard, useBasketDetail } from "./DetailCard";

// The glass basket: the packed basket raymarched as translucent glass spheres
// that overlap, see through one another, and reflect off their neighbours, over
// a flat cobalt ground. One full-screen quad; the fragment shader intersects
// every sphere per pixel, peels front-to-back for see-through, and bounces one
// reflection ray for inter-reflection. Hover lights the active bubble; click
// morphs its glass in place into a card-shaped slab (a blended sphere↔rounded-
// box SDF in the same shader) and the DOM detail card fades in over it.
//
// Data is live via props: the WebGL is built once per size and the sphere
// uniforms are updated in place when the packed layout changes, so weight moves
// and the Proposed/Current toggle never tear the canvas down. Shader look is
// driven by the `params` prop.

const MAX_SPHERES = 40;
const HOVER_SCALE = 1.32; // the active bubble swells
const BG_SHRINK = 0.76; // the rest are pushed back and shrink away
const OVERLAP = 1.16; // inflate packed radii so neighbours bump and overlap
const PARAM_KEYS = ["u_refract", "u_rim", "u_gloss", "u_tint", "u_dither"];
const MORPH_OPEN_MS = 520; // sphere → card
const MORPH_CLOSE_MS = 420; // card → sphere
const CARD_W = 290;
const CARD_PAD = 12; // the card keeps this clear of the container edge

interface Packed {
  ticker: string;
  weight: number;
  // Proposed minus current fund weight — 0 in the Current view (the panel maps
  // targetWeight to weight there), so the delta chip only shows on Proposed.
  delta: number;
  x: number;
  y: number;
  r: number;
  bg: [number, number, number];
  fg: string;
}

// Stable spiral packing. Each ticker keeps a home position (held in `posMap`
// for the current size) — weight moves only change its radius, and a NEW ticker
// is dropped into the first free spiral spot without disturbing anyone already
// placed. So the arrangement never reshuffles; bubbles only grow, shrink, or
// appear. Radii are inflated by OVERLAP so neighbours bump.
function buildStableLayout(
  assets: Asset[],
  W: number,
  H: number,
  posMap: Map<string, [number, number]>,
): Packed[] {
  const total = assets.reduce((s, a) => s + a.targetWeight, 0) || 1;
  // Bubbles collectively cover ~half the canvas, so the pack spreads to the
  // panel's full width now that the hero scene carries real height.
  const k = Math.sqrt((W * H * 0.5) / (Math.PI * total));
  const cx = W / 2;
  const cy = H / 2;
  const xs = W >= H ? 1 : W / H;
  const ys = W >= H ? H / W : 1;
  const radiusOf = (w: number) => Math.max(16, k * Math.sqrt(w));

  // Occupancy: every already-homed ticker, at its current (base) radius.
  const occ: { x: number; y: number; r: number }[] = [];
  for (const a of assets) {
    const p = posMap.get(a.ticker);
    if (p) occ.push({ x: p[0], y: p[1], r: radiusOf(a.targetWeight) });
  }

  // Home any new tickers — biggest first so they get the more central spots.
  // Walk the spiral for a clear in-bounds spot; if the box is full, take the
  // in-bounds spot with the LEAST overlap (the bubbles overlap by design) rather
  // than ever falling off-screen. Edge room here is just the base radius — the
  // render clamp handles the hover/breathing swell — so placement always fits.
  const fresh = assets
    .filter((a) => !posMap.has(a.ticker))
    .sort((a, b) => b.targetWeight - a.targetWeight);
  for (const a of fresh) {
    const r = radiusOf(a.targetWeight);
    const me = r * OVERLAP + 4;
    let x = cx;
    let y = cy;
    if (occ.length > 0) {
      let t = 0;
      let best: [number, number] | null = null;
      let bestClear = -Infinity;
      for (;;) {
        t += 0.35;
        const rad = 4 + t * 3.0;
        const px = cx + rad * Math.cos(t) * xs;
        const py = cy + rad * Math.sin(t) * ys;
        const inB =
          px - me >= 0 && px + me <= W && py - me >= 0 && py + me <= H;
        if (inB) {
          let clear = Infinity;
          for (const q of occ)
            clear = Math.min(clear, Math.hypot(q.x - px, q.y - py) - (q.r + r));
          if (clear >= 4) {
            x = px;
            y = py;
            best = null;
            break;
          }
          if (clear > bestClear) {
            bestClear = clear;
            best = [px, py];
          }
        }
        if (t > 1400) {
          if (best) {
            x = best[0];
            y = best[1];
          }
          break;
        }
      }
    }
    posMap.set(a.ticker, [x, y]);
    occ.push({ x, y, r });
  }

  return assets
    .map((a) => {
      const p = posMap.get(a.ticker) ?? [cx, cy];
      const rInflated = radiusOf(a.targetWeight) * OVERLAP;
      const { bg, fg } = colorFor(a.ticker);
      // A homed bubble keeps growing with its weight — so clamp its RENDERED
      // centre to keep the fully grown sphere (overlap × swell × breathing)
      // inside the box. The home never moves; the bubble just slides in from
      // the edge as it outgrows its spot, taking its label with it, so it can
      // never be cut off.
      const m = rInflated * HOVER_SCALE * 1.03 + 4;
      return {
        ticker: a.ticker,
        weight: a.targetWeight,
        delta: a.targetWeight - a.weight,
        x: Math.max(m, Math.min(W - m, p[0])),
        y: Math.max(m, Math.min(H - m, p[1])),
        r: rInflated,
        bg,
        fg,
      };
    })
    .slice(0, MAX_SPHERES);
}

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  #define MAX ${MAX_SPHERES}
  varying vec2 vUv;

  uniform vec2  u_size;
  uniform float u_dpr;
  uniform int   u_count;
  uniform vec2  u_centers[MAX];
  uniform float u_radii[MAX];
  uniform vec3  u_colors[MAX];
  uniform int   u_active;
  uniform float u_hoverAmt;
  uniform float u_refract;
  uniform float u_rim;
  uniform float u_gloss;
  uniform float u_tint;
  uniform float u_dither;
  uniform float u_morphT;      // 0 = sphere, 1 = card (eased on the CPU)
  uniform vec3  u_morphSphere; // xy = snapshot centre, z = snapshot radius (CSS px)
  uniform vec4  u_morphBox;    // xy = card centre, zw = card half-size
  uniform float u_morphCorner; // card corner radius
  uniform int   u_morphIdx;    // sphere index of the morphing bubble
  uniform vec3  u_ground;      // the page ground the glass sits on
  uniform vec3  u_sunk;        // where non-active glass sinks toward on hover
  uniform float u_sunkMul;

  float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  // Flat page ground (var(--paper), theme-driven) so the basket has no box of
  // its own. Kept as a function so the glass can sample it for
  // refraction/reflection.
  vec3 gradientAt(vec2 uv){
    return u_ground;
  }

  bool reflHit(vec3 ro, vec3 rd, int skip, out vec3 tint){
    float best = 1e9; int hi = -1;
    for(int i=0;i<MAX;i++){
      if(i>=u_count) break;
      if(i==skip) continue;
      vec3 oc = ro - vec3(u_centers[i], 0.0);
      float b = dot(oc, rd);
      float c = dot(oc, oc) - u_radii[i]*u_radii[i];
      float disc = b*b - c;
      if(disc > 0.0){
        float t = -b - sqrt(disc);
        if(t > 1.0 && t < best){ best = t; hi = i; }
      }
    }
    if(hi >= 0){ tint = u_colors[hi]; return true; }
    return false;
  }

  float sdRoundBox2(vec2 p, vec2 b, float r){
    vec2 q = abs(p) - b + r;
    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
  }

  // The morphing glass: a 2D SDF blended sphere↔rounded-card, rendered as a
  // beveled height field. With q = circle SDF and e = h = r the profile is
  // exactly sqrt(r² − d²) — the analytic sphere — so the hand-off from the real
  // sphere at u_morphT ≈ 0 is seamless.
  float morphSdf(vec2 p){
    float qs = length(p - u_morphSphere.xy) - u_morphSphere.z;
    float qb = sdRoundBox2(p - u_morphBox.xy, u_morphBox.zw, u_morphCorner);
    return mix(qs, qb, u_morphT);
  }
  float morphHeight(vec2 p){
    float q = morphSdf(p);
    float e = mix(u_morphSphere.z, min(u_morphCorner + 8.0, 24.0), u_morphT);
    float h = mix(u_morphSphere.z, 20.0, u_morphT);
    float t = clamp(-q, 0.0, e);
    return (h / e) * sqrt(max(t * (2.0 * e - t), 0.0));
  }

  // Shared glass shading for the sphere layers AND the morph shape, so the
  // material can never drift between them.
  // \`matte\` flattens the material (1 = the settled card): the fresnel rim and
  // specular edge highlights die out and the dither sheen drops to ~35%, so
  // the card reads as a quiet dark surface rather than glass.
  vec3 shadeGlass(vec3 N, vec3 V, vec3 L, vec3 base, vec2 uv, vec3 ro, int skip, float matte, out float la){
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 rtint; vec3 refl;
    if(reflHit(ro, reflect(-V, N), skip, rtint)){
      refl = rtint * 1.25 + 0.04;
    } else {
      vec3 R = reflect(-V, N);
      refl = gradientAt(clamp(uv + R.xy * 0.30, 0.0, 1.0)) * 1.1 + vec3(0.03);
    }
    vec3 lc = mix(base, refl, clamp(fres * u_rim, 0.0, 1.0) * (1.0 - matte));
    vec3 H = normalize(L + V);
    float dth = bayer8(gl_FragCoord.xy);
    float spec = pow(max(dot(N, H), 0.0), u_gloss);
    spec = mix(spec, step(dth, spec), u_dither);
    lc += vec3(1.0) * spec * (1.0 - matte);
    // A broad ordered-dither sheen over the lit face, so the dither slider
    // reads across the whole glass — not only the tight specular. Present
    // only as u_dither rises (no-op at 0).
    float broad = pow(max(dot(N, H), 0.0), max(u_gloss * 0.16, 4.0));
    lc += vec3(0.16) * step(dth, broad) * u_dither * (1.0 - 0.65 * matte);
    la = clamp(u_tint * 0.5 + fres * 0.85, 0.0, 1.0);
    return lc;
  }

  // The pinned/hovered glass gets extra light: its own hue glow plus two
  // coloured accent specs — magenta upper-left, cyan lower-right — so it looks
  // lit by several different sources. Scaled by u_hoverAmt.
  vec3 activeLight(vec3 N, vec3 V, vec3 base, inout float la){
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float dth = bayer8(gl_FragCoord.xy);
    vec3 add = base / max(max(base.r, max(base.g, base.b)), 0.001) * 0.26
      + vec3(0.03, 0.05, 0.08) + vec3(1.0) * fres * 0.4;
    la = clamp(la + 0.22 * u_hoverAmt, 0.0, 1.0);
    float ea = max(u_gloss * 0.45, 12.0);
    float s2 = pow(max(dot(N, normalize(vec3(-0.6, -0.5, 0.7) + V)), 0.0), ea);
    float s3 = pow(max(dot(N, normalize(vec3(0.5, 0.55, 0.6) + V)), 0.0), ea);
    s2 = mix(s2, step(dth, s2), u_dither);
    s3 = mix(s3, step(dth, s3), u_dither);
    add += vec3(1.0, 0.32, 0.72) * s2 + vec3(0.28, 0.82, 1.0) * s3;
    return add * u_hoverAmt;
  }

  void main(){
    vec2 fragCss = vec2(gl_FragCoord.x, u_size.y*u_dpr - gl_FragCoord.y) / u_dpr;
    vec2 uv = fragCss / u_size;
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(0.55, -0.6, 0.75));

    float prevZ = 1e9;
    vec3 acc = vec3(0.0);
    float aAcc = 0.0;
    vec2 frontN = vec2(0.0);
    bool haveFront = false;

    // The morphing glass card is the topmost layer: shorter spheres show
    // through it, taller neighbours clip behind it. Bounded to its own screen
    // rect, and skipped entirely while idle (coherent uniform branch).
    if(u_morphT > 0.001){
      vec2 lo = min(u_morphSphere.xy - u_morphSphere.z, u_morphBox.xy - u_morphBox.zw) - 2.0;
      vec2 hi = max(u_morphSphere.xy + u_morphSphere.z, u_morphBox.xy + u_morphBox.zw) + 2.0;
      if(all(greaterThan(fragCss, lo)) && all(lessThan(fragCss, hi))){
        float z0 = morphHeight(fragCss);
        if(z0 > 0.0){
          // Normal from forward differences of the height field — robust at
          // the bevel, where the analytic gradient of the mixed SDF is spiky.
          float zx = morphHeight(fragCss + vec2(1.0, 0.0));
          float zy = morphHeight(fragCss + vec2(0.0, 1.0));
          vec3 N = normalize(vec3(z0 - zx, z0 - zy, 1.0));
          // Colour changes state with the shape: the bubble's hue tweens into
          // the card's dark surface and the pane grows near-opaque, so the
          // glass lands already looking like the card before the content fades
          // in. The active glow calms as it darkens, leaving a hint of the
          // ticker's hue on the settled card.
          vec3 base = mix(u_colors[u_morphIdx], vec3(0.016, 0.055, 0.141), u_morphT);
          float la;
          vec3 lc = shadeGlass(N, V, L, base, uv, vec3(fragCss, z0), u_morphIdx, u_morphT, la);
          lc += activeLight(N, V, base, la) * (1.0 - u_morphT);
          la = mix(la, 0.9, u_morphT);
          acc += (1.0 - aAcc) * la * lc;
          aAcc += (1.0 - aAcc) * la;
          frontN = N.xy;
          haveFront = true;
          prevZ = z0;
        }
      }
    }

    for(int layer=0; layer<6; layer++){
      int best = -1; float bestZ = -1.0; vec2 bestD = vec2(0.0);
      for(int i=0;i<MAX;i++){
        if(i>=u_count) break;
        vec2 d = fragCss - u_centers[i];
        float rr = u_radii[i]*u_radii[i] - dot(d, d);
        if(rr <= 0.0) continue;
        float z = sqrt(rr);
        if(z < prevZ - 0.5 && z > bestZ){ bestZ = z; best = i; bestD = d; }
      }
      if(best < 0) break;

      vec3 N = normalize(vec3(bestD, bestZ));
      float la;
      vec3 lc = shadeGlass(N, V, L, u_colors[best], uv, vec3(fragCss, bestZ), best, 0.0, la);

      float fi = float(best);
      vec3 diff = vec3(sin(fi * 1.7), sin(fi * 1.7 + 2.1), sin(fi * 1.7 + 4.2));
      lc += diff * 0.035 * u_hoverAmt;

      if(u_active >= 0 && best == u_active){
        lc += activeLight(N, V, u_colors[best], la);
      } else if(u_active >= 0){
        vec3 sunk = mix(lc, u_sunk, 0.35) * u_sunkMul;
        lc = mix(lc, sunk, u_hoverAmt);
        la *= mix(1.0, 0.55, u_hoverAmt);
        // The active bubble casts its coloured light onto nearby neighbours —
        // brightest on the side facing it, fading with the edge-to-edge gap —
        // instead of glowing into the empty background. While that bubble is
        // morphing into the card its sphere radius is 0, so aR stands in for
        // it: the cast light fades out with the morph and the smoothstep edge
        // stays finite.
        float aR = u_radii[u_active];
        if(u_active == u_morphIdx && u_morphT > 0.001) aR = u_morphSphere.z * (1.0 - u_morphT);
        vec2 toA = u_centers[u_active] - u_centers[best];
        float gap = length(toA) - aR - u_radii[best];
        float prox = 1.0 - smoothstep(0.0, max(aR, 1.0) * 1.1, gap);
        float facing = max(dot(normalize(bestD), normalize(toA)), 0.0);
        vec3 ac = u_colors[u_active];
        vec3 aHue = ac / max(max(ac.r, max(ac.g, ac.b)), 0.001);
        lc += aHue * prox * pow(facing, 1.5) * 0.9 * u_hoverAmt;
      }

      acc += (1.0 - aAcc) * la * lc;
      aAcc += (1.0 - aAcc) * la;
      if(!haveFront){ frontN = N.xy; haveFront = true; }
      prevZ = bestZ;
      if(aAcc > 0.99) break;
    }

    vec2 bgUv = haveFront ? clamp(uv - frontN * u_refract, 0.0, 1.0) : uv;
    vec3 col = acc + (1.0 - aAcc) * gradientAt(bgUv);

    // (No background halo — the active bubble's glow is cast onto the
    // neighbouring spheres above, not into the empty background, so it can
    // never spill past the container edge.)

    gl_FragColor = vec4(col, 1.0);
  }
`;

// A tiny imperative handle so a parent (the Time Machine) can locate a bubble
// on screen and knock it like water when a landing tweet hits it.
export interface BasketApi {
  getBubbleRect: (
    ticker: string,
  ) => { left: number; top: number; width: number; height: number } | null;
  hasBubble: (ticker: string) => boolean;
  ripple: (ticker: string) => void;
}

// The bubble→card morph, advanced by the GL frame loop. `T` mirrors u_morphT;
// `from` is its value when the current leg started, so an interrupted open
// reverses from wherever it got to instead of snapping.
interface MorphState {
  phase: "idle" | "opening" | "open" | "closing";
  ticker: string | null;
  idx: number;
  t0: number;
  from: number;
  T: number;
  rect: CardRect | null;
}

const idleMorph = (): MorphState => ({
  phase: "idle",
  ticker: null,
  idx: -1,
  t0: 0,
  from: 0,
  T: 0,
  rect: null,
});

interface GlassBasketProps {
  assets: Asset[];
  analysts: Analyst[];
  params: Record<string, number>;
  /** Proposed view: labels show only the delta vs the current basket. */
  showDeltas?: boolean;
  /** The world the glass renders in; static per surface. */
  theme?: GlassTheme;
  className?: string;
}

export const GlassBasket = forwardRef<BasketApi, GlassBasketProps>(
  function GlassBasket(
    {
      assets,
      analysts,
      params,
      showDeltas = false,
      theme = "cobalt",
      className,
    },
    apiHandle,
  ) {
    const ref = useRef<HTMLDivElement>(null);
    // Active ripples keyed by ticker → the performance.now() they started at.
    const rippleRef = useRef<Map<string, number>>(new Map());
    const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
    const drawRef = useRef<() => void>(() => {});
    // Repaints after the layout arrays are rewritten.
    const redrawRef = useRef<() => void>(() => {});
    const baseRadiiRef = useRef<number[]>([]);
    const baseCentersRef = useRef<[number, number][]>([]);
    const layoutRef = useRef<Packed[]>([]);
    // Persistent home positions per ticker for the current size, so the layout
    // never reshuffles. Mutated only inside the layout effect (never in render).
    const posStoreRef = useRef<{
      w: number;
      h: number;
      pos: Map<string, [number, number]>;
    }>({ w: 0, h: 0, pos: new Map() });
    // Uniform value arrays, mutated in place on layout changes (no rebuild).
    const arraysRef = useRef<{
      centers: { set: (x: number, y: number) => void }[];
      colors: { set: (x: number, y: number, z: number) => void }[];
      radii: number[];
    } | null>(null);

    const [failed, setFailed] = useState(false);
    const [size, setSize] = useState<{ w: number; h: number } | null>(null);
    const [hovered, setHovered] = useState<string | null>(null);
    // A clicked bubble pins its glow open; tracked as an index in a ref.
    const lockedRef = useRef<number>(-1);
    // The focused detail card: `selected` is the ticker (mounts the card); `open`
    // drives the morph transition. `unlockRef` lets the card reset the sphere's
    // glow on close; `cardElRef` lets the container ignore clicks inside the card.
    const [selected, setSelected] = useState<string | null>(null);
    const [cardOpen, setCardOpen] = useState(false);
    const unlockRef = useRef<() => void>(() => {});
    const cardElRef = useRef<HTMLDivElement>(null);
    // The glass morph state machine lives in a ref and is advanced inside the
    // GL frame loop; these bridges let React kick it off and back.
    const morphRef = useRef<MorphState>(idleMorph());
    const morphOpenRef = useRef<(ticker: string, rect: CardRect) => void>(
      () => {},
    );
    const morphCloseRef = useRef<() => void>(() => {});
    const closeTimerRef = useRef<number>(0);
    // Where the card lands: expands in place from the bubble, clamped inside
    // the container. Drives both the shader box target and the DOM card.
    const [cardRect, setCardRect] = useState<CardRect | null>(null);

    // Close sequence: the content fades first, then the glass flows back into
    // the sphere; the morph settle unmounts the card. Interrupting an opening
    // morph reverses it in place.
    const closeCard = () => {
      const M = morphRef.current;
      if (M.phase === "closing") return;
      window.clearTimeout(closeTimerRef.current);
      setCardOpen(false);
      if (M.phase === "opening") {
        morphCloseRef.current(); // reverse mid-flight; content never showed
      } else if (M.phase === "open") {
        closeTimerRef.current = window.setTimeout(
          () => morphCloseRef.current(),
          150,
        );
      } else {
        // No shader morph ran (reduced motion): fade out, then unmount.
        closeTimerRef.current = window.setTimeout(() => {
          setSelected(null);
          setCardRect(null);
          unlockRef.current();
          setHovered(null);
        }, 220);
      }
    };

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const measure = () => {
        const r = el.getBoundingClientRect();
        const w = Math.round(r.width);
        const h = Math.round(r.height);
        if (w > 0 && h > 0)
          setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Recompute the layout only when it would meaningfully change (ticker set or
    // a ~0.4pp weight move), so live drift doesn't thrash it.
    const layoutKey = useMemo(
      () =>
        assets
          .map((a) => `${a.ticker}:${Math.round(a.targetWeight * 250)}`)
          .join("|"),
      [assets],
    );
    // Layout is state, computed in an effect so the home-position store can be
    // mutated there (never in render). Positions persist across weight moves;
    // only radii change and new tickers get homed — nothing reshuffles.
    const [layout, setLayout] = useState<Packed[]>([]);
    useEffect(() => {
      if (!size) return;
      const store = posStoreRef.current;
      if (store.w !== size.w || store.h !== size.h) {
        // Positions are pixel-space — on resize, rescale the homes to the new
        // box (preserving the arrangement) rather than re-placing from scratch,
        // which could otherwise pile bubbles up if weights have grown.
        if (store.w > 0 && store.h > 0 && store.pos.size > 0) {
          const sx = size.w / store.w;
          const sy = size.h / store.h;
          const scaled = new Map<string, [number, number]>();
          for (const [tk, p] of store.pos)
            scaled.set(tk, [p[0] * sx, p[1] * sy]);
          store.pos = scaled;
        }
        store.w = size.w;
        store.h = size.h;
      }
      const next = buildStableLayout(assets, size.w, size.h, store.pos);
      const id = setTimeout(() => setLayout(next), 0);
      return () => clearTimeout(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- layoutKey quantizes assets; positions persist across weight moves
    }, [layoutKey, size]);
    const ready = layout.length > 0;

    // Build the WebGL once per size. Reads layoutRef for hit-testing so it never
    // rebuilds on a weight move.
    useEffect(() => {
      const container = ref.current;
      if (!container || !size || !ready) return;
      let disposed = false;
      let dispose = () => {};

      (async () => {
        const THREE = await import("three");
        if (disposed || !ref.current) return;

        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true });
        } catch {
          setFailed(true);
          return;
        }
        const dpr = Math.min(window.devicePixelRatio, 2);
        const { w, h } = size;
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h);
        renderer.domElement.style.display = "block";
        container.appendChild(renderer.domElement);

        const centers = Array.from(
          { length: MAX_SPHERES },
          () => new THREE.Vector2(),
        );
        const colors = Array.from(
          { length: MAX_SPHERES },
          () => new THREE.Vector3(),
        );
        const radii = new Array(MAX_SPHERES).fill(0);
        arraysRef.current = { centers, colors, radii };
        layoutRef.current = layout;
        layout.forEach((b, i) => {
          centers[i].set(b.x, b.y);
          colors[i].set(b.bg[0], b.bg[1], b.bg[2]);
          radii[i] = b.r;
        });
        baseRadiiRef.current = layout.map((b) => b.r);
        baseCentersRef.current = layout.map(
          (b) => [b.x, b.y] as [number, number],
        );

        const morphSphere = new THREE.Vector3();
        const morphBox = new THREE.Vector4();

        const uniforms: Record<string, { value: unknown }> = {
          u_size: { value: new THREE.Vector2(w, h) },
          u_dpr: { value: dpr },
          u_count: { value: layout.length },
          u_centers: { value: centers },
          u_radii: { value: radii },
          u_colors: { value: colors },
          u_active: { value: -1 },
          u_hoverAmt: { value: 0 },
          u_morphT: { value: 0 },
          u_morphSphere: { value: morphSphere },
          u_morphBox: { value: morphBox },
          u_morphCorner: { value: 16 },
          u_morphIdx: { value: 0 },
          u_ground: { value: new THREE.Vector3(...GLASS_THEMES[theme].ground) },
          u_sunk: { value: new THREE.Vector3(...GLASS_THEMES[theme].sunk) },
          u_sunkMul: { value: GLASS_THEMES[theme].sunkMul },
          u_refract: { value: params.u_refract },
          u_rim: { value: params.u_rim },
          u_gloss: { value: params.u_gloss },
          u_tint: { value: params.u_tint },
          u_dither: { value: params.u_dither },
        };
        uniformsRef.current = uniforms;

        const scene = new THREE.Scene();
        const mat = new THREE.ShaderMaterial({
          vertexShader: QUAD_VERT,
          fragmentShader: FRAG,
          uniforms,
        });
        scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
        const cam = new THREE.Camera();

        const draw = () => renderer.render(scene, cam);
        drawRef.current = draw;
        redrawRef.current = draw;

        const FADE_IN_MS = 340;
        const FADE_OUT_MS = 460;
        let hoverActive = -1;
        let amt = 0;
        let fromAmt = 0;
        let toAmt = 0;
        let animStart = 0;

        // Handlers only set the hover target; the persistent loop below eases the
        // glow and breathes the spheres every frame.
        const retarget = (active: number, fresh = true) => {
          if (active >= 0) {
            hoverActive = active;
            fromAmt = fresh ? 0 : amt;
            if (fresh) amt = 0;
          } else {
            fromAmt = amt;
          }
          toAmt = active >= 0 ? 1 : 0;
          animStart = performance.now();
        };
        // Let the detail card reset the sphere glow when it closes.
        unlockRef.current = () => {
          lockedRef.current = -1;
          retarget(-1);
        };

        // Morph bridges. Open snapshots the sphere as currently RENDERED
        // (breathing + hover swell included) so the glass hand-off has no pop;
        // the real sphere is then zeroed out of the arrays each frame while the
        // morph shape stands in for it.
        const openMorph = (ticker: string, rect: CardRect) => {
          const M = morphRef.current;
          const idx = layoutRef.current.findIndex((b) => b.ticker === ticker);
          if (idx < 0) return;
          const r0 =
            radii[idx] > 0.5 ? radii[idx] : (baseRadiiRef.current[idx] ?? 16);
          morphSphere.set(centers[idx].x, centers[idx].y, r0);
          morphBox.set(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            rect.width / 2,
            rect.height / 2,
          );
          uniforms.u_morphIdx.value = idx;
          M.phase = "opening";
          M.ticker = ticker;
          M.idx = idx;
          M.from = M.T;
          M.rect = rect;
          M.t0 = performance.now();
        };
        morphOpenRef.current = (ticker, rect) => {
          if (morphRef.current.phase === "idle") openMorph(ticker, rect);
        };
        morphCloseRef.current = () => {
          const M = morphRef.current;
          if (M.phase !== "opening" && M.phase !== "open") return;
          // The glass returns to where the bubble now lives — the layout may
          // have drifted while the card was open.
          const bC = baseCentersRef.current[M.idx];
          const bR = baseRadiiRef.current[M.idx];
          if (bC && bR) morphSphere.set(bC[0], bC[1], bR);
          M.phase = "closing";
          M.from = M.T;
          M.t0 = performance.now();
          lockedRef.current = -1;
          retarget(-1);
          setHovered(null);
        };

        const onMove = (e: PointerEvent) => {
          if (lockedRef.current >= 0) return;
          const lay = layoutRef.current;
          const rect = container.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          let active = -1;
          let bestZ = -1;
          lay.forEach((b, i) => {
            const dx = mx - b.x;
            const dy = my - b.y;
            const rr = b.r * b.r - (dx * dx + dy * dy);
            if (rr > 0 && Math.sqrt(rr) > bestZ) {
              bestZ = Math.sqrt(rr);
              active = i;
            }
          });
          if (active >= 0) {
            if (active !== hoverActive) {
              setHovered(lay[active].ticker);
              retarget(active);
            }
          } else if (hoverActive >= 0 && lay[hoverActive]) {
            const b = lay[hoverActive];
            const grace = b.r * HOVER_SCALE + 40;
            if (Math.hypot(mx - b.x, my - b.y) > grace) {
              setHovered(null);
              retarget(-1);
            }
          }
          draw();
        };
        const onLeave = () => {
          if (lockedRef.current >= 0) return;
          setHovered(null);
          retarget(-1);
          draw();
        };
        const onClick = (e: MouseEvent) => {
          // Clicks inside the open detail card never touch the basket.
          if (cardElRef.current?.contains(e.target as Node)) return;
          const lay = layoutRef.current;
          const rect = container.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          let idx = -1;
          let bestZ = -1;
          lay.forEach((b, i) => {
            const r =
              i === hoverActive || i === lockedRef.current
                ? b.r * HOVER_SCALE
                : b.r;
            const dx = mx - b.x;
            const dy = my - b.y;
            const rr = r * r - (dx * dx + dy * dy);
            if (rr > 0 && Math.sqrt(rr) > bestZ) {
              bestZ = Math.sqrt(rr);
              idx = i;
            }
          });

          const M = morphRef.current;
          // While a card is up (or in flight), every other bubble is inert:
          // only the open bubble, empty space, or the card's × closes it, and
          // nothing new opens until it has closed out.
          if (M.phase === "closing") {
            draw();
            return;
          }
          if (M.phase !== "idle" || lockedRef.current >= 0) {
            if (idx < 0 || idx === lockedRef.current) closeCard();
            draw();
            return;
          }

          if (idx >= 0) {
            // Open: light the bubble and mount its card; the measure effect
            // aims and kicks the morph.
            const wasLit = idx === hoverActive || idx === lockedRef.current;
            lockedRef.current = idx;
            setHovered(lay[idx].ticker);
            setSelected(lay[idx].ticker);
            retarget(idx, !wasLit);
          }
          draw();
        };
        container.addEventListener("pointermove", onMove);
        container.addEventListener("pointerleave", onLeave);
        container.addEventListener("click", onClick);

        // Persistent loop: eases the hover glow and breathes every sphere on its
        // own slow cycle (a gentle swell + drift), damped as a bubble lights up so
        // the active one holds still. Throttled to ~30fps to keep the continuous
        // raymarch light.
        const start = performance.now();
        let last = 0;
        let raf = 0;
        const frame = () => {
          raf = requestAnimationFrame(frame);
          const now = performance.now();
          const M = morphRef.current;
          const morphing = M.phase === "opening" || M.phase === "closing";
          // The morph runs at full frame rate (30fps reads steppy for liquid);
          // it lasts ≤600ms so the cost is bounded.
          if (!morphing && now - last < 32) return;
          last = now;
          const dur = toAmt === 1 ? FADE_IN_MS : FADE_OUT_MS;
          const t = Math.min(1, (now - animStart) / dur);
          const e = t * t * (3 - 2 * t);
          amt = fromAmt + (toAmt - fromAmt) * e;
          if (t >= 1 && toAmt === 0) hoverActive = -1;
          uniforms.u_active.value = hoverActive;
          uniforms.u_hoverAmt.value = amt;
          const secs = (now - start) / 1000;
          const bR = baseRadiiRef.current;
          const bC = baseCentersRef.current;
          const lay = layoutRef.current;
          const rip = rippleRef.current;
          for (let i = 0; i < bR.length; i++) {
            const f =
              hoverActive < 0 ? 1 : i === hoverActive ? HOVER_SCALE : BG_SHRINK;
            const hoverF = 1 + (f - 1) * amt;
            const ph = i * 1.7;
            const calm = 1 - amt * 0.7;
            // Water knock: a decaying elastic wobble when a tweet lands in this
            // bubble, so its shape ripples for ~0.9s before settling.
            let plop = 1;
            const tk = lay[i]?.ticker;
            if (tk !== undefined && rip.has(tk)) {
              const el = (now - (rip.get(tk) as number)) / 1000;
              if (el >= 0.9) rip.delete(tk);
              else plop = 1 + Math.sin(el * 26) * 0.14 * Math.exp(-el * 5.5);
            }
            radii[i] =
              bR[i] *
              hoverF *
              plop *
              (1 + Math.sin(secs * 0.7 + ph) * 0.022 * calm);
            if (bC[i])
              centers[i].set(
                bC[i][0] + Math.sin(secs * 0.55 + ph) * 2.4 * calm,
                bC[i][1] + Math.cos(secs * 0.5 + ph * 1.3) * 2.4 * calm,
              );
          }
          // While the morph shape stands in for a bubble, its real sphere is
          // held at radius 0 — the peel loop and reflHit both self-exclude it.
          if (M.idx >= 0 && M.phase !== "idle") radii[M.idx] = 0;

          if (morphing && M.rect) {
            const dur = M.phase === "opening" ? MORPH_OPEN_MS : MORPH_CLOSE_MS;
            const p = Math.min(1, (now - M.t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            if (M.phase === "opening") {
              M.T = M.from + (1 - M.from) * e;
              // A slight mid-flight bulge on the card endpoint — the liquid
              // overshoots its mould before settling.
              const k = 1 + 0.05 * Math.sin(Math.PI * p) * (1 - p);
              morphBox.set(
                M.rect.left + M.rect.width / 2,
                M.rect.top + M.rect.height / 2,
                (M.rect.width / 2) * k,
                (M.rect.height / 2) * k,
              );
            } else {
              M.T = M.from * (1 - e);
            }
            uniforms.u_morphT.value = M.T;
            if (p >= 1) {
              if (M.phase === "opening") {
                M.phase = "open";
                M.T = 1;
                uniforms.u_morphT.value = 1;
                morphBox.set(
                  M.rect.left + M.rect.width / 2,
                  M.rect.top + M.rect.height / 2,
                  M.rect.width / 2,
                  M.rect.height / 2,
                );
                setCardOpen(true); // glass has settled: fade the content in
              } else {
                // Hand the sphere back in this same frame — the zero override
                // already ran above, so without this the settle frame would
                // draw neither sphere nor glass (a one-frame blink).
                if (M.idx >= 0)
                  radii[M.idx] = baseRadiiRef.current[M.idx] ?? radii[M.idx];
                Object.assign(M, idleMorph());
                uniforms.u_morphT.value = 0;
                setSelected(null);
                setCardRect(null);
                setHovered(null);
              }
            }
          }
          draw();
        };
        draw(); // present an immediate frame even where rAF is throttled
        raf = requestAnimationFrame(frame);

        dispose = () => {
          drawRef.current = () => {};
          redrawRef.current = () => {};
          morphOpenRef.current = () => {};
          morphCloseRef.current = () => {};
          morphRef.current = idleMorph();
          cancelAnimationFrame(raf);
          container.removeEventListener("pointermove", onMove);
          container.removeEventListener("pointerleave", onLeave);
          container.removeEventListener("click", onClick);
          mat.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          uniformsRef.current = null;
          arraysRef.current = null;
        };
      })();

      return () => {
        disposed = true;
        dispose();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- built once per size; layout/params updates pushed via refs
    }, [size, ready]);

    // Push layout changes into the existing sphere uniforms (no rebuild).
    useEffect(() => {
      const u = uniformsRef.current;
      const arr = arraysRef.current;
      if (!u || !arr) return;
      layoutRef.current = layout;
      layout.forEach((b, i) => {
        arr.centers[i].set(b.x, b.y);
        arr.colors[i].set(b.bg[0], b.bg[1], b.bg[2]);
        arr.radii[i] = b.r;
      });
      baseRadiiRef.current = layout.map((b) => b.r);
      baseCentersRef.current = layout.map(
        (b) => [b.x, b.y] as [number, number],
      );
      u.u_count.value = layout.length;
      // A card that is open (or morphing) is keyed by ticker, never by index —
      // re-resolve it against the new layout and keep its sphere zeroed. A
      // vanished ticker hard-closes.
      const M = morphRef.current;
      if (M.phase !== "idle") {
        const ni = M.ticker
          ? layout.findIndex((b) => b.ticker === M.ticker)
          : -1;
        if (ni < 0) {
          Object.assign(M, idleMorph());
          if (u.u_morphT) u.u_morphT.value = 0;
          window.clearTimeout(closeTimerRef.current);
          setSelected(null);
          setCardOpen(false);
          setCardRect(null);
          lockedRef.current = -1;
          setHovered(null);
        } else {
          M.idx = ni;
          if (u.u_morphIdx) u.u_morphIdx.value = ni;
          arr.radii[ni] = 0;
        }
      }
      redrawRef.current();
    }, [layout]);

    // Push shader-look changes into the uniforms (no rebuild).
    useEffect(() => {
      const u = uniformsRef.current;
      if (!u) return;
      for (const k of PARAM_KEYS) if (u[k]) u[k].value = params[k];
      drawRef.current();
    }, [params]);

    // Publish the imperative handle (recreated with the current layout so bubble
    // rects stay accurate as the basket re-packs).
    useImperativeHandle(
      apiHandle,
      () => ({
        getBubbleRect: (ticker) => {
          const el = ref.current;
          const b = layout.find((p) => p.ticker === ticker);
          if (!el || !b) return null;
          const r = el.getBoundingClientRect();
          return {
            left: r.left + b.x - b.r,
            top: r.top + b.y - b.r,
            width: b.r * 2,
            height: b.r * 2,
          };
        },
        hasBubble: (ticker) => layout.some((p) => p.ticker === ticker),
        ripple: (ticker) => rippleRef.current.set(ticker, performance.now()),
      }),
      [layout],
    );

    // The card mounts invisibly on selection; measure it, compute where it
    // lands (expand in place from the bubble, clamped inside the container),
    // then aim the glass morph at that rect. Under reduced motion the shader
    // never morphs — the card simply fades in at the same rect.
    useEffect(() => {
      if (!selected || !size) return;
      const el = cardElRef.current;
      const b = layoutRef.current.find((p) => p.ticker === selected);
      if (!el || !b) return;
      const W = Math.min(CARD_W, size.w - CARD_PAD * 2);
      const H = Math.min(el.offsetHeight, size.h - CARD_PAD * 2);
      const rect = {
        left: Math.min(Math.max(b.x - W / 2, CARD_PAD), size.w - W - CARD_PAD),
        top: Math.min(Math.max(b.y - H / 2, CARD_PAD), size.h - H - CARD_PAD),
        width: W,
        height: H,
      };
      setCardRect(rect);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const id = requestAnimationFrame(() => setCardOpen(true));
        return () => cancelAnimationFrame(id);
      }
      morphOpenRef.current(selected, rect);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per selection; a size change hard-closes instead
    }, [selected]);

    // A resize rebuilds the GL (and with it all morph state), so an open card
    // hard-closes rather than aiming at a stale rect.
    const prevSizeRef = useRef<{ w: number; h: number } | null>(null);
    useEffect(() => {
      const prev = prevSizeRef.current;
      prevSizeRef.current = size;
      if (!prev || !size || prev === size || !selected) return;
      morphRef.current = idleMorph();
      window.clearTimeout(closeTimerRef.current);
      setSelected(null);
      setCardOpen(false);
      setCardRect(null);
      lockedRef.current = -1;
      setHovered(null);
    }, [size, selected]);

    useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

    const detail = useBasketDetail(selected, assets, analysts);

    return (
      <div
        ref={ref}
        className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className ?? ""}`}
        style={{ background: "var(--paper)", touchAction: "none" }}
      >
        {failed ? (
          <p className="text-ink-secondary max-w-[34ch] text-center text-[0.95rem] leading-snug">
            WebGL isn&rsquo;t available in this browser, so the glass basket
            can&rsquo;t run. Enable hardware acceleration and reload.
          </p>
        ) : (
          <>
            {layout.map((b) => {
              const active = hovered === b.ticker;
              const dimmed = hovered !== null && !active;
              const rr = active
                ? b.r * HOVER_SCALE
                : dimmed
                  ? b.r * BG_SHRINK
                  : b.r;
              return (
                <div
                  key={b.ticker}
                  className="pointer-events-none absolute flex flex-col items-center justify-center text-center leading-tight transition-[left,top,opacity,filter] duration-300 ease-out"
                  style={{
                    left: b.x,
                    top: b.y,
                    transform: "translate(-50%, -50%)",
                    color: GLASS_THEMES[theme].labelInk ?? b.fg,
                    // The selected bubble's label yields to the card content.
                    opacity: selected === b.ticker ? 0 : dimmed ? 0.25 : 1,
                    filter: dimmed ? "blur(1px)" : undefined,
                    zIndex: active ? 20 : undefined,
                  }}
                >
                  <span
                    className="font-bold tracking-[0.01em]"
                    style={{ fontSize: Math.max(10, Math.round(rr * 0.34)) }}
                  >
                    {b.ticker}
                  </span>
                  {/* Proposed reads as pure change (delta only); Current as
                      the holding's plain weight. */}
                  {rr >= 26 &&
                    (showDeltas ? (
                      Math.abs(b.delta) >= 0.0005 && (
                        <span
                          className="font-semibold"
                          style={{
                            fontSize: Math.max(9, Math.round(rr * 0.22)),
                            color:
                              b.delta > 0
                                ? "var(--up-teal)"
                                : "var(--down-red)",
                          }}
                        >
                          {fmtSigned(b.delta * 100)}
                        </span>
                      )
                    ) : (
                      <span
                        className="font-medium opacity-90"
                        style={{ fontSize: Math.max(9, Math.round(rr * 0.22)) }}
                      >
                        {fmtPct(b.weight)}
                      </span>
                    ))}
                </div>
              );
            })}

            {/* Focused detail: the shared card content, positioned exactly
                over the shader-drawn glass and faded in once it settles. */}
            {detail && (
              <DetailCard
                ref={cardElRef}
                detail={detail}
                open={cardOpen}
                rect={cardRect}
                width={size ? Math.min(CARD_W, size.w - CARD_PAD * 2) : CARD_W}
                maxHeight={size ? size.h - CARD_PAD * 2 : undefined}
                onClose={closeCard}
              />
            )}
          </>
        )}
      </div>
    );
  },
);
