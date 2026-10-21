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
import { Treemap, squarify } from "@/components/briefing/Treemap";
import type { BasketApi } from "./GlassBasket";
import { colorFor, GLASS_THEMES, type GlassTheme } from "./glass-palette";
import { type CardRect, DetailCard, useBasketDetail } from "./DetailCard";

// The glass treemap: the squarified basket rendered with the same shader
// treatment as the glass bubbles. Each tile is a beveled rounded-box height
// field — the same profile the bubble→card morph lands on — shaded with the
// identical fresnel/spec/dither material over the flat cobalt ground. Tiles
// keep the bubbles' hashed hues so a ticker wears the same color in both
// views; hover lights a tile and sinks the rest; a landing call knocks its
// tile's thickness like water. Layout moves are eased in the frame loop, so
// weight drift reflows the map as one liquid motion.

const MAX_TILES = 40;
const GAP = 1.5; // px shaved from each tile edge so the ground shows between
const CORNER = 6;
const HOVER_THICK = 1.6; // hover swells the glass thickness, not the footprint
const PARAM_KEYS = ["u_refract", "u_rim", "u_gloss", "u_tint", "u_dither"];
const MORPH_OPEN_MS = 520; // tile → card
const MORPH_CLOSE_MS = 420; // card → tile
const CARD_W = 290;
const CARD_PAD = 12; // the card keeps this clear of the container edge

// The tile→card morph, advanced by the GL frame loop — the same machine the
// glass basket runs, keyed by ticker (never index) so layout drift can't
// detach it. `T` mirrors u_morphT; `from` is its value when the current leg
// started, so an interrupted open reverses from wherever it got to.
interface TileMorph {
  phase: "idle" | "opening" | "open" | "closing";
  ticker: string | null;
  t0: number;
  from: number;
  T: number;
  rect: CardRect | null;
}

const idleTileMorph = (): TileMorph => ({
  phase: "idle",
  ticker: null,
  t0: 0,
  from: 0,
  T: 0,
  rect: null,
});

interface GlassTile {
  ticker: string;
  asset: Asset;
  cx: number;
  cy: number;
  hx: number;
  hy: number;
  thick: number;
  bg: [number, number, number];
}

// Squarify in percent space, then convert to pixel centers/half-sizes with the
// gap taken off each edge. Thickness scales with the tile so big holdings read
// as heavier slabs, the way big bubbles read as taller domes.
function buildTiles(assets: Asset[], W: number, H: number): GlassTile[] {
  return squarify(assets)
    .slice(0, MAX_TILES)
    .map((r) => {
      const hx = Math.max(3, (r.w / 200) * W - GAP);
      const hy = Math.max(3, (r.h / 200) * H - GAP);
      return {
        ticker: r.asset.ticker,
        asset: r.asset,
        cx: ((r.x + r.w / 2) / 100) * W,
        cy: ((r.y + r.h / 2) / 100) * H,
        hx,
        hy,
        thick: Math.min(20, Math.max(7, Math.min(hx, hy) * 0.35)),
        bg: colorFor(r.asset.ticker).bg,
      };
    });
}

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  #define MAX ${MAX_TILES}
  varying vec2 vUv;

  uniform vec2  u_size;
  uniform float u_dpr;
  uniform int   u_count;
  uniform vec2  u_centers[MAX];
  uniform vec2  u_half[MAX];
  uniform float u_thick[MAX];
  uniform vec3  u_colors[MAX];
  uniform int   u_active;
  uniform float u_hoverAmt;
  uniform float u_refract;
  uniform float u_rim;
  uniform float u_gloss;
  uniform float u_tint;
  uniform float u_dither;
  uniform float u_corner;
  uniform int   u_priority;   // a swelling tile (knock/hover) wins its overlaps
  uniform float u_morphT;     // 0 = tile, 1 = card (eased on the CPU)
  uniform vec4  u_morphFrom;  // the clicked tile as it was: xy centre, zw half
  uniform vec4  u_morphBox;   // the card: xy centre, zw half-size
  uniform float u_morphThick; // the tile's glass thickness at the snapshot
  uniform int   u_morphIdx;   // colour index of the morphing tile
  uniform vec3  u_ground;     // the page ground the glass sits on
  uniform vec3  u_sunk;       // where non-active glass sinks toward on hover
  uniform float u_sunkMul;

  float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  float bayer8(vec2 a){ return bayer4(0.5 * a) * 0.25 + bayer2(a); }

  // Flat page ground (var(--paper), theme-driven), same as the bubble basket.
  vec3 gradientAt(vec2 uv){
    return u_ground;
  }

  float sdRoundBox2(vec2 p, vec2 b, float r){
    vec2 q = abs(p) - b + r;
    return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
  }

  // The tile as a beveled glass slab: flat top, quarter-round edge — the same
  // height profile the bubble→card morph lands on.
  float tileHeight(int i, vec2 p){
    float q = sdRoundBox2(p - u_centers[i], u_half[i], u_corner);
    float e = min(u_corner + 8.0, min(u_half[i].x, u_half[i].y));
    float t = clamp(-q, 0.0, e);
    return (u_thick[i] / e) * sqrt(max(t * (2.0 * e - t), 0.0));
  }

  // The morphing glass: the clicked tile's rounded box blended into the card's,
  // corners and thickness included, so the tile flows into the card in place.
  float morphSdf(vec2 p){
    float qa = sdRoundBox2(p - u_morphFrom.xy, u_morphFrom.zw, u_corner);
    float qb = sdRoundBox2(p - u_morphBox.xy, u_morphBox.zw, 16.0);
    return mix(qa, qb, u_morphT);
  }
  float morphHeight(vec2 p){
    float q = morphSdf(p);
    float eA = min(u_corner + 8.0, min(u_morphFrom.z, u_morphFrom.w));
    float e = mix(eA, 24.0, u_morphT);
    float h = mix(u_morphThick, 20.0, u_morphT);
    float t = clamp(-q, 0.0, e);
    return (h / e) * sqrt(max(t * (2.0 * e - t), 0.0));
  }

  // The basket's glass material, verbatim: fresnel rim toward the ground
  // reflection, tight specular + broad dither sheen, tint-driven opacity.
  // \`matte\` flattens the material (1 = the settled card): the fresnel rim and
  // specular edge highlights die out and the dither sheen drops to ~35%, so
  // the card reads as a quiet dark surface rather than glass.
  vec3 shadeGlass(vec3 N, vec3 V, vec3 L, vec3 base, vec2 uv, float matte, out float la){
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 R = reflect(-V, N);
    vec3 refl = gradientAt(clamp(uv + R.xy * 0.30, 0.0, 1.0)) * 1.1 + vec3(0.03);
    vec3 lc = mix(base, refl, clamp(fres * u_rim, 0.0, 1.0) * (1.0 - matte));
    vec3 H = normalize(L + V);
    float dth = bayer8(gl_FragCoord.xy);
    float spec = pow(max(dot(N, H), 0.0), u_gloss);
    spec = mix(spec, step(dth, spec), u_dither);
    lc += vec3(1.0) * spec * (1.0 - matte);
    float broad = pow(max(dot(N, H), 0.0), max(u_gloss * 0.16, 4.0));
    lc += vec3(0.16) * step(dth, broad) * u_dither * (1.0 - 0.65 * matte);
    la = clamp(u_tint * 0.5 + fres * 0.85, 0.0, 1.0);
    return lc;
  }

  // The lit glass gets extra light: its own hue glow plus the two coloured
  // accent specs — magenta upper-left, cyan lower-right. Scaled by u_hoverAmt.
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

  // Everything below the morph layer: the packed tiles over the cobalt ground.
  vec3 tileColor(vec2 p, vec3 V, vec3 L){
    vec2 uv = p / u_size;
    // Tiles are disjoint at rest, so the first cover wins — no peel needed.
    // A knocked or hovered tile swells past its slot, so it is tested first
    // and owns any overlap while it moves.
    int hit = -1;
    if(u_priority >= 0 && u_priority < u_count){
      if(sdRoundBox2(p - u_centers[u_priority], u_half[u_priority], u_corner) < 0.0)
        hit = u_priority;
    }
    if(hit < 0)
      for(int i=0;i<MAX;i++){
        if(i>=u_count) break;
        if(i==u_priority) continue;
        if(sdRoundBox2(p - u_centers[i], u_half[i], u_corner) < 0.0){ hit = i; break; }
      }
    if(hit < 0) return gradientAt(uv);

    float z0 = tileHeight(hit, p);
    // Normal from forward differences of the height field — robust at the
    // bevel, matching the basket's morph shape.
    float zx = tileHeight(hit, p + vec2(1.0, 0.0));
    float zy = tileHeight(hit, p + vec2(0.0, 1.0));
    vec3 N = normalize(vec3(z0 - zx, z0 - zy, 1.0));

    float la;
    vec3 lc = shadeGlass(N, V, L, u_colors[hit], uv, 0.0, la);
    if(u_active >= 0 && hit == u_active){
      lc += activeLight(N, V, u_colors[hit], la);
    } else if(u_active >= 0){
      vec3 sunk = mix(lc, u_sunk, 0.35) * u_sunkMul;
      lc = mix(lc, sunk, u_hoverAmt);
      la *= mix(1.0, 0.55, u_hoverAmt);
    }

    // The ground shows through the glass, refracted by the surface normal.
    vec2 bgUv = clamp(uv - N.xy * u_refract, 0.0, 1.0);
    return la * lc + (1.0 - la) * gradientAt(bgUv);
  }

  void main(){
    vec2 fragCss = vec2(gl_FragCoord.x, u_size.y*u_dpr - gl_FragCoord.y) / u_dpr;
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(0.55, -0.6, 0.75));

    // The morphing glass card is the topmost layer: neighbouring tiles show
    // through it. Bounded to its own screen rect, skipped entirely while idle.
    if(u_morphT > 0.001){
      vec2 lo = min(u_morphFrom.xy - u_morphFrom.zw, u_morphBox.xy - u_morphBox.zw) - 2.0;
      vec2 hi = max(u_morphFrom.xy + u_morphFrom.zw, u_morphBox.xy + u_morphBox.zw) + 2.0;
      if(all(greaterThan(fragCss, lo)) && all(lessThan(fragCss, hi))){
        float z0 = morphHeight(fragCss);
        if(z0 > 0.0){
          float zx = morphHeight(fragCss + vec2(1.0, 0.0));
          float zy = morphHeight(fragCss + vec2(0.0, 1.0));
          vec3 N = normalize(vec3(z0 - zx, z0 - zy, 1.0));
          // Colour changes state with the shape: the tile's hue tweens into
          // the card's dark surface and the pane grows near-opaque, so the
          // glass lands already looking like the card before the content fades
          // in. The active glow calms as it darkens, leaving a hint of the
          // ticker's hue on the settled card.
          vec3 base = mix(u_colors[u_morphIdx], vec3(0.016, 0.055, 0.141), u_morphT);
          float la;
          vec3 lc = shadeGlass(N, V, L, base, fragCss / u_size, u_morphT, la);
          lc += activeLight(N, V, base, la) * (1.0 - u_morphT);
          la = mix(la, 0.9, u_morphT);
          vec3 under = tileColor(fragCss, V, L);
          gl_FragColor = vec4(la * lc + (1.0 - la) * under, 1.0);
          return;
        }
      }
    }

    gl_FragColor = vec4(tileColor(fragCss, V, L), 1.0);
  }
`;

export const GlassTreemap = forwardRef<
  BasketApi,
  {
    assets: Asset[];
    analysts: Analyst[];
    params: Record<string, number>;
    highlightTicker: string | null;
    /** Proposed view: labels show only the delta vs the current basket. */
    showDeltas?: boolean;
    /** The world the glass renders in; static per surface. */
    theme?: GlassTheme;
    /** A tile lit from outside — the same treatment as hover (this tile
     *  swells, the rest sink) driven by a neighbour, e.g. the post card in
     *  front of a deck. The mouse takes over while it is on the map. */
    activeTicker?: string | null;
    /** An extra line under the ticker label, per tile. */
    tileNote?: (asset: Asset) => string | null;
    className?: string;
  }
>(function GlassTreemap(
  {
    assets,
    analysts,
    params,
    highlightTicker,
    showDeltas = false,
    theme = "cobalt",
    activeTicker = null,
    tileNote,
    className,
  },
  apiHandle,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const uniformsRef = useRef<Record<string, { value: unknown }> | null>(null);
  const drawRef = useRef<() => void>(() => {});
  // Target layout (written on every reflow) and the eased current positions
  // the frame loop moves toward it, keyed by ticker so identity survives
  // re-sorting as weights shift.
  const tilesRef = useRef<GlassTile[]>([]);
  const easedRef = useRef<
    Map<string, { cx: number; cy: number; hx: number; hy: number }>
  >(new Map());
  // Landing calls knock the tile like water, same as the bubble ripple.
  const rippleRef = useRef<Map<string, number>>(new Map());
  // The focused detail card: `selected` mounts it, `cardOpen` fades the
  // content once the glass morph settles, `cardRect` is where it lands.
  const [selected, setSelected] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardRect, setCardRect] = useState<CardRect | null>(null);
  const cardElRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef<string | null>(null);
  const tileMorphRef = useRef<TileMorph>(idleTileMorph());
  const morphOpenRef = useRef<(ticker: string, rect: CardRect) => void>(
    () => {},
  );
  const morphCloseRef = useRef<() => void>(() => {});
  const closeTimerRef = useRef<number>(0);
  // The external light: what the neighbour asked for, and the GL-side setter
  // that applies it (bound once the shader is up).
  const externalRef = useRef<string | null>(activeTicker);
  const applyExternalRef = useRef<(ticker: string | null) => void>(() => {});

  // Close sequence, mirroring the basket: the content fades first, then the
  // glass flows back into the tile; the morph settle unmounts the card.
  const closeCard = () => {
    const M = tileMorphRef.current;
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
        setHovered(null);
        lockedRef.current = null;
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

  const tiles = useMemo(
    () => (size ? buildTiles(assets, size.w, size.h) : []),
    [assets, size],
  );
  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);
  const ready = tiles.length > 0;

  useEffect(() => {
    if (highlightTicker)
      rippleRef.current.set(highlightTicker, performance.now());
  }, [highlightTicker]);

  // A change of external light knocks the newly lit tile and swells it.
  useEffect(() => {
    externalRef.current = activeTicker;
    if (activeTicker) rippleRef.current.set(activeTicker, performance.now());
    applyExternalRef.current(activeTicker);
  }, [activeTicker]);

  // The card mounts invisibly on selection; measure it, compute where it
  // lands (expand in place from the tile, clamped inside the container), then
  // aim the glass morph at that rect. Under reduced motion the shader never
  // morphs — the card simply fades in at the same rect.
  useEffect(() => {
    if (!selected || !size) return;
    const el = cardElRef.current;
    const t = tilesRef.current.find((p) => p.ticker === selected);
    if (!el || !t) return;
    const W = Math.min(CARD_W, size.w - CARD_PAD * 2);
    const H = Math.min(el.offsetHeight, size.h - CARD_PAD * 2);
    const rect = {
      left: Math.min(Math.max(t.cx - W / 2, CARD_PAD), size.w - W - CARD_PAD),
      top: Math.min(Math.max(t.cy - H / 2, CARD_PAD), size.h - H - CARD_PAD),
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
    tileMorphRef.current = idleTileMorph();
    window.clearTimeout(closeTimerRef.current);
    setSelected(null);
    setCardOpen(false);
    setCardRect(null);
    setHovered(null);
    lockedRef.current = null;
  }, [size, selected]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const detail = useBasketDetail(selected, assets, analysts);

  // The same imperative handle the glass basket exposes, so a landing call can
  // fly into its tile, knock it, and add a tile that isn't there yet — the
  // Time Machine treats both charts identically.
  useImperativeHandle(
    apiHandle,
    () => ({
      getBubbleRect: (ticker) => {
        const el = ref.current;
        const t = tiles.find((p) => p.ticker === ticker);
        if (!el || !t) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left + t.cx - t.hx,
          top: r.top + t.cy - t.hy,
          width: t.hx * 2,
          height: t.hy * 2,
        };
      },
      hasBubble: (ticker) => tiles.some((p) => p.ticker === ticker),
      ripple: (ticker) => rippleRef.current.set(ticker, performance.now()),
    }),
    [tiles],
  );

  // Build the WebGL once per size; layout and look changes are pushed into
  // uniforms in place by the frame loop.
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
        { length: MAX_TILES },
        () => new THREE.Vector2(),
      );
      const halves = Array.from(
        { length: MAX_TILES },
        () => new THREE.Vector2(),
      );
      const colors = Array.from(
        { length: MAX_TILES },
        () => new THREE.Vector3(),
      );
      const thick = new Array(MAX_TILES).fill(0);
      const morphFrom = new THREE.Vector4();
      const morphBox = new THREE.Vector4();

      const uniforms: Record<string, { value: unknown }> = {
        u_size: { value: new THREE.Vector2(w, h) },
        u_dpr: { value: dpr },
        u_count: { value: 0 },
        u_centers: { value: centers },
        u_half: { value: halves },
        u_thick: { value: thick },
        u_colors: { value: colors },
        u_active: { value: -1 },
        u_hoverAmt: { value: 0 },
        u_corner: { value: CORNER },
        u_priority: { value: -1 },
        u_morphT: { value: 0 },
        u_morphFrom: { value: morphFrom },
        u_morphBox: { value: morphBox },
        u_morphThick: { value: 0 },
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

      const FADE_IN_MS = 340;
      const FADE_OUT_MS = 460;
      let hoverActive = -1;
      let amt = 0;
      let fromAmt = 0;
      let toAmt = 0;
      let animStart = 0;
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

      // Morph bridges, mirroring the basket. Open snapshots the tile as
      // currently RENDERED (breathing + knock included) so the hand-off has
      // no pop; the frame loop hides the real tile while the morph stands in.
      const openMorph = (ticker: string, rect: CardRect) => {
        const M = tileMorphRef.current;
        const i = tilesRef.current.findIndex((p) => p.ticker === ticker);
        if (i < 0) return;
        const hx = halves[i].x > 1 ? halves[i].x : tilesRef.current[i].hx;
        const hy = halves[i].y > 1 ? halves[i].y : tilesRef.current[i].hy;
        morphFrom.set(centers[i].x, centers[i].y, hx, hy);
        uniforms.u_morphThick.value =
          thick[i] > 0.5 ? thick[i] : tilesRef.current[i].thick;
        morphBox.set(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          rect.width / 2,
          rect.height / 2,
        );
        uniforms.u_morphIdx.value = i;
        M.phase = "opening";
        M.ticker = ticker;
        M.from = M.T;
        M.rect = rect;
        M.t0 = performance.now();
      };
      morphOpenRef.current = (ticker, rect) => {
        if (tileMorphRef.current.phase === "idle") openMorph(ticker, rect);
      };
      morphCloseRef.current = () => {
        const M = tileMorphRef.current;
        if (M.phase !== "opening" && M.phase !== "open") return;
        // The glass returns to where the tile now lives — the layout may have
        // reflowed while the card was open.
        const i = M.ticker
          ? tilesRef.current.findIndex((p) => p.ticker === M.ticker)
          : -1;
        if (i >= 0) {
          const cur = easedRef.current.get(M.ticker as string);
          if (cur) morphFrom.set(cur.cx, cur.cy, cur.hx, cur.hy);
          uniforms.u_morphThick.value = tilesRef.current[i].thick;
        }
        M.phase = "closing";
        M.from = M.T;
        M.t0 = performance.now();
        lockedRef.current = null;
        retarget(-1);
        setHovered(null);
      };

      const hitAt = (mx: number, my: number) => {
        const ts = tilesRef.current;
        for (let i = 0; i < ts.length; i++) {
          const t = ts[i];
          if (
            Math.abs(mx - t.cx) <= t.hx + GAP &&
            Math.abs(my - t.cy) <= t.hy + GAP
          )
            return i;
        }
        return -1;
      };
      // Apply (or clear) the external light; the mouse and an open card win.
      const applyExternal = (ticker: string | null) => {
        if (lockedRef.current) return;
        const idx = ticker
          ? tilesRef.current.findIndex((p) => p.ticker === ticker)
          : -1;
        if (idx >= 0) {
          if (idx !== hoverActive) {
            setHovered(ticker);
            retarget(idx);
          }
        } else if (hoverActive >= 0) {
          setHovered(null);
          retarget(-1);
        }
      };
      applyExternalRef.current = applyExternal;
      applyExternal(externalRef.current);
      const onMove = (e: PointerEvent) => {
        if (lockedRef.current) return;
        const rect = container.getBoundingClientRect();
        const idx = hitAt(e.clientX - rect.left, e.clientY - rect.top);
        if (idx >= 0) {
          if (idx !== hoverActive) {
            setHovered(tilesRef.current[idx].ticker);
            retarget(idx);
          }
        } else if (hoverActive >= 0) {
          // Off the tiles but on the map: fall back to the neighbour's pick.
          applyExternal(externalRef.current);
        }
      };
      const onLeave = () => {
        if (lockedRef.current) return;
        applyExternal(externalRef.current);
      };
      const onClick = (e: MouseEvent) => {
        // Clicks inside the open detail card never touch the map.
        if (cardElRef.current?.contains(e.target as Node)) return;
        const rect = container.getBoundingClientRect();
        const idx = hitAt(e.clientX - rect.left, e.clientY - rect.top);
        const M = tileMorphRef.current;
        // While a card is up (or in flight), every other tile is inert: only
        // the open tile, empty space, or the card's × closes it, and nothing
        // new opens until it has closed out.
        if (M.phase === "closing") return;
        if (M.phase !== "idle" || lockedRef.current) {
          if (idx < 0 || tilesRef.current[idx]?.ticker === lockedRef.current)
            closeCard();
          return;
        }
        if (idx >= 0) {
          // Open: light the tile and mount its card; the measure effect aims
          // and kicks the morph.
          const tk = tilesRef.current[idx].ticker;
          lockedRef.current = tk;
          setHovered(tk);
          setSelected(tk);
          retarget(idx, hoverActive !== idx);
        }
      };
      container.addEventListener("pointermove", onMove);
      container.addEventListener("pointerleave", onLeave);
      container.addEventListener("click", onClick);

      // Frame loop (~30fps like the basket): ease the hover glow, ease every
      // tile toward its target rect so reflows read as liquid, and keep the
      // map alive the way the bubbles are — each tile breathes on its own slow
      // cycle (footprint pulls inward and drifts a hair, thickness swells),
      // and a landing call knocks the tile with the bubbles' elastic wobble.
      const start = performance.now();
      let last = 0;
      let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        const now = performance.now();
        const M = tileMorphRef.current;
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
        const ts = tilesRef.current;
        const eased = easedRef.current;
        const rip = rippleRef.current;
        // The freshest knock (or, failing that, the hovered tile) draws first
        // in the shader so its swell owns any overlap with neighbours.
        let priority = hoverActive;
        let priorityT = -Infinity;
        for (let i = 0; i < ts.length && i < MAX_TILES; i++) {
          const target = ts[i];
          let cur = eased.get(target.ticker);
          if (!cur) {
            cur = {
              cx: target.cx,
              cy: target.cy,
              hx: target.hx,
              hy: target.hy,
            };
            eased.set(target.ticker, cur);
          }
          cur.cx += (target.cx - cur.cx) * 0.16;
          cur.cy += (target.cy - cur.cy) * 0.16;
          cur.hx += (target.hx - cur.hx) * 0.16;
          cur.hy += (target.hy - cur.hy) * 0.16;
          const ph = i * 1.7;
          const calm = i === hoverActive ? 1 - amt * 0.7 : 1;
          // Water knock: the same decaying elastic wobble a bubble gets when a
          // tweet lands — on the tile's footprint AND its glass thickness.
          let plop = 1;
          if (rip.has(target.ticker)) {
            const el = (now - (rip.get(target.ticker) as number)) / 1000;
            if (el >= 0.9) rip.delete(target.ticker);
            else {
              plop = 1 + Math.sin(el * 26) * 0.14 * Math.exp(-el * 5.5);
              const started = rip.get(target.ticker) as number;
              if (started > priorityT) {
                priorityT = started;
                priority = i;
              }
            }
          }
          // Breathing: the footprint pulls inward on its own slow cycle (never
          // outward, so resting tiles cannot fight over pixels), the centre
          // drifts a hair, and hover swells the footprint slightly.
          const breathe =
            1 - 0.014 * (0.5 + 0.5 * Math.sin(secs * 0.7 + ph)) * calm;
          const hoverGrow = i === hoverActive ? 1 + 0.03 * amt : 1;
          centers[i].set(
            cur.cx + Math.sin(secs * 0.55 + ph) * 1.2 * calm,
            cur.cy + Math.cos(secs * 0.5 + ph * 1.3) * 1.2 * calm,
          );
          halves[i].set(
            cur.hx * breathe * hoverGrow * plop,
            cur.hy * breathe * hoverGrow * plop,
          );
          colors[i].set(target.bg[0], target.bg[1], target.bg[2]);
          const hoverF = i === hoverActive ? 1 + (HOVER_THICK - 1) * amt : 1;
          thick[i] =
            target.thick *
            hoverF *
            plop *
            (1 + Math.sin(secs * 0.7 + ph) * 0.05 * calm);
        }
        uniforms.u_priority.value = priority;
        uniforms.u_count.value = Math.min(ts.length, MAX_TILES);

        // While a card is up (or morphing), the glass shape stands in for the
        // tile: hide the real one, keep the glow pinned to it, and re-resolve
        // its index by ticker every frame so layout drift can't detach it.
        if (M.phase !== "idle" && M.ticker) {
          const mi = ts.findIndex((p) => p.ticker === M.ticker);
          if (mi < 0) {
            // The ticker left the basket: hard-close.
            Object.assign(M, idleTileMorph());
            uniforms.u_morphT.value = 0;
            lockedRef.current = null;
            retarget(-1);
            setSelected(null);
            setCardOpen(false);
            setCardRect(null);
            setHovered(null);
          } else {
            uniforms.u_morphIdx.value = mi;
            halves[mi].set(0, 0);
            hoverActive = mi;
            uniforms.u_active.value = mi;
          }
        }

        if (morphing && M.rect && M.phase !== "idle") {
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
              // Hand the tile back in this same frame — it was hidden above,
              // so without this the settle frame would draw neither tile nor
              // glass (a one-frame blink).
              const prevTicker = M.ticker;
              const mi = prevTicker
                ? ts.findIndex((p2) => p2.ticker === prevTicker)
                : -1;
              if (mi >= 0) {
                const cur = eased.get(prevTicker as string);
                if (cur) halves[mi].set(cur.hx, cur.hy);
              }
              Object.assign(M, idleTileMorph());
              uniforms.u_morphT.value = 0;
              setSelected(null);
              setCardRect(null);
              setHovered(null);
            }
          }
        }
        draw();
      };
      draw();
      raf = requestAnimationFrame(frame);

      dispose = () => {
        drawRef.current = () => {};
        cancelAnimationFrame(raf);
        container.removeEventListener("pointermove", onMove);
        container.removeEventListener("pointerleave", onLeave);
        container.removeEventListener("click", onClick);
        morphOpenRef.current = () => {};
        morphCloseRef.current = () => {};
        tileMorphRef.current = idleTileMorph();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
        uniformsRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once per size; tiles/params updates flow through refs and uniforms
  }, [size, ready]);

  // Push shader-look changes into the uniforms (no rebuild).
  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    for (const k of PARAM_KEYS) if (u[k]) u[k].value = params[k];
    drawRef.current();
  }, [params]);

  if (failed)
    return (
      <Treemap
        assets={assets}
        highlightTicker={highlightTicker}
        className={className}
      />
    );

  return (
    <div
      ref={ref}
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
      style={{ background: "var(--paper)" }}
    >
      {tiles.map((t) => {
        const wpx = t.hx * 2;
        const hpx = t.hy * 2;
        const showTicker = wpx > 52 && hpx > 34;
        const showMove = wpx > 72 && hpx > 56;
        const big = wpx > 150 && hpx > 110;
        if (!showTicker) return null;
        const active = hovered === t.ticker;
        const dimmed = hovered !== null && !active;
        const minSide = Math.min(wpx, hpx);
        const yielded = selected === t.ticker; // label yields to the card
        return (
          <div
            key={t.ticker}
            className="pointer-events-none absolute flex flex-col justify-between overflow-hidden transition-[left,top,width,height,opacity,filter] duration-500 ease-out"
            style={{
              color: GLASS_THEMES[theme].labelInk ?? "#ffffff",
              left: t.cx - t.hx + 8,
              top: t.cy - t.hy + 7,
              width: wpx - 16,
              height: hpx - 14,
              opacity: yielded ? 0 : dimmed ? 0.3 : 1,
              filter: dimmed ? "blur(1px)" : undefined,
              zIndex: active ? 20 : undefined,
            }}
          >
            <span className="flex flex-col">
              <span
                className="leading-none font-bold tracking-[0.01em]"
                style={{
                  fontSize: Math.max(
                    11,
                    Math.min(20, Math.round(minSide * 0.2)),
                  ),
                }}
              >
                {t.ticker}
              </span>
              {showMove && tileNote?.(t.asset) && (
                <span
                  className="mt-1 leading-none font-medium tracking-[0.04em] uppercase opacity-70"
                  style={{ fontSize: 10 }}
                >
                  {tileNote(t.asset)}
                </span>
              )}
            </span>
            {showMove && (
              <span className="flex items-end justify-between gap-1">
                <span
                  className="leading-none font-medium opacity-90"
                  style={{
                    fontSize: Math.max(
                      10,
                      Math.min(13, Math.round(minSide * 0.13)),
                    ),
                  }}
                >
                  {fmtSigned(t.asset.dayMove ?? 0)}
                </span>
                {/* Proposed reads as pure change (delta only); Current as
                    the holding's plain weight. */}
                {big &&
                  (showDeltas ? (
                    Math.abs(t.asset.targetWeight - t.asset.weight) >=
                      0.0005 && (
                      <span
                        className="leading-none font-semibold"
                        style={{
                          fontSize: 12,
                          color:
                            t.asset.targetWeight > t.asset.weight
                              ? "var(--up-teal)"
                              : "var(--down-red)",
                        }}
                      >
                        {fmtSigned(
                          (t.asset.targetWeight - t.asset.weight) * 100,
                        )}
                      </span>
                    )
                  ) : (
                    <span
                      className="leading-none font-medium opacity-75"
                      style={{ fontSize: 12 }}
                    >
                      {fmtPct(t.asset.targetWeight)}
                    </span>
                  ))}
              </span>
            )}
          </div>
        );
      })}

      {/* Focused detail: the shared card content, positioned exactly over the
          shader-drawn glass and faded in once it settles. */}
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
    </div>
  );
});
