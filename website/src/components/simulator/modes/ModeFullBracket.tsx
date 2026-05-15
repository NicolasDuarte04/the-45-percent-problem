"use client";

/**
 * Full Bracket build mode. Phase C (R32 migration + DnD).
 *
 * WC 2026 real bracket:
 *   Group stage → 24 direct qualifiers (12 winners + 12 runners-up)
 *                + 8 best 3rd-place teams = 32 KO entrants.
 *   R32 (16 matches) → R16 (8) → QF (4) → SF (2) → F (1) = 31 advancers.
 *
 * UI flow:
 *   1. Pick winner + runner-up for each of the 12 groups (24 picks). Click only.
 *   2. Pick 8 best 3rd-place teams. Click or drag to T1-T8 slots.
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
import { motion } from "framer-motion";
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
  type SubmitInvalidIssueView,
} from "@/components/simulator/SubmitErrorPanel";
import {
  clearInflight,
  readInflightForMode,
  writeInflight,
} from "@/lib/sim/inflightStore";
import { submitPrediction } from "@/lib/sim/predictionsApi";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { teamsByGroupSortedByElo } from "@/lib/sim/elo";
import { getRarityBand } from "@/lib/sim/getRarityBand";
import { track, claimFirstPick } from "@/lib/analytics/track";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import type {
  FullBracketScenario,
  FullBracketStage,
  TeamCode,
} from "@/lib/sim/types";

interface ModeFullBracketProps {
  modelSha: string;
  snapshotSha: string;
}

const GROUPS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
];

// Official FIFA WC 2026 R32 bracket (M73-M88, corrected for two data typos
// in wc2026-official-draw.ts: M76 home was "2C" → "2G"; M79 home was "1A" → "2K").
// T1-T8 map to bestThirds[0..7] in match-date order.
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

// "Show all 12" preference is per-mode (executive decision Q2): a user who
// prefers the wall view in Full Bracket may not want it elsewhere. The key
// includes "full_bracket" so other modes wire up their own keys later.
const SHOW_ALL_STORAGE_KEY = "45a:sim:showAll12:full_bracket";

function readShowAllPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SHOW_ALL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeShowAllPreference(showAll: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (showAll) window.localStorage.setItem(SHOW_ALL_STORAGE_KEY, "1");
    else window.localStorage.removeItem(SHOW_ALL_STORAGE_KEY);
  } catch {
    /* swallow: quota errors / privacy mode */
  }
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

// Checkpoint 9 (P1.1) submit-stage detection. The user can submit at any
// natural boundary: groups (12 W + 12 RU), r32 (16 KO winners), r16 (24),
// qf (28), sf (30), final (31 incl. champion). Anything between two
// boundaries is mid-stage and keeps submit disabled.
type SubmitReadiness =
  | { kind: "blocked"; reason: BlockedReason; nextLabel: SubmitLabel }
  | { kind: "ready"; stage: FullBracketStage; nextHint: string | null };

type BlockedReason =
  | { kind: "needGroupWinner"; missing: number }
  | { kind: "needGroupRunnerUp"; missing: number }
  | { kind: "needThirds"; missing: number; stepBackToGroups: boolean }
  | { kind: "needR32"; missing: number }
  | { kind: "needR16"; missing: number; stepBackToR32: boolean }
  | { kind: "needQF"; missing: number; stepBackToR16: boolean }
  | { kind: "needSF"; missing: number; stepBackToQF: boolean }
  | { kind: "needFinal"; stepBackToSF: boolean };

// The locked stage-specific submit button labels. Brand spec is exact.
type SubmitLabel =
  | "[ Submit groups ]"
  | "[ Submit R32 ]"
  | "[ Submit R16 ]"
  | "[ Submit QF ]"
  | "[ Submit SF ]"
  | "[ Submit full bracket ]";

const STAGE_LABELS: Record<FullBracketStage, SubmitLabel> = {
  groups: "[ Submit groups ]",
  r32: "[ Submit R32 ]",
  r16: "[ Submit R16 ]",
  qf: "[ Submit QF ]",
  sf: "[ Submit SF ]",
  final: "[ Submit full bracket ]",
};

function countFilled<T>(arr: ReadonlyArray<T | null>, max?: number): number {
  const slice = max === undefined ? arr : arr.slice(0, max);
  return slice.filter((v) => v !== null).length;
}

function detectReadiness(s: BuildState): SubmitReadiness {
  const winnersDone = GROUPS.every((g) => s.groupSelections[g].winner);
  const runnersUpDone = GROUPS.every((g) => s.groupSelections[g].runnerUp);
  if (!winnersDone) {
    const missing = GROUPS.filter((g) => !s.groupSelections[g].winner).length;
    return {
      kind: "blocked",
      reason: { kind: "needGroupWinner", missing },
      nextLabel: STAGE_LABELS.groups,
    };
  }
  if (!runnersUpDone) {
    const missing = GROUPS.filter((g) => !s.groupSelections[g].runnerUp).length;
    return {
      kind: "blocked",
      reason: { kind: "needGroupRunnerUp", missing },
      nextLabel: STAGE_LABELS.groups,
    };
  }
  const thirdsCount = countFilled(s.bestThirds);
  const r32Count = countFilled(s.koAdvancers, 16);
  const r16Count = countFilled(s.koAdvancers.slice(16, 24));
  const qfCount = countFilled(s.koAdvancers.slice(24, 28));
  const sfCount = countFilled(s.koAdvancers.slice(28, 30));
  const champion = s.koAdvancers[30];

  // From the groups-complete state onward, every "ready" state is anchored
  // at the deepest cleanly-completed boundary; "blocked" carries a hint
  // back to the user about what they still need or what they can drop.
  if (thirdsCount === 0 && r32Count === 0) {
    return {
      kind: "ready",
      stage: "groups",
      nextHint: "Or continue: pick 8 best 3rd-place teams.",
    };
  }
  if (thirdsCount < 8 && r32Count === 0) {
    return {
      kind: "blocked",
      reason: {
        kind: "needThirds",
        missing: 8 - thirdsCount,
        stepBackToGroups: true,
      },
      nextLabel: STAGE_LABELS.r32,
    };
  }
  if (thirdsCount === 8 && r32Count === 0) {
    return {
      kind: "ready",
      stage: "groups",
      nextHint: "Or continue: pick R32 winners.",
    };
  }
  if (r32Count < 16) {
    return {
      kind: "blocked",
      reason: { kind: "needR32", missing: 16 - r32Count },
      nextLabel: STAGE_LABELS.r32,
    };
  }
  if (r16Count === 0) {
    return {
      kind: "ready",
      stage: "r32",
      nextHint: "Or continue: pick R16 winners.",
    };
  }
  if (r16Count < 8) {
    return {
      kind: "blocked",
      reason: {
        kind: "needR16",
        missing: 8 - r16Count,
        stepBackToR32: true,
      },
      nextLabel: STAGE_LABELS.r16,
    };
  }
  if (qfCount === 0) {
    return {
      kind: "ready",
      stage: "r16",
      nextHint: "Or continue: pick QF winners.",
    };
  }
  if (qfCount < 4) {
    return {
      kind: "blocked",
      reason: {
        kind: "needQF",
        missing: 4 - qfCount,
        stepBackToR16: true,
      },
      nextLabel: STAGE_LABELS.qf,
    };
  }
  if (sfCount === 0) {
    return {
      kind: "ready",
      stage: "qf",
      nextHint: "Or continue: pick SF winners.",
    };
  }
  if (sfCount < 2) {
    return {
      kind: "blocked",
      reason: {
        kind: "needSF",
        missing: 2 - sfCount,
        stepBackToQF: true,
      },
      nextLabel: STAGE_LABELS.sf,
    };
  }
  if (!champion) {
    return {
      kind: "ready",
      stage: "sf",
      nextHint: "Or continue: pick the champion.",
    };
  }
  return { kind: "ready", stage: "final", nextHint: null };
}

function describeBlocked(reason: BlockedReason): string {
  const word = (n: number, singular: string, plural: string): string =>
    n === 1 ? singular : plural;
  switch (reason.kind) {
    case "needGroupWinner":
      return `Pick ${reason.missing} more group ${word(reason.missing, "winner", "winners")}.`;
    case "needGroupRunnerUp":
      return `Pick ${reason.missing} more group ${word(reason.missing, "runner-up", "runners-up")}.`;
    case "needThirds": {
      const base = `Pick ${reason.missing} more 3rd-place ${word(reason.missing, "team", "teams")}.`;
      return reason.stepBackToGroups
        ? `${base} Or step back to submit groups only.`
        : base;
    }
    case "needR32":
      return `Pick ${reason.missing} more R32 ${word(reason.missing, "winner", "winners")}. Or step back to submit groups only.`;
    case "needR16":
      return `Pick ${reason.missing} more R16 ${word(reason.missing, "winner", "winners")}. Or step back to submit R32 only.`;
    case "needQF":
      return `Pick ${reason.missing} more QF ${word(reason.missing, "winner", "winners")}. Or step back to submit R16 only.`;
    case "needSF":
      return `Pick ${reason.missing} more SF ${word(reason.missing, "winner", "winners")}. Or step back to submit QF only.`;
    case "needFinal":
      return "Pick the champion. Or step back to submit SF only.";
  }
}

// While the user is mid-stage, the live gauge anchors on the last clean
// stage boundary so the number does not jitter as they fill the in-progress
// stage. Returns null when not even groups are complete (gauge stays empty).
function lastReadyStage(s: BuildState): FullBracketStage | null {
  const winnersDone = GROUPS.every((g) => s.groupSelections[g].winner);
  const runnersUpDone = GROUPS.every((g) => s.groupSelections[g].runnerUp);
  if (!winnersDone || !runnersUpDone) return null;
  const r32Count = countFilled(s.koAdvancers, 16);
  const r16Count = countFilled(s.koAdvancers.slice(16, 24));
  const qfCount = countFilled(s.koAdvancers.slice(24, 28));
  const sfCount = countFilled(s.koAdvancers.slice(28, 30));
  const champion = s.koAdvancers[30];
  if (champion) return "final";
  if (sfCount === 2) return "sf";
  if (qfCount === 4) return "qf";
  if (r16Count === 8) return "r16";
  if (r32Count === 16) return "r32";
  return "groups";
}

function buildScenarioForStage(
  state: BuildState,
  stage: FullBracketStage,
): FullBracketScenario {
  const groupWinners = GROUPS.map((g) => state.groupSelections[g].winner!) as TeamCode[];
  const groupRunnersUp = GROUPS.map((g) => state.groupSelections[g].runnerUp!) as TeamCode[];
  const bestThirds = (state.bestThirds.filter((t) => t !== null) as TeamCode[]);
  const koLengthByStage: Record<FullBracketStage, number> = {
    groups: 0,
    r32: 16,
    r16: 24,
    qf: 28,
    sf: 30,
    final: 31,
  };
  const len = koLengthByStage[stage];
  const koAdvancers = state.koAdvancers.slice(0, len) as TeamCode[];
  // bestThirds is only structurally meaningful once a KO pick exists; for
  // a groups submission we still surface whatever the user happens to
  // have selected (0 or 8). Below 8 we drop down to 0 so the schema
  // refinement passes (length must be 0 or 8).
  const bestThirdsOut: TeamCode[] =
    stage === "groups" && bestThirds.length !== 8 ? [] : bestThirds;
  return {
    groupWinners,
    groupRunnersUp,
    bestThirds: bestThirdsOut,
    koAdvancers,
  };
}

/**
 * Phase E §6 (B.4): 12 group-3rd-place candidates.
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
  const [invalidIssues, setInvalidIssues] = useState<
    SubmitInvalidIssueView[] | undefined
  >(undefined);
  const [rateLimitRetrySeconds, setRateLimitRetrySeconds] = useState<
    number | undefined
  >(undefined);
  // Phase E §6 (B.3): per-group dim state and manual-focus override.
  // dimmedGroups holds the set of groups currently dimmed (50% opacity);
  // a fresh group-completion schedules a 700ms timer before adding to
  // the set so the user sees their work land before it dims. Manual
  // focus overrides "next alphabetical incomplete" and lifts dim.
  const [dimmedGroups, setDimmedGroups] = useState<Set<GroupLetter>>(new Set());
  const [manualFocusGroup, setManualFocusGroup] = useState<GroupLetter | null>(null);
  // Mission 2: carousel state. `showAll` flips Step 1 between the
  // single-group "stadium" carousel (default) and the legacy 12-group
  // wall (escape hatch). Hydrated from localStorage on mount; written
  // back on toggle.
  const [showAll, setShowAll] = useState(false);
  // The group currently centered in the carousel. Defaults to the
  // first incomplete group (or "A" when everything is filled). Updated
  // on selection, on tap-to-jump in the progress strip, and when the
  // user lands a winner+runnerUp pair (auto-advance to the next
  // incomplete group, the carousel's "satisfying click").
  const [carouselGroup, setCarouselGroup] = useState<GroupLetter>("A");
  // Direction of the most recent carousel transition (1 = forward,
  // -1 = backward). Drives the framer-motion slide so jumps backward
  // animate from the left, not the right.
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  // Groups the user has touched by clicking a team button (vs. via
  // Auto-fill). "Auto-fill remaining" only surfaces once this has at
  // least one entry, per executive decision Q1: respect their work.
  const [manuallyTouched, setManuallyTouched] = useState<Set<GroupLetter>>(
    new Set(),
  );
  const carouselTransition = useReducedMotionAware("layout");
  // Phase E §8 (D.3): per-group pulse counter. Bumped when a group
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
    track("simulator_opened", { mode: "full_bracket", surface: "page" });
    const hydrated = hydrate();
    setState(hydrated);
    // Phase E §6 (B.3): groups already complete on hydrate render dim
    // immediately, no transition. Seed prevCompleteRef so the watcher
    // effect below doesn't fire 700ms timers for hydrated groups.
    const initialComplete = new Set<GroupLetter>();
    for (const g of GROUPS) {
      const sel = hydrated.groupSelections[g];
      if (sel.winner && sel.runnerUp) initialComplete.add(g);
    }
    setDimmedGroups(initialComplete);
    prevCompleteRef.current = initialComplete;
    // Mission 2: restore "Show all 12" preference and park the
    // carousel on the first incomplete group (or A if everything
    // is already complete from the cached scenario).
    setShowAll(readShowAllPreference());
    const firstIncomplete =
      GROUPS.find((g) => !initialComplete.has(g)) ?? "A";
    setCarouselGroup(firstIncomplete);
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeInflight("full_bracket", state);
  }, [state]);

  // Phase E §6 (B.3): watch group completions. A fresh transition from
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

  const readiness = useMemo(() => detectReadiness(state), [state]);

  // Live Reality Score is computed from the current deepest-completed
  // stage. While the user is mid-stage (readiness.kind === "blocked"),
  // the score shows what they would land on if they submitted at the
  // last clean boundary, so the gauge does not flicker as they pick.
  const liveScore = useMemo(() => {
    const stage =
      readiness.kind === "ready"
        ? readiness.stage
        : lastReadyStage(state);
    if (!stage) return null;
    const scenario = buildScenarioForStage(state, stage);
    const canonical = canonicalizeScenario("full_bracket", scenario);
    return computeRealityScore("full_bracket", canonical, scenario);
  }, [state, readiness]);

  function handleGroupClick(g: GroupLetter, code: TeamCode) {
    setErrorKind(null);
    if (claimFirstPick("full_bracket")) {
      track("first_pick", { mode: "full_bracket" });
    }
    // Phase E §6 (B.3): re-activating a completed (dimmed) group lifts
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
      // User pivoted to a different group; clear the manual override so
      // auto-focus tracks the new group naturally.
      setManualFocusGroup(null);
    }
    // Mission 2: record that the user has personally touched this
    // group. "Auto-fill remaining" hides until at least one entry is
    // present, so it never appears unprompted.
    setManuallyTouched((prev) => {
      if (prev.has(g)) return prev;
      const next = new Set(prev);
      next.add(g);
      return next;
    });
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
      // Mission 2: if this click landed the second pick (winner +
      // runner-up), auto-advance the carousel to the next incomplete
      // group. The render-time effect below would do this too, but
      // doing it here keeps the slide direction = forward.
      if (nextSel.winner && nextSel.runnerUp) {
        const startIdx = GROUPS.indexOf(g);
        for (let i = 1; i <= GROUPS.length; i++) {
          const candidate = GROUPS[(startIdx + i) % GROUPS.length];
          const cs =
            candidate === g
              ? nextSel
              : prev.groupSelections[candidate];
          if (!(cs.winner && cs.runnerUp)) {
            setSlideDirection(1);
            setCarouselGroup(candidate);
            break;
          }
        }
      }
      return {
        ...prev,
        groupSelections: { ...prev.groupSelections, [g]: nextSel },
        bestThirds: Array(8).fill(null),
        koAdvancers: Array(31).fill(null),
      };
    });
  }

  function handleJumpToGroup(g: GroupLetter) {
    if (g === carouselGroup) return;
    const cur = GROUPS.indexOf(carouselGroup);
    const tgt = GROUPS.indexOf(g);
    setSlideDirection(tgt >= cur ? 1 : -1);
    setCarouselGroup(g);
    // Tap-to-jump implies the user wants to focus this group (e.g. to
    // edit a completed pick), so lift any dim and pin manual focus.
    setManualFocusGroup(g);
    setDimmedGroups((prev) => {
      if (!prev.has(g)) return prev;
      const next = new Set(prev);
      next.delete(g);
      return next;
    });
  }

  function handleAutoFillAll() {
    // Auto-fill resets the entire group stage: every group's winner =
    // top-Elo, runner-up = second-Elo. KO + thirds reset because their
    // upstream changed. Manually-touched is cleared because the user
    // has explicitly asked the model-independent baseline to take over.
    setErrorKind(null);
    const sorted = teamsByGroupSortedByElo();
    setState((prev) => {
      const groupSelections = {} as Record<GroupLetter, GroupSelection>;
      for (const g of GROUPS) {
        groupSelections[g] = {
          winner: sorted[g][0],
          runnerUp: sorted[g][1],
        };
      }
      return {
        ...prev,
        groupSelections,
        bestThirds: Array(8).fill(null),
        koAdvancers: Array(31).fill(null),
      };
    });
    setManuallyTouched(new Set());
    setManualFocusGroup(null);
  }

  function handleAutoFillRemaining() {
    // Same logic as Auto-fill all, but only touches groups that aren't
    // yet complete. Preserves user picks (per executive decision Q1).
    setErrorKind(null);
    const sorted = teamsByGroupSortedByElo();
    setState((prev) => {
      const groupSelections = { ...prev.groupSelections };
      let touchedAny = false;
      for (const g of GROUPS) {
        const sel = groupSelections[g];
        if (sel.winner && sel.runnerUp) continue;
        groupSelections[g] = {
          winner: sorted[g][0],
          runnerUp: sorted[g][1],
        };
        touchedAny = true;
      }
      if (!touchedAny) return prev;
      return {
        ...prev,
        groupSelections,
        bestThirds: Array(8).fill(null),
        koAdvancers: Array(31).fill(null),
      };
    });
  }

  function handleToggleShowAll() {
    setShowAll((prev) => {
      const next = !prev;
      writeShowAllPreference(next);
      return next;
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
    setManuallyTouched(new Set());
    setManualFocusGroup(null);
    setSlideDirection(1);
    setCarouselGroup("A");
  }

  async function handleSubmit() {
    if (readiness.kind !== "ready" || submitting) return;
    const stage = readiness.stage;
    const scenario = buildScenarioForStage(state, stage);

    setSubmitting(true);
    setErrorKind(null);
    setInvalidIssues(undefined);
    setRateLimitRetrySeconds(undefined);
    // `?debug=1` opts the submit into requesting structured Zod issues
    // from the route. Read inline (post-hydration, only on user click)
    // rather than via `useSearchParams()`; the hook would force the
    // page out of static rendering and the build error Vercel caught
    // (`useSearchParams() should be wrapped in a suspense boundary`).
    const debug =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1";
    const result = await submitPrediction(
      {
        mode: "full_bracket",
        scenario,
        modelSha,
        snapshotSha,
      },
      { debug },
    );
    if (result.kind === "ok") {
      clearInflight();
      const { band } = getRarityBand(
        result.prediction.countCurrent,
        result.prediction.total,
      );
      // Checkpoint 9 (P1.1) extends submit_success with `stage` so analytics
      // can measure where users actually submit (groups vs deeper). Helps
      // calibrate whether the partial-submit affordance is being used.
      track("submit_success", {
        mode: "full_bracket",
        rarity_band: band,
        stage,
      });
      router.push(`/scenario/p/${result.prediction.id}`);
      return;
    }
    setSubmitting(false);
    setErrorKind(result.kind);
    if (result.kind === "invalid") {
      setInvalidIssues(result.issues);
    } else if (result.kind === "rateLimit") {
      setRateLimitRetrySeconds(Math.ceil(result.retryAfterMs / 1000));
    }
  }

  const groupsDone = allGroupsComplete(state);
  const koUnlocked = r32Available(state);
  const candidatesByGroup = useMemo(() => thirdsCandidatesByGroup(state), [state]);
  const selectedThirds = new Set(state.bestThirds.filter(Boolean) as TeamCode[]);
  const submitLabel: SubmitLabel =
    readiness.kind === "ready"
      ? STAGE_LABELS[readiness.stage]
      : readiness.nextLabel;
  const submitDisabled = readiness.kind !== "ready" || submitting;
  const helperText: string | null =
    readiness.kind === "blocked"
      ? describeBlocked(readiness.reason)
      : readiness.nextHint;

  // Phase E §6 (B.3): focused group: manual override else next
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

        {/* Step 1 · Groups. Mission 2 refactor: single-group carousel
            with peek slivers + 12-dot progress strip + Auto-fill from
            Elo + Show-all-12 escape hatch. The legacy 12-grid wall is
            still rendered when `showAll` is true (toggle persisted in
            localStorage scoped per-mode). */}
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-[20px] leading-[1.3] text-[var(--text-primary)] sm:text-[22px]">
              First, rank the groups.
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFillAll}
                className="border border-[var(--text-primary)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-primary)] transition-colors duration-100 hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
              >
                [ Auto-fill all ]
              </button>
              {/* "Auto-fill remaining" stays hidden until at least one
                  group has been filled manually (executive decision Q1).
                  This way the button never appears unprompted. */}
              {manuallyTouched.size > 0 ? (
                <button
                  type="button"
                  onClick={handleAutoFillRemaining}
                  className="border border-[var(--text-primary)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-primary)] transition-colors duration-100 hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
                >
                  [ Auto-fill remaining ]
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleToggleShowAll}
                aria-pressed={showAll}
                className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
              >
                {showAll ? "[ Show one ]" : "[ Show all 12 ]"}
              </button>
            </div>
          </div>
          <p className="mt-2 font-sans text-[12px] italic text-[var(--text-quiet)]">
            Auto-fill uses pre-tournament Elo. The model&rsquo;s call appears after you submit.
          </p>

          {/* Mini-progress strip: 12 dots, A through L. Filled = pair
              complete, ringed = current, plain = incomplete. Tap-to-jump
              centers the carousel on that group (and lifts dim if it
              was a completed-and-dimmed pick). Hidden in the wall view
              because the wall already shows everything at once. */}
          {!showAll ? (
            <ol
              aria-label="Group progress"
              className="mt-4 flex flex-wrap items-center gap-1.5"
            >
              {GROUPS.map((g) => {
                const sel = state.groupSelections[g];
                const isComplete = Boolean(sel.winner && sel.runnerUp);
                const isCurrent = carouselGroup === g;
                return (
                  <li key={g} className="contents">
                    <button
                      type="button"
                      onClick={() => handleJumpToGroup(g)}
                      aria-label={`Jump to group ${g}${isComplete ? " (complete)" : ""}`}
                      aria-current={isCurrent ? "step" : undefined}
                      className={[
                        "inline-flex h-6 min-w-[24px] items-center justify-center px-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                        isComplete
                          ? "bg-[var(--ui-success)] text-[var(--bg-root)]"
                          : isCurrent
                            ? "border border-[var(--ui-guidance)] text-[var(--ui-guidance)]"
                            : "border border-[var(--border-default)] text-[var(--text-quiet)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]",
                      ].join(" ")}
                    >
                      {g}
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : null}

          {/* Carousel (default) vs. wall (Show all 12). The carousel
              renders three groups: the previous as a 5% peek sliver on
              the left, the active at full width, and the next as a 5%
              peek sliver on the right. Selecting both slots in the
              active group auto-advances to the next incomplete group
              (handled in handleGroupClick). */}
          {showAll ? (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {GROUPS.map((g) => {
                const sel = state.groupSelections[g];
                const isComplete = Boolean(sel.winner && sel.runnerUp);
                const isFocused = focusedGroup === g;
                const isDimmed = dimmedGroups.has(g) && !isFocused;
                return (
                  <li key={g}>
                    <GroupCard
                      g={g}
                      sel={sel}
                      teams={groupTeams[g]}
                      pulseKey={groupPulseKeys[g]}
                      isComplete={isComplete}
                      isFocused={isFocused}
                      isDimmed={isDimmed}
                      onPick={(code) => handleGroupClick(g, code)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="relative mt-6 overflow-hidden">
              <div
                className="grid items-stretch gap-2"
                style={{ gridTemplateColumns: "5% 1fr 5%" }}
              >
                {/* Previous-group peek sliver */}
                <PeekSliver
                  letter={prevGroupLetter(carouselGroup)}
                  side="left"
                  onClick={() => handleJumpToGroup(prevGroupLetter(carouselGroup))}
                />
                {/* The carousel uses a key-change re-mount rather than
                    AnimatePresence: the new card slides in from the
                    side the user is heading toward and the old one is
                    discarded immediately. AnimatePresence + mode="wait"
                    held the prior card in the DOM under React 19, which
                    visibly froze the carousel on "A". The simpler
                    re-mount keeps the motion intent and stays correct. */}
                <div className="relative min-h-[260px]">
                  <motion.div
                    key={carouselGroup}
                    initial={{ opacity: 0, x: slideDirection * 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={carouselTransition}
                  >
                    <GroupCard
                      g={carouselGroup}
                      sel={state.groupSelections[carouselGroup]}
                      teams={groupTeams[carouselGroup]}
                      pulseKey={groupPulseKeys[carouselGroup]}
                      isComplete={Boolean(
                        state.groupSelections[carouselGroup].winner &&
                          state.groupSelections[carouselGroup].runnerUp,
                      )}
                      isFocused={true}
                      isDimmed={false}
                      emphasized
                      onPick={(code) => handleGroupClick(carouselGroup, code)}
                    />
                  </motion.div>
                </div>
                <PeekSliver
                  letter={nextGroupLetter(carouselGroup)}
                  side="right"
                  onClick={() => handleJumpToGroup(nextGroupLetter(carouselGroup))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2 · Best 3rd-place teams. Phase E §6 (B.4) restructure:
            a single horizontal row of 12 chips (one per group) with a
            "Pick 8 of 12" counter. Q4: fully toggleable, no commit
            moment, picks lock only when the user advances to Step 3.
            Checkpoint 9 (P1.1): visible once group winners and runners-up
            are picked; the user may still submit at the groups boundary
            without advancing here. */}
        {groupsDone ? (
          <div className="mt-10">
            <h2 className="font-serif text-[20px] leading-[1.3] text-[var(--text-primary)] sm:text-[22px]">
              Pick the eight 3rd-place teams that move on.
            </h2>
            <p className="mt-1 font-sans text-[12px] text-[var(--text-quiet)]">
              {selectedThirds.size === 8
                ? "8 of 12 selected. Knockout bracket unlocked."
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
                        <span className="text-[var(--text-quiet)]">·</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* Step 3 · Knockout bracket. Phase E §7 (C.1-C.4): absolute-
            positioned tournament tree with right-angle SVG connectors,
            winner highlight + loser fade, layoutId chip propagation,
            mobile horizontal scroll + round breadcrumb.
            Checkpoint 9 (P1.1): activates as soon as the 8 best 3rd-place
            teams are in. Below that, the user can still submit groups
            and they see the picker is waiting once they pick thirds. */}
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
        ) : null}

        {/* Live Agreement Gauge. Phase D §4.2: activates once the user
            has reached a clean stage boundary. Checkpoint 9 (P1.1)
            broadens "stage boundary" from "champion only" to any of the
            six submit-ready depths so the user sees the score the moment
            their groups call lands, not only after they pick the full
            bracket. */}
        <div className="mt-8 max-w-md">
          <LiveAgreementGauge
            count={liveScore?.count ?? 0}
            total={liveScore?.total ?? 10000}
            isComplete={readiness.kind === "ready"}
            variant="compact"
          />
        </div>

        {/* Submit + error.
            Checkpoint 9 (P1.1): the button label adapts to the current
            commitment depth ("[ Submit groups ]" through
            "[ Submit full bracket ]") and only enables at the six clean
            stage boundaries. Mid-stage states keep submit disabled and
            surface a helper line beneath the button telling the user what
            they still need to pick (or how to step back to the prior
            boundary). */}
        <div className="mt-10 flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={[
              "border px-5 py-3 font-mono text-[13px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
              !submitDisabled
                ? "border-[var(--text-primary)] text-[var(--text-primary)] hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] cursor-pointer"
                : "border-[var(--border-default)] text-[var(--text-quiet)] cursor-not-allowed",
            ].join(" ")}
          >
            {submitting ? "[ Submitting... ]" : submitLabel}
          </button>
          {helperText ? (
            <p className="font-sans text-[12px] text-[var(--text-quiet)]">
              {helperText}
            </p>
          ) : null}
          {errorKind ? (
            <SubmitErrorPanel
              kind={errorKind}
              onRetry={handleSubmit}
              retryInFlight={submitting}
              invalidIssues={invalidIssues}
              rateLimitRetrySeconds={rateLimitRetrySeconds}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

// ── Carousel helpers ─────────────────────────────────────────────────────────
//
// The carousel wraps A↔L. Going "previous" from A lands on L; going "next"
// from L lands on A. This matches the progress strip's ring shape; the
// user can spin around the alphabet rather than dead-ending at the edges.

function prevGroupLetter(g: GroupLetter): GroupLetter {
  const i = GROUPS.indexOf(g);
  return GROUPS[(i - 1 + GROUPS.length) % GROUPS.length];
}

function nextGroupLetter(g: GroupLetter): GroupLetter {
  const i = GROUPS.indexOf(g);
  return GROUPS[(i + 1) % GROUPS.length];
}

interface GroupCardProps {
  g: GroupLetter;
  sel: GroupSelection;
  teams: TeamCode[];
  pulseKey: number;
  isComplete: boolean;
  isFocused: boolean;
  isDimmed: boolean;
  onPick: (code: TeamCode) => void;
  /**
   * The carousel's centered card is rendered larger and uses a heavier
   * border treatment to read as a "stadium" view. Wall-mode cards use
   * the original compact treatment so the 12-grid still fits on
   * Phase D layouts.
   */
  emphasized?: boolean;
}

/**
 * One group's card: winner + runner-up picker. Extracted from the
 * Phase E inline implementation so the carousel and the wall view can
 * share the same render path.
 */
function GroupCard({
  g,
  sel,
  teams,
  pulseKey,
  isComplete,
  isFocused,
  isDimmed,
  onPick,
  emphasized = false,
}: GroupCardProps) {
  return (
    <div
      role="group"
      aria-label={`Group ${g}`}
      style={{
        opacity: isDimmed ? 0.5 : 1,
        // Mission 3: `--ui-guidance` (deep teal) signals "active step / focus"
        // wherever a step or pick is the user's current attention.
        borderColor: isFocused ? "var(--ui-guidance)" : "var(--border-default)",
      }}
      className={[
        "relative border",
        emphasized ? "p-5" : "p-3",
      ].join(" ")}
    >
      {/* `tone="success"` per the rebind table. This pulse fires when a
          group's winner+runner-up pair just landed, which is a completion
          moment rather than a generic accent. */}
      <AccentPulse triggerKey={pulseKey} tone="success" />
      {/* Polish: emphasize the group label so the carousel always tells
          the user where they are. The emphasized (carousel) variant lifts
          the weight, jumps a size, and routes through `--ui-guidance` so
          the label semantically reads as "you are here". The compact
          (wall) variant stays muted to keep the 12-grid visually quiet. */}
      <div
        className={[
          "font-mono uppercase tracking-[0.10em]",
          emphasized
            ? "text-[14px] font-semibold text-[var(--ui-guidance)]"
            : "text-[10px] text-[var(--text-quiet)]",
        ].join(" ")}
      >
        Group {g}
      </div>
      {isComplete ? (
        // Mission 3: `--ui-success` (deep mint) is the role token for
        // completion. Re-uses the same dereference as the mini-progress
        // filled dot so the two surfaces stay visually consistent.
        <span className="pointer-events-none absolute right-2 top-2 font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--ui-success)]">
          [ Done ]
        </span>
      ) : null}
      <ul className={emphasized ? "mt-2 space-y-2" : "mt-1 space-y-1"}>
        {teams.map((code) => {
          const rank =
            sel.winner === code ? "1" : sel.runnerUp === code ? "2" : "";
          const inverted = rank !== "";
          return (
            <li key={code} className="contents">
              <button
                type="button"
                onClick={() => onPick(code)}
                className={[
                  "flex w-full items-center justify-between border font-mono tabular-nums transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                  emphasized ? "px-3 py-2.5 text-[15px]" : "px-2 py-1.5 text-[13px]",
                  inverted
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-root)]"
                    : "border-[var(--border-default)] bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2">
                  {/* Polish: restore the visual language: every team
                      pick shows its national flag next to the FIFA code,
                      matching `TeamGrid` and the best-3rds row. Larger
                      flag in the carousel (emphasized) variant, smaller
                      in the wall view to keep the 12-grid compact. */}
                  <Flag code={code} size={emphasized ? 22 : 16} />
                  <span>{code}</span>
                </span>
                <span className="text-[10px] opacity-70">{rank}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface PeekSliverProps {
  letter: GroupLetter;
  side: "left" | "right";
  onClick: () => void;
}

/**
 * 5% peek sliver foreshadowing the next/previous group in the carousel.
 * Renders the group's letter so the user sees what they'll land on if
 * they click. The sliver itself is tap-to-jump.
 */
function PeekSliver({ letter, side, onClick }: PeekSliverProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Go to ${side === "left" ? "previous" : "next"} group ${letter}`}
      className={[
        "flex h-full min-h-[200px] cursor-pointer items-center justify-center border border-[var(--border-default)] bg-[var(--bg-root)] font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-quiet)] transition-colors duration-100 hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
        side === "left" ? "border-r-0" : "border-l-0",
      ].join(" ")}
    >
      <span className="rotate-180" style={{ writingMode: "vertical-rl" }}>
        {side === "left" ? `← ${letter}` : `${letter} →`}
      </span>
    </button>
  );
}

