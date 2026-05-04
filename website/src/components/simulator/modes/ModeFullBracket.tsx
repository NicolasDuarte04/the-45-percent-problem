"use client";

/**
 * Full Bracket build mode — Phase C (R32 migration + DnD).
 *
 * WC 2026 real bracket:
 *   Group stage → 24 direct qualifiers (12 winners + 12 runners-up)
 *                + 8 best 3rd-place teams = 32 KO entrants.
 *   R32 (16 matches) → R16 (8) → QF (4) → SF (2) → F (1) = 31 advancers.
 *
 * UI flow:
 *   1. Pick winner + runner-up for each of the 12 groups (24 picks) — click only.
 *   2. Pick 8 best 3rd-place teams — click or drag to T1–T8 slots.
 *   3. Click-to-advance through R32 → R16 → QF → SF → F (31 picks).
 *   Submit when all 63 picks are filled.
 *
 * koAdvancers flat layout:
 *   [0..15]  R32 winners · [16..23] R16 winners
 *   [24..27] QF winners  · [28..29] SF winners · [30] champion
 *
 * Per Patch v2.1 §3: no rarity band or 1-in-N during build; only the
 * live percentage is shown once groups are complete.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  TEAMS,
  type GroupLetter,
} from "@/lib/data/wc2026-official-draw";
import {
  clearInflight,
  readInflightForMode,
  writeInflight,
} from "@/lib/sim/inflightStore";
import { submitPrediction } from "@/lib/sim/predictionsApi";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import type { FullBracketScenario, TeamCode } from "@/lib/sim/types";

interface ModeFullBracketProps {
  modelSha: string;
  snapshotSha: string;
}

const GROUPS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
];

// Official FIFA WC 2026 R32 bracket (M73–M88, corrected for two data typos
// in wc2026-official-draw.ts: M76 home was "2C" → "2G"; M79 home was "1A" → "2K").
// T1–T8 map to bestThirds[0..7] in match-date order.
const R32_PAIRINGS: ReadonlyArray<readonly [string, string]> = [
  ["1A", "T1"],   // M73
  ["1L", "T2"],   // M74
  ["1G", "T3"],   // M75
  ["2G", "2F"],   // M76
  ["1E", "T4"],   // M77
  ["1F", "2C"],   // M78
  ["2K", "T5"],   // M79
  ["2A", "2B"],   // M80
  ["1H", "T6"],   // M81
  ["1C", "2L"],   // M82
  ["1B", "2H"],   // M83
  ["1J", "T7"],   // M84
  ["2D", "2I"],   // M85
  ["1K", "2J"],   // M86
  ["1I", "T8"],   // M87
  ["1D", "2E"],   // M88
] as const;

interface GroupSelection {
  winner: TeamCode | null;
  runnerUp: TeamCode | null;
}

interface BuildState {
  groupSelections: Record<GroupLetter, GroupSelection>;
  bestThirds: (TeamCode | null)[];
  koAdvancers: (TeamCode | null)[];
}

function emptyState(): BuildState {
  const groupSelections = {} as Record<GroupLetter, GroupSelection>;
  for (const g of GROUPS) groupSelections[g] = { winner: null, runnerUp: null };
  return {
    groupSelections,
    bestThirds: Array(8).fill(null),
    koAdvancers: Array(31).fill(null),
  };
}

function hydrate(): BuildState {
  const cached = readInflightForMode("full_bracket") as Partial<BuildState> | null;
  const base = emptyState();
  if (!cached || typeof cached !== "object") return base;
  if (cached.groupSelections && typeof cached.groupSelections === "object") {
    for (const g of GROUPS) {
      const sel = (cached.groupSelections as Record<string, GroupSelection>)[g];
      if (sel && typeof sel === "object") {
        if (typeof sel.winner === "string" && /^[A-Z]{3}$/.test(sel.winner))
          base.groupSelections[g].winner = sel.winner as TeamCode;
        if (typeof sel.runnerUp === "string" && /^[A-Z]{3}$/.test(sel.runnerUp))
          base.groupSelections[g].runnerUp = sel.runnerUp as TeamCode;
      }
    }
  }
  if (Array.isArray(cached.bestThirds)) {
    for (let i = 0; i < 8; i++) {
      const v = cached.bestThirds[i];
      base.bestThirds[i] =
        typeof v === "string" && /^[A-Z]{3}$/.test(v) ? (v as TeamCode) : null;
    }
  }
  if (Array.isArray(cached.koAdvancers)) {
    for (let i = 0; i < 31; i++) {
      const v = cached.koAdvancers[i];
      base.koAdvancers[i] =
        typeof v === "string" && /^[A-Z]{3}$/.test(v) ? (v as TeamCode) : null;
    }
  }
  return base;
}

function teamsByGroup(): Record<GroupLetter, TeamCode[]> {
  const byGroup = {} as Record<GroupLetter, TeamCode[]>;
  for (const g of GROUPS) byGroup[g] = [];
  for (const team of TEAMS) byGroup[team.group as GroupLetter].push(team.fifa_code as TeamCode);
  return byGroup;
}

function resolveSource(source: string, s: BuildState): TeamCode | null {
  const winner = source.match(/^1([A-L])$/);
  if (winner) return s.groupSelections[winner[1] as GroupLetter].winner;
  const runner = source.match(/^2([A-L])$/);
  if (runner) return s.groupSelections[runner[1] as GroupLetter].runnerUp;
  const t3 = source.match(/^T([1-8])$/);
  if (t3) return s.bestThirds[parseInt(t3[1], 10) - 1];
  return null;
}

function allGroupsComplete(s: BuildState): boolean {
  return GROUPS.every((g) => s.groupSelections[g].winner && s.groupSelections[g].runnerUp);
}

function allBestThirdsComplete(s: BuildState): boolean {
  return s.bestThirds.every((t) => t !== null);
}

function r32Available(s: BuildState): boolean {
  return allGroupsComplete(s) && allBestThirdsComplete(s);
}

function isResolved(s: BuildState): boolean {
  if (!r32Available(s)) return false;
  return s.koAdvancers.every((a) => a !== null);
}

function availableThirds(s: BuildState): TeamCode[] {
  const taken = new Set<TeamCode>();
  for (const g of GROUPS) {
    if (s.groupSelections[g].winner) taken.add(s.groupSelections[g].winner!);
    if (s.groupSelections[g].runnerUp) taken.add(s.groupSelections[g].runnerUp!);
  }
  for (const t of s.bestThirds) {
    if (t) taken.add(t);
  }
  return TEAMS.map((t) => t.fifa_code as TeamCode).filter((c) => !taken.has(c));
}

// ── KO pair resolvers ─────────────────────────────────────────────────────────

function r32Pair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  const [h, a] = R32_PAIRINGS[idx];
  return { home: resolveSource(h, s), away: resolveSource(a, s) };
}

function r16Pair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[idx * 2], away: s.koAdvancers[idx * 2 + 1] };
}

function qfPair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[16 + idx * 2], away: s.koAdvancers[16 + idx * 2 + 1] };
}

function sfPair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[24 + idx * 2], away: s.koAdvancers[24 + idx * 2 + 1] };
}

function finalPair(s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[28], away: s.koAdvancers[29] };
}

// ── Droppable T-slot (best thirds) ────────────────────────────────────────────

interface FBThirdSlotProps {
  tIdx: number;
  code: TeamCode | null;
}

function FBThirdSlot({ tIdx, code }: FBThirdSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `t${tIdx}` });
  return (
    <div
      ref={setNodeRef}
      className={[
        "flex h-14 flex-col items-center justify-center bg-[var(--bg-root)] font-mono transition-colors duration-100",
        isOver ? "ring-1 ring-[var(--accent-focus)] ring-inset" : "",
      ].join(" ")}
      aria-label={code ? `T${tIdx + 1}: ${code}` : `T${tIdx + 1}: empty`}
    >
      <span className="text-[9px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
        T{tIdx + 1}
      </span>
      <span className="mt-0.5 text-[16px] tabular-nums text-[var(--text-primary)]">
        {code ?? "—"}
      </span>
    </div>
  );
}

// ── Draggable thirds pool chip ────────────────────────────────────────────────

interface FBThirdChipProps {
  code: TeamCode;
  isPicked: boolean;
  isFull: boolean;
  onPick: (code: TeamCode) => void;
}

function FBThirdChip({ code, isPicked, isFull, onPick }: FBThirdChipProps) {
  const disabled = !isPicked && isFull;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `third-${code}`,
    data: { code },
    disabled,
  });
  // Extract aria-pressed from dnd-kit attributes so we can set our own toggle value.
  const { "aria-pressed": _ap, ...restAttributes } = attributes;
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onPick(code)}
      aria-pressed={isPicked}
      aria-grabbed={isDragging}
      {...listeners}
      {...restAttributes}
      style={style}
      className={[
        "flex h-10 items-center justify-center font-mono text-[12px] tabular-nums transition-colors duration-100 touch-none select-none focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
        isDragging ? "opacity-50" : "",
        isPicked
          ? "bg-[var(--text-primary)] text-[var(--bg-root)]"
          : disabled
            ? "bg-[var(--bg-root)] text-[var(--text-quiet)] cursor-not-allowed"
            : "bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)] cursor-grab active:cursor-grabbing",
      ].join(" ")}
    >
      {code}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ModeFullBracket({
  modelSha,
  snapshotSha,
}: ModeFullBracketProps) {
  const router = useRouter();
  const [state, setState] = useState<BuildState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [activeThirdCode, setActiveThirdCode] = useState<TeamCode | null>(null);
  const hydratedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    setState(hydrate());
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeInflight("full_bracket", state);
  }, [state]);

  const groupTeams = useMemo(() => teamsByGroup(), []);

  // Live Reality Score — shown as partial percentage once groups + thirds done.
  const liveScore = useMemo(() => {
    if (!r32Available(state)) return null;
    const champion = state.koAdvancers[30];
    if (!champion) return null;
    const scenario: FullBracketScenario = {
      groupWinners: GROUPS.map((g) => state.groupSelections[g].winner!),
      groupRunnersUp: GROUPS.map((g) => state.groupSelections[g].runnerUp!),
      bestThirds: state.bestThirds as TeamCode[],
      koAdvancers: state.koAdvancers.map((a) => a ?? champion) as TeamCode[],
    };
    const canonical = canonicalizeScenario("full_bracket", scenario);
    return computeRealityScore("full_bracket", canonical, scenario);
  }, [state]);

  function handleGroupClick(g: GroupLetter, code: TeamCode) {
    setErrorCopy(null);
    setState((prev) => {
      const sel = prev.groupSelections[g];
      let nextSel: GroupSelection;
      if (sel.winner === code) {
        nextSel = { winner: null, runnerUp: code };
        if (sel.runnerUp === code) nextSel = { winner: null, runnerUp: null };
      } else if (sel.runnerUp === code) {
        nextSel = { ...sel, runnerUp: null };
      } else if (!sel.winner) {
        nextSel = { ...sel, winner: code };
      } else if (!sel.runnerUp) {
        nextSel = { ...sel, runnerUp: code };
      } else {
        nextSel = { ...sel, runnerUp: code };
      }
      return {
        ...prev,
        groupSelections: { ...prev.groupSelections, [g]: nextSel },
        bestThirds: Array(8).fill(null),
        koAdvancers: Array(31).fill(null),
      };
    });
  }

  function handleThirdPick(code: TeamCode) {
    setErrorCopy(null);
    setState((prev) => {
      const at = prev.bestThirds.indexOf(code);
      if (at !== -1) {
        const next = [...prev.bestThirds];
        next[at] = null;
        return { ...prev, bestThirds: next, koAdvancers: Array(31).fill(null) };
      }
      const empty = prev.bestThirds.indexOf(null);
      if (empty === -1) return prev;
      const next = [...prev.bestThirds];
      next[empty] = code;
      return { ...prev, bestThirds: next, koAdvancers: Array(31).fill(null) };
    });
  }

  function handleThirdDrop(tIdx: number, code: TeamCode) {
    setErrorCopy(null);
    setState((prev) => {
      const at = prev.bestThirds.indexOf(code);
      if (at === tIdx) return prev;
      const next = [...prev.bestThirds];
      if (at !== -1) next[at] = null;
      next[tIdx] = code;
      return { ...prev, bestThirds: next, koAdvancers: Array(31).fill(null) };
    });
  }

  function handleAdvance(idx: number, code: TeamCode | null) {
    if (!code) return;
    setErrorCopy(null);
    setState((prev) => {
      const next = [...prev.koAdvancers];
      next[idx] = code;
      const stageStart =
        idx < 16 ? 16 : idx < 24 ? 24 : idx < 28 ? 28 : idx < 30 ? 30 : 31;
      for (let i = stageStart; i < 31; i++) next[i] = null;
      return { ...prev, koAdvancers: next };
    });
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveThirdCode((active.data.current?.code as TeamCode) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveThirdCode(null);
    const code = active.data.current?.code as TeamCode | undefined;
    if (!code || !over) return;
    const overId = over.id as string;
    const match = overId.match(/^t(\d)$/);
    if (match) {
      const tIdx = parseInt(match[1], 10);
      if (tIdx >= 0 && tIdx < 8) handleThirdDrop(tIdx, code);
    }
  }

  function handleReset() {
    setState(emptyState());
    clearInflight();
    setErrorCopy(null);
  }

  async function handleSubmit() {
    if (!isResolved(state) || submitting) return;
    const groupWinners = GROUPS.map((g) => state.groupSelections[g].winner!);
    const groupRunnersUp = GROUPS.map((g) => state.groupSelections[g].runnerUp!);
    const bestThirds = state.bestThirds as TeamCode[];
    const koAdvancers = state.koAdvancers as TeamCode[];

    setSubmitting(true);
    setErrorCopy(null);
    const result = await submitPrediction({
      mode: "full_bracket",
      scenario: { groupWinners, groupRunnersUp, bestThirds, koAdvancers },
      modelSha,
      snapshotSha,
    });
    if (result.kind === "ok") {
      clearInflight();
      router.push(`/scenario/p/${result.prediction.id}`);
      return;
    }
    setSubmitting(false);
    setErrorCopy(
      result.kind === "rateLimit"
        ? "Too many predictions in a short window. Wait a moment and try again."
        : result.kind === "network"
          ? "Could not reach the server. Check your connection and try again."
          : result.kind === "invalid"
            ? "Something in the scenario looks wrong. Reset and try again."
            : "Something went wrong on our side. Try again in a moment.",
    );
  }

  const groupsDone = allGroupsComplete(state);
  const thirdsDone = allBestThirdsComplete(state);
  const koUnlocked = r32Available(state);
  const resolved = isResolved(state);
  const thirds = availableThirds(state);
  const selectedThirds = new Set(state.bestThirds.filter(Boolean) as TeamCode[]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <section
        aria-labelledby="fb-heading"
        data-canvas="simulator"
        className="pt-10 pb-12"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h1
            id="fb-heading"
            className="font-serif text-[28px] leading-[1.1] sm:text-[40px] text-[var(--text-primary)]"
          >
            Call the whole tournament.
          </h1>
          <button
            type="button"
            onClick={handleReset}
            className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)] hover:text-[var(--text-primary)]"
          >
            [ Reset ]
          </button>
        </div>

        <p className="mt-3 font-sans text-[14px] text-[var(--text-tertiary)]">
          Twelve group winners, twelve runners-up, eight best 3rd-place teams, then the full knockout bracket.
        </p>

        {/* Step 1 — Groups */}
        <div className="mt-8">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
            Step 1 — Group Stage
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {GROUPS.map((g) => {
              const sel = state.groupSelections[g];
              return (
                <li key={g}>
                  <fieldset className="border border-[var(--border-default)] p-3">
                    <legend className="px-1 font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
                      Group {g}
                    </legend>
                    <ul className="mt-1 space-y-1">
                      {groupTeams[g].map((code) => {
                        const rank =
                          sel.winner === code ? "1" : sel.runnerUp === code ? "2" : "";
                        const inverted = rank !== "";
                        return (
                          <li key={code} className="contents">
                            <button
                              type="button"
                              onClick={() => handleGroupClick(g, code)}
                              className={[
                                "flex w-full items-center justify-between border px-2 py-1.5 font-mono text-[13px] tabular-nums transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                                inverted
                                  ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-root)]"
                                  : "border-[var(--border-default)] bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]",
                              ].join(" ")}
                            >
                              <span>{code}</span>
                              <span className="text-[10px] opacity-70">{rank}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Step 2 — Best 3rd-place teams */}
        {groupsDone ? (
          <div className="mt-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
              Step 2 — Best 3rd-Place Teams ({selectedThirds.size}/8)
            </h2>
            <p className="mt-1 font-sans text-[12px] text-[var(--text-quiet)]">
              Pick the 8 best 3rd-place teams that advance to the Round of 32. Click or drag to a slot.
            </p>

            {/* T-slot display (droppable) */}
            <ol
              aria-label="Best 3rd-place slots"
              className="mt-4 grid grid-cols-4 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-8"
            >
              {state.bestThirds.map((code, idx) => (
                <li key={idx} className="contents">
                  <FBThirdSlot tIdx={idx} code={code} />
                </li>
              ))}
            </ol>

            {/* Thirds pool (draggable + clickable) */}
            <ul className="mt-4 grid grid-cols-4 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-6">
              {thirds
                .concat(
                  (state.bestThirds.filter(Boolean) as TeamCode[]).filter(
                    (c) => !thirds.includes(c),
                  ),
                )
                .map((code) => (
                  <li key={code} className="contents">
                    <FBThirdChip
                      code={code}
                      isPicked={selectedThirds.has(code)}
                      isFull={selectedThirds.size >= 8}
                      onPick={handleThirdPick}
                    />
                  </li>
                ))}
            </ul>
          </div>
        ) : (
          <p className="mt-8 font-sans text-[12px] text-[var(--text-quiet)]">
            Complete all 12 groups to unlock the Best 3rd-Place step.
          </p>
        )}

        {/* Step 3 — Knockout bracket */}
        {koUnlocked ? (
          <div className="mt-10">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
              Step 3 — Knockout Bracket
            </h2>

            <KOStage
              label="Round of 32"
              count={16}
              getMatch={(i) => r32Pair(i, state)}
              getAdvancer={(i) => state.koAdvancers[i]}
              onAdvance={(i, code) => handleAdvance(i, code)}
            />
            <KOStage
              label="Round of 16"
              count={8}
              getMatch={(i) => r16Pair(i, state)}
              getAdvancer={(i) => state.koAdvancers[16 + i]}
              onAdvance={(i, code) => handleAdvance(16 + i, code)}
            />
            <KOStage
              label="Quarterfinals"
              count={4}
              getMatch={(i) => qfPair(i, state)}
              getAdvancer={(i) => state.koAdvancers[24 + i]}
              onAdvance={(i, code) => handleAdvance(24 + i, code)}
            />
            <KOStage
              label="Semifinals"
              count={2}
              getMatch={(i) => sfPair(i, state)}
              getAdvancer={(i) => state.koAdvancers[28 + i]}
              onAdvance={(i, code) => handleAdvance(28 + i, code)}
            />
            <KOStage
              label="Final"
              count={1}
              getMatch={() => finalPair(state)}
              getAdvancer={() => state.koAdvancers[30]}
              onAdvance={(_, code) => handleAdvance(30, code)}
            />
          </div>
        ) : groupsDone && !thirdsDone ? (
          <p className="mt-8 font-sans text-[12px] text-[var(--text-quiet)]">
            Pick all 8 best 3rd-place teams above to unlock the knockout bracket.
          </p>
        ) : null}

        {/* Live partial Reality Score — percentage only, per v2.1 §3 */}
        {liveScore && !resolved ? (
          <div className="mt-8 border border-[var(--border-default)] p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
              Partial Reality Score
            </div>
            <div className="mt-1 font-mono text-[28px] tabular-nums text-[var(--text-primary)]">
              {formatPercent(liveScore.count, liveScore.total)}
            </div>
            <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--text-quiet)]">
              {liveScore.count.toLocaleString("en-US")} / {liveScore.total.toLocaleString("en-US")} simulations · champion only
            </div>
          </div>
        ) : null}

        {/* Submit + error */}
        <div className="mt-10 flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!resolved || submitting}
            className={[
              "border px-5 py-3 font-mono text-[13px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
              resolved && !submitting
                ? "border-[var(--text-primary)] text-[var(--text-primary)] hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] cursor-pointer"
                : "border-[var(--border-default)] text-[var(--text-quiet)] cursor-not-allowed",
            ].join(" ")}
          >
            {submitting ? "[ Submitting... ]" : "[ See how the model reacts ]"}
          </button>
          {errorCopy ? (
            <p role="alert" className="font-sans text-[13px] text-[var(--state-dead)]">
              {errorCopy}
            </p>
          ) : null}
        </div>
      </section>

      <DragOverlay dropAnimation={null}>
        {activeThirdCode ? (
          <div className="border border-[var(--text-primary)] bg-[var(--text-primary)] px-3 py-2 font-mono text-[14px] tabular-nums text-[var(--bg-root)] shadow-lg">
            {activeThirdCode}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) return "0.00%";
  const pct = (count / total) * 100;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  if (pct < 25) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(0)}%`;
}

// ── Sub-component for a KO stage ──────────────────────────────────────────────

interface KOStageProps {
  label: string;
  count: number;
  getMatch: (i: number) => { home: TeamCode | null; away: TeamCode | null };
  getAdvancer: (i: number) => TeamCode | null;
  onAdvance: (i: number, code: TeamCode | null) => void;
}

function KOStage({ label, count, getMatch, getAdvancer, onAdvance }: KOStageProps) {
  return (
    <div className="mt-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
        {label}
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => {
          const { home, away } = getMatch(i);
          const advancer = getAdvancer(i);
          return (
            <li
              key={i}
              className="bg-[var(--bg-root)] p-2"
              aria-label={`${label} match ${i + 1}`}
            >
              <button
                type="button"
                disabled={!home}
                onClick={() => onAdvance(i, home)}
                aria-pressed={advancer === home && home !== null}
                className={[
                  "flex w-full items-center justify-between border-b border-[var(--border-default)] px-2 py-1.5 font-mono text-[13px] tabular-nums transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                  advancer === home && home
                    ? "bg-[var(--text-primary)] text-[var(--bg-root)] border-[var(--text-primary)]"
                    : home
                      ? "text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]"
                      : "text-[var(--text-quiet)] cursor-not-allowed",
                ].join(" ")}
              >
                <span>{home ?? "—"}</span>
              </button>
              <button
                type="button"
                disabled={!away}
                onClick={() => onAdvance(i, away)}
                aria-pressed={advancer === away && away !== null}
                className={[
                  "mt-px flex w-full items-center justify-between px-2 py-1.5 font-mono text-[13px] tabular-nums transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                  advancer === away && away
                    ? "bg-[var(--text-primary)] text-[var(--bg-root)]"
                    : away
                      ? "text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]"
                      : "text-[var(--text-quiet)] cursor-not-allowed",
                ].join(" ")}
              >
                <span>{away ?? "—"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
