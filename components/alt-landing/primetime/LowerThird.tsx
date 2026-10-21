"use client";

import type { Analyst, SignalEvent, Verdict } from "@/lib/sim/types";
import { fmtPct, fmtSignedPp } from "@/lib/format";
import { EmbeddedPost, ViewOnX } from "@/components/EmbeddedPost";
import { CompactPost } from "@/components/CompactPost";
import { usePostStyle } from "./PostStyleSwitch";
import { usePtTheme } from "./ThemeSwitch";
import styles from "./primetime.module.css";

function accentColor(event: SignalEvent): string {
  const v = event.verdict;
  if (event.stage !== "classified" || !v) return "var(--pt-gold)";
  if (v.kind === "used")
    return v.action === "BUY" ? "var(--pt-green)" : "var(--pt-red)";
  if (v.kind === "review") return "var(--pt-gold)";
  return "var(--pt-line)";
}

/**
 * One row of the wire: the X post itself and nothing else.
 *
 * The analyst strap, timestamp and verdict flag that used to wrap each post
 * are gone deliberately — X's embed already carries the author, avatar,
 * verified mark and timestamp, so re-stating them was duplicate chrome that
 * broke the "native X timeline" read. Adjudication now lives one column
 * right, in THE GATE, which is the three-stage story the hero is telling.
 *
 * The only thing kept is the hairline accent rail, which is how a bubble
 * hover still points back at the posts behind it.
 */
export function LowerThird({
  event,
  analyst,
  related = false,
  delayMs = 0,
}: {
  event: SignalEvent;
  /** Only used by the compact renderer, for the required author avatar. */
  analyst?: Analyst;
  /** True when this row's ticker matches the bubble under the cursor. */
  related?: boolean;
  delayMs?: number;
}) {
  return (
    <li
      className={`${styles.cutIn} ${related ? styles.related : ""} relative border-b border-[var(--pt-line)] bg-[var(--pt-panel)] last:border-b-0`}
      style={{ animationDelay: `${Math.min(delayMs, 640)}ms` }}
    >
      {related && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 z-10 w-[3px]"
          style={{ background: accentColor(event) }}
        />
      )}
      <PostBody event={event} analyst={analyst} />
      {/* The adjudication belongs ON the post: "this specific post moved this
          specific weight" is the claim the page exists to demonstrate, and an
          aggregate elsewhere cannot show it. Our own data — nothing here is
          subject to X's display requirements. */}
      <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
        <VerdictFlag
          verdict={event.stage === "classified" ? event.verdict : null}
        />
      </div>
    </li>
  );
}

/**
 * The post, via X's own embed — the only rendering here that carries post
 * text.
 *
 * We deliberately no longer render our stored copy: display requirements
 * forbid altering post text, and the old line-clamp-2 was exactly that. When
 * there is no embed we show the permalink (and the Post id, which X permits
 * redistributing) instead of substituting our own copy.
 */
function PostBody({
  event,
  analyst,
}: {
  event: SignalEvent;
  analyst?: Analyst;
}) {
  const theme = usePtTheme() === "daylight" ? "light" : "dark";
  const style = usePostStyle();
  if (event.textStatus === "resolving") {
    return (
      <p className="animate-pulse border-b border-[var(--pt-line)] px-3 py-3 font-mono text-[0.78rem] tracking-[0.06em] text-[var(--pt-muted)]">
        RESOLVING POST&hellip;
      </p>
    );
  }
  if (!event.sourceUrl) {
    // REPLAY: simulated copy, not X content — the display requirements do not
    // reach it, so our own text is what there is to show.
    // REPLAY renders the very same component as live — no separate chrome.
    if (event.text && analyst) {
      return (
        <CompactPost
          url=""
          theme={theme}
          width={320}
          ts={event.ts}
          fallback={null}
          simulated={{ analyst, text: event.text }}
        />
      );
    }
    const ids = event.tweetIds ?? [];
    return (
      <p className="px-3 py-3 font-mono text-[0.78rem] tracking-[0.06em] text-[var(--pt-muted)]">
        POST {ids.length > 0 ? ids.join(", ") : "UNAVAILABLE"}
      </p>
    );
  }
  const fallback = (
    <ViewOnX
      url={event.sourceUrl}
      className="border-b border-[var(--pt-line)] px-3 py-3 text-[var(--pt-muted)] hover:text-[var(--pt-accent)]"
    />
  );
  if (style === "compact") {
    return (
      <CompactPost
        url={event.sourceUrl}
        theme={theme}
        width={320}
        handle={analyst?.handle}
        ts={event.ts}
        fallback={fallback}
      />
    );
  }
  return (
    <EmbeddedPost
      url={event.sourceUrl}
      theme={theme}
      width={320}
      fallback={fallback}
    />
  );
}

/** Skewed on-air flag — the classification verdict as a broadcast strap. */
function VerdictFlag({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <span className="inline-flex -skew-x-6 items-center gap-1.5 border border-[var(--pt-gold)] px-2 py-0.5">
        <span className="inline-flex skew-x-6 items-center gap-1.5 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--pt-gold)]">
          <span
            aria-hidden
            className={`${styles.classifyPulse} inline-block h-1.5 w-1.5 rounded-full bg-[var(--pt-gold)]`}
          />
          <span className={styles.classifyPulse}>ANALYZING&hellip;</span>
        </span>
      </span>
    );
  }
  if (verdict.kind === "used") {
    // No fabricated deltas: legs without weightDelta render direction from
    // the action and hide the ±pp figure entirely.
    const calls =
      verdict.calls && verdict.calls.length > 0
        ? verdict.calls
        : verdict.ticker
          ? [
              {
                action: verdict.action ?? ("BUY" as const),
                ticker: verdict.ticker,
                confidence: verdict.confidence ?? 0,
                weightDelta: verdict.weightDelta ?? null,
                rationale: undefined as string | undefined,
              },
            ]
          : [];
    if (calls.length === 0) {
      // Live: a real USED verdict whose signals had no mappable direction.
      return (
        <span className="inline-block -skew-x-6 bg-[var(--pt-green)] px-2 py-0.5">
          <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--pt-on-accent)]">
            USED
          </span>
        </span>
      );
    }
    return (
      <>
        {calls.map((call, i) => {
          const bullish = call.action === "BUY";
          return (
            <span
              key={call.ticker}
              className="inline-flex items-center gap-2"
              title={call.rationale}
            >
              <span
                className="inline-block -skew-x-6 px-2 py-0.5"
                style={{
                  background: bullish ? "var(--pt-green)" : "var(--pt-red)",
                }}
              >
                <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--pt-on-accent)]">
                  {i === 0 ? <>USED &middot; </> : null}
                  {call.action} {call.ticker}
                </span>
              </span>
              <span className="font-mono text-[0.7rem] tracking-[0.06em] text-[var(--pt-muted)] tabular-nums">
                CONF {fmtPct(call.confidence, 0)}
              </span>
              {call.weightDelta != null && (
                <span
                  className="font-mono text-[0.7rem] font-bold tracking-[0.06em] tabular-nums"
                  style={{
                    color: bullish ? "var(--pt-green)" : "var(--pt-red)",
                  }}
                >
                  {fmtSignedPp(call.weightDelta)}
                </span>
              )}
            </span>
          );
        })}
      </>
    );
  }
  if (verdict.kind === "review") {
    // Live only: the classifier's TERMINAL "can't commit to a direction"
    // verdict (node status=review) — neither used nor rejected, and nothing
    // upgrades it later. Labeled as an outcome, not a pending state ("IN
    // REVIEW" read as a stuck loader — twice).
    return (
      <span className="inline-block -skew-x-6 border border-[var(--pt-gold)] px-2 py-0.5">
        <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--pt-gold)]">
          AMBIGUOUS
        </span>
      </span>
    );
  }
  if (verdict.kind === "no_call") {
    return (
      <span className="inline-block -skew-x-6 border border-[var(--pt-line)] px-2 py-0.5">
        <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--pt-muted)]">
          NO CALL
        </span>
      </span>
    );
  }
  return (
    <>
      <span className="inline-block -skew-x-6 border border-[var(--pt-line)] px-2 py-0.5">
        <span className="inline-block skew-x-6 font-mono text-[0.7rem] font-bold tracking-[0.08em] text-[var(--pt-muted)] line-through decoration-1">
          DISCARDED
        </span>
      </span>
      {verdict.reason && (
        <span className="font-mono text-[0.68rem] text-[var(--pt-muted)]">
          {verdict.reason.toUpperCase()}
        </span>
      )}
    </>
  );
}
