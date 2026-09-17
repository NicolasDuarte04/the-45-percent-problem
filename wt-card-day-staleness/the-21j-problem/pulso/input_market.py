"""
pulso/input_market.py
=====================
Polymarket prediction-market signal, IF a Colombia 2026 runoff market exists.

This input folds a market SPREAD in as a MAGNITUDE signal only: the absolute
spread |2p - 1| of a binary runoff market measures conviction / how lopsided the
contract is, symmetric in the two candidates. It is NOT read as "who is ahead";
the value is direction-free by construction.

Honesty rules (from the brief):
  * Query the Gamma API for a Colombia 2026 runoff market. If no such market
    exists, mark unavailable and say so in the note.
  * Do NOT substitute a different market or invent a spread.
  * Never emit a guessed number.

`match_runoff_market` is a pure function (testable offline) that decides whether
a fetched market is the Colombia runoff market and extracts its spread.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pulso.base import PulsoInput  # noqa: E402
from schemas import InputReading  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

_USER_AGENT = "ElVoto21Junio-Pulso/0.1 (+https://45analytics.com; research)"

# A market must mention Colombia AND at least one runoff signal to count.
_COLOMBIA_TERMS = ("colombia",)
_RUNOFF_TERMS = ("cepeda", "espriella", "runoff", "segunda vuelta", "presidential")


def _outcome_prices(market: dict) -> list[float]:
    """Parse a Gamma market's outcomePrices (a list or a JSON-encoded string)."""
    raw = market.get("outcomePrices")
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (ValueError, TypeError):
            return []
    try:
        return [float(x) for x in raw]
    except (ValueError, TypeError):
        return []


def match_runoff_market(markets: list[dict]) -> dict | None:
    """
    Pure: from a list of Gamma market dicts, return the first active, binary
    Colombia-runoff market with a usable spread, as
    {question, spread, p, market_slug}. Returns None if none qualifies — never a
    fallback to an unrelated market.

    `spread` is the candidate-neutral absolute spread |2p - 1| in [0,1].
    """
    for m in markets:
        question = str(m.get("question") or m.get("title") or "")
        q = question.lower()
        if not any(t in q for t in _COLOMBIA_TERMS):
            continue
        if not any(t in q for t in _RUNOFF_TERMS):
            continue
        # Skip resolved / inactive markets.
        if m.get("closed") is True or m.get("active") is False:
            continue
        prices = _outcome_prices(m)
        if len(prices) != 2:
            continue
        p = prices[0]
        if not (0.0 <= p <= 1.0):
            continue
        spread = abs(2.0 * p - 1.0)
        return {
            "question": question,
            "spread": spread,
            "p": p,
            "market_slug": m.get("slug") or m.get("id"),
        }
    return None


def fetch_markets(url: str, search_terms: list[str], timeout_s: float) -> list[dict]:
    """
    Query the Gamma markets endpoint. Tries a server-side text search per term
    and merges results; falls back to an active-markets listing. Returns [] on
    any failure (logged, never fabricated).
    """
    headers = {"User-Agent": _USER_AGENT}
    merged: dict[str, dict] = {}
    try:
        for term in search_terms:
            resp = requests.get(
                url,
                params={"search": term, "active": "true", "closed": "false", "limit": 100},
                timeout=timeout_s,
                headers=headers,
            )
            resp.raise_for_status()
            payload = resp.json()
            rows = payload if isinstance(payload, list) else payload.get("data", [])
            for row in rows:
                key = str(row.get("id") or row.get("slug") or row.get("question"))
                merged[key] = row
    except Exception as exc:  # noqa: BLE001 — log + return what we have / nothing
        log.warning("Polymarket Gamma query failed", url=url, error=str(exc).splitlines()[0])
    return list(merged.values())


class MarketInput(PulsoInput):
    """Polymarket CO-runoff spread as a magnitude signal, if the market exists."""

    source = "market"

    def fetch(self) -> InputReading:
        mc = self.cfg["market"]
        url = str(mc["gamma_search_url"])
        terms = list(mc["search_terms"])
        timeout_s = float(mc.get("request_timeout_s", 12))

        markets = fetch_markets(url, terms, timeout_s)
        if not markets:
            return self._blank(
                "Polymarket Gamma API unreachable or returned no markets", source_url=url
            )

        hit = match_runoff_market(markets)
        if hit is None:
            return self._blank(
                "no Colombia 2026 runoff market on Polymarket (no substitute used)",
                source_url=url,
            )

        value = max(0.0, min(100.0, 100.0 * float(hit["spread"])))
        # Store the spread magnitude and the slug only; the raw market question
        # is external text we do not control and is kept out of the snapshot.
        note = (
            f"absolute market spread |2p-1| = {hit['spread']:.3f} (magnitude only, not "
            f"direction); market_slug={hit.get('market_slug')}"
        )
        market_url = url
        if hit.get("market_slug"):
            market_url = f"https://polymarket.com/event/{hit['market_slug']}"
        return self._reading(value, source_url=market_url, note=note)
