/**
 * Zod schemas for Phase 9 snapshot artifacts (§4 of Phase9_Website_Architecture.md).
 * Each schema is the authoritative validator — build fails on mismatch.
 */
import { z } from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

const probability = () => z.number().min(0).max(1);
const ci95 = () => z.tuple([probability(), probability()]);

export const TeamRefSchema = z.object({
  fifa_code: z.string(),
  display_name: z.string(),
});
export type TeamRef = z.infer<typeof TeamRefSchema>;

// ── §4.2 snapshot_meta.json ───────────────────────────────────────────────────

export const SnapshotMetaSchema = z.object({
  schema_version: z.string(),
  snapshot_id: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/),
  generated_at_utc: z.string(),
  code_sha: z.string(),
  data_sha: z.string(),
  pre_reg_tag: z.string(),
  champion_model: z.enum(["M0", "M1", "M2", "M3", "M_STAR"]),
  mc_runs: z.number().int().min(100),
  tournament_phase: z.enum([
    "pre_tournament",
    "group_stage",
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "final",
    "completed",
  ]),
  matches_settled: z.number().int().min(0),
  matches_remaining: z.number().int().min(0),
  kill_criteria_active: z.boolean(),
  notes: z.string().nullable().optional(),
});
export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>;

// ── §4.3 tournament.json ──────────────────────────────────────────────────────

export const TournamentTeamSchema = z.object({
  fifa_code: z.string().min(2).max(6),
  display_name: z.string(),
  confederation: z.enum(["CONMEBOL", "UEFA", "CONCACAF", "AFC", "CAF", "OFC"]),
  seed: z.number().int().min(1),
  p_champion: probability(),
  p_final: probability(),
  p_semifinal: probability(),
  p_quarterfinal: probability(),
  p_r16: probability(),
  p_group_qualification: probability(),
  ci_95_champion: ci95(),
  elo_current: z.number(),
  rank_change_7d: z.number(),
  group: z.string().optional(),
});
export type TournamentTeam = z.infer<typeof TournamentTeamSchema>;

export const TournamentSnapshotSchema = z.object({
  snapshot_id: z.string(),
  generated_at_utc: z.string(),
  mc_runs: z.number().int().min(100),
  teams: z.array(TournamentTeamSchema).min(1),
});
export type TournamentSnapshot = z.infer<typeof TournamentSnapshotSchema>;

// ── §4.4 divergence.json ──────────────────────────────────────────────────────

export const DivergenceHistoryEntrySchema = z.object({
  snapshot_id: z.string(),
  edge_E: z.number(),
  p_model: probability(),
  q_market_devigged: probability(),
});
export type DivergenceHistoryEntry = z.infer<typeof DivergenceHistoryEntrySchema>;

export const DivergenceRowSchema = z.object({
  row_id: z.string(),
  match_id: z.string(),
  kickoff_utc: z.string(),
  round: z.enum(["GRP", "R32", "R16", "QF", "SF", "3P", "FIN"]),
  home: TeamRefSchema,
  away: TeamRefSchema,
  market: z.enum(["1X2", "BTTS", "OU_2_5", "AH_-0.5", "AH_+0.5", "ADV_KO"]),
  outcome: z.string(),
  p_model: probability(),
  q_market_raw_decimal: z.number().min(1),
  q_market_devigged: probability(),
  edge_E: z.number(),
  edge_threshold: z.number().min(0),
  gate_status: z.enum(["OPEN", "FIRED"]),
  gate_rules_tripped: z.array(z.string()),
  snapshot_age_minutes: z.number().min(0),
  confidence_band: z.tuple([z.number(), z.number()]),
  source_book: z.enum(["PINNACLE", "BETFAIR", "POLYMARKET"]),
  pinnacle_bias_applied: z.object({
    draw_delta: z.number(),
    host_delta: z.number(),
  }),
  model_version: z.string(),
  // Per-row snapshot history for the disclosure sparkline (§12.5 approved schema extension)
  history: z.array(DivergenceHistoryEntrySchema).default([]),
});
export type DivergenceRow = z.infer<typeof DivergenceRowSchema>;

export const DivergenceSnapshotSchema = z.object({
  snapshot_id: z.string(),
  generated_at_utc: z.string(),
  rows: z.array(DivergenceRowSchema),
});
export type DivergenceSnapshot = z.infer<typeof DivergenceSnapshotSchema>;

// ── §4.5 matches/{match_id}.json ─────────────────────────────────────────────

export const MatchDetailSchema = z.object({
  match_id: z.string(),
  round: z.string(),
  kickoff_utc: z.string(),
  home: TeamRefSchema,
  away: TeamRefSchema,
  p_model_1x2: z.object({ H: probability(), D: probability(), A: probability() }),
  p_model_goals: z.array(z.array(z.number().min(0).max(1))),
  lambda: z.object({
    home: z.number().min(0),
    away: z.number().min(0),
    rho: z.number(),
  }),
  shootout_applicable: z.boolean(),
  p_shootout_home_if_ko: z.number().nullable(),
  market_divergence: z.array(z.record(z.string(), z.unknown())),
  strength_inputs: z.object({
    elo_home: z.number(),
    elo_away: z.number(),
    form_home: z.number(),
    form_away: z.number(),
    fifa_rank_home: z.number().int(),
    fifa_rank_away: z.number().int(),
  }),
  forecast_ids: z.array(z.string()),
});
export type MatchDetail = z.infer<typeof MatchDetailSchema>;

// ── §4.6 teams/{fifa_code}.json ───────────────────────────────────────────────

export const TeamProgressionSchema = z.object({
  fifa_code: z.string(),
  display_name: z.string(),
  group: z.string(),
  progression: z.object({
    p_group_qualification: probability(),
    p_r16: probability(),
    p_qf: probability(),
    p_sf: probability(),
    p_final: probability(),
    p_champion: probability(),
    ci_95_champion: ci95(),
  }),
  history: z.array(
    z.object({ snapshot_id: z.string(), p_champion: probability() })
  ),
  upcoming_matches: z.array(
    z.object({
      match_id: z.string(),
      kickoff_utc: z.string(),
      opponent: z.string(),
      is_home: z.boolean().optional(),
    })
  ),
});
export type TeamProgression = z.infer<typeof TeamProgressionSchema>;

// ── §4.7 ledger.jsonl ─────────────────────────────────────────────────────────

export const LedgerRecordSchema = z.object({
  forecast_id: z.string(),
  match_id: z.string(),
  model_id: z.enum(["M0", "M1", "M2", "M3", "M_STAR"]),
  market: z.string(),
  outcome_predicted_distribution: z.record(z.string(), z.number().min(0).max(1)),
  outcome_realized: z.string(),
  p_model_on_realized: probability(),
  q_market_devigged_on_realized: probability(),
  edge_E_at_close: z.number(),
  gate_status_at_close: z.enum(["OPEN", "FIRED"]),
  brier_contribution: z.number(),
  log_loss_contribution: z.number(),
  rps_contribution: z.number(),
  clv_bps: z.number().nullable(),
  hit_miss_label: z.enum(["HIT", "MISS", "NEUTRAL"]),
  code_sha: z.string(),
  data_sha: z.string(),
  mc_seed: z.number().int(),
  settled_at_utc: z.string(),
});
export type LedgerRecord = z.infer<typeof LedgerRecordSchema>;

// ── §4.8 evaluation_metrics.json ─────────────────────────────────────────────

const ModelMetricsSchema = z.object({
  M0: z.number().nullable(),
  M1: z.number().nullable(),
  M2: z.number().nullable(),
  M3: z.number().nullable(),
  M_STAR: z.number().nullable(),
});

export const EvaluationMetricsSchema = z.object({
  snapshot_id: z.string(),
  matches_settled: z.number().int().min(0),
  brier: ModelMetricsSchema,
  log_loss: ModelMetricsSchema,
  rps: ModelMetricsSchema,
  reliability_diagram: z.array(
    z.object({
      bin_lower: probability(),
      bin_upper: probability(),
      p_model_mean: probability(),
      frequency_realized: probability(),
      n: z.number().int().min(0),
    })
  ),
  clv_cumulative_bps: z.number(),
  clv_z_score: z.number(),
  nyberg_test_pvalue: z.number().nullable(),
  diebold_mariano_vs_M0: z.object({
    stat: z.number().nullable(),
    pvalue: z.number().nullable(),
  }),
  kill_criteria_check: z.object({
    tripped: z.boolean(),
    gap_se: z.number(),
    threshold_se: z.number(),
    condition: z.string(),
    timestamp: z.string(),
    action_taken: z.string(),
  }),
});
export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;

// ── §4.9 freshness.json ───────────────────────────────────────────────────────

export const FreshnessSchema = z.object({
  snapshot_id: z.string(),
  generated_at_utc: z.string(),
  max_expected_staleness_hours: z.number().min(0),
  current_staleness_hours: z.number().min(0),
  status: z.enum(["FRESH", "STALE", "BROKEN"]),
});
export type Freshness = z.infer<typeof FreshnessSchema>;

// ── BracketSnapshot ───────────────────────────────────────────────────────────

export const BracketRoundSchema = z.object({
  round: z.enum(["GRP", "R32", "R16", "QF", "SF", "3P", "FIN"]),
  slots: z.array(z.record(z.string(), z.unknown())),
});

export const BracketSnapshotSchema = z.object({
  snapshot_id: z.string(),
  rounds: z.array(BracketRoundSchema),
});
export type BracketSnapshot = z.infer<typeof BracketSnapshotSchema>;

// ── manifest.json ─────────────────────────────────────────────────────────────

export const ManifestEntrySchema = z.object({
  snapshot_id: z.string(),
  generated_at_utc: z.string(),
});

export const ManifestSchema = z.array(ManifestEntrySchema);
export type Manifest = z.infer<typeof ManifestSchema>;
