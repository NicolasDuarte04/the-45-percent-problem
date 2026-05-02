"""
tests/test_evaluation_dashboard.py
====================================
Golden-file tests for evaluation/evaluation_dashboard.py
Covers: dashboard output equality (12)
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.accuracy_metrics import (
    MetricsTable,
    ModelMetrics,
    StageMetrics,
)
from evaluation.clv_tracker import CLVReport, CLVSeries, HMResult
from evaluation.pseudo_clv import ShadowCLVResult
from evaluation.evaluation_dashboard import (
    DiffReport,
    compile_ablation,
    diff_against,
    _r,
    _DP,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _dummy_mm(model_id: str, n: int = 104) -> ModelMetrics:
    return ModelMetrics(
        model_id=model_id,
        n=n,
        brier_mean=0.4321,
        brier_ci=(0.4100, 0.4500),
        rps_mean=0.2000,
        rps_median=0.1900,
        rps_ci=(0.1800, 0.2200),
        log_loss_mean=1.0500,
        log_loss_ci=(1.0200, 1.0800),
    )


def _dummy_clv_report(model_id: str = "M_STAR") -> CLVReport:
    series = CLVSeries(
        [], [], [],
        np.array([0.01, 0.02, -0.01]),
        np.array([0.01, 0.02, -0.01]),
        np.array([0.01, 0.01, 0.01]),
        np.array([0.01, 0.03, 0.02]),
        np.array([0.0001, 0.0003, 0.0002]),
    )
    hm = HMResult(
        n=3,
        sharpe_point=0.1547,
        bootstrap_distribution=np.linspace(-0.5, 0.5, 100),
        ci_90=(-0.2, 0.5),
        ci_95=(-0.3, 0.6),
        block_length=4,
        n_bootstrap=100,
        bootstrap_seed=12345,
        decision="NO_EDGE",
    )
    return CLVReport(
        model_id=model_id,
        n_bets=3,
        clv_mean=0.0067,
        clv_std=0.0153,
        z_stat=0.75,
        z_pvalue=0.23,
        z_reject=False,
        sharpe=0.1547,
        hm_result=hm,
        series=series,
        code_sha="abc1234",
    )


def _dummy_shadow(model_id: str) -> ShadowCLVResult:
    return ShadowCLVResult(
        shadow_of=model_id,
        report=_dummy_clv_report(model_id),
    )


def _dummy_metrics() -> MetricsTable:
    mms = {mid: _dummy_mm(mid) for mid in ("M0", "M1", "M2", "M3", "M_STAR")}
    return MetricsTable(
        model_metrics=mms,
        dm_results=[],
        nyberg_results=[],
    )


# ---------------------------------------------------------------------------
# Pre-reg constants SHA enforcement (2)
# ---------------------------------------------------------------------------

class TestConstantsSHA:
    def test_compile_succeeds_without_expected_sha(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path)
        assert (tmp_path / "ablation.json").exists()

    def test_compile_aborts_on_sha_mismatch(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        with pytest.raises(ValueError, match="SHA mismatch"):
            compile_ablation(
                metrics,
                mstar,
                shadows,
                output_dir=tmp_path,
                expected_constants_sha="0" * 64,  # wrong SHA
            )


# ---------------------------------------------------------------------------
# ablation.json schema and content (5)
# ---------------------------------------------------------------------------

class TestAblationJSON:
    @pytest.fixture(autouse=True)
    def _compile(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path)
        self.json_path = tmp_path / "ablation.json"
        with open(self.json_path) as fh:
            self.data = json.load(fh)

    def test_schema_version_7_0(self):
        assert self.data["schema_version"] == "7.0"

    def test_all_models_present(self):
        for mid in ("M0", "M1", "M2", "M3", "M_STAR"):
            assert mid in self.data["models"]

    def test_numeric_precision_4dp(self):
        for mid, mdata in self.data["models"].items():
            acc = mdata.get("accuracy")
            if acc is None:
                continue
            bm = acc.get("brier_mean")
            if bm is not None:
                # Check stored with exactly 4 dp
                assert abs(bm - round(bm, _DP)) < 1e-10

    def test_kill_criterion_field_present(self):
        assert "kill_criterion_tripped" in self.data

    def test_pre_reg_sha_matches_file(self):
        import hashlib
        sha = self.data["pre_reg_constants_sha"]
        yaml_path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
        h = hashlib.sha256()
        h.update(yaml_path.read_bytes())
        assert sha == h.hexdigest()

    def test_regeneration_byte_identical(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        fixed_ts = "2026-06-11T12:00:00.000Z"
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path, generated_at_utc=fixed_ts)
        content1 = (tmp_path / "ablation.json").read_bytes()
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path, generated_at_utc=fixed_ts)
        content2 = (tmp_path / "ablation.json").read_bytes()
        assert content1 == content2


# ---------------------------------------------------------------------------
# ablation.tex output (3)
# ---------------------------------------------------------------------------

class TestAblationTex:
    @pytest.fixture(autouse=True)
    def _compile(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path)
        # Filenames are sourced from pre_reg_constants.yaml dashboard.output_files;
        # the .tex artifact is named ablation_table.tex (frozen pre-registration).
        self.tex_path = tmp_path / "ablation_table.tex"
        self.caption_path = tmp_path / "ablation_caption.tex"
        self.tex = self.tex_path.read_text()

    def test_tex_file_created(self):
        assert self.tex_path.exists()

    def test_caption_file_created(self):
        assert self.caption_path.exists()

    def test_mstar_rowcolor_present(self):
        assert r"\rowcolor" in self.tex

    def test_booktabs_commands_present(self):
        assert r"\toprule" in self.tex
        assert r"\midrule" in self.tex
        assert r"\bottomrule" in self.tex


# ---------------------------------------------------------------------------
# diff_against (2)
# ---------------------------------------------------------------------------

class TestDiffAgainst:
    def test_identical_files_no_change(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path)
        current = tmp_path / "ablation.json"
        # Copy as "previous"
        import shutil
        prev = tmp_path / "ablation_prev.json"
        shutil.copy(current, prev)
        report = diff_against(current, prev)
        assert not report.changed

    def test_missing_previous_reports_change(self, tmp_path):
        metrics = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        compile_ablation(metrics, mstar, shadows, output_dir=tmp_path)
        current = tmp_path / "ablation.json"
        report = diff_against(current, tmp_path / "does_not_exist.json")
        assert report.changed

    def test_changed_value_detected(self, tmp_path):
        metrics1 = _dummy_metrics()
        mstar = _dummy_clv_report()
        shadows = {mid: _dummy_shadow(mid) for mid in ("M0", "M1", "M2", "M3")}
        compile_ablation(metrics1, mstar, shadows, output_dir=tmp_path)
        import shutil
        prev = tmp_path / "prev.json"
        shutil.copy(tmp_path / "ablation.json", prev)

        # Modify a metric value
        metrics2_mms = {mid: _dummy_mm(mid) for mid in ("M0", "M1", "M2", "M3", "M_STAR")}
        metrics2_mms["M_STAR"] = ModelMetrics(
            model_id="M_STAR", n=104,
            brier_mean=0.5000,  # changed
            brier_ci=(0.48, 0.52),
            rps_mean=0.2100, rps_median=0.2000, rps_ci=(0.19, 0.23),
            log_loss_mean=1.100, log_loss_ci=(1.07, 1.13),
        )
        metrics2 = MetricsTable(model_metrics=metrics2_mms, dm_results=[], nyberg_results=[])
        compile_ablation(metrics2, mstar, shadows, output_dir=tmp_path)
        report = diff_against(tmp_path / "ablation.json", prev)
        assert report.changed
        assert len(report.changed_fields) > 0
