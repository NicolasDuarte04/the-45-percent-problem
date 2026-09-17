"use client";

/**
 * Count-up animation hook (Session 01) — ports the prototype's countUp().
 * Eases from the previously shown value to the new target over `dur` ms.
 * Honors prefers-reduced-motion by snapping straight to the target.
 */

import { useEffect, useRef, useState } from "react";
import { fmt } from "../_lib/voto-runtime";

interface CountUpOptions {
  decimals?: number;
  /** Format with es-CO thousands grouping instead of fixed decimals. */
  group?: boolean;
  dur?: number;
}

export function useCountUp(target: number, { decimals = 0, group = false, dur = 700 }: CountUpOptions = {}): string {
  const fromRef = useRef(target);
  const [value, setValue] = useState(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    // No change → the displayed value is already correct; nothing to animate.
    if (from === target) return;
    const reduce =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion snaps via a single frame (effDur 0) rather than a
    // synchronous setState in the effect body.
    const effDur = reduce ? 0 : dur;
    let raf = 0;
    const t0 = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const frame = (now: number) => {
      const t = effDur === 0 ? 1 : Math.min(1, (now - t0) / effDur);
      setValue(from + (target - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);

  return group ? fmt(Math.round(value)) : value.toFixed(decimals);
}
