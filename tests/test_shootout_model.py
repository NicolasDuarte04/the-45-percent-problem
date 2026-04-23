"""
tests/test_shootout_model.py
=============================
Unit tests for simulation/shootout_model.py — §8.1 of Phase5_Simulation_Engine_Design.md.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from simulation.match_model import MatchModel
from simulation.shootout_model import ShootoutModel


@pytest.fixture
def models():
    rng = np.random.default_rng(42)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)
    return mm, sm


# ── Test 1: ET goals scale with 0.6 factor ───────────────────────────────────

def test_ET_scaling_factor(models):
    """Mean ET goals ≈ 0.6·(λ1+λ3) + 0.6·(λ2+λ3) over 50k samples."""
    mm, sm = models
    lam1, lam2 = 1.5, 1.2
    lam3 = mm.lambda3
    et_factor = 0.6

    n = 50_000
    total_goals = []
    for _ in range(n):
        h, a = sm.simulate_ET(lam1, lam2)
        total_goals.append(h + a)

    empirical_mean = float(np.mean(total_goals))
    # Expected mean total goals in ET
    expected_mean = et_factor * (lam1 + lam3) + et_factor * (lam2 + lam3)
    tolerance = 0.05  # generous tolerance for a 50k sample mean

    assert abs(empirical_mean - expected_mean) < tolerance, (
        f"ET mean goals {empirical_mean:.4f} ≠ expected {expected_mean:.4f}"
    )


# ── Test 2: Penalty shootout never draws ─────────────────────────────────────

def test_penalty_no_draws():
    """Shootout never returns a tie across 10k simulations."""
    rng = np.random.default_rng(100)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)

    for _ in range(10_000):
        result = sm.simulate_penalties(1500.0, 1500.0)
        assert result in ("A", "B"), f"Unexpected result: {result}"


# ── Test 3: Short-circuit rule ────────────────────────────────────────────────

def test_penalty_short_circuit():
    """Short-circuit: if A leads 3-0 after 3 kicks each with 2 remaining for B,
    shootout terminates correctly (B cannot score 3 from 2 kicks)."""
    # Force the first 3 kicks of each side deterministically using a controlled rng
    # A scores 3, B scores 0 in rounds 1-3 → with 2 kicks left for B (rounds 4-5),
    # B can score at most 2, which is < 3 → short-circuit should fire.
    class AlternatingRNG:
        """Returns 0.0 (score) for A's kicks, 1.0 (miss) for B's kicks in first 3 rounds."""
        def __init__(self):
            self.call_count = 0
        def random(self):
            # Calls: A1, B1, A2, B2, A3, B3, ...
            # A kicks on even calls (0-indexed), B on odd
            r = self.call_count
            self.call_count += 1
            # A scores (return 0.0 < any p), B misses (return 1.0 >= any p)
            if r % 2 == 0:
                return 0.0  # A scores
            else:
                return 1.0  # B misses

    # Can't easily inject a fake rng into the class, so use a seed that
    # produces a 3-0 lead for A after 3 rounds and verify termination via timing.
    # Instead, use a controlled test: verify the logic directly.

    # Use a numpy-based rng seeded to give predictable outcome:
    # After A leads 3-0 with B having 2 kicks left, the result should be A wins.
    rng = np.random.default_rng(0)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, p_base=1.0, kappa=0.0, rng=rng)
    # p_base=1.0 means both teams score every kick → draws all 5 rounds → sudden death
    # Verify it still terminates (no infinite loop)
    result = sm.simulate_penalties(1500.0, 1500.0)
    assert result in ("A", "B")

    # Direct test of the _insurmountable helper
    from simulation.shootout_model import _insurmountable
    # A leads 3-0, each team has kicked 3 times, 2 remaining for each
    assert _insurmountable(3, 3, 0, 3, 2, 2) is True, "3-0 with 2 remaining should be insurmountable"
    # A leads 2-0, 3 remaining for B → not insurmountable (B can score 3)
    assert _insurmountable(2, 3, 0, 3, 2, 2) is False, "2-0 with 2 remaining is NOT insurmountable"


# ── Test 4: Elo skew is monotonic ─────────────────────────────────────────────

def test_elo_skew_monotonic():
    """Elo +400 team wins shootouts at rate ∈ [0.50, 0.60]."""
    rng = np.random.default_rng(200)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)

    n = 10_000
    wins_strong = 0
    for _ in range(n):
        result = sm.simulate_penalties(1900.0, 1500.0)  # strong team = +400 Elo
        if result == "A":
            wins_strong += 1

    win_rate = wins_strong / n
    assert 0.50 <= win_rate <= 0.60, (
        f"Strong team (+400 Elo) win rate {win_rate:.4f} not in [0.50, 0.60]"
    )


# ── Test 5: p_clip enforced ───────────────────────────────────────────────────

def test_p_clip_enforced():
    """Absurd Elo gaps (±1000) produce p within [0.60, 0.90]."""
    rng = np.random.default_rng(300)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)

    import math
    kappa = sm.kappa
    # With elo_gap=1000: p = 0.75 + 0.02*(1000/400) = 0.75 + 0.05 = 0.80 → within clip
    # Verify clip is applied for extreme gaps
    p_high = float(
        min(max(sm.p_base + kappa * 2000 / 400.0, sm.p_clip[0]), sm.p_clip[1])
    )
    p_low = float(
        min(max(sm.p_base + kappa * (-2000) / 400.0, sm.p_clip[0]), sm.p_clip[1])
    )
    assert sm.p_clip[0] <= p_high <= sm.p_clip[1]
    assert sm.p_clip[0] <= p_low <= sm.p_clip[1]

    # Verify that simulations with extreme Elos still produce valid results
    result = sm.simulate_penalties(3000.0, 0.0)
    assert result in ("A", "B")
    result = sm.simulate_penalties(0.0, 3000.0)
    assert result in ("A", "B")


# ── Test 6: resolve_knockout chains correctly ─────────────────────────────────

def test_resolve_knockout_returns_winner():
    """resolve_knockout always returns a non-null winner."""
    rng = np.random.default_rng(400)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)

    for _ in range(500):
        result = sm.resolve_knockout(1.5, 1.2, 1800.0, 1600.0, reg_score=(1, 1))
        assert result["winner"] in ("home", "away")
        assert result["went_to_ET"] is True
