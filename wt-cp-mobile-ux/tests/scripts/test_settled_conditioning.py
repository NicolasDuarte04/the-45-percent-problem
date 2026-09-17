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

## cp-15 hardening: single-loss magnitude is directional, not a fixed
## relative-percentage floor

The 2026-06-01 architecture diagnostic stated that a single 0-3 Mexico
loss should drop p_champion below 0.005. That was the diagnostic
author's prior, not a measurement (a static audit with no code run).
cp-10 replaced it with measured invariants, including a "single 0-3
opener drops p_champion by at least 20% relative to baseline" floor.
At 10k runs against the locked Elo (Mexico = 1858, RSA = 1524) the
effect is real and large:
  Baseline       p_champion(Mexico) ~ 0.0168
  Single 0-3     p_champion(Mexico) ~ 0.0118  (about 30% relative drop)
  All 3 losses   p_champion(Mexico) = 0.0000  (math elimination)

cp-15 removed the fixed 20% relative floor because it is not a stable
invariant at this test's sample size, which made it flake in CI:
  1. The test runs its own Monte Carlo (it does not read a snapshot), so
     every probability is a multiple of 1/N_RUNS. At N_RUNS = 1000 the
     baseline is only about 17 champion runs out of 1000.
  2. Mexico is a long shot. The single-loss effect removes about a third
     of those runs, but the relative drop between two small integer
     counts is noise-dominated: across Monte Carlo draws it ranges from
     about 14% to 31% at 1000 runs and only stabilizes near 30% at
     10000 runs (the production run count). A 20% floor sits inside that
     band, so some runs cleared it and some did not.
  3. The 1000-run aggregate is additionally sensitive to PYTHONHASHSEED.
     simulation/bracket_encoder.py builds the group-ranking team list
     via list(set(...)), so the order in which the RNG is consumed
     during tiebreaks shifts with the interpreter hash seed. Each CI
     process gets a fresh hash seed, so the same code produced different
     aggregates run to run. Pinning that ordering is a simulation-engine
     change and is out of scope for a test-only checkpoint; it is
     recorded as a cp-15 follow-up in the PR.

The invariants cp-15 asserts instead hold across the whole tournament
data range and do not depend on the noise-dominated p_champion count:
  1. Deterministic floor (unchanged): when all three of Mexico's group
     games are settled as losses, p_champion and p_r16 are both exactly
     0. The strongest acceptance, independent of sampling noise.
  2. Single-loss strict decrease, gated by baseline mass: a 0-3 opener
     strictly lowers Mexico's p_champion while the baseline carries
     enough Monte Carlo mass to make the decrease reliable (at or above
     MIN_BASELINE_STRICT, which the current Elo clears with margin).
     Because baseline and conditioned runs share one RNG stream, unwired
     or sign-flipped conditioning makes the two equal and fails the
     strict branch, so this is a real acceptance test and not a no-op.
     Below that mass the championship count is a handful of runs of pure
     sampling noise (it can even tick up via bracket reshuffle), so no
     p_champion claim is made there; that low-baseline state is the one
     that broke the old fixed-percentage floor.
  3. Magnitude and the low-baseline direction are asserted where they are
     statistically stable: on p_r16, not p_champion. Mexico's p_r16
     (about 0.4 baseline, hundreds of counts, and decided at group
     qualification before the hash-sensitive bracket tiebreaks) drops by
     at least 10 percentage points, South Africa's rises by at least 10,
     and the Group A aggregate rises. Those large-count quantities carry
     the "a settled loss conditions progression downward by a sensible
     amount" claim that the relative p_champion floor used to carry.

test_single_loss_small_baseline_does_not_break exercises the relaxed
branch with a deliberately weakened Mexico so a future low-baseline
tournament state cannot silently re-break this file.

Reasoning recorded in the cp-15 PR description. The 20% floor was test
scaffolding (PLAN.md Q7, 2026-06-03), not pre-registered methodology,
so removing it needs no OSF deviation.

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

# Baseline p_champion (as a fraction of N_RUNS) below which a strict
# decrease is no longer reliable. At a handful of champion runs out of
# N_RUNS a correctly-wired single-loss conditioning is pure sampling
# noise: the count can stay flat or even tick up via bracket reshuffle
# (a forced group loss changes the seeding path), so neither a strict nor
# a non-increase claim holds. Above this floor the strict decrease is
# robust; below it no p_champion claim is asserted and the conditioning
# signal is read from p_r16 instead (a large, hash-stable count). Mexico's
# current baseline is about 0.017 (17 runs / 1000), comfortably above
# this; a weakened-Mexico fixture below exercises the relaxed branch at
# about 1 to 2 runs / 1000.
MIN_BASELINE_STRICT = 0.010


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


@pytest.fixture(scope="module")
def weak_mexico_elo(elo: dict[str, float]) -> dict[str, float]:
    """Elo map with Mexico weakened into the small-baseline regime.

    At the locked Elo Mexico's p_champion baseline is about 0.017. This
    override drops Mexico's rating so the baseline falls well below
    MIN_BASELINE_STRICT (measured around 0.001 to 0.002 at 1k runs). It
    models a future tournament state in which Mexico has conditioned down
    to a long-shot's long shot, which is the state that broke the old
    fixed-percentage floor.
    """
    weak = dict(elo)
    weak["Mexico"] = 1700.0
    return weak


@pytest.fixture(scope="module")
def weak_baseline(weak_mexico_elo: dict[str, float]) -> dict[str, dict[str, float]]:
    """1k-run baseline with the weakened-Mexico Elo, no settled results."""
    runner = _build_runner(weak_mexico_elo, settled_results=None)
    return _aggregate(runner)


@pytest.fixture(scope="module")
def weak_mexico_single_loss(
    weak_mexico_elo: dict[str, float],
) -> dict[str, dict[str, float]]:
    """1k-run on M01 = Mexico 0-3 South Africa with the weakened Elo."""
    settled = {
        "M01": MatchResult(
            home="Mexico",
            away="South Africa",
            home_goals=0,
            away_goals=3,
        )
    }
    runner = _build_runner(weak_mexico_elo, settled_results=settled)
    return _aggregate(runner)


# ── Directional invariant shared by current- and small-baseline tests ────────

def _assert_settled_loss_reduces_p_champion(
    baseline: dict[str, dict[str, float]],
    conditioned: dict[str, dict[str, float]],
) -> None:
    """Assert a single settled Mexico loss strictly lowers p_champion,
    when the baseline carries enough Monte Carlo mass to make that claim
    reliable.

    A strict decrease is asserted only when the baseline is at or above
    MIN_BASELINE_STRICT. At that mass the single-loss effect (about a
    third of Mexico's championship runs) reliably removes at least one
    run, so equality is a real failure signal: baseline and conditioned
    share one RNG stream, so unwired or sign-flipped conditioning yields
    conditioned == baseline and fails this assertion. That makes the
    strict branch a genuine acceptance test, not a no-op.

    Below MIN_BASELINE_STRICT no p_champion claim is made: at a handful of
    runs out of N_RUNS the count is pure sampling noise and can even tick
    up under bracket reshuffle, so not even a non-increase claim holds.
    The relative magnitude of the drop is likewise not asserted here; on
    this noise-dominated count it is not a stable invariant at 1k runs
    (see module docstring). Magnitude and the low-baseline directional
    signal both live on the large-count, hash-stable p_r16 tests.
    """
    b = baseline.get("Mexico", {}).get("p_champion", 0.0)
    c = conditioned.get("Mexico", {}).get("p_champion", 1.0)
    if b >= MIN_BASELINE_STRICT:
        assert c < b, (
            f"Mexico p_champion did not strictly drop after a 0-3 M01 "
            f"loss: baseline={b:.4f}, conditioned={c:.4f}. With a "
            f"baseline at or above {MIN_BASELINE_STRICT:.3f} the "
            f"single-loss conditioning must remove at least one "
            f"championship run; equality means settled_results is not "
            f"flowing into the MC's group loop."
        )


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
    """A single 0-3 opening loss must condition Mexico's p_champion
    downward: never up, and strictly down at the current baseline.

    The magnitude of the drop is asserted on p_r16 (test below), not on
    this count: at 1k runs Mexico's p_champion is about 17 runs out of
    1000, so a fixed relative-percentage floor is noise-dominated and
    flakes (see module docstring). The directional invariant is robust
    and, thanks to the shared RNG stream, still fails if conditioning is
    unwired or sign-flipped.
    """
    _assert_settled_loss_reduces_p_champion(baseline, mexico_single_loss)


# ── Acceptance test 2b: small-baseline regression guard for the test ─────────

def test_single_loss_small_baseline_does_not_break(
    weak_baseline: dict[str, dict[str, float]],
    weak_mexico_single_loss: dict[str, dict[str, float]],
) -> None:
    """Guard the test against a future low-baseline tournament state.

    This protects the test file, not the engine. As Mexico's Elo
    conditions down over the tournament its p_champion baseline shrinks
    toward a couple of runs out of 1000, where the championship count is
    pure noise. The old fixed-percentage floor re-broke exactly there.
    This test proves the cp-15 design does not: the p_champion helper
    relaxes (asserts nothing) instead of flaking, and the conditioning
    signal is still verifiable on the stable, hash-independent p_r16
    count, which drops about 0.18 even when Mexico is a long shot.
    """
    b_champ = weak_baseline.get("Mexico", {}).get("p_champion", 0.0)
    assert b_champ < MIN_BASELINE_STRICT, (
        f"weak_mexico_elo baseline p_champion={b_champ:.4f} is not below "
        f"MIN_BASELINE_STRICT={MIN_BASELINE_STRICT:.3f}, so this test is "
        f"not exercising the relaxed branch it claims to. Lower Mexico's "
        f"override rating in the weak_mexico_elo fixture."
    )
    # The p_champion helper (used by the current-baseline acceptance test)
    # must relax here rather than raise on the 1-to-2-run noise.
    _assert_settled_loss_reduces_p_champion(weak_baseline, weak_mexico_single_loss)
    # Conditioning is still demonstrably sign-correct at low baseline on
    # the stable statistic: Mexico's R16 reach falls. p_r16 is decided by
    # group qualification, before the bracket tiebreaks that carry the
    # PYTHONHASHSEED sensitivity, so this drop is tight (about 0.18 across
    # hash seeds). The 0.05 floor leaves wide margin while staying a real
    # check.
    r16_b = weak_baseline.get("Mexico", {}).get("p_r16", 0.0)
    r16_c = weak_mexico_single_loss.get("Mexico", {}).get("p_r16", 1.0)
    assert r16_b - r16_c >= 0.05, (
        f"Weakened Mexico p_r16 did not drop after a 0-3 M01 loss: "
        f"baseline={r16_b:.3f}, conditioned={r16_c:.3f}. Conditioning "
        f"must still reduce R16 reach at a small championship baseline."
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
