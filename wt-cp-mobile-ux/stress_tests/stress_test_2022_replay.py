"""
Stress Test 1 – The Time Machine
=================================
End-to-end Phase 6 + Phase 7 replay using synthetic 2022 World Cup odds.

Feeds market_pipeline.MarketPipeline with 16 representative 2022 WC markets
(group stage → final), then runs evaluation_dashboard.compile_ablation() on
synthetic-but-structurally-valid metrics.

Validation:
  ✓  All 16 markets are processed without crashing
  ✓  ablation.json is generated and is valid JSON
  ✓  Kelly bankroll stays strictly positive, finite, and non-NaN throughout
  ✓  No recommended_stake_fraction overflows the per-market cap (5%)
  ✓  compile_ablation() produces byte-identical output on a second call

Run from project root:
    python stress_tests/stress_test_2022_replay.py

Exit code: 0 = pass, 1 = fail.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import tempfile
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.market_pipeline import MarketPipeline, PipelineConfig
from market.kelly_sizer import BankrollState, BankrollMode
from evaluation.evaluation_dashboard import compile_ablation
from evaluation.accuracy_metrics import (
    MetricsTable, ModelMetrics, DMResult, NybergResult, StageMetrics,
)
from evaluation.clv_tracker import CLVReport, CLVSeries, HMResult
from evaluation.pseudo_clv import ShadowCLVResult

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

_failures: List[str] = []


def assert_check(condition: bool, label: str, detail: str = "") -> bool:
    if condition:
        print(f"  {PASS}  {label}")
    else:
        msg = f"{label}" + (f": {detail}" if detail else "")
        print(f"  {FAIL}  {msg}")
        _failures.append(msg)
    return condition


# ─────────────────────────────────────────────────────────────────────────────
# 2022 WC market fixtures  (representative sample, realistic Pinnacle 3-way)
# odds: [home_win, draw, away_win]
# p_model: M★ probability vector — slightly shifted from devigged to create edges
# ─────────────────────────────────────────────────────────────────────────────

WC2022_MARKETS: List[Dict[str, Any]] = [
    # ── Group Stage ──────────────────────────────────────────────────────────
    {
        "market_id": "2022-11-20_QAT_ECU",
        "home": "QAT", "away": "ECU", "stage": "group",
        "odds": [4.50, 3.60, 1.90],
        "p_model": [0.19, 0.30, 0.51],  # slight edge on ECU
    },
    {
        "market_id": "2022-11-21_ENG_IRN",
        "home": "ENG", "away": "IRN", "stage": "group",
        "odds": [1.45, 4.50, 7.50],
        "p_model": [0.68, 0.21, 0.11],
    },
    {
        "market_id": "2022-11-22_ARG_SAU",
        "home": "ARG", "away": "SAU", "stage": "group",
        "odds": [1.25, 6.00, 12.00],
        "p_model": [0.78, 0.14, 0.08],  # model even more bullish on ARG
    },
    {
        "market_id": "2022-11-23_FRA_AUS",
        "home": "FRA", "away": "AUS", "stage": "group",
        "odds": [1.40, 4.50, 8.50],
        "p_model": [0.71, 0.19, 0.10],
    },
    {
        "market_id": "2022-11-24_BRA_SRB",
        "home": "BRA", "away": "SRB", "stage": "group",
        "odds": [1.50, 4.20, 6.50],
        "p_model": [0.64, 0.22, 0.14],
    },
    {
        "market_id": "2022-11-24_POR_GHA",
        "home": "POR", "away": "GHA", "stage": "group",
        "odds": [1.40, 4.80, 8.00],
        "p_model": [0.69, 0.20, 0.11],
    },
    {
        "market_id": "2022-11-25_ESP_CRC",
        "home": "ESP", "away": "CRC", "stage": "group",
        "odds": [1.22, 6.50, 14.00],
        "p_model": [0.81, 0.13, 0.06],
    },
    {
        "market_id": "2022-11-26_GER_JPN",
        "home": "GER", "away": "JPN", "stage": "group",
        "odds": [1.50, 4.30, 6.50],
        "p_model": [0.63, 0.23, 0.14],
    },
    # ── Round of 16 ───────────────────────────────────────────────────────────
    {
        "market_id": "2022-12-03_ENG_SEN",
        "home": "ENG", "away": "SEN", "stage": "round_of_16",
        "odds": [1.55, 4.20, 5.50],
        "p_model": [0.62, 0.22, 0.16],
    },
    {
        "market_id": "2022-12-04_FRA_POL",
        "home": "FRA", "away": "POL", "stage": "round_of_16",
        "odds": [1.45, 4.50, 6.50],
        "p_model": [0.67, 0.20, 0.13],
    },
    {
        "market_id": "2022-12-05_ARG_AUS",
        "home": "ARG", "away": "AUS", "stage": "round_of_16",
        "odds": [1.30, 5.50, 10.00],
        "p_model": [0.75, 0.17, 0.08],
    },
    {
        "market_id": "2022-12-06_BRA_KOR",
        "home": "BRA", "away": "KOR", "stage": "round_of_16",
        "odds": [1.35, 5.00, 9.00],
        "p_model": [0.73, 0.17, 0.10],
    },
    # ── Quarter-finals ────────────────────────────────────────────────────────
    {
        "market_id": "2022-12-10_ENG_FRA",
        "home": "ENG", "away": "FRA", "stage": "quarter_final",
        "odds": [2.80, 3.20, 2.60],
        "p_model": [0.33, 0.31, 0.36],
    },
    {
        "market_id": "2022-12-10_NED_ARG",
        "home": "NED", "away": "ARG", "stage": "quarter_final",
        "odds": [3.20, 3.30, 2.30],
        "p_model": [0.29, 0.30, 0.41],
    },
    # ── Semi-final ────────────────────────────────────────────────────────────
    {
        "market_id": "2022-12-14_FRA_MAR",
        "home": "FRA", "away": "MAR", "stage": "semi_final",
        "odds": [1.55, 4.00, 6.50],
        "p_model": [0.63, 0.22, 0.15],
    },
    # ── Final ─────────────────────────────────────────────────────────────────
    {
        "market_id": "2022-12-18_ARG_FRA",
        "home": "ARG", "away": "FRA", "stage": "final",
        "odds": [2.50, 3.30, 2.80],
        "p_model": [0.37, 0.29, 0.34],  # tight — the actual final was 3-3 aet
    },
    # ── Additional Group Stage (synthetic, structurally valid) ────────────────
    {
        "market_id": "2022-11-28_NED_ECU",
        "home": "NED", "away": "ECU", "stage": "group",
        "odds": [2.00, 3.20, 3.80],
        "p_model": [0.47, 0.29, 0.24],
    },
    {
        "market_id": "2022-11-29_MEX_POL",
        "home": "MEX", "away": "POL", "stage": "group",
        "odds": [2.60, 3.20, 2.75],
        "p_model": [0.36, 0.31, 0.33],
    },
    {
        "market_id": "2022-11-30_URU_KOR",
        "home": "URU", "away": "KOR", "stage": "group",
        "odds": [1.90, 3.20, 4.20],
        "p_model": [0.49, 0.29, 0.22],
    },
    {
        "market_id": "2022-12-01_CRO_BEL",
        "home": "CRO", "away": "BEL", "stage": "group",
        "odds": [2.50, 3.20, 2.90],
        "p_model": [0.37, 0.31, 0.32],
    },
    {
        "market_id": "2022-12-02_MEX_SAU",
        "home": "MEX", "away": "SAU", "stage": "group",
        "odds": [1.55, 4.00, 5.50],
        "p_model": [0.62, 0.23, 0.15],
    },
    {
        "market_id": "2022-12-02_POL_ARG",
        "home": "POL", "away": "ARG", "stage": "group",
        "odds": [8.50, 5.50, 1.35],
        "p_model": [0.08, 0.20, 0.72],
    },
    {
        "market_id": "2022-12-01_TUN_FRA",
        "home": "TUN", "away": "FRA", "stage": "group",
        "odds": [5.50, 4.00, 1.65],
        "p_model": [0.14, 0.28, 0.58],
    },
    {
        "market_id": "2022-11-30_URU_GHA",
        "home": "URU", "away": "GHA", "stage": "group",
        "odds": [1.80, 3.40, 4.50],
        "p_model": [0.52, 0.28, 0.20],
    },
    # ── Additional Round of 16 ────────────────────────────────────────────────
    {
        "market_id": "2022-12-03_USA_NED",
        "home": "USA", "away": "NED", "stage": "round_of_16",
        "odds": [3.50, 3.20, 2.20],
        "p_model": [0.24, 0.30, 0.46],
    },
    {
        "market_id": "2022-12-05_JPN_CRO",
        "home": "JPN", "away": "CRO", "stage": "round_of_16",
        "odds": [2.80, 3.20, 2.55],
        "p_model": [0.33, 0.30, 0.37],
    },
    {
        "market_id": "2022-12-06_MAR_ESP",
        "home": "MAR", "away": "ESP", "stage": "round_of_16",
        "odds": [5.00, 3.50, 1.75],
        "p_model": [0.16, 0.30, 0.54],
    },
    {
        "market_id": "2022-12-06_POR_SUI",
        "home": "POR", "away": "SUI", "stage": "round_of_16",
        "odds": [1.45, 4.50, 7.00],
        "p_model": [0.68, 0.21, 0.11],
    },
    # ── Additional Quarter-final ──────────────────────────────────────────────
    {
        "market_id": "2022-12-09_BRA_CRO",
        "home": "BRA", "away": "CRO", "stage": "quarter_final",
        "odds": [1.65, 3.60, 5.50],
        "p_model": [0.58, 0.25, 0.17],
    },
    # ── Additional Semi-final ─────────────────────────────────────────────────
    {
        "market_id": "2022-12-13_ARG_CRO",
        "home": "ARG", "away": "CRO", "stage": "semi_final",
        "odds": [1.70, 3.50, 5.00],
        "p_model": [0.57, 0.25, 0.18],
    },
]

OUTCOME_LABELS = ["home_win", "draw", "away_win"]

# Base timestamp for each market (matches the match dates above)
_BASE_TS = datetime(2022, 11, 20, 18, 0, 0, tzinfo=timezone.utc)


def _make_market_input(mkt: Dict[str, Any], tick: int) -> Dict[str, Any]:
    """Convert a WC2022_MARKETS entry into the format expected by run_once()."""
    return {
        "market_id": mkt["market_id"],
        "market_class": "1x2",
        "stage": mkt["stage"],
        "book": "pinnacle",
        "odds": mkt["odds"],
        "outcome_labels": OUTCOME_LABELS,
        "p_model": mkt["p_model"],
        "host_team": None,
        "entity_ids": [mkt["home"], mkt["away"]],
        "snapshot_data": {
            # No cross-book or liquidity data → those gates won't fire
            "pinnacle_q_30min_ago": None,
            "betfair_q": None,
            "polymarket_volume_24h_usd": None,
            "pinnacle_last_updated": None,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic evaluation objects  (structurally valid, numerically plausible)
# ─────────────────────────────────────────────────────────────────────────────

def _make_model_metrics(model_id: str, n: int = 64) -> ModelMetrics:
    rng = np.random.default_rng(hash(model_id) % 2**32)
    brier = float(rng.uniform(0.18, 0.26))
    rps = float(rng.uniform(0.19, 0.27))
    ll = float(rng.uniform(0.95, 1.10))
    ci_half = 0.02
    return ModelMetrics(
        model_id=model_id,
        n=n,
        brier_mean=brier,
        brier_ci=(brier - ci_half, brier + ci_half),
        rps_mean=rps,
        rps_median=rps - 0.005,
        rps_ci=(rps - ci_half, rps + ci_half),
        log_loss_mean=ll,
        log_loss_ci=(ll - 0.05, ll + 0.05),
        by_stage={
            "GROUP": StageMetrics(
                stage="GROUP", n=48,
                brier_mean=brier + 0.01, brier_ci=(brier, brier + 0.02),
                rps_mean=rps + 0.01, rps_median=rps, rps_ci=(rps, rps + 0.02),
                log_loss_mean=ll + 0.05, log_loss_ci=(ll, ll + 0.1),
            ),
        },
    )


def _make_dm_result(a: str, b: str) -> DMResult:
    return DMResult(
        model_a=a, model_b=b, loss_type="log_loss",
        n=64, mean_diff=0.05, dm_stat=1.85, dm_star=1.82, pvalue=0.068,
        hln_applied=True, bandwidth=4, reject_at_alpha={"0.05": False, "0.10": True},
    )


def _make_nyberg_result(model_id: str) -> NybergResult:
    return NybergResult(
        model_id=model_id, n=64,
        ll_full=-41.2, ll_restricted=-43.8,
        lr_stat=5.2, pvalue=0.074, df=2,
        reject_primary=False, reject_bonferroni=False,
    )


def _make_hm_result(seed: int = 42) -> HMResult:
    rng = np.random.default_rng(seed)
    dist = rng.normal(0.18, 0.08, size=2000)
    return HMResult(
        n=20, sharpe_point=0.18,
        bootstrap_distribution=dist,
        ci_90=(float(np.percentile(dist, 5)), float(np.percentile(dist, 95))),
        ci_95=(float(np.percentile(dist, 2.5)), float(np.percentile(dist, 97.5))),
        block_length=4, n_bootstrap=2000, bootstrap_seed=seed,
        decision="WEAK_EDGE",
    )


def _make_clv_series(n: int = 20) -> CLVSeries:
    rng = np.random.default_rng(1234)
    clv = rng.normal(0.008, 0.03, size=n)
    clv_log = rng.normal(0.006, 0.025, size=n)
    stake = rng.uniform(0.01, 0.04, size=n)
    return CLVSeries(
        forecast_id=[f"fc_{i:04d}" for i in range(n)],
        match_id=[f"match_{i:04d}" for i in range(n)],
        outcome=["home_win"] * n,
        clv=clv, clv_log=clv_log, stake=stake,
        cumulative_clv=np.cumsum(clv),
        cumulative_clv_weighted=np.cumsum(clv * stake),
    )


def _make_clv_report(model_id: str, seed: int = 42) -> CLVReport:
    series = _make_clv_series(20)
    return CLVReport(
        model_id=model_id,
        n_bets=20,
        clv_mean=float(np.mean(series.clv)),
        clv_std=float(np.std(series.clv)),
        z_stat=1.45, z_pvalue=0.147, z_reject=False,
        sharpe=0.18,
        hm_result=_make_hm_result(seed),
        series=series,
        excluded_count=0,
        code_sha="deadbeef",
    )


def _make_metrics_table() -> MetricsTable:
    models = ["M0", "M1", "M2", "M3", "M_STAR", "MARKET_DEVIGGED"]
    return MetricsTable(
        model_metrics={m: _make_model_metrics(m) for m in models},
        dm_results=[
            _make_dm_result("M_STAR", "M0"),
            _make_dm_result("M_STAR", "MARKET_DEVIGGED"),
        ],
        nyberg_results=[_make_nyberg_result(m) for m in models],
        kill_criterion_tripped=False,
        kill_criterion_detail="N/A — stress test replay",
    )


def _make_shadow_results() -> Dict[str, ShadowCLVResult]:
    shadow_models = ["M0", "M1", "M2", "M3"]
    return {
        m: ShadowCLVResult(shadow_of="M_STAR", report=_make_clv_report(m, seed=ord(m[1])))
        for m in shadow_models
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main replay routine
# ─────────────────────────────────────────────────────────────────────────────

def run_replay(output_dir: Path | None = None) -> bool:
    print("\n" + "=" * 70)
    print("STRESS TEST 1 — The Time Machine: 2022 WC Replay")
    print("=" * 70)

    if output_dir is not None:
        output_dir.mkdir(parents=True, exist_ok=True)
        print(f"[Config] Snapshot bundles → {output_dir}")

    with tempfile.TemporaryDirectory(prefix="stress_replay_") as tmpdir:
        tmp = Path(tmpdir)
        forecast_log = tmp / "forecast_log.jsonl"
        gate_log = tmp / "gate_log.jsonl"
        ablation_dir = tmp / "ablation_output"
        ablation_dir.mkdir()

        cfg = PipelineConfig(
            forecast_log_path=forecast_log,
            gate_log_path=gate_log,
            initial_bankroll=10_000.0,
            code_sha="stress_test_sha_2022",
            data_sha="wc2022_synthetic_v1",
            spec_sha="",
        )
        pipeline = MarketPipeline(cfg)

        # ── Phase 6: Run the pipeline for each 2022 match ──────────────────
        n_markets = len(WC2022_MARKETS)
        print(f"\n[Phase 6] Running market pipeline over {n_markets} WC 2022 markets …")
        total_markets = 0
        total_flags = 0
        total_suppressed = 0
        bankroll_snapshots: List[float] = [10_000.0]

        for i, mkt in enumerate(WC2022_MARKETS):
            ts = _BASE_TS + timedelta(hours=i * 3)
            market_input = _make_market_input(mkt, tick=i)
            summary = pipeline.run_once(ts, [market_input])

            total_markets += summary.markets_processed
            total_flags += summary.flags_raised
            total_suppressed += (
                summary.suppressed_named_event
                + summary.suppressed_price_intra
                + summary.suppressed_price_cross
                + summary.suppressed_liquidity_poly
                + summary.suppressed_liquidity_stale
            )

            # Bankroll does NOT change (sizer is advisory only), but state
            # must remain internally consistent throughout
            state = pipeline._bankroll_state
            bankroll_snapshots.append(state.current_bankroll)

            # Write per-market snapshot bundle when --output-dir is set
            if output_dir is not None:
                bundle = {
                    "bundle_index": i,
                    "market_id": mkt["market_id"],
                    "stage": mkt["stage"],
                    "timestamp_utc": ts.isoformat(),
                    "odds": mkt["odds"],
                    "p_model": mkt["p_model"],
                    "pipeline_summary": summary.to_dict(),
                    "bankroll": state.current_bankroll,
                }
                fname = output_dir / f"bundle_{i:03d}_{mkt['market_id']}.json"
                fname.write_text(json.dumps(bundle, indent=2))

        assert_check(total_markets == n_markets, f"All {n_markets} markets processed", f"got {total_markets}")

        # ── Kelly bankroll stability checks ─────────────────────────────────
        print("\n[Kelly] Bankroll stability checks …")

        no_nan = all(math.isfinite(b) for b in bankroll_snapshots)
        assert_check(no_nan, "Bankroll is always finite (no NaN/Inf)")

        no_negative = all(b > 0 for b in bankroll_snapshots)
        assert_check(no_negative, "Bankroll is always positive (no zero/negative)")

        peak = pipeline._bankroll_state.peak_bankroll
        current = pipeline._bankroll_state.current_bankroll
        not_stopped = pipeline._bankroll_state.mode != BankrollMode.STOPPED
        assert_check(not_stopped, "Kelly drawdown stop NOT triggered (stable replay)")

        # ── Validate forecast log rows ───────────────────────────────────────
        print("\n[Log] Validating forecast_log.jsonl rows …")
        rows = []
        if forecast_log.exists():
            for line in forecast_log.read_text().splitlines():
                if line.strip():
                    rows.append(json.loads(line))

        assert_check(len(rows) > 0, "forecast_log.jsonl has rows", f"got {len(rows)}")

        stake_cap_ok = all(
            row.get("recommended_stake_fraction", 0.0) <= 0.05 + 1e-9
            for row in rows
        )
        assert_check(stake_cap_ok, "No row exceeds per-market cap of 5%")

        serializable = True
        for row in rows:
            try:
                json.dumps(row)
            except (TypeError, ValueError) as exc:
                serializable = False
                _failures.append(f"JSON serialization error in row {row.get('row_id')}: {exc}")
                break
        assert_check(serializable, "All forecast_log rows are JSON-serializable")

        # ── Phase 7: compile_ablation() ─────────────────────────────────────
        print("\n[Phase 7] Running evaluation_dashboard.compile_ablation() …")
        metrics = _make_metrics_table()
        mstar_report = _make_clv_report("M_STAR", seed=99)
        shadow_results = _make_shadow_results()

        try:
            compile_ablation(
                metrics=metrics,
                mstar_report=mstar_report,
                shadow_results=shadow_results,
                output_dir=ablation_dir,
                tournament="WC2022_REPLAY",
                expected_constants_sha=None,
                generated_at_utc="2022-12-18T22:00:00Z",
            )
            ablation_crashed = False
        except Exception as exc:
            ablation_crashed = True
            traceback.print_exc()
            _failures.append(f"compile_ablation() crashed: {exc}")

        assert_check(not ablation_crashed, "compile_ablation() completed without exception")

        ablation_path = ablation_dir / "ablation.json"
        assert_check(ablation_path.exists(), "ablation.json was created on disk")

        if ablation_path.exists():
            raw = ablation_path.read_text()
            try:
                ablation_data = json.loads(raw)
                valid_json = True
            except json.JSONDecodeError as exc:
                valid_json = False
                _failures.append(f"ablation.json is not valid JSON: {exc}")
            assert_check(valid_json, "ablation.json is valid JSON")

            if valid_json:
                has_schema = "schema_version" in ablation_data
                assert_check(has_schema, "ablation.json contains schema_version field")
                has_models = "models" in ablation_data
                assert_check(has_models, "ablation.json contains models array")

        # ── Idempotency: second compile produces identical bytes ─────────────
        print("\n[Idempotency] Re-running compile_ablation() …")
        if not ablation_crashed:
            first_bytes = ablation_path.read_bytes() if ablation_path.exists() else b""
            try:
                compile_ablation(
                    metrics=metrics,
                    mstar_report=mstar_report,
                    shadow_results=shadow_results,
                    output_dir=ablation_dir,
                    tournament="WC2022_REPLAY",
                    expected_constants_sha=None,
                    generated_at_utc="2022-12-18T22:00:00Z",
                )
                second_bytes = ablation_path.read_bytes() if ablation_path.exists() else b""
                idempotent = first_bytes == second_bytes
            except Exception:
                idempotent = False
            assert_check(idempotent, "compile_ablation() is byte-idempotent on identical inputs")

        # ── Summary ──────────────────────────────────────────────────────────
        print(f"\n[Stats] Markets processed: {total_markets}")
        print(f"        Flags raised:        {total_flags}")
        print(f"        Suppressed:          {total_suppressed}")
        print(f"        Log rows written:    {len(rows)}")
        print(f"        Bankroll mode:       {pipeline._bankroll_state.mode.value}")
        print(f"        Peak bankroll:       {peak:,.2f}")

        if output_dir is not None:
            bundles = sorted(output_dir.glob("bundle_*.json"))
            print(f"\n[Output] {len(bundles)} snapshot bundle(s) written to {output_dir}")

    return len(_failures) == 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stress Test 1 — 2022 WC Replay")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Directory to write per-market JSON snapshot bundles into.",
    )
    args = parser.parse_args()

    passed = run_replay(output_dir=args.output_dir)

    print("\n" + "=" * 70)
    if passed:
        print("RESULT: ALL CHECKS PASSED — Phase 6+7 pipeline is structurally sound.")
    else:
        print(f"RESULT: {len(_failures)} CHECK(S) FAILED:")
        for f in _failures:
            print(f"  • {f}")
    print("=" * 70)
    sys.exit(0 if passed else 1)
