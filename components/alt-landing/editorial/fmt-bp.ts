/** Signed basis-point rendering for a weight delta (0.0012 -> "+12bp"). */
export function fmtBp(weightDelta: number): string {
  const bp = Math.round(weightDelta * 10000);
  return `${bp > 0 ? "+" : ""}${bp}bp`;
}
