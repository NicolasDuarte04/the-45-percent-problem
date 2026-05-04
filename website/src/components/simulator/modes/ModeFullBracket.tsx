"use client";

/**
 * Full Bracket build mode per IMPL_PROMPT §2.3 + design v1 §2.3.
 *
 * Scope (Phase A):
 *   - 12 group cards: pick winner + runner-up per group (24 picks).
 *   - Knockout bracket (R16 → QF → SF → F): 15 click-to-advance picks.
 *   - Submit when all 36 picks are filled.
 *
 * Schema-vs-tournament drift (FLAGGED):
 *   The simulator's FullBracketScenario schema (in src/lib/sim/types.ts)
 *   assumes a 16-team R16-onwards bracket — `koAdvancers.length === 15`
 *   (8 R16 + 4 QF + 2 SF + 1 F = 15). The actual WC 2026 expanded format
 *   adds a Round of 32 (32 KO entrants — 12 winners + 12 runners-up + 8
 *   best 3rd-placed teams). Phase A's deterministic mock score does not
 *   require the bracket structure to match reality — it canonicalizes
 *   the scenario and hashes — so this 15-advancer shape is stable for
 *   Phase A. Migration to the real R32-included bracket lands when the
 *   simulation engine output (Phase C) actually feeds the score; the
 *   schema and this UI both rev at that point. Surfaced for visibility.
 *
 * Per Patch v2.1 §3: NO partial rarity band, NO partial 1-in-N during
 * build. Reveal happens only on the permalink page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { TeamCode } from "@/lib/sim/types";

interface ModeFullBracketProps {
  modelSha: string;
  snapshotSha: string;
}

const GROUPS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L",
];

/**
 * Phase-A R16 source map. Each entry pairs a left-side group result
 * with a right-side group result. The selection is deterministic so
 * the canonicalized scenario hashes stably; it is NOT the FIFA
 * official R16 pairing (which doesn't exist in a 16-team R16 because
 * WC 2026's actual bracket is 32-team R32 → R16). See module header.
 */
const R16_PAIRINGS: ReadonlyArray<readonly [string, string]> = [
  ["1A", "2B"],
  ["1C", "2D"],
  ["1E", "2F"],
  ["1G", "2H"],
  ["1I", "2J"],
  ["1K", "2L"],
  ["2A", "1B"],
  ["2C", "1D"],
] as const;

interface GroupSelection {
  winner: TeamCode | null;
  runnerUp: TeamCode | null;
}

interface BuildState {
  groupSelections: Record<GroupLetter, GroupSelection>;
  /** 15 entries: indexes 0..7 = R16 advancers; 8..11 = QF; 12..13 = SF; 14 = F. */
  koAdvancers: (TeamCode | null)[];
}

function emptyState(): BuildState {
  const groupSelections = {} as Record<GroupLetter, GroupSelection>;
  for (const g of GROUPS) groupSelections[g] = { winner: null, runnerUp: null };
  return { groupSelections, koAdvancers: Array(15).fill(null) };
}

function hydrate(): BuildState {
  const cached = readInflightForMode("full_bracket") as Partial<BuildState> | null;
  const base = emptyState();
  if (!cached || typeof cached !== "object") return base;
  if (cached.groupSelections && typeof cached.groupSelections === "object") {
    for (const g of GROUPS) {
      const sel = cached.groupSelections[g];
      if (sel && typeof sel === "object") {
        if (
          typeof sel.winner === "string" &&
          /^[A-Z]{3}$/.test(sel.winner)
        ) {
          base.groupSelections[g].winner = sel.winner as TeamCode;
        }
        if (
          typeof sel.runnerUp === "string" &&
          /^[A-Z]{3}$/.test(sel.runnerUp)
        ) {
          base.groupSelections[g].runnerUp = sel.runnerUp as TeamCode;
        }
      }
    }
  }
  if (Array.isArray(cached.koAdvancers)) {
    for (let i = 0; i < 15; i++) {
      const v = cached.koAdvancers[i];
      base.koAdvancers[i] =
        typeof v === "string" && /^[A-Z]{3}$/.test(v)
          ? (v as TeamCode)
          : null;
    }
  }
  return base;
}

function teamsByGroup(): Record<GroupLetter, TeamCode[]> {
  const byGroup = {} as Record<GroupLetter, TeamCode[]>;
  for (const g of GROUPS) byGroup[g] = [];
  for (const team of TEAMS) {
    byGroup[team.group].push(team.fifa_code);
  }
  return byGroup;
}

function resolveSource(source: string, s: BuildState): TeamCode | null {
  const m = source.match(/^([12])([A-L])$/);
  if (!m) return null;
  const [, rank, g] = m;
  const sel = s.groupSelections[g as GroupLetter];
  return rank === "1" ? sel.winner : sel.runnerUp;
}

function allGroupsComplete(s: BuildState): boolean {
  return GROUPS.every(
    (g) => s.groupSelections[g].winner && s.groupSelections[g].runnerUp,
  );
}

function isResolved(s: BuildState): boolean {
  if (!allGroupsComplete(s)) return false;
  return s.koAdvancers.every((a) => a !== null);
}

function r16Pair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  const [h, a] = R16_PAIRINGS[idx];
  return { home: resolveSource(h, s), away: resolveSource(a, s) };
}

function qfPair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[idx * 2], away: s.koAdvancers[idx * 2 + 1] };
}

function sfPair(idx: number, s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[8 + idx * 2], away: s.koAdvancers[8 + idx * 2 + 1] };
}

function finalPair(s: BuildState): { home: TeamCode | null; away: TeamCode | null } {
  return { home: s.koAdvancers[12], away: s.koAdvancers[13] };
}

export function ModeFullBracket({
  modelSha,
  snapshotSha,
}: ModeFullBracketProps) {
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
    writeInflight("full_bracket", state);
  }, [state]);

  const groupTeams = useMemo(() => teamsByGroup(), []);

  function handleGroupClick(g: GroupLetter, code: TeamCode) {
    setErrorCopy(null);
    setState((prev) => {
      const sel = prev.groupSelections[g];
      // Click cycle: winner → runner-up → unset → winner.
      let nextSel: GroupSelection;
      if (sel.winner === code) {
        // Currently winner; demote to runner-up if no other runner-up,
        // or clear if already the runner-up of someone else's slot.
        nextSel = { winner: null, runnerUp: code };
        // If another team was the runner-up, unseat them.
        if (sel.runnerUp === code) nextSel = { winner: null, runnerUp: null };
      } else if (sel.runnerUp === code) {
        nextSel = { ...sel, runnerUp: null };
      } else if (!sel.winner) {
        nextSel = { ...sel, winner: code };
      } else if (!sel.runnerUp) {
        nextSel = { ...sel, runnerUp: code };
      } else {
        // Both filled and clicked team is neither — replace runner-up.
        nextSel = { ...sel, runnerUp: code };
      }
      // Group changes invalidate downstream KO advancers entirely
      // (cleanest reset rule; the alternative is partial invalidation
      // which is harder to reason about and more annoying than
      // re-clicking the bracket).
      return {
        groupSelections: { ...prev.groupSelections, [g]: nextSel },
        koAdvancers: Array(15).fill(null),
      };
    });
  }

  function handleAdvance(idx: number, code: TeamCode | null) {
    if (!code) return;
    setErrorCopy(null);
    setState((prev) => {
      const next = [...prev.koAdvancers];
      // Setting an advancer invalidates all downstream advancers.
      next[idx] = code;
      // Compute downstream cascade: changing R16 idx i invalidates
      // QF[floor(i/2)] (which sits at index 8 + floor(i/2)) and the
      // chain after it. Conservative: clear everything strictly after
      // the current group of stages.
      const stageStart = idx < 8 ? 8 : idx < 12 ? 12 : idx < 14 ? 14 : 15;
      for (let i = stageStart; i < 15; i++) next[i] = null;
      return { ...prev, koAdvancers: next };
    });
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
    const koAdvancers = state.koAdvancers.filter((a): a is TeamCode => a !== null);
    if (koAdvancers.length !== 15) return;

    setSubmitting(true);
    setErrorCopy(null);
    const result = await submitPrediction({
      mode: "full_bracket",
      scenario: { groupWinners, groupRunnersUp, koAdvancers },
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
  const resolved = isResolved(state);

  return (
    <section aria-labelledby="fb-heading" className="pt-10 pb-12">
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
        Twelve group winners, twelve runners-up, then the knockouts.
      </p>

      {/* Group cards. */}
      <div className="mt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
          Groups
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
                        sel.winner === code
                          ? "1"
                          : sel.runnerUp === code
                            ? "2"
                            : "";
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
                            <span className="text-[10px] opacity-70">
                              {rank}
                            </span>
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

      {/* Knockouts — only render once groups are complete. */}
      {groupsDone ? (
        <div className="mt-10">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.10em] text-[var(--text-tertiary)]">
            Knockouts
          </h2>
          <KOStage
            label="Round of 16"
            count={8}
            getMatch={(i) => r16Pair(i, state)}
            getAdvancer={(i) => state.koAdvancers[i]}
            onAdvance={(i, code) => handleAdvance(i, code)}
          />
          <KOStage
            label="Quarterfinals"
            count={4}
            getMatch={(i) => qfPair(i, state)}
            getAdvancer={(i) => state.koAdvancers[8 + i]}
            onAdvance={(i, code) => handleAdvance(8 + i, code)}
            offsetIdx={8}
          />
          <KOStage
            label="Semifinals"
            count={2}
            getMatch={(i) => sfPair(i, state)}
            getAdvancer={(i) => state.koAdvancers[12 + i]}
            onAdvance={(i, code) => handleAdvance(12 + i, code)}
            offsetIdx={12}
          />
          <KOStage
            label="Final"
            count={1}
            getMatch={() => finalPair(state)}
            getAdvancer={() => state.koAdvancers[14]}
            onAdvance={(_, code) => handleAdvance(14, code)}
            offsetIdx={14}
          />
        </div>
      ) : (
        <p className="mt-8 font-sans text-[12px] text-[var(--text-quiet)]">
          Choose a winner and a runner-up in each group above to unlock the
          knockout bracket.
        </p>
      )}

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

// ── Sub-component for a KO stage. Pure, no internal state. ────────────────────

interface KOStageProps {
  label: string;
  count: number;
  getMatch: (i: number) => { home: TeamCode | null; away: TeamCode | null };
  getAdvancer: (i: number) => TeamCode | null;
  onAdvance: (i: number, code: TeamCode | null) => void;
  /** Used only for stable React keys when nested in JSX. */
  offsetIdx?: number;
}

function KOStage({
  label,
  count,
  getMatch,
  getAdvancer,
  onAdvance,
  offsetIdx = 0,
}: KOStageProps) {
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
              key={offsetIdx + i}
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
