"""
tests/test_monte_carlo_runner.py
=================================
Unit tests for simulation/monte_carlo_runner.py — §8.1 of Phase5_Simulation_Engine_Design.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from simulation.match_model import MatchModel
from simulation.shootout_model import ShootoutModel
from simulation.bracket_encoder import BracketEncoder, QATAR2022_GROUPS
from simulation.monte_carlo_runner import (
    MonteCarloRunner,
    SimpleEloProvider,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def _make_runner(variant: str = "qatar2022") -> MonteCarloRunner:
    """Build a MonteCarloRunner wired to the Qatar 2022 format for testing."""
    rng = np.random.default_rng(0)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)
    be = BracketEncoder()

    # Use approximate pre-tournament 2022 Elo ratings (top teams)
    elo_ratings = {
        "Brazil": 2100, "France": 2050, "Belgium": 2000, "Argentina": 1990,
        "England": 1980, "Spain": 1960, "Netherlands": 1940, "Portugal": 1920,
        "Germany": 1900, "Denmark": 1880, "Croatia": 1860, "Uruguay": 1840,
        "Switzerland": 1820, "Mexico": 1800, "USA": 1780, "Senegal": 1760,
        "Morocco": 1740, "Japan": 1720, "South Korea": 1700, "Poland": 1680,
        "Australia": 1660, "Ecuador": 1640, "Canada": 1620, "Serbia": 1600,
        "Tunisia": 1580, "Cameroon": 1560, "Ghana": 1540, "Iran": 1520,
        "Saudi Arabia": 1500, "Wales": 1480, "Costa Rica": 1460, "Qatar": 1440,
    }
    sp = SimpleEloProvider(elo_ratings=elo_ratings)
    return MonteCarloRunner(
        match_model=mm,
        shootout_model=sm,
        bracket_encoder=be,
        strength_provider=sp,
        code_sha="test_sha_abc123",
        tournament_variant=variant,
    )


@pytest.fixture
def runner_2022() -> MonteCarloRunner:
    return _make_runner("qatar2022")


@pytest.fixture
def runner_2026() -> MonteCarloRunner:
    return _make_runner("wc2026")


# ── Test 1: Output row counts ─────────────────────────────────────────────────

def test_output_row_counts_qatar2022(runner_2022: MonteCarloRunner):
    """Qatar 2022 run: 32 team rows + (48 group + 15 KO + 1 3rd + 1 final) match rows."""
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    team_df, match_df = runner_2022.run_one(
        run_idx=0, seed=42, model_id="test_M2",
        data_hash="abc", timestamp_utc=timestamp,
    )
    # 32 teams in Qatar 2022
    assert len(team_df) == 32, f"Expected 32 team rows, got {len(team_df)}"
    # 48 group matches + 8 R16 + 4 QF + 2 SF + 1 3rd + 1 Final = 64 match rows
    assert len(match_df) == 64, f"Expected 64 match rows, got {len(match_df)}"


def test_output_row_counts_wc2026(runner_2026: MonteCarloRunner):
    """WC 2026 run: 48 team rows + 104 match rows (72 group + 32 KO)."""
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    team_df, match_df = runner_2026.run_one(
        run_idx=0, seed=42, model_id="test_M2",
        data_hash="abc", timestamp_utc=timestamp,
    )
    assert len(team_df) == 48, f"Expected 48 team rows, got {len(team_df)}"
    # 72 group + 16 R32 + 8 R16 + 4 QF + 2 SF + 1 3rd + 1 Final = 104
    assert len(match_df) == 104, f"Expected 104 match rows, got {len(match_df)}"


# ── Test 2: Exactly one champion per run ─────────────────────────────────────

def test_champion_exists(runner_2022: MonteCarloRunner):
    """Exactly one team per run has champion=True."""
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    for seed in range(10):
        team_df, _ = runner_2022.run_one(
            run_idx=seed, seed=seed, model_id="test_M2",
            data_hash="abc", timestamp_utc=timestamp,
        )
        n_champions = int(team_df["champion"].sum())
        assert n_champions == 1, (
            f"Seed {seed}: expected exactly 1 champion, got {n_champions}"
        )


# ── Test 3: No duplicate run_idx ─────────────────────────────────────────────

def test_no_duplicate_teams_per_run(runner_2022: MonteCarloRunner):
    """Within a run, team_id values are unique (no team listed twice)."""
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    team_df, _ = runner_2022.run_one(
        run_idx=0, seed=0, model_id="test_M2",
        data_hash="abc", timestamp_utc=timestamp,
    )
    assert team_df["team_id"].nunique() == len(team_df), "Duplicate team entries found"


# ── Test 4: Schema stability ──────────────────────────────────────────────────

def test_schema_stability(runner_2022: MonteCarloRunner):
    """Column names and key dtypes match §6.2 specification."""
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    team_df, match_df = runner_2022.run_one(
        run_idx=0, seed=0, model_id="test_M2",
        data_hash="abc", timestamp_utc=timestamp,
    )

    # team_runs required columns
    team_required = [
        "run_idx", "model_id", "data_hash", "seed", "code_sha", "timestamp_utc",
        "team_id", "group_letter", "group_finish", "group_points", "group_gd",
        "group_gs", "qualified_r32", "exit_round", "reached_final", "champion",
    ]
    for col in team_required:
        assert col in team_df.columns, f"team_runs missing column: {col}"

    # match_runs required columns
    match_required = [
        "run_idx", "model_id", "data_hash", "seed", "code_sha", "timestamp_utc",
        "match_id", "phase", "team_home", "team_away",
        "lambda_home", "lambda_away",
        "reg_home_goals", "reg_away_goals",
        "went_to_ET", "et_home_goals", "et_away_goals",
        "went_to_pens", "pen_home_score", "pen_away_score",
        "winner",
    ]
    for col in match_required:
        assert col in match_df.columns, f"match_runs missing column: {col}"

    # Dtype checks
    assert team_df["group_finish"].dtype == "int8"
    assert team_df["champion"].dtype == bool
    assert match_df["went_to_ET"].dtype == bool


# ── Test 5: Exit rounds are valid ─────────────────────────────────────────────

def test_exit_rounds_valid(runner_2022: MonteCarloRunner):
    """All exit_round values must be valid round names."""
    valid_rounds = {"Group", "R16", "QF", "SF", "3rd", "Runner-up", "Champion"}
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    for seed in range(5):
        team_df, _ = runner_2022.run_one(
            run_idx=seed, seed=seed, model_id="test_M2",
            data_hash="abc", timestamp_utc=timestamp,
        )
        invalid = set(team_df["exit_round"].unique()) - valid_rounds
        assert not invalid, f"Invalid exit rounds: {invalid}"


# ── Test 6: Determinism under seed ───────────────────────────────────────────

def test_determinism_under_seed(runner_2022: MonteCarloRunner):
    """Same seed → identical team_runs DataFrame."""
    timestamp = pd.Timestamp("2026-01-01", tz="UTC")
    kwargs = dict(run_idx=0, seed=7777, model_id="test_M2",
                  data_hash="abc", timestamp_utc=timestamp)
    team_df1, _ = runner_2022.run_one(**kwargs)
    team_df2, _ = runner_2022.run_one(**kwargs)
    pd.testing.assert_frame_equal(
        team_df1.sort_values("team_id").reset_index(drop=True),
        team_df2.sort_values("team_id").reset_index(drop=True),
    )
