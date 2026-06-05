"""
tests/test_simulator.py
=======================
Session 04 · El Voto del 21 de Junio — Monte Carlo simulator tests.

Run from the-21j-problem/ root:
    python -m pytest tests/test_simulator.py -v
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import model.aggregate_polls as agg  # noqa: E402
import model.simulate_runoff as sim  # noqa: E402

FORBIDDEN = ("gana", "apuesta", "favorito", "pronóstico", "pronostico")


# =============================================================================
# Fixtures
# =============================================================================


def _posterior(mean: float, var: float, n: int = 12) -> agg.Posterior:
    return agg.Posterior(
        mean=mean,
        var=var,
        n_polls=n,
        newest_poll_date=date(2026, 6, 2),
        oldest_poll_date=date(2026, 4, 9),
        tau2=0.001,
        heterogeneity="random_effects",
        halflife_days=5.0,
        house_effects_on=True,
    )


@pytest.fixture(scope="module")
def snapshot_path() -> Path:
    """Run the real pipeline once (force) and return the snapshot path."""
    path = sim.run(force=True)
    assert isinstance(path, Path) and path.exists()
    return path


@pytest.fixture(scope="module")
def snapshot(snapshot_path: Path) -> dict:
    return json.loads(snapshot_path.read_text(encoding="utf-8"))


# =============================================================================
# Monte Carlo — probabilities, shares, CI ordering, reproducibility
# =============================================================================


def test_probabilities_in_unit_interval() -> None:
    mc = sim.monte_carlo(_posterior(0.48, 0.002))
    assert 0.0 <= mc["p_cepeda"] <= 1.0
    assert 0.0 <= mc["p_espriella"] <= 1.0


def test_probabilities_sum_to_one() -> None:
    mc = sim.monte_carlo(_posterior(0.48, 0.002))
    assert mc["p_cepeda"] + mc["p_espriella"] == pytest.approx(1.0, abs=1e-9)


def test_shares_sum_to_one() -> None:
    mc = sim.monte_carlo(_posterior(0.52, 0.002))
    assert mc["share_cepeda"]["mean"] + mc["share_espriella"]["mean"] == pytest.approx(
        1.0, abs=1e-3
    )


def test_ci_ordering_shares_and_margin() -> None:
    mc = sim.monte_carlo(_posterior(0.50, 0.003))
    for key in ("share_cepeda", "share_espriella", "margin"):
        blk = mc[key]
        assert blk["ci80_low"] <= blk["mean"] <= blk["ci80_high"], key


def test_seed_reproducibility() -> None:
    post = _posterior(0.49, 0.0025)
    a = sim.monte_carlo(post, seed=123)
    b = sim.monte_carlo(post, seed=123)
    assert a == b


def test_different_seed_differs() -> None:
    post = _posterior(0.49, 0.0025)
    a = sim.monte_carlo(post, seed=1)
    b = sim.monte_carlo(post, seed=2)
    # Probabilities may coincide by chance, but the share means should not.
    assert a["share_cepeda"]["mean"] != b["share_cepeda"]["mean"]


def test_margin_sign_convention() -> None:
    # Posterior favouring Espriella (Cepeda share < 0.5) => positive margin.
    mc = sim.monte_carlo(_posterior(0.40, 0.001))
    assert mc["margin"]["mean"] > 0
    # Posterior favouring Cepeda => negative margin.
    mc2 = sim.monte_carlo(_posterior(0.60, 0.001))
    assert mc2["margin"]["mean"] < 0


# =============================================================================
# data_sufficiency gate (build_snapshot logic)
# =============================================================================


def _minimal_mc() -> dict:
    return sim.monte_carlo(_posterior(0.50, 0.002))


def _sensitivity(arms: dict, winner_flips: bool, spread: float) -> dict:
    return {
        "arms": arms,
        "p_cepeda_spread": spread,
        "winner_flips": winner_flips,
        "flip_p_threshold": sim.FLIP_P_THRESHOLD,
        "trips_thin_gate": winner_flips or spread > sim.FLIP_P_THRESHOLD,
        "note": "",
    }


def _build(polls, record, post, sens) -> dict:
    return sim.build_snapshot(
        polls, record, post, _minimal_mc(), sens, 5.0,
        generated_at=datetime.now(timezone.utc),
    )


def test_data_sufficiency_thin_on_winner_flip() -> None:
    polls, record, _ = agg.load_inputs()
    post = _posterior(0.50, 0.002, n=12)
    sens = _sensitivity({"a": 0.45, "b": 0.55}, winner_flips=True, spread=0.10)
    snap = _build(polls, record, post, sens)
    assert snap["data_sufficiency"] == "thin"
    assert any("flip" in r for r in snap["data_sufficiency_reasons"])


def test_data_sufficiency_thin_on_starved_input() -> None:
    polls, record, _ = agg.load_inputs()
    post = _posterior(0.55, 0.0005, n=2)  # below MIN_POLLS_OK
    sens = _sensitivity({"a": 0.60, "b": 0.61}, winner_flips=False, spread=0.01)
    snap = _build(polls, record, post, sens)
    assert snap["data_sufficiency"] == "thin"
    assert any("runoff polls" in r for r in snap["data_sufficiency_reasons"])


def test_data_sufficiency_ok_when_stable() -> None:
    polls, record, _ = agg.load_inputs()
    post = _posterior(0.60, 0.0005, n=12)
    sens = _sensitivity({"a": 0.95, "b": 0.96}, winner_flips=False, spread=0.01)
    snap = _build(polls, record, post, sens)
    assert snap["data_sufficiency"] == "ok"
    assert snap["data_sufficiency_reasons"] == []


# =============================================================================
# End-to-end snapshot — schema, contract keys, reproducibility, no forbidden words
# =============================================================================


REQUIRED_KEYS = (
    "snapshot_date", "generated_at", "p_cepeda", "p_espriella",
    "share_cepeda", "share_espriella", "margin", "n_polls",
    "newest_poll_date", "oldest_poll_date", "recency_halflife_days",
    "house_effect_mode", "mc_runs", "seed", "data_sufficiency",
    "assumptions", "sensitivity", "code_sha", "data_hash",
)


def test_snapshot_has_all_contract_keys(snapshot: dict) -> None:
    for k in REQUIRED_KEYS:
        assert k in snapshot, f"missing contract key: {k}"


def test_snapshot_probabilities_sum_to_one(snapshot: dict) -> None:
    assert snapshot["p_cepeda"] + snapshot["p_espriella"] == pytest.approx(1.0, abs=1e-9)
    for p in (snapshot["p_cepeda"], snapshot["p_espriella"]):
        assert 0.0 <= p <= 1.0


def test_snapshot_shares_sum_to_one(snapshot: dict) -> None:
    s = snapshot["share_cepeda"]["mean"] + snapshot["share_espriella"]["mean"]
    assert s == pytest.approx(1.0, abs=1e-3)


def test_snapshot_ci_ordering(snapshot: dict) -> None:
    for key in ("share_cepeda", "share_espriella", "margin"):
        blk = snapshot[key]
        assert blk["ci80_low"] <= blk["mean"] <= blk["ci80_high"], key


def test_snapshot_house_effect_mode_soft(snapshot: dict) -> None:
    assert snapshot["house_effect_mode"] == "soft"


def test_snapshot_halflife_is_calibrated(snapshot: dict) -> None:
    # Read from the calibration JSON, not refit.
    assert snapshot["recency_halflife_days"] == 5.0


def test_snapshot_sensitivity_has_four_arms(snapshot: dict) -> None:
    assert len(snapshot["sensitivity"]["arms"]) == 4


def test_latest_pointer_matches_snapshot(snapshot: dict) -> None:
    latest = json.loads(sim.LATEST_POINTER.read_text(encoding="utf-8"))
    assert latest["data_hash"] == snapshot["data_hash"]
    assert latest["snapshot_date"] == snapshot["snapshot_date"]


def test_no_forbidden_words_in_snapshot(snapshot_path: Path) -> None:
    raw = snapshot_path.read_text(encoding="utf-8").lower()
    for word in FORBIDDEN:
        assert word not in raw, f"forbidden word in snapshot: {word!r}"


def test_rerun_reproduces_identical_output(snapshot: dict) -> None:
    """A second run produces an identical snapshot apart from generated_at."""
    path2 = sim.run(force=True)
    snap2 = json.loads(path2.read_text(encoding="utf-8"))
    a = {k: v for k, v in snapshot.items() if k != "generated_at"}
    b = {k: v for k, v in snap2.items() if k != "generated_at"}
    assert a == b


def test_snapshot_registered(snapshot: dict) -> None:
    from utils.hasher import SnapshotRegistry, hash_dict

    reproducible = {k: v for k, v in snapshot.items() if k != "generated_at"}
    sha = hash_dict(reproducible)
    reg = SnapshotRegistry(sim.SNAPSHOT_REG)
    entry = reg.lookup(sha)
    assert entry is not None, "snapshot SHA not found in registry"
    assert entry["notes"] == "simulate_runoff"
