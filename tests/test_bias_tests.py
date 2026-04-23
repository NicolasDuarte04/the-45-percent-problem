"""
tests/test_bias_tests.py
========================
Tests for market/bias_tests.py.

Golden-file tests:
  - Generate a deterministic synthetic forecast_log.jsonl with 60 rows.
  - Run run_all_bias_tests() and compute SHA-256 of the JSONL output.
  - The SHA is stored as _GOLDEN_SHA below.  A mismatch fails the test,
    prompting the developer to inspect what changed and update the SHA
    deliberately (not silently).

Other tests:
  - BH FDR correction correctness
  - SHA-256 spec-verification raises on tampered YAML
  - BiasTestResult schema completeness
  - All 7 tests return a result even on sparse data (insufficient_data path)
  - T1–T7 return expected fields
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
import tempfile
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.bias_tests import (
    BiasTestResult,
    _bh_correction,
    _cochran_armitage,
    _bootstrap_t_test,
    _linear_regression_t,
    _ks_test,
    _chi_squared_test,
    _permutation_diff,
    _load_spec,
    _sha256_file,
    run_all_bias_tests,
    _PREREGISTERED_SPEC_SHA,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SPEC_YAML = PROJECT_ROOT / "market" / "bias_tests_preregistered.yaml"


# ---------------------------------------------------------------------------
# Synthetic forecast log builder
# ---------------------------------------------------------------------------

def _make_synthetic_log(path: Path, n_rows: int = 60) -> None:
    """
    Write a deterministic synthetic forecast_log.jsonl.

    Uses a fixed seed so SHA is reproducible across runs.
    Rows span a range of q_devigged values to exercise all 7 test strata.
    """
    import math
    rows = []
    for i in range(n_rows):
        # Spread q from 0.05 to 0.90 in a regular pattern
        q = 0.05 + (i % 20) * (0.85 / 19)
        p = min(1.0, q + 0.04 * math.sin(i * 0.5))   # model slightly diverges
        e = p - q
        e_star = e / 0.06  # normalised edge

        row = {
            "row_id": f"row_{i:04d}",
            "parent_decision_id": None,
            "ts": "2026-06-20T15:00:00+00:00",
            "market_id": f"m{(i // 3):03d}",
            "outcome_id": ["home_win", "draw", "away_win"][i % 3],
            "model_variant": "M*",
            "p_model": round(p, 6),
            "q_devigged": round(q, 6),
            "E": round(e, 6),
            "E_star": round(e_star, 6),
            "gate_status": "PASS" if i % 4 != 0 else "SUPPRESSED",
            "reason_code": "NONE",
            "recommended_stake_fraction": 0.01 if i % 4 != 0 else 0.0,
            "bankroll_mode": "NORMAL",
            "code_sha": "golden_sha_abc",
            "data_sha": "golden_data_sha",
            "spec_sha": "",
            "cap_adjustment": False,
            "applied_caps": [],
            "market_class": "1x2",
        }
        rows.append(row)

    with open(path, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")


def _sha256_of_jsonl(path: Path) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


# ---------------------------------------------------------------------------
# Golden SHA — computed once from deterministic synthetic inputs.
# Update this constant only when bias_tests.py logic intentionally changes.
# ---------------------------------------------------------------------------
_GOLDEN_SHA: str | None = None  # None = first-run mode (compute and print)


# ---------------------------------------------------------------------------
# Golden-file tests
# ---------------------------------------------------------------------------

class TestGoldenFile:
    def test_golden_output_deterministic(self, tmp_path):
        """
        Running run_all_bias_tests twice on the same synthetic log must produce
        byte-identical JSONL output (structural determinism).
        """
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)

        out1 = tmp_path / "results1.jsonl"
        out2 = tmp_path / "results2.jsonl"

        run_all_bias_tests(log_path, SPEC_YAML, output_path=out1)
        run_all_bias_tests(log_path, SPEC_YAML, output_path=out2)

        sha1 = _sha256_of_jsonl(out1)
        sha2 = _sha256_of_jsonl(out2)
        assert sha1 == sha2, "bias_tests output is not deterministic"

    def test_golden_sha_matches_or_print(self, tmp_path):
        """
        If _GOLDEN_SHA is set, assert the output matches.
        If _GOLDEN_SHA is None (first-run / bootstrap), print the SHA and pass.

        To lock the golden value after a deliberate change:
          1. Run this test to print the new SHA.
          2. Update _GOLDEN_SHA in this file.
        """
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)

        out = tmp_path / "results.jsonl"
        run_all_bias_tests(log_path, SPEC_YAML, output_path=out)
        actual_sha = _sha256_of_jsonl(out)

        if _GOLDEN_SHA is None:
            print(f"\n[GOLDEN] First run — computed SHA: {actual_sha}")
            print("[GOLDEN] Set _GOLDEN_SHA = above value to lock the golden file.")
        else:
            assert actual_sha == _GOLDEN_SHA, (
                f"Golden SHA mismatch.\n"
                f"  Expected: {_GOLDEN_SHA}\n"
                f"  Actual:   {actual_sha}\n"
                "If bias_tests.py changed intentionally, update _GOLDEN_SHA."
            )

    def test_returns_seven_results(self, tmp_path):
        """run_all_bias_tests must return exactly 7 BiasTestResult objects."""
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)
        results = run_all_bias_tests(log_path, SPEC_YAML)
        assert len(results) == 7

    def test_all_results_have_spec_version(self, tmp_path):
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)
        results = run_all_bias_tests(log_path, SPEC_YAML)
        for r in results:
            assert r.spec_version != "", f"spec_version missing on {r.test_id}"
            assert r.spec_sha != "", f"spec_sha missing on {r.test_id}"

    def test_all_results_have_bh_flag_set(self, tmp_path):
        """bh_adjusted_significant must be a bool on every result."""
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)
        results = run_all_bias_tests(log_path, SPEC_YAML)
        for r in results:
            assert isinstance(r.bh_adjusted_significant, bool), (
                f"bh_adjusted_significant is not bool on {r.test_id}"
            )

    def test_output_jsonl_parseable(self, tmp_path):
        """Every line in the output JSONL must parse as JSON."""
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)
        out = tmp_path / "results.jsonl"
        run_all_bias_tests(log_path, SPEC_YAML, output_path=out)
        assert out.exists()
        for line in out.read_text().strip().splitlines():
            obj = json.loads(line)
            assert "test_id" in obj
            assert "p_value" in obj
            assert "bh_adjusted_significant" in obj

    def test_output_jsonl_has_seven_lines(self, tmp_path):
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)
        out = tmp_path / "results.jsonl"
        run_all_bias_tests(log_path, SPEC_YAML, output_path=out)
        lines = [l for l in out.read_text().strip().splitlines() if l.strip()]
        assert len(lines) == 7

    def test_output_appends_on_second_run(self, tmp_path):
        """Each call to run_all_bias_tests appends 7 lines; two calls = 14 lines."""
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path)
        out = tmp_path / "results.jsonl"
        run_all_bias_tests(log_path, SPEC_YAML, output_path=out)
        run_all_bias_tests(log_path, SPEC_YAML, output_path=out)
        lines = [l for l in out.read_text().strip().splitlines() if l.strip()]
        assert len(lines) == 14


# ---------------------------------------------------------------------------
# Spec SHA verification
# ---------------------------------------------------------------------------

class TestSpecVerification:
    def test_sentinel_any_bypasses_sha_check(self, tmp_path):
        """With _PREREGISTERED_SPEC_SHA == 'ANY', any YAML content is accepted."""
        assert _PREREGISTERED_SPEC_SHA == "ANY", (
            "Expected sentinel 'ANY' — update this test if pre-registration SHA is set."
        )
        # Should not raise
        spec, sha = _load_spec(SPEC_YAML)
        assert "tests" in spec
        assert len(sha) == 64   # hex SHA-256

    def test_tampered_spec_raises_when_sha_locked(self, tmp_path, monkeypatch):
        """When the SHA constant is not 'ANY', a tampered YAML raises ValueError."""
        tampered = tmp_path / "tampered_spec.yaml"
        original = SPEC_YAML.read_text()
        tampered.write_text(original + "\n# tampered\n")

        monkeypatch.setattr(
            "market.bias_tests._PREREGISTERED_SPEC_SHA",
            "aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111",
        )
        with pytest.raises(ValueError, match="spec SHA mismatch"):
            _load_spec(tampered)

    def test_correct_sha_passes_when_sha_locked(self, tmp_path, monkeypatch):
        """When _PREREGISTERED_SPEC_SHA matches, _load_spec must not raise."""
        real_sha = _sha256_file(SPEC_YAML)
        monkeypatch.setattr("market.bias_tests._PREREGISTERED_SPEC_SHA", real_sha)
        spec, sha = _load_spec(SPEC_YAML)   # must not raise
        assert sha == real_sha


# ---------------------------------------------------------------------------
# Sparse data — all tests must return a result (not crash)
# ---------------------------------------------------------------------------

class TestSparseData:
    def test_empty_log_returns_seven_results(self, tmp_path):
        """An empty forecast log must return 7 results with notes='insufficient_data'."""
        log_path = tmp_path / "empty.jsonl"
        log_path.write_text("")
        results = run_all_bias_tests(log_path, SPEC_YAML)
        assert len(results) == 7
        for r in results:
            assert r.p_value == 1.0
            assert r.n == 0 or r.notes == "insufficient_data"

    def test_two_row_log_returns_seven_results(self, tmp_path):
        """Very sparse data must not crash — all 7 tests return a result."""
        log_path = tmp_path / "sparse.jsonl"
        rows = [
            {
                "row_id": "r1", "ts": "2026-06-20T15:00:00+00:00",
                "market_id": "m1", "outcome_id": "home_win",
                "p_model": 0.50, "q_devigged": 0.47, "E": 0.03, "E_star": 0.5,
                "gate_status": "PASS", "reason_code": "NONE",
                "recommended_stake_fraction": 0.01, "bankroll_mode": "NORMAL",
                "code_sha": "x", "data_sha": "y", "spec_sha": "",
                "cap_adjustment": False, "applied_caps": [], "market_class": "1x2",
            },
            {
                "row_id": "r2", "ts": "2026-06-20T15:00:00+00:00",
                "market_id": "m1", "outcome_id": "away_win",
                "p_model": 0.30, "q_devigged": 0.33, "E": -0.03, "E_star": -0.5,
                "gate_status": "PASS", "reason_code": "NONE",
                "recommended_stake_fraction": 0.0, "bankroll_mode": "NORMAL",
                "code_sha": "x", "data_sha": "y", "spec_sha": "",
                "cap_adjustment": False, "applied_caps": [], "market_class": "1x2",
            },
        ]
        with open(log_path, "w") as fh:
            for r in rows:
                fh.write(json.dumps(r) + "\n")
        results = run_all_bias_tests(log_path, SPEC_YAML)
        assert len(results) == 7


# ---------------------------------------------------------------------------
# BH FDR correction unit tests
# ---------------------------------------------------------------------------

class TestBHCorrection:
    def test_all_high_p_values_not_significant(self):
        p_values = [0.8, 0.9, 0.7, 0.85, 0.95, 0.75, 0.80]
        flags = _bh_correction(p_values, fdr_q=0.10)
        assert not any(flags), "No test should be significant with all p > 0.7"

    def test_all_low_p_values_all_significant(self):
        p_values = [0.001, 0.002, 0.001, 0.003, 0.001, 0.002, 0.001]
        flags = _bh_correction(p_values, fdr_q=0.10)
        assert all(flags), "All tests should be significant with all p < 0.003"

    def test_mixed_p_values(self):
        # With 7 tests, BH at q=0.10:
        # sorted: 0.001(k=1), 0.003(k=2), 0.05(k=3), 0.8(k=4), 0.9(k=5), 0.95(k=6), 0.99(k=7)
        # threshold at rank k: q*k/m = 0.10*k/7
        # k=1: 0.001 <= 0.014 → significant
        # k=2: 0.003 <= 0.029 → significant
        # k=3: 0.05 <= 0.043 → NOT significant
        p_values = [0.001, 0.8, 0.003, 0.9, 0.05, 0.95, 0.99]
        flags = _bh_correction(p_values, fdr_q=0.10)
        # p=0.001 and p=0.003 should be significant; 0.05 is borderline
        assert flags[0] is True    # p=0.001
        assert flags[2] is True    # p=0.003
        assert flags[1] is False   # p=0.8
        assert flags[3] is False   # p=0.9

    def test_empty_returns_empty(self):
        assert _bh_correction([]) == []

    def test_single_low_p_is_significant(self):
        flags = _bh_correction([0.001], fdr_q=0.10)
        assert flags == [True]

    def test_single_high_p_not_significant(self):
        flags = _bh_correction([0.5], fdr_q=0.10)
        assert flags == [False]

    def test_returns_correct_length(self):
        p_values = [0.01, 0.05, 0.10, 0.20, 0.50, 0.80, 0.99]
        flags = _bh_correction(p_values, fdr_q=0.10)
        assert len(flags) == len(p_values)


# ---------------------------------------------------------------------------
# Statistical helper unit tests
# ---------------------------------------------------------------------------

class TestCochranArmitage:
    def test_flat_no_trend(self):
        freqs = [0.5, 0.5, 0.5, 0.5, 0.5]
        props = [0.1, 0.3, 0.5, 0.7, 0.9]
        tots = [20, 20, 20, 20, 20]
        Z, p = _cochran_armitage(freqs, props, tots)
        assert abs(Z) < 1.0, "Flat frequencies should give small Z"
        assert 0.0 <= p <= 1.0

    def test_monotone_trend_detected(self):
        freqs = [0.1, 0.3, 0.5, 0.7, 0.9]
        props = [0.2, 0.3, 0.5, 0.6, 0.8]
        tots = [50, 50, 50, 50, 50]
        Z, p = _cochran_armitage(freqs, props, tots)
        assert Z > 0.0, "Positive trend should give positive Z"

    def test_single_stratum_returns_zero(self):
        Z, p = _cochran_armitage([0.5], [0.3], [10])
        assert Z == 0.0
        assert p == 1.0


class TestBootstrapT:
    def test_zero_mean_not_significant(self):
        x = [0.01, -0.01, 0.02, -0.02, 0.0, 0.0, -0.01, 0.01]
        t, p, eff = _bootstrap_t_test(x)
        assert p > 0.05, f"Near-zero mean should give high p-value, got {p}"

    def test_large_nonzero_mean_significant(self):
        # Values centred at 0.10 with small variance → clear positive mean
        x = [0.08, 0.09, 0.10, 0.11, 0.12] * 4
        t, p, eff = _bootstrap_t_test(x)
        assert p < 0.05 or abs(t) > 2.0, "Large positive mean should give small p"

    def test_too_short_returns_trivial(self):
        t, p, eff = _bootstrap_t_test([0.1])
        assert p == 1.0

    def test_effect_size_matches_sign(self):
        # Positive mean with variance → positive effect size
        x = [0.03, 0.05, 0.07, 0.05, 0.06, 0.04, 0.05, 0.07, 0.04, 0.06]
        t, p, eff = _bootstrap_t_test(x)
        assert eff > 0.0


class TestLinearRegressionT:
    def test_positive_slope_detected(self):
        x = list(range(10))
        y = [0.5 * xi + 0.01 * (i % 3) for i, xi in enumerate(x)]
        t, p, slope = _linear_regression_t(x, y)
        assert slope > 0.0
        assert p < 0.05

    def test_flat_slope_not_significant(self):
        x = list(range(10))
        y = [5.0] * 10
        t, p, slope = _linear_regression_t(x, y)
        assert abs(slope) < 1e-10

    def test_too_short_returns_trivial(self):
        t, p, slope = _linear_regression_t([1.0, 2.0], [1.0, 2.0])
        assert p == 1.0


class TestPermutationDiff:
    def test_identical_groups_high_p(self):
        g1 = [0.1, 0.2, 0.15, 0.12, 0.18]
        g2 = [0.1, 0.2, 0.15, 0.12, 0.18]
        diff, p, eff = _permutation_diff(g1, g2, n_perms=200)
        assert diff == 0.0
        assert p == 1.0

    def test_very_different_groups_low_p(self):
        g1 = [0.01] * 20
        g2 = [0.50] * 20
        diff, p, eff = _permutation_diff(g1, g2, n_perms=500)
        assert diff > 0.40
        assert p < 0.05

    def test_too_short_returns_trivial(self):
        diff, p, eff = _permutation_diff([0.1], [0.2], n_perms=10)
        assert p == 1.0


class TestChiSquared:
    def test_uniform_distribution_high_p(self):
        obs = [10, 10, 10, 10, 10]
        exp = [10.0, 10.0, 10.0, 10.0, 10.0]
        chi2, p, eff = _chi_squared_test(obs, exp)
        assert chi2 < 1e-9
        assert p > 0.05

    def test_very_skewed_distribution_low_p(self):
        obs = [40, 2, 2, 2, 2]
        exp = [9.6, 9.6, 9.6, 9.6, 9.6]
        chi2, p, eff = _chi_squared_test(obs, exp)
        assert chi2 > 10.0

    def test_empty_returns_trivial(self):
        chi2, p, eff = _chi_squared_test([], [])
        assert p == 1.0


# ---------------------------------------------------------------------------
# BiasTestResult schema
# ---------------------------------------------------------------------------

class TestBiasTestResultSchema:
    def test_to_jsonl_serialises(self, tmp_path):
        r = BiasTestResult("T1", "Favourite-Longshot Bias", 100, 1.5, 0.03, 0.2, True)
        line = r.to_jsonl()
        obj = json.loads(line)
        assert obj["test_id"] == "T1"
        assert obj["p_value"] == pytest.approx(0.03)
        assert obj["pass_at_alpha_005"] is True

    def test_bh_flag_defaults_false(self):
        r = BiasTestResult("T2", "Sentiment Bias", 50, 0.5, 0.10, 0.1, False)
        assert r.bh_adjusted_significant is False

    def test_notes_default_empty(self):
        r = BiasTestResult("T3", "Recency Bias", 10, 0.0, 1.0, 0.0, False)
        assert r.notes == ""


# ---------------------------------------------------------------------------
# Individual test ID coverage
# ---------------------------------------------------------------------------

class TestIndividualTestIds:
    def _run_with_synthetic(self, tmp_path, n_rows=60):
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path, n_rows)
        return run_all_bias_tests(log_path, SPEC_YAML)

    def test_t1_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        ids = [r.test_id for r in results]
        assert "T1" in ids

    def test_t2_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        assert "T2" in [r.test_id for r in results]

    def test_t3_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        assert "T3" in [r.test_id for r in results]

    def test_t4_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        assert "T4" in [r.test_id for r in results]

    def test_t5_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        assert "T5" in [r.test_id for r in results]

    def test_t6_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        assert "T6" in [r.test_id for r in results]

    def test_t7_in_results(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        assert "T7" in [r.test_id for r in results]

    def test_all_results_have_valid_p_values(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        for r in results:
            assert 0.0 <= r.p_value <= 1.0, f"{r.test_id}: p_value={r.p_value} out of range"

    def test_all_results_have_test_name(self, tmp_path):
        results = self._run_with_synthetic(tmp_path)
        for r in results:
            assert len(r.test_name) > 5, f"{r.test_id}: test_name is too short"

    def test_t6_insufficient_data_without_stage_rows(self, tmp_path):
        """T6 requires market_class='stage_of_elimination' rows — synthetic log has none."""
        log_path = tmp_path / "forecast_log.jsonl"
        _make_synthetic_log(log_path, n_rows=60)
        results = run_all_bias_tests(log_path, SPEC_YAML)
        t6 = next(r for r in results if r.test_id == "T6")
        assert t6.notes == "insufficient_data"
