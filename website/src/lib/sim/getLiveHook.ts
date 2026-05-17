/**
 * Live-gauge viral-hook helper per
 * UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §4.1 (Option C. Ultra-Minimalist
 * Hybrid).
 *
 * Maps a Reality Score (count / total) to one of three viral hooks
 * displayed only in the live build gauge. The post-submit
 * `RealityScorePanel` MUST NOT import this helper; its rarity-band
 * vocabulary (Common, Plausible, Uncommon, Rare, Vanishingly rare)
 * stays separate by design. The two surfaces speak different
 * registers; that separation is enforced socially, not by a runtime
 * guard.
 *
 * Thresholds (inclusive lower bound on probability):
 *   ≥ 5%   → REALISTIC
 *   ≥ 1%   → BOLD CALL
 *   < 1%   → LONG SHOT  (also catches < 0.1%; there is no fourth tier)
 */

export type LiveHook = "REALISTIC" | "BOLD CALL" | "LONG SHOT";

export function getLiveHook(count: number, total: number): LiveHook {
  const p = total > 0 ? count / total : 0;
  if (p >= 0.05) return "REALISTIC";
  if (p >= 0.01) return "BOLD CALL";
  return "LONG SHOT";
}
