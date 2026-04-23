"""
market/edge_calculator.py
=========================
Edge metric computation and outcome flagging (§2 of Phase 6 design).

Edge is the additive difference between M★ model probability and the
Power-method de-vigged Pinnacle probability:

    E_i = p_model_i − q_devigged_i

Variance-aware standardised edge E_i* is also computed using the MC
standard error for p_model and a parametric bootstrap estimate for σ_q.

Flags are emitted for outcomes where |E_i| exceeds the pre-registered
market-class threshold (3 pp mainline, 5 pp derivative).
"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Sequence

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Pre-registered thresholds (§2.3, §8 — must NOT be modified during 2026 WC)
# ---------------------------------------------------------------------------
_THRESHOLD_MAINLINE: float = 0.03    # 3 percentage points
_THRESHOLD_DERIVATIVE: float = 0.05  # 5 percentage points

MAINLINE_MARKET_CLASSES = frozenset({
    "1x2", "match_winner", "group_winner", "tournament_winner",
})
DERIVATIVE_MARKET_CLASSES = frozenset({
    "over_under", "btts", "correct_score", "stage_of_elimination",
    "both_teams_score",
})

# Bootstrap parameters for σ_q estimation
_BOOTSTRAP_TICKS = 50   # number of bootstrap resamples for de-vigging uncertainty
_DEFAULT_TICK_SIZE = 0.005   # minimum odds tick (½ of 1pp at ~50% prob)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ProbVector = List[float]


@dataclass(frozen=True)
class EdgeFlag:
    """
    One edge assessment for a single (market_id, outcome_id, timestamp) tuple.
    """
    outcome_id: str
    E: float               # raw edge: p_model − q_devigged  (probability points)
    E_star: float          # variance-adjusted standardised edge
    sigma_p: float         # MC std error on p_model
    sigma_q: float         # de-vigging uncertainty (bootstrap)
    threshold: float       # the ε used for this market class
    flagged: bool          # |E| > threshold
    reason_code: str       # e.g. "ABOVE_THRESHOLD", "BELOW_THRESHOLD", "NOT_FLAGGED"
    is_two_sided_flag: bool = False   # populated post-hoc by calculate_edge


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _sigma_p(p: float, n_runs: int) -> float:
    """MC standard error: sqrt(p*(1-p)/N)."""
    if n_runs <= 0:
        return float("nan")
    return math.sqrt(max(p * (1 - p), 0.0) / n_runs)


def _sigma_q_bootstrap(
    odds: List[float],
    outcome_idx: int,
    n_bootstrap: int = _BOOTSTRAP_TICKS,
    tick_size: float = _DEFAULT_TICK_SIZE,
) -> float:
    """
    Parametric bootstrap estimate of de-vigging uncertainty for a single outcome.

    Resamples odds under a noise model where each decimal odd is perturbed by
    ±tick_size, re-runs the Power de-vig, and returns the empirical std dev
    of q[outcome_idx] across bootstrap draws.
    """
    import random  # local import — this helper is called rarely

    from market.devig import _solve_z

    raw_base = [1.0 / o for o in odds]

    rng = random.Random(42)
    q_samples: List[float] = []

    for _ in range(n_bootstrap):
        noisy_odds = [
            max(1.001, o + rng.uniform(-tick_size, tick_size))
            for o in odds
        ]
        raw = [1.0 / o for o in noisy_odds]
        try:
            z = _solve_z(raw)
            q_i = raw[outcome_idx] ** z
        except Exception:
            continue
        q_samples.append(q_i)

    if len(q_samples) < 2:
        return 0.005  # fallback: 0.5 pp
    mean = sum(q_samples) / len(q_samples)
    variance = sum((x - mean) ** 2 for x in q_samples) / (len(q_samples) - 1)
    return math.sqrt(variance)


def _threshold_for_class(market_class: str) -> float:
    """Return the pre-registered edge threshold for this market class."""
    key = market_class.lower().strip()
    if key in MAINLINE_MARKET_CLASSES:
        return _THRESHOLD_MAINLINE
    return _THRESHOLD_DERIVATIVE   # conservative default for unknowns


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def calculate_edge(
    p_model: ProbVector,
    q_devigged: ProbVector,
    market_class: str,
    outcome_ids: Optional[List[str]] = None,
    n_mc_runs: int = 10_000,
    odds: Optional[List[float]] = None,
) -> List[EdgeFlag]:
    """
    Compute edge, standardised edge, and flag outcomes above the threshold.

    Parameters
    ----------
    p_model : list[float]
        M★ Monte Carlo probabilities for each outcome (must sum to 1 ± 0.01).
    q_devigged : list[float]
        Power-method de-vigged probabilities from devig() (must sum to 1 ± 0.01).
    market_class : str
        '1x2', 'match_winner', 'group_winner', 'tournament_winner',
        'over_under', 'btts', 'correct_score', 'stage_of_elimination'.
    outcome_ids : list[str] | None
        Labels for each outcome (e.g. ['home_win', 'draw', 'away_win']).
        Auto-generated as ['outcome_0', ...] if not provided.
    n_mc_runs : int
        Number of MC runs used to compute p_model (for σ_p estimation).
    odds : list[float] | None
        Original decimal odds used to produce q_devigged (for σ_q bootstrap).
        If None, σ_q is estimated from q_devigged directly via binomial noise.

    Returns
    -------
    list[EdgeFlag]
        One flag per outcome.  Pure function — no I/O.
    """
    n = len(p_model)
    if n < 2:
        raise ValueError(f"Need ≥ 2 outcomes, got {n}")
    if len(q_devigged) != n:
        raise ValueError(
            f"p_model length {n} != q_devigged length {len(q_devigged)}"
        )
    if outcome_ids is not None and len(outcome_ids) != n:
        raise ValueError(
            f"outcome_ids length {len(outcome_ids)} != n_outcomes {n}"
        )
    if odds is not None and len(odds) != n:
        raise ValueError(f"odds length {len(odds)} != n_outcomes {n}")

    ids = outcome_ids or [f"outcome_{i}" for i in range(n)]
    eps = _threshold_for_class(market_class)

    flags: List[EdgeFlag] = []
    flagged_indices: List[int] = []

    for i, (p, q, oid) in enumerate(zip(p_model, q_devigged, ids)):
        E = p - q
        sp = _sigma_p(p, n_mc_runs)
        sq = (
            _sigma_q_bootstrap(odds, i)
            if odds is not None
            else math.sqrt(max(q * (1 - q), 0.0) / _BOOTSTRAP_TICKS)
        )
        denom = math.sqrt(sp ** 2 + sq ** 2)
        E_star = E / denom if denom > 1e-12 else 0.0

        above = abs(E) > eps
        reason = "ABOVE_THRESHOLD" if above else "NOT_FLAGGED"

        flags.append(EdgeFlag(
            outcome_id=oid,
            E=E,
            E_star=E_star,
            sigma_p=sp,
            sigma_q=sq,
            threshold=eps,
            flagged=above,
            reason_code=reason,
        ))
        if above:
            flagged_indices.append(i)

    # Detect two-sided flags: same market has opposing flagged legs
    # (model higher on one, book higher on another — indicates inconsistency)
    if len(flagged_indices) >= 2:
        signs = [flags[i].E > 0 for i in flagged_indices]
        if any(signs) and not all(signs):
            # Mix of positive and negative flags on same market
            new_flags: List[EdgeFlag] = []
            flagged_set = set(flagged_indices)
            for i, f in enumerate(flags):
                if i in flagged_set and f.flagged:
                    new_flags.append(EdgeFlag(
                        outcome_id=f.outcome_id,
                        E=f.E,
                        E_star=f.E_star,
                        sigma_p=f.sigma_p,
                        sigma_q=f.sigma_q,
                        threshold=f.threshold,
                        flagged=f.flagged,
                        reason_code=f.reason_code,
                        is_two_sided_flag=True,
                    ))
                else:
                    new_flags.append(f)
            return new_flags

    return flags
