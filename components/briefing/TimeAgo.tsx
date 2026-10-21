"use client";

import { useNow } from "@/lib/use-now";
import { agoShort, untilShort } from "@/lib/format";

// Ticking text lives in leaf components so the 1s clock re-renders a few
// spans, not the whole wire (400 cards) and treemap above them.

export function TimeAgo({ ts }: { ts: number }) {
  const now = useNow();
  return <>{now ? agoShort(ts, now) : ""}</>;
}

export function UntilShort({
  ts,
  prefix = "",
}: {
  ts: number;
  prefix?: string;
}) {
  const now = useNow();
  return <>{now ? `${prefix}${untilShort(ts, now)}` : ""}</>;
}
