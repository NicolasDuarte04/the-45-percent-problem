"use client";

/**
 * useRollingNumber · CP-02.
 *
 * Animate a numeric value with a 220ms tabular-nums roll using a
 * requestAnimationFrame loop and ease-out cubic. Honours
 * `prefers-reduced-motion: reduce` by returning the target directly,
 * short-circuiting the animation. Reusable by CP-08 for the
 * post-submit "1 in N" count-up; that is why this lives in `motion/`
 * rather than next to the gauge.
 *
 * The hook returns the *displayed* value; it does not own any canonical
 * state. Consumers pass their truth in via `target`; the hook smoothly
 * interpolates the rendered number from the previously-displayed value
 * to the new target. If `target` changes mid-flight, the in-flight rAF
 * is cancelled and a new interpolation starts from wherever the display
 * currently sits, so successive rapid edits do not snap.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface UseRollingNumberOptions {
  /** Roll duration in ms. Default 220 (matches the tickRoll preset). */
  durationMs?: number;
}

// Ease-out cubic, matching the [0.22, 1, 0.36, 1] curve named tickRoll.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useRollingNumber(
  target: number,
  options?: UseRollingNumberOptions,
): number {
  const durationMs = options?.durationMs ?? 220;
  const prefersReduced = useReducedMotion();

  const [animated, setAnimated] = useState<number>(target);
  const rafRef = useRef<number | null>(null);
  const animatedRef = useRef<number>(target);

  // Keep the ref in sync without scheduling a setState from inside an
  // effect; the effect below reads this ref to find its starting point
  // for the next roll.
  useEffect(() => {
    animatedRef.current = animated;
  }, [animated]);

  useEffect(() => {
    // Reduced-motion users: skip the rAF entirely. The hook returns
    // `target` directly below, so no setState is needed here.
    if (prefersReduced) return;

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = animatedRef.current;
    const to = target;
    if (from === to) return;

    const startTs =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const tick = (nowTs: number) => {
      const elapsed = nowTs - startTs;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      const next = from + (to - from) * eased;
      animatedRef.current = next;
      setAnimated(next);
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, durationMs, prefersReduced]);

  return prefersReduced ? target : animated;
}
