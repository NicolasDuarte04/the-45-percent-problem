"""
tests/test_pulso.py
===================
Session 05 · El Voto del 21 de Junio — Pulso Patrio tests.

All tests are offline and deterministic: the combiner, the 6-hour smoothing, and
the headline scorer are pure; the end-to-end run is exercised with injected
synthetic readings and a fixed clock, writing to a tmp directory. No network.

Run from the-21j-problem/ root:
    python -m pytest tests/test_pulso.py -v
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pulso.run_pulso as rp  # noqa: E402
from pulso.combine import combine_readings, load_recent_raws, rolling_smooth  # noqa: E402
from pulso.input_headlines import score_items  # noqa: E402
from pulso.input_market import match_runoff_market  # noqa: E402
from pulso.input_tiktok import TikTokInput  # noqa: E402
from pulso.input_x import XInput  # noqa: E402
from schemas import InputReading  # noqa: E402

FORBIDDEN = ("gana", "apuesta", "favorito", "pronóstico", "pronostico")

W = rp.WEIGHTS  # pre-registered weights


# =============================================================================
# Helpers
# =============================================================================


def _live(source: str, value: float, weight: float) -> InputReading:
    return InputReading(source=source, value=value, available=True, weight=weight)


def _blank(source: str, weight: float) -> InputReading:
    return InputReading(source=source, value=None, available=False, weight=weight)


def _five_readings(headlines=80.0, trends=20.0, market=None, x=None, tiktok=None):
    """A full set of five readings; None means unavailable."""
    out = [_live("headlines", headlines, W["headlines"]) if headlines is not None else _blank("headlines", W["headlines"])]
    out.append(_live("trends", trends, W["trends"]) if trends is not None else _blank("trends", W["trends"]))
    out.append(_live("market", market, W["market"]) if market is not None else _blank("market", W["market"]))
    out.append(_live("x", x, W["x"]) if x is not None else _blank("x", W["x"]))
    out.append(_live("tiktok", tiktok, W["tiktok"]) if tiktok is not None else _blank("tiktok", W["tiktok"]))
    return out


# =============================================================================
# InputReading contract
# =============================================================================


def test_available_reading_must_carry_value() -> None:
    with pytest.raises(Exception):
        InputReading(source="x", value=None, available=True, weight=0.1)


def test_unavailable_reading_must_be_none() -> None:
    with pytest.raises(Exception):
        InputReading(source="x", value=50.0, available=False, weight=0.1)


def test_value_out_of_range_rejected() -> None:
    with pytest.raises(Exception):
        InputReading(source="x", value=120.0, available=True, weight=0.1)


# =============================================================================
# Stubs — unavailable, never a number
# =============================================================================


@pytest.mark.parametrize("cls", [XInput, TikTokInput])
def test_stub_returns_unavailable_no_number(cls) -> None:
    reading = cls(weight=0.1, cfg=rp.CFG["pulso"]).fetch()
    assert reading.available is False
    assert reading.value is None
    assert reading.note  # explains itself


# =============================================================================
# Combiner — renormalisation, range, sufficiency
# =============================================================================


def test_combine_two_live_renormalises() -> None:
    readings = _five_readings(headlines=80.0, trends=20.0)  # weights 0.40 / 0.20
    out = combine_readings(readings, min_inputs_ok=2)
    # (80*0.4 + 20*0.2) / (0.4+0.2) = 36 / 0.6 = 60
    assert out["index_raw"] == pytest.approx(60.0, abs=1e-6)
    assert out["inputs_live"] == 2
    assert out["inputs_total"] == 5
    assert out["data_sufficiency"] == "ok"


def test_combine_renormalises_when_inputs_drop() -> None:
    """Dropping an input re-shares the weight; a single live input == its value."""
    only_headlines = _five_readings(headlines=73.0, trends=None)
    out = combine_readings(only_headlines, min_inputs_ok=2)
    assert out["index_raw"] == pytest.approx(73.0, abs=1e-6)  # renormalised over the one live
    assert out["inputs_live"] == 1


def test_index_stays_in_unit_band_at_extremes() -> None:
    for hv, tv in [(0.0, 0.0), (100.0, 100.0), (0.0, 100.0), (100.0, 0.0)]:
        out = combine_readings(_five_readings(headlines=hv, trends=tv), min_inputs_ok=2)
        assert 0.0 <= out["index_raw"] <= 100.0


def test_data_sufficiency_demo_under_two_live() -> None:
    out = combine_readings(_five_readings(headlines=50.0, trends=None), min_inputs_ok=2)
    assert out["inputs_live"] == 1
    assert out["data_sufficiency"] == "demo"


def test_data_sufficiency_ok_with_two_live() -> None:
    out = combine_readings(_five_readings(headlines=50.0, trends=40.0), min_inputs_ok=2)
    assert out["inputs_live"] == 2
    assert out["data_sufficiency"] == "ok"


def test_combine_zero_live_yields_none_demo() -> None:
    out = combine_readings(_five_readings(headlines=None, trends=None), min_inputs_ok=2)
    assert out["index_raw"] is None
    assert out["inputs_live"] == 0
    assert out["data_sufficiency"] == "demo"


def test_combine_three_live_convex() -> None:
    readings = _five_readings(headlines=90.0, trends=30.0, market=60.0)
    out = combine_readings(readings, min_inputs_ok=2)
    # (90*0.40 + 30*0.20 + 60*0.15) / 0.75 = (36 + 6 + 9) / 0.75 = 51 / 0.75 = 68
    assert out["index_raw"] == pytest.approx(68.0, abs=1e-6)
    assert out["inputs_live"] == 3


# =============================================================================
# 6-hour rolling smoothing
# =============================================================================


def test_rolling_smooth_means_pool() -> None:
    assert rolling_smooth(60.0, [50.0, 70.0]) == pytest.approx(60.0)


def test_rolling_smooth_no_history_is_current() -> None:
    assert rolling_smooth(64.0, []) == pytest.approx(64.0)


def test_rolling_smooth_none_current_uses_history() -> None:
    assert rolling_smooth(None, [50.0]) == pytest.approx(50.0)


def test_rolling_smooth_all_none_is_none() -> None:
    assert rolling_smooth(None, []) is None


def test_load_recent_raws_respects_window(tmp_path: Path) -> None:
    hist = tmp_path / "pulso_history.jsonl"
    now = datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc)
    rows = [
        {"snapshot_hour": (now - timedelta(hours=1)).isoformat(), "index_raw": 40.0},  # in window
        {"snapshot_hour": (now - timedelta(hours=5)).isoformat(), "index_raw": 50.0},  # in window
        {"snapshot_hour": (now - timedelta(hours=9)).isoformat(), "index_raw": 99.0},  # outside 6h
        {"snapshot_hour": now.isoformat(), "index_raw": 12.0},  # current hour, excluded
    ]
    hist.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    recent = load_recent_raws(hist, now, window_hours=6)
    assert sorted(recent) == [40.0, 50.0]


# =============================================================================
# Headline scorer (pure)
# =============================================================================


def _headlines_cfg() -> dict:
    return rp.CFG["pulso"]["headlines"]


def test_score_items_relevant_and_charged() -> None:
    items = [
        {"title": "Segunda vuelta: tension y polemica en la campana", "summary": ""},
        {"title": "Cepeda y Espriella se enfrentan en debate", "summary": "escandalo"},
        {"title": "Clima soleado en la costa", "summary": "playa"},  # irrelevant
    ]
    out = score_items(items, _headlines_cfg())
    assert out["n_total"] == 3
    assert out["n_relevant"] == 2
    assert out["n_charged"] == 2
    assert 0.0 < out["value"] <= 100.0


def test_score_items_no_relevant_is_zero_not_none() -> None:
    items = [{"title": "Clima soleado", "summary": "playa"}]
    out = score_items(items, _headlines_cfg())
    assert out["n_relevant"] == 0
    assert out["value"] == 0.0  # a real measurement of a quiet feed, not fabricated


def test_score_items_value_in_band() -> None:
    items = [{"title": "segunda vuelta crisis ataque amenaza", "summary": ""}] * 50
    out = score_items(items, _headlines_cfg())
    assert 0.0 <= out["value"] <= 100.0


# =============================================================================
# Market matcher (pure)
# =============================================================================


def test_match_runoff_market_none_when_absent() -> None:
    markets = [
        {"question": "Will it rain in Bogota tomorrow?", "active": True, "outcomePrices": "[\"0.5\",\"0.5\"]"},
        {"question": "US 2028 election winner", "active": True, "outcomePrices": "[\"0.4\",\"0.6\"]"},
    ]
    assert match_runoff_market(markets) is None


def test_match_runoff_market_finds_colombia_runoff() -> None:
    markets = [
        {"question": "Colombia runoff: Cepeda vs Espriella", "active": True,
         "outcomePrices": "[\"0.55\",\"0.45\"]", "slug": "co-runoff"},
    ]
    hit = match_runoff_market(markets)
    assert hit is not None
    assert hit["spread"] == pytest.approx(abs(2 * 0.55 - 1), abs=1e-9)  # 0.10, direction-free


def test_match_runoff_market_skips_closed() -> None:
    markets = [
        {"question": "Colombia runoff Cepeda Espriella", "closed": True,
         "outcomePrices": "[\"0.55\",\"0.45\"]"},
    ]
    assert match_runoff_market(markets) is None


# =============================================================================
# End-to-end run (injected readings + fixed clock, tmp paths, offline)
# =============================================================================


@pytest.fixture()
def tmp_paths(tmp_path: Path, monkeypatch) -> Path:
    snap_dir = tmp_path / "pulso"
    snap_dir.mkdir()
    monkeypatch.setattr(rp, "SNAPSHOT_DIR", snap_dir)
    monkeypatch.setattr(rp, "HISTORY_JSONL", snap_dir / "pulso_history.jsonl")
    monkeypatch.setattr(rp, "LATEST_POINTER", snap_dir / "latest.json")
    monkeypatch.setattr(rp, "SNAPSHOT_REG", tmp_path / "snapshot_registry.jsonl")
    return snap_dir


def test_run_writes_snapshot_and_history(tmp_paths: Path) -> None:
    now = datetime(2026, 6, 5, 9, 30, tzinfo=timezone.utc)
    readings = _five_readings(headlines=80.0, trends=20.0)
    path = rp.run(force=True, readings=readings, now=now)

    assert path.exists()
    snap = json.loads(path.read_text(encoding="utf-8"))
    assert snap["index_raw"] == pytest.approx(60.0, abs=1e-6)
    assert snap["index_value"] == pytest.approx(60.0, abs=1e-6)  # no prior history
    assert snap["inputs_live"] == 2
    assert snap["inputs_total"] == 5
    assert snap["data_sufficiency"] == "ok"
    assert 0.0 <= snap["index_value"] <= 100.0

    # latest pointer matches
    latest = json.loads(rp.LATEST_POINTER.read_text(encoding="utf-8"))
    assert latest["data_hash"] == snap["data_hash"]

    # history has exactly one row
    hist_lines = rp.HISTORY_JSONL.read_text(encoding="utf-8").strip().splitlines()
    assert len(hist_lines) == 1


def test_run_demo_when_one_live(tmp_paths: Path) -> None:
    now = datetime(2026, 6, 5, 10, 5, tzinfo=timezone.utc)
    readings = _five_readings(headlines=55.0, trends=None)
    snap = json.loads(rp.run(force=True, readings=readings, now=now).read_text(encoding="utf-8"))
    assert snap["inputs_live"] == 1
    assert snap["data_sufficiency"] == "demo"


def test_run_stubs_serialise_unavailable(tmp_paths: Path) -> None:
    now = datetime(2026, 6, 5, 11, 0, tzinfo=timezone.utc)
    snap = json.loads(rp.run(force=True, readings=_five_readings(), now=now).read_text(encoding="utf-8"))
    by_source = {r["source"]: r for r in snap["readings"]}
    for stub in ("x", "tiktok"):
        assert by_source[stub]["available"] is False
        assert by_source[stub]["value"] is None


def test_run_no_forbidden_words(tmp_paths: Path) -> None:
    now = datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc)
    path = rp.run(force=True, readings=_five_readings(headlines=80.0, trends=20.0, market=40.0), now=now)
    raw = path.read_text(encoding="utf-8").lower()
    for word in FORBIDDEN:
        assert word not in raw, f"forbidden word in snapshot: {word!r}"


def test_run_methodology_states_not_probability(tmp_paths: Path) -> None:
    now = datetime(2026, 6, 5, 13, 0, tzinfo=timezone.utc)
    snap = json.loads(rp.run(force=True, readings=_five_readings(), now=now).read_text(encoding="utf-8"))
    m = snap["methodology"].lower()
    assert "no una probabilidad" in m
    assert "intensidad" in m


def test_run_registers_snapshot(tmp_paths: Path) -> None:
    from utils.hasher import SnapshotRegistry, hash_dict

    now = datetime(2026, 6, 5, 14, 0, tzinfo=timezone.utc)
    snap = json.loads(rp.run(force=True, readings=_five_readings(), now=now).read_text(encoding="utf-8"))
    reproducible = {k: v for k, v in snap.items() if k != "generated_at"}
    sha = hash_dict(reproducible)
    entry = SnapshotRegistry(rp.SNAPSHOT_REG).lookup(sha)
    assert entry is not None
    assert entry["notes"] == "run_pulso"


def test_run_smooths_over_history(tmp_paths: Path) -> None:
    """A second hour averages with the first within the 6h window."""
    h1 = datetime(2026, 6, 5, 15, 0, tzinfo=timezone.utc)
    rp.run(force=True, readings=_five_readings(headlines=80.0, trends=20.0), now=h1)  # raw 60
    h2 = datetime(2026, 6, 5, 16, 0, tzinfo=timezone.utc)
    snap2 = json.loads(
        rp.run(force=True, readings=_five_readings(headlines=100.0, trends=100.0), now=h2).read_text(encoding="utf-8")
    )
    assert snap2["index_raw"] == pytest.approx(100.0, abs=1e-6)
    assert snap2["index_value"] == pytest.approx(80.0, abs=1e-6)  # mean(100, 60)


def test_run_force_does_not_duplicate_history_row(tmp_paths: Path) -> None:
    now = datetime(2026, 6, 5, 17, 0, tzinfo=timezone.utc)
    rp.run(force=True, readings=_five_readings(), now=now)
    rp.run(force=True, readings=_five_readings(), now=now)  # same hour, forced
    hist_lines = rp.HISTORY_JSONL.read_text(encoding="utf-8").strip().splitlines()
    assert len(hist_lines) == 1  # append-only, one row per hour
