"use client";

/**
 * Champion's Path build mode per IMPL_PROMPT §2.2 + design v2 §5.4.
 *
 * Phase C: DnD upgrade. Teams can be dragged from the grid onto the
 * team slot or any stage opponent slot. CPTeamSlot and CPOpponentSlot
 * are inline sub-components that use useDroppable. Click interaction
 * still works alongside DnD.
 *
 * Per Patch v2.1 §3: NO partial rarity band, NO partial 1-in-N
 * rendered during build. The reveal happens on /scenario/p/[id].
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { TeamPickerGrid } from "@/components/simulator/TeamPickerGrid";
import { Flag } from "@/components/primitives/Flag";
import { EmptySlot } from "@/components/simulator/EmptySlot";
import { LiveAgreementGauge } from "@/components/simulator/reality/LiveAgreementGauge";
import { AccentPulse } from "@/components/simulator/AccentPulse";
import {
  SubmitErrorPanel,
  type SubmitErrorKind,
} from "@/components/simulator/SubmitErrorPanel";
import { StickyProgressMeter } from "@/components/simulator/ui/StickyProgressMeter";
import { useReducedMotionAware } from "@/lib/motion/useReducedMotionAware";
import {
  clearInflight,
  readInflightForMode,
  writeInflight,
} from "@/lib/sim/inflightStore";
import { submitPrediction } from "@/lib/sim/predictionsApi";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
import { getRarityBand } from "@/lib/sim/getRarityBand";
import { track, claimFirstPick } from "@/lib/analytics/track";
import type { ChampionsPathScenario, TeamCode } from "@/lib/sim/types";
import { COUNTRY_NAMES, type FifaCode } from "@/lib/flags/countries";

interface ModeChampionsPathProps {
  modelSha: string;
  snapshotSha: string;
}

type StageKey = "r16" | "qf" | "sf" | "f";
const STAGE_KEYS: readonly StageKey[] = ["r16", "qf", "sf", "f"] as const;
const STAGE_LABELS: Record<StageKey, string> = {
  r16: "R16",
  qf: "QF",
  sf: "SF",
  f: "F",
};

interface StageState {
  opponent: TeamCode | null;
  result: "W" | "L" | null;
}

interface BuildState {
  team: TeamCode | null;
  r16: StageState;
  qf: StageState;
  sf: StageState;
  f: StageState;
}

function emptyStage(): StageState {
  return { opponent: null, result: null };
}

function emptyState(): BuildState {
  return {
    team: null,
    r16: emptyStage(),
    qf: emptyStage(),
    sf: emptyStage(),
    f: emptyStage(),
  };
}

function isPathDeadAt(state: BuildState, stage: StageKey): boolean {
  for (const s of STAGE_KEYS) {
    if (s === stage) return false;
    if (state[s].result === "L") return true;
  }
  return false;
}

function isResolved(state: BuildState): boolean {
  if (!state.team) return false;
  for (const s of STAGE_KEYS) {
    const v = state[s];
    if (!v.opponent || !v.result) return false;
    if (v.result === "L") return true;
  }
  return true;
}

function nextEmptyOpponentSlot(state: BuildState): StageKey | null {
  for (const s of STAGE_KEYS) {
    if (isPathDeadAt(state, s)) return null;
    if (state[s].opponent === null) return s;
  }
  return null;
}

/**
 * V2-02 (A3): progressive disclosure of stage rows. Returns the stages
 * that should be visible given the current state:
 *   - no team picked → []
 *   - team picked, R16 not yet complete → [R16]
 *   - R16 complete with W → [R16, QF]
 *   - ... and so on, capped at F.
 *
 * A stage that lands as an "L" stops further reveal: the path has died,
 * the user can submit, and downstream stages should not pretend to be
 * reachable. The earlier semantics (`isPathDeadAt`) already encoded this
 * by returning null from nextEmptyOpponentSlot; here we just refuse to
 * render those would-be-dead rows at all.
 */
function visibleStages(state: BuildState): StageKey[] {
  if (!state.team) return [];
  const out: StageKey[] = [];
  for (const s of STAGE_KEYS) {
    out.push(s);
    const v = state[s];
    if (!v.opponent || !v.result || v.result === "L") break;
  }
  return out;
}

/**
 * V2-02 (A3): the headline copy is fixed; the subhead changes with the
 * user's position in the path so the page narrates what to do next. The
 * strings are locked at the spec level (do not rephrase).
 */
function subheadCopyFor(state: BuildState): string {
  if (!state.team) {
    return "First, pick the team you are tracing. Click or drag from the grid.";
  }
  for (const s of STAGE_KEYS) {
    const v = state[s];
    if (!v.opponent || !v.result) {
      switch (s) {
        case "r16":
          return "Now tell us what happens in the Round of 16.";
        case "qf":
          return "Now the Quarterfinal.";
        case "sf":
          return "Now the Semifinal.";
        case "f":
          return "Now the Final.";
      }
    }
    if (v.result === "L") break;
  }
  return "Your team's full story. Submit when ready.";
}

function toSubmissionScenario(state: BuildState): ChampionsPathScenario | null {
  if (!state.team) return null;
  const out: ChampionsPathScenario = { team: state.team, r16: { opponent: "", result: "W" } };
  let firstFilled = false;
  for (const s of STAGE_KEYS) {
    const v = state[s];
    if (!v.opponent || !v.result) break;
    if (s === "r16") {
      out.r16 = { opponent: v.opponent, result: v.result };
      firstFilled = true;
    } else {
      out[s] = { opponent: v.opponent, result: v.result };
    }
    if (v.result === "L") break;
  }
  if (!firstFilled) return null;
  return out;
}

function hydrate(): BuildState {
  const cached = readInflightForMode("champions_path") as Partial<BuildState> | null;
  if (!cached || typeof cached !== "object") return emptyState();
  const base = emptyState();
  if (typeof cached.team === "string" && /^[A-Z]{3}$/.test(cached.team)) {
    base.team = cached.team as TeamCode;
  }
  for (const s of STAGE_KEYS) {
    const stage = (cached as BuildState)[s];
    if (!stage || typeof stage !== "object") continue;
    if (
      typeof stage.opponent === "string" &&
      /^[A-Z]{3}$/.test(stage.opponent)
    ) {
      base[s].opponent = stage.opponent as TeamCode;
    }
    if (stage.result === "W" || stage.result === "L") {
      base[s].result = stage.result;
    }
  }
  return base;
}

// ── Droppable team slot ───────────────────────────────────────────────────────

interface CPTeamSlotProps {
  code: TeamCode | null;
}

function CPTeamSlot({ code }: CPTeamSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: "cp-team" });
  if (!code) {
    return (
      <div
        ref={setNodeRef}
        className="inline-flex h-[60px] min-w-[10rem] items-stretch"
      >
        <EmptySlot
          size="lg"
          isOver={isOver}
          label="YOUR TEAM"
          ariaLabel="Drop or tap a team to start the path"
        />
      </div>
    );
  }
  return (
    <div
      ref={setNodeRef}
      className={[
        "inline-flex min-w-[5rem] items-center justify-center gap-3 border px-3 py-2 font-mono text-[24px] tabular-nums transition-colors duration-100",
        "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-root)]",
        isOver ? "ring-2 ring-[var(--accent-focus)]" : "",
      ].join(" ")}
      aria-label={`Selected team: ${code}`}
    >
      <Flag code={code} size={48} />
      <span>{code}</span>
    </div>
  );
}

// ── Droppable opponent slot ───────────────────────────────────────────────────

interface CPOpponentSlotProps {
  stageKey: StageKey;
  code: TeamCode | null;
  isDead: boolean;
}

function CPOpponentSlot({ stageKey, code, isDead }: CPOpponentSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `cp-opp-${stageKey}`,
    disabled: isDead,
  });
  if (!code) {
    return (
      <span
        ref={setNodeRef}
        className="inline-flex h-9 min-w-[5.5rem] items-stretch"
      >
        <EmptySlot
          size="sm"
          isOver={isOver && !isDead}
          label="OPPONENT"
          ariaLabel={`Choose opponent for ${stageKey.toUpperCase()}`}
        />
      </span>
    );
  }
  return (
    <span
      ref={setNodeRef}
      className="inline-flex items-center gap-1.5 font-mono text-[18px] tabular-nums text-[var(--text-primary)] sm:text-[20px]"
    >
      <Flag code={code} size={24} />
      <span>{code}</span>
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ModeChampionsPath({
  modelSha,
  snapshotSha,
}: ModeChampionsPathProps) {
  const router = useRouter();
  const [state, setState] = useState<BuildState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorKind, setErrorKind] = useState<SubmitErrorKind | null>(null);
  const [activeCode, setActiveCode] = useState<TeamCode | null>(null);
  // Phase E §6 (B.2): stage focus. When set, picks route to this stage
  // and only its presence guides the picker's "you are here" beacon.
  // null defaults to nextEmptyOpponentSlot for natural forward progression.
  const [activeStage, setActiveStage] = useState<StageKey | null>(null);
  // Phase E §6 (B.1)/Q1: picker collapses once the path is fully resolved.
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  // Phase E §8 (D.3): per-stage pulse counter, bumped on stage advance
  // (when the W/L result lands), one shot per stage advance.
  const [stagePulseKeys, setStagePulseKeys] = useState<Record<StageKey, number>>(
    () => ({ r16: 0, qf: 0, sf: 0, f: 0 }),
  );
  const hydratedRef = useRef(false);
  const layoutTransition = useReducedMotionAware("layout");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    setState(hydrate());
    hydratedRef.current = true;
    track("simulator_opened", { mode: "champions_path", surface: "page" });
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    writeInflight("champions_path", state);
  }, [state]);

  // Codes already used somewhere in the build; disable in the picker.
  const usedCodes = useMemo(() => {
    const set = new Set<TeamCode>();
    if (state.team) set.add(state.team);
    for (const s of STAGE_KEYS) {
      const opp = state[s].opponent;
      if (opp) set.add(opp);
    }
    return set;
  }, [state]);

  function handlePick(code: TeamCode) {
    setErrorKind(null);
    // Any pick change can invalidate downstream stages → reset the
    // manual-expand flag so the next resolved flip auto-collapses.
    setManuallyExpanded(false);
    const isRemoval =
      state.team === code || STAGE_KEYS.some((s) => state[s].opponent === code);
    if (!isRemoval && claimFirstPick("champions_path")) {
      track("first_pick", { mode: "champions_path" });
    }
    setState((prev) => {
      if (prev.team === code) {
        return emptyState();
      }
      for (const s of STAGE_KEYS) {
        if (prev[s].opponent === code) {
          const next = { ...prev };
          let clearing = false;
          for (const t of STAGE_KEYS) {
            if (t === s) clearing = true;
            if (clearing) next[t] = emptyStage();
          }
          return next;
        }
      }
      if (!prev.team) {
        return { ...prev, team: code };
      }
      // Phase E §6 (B.2): route to the focused stage if one is active and
      // its slot is empty (or equal to nextEmpty). Otherwise fall back to
      // nextEmptyOpponentSlot for forward progression.
      const candidate =
        activeStage && !isPathDeadAt(prev, activeStage) && prev[activeStage].opponent === null
          ? activeStage
          : nextEmptyOpponentSlot(prev);
      if (!candidate) return prev;
      const next = { ...prev };
      next[candidate] = { opponent: code, result: null };
      return next;
    });
  }

  function handleResult(stage: StageKey, result: "W" | "L") {
    if (state[stage].opponent === null) return;
    if (isPathDeadAt(state, stage)) return;
    setErrorKind(null);
    // Setting an L invalidates later stages → re-arm auto-collapse.
    setManuallyExpanded(false);
    // §8 (D.3): fire the accent pulse on this stage card.
    setStagePulseKeys((prev) => ({ ...prev, [stage]: prev[stage] + 1 }));
    setState((prev) => {
      const next = { ...prev, [stage]: { ...prev[stage], result } };
      if (result === "L") {
        let clearing = false;
        for (const t of STAGE_KEYS) {
          if (t === stage) {
            clearing = true;
            continue;
          }
          if (clearing) next[t] = emptyStage();
        }
      }
      return next;
    });
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveCode((active.data.current?.code as TeamCode) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveCode(null);
    const code = active.data.current?.code as TeamCode | undefined;
    if (!code || !over) return;
    const overId = over.id as string;

    if (overId === "cp-team") {
      if (state.team !== code) {
        setState({ ...emptyState(), team: code });
        setErrorKind(null);
      }
    } else if (overId.startsWith("cp-opp-")) {
      const stageKey = overId.slice("cp-opp-".length) as StageKey;
      if (!STAGE_KEYS.includes(stageKey)) return;
      if (!state.team || code === state.team) return;
      if (isPathDeadAt(state, stageKey)) return;

      setState((prev) => {
        const next = { ...prev };
        // Remove code from any stage it already occupies, cascading from there.
        for (const s of STAGE_KEYS) {
          if (prev[s].opponent === code) {
            let clearing = false;
            for (const t of STAGE_KEYS) {
              if (t === s) clearing = true;
              if (clearing) next[t] = emptyStage();
            }
            break;
          }
        }
        // Cascade from the target stage forward, then fill it.
        let clearing = false;
        for (const t of STAGE_KEYS) {
          if (t === stageKey) clearing = true;
          if (clearing) next[t] = emptyStage();
        }
        next[stageKey] = { opponent: code, result: null };
        return next;
      });
      setErrorKind(null);
    }
  }

  function handleReset() {
    setState(emptyState());
    setActiveStage(null);
    setManuallyExpanded(false);
    clearInflight();
    setErrorKind(null);
  }

  async function handleSubmit() {
    if (!isResolved(state) || submitting) return;
    const scenario = toSubmissionScenario(state);
    if (!scenario) return;
    setSubmitting(true);
    setErrorKind(null);
    const result = await submitPrediction({
      mode: "champions_path",
      scenario,
      modelSha,
      snapshotSha,
    });
    if (result.kind === "ok") {
      clearInflight();
      const { band } = getRarityBand(
        result.prediction.countCurrent,
        result.prediction.total,
      );
      track("submit_success", { mode: "champions_path", rarity_band: band });
      setSubmitted(true);
      router.push(`/scenario/p/${result.prediction.id}`);
      return;
    }
    setSubmitting(false);
    setErrorKind(result.kind);
  }

  const submissionScenario = toSubmissionScenario(state);
  const narrative = submissionScenario
    ? renderStoryLine("champions_path", submissionScenario)
    : "";
  const resolved = isResolved(state);

  // V2-02 (A3): which stage rows to render. Driven entirely by `state`,
  // so the inflight buffer rehydrates the right disclosure without any
  // extra plumbing: a returning user who saved at QF-in-progress sees
  // R16 (done) + QF (empty), nothing further.
  const visibleStageList = useMemo(() => visibleStages(state), [state]);
  // Phase E §6 (B.2): derive the effective focus stage. Falls back to the
  // next-empty slot for natural progression when the user hasn't tapped
  // a stage card explicitly. If activeStage points at a stage that is no
  // longer visible (e.g., cleared by a cascading L result), drop it.
  const focusStageRaw: StageKey | null =
    activeStage && visibleStageList.includes(activeStage)
      ? activeStage
      : nextEmptyOpponentSlot(state);
  const focusStage = focusStageRaw;
  // Q1: picker is expanded whenever the path is unresolved, OR when the
  // user explicitly tapped "Edit story" while resolved. Reset of
  // the manual flag is handled inline in handlers that mutate state.
  const pickerExpanded = !resolved || manuallyExpanded;

  function isStageCompleted(s: StageKey): boolean {
    const v = state[s];
    return v.opponent !== null && v.result !== null;
  }

  function handleStageCardClick(s: StageKey) {
    if (!state.team) return;
    if (isPathDeadAt(state, s)) return;
    setActiveStage(s);
    setErrorKind(null);
  }

  // Live Reality Score: only percentage, no band / 1-in-N per v2.1 §3.
  const liveScore = useMemo(() => {
    if (!submissionScenario) return null;
    const canonical = canonicalizeScenario("champions_path", submissionScenario);
    return computeRealityScore("champions_path", canonical, submissionScenario);
  }, [submissionScenario]);

  return (
    <DndContext
      id="cp-dnd"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <section
        aria-labelledby="cp-heading"
        data-canvas="simulator"
        className="pt-10"
        style={{ paddingBottom: "var(--sticky-meter-h, 96px)" }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h1
            id="cp-heading"
            className="font-serif text-[28px] leading-[1.1] sm:text-[40px] text-[var(--text-primary)]"
          >
            Tell us your team&rsquo;s story.
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
          {subheadCopyFor(state)}
        </p>

        {/* Team slot */}
        <div className="mt-6 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
            Your team
          </span>
          <CPTeamSlot code={state.team} />
          {state.team ? (
            <button
              type="button"
              onClick={() => setState(emptyState())}
              className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)] hover:text-[var(--text-primary)]"
            >
              [ Clear ]
            </button>
          ) : null}
        </div>

        {/* Stage row (vertical on mobile, horizontal at sm+). Phase E
            §6 (B.2): tappable to set focus; active stage gets the
            accent-warm border; completed stages dim to ~60%; dead
            stages stay at the existing 40%. V2-02 (A3): stages reveal
            progressively: only the team picker is visible before a
            team is chosen, then R16 appears, then QF after R16=W, etc.
            The grid template column count is fed from the visible
            list so each stage grows into the available width. */}
        {visibleStageList.length > 0 ? (
        <ol
          aria-label="Stages from R16 to Final"
          className="cp-stages-grid mt-6 grid gap-px border border-[var(--border-default)] bg-[var(--rule)]"
          style={{ ["--cp-stages-count" as never]: visibleStageList.length }}
        >
          {visibleStageList.map((s) => {
            const stage = state[s];
            const dead = isPathDeadAt(state, s);
            const active = !dead && (stage.opponent !== null || nextEmptyOpponentSlot(state) === s);
            const opponentReady = stage.opponent !== null && !dead;
            const completed = isStageCompleted(s);
            const isFocused = focusStage === s && !dead;

            return (
              <li
                key={s}
                onClick={() => handleStageCardClick(s)}
                role="button"
                tabIndex={state.team && !dead ? 0 : -1}
                aria-pressed={isFocused}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleStageCardClick(s);
                  }
                }}
                className={[
                  "ck17-stage-reveal relative flex h-32 w-full cursor-pointer flex-col bg-[var(--bg-root)] p-3 transition-colors duration-100 sm:h-36",
                  "border focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                  isFocused
                    ? "border-[var(--accent-warm)]"
                    : "border-transparent",
                  dead ? "opacity-40 cursor-not-allowed" : "",
                  !dead && completed && !isFocused ? "opacity-60" : "",
                ].join(" ")}
              >
                <AccentPulse triggerKey={stagePulseKeys[s]} />
                <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-quiet)]">
                  {STAGE_LABELS[s]}
                </div>

                <div className="mt-2 flex flex-1 items-center justify-between gap-2">
                  {/* Team's code, fixed left. */}
                  <span className="inline-flex items-center gap-1.5 font-mono text-[18px] tabular-nums text-[var(--text-primary)] sm:text-[20px]">
                    {state.team ? <Flag code={state.team} size={24} /> : null}
                    <span>{state.team ?? "·"}</span>
                  </span>

                  <span className="font-mono text-[14px] text-[var(--text-quiet)]">
                    vs
                  </span>

                  {/* Opponent slot: droppable. */}
                  <CPOpponentSlot
                    stageKey={s}
                    code={stage.opponent}
                    isDead={dead || !state.team}
                  />
                </div>

                {/* V2-04 (#1): WHO ADVANCES? instruction + full team-name
                    buttons. Internal data model stays W/L; the visible
                    label is the resolved team name (3-letter FIFA code
                    fallback under 480px so long names don't wrap on
                    narrow phones). Selected state fills with
                    --accent-warm; rest border is --border-default,
                    hover border is --accent-warm. */}
                <div className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
                  WHO ADVANCES?
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["W", "L"] as const).map((r) => {
                    const isOn = stage.result === r;
                    const enabled = active && opponentReady && !dead;
                    const code = (r === "W" ? state.team : stage.opponent) as
                      | TeamCode
                      | null;
                    const fullName = code
                      ? (COUNTRY_NAMES[code as FifaCode] ?? code)
                      : "";
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={!enabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResult(s, r);
                        }}
                        aria-pressed={isOn}
                        aria-label={
                          code
                            ? `Mark ${fullName} as advancing to the next round`
                            : "Choose an opponent first"
                        }
                        className={[
                          "border px-1 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.10em] transition-colors duration-[120ms] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                          isOn
                            ? "border-[var(--accent-warm)] bg-[var(--accent-warm)] text-[var(--bg-root)] cursor-pointer"
                            : enabled
                              ? "border-[var(--border-default)] bg-[var(--bg-root)] text-[var(--text-primary)] hover:border-[var(--accent-warm)] cursor-pointer"
                              : "border-[var(--border-default)] bg-[var(--bg-root)] text-[var(--text-quiet)] cursor-not-allowed",
                        ].join(" ")}
                      >
                        {code ? (
                          <>
                            <span className="min-[480px]:hidden">
                              [ {code} advances ]
                            </span>
                            <span className="hidden min-[480px]:inline">
                              [ {fullName} advances ]
                            </span>
                          </>
                        ) : (
                          <span>{r}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
        ) : null}

        {/* Narrative line: assembles in serif as scenario fills. */}
        {narrative ? (
          <p className="mt-8 font-serif text-[18px] leading-[1.45] text-[var(--text-primary)] sm:text-[22px]">
            {narrative}
          </p>
        ) : null}

        {/* Team grid (universal picker). Phase E §6 (B.2)/(B.1): collapses
            once the entire path is resolved; the focused stage above
            tells the user where the next pick lands. */}
        <motion.div
          layout
          transition={layoutTransition}
          className="overflow-hidden"
        >
          {pickerExpanded ? (
            <TeamPickerGrid selected={usedCodes} onPick={handlePick} draggable={true} />
          ) : (
            <button
              type="button"
              onClick={() => setManuallyExpanded(true)}
              className="mt-6 flex h-12 w-full items-center justify-center border border-[var(--border-default)] bg-[var(--bg-root)] font-mono text-[12px] uppercase tracking-[0.10em] text-[var(--text-tertiary)] transition-colors duration-100 hover:border-[var(--accent-warm)] hover:text-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]"
              aria-expanded={false}
              aria-controls="cp-picker-grid"
            >
              [ Edit story ]
            </button>
          )}
        </motion.div>

        {/* Live Agreement Gauge. Show-threshold per Phase D §4.2: the
            entire path must be resolved (all 4 stages with W/L set, or
            the first L). Until then, the gauge stays in ghost state to
            avoid premature rarity claims. */}
        <div className="mt-8 max-w-md">
          <LiveAgreementGauge
            count={liveScore?.count ?? 0}
            total={liveScore?.total ?? 10000}
            isComplete={resolved}
            variant="compact"
          />
        </div>

        {/* CP-03: submit affordance lives in the sticky meter below; the
            in-flow button is removed to avoid two competing submit CTAs.
            The error panel keeps its own retry. */}
        <div className="mt-10 flex flex-col items-start gap-3">
          {errorKind ? (
            <SubmitErrorPanel
              kind={errorKind}
              onRetry={handleSubmit}
              retryInFlight={submitting}
            />
          ) : null}
        </div>
      </section>

      <StickyProgressMeter
        current={
          STAGE_KEYS.filter(
            (s) => state[s].opponent !== null && state[s].result !== null,
          ).length
        }
        total={4}
        modeLabel="CHAMPION'S PATH"
        isReady={resolved && !submitting}
        isSubmitted={submitted}
        onSubmit={handleSubmit}
      />

      <DragOverlay dropAnimation={null}>
        {activeCode ? (
          <div className="z-50 inline-flex items-center gap-2 border border-[var(--text-primary)] bg-[var(--text-primary)] px-3 py-2 font-mono text-[20px] tabular-nums text-[var(--bg-root)] shadow-lg">
            <Flag code={activeCode} size={24} />
            <span>{activeCode}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

