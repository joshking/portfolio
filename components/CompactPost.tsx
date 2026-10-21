"use client";

import { useEffect, useState } from "react";
import { fetchOEmbed, oembedKey, cachedOEmbed } from "@/lib/oembed";
import type { OEmbedPayload } from "@/lib/oembed";
import { fetchAuthor, cachedAuthor } from "@/lib/author";
import { TimeAgo } from "@/components/briefing/TimeAgo";
import type { Author } from "@/lib/author";
import type { Analyst } from "@/lib/sim/types";
import { Avatar } from "@/components/briefing/Avatar";
import { fmtDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Compact post — X's text, our chrome. THIS IS CUSTOM UI.
//
// X permits rendering posts yourself (docs.x.com/developer-terms/display-
// requirements) but only with the full attribution set, which we therefore owe
// in full. Post actions are the single optional element — the rule reads
// "post action icons OR a 'View on X' link" — so the action row, Follow button
// and "Read more on X" are dropped and the link supplied instead. That is a
// ~4x height saving over the native widget.
//
// Everything else is mandatory and present here:
//   • author profile picture, display name and @handle, linked to the profile
//   • the post text UNMODIFIED — X's own markup, entity links intact, never
//     truncated (a line-clamp here would be a violation)
//   • timestamp linked to the post permalink
//   • an explicit "VIEW ON X" affordance
//
// The X logo is NOT per-row: the requirement permits it "upper-right corner OR
// attached to timeline", so a single mark on the wire header covers the whole
// feed and keeps each row clean. See XTimelineMark in PrimeTimeStudio.
//
// Deletions fail closed: oEmbed 404s for removed/protected posts and the
// caller falls back to a bare permalink.
// ---------------------------------------------------------------------------

const X_BLUE = "#1d9bf0";

/** X's verified mark. Rendered only when the provider says so — never assumed. */
function VerifiedMark() {
  return (
    <svg
      viewBox="0 0 22 22"
      width="16"
      height="16"
      aria-label="Verified account"
      role="img"
      className="shrink-0"
    >
      <path
        fill={X_BLUE}
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  );
}

/**
 * The compact chrome: avatar / name + @handle / time, body, footer. Internal —
 * CompactPost is the one component both live and REPLAY render.
 */
function CompactPostFrame({
  avatar,
  name,
  handle,
  profileHref,
  verified = false,
  ts,
  footer,
  children,
}: {
  avatar: React.ReactNode;
  name: string;
  handle?: string;
  /** Absent in replay — identity renders as plain text, not a link. */
  profileHref?: string;
  verified?: boolean;
  ts?: number;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const linkOrSpan = (className: string, content: React.ReactNode) =>
    profileHref ? (
      <a
        href={profileHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} hover:underline`}
      >
        {content}
      </a>
    ) : (
      <span className={className}>{content}</span>
    );

  return (
    <article className="x-compact px-3 pt-2 pb-1">
      <div className="flex items-start gap-2.5">
        {profileHref ? (
          <a
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
            tabIndex={-1}
            aria-hidden
          >
            {avatar}
          </a>
        ) : (
          <span className="shrink-0" aria-hidden>
            {avatar}
          </span>
        )}

        {/* X's stacked identity: display name over @handle. */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1">
            {linkOrSpan(
              "min-w-0 truncate text-[0.9375rem] leading-tight font-bold text-[var(--pt-text)]",
              name,
            )}
            {verified && <VerifiedMark />}
          </div>
          <span className="mt-0.5 flex min-w-0 items-baseline gap-1 text-[0.8125rem] leading-tight text-[var(--pt-muted)]">
            {handle && linkOrSpan("min-w-0 truncate", `@${handle}`)}
            {ts != null && (
              <>
                <span aria-hidden>·</span>
                <span
                  className="shrink-0 tabular-nums"
                  suppressHydrationWarning
                >
                  <TimeAgo ts={ts} />
                </span>
              </>
            )}
          </span>
        </div>
      </div>

      {children}

      <div className="mt-1.5 font-mono text-[0.65rem] tracking-[0.06em] text-[var(--pt-muted)]">
        {footer}
      </div>
    </article>
  );
}

/** Simulated copy is ours, not X's, so it is plain text — escape it, then
 *  colour cashtags and mentions the way X's markup would so REPLAY rows read
 *  exactly like live ones. */
function simulatedHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/(\$[A-Za-z]{1,6}\b|@\w+)/g, "<a>$1</a>");
}

export function CompactPost({
  url,
  theme,
  width = 320,
  handle,
  ts,
  fallback,
  simulated,
}: {
  /** Live: the x.com permalink. Empty in REPLAY. */
  url: string;
  theme: "dark" | "light";
  width?: number;
  /** Analyst handle, used to resolve the required avatar + verified mark. */
  handle?: string;
  /** Arrival time — the ticking "· 2m" liveness cue, as X's own timeline shows. */
  ts?: number;
  fallback: React.ReactNode;
  /** REPLAY: the sim analyst and simulated copy. Renders the same chrome with
   *  no network and no links — the identities are fictional. */
  simulated?: { analyst: Analyst; text: string };
}) {
  const isSimulated = simulated !== undefined;
  const key = oembedKey(url, theme, width);
  const [state, setState] = useState<{
    key: string;
    data: OEmbedPayload | null;
    failed: boolean;
  }>(() => ({ key, data: cachedOEmbed(key), failed: false }));
  const current =
    state.key === key ? state : { key, data: cachedOEmbed(key), failed: false };

  useEffect(() => {
    if (isSimulated) return;
    let active = true;
    fetchOEmbed(url, theme, width).then((data) => {
      if (!active) return;
      setState({
        key: oembedKey(url, theme, width),
        data,
        failed: data === null,
      });
    });
    return () => {
      active = false;
    };
  }, [url, theme, width, isSimulated]);

  // Author identity resolves separately so a slow profile lookup never holds
  // up the post text.
  const [author, setAuthor] = useState<{
    handle: string;
    value: Author | null;
  }>(() => ({
    handle: handle ?? "",
    value: handle ? cachedAuthor(handle) : null,
  }));
  const liveAuthor =
    author.handle === (handle ?? "")
      ? author.value
      : handle
        ? cachedAuthor(handle)
        : null;

  useEffect(() => {
    if (!handle || isSimulated) return;
    let active = true;
    fetchAuthor(handle).then((value) => {
      if (!active) return;
      setAuthor({ handle, value });
    });
    return () => {
      active = false;
    };
  }, [handle, isSimulated]);

  if (simulated) {
    const { analyst, text } = simulated;
    return (
      <CompactPostFrame
        avatar={<Avatar analyst={analyst} size={36} />}
        name={analyst.name}
        handle={analyst.handle}
        ts={ts}
        footer={
          <span className="inline-block">
            {ts != null ? `${fmtDate(ts)} · VIEW ON X` : "VIEW ON X"}
          </span>
        }
      >
        <div
          className="x-compact-text mt-1.5 text-[0.9375rem] leading-[1.3] text-[var(--pt-body)]"
          style={{ ["--x-link" as string]: X_BLUE }}
          dangerouslySetInnerHTML={{ __html: simulatedHtml(text) }}
        />
      </CompactPostFrame>
    );
  }

  const data = current.data;
  // Text is the whole point — without it there is nothing compliant to show.
  if (current.failed || data === null || data.text_html === null) {
    return <>{fallback}</>;
  }

  const profile = data.author_url ?? url;
  const permalink = data.permalink ?? url;
  const at = liveAuthor?.handle ?? data.author_url?.split("/").pop() ?? handle;
  const name = data.author_name ?? liveAuthor?.name ?? at ?? "—";

  return (
    <CompactPostFrame
      avatar={
        liveAuthor?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pbs.twimg.com is not in the image host allowlist
          <img
            src={liveAuthor.avatarUrl}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="inline-block h-9 w-9 rounded-full bg-[var(--pt-line)]" />
        )
      }
      name={name}
      handle={at}
      profileHref={profile}
      verified={liveAuthor?.verified ?? false}
      ts={ts}
      footer={
        // Permalink-linked timestamp AND the explicit view affordance, so
        // neither requirement leans on the X mark to do double duty.
        <a
          href={permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block hover:underline"
        >
          {data.date_text ? `${data.date_text} · VIEW ON X` : "VIEW ON X"}
        </a>
      }
    >
      {/* X's own markup, verbatim: entity links intact, nothing truncated. */}
      <div
        lang={data.lang ?? undefined}
        dir={data.dir === "rtl" ? "rtl" : undefined}
        className="x-compact-text mt-1.5 text-[0.9375rem] leading-[1.3] text-[var(--pt-body)]"
        style={{ ["--x-link" as string]: X_BLUE }}
        dangerouslySetInnerHTML={{ __html: data.text_html }}
      />
    </CompactPostFrame>
  );
}
