"""
evaluation/score_on_2022_holdout.py
====================================
Score the four locked variants (M0_elo, M1_form, M2_fifa, M3_macro) on the
2022 World Cup hold-out (n=64 matches) and persist per-match probability
vectors plus realised outcomes.

Outputs (one parquet per model, 192 rows = 64 matches × 3 outcome classes):

    data/processed/holdout_probs_m0.parquet
    data/processed/holdout_probs_m1.parquet
    data/processed/holdout_probs_m2.parquet
    data/processed/holdout_probs_m3.parquet

Schema per file:
    match_id        str       — Match.match_id from historical_matches.parquet
    date            datetime  — match date (UTC)
    outcome_class   str       — 'home_win' | 'draw' | 'away_win'
    predicted_prob  float64   — model's probability for this outcome class
    outcome         int8      — 1 if this class realised, 0 otherwise

Reuses the same probability machinery as `models/model_registry._evaluate_fold`
so results are identical to the canonical CV battery run on the hold-out
fold. Aggregate hold-out log-loss is checked against the values stored in
`evaluation/cv_battery_result.json::models[*].holdout_log_loss` and a
warning is logged on divergence > 1e-4.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from utils.hasher import DataSnapshotHasher, SnapshotRegistry

from ingestion.data_loader import DataLoader
from models.calibrate_elo_lambda import LambdaParams
from models.elo_calculator import run_walk_forward
from models.model_registry import (
    _build_team_match_records,
    _compute_blended_ratings_cv,
    _compute_form_phi,
    _compute_posterior_ratings_cv,
    _compute_probs,
    _s_ij,
)

log = get_logger(__name__)

CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
PROCESSED_DIR   = PROJECT_ROOT / "data" / "processed"
SNAPSHOT_REGISTRY_PATH = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

# Train cutoff for the hold-out scoring fold: train on everything ≤ this date
# that is not flagged is_holdout. The 2022 WC hold-out is December 2022, so
# this cutoff cleanly separates training data from evaluation data per the
# pre-registered protocol (CLAUDE.md "The hold-out set" rule).
TRAIN_CUTOFF = pd.Timestamp("2021-12-31", tz="UTC")

# Canonical hold-out log-loss values from evaluation/cv_battery_result.json.
# A run that diverges from these has either drifted from the locked params
# or is reading a different training split — flag, do not silently publish.
CANONICAL_HOLDOUT_LOG_LOSS = {
    "M0_elo":   1.018142209470064,
    "M1_form":  1.1012311251563616,
    "M2_fifa":  0.987658905869257,
    "M3_macro": 0.997438113614,    # 12 sig figs from canonical file (last digits truncated)
}
HOLDOUT_LL_TOLERANCE = 1e-4

OUTCOME_CLASSES = ("home_win", "draw", "away_win")
MODEL_IDS = ("M0_elo", "M1_form", "M2_fifa", "M3_macro")


# ─────────────────────────────────────────────────────────────────────────────
# Locked-parameter loaders
# ─────────────────────────────────────────────────────────────────────────────

def _load_lambda_params() -> LambdaParams:
    with open(CALIBRATION_DIR / "elo_lambda_params.json") as f:
        d = json.load(f)
    return LambdaParams(c=d["c"], mu=d["mu"], lam3=d["lam3"], rho=d["rho"])


def _load_tau_star() -> float:
    with open(CALIBRATION_DIR / "m1_form_params.json") as f:
        return float(json.load(f)["tau_star"])


def _load_w_star() -> float:
    with open(CALIBRATION_DIR / "m2_fifa_params.json") as f:
        return float(json.load(f)["w_star"])


def _load_theta() -> np.ndarray:
    with open(CALIBRATION_DIR / "m3_macro_theta.json") as f:
        return np.array(json.load(f)["theta"], dtype=float)


# ─────────────────────────────────────────────────────────────────────────────
# Per-match scoring (mirrors model_registry._evaluate_fold inner loop, but
# emits per-match probability vectors instead of aggregate losses only)
# ─────────────────────────────────────────────────────────────────────────────

def _observed_outcome(score_home: int, score_away: int) -> str:
    if score_home > score_away:
        return "home_win"
    if score_home == score_away:
        return "draw"
    return "away_win"


def _score_holdout(
    train_df: pd.DataFrame,
    eval_df: pd.DataFrame,
    params: LambdaParams,
    tau: float,
    w: float,
    theta: np.ndarray,
    fifa_df: pd.DataFrame,
    macro_df: pd.DataFrame,
) -> dict[str, pd.DataFrame]:
    log.stage("Walk-forward Elo on training data", rows=len(train_df))
    wf_df = run_walk_forward(train_df)

    ratings: dict[str, float] = {}
    for row in wf_df.itertuples(index=False):
        ratings[row.home_team] = row.R_home_post
        ratings[row.away_team] = row.R_away_post

    log.stage("Computing M1 form multipliers")
    team_match_records = _build_team_match_records(wf_df)
    phi_m1 = _compute_form_phi(team_match_records, TRAIN_CUTOFF, tau=tau)

    log.stage("Computing M2 blended ratings")
    ratings_m2 = _compute_blended_ratings_cv(ratings, fifa_df, w=w)

    log.stage("Computing M3 posterior ratings")
    ratings_m3 = _compute_posterior_ratings_cv(ratings, macro_df, theta)

    rows_per_model: dict[str, list[dict]] = {mid: [] for mid in MODEL_IDS}

    log.stage("Scoring hold-out matches", n=len(eval_df))
    skipped = 0
    for row in eval_df.itertuples(index=False):
        if pd.isna(row.score_home) or pd.isna(row.score_away):
            skipped += 1
            continue

        home, away = row.team_home, row.team_away
        observed = _observed_outcome(int(row.score_home), int(row.score_away))

        R_h = ratings.get(home, 1500.0)
        R_a = ratings.get(away, 1500.0)

        # M0 — pure Elo
        lam_h = _s_ij(R_h, R_a, params)
        lam_a = _s_ij(R_a, R_h, params)
        p_H, p_D, p_A = _compute_probs(lam_h, lam_a, params)
        _append_match_rows(rows_per_model["M0_elo"], row, p_H, p_D, p_A, observed)

        # M1 — form
        phi_h = phi_m1.get(home, 0.0)
        phi_a = phi_m1.get(away, 0.0)
        lam_h1 = lam_h * (1.0 + phi_h) / (1.0 + phi_a)
        lam_a1 = lam_a * (1.0 + phi_a) / (1.0 + phi_h)
        p_H, p_D, p_A = _compute_probs(lam_h1, lam_a1, params)
        _append_match_rows(rows_per_model["M1_form"], row, p_H, p_D, p_A, observed)

        # M2 — FIFA blend
        R_h2 = ratings_m2.get(home, R_h)
        R_a2 = ratings_m2.get(away, R_a)
        lam_h2 = _s_ij(R_h2, R_a2, params)
        lam_a2 = _s_ij(R_a2, R_h2, params)
        p_H, p_D, p_A = _compute_probs(lam_h2, lam_a2, params)
        _append_match_rows(rows_per_model["M2_fifa"], row, p_H, p_D, p_A, observed)

        # M3 — macro prior
        R_h3 = ratings_m3.get(home, R_h)
        R_a3 = ratings_m3.get(away, R_a)
        lam_h3 = _s_ij(R_h3, R_a3, params)
        lam_a3 = _s_ij(R_a3, R_h3, params)
        p_H, p_D, p_A = _compute_probs(lam_h3, lam_a3, params)
        _append_match_rows(rows_per_model["M3_macro"], row, p_H, p_D, p_A, observed)

    if skipped:
        log.warning("Skipped hold-out matches with missing scores", skipped=skipped)

    out: dict[str, pd.DataFrame] = {}
    for mid in MODEL_IDS:
        df = pd.DataFrame(rows_per_model[mid])
        df = df.sort_values(["match_id", "outcome_class"]).reset_index(drop=True)
        out[mid] = df
    return out


def _append_match_rows(
    bucket: list[dict],
    match_row,
    p_H: float,
    p_D: float,
    p_A: float,
    observed: str,
) -> None:
    base = {
        "match_id": match_row.match_id,
        "date": match_row.date,
    }
    for cls, p in (("home_win", p_H), ("draw", p_D), ("away_win", p_A)):
        bucket.append({
            **base,
            "outcome_class": cls,
            "predicted_prob": float(p),
            "outcome": np.int8(1 if observed == cls else 0),
        })


# ─────────────────────────────────────────────────────────────────────────────
# Aggregate log-loss (sanity check vs canonical evaluation/cv_battery_result.json)
# ─────────────────────────────────────────────────────────────────────────────

def _aggregate_log_loss(df: pd.DataFrame) -> float:
    # Per-match three-class log-loss = -log(p_realised). Mean across matches.
    realised = df[df["outcome"] == 1]
    if len(realised) == 0:
        return float("nan")
    eps = 1e-15
    losses = -np.log(np.clip(realised["predicted_prob"].to_numpy(), eps, 1.0))
    return float(losses.mean())


# ─────────────────────────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────────────────────────

def run(force: bool = False) -> dict[str, Path]:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    expected_paths = {
        mid: PROCESSED_DIR / f"holdout_probs_{mid.split('_')[0].lower()}.parquet"
        for mid in MODEL_IDS
    }
    if not force and all(p.exists() for p in expected_paths.values()):
        log.info("All holdout-prob files already exist; skipping (use --force to regenerate)")
        return expected_paths

    log.stage("Loading locked parameters")
    params = _load_lambda_params()
    tau    = _load_tau_star()
    w      = _load_w_star()
    theta  = _load_theta()
    log.info("Locked params loaded",
             c=params.c, mu=params.mu, lam3=params.lam3, rho=params.rho,
             tau_star=tau, w_star=w, theta_dim=len(theta))

    log.stage("Loading data via DataLoader")
    loader = DataLoader()
    matches_all = loader.get_matches(include_holdout=True)
    fifa_df     = loader.get_fifa_rankings()
    macro_df    = loader.get_macro()

    matches_all["date"] = pd.to_datetime(matches_all["date"], utc=True)
    train_df = matches_all[
        (matches_all["date"] <= TRAIN_CUTOFF) & (~matches_all["is_holdout"])
    ].copy()
    eval_df = matches_all[matches_all["is_holdout"]].copy()
    log.info("Split loaded", train=len(train_df), holdout=len(eval_df))

    if len(eval_df) != 64:
        log.warning("Holdout match count is not 64", got=len(eval_df))

    per_model = _score_holdout(
        train_df=train_df, eval_df=eval_df,
        params=params, tau=tau, w=w, theta=theta,
        fifa_df=fifa_df, macro_df=macro_df,
    )

    log.stage("Sanity-checking aggregate hold-out log-loss vs canonical run")
    for mid in MODEL_IDS:
        ll = _aggregate_log_loss(per_model[mid])
        canonical = CANONICAL_HOLDOUT_LOG_LOSS[mid]
        delta = ll - canonical
        if abs(delta) > HOLDOUT_LL_TOLERANCE:
            log.warning(
                "Hold-out log-loss diverges from canonical",
                model=mid, computed=round(ll, 6), canonical=round(canonical, 6),
                delta=round(delta, 6),
            )
        else:
            log.info("Hold-out log-loss matches canonical",
                     model=mid, log_loss=round(ll, 6))

    log.stage("Writing per-model parquet files")
    output_paths: dict[str, Path] = {}
    for mid in MODEL_IDS:
        out_path = expected_paths[mid]
        df = per_model[mid][["match_id", "date", "outcome_class", "predicted_prob", "outcome"]]
        df.to_parquet(out_path, engine="pyarrow", index=False)
        output_paths[mid] = out_path
        log.success("Wrote", path=str(out_path), rows=len(df))

    log.stage("Hashing snapshot")
    hasher = DataSnapshotHasher()
    for mid in MODEL_IDS:
        hasher.add_file(output_paths[mid], label=f"holdout_probs_{mid}")
    snapshot_sha = hasher.finalise()
    if os.environ.get("CI") == "true":
        registry = SnapshotRegistry(SNAPSHOT_REGISTRY_PATH)
        registry.register(snapshot_sha, hasher.manifest(), notes="score_on_2022_holdout")
        log.info("Snapshot registered (CI)", sha=snapshot_sha[:16])
    else:
        log.info("Snapshot computed (local run, registry write skipped)",
                 sha=snapshot_sha[:16])

    return output_paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                        help="Regenerate even if all four parquet files already exist.")
    args = parser.parse_args()
    run(force=args.force)


if __name__ == "__main__":
    main()
