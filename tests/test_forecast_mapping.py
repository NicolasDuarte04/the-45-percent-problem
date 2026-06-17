"""
tests/test_forecast_mapping.py
==============================
cp-14, commit 1. The id mapping is the one place the calibration claim can die
silently, so its bijection and its hard-stop behaviour are tested directly.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from evaluation.forecast_mapping import (
    MappingError,
    build_model_map,
    map_settled,
    normalise_outcomes,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def model_map() -> pd.DataFrame:
    return build_model_map()


def _outcome(row: pd.Series, hg: int, ag: int, fd: str, settled: str) -> dict:
    """Build a settled-outcome dict (ingest camelCase) from a model-map row."""
    return {
        "matchId": fd,
        "stage": "group",
        "homeTeam": row["home_code"],
        "awayTeam": row["away_code"],
        "homeGoals": hg,
        "awayGoals": ag,
        "settledAt": settled,
    }


# --------------------------------------------------------------------------- #
# Model-side bijection
# --------------------------------------------------------------------------- #

def test_model_map_is_exact_bijection(model_map: pd.DataFrame) -> None:
    assert len(model_map) == 72
    assert model_map["match_id"].nunique() == 72
    assert model_map["batch_slot"].nunique() == 72
    # ordered (home, away) key is unique: orientation is part of identity
    keys = model_map["home_code"] + ">" + model_map["away_code"]
    assert keys.nunique() == 72


def test_batch_activation_predates_earliest_kickoff(model_map: pd.DataFrame) -> None:
    """Every scored forecast must be provably pre-outcome: the champion batch
    was activated before the first group match kicked off."""
    active = json.loads(
        (PROJECT_ROOT / "data" / "calibration" / "active_batch.json").read_text()
    )
    activated = pd.to_datetime(active["activated_at_utc"], utc=True)
    earliest_kickoff = pd.to_datetime(model_map["kickoff_utc"], utc=True).min()
    assert activated < earliest_kickoff, (
        f"batch activated {activated} is not before earliest kickoff {earliest_kickoff}"
    )


# --------------------------------------------------------------------------- #
# Settled-side mapping: happy path
# --------------------------------------------------------------------------- #

def test_map_settled_maps_known_fixtures(model_map: pd.DataFrame) -> None:
    a, b = model_map.iloc[0], model_map.iloc[1]
    outcomes = [
        _outcome(a, 2, 0, "FD1001", "2026-06-11T21:00:00Z"),
        _outcome(b, 1, 1, "FD1002", "2026-06-12T21:00:00Z"),
    ]
    result = map_settled(model_map, outcomes)
    scored = result["scored"]
    assert len(scored) == 2
    assert set(scored["match_id"]) == {a["match_id"], b["match_id"]}
    assert result["deferred"] == []
    # fd id and slot carried through
    row = scored[scored["match_id"] == a["match_id"]].iloc[0]
    assert row["fd_match_id"] == "FD1001"
    assert row["batch_slot"] == a["batch_slot"]


def test_knockout_outcomes_are_deferred_not_scored(model_map: pd.DataFrame) -> None:
    a = model_map.iloc[0]
    ko = _outcome(a, 1, 0, "FD2001", "2026-07-05T21:00:00Z")
    ko["stage"] = "qf"
    result = map_settled(model_map, [ko])
    assert result["scored"].empty
    assert result["deferred"] == ["FD2001"]


def test_empty_outcomes(model_map: pd.DataFrame) -> None:
    result = map_settled(model_map, [])
    assert result["scored"].empty
    assert result["deferred"] == []


# --------------------------------------------------------------------------- #
# Settled-side mapping: hard stops
# --------------------------------------------------------------------------- #

def test_unknown_team_pair_halts(model_map: pd.DataFrame) -> None:
    bogus = {
        "matchId": "FD9999",
        "stage": "group",
        "homeTeam": "ZZZ",
        "awayTeam": "YYY",
        "homeGoals": 0,
        "awayGoals": 0,
        "settledAt": "2026-06-12T21:00:00Z",
    }
    with pytest.raises(MappingError, match="no group fixture"):
        map_settled(model_map, [bogus])


def test_swapped_orientation_halts(model_map: pd.DataFrame) -> None:
    a = model_map.iloc[0]
    swapped = {
        "matchId": "FD3001",
        "stage": "group",
        "homeTeam": a["away_code"],  # reversed
        "awayTeam": a["home_code"],
        "homeGoals": 1,
        "awayGoals": 2,
        "settledAt": "2026-06-11T21:00:00Z",
    }
    with pytest.raises(MappingError, match="no group fixture"):
        map_settled(model_map, [swapped])


def test_phantom_duplicate_collision_halts(model_map: pd.DataFrame) -> None:
    a = model_map.iloc[0]
    outcomes = [
        _outcome(a, 2, 0, "FD4001", "2026-06-11T21:00:00Z"),
        _outcome(a, 0, 0, "FD4002", "2026-06-11T21:00:00Z"),  # duplicate fixture
    ]
    with pytest.raises(MappingError, match="collide"):
        map_settled(model_map, outcomes)


def test_canonical_id_disagrees_with_teams_halts(model_map: pd.DataFrame) -> None:
    """A row stored under one M{NN} id but carrying another fixture's teams is a
    data error (the mixed admin/cron id reality). Halt."""
    a, b = model_map.iloc[0], model_map.iloc[1]
    # id says a.match_id (e.g. M01) but teams are b's pair -> resolves to b.
    bad = {
        "matchId": a["match_id"],
        "stage": "group",
        "homeTeam": b["home_code"],
        "awayTeam": b["away_code"],
        "homeGoals": 1,
        "awayGoals": 0,
        "settledAt": "2026-06-12T21:00:00Z",
    }
    with pytest.raises(MappingError, match="disagrees with its team identity"):
        map_settled(model_map, [bad])


def test_canonical_id_matching_teams_ok(model_map: pd.DataFrame) -> None:
    """A row stored under its own M{NN} id with the right teams maps cleanly."""
    a = model_map.iloc[0]
    good = _outcome(a, 2, 1, a["match_id"], "2026-06-11T21:00:00Z")
    result = map_settled(model_map, [good])
    assert len(result["scored"]) == 1
    assert result["scored"].iloc[0]["match_id"] == a["match_id"]


def test_settle_before_kickoff_halts(model_map: pd.DataFrame) -> None:
    a = model_map.iloc[0]
    early = _outcome(a, 1, 0, "FD5001", "2020-01-01T00:00:00Z")  # absurdly early
    with pytest.raises(MappingError, match="predates"):
        map_settled(model_map, [early])


# --------------------------------------------------------------------------- #
# Normalisation
# --------------------------------------------------------------------------- #

def test_normalise_accepts_snake_case() -> None:
    df = pd.DataFrame(
        [
            {
                "match_id": "FD1",
                "stage": "group",
                "home_team": "MEX",
                "away_team": "CAN",
                "home_goals": 1,
                "away_goals": 0,
                "settled_at": "2026-06-11T21:00:00Z",
            }
        ]
    )
    out = normalise_outcomes(df)
    assert list(out.columns) == [
        "match_id",
        "home_code",
        "away_code",
        "home_goals",
        "away_goals",
        "settled_at",
        "stage",
    ]
    assert out.iloc[0]["home_code"] == "MEX"


def test_normalise_missing_columns_raises() -> None:
    with pytest.raises(MappingError, match="missing required columns"):
        normalise_outcomes([{"matchId": "FD1", "stage": "group"}])
