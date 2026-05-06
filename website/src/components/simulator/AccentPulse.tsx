"use client";

/**
 * AccentPulse — Phase E §8 (D.3).
 *
 * One-shot 250ms warm-tint pulse: an absolutely positioned overlay
 * that fades from ~8% `--accent-warm` fill to 0 over the duration.
 * Single fire per `triggerKey` change. Never repeats, never compounds
 * (Phase E §8 D.3 hard rule).
 *
 * Usage: wrap the parent cell with `position: relative` and render
 * `<AccentPulse triggerKey={someNumber} />` inside it. When the parent
 * mutates the relevant state (slot drop, group completion, stage
 * advance), bump the trigger via `setPulseKey(k => k + 1)`.
 *
 * Reduced motion: useReducedMotionAware collapses the transition to
 * 0ms so the overlay flashes for one frame and clears — visually
 * indistinguishable from no pulse but preserves the same render
 * surface.
 */

import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

interface AccentPulseProps {
  /**
   * Bumping this value re-mounts the motion element and re-fires the
   * fade-out. Defaults to 0 (no pulse on first mount).
   */
  triggerKey: number;
}

export function AccentPulse({ triggerKey }: AccentPulseProps) {
  const prefersReduced = useReducedMotion();
  // Don't render at all on first mount (triggerKey === 0). Only fires
  // after a real state change bumps the key.
  if (triggerKey === 0) return null;
  return (
    <motion.span
      key={triggerKey}
      aria-hidden="true"
      // 8% accent-warm fill per spec; fades to transparent over 250ms.
      initial={{ opacity: 0.08 }}
      animate={{ opacity: 0 }}
      transition={{
        duration: prefersReduced ? 0 : 0.25,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="pointer-events-none absolute inset-0 bg-[var(--accent-warm)]"
    />
  );
}
