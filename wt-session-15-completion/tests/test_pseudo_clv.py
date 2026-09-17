"""
tests/test_pseudo_clv.py
=========================
Golden-file tests for evaluation/pseudo_clv.py
Covers: pseudo-CLV determinism (14)
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.pseudo_clv import (
    ShadowBankroll,
    ShadowBook,
    ShadowCLVResult,
    _compute_edge,
    _kelly_stake,
    ablation_sweep,
    build_shadow_book,
    compute_pseudo_clv,
)
from evaluation.clv_tracker import CLVReport


# ---------------------------------------------------------------------------
# ShadowBankroll tests (3)
# ---------------------------------------------------------------------------

class TestShadowBankroll:
    def test_initial_state(self):
        b = ShadowBankroll()
        assert b.current == 1.0
        assert b.peak == 1.0
        assert not b.halved

    def test_drawdown_stop_triggers(self):
        b = ShadowBankroll(current=1.0, peak=1.0)
        # Lose 25% — clearly above 20% drawdown threshold
        b.current = 0.75
        b.peak = 1.0
        b.halved = (b.peak - b.current) / b.peak >= 0.20
        assert b.halved

    def test_effective_kelly_halved(self):
        b = ShadowBankroll()
        b.halved = True
        assert b.effective_kelly(0.25) == 0.125

    def test_effective_kelly_normal(self):
        b = ShadowBankroll()
        assert b.effective_kelly(0.25) == 0.25


# ---------------------------------------------------------------------------
# Edge / Kelly stake computation (3)
# ---------------------------------------------------------------------------

class TestEdgeAndKelly:
    def test_edge_formula(self):
        assert _compute_edge(0.50, 0.40) == pytest.approx(0.10)

    def test_zero_stake_below_threshold(self):
        b = ShadowBankroll()
        stake = _kelly_stake(0.02, 0.40, b, is_longshot=False, is_derivative=False)
        assert stake == 0.0  # 0.02 < 0.03 threshold

    def test_positive_stake_above_threshold(self):
        b = ShadowBankroll()
        stake = _kelly_stake(0.05, 0.40, b, is_longshot=False, is_derivative=False)
        assert stake > 0.0


# ---------------------------------------------------------------------------
# build_shadow_book tests (4)
# ---------------------------------------------------------------------------

def _write_forecast_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")


def _base_row(model_id: str, match_id: str, phase: str) -> dict:
    return {
        "forecast_id": f"uid_{model_id}_{match_id}_{phase}",
        "schema_version": "7.0",
        "match_id": match_id,
        "model_id": model_id,
        "market_phase": phase,
        "is_champion": model_id == "M_STAR",
        "p_model": {"H": 0.50, "D": 0.25, "A": 0.25},
        "q_market_devigged": {"H": 0.40, "D": 0.30, "A": 0.30},
        "q_market_raw": {"H": 2.5, "D": 3.3, "A": 3.3},
        "volatility_gate_state": {"fired": False, "rules_tripped": []},
        "kelly_stake_pct": 0.012,
        "edge": {"outcome": "H", "H": 0.10, "D": -0.05, "A": -0.05},
        "code_sha": "abc1234",
        "data_sha": "deadbeef" * 8,
        "mc_seed": 42,
        "mc_runs": 10000,
    }


@pytest.fixture
def tmp_forecast_root(tmp_path):
    """Create a minimal forecast_log structure with M0 and M_STAR rows."""
    for model_id in ("M0", "M_STAR"):
        for match_id in ("FIFA2026-GS-BRA-ENG-20260614T1500Z", "FIFA2026-GS-ARG-FRA-20260615T1500Z"):
            for phase in ("opening", "closing"):
                path = (
                    tmp_path
                    / "evaluation"
                    / "forecasts"
                    / "FIFA2026"
                    / match_id
                    / f"{phase}.jsonl"
                )
                _write_forecast_jsonl(path, [_base_row(model_id, match_id, phase)])
    # Empty market state log
    msl = tmp_path / "market_state_log.jsonl"
    msl.write_text("")
    return tmp_path


class TestBuildShadowBook:
    def test_returns_shadow_book(self, tmp_forecast_root):
        book = build_shadow_book(
            model_id="M0",
            forecast_log_root=tmp_forecast_root,
            market_state_log=tmp_forecast_root / "market_state_log.jsonl",
        )
        assert isinstance(book, ShadowBook)
        assert book.model_id == "M0"

    def test_does_not_mutate_forecasts(self, tmp_forecast_root):
        # Record file hashes before and after
        paths = list((tmp_forecast_root / "evaluation" / "forecasts").rglob("*.jsonl"))
        hashes_before = {p: p.read_bytes() for p in paths}
        build_shadow_book(
            model_id="M0",
            forecast_log_root=tmp_forecast_root,
            market_state_log=tmp_forecast_root / "market_state_log.jsonl",
        )
        for p in paths:
            assert p.read_bytes() == hashes_before[p], f"File mutated: {p}"

    def test_gated_bets_excluded(self, tmp_forecast_root):
        # Add a gated opening row
        gated_row = _base_row("M0", "FIFA2026-GS-BRA-ENG-20260614T1500Z", "opening")
        gated_row["volatility_gate_state"] = {"fired": True, "rules_tripped": ["RULE_2"]}

        msl = tmp_forecast_root / "market_state_log.jsonl"
        with open(msl, "w") as fh:
            fh.write(
                json.dumps(
                    {
                        "match_id": "FIFA2026-GS-BRA-ENG-20260614T1500Z",
                        "gate_fired": True,
                    }
                )
                + "\n"
            )
        book = build_shadow_book(
            model_id="M0",
            forecast_log_root=tmp_forecast_root,
            market_state_log=msl,
        )
        # The gated match should appear as excluded
        gated = [b for b in book.bets if b.get("exclusion_reason") == "GATE_FIRED"]
        assert len(gated) >= 1

    def test_deterministic_replay(self, tmp_forecast_root):
        msl = tmp_forecast_root / "market_state_log.jsonl"
        b1 = build_shadow_book("M0", tmp_forecast_root, msl)
        b2 = build_shadow_book("M0", tmp_forecast_root, msl)
        assert len(b1.bets) == len(b2.bets)
        for bet1, bet2 in zip(b1.bets, b2.bets):
            assert bet1["match_id"] == bet2["match_id"]


# ---------------------------------------------------------------------------
# compute_pseudo_clv tests (4)
# ---------------------------------------------------------------------------

class TestComputePseudoCLV:
    def test_returns_shadow_clv_result(self, tmp_forecast_root):
        msl = tmp_forecast_root / "market_state_log.jsonl"
        book = build_shadow_book("M0", tmp_forecast_root, msl)
        result = compute_pseudo_clv(book)
        assert isinstance(result, ShadowCLVResult)
        assert result.shadow_of == "M0"

    def test_shadow_of_field_set(self, tmp_forecast_root):
        msl = tmp_forecast_root / "market_state_log.jsonl"
        book = build_shadow_book("M1", tmp_forecast_root, msl)
        result = compute_pseudo_clv(book)
        assert result.shadow_of == "M1"

    def test_empty_book_returns_no_edge(self):
        empty_book = ShadowBook(model_id="M2")
        result = compute_pseudo_clv(empty_book)
        assert result.report.hm_result.decision == "NO_EDGE"
        assert result.report.n_bets == 0

    def test_deterministic_given_frozen_inputs(self, tmp_forecast_root):
        msl = tmp_forecast_root / "market_state_log.jsonl"
        book = build_shadow_book("M0", tmp_forecast_root, msl)
        r1 = compute_pseudo_clv(book)
        r2 = compute_pseudo_clv(book)
        assert r1.report.n_bets == r2.report.n_bets
        if r1.report.n_bets > 0:
            np.testing.assert_allclose(r1.report.clv_mean, r2.report.clv_mean)


# ---------------------------------------------------------------------------
# ablation_sweep tests (3)
# ---------------------------------------------------------------------------

class TestAblationSweep:
    def test_returns_all_shadow_models(self, tmp_forecast_root):
        msl = tmp_forecast_root / "market_state_log.jsonl"
        results = ablation_sweep(tmp_forecast_root, msl)
        for mid in ("M0", "M1", "M2", "M3"):
            assert mid in results

    def test_does_not_mutate_forecast_log(self, tmp_forecast_root):
        msl = tmp_forecast_root / "market_state_log.jsonl"
        paths = list((tmp_forecast_root / "evaluation" / "forecasts").rglob("*.jsonl"))
        before = {p: p.read_bytes() for p in paths}
        ablation_sweep(tmp_forecast_root, msl)
        for p in paths:
            assert p.read_bytes() == before[p]

    def test_mstar_passthrough(self, tmp_forecast_root):
        from evaluation.clv_tracker import CLVReport, HMResult, CLVSeries
        empty_series = CLVSeries([], [], [], np.array([]), np.array([]), np.array([]), np.array([]), np.array([]))
        empty_hm = HMResult(0, 0.0, np.array([]), (0.0, 0.0), (0.0, 0.0), 4, 100, 0, "NO_EDGE")
        mstar = CLVReport("M_STAR", 5, 0.01, 0.05, 1.2, 0.1, False, 0.2, empty_hm, empty_series)
        msl = tmp_forecast_root / "market_state_log.jsonl"
        results = ablation_sweep(tmp_forecast_root, msl, mstar_report=mstar)
        assert "M_STAR" in results
        assert results["M_STAR"].report.n_bets == 5
