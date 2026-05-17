import { describe, expect, it } from "vitest";
import {
  evaluatePrediction,
  EVALUATOR_VERSION,
  type MatchStage,
} from "@/lib/sim/predictionEvaluator";
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
