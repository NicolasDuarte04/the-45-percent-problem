"""
market/kelly_sizer.py
=====================
Fractional Kelly bet-sizing with hardcoded drawdown stop/halt (§4 Phase 6).

All parameters are PRE-REGISTERED and hardcoded in this module:
  - Kelly fraction: 1/4 mainline, 1/8 longshot
  - Per-market cap: 5% mainline, 2.5% longshot
  - Longshot threshold: q_devigged < 10%
  - Drawdown stop: bankroll < 80% of peak → HALVED mode
  - Recovery target: bankroll ≥ 90% of peak → resume NORMAL
  - Second 20% drawdown while HALVED → STOPPED mode

No trades are executed. f_final is a *recommended stake fraction* only.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ---------------------------------------------------------------------------
# Pre-registered sizing constants (§4.2, §4.3)
# ---------------------------------------------------------------------------
_KELLY_FRACTION_MAINLINE: float = 0.25        # 1/4
_KELLY_FRACTION_LONGSHOT: float = 0.125       # 1/8
_CAP_MAINLINE: float = 0.05                   # 5% of bankroll
_CAP_LONGSHOT: float = 0.025                  # 2.5% of bankroll
_LONGSHOT_THRESHOLD: float = 0.10             # q_devigged < 10% → longshot bucket
_DRAWDOWN_TRIGGER: float = 0.20               # 20% drop from peak → HALVED
_RECOVERY_TARGET: float = 0.90               # 90% of peak → resume NORMAL
_HALVED_MULTIPLIER: float = 0.5


# ---------------------------------------------------------------------------
# Mode enum
# ---------------------------------------------------------------------------

class BankrollMode(str, Enum):
    NORMAL = "NORMAL"
    HALVED = "HALVED"
    STOPPED = "STOPPED"


# ---------------------------------------------------------------------------
# State and result types
# ---------------------------------------------------------------------------

@dataclass
class BankrollState:
    """
    Mutable bankroll tracker.  Mutation after settlement is the orchestrator's
    responsibility — the sizer is a pure function of this state.

    halved_episodes counts how many distinct HALVED episodes have been entered
    (each NORMAL→HALVED transition increments it).  A second episode (≥ 2)
    while in HALVED mode and still below 80% triggers STOPPED.
    """
    current_bankroll: float
    peak_bankroll: float
    mode: BankrollMode = BankrollMode.NORMAL
    halved_episodes: int = 0   # counts NORMAL→HALVED transitions

    def __post_init__(self) -> None:
        if self.current_bankroll <= 0:
            raise ValueError(f"current_bankroll must be > 0, got {self.current_bankroll}")
        if self.peak_bankroll <= 0:
            raise ValueError(f"peak_bankroll must be > 0, got {self.peak_bankroll}")
        if self.current_bankroll > self.peak_bankroll + 1e-9:
            raise ValueError(
                f"current_bankroll {self.current_bankroll} > peak_bankroll {self.peak_bankroll}"
            )

    @property
    def drawdown_fraction(self) -> float:
        """Fraction dropped from peak: 0 = no drawdown, 0.2 = 20% drawdown."""
        return 1.0 - (self.current_bankroll / self.peak_bankroll)

    def update_mode(self) -> "BankrollState":
        """
        Apply the pre-registered drawdown stop/recovery logic.

        Returns a NEW BankrollState with updated mode and episode count.
        peak_bankroll is NEVER re-anchored on partial recovery per §4.3.

        State-machine:
          NORMAL  → HALVED  when ratio < 80%  (increments halved_episodes)
          HALVED  → NORMAL  when ratio ≥ 90%
          HALVED  → STOPPED when ratio < 80% AND halved_episodes ≥ 2
                            (i.e. we entered a SECOND distinct HALVED episode)
          STOPPED → NORMAL  when ratio ≥ 90%
        """
        ratio = self.current_bankroll / self.peak_bankroll
        below_trigger = ratio < (1.0 - _DRAWDOWN_TRIGGER)   # < 80%
        above_recovery = ratio >= _RECOVERY_TARGET           # ≥ 90%

        new_mode = self.mode
        new_episodes = self.halved_episodes

        if self.mode == BankrollMode.NORMAL:
            if below_trigger:
                new_episodes += 1
                new_mode = BankrollMode.HALVED

        elif self.mode == BankrollMode.HALVED:
            if above_recovery:
                new_mode = BankrollMode.NORMAL
            elif below_trigger and new_episodes >= 2:
                # Second (or later) HALVED episode currently below 80% → STOPPED
                new_mode = BankrollMode.STOPPED

        elif self.mode == BankrollMode.STOPPED:
            if above_recovery:
                new_mode = BankrollMode.NORMAL

        return BankrollState(
            current_bankroll=self.current_bankroll,
            peak_bankroll=self.peak_bankroll,
            mode=new_mode,
            halved_episodes=new_episodes,
        )


@dataclass(frozen=True)
class SizingDecision:
    """Result of size_bet().  Pure data — no side effects."""
    f_full: float           # full Kelly fraction (may be negative → no bet)
    f_fractional: float     # after Kelly multiplier
    f_capped: float         # after per-market hard cap
    f_final: float          # after drawdown mode adjustment (the recommended fraction)
    mode: BankrollMode
    applied_caps: List[str]

    @classmethod
    def zero(cls, reason: str, mode: BankrollMode = BankrollMode.NORMAL) -> "SizingDecision":
        """No-bet decision (suppressed or negative edge)."""
        return cls(
            f_full=0.0,
            f_fractional=0.0,
            f_capped=0.0,
            f_final=0.0,
            mode=mode,
            applied_caps=[reason],
        )


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def size_bet(
    edge: float,
    q_devigged: float,
    decimal_odds: float,
    bankroll_state: BankrollState,
) -> SizingDecision:
    """
    Compute the recommended stake fraction under fractional Kelly with drawdown stops.

    Parameters
    ----------
    edge : float
        Additive edge E = p_model − q_devigged (from EdgeFlag.E).
    q_devigged : float
        De-vigged book probability for this outcome (determines mainline vs longshot).
    decimal_odds : float
        Decimal odds for this outcome (must be > 1.0).
    bankroll_state : BankrollState
        Current bankroll position.

    Returns
    -------
    SizingDecision
        Pure function — does NOT mutate bankroll_state.
    """
    if decimal_odds <= 1.0:
        raise ValueError(f"decimal_odds must be > 1.0, got {decimal_odds}")
    if not (0.0 <= q_devigged <= 1.0):
        raise ValueError(f"q_devigged must be in [0, 1], got {q_devigged}")

    # Determine mode BEFORE sizing (orchestrator should keep state current,
    # but we recompute here as a safety check — update_mode() is pure)
    state = bankroll_state.update_mode()

    # STOPPED mode → zero stake
    if state.mode == BankrollMode.STOPPED:
        return SizingDecision.zero("STOPPED_MODE", mode=state.mode)

    # Negative or zero edge → no bet
    p_model = q_devigged + edge
    if p_model <= 0:
        return SizingDecision.zero("NEGATIVE_P_MODEL", mode=state.mode)

    # Full Kelly: f_full = (p*o - 1) / (o - 1)
    o = decimal_odds
    f_full = (p_model * o - 1.0) / (o - 1.0)

    if f_full <= 0.0:
        return SizingDecision.zero("NEGATIVE_EDGE", mode=state.mode)

    # Determine market class bucket from q_devigged (NOT p_model — see §4.2)
    is_longshot = q_devigged < _LONGSHOT_THRESHOLD

    if is_longshot:
        phi = _KELLY_FRACTION_LONGSHOT
        cap = _CAP_LONGSHOT
        bucket = "longshot"
    else:
        phi = _KELLY_FRACTION_MAINLINE
        cap = _CAP_MAINLINE
        bucket = "mainline"

    caps_applied: List[str] = []

    # Apply fractional Kelly
    f_fractional = phi * f_full
    caps_applied.append(f"kelly_{bucket}")

    # Apply per-market hard cap (clip to cap)
    f_capped = min(f_fractional, cap)
    if f_capped < f_fractional:
        caps_applied.append(f"per_market_cap_{bucket}")

    # Apply HALVED mode multiplier
    if state.mode == BankrollMode.HALVED:
        f_final = f_capped * _HALVED_MULTIPLIER
        caps_applied.append("halved_mode")
    else:
        f_final = f_capped

    return SizingDecision(
        f_full=f_full,
        f_fractional=f_fractional,
        f_capped=f_capped,
        f_final=f_final,
        mode=state.mode,
        applied_caps=caps_applied,
    )
