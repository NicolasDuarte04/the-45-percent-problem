"use client";

/**
 * RealityScoreReveal. Phase E §9 (E.2) plus Checkpoint 3 (P0.4).
 *
 * Two-phase reveal:
 *
 *   1. anticipating: a quiet mono italic typewriter line types out
 *      "Counting matches across 10,000 simulated tournaments..." for
 *      roughly 900ms. Nothing else renders during this phase: no hero,
 *      no rarity bar, no count-up. The copy is descriptive of an actual
 *      computational step, not a marketing flourish.
 *   2. revealing: the existing entry transition runs unchanged. The
 *      5-band rarity bar fills, RealityScorePanel mounts, the hero
 *      decrypts, the .reveal-band and .reveal-one-in-n CSS animations
 *      fire from t=0 of mount, and OneInNCountUp counts up.
 *
 * SSR and the initial client render both render the anticipating
 * shell with an empty typewriter string. The effect below flips
 * `typeActive` true to start typing, then transitions to "revealing"
 * after ANTICIPATION_MS. No hydration mismatch.
 *
 * Reduced motion: the effect detects `prefers-reduced-motion: reduce`
 * via matchMedia and flips straight to "revealing" on mount. The
 * typewriter never activates; the (reduced-motion-aware) entry and
 * gauge-fill transitions collapse to `{ duration: 0 }` and the
 * reveal renders effectively instantly. A single-frame flicker of
 * the empty anticipating shell is acceptable per spec.
 *
 * Layout-jump avoidance: the wrapper carries a min-height that
 * comfortably accommodates the eventual reveal at both mobile and
 * sm+ sizes, so the page does not shift when the phase advances.
 */

import { useEffect, useState } from "react";
import { RealityScorePanel } from "@/components/simulator/RealityScorePanel";
import { useTypewriter } from "@/lib/motion/useTypewriter";
import type { PublicPredictionView } from "@/lib/sim/types";

interface RealityScoreRevealProps {
  count: number;
  total: number;
  state?: PublicPredictionView["state"];
  variant?: "submitted" | "promoted";
}

const SEGMENT_COUNT = 5;

/** Anticipation window in ms. Sits inside the 600..1200ms band from
 * the Checkpoint 3 brief. Tuned so the 55-char typewriter (at 16ms
 * per char, roughly 880ms total) lands a beat before the phase
 * flips. */
const ANTICIPATION_MS = 900;

/** Locked copy. Descriptive of the actual marginal-probability
 * lookup the reveal renders. Do not rephrase. */
const ANTICIPATION_COPY =
  "Counting matches across 10,000 simulated tournaments...";

/** Faster than the default useTypewriter tick (22ms) so the full
 * line completes within ANTICIPATION_MS. 16ms x 55 chars is about
 * 880ms; the remaining 20ms gives the eye a beat on the complete
 * string before the phase flips. */
const TYPEWRITER_TICK_MS = 16;

/** Same threshold geometry as LiveAgreementGauge.activeSegmentIndex,
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

type Phase = "anticipating" | "revealing";

export function RealityScoreReveal({
  count,
  total,
  state = "alive",
  variant = "submitted",
}: RealityScoreRevealProps) {
  const activeIdx = activeSegmentIndex(count, total);
  const oneInNTarget =
    count <= 0 ? total : Math.max(1, Math.round(total / count));

  // SSR + initial client render both start in "anticipating" with
  // `typeActive` false (so useTypewriter returns ""). Hydration is
  // therefore identical on both sides.
  const [phase, setPhase] = useState<Phase>("anticipating");
  const [typeActive, setTypeActive] = useState(false);
  const typedLine = useTypewriter(ANTICIPATION_COPY, {
    active: typeActive,
    tickMs: TYPEWRITER_TICK_MS,
  });

  useEffect(() => {
    // matchMedia (not framer-motion's useReducedMotion) so the
    // detection is synchronous and the effect runs exactly once. The
    // same pattern is used at PredictionAlertConfigurator.tsx:178.
    const prefersReduced =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false);

    if (prefersReduced) {
      setPhase("revealing");
      return;
    }

    setTypeActive(true);
    const id = window.setTimeout(
      () => setPhase("revealing"),
      ANTICIPATION_MS,
    );
    return () => window.clearTimeout(id);
  }, []);

  // The min-height reserves vertical space for the eventual reveal
  // so the page does not jump when the phase advances. The values
  // are tuned to the reveal block's intrinsic height (5-band bar +
  // peach rule + hero + denominator + rarity band + caption +
  // optional resolution-floor caveat + 1-in-N) at mobile and sm+.
  return (
    <div className="relative min-h-[280px] sm:min-h-[340px]">
      {phase === "anticipating" ? (
        <div
          // aria-hidden so the typewriter does not double-announce
          // each character to screen readers. The reveal panel
          // carries its own aria-labelledby once it mounts.
          aria-hidden="true"
          className="font-mono italic text-[12px] leading-[1.4] text-[var(--text-tertiary)]"
        >
          {typedLine}
        </div>
      ) : (
        // Checkpoint 17 (B1): entry + segment-fill animations migrated
        // from Framer Motion to CSS keyframes (ck17-reveal-entry) and
        // CSS transitions (ck17-gauge-fill plus the 100ms-delayed
        // variant). Reduced-motion users get the same instant snap
        // they got from useReducedMotionAware.
        <div className="ck17-reveal-entry">
          {/* 5-band rarity bar. Post-submit, vocabulary intentionally
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
                  <span
                    aria-hidden="true"
                    data-active={active ? "true" : "false"}
                    className="ck17-gauge-fill ck17-gauge-fill-delayed absolute inset-0 bg-[var(--accent-warm)]"
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
        </div>
      )}
    </div>
  );
}
