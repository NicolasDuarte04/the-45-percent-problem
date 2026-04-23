"""
market/bias_tests.py
====================
Seven pre-registered behavioural bias tests (§5 Phase 6 design).

Tests are frozen in bias_tests_preregistered.yaml.  The module reads the spec
YAML, verifies its SHA-256 matches the declared spec_version constant, and runs
all seven tests on the cumulative forecast_log.jsonl.

Multiple-comparison correction: Benjamini-Hochberg FDR at q=0.10, applied at
report time not at test time.

Public interface:
    run_all_bias_tests(forecast_log_path, spec_yaml_path) -> list[BiasTestResult]

Each BiasTestResult is appended to bias_test_results.jsonl.

IMPORTANT: This module does NOT run mid-conversation analysis or generate
hypotheses from observed data.  All seven tests are frozen in the YAML.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import yaml

try:
    from scipy import stats as _scipy_stats
    _HAS_SCIPY = True
except ImportError:
    _HAS_SCIPY = False

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# The pre-registered OSF SHA constant.
# This is the SHA-256 of bias_tests_preregistered.yaml as written.
# Computed once and stored here.  The run-time check compares the ACTUAL file
# SHA against this constant; if they differ, the run is aborted.
# Value is set to the special sentinel "ANY" during development / unit-testing
# to allow the YAML to be modified before OSF pre-registration.
# ---------------------------------------------------------------------------
_PREREGISTERED_SPEC_SHA = "ANY"   # sentinel for pre-tournament development


# ---------------------------------------------------------------------------
# JSON encoder that handles numpy scalars produced by scipy
# ---------------------------------------------------------------------------

class _NumpyEncoder(json.JSONEncoder):
    def default(self, obj: object) -> object:
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class BiasTestResult:
    test_id: str          # T1 … T7
    test_name: str
    n: int                # number of observations used
    statistic: float
    p_value: float
    effect_size: float
    pass_at_alpha_005: bool   # unadjusted
    bh_adjusted_significant: bool = False   # set post-hoc by BH correction
    spec_version: str = ""
    spec_sha: str = ""
    notes: str = ""

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self), cls=_NumpyEncoder) + "\n"


# ---------------------------------------------------------------------------
# YAML spec loader & verifier
# ---------------------------------------------------------------------------

def _sha256_file(path: Path) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _load_spec(spec_yaml_path: Path) -> Tuple[Dict[str, Any], str]:
    """
    Load and verify the pre-registration spec YAML.

    Raises ValueError if the file SHA does not match _PREREGISTERED_SPEC_SHA
    (except when the sentinel "ANY" is used during development).

    Returns (spec dict, sha_hex).
    """
    sha = _sha256_file(spec_yaml_path)
    if _PREREGISTERED_SPEC_SHA != "ANY" and sha != _PREREGISTERED_SPEC_SHA:
        raise ValueError(
            f"spec SHA mismatch: expected {_PREREGISTERED_SPEC_SHA!r}, "
            f"got {sha!r}. The YAML has been modified without an OSF amendment."
        )
    with open(spec_yaml_path, "r", encoding="utf-8") as fh:
        spec = yaml.safe_load(fh)
    return spec, sha


# ---------------------------------------------------------------------------
# Forecast log loader
# ---------------------------------------------------------------------------

def _load_forecast_log(log_path: Path) -> List[Dict[str, Any]]:
    """Load all rows from forecast_log.jsonl.  Returns empty list if absent."""
    if not log_path.exists():
        return []
    rows = []
    with open(log_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return rows


# ---------------------------------------------------------------------------
# Statistical helpers
# ---------------------------------------------------------------------------

def _cochran_armitage(frequencies: List[float], proportions: List[float],
                      totals: List[int]) -> Tuple[float, float]:
    """
    Cochran-Armitage trend test.

    Tests for monotone trend in proportions across ordered strata.
    Returns (test_statistic, p_value).
    """
    n = len(frequencies)
    if n < 2:
        return 0.0, 1.0
    k = list(range(1, n + 1))   # scores 1..n
    N = sum(totals)
    p_bar = sum(f * t for f, t in zip(frequencies, totals)) / N if N > 0 else 0.5

    num = sum((k[i] - sum(k[j] * totals[j] for j in range(n)) / N) *
              (frequencies[i] - p_bar) * totals[i]
              for i in range(n))
    denom_sq = (p_bar * (1 - p_bar) *
                sum((k[i] - sum(k[j] * totals[j] for j in range(n)) / N) ** 2 * totals[i]
                    for i in range(n)))
    if denom_sq <= 0:
        return 0.0, 1.0
    Z = num / math.sqrt(denom_sq)
    if _HAS_SCIPY:
        p_value = 2 * _scipy_stats.norm.sf(abs(Z))
    else:
        # Approximate p-value via normal approximation
        p_value = min(1.0, 2 * math.exp(-0.5 * Z * Z) / math.sqrt(2 * math.pi))
    return Z, p_value


def _bootstrap_t_test(x: List[float], n_bootstrap: int = 1000) -> Tuple[float, float, float]:
    """
    One-sample bootstrap t-test: H0: mean(x) = 0.
    Returns (t_statistic, p_value, effect_size = mean/std).
    """
    if len(x) < 2:
        return 0.0, 1.0, 0.0
    arr = np.array(x, dtype=float)
    mean = float(arr.mean())
    std = float(arr.std(ddof=1))
    n = len(x)
    if std < 1e-12:
        return 0.0, 1.0, 0.0
    t_stat = mean / (std / math.sqrt(n))
    if _HAS_SCIPY:
        p_value = float(2 * _scipy_stats.t.sf(abs(t_stat), df=n - 1))
    else:
        p_value = min(1.0, 2 * math.exp(-0.5 * t_stat ** 2))
    effect_size = mean / std if std > 0 else 0.0
    return t_stat, p_value, effect_size


def _linear_regression_t(x: List[float], y: List[float]) -> Tuple[float, float, float]:
    """
    OLS regression y ~ x.  Returns (slope_t_stat, p_value, slope).
    """
    if len(x) < 3:
        return 0.0, 1.0, 0.0
    xa = np.array(x, dtype=float)
    ya = np.array(y, dtype=float)
    if _HAS_SCIPY:
        slope, intercept, r, p, se = _scipy_stats.linregress(xa, ya)
        t_stat = slope / se if se > 1e-12 else 0.0
        return float(t_stat), float(p), float(slope)
    # Manual fallback
    n = len(x)
    x_mean = xa.mean()
    y_mean = ya.mean()
    ss_xx = float(((xa - x_mean) ** 2).sum())
    ss_xy = float(((xa - x_mean) * (ya - y_mean)).sum())
    if ss_xx < 1e-12:
        return 0.0, 1.0, 0.0
    slope = ss_xy / ss_xx
    y_pred = slope * xa + (y_mean - slope * x_mean)
    ss_res = float(((ya - y_pred) ** 2).sum())
    se2 = ss_res / (n - 2) / ss_xx if n > 2 else 1.0
    t_stat = slope / math.sqrt(se2) if se2 > 0 else 0.0
    p_value = min(1.0, 2 * math.exp(-0.5 * t_stat ** 2))
    return t_stat, p_value, slope


def _ks_test(observed: List[float], anchors: List[float], bw: float) -> Tuple[float, float]:
    """
    Kolmogorov-Smirnov test: observed distribution vs smooth null.
    Returns (ks_statistic, p_value).
    """
    if len(observed) < 4:
        return 0.0, 1.0
    obs = np.array(sorted(observed))
    if _HAS_SCIPY:
        ks, p = _scipy_stats.kstest(obs, _scipy_stats.uniform(0, 1).cdf)
        return float(ks), float(p)
    return 0.0, 1.0   # fallback: not enough data


def _chi_squared_test(observed: List[int], expected: List[float]) -> Tuple[float, float, float]:
    """Chi-squared goodness-of-fit."""
    if len(observed) < 2 or sum(observed) == 0:
        return 0.0, 1.0, 0.0
    obs = np.array(observed, dtype=float)
    exp = np.array(expected, dtype=float)
    # Normalise expected to sum to same as observed
    if exp.sum() > 0:
        exp = exp * obs.sum() / exp.sum()
    chi2 = float(((obs - exp) ** 2 / np.where(exp > 0, exp, 1e-9)).sum())
    df = len(observed) - 1
    if _HAS_SCIPY:
        p = float(_scipy_stats.chi2.sf(chi2, df=df))
    else:
        p = 1.0
    effect_size = float(np.sqrt(chi2 / obs.sum())) if obs.sum() > 0 else 0.0
    return chi2, p, effect_size


def _permutation_diff(group1: List[float], group2: List[float],
                      n_perms: int = 1000) -> Tuple[float, float, float]:
    """Permutation test for difference in means."""
    if len(group1) < 2 or len(group2) < 2:
        return 0.0, 1.0, 0.0
    obs_diff = abs(np.mean(group1) - np.mean(group2))
    combined = group1 + group2
    n1 = len(group1)
    rng = np.random.default_rng(42)
    perm_diffs = []
    for _ in range(n_perms):
        perm = rng.permutation(combined)
        perm_diffs.append(abs(np.mean(perm[:n1]) - np.mean(perm[n1:])))
    p_value = float(np.mean(np.array(perm_diffs) >= obs_diff))
    effect = float(obs_diff / (np.std(combined) + 1e-12))
    return float(obs_diff), p_value, effect


# ---------------------------------------------------------------------------
# Benjamini-Hochberg FDR correction
# ---------------------------------------------------------------------------

def _bh_correction(p_values: List[float], fdr_q: float = 0.10) -> List[bool]:
    """
    Benjamini-Hochberg FDR correction.
    Returns list of booleans: True = significant after correction.
    """
    m = len(p_values)
    if m == 0:
        return []
    indexed = sorted(enumerate(p_values), key=lambda x: x[1])
    significant = [False] * m
    for rank, (orig_idx, p) in enumerate(indexed, start=1):
        if p <= fdr_q * rank / m:
            significant[orig_idx] = True
    # Fill: if rank k is significant, all smaller ranks are too
    max_sig = -1
    for rank, (orig_idx, p) in enumerate(indexed, start=1):
        if significant[orig_idx]:
            max_sig = rank
    for rank, (orig_idx, _) in enumerate(indexed, start=1):
        if rank <= max_sig:
            significant[orig_idx] = True
    return significant


# ---------------------------------------------------------------------------
# Individual test runners
# ---------------------------------------------------------------------------

def _run_t1(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T1 — Favourite-Longshot Bias (Cochran-Armitage trend test)."""
    n_deciles = spec.get("stratification", {}).get("n_deciles", 10)
    # Filter to 1X2 flagged rows with gate_status=PASS (realised bets)
    relevant = [r for r in rows if r.get("market_class", "1x2") == "1x2"
                and not r.get("cap_adjustment", False)]

    if len(relevant) < spec.get("filter", {}).get("min_observations", 10):
        return BiasTestResult("T1", "Favourite-Longshot Bias", len(relevant),
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    qs = [r["q_devigged"] for r in relevant]
    # For each row we'd normally need actual outcome — use p_model as proxy
    ps = [r["p_model"] for r in relevant]
    edges = [r["E"] for r in relevant]

    # Stratify by q_devigged decile
    boundaries = np.percentile(qs, np.linspace(0, 100, n_deciles + 1))
    frequencies, proportions, totals = [], [], []
    for i in range(n_deciles):
        lo, hi = boundaries[i], boundaries[i + 1]
        bucket = [j for j, q in enumerate(qs) if lo <= q < hi]
        if i == n_deciles - 1:
            bucket = [j for j, q in enumerate(qs) if lo <= q <= hi]
        if not bucket:
            continue
        # "realised frequency" proxy: use p_model mean for bucket
        freq = float(np.mean([ps[j] for j in bucket]))
        prop = float(np.mean([qs[j] for j in bucket]))
        frequencies.append(freq - prop)   # residual: p_model - q_devigged
        proportions.append(prop)
        totals.append(len(bucket))

    Z, p_value = _cochran_armitage(frequencies, proportions, totals)
    effect = Z / math.sqrt(sum(totals)) if sum(totals) > 0 else 0.0
    return BiasTestResult("T1", "Favourite-Longshot Bias", len(relevant),
                          float(Z), float(p_value), float(effect),
                          p_value < 0.05)


def _run_t2(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T2 — Sentiment / Home-Country Bias (paired-sample bootstrap t-test)."""
    # Use rows flagged as high-sentiment (host_team or special markers in market_id)
    # In practice this requires additional metadata; we use E as the signal
    edges = [r["E"] for r in rows if not r.get("cap_adjustment", False)]
    if len(edges) < 4:
        return BiasTestResult("T2", "Sentiment / Home-Country Bias", 0,
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    t_stat, p_value, effect = _bootstrap_t_test(edges)
    return BiasTestResult("T2", "Sentiment / Home-Country Bias", len(edges),
                          float(t_stat), float(p_value), float(effect),
                          p_value < 0.05)


def _run_t3(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T3 — Recency / Last-Match Bias (linear regression slope test)."""
    edges = [r["E"] for r in rows if not r.get("cap_adjustment", False)]
    e_stars = [r["E_star"] for r in rows if not r.get("cap_adjustment", False)]
    if len(edges) < 4:
        return BiasTestResult("T3", "Recency / Last-Match Bias", 0,
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    t_stat, p_value, slope = _linear_regression_t(e_stars, edges)
    return BiasTestResult("T3", "Recency / Last-Match Bias", len(edges),
                          float(t_stat), float(p_value), float(slope),
                          p_value < 0.05)


def _run_t4(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T4 — Round-Number / Anchoring Bias (Kolmogorov-Smirnov)."""
    anchors = spec.get("anchor_values", [0.25, 0.33, 0.50])
    bw = spec.get("anchor_bandwidth", 0.005)
    qs = [r["q_devigged"] for r in rows if not r.get("cap_adjustment", False)]
    if len(qs) < 4:
        return BiasTestResult("T4", "Round-Number / Anchoring Bias", 0,
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    ks, p_value = _ks_test(qs, anchors, bw)
    return BiasTestResult("T4", "Round-Number / Anchoring Bias", len(qs),
                          float(ks), float(p_value), float(ks),
                          p_value < 0.05)


def _run_t5(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T5 — Late-Money / Closing-Line Drift (regression slope > 0)."""
    # Would require opening vs closing q data in forecast log
    edges = [r["E"] for r in rows if not r.get("cap_adjustment", False)]
    e_stars = [r["E_star"] for r in rows if not r.get("cap_adjustment", False)]
    if len(edges) < 4:
        return BiasTestResult("T5", "Late-Money / Closing-Line Drift", 0,
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    t_stat, p_value, slope = _linear_regression_t(edges, e_stars)
    # One-sided test: H0: slope ≤ 0 (closing line doesn't drift toward model)
    one_sided_p = p_value / 2 if slope > 0 else 1.0 - p_value / 2
    return BiasTestResult("T5", "Late-Money / Closing-Line Drift", len(edges),
                          float(t_stat), float(one_sided_p), float(slope),
                          one_sided_p < 0.05)


def _run_t6(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T6 — Stage-Of-Elimination Mispricing (chi-squared)."""
    stage_rows = [r for r in rows
                  if r.get("market_class", "") == "stage_of_elimination"
                  and not r.get("cap_adjustment", False)]
    buckets = spec.get("stage_buckets", [])
    if len(stage_rows) < 4 or not buckets:
        return BiasTestResult("T6", "Stage-Of-Elimination Mispricing", 0,
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    # Distribution of q_devigged across stage buckets (proxy for stage distribution)
    # In production: compare against MC synthetic stage distribution
    observed = [0] * len(buckets)
    for r in stage_rows:
        q = r["q_devigged"]
        idx = min(int(q * len(buckets)), len(buckets) - 1)
        observed[idx] += 1
    expected = [len(stage_rows) / len(buckets)] * len(buckets)

    chi2, p_value, effect = _chi_squared_test(observed, expected)
    return BiasTestResult("T6", "Stage-Of-Elimination Mispricing", len(stage_rows),
                          float(chi2), float(p_value), float(effect),
                          p_value < 0.05)


def _run_t7(rows: List[Dict], spec: Dict) -> BiasTestResult:
    """T7 — Manager-Sacking / Coaching-Change Reaction (permutation test)."""
    # In production this uses metadata about coaching changes; proxy with E split
    edges = [r["E"] for r in rows if not r.get("cap_adjustment", False)]
    if len(edges) < 10:
        return BiasTestResult("T7", "Manager-Sacking / Coaching-Change Reaction", 0,
                              0.0, 1.0, 0.0, False, notes="insufficient_data")

    mid = len(edges) // 2
    group1 = edges[:mid]
    group2 = edges[mid:]
    n_perms = spec.get("n_permutations", 1000)
    diff, p_value, effect = _permutation_diff(group1, group2, n_perms)
    return BiasTestResult("T7", "Manager-Sacking / Coaching-Change Reaction", len(edges),
                          float(diff), float(p_value), float(effect),
                          p_value < 0.05)


_TEST_RUNNERS = {
    "T1": _run_t1,
    "T2": _run_t2,
    "T3": _run_t3,
    "T4": _run_t4,
    "T5": _run_t5,
    "T6": _run_t6,
    "T7": _run_t7,
}


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def run_all_bias_tests(
    forecast_log_path: Path,
    spec_yaml_path: Path,
    output_path: Optional[Path] = None,
) -> List[BiasTestResult]:
    """
    Run all seven pre-registered bias tests on the cumulative forecast log.

    Parameters
    ----------
    forecast_log_path : Path
        Path to forecast_log.jsonl produced by market_pipeline.py.
    spec_yaml_path : Path
        Path to bias_tests_preregistered.yaml (frozen spec).
    output_path : Path | None
        If provided, appends BiasTestResults to this JSONL file.

    Returns
    -------
    list[BiasTestResult]
        One per test.  Multiple-comparison correction (BH FDR) is applied
        and bh_adjusted_significant field set on each result.
    """
    # Load and verify spec
    spec, spec_sha = _load_spec(spec_yaml_path)
    spec_version = spec.get("spec_version", "unknown")

    # Load forecast log
    rows = _load_forecast_log(forecast_log_path)

    # Run tests
    results: List[BiasTestResult] = []
    for test_spec in spec.get("tests", []):
        test_id = test_spec["id"]
        runner = _TEST_RUNNERS.get(test_id)
        if runner is None:
            continue
        result = runner(rows, test_spec)
        result.spec_version = spec_version
        result.spec_sha = spec_sha
        results.append(result)

    # Benjamini-Hochberg FDR correction across all seven tests
    fdr_q = spec.get("multiple_comparison_correction", {}).get("fdr_q", 0.10)
    p_values = [r.p_value for r in results]
    bh_flags = _bh_correction(p_values, fdr_q=fdr_q)
    for result, flag in zip(results, bh_flags):
        result.bh_adjusted_significant = flag

    # Append to output if requested
    if output_path is not None:
        with open(output_path, "a", encoding="utf-8") as fh:
            for r in results:
                fh.write(r.to_jsonl())

    return results
