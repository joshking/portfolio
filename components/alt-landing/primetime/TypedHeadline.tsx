"use client";

import { useEffect, useState } from "react";
import styles from "./primetime.module.css";

// The headline types itself in on first paint, then stands still.
//
// The full string is ALWAYS in the DOM (visually hidden copy below), so the
// SSR markup, SEO and screen readers get the whole line regardless of the
// animation — the typed layer is aria-hidden decoration over the top. Reduced
// motion skips straight to the finished line.

const CHAR_MS = 34;

export function TypedHeadline({ text }: { text: string }) {
  // Reduced motion is read in the initialiser, not set from the effect: the
  // repo lints synchronous setState inside effects (cascading renders).
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reduced) {
      // Async so it lands in its own commit rather than cascading this one.
      const jump = window.setTimeout(() => {
        setShown(text.length);
        setDone(true);
      }, 0);
      return () => window.clearTimeout(jump);
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, CHAR_MS);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <h1 className="text-[clamp(1.6rem,3.6vw,2.9rem)] leading-[1.05] font-black tracking-[-0.022em] whitespace-nowrap">
      {/* Real text for SSR, SEO and assistive tech. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-block">
        {text.slice(0, shown)}
        <span
          className={`${styles.caret} ${done ? styles.caretDone : ""}`}
          aria-hidden
        />
      </span>
    </h1>
  );
}
