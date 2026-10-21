"use client";

import type { Analyst, SignalEvent, Verdict } from "@/lib/sim/types";
import { Avatar } from "@/components/briefing/Avatar";
import { fmtClock, fmtDate, fmtSignedPp } from "@/lib/format";
import styles from "./time-machine.module.css";

// The post card as it appears on the front page's processing line: X's
// register — avatar, then name and seal over the handle (X's two-line head,
// which holds at any card width), the View pill — the post, a hairline, and
// the classification at the foot. Shared by the Time Machine (which wraps
// it in the depth-stacked article) and the analyst page (which stacks the
// account's recent posts).

export type ProcStage = "processing" | "received" | "weighing" | "result";

export const CARD = {
  ink: "#0f1419",
  muted: "#71767b",
  hairline: "#eff3f4",
  pillBorder: "#cfd9de",
  verified: "#1d9bf0",
  buy: "#16a34a",
  sell: "#dc2626",
};

export function PostCardBody({
  ev,
  analyst,
  stage,
  clamp = true,
  showDelta = false,
}: {
  ev: SignalEvent;
  analyst: Analyst | null;
  stage: ProcStage;
  /** Front page clamps to three lines to hold the card height; the analyst page shows the whole post. */
  clamp?: boolean;
  /** Show how far the call moved the basket, beside the call. */
  showDelta?: boolean;
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        {analyst && <Avatar analyst={analyst} size={38} />}
        {analyst && (
          <div className="flex min-w-0 flex-col leading-[1.25]">
            <span className="flex min-w-0 items-center gap-1">
              <span
                className="truncate text-[0.84rem] font-bold"
                style={{ color: CARD.ink }}
              >
                {analyst.name}
              </span>
              <VerifiedSeal />
            </span>
            <span
              className="truncate text-[0.77rem]"
              style={{ color: CARD.muted }}
            >
              @{analyst.handle}
            </span>
          </div>
        )}
        <ViewPill url={ev.sourceUrl} />
      </div>

      <p
        className={`mt-3.5 mb-3.5 text-[1.02rem] leading-snug ${clamp ? "line-clamp-3" : ""}`}
        style={{ color: CARD.ink }}
      >
        <PostText text={ev.text} />
      </p>

      <div
        className="mt-auto border-t"
        style={{ borderColor: CARD.hairline }}
      />
      <div className="mt-3.5 flex min-h-6 items-center justify-between gap-3">
        <time
          dateTime={new Date(ev.ts).toISOString()}
          className="shrink-0 text-[0.77rem] tabular-nums"
          style={{ color: CARD.muted }}
        >
          {fmtClock(ev.ts)} · {fmtDate(ev.ts)}
        </time>
        <VerdictRow verdict={ev.verdict} stage={stage} showDelta={showDelta} />
      </div>
    </>
  );
}

// $TICKER mentions render bold, like the reference card's $SPCX.
function PostText({ text }: { text: string }) {
  const parts = text.split(/(\$[A-Za-z]{1,6})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\$[A-Za-z]{1,6}$/.test(p) ? (
          <strong key={i} className="font-bold">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

// X's verified seal, drawn to X's silhouette.
export function VerifiedSeal() {
  return (
    <svg
      viewBox="0 0 22 22"
      width="14"
      height="14"
      aria-hidden
      className="shrink-0"
      fill={CARD.verified}
    >
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

// "View on X" pill. Live posts carry a permalink; sim posts are invented, so
// the pill stays inert rather than pointing an invented handle at a real
// x.com account.
function ViewPill({ url }: { url?: string }) {
  const inner = (
    <>
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        aria-hidden
        fill="currentColor"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      View
    </>
  );
  const cls =
    "ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[0.72rem] font-medium";
  const style = { borderColor: CARD.pillBorder, color: CARD.muted };
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`${cls} transition-colors hover:border-[#71767b]`}
        style={style}
      >
        {inner}
      </a>
    );
  }
  return (
    <span className={cls} style={style}>
      {inner}
    </span>
  );
}

// The classification lands at the card's foot: a check and the call, in the
// reference's register.
function VerdictRow({
  verdict,
  stage,
  showDelta = false,
}: {
  verdict: Verdict | null;
  stage: ProcStage;
  showDelta?: boolean;
}) {
  // Before the verdict is revealed, the card shows what the pipeline is doing:
  // Processing, then Signal received, then — only when the tweet made a call —
  // Weighing analyst score.
  if (stage !== "result" || !verdict) {
    const label =
      stage === "weighing"
        ? "Weighing analyst score"
        : stage === "received"
          ? "Signal received"
          : stage === "processing"
            ? "Processing"
            : "Classifying";
    return (
      <span
        className="inline-flex items-center gap-2 text-[0.94rem] font-medium"
        style={{ color: CARD.muted }}
      >
        <span
          aria-hidden
          className={styles.spin}
          style={{
            width: 13,
            height: 13,
            border: `2px solid ${CARD.pillBorder}`,
            borderTopColor: CARD.muted,
            borderRadius: "50%",
          }}
        />
        {label}
      </span>
    );
  }
  if (verdict.kind === "used") {
    const buyish = verdict.action === "BUY";
    const color = buyish ? CARD.buy : CARD.sell;
    return (
      <span
        data-tm-signal
        className="inline-flex items-center gap-2 text-[1.02rem] font-semibold tracking-wide whitespace-nowrap"
        style={{ color }}
      >
        <CircleCheck color={color} />
        {verdict.action} {verdict.ticker}
        {showDelta && verdict.weightDelta != null && (
          <span
            className="shrink-0 text-[0.77rem] font-medium tracking-normal tabular-nums"
            style={{ color: CARD.muted }}
          >
            {fmtSignedPp(verdict.weightDelta)}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="text-[0.94rem] font-medium" style={{ color: CARD.muted }}>
      No call
    </span>
  );
}

function CircleCheck({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
    </svg>
  );
}
