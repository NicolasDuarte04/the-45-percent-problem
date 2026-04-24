/** Formats a [0,1] probability to "41.2%" with fixed decimal places. */
export function formatProbability(p: number, decimals = 1): string {
  return `${(p * 100).toFixed(decimals)}%`;
}

/** Formats a European decimal odd, e.g. 2.350. */
export function formatDecimalOdds(odd: number, decimals = 3): string {
  return odd.toFixed(decimals);
}

/**
 * Formats a signed edge value in percentage-point notation.
 * e.g. 0.042 → "+4.2pp", -0.031 → "−3.1pp"
 */
export function formatEdge(edge: number, decimals = 1): string {
  const abs = Math.abs(edge * 100).toFixed(decimals);
  const sign = edge >= 0 ? "+" : "−";
  return `${sign}${abs}pp`;
}

/** Formats a generic number with fixed decimals and tabular alignment. */
export function formatMono(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/** Formats a [lo, hi] confidence interval as "[0.041, 0.089]". */
export function formatCI(lo: number, hi: number, decimals = 3): string {
  return `[${lo.toFixed(decimals)},\u202f${hi.toFixed(decimals)}]`;
}

/** Truncates a SHA to 7 chars for display. */
export function formatSha(sha: string): string {
  return sha.slice(0, 7);
}
