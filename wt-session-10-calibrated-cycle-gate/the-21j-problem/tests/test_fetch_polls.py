"""
tests/test_fetch_polls.py
=========================
Schema + smoke tests for the 21J poll-ingestion pipeline.

Run from the-21j-problem/ root:
    python -m pytest tests/ -v
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd
import pytest
from pydantic import ValidationError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import ingestion.fetch_polls as fp  # noqa: E402
from schemas import (  # noqa: E402
    CANONICAL_POLLSTERS,
    SHARE_SUM_TARGET,
    SHARE_SUM_TOLERANCE,
    Poll,
    make_poll_id,
    standardise_pollster,
)


def _as_date(value) -> date:
    """Coerce a parquet-read date / timestamp back to a python date."""
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.date()
    return date.fromisoformat(str(value))


@pytest.fixture(scope="module")
def pipeline_output() -> pd.DataFrame:
    """Run the full pipeline once and return the written Parquet as a frame."""
    path = fp.run()
    assert isinstance(path, Path)
    assert path.exists(), f"expected output Parquet at {path}"
    return pd.read_parquet(path, engine="pyarrow")


# =============================================================================
# Smoke test — run() returns a path and produces a non-empty Parquet
# =============================================================================


def test_run_returns_path(pipeline_output: pd.DataFrame) -> None:
    assert len(pipeline_output) > 0
    assert fp.OUTPUT_PARQUET.exists()


def test_output_columns(pipeline_output: pd.DataFrame) -> None:
    assert list(pipeline_output.columns) == fp.OUTPUT_COLUMNS


def test_sorted_by_natural_key(pipeline_output: pd.DataFrame) -> None:
    keys = pipeline_output[["fieldwork_end", "poll_id"]].apply(
        lambda r: (_as_date(r["fieldwork_end"]), r["poll_id"]), axis=1
    ).tolist()
    assert keys == sorted(keys)


# =============================================================================
# No empty source_url — every row carries a real http(s) URL
# =============================================================================


def test_every_row_has_source_url(pipeline_output: pd.DataFrame) -> None:
    urls = pipeline_output["source_url"].tolist()
    assert all(isinstance(u, str) and u.strip() for u in urls)
    assert all(u.lower().startswith(("http://", "https://")) for u in urls)


# =============================================================================
# Sum-tolerance check on the written output
# =============================================================================


def test_share_sum_within_tolerance(pipeline_output: pd.DataFrame) -> None:
    totals = (
        pipeline_output["cepeda_pct"]
        + pipeline_output["espriella_pct"]
        + pipeline_output["other_pct"]
        + pipeline_output["undecided_pct"]
    )
    assert ((totals - SHARE_SUM_TARGET).abs() <= SHARE_SUM_TOLERANCE).all(), (
        f"rows outside tolerance: {totals.tolist()}"
    )


# =============================================================================
# Every output row re-validates against the Poll schema
# =============================================================================


def test_rows_validate_against_schema(pipeline_output: pd.DataFrame) -> None:
    for _, row in pipeline_output.iterrows():
        Poll(
            poll_id=str(row["poll_id"]),
            pollster=str(row["pollster"]),
            fieldwork_start=_as_date(row["fieldwork_start"]),
            fieldwork_end=_as_date(row["fieldwork_end"]),
            publication_date=_as_date(row["publication_date"]),
            sample_size=int(row["sample_size"]),
            cepeda_pct=float(row["cepeda_pct"]),
            espriella_pct=float(row["espriella_pct"]),
            other_pct=float(row["other_pct"]),
            undecided_pct=float(row["undecided_pct"]),
            abstention_pct=None if pd.isna(row["abstention_pct"]) else float(row["abstention_pct"]),
            margin_error=None if pd.isna(row["margin_error"]) else float(row["margin_error"]),
            source_url=str(row["source_url"]),
            ingested_at=pd.Timestamp(row["ingested_at"]).to_pydatetime(),
        )


def test_pollsters_standardised(pipeline_output: pd.DataFrame) -> None:
    assert set(pipeline_output["pollster"].unique()).issubset(CANONICAL_POLLSTERS)


def test_sample_size_positive(pipeline_output: pd.DataFrame) -> None:
    assert (pipeline_output["sample_size"] > 0).all()


# =============================================================================
# Validator unit tests (no pipeline needed)
# =============================================================================


def _valid_kwargs() -> dict:
    return dict(
        poll_id="atlasintel_2026-06-02",
        pollster="AtlasIntel",
        fieldwork_start=date(2026, 6, 1),
        fieldwork_end=date(2026, 6, 2),
        publication_date=date(2026, 6, 2),
        sample_size=2030,
        cepeda_pct=42.6,
        espriella_pct=50.3,
        other_pct=6.2,
        undecided_pct=0.5,
        abstention_pct=None,
        margin_error=2.0,
        source_url="https://example.com/poll",
    )


def test_valid_poll_constructs() -> None:
    poll = Poll(**_valid_kwargs())
    assert poll.pollster == "AtlasIntel"
    assert abs(poll.share_sum - 99.6) < 1e-9


def test_bad_share_sum_rejected() -> None:
    kw = _valid_kwargs()
    kw["other_pct"] = 30.0  # pushes the sum well outside 100 +/- 2
    with pytest.raises(ValidationError):
        Poll(**kw)


def test_empty_source_url_rejected() -> None:
    kw = _valid_kwargs()
    kw["source_url"] = ""
    with pytest.raises(ValidationError):
        Poll(**kw)


def test_non_http_source_url_rejected() -> None:
    kw = _valid_kwargs()
    kw["source_url"] = "ftp://example.com/x"
    with pytest.raises(ValidationError):
        Poll(**kw)


def test_nonpositive_sample_rejected() -> None:
    kw = _valid_kwargs()
    kw["sample_size"] = 0
    with pytest.raises(ValidationError):
        Poll(**kw)


def test_reversed_fieldwork_dates_rejected() -> None:
    kw = _valid_kwargs()
    kw["fieldwork_start"] = date(2026, 6, 3)  # after fieldwork_end
    with pytest.raises(ValidationError):
        Poll(**kw)


def test_pollster_standardisation() -> None:
    assert standardise_pollster("Atlas Intel") == "AtlasIntel"
    assert standardise_pollster("Guarumo/EcoAnalítica") == "Guarumo"
    assert standardise_pollster("Centro Nacional de Consultoría") == "CNC"
    assert standardise_pollster("Invamer Gallup") == "Invamer"


def test_poll_id_deterministic() -> None:
    a = make_poll_id("AtlasIntel", date(2026, 6, 2))
    b = make_poll_id("AtlasIntel", date(2026, 6, 2))
    assert a == b == "atlasintel_2026-06-02"
