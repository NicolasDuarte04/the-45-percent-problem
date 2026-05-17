/**
 * scripts/regenerate-snapshots.ts
 *
 * Regenerates the JSON snapshot artifacts under public/data/latest/ from the
 * canonical FIFA 2026 draw module. Until the upstream Python pipeline is
 * regenerated, this script keeps the website's structural data correct.
 *
 * Probabilities here are synthetic-but-plausible (derived from an Elo seed
 * dictionary, then forward-rolled into match 1X2 and tournament-progression
 * estimates). They are placeholders until the M0/M★ snapshot pipeline runs
 * with the real fixture list. The STRUCTURE: which teams exist, which
 * fixtures are real: matches the canonical Postgres seed exactly.
 *
 * Usage:
 *   pnpm tsx scripts/regenerate-snapshots.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  TEAMS,
  GROUP_MATCHES,
  KNOCKOUT_MATCHES,
  VENUE_BY_KEY,
  TEAM_BY_CODE,
  type Team,
} from "../src/lib/data/wc2026-official-draw";

// Use fileURLToPath, not new URL(...).pathname; the latter keeps spaces
// percent-encoded, which silently routes writes to a ghost "Claude%20.../"
// directory on macOS install paths that contain spaces.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUT_LATEST = path.join(ROOT, "public", "data", "latest");
const OUT_MATCHES = path.join(OUT_LATEST, "matches");
const OUT_TEAMS = path.join(OUT_LATEST, "teams");

const SNAPSHOT_ID = "2026-05-02T00:00Z";
const GENERATED_AT = "2026-05-02T20:00:00Z";
const CODE_SHA = "wc2026official";
const DATA_SHA = "sha256:wc2026-canonical-draw";
const MODEL_VERSION = `M_STAR@${CODE_SHA}`;

// ─── Elo seeds ───────────────────────────────────────────────────────────────
// One pre-tournament Elo per team. Pot 1 / Pot 2 / Pot 3 / Pot 4 buckets get
// graduated baselines; specific values for top 16 teams are anchored on
// well-known public Elo rankings as of May 2026. Every team gets a value;
// the seed is deterministic so re-runs produce identical snapshots.

const ELO_SEED: Record<string, number> = {
  ARG: 2113, BRA: 2076, ESP: 2165, FRA: 2082, ENG: 2020, POR: 1984,
  GER: 1990, NED: 1945, BEL: 1932, CRO: 1888, COL: 1865, URU: 1899,
  MEX: 1815, USA: 1772, CAN: 1715, JPN: 1820, KOR: 1799, IRN: 1795,
  AUS: 1715, MAR: 1832, EGY: 1675, SEN: 1810, CIV: 1735, GHA: 1720,
  TUN: 1670, ALG: 1700, RSA: 1655, COD: 1610, CPV: 1545, NOR: 1830,
  AUT: 1820, SUI: 1790, SWE: 1700, SCO: 1700, TUR: 1730, BIH: 1640,
  CZE: 1650, ECU: 1735, PAR: 1680, NZL: 1500, JOR: 1450, KSA: 1610,
  QAT: 1605, IRQ: 1500, UZB: 1525, HAI: 1430, CUW: 1320, PAN: 1620,
};

function eloOf(code: string): number {
  return ELO_SEED[code] ?? 1500;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Seeded RNG (mulberry32) so the snapshot is reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = rng(20260502);

function eloWinProb(home: number, away: number): number {
  // Standard Elo expected-score formula.
  return 1 / (1 + Math.pow(10, (away - home) / 400));
}

/** Approximate 1X2 probabilities from Elo difference. Draw scales inversely
 *  with abs(diff) within a soft range. */
function match1x2(homeCode: string, awayCode: string): { H: number; D: number; A: number } {
  const eh = eloOf(homeCode);
  const ea = eloOf(awayCode);
  const wH = eloWinProb(eh, ea);
  // Carve out a draw slice that shrinks with skill imbalance.
  const draw = Math.max(0.16, 0.30 - Math.abs(eh - ea) / 1500);
  // Distribute remaining (1 - draw) by Elo win prob.
  const H = (1 - draw) * wH;
  const A = (1 - draw) * (1 - wH);
  return { H: round6(H), D: round6(draw), A: round6(A) };
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
function round4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}

/** Tournament-progression probabilities seeded by Elo rank within group. */
function progressionFor(team: Team): {
  p_group_qualification: number;
  p_r16: number;
  p_qf: number;
  p_sf: number;
  p_final: number;
  p_champion: number;
  ci_95_champion: [number, number];
} {
  const elo = eloOf(team.fifa_code);
  // Cumulative survival rate per round, indexed by Elo bucket.
  // Tuned so totals are reasonable; pre-tournament priors only.
  const tier =
    elo >= 2050 ? "elite" :
    elo >= 1900 ? "strong" :
    elo >= 1750 ? "mid" :
    elo >= 1600 ? "weak" : "tail";
  const probs = {
    elite:  { gq: 0.94, r16: 0.86, qf: 0.62, sf: 0.40, fin: 0.24, ch: 0.13 },
    strong: { gq: 0.84, r16: 0.66, qf: 0.36, sf: 0.18, fin: 0.09, ch: 0.04 },
    mid:    { gq: 0.66, r16: 0.45, qf: 0.18, sf: 0.07, fin: 0.025, ch: 0.008 },
    weak:   { gq: 0.42, r16: 0.24, qf: 0.06, sf: 0.018, fin: 0.005, ch: 0.001 },
    tail:   { gq: 0.22, r16: 0.10, qf: 0.018, sf: 0.004, fin: 0.0008, ch: 0.0001 },
  }[tier];
  const ch = probs.ch;
  return {
    p_group_qualification: round4(probs.gq),
    p_r16: round4(probs.r16),
    p_qf: round4(probs.qf),
    p_sf: round4(probs.sf),
    p_final: round4(probs.fin),
    p_champion: round4(ch),
    ci_95_champion: [round6(ch * 0.85), round6(ch * 1.15)],
  };
}

function team(code: string) {
  const t = TEAM_BY_CODE[code];
  return { fifa_code: t.fifa_code, display_name: t.display_name };
}

// ─── Generate tournament.json ────────────────────────────────────────────────

function buildTournament() {
  // Tier-bucketed priors are not normalized; rescale `p_champion` so the
  // 48-team distribution sums to 1 (the `tournament.json` contract test
  // asserts this invariant). CIs are recomputed from the rescaled value.
  const raw = TEAMS.map((t) => ({ team: t, prog: progressionFor(t) }));
  const champTotal = raw.reduce((s, r) => s + r.prog.p_champion, 0);
  const scale = champTotal > 0 ? 1 / champTotal : 1;

  const teams = raw.map(({ team: t, prog }) => {
    const ch = round4(prog.p_champion * scale);
    return {
      fifa_code: t.fifa_code,
      display_name: t.display_name,
      confederation: t.confederation,
      seed: t.draw_pot,
      p_champion: ch,
      p_final: prog.p_final,
      p_semifinal: prog.p_sf,
      p_quarterfinal: prog.p_qf,
      p_r16: prog.p_r16,
      p_group_qualification: prog.p_group_qualification,
      ci_95_champion: [round6(ch * 0.85), round6(ch * 1.15)] as [number, number],
      elo_current: eloOf(t.fifa_code),
      rank_change_7d: 0,
      group: t.group,
    };
  });
  return {
    snapshot_id: SNAPSHOT_ID,
    generated_at_utc: GENERATED_AT,
    mc_runs: 10000,
    teams,
  };
}

// ─── Generate divergence.json ────────────────────────────────────────────────

function buildDivergence() {
  const rows: Record<string, unknown>[] = [];
  // 1X2 rows for every group-stage match (3 outcomes * 72 = 216 rows).
  let rowIdx = 0;
  for (const m of GROUP_MATCHES) {
    const probs = match1x2(m.home_code, m.away_code);
    const outcomes: Array<["HOME" | "DRAW" | "AWAY", number]> = [
      ["HOME", probs.H], ["DRAW", probs.D], ["AWAY", probs.A],
    ];
    for (const [outcome, p_model] of outcomes) {
      // Synthetic market: small biased noise around model prob.
      const bias = (rnd() - 0.5) * 0.03;
      const q_devigged = Math.max(0.02, Math.min(0.98, p_model + bias));
      const q_raw = round4(1 / Math.max(0.02, q_devigged - 0.02)); // approximate decimal odds with vig
      const edge = round6(p_model - q_devigged);
      rows.push({
        row_id: `ROW-${String(rowIdx).padStart(5, "0")}`,
        match_id: m.match_id,
        kickoff_utc: m.kickoff_utc,
        round: "GRP",
        home: team(m.home_code),
        away: team(m.away_code),
        market: "1X2",
        outcome,
        p_model,
        q_market_raw_decimal: q_raw,
        q_market_devigged: round6(q_devigged),
        edge_E: edge,
        edge_threshold: 0.03,
        gate_status: "OPEN",
        gate_rules_tripped: [],
        snapshot_age_minutes: 0,
        confidence_band: [round6(p_model * 0.9), round6(p_model * 1.1)],
        source_book: "PINNACLE",
        pinnacle_bias_applied: { draw_delta: 0.014, host_delta: -0.006 },
        model_version: MODEL_VERSION,
        history: [],
      });
      rowIdx++;
    }
  }
  return { snapshot_id: SNAPSHOT_ID, generated_at_utc: GENERATED_AT, rows };
}

// ─── Generate bracket.json ───────────────────────────────────────────────────

function buildBracket() {
  // Group slots: 12 entries, each a group letter + the four FIFA codes.
  const groupSlots = "ABCDEFGHIJKL".split("").map((g) => ({
    group: g,
    teams: TEAMS.filter((t) => t.group === g).map((t) => t.fifa_code),
  }));
  // Knockout slots use the canonical pathway from KNOCKOUT_MATCHES.
  const koSlotsFor = (round: string) =>
    KNOCKOUT_MATCHES.filter((m) => m.round === round).map((m) => ({
      match_id: m.match_id,
      kickoff_utc: m.kickoff_utc,
      home_slot: m.home_slot,
      away_slot: m.away_slot,
      venue_key: m.venue_key,
    }));
  return {
    snapshot_id: SNAPSHOT_ID,
    rounds: [
      { round: "GRP", slots: groupSlots },
      { round: "R32", slots: koSlotsFor("R32") },
      { round: "R16", slots: koSlotsFor("R16") },
      { round: "QF",  slots: koSlotsFor("QF") },
      { round: "SF",  slots: koSlotsFor("SF") },
      { round: "3P",  slots: koSlotsFor("3P") },
      { round: "FIN", slots: koSlotsFor("FIN") },
    ],
  };
}

// ─── Generate matches/M*.json ────────────────────────────────────────────────

function buildMatchDetail(matchId: string, round: string, kickoffUtc: string,
                          homeCode: string, awayCode: string) {
  const probs = match1x2(homeCode, awayCode);
  const elo_h = eloOf(homeCode);
  const elo_a = eloOf(awayCode);
  // Simple lambda derivation from Elo (placeholder until pipeline reruns).
  const lambdaHome = round4(1.2 + (elo_h - elo_a) / 600);
  const lambdaAway = round4(1.2 - (elo_h - elo_a) / 600);
  const goalGrid = (lh: number, la: number) => {
    // 11x11 score grid using independent Poisson; sufficient placeholder.
    const max = 10;
    const grid: number[][] = [];
    const e = Math.exp;
    const fact: number[] = [1];
    for (let i = 1; i <= max; i++) fact[i] = fact[i - 1] * i;
    for (let h = 0; h <= max; h++) {
      const row: number[] = [];
      for (let a = 0; a <= max; a++) {
        const ph = (Math.pow(lh, h) * e(-lh)) / fact[h];
        const pa = (Math.pow(la, a) * e(-la)) / fact[a];
        row.push(round6(ph * pa));
      }
      grid.push(row);
    }
    return grid;
  };
  return {
    match_id: matchId,
    round,
    kickoff_utc: kickoffUtc,
    home: team(homeCode),
    away: team(awayCode),
    p_model_1x2: probs,
    p_model_goals: goalGrid(Math.max(0.1, lambdaHome), Math.max(0.1, lambdaAway)),
    lambda: { home: Math.max(0, lambdaHome), away: Math.max(0, lambdaAway), rho: -0.05 },
    shootout_applicable: round !== "GRP",
    p_shootout_home_if_ko: round === "GRP" ? null : 0.5,
    market_divergence: [],
    strength_inputs: {
      elo_home: elo_h,
      elo_away: elo_a,
      form_home: 0,
      form_away: 0,
      fifa_rank_home: 0,
      fifa_rank_away: 0,
    },
    forecast_ids: [],
  };
}

// ─── Generate teams/*.json ───────────────────────────────────────────────────

function buildTeamProgression(t: Team) {
  const prog = progressionFor(t);
  // Upcoming matches: this team's group fixtures.
  const upcoming = GROUP_MATCHES
    .filter((m) => m.home_code === t.fifa_code || m.away_code === t.fifa_code)
    .map((m) => {
      const isHome = m.home_code === t.fifa_code;
      const opponentCode = isHome ? m.away_code : m.home_code;
      return {
        match_id: m.match_id,
        kickoff_utc: m.kickoff_utc,
        opponent: TEAM_BY_CODE[opponentCode].display_name,
        is_home: isHome,
      };
    });
  return {
    fifa_code: t.fifa_code,
    display_name: t.display_name,
    group: t.group,
    progression: prog,
    history: [],
    upcoming_matches: upcoming,
  };
}

// ─── Snapshot meta + freshness ───────────────────────────────────────────────

function buildSnapshotMeta() {
  return {
    schema_version: "9.0",
    snapshot_id: SNAPSHOT_ID,
    generated_at_utc: GENERATED_AT,
    code_sha: CODE_SHA,
    data_sha: DATA_SHA,
    pre_reg_tag: "v1.0.0-mstar-lock",
    champion_model: "M_STAR" as const,
    mc_runs: 10000,
    tournament_phase: "pre_tournament" as const,
    matches_settled: 0,
    matches_remaining: 104,
    // Pre-tournament: kill criteria can't have fired yet (no settled matches),
    // so this must agree with evaluation_metrics.kill_criteria_check.tripped.
    kill_criteria_active: false,
    notes: "Regenerated from canonical FIFA 2026 draw (5 Dec 2025). Probabilities synthetic; structure authoritative.",
  };
}

function buildFreshness() {
  return {
    snapshot_id: SNAPSHOT_ID,
    generated_at_utc: GENERATED_AT,
    max_expected_staleness_hours: 26,
    current_staleness_hours: 0.0,
    status: "FRESH" as const,
  };
}

// ─── Write files ─────────────────────────────────────────────────────────────

function writeJson(file: string, payload: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}

function clearDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    fs.unlinkSync(path.join(dir, entry));
  }
}

function main() {
  console.log("[regenerate-snapshots] writing canonical-draw snapshots to", OUT_LATEST);

  // Top-level files.
  writeJson(path.join(OUT_LATEST, "snapshot_meta.json"), buildSnapshotMeta());
  writeJson(path.join(OUT_LATEST, "freshness.json"), buildFreshness());
  writeJson(path.join(OUT_LATEST, "tournament.json"), buildTournament());
  writeJson(path.join(OUT_LATEST, "divergence.json"), buildDivergence());
  writeJson(path.join(OUT_LATEST, "bracket.json"), buildBracket());

  // Per-match files (for the 72 group matches; KO match files would need
  // resolved teams, which are TBD). Replace existing dir to avoid stale ids.
  clearDir(OUT_MATCHES);
  for (const m of GROUP_MATCHES) {
    const detail = buildMatchDetail(m.match_id, "GRP", m.kickoff_utc, m.home_code, m.away_code);
    writeJson(path.join(OUT_MATCHES, `${m.match_id}.json`), detail);
  }

  // Per-team files.
  clearDir(OUT_TEAMS);
  for (const t of TEAMS) {
    writeJson(path.join(OUT_TEAMS, `${t.fifa_code}.json`), buildTeamProgression(t));
  }

  // ledger.jsonl: pre-tournament -> empty.
  writeJson(path.join(OUT_LATEST, "ledger.jsonl"), "");
  fs.writeFileSync(path.join(OUT_LATEST, "ledger.jsonl"), "", "utf-8");

  // evaluation_metrics.json: keep an empty pre-tournament shell so the page
  // doesn't 404. Schema requires non-null bins but shape allows empty array.
  const evalShell = {
    snapshot_id: SNAPSHOT_ID,
    matches_settled: 0,
    brier:    { M0: null, M1: null, M2: null, M3: null, M_STAR: null },
    log_loss: { M0: null, M1: null, M2: null, M3: null, M_STAR: null },
    rps:      { M0: null, M1: null, M2: null, M3: null, M_STAR: null },
    reliability_diagram: [],
    clv_cumulative_bps: 0,
    clv_z_score: 0,
    nyberg_test_pvalue: null,
    diebold_mariano_vs_M0: { stat: null, pvalue: null },
    kill_criteria_check: {
      tripped: false,
      gap_se: 0,
      threshold_se: 1.0,
      condition: "pre_tournament",
      timestamp: GENERATED_AT,
      action_taken: "none",
    },
  };
  writeJson(path.join(OUT_LATEST, "evaluation_metrics.json"), evalShell);

  console.log(
    `[regenerate-snapshots] wrote: tournament(${TEAMS.length} teams), ` +
      `divergence(${GROUP_MATCHES.length * 3} rows), ` +
      `bracket, ${GROUP_MATCHES.length} match files, ${TEAMS.length} team files`,
  );
}

main();
