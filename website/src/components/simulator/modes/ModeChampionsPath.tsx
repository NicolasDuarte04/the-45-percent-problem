"use client";

/**
 * Champion's Path build mode per IMPL_PROMPT §2.2 + design v2 §5.4.
 *
 * Phase C: DnD upgrade — teams can be dragged from the grid onto the
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
  const [errorKind, setErrorKind] = useState<SubmitErrorKind | null>(null);
  const [activeCode, setActiveCode] = useState<TeamCode | null>(null);
  // Phase E §6 (B.2) — stage focus. When set, picks route to this stage
  // and only its presence guides the picker's "you are here" beacon.
  // null defaults to nextEmptyOpponentSlot for natural forward progression.
  const [activeStage, setActiveStage] = useState<StageKey | null>(null);
  // Phase E §6 (B.1)/Q1 — picker collapses once the path is fully resolved.
  const [manuallyExpanded, setManuallyExpanded] = useState(false);
  // Phase E §8 (D.3) — per-stage pulse counter, bumped on stage advance
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

  // Codes already used somewhere in the build — disable in the picker.
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
      // Phase E §6 (B.2) — route to the focused stage if one is active and
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
    // §8 (D.3) — fire the accent pulse on this stage card.
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

  // Phase E §6 (B.2) — derive the effective focus stage. Falls back to the
  // next-empty slot for natural progression when the user hasn't tapped
  // a stage card explicitly.
  const focusStage: StageKey | null = activeStage ?? nextEmptyOpponentSlot(state);
  // Q1 — picker is expanded whenever the path is unresolved, OR when the
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

  // Live Reality Score — only percentage, no band / 1-in-N per v2.1 §3.
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
        className="pt-10 pb-12"
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
          {state.team
            ? "Pick an opponent for each stage, then call the result."
            : "First, pick the team you are tracing — click or drag from the grid."}
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

        {/* Stage row — vertical on mobile, horizontal at sm+. Phase E
            §6 (B.2): tappable to set focus; active stage gets the
            accent-warm border; completed stages dim to ~60%; dead
            stages stay at the existing 40%. */}
        <ol
          aria-label="Stages from R16 to Final"
          className="mt-6 grid grid-cols-1 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-4"
        >
          {STAGE_KEYS.map((s) => {
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
                  "relative flex h-32 w-full cursor-pointer flex-col bg-[var(--bg-root)] p-3 transition-colors duration-100 sm:h-36",
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
                    <span>{state.team ?? "—"}</span>
                  </span>

                  <span className="font-mono text-[14px] text-[var(--text-quiet)]">
                    vs
                  </span>

                  {/* Opponent slot — droppable. */}
                  <CPOpponentSlot
                    stageKey={s}
                    code={stage.opponent}
                    isDead={dead || !state.team}
                  />
                </div>

                {/* W / L toggle. */}
                <div className="mt-2 grid grid-cols-2 gap-px border border-[var(--border-default)] bg-[var(--rule)]">
                  {(["W", "L"] as const).map((r) => {
                    const isOn = stage.result === r;
                    const enabled = active && opponentReady && !dead;
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
                        className={[
                          "py-1.5 text-center font-mono text-[12px] uppercase tracking-[0.10em] transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-[var(--accent-focus)]",
                          isOn
                            ? "bg-[var(--text-primary)] text-[var(--bg-root)]"
                            : enabled
                              ? "bg-[var(--bg-root)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-elev)]"
                              : "bg-[var(--bg-root)] text-[var(--text-quiet)] cursor-not-allowed",
                        ].join(" ")}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Narrative line — assembles in serif as scenario fills. */}
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

        {/* Live Agreement Gauge — show-threshold per Phase D §4.2: the
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

        {/* Submit + error. */}
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

