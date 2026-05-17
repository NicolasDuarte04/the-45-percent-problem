import type { Mode } from "./types";

/**
 * Phase A mock. Replaced in Phase C with real Monte Carlo run queries
 * against the simulation engine output (DuckDB-WASM in browser, or a
 * server route reading Parquet via DuckDB).
 *
 * Properties of this mock:
 *  - Deterministic: same canonicalized scenario yields the same count.
 *  - Plausible distribution: power-skewed so most scenarios land in the
 *    Uncommon-to-Rare bands; common scenarios land 1500-3000; rare ones
 *    land below 50.
 *  - Mode-aware: Full Bracket mocks return very low counts (the joint
 *    probability of 31 specific outcomes); Final Four returns moderate
 *    counts; Champion's Path scales inversely with constraint count.
 */

const TOTAL = 10_000;

export function computeRealityScoreMock(
  mode: Mode,
  canonical: string,
): { count: number; total: number } {
  const h = fnv1a32(canonical);
  // Map hash to u in (0, 1) avoiding 0 exactly.
  const u = (h + 1) / 0x1_0000_0001;

  // Power-skew: smaller values dominate. The skew exponent shifts per mode.
  // y = u^k where k > 1 pushes mass toward 0 (the rare end).
  const k = modeSkew(mode);
  const y = Math.pow(u, k);

  // Map to count in [1, TOTAL] with a soft floor and ceiling per mode.
  const ceiling = modeCeiling(mode);
  const raw = Math.round(1 + y * (ceiling - 1));
  const count = Math.max(1, Math.min(TOTAL, raw));
  return { count, total: TOTAL };
}

function modeSkew(mode: Mode): number {
  switch (mode) {
    case "final_four":
      return 2.4; // moderate skew; many scenarios land in the hundreds
    case "champions_path":
      return 3.2; // bolder skew; constraint-heavy
    case "full_bracket":
      return 5.0; // joint probability of many constraints; very rare
  }
}

function modeCeiling(mode: Mode): number {
  switch (mode) {
    case "final_four":
      return 4_500;
    case "champions_path":
      return 2_500;
    case "full_bracket":
      return 400;
  }
}

// FNV-1a 32-bit. Fast non-cryptographic hash. Stable across JS engines.
export function fnv1a32(s: string): number {
  let h = 0x811c_9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // 32-bit FNV prime: 0x01000193. Math.imul keeps us in i32-land.
    h = Math.imul(h, 0x0100_0193);
  }
  // Force unsigned.
  return h >>> 0;
}
