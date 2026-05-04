"use client";

/**
 * Shared draggable team chip for all three simulator build modes.
 *
 * Uses @dnd-kit/core's useDraggable hook. The drag handle is the button
 * itself so keyboard and pointer users get the same affordance.
 *
 * Accessibility:
 *   - aria-grabbed conveys drag state to screen readers.
 *   - Keyboard: Space/Enter activates the item as a draggable (dnd-kit
 *     handles KeyboardSensor navigation).
 *   - prefers-reduced-motion: drag overlay transform is disabled via
 *     CSS on .reduce-motion; the button click fallback still works.
 *
 * This component is purely visual — it does NOT manage slot state.
 * Parent must pass onPick for the click fallback path.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { TeamCode } from "@/lib/sim/types";

interface DraggableTeamChipProps {
  code: TeamCode;
  /** Whether this team is already selected / in a slot. */
  selected?: boolean;
  /** Disable picking (e.g. all slots full and team not selected). */
  disabled?: boolean;
  /** Click/keyboard fallback handler. */
  onPick: (code: TeamCode) => void;
  /** Extra classes forwarded to the outer button. */
  className?: string;
}

export function DraggableTeamChip({
  code,
  selected = false,
  disabled = false,
  onPick,
  className = "",
}: DraggableTeamChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `team-${code}`,
      data: { code },
      disabled,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onPick(code)}
      aria-grabbed={isDragging}
      {...listeners}
      {...attributes}
      style={style}
      className={[
        "touch-none select-none font-mono text-[13px] tabular-nums transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
        isDragging ? "opacity-50 z-50" : "",
        selected
          ? "border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-root)]"
          : disabled
            ? "border border-[var(--border-default)] text-[var(--text-quiet)] cursor-not-allowed"
            : "border border-[var(--border-default)] bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)] cursor-grab active:cursor-grabbing",
        className,
      ].join(" ")}
    >
      {code}
    </button>
  );
}
