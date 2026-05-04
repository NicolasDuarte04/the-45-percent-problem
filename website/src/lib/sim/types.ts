import { z } from "zod";

// FIFA 3-letter code in uppercase, e.g. "ARG", "BRA", "MEX".
export const TeamCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export type TeamCode = z.infer<typeof TeamCodeSchema>;

export const ModeSchema = z.enum([
  "final_four",
  "champions_path",
  "full_bracket",
]);
export type Mode = z.infer<typeof ModeSchema>;

export const StateSchema = z.enum(["alive", "dead", "promoted"]);
export type PredictionState = z.infer<typeof StateSchema>;

// ─── Final Four ───────────────────────────────────────────────────────────────
// Four semifinalists, no ordering significance among them.

export const FinalFourScenarioSchema = z.object({
  semifinalists: z
    .array(TeamCodeSchema)
    .length(4)
    .refine((arr) => new Set(arr).size === 4, "duplicate_team"),
});
export type FinalFourScenario = z.infer<typeof FinalFourScenarioSchema>;

// ─── Champion's Path ─────────────────────────────────────────────────────────
// One traced team, four stages (R16, QF, SF, F). Each stage names an opponent
// and a result. Path truncates at the first L (the user's team is out).

const StageSchema = z.object({
  opponent: TeamCodeSchema,
  result: z.enum(["W", "L"]),
});

export const ChampionsPathScenarioSchema = z
  .object({
    team: TeamCodeSchema,
    r16: StageSchema,
    qf: StageSchema.optional(),
    sf: StageSchema.optional(),
    f: StageSchema.optional(),
  })
  .superRefine((scenario, ctx) => {
    // Once the user picks 'L', no later stage may be set.
    const order = ["r16", "qf", "sf", "f"] as const;
    let dead = false;
    for (const stage of order) {
      const v = scenario[stage];
      if (dead && v !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [stage],
          message: "stage_after_loss",
        });
        return;
      }
      if (v?.result === "L") dead = true;
    }
    // Opponents must be distinct from the team and from each other.
    const opps = order
      .map((s) => scenario[s]?.opponent)
      .filter((x): x is TeamCode => Boolean(x));
    if (opps.includes(scenario.team)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "opponent_is_self",
      });
    }
    if (new Set(opps).size !== opps.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "duplicate_opponent" });
    }
  });
export type ChampionsPathScenario = z.infer<typeof ChampionsPathScenarioSchema>;

// ─── Full Bracket ────────────────────────────────────────────────────────────
// 12 group winners + 12 runners-up + 15 knockout outcomes. The KO advancers
// are stored as a flat list of 15 winner codes in canonical bracket order
// (R16: 8 matches, QF: 4, SF: 2, F: 1).

export const FullBracketScenarioSchema = z
  .object({
    groupWinners: z.array(TeamCodeSchema).length(12),
    groupRunnersUp: z.array(TeamCodeSchema).length(12),
    koAdvancers: z.array(TeamCodeSchema).length(15),
  })
  .superRefine((s, ctx) => {
    const groupTeams = [...s.groupWinners, ...s.groupRunnersUp];
    if (new Set(groupTeams).size !== 24) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "group_team_collision",
      });
    }
    const groupSet = new Set(groupTeams);
    for (const adv of s.koAdvancers) {
      if (!groupSet.has(adv)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "advancer_not_in_groups",
        });
        return;
      }
    }
  });
export type FullBracketScenario = z.infer<typeof FullBracketScenarioSchema>;

// ─── Discriminated payload ───────────────────────────────────────────────────

export const ScenarioPayloadSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("final_four"), scenario: FinalFourScenarioSchema }),
  z.object({
    mode: z.literal("champions_path"),
    scenario: ChampionsPathScenarioSchema,
  }),
  z.object({
    mode: z.literal("full_bracket"),
    scenario: FullBracketScenarioSchema,
  }),
]);
export type ScenarioPayload = z.infer<typeof ScenarioPayloadSchema>;

// Convenience union of the three scenario shapes (without the mode tag).
export type AnyScenario =
  | FinalFourScenario
  | ChampionsPathScenario
  | FullBracketScenario;

// ─── Public read view (sanitized; never includes email or subscriberId) ──────

export interface PublicPredictionView {
  id: string;
  mode: Mode;
  scenario: AnyScenario;
  storyLine: string;
  countOriginal: number;
  countCurrent: number;
  total: number;
  state: PredictionState;
  killedBy: string | null;
  modelSha: string;
  snapshotSha: string;
  submittedAt: string; // ISO
  updatedAt: string; // ISO
  /**
   * True when the prediction row has a subscriber_id attached, i.e.
   * someone has gone through the email gate. Surfaces only the boolean —
   * never the email itself or the subscriber id. Used by the permalink
   * page to decide whether to render the email gate.
   */
  hasTracking: boolean;
}

// ─── Rarity band ────────────────────────────────────────────────────────────

export type RarityBand =
  | "Common"
  | "Plausible"
  | "Uncommon"
  | "Rare"
  | "Vanishingly rare";

export interface RarityBandReading {
  band: RarityBand;
  caption: string;
  belowResolutionFloor: boolean; // true when count < 30
}
