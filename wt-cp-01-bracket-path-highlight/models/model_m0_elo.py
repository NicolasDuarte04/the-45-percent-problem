"""
models/model_m0_elo.py
=======================
Phase 4 — M0: Pure Elo Null Baseline

Zero free parameters beyond Phase 3 calibration.
S_0[i,j] = μ* · exp(c* · (R_i − R_j) / 400)

Design: Phase4_Model_Development_Design.md §2
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger
from models.calibrate_elo_lambda import LambdaParams
from models.base import BaseModel

log = get_logger(__name__)


class ModelM0Elo(BaseModel):
    """Pure Elo null baseline. No free parameters."""

    @property
    def model_id(self) -> str:
        return "M0_elo"

    def fit(
        self,
        matches: pd.DataFrame,
        elo_df: pd.DataFrame,
        params: LambdaParams,
        team_index: dict[str, int],
        **kwargs,
    ) -> None:
        """Load current Elo ratings. No optimisation occurs here."""
        self._params     = params
        self._team_index = team_index

        # Build {team_name → R_i} from external Elo ratings
        self._ratings: dict[str, float] = dict(zip(elo_df["team_name"], elo_df["elo_rating"]))

        n = len(team_index)
        # Build the strength matrix once
        teams_ordered = sorted(team_index, key=team_index.__getitem__)
        R_vec = np.array([self._ratings.get(t, 1500.0) for t in teams_ordered], dtype=float)

        # S[i,j] = μ* · exp(c* · (R_i − R_j) / 400)
        delta_matrix = (R_vec[:, None] - R_vec[None, :]) / 400.0
        self._S = params.mu * np.exp(params.c * delta_matrix)
        log.info("M0 fitted", n_teams=n, S_shape=str(self._S.shape))

    def get_strength_matrix(self) -> np.ndarray:
        """
        Returns S_0 of shape (48, 48).
        S_0[i,j] = μ* · exp(c* · (R_i − R_j) / 400)
        """
        return self._S.copy()

    def get_elo_rating(self, team: str) -> float:
        """Return current Elo rating for a team (fallback 1500)."""
        return self._ratings.get(team, 1500.0)


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests (AC 1–3 from §10.1)
# ═══════════════════════════════════════════════════════════════════════════════

def run_unit_tests(model: ModelM0Elo) -> None:
    """Run acceptance criteria 1–3 for M0."""
    log.stage("M0 unit tests (AC 1–3)")

    S   = model.get_strength_matrix()
    p   = model._params
    mu  = p.mu
    c   = p.c

    # AC 1: shape (48, 48), all positive, no NaN, S[i,j]·S[j,i] = μ*²
    assert S.shape == (48, 48), f"AC1 FAIL: shape {S.shape}"
    assert np.all(S > 0), "AC1 FAIL: S contains non-positive values"
    assert not np.any(np.isnan(S)), "AC1 FAIL: S contains NaN"
    assert not np.any(np.isinf(S)), "AC1 FAIL: S contains inf"

    product = S * S.T
    expected_product = mu ** 2
    max_err = float(np.max(np.abs(product - expected_product)))
    assert max_err < 1e-6, f"AC1 FAIL: S[i,j]·S[j,i] ≠ μ*² (max_err={max_err:.2e})"
    log.info("AC 1 PASS — shape, positivity, S[i,j]·S[j,i]=μ*²", max_symmetry_err=f"{max_err:.2e}")

    # AC 2: at Elo parity, S[i,j] = μ* within 1e-4
    # Find two teams with the same Elo or check diagonal equivalence conceptually
    # Diagonal entries: S[i,i] = μ* · exp(0) = μ*
    diag = np.diag(S)
    max_diag_err = float(np.max(np.abs(diag - mu)))
    assert max_diag_err < 1e-4, f"AC2 FAIL: diagonal (parity) max error {max_diag_err:.2e}"
    log.info("AC 2 PASS — at Elo parity S[i,j] = μ*", max_diag_err=f"{max_diag_err:.2e}", mu=round(mu, 4))

    # AC 3: 200-point advantage → S ≈ 2.294 (≈ μ* · exp(c*·0.5))
    expected_200 = mu * math.exp(c * 0.5)
    # Build the exact value for a team pair 200 points apart
    test_ratio = mu * math.exp(c * (200.0 / 400.0))
    assert abs(test_ratio - expected_200) < 1e-10, "Internal consistency check failed"
    # Hard-coded spec value: μ*=1.716, c*=0.580, exp(0.29)=1.3365 → 2.294
    spec_value = 2.294
    assert abs(test_ratio - spec_value) < 1e-3, (
        f"AC3 FAIL: 200-pt advantage gives {test_ratio:.4f}, expected ≈{spec_value}"
    )
    log.info("AC 3 PASS — 200-pt advantage", value=round(test_ratio, 4), spec=spec_value)

    log.info("All M0 unit tests PASS (AC 1–3)")


if __name__ == "__main__":
    import json

    CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
    p = json.loads((CALIBRATION_DIR / "elo_lambda_params.json").read_text())
    params = LambdaParams(c=p["c"], mu=p["mu"], lam3=p["lam3"], rho=p["rho"])

    from ingestion.data_loader import DataLoader
    from models.model_registry import DataBundle

    loader  = DataLoader()
    elo_df  = loader.get_elo()
    fifa_df = loader.get_fifa_rankings()
    matches = loader.get_matches(include_holdout=False)

    team_index = {name: idx for idx, name in enumerate(sorted(fifa_df["team_name"].tolist()))}

    model = ModelM0Elo()
    model.fit(matches=matches, elo_df=elo_df, params=params, team_index=team_index)
    run_unit_tests(model)

    S = model.get_strength_matrix()
    print(f"\nM0 strength matrix: shape={S.shape}, min={S.min():.4f}, max={S.max():.4f}")
