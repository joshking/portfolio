import type { Asset } from "@/lib/sim/types";

// Instrument geometry — one coordinate system for arcs, labels and glyphs.
// Angular positions are expressed in "pathLength units" (0..100 around the
// ring, 0 at 12 o'clock, clockwise) so SVG stroke-dasharray transitions do
// the arc morphing for free; trig only converts units -> screen points.

export const CX = 320;
export const CY = 320;
export const RING_R = 208; // holding arcs
export const SECTOR_R = 252; // thin sector band
export const RIM_R = 300; // aperture where glyphs spawn
export const CORE_R = 132; // inner hairline around the numeric core

const ASSET_GAP = 0.35; // gap between holdings, in pathLength units
const SECTOR_GAP = 1.05; // extra gap at sector boundaries

export interface ArcSlot {
  ticker: string;
  start: number;
  len: number;
  mid: number;
  sectorIndex: number;
}

export interface SectorSlot {
  sector: string;
  start: number;
  len: number;
  mid: number;
  share: number; // 0..1 of total target weight
}

export interface RingLayout {
  arcs: ArcSlot[];
  sectors: SectorSlot[];
}

/** Sector groups keep first-appearance order so arcs never swap places. */
export function buildLayout(assets: Asset[]): RingLayout {
  const sectorOrder: string[] = [];
  const grouped = new Map<string, Asset[]>();
  for (const asset of assets) {
    if (!grouped.has(asset.sector)) {
      grouped.set(asset.sector, []);
      sectorOrder.push(asset.sector);
    }
    grouped.get(asset.sector)!.push(asset);
  }

  const total = assets.reduce((sum, a) => sum + a.targetWeight, 0) || 1;
  const usable =
    100 - assets.length * ASSET_GAP - sectorOrder.length * SECTOR_GAP;

  const arcs: ArcSlot[] = [];
  const sectors: SectorSlot[] = [];
  let cursor = 0;

  sectorOrder.forEach((sector, sectorIndex) => {
    cursor += SECTOR_GAP / 2;
    const sectorStart = cursor;
    let share = 0;
    for (const asset of grouped.get(sector)!) {
      cursor += ASSET_GAP / 2;
      const len = (asset.targetWeight / total) * usable;
      arcs.push({
        ticker: asset.ticker,
        start: cursor,
        len,
        mid: cursor + len / 2,
        sectorIndex,
      });
      cursor += len + ASSET_GAP / 2;
      share += asset.targetWeight / total;
    }
    sectors.push({
      sector,
      start: sectorStart,
      len: cursor - sectorStart,
      mid: (sectorStart + cursor) / 2,
      share,
    });
    cursor += SECTOR_GAP / 2;
  });

  return { arcs, sectors };
}

/** u in pathLength units (0 = 12 o'clock, clockwise) at radius r. */
export function polar(u: number, r: number): { x: number; y: number } {
  const a = (u / 100) * Math.PI * 2;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

export function angleDeg(u: number): number {
  return (u / 100) * 360;
}

/** Horizontal labels: anchor away from the ring by quadrant. */
export function anchorFor(u: number): "start" | "middle" | "end" {
  const a = angleDeg(u);
  if (a < 14 || a > 346 || (a > 166 && a < 194)) return "middle";
  return a < 180 ? "start" : "end";
}
