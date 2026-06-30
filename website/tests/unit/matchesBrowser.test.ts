import { describe, it, expect } from "vitest";
import {
  outcomeLabel,
  shootoutLine,
  upcomingEmptyMessage,
} from "@/components/compositions/MatchesBrowser";
import type { LiveKnockoutMatch } from "@/lib/data/schemas";

// cp-19 item 3: a knockout tie cannot end in a draw. A level live knockout card
// was decided on penalties, so it must never render "Draw".
describe("outcomeLabel (cp-19 item 3)", () => {
  it("a level live knockout card reads 'Decided on penalties', never 'Draw'", () => {
    expect(outcomeLabel("D", true)).toBe("Decided on penalties");
  });

  it("a level group card keeps the plain 'Draw' label", () => {
    expect(outcomeLabel("D", false)).toBe("Draw");
  });

  it("decisive results keep their H/A label on knockout and group cards alike", () => {
    expect(outcomeLabel("H", true)).toBe("Home win");
    expect(outcomeLabel("A", true)).toBe("Away win");
    expect(outcomeLabel("H", false)).toBe("Home win");
    expect(outcomeLabel("A", false)).toBe("Away win");
  });

  it("falls back to 'Final' when no outcome is recorded", () => {
    expect(outcomeLabel(null, true)).toBe("Final");
    expect(outcomeLabel(undefined, false)).toBe("Final");
  });
});

// cp-22: a knockout decided on penalties shows the regulation score plus a line
// naming the shootout winner and tally. The summed/inflated score is never used,
// and the line only appears on a live knockout card that actually went to a
// shootout.
describe("shootoutLine (cp-22)", () => {
  function knockoutCard(shootout: unknown): LiveKnockoutMatch {
    return {
      home: { fifa_code: "POR", display_name: "Portugal" },
      away: { fifa_code: "NOR", display_name: "Norway" },
      live_provenance: { graded: false },
      shootout,
    } as unknown as LiveKnockoutMatch;
  }

  it("names the away winner and shows the tally winner-first", () => {
    expect(shootoutLine(knockoutCard({ winner: "A", home: 3, away: 4 }))).toBe(
      "NOR won the shootout 4-3",
    );
  });

  it("names the home winner", () => {
    expect(shootoutLine(knockoutCard({ winner: "H", home: 5, away: 4 }))).toBe(
      "POR won the shootout 5-4",
    );
  });

  it("returns null when the card carries no shootout", () => {
    expect(shootoutLine(knockoutCard(undefined))).toBeNull();
    expect(shootoutLine(knockoutCard(null))).toBeNull();
  });

  it("returns null when the shootout block is incomplete", () => {
    expect(
      shootoutLine(knockoutCard({ winner: null, home: 3, away: 4 })),
    ).toBeNull();
    expect(
      shootoutLine(knockoutCard({ winner: "A", home: null, away: 4 })),
    ).toBeNull();
  });

  it("returns null for a non-knockout card even if shootout-shaped", () => {
    const groupCard = {
      home: { fifa_code: "MEX", display_name: "Mexico" },
      away: { fifa_code: "RSA", display_name: "South Africa" },
      shootout: { winner: "A", home: 3, away: 4 },
    } as unknown as LiveKnockoutMatch;
    expect(shootoutLine(groupCard)).toBeNull();
  });
});

// cp-19 item 4: with no filter active, the empty-Upcoming line must not imply a
// phantom filter is hiding fixtures (the steady-state message in the gap before
// the next knockout pairings resolve).
describe("upcomingEmptyMessage (cp-19 item 4)", () => {
  it("with no filter active, attributes emptiness to no fixtures, not a filter", () => {
    const msg = upcomingEmptyMessage("");
    expect(msg).not.toContain("filter");
    expect(msg).toBe(
      "No upcoming fixtures yet; knockout pairings appear here once the draw resolves.",
    );
    expect(upcomingEmptyMessage("   ")).toBe(msg);
  });

  it("with a filter active, keeps the filter-attributed message", () => {
    expect(upcomingEmptyMessage("Brazil")).toBe(
      "No upcoming fixtures match this filter.",
    );
  });
});
