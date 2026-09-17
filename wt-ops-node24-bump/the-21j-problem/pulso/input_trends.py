"""
pulso/input_trends.py
=====================
Google Trends search interest, via `pytrends`, folded in as a MAGNITUDE signal:
how much search attention the runoff is drawing right now. Candidate-neutral —
the value averages interest across both candidate terms plus a generic runoff
term, so it measures loudness, not direction.

Defensive by design. `pytrends` is an unofficial, frequently rate-limited
scraper of an undocumented endpoint. If it is not installed, not reachable, or
rate-limited, this input returns `available=False, value=None` with a one-line
reason and does NOT retry into a ban. It never emits a guessed number.

Google Trends interest is already on a 0-100 relative scale, so the latest mean
interest across the tracked terms maps directly to the Pulso 0-100 value.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pulso.base import PulsoInput  # noqa: E402
from schemas import InputReading  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

_TRENDS_URL = "https://trends.google.com/trends/explore"


class TrendsInput(PulsoInput):
    """Google Trends interest via pytrends; unavailable if unreachable."""

    source = "trends"

    def fetch(self) -> InputReading:
        tc = self.cfg["trends"]
        terms = list(tc["terms"])
        geo = str(tc.get("geo", "CO"))
        timeframe = str(tc.get("timeframe", "now 7-d"))
        timeout_s = float(tc.get("request_timeout_s", 15))

        # Import inside fetch: a missing optional dependency must degrade
        # honestly, not crash the orchestrator at import time.
        try:
            from pytrends.request import TrendReq  # type: ignore
        except Exception as exc:  # noqa: BLE001
            return self._blank(
                f"pytrends not available ({str(exc).splitlines()[0]}); Google Trends not ingested",
                source_url=_TRENDS_URL,
            )

        try:
            pytrends = TrendReq(hl="es-CO", tz=300, timeout=(timeout_s, timeout_s))
            pytrends.build_payload(terms, geo=geo, timeframe=timeframe)
            df = pytrends.interest_over_time()
        except Exception as exc:  # noqa: BLE001 — rate-limited / network; do not retry
            return self._blank(
                f"Google Trends unreachable or rate-limited: {str(exc).splitlines()[0]}",
                source_url=_TRENDS_URL,
            )

        if df is None or df.empty:
            return self._blank("Google Trends returned no data", source_url=_TRENDS_URL)

        term_cols = [c for c in terms if c in df.columns]
        if not term_cols:
            return self._blank("Google Trends returned no usable term columns", source_url=_TRENDS_URL)

        # Latest row, mean interest across the tracked terms (already 0-100).
        latest = df[term_cols].iloc[-1]
        value = float(latest.mean())
        value = max(0.0, min(100.0, value))
        note = f"latest mean interest across {term_cols} over '{timeframe}' (geo={geo})"
        return self._reading(value, source_url=_TRENDS_URL, note=note)
