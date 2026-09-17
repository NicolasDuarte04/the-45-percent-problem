"""
evaluation/pseudo_clv.py
========================
Hypothetical CLV for shadow models M0–M3.  Phase 7, Module 4.

Answers the counterfactual: "Had M0/M1/M2/M3 been the Champion instead of M★,
would it also have generated edge?"

Core principle ("Champion's Clothes"):
  Each shadow model is dressed in M★'s exact market-facing machinery:
    - Same edge threshold (3% mainline / 5% derivative)
    - Same Volatility Gate state (from market_state_log snapshot)
    - Same Kelly sizing (φ=1/4 mainline, φ=1/8 longshot)
    - Same opening/closing lines from forecast_log

  The ONLY thing that changes is the probability vector p_model.

Key invariant:
  - Replay NEVER mutates forecast_log or market_state_log
  - Each shadow model has its own independent hypothetical bankroll / drawdown
  - When m = M★, pseudo_clv output must equal clv_tracker output exactly

CLV math is delegated to clv_tracker — this module is purely orchestration.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from evaluation.clv_tracker import (
    CLVReport,
    CLVSeries,
    HMResult,
    N_BOOTSTRAP,
    compute_clv_series,
    emit_clv_report,
    hall_mueller_sharpe,
    z_score,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Load pre-registered constants
# ---------------------------------------------------------------------------

_YAML_PATH = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"


def _load_constants() -> dict[str, Any]:
    with open(_YAML_PATH, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


_CONST: dict[str, Any] = _load_constants()
_KELLY = _CONST["kelly"]

EDGE_THRESHOLD_MAINLINE: float = float(_KELLY["edge_threshold_mainline"])
EDGE_THRESHOLD_DERIVATIVE: float = float(_KELLY["edge_threshold_derivative"])
KELLY_MAINLINE: float = float(_KELLY["fraction_mainline"])
KELLY_LONGSHOT: float = float(_KELLY["fraction_longshot"])
LONGSHOT_THRESHOLD: float = float(_KELLY["longshot_threshold"])
DRAWDOWN_STOP: float = float(_KELLY["drawdown_stop"])

# ---------------------------------------------------------------------------
# Shadow book dataclasses
# ---------------------------------------------------------------------------


@dataclass
class ShadowBankroll:
    """Hypothetical bankroll for one shadow model (independent per shadow)."""
    current: float = 1.0          # normalised to 1.0 unit
    peak: float = 1.0
    halved: bool = False           # True if drawdown stop triggered

    def update(self, stake_pct: float, won: bool, decimal_odds: float) -> None:
        """Apply hypothetical bet result to bankroll."""
        if won:
            self.current += stake_pct * (decimal_odds - 1.0)
        else:
            self.current -= stake_pct
        if self.current > self.peak:
            self.peak = self.current
        drawdown = (self.peak - self.current) / self.peak
        self.halved = drawdown >= DRAWDOWN_STOP

    def effective_kelly(self, base_kelly: float) -> float:
        return base_kelly * 0.5 if self.halved else base_kelly


@dataclass
class ShadowBook:
    """One shadow model's hypothetical betting ledger."""
    model_id: str
    bets: list[dict[str, Any]] = field(default_factory=list)
    bankroll: ShadowBankroll = field(default_factory=ShadowBankroll)


@dataclass
class ShadowCLVResult:
    """Output of :func:`compute_pseudo_clv` — same schema as CLVReport + shadow_of."""
    shadow_of: str
    report: CLVReport


# ---------------------------------------------------------------------------
# Bet selection replay
# ---------------------------------------------------------------------------


def _compute_edge(p_model_outcome: float, q_devigged_outcome: float) -> float:
    return p_model_outcome - q_devigged_outcome


def _kelly_stake(
    edge: float,
    q_devigged: float,
    bankroll: ShadowBankroll,
    is_longshot: bool,
    is_derivative: bool,
) -> float:
    """
    Compute fractional Kelly stake for the shadow model.

    Uses pre-registered constants from pre_reg_constants.yaml.
    Returns 0.0 if edge is below threshold.
    """
    threshold = EDGE_THRESHOLD_DERIVATIVE if is_derivative else EDGE_THRESHOLD_MAINLINE
    if edge < threshold:
        return 0.0

    base_kelly = KELLY_LONGSHOT if is_longshot else KELLY_MAINLINE
    effective = bankroll.effective_kelly(base_kelly)

    # Full Kelly fraction: f = edge / (decimal_odds - 1) ≈ edge / (1 - q) for small vig
    d = 1.0 / max(q_devigged, 1e-9)  # implied decimal odds
    full_kelly = edge / (d - 1.0) if d > 1.0 else 0.0
    return max(0.0, effective * full_kelly)


def build_shadow_book(
    model_id: str,
    forecast_log_root: Path,
    market_state_log: Path,
    tournament: str = "FIFA2026",
) -> ShadowBook:
    """
    Replay bet-selection, gate, and sizing against shadow model probabilities.

    The ``market_state_log`` is a JSONL file written by Phase 6 containing:
      {match_id, gate_fired, gate_rules_tripped, is_derivative, ...}

    The opening/closing lines are drawn from ``forecast_log`` rows stamped
    at the same ``emitted_at_utc`` as M★'s opening rows.

    This function does NOT re-query any external data sources.
    """
    book = ShadowBook(model_id=model_id)

    # Load shadow model opening rows from forecast_log
    forecasts_root = forecast_log_root / "evaluation" / "forecasts" / tournament
    shadow_open: dict[str, dict[str, Any]] = {}   # match_id → row
    shadow_close: dict[str, dict[str, Any]] = {}  # match_id → row

    for phase, target in (("opening", shadow_open), ("closing", shadow_close)):
        for path in sorted(forecasts_root.rglob(f"{phase}.jsonl")):
            if not path.exists():
                continue
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        row = json.loads(line)
                        if row.get("model_id") == model_id:
                            target[row["match_id"]] = row
                    except json.JSONDecodeError:
                        pass

    # Load market gate state (Phase 6 snapshot)
    gate_states: dict[str, dict[str, Any]] = {}
    if market_state_log.exists():
        with open(market_state_log, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    mid = row.get("match_id", "")
                    if mid:
                        gate_states[mid] = row
                except json.JSONDecodeError:
                    pass

    if not shadow_open:
        log.warning("build_shadow_book: no shadow opening rows", model=model_id)
        return book

    for match_id, open_row in shadow_open.items():
        if match_id not in shadow_close:
            continue  # no closing row to compute CLV

        close_row = shadow_close[match_id]
        gate = gate_states.get(match_id, {})
        gate_fired = gate.get("gate_fired", open_row.get("volatility_gate_state", {}).get("fired", False))

        # Gate: use the same gate state M★ observed
        if gate_fired:
            book.bets.append(
                {
                    "match_id": match_id,
                    "model_id": model_id,
                    "excluded": True,
                    "exclusion_reason": "GATE_FIRED",
                    "q_open_devigged": None,
                    "q_close_devigged": None,
                    "kelly_stake_pct": 0.0,
                }
            )
            continue

        # Shadow probabilities
        p_model = open_row.get("p_model", {})
        q_open = open_row.get("q_market_devigged", {})
        q_close = close_row.get("q_market_devigged", {})
        q_raw_open = open_row.get("q_market_raw", {})
        q_raw_close = close_row.get("q_market_raw", {})

        is_derivative = gate.get("is_derivative", False)

        # Find the best outcome (highest edge)
        best_outcome: Optional[str] = None
        best_edge = -np.inf
        for outcome in ("H", "D", "A"):
            p = float(p_model.get(outcome, 0.0))
            q = float(q_open.get(outcome, 0.0))
            if q <= 0:
                continue
            e = _compute_edge(p, q)
            if e > best_edge:
                best_edge = e
                best_outcome = outcome

        if best_outcome is None or best_edge <= 0:
            book.bets.append(
                {
                    "match_id": match_id,
                    "model_id": model_id,
                    "excluded": True,
                    "exclusion_reason": "NO_EDGE",
                    "q_open_devigged": None,
                    "q_close_devigged": None,
                    "kelly_stake_pct": 0.0,
                }
            )
            continue

        q_open_val = float(q_open.get(best_outcome, 0.0))
        q_close_val = float(q_close.get(best_outcome, 0.0))
        d_open_val = float(q_raw_open.get(best_outcome, 1.0 / max(q_open_val, 1e-9)))
        d_close_val = float(q_raw_close.get(best_outcome, 1.0 / max(q_close_val, 1e-9)))

        is_longshot = q_open_val < LONGSHOT_THRESHOLD
        stake = _kelly_stake(best_edge, q_open_val, book.bankroll, is_longshot, is_derivative)

        if stake <= 0:
            book.bets.append(
                {
                    "match_id": match_id,
                    "model_id": model_id,
                    "excluded": True,
                    "exclusion_reason": "BELOW_THRESHOLD",
                    "q_open_devigged": q_open_val,
                    "q_close_devigged": q_close_val,
                    "kelly_stake_pct": 0.0,
                }
            )
            continue

        book.bets.append(
            {
                "match_id": match_id,
                "model_id": model_id,
                "excluded": False,
                "exclusion_reason": None,
                "outcome_bet": best_outcome,
                "edge": float(best_edge),
                "q_open_devigged": q_open_val,
                "q_close_devigged": q_close_val,
                "d_open_decimal": d_open_val,
                "d_close_decimal": d_close_val,
                "kelly_stake_pct": float(stake),
                "forecast_id": open_row.get("forecast_id", ""),
                "code_sha": open_row.get("code_sha", "0000000"),
            }
        )

    log.info(
        "build_shadow_book",
        model=model_id,
        total=len(book.bets),
        placed=sum(1 for b in book.bets if not b.get("excluded", True)),
    )
    return book


def compute_pseudo_clv(
    book: ShadowBook,
    outdir: Optional[Path] = None,
) -> ShadowCLVResult:
    """
    Run the CLV pipeline against a shadow book.

    Returns a :class:`ShadowCLVResult` with the same schema as
    :class:`~clv_tracker.CLVReport`, plus ``shadow_of = model_id``.

    If ``m = M★``, output must equal :func:`~clv_tracker.emit_clv_report`
    output (regression check in test suite).
    """
    active_bets = [b for b in book.bets if not b.get("excluded", True)]

    if not active_bets:
        log.warning("compute_pseudo_clv: no active bets", model=book.model_id)
        empty_series = CLVSeries(
            [], [], [],
            np.array([]), np.array([]), np.array([]),
            np.array([]), np.array([]),
        )
        empty_hm = HMResult(
            n=0,
            sharpe_point=0.0,
            bootstrap_distribution=np.array([]),
            ci_90=(0.0, 0.0),
            ci_95=(0.0, 0.0),
            block_length=4,
            n_bootstrap=N_BOOTSTRAP,
            bootstrap_seed=0,
            decision="NO_EDGE",
        )
        empty_report = CLVReport(
            model_id=book.model_id,
            n_bets=0,
            clv_mean=0.0,
            clv_std=0.0,
            z_stat=0.0,
            z_pvalue=1.0,
            z_reject=False,
            sharpe=0.0,
            hm_result=empty_hm,
            series=empty_series,
            excluded_count=len(book.bets),
        )
        return ShadowCLVResult(shadow_of=book.model_id, report=empty_report)

    paired = pd.DataFrame(active_bets)
    # Rename to match clv_tracker.compute_clv_series expected columns
    for col in ("forecast_id", "outcome_bet"):
        if col not in paired.columns:
            paired[col] = ""

    code_sha = str(active_bets[0].get("code_sha", "0000000"))

    series = compute_clv_series(paired)
    z = z_score(series.clv)
    hm = hall_mueller_sharpe(series.clv, code_sha=code_sha)

    report = CLVReport(
        model_id=book.model_id,
        n_bets=len(series.clv),
        clv_mean=float(series.clv.mean()),
        clv_std=float(series.clv.std(ddof=1)) if len(series.clv) > 1 else 0.0,
        z_stat=float(z["z"]),
        z_pvalue=float(z["pvalue_one_sided"]),
        z_reject=bool(z["reject"]),
        sharpe=float(hm.sharpe_point),
        hm_result=hm,
        series=series,
        excluded_count=len(book.bets) - len(active_bets),
        code_sha=code_sha,
    )

    if outdir is not None:
        emit_clv_report(paired, outdir / book.model_id, model_id=book.model_id, code_sha=code_sha)

    return ShadowCLVResult(shadow_of=book.model_id, report=report)


def ablation_sweep(
    forecast_log_root: Path,
    market_state_log: Path,
    outdir: Optional[Path] = None,
    tournament: str = "FIFA2026",
    mstar_report: Optional[CLVReport] = None,
) -> dict[str, ShadowCLVResult]:
    """
    Run the full ablation: build shadow books for M0–M3, compute pseudo-CLV
    for each.  M★ is passed through from ``clv_tracker`` for comparison.

    Returns dict keyed by model_id (including "M_STAR" if mstar_report given).
    """
    results: dict[str, ShadowCLVResult] = {}

    shadow_models = _CONST["models"]["shadow"]
    for model_id in shadow_models:
        log.info("ablation_sweep: building shadow book", model=model_id)
        book = build_shadow_book(
            model_id=model_id,
            forecast_log_root=forecast_log_root,
            market_state_log=market_state_log,
            tournament=tournament,
        )
        results[model_id] = compute_pseudo_clv(book, outdir=outdir)

    if mstar_report is not None:
        results["M_STAR"] = ShadowCLVResult(shadow_of="M_STAR", report=mstar_report)

    log.success(
        "ablation_sweep complete",
        models=list(results.keys()),
        bets={k: v.report.n_bets for k, v in results.items()},
    )
    return results
