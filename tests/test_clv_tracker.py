"""
tests/test_clv_tracker.py
==========================
Golden-file tests for evaluation/clv_tracker.py
Covers: CLV computation (12)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.clv_tracker import (
    CLVSeries,
    HMResult,
    _block_length,
    _bootstrap_seed_from_sha,
    compute_clv_series,
    hall_mueller_sharpe,
    z_score,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _paired_df(n=50, seed=42, clv_mean=0.0) -> pd.DataFrame:
    """Generate synthetic paired bets DataFrame."""
    rng = np.random.default_rng(seed)
    q_open = rng.uniform(0.25, 0.55, n)
    # CLV = q_close/q_open - 1; control mean by shifting q_close
    q_close = q_open * (1.0 + clv_mean + rng.normal(0, 0.05, n))
    q_close = np.clip(q_close, 0.01, 0.99)
    d_open = 1.0 / q_open
    d_close = 1.0 / q_close
    stakes = rng.uniform(0.005, 0.02, n)
    return pd.DataFrame(
        {
            "forecast_id": [f"uid_{i}" for i in range(n)],
            "match_id": [f"match_{i}" for i in range(n)],
            "outcome_bet": rng.choice(["H", "D", "A"], size=n).tolist(),
            "q_open_devigged": q_open,
            "q_close_devigged": q_close,
            "d_open_decimal": d_open,
            "d_close_decimal": d_close,
            "kelly_stake_pct": stakes,
        }
    )


# ---------------------------------------------------------------------------
# Block length tests (2)
# ---------------------------------------------------------------------------

class TestBlockLength:
    def test_clamped_to_min(self):
        # N=1: raw = floor(1.75*1) = 1, clamped to 4
        assert _block_length(1) == 4

    def test_clamped_to_max(self):
        # N=10000: raw = floor(1.75*21.5) = 37, clamped to 12
        assert _block_length(10000) == 12

    def test_in_range_for_wc_bets(self):
        # N=150..220: pre-registered says lands in [9,10]
        for n in range(150, 221):
            bl = _block_length(n)
            assert 4 <= bl <= 12

    def test_monotone_in_n(self):
        for n1, n2 in [(10, 20), (50, 100), (100, 200)]:
            assert _block_length(n1) <= _block_length(n2)


# ---------------------------------------------------------------------------
# Bootstrap seed derivation (1)
# ---------------------------------------------------------------------------

class TestBootstrapSeed:
    def test_deterministic(self):
        sha = "abc1234"
        s1 = _bootstrap_seed_from_sha(sha)
        s2 = _bootstrap_seed_from_sha(sha)
        assert s1 == s2

    def test_different_sha_different_seed(self):
        assert _bootstrap_seed_from_sha("abc1234") != _bootstrap_seed_from_sha("xyz9876")

    def test_returns_int(self):
        assert isinstance(_bootstrap_seed_from_sha("1234567"), int)


# ---------------------------------------------------------------------------
# compute_clv_series tests (3)
# ---------------------------------------------------------------------------

class TestComputeCLVSeries:
    def test_returns_clv_series(self):
        df = _paired_df(n=30)
        result = compute_clv_series(df)
        assert isinstance(result, CLVSeries)

    def test_prob_space_clv_formula(self):
        df = pd.DataFrame(
            {
                "forecast_id": ["x"],
                "match_id": ["m"],
                "outcome_bet": ["H"],
                "q_open_devigged": [0.4],
                "q_close_devigged": [0.5],
                "d_open_decimal": [2.5],
                "d_close_decimal": [2.0],
                "kelly_stake_pct": [0.01],
            }
        )
        result = compute_clv_series(df)
        # CLV = 0.5/0.4 - 1 = 0.25
        np.testing.assert_allclose(result.clv[0], 0.25, rtol=1e-12)

    def test_cumulative_sum_correct(self):
        df = _paired_df(n=10, seed=0, clv_mean=0.0)
        result = compute_clv_series(df)
        np.testing.assert_allclose(result.cumulative_clv, np.cumsum(result.clv), rtol=1e-12)

    def test_stake_weighted_cumulative(self):
        df = _paired_df(n=10, seed=1)
        result = compute_clv_series(df)
        expected = np.cumsum(result.stake * result.clv)
        np.testing.assert_allclose(result.cumulative_clv_weighted, expected, rtol=1e-12)

    def test_log_odds_clv_formula(self):
        df = pd.DataFrame(
            {
                "forecast_id": ["x"],
                "match_id": ["m"],
                "outcome_bet": ["H"],
                "q_open_devigged": [0.4],
                "q_close_devigged": [0.5],
                "d_open_decimal": [2.5],
                "d_close_decimal": [2.0],
                "kelly_stake_pct": [0.01],
            }
        )
        result = compute_clv_series(df)
        expected = np.log(2.5) - np.log(2.0)
        np.testing.assert_allclose(result.clv_log[0], expected, rtol=1e-12)


# ---------------------------------------------------------------------------
# Z-score tests (2)
# ---------------------------------------------------------------------------

class TestZScore:
    def test_zero_clv_not_rejected(self):
        clv = np.zeros(100)
        result = z_score(clv)
        assert result["reject"] is False

    def test_positive_clv_can_reject(self):
        rng = np.random.default_rng(0)
        clv = rng.normal(0.05, 0.05, 200)  # strong positive mean
        result = z_score(clv)
        assert result["z"] > 0

    def test_one_sided_pvalue_correct(self):
        from scipy import stats
        rng = np.random.default_rng(7)
        clv = rng.normal(0.0, 1.0, 100)
        result = z_score(clv)
        expected = float(stats.norm.sf(result["z"]))
        np.testing.assert_allclose(result["pvalue_one_sided"], expected, rtol=1e-9)


# ---------------------------------------------------------------------------
# Hall-Mueller bootstrap Sharpe (4)
# ---------------------------------------------------------------------------

class TestHallMuellerSharpe:
    def test_returns_hm_result(self):
        rng = np.random.default_rng(0)
        clv = rng.normal(0.01, 0.1, 100)
        result = hall_mueller_sharpe(clv, n_bootstrap=500, code_sha="abc1234")
        assert isinstance(result, HMResult)

    def test_deterministic_same_sha(self):
        rng = np.random.default_rng(0)
        clv = rng.normal(0.01, 0.1, 150)
        r1 = hall_mueller_sharpe(clv, n_bootstrap=1000, code_sha="abc1234")
        r2 = hall_mueller_sharpe(clv, n_bootstrap=1000, code_sha="abc1234")
        np.testing.assert_array_equal(r1.bootstrap_distribution, r2.bootstrap_distribution)
        assert r1.decision == r2.decision

    def test_different_sha_different_result(self):
        rng = np.random.default_rng(0)
        clv = rng.normal(0.01, 0.1, 150)
        r1 = hall_mueller_sharpe(clv, n_bootstrap=500, code_sha="abc1234")
        r2 = hall_mueller_sharpe(clv, n_bootstrap=500, code_sha="xyz9876")
        # Different seeds → different bootstrap distributions
        assert not np.array_equal(r1.bootstrap_distribution, r2.bootstrap_distribution)

    def test_type_i_error_rate(self):
        """Synthetic null test: CLV ~ N(0,1) should reject at ≤ 5.5% rate."""
        rng = np.random.default_rng(99)
        n_trials = 200
        n_bets = 120
        rejects = 0
        for _ in range(n_trials):
            clv = rng.normal(0.0, 1.0, n_bets)
            r = hall_mueller_sharpe(clv, n_bootstrap=500, code_sha="test")
            if r.decision == "GENUINE_EDGE":
                rejects += 1
        type_i_rate = rejects / n_trials
        assert type_i_rate <= 0.08, f"Type I rate {type_i_rate:.3f} exceeds 8% (expected ≤5.5%)"

    def test_decision_labels(self):
        rng = np.random.default_rng(0)
        clv = rng.normal(0.0, 1.0, 50)
        r = hall_mueller_sharpe(clv, n_bootstrap=100, code_sha="x")
        assert r.decision in ("GENUINE_EDGE", "WEAK_EDGE", "NO_EDGE")

    def test_block_length_reported(self):
        clv = np.ones(150) * 0.01
        r = hall_mueller_sharpe(clv, n_bootstrap=100, code_sha="x")
        assert 4 <= r.block_length <= 12
