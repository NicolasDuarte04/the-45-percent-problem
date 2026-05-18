import { describe, expect, it } from "vitest";
import {
  evaluatePrediction,
  EVALUATOR_VERSION,
  type MatchStage,
} from "@/lib/sim/predictionEvaluator";
import { WC2026_GROUP_ASSIGNMENTS } from "@/lib/sim/groupStandings";
import type { Prediction, MatchOutcome } from "@/lib/db/schema";

// Shared fixture builders. The evaluator is a pure function over a
// prediction row plus a list of settled matches; we construct rows
// directly rather than going through the DB so the unit tests are fast
// and deterministic.

function makePrediction(overrides: Partial<Prediction>): Prediction {
  return {
    id: "45A-2026-AAAA",
    subscriberId: null,
    email: null,
    mode: "final_four",
    scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
    storyLine: "Argentina, Brazil, France, England in the semifinals.",
    countOriginal: 184,
    countCurrent: 184,
    total: 10000,
    state: "alive",
    killedBy: null,
    modelSha: "a3f2c1d",
    snapshotSha: "9b7e2f4",
    submittedAt: new Date("2026-05-03T00:00:00.000Z"),
    updatedAt: new Date("2026-05-03T00:00:00.000Z"),
    ...overrides,
  };
}

let MATCH_SEQ = 0;
function makeMatch(
  stage: MatchStage,
  home: string,
  away: string,
  homeGoals: number,
  awayGoals: number,
  shootoutWinner?: string,
): MatchOutcome {
  MATCH_SEQ += 1;
  return {
    matchId: `M${String(MATCH_SEQ).padStart(3, "0")}`,
    competition: "WC2026",
    stage,
    homeTeam: home,
    awayTeam: away,
    homeGoals,
    awayGoals,
    shootoutWinner: shootoutWinner ?? null,
    settledAt: new Date("2026-06-15T20:00:00.000Z"),
    enteredAt: new Date("2026-06-15T21:00:00.000Z"),
    enteredBy: "test",
    meta: {},
  };
}

describe("evaluatePrediction: Final Four", () => {
  it("stays alive when no settled matches eliminate any of the four picks", () => {
    const prediction = makePrediction({ mode: "final_four" });
    const matches: MatchOutcome[] = [
      // A R32 match between two teams not on the user's pick list. No
      // effect on the scenario.
      makeMatch("r32", "MEX", "USA", 2, 1),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("alive");
    expect(result.evaluatorVersion).toBe(EVALUATOR_VERSION);
    expect(result.newCountCurrent).toBeGreaterThan(0);
    expect(result.reason).toMatch(/alive/i);
  });

  it("transitions to dead when one pick loses in R32", () => {
    const prediction = makePrediction({
      mode: "final_four",
      scenario: { semifinalists: ["GER", "ESP", "FRA", "ARG"] },
    });
    const matches: MatchOutcome[] = [
      makeMatch("r32", "GER", "ITA", 0, 2),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("dead");
    expect(result.newCountCurrent).toBe(0);
    expect(result.reason).toContain("GER");
    expect(result.reason).toContain("R32");
  });

  it("promotes when all four picks win their QF matches (reach SF)", () => {
    const prediction = makePrediction({
      mode: "final_four",
      scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
    });
    const matches: MatchOutcome[] = [
      makeMatch("qf", "ARG", "MEX", 3, 1),
      makeMatch("qf", "BRA", "GER", 2, 0),
      makeMatch("qf", "FRA", "POR", 2, 1),
      makeMatch("qf", "ENG", "ESP", 1, 0),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("promoted");
    expect(result.newCountCurrent).toBe(prediction.total);
    expect(result.reason).toMatch(/promoted/i);
  });

  it("treats a shootout-decided knockout match as a contradiction when the loser is a pick", () => {
    const prediction = makePrediction({
      mode: "final_four",
      scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
    });
    const matches: MatchOutcome[] = [
      // Drawn 1-1 in regulation, MEX won the shootout. ARG eliminated.
      makeMatch("r16", "ARG", "MEX", 1, 1, "MEX"),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("dead");
    expect(result.reason).toContain("ARG");
    expect(result.reason).toContain("shootout");
  });
});

describe("evaluatePrediction: Champion's Path", () => {
  function champPath(team: string, stages: Record<string, { opponent: string; result: "W" | "L" }>): Prediction {
    return makePrediction({
      mode: "champions_path",
      scenario: { team, ...stages },
    });
  }

  it("stays alive when the team's R32 match has not yet been played", () => {
    const prediction = champPath("ARG", {
      r16: { opponent: "MEX", result: "W" },
      qf: { opponent: "GER", result: "W" },
    });
    const result = evaluatePrediction({ prediction, settledMatches: [] });
    expect(result.newState).toBe("alive");
    expect(result.reason).toMatch(/alive/i);
  });

  it("transitions to dead when the team's R32 match settles with the opposite result", () => {
    const prediction = champPath("ARG", {
      r16: { opponent: "MEX", result: "W" },
      qf: { opponent: "GER", result: "W" },
    });
    const matches: MatchOutcome[] = [
      // The scenario predicts ARG wins R32; actual outcome is ARG loses.
      makeMatch("r32", "ARG", "MEX", 0, 2),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("dead");
    expect(result.reason).toContain("ARG");
    expect(result.reason).toContain("contradicts");
  });

  it("promotes when the deepest predicted stage is confirmed (e.g., predicted L in SF, team lost QF)", () => {
    // The Champion's Path scenario's stage keys predate WC 2026's R32. The
    // mapping is: r16 -> R32, qf -> R16, sf -> QF, f -> SF.
    // Here the user predicts ARG reaches QF (R16 stage) then loses
    // (qf=L means "lost the R16 match"). Promotion fires when the team's
    // R16 match settles as a loss.
    const prediction = champPath("ARG", {
      r16: { opponent: "MEX", result: "W" },
      qf: { opponent: "GER", result: "L" },
    });
    const matches: MatchOutcome[] = [
      makeMatch("r32", "ARG", "MEX", 2, 0),
      makeMatch("r16", "ARG", "GER", 0, 1),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("promoted");
    expect(result.newCountCurrent).toBe(prediction.total);
  });

  it("promotes a champion prediction only after the Final settles W", () => {
    const prediction = champPath("ESP", {
      r16: { opponent: "ITA", result: "W" },
      qf: { opponent: "GER", result: "W" },
      sf: { opponent: "BRA", result: "W" },
      f: { opponent: "ARG", result: "W" },
    });
    const matches: MatchOutcome[] = [
      makeMatch("r32", "ESP", "ITA", 2, 0),
      makeMatch("r16", "ESP", "GER", 1, 0),
      makeMatch("qf", "ESP", "BRA", 2, 1),
      makeMatch("sf", "ESP", "POR", 3, 0),
      makeMatch("final", "ESP", "ARG", 2, 1),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("promoted");
    expect(result.reason).toContain("ESP");
    expect(result.reason).toMatch(/Final|champion/i);
  });
});

describe("evaluatePrediction: Full Bracket", () => {
  function makeFullBracket(koAdvancers: string[], state: Prediction["state"] = "alive"): Prediction {
    // Realistic groups data is not load-bearing for these tests; we
    // construct a valid 24-team group set and 8 best thirds.
    const groupWinners = [
      "ARG", "BRA", "FRA", "ENG",
      "ESP", "GER", "NED", "POR",
      "BEL", "MEX", "JPN", "CRO",
    ];
    const groupRunnersUp = [
      "ECU", "COL", "URU", "USA",
      "ITA", "SUI", "AUS", "MAR",
      "KOR", "CAN", "POL", "TUR",
    ];
    const bestThirds = ["DEN", "SCO", "WAL", "SEN", "EGY", "GHA", "QAT", "IRN"];
    return makePrediction({
      mode: "full_bracket",
      scenario: { groupWinners, groupRunnersUp, bestThirds, koAdvancers },
      state,
    });
  }

  it("stays alive at the final stage when no settled matches contradict the bracket", () => {
    const ko = [
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "BEL", "MEX", "JPN", "CRO", "ECU", "COL", "URU", "USA",
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "ARG", "BRA", "FRA", "ESP",
      "ARG", "ESP",
      "ESP",
    ];
    const prediction = makeFullBracket(ko);
    const result = evaluatePrediction({ prediction, settledMatches: [] });
    expect(result.newState).toBe("alive");
  });

  it("transitions to dead when a predicted R32 winner actually lost their R32 match", () => {
    // Stage = r32 (16 picks). The user predicts ARG wins their R32 match.
    const ko = [
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "BEL", "MEX", "JPN", "CRO", "ECU", "COL", "URU", "USA",
    ];
    const prediction = makeFullBracket(ko);
    const matches: MatchOutcome[] = [
      makeMatch("r32", "ARG", "ITA", 0, 1),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("dead");
    expect(result.reason).toContain("ARG");
    expect(result.reason).toMatch(/R32|contradicted/i);
  });

  it("promotes a final-stage bracket when the predicted champion wins the Final", () => {
    const ko = [
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "BEL", "MEX", "JPN", "CRO", "ECU", "COL", "URU", "USA",
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "ARG", "BRA", "FRA", "ESP",
      "ARG", "ESP",
      "ESP",
    ];
    const prediction = makeFullBracket(ko);
    const matches: MatchOutcome[] = [
      makeMatch("final", "ESP", "ARG", 2, 1),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("promoted");
    expect(result.newCountCurrent).toBe(prediction.total);
  });

  it("stays alive at an intermediate stage when only some picks have settled", () => {
    // Stage = qf (28 picks).
    const ko = [
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "BEL", "MEX", "JPN", "CRO", "ECU", "COL", "URU", "USA",
      "ARG", "BRA", "FRA", "ENG", "ESP", "GER", "NED", "POR",
      "ARG", "BRA", "FRA", "ESP",
    ];
    const prediction = makeFullBracket(ko);
    // Two of the four QF picks have settled as wins. Not yet promoted.
    const matches: MatchOutcome[] = [
      makeMatch("qf", "ARG", "MEX", 2, 1),
      makeMatch("qf", "BRA", "ENG", 3, 2),
    ];
    const result = evaluatePrediction({ prediction, settledMatches: matches });
    expect(result.newState).toBe("alive");
    expect(result.newCountCurrent).toBeGreaterThanOrEqual(1);
  });
});

describe("evaluatePrediction: cross-mode invariants", () => {
  it("stamps the evaluator version on every output", () => {
    const prediction = makePrediction({ mode: "final_four" });
    const result = evaluatePrediction({ prediction, settledMatches: [] });
    expect(result.evaluatorVersion).toBe(EVALUATOR_VERSION);
  });

  it("never returns a count above total or below zero", () => {
    const prediction = makePrediction({
      mode: "final_four",
      scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
      total: 10000,
    });
    const result = evaluatePrediction({ prediction, settledMatches: [] });
    expect(result.newCountCurrent).toBeGreaterThanOrEqual(0);
    expect(result.newCountCurrent).toBeLessThanOrEqual(prediction.total);
  });

  it("does not produce evaluative or sentiment words in reason strings", () => {
    const banned = ["luck", "tough", "nice", "great", "missed", "sorry", "congrats"];
    const samples: Array<() => string> = [
      () => {
        const prediction = makePrediction({
          mode: "final_four",
          scenario: { semifinalists: ["GER", "ESP", "FRA", "ARG"] },
        });
        return evaluatePrediction({
          prediction,
          settledMatches: [makeMatch("r32", "GER", "ITA", 0, 2)],
        }).reason;
      },
      () => {
        const prediction = makePrediction({ mode: "final_four" });
        return evaluatePrediction({ prediction, settledMatches: [] }).reason;
      },
      () => {
        const prediction = makePrediction({
          mode: "champions_path",
          scenario: {
            team: "ARG",
            r16: { opponent: "MEX", result: "W" },
            qf: { opponent: "GER", result: "L" },
          },
        });
        return evaluatePrediction({
          prediction,
          settledMatches: [
            makeMatch("r32", "ARG", "MEX", 2, 0),
            makeMatch("r16", "ARG", "GER", 0, 1),
          ],
        }).reason;
      },
    ];
    for (const fn of samples) {
      const reason = fn().toLowerCase();
      for (const word of banned) {
        expect(reason).not.toContain(word);
      }
    }
  });
});

// ─── Full Bracket: groups stage (Checkpoint 15) ─────────────────────────────

// Helper to build a fully-played group: all 6 matches as the same
// scoreline pattern, producing winners and runners-up consistent with
// the team order passed in.
function playFullGroupForOrder(
  order: readonly [string, string, string, string],
): MatchOutcome[] {
  // Schedule so that order[0] beats everyone, order[1] beats order[2]
  // and order[3], order[2] beats order[3], order[3] loses all. Result:
  // W=order[0], RU=order[1], 3rd=order[2], 4th=order[3].
  return [
    makeMatch("group", order[0], order[1], 1, 0),
    makeMatch("group", order[0], order[2], 1, 0),
    makeMatch("group", order[0], order[3], 1, 0),
    makeMatch("group", order[1], order[2], 1, 0),
    makeMatch("group", order[1], order[3], 1, 0),
    makeMatch("group", order[2], order[3], 1, 0),
  ];
}

// All 12 groups fully played, with the canonical pot order shaping
// each group's standings (pot 1 wins, pot 2 RU, pot 3 third, pot 4
// fourth). Tests can override individual groups by passing an override
// map keyed by group letter.
function playAllGroups(
  overrides?: Partial<Record<string, readonly [string, string, string, string]>>,
): MatchOutcome[] {
  const out: MatchOutcome[] = [];
  for (const a of WC2026_GROUP_ASSIGNMENTS) {
    const order =
      (overrides?.[a.group] as readonly [string, string, string, string] | undefined) ??
      (a.teams as readonly [string, string, string, string]);
    out.push(...playFullGroupForOrder(order));
  }
  return out;
}

// Builds a Full Bracket scenario with groups-stage commitment. The
// arrays default to the canonical pot order (pot 1 winners, pot 2
// runners-up); callers can override either field. bestThirds default
// to the 3rd-placed teams from groups A through H (the alphabetical
// first 8). The koAdvancers array stays empty (the "groups" stage).
function makeGroupsScenario(overrides?: {
  groupWinners?: string[];
  groupRunnersUp?: string[];
  bestThirds?: string[];
}): {
  groupWinners: string[];
  groupRunnersUp: string[];
  bestThirds: string[];
  koAdvancers: string[];
} {
  const groupWinners =
    overrides?.groupWinners ??
    WC2026_GROUP_ASSIGNMENTS.map((a) => a.teams[0] as string);
  const groupRunnersUp =
    overrides?.groupRunnersUp ??
    WC2026_GROUP_ASSIGNMENTS.map((a) => a.teams[1] as string);
  const bestThirds =
    overrides?.bestThirds ??
    WC2026_GROUP_ASSIGNMENTS.slice(0, 8).map((a) => a.teams[2] as string);
  return {
    groupWinners,
    groupRunnersUp,
    bestThirds,
    koAdvancers: [],
  };
}

describe("evaluatePrediction: Full Bracket groups stage", () => {
  it("stays alive when some groups are settled and consistent but others have not started", () => {
    const scenario = makeGroupsScenario();
    const prediction = makePrediction({ mode: "full_bracket", scenario });
    // Only one group fully played; the rest unsettled. The user's pot-1
    // winner and pot-2 RU for that group match the actual outcome.
    const groupA = WC2026_GROUP_ASSIGNMENTS[0]
      .teams as readonly [string, string, string, string];
    const settledMatches = playFullGroupForOrder(groupA);
    const result = evaluatePrediction({ prediction, settledMatches });
    expect(result.newState).toBe("alive");
    expect(result.reason).toMatch(/consistent/i);
  });

  it("transitions to dead when a fully-settled group's actual RU differs from the prediction", () => {
    // Predict the canonical RU for Group A (RSA), but make KOR win it
    // instead. The evaluator should call out the contradiction.
    const scenario = makeGroupsScenario();
    const prediction = makePrediction({ mode: "full_bracket", scenario });
    const altGroupA: [string, string, string, string] = [
      "MEX", "KOR", "RSA", "CZE", // W=MEX, RU=KOR (not RSA)
    ];
    const settledMatches = playFullGroupForOrder(altGroupA);
    const result = evaluatePrediction({ prediction, settledMatches });
    expect(result.newState).toBe("dead");
    expect(result.reason).toContain("Group A");
    expect(result.reason).toContain("KOR");
    expect(result.reason).toContain("predicted RSA");
  });

  it("transitions to promoted when all 12 groups settle and W, RU, and best thirds all match", () => {
    // When every group plays the canonical pot order, every group's
    // 3rd-placed team finishes at the same (points, GD, GS), so the
    // best-thirds tier is decided by the alphabetical FIFA-code
    // fallback. Pot-3 teams across A..L sorted alphabetically:
    //   AUS, AUT, CIV, COL, GHA, HAI, IRN, IRQ, KOR, KSA, QAT, SWE
    // Top 8 are AUS, AUT, CIV, COL, GHA, HAI, IRN, IRQ.
    const actualTop8 = ["AUS", "AUT", "CIV", "COL", "GHA", "HAI", "IRN", "IRQ"];
    const scenario = makeGroupsScenario({ bestThirds: actualTop8 });
    const prediction = makePrediction({ mode: "full_bracket", scenario });
    const settledMatches = playAllGroups();
    const result = evaluatePrediction({ prediction, settledMatches });
    expect(result.newState).toBe("promoted");
    expect(result.newCountCurrent).toBe(prediction.total);
    expect(result.reason).toContain("All 12 groups confirmed");
  });

  it("stays alive mid-tournament: some groups fully played and matching, others not started", () => {
    const scenario = makeGroupsScenario();
    const prediction = makePrediction({ mode: "full_bracket", scenario });
    // Play groups A and B in full, leave C..L untouched.
    const groupA = WC2026_GROUP_ASSIGNMENTS[0]
      .teams as readonly [string, string, string, string];
    const groupB = WC2026_GROUP_ASSIGNMENTS[1]
      .teams as readonly [string, string, string, string];
    const settledMatches = [
      ...playFullGroupForOrder(groupA),
      ...playFullGroupForOrder(groupB),
    ];
    const result = evaluatePrediction({ prediction, settledMatches });
    expect(result.newState).toBe("alive");
    expect(result.newCountCurrent).toBeGreaterThan(0);
    expect(result.reason).toMatch(/consistent so far|count recomputed/i);
  });

  it("contradicts on a 3rd-place mismatch when the user named that group's best-third", () => {
    // Predict KOR as the best-third out of Group A, but actually KOR
    // ranks 4th in that group (CZE finishes 3rd). The evaluator should
    // call out the contradiction on the explicit 3rd pick.
    const scenario = makeGroupsScenario({
      bestThirds: ["KOR", "QAT", "HAI", "AUS", "CIV", "SWE", "IRN", "KSA"],
    });
    const prediction = makePrediction({ mode: "full_bracket", scenario });
    // Group A actual standings: W=MEX, RU=RSA, 3rd=CZE, 4th=KOR.
    const altGroupA: [string, string, string, string] = [
      "MEX", "RSA", "CZE", "KOR",
    ];
    const settledMatches = playFullGroupForOrder(altGroupA);
    const result = evaluatePrediction({ prediction, settledMatches });
    expect(result.newState).toBe("dead");
    expect(result.reason).toContain("Group A");
    expect(result.reason).toContain("CZE");
  });
});
