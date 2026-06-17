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
