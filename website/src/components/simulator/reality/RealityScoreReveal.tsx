"use client";

/**
 * RealityScoreReveal — Phase E §9 (E.2).
 *
 * Client wrapper that owns the post-submit reveal entrance. Composes:
 *
 *   1. The whole panel fades up from `y: 24, opacity: 0` to `y: 0,
 *      opacity: 1` over 400ms via `motion.entry`.
 *   2. A new 5-band rarity bar (the post-submit equivalent of the
 *      live gauge segments — but rendered with the *scientific*
 *      vocabulary in `aria-label`, never the live-gauge viral hook).
 *      Active segment fills via `motion.gaugeFill` (450ms) with a
 *      100ms post-entry delay so the verdict lands after the panel
 *      settles.
 *   3. The existing static `RealityScorePanel` with its hero number,
 *      denominator, rarity band serif label, and 1-in-N sentence —
 *      the 1-in-N integer is overridden via the `oneInNTarget` prop
 *      so OneInNCountUp can animate it from 1 → final over 700ms
 *      cubic-out (Q3: integer only, fractional % static).
 *
 * After the entrance lands, no further motion. The reveal is the
 * dignified verdict; let it sit (Phase E §3 Rule 5 + §9 (E.2)).
 *
 * Reduced motion: useReducedMotionAware collapses every preset to
 * { duration: 0 }, so the entrance + bar fill snap and the count-up
 * (handled inside OneInNCountUp) renders the final value immediately.
 */

import { motion } from "framer-motion";
import { RealityScorePanel } from "@/components/simulator/RealityScorePanel";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import type { PublicPredictionView } from "@/lib/sim/types";

interface RealityScoreRevealProps {
  count: number;
  total: number;
  state?: PublicPredictionView["state"];
  variant?: "submitted" | "promoted";
}

const SEGMENT_COUNT = 5;

/** Same threshold geometry as LiveAgreementGauge.activeSegmentIndex —
 * but here the segment carries the *scientific* rarity vocabulary in
 * its aria-label, NOT the live-gauge viral hook. */
function activeSegmentIndex(count: number, total: number): number {
  const pct = total > 0 ? count / total : 0;
  if (pct >= 0.25) return 0;
  if (pct >= 0.05) return 1;
  if (pct >= 0.01) return 2;
  if (pct >= 0.001) return 3;
  return 4;
}

const RARITY_LABELS = [
  "Common",
  "Plausible",
  "Uncommon",
  "Rare",
  "Vanishingly rare",
] as const;

export function RealityScoreReveal({
  count,
  total,
  state = "alive",
  variant = "submitted",
}: RealityScoreRevealProps) {
  const entryTransition = useReducedMotionAware("entry");
  const gaugeFillTransition = useReducedMotionAware("gaugeFill");
  const activeIdx = activeSegmentIndex(count, total);
  const oneInNTarget =
    count <= 0 ? total : Math.max(1, Math.round(total / count));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={entryTransition}
    >
      {/* 5-band rarity bar — post-submit, vocabulary intentionally
          scientific (Common, Plausible, Uncommon, Rare, Vanishingly
          rare). Never the live-gauge viral hook. */}
      <ul
        aria-label={`Rarity band: ${RARITY_LABELS[activeIdx]}`}
        className="mt-2 grid h-2 w-full max-w-[320px] grid-cols-5 gap-px"
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
          const active = i === activeIdx;
          return (
            <li
              key={i}
              className={[
                "relative overflow-hidden border",
                active
                  ? "border-[var(--accent-warm)]"
                  : "border-[var(--text-tertiary)]",
              ].join(" ")}
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 bg-[var(--accent-warm)]"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{
                  opacity: active ? 1 : 0,
                  scaleX: active ? 1 : 0,
                }}
                style={{ transformOrigin: "left center" }}
                transition={{ ...gaugeFillTransition, delay: 0.1 }}
              />
            </li>
          );
        })}
      </ul>

      <RealityScorePanel
        count={count}
        total={total}
        state={state}
        variant={variant}
        oneInNTarget={oneInNTarget}
      />
    </motion.div>
  );
}
