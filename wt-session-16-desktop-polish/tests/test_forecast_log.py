"""
tests/test_forecast_log.py
==========================
Golden-file tests for evaluation/forecast_log.py
Covers: schema validation (20), append invariants (15)
"""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# sys.path so tests resolve project modules
# ---------------------------------------------------------------------------
import sys
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.forecast_log import (
    VALID_CORRECTION_CODES,
    DuplicateEmissionError,
    ForecastRecord,
    InvalidProbabilityError,
    ProbVector,
    emit_correction,
    emit_opening,
    emit_closing,
    generate_ulid,
    make_forecast_record,
    pre_reg_constants_sha,
    read,
    rebuild_index,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def tmp_root(tmp_path):
    """Temporary project root — no real git required."""
    return tmp_path


def _make_record(
    match_id="FIFA2026-GS-BRA-ENG-20260614T1500Z",
    model_id="M_STAR",
    phase="opening",
    **kwargs,
) -> ForecastRecord:
    return make_forecast_record(
        match_id=match_id,
        model_id=model_id,
        market_phase=phase,
        p_home=0.50,
        p_draw=0.25,
        p_away=0.25,
        code_sha="abc1234",
        data_sha="deadbeef" * 8,
        mc_seed=42,
        mc_runs=10000,
        kelly_stake_pct=0.015,
        skip_git_check=True,
        **kwargs,
    )


# make_forecast_record doesn't have skip_git_check; it's on emit_*
# Fix: make_forecast_record is a pure constructor — remove stray kwarg
def _make_record_clean(**kwargs) -> ForecastRecord:
    return make_forecast_record(
        match_id=kwargs.pop("match_id", "FIFA2026-GS-BRA-ENG-20260614T1500Z"),
        model_id=kwargs.pop("model_id", "M_STAR"),
        market_phase=kwargs.pop("market_phase", "opening"),
        p_home=kwargs.pop("p_home", 0.50),
        p_draw=kwargs.pop("p_draw", 0.25),
        p_away=kwargs.pop("p_away", 0.25),
        code_sha=kwargs.pop("code_sha", "abc1234"),
        data_sha=kwargs.pop("data_sha", "deadbeef" * 8),
        mc_seed=kwargs.pop("mc_seed", 42),
        mc_runs=kwargs.pop("mc_runs", 10000),
        kelly_stake_pct=kwargs.pop("kelly_stake_pct", 0.015),
        **kwargs,
    )


# ---------------------------------------------------------------------------
# ULID tests (3)
# ---------------------------------------------------------------------------

class TestULID:
    def test_length_is_26(self):
        uid = generate_ulid()
        assert len(uid) == 26

    def test_crockford_charset(self):
        crockford = set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
        for _ in range(20):
            assert set(generate_ulid()).issubset(crockford)

    def test_monotonic_in_batch(self):
        ids = [generate_ulid() for _ in range(100)]
        # First 10 chars encode time — should be non-decreasing
        ts_parts = [uid[:10] for uid in ids]
        assert ts_parts == sorted(ts_parts)


# ---------------------------------------------------------------------------
# ProbVector schema validation (5)
# ---------------------------------------------------------------------------

class TestProbVector:
    def test_valid_sums_to_one(self):
        pv = ProbVector(H=0.5, D=0.25, A=0.25)
        assert abs(pv.H + pv.D + pv.A - 1.0) < 1e-9

    def test_rejects_sum_off_by_1e8(self):
        with pytest.raises(Exception):
            ProbVector(H=0.5, D=0.25, A=0.26)  # sum = 1.01

    def test_boundary_values(self):
        pv = ProbVector(H=1.0, D=0.0, A=0.0)
        assert pv.H == 1.0

    def test_zero_probability_allowed(self):
        ProbVector(H=0.0, D=0.5, A=0.5)

    def test_negative_probability_rejected(self):
        with pytest.raises(Exception):
            ProbVector(H=-0.1, D=0.6, A=0.5)


# ---------------------------------------------------------------------------
# ForecastRecord schema validation (7)
# ---------------------------------------------------------------------------

class TestForecastRecordSchema:
    def test_valid_record_construction(self):
        r = _make_record_clean()
        assert r.schema_version == "7.0"
        assert r.is_champion is True

    def test_invalid_model_id_rejected(self):
        with pytest.raises(Exception):
            _make_record_clean(model_id="M99")

    def test_invalid_phase_rejected(self):
        with pytest.raises(Exception):
            _make_record_clean(market_phase="premarket")

    def test_is_champion_flag_consistency_m0(self):
        r = _make_record_clean(model_id="M0")
        assert r.is_champion is False

    def test_is_champion_flag_consistency_mstar(self):
        r = _make_record_clean(model_id="M_STAR")
        assert r.is_champion is True

    def test_kelly_stake_non_negative(self):
        with pytest.raises(Exception):
            _make_record_clean(kelly_stake_pct=-0.01)

    def test_schema_version_is_7_0(self):
        r = _make_record_clean()
        assert r.schema_version == "7.0"


# ---------------------------------------------------------------------------
# emit_opening invariants (8)
# ---------------------------------------------------------------------------

class TestEmitOpening:
    def test_basic_emit_returns_forecast_id(self, tmp_root):
        rec = _make_record_clean()
        fid = emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        assert fid == rec.forecast_id

    def test_file_created_in_correct_path(self, tmp_root):
        rec = _make_record_clean()
        emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        expected = (
            tmp_root / "evaluation" / "forecasts" / "FIFA2026"
            / rec.match_id / "opening.jsonl"
        )
        assert expected.exists()

    def test_row_is_valid_json(self, tmp_root):
        rec = _make_record_clean()
        emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        path = tmp_root / "evaluation" / "forecasts" / "FIFA2026" / rec.match_id / "opening.jsonl"
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        assert len(rows) == 1
        assert rows[0]["forecast_id"] == rec.forecast_id

    def test_duplicate_raises(self, tmp_root):
        rec = _make_record_clean()
        emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        with pytest.raises(DuplicateEmissionError):
            emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)

    def test_different_models_same_match_allowed(self, tmp_root):
        rec0 = _make_record_clean(model_id="M0")
        rec1 = _make_record_clean(model_id="M_STAR")
        emit_opening(rec0, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        emit_opening(rec1, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        path = tmp_root / "evaluation" / "forecasts" / "FIFA2026" / rec0.match_id / "opening.jsonl"
        rows = path.read_text().splitlines()
        assert len([r for r in rows if r.strip()]) == 2

    def test_closing_independent_of_opening(self, tmp_root):
        rec = _make_record_clean(market_phase="closing")
        emit_closing(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        path = tmp_root / "evaluation" / "forecasts" / "FIFA2026" / rec.match_id / "closing.jsonl"
        assert path.exists()

    def test_five_models_each_once(self, tmp_root):
        for mid in ("M0", "M1", "M2", "M3", "M_STAR"):
            rec = _make_record_clean(model_id=mid)
            emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        path = tmp_root / "evaluation" / "forecasts" / "FIFA2026" / "FIFA2026-GS-BRA-ENG-20260614T1500Z" / "opening.jsonl"
        rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
        assert len(rows) == 5

    def test_schema_version_7_0_in_file(self, tmp_root):
        rec = _make_record_clean()
        emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        path = tmp_root / "evaluation" / "forecasts" / "FIFA2026" / rec.match_id / "opening.jsonl"
        row = json.loads(path.read_text().splitlines()[0])
        assert row["schema_version"] == "7.0"


# ---------------------------------------------------------------------------
# emit_correction invariants (5)
# ---------------------------------------------------------------------------

class TestEmitCorrection:
    def test_valid_correction_written(self, tmp_root):
        cid = emit_correction(
            original_forecast_id="FAKEULID",
            reason_code="CORR_DATA_FIX",
            payload={"note": "odds feed glitch"},
            match_id="FIFA2026-GS-BRA-ENG-20260614T1500Z",
            project_root=tmp_root,
            skip_git_check=True,
        )
        path = (
            tmp_root / "evaluation" / "forecasts" / "FIFA2026"
            / "FIFA2026-GS-BRA-ENG-20260614T1500Z" / "corrections.jsonl"
        )
        assert path.exists()
        row = json.loads(path.read_text().splitlines()[0])
        assert row["correction_id"] == cid
        assert row["reason_code"] == "CORR_DATA_FIX"

    def test_invalid_reason_code_rejected(self, tmp_root):
        with pytest.raises(ValueError):
            emit_correction(
                original_forecast_id="X",
                reason_code="MADE_UP_CODE",
                payload={},
                match_id="any",
                project_root=tmp_root,
                skip_git_check=True,
            )

    def test_all_valid_reason_codes_accepted(self, tmp_root):
        for code in VALID_CORRECTION_CODES:
            emit_correction(
                original_forecast_id="X",
                reason_code=code,
                payload={},
                match_id="FIFA2026-GS-BRA-ENG-20260614T1500Z",
                project_root=tmp_root,
                skip_git_check=True,
            )

    def test_correction_does_not_alter_opening_jsonl(self, tmp_root):
        rec = _make_record_clean()
        emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        opening_path = (
            tmp_root / "evaluation" / "forecasts" / "FIFA2026" / rec.match_id / "opening.jsonl"
        )
        content_before = opening_path.read_bytes()
        emit_correction(
            original_forecast_id=rec.forecast_id,
            reason_code="CORR_KICKOFF_MOVED",
            payload={"new_kickoff": "2026-06-14T17:00:00Z"},
            match_id=rec.match_id,
            project_root=tmp_root,
            skip_git_check=True,
        )
        assert opening_path.read_bytes() == content_before

    def test_correction_schema_version(self, tmp_root):
        emit_correction(
            original_forecast_id="Y",
            reason_code="CORR_ALIAS_RESOLVED",
            payload={},
            match_id="any_match",
            project_root=tmp_root,
            skip_git_check=True,
        )
        path = tmp_root / "evaluation" / "forecasts" / "FIFA2026" / "any_match" / "corrections.jsonl"
        row = json.loads(path.read_text().splitlines()[0])
        assert row["schema_version"] == "7.0"


# ---------------------------------------------------------------------------
# read() and rebuild_index() (7)
# ---------------------------------------------------------------------------

class TestReadAndIndex:
    def test_read_returns_all_phases(self, tmp_root):
        o = _make_record_clean(market_phase="opening")
        c = _make_record_clean(market_phase="closing")
        emit_opening(o, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        emit_closing(c, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        records = read(o.match_id, project_root=tmp_root)
        assert len(records) == 2

    def test_read_filtered_by_model(self, tmp_root):
        for mid in ("M0", "M_STAR"):
            rec = _make_record_clean(model_id=mid)
            emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        records = read("FIFA2026-GS-BRA-ENG-20260614T1500Z", model_id="M0", project_root=tmp_root)
        assert len(records) == 1
        assert records[0].model_id == "M0"

    def test_read_empty_for_missing_match(self, tmp_root):
        records = read("does-not-exist", project_root=tmp_root)
        assert records == []

    def test_rebuild_index_creates_parquet(self, tmp_root):
        for mid in ("M0", "M_STAR"):
            rec = _make_record_clean(model_id=mid)
            emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        rebuild_index(project_root=tmp_root)
        index = tmp_root / "evaluation" / "forecasts" / "index.parquet"
        assert index.exists()

    def test_rebuild_index_idempotent(self, tmp_root):
        rec = _make_record_clean()
        emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        rebuild_index(project_root=tmp_root)
        index = tmp_root / "evaluation" / "forecasts" / "index.parquet"
        content1 = index.read_bytes()
        rebuild_index(project_root=tmp_root)
        content2 = index.read_bytes()
        assert content1 == content2

    def test_rebuild_index_row_count(self, tmp_root):
        import pandas as pd
        for mid in ("M0", "M1", "M_STAR"):
            rec = _make_record_clean(model_id=mid)
            emit_opening(rec, project_root=tmp_root, skip_git_check=True, skip_snapshot_check=True)
        rebuild_index(project_root=tmp_root)
        df = pd.read_parquet(tmp_root / "evaluation" / "forecasts" / "index.parquet")
        assert len(df) == 3

    def test_pre_reg_constants_sha_returns_hex(self):
        sha = pre_reg_constants_sha()
        assert len(sha) == 64
        assert all(c in "0123456789abcdef" for c in sha)
