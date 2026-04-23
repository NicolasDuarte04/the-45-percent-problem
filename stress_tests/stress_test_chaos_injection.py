"""
Stress Test 2 – The Brakes Test: Chaos Injection
==================================================
Forces two specific Volatility Gate suppression rules to fire on demand and
verifies the safety brake pipeline.

Scenario A — Rule 2: Price-discovery suppression (PRICE_DISCOVERY_INTRA_BOOK)
  A synthetic market snapshot shows the Pinnacle line moving by +10 pp in the
  prior 30-minute window (well above the pre-registered 3 pp threshold).
  Expected: apply_gate() returns SUPPRESSED with reason PRICE_DISCOVERY_INTRA_BOOK.

Scenario B — Rule 1: Named-event suppression (NAMED_EVENT_6H)
  A fake NamedEvent ("Star player injured") is injected into a NewsWindow,
  timestamped exactly 1 hour before kickoff.  The market snapshot is taken
  30 minutes before kickoff.  Both the event and the snapshot fall inside the
  6-hour gate window.
  Expected: apply_gate() returns SUPPRESSED with reason NAMED_EVENT_6H.

For both scenarios:
  ✓  gate_status == GateStatus.SUPPRESSED
  ✓  reason_code matches the expected rule
  ✓  kelly_stake_pct (recommended_stake_fraction) is forced to 0 via MarketPipeline

Run from project root:
    python stress_tests/stress_test_chaos_injection.py

Exit code: 0 = all brakes held, 1 = one or more brakes failed.
"""

from __future__ import annotations

import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.volatility_gate import (
    GateStatus, GateDecision, MarketSnapshot, ReasonCode, apply_gate,
)
from market.edge_calculator import EdgeFlag
from market.news_monitor import (
    EventCategory, NamedEvent, NewsWindow,
)
from market.market_pipeline import MarketPipeline, PipelineConfig

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"

_failures: List[str] = []


def assert_check(condition: bool, label: str, detail: str = "") -> bool:
    if condition:
        print(f"  {PASS}  {label}")
    else:
        msg = f"{label}" + (f"  [got: {detail}]" if detail else "")
        print(f"  {FAIL}  {msg}")
        _failures.append(msg)
    return condition


# ─────────────────────────────────────────────────────────────────────────────
# Shared fixture: a flagged EdgeFlag (home-win outcome, edge just above 3 pp)
# ─────────────────────────────────────────────────────────────────────────────

def _make_edge_flag(outcome_id: str = "home_win") -> EdgeFlag:
    """Constructs an EdgeFlag that is flagged (|E| > 3 pp threshold)."""
    return EdgeFlag(
        outcome_id=outcome_id,
        E=0.055,        # model sees 5.5 pp edge — clearly above the 3 pp threshold
        E_star=2.1,
        sigma_p=0.012,
        sigma_q=0.008,
        threshold=0.03,
        flagged=True,
        reason_code="ABOVE_THRESHOLD",
        is_two_sided_flag=False,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario A — Rule 2: Price-discovery (intra-book)
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_a() -> None:
    print("\n" + "─" * 60)
    print("Scenario A — Rule 2: Price-discovery (intra-book, +10 pp swing)")
    print("─" * 60)

    market_ts = datetime(2026, 6, 15, 17, 0, 0, tzinfo=timezone.utc)

    # Pinnacle line moved +10 pp upward in the last 30 minutes
    snapshot = MarketSnapshot(
        market_id="2026-06-15_BRA_ARG",
        outcome_id="home_win",
        ts=market_ts,
        pinnacle_q_now=0.55,        # current de-vigged prob
        pinnacle_q_30min_ago=0.45,  # 30 min ago — 10 pp swing → triggers Rule 2
        betfair_q=None,
        polymarket_volume_24h_usd=None,
        pinnacle_last_updated=None,
    )

    news_window = NewsWindow()   # empty — Rule 1 must NOT fire
    flag = _make_edge_flag("home_win")

    decision: GateDecision = apply_gate(
        flag=flag,
        market_snapshot=snapshot,
        news_window=news_window,
        entity_ids=["BRA", "ARG"],
    )

    delta_pp = abs(snapshot.pinnacle_q_now - snapshot.pinnacle_q_30min_ago)
    print(f"  Pinnacle swing: {delta_pp:.3f} pp  (threshold 0.030 pp)")
    print(f"  Gate decision:  {decision.gate_status.value}  [{decision.reason_code.value}]")

    assert_check(
        decision.gate_status == GateStatus.SUPPRESSED,
        "Gate status is SUPPRESSED",
        detail=decision.gate_status.value,
    )
    assert_check(
        decision.reason_code == ReasonCode.PRICE_DISCOVERY_INTRA_BOOK,
        "Reason code is PRICE_DISCOVERY_INTRA_BOOK",
        detail=decision.reason_code.value,
    )
    assert_check(
        decision.rule_inputs.get("delta_pp", 0.0) > 0.03,
        "rule_inputs records delta_pp > 0.030",
        detail=str(decision.rule_inputs.get("delta_pp")),
    )

    # Verify kelly_stake_pct = 0 via the full pipeline ──────────────────────
    print("  [Pipeline] Confirming recommended_stake_fraction == 0 via MarketPipeline …")
    _assert_pipeline_stake_zero(
        market_id="2026-06-15_BRA_ARG",
        snapshot_data={
            "pinnacle_q_30min_ago": 0.45,
            "betfair_q": None,
            "polymarket_volume_24h_usd": None,
            "pinnacle_last_updated": None,
        },
        ts=market_ts,
        expected_reason_fragment="PRICE_DISCOVERY",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario B — Rule 1: Named-event suppression (injury 1h before kickoff)
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_b() -> None:
    print("\n" + "─" * 60)
    print("Scenario B — Rule 1: Named-event ('Star player injured', 1h before kickoff)")
    print("─" * 60)

    kickoff_ts = datetime(2026, 6, 20, 20, 0, 0, tzinfo=timezone.utc)
    event_ts = kickoff_ts - timedelta(hours=1)         # injury reported 1h before KO
    market_ts = kickoff_ts - timedelta(minutes=30)     # market evaluated 30min before KO

    # Inject a NamedEvent into the rolling window
    injury_event = NamedEvent(
        event_id="fifa_feed_2026-06-20T19:00:00+00:00_FRA",
        ts=event_ts,
        category=EventCategory.INJURY,
        entity_id="FRA",
        entity_type="team",
        source="fifa_rss_test",
        description="Star player injured in training — status doubtful for tonight",
        is_gate_relevant=True,
    )

    news_window = NewsWindow()
    news_window.add(injury_event)

    # Market snapshot with no price swing (Rule 2 must NOT fire before Rule 1)
    snapshot = MarketSnapshot(
        market_id="2026-06-20_FRA_ESP",
        outcome_id="home_win",
        ts=market_ts,
        pinnacle_q_now=0.50,
        pinnacle_q_30min_ago=0.50,   # no swing — Rule 2 silent
        betfair_q=None,
        polymarket_volume_24h_usd=None,
        pinnacle_last_updated=None,
    )

    flag = _make_edge_flag("home_win")

    decision: GateDecision = apply_gate(
        flag=flag,
        market_snapshot=snapshot,
        news_window=news_window,
        entity_ids=["FRA", "ESP"],
    )

    hours_before_market = (market_ts - event_ts).total_seconds() / 3600
    print(f"  Event timestamp:  {event_ts.isoformat()}")
    print(f"  Market timestamp: {market_ts.isoformat()}")
    print(f"  Hours before market evaluation: {hours_before_market:.2f}h  (gate window: 6.0h)")
    print(f"  Gate decision:  {decision.gate_status.value}  [{decision.reason_code.value}]")

    assert_check(
        decision.gate_status == GateStatus.SUPPRESSED,
        "Gate status is SUPPRESSED",
        detail=decision.gate_status.value,
    )
    assert_check(
        decision.reason_code == ReasonCode.NAMED_EVENT_6H,
        "Reason code is NAMED_EVENT_6H",
        detail=decision.reason_code.value,
    )
    assert_check(
        decision.rule_inputs.get("triggering_entity") == "FRA",
        "rule_inputs records triggering_entity == FRA",
        detail=str(decision.rule_inputs.get("triggering_entity")),
    )
    assert_check(
        "triggering_event_id" in decision.rule_inputs,
        "rule_inputs contains triggering_event_id",
    )

    # Verify kelly_stake_pct = 0 via the full pipeline ──────────────────────
    print("  [Pipeline] Confirming recommended_stake_fraction == 0 via MarketPipeline …")
    _assert_pipeline_stake_zero(
        market_id="2026-06-20_FRA_ESP",
        snapshot_data={
            "pinnacle_q_30min_ago": None,
            "betfair_q": None,
            "polymarket_volume_24h_usd": None,
            "pinnacle_last_updated": None,
        },
        ts=market_ts,
        expected_reason_fragment="NAMED_EVENT",
        news_window=news_window,
        entity_ids=["FRA", "ESP"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Helper: run a minimal pipeline and check recommended_stake_fraction == 0
# ─────────────────────────────────────────────────────────────────────────────

def _assert_pipeline_stake_zero(
    market_id: str,
    snapshot_data: dict,
    ts: datetime,
    expected_reason_fragment: str,
    news_window: NewsWindow | None = None,
    entity_ids: list | None = None,
) -> None:
    """
    Spins up a throw-away MarketPipeline, processes one market that should be
    SUPPRESSED, and asserts that the written row has recommended_stake_fraction=0.
    """
    import json as _json
    import tempfile as _tmp
    from market.market_pipeline import MarketPipeline, PipelineConfig
    from market.news_monitor import NewsMonitor

    # Build a NewsMonitor that returns the injected window (no polling)
    class _StaticMonitor:
        def get_window(self, now: datetime) -> NewsWindow:
            return (news_window or NewsWindow()).snapshot()

    with _tmp.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        cfg = PipelineConfig(
            forecast_log_path=tmp / "fc.jsonl",
            gate_log_path=tmp / "gate.jsonl",
            initial_bankroll=10_000.0,
            code_sha="chaos_test",
            data_sha="chaos_synthetic",
        )
        cfg.news_monitor = _StaticMonitor()  # type: ignore[assignment]

        pipeline = MarketPipeline(cfg)
        market_input = {
            "market_id": market_id,
            "market_class": "1x2",
            "stage": "semi_final",
            "book": "pinnacle",
            "odds": [2.10, 3.30, 3.70],
            "outcome_labels": ["home_win", "draw", "away_win"],
            # p_model gives a clear 5.5 pp edge → would be sized if gate passes
            "p_model": [0.53, 0.28, 0.19],
            "entity_ids": entity_ids or [],
            "snapshot_data": snapshot_data,
        }
        pipeline.run_once(ts, [market_input])

        # Read back the log
        rows = []
        log_path = tmp / "fc.jsonl"
        if log_path.exists():
            for line in log_path.read_text().splitlines():
                if line.strip():
                    rows.append(_json.loads(line))

    # Find the row for the flagged outcome (home_win had the edge)
    suppressed_rows = [r for r in rows if expected_reason_fragment in r.get("reason_code", "")]
    has_suppressed = len(suppressed_rows) > 0
    assert_check(
        has_suppressed,
        f"Pipeline row carries reason_code containing '{expected_reason_fragment}'",
        detail=str([r.get("reason_code") for r in rows]),
    )

    all_zero = all(r.get("recommended_stake_fraction", 1.0) == 0.0 for r in suppressed_rows)
    assert_check(
        all_zero,
        "recommended_stake_fraction is 0.0 for all SUPPRESSED rows",
        detail=str([r.get("recommended_stake_fraction") for r in suppressed_rows]),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario C — Boundary check: price swing exactly at threshold (must PASS)
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_c() -> None:
    print("\n" + "─" * 60)
    print("Scenario C — Below threshold: swing of 2.5 pp (should PASS, not SUPPRESS)")
    print("─" * 60)

    # NOTE: floating-point arithmetic means 0.50 - 0.47 == 0.030000000000000027, which
    # IS strictly > 0.03 and therefore suppresses.  We use an explicitly sub-threshold
    # delta (0.025 pp) to test the pass-through path cleanly.
    snapshot = MarketSnapshot(
        market_id="2026-07-01_BEL_NED",
        outcome_id="home_win",
        ts=datetime(2026, 7, 1, 16, 0, tzinfo=timezone.utc),
        pinnacle_q_now=0.50,
        pinnacle_q_30min_ago=0.475,  # delta == 0.025 pp < 0.030 threshold → PASS
        betfair_q=None,
        polymarket_volume_24h_usd=None,
        pinnacle_last_updated=None,
    )

    decision = apply_gate(
        flag=_make_edge_flag("home_win"),
        market_snapshot=snapshot,
        news_window=NewsWindow(),
        entity_ids=["BEL", "NED"],
    )

    delta = abs(snapshot.pinnacle_q_now - snapshot.pinnacle_q_30min_ago)
    print(f"  Price swing: {delta:.4f} pp  (threshold 0.030 pp — this is below it)")
    print(f"  Gate decision: {decision.gate_status.value}  [{decision.reason_code.value}]")

    assert_check(
        decision.gate_status == GateStatus.PASS,
        "Swing of 2.5 pp (below 3.0 pp threshold) does NOT suppress",
        detail=decision.gate_status.value,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Scenario D — Rule 1 outside window (event >6h ago: must PASS)
# ─────────────────────────────────────────────────────────────────────────────

def run_scenario_d() -> None:
    print("\n" + "─" * 60)
    print("Scenario D — Rule 1 staleness: news event 7h ago (outside 6h window, should PASS)")
    print("─" * 60)

    market_ts = datetime(2026, 6, 22, 15, 0, 0, tzinfo=timezone.utc)
    stale_event_ts = market_ts - timedelta(hours=7)   # older than suppression window

    stale_event = NamedEvent(
        event_id="fifa_feed_stale_GER",
        ts=stale_event_ts,
        category=EventCategory.INJURY,
        entity_id="GER",
        entity_type="team",
        source="fifa_rss_test",
        description="Old injury news — outside 6h gate window",
        is_gate_relevant=True,
    )

    news_window = NewsWindow()
    news_window.add(stale_event)

    snapshot = MarketSnapshot(
        market_id="2026-06-22_GER_MEX",
        outcome_id="home_win",
        ts=market_ts,
        pinnacle_q_now=0.48,
        pinnacle_q_30min_ago=None,
        betfair_q=None,
        polymarket_volume_24h_usd=None,
        pinnacle_last_updated=None,
    )

    decision = apply_gate(
        flag=_make_edge_flag("home_win"),
        market_snapshot=snapshot,
        news_window=news_window,
        entity_ids=["GER", "MEX"],
    )

    hours_old = (market_ts - stale_event_ts).total_seconds() / 3600
    print(f"  Event age: {hours_old:.1f}h  (gate window: 6.0h)")
    print(f"  Gate decision: {decision.gate_status.value}  [{decision.reason_code.value}]")

    assert_check(
        decision.gate_status == GateStatus.PASS,
        "Stale event (7h ago) does NOT trigger Rule 1 suppression",
        detail=decision.gate_status.value,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> bool:
    print("\n" + "=" * 70)
    print("STRESS TEST 2 — The Brakes Test: Volatility Gate Chaos Injection")
    print("=" * 70)

    run_scenario_a()
    run_scenario_b()
    run_scenario_c()
    run_scenario_d()

    return len(_failures) == 0


if __name__ == "__main__":
    passed = main()
    print("\n" + "=" * 70)
    if passed:
        print("RESULT: ALL BRAKES HELD — Volatility Gate fires and suppresses correctly.")
    else:
        print(f"RESULT: {len(_failures)} BRAKE(S) FAILED:")
        for f in _failures:
            print(f"  • {f}")
    print("=" * 70)
    sys.exit(0 if passed else 1)
