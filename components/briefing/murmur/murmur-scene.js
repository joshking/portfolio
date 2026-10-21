/*
  <murmur-scene> — card edition (adapted 2026-08-18 from the murmur
  concept on origin/main): emergence → convergence, self-contained in a
  card. Fills its positioned container, drives its own convergence from
  scroll-into-view, and maps the cursor to its own bounds. Original header
  follows.

  <murmur-scene> — the immersive scroll scene: emergence → convergence.

  A three.js field of dashes that begins as pure noise (no symmetry, no centre)
  and, as the page scrolls, converges into the DTF cube.

  The cube IS the particles — nothing else is drawn. No mesh, no line work:
  every dash lands on a regular 3-D lattice over the surfaces of an irregular
  recursive partition (the cube sliced into uneven blocks, one per notional
  holding), and the seams between blocks are pure negative space. Structure is
  read entirely from where strokes are not.

  At full convergence the whole field turns into an **isometric** pose (yaw 45°,
  pitch atan(1/√2) ≈ 35.26°). The camera is orthographic throughout — the end
  state is a flat illustration with parallel edges, and zoom carries the dolly —
  giving the exact hexagonal silhouette of the reference design.

  Dashes, not dots: each point sprite draws an oriented short stroke. In the
  noise state they read as birds in a murmuration; in the cube they read as the
  stipple of the reference. Same primitive doing both jobs.

  Position is computed analytically from time in the vertex shader (never
  integrated), so the field is stable, seekable, and costs nothing on the CPU —
  scrubbing the scroll bar backwards looks identical to scrubbing it forwards.

  Usage:
    <script type="importmap">{"imports":{"three":"./vendor/three.module.min.js"}}</script>
    <script src="./components/murmur-scene.js" type="module"></script>
    <murmur-scene></murmur-scene>

  Listens: `murmur:progress` on window — {detail:{progress}} in 0..1, from pane-deck.js.

  Behaviour:
    - no data dependency; the block partition is an abstract, deterministic set.
    - lattice resolution scales with viewport area (~10k–17k dashes).
    - deterministically seeded — identical every load.
    - cursor exerts a slight pull plus a little swirl; it both stirs the noise
      and helps the convergence. Never enough to fight the scroll.
    - prefers-reduced-motion: no rAF loop and no autonomous drift. Scroll still
      drives convergence, rendered one static frame per scroll event.
    - rAF pauses on hidden tab. Falls back to a static CSS field if WebGL fails.
*/
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  NormalBlending,
  Group,
  Color,
  BoxGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Vector2,
  Vector3,
  MathUtils,
} from "three";

/* ---------- tunables ---------- */
const CUBE_HALF = 2.94; // world half-extent of the cube
const CUBE_OFFSET_X = 0; // card edition: the cube settles centred in its own canvas

/* The folio: the exact partition digitized from the approved reference sketch
   (murmur/reference/cube-sketch.png — every line measured from the drawing).
   Coordinates are fractions of CUBE_HALF; +X is the right face, +Z the
   near-left face. Three full Z-planes; two partial X-planes that each span
   only one zone (that nesting is what makes the sketch's top face read as a
   band plus two corner cuts). Every line in the sketch is an internal cut;
   the seams are pure negative space — nothing is ever drawn there. */
const BOXES = [
  { x: [-1.0, -0.34], z: [-1.0, -0.14] }, // far zone, left of its cut
  { x: [-0.34, 1.0], z: [-1.0, -0.14] }, // far zone, right of its cut
  { x: [-1.0, 1.0], z: [-0.14, 0.12] }, // the narrow wrapping band
  { x: [-1.0, 1.0], z: [0.12, 0.54] }, // middle slab
  { x: [-1.0, 0.15], z: [0.54, 1.0] }, // near zone, left of its cut
  { x: [0.15, 1.0], z: [0.54, 1.0] }, // near zone, right of its cut
];
const SEAM = 0.31; // world-units of clear air at each internal cut

const GRID_MIN = 30; // lattice steps across the cube's full width
const GRID_MAX = 40;
// Fraction of a lattice step each stroke may wander. Small on purpose: the
// reference reads as a regular grid of varied-angle strokes, so the variation
// belongs in the angle, not the position. Raise this and the faces lose their
// rows, the boundary rows drift, and the edges go ragged.
const JITTER = 0.06;

/* Per-face lightness, 0 = cobalt, 1 = warm pale. A filled volume reads as one
   opaque mass; shading the faces separately is what lets you tell the top from
   the sides and see the far walls through the near ones. PEPPER is the
   reference's salt-and-pepper: a fraction of strokes on every face flip to the
   opposite end of the ramp, so no face is ever a flat colour. */
const PALE_TOP = 0.88; // top clearly lighter — the depth cue
const PALE_BOTTOM = 0.34;
const PALE_X = 0.08; // right plane — deepest
const PALE_Z = 0.3; // left plane — deep, a step lighter than right
const PEPPER = 0.15;

/* Isometric resting pose. Yaw is NEGATIVE so the cube's +X face lands on the
   screen's right and +Z on the left — the orientation the measured BOXES
   assume. Flip the sign and the whole partition mirrors against the sketch. */
const ISO_YAW = -Math.PI / 4; // −45°
const ISO_PITCH = Math.atan(1 / Math.SQRT2); // ≈ 35.264°

/* palette — sampled from the reference illustration: vivid royal blue, warm
   grey, and rare near-black flecks; ink and slate carry the noise state.

   convertLinearToSRGB() undoes three's colour management: new Color(hex)
   stores the LINEAR form, but this shader writes raw values to an sRGB
   canvas with no output transform, so without the round-trip every colour
   renders gamma-crushed — darker and colder than the palette. */
/* Card edition on the cobalt ground: every stroke is white. Depth still
   reads — the per-face luminance ramp, inner-wall alpha, and the stagger all
   survive; they now modulate white instead of the ink/accent palette. */
const INK = new Color("#FFFFFF").convertLinearToSRGB();
const SLATE = new Color("#FFFFFF").convertLinearToSRGB();
const ACCENT = new Color("#FFFFFF").convertLinearToSRGB();
const ACCENT_2 = new Color("#FFFFFF").convertLinearToSRGB();
const PALE = new Color("#FFFFFF").convertLinearToSRGB();
const FLECK = 0.05; // fraction of strokes that go near-black when converged

const CSS =
  "" +
  "murmur-scene{position:absolute;inset:0;display:block;pointer-events:none}" +
  "murmur-scene canvas{display:block;width:100%;height:100%}" +
  "murmur-scene.is-fallback{background:" +
  "radial-gradient(58% 52% at 50% 50%,rgba(255,255,255,0.14),transparent 72%)}";

function injectStyle(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement("style");
  s.id = id;
  s.textContent = css;
  document.head.appendChild(s);
}

/* Deterministic PRNG — mulberry32. Same field every load. */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- shaders ---------- */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uConverge;
  uniform vec3  uMouse;
  uniform float uMouseOn;
  uniform float uSizeWorld;
  uniform float uPx;          // pixels per world unit (orthographic)
  uniform vec2  uMouseV;      // cursor in view-space world units
  uniform float uCharge;      // dwell charge, 0..1 — grows while hovering the cube
  uniform float uCraterR;     // disruption radius (grows with charge)
  uniform float uCraterAmp;   // disruption strength (grows with charge)
  uniform float uQuiet;       // 1 = ambient page background: fainter strokes

  attribute vec3  aTarget;    // home position on the cube lattice
  attribute vec3  aSeed;      // per-particle randomness, -1..1
  attribute float aScale;
  attribute float aAngle;     // dash orientation
  attribute float aPale;      // 0 = cobalt, 1 = warm pale
  attribute float aInner;     // 1 = internal wall, 0 = outer hull
  attribute float aInk;       // 1 = near-black fleck when converged

  varying float vConv;
  varying float vPale;
  varying float vAngle;
  varying float vAlpha;
  varying float vInk;

  // Layered trig field — organic, cheap, and analytic in t.
  vec3 flow(vec3 p, float t) {
    return vec3(
      sin(p.y * 0.90 + t * 0.55) + 0.6 * sin(p.z * 1.70 - t * 0.35),
      sin(p.z * 0.80 + t * 0.47) + 0.6 * sin(p.x * 1.50 + t * 0.41),
      sin(p.x * 0.85 - t * 0.52) + 0.6 * sin(p.y * 1.60 + t * 0.37)
    );
  }

  void main() {
    float t = uTime;

    // ---- the noise state: a wide, centreless, drifting swarm ----
    vec3 base = aSeed * vec3(10.5, 6.2, 7.5);
    vec3 wander = flow(base * 0.34, t) * 2.35;
    // one shared sweep so the flock moves as a single body, not 15000 sparks
    vec3 sweep = vec3(sin(t * 0.23) * 3.1, cos(t * 0.19) * 1.25, sin(t * 0.17) * 2.0);
    vec3 noisePos = base + wander + sweep;

    // ---- stagger: particles arrive over a window, not all at once ----
    float lag = 0.42 * fract(aSeed.z * 7.31 + 0.5);
    float c = clamp((uConverge - lag) / max(1.0 - lag, 0.001), 0.0, 1.0);
    c = c * c * (3.0 - 2.0 * c);

    vec3 pos = mix(noisePos, aTarget, c);

    // Residual jitter so the lattice breathes instead of freezing dead.
    // Scaled by uSizeWorld (i.e. by the lattice step), NOT an absolute:
    // a fixed world amplitude becomes huge when the cube is condensed and
    // the boundary rows wander — a wobbling edge is a ragged edge.
    pos += flow(aTarget * 1.6, t * 0.5) * uSizeWorld * 0.28 * c;

    // ---- cursor: a slight lens plus a little swirl ----
    // Strong while the field is noise; almost nothing once the cube has
    // formed. Converged strokes must stay within the occluder inset — a big
    // pull would drag them inside the depth boundary and punch holes.
    vec3 d = uMouse - pos;
    float dist2 = dot(d, d);
    float infl = uMouseOn * exp(-dist2 * 0.016) * 0.20 * mix(1.0, 0.045, c);
    pos += d * infl;
    vec3 tang = cross(normalize(d + vec3(1e-4)), vec3(0.0, 0.0, 1.0));
    pos += tang * infl * 1.6;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // ---- the crater: dwell-charged disruption over the formed cube ----
    // Strokes near the cursor are pushed radially away in the view plane
    // (plus a little turbulence and a lift toward the camera), scaled by the
    // dwell charge. Still analytic: as the charge drains, the same field
    // relaxes and the cube magnetically reforms — no state per particle.
    vec2 dxy = mv.xy - uMouseV;
    float dd = dot(dxy, dxy);
    float crater = uCharge * exp(-dd / (uCraterR * uCraterR)) * smoothstep(0.72, 0.95, uConverge);
    vec2 away = dxy * inversesqrt(dd + 1e-3);
    vec3 tur = flow(aTarget * 2.7, t * 1.1);
    mv.xy += (away * (0.85 + 0.35 * tur.z) + tur.xy * 0.28) * crater * uCraterAmp;
    mv.z += crater * uCraterAmp * 0.4;   // toward the camera, past the occluder

    gl_Position = projectionMatrix * mv;

    // Orthographic: no size attenuation — every dash the same on-screen size
    // at the same uSizeWorld, exactly like marks on paper.
    gl_PointSize = uSizeWorld * aScale * uPx;

    vConv = c;
    vPale = aPale;
    vAngle = aAngle;   // freely varied — birds in flight, chips in the cube

    // Opacity comes from the depth-only occluder, not from alpha: hidden
    // strokes are culled by the depth test, so what remains can render crisp.
    // Internal walls stay slightly quieter — they are only ever glimpsed
    // through the seams, as a hint of structure.
    float wall = mix(1.0, 0.55, aInner);
    vAlpha = mix(0.50, 0.97 * wall, c) * (1.0 - uQuiet * 0.5);
    vInk = aInk * smoothstep(0.5, 0.9, c);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uInk;
  uniform vec3 uSlate;
  uniform vec3 uAccent;
  uniform vec3 uAccent2;
  uniform vec3 uPale;

  varying float vConv;
  varying float vPale;
  varying float vAngle;
  varying float vAlpha;
  varying float vInk;

  void main() {
    // uniform circular dot inside the point sprite (card edition — the
    // reference dash read as scratchy at card scale; dots read as stipple)
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    const float R = 0.32;
    float a = 1.0 - smoothstep(R * 0.72, R, d);
    if (a < 0.02) discard;

    // noise reads as ink and slate; signal resolves into cobalt, with the
    // reference's warm pale carrying the light side of the lattice and rare
    // near-black flecks giving it grit
    vec3 quiet = mix(uInk, uSlate, vPale * 0.55);
    // Ramp reaches genuinely warm by vPale≈0.9 — gate it higher and the pale
    // faces stall at lilac and the whole cube reads blue-washed.
    vec3 loud  = mix(mix(uAccent, uAccent2, vPale * 0.35), uPale, smoothstep(0.35, 0.90, vPale));
    // dimension: the deep-toned side planes sit slightly darker than the lit
    // top — a luminance drop that fades out toward the warm end of the ramp
    loud *= mix(1.0, 0.78, smoothstep(0.45, 0.05, vPale));
    loud = mix(loud, uInk, vInk * 0.88);
    vec3 col = mix(quiet, loud, smoothstep(0.10, 0.85, vConv));

    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

/* ---------- element ---------- */

class MurmurScene extends HTMLElement {
  _reducedInit() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  connectedCallback() {
    injectStyle("murmur-scene-css", CSS);
    // ambient mode (attribute): the living noise field only — smaller,
    // fainter, never converging. The background for the static pages.
    this._ambient = this.hasAttribute("ambient");
    this._progress = 1; // card edition: always the settled cube — no scroll-driven convergence
    this._charge = 0;
    this._lastT = null;
    this._reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    this._mouseTarget = new Vector2(0, 0); // NDC
    this._mouse = new Vector2(0, 0);
    this._mouseOn = 0;
    this._mouseWorld = new Vector3(0, 0, 0);
    this._raf = 0;
    this._t0 = 0;

    try {
      this._build();
    } catch (err) {
      // No WebGL, or three.js failed to construct — degrade to a quiet gradient.
      this.classList.add("is-fallback");
      console.warn(
        "[murmur-scene] falling back to static field:",
        err && err.message,
      );
      return;
    }
    this._bind();
    if (this._reduced) this._renderOnce();
    else this._start();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("murmur:progress", this._onProgress);
    window.removeEventListener("pointermove", this._onPointer);
    window.removeEventListener("pointerleave", this._onPointerOut);
    document.removeEventListener("visibilitychange", this._onVisibility);
    if (this._renderer) this._renderer.dispose();
  }

  /* ---- construction ---- */

  _build() {
    const w = this.clientWidth || window.innerWidth;
    const h = this.clientHeight || window.innerHeight;

    this._scene = new Scene();
    // Orthographic on purpose: the committed end state is a flat isometric
    // illustration — parallel edges, no vanishing point. Zoom carries the
    // "dolly" instead of camera distance.
    this._camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this._camera.position.set(0, 0, 60);
    this._worldH = 26;
    this._setFrustum(w / h);

    this._renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this._renderer.setSize(w, h, false);
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._renderer.setPixelRatio(this._dpr);
    this.appendChild(this._renderer.domElement);

    // lattice resolution from viewport area
    const grid = Math.round(
      MathUtils.clamp(Math.sqrt(w * h) / 32, GRID_MIN, GRID_MAX),
    );
    this._step = (CUBE_HALF * 2) / grid;

    this._cube = new Group();
    this._scene.add(this._cube);

    let targets = this._buildLattice(grid);
    // ambient pages need fewer birds — half the flock reads as texture
    if (this._ambient) targets = targets.filter((_, i) => i % 2 === 0);
    this._buildParticles(targets);
    this._buildOccluder();
  }

  /*
    The opacity of the cube, without drawing anything: one invisible
    depth-only InstancedMesh (colorWrite: false) filling each block. Strokes
    behind a face fail the depth test and vanish, so faces read as solid
    stipple fields — the reference look — while the seams still open onto the
    ivory ground. Boxes are inset slightly so the surface strokes themselves
    sit just outside the depth boundary and are never self-occluded.

    Scaled up with convergence (about the cube centre, so blocks shrink toward
    it when small): while the field is noise nothing occludes, and the cube
    turns opaque as it forms.
  */
  _buildOccluder() {
    // Must exceed the sum of position jitter (~0.02) and the breathing
    // amplitude (~0.045·√3) so no settled stroke ever crosses the boundary.
    const INSET = 0.09;
    const boxes = this._blocks;
    const mesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ colorWrite: false }),
      boxes.length,
    );
    const d = new Object3D();
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      d.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
      d.scale.set(
        Math.max(b.x1 - b.x0 - INSET * 2, 0.01),
        Math.max(b.y1 - b.y0 - INSET * 2, 0.01),
        Math.max(b.z1 - b.z0 - INSET * 2, 0.01),
      );
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    mesh.visible = false;
    this._occluder = mesh;
    this._cube.add(mesh);
  }

  /* Orthographic frustum from the visible world height + viewport aspect. */
  _setFrustum(aspect) {
    const h = this._worldH / 2;
    const w = h * aspect;
    this._camera.left = -w;
    this._camera.right = w;
    this._camera.top = h;
    this._camera.bottom = -h;
    this._camera.updateProjectionMatrix();
  }

  /*
    The measured partition from the reference sketch, scaled to world units.
    All boxes are full-height. Seams are carved by insetting each block on its
    *internal* sides only — outer sides stay flush so the cube's silhouette
    remains one clean hexagon.
  */
  _partition() {
    const H = CUBE_HALF;
    const eps = 1e-4,
      g = SEAM / 2;
    return BOXES.map((b) => {
      const x0 = b.x[0] * H,
        x1 = b.x[1] * H;
      const z0 = b.z[0] * H,
        z1 = b.z[1] * H;
      return {
        x0: x0 + (x0 > -H + eps ? g : 0),
        x1: x1 - (x1 < H - eps ? g : 0),
        y0: -H,
        y1: H,
        z0: z0 + (z0 > -H + eps ? g : 0),
        z1: z1 - (z1 < H - eps ? g : 0),
      };
    });
  }

  /*
    Lattice targets — the **surfaces** of every block, not their volume.

    Each block of the partition contributes its six faces, stippled on a
    lattice whose step is global: axis positions are multiples of one step
    across the whole cube, clipped to each block, so rows of strokes run
    continuously across seams instead of restarting per block. The seams
    themselves are empty — the cube's structure is read entirely from where
    strokes are *not*.

    Surfaces rather than a filled volume for two reasons: a filled lattice
    projects to a uniform opaque mass with no readable structure, and the
    per-face lightness that distinguishes top from sides only exists if a
    stroke belongs to a face at all.
  */
  _buildLattice(grid) {
    const rand = rng(0x4d7b21);
    const H = CUBE_HALF;
    const step = (H * 2) / grid;
    const targets = [];
    const boxes = this._partition();
    const eps = 1e-3;

    const isInner = (x, y, z) =>
      Math.abs(Math.abs(x) - H) > eps &&
      Math.abs(Math.abs(y) - H) > eps &&
      Math.abs(Math.abs(z) - H) > eps
        ? 1
        : 0;

    // interior stipple stroke — jittered, peppered, randomly angled
    const push = (x, y, z, pale, ju, jv) => {
      // salt-and-pepper: a slice of strokes flips to the ramp's other end,
      // so pale faces carry cobalt flecks and cobalt faces carry pale ones
      if (rand() < PEPPER) pale = 1 - pale;
      // jitter stays IN the face plane (ju/jv are the in-plane axes) —
      // perpendicular jitter blurs the face into a slab and softens edges
      const j = { x: 0, y: 0, z: 0 };
      j[ju] = (rand() * 2 - 1) * step * JITTER;
      j[jv] = (rand() * 2 - 1) * step * JITTER;
      targets.push({
        x: x + j.x,
        y: y + j.y,
        z: z + j.z,
        pale: MathUtils.clamp(pale + (rand() * 2 - 1) * 0.08, 0, 1),
        inner: isInner(x, y, z),
      });
    };

    // Lattice positions spanning [lo, hi] EXACTLY — first and last rows sit a
    // fixed small margin from the bounds, so every face ends on a full, even
    // row. The clean stop of the rows IS the edge; nothing is ever outlined.
    const lineRange = (lo, hi) => {
      const margin = step * 0.3;
      const span = hi - lo - margin * 2;
      const n = Math.max(1, Math.round(span / step));
      const out = [];
      for (let i = 0; i <= n; i++) out.push(lo + margin + (span * i) / n);
      return out;
    };

    /*
      One face: normal axis n at plane value w; in-plane axes (u, v) with
      ranges [u0,u1]×[v0,v1]. A plain full lattice — the silhouette and the
      seams are formed purely by where the rows stop.
    */
    const face = (n, w, u, u0, u1, v, v0, v1, pale) => {
      const at = (uu, vv) => {
        const p = { [n]: w, [u]: uu, [v]: vv };
        return [p.x, p.y, p.z];
      };
      for (const uu of lineRange(u0, u1)) {
        for (const vv of lineRange(v0, v1)) {
          push(...at(uu, vv), pale, u, v);
        }
      }
    };

    for (const b of boxes) {
      face("y", b.y1, "x", b.x0, b.x1, "z", b.z0, b.z1, PALE_TOP);
      face("y", b.y0, "x", b.x0, b.x1, "z", b.z0, b.z1, PALE_BOTTOM);
      face("x", b.x0, "y", b.y0, b.y1, "z", b.z0, b.z1, PALE_X);
      face("x", b.x1, "y", b.y0, b.y1, "z", b.z0, b.z1, PALE_X);
      face("z", b.z0, "x", b.x0, b.x1, "y", b.y0, b.y1, PALE_Z);
      face("z", b.z1, "x", b.x0, b.x1, "y", b.y0, b.y1, PALE_Z);
    }

    this._blocks = boxes;
    return targets;
  }

  _buildParticles(targets) {
    const rand = rng(0x91c4e7);
    const count = targets.length;
    const pos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const angle = new Float32Array(count);
    const pale = new Float32Array(count);
    const inner = new Float32Array(count);
    const ink = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const t = targets[i];
      target[i * 3] = t.x;
      target[i * 3 + 1] = t.y;
      target[i * 3 + 2] = t.z;
      inner[i] = t.inner;
      ink[i] = rand() < FLECK ? 1 : 0;

      seed[i * 3] = rand() * 2 - 1;
      seed[i * 3 + 1] = rand() * 2 - 1;
      seed[i * 3 + 2] = rand() * 2 - 1;

      // position is fully computed in the shader; seed the buffer anyway
      pos[i * 3] = seed[i * 3] * 10.5;
      pos[i * 3 + 1] = seed[i * 3 + 1] * 6.2;
      pos[i * 3 + 2] = seed[i * 3 + 2] * 7.5;

      scale[i] = 1.0; // uniform dots — variance lived in the dash angle, which is gone
      angle[i] = rand() * Math.PI * 2;
      pale[i] = t.pale;
    }

    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aTarget", new BufferAttribute(target, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seed, 3));
    geo.setAttribute("aScale", new BufferAttribute(scale, 1));
    geo.setAttribute("aAngle", new BufferAttribute(angle, 1));
    geo.setAttribute("aPale", new BufferAttribute(pale, 1));
    geo.setAttribute("aInner", new BufferAttribute(inner, 1));
    geo.setAttribute("aInk", new BufferAttribute(ink, 1));

    this._uniforms = {
      uTime: { value: 0 },
      uConverge: { value: 0 },
      uMouse: { value: new Vector3(0, 0, 0) },
      uMouseOn: { value: 0 },
      uSizeWorld: { value: 0.085 },
      uPx: { value: 100 },
      uMouseV: { value: new Vector2(0, 0) },
      uCharge: { value: 0 },
      uCraterR: { value: 1 },
      uCraterAmp: { value: 0 },
      uQuiet: { value: this._ambient ? 1 : 0 },
      uInk: { value: INK },
      uSlate: { value: SLATE },
      uAccent: { value: ACCENT },
      uAccent2: { value: ACCENT_2 },
      uPale: { value: PALE },
    };

    this._points = new Points(
      geo,
      new ShaderMaterial({
        uniforms: this._uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        // ink on paper: alpha blending, so overlapping strokes build density
        // instead of washing out the way additive does on a light ground
        blending: NormalBlending,
      }),
    );
    this._points.frustumCulled = false;
    this._cube.add(this._points);
    this._count = count;
  }

  /* ---- events ---- */

  _bind() {
    this._onResize = () => {
      const w = this.clientWidth || window.innerWidth;
      const h = this.clientHeight || window.innerHeight;
      this._setFrustum(w / h);
      this._renderer.setSize(w, h, false);
      if (this._reduced) this._renderOnce();
    };
    this._onProgress = (e) => {
      const p = e && e.detail ? e.detail.progress : 0;
      this._progress = MathUtils.clamp(p, 0, 1);
      if (this._reduced) this._renderOnce();
    };
    this._onPointer = (e) => {
      const r = this.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this._mouseTarget.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      this._mouseOn = 1;
    };
    this._onPointerOut = () => {
      this._mouseOn = 0;
    };
    this._onVisibility = () => {
      if (this._reduced) return;
      if (document.hidden) cancelAnimationFrame(this._raf);
      else this._start();
    };

    window.addEventListener("resize", this._onResize);
    window.addEventListener("murmur:progress", this._onProgress);
    document.addEventListener("visibilitychange", this._onVisibility);
    if (!this._reduced) {
      window.addEventListener("pointermove", this._onPointer, {
        passive: true,
      });
      window.addEventListener("pointerleave", this._onPointerOut);
    }
  }

  /* ---- frame ---- */

  _start() {
    cancelAnimationFrame(this._raf);
    if (!this._t0) this._t0 = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      this._frame((now - this._t0) / 1000);
    };
    this._raf = requestAnimationFrame(loop);
  }

  _renderOnce() {
    // reduced-motion: a still frame at the current scroll position
    this._apply(0, this._progress);
    this._renderer.render(this._scene, this._camera);
  }

  _frame(t) {
    // ease the cursor so it trails the pointer instead of snapping to it
    this._mouse.lerp(this._mouseTarget, 0.055);
    this._apply(t, this._progress);
    this._renderer.render(this._scene, this._camera);
  }

  _apply(t, p) {
    const u = this._uniforms;
    u.uTime.value = t;

    // ambient pages never converge — the flock just lives
    if (this._ambient) p = 0;

    // convergence completes a touch before the scroll ends, so the last pane
    // is read against a settled cube rather than a still-moving one
    const c = MathUtils.clamp(p / 0.92, 0, 1);
    u.uConverge.value = c;
    const ease = smootherstep(c, 0, 1);

    // cursor into world space on the swarm's mid plane
    this._mouseWorld.set(this._mouse.x * 15.5, this._mouse.y * 9.5, 2.0);
    u.uMouse.value.copy(this._mouseWorld);
    u.uMouseOn.value = this._mouseOn * (this._reduced ? 0 : 1);

    // ---- dwell charge: hovering the formed cube builds disruption ----
    const dt =
      this._lastT === null ? 0 : MathUtils.clamp(t - this._lastT, 0, 0.05);
    this._lastT = t;
    const aspect =
      (this.clientWidth || window.innerWidth) /
      (this.clientHeight || window.innerHeight);
    const halfH = this._worldH / 2,
      halfW = halfH * aspect;
    const mvx = this._mouse.x * halfW,
      mvy = this._mouse.y * halfH;
    // cube centre in view space (camera at panX looking down -z)
    const ccx = -this._camera.position.x,
      ccy = -this._camera.position.y;
    const overCube =
      this._mouseOn > 0 &&
      !this._reduced &&
      c > 0.9 &&
      Math.hypot(mvx - ccx, mvy - ccy) < CUBE_HALF * 2.1;
    // charge builds over ~2.6s of dwell, drains over ~1s — the disruption
    // stacks with time spent, then the cube magnetically reforms
    this._charge = MathUtils.clamp(
      this._charge + (overCube ? dt / 2.6 : -dt / 1.0),
      0,
      1,
    );
    u.uMouseV.value.set(mvx, mvy);
    u.uCharge.value = this._charge;
    u.uCraterR.value = CUBE_HALF * (0.45 + 0.5 * this._charge);
    u.uCraterAmp.value = CUBE_HALF * 0.5 * Math.pow(this._charge, 1.4);

    // The cube turns opaque as it forms — the occluder grows from the centre.
    // It also loosens with charge, so dispersed strokes aren't depth-culled
    // mid-flight and the disruption reads as the cube opening, not deleting.
    const solid = smootherstep(c, 0.7, 0.985);
    this._occluder.visible = solid > 0.02;
    this._occluder.scale.setScalar(
      Math.max(solid * (1 - 0.3 * this._charge), 1e-4),
    );

    // ---- pose: drift while noise, lock to isometric as it arrives ----
    // The free yaw is damped out by (1 - ease) so the object settles exactly on
    // the iso angle instead of rotating past it.
    const drift = t * 0.075 * (1 - ease);
    this._cube.rotation.set(
      ISO_PITCH * ease,
      drift + ISO_YAW * ease + Math.sin(t * 0.16) * 0.03 * ease,
      0,
    );

    // ---- camera: orthographic throughout; zoom carries the dolly ----
    const worldH = 26 - 16 * ease; // visible world height: wide → close (card: end tight on the cube)
    if (Math.abs(this._worldH - worldH) > 1e-4) {
      this._worldH = worldH;
      this._setFrustum(
        (this.clientWidth || window.innerWidth) /
          (this.clientHeight || window.innerHeight),
      );
    }
    const panX = -CUBE_OFFSET_X * ease;
    this._camera.position.set(panX, 1.6 * (1 - c), 60);
    this._camera.lookAt(panX, 0, 0);

    // pixels per world unit — dash size in true screen terms
    const hPx = (this.clientHeight || window.innerHeight) * this._dpr;
    u.uPx.value = hPx / worldH;
    // Converged, a stroke spans ~0.42 of a lattice step — small separate
    // chips with generous air, the way the reference stipple reads.
    // Ambient birds are smaller still: background texture, not foreground.
    const noiseSize = this._ambient ? 0.052 : 0.075;
    u.uSizeWorld.value = noiseSize * (1 - ease) + this._step * 0.38 * ease;
  }
}

function smootherstep(x, a, b) {
  const t = MathUtils.clamp((x - a) / (b - a || 1), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

if (!customElements.get("murmur-scene"))
  customElements.define("murmur-scene", MurmurScene);
