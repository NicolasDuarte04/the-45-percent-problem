import { describe, expect, it } from "vitest";
import {
  isPlayed,
  byKickoff,
  splitPlayedUpcoming,
  dayKey,
  groupByDay,
  modalScoreline,
  formatDayLabel,
  formatKickoffTime,
} from "@/lib/data/matchListing";
import type { MatchDetail } from "@/lib/data/schemas";

// Minimal MatchDetail builder. The listing helpers only read a handful of
// fields (kickoff_utc, match_id, score, p_model_goals), so the rest are
// filled with schema-valid placeholders.
function makeMatch(overrides: Partial<MatchDetail> = {}): MatchDetail {
  return {
    match_id: "M01",
    round: "GRP",
    kickoff_utc: "2026-06-11T19:00:00+00:00",
    home: { fifa_code: "MEX", display_name: "Mexico" },
    away: { fifa_code: "RSA", display_name: "South Africa" },
    p_model_1x2: { H: 0.7, D: 0.16, A: 0.14 },
    p_model_goals: [],
    lambda: { home: 2.0, away: 1.0, rho: -0.05 },
    shootout_applicable: false,
    p_shootout_home_if_ko: null,
    market_divergence: [],
    strength_inputs: {
      elo_home: 1800,
      elo_away: 1500,
      form_home: 0,
      form_away: 0,
      fifa_rank_home: 0,
      fifa_rank_away: 0,
    },
    forecast_ids: [],
    ...overrides,
  };
}

describe("isPlayed", () => {
  it("is true only when a score is present", () => {
    expect(isPlayed(makeMatch({ score: { home: 2, away: 0 } }))).toBe(true);
    expect(isPlayed(makeMatch())).toBe(false);
    expect(isPlayed(makeMatch({ score: null }))).toBe(false);
  });
});

describe("byKickoff", () => {
  it("orders earlier kickoffs first", () => {
    const a = makeMatch({ kickoff_utc: "2026-06-11T19:00:00+00:00" });
    const b = makeMatch({ kickoff_utc: "2026-06-12T16:00:00+00:00" });
    expect(byKickoff(a, b)).toBeLessThan(0);
    expect(byKickoff(b, a)).toBeGreaterThan(0);
  });

  it("breaks kickoff ties by match_id", () => {
    const a = makeMatch({ match_id: "M02", kickoff_utc: "2026-06-11T19:00:00+00:00" });
    const b = makeMatch({ match_id: "M07", kickoff_utc: "2026-06-11T19:00:00+00:00" });
    expect(byKickoff(a, b)).toBeLessThan(0);
  });
});

describe("splitPlayedUpcoming", () => {
  it("splits and sorts each bucket chronologically", () => {
    const matches = [
      makeMatch({ match_id: "M03", kickoff_utc: "2026-06-13T16:00:00+00:00" }),
      makeMatch({
        match_id: "M01",
        kickoff_utc: "2026-06-11T19:00:00+00:00",
        score: { home: 2, away: 0 },
      }),
      makeMatch({ match_id: "M02", kickoff_utc: "2026-06-12T16:00:00+00:00" }),
    ];
    const { played, upcoming } = splitPlayedUpcoming(matches);
    expect(played.map((m) => m.match_id)).toEqual(["M01"]);
    expect(upcoming.map((m) => m.match_id)).toEqual(["M02", "M03"]);
  });
});

describe("dayKey", () => {
  it("takes the UTC calendar day from an ISO string", () => {
    expect(dayKey("2026-06-11T19:00:00+00:00")).toBe("2026-06-11");
  });
});

describe("groupByDay", () => {
  it("buckets consecutive same-day fixtures", () => {
    const groups = groupByDay([
      makeMatch({ match_id: "M01", kickoff_utc: "2026-06-11T16:00:00+00:00" }),
      makeMatch({ match_id: "M02", kickoff_utc: "2026-06-11T19:00:00+00:00" }),
      makeMatch({ match_id: "M03", kickoff_utc: "2026-06-12T16:00:00+00:00" }),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(groups[0].matches.map((m) => m.match_id)).toEqual(["M01", "M02"]);
    expect(groups[1].matches.map((m) => m.match_id)).toEqual(["M03"]);
  });
});

describe("modalScoreline", () => {
  it("returns the argmax cell of the goal grid", () => {
    // home=2, away=1 is the most likely cell.
    const grid = [
      [0.1, 0.05, 0.01],
      [0.12, 0.08, 0.02],
      [0.09, 0.3, 0.04],
    ];
    expect(modalScoreline(grid)).toEqual({ home: 2, away: 1 });
  });

  it("returns null for missing or empty grids", () => {
    expect(modalScoreline(undefined)).toBeNull();
    expect(modalScoreline(null)).toBeNull();
    expect(modalScoreline([])).toBeNull();
  });
});

describe("formatDayLabel", () => {
  it("renders a UTC-stable long day label", () => {
    expect(formatDayLabel("2026-06-11")).toBe("Thursday, 11 June 2026");
  });
});

describe("formatKickoffTime", () => {
  it("renders a UTC clock label", () => {
    expect(formatKickoffTime("2026-06-11T19:00:00+00:00")).toBe("19:00Z");
  });
});
