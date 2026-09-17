import { describe, expect, it } from "vitest";
import {
  WC2026_ELO_SNAPSHOT,
  eloFor,
  teamsByGroupSortedByElo,
} from "@/lib/sim/elo";
import { TEAMS } from "@/lib/data/wc2026-official-draw";

describe("WC2026 Elo snapshot", () => {
  it("covers all 48 qualifiers from the official draw", () => {
    // Auto-fill silently degrades to 0 (sorts last) for missing codes,
    // which would make the chalk pick wrong without anyone noticing.
    // Pin the invariant: every team in the draw has an Elo entry.
    const missing: string[] = [];
    for (const team of TEAMS) {
      if (!(team.fifa_code in WC2026_ELO_SNAPSHOT)) missing.push(team.fifa_code);
    }
    expect(missing).toEqual([]);
  });

  it("eloFor returns 0 for unknown codes (defensive sort)", () => {
    // ZZZ is not a FIFA code; the default protects against runtime
    // KeyError if a team is added to the draw without an Elo entry.
    expect(eloFor("ZZZ")).toBe(0);
  });
});

describe("teamsByGroupSortedByElo", () => {
  it("returns a 4-team list per group, sorted Elo descending", () => {
    const out = teamsByGroupSortedByElo();
    const groups = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
    for (const g of groups) {
      const list = out[g];
      expect(list).toHaveLength(4);
      // Strictly non-increasing: top-1 ≥ top-2 ≥ top-3 ≥ top-4.
      for (let i = 1; i < list.length; i++) {
        expect(eloFor(list[i - 1])).toBeGreaterThanOrEqual(eloFor(list[i]));
      }
    }
  });

  it("nominates the highest-Elo team in each group as winner (chalk pick)", () => {
    // This is the central Auto-fill correctness invariant: index 0 of
    // every group's sorted list is what the simulator pre-fills as
    // winner. A regression here would silently re-order the chalk
    // bracket the user sees.
    const out = teamsByGroupSortedByElo();
    // Spot-check four groups across confederation mixes to anchor the
    // expected behavior. Note Group A's chalk pick is KOR, not the
    // host MEX. Korea Republic outranks Mexico in the static
    // pre-tournament snapshot. If the snapshot file changes, update
    // this assertion deliberately rather than papering over it.
    expect(out.A[0]).toBe("KOR"); // Korea Republic leads A
    expect(out.C[0]).toBe("BRA"); // Brazil leads C
    expect(out.H[0]).toBe("ESP"); // Spain leads H
    expect(out.J[0]).toBe("ARG"); // Argentina leads J
  });

  it("pre-fills runner-up as the second-highest Elo in the group", () => {
    const out = teamsByGroupSortedByElo();
    // Auto-fill always seeds index 1 as runner-up. Verify a known
    // ordering: in Group H, after Spain comes Uruguay (Elo 1894 in
    // the static snapshot), not Saudi Arabia or Cabo Verde.
    expect(out.H[1]).toBe("URU");
  });

  it("the union of all groups is exactly the 48 WC2026 teams", () => {
    const out = teamsByGroupSortedByElo();
    const flat = Object.values(out).flat().sort();
    const draw = TEAMS.map((t) => t.fifa_code).sort();
    expect(flat).toEqual(draw);
  });
});
