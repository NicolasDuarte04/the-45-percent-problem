import { describe, it, expect } from "vitest";
import {
  outcomeLabel,
  upcomingEmptyMessage,
} from "@/components/compositions/MatchesBrowser";

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
