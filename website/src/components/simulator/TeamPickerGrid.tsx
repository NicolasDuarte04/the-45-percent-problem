"use client";

/**
 * Interactive variant of TeamGrid for the build modes.
 *
 * V2-01: a small search + sort toolbar sits above the 48-team grid.
 *   - Search: case-insensitive substring match against FIFA code or
 *     display name; debounced 100ms so each keystroke doesn't re-render
 *     the grid synchronously.
 *   - Sort: probability descending (default, tiebreak alphabetical),
 *     alphabetical, or region (UEFA → CONMEBOL → CAF → AFC → CONCACAF
 *     → OFC, alphabetical within each group with mono uppercase
 *     subheaders).
 *
 * All toolbar state is local to this component. The parent (ModeFinalFour
 * or ModeChampionsPath) sees no API change: the picker still emits the
 * same `onPick(code)` callbacks regardless of current sort or filter.
 * In particular, `hasInteracted` and the ghost-fill button in
 * ModeFinalFour continue to read selection state directly, so toggling
 * sort or typing into search never counts as an "interaction" for the
 * purpose of hiding ghost-fill.
 *
 * Renders selected teams INVERTED (solid bone fill, dark text) per
 * design v1 §2.1. Disabled teams render at 40% opacity and are not
 * clickable. When `draggable` is true each cell attaches `useDraggable`
 * so users can drag teams to droppable slots in addition to the
 * existing click-to-select interaction.
 */

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { TEAMS } from "@/lib/data/wc2026-official-draw";
import { Flag } from "@/components/primitives/Flag";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import {
  CONFEDERATION_BY_TEAM,
  CONFEDERATION_ORDER,
  type Confederation,
} from "@/lib/sim/confederations";
import { TEAM_PROBS } from "@/lib/sim/snapshotProbs";
import type { TeamCode } from "@/lib/sim/types";

type SortMode = "probability" | "alphabetical" | "region";

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

type TeamRow = (typeof TEAMS)[number];

function alphabeticalCompare(a: TeamRow, b: TeamRow): number {
  return a.display_name.localeCompare(b.display_name, "en");
}

function probabilityCompare(a: TeamRow, b: TeamRow): number {
  const pa = TEAM_PROBS[a.fifa_code]?.pC ?? 0;
  const pb = TEAM_PROBS[b.fifa_code]?.pC ?? 0;
  if (pb !== pa) return pb - pa;
  return alphabeticalCompare(a, b);
}

export function TeamPickerGrid({
  selected,
  disabled,
  onPick,
  draggable = false,
}: TeamPickerGridProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("probability");

  // Debounce the query so each keystroke doesn't re-sort + re-filter
  // synchronously. 100ms is short enough to feel live, long enough to
  // skip filter work between rapid keystrokes.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 100);
    return () => clearTimeout(handle);
  }, [query]);

  const filteredAndSorted = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const filtered = TEAMS.filter((team) => {
      if (!q) return true;
      const code = team.fifa_code.toLowerCase();
      const name = team.display_name.toLowerCase();
      return code.includes(q) || name.includes(q);
    });

    if (sortMode === "alphabetical") {
      return [...filtered].sort(alphabeticalCompare);
    }
    if (sortMode === "probability") {
      return [...filtered].sort(probabilityCompare);
    }
    // region: sort by confederation order, alphabetical within group.
    const order = new Map<Confederation, number>();
    CONFEDERATION_ORDER.forEach((c, i) => order.set(c, i));
    return [...filtered].sort((a, b) => {
      const ca = CONFEDERATION_BY_TEAM[a.fifa_code];
      const cb = CONFEDERATION_BY_TEAM[b.fifa_code];
      const oa = order.get(ca) ?? 99;
      const ob = order.get(cb) ?? 99;
      if (oa !== ob) return oa - ob;
      return alphabeticalCompare(a, b);
    });
  }, [debouncedQuery, sortMode]);

  // For region sort, we slice the sorted list into per-confederation
  // groups so we can render mono subheader rows between them.
  const regionGroups = useMemo(() => {
    if (sortMode !== "region") return null;
    const groups: { confederation: Confederation; teams: TeamRow[] }[] = [];
    for (const confederation of CONFEDERATION_ORDER) {
      const teams = filteredAndSorted.filter(
        (t) => CONFEDERATION_BY_TEAM[t.fifa_code] === confederation,
      );
      if (teams.length > 0) groups.push({ confederation, teams });
    }
    return groups;
  }, [sortMode, filteredAndSorted]);

  return (
    <div>
      <PickerToolbar
        query={query}
        onQueryChange={setQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
      />
      <ul
        role="listbox"
        aria-label="WC 2026 qualifiers"
        className="mt-3 grid grid-cols-3 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-6"
      >
        {regionGroups
          ? regionGroups.map((group) => (
              <RegionGroup
                key={group.confederation}
                confederation={group.confederation}
                teams={group.teams}
                selected={selected}
                disabled={disabled}
                onPick={onPick}
                draggable={draggable}
              />
            ))
          : filteredAndSorted.map((team) => {
              const code = team.fifa_code as TeamCode;
              const isSelected = selected.has(code);
              const isDisabled =
                !isSelected && (disabled?.has(code) ?? false);
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
    </div>
  );
}

interface PickerToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

function PickerToolbar({
  query,
  onQueryChange,
  sortMode,
  onSortChange,
}: PickerToolbarProps) {
  const hasQuery = query.length > 0;
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex w-full items-center sm:max-w-xs">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Type a team name"
          autoComplete="off"
          spellCheck={false}
          aria-label="Filter teams"
          className="w-full border border-[var(--text-tertiary)] bg-[var(--bg-root)] px-3 py-2 pr-8 font-mono text-[12px] uppercase tracking-[0.05em] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
          style={{ borderRadius: 0 }}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 flex h-5 w-5 items-center justify-center font-mono text-[14px] leading-none text-[var(--text-tertiary)] hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
          >
            {"×"}
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <SortButton
          label="probability ▼"
          active={sortMode === "probability"}
          onClick={() => onSortChange("probability")}
        />
        <SortButton
          label="alphabetical"
          active={sortMode === "alphabetical"}
          onClick={() => onSortChange("alphabetical")}
        />
        <SortButton
          label="region"
          active={sortMode === "region"}
          onClick={() => onSortChange("region")}
        />
      </div>
    </div>
  );
}

interface SortButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function SortButton({ label, active, onClick }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
        active
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--text-tertiary)] text-[var(--text-tertiary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]",
      ].join(" ")}
      style={{ borderRadius: 0 }}
    >
      {label}
    </button>
  );
}

interface RegionGroupProps {
  confederation: Confederation;
  teams: TeamRow[];
  selected: ReadonlySet<TeamCode>;
  disabled?: ReadonlySet<TeamCode>;
  onPick: (code: TeamCode) => void;
  draggable: boolean;
}

function RegionGroup({
  confederation,
  teams,
  selected,
  disabled,
  onPick,
  draggable,
}: RegionGroupProps) {
  return (
    <>
      <li
        className="col-span-3 bg-[var(--bg-root)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] sm:col-span-6"
        role="presentation"
      >
        {confederation}
      </li>
      {teams.map((team) => {
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
    </>
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
