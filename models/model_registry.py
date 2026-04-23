"""
models/model_registry.py
=========================
Phase 4 — Shared BaseModel Interface, Model Factory & M★ Selection Protocol

Implements:
  - BaseModel: abstract base class for all strength models
  - DataBundle: typed container for all required data
  - CVResults: output of the 5-fold walk-forward CV battery
  - ModelRegistry: fits M0–M3, runs CV, selects champion M★

Pre-registered CV protocol (must not change after document written):
  5 walk-forward folds, mean log-loss across folds, selection rules §6.3.5.
"""

from __future__ import annotations

import hashlib
import json
import math
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from ingestion.data_loader import DataLoader
from models.elo_calculator import run_walk_forward
from models.calibrate_elo_lambda import (
    LambdaParams,
    outcome_probabilities,
    bivariate_poisson_pmf,
    dixon_coles_tau,
)
# Import shared base classes from dedicated module (avoids circular imports)
from models.base import BaseModel, DataBundle, CVResults

log = get_logger(__name__)

CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
SNAPSHOT_DIR    = PROJECT_ROOT / "data" / "snapshots"

# ── CV fold structure (LOCKED — matches Phase 3 §3.3) ────────────────────────
_CV_FOLDS: list[tuple[str, str, str]] = [
    ("2013-12-31", "2014-01-01", "2014-07-13"),   # fold 1: 2014 WC
    ("2015-12-31", "2016-01-01", "2016-07-10"),   # fold 2: Euro/Copa 2016
    ("2017-12-31", "2018-01-01", "2018-07-15"),   # fold 3: 2018 WC
    ("2020-12-31", "2021-01-01", "2021-07-11"),   # fold 4: Euro 2020 + Copa 2021
    ("2021-12-31", "2022-01-01", "2022-12-18"),   # fold 5: 2022 WC
]
# (cutoff, eval_start, eval_end) — train on data ≤ cutoff, eval on [start, end]

# ── Phase 3 locked constants (loaded from pre_reg_constants.yaml) ───────────
_yaml_path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
with open(_yaml_path) as _fh:
    _pre_reg = yaml.safe_load(_fh)

_C_STAR         = float(_pre_reg["elo"]["c_star"])
_MU_STAR        = float(_pre_reg["elo"]["mu_star"])
_RHO            = float(_pre_reg["match_model"]["rho"])
_LAM3           = float(_pre_reg["match_model"]["lambda_3"])
_FORM_HALF_LIFE = float(_pre_reg["form"]["half_life_days"])

MAX_GOALS = int(_pre_reg["match_model"]["max_goals"])


# ═══════════════════════════════════════════════════════════════════════════════
# Shared math helpers (used by CV engine — same formulas as individual models)
# ═══════════════════════════════════════════════════════════════════════════════

def _s_ij(R_i: float, R_j: float, params: LambdaParams) -> float:
    """S[i,j] = μ* · exp(c* · (R_i − R_j) / 400)."""
    delta = (R_i - R_j) / 400.0
    return params.mu * math.exp(params.c * delta)


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


def _match_rps(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    i_H = 1.0 if observed == "H" else 0.0
    i_D = 1.0 if observed == "D" else 0.0
    f1 = p_H
    e1 = i_H
    f2 = p_H + p_D
    e2 = i_H + i_D
    return 0.5 * ((f1 - e1) ** 2 + (f2 - e2) ** 2)


def _compute_probs(lam_i: float, lam_j: float, params: LambdaParams) -> tuple[float, float, float]:
    """Bivariate Poisson + Dixon-Coles probabilities (home_win, draw, away_win)."""
    return outcome_probabilities(lam_i, lam_j, params)


# ═══════════════════════════════════════════════════════════════════════════════
# CV engine — computes per-fold losses for all 4 model variants
# ═══════════════════════════════════════════════════════════════════════════════

def _build_team_match_records(wf_df: pd.DataFrame) -> pd.DataFrame:
    """
    Pivot walk-forward output into per-team-match records for form computation.
    Returns DataFrame with: team, date, R_i_pre, R_opp_pre, S_ik
    """
    home_records = wf_df[["date", "home_team", "away_team", "R_home_pre", "R_away_pre", "S_home"]].copy()
    home_records.columns = ["date", "team", "opponent", "R_i_pre", "R_opp_pre", "S_ik"]

    away_records = wf_df[["date", "away_team", "home_team", "R_away_pre", "R_home_pre", "S_home"]].copy()
    away_records.columns = ["date", "team", "opponent", "R_i_pre", "R_opp_pre", "S_ik"]
    # Away result is complement (W/D/L mirror)
    away_records["S_ik"] = away_records["S_ik"].map({1.0: 0.0, 0.5: 0.5, 0.0: 1.0})

    combined = pd.concat([home_records, away_records], ignore_index=True)
    combined["date"] = pd.to_datetime(combined["date"], utc=True)
    return combined.sort_values("date").reset_index(drop=True)


def _compute_form_phi(
    team_records: pd.DataFrame,
    cutoff_date: pd.Timestamp,
    tau: float,
    n_form: int = 8,
    gamma: float = 1.0,
    cap: float = 0.15,
) -> dict[str, float]:
    """
    Compute post-clip form multiplier φ_i for all teams at cutoff_date.
    Returns {team_name: φ_i} where φ_i ∈ [−cap, cap].
    """
    if isinstance(cutoff_date, pd.Timestamp) and cutoff_date.tzinfo is not None:
        cutoff_ts = cutoff_date
    else:
        cutoff_ts = pd.Timestamp(cutoff_date, tz="UTC")
    lambda_decay = math.log(2.0) / tau
    phi_dict: dict[str, float] = {}

    for team, grp in team_records.groupby("team"):
        recent = grp[grp["date"] < cutoff_ts].sort_values("date").tail(n_form)
        if recent.empty:
            phi_dict[team] = 0.0
            continue

        weighted_sum = 0.0
        weight_total = 0.0
        for row in recent.itertuples(index=False):
            days_diff = (cutoff_ts - row.date).total_seconds() / 86400.0
            w_k = math.exp(-lambda_decay * days_diff)
            E_ik = 1.0 / (1.0 + 10.0 ** ((row.R_opp_pre - row.R_i_pre) / 400.0))
            delta_k = row.S_ik - E_ik
            weighted_sum += w_k * delta_k
            weight_total += w_k

        F_i = weighted_sum / weight_total if weight_total > 0 else 0.0
        phi_i = max(-cap, min(cap, gamma * F_i))
        phi_dict[team] = phi_i

    return phi_dict


def _compute_blended_ratings_cv(
    wf_ratings: dict[str, float],
    fifa_df: pd.DataFrame,
    w: float,
) -> dict[str, float]:
    """
    Compute M2 blended Elo ratings for any team in wf_ratings.
    Teams without FIFA data fall back to raw Elo (w=0 behaviour).
    """
    fifa_map = dict(zip(fifa_df["team_name"], fifa_df["fifa_points"]))

    # Find teams present in both
    common_teams = [t for t in wf_ratings if t in fifa_map]
    if not common_teams:
        return dict(wf_ratings)

    elo_vals = np.array([wf_ratings[t] for t in common_teams])
    fifa_vals = np.array([fifa_map[t] for t in common_teams])

    mu_R = float(np.mean(elo_vals))
    sig_R = float(np.std(elo_vals)) or 1.0
    mu_Q = float(np.mean(fifa_vals))
    sig_Q = float(np.std(fifa_vals)) or 1.0

    blended: dict[str, float] = {}
    for t, R in wf_ratings.items():
        if t in fifa_map:
            z_elo = (R - mu_R) / sig_R
            z_fifa = (fifa_map[t] - mu_Q) / sig_Q
            z_blend = (1.0 - w) * z_elo + w * z_fifa
            blended[t] = mu_R + sig_R * z_blend
        else:
            blended[t] = R  # no FIFA data → fall back to raw Elo
    return blended


def _compute_posterior_ratings_cv(
    wf_ratings: dict[str, float],
    macro_df: pd.DataFrame,
    theta: np.ndarray,
    alpha_min: float = 0.05,
    alpha_max: float = 0.40,
    beta: float = 4.0,
) -> dict[str, float]:
    """
    Compute M3 posterior Elo ratings using macro prior.
    Only applies to teams with macro data; others use raw Elo.
    """
    # Map team → macro features
    macro_map: dict[str, dict] = {}
    for row in macro_df.itertuples(index=False):
        macro_map[row.team_name] = {
            "log_gdp": row.log_gdp_per_capita,
            "log_pop": row.log_population,
            "temp": row.mean_temp_celsius,
            "host": float(row.is_host),
            "wca": float(row.football_culture_index),
        }

    # Sort teams with macro data by Elo to assign alpha schedule
    macro_teams_sorted = sorted(
        [t for t in wf_ratings if t in macro_map],
        key=lambda t: wf_ratings[t],
        reverse=True,
    )
    n = len(macro_teams_sorted)
    alpha_map: dict[str, float] = {}
    for rank_1based, team in enumerate(macro_teams_sorted, 1):
        p_i = (n - rank_1based) / max(n - 1, 1)
        alpha_i = alpha_min + (alpha_max - alpha_min) * (1.0 - p_i) ** beta
        alpha_map[team] = float(np.clip(alpha_i, alpha_min, alpha_max))

    posterior: dict[str, float] = {}
    for t, R in wf_ratings.items():
        if t in macro_map:
            m = macro_map[t]
            xi_i = (
                theta[0]
                + theta[1] * m["log_gdp"]
                + theta[2] * m["log_pop"]
                + theta[3] * m["temp"]
                + theta[4] * m["host"]
                + theta[5] * m["wca"]
            )
            alpha_i = alpha_map.get(t, alpha_min)
            posterior[t] = (1.0 - alpha_i) * R + alpha_i * xi_i
        else:
            posterior[t] = R
    return posterior


def _fit_macro_theta(elo_df: pd.DataFrame, macro_df: pd.DataFrame) -> np.ndarray:
    """
    OLS: regress current Elo on macro features across all teams with macro data.
    Returns theta of shape (6,): [θ₀, θ₁_log_gdp, θ₂_log_pop, θ₃_temp, θ₄_host, θ₅_wca].
    """
    from numpy.linalg import lstsq

    elo_map = dict(zip(elo_df["team_name"], elo_df["elo_rating"]))

    rows = []
    for row in macro_df.itertuples(index=False):
        team = row.team_name
        R = elo_map.get(team)
        if R is None:
            continue
        rows.append([
            R,
            row.log_gdp_per_capita,
            row.log_population,
            float(row.mean_temp_celsius),
            float(row.is_host),
            float(row.football_culture_index),
        ])

    arr = np.array(rows, dtype=float)
    y = arr[:, 0]
    X = np.column_stack([np.ones(len(arr)), arr[:, 1:]])   # shape (n, 6)

    theta, residuals, rank, sv = lstsq(X, y, rcond=None)

    # Compute R²
    y_hat = X @ theta
    ss_res = float(np.sum((y - y_hat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    rmse = float(np.sqrt(ss_res / len(y))) if len(y) > 0 else 0.0

    log.info("M3 OLS θ fit", n=len(arr), r2=round(r2, 4), rmse=round(rmse, 1))
    if r2 < 0.30:
        log.warning(
            "M3 OLS R² < 0.30 — macro features explain <30% of Elo variance",
            r2=round(r2, 4),
        )

    # Save to calibration file
    theta_record = {
        "theta": theta.tolist(),
        "r2": round(r2, 6),
        "rmse": round(rmse, 4),
        "n_teams": int(len(arr)),
        "features": ["intercept", "log_gdp_per_capita", "log_population",
                     "mean_temp_celsius", "is_host", "football_culture_index"],
    }
    theta_path = CALIBRATION_DIR / "m3_macro_theta.json"
    theta_path.write_text(json.dumps(theta_record, indent=2))
    log.success("Written M3 θ", path=str(theta_path), r2=round(r2, 4))

    return theta


def _evaluate_fold(
    train_matches: pd.DataFrame,
    eval_matches: pd.DataFrame,
    cutoff_date: pd.Timestamp,
    params: LambdaParams,
    tau: float,
    w: float,
    theta: np.ndarray,
    fifa_df: pd.DataFrame,
    macro_df: pd.DataFrame,
) -> dict[str, dict]:
    """
    Evaluate M0–M3 on a single CV fold.

    Returns {model_id: {"losses": [...], "briers": [...], "rpss": [...]}}
    """
    # Walk-forward Elo on training data
    wf_df = run_walk_forward(train_matches)

    # Ratings at fold cutoff: use last known post-match rating per team
    ratings: dict[str, float] = {}
    for row in wf_df.itertuples(index=False):
        ratings[row.home_team] = row.R_home_post
        ratings[row.away_team] = row.R_away_post

    # M1: compute form multipliers
    team_match_records = _build_team_match_records(wf_df)
    phi_m1 = _compute_form_phi(team_match_records, cutoff_date, tau=tau)

    # M2: blended ratings
    ratings_m2 = _compute_blended_ratings_cv(ratings, fifa_df, w=w)

    # M3: posterior ratings
    ratings_m3 = _compute_posterior_ratings_cv(ratings, macro_df, theta)

    # Initialise result containers
    results: dict[str, dict] = {
        mid: {"losses": [], "briers": [], "rpss": []}
        for mid in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
    }

    for row in eval_matches.itertuples(index=False):
        home = row.team_home
        away = row.team_away

        if pd.isna(row.score_home) or pd.isna(row.score_away):
            continue

        if row.score_home > row.score_away:
            observed = "H"
        elif row.score_home == row.score_away:
            observed = "D"
        else:
            observed = "A"

        R_home_base = ratings.get(home, 1500.0)
        R_away_base = ratings.get(away, 1500.0)

        # M0 — pure Elo
        lam_h = _s_ij(R_home_base, R_away_base, params)
        lam_a = _s_ij(R_away_base, R_home_base, params)
        p_H, p_D, p_A = _compute_probs(lam_h, lam_a, params)
        results["M0_elo"]["losses"].append(_match_log_loss(p_H, p_D, p_A, observed))
        results["M0_elo"]["briers"].append(_match_brier(p_H, p_D, p_A, observed))
        results["M0_elo"]["rpss"].append(_match_rps(p_H, p_D, p_A, observed))

        # M1 — form adjustment
        phi_h = phi_m1.get(home, 0.0)
        phi_a = phi_m1.get(away, 0.0)
        base_h = _s_ij(R_home_base, R_away_base, params)
        base_a = _s_ij(R_away_base, R_home_base, params)
        lam_h1 = base_h * (1.0 + phi_h) / (1.0 + phi_a)
        lam_a1 = base_a * (1.0 + phi_a) / (1.0 + phi_h)
        p_H, p_D, p_A = _compute_probs(lam_h1, lam_a1, params)
        results["M1_form"]["losses"].append(_match_log_loss(p_H, p_D, p_A, observed))
        results["M1_form"]["briers"].append(_match_brier(p_H, p_D, p_A, observed))
        results["M1_form"]["rpss"].append(_match_rps(p_H, p_D, p_A, observed))

        # M2 — FIFA blend
        R_h2 = ratings_m2.get(home, R_home_base)
        R_a2 = ratings_m2.get(away, R_away_base)
        lam_h2 = _s_ij(R_h2, R_a2, params)
        lam_a2 = _s_ij(R_a2, R_h2, params)
        p_H, p_D, p_A = _compute_probs(lam_h2, lam_a2, params)
        results["M2_fifa"]["losses"].append(_match_log_loss(p_H, p_D, p_A, observed))
        results["M2_fifa"]["briers"].append(_match_brier(p_H, p_D, p_A, observed))
        results["M2_fifa"]["rpss"].append(_match_rps(p_H, p_D, p_A, observed))

        # M3 — macro prior
        R_h3 = ratings_m3.get(home, R_home_base)
        R_a3 = ratings_m3.get(away, R_away_base)
        lam_h3 = _s_ij(R_h3, R_a3, params)
        lam_a3 = _s_ij(R_a3, R_h3, params)
        p_H, p_D, p_A = _compute_probs(lam_h3, lam_a3, params)
        results["M3_macro"]["losses"].append(_match_log_loss(p_H, p_D, p_A, observed))
        results["M3_macro"]["briers"].append(_match_brier(p_H, p_D, p_A, observed))
        results["M3_macro"]["rpss"].append(_match_rps(p_H, p_D, p_A, observed))

    return results


def _diebold_mariano(losses_a: list[float], losses_b: list[float]) -> tuple[float, float]:
    """
    Simple Diebold-Mariano test: H0: equal predictive accuracy.
    Returns (DM_stat, two-sided p-value).
    """
    from scipy.stats import t as t_dist

    d = np.array(losses_a) - np.array(losses_b)
    n = len(d)
    if n < 2:
        return 0.0, 1.0

    d_bar = float(np.mean(d))
    var_d = float(np.var(d, ddof=1))
    if var_d < 1e-15:
        return 0.0, 1.0

    dm_stat = d_bar / math.sqrt(var_d / n)
    p_value = float(2.0 * t_dist.sf(abs(dm_stat), df=n - 1))
    return dm_stat, p_value


# ═══════════════════════════════════════════════════════════════════════════════
# Model factory
# ═══════════════════════════════════════════════════════════════════════════════

def build_model(model_id: str, data: DataBundle, cfg: dict) -> BaseModel:
    """
    Instantiate, fit, and return the requested model.
    Raises ValueError if model_id is unknown.
    """
    from models.model_m0_elo import ModelM0Elo
    from models.model_m1_form import ModelM1Form, FormParams
    from models.model_m2_fifa import ModelM2Fifa, FifaBlendParams
    from models.model_m3_macro import ModelM3Macro, MacroPriorParams

    if model_id == "M0_elo":
        m = ModelM0Elo()
        m.fit(
            matches=data.matches,
            elo_df=data.elo_df,
            params=data.lambda_params,
            team_index=data.team_index,
        )
        return m

    if model_id == "M1_form":
        # Load calibrated τ from file if available
        fp = CALIBRATION_DIR / "m1_form_params.json"
        tau = 60.0  # default
        if fp.exists():
            j = json.loads(fp.read_text())
            tau = float(j.get("tau_star", tau))
        m = ModelM1Form()
        m.fit(
            matches=data.matches,
            elo_df=data.elo_df,
            form_df=data.form_df,
            params=data.lambda_params,
            form_params=FormParams(tau_days=tau),
            team_index=data.team_index,
            reference_date=data.reference_date,
        )
        return m

    if model_id == "M2_fifa":
        fp = CALIBRATION_DIR / "m2_fifa_params.json"
        w = 0.15  # default
        if fp.exists():
            j = json.loads(fp.read_text())
            w = float(j.get("w_star", w))
        m = ModelM2Fifa()
        m.fit(
            matches=data.matches,
            elo_df=data.elo_df,
            fifa_df=data.fifa_df,
            params=data.lambda_params,
            blend_params=FifaBlendParams(w=w),
            team_index=data.team_index,
        )
        return m

    if model_id == "M3_macro":
        fp = CALIBRATION_DIR / "m3_macro_theta.json"
        theta = None
        if fp.exists():
            j = json.loads(fp.read_text())
            theta = np.array(j["theta"])
        m = ModelM3Macro()
        m.fit(
            matches=data.matches,
            elo_df=data.elo_df,
            macro_df=data.macro_df,
            params=data.lambda_params,
            macro_params=None,          # will auto-load theta from file
            team_index=data.team_index,
            theta=theta,
        )
        return m

    raise ValueError(f"Unknown model_id: {model_id!r}. Must be one of M0_elo, M1_form, M2_fifa, M3_macro")


# ═══════════════════════════════════════════════════════════════════════════════
# ModelRegistry
# ═══════════════════════════════════════════════════════════════════════════════

class ModelRegistry:
    """
    Stores fitted models and executes the M★ selection protocol.
    """

    def __init__(self, data: DataBundle, cfg: dict) -> None:
        self.data = data
        self.cfg = cfg
        self._models: dict[str, BaseModel] = {}
        self._cv_results: Optional[CVResults] = None
        self._champion_id: Optional[str] = None
        CALIBRATION_DIR.mkdir(parents=True, exist_ok=True)

    def fit_all(self) -> None:
        """Fit M0, M1, M2, M3 in sequence. Log time per model."""
        for mid in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]:
            t0 = time.time()
            model = build_model(mid, self.data, self.cfg)
            elapsed = time.time() - t0
            self._models[mid] = model
            # SHA of the strength matrix
            S = model.get_strength_matrix()
            mat_sha = hashlib.sha256(S.tobytes()).hexdigest()
            log.info("Model fitted", model=mid, elapsed_s=round(elapsed, 2), matrix_sha=mat_sha[:16])

    def run_cv_battery(self) -> CVResults:
        """
        Execute the full 5-fold walk-forward CV battery.

        Steps:
          1. Fit M3 OLS θ on all available macro data (not fold-dependent)
          2. For M1: grid-search τ over all folds → find τ*
          3. For M2: grid-search w over all folds → find w*
          4. Final CV with M0, M1(τ*), M2(w*), M3(θ) → select M★
        """
        log.stage("Phase 4 — CV Battery")

        params = self.data.lambda_params
        matches = self.data.matches.copy()
        matches["date"] = pd.to_datetime(matches["date"], utc=True)

        # Step 1: Fit M3 OLS θ (uses all available data — stable fit)
        log.stage("Phase 4 — M3: OLS θ estimation")
        theta = _fit_macro_theta(self.data.elo_df, self.data.macro_df)

        # M1 τ grid
        tau_grid = [30.0, 45.0, 60.0, 75.0, 90.0, 120.0, 150.0, _FORM_HALF_LIFE]
        # M2 w grid
        w_grid = [0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.75, 1.00]

        # Accumulate fold results: {(model_id, param): [fold_losses]}
        tau_fold_losses: dict[float, list[float]] = {τ: [] for τ in tau_grid}
        w_fold_losses: dict[float, list[float]] = {w: [] for w in w_grid}
        m0_fold_losses: list[float] = []
        m3_fold_losses: list[float] = []
        n_matches_per_fold: list[int] = []

        # For final pooled metrics (using τ*, w* — determined after grid search)
        # We'll accumulate match-level losses in a second pass
        all_match_losses: dict[str, list[float]] = {m: [] for m in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]}
        all_match_briers: dict[str, list[float]] = {m: [] for m in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]}
        all_match_rpss: dict[str, list[float]] = {m: [] for m in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]}

        fold_losses_all: dict[str, list[float]] = {m: [] for m in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]}

        log.stage("Phase 4 — Grid search: M1 τ and M2 w (5 folds)")

        for fold_idx, (cutoff_str, eval_start_str, eval_end_str) in enumerate(_CV_FOLDS):
            cutoff   = pd.Timestamp(cutoff_str, tz="UTC")
            ev_start = pd.Timestamp(eval_start_str, tz="UTC")
            ev_end   = pd.Timestamp(eval_end_str, tz="UTC")

            # Training: all non-holdout data up to fold cutoff
            train_df = matches[(matches["date"] <= cutoff) & (~matches["is_holdout"])].copy()
            # Eval uses all matches in the window (holdout allowed in eval — see §6.3.1)
            # Training excludes holdout (cutoff ≤ 2021-12-31 ensures this automatically)
            eval_df  = matches[
                (matches["date"] >= ev_start) & (matches["date"] <= ev_end)
            ].copy()

            n_eval = len(eval_df)
            n_matches_per_fold.append(n_eval)

            if n_eval == 0:
                log.warning("Empty eval fold — skipping", fold=fold_idx + 1,
                            eval_start=eval_start_str, eval_end=eval_end_str)
                for τ in tau_grid:
                    tau_fold_losses[τ].append(float("nan"))
                for w in w_grid:
                    w_fold_losses[w].append(float("nan"))
                m0_fold_losses.append(float("nan"))
                m3_fold_losses.append(float("nan"))
                continue

            if n_eval < 48:
                log.warning("Fold has fewer than 48 eval matches", fold=fold_idx + 1, n=n_eval)

            log.info("CV fold", fold=fold_idx + 1, train_rows=len(train_df), eval_rows=n_eval,
                     eval_period=f"{eval_start_str} → {eval_end_str}")

            if train_df.empty:
                log.warning("Empty training fold — skipping", fold=fold_idx + 1)
                for τ in tau_grid:
                    tau_fold_losses[τ].append(float("nan"))
                for w in w_grid:
                    w_fold_losses[w].append(float("nan"))
                m0_fold_losses.append(float("nan"))
                m3_fold_losses.append(float("nan"))
                continue

            # Walk-forward on training data
            wf_df = run_walk_forward(train_df)
            ratings: dict[str, float] = {}
            for row in wf_df.itertuples(index=False):
                ratings[row.home_team] = row.R_home_post
                ratings[row.away_team] = row.R_away_post

            team_records = _build_team_match_records(wf_df)

            # M0 fold loss
            m0_losses = []
            for row in eval_df.itertuples(index=False):
                if pd.isna(row.score_home) or pd.isna(row.score_away):
                    continue
                observed = "H" if row.score_home > row.score_away else ("D" if row.score_home == row.score_away else "A")
                R_h = ratings.get(row.team_home, 1500.0)
                R_a = ratings.get(row.team_away, 1500.0)
                lam_h = _s_ij(R_h, R_a, params)
                lam_a = _s_ij(R_a, R_h, params)
                p_H, p_D, p_A = _compute_probs(lam_h, lam_a, params)
                m0_losses.append(_match_log_loss(p_H, p_D, p_A, observed))
            m0_fold_loss = float(np.mean(m0_losses)) if m0_losses else float("nan")
            m0_fold_losses.append(m0_fold_loss)

            # M3 fold loss (fixed θ, computed once per fold)
            ratings_m3 = _compute_posterior_ratings_cv(ratings, self.data.macro_df, theta)
            m3_losses = []
            for row in eval_df.itertuples(index=False):
                if pd.isna(row.score_home) or pd.isna(row.score_away):
                    continue
                observed = "H" if row.score_home > row.score_away else ("D" if row.score_home == row.score_away else "A")
                R_h = ratings_m3.get(row.team_home, ratings.get(row.team_home, 1500.0))
                R_a = ratings_m3.get(row.team_away, ratings.get(row.team_away, 1500.0))
                lam_h = _s_ij(R_h, R_a, params)
                lam_a = _s_ij(R_a, R_h, params)
                p_H, p_D, p_A = _compute_probs(lam_h, lam_a, params)
                m3_losses.append(_match_log_loss(p_H, p_D, p_A, observed))
            m3_fold_loss = float(np.mean(m3_losses)) if m3_losses else float("nan")
            m3_fold_losses.append(m3_fold_loss)

            # M1 grid search for τ
            for tau in tau_grid:
                phi_m1 = _compute_form_phi(team_records, cutoff, tau=tau)
                fold_losses_tau = []
                for row in eval_df.itertuples(index=False):
                    if pd.isna(row.score_home) or pd.isna(row.score_away):
                        continue
                    observed = "H" if row.score_home > row.score_away else ("D" if row.score_home == row.score_away else "A")
                    R_h = ratings.get(row.team_home, 1500.0)
                    R_a = ratings.get(row.team_away, 1500.0)
                    phi_h = phi_m1.get(row.team_home, 0.0)
                    phi_a = phi_m1.get(row.team_away, 0.0)
                    base_h = _s_ij(R_h, R_a, params)
                    base_a = _s_ij(R_a, R_h, params)
                    lam_h1 = base_h * (1.0 + phi_h) / (1.0 + phi_a)
                    lam_a1 = base_a * (1.0 + phi_a) / (1.0 + phi_h)
                    p_H, p_D, p_A = _compute_probs(lam_h1, lam_a1, params)
                    fold_losses_tau.append(_match_log_loss(p_H, p_D, p_A, observed))
                tau_fold_losses[tau].append(float(np.mean(fold_losses_tau)) if fold_losses_tau else float("nan"))

            # M2 grid search for w
            for w in w_grid:
                ratings_m2 = _compute_blended_ratings_cv(ratings, self.data.fifa_df, w=w)
                fold_losses_w = []
                for row in eval_df.itertuples(index=False):
                    if pd.isna(row.score_home) or pd.isna(row.score_away):
                        continue
                    observed = "H" if row.score_home > row.score_away else ("D" if row.score_home == row.score_away else "A")
                    R_h = ratings_m2.get(row.team_home, ratings.get(row.team_home, 1500.0))
                    R_a = ratings_m2.get(row.team_away, ratings.get(row.team_away, 1500.0))
                    lam_h = _s_ij(R_h, R_a, params)
                    lam_a = _s_ij(R_a, R_h, params)
                    p_H, p_D, p_A = _compute_probs(lam_h, lam_a, params)
                    fold_losses_w.append(_match_log_loss(p_H, p_D, p_A, observed))
                w_fold_losses[w].append(float(np.mean(fold_losses_w)) if fold_losses_w else float("nan"))

        # ── Select τ* and w* ─────────────────────────────────────────────────
        def _mean_nan(vals: list[float]) -> float:
            valid = [v for v in vals if not math.isnan(v)]
            return float(np.mean(valid)) if valid else float("inf")

        tau_cv_losses = {τ: _mean_nan(losses) for τ, losses in tau_fold_losses.items()}
        tau_star = float(min(tau_cv_losses, key=tau_cv_losses.__getitem__))

        w_cv_losses = {w: _mean_nan(losses) for w, losses in w_fold_losses.items()}
        w_star = float(min(w_cv_losses, key=w_cv_losses.__getitem__))

        log.info("M1 τ* selected", tau_star=tau_star, cv_loss=round(tau_cv_losses[tau_star], 6))
        log.info("M2 w* selected", w_star=w_star, cv_loss=round(w_cv_losses[w_star], 6))

        # Boundary check for τ*
        if tau_star in (min(tau_grid), max(tau_grid)):
            log.warning(
                "M1 τ* at grid boundary — consider extending grid",
                tau_star=tau_star,
                tau_min=min(tau_grid),
                tau_max=max(tau_grid),
            )

        # ── Write M1 and M2 calibration files ────────────────────────────────
        m1_record = {
            "tau_star": tau_star,
            "gamma": 1.0,
            "cap": 0.15,
            "n_form": 8,
            "cv_log_loss": round(tau_cv_losses[tau_star], 6),
            "cv_log_loss_curve": {str(τ): round(v, 6) for τ, v in tau_cv_losses.items()},
            "delta_vs_m0": round(tau_cv_losses[tau_star] - _mean_nan(m0_fold_losses), 6),
            "fold_losses": tau_fold_losses[tau_star],
        }
        m1_path = CALIBRATION_DIR / "m1_form_params.json"
        m1_path.write_text(json.dumps(m1_record, indent=2))
        log.success("Written M1 params", path=str(m1_path))

        m2_record = {
            "w_star": w_star,
            "adaptive": False,
            "n_threshold": 30,
            "cv_log_loss": round(w_cv_losses[w_star], 6),
            "cv_log_loss_curve": {str(w): round(v, 6) for w, v in w_cv_losses.items()},
            "delta_vs_m0": round(w_cv_losses[w_star] - _mean_nan(m0_fold_losses), 6),
            "fold_losses": w_fold_losses[w_star],
        }
        m2_path = CALIBRATION_DIR / "m2_fifa_params.json"
        m2_path.write_text(json.dumps(m2_record, indent=2))
        log.success("Written M2 params", path=str(m2_path))

        # ── Final CV with calibrated params (match-level for pooled metrics) ─
        log.stage("Phase 4 — Final CV pass (match-level metrics)")
        final_fold_losses: dict[str, list[float]] = {m: [] for m in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]}

        for fold_idx, (cutoff_str, eval_start_str, eval_end_str) in enumerate(_CV_FOLDS):
            cutoff   = pd.Timestamp(cutoff_str, tz="UTC")
            ev_start = pd.Timestamp(eval_start_str, tz="UTC")
            ev_end   = pd.Timestamp(eval_end_str, tz="UTC")

            # Training: all non-holdout data up to fold cutoff
            train_df = matches[(matches["date"] <= cutoff) & (~matches["is_holdout"])].copy()
            # Eval uses all matches in the window (holdout allowed in eval — see §6.3.1)
            # Training excludes holdout (cutoff ≤ 2021-12-31 ensures this automatically)
            eval_df  = matches[
                (matches["date"] >= ev_start) & (matches["date"] <= ev_end)
            ].copy()

            if eval_df.empty or train_df.empty:
                for m in final_fold_losses:
                    final_fold_losses[m].append(float("nan"))
                continue

            fold_results = _evaluate_fold(
                train_df, eval_df, cutoff, params,
                tau=tau_star, w=w_star, theta=theta,
                fifa_df=self.data.fifa_df,
                macro_df=self.data.macro_df,
            )

            for mid, data_dict in fold_results.items():
                losses = data_dict["losses"]
                fold_loss = float(np.mean(losses)) if losses else float("nan")
                final_fold_losses[mid].append(fold_loss)
                all_match_losses[mid].extend(losses)
                all_match_briers[mid].extend(data_dict["briers"])
                all_match_rpss[mid].extend(data_dict["rpss"])

        # ── Aggregate scores ──────────────────────────────────────────────────
        model_ids = ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
        scores: dict[str, float] = {}
        sigmas: dict[str, float] = {}

        for mid in model_ids:
            valid_folds = [v for v in final_fold_losses[mid] if not math.isnan(v)]
            scores[mid] = float(np.mean(valid_folds)) if valid_folds else float("inf")
            sigmas[mid] = float(np.std(valid_folds, ddof=1)) if len(valid_folds) > 1 else 0.0

        deltas = {mid: round(scores[mid] - scores["M0_elo"], 6) for mid in model_ids}

        brier = {mid: float(np.mean(all_match_briers[mid])) if all_match_briers[mid] else float("nan")
                 for mid in model_ids}
        rps   = {mid: float(np.mean(all_match_rpss[mid])) if all_match_rpss[mid] else float("nan")
                 for mid in model_ids}

        # Diebold-Mariano vs M0
        dm_stats: dict[str, float] = {}
        dm_pvalues: dict[str, float] = {}
        for mid in model_ids:
            if mid == "M0_elo":
                dm_stats[mid] = 0.0
                dm_pvalues[mid] = 1.0
            else:
                stat, pval = _diebold_mariano(all_match_losses["M0_elo"], all_match_losses[mid])
                dm_stats[mid] = round(stat, 4)
                dm_pvalues[mid] = round(pval, 4)

        # ── Apply M★ selection rules §6.3.5 ──────────────────────────────────
        log.stage("Phase 4 — M★ selection")
        preference_order = ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
        l_m0 = scores["M0_elo"]

        # Rule 1: disqualify models that don't beat M0
        eligible = [mid for mid in model_ids if scores[mid] < l_m0]
        log.info("Eligible models (beat M0)", models=eligible, l_m0=round(l_m0, 6))

        if not eligible:
            # Rule 5: fall back to M0
            champion_id = "M0_elo"
            log.warning("No model beat M0 — M★ = M0 (fallback)", l_m0=round(l_m0, 6))
        else:
            # Rule 2: pick model with lowest CV loss
            best_score = min(scores[m] for m in eligible)
            best_models = [m for m in eligible if scores[m] == best_score]

            if len(best_models) == 1:
                champion_id = best_models[0]
            else:
                # Rule 3: tiebreaker on σ_CV
                tied_within_thresh = [
                    m for m in best_models
                    if abs(scores[m] - best_score) < 0.001
                ]
                if len(tied_within_thresh) > 1:
                    # Rule 4: prefer simpler model
                    for mid in preference_order:
                        if mid in tied_within_thresh:
                            champion_id = mid
                            break
                    else:
                        champion_id = tied_within_thresh[0]
                else:
                    champion_id = min(tied_within_thresh, key=lambda m: sigmas[m])

        log.info(
            "Summary of CV scores",
            **{mid: round(scores[mid], 6) for mid in model_ids},
        )
        log.success(
            "M★ selected",
            champion=champion_id,
            L_CV=round(scores[champion_id], 6),
            delta_vs_M0=round(deltas[champion_id], 6),
        )

        # Sanity check 15: M0 must beat naive 1/3 predictor
        baseline_loss = -math.log(1.0 / 3.0)
        if scores["M0_elo"] >= baseline_loss:
            log.warning(
                "CATASTROPHIC: M0 does not beat 1/3 baseline — Elo ratings may be broken",
                M0_loss=round(scores["M0_elo"], 6),
                baseline=round(baseline_loss, 6),
            )
        else:
            log.info("Check 15 PASS — M0 beats 1/3 baseline",
                     M0_loss=round(scores["M0_elo"], 6), baseline=round(baseline_loss, 6))

        # Sanity check 16
        if all(scores[m] >= l_m0 for m in ["M1_form", "M2_fifa", "M3_macro"]):
            log.warning(
                "No richer model beats M0 — report in paper Limitations section",
                M0=round(l_m0, 6),
                M1=round(scores["M1_form"], 6),
                M2=round(scores["M2_fifa"], 6),
                M3=round(scores["M3_macro"], 6),
            )

        data_sha = self.data.elo_df.shape[0]   # placeholder — use hasher below

        cv_results = CVResults(
            scores=scores,
            sigmas=sigmas,
            deltas=deltas,
            fold_losses=final_fold_losses,
            brier=brier,
            rps=rps,
            dm_stats=dm_stats,
            dm_pvalues=dm_pvalues,
            champion_id=champion_id,
            n_matches_per_fold=n_matches_per_fold,
            data_snapshot_sha="",
            tau_star=tau_star,
            w_star=w_star,
            theta=theta,
        )
        self._cv_results = cv_results
        self._champion_id = champion_id
        return cv_results

    def select_champion(self) -> str:
        """Apply M★ selection rules and return champion model_id."""
        if self._cv_results is None:
            raise RuntimeError("run_cv_battery() must be called before select_champion()")
        return self._cv_results.champion_id

    def get_model(self, model_id: str) -> BaseModel:
        """Return a fitted model by ID."""
        if model_id not in self._models:
            raise KeyError(f"Model {model_id!r} not fitted. Call fit_all() first.")
        return self._models[model_id]

    def export_cv_report(self, output_path: Path) -> None:
        """Write CV results to JSON."""
        if self._cv_results is None:
            raise RuntimeError("run_cv_battery() must be called before export_cv_report()")
        cv = self._cv_results
        report = {}
        for mid in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]:
            report[mid] = {
                "L_CV": round(cv.scores[mid], 6),
                "sigma_CV": round(cv.sigmas[mid], 6),
                "delta_CV": round(cv.deltas[mid], 6),
                "brier": round(cv.brier.get(mid, float("nan")), 6),
                "rps": round(cv.rps.get(mid, float("nan")), 6),
                "dm_stat": round(cv.dm_stats.get(mid, 0.0), 6),
                "dm_pvalue": round(cv.dm_pvalues.get(mid, 1.0), 6),
                "fold_losses": [round(v, 6) if not math.isnan(v) else None
                                for v in cv.fold_losses[mid]],
                "champion": mid == cv.champion_id,
            }
        output_path.write_text(json.dumps(report, indent=2))
        log.success("Written CV report", path=str(output_path))

    def _write_champion_json(self) -> None:
        """Write champion_model.json with SHA and lock flag."""
        if self._champion_id is None or self._cv_results is None:
            raise RuntimeError("Must call run_cv_battery() first.")

        champion = self._champion_id
        cv = self._cv_results

        # Get champion matrix SHA if model is fitted
        mat_sha = "0" * 64
        if champion in self._models:
            S = self._models[champion].get_strength_matrix()
            mat_sha = hashlib.sha256(S.tobytes()).hexdigest()

        record = {
            "champion_model_id": champion,
            "L_CV": round(cv.scores[champion], 6),
            "delta_vs_M0": round(cv.deltas[champion], 6),
            "sigma_CV": round(cv.sigmas[champion], 6),
            "matrix_sha256": mat_sha,
            "CHAMPION_LOCKED": True,
            "tau_star": cv.tau_star,
            "w_star": cv.w_star,
        }
        out = CALIBRATION_DIR / "champion_model.json"
        out.write_text(json.dumps(record, indent=2))
        log.success("Written champion_model.json", champion=champion, path=str(out))


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests (§10.1 acceptance criteria 11–14)
# ═══════════════════════════════════════════════════════════════════════════════

def _run_registry_unit_tests(registry: "ModelRegistry") -> None:
    """Run acceptance criteria 11–14."""
    from models.model_m0_elo import ModelM0Elo
    from models.model_m1_form import ModelM1Form
    from models.model_m2_fifa import ModelM2Fifa
    from models.model_m3_macro import ModelM3Macro

    log.stage("Phase 4 — Registry unit tests (AC 11–14)")

    # AC 11: isinstance checks
    for mid, cls in [("M0_elo", ModelM0Elo), ("M1_form", ModelM1Form),
                     ("M2_fifa", ModelM2Fifa), ("M3_macro", ModelM3Macro)]:
        m = registry.get_model(mid)
        assert isinstance(m, BaseModel), f"AC11 FAIL: {mid} not BaseModel"
        assert isinstance(m, cls), f"AC11 FAIL: {mid} not {cls.__name__}"
    log.info("AC 11 PASS — all models implement BaseModel")

    # AC 12: cv_battery_results.json exists with 4 entries
    cv_path = CALIBRATION_DIR / "cv_battery_results.json"
    assert cv_path.exists(), f"AC12 FAIL: {cv_path} does not exist"
    cv_data = json.loads(cv_path.read_text())
    assert len(cv_data) == 4, f"AC12 FAIL: {len(cv_data)} entries, expected 4"
    log.info("AC 12 PASS — cv_battery_results.json has 4 model entries")

    # AC 13: select_champion returns valid model_id
    champ = registry.select_champion()
    valid_ids = {"M0_elo", "M1_form", "M2_fifa", "M3_macro"}
    assert champ in valid_ids, f"AC13 FAIL: {champ!r} not in {valid_ids}"
    log.info("AC 13 PASS — champion model_id is valid", champion=champ)

    # AC 14: champion_model.json exists with CHAMPION_LOCKED and 64-char SHA
    champ_path = CALIBRATION_DIR / "champion_model.json"
    assert champ_path.exists(), f"AC14 FAIL: {champ_path} does not exist"
    champ_data = json.loads(champ_path.read_text())
    assert champ_data.get("CHAMPION_LOCKED") is True, "AC14 FAIL: CHAMPION_LOCKED not True"
    sha = champ_data.get("matrix_sha256", "")
    assert len(sha) == 64, f"AC14 FAIL: matrix_sha256 is {len(sha)} chars, expected 64"
    log.info("AC 14 PASS — champion_model.json valid", sha_prefix=sha[:16])

    log.info("All registry unit tests PASS (AC 11–14)")


# ═══════════════════════════════════════════════════════════════════════════════
# Main entry point
# ═══════════════════════════════════════════════════════════════════════════════

def main() -> None:
    log.stage("Phase 4 — Model Development & M★ Selection")

    # ── Load data ─────────────────────────────────────────────────────────────
    log.stage("Phase 4 — Loading data")
    loader = DataLoader()

    # Include holdout so fold 5 can evaluate on WC 2022 (matches Phase 3 §3.3)
    # Training windows never include holdout matches (cutoff ≤ 2021-12-31 < WC 2022)
    matches  = loader.get_matches(include_holdout=True)
    elo_df   = loader.get_elo()
    form_df  = loader.get_recent_form()
    fifa_df  = loader.get_fifa_rankings()
    macro_df = loader.get_macro()

    # Load calibrated λ params from Phase 3
    params_path = CALIBRATION_DIR / "elo_lambda_params.json"
    assert params_path.exists(), f"elo_lambda_params.json not found at {params_path}"
    p = json.loads(params_path.read_text())
    lambda_params = LambdaParams(c=p["c"], mu=p["mu"], lam3=p["lam3"], rho=p["rho"])
    log.info("Loaded λ params", c=lambda_params.c, mu=lambda_params.mu)

    # Cross-check against spec constants (warn on significant deviation)
    if abs(lambda_params.c - _C_STAR) > 0.005:
        log.warning("c* deviates from spec", actual=lambda_params.c, spec=_C_STAR)
    if abs(lambda_params.mu - _MU_STAR) > 0.005:
        log.warning("μ* deviates from spec", actual=lambda_params.mu, spec=_MU_STAR)

    # Build team index from FIFA rankings (48 WC 2026 qualifiers)
    team_index: dict[str, int] = {name: idx for idx, name in enumerate(sorted(fifa_df["team_name"].tolist()))}
    log.info("Team index built", n_teams=len(team_index))

    with open(PROJECT_ROOT / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    reference_date = pd.Timestamp("2026-04-21", tz="UTC")  # data-freeze date

    data = DataBundle(
        matches=matches,
        elo_df=elo_df,
        form_df=form_df,
        fifa_df=fifa_df,
        macro_df=macro_df,
        lambda_params=lambda_params,
        team_index=team_index,
        reference_date=reference_date,
    )

    registry = ModelRegistry(data=data, cfg=cfg)

    # ── Run CV battery (calibrates τ*, w*, θ and computes M★) ─────────────────
    cv_results = registry.run_cv_battery()

    # ── Export CV report ──────────────────────────────────────────────────────
    cv_report_path = CALIBRATION_DIR / "cv_battery_results.json"
    registry.export_cv_report(cv_report_path)

    # ── Fit all models with calibrated params ─────────────────────────────────
    log.stage("Phase 4 — Fitting final models")
    registry.fit_all()

    # ── Write champion JSON ───────────────────────────────────────────────────
    registry._write_champion_json()

    # ── Run unit tests ────────────────────────────────────────────────────────
    from models.model_m0_elo import run_unit_tests as run_m0_tests
    from models.model_m1_form import run_unit_tests as run_m1_tests
    from models.model_m2_fifa import run_unit_tests as run_m2_tests
    from models.model_m3_macro import run_unit_tests as run_m3_tests

    run_m0_tests(registry.get_model("M0_elo"))
    run_m1_tests(registry.get_model("M1_form"))
    run_m2_tests(registry.get_model("M2_fifa"), registry.get_model("M0_elo"))
    run_m3_tests(registry.get_model("M3_macro"))
    _run_registry_unit_tests(registry)

    # ── Register snapshots ────────────────────────────────────────────────────
    hasher = DataSnapshotHasher()
    for fname in ["m1_form_params.json", "m2_fifa_params.json", "m3_macro_theta.json",
                  "cv_battery_results.json", "champion_model.json"]:
        fpath = CALIBRATION_DIR / fname
        if fpath.exists():
            hasher.add_file(fpath, label=fname)
    snap_sha = hasher.finalise()
    reg = SnapshotRegistry(SNAPSHOT_DIR / "snapshot_registry.jsonl")
    reg.register(snap_sha, hasher.manifest(), notes="phase4_model_development")
    log.info("Snapshots registered", sha=snap_sha[:16])

    # ── Final summary ─────────────────────────────────────────────────────────
    champion = registry.select_champion()
    cv = cv_results

    print("\n" + "=" * 70)
    print("PHASE 4 — CV LOG-LOSS RESULTS")
    print("=" * 70)
    for mid in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]:
        flag = " ← M★ CHAMPION" if mid == champion else ""
        print(f"  {mid:<12}  L_CV={cv.scores[mid]:.6f}  σ={cv.sigmas[mid]:.6f}  Δ={cv.deltas[mid]:+.6f}{flag}")
    print()
    print(f"  τ* (M1 form half-life)   = {cv.tau_star} days")
    print(f"  w* (M2 FIFA blend)       = {cv.w_star}")
    print()
    print(f"  CHAMPION MODEL (M★):  {champion}")
    print("=" * 70)


if __name__ == "__main__":
    main()
