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
    # is_neutral is joined from the locked fixtures for every fixture (gates the
    # neutral-venue orientation canonicalization in map_settled)
    assert "is_neutral" in model_map.columns
    assert model_map["is_neutral"].notna().all()
    assert model_map["is_neutral"].dtype == bool


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


def test_non_neutral_reversed_orientation_halts(model_map: pd.DataFrame) -> None:
    """A reversed-orientation settled row against a NON-neutral fixture must NOT
    be canonicalized: a real home advantage makes the swap lossy. It falls
    through to the unmapped HALT. All real group fixtures are neutral, so this
    invariant is exercised with a synthetic non-neutral model map (it documents
    the rule for knockouts / future data, per the OSF note)."""
    mm = model_map.copy()
    mm["is_neutral"] = False  # force every fixture non-neutral
    a = mm.iloc[0]
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
        map_settled(mm, [swapped])


def test_neutral_orientation_canonicalized_m46(model_map: pd.DataFrame) -> None:
    """The M46 case (the FD537406 production halt). Football-Data reports
    Colombia vs DR Congo; the locked neutral fixture M46 is DR Congo (home) vs
    Colombia (away). The reversed row is canonicalized to the locked orientation
    (home/away codes AND goals swapped together) and Colombia's result is scored
    against M46's frozen distribution."""
    from evaluation.reconstruct_forecasts import (
        build_ledger_rows,
        reconstruct_distributions,
    )

    m46 = model_map[model_map["match_id"] == "M46"].iloc[0]
    # Locked orientation: DR Congo home, Colombia away, at a neutral venue.
    assert m46["home_code"] == "COD"
    assert m46["away_code"] == "COL"
    assert bool(m46["is_neutral"]) is True

    # Settle ~2h after the fixture's own kickoff (derived, so the test does not
    # break when kickoff times are refreshed).
    settled_at = (
        pd.to_datetime(m46["kickoff_utc"], utc=True) + pd.Timedelta(hours=2)
    ).isoformat()
    # Football-Data orientation: Colombia (home) beat DR Congo (away) 2-1.
    swapped = {
        "matchId": "FD537406",
        "stage": "group",
        "homeTeam": m46["away_code"],  # COL, reversed vs locked
        "awayTeam": m46["home_code"],  # COD
        "homeGoals": 2,  # Colombia
        "awayGoals": 1,  # DR Congo
        "settledAt": settled_at,
    }
    result = map_settled(model_map, [swapped])
    scored = result["scored"]
    assert len(scored) == 1
    row = scored.iloc[0]
    # Resolved to M46 in the LOCKED orientation with the score swapped to match.
    assert row["match_id"] == "M46"
    assert row["home_code"] == "COD"
    assert row["away_code"] == "COL"
    assert int(row["home_goals"]) == 1  # DR Congo (was away)
    assert int(row["away_goals"]) == 2  # Colombia (was home)
    assert row["fd_match_id"] == "FD537406"

    # The canonicalization is recorded (FD id -> resolved M{NN}), not silent.
    assert len(result["canonicalized"]) == 1
    canon = result["canonicalized"][0]
    assert canon["fd_match_id"] == "FD537406"
    assert canon["resolved_match_id"] == "M46"
    assert canon["rule"] == "neutral_orientation_canonicalized"

    # Scored against M46's frozen distribution: Colombia (the away side in the
    # locked orientation) won, so the realized outcome is an away win ("2") and
    # the scored probability is M46's frozen p_away.
    dists = reconstruct_distributions(model_map)
    ledger = build_ledger_rows(scored, dists, "test-sha")
    assert len(ledger) == 1
    lr = ledger[0]
    assert lr["match_id"] == "M46"
    assert lr["outcome_realized"] == "2"
    m46_dist = dists[dists["match_id"] == "M46"].iloc[0]
    assert lr["p_model_on_realized"] == round(float(m46_dist["p_away"]), 6)


def test_score_conflict_halts(model_map: pd.DataFrame) -> None:
    """Two settled rows on one fixture with different scores: halt, named."""
    a = model_map.iloc[0]
    outcomes = [
        _outcome(a, 2, 0, "FD4001", "2026-06-11T21:00:00Z"),
        _outcome(a, 0, 0, "FD4002", "2026-06-11T21:00:00Z"),
    ]
    with pytest.raises(MappingError, match="score-conflict"):
        map_settled(model_map, outcomes)


def test_double_claim_halts(model_map: pd.DataFrame) -> None:
    """Two distinct source ids on one fixture at the same score: double-claim
    (the mixed admin M{NN} + cron FD{id} pathology). Halt, named."""
    a = model_map.iloc[0]
    outcomes = [
        _outcome(a, 1, 0, "FD4001", "2026-06-11T21:00:00Z"),
        _outcome(a, 1, 0, a["match_id"], "2026-06-11T21:00:00Z"),  # admin M{NN} dup id
    ]
    with pytest.raises(MappingError, match="double-claim"):
        map_settled(model_map, outcomes)


def test_exact_identical_duplicate_collapses(model_map: pd.DataFrame) -> None:
    """The same row ingested twice (same id, same score) collapses to one,
    logged, not halted."""
    a = model_map.iloc[0]
    row = _outcome(a, 2, 1, "FD4001", "2026-06-11T21:00:00Z")
    result = map_settled(model_map, [dict(row), dict(row)])
    assert len(result["scored"]) == 1
    assert len(result["collapsed"]) == 1
    assert result["collapsed"][0]["rule"] == "exact_identical_duplicate"
    assert result["collapsed"][0]["kept"] == "FD4001"


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
