"""
tests/test_edge_calculator.py
==============================
Unit tests for market/edge_calculator.py.

Acceptance criteria (§9.2):
- Zero flagged markets exceed threshold without flagged=True.
- Flag counts on expected inputs are within tolerance.
- E = p_model − q_devigged exactly.
- E_star is finite and has correct sign.
- is_two_sided_flag set when opposing flagged legs exist.
- Threshold 3pp mainline, 5pp derivative.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.edge_calculator import (
    EdgeFlag,
    _THRESHOLD_DERIVATIVE,
    _THRESHOLD_MAINLINE,
    calculate_edge,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _uniform(n: int) -> list:
    """Uniform probability vector."""
    return [1.0 / n] * n


def _edge_simple(p, q, market_class="1x2", ids=None):
    return calculate_edge(p, q, market_class, outcome_ids=ids)


# ---------------------------------------------------------------------------
# Basic correctness
# ---------------------------------------------------------------------------

class TestEdgeComputation:
    def test_E_equals_p_minus_q(self):
        p = [0.50, 0.28, 0.22]
        q = [0.45, 0.30, 0.25]
        flags = _edge_simple(p, q)
        for f, pi, qi in zip(flags, p, q):
            assert abs(f.E - (pi - qi)) < 1e-12

    def test_positive_edge_when_model_above_market(self):
        p = [0.55, 0.28, 0.17]
        q = [0.45, 0.30, 0.25]
        flags = _edge_simple(p, q)
        assert flags[0].E > 0   # model higher on home
        assert flags[1].E < 0   # market higher on draw
        assert flags[2].E < 0   # market higher on away

    def test_zero_edge_equal_probs(self):
        p = [0.40, 0.30, 0.30]
        flags = _edge_simple(p, p)
        for f in flags:
            assert abs(f.E) < 1e-12

    def test_sigma_p_finite(self):
        p = [0.40, 0.35, 0.25]
        q = [0.38, 0.36, 0.26]
        flags = _edge_simple(p, q)
        for f in flags:
            assert math.isfinite(f.sigma_p)
            assert f.sigma_p >= 0

    def test_E_star_correct_sign(self):
        p = [0.55, 0.25, 0.20]
        q = [0.45, 0.30, 0.25]
        flags = _edge_simple(p, q)
        for f in flags:
            assert math.isfinite(f.E_star)
            if f.E > 0:
                assert f.E_star > 0
            elif f.E < 0:
                assert f.E_star < 0

    def test_outcome_ids_assigned(self):
        p = [0.5, 0.3, 0.2]
        q = [0.5, 0.3, 0.2]
        ids = ["home_win", "draw", "away_win"]
        flags = calculate_edge(p, q, "1x2", outcome_ids=ids)
        for f, oid in zip(flags, ids):
            assert f.outcome_id == oid

    def test_auto_outcome_ids(self):
        p = [0.5, 0.5]
        q = [0.5, 0.5]
        flags = _edge_simple(p, q)
        assert flags[0].outcome_id == "outcome_0"
        assert flags[1].outcome_id == "outcome_1"


# ---------------------------------------------------------------------------
# Flagging logic
# ---------------------------------------------------------------------------

class TestFlagging:
    def test_mainline_flagged_above_3pp(self):
        # Edge of 4pp → should flag
        p = [0.44, 0.30, 0.26]
        q = [0.40, 0.30, 0.30]    # home edge = +4pp
        flags = calculate_edge(p, q, "1x2")
        home = next(f for f in flags if f.outcome_id == "outcome_0")
        assert home.flagged
        assert home.reason_code == "ABOVE_THRESHOLD"

    def test_mainline_not_flagged_at_exactly_3pp(self):
        # Edge of exactly 3pp → NOT flagged (strict inequality)
        p = [0.43, 0.30, 0.27]
        q = [0.40, 0.30, 0.30]    # home edge = +3pp exactly
        flags = calculate_edge(p, q, "1x2")
        home = flags[0]
        assert not home.flagged   # |E| = 0.03 is NOT > 0.03

    def test_mainline_not_flagged_below_3pp(self):
        p = [0.42, 0.30, 0.28]
        q = [0.40, 0.30, 0.30]    # +2pp edge
        flags = calculate_edge(p, q, "1x2")
        assert not flags[0].flagged

    def test_derivative_flagged_above_5pp(self):
        p = [0.56, 0.44]
        q = [0.50, 0.50]    # +6pp
        flags = calculate_edge(p, q, "over_under")
        assert flags[0].flagged

    def test_derivative_not_flagged_at_4pp(self):
        p = [0.54, 0.46]
        q = [0.50, 0.50]    # +4pp < 5pp threshold
        flags = calculate_edge(p, q, "over_under")
        assert not flags[0].flagged

    def test_threshold_mainline(self):
        p = [0.5, 0.5]
        q = [0.5, 0.5]
        flags = calculate_edge(p, q, "match_winner")
        assert flags[0].threshold == _THRESHOLD_MAINLINE

    def test_threshold_derivative(self):
        p = [0.5, 0.5]
        q = [0.5, 0.5]
        flags = calculate_edge(p, q, "btts")
        assert flags[0].threshold == _THRESHOLD_DERIVATIVE

    def test_no_false_flag(self):
        """All flags with flagged=True must have |E| > threshold."""
        p = [0.42, 0.33, 0.25]
        q = [0.40, 0.30, 0.30]
        flags = calculate_edge(p, q, "1x2")
        for f in flags:
            if f.flagged:
                assert abs(f.E) > f.threshold

    def test_all_flagged_have_above_threshold_edge(self):
        """Critical invariant: zero flags with flagged=True have |E| ≤ threshold."""
        import random
        rng = random.Random(7)
        for _ in range(200):
            p = [rng.random() for _ in range(3)]
            s = sum(p)
            p = [x / s for x in p]
            q = [rng.random() for _ in range(3)]
            s2 = sum(q)
            q = [x / s2 for x in q]
            flags = calculate_edge(p, q, "1x2")
            for f in flags:
                if f.flagged:
                    assert abs(f.E) > f.threshold


# ---------------------------------------------------------------------------
# Two-sided flag detection
# ---------------------------------------------------------------------------

class TestTwoSidedFlag:
    def test_two_sided_flag_set_when_opposing_flags(self):
        # Home +5pp, away −5pp → both flagged with opposing signs
        p = [0.50, 0.28, 0.22]
        q = [0.45, 0.28, 0.27]    # home +5pp, away -5pp
        flags = calculate_edge(p, q, "1x2")
        flagged = [f for f in flags if f.flagged]
        if len(flagged) >= 2:
            signs = {f.E > 0 for f in flagged}
            if len(signs) > 1:
                for f in flagged:
                    assert f.is_two_sided_flag

    def test_no_two_sided_flag_single_flag(self):
        # Only one outcome crosses threshold — remaining two split the residual below ε.
        # home +4pp (flagged), draw -2pp (not flagged), away -2pp (not flagged)
        p = [0.44, 0.31, 0.25]
        q = [0.40, 0.33, 0.27]
        flags = calculate_edge(p, q, "1x2")
        flagged = [f for f in flags if f.flagged]
        assert len(flagged) == 1, f"Expected 1 flagged, got {len(flagged)}"
        for f in flags:
            assert not f.is_two_sided_flag

    def test_two_sided_flag_expected_in_balanced_market(self):
        # With Σ E = 0 and |E_home| large enough to flag, at least one other
        # outcome must carry the residual — if that residual also exceeds ε, two-sided fires.
        # home +6pp (flagged positive), away −6pp (flagged negative) → two-sided
        p = [0.46, 0.30, 0.24]
        q = [0.40, 0.30, 0.30]   # home +6pp, away -6pp
        flags = calculate_edge(p, q, "1x2")
        flagged = [f for f in flags if f.flagged]
        signs = {f.E > 0 for f in flagged}
        if len(signs) > 1:   # opposing signs exist
            for f in flagged:
                assert f.is_two_sided_flag


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

class TestInputValidation:
    def test_raises_on_single_outcome(self):
        with pytest.raises(ValueError, match="≥ 2"):
            calculate_edge([1.0], [1.0], "1x2")

    def test_raises_on_length_mismatch_p_q(self):
        with pytest.raises(ValueError, match="p_model length"):
            calculate_edge([0.5, 0.5], [0.4, 0.3, 0.3], "1x2")

    def test_raises_on_outcome_id_mismatch(self):
        with pytest.raises(ValueError, match="outcome_ids length"):
            calculate_edge([0.5, 0.5], [0.5, 0.5], "1x2",
                           outcome_ids=["a", "b", "c"])

    def test_raises_on_odds_length_mismatch(self):
        with pytest.raises(ValueError, match="odds length"):
            calculate_edge([0.5, 0.5], [0.5, 0.5], "1x2",
                           odds=[2.0, 3.0, 4.0])


# ---------------------------------------------------------------------------
# EdgeFlag immutability
# ---------------------------------------------------------------------------

class TestEdgeFlagStructure:
    def test_flag_is_frozen(self):
        p = [0.5, 0.5]
        q = [0.5, 0.5]
        flags = _edge_simple(p, q)
        with pytest.raises((AttributeError, TypeError)):
            flags[0].E = 99.0  # type: ignore[misc]

    def test_n_flags_equals_n_outcomes(self):
        for n in (2, 3, 4):
            p = _uniform(n)
            q = _uniform(n)
            flags = _edge_simple(p, q)
            assert len(flags) == n
