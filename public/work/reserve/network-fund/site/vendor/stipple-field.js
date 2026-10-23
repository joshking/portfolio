/**
 * <stipple-field> — the site's own mark, as a still plate or a live flock.
 *
 * One treatment family for every image on the story page: a lattice of square
 * marks, thresholded against value noise. The same vocabulary the murmuration
 * already speaks.
 *
 * Attributes
 *   mode      bloom | field | canopy | flock | sphere | noise | map   (default field)
 *   ink       mark colour                       (default #ffffff)
 *   bg        ground, or "none"                 (default none)
 *   glow      bloom colour                      (default #8a7a2e)
 *   seed      integer, changes the plate        (default 1)
 *   grid      lattice pitch in px               (default 5)
 *   density   0..1, how much is inked           (default 0.5)
 *   clear     "cx,cy,rx,ry" shares — a clearing punched for a block of type
 *
 * sphere only
 *   scale     multiplies the radius fit                (default 1)
 *   light     "lx,ly" light from, shares of the radius  (default -0.5,-0.45)
 *   halo      0..1, marks adrift off the sphere         (default 0.5)
 *   animate   present = the world turns
 *   spin      radians per second                        (default 0.035)
 *
 * flock only
 *   animate   present = the murmur drifts
 *   amp       how far a mark rides the flow field       (default 15)
 *   spread    "rx,ry" cloud radii, shares of the frame  (default 0.52,0.46)
 *
 * noise only
 *   streak    how far the noise is stretched down    (default 6)
 *   density   here it is the wall's weight, 0..1     (default 0.5)
 *
 * map only
 *   scale     multiplies the contain fit; >1 spreads past the frame (default 1)
 *   crop      ignore mask rows below this share — Antarctica (default 0.86)
 *   animate   present = the map flies as a flock
 *   amp       displacement in px at full flow   (default 16)
 *   fps       frame cap                         (default 40)
 *
 * `map` needs world-mask.js loaded first: a 480×240 land bitmap rasterised
 * from Natural Earth (world-atlas 110m) through d3-geo's Natural Earth
 * projection. Real geometry, dithered — never a drawn coastline.
 *
 * The animation is not per-mark boids. A coarse flow field — two noise fields
 * advancing on their own clocks, one for direction and one for amplitude — is
 * evaluated on a 48×24 grid each frame and sampled per mark, so a turn sweeps
 * across a continent as one wave rather than every mark jittering on its own.
 * Each mark keeps its home cell and its own phase, so the world holds its
 * shape while the marks inside it never stop moving. The pointer pushes marks
 * out of its way with an inverse-square falloff, as the hero's flock does.
 */
(() => {
  const TAU = Math.PI * 2;
  const hash = (x, y, s) => {
    let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 1274126177;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  function noise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), v = smooth(y - yi);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s);
    const c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < 4; i++) { v += amp * noise(x * f, y * f, s + i * 17); f *= 2.07; amp *= 0.5; }
    return v;
  }
  /* Three dimensions, so a feature can be pinned to a point on a turning
     sphere and come back round seamlessly — a 2D field sampled through the
     projection would seam at the limb. */
  function noise3(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    const c = (dx, dy, dz) => hash(xi + dx + (zi + dz) * 7919, yi + dy + (zi + dz) * 104729, s);
    const x00 = c(0, 0, 0) + (c(1, 0, 0) - c(0, 0, 0)) * u;
    const x10 = c(0, 1, 0) + (c(1, 1, 0) - c(0, 1, 0)) * u;
    const x01 = c(0, 0, 1) + (c(1, 0, 1) - c(0, 0, 1)) * u;
    const x11 = c(0, 1, 1) + (c(1, 1, 1) - c(0, 1, 1)) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }
  function fbm3(x, y, z, s) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < 3; i++) { v += amp * noise3(x * f, y * f, z * f, s + i * 23); f *= 2.13; amp *= 0.5; }
    return v;
  }

  let MASK = null;
  function mask() {
    if (MASK) return MASK;
    const src = window.__WORLD_MASK;
    if (!src) return null;
    const bin = atob(src.b64);
    const bits = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
    MASK = { w: src.w, h: src.h, bits };
    return MASK;
  }
  const land = (m, x, y) => {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return 0;
    const i = y * m.w + x;
    return (m.bits[i >> 3] >> (i & 7)) & 1;
  };

  const FW = 48, FH = 24;

  class StippleField extends HTMLElement {
    connectedCallback() {
      if (this._canvas) return;
      /* The host must carry a resolved size. Left as an auto-height block, its
         canvas's `height:100%` has nothing to resolve against and falls back to
         the canvas element's intrinsic ratio from the width/height attributes
         paint() just wrote — which settles at 2:1 and leaves the bottom of
         every panel unpainted. */
      this.style.display = "block";
      if (!this.style.position) this.style.position = "relative";
      if (!this.style.width) this.style.width = "100%";
      if (!this.style.height) this.style.height = "100%";
      this.style.overflow = "hidden";
      const c = document.createElement("canvas");
      c.style.cssText = "display:block;width:100%;height:100%;";
      this.appendChild(c);
      this._canvas = c;
      this._t = 0;
      this._onScreen = true;
      this._pointer = { x: -9999, y: -9999, on: false };
      this._reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      this._ro = new ResizeObserver(() => this.paint());
      this._ro.observe(this);
      this._io = new IntersectionObserver((e) => {
        this._onScreen = e[0] ? e[0].isIntersecting : true;
        if (!this._w) this.paint();
        this._onScreen ? this.run() : this.halt();
      }, { rootMargin: "160px" });
      this._io.observe(this);
      this._onVis = () => {
        if (document.hidden) { this.halt(); return; }
        if (!this._w) this.paint();
        this.run();
      };
      document.addEventListener("visibilitychange", this._onVis);
      this._onMove = (e) => {
        const r = this.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        this._pointer.x = e.clientX - r.left;
        this._pointer.y = e.clientY - r.top;
        this._pointer.on = inside;
      };
      if (this.hasAttribute("animate")) window.addEventListener("pointermove", this._onMove, { passive: true });
      this.paint();
    }
    disconnectedCallback() {
      this.halt();
      clearTimeout(this._sizeTimer);
      this._sizeTimer = 0;
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      document.removeEventListener("visibilitychange", this._onVis);
      window.removeEventListener("pointermove", this._onMove);
      this._ro = this._io = null;
    }
    static get observedAttributes() { return ["mode", "ink", "bg", "glow", "seed", "grid", "density", "clear", "scale", "crop", "animate", "amp", "balance", "shifty", "shift-y", "light", "halo", "streak", "spin", "spread"]; }
    attributeChangedCallback() { if (this._canvas) { this._pts = this._sph = this._flk = null; this.paint(); } }

    /* ---------------------------------------------------------- the loop */

    run() {
      if (this._raf || !this._live || this._reduce || !this._onScreen || document.hidden) return;
      this._last = 0;
      const fps = parseFloat(this.getAttribute("fps") || "40");
      const frame = (now) => {
        if (!this._raf) return;
        this._raf = requestAnimationFrame(frame);
        const dt = this._last ? now - this._last : 16;
        if (this._last && dt < 1000 / fps - 1) return;
        this._last = now;
        this._t += Math.min(0.05, dt / 1000);
        this._frame();
      };
      this._raf = requestAnimationFrame(frame);
    }
    halt() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }

    /* --------------------------------------------------------- the paint */

    paint() {
      const c = this._canvas;
      if (!c) return;
      const r = this.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      /* Mounted before the section has laid out, the host measures 0 and there
         is no guarantee of a later ResizeObserver delivery — so retry rather
         than give up, or the panel stays permanently blank. Both a frame and a
         timer: rAF callbacks are dropped while the frame isn't being rendered,
         and a single missed frame would otherwise end the chain. */
      if (w < 2 || h < 2) {
        if ((this._sizeWaits = (this._sizeWaits || 0) + 1) < 150) {
          requestAnimationFrame(() => this.paint());
          clearTimeout(this._sizeTimer);
          this._sizeTimer = setTimeout(() => this.paint(), 120);
        }
        return;
      }
      clearTimeout(this._sizeTimer);
      this._sizeTimer = 0;
      this._sizeWaits = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.floor(w * dpr) || c.height !== Math.floor(h * dpr)) {
        c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr);
        this._pts = this._sph = this._flk = null;
      }
      this._w = w; this._h = h; this._dpr = dpr;
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if ((this.getAttribute("mode") || "field") === "map") {
        this._live = this.hasAttribute("animate");
        this._frame = () => this.drawMap();
        if (!this.buildMap()) return;
        this.drawMap();
        this.run();
        return;
      }
      if ((this.getAttribute("mode") || "field") === "flock") {
        this._live = this.hasAttribute("animate");
        this._frame = () => this.drawFlock();
        this.buildFlock();
        this.drawFlock();
        this.run();
        return;
      }
      if ((this.getAttribute("mode") || "field") === "sphere") {
        this._live = this.hasAttribute("animate");
        this._frame = () => this.drawSphere();
        this.buildSphere();
        this.drawSphere();
        this.run();
        return;
      }
      this._live = false;
      this.drawStill(ctx, w, h);
    }

    /* -------------------------------------------------- still plates */

    drawStill(ctx, w, h) {
      ctx.clearRect(0, 0, w, h);
      const mode = this.getAttribute("mode") || "field";
      const ink = this.getAttribute("ink") || "#ffffff";
      const bg = this.getAttribute("bg") || "none";
      const glow = this.getAttribute("glow") || "#8a7a2e";
      const seed = parseInt(this.getAttribute("seed") || "1", 10) || 1;
      const G = parseFloat(this.getAttribute("grid") || "5") || 5;
      const density = parseFloat(this.getAttribute("density") || "0.5");
      if (bg && bg !== "none") { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }

      if (mode === "noise") { this.drawNoise(ctx, w, h, ink, seed, G, density); return; }

      const cx = w * 0.5, cy = mode === "canopy" ? h * 0.06 : h * 0.5;
      const rx = w * (mode === "canopy" ? 0.85 : 0.42);
      const ry = h * (mode === "canopy" ? 0.95 : 0.42);

      if (mode === "bloom") {
        ctx.save();
        ctx.filter = "blur(34px)";
        const g = ctx.createRadialGradient(cx, cy * 1.02, 0, cx, cy, Math.max(rx, ry) * 1.1);
        g.addColorStop(0, glow);
        g.addColorStop(0.55, glow + "88");
        g.addColorStop(1, glow + "00");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.25, ry * 1.15, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      const scale = mode === "canopy" ? 26 : 15;
      const size = G * (mode === "canopy" ? 0.58 : 0.66);
      const thresh = 0.62 - density * 0.34;
      const path = new Path2D();
      for (let y = G * 0.5; y < h; y += G) {
        for (let x = G * 0.5; x < w; x += G) {
          let fall;
          if (mode === "canopy") {
            fall = Math.pow(Math.max(0, 1 - Math.max(0, (y - cy) / ry)), 1.5);
          } else {
            const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
            fall = Math.pow(Math.max(0, 1 - d * 0.82), 1.7);
          }
          if (fall <= 0.001) continue;
          if (fbm(x / scale, y / scale, seed) * (0.45 + fall * 1.25) > thresh) {
            path.rect(Math.round(x / G) * G - size / 2, Math.round(y / G) * G - size / 2, size, size);
          }
        }
      }
      ctx.fillStyle = ink;
      ctx.fill(path);
      this.clearing(ctx, w, h);
    }

    /**
     * The murmur: a cloud of marks with no edge and no centre, riding the same
     * flow field the map flies on. Nothing in it is an object — it is the page
     * standing for a crowd, so it holds no silhouette to read, only a drift
     * that never repeats. Points are chosen once per size; the frame loop only
     * displaces them.
     */
    buildFlock() {
      if (this._flk) return;
      const w = this._w, h = this._h;
      const G = parseFloat(this.getAttribute("grid") || "5") || 5;
      const density = parseFloat(this.getAttribute("density") || "0.5");
      const seed = parseInt(this.getAttribute("seed") || "1", 10) || 1;
      const sp = (this.getAttribute("spread") || "0.52,0.46").split(",").map(parseFloat);
      const rx = w * (isNaN(sp[0]) ? 0.52 : sp[0]);
      const ry = h * (isNaN(sp[1]) ? 0.46 : sp[1]);
      const cx = w * 0.5, cy = h * 0.5;
      const thresh = 0.62 - density * 0.34;
      const xs = [], ys = [], ph = [];
      for (let y = G * 0.5; y < h; y += G) {
        for (let x = G * 0.5; x < w; x += G) {
          const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
          const fall = Math.pow(Math.max(0, 1 - d * 0.82), 1.7);
          if (fall <= 0.001) continue;
          if (fbm(x / 15, y / 15, seed) * (0.45 + fall * 1.25) > thresh) {
            xs.push(x); ys.push(y); ph.push(hash(x, y, seed) * TAU);
          }
        }
      }
      this._flk = {
        G, seed,
        x: Float32Array.from(xs), y: Float32Array.from(ys), p: Float32Array.from(ph),
        ang: new Float32Array(FW * FH), amp: new Float32Array(FW * FH)
      };
    }

    drawFlock() {
      const f = this._flk;
      if (!f) return;
      const w = this._w, h = this._h;
      const ctx = this._canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      const bg = this.getAttribute("bg") || "none";
      if (bg && bg !== "none") { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
      const G = f.G, size = G * 0.66, half = size / 2;
      const live = this._live && !this._reduce;
      const A = live ? parseFloat(this.getAttribute("amp") || "15") : 0;
      const t = this._t;

      /* One flow evaluation per cell of a coarse grid, not per mark, so a turn
         crosses the cloud as a wave instead of as noise. */
      if (A) {
        for (let j = 0; j < FH; j++) {
          for (let i = 0; i < FW; i++) {
            const k = j * FW + i;
            f.ang[k] = fbm(i * 0.30 + t * 0.12, j * 0.30, f.seed) * TAU * 2;
            f.amp[k] = 0.25 + fbm(i * 0.22, j * 0.22 + t * 0.09, f.seed + 31) * 1.3;
          }
        }
      }
      const pxr = this._pointer.x, pyr = this._pointer.y, on = this._pointer.on && live;
      const R = 170, R2 = R * R;
      const path = new Path2D();
      for (let i = 0; i < f.x.length; i++) {
        let x = f.x[i], y = f.y[i];
        if (A) {
          const fi = Math.min(FW - 1, (x / w * FW) | 0);
          const fj = Math.min(FH - 1, (y / h * FH) | 0);
          const k = fj * FW + fi;
          const a = f.ang[k] + f.p[i] * 0.9;
          const amp = A * f.amp[k] * (0.55 + (f.p[i] / TAU) * 0.9);
          x += Math.cos(a) * amp;
          y += Math.sin(a) * amp * 0.72;
        }
        if (on) {
          const dx = x - pxr, dy = y - pyr, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const push = (1 - d2 / R2);
            const d = Math.sqrt(d2) || 1;
            x += (dx / d) * push * push * 70;
            y += (dy / d) * push * push * 70;
          }
        }
        path.rect(Math.round(x / G) * G - half, Math.round(y / G) * G - half, size, size);
      }
      ctx.fillStyle = this.getAttribute("ink") || "#ffffff";
      ctx.fill(path);
      this.clearing(ctx, w, h);
    }

    /**
     * A planet, dithered. Not a drawn circle: every lattice cell inside the
     * disc gets its own lambert term, so the sphere is read from the density
     * falling away toward the terminator and the limb is whatever the dither
     * leaves at the edge. Its markings come from a three-dimensional field
     * sampled at the point each cell sees, so when the world turns they cross
     * the face, foreshorten into the limb, and come back round — the turn is
     * the only thing that says planet rather than ball or coin. A thin halo of
     * marks sits off the limb, so it reads as a crowd rather than an object.
     *
     * Geometry is worked out once per size; the frame loop only re-thresholds.
     */
    buildSphere() {
      if (this._sph) return;
      const w = this._w, h = this._h;
      const G = parseFloat(this.getAttribute("grid") || "5") || 5;
      const density = parseFloat(this.getAttribute("density") || "0.5");
      const seed = parseInt(this.getAttribute("seed") || "1", 10) || 1;
      const zoom = parseFloat(this.getAttribute("scale") || "1");
      const R = Math.min(w, h) * 0.38 * zoom;
      const cx = w * 0.5, cy = h * 0.5;
      const lit = (this.getAttribute("light") || "-0.5,-0.45").split(",").map(parseFloat);
      let lx = isNaN(lit[0]) ? -0.5 : lit[0], ly = isNaN(lit[1]) ? -0.45 : lit[1], lz = 0.72;
      const ln = Math.hypot(lx, ly, lz) || 1;
      lx /= ln; ly /= ln; lz /= ln;
      const halo = parseFloat(this.getAttribute("halo") || "0.5");
      const gain = 0.45 + density * 0.95;
      const size = G * 0.66;

      const gx = [], gy = [], sh = [], du = [], lat = [], lon = [], cs = [];
      const drift = new Path2D();
      for (let y = G * 0.5; y < h; y += G) {
        for (let x = G * 0.5; x < w; x += G) {
          const nx = (x - cx) / R, ny = (y - cy) / R;
          const d = Math.hypot(nx, ny);
          /* A uniform hash, not the fbm: value noise clusters so tightly
             around its mean that a shading comparison flips the whole disc at
             once. Uniform per-cell samples give a true stipple gradient; a
             little fbm is mixed back in for organic clumping. */
          const u = hash(x, y, seed) * 0.78 + fbm(x / 26, y / 26, seed + 5) * 0.22;
          const px = Math.round(x / G) * G - size / 2, py = Math.round(y / G) * G - size / 2;
          if (d <= 1) {
            const z = Math.sqrt(Math.max(0, 1 - d * d));
            const lam = Math.max(0, nx * lx + ny * ly + z * lz);
            /* Hold a little ink at the limb so the silhouette survives the
               terminator instead of dissolving into the ground. */
            const rim = Math.pow(Math.max(0, d - 0.9) / 0.1, 1.2) * 0.34;
            gx.push(px); gy.push(py); du.push(u);
            sh.push(Math.min(1, 0.13 + Math.pow(lam, 1.2) * 0.87 + rim));
            const la = Math.asin(Math.max(-1, Math.min(1, -ny)));
            lat.push(la); cs.push(Math.cos(la));
            lon.push(Math.atan2(nx, z));
          } else if (halo > 0 && d < 1.5) {
            const off = Math.pow(Math.max(0, 1 - (d - 1) / 0.5), 2.4) * halo;
            if (u < off * gain * 0.30) drift.rect(px, py, size, size);
          }
        }
      }
      this._sph = {
        seed, size, gain, drift,
        gx: Float32Array.from(gx), gy: Float32Array.from(gy),
        sh: Float32Array.from(sh), du: Float32Array.from(du),
        lat: Float32Array.from(lat), lon: Float32Array.from(lon), cs: Float32Array.from(cs)
      };
    }

    drawSphere() {
      const p = this._sph;
      if (!p) return;
      const w = this._w, h = this._h;
      const ctx = this._canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      const ink = this.getAttribute("ink") || "#ffffff";
      const bg = this.getAttribute("bg") || "none";
      if (bg && bg !== "none") { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }

      const live = this._live && !this._reduce;
      /* A slow turn: a shade over three minutes for a full rotation, so the
         face is never still and never seen to move. */
      const rot = live ? this._t * parseFloat(this.getAttribute("spin") || "0.035") : 0;
      const body = new Path2D();
      for (let i = 0; i < p.gx.length; i++) {
        const a = p.lon[i] + rot, c = p.cs[i];
        const fx = c * Math.cos(a), fy = Math.sin(p.lat[i]), fz = c * Math.sin(a);
        const feature = fbm3(fx * 2.3 + 4, fy * 2.3 + 9, fz * 2.3 + 2, p.seed);
        const shade = Math.min(1, p.sh[i] * (0.66 + feature * 0.72));
        if (p.du[i] < Math.pow(shade, 1.55) * p.gain) body.rect(p.gx[i], p.gy[i], p.size, p.size);
      }
      ctx.fillStyle = ink;
      ctx.fill(body);
      ctx.globalAlpha = 0.5;
      ctx.fill(p.drift);
      ctx.globalAlpha = 1;
      this.clearing(ctx, w, h);
    }

    /**
     * A wall of marks with no form in it: the same lattice, stretched down the
     * frame so it reads as overlapping streams rather than as a cloud, dense
     * enough that nothing in it can be picked out. The counterpart to the
     * sphere — all signal, no shape.
     */
    drawNoise(ctx, w, h, ink, seed, G, density) {
      const streak = parseFloat(this.getAttribute("streak") || "6");
      const gain = 0.08 + density * 0.5;
      const size = G * 0.66;
      const path = new Path2D();
      for (let y = G * 0.5; y < h; y += G) {
        for (let x = G * 0.5; x < w; x += G) {
          const u = hash(x, y, seed) * 0.72 + fbm(x / 24, y / 24, seed + 9) * 0.28;
          /* Two stretched fields at different pitches: broad lanes, and a
             finer grain inside them that keeps any lane from reading as an
             object. */
          const lane = fbm(x / 9, y / (9 * streak), seed);
          const fine = fbm(x / 3.4, y / (3.4 * streak), seed + 19);
          const shade = Math.min(1, 0.2 + lane * 0.95 + fine * 0.3);
          if (u < Math.pow(shade, 1.7) * gain) {
            path.rect(Math.round(x / G) * G - size / 2, Math.round(y / G) * G - size / 2, size, size);
          }
        }
      }
      ctx.fillStyle = ink;
      ctx.fill(path);
      this.clearing(ctx, w, h);
    }

    /* ------------------------------------------------------------ the map */

    /** Home positions, worked out once per size: every lattice cell the
        dithered land mask inks, plus the sparse spill into the water. */
    buildMap() {
      if (this._pts) return true;
      const m = mask();
      if (!m) {
        this._waits = (this._waits || 0) + 1;
        if (this._waits < 150) requestAnimationFrame(() => this.paint());
        return false;
      }
      const w = this._w, h = this._h;
      const G = parseFloat(this.getAttribute("grid") || "5") || 5;
      const density = parseFloat(this.getAttribute("density") || "0.5");
      const seed = parseInt(this.getAttribute("seed") || "1", 10) || 1;
      const zoom = parseFloat(this.getAttribute("scale") || "1");
      const thresh = 0.62 - density * 0.34;
      const s = Math.min(w / m.w, h / m.h) * zoom;
      const ox = (w - m.w * s) / 2, oy = (h - m.h * s) / 2;
      const crop = m.h * parseFloat(this.getAttribute("crop") || "0.86");

      const bx = [], by = [], bp = [], sx = [], sy = [], sp = [];
      for (let y = G * 0.5; y < h; y += G) {
        for (let x = G * 0.5; x < w; x += G) {
          const mx = Math.floor((x - ox) / s), my = Math.floor((y - oy) / s);
          if (my > crop) continue;
          const n = fbm(x / 15, y / 15, seed);
          const region = fbm(x / 78, y / 78, seed + 7) - 0.5;
          if (land(m, mx, my)) {
            if (0.10 + n * 1.05 + region * 0.6 > thresh) {
              bx.push(x); by.push(y); bp.push(hash(x, y, seed) * TAU);
            }
            continue;
          }
          let near = 0;
          for (let k = 0; k < 8 && !near; k++) {
            const a = (k / 8) * TAU;
            near = land(m, mx + Math.round(Math.cos(a) * 4), my + Math.round(Math.sin(a) * 4));
          }
          if (near && n * 0.9 > thresh + 0.12) {
            sx.push(x); sy.push(y); sp.push(hash(x, y, seed + 3) * TAU);
          }
        }
      }
      const pts = {
        G, seed,
        bx: Float32Array.from(bx), by: Float32Array.from(by), bp: Float32Array.from(bp),
        sx: Float32Array.from(sx), sy: Float32Array.from(sy), sp: Float32Array.from(sp),
        ang: new Float32Array(FW * FH), amp: new Float32Array(FW * FH)
      };

      /* Centre the ink, not the bounding box. The world's landmass is not
         symmetrical about the antimeridian — the Americas are a thin vertical
         ribbon and Eurasia with Africa is a slab — so a geometrically centred
         projection hangs visibly right and high. Balancing on the centroid of
         the marks actually drawn puts the weight of the picture in the middle
         of the frame, which is what the eye reads. */
      if (this.getAttribute("balance") !== "off" && pts.bx.length) {
        let mx = 0, my = 0;
        for (let i = 0; i < pts.bx.length; i++) { mx += pts.bx[i]; my += pts.by[i]; }
        const dx = w / 2 - mx / pts.bx.length;
        /* Both spellings: a hyphenated prop is lowercased to one word on the
           way through some mounts, and the attribute then never lands. */
        const sy = this.getAttribute("shift-y") || this.getAttribute("shifty") || "0";
        const dy = h / 2 - my / pts.by.length + h * parseFloat(sy);
        for (let i = 0; i < pts.bx.length; i++) { pts.bx[i] += dx; pts.by[i] += dy; }
        for (let i = 0; i < pts.sx.length; i++) { pts.sx[i] += dx; pts.sy[i] += dy; }
      }
      this._pts = pts;
      return true;
    }

    drawMap() {
      const p = this._pts;
      if (!p) return;
      const w = this._w, h = this._h;
      const ctx = this._canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      const ink = this.getAttribute("ink") || "#ffffff";
      const G = p.G, size = G * 0.62, half = size / 2;
      const live = this._live && !this._reduce;
      const A = live ? parseFloat(this.getAttribute("amp") || "16") : 0;
      const t = this._t;

      /* The flow field: one evaluation per cell, not per mark, so a turn
         crosses a continent as a wave instead of as noise. */
      if (A) {
        for (let j = 0; j < FH; j++) {
          for (let i = 0; i < FW; i++) {
            const k = j * FW + i;
            p.ang[k] = fbm(i * 0.30 + t * 0.13, j * 0.30, p.seed) * TAU * 2;
            p.amp[k] = 0.25 + fbm(i * 0.22, j * 0.22 + t * 0.10, p.seed + 31) * 1.3;
          }
        }
      }
      const px = this._pointer.x, py = this._pointer.y, on = this._pointer.on && live;
      const R = 170, R2 = R * R;

      const place = (path, xs, ys, ph, i) => {
        let x = xs[i], y = ys[i];
        if (A) {
          const fi = Math.min(FW - 1, (x / w * FW) | 0);
          const fj = Math.min(FH - 1, (y / h * FH) | 0);
          const k = fj * FW + fi;
          const a = p.ang[k] + ph[i] * 0.9;
          const amp = A * p.amp[k] * (0.55 + (ph[i] / TAU) * 0.9);
          x += Math.cos(a) * amp;
          y += Math.sin(a) * amp * 0.72;
        }
        if (on) {
          const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const push = (1 - d2 / R2);
            const d = Math.sqrt(d2) || 1;
            x += (dx / d) * push * push * 70;
            y += (dy / d) * push * push * 70;
          }
        }
        path.rect(Math.round(x / G) * G - half, Math.round(y / G) * G - half, size, size);
      };

      const body = new Path2D();
      for (let i = 0; i < p.bx.length; i++) place(body, p.bx, p.by, p.bp, i);
      const spill = new Path2D();
      for (let i = 0; i < p.sx.length; i++) place(spill, p.sx, p.sy, p.sp, i);

      ctx.fillStyle = ink;
      ctx.fill(body);
      ctx.globalAlpha = 0.42;
      ctx.fill(spill);
      ctx.globalAlpha = 1;
      this.clearing(ctx, w, h);
    }

    /**
     * A clearing for a block of type, taken out of the ink after it is laid
     * down — shaped like the text block rather than a band across the frame,
     * so the field can sit behind and around the words instead of under them.
     * `clear="cx,cy,rx,ry"`, all shares of the frame.
     */
    clearing(ctx, w, h) {
      const spec = this.getAttribute("clear");
      if (!spec) return;
      const p = spec.split(",").map(parseFloat);
      if (p.length < 4 || p.some(isNaN)) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.translate(w * p[0], h * p[1]);
      ctx.scale(w * p[2], h * p[3]);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, "rgba(0,0,0,0.96)");
      g.addColorStop(0.55, "rgba(0,0,0,0.82)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }
  }

  if (!customElements.get("stipple-field")) customElements.define("stipple-field", StippleField);
})();
