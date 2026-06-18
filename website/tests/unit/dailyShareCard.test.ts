import { describe, expect, it } from "vitest";
import {
  COUNTRY_NAMES_ES,
  TOURNAMENT_START,
  dayNumber,
  formatSpanishDate,
  matchesForCard,
  previewNote,
  pct,
  realizedOutcome,
  recapNote,
  selectPreviewDay,
  selectRecapDay,
  spanishName,
} from "@/lib/data/dailyShareCard";
import type { MatchDetail } from "@/lib/data/schemas";

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

describe("spanishName", () => {
  it("returns the Spanish name for a known FIFA code", () => {
    expect(spanishName("MEX", "Mexico")).toBe("México");
    expect(spanishName("usa", "United States")).toBe("Estados Unidos");
  });
  it("falls back to the published name for an unknown code", () => {
    expect(spanishName("ZZZ", "Atlantis")).toBe("Atlantis");
  });
  it("covers all 48 qualifiers", () => {
    expect(Object.keys(COUNTRY_NAMES_ES)).toHaveLength(48);
  });
});

describe("formatSpanishDate", () => {
  it("formats a day key in long Spanish form", () => {
    expect(formatSpanishDate("2026-06-18")).toBe("18 de junio de 2026");
  });
});

describe("selectRecapDay / selectPreviewDay", () => {
  const matches = [
    makeMatch({ match_id: "A", kickoff_utc: "2026-06-11T19:00:00+00:00", score: { home: 2, away: 0 } }),
    makeMatch({ match_id: "B", kickoff_utc: "2026-06-12T19:00:00+00:00", score: { home: 1, away: 1 } }),
    makeMatch({ match_id: "C", kickoff_utc: "2026-06-13T19:00:00+00:00" }),
    makeMatch({ match_id: "D", kickoff_utc: "2026-06-14T19:00:00+00:00" }),
  ];
  it("recap picks the most recent played day", () => {
    expect(selectRecapDay(matches)).toBe("2026-06-12");
  });
  it("preview picks the earliest unplayed day", () => {
    expect(selectPreviewDay(matches)).toBe("2026-06-13");
  });
  it("returns null when no match qualifies", () => {
    expect(selectRecapDay([makeMatch()])).toBeNull();
    expect(selectPreviewDay([makeMatch({ score: { home: 0, away: 0 } })])).toBeNull();
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
    expect(note).toBe("el modelo le dio 73% a la victoria de México");
  });
  it("credits the away side on an away win", () => {
    const note = recapNote(
      makeMatch({ score: { home: 0, away: 1 }, outcome_realized: "A" }),
    );
    expect(note).toBe("el modelo le dio 11% a la victoria de Sudáfrica");
  });
  it("credits the draw on a draw", () => {
    const note = recapNote(makeMatch({ score: { home: 1, away: 1 }, outcome_realized: "D" }));
    expect(note).toBe("el modelo le dio 16% al empate");
  });
  it("is null when there is no result", () => {
    expect(recapNote(makeMatch())).toBeNull();
  });
});

describe("previewNote", () => {
  it("names the favourite and the modal scoreline", () => {
    const note = previewNote(
      makeMatch({ p_model_goals: [[0.1, 0.05], [0.4, 0.1]] }),
    );
    // argmax of the grid is [1][0] -> 1-0; favourite is the home side at 73%.
    expect(note).toBe("favorito: México con 73% · marcador modal 1-0");
  });
  it("reports a draw when the draw is the top outcome", () => {
    const note = previewNote(
      makeMatch({ p_model_1x2: { H: 0.25, D: 0.5, A: 0.25 }, p_model_goals: [] }),
    );
    expect(note).toBe("el modelo ve un empate (50%)");
  });
  it("omits the modal clause when the goal grid is empty", () => {
    const note = previewNote(makeMatch({ p_model_goals: [] }));
    expect(note).toBe("favorito: México con 73%");
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
    const strings = [recapNote(m), previewNote(m), ...Object.values(COUNTRY_NAMES_ES)];
    for (const s of strings) {
      expect(s == null || (!s.includes(enDash) && !s.includes(emDash))).toBe(true);
    }
  });
});
