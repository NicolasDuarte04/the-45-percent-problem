"""
tests/test_house_effects.py
===========================
Schema / shape + smoke tests for the Session 03 house-effects calibration.

Run from the-21j-problem/ root:
    python -m pytest tests/test_house_effects.py -v
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import model.calibrate_house_effects as che  # noqa: E402


@pytest.fixture(scope="module")
def record() -> dict:
    """Run the full calibration once (force) and return the parsed JSON."""
    path = che.run(force=True)
    assert isinstance(path, Path)
    assert path.exists(), f"expected JSON at {path}"
    return json.loads(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def corpus() -> pd.DataFrame:
    return pd.read_csv(che.CORPUS_CSV)


# =============================================================================
# Smoke + shape
# =============================================================================


def test_run_returns_path(record: dict) -> None:
    assert che.OUTPUT_JSON.exists()


def test_top_level_shape(record: dict) -> None:
    for key in (
        "recency_halflife_days",
        "recency_error_curve",
        "house_effects",
        "leave_one_out",
        "assumptions",
        "corpus",
        "corpus_sha",
        "generated_at",
    ):
        assert key in record, f"missing top-level key: {key}"


def test_halflife_within_range(record: dict) -> None:
    lo, hi = record["recency_halflife_range"]
    h = record["recency_halflife_days"]
    assert lo <= h <= hi, f"half-life {h} outside [{lo}, {hi}]"


def test_error_curve_nonempty(record: dict) -> None:
    curve = record["recency_error_curve"]
    assert len(curve) >= 2
    assert all(isinstance(v, (int, float)) for v in curve.values())


# =============================================================================
# House effects — every pollster has both bloc biases + n_elections
# =============================================================================


def test_every_pollster_has_bias_and_n(record: dict) -> None:
    effects = record["house_effects"]
    assert len(effects) > 0
    for pollster, rec in effects.items():
        for field in ("left_bloc_bias", "right_bloc_bias", "left_bloc_std", "right_bloc_std"):
            assert field in rec, f"{pollster} missing {field}"
            assert isinstance(rec[field], (int, float))
        assert "n_election_years" in rec and rec["n_election_years"] >= 1
        assert "n_rounds" in rec and rec["n_rounds"] >= 1
        assert rec["confidence"] in {"high", "low"}


def test_confidence_matches_year_floor(record: dict) -> None:
    floor = record["assumptions"]["house_effect_min_election_years"]
    for pollster, rec in record["house_effects"].items():
        expected = "high" if rec["n_election_years"] >= floor else "low"
        assert rec["confidence"] == expected, f"{pollster} confidence mismatch"


def test_2026_relevant_pollsters_present(record: dict) -> None:
    # The five firms in the 2026 runoff set must each have an estimate.
    for p in ("AtlasIntel", "CNC", "GAD3", "Guarumo", "Invamer"):
        assert p in record["house_effects"], f"{p} missing from house_effects"


# =============================================================================
# Assumptions + leave-one-out recorded
# =============================================================================


def test_bloc_map_recorded(record: dict) -> None:
    bm = record["assumptions"]["bloc_map"]
    assert bm["left"]["2026_r2"] == "Cepeda"
    assert bm["right"]["2026_r2"] == "De la Espriella"
    # every corpus round mapped on both sides
    for rnd in ("2018_r1", "2018_r2", "2022_r1", "2022_r2"):
        assert rnd in bm["left"] and rnd in bm["right"]


def test_leave_one_out_reported(record: dict) -> None:
    loo = record["leave_one_out"]
    for rnd in ("2018_r1", "2018_r2", "2022_r1", "2022_r2"):
        assert rnd in loo
        assert "halflife_delta_days" in loo[rnd]
        assert "max_bias_delta_pp" in loo[rnd]
    summary = loo["summary"]
    assert "thick_enough_to_freeze" in summary
    assert isinstance(summary["thick_enough_to_freeze"], bool)


# =============================================================================
# Corpus integrity — no row missing a source_url; covers four rounds
# =============================================================================


def test_no_row_missing_source_url(corpus: pd.DataFrame) -> None:
    urls = corpus["source_url"].fillna("").astype(str).str.strip()
    assert (urls != "").all(), "a corpus row is missing source_url"
    assert urls.str.startswith(("http://", "https://")).all()


def test_corpus_covers_four_rounds(corpus: pd.DataFrame) -> None:
    assert set(corpus["election_id"].unique()) == {
        "2018_r1",
        "2018_r2",
        "2022_r1",
        "2022_r2",
    }


def test_corpus_sha_matches(record: dict) -> None:
    from utils.hasher import hash_file

    assert record["corpus_sha"] == hash_file(che.CORPUS_CSV)


# =============================================================================
# Calibration-function unit checks (no full run)
# =============================================================================


def test_halflife_clamped_to_range() -> None:
    df = pd.read_csv(che.CORPUS_CSV)
    df = che._clean(df)
    h, curve = che.calibrate_halflife(df)
    assert che.HALFLIFE_MIN <= h <= che.HALFLIFE_MAX
    assert len(curve) == len(che.HALFLIFE_GRID)


def test_weights_decay_with_distance() -> None:
    s = pd.Series([0, 10, 20])
    w = che._weights(s, halflife=10.0)
    assert abs(w.iloc[0] - 1.0) < 1e-9
    assert abs(w.iloc[1] - 0.5) < 1e-9
    assert abs(w.iloc[2] - 0.25) < 1e-9
