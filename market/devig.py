"""
market/devig.py
===============
Power-method de-vigging (Shin 1993; Štrumbelj 2014).

Solves F(z) = Σ r_i^z − 1 = 0 via Brent's method to find the unique exponent z
such that the raw implied probabilities raised to z sum to exactly 1.  For a
bookmaker with positive overround (e.g. Pinnacle) this yields z > 1; for an
exchange with commission the same equation yields z < 1.  The de-vigged
probability for each outcome is then q_i = r_i^z (normalisation is automatic).

After root-finding, Pinnacle-specific bias corrections calibrated on the
2010–2022 WC corpus are applied.  These constants are PRE-REGISTERED and must
NOT be re-fit on 2026 data.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from scipy.optimize import brentq, brentq as _brentq

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Pre-registered Pinnacle bias corrections (2010–2022 calibration corpus)
# DO NOT change after pre-registration — §1.6 of the Phase 6 design document.
# ---------------------------------------------------------------------------
_DELTA_DRAW_KNOCKOUT: float = 0.014   # Pinnacle under-prices draw on neutral KO
_DELTA_HOST_WIN: float = -0.006       # Pinnacle over-prices host win in group stage

# Brent solver parameters (§1.4)
_BRENT_XTOL: int = int(1e-8)          # stored as int avoids float repr issues
_BRENT_XTOL_F: float = 1e-8
_BRENT_MAX_ITER: int = 100

# Anomaly-detection bands for z.
# For Pinnacle (overround), z > 1 is normal; flag extreme deviations.
# Derived from: Σr_i ∈ [1.02, 1.12] covers 2–12% overround → z ∈ [1.02, 1.12].
# We add generous outer margins so only genuinely anomalous markets are flagged.
_Z_LOW_PINNACLE: float = 1.0    # underround on Pinnacle → anomalous
_Z_HIGH_PINNACLE: float = 1.20  # >20% overround → misparsed or broken data
# For exchange/polymarket (underround), z < 1 is normal.
_Z_LOW_EXCHANGE: float = 0.80
_Z_HIGH_EXCHANGE: float = 1.0

PINNACLE_BOOK = "pinnacle"
KNOCKOUT_STAGES = frozenset({
    "round_of_32", "round_of_16", "quarter_final",
    "semi_final", "third_place", "final",
})
GROUP_STAGE = "group"


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class DeviggingNotConverged(RuntimeError):
    """
    Raised when Brent's method cannot bracket F(z) = Σr_i^z − 1 = 0.

    This should never occur on well-formed odds — failure indicates upstream
    data corruption and must be logged, not silently coerced.
    """


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DevigResult:
    q: List[float]                   # de-vigged probabilities (sum ≈ 1.0)
    z: float                          # fitted Power-method exponent
    overround: float                  # Σ r_i − 1
    corrections_applied: List[str]
    warnings: List[str]


# ---------------------------------------------------------------------------
# Core solver
# ---------------------------------------------------------------------------

def _solve_z(raw: List[float]) -> float:
    """
    Find z such that Σ r_i^z = 1 using Brent's method.

    For overround markets (Σr > 1): root is at z > 1.  Bracket: (1, 20).
    For underround markets (Σr < 1): root is at z ∈ (0, 1).  Bracket: (1e-6, 1).
    For no-overround markets (Σr == 1): z = 1 exactly.
    """
    booksum = sum(raw)
    overround = booksum - 1.0

    if abs(overround) < 1e-10:
        return 1.0  # no-overround: trivial case, z = 1

    def F(z: float) -> float:
        return sum(r ** z for r in raw) - 1.0

    if overround > 0:
        # F(1) = overround > 0;  F(large) → −1 < 0 → root exists in (1, ∞)
        lo, hi = 1.0 + 1e-9, 20.0
        if F(hi) >= 0:
            raise DeviggingNotConverged(
                f"Cannot bracket F(z): F({hi})={F(hi):.6f} ≥ 0 "
                f"(overround={overround:.4f}, n={len(raw)})"
            )
    else:
        # F(0+) ≈ n − 1 > 0;  F(1) = overround < 0 → root in (0, 1)
        lo, hi = 1e-9, 1.0 - 1e-12
        if F(lo) <= 0:
            raise DeviggingNotConverged(
                f"Cannot bracket F(z): F({lo})={F(lo):.6f} ≤ 0 "
                f"(overround={overround:.4f}, n={len(raw)})"
            )

    try:
        z = _brentq(F, lo, hi, xtol=_BRENT_XTOL_F, maxiter=_BRENT_MAX_ITER)
    except ValueError as exc:
        raise DeviggingNotConverged(str(exc)) from exc

    return float(z)


# ---------------------------------------------------------------------------
# Pinnacle bias corrections
# ---------------------------------------------------------------------------

def _apply_knockout_draw_correction(
    q: List[float],
    outcome_labels: List[str],
) -> tuple[List[float], List[str]]:
    """Add Δ_draw = +0.014 to draw leg on knockout-stage markets, renormalise."""
    if "draw" not in outcome_labels:
        return q, []

    draw_idx = outcome_labels.index("draw")
    q_new = list(q)
    q_new[draw_idx] += _DELTA_DRAW_KNOCKOUT

    # Renormalise non-draw legs proportionally
    total_non_draw = sum(q_new[i] for i in range(len(q_new)) if i != draw_idx)
    excess = q_new[draw_idx] - q[draw_idx]          # = _DELTA_DRAW_KNOCKOUT
    scale = (total_non_draw - excess) / total_non_draw if total_non_draw > 0 else 1.0
    for i in range(len(q_new)):
        if i != draw_idx:
            q_new[i] *= scale

    return q_new, ["knockout_draw_correction"]


def _apply_host_win_correction(
    q: List[float],
    outcome_labels: List[str],
    host_team: str,
) -> tuple[List[float], List[str]]:
    """
    Subtract Δ_host = −0.006 from host win leg in group stage, renormalise.
    `host_team` must match the outcome label for the host's win (e.g. 'home_win').
    """
    if host_team not in outcome_labels:
        return q, []

    host_idx = outcome_labels.index(host_team)
    q_new = list(q)
    q_new[host_idx] = max(0.0, q_new[host_idx] + _DELTA_HOST_WIN)

    # Renormalise non-host legs proportionally
    total_non_host = sum(q_new[i] for i in range(len(q_new)) if i != host_idx)
    deficit = q[host_idx] - q_new[host_idx]
    if total_non_host > 0 and deficit > 0:
        scale = (total_non_host + deficit) / total_non_host
        for i in range(len(q_new)):
            if i != host_idx:
                q_new[i] *= scale

    return q_new, ["host_win_correction"]


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def devig(
    odds: List[float],
    book: str,
    market_type: str,
    stage: str,
    host_team: Optional[str] = None,
    outcome_labels: Optional[List[str]] = None,
) -> DevigResult:
    """
    Power-method de-vigging.

    Parameters
    ----------
    odds : list[float]
        Decimal odds for each mutually-exclusive outcome (all must be > 1.0).
    book : str
        Bookmaker identifier: 'pinnacle', 'betfair', or 'polymarket'.
    market_type : str
        Market classification, e.g. '1x2', 'match_winner', 'tournament_winner'.
    stage : str
        Tournament stage: 'group', 'round_of_32', 'round_of_16', 'quarter_final',
        'semi_final', 'third_place', 'final'.
    host_team : str | None
        Outcome label of the host nation's win leg (e.g. 'home_win') if one of
        the participating teams is a tournament host.  Only used on 'group' stage
        Pinnacle markets.
    outcome_labels : list[str] | None
        Ordered labels matching `odds` (e.g. ['home_win', 'draw', 'away_win']).
        Required for Pinnacle bias corrections.

    Returns
    -------
    DevigResult
        Pure function — no I/O, no logging.
    """
    if len(odds) < 2:
        raise ValueError(f"Need ≥ 2 outcomes, got {len(odds)}")
    for o in odds:
        if o <= 1.0:
            raise ValueError(f"All decimal odds must be > 1.0, got {o!r}")

    if outcome_labels is not None and len(outcome_labels) != len(odds):
        raise ValueError(
            f"outcome_labels length {len(outcome_labels)} != odds length {len(odds)}"
        )

    labels = outcome_labels or []

    raw = [1.0 / o for o in odds]
    overround = sum(raw) - 1.0

    # --- Solve for z ---
    z = _solve_z(raw)

    # q_i = r_i^z  (sums to 1 by construction — that's what we solved for)
    q: List[float] = [r ** z for r in raw]

    # Sanity: verify sum ≈ 1 within numerical tolerance
    q_sum = sum(q)
    if abs(q_sum - 1.0) > 1e-6:
        # Renormalise as a safety net (should not be needed)
        q = [qi / q_sum for qi in q]

    # --- Anomaly detection ---
    warnings: List[str] = []
    is_pinnacle = book.lower() == PINNACLE_BOOK

    if is_pinnacle:
        if z < _Z_LOW_PINNACLE or z > _Z_HIGH_PINNACLE:
            warnings.append(
                f"Z_OUT_OF_BAND: z={z:.4f} outside [{_Z_LOW_PINNACLE}, {_Z_HIGH_PINNACLE}] "
                f"(overround={overround:.4f})"
            )
    else:
        if z < _Z_LOW_EXCHANGE or z > _Z_HIGH_EXCHANGE:
            warnings.append(
                f"Z_OUT_OF_BAND: z={z:.4f} outside [{_Z_LOW_EXCHANGE}, {_Z_HIGH_EXCHANGE}] "
                f"(overround={overround:.4f})"
            )

    # --- Pinnacle bias corrections (§1.6) ---
    corrections_applied: List[str] = []

    if is_pinnacle and labels:
        # Knockout draw correction
        if stage.lower() in KNOCKOUT_STAGES:
            q, corr = _apply_knockout_draw_correction(q, labels)
            corrections_applied.extend(corr)

        # Host-nation group-stage premium correction
        if stage.lower() == GROUP_STAGE and host_team is not None:
            q, corr = _apply_host_win_correction(q, labels, host_team)
            corrections_applied.extend(corr)

    return DevigResult(
        q=q,
        z=z,
        overround=overround,
        corrections_applied=corrections_applied,
        warnings=warnings,
    )
