"use client";

import { useNow } from "@/lib/use-now";
import { fmtTime } from "@/lib/format";

// Leaf ticking clock: only this span re-renders on the shared 1s tick.
export function StudioClock() {
  const now = useNow();
  return (
    <span suppressHydrationWarning>{now ? fmtTime(now) : "--:--:--"}</span>
  );
}
