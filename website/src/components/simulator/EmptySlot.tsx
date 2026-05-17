"use client";

/**
 * EmptySlot: tactile empty-target affordance per
 * UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §3.1, with Phase E §5.4 motion.
 *
 * Replaces the en-dash placeholders that previously sat in droppable
 * positions across all three build modes. Communicates "this is a
 * target" via a dashed 1px border + a 1px-stroke "+" glyph + a quiet
 * label.
 *
 * Phase E motion: the glyph + label fade between unlit/lit via the
 * `micro` preset whenever `isOver` (or `isActive`) toggles. The border
 * and fill keep their Phase D CSS transition (fast, no JS cost). The
 * fade-in of the EmptySlot itself when a parent clears its slot (and
 * the fade-out when filled) is owned by the parent's <AnimatePresence>
 * wrapper so the team chip and EmptySlot trade places coherently.
 *
 * Reduced motion: useReducedMotionAware collapses the micro preset to
 * { duration: 0 }, so the lit-state crossfade snaps instantly; the
 * Phase D static behavior.
 *
 * Sharp corners (border-radius: 0). Inline SVG glyph: no icon library.
 */

import { motion } from "framer-motion";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";

interface EmptySlotProps {
  /** Optional caption above the glyph; defaults to "DROP A TEAM". */
  label?: string;
  /** dnd-kit `isOver`: the drag is hovering this slot. */
  isOver?: boolean;
  /** Tap-to-fill is armed for this slot. */
  isActive?: boolean;
  /** Visual density: sm fits bracket cells, md fits FF/CP, lg fits champion-cell. */
  size?: "sm" | "md" | "lg";
  /** Required for screen-reader context when this is the only child of a button. */
  ariaLabel: string;
}

const SIZE_CLASSES: Record<NonNullable<EmptySlotProps["size"]>, {
  glyph: number;
  label: string;
  padding: string;
  gap: string;
}> = {
  sm: {
    glyph: 12,
    label: "text-[8px]",
    padding: "p-1",
    gap: "gap-0.5",
  },
  md: {
    glyph: 16,
    label: "text-[9px]",
    padding: "p-2",
    gap: "gap-1",
  },
  lg: {
    glyph: 20,
    label: "text-[10px]",
    padding: "p-3",
    gap: "gap-1.5",
  },
};

export function EmptySlot({
  label = "DROP A TEAM",
  isOver = false,
  isActive = false,
  size = "md",
  ariaLabel,
}: EmptySlotProps) {
  const s = SIZE_CLASSES[size];
  const lit = isOver || isActive;
  const microTransition = useReducedMotionAware("micro");

  return (
    <motion.span
      role="presentation"
      aria-label={ariaLabel}
      data-empty-slot
      data-state={isOver ? "over" : isActive ? "active" : "idle"}
      className={[
        "flex h-full w-full flex-col items-center justify-center select-none",
        s.padding,
        s.gap,
        "border border-dashed transition-colors duration-100",
        lit
          ? "border-[var(--accent-warm)] bg-[color-mix(in_srgb,var(--accent-warm)_8%,transparent)]"
          : "border-[var(--border-default)] bg-transparent",
        isActive ? "empty-slot-pulse" : "",
      ].join(" ")}
    >
      <motion.span
        className={
          lit
            ? "text-[var(--accent-warm)]"
            : "text-[var(--text-quiet)]"
        }
        animate={{ opacity: lit ? 1 : 0.6 }}
        transition={microTransition}
      >
        <PlusGlyph size={s.glyph} />
      </motion.span>
      <motion.span
        className={[
          "font-mono uppercase tracking-[0.10em]",
          s.label,
          lit ? "text-[var(--accent-warm)]" : "text-[var(--text-quiet)]",
        ].join(" ")}
        animate={{ opacity: lit ? 0.9 : 0.6 }}
        transition={microTransition}
      >
        {label}
      </motion.span>
    </motion.span>
  );
}

interface PlusGlyphProps {
  size: number;
  className?: string;
}

function PlusGlyph({ size, className }: PlusGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="square"
      aria-hidden="true"
      focusable={false}
      className={className}
    >
      <line x1={8} y1={3} x2={8} y2={13} />
      <line x1={3} y1={8} x2={13} y2={8} />
    </svg>
  );
}
