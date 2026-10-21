"use client";

import { useSyncExternalStore } from "react";
import { dataSource } from "@/lib/data-source";
import type { SimState } from "./types";

// The swap surface: components keep calling useSim() regardless of whether
// the resolver picked the sim engine or the live bridge. First subscriber
// starts the engine, last unsubscriber stops it (see lib/data-source.ts).
export function useSim(): SimState {
  return useSyncExternalStore(
    dataSource.subscribe,
    dataSource.getState,
    dataSource.getServerSnapshot,
  );
}

export function useAnalyst(handle: string) {
  const sim = useSim();
  return sim.analysts.find((a) => a.handle === handle) ?? null;
}

export function useAsset(ticker: string) {
  const sim = useSim();
  return sim.assets.find((a) => a.ticker === ticker.toUpperCase()) ?? null;
}
