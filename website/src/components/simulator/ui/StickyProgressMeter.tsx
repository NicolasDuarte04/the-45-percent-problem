"use client";

/**
 * StickyProgressMeter · CP-03.
 *
 * One shared bottom-of-viewport strip mounted by each build mode page.
 * Two jobs only: orient the user mid-build (`[ STEP n OF N : MODE ]`),
 * and offer the ARM ALERT CTA the moment the scenario is submittable.
 *
 * The component is stateless; truth (pick count, submittability, submit
 * handler) lives in the mode component. After submit succeeds the mode
 * passes `isSubmitted` true and the meter unmounts; the result chrome
 * on the permalink takes over.
 */

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import { useRollingNumber } from "@/lib/motion/useRollingNumber";

export interface StickyProgressMeterProps {
  current: number;
  total: number;
  modeLabel: string;
  isReady: boolean;
  isSubmitted: boolean;
  /**
   * True while handleSubmit is in flight. The CTA shows
   * `[ Submitting... ]` during that window, matching the inline
   * (home-page embed) variant of ModeFinalFour. Optional so existing
   * callers keep working; defaults to false.
   */
  submitting?: boolean;
  onSubmit: () => void;
}

export function StickyProgressMeter({
  current,
  total,
  modeLabel,
  isReady,
  isSubmitted,
  submitting = false,
  onSubmit,
}: StickyProgressMeterProps) {
  // Tag the body while the meter is mounted so a globals.css rule can
  // give the SiteFooter matching bottom padding. Keeps the coupling
  // inside the meter - no prop drilling, no layout context.
  useEffect(() => {
    if (isSubmitted) return;
    document.body.dataset.hasStickyMeter = "true";
    return () => {
      delete document.body.dataset.hasStickyMeter;
    };
  }, [isSubmitted]);
  const bandTransition = useReducedMotionAware("bandReveal");
  const prefersReduced = useReducedMotion();
  const rolled = useRollingNumber(current);
  // Round to the nearest whole pick for the displayed integer; the
  // hook returns a fractional in-flight value during the ease-out.
  const displayedCurrent = prefersReduced ? current : Math.round(rolled);

  if (isSubmitted) return null;

  const stepText = `[ STEP ${displayedCurrent} OF ${total} : ${modeLabel} ]`;

  return (
    <div
      data-testid="sticky-progress-meter"
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        backgroundColor: "var(--bg-panel-elev)",
        borderTop:
          "1px solid color-mix(in srgb, var(--text-tertiary) 18%, transparent)",
      }}
    >
      <div className="mx-auto flex max-w-[1152px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <motion.span
          key={isReady ? "ready" : "step"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={bandTransition}
          role="status"
          aria-live="polite"
          data-state={isReady ? "ready" : "step"}
          className="font-mono text-[11px] uppercase tracking-[0.10em] tabular-nums sm:text-[12px]"
          style={{
            color: isReady ? "var(--ui-success)" : "var(--text-primary)",
          }}
        >
          {isReady ? "[ READY ]" : stepText}
        </motion.span>

        <motion.button
          key={isReady ? "arm" : "arm-disabled"}
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={bandTransition}
          onClick={isReady ? onSubmit : undefined}
          disabled={!isReady}
          aria-disabled={!isReady}
          aria-label={
            isReady
              ? "See how the model reacts to this scenario"
              : "See how the model reacts (not ready)"
          }
          data-state={isReady ? "active" : "disabled"}
          className="inline-flex h-11 min-h-[44px] items-center px-3 font-mono text-[12px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)] sm:text-[13px]"
          style={{
            backgroundColor: "transparent",
            color: isReady ? "var(--accent-warm)" : "var(--text-tertiary)",
            cursor: isReady ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "[ Submitting... ]" : "[ See how the model reacts ]"}
        </motion.button>
      </div>
    </div>
  );
}
