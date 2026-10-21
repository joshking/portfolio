"use client";

import { useState } from "react";
import type { Analyst } from "@/lib/sim/types";

// Never show the browser's broken-image glyph: a failed avatarUrl swaps to a
// neutral silhouette; analysts WITHOUT an avatarUrl keep the initials circle.
export function Avatar({
  analyst,
  size = 28,
  ring = false,
}: {
  analyst: Analyst;
  size?: number;
  ring?: boolean;
}) {
  // Track WHICH url failed so a later, different url gets a fresh chance.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const boxShadow = ring ? "0 0 0 2px var(--chart-surface)" : undefined;

  if (analyst.avatarUrl && analyst.avatarUrl !== failedUrl) {
    return (
      // Real X profile picture (TwitterAPI.io `author.profilePicture`).
      // eslint-disable-next-line @next/next/no-img-element -- remote host set is unknown until live wiring; sim data never hits this branch
      <img
        src={analyst.avatarUrl}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedUrl(analyst.avatarUrl ?? null)}
        className="inline-block shrink-0 rounded-full object-cover select-none"
        style={{ width: size, height: size, boxShadow }}
      />
    );
  }

  if (analyst.avatarUrl) {
    // avatarUrl exists but failed to load — neutral user silhouette,
    // theme-neutral mid-grays that read on light and dark surfaces.
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none"
        style={{
          width: size,
          height: size,
          background: "rgba(128, 128, 128, 0.18)",
          boxShadow,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="rgba(128, 128, 128, 0.65)"
        >
          <circle cx="12" cy="9" r="4" />
          <path d="M12 14.5c-4.4 0-7 2.4-7 5.5v4h14v-4c0-3.1-2.6-5.5-7-5.5z" />
        </svg>
      </span>
    );
  }

  const initials = analyst.name
    .split(" ")
    .map((p) => p[0])
    .filter((c) => /[A-Z]/i.test(c ?? ""))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.36),
        background: `oklch(0.52 0.11 ${analyst.hue})`,
        boxShadow,
      }}
    >
      {initials}
    </span>
  );
}
