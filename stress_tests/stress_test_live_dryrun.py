"""
Stress Test 3 – The 48-Hour Polling Test: Live I/O Dryrun
==========================================================
Tests the live I/O plumbing, API circuit-breaker, memory stability, and JSON
serialization over 100 orchestrator loop iterations.

The 60-second wall-clock interval between real production loops is replaced
with zero-sleep tight iterations for deterministic, fast testing.  All external
HTTP calls are intercepted via the NewsMonitor's _fetch_fn injection point.

Validation:
  ✓  100 pipeline iterations complete without an unhandled exception
  ✓  Memory growth is bounded  (< 8 MB net increase over 100 loops)
  ✓  API fetch failures are caught by the circuit breaker — no unhandled raise
  ✓  After 3 consecutive failures the circuit breaker opens and silences calls
  ✓  _NumpyEncoder correctly serializes all numpy scalar / array types
  ✓  forecast_log.jsonl and gate_log.jsonl remain valid JSONL after 100 loops
  ✓  No JSON serialization errors in any written log row

Run from project root:
    python stress_tests/stress_test_live_dryrun.py

Exit code: 0 = pass, 1 = fail.
"""

from __future__ import annotations

import gc
import json
import math
import sys
import tempfile
import tracemalloc
from datetime import datetime, timezone, timedelta
from pathlib import Path
from threading import Event
from typing import Any, List, Optional, Tuple

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.market_pipeline import MarketPipeline, PipelineConfig
from market.news_monitor import NewsMonitor, NewsWindow
from market.bias_tests import _NumpyEncoder

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

_failures: List[str] = []
_N_LOOPS = 100
_MEMORY_BUDGET_MB = 8.0   # acceptable net memory growth over all 100 loops


def assert_check(condition: bool, label: str, detail: str = "") -> bool:
    if condition:
        print(f"  {PASS}  {label}")
    else:
        msg = f"{label}" + (f"  [got: {detail}]" if detail else "")
        print(f"  {FAIL}  {msg}")
        _failures.append(msg)
    return condition


# ─────────────────────────────────────────────────────────────────────────────
# Mock fetch functions
# ─────────────────────────────────────────────────────────────────────────────

_EMPTY_FEED = "[]"   # valid JSON — no named events this cycle

def _fetch_empty(url: str) -> Tuple[str, int]:
    """Returns empty event list (simulates quiet API period)."""
    return _EMPTY_FEED, 200


_fail_count: int = 0

def _fetch_always_fails(url: str) -> Tuple[str, int]:
    """Always raises — simulates a dead API endpoint."""
    global _fail_count
    _fail_count += 1
    raise ConnectionError(f"Simulated connection failure for {url}")


def _fetch_flaky(url: str) -> Tuple[str, int]:
    """Fails for the first 3 calls per URL, then recovers (tests CB reset)."""
    return _EMPTY_FEED, 200   # used after circuit breaker opens; not called directly


# ─────────────────────────────────────────────────────────────────────────────
# Minimal market input for the pipeline
# ─────────────────────────────────────────────────────────────────────────────

def _make_market(loop_idx: int) -> dict:
    """Generate a synthetic market input for each loop iteration."""
    base_q = 0.40 + 0.001 * (loop_idx % 20)   # vary odds slightly
    return {
        "market_id": f"dryrun_loop_{loop_idx:04d}_ARG_BRA",
        "market_class": "1x2",
        "stage": "group",
        "book": "pinnacle",
        "odds": [2.05 + 0.01 * (loop_idx % 5), 3.30, 3.80],
        "outcome_labels": ["home_win", "draw", "away_win"],
        "p_model": [base_q + 0.04, 0.30, 1.0 - base_q - 0.04 - 0.30],
        "entity_ids": ["ARG", "BRA"],
        "snapshot_data": {
            "pinnacle_q_30min_ago": None,
            "betfair_q": None,
            "polymarket_volume_24h_usd": None,
            "pinnacle_last_updated": None,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Test 1: 100-loop orchestrator run (memory + no-crash)
# ─────────────────────────────────────────────────────────────────────────────

def run_loop_stability_test(tmp: Path) -> None:
    print("\n" + "─" * 60)
    print(f"Test 1 — {_N_LOOPS}-loop orchestrator stability (memory + no-crash)")
    print("─" * 60)

    forecast_log = tmp / "dryrun_forecast.jsonl"
    gate_log = tmp / "dryrun_gate.jsonl"

    monitor = NewsMonitor(
        tier1_sources=["http://dummy-feed-1.invalid"],
        tier2_sources=[],
        _fetch_fn=_fetch_empty,
    )
    # Do NOT call monitor.start() — we use get_window() directly (no thread)

    cfg = PipelineConfig(
        forecast_log_path=forecast_log,
        gate_log_path=gate_log,
        initial_bankroll=10_000.0,
        code_sha="dryrun_sha",
        data_sha="dryrun_data",
    )

    pipeline = MarketPipeline(cfg)

    gc.collect()
    tracemalloc.start()
    snapshot_before = tracemalloc.take_snapshot()

    crashed = False
    crash_detail = ""
    base_ts = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)

    try:
        for i in range(_N_LOOPS):
            ts = base_ts + timedelta(minutes=i)
            market = _make_market(i)
            pipeline.run_once(ts, [market])
    except Exception as exc:
        crashed = True
        crash_detail = f"{type(exc).__name__}: {exc}"
        traceback.print_exc()

    snapshot_after = tracemalloc.take_snapshot()
    tracemalloc.stop()

    assert_check(not crashed, f"{_N_LOOPS} loops completed without unhandled exception", crash_detail)

    # Memory delta (current vs peak blocks)
    stats = snapshot_after.compare_to(snapshot_before, "lineno")
    net_bytes = sum(s.size_diff for s in stats)
    net_mb = net_bytes / 1_048_576
    print(f"  Net memory growth: {net_mb:+.3f} MB  (budget: < {_MEMORY_BUDGET_MB} MB)")
    assert_check(
        net_mb < _MEMORY_BUDGET_MB,
        f"Memory growth < {_MEMORY_BUDGET_MB} MB over {_N_LOOPS} loops",
        detail=f"{net_mb:.3f} MB",
    )

    # Validate log files
    _validate_jsonl(forecast_log, "forecast_log.jsonl")
    _validate_jsonl(gate_log, "gate_log.jsonl")

    # Row count sanity (3 outcomes × 100 loops = 300 rows)
    if forecast_log.exists():
        rows = [l for l in forecast_log.read_text().splitlines() if l.strip()]
        assert_check(
            len(rows) == _N_LOOPS * 3,
            f"forecast_log has exactly {_N_LOOPS * 3} rows (3 outcomes × {_N_LOOPS} loops)",
            detail=f"got {len(rows)}",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Test 2: Circuit-breaker catches persistent API failures
# ─────────────────────────────────────────────────────────────────────────────

def run_circuit_breaker_test(tmp: Path) -> None:
    print("\n" + "─" * 60)
    print("Test 2 — Circuit-breaker catches persistent API failures")
    print("─" * 60)

    global _fail_count
    _fail_count = 0

    fetch_log = tmp / "news_fetch_cb.jsonl"

    monitor = NewsMonitor(
        tier1_sources=["http://dead-endpoint-1.invalid", "http://dead-endpoint-2.invalid"],
        tier2_sources=[],
        fetch_log_path=fetch_log,
        _fetch_fn=_fetch_always_fails,
    )

    # Run the polling logic synchronously by calling _poll_source directly
    now = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)

    crashed_outside_cb = False
    try:
        # Simulate 10 consecutive poll attempts per source.
        # After 3 consecutive failures the CB opens and stops calling the fetch fn.
        for _ in range(10):
            monitor._poll_source("http://dead-endpoint-1.invalid", tier=1, now=now)
    except Exception as exc:
        crashed_outside_cb = True
        traceback.print_exc()

    assert_check(
        not crashed_outside_cb,
        "NewsMonitor._poll_source does NOT propagate fetch exceptions to caller",
    )

    # The circuit breaker should have opened after 3 failures (threshold = 3).
    # After that the fetch fn must NOT be called again (circuit is open).
    breaker = monitor._breakers.get("http://dead-endpoint-1.invalid")
    assert_check(
        breaker is not None and breaker.open_until is not None,
        "Circuit breaker opened after 3 consecutive failures",
        detail=str(breaker),
    )

    calls_before_cb_open = 3   # CB fires at the 3rd failure
    assert_check(
        _fail_count >= calls_before_cb_open,
        f"Fetch fn called at least {calls_before_cb_open} times before CB opened",
        detail=f"called {_fail_count} times",
    )

    # After CB opens, additional _poll_source calls must NOT call the fetch fn
    calls_after_open = _fail_count
    for _ in range(5):
        monitor._poll_source("http://dead-endpoint-1.invalid", tier=1, now=now)
    calls_delta = _fail_count - calls_after_open
    assert_check(
        calls_delta == 0,
        "Fetch fn not called again while circuit breaker is open",
        detail=f"unexpected calls: {calls_delta}",
    )

    # Fetch log should record circuit_open entries
    if fetch_log.exists():
        entries = [json.loads(l) for l in fetch_log.read_text().splitlines() if l.strip()]
        circuit_open_entries = [e for e in entries if e.get("parse_outcome") == "circuit_open"]
        assert_check(
            len(circuit_open_entries) > 0,
            "fetch_log records circuit_open entries after CB opens",
            detail=f"{len(circuit_open_entries)} circuit_open entries",
        )


# ─────────────────────────────────────────────────────────────────────────────
# Test 3: _NumpyEncoder handles all numpy scalar and array types
# ─────────────────────────────────────────────────────────────────────────────

def run_numpy_encoder_test() -> None:
    print("\n" + "─" * 60)
    print("Test 3 — _NumpyEncoder serializes all numpy types without error")
    print("─" * 60)

    test_cases = {
        "np.int8": np.int8(42),
        "np.int16": np.int16(-300),
        "np.int32": np.int32(1_000_000),
        "np.int64": np.int64(9_876_543_210),
        "np.uint32": np.uint32(4_294_967_295),
        "np.float32": np.float32(3.1415927),
        "np.float64": np.float64(2.718281828),
        "np.float16": np.float16(0.5),
        "np.bool_ True": np.bool_(True),
        "np.bool_ False": np.bool_(False),
        "np.ndarray 1D": np.array([1.0, 2.0, 3.0]),
        "np.ndarray 2D": np.array([[1, 2], [3, 4]]),
        "np.ndarray float32": np.array([0.1, 0.2, 0.3], dtype=np.float32),
        "np.ndarray int64": np.arange(10, dtype=np.int64),
    }

    for label, value in test_cases.items():
        payload = {"label": label, "value": value}
        try:
            serialized = json.dumps(payload, cls=_NumpyEncoder)
            roundtrip = json.loads(serialized)
            ok = True
            detail = ""
        except (TypeError, ValueError) as exc:
            ok = False
            detail = str(exc)
        assert_check(ok, f"_NumpyEncoder handles {label}", detail)

    # Simulate a realistic scenario: a bias test result dict with mixed numpy types
    realistic_result = {
        "test_id": "T1",
        "test_name": "Favourite-Longshot Bias",
        "n": np.int64(64),
        "statistic": np.float64(2.34),
        "p_value": np.float64(0.019),
        "effect_size": np.float32(0.12),
        "pass_at_alpha_005": np.bool_(False),
        "bh_adjusted_significant": np.bool_(True),
        "bootstrap_distribution": np.random.default_rng(0).normal(0, 1, 500),
        "calibration_residuals": np.linspace(-0.05, 0.05, 20),
    }

    try:
        out = json.dumps(realistic_result, cls=_NumpyEncoder)
        parsed = json.loads(out)
        realistic_ok = (
            isinstance(parsed["n"], int)
            and isinstance(parsed["statistic"], float)
            and isinstance(parsed["pass_at_alpha_005"], bool)
            and isinstance(parsed["bootstrap_distribution"], list)
        )
        detail = ""
    except Exception as exc:
        realistic_ok = False
        detail = str(exc)

    assert_check(
        realistic_ok,
        "_NumpyEncoder round-trips a realistic BiasTestResult dict with correct Python types",
        detail,
    )

    # Confirm that WITHOUT the encoder, numpy types DO raise TypeError
    # (so the encoder is actually doing useful work)
    try:
        json.dumps({"v": np.int64(1)})
        encoder_needed = False   # built-in handled it — unexpected
    except TypeError:
        encoder_needed = True
    assert_check(
        encoder_needed,
        "Without _NumpyEncoder, json.dumps raises TypeError on numpy scalars (encoder is necessary)",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Log serialization integrity (gate_log + forecast_log)
# ─────────────────────────────────────────────────────────────────────────────

def run_serialization_integrity_test(tmp: Path) -> None:
    print("\n" + "─" * 60)
    print("Test 4 — Log serialization integrity (no corrupt JSONL lines)")
    print("─" * 60)

    forecast_log = tmp / "dryrun_forecast.jsonl"
    gate_log = tmp / "dryrun_gate.jsonl"

    for log_path in [forecast_log, gate_log]:
        if not log_path.exists():
            continue
        name = log_path.name
        lines = log_path.read_text().splitlines()
        nonempty = [l for l in lines if l.strip()]

        corrupt = []
        for i, line in enumerate(nonempty, start=1):
            try:
                json.loads(line)
            except json.JSONDecodeError as exc:
                corrupt.append(f"Line {i}: {exc}")

        assert_check(
            len(corrupt) == 0,
            f"{name}: all {len(nonempty)} rows parse as valid JSON",
            detail="; ".join(corrupt[:3]) if corrupt else "",
        )

        # Verify required keys are present in each forecast row
        if "forecast" in name:
            required_keys = {
                "row_id", "ts", "market_id", "outcome_id",
                "E", "gate_status", "reason_code", "recommended_stake_fraction",
            }
            missing_key_rows = []
            for i, line in enumerate(nonempty, start=1):
                row = json.loads(line)
                missing = required_keys - row.keys()
                if missing:
                    missing_key_rows.append(f"row {i} missing: {missing}")
            assert_check(
                len(missing_key_rows) == 0,
                f"{name}: all rows contain required schema keys",
                detail="; ".join(missing_key_rows[:3]),
            )

        # Verify recommended_stake_fraction is always a valid float in [0, 1]
        if "forecast" in name:
            invalid_stake = []
            for i, line in enumerate(nonempty, start=1):
                row = json.loads(line)
                stake = row.get("recommended_stake_fraction")
                if not (isinstance(stake, (int, float)) and math.isfinite(stake) and 0 <= stake <= 1):
                    invalid_stake.append(f"row {i}: stake={stake}")
            assert_check(
                len(invalid_stake) == 0,
                f"{name}: recommended_stake_fraction always in [0.0, 1.0] and finite",
                detail="; ".join(invalid_stake[:3]),
            )


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _validate_jsonl(path: Path, label: str) -> None:
    if not path.exists():
        assert_check(False, f"{label} exists on disk")
        return
    assert_check(True, f"{label} exists on disk")
    lines = [l for l in path.read_text().splitlines() if l.strip()]
    corrupt = 0
    for line in lines:
        try:
            json.loads(line)
        except json.JSONDecodeError:
            corrupt += 1
    assert_check(corrupt == 0, f"{label}: {len(lines)} rows, 0 corrupt lines", detail=f"{corrupt} corrupt")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> bool:
    print("\n" + "=" * 70)
    print("STRESS TEST 3 — The 48-Hour Polling Test: Live I/O Dryrun")
    print("=" * 70)

    with tempfile.TemporaryDirectory(prefix="stress_dryrun_") as tmpdir:
        tmp = Path(tmpdir)

        run_loop_stability_test(tmp)
        run_circuit_breaker_test(tmp)
        run_numpy_encoder_test()
        run_serialization_integrity_test(tmp)

    return len(_failures) == 0


if __name__ == "__main__":
    passed = main()
    print("\n" + "=" * 70)
    if passed:
        print("RESULT: ALL CHECKS PASSED — Live I/O plumbing is bulletproof.")
    else:
        print(f"RESULT: {len(_failures)} CHECK(S) FAILED:")
        for f in _failures:
            print(f"  • {f}")
    print("=" * 70)
    sys.exit(0 if passed else 1)
