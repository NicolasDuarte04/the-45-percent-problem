"use client";

/**
 * Interactive variant of TeamGrid for the build modes.
 *
 * Renders all 48 qualifiers in alphabetical order. Selected teams render
 * INVERTED (solid bone fill, dark text) per design v1 §2.1. Disabled teams
 * render at 40% opacity and are not clickable.
 *
 * Phase C: accepts an optional `draggable` prop. When true, each team item
 * is wrapped with DraggableTeamChip so users can drag teams to droppable
 * slots in addition to the existing click-to-select interaction.
 */

import { TEAMS } from "@/lib/data/wc2026-official-draw";
import { DraggableTeamChip } from "@/components/simulator/DraggableTeamChip";
import type { TeamCode } from "@/lib/sim/types";

interface TeamPickerGridProps {
  /** Codes currently selected. Renders inverted. */
  selected: ReadonlySet<TeamCode>;
  /** Codes that should be unselectable (e.g. already chosen elsewhere). */
  disabled?: ReadonlySet<TeamCode>;
  /** Click handler. Receives the FIFA code. */
  onPick: (code: TeamCode) => void;
  /** When true, each item is a DraggableTeamChip; click still works. */
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
            {draggable ? (
              <DraggableTeamChip
                code={code}
                selected={isSelected}
                disabled={isDisabled}
                onPick={onPick}
                className="flex w-full flex-col items-center justify-center p-3 text-center"
              />
            ) : (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) onPick(code);
                }}
                className={[
                  "block w-full p-3 text-center transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                  isSelected
                    ? "bg-[var(--text-primary)] text-[var(--bg-root)]"
                    : "bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]",
                  isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
              >
                <div className="font-mono text-[20px] tabular-nums tracking-[0.05em] sm:text-[24px]">
                  {code}
                </div>
                <div
                  className={`mt-1 font-sans text-[10px] leading-tight sm:text-[11px] ${
                    isSelected
                      ? "text-[var(--bg-root)] opacity-70"
                      : "text-[var(--text-quiet)]"
                  }`}
                >
                  {team.display_name}
                </div>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
