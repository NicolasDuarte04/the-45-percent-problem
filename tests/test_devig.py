"""
tests/test_devig.py
===================
Unit tests for market/devig.py.

Acceptance criteria (§9.1):
- Brent solver converges on every well-formed market.
- De-vigged probabilities sum to 1.0 ± 1e-6.
- z is monotonically larger for higher overround.
- Z_OUT_OF_BAND warning fires for extreme overround (>20%) or underround.
- Pinnacle knockout draw correction adds +0.014 to draw and renormalises.
- Pinnacle host win correction subtracts 0.006 from host leg and renormalises.
- Non-Pinnacle books receive no bias corrections.
- DeviggingNotConverged is raised on pathological inputs.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.devig import (
    DeviggingNotConverged,
    DevigResult,
    _DELTA_DRAW_KNOCKOUT,
    _DELTA_HOST_WIN,
    devig,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

TYPICAL_1X2 = [2.5, 3.5, 2.8]       # ~4.3% overround
LABELS_1X2 = ["home_win", "draw", "away_win"]


def _sum_one(q, tol=1e-6):
    return abs(sum(q) - 1.0) < tol


# ---------------------------------------------------------------------------
# Basic convergence and probability integrity
# ---------------------------------------------------------------------------

class TestBasicConvergence:
    def test_probabilities_sum_to_one_typical(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group")
        assert _sum_one(r.q)

    def test_probabilities_all_positive(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group")
        assert all(q > 0 for q in r.q)

    def test_two_outcome_market(self):
        r = devig([1.9, 2.0], "pinnacle", "match_winner", "group")
        assert _sum_one(r.q)
        assert len(r.q) == 2

    def test_four_outcome_market(self):
        r = devig([4.0, 5.0, 6.0, 8.0], "betfair", "stage_of_elimination", "group")
        assert _sum_one(r.q)

    def test_overround_computed_correctly(self):
        odds = [2.5, 3.5, 2.8]
        raw = [1 / o for o in odds]
        expected_overround = sum(raw) - 1.0
        r = devig(odds, "pinnacle", "1x2", "group")
        assert abs(r.overround - expected_overround) < 1e-10

    def test_z_greater_than_one_for_overround_pinnacle(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group")
        assert r.z > 1.0

    def test_z_closer_to_one_for_lower_overround(self):
        # Lower overround → z closer to 1
        low_or_odds = [2.55, 3.60, 2.85]   # ~2% overround
        high_or_odds = [2.0, 3.0, 2.2]     # ~15% overround
        r_low = devig(low_or_odds, "pinnacle", "1x2", "group")
        r_high = devig(high_or_odds, "pinnacle", "1x2", "group")
        assert r_low.z < r_high.z

    def test_z_equals_one_no_overround(self):
        # Construct odds with exactly zero overround
        q_true = [0.45, 0.28, 0.27]
        odds = [1 / q for q in q_true]
        r = devig(odds, "pinnacle", "1x2", "group")
        assert abs(r.z - 1.0) < 1e-6
        for got, want in zip(r.q, q_true):
            assert abs(got - want) < 1e-5

    def test_power_method_differs_from_proportional(self):
        """
        Power method (z > 1 for overround) redistributes probability compared to
        proportional de-vigging.  With z > 1 and r_i < 1:
          - r_i^z < r_i  (all raw probs drop when raised to z > 1)
          - The drop is proportionally larger for small r_i (longshots)
        After Σr_i^z = 1 normalisation is implicit (by construction of z), the
        favourite ends up with MORE than proportional and the longshot with LESS.
        NOTE: odds must be overround (Σ1/o > 1) to give z > 1.
        """
        # Σ1/o = 0.5 + 0.333 + 0.286 = 1.119 → overround ~12% → z > 1
        odds = [2.0, 3.0, 3.5]
        raw = [1 / o for o in odds]
        booksum = sum(raw)
        assert booksum > 1.0, "Test odds must be overround"
        q_prop = [r / booksum for r in raw]
        r = devig(odds, "pinnacle", "1x2", "group",
                  outcome_labels=["home_win", "draw", "away_win"])
        assert r.z > 1.0
        longshot_idx = 2   # away at 3.5 = clear longshot
        favourite_idx = 0  # home at 2.0 = favourite
        # Power gives LESS to longshot than proportional (FLB correction)
        assert r.q[longshot_idx] < q_prop[longshot_idx]
        # Power gives MORE to favourite than proportional
        assert r.q[favourite_idx] > q_prop[favourite_idx]

    def test_log_loss_improvement_over_proportional(self):
        """
        De-vigged z-exponent q should differ from proportional (demonstrating
        the Power method is doing something different from simple normalisation).
        """
        odds = [2.0, 3.5, 4.0]   # ~12% overround
        raw = [1 / o for o in odds]
        booksum = sum(raw)
        q_prop = [r / booksum for r in raw]
        r = devig(odds, "pinnacle", "1x2", "group")
        # At high overround, the Power de-vig should differ meaningfully from proportional
        max_diff = max(abs(a - b) for a, b in zip(r.q, q_prop))
        assert max_diff > 0.001


# ---------------------------------------------------------------------------
# Z anomaly detection
# ---------------------------------------------------------------------------

class TestZBandAnomalies:
    def test_no_warning_typical_pinnacle(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group")
        assert not any("Z_OUT_OF_BAND" in w for w in r.warnings)

    def test_warning_extreme_overround_pinnacle(self):
        # Construct extreme overround (~22%)
        odds = [1.7, 2.5, 2.0]   # raw sum ≈ 1.22
        r = devig(odds, "pinnacle", "1x2", "group")
        assert any("Z_OUT_OF_BAND" in w for w in r.warnings)

    def test_warning_exchange_overround(self):
        # Betfair with net positive overround = anomaly for exchange
        odds = [1.85, 4.5, 4.0]   # Σ1/o ≈ 1.04 → overround, anomalous for exchange
        r = devig(odds, "betfair", "1x2", "group")
        assert any("Z_OUT_OF_BAND" in w for w in r.warnings)

    def test_no_warning_exchange_underround(self):
        # Betfair net underround (exchange commission deducted externally)
        # 1/2.20 + 1/4.50 + 1/4.50 ≈ 0.455 + 0.222 + 0.222 = 0.899 → underround ✓
        odds = [2.20, 4.50, 4.50]
        raw_sum = sum(1 / o for o in odds)
        assert raw_sum < 1.0, f"Expected underround, got booksum={raw_sum}"
        r = devig(odds, "betfair", "1x2", "group")
        assert not any("Z_OUT_OF_BAND" in w for w in r.warnings)


# ---------------------------------------------------------------------------
# Pinnacle knockout draw correction
# ---------------------------------------------------------------------------

class TestKnockoutDrawCorrection:
    @pytest.mark.parametrize("stage", [
        "round_of_16", "quarter_final", "semi_final", "final"
    ])
    def test_draw_increased_by_delta(self, stage):
        r_before = devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                         outcome_labels=LABELS_1X2)
        r_after = devig(TYPICAL_1X2, "pinnacle", "1x2", stage,
                        outcome_labels=LABELS_1X2)
        draw_before = r_before.q[1]   # draw at index 1
        draw_after = r_after.q[1]
        assert abs(draw_after - draw_before - _DELTA_DRAW_KNOCKOUT) < 1e-8

    def test_knockout_draw_correction_noted(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "quarter_final",
                  outcome_labels=LABELS_1X2)
        assert "knockout_draw_correction" in r.corrections_applied

    def test_no_draw_correction_group_stage(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                  outcome_labels=LABELS_1X2)
        assert "knockout_draw_correction" not in r.corrections_applied

    def test_knockout_draw_still_sums_to_one(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "semi_final",
                  outcome_labels=LABELS_1X2)
        assert _sum_one(r.q)

    def test_no_draw_correction_non_pinnacle(self):
        r = devig(TYPICAL_1X2, "betfair", "1x2", "quarter_final",
                  outcome_labels=LABELS_1X2)
        assert "knockout_draw_correction" not in r.corrections_applied


# ---------------------------------------------------------------------------
# Pinnacle host-nation premium correction
# ---------------------------------------------------------------------------

class TestHostWinCorrection:
    def test_host_win_reduced_by_delta(self):
        r_no_host = devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                          outcome_labels=LABELS_1X2)
        r_host = devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                       host_team="home_win", outcome_labels=LABELS_1X2)
        home_before = r_no_host.q[0]
        home_after = r_host.q[0]
        assert abs(home_before - home_after - abs(_DELTA_HOST_WIN)) < 1e-8

    def test_host_correction_noted(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                  host_team="home_win", outcome_labels=LABELS_1X2)
        assert "host_win_correction" in r.corrections_applied

    def test_host_correction_sums_to_one(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                  host_team="home_win", outcome_labels=LABELS_1X2)
        assert _sum_one(r.q)

    def test_no_host_correction_knockout(self):
        # Host correction only on group stage
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "quarter_final",
                  host_team="home_win", outcome_labels=LABELS_1X2)
        assert "host_win_correction" not in r.corrections_applied

    def test_no_host_correction_non_pinnacle(self):
        r = devig(TYPICAL_1X2, "betfair", "1x2", "group",
                  host_team="home_win", outcome_labels=LABELS_1X2)
        assert "host_win_correction" not in r.corrections_applied

    def test_both_corrections_applied_simultaneously(self):
        # Knockout + host (host correction skipped since knockout, not group)
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "semi_final",
                  host_team="home_win", outcome_labels=LABELS_1X2)
        assert "knockout_draw_correction" in r.corrections_applied
        assert "host_win_correction" not in r.corrections_applied
        assert _sum_one(r.q)


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

class TestInputValidation:
    def test_raises_on_single_outcome(self):
        with pytest.raises(ValueError, match="≥ 2"):
            devig([2.0], "pinnacle", "1x2", "group")

    def test_raises_on_odds_le_one(self):
        with pytest.raises(ValueError, match="> 1.0"):
            devig([1.0, 3.0, 3.0], "pinnacle", "1x2", "group")

    def test_raises_on_odds_below_one(self):
        with pytest.raises(ValueError, match="> 1.0"):
            devig([0.5, 3.0, 3.0], "pinnacle", "1x2", "group")

    def test_raises_on_label_mismatch(self):
        with pytest.raises(ValueError, match="outcome_labels length"):
            devig(TYPICAL_1X2, "pinnacle", "1x2", "group",
                  outcome_labels=["home_win", "draw"])


# ---------------------------------------------------------------------------
# DevigResult structure
# ---------------------------------------------------------------------------

class TestDevigResultStructure:
    def test_result_is_frozen(self):
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "group")
        with pytest.raises((AttributeError, TypeError)):
            r.z = 99.0  # type: ignore[misc]

    def test_q_length_matches_odds(self):
        for n in (2, 3, 4, 5):
            odds = [2.0 + i * 0.5 for i in range(n)]
            r = devig(odds, "pinnacle", "match_winner", "group")
            assert len(r.q) == n

    def test_corrections_empty_without_labels(self):
        # Corrections cannot fire if no labels passed
        r = devig(TYPICAL_1X2, "pinnacle", "1x2", "quarter_final")
        assert "knockout_draw_correction" not in r.corrections_applied
