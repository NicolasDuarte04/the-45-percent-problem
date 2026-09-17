"""
tests/test_accuracy_metrics.py
================================
Golden-file tests for evaluation/accuracy_metrics.py
Covers: scoring rules (10), DM reference (6), Nyberg reference (6)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.accuracy_metrics import (
    DMResult,
    NybergResult,
    brier,
    check_kill_criterion,
    diebold_mariano,
    log_loss,
    nyberg_test,
    rps,
)


# ---------------------------------------------------------------------------
# Fixtures: 10 synthetic matches with known outcomes
# ---------------------------------------------------------------------------

# Perfect forecasts for H wins
_PERFECT_P = np.array([
    [1.0, 0.0, 0.0],
    [1.0, 0.0, 0.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
    [0.5, 0.3, 0.2],
    [0.4, 0.3, 0.3],
    [0.6, 0.2, 0.2],
    [0.33, 0.34, 0.33],
    [0.7, 0.2, 0.1],
    [0.2, 0.5, 0.3],
])

_OUTCOMES = np.array([0, 0, 1, 2, 0, 1, 0, 1, 0, 1])  # 0=H,1=D,2=A
_Y_OH = np.eye(3, dtype=float)[_OUTCOMES]


# ---------------------------------------------------------------------------
# Brier score tests (3)
# ---------------------------------------------------------------------------

class TestBrier:
    def test_perfect_forecast_zero(self):
        p = np.eye(3, dtype=float)[:3]  # perfect for 3 outcomes
        y = np.eye(3, dtype=float)[:3]
        scores = brier(p, y)
        np.testing.assert_allclose(scores, 0.0, atol=1e-15)

    def test_worst_forecast_value(self):
        # Predict H=1 but outcome is A: (1-0)^2 + (0-0)^2 + (0-1)^2 = 2
        p = np.array([[1.0, 0.0, 0.0]])
        y = np.array([[0.0, 0.0, 1.0]])
        assert abs(brier(p, y)[0] - 2.0) < 1e-12

    def test_hand_computed_example(self):
        # p = [0.5, 0.3, 0.2], y = [1, 0, 0]
        p = np.array([[0.5, 0.3, 0.2]])
        y = np.array([[1.0, 0.0, 0.0]])
        expected = (0.5 - 1) ** 2 + (0.3 - 0) ** 2 + (0.2 - 0) ** 2
        np.testing.assert_allclose(brier(p, y)[0], expected, rtol=1e-12)


# ---------------------------------------------------------------------------
# RPS tests (3)
# ---------------------------------------------------------------------------

class TestRPS:
    def test_perfect_h_win_forecast(self):
        p = np.array([[1.0, 0.0, 0.0]])
        y = np.array([[1.0, 0.0, 0.0]])
        np.testing.assert_allclose(rps(p, y)[0], 0.0, atol=1e-15)

    def test_worst_case_ordering_penalty(self):
        # Predict all A but outcome is H: maximum ordering penalty
        p = np.array([[0.0, 0.0, 1.0]])
        y = np.array([[1.0, 0.0, 0.0]])
        # CDF: pred=[0,0,1], actual=[1,1,1]
        # j=1: (0-1)^2=1, j=2: (0-1)^2=1 → RPS = (1+1)/2 = 1
        np.testing.assert_allclose(rps(p, y)[0], 1.0, atol=1e-12)

    def test_hand_computed_example(self):
        # p = [0.6, 0.3, 0.1], y = draw
        p = np.array([[0.6, 0.3, 0.1]])
        y = np.array([[0.0, 1.0, 0.0]])
        # cum_p=[0.6,0.9], cum_y=[0,1]
        # (0.6-0)^2 + (0.9-1)^2 = 0.36 + 0.01 = 0.37 → /2 = 0.185
        expected = ((0.6 - 0) ** 2 + (0.9 - 1.0) ** 2) / 2
        np.testing.assert_allclose(rps(p, y)[0], expected, rtol=1e-12)


# ---------------------------------------------------------------------------
# Log-loss tests (4)
# ---------------------------------------------------------------------------

class TestLogLoss:
    def test_perfect_forecast_zero(self):
        p = np.eye(3, dtype=float)[:3]
        y = np.eye(3, dtype=float)[:3]
        # With eps=1e-6, log(1.0) = 0
        np.testing.assert_allclose(log_loss(p, y), 0.0, atol=1e-12)

    def test_wrong_confident_large_loss(self):
        p = np.array([[1.0, 0.0, 0.0]])
        y = np.array([[0.0, 1.0, 0.0]])
        # LL = -log(eps) for probability = 0.0 (clipped to 1e-6)
        expected = -np.log(1e-6)
        np.testing.assert_allclose(log_loss(p, y)[0], expected, rtol=1e-9)

    def test_uniform_forecast_value(self):
        p = np.array([[1 / 3, 1 / 3, 1 / 3]])
        y = np.array([[1.0, 0.0, 0.0]])
        expected = -np.log(1 / 3)
        np.testing.assert_allclose(log_loss(p, y)[0], expected, rtol=1e-12)

    def test_eps_clipping(self):
        p = np.array([[0.0, 0.5, 0.5]])
        y = np.array([[1.0, 0.0, 0.0]])
        # LL = -log(clip(0.0, 1e-6)) = -log(1e-6)
        expected = -np.log(1e-6)
        np.testing.assert_allclose(log_loss(p, y)[0], expected, rtol=1e-9)


# ---------------------------------------------------------------------------
# Diebold-Mariano tests (6)
# ---------------------------------------------------------------------------

class TestDieboldMariano:
    def _synthetic_losses(self, n=104, seed=0):
        rng = np.random.default_rng(seed)
        loss_a = rng.uniform(0, 1, n)
        loss_b = rng.uniform(0, 1, n)
        return loss_a, loss_b

    def test_returns_dm_result_type(self):
        la, lb = self._synthetic_losses()
        result = diebold_mariano(la, lb)
        assert isinstance(result, DMResult)

    def test_hln_correction_applied_by_default(self):
        la, lb = self._synthetic_losses()
        result = diebold_mariano(la, lb, hln_correction=True)
        assert result.hln_applied is True

    def test_bandwidth_is_floor_n_cuberoot(self):
        la, lb = self._synthetic_losses(n=104)
        result = diebold_mariano(la, lb)
        assert result.bandwidth == int(np.floor(104 ** (1.0 / 3.0)))  # = 4

    def test_equal_losses_near_zero_stat(self):
        la = np.ones(100) * 0.3
        lb = np.ones(100) * 0.3
        result = diebold_mariano(la, lb)
        assert abs(result.dm_stat) < 1e-9

    def test_large_advantage_rejects(self):
        rng = np.random.default_rng(1)
        # A is clearly better (lower loss)
        la = rng.uniform(0, 0.1, 200)
        lb = rng.uniform(0.5, 1.0, 200)
        result = diebold_mariano(la, lb)
        assert result.pvalue < 0.01

    def test_length_mismatch_raises(self):
        with pytest.raises(ValueError):
            diebold_mariano(np.ones(10), np.ones(11))


# ---------------------------------------------------------------------------
# Nyberg test (6)
# ---------------------------------------------------------------------------

class TestNyberg:
    def _synthetic_data(self, n=100, seed=42, has_model_info=True):
        rng = np.random.default_rng(seed)
        # Market closing probs (well-calibrated)
        q_close = rng.dirichlet([3, 2, 1.5], size=n)
        # Model probs: same as market if no info, slightly different if has info
        if has_model_info:
            noise = rng.dirichlet([2, 2, 2], size=n) * 0.2
            p_model = (q_close * 0.8 + noise)
            p_model /= p_model.sum(axis=1, keepdims=True)
        else:
            p_model = q_close.copy()
        # Simulate outcomes from q_close
        y = np.array([rng.choice(3, p=q_close[i]) for i in range(n)])
        return p_model, q_close, y

    def test_returns_nyberg_result_type(self):
        p, q, y = self._synthetic_data(has_model_info=False)
        result = nyberg_test(p, q, y, model_id="M0")
        assert isinstance(result, NybergResult)

    def test_df_is_2(self):
        p, q, y = self._synthetic_data()
        result = nyberg_test(p, q, y)
        assert result.df == 2

    def test_lr_stat_non_negative(self):
        p, q, y = self._synthetic_data()
        result = nyberg_test(p, q, y)
        assert result.lr_stat >= 0.0

    def test_pvalue_in_unit_interval(self):
        p, q, y = self._synthetic_data()
        result = nyberg_test(p, q, y)
        assert 0.0 <= result.pvalue <= 1.0

    def test_identical_model_market_low_lr(self):
        p, q, y = self._synthetic_data(has_model_info=False)
        result = nyberg_test(p, q, y)
        # When model = market, LR should be small
        assert result.lr_stat < 10.0

    def test_coefficients_populated(self):
        p, q, y = self._synthetic_data()
        result = nyberg_test(p, q, y)
        assert len(result.coefficients) == 2
        assert result.coefficients[0].equation == "H"
        assert result.coefficients[1].equation == "A"


# ---------------------------------------------------------------------------
# Kill criterion (2)
# ---------------------------------------------------------------------------

class TestKillCriterion:
    def test_not_tripped_equal_models(self):
        rng = np.random.default_rng(0)
        ll = rng.uniform(0.8, 1.2, 50)
        tripped, _ = check_kill_criterion(ll, ll)
        assert not tripped

    def test_tripped_when_mstar_much_worse(self):
        ll_m0 = np.ones(100) * 0.9
        ll_mstar = np.ones(100) * 1.5  # much worse
        tripped, detail = check_kill_criterion(ll_mstar, ll_m0)
        assert tripped
        assert "tripped=True" in detail
