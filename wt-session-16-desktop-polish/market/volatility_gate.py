"""
market/volatility_gate.py
=========================
Five-rule volatility gate for M★ (§3 Phase 6 design).

Rules applied in order — first rule to fire wins:
  1. NAMED_EVENT_6H        : gate-relevant news event within 6h of market ts
  2. PRICE_DISCOVERY_INTRA_BOOK : Pinnacle line moved >3pp in prior 30 min
  3. PRICE_DISCOVERY_CROSS_BOOK : Pinnacle–Betfair spread >2.5pp
  4. LIQUIDITY_POLYMARKET_LOW   : Polymarket 24h volume < USD 50,000
  5. LIQUIDITY_PINNACLE_STALE   : Pinnacle quote >4h stale

Append-only logging:
  - Every gate decision (PASS or SUPPRESSED) is appended to gate_log.jsonl.
  - A SHA-256 sidecar (gate_log.jsonl.sha256) is updated after every flush.
  - The log is opened with mode 'a' (O_APPEND equivalent); never 'w'.

Public interface:
  apply_gate(flag, market_snapshot, news_window) -> GateDecision
  _log_decision(decision, log_path)
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.edge_calculator import EdgeFlag
from market.news_monitor import NewsWindow

# ---------------------------------------------------------------------------
# Pre-registered gate thresholds (§3.2, §8 — DO NOT modify during 2026 WC)
# ---------------------------------------------------------------------------
_NEWS_SUPPRESSION_HOURS: float = 6.0          # Rule 1: news window
_PRICE_SWING_THRESHOLD: float = 0.03          # Rule 2: 3 pp in 30 min
_PRICE_SWING_WINDOW_MINUTES: float = 30.0
_CROSS_BOOK_SPREAD_THRESHOLD: float = 0.025   # Rule 3: 2.5 pp
_POLYMARKET_MIN_VOLUME: float = 50_000.0      # Rule 4: USD 50k
_PINNACLE_MAX_STALENESS_HOURS: float = 4.0    # Rule 5: 4 hours


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class GateStatus(str, Enum):
    PASS = "PASS"
    SUPPRESSED = "SUPPRESSED"


class ReasonCode(str, Enum):
    NONE = "NONE"
    NAMED_EVENT_6H = "NAMED_EVENT_6H"
    PRICE_DISCOVERY_INTRA_BOOK = "PRICE_DISCOVERY_INTRA_BOOK"
    PRICE_DISCOVERY_CROSS_BOOK = "PRICE_DISCOVERY_CROSS_BOOK"
    LIQUIDITY_POLYMARKET_LOW = "LIQUIDITY_POLYMARKET_LOW"
    LIQUIDITY_PINNACLE_STALE = "LIQUIDITY_PINNACLE_STALE"
    Z_OUT_OF_BAND = "Z_OUT_OF_BAND"


@dataclass(frozen=True)
class MarketSnapshot:
    """
    All market-microstructure data needed by the volatility gate for one
    (market_id, timestamp) evaluation.
    """
    market_id: str
    outcome_id: str
    ts: datetime                          # snapshot time (UTC)

    # Rule 2: Pinnacle intra-book price movement
    pinnacle_q_now: float                 # current de-vigged prob (flagged leg)
    pinnacle_q_30min_ago: Optional[float] = None   # de-vigged prob 30min ago

    # Rule 3: Cross-book spread (Pinnacle vs Betfair Exchange)
    betfair_q: Optional[float] = None    # de-vigged prob on Betfair

    # Rule 4: Polymarket volume
    polymarket_volume_24h_usd: Optional[float] = None

    # Rule 5: Pinnacle staleness
    pinnacle_last_updated: Optional[datetime] = None  # last quote refresh time


@dataclass(frozen=True)
class GateDecision:
    """Result of apply_gate() for one (market_id, outcome_id, ts) triple."""
    market_id: str
    outcome_id: str
    ts: datetime
    E: float
    E_star: float
    gate_status: GateStatus
    reason_code: ReasonCode
    rule_inputs: Dict[str, Any]   # values that drove the decision

    def to_log_row(self, code_sha: str = "", data_sha: str = "") -> Dict[str, Any]:
        return {
            "ts": self.ts.isoformat(),
            "market_id": self.market_id,
            "outcome_id": self.outcome_id,
            "E": self.E,
            "E_star": self.E_star,
            "gate_status": self.gate_status.value,
            "reason_code": self.reason_code.value,
            "rule_inputs": self.rule_inputs,
            "code_sha": code_sha,
            "data_sha": data_sha,
        }


# ---------------------------------------------------------------------------
# Rule evaluators (pure functions — no side effects)
# ---------------------------------------------------------------------------

def _rule1_named_event(
    flag: EdgeFlag,
    snapshot: MarketSnapshot,
    news_window: NewsWindow,
    entity_ids: Optional[List[str]] = None,
) -> Optional[tuple]:
    """
    Rule 1: Suppress if a gate-relevant NamedEvent for either participating
    team/entity occurred within _NEWS_SUPPRESSION_HOURS before the snapshot ts.
    """
    since = snapshot.ts - timedelta(hours=_NEWS_SUPPRESSION_HOURS)
    recent_events = news_window.get_events_since(since)

    if not recent_events:
        return None

    relevant_ids = set(entity_ids or [])
    for evt in recent_events:
        if not relevant_ids or evt.entity_id in relevant_ids:
            return (
                ReasonCode.NAMED_EVENT_6H,
                {
                    "rule": 1,
                    "triggering_event_id": evt.event_id,
                    "triggering_event_ts": evt.ts.isoformat(),
                    "triggering_entity": evt.entity_id,
                    "news_suppression_hours": _NEWS_SUPPRESSION_HOURS,
                },
            )
    return None


def _rule2_price_discovery_intra(snapshot: MarketSnapshot) -> Optional[tuple]:
    """
    Rule 2: Suppress if Pinnacle line moved >3pp in prior 30 minutes.
    """
    if snapshot.pinnacle_q_30min_ago is None:
        return None

    delta = abs(snapshot.pinnacle_q_now - snapshot.pinnacle_q_30min_ago)
    if delta > _PRICE_SWING_THRESHOLD:
        return (
            ReasonCode.PRICE_DISCOVERY_INTRA_BOOK,
            {
                "rule": 2,
                "pinnacle_q_now": snapshot.pinnacle_q_now,
                "pinnacle_q_30min_ago": snapshot.pinnacle_q_30min_ago,
                "delta_pp": delta,
                "threshold_pp": _PRICE_SWING_THRESHOLD,
                "window_minutes": _PRICE_SWING_WINDOW_MINUTES,
            },
        )
    return None


def _rule3_price_discovery_cross(snapshot: MarketSnapshot) -> Optional[tuple]:
    """
    Rule 3: Suppress if Pinnacle–Betfair spread >2.5pp on the flagged leg.
    """
    if snapshot.betfair_q is None:
        return None

    spread = abs(snapshot.pinnacle_q_now - snapshot.betfair_q)
    if spread > _CROSS_BOOK_SPREAD_THRESHOLD:
        return (
            ReasonCode.PRICE_DISCOVERY_CROSS_BOOK,
            {
                "rule": 3,
                "pinnacle_q": snapshot.pinnacle_q_now,
                "betfair_q": snapshot.betfair_q,
                "spread_pp": spread,
                "threshold_pp": _CROSS_BOOK_SPREAD_THRESHOLD,
            },
        )
    return None


def _rule4_liquidity_polymarket(snapshot: MarketSnapshot) -> Optional[tuple]:
    """
    Rule 4: Suppress if Polymarket 24h volume < USD 50,000.
    """
    if snapshot.polymarket_volume_24h_usd is None:
        return None

    if snapshot.polymarket_volume_24h_usd < _POLYMARKET_MIN_VOLUME:
        return (
            ReasonCode.LIQUIDITY_POLYMARKET_LOW,
            {
                "rule": 4,
                "polymarket_volume_24h_usd": snapshot.polymarket_volume_24h_usd,
                "threshold_usd": _POLYMARKET_MIN_VOLUME,
            },
        )
    return None


def _rule5_liquidity_stale(snapshot: MarketSnapshot) -> Optional[tuple]:
    """
    Rule 5: Suppress if Pinnacle quote is more than 4 hours stale.
    """
    if snapshot.pinnacle_last_updated is None:
        return None

    staleness_hours = (
        (snapshot.ts - snapshot.pinnacle_last_updated).total_seconds() / 3600.0
    )
    if staleness_hours > _PINNACLE_MAX_STALENESS_HOURS:
        return (
            ReasonCode.LIQUIDITY_PINNACLE_STALE,
            {
                "rule": 5,
                "staleness_hours": staleness_hours,
                "threshold_hours": _PINNACLE_MAX_STALENESS_HOURS,
                "pinnacle_last_updated": snapshot.pinnacle_last_updated.isoformat(),
            },
        )
    return None


# ---------------------------------------------------------------------------
# Gate logic (pure)
# ---------------------------------------------------------------------------

def apply_gate(
    flag: EdgeFlag,
    market_snapshot: MarketSnapshot,
    news_window: NewsWindow,
    entity_ids: Optional[List[str]] = None,
) -> GateDecision:
    """
    Apply all five suppression rules in order (§3.2).  First rule to fire wins.

    Parameters
    ----------
    flag : EdgeFlag
        The flagged edge to evaluate.
    market_snapshot : MarketSnapshot
        Market microstructure data for this (market_id, ts) snapshot.
    news_window : NewsWindow
        Rolling 24-hour news window snapshot from NewsMonitor.
    entity_ids : list[str] | None
        Canonical IDs of the two participating teams (for Rule 1 entity matching).

    Returns
    -------
    GateDecision
        Pure function with respect to inputs.  Side-effect (log append) is
        performed by the caller via _log_decision().
    """
    rules = [
        lambda: _rule1_named_event(flag, market_snapshot, news_window, entity_ids),
        lambda: _rule2_price_discovery_intra(market_snapshot),
        lambda: _rule3_price_discovery_cross(market_snapshot),
        lambda: _rule4_liquidity_polymarket(market_snapshot),
        lambda: _rule5_liquidity_stale(market_snapshot),
    ]

    for rule_fn in rules:
        result = rule_fn()
        if result is not None:
            reason_code, rule_inputs = result
            return GateDecision(
                market_id=market_snapshot.market_id,
                outcome_id=flag.outcome_id,
                ts=market_snapshot.ts,
                E=flag.E,
                E_star=flag.E_star,
                gate_status=GateStatus.SUPPRESSED,
                reason_code=reason_code,
                rule_inputs=rule_inputs,
            )

    return GateDecision(
        market_id=market_snapshot.market_id,
        outcome_id=flag.outcome_id,
        ts=market_snapshot.ts,
        E=flag.E,
        E_star=flag.E_star,
        gate_status=GateStatus.PASS,
        reason_code=ReasonCode.NONE,
        rule_inputs={},
    )


# ---------------------------------------------------------------------------
# Append-only log writer
# ---------------------------------------------------------------------------

def _log_decision(
    decision: GateDecision,
    log_path: Path,
    code_sha: str = "",
    data_sha: str = "",
) -> None:
    """
    Append a gate decision row to gate_log.jsonl and update the SHA-256 sidecar.

    The log file is opened in append mode ('a') — it is NEVER truncated or
    overwritten.  The sidecar SHA-256 is recomputed over the entire log file
    after each append so a tampered or truncated log can be detected.

    This is the only function in this module that touches the filesystem.
    """
    row = decision.to_log_row(code_sha=code_sha, data_sha=data_sha)
    line = json.dumps(row, ensure_ascii=False) + "\n"

    # Append (O_APPEND semantics)
    with open(log_path, "a", encoding="utf-8") as fh:
        fh.write(line)

    # Update sidecar SHA-256
    _update_sha_sidecar(log_path)


def _update_sha_sidecar(log_path: Path) -> str:
    """
    Recompute SHA-256 over the full log file and write to log_path.sha256.
    Returns the hex digest.
    """
    sha = hashlib.sha256()
    with open(log_path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            sha.update(chunk)
    digest = sha.hexdigest()
    sidecar = Path(str(log_path) + ".sha256")
    sidecar.write_text(digest + "\n", encoding="utf-8")
    return digest
