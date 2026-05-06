"use client";

/**
 * Interactive variant of TeamGrid for the build modes.
 *
 * Renders all 48 qualifiers in alphabetical order. Selected teams render
 * INVERTED (solid bone fill, dark text) per design v1 §2.1. Disabled teams
 * render at 40% opacity and are not clickable.
 *
 * Phase C: accepts an optional `draggable` prop. When true, each cell
 * attaches `useDraggable` so users can drag teams to droppable slots in
 * addition to the existing click-to-select interaction. Visual layout
 * (flag + code + name) is identical between click-only and draggable
 * variants — the picker reads the same in both modes.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { TEAMS } from "@/lib/data/wc2026-official-draw";
import { Flag } from "@/components/primitives/Flag";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import type { TeamCode } from "@/lib/sim/types";

interface TeamPickerGridProps {
  /** Codes currently selected. Renders inverted. */
  selected: ReadonlySet<TeamCode>;
  /** Codes that should be unselectable (e.g. already chosen elsewhere). */
  disabled?: ReadonlySet<TeamCode>;
  /** Click handler. Receives the FIFA code. */
  onPick: (code: TeamCode) => void;
  /** When true, each cell is also a draggable; click still works. */
  draggable?: boolean;
}

export function TeamPickerGrid({
  selected,
  disabled,
  onPick,
  draggable = false,
}: TeamPickerGridProps) {
  const sorted = [...TEAMS].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, "en"),
  );

  return (
    <ul
      role="listbox"
      aria-label="WC 2026 qualifiers"
      className="mt-6 grid grid-cols-3 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-6"
    >
      {sorted.map((team) => {
        const code = team.fifa_code as TeamCode;
        const isSelected = selected.has(code);
        const isDisabled = !isSelected && (disabled?.has(code) ?? false);

        return (
          <li key={code} className="contents">
            <PickerCell
              code={code}
              displayName={team.display_name}
              selected={isSelected}
              disabled={isDisabled}
              onPick={onPick}
              draggable={draggable}
            />
          </li>
        );
      })}
    </ul>
  );
}

interface PickerCellProps {
  code: TeamCode;
  displayName: string;
  selected: boolean;
  disabled: boolean;
  onPick: (code: TeamCode) => void;
  draggable: boolean;
}

function PickerCell({
  code,
  displayName,
  selected,
  disabled,
  onPick,
  draggable,
}: PickerCellProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `team-${code}`,
      data: { code },
      disabled: !draggable || disabled,
    });
  const dropTransition = useReducedMotionAware("drop");

  // Strip props we set explicitly so they aren't overwritten by the spread.
  const {
    role: _role,
    "aria-disabled": _ariaDisabled,
    "aria-pressed": _ariaPressed,
    ...safeAttributes
  } = attributes;
  void _role;
  void _ariaDisabled;
  void _ariaPressed;

  const style =
    draggable && transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  return (
    <button
      ref={draggable ? setNodeRef : undefined}
      type="button"
      role="option"
      aria-selected={selected}
      aria-disabled={disabled}
      aria-grabbed={draggable ? isDragging : undefined}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onPick(code);
      }}
      {...(draggable ? listeners : {})}
      {...(draggable ? safeAttributes : {})}
      style={style}
      className={[
        "flex w-full flex-col items-center justify-center p-3 text-center transition-colors duration-100 touch-none select-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
        isDragging ? "opacity-50 z-50" : "",
        selected
          ? "bg-[var(--text-primary)] text-[var(--bg-root)]"
          : "bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : draggable
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-pointer",
      ].join(" ")}
    >
      <motion.span
        layoutId={`team-chip-${code}`}
        transition={dropTransition}
        className="flex flex-col items-center justify-center"
      >
        <Flag code={code} size={24} />
        <span className="mt-2 font-mono text-[20px] tabular-nums tracking-[0.05em] sm:text-[24px]">
          {code}
        </span>
      </motion.span>
      <div
        className={`mt-1 font-sans text-[10px] leading-tight sm:text-[11px] ${
          selected
            ? "text-[var(--bg-root)] opacity-70"
            : "text-[var(--text-quiet)]"
        }`}
      >
        {displayName}
      </div>
    </button>
  );
}
