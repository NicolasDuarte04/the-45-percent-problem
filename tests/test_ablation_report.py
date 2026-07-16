"""
tests/test_ablation_report.py
=============================
cp-36: the templated R16 ablation report.

Covers:
  - the frozen reconstruction adapter (M0 / M2 / M_STAR populated, rest absent),
  - the R16 checkpoint cross-check (0.899338 / 0.944197),
  - honest nulls (M1 / M3 / market / trading / nyberg / knockout all null),
  - byte-identical regeneration,
  - the live-sha / no-stale-seal behaviour,
  - the carry-forward regen persistence,
  - schema validation of ablation.json against schema/ablation_v7.json (finally
    giving the schema a consumer), including the committed published artifact.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import jsonschema
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.ablation_report import (
    ABLATION_JSON_FILENAME,
    build_frozen_metrics_table,
    compute_ablation,
    crosscheck_against_r16,
    publish_ablation,
)

_SCHEMA_PATH = PROJECT_ROOT / "schema" / "ablation_v7.json"
_PUBLISHED_ABLATION = (
    PROJECT_ROOT / "website" / "public" / "data" / "latest" / "ablation.json"
)
_R16_CHECKPOINT = (
    PROJECT_ROOT / "website" / "public" / "data" / "latest" / "r16_checkpoint.json"
)

_FIXED_TS = "2026-07-16T00:00:00.000Z"


@pytest.fixture(scope="module")
def schema() -> dict:
    return json.loads(_SCHEMA_PATH.read_text())


@pytest.fixture(scope="module")
def built():
    metrics, crosscheck = build_frozen_metrics_table()
    return metrics, crosscheck


@pytest.fixture(scope="module")
def compiled(tmp_path_factory):
    out = tmp_path_factory.mktemp("ablation")
    compute_ablation(output_dir=out, generated_at_utc=_FIXED_TS)
    data = json.loads((out / ABLATION_JSON_FILENAME).read_text())
    return out, data


# ---------------------------------------------------------------------------
# Cross-check against the once-only R16 checkpoint
# ---------------------------------------------------------------------------

class TestCheckpointCrosscheck:
    def test_means_match_published_checkpoint(self, built):
        _, crosscheck = built
        ref = json.loads(_R16_CHECKPOINT.read_text())
        assert crosscheck["mean_log_loss_mstar"] == ref["mean_log_loss_mstar"]
        assert crosscheck["mean_log_loss_m0"] == ref["mean_log_loss_m0"]

    def test_hardcoded_checkpoint_values(self, built):
        _, crosscheck = built
        assert crosscheck["mean_log_loss_mstar"] == 0.899338
        assert crosscheck["mean_log_loss_m0"] == 0.944197
        assert crosscheck["n"] == 72

    def test_crosscheck_helper_passes(self, built):
        _, crosscheck = built
        result = crosscheck_against_r16(crosscheck)
        assert result["matches_r16_checkpoint"] is True

    def test_crosscheck_raises_on_mismatch(self):
        bad = {"n": 72, "mean_log_loss_mstar": 0.111111, "mean_log_loss_m0": 0.222222}
        with pytest.raises(ValueError, match="cross-check FAILED"):
            crosscheck_against_r16(bad)


# ---------------------------------------------------------------------------
# MetricsTable shape: only M0 / M2 / M_STAR populated
# ---------------------------------------------------------------------------

class TestMetricsTableShape:
    def test_only_three_models_present(self, built):
        metrics, _ = built
        assert set(metrics.model_metrics) == {"M0", "M2", "M_STAR"}

    def test_mstar_equals_m2(self, built):
        metrics, _ = built
        m2 = metrics.model_metrics["M2"]
        ms = metrics.model_metrics["M_STAR"]
        assert ms.brier_mean == m2.brier_mean
        assert ms.log_loss_mean == m2.log_loss_mean
        assert ms.rps_mean == m2.rps_mean

    def test_dm_results_m2_and_mstar_vs_m0_brier(self, built):
        metrics, _ = built
        pairs = {(d.model_a, d.model_b, d.loss_type) for d in metrics.dm_results}
        assert ("M2", "M0", "brier") in pairs
        assert ("M_STAR", "M0", "brier") in pairs
        assert all(d.hln_applied for d in metrics.dm_results)

    def test_no_nyberg(self, built):
        metrics, _ = built
        assert metrics.nyberg_results == []

    def test_kill_criterion_not_tripped(self, built):
        metrics, _ = built
        assert metrics.kill_criterion_tripped is False

    def test_by_stage_only_group(self, built):
        metrics, _ = built
        for mid in ("M0", "M2", "M_STAR"):
            assert set(metrics.model_metrics[mid].by_stage) == {"group"}
            assert metrics.model_metrics[mid].by_stage["group"].n == 72


# ---------------------------------------------------------------------------
# Honest nulls in the compiled JSON
# ---------------------------------------------------------------------------

class TestHonestNulls:
    def test_populated_accuracy(self, compiled):
        _, data = compiled
        for mid in ("M0", "M2", "M_STAR"):
            assert data["models"][mid]["accuracy"] is not None

    def test_null_accuracy(self, compiled):
        _, data = compiled
        for mid in ("M1", "M3", "MARKET_DEVIGGED"):
            assert data["models"][mid]["accuracy"] is None

    def test_all_market_and_trading_null(self, compiled):
        _, data = compiled
        for mid, m in data["models"].items():
            assert m["dm_vs_market"] is None
            assert m["nyberg"] is None
            assert m["trading"] is None

    def test_dm_vs_m0_only_on_m2_and_mstar(self, compiled):
        _, data = compiled
        assert data["models"]["M2"]["dm_vs_m0"] is not None
        assert data["models"]["M_STAR"]["dm_vs_m0"] is not None
        for mid in ("M0", "M1", "M3", "MARKET_DEVIGGED"):
            assert data["models"][mid]["dm_vs_m0"] is None

    def test_by_stage_group_only_no_knockout(self, compiled):
        _, data = compiled
        for mid in ("M0", "M2", "M_STAR"):
            assert set(data["models"][mid]["by_stage"]) == {"group"}


# ---------------------------------------------------------------------------
# Meta block, live sha, no stale seal
# ---------------------------------------------------------------------------

class TestMetaAndSha:
    def test_meta_present(self, compiled):
        _, data = compiled
        meta = data["meta"]
        assert "timing_disclosure" in meta
        assert "gaps_note" in meta
        assert meta["checkpoint_crosscheck"]["matches_r16_checkpoint"] is True
        assert meta["n_scored"] == 72

    def test_live_yaml_sha_embedded(self, compiled):
        import hashlib

        _, data = compiled
        yaml_path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
        live = hashlib.sha256(yaml_path.read_bytes()).hexdigest()
        assert data["pre_reg_constants_sha"] == live

    def test_stale_seal_not_used(self, compiled):
        _, data = compiled
        stale = (PROJECT_ROOT / "evaluation" / "constants.sha").read_text().strip()
        # The report must NOT be pinned to the stale Phase 8 seal.
        assert data["pre_reg_constants_sha"] != stale


# ---------------------------------------------------------------------------
# Byte-identical regeneration
# ---------------------------------------------------------------------------

class TestByteIdentical:
    def test_regeneration_byte_identical(self, tmp_path):
        a = tmp_path / "a"
        b = tmp_path / "b"
        compute_ablation(output_dir=a, generated_at_utc=_FIXED_TS)
        compute_ablation(output_dir=b, generated_at_utc=_FIXED_TS)
        for name in ("ablation.json", "ablation_table.tex", "ablation_caption.tex"):
            assert (a / name).read_bytes() == (b / name).read_bytes()


# ---------------------------------------------------------------------------
# Schema validation (the schema finally gets a consumer)
# ---------------------------------------------------------------------------

class TestSchemaValidation:
    def test_compiled_validates(self, compiled, schema):
        _, data = compiled
        jsonschema.validate(instance=data, schema=schema)

    def test_committed_published_artifact_validates(self, schema):
        assert _PUBLISHED_ABLATION.exists(), "ablation.json must be committed"
        data = json.loads(_PUBLISHED_ABLATION.read_text())
        jsonschema.validate(instance=data, schema=schema)

    def test_committed_artifact_generated_at_pattern(self, schema):
        data = json.loads(_PUBLISHED_ABLATION.read_text())
        # The schema pattern requires millisecond precision + Z.
        import re

        pattern = schema["properties"]["generated_at_utc"]["pattern"]
        assert re.match(pattern, data["generated_at_utc"])


# ---------------------------------------------------------------------------
# Regen persistence: carry-forward byte-identical
# ---------------------------------------------------------------------------

class TestPublishCarryForward:
    def test_carry_forward_byte_identical(self, tmp_path):
        latest = tmp_path / "latest"
        new = tmp_path / "new"
        latest.mkdir()
        new.mkdir()
        # Seed latest/ with the committed published artifact.
        (latest / ABLATION_JSON_FILENAME).write_bytes(_PUBLISHED_ABLATION.read_bytes())
        publish_ablation(new_dir=new, latest_dir=latest, generated_at_utc=_FIXED_TS)
        assert (new / ABLATION_JSON_FILENAME).read_bytes() == (
            latest / ABLATION_JSON_FILENAME
        ).read_bytes()

    def test_first_publish_fallback_computes_json_only(self, tmp_path):
        latest = tmp_path / "latest"  # empty: no prior ablation.json
        new = tmp_path / "new"
        latest.mkdir()
        new.mkdir()
        publish_ablation(new_dir=new, latest_dir=latest, generated_at_utc=_FIXED_TS)
        assert (new / ABLATION_JSON_FILENAME).exists()
        # The LaTeX fragments are repo-record, not snapshot artifacts.
        assert not (new / "ablation_table.tex").exists()
        assert not (new / "ablation_caption.tex").exists()
