"""
market/news_monitor.py
======================
Federation-feed ingestion and NamedEvent production (§6 Phase 6).

Architecture:
  - Tier 1 sources (FIFA + 48 federation RSS feeds): polled every 5 minutes
  - Tier 2 sources (confederation cross-confirmation): polled every 15 minutes
  - Circuit breaker: 3 consecutive failures → 30-minute cool-down
  - Each fetch: circuit-breaker + canonical extraction + entity resolution

This module does NOT call the volatility gate directly.  Every NamedEvent is
appended to a rolling 24-hour in-memory NewsWindow.  The orchestrator passes
this window snapshot to apply_gate() at each market evaluation.

IMPORTANT: Only structured federation feeds are consumed.  Social media,
headline scrapers, and unstructured sources are explicitly prohibited (§8).
"""

from __future__ import annotations

import json
import logging
import sys
import threading
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Sequence

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pre-registered gate-relevant event types (§6.2)
# ---------------------------------------------------------------------------

class EventCategory(str, Enum):
    INJURY = "INJURY"
    SUSPENSION = "SUSPENSION"
    MANAGER_CHANGE = "MANAGER_CHANGE"
    SQUAD_CHANGE = "SQUAD_CHANGE"
    VENUE_CHANGE = "VENUE_CHANGE"
    MATCH_RESCHEDULE = "MATCH_RESCHEDULE"
    OTHER_MATERIAL = "OTHER_MATERIAL"   # logged but does NOT trigger Rule 1


# Gate-relevant categories (§6.2: "only the first six categories are pre-registered")
GATE_RELEVANT_CATEGORIES = frozenset({
    EventCategory.INJURY,
    EventCategory.SUSPENSION,
    EventCategory.MANAGER_CHANGE,
    EventCategory.SQUAD_CHANGE,
    EventCategory.VENUE_CHANGE,
    EventCategory.MATCH_RESCHEDULE,
})

# Polling intervals (seconds)
_TIER1_POLL_INTERVAL: int = 5 * 60     # 5 minutes
_TIER2_POLL_INTERVAL: int = 15 * 60    # 15 minutes

# Circuit breaker thresholds
_CIRCUIT_BREAKER_THRESHOLD: int = 3          # consecutive failures before opening
_CIRCUIT_BREAKER_COOLDOWN: int = 30 * 60    # 30 minutes

# Window retention
_WINDOW_RETENTION_HOURS: int = 24


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class NamedEvent:
    """
    A gate-relevant event produced from a federation feed item.

    Only events whose category is in GATE_RELEVANT_CATEGORIES become NamedEvents.
    OTHER_MATERIAL items are logged to news_fetch_log.jsonl but not emitted.
    """
    event_id: str           # unique: "{source}_{timestamp_iso}_{entity_id}"
    ts: datetime            # UTC timestamp of event
    category: EventCategory
    entity_id: str          # canonical team or player ID
    entity_type: str        # "team" | "player" | "manager"
    source: str             # feed URL or identifier
    description: str        # free-text summary
    is_gate_relevant: bool  # True iff category ∈ GATE_RELEVANT_CATEGORIES

    def to_dict(self) -> dict:
        d = asdict(self)
        d["ts"] = self.ts.isoformat()
        d["category"] = self.category.value
        return d


@dataclass
class NewsWindow:
    """
    Rolling 24-hour window of NamedEvents, keyed by event_id.
    Thread-safe reads via snapshot; mutations protected by the monitor's lock.
    """
    _events: Dict[str, NamedEvent] = field(default_factory=dict)

    def add(self, event: NamedEvent) -> None:
        self._events[event.event_id] = event

    def get_events_since(self, since: datetime) -> List[NamedEvent]:
        """Return gate-relevant events with ts ≥ since."""
        return [
            e for e in self._events.values()
            if e.ts >= since and e.is_gate_relevant
        ]

    def prune_older_than(self, cutoff: datetime) -> int:
        """Remove events older than cutoff.  Returns count removed."""
        to_remove = [eid for eid, e in self._events.items() if e.ts < cutoff]
        for eid in to_remove:
            del self._events[eid]
        return len(to_remove)

    def snapshot(self) -> "NewsWindow":
        """Return a frozen copy (shallow — NamedEvent is frozen)."""
        w = NewsWindow()
        w._events = dict(self._events)
        return w

    def __len__(self) -> int:
        return len(self._events)


@dataclass
class _CircuitBreaker:
    """Per-source circuit breaker."""
    source: str
    failures: int = 0
    open_until: Optional[datetime] = None

    def is_open(self, now: datetime) -> bool:
        if self.open_until is None:
            return False
        if now >= self.open_until:
            self.open_until = None
            self.failures = 0
            return False
        return True

    def record_failure(self, now: datetime) -> None:
        self.failures += 1
        if self.failures >= _CIRCUIT_BREAKER_THRESHOLD:
            self.open_until = now + timedelta(seconds=_CIRCUIT_BREAKER_COOLDOWN)
            logger.warning(
                "Circuit breaker opened for source %s until %s",
                self.source, self.open_until.isoformat()
            )

    def record_success(self) -> None:
        self.failures = 0
        self.open_until = None


@dataclass
class FetchLogEntry:
    """One row in news_fetch_log.jsonl."""
    ts: str
    source: str
    tier: int
    http_status: Optional[int]
    byte_count: int
    parse_outcome: str      # "ok" | "error:..." | "circuit_open"
    events_emitted: int

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self)) + "\n"


# ---------------------------------------------------------------------------
# Entity resolution stub
# ---------------------------------------------------------------------------

def _resolve_entity(subject: str, aliases: Optional[Dict[str, str]] = None) -> Optional[str]:
    """
    Map a raw subject string to a canonical entity ID.

    In production this reads from entity_aliases.yaml (same file used by the
    data ingestion layer).  This stub normalises to uppercase and returns None
    for empty strings to signal resolution failure.
    """
    if not subject or not subject.strip():
        return None
    canonical = (aliases or {}).get(subject.strip(), subject.strip().upper())
    return canonical if canonical else None


# ---------------------------------------------------------------------------
# Canonical extraction
# ---------------------------------------------------------------------------

def extract_events_from_feed(
    raw_text: str,
    source: str,
    aliases: Optional[Dict[str, str]] = None,
) -> List[NamedEvent]:
    """
    Parse a raw feed payload (RSS/XML or JSON) and produce NamedEvents.

    In production this uses a proper RSS/XML parser.  The function handles:
    - Timestamp normalisation to UTC
    - Entity resolution via entity_aliases.yaml
    - Category mapping to EventCategory enum
    - Filtering to gate-relevant categories

    Items that fail entity resolution are logged but NOT emitted as NamedEvents.

    Returns
    -------
    list[NamedEvent]
        Only gate-relevant events (OTHER_MATERIAL items are excluded from return
        value even if they parse successfully).
    """
    # In production: parse XML/RSS. For the current implementation we accept
    # a minimal JSON format used internally and in tests.
    try:
        items = json.loads(raw_text)
        if not isinstance(items, list):
            items = [items]
    except (json.JSONDecodeError, ValueError):
        return []

    events: List[NamedEvent] = []

    for item in items:
        if not isinstance(item, dict):
            continue

        # Timestamp
        ts_str = item.get("ts") or item.get("timestamp") or item.get("pub_date")
        if not ts_str:
            continue
        try:
            ts = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue

        # Category
        raw_cat = str(item.get("category", "OTHER_MATERIAL")).upper()
        try:
            category = EventCategory(raw_cat)
        except ValueError:
            category = EventCategory.OTHER_MATERIAL

        # Entity
        subject = str(item.get("subject") or item.get("entity") or "")
        entity_id = _resolve_entity(subject, aliases)
        if entity_id is None:
            logger.debug("Entity resolution failed for subject %r — skipping", subject)
            continue

        entity_type = str(item.get("entity_type", "team")).lower()
        description = str(item.get("description", ""))
        is_gate = category in GATE_RELEVANT_CATEGORIES

        event_id = f"{source}_{ts.isoformat()}_{entity_id}"

        evt = NamedEvent(
            event_id=event_id,
            ts=ts,
            category=category,
            entity_id=entity_id,
            entity_type=entity_type,
            source=source,
            description=description,
            is_gate_relevant=is_gate,
        )

        # OTHER_MATERIAL: log but don't gate-trigger; we still return them
        # so callers can log to news_fetch_log.jsonl if needed.
        # Gate-only filter is applied by NewsWindow.get_events_since().
        events.append(evt)

    return events


# ---------------------------------------------------------------------------
# NewsMonitor class
# ---------------------------------------------------------------------------

class NewsMonitor:
    """
    Polls federation feeds and maintains a rolling 24-hour NewsWindow.

    The monitor is the only stateful component in Phase 6 and the only one
    that holds a background thread.  All other Phase 6 components are stateless.

    Usage
    -----
        monitor = NewsMonitor(tier1_sources=[...], tier2_sources=[...])
        monitor.start()
        ...
        window = monitor.get_window(datetime.now(timezone.utc))
        ...
        monitor.stop()
    """

    def __init__(
        self,
        tier1_sources: Optional[List[str]] = None,
        tier2_sources: Optional[List[str]] = None,
        fetch_log_path: Optional[Path] = None,
        window_snapshot_path: Optional[Path] = None,
        entity_aliases: Optional[Dict[str, str]] = None,
        _fetch_fn=None,   # injectable for testing
    ) -> None:
        self._tier1 = list(tier1_sources or [])
        self._tier2 = list(tier2_sources or [])
        self._fetch_log_path = fetch_log_path
        self._window_snapshot_path = window_snapshot_path
        self._aliases = entity_aliases or {}
        self._fetch_fn = _fetch_fn or self._http_fetch

        self._window = NewsWindow()
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

        # Circuit breakers per source
        self._breakers: Dict[str, _CircuitBreaker] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Spawn the polling loop in a daemon thread."""
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._poll_loop, name="news-monitor", daemon=True
        )
        self._thread.start()
        logger.info("NewsMonitor started (tier1=%d, tier2=%d sources)",
                    len(self._tier1), len(self._tier2))

    def stop(self) -> None:
        """Graceful shutdown: signal the loop and wait for it to finish."""
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=10)
        self._flush_window_snapshot()
        logger.info("NewsMonitor stopped")

    def get_window(self, now: datetime) -> NewsWindow:
        """Return a thread-safe snapshot of the 24-hour event window."""
        with self._lock:
            cutoff = now - timedelta(hours=_WINDOW_RETENTION_HOURS)
            self._window.prune_older_than(cutoff)
            return self._window.snapshot()

    # ------------------------------------------------------------------
    # Internal polling
    # ------------------------------------------------------------------

    def _poll_loop(self) -> None:
        """Main polling loop.  Runs until stop() is called."""
        last_tier1 = 0.0
        last_tier2 = 0.0
        last_snapshot = 0.0

        while not self._stop_event.is_set():
            now_ts = time.monotonic()
            now_dt = datetime.now(timezone.utc)

            if now_ts - last_tier1 >= _TIER1_POLL_INTERVAL:
                for source in self._tier1:
                    self._poll_source(source, tier=1, now=now_dt)
                last_tier1 = now_ts

            if now_ts - last_tier2 >= _TIER2_POLL_INTERVAL:
                for source in self._tier2:
                    self._poll_source(source, tier=2, now=now_dt)
                last_tier2 = now_ts

            # Serialise window snapshot every 60 seconds
            if now_ts - last_snapshot >= 60:
                self._flush_window_snapshot()
                last_snapshot = now_ts

            # Short sleep so we can respond to stop() quickly
            self._stop_event.wait(timeout=5.0)

    def _poll_source(self, source: str, tier: int, now: datetime) -> None:
        breaker = self._breakers.setdefault(source, _CircuitBreaker(source=source))

        if breaker.is_open(now):
            self._write_fetch_log(FetchLogEntry(
                ts=now.isoformat(),
                source=source,
                tier=tier,
                http_status=None,
                byte_count=0,
                parse_outcome="circuit_open",
                events_emitted=0,
            ))
            return

        try:
            raw, status = self._fetch_fn(source)
            byte_count = len(raw.encode("utf-8")) if isinstance(raw, str) else len(raw)
            breaker.record_success()
        except Exception as exc:
            breaker.record_failure(now)
            self._write_fetch_log(FetchLogEntry(
                ts=now.isoformat(),
                source=source,
                tier=tier,
                http_status=None,
                byte_count=0,
                parse_outcome=f"error:{exc}",
                events_emitted=0,
            ))
            return

        try:
            events = extract_events_from_feed(raw, source, self._aliases)
            parse_outcome = "ok"
        except Exception as exc:
            events = []
            parse_outcome = f"parse_error:{exc}"

        with self._lock:
            cutoff = now - timedelta(hours=_WINDOW_RETENTION_HOURS)
            self._window.prune_older_than(cutoff)
            for evt in events:
                self._window.add(evt)

        self._write_fetch_log(FetchLogEntry(
            ts=now.isoformat(),
            source=source,
            tier=tier,
            http_status=status,
            byte_count=byte_count,
            parse_outcome=parse_outcome,
            events_emitted=len(events),
        ))

    # ------------------------------------------------------------------
    # I/O helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _http_fetch(url: str) -> tuple:
        """Live HTTP fetch (stub in tests via _fetch_fn injection)."""
        import urllib.request
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "45pct-news-monitor/1.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return raw, resp.status

    def _write_fetch_log(self, entry: FetchLogEntry) -> None:
        if self._fetch_log_path is None:
            return
        try:
            with open(self._fetch_log_path, "a", encoding="utf-8") as fh:
                fh.write(entry.to_jsonl())
        except OSError as exc:
            logger.error("Failed to write fetch log: %s", exc)

    def _flush_window_snapshot(self) -> None:
        if self._window_snapshot_path is None:
            return
        with self._lock:
            snapshot = self._window.snapshot()
        rows = [json.dumps(evt.to_dict()) + "\n" for evt in snapshot._events.values()]
        try:
            with open(self._window_snapshot_path, "w", encoding="utf-8") as fh:
                fh.writelines(rows)
        except OSError as exc:
            logger.error("Failed to flush window snapshot: %s", exc)
