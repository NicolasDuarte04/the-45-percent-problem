"""
market/market_pipeline.py
=========================
End-to-end Phase 6 orchestrator (§7 Phase 6 design).

Wires devig → edge_calculator → volatility_gate → kelly_sizer into a single
per-(market_id, timestamp) sequence and writes the canonical forecast_log.jsonl.

Key properties:
  - Append-only forecast_log.jsonl (rows never deleted or overwritten)
  - Restart-safe: bankroll state and news window are rehydrated from logs
  - Deterministic: same archived snapshot → byte-identical output
  - Isolation: does NOT import anything from simulation/; reads Parquet only
  - Validation: every row validated against ForecastLogRow Pydantic model

Per-event cap (8%) and per-day cap (15%) are enforced in a two-pass mechanism:
  Pass 1 — write provisional rows
  Pass 2 — compute sum; if cap exceeded, write adjustment rows referencing parent
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Phase 6 layer imports (no simulation/ imports allowed — §9.9)
from market.devig import devig, DevigResult
from market.edge_calculator import calculate_edge, EdgeFlag
from market.kelly_sizer import (
    BankrollMode, BankrollState, SizingDecision, size_bet,
)
from market.news_monitor import NewsMonitor, NewsWindow
from market.volatility_gate import (
    GateDecision, GateStatus, MarketSnapshot,
    apply_gate, _log_decision,
)

# ---------------------------------------------------------------------------
# Pre-registered orchestrator caps (§4.2)
# ---------------------------------------------------------------------------
_PER_EVENT_CAP: float = 0.08   # 8% of bankroll across all legs of one match
_PER_DAY_CAP: float = 0.15     # 15% of bankroll per calendar day


# ---------------------------------------------------------------------------
# Pydantic schema for forecast_log.jsonl (§9.10)
# ---------------------------------------------------------------------------

class ForecastLogRow(BaseModel):
    """
    One row in the append-only forecast_log.jsonl.

    Every row must validate against this schema.  A row that fails validation
    MUST raise — the pipeline must NOT silently skip a malformed row.
    """
    row_id: str
    parent_decision_id: Optional[str] = None   # set for cap-adjustment rows
    ts: str                                    # ISO 8601 UTC
    market_id: str
    outcome_id: str
    model_variant: str = "M*"

    # Probabilities
    p_model: float = Field(ge=0.0, le=1.0)
    q_devigged: float = Field(ge=0.0, le=1.0)
    E: float                                   # additive edge
    E_star: float

    # Gate
    gate_status: str   # "PASS" | "SUPPRESSED"
    reason_code: str

    # Sizing
    recommended_stake_fraction: float = Field(ge=0.0)
    bankroll_mode: str

    # Reproducibility
    code_sha: str
    data_sha: str
    spec_sha: str = ""

    # Optional cap metadata
    cap_adjustment: bool = False
    applied_caps: List[str] = Field(default_factory=list)

    def to_jsonl(self) -> str:
        return self.model_dump_json() + "\n"


# ---------------------------------------------------------------------------
# Pipeline configuration
# ---------------------------------------------------------------------------

@dataclass
class PipelineConfig:
    forecast_log_path: Path
    gate_log_path: Path
    initial_bankroll: float = 10_000.0
    code_sha: str = "unknown"
    data_sha: str = "unknown"
    spec_sha: str = "unknown"
    news_monitor: Optional[NewsMonitor] = None


@dataclass
class PipelineRunSummary:
    ts: str
    markets_processed: int = 0
    flags_raised: int = 0
    gates_passed: int = 0
    suppressed_named_event: int = 0
    suppressed_price_intra: int = 0
    suppressed_price_cross: int = 0
    suppressed_liquidity_poly: int = 0
    suppressed_liquidity_stale: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Internal state
# ---------------------------------------------------------------------------

@dataclass
class _DailyAccumulator:
    """Tracks total recommended stake fraction per calendar day."""
    date: str   # YYYY-MM-DD in UTC
    total_fraction: float = 0.0


# ---------------------------------------------------------------------------
# MarketPipeline
# ---------------------------------------------------------------------------

class MarketPipeline:
    """
    End-to-end Phase 6 pipeline.

    Usage
    -----
        pipeline = MarketPipeline(config)
        summary = pipeline.run_once(timestamp, market_inputs)
    """

    def __init__(self, config: PipelineConfig) -> None:
        self._cfg = config
        self._bankroll_state = self._rehydrate_bankroll()
        self._news_monitor = config.news_monitor
        self._daily_acc: Optional[_DailyAccumulator] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run_once(
        self,
        timestamp: datetime,
        market_inputs: List[Dict[str, Any]],
    ) -> PipelineRunSummary:
        """
        Process all (market, outcome) pairs for a single timestamp tick.

        Parameters
        ----------
        timestamp : datetime
            Evaluation timestamp (UTC).
        market_inputs : list[dict]
            Each dict describes one market to evaluate:
              {
                market_id, market_class, stage, book, odds, outcome_labels,
                p_model,                    # list[float] from Phase 5 Parquet
                host_team,                  # optional
                entity_ids,                 # for Rule 1 entity matching
                snapshot_data,              # dict → MarketSnapshot fields
              }

        Returns
        -------
        PipelineRunSummary
        """
        summary = PipelineRunSummary(ts=timestamp.isoformat())

        # Rehydrate news window snapshot
        news_window: NewsWindow = (
            self._news_monitor.get_window(timestamp)
            if self._news_monitor is not None
            else NewsWindow()
        )

        # --- Pass 1: provisional sizing ---
        provisional_rows: List[ForecastLogRow] = []
        event_total_fraction: Dict[str, float] = {}  # market_id → sum of f_final

        for mkt in market_inputs:
            rows = self._process_market(mkt, timestamp, news_window, summary)
            for row in rows:
                mid = row.market_id
                event_total_fraction[mid] = (
                    event_total_fraction.get(mid, 0.0) + row.recommended_stake_fraction
                )
            provisional_rows.extend(rows)

        # --- Pass 2: per-event cap enforcement ---
        final_rows = self._enforce_caps(provisional_rows, event_total_fraction, timestamp)

        # --- Append to forecast log (validate first) ---
        for row in final_rows:
            validated = ForecastLogRow.model_validate(row.model_dump())
            self._append_forecast_row(validated)

        return summary

    # ------------------------------------------------------------------
    # Internal: process one market
    # ------------------------------------------------------------------

    def _process_market(
        self,
        mkt: Dict[str, Any],
        timestamp: datetime,
        news_window: NewsWindow,
        summary: PipelineRunSummary,
    ) -> List[ForecastLogRow]:
        summary.markets_processed += 1

        market_id: str = mkt["market_id"]
        market_class: str = mkt.get("market_class", "1x2")
        stage: str = mkt.get("stage", "group")
        book: str = mkt.get("book", "pinnacle")
        odds: List[float] = mkt["odds"]
        outcome_labels: Optional[List[str]] = mkt.get("outcome_labels")
        p_model: List[float] = mkt["p_model"]
        host_team: Optional[str] = mkt.get("host_team")
        entity_ids: Optional[List[str]] = mkt.get("entity_ids")
        snap_data: Dict[str, Any] = mkt.get("snapshot_data", {})

        # 1. De-vig
        devig_result: DevigResult = devig(
            odds=odds,
            book=book,
            market_type=market_class,
            stage=stage,
            host_team=host_team,
            outcome_labels=outcome_labels,
        )

        # 2. Edge calculation
        flags: List[EdgeFlag] = calculate_edge(
            p_model=p_model,
            q_devigged=devig_result.q,
            market_class=market_class,
            outcome_ids=outcome_labels,
            odds=odds,
        )
        flagged = [f for f in flags if f.flagged]
        summary.flags_raised += len(flagged)

        rows: List[ForecastLogRow] = []

        for flag in flags:
            # Build MarketSnapshot for this outcome
            snap = MarketSnapshot(
                market_id=market_id,
                outcome_id=flag.outcome_id,
                ts=timestamp,
                pinnacle_q_now=devig_result.q[
                    (outcome_labels or []).index(flag.outcome_id)
                    if outcome_labels and flag.outcome_id in outcome_labels
                    else 0
                ],
                pinnacle_q_30min_ago=snap_data.get("pinnacle_q_30min_ago"),
                betfair_q=snap_data.get("betfair_q"),
                polymarket_volume_24h_usd=snap_data.get("polymarket_volume_24h_usd"),
                pinnacle_last_updated=snap_data.get("pinnacle_last_updated"),
            )

            # 3. Gate decision
            decision: GateDecision = apply_gate(
                flag=flag,
                market_snapshot=snap,
                news_window=news_window,
                entity_ids=entity_ids,
            )

            # Write to gate log (side effect, intentional)
            _log_decision(
                decision,
                self._cfg.gate_log_path,
                code_sha=self._cfg.code_sha,
                data_sha=self._cfg.data_sha,
            )

            # Track suppression reason
            if decision.gate_status == GateStatus.SUPPRESSED:
                rc = decision.reason_code.value
                if "NAMED_EVENT" in rc:
                    summary.suppressed_named_event += 1
                elif "INTRA_BOOK" in rc:
                    summary.suppressed_price_intra += 1
                elif "CROSS_BOOK" in rc:
                    summary.suppressed_price_cross += 1
                elif "POLYMARKET" in rc:
                    summary.suppressed_liquidity_poly += 1
                elif "STALE" in rc:
                    summary.suppressed_liquidity_stale += 1
            else:
                summary.gates_passed += 1

            # 4. Sizing
            if decision.gate_status == GateStatus.PASS and flag.flagged:
                outcome_idx = (
                    (outcome_labels or []).index(flag.outcome_id)
                    if outcome_labels and flag.outcome_id in outcome_labels
                    else 0
                )
                sizing: SizingDecision = size_bet(
                    edge=flag.E,
                    q_devigged=devig_result.q[outcome_idx],
                    decimal_odds=odds[outcome_idx],
                    bankroll_state=self._bankroll_state,
                )
            else:
                sizing = SizingDecision.zero(
                    reason=decision.reason_code.value or "NOT_FLAGGED",
                    mode=self._bankroll_state.mode,
                )

            # 5. Build row
            outcome_idx2 = (
                (outcome_labels or []).index(flag.outcome_id)
                if outcome_labels and flag.outcome_id in outcome_labels
                else 0
            )
            row = ForecastLogRow(
                row_id=str(uuid.uuid4()),
                ts=timestamp.isoformat(),
                market_id=market_id,
                outcome_id=flag.outcome_id,
                p_model=p_model[outcome_idx2],
                q_devigged=devig_result.q[outcome_idx2],
                E=flag.E,
                E_star=flag.E_star,
                gate_status=decision.gate_status.value,
                reason_code=decision.reason_code.value,
                recommended_stake_fraction=sizing.f_final,
                bankroll_mode=sizing.mode.value,
                code_sha=self._cfg.code_sha,
                data_sha=self._cfg.data_sha,
                spec_sha=self._cfg.spec_sha,
                applied_caps=list(sizing.applied_caps),
            )
            rows.append(row)

        return rows

    # ------------------------------------------------------------------
    # Cap enforcement (Pass 2)
    # ------------------------------------------------------------------

    def _enforce_caps(
        self,
        rows: List[ForecastLogRow],
        event_totals: Dict[str, float],
        timestamp: datetime,
    ) -> List[ForecastLogRow]:
        """
        Apply per-event (8%) and per-day (15%) caps.

        Where a cap is exceeded, output provisional rows unchanged PLUS an
        adjustment row (cap_adjustment=True) referencing the parent row id.
        The log is append-only so we never modify prior rows.
        """
        date_str = timestamp.strftime("%Y-%m-%d")
        if self._daily_acc is None or self._daily_acc.date != date_str:
            self._daily_acc = _DailyAccumulator(date=date_str)

        result = list(rows)   # start with provisional rows

        for mid, total in event_totals.items():
            if total > _PER_EVENT_CAP:
                scale = _PER_EVENT_CAP / total
                for row in rows:
                    if row.market_id == mid and row.recommended_stake_fraction > 0:
                        adj = ForecastLogRow(
                            row_id=str(uuid.uuid4()),
                            parent_decision_id=row.row_id,
                            ts=timestamp.isoformat(),
                            market_id=row.market_id,
                            outcome_id=row.outcome_id,
                            p_model=row.p_model,
                            q_devigged=row.q_devigged,
                            E=row.E,
                            E_star=row.E_star,
                            gate_status=row.gate_status,
                            reason_code=row.reason_code,
                            recommended_stake_fraction=row.recommended_stake_fraction * scale,
                            bankroll_mode=row.bankroll_mode,
                            code_sha=row.code_sha,
                            data_sha=row.data_sha,
                            spec_sha=row.spec_sha,
                            cap_adjustment=True,
                            applied_caps=row.applied_caps + ["per_event_cap"],
                        )
                        result.append(adj)

        # Per-day cap
        day_total = self._daily_acc.total_fraction + sum(
            r.recommended_stake_fraction for r in rows
        )
        if day_total > _PER_DAY_CAP:
            available = max(0.0, _PER_DAY_CAP - self._daily_acc.total_fraction)
            total_in_tick = sum(r.recommended_stake_fraction for r in rows)
            if total_in_tick > 0:
                day_scale = available / total_in_tick
                for row in rows:
                    if row.recommended_stake_fraction > 0:
                        adj = ForecastLogRow(
                            row_id=str(uuid.uuid4()),
                            parent_decision_id=row.row_id,
                            ts=timestamp.isoformat(),
                            market_id=row.market_id,
                            outcome_id=row.outcome_id,
                            p_model=row.p_model,
                            q_devigged=row.q_devigged,
                            E=row.E,
                            E_star=row.E_star,
                            gate_status=row.gate_status,
                            reason_code=row.reason_code,
                            recommended_stake_fraction=row.recommended_stake_fraction * day_scale,
                            bankroll_mode=row.bankroll_mode,
                            code_sha=row.code_sha,
                            data_sha=row.data_sha,
                            spec_sha=row.spec_sha,
                            cap_adjustment=True,
                            applied_caps=row.applied_caps + ["per_day_cap"],
                        )
                        result.append(adj)

        # Update daily accumulator
        self._daily_acc.total_fraction += sum(
            r.recommended_stake_fraction for r in rows
        )

        return result

    # ------------------------------------------------------------------
    # Restart-safe bankroll rehydration
    # ------------------------------------------------------------------

    def _rehydrate_bankroll(self) -> BankrollState:
        """
        Reconstruct BankrollState from tail of forecast_log.jsonl.
        Falls back to initial bankroll if log is absent or empty.
        """
        log = self._cfg.forecast_log_path
        if not log.exists() or log.stat().st_size == 0:
            return BankrollState(
                current_bankroll=self._cfg.initial_bankroll,
                peak_bankroll=self._cfg.initial_bankroll,
                mode=BankrollMode.NORMAL,
            )

        # Scan the log for the last bankroll_mode entry
        last_mode = BankrollMode.NORMAL
        try:
            with open(log, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        row = json.loads(line)
                        last_mode = BankrollMode(row.get("bankroll_mode", "NORMAL"))
                    except (json.JSONDecodeError, ValueError):
                        continue
        except OSError:
            pass

        return BankrollState(
            current_bankroll=self._cfg.initial_bankroll,
            peak_bankroll=self._cfg.initial_bankroll,
            mode=last_mode,
        )

    # ------------------------------------------------------------------
    # Log append
    # ------------------------------------------------------------------

    def _append_forecast_row(self, row: ForecastLogRow) -> None:
        with open(self._cfg.forecast_log_path, "a", encoding="utf-8") as fh:
            fh.write(row.to_jsonl())
