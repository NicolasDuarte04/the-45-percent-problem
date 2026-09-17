import type {
  AnyScenario,
  ChampionsPathScenario,
  FinalFourScenario,
  FullBracketScenario,
  Mode,
} from "./types";

/**
 * Stable canonicalization of a scenario for hashing. The output is a
 * deterministic JSON string that does not vary with input ordering.
 *
 * Properties:
 *  - Final Four: semifinalists are sorted alphabetically.
 *  - Champion's Path: stages preserve their natural temporal order
 *    (R16, QF, SF, F); only stages actually set are emitted.
 *  - Full Bracket: groupWinners and groupRunnersUp are sorted; KO
 *    advancers preserve bracket order (their position is meaningful).
 *
 * Team codes are uppercased (defensive; they should already be).
 */
export function canonicalizeScenario(mode: Mode, scenario: AnyScenario): string {
  switch (mode) {
    case "final_four":
      return canonicalizeFinalFour(scenario as FinalFourScenario);
    case "champions_path":
      return canonicalizeChampionsPath(scenario as ChampionsPathScenario);
    case "full_bracket":
      return canonicalizeFullBracket(scenario as FullBracketScenario);
  }
}

function canonicalizeFinalFour(s: FinalFourScenario): string {
  const sorted = [...s.semifinalists].map((t) => t.toUpperCase()).sort();
  return JSON.stringify({ m: "f4", s: sorted });
}

function canonicalizeChampionsPath(s: ChampionsPathScenario): string {
  const team = s.team.toUpperCase();
  const stages: Array<{ k: string; o: string; r: "W" | "L" }> = [];
  for (const k of ["r16", "qf", "sf", "f"] as const) {
    const v = s[k];
    if (v) stages.push({ k, o: v.opponent.toUpperCase(), r: v.result });
  }
  return JSON.stringify({ m: "cp", t: team, s: stages });
}

function canonicalizeFullBracket(s: FullBracketScenario): string {
  return JSON.stringify({
    m: "fb",
    gw: [...s.groupWinners].map((t) => t.toUpperCase()).sort(),
    gr: [...s.groupRunnersUp].map((t) => t.toUpperCase()).sort(),
    t3: [...s.bestThirds].map((t) => t.toUpperCase()).sort(),
    ko: s.koAdvancers.map((t) => t.toUpperCase()),
  });
}
