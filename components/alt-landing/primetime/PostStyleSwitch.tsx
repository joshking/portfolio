"use client";

import { useSyncExternalStore } from "react";
import styles from "./primetime.module.css";

// Two ways to render a post, switchable live so they can be compared on the
// same feed:
//
//   compact — X's oEmbed text with our own chrome (the DEFAULT). ~3-4x
//             denser; no action row, no Follow button, no "Read more on X".
//             We carry the attribution checklist ourselves (see CompactPost).
//   native  — X's official embed widget. Compliance is X's problem, but the
//             action row / Follow / "Read more on X" live inside a
//             cross-origin iframe and CANNOT be removed, at ~380px per post.
//
// Same tiny-external-store shape as ThemeSwitch: SSR snapshot is fixed, the
// saved value loads on first subscribe, so no hydration mismatch and no
// setState-in-effect.

export type PostStyle = "native" | "compact";

export const POST_STYLE_KEY = "pt-post-style";

const OPTIONS: { id: PostStyle; label: string }[] = [
  { id: "native", label: "NATIVE" },
  { id: "compact", label: "COMPACT" },
];

let current: PostStyle = "compact";
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void) {
  if (!loaded) {
    loaded = true;
    try {
      const saved = localStorage.getItem(POST_STYLE_KEY);
      if (saved === "compact" || saved === "native") {
        current = saved;
        queueMicrotask(emit);
      }
    } catch {
      // private mode — the default stands
    }
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function usePostStyle(): PostStyle {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => "compact" as PostStyle,
  );
}

export function setPostStyle(style: PostStyle) {
  current = style;
  try {
    localStorage.setItem(POST_STYLE_KEY, style);
  } catch {
    // non-fatal
  }
  emit();
}

export function PostStyleSwitch({
  style,
  onPick,
}: {
  style: PostStyle;
  onPick: (style: PostStyle) => void;
}) {
  return (
    <span className={styles.segmented} role="group" aria-label="Post style">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPick(option.id)}
          aria-pressed={style === option.id}
          className={`${styles.segBtn} ${style === option.id ? styles.segBtnActive : ""}`}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}
