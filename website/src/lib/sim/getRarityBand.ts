import type { RarityBand, RarityBandReading } from "./types";

const CAPTIONS: Record<RarityBand, string> = {
  Common: "The model often sees this.",
  Plausible: "The model gives this real weight.",
  Uncommon: "A bold call.",
  Rare: "The model rarely runs this tournament.",
  "Vanishingly rare": "Almost no one sees this coming.",
};

/**
 * Map a Reality Score (count / total) to a rarity band per design v2 §3.1.
 *
 * Thresholds (inclusive lower bound):
 *   ≥ 25%      → Common
 *   ≥  5%      → Plausible
 *   ≥  1%      → Uncommon
 *   ≥  0.1%    → Rare
 *   <  0.1%    → Vanishingly rare
 *
 * The `belowResolutionFloor` flag fires when count < 30 — at that point
 * the floor caveat ("Fewer than 30 of 10,000…") should render in 12pt
 * italic sans below the band per v2 §3.1.
 */
export function getRarityBand(count: number, total: number): RarityBandReading {
  const pct = total > 0 ? count / total : 0;
  let band: RarityBand;
  if (pct >= 0.25) band = "Common";
  else if (pct >= 0.05) band = "Plausible";
  else if (pct >= 0.01) band = "Uncommon";
  else if (pct >= 0.001) band = "Rare";
  else band = "Vanishingly rare";

  return {
    band,
    caption: CAPTIONS[band],
    belowResolutionFloor: count < 30,
  };
}
