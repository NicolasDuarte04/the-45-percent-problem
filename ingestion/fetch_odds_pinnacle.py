"""
ingestion/fetch_odds_pinnacle.py
=================================
Phase 2 · Task 2.6a — Pinnacle Odds

Fetches match-winner (1X2) odds for WC 2026 matches from Pinnacle via their
commercial API. Stores both opening and closing lines per match, which are the
raw material for CLV measurement.

Also attempts to retrieve historical WC odds (2010–2022) for bias-correction
calibration. These are typically available via third-party datasets or cached
from previous runs.

Authentication
--------------
Pinnacle uses HTTP Basic auth: base64(username:password) where the username is
the API key. Set PINNACLE_API_KEY in .env.

Run
---
  python ingestion/fetch_odds_pinnacle.py
  python ingestion/fetch_odds_pinnacle.py --force   # re-fetch even if cached

Notes
-----
- WC 2026 lines typically open 6–8 weeks before kickoff. If the API returns no
  soccer WC events, the script logs a warning and writes an empty but valid
  Parquet file.
- The script is designed to be run daily as part of the live pipeline.
"""

from __future__ import annotations

import argparse
import base64
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

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
# Fetch raw
# =============================================================================

def fetch_raw(force: bool = False) -> list[dict]:
    """
    Return a list of odds observation dicts.
    Returns empty list if API is unreachable or no WC lines are available.
    """
    raw_cache = PROJECT_ROOT / "data" / "raw" / "_odds_pinnacle_raw.json"

    if raw_cache.exists() and not force:
        log.info("Using cached Pinnacle odds", path=str(raw_cache))
        import json
        return json.loads(raw_cache.read_text())

    log.stage("Fetching Pinnacle odds")

    try:
        _auth_header()  # validate key is set
    except EnvironmentError as exc:
        log.warning("Pinnacle API key missing", error=str(exc))
        return []

    try:
        leagues = _get_leagues()
    except Exception as exc:
        log.warning(
            "Pinnacle API unreachable — writing empty snapshot",
            error=str(exc)[:120],
        )
        return []

    wc_leagues = [
        lg for lg in (leagues if isinstance(leagues, list) else leagues.get("leagues", []))
        if lg.get("id") in WC_LEAGUE_IDS or "world cup" in str(lg.get("name", "")).lower()
    ]

    if not wc_leagues:
        log.warning("No WC 2026 leagues found on Pinnacle yet — lines may not be open")
        return []

    records: list[dict] = []
    snapshot_ts = datetime.now(timezone.utc)

    for league in wc_leagues:
        league_id = league["id"]
        fixtures = _get_fixtures(league_id)
        if not fixtures:
            continue

        event_ids = [f["id"] for f in fixtures]
        odds_list = _get_odds(league_id, event_ids)

        fixture_map = {f["id"]: f for f in fixtures}

        for event_odds in odds_list:
            event_id  = event_odds.get("id")
            fixture   = fixture_map.get(event_id, {})
            home_team = fixture.get("home", "")
            away_team = fixture.get("away", "")
            starts_at = fixture.get("starts", "")

            for period in event_odds.get("periods", []):
                if period.get("number") != 0:
                    continue  # full-match (period 0) only
                moneyline = period.get("moneyLine", {})
                if not moneyline:
                    continue

                for outcome, key in [("home_win", "home"), ("draw", "draw"), ("away_win", "away")]:
                    decimal_price = moneyline.get(key)
                    if decimal_price is None:
                        continue

                    records.append({
                        "snapshot_id":   str(uuid.uuid4())[:8],
                        "timestamp":     snapshot_ts.isoformat(),
                        "event_id":      event_id,
                        "match_id":      None,  # resolved in clean_and_enrich
                        "home_team_raw": home_team,
                        "away_team_raw": away_team,
                        "kickoff_raw":   starts_at,
                        "bookmaker":     "pinnacle",
                        "market_type":   "match_winner",
                        "outcome":       outcome,
                        "decimal_odds":  decimal_price,
                        "is_opening":    period.get("lineId") == period.get("altLineId"),
                        "is_closing":    False,  # set post-match
                        "league_id":     league_id,
                    })

    raw_cache.parent.mkdir(parents=True, exist_ok=True)
    import json
    raw_cache.write_text(json.dumps(records, indent=2))
    log.success(
        "Pinnacle odds fetched",
        records=len(records),
        path=str(raw_cache),
    )
    return records


# =============================================================================
# Clean & enrich
# =============================================================================

def _make_match_id(date_str: str, home: str, away: str) -> str:
    home_slug = home.replace(" ", "_")[:20]
    away_slug = away.replace(" ", "_")[:20]
    return f"{date_str}_{home_slug}_{away_slug}"


def clean_and_enrich(records: list[dict]) -> pd.DataFrame:
    if not records:
        log.info("No Pinnacle records to process — returning empty DataFrame")
        return pd.DataFrame(columns=[
            "snapshot_id", "timestamp", "match_id", "bookmaker", "market_type",
            "outcome", "decimal_odds", "is_opening", "is_closing", "last_refreshed",
        ])

    log.stage("Cleaning Pinnacle odds records")
    df = pd.DataFrame(records)

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    df["kickoff_utc"] = pd.to_datetime(df["kickoff_raw"], errors="coerce", utc=True)
    df["date_str"] = df["kickoff_utc"].dt.strftime("%Y-%m-%d").fillna("unknown")

    df["match_id"] = df.apply(
        lambda r: _make_match_id(r["date_str"], r["home_team_raw"], r["away_team_raw"]),
        axis=1,
    )
    df["last_refreshed"] = df["timestamp"]

    log.success("Pinnacle clean complete", records=len(df))
    return df


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = pd.DataFrame({
        "snapshot_id":   df["snapshot_id"],
        "timestamp":     df["timestamp"],
        "match_id":      df["match_id"],
        "bookmaker":     df["bookmaker"],
        "market_type":   df["market_type"],
        "outcome":       df["outcome"],
        "decimal_odds":  df["decimal_odds"].astype(float),
        "is_opening":    df["is_opening"].astype(bool),
        "is_closing":    df["is_closing"].astype(bool),
        "last_refreshed": df["last_refreshed"],
    })
    return out.sort_values(["match_id", "outcome"]).reset_index(drop=True)


# =============================================================================
# Spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    if df.empty:
        log.info("Empty Pinnacle snapshot — no rows to validate (expected pre-tournament)")
        return

    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
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


# =============================================================================
# Run
# =============================================================================

def run(force: bool = False) -> Path:
    log.stage("=== fetch_odds_pinnacle · Phase 2 Task 2.6a ===")

    records   = fetch_raw(force=force)
    cleaned   = clean_and_enrich(records)
    output_df = build_output(cleaned)

    log.stage("Spot-checking Pinnacle records")
    _validate_sample(output_df)

    OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")
    log.success(
        "Parquet written",
        path=str(OUTPUT_PARQUET),
        rows=len(output_df),
        size_kb=round(OUTPUT_PARQUET.stat().st_size / 1024, 1),
        empty=output_df.empty,
    )

    hasher = DataSnapshotHasher()
    hasher.add_file(OUTPUT_PARQUET, label="odds_pinnacle")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_odds_pinnacle")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_odds_pinnacle complete", rows=len(output_df))
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Pinnacle 1X2 odds for WC 2026 matches.")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cache exists.")
    args = parser.parse_args()
    run(force=args.force)
