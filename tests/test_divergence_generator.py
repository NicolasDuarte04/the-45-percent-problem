"""
tests/test_divergence_generator.py
==================================
cp-14, commit 5. Decision B gated divergence: synthetic / absent odds yield the
honest pending state (zero rows, no PINNACLE stamp); real odds yield de-vigged
rows stamped PINNACLE. The de-vig path is fixture-tested; the live API is never
called.
"""

from __future__ import annotations

import pandas as pd
import pytest

from evaluation.forecast_mapping import build_model_map
from evaluation.reconstruct_forecasts import reconstruct_distributions
from market.divergence_generator import (
    build_divergence,
    odds_are_synthetic,
    pending_divergence,
)


@pytest.fixture(scope="module")
def model_map() -> pd.DataFrame:
    return build_model_map()


@pytest.fixture(scope="module")
def dists(model_map: pd.DataFrame) -> pd.DataFrame:
    return reconstruct_distributions(model_map)


# --------------------------------------------------------------------------- #
# Gating
# --------------------------------------------------------------------------- #

def test_none_and_empty_are_synthetic() -> None:
    assert odds_are_synthetic(None) is True
    assert odds_are_synthetic(pd.DataFrame()) is True


def test_all_syn_prefix_is_synthetic() -> None:
    df = pd.DataFrame({"snapshot_id": ["syn_M01_ho", "syn_M01_aw"]})
    assert odds_are_synthetic(df) is True


def test_real_prefix_is_not_synthetic() -> None:
    df = pd.DataFrame({"snapshot_id": ["oa_M01_ho", "oa_M01_aw"]})
    assert odds_are_synthetic(df) is False


def test_pending_has_zero_rows_and_no_pinnacle() -> None:
    d = pending_divergence("snap1", "2026-06-16T00:00:00Z", "no real odds ingested")
    assert d["rows"] == []
    assert d["status"] == "pending"
    # no source_book stamp anywhere
    assert "PINNACLE" not in str(d["rows"])


# --------------------------------------------------------------------------- #
# Real de-vig path (fixture odds, never the live API)
# --------------------------------------------------------------------------- #

def _odds_for(match_id: str, h: float, d: float, a: float) -> list[dict]:
    return [
        {"snapshot_id": f"oa_{match_id}_ho", "match_id": match_id, "bookmaker": "pinnacle",
         "market_type": "match_winner", "outcome": "home_win", "decimal_odds": h, "is_closing": True},
        {"snapshot_id": f"oa_{match_id}_dr", "match_id": match_id, "bookmaker": "pinnacle",
         "market_type": "match_winner", "outcome": "draw", "decimal_odds": d, "is_closing": True},
        {"snapshot_id": f"oa_{match_id}_aw", "match_id": match_id, "bookmaker": "pinnacle",
         "market_type": "match_winner", "outcome": "away_win", "decimal_odds": a, "is_closing": True},
    ]


def test_build_divergence_produces_real_rows(
    model_map: pd.DataFrame, dists: pd.DataFrame
) -> None:
    a = model_map.iloc[0]
    odds = pd.DataFrame(_odds_for(a["match_id"], 1.30, 5.0, 9.0))
    div = build_divergence(
        "snap1", "2026-06-16T00:00:00Z", odds, dists, model_map, "abc123", n_runs=10000
    )
    assert div["status"] == "live"
    assert len(div["rows"]) == 3  # one fixture, 3 outcomes

    # de-vigged probabilities sum to ~1 across the three outcomes
    q_sum = sum(r["q_market_devigged"] for r in div["rows"])
    assert q_sum == pytest.approx(1.0, abs=1e-3)

    for r in div["rows"]:
        assert r["source_book"] == "PINNACLE"  # honest: these ARE real Pinnacle lines
        assert r["match_id"] == a["match_id"]
        assert r["q_market_raw_decimal"] > 1.0
        # edge is p_model minus de-vigged market
        assert r["edge_E"] == pytest.approx(r["p_model"] - r["q_market_devigged"], abs=1e-6)
        assert r["model_version"].startswith("M2_fifa@")


def test_build_divergence_skips_incomplete_triples(
    model_map: pd.DataFrame, dists: pd.DataFrame
) -> None:
    a = model_map.iloc[0]
    # only two of three outcomes present -> fixture skipped
    odds = pd.DataFrame(_odds_for(a["match_id"], 1.30, 5.0, 9.0)[:2])
    div = build_divergence(
        "snap1", "2026-06-16T00:00:00Z", odds, dists, model_map, "abc123"
    )
    assert div["rows"] == []
