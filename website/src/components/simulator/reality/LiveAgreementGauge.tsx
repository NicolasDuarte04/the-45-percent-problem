"use client";

/**
 * LiveAgreementGauge. Phase D Workstream 3, Phase E §5.4 motion.
 *
 * Per UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §4.2 + §4.4 with the Option C
 * resolution (§4.1). The live build gauge speaks a 3-state viral
 * vocabulary only. REALISTIC / BOLD CALL / LONG SHOT; never the
 * post-submit rarity vocabulary (Common, Plausible, Uncommon, Rare,
 * Vanishingly rare). The post-submit hero is RealityScorePanel, which
 * MUST NOT import this component.
 *
 * Phase E motion (§5.4):
 *   - When `isComplete` flips false → true, the active segment fills
 *     using a 450ms CSS transition (.ck17-gauge-fill). Other segments
 *     stay outline. Checkpoint 17 (B1) moved this off Framer Motion.
 *   - The viral hook label crossfades on change using the `micro`
 *     preset via <AnimatePresence mode="wait">. Kept on Framer Motion
 *     because the mode="wait" coordinator has no clean CSS equivalent.
 *   - Reduced motion: CSS @media collapses the fill transition to
 *     instant; useReducedMotionAware still flattens the crossfade.
 *
 * Performance: primitive props only so React.memo stays effective.
 * Score recompute happens in the caller on drop, not on drag-over.
 */

import { memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLiveHook } from "@/lib/sim/getLiveHook";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";

interface LiveAgreementGaugeProps {
  count: number;
  total: number;
  /** True only when the scenario meets the per-mode show-threshold. */
  isComplete: boolean;
  /** Reserved; do not use "full": that surface is RealityScorePanel. */
  variant?: "compact" | "full";
}

const SEGMENT_COUNT = 5;

/**
 * Pick the active segment by raw probability buckets; same threshold
 * geometry the post-submit panel uses, so the bar widths line up
 * across surfaces. Critically, only the *index* is shared; the textual
 * label here is the live-gauge viral hook, never the scientific term.
 *
 * Index 0 = leftmost (most common). Index 4 = rightmost (vanishingly rare).
 */
function activeSegmentIndex(count: number, total: number): number {
  const pct = total > 0 ? count / total : 0;
  if (pct >= 0.25) return 0;
  if (pct >= 0.05) return 1;
  if (pct >= 0.01) return 2;
  if (pct >= 0.001) return 3;
  return 4;
}

function formatLivePercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(0)}%`;
}

function LiveAgreementGaugeImpl({
  count,
  total,
  isComplete,
}: LiveAgreementGaugeProps) {
  const activeIdx = isComplete ? activeSegmentIndex(count, total) : -1;
  const hook = isComplete ? getLiveHook(count, total) : null;
  const percent = isComplete ? formatLivePercent(count, total) : null;

  const microTransition = useReducedMotionAware("micro");

  return (
    <section
      aria-labelledby="live-gauge-heading"
      aria-live="polite"
      className="border border-[var(--border-default)] p-4"
    >
      <h3
        id="live-gauge-heading"
        className="font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] opacity-60"
      >
        How the model reads this
      </h3>

      <ul
        aria-hidden="true"
        className="mt-3 grid h-2 w-full max-w-[280px] grid-cols-5 gap-px sm:max-w-[320px]"
      >
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
          const active = i === activeIdx;
          return (
            <li
              key={i}
              // Phase E §8 (D.3): gauge segment border in accent-warm
              // when active to tie the gauge into the "you are here"
              // beacon system used across the simulator.
              className={[
                "relative overflow-hidden border",
                active
                  ? "border-[var(--accent-warm)]"
                  : "border-[var(--text-primary)]",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                // Phase E §8 (D.3): active segment fills with the
                // accent-warm beacon, replacing the prior text-primary
                // bone fill. Checkpoint 17 (B1): CSS-only fill via
                // ck17-gauge-fill toggled by data-active.
                data-active={active ? "true" : "false"}
                className="ck17-gauge-fill absolute inset-0 bg-[var(--accent-warm)]"
              />
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span
          className={[
            "relative inline-block min-h-[1em] font-mono text-[14px] uppercase tracking-[0.10em] sm:text-[15px]",
            // Phase E §8 (D.3): viral hook tracks the gauge accent.
            isComplete
              ? "text-[var(--accent-warm)]"
              : "text-[var(--text-primary)]",
          ].join(" ")}
          aria-label={hook ? `Live hook: ${hook}` : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            {hook ? (
              <motion.span
                key={hook}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={microTransition}
                className="inline-block"
              >
                {hook}
              </motion.span>
            ) : (
              <span key="empty" className="inline-block">&nbsp;</span>
            )}
          </AnimatePresence>
        </span>
        <span className="font-mono text-[16px] tabular-nums text-[var(--text-primary)] sm:text-[18px]">
          {percent ?? " "}
        </span>
      </div>
    </section>
  );
}

export const LiveAgreementGauge = memo(LiveAgreementGaugeImpl);
