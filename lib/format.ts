export function fmtPct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtSigned(v: number, digits = 2, suffix = "%"): string {
  let fixed = v.toFixed(digits);
  // Tiny negatives round to "-0.00" — clamp to the unsigned zero. Real
  // negatives ("-0.01" and beyond) are untouched.
  if (fixed === `-${(0).toFixed(digits)}`) fixed = (0).toFixed(digits);
  const s = v > 0 ? "+" : "";
  return `${s}${fixed}${suffix}`;
}

export function fmtSignedPp(v: number, digits = 2): string {
  const pp = v * 100;
  const s = pp > 0 ? "+" : "";
  return `${s}${pp.toFixed(digits)}pp`;
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function fmtClock(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// Wall-clock in UTC, the fund's trading clock ("16:00").
export function fmtClockUtc(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function fmtDateline(ts: number): string {
  const d = new Date(ts);
  return d
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })
    .toUpperCase();
}

export function agoShort(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export function fmtCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function untilShort(ts: number, now: number): string {
  const s = Math.max(0, Math.round((ts - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
}
