import { describe, it, expect } from "vitest";
import { outcomeLabel } from "@/components/compositions/MatchesBrowser";

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
