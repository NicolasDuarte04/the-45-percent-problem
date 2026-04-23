"""
models/model_m2_fifa.py
========================
Phase 4 — M2: Elo + FIFA Ranking Points Shrinkage Blend

Blends standardised Elo and FIFA ranking points via a cross-validated weight w*.

z_blend_i = (1−w)·z_elo_i + w·z_fifa_i
R_blend_i = μ_R + σ_R · z_blend_i
S_2[i,j]  = μ* · exp(c* · (R_blend_i − R_blend_j) / 400)

Design: Phase4_Model_Development_Design.md §4
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from models.calibrate_elo_lambda import LambdaParams
from models.base import BaseModel

log = get_logger(__name__)


@dataclass
class FifaBlendParams:
    w: float                 # global blend weight (CALIBRATED)
    adaptive: bool = False   # team-level shrinkage (LOCKED False for production)
    n_threshold: int = 30    # adaptive shrinkage decay rate (LOCKED)


class ModelM2Fifa(BaseModel):
    """Shrinkage-weighted blend of Elo and FIFA ranking points."""

    @property
    def model_id(self) -> str:
        return "M2_fifa"

    def fit(
        self,
        matches: pd.DataFrame,
        elo_df: pd.DataFrame,
        fifa_df: pd.DataFrame,
        params: LambdaParams,
        blend_params: FifaBlendParams,
        team_index: dict[str, int],
        **kwargs,
    ) -> None:
        """
        Compute blended ratings and build S_2.
        Standardises Elo and FIFA points over the 48 qualified teams.
        """
        self._params      = params
        self._bp          = blend_params
        self._team_index  = team_index

        w = blend_params.w

        # Build maps from the 48 qualified teams only
        elo_map  = dict(zip(elo_df["team_name"], elo_df["elo_rating"]))
        fifa_map = dict(zip(fifa_df["team_name"], fifa_df["fifa_points"]))

        teams_ordered = sorted(team_index, key=team_index.__getitem__)
        n = len(teams_ordered)

        R_vec = np.array([elo_map.get(t, 1500.0) for t in teams_ordered], dtype=float)
        Q_vec = np.array([fifa_map.get(t, float("nan")) for t in teams_ordered], dtype=float)

        # Population statistics over 48 qualified teams
        mu_R  = float(np.mean(R_vec))
        sig_R = float(np.std(R_vec)) or 1.0
        valid_q = Q_vec[~np.isnan(Q_vec)]
        mu_Q  = float(np.mean(valid_q)) if len(valid_q) > 0 else 0.0
        sig_Q = float(np.std(valid_q)) or 1.0

        # Standardise
        z_elo  = (R_vec - mu_R) / sig_R
        z_fifa = np.where(np.isnan(Q_vec), z_elo, (Q_vec - mu_Q) / sig_Q)  # fallback to z_elo if no FIFA data

        if blend_params.adaptive:
            # Team-level adaptive shrinkage (LOCKED off for production)
            # n_matches_per_team would be needed — use n_threshold as default
            n_threshold = blend_params.n_threshold
            # For production, approximate n_i as 30 for all (no match count per team available)
            # This is the 'off' branch; w_i ≈ w for all teams with n_i ~ n_threshold
            w_vec = w * np.ones(n)
        else:
            w_vec = w * np.ones(n)

        z_blend = (1.0 - w_vec) * z_elo + w_vec * z_fifa
        R_blend = mu_R + sig_R * z_blend

        self._blended_ratings: dict[str, float] = dict(zip(teams_ordered, R_blend.tolist()))
        self._mu_R = mu_R
        self._sig_R = sig_R
        self._mu_Q = mu_Q
        self._sig_Q = sig_Q

        # Build S_2
        delta_matrix = (R_blend[:, None] - R_blend[None, :]) / 400.0
        self._S = params.mu * np.exp(params.c * delta_matrix)

        log.info("M2 fitted", n_teams=n, w=w,
                 R_blend_range=f"[{R_blend.min():.1f}, {R_blend.max():.1f}]")

    def get_strength_matrix(self) -> np.ndarray:
        """Returns S_2 of shape (48, 48)."""
        return self._S.copy()

    def get_blended_ratings(self) -> dict[str, float]:
        """Returns {team_name: R_blend_i} for diagnostics."""
        return dict(self._blended_ratings)


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests (AC 6–7 from §10.1)
# ═══════════════════════════════════════════════════════════════════════════════

def run_unit_tests(model_m2: ModelM2Fifa, model_m0: "ModelM0Elo") -> None:
    """Run acceptance criteria 6–7 for M2."""
    log.stage("M2 unit tests (AC 6–7)")

    import json
    from ingestion.data_loader import DataLoader
    from models.model_m0_elo import ModelM0Elo

    CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
    p_raw = json.loads((CALIBRATION_DIR / "elo_lambda_params.json").read_text())
    params = LambdaParams(c=p_raw["c"], mu=p_raw["mu"], lam3=p_raw["lam3"], rho=p_raw["rho"])

    loader  = DataLoader()
    elo_df  = loader.get_elo()
    fifa_df = loader.get_fifa_rankings()
    matches = loader.get_matches(include_holdout=False)
    team_index = model_m2._team_index

    # AC 6: w=0 → S_2 = S_0 element-wise within 1e-6
    m2_w0 = ModelM2Fifa()
    m2_w0.fit(
        matches=matches, elo_df=elo_df, fifa_df=fifa_df,
        params=params, blend_params=FifaBlendParams(w=0.0),
        team_index=team_index,
    )
    S_0 = model_m0.get_strength_matrix()
    S_2_w0 = m2_w0.get_strength_matrix()
    max_err = float(np.max(np.abs(S_2_w0 - S_0)))
    assert max_err < 1e-6, f"AC6 FAIL: M2(w=0) ≠ M0 (max_err={max_err:.2e})"
    log.info("AC 6 PASS — M2(w=0) = M0", max_err=f"{max_err:.2e}")

    # AC 7: w=1 → valid positive matrix (FIFA-only signal)
    m2_w1 = ModelM2Fifa()
    m2_w1.fit(
        matches=matches, elo_df=elo_df, fifa_df=fifa_df,
        params=params, blend_params=FifaBlendParams(w=1.0),
        team_index=team_index,
    )
    S_2_w1 = m2_w1.get_strength_matrix()
    assert S_2_w1.shape == (48, 48), f"AC7 FAIL: shape {S_2_w1.shape}"
    assert np.all(S_2_w1 > 0), "AC7 FAIL: S_2(w=1) contains non-positive values"
    assert not np.any(np.isnan(S_2_w1)), "AC7 FAIL: S_2(w=1) contains NaN"
    log.info("AC 7 PASS — M2(w=1) is a valid positive matrix")

    log.info("All M2 unit tests PASS (AC 6–7)")


if __name__ == "__main__":
    import json

    CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
    p = json.loads((CALIBRATION_DIR / "elo_lambda_params.json").read_text())
    params = LambdaParams(c=p["c"], mu=p["mu"], lam3=p["lam3"], rho=p["rho"])

    from ingestion.data_loader import DataLoader
    from models.model_m0_elo import ModelM0Elo

    loader  = DataLoader()
    elo_df  = loader.get_elo()
    fifa_df = loader.get_fifa_rankings()
    matches = loader.get_matches(include_holdout=False)

    team_index = {name: idx for idx, name in enumerate(sorted(fifa_df["team_name"].tolist()))}

    model_m0 = ModelM0Elo()
    model_m0.fit(matches=matches, elo_df=elo_df, params=params, team_index=team_index)

    model = ModelM2Fifa()
    model.fit(
        matches=matches, elo_df=elo_df, fifa_df=fifa_df,
        params=params, blend_params=FifaBlendParams(w=0.15),
        team_index=team_index,
    )
    run_unit_tests(model, model_m0)

    ratings = model.get_blended_ratings()
    sorted_teams = sorted(ratings.items(), key=lambda x: x[1], reverse=True)
    print("\nTop 10 blended ratings (M2):")
    for t, r in sorted_teams[:10]:
        print(f"  {t:<20}  {r:.1f}")
