"""
ingestion/fetch_recent_form.py
==============================
Phase 2 · Task 2.3c — Recent Form Series

Extracts the last N international matches per team from the historical dataset
and produces a raw form series used by M1 during calibration and live scoring.

Design
------
- Source: data/raw/historical_matches.parquet (all rows, calibration + hold-out)
  The is_holdout restriction applies to fitting model parameters (Phase 3).
  For the raw form series we want the most recent matches regardless of split.
- Window: last `form.window_matches` matches per team (from config; default 8)
- Opponent Elo: joined from data/raw/elo_ratings.parquet (current snapshot).
  We use current Elo as a proxy for historical opponent strength; the
  calibration phase may refine this if a historical Elo time-series is added.
- Competition weight: derived from K-factor ratios in config (WC=1.0,
  continental≈0.83, other≈0.33). Decay is NOT applied here.

Output columns per row (one row = one match appearance for one team)
------
  team_name         str     — the focal team
  date              datetime
  match_id          str
  result            str     — 'W', 'D', or 'L' from focal team's perspective
  opponent          str     — opponent team name
  opponent_elo      float   — opponent's current Elo rating (null if unmapped)
  comp_weight       float   — competition weight [0, 1]
  tournament        str
  is_holdout        bool    — passed through for downstream filtering

Run
---
  python ingestion/fetch_recent_form.py
  python ingestion/fetch_recent_form.py --force
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import yaml

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml") as _f:
    _cfg = yaml.safe_load(_f)

MATCHES_PARQUET = PROJECT_ROOT / _cfg["data_sources"]["historical_matches"]["output_file"]
ELO_PARQUET     = PROJECT_ROOT / _cfg["data_sources"]["elo_ratings"]["output_file"]
OUTPUT_PARQUET  = PROJECT_ROOT / "data" / "raw" / "recent_form.parquet"
SNAPSHOT_REG    = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

FORM_WINDOW: int = int(_cfg["form"]["window_matches"])

# Competition weight: proportional to Elo K-factors in config
_K_WC           = float(_cfg["elo"]["k_factor_world_cup"])
_K_CONTINENTAL  = float(_cfg["elo"]["k_factor_continental"])
_K_FRIENDLY     = float(_cfg["elo"]["k_factor_friendly"])

_COMP_WEIGHT_MAP: dict[str, float] = {
    "FIFA World Cup 2010":           _K_WC / _K_WC,
    "FIFA World Cup 2014":           _K_WC / _K_WC,
    "FIFA World Cup 2018":           _K_WC / _K_WC,
    "FIFA World Cup 2022":           _K_WC / _K_WC,
    "UEFA Euro 2020":                _K_CONTINENTAL / _K_WC,
    "UEFA Euro 2024":                _K_CONTINENTAL / _K_WC,
    "Copa America 2021":             _K_CONTINENTAL / _K_WC,
    "Copa America 2024":             _K_CONTINENTAL / _K_WC,
    "Africa Cup of Nations 2021":    _K_CONTINENTAL / _K_WC,
    "Africa Cup of Nations 2023":    _K_CONTINENTAL / _K_WC,
    "AFC Asian Cup 2023":            _K_CONTINENTAL / _K_WC,
}
_DEFAULT_COMP_WEIGHT = _K_FRIENDLY / _K_WC


# =============================================================================
# Fetch raw
# =============================================================================

def fetch_raw() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load historical matches and current Elo ratings."""
    if not MATCHES_PARQUET.exists():
        raise FileNotFoundError(
            f"Historical matches not found at {MATCHES_PARQUET}. "
            "Run ingestion/fetch_historical_matches.py first."
        )
    if not ELO_PARQUET.exists():
        raise FileNotFoundError(
            f"Elo ratings not found at {ELO_PARQUET}. "
            "Run ingestion/fetch_elo_ratings.py first."
        )

    matches = pd.read_parquet(MATCHES_PARQUET)
    elo     = pd.read_parquet(ELO_PARQUET)
    log.info("Matches loaded", rows=len(matches))
    log.info("Elo ratings loaded", teams=len(elo))
    return matches, elo


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(matches: pd.DataFrame, elo: pd.DataFrame) -> pd.DataFrame:
    log.stage("Building raw form series")

    # Build Elo lookup: team_name → elo_rating
    elo_map: dict[str, float] = dict(zip(elo["team_name"], elo["elo_rating"]))

    # Explode to per-team perspective
    # Home perspective
    home = matches[["match_id", "date", "tournament", "team_home", "team_away",
                    "score_home", "score_away", "is_holdout"]].copy()
    home = home.rename(columns={"team_home": "team_name", "team_away": "opponent"})
    home["result"] = home.apply(
        lambda r: (
            "W" if r["score_home"] > r["score_away"]
            else "D" if r["score_home"] == r["score_away"]
            else "L"
        ),
        axis=1,
    )

    # Away perspective
    away = matches[["match_id", "date", "tournament", "team_home", "team_away",
                    "score_home", "score_away", "is_holdout"]].copy()
    away = away.rename(columns={"team_away": "team_name", "team_home": "opponent"})
    away["result"] = away.apply(
        lambda r: (
            "W" if r["score_away"] > r["score_home"]
            else "D" if r["score_away"] == r["score_home"]
            else "L"
        ),
        axis=1,
    )

    combined = pd.concat([home, away], ignore_index=True)
    combined = combined.dropna(subset=["result"])

    # Attach competition weight
    combined["comp_weight"] = combined["tournament"].map(
        lambda t: _COMP_WEIGHT_MAP.get(t, _DEFAULT_COMP_WEIGHT)
    )

    # Attach opponent Elo
    combined["opponent_elo"] = combined["opponent"].map(elo_map)

    unmapped_opp = combined["opponent_elo"].isna().sum()
    if unmapped_opp:
        unmapped_teams = combined[combined["opponent_elo"].isna()]["opponent"].unique().tolist()
        log.warning(
            "Opponent Elo not found for some teams (Elo ratings cover current snapshot)",
            count=unmapped_opp,
            examples=unmapped_teams[:5],
        )

    # Sort chronologically per team, keep last FORM_WINDOW matches
    combined = combined.sort_values(["team_name", "date"])

    # Use rank+tail to get last FORM_WINDOW matches per team without FutureWarning
    combined["_row_rank"] = (
        combined.groupby("team_name")["date"]
        .rank(method="first", ascending=False)
    )
    form_rows = combined[combined["_row_rank"] <= FORM_WINDOW].drop(columns=["_row_rank"])

    log.success(
        "Form series built",
        total_rows=len(form_rows),
        unique_teams=form_rows["team_name"].nunique(),
        form_window=FORM_WINDOW,
    )
    return form_rows.reset_index(drop=True)


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "team_name":    df["team_name"],
        "date":         df["date"],
        "match_id":     df["match_id"],
        "result":       df["result"],
        "opponent":     df["opponent"],
        "opponent_elo": df["opponent_elo"],
        "comp_weight":  df["comp_weight"].round(4),
        "tournament":   df["tournament"],
        "is_holdout":   df["is_holdout"],
    })
    return out.sort_values(["team_name", "date"]).reset_index(drop=True)


# =============================================================================
# Schema spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    """Check result is W/D/L, comp_weight in (0,1], team_name non-empty."""
    valid_results = {"W", "D", "L"}
    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        if row["result"] not in valid_results:
            errors.append(f"{row['team_name']} {row['match_id']}: invalid result {row['result']!r}")
        if not (0.0 < row["comp_weight"] <= 1.0):
            errors.append(f"{row['team_name']}: comp_weight {row['comp_weight']} out of (0, 1]")
        if not row["team_name"]:
            errors.append(f"Empty team_name in row {row['match_id']}")

    if errors:
        log.warning("Validation issues in sample", count=len(errors))
        for err in errors:
            log.warning(err)
    else:
        log.success(f"Spot-check passed on {len(sample)} sample rows")

    # Summary stats
    counts = df.groupby("team_name").size()
    log.info(
        "Form window coverage",
        teams_with_full_window=int((counts >= FORM_WINDOW).sum()),
        teams_with_partial=int((counts < FORM_WINDOW).sum()),
        min_matches=int(counts.min()),
        max_matches=int(counts.max()),
    )


# =============================================================================
# Run
# =============================================================================

def run(force: bool = False) -> Path:
    log.stage("=== fetch_recent_form · Phase 2 Task 2.3c ===")

    if OUTPUT_PARQUET.exists() and not force:
        log.info("Output already exists — use --force to rebuild", path=str(OUTPUT_PARQUET))
        return OUTPUT_PARQUET

    matches_df, elo_df = fetch_raw()
    form_df = clean_and_enrich(matches_df, elo_df)
    output_df = build_output(form_df)

    log.stage("Spot-checking form records")
    _validate_sample(output_df)

    OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")
    log.success(
        "Parquet written",
        path=str(OUTPUT_PARQUET),
        rows=len(output_df),
        size_kb=round(OUTPUT_PARQUET.stat().st_size / 1024, 1),
    )

    hasher = DataSnapshotHasher()
    hasher.add_file(OUTPUT_PARQUET, label="recent_form")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_recent_form")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_recent_form complete", output=str(OUTPUT_PARQUET), rows=len(output_df))
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build recent form series from historical match data."
    )
    parser.add_argument("--force", action="store_true", help="Re-build even if output exists.")
    args = parser.parse_args()
    run(force=args.force)
