"""
ingestion/fetch_odds_pinnacle.py
=================================
Phase 2, Task 2.6a: Pinnacle Odds (Live Connector + Synthetic Fallback)

Fetches match-winner (1X2) odds for WC 2026 matches in a 3-tier cascade and
writes them to ``data/raw/odds_pinnacle.parquet`` with a canonical schema.
The schema does NOT change between tiers; downstream code (devig.py,
edge_calculator.py, volatility_gate.py) is source-agnostic.

Tier cascade
------------
  1. Pinnacle commercial API   (auth via PINNACLE_API_KEY).
                               Primary; requires a licensee account.
  2. The Odds API              (auth via THE_ODDS_API_KEY).
                               Public aggregator, free tier 500 req/mo,
                               exposes Pinnacle as a named bookmaker.
  3. Synthetic (Elo-derived).
                               Deterministic fallback so the pipeline,
                               CI, and frontend never break when the
                               bookmakers haven't opened lines yet.

The orchestrator tries each tier in order. The first one that returns
non-empty records wins. Each row is tagged with its `bookmaker` field
("pinnacle" for both real-data tiers; the Odds API surfaces Pinnacle's
prices) so downstream filters keep working.

Authentication
--------------
- Pinnacle commercial API: HTTP Basic, username = API key, blank password.
  Set ``PINNACLE_API_KEY`` in ``.env``.
- The Odds API: simple ``apiKey`` query param. Sign up at
  https://the-odds-api.com (free tier). Set ``THE_ODDS_API_KEY`` in ``.env``.

Run
---
  python ingestion/fetch_odds_pinnacle.py
  python ingestion/fetch_odds_pinnacle.py --force                # ignore cache
  python ingestion/fetch_odds_pinnacle.py --source synthetic     # force synth
  python ingestion/fetch_odds_pinnacle.py --source pinnacle      # only Tier 1
  python ingestion/fetch_odds_pinnacle.py --source oddsapi       # only Tier 2

Notes
-----
- WC 2026 lines typically open 6 to 8 weeks before kickoff. Until then both real
  tiers will return zero events for the soccer_fifa_world_cup sport key, and
  the synthetic fallback runs automatically, by design.
- When real records arrive, they're keyed by canonical match_id (M01..M104)
  via a fixture lookup against ``data/raw/wc2026_fixtures.parquet``. Events
  that fail the lookup are logged and skipped, never silently miscounted.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import math
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import pandas as pd
import requests
from dotenv import load_dotenv
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import yaml

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)
load_dotenv(PROJECT_ROOT / ".env")

with open(PROJECT_ROOT / "config.yaml") as _f:
    _cfg = yaml.safe_load(_f)

OUTPUT_PARQUET = PROJECT_ROOT / _cfg["data_sources"]["odds_pinnacle"]["output_file"]
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

PINNACLE_API_BASE = "https://api.pinnacle.com"
SOCCER_SPORT_ID   = 29
WC_LEAGUE_IDS     = {7593, 7594, 7596}  # FIFA WC, FIFA WC Qual, FIFA WC Women's

# --- Tier 2: The Odds API (public aggregator, free tier 500 req/month) ------
# Docs: https://the-odds-api.com/liveapi/guides/v4/
# Sport key once WC 2026 markets open: ``soccer_fifa_world_cup``.
# Free tier returns up to 500 events per request; one request covers all 104
# WC fixtures. Quota cost is reported back in response headers we log.
THE_ODDS_API_BASE  = "https://api.the-odds-api.com/v4"
THE_ODDS_API_SPORT = "soccer_fifa_world_cup"
THE_ODDS_API_REGIONS  = "us,uk,eu"     # widest pool that surfaces Pinnacle
THE_ODDS_API_MARKET   = "h2h"           # head-to-head = 1X2 in their lexicon
THE_ODDS_API_BOOKMAKER = "pinnacle"     # filter on Pinnacle only; that's what
                                        # the rest of the pipeline expects in
                                        # the `bookmaker` column.

# Aliases that map third-party / Odds-API team-name spellings back to the
# fixture-parquet display_name. Keys are lower-cased; values are the exact
# team_home / team_away spelling from wc2026_fixtures.parquet. Add new entries
# here when a new third-party feed surfaces an unfamiliar name; never add a
# parallel name table elsewhere.
_ODDS_API_NAME_ALIASES: dict[str, str] = {
    "south korea":                   "Korea Republic",
    "korea, republic":               "Korea Republic",
    "korea republic":                "Korea Republic",
    "iran":                          "IR Iran",
    "iran, islamic republic":        "IR Iran",
    "ir iran":                       "IR Iran",
    "turkey":                        "Türkiye",
    "türkiye":                       "Türkiye",
    "usa":                           "United States",
    "u.s.a.":                        "United States",
    "united states of america":      "United States",
    "united states":                 "United States",
    "ivory coast":                   "Côte d'Ivoire",
    "cote d'ivoire":                 "Côte d'Ivoire",
    "côte d'ivoire":                 "Côte d'Ivoire",
    "cape verde":                    "Cabo Verde",
    "cape verde islands":            "Cabo Verde",
    "cabo verde":                    "Cabo Verde",
    "dr congo":                      "Congo DR",
    "democratic republic of congo":  "Congo DR",
    "congo dr":                      "Congo DR",
    "congo democratic republic":     "Congo DR",
    "bosnia and herzegovina":        "Bosnia & Herzegovina",
    "bosnia & herzegovina":          "Bosnia & Herzegovina",
    "bosnia-herzegovina":            "Bosnia & Herzegovina",
    "curacao":                       "Curaçao",
    "curaçao":                       "Curaçao",
}

# ---------------------------------------------------------------------------
# Team name normalisation: fixture names → Elo rating names
# ---------------------------------------------------------------------------
_TEAM_NAME_NORM: dict[str, str] = {
    "Cabo Verde":      "Cape Verde",
    "Congo DR":        "DR Congo",
    "IR Iran":         "Iran",
    "Korea Republic":  "South Korea",
    "Türkiye":         "Turkey",
    "United States":   "USA",
    # Ensure exact matches too (no-ops keep the lookup table self-consistent)
    "Bosnia & Herzegovina": "Bosnia-Herzegovina",
}

# Fallback Elo ratings (Elo ~1500 = medium-strength nation) for teams
# not present in elo_ratings.parquet
_FALLBACK_ELO: dict[str, float] = {
    "Curaçao":     1490.0,
    "Haiti":       1480.0,
    "Jordan":      1530.0,
    "New Zealand": 1530.0,
}


# =============================================================================
# Auth
# =============================================================================

def _auth_header() -> dict[str, str]:
    key = os.getenv("PINNACLE_API_KEY", "")
    if not key:
        raise EnvironmentError("PINNACLE_API_KEY not set in .env")
    encoded = base64.b64encode(f"{key}:".encode()).decode()
    return {
        "Authorization": f"Basic {encoded}",
        "Accept":        "application/json",
    }


# =============================================================================
# API helpers
# =============================================================================

@retry(
    retry=retry_if_exception_type(requests.exceptions.RequestException),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _get(path: str, params: dict | None = None) -> dict:
    url = PINNACLE_API_BASE + path
    resp = requests.get(url, headers=_auth_header(), params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _get_leagues() -> list[dict]:
    """Return all soccer leagues with futures available."""
    return _get("/v2/leagues", {"sportId": SOCCER_SPORT_ID})


def _get_fixtures(league_id: int) -> list[dict]:
    """Return upcoming fixtures for a league."""
    data = _get("/v1/fixtures", {"sportId": SOCCER_SPORT_ID, "leagueIds": league_id})
    return data.get("league", [{}])[0].get("events", [])


def _get_odds(league_id: int, event_ids: list[int]) -> list[dict]:
    """Return 1X2 odds for specific event IDs."""
    data = _get("/v1/odds", {
        "sportId":      SOCCER_SPORT_ID,
        "leagueIds":    league_id,
        "oddsFormat":   "Decimal",
        "eventIds":     ",".join(str(e) for e in event_ids),
    })
    return data.get("leagues", [{}])[0].get("events", [])


# =============================================================================
# Synthetic odds generation
# =============================================================================

def _elo_map() -> dict[str, float]:
    """Return {team_name → elo_rating} for all teams we know about."""
    elo_path = PROJECT_ROOT / "data" / "raw" / "elo_ratings.parquet"
    if not elo_path.exists():
        log.warning("elo_ratings.parquet not found; using fallback ratings only")
        return dict(_FALLBACK_ELO)

    df = pd.read_parquet(elo_path)
    m: dict[str, float] = {}
    for _, row in df.iterrows():
        m[row["team_name"]] = float(row["elo_rating"])
    m.update(_FALLBACK_ELO)
    return m


def _lookup_elo(team_fixture_name: str, elo_map: dict[str, float]) -> float:
    """Get Elo for a team, applying name normalisation and fallbacks."""
    normed = _TEAM_NAME_NORM.get(team_fixture_name, team_fixture_name)
    if normed in elo_map:
        return elo_map[normed]
    # Partial-match fallback (e.g. 'Bosnia & Herzegovina' → 'Bosnia-Herzegovina')
    for k, v in elo_map.items():
        if team_fixture_name.split()[0] in k:
            return v
    log.warning("Elo not found for team, using neutral 1600", team=team_fixture_name)
    return 1600.0


def _elo_to_probs(
    elo_home: float,
    elo_away: float,
    *,
    rng: random.Random,
    noise_sd: float = 0.0,
) -> tuple[float, float, float]:
    """
    Convert Elo ratings to 1X2 true probabilities.

    Uses a calibrated model:
    - 2-outcome win prob via standard Elo formula (400-point scale)
    - Draw rate varies with match competitiveness (tighter match → more draws)
    - Optional Gaussian noise to simulate market imperfection (opening lines)

    Returns (p_home_win, p_draw, p_away_win) summing to 1.0.
    """
    diff = elo_home - elo_away
    p_win = 1.0 / (1.0 + 10.0 ** (-diff / 400.0))  # raw 2-outcome home-win prob

    # Draw probability: peaks near 0.27 for balanced matches, falls for lopsided ones
    competitiveness = 1.0 - (2.0 * p_win - 1.0) ** 2   # 1.0 = perfectly balanced
    p_draw = 0.14 + 0.13 * competitiveness               # range [0.14, 0.27]

    p_home = p_win * (1.0 - p_draw)
    p_away = (1.0 - p_win) * (1.0 - p_draw)

    # Add calibrated noise to simulate opening-line uncertainty
    if noise_sd > 0:
        adj = [
            rng.gauss(0.0, noise_sd),
            rng.gauss(0.0, noise_sd * 0.6),   # draws are more stable
            rng.gauss(0.0, noise_sd),
        ]
        p_home = max(0.02, p_home + adj[0])
        p_draw = max(0.08, p_draw + adj[1])
        p_away = max(0.02, p_away + adj[2])
        total = p_home + p_draw + p_away
        p_home /= total
        p_draw  /= total
        p_away  /= total

    return p_home, p_draw, p_away


def _probs_to_pinnacle_odds(
    p_home: float,
    p_draw: float,
    p_away: float,
    *,
    overround: float,
) -> tuple[float, float, float]:
    """
    Apply bookmaker overround and return Pinnacle-style decimal odds.

    Pinnacle uses a uniform-margin model (proportional to probability).
    Decimal odds = 1 / (true_prob × overround).

    Odds are rounded to 2 d.p. matching Pinnacle's quote format.
    """
    d_home = round(1.0 / (p_home * overround), 2)
    d_draw = round(1.0 / (p_draw * overround), 2)
    d_away = round(1.0 / (p_away * overround), 2)
    # Floor at 1.02 to avoid sub-unity odds
    return max(1.02, d_home), max(1.02, d_draw), max(1.02, d_away)


def _match_seed(match_id: str, variant: str) -> int:
    """Deterministic RNG seed from match_id + line variant."""
    h = hashlib.sha256(f"{match_id}:{variant}".encode()).digest()
    return int.from_bytes(h[:4], "big")


def generate_synthetic() -> list[dict]:
    """
    Generate realistic Pinnacle-structure 1X2 odds for all WC 2026 matches.

    For each match (104 total) we emit:
      - 3 opening rows  (home_win / draw / away_win, is_opening=True)
      - 3 closing rows  (home_win / draw / away_win, is_closing=True)

    Opening lines: higher overround (4.8 to 5.5%), more noise (σ ≈ 1.8pp)
    Closing lines: lower overround (3.8 to 4.5%), less noise (σ ≈ 0.4pp)

    All odds are derived from Elo strength differentials using the calibrated
    conversion in _elo_to_probs(). No actual Pinnacle data is used.
    """
    fixtures_path = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
    if not fixtures_path.exists():
        log.warning("wc2026_fixtures.parquet not found; cannot generate synthetic odds")
        return []

    fixtures = pd.read_parquet(fixtures_path)
    elo = _elo_map()

    log.stage(
        "Generating synthetic Pinnacle odds",
        matches=len(fixtures),
        note="Elo-derived, Pinnacle-structure-equivalent",
    )

    now_utc = datetime.now(timezone.utc)
    snapshot_ts = now_utc.isoformat()
    records: list[dict] = []

    for _, row in fixtures.iterrows():
        match_id    = str(row["match_id"])
        home_name   = str(row["team_home"])
        away_name   = str(row["team_away"])
        kickoff_raw = str(row["kickoff_utc"])
        stage       = str(row["stage"])

        elo_home = _lookup_elo(home_name, elo)
        elo_away = _lookup_elo(away_name, elo)

        # Opening line; noisy, higher overround
        rng_open = random.Random(_match_seed(match_id, "open"))
        or_open  = rng_open.uniform(1.045, 1.055)
        p_h_open, p_d_open, p_a_open = _elo_to_probs(
            elo_home, elo_away, rng=rng_open, noise_sd=0.018,
        )
        oh, od, oa = _probs_to_pinnacle_odds(
            p_h_open, p_d_open, p_a_open, overround=or_open,
        )

        # Opening line timestamp: 7 days before kickoff
        try:
            kickoff_dt = pd.Timestamp(kickoff_raw).to_pydatetime()
            if kickoff_dt.tzinfo is None:
                kickoff_dt = kickoff_dt.replace(tzinfo=timezone.utc)
        except Exception:
            kickoff_dt = now_utc
        open_ts = (kickoff_dt - timedelta(days=7)).isoformat()

        for outcome, decimal_odds in [
            ("home_win", oh), ("draw", od), ("away_win", oa),
        ]:
            records.append({
                "snapshot_id":    f"syn_{match_id[:4]}_{outcome[:2]}",
                "timestamp":      open_ts,
                "match_id":       match_id,
                "bookmaker":      "pinnacle",
                "market_type":    "match_winner",
                "outcome":        outcome,
                "decimal_odds":   decimal_odds,
                "is_opening":     True,
                "is_closing":     False,
                "last_refreshed": open_ts,
            })

        # Closing line; sharper, lower overround, near kickoff
        rng_close = random.Random(_match_seed(match_id, "close"))
        or_close  = rng_close.uniform(1.038, 1.045)
        p_h_cl, p_d_cl, p_a_cl = _elo_to_probs(
            elo_home, elo_away, rng=rng_close, noise_sd=0.004,
        )
        ch, cd, ca = _probs_to_pinnacle_odds(
            p_h_cl, p_d_cl, p_a_cl, overround=or_close,
        )

        close_ts = (kickoff_dt - timedelta(minutes=5)).isoformat()

        for outcome, decimal_odds in [
            ("home_win", ch), ("draw", cd), ("away_win", ca),
        ]:
            records.append({
                "snapshot_id":    f"syn_{match_id[:4]}_{outcome[:2]}_c",
                "timestamp":      close_ts,
                "match_id":       match_id,
                "bookmaker":      "pinnacle",
                "market_type":    "match_winner",
                "outcome":        outcome,
                "decimal_odds":   decimal_odds,
                "is_opening":     False,
                "is_closing":     True,
                "last_refreshed": close_ts,
            })

    log.success(
        "Synthetic Pinnacle odds generated",
        matches=len(fixtures),
        rows=len(records),
    )
    return records


# =============================================================================
# Tier 2: The Odds API (public aggregator)
# =============================================================================

def _odds_api_key() -> str:
    return os.getenv("THE_ODDS_API_KEY", "").strip()


@retry(
    retry=retry_if_exception_type(requests.exceptions.RequestException),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _get_odds_api(path: str, params: dict) -> tuple[list, dict]:
    """
    GET ``THE_ODDS_API_BASE + path`` with the API key appended.

    Returns ``(payload, response_headers)``. The headers carry the running
    quota (``x-requests-remaining`` etc.) which we surface so users know how
    much of their free tier is left.
    """
    full = {**params, "apiKey": _odds_api_key()}
    url  = THE_ODDS_API_BASE + path
    resp = requests.get(url, params=full, timeout=20)
    resp.raise_for_status()
    return resp.json(), dict(resp.headers)


def _norm_team_name(s: str) -> str:
    """Lower-case + collapse whitespace for forgiving lookups."""
    return " ".join(str(s).strip().split()).lower()


def _alias_to_fixture_name(third_party_name: str) -> str:
    """
    Map a third-party team string (from any external feed) to the canonical
    fixture-parquet display_name. Falls through to the original string if no
    alias is registered; the match resolver then attempts case-insensitive
    matching against the fixture lookup as a last resort.
    """
    return _ODDS_API_NAME_ALIASES.get(_norm_team_name(third_party_name), third_party_name)


def _load_fixture_lookup() -> tuple[dict[tuple[str, str, str], str], list[dict]]:
    """
    Build a (home_norm, away_norm, date_str_utc) → match_id index from the
    canonical fixtures parquet. Returns the lookup plus the raw fixture rows
    (used when probabilistically dating a third-party event).

    The date_str is the UTC calendar day of kickoff. Most third-party feeds
    quote kickoff in UTC ISO; tolerance of ±1 day is handled by also
    indexing the day-before and day-after to absorb timezone-edge events.
    """
    fixtures_path = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
    if not fixtures_path.exists():
        log.warning("wc2026_fixtures.parquet not found; match resolution disabled")
        return {}, []

    df = pd.read_parquet(fixtures_path)
    lookup: dict[tuple[str, str, str], str] = {}
    fixtures: list[dict] = []
    for _, row in df.iterrows():
        match_id = str(row["match_id"])
        home     = str(row["team_home"])
        away     = str(row["team_away"])
        kickoff  = pd.Timestamp(row["kickoff_utc"])
        if kickoff.tzinfo is None:
            kickoff = kickoff.tz_localize("UTC")

        home_n = _norm_team_name(home)
        away_n = _norm_team_name(away)

        # Index ±1 day so a feed quoting kickoff in local time still hits.
        for delta in (-1, 0, 1):
            d = (kickoff + pd.Timedelta(days=delta)).strftime("%Y-%m-%d")
            lookup[(home_n, away_n, d)] = match_id

        fixtures.append({
            "match_id":    match_id,
            "home":        home,
            "away":        away,
            "kickoff_utc": kickoff,
        })
    return lookup, fixtures


def _resolve_match_id(
    home_raw: str,
    away_raw: str,
    kickoff_iso: str,
    lookup: dict[tuple[str, str, str], str],
) -> Optional[str]:
    """
    Resolve a third-party event to a canonical M{NN} match_id.

    Strategy:
      1. Run the team names through ``_alias_to_fixture_name``
      2. Try (home, away, kickoff_date); exact orientation
      3. Try (away, home, kickoff_date); feeds occasionally invert sides
         when there's no formal home team (neutral-venue tournaments).
      4. Return None on miss; caller logs and skips.
    """
    if not lookup:
        return None
    home_fix = _alias_to_fixture_name(home_raw)
    away_fix = _alias_to_fixture_name(away_raw)
    h, a = _norm_team_name(home_fix), _norm_team_name(away_fix)

    try:
        kickoff_dt = pd.Timestamp(kickoff_iso)
        if kickoff_dt.tzinfo is None:
            kickoff_dt = kickoff_dt.tz_localize("UTC")
        d = kickoff_dt.tz_convert("UTC").strftime("%Y-%m-%d")
    except Exception:
        return None

    if (h, a, d) in lookup:
        return lookup[(h, a, d)]
    if (a, h, d) in lookup:   # inverted sides
        return lookup[(a, h, d)]
    return None


# ---------------------------------------------------------------------------
# cp-30: knockout pairing resolution
# ---------------------------------------------------------------------------
# The group-stage fixture parquet (wc2026_fixtures.parquet) carries only
# placeholder team names for the knockout slots ("1A", "BEST3-CDEFI", ...), so a
# real knockout event (Brazil vs Norway) can never resolve against it and its
# odds were dropped as "Unresolved" every night. The concrete draw is instead
# learned by ingestion/fetch_knockout_pairings.py and written to
# data/live/knockout_pairings.json (KO-FD{source_id} ids, real team names, real
# kickoff). We build a second lookup from that file and consult it when the group
# fixture lookup misses. The group logic above is untouched: group events keep
# resolving to their M{NN} ids for the historical record.
LIVE_KNOCKOUT_PAIRINGS = PROJECT_ROOT / "data" / "live" / "knockout_pairings.json"


def _load_knockout_lookup() -> dict[tuple[str, str, str], str]:
    """Build a (home_norm, away_norm, date_str_utc) -> KO-FD match_id index.

    Sourced from data/live/knockout_pairings.json. Team names come from each
    pairing's ``source_name`` (the football-data.org spelling) run through the
    same alias + normalisation the group resolver uses, so an Odds API spelling
    ("USA") and the pairing spelling ("United States") collapse to one key. The
    kickoff day is indexed with a +/-1 day tolerance, matching the group lookup,
    to absorb timezone-edge quotes. Absent or unreadable file yields an empty
    lookup (the normal pre-draw state); knockout resolution is then simply
    disabled and events fall through unchanged.
    """
    if not LIVE_KNOCKOUT_PAIRINGS.exists():
        log.info(
            "knockout pairings file absent; knockout odds resolution disabled",
            path=str(LIVE_KNOCKOUT_PAIRINGS),
        )
        return {}
    import json

    try:
        doc = json.loads(LIVE_KNOCKOUT_PAIRINGS.read_text())
    except Exception as exc:  # unreadable -> disable, never crash the fetch
        log.warning("knockout pairings unreadable; knockout resolution disabled", error=str(exc))
        return {}

    lookup: dict[tuple[str, str, str], str] = {}
    for p in doc.get("pairings", []):
        match_id = p.get("match_id")
        home = (p.get("home") or {}).get("source_name")
        away = (p.get("away") or {}).get("source_name")
        kickoff = p.get("kickoff_utc")
        if not match_id or not home or not away or not kickoff:
            continue
        try:
            k = pd.Timestamp(kickoff)
            if k.tzinfo is None:
                k = k.tz_localize("UTC")
        except Exception:
            continue
        h = _norm_team_name(_alias_to_fixture_name(home))
        a = _norm_team_name(_alias_to_fixture_name(away))
        for delta in (-1, 0, 1):
            d = (k + pd.Timedelta(days=delta)).strftime("%Y-%m-%d")
            lookup[(h, a, d)] = str(match_id)
    return lookup


def _resolve_knockout_match_id(
    home_raw: str,
    away_raw: str,
    kickoff_iso: str,
    ko_lookup: dict[tuple[str, str, str], str],
) -> Optional[str]:
    """Resolve a third-party knockout event to its KO-FD match_id.

    Same alias + both-orientations strategy as ``_resolve_match_id`` (knockout
    ties are neutral-venue, so the home/away orientation the feed reports is not
    authoritative). Returns None on miss; the caller then leaves the event
    unresolved and skips it, exactly as before.
    """
    if not ko_lookup:
        return None
    h = _norm_team_name(_alias_to_fixture_name(home_raw))
    a = _norm_team_name(_alias_to_fixture_name(away_raw))
    try:
        kickoff_dt = pd.Timestamp(kickoff_iso)
        if kickoff_dt.tzinfo is None:
            kickoff_dt = kickoff_dt.tz_localize("UTC")
        d = kickoff_dt.tz_convert("UTC").strftime("%Y-%m-%d")
    except Exception:
        return None
    if (h, a, d) in ko_lookup:
        return ko_lookup[(h, a, d)]
    if (a, h, d) in ko_lookup:   # inverted sides
        return ko_lookup[(a, h, d)]
    return None


def fetch_via_odds_api(force: bool = False) -> list[dict]:
    """
    Fetch live WC 2026 1X2 odds from The Odds API and return them in the
    canonical pipeline schema (already keyed to M{NN} match_ids).

    Returns an empty list when:
      - No ``THE_ODDS_API_KEY`` is set
      - The HTTP request fails after retries
      - The API returns zero events (markets not yet open)
      - Every event fails the fixture lookup (name resolution broken)
    """
    raw_cache = PROJECT_ROOT / "data" / "raw" / "_odds_api_raw.json"

    if raw_cache.exists() and not force:
        log.info("Using cached Odds API response", path=str(raw_cache))
        import json
        try:
            cached = json.loads(raw_cache.read_text())
            return _normalise_odds_api_payload(cached)
        except Exception as exc:
            log.warning("Cached Odds API payload unreadable; refetching", error=str(exc))

    if not _odds_api_key():
        log.info(
            "THE_ODDS_API_KEY not set; skipping Tier 2",
            hint="sign up at https://the-odds-api.com (free tier) and add the key to .env",
        )
        return []

    log.stage(
        "Fetching live odds via The Odds API (Tier 2)",
        sport=THE_ODDS_API_SPORT,
        regions=THE_ODDS_API_REGIONS,
        bookmaker=THE_ODDS_API_BOOKMAKER,
    )

    try:
        events, headers = _get_odds_api(
            f"/sports/{THE_ODDS_API_SPORT}/odds",
            {
                "regions":    THE_ODDS_API_REGIONS,
                "markets":    THE_ODDS_API_MARKET,
                "bookmakers": THE_ODDS_API_BOOKMAKER,
                "oddsFormat": "decimal",
                "dateFormat": "iso",
            },
        )
    except requests.exceptions.HTTPError as exc:
        # 401/422 (bad key, sport not active yet) is informational, not fatal.
        status = exc.response.status_code if exc.response is not None else None
        body   = exc.response.text[:200] if exc.response is not None else ""
        log.warning(
            "Odds API HTTP error; falling through to next tier",
            status=status,
            body=body,
        )
        return []
    except Exception as exc:
        log.warning("Odds API unreachable; falling through to next tier", error=str(exc)[:160])
        return []

    quota = {
        "remaining": headers.get("x-requests-remaining"),
        "used":      headers.get("x-requests-used"),
    }
    log.info("Odds API quota", **{k: v for k, v in quota.items() if v is not None})

    if not isinstance(events, list) or not events:
        log.info("Odds API returned 0 events; WC 2026 markets not open yet")
        return []

    raw_cache.parent.mkdir(parents=True, exist_ok=True)
    import json
    raw_cache.write_text(json.dumps(events, indent=2, default=str))
    log.info("Cached Odds API payload", path=str(raw_cache), events=len(events))

    return _normalise_odds_api_payload(events)


def _normalise_odds_api_payload(events: list[dict]) -> list[dict]:
    """
    Convert a list of Odds-API event dicts into pipeline-schema rows.

    Schema produced (matches build_output expectations):
      snapshot_id, timestamp, match_id, bookmaker, market_type, outcome,
      decimal_odds, is_opening, is_closing, last_refreshed
    """
    lookup, _ = _load_fixture_lookup()
    ko_lookup = _load_knockout_lookup()
    snapshot_ts = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []
    unresolved = 0
    knockout_resolved = 0

    for ev in events:
        commence  = ev.get("commence_time", "")
        home_team = ev.get("home_team", "")
        away_team = ev.get("away_team", "")

        # Group fixtures resolve to their canonical M{NN} id (historical record).
        # A miss falls through to cp-30 knockout pairing resolution (KO-FD ids).
        match_id = _resolve_match_id(home_team, away_team, commence, lookup)
        if match_id is None:
            match_id = _resolve_knockout_match_id(home_team, away_team, commence, ko_lookup)
            if match_id is not None:
                knockout_resolved += 1
        if match_id is None:
            unresolved += 1
            log.warning(
                "Unresolved Odds API event",
                home=home_team,
                away=away_team,
                commence=commence,
            )
            continue

        for book in ev.get("bookmakers", []):
            if str(book.get("key", "")).lower() != THE_ODDS_API_BOOKMAKER:
                continue
            last_update = book.get("last_update", snapshot_ts)
            for mkt in book.get("markets", []):
                if mkt.get("key") != THE_ODDS_API_MARKET:
                    continue
                # outcomes is a list with exactly 3 entries: home / away / draw
                # (order varies by event; match by `name` field).
                for outcome in mkt.get("outcomes", []):
                    name  = str(outcome.get("name", ""))
                    price = outcome.get("price")
                    if price is None or price <= 1.0:
                        continue

                    if _norm_team_name(name) == _norm_team_name(home_team):
                        bucket = "home_win"
                    elif _norm_team_name(name) == _norm_team_name(away_team):
                        bucket = "away_win"
                    elif _norm_team_name(name) in {"draw", "tie"}:
                        bucket = "draw"
                    else:
                        log.warning("Unknown outcome label", outcome=name, match_id=match_id)
                        continue

                    records.append({
                        "snapshot_id":    f"oa_{match_id[:4]}_{bucket[:2]}",
                        "timestamp":      snapshot_ts,
                        "match_id":       match_id,
                        "bookmaker":      "pinnacle",  # canonical
                        "market_type":    "match_winner",
                        "outcome":        bucket,
                        "decimal_odds":   float(price),
                        "is_opening":     False,   # Odds API gives a snapshot,
                        "is_closing":     False,   # not opening/closing tags
                        "last_refreshed": last_update or snapshot_ts,
                    })

    if unresolved:
        log.warning("Some events failed fixture resolution", unresolved=unresolved)

    log.success(
        "Odds API normalised to pipeline schema",
        events=len(events),
        rows=len(records),
        unresolved=unresolved,
        knockout_resolved=knockout_resolved,
    )
    return records


# =============================================================================
# Fetch raw (Tier 1: Pinnacle commercial API)
# =============================================================================

def fetch_raw(force: bool = False) -> list[dict]:
    """
    Return a list of odds observation dicts from the live Pinnacle API.
    Returns empty list if API is unreachable or no WC lines are available.
    """
    raw_cache = PROJECT_ROOT / "data" / "raw" / "_odds_pinnacle_raw.json"

    if raw_cache.exists() and not force:
        log.info("Using cached Pinnacle odds", path=str(raw_cache))
        import json
        return json.loads(raw_cache.read_text())

    log.stage("Fetching live Pinnacle odds via API")

    try:
        _auth_header()  # validate key is set
    except EnvironmentError as exc:
        log.warning("Pinnacle API key missing; will use synthetic path", error=str(exc))
        return []

    try:
        leagues = _get_leagues()
    except Exception as exc:
        log.warning(
            "Pinnacle API unreachable; will use synthetic path",
            error=str(exc)[:120],
        )
        return []

    wc_leagues = [
        lg for lg in (leagues if isinstance(leagues, list) else leagues.get("leagues", []))
        if lg.get("id") in WC_LEAGUE_IDS or "world cup" in str(lg.get("name", "")).lower()
    ]

    if not wc_leagues:
        log.warning("No WC 2026 leagues found on Pinnacle yet; lines may not be open")
        return []

    records: list[dict] = []
    snapshot_ts = datetime.now(timezone.utc)

    for league in wc_leagues:
        league_id = league["id"]
        fixtures  = _get_fixtures(league_id)
        if not fixtures:
            continue

        event_ids  = [f["id"] for f in fixtures]
        odds_list  = _get_odds(league_id, event_ids)
        fixture_map = {f["id"]: f for f in fixtures}

        for event_odds in odds_list:
            event_id  = event_odds.get("id")
            fixture   = fixture_map.get(event_id, {})
            home_team = fixture.get("home", "")
            away_team = fixture.get("away", "")
            starts_at = fixture.get("starts", "")

            for period in event_odds.get("periods", []):
                if period.get("number") != 0:
                    continue
                moneyline = period.get("moneyLine", {})
                if not moneyline:
                    continue

                for outcome, key in [("home_win", "home"), ("draw", "draw"), ("away_win", "away")]:
                    decimal_price = moneyline.get(key)
                    if decimal_price is None:
                        continue

                    records.append({
                        "snapshot_id":    str(uuid.uuid4())[:8],
                        "timestamp":      snapshot_ts.isoformat(),
                        "event_id":       event_id,
                        "match_id":       None,   # resolved in clean_and_enrich
                        "home_team_raw":  home_team,
                        "away_team_raw":  away_team,
                        "kickoff_raw":    starts_at,
                        "bookmaker":      "pinnacle",
                        "market_type":    "match_winner",
                        "outcome":        outcome,
                        "decimal_odds":   decimal_price,
                        "is_opening":     period.get("lineId") == period.get("altLineId"),
                        "is_closing":     False,
                        "league_id":      league_id,
                    })

    raw_cache.parent.mkdir(parents=True, exist_ok=True)
    import json
    raw_cache.write_text(json.dumps(records, indent=2))
    log.success("Pinnacle live odds fetched", records=len(records), path=str(raw_cache))
    return records


# =============================================================================
# Clean & enrich  (live API path)
# =============================================================================

def _make_match_id(date_str: str, home: str, away: str) -> str:
    """
    Legacy fallback identifier used when fixture resolution fails on a Tier 1
    record. Kept for diagnostic logging; the canonical M{NN} match_id is
    produced by ``clean_and_enrich`` via the shared ``_resolve_match_id``
    machinery (same logic Tier 2 uses).
    """
    home_slug = home.replace(" ", "_")[:20]
    away_slug = away.replace(" ", "_")[:20]
    return f"{date_str}_{home_slug}_{away_slug}"


def clean_and_enrich(records: list[dict]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame(columns=[
            "snapshot_id", "timestamp", "match_id", "bookmaker", "market_type",
            "outcome", "decimal_odds", "is_opening", "is_closing", "last_refreshed",
        ])

    log.stage("Cleaning live Pinnacle odds records")
    df = pd.DataFrame(records)

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    df["kickoff_utc"] = pd.to_datetime(df["kickoff_raw"], errors="coerce", utc=True)
    df["date_str"] = df["kickoff_utc"].dt.strftime("%Y-%m-%d").fillna("unknown")

    # Resolve to canonical M{NN} match_id via the shared fixture lookup, so
    # Tier 1 output matches Tier 2 (Odds API) and Tier 3 (synthetic). Rows
    # that fail fixture resolution are logged with a diagnostic legacy id and
    # dropped: downstream joins (data_loader.get_odds, market_pipeline) all
    # key on canonical fixture match_ids, and a non-canonical row would
    # silently miss its fixture and never produce a divergence.
    lookup, _ = _load_fixture_lookup()
    ko_lookup = _load_knockout_lookup()
    resolved: list[Optional[str]] = []
    for _, r in df.iterrows():
        mid = _resolve_match_id(
            r["home_team_raw"], r["away_team_raw"], r["kickoff_raw"], lookup,
        )
        if mid is None:  # cp-30: fall through to the resolved knockout pairings
            mid = _resolve_knockout_match_id(
                r["home_team_raw"], r["away_team_raw"], r["kickoff_raw"], ko_lookup,
            )
        resolved.append(mid)
    df["match_id"] = resolved
    unresolved_mask = df["match_id"].isna()
    n_unresolved = int(unresolved_mask.sum())
    if n_unresolved:
        for _, r in df[unresolved_mask].iterrows():
            log.warning(
                "Tier 1 row failed fixture resolution; dropping",
                home=r["home_team_raw"],
                away=r["away_team_raw"],
                kickoff=r["kickoff_raw"],
                legacy_id=_make_match_id(r["date_str"], r["home_team_raw"], r["away_team_raw"]),
            )
        df = df.loc[~unresolved_mask].copy()

    df["last_refreshed"] = df["timestamp"]

    log.success(
        "Pinnacle clean complete",
        records=len(df),
        unresolved_dropped=n_unresolved,
    )
    return df


# =============================================================================
# Build output (common path for both live and synthetic)
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = pd.DataFrame({
        "snapshot_id":    df["snapshot_id"],
        "timestamp":      pd.to_datetime(df["timestamp"], utc=True),
        "match_id":       df["match_id"],
        "bookmaker":      df["bookmaker"],
        "market_type":    df["market_type"],
        "outcome":        df["outcome"],
        "decimal_odds":   df["decimal_odds"].astype(float),
        "is_opening":     df["is_opening"].astype(bool),
        "is_closing":     df["is_closing"].astype(bool),
        "last_refreshed": pd.to_datetime(df["last_refreshed"], utc=True),
    })
    return out.sort_values(["match_id", "is_opening", "outcome"]).reset_index(drop=True)


# =============================================================================
# Spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    if df.empty:
        log.info("Empty Pinnacle snapshot; no rows to validate")
        return

    sample = df.sample(min(n, len(df)), random_state=42)
    errors: list[str] = []
    for _, row in sample.iterrows():
        if row["decimal_odds"] <= 1.0:
            errors.append(f"{row['match_id']} {row['outcome']}: decimal_odds {row['decimal_odds']} <= 1.0")
        if row["outcome"] not in {"home_win", "draw", "away_win"}:
            errors.append(f"Unknown outcome: {row['outcome']!r}")

    if errors:
        log.warning("Validation issues", count=len(errors))
        for err in errors:
            log.warning(err)
    else:
        log.success(f"Spot-check passed on {len(sample)} sample rows")


def _validate_overround(df: pd.DataFrame) -> None:
    """Verify that implied probabilities sum to expected overround per match × line."""
    if df.empty:
        return
    grp = df.groupby(["match_id", "is_opening", "is_closing"])
    outliers = 0
    for (mid, is_open, is_close), sub in grp:
        impl = (1.0 / sub["decimal_odds"]).sum()
        if not (1.00 < impl < 1.12):
            log.warning(
                "Overround out of band",
                match_id=mid,
                is_opening=is_open,
                implied_sum=round(impl, 4),
            )
            outliers += 1
    if outliers == 0:
        log.success("Overround check passed; all implied sums in [1.00, 1.12]")


# =============================================================================
# Tier orchestration
# =============================================================================

# Source labels recorded in the snapshot registry note + log lines so we can
# always tell which tier produced any given run's parquet.
SOURCE_PINNACLE  = "live-pinnacle"
SOURCE_ODDS_API  = "live-oddsapi"
SOURCE_SYNTHETIC = "synthetic"
SOURCE_EMPTY     = "empty"


def fetch_real_odds(force: bool = False) -> tuple[pd.DataFrame, str]:
    """
    Try real-data tiers in priority order. Returns ``(dataframe, source)``.

    Priority:
      1. Pinnacle commercial API (auth: PINNACLE_API_KEY)
      2. The Odds API public aggregator (auth: THE_ODDS_API_KEY)

    On the first non-empty tier, returns its DataFrame in canonical schema.
    On total real-data failure, returns ``(empty_df, "empty")`` and the
    caller is expected to fall back to ``generate_synthetic()``.
    """
    # ── Tier 1: Pinnacle commercial ────────────────────────────────────────
    log.info("Tier 1; attempting Pinnacle commercial API")
    pin_records = fetch_raw(force=force)
    if pin_records:
        cleaned = clean_and_enrich(pin_records)
        df = build_output(cleaned)
        log.success("Tier 1 hit; using Pinnacle commercial data", rows=len(df))
        return df, SOURCE_PINNACLE
    log.info("Tier 1 returned no records; trying Tier 2")

    # ── Tier 2: The Odds API ───────────────────────────────────────────────
    log.info("Tier 2; attempting The Odds API public aggregator")
    oa_records = fetch_via_odds_api(force=force)
    if oa_records:
        df = build_output(pd.DataFrame(oa_records))
        log.success("Tier 2 hit; using The Odds API data", rows=len(df))
        return df, SOURCE_ODDS_API
    log.info("Tier 2 returned no records; caller should fall back to synthetic")

    return _empty_df(), SOURCE_EMPTY


def _empty_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "snapshot_id", "timestamp", "match_id", "bookmaker", "market_type",
        "outcome", "decimal_odds", "is_opening", "is_closing", "last_refreshed",
    ])


# =============================================================================
# Run
# =============================================================================

_VALID_SOURCES = {"auto", "pinnacle", "oddsapi", "synthetic"}


def run(force: bool = False, source: str = "auto") -> Path:
    """
    Orchestrator. ``source`` selects which tiers to attempt:

      auto      : Tier 1 then Tier 2 then Tier 3 (synthetic).  Default.
      pinnacle  : Tier 1 only.  Synthetic fallback if it returns empty.
      oddsapi   : Tier 2 only.  Synthetic fallback if it returns empty.
      synthetic : Skip both real tiers, write deterministic synthetic data.
    """
    if source not in _VALID_SOURCES:
        raise ValueError(f"--source must be one of {sorted(_VALID_SOURCES)}, got {source!r}")

    log.stage("=== fetch_odds_pinnacle · Phase 2 Task 2.6a ===", source=source)

    output_df: pd.DataFrame = _empty_df()
    data_label = SOURCE_EMPTY

    if source == "synthetic":
        log.info("Synthetic source forced; skipping real-data tiers")
    elif source == "pinnacle":
        recs = fetch_raw(force=force)
        if recs:
            output_df = build_output(clean_and_enrich(recs))
            data_label = SOURCE_PINNACLE
    elif source == "oddsapi":
        recs = fetch_via_odds_api(force=force)
        if recs:
            output_df = build_output(pd.DataFrame(recs))
            data_label = SOURCE_ODDS_API
    else:  # auto
        output_df, data_label = fetch_real_odds(force=force)

    if output_df.empty:
        log.info(
            "No real odds available; using synthetic Elo-derived fallback",
            previous_label=data_label,
        )
        syn_records = generate_synthetic()
        if syn_records:
            output_df  = build_output(pd.DataFrame(syn_records))
            data_label = SOURCE_SYNTHETIC

    log.info("Validating output", rows=len(output_df), data_label=data_label)
    _validate_sample(output_df)
    _validate_overround(output_df)

    OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")
    log.success(
        "Parquet written",
        path=str(OUTPUT_PARQUET),
        rows=len(output_df),
        size_kb=round(OUTPUT_PARQUET.stat().st_size / 1024, 1),
        data_label=data_label,
    )

    hasher = DataSnapshotHasher()
    hasher.add_file(OUTPUT_PARQUET, label="odds_pinnacle")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes=f"fetch_odds_pinnacle:{data_label}")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_odds_pinnacle complete", rows=len(output_df), data_label=data_label)
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch / generate Pinnacle 1X2 odds for WC 2026 matches.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-fetch even if cache exists.",
    )
    parser.add_argument(
        "--source",
        choices=sorted(_VALID_SOURCES),
        default="auto",
        help="Which odds source to use. 'auto' tries Pinnacle → Odds API → synthetic.",
    )
    parser.add_argument(
        "--synthetic",
        action="store_true",
        help="DEPRECATED alias for --source synthetic. Kept for backward compatibility.",
    )
    args = parser.parse_args()
    chosen_source = "synthetic" if args.synthetic else args.source
    run(force=args.force, source=chosen_source)
