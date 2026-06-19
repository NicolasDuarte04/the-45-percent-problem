import { describe, it, expect } from "vitest";

import {
  encodeScenarioParam,
  decodeScenarioDraft,
  decodeScenarioStrict,
} from "@/lib/sim/scenarioUrl";
import {
  ScenarioPayloadSchema,
  type ScenarioPayload,
} from "@/lib/sim/types";

// 32 distinct synthetic FIFA-shaped codes for the full-bracket worst case.
// The codec is team-agnostic, so synthetic codes exercise the schema and
// the encoded length identically to real ones (all 3 chars).
function syntheticCodes(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.push(
      "T" +
        String.fromCharCode(65 + Math.floor(i / 26)) +
        String.fromCharCode(65 + (i % 26)),
    );
  }
  return out;
}

const FINAL_FOUR: ScenarioPayload = {
  mode: "final_four",
  scenario: { semifinalists: ["ARG", "BRA", "FRA", "ENG"] },
};

const CHAMPIONS_PATH: ScenarioPayload = {
  mode: "champions_path",
  scenario: {
    team: "ARG",
    r16: { opponent: "MEX", result: "W" },
    qf: { opponent: "CRO", result: "L" },
  },
};

// Deepest full-bracket scenario: a complete champion call (31 KO advancers).
function fullBracketChampion(): ScenarioPayload {
  const codes = syntheticCodes(32);
  return {
    mode: "full_bracket",
    scenario: {
      groupWinners: codes.slice(0, 12),
      groupRunnersUp: codes.slice(12, 24),
      bestThirds: codes.slice(24, 32),
      koAdvancers: codes.slice(0, 31),
    },
  };
}

describe("scenarioUrl round-trip (strict)", () => {
  it("final_four round-trips losslessly", () => {
    const param = encodeScenarioParam(FINAL_FOUR);
    expect(decodeScenarioStrict(param)).toEqual(FINAL_FOUR);
  });

  it("champions_path round-trips losslessly", () => {
    const param = encodeScenarioParam(CHAMPIONS_PATH);
    expect(decodeScenarioStrict(param)).toEqual(CHAMPIONS_PATH);
  });

  it("full_bracket (champion depth) round-trips losslessly", () => {
    const payload = fullBracketChampion();
    // Sanity: the constructed scenario is itself schema-valid.
    expect(ScenarioPayloadSchema.safeParse(payload).success).toBe(true);
    const param = encodeScenarioParam(payload);
    expect(decodeScenarioStrict(param)).toEqual(payload);
  });
});

describe("scenarioUrl worst-case URL length", () => {
  it("deepest full-bracket scenario stays well within safe URL limits", () => {
    const param = encodeScenarioParam(fullBracketChampion());
    // Log the measured length so the PR can quote it.
    // eslint-disable-next-line no-console
    console.log(`[worst-case] ?s= length = ${param.length} chars`);
    // Comfortably under the ~2000-char floor of the most conservative
    // browsers / proxies, with room for origin + path.
    expect(param.length).toBeLessThan(1500);
  });
});

describe("scenarioUrl tolerant decode", () => {
  it("reopens a partial in-flight scenario as-is", () => {
    // A two-of-four Final Four draft: not schema-valid, but must round-trip
    // for the builder so a mid-build link reopens exactly as left.
    const partialParam = encodeScenarioParam({
      mode: "final_four",
      scenario: { semifinalists: ["ARG", "BRA"] },
    });
    const draft = decodeScenarioDraft(partialParam);
    expect(draft).not.toBeNull();
    expect(draft!.mode).toBe("final_four");
    expect(draft!.scenario).toEqual({ semifinalists: ["ARG", "BRA"] });
    // The same partial param is rejected by the strict decoder (no rich card).
    expect(decodeScenarioStrict(partialParam)).toBeNull();
  });

  it("returns null for garbage, falling back to an empty builder", () => {
    expect(decodeScenarioDraft("not-valid-base64url!!")).toBeNull();
    expect(decodeScenarioDraft("")).toBeNull();
    expect(decodeScenarioDraft(null)).toBeNull();
    expect(decodeScenarioDraft(undefined)).toBeNull();
    // Valid base64url but wrong shape (unknown mode).
    const badMode = encodeScenarioParam({
      mode: "nope" as never,
      scenario: { semifinalists: ["ARG"] },
    });
    expect(decodeScenarioDraft(badMode)).toBeNull();
    expect(decodeScenarioStrict("not-valid-base64url!!")).toBeNull();
  });
});
