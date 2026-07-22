import { describe, expect, it } from "vitest";
import {
  TOURNAMENT_START,
  dayNumber,
  favorite,
  formatCardDate,
  isTournamentComplete,
  matchesForCard,
  previewNote,
  previewScorelines,
  pct,
  realizedOutcome,
  recapNote,
  selectPreviewDay,
  selectRecapDay,
  shootoutNote,
} from "@/lib/data/dailyShareCard";
import type { LiveKnockoutMatch, MatchDetail } from "@/lib/data/schemas";

// Minimal MatchDetail builder, matching tests/unit/matchListing.test.ts. Only
// the fields the card helpers read are meaningful; the rest are schema-valid
// placeholders.
function makeMatch(overrides: Partial<MatchDetail> = {}): MatchDetail {
  return {
    match_id: "M01",
    round: "GRP",
    kickoff_utc: "2026-06-11T19:00:00+00:00",
    home: { fifa_code: "MEX", display_name: "Mexico" },
    away: { fifa_code: "RSA", display_name: "South Africa" },
    p_model_1x2: { H: 0.73, D: 0.16, A: 0.11 },
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

describe("dayNumber", () => {
  it("maps the tournament start to Día 1", () => {
    expect(dayNumber(TOURNAMENT_START)).toBe(1);
    expect(dayNumber("2026-06-18")).toBe(8);
    expect(dayNumber("2026-07-19")).toBe(39);
  });
});

describe("formatCardDate", () => {
  it("formats a day key in long English form", () => {
    expect(formatCardDate("2026-06-18")).toBe("June 18, 2026");
  });
});

describe("selectRecapDay / selectPreviewDay", () => {
  const matches = [
    makeMatch({ match_id: "A", kickoff_utc: "2026-06-11T19:00:00+00:00", score: { home: 2, away: 0 } }),
    makeMatch({ match_id: "B", kickoff_utc: "2026-06-12T19:00:00+00:00", score: { home: 1, away: 1 } }),
    makeMatch({ match_id: "C", kickoff_utc: "2026-06-13T19:00:00+00:00" }),
    makeMatch({ match_id: "D", kickoff_utc: "2026-06-14T19:00:00+00:00" }),
  ];
  it("recap picks the most recent completed day before today", () => {
    expect(selectRecapDay(matches, "2026-06-13")).toBe("2026-06-12");
  });
  it("preview picks today when today has fixtures", () => {
    expect(selectPreviewDay(matches, "2026-06-13")).toBe("2026-06-13");
  });
  it("returns null when no match qualifies", () => {
    expect(selectRecapDay([makeMatch()], "2026-06-12")).toBeNull();
    expect(
      selectPreviewDay([makeMatch({ score: { home: 0, away: 0 } })], "2026-06-12"),
    ).toBeNull();
  });
});

// The defect this PR fixes: when results ingestion lags, the published snapshot
// still carries yesterday's fixtures as unplayed. The selectors must stay
// anchored to the calendar so the preview shows TODAY (not the stale unplayed
// day) and the recap shows the last fully-settled day with an honest label.
describe("calendar anchoring under ingestion lag", () => {
  // Mirrors the live June 24 (Día 14) state: June 22 fully settled, June 23
  // fixtures present but still unplayed (un-ingested), June 24 fixtures unplayed.
  const lagged = [
    makeMatch({ match_id: "J22a", kickoff_utc: "2026-06-22T17:00:00+00:00", score: { home: 2, away: 0 } }),
    makeMatch({ match_id: "J22b", kickoff_utc: "2026-06-22T21:00:00+00:00", score: { home: 3, away: 0 } }),
    makeMatch({ match_id: "J23a", kickoff_utc: "2026-06-23T17:00:00+00:00" }),
    makeMatch({ match_id: "J23b", kickoff_utc: "2026-06-23T20:00:00+00:00" }),
    makeMatch({ match_id: "J24a", kickoff_utc: "2026-06-24T19:00:00+00:00" }),
    makeMatch({ match_id: "J24b", kickoff_utc: "2026-06-24T22:00:00+00:00" }),
  ];
  const today = "2026-06-24";

  it("preview anchors to today, not the stale unplayed June 23 day", () => {
    expect(selectPreviewDay(lagged, today)).toBe("2026-06-24");
    expect(dayNumber("2026-06-24")).toBe(14);
  });
  it("recap falls back to the last fully-settled day (June 22), skipping un-ingested June 23", () => {
    expect(selectRecapDay(lagged, today)).toBe("2026-06-22");
    // Honest label: the returned day drives Día N, so a two-day-old recap reads
    // as Día 12, never as yesterday.
    expect(dayNumber("2026-06-22")).toBe(12);
  });
  it("once June 23 ingests, both variants advance to the true days", () => {
    const settled = lagged.map((m) =>
      m.match_id.startsWith("J23") ? makeMatch({ ...m, score: { home: 1, away: 1 } }) : m,
    );
    expect(selectRecapDay(settled, today)).toBe("2026-06-23"); // Día 13, yesterday
    expect(selectPreviewDay(settled, today)).toBe("2026-06-24"); // Día 14, today
  });
  it("a partially-settled day is not eligible as the recap", () => {
    // June 23 half-ingested (one score joined, one still missing) must be skipped.
    const partial = lagged.map((m) =>
      m.match_id === "J23a" ? makeMatch({ ...m, score: { home: 1, away: 1 } }) : m,
    );
    expect(selectRecapDay(partial, today)).toBe("2026-06-22");
  });
  it("on a rest day with no fixtures today, preview rolls forward to the next day", () => {
    expect(selectPreviewDay(lagged, "2026-06-23")).toBe("2026-06-23");
    // Nothing on June 24's gap day -> next unplayed day, never a past day.
    const restDay = lagged.filter((m) => !m.match_id.startsWith("J24"));
    expect(selectPreviewDay(restDay, "2026-06-24")).toBeNull();
  });
});

describe("matchesForCard", () => {
  const matches = [
    makeMatch({ match_id: "B", kickoff_utc: "2026-06-12T19:00:00+00:00", score: { home: 1, away: 1 } }),
    makeMatch({ match_id: "A", kickoff_utc: "2026-06-12T13:00:00+00:00", score: { home: 2, away: 0 } }),
    makeMatch({ match_id: "C", kickoff_utc: "2026-06-12T16:00:00+00:00" }),
  ];
  it("recap keeps played fixtures on the day, sorted by kickoff", () => {
    const rows = matchesForCard(matches, "2026-06-12", "recap");
    expect(rows.map((m) => m.match_id)).toEqual(["A", "B"]);
  });
  it("preview keeps unplayed fixtures on the day", () => {
    const rows = matchesForCard(matches, "2026-06-12", "preview");
    expect(rows.map((m) => m.match_id)).toEqual(["C"]);
  });
});

// Regression: the card groups on the same America/Bogota basis as the /matches
// page, so a late-evening kickoff that crosses UTC midnight stays on its local
// day. Mexico vs Korea (M25, 01:00Z June 19) belongs on the June 18 preview
// card alongside Canada vs Qatar (M27, 22:00Z June 18), not on June 19.
describe("audience-local day basis (M25 boundary)", () => {
  const m27 = makeMatch({
    match_id: "M27",
    kickoff_utc: "2026-06-18T22:00:00+00:00",
  });
  const m25 = makeMatch({
    match_id: "M25",
    kickoff_utc: "2026-06-19T01:00:00+00:00",
  });
  const m31 = makeMatch({
    match_id: "M31",
    kickoff_utc: "2026-06-19T19:00:00+00:00",
  });
  const fixtures = [m27, m25, m31];

  it("preview selects June 18 as the earliest unplayed local day", () => {
    expect(selectPreviewDay(fixtures, "2026-06-18")).toBe("2026-06-18");
  });

  it("puts Mexico vs Korea and Canada vs Qatar on the June 18 card", () => {
    const rows = matchesForCard(fixtures, "2026-06-18", "preview");
    expect(rows.map((m) => m.match_id)).toEqual(["M27", "M25"]);
  });

  it("keeps June 18 anchored to Día 8 and June 19 to Día 9", () => {
    expect(dayNumber("2026-06-18")).toBe(8);
    expect(dayNumber("2026-06-19")).toBe(9);
  });
});

describe("realizedOutcome", () => {
  it("prefers the stamped outcome", () => {
    expect(realizedOutcome(makeMatch({ score: { home: 0, away: 0 }, outcome_realized: "A" }))).toBe("A");
  });
  it("derives from the score when unstamped", () => {
    expect(realizedOutcome(makeMatch({ score: { home: 2, away: 0 } }))).toBe("H");
    expect(realizedOutcome(makeMatch({ score: { home: 0, away: 2 } }))).toBe("A");
    expect(realizedOutcome(makeMatch({ score: { home: 1, away: 1 } }))).toBe("D");
  });
  it("is null without a score", () => {
    expect(realizedOutcome(makeMatch())).toBeNull();
  });
});

describe("pct", () => {
  it("renders whole percents", () => {
    expect(pct(0.731)).toBe("73%");
    expect(pct(0.155)).toBe("16%");
  });
});

describe("recapNote", () => {
  it("credits the probability on a home win", () => {
    const note = recapNote(makeMatch({ score: { home: 2, away: 0 }, outcome_realized: "H" }));
    expect(note).toBe("the model gave Mexico 73% to win");
  });
  it("credits the away side on an away win", () => {
    const note = recapNote(
      makeMatch({ score: { home: 0, away: 1 }, outcome_realized: "A" }),
    );
    expect(note).toBe("the model gave South Africa 11% to win");
  });
  it("credits the draw on a draw", () => {
    const note = recapNote(makeMatch({ score: { home: 1, away: 1 }, outcome_realized: "D" }));
    expect(note).toBe("the model gave the draw 16%");
  });
  it("is null when there is no result", () => {
    expect(recapNote(makeMatch())).toBeNull();
  });
});

// cp-29: a penalty-decided knockout is a regulation draw, so the recap card
// must not stop at a bare "1-1 Final". shootoutNote renders the shootout
// resolution in the card's Spanish, winner-first, and only for live knockout
// cards that actually went to a shootout.
describe("shootoutNote (cp-29)", () => {
  function knockoutCard(shootout: unknown): LiveKnockoutMatch {
    return {
      home: { fifa_code: "GER", display_name: "Germany" },
      away: { fifa_code: "PAR", display_name: "Paraguay" },
      score: { home: 1, away: 1 },
      outcome_realized: "D",
      live_provenance: { graded: false },
      shootout,
    } as unknown as LiveKnockoutMatch;
  }

  it("names the away winner and shows the tally winner-first", () => {
    expect(shootoutNote(knockoutCard({ winner: "A", home: 3, away: 4 }))).toBe(
      "penalties: PAR won 4-3",
    );
  });

  it("names the home winner", () => {
    expect(shootoutNote(knockoutCard({ winner: "H", home: 5, away: 4 }))).toBe(
      "penalties: GER won 5-4",
    );
  });

  it("returns null for a group card with no shootout", () => {
    expect(shootoutNote(makeMatch())).toBeNull();
  });

  it("returns null when the shootout block is missing or incomplete", () => {
    expect(shootoutNote(knockoutCard(undefined))).toBeNull();
    expect(shootoutNote(knockoutCard(null))).toBeNull();
    expect(shootoutNote(knockoutCard({ winner: "A", home: null, away: 4 }))).toBeNull();
  });
});

describe("previewNote", () => {
  it("names the favourite and the modal scoreline", () => {
    const note = previewNote(
      makeMatch({ p_model_goals: [[0.1, 0.05], [0.4, 0.1]] }),
    );
    // argmax of the grid is [1][0] -> 1-0; favourite is the home side at 73%.
    expect(note).toBe("favorite: Mexico at 73% · modal scoreline 1-0");
  });
  it("reports a draw when the draw is the top outcome", () => {
    const note = previewNote(
      makeMatch({ p_model_1x2: { H: 0.25, D: 0.5, A: 0.25 }, p_model_goals: [] }),
    );
    expect(note).toBe("the model sees a draw (50%)");
  });
  it("omits the modal clause when the goal grid is empty", () => {
    const note = previewNote(makeMatch({ p_model_goals: [] }));
    expect(note).toBe("favorite: Mexico at 73%");
  });
});

describe("previewScorelines", () => {
  it("returns the top three scorelines as score/pct display pairs", () => {
    const chips = previewScorelines([
      [0.1, 0.05, 0.01],
      [0.12, 0.08, 0.02],
      [0.09, 0.3, 0.04],
    ]);
    expect(chips).toEqual([
      { score: "2-1", pct: "30%" },
      { score: "1-0", pct: "12%" },
      { score: "0-0", pct: "10%" },
    ]);
  });
  it("rounds to whole percent via pct, matching the card's 1X2 numbers", () => {
    const [top] = previewScorelines([[0.124]]);
    expect(top).toEqual({ score: "0-0", pct: pct(0.124) });
    expect(top.pct).toBe("12%");
  });
  it("is empty when the goal grid is absent (unpriced fixture)", () => {
    expect(previewScorelines([])).toEqual([]);
    expect(previewScorelines(undefined)).toEqual([]);
  });
});

describe("favorite", () => {
  it("rings the home side when it has the higher win probability", () => {
    const fav = favorite({ H: 0.6, D: 0.25, A: 0.15 }, "MEX", "RSA");
    expect(fav).toEqual({ side: "home", code: "MEX", p: 0.6, pct: "60%" });
  });
  it("rings the away side when it has the higher win probability", () => {
    const fav = favorite({ H: 0.2, D: 0.3, A: 0.5 }, "MEX", "BRA");
    expect(fav).toEqual({ side: "away", code: "BRA", p: 0.5, pct: "50%" });
  });
  it("rings the higher win side even when the draw is the single highest outcome", () => {
    // Draw is the modal 1X2 outcome, but a draw can never wear the gold ring;
    // home edges away on the win probabilities, so home is the favorite.
    const fav = favorite({ H: 0.34, D: 0.4, A: 0.26 }, "ENG", "CRO");
    expect(fav.side).toBe("home");
    expect(fav.code).toBe("ENG");
  });
  it("resolves a win-probability tie to home", () => {
    const fav = favorite({ H: 0.4, D: 0.2, A: 0.4 }, "ESP", "URU");
    expect(fav.side).toBe("home");
    expect(fav.code).toBe("ESP");
  });
});

// Guard the dash constraint at the source: the card copy must never emit an
// em dash or en dash (the live MatchesBrowser bar uses an en dash for scores;
// the share card must not).
describe("no em/en dashes in generated copy", () => {
  it("recap and preview notes use ASCII hyphens only", () => {
    const m = makeMatch({ score: { home: 2, away: 0 }, outcome_realized: "H", p_model_goals: [[0.1], [0.4]] });
    const enDash = "\u2013";
    const emDash = "\u2014";
    const scorelineStrings = previewScorelines([[0.1, 0.05], [0.4, 0.1]]).flatMap(
      (c) => [c.score, c.pct],
    );
    const strings = [
      recapNote(m),
      previewNote(m),
      ...scorelineStrings,
    ];
    for (const s of strings) {
      expect(s == null || (!s.includes(enDash) && !s.includes(emDash))).toBe(true);
    }
  });
});

// cp-19 item 2: the daily OG route now merges loadLiveKnockouts() into the
// candidate set, so the share card tracks the real fixture list through the
// knockout phase instead of going blind once all 72 group fixtures are played.
// LiveKnockoutMatch extends MatchDetail, so a round-"R32" MatchDetail here is a
// faithful stand-in for a merged knockout card as far as these pure selectors
// (which read only MatchDetail fields) are concerned.
describe("knockout-phase selectors (cp-19 item 2)", () => {
  // Every group fixture is played and in the past (the deployed state on day 18).
  const groupAllPlayed = [
    makeMatch({ match_id: "G1", kickoff_utc: "2026-06-25T19:00:00+00:00", score: { home: 1, away: 0 } }),
    makeMatch({ match_id: "G2", kickoff_utc: "2026-06-26T19:00:00+00:00", score: { home: 2, away: 2 } }),
  ];
  // A real R32 fixture today (unplayed) and a settled R32 fixture yesterday.
  const knockoutToday = makeMatch({
    match_id: "KO-FD1",
    round: "R32",
    kickoff_utc: "2026-06-28T19:00:00+00:00",
  });
  const knockoutYesterday = makeMatch({
    match_id: "KO-FD2",
    round: "R32",
    kickoff_utc: "2026-06-27T19:00:00+00:00",
    score: { home: 1, away: 0 },
  });
  const merged = [...groupAllPlayed, knockoutYesterday, knockoutToday];

  it("preview surfaces today's knockout fixture once group play is over", () => {
    // Group-only would return null (the Dia 0 / 'no hay partidos' bug); the
    // merged set picks the knockout day.
    expect(selectPreviewDay(groupAllPlayed, "2026-06-28")).toBeNull();
    expect(selectPreviewDay(merged, "2026-06-28")).toBe("2026-06-28");
    const rows = matchesForCard(merged, "2026-06-28", "preview");
    expect(rows.map((m) => m.match_id)).toEqual(["KO-FD1"]);
  });

  it("recap advances onto settled knockout results instead of freezing on the last group day", () => {
    // Group-only recap freezes on 2026-06-26; the merged set advances to the
    // settled knockout day.
    expect(selectRecapDay(groupAllPlayed, "2026-06-28")).toBe("2026-06-26");
    expect(selectRecapDay(merged, "2026-06-28")).toBe("2026-06-27");
    const rows = matchesForCard(merged, "2026-06-27", "recap");
    expect(rows.map((m) => m.match_id)).toEqual(["KO-FD2"]);
  });
});

// cp-44: the archive-posture gate. Synthesizes its own snapshot meta rather
// than reading any live repo snapshot, so it cannot drift with the data.
describe("isTournamentComplete (cp-44)", () => {
  it("is true only when the phase is completed and zero fixtures remain", () => {
    expect(
      isTournamentComplete({ tournament_phase: "completed", matches_remaining: 0 }),
    ).toBe(true);
  });

  it("is false while the tournament is still running", () => {
    expect(
      isTournamentComplete({ tournament_phase: "final", matches_remaining: 1 }),
    ).toBe(false);
    expect(
      isTournamentComplete({ tournament_phase: "group_stage", matches_remaining: 40 }),
    ).toBe(false);
    expect(
      isTournamentComplete({ tournament_phase: "pre_tournament", matches_remaining: 104 }),
    ).toBe(false);
  });

  it("is false if the phase says completed but fixtures still remain (never gates on phase alone)", () => {
    expect(
      isTournamentComplete({ tournament_phase: "completed", matches_remaining: 3 }),
    ).toBe(false);
  });
});
