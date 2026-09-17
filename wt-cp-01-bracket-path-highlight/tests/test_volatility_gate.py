"""
tests/test_volatility_gate.py
==============================
Unit tests for market/volatility_gate.py.

Acceptance criteria (§9.3):
- All five rules fire correctly on their trigger conditions.
- Rules are applied in order 1→5 (first to fire wins).
- PASS emitted when no rule fires.
- gate_log.jsonl is append-only (never 'w'); SHA-256 sidecar updates each flush.
- Golden-file test: byte-identical decisions on fixed inputs.
"""

from __future__ import annotations

import hashlib
import json
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.edge_calculator import EdgeFlag
from market.news_monitor import (
    EventCategory, NamedEvent, NewsWindow,
)
from market.volatility_gate import (
    GateDecision, GateStatus, MarketSnapshot, ReasonCode,
    _CROSS_BOOK_SPREAD_THRESHOLD,
    _NEWS_SUPPRESSION_HOURS,
    _PINNACLE_MAX_STALENESS_HOURS,
    _POLYMARKET_MIN_VOLUME,
    _PRICE_SWING_THRESHOLD,
    _log_decision, _update_sha_sidecar,
    apply_gate,
)


# ---------------------------------------------------------------------------
# Test fixtures / helpers
# ---------------------------------------------------------------------------

_TS = datetime(2026, 6, 20, 15, 0, 0, tzinfo=timezone.utc)


def _make_flag(E=0.05, E_star=1.5, outcome_id="home_win") -> EdgeFlag:
    return EdgeFlag(
        outcome_id=outcome_id,
        E=E,
        E_star=E_star,
        sigma_p=0.005,
        sigma_q=0.005,
        threshold=0.03,
        flagged=True,
        reason_code="ABOVE_THRESHOLD",
    )


def _make_snapshot(
    market_id="m001",
    outcome_id="home_win",
    ts=None,
    pinnacle_q_now=0.45,
    pinnacle_q_30min_ago=None,
    betfair_q=None,
    polymarket_volume=None,
    pinnacle_last_updated=None,
) -> MarketSnapshot:
    return MarketSnapshot(
        market_id=market_id,
        outcome_id=outcome_id,
        ts=ts or _TS,
        pinnacle_q_now=pinnacle_q_now,
        pinnacle_q_30min_ago=pinnacle_q_30min_ago,
        betfair_q=betfair_q,
        polymarket_volume_24h_usd=polymarket_volume,
        pinnacle_last_updated=pinnacle_last_updated,
    )


def _empty_window() -> NewsWindow:
    return NewsWindow()


def _window_with_event(
    entity="BRA",
    ts_offset_hours=-2,
    category=EventCategory.INJURY,
) -> NewsWindow:
    w = NewsWindow()
    ts = _TS + timedelta(hours=ts_offset_hours)
    evt = NamedEvent(
        event_id=f"test_{entity}_{ts_offset_hours}",
        ts=ts,
        category=category,
        entity_id=entity,
        entity_type="player",
        source="test",
        description="test event",
        is_gate_relevant=True,
    )
    w.add(evt)
    return w


# ---------------------------------------------------------------------------
# Clean pass (no rules fire)
# ---------------------------------------------------------------------------

class TestCleanPass:
    def test_pass_when_no_rules_fire(self):
        flag = _make_flag()
        snap = _make_snapshot(
            pinnacle_q_30min_ago=0.44,      # delta = 0.01 < 3pp ✓
            betfair_q=0.44,                 # spread = 0.01 < 2.5pp ✓
            polymarket_volume=100_000,      # > $50k ✓
            pinnacle_last_updated=_TS - timedelta(hours=1),  # 1h stale ✓
        )
        decision = apply_gate(flag, snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS
        assert decision.reason_code == ReasonCode.NONE

    def test_pass_when_no_optional_data(self):
        """All optional fields None → only Rule 1 can fire."""
        flag = _make_flag()
        snap = _make_snapshot()   # no optional fields
        decision = apply_gate(flag, snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS


# ---------------------------------------------------------------------------
# Rule 1: Named event
# ---------------------------------------------------------------------------

class TestRule1NamedEvent:
    def test_suppressed_by_relevant_event_within_6h(self):
        flag = _make_flag()
        snap = _make_snapshot()
        window = _window_with_event("BRA", ts_offset_hours=-3)
        decision = apply_gate(flag, snap, window, entity_ids=["BRA", "ARG"])
        assert decision.gate_status == GateStatus.SUPPRESSED
        assert decision.reason_code == ReasonCode.NAMED_EVENT_6H

    def test_not_suppressed_event_older_than_6h(self):
        flag = _make_flag()
        snap = _make_snapshot()
        window = _window_with_event("BRA", ts_offset_hours=-7)  # 7h ago > 6h window
        decision = apply_gate(flag, snap, window, entity_ids=["BRA", "ARG"])
        assert decision.gate_status == GateStatus.PASS

    def test_suppressed_without_entity_filter(self):
        """Any event in window triggers rule when entity_ids not specified."""
        flag = _make_flag()
        snap = _make_snapshot()
        window = _window_with_event("GER", ts_offset_hours=-1)
        decision = apply_gate(flag, snap, window)   # no entity_ids
        assert decision.gate_status == GateStatus.SUPPRESSED
        assert decision.reason_code == ReasonCode.NAMED_EVENT_6H

    def test_not_suppressed_event_for_different_entity(self):
        """Event for unrelated team → no suppression when entity_ids specified."""
        flag = _make_flag()
        snap = _make_snapshot()
        window = _window_with_event("GER", ts_offset_hours=-1)
        decision = apply_gate(flag, snap, window, entity_ids=["BRA", "ARG"])
        assert decision.gate_status == GateStatus.PASS

    def test_non_gate_relevant_event_no_suppression(self):
        """OTHER_MATERIAL events should not trigger Rule 1."""
        flag = _make_flag()
        snap = _make_snapshot()
        w = NewsWindow()
        evt = NamedEvent(
            event_id="test_other",
            ts=_TS - timedelta(hours=1),
            category=EventCategory.OTHER_MATERIAL,
            entity_id="BRA",
            entity_type="team",
            source="test",
            description="other material event",
            is_gate_relevant=False,  # NOT gate relevant
        )
        w.add(evt)
        decision = apply_gate(flag, snap, w)
        assert decision.gate_status == GateStatus.PASS


# ---------------------------------------------------------------------------
# Rule 2: Intra-book price discovery
# ---------------------------------------------------------------------------

class TestRule2IntraBook:
    def test_suppressed_above_3pp_swing(self):
        snap = _make_snapshot(
            pinnacle_q_now=0.45,
            pinnacle_q_30min_ago=0.41,   # delta = 4pp > 3pp
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.SUPPRESSED
        assert decision.reason_code == ReasonCode.PRICE_DISCOVERY_INTRA_BOOK

    def test_not_suppressed_below_threshold_clear(self):
        snap = _make_snapshot(
            pinnacle_q_now=0.45,
            pinnacle_q_30min_ago=0.43,   # delta = 2pp clearly < 3pp threshold
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_not_suppressed_below_threshold(self):
        snap = _make_snapshot(
            pinnacle_q_now=0.45,
            pinnacle_q_30min_ago=0.43,   # delta = 2pp
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_skipped_when_30min_data_absent(self):
        snap = _make_snapshot(pinnacle_q_30min_ago=None)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_rule_inputs_contain_delta(self):
        snap = _make_snapshot(pinnacle_q_now=0.45, pinnacle_q_30min_ago=0.40)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert "delta_pp" in decision.rule_inputs


# ---------------------------------------------------------------------------
# Rule 3: Cross-book spread
# ---------------------------------------------------------------------------

class TestRule3CrossBook:
    def test_suppressed_above_2pt5pp_spread(self):
        snap = _make_snapshot(pinnacle_q_now=0.45, betfair_q=0.42)  # 3pp spread
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.SUPPRESSED
        assert decision.reason_code == ReasonCode.PRICE_DISCOVERY_CROSS_BOOK

    def test_not_suppressed_below_threshold_clear(self):
        snap = _make_snapshot(pinnacle_q_now=0.45,
                              betfair_q=0.43)   # spread = 2pp clearly < 2.5pp threshold
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_skipped_when_betfair_absent(self):
        snap = _make_snapshot(betfair_q=None)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS


# ---------------------------------------------------------------------------
# Rule 4: Polymarket volume
# ---------------------------------------------------------------------------

class TestRule4PolymarketVolume:
    def test_suppressed_below_50k(self):
        snap = _make_snapshot(polymarket_volume=40_000)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.SUPPRESSED
        assert decision.reason_code == ReasonCode.LIQUIDITY_POLYMARKET_LOW

    def test_not_suppressed_at_50k(self):
        snap = _make_snapshot(polymarket_volume=50_000)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_not_suppressed_above_50k(self):
        snap = _make_snapshot(polymarket_volume=100_000)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_skipped_when_volume_absent(self):
        snap = _make_snapshot(polymarket_volume=None)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS


# ---------------------------------------------------------------------------
# Rule 5: Pinnacle staleness
# ---------------------------------------------------------------------------

class TestRule5Staleness:
    def test_suppressed_above_4h_stale(self):
        snap = _make_snapshot(
            pinnacle_last_updated=_TS - timedelta(hours=5)
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.SUPPRESSED
        assert decision.reason_code == ReasonCode.LIQUIDITY_PINNACLE_STALE

    def test_not_suppressed_exactly_at_4h(self):
        snap = _make_snapshot(
            pinnacle_last_updated=_TS - timedelta(hours=4)  # exactly 4h (not > 4h)
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_not_suppressed_fresh_data(self):
        snap = _make_snapshot(
            pinnacle_last_updated=_TS - timedelta(minutes=30)
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS

    def test_skipped_when_last_updated_absent(self):
        snap = _make_snapshot(pinnacle_last_updated=None)
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.gate_status == GateStatus.PASS


# ---------------------------------------------------------------------------
# Rule ordering: first rule wins
# ---------------------------------------------------------------------------

class TestRuleOrdering:
    def test_rule1_beats_rule2(self):
        """Rule 1 should fire even when Rule 2 would also fire."""
        snap = _make_snapshot(
            pinnacle_q_now=0.45, pinnacle_q_30min_ago=0.40   # Rule 2 fires
        )
        window = _window_with_event("BRA", ts_offset_hours=-1)  # Rule 1 fires
        decision = apply_gate(_make_flag(), snap, window)
        assert decision.reason_code == ReasonCode.NAMED_EVENT_6H

    def test_rule2_beats_rule3(self):
        """Rule 2 fires before Rule 3 when both conditions met."""
        snap = _make_snapshot(
            pinnacle_q_now=0.45,
            pinnacle_q_30min_ago=0.40,     # Rule 2
            betfair_q=0.40,                # Rule 3
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.reason_code == ReasonCode.PRICE_DISCOVERY_INTRA_BOOK

    def test_rule3_beats_rule4(self):
        snap = _make_snapshot(
            pinnacle_q_now=0.45,
            betfair_q=0.40,                # Rule 3
            polymarket_volume=20_000,      # Rule 4
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.reason_code == ReasonCode.PRICE_DISCOVERY_CROSS_BOOK

    def test_rule4_beats_rule5(self):
        snap = _make_snapshot(
            polymarket_volume=20_000,               # Rule 4
            pinnacle_last_updated=_TS - timedelta(hours=5),  # Rule 5
        )
        decision = apply_gate(_make_flag(), snap, _empty_window())
        assert decision.reason_code == ReasonCode.LIQUIDITY_POLYMARKET_LOW


# ---------------------------------------------------------------------------
# Append-only logging and SHA-256 sidecar
# ---------------------------------------------------------------------------

class TestGateLogging:
    def test_append_only_file_mode(self, tmp_path):
        """Log file must grow monotonically; sidecar updates each flush."""
        log_path = tmp_path / "gate_log.jsonl"
        flag = _make_flag()
        snap = _make_snapshot()

        d1 = apply_gate(flag, snap, _empty_window())
        _log_decision(d1, log_path)
        size1 = log_path.stat().st_size

        d2 = apply_gate(flag, snap, _empty_window())
        _log_decision(d2, log_path)
        size2 = log_path.stat().st_size

        assert size2 > size1   # file grew (append-only)

    def test_sidecar_sha256_updated(self, tmp_path):
        """Sidecar SHA must change between flushes."""
        log_path = tmp_path / "gate_log.jsonl"
        sidecar = Path(str(log_path) + ".sha256")

        flag = _make_flag()
        snap = _make_snapshot()

        _log_decision(apply_gate(flag, snap, _empty_window()), log_path)
        sha1 = sidecar.read_text().strip()

        _log_decision(apply_gate(flag, snap, _empty_window()), log_path)
        sha2 = sidecar.read_text().strip()

        assert sha1 != sha2

    def test_sidecar_matches_actual_file_sha(self, tmp_path):
        """Sidecar SHA must equal actual SHA-256 of the log file."""
        log_path = tmp_path / "gate_log.jsonl"
        flag = _make_flag()
        snap = _make_snapshot()

        _log_decision(apply_gate(flag, snap, _empty_window()), log_path)

        expected = hashlib.sha256(log_path.read_bytes()).hexdigest()
        actual = Path(str(log_path) + ".sha256").read_text().strip()
        assert actual == expected

    def test_log_row_schema(self, tmp_path):
        """Each row must have required keys."""
        log_path = tmp_path / "gate_log.jsonl"
        flag = _make_flag()
        snap = _make_snapshot()

        _log_decision(apply_gate(flag, snap, _empty_window()), log_path, "abc123", "def456")

        row = json.loads(log_path.read_text().strip())
        for key in ("ts", "market_id", "outcome_id", "E", "E_star",
                    "gate_status", "reason_code", "rule_inputs",
                    "code_sha", "data_sha"):
            assert key in row, f"Missing key: {key}"

    def test_never_truncates_log(self, tmp_path):
        """Writing multiple decisions must never wipe earlier rows."""
        log_path = tmp_path / "gate_log.jsonl"
        flag = _make_flag()
        snap = _make_snapshot()

        for _ in range(5):
            _log_decision(apply_gate(flag, snap, _empty_window()), log_path)

        lines = log_path.read_text().strip().splitlines()
        assert len(lines) == 5   # all rows present


# ---------------------------------------------------------------------------
# Golden-file test (§9.3)
# ---------------------------------------------------------------------------

_GOLDEN_INPUTS = [
    # (flag_E, flag_E_star, q_now, q_30ago, betfair_q, vol, stale_hours, news_event_entity)
    (0.05, 1.5, 0.45, None, None, None, None, None),           # PASS
    (0.05, 1.5, 0.45, 0.40, None, None, None, None),           # Rule 2
    (0.05, 1.5, 0.45, None, 0.40, None, None, None),           # Rule 3
    (0.05, 1.5, 0.45, None, None, 30_000, None, None),         # Rule 4
    (0.05, 1.5, 0.45, None, None, None, 5.0, None),            # Rule 5
    (0.05, 1.5, 0.45, None, None, None, None, "BRA"),          # Rule 1
]

_GOLDEN_EXPECTED = [
    GateStatus.PASS,
    GateStatus.SUPPRESSED,
    GateStatus.SUPPRESSED,
    GateStatus.SUPPRESSED,
    GateStatus.SUPPRESSED,
    GateStatus.SUPPRESSED,
]

_GOLDEN_REASONS = [
    ReasonCode.NONE,
    ReasonCode.PRICE_DISCOVERY_INTRA_BOOK,
    ReasonCode.PRICE_DISCOVERY_CROSS_BOOK,
    ReasonCode.LIQUIDITY_POLYMARKET_LOW,
    ReasonCode.LIQUIDITY_PINNACLE_STALE,
    ReasonCode.NAMED_EVENT_6H,
]


class TestGoldenFile:
    """
    Golden-file test: given fixed inputs, decisions must be byte-identical.

    This verifies that the gate is deterministic — a critical requirement for
    the Phase 7 audit that reconstructs every gate decision from logs.
    """

    def _run_decisions(self):
        decisions = []
        for (E, E_star, q_now, q_30ago, bf_q, vol, stale_h, entity) in _GOLDEN_INPUTS:
            flag = EdgeFlag(
                outcome_id="home_win",
                E=E,
                E_star=E_star,
                sigma_p=0.005,
                sigma_q=0.005,
                threshold=0.03,
                flagged=True,
                reason_code="ABOVE_THRESHOLD",
            )
            snap = MarketSnapshot(
                market_id="golden_market",
                outcome_id="home_win",
                ts=_TS,
                pinnacle_q_now=q_now,
                pinnacle_q_30min_ago=q_30ago,
                betfair_q=bf_q,
                polymarket_volume_24h_usd=vol,
                pinnacle_last_updated=(
                    _TS - timedelta(hours=stale_h) if stale_h else None
                ),
            )
            window = _empty_window()
            if entity:
                from market.news_monitor import NamedEvent, EventCategory
                evt = NamedEvent(
                    event_id=f"golden_{entity}",
                    ts=_TS - timedelta(hours=1),
                    category=EventCategory.INJURY,
                    entity_id=entity,
                    entity_type="player",
                    source="golden_feed",
                    description="golden test event",
                    is_gate_relevant=True,
                )
                window.add(evt)
            decisions.append(apply_gate(flag, snap, window))
        return decisions

    def test_golden_status_and_reason(self):
        """Gate decisions must exactly match the golden expected values."""
        decisions = self._run_decisions()
        for i, (d, exp_status, exp_reason) in enumerate(
            zip(decisions, _GOLDEN_EXPECTED, _GOLDEN_REASONS)
        ):
            assert d.gate_status == exp_status, \
                f"Golden case {i}: expected {exp_status}, got {d.gate_status}"
            assert d.reason_code == exp_reason, \
                f"Golden case {i}: expected {exp_reason}, got {d.reason_code}"

    def test_golden_log_sha_deterministic(self, tmp_path):
        """Writing the same decisions twice must produce the same log SHA."""
        log1 = tmp_path / "gate1.jsonl"
        log2 = tmp_path / "gate2.jsonl"

        decisions = self._run_decisions()
        for d in decisions:
            _log_decision(d, log1, "sha_abc", "sha_def")
        for d in decisions:
            _log_decision(d, log2, "sha_abc", "sha_def")

        sha1 = hashlib.sha256(log1.read_bytes()).hexdigest()
        sha2 = hashlib.sha256(log2.read_bytes()).hexdigest()
        assert sha1 == sha2
