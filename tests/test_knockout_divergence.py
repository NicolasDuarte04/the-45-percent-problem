"""
tests/test_knockout_divergence.py
=================================
cp-30: knockout market divergence via resolved pairings, with a freshness guard.

Covers, all against recorded fixtures (the live Odds API is never called):
  * Resolver: a recorded Odds API knockout event maps to the KO-FD id from a
    fixture pairings lookup; an unresolvable event is skipped without error.
  * De-vig: the knockout 1X2 de-vig sums to 1 and round-trips a synthetic
    overround (with the pre-registered knockout draw correction applied).
  * Freshness: a synthetic stale snapshot yields status not "live" and zero rows.
  * Model source + settled-at-source: build_divergence prices knockout fixtures
    from the live card p_model_1x2 and drops settled / kicked-off pairings.
  * Wall: no knockout divergence row can reach the ledger or the calibration
    inputs (structural: neither builder accepts odds/divergence), and the
    committed ledger carries no KO-FD ids.
"""

from __future__ import annotations

import inspect
import json

import pandas as pd
import pytest

import ingestion.fetch_odds_pinnacle as fop
from market.devig import devig
from market.divergence_generator import (
    STALE_ODDS_THRESHOLD_MINUTES,
    build_divergence,
    is_odds_snapshot_stale,
    odds_snapshot_age_minutes,
    stale_divergence,
)


# --------------------------------------------------------------------------- #
# Resolver
# --------------------------------------------------------------------------- #

_RECORDED_KO_EVENT = {
    "id": "recorded-ko-event-1",
    "sport_key": "soccer_fifa_world_cup",
    "commence_time": "2026-07-05T20:00:00Z",
    "home_team": "Brazil",
    "away_team": "Norway",
    "bookmakers": [
        {
            "key": "pinnacle",
            "last_update": "2026-07-05T18:00:00Z",
            "markets": [
                {
                    "key": "h2h",
                    "outcomes": [
                        {"name": "Brazil", "price": 1.80},
                        {"name": "Norway", "price": 4.50},
                        {"name": "Draw", "price": 3.60},
                    ],
                }
            ],
        }
    ],
}


def _fixture_ko_lookup() -> dict:
    """A tiny knockout lookup as _load_knockout_lookup would build it."""
    return {
        (fop._norm_team_name("Brazil"), fop._norm_team_name("Norway"), "2026-07-05"): "KO-FD537377",
        (fop._norm_team_name("Brazil"), fop._norm_team_name("Norway"), "2026-07-04"): "KO-FD537377",
        (fop._norm_team_name("Brazil"), fop._norm_team_name("Norway"), "2026-07-06"): "KO-FD537377",
    }


def test_recorded_ko_event_resolves_to_pairing(monkeypatch: pytest.MonkeyPatch) -> None:
    # Group fixture lookup misses (knockout slots are placeholders); the knockout
    # pairing lookup resolves the event to its KO-FD id.
    monkeypatch.setattr(fop, "_load_fixture_lookup", lambda: ({}, []))
    monkeypatch.setattr(fop, "_load_knockout_lookup", _fixture_ko_lookup)

    rows = fop._normalise_odds_api_payload([_RECORDED_KO_EVENT])

    assert len(rows) == 3
    assert {r["match_id"] for r in rows} == {"KO-FD537377"}
    assert {r["outcome"] for r in rows} == {"home_win", "draw", "away_win"}
    for r in rows:
        assert r["bookmaker"] == "pinnacle"
        assert r["market_type"] == "match_winner"
        assert r["decimal_odds"] > 1.0
        # cp-30 keeps the non-synthetic prefix so odds_are_synthetic is False.
        assert r["snapshot_id"].split("_")[0] == "oa"


def test_unresolvable_event_is_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fop, "_load_fixture_lookup", lambda: ({}, []))
    monkeypatch.setattr(fop, "_load_knockout_lookup", _fixture_ko_lookup)

    unknown = dict(_RECORDED_KO_EVENT)
    unknown = {**unknown, "home_team": "Atlantis", "away_team": "El Dorado"}
    rows = fop._normalise_odds_api_payload([unknown])
    assert rows == []  # unresolved -> skipped, no exception


def test_inverted_orientation_still_resolves(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fop, "_load_fixture_lookup", lambda: ({}, []))
    monkeypatch.setattr(fop, "_load_knockout_lookup", _fixture_ko_lookup)
    # Feed reports Norway as home; neutral-venue ties invert freely.
    inverted = {**_RECORDED_KO_EVENT, "home_team": "Norway", "away_team": "Brazil"}
    rows = fop._normalise_odds_api_payload([inverted])
    assert {r["match_id"] for r in rows} == {"KO-FD537377"}


def test_load_knockout_lookup_reads_pairings(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    doc = {
        "pairings": [
            {
                "match_id": "KO-FD999001",
                "round": "R16",
                "kickoff_utc": "2026-07-06T00:00:00Z",
                "home": {"fifa_code": "MEX", "source_name": "Mexico"},
                "away": {"fifa_code": "ENG", "source_name": "England"},
            }
        ]
    }
    path = tmp_path / "knockout_pairings.json"
    path.write_text(json.dumps(doc))
    monkeypatch.setattr(fop, "LIVE_KNOCKOUT_PAIRINGS", path)

    lookup = fop._load_knockout_lookup()
    mid = fop._resolve_knockout_match_id("Mexico", "England", "2026-07-06T00:00:00Z", lookup)
    assert mid == "KO-FD999001"


def test_load_knockout_lookup_absent_is_empty(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fop, "LIVE_KNOCKOUT_PAIRINGS", tmp_path / "does_not_exist.json")
    assert fop._load_knockout_lookup() == {}


# --------------------------------------------------------------------------- #
# De-vig (knockout 1X2)
# --------------------------------------------------------------------------- #

def test_knockout_devig_sums_to_one_and_round_trips_overround() -> None:
    # Synthetic true probabilities, inflated by a known overround into decimal
    # odds; the power-method de-vig must recover a proper distribution.
    true_p = [0.50, 0.27, 0.23]
    overround = 0.06
    odds = [1.0 / (p * (1.0 + overround)) for p in true_p]

    result = devig(
        odds,
        book="pinnacle",
        market_type="match_winner",
        stage="round_of_16",
        outcome_labels=["home_win", "draw", "away_win"],
    )
    assert sum(result.q) == pytest.approx(1.0, abs=1e-9)
    # The injected overround is recovered from the raw book sum.
    assert result.overround == pytest.approx(overround, abs=1e-6)
    # The pre-registered knockout draw correction ran (and only that one).
    assert result.corrections_applied == ["knockout_draw_correction"]


# --------------------------------------------------------------------------- #
# Freshness guard
# --------------------------------------------------------------------------- #

def _ko_odds_df(ts: str, match_id: str = "KO-FD537377") -> pd.DataFrame:
    rows = []
    for outcome, price in [("home_win", 1.80), ("draw", 3.60), ("away_win", 4.50)]:
        rows.append(
            {
                "snapshot_id": f"oa_KO-F_{outcome[:2]}",
                "timestamp": ts,
                "match_id": match_id,
                "bookmaker": "pinnacle",
                "market_type": "match_winner",
                "outcome": outcome,
                "decimal_odds": price,
                "is_opening": False,
                "is_closing": False,
                "last_refreshed": ts,
            }
        )
    return pd.DataFrame(rows)


def test_snapshot_age_and_stale_flag() -> None:
    df = _ko_odds_df("2026-07-05T00:00:00Z")
    # 6 hours later: fresh.
    assert odds_snapshot_age_minutes(df, "2026-07-05T06:00:00Z") == 360
    assert is_odds_snapshot_stale(df, "2026-07-05T06:00:00Z") is False
    # Well past the threshold (~7 days, the June-28 failure): stale.
    assert is_odds_snapshot_stale(df, "2026-07-12T00:00:00Z") is True


def test_missing_timestamp_is_stale() -> None:
    df = _ko_odds_df("2026-07-05T00:00:00Z").drop(columns=["timestamp"])
    assert odds_snapshot_age_minutes(df, "2026-07-05T06:00:00Z") is None
    assert is_odds_snapshot_stale(df, "2026-07-05T06:00:00Z") is True


def test_stale_divergence_has_zero_rows_and_no_pinnacle() -> None:
    d = stale_divergence("snap1", "2026-07-12T00:00:00Z", 10000)
    assert d["status"] == "stale"
    assert d["rows"] == []
    assert "PINNACLE" not in json.dumps(d)
    assert d["snapshot_age_minutes"] == 10000


def test_threshold_is_above_daily_cadence() -> None:
    # Guards the operational rationale: the pull is once per day, so the ceiling
    # must comfortably exceed 24h to avoid false-stale on a normal day.
    assert STALE_ODDS_THRESHOLD_MINUTES > 24 * 60


# --------------------------------------------------------------------------- #
# Model source + settled-at-source filtering
# --------------------------------------------------------------------------- #

def _ko_card(
    match_id: str = "KO-FD537377",
    kickoff: str = "2026-07-05T20:00:00Z",
    settled: bool = False,
) -> dict:
    card = {
        "match_id": match_id,
        "round": "R16",
        "kickoff_utc": kickoff,
        "home": {"fifa_code": "BRA", "display_name": "Brazil"},
        "away": {"fifa_code": "NOR", "display_name": "Norway"},
        "p_model_1x2": {"H": 0.46, "D": 0.23, "A": 0.31},
    }
    if settled:
        card["score"] = {"home": 2, "away": 1}
        card["outcome_realized"] = "H"
    return card


def test_build_divergence_prices_knockout_from_card() -> None:
    odds = _ko_odds_df("2026-07-05T10:00:00Z")
    cards = {"KO-FD537377": _ko_card()}
    # generated_at BEFORE kickoff so the fixture is upcoming.
    div = build_divergence(
        "snap1",
        "2026-07-05T12:00:00Z",
        odds,
        pd.DataFrame(columns=["match_id"]),   # no group distributions
        pd.DataFrame(columns=["match_id"]),   # no group model_map
        "abc123",
        knockout_cards=cards,
    )
    assert div["status"] == "live"
    assert len(div["rows"]) == 3
    by_outcome = {r["outcome"]: r for r in div["rows"]}
    # p_model comes from the live card's p_model_1x2, not any group batch.
    assert by_outcome["HOME"]["p_model"] == pytest.approx(0.46, abs=1e-6)
    assert by_outcome["DRAW"]["p_model"] == pytest.approx(0.23, abs=1e-6)
    assert by_outcome["AWAY"]["p_model"] == pytest.approx(0.31, abs=1e-6)
    for r in div["rows"]:
        assert r["match_id"] == "KO-FD537377"
        assert r["round"] == "R16"
        assert r["graded"] is False
        assert r["source_book"] == "PINNACLE"
        # host correction does not apply at a neutral-venue knockout
        assert r["pinnacle_bias_applied"]["host_delta"] == 0.0
    q_sum = sum(r["q_market_devigged"] for r in div["rows"])
    assert q_sum == pytest.approx(1.0, abs=1e-3)


def test_build_divergence_drops_settled_knockout() -> None:
    odds = _ko_odds_df("2026-07-05T10:00:00Z")
    cards = {"KO-FD537377": _ko_card(settled=True)}
    div = build_divergence(
        "snap1", "2026-07-05T12:00:00Z", odds,
        pd.DataFrame(columns=["match_id"]), pd.DataFrame(columns=["match_id"]),
        "abc123", knockout_cards=cards,
    )
    assert div["rows"] == []  # settled -> dropped at source


def test_build_divergence_drops_kicked_off_knockout() -> None:
    odds = _ko_odds_df("2026-07-05T21:00:00Z")
    cards = {"KO-FD537377": _ko_card(kickoff="2026-07-05T20:00:00Z")}
    # generated_at AFTER kickoff -> already kicked off -> dropped.
    div = build_divergence(
        "snap1", "2026-07-05T22:00:00Z", odds,
        pd.DataFrame(columns=["match_id"]), pd.DataFrame(columns=["match_id"]),
        "abc123", knockout_cards=cards,
    )
    assert div["rows"] == []


# --------------------------------------------------------------------------- #
# Wall: divergence never reaches the graded ledger or the calibration inputs
# --------------------------------------------------------------------------- #

def test_ledger_and_calibration_builders_take_no_odds() -> None:
    """Structural wall: neither the ledger nor the calibration builder accepts an
    odds or divergence argument, so no knockout divergence value can flow in."""
    from evaluation.aggregate_metrics import update_evaluation_metrics
    from evaluation.reconstruct_forecasts import build_ledger_rows

    ledger_params = set(inspect.signature(build_ledger_rows).parameters)
    calib_params = set(inspect.signature(update_evaluation_metrics).parameters)
    for banned in ("odds", "odds_df", "divergence", "knockout_cards"):
        assert banned not in ledger_params
        assert banned not in calib_params


def test_committed_ledger_has_no_knockout_ids() -> None:
    """The published graded ledger is group-only (M{NN}); a KO-FD id in it would
    mean the live knockout surface leaked into the scored record."""
    from pathlib import Path

    ledger = (
        Path(__file__).resolve().parent.parent
        / "website" / "public" / "data" / "latest" / "ledger.jsonl"
    )
    if not ledger.exists():
        pytest.skip("no committed ledger.jsonl in this tree")
    ids = []
    for line in ledger.read_text().splitlines():
        line = line.strip()
        if line:
            ids.append(json.loads(line).get("match_id"))
    assert ids, "ledger unexpectedly empty"
    assert all(not str(i).startswith("KO-") for i in ids)
