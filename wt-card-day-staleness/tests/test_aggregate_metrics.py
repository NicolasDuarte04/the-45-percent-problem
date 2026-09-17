"""
tests/test_aggregate_metrics.py
===============================
cp-14, commit 4. Champion proper-scoring aggregate over the reconstructed
ledger. M0-M3 stay null; market metrics stay null; the sample size is explicit.
"""

from __future__ import annotations

import numpy as np

from evaluation.accuracy_metrics import brier, log_loss, rps
from evaluation.aggregate_metrics import (
    compute_champion_metrics,
    compute_reliability_diagram,
    update_evaluation_metrics,
)


def _row(p1: float, px: float, p2: float, realized: str) -> dict:
    return {
        "model_id": "M_STAR",
        "outcome_predicted_distribution": {"1": p1, "X": px, "2": p2},
        "outcome_realized": realized,
    }


def test_empty_ledger_yields_null_metrics() -> None:
    m = compute_champion_metrics([])
    assert m == {"n": 0, "brier": None, "rps": None, "log_loss": None}


def test_aggregate_matches_manual_mean() -> None:
    rows = [
        _row(0.7, 0.2, 0.1, "1"),
        _row(0.2, 0.3, 0.5, "2"),
        _row(0.3, 0.4, 0.3, "X"),
    ]
    m = compute_champion_metrics(rows)
    assert m["n"] == 3

    p = np.array([[0.7, 0.2, 0.1], [0.2, 0.3, 0.5], [0.3, 0.4, 0.3]])
    y = np.array([[1, 0, 0], [0, 0, 1], [0, 1, 0]], dtype=float)
    assert m["brier"] == round(float(brier(p, y).mean()), 6)
    assert m["rps"] == round(float(rps(p, y).mean()), 6)
    assert m["log_loss"] == round(float(log_loss(p, y).mean()), 6)


def test_update_only_touches_champion() -> None:
    prior = {
        "snapshot_id": "x",
        "matches_settled": 3,
        "brier": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "rps": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "log_loss": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "kill_criteria_check": {"tripped": False},
    }
    rows = [_row(0.7, 0.2, 0.1, "1")]
    out = update_evaluation_metrics(prior, rows)
    # champion populated, ablation arms untouched (null)
    assert out["brier"]["M_STAR"] is not None
    for arm in ("M0", "M1", "M2", "M3"):
        assert out["brier"][arm] is None
        assert out["log_loss"][arm] is None
    # sample size explicit; kill-criteria preserved verbatim
    assert out["champion_metric_n"] == 1
    assert out["kill_criteria_check"] == {"tripped": False}


def test_update_empty_keeps_champion_null() -> None:
    prior = {
        "brier": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "rps": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
        "log_loss": {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None},
    }
    out = update_evaluation_metrics(prior, [])
    assert out["brier"]["M_STAR"] is None
    assert out["champion_metric_n"] == 0
    # Empty ledger -> empty diagram, matching the carry-forward placeholder.
    assert out["reliability_diagram"] == []


def test_reliability_diagram_empty_ledger() -> None:
    assert compute_reliability_diagram([]) == []


def test_reliability_diagram_bins_by_confidence_and_sums_to_n() -> None:
    rows = [
        _row(0.70, 0.20, 0.10, "1"),  # confidence 0.70 (bin [0.7,0.8)), hit
        _row(0.72, 0.18, 0.10, "X"),  # confidence 0.72 (bin [0.7,0.8)), miss
        _row(0.20, 0.30, 0.50, "2"),  # confidence 0.50 (bin [0.5,0.6)), hit
    ]
    diagram = compute_reliability_diagram(rows)

    # One point per match -> bin counts sum to the number of rows.
    assert sum(b["n"] for b in diagram) == len(rows)
    # Only non-empty bins are emitted; here two distinct deciles are populated.
    assert len(diagram) == 2

    by_lower = {b["bin_lower"]: b for b in diagram}
    # [0.5, 0.6): single hit -> realised frequency 1.0, mean confidence 0.5.
    assert by_lower[0.5]["n"] == 1
    assert by_lower[0.5]["frequency_realized"] == 1.0
    assert by_lower[0.5]["p_model_mean"] == 0.5
    # [0.7, 0.8): one hit + one miss -> realised frequency 0.5, mean conf 0.71.
    assert by_lower[0.7]["n"] == 2
    assert by_lower[0.7]["frequency_realized"] == 0.5
    assert by_lower[0.7]["p_model_mean"] == 0.71

    # Every bin validates against the schema's [0,1] domain.
    for b in diagram:
        assert 0.0 <= b["bin_lower"] <= 1.0
        assert 0.0 <= b["bin_upper"] <= 1.0
        assert 0.0 <= b["p_model_mean"] <= 1.0
        assert 0.0 <= b["frequency_realized"] <= 1.0
        assert isinstance(b["n"], int)


def test_reliability_diagram_confidence_one_lands_in_last_bin() -> None:
    # A degenerate certain forecast (confidence 1.0) must fall in [0.9, 1.0],
    # the only right-closed decile, not be dropped.
    diagram = compute_reliability_diagram([_row(1.0, 0.0, 0.0, "1")])
    assert len(diagram) == 1
    assert diagram[0]["bin_lower"] == 0.9
    assert diagram[0]["bin_upper"] == 1.0
    assert diagram[0]["n"] == 1
