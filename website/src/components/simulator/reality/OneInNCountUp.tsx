"use client";

/**
 * OneInNCountUp — Phase E §9 (E.2) + Q3.
 *
 * Animates the 1-in-N integer from 1 → final over 700ms with cubic-out
 * easing. Q3 lock: integer-only count-up. The fractional percentage in
 * RealityScorePanel renders at its final value immediately — counting
 * up two decimal places looks fussy and undercuts the quant credibility
 * the reveal exists to deliver.
 *
 * Reduced motion: useReducedMotion → render the final value
 * immediately, no count-up.
 *
 * The component receives the pre-formatted "1 in N" sentence pieces
 * (`prefix` and `suffix`) plus the integer `target` so the visual
 * structure exactly matches the static fallback that RealityScorePanel
 * uses when count-up isn't desired (e.g. screenshots, snapshots).
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface OneInNCountUpProps {
  target: number;
  prefix?: string;
  suffix?: string;
}

const DURATION_MS = 700;

// cubic-out per §9 (E.2): t * (2 - t) ish — using the canonical
// `1 - (1 - t) ** 3` for smooth deceleration into the landing value.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function OneInNCountUp({
  target,
  prefix = "",
  suffix = "",
}: OneInNCountUpProps) {
  const prefersReduced = useReducedMotion();
  // Lazy initial — when reduced-motion or trivially small target, mount
  // at the final value so the effect doesn't need to write state
  // synchronously on first run.
  const skipAnimation = prefersReduced || target <= 2;
  const [value, setValue] = useState<number>(() => (skipAnimation ? target : 1));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (skipAnimation) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / DURATION_MS);
      const eased = easeOutCubic(t);
      const v = Math.round(1 + (target - 1) * eased);
      setValue(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, skipAnimation]);

  return (
    <span aria-label={`1 in ${target.toLocaleString("en-US")}`}>
      {prefix}
      <span className="tabular-nums">{value.toLocaleString("en-US")}</span>
      {suffix}
    </span>
  );
}
