"""
evaluation/accuracy_metrics.py
===============================
Probabilistic accuracy metrics and pairwise hypothesis tests.
Phase 7, Module 2 (pure functions — no I/O, no forecast_log dependency).

Implements:
  - Brier score (multiclass)
  - Ranked Probability Score (RPS), natural ordering H ≻ D ≻ A
  - Log-loss (cross-entropy) with pre-registered eps_min = 1e-6
  - Diebold-Mariano (1995) test with Harvey-Leybourne-Newbold (1997) correction
    and Newey-West HAC variance (Bartlett kernel, bandwidth floor(N^(1/3)))
  - Nyberg (2014) multinomial logit market efficiency test
    - LR test: chi2(2) under H_0: beta_2H = beta_2A = 0
    - Wald robustness panel with HC3 robust standard errors
    - Robustness re-fit using opening lines

All rejection thresholds and α levels are read from
``evaluation/pre_reg_constants.yaml``.  No value is hard-coded in test logic.

Named-tuple / dataclass return types:
  DMResult, NybergResult, MetricsTable
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import numpy as np
import yaml
from scipy import stats
from scipy.optimize import minimize

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Load pre-registered constants (read-only)
# ---------------------------------------------------------------------------

_YAML_PATH = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"


def _load_constants() -> dict[str, Any]:
    with open(_YAML_PATH, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


_CONST: dict[str, Any] = _load_constants()
_SR = _CONST["scoring_rules"]
_DM = _CONST["diebold_mariano"]
_NYB = _CONST["nyberg"]

LOG_LOSS_EPS: float = float(_SR["log_loss_eps_min"])
LOGIT_CLIP: float = float(_NYB["logit_clip"])

# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class DMResult:
    """Output of :func:`diebold_mariano`."""
    model_a: str
    model_b: str
    loss_type: str
    n: int
    mean_diff: float
    dm_stat: float           # raw DM statistic
    dm_star: float           # HLN-corrected (primary)
    pvalue: float            # two-sided p-value against t_{N-1}
    hln_applied: bool
    bandwidth: int
    reject_at_alpha: dict[str, bool] = field(default_factory=dict)


@dataclass
class NybergCoefficients:
    """Coefficient table for one Nyberg equation (H or A vs reference D)."""
    equation: str            # "H" or "A"
    beta_intercept: float
    beta_market: float       # beta_1k — market logit coefficient
    beta_model: float        # beta_2k — model logit coefficient (0 in restricted)
    se_intercept: float
    se_market: float
    se_model: float


@dataclass
class NybergResult:
    """Output of :func:`nyberg_test`."""
    model_id: str
    n: int
    ll_full: float
    ll_restricted: float
    lr_stat: float
    pvalue: float
    df: int = 2
    # Decision flags (read from pre_reg_constants)
    reject_primary: bool = False      # M_STAR test at alpha=0.05
    reject_bonferroni: bool = False   # shadow models at alpha=0.0125
    coefficients: list[NybergCoefficients] = field(default_factory=list)
    wald_hc3_stat: Optional[float] = None
    wald_hc3_pvalue: Optional[float] = None
    # Robustness: re-fit with opening lines
    lr_opening: Optional[float] = None
    pvalue_opening: Optional[float] = None


@dataclass
class StageMetrics:
    """Metrics for one tournament stage and one model."""
    stage: str
    n: int
    brier_mean: float
    brier_ci: tuple[float, float]
    rps_mean: float
    rps_median: float
    rps_ci: tuple[float, float]
    log_loss_mean: float
    log_loss_ci: tuple[float, float]


@dataclass
class ModelMetrics:
    """Full metrics for one model."""
    model_id: str
    n: int
    brier_mean: float
    brier_ci: tuple[float, float]
    rps_mean: float
    rps_median: float
    rps_ci: tuple[float, float]
    log_loss_mean: float
    log_loss_ci: tuple[float, float]
    by_stage: dict[str, StageMetrics] = field(default_factory=dict)


@dataclass
class MetricsTable:
    """Full results table for all models."""
    model_metrics: dict[str, ModelMetrics]
    dm_results: list[DMResult]
    nyberg_results: list[NybergResult]
    kill_criterion_tripped: bool = False
    kill_criterion_detail: str = ""


# ---------------------------------------------------------------------------
# 1.  Proper scoring rules
# ---------------------------------------------------------------------------


def brier(p: np.ndarray, y_onehot: np.ndarray) -> np.ndarray:
    """
    Multiclass Brier score per observation.

    Parameters
    ----------
    p : (N, 3) float array — forecast probabilities [H, D, A]
    y_onehot : (N, 3) int/float array — one-hot outcome indicators

    Returns
    -------
    (N,) float array, each entry in [0, 2]
    """
    return np.sum((p - y_onehot) ** 2, axis=1)


def rps(
    p: np.ndarray,
    y_onehot: np.ndarray,
    ordering: tuple[str, ...] = ("H", "D", "A"),
) -> np.ndarray:
    """
    Ranked Probability Score per observation.

    Natural ordering H ≻ D ≻ A (home win is best from home perspective).
    K = 3 outcomes.

    Parameters
    ----------
    p : (N, 3) float array
    y_onehot : (N, 3) int/float array
    ordering : tuple of 3 strings — column labels (ignored for computation,
               kept for documentation)

    Returns
    -------
    (N,) float array, each entry in [0, 1]
    """
    k = p.shape[1]
    cum_p = np.cumsum(p, axis=1)[:, :-1]  # (N, K-1)
    cum_y = np.cumsum(y_onehot, axis=1)[:, :-1]  # (N, K-1)
    return np.sum((cum_p - cum_y) ** 2, axis=1) / (k - 1)


def log_loss(
    p: np.ndarray,
    y_onehot: np.ndarray,
    eps: float = LOG_LOSS_EPS,
) -> np.ndarray:
    """
    Cross-entropy loss per observation.

    Parameters
    ----------
    p : (N, 3) float array
    y_onehot : (N, 3) int/float array
    eps : clipping floor (pre-registered: 1e-6)

    Returns
    -------
    (N,) float array (non-negative)
    """
    p_clipped = np.clip(p, eps, 1.0)
    return -np.sum(y_onehot * np.log(p_clipped), axis=1)


# ---------------------------------------------------------------------------
# 2.  Bootstrap CI for a scalar metric array
# ---------------------------------------------------------------------------


def _bootstrap_ci(
    values: np.ndarray,
    stat_fn: Any = np.mean,
    n_bootstrap: Optional[int] = None,
    ci_level: float = 0.95,
    rng_seed: int = 42,
) -> tuple[float, float]:
    """Percentile bootstrap CI for stat_fn(values)."""
    if n_bootstrap is None:
        n_bootstrap = int(_CONST["accuracy_bootstrap"]["n_bootstrap"])
    rng = np.random.default_rng(rng_seed)
    n = len(values)
    boot = np.array(
        [stat_fn(rng.choice(values, size=n, replace=True)) for _ in range(n_bootstrap)]
    )
    alpha = (1 - ci_level) / 2
    return (float(np.percentile(boot, 100 * alpha)), float(np.percentile(boot, 100 * (1 - alpha))))


# ---------------------------------------------------------------------------
# 3.  Diebold-Mariano with HLN correction
# ---------------------------------------------------------------------------


def _newey_west_var_of_mean(d: np.ndarray, h: int) -> float:
    """
    Newey-West (1987) HAC long-run variance of mean(d) with Bartlett kernel.

    Returns Var(mean(d)) = sigma_LR^2 / n.

    sigma_LR^2 = gamma_0 + 2 * sum_{j=1}^{h} (1 - j/(h+1)) * gamma_j
    gamma_j    = (1/n) * sum_{t=j}^{n-1} (d[t] - d_bar)(d[t-j] - d_bar)
    """
    n = len(d)
    d_c = d - d.mean()
    gamma_0 = float(np.dot(d_c, d_c)) / n
    sigma2_lr = gamma_0
    for j in range(1, h + 1):
        w = 1.0 - j / (h + 1)
        gamma_j = float(np.dot(d_c[j:], d_c[:-j])) / n
        sigma2_lr += 2.0 * w * gamma_j
    sigma2_lr = max(sigma2_lr, 1e-300)  # numerical floor
    return sigma2_lr / n


def diebold_mariano(
    loss_a: np.ndarray,
    loss_b: np.ndarray,
    model_a: str = "A",
    model_b: str = "B",
    loss_type: str = "brier",
    hln_correction: bool = True,
) -> DMResult:
    """
    Diebold-Mariano (1995) test with Harvey-Leybourne-Newbold (1997) correction.

    H_0: E[loss_a - loss_b] = 0

    Test statistic::

        DM  = mean(d) / sqrt(V_HAC(mean(d)))
        DM* = DM * sqrt((N + 1 - 2h + h(h-1)/N) / N)   [HLN correction]

    Compare DM* to t_{N-1}.

    Parameters
    ----------
    loss_a, loss_b : per-observation loss arrays of equal length
    hln_correction : apply Harvey-Leybourne-Newbold small-sample correction
    """
    loss_a = np.asarray(loss_a, dtype=float)
    loss_b = np.asarray(loss_b, dtype=float)
    if len(loss_a) != len(loss_b):
        raise ValueError(f"loss_a length {len(loss_a)} ≠ loss_b length {len(loss_b)}")

    n = len(loss_a)
    d = loss_a - loss_b
    d_bar = d.mean()
    h = max(1, int(np.floor(n ** (1.0 / 3.0))))

    var_mean = _newey_west_var_of_mean(d, h)
    dm = d_bar / np.sqrt(var_mean)

    if hln_correction:
        hln_factor = np.sqrt((n + 1 - 2 * h + h * (h - 1) / n) / n)
        dm_star = dm * hln_factor
    else:
        dm_star = dm
        hln_factor = 1.0  # noqa: F841

    # Compare to t_{N-1}
    pvalue = float(2.0 * stats.t.sf(abs(dm_star), df=n - 1))

    # Read rejection thresholds from pre_reg_constants
    comparisons = _DM["comparisons"]
    reject: dict[str, bool] = {}
    # M★ vs M0
    c = comparisons["mstar_vs_m0"]
    crit = float(stats.t.ppf(1 - c["alpha"] / 2, df=n - 1))
    reject["mstar_vs_m0"] = bool(abs(dm_star) > crit)
    # M★ vs Market
    c = comparisons["mstar_vs_market"]
    crit = float(stats.t.ppf(1 - c["alpha"] / 2, df=n - 1))
    reject["mstar_vs_market"] = bool(abs(dm_star) > crit)
    # All other pairwise (Bonferroni α=0.005)
    c = comparisons["all_other_pairwise"]
    crit = float(stats.t.ppf(1 - c["alpha"] / 2, df=n - 1))
    reject["all_other_pairwise"] = bool(abs(dm_star) > crit)

    return DMResult(
        model_a=model_a,
        model_b=model_b,
        loss_type=loss_type,
        n=n,
        mean_diff=float(d_bar),
        dm_stat=float(dm),
        dm_star=float(dm_star),
        pvalue=pvalue,
        hln_applied=hln_correction,
        bandwidth=h,
        reject_at_alpha=reject,
    )


# ---------------------------------------------------------------------------
# 4.  Nyberg (2014) multinomial logit market efficiency test
# ---------------------------------------------------------------------------


def _safe_logit(x: np.ndarray, clip: float = LOGIT_CLIP) -> np.ndarray:
    """Logit function with probability clipping to avoid ±inf."""
    x = np.clip(x, clip, 1.0 - clip)
    return np.log(x / (1.0 - x))


def _mnlogit_nll(
    params: np.ndarray,
    x_h: np.ndarray,
    x_a: np.ndarray,
    y_encoded: np.ndarray,
) -> float:
    """
    Negative log-likelihood for the Nyberg multinomial logit.

    Outcome encoding: 0=H, 1=D (reference), 2=A

    params layout:
      full model   — [β_0H, β_1H, β_2H, β_0A, β_1A, β_2A]
      restricted   — [β_0H, β_1H, β_0A, β_1A]
    """
    k_h = x_h.shape[1]
    beta_h = params[:k_h]
    beta_a = params[k_h:]
    u_h = x_h @ beta_h
    u_a = x_a @ beta_a
    log_denom = np.log(1.0 + np.exp(u_h) + np.exp(u_a))
    ll = np.where(
        y_encoded == 0,
        u_h - log_denom,
        np.where(y_encoded == 2, u_a - log_denom, -log_denom),
    )
    return -float(np.sum(ll))


def _fit_mnlogit(
    x_h: np.ndarray,
    x_a: np.ndarray,
    y_encoded: np.ndarray,
    n_params: int,
) -> tuple[np.ndarray, float]:
    """Minimize NLL; return (params, -NLL = log-likelihood)."""
    x0 = np.zeros(n_params)
    result = minimize(
        _mnlogit_nll,
        x0,
        args=(x_h, x_a, y_encoded),
        method="L-BFGS-B",
        options={"maxiter": 2000, "ftol": 1e-12, "gtol": 1e-8},
    )
    ll = -result.fun
    return result.x, float(ll)


def _hessian_numerical(
    params: np.ndarray,
    x_h: np.ndarray,
    x_a: np.ndarray,
    y_encoded: np.ndarray,
    eps: float = 1e-5,
) -> np.ndarray:
    """Finite-difference Hessian of the NLL (for sandwich SE computation)."""
    k = len(params)
    H = np.zeros((k, k))
    for i in range(k):
        for j in range(i, k):
            ei = np.zeros(k)
            ej = np.zeros(k)
            ei[i] = eps
            ej[j] = eps
            f_pp = _mnlogit_nll(params + ei + ej, x_h, x_a, y_encoded)
            f_pm = _mnlogit_nll(params + ei - ej, x_h, x_a, y_encoded)
            f_mp = _mnlogit_nll(params - ei + ej, x_h, x_a, y_encoded)
            f_mm = _mnlogit_nll(params - ei - ej, x_h, x_a, y_encoded)
            H[i, j] = H[j, i] = (f_pp - f_pm - f_mp + f_mm) / (4 * eps * eps)
    return H


def _score_matrix(
    params: np.ndarray,
    x_h: np.ndarray,
    x_a: np.ndarray,
    y_encoded: np.ndarray,
    eps: float = 1e-6,
) -> np.ndarray:
    """Per-observation score vectors (N, k) via finite differences."""
    n = len(y_encoded)
    k = len(params)
    S = np.zeros((n, k))
    for i in range(k):
        e = np.zeros(k)
        e[i] = eps
        nll_p = np.array(
            [
                _mnlogit_nll(params + e, x_h[j : j + 1], x_a[j : j + 1], y_encoded[j : j + 1])
                for j in range(n)
            ]
        )
        nll_m = np.array(
            [
                _mnlogit_nll(params - e, x_h[j : j + 1], x_a[j : j + 1], y_encoded[j : j + 1])
                for j in range(n)
            ]
        )
        S[:, i] = -(nll_p - nll_m) / (2 * eps)  # gradient of log-likelihood (positive)
    return S


def _hc3_sandwich(
    params: np.ndarray,
    x_h: np.ndarray,
    x_a: np.ndarray,
    y_encoded: np.ndarray,
) -> np.ndarray:
    """
    HC3 sandwich covariance matrix for the Nyberg MNLogit parameters.

    V_HC3 = H^{-1} * (sum_i h_ii^{-2} * s_i s_i') * H^{-1}

    where H is the Hessian, s_i is the per-observation score, and
    h_ii is the i-th diagonal of the hat matrix H^{-1} * outer(s_i).
    """
    n = len(y_encoded)
    hess = _hessian_numerical(params, x_h, x_a, y_encoded)
    try:
        hess_inv = np.linalg.inv(hess)
    except np.linalg.LinAlgError:
        hess_inv = np.linalg.pinv(hess)

    S = _score_matrix(params, x_h, x_a, y_encoded)
    # Hat-matrix diagonal h_ii = s_i' H^{-1} s_i
    h_diag = np.array([float(S[i] @ hess_inv @ S[i]) for i in range(n)])
    h_diag = np.maximum(h_diag, 1e-10)  # numerical stability

    meat = np.zeros_like(hess)
    for i in range(n):
        s = S[i].reshape(-1, 1)
        meat += (1.0 / h_diag[i] ** 2) * (s @ s.T)
    return hess_inv @ meat @ hess_inv


def nyberg_test(
    p_model: np.ndarray,
    q_devigged_close: np.ndarray,
    y: np.ndarray,
    model_id: str = "unknown",
    p_model_open: Optional[np.ndarray] = None,
    q_devigged_open: Optional[np.ndarray] = None,
) -> NybergResult:
    """
    Nyberg (2014) multinomial logit market efficiency test.

    Tests H_0: the market (closing line) incorporates all information in
    ``p_model``.  Rejection implies exploitable information beyond market prices.

    Parameters
    ----------
    p_model : (N, 3) array — model probabilities [H, D, A]
    q_devigged_close : (N, 3) array — de-vigged closing probs [H, D, A]
    y : (N,) array of ints — outcome 0=H, 1=D, 2=A
    model_id : for labelling output
    p_model_open, q_devigged_open : optional (N, 3) arrays for opening-line
        robustness re-fit (appended to result)

    Specification::

        log(Pr(Y=k)/Pr(Y=D)) = β_0k + β_1k*logit(q_close_k) + β_2k*logit(p_k)
        for k ∈ {H, A}

    H_0: β_2H = β_2A = 0  →  LR ~ chi2(2)
    """
    n = len(y)
    y_enc = np.asarray(y, dtype=int)  # 0=H,1=D,2=A

    # Logit-transformed probabilities
    lq_h = _safe_logit(q_devigged_close[:, 0])
    lq_a = _safe_logit(q_devigged_close[:, 2])
    lp_h = _safe_logit(p_model[:, 0])
    lp_a = _safe_logit(p_model[:, 2])

    ones = np.ones(n)

    # Full model design matrices per equation
    x_h_full = np.column_stack([ones, lq_h, lp_h])
    x_a_full = np.column_stack([ones, lq_a, lp_a])

    # Restricted design matrices (H_0: β_2H = β_2A = 0)
    x_h_restr = np.column_stack([ones, lq_h])
    x_a_restr = np.column_stack([ones, lq_a])

    params_full, ll_full = _fit_mnlogit(x_h_full, x_a_full, y_enc, n_params=6)
    params_restr, ll_restr = _fit_mnlogit(x_h_restr, x_a_restr, y_enc, n_params=4)

    lr = 2.0 * (ll_full - ll_restr)
    pval = float(stats.chi2.sf(lr, df=2))

    # Read rejection thresholds from pre_reg_constants
    nyb_c = _NYB["comparisons"]
    reject_primary = bool(lr > nyb_c["mstar_primary"]["critical_value"])
    reject_bonferroni = bool(lr > nyb_c["shadow_bonferroni"]["critical_value"])

    # Coefficient table
    coefs: list[NybergCoefficients] = []
    try:
        V_hc3 = _hc3_sandwich(params_full, x_h_full, x_a_full, y_enc)
        se_full = np.sqrt(np.maximum(np.diag(V_hc3), 0.0))
    except Exception as exc:  # noqa: BLE001
        log.warning("HC3 sandwich computation failed", error=str(exc))
        se_full = np.full(6, np.nan)

    coefs.append(
        NybergCoefficients(
            equation="H",
            beta_intercept=float(params_full[0]),
            beta_market=float(params_full[1]),
            beta_model=float(params_full[2]),
            se_intercept=float(se_full[0]),
            se_market=float(se_full[1]),
            se_model=float(se_full[2]),
        )
    )
    coefs.append(
        NybergCoefficients(
            equation="A",
            beta_intercept=float(params_full[3]),
            beta_market=float(params_full[4]),
            beta_model=float(params_full[5]),
            se_intercept=float(se_full[3]),
            se_market=float(se_full[4]),
            se_model=float(se_full[5]),
        )
    )

    # Wald test with HC3 SEs: H_0 beta_2H = beta_2A = 0
    # Wald = theta' (C V_hc3 C')^{-1} theta, C picks out params[2] and params[5]
    wald_stat = wald_pval = None
    try:
        C = np.zeros((2, 6))
        C[0, 2] = 1.0
        C[1, 5] = 1.0
        theta = np.array([params_full[2], params_full[5]])
        V_c = C @ V_hc3 @ C.T
        wald_stat = float(theta @ np.linalg.inv(V_c) @ theta)
        wald_pval = float(stats.chi2.sf(wald_stat, df=2))
    except Exception as exc:  # noqa: BLE001
        log.warning("Wald test computation failed", error=str(exc))

    # Robustness: opening lines re-fit
    lr_open = pval_open = None
    if p_model_open is not None and q_devigged_open is not None:
        lqo_h = _safe_logit(q_devigged_open[:, 0])
        lqo_a = _safe_logit(q_devigged_open[:, 2])
        lpo_h = _safe_logit(p_model_open[:, 0])
        lpo_a = _safe_logit(p_model_open[:, 2])
        x_h_full_o = np.column_stack([ones, lqo_h, lpo_h])
        x_a_full_o = np.column_stack([ones, lqo_a, lpo_a])
        x_h_restr_o = np.column_stack([ones, lqo_h])
        x_a_restr_o = np.column_stack([ones, lqo_a])
        _, ll_f_o = _fit_mnlogit(x_h_full_o, x_a_full_o, y_enc, n_params=6)
        _, ll_r_o = _fit_mnlogit(x_h_restr_o, x_a_restr_o, y_enc, n_params=4)
        lr_open = float(2.0 * (ll_f_o - ll_r_o))
        pval_open = float(stats.chi2.sf(lr_open, df=2))

    return NybergResult(
        model_id=model_id,
        n=n,
        ll_full=float(ll_full),
        ll_restricted=float(ll_restr),
        lr_stat=float(lr),
        pvalue=pval,
        df=2,
        reject_primary=reject_primary,
        reject_bonferroni=reject_bonferroni,
        coefficients=coefs,
        wald_hc3_stat=wald_stat,
        wald_hc3_pvalue=wald_pval,
        lr_opening=lr_open,
        pvalue_opening=pval_open,
    )


# ---------------------------------------------------------------------------
# 5.  Kill criterion check
# ---------------------------------------------------------------------------


def check_kill_criterion(
    ll_mstar: np.ndarray,
    ll_m0: np.ndarray,
) -> tuple[bool, str]:
    """
    Return (tripped: bool, detail: str).

    Tripped if mean(ll_mstar) > mean(ll_m0) + 2 * SE_of_difference.
    """
    d = ll_mstar - ll_m0
    n = len(d)
    d_bar = d.mean()
    se = d.std(ddof=1) / np.sqrt(n)
    threshold_se = float(_CONST["kill_criterion"]["threshold_standard_errors"])
    tripped = bool(d_bar > threshold_se * se)
    detail = (
        f"mean_diff={d_bar:.6f}, se={se:.6f}, "
        f"threshold={threshold_se}×SE={threshold_se*se:.6f}, "
        f"tripped={tripped}"
    )
    return tripped, detail


# ---------------------------------------------------------------------------
# 6.  Full pipeline: compute_all_metrics
# ---------------------------------------------------------------------------


def compute_all_metrics(
    forecast_log_root: "Path",
    tournament: str = "FIFA2026",
) -> MetricsTable:
    """
    Read the forecast log and produce the full 6-model × 5-stage × 3-metric table
    plus DM and Nyberg panels.

    Requires that ``forecast_log_root`` contains a materialized ``index.parquet``
    (from :func:`forecast_log.rebuild_index`) *and* that outcomes have been
    joined in externally (via an ``outcome`` column: 0=H, 1=D, 2=A).

    If the index does not exist or outcomes are not available, returns an empty
    MetricsTable (the dashboard will emit placeholders).
    """
    import pandas as pd

    index_path = forecast_log_root / "evaluation" / "forecasts" / "index.parquet"
    if not index_path.exists():
        log.warning("compute_all_metrics: index.parquet not found", path=str(index_path))
        return MetricsTable(model_metrics={}, dm_results=[], nyberg_results=[])

    df = pd.read_parquet(index_path, engine="pyarrow")

    # Require outcome column to be present
    if "outcome" not in df.columns:
        log.warning(
            "compute_all_metrics: 'outcome' column missing — outcomes not yet logged"
        )
        return MetricsTable(model_metrics={}, dm_results=[], nyberg_results=[])

    # Only use closing-phase rows with outcomes
    df = df[df["market_phase"] == "closing"].dropna(subset=["outcome"])
    if df.empty:
        log.warning("compute_all_metrics: no closing rows with outcomes")
        return MetricsTable(model_metrics={}, dm_results=[], nyberg_results=[])

    model_metrics: dict[str, ModelMetrics] = {}
    all_losses: dict[str, dict[str, np.ndarray]] = {}  # model → {brier, ll, rps}

    valid_models = _CONST["models"]["valid_model_ids"]

    for model_id in valid_models:
        mdf = df[df["model_id"] == model_id]
        if mdf.empty:
            continue

        # Extract probability arrays from nested p_model column
        try:
            p = np.array([[r["H"], r["D"], r["A"]] for r in mdf["p_model"]], dtype=float)
        except Exception:
            continue

        outcomes = mdf["outcome"].astype(int).values
        y_oh = np.eye(3, dtype=float)[outcomes]

        bs = brier(p, y_oh)
        rl = rps(p, y_oh)
        ll = log_loss(p, y_oh)

        all_losses[model_id] = {"brier": bs, "rps": rl, "log_loss": ll}

        bs_ci = _bootstrap_ci(bs)
        rl_ci = _bootstrap_ci(rl)
        ll_ci = _bootstrap_ci(ll)

        mm = ModelMetrics(
            model_id=model_id,
            n=len(mdf),
            brier_mean=float(bs.mean()),
            brier_ci=bs_ci,
            rps_mean=float(rl.mean()),
            rps_median=float(np.median(rl)),
            rps_ci=rl_ci,
            log_loss_mean=float(ll.mean()),
            log_loss_ci=ll_ci,
        )

        # Stage breakdown
        if "stage" in mdf.columns:
            stage_map = {
                "Group Stage": "group",
                "Round of 16": "r16",
                "Quarter-final": "qf",
                "Semi-final": "sf",
                "Final": "final",
            }
            for stage_label, stage_key in stage_map.items():
                sdf_idx = mdf["stage"] == stage_label
                if sdf_idx.sum() < 2:
                    continue
                s_bs = bs[sdf_idx.values]
                s_rl = rl[sdf_idx.values]
                s_ll = ll[sdf_idx.values]
                mm.by_stage[stage_key] = StageMetrics(
                    stage=stage_key,
                    n=int(sdf_idx.sum()),
                    brier_mean=float(s_bs.mean()),
                    brier_ci=_bootstrap_ci(s_bs),
                    rps_mean=float(s_rl.mean()),
                    rps_median=float(np.median(s_rl)),
                    rps_ci=_bootstrap_ci(s_rl),
                    log_loss_mean=float(s_ll.mean()),
                    log_loss_ci=_bootstrap_ci(s_ll),
                )

        model_metrics[model_id] = mm

    # DM tests
    dm_results: list[DMResult] = []
    if "M_STAR" in all_losses and "M0" in all_losses:
        for loss_key in ("brier", "log_loss"):
            dm_results.append(
                diebold_mariano(
                    all_losses["M_STAR"][loss_key],
                    all_losses["M0"][loss_key],
                    model_a="M_STAR",
                    model_b="M0",
                    loss_type=loss_key,
                )
            )

    # Nyberg tests
    nyberg_results: list[NybergResult] = []
    if "q_market_devigged_close" in df.columns:
        for model_id in valid_models:
            mdf = df[df["model_id"] == model_id]
            if mdf.empty:
                continue
            try:
                p = np.array([[r["H"], r["D"], r["A"]] for r in mdf["p_model"]], dtype=float)
                q_close = np.array(
                    [
                        [r["H"], r["D"], r["A"]]
                        for r in mdf["q_market_devigged_close"]
                    ],
                    dtype=float,
                )
                outcomes = mdf["outcome"].astype(int).values
                nyberg_results.append(nyberg_test(p, q_close, outcomes, model_id=model_id))
            except Exception as exc:  # noqa: BLE001
                log.warning("Nyberg test failed", model=model_id, error=str(exc))

    # Kill criterion check
    kill_tripped = False
    kill_detail = ""
    if "M_STAR" in all_losses and "M0" in all_losses:
        kill_tripped, kill_detail = check_kill_criterion(
            all_losses["M_STAR"]["log_loss"], all_losses["M0"]["log_loss"]
        )

    return MetricsTable(
        model_metrics=model_metrics,
        dm_results=dm_results,
        nyberg_results=nyberg_results,
        kill_criterion_tripped=kill_tripped,
        kill_criterion_detail=kill_detail,
    )
