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
  TEAMS,
  type GroupLetter,
} from "@/lib/data/wc2026-official-draw";
import { Flag } from "@/components/primitives/Flag";
import { LiveAgreementGauge } from "@/components/simulator/reality/LiveAgreementGauge";
import { BracketTree } from "@/components/simulator/bracket/BracketTree";
import { AccentPulse } from "@/components/simulator/AccentPulse";
import {
  SubmitErrorPanel,
  type SubmitErrorKind,
} from "@/components/simulator/SubmitErrorPanel";
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

/**
 * Phase E §6 (B.4) — 12 group-3rd-place candidates.
 *
 * For each of the 12 groups, after the user has named winner + runner-up,
 * exactly two teams remain. We deterministically nominate one of those
 * two as the group's "best 3rd-place candidate" using the alphabetically
 * first FIFA code as the tie-break. The 12 candidates are rendered as a
 * single horizontal row; the user picks 8 of 12 to advance to the R32.
 *
 * The deterministic nomination is a simulator simplification: the
 * tournament's actual 3rd-place tie-break uses points / GD / GS / H2H,
 * which we don't compute during build. The trade-off matches the
 * spec's "single horizontal row of 12 group-3rd chips" framing.
 */
function thirdsCandidatesByGroup(s: BuildState): Record<GroupLetter, TeamCode | null> {
  const out = {} as Record<GroupLetter, TeamCode | null>;
  const byGroup = teamsByGroup();
  for (const g of GROUPS) {
    const sel = s.groupSelections[g];
    if (!sel.winner || !sel.runnerUp) {
      out[g] = null;
      continue;
    }
    const remaining = byGroup[g]
      .filter((c) => c !== sel.winner && c !== sel.runnerUp)
      .sort();
    out[g] = remaining[0] ?? null;
  }
  return out;
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

// ── Main component ─────────────────────────────────────────────────────────────

export function ModeFullBracket({
  modelSha,
  snapshotSha,
}: ModeFullBracketProps) {
  const router = useRouter();
  const [state, setState] = useState<BuildState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [errorKind, setErrorKind] = useState<SubmitErrorKind | null>(null);
  // Phase E §6 (B.3) — per-group dim state and manual-focus override.
  // dimmedGroups holds the set of groups currently dimmed (50% opacity);
  // a fresh group-completion schedules a 700ms timer before adding to
  // the set so the user sees their work land before it dims. Manual
  // focus overrides "next alphabetical incomplete" and lifts dim.
  const [dimmedGroups, setDimmedGroups] = useState<Set<GroupLetter>>(new Set());
  const [manualFocusGroup, setManualFocusGroup] = useState<GroupLetter | null>(null);
  // Phase E §8 (D.3) — per-group pulse counter. Bumped when a group
  // transitions incomplete → complete; <AccentPulse> re-mounts and
  // fires the 250ms warm-tint flash.
  const [groupPulseKeys, setGroupPulseKeys] = useState<Record<GroupLetter, number>>(
    () => {
      const out = {} as Record<GroupLetter, number>;
      for (const g of GROUPS) out[g] = 0;
      return out;
    },
  );
  const hydratedRef = useRef(false);
  const prevCompleteRef = useRef<Set<GroupLetter>>(new Set());
  const dimTimersRef = useRef<Partial<Record<GroupLetter, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    if (hydratedRef.current) return;
    const hydrated = hydrate();
    setState(hydrated);
    // Phase E §6 (B.3) — groups already complete on hydrate render dim
    // immediately, no transition. Seed prevCompleteRef so the watcher
    // effect below doesn't fire 700ms timers for hydrated groups.
    const initialComplete = new Set<GroupLetter>();
    for (const g of GROUPS) {
      const sel = hydrated.groupSelections[g];
      if (sel.winner && sel.runnerUp) initialComplete.add(g);
    }
    setDimmedGroups(initialComplete);
    prevCompleteRef.current = initialComplete;
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeInflight("full_bracket", state);
  }, [state]);

  // Phase E §6 (B.3) — watch group completions. A fresh transition from
  // incomplete → complete schedules a per-group 700ms timer before
  // dimming. A transition the other way (user changed a pick) un-dims
  // immediately AND cancels any pending dim timer for that group.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const nowComplete = new Set<GroupLetter>();
    for (const g of GROUPS) {
      const sel = state.groupSelections[g];
      if (sel.winner && sel.runnerUp) nowComplete.add(g);
    }
    for (const g of GROUPS) {
      const wasComplete = prevCompleteRef.current.has(g);
      const isComplete = nowComplete.has(g);
      if (!wasComplete && isComplete) {
        // Fire the §8 (D.3) accent pulse on this group immediately.
        setGroupPulseKeys((prev) => ({ ...prev, [g]: prev[g] + 1 }));
        if (dimTimersRef.current[g]) clearTimeout(dimTimersRef.current[g]);
        dimTimersRef.current[g] = setTimeout(() => {
          delete dimTimersRef.current[g];
          setDimmedGroups((prev) => {
            const next = new Set(prev);
            next.add(g);
            return next;
          });
        }, 700);
      } else if (wasComplete && !isComplete) {
        if (dimTimersRef.current[g]) {
          clearTimeout(dimTimersRef.current[g]);
          delete dimTimersRef.current[g];
        }
        setDimmedGroups((prev) => {
          if (!prev.has(g)) return prev;
          const next = new Set(prev);
          next.delete(g);
          return next;
        });
      }
    }
    prevCompleteRef.current = nowComplete;
  }, [state.groupSelections]);

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
    setErrorKind(null);
    // Phase E §6 (B.3) — re-activating a completed (dimmed) group lifts
    // dim and pins focus to it. While the user is mid-picking in an
    // incomplete group, leave focus to the natural next-alphabetical
    // progression so completing a group cleanly hands off to the next.
    if (dimmedGroups.has(g)) {
      setManualFocusGroup(g);
      setDimmedGroups((prev) => {
        const next = new Set(prev);
        next.delete(g);
        return next;
      });
    } else if (manualFocusGroup && manualFocusGroup !== g) {
      // User pivoted to a different group — clear the manual override so
      // auto-focus tracks the new group naturally.
      setManualFocusGroup(null);
    }
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
    setErrorKind(null);
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

  function handleAdvance(idx: number, code: TeamCode | null) {
    if (!code) return;
    setErrorKind(null);
    setState((prev) => {
      const next = [...prev.koAdvancers];
      next[idx] = code;
      const stageStart =
        idx < 16 ? 16 : idx < 24 ? 24 : idx < 28 ? 28 : idx < 30 ? 30 : 31;
      for (let i = stageStart; i < 31; i++) next[i] = null;
      return { ...prev, koAdvancers: next };
    });
  }

  function handleReset() {
    setState(emptyState());
    clearInflight();
    setErrorKind(null);
  }

  async function handleSubmit() {
    if (!isResolved(state) || submitting) return;
    const groupWinners = GROUPS.map((g) => state.groupSelections[g].winner!);
    const groupRunnersUp = GROUPS.map((g) => state.groupSelections[g].runnerUp!);
    const bestThirds = state.bestThirds as TeamCode[];
    const koAdvancers = state.koAdvancers as TeamCode[];

    setSubmitting(true);
    setErrorKind(null);
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
    setErrorKind(result.kind);
  }

  const groupsDone = allGroupsComplete(state);
  const thirdsDone = allBestThirdsComplete(state);
  const koUnlocked = r32Available(state);
  const resolved = isResolved(state);
  const candidatesByGroup = useMemo(() => thirdsCandidatesByGroup(state), [state]);
  const selectedThirds = new Set(state.bestThirds.filter(Boolean) as TeamCode[]);

  // Phase E §6 (B.3) — focused group: manual override else next
  // alphabetical incomplete group.
  const nextIncompleteGroup =
    GROUPS.find((g) => {
      const sel = state.groupSelections[g];
      return !(sel.winner && sel.runnerUp);
    }) ?? null;
  const focusedGroup: GroupLetter | null = manualFocusGroup ?? nextIncompleteGroup;

  return (
    <>
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

        {/* Step 1 — Groups. Phase E §8 (D.1) — serif conversational
            voice replaces the bone-dry "STEP 1 — GROUP STAGE" header. */}
        <div className="mt-8">
          <h2 className="font-serif text-[20px] leading-[1.3] text-[var(--text-primary)] sm:text-[22px]">
            First, rank the groups.
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {GROUPS.map((g) => {
              const sel = state.groupSelections[g];
              const isComplete = Boolean(sel.winner && sel.runnerUp);
              const isFocused = focusedGroup === g;
              // The focused group is never visually dim, even if its
              // dim timer already fired (Phase E §6 (B.3) "the dim lifts").
              const isDimmed = dimmedGroups.has(g) && !isFocused;
              return (
                <li key={g}>
                  <div
                    role="group"
                    aria-label={`Group ${g}`}
                    style={{
                      opacity: isDimmed ? 0.5 : 1,
                      borderColor: isFocused ? "var(--accent-warm)" : "var(--border-default)",
                    }}
                    className="relative border p-3"
                  >
                    <AccentPulse triggerKey={groupPulseKeys[g]} />
                    <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
                      Group {g}
                    </div>
                    {isComplete ? (
                      <span className="pointer-events-none absolute right-2 top-2 font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
                        [ Done ]
                      </span>
                    ) : null}
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Step 2 — Best 3rd-place teams. Phase E §6 (B.4) restructure:
            a single horizontal row of 12 chips (one per group) with a
            "Pick 8 of 12" counter. Q4: fully toggleable, no commit
            moment, picks lock only when the user advances to Step 3. */}
        {groupsDone ? (
          <div className="mt-10">
            <h2 className="font-serif text-[20px] leading-[1.3] text-[var(--text-primary)] sm:text-[22px]">
              Pick the eight 3rd-place teams that move on.
            </h2>
            <p className="mt-1 font-sans text-[12px] text-[var(--text-quiet)]">
              {selectedThirds.size === 8
                ? "8 of 12 selected — knockout bracket unlocked."
                : `Pick ${8 - selectedThirds.size} of ${12 - selectedThirds.size} remaining 3rd-place teams to advance.`}
            </p>

            <ol
              aria-label="Group 3rd-place candidates"
              className="mt-4 grid grid-cols-4 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-6 md:grid-cols-12"
            >
              {GROUPS.map((g) => {
                const candidate = candidatesByGroup[g];
                const isPicked = candidate ? selectedThirds.has(candidate) : false;
                const atCap = !isPicked && selectedThirds.size >= 8;
                return (
                  <li key={g} className="contents">
                    <button
                      type="button"
                      disabled={!candidate || atCap}
                      onClick={() => candidate && handleThirdPick(candidate)}
                      aria-pressed={isPicked}
                      aria-label={
                        candidate
                          ? `Group ${g} 3rd-place candidate ${candidate}; ${isPicked ? "deselect" : "select"} to advance`
                          : `Group ${g} candidate unresolved`
                      }
                      className={[
                        "flex h-14 flex-col items-center justify-center gap-0.5 px-1 font-mono text-[12px] tabular-nums transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                        isPicked
                          ? "bg-[color-mix(in_srgb,var(--accent-warm)_18%,var(--bg-root))] text-[var(--accent-warm)] border border-[var(--accent-warm)]"
                          : atCap
                            ? "bg-[var(--bg-root)] text-[var(--text-quiet)] cursor-not-allowed"
                            : "bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)] cursor-pointer",
                      ].join(" ")}
                    >
                      <span className="text-[8px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
                        Group {g}
                      </span>
                      {candidate ? (
                        <span className="inline-flex items-center gap-1">
                          <Flag code={candidate} size={16} />
                          <span>{candidate}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--text-quiet)]">—</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="mt-8 font-sans text-[12px] text-[var(--text-quiet)]">
            Complete all 12 groups to unlock Step 2.
          </p>
        )}

        {/* Step 3 — Knockout bracket. Phase E §7 (C.1–C.4) — absolute-
            positioned tournament tree with right-angle SVG connectors,
            winner highlight + loser fade, layoutId chip propagation,
            mobile horizontal scroll + round breadcrumb. */}
        {koUnlocked ? (
          <div className="mt-10">
            <h2 className="font-serif text-[20px] leading-[1.3] text-[var(--text-primary)] sm:text-[22px]">
              Now play the knockouts.
            </h2>
            <BracketTree
              getMatch={(level, m) => {
                if (level === 0) return r32Pair(m, state);
                if (level === 1) return r16Pair(m, state);
                if (level === 2) return qfPair(m, state);
                if (level === 3) return sfPair(m, state);
                return finalPair(state);
              }}
              getAdvancer={(level, m) => {
                if (level === 0) return state.koAdvancers[m];
                if (level === 1) return state.koAdvancers[16 + m];
                if (level === 2) return state.koAdvancers[24 + m];
                if (level === 3) return state.koAdvancers[28 + m];
                return state.koAdvancers[30];
              }}
              onAdvance={(level, m, code) => {
                const idx =
                  level === 0
                    ? m
                    : level === 1
                      ? 16 + m
                      : level === 2
                        ? 24 + m
                        : level === 3
                          ? 28 + m
                          : 30;
                handleAdvance(idx, code);
              }}
            />
          </div>
        ) : groupsDone && !thirdsDone ? (
          <p className="mt-8 font-sans text-[12px] text-[var(--text-quiet)]">
            Pick all 8 best 3rd-place teams above to unlock the knockout bracket.
          </p>
        ) : null}

        {/* Live Agreement Gauge — show-threshold per Phase D §4.2:
            once the champion is named, the gauge activates. Other
            knockout cells can still be partial. */}
        <div className="mt-8 max-w-md">
          <LiveAgreementGauge
            count={liveScore?.count ?? 0}
            total={liveScore?.total ?? 10000}
            isComplete={Boolean(state.koAdvancers[30])}
            variant="compact"
          />
        </div>

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
          {errorKind ? (
            <SubmitErrorPanel
              kind={errorKind}
              onRetry={handleSubmit}
              retryInFlight={submitting}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

