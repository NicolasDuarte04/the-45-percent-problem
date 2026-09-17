"""
models/base.py
==============
Shared abstract base class and data containers for M0–M3 strength models.

Kept in a separate file to avoid circular imports between model_registry.py
and individual model implementations.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd


class BaseModel(ABC):
    """
    Abstract base for all M0–M3 strength models.
    Every model receives data via fit() and exposes its output via
    get_strength_matrix(). Nothing else is required by the registry.
    """

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Unique identifier: 'M0_elo', 'M1_form', 'M2_fifa', 'M3_macro'."""
        ...

    @abstractmethod
    def fit(self, **kwargs) -> None:
        """
        Load and calibrate the model on historical data.
        After fit(), get_strength_matrix() must return a valid (48, 48) array.
        """
        ...

    @abstractmethod
    def get_strength_matrix(self) -> np.ndarray:
        """
        Returns S of shape (48, 48), dtype float64.
        S[i,j] = expected goals scored by team i vs team j, neutral venue.
        No NaNs, no infinities, all values strictly positive.
        """
        ...


@dataclass
class DataBundle:
    """Typed container for all data required by M0–M3."""
    matches: pd.DataFrame
    elo_df: pd.DataFrame
    form_df: pd.DataFrame
    fifa_df: pd.DataFrame
    macro_df: pd.DataFrame
    lambda_params: object              # LambdaParams (avoid importing here)
    team_index: dict                   # team_name → matrix row/col 0..47
    reference_date: pd.Timestamp       # data-freeze date


@dataclass
class CVResults:
    """Output of the 5-fold walk-forward CV battery."""
    scores: dict                       # {model_id: L_CV}
    sigmas: dict                       # {model_id: σ_CV}
    deltas: dict                       # {model_id: Δ_CV vs M0}
    fold_losses: dict                  # {model_id: [loss_fold1..5]}
    brier: dict
    rps: dict
    dm_stats: dict
    dm_pvalues: dict
    champion_id: str
    n_matches_per_fold: list
    data_snapshot_sha: str
    tau_star: float = 60.0
    w_star: float = 0.15
    theta: Optional[np.ndarray] = None
