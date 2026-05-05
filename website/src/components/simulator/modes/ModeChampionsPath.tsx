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
import { TeamPickerGrid } from "@/components/simulator/TeamPickerGrid";
import { Flag } from "@/components/primitives/Flag";
import { EmptySlot } from "@/components/simulator/EmptySlot";
import { LiveAgreementGauge } from "@/components/simulator/reality/LiveAgreementGauge";
import {
  clearInflight,
  readInflightForMode,
  writeInflight,
} from "@/lib/sim/inflightStore";
import { submitPrediction } from "@/lib/sim/predictionsApi";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
import { computeRealityScore } from "@/lib/sim/computeRealityScore";
import { canonicalizeScenario } from "@/lib/sim/canonicalizeScenario";
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
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<TeamCode | null>(null);
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
    setErrorCopy(null);
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
      const slot = nextEmptyOpponentSlot(prev);
      if (!slot) return prev;
      const next = { ...prev };
      next[slot] = { opponent: code, result: null };
      return next;
    });
  }

  function handleResult(stage: StageKey, result: "W" | "L") {
    if (state[stage].opponent === null) return;
    if (isPathDeadAt(state, stage)) return;
    setErrorCopy(null);
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
        setErrorCopy(null);
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
      setErrorCopy(null);
    }
  }

  function handleReset() {
    setState(emptyState());
    clearInflight();
    setErrorCopy(null);
  }

  async function handleSubmit() {
    if (!isResolved(state) || submitting) return;
    const scenario = toSubmissionScenario(state);
    if (!scenario) return;
    setSubmitting(true);
    setErrorCopy(null);
    const result = await submitPrediction({
      mode: "champions_path",
      scenario,
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

  const submissionScenario = toSubmissionScenario(state);
  const narrative = submissionScenario
    ? renderStoryLine("champions_path", submissionScenario)
    : "";
  const resolved = isResolved(state);

  // Live Reality Score — only percentage, no band / 1-in-N per v2.1 §3.
  const liveScore = useMemo(() => {
    if (!submissionScenario) return null;
    const canonical = canonicalizeScenario("champions_path", submissionScenario);
    return computeRealityScore("champions_path", canonical, submissionScenario);
  }, [submissionScenario]);

  return (
    <DndContext
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

        {/* Stage row — vertical on mobile, horizontal at sm+. */}
        <ol
          aria-label="Stages from R16 to Final"
          className="mt-6 grid grid-cols-1 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-4"
        >
          {STAGE_KEYS.map((s) => {
            const stage = state[s];
            const dead = isPathDeadAt(state, s);
            const active = !dead && (stage.opponent !== null || nextEmptyOpponentSlot(state) === s);
            const opponentReady = stage.opponent !== null && !dead;

            return (
              <li
                key={s}
                className={[
                  "flex h-32 w-full flex-col bg-[var(--bg-root)] p-3 sm:h-36",
                  dead ? "opacity-40" : "",
                ].join(" ")}
              >
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
                        onClick={() => handleResult(s, r)}
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

        {/* Team grid (universal picker). */}
        <TeamPickerGrid selected={usedCodes} onPick={handlePick} draggable={true} />

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
          {errorCopy ? (
            <p
              role="alert"
              className="font-sans text-[13px] text-[var(--state-dead)]"
            >
              {errorCopy}
            </p>
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

