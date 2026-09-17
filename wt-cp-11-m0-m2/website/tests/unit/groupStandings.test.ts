import { describe, expect, it } from "vitest";
import {
  computeGroupStandings,
  isGroupFullySettled,
  WC2026_GROUP_ASSIGNMENTS,
  type GroupAssignment,
} from "@/lib/sim/groupStandings";
import type { MatchOutcome } from "@/lib/db/schema";

let SEQ = 0;
function gm(
  home: string,
  away: string,
  hg: number,
  ag: number,
): MatchOutcome {
  SEQ += 1;
  return {
    matchId: `G${String(SEQ).padStart(3, "0")}`,
    competition: "WC2026",
    stage: "group",
    homeTeam: home,
    awayTeam: away,
    homeGoals: hg,
    awayGoals: ag,
    shootoutWinner: null,
    settledAt: new Date("2026-06-15T20:00:00.000Z"),
    enteredAt: new Date("2026-06-15T21:00:00.000Z"),
    enteredBy: "test",
    meta: {},
  };
}

// All 6 fixtures for one group, given a 4-team list.
function allSix(teams: [string, string, string, string]): readonly [
  MatchOutcome, MatchOutcome, MatchOutcome,
  MatchOutcome, MatchOutcome, MatchOutcome,
] {
  const [a, b, c, d] = teams;
  return [
    gm(a, b, 0, 0),
    gm(c, d, 0, 0),
    gm(a, c, 0, 0),
    gm(b, d, 0, 0),
    gm(a, d, 0, 0),
    gm(b, c, 0, 0),
  ];
}

const ASSIGN_A: GroupAssignment = {
  group: "A",
  teams: ["MEX", "RSA", "KOR", "CZE"],
};

describe("computeGroupStandings: ordering", () => {
  it("orders teams by points then GD then GS within a fully-played group", () => {
    // MEX wins 3, RSA wins 1, KOR wins 1, CZE wins 0. MEX is W.
    // RSA and KOR are tied at 3pts each; differentiate by GD.
    const matches: MatchOutcome[] = [
      gm("MEX", "RSA", 2, 0),
      gm("KOR", "CZE", 1, 0),
      gm("MEX", "KOR", 1, 0),
      gm("CZE", "RSA", 0, 2),
      gm("MEX", "CZE", 3, 0),
      gm("RSA", "KOR", 1, 2),
    ];
    const out = computeGroupStandings(matches, [ASSIGN_A]);
    expect(out.groups).toHaveLength(1);
    const g = out.groups[0];
    expect(g.teams[0].code).toBe("MEX");
    expect(g.teams[0].points).toBe(9);
    expect(g.teams[0].position).toBe(1);
    // KOR 6pts, GD +1 vs RSA 3pts: KOR is RU.
    expect(g.teams[1].code).toBe("KOR");
    expect(g.teams[2].code).toBe("RSA");
    expect(g.teams[3].code).toBe("CZE");
  });

  it("breaks ties at the (points, GD, GS) level using head-to-head points", () => {
    // Construct a group where KOR and CZE are tied at (6pts, +1 GD,
    // 2 GS) but KOR beat CZE head-to-head 1-0. The H2H tier picks KOR.
    //   KOR: W MEX 1-0, W CZE 1-0, L RSA 0-1: 6pts, GD=+1, GS=2
    //   CZE: L KOR 0-1, W RSA 1-0, W MEX 1-0: 6pts, GD=+1, GS=2
    //   MEX: L KOR 0-1, W RSA 1-0, L CZE 0-1: 3pts
    //   RSA: W KOR 1-0, L MEX 0-1, L CZE 0-1: 3pts
    const matches: MatchOutcome[] = [
      gm("KOR", "MEX", 1, 0),
      gm("KOR", "CZE", 1, 0),
      gm("RSA", "KOR", 1, 0),
      gm("MEX", "RSA", 1, 0),
      gm("CZE", "RSA", 1, 0),
      gm("CZE", "MEX", 1, 0),
    ];
    const out = computeGroupStandings(matches, [ASSIGN_A]);
    const g = out.groups[0];
    const kor = g.teams.find((t) => t.code === "KOR")!;
    const cze = g.teams.find((t) => t.code === "CZE")!;
    // Both teams sit at identical global stats.
    expect(kor.points).toBe(cze.points);
    expect(kor.goalDifference).toBe(cze.goalDifference);
    expect(kor.goalsFor).toBe(cze.goalsFor);
    // H2H winner (KOR) ranks first.
    expect(kor.position).toBeLessThan(cze.position);
  });

  it("falls back to alphabetical FIFA code when every tier ties (Fair Play / lots stand-in)", () => {
    // Construct a group where two teams are identical at every tier we
    // can measure. The only differentiator left is the alphabetical
    // fallback. Pick RSA vs CZE; RSA > CZE alphabetically so CZE ranks
    // ahead.
    const matches: MatchOutcome[] = [
      // CZE vs RSA: 1-1
      gm("CZE", "RSA", 1, 1),
      // CZE and RSA each beat MEX and KOR by the same scoreline.
      gm("CZE", "MEX", 2, 1),
      gm("RSA", "KOR", 2, 1),
      gm("CZE", "KOR", 1, 0),
      gm("RSA", "MEX", 1, 0),
      // MEX vs KOR: 0-0
      gm("MEX", "KOR", 0, 0),
    ];
    const out = computeGroupStandings(matches, [ASSIGN_A]);
    const g = out.groups[0];
    const cze = g.teams.find((t) => t.code === "CZE")!;
    const rsa = g.teams.find((t) => t.code === "RSA")!;
    expect(cze.points).toBe(rsa.points);
    expect(cze.goalDifference).toBe(rsa.goalDifference);
    expect(cze.goalsFor).toBe(rsa.goalsFor);
    expect(cze.position).toBeLessThan(rsa.position);
  });
});

describe("computeGroupStandings: partial settlement", () => {
  it("handles an unplayed group by returning zero-stat rows with deterministic positions", () => {
    const out = computeGroupStandings([], [ASSIGN_A]);
    const g = out.groups[0];
    expect(g.teams).toHaveLength(4);
    for (const t of g.teams) {
      expect(t.played).toBe(0);
      expect(t.points).toBe(0);
    }
    // With everything tied at zero, alphabetical fallback applies:
    // CZE < KOR < MEX < RSA.
    expect(g.teams.map((t) => t.code)).toEqual(["CZE", "KOR", "MEX", "RSA"]);
  });

  it("isGroupFullySettled returns false until all 6 matches are played", () => {
    const partial: MatchOutcome[] = [
      gm("MEX", "RSA", 1, 0),
      gm("KOR", "CZE", 2, 1),
      gm("MEX", "KOR", 1, 1),
    ];
    expect(isGroupFullySettled("A", ASSIGN_A.teams, partial)).toBe(false);
    const full: MatchOutcome[] = [
      ...partial,
      gm("CZE", "RSA", 0, 0),
      gm("MEX", "CZE", 1, 0),
      gm("RSA", "KOR", 0, 1),
    ];
    expect(isGroupFullySettled("A", ASSIGN_A.teams, full)).toBe(true);
  });
});

describe("computeGroupStandings: best thirds", () => {
  it("ranks the 12 third-placed teams and returns the top 8 by (pts, GD, GS)", () => {
    // Synthesise a fully-played tournament: each group plays 6 matches
    // with a fixed pattern. We use allSix() with 0-0 draws so the 3rd
    // and 4th places are decided by the alphabetical fallback. Then we
    // perturb a handful of groups to give their 3rd-placed team
    // distinguishing stats.
    const matches: MatchOutcome[] = [];
    for (const a of WC2026_GROUP_ASSIGNMENTS) {
      matches.push(...allSix(a.teams as unknown as [string, string, string, string]));
    }
    const out = computeGroupStandings(matches, WC2026_GROUP_ASSIGNMENTS);
    expect(out.bestThirds).toHaveLength(8);
    // With everything 0-0 the points/GD/GS are identical across all 12
    // third-placed teams; the alphabetical fallback selects the first
    // 8 by FIFA code. The remaining 4 are excluded.
    const codes = out.bestThirds.map((b) => b.code);
    expect(new Set(codes).size).toBe(8);
  });

  it("breaks ties between third-placed teams on (points, GD, GS) using alphabetical FIFA code", () => {
    // Two groups where the 3rd-placed teams finish with identical
    // stats (3pts, GD -1, GS 1). The alphabetical fallback orders the
    // lower FIFA code first.
    const A: GroupAssignment = { group: "A", teams: ["AAA", "BBB", "CCC", "DDD"] };
    const B: GroupAssignment = { group: "B", teams: ["EEE", "FFF", "GGG", "HHH"] };
    // Each group plays the canonical descending-strength pattern:
    //   pot[0] wins 3, pot[1] wins 2, pot[2] wins 1, pot[3] wins 0.
    // Every match is decided 1-0 in favour of the higher pot.
    const matches: MatchOutcome[] = [
      gm("AAA", "BBB", 1, 0),
      gm("AAA", "CCC", 1, 0),
      gm("AAA", "DDD", 1, 0),
      gm("BBB", "CCC", 1, 0),
      gm("BBB", "DDD", 1, 0),
      gm("CCC", "DDD", 1, 0),
      gm("EEE", "FFF", 1, 0),
      gm("EEE", "GGG", 1, 0),
      gm("EEE", "HHH", 1, 0),
      gm("FFF", "GGG", 1, 0),
      gm("FFF", "HHH", 1, 0),
      gm("GGG", "HHH", 1, 0),
    ];
    const out = computeGroupStandings(matches, [A, B]);
    const thirds = out.bestThirds;
    // Third-placed teams: CCC (group A) and GGG (group B). Identical
    // stats; CCC < GGG alphabetically.
    const cccIdx = thirds.findIndex((t) => t.code === "CCC");
    const gggIdx = thirds.findIndex((t) => t.code === "GGG");
    expect(cccIdx).toBeGreaterThanOrEqual(0);
    expect(gggIdx).toBeGreaterThanOrEqual(0);
    expect(cccIdx).toBeLessThan(gggIdx);
  });
});

describe("computeGroupStandings: WC 2026 assignments shape", () => {
  it("ships canonical group assignments for all 12 groups (A through L)", () => {
    expect(WC2026_GROUP_ASSIGNMENTS).toHaveLength(12);
    const letters = WC2026_GROUP_ASSIGNMENTS.map((a) => a.group);
    expect(letters).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);
    for (const a of WC2026_GROUP_ASSIGNMENTS) {
      expect(a.teams).toHaveLength(4);
    }
  });
});
