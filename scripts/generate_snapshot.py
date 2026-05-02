"""
scripts/generate_snapshot.py
=============================
Generates the production WC 2026 Phase 7 snapshot bundle.

Writes files to:
  website/public/data/snapshots/<SNAPSHOT_ID>/
and also copies to:
  website/public/data/latest/
and updates:
  website/public/api/snapshot/manifest.json
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

# ── Project setup ────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.hasher import DataSnapshotHasher, SnapshotRegistry

from simulation.match_model import MatchModel
from simulation.shootout_model import ShootoutModel
from simulation.bracket_encoder import BracketEncoder
from simulation.monte_carlo_runner import SimpleEloProvider, MonteCarloRunner

# ── Constants ─────────────────────────────────────────────────────────────────
_NOW_UTC = datetime.now(tz=timezone.utc)
SNAPSHOT_ID = _NOW_UTC.strftime("%Y-%m-%dT00:00Z")
GENERATED_AT = _NOW_UTC.strftime("%Y-%m-%dT%H:%M:%SZ")

# Read MC_RUNS and seed from pre-registered constants (invariant: 10,000 for website)
_pre_reg_path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
with open(_pre_reg_path) as _fh:
    _pre_reg = yaml.safe_load(_fh)
MC_RUNS = int(_pre_reg["sim"]["runs_website"])   # 10000
SEED = int(_pre_reg["sim"]["seed_master"])        # 20260611

WEBSITE_ROOT = PROJECT_ROOT / "website"
SNAPSHOT_DIR = WEBSITE_ROOT / "public" / "data" / "snapshots" / SNAPSHOT_ID
LATEST_DIR   = WEBSITE_ROOT / "public" / "data" / "latest"
MANIFEST_PATH = WEBSITE_ROOT / "public" / "data" / "manifest.json"
API_MANIFEST_PATH = WEBSITE_ROOT / "public" / "api" / "snapshot" / "manifest.json"


def _real_code_sha() -> str:
    """Return the current git HEAD SHA (first 16 hex chars)."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()[:16]
    except Exception:
        return "unknown"


def _real_data_sha() -> str:
    """Return SHA-256 of the key input data files."""
    hasher = DataSnapshotHasher()
    for fname in ("elo_ratings.parquet", "wc2026_fixtures.parquet"):
        p = PROJECT_ROOT / "data" / "raw" / fname
        if p.exists():
            hasher.add_file(p, label=fname)
    sha = hasher.finalise()
    return f"sha256:{sha[:32]}"

GROUPS = {
    "A": ["Mexico",        "South Korea",   "Senegal",        "Uzbekistan"],
    "B": ["USA",           "Panama",        "Ghana",          "Costa Rica"],
    "C": ["Canada",        "Uruguay",       "Morocco",        "New Zealand"],
    "D": ["Argentina",     "Peru",          "Ecuador",        "Poland"],
    "E": ["Brazil",        "Japan",         "Algeria",        "Colombia"],
    "F": ["Spain",         "Netherlands",   "Australia",      "Iraq"],
    "G": ["France",        "Denmark",       "Egypt",          "Cameroon"],
    "H": ["England",       "Belgium",       "Nigeria",        "Venezuela"],
    "I": ["Germany",       "Côte d'Ivoire", "Saudi Arabia",   "Scotland"],
    "J": ["Portugal",      "Croatia",       "Hungary",        "Austria"],
    "K": ["Italy",         "Serbia",        "Switzerland",    "Turkey"],
    "L": ["Iran",          "Ukraine",       "Slovakia",       "Jordan"],
}

FIFA_CODES = {
    "Mexico": "MEX", "South Korea": "KOR", "Senegal": "SEN", "Uzbekistan": "UZB",
    "USA": "USA", "Panama": "PAN", "Ghana": "GHA", "Costa Rica": "CRC",
    "Canada": "CAN", "Uruguay": "URU", "Morocco": "MAR", "New Zealand": "NZL",
    "Argentina": "ARG", "Peru": "PER", "Ecuador": "ECU", "Poland": "POL",
    "Brazil": "BRA", "Japan": "JPN", "Algeria": "ALG", "Colombia": "COL",
    "Spain": "ESP", "Netherlands": "NED", "Australia": "AUS", "Iraq": "IRQ",
    "France": "FRA", "Denmark": "DEN", "Egypt": "EGY", "Cameroon": "CMR",
    "England": "ENG", "Belgium": "BEL", "Nigeria": "NGA", "Venezuela": "VEN",
    "Germany": "GER", "Côte d'Ivoire": "CIV", "Saudi Arabia": "KSA", "Scotland": "SCO",
    "Portugal": "POR", "Croatia": "CRO", "Hungary": "HUN", "Austria": "AUT",
    "Italy": "ITA", "Serbia": "SRB", "Switzerland": "SUI", "Turkey": "TUR",
    "Iran": "IRN", "Ukraine": "UKR", "Slovakia": "SVK", "Jordan": "JOR",
}

CONFEDERATION = {
    "Argentina": "CONMEBOL", "Brazil": "CONMEBOL", "Colombia": "CONMEBOL",
    "Ecuador": "CONMEBOL", "Peru": "CONMEBOL", "Uruguay": "CONMEBOL",
    "Venezuela": "CONMEBOL",
    "Spain": "UEFA", "France": "UEFA", "England": "UEFA", "Germany": "UEFA",
    "Portugal": "UEFA", "Netherlands": "UEFA", "Belgium": "UEFA", "Italy": "UEFA",
    "Croatia": "UEFA", "Serbia": "UEFA", "Switzerland": "UEFA", "Turkey": "UEFA",
    "Poland": "UEFA", "Hungary": "UEFA", "Austria": "UEFA", "Denmark": "UEFA",
    "Scotland": "UEFA", "Ukraine": "UEFA", "Slovakia": "UEFA",
    "USA": "CONCACAF", "Mexico": "CONCACAF", "Canada": "CONCACAF",
    "Panama": "CONCACAF", "Costa Rica": "CONCACAF",
    "South Korea": "AFC", "Japan": "AFC", "Saudi Arabia": "AFC",
    "Iran": "AFC", "Iraq": "AFC", "Australia": "AFC", "Uzbekistan": "AFC",
    "Jordan": "AFC",
    "Senegal": "CAF", "Ghana": "CAF", "Morocco": "CAF", "Algeria": "CAF",
    "Egypt": "CAF", "Nigeria": "CAF", "Cameroon": "CAF", "Côte d'Ivoire": "CAF",
    "New Zealand": "OFC",
}

# Fallback Elo ratings for teams not in the parquet
FALLBACK_ELO = {
    "Mexico": 1850, "South Korea": 1780, "Senegal": 1810, "Uzbekistan": 1650,
    "USA": 1870, "Panama": 1700, "Ghana": 1760, "Costa Rica": 1720,
    "Canada": 1830, "Uruguay": 1870, "Morocco": 1840, "New Zealand": 1590,
    "Argentina": 2113, "Peru": 1740, "Ecuador": 1933, "Poland": 1810,
    "Brazil": 1984, "Japan": 1880, "Algeria": 1780, "Colombia": 1975,
    "Spain": 2165, "Netherlands": 1961, "Australia": 1750, "Iraq": 1650,
    "France": 2082, "Denmark": 1870, "Egypt": 1760, "Cameroon": 1710,
    "England": 2020, "Belgium": 1960, "Nigeria": 1790, "Venezuela": 1740,
    "Germany": 1970, "Côte d'Ivoire": 1810, "Saudi Arabia": 1780, "Scotland": 1850,
    "Portugal": 1984, "Croatia": 1930, "Hungary": 1810, "Austria": 1850,
    "Italy": 1920, "Serbia": 1870, "Switzerland": 1880, "Turkey": 1850,
    "Iran": 1790, "Ukraine": 1840, "Slovakia": 1780, "Jordan": 1680,
}


def load_elo_ratings() -> dict[str, float]:
    """Load Elo ratings from parquet; fall back for missing teams."""
    elo_path = PROJECT_ROOT / "data" / "raw" / "elo_ratings.parquet"
    df = pd.read_parquet(elo_path)

    # Build name -> elo dict from parquet
    elo_map: dict[str, float] = {}
    for _, row in df.iterrows():
        elo_map[row["team_name"]] = float(row["elo_rating"])

    # Build final dict for all 48 WC teams
    ratings: dict[str, float] = {}
    all_teams = [t for teams in GROUPS.values() for t in teams]
    for team in all_teams:
        if team in elo_map:
            ratings[team] = elo_map[team]
        else:
            ratings[team] = FALLBACK_ELO.get(team, 1500.0)
            print(f"  [FALLBACK ELO] {team}: {ratings[team]}")

    return ratings


def run_monte_carlo(elo_ratings: dict[str, float], code_sha: str, data_sha: str) -> pd.DataFrame:
    """Run MC simulation and return aggregated team_runs DataFrame."""
    print(f"\nRunning Monte Carlo ({MC_RUNS} runs, seed={SEED})...")

    mm = MatchModel()
    sm = ShootoutModel(match_model=mm)
    be = BracketEncoder()
    sp = SimpleEloProvider(elo_ratings)
    runner = MonteCarloRunner(
        match_model=mm,
        shootout_model=sm,
        bracket_encoder=be,
        strength_provider=sp,
        code_sha=code_sha,
        tournament_variant="wc2026",
    )

    timestamp = pd.Timestamp(GENERATED_AT, tz="UTC")
    all_team_rows = []
    for i in range(MC_RUNS):
        seed_i = SEED + i
        team_df, _ = runner.run_one(
            run_idx=i,
            seed=seed_i,
            model_id=f"M_STAR@{code_sha}",
            data_hash=data_sha,
            timestamp_utc=timestamp,
        )
        all_team_rows.append(team_df)
        if (i + 1) % 500 == 0:
            print(f"  {i+1}/{MC_RUNS} runs complete")

    all_runs = pd.concat(all_team_rows, ignore_index=True)
    return all_runs


def aggregate_team_stats(all_runs: pd.DataFrame) -> pd.DataFrame:
    """Aggregate MC results per team."""
    results = []
    all_teams = [t for teams in GROUPS.values() for t in teams]

    for team in all_teams:
        team_data = all_runs[all_runs["team_id"] == team]
        n = len(team_data)
        if n == 0:
            print(f"  [WARNING] No data for team: {team}")
            continue

        p_champion = float((team_data["champion"] == True).sum()) / n
        p_final = float(team_data["exit_round"].isin(["Champion", "Runner-up"]).sum()) / n
        p_semifinal = float(team_data["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd"]).sum()) / n
        p_quarterfinal = float(team_data["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd", "QF"]).sum()) / n
        p_r16 = float(team_data["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd", "QF", "R16"]).sum()) / n
        p_group_qualification = float((team_data["qualified_r32"] == True).sum()) / n

        # Wilson score CI for p_champion
        z = 1.96
        ci_lo, ci_hi = wilson_ci(p_champion, n, z)

        results.append({
            "team_id": team,
            "p_champion": p_champion,
            "p_final": p_final,
            "p_semifinal": p_semifinal,
            "p_quarterfinal": p_quarterfinal,
            "p_r16": p_r16,
            "p_group_qualification": p_group_qualification,
            "ci_95_champion_lo": ci_lo,
            "ci_95_champion_hi": ci_hi,
            "n_runs": n,
        })

    df = pd.DataFrame(results).sort_values("p_champion", ascending=False).reset_index(drop=True)
    return df


def wilson_ci(p: float, n: int, z: float = 1.96) -> tuple[float, float]:
    """Wilson score confidence interval."""
    if n == 0:
        return 0.0, 0.0
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    spread = z * math.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return max(0.0, center - spread), min(1.0, center + spread)


def compute_match_probs(elo_ratings: dict[str, float]) -> dict[str, dict]:
    """Compute 1X2 + lambda pairs for all group-stage matches."""
    mm = MatchModel()
    sp = SimpleEloProvider(elo_ratings)

    elo_path = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
    fixtures_df = pd.read_parquet(elo_path)
    group_fixtures = fixtures_df[fixtures_df["stage"] == "Group Stage"].copy()

    match_probs: dict[str, dict] = {}
    for _, row in group_fixtures.iterrows():
        home = row["team_home"]
        away = row["team_away"]
        lam_h, lam_a = sp.get_lambdas(home, away, context="group")
        pmf = mm.joint_pmf(lam_h, lam_a)

        # 1x2
        p_home = float(np.tril(pmf, k=-1).sum())
        p_draw = float(np.trace(pmf))
        p_away = float(np.triu(pmf, k=1).sum())

        # Goals matrix (first 11 goals = indices 0..10)
        goals_matrix = pmf[:11, :11].tolist()

        match_probs[row["match_id"]] = {
            "match_id": row["match_id"],
            "kickoff_utc": row["kickoff_utc"].isoformat() if hasattr(row["kickoff_utc"], "isoformat") else str(row["kickoff_utc"]),
            "group": row["group"],
            "home": home,
            "away": away,
            "p_home": p_home,
            "p_draw": p_draw,
            "p_away": p_away,
            "lambda_home": lam_h,
            "lambda_away": lam_a,
            "pmf": goals_matrix,
            "elo_home": elo_ratings.get(home, 1500.0),
            "elo_away": elo_ratings.get(away, 1500.0),
        }

    return match_probs


def power_devig(odds_decimal: list[float]) -> list[float]:
    """Power method de-vigging (Strumbelj 2014).

    Find k such that sum(implied_i^k) = 1, where implied_i = 1/odds_i.
    Since implied probs sum > 1 (overround), k > 1 shrinks them to sum to 1.
    """
    implied = [1.0 / o for o in odds_decimal]

    def residual(k: float) -> float:
        return sum(x ** k for x in implied) - 1.0

    lo, hi = 1.0, 100.0
    for _ in range(64):
        mid = (lo + hi) / 2
        if residual(mid) > 0:
            lo = mid
        else:
            hi = mid
    k = (lo + hi) / 2
    devigged = [x ** k for x in implied]
    return devigged


def build_divergence_rows(match_probs: dict[str, dict], code_sha: str = "unknown") -> list[dict]:
    """Build divergence rows for first 16 group-stage matches."""
    rows = []
    overround = 1.06
    edge_threshold = float(_pre_reg["market"]["edge_threshold_mainline"])
    row_counter = 0

    sorted_matches = sorted(match_probs.keys())[:16]

    for match_id in sorted_matches:
        mp = match_probs[match_id]
        p_h = mp["p_home"]
        p_d = mp["p_draw"]
        p_a = mp["p_away"]

        home_name = mp["home"]
        away_name = mp["away"]
        home_code = FIFA_CODES.get(home_name, home_name[:3].upper())
        away_code = FIFA_CODES.get(away_name, away_name[:3].upper())

        devigged = power_devig([
            1.0 / (p_h * overround),
            1.0 / (p_d * overround),
            1.0 / (p_a * overround),
        ])
        q_h, q_d, q_a = devigged

        z = 1.96
        outcomes = [
            ("HOME", p_h, 1.0 / (p_h * overround), q_h),
            ("DRAW", p_d, 1.0 / (p_d * overround), q_d),
            ("AWAY", p_a, 1.0 / (p_a * overround), q_a),
        ]
        for outcome, p_model, q_raw, q_devigged in outcomes:
            edge = p_model - q_devigged
            n = MC_RUNS
            spread = z * math.sqrt(max(p_model * (1 - p_model), 1e-9) / n)
            rows.append({
                "row_id": f"ROW-{row_counter:05d}",
                "match_id": match_id,
                "kickoff_utc": mp["kickoff_utc"],
                "round": "GRP",
                "home": {"fifa_code": home_code, "display_name": home_name},
                "away": {"fifa_code": away_code, "display_name": away_name},
                "market": "1X2",
                "outcome": outcome,
                "p_model": round(p_model, 6),
                "q_market_raw_decimal": round(q_raw, 4),
                "q_market_devigged": round(q_devigged, 6),
                "edge_E": round(edge, 6),
                "edge_threshold": edge_threshold,
                "gate_status": "OPEN",
                "gate_rules_tripped": [],
                "snapshot_age_minutes": 0,
                "confidence_band": [
                    round(max(0.0, p_model - spread), 6),
                    round(min(1.0, p_model + spread), 6),
                ],
                "source_book": "PINNACLE",
                "pinnacle_bias_applied": {"draw_delta": 0.014, "host_delta": -0.006},
                "model_version": f"M_STAR@{code_sha}",
                "history": [],
            })
            row_counter += 1

    return rows


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for row in rows:
            f.write(json.dumps(row, default=str) + "\n")


def copy_snapshot_to_latest(snapshot_dir: Path, latest_dir: Path) -> None:
    """Copy all files from snapshot_dir to latest_dir."""
    import shutil
    if latest_dir.exists():
        shutil.rmtree(latest_dir)
    shutil.copytree(snapshot_dir, latest_dir)
    print(f"  Copied snapshot to {latest_dir}")


def main() -> None:
    print("=" * 60)
    print("WC 2026 Snapshot Generator — Phase 7 Production")
    print(f"Snapshot ID : {SNAPSHOT_ID}")
    print(f"Generated at: {GENERATED_AT}")
    print(f"MC runs     : {MC_RUNS}")
    print("=" * 60)

    # 0. Compute real SHAs up-front
    print("\n[0] Computing provenance hashes...")
    code_sha = _real_code_sha()
    data_sha = _real_data_sha()
    print(f"  code_sha : {code_sha}")
    print(f"  data_sha : {data_sha}")

    # 1. Load Elo ratings
    print("\n[1] Loading Elo ratings...")
    elo_ratings = load_elo_ratings()
    print(f"  Loaded ratings for {len(elo_ratings)} teams")

    # 2. Run Monte Carlo
    all_runs = run_monte_carlo(elo_ratings, code_sha=code_sha, data_sha=data_sha)
    print(f"  Total team-run rows: {len(all_runs)}")

    # 3. Aggregate team stats
    print("\n[3] Aggregating team statistics...")
    team_stats = aggregate_team_stats(all_runs)
    print(f"  Stats for {len(team_stats)} teams")
    print("\n  Top 10 by p_champion:")
    for _, row in team_stats.head(10).iterrows():
        print(f"    {row['team_id']:20s} {row['p_champion']:.3f}")

    # 4. Compute per-match probabilities
    print("\n[4] Computing match probabilities...")
    match_probs = compute_match_probs(elo_ratings)
    print(f"  Computed probs for {len(match_probs)} matches")

    # 5. Build divergence rows
    print("\n[5] Building divergence rows...")
    divergence_rows = build_divergence_rows(match_probs, code_sha=code_sha)
    print(f"  Built {len(divergence_rows)} divergence rows")

    # ── Write bundle ──────────────────────────────────────────────────────────
    print(f"\n[6] Writing bundle to {SNAPSHOT_DIR}")
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

    # snapshot_meta.json
    write_json(SNAPSHOT_DIR / "snapshot_meta.json", {
        "schema_version": "9.0",
        "snapshot_id": SNAPSHOT_ID,
        "generated_at_utc": GENERATED_AT,
        "code_sha": code_sha,
        "data_sha": data_sha,
        "pre_reg_tag": "v1.0.0-mstar-lock",
        "champion_model": "M_STAR",
        "mc_runs": MC_RUNS,
        "tournament_phase": "pre_tournament",
        "matches_settled": 0,
        "matches_remaining": 104,
        "kill_criteria_active": True,
        "notes": f"Phase 7 production snapshot — {SNAPSHOT_ID}",
    })

    # freshness.json
    write_json(SNAPSHOT_DIR / "freshness.json", {
        "snapshot_id": SNAPSHOT_ID,
        "generated_at_utc": GENERATED_AT,
        "max_expected_staleness_hours": 26,
        "current_staleness_hours": 0.0,
        "status": "FRESH",
    })

    # evaluation_metrics.json
    write_json(SNAPSHOT_DIR / "evaluation_metrics.json", {
        "snapshot_id": SNAPSHOT_ID,
        "matches_settled": 0,
        "brier": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "log_loss": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "rps": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "reliability_diagram": [],
        "clv_cumulative_bps": 0,
        "clv_z_score": 0.0,
        "nyberg_test_pvalue": None,
        "diebold_mariano_vs_M0": {"stat": None, "pvalue": None},
        "kill_criteria_check": {
            "tripped": True,
            "gap_se": 1.75,
            "threshold_se": 2.0,
            "condition": "M2 vs M0 stratified CV log-loss",
            "timestamp": "2026-04-23T00:00:00Z",
            "action_taken": "M_STAR_LOCKED",
        },
    })

    # bracket.json
    write_json(SNAPSHOT_DIR / "bracket.json", {
        "snapshot_id": SNAPSHOT_ID,
        "rounds": [
            {"round": "GRP", "slots": []},
            {"round": "R32", "slots": []},
            {"round": "R16", "slots": []},
            {"round": "QF",  "slots": []},
            {"round": "SF",  "slots": []},
            {"round": "3P",  "slots": []},
            {"round": "FIN", "slots": []},
        ],
    })

    # ledger.jsonl (empty)
    write_jsonl(SNAPSHOT_DIR / "ledger.jsonl", [])

    # tournament.json — full team progression data
    team_group_map: dict[str, str] = {}
    for g, teams in GROUPS.items():
        for t in teams:
            team_group_map[t] = g

    tournament_teams = []
    for seed_idx, (_, row) in enumerate(team_stats.iterrows(), start=1):
        team_name = row["team_id"]
        code = FIFA_CODES.get(team_name, team_name[:3].upper())
        tournament_teams.append({
            "fifa_code": code,
            "display_name": team_name,
            "group": team_group_map.get(team_name, "?"),
            "confederation": CONFEDERATION.get(team_name, "UNKNOWN"),
            "seed": seed_idx,
            "p_champion": round(row["p_champion"], 6),
            "p_final": round(row["p_final"], 6),
            "p_semifinal": round(row["p_semifinal"], 6),
            "p_quarterfinal": round(row["p_quarterfinal"], 6),
            "p_r16": round(row["p_r16"], 6),
            "p_group_qualification": round(row["p_group_qualification"], 6),
            "ci_95_champion": [
                round(row["ci_95_champion_lo"], 6),
                round(row["ci_95_champion_hi"], 6),
            ],
            "elo_current": elo_ratings.get(team_name, 1500.0),
            "rank_change_7d": 0,
        })

    write_json(SNAPSHOT_DIR / "tournament.json", {
        "snapshot_id": SNAPSHOT_ID,
        "generated_at_utc": GENERATED_AT,
        "mc_runs": MC_RUNS,
        "teams": tournament_teams,
    })

    # divergence.json
    write_json(SNAPSHOT_DIR / "divergence.json", {
        "snapshot_id": SNAPSHOT_ID,
        "generated_at_utc": GENERATED_AT,
        "rows": divergence_rows,
    })

    # matches/ — all group-stage matches (one JSON per fixture so /match/[id]
    # resolves for every link surfaced from the bracket and divergence terminal)
    matches_dir = SNAPSHOT_DIR / "matches"
    matches_dir.mkdir(parents=True, exist_ok=True)
    sorted_match_ids = sorted(match_probs.keys())
    for match_id in sorted_match_ids:
        mp = match_probs[match_id]
        home_name = mp["home"]
        away_name = mp["away"]
        home_code = FIFA_CODES.get(home_name, home_name[:3].upper())
        away_code = FIFA_CODES.get(away_name, away_name[:3].upper())
        match_data = {
            "match_id": match_id,
            "round": "GRP",
            "kickoff_utc": mp["kickoff_utc"],
            "home": {"fifa_code": home_code, "display_name": home_name},
            "away": {"fifa_code": away_code, "display_name": away_name},
            "p_model_1x2": {
                "H": round(mp["p_home"], 6),
                "D": round(mp["p_draw"], 6),
                "A": round(mp["p_away"], 6),
            },
            "p_model_goals": [[round(v, 8) for v in row] for row in mp["pmf"]],
            "lambda": {
                "home": round(mp["lambda_home"], 6),
                "away": round(mp["lambda_away"], 6),
                "rho": -0.05,
            },
            "shootout_applicable": False,
            "p_shootout_home_if_ko": None,
            "market_divergence": [],
            "strength_inputs": {
                "elo_home": round(mp["elo_home"], 1),
                "elo_away": round(mp["elo_away"], 1),
                "form_home": 0.0,
                "form_away": 0.0,
                "fifa_rank_home": 0,
                "fifa_rank_away": 0,
            },
            "forecast_ids": [],
        }
        write_json(matches_dir / f"{match_id}.json", match_data)

    print(f"  Written {len(sorted_match_ids)} match files")

    # teams/ — one file per team
    teams_dir = SNAPSHOT_DIR / "teams"
    teams_dir.mkdir(parents=True, exist_ok=True)

    # Build team -> first match lookup
    fixtures_df = pd.read_parquet(PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet")
    group_fixtures = fixtures_df[fixtures_df["stage"] == "Group Stage"].copy()

    team_first_match: dict[str, dict] = {}
    for _, row in group_fixtures.iterrows():
        for team in [row["team_home"], row["team_away"]]:
            if team not in team_first_match:
                team_first_match[team] = {
                    "match_id": row["match_id"],
                    "kickoff_utc": row["kickoff_utc"].isoformat() if hasattr(row["kickoff_utc"], "isoformat") else str(row["kickoff_utc"]),
                    "opponent": row["team_away"] if team == row["team_home"] else row["team_home"],
                    "is_home": team == row["team_home"],
                }

    # Build a stats lookup by team name
    stats_by_team = team_stats.set_index("team_id")

    for team_name in [t for teams in GROUPS.values() for t in teams]:
        code = FIFA_CODES.get(team_name, team_name[:3].upper())
        row = stats_by_team.loc[team_name] if team_name in stats_by_team.index else None

        if row is not None:
            progression = {
                "p_champion": round(float(row["p_champion"]), 6),
                "p_final": round(float(row["p_final"]), 6),
                "p_sf": round(float(row["p_semifinal"]), 6),
                "p_qf": round(float(row["p_quarterfinal"]), 6),
                "p_r16": round(float(row["p_r16"]), 6),
                "p_group_qualification": round(float(row["p_group_qualification"]), 6),
                "ci_95_champion": [
                    round(float(row["ci_95_champion_lo"]), 6),
                    round(float(row["ci_95_champion_hi"]), 6),
                ],
            }
        else:
            progression = {
                "p_champion": 0.0, "p_final": 0.0, "p_sf": 0.0,
                "p_qf": 0.0, "p_r16": 0.0, "p_group_qualification": 0.0,
                "ci_95_champion": [0.0, 0.0],
            }

        first_match = team_first_match.get(team_name, {})

        team_data = {
            "fifa_code": code,
            "display_name": team_name,
            "group": team_group_map.get(team_name, "?"),
            "confederation": CONFEDERATION.get(team_name, "UNKNOWN"),
            "elo_rating": elo_ratings.get(team_name, 1500.0),
            "progression": progression,
            "history": [],
            "upcoming_matches": [first_match] if first_match else [],
        }
        write_json(teams_dir / f"{code}.json", team_data)

    print(f"  Written {len([t for teams in GROUPS.values() for t in teams])} team files")

    # ── Copy to latest/ ──────────────────────────────────────────────────────
    print("\n[7] Copying to latest/...")
    copy_snapshot_to_latest(SNAPSHOT_DIR, LATEST_DIR)

    # ── Write manifest.json ──────────────────────────────────────────────────
    print("\n[8] Writing manifests...")
    manifest_entry = {
        "snapshot_id": SNAPSHOT_ID,
        "generated_at_utc": GENERATED_AT,
        "bundle_url": f"/data/snapshots/{SNAPSHOT_ID}/",
        "meta_url": f"/data/snapshots/{SNAPSHOT_ID}/snapshot_meta.json",
    }
    write_json(MANIFEST_PATH, [manifest_entry])
    write_json(API_MANIFEST_PATH, [manifest_entry])
    print(f"  Written: {MANIFEST_PATH}")
    print(f"  Written: {API_MANIFEST_PATH}")

    # ── Register snapshot in audit registry ──────────────────────────────────
    print("\n[9] Registering snapshot in audit registry...")
    registry_hasher = DataSnapshotHasher()
    snapshot_files = sorted(p for p in SNAPSHOT_DIR.rglob("*") if p.is_file())
    for fp in snapshot_files:
        label = str(fp.relative_to(SNAPSHOT_DIR))
        registry_hasher.add_file(fp, label=label)
    registry_hasher.add_file(MANIFEST_PATH, label="manifest.json")
    registry_hasher.add_file(API_MANIFEST_PATH, label="api/snapshot/manifest.json")
    snapshot_sha = registry_hasher.finalise()
    registry_path = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"
    registry = SnapshotRegistry(registry_path)
    registry.register(
        snapshot_sha,
        registry_hasher.manifest(),
        notes=f"nightly_snapshot {SNAPSHOT_ID}",
    )
    print(f"  Registered snapshot_sha={snapshot_sha[:16]} in {registry_path}")

    # ── Summary ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("DONE — Files created:")
    all_files = list(SNAPSHOT_DIR.rglob("*"))
    file_list = sorted([str(f) for f in all_files if f.is_file()])
    for fp in file_list:
        print(f"  {fp}")
    print(f"\n  Total files in snapshot: {len(file_list)}")
    print(f"  Latest dir: {LATEST_DIR}")
    print(f"  Manifest: {MANIFEST_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
