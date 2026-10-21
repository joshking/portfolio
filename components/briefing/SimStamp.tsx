export function SimStamp({ onInk = false }: { onInk?: boolean }) {
  return (
    <span
      className="agate inline-block border px-1.5 py-0.5 text-[0.6875rem] whitespace-nowrap"
      style={{
        color: onInk ? "var(--muted-on-ink)" : "var(--ink-muted)",
        borderColor: onInk ? "rgba(245,245,242,0.25)" : "var(--hairline)",
      }}
    >
      SIMULATED PREVIEW
    </span>
  );
}
