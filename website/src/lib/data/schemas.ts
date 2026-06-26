/**
 * Zod schemas for Phase 9 snapshot artifacts (§4 of Phase9_Website_Architecture.md).
 * Each schema is the authoritative validator; build fails on mismatch.
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

// cp-09 part 3 (Fix 4 / diagnostic §3.5): the served probabilities used
// to lose their model identity at the JSON boundary — tournament.json
// carried no `model_variant` stamp, so a silent batch swap upstream
// could change what "the model" meant without a load-time signal.
// `model_variant` is now required. The enum accepts the locked
// champion identifier (`M2_fifa`) used in
// data/calibration/champion_model.json::m_star_model_id as well as the
// ablation tags (M0/M1/M2/M3) and the public-facing `M_STAR` alias
// (which remains the canonical value of snapshot_meta.champion_model).
const ModelVariantSchema = z.enum([
  "M2_fifa",
  "M0",
  "M1",
  "M2",
  "M3",
  "M_STAR",
]);

export const TournamentSnapshotSchema = z.object({
  snapshot_id: z.string(),
  generated_at_utc: z.string(),
  mc_runs: z.number().int().min(100),
  model_variant: ModelVariantSchema,
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
  // cp-volatility-gate: which of the five gate rules ran vs abstained this
  // snapshot. The producer evaluates only Rule 5 (Pinnacle staleness) from a
  // single odds pull; the rest are pending data. Optional so pre-cp-volatility
  // snapshots (rows without this block) still parse.
  gate_coverage: z
    .object({
      evaluated: z.array(z.string()),
      unavailable: z.record(z.string(), z.string()),
    })
    .optional(),
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
  // cp-14: "pending" means no real odds are ingested yet, so rows is empty and
  // no source_book is stamped anywhere (Decision B). "live" means the rows are
  // real de-vigged Pinnacle lines. Absent on pre-cp-14 snapshots.
  status: z.enum(["live", "pending"]).optional(),
  pending_reason: z.string().optional(),
  notes: z.string().optional(),
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
  // cp-14 commit 2: real settled result, joined from match_outcomes during
  // nightly regen. Absent on unplayed matches; the nightly leaves those files
  // untouched, so these are optional and nullable.
  score: z
    .object({ home: z.number().int(), away: z.number().int() })
    .nullable()
    .optional(),
  outcome_realized: z.enum(["H", "D", "A"]).nullable().optional(),
  settled_at_utc: z.string().nullable().optional(),
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
  // cp-14: the market layer is pending real odds ingestion (Pinnacle / Odds
  // API). Reconstructed forecasts score the frozen pre-tournament champion
  // distribution against results (Brier / RPS / log-loss only); they carry no
  // market lines, so the market-dependent fields are null until odds are live.
  q_market_devigged_on_realized: probability().nullable(),
  edge_E_at_close: z.number().nullable(),
  gate_status_at_close: z.enum(["OPEN", "FIRED"]).nullable(),
  brier_contribution: z.number(),
  log_loss_contribution: z.number(),
  rps_contribution: z.number(),
  clv_bps: z.number().nullable(),
  hit_miss_label: z.enum(["HIT", "MISS", "NEUTRAL"]).nullable(),
  code_sha: z.string(),
  data_sha: z.string(),
  mc_seed: z.number().int(),
  settled_at_utc: z.string().nullable(),
  // cp-14 Decision A provenance: present on reconstructed rows so every
  // forecast traces back to the frozen committed batch it was scored from.
  provenance: z.string().optional(),
  source_batch_id: z.string().optional(),
  source_batch_activated_utc: z.string().optional(),
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
  // cp-14: number of settled forecasts actually scored into the champion
  // metrics (the bijection-validated subset). Shown verbatim as the sample
  // size; absent on pre-cp-14 snapshots.
  champion_metric_n: z.number().int().min(0).optional(),
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
    // Marginal-SE reading from data/calibration/champion_model.json
    // (delta_vs_M0 / sigma_CV). Optional for backward compat with
    // snapshots written before the dual-SE field landed; absence is
    // treated as "render the neutral pre-tournament pill."
    marginal_gap_se: z.number().optional(),
    // Pill state. `pre_tournament_locked` is the only sane state when
    // matches_settled === 0; the three `in_tournament_*` states are
    // only valid once outcomes are scoring. Only `in_tournament_tripped`
    // produces a red badge in the UI. Optional for backward compat.
    status: z
      .enum([
        "pre_tournament_locked",
        "in_tournament_clear",
        "in_tournament_warning",
        "in_tournament_tripped",
      ])
      .optional(),
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

// ── cp-16b live conditional bracket ───────────────────────────────────────────
// A SEPARATE, explicitly ungraded surface fed by the ACTIVE re-sim batch (not
// the frozen pre-registered batch). The required live-provenance block makes it
// impossible to mistake a live file for a frozen one: frozen files have no
// `live_provenance` key (so they fail LiveBracketSnapshotSchema), and the live
// files carry one (so they would fail any frozen schema that forbids it). No
// graded surface reads these files (see loadLiveBracket, a null loader) and
// osf/amendments/deviation_cp-16b_live_conditional_bracket.md.

export const LiveProvenanceSchema = z.object({
  // Active-batch id the live marginals were aggregated from. Distinct from the
  // frozen FROZEN_BATCH_ID whenever the nightly rebatch has repointed; today
  // (conditioning not yet active) they coincide, so the live view matches the
  // frozen forecast numerically.
  live_source_batch_id: z.string(),
  // cp-16c: True once result-conditioning fired on the active batch. False when
  // nothing settled yet or the conditioning loader degraded on a structural
  // failure (see conditioned_reason). The graded frozen surfaces never read
  // this; the live view stays flag-gated.
  conditioned: z.boolean(),
  // cp-16c: number of group matches conditioned on for this batch (0 when not
  // conditioned). Optional for backward compatibility with pre-cp-16c files.
  conditioned_count: z.number().optional(),
  // cp-16c: why conditioning did not fire, when conditioned is false. One of
  // "no_settled_group_matches" or "structural_failure:<reason>"; null/absent
  // when conditioned is true.
  conditioned_reason: z.string().nullable().optional(),
  // cp-16c: the settled-source provenance label load_settled stamped, carried
  // through for traceability (may include a ";conditioning_error=..." tag).
  settled_source: z.string().optional(),
  generated_at_utc: z.string(),
});
export type LiveProvenance = z.infer<typeof LiveProvenanceSchema>;

export const LiveBracketSnapshotSchema = BracketSnapshotSchema.extend({
  live_provenance: LiveProvenanceSchema,
});
export type LiveBracketSnapshot = z.infer<typeof LiveBracketSnapshotSchema>;

export const LiveTournamentSnapshotSchema = TournamentSnapshotSchema.extend({
  live_provenance: LiveProvenanceSchema,
});
export type LiveTournamentSnapshot = z.infer<typeof LiveTournamentSnapshotSchema>;

// ── manifest.json ─────────────────────────────────────────────────────────────

export const ManifestEntrySchema = z.object({
  snapshot_id: z.string(),
  generated_at_utc: z.string(),
});

export const ManifestSchema = z.array(ManifestEntrySchema);
export type Manifest = z.infer<typeof ManifestSchema>;
