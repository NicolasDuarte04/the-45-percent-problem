"""
evaluation/clv_tracker.py
==========================
Closing Line Value telemetry for M★.  Phase 7, Module 3.

Quantifies whether M★'s bet selections systematically beat the closing line.
CLV is the trading community's gold standard for edge detection at small N.

Primary edge test: Hall-Mueller (1997) stationary block bootstrap Sharpe ratio.
Secondary floor:  naive i.i.d. Z-test (reported but not primary).

All α levels, bootstrap parameters, and decision thresholds are read from
``evaluation/pre_reg_constants.yaml``.  No value is hard-coded.

Bootstrap seed derivation (pre-registered):
    seed = int.from_bytes(code_sha.encode('ascii')[:8], 'big')

Two CLV definitions (both logged):
  Probability-space (primary):  CLV_i = q*_close_i / q*_open_i − 1
  Log-odds (secondary):         CLV_log_i = ln(d_open_i) − ln(d_close_i)
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

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Load pre-registered constants
# ---------------------------------------------------------------------------

_YAML_PATH = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"


def _load_constants() -> dict[str, Any]:
    with open(_YAML_PATH, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


_CONST: dict[str, Any] = _load_constants()
_CLV_CONST = _CONST["clv"]
_BS_CONST = _CLV_CONST["bootstrap"]

N_BOOTSTRAP: int = int(_BS_CONST["n_bootstrap"])
BLOCK_MIN: int = int(_BS_CONST["block_length_min"])
BLOCK_MAX: int = int(_BS_CONST["block_length_max"])

# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class HMResult:
    """Output of :func:`hall_mueller_sharpe`."""
    n: int
    sharpe_point: float
    bootstrap_distribution: np.ndarray        # shape (B,) — HM-corrected SR draws
    ci_90: tuple[float, float]
    ci_95: tuple[float, float]
    block_length: int
    n_bootstrap: int
    bootstrap_seed: int
    decision: str                             # "GENUINE_EDGE" | "WEAK_EDGE" | "NO_EDGE"


@dataclass
class CLVSeries:
    """Per-bet and cumulative CLV series for M★ (or a shadow book)."""
    forecast_id: list[str]
    match_id: list[str]
    outcome: list[str]
    clv: np.ndarray          # probability-space CLV (primary)
    clv_log: np.ndarray      # log-odds CLV (secondary)
    stake: np.ndarray        # kelly_stake_pct
    cumulative_clv: np.ndarray
    cumulative_clv_weighted: np.ndarray


@dataclass
class CLVReport:
    """Full CLV analysis for one book (M★ or a shadow model)."""
    model_id: str
    n_bets: int
    clv_mean: float
    clv_std: float
    z_stat: float
    z_pvalue: float
    z_reject: bool
    sharpe: float
    hm_result: HMResult
    series: CLVSeries
    excluded_count: int = 0
    code_sha: str = ""


# ---------------------------------------------------------------------------
# Block length formula  (pre-registered)
# ---------------------------------------------------------------------------


def _block_length(n: int) -> int:
    """Return pre-registered block length: clamp(floor(1.75 * N^(1/3)), [4, 12])."""
    raw = int(np.floor(1.75 * (n ** (1.0 / 3.0))))
    return max(BLOCK_MIN, min(BLOCK_MAX, raw))


# ---------------------------------------------------------------------------
# Stationary block bootstrap (Politis & Romano 1994)
# ---------------------------------------------------------------------------


def _stationary_block_resample(
    x: np.ndarray,
    l_bar: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """
    Stationary block bootstrap resample of length len(x).

    Block starts are uniform on {0, …, n-1}.
    Block lengths are Geometric(1/L_bar) → mean L_bar.
    Observations wrap around (circular).
    """
    n = len(x)
    result = np.empty(n, dtype=x.dtype)
    idx = 0
    p_stop = 1.0 / l_bar  # geometric stop probability
    while idx < n:
        start = int(rng.integers(0, n))
        # Geometric block length
        length = int(rng.geometric(p_stop))
        for k in range(length):
            if idx >= n:
                break
            result[idx] = x[(start + k) % n]
            idx += 1
    return result


# ---------------------------------------------------------------------------
# Bootstrap seed derivation  (pre-registered)
# ---------------------------------------------------------------------------


def _bootstrap_seed_from_sha(code_sha: str) -> int:
    """
    Derive a reproducible bootstrap seed from the frozen code SHA.

    Pre-registered formula: int.from_bytes(code_sha.encode('ascii')[:8], 'big')
    """
    raw = code_sha.encode("ascii")[:8]
    return int.from_bytes(raw, "big")


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------


def z_score(clv: np.ndarray) -> dict[str, float]:
    """
    Naive i.i.d. Z-test for H_0: E[CLV] = 0.

    Pre-specified rejection: one-sided 5% at Z > 1.645.
    Returns dict with keys: mean, std, z, pvalue_one_sided, reject.
    """
    n = len(clv)
    mu = float(clv.mean())
    sigma = float(clv.std(ddof=1))
    se = sigma / np.sqrt(n)
    z = mu / se if se > 0 else 0.0

    z_crit = float(_CLV_CONST["z_test"]["critical_value"])
    alpha_one_sided = float(_CLV_CONST["z_test"]["alpha_one_sided"])
    from scipy import stats as sp_stats  # local import to keep top-level clean
    pval = float(sp_stats.norm.sf(z))

    return {
        "mean": mu,
        "std": sigma,
        "n": n,
        "z": z,
        "z_critical": z_crit,
        "alpha_one_sided": alpha_one_sided,
        "pvalue_one_sided": pval,
        "reject": bool(z > z_crit),
    }


def hall_mueller_sharpe(
    clv: np.ndarray,
    n_bootstrap: int = N_BOOTSTRAP,
    code_sha: str = "0000000",
) -> HMResult:
    """
    Hall-Mueller (1997) bias-corrected stationary block bootstrap Sharpe ratio.

    Steps:
      1. Compute realized Sharpe: SR_hat = mean(CLV) / std(CLV)
      2. Block length: pre-registered formula, clamped to [4, 12]
      3. B = 10 000 stationary-bootstrap resamples
      4. HM bias correction: SR_HM_b = 2*SR_hat − SR_boot_b
      5. CI = 2.5/97.5 and 5/95 percentiles of {SR_HM_b}
      6. Decision: per pre-registered thresholds

    Bootstrap seed is derived exclusively from ``code_sha`` so the result is
    reproducible given frozen code.
    """
    clv = np.asarray(clv, dtype=float)
    n = len(clv)

    mu = clv.mean()
    sigma = clv.std(ddof=1)
    sr_hat = mu / sigma if sigma > 0 else 0.0

    l_bar = _block_length(n)
    seed = _bootstrap_seed_from_sha(code_sha)
    rng = np.random.default_rng(seed)

    boot_sr = np.empty(n_bootstrap)
    for b in range(n_bootstrap):
        sample = _stationary_block_resample(clv, l_bar, rng)
        mu_b = sample.mean()
        sigma_b = sample.std(ddof=1)
        sr_b = mu_b / sigma_b if sigma_b > 0 else 0.0
        # Hall-Mueller bias correction
        boot_sr[b] = 2.0 * sr_hat - sr_b

    # Confidence intervals
    ci_90 = (float(np.percentile(boot_sr, 5.0)), float(np.percentile(boot_sr, 95.0)))
    ci_95 = (float(np.percentile(boot_sr, 2.5)), float(np.percentile(boot_sr, 97.5)))

    # Pre-registered decision rule
    ed = _CLV_CONST["edge_decision"]
    labels = ed["labels"]
    if ci_95[0] > 0.0:
        decision = labels["genuine"]
    elif ci_90[0] > 0.0:
        decision = labels["weak"]
    else:
        decision = labels["no_edge"]

    return HMResult(
        n=n,
        sharpe_point=float(sr_hat),
        bootstrap_distribution=boot_sr,
        ci_90=ci_90,
        ci_95=ci_95,
        block_length=l_bar,
        n_bootstrap=n_bootstrap,
        bootstrap_seed=seed,
        decision=decision,
    )


def compute_clv_series(paired: pd.DataFrame) -> CLVSeries:
    """
    Compute per-bet and cumulative CLV from a paired opening/closing DataFrame.

    Expected columns:
      forecast_id, match_id, outcome_bet (str: H/D/A),
      q_open_devigged (float), q_close_devigged (float),
      d_open_decimal (float), d_close_decimal (float),
      kelly_stake_pct (float)

    Returns a :class:`CLVSeries`.
    """
    q_open = paired["q_open_devigged"].values.astype(float)
    q_close = paired["q_close_devigged"].values.astype(float)
    d_open = paired["d_open_decimal"].values.astype(float)
    d_close = paired["d_close_decimal"].values.astype(float)
    stakes = paired["kelly_stake_pct"].values.astype(float)

    # Primary: probability-space CLV
    clv = q_close / q_open - 1.0

    # Secondary: log-odds CLV
    clv_log = np.log(d_open) - np.log(d_close)

    # Cumulative
    cum_clv = np.cumsum(clv)
    cum_clv_w = np.cumsum(stakes * clv)

    return CLVSeries(
        forecast_id=list(paired.get("forecast_id", [""] * len(paired))),
        match_id=list(paired["match_id"]),
        outcome=list(paired["outcome_bet"]),
        clv=clv,
        clv_log=clv_log,
        stake=stakes,
        cumulative_clv=cum_clv,
        cumulative_clv_weighted=cum_clv_w,
    )


def load_paired_bets(
    forecast_log_root: Path,
    tournament: str = "FIFA2026",
    excluded_log: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Join opening and closing rows for M★ where a bet was placed.

    Drops gated bets (``volatility_gate_state.fired == True``) and writes
    them to ``excluded.jsonl`` (design invariant §0.1.6).

    Returns a DataFrame with one row per placed bet, columns:
      forecast_id, match_id, outcome_bet, q_open_devigged, q_close_devigged,
      d_open_decimal, d_close_decimal, kelly_stake_pct, code_sha, data_sha
    """
    forecasts_root = forecast_log_root / "evaluation" / "forecasts" / tournament

    opening_rows: list[dict[str, Any]] = []
    closing_rows: list[dict[str, Any]] = []

    for phase, target in (("opening", opening_rows), ("closing", closing_rows)):
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
                        if row.get("model_id") == "M_STAR":
                            target.append(row)
                    except json.JSONDecodeError:
                        pass

    if not opening_rows or not closing_rows:
        log.warning("load_paired_bets: no M_STAR opening or closing rows found")
        return pd.DataFrame()

    df_open = pd.DataFrame(opening_rows)
    df_close = pd.DataFrame(closing_rows)

    # Merge on match_id; forecast_id differs between open and close
    merged = df_open.merge(
        df_close,
        on="match_id",
        suffixes=("_open", "_close"),
        how="inner",
    )

    if merged.empty:
        log.warning("load_paired_bets: no paired open/close rows for M_STAR")
        return pd.DataFrame()

    # Keep only actual bets (kelly_stake_pct > 0 at open)
    stake_col = "kelly_stake_pct_open"
    gate_col = "volatility_gate_state_open"
    bets = merged[merged[stake_col] > 0].copy()
    excluded = merged[merged[stake_col] <= 0].copy()

    # Gate filtering: drop fired bets (write to excluded.jsonl)
    if gate_col in bets.columns:
        gated_mask = bets[gate_col].apply(
            lambda g: g.get("fired", False) if isinstance(g, dict) else False
        )
        newly_excluded = bets[gated_mask].copy()
        bets = bets[~gated_mask].copy()
        excluded = pd.concat([excluded, newly_excluded], ignore_index=True)

    # Emit excluded.jsonl (design §0.1.6 — no silent filtering)
    if not excluded.empty and excluded_log is not None:
        excluded_log.parent.mkdir(parents=True, exist_ok=True)
        with open(excluded_log, "w", encoding="utf-8") as fh:
            for _, row in excluded.iterrows():
                rec = {
                    "match_id": row.get("match_id"),
                    "model_id": "M_STAR",
                    "kelly_stake_pct_open": float(row.get(stake_col, 0)),
                    "exclusion_reason": (
                        "GATE_FIRED"
                        if (
                            isinstance(row.get(gate_col), dict)
                            and row.get(gate_col, {}).get("fired", False)
                        )
                        else "ZERO_STAKE"
                    ),
                }
                fh.write(json.dumps(rec) + "\n")
        log.info("load_paired_bets: excluded bets written", count=len(excluded), path=str(excluded_log))

    if bets.empty:
        log.warning("load_paired_bets: no M_STAR bets pass gate and stake filter")
        return pd.DataFrame()

    # Extract needed fields for CLV computation
    # q_market_devigged_{open|close} contains {H, D, A} dict
    # We need the probability for the specific outcome bet on
    def _get_q(row: pd.Series, col: str, outcome: str) -> float:
        val = row.get(col, {})
        if isinstance(val, dict):
            return float(val.get(outcome, np.nan))
        return np.nan

    def _get_odds(row: pd.Series, col: str, outcome: str) -> float:
        val = row.get(col, {})
        if isinstance(val, dict):
            return float(val.get(outcome, np.nan))
        return np.nan

    # Determine outcome bet: from edge dict (highest edge outcome)
    def _outcome_bet(row: pd.Series) -> str:
        edge = row.get("edge_open", {})
        if not isinstance(edge, dict):
            return "H"
        outcome_key = "outcome"
        if outcome_key in edge:
            return str(edge[outcome_key])
        # Fallback: highest absolute edge value
        e_vals = {k: abs(v) for k, v in edge.items() if k in ("H", "D", "A")}
        if e_vals:
            return max(e_vals, key=lambda x: e_vals[x])
        return "H"

    bets["outcome_bet"] = bets.apply(_outcome_bet, axis=1)

    result_rows = []
    for _, row in bets.iterrows():
        ob = row["outcome_bet"]
        q_open = _get_q(row, "q_market_devigged_open", ob)
        q_close = _get_q(row, "q_market_devigged_close", ob)
        d_open = _get_odds(row, "q_market_raw_open", ob)
        d_close = _get_odds(row, "q_market_raw_close", ob)

        if any(np.isnan([q_open, q_close])):
            continue

        # Use decimal odds fallback from 1/q if not available
        if np.isnan(d_open) and q_open > 0:
            d_open = 1.0 / q_open
        if np.isnan(d_close) and q_close > 0:
            d_close = 1.0 / q_close

        result_rows.append(
            {
                "forecast_id": row.get("forecast_id_open", ""),
                "match_id": row["match_id"],
                "outcome_bet": ob,
                "q_open_devigged": q_open,
                "q_close_devigged": q_close,
                "d_open_decimal": d_open,
                "d_close_decimal": d_close,
                "kelly_stake_pct": float(row.get(stake_col, 0.0)),
                "code_sha": str(row.get("code_sha_open", "")),
                "data_sha": str(row.get("data_sha_open", "")),
            }
        )

    if not result_rows:
        log.warning("load_paired_bets: no valid paired rows after extraction")
        return pd.DataFrame()

    return pd.DataFrame(result_rows)


def emit_clv_report(
    paired: pd.DataFrame,
    outdir: Path,
    model_id: str = "M_STAR",
    code_sha: str = "0000000",
) -> CLVReport:
    """
    Compute the full CLV report from a paired bets DataFrame and write:
      - ``clv_report.jsonl`` (machine-readable)
      - ``clv_report.tex`` (paper table fragment)

    Returns a :class:`CLVReport`.
    """
    if paired.empty:
        log.warning("emit_clv_report: empty paired bets — writing empty report")
        empty = CLVReport(
            model_id=model_id,
            n_bets=0,
            clv_mean=0.0,
            clv_std=0.0,
            z_stat=0.0,
            z_pvalue=1.0,
            z_reject=False,
            sharpe=0.0,
            hm_result=HMResult(
                n=0,
                sharpe_point=0.0,
                bootstrap_distribution=np.array([]),
                ci_90=(0.0, 0.0),
                ci_95=(0.0, 0.0),
                block_length=4,
                n_bootstrap=N_BOOTSTRAP,
                bootstrap_seed=0,
                decision="NO_EDGE",
            ),
            series=CLVSeries([], [], [], np.array([]), np.array([]), np.array([]), np.array([]), np.array([])),
            excluded_count=0,
            code_sha=code_sha,
        )
        _write_report(empty, outdir)
        return empty

    series = compute_clv_series(paired)
    z = z_score(series.clv)
    hm = hall_mueller_sharpe(series.clv, code_sha=code_sha)

    report = CLVReport(
        model_id=model_id,
        n_bets=len(series.clv),
        clv_mean=float(series.clv.mean()),
        clv_std=float(series.clv.std(ddof=1)),
        z_stat=float(z["z"]),
        z_pvalue=float(z["pvalue_one_sided"]),
        z_reject=bool(z["reject"]),
        sharpe=float(hm.sharpe_point),
        hm_result=hm,
        series=series,
        code_sha=code_sha,
    )

    _write_report(report, outdir)
    return report


def _write_report(report: CLVReport, outdir: Path) -> None:
    """Write clv_report.jsonl and clv_report.tex."""
    outdir.mkdir(parents=True, exist_ok=True)

    # JSONL
    rec = {
        "model_id": report.model_id,
        "n_bets": report.n_bets,
        "clv_mean": report.clv_mean,
        "clv_std": report.clv_std,
        "z_stat": report.z_stat,
        "z_pvalue": report.z_pvalue,
        "z_reject": report.z_reject,
        "sharpe_point": report.sharpe,
        "hm_ci_90": list(report.hm_result.ci_90),
        "hm_ci_95": list(report.hm_result.ci_95),
        "hm_decision": report.hm_result.decision,
        "block_length": report.hm_result.block_length,
        "bootstrap_seed": report.hm_result.bootstrap_seed,
        "excluded_count": report.excluded_count,
        "code_sha": report.code_sha,
    }
    jsonl_path = outdir / "clv_report.jsonl"
    with open(jsonl_path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, separators=(",", ":")) + "\n")

    # LaTeX table fragment
    tex = _clv_tex(report)
    tex_path = outdir / "clv_report.tex"
    with open(tex_path, "w", encoding="utf-8") as fh:
        fh.write(tex)

    log.success("emit_clv_report", path=str(outdir), decision=report.hm_result.decision)


def _clv_tex(report: CLVReport) -> str:
    """Produce a minimal LaTeX table row for the CLV results."""
    ci = report.hm_result.ci_95
    return (
        "% CLV Report — M★  (auto-generated, do not edit)\n"
        "\\begin{tabular}{lrrrrr}\n"
        "\\toprule\n"
        "Model & $N_\\text{bets}$ & $\\overline{\\text{CLV}}$ & "
        "$\\widehat{SR}$ & HM 95\\% CI & Decision \\\\\n"
        "\\midrule\n"
        f"M\\textsuperscript{{$\\star$}} & {report.n_bets} & "
        f"{report.clv_mean:.4f} & {report.sharpe:.4f} & "
        f"$[{ci[0]:.4f},\\ {ci[1]:.4f}]$ & "
        f"\\textsc{{{report.hm_result.decision.replace('_', ' ')}}} \\\\\n"
        "\\bottomrule\n"
        "\\end{tabular}\n"
    )
