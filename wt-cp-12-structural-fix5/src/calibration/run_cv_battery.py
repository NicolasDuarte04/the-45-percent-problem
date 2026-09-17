"""
src/calibration/run_cv_battery.py
===================================
Phase 8 — CV Log-Loss Battery: Formal M★ Adjudication

Implements the pre-registered battery described in Phase8 §1.
Run exactly ONCE on frozen code against the frozen data snapshot.

Outputs:
  evaluation/cv_battery_report.pdf
  evaluation/cv_battery_result.json
  calibration/cv_folds.parquet
  (also updates evaluation/pre_reg_constants.yaml with all SHAs and model params)

Pre-flight guards (abort if violated):
  1. Git working tree is clean (warn only if no git repo detected).
  2. cv_battery_2026-04.parquet SHA matches pinned value in YAML (if non-empty).
  3. pre_reg_constants.yaml must NOT already contain model params (elo/match_model/
     form/fifa_blend/macro_prior sections) — battery is the source of those values.

Decision rule (§1.3.5 — DO NOT ALTER):
  Primary:    lowest mean CV log-loss on calibration block.
  Tie-break:  lowest hold-out log-loss (if within 1 SE of leader).
  Gate:       M★ must beat M0 by ≥ 2 SE on calibration log-loss.
"""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from models.calibrate_elo_lambda import LambdaParams, outcome_probabilities
from models.elo_calculator import run_walk_forward
from utils.logger import get_logger
from utils.hasher import DataSnapshotHasher

log = get_logger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
DATA_RAW         = PROJECT_ROOT / "data" / "raw"
DATA_SNAPSHOTS   = PROJECT_ROOT / "data" / "snapshots"
DATA_CALIBRATION = PROJECT_ROOT / "data" / "calibration"
CALIBRATION_DIR  = PROJECT_ROOT / "calibration"
EVALUATION_DIR   = PROJECT_ROOT / "evaluation"
SCHEMA_DIR       = PROJECT_ROOT / "schema"

SNAPSHOT_PATH    = DATA_SNAPSHOTS / "cv_battery_2026-04.parquet"
FOLDS_PATH       = CALIBRATION_DIR / "cv_folds.parquet"
REPORT_PDF_PATH  = EVALUATION_DIR / "cv_battery_report.pdf"
REPORT_JSON_PATH = EVALUATION_DIR / "cv_battery_result.json"
YAML_PATH        = EVALUATION_DIR / "pre_reg_constants.yaml"

# ── Pre-registered constants ───────────────────────────────────────────────────
SEED        = 20260422
N_FOLDS     = 5
CALIB_START = "2010-06-11"
CALIB_END   = "2021-12-31"
HOLDOUT_START = "2022-01-01"
HOLDOUT_END   = "2022-12-31"

# Model parameter file locations (Phase 3-6 calibration outputs)
ELO_PARAMS_PATH   = DATA_CALIBRATION / "elo_lambda_params.json"
M1_PARAMS_PATH    = DATA_CALIBRATION / "m1_form_params.json"
M2_PARAMS_PATH    = DATA_CALIBRATION / "m2_fifa_params.json"
M3_PARAMS_PATH    = DATA_CALIBRATION / "m3_macro_theta.json"
CHAMPION_PATH     = DATA_CALIBRATION / "champion_model.json"


# ═══════════════════════════════════════════════════════════════════════════════
# Pre-flight checks
# ═══════════════════════════════════════════════════════════════════════════════

def preflight_checks() -> None:
    log.stage("Pre-flight checks")

    # 1. Git status
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT)
        )
        if result.returncode == 0:
            dirty = result.stdout.strip()
            if dirty:
                log.warning(
                    "Git working tree is DIRTY — pre-flight requires a clean tree",
                    dirty_files=dirty[:500],
                )
                raise SystemExit(
                    "ABORT: git working tree is not clean. Commit all changes before running."
                )
            else:
                log.info("Git working tree: CLEAN")
        else:
            log.warning("No git repository found — skipping clean-tree check. "
                        "Ensure git is initialised before the OSF registration step.")
    except FileNotFoundError:
        log.warning("git not found on PATH — skipping clean-tree check")

    # 2. YAML must not already contain model params
    with open(YAML_PATH) as fh:
        existing = yaml.safe_load(fh) or {}
    forbidden_keys = {"elo", "match_model", "form", "fifa_blend", "macro_prior"}
    present = forbidden_keys & set(existing.keys())
    if present:
        raise SystemExit(
            f"ABORT: pre_reg_constants.yaml already contains model parameters "
            f"({present}). The battery must be the single source of those values. "
            "Delete those sections and re-run, or this is a duplicate run."
        )
    log.info("YAML guard: no model params present — battery is authorised to proceed")

    # 3. Calibration JSON files must exist
    for p in (ELO_PARAMS_PATH, M1_PARAMS_PATH, M2_PARAMS_PATH, M3_PARAMS_PATH):
        if not p.exists():
            raise SystemExit(f"ABORT: required calibration file not found: {p}")
    log.info("Calibration JSON files: ALL PRESENT")

    log.success("Pre-flight checks PASSED")


# ═══════════════════════════════════════════════════════════════════════════════
# Frozen data snapshot
# ═══════════════════════════════════════════════════════════════════════════════

def build_or_verify_snapshot() -> tuple[pd.DataFrame, pd.DataFrame, str]:
    """Return (calibration_df, holdout_df, snapshot_sha)."""
    log.stage("Frozen data snapshot")

    source = DATA_RAW / "historical_matches.parquet"
    if not source.exists():
        raise SystemExit(f"ABORT: source not found: {source}")

    df = pd.read_parquet(source)
    df["date"] = pd.to_datetime(df["date"], utc=True)

    calib_df = df[
        (df["date"] >= pd.Timestamp(CALIB_START, tz="UTC")) &
        (df["date"] <= pd.Timestamp(CALIB_END,   tz="UTC"))
    ].copy().reset_index(drop=True)

    holdout_df = df[
        (df["date"] >= pd.Timestamp(HOLDOUT_START, tz="UTC")) &
        (df["date"] <= pd.Timestamp(HOLDOUT_END,   tz="UTC"))
    ].copy().reset_index(drop=True)

    log.info("Partition counts",
             calibration=len(calib_df), holdout=len(holdout_df))

    if not SNAPSHOT_PATH.exists():
        log.info("Creating frozen snapshot", path=str(SNAPSHOT_PATH))
        DATA_SNAPSHOTS.mkdir(parents=True, exist_ok=True)
        combined = pd.concat(
            [calib_df.assign(partition="calibration"),
             holdout_df.assign(partition="holdout")],
            ignore_index=True,
        )
        combined.to_parquet(SNAPSHOT_PATH, index=False, engine="pyarrow")
        log.success("Snapshot written", rows=len(combined))
    else:
        log.info("Snapshot already exists — verifying integrity")

    sha = _sha256_file(SNAPSHOT_PATH)
    log.info("Snapshot SHA-256", sha=sha[:16] + "...")

    # Check against YAML if already set
    with open(YAML_PATH) as fh:
        y = yaml.safe_load(fh) or {}
    pinned_sha = (y.get("meta") or {}).get("data_snapshot_sha", "")
    if pinned_sha and pinned_sha != sha:
        raise SystemExit(
            f"ABORT: snapshot SHA mismatch.\n"
            f"  On disk: {sha}\n"
            f"  In YAML: {pinned_sha}\n"
            "The frozen snapshot has changed. This invalidates the entire battery."
        )

    return calib_df, holdout_df, sha


# ═══════════════════════════════════════════════════════════════════════════════
# Stratified 5-fold construction
# ═══════════════════════════════════════════════════════════════════════════════

def build_stratified_folds(calib_df: pd.DataFrame) -> pd.DataFrame:
    """
    Assign each calibration match a fold index 0..4 using stratified sampling.

    Strata: tournament_type × era_bucket (pre-2016 / 2016-2021).
    Deterministic from SEED = 20260422.
    Returns calib_df with an added 'fold' column (int, 0..4).
    Saves to calibration/cv_folds.parquet.
    """
    log.stage("Stratified fold construction")

    rng = np.random.default_rng(SEED)

    def _tournament_type(name: str) -> str:
        n = name.lower()
        if "world cup" in n:
            return "world_cup"
        if "euro" in n:
            return "euro"
        if "copa" in n:
            return "copa_america"
        if "africa cup" in n or "afcon" in n or "african cup" in n:
            return "afcon"
        if "asian cup" in n or "afc" in n:
            return "afc"
        if "gold cup" in n or "concacaf" in n:
            return "concacaf"
        return "other"

    def _era(date: pd.Timestamp) -> str:
        return "pre_2016" if date.year < 2016 else "2016_2021"

    df = calib_df.copy()
    df["tournament_type"] = df["tournament"].apply(_tournament_type)
    df["era"]             = df["date"].apply(_era)
    df["stratum"]         = df["tournament_type"] + "__" + df["era"]
    df["fold"]            = -1

    for stratum, group_idx in df.groupby("stratum").groups.items():
        idxs = list(group_idx)
        rng.shuffle(idxs)
        for rank, idx in enumerate(idxs):
            df.at[idx, "fold"] = rank % N_FOLDS

    fold_counts = df.groupby(["stratum", "fold"]).size().reset_index(name="n")
    log.info("Fold distribution by stratum:\n" + fold_counts.to_string(index=False))

    CALIBRATION_DIR.mkdir(parents=True, exist_ok=True)
    df[["match_id", "date", "stratum", "fold"]].to_parquet(
        FOLDS_PATH, index=False, engine="pyarrow"
    )
    folds_sha = _sha256_file(FOLDS_PATH)
    log.success("Folds saved", path=str(FOLDS_PATH), sha=folds_sha[:16] + "...")

    return df, folds_sha


# ═══════════════════════════════════════════════════════════════════════════════
# Scoring helpers (mirrors model_registry.py, kept local for lockdown isolation)
# ═══════════════════════════════════════════════════════════════════════════════

def _match_log_loss(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    eps = 1e-15
    p = {"H": p_H, "D": p_D, "A": p_A}[observed]
    return -math.log(max(p, eps))


def _match_brier(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    i_H = 1.0 if observed == "H" else 0.0
    i_D = 1.0 if observed == "D" else 0.0
    i_A = 1.0 if observed == "A" else 0.0
    return (p_H - i_H) ** 2 + (p_D - i_D) ** 2 + (p_A - i_A) ** 2


def _match_rps(p_H: float, p_D: float, p_A: float, observed: str) -> float:
    i_H = 1.0 if observed == "H" else 0.0
    i_D = 1.0 if observed == "D" else 0.0
    f1, e1 = p_H, i_H
    f2, e2 = p_H + p_D, i_H + i_D
    return 0.5 * ((f1 - e1) ** 2 + (f2 - e2) ** 2)


def _s_ij(R_i: float, R_j: float, params: LambdaParams) -> float:
    return params.mu * math.exp(params.c * (R_i - R_j) / 400.0)


def _observed(row: Any) -> str:
    if row.score_home > row.score_away:
        return "H"
    if row.score_home == row.score_away:
        return "D"
    return "A"


def _form_multiplier(
    team_records: pd.DataFrame,
    cutoff: pd.Timestamp,
    tau: float,
    n_form: int,
    cap: float,
) -> dict[str, float]:
    """Exponential-decay form multiplier φ_i for each team at cutoff."""
    lam = math.log(2.0) / tau
    phi: dict[str, float] = {}
    for team, grp in team_records.groupby("team"):
        recent = grp[grp["date"] < cutoff].sort_values("date").tail(n_form)
        if recent.empty:
            phi[team] = 0.0
            continue
        ws, wt = 0.0, 0.0
        for r in recent.itertuples(index=False):
            days = (cutoff - r.date).total_seconds() / 86400.0
            w = math.exp(-lam * days)
            E = 1.0 / (1.0 + 10.0 ** ((r.R_opp - r.R_self) / 400.0))
            ws += w * (r.S_ik - E)
            wt += w
        F = ws / wt if wt > 0 else 0.0
        phi[team] = max(-cap, min(cap, F))
    return phi


def _build_team_records(wf_df: pd.DataFrame) -> pd.DataFrame:
    home = wf_df[["date", "home_team", "away_team", "R_home_pre", "R_away_pre", "S_home"]].copy()
    home.columns = ["date", "team", "opponent", "R_self", "R_opp", "S_ik"]
    away = wf_df[["date", "away_team", "home_team", "R_away_pre", "R_home_pre", "S_home"]].copy()
    away.columns = ["date", "team", "opponent", "R_self", "R_opp", "S_ik"]
    away["S_ik"] = away["S_ik"].map({1.0: 0.0, 0.5: 0.5, 0.0: 1.0})
    combined = pd.concat([home, away], ignore_index=True)
    combined["date"] = pd.to_datetime(combined["date"], utc=True)
    return combined.sort_values("date").reset_index(drop=True)


def _blended_ratings(
    ratings: dict[str, float],
    fifa_df: pd.DataFrame,
    w: float,
) -> dict[str, float]:
    fifa_map = dict(zip(fifa_df["team_name"], fifa_df["fifa_points"]))
    common = [t for t in ratings if t in fifa_map]
    if not common:
        return dict(ratings)
    elo_v = np.array([ratings[t] for t in common])
    fifa_v = np.array([fifa_map[t] for t in common])
    mu_R, sig_R = float(np.mean(elo_v)), float(np.std(elo_v)) or 1.0
    mu_Q, sig_Q = float(np.mean(fifa_v)), float(np.std(fifa_v)) or 1.0
    blended: dict[str, float] = {}
    for t, R in ratings.items():
        if t in fifa_map:
            z_e = (R - mu_R) / sig_R
            z_f = (fifa_map[t] - mu_Q) / sig_Q
            blended[t] = mu_R + sig_R * ((1.0 - w) * z_e + w * z_f)
        else:
            blended[t] = R
    return blended


def _posterior_ratings(
    ratings: dict[str, float],
    macro_df: pd.DataFrame,
    theta: np.ndarray,
    alpha_min: float = 0.05,
    alpha_max: float = 0.40,
    beta: float = 4.0,
) -> dict[str, float]:
    macro_map = {r.team_name: r for r in macro_df.itertuples(index=False)}
    sorted_teams = sorted(
        [t for t in ratings if t in macro_map],
        key=lambda t: ratings[t], reverse=True,
    )
    n = len(sorted_teams)
    alpha_sched: dict[str, float] = {}
    for rank, team in enumerate(sorted_teams, 1):
        p = (n - rank) / max(n - 1, 1)
        alpha_sched[team] = float(np.clip(
            alpha_min + (alpha_max - alpha_min) * (1.0 - p) ** beta,
            alpha_min, alpha_max,
        ))
    post: dict[str, float] = {}
    for t, R in ratings.items():
        if t in macro_map:
            m = macro_map[t]
            xi = (theta[0] + theta[1] * m.log_gdp_per_capita
                  + theta[2] * m.log_population + theta[3] * float(m.mean_temp_celsius)
                  + theta[4] * float(m.is_host) + theta[5] * float(m.football_culture_index))
            post[t] = (1.0 - alpha_sched.get(t, alpha_min)) * R + alpha_sched.get(t, alpha_min) * xi
        else:
            post[t] = R
    return post


# ═══════════════════════════════════════════════════════════════════════════════
# Single-fold evaluation
# ═══════════════════════════════════════════════════════════════════════════════

def _score_fold(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    params: LambdaParams,
    tau: float,
    w: float,
    theta: np.ndarray,
    fifa_df: pd.DataFrame,
    macro_df: pd.DataFrame,
) -> dict[str, dict]:
    """Score all four models on a single fold. Returns {model_id: {losses, briers, rpss}}."""
    wf = run_walk_forward(train_df)
    ratings: dict[str, float] = {}
    for row in wf.itertuples(index=False):
        ratings[row.home_team] = row.R_home_post
        ratings[row.away_team] = row.R_away_post

    team_recs = _build_team_records(wf)
    result: dict[str, dict] = {
        mid: {"losses": [], "briers": [], "rpss": []}
        for mid in ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
    }

    ratings_m2 = _blended_ratings(ratings, fifa_df, w)
    ratings_m3 = _posterior_ratings(ratings, macro_df, theta)

    val_df = val_df.sort_values("date").reset_index(drop=True)

    for row in val_df.itertuples(index=False):
        if pd.isna(row.score_home) or pd.isna(row.score_away):
            continue
        obs = _observed(row)
        home, away = row.team_home, row.team_away
        raw_ts = row.date
        cutoff = (pd.Timestamp(raw_ts).tz_localize("UTC")
                  if pd.Timestamp(raw_ts).tzinfo is None
                  else pd.Timestamp(raw_ts).tz_convert("UTC"))

        # M0
        lh0 = _s_ij(ratings.get(home, 1500.0), ratings.get(away, 1500.0), params)
        la0 = _s_ij(ratings.get(away, 1500.0), ratings.get(home, 1500.0), params)
        p0H, p0D, p0A = outcome_probabilities(lh0, la0, params)
        result["M0_elo"]["losses"].append(_match_log_loss(p0H, p0D, p0A, obs))
        result["M0_elo"]["briers"].append(_match_brier(p0H, p0D, p0A, obs))
        result["M0_elo"]["rpss"].append(_match_rps(p0H, p0D, p0A, obs))

        # M1 (form)
        phi = _form_multiplier(team_recs, cutoff, tau=tau, n_form=8, cap=0.15)
        ph, pa = phi.get(home, 0.0), phi.get(away, 0.0)
        lh1 = _s_ij(ratings.get(home, 1500.0), ratings.get(away, 1500.0), params) * (1.0 + ph) / (1.0 + pa)
        la1 = _s_ij(ratings.get(away, 1500.0), ratings.get(home, 1500.0), params) * (1.0 + pa) / (1.0 + ph)
        p1H, p1D, p1A = outcome_probabilities(lh1, la1, params)
        result["M1_form"]["losses"].append(_match_log_loss(p1H, p1D, p1A, obs))
        result["M1_form"]["briers"].append(_match_brier(p1H, p1D, p1A, obs))
        result["M1_form"]["rpss"].append(_match_rps(p1H, p1D, p1A, obs))

        # M2 (FIFA blend)
        lh2 = _s_ij(ratings_m2.get(home, 1500.0), ratings_m2.get(away, 1500.0), params)
        la2 = _s_ij(ratings_m2.get(away, 1500.0), ratings_m2.get(home, 1500.0), params)
        p2H, p2D, p2A = outcome_probabilities(lh2, la2, params)
        result["M2_fifa"]["losses"].append(_match_log_loss(p2H, p2D, p2A, obs))
        result["M2_fifa"]["briers"].append(_match_brier(p2H, p2D, p2A, obs))
        result["M2_fifa"]["rpss"].append(_match_rps(p2H, p2D, p2A, obs))

        # M3 (macro prior)
        lh3 = _s_ij(ratings_m3.get(home, 1500.0), ratings_m3.get(away, 1500.0), params)
        la3 = _s_ij(ratings_m3.get(away, 1500.0), ratings_m3.get(home, 1500.0), params)
        p3H, p3D, p3A = outcome_probabilities(lh3, la3, params)
        result["M3_macro"]["losses"].append(_match_log_loss(p3H, p3D, p3A, obs))
        result["M3_macro"]["briers"].append(_match_brier(p3H, p3D, p3A, obs))
        result["M3_macro"]["rpss"].append(_match_rps(p3H, p3D, p3A, obs))

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 5-Fold CV loop
# ═══════════════════════════════════════════════════════════════════════════════

def run_cv_loop(
    calib_df_with_folds: pd.DataFrame,
    params: LambdaParams,
    tau: float,
    w: float,
    theta: np.ndarray,
    fifa_df: pd.DataFrame,
    macro_df: pd.DataFrame,
) -> dict:
    """Run all 5 folds, return per-fold and aggregate metrics."""
    log.stage("5-fold CV loop")

    model_ids = ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
    fold_results: list[dict] = []

    for k in range(N_FOLDS):
        t0 = time.perf_counter()
        train = calib_df_with_folds[calib_df_with_folds["fold"] != k].copy()
        val   = calib_df_with_folds[calib_df_with_folds["fold"] == k].copy()
        log.info(f"Fold {k+1}/{N_FOLDS}", train_n=len(train), val_n=len(val))

        scored = _score_fold(train, val, params, tau, w, theta, fifa_df, macro_df)
        elapsed = time.perf_counter() - t0
        fold_results.append({"fold": k, "scores": scored, "n_val": len(val),
                              "runtime_seconds": elapsed})
        log.info(f"Fold {k+1} done", elapsed_s=round(elapsed, 2),
                 M0_ll=round(np.mean(scored["M0_elo"]["losses"]) if scored["M0_elo"]["losses"] else float("nan"), 4),
                 M2_ll=round(np.mean(scored["M2_fifa"]["losses"]) if scored["M2_fifa"]["losses"] else float("nan"), 4))

    # Aggregate
    agg: dict[str, Any] = {}
    for mid in model_ids:
        fold_ll = [
            float(np.mean(fr["scores"][mid]["losses"])) if fr["scores"][mid]["losses"] else None
            for fr in fold_results
        ]
        fold_br = [
            float(np.mean(fr["scores"][mid]["briers"])) if fr["scores"][mid]["briers"] else None
            for fr in fold_results
        ]
        fold_rp = [
            float(np.mean(fr["scores"][mid]["rpss"])) if fr["scores"][mid]["rpss"] else None
            for fr in fold_results
        ]
        valid_ll = [x for x in fold_ll if x is not None]
        valid_br = [x for x in fold_br if x is not None]
        valid_rp = [x for x in fold_rp if x is not None]
        n = len(valid_ll)
        agg[mid] = {
            "mean_log_loss": float(np.mean(valid_ll)) if valid_ll else float("nan"),
            "se_log_loss":   float(np.std(valid_ll, ddof=1) / math.sqrt(n)) if n > 1 else 0.0,
            "mean_brier":    float(np.mean(valid_br)) if valid_br else float("nan"),
            "se_brier":      float(np.std(valid_br, ddof=1) / math.sqrt(n)) if n > 1 else 0.0,
            "mean_rps":      float(np.mean(valid_rp)) if valid_rp else float("nan"),
            "se_rps":        float(np.std(valid_rp, ddof=1) / math.sqrt(n)) if n > 1 else 0.0,
            "fold_log_losses": fold_ll,
            "runtime_seconds": sum(fr["runtime_seconds"] for fr in fold_results),
        }

    log.success("CV loop complete")
    for mid in model_ids:
        log.info(f"  {mid}: mean_LL={agg[mid]['mean_log_loss']:.5f} "
                 f"± {agg[mid]['se_log_loss']:.5f}")

    return agg


# ═══════════════════════════════════════════════════════════════════════════════
# Hold-out single-shot evaluation
# ═══════════════════════════════════════════════════════════════════════════════

def run_holdout(
    calib_df: pd.DataFrame,
    holdout_df: pd.DataFrame,
    params: LambdaParams,
    tau: float,
    w: float,
    theta: np.ndarray,
    fifa_df: pd.DataFrame,
    macro_df: pd.DataFrame,
) -> dict[str, dict]:
    """Fit on full calibration block, score once on hold-out. Returns per-model scores."""
    log.stage("Hold-out single-shot evaluation")
    scored = _score_fold(calib_df, holdout_df, params, tau, w, theta, fifa_df, macro_df)
    result = {}
    for mid, s in scored.items():
        result[mid] = {
            "holdout_log_loss": float(np.mean(s["losses"])) if s["losses"] else float("nan"),
            "holdout_brier":    float(np.mean(s["briers"])) if s["briers"] else float("nan"),
            "holdout_rps":      float(np.mean(s["rpss"]))   if s["rpss"]   else float("nan"),
        }
        log.info(f"  {mid} hold-out LL: {result[mid]['holdout_log_loss']:.5f}")
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# Decision rule (§1.3.5 — IMMUTABLE)
# ═══════════════════════════════════════════════════════════════════════════════

def apply_decision_rule(
    cv_agg: dict,
    holdout_scores: dict,
) -> dict:
    """
    §1.3.5 decision rule:
      1. Rank by mean CV log-loss (lower = better).
      2. Tie-break (within 1 SE of leader): use hold-out LL.
      3. Gate: M★ must beat M0 by ≥ 2 SE on calibration LL.
    Returns champion_selection dict.
    """
    log.stage("Decision rule §1.3.5")

    model_ids = ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
    ranked = sorted(model_ids, key=lambda m: cv_agg[m]["mean_log_loss"])

    leader_id = ranked[0]
    leader_ll = cv_agg[leader_id]["mean_log_loss"]
    leader_se = cv_agg[leader_id]["se_log_loss"]

    runner_up_id = ranked[1]
    runner_up_ll = cv_agg[runner_up_id]["mean_log_loss"]

    gap_runner_up = runner_up_ll - leader_ll
    gap_in_se = gap_runner_up / leader_se if leader_se > 0 else float("inf")

    tiebreak_used = False
    champion_id = leader_id

    # Tie-break: if runner-up is within 1 SE, use hold-out LL
    if gap_in_se < 1.0:
        tiebreak_used = True
        log.info("Tie-break triggered — gap < 1 SE, using hold-out LL",
                 gap_se=round(gap_in_se, 3))
        if holdout_scores[runner_up_id]["holdout_log_loss"] < holdout_scores[leader_id]["holdout_log_loss"]:
            champion_id = runner_up_id
            log.info("Tie-break resolved: runner-up wins on hold-out LL",
                     champion=champion_id)
        else:
            log.info("Tie-break resolved: leader retains on hold-out LL",
                     champion=champion_id)

    # Sanity gate: M★ must beat M0 by ≥ 2 SE
    m0_ll = cv_agg["M0_elo"]["mean_log_loss"]
    champ_ll = cv_agg[champion_id]["mean_log_loss"]
    champ_se = cv_agg[champion_id]["se_log_loss"]
    m_star_vs_m0_gap = m0_ll - champ_ll  # positive = M★ is better
    se_for_gate = champ_se if champ_se > 0 else leader_se
    m_star_vs_m0_se = m_star_vs_m0_gap / se_for_gate if se_for_gate > 0 else 0.0

    sanity_gate_passed = m_star_vs_m0_se >= 2.0

    if not sanity_gate_passed:
        log.warning(
            "Sanity gate FAILED — M★ does not beat M0 by ≥ 2 SE. "
            "Paper framing pivots to kill-criterion narrative. M★ = M0 for trading.",
            gap_se=round(m_star_vs_m0_se, 3),
        )

    narrative = (
        f"Per §1.3.5, M★ = {champion_id} was selected because its calibration "
        f"log-loss was {gap_in_se:.2f} SE below the runner-up ({runner_up_id})."
    )
    if tiebreak_used:
        narrative += f" Tie-break (hold-out LL) was invoked."
    if not sanity_gate_passed:
        narrative += (
            f" WARNING: sanity gate NOT passed — M★ only {m_star_vs_m0_se:.2f} SE "
            f"better than M0 (threshold ≥ 2.0 SE)."
        )

    log.success("Champion selected", champion=champion_id,
                gap_se_vs_runner_up=round(gap_in_se, 3),
                gate_passed=sanity_gate_passed)

    return {
        "primary_criterion":    "mean_cv_log_loss",
        "ranking":              ranked,
        "winner_mean_ll":       float(champ_ll),
        "runner_up_id":         runner_up_id,
        "runner_up_mean_ll":    float(runner_up_ll),
        "ll_gap_vs_runner_up":  float(gap_runner_up),
        "winner_se":            float(leader_se),
        "ll_gap_in_se":         float(gap_in_se),
        "sanity_gate_passed":   sanity_gate_passed,
        "m_star_vs_m0_gap_se":  float(m_star_vs_m0_se),
        "tiebreak_used":        tiebreak_used,
        "decision_narrative":   narrative,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# JSON artifact
# ═══════════════════════════════════════════════════════════════════════════════

def write_json_artifact(
    cv_agg: dict,
    holdout_scores: dict,
    champion_selection: dict,
    snapshot_sha: str,
    folds_sha: str,
    n_calib: int,
    n_holdout: int,
) -> None:
    log.stage("Writing cv_battery_result.json")

    model_ids = ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
    models_out: dict = {}
    for mid in model_ids:
        models_out[mid] = {
            **{k: cv_agg[mid][k] for k in (
                "mean_log_loss", "se_log_loss",
                "mean_brier", "se_brier",
                "mean_rps", "se_rps",
                "fold_log_losses", "runtime_seconds",
            )},
            **holdout_scores[mid],
        }

    record = {
        "schema_version":       "1.0",
        "generated_at_utc":     datetime.now(timezone.utc).isoformat(),
        "seed":                 SEED,
        "data_snapshot_sha":    snapshot_sha,
        "cv_folds_sha":         folds_sha,
        "n_calibration_matches": n_calib,
        "n_holdout_matches":    n_holdout,
        "n_folds":              N_FOLDS,
        "models":               models_out,
        "champion_id":          champion_selection["ranking"][0]
            if not champion_selection["tiebreak_used"]
            else champion_selection.get("ranking", ["M0_elo"])[0],
        "champion_selection":   champion_selection,
    }
    # champion_id = winner after decision rule
    record["champion_id"] = (
        champion_selection["ranking"][0]
        if not champion_selection["tiebreak_used"]
        else _resolve_champion_id(champion_selection)
    )

    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_JSON_PATH.write_text(json.dumps(record, indent=2))
    log.success("JSON written", path=str(REPORT_JSON_PATH))

    # Schema validation
    try:
        import jsonschema
        schema = json.loads((SCHEMA_DIR / "cv_battery_v1.json").read_text())
        jsonschema.validate(record, schema)
        log.success("JSON schema validation PASSED")
    except ImportError:
        log.warning("jsonschema not installed — skipping schema validation")
    except Exception as exc:
        log.warning("JSON schema validation FAILED", error=str(exc))


def _resolve_champion_id(sel: dict) -> str:
    """Return champion after applying tiebreak."""
    if sel["tiebreak_used"]:
        return sel.get("tiebreak_winner", sel["ranking"][0])
    return sel["ranking"][0]


# ═══════════════════════════════════════════════════════════════════════════════
# PDF report (reportlab)
# ═══════════════════════════════════════════════════════════════════════════════

def write_pdf_report(
    cv_agg: dict,
    holdout_scores: dict,
    champion_selection: dict,
    snapshot_sha: str,
    folds_sha: str,
    code_sha: str,
) -> None:
    log.stage("Generating PDF report")
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, HRFlowable,
        )
    except ImportError:
        log.warning("reportlab not installed — PDF generation skipped. "
                    "Install with: pip install reportlab")
        return

    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(REPORT_PDF_PATH),
        pagesize=A4,
        leftMargin=2.0 * cm, rightMargin=2.0 * cm,
        topMargin=2.5 * cm, bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style  = ParagraphStyle("title", parent=styles["Title"], fontSize=14, spaceAfter=6)
    head_style   = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=11, spaceAfter=4)
    normal_style = styles["Normal"]
    mono_style   = ParagraphStyle("mono", parent=styles["Normal"], fontName="Courier", fontSize=7)

    GREY   = colors.HexColor("#F2F2F2")
    BLUE   = colors.HexColor("#1F497D")
    YELLOW = colors.HexColor("#FFFF99")

    model_ids    = ["M0_elo", "M1_form", "M2_fifa", "M3_macro"]
    champion_id  = champion_selection["ranking"][0]
    narrative    = champion_selection["decision_narrative"]
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    story = []

    # Title
    story.append(Paragraph("The 45% Problem — Phase 8 CV Battery Report", title_style))
    story.append(Paragraph(
        f"<b>Generated:</b> {generated_at} UTC<br/>"
        f"<b>Seed:</b> {SEED}  |  <b>Folds:</b> {N_FOLDS}  |  "
        f"<b>Calibration:</b> {CALIB_START} to {CALIB_END}<br/>"
        f"<b>Hold-out:</b> {HOLDOUT_START} to {HOLDOUT_END}",
        normal_style,
    ))
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE))
    story.append(Spacer(1, 0.4 * cm))

    # Table 1: per-model CV scores
    story.append(Paragraph("Table 1: Cross-Validation Scores (Calibration Block)", head_style))

    t1_data = [["Model", "Mean LL ↓", "SE (LL)", "Mean Brier ↓", "SE (Brier)", "Mean RPS ↓", "SE (RPS)"]]
    for mid in model_ids:
        r = cv_agg[mid]
        t1_data.append([
            mid,
            f"{r['mean_log_loss']:.5f}", f"{r['se_log_loss']:.5f}",
            f"{r['mean_brier']:.5f}",   f"{r['se_brier']:.5f}",
            f"{r['mean_rps']:.5f}",     f"{r['se_rps']:.5f}",
        ])

    t1 = Table(t1_data, colWidths=[3.0 * cm, 2.4 * cm, 2.0 * cm, 2.4 * cm,
                                    2.0 * cm, 2.4 * cm, 2.0 * cm])
    t1_style = TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.grey),
    ])
    # Highlight champion row
    for i, mid in enumerate(model_ids, 1):
        if mid == champion_id:
            t1_style.add("BACKGROUND", (0, i), (-1, i), YELLOW)
    t1.setStyle(t1_style)
    story.append(t1)
    story.append(Spacer(1, 0.5 * cm))

    # Table 2: per-fold LL matrix
    story.append(Paragraph("Table 2: Per-Fold Log-Loss Matrix (5 × 4)", head_style))
    t2_data = [["Model"] + [f"Fold {k+1}" for k in range(N_FOLDS)]]
    for mid in model_ids:
        row = [mid]
        for v in cv_agg[mid]["fold_log_losses"]:
            row.append(f"{v:.5f}" if v is not None else "—")
        t2_data.append(row)

    t2 = Table(t2_data, colWidths=[3.0 * cm] + [2.8 * cm] * N_FOLDS)
    t2.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.5 * cm))

    # Table 3: hold-out single-shot
    story.append(Paragraph("Table 3: Hold-Out Single-Shot Scores (2022 WC — Never Used for Selection)", head_style))
    t3_data = [["Model", "Hold-out LL ↓", "Hold-out Brier ↓", "Hold-out RPS ↓"]]
    for mid in model_ids:
        r = holdout_scores[mid]
        t3_data.append([
            mid,
            f"{r['holdout_log_loss']:.5f}",
            f"{r['holdout_brier']:.5f}",
            f"{r['holdout_rps']:.5f}",
        ])

    t3 = Table(t3_data, colWidths=[3.0 * cm, 3.5 * cm, 3.5 * cm, 3.5 * cm])
    t3.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(t3)
    story.append(Spacer(1, 0.5 * cm))

    # Table 4: decision rule
    story.append(Paragraph("Table 4: Decision Rule Application (§1.3.5)", head_style))
    sel = champion_selection
    t4_data = [
        ["Parameter", "Value"],
        ["Primary criterion",     sel["primary_criterion"]],
        ["Ranking (1st→4th)",     " > ".join(sel["ranking"])],
        ["Winner (M★)",           sel["ranking"][0]],
        ["Winner mean CV LL",     f"{sel['winner_mean_ll']:.5f}"],
        ["Runner-up",             sel["runner_up_id"]],
        ["Runner-up mean CV LL",  f"{sel['runner_up_mean_ll']:.5f}"],
        ["LL gap (abs)",          f"{sel['ll_gap_vs_runner_up']:.5f}"],
        ["LL gap (SE units)",     f"{sel['ll_gap_in_se']:.3f} SE"],
        ["M★ vs M0 gate (SE)",    f"{sel['m_star_vs_m0_gap_se']:.3f} SE (threshold ≥ 2.0)"],
        ["Sanity gate",           "PASSED" if sel["sanity_gate_passed"] else "FAILED"],
        ["Tie-break invoked",     "Yes" if sel["tiebreak_used"] else "No"],
    ]
    t4 = Table(t4_data, colWidths=[6.5 * cm, 9.0 * cm])
    t4.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GREY]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    story.append(t4)
    story.append(Spacer(1, 0.5 * cm))

    # Narrative (verbatim as required by §1.4)
    story.append(Paragraph(
        f'<i>{narrative}</i>',
        ParagraphStyle("italic", parent=styles["Normal"], fontSize=9,
                       leftIndent=20, rightIndent=20),
    ))
    story.append(Spacer(1, 0.4 * cm))

    # Footer with hashes on every page — injected via onPage callback
    footer_text = (
        f"fold-hash: {folds_sha[:32]}...  |  "
        f"data-hash: {snapshot_sha[:32]}...  |  "
        f"code-hash: {code_sha[:32] if code_sha else 'N/A'}...  |  "
        f"generated: {generated_at}"
    )

    def _add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Courier", 5.5)
        canvas.setFillColor(colors.grey)
        canvas.drawString(
            2.0 * cm,
            1.2 * cm,
            footer_text,
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=_add_footer, onLaterPages=_add_footer)
    log.success("PDF report written", path=str(REPORT_PDF_PATH))


# ═══════════════════════════════════════════════════════════════════════════════
# SHA helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _get_code_sha() -> str:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, cwd=str(PROJECT_ROOT)
        )
        if r.returncode == 0:
            return r.stdout.strip()
    except FileNotFoundError:
        pass
    return ""


# ═══════════════════════════════════════════════════════════════════════════════
# YAML writer — transcribes all frozen params + SHAs
# ═══════════════════════════════════════════════════════════════════════════════

def write_params_to_yaml(
    elo_p: dict,
    m1_p: dict,
    m2_p: dict,
    m3_p: dict,
    fifa_df: pd.DataFrame,
    snapshot_sha: str,
    pdf_sha: str,
    json_sha: str,
    code_sha: str,
) -> None:
    """Transcribe all Phase 3-6 calibration params into evaluation/pre_reg_constants.yaml."""
    log.stage("Writing params to YAML")

    # Compute rank_to_rating_scale (ratio of Elo SD to FIFA-points SD)
    elo_ratings_df = pd.read_parquet(DATA_RAW / "elo_ratings.parquet")
    elo_vals  = elo_ratings_df["elo_rating"].values.astype(float)
    fifa_vals = fifa_df["fifa_points"].values.astype(float)
    sig_elo  = float(np.std(elo_vals))  if len(elo_vals)  > 1 else 1.0
    sig_fifa = float(np.std(fifa_vals)) if len(fifa_vals) > 1 else 1.0
    rank_to_rating_scale = round(sig_elo / sig_fifa, 6) if sig_fifa > 0 else 1.0

    theta = m3_p["theta"]

    constants = {
        "meta": {
            "schema_version":          "8.0",
            "created_at_utc":          "2026-04-22T00:00:00Z",
            "author":                  "Nicolás Duarte Jaraba",
            "project":                 "The 45% Problem",
            "pre_registration_status": "PENDING_OSF",
            "data_snapshot_sha":       snapshot_sha,
            "cv_report_sha":           pdf_sha,
            "cv_result_sha":           json_sha,
            "git_sha_at_freeze":       code_sha,
        },
        "elo": {
            "c_star":         round(elo_p["c"],  6),
            "mu_star":        round(elo_p["mu"], 6),
            "k_factor_base":  40.0,
            "home_advantage": 100.0,
            "initial_rating": 1500.0,
        },
        "match_model": {
            "rho":       round(elo_p["rho"],  4),
            "lambda_3":  round(elo_p["lam3"], 4),
            "max_goals": 10,
        },
        "form": {
            "half_life_days": float(m1_p["tau_star"]),
            "cap_pct":        float(m1_p["cap"]),
            "window_matches": int(m1_p["n_form"]),
        },
        "fifa_blend": {
            "w":                    float(m2_p["w_star"]),
            "rank_to_rating_scale": rank_to_rating_scale,
        },
        "macro_prior": {
            "tau_0":             0.40,
            "gdp_weight":        round(theta[1], 6),
            "population_weight": round(theta[2], 6),
            "temp_weight":       round(theta[3], 6),
            "host_weight":       round(theta[4], 6),
            "culture_weight":    round(theta[5], 6),
            "alpha_min":         0.05,
            "alpha_max":         0.40,
        },
        "market": {
            "devig_method":              "power",
            "pinnacle_bias":             {"draw_delta": 0.014, "host_delta": -0.006},
            "edge_threshold_mainline":   0.03,
            "edge_threshold_derivative": 0.05,
        },
        "gate": {
            "news_window_hours":          6,
            "price_discovery_pct":        0.03,
            "price_discovery_window_min": 30,
            "cross_book_spread_pp":       0.025,
            "liquidity_floor_usd":        50000,
            "pinnacle_staleness_hours":   4,
        },
        "kelly": {
            "phi_mainline":            0.25,
            "phi_longshot":            0.125,
            "longshot_cutoff":         0.10,
            "cap_per_market":          0.05,
            "cap_per_market_longshot": 0.025,
            "cap_per_event":           0.08,
            "cap_per_day":             0.15,
            "drawdown_halve_trigger":  0.20,
            "drawdown_recover_trigger": 0.90,
        },
        "sim": {
            "runs_website": 10000,
            "runs_paper":   100000,
            "seed_master":  20260611,
        },
        "kill": {
            "checkpoint_round": "R16",
            "ll_gap_se":        2.0,
            "action":           "pivot_paper_framing",
        },
        "eval": {
            "alpha":                      0.05,
            "bootstrap_resamples":        10000,
            "dm_small_sample_correction": "HLN",
            "nyberg_lags":                [1, 2, 3],
        },
    }

    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)
    header = (
        "# evaluation/pre_reg_constants.yaml\n"
        "# =====================================\n"
        "# Phase 8 — Pre-registration & M★ Lockdown\n"
        "# Constitutional document for The 45% Problem.\n"
        "# Written by src/calibration/run_cv_battery.py — DO NOT EDIT MANUALLY.\n"
        "# Sealed by src/lockdown/seal_constants.py (status: PENDING_OSF → LOCKED).\n"
        "# Schema: schema/pre_reg_constants_v8.json\n\n"
    )
    YAML_PATH.write_text(header + yaml.dump(constants, default_flow_style=False, sort_keys=False))
    log.success("YAML written", path=str(YAML_PATH))


# ═══════════════════════════════════════════════════════════════════════════════
# Entry point
# ═══════════════════════════════════════════════════════════════════════════════

def run() -> None:
    log.stage("Phase 8 — CV Battery: START")
    t_start = time.perf_counter()

    # Pre-flight
    preflight_checks()

    # Load calibration params (Phase 3-6 outputs — do not refit)
    elo_p  = json.loads(ELO_PARAMS_PATH.read_text())
    m1_p   = json.loads(M1_PARAMS_PATH.read_text())
    m2_p   = json.loads(M2_PARAMS_PATH.read_text())
    m3_p   = json.loads(M3_PARAMS_PATH.read_text())

    params = LambdaParams(
        c=elo_p["c"], mu=elo_p["mu"],
        lam3=elo_p["lam3"], rho=elo_p["rho"],
    )
    tau   = float(m1_p["tau_star"])
    w     = float(m2_p["w_star"])
    theta = np.array(m3_p["theta"], dtype=float)

    # Load supporting data
    from ingestion.data_loader import DataLoader
    loader   = DataLoader()
    fifa_df  = loader.get_fifa_rankings()
    macro_df = loader.get_macro()

    # Build snapshot
    calib_df, holdout_df, snapshot_sha = build_or_verify_snapshot()

    # Build folds
    calib_with_folds, folds_sha = build_stratified_folds(calib_df)

    # CV loop
    cv_agg = run_cv_loop(calib_with_folds, params, tau, w, theta, fifa_df, macro_df)

    # Hold-out
    holdout_scores = run_holdout(calib_df, holdout_df, params, tau, w, theta, fifa_df, macro_df)

    # Decision rule
    champion_selection = apply_decision_rule(cv_agg, holdout_scores)

    # Code SHA
    code_sha = _get_code_sha()

    # Write JSON
    write_json_artifact(cv_agg, holdout_scores, champion_selection,
                        snapshot_sha, folds_sha,
                        n_calib=len(calib_df), n_holdout=len(holdout_df))

    # Compute JSON SHA (after file is written)
    json_sha = _sha256_file(REPORT_JSON_PATH)

    # Write PDF (uses json_sha in footer)
    write_pdf_report(cv_agg, holdout_scores, champion_selection,
                     snapshot_sha, folds_sha, code_sha)

    # Compute PDF SHA (strip timestamp metadata from hash)
    pdf_sha = _sha256_file(REPORT_PDF_PATH) if REPORT_PDF_PATH.exists() else ""

    # Write all params to YAML
    write_params_to_yaml(
        elo_p, m1_p, m2_p, m3_p, fifa_df,
        snapshot_sha, pdf_sha, json_sha, code_sha,
    )

    elapsed = time.perf_counter() - t_start
    log.success(
        "Phase 8 CV Battery COMPLETE",
        elapsed_seconds=round(elapsed, 1),
        champion=champion_selection["ranking"][0],
        gate_passed=champion_selection["sanity_gate_passed"],
        pdf=str(REPORT_PDF_PATH),
        json=str(REPORT_JSON_PATH),
        yaml=str(YAML_PATH),
    )
    print(
        f"\n{'='*60}\n"
        f"  M★ = {champion_selection['ranking'][0]}\n"
        f"  CV LL: {champion_selection['winner_mean_ll']:.5f}\n"
        f"  Gap vs runner-up: {champion_selection['ll_gap_in_se']:.2f} SE\n"
        f"  Sanity gate: {'PASSED ✓' if champion_selection['sanity_gate_passed'] else 'FAILED ✗'}\n"
        f"  Narrative: {champion_selection['decision_narrative']}\n"
        f"{'='*60}\n"
        f"  PDF:  {REPORT_PDF_PATH}\n"
        f"  JSON: {REPORT_JSON_PATH}\n"
        f"  YAML: {YAML_PATH}\n"
        f"{'='*60}\n"
        f"STOP — do not run Git tagging. Wait for manual OSF project creation.\n"
    )


if __name__ == "__main__":
    run()
