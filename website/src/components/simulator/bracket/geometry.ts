/**
 * Bracket geometry — Phase E §7 (C.1).
 *
 * Single source of truth for the absolute-positioned tournament tree.
 * Both BracketTree (match cells) and BracketConnectors (SVG lines)
 * import these constants and helpers so the cell positions and the
 * connector endpoints can never drift out of alignment.
 *
 * Layout model:
 *   - 5 columns (R32, R16, QF, SF, F), uniform horizontal pitch.
 *   - Vertical pitch DOUBLES every round (1, 2, 4, 8, 16 R32 slots
 *     per cell), which is the signature converging-tree shape.
 *   - All coordinates are top-left of the stacking origin (0, 0).
 */

export const ROUND_KEYS = ["r32", "r16", "qf", "sf", "f"] as const;
export type RoundKey = (typeof ROUND_KEYS)[number];

export interface RoundDef {
  key: RoundKey;
  label: string;
  count: number;
  level: number; // 0 = R32 ... 4 = F
  /** Absolute index into koAdvancers where this round's winners write. */
  advancersOffset: number;
}

export const ROUNDS: ReadonlyArray<RoundDef> = [
  { key: "r32", label: "Round of 32", count: 16, level: 0, advancersOffset: 0 },
  { key: "r16", label: "Round of 16", count: 8, level: 1, advancersOffset: 16 },
  { key: "qf", label: "Quarterfinals", count: 4, level: 2, advancersOffset: 24 },
  { key: "sf", label: "Semifinals", count: 2, level: 3, advancersOffset: 28 },
  { key: "f", label: "Final", count: 1, level: 4, advancersOffset: 30 },
] as const;

// Desktop pitch — bracket is wide enough to read every team without
// crushing the cells. On screens narrower than `MOBILE_BREAKPOINT_PX`
// the BracketTree drops to MOBILE_COL_WIDTH and the container scrolls
// horizontally (Phase E §7 (C.4)).
export const COL_WIDTH = 180;
export const MOBILE_COL_WIDTH = 140;
export const CELL_WIDTH = 140;
export const MOBILE_CELL_WIDTH = 110;
export const CELL_HEIGHT = 60;
export const ROW_PITCH = 80; // R32 vertical slot height
export const MOBILE_BREAKPOINT_PX = 768;

export const TOTAL_HEIGHT = 16 * ROW_PITCH; // 1280
export const TOTAL_WIDTH = ROUNDS.length * COL_WIDTH;
export const MOBILE_TOTAL_WIDTH = ROUNDS.length * MOBILE_COL_WIDTH;

/**
 * Center y of match `matchIdx` in round `level`.
 *
 * R32 (level 0): match i sits in slot i, centered at i*P + P/2 (P = ROW_PITCH).
 * R16 (level 1): match i is the midpoint of R32 (2i, 2i+1), which works out
 *   to (2i+1) * ROW_PITCH.
 * QF / SF / F follow the same midpoint rule, hence the doubling per level.
 */
export function matchCenterY(level: number, matchIdx: number): number {
  const groupSize = 2 ** level;
  return matchIdx * groupSize * ROW_PITCH + (groupSize * ROW_PITCH) / 2;
}

export function matchTopY(level: number, matchIdx: number): number {
  return matchCenterY(level, matchIdx) - CELL_HEIGHT / 2;
}

export function matchLeftX(level: number, opts?: { mobile?: boolean }): number {
  const cw = opts?.mobile ? MOBILE_COL_WIDTH : COL_WIDTH;
  return level * cw;
}

export function cellWidth(opts?: { mobile?: boolean }): number {
  return opts?.mobile ? MOBILE_CELL_WIDTH : CELL_WIDTH;
}
