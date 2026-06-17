"""
tests/test_match_score_join.py
==============================
cp-14, commit 2. The settled-score overlay is display-only and additive; these
tests pin the regulation-outcome mapping, the additive write, idempotency, and
the no-source fallback.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from evaluation.match_score_join import (
    join_scores,
    regulation_outcome,
    resolve_scored,
)


def test_regulation_outcome() -> None:
    assert regulation_outcome(2, 0) == "H"
    assert regulation_outcome(0, 1) == "A"
    assert regulation_outcome(1, 1) == "D"


def _write_match(d: Path, mid: str) -> Path:
    doc = {
        "match_id": mid,
        "round": "GRP",
        "kickoff_utc": "2026-06-11T19:00:00+00:00",
        "home": {"fifa_code": "MEX", "display_name": "Mexico"},
        "away": {"fifa_code": "RSA", "display_name": "South Africa"},
        "p_model_1x2": {"H": 0.73, "D": 0.16, "A": 0.11},
    }
    p = d / f"{mid}.json"
    p.write_text(json.dumps(doc, indent=2) + "\n")
    return p


def test_join_scores_adds_fields(tmp_path: Path) -> None:
    _write_match(tmp_path, "M01")
    _write_match(tmp_path, "M02")
    scored = pd.DataFrame(
        [
            {"match_id": "M01", "home_goals": 2, "away_goals": 0, "settled_at": "2026-06-11T21:00:00Z"},
        ]
    )
    n = join_scores(tmp_path, scored)
    assert n == 1

    m01 = json.loads((tmp_path / "M01.json").read_text())
    assert m01["score"] == {"home": 2, "away": 0}
    assert m01["outcome_realized"] == "H"
    assert m01["settled_at_utc"] == "2026-06-11T21:00:00Z"
    # model block untouched
    assert m01["p_model_1x2"] == {"H": 0.73, "D": 0.16, "A": 0.11}

    # unplayed match left alone
    m02 = json.loads((tmp_path / "M02.json").read_text())
    assert "score" not in m02


def test_join_scores_idempotent(tmp_path: Path) -> None:
    _write_match(tmp_path, "M01")
    scored = pd.DataFrame(
        [{"match_id": "M01", "home_goals": 1, "away_goals": 1, "settled_at": "2026-06-11T21:00:00Z"}]
    )
    join_scores(tmp_path, scored)
    first = (tmp_path / "M01.json").read_text()
    join_scores(tmp_path, scored)
    second = (tmp_path / "M01.json").read_text()
    assert first == second
    assert json.loads(first)["outcome_realized"] == "D"


def test_join_scores_empty_is_noop(tmp_path: Path) -> None:
    _write_match(tmp_path, "M01")
    assert join_scores(tmp_path, pd.DataFrame()) == 0


def test_resolve_scored_no_source(monkeypatch, tmp_path: Path) -> None:
    for var in ("DIRECT_URL", "DATABASE_URL", "POSTGRES_URL", "MATCH_OUTCOMES_PARQUET"):
        monkeypatch.delenv(var, raising=False)
    # point the parquet at a path that does not exist
    res = resolve_scored(parquet_path=tmp_path / "nope.parquet")
    assert res["status"] == "no_source"
    assert res["scored"] is None
