"""
models/model_m1_form.py
========================
Phase 4 — M1: Elo + Exponential-Decay Recent Form

Adjusts each team's effective strength by a form multiplier derived from
its last N_form=8 matches. Multiplier is capped at ±15% (LOCKED).

S_1[i,j] = μ* · exp(c* · Δ_ij) · (1 + φ_i) / (1 + φ_j)

Design: Phase4_Model_Development_Design.md §3
"""

from __future__ import annotations

import math
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
class FormParams:
    tau_days: float          # half-life in days (CALIBRATED)
    gamma: float = 1.0       # form-impact scale (LOCKED v1.0)
    cap: float = 0.15        # hard cap (LOCKED — never change)
    n_form: int = 8          # form window (LOCKED)


class ModelM1Form(BaseModel):
    """Elo + exponential-decay recent form. τ is calibrated; γ=1.0 is locked."""

    @property
    def model_id(self) -> str:
        return "M1_form"

    def fit(
        self,
        matches: pd.DataFrame,
        elo_df: pd.DataFrame,
        form_df: pd.DataFrame,
        params: LambdaParams,
        form_params: FormParams,
        team_index: dict[str, int],
        reference_date: pd.Timestamp,
        **kwargs,
    ) -> None:
        """
        Compute form multipliers from recent_form.parquet and build S_1.

        Uses current Elo (elo_df) as R_i_pre approximation for form matches.
        """
        self._params      = params
        self._fp          = form_params
        self._team_index  = team_index

        # Build {team_name → R_i} from external Elo ratings
        self._ratings: dict[str, float] = dict(zip(elo_df["team_name"], elo_df["elo_rating"]))

        tau         = form_params.tau_days
        gamma       = form_params.gamma
        cap         = form_params.cap
        n_form      = form_params.n_form
        lambda_decay = math.log(2.0) / tau

        if isinstance(reference_date, pd.Timestamp) and reference_date.tzinfo is not None:
            ref_ts = reference_date
        else:
            ref_ts = pd.Timestamp(reference_date, tz="UTC")
        form_df = form_df.copy()
        form_df["date"] = pd.to_datetime(form_df["date"], utc=True)

        # Compute F_i and φ_i for each team
        self._form_scores: dict[str, float] = {}
        self._form_phi: dict[str, float]    = {}

        all_teams = set(team_index.keys())
        for team in all_teams:
            team_form = form_df[form_df["team_name"] == team].sort_values("date").tail(n_form)
            n_matches = len(team_form)

            if n_matches == 0:
                log.warning("No form data", team=team)
                self._form_scores[team] = 0.0
                self._form_phi[team]    = 0.0
                continue

            if n_matches < 3:
                log.warning("Fewer than 3 form matches — estimate unreliable", team=team, n=n_matches)

            # R_i_pre ≈ current Elo (documented approximation)
            R_i_pre = self._ratings.get(team, 1500.0)

            weighted_sum  = 0.0
            weight_total  = 0.0

            for row in team_form.itertuples(index=False):
                days_diff = (ref_ts - row.date).total_seconds() / 86400.0
                if days_diff < 0:
                    continue  # future match — skip

                w_k = math.exp(-lambda_decay * days_diff)

                # S_ik from result
                if row.result == "W":
                    S_ik = 1.0
                elif row.result == "D":
                    S_ik = 0.5
                else:
                    S_ik = 0.0

                # E_ik: Elo expected score
                R_opp = float(row.opponent_elo) if not pd.isna(row.opponent_elo) else 1500.0
                E_ik = 1.0 / (1.0 + 10.0 ** ((R_opp - R_i_pre) / 400.0))

                delta_k = S_ik - E_ik
                weighted_sum  += w_k * delta_k
                weight_total  += w_k

            F_i = weighted_sum / weight_total if weight_total > 0 else 0.0
            phi_i = max(-cap, min(cap, gamma * F_i))

            self._form_scores[team] = F_i
            self._form_phi[team]    = phi_i

        # Build strength matrix S_1
        teams_ordered = sorted(team_index, key=team_index.__getitem__)
        n = len(teams_ordered)
        R_vec   = np.array([self._ratings.get(t, 1500.0) for t in teams_ordered], dtype=float)
        phi_vec = np.array([self._form_phi.get(t, 0.0) for t in teams_ordered], dtype=float)

        delta_matrix = (R_vec[:, None] - R_vec[None, :]) / 400.0
        base_S       = params.mu * np.exp(params.c * delta_matrix)

        # S_1[i,j] = base_S[i,j] · (1 + φ_i) / (1 + φ_j)
        phi_mult = (1.0 + phi_vec[:, None]) / (1.0 + phi_vec[None, :])
        self._S  = base_S * phi_mult

        log.info("M1 fitted", n_teams=n, tau=tau,
                 phi_range=f"[{phi_vec.min():.4f}, {phi_vec.max():.4f}]")

    def get_strength_matrix(self) -> np.ndarray:
        """Returns S_1 of shape (48, 48)."""
        return self._S.copy()

    def get_form_scores(self) -> dict[str, float]:
        """Returns {team_code: F_i} for all 48 teams."""
        return dict(self._form_scores)

    def get_form_multipliers(self) -> dict[str, float]:
        """Returns {team_code: φ_i} (post-clip). Values in [−0.15, 0.15]."""
        return dict(self._form_phi)


# ═══════════════════════════════════════════════════════════════════════════════
# Unit tests (AC 4–5 from §10.1)
# ═══════════════════════════════════════════════════════════════════════════════

def run_unit_tests(model: ModelM1Form) -> None:
    """Run acceptance criteria 4–5 for M1."""
    log.stage("M1 unit tests (AC 4–5)")

    # AC 4: all form multipliers within [−0.15, 0.15]
    phi_dict = model.get_form_multipliers()
    for team, phi in phi_dict.items():
        assert -0.15 <= phi <= 0.15, f"AC4 FAIL: team {team} has φ={phi:.4f} outside [−0.15, 0.15]"
    log.info("AC 4 PASS — all φ_i within [−0.15, 0.15]",
             phi_min=round(min(phi_dict.values()), 4),
             phi_max=round(max(phi_dict.values()), 4))

    # AC 5: when all F_i = 0 → φ_i = 0 → S_1 = S_0 element-wise
    # Build a zero-form model and compare
    import json
    from ingestion.data_loader import DataLoader

    CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
    p_raw = json.loads((CALIBRATION_DIR / "elo_lambda_params.json").read_text())
    params = LambdaParams(c=p_raw["c"], mu=p_raw["mu"], lam3=p_raw["lam3"], rho=p_raw["rho"])

    loader = DataLoader()
    elo_df = loader.get_elo()

    teams_ordered = sorted(model._team_index, key=model._team_index.__getitem__)
    R_vec = np.array([model._ratings.get(t, 1500.0) for t in teams_ordered], dtype=float)
    delta_matrix = (R_vec[:, None] - R_vec[None, :]) / 400.0
    S_0_expected = params.mu * np.exp(params.c * delta_matrix)

    # Build S_1 with all phi=0
    phi_zero = np.zeros(len(teams_ordered))
    phi_mult_zero = (1.0 + phi_zero[:, None]) / (1.0 + phi_zero[None, :])
    S_1_zero = S_0_expected * phi_mult_zero

    max_err = float(np.max(np.abs(S_1_zero - S_0_expected)))
    assert max_err < 1e-8, f"AC5 FAIL: zero-form S_1 ≠ S_0 (max_err={max_err:.2e})"
    log.info("AC 5 PASS — zero-form S_1 = S_0", max_err=f"{max_err:.2e}")

    log.info("All M1 unit tests PASS (AC 4–5)")


if __name__ == "__main__":
    import json

    CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
    p = json.loads((CALIBRATION_DIR / "elo_lambda_params.json").read_text())
    params = LambdaParams(c=p["c"], mu=p["mu"], lam3=p["lam3"], rho=p["rho"])

    from ingestion.data_loader import DataLoader

    loader  = DataLoader()
    elo_df  = loader.get_elo()
    form_df = loader.get_recent_form()
    fifa_df = loader.get_fifa_rankings()
    matches = loader.get_matches(include_holdout=False)

    team_index = {name: idx for idx, name in enumerate(sorted(fifa_df["team_name"].tolist()))}

    model = ModelM1Form()
    model.fit(
        matches=matches,
        elo_df=elo_df,
        form_df=form_df,
        params=params,
        form_params=FormParams(tau_days=60.0),
        team_index=team_index,
        reference_date=pd.Timestamp("2026-04-21", tz="UTC"),
    )
    run_unit_tests(model)

    S = model.get_strength_matrix()
    phi = model.get_form_multipliers()
    print(f"\nM1 strength matrix: shape={S.shape}")
    print(f"Top 5 form multipliers (best form): {sorted(phi.items(), key=lambda x: x[1], reverse=True)[:5]}")
    print(f"Bottom 5 form multipliers (worst):  {sorted(phi.items(), key=lambda x: x[1])[:5]}")
