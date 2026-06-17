"""
tests/test_reconstruct_forecasts.py
===================================
cp-14, commit 3. Decision A reconstruction: aggregate the frozen committed M2
batch into per-match 1X2 forecasts and score them. These tests pin the
distribution validity, the provenance tagging, the proper-scoring
contributions, and the market-fields-null invariant.
"""

from __future__ import annotations

import pandas as pd
import pytest

from evaluation.forecast_mapping import build_model_map
from evaluation.reconstruct_forecasts import (
    batch_provenance,
    build_ledger_rows,
    reconstruct_distributions,
)


@pytest.fixture(scope="module")
def model_map() -> pd.DataFrame:
    return build_model_map()


@pytest.fixture(scope="module")
def dists(model_map: pd.DataFrame) -> pd.DataFrame:
    return reconstruct_distributions(model_map)


def test_distributions_cover_all_group_matches(dists: pd.DataFrame) -> None:
    assert len(dists) == 72
    assert dists["match_id"].nunique() == 72


def test_distributions_are_valid_probabilities(dists: pd.DataFrame) -> None:
    s = dists["p_home"] + dists["p_draw"] + dists["p_away"]
    assert (s.sub(1.0).abs() < 1e-9).all()
    for col in ("p_home", "p_draw", "p_away"):
        assert (dists[col] >= 0).all() and (dists[col] <= 1).all()
    # full 10k batch
    assert (dists["n_runs"] == 10000).all()


def test_provenance_tags_present() -> None:
    prov = batch_provenance()
    assert prov["source_batch_id"] == "batch_20260512_013228Z"
    assert prov["source_batch_activated_utc"].startswith("2026-05-12")


def test_ledger_rows_score_and_tag(model_map: pd.DataFrame, dists: pd.DataFrame) -> None:
    a, b = model_map.iloc[0], model_map.iloc[1]
    scored = pd.DataFrame(
        [
            {"match_id": a["match_id"], "home_goals": 3, "away_goals": 0,
             "settled_at": "2026-06-11T21:00:00Z"},
            {"match_id": b["match_id"], "home_goals": 0, "away_goals": 1,
             "settled_at": "2026-06-12T21:00:00Z"},
        ]
    )
    rows = build_ledger_rows(scored, dists, code_sha="deadbeef0000")
    assert len(rows) == 2

    r = rows[0]
    # outcome label + scoring
    assert r["outcome_realized"] == "1"  # home win
    d = r["outcome_predicted_distribution"]
    assert abs(d["1"] + d["X"] + d["2"] - 1.0) < 1e-6
    assert r["p_model_on_realized"] == pytest.approx(d["1"], abs=1e-6)
    # brier of a 3-class forecast is in [0, 2]; log-loss and rps non-negative
    assert 0.0 <= r["brier_contribution"] <= 2.0
    assert r["log_loss_contribution"] >= 0.0
    assert r["rps_contribution"] >= 0.0

    # market layer stays null (Pinnacle pending) - the calibration claim is
    # proper-scoring only, not a market/CLV claim.
    assert r["q_market_devigged_on_realized"] is None
    assert r["edge_E_at_close"] is None
    assert r["gate_status_at_close"] is None
    assert r["clv_bps"] is None
    assert r["hit_miss_label"] is None

    # provenance on every row
    assert r["provenance"] == "reconstructed_frozen_pretournament_batch"
    assert r["source_batch_id"] == "batch_20260512_013228Z"
    assert r["source_batch_activated_utc"].startswith("2026-05-12")
    assert r["model_id"] == "M_STAR"
    assert r["code_sha"] == "deadbeef0000"


def test_no_synthetic_placeholder_ids(model_map: pd.DataFrame, dists: pd.DataFrame) -> None:
    """The legacy ARG/CAN and GER/JAP placeholders must not appear."""
    a = model_map.iloc[0]
    scored = pd.DataFrame(
        [{"match_id": a["match_id"], "home_goals": 1, "away_goals": 1,
          "settled_at": "2026-06-11T21:00:00Z"}]
    )
    rows = build_ledger_rows(scored, dists, code_sha="abc")
    ids = {r["forecast_id"] for r in rows}
    assert not any("ARG-CAN" in i or "GER-JAP" in i for i in ids)
    assert all(i.startswith("recon-") for i in ids)
