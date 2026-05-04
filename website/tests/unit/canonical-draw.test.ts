/**
 * Unit tests for the canonical WC 2026 draw / fixture data.
 *
 * Guards against regressions in the GROUP_MATCHDAY_OVERRIDES mechanism and
 * the base MATCHDAY_PAIRS round-robin invariant. Any change to team pairings
 * in wc2026-official-draw.ts must keep these tests green.
 */
import { describe, it, expect } from "vitest";
import { GROUP_MATCHES } from "@/lib/data/wc2026-official-draw";

describe("canonical draw — Group K", () => {
  it("MD1 matches FIFA: POR-COD + UZB-COL (diagonal pairing)", () => {
    const md1 = GROUP_MATCHES.filter(
      (m) => m.group === "K" && m.matchday === 1,
    );
    expect(md1.length).toBe(2);
    expect(md1.map((m) => `${m.home_code}-${m.away_code}`).sort()).toEqual(
      ["POR-COD", "UZB-COL"].sort(),
    );
  });
});

describe("canonical draw — host home/away", () => {
  it("hosts (MEX, CAN, USA) are home in their MD3 fixture", () => {
    const hosts = ["MEX", "CAN", "USA"] as const;
    for (const h of hosts) {
      const md3 = GROUP_MATCHES.find(
        (m) => m.matchday === 3 && (m.home_code === h || m.away_code === h),
      );
      expect(md3, `${h} has no MD3 match`).toBeDefined();
      expect(md3?.home_code, `${h} should be home in MD3`).toBe(h);
    }
  });
});

describe("canonical draw — round-robin completeness", () => {
  it("each group has 6 matches covering all C(4,2)=6 unique pairs", () => {
    for (const g of "ABCDEFGHIJKL".split("")) {
      const matches = GROUP_MATCHES.filter((m) => m.group === g);
      expect(matches.length, `group ${g} match count`).toBe(6);

      const pairs = new Set(
        matches.map((m) => [m.home_code, m.away_code].sort().join("-")),
      );
      expect(pairs.size, `group ${g} unique pair count`).toBe(6);
    }
  });

  it("no team plays more than 3 times in its group", () => {
    for (const g of "ABCDEFGHIJKL".split("")) {
      const matches = GROUP_MATCHES.filter((m) => m.group === g);
      const counts: Record<string, number> = {};
      for (const m of matches) {
        counts[m.home_code] = (counts[m.home_code] ?? 0) + 1;
        counts[m.away_code] = (counts[m.away_code] ?? 0) + 1;
      }
      for (const [team, count] of Object.entries(counts)) {
        expect(count, `${team} in group ${g} plays ${count} times`).toBe(3);
      }
    }
  });
});

describe("canonical draw — totals", () => {
  it("produces exactly 72 group-stage matches", () => {
    expect(GROUP_MATCHES.length).toBe(72);
  });

  it("all match_ids are unique", () => {
    const ids = GROUP_MATCHES.map((m) => m.match_id);
    expect(new Set(ids).size).toBe(72);
  });
});
