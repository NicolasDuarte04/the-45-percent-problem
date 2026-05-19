/**
 * Sequential probability ramp shared across all heat map surfaces.
 *
 * Palette: dark teal (#1C222B = --bg-panel-elev) at zero probability,
 * through muted cyan and coral, to soft plum/lavender (#8E5A8A) at
 * maximum probability. Low values recede into the panel background;
 * high values pop.
 *
 * Two ramp functions are exposed:
 *
 *   goalMatrixRampColor  -- 4-stop ramp for the goal matrix, where the
 *                           input is p / modalMax (already normalised
 *                           by the caller). Preserves the exact output
 *                           previously inlined in GoalMatrixHeatmap.
 *
 *   probabilityToColor   -- 8-stop non-linear ramp for the bracket, where
 *                           the input is an absolute probability [0, 1].
 *                           Extra stops in the 0-30% range give visual
 *                           differentiation across the dense low-probability
 *                           band where most teams live.
 *
 * Used by:
 *   GoalMatrixHeatmap (match detail correct-score matrix)
 *   BracketBoard (per-round marginal probabilities matrix)
 *
 * Palette constants are shared so both ramps speak the same color language.
 */

// ---------------------------------------------------------------------------
// Shared palette constants
// ---------------------------------------------------------------------------

export const RAMP_LOW = "#1C222B"; // --bg-panel-elev; recedes into bg
export const RAMP_MID_CYAN = "#4F8FA8"; // muted cyan
export const RAMP_MID_CORAL = "#C99878"; // muted coral
export const RAMP_HIGH = "#8E5A8A"; // soft plum/lavender; pops

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t) | 0, lerp(a[1], b[1], t) | 0, lerp(a[2], b[2], t) | 0];
}

function interpolateStops(norm: number, stops: number[], colors: RGB[]): RGB {
  for (let i = 0; i < stops.length - 1; i++) {
    if (norm <= stops[i + 1]) {
      const span = stops[i + 1] - stops[i] || 1;
      const t = (norm - stops[i]) / span;
      return lerpRgb(colors[i], colors[i + 1], t);
    }
  }
  return colors[colors.length - 1];
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const toLin = (c: number): number => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

// ---------------------------------------------------------------------------
// Goal matrix ramp (4 stops, normalised input)
// ---------------------------------------------------------------------------

/** Stop positions (as percentages) for the legend gradient CSS string. */
export const RAMP_STOPS_PCT = [0, 25, 60, 100] as const;
/** Hex colors at each stop, aligned with RAMP_STOPS_PCT. */
export const RAMP_COLORS = [RAMP_LOW, RAMP_MID_CYAN, RAMP_MID_CORAL, RAMP_HIGH] as const;

const GM_STOPS = RAMP_STOPS_PCT.map((s) => s / 100);
const GM_COLORS: RGB[] = RAMP_COLORS.map(hexToRgb);

/**
 * Maps a normalised probability (p / modalMax, clamped to [0, 1]) to an
 * rgb() color string using the 4-stop goal matrix ramp.
 *
 * This is a drop-in replacement for the rampRgb + fillForP logic that
 * was previously inlined in GoalMatrixHeatmap.
 */
export function goalMatrixRampColor(norm: number): string {
  const n = Math.max(0, Math.min(1, norm));
  const [r, g, b] = interpolateStops(n, GM_STOPS, GM_COLORS);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Returns the W3C-contrast-aware text color for a goal matrix cell whose
 * normalised value is norm. Quiet grey for near-zero cells; dark slate for
 * bright mid-range cells; light cream elsewhere.
 */
export function goalMatrixTextColor(norm: number): string {
  if (norm <= 0.05) return "#A8AFBC";
  const [r, g, b] = interpolateStops(Math.max(0, Math.min(1, norm)), GM_STOPS, GM_COLORS);
  return relativeLuminance(r, g, b) > 0.22 ? "#0F1216" : "#EEE8DD";
}

// ---------------------------------------------------------------------------
// Bracket ramp (8 stops, absolute probability input)
// ---------------------------------------------------------------------------
//
// Non-linear stop placement: four stops in the 0-30% range (where most
// bracket probabilities live) and four stops in the 30-100% range. This
// gives visual differentiation across the dense low-end band while still
// letting Spain's 78% R16 look clearly lighter than its 42% SF.

const BRK_STOPS = [0.0, 0.05, 0.15, 0.30, 0.45, 0.60, 0.80, 1.0];
const BRK_COLORS: RGB[] = [
  hexToRgb(RAMP_LOW),       // 0.00 -- bg-panel-elev, recedes
  hexToRgb("#263542"),      // 0.05 -- very dark teal, barely lifted
  hexToRgb("#3A6B82"),      // 0.15 -- dark cyan
  hexToRgb(RAMP_MID_CYAN),  // 0.30 -- muted cyan (same hue as GM stop 25%)
  hexToRgb("#8B8898"),      // 0.45 -- cyan-to-coral transition
  hexToRgb(RAMP_MID_CORAL), // 0.60 -- muted coral (same hue as GM stop 60%)
  hexToRgb("#A87AA4"),      // 0.80 -- lavender bridge
  hexToRgb(RAMP_HIGH),      // 1.00 -- soft plum (same hue as GM stop 100%)
];

/**
 * Sequential probability ramp used across heat map surfaces.
 * Dark teal at low probabilities (recedes into bg), through cyan
 * and coral, to soft pink/lavender at high probabilities (pops).
 *
 * Used by:
 *   GoalMatrixHeatmap (match detail correct-score matrix)
 *   BracketBoard (per-round marginal probabilities matrix)
 */
export function probabilityToColor(p: number): string {
  const n = Math.max(0, Math.min(1, p));
  const [r, g, b] = interpolateStops(n, BRK_STOPS, BRK_COLORS);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Returns "light" or "dark" for the text color that should overlay
 * a cell of probability p. Uses the same band lookup as V2-04's
 * BracketBoard contrast fix.
 */
export function probabilityTextColor(p: number): "light" | "dark" {
  if (p < 0.01) return "light"; // empty cell, quiet grey
  if (p < 0.10) return "light"; // very faint teal band
  const n = Math.max(0, Math.min(1, p));
  const [r, g, b] = interpolateStops(n, BRK_STOPS, BRK_COLORS);
  return relativeLuminance(r, g, b) > 0.22 ? "dark" : "light";
}

/**
 * Resolves the "light" | "dark" token from probabilityTextColor to the
 * hex value used in the BracketBoard.
 */
export function probabilityTextColorHex(p: number): string {
  if (p < 0.01) return "#A8AFBC";
  if (p < 0.10) return "#A8AFBC";
  return probabilityTextColor(p) === "dark" ? "#0F1216" : "#EEE8DD";
}
