"use client";

import { useMemo, useState } from "react";
import { useSim } from "@/lib/sim/store";
import type { Analyst } from "@/lib/sim/types";
import { PostDeck } from "./PostDeck";

// The deck on its own, fed by the wire: every account's posts, newest first,
// each card carrying its own author. The same All / Calls sort as the analyst
// page. The wire runs to thousands of posts a day and the deck is a card per
// post, so it takes the newest window only.
const DECK_MAX = 120;

export function PostDeckStage() {
  const sim = useSim();
  const [callsOnly, setCallsOnly] = useState(false);

  const history = useMemo(
    () => [...sim.events].sort((a, b) => b.ts - a.ts).slice(0, DECK_MAX),
    [sim.events],
  );
  const calls = useMemo(
    () => history.filter((e) => e.verdict?.kind === "used"),
    [history],
  );
  const visible = callsOnly ? calls : history;

  const byId = useMemo(() => {
    const m = new Map<string, Analyst>();
    for (const a of sim.analysts) m.set(a.id, a);
    return m;
  }, [sim.analysts]);

  if (!sim.booted) {
    return <p className="agate text-ink-muted">Connecting to the wire…</p>;
  }

  return (
    <div className="max-w-[360px]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="title">Latest posts</h1>
        <div
          role="group"
          aria-label="Which posts the deck shows"
          className="border-hairline flex rounded-full border p-0.5"
        >
          {(
            [
              ["All", history.length, false],
              ["Calls", calls.length, true],
            ] as const
          ).map(([label, n, only]) => {
            const on = callsOnly === only;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setCallsOnly(only)}
                aria-pressed={on}
                className={`focus-visible:outline-cobalt flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  on ? "bg-ink" : "text-ink-muted hover:text-ink bg-transparent"
                }`}
                style={on ? { color: "var(--paper)" } : undefined}
              >
                {label}
                <span className="tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      </div>
      {visible.length > 0 ? (
        <PostDeck
          // A new filter is a new deck: start it from the newest post.
          key={callsOnly ? "calls" : "all"}
          events={visible}
          analyst={null}
          analystOf={(ev) => byId.get(ev.analystId) ?? null}
          className="mt-4"
        />
      ) : (
        <p className="text-ink-muted mt-3 py-3">
          {callsOnly
            ? "No calls on the wire yet."
            : "No posts on the wire yet."}
        </p>
      )}
    </div>
  );
}
