"use client";

/**
 * useTypewriter · MOTION_SPEC.md §3.
 *
 * Reveal `text` one character at a time once `active` flips to true.
 * Returns the currently-typed substring. Designed for the WATCH row
 * in PredictionAlertConfigurator: when the panel scrolls into view
 * the prediction chain (e.g. "ARG > AUT > AUS > BEL") types out
 * left-to-right at terminal speed.
 *
 * Brutalist tone: 22ms per character is faster than mainstream
 * typewriter effects (40-60ms): reads as command-line echo, not
 * as a person typing. No caret; the eyebrow's STATUS: ▍ already
 * owns the blinking-cursor role.
 *
 * SSR-safe: renders the full string on the server. The hook only
 * starts cycling when `active` flips to true on the client; until
 * then the full string is visible (so no JS = no animation, but
 * the page still reads).
 *
 * Reduced-motion: short-circuits to the full string. No animation.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface UseTypewriterOptions {
  /**
   * Set by the consumer when the trigger condition fires (e.g. an
   * IntersectionObserver / framer-motion useInView returning true).
   */
  active: boolean;
  /**
   * ms between characters. Default 22.
   *
   * 22ms = ~45 chars/sec, well above human typing speed and below
   * the threshold where the user reads it as "instant". This is the
   * terminal-echo sweet spot.
   */
  tickMs?: number;
}

export function useTypewriter(
  text: string,
  { active, tickMs = 22 }: UseTypewriterOptions,
): string {
  const prefersReduced = useReducedMotion();
  const [out, setOut] = useState<string>("");

  // Refs survive React re-renders. Strict mode + RSC streaming +
  // unrelated parent state changes cause this hook's effect to teardown
  // and re-mount; without ref-backed progress the typer would reset to
  // 0 chars on every cycle. Tracking `i` and the active interval id in
  // refs lets the effect re-attach to the in-flight type-out instead
  // of restarting it.
  const indexRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const completedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      indexRef.current = 0;
      completedKeyRef.current = null;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setOut("");
      return;
    }
    if (prefersReduced) {
      setOut(text);
      return;
    }

    const key = `${text}::${tickMs}`;
    // Already typed this string to completion; no work, no restart.
    if (completedKeyRef.current === key) {
      setOut(text);
      return;
    }
    // Already typing this string: let it finish; do not reset.
    if (intervalRef.current !== null) {
      return;
    }

    indexRef.current = 0;
    setOut("");
    intervalRef.current = window.setInterval(() => {
      indexRef.current += 1;
      const slice = text.slice(0, indexRef.current);
      setOut(slice);
      if (indexRef.current >= text.length) {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        completedKeyRef.current = key;
      }
    }, tickMs);

    // No effect-cleanup interval-clear: the ref-based interval is owned
    // by the typer itself, not by the effect lifecycle. Cleanup only on
    // unmount, handled by the second effect below.
  }, [text, active, tickMs, prefersReduced]);

  // Single hard-stop on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return out;
}
