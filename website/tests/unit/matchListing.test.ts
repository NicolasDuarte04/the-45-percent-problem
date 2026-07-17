import { describe, expect, it } from "vitest";
import {
  isPlayed,
  byKickoff,
  splitPlayedUpcoming,
  dayKey,
  groupByDay,
  modalScoreline,
  topScorelines,
  formatDayLabel,
  formatKickoffTime,
  audienceDayKeyFromMs,
  partitionByState,
  filterByTeam,
  buildTeamUpcoming,
} from "@/lib/data/matchListing";
import type { MatchDetail, LiveKnockoutMatch } from "@/lib/data/schemas";

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
  it("keys an ISO string to its America/Bogota civil day", () => {
    // 19:00Z is 2:00 PM in Bogota, same calendar day.
    expect(dayKey("2026-06-11T19:00:00+00:00")).toBe("2026-06-11");
  });

  it("keys a late-evening kickoff that crosses UTC midnight to the local day", () => {
    // Mexico vs Korea (M25): 01:00Z June 19 is 8:00 PM June 18 in Bogota, so it
    // groups under June 18 alongside the rest of that local evening, not June 19.
    expect(dayKey("2026-06-19T01:00:00+00:00")).toBe("2026-06-18");
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

  it("groups a UTC-midnight-crossing kickoff with its local evening", () => {
    // Canada vs Qatar (22:00Z) and Mexico vs Korea (01:00Z next day) are the
    // same June 18 evening in Bogota, so they share one bucket.
    const groups = groupByDay([
      makeMatch({ match_id: "M27", kickoff_utc: "2026-06-18T22:00:00+00:00" }),
      makeMatch({ match_id: "M25", kickoff_utc: "2026-06-19T01:00:00+00:00" }),
      makeMatch({ match_id: "M31", kickoff_utc: "2026-06-19T19:00:00+00:00" }),
    ]);
    expect(groups.map((g) => g.day)).toEqual(["2026-06-18", "2026-06-19"]);
    expect(groups[0].matches.map((m) => m.match_id)).toEqual(["M27", "M25"]);
    expect(groups[1].matches.map((m) => m.match_id)).toEqual(["M31"]);
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

describe("topScorelines", () => {
  const grid = [
    [0.1, 0.05, 0.01],
    [0.12, 0.08, 0.02],
    [0.09, 0.3, 0.04],
  ];

  it("ranks cells by joint probability descending", () => {
    expect(topScorelines(grid, 3)).toEqual([
      { home: 2, away: 1, p: 0.3 },
      { home: 1, away: 0, p: 0.12 },
      { home: 0, away: 0, p: 0.1 },
    ]);
  });

  it("agrees with modalScoreline on the top cell", () => {
    const [top] = topScorelines(grid, 1);
    expect(modalScoreline(grid)).toEqual({ home: top.home, away: top.away });
  });

  it("breaks ties in row-major order via a stable sort", () => {
    // Three cells tie at 0.2; row-major order is (0,0), (0,1), (1,0).
    const tied = [
      [0.2, 0.2],
      [0.2, 0.0],
    ];
    expect(topScorelines(tied, 3)).toEqual([
      { home: 0, away: 0, p: 0.2 },
      { home: 0, away: 1, p: 0.2 },
      { home: 1, away: 0, p: 0.2 },
    ]);
  });

  it("clips to the 0..6 goal range, mirroring the detail-page heatmap", () => {
    // An 8x8 grid whose global max sits at goals 7 is ignored; the top cell
    // comes from within the clipped 7x7 window.
    const big: number[][] = Array.from({ length: 8 }, (_, h) =>
      Array.from({ length: 8 }, (_, a) => (h === 7 && a === 7 ? 0.9 : 0.01)),
    );
    big[2][3] = 0.5; // best inside the 0..6 window
    expect(topScorelines(big, 1)).toEqual([{ home: 2, away: 3, p: 0.5 }]);
  });

  it("returns an empty array for missing, empty, or non-positive n", () => {
    expect(topScorelines(undefined, 3)).toEqual([]);
    expect(topScorelines(null, 3)).toEqual([]);
    expect(topScorelines([], 3)).toEqual([]);
    expect(topScorelines(grid, 0)).toEqual([]);
  });
});

describe("formatDayLabel", () => {
  it("renders a build-TZ-stable long day label", () => {
    expect(formatDayLabel("2026-06-11")).toBe("Thursday, 11 June 2026");
  });
});

describe("formatKickoffTime", () => {
  it("renders a Bogota clock label with an explicit zone tag", () => {
    // 19:00Z is 2:00 PM in Bogota (UTC-5).
    expect(formatKickoffTime("2026-06-11T19:00:00+00:00")).toBe("2:00 PM COT");
  });

  it("renders the local evening time for a UTC-midnight-crossing kickoff", () => {
    // 01:00Z June 19 is 8:00 PM June 18 in Bogota, never a confusing 01:00Z.
    expect(formatKickoffTime("2026-06-19T01:00:00+00:00")).toBe("8:00 PM COT");
  });
});

describe("audienceDayKeyFromMs", () => {
  it("derives the America/Bogota calendar day from a timestamp", () => {
    const ms = Date.parse("2026-06-17T23:30:00Z");
    expect(audienceDayKeyFromMs(ms)).toBe("2026-06-17");
  });

  it("uses Bogota local time across the UTC day boundary", () => {
    // 00:30Z June 18 is 7:30 PM June 17 in Bogota, so "today" is still the 17th.
    expect(audienceDayKeyFromMs(Date.parse("2026-06-18T00:30:00Z"))).toBe(
      "2026-06-17",
    );
  });
});

describe("partitionByState", () => {
  // a, b are June 17 in Bogota; c (03:00Z June 19) is 10:00 PM June 18 there.
  const a = makeMatch({ match_id: "M01", kickoff_utc: "2026-06-17T20:00:00Z" });
  const b = makeMatch({ match_id: "M02", kickoff_utc: "2026-06-17T23:00:00Z" });
  const c = makeMatch({ match_id: "M03", kickoff_utc: "2026-06-19T03:00:00Z" });
  // A clock before every fixture, so nothing has kicked off yet (no awaiting).
  const beforeAll = Date.parse("2026-06-17T00:00:00Z");

  it("splits today's fixtures from the rest by audience-local day", () => {
    const { awaiting, today, rest } = partitionByState([a, b, c], "2026-06-17", beforeAll);
    expect(awaiting).toEqual([]);
    expect(today.map((m) => m.match_id)).toEqual(["M01", "M02"]);
    expect(rest.map((m) => m.match_id)).toEqual(["M03"]);
  });

  it("keeps a UTC-midnight-crossing kickoff under its local today", () => {
    // todayKey is June 18 in Bogota; c kicks off 10:00 PM that local day.
    const { today, rest } = partitionByState([a, b, c], "2026-06-18", beforeAll);
    expect(today.map((m) => m.match_id)).toEqual(["M03"]);
    expect(rest.map((m) => m.match_id)).toEqual(["M01", "M02"]);
  });

  it("returns an empty today set when nothing kicks off today", () => {
    const { today, rest } = partitionByState([a, b, c], "2026-06-16", beforeAll);
    expect(today).toEqual([]);
    expect(rest.map((m) => m.match_id)).toEqual(["M01", "M02", "M03"]);
  });

  it("preserves input order within each partition", () => {
    const { rest } = partitionByState([c, a, b], "2026-06-17", beforeAll);
    expect(rest.map((m) => m.match_id)).toEqual(["M03"]);
  });

  it("routes past-kickoff, unsettled fixtures to awaiting, never to upcoming", () => {
    // now is after a and b have kicked off (June 17) but before c. a and b are
    // score-less past-kickoff fixtures -> awaiting; c is still today-and-future.
    const now = Date.parse("2026-06-18T12:00:00Z");
    const { awaiting, today, rest } = partitionByState([a, b, c], "2026-06-18", now);
    expect(awaiting.map((m) => m.match_id)).toEqual(["M01", "M02"]);
    expect(today.map((m) => m.match_id)).toEqual(["M03"]);
    expect(rest).toEqual([]);
  });

  it("treats a fixture exactly at its kickoff instant as awaiting", () => {
    const now = Date.parse(a.kickoff_utc);
    const { awaiting, today, rest } = partitionByState([a], "2026-06-17", now);
    expect(awaiting.map((m) => m.match_id)).toEqual(["M01"]);
    expect(today).toEqual([]);
    expect(rest).toEqual([]);
  });
});

describe("filterByTeam", () => {
  const mex = makeMatch({
    match_id: "M01",
    home: { fifa_code: "MEX", display_name: "Mexico" },
    away: { fifa_code: "KOR", display_name: "South Korea" },
  });
  const eng = makeMatch({
    match_id: "M02",
    home: { fifa_code: "ENG", display_name: "England" },
    away: { fifa_code: "CRO", display_name: "Croatia" },
  });

  it("returns the list unchanged for a blank query", () => {
    expect(filterByTeam([mex, eng], "")).toHaveLength(2);
    expect(filterByTeam([mex, eng], "   ")).toHaveLength(2);
  });

  it("matches on display name, case-insensitively, either side", () => {
    expect(filterByTeam([mex, eng], "korea").map((m) => m.match_id)).toEqual([
      "M01",
    ]);
    expect(filterByTeam([mex, eng], "ENGLAND").map((m) => m.match_id)).toEqual([
      "M02",
    ]);
  });

  it("matches on FIFA code", () => {
    expect(filterByTeam([mex, eng], "cro").map((m) => m.match_id)).toEqual([
      "M02",
    ]);
  });

  it("returns nothing when no side matches", () => {
    expect(filterByTeam([mex, eng], "brazil")).toEqual([]);
  });
});

// cp-41: a live knockout card builder. buildTeamUpcoming reads home/away
// fifa_code + display_name, kickoff_utc, match_id, score, and the
// live_provenance discriminator, so the rest are schema-valid placeholders.
function makeKnockout(
  overrides: Partial<LiveKnockoutMatch> = {},
): LiveKnockoutMatch {
  return {
    match_id: "KO-FD537390",
    round: "FIN",
    kickoff_utc: "2026-07-19T19:00:00Z",
    home: { fifa_code: "ESP", display_name: "Spain" },
    away: { fifa_code: "ARG", display_name: "Argentina" },
    p_model_1x2: { H: 0.5, D: 0.2, A: 0.3 },
    p_model_goals: [],
    lambda: { home: 1.4, away: 1.2, rho: -0.05 },
    shootout_applicable: true,
    p_shootout_home_if_ko: 0.5,
    market_divergence: [],
    strength_inputs: {
      elo_home: 2165,
      elo_away: 2100,
      form_home: 0,
      form_away: 0,
      fifa_rank_home: 1,
      fifa_rank_away: 2,
    },
    forecast_ids: [],
    p_advance_home: 0.5,
    p_advance_away: 0.5,
    live_provenance: {
      source_batch_id: "batch_test",
      schedule_feed: { source: "test", fetched_at_utc: "2026-07-17T00:00:00Z" },
      graded: false,
      n_sims: 20000,
      generated_at_utc: "2026-07-17T00:00:00Z",
    },
    ...overrides,
  };
}

describe("buildTeamUpcoming", () => {
  const groupUpcoming = [
    {
      match_id: "M15",
      kickoff_utc: "2026-06-15T16:00:00+00:00",
      opponent: "Cabo Verde",
      is_home: true,
    },
  ];

  it("drops a settled group fixture and folds in a live knockout tie (finalist)", () => {
    const final = makeKnockout(); // ESP vs ARG, score null
    const out = buildTeamUpcoming(
      "ESP",
      groupUpcoming,
      new Set(["M15"]), // M15 has a joined score -> settled
      [final],
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      match_id: "KO-FD537390",
      opponent: "Argentina",
      is_home: true,
      is_live_knockout: true,
    });
  });

  it("resolves the opponent from the away side when the team is home, and vice versa", () => {
    const final = makeKnockout();
    const espSide = buildTeamUpcoming("ESP", [], new Set(), [final]);
    expect(espSide[0]).toMatchObject({ opponent: "Argentina", is_home: true });
    const argSide = buildTeamUpcoming("ARG", [], new Set(), [final]);
    expect(argSide[0]).toMatchObject({ opponent: "Spain", is_home: false });
  });

  it("excludes a knockout that has already been played (score present)", () => {
    const settledKo = makeKnockout({
      match_id: "KO-FD537388",
      round: "SF",
      score: { home: 1, away: 2 },
    });
    const out = buildTeamUpcoming("ESP", [], new Set(), [settledKo]);
    expect(out).toEqual([]);
  });

  it("excludes knockouts the team is not in", () => {
    const otherTie = makeKnockout({
      match_id: "KO-FD537389",
      round: "3P",
      home: { fifa_code: "FRA", display_name: "France" },
      away: { fifa_code: "ENG", display_name: "England" },
    });
    expect(buildTeamUpcoming("ESP", [], new Set(), [otherTie])).toEqual([]);
    const fra = buildTeamUpcoming("FRA", [], new Set(), [otherTie]);
    expect(fra[0]).toMatchObject({ opponent: "England", is_home: true });
  });

  it("keeps an unplayed group fixture and sorts merged rows by kickoff", () => {
    const unplayedGroup = [
      {
        match_id: "M40",
        kickoff_utc: "2026-06-24T16:00:00+00:00",
        opponent: "Japan",
        is_home: false,
      },
    ];
    const final = makeKnockout(); // 2026-07-19, later
    const out = buildTeamUpcoming("ESP", unplayedGroup, new Set(), [final]);
    expect(out.map((m) => m.match_id)).toEqual(["M40", "KO-FD537390"]);
    expect(out[0].is_live_knockout).toBe(false);
  });

  it("returns an empty list for an eliminated team with only settled group fixtures", () => {
    const out = buildTeamUpcoming("MEX", groupUpcoming, new Set(["M15"]), []);
    expect(out).toEqual([]);
  });
});
