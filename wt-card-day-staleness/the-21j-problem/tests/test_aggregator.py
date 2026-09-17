"""
tests/test_aggregator.py
========================
Session 04 · El Voto del 21 de Junio — Bayesian aggregator tests.

Run from the-21j-problem/ root:
    python -m pytest tests/test_aggregator.py -v
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import model.aggregate_polls as agg  # noqa: E402


# =============================================================================
# Fixtures — synthetic polls + house-effects record (no disk dependency)
# =============================================================================


def _poll(poll_id, pollster, fw_end, n, cep, esp, other=0.0, und=0.0):
    return {
        "poll_id": poll_id,
        "pollster": pollster,
        "fieldwork_end": pd.Timestamp(fw_end),
        "sample_size": n,
        "cepeda_pct": cep,
        "espriella_pct": esp,
        "other_pct": other,
        "undecided_pct": und,
    }


@pytest.fixture
def house_effects() -> dict:
    """Minimal house-effects record: one high-conf, one low-conf firm."""
    return {
        "recency_halflife_days": 5.0,
        "house_effects": {
            "Invamer": {
                "left_bloc_bias": -2.0,
                "right_bloc_bias": -1.0,
                "confidence": "high",
            },
            "AtlasIntel": {
                "left_bloc_bias": -3.0,
                "right_bloc_bias": 3.0,
                "confidence": "low",
            },
        },
        "corpus_sha": "deadbeef",
    }


@pytest.fixture
def polls_split() -> pd.DataFrame:
    """Two pollsters that disagree, both recent."""
    return pd.DataFrame(
        [
            _poll("invamer_2026-06-10", "Invamer", "2026-06-10", 2000, 54.0, 44.0, 2.0),
            _poll("atlas_2026-06-12", "AtlasIntel", "2026-06-12", 2000, 42.0, 50.0, 8.0),
        ]
    )


@pytest.fixture
def polls_agree() -> pd.DataFrame:
    """Several pollsters that broadly agree (low heterogeneity)."""
    rows = [
        _poll(f"invamer_2026-06-1{i}", "Invamer", f"2026-06-1{i}", 2000, 55.0, 43.0, 2.0)
        for i in range(2, 7)
    ]
    return pd.DataFrame(rows)


# =============================================================================
# load_inputs against the real artifacts
# =============================================================================


def test_load_inputs_real() -> None:
    polls, record, halflife = agg.load_inputs()
    assert len(polls) > 0
    assert "house_effects" in record
    assert halflife == record["recency_halflife_days"]
    # Half-life is read from the JSON, not refit.
    assert halflife == 5.0


# =============================================================================
# Posterior mean / variance well-formed
# =============================================================================


def test_posterior_mean_in_unit_interval(polls_split, house_effects) -> None:
    post = agg.aggregate(
        polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG
    )
    assert 0.0 <= post.mean <= 1.0
    assert post.var > 0.0
    assert post.n_polls == 2


def test_share_complement_sums_to_one(polls_split, house_effects) -> None:
    post = agg.aggregate(
        polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG
    )
    share_cepeda = post.mean
    share_espriella = 1.0 - post.mean
    assert abs((share_cepeda + share_espriella) - 1.0) < 1e-12


# =============================================================================
# Reproducibility — aggregate has no RNG, same inputs => identical posterior
# =============================================================================


def test_aggregate_is_deterministic(polls_split, house_effects) -> None:
    a = agg.aggregate(polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG)
    b = agg.aggregate(polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG)
    assert a.mean == b.mean
    assert a.var == b.var
    assert a.tau2 == b.tau2


# =============================================================================
# Soft prior — house effects move the mean, shrunk, never the full bias
# =============================================================================


def test_house_effects_soft_prior_shrinks(polls_split, house_effects) -> None:
    off = agg.aggregate(polls_split, house_effects, halflife=5.0, house_effects_on=False, cfg=agg.CFG)
    on = agg.aggregate(polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG)
    full = agg.aggregate(
        polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG, shrink=1.0
    )
    # ON must sit strictly between OFF (no correction) and FULL (shrink=1).
    lo, hi = sorted([off.mean, full.mean])
    assert lo <= on.mean <= hi
    # And ON must differ from OFF (a correction was applied).
    assert abs(on.mean - off.mean) > 1e-9
    # The soft correction is smaller than the full correction.
    assert abs(on.mean - off.mean) < abs(full.mean - off.mean) + 1e-12


# =============================================================================
# Low-confidence firms get variance inflated
# =============================================================================


def test_low_confidence_flagged(polls_split, house_effects) -> None:
    contribs = agg.prepare_polls(
        polls_split, house_effects, halflife=5.0, house_effects_on=True
    )
    by_firm = {c.pollster: c for c in contribs}
    assert by_firm["AtlasIntel"].low_confidence is True
    assert by_firm["Invamer"].low_confidence is False


def test_low_confidence_inflates_variance(house_effects) -> None:
    # Same poll figures attributed once to a high-conf and once to a low-conf firm.
    df = pd.DataFrame(
        [
            _poll("invamer_2026-06-10", "Invamer", "2026-06-10", 2000, 48.0, 50.0, 2.0),
            _poll("atlas_2026-06-10", "AtlasIntel", "2026-06-10", 2000, 48.0, 50.0, 2.0),
        ]
    )
    # Zero out biases so only the low-confidence multiplier differs.
    he = {
        "recency_halflife_days": 5.0,
        "house_effects": {
            "Invamer": {"left_bloc_bias": 0.0, "right_bloc_bias": 0.0, "confidence": "high"},
            "AtlasIntel": {"left_bloc_bias": 0.0, "right_bloc_bias": 0.0, "confidence": "low"},
        },
    }
    contribs = {c.pollster: c for c in agg.prepare_polls(df, he, halflife=5.0, house_effects_on=True)}
    mult = float(agg.CFG["aggregator"]["low_confidence_variance_mult"])
    assert contribs["AtlasIntel"].v_within == pytest.approx(
        contribs["Invamer"].v_within * mult, rel=1e-9
    )


# =============================================================================
# Heterogeneity — random effects widens the posterior when polls disagree
# =============================================================================


def test_random_effects_adds_tau2_when_polls_disagree(polls_split, house_effects) -> None:
    post = agg.aggregate(
        polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG
    )
    assert post.heterogeneity == "random_effects"
    assert post.tau2 > 0.0  # the two polls disagree beyond sampling error


def test_random_effects_widens_vs_fixed(polls_split, house_effects) -> None:
    import copy

    cfg_fixed = copy.deepcopy(agg.CFG)
    cfg_fixed["aggregator"]["heterogeneity"] = "fixed"

    re_post = agg.aggregate(polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG)
    fe_post = agg.aggregate(polls_split, house_effects, halflife=5.0, house_effects_on=True, cfg=cfg_fixed)
    assert fe_post.tau2 == 0.0
    assert re_post.var > fe_post.var  # honest CI is wider than fixed-effect


def test_agreeing_polls_have_small_tau2(polls_agree, house_effects) -> None:
    post = agg.aggregate(
        polls_agree, house_effects, halflife=5.0, house_effects_on=True, cfg=agg.CFG
    )
    # Identical-ish polls => no between-poll signal => tau2 collapses to 0.
    assert post.tau2 == pytest.approx(0.0, abs=1e-9)


# =============================================================================
# Recency — older polls carry less weight
# =============================================================================


def test_recency_downweights_old_polls(house_effects) -> None:
    contribs = agg.prepare_polls(
        pd.DataFrame(
            [
                _poll("invamer_2026-06-18", "Invamer", "2026-06-18", 2000, 50.0, 48.0, 2.0),
                _poll("invamer_2026-04-18", "Invamer", "2026-04-18", 2000, 50.0, 48.0, 2.0),
            ]
        ),
        house_effects,
        halflife=5.0,
        house_effects_on=True,
    )
    recencies = {c.poll_id: c.recency for c in contribs}
    assert recencies["invamer_2026-06-18"] > recencies["invamer_2026-04-18"]
