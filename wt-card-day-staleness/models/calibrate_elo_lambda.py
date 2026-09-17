"""
models/calibrate_elo_lambda.py
================================
Phase 3 — Elo Δ → λ Calibration

Fits the free parameters (c, μ) of the Elo-to-expected-goals mapping against
historical match outcomes 2010–2022 using walk-forward cross-validation.

Mathematical design: Phase3_Elo_Calibration_Design.md §2–§3.

LOCKED for v1.0 (do not re-optimise here):
  λ₃ = 0.10   (Bivariate Poisson covariance)
  ρ  = −0.05  (Dixon-Coles correction)

CALIBRATED here:
  c   — Elo-to-log-λ scaling factor
  μ   — baseline per-team expected goals at Elo parity
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

import numpy as np
import pandas as pd
import yaml
from scipy.optimize import minimize

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

_yaml_path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
with open(_yaml_path) as _fh:
    _pre_reg = yaml.safe_load(_fh)

_LOCKED_LAM3 = float(_pre_reg["match_model"]["lambda_3"])
_LOCKED_RHO  = float(_pre_reg["match_model"]["rho"])

from utils.logger import get_logger
from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from ingestion.data_loader import DataLoader
from models.elo_calculator import run_walk_forward

log = get_logger(__name__)

# ── Output paths ──────────────────────────────────────────────────────────────
CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
PARAMS_JSON     = CALIBRATION_DIR / "elo_lambda_params.json"
DIAG_PARQUET    = CALIBRATION_DIR / "elo_lambda_diagnostics.parquet"

# ── Calibration constants ─────────────────────────────────────────────────────
BURN_IN_END      = pd.Timestamp("2012-12-31", tz="UTC")
CALIB_END        = pd.Timestamp("2022-12-18", tz="UTC")
MAX_GOALS        = 10
_GRID_C          = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]
_GRID_MU         = [1.15, 1.25, 1.35, 1.45, 1.55]

# Walk-forward CV folds: (eval_start, eval_end)
_FOLDS: list[tuple[str, str]] = [
    ("2014-01-01", "2014-07-13"),   # WC 2014
    ("2016-01-01", "2016-07-10"),   # Euro/Copa 2016 (may be empty in data)
    ("2018-01-01", "2018-07-15"),   # WC 2018
    ("2021-01-01", "2021-07-11"),   # Euro 2020 + Copa 2021 (played 2021)
    ("2022-01-01", "2022-12-18"),   # WC 2022
]


# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class LambdaParams:
    c:    float
    mu:   float
    lam3: float = _LOCKED_LAM3    # LOCKED v1.0 — from pre_reg_constants.yaml
    rho:  float = _LOCKED_RHO     # LOCKED v1.0 — from pre_reg_constants.yaml


# ── Mapping & match model ─────────────────────────────────────────────────────

def elo_to_lambdas(
    R_home: float,
    R_away: float,
    H: float,
    params: LambdaParams,
) -> tuple[float, float]:
    """
    Convert pre-match Elo ratings to expected goals.

    Δ = (R_home + H − R_away) / 400
    λ_home = μ · exp( c · Δ)
    λ_away = μ · exp(−c · Δ)
    """
    delta = (R_home + H - R_away) / 400.0
    lam_home = params.mu * math.exp(params.c * delta)
    lam_away = params.mu * math.exp(-params.c * delta)
    return lam_home, lam_away


def bivariate_poisson_pmf(
    x: int,
    y: int,
    lam1: float,
    lam2: float,
    lam3: float,
) -> float:
    """
    Karlis-Ntzoufras Bivariate Poisson PMF.

    P(X=x, Y=y) = exp(−(λ1+λ2+λ3)) · (λ1^x/x!) · (λ2^y/y!)
                  · Σ_{k=0..min(x,y)} C(x,k)·C(y,k)·k!·(λ3/(λ1·λ2))^k
    """
    log_base = (
        -(lam1 + lam2 + lam3)
        + x * math.log(lam1) - math.lgamma(x + 1)
        + y * math.log(lam2) - math.lgamma(y + 1)
    )
    ratio = lam3 / (lam1 * lam2)
    inner = 0.0
    for k in range(min(x, y) + 1):
        inner += (
            math.comb(x, k)
            * math.comb(y, k)
            * math.factorial(k)
            * (ratio ** k)
        )
    return math.exp(log_base) * inner


def dixon_coles_tau(
    x: int,
    y: int,
    lam_home: float,
    lam_away: float,
    rho: float,
) -> float:
    """
    Dixon-Coles low-score correction factor.

    τ(0,0) = 1 − λ_home·λ_away·ρ
    τ(1,0) = 1 + λ_away·ρ
    τ(0,1) = 1 + λ_home·ρ
    τ(1,1) = 1 − ρ
    τ(x,y) = 1  otherwise
    """
    if x == 0 and y == 0:
        return 1.0 - lam_home * lam_away * rho
    if x == 1 and y == 0:
        return 1.0 + lam_away * rho
    if x == 0 and y == 1:
        return 1.0 + lam_home * rho
    if x == 1 and y == 1:
        return 1.0 - rho
    return 1.0


def outcome_probabilities(
    lam_home: float,
    lam_away: float,
    params: LambdaParams,
) -> tuple[float, float, float]:
    """
    Compute (P_home_win, P_draw, P_away_win) via Bivariate Poisson +
    Dixon-Coles. Sums to 1.
    """
    lam3 = params.lam3
    rho  = params.rho

    # Ensure component lambdas are positive (lam3 subtraction)
    lam1 = max(lam_home - lam3, 1e-6)
    lam2 = max(lam_away - lam3, 1e-6)

    grid = np.zeros((MAX_GOALS + 1, MAX_GOALS + 1))
    for x in range(MAX_GOALS + 1):
        for y in range(MAX_GOALS + 1):
            p   = bivariate_poisson_pmf(x, y, lam1, lam2, lam3)
            tau = dixon_coles_tau(x, y, lam_home, lam_away, rho)
            grid[x, y] = p * tau

    total = grid.sum()
    if total > 0:
        grid /= total

    ix = np.arange(MAX_GOALS + 1)
    xx, yy = np.meshgrid(ix, ix, indexing="ij")
    p_H = float(grid[xx > yy].sum())
    p_D = float(grid[xx == yy].sum())
    p_A = float(grid[xx < yy].sum())
    return p_H, p_D, p_A


# ── Loss computation ──────────────────────────────────────────────────────────

def _match_log_loss(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    eps = 1e-15
    if observed == "H":
        return -math.log(max(p_H, eps))
    if observed == "D":
        return -math.log(max(p_D, eps))
    return -math.log(max(p_A, eps))


def _match_brier(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    i_H = 1.0 if observed == "H" else 0.0
    i_D = 1.0 if observed == "D" else 0.0
    i_A = 1.0 if observed == "A" else 0.0
    return (p_H - i_H) ** 2 + (p_D - i_D) ** 2 + (p_A - i_A) ** 2


def _cv_loss(
    c: float,
    mu: float,
    rating_df: pd.DataFrame,
    folds: list[tuple[pd.Timestamp, pd.Timestamp]],
    lam3: float = _LOCKED_LAM3,
    rho: float  = _LOCKED_RHO,
) -> float:
    """
    Weighted mean log-loss across all non-empty CV folds.
    rating_df must have: date, R_home_pre, R_away_pre, H_used, observed
    and be filtered to the calibration window only.
    """
    params = LambdaParams(c=c, mu=mu, lam3=lam3, rho=rho)

    total_loss  = 0.0
    total_count = 0

    for eval_start, eval_end in folds:
        mask = (rating_df["date"] >= eval_start) & (rating_df["date"] <= eval_end)
        fold_df = rating_df[mask]
        if fold_df.empty:
            continue

        fold_loss = 0.0
        for row in fold_df.itertuples(index=False):
            lam_h, lam_a = elo_to_lambdas(
                row.R_home_pre, row.R_away_pre, row.H_used, params
            )
            p_H, p_D, p_A = outcome_probabilities(lam_h, lam_a, params)
            fold_loss += _match_log_loss(p_H, p_D, p_A, row.observed)

        total_loss  += fold_loss
        total_count += len(fold_df)

    if total_count == 0:
        return float("inf")
    return total_loss / total_count


# ── Calibration ───────────────────────────────────────────────────────────────

def calibrate(
    rating_snapshots_df: pd.DataFrame,
    params_init: LambdaParams | None = None,
) -> LambdaParams:
    """
    Walk-forward CV over calibration window, minimise mean log-loss.

    Stage A: coarse 9×5 grid search.
    Stage B: Nelder-Mead local refinement from best seed.

    Returns best (c, μ) as LambdaParams.
    """
    log.stage("Phase 3 — Calibration: preparing data")

    df = rating_snapshots_df.copy()
    df["date"] = pd.to_datetime(df["date"], utc=True)

    # Derive observed outcome from scores
    df["observed"] = np.where(
        df["score_home"] > df["score_away"], "H",
        np.where(df["score_home"] == df["score_away"], "D", "A"),
    )

    # Calibration window only (burn-in excluded)
    calib_df = df[
        (df["date"] > BURN_IN_END) & (df["date"] <= CALIB_END)
    ].copy()
    log.info("Calibration matches", count=len(calib_df))

    # Parse CV fold boundaries
    folds: list[tuple[pd.Timestamp, pd.Timestamp]] = [
        (
            pd.Timestamp(s, tz="UTC"),
            pd.Timestamp(e, tz="UTC"),
        )
        for s, e in _FOLDS
    ]

    # ── Stage A: grid search ──────────────────────────────────────────────────
    log.stage("Stage A — Grid search (45 evaluations)")
    best_loss = float("inf")
    best_c, best_mu = 0.25, 1.35  # reasonable fallback seed

    for c in _GRID_C:
        for mu in _GRID_MU:
            loss = _cv_loss(c, mu, calib_df, folds)
            log.debug("Grid eval", c=c, mu=mu, loss=round(loss, 6))
            if loss < best_loss:
                best_loss = loss
                best_c, best_mu = c, mu

    log.info(
        "Stage A complete",
        best_c=best_c,
        best_mu=best_mu,
        best_loss=round(best_loss, 6),
    )

    # ── Stage B: Nelder-Mead refinement ──────────────────────────────────────
    log.stage("Stage B — Nelder-Mead refinement")

    C_LB, C_UB   = 0.05, 0.80
    MU_LB, MU_UB = 0.80, 2.00
    PENALTY = 1e6

    def objective(x: np.ndarray) -> float:
        c_val, mu_val = float(x[0]), float(x[1])
        pen = 0.0
        if c_val < C_LB or c_val > C_UB:
            pen += PENALTY * max(C_LB - c_val, c_val - C_UB) ** 2
        if mu_val < MU_LB or mu_val > MU_UB:
            pen += PENALTY * max(MU_LB - mu_val, mu_val - MU_UB) ** 2
        return _cv_loss(c_val, mu_val, calib_df, folds) + pen

    seed = params_init or LambdaParams(c=best_c, mu=best_mu)
    result = minimize(
        objective,
        x0=[seed.c, seed.mu],
        method="Nelder-Mead",
        options={"xatol": 1e-3, "fatol": 1e-5, "maxiter": 2000},
    )

    c_star  = float(np.clip(result.x[0], C_LB, C_UB))
    mu_star = float(np.clip(result.x[1], MU_LB, MU_UB))
    final_loss = _cv_loss(c_star, mu_star, calib_df, folds)

    log.info(
        "Stage B complete",
        c_star=round(c_star, 4),
        mu_star=round(mu_star, 4),
        final_cv_loss=round(final_loss, 6),
        nelder_mead_success=result.success,
    )

    return LambdaParams(c=c_star, mu=mu_star)


# ── Sanity checks ─────────────────────────────────────────────────────────────

def run_sanity_checks(
    diag_df: pd.DataFrame,
    params: LambdaParams,
    rating_df: pd.DataFrame,
    folds: list[tuple[pd.Timestamp, pd.Timestamp]],
) -> dict:
    """
    Five sanity checks from Design Doc §3.5.
    Returns dict of check results. Logs warnings on failure; does not raise.
    """
    results: dict = {}

    # ── Check 1: Reliability (calibration curve by decile) ───────────────────
    log.stage("Sanity check 1 — Reliability")
    diag_df = diag_df.copy()
    diag_df["decile"] = pd.qcut(diag_df["p_H"], q=10, labels=False, duplicates="drop")
    bin_stats = diag_df.groupby("decile").agg(
        predicted=("p_H", "mean"),
        empirical=("is_home_win", "mean"),
        count=("p_H", "count"),
    )
    max_drift = float((bin_stats["predicted"] - bin_stats["empirical"]).abs().max())
    results["reliability_max_drift_pp"] = round(max_drift * 100, 2)
    if max_drift > 0.03:
        log.warning(
            "Reliability: decile drift > 3pp",
            max_drift_pp=round(max_drift * 100, 2),
        )
    else:
        log.info("Check 1 PASS — reliability", max_drift_pp=round(max_drift * 100, 2))

    # ── Check 2: Calibration slope ───────────────────────────────────────────
    log.stage("Sanity check 2 — Calibration slope")
    x = diag_df["p_H"].values
    y = diag_df["is_home_win"].values.astype(float)
    # OLS slope: cov(x,y) / var(x)
    xm = x - x.mean()
    slope = float(np.dot(xm, y - y.mean()) / (np.dot(xm, xm) + 1e-12))
    results["calibration_slope"] = round(slope, 4)
    if not (0.85 <= slope <= 1.15):
        log.warning("Calibration slope outside [0.85, 1.15]", slope=round(slope, 4))
    else:
        log.info("Check 2 PASS — calibration slope", slope=round(slope, 4))

    # ── Check 3: Hold-one-tournament-out (WC 2018) ───────────────────────────
    log.stage("Sanity check 3 — Hold-one-out WC 2018")
    wc2018_start = pd.Timestamp("2018-01-01", tz="UTC")
    wc2018_end   = pd.Timestamp("2018-07-15", tz="UTC")
    excl_df = rating_df[
        ~((rating_df["date"] >= wc2018_start) & (rating_df["date"] <= wc2018_end))
    ]
    excl_calib = excl_df[
        (excl_df["date"] > BURN_IN_END) & (excl_df["date"] <= CALIB_END)
    ]

    best_loss_excl = float("inf")
    best_c_excl = params.c
    for c in _GRID_C:
        for mu in _GRID_MU:
            loss = _cv_loss(c, mu, excl_calib, folds)
            if loss < best_loss_excl:
                best_loss_excl = loss
                best_c_excl = c

    c_diff = abs(params.c - best_c_excl)
    results["hold_one_out_c_diff"] = round(c_diff, 4)
    results["hold_one_out_c_excl_wc2018"] = round(best_c_excl, 4)
    if c_diff > 0.05:
        log.warning(
            "Hold-one-out: c unstable (diff > 0.05)",
            c_full=round(params.c, 4),
            c_excl=round(best_c_excl, 4),
            diff=round(c_diff, 4),
        )
    else:
        log.info("Check 3 PASS — hold-one-out stable", c_diff=round(c_diff, 4))

    # ── Check 4: Baseline beat ────────────────────────────────────────────────
    log.stage("Sanity check 4 — Baseline beat")
    # Naive 33/34/33 constant predictor
    baseline_loss = -(1 / 3 * math.log(1 / 3) + 1 / 3 * math.log(1 / 3) + 1 / 3 * math.log(1 / 3))
    model_loss = float(diag_df["log_loss"].mean())
    results["model_log_loss"]   = round(model_loss, 6)
    results["baseline_log_loss"] = round(baseline_loss, 6)
    if model_loss >= baseline_loss:
        log.warning(
            "CATASTROPHIC: model does not beat 33/34/33 baseline",
            model_loss=round(model_loss, 6),
            baseline_loss=round(baseline_loss, 6),
        )
    else:
        log.info(
            "Check 4 PASS — beats baseline",
            model_loss=round(model_loss, 6),
            baseline_loss=round(baseline_loss, 6),
        )

    # ── Check 5: Implied match totals ─────────────────────────────────────────
    log.stage("Sanity check 5 — Implied match totals")
    mean_implied = float(diag_df["lam_home"].add(diag_df["lam_away"]).mean())
    empirical_goals = float(
        (diag_df["score_home"] + diag_df["score_away"]).mean()
    )
    total_drift = abs(mean_implied - empirical_goals)
    results["mean_implied_total_goals"] = round(mean_implied, 4)
    results["mean_empirical_total_goals"] = round(empirical_goals, 4)
    results["total_goals_drift"] = round(total_drift, 4)
    if total_drift > 0.10:
        log.warning(
            "Implied totals drift > 0.1 — μ may be absorbing a bug",
            implied=round(mean_implied, 4),
            empirical=round(empirical_goals, 4),
            drift=round(total_drift, 4),
        )
    else:
        log.info(
            "Check 5 PASS — implied totals",
            implied=round(mean_implied, 4),
            empirical=round(empirical_goals, 4),
        )

    return results


# ── Diagnostics builder ───────────────────────────────────────────────────────

def _build_diagnostics(
    calib_df: pd.DataFrame,
    params: LambdaParams,
) -> pd.DataFrame:
    """Build per-match diagnostics table for all calibration window matches."""
    rows = []
    for row in calib_df.itertuples(index=False):
        lam_h, lam_a = elo_to_lambdas(
            row.R_home_pre, row.R_away_pre, row.H_used, params
        )
        p_H, p_D, p_A = outcome_probabilities(lam_h, lam_a, params)

        if row.score_home > row.score_away:
            observed = "H"
        elif row.score_home == row.score_away:
            observed = "D"
        else:
            observed = "A"

        ll = _match_log_loss(p_H, p_D, p_A, observed)
        bs = _match_brier(p_H, p_D, p_A, observed)

        rows.append({
            "match_id":    row.match_id,
            "date":        row.date,
            "R_home_pre":  row.R_home_pre,
            "R_away_pre":  row.R_away_pre,
            "H_used":      row.H_used,
            "lam_home":    lam_h,
            "lam_away":    lam_a,
            "p_H":         p_H,
            "p_D":         p_D,
            "p_A":         p_A,
            "observed":    observed,
            "is_home_win": int(observed == "H"),
            "log_loss":    ll,
            "brier":       bs,
            "score_home":  row.score_home,
            "score_away":  row.score_away,
        })
    return pd.DataFrame(rows)


# ── RPS helper ────────────────────────────────────────────────────────────────

def _rps(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    i_H = 1.0 if observed == "H" else 0.0
    i_D = 1.0 if observed == "D" else 0.0
    f1 = p_H
    e1 = i_H
    f2 = p_H + p_D
    e2 = i_H + i_D
    return 0.5 * ((f1 - e1) ** 2 + (f2 - e2) ** 2)


# ── Main entry point ──────────────────────────────────────────────────────────

def run(force: bool = False) -> Path:
    """
    Full Phase 3 pipeline:
      1. Load matches via DataLoader
      2. Run walk-forward Elo (2010–2022)
      3. Calibrate (c*, μ*) via walk-forward CV
      4. Run 5 sanity checks
      5. Write JSON + Parquet outputs
    """
    CALIBRATION_DIR.mkdir(parents=True, exist_ok=True)

    if PARAMS_JSON.exists() and not force:
        log.info("Params JSON already exists — pass --force to re-run", path=str(PARAMS_JSON))
        return PARAMS_JSON

    log.stage("Phase 3 — Loading match data")
    loader = DataLoader()
    data_sha = loader.sha("historical_matches")

    # Load ALL matches (including holdout) capped at 2022-12-18
    matches_raw = loader.get_matches(include_holdout=True)
    matches_raw["date"] = pd.to_datetime(matches_raw["date"], utc=True)
    matches_calib = matches_raw[matches_raw["date"] <= CALIB_END].copy()
    log.info(
        "Matches for Elo walk-forward",
        total=len(matches_calib),
        date_range=f"{matches_calib['date'].min().date()} → {matches_calib['date'].max().date()}",
    )

    # ── Walk-forward Elo ──────────────────────────────────────────────────────
    log.stage("Phase 3 — Walk-forward Elo (2010–2022)")
    rating_df = run_walk_forward(matches_calib)

    # Add observed outcome column for calibration/sanity use
    rating_df["observed"] = np.where(
        rating_df["score_home"] > rating_df["score_away"], "H",
        np.where(rating_df["score_home"] == rating_df["score_away"], "D", "A"),
    )

    # Acceptance criterion 1: 0 NaNs, monotonic dates
    assert rating_df[["R_home_pre", "R_away_pre"]].isna().sum().sum() == 0, \
        "NaN ratings in walk-forward output"
    assert rating_df["date"].is_monotonic_increasing, \
        "Dates are not monotonically increasing"
    log.info(
        "Walk-forward Elo checks passed",
        matches=len(rating_df),
        unique_teams=len(
            set(rating_df["home_team"].tolist() + rating_df["away_team"].tolist())
        ),
    )

    # ── Calibration ───────────────────────────────────────────────────────────
    params = calibrate(rating_df)

    # CV fold boundaries for sanity checks
    folds: list[tuple[pd.Timestamp, pd.Timestamp]] = [
        (pd.Timestamp(s, tz="UTC"), pd.Timestamp(e, tz="UTC"))
        for s, e in _FOLDS
    ]

    # Calibration window matches with "observed" outcome
    calib_df = rating_df[
        (rating_df["date"] > BURN_IN_END) & (rating_df["date"] <= CALIB_END)
    ].copy()

    # ── Diagnostics ───────────────────────────────────────────────────────────
    log.stage("Phase 3 — Building diagnostics table")
    diag_df = _build_diagnostics(calib_df, params)

    mean_rps  = float(
        diag_df.apply(
            lambda r: _rps(r["p_H"], r["p_D"], r["p_A"], r["observed"]),
            axis=1,
        ).mean()
    )
    mean_brier = float(diag_df["brier"].mean())
    cv_loss    = float(diag_df["log_loss"].mean())

    # Acceptance criterion 3: log-loss on WC 2022 fold ≤ 0.97
    fold5_start = pd.Timestamp("2022-01-01", tz="UTC")
    fold5_end   = pd.Timestamp("2022-12-18", tz="UTC")
    diag_df["date"] = pd.to_datetime(diag_df["date"], utc=True)
    fold5_df = diag_df[
        (diag_df["date"] >= fold5_start) & (diag_df["date"] <= fold5_end)
    ]
    fold5_loss = float(fold5_df["log_loss"].mean()) if not fold5_df.empty else float("nan")
    log.info("WC 2022 fold log-loss", fold5_loss=round(fold5_loss, 4))
    if not math.isnan(fold5_loss) and fold5_loss > 0.97:
        log.warning(
            "WC 2022 fold log-loss > 0.97 (acceptance criterion 3)",
            fold5_loss=round(fold5_loss, 4),
        )

    # ── Sanity checks ─────────────────────────────────────────────────────────
    sanity = run_sanity_checks(diag_df, params, rating_df, folds)

    # Acceptance criterion 4: unit test for symmetric λ
    test_params = LambdaParams(c=params.c, mu=params.mu)
    p_H_sym, p_D_sym, p_A_sym = outcome_probabilities(1.35, 1.35, test_params)
    assert abs(p_H_sym - p_A_sym) < 1e-6, \
        f"Symmetry test failed: P_H={p_H_sym:.8f} ≠ P_A={p_A_sym:.8f}"
    assert abs(p_H_sym + p_D_sym + p_A_sym - 1.0) < 1e-9, \
        f"Probabilities do not sum to 1: {p_H_sym + p_D_sym + p_A_sym}"
    log.info(
        "Check AC4 PASS — symmetric λ test",
        P_H=round(p_H_sym, 6),
        P_D=round(p_D_sym, 6),
        P_A=round(p_A_sym, 6),
        sum=round(p_H_sym + p_D_sym + p_A_sym, 10),
    )

    # ── Write outputs ─────────────────────────────────────────────────────────
    log.stage("Phase 3 — Writing outputs")

    params_record = {
        "c":                    round(params.c, 6),
        "mu":                   round(params.mu, 6),
        "lam3":                 params.lam3,
        "rho":                  params.rho,
        "cv_log_loss":          round(cv_loss, 6),
        "wc2022_fold_log_loss": round(fold5_loss, 6) if not math.isnan(fold5_loss) else None,
        "brier_score":          round(mean_brier, 6),
        "rps":                  round(mean_rps, 6),
        "n_calibration_matches": int(len(calib_df)),
        "data_snapshot_sha":    data_sha,
        "sanity_checks":        sanity,
    }

    PARAMS_JSON.write_text(json.dumps(params_record, indent=2))
    log.success("Written params JSON", path=str(PARAMS_JSON))

    diag_out = diag_df.drop(columns=["is_home_win"], errors="ignore")
    diag_out.to_parquet(DIAG_PARQUET, index=False, engine="pyarrow")
    log.success("Written diagnostics parquet", path=str(DIAG_PARQUET), rows=len(diag_out))

    # Register snapshot
    hasher = DataSnapshotHasher()
    hasher.add_file(PARAMS_JSON, label="elo_lambda_params")
    hasher.add_file(DIAG_PARQUET, label="elo_lambda_diagnostics")
    snap_sha = hasher.finalise()

    registry = SnapshotRegistry(PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl")
    registry.register(snap_sha, hasher.manifest(), notes="calibrate_elo_lambda")
    log.info("Snapshot registered", sha=snap_sha[:16])

    return PARAMS_JSON


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Phase 3 — Elo λ Calibration")
    parser.add_argument("--force", action="store_true", help="Re-run even if output exists")
    args = parser.parse_args()

    output = run(force=args.force)

    # Print final calibrated parameters
    with open(output) as f:
        p = json.load(f)

    print("\n" + "=" * 60)
    print("CALIBRATED PARAMETERS")
    print("=" * 60)
    print(f"  c  (Elo scaling)      = {p['c']}")
    print(f"  μ  (baseline goals)   = {p['mu']}")
    print(f"  λ₃ (BP covariance)    = {p['lam3']}  [LOCKED]")
    print(f"  ρ  (Dixon-Coles)      = {p['rho']}  [LOCKED]")
    print()
    print(f"  CV log-loss           = {p['cv_log_loss']}")
    print(f"  WC 2022 fold loss     = {p['wc2022_fold_log_loss']}")
    print(f"  Brier score           = {p['brier_score']}")
    print(f"  RPS                   = {p['rps']}")
    print(f"  N calibration matches = {p['n_calibration_matches']}")
    print(f"  Data snapshot SHA     = {p['data_snapshot_sha'][:16]}")
    print()
    print("SANITY CHECKS")
    for k, v in p["sanity_checks"].items():
        print(f"  {k:<40} = {v}")
    print("=" * 60)
