"use client";

/**
 * EmptySlot — tactile empty-target affordance per
 * UX_POLISH_PLAN_SIMULATOR_PHASE_D.md §3.1.
 *
 * Replaces the en-dash placeholders that previously sat in droppable
 * positions across all three build modes. Communicates "this is a
 * target" via a dashed 1px border + a 1px-stroke "+" glyph + a quiet
 * label.
 *
 * Four states:
 *   - idle               default
 *   - isOver             dnd-kit drag is hovering this slot
 *   - isActive           tap-to-fill is armed (mobile/keyboard flow)
 *   - keyboard-focused   :focus-visible from a real button wrapper
 *
 * Sharp corners (border-radius: 0). Inline SVG glyph — no icon library.
 * The pulse on `isActive` honors prefers-reduced-motion: reduce.
 *
 * The component is presentational — the parent owns the click /
 * keyboard handlers and arms `isActive`. When parents wrap this in a
 * <button>, the focus ring comes from that button.
 */

interface EmptySlotProps {
  /** Optional caption above the glyph; defaults to "DROP A TEAM". */
  label?: string;
  /** dnd-kit `isOver` — the drag is hovering this slot. */
  isOver?: boolean;
  /** Tap-to-fill is armed for this slot. */
  isActive?: boolean;
  /** Visual density — sm fits bracket cells, md fits FF/CP, lg fits champion-cell. */
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

  return (
    <span
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
      <PlusGlyph
        size={s.glyph}
        className={
          lit
            ? "text-[var(--accent-warm)] opacity-100"
            : "text-[var(--text-quiet)] opacity-60"
        }
      />
      <span
        className={[
          "font-mono uppercase tracking-[0.10em]",
          s.label,
          lit
            ? "text-[var(--accent-warm)] opacity-90"
            : "text-[var(--text-quiet)] opacity-60",
        ].join(" ")}
      >
        {label}
      </span>
    </span>
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
