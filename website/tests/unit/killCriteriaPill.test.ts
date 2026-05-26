import { describe, it, expect } from "vitest";
import { deriveKillCriteriaPillState } from "@/components/primitives/KillCriteriaPill";

describe("deriveKillCriteriaPillState", () => {
  it("pre-tournament (matches_settled === 0) renders the neutral waiting pill regardless of status", () => {
    const state = deriveKillCriteriaPillState({
      status: "pre_tournament_locked",
      matchesSettled: 0,
    });
    expect(state.variant).toBe("neutral");
    expect(state.glyph).toBe("●");
    expect(state.label).toBe("AWAITING TOURNAMENT KICKOFF");
    expect(state.ariaLabel).toContain("M2_fifa");
    expect(state.ariaLabel).toContain("marginal SE");
    expect(state.ariaLabel).toContain("/vault/kill-criteria");
  });

  it("pre-tournament: even a stray `in_tournament_tripped` status is ignored when matches_settled === 0", () => {
    const state = deriveKillCriteriaPillState({
      status: "in_tournament_tripped",
      matchesSettled: 0,
    });
    expect(state.variant).toBe("neutral");
    expect(state.label).toBe("AWAITING TOURNAMENT KICKOFF");
  });

  it("in-tournament clear renders the mint pill", () => {
    const state = deriveKillCriteriaPillState({
      status: "in_tournament_clear",
      matchesSettled: 8,
    });
    expect(state.variant).toBe("mint");
    expect(state.glyph).toBe("●");
    expect(state.label).toBe("KILL CRITERION: CLEARED");
    expect(state.ariaLabel).toContain("cleared");
  });

  it("in-tournament warning renders the amber pill (not red)", () => {
    const state = deriveKillCriteriaPillState({
      status: "in_tournament_warning",
      matchesSettled: 16,
    });
    expect(state.variant).toBe("amber");
    expect(state.glyph).toBe("●");
    expect(state.label).toBe("KILL CRITERION: WARNING");
    expect(state.ariaLabel).toContain("warning");
  });

  it("in-tournament tripped renders the red badge with the diamond glyph", () => {
    const state = deriveKillCriteriaPillState({
      status: "in_tournament_tripped",
      matchesSettled: 32,
    });
    expect(state.variant).toBe("rose");
    expect(state.glyph).toBe("◆");
    expect(state.label).toBe("KILL CRITERIA TRIPPED");
    expect(state.ariaLabel).toContain("tripped");
  });

  it("missing or unknown status mid-tournament falls back to the neutral pill (no false red)", () => {
    const state = deriveKillCriteriaPillState({
      status: undefined,
      matchesSettled: 4,
    });
    expect(state.variant).toBe("neutral");
    expect(state.label).toBe("AWAITING TOURNAMENT KICKOFF");
  });

  it("aria-label embeds the supplied marginal and paired SE readings", () => {
    const state = deriveKillCriteriaPillState({
      status: "pre_tournament_locked",
      matchesSettled: 0,
      marginalGapSe: 6.22,
      pairedGapSe: 1.75,
    });
    expect(state.ariaLabel).toContain("6.22 marginal SE");
    expect(state.ariaLabel).toContain("1.75 paired SE");
  });
});
