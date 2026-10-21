"use client";

import { cachedAuthor } from "@/lib/author";
import styles from "./primetime.module.css";

// X's "N new posts" affordance: while the reader is scrolled, arrivals are
// held back rather than shoved into view. This pill says how many are waiting,
// shows who they are from, and returns the reader to the top in one gesture.

export function NewPostsPill({
  count,
  handles,
  onClick,
}: {
  count: number;
  /** Handles of the waiting posts, newest first — up to three are shown. */
  handles: string[];
  onClick: () => void;
}) {
  if (count <= 0) return null;
  const faces = handles
    .map((handle) => cachedAuthor(handle))
    .filter((author): author is NonNullable<typeof author> => author !== null)
    .filter((author) => author.avatarUrl)
    .slice(0, 3);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={`${count} new ${count === 1 ? "post" : "posts"} — scroll to top`}
        className={`${styles.newPostsPill} pointer-events-auto inline-flex items-center gap-2 border border-[var(--pt-accent)] bg-[var(--pt-panel)] px-2.5 py-1.5`}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
          <path
            fill="currentColor"
            d="M8 2.5 13.5 8l-1.06 1.06L8.75 5.37V13.5h-1.5V5.37L3.56 9.06 2.5 8z"
          />
        </svg>
        {faces.length > 0 && (
          <span className="flex items-center">
            {faces.map((author, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- pbs.twimg.com is not in the image host allowlist
              <img
                key={author.handle}
                src={author.avatarUrl as string}
                alt=""
                aria-hidden
                width={18}
                height={18}
                className="h-[18px] w-[18px] rounded-full object-cover"
                style={{
                  marginLeft: i === 0 ? 0 : -6,
                  boxShadow: "0 0 0 1.5px var(--pt-panel)",
                }}
              />
            ))}
          </span>
        )}
        <span className="font-mono text-[0.68rem] font-bold tracking-[0.08em] text-[var(--pt-accent)] tabular-nums">
          {count} NEW
        </span>
      </button>
    </div>
  );
}
