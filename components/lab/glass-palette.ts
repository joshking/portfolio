// The glass views' shared color language: a varied cool palette — navy,
// cobalt, azure, sky, teal, cyan, indigo, violet, orchid, periwinkle — spread
// across dark→light so the basket reads as a mix of hues and values rather
// than one dominant tone. Assigned by a hash of the ticker so it is stable and
// evenly varied regardless of size, and shared by the bubbles, the treemap,
// and the detail card so a ticker wears the same hue everywhere. Labels are
// always white for a consistent read across every fill.
const PALETTE: { bg: [number, number, number]; fg: string }[] = [
  { bg: [0.13, 0.17, 0.4], fg: "#ffffff" }, // dark navy (lightened to read)
  { bg: [0.26, 0.4, 0.88], fg: "#ffffff" }, // cobalt (lightened to read)
  { bg: [0.16, 0.38, 0.86], fg: "#ffffff" }, // azure
  { bg: [0.42, 0.6, 0.95], fg: "#ffffff" }, // sky
  { bg: [0.08, 0.4, 0.44], fg: "#ffffff" }, // teal
  { bg: [0.24, 0.68, 0.72], fg: "#ffffff" }, // cyan
  { bg: [0.46, 0.42, 0.88], fg: "#ffffff" }, // indigo (lightened to read)
  { bg: [0.52, 0.42, 0.86], fg: "#ffffff" }, // violet
  { bg: [0.68, 0.46, 0.72], fg: "#ffffff" }, // orchid
  { bg: [0.65, 0.72, 0.92], fg: "#ffffff" }, // periwinkle
];

export function hashTicker(t: string) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++)
    h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function colorFor(ticker: string) {
  return PALETTE[hashTicker(ticker) % PALETTE.length];
}

export function rgbCss(c: [number, number, number], alpha = 1) {
  const [r, g, b] = c.map((v) => Math.round(Math.min(1, v * 1.25) * 255));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// The two lab worlds the glass views can render in. "cobalt" is the committed
// blue press ground; "paper" is the inverted light comparison (white ground,
// dark label ink, neighbours sinking toward white instead of navy). The
// values feed shader uniforms, so both charts read the same theme.
export type GlassTheme = "cobalt" | "paper" | "deep";

export const GLASS_THEMES: Record<
  GlassTheme,
  {
    ground: [number, number, number];
    sunk: [number, number, number];
    sunkMul: number;
    labelInk: string | null; // null = use the ticker's own fg (white)
  }
> = {
  cobalt: {
    ground: [0.0, 0.2118, 0.7373], // #0036BC
    sunk: [0.02, 0.09, 0.22],
    sunkMul: 0.5,
    labelInk: null,
  },
  paper: {
    ground: [1.0, 1.0, 1.0],
    sunk: [0.93, 0.94, 0.97],
    sunkMul: 1.0,
    labelInk: "#15181E",
  },
  // The analyst record's hero ground.
  deep: {
    ground: [0.0431, 0.1686, 0.5647], // #0B2B90
    sunk: [0.02, 0.07, 0.2],
    sunkMul: 0.5,
    labelInk: null,
  },
};
