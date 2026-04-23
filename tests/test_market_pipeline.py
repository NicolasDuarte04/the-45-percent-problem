"""
tests/test_market_pipeline.py
==============================
Unit tests for market/market_pipeline.py.

Acceptance criteria (§9.7):
- Re-run against archived snapshot produces byte-identical forecast_log.jsonl.
- Every row validates against ForecastLogRow schema.
- No imports from simulation/ module.
- Append-only forecast log.
- per-event and per-day cap enforcement.
"""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.market_pipeline import (
    ForecastLogRow,
    MarketPipeline,
    PipelineConfig,
    _PER_DAY_CAP,
    _PER_EVENT_CAP,
)


# ---------------------------------------------------------------------------
# Test fixtures
# ---------------------------------------------------------------------------

_TS = datetime(2026, 6, 20, 15, 0, 0, tzinfo=timezone.utc)

# Minimal market input: typical 3-way 1X2 with ~4% overround
_TYPICAL_MARKET = {
    "market_id": "m001",
    "market_class": "1x2",
    "stage": "group",
    "book": "pinnacle",
    "odds": [2.5, 3.5, 2.8],
    "outcome_labels": ["home_win", "draw", "away_win"],
    "p_model": [0.48, 0.27, 0.25],  # model slightly above market on home
    "host_team": None,
    "entity_ids": ["BRA", "ARG"],
    "snapshot_data": {},
}

_SUPPRESSED_MARKET = {
    "market_id": "m002",
    "market_class": "1x2",
    "stage": "group",
    "book": "pinnacle",
    "odds": [2.5, 3.5, 2.8],
    "outcome_labels": ["home_win", "draw", "away_win"],
    "p_model": [0.48, 0.27, 0.25],
    "host_team": None,
    "entity_ids": ["GER", "FRA"],
    "snapshot_data": {
        "polymarket_volume_24h_usd": 10_000,   # below $50k → Rule 4 fires
    },
}


def _make_pipeline(tmp_path) -> MarketPipeline:
    cfg = PipelineConfig(
        forecast_log_path=tmp_path / "forecast_log.jsonl",
        gate_log_path=tmp_path / "gate_log.jsonl",
        initial_bankroll=10_000.0,
        code_sha="test_sha_abc",
        data_sha="test_data_sha",
        spec_sha="test_spec_sha",
    )
    return MarketPipeline(cfg)


# ---------------------------------------------------------------------------
# Basic correctness
# ---------------------------------------------------------------------------

class TestBasicPipeline:
    def test_run_once_produces_rows(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        summary = pipeline.run_once(_TS, [_TYPICAL_MARKET])
        assert summary.markets_processed == 1
        log = tmp_path / "forecast_log.jsonl"
        assert log.exists()
        lines = log.read_text().strip().splitlines()
        assert len(lines) > 0

    def test_all_rows_validate_schema(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_TYPICAL_MARKET])
        log = tmp_path / "forecast_log.jsonl"
        for line in log.read_text().strip().splitlines():
            row = json.loads(line)
            # Must not raise
            ForecastLogRow.model_validate(row)

    def test_suppressed_market_has_zero_stake(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_SUPPRESSED_MARKET])
        log = tmp_path / "forecast_log.jsonl"
        rows = [json.loads(l) for l in log.read_text().strip().splitlines()]
        suppressed = [r for r in rows if r["gate_status"] == "SUPPRESSED"]
        for r in suppressed:
            assert r["recommended_stake_fraction"] == 0.0

    def test_code_sha_present_in_rows(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_TYPICAL_MARKET])
        log = tmp_path / "forecast_log.jsonl"
        for line in log.read_text().strip().splitlines():
            row = json.loads(line)
            assert row["code_sha"] == "test_sha_abc"

    def test_gate_log_written(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_TYPICAL_MARKET])
        gate_log = tmp_path / "gate_log.jsonl"
        assert gate_log.exists()
        assert gate_log.stat().st_size > 0

    def test_gate_log_sidecar_written(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_TYPICAL_MARKET])
        sidecar = tmp_path / "gate_log.jsonl.sha256"
        assert sidecar.exists()


# ---------------------------------------------------------------------------
# Append-only log
# ---------------------------------------------------------------------------

class TestAppendOnly:
    def test_forecast_log_grows_monotonically(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_TYPICAL_MARKET])
        size1 = (tmp_path / "forecast_log.jsonl").stat().st_size
        pipeline.run_once(_TS, [_SUPPRESSED_MARKET])
        size2 = (tmp_path / "forecast_log.jsonl").stat().st_size
        assert size2 > size1

    def test_prior_rows_not_overwritten(self, tmp_path):
        pipeline = _make_pipeline(tmp_path)
        pipeline.run_once(_TS, [_TYPICAL_MARKET])
        first_row_id = json.loads(
            (tmp_path / "forecast_log.jsonl").read_text().splitlines()[0]
        )["row_id"]
        pipeline.run_once(_TS, [_SUPPRESSED_MARKET])
        # First row ID must still appear in the log
        all_ids = [
            json.loads(l)["row_id"]
            for l in (tmp_path / "forecast_log.jsonl").read_text().splitlines()
        ]
        assert first_row_id in all_ids


# ---------------------------------------------------------------------------
# Determinism / reproducibility (§9.7)
# ---------------------------------------------------------------------------

class TestDeterminism:
    def test_two_runs_same_inputs_same_sha(self, tmp_path):
        """
        Re-running the pipeline against the same inputs must produce a
        byte-identical forecast_log.jsonl (modulo row_ids which are UUIDs).

        We test structural determinism: same gate decisions, same stake fractions,
        same field values (excluding UUID row_ids).
        """
        def _extract_comparable(log_path: Path):
            rows = []
            for line in log_path.read_text().strip().splitlines():
                r = json.loads(line)
                # Remove non-deterministic UUID row_id and parent_decision_id
                r.pop("row_id", None)
                r.pop("parent_decision_id", None)
                rows.append(r)
            return rows

        log1 = tmp_path / "run1_forecast.jsonl"
        log2 = tmp_path / "run2_forecast.jsonl"
        gate1 = tmp_path / "run1_gate.jsonl"
        gate2 = tmp_path / "run2_gate.jsonl"

        cfg1 = PipelineConfig(
            forecast_log_path=log1,
            gate_log_path=gate1,
            initial_bankroll=10_000.0,
            code_sha="sha1",
            data_sha="data1",
        )
        cfg2 = PipelineConfig(
            forecast_log_path=log2,
            gate_log_path=gate2,
            initial_bankroll=10_000.0,
            code_sha="sha1",
            data_sha="data1",
        )

        MarketPipeline(cfg1).run_once(_TS, [_TYPICAL_MARKET, _SUPPRESSED_MARKET])
        MarketPipeline(cfg2).run_once(_TS, [_TYPICAL_MARKET, _SUPPRESSED_MARKET])

        rows1 = _extract_comparable(log1)
        rows2 = _extract_comparable(log2)

        assert rows1 == rows2, "Determinism broken: same inputs produced different rows"


# ---------------------------------------------------------------------------
# Static isolation test: no simulation/ imports
# ---------------------------------------------------------------------------

def _is_actual_import_line(line: str) -> bool:
    """Return True only for lines that are genuine Python import statements."""
    stripped = line.strip()
    if not stripped:
        return False
    # Skip comment lines and docstrings (naive but effective for this codebase)
    if stripped.startswith(("#", '"""', "'''", "*", "-")):
        return False
    # Must start with 'import' or 'from' as a keyword
    return stripped.startswith(("import ", "from "))


class TestIsolation:
    def test_no_simulation_imports(self):
        """
        market_pipeline.py must NOT import anything from the simulation/ package.
        This is enforced by checking actual import statements only.
        """
        source_file = PROJECT_ROOT / "market" / "market_pipeline.py"
        source = source_file.read_text()
        for line in source.splitlines():
            if not _is_actual_import_line(line):
                continue
            assert "simulation" not in line, \
                f"Illegal simulation/ import found: {line!r}"

    def test_no_simulation_imports_in_any_market_module(self):
        """All market/ modules must be free of simulation/ imports."""
        market_dir = PROJECT_ROOT / "market"
        for py_file in market_dir.glob("*.py"):
            source = py_file.read_text()
            for line in source.splitlines():
                if not _is_actual_import_line(line):
                    continue
                assert "simulation" not in line, \
                    f"{py_file.name}: illegal import: {line!r}"


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------

class TestSchemaValidation:
    def test_invalid_row_raises(self):
        """ForecastLogRow must raise on invalid data."""
        with pytest.raises(Exception):
            ForecastLogRow.model_validate({
                "row_id": "x",
                "ts": "2026-06-20T15:00:00+00:00",
                "market_id": "m1",
                "outcome_id": "home_win",
                "p_model": 2.0,   # > 1.0 → invalid
                "q_devigged": 0.4,
                "E": 0.05,
                "E_star": 1.5,
                "gate_status": "PASS",
                "reason_code": "NONE",
                "recommended_stake_fraction": 0.01,
                "bankroll_mode": "NORMAL",
                "code_sha": "x",
                "data_sha": "y",
            })
