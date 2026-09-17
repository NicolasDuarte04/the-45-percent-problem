"""
pulso/base.py
=============
The common interface every Pulso input implements.

Contract (from the Session 05 brief, governs every input):
  * Every input returns an `InputReading` with a normalised 0-100 `value` OR
    `None`, an `available` bool, the `weight` it carries, a `source` label, a
    `source_url` where applicable, and a UTC `fetched_at`.
  * An input that cannot fetch returns `available=False, value=None`. It never
    guesses. There is no path in this framework that fabricates a number to fill
    a missing input.
  * Inputs are candidate-neutral. They measure magnitude / loudness / charge,
    never "who is winning". Directional-looking signals (search divergence,
    market spread) are folded in as MAGNITUDE only.

Subclasses set `source` and implement `fetch()`. Use the `_reading` / `_blank`
helpers so the availability invariant is enforced in one place.
"""

from __future__ import annotations

import sys
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import InputReading  # noqa: E402


class PulsoInput(ABC):
    """Abstract base for a single Pulso input behind a uniform `fetch()`."""

    #: Stable input label, set by each subclass (e.g. "headlines").
    source: str = "base"

    def __init__(self, *, weight: float, cfg: dict) -> None:
        self.weight = float(weight)
        self.cfg = cfg

    # ── The one method subclasses must provide ────────────────────────────────

    @abstractmethod
    def fetch(self) -> InputReading:
        """
        Attempt to produce a reading. Implementations MUST return an
        `InputReading` in all cases — a genuine value when the fetch succeeds, or
        `available=False, value=None` (via `_blank`) when it cannot. They must
        never raise out of `fetch()`; catch, log, and return a blank instead.
        """
        raise NotImplementedError

    # ── Helpers that enforce the availability invariant ───────────────────────

    def _reading(
        self,
        value: float,
        *,
        source_url: str | None = None,
        note: str | None = None,
    ) -> InputReading:
        """A genuine, available reading carrying a 0-100 value."""
        return InputReading(
            source=self.source,
            value=float(value),
            available=True,
            weight=self.weight,
            source_url=source_url,
            fetched_at=datetime.now(timezone.utc),
            note=note,
        )

    def _blank(self, note: str, *, source_url: str | None = None) -> InputReading:
        """An honest unavailable reading: available=False, value=None."""
        return InputReading(
            source=self.source,
            value=None,
            available=False,
            weight=self.weight,
            source_url=source_url,
            fetched_at=datetime.now(timezone.utc),
            note=note,
        )
