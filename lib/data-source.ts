"use client";

import { simEngine } from "./sim/engine";
import { LiveEngine } from "./live/engine";
import type { SimState } from "./sim/types";

// ---------------------------------------------------------------------------
// Ref-counted store multiplexer (DESIGN.md §7). Owns exactly one engine at a
// time; `useSim()` subscribes through it. First subscriber starts the engine,
// last unsubscriber stops it (timers, EventSource, AbortControllers all die).
//
// Hydration: getServerSnapshot returns the static empty sim state for BOTH
// modes; source resolution (env default + ?source= + localStorage nf-source)
// happens post-hydration inside the subscribe path. A monotonically
// increasing generation guards async engine boots — stale results (aborted
// boots, late fallbacks) are discarded on publish.
//
// Boot failure in live mode falls back to sim ONCE, recording
// fallbackReason (labeling shows it). Mid-session stream loss never falls
// back — LiveEngine surfaces live.status "stalled" and retries.
// ---------------------------------------------------------------------------

type Source = "sim" | "live";

interface EngineLike {
  subscribe: (fn: () => void) => () => void;
  getState: () => SimState;
  start: () => void;
  stop: () => void;
}

const SOURCE_STORAGE_KEY = "nf-source";

// Captured before any engine starts: the stable pre-boot sim state used as
// the server/hydration snapshot for both modes.
const serverSnapshot = simEngine.getState();

// SSR priming: the server fetched live state and rendered it into the HTML;
// the client must produce the identical first render, then the engine boots
// on top. Set exactly once, before useSim() first executes.
let primedState: SimState | null = null;

// True once-guard for client priming. Guarding on `primedState !== null`
// was a bug: startEngine("sim")/fallbackToSim NULL the primed state, and the
// next render's primeInitial call re-primed the dead live snapshot — which
// getState then served over the sim engine forever.
let clientPrimed = false;

export function primeInitial(state: SimState | null) {
  if (typeof window === "undefined") {
    // Server: the module persists ACROSS requests — always take the fresh
    // per-request state or every later render serves the first one forever.
    primedState = state;
    return;
  }
  // Client: prime exactly once, before the engine takes over.
  if (clientPrimed) return;
  clientPrimed = true;
  // The explicit sim escape renders sim — priming would fight it (one
  // hydration warning in that dev-only path is the accepted cost).
  const qp = new URLSearchParams(window.location.search).get("source");
  if (qp === "sim") return;
  primedState = state;
}

// Live data is an /alt-landing feature. The public (site) pages are the
// designer's sim-only surfaces: their components render analyst metrics that
// are null in live mode, so a leaked "live" would paint fabricated zeros.
const LIVE_PATH_PREFIX = "/alt-landing";

function resolveSource(): Source {
  if (typeof window === "undefined") return "sim";
  if (!window.location.pathname.startsWith(LIVE_PATH_PREFIX)) return "sim";
  try {
    // Session-only override — a shared dev link must not pin the source
    // forever; persistence would follow the user across sessions.
    const qp = new URLSearchParams(window.location.search).get("source");
    if (qp === "live" || qp === "sim") {
      return qp;
    }
    const stored = localStorage.getItem(SOURCE_STORAGE_KEY);
    if (stored === "live" || stored === "sim") return stored;
  } catch {
    // storage unavailable (privacy mode) — fall through to the env default
  }
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "live" ? "live" : "sim";
}

class DataSource {
  private listeners = new Set<() => void>();
  private refCount = 0;
  private generation = 0;
  private engine: EngineLike = simEngine;
  private engineUnsub: (() => void) | null = null;
  private fallbackReason: string | null = null;
  private overlayCache: { base: SimState; out: SimState } | null = null;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    this.refCount++;
    if (this.refCount === 1) this.activate();
    let released = false;
    return () => {
      if (released) return; // React may retry unsubscribes; count each once
      released = true;
      this.listeners.delete(fn);
      this.refCount--;
      if (this.refCount === 0) this.deactivate();
    };
  };

  getState = (): SimState => {
    // Pre-activation reads (hydration render) must match the primed SSR HTML.
    if (primedState !== null && this.engine === simEngine) {
      return primedState;
    }
    const base = this.engine.getState();
    if (this.fallbackReason === null) return base;
    if (this.overlayCache?.base === base) return this.overlayCache.out;
    const out = { ...base, fallbackReason: this.fallbackReason };
    this.overlayCache = { base, out };
    return out;
  };

  getServerSnapshot = (): SimState => primedState ?? serverSnapshot;

  /** Mid-session toggle: stop old engine, bump generation, start new. */

  private activate() {
    this.startEngine(resolveSource());
  }

  private deactivate() {
    this.generation++;
    this.engineUnsub?.();
    this.engineUnsub = null;
    this.engine.stop();
  }

  private startEngine(source: Source) {
    this.generation++;
    const generation = this.generation;
    this.engineUnsub?.();
    this.engine.stop();
    this.fallbackReason = null;
    this.overlayCache = null;
    // Same stale-overlay hazard as fallbackToSim: with the sim engine
    // active (e.g. localStorage nf-source=sim), a primed live snapshot
    // would shadow sim state in getState forever.
    if (source === "sim") primedState = null;

    this.engine =
      source === "live"
        ? new LiveEngine({
            initial: primedState ?? undefined,
            onFatal: (reason) => {
              // Boot-time fallback to sim, once, labeled — never silent.
              if (generation !== this.generation) return; // stale boot
              this.fallbackToSim(reason);
            },
          })
        : simEngine;

    this.engineUnsub = this.engine.subscribe(this.notify);
    this.engine.start();
    this.notify();
  }

  private fallbackToSim(reason: string) {
    this.generation++;
    this.engineUnsub?.();
    this.engine.stop();
    // The primed SSR overlay belongs to the dead live engine — getState
    // would keep serving that frozen live snapshot over the sim engine's
    // state forever (a stale screen with no label). Clear it so the page
    // actually shows the sim state the fallback promises.
    primedState = null;
    this.engine = simEngine;
    this.fallbackReason = reason;
    this.overlayCache = null;
    this.engineUnsub = this.engine.subscribe(this.notify);
    this.engine.start();
    this.notify();
  }

  private notify = () => {
    this.listeners.forEach((fn) => fn());
  };
}

export const dataSource = new DataSource();
