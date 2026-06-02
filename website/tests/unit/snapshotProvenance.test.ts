/**
 * cp-09 part 3 (Fix 4 / diagnostic §3.5): provenance gate.
 *
 * Before cp-09 the served `tournament.json` carried no `model_variant`
 * field, so the React layer lost model identity at the JSON boundary
 * and a silent batch swap upstream could change "the model" with no
 * load-time signal. The TournamentSnapshotSchema now requires
 * `model_variant`; this suite enforces that the live snapshot stamps
 * the locked champion identifier and that loads without the field
 * fail validation.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { TournamentSnapshotSchema } from "@/lib/data/schemas";

const LATEST_TOURNAMENT = path.join(
  process.cwd(),
  "public",
  "data",
  "latest",
  "tournament.json",
);

const VALID_BASE = {
  snapshot_id: "2026-06-02T16:24Z",
  generated_at_utc: "2026-06-02T16:24:00Z",
  mc_runs: 10000,
  teams: [
    {
      fifa_code: "ESP",
      display_name: "Spain",
      confederation: "UEFA" as const,
      seed: 1,
      p_champion: 0.18,
      p_final: 0.3,
      p_semifinal: 0.42,
      p_quarterfinal: 0.58,
      p_r16: 0.78,
      p_group_qualification: 0.98,
      ci_95_champion: [0.17, 0.19] as [number, number],
      elo_current: 2165,
      rank_change_7d: 0,
    },
  ],
};

describe("TournamentSnapshotSchema requires model_variant (cp-09 Fix 4)", () => {
  it("rejects payloads with no model_variant", () => {
    const result = TournamentSnapshotSchema.safeParse(VALID_BASE);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.path.join("."));
      expect(issues).toContain("model_variant");
    }
  });

  it("accepts the locked M2_fifa champion identifier", () => {
    const result = TournamentSnapshotSchema.safeParse({
      ...VALID_BASE,
      model_variant: "M2_fifa",
    });
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });

  it("accepts every ablation tag and the public M_STAR alias", () => {
    for (const variant of ["M0", "M1", "M2", "M3", "M_STAR"]) {
      const result = TournamentSnapshotSchema.safeParse({
        ...VALID_BASE,
        model_variant: variant,
      });
      expect(result.success, `variant ${variant}: ${result.success ? "" : JSON.stringify(result.error.issues)}`).toBe(true);
    }
  });

  it("rejects an unknown model identifier", () => {
    const result = TournamentSnapshotSchema.safeParse({
      ...VALID_BASE,
      model_variant: "M99_experimental",
    });
    expect(result.success).toBe(false);
  });
});

describe("live tournament.json carries the locked model_variant", () => {
  it("public/data/latest/tournament.json contains model_variant = 'M2_fifa'", () => {
    const data = JSON.parse(fs.readFileSync(LATEST_TOURNAMENT, "utf-8")) as {
      model_variant?: string;
    };
    expect(data.model_variant).toBe("M2_fifa");
  });

  it("public/data/latest/tournament.json round-trips through TournamentSnapshotSchema", () => {
    const data = JSON.parse(fs.readFileSync(LATEST_TOURNAMENT, "utf-8"));
    const result = TournamentSnapshotSchema.safeParse(data);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues)).toBe(true);
  });
});
