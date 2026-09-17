"""
tests/scripts/test_settled_conditioning.py
==========================================
cp-10 acceptance + directional tests for settled-result conditioning
in the Monte Carlo group stage.

These tests run the wc2026 variant locally with a hand-built
SimpleEloProvider seeded from `data/raw/elo_ratings.parquet`; no
database access is required. The same MonteCarloRunner is instantiated
several times with different settled_results dicts, and per-team
progression probabilities are compared.

The fixture data flow mirrors the production pipeline: in prod,
`simulation/load_settled.py` builds the settled_results dict from
the website's match_outcomes table and threads it into
MonteCarloRunner via batch_runner. Here we skip the loader and
construct the dict directly so the test is hermetic.

## Divergence from the diagnostic's literal threshold

The 2026-06-01 architecture diagnostic stated:
  "After manually inserting a 0-3 Mexico loss into match_outcomes and
   running a 1k-batch dev pipeline, Mexico's p_champion in the produced
   tournament.json is less than 0.005."

That threshold was the diagnostic author's prior, not a measurement - 
the diagnostic was a static audit with no code executed. Measured
behavior at 10k runs against the project's locked Elo (Mexico = 1858,
RSA = 1524) shows:
  - Baseline       p_champion(Mexico) = 0.0171
  - Single 0-3     p_champion(Mexico) = 0.0118  (31% relative drop)
  - All 3 losses   p_champion(Mexico) = 0.0000  (math elimination)

A single 0-3 opener does not collapse Mexico below 0.005 with the
real strength matrix - Mexico has two more group games to recover,
the best-thirds gateway, and Elo 1858 in R32+. The conditioning
*works*, it just doesn't push Mexico that far that fast with one
match.

The test below replaces the diagnostic's single-number threshold
with a richer set of invariants:
  1. Deterministic floor: when all three of Mexico's group games are
     conditioned to losses, Mexico's p_champion and p_r16 are both
     exactly 0. This is the strongest acceptance - it passes only if
     settled-result conditioning is fully wired into the runner.
  2. Single-loss measurable drop: Mexico's p_champion drops by at
     least 20% relative to baseline after one 0-3 opener; Mexico's
     p_r16 drops by at least 10 percentage points.
  3. Single-loss redistribution direction: South Africa (the winner
     of M01) gains at least 10 percentage points of p_r16; the
     aggregate p_r16 of the three other Group A teams rises versus
     baseline.

The diagnostic's "each other team's p_r16 rises" wording is replaced
with the aggregate redistribution claim above. With the real Elo,
South Africa absorbs almost all of Mexico's lost mass; South Korea
and Czechia individually shift only marginally (and can fall slightly
under single-loss noise). The aggregate rise is the directionally
meaningful invariant.

Reasoning recorded in docs/onboarding/cp-10-inspection-notes.md and
in the cp-10 PR description.

Run:
  pytest tests/scripts/test_settled_conditioning.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from simulation.bracket_encoder import BracketEncoder, MatchResult
from simulation.match_model import MatchModel
from simulation.monte_carlo_runner import (
    MonteCarloRunner,
    SimpleEloProvider,
)
from simulation.shootout_model import ShootoutModel

# Group A teams as they appear in data/raw/wc2026_fixtures.parquet.
# These are the team names used by the MC's MatchResult.home / .away
# and by the strength provider - full names, not FIFA codes.
GROUP_A_TEAMS = ["Mexico", "South Korea", "Czechia", "South Africa"]
OTHER_GROUP_A = ["South Korea", "Czechia", "South Africa"]

# The R16-or-later exit-round set used by the snapshot aggregator
# (scripts/regenerate_snapshot_from_batch.py::aggregate_team_progression).
# Kept in sync by hand because the aggregator's set is not exported.
_R16_OR_LATER = {"Champion", "Runner-up", "SF", "3rd", "QF", "R16"}

# 1k runs is the cp-10 prompt's specified count for the dev pipeline
# acceptance test; cp-04 / cp-05 timed runs at ~3.5 ms each, so each
# 1k pass below is ~3-4 seconds plus IO. Four passes here -> ~15s.
N_RUNS = 1000

# Fixed seed_base so baseline and conditioned runs share the same RNG
# stream - every match that isn't conditioned is sampled identically
# across the two passes, so directional comparisons are clean.
SEED_BASE = 20260611


def _build_elo_ratings() -> dict[str, float]:
    """Load the project's Elo parquet into a name -> rating dict."""
    df = pd.read_parquet(PROJECT_ROOT / "data" / "raw" / "elo_ratings.parquet")
    return dict(zip(df["team_name"], df["elo_rating"].astype(float)))


def _build_runner(
    elo: dict[str, float],
    settled_results: dict[str, MatchResult] | None = None,
) -> MonteCarloRunner:
    """Construct a wc2026 MonteCarloRunner with a SimpleEloProvider.

    The two RNGs (MatchModel, ShootoutModel) are seeded with a fixed
    seed at construction; per-run determinism is enforced by run_one's
    seed argument, which the runner re-assigns to both RNGs at the
    start of each run.
    """
    rng = np.random.default_rng(0)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)
    be = BracketEncoder()
    sp = SimpleEloProvider(elo_ratings=elo)
    return MonteCarloRunner(
        match_model=mm,
        shootout_model=sm,
        bracket_encoder=be,
        strength_provider=sp,
        code_sha="test-cp10",
        tournament_variant="wc2026",
        settled_results=settled_results,
    )


def _aggregate(
    runner: MonteCarloRunner,
    n_runs: int = N_RUNS,
    seed_base: int = SEED_BASE,
) -> dict[str, dict[str, float]]:
    """Run `n_runs` simulations and aggregate per-team probabilities.

    Returns a dict keyed by team_id with two keys per team:
      - p_champion: fraction of runs in which the team won
      - p_r16:      fraction of runs in which the team reached R16
                    or any later round (matches the snapshot
                    aggregator's exit-round buckets).
    """
    timestamp = pd.Timestamp("2026-06-11", tz="UTC")
    champion_counts: dict[str, int] = {}
    r16_counts: dict[str, int] = {}
    for i in range(n_runs):
        team_df, _ = runner.run_one(
            run_idx=i,
            seed=seed_base + i,
            model_id="test-cp10",
            data_hash="test",
            timestamp_utc=timestamp,
        )
        for row in team_df.itertuples(index=False):
            if row.champion:
                champion_counts[row.team_id] = champion_counts.get(row.team_id, 0) + 1
            if row.exit_round in _R16_OR_LATER:
                r16_counts[row.team_id] = r16_counts.get(row.team_id, 0) + 1

    teams = set(champion_counts) | set(r16_counts)
    return {
        team: {
            "p_champion": champion_counts.get(team, 0) / n_runs,
            "p_r16":      r16_counts.get(team, 0) / n_runs,
        }
        for team in teams
    }


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def elo() -> dict[str, float]:
    return _build_elo_ratings()


@pytest.fixture(scope="module")
def baseline(elo: dict[str, float]) -> dict[str, dict[str, float]]:
    """1k-run baseline with no settled results."""
    runner = _build_runner(elo, settled_results=None)
    return _aggregate(runner)


@pytest.fixture(scope="module")
def mexico_single_loss(elo: dict[str, float]) -> dict[str, dict[str, float]]:
    """1k-run conditioned on M01 = Mexico 0-3 South Africa (one match)."""
    settled = {
        "M01": MatchResult(
            home="Mexico",
            away="South Africa",
            home_goals=0,
            away_goals=3,
        )
    }
    runner = _build_runner(elo, settled_results=settled)
    return _aggregate(runner)


@pytest.fixture(scope="module")
def mexico_full_elimination(elo: dict[str, float]) -> dict[str, dict[str, float]]:
    """1k-run conditioned on ALL three Mexico group games as losses.

    Mexico is mathematically eliminated: 0 points across the three
    group games. Best-thirds qualifying threshold is 3 points + GD
    tiebreaker, so Mexico cannot reach R32, let alone R16 or the
    Final. p_champion and p_r16 must therefore both be exactly 0.
    """
    settled = {
        "M01": MatchResult("Mexico", "South Africa", 0, 3),
        "M25": MatchResult("Mexico", "South Korea",  0, 2),
        "M49": MatchResult("Mexico", "Czechia",      0, 1),
    }
    runner = _build_runner(elo, settled_results=settled)
    return _aggregate(runner)


# ── Acceptance test 1: deterministic floor ───────────────────────────────────

def test_mexico_full_elimination_zero_champion(
    mexico_full_elimination: dict[str, dict[str, float]],
) -> None:
    """When all three of Mexico's group games are settled as losses,
    Mexico's p_champion and p_r16 must be exactly 0. This is the
    strongest possible acceptance test for settled-result conditioning:
    if the conditioning is not wired through, Mexico would still win
    some fraction of simulations from the strength matrix alone.
    """
    # Mexico is mathematically eliminated, so they appear with zero
    # probability - either as an explicit 0.0 entry or by being absent
    # from the aggregated dict (the aggregator only emits entries for
    # teams that reached Champion or R16-or-later at least once). Both
    # representations mean the same thing; treat them identically.
    p_champ = mexico_full_elimination.get("Mexico", {}).get("p_champion", 0.0)
    p_r16 = mexico_full_elimination.get("Mexico", {}).get("p_r16", 0.0)
    assert p_champ == 0.0, (
        f"Mexico p_champion={p_champ:.4f} after all three group losses. "
        f"Must be exactly 0 - Mexico is mathematically eliminated when "
        f"they win 0 of 3 group matches. A non-zero value means the "
        f"settled_results dict is not flowing into the MC's group loop."
    )
    assert p_r16 == 0.0, (
        f"Mexico p_r16={p_r16:.4f} after all three group losses. Must "
        f"be exactly 0."
    )


# ── Acceptance test 2: measurable drop on a single loss ──────────────────────

def test_mexico_single_loss_drops_p_champion(
    baseline: dict[str, dict[str, float]],
    mexico_single_loss: dict[str, dict[str, float]],
) -> None:
    """A single 0-3 opening loss must measurably reduce Mexico's
    p_champion. The 31% drop measured at 10k runs gives ample headroom
    for the 20% relative-drop threshold at 1k runs.
    """
    b = baseline.get("Mexico", {}).get("p_champion", 0.0)
    c = mexico_single_loss.get("Mexico", {}).get("p_champion", 1.0)
    assert c < b, (
        f"Mexico p_champion did not drop after a 0-3 M01 loss: "
        f"baseline={b:.4f}, conditioned={c:.4f}."
    )
    # Relative drop floor. At 10k the measured drop is ~31 %; at 1k
    # the noise band is wider, so 20 % is a calibrated lower bound.
    rel_drop = (b - c) / b if b > 0 else 0.0
    assert rel_drop >= 0.20, (
        f"Mexico p_champion drop was only {rel_drop:.1%}: "
        f"baseline={b:.4f}, conditioned={c:.4f}. cp-10 expects ≥ 20%."
    )


# ── Acceptance test 3: directional, single loss ──────────────────────────────

def test_mexico_single_loss_drops_p_r16(
    baseline: dict[str, dict[str, float]],
    mexico_single_loss: dict[str, dict[str, float]],
) -> None:
    """Mexico's p_r16 must fall by at least 10 percentage points after
    the 0-3 opener. Measured drop at 10k is ~17pp; 10pp is the 1k
    noise-tolerant floor.
    """
    b = baseline.get("Mexico", {}).get("p_r16", 0.0)
    c = mexico_single_loss.get("Mexico", {}).get("p_r16", 1.0)
    drop = b - c
    assert drop >= 0.10, (
        f"Mexico p_r16 drop was only {drop:.4f}: "
        f"baseline={b:.4f}, conditioned={c:.4f}. cp-10 expects ≥ 0.10."
    )


def test_south_africa_p_r16_rises(
    baseline: dict[str, dict[str, float]],
    mexico_single_loss: dict[str, dict[str, float]],
) -> None:
    """South Africa won M01 3-0 (3 pts, +3 GD). Their p_r16 must rise
    by at least 10 percentage points. Measured at 10k: ~20pp.
    """
    b = baseline.get("South Africa", {}).get("p_r16", 0.0)
    c = mexico_single_loss.get("South Africa", {}).get("p_r16", 0.0)
    rise = c - b
    assert rise >= 0.10, (
        f"South Africa p_r16 rise was only {rise:.4f}: "
        f"baseline={b:.4f}, conditioned={c:.4f}. cp-10 expects ≥ 0.10."
    )


def test_other_group_a_aggregate_p_r16_rises(
    baseline: dict[str, dict[str, float]],
    mexico_single_loss: dict[str, dict[str, float]],
) -> None:
    """Aggregate redistribution: the total p_r16 across the three other
    Group A teams must rise. Mexico's lost probability mass goes
    primarily to South Africa under a single-loss fixture; South Korea
    and Czechia individually can shift in either direction within
    sampling noise. The aggregate is the directionally meaningful
    invariant.
    """
    total_b = sum(
        baseline.get(t, {}).get("p_r16", 0.0) for t in OTHER_GROUP_A
    )
    total_c = sum(
        mexico_single_loss.get(t, {}).get("p_r16", 0.0) for t in OTHER_GROUP_A
    )
    assert total_c > total_b, (
        f"Aggregate p_r16 across {OTHER_GROUP_A} did not rise: "
        f"baseline_sum={total_b:.4f}, conditioned_sum={total_c:.4f}."
    )
