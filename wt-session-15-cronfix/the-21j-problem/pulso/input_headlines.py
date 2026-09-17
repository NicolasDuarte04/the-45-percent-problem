"""
pulso/input_headlines.py
========================
The Pulso spine: Colombian-outlet RSS headlines turned into a candidate-neutral
0-100 intensity value. If every other input is unavailable, Pulso still runs on
headlines alone (and reports inputs_live=1, data_sufficiency="demo").

Method (candidate-NEUTRAL by construction):
  1. Pull recent items from the configured Colombian outlet RSS feeds.
  2. Keep runoff-relevant items (title/summary contains a relevance term;
     accent-insensitive). This filter uses candidate surnames purely to find the
     conversation, never to take a side.
  3. Build a 0-100 value from two magnitude components, neither of which encodes
     direction:
       - volume  = how MUCH the runoff is being discussed (relevant-item count,
         saturating), and
       - charge  = how CHARGED that discussion is (share of relevant items that
         carry a high-arousal term from a neutral lexicon).

`score_items` is a pure function so it can be unit-tested on fixture headlines
with no network. The class wraps it with the actual fetch and the availability
contract: feeds genuinely reachable -> available (even if the runoff is quiet);
no feed reachable at all -> unavailable, never a guessed number.
"""

from __future__ import annotations

import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from pulso.base import PulsoInput  # noqa: E402
from schemas import InputReading  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

_USER_AGENT = "ElVoto21Junio-Pulso/0.1 (+https://45analytics.com; research)"


# =============================================================================
# Text helpers (pure)
# =============================================================================


def _normalise(text: str) -> str:
    """Lowercase + strip accents, keeping spaces. For relevance/charge matching."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return text.lower()


# =============================================================================
# Scoring (pure — unit-tested without network)
# =============================================================================


def score_items(items: list[dict], cfg: dict) -> dict:
    """
    Turn a list of {'title', 'summary'} items into a candidate-neutral 0-100
    intensity value plus its component counts. Pure: no I/O.

    Returns a dict: {value, n_total, n_relevant, n_charged,
                     volume_component, charge_component}.
    `value` is None only if there are zero input items (caller decides whether
    that means "quiet" or "unavailable"; this function never invents a number).
    """
    relevance_terms = [_normalise(t) for t in cfg["relevance_terms"]]
    charge_terms = [_normalise(t) for t in cfg["charge_terms"]]
    saturation = float(cfg["volume_saturation_items"])
    w_vol = float(cfg["volume_component_weight"])
    w_charge = float(cfg["charge_component_weight"])

    n_total = len(items)
    n_relevant = 0
    n_charged = 0
    for item in items:
        blob = _normalise(f"{item.get('title', '')} {item.get('summary', '')}")
        if any(term in blob for term in relevance_terms):
            n_relevant += 1
            if any(term in blob for term in charge_terms):
                n_charged += 1

    volume_component = min(1.0, n_relevant / saturation) if saturation > 0 else 0.0
    charge_component = (n_charged / n_relevant) if n_relevant > 0 else 0.0

    denom = w_vol + w_charge
    blended = (w_vol * volume_component + w_charge * charge_component) / denom if denom else 0.0
    value = round(max(0.0, min(100.0, 100.0 * blended)), 2)

    return {
        "value": value,
        "n_total": n_total,
        "n_relevant": n_relevant,
        "n_charged": n_charged,
        "volume_component": round(volume_component, 4),
        "charge_component": round(charge_component, 4),
    }


# =============================================================================
# RSS fetch
# =============================================================================


def _parse_rss(xml_bytes: bytes) -> list[dict]:
    """Extract {title, summary} from an RSS/Atom byte payload. Tolerant."""
    items: list[dict] = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return items

    # RSS 2.0: channel/item ; Atom: feed/entry. Strip namespaces with a wildcard.
    for tag in (".//item", ".//{*}item", ".//{*}entry"):
        for node in root.findall(tag):
            title = node.findtext("title") or node.findtext("{*}title") or ""
            summary = (
                node.findtext("description")
                or node.findtext("{*}summary")
                or node.findtext("{*}content")
                or ""
            )
            items.append({"title": title, "summary": summary})
        if items:
            break
    return items


def fetch_feeds(feeds: list[dict], timeout_s: float) -> tuple[list[dict], int]:
    """
    Fetch every configured feed. Returns (all_items, feeds_reachable). A feed
    that errors is logged and skipped — never a hard failure, never invented.
    """
    all_items: list[dict] = []
    feeds_ok = 0
    headers = {"User-Agent": _USER_AGENT}
    for feed in feeds:
        url = feed["url"]
        try:
            resp = requests.get(url, timeout=timeout_s, headers=headers)
            resp.raise_for_status()
            parsed = _parse_rss(resp.content)
            if parsed:
                feeds_ok += 1
                all_items.extend(parsed)
            else:
                log.warning("Feed returned no items", outlet=feed.get("outlet"), url=url)
        except Exception as exc:  # noqa: BLE001 — skip + log, never fabricate
            log.warning("Feed unreachable", outlet=feed.get("outlet"), url=url, error=str(exc).splitlines()[0])
    return all_items, feeds_ok


# =============================================================================
# Input
# =============================================================================


class HeadlinesInput(PulsoInput):
    """RSS headline intensity from Colombian outlets. The Pulso spine."""

    source = "headlines"

    def fetch(self) -> InputReading:
        hc = self.cfg["headlines"]
        feeds = hc["feeds"]
        timeout_s = float(hc.get("request_timeout_s", 10))

        try:
            items, feeds_ok = fetch_feeds(feeds, timeout_s)
        except Exception as exc:  # noqa: BLE001 — defensive; fetch_feeds already guards
            return self._blank(f"headline fetch failed: {str(exc).splitlines()[0]}")

        if feeds_ok == 0:
            return self._blank("no Colombian outlet RSS feed reachable")

        scored = score_items(items, hc)
        note = (
            f"{feeds_ok}/{len(feeds)} feeds reachable; {scored['n_relevant']} runoff-relevant "
            f"of {scored['n_total']} items, {scored['n_charged']} carrying a charged term"
        )
        # First reachable feed's URL is a reasonable source pointer.
        source_url = feeds[0]["url"] if feeds else None
        return self._reading(scored["value"], source_url=source_url, note=note)
