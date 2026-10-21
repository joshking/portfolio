"use client";

import Image from "next/image";
import Link from "@/components/motion-link";
import { usePathname } from "next/navigation";
import { useSim } from "@/lib/sim/store";

/** Site sections. `match` is the route prefix that counts as "here" — the
 *  analyst record pages live under /analyst/, not /analysts. */
const SECTIONS = [
  { href: "/fund", label: "The Fund", match: ["/fund"] },
  { href: "/analysts", label: "Analysts", match: ["/analysts", "/analyst"] },
  { href: "/story-1", label: "Story 1", match: ["/story-1"] },
  { href: "/story-2", label: "Story 2", match: ["/story-2"] },
  { href: "/rebalances", label: "Rebalance History", match: ["/rebalances"] },
] as const;

function isHere(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** `actions` renders page-specific chrome (e.g. the studio theme picker) in
 *  the middle slot. The public site uses the defaults. */
export function Masthead({
  actions = null,
}: { actions?: React.ReactNode } = {}) {
  const sim = useSim();
  const pathname = usePathname();

  return (
    <header className="mt-4">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-6 px-5">
        {/* The brand lockup: the mark stands as tall as the stacked
            wordmark + kicker beside it. */}
        <Link
          href="/lab"
          className="flex min-w-0 items-center gap-3 outline-offset-4"
        >
          <Image
            src="/nf-logo.png"
            alt=""
            width={48}
            height={48}
            priority
            className="shrink-0 rounded-full"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-ink truncate text-[1.05rem] leading-none font-extrabold tracking-tight">
              THE NETWORK FUND
            </span>
            <span className="kicker leading-none">A RESERVE DTF</span>
          </span>
        </Link>

        {actions && (
          <div className="hidden items-center md:flex">{actions}</div>
        )}

        <nav className="flex items-center gap-6">
          {SECTIONS.map(({ href, label, match }) => {
            const here = isHere(pathname, match);
            return (
              <Link
                key={href}
                href={href}
                aria-current={here ? "page" : undefined}
                className={`hidden text-[1rem] font-medium underline-offset-[6px] transition-colors duration-150 ease-out sm:inline ${
                  here
                    ? "text-ink underline decoration-[1.5px]"
                    : "text-ink-secondary hover:text-ink hover:underline"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <span className="sr-only" aria-live="polite" suppressHydrationWarning>
        {sim.booted
          ? `Live feed running. ${sim.stats.total24h}${sim.stats.saturated && !sim.stats.authoritative ? " or more" : ""} posts handled in the last 24 hours.`
          : ""}
      </span>
    </header>
  );
}
