/**
 * Motion vocabulary · Phase E §5.2.
 *
 * The single source of truth for every animation in the simulator.
 * Authors must not pass arbitrary `transition` objects inline; if a new
 * preset is needed, add it here, name it, and review.
 *
 * Bounds (Phase E §3 Rule 1):
 *   - 150-300ms for micro-interactions
 *   - 300-500ms for layout transitions
 *   - 600ms hard ceiling (gauge fill at 450ms is the longest standard preset)
 *   - Spring drops use stiffness 320, damping 28; single mild settle, not a bounce.
 */

import type { Transition } from "framer-motion";

export const motion = {
  // Micro-interactions: hover, focus, small visual responses.
  micro: {
    duration: 0.18,
    ease: [0.22, 1, 0.36, 1], // standard ease-out
  } satisfies Transition,

  // Item drops, slot fills: the satisfying "clack" of a piece landing.
  drop: {
    type: "spring",
    stiffness: 320,
    damping: 28,
    mass: 0.8,
  } satisfies Transition,

  // Layout transitions: collapse, expand, stage advance.
  layout: {
    duration: 0.32,
    ease: [0.32, 0.72, 0, 1],
  } satisfies Transition,

  // Entry: components appearing for the first time.
  entry: {
    duration: 0.4,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  // Exit: components leaving permanently.
  exit: {
    duration: 0.22,
    ease: [0.7, 0, 0.84, 0],
  } satisfies Transition,

  // The gauge fill: the single longest standard animation.
  gaugeFill: {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  // The bracket connector draw-in · Phase E §7 (C.2). One-shot
  // entry animation per session, gated by sessionStorage. The only
  // preset that exceeds the 500ms layout cap because it is a single
  // first-load reveal, not a recurring interaction. Stagger per
  // round happens at the call site (R32 lines first, etc.).
  bracketDraw: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  // Band reveal: the gauge fill on the permalink's first beat. One-shot
  // per prediction view, gated by sessionStorage. Lands inside the
  // 450ms gaugeFill envelope; named separately so CP-08 can stage it
  // independently of the build-mode gauge.
  bandReveal: {
    duration: 0.6,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  // Tick roll: the 1-in-N count-up on the permalink and any future
  // tabular-nums roll surface. Short, decisive, ease-out.
  tickRoll: {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  // Toast in: the inline status surface used by CP-04, CP-07, CP-10,
  // CP-11. Slide-up + opacity, 240ms ease-out. Exit is symmetric via
  // the `exit` preset already defined above.
  toastIn: {
    duration: 0.24,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,
} as const;

export type MotionPreset = keyof typeof motion;
