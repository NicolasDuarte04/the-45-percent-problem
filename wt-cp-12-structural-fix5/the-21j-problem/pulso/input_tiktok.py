"""
pulso/input_tiktok.py
=====================
TikTok hashtag velocity — STUB.

A real module wired into the framework, not a fake value. It returns
`available=False, value=None` with a one-line reason and can never emit a
number. TikTok exposes no stable, accessible API for hashtag velocity at
research tier, so this input reports unavailable until a later session
implements it.

When implemented, hashtag velocity must be folded in as a MAGNITUDE signal (how
fast the conversation is moving), never as a directional one.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pulso.base import PulsoInput  # noqa: E402
from schemas import InputReading  # noqa: E402


class TikTokInput(PulsoInput):
    """TikTok hashtag velocity. Stub: always unavailable, never a number."""

    source = "tiktok"

    def fetch(self) -> InputReading:
        return self._blank("no accessible TikTok API for hashtag velocity (stub; implement later)")
