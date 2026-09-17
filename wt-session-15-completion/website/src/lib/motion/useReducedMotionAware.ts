/**
 * useReducedMotionAware · Phase E §5.3.
 *
 * Wraps every motion preset access with a reduced-motion check. When
 * the user has `prefers-reduced-motion: reduce` enabled, the returned
 * transition collapses to `{ duration: 0 }`, which makes any Framer
 * Motion `animate` instant. This restores the Phase D static behavior
 * for users who opted out of motion.
 *
 * Every `motion.*` element in the simulator routes its `transition`
 * through this hook. No exceptions (Phase E §3 Rule 3).
 */

import { useReducedMotion } from "framer-motion";
import { motion as motionVocab } from "./vocabulary";

export function useReducedMotionAware<K extends keyof typeof motionVocab>(
  preset: K,
): (typeof motionVocab)[K] | { duration: 0 } {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return { duration: 0 };
  return motionVocab[preset];
}
