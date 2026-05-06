"use client";

/**
 * useDecryptValue — MOTION_SPEC.md §1.
 *
 * Cycle the digit positions of `target` through random glyphs for
 * `durationMs`, then snap to `target`. Non-digit characters (the
 * decimal point, the percent sign, the promoted-state "▲ " prefix)
 * are preserved on every frame so the column rhythm never jitters.
 *
 * The effect is the cognitive counterpart to "compiling…": the user
 * sees the terminal resolve a calculation, then lock. Brutalist
 * tone — no fade, no decel; the lock IS the punctuation.
 *
 * SSR-safe: returns `target` until the first client tick. The
 * server-rendered HTML therefore shows the final value, hydration
 * replaces it with the scrambling frame, and the page reads
 * correctly with JS disabled.
 *
 * Reduced-motion: short-circuits to the final string. No animation,
 * no flicker. Honours framer-motion's useReducedMotion contract,
 * which itself wraps prefers-reduced-motion.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const DIGIT_RE = /[0-9]/g;
const RAND_DIGIT = (): string =>
  String.fromCharCode(48 + Math.floor(Math.random() * 10));

interface UseDecryptValueOptions {
  /**
   * Total scramble duration in ms. Default 400.
   *
   * Phase E §3 caps standard motion at 600ms. The default 400 sits
   * inside the layout-transition band (300–500ms) and interlocks
   * with StaggeredReveal's 240ms hero entrance: the eye lands on
   * the hero ~240ms after mount, mid-scramble, then the digits
   * lock ~160ms later. Don't extend this without re-running that
   * timing calculation.
   */
  durationMs?: number;
  /**
   * Frame interval in ms. Default 48 (~21Hz).
   *
   * Faster than 60Hz reads as visual noise; slower than 30Hz reads
   * as a loading dot. 21Hz is the terminal-cursor sweet spot.
   */
  tickMs?: number;
  /**
   * When false, returns `target` immediately without scrambling.
   * Use to gate on parent-controlled triggers.
   */
  enabled?: boolean;
}

export function useDecryptValue(
  target: string,
  {
    durationMs = 400,
    tickMs = 48,
    enabled = true,
  }: UseDecryptValueOptions = {},
): string {
  const prefersReduced = useReducedMotion();
  const [frame, setFrame] = useState<string>(target);
  const startedAtRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || prefersReduced) {
      setFrame(target);
      return;
    }

    let raf = 0;
    startedAtRef.current = null;
    lastTickRef.current = 0;

    const tick = (now: number): void => {
      if (startedAtRef.current === null) startedAtRef.current = now;
      const elapsed = now - startedAtRef.current;

      if (elapsed >= durationMs) {
        setFrame(target);
        return;
      }
      if (now - lastTickRef.current >= tickMs) {
        lastTickRef.current = now;
        setFrame(target.replace(DIGIT_RE, RAND_DIGIT));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // On unmount mid-scramble, leave the user reading the final value
      // not a frozen random frame.
      setFrame(target);
    };
  }, [target, durationMs, tickMs, enabled, prefersReduced]);

  return frame;
}
