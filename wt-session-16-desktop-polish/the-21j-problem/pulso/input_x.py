"""
pulso/input_x.py
================
X / Twitter tone — STUB.

This is a real module wired into the framework so a later session can implement
it without rearchitecting. It is NOT fake: it returns `available=False,
value=None` with a one-line reason, and it can never emit a number. X removed
free, research-grade access to its API; there is no accessible endpoint that
would let this input fetch tone honestly, so it reports unavailable.

When X tone is implemented, it must be folded in as a MAGNITUDE / charge signal
(how loud, how charged), never as a "who is winning" signal.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pulso.base import PulsoInput  # noqa: E402
from schemas import InputReading  # noqa: E402


class XInput(PulsoInput):
    """X / Twitter tone. Stub: always unavailable, never a number."""

    source = "x"

    def fetch(self) -> InputReading:
        return self._blank("no accessible X/Twitter API for tone (stub; implement later)")
