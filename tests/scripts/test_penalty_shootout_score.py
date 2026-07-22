"""
tests/scripts/test_penalty_shootout_score.py
============================================
cp-22 regression tests for penalty-shootout score corruption.

Football-Data v4 reports ``score.fullTime`` for a penalty-decided knockout as
the POST-shootout aggregate (end-of-extra-time score PLUS the shootout tally),
while exposing the shootout tally separately in ``score.penalties``. Read
verbatim, a 1-1 that went to penalties was stored as a phantom 4-5 away win.
These tests lock in the fix at the ingestion boundary and the shared reader:

  * ``ingestion.fetch_match_outcomes.clean_and_enrich`` stores the REGULATION
    (incl. extra time) score and keeps the shootout apart (the existing
    ``shootoutWinner`` field plus ``meta.shootout`` for the tally);
  * group matches (which never carry penalties) stay byte-identical;
  * ``evaluation.settled_source`` surfaces the shootout fields additively from
    ``meta`` with no schema migration.

The producer/card settle path (a penalty knockout renders the regulation draw
plus the shootout result, never the summed scoreline) is covered in
tests/scripts/test_live_knockout_matches.py.

Run:
  pytest tests/scripts/test_penalty_shootout_score.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ingestion.fetch_match_outcomes import (  # noqa: E402
    _regulation_score,
    clean_and_enrich,
)
from evaluation.settled_source import (  # noqa: E402
    _extract_shootout,
    _shootout_from_meta,
)


def _fd_match(
    *,
    source_id: int,
    stage: str,
    home: str,
    away: str,
    full: tuple[int, int],
    pens: "tuple[int, int] | None" = None,
) -> dict:
    """A minimal Football-Data v4 FINISHED match row."""
    score: dict = {"fullTime": {"home": full[0], "away": full[1]}}
    if pens is not None:
        score["penalties"] = {"home": pens[0], "away": pens[1]}
    return {
        "id": source_id,
        "status": "FINISHED",
        "stage": stage,
        "homeTeam": {"name": home},
        "awayTeam": {"name": away},
        "score": score,
        "utcDate": "2026-06-28T19:00:00Z",
        "lastUpdated": "2026-06-28T21:05:00Z",
    }


def _only(outcomes: list, match_id: str) -> dict:
    rows = [o for o in outcomes if o["matchId"] == match_id]
    assert len(rows) == 1, (match_id, outcomes)
    return rows[0]


# ── _regulation_score unit ───────────────────────────────────────────────────


def test_regulation_score_subtracts_penalty_inflated_fulltime():
    # GER-PAR: fullTime 4-5 is regulation 1-1 plus shootout 3-4.
    assert _regulation_score(4, 5, 3, 4) == (1, 1)
    # NED-MAR: fullTime 3-4 is regulation 1-1 plus shootout 2-3.
    assert _regulation_score(3, 4, 2, 3) == (1, 1)


def test_regulation_score_passes_through_already_level_fulltime():
    # Some feeds report fullTime as the regulation draw directly.
    assert _regulation_score(1, 1, 3, 4) == (1, 1)
    assert _regulation_score(0, 0, 5, 4) == (0, 0)


def test_regulation_score_returns_none_when_irreconcilable():
    # A non-draw that does not reduce to a level result is not a clean penalty
    # result; the caller must keep fullTime rather than invent a score.
    assert _regulation_score(2, 0, 1, 0) == (None, None)
    assert _regulation_score(3, 1, 5, 4) == (None, None)


# ── clean_and_enrich: penalty knockout stores regulation + shootout ──────────


def test_penalty_knockout_stores_regulation_not_inflated_score():
    raw = {
        "matches": [
            _fd_match(
                source_id=537415,
                stage="LAST_32",
                home="Germany",
                away="Paraguay",
                full=(4, 5),
                pens=(3, 4),
            )
        ]
    }
    out = _only(clean_and_enrich(raw), "FD537415")
    assert out["stage"] == "r32"
    # Regulation 1-1, NEVER the summed 4-5.
    assert (out["homeGoals"], out["awayGoals"]) == (1, 1)
    # Paraguay (away) won the shootout 4-3.
    assert out["shootoutWinner"] == "PAR"
    assert out["meta"] == {"shootout": {"home": 3, "away": 4}}


def test_penalty_knockout_already_regulation_fulltime():
    raw = {
        "matches": [
            _fd_match(
                source_id=999,
                stage="ROUND_OF_16",
                home="Netherlands",
                away="Morocco",
                full=(1, 1),
                pens=(2, 3),
            )
        ]
    }
    out = _only(clean_and_enrich(raw), "FD999")
    assert (out["homeGoals"], out["awayGoals"]) == (1, 1)
    assert out["shootoutWinner"] == "MAR"
    assert out["meta"] == {"shootout": {"home": 2, "away": 3}}


def test_group_match_unchanged_no_shootout():
    raw = {
        "matches": [
            _fd_match(
                source_id=1,
                stage="GROUP_STAGE",
                home="Mexico",
                away="South Africa",
                full=(2, 0),
            )
        ]
    }
    out = _only(clean_and_enrich(raw), "FD1")
    assert out["stage"] == "group"
    assert (out["homeGoals"], out["awayGoals"]) == (2, 0)
    assert "shootoutWinner" not in out
    assert "meta" not in out


def test_irreconcilable_penalty_keeps_fulltime_without_shootout():
    raw = {
        "matches": [
            _fd_match(
                source_id=2,
                stage="QUARTER_FINALS",
                home="Brazil",
                away="Japan",
                full=(3, 1),
                pens=(5, 4),
            )
        ]
    }
    out = _only(clean_and_enrich(raw), "FD2")
    # 3-1 minus 5-4 is negative; cannot reconcile, so fullTime is kept as-is and
    # no shootout is attached (which would fail the endpoint's drawn-only guard).
    assert (out["homeGoals"], out["awayGoals"]) == (3, 1)
    assert "shootoutWinner" not in out
    assert "meta" not in out


# ── cp-43: third-place playoff stage mapping ─────────────────────────────────


def test_third_place_playoff_stage_is_mapped_not_skipped():
    # Regression for cp-43. Football-Data v4 labels the bronze match
    # THIRD_PLACE, a stage string STAGE_MAP did not carry, so clean_and_enrich
    # dropped it as an "Unknown stage" and the archive stalled at 103 of 104
    # settled. The row must now be written with the lowercase "3p" stage.
    raw = {
        "matches": [
            _fd_match(
                source_id=537389,
                stage="THIRD_PLACE",
                home="France",
                away="England",
                full=(2, 1),
            )
        ]
    }
    out = _only(clean_and_enrich(raw), "FD537389")
    assert out["stage"] == "3p"
    assert out["homeTeam"] == "FRA"
    assert out["awayTeam"] == "ENG"
    assert (out["homeGoals"], out["awayGoals"]) == (2, 1)


def test_third_place_playoff_with_shootout_stores_regulation():
    # The bronze match can go to penalties too; the cp-22 regulation/shootout
    # split must still apply once the stage is accepted.
    raw = {
        "matches": [
            _fd_match(
                source_id=537389,
                stage="THIRD_PLACE",
                home="France",
                away="England",
                full=(5, 6),
                pens=(4, 5),
            )
        ]
    }
    # fullTime 5-6 is regulation 1-1 plus the shootout tally 4-5.
    out = _only(clean_and_enrich(raw), "FD537389")
    assert out["stage"] == "3p"
    assert (out["homeGoals"], out["awayGoals"]) == (1, 1)
    assert out["shootoutWinner"] == "ENG"
    assert out["meta"] == {"shootout": {"home": 4, "away": 5}}


# ── settled_source shootout extraction ───────────────────────────────────────


def test_shootout_from_meta_variants():
    assert _shootout_from_meta({"shootout": {"home": 3, "away": 4}}) == (3, 4)
    # A JSON string is a possible parquet encoding of the jsonb column.
    assert _shootout_from_meta('{"shootout": {"home": 2, "away": 3}}') == (2, 3)
    assert _shootout_from_meta(None) is None
    assert _shootout_from_meta({}) is None
    assert _shootout_from_meta({"shootout": {"home": None, "away": 4}}) is None
    assert _shootout_from_meta("not json") is None


def test_extract_shootout_derives_columns_from_meta():
    df = pd.DataFrame(
        [
            {"match_id": "FD1", "meta": {"shootout": {"home": 3, "away": 4}}},
            {"match_id": "FD2", "meta": {}},
            {"match_id": "FD3", "meta": None},
        ]
    )
    out = _extract_shootout(df)
    sh = list(out["shootout_home"])
    sa = list(out["shootout_away"])
    # Row 0 carries the tally; rows without a shootout are null (pandas may
    # represent the null column as NaN, which the settle path coerces away).
    assert sh[0] == 3 and sa[0] == 4
    assert pd.isna(sh[1]) and pd.isna(sh[2])
    assert pd.isna(sa[1]) and pd.isna(sa[2])
