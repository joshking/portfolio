"use client";

import type { Analyst } from "@/lib/sim/types";

// Self-contained avatars for the lab orbit ring: a deterministic mix of
// illustrated people (Twitter-avatar-like) and illustrative initials badges.
// Sim analysts carry no real photo — real X profile pictures are the metered
// TwitterAPI.io lookup and only exist on live data — so these stand in and
// stay stable per analyst id. Every avatar is drawn full-bleed inside a round,
// clipped box, so it is always a clean circle.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pick<T>(arr: T[], n: number): T {
  return arr[n % arr.length];
}

const SKIN = ["#f6d5bd", "#eebd9a", "#d29a6e", "#a9714b", "#7d4e2d", "#f2c9a0"];
const HAIR = [
  "#241a12",
  "#4a2f1a",
  "#6f4b2a",
  "#0e0e10",
  "#9a9a9a",
  "#c9962f",
  "#8a3b1e",
];
const FACE_BG = [
  "#cfe0ff",
  "#ffd9df",
  "#d8f2df",
  "#fff0cf",
  "#e7dcff",
  "#d2eef2",
  "#ffe4cc",
];
const SHIRT = [
  "#2f4fd6",
  "#e0620d",
  "#2a9d4a",
  "#c02a63",
  "#6039c9",
  "#0b7f94",
  "#334155",
];

function HumanFace({ seed, size }: { seed: number; size: number }) {
  const skin = pick(SKIN, seed);
  const hair = pick(HAIR, seed >> 3);
  const bg = pick(FACE_BG, seed >> 6);
  const shirt = pick(SHIRT, seed >> 9);
  const style = (seed >> 12) % 4; // 0 short, 1 high, 2/3 longer
  const glasses = (seed >> 15) % 3 === 0;
  const beard = (seed >> 17) % 4 === 0;
  const smile = (seed >> 19) % 2 === 0;
  const faceY = style === 1 ? 44 : 47;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <rect width="100" height="100" fill={bg} />
      <path d="M14 100 Q14 71 50 71 Q86 71 86 100 Z" fill={shirt} />
      <rect x="43" y="58" width="14" height="18" rx="6" fill={skin} />
      {style >= 2 && (
        <rect x="24" y="40" width="52" height="34" rx="15" fill={hair} />
      )}
      <circle cx="50" cy="42" r="25" fill={hair} />
      <circle cx="27" cy="50" r="4" fill={skin} />
      <circle cx="73" cy="50" r="4" fill={skin} />
      <circle cx="50" cy={faceY} r="23" fill={skin} />
      {beard && (
        <path
          d="M28 49 Q50 80 72 49 Q72 67 50 67 Q28 67 28 49 Z"
          fill={hair}
          opacity="0.92"
        />
      )}
      <ellipse cx="41" cy={faceY} rx="2.6" ry="3.3" fill="#26221f" />
      <ellipse cx="59" cy={faceY} rx="2.6" ry="3.3" fill="#26221f" />
      {glasses && (
        <g stroke="#26323f" strokeWidth="1.6" fill="none">
          <circle cx="41" cy={faceY} r="6.2" />
          <circle cx="59" cy={faceY} r="6.2" />
          <path d={`M47.2 ${faceY} h5.6`} />
        </g>
      )}
      {smile ? (
        <path
          d={`M42 ${faceY + 9} Q50 ${faceY + 16} 58 ${faceY + 9}`}
          stroke="#00000055"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M43 ${faceY + 11} h14`}
          stroke="#00000044"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function InitialsBadge({ analyst, size }: { analyst: Analyst; size: number }) {
  const initials = analyst.name
    .split(" ")
    .map((p) => p[0])
    .filter((c) => /[A-Z]/i.test(c ?? ""))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="flex h-full w-full items-center justify-center font-semibold text-white"
      style={{
        fontSize: Math.max(9, size * 0.38),
        background: `oklch(0.55 0.14 ${analyst.hue})`,
      }}
    >
      {initials}
    </span>
  );
}

export function OrbitAvatar({
  analyst,
  size = 28,
}: {
  analyst: Analyst;
  size?: number;
}) {
  const seed = hash(analyst.id);
  const human = seed % 100 < 62; // ~60% people, ~40% illustrative badges
  return (
    <span
      className="block shrink-0 overflow-hidden rounded-full bg-white select-none"
      style={{ width: size, height: size }}
    >
      {human ? (
        <HumanFace seed={seed} size={size} />
      ) : (
        <InitialsBadge analyst={analyst} size={size} />
      )}
    </span>
  );
}
