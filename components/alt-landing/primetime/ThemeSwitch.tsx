export type PtTheme = "daylight";

/** The studio has one look: Daylight. Kept as a hook so the canvas/embed
 *  callers stay untouched if a theme ever returns. */
export function usePtTheme(): PtTheme {
  return "daylight";
}
