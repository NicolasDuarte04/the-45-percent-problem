"""
tests/test_kelly_sizer.py
==========================
Unit + Hypothesis property tests for market/kelly_sizer.py.

Acceptance criteria (§9.4):
- Zero stake on negative edge.
- Monotone increase in stake with edge.
- Never exceeds class cap.
- HALVED mode entered exactly when bankroll < 80% of peak.
- HALVED mode exited exactly when bankroll ≥ 90% of peak.
- peak_bankroll never re-anchored on partial recovery.
- STOPPED mode on second 20% drawdown while HALVED.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from hypothesis import assume, given, settings
from hypothesis import strategies as st

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.kelly_sizer import (
    BankrollMode,
    BankrollState,
    SizingDecision,
    _CAP_LONGSHOT,
    _CAP_MAINLINE,
    _DRAWDOWN_TRIGGER,
    _KELLY_FRACTION_LONGSHOT,
    _KELLY_FRACTION_MAINLINE,
    _LONGSHOT_THRESHOLD,
    _RECOVERY_TARGET,
    size_bet,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normal_state(current=1000.0, peak=1000.0) -> BankrollState:
    return BankrollState(current_bankroll=current, peak_bankroll=peak,
                         mode=BankrollMode.NORMAL)


def _halved_state(current=790.0, peak=1000.0, episodes=1) -> BankrollState:
    return BankrollState(current_bankroll=current, peak_bankroll=peak,
                         mode=BankrollMode.HALVED, halved_episodes=episodes)


def _stopped_state(current=750.0, peak=1000.0) -> BankrollState:
    return BankrollState(current_bankroll=current, peak_bankroll=peak,
                         mode=BankrollMode.STOPPED, halved_episodes=2)


# ---------------------------------------------------------------------------
# Basic sizing correctness
# ---------------------------------------------------------------------------

class TestBasicSizing:
    def test_positive_edge_gives_positive_stake(self):
        state = _normal_state()
        result = size_bet(edge=0.05, q_devigged=0.40, decimal_odds=2.6, bankroll_state=state)
        assert result.f_final > 0

    def test_zero_edge_gives_zero_stake(self):
        state = _normal_state()
        # edge = p - q = 0, so p = q, p*o - 1 = q*o - 1 = 1/o * o - 1 = 0
        q = 0.40
        o = 1 / q   # fair odds
        result = size_bet(edge=0.0, q_devigged=q, decimal_odds=o, bankroll_state=state)
        assert result.f_final == 0.0

    def test_negative_edge_gives_zero_stake(self):
        state = _normal_state()
        result = size_bet(edge=-0.05, q_devigged=0.50, decimal_odds=2.1, bankroll_state=state)
        assert result.f_final == 0.0

    def test_f_full_matches_kelly_formula(self):
        state = _normal_state()
        q = 0.40
        edge = 0.06
        p = q + edge
        o = 2.6
        expected_f_full = (p * o - 1) / (o - 1)
        result = size_bet(edge=edge, q_devigged=q, decimal_odds=o, bankroll_state=state)
        assert abs(result.f_full - expected_f_full) < 1e-10

    def test_mainline_kelly_fraction(self):
        state = _normal_state()
        q = 0.40   # mainline: q >= 10%
        result = size_bet(edge=0.05, q_devigged=q, decimal_odds=2.6, bankroll_state=state)
        o = 2.6
        p = q + 0.05
        f_full = (p * o - 1) / (o - 1)
        assert abs(result.f_fractional - _KELLY_FRACTION_MAINLINE * f_full) < 1e-10

    def test_longshot_kelly_fraction(self):
        state = _normal_state()
        q = 0.05   # longshot: q < 10%
        result = size_bet(edge=0.02, q_devigged=q, decimal_odds=20.0, bankroll_state=state)
        o = 20.0
        p = q + 0.02
        f_full = (p * o - 1) / (o - 1)
        assert abs(result.f_fractional - _KELLY_FRACTION_LONGSHOT * f_full) < 1e-10


# ---------------------------------------------------------------------------
# Per-market caps
# ---------------------------------------------------------------------------

class TestCaps:
    def test_mainline_capped_at_5pct(self):
        state = _normal_state()
        # Huge edge → would exceed 5% without cap
        result = size_bet(edge=0.30, q_devigged=0.50, decimal_odds=2.1, bankroll_state=state)
        assert result.f_capped <= _CAP_MAINLINE + 1e-10

    def test_longshot_capped_at_2pt5pct(self):
        state = _normal_state()
        result = size_bet(edge=0.05, q_devigged=0.05, decimal_odds=20.0, bankroll_state=state)
        assert result.f_capped <= _CAP_LONGSHOT + 1e-10

    def test_mainline_cap_label_applied(self):
        state = _normal_state()
        result = size_bet(edge=0.30, q_devigged=0.50, decimal_odds=2.1, bankroll_state=state)
        assert any("per_market_cap" in c for c in result.applied_caps)

    def test_no_cap_label_when_under_cap(self):
        state = _normal_state()
        # Tiny edge → f_fractional well under 5%
        result = size_bet(edge=0.03, q_devigged=0.40, decimal_odds=2.6, bankroll_state=state)
        assert not any("per_market_cap" in c for c in result.applied_caps)


# ---------------------------------------------------------------------------
# Longshot threshold uses q_devigged NOT p_model
# ---------------------------------------------------------------------------

class TestLongshotThreshold:
    def test_bucket_determined_by_q_not_p(self):
        # q = 0.08 (longshot), edge = 0.05 → p = 0.13 (would be mainline if using p)
        state = _normal_state()
        r = size_bet(edge=0.05, q_devigged=0.08, decimal_odds=13.0, bankroll_state=state)
        assert "longshot" in " ".join(r.applied_caps)

    def test_exactly_at_threshold_is_longshot(self):
        # q = 0.099 < 0.10 → longshot
        state = _normal_state()
        r = size_bet(edge=0.02, q_devigged=0.099, decimal_odds=10.5, bankroll_state=state)
        assert r.f_capped <= _CAP_LONGSHOT + 1e-10

    def test_at_threshold_is_mainline(self):
        # q = 0.10 → mainline (boundary belongs to mainline)
        state = _normal_state()
        r = size_bet(edge=0.02, q_devigged=0.10, decimal_odds=10.5, bankroll_state=state)
        assert "mainline" in " ".join(r.applied_caps)


# ---------------------------------------------------------------------------
# Drawdown stop: HALVED mode logic
# ---------------------------------------------------------------------------

class TestHalvedMode:
    def test_normal_mode_below_80pct_triggers_halved(self):
        # bankroll at 79% of peak → update_mode should return HALVED
        state = BankrollState(current_bankroll=790.0, peak_bankroll=1000.0,
                              mode=BankrollMode.NORMAL)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.HALVED

    def test_normal_mode_at_80pct_stays_normal(self):
        state = BankrollState(current_bankroll=800.0, peak_bankroll=1000.0,
                              mode=BankrollMode.NORMAL)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.NORMAL

    def test_halved_mode_halves_stake(self):
        state_normal = _normal_state(900.0, 1000.0)  # 90% — still normal
        # First HALVED episode at 79% → stays HALVED (episodes=1, not STOPPED)
        state_halved = BankrollState(current_bankroll=790.0, peak_bankroll=1000.0,
                                     mode=BankrollMode.HALVED, halved_episodes=1)

        r_normal = size_bet(0.05, 0.40, 2.5, state_normal)
        r_halved = size_bet(0.05, 0.40, 2.5, state_halved)

        assert r_halved.mode == BankrollMode.HALVED
        assert abs(r_halved.f_final - r_normal.f_capped * 0.5) < 1e-10

    def test_halved_exits_at_90pct(self):
        state = BankrollState(current_bankroll=900.0, peak_bankroll=1000.0,
                              mode=BankrollMode.HALVED)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.NORMAL

    def test_halved_does_not_exit_at_89pct(self):
        state = BankrollState(current_bankroll=889.0, peak_bankroll=1000.0,
                              mode=BankrollMode.HALVED)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.HALVED

    def test_peak_not_reanchored_on_partial_recovery(self):
        # Recover from 75% → 88%, but peak stays at 1000 (not re-anchored to 880)
        state = BankrollState(current_bankroll=880.0, peak_bankroll=1000.0,
                              mode=BankrollMode.HALVED)
        updated = state.update_mode()
        assert updated.peak_bankroll == 1000.0   # never re-anchored


# ---------------------------------------------------------------------------
# STOPPED mode logic
# ---------------------------------------------------------------------------

class TestStoppedMode:
    def test_second_drawdown_from_halved_triggers_stopped(self):
        # Second HALVED episode (halved_episodes=2) still below 80% → STOPPED
        # (First episode recovered to 90%, dropped again, now on episode 2)
        state = BankrollState(current_bankroll=750.0, peak_bankroll=1000.0,
                              mode=BankrollMode.HALVED, halved_episodes=2)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.STOPPED

    def test_stopped_gives_zero_stake(self):
        state = _stopped_state()
        result = size_bet(0.10, 0.40, 2.5, state)
        assert result.f_final == 0.0
        assert result.mode == BankrollMode.STOPPED

    def test_stopped_exits_at_90pct(self):
        state = BankrollState(current_bankroll=900.0, peak_bankroll=1000.0,
                              mode=BankrollMode.STOPPED)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.NORMAL

    def test_stopped_does_not_exit_at_89pct(self):
        state = BankrollState(current_bankroll=889.0, peak_bankroll=1000.0,
                              mode=BankrollMode.STOPPED)
        updated = state.update_mode()
        assert updated.mode == BankrollMode.STOPPED


# ---------------------------------------------------------------------------
# Hypothesis property-based tests
# ---------------------------------------------------------------------------

@st.composite
def valid_bankroll_state(draw, mode=BankrollMode.NORMAL):
    peak = draw(st.floats(min_value=100.0, max_value=1e6, allow_nan=False, allow_infinity=False))
    if mode == BankrollMode.NORMAL:
        # current ∈ [80%..100%] of peak for NORMAL mode
        frac = draw(st.floats(min_value=0.80, max_value=1.0))
    elif mode == BankrollMode.HALVED:
        frac = draw(st.floats(min_value=0.60, max_value=0.799))
    else:
        frac = draw(st.floats(min_value=0.60, max_value=0.799))
    current = peak * frac
    return BankrollState(current_bankroll=current, peak_bankroll=peak, mode=mode)


@settings(max_examples=300, deadline=2000)
@given(
    edge=st.floats(min_value=0.001, max_value=0.30, allow_nan=False),
    q=st.floats(min_value=0.05, max_value=0.90, allow_nan=False),
    odds=st.floats(min_value=1.05, max_value=30.0, allow_nan=False),
    state=valid_bankroll_state(mode=BankrollMode.NORMAL),
)
def test_zero_stake_on_non_positive_edge(edge, q, odds, state):
    """f_final must be 0 when the Kelly formula gives ≤ 0."""
    p = q + edge
    assume(p <= 1.0)
    f_full = (p * odds - 1) / (odds - 1)
    result = size_bet(edge, q, odds, state)
    if f_full <= 0:
        assert result.f_final == 0.0


@settings(max_examples=300, deadline=2000)
@given(
    q=st.floats(min_value=0.15, max_value=0.80, allow_nan=False),
    edge1=st.floats(min_value=0.03, max_value=0.10, allow_nan=False),
    edge2=st.floats(min_value=0.11, max_value=0.20, allow_nan=False),
    odds=st.floats(min_value=1.1, max_value=8.0, allow_nan=False),
    state=valid_bankroll_state(mode=BankrollMode.NORMAL),
)
def test_monotone_stake_with_edge(q, edge1, edge2, odds, state):
    """Higher edge (all else equal) must yield stake ≥ lower edge."""
    assume(q + edge2 <= 1.0)
    assume(q + edge1 <= 1.0)
    r1 = size_bet(edge1, q, odds, state)
    r2 = size_bet(edge2, q, odds, state)
    assert r2.f_final >= r1.f_final - 1e-10


@settings(max_examples=300, deadline=2000)
@given(
    edge=st.floats(min_value=0.001, max_value=0.30, allow_nan=False),
    q=st.floats(min_value=0.05, max_value=0.90, allow_nan=False),
    odds=st.floats(min_value=1.05, max_value=30.0, allow_nan=False),
    state=valid_bankroll_state(mode=BankrollMode.NORMAL),
)
def test_never_exceeds_class_cap(edge, q, odds, state):
    """f_capped must never exceed the hard cap for the bucket."""
    assume(q + edge <= 1.0)
    result = size_bet(edge, q, odds, state)
    expected_cap = _CAP_LONGSHOT if q < _LONGSHOT_THRESHOLD else _CAP_MAINLINE
    assert result.f_capped <= expected_cap + 1e-10


@settings(max_examples=200, deadline=2000)
@given(
    current=st.floats(min_value=0.01, max_value=0.799, allow_nan=False),
)
def test_halved_mode_entered_exactly_at_80pct(current):
    """NORMAL → HALVED transition fires exactly when current < 80% of peak."""
    peak = 1000.0
    state = BankrollState(current_bankroll=current * peak, peak_bankroll=peak,
                          mode=BankrollMode.NORMAL, halved_episodes=0)
    updated = state.update_mode()
    assert updated.mode == BankrollMode.HALVED


@settings(max_examples=200, deadline=2000)
@given(
    current=st.floats(min_value=0.90, max_value=1.0, allow_nan=False),
)
def test_halved_mode_exited_at_90pct(current):
    """HALVED → NORMAL transition fires exactly when current ≥ 90% of peak."""
    peak = 1000.0
    # Use episodes=1 so we don't accidentally trigger STOPPED
    state = BankrollState(current_bankroll=current * peak, peak_bankroll=peak,
                          mode=BankrollMode.HALVED, halved_episodes=1)
    updated = state.update_mode()
    assert updated.mode == BankrollMode.NORMAL


@settings(max_examples=200, deadline=2000)
@given(
    current=st.floats(min_value=0.80, max_value=0.899, allow_nan=False),
)
def test_halved_stays_halved_below_90pct(current):
    """HALVED stays HALVED when current ∈ [80%, 90%) of peak on first episode."""
    peak = 1000.0
    # episodes=1 → not yet in second episode, so no STOPPED trigger
    state = BankrollState(current_bankroll=current * peak, peak_bankroll=peak,
                          mode=BankrollMode.HALVED, halved_episodes=1)
    updated = state.update_mode()
    assert updated.mode == BankrollMode.HALVED


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

class TestInputValidation:
    def test_raises_on_odds_le_one(self):
        with pytest.raises(ValueError, match="decimal_odds must be > 1.0"):
            size_bet(0.05, 0.40, 1.0, _normal_state())

    def test_raises_on_negative_q(self):
        with pytest.raises(ValueError, match="q_devigged must be in"):
            size_bet(0.05, -0.1, 2.5, _normal_state())

    def test_raises_on_q_above_one(self):
        with pytest.raises(ValueError, match="q_devigged must be in"):
            size_bet(0.05, 1.1, 2.5, _normal_state())

    def test_raises_on_invalid_bankroll(self):
        with pytest.raises(ValueError):
            BankrollState(current_bankroll=1100.0, peak_bankroll=1000.0)


# ---------------------------------------------------------------------------
# SizingDecision.zero factory
# ---------------------------------------------------------------------------

class TestZeroFactory:
    def test_zero_factory_returns_all_zeros(self):
        z = SizingDecision.zero("test_reason")
        assert z.f_full == 0.0
        assert z.f_fractional == 0.0
        assert z.f_capped == 0.0
        assert z.f_final == 0.0
        assert "test_reason" in z.applied_caps
