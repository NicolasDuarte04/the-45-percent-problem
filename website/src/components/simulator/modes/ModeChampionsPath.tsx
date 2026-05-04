"use client";

/**
 * Champion's Path build mode per IMPL_PROMPT §2.2 + design v2 §5.4.
 *
 * Interaction model:
 *   1. User picks their team from the 48-team grid.
 *   2. Four stages render (R16, QF, SF, F). Each stage shows the
 *      user's team fixed on the left, an empty opponent slot in the
 *      middle, and a W / L result toggle on the right.
 *   3. The team grid below acts as a universal picker: a click
 *      slots the team into the next available position — the team
 *      field if unset, else the next empty stage's opponent.
 *   4. Each stage's opponent must be filled BEFORE its W/L toggle
 *      becomes active.
 *   5. If the user picks L at any stage, all later stages disable
 *      and grey out. The path resolves at that loss.
 *   6. If the user picks W at every stage, the path resolves at the
 *      Final.
 *   7. The narrative line below the stages assembles in serif as the
 *      scenario fills, using the existing renderStoryLine helper —
 *      the same function that produces the story for the Trade
 *      Ticket and the verification email's context block.
 *
 * Per Patch v2.1 §3: NO partial rarity band, NO partial 1-in-N
 * rendered during build. The reveal happens on /scenario/p/[id].
 *
 * No dropdown filtering of "reachable" opponents (IMPL_PROMPT §2.2's
 * design v1 talks about filtering opponents to those the model
 * considers reachable in at least 1/10,000 runs). Phase A's mock
 * does not have real Monte-Carlo run data; that filter lands in
 * Phase C with the real engine output. For now, all 47 other teams
 * are pickable as any opponent.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamPickerGrid } from "@/components/simulator/TeamPickerGrid";
import {
  clearInflight,
  readInflightForMode,
  writeInflight,
} from "@/lib/sim/inflightStore";
import { submitPrediction } from "@/lib/sim/predictionsApi";
import { renderStoryLine } from "@/lib/sim/renderStoryLine";
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

/** True if a stage strictly before `stage` has result === "L" — meaning
 *  this stage is unreachable and must not accept input. */
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
  // We rebuild step-by-step; the empty r16 above is a placeholder so
  // TypeScript narrows correctly — we'll either fill r16 below or
  // return null.
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

export function ModeChampionsPath({
  modelSha,
  snapshotSha,
}: ModeChampionsPathProps) {
  const router = useRouter();
  const [state, setState] = useState<BuildState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [errorCopy, setErrorCopy] = useState<string | null>(null);
  const hydratedRef = useRef(false);

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
      // Toggle off if already used.
      if (prev.team === code) {
        // Clearing the team also clears every stage.
        return emptyState();
      }
      for (const s of STAGE_KEYS) {
        if (prev[s].opponent === code) {
          // Clearing this opponent also clears subsequent stages
          // (their reachability assumption no longer holds).
          const next = { ...prev };
          let clearing = false;
          for (const t of STAGE_KEYS) {
            if (t === s) clearing = true;
            if (clearing) next[t] = emptyStage();
          }
          return next;
        }
      }
      // Net-new pick.
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
      // If this stage just became a loss, clear all later stages.
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

  return (
    <section aria-labelledby="cp-heading" className="pt-10 pb-12">
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
          : "First, pick the team you are tracing."}
      </p>

      {/* Stage row — vertical on mobile, horizontal at sm+. */}
      <ol
        aria-label="Stages from R16 to Final"
        className="mt-8 grid grid-cols-1 gap-px border border-[var(--border-default)] bg-[var(--rule)] sm:grid-cols-4"
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
                <span className="font-mono text-[18px] tabular-nums text-[var(--text-primary)] sm:text-[20px]">
                  {state.team ?? "—"}
                </span>

                <span className="font-mono text-[14px] text-[var(--text-quiet)]">
                  vs
                </span>

                {/* Opponent slot. */}
                <span
                  className={[
                    "font-mono text-[18px] tabular-nums sm:text-[20px]",
                    stage.opponent
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-quiet)]",
                  ].join(" ")}
                >
                  {stage.opponent ?? "—"}
                </span>
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
      <TeamPickerGrid selected={usedCodes} onPick={handlePick} />

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
  );
}
