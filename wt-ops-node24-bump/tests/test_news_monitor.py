"""
tests/test_news_monitor.py
==========================
Unit tests for market/news_monitor.py.

Acceptance criteria (§9.6):
- Every fetch failure produces a structured row in news_fetch_log.jsonl.
- Circuit breaker fires after 3 consecutive failures and remains open for 30 min.
- No NamedEvent emitted from a malformed feed item.
- Entity-resolution failure prevents event emission.
- OTHER_MATERIAL events are NOT gate-relevant (is_gate_relevant=False).
- NewsWindow correctly prunes events older than retention period.
- get_window() returns thread-safe snapshot.
- Polling loop can be started and stopped cleanly.
"""

from __future__ import annotations

import json
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.news_monitor import (
    EventCategory,
    FetchLogEntry,
    GATE_RELEVANT_CATEGORIES,
    NamedEvent,
    NewsMonitor,
    NewsWindow,
    _CircuitBreaker,
    _CIRCUIT_BREAKER_COOLDOWN,
    _CIRCUIT_BREAKER_THRESHOLD,
    _WINDOW_RETENTION_HOURS,
    extract_events_from_feed,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime(2026, 6, 15, 12, 0, 0, tzinfo=timezone.utc)


def _make_event(
    entity: str = "BRA",
    category: str = "INJURY",
    ts: str = "2026-06-15T10:00:00+00:00",
    description: str = "test",
) -> str:
    return json.dumps([{
        "ts": ts,
        "category": category,
        "subject": entity,
        "entity_type": "player",
        "description": description,
    }])


def _make_monitor(fetch_fn=None, log_path=None):
    return NewsMonitor(
        tier1_sources=["http://fake-tier1.example.com/feed"],
        tier2_sources=["http://fake-tier2.example.com/feed"],
        fetch_log_path=log_path,
        _fetch_fn=fetch_fn,
    )


# ---------------------------------------------------------------------------
# extract_events_from_feed
# ---------------------------------------------------------------------------

class TestExtractEventsFromFeed:
    def test_valid_injury_event(self):
        raw = _make_event("BRA", "INJURY")
        events = extract_events_from_feed(raw, "test_source")
        assert len(events) == 1
        e = events[0]
        assert e.entity_id == "BRA"
        assert e.category == EventCategory.INJURY
        assert e.is_gate_relevant

    def test_valid_suspension_event(self):
        raw = _make_event("ARG", "SUSPENSION")
        events = extract_events_from_feed(raw, "test_source")
        assert len(events) == 1
        assert events[0].category == EventCategory.SUSPENSION
        assert events[0].is_gate_relevant

    def test_other_material_not_gate_relevant(self):
        raw = _make_event("FRA", "OTHER_MATERIAL")
        events = extract_events_from_feed(raw, "test_source")
        assert len(events) == 1
        assert not events[0].is_gate_relevant

    def test_malformed_json_returns_empty(self):
        events = extract_events_from_feed("not json at all", "test_source")
        assert events == []

    def test_missing_timestamp_skipped(self):
        raw = json.dumps([{"category": "INJURY", "subject": "BRA", "entity_type": "player"}])
        events = extract_events_from_feed(raw, "test_source")
        assert events == []

    def test_entity_resolution_failure_skips_event(self):
        # Empty subject → entity resolution fails
        raw = json.dumps([{
            "ts": "2026-06-15T10:00:00+00:00",
            "category": "INJURY",
            "subject": "",
            "entity_type": "player",
            "description": "bad entity",
        }])
        events = extract_events_from_feed(raw, "test_source")
        assert events == []

    def test_unknown_category_maps_to_other_material(self):
        raw = json.dumps([{
            "ts": "2026-06-15T10:00:00+00:00",
            "category": "TOTALLY_UNKNOWN",
            "subject": "ENG",
            "entity_type": "team",
            "description": "test",
        }])
        events = extract_events_from_feed(raw, "test_source")
        assert events[0].category == EventCategory.OTHER_MATERIAL
        assert not events[0].is_gate_relevant

    def test_multiple_items_in_one_payload(self):
        raw = json.dumps([
            {"ts": "2026-06-15T10:00:00+00:00", "category": "INJURY",
             "subject": "BRA", "entity_type": "player", "description": "d"},
            {"ts": "2026-06-15T11:00:00+00:00", "category": "SUSPENSION",
             "subject": "ARG", "entity_type": "player", "description": "d"},
        ])
        events = extract_events_from_feed(raw, "test_source")
        assert len(events) == 2

    def test_all_gate_relevant_categories_recognised(self):
        for cat in GATE_RELEVANT_CATEGORIES:
            raw = _make_event("GER", cat.value)
            events = extract_events_from_feed(raw, "test_source")
            assert events[0].is_gate_relevant, f"Expected gate relevant for {cat}"


# ---------------------------------------------------------------------------
# NewsWindow
# ---------------------------------------------------------------------------

class TestNewsWindow:
    def _make_event_obj(self, ts_offset_hours=0, entity="BRA", gate=True):
        ts = _NOW + timedelta(hours=ts_offset_hours)
        cat = EventCategory.INJURY if gate else EventCategory.OTHER_MATERIAL
        return NamedEvent(
            event_id=f"test_{ts_offset_hours}_{entity}",
            ts=ts,
            category=cat,
            entity_id=entity,
            entity_type="player",
            source="test",
            description="test",
            is_gate_relevant=gate,
        )

    def test_add_and_retrieve(self):
        w = NewsWindow()
        evt = self._make_event_obj(0)
        w.add(evt)
        since = _NOW - timedelta(hours=1)
        assert evt in w.get_events_since(since)

    def test_get_events_since_filters_old(self):
        w = NewsWindow()
        old = self._make_event_obj(-10)   # 10 hours ago
        new = self._make_event_obj(-2)    # 2 hours ago
        w.add(old)
        w.add(new)
        since = _NOW - timedelta(hours=6)
        results = w.get_events_since(since)
        assert new in results
        assert old not in results

    def test_get_events_excludes_non_gate_relevant(self):
        w = NewsWindow()
        gate_evt = self._make_event_obj(0, gate=True)
        non_gate = self._make_event_obj(-1, "FRA", gate=False)
        w.add(gate_evt)
        w.add(non_gate)
        results = w.get_events_since(_NOW - timedelta(hours=2))
        assert gate_evt in results
        assert non_gate not in results

    def test_prune_removes_old_events(self):
        w = NewsWindow()
        old = self._make_event_obj(-25)   # 25 hours ago
        new = self._make_event_obj(-1)
        w.add(old)
        w.add(new)
        cutoff = _NOW - timedelta(hours=_WINDOW_RETENTION_HOURS)
        removed = w.prune_older_than(cutoff)
        assert removed == 1
        assert len(w) == 1

    def test_snapshot_is_independent(self):
        w = NewsWindow()
        evt = self._make_event_obj(0)
        w.add(evt)
        snap = w.snapshot()
        # Adding to original doesn't affect snapshot
        new_evt = self._make_event_obj(-1, "GER")
        w.add(new_evt)
        assert new_evt.event_id not in snap._events

    def test_len_counts_events(self):
        w = NewsWindow()
        assert len(w) == 0
        for i in range(5):
            w.add(self._make_event_obj(-i))
        assert len(w) == 5


# ---------------------------------------------------------------------------
# Circuit breaker
# ---------------------------------------------------------------------------

class TestCircuitBreaker:
    def test_starts_closed(self):
        cb = _CircuitBreaker(source="test")
        assert not cb.is_open(_NOW)

    def test_opens_after_threshold_failures(self):
        cb = _CircuitBreaker(source="test")
        for _ in range(_CIRCUIT_BREAKER_THRESHOLD):
            cb.record_failure(_NOW)
        assert cb.is_open(_NOW)

    def test_stays_closed_below_threshold(self):
        cb = _CircuitBreaker(source="test")
        for _ in range(_CIRCUIT_BREAKER_THRESHOLD - 1):
            cb.record_failure(_NOW)
        assert not cb.is_open(_NOW)

    def test_closes_after_cooldown(self):
        cb = _CircuitBreaker(source="test")
        for _ in range(_CIRCUIT_BREAKER_THRESHOLD):
            cb.record_failure(_NOW)
        assert cb.is_open(_NOW)
        # Move past cooldown
        future = _NOW + timedelta(seconds=_CIRCUIT_BREAKER_COOLDOWN + 1)
        assert not cb.is_open(future)

    def test_success_resets_failures(self):
        cb = _CircuitBreaker(source="test")
        cb.record_failure(_NOW)
        cb.record_failure(_NOW)
        cb.record_success()
        assert cb.failures == 0

    def test_open_circuit_does_not_close_before_cooldown(self):
        cb = _CircuitBreaker(source="test")
        for _ in range(_CIRCUIT_BREAKER_THRESHOLD):
            cb.record_failure(_NOW)
        near_future = _NOW + timedelta(seconds=_CIRCUIT_BREAKER_COOLDOWN - 60)
        assert cb.is_open(near_future)


# ---------------------------------------------------------------------------
# NewsMonitor integration
# ---------------------------------------------------------------------------

class TestNewsMonitor:
    def test_poll_source_calls_fetch_and_stores_events(self):
        """Successful fetch should add events to the window."""
        fetched = []

        def fake_fetch(url):
            fetched.append(url)
            raw = _make_event("BRA", "INJURY")
            return raw, 200

        monitor = _make_monitor(fetch_fn=fake_fetch)
        now = datetime.now(timezone.utc)
        monitor._poll_source("http://fake.example.com/feed", tier=1, now=now)
        window = monitor.get_window(now)
        assert len(window) == 1

    def test_failed_fetch_triggers_circuit_breaker(self):
        """Three consecutive fetch failures should open the circuit breaker."""
        def failing_fetch(url):
            raise ConnectionError("feed down")

        monitor = _make_monitor(fetch_fn=failing_fetch)
        source = "http://fake.example.com/feed"
        now = datetime.now(timezone.utc)

        for _ in range(_CIRCUIT_BREAKER_THRESHOLD):
            monitor._poll_source(source, tier=1, now=now)

        breaker = monitor._breakers.get(source)
        assert breaker is not None
        assert breaker.is_open(now)

    def test_failed_fetch_logs_to_file(self):
        def failing_fetch(url):
            raise ConnectionError("no network")

        with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
            log_path = Path(f.name)

        try:
            monitor = _make_monitor(fetch_fn=failing_fetch, log_path=log_path)
            monitor._poll_source("http://fake.example.com/feed", tier=1,
                                 now=datetime.now(timezone.utc))
            lines = log_path.read_text().strip().splitlines()
            assert len(lines) == 1
            entry = json.loads(lines[0])
            assert "error:" in entry["parse_outcome"]
        finally:
            log_path.unlink(missing_ok=True)

    def test_malformed_feed_no_event_emitted(self):
        """Malformed JSON response → no NamedEvent in window, no exception."""
        def malformed_fetch(url):
            return "this is not valid json <<<", 200

        monitor = _make_monitor(fetch_fn=malformed_fetch)
        now = datetime.now(timezone.utc)
        monitor._poll_source("http://fake.example.com/feed", tier=1, now=now)
        window = monitor.get_window(now)
        assert len(window) == 0

    def test_circuit_open_no_event_emitted(self):
        """Open circuit breaker → no fetch, no event."""
        calls = []

        def fetch_fn(url):
            calls.append(url)
            return _make_event("BRA", "INJURY"), 200

        monitor = _make_monitor(fetch_fn=fetch_fn)
        source = "http://fake.example.com/feed"
        now = datetime.now(timezone.utc)

        # Open the breaker
        breaker = _CircuitBreaker(source=source)
        for _ in range(_CIRCUIT_BREAKER_THRESHOLD):
            breaker.record_failure(now)
        monitor._breakers[source] = breaker

        monitor._poll_source(source, tier=1, now=now)
        assert calls == []   # no fetch attempted

    def test_start_stop_clean(self):
        """Monitor can start and stop without hanging."""
        def never_called(url):
            return "[]", 200

        monitor = _make_monitor(fetch_fn=never_called)
        monitor.start()
        assert monitor._thread is not None
        assert monitor._thread.is_alive()
        monitor.stop()
        # Allow brief wind-down
        monitor._thread.join(timeout=5)
        assert not monitor._thread.is_alive()

    def test_get_window_thread_safe(self):
        """get_window() should not raise under concurrent access."""
        results = []

        def fetch_fn(url):
            return _make_event("BRA", "INJURY"), 200

        monitor = _make_monitor(fetch_fn=fetch_fn)

        def reader():
            for _ in range(20):
                w = monitor.get_window(datetime.now(timezone.utc))
                results.append(len(w))

        threads = [threading.Thread(target=reader) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=5)

        assert len(results) == 80   # 4 threads × 20 reads
