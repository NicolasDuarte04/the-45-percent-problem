/**
 * Unit tests for the canonical WC 2026 draw / fixture data.
 *
 * Guards against regressions in the GROUP_MATCHDAY_OVERRIDES mechanism and
 * the base MATCHDAY_PAIRS round-robin invariant. Any change to team pairings
 * in wc2026-official-draw.ts must keep these tests green.
 */
import { describe, it, expect } from "vitest";
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from "@/lib/data/wc2026-official-draw";

describe("canonical draw: Group K", () => {
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

describe("canonical draw: host home/away", () => {
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

describe("canonical draw: round-robin completeness", () => {
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

describe("canonical draw: totals", () => {
  it("produces exactly 72 group-stage matches", () => {
    expect(GROUP_MATCHES.length).toBe(72);
  });

  it("all match_ids are unique", () => {
    const ids = GROUP_MATCHES.map((m) => m.match_id);
    expect(new Set(ids).size).toBe(72);
  });
});

// cp-27: the R32 slot descriptors must form a valid bijection over the 12 group
// winners and 12 runners-up. Before the repair, M76 read "2C" (a second copy of
// group C's runner-up slot) and M79 read "1A" (a second copy of group A's winner
// slot), leaving groups G and K with no runner-up slot anywhere. The tests below
// pin the corrected structure so that corruption cannot recur silently.
describe("canonical draw: R32 slot descriptors", () => {
  const ALL_GROUPS = "ABCDEFGHIJKL".split("");
  const WINNER_RE = /^1([A-L])$/;
  const RUNNER_RE = /^2([A-L])$/;
  const BEST3_RE = /^BEST3-[A-L]+$/;

  const r32 = KNOCKOUT_MATCHES.filter((m) => m.round === "R32");
  const slots = r32.flatMap((m) => [m.home_slot, m.away_slot]);

  it("has exactly 16 R32 matches (32 slots)", () => {
    expect(r32.length).toBe(16);
    expect(slots.length).toBe(32);
  });

  it("each of the 12 group-winner slots (1A..1L) appears exactly once", () => {
    const winners = slots.filter((s) => WINNER_RE.test(s));
    expect(winners.length).toBe(12);
    const groups = winners.map((s) => s.match(WINNER_RE)![1]).sort();
    expect(groups).toEqual(ALL_GROUPS);
  });

  it("each of the 12 runner-up slots (2A..2L) appears exactly once", () => {
    const runners = slots.filter((s) => RUNNER_RE.test(s));
    expect(runners.length).toBe(12);
    const groups = runners.map((s) => s.match(RUNNER_RE)![1]).sort();
    expect(groups).toEqual(ALL_GROUPS);
  });

  it("has exactly 8 best-third slots, each a valid BEST3-<groups> descriptor", () => {
    const thirds = slots.filter((s) => BEST3_RE.test(s));
    expect(thirds.length).toBe(8);
    // Third-place allocations match the official 2026 structure: the eight
    // candidate-group lists published for the 12-group format.
    expect(thirds.slice().sort()).toEqual(
      [
        "BEST3-CDEFI",
        "BEST3-EHIJK",
        "BEST3-ABCDF",
        "BEST3-ABCFG",
        "BEST3-CEFHI",
        "BEST3-ABDEF",
        "BEST3-BEFIK",
        "BEST3-BCDFG",
      ].sort(),
    );
  });

  it("every slot is a winner, runner-up, or best-third descriptor (no other shape)", () => {
    for (const s of slots) {
      const ok = WINNER_RE.test(s) || RUNNER_RE.test(s) || BEST3_RE.test(s);
      expect(ok, `unexpected R32 slot descriptor: ${s}`).toBe(true);
    }
  });

  it("pins the two repaired cells: M76 home=2G, M79 home=2K", () => {
    const m76 = r32.find((m) => m.match_id === "M76");
    const m79 = r32.find((m) => m.match_id === "M79");
    expect(m76?.home_slot).toBe("2G");
    expect(m79?.home_slot).toBe("2K");
  });
});
