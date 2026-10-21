"use client";

import { useSim } from "@/lib/sim/store";
import styles from "./primetime.module.css";

// Live ↔ mock-replay switcher for full UI/UX testing. Writes the same
// localStorage override the resolver already honors (nf-source) and does a
// clean reload — swapping engines in place would fight SSR priming and the
// ref-counted resolver for no real benefit on a dev control.
const OPTIONS = [
  { id: "live", label: "LIVE", title: "Real node feed via the bridge" },
  {
    id: "sim",
    label: "REPLAY",
    title: "Simulated mock replay — every figure labeled SIMULATED",
  },
] as const;

export function SourceSwitch({ onPaper = false }: { onPaper?: boolean }) {
  const mode = useSim().mode; // "live" | "sim"

  const pick = (id: "live" | "sim") => {
    if (id === mode) return;
    let stored = false;
    try {
      window.localStorage.setItem("nf-source", id);
      stored = true;
    } catch {
      // storage blocked — the query param below still applies once
    }
    const url = new URL(window.location.href);
    if (stored) {
      // Strip any ?source= so the stored choice wins on later loads.
      url.searchParams.delete("source");
    } else {
      url.searchParams.set("source", id);
    }
    window.location.assign(url.toString());
  };

  return (
    <div
      className={`${styles.segmented} ${onPaper ? styles.segmentedOnPaper : ""}`}
      role="group"
      aria-label="Data source"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-pressed={mode === o.id}
          className={`${styles.segBtn} ${mode === o.id ? styles.segBtnActive : ""}`}
          onClick={() => pick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
