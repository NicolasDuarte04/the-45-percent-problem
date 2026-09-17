"""
simulation/match_model.py
==========================
Phase 5 — Deliverable 1: Bivariate Poisson + Dixon-Coles Match Model

Implements §§3.1–3.4 of Phase5_Simulation_Engine_Design.md.

Joint distribution:
  X = W1 + W3,  Y = W2 + W3
  W1 ~ Poi(λ1), W2 ~ Poi(λ2), W3 ~ Poi(λ3)  (independent)

Dixon-Coles low-score correction applied to cells (0,0),(0,1),(1,0),(1,1).

Locked parameters (do not fit in Phase 5):
  ρ   (DC correction) — loaded from pre_reg_constants.yaml match_model.rho
  λ3  (common shock)  — loaded from pre_reg_constants.yaml match_model.lambda_3
"""

from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path
from typing import Optional

import numpy as np
import yaml

_yaml_path = Path(__file__).resolve().parent.parent / "evaluation" / "pre_reg_constants.yaml"
with open(_yaml_path) as _fh:
    _pre_reg = yaml.safe_load(_fh)

_DEFAULT_RHO      = float(_pre_reg["match_model"]["rho"])
_DEFAULT_LAM3     = float(_pre_reg["match_model"]["lambda_3"])
_DEFAULT_MAX_GOALS = int(_pre_reg["match_model"]["max_goals"])


class MatchModel:
    """Bivariate Poisson + Dixon-Coles match model.

    All PMF computation results are cached by quantized (λ1, λ2) keys.
    Sampling uses Walker's alias method for O(1) draws per match.
    """

    def __init__(
        self,
        rho: float = _DEFAULT_RHO,
        lambda3: float = _DEFAULT_LAM3,
        max_goals: int = _DEFAULT_MAX_GOALS,
        rng: Optional[np.random.Generator] = None,
    ) -> None:
        self.rho = rho
        self.lambda3 = lambda3
        self.max_goals = max_goals
        self.rng = rng if rng is not None else np.random.default_rng()
        self._pmf_cache: dict[tuple[float, float], np.ndarray] = {}
        self._alias_cache: dict[tuple[float, float], tuple[np.ndarray, np.ndarray]] = {}

    # ── Public API ────────────────────────────────────────────────────────────

    def joint_pmf(self, lambda1: float, lambda2: float) -> np.ndarray:
        """Return (max_goals+1) × (max_goals+1) DC-corrected joint PMF.

        Rows = home goals (X), columns = away goals (Y).
        """
        key = (round(lambda1, 4), round(lambda2, 4))
        if key not in self._pmf_cache:
            self._pmf_cache[key] = self._compute_pmf(lambda1, lambda2)
        return self._pmf_cache[key]

    def sample_scoreline(self, lambda1: float, lambda2: float) -> tuple[int, int]:
        """Single draw from the DC-corrected joint PMF via the alias method."""
        key = (round(lambda1, 4), round(lambda2, 4))
        if key not in self._alias_cache:
            pmf = self.joint_pmf(lambda1, lambda2)
            flat = pmf.ravel()
            self._alias_cache[key] = _build_alias_table(flat)
        prob_table, alias_table = self._alias_cache[key]
        idx = _alias_draw(prob_table, alias_table, self.rng)
        n = self.max_goals + 1
        return divmod(idx, n)

    def match_outcome_probs(self, lambda1: float, lambda2: float) -> dict[str, float]:
        """Return {'home': p_H, 'draw': p_D, 'away': p_A} from the joint PMF."""
        pmf = self.joint_pmf(lambda1, lambda2)
        p_home = float(np.tril(pmf, k=-1).sum())
        p_draw = float(np.trace(pmf))
        p_away = float(np.triu(pmf, k=1).sum())
        return {"home": p_home, "draw": p_draw, "away": p_away}

    # ── Internal ──────────────────────────────────────────────────────────────

    def _compute_pmf(self, lambda1: float, lambda2: float) -> np.ndarray:
        """Compute the DC-corrected joint PMF grid.

        Joint PMF formula (Karlis & Ntzoufras 2003):
          P(X=x, Y=y) = e^{-(λ1+λ2+λ3)} · (λ1^x/x!) · (λ2^y/y!) ·
                        Σ_{k=0}^{min(x,y)} C(x,k)·C(y,k)·k!·(λ3/(λ1·λ2))^k
        """
        n = self.max_goals + 1
        lam3 = self.lambda3

        # Precompute log-factorials
        log_facts = np.zeros(n)
        for k in range(1, n):
            log_facts[k] = log_facts[k - 1] + math.log(k)

        def log_binom(m: int, k: int) -> float:
            if k < 0 or k > m:
                return -np.inf
            return log_facts[m] - log_facts[k] - log_facts[m - k]

        log_lam1 = math.log(lambda1) if lambda1 > 0 else -np.inf
        log_lam2 = math.log(lambda2) if lambda2 > 0 else -np.inf
        log_lam3 = math.log(lam3) if lam3 > 0 else -np.inf
        log_common = -(lambda1 + lambda2 + lam3)

        # log(λ3 / (λ1 * λ2)): ratio used in the k-sum
        if lam3 > 0 and lambda1 > 0 and lambda2 > 0:
            log_ratio = log_lam3 - log_lam1 - log_lam2
        else:
            log_ratio = -np.inf

        pmf = np.zeros((n, n), dtype=float)
        for x in range(n):
            for y in range(n):
                # Base: e^{-(λ1+λ2+λ3)} · (λ1^x/x!) · (λ2^y/y!)
                log_base = (
                    log_common
                    + x * log_lam1 - log_facts[x]
                    + y * log_lam2 - log_facts[y]
                )
                k_max = min(x, y)
                if k_max == 0 or log_ratio == -np.inf:
                    # Only the k=0 term (equals 1)
                    pmf[x, y] = math.exp(log_base)
                    continue

                # Accumulate Σ_k in log-sum-exp style
                terms = [0.0]  # k=0 contributes log(1)=0
                for k in range(1, k_max + 1):
                    lt = (
                        log_binom(x, k)
                        + log_binom(y, k)
                        + log_facts[k]
                        + k * log_ratio
                    )
                    terms.append(lt)

                max_t = max(terms)
                log_sum = max_t + math.log(sum(math.exp(t - max_t) for t in terms))
                pmf[x, y] = math.exp(log_base + log_sum)

        # Dixon-Coles correction on low-score cells
        pmf = self._apply_dc_correction(pmf, lambda1, lambda2)

        # Renormalise to correct any floating-point drift from DC correction
        total = pmf.sum()
        if abs(total - 1.0) > 1e-9:
            pmf /= total

        return pmf

    def _apply_dc_correction(
        self, pmf: np.ndarray, lambda1: float, lambda2: float
    ) -> np.ndarray:
        """Apply Dixon-Coles τ correction to the four low-score cells."""
        rho = self.rho
        pmf = pmf.copy()
        pmf[0, 0] *= 1.0 - lambda1 * lambda2 * rho
        pmf[0, 1] *= 1.0 + lambda1 * rho
        pmf[1, 0] *= 1.0 + lambda2 * rho
        pmf[1, 1] *= 1.0 - rho
        return pmf


# ── Alias method helpers ──────────────────────────────────────────────────────

def _build_alias_table(
    probs: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Walker's alias method: O(n) construction, O(1) sampling.

    Returns (prob_table, alias_table) both of length n.
    prob_table[i] = scaled probability in [0,1] for cell i.
    alias_table[i] = alias index.
    """
    n = len(probs)
    prob_table = np.array(probs * n, dtype=float)
    alias_table = np.zeros(n, dtype=np.int64)

    small = []
    large = []
    for i, p in enumerate(prob_table):
        if p < 1.0:
            small.append(i)
        else:
            large.append(i)

    while small and large:
        s = small.pop()
        l = large.pop()
        alias_table[s] = l
        prob_table[l] = prob_table[l] + prob_table[s] - 1.0
        if prob_table[l] < 1.0:
            small.append(l)
        else:
            large.append(l)

    return prob_table, alias_table


def _alias_draw(
    prob_table: np.ndarray,
    alias_table: np.ndarray,
    rng: np.random.Generator,
) -> int:
    """O(1) draw from the alias table."""
    n = len(prob_table)
    i = int(rng.integers(0, n))
    u = rng.random()
    return i if u < prob_table[i] else int(alias_table[i])
