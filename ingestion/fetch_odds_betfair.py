"""
ingestion/fetch_odds_betfair.py
================================
Phase 2 · Task 2.6c — Betfair Exchange Odds

Fetches best-available back/lay prices from the Betfair Exchange for WC 2026
match markets. The back/lay spread is compared against Pinnacle de-vigged
prices for the Exchange Spread Volatility Gate suppression rule (threshold: 2.5%
per config.yaml).

Authentication
--------------
Betfair API requires an Application Key + Session Token (SSOID).
Set BETFAIR_API_KEY in .env. Session tokens are acquired via Betfair's Identity
API (login endpoint). This script uses the non-interactive bot API which
requires a client certificate for some regions.

Simplified auth flow used here:
  1. Exchange API-NG with apiKey header (works for public read-only ops in many regions)
  2. Falls back to empty snapshot if auth fails

Run
---
  python ingestion/fetch_odds_betfair.py
  python ingestion/fetch_odds_betfair.py --force
"""

from __future__ import annotations

import argparse
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

OUTPUT_PARQUET = PROJECT_ROOT / _cfg["data_sources"]["odds_betfair"]["output_file"]
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

BETFAIR_API_BASE  = "https://api.betfair.com/exchange/betting/json-rpc/v1"
BETFAIR_LOGIN_URL = "https://identitysso-cert.betfair.com/api/certlogin"
SOCCER_EVENT_TYPE = "1"   # Betfair event type ID for soccer
WC_COMPETITION_ID = "30558"  # Betfair WC 2026 competition ID (may need updating)


# =============================================================================
# Auth
# =============================================================================

def _api_headers() -> dict[str, str]:
    key = os.getenv("BETFAIR_API_KEY", "")
    if not key:
        raise EnvironmentError("BETFAIR_API_KEY not set in .env")
    return {
        "X-Application":  key,
        "Content-Type":   "application/json",
        "Accept":         "application/json",
    }


# =============================================================================
# API helpers (JSON-RPC)
# =============================================================================

@retry(
    retry=retry_if_exception_type(requests.exceptions.RequestException),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _jsonrpc(method: str, params: dict) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "method":  f"SportsAPING/v1.0/{method}",
        "params":  params,
        "id":      1,
    }
    resp = requests.post(BETFAIR_API_BASE, json=payload, headers=_api_headers(), timeout=20)
    resp.raise_for_status()
    result = resp.json()
    if "error" in result:
        raise RuntimeError(f"Betfair API error: {result['error']}")
    return result.get("result", {})


def _list_events() -> list[dict]:
    return _jsonrpc("listEvents", {
        "filter": {
            "eventTypeIds":  [SOCCER_EVENT_TYPE],
            "competitionIds": [WC_COMPETITION_ID],
        },
        "locale": "en",
    })


def _list_market_catalogue(event_ids: list[str]) -> list[dict]:
    return _jsonrpc("listMarketCatalogue", {
        "filter": {
            "eventIds":         event_ids,
            "marketTypeCodes":  ["MATCH_ODDS"],
        },
        "marketProjection": ["EVENT", "RUNNERS", "MARKET_START_TIME"],
        "maxResults":       200,
    })


def _list_market_book(market_ids: list[str]) -> list[dict]:
    return _jsonrpc("listMarketBook", {
        "marketIds":         market_ids,
        "priceProjection": {
            "priceData":         ["EX_BEST_OFFERS"],
            "exBestOffersOverrides": {
                "bestPricesDepth": 1,
                "rollupModel":     "STAKE",
                "rollupLimit":     0,
            },
        },
    })


# =============================================================================
# Fetch raw
# =============================================================================

def fetch_raw(force: bool = False) -> list[dict]:
    raw_cache = PROJECT_ROOT / "data" / "raw" / "_odds_betfair_raw.json"

    if raw_cache.exists() and not force:
        log.info("Using cached Betfair odds", path=str(raw_cache))
        import json
        return json.loads(raw_cache.read_text())

    log.stage("Fetching Betfair Exchange odds")

    try:
        _api_headers()
    except EnvironmentError as exc:
        log.warning("Betfair API key missing", error=str(exc))
        return []

    try:
        events = _list_events()
    except Exception as exc:
        log.warning("Betfair API unreachable — writing empty snapshot", error=str(exc)[:120])
        return []

    if not events:
        log.warning("No WC 2026 events found on Betfair yet")
        return []

    log.info("WC events found on Betfair", count=len(events))
    event_ids = [str(e["event"]["id"]) for e in events if "event" in e]

    markets = _list_market_catalogue(event_ids)
    if not markets:
        log.warning("No match-odds markets found for WC events")
        return []

    market_ids = [m["marketId"] for m in markets]
    market_books = _list_market_book(market_ids)

    catalogue_map = {m["marketId"]: m for m in markets}
    snapshot_ts   = datetime.now(timezone.utc)
    records: list[dict] = []

    runner_name_map = {1: "home_win", 2: "draw", 3: "away_win"}  # Betfair runner sort priority

    for book in market_books:
        market_id = book["marketId"]
        cat       = catalogue_map.get(market_id, {})
        event     = cat.get("event", {})
        home_raw  = event.get("name", "").split(" v ")[0].strip()
        away_raw  = event.get("name", "").split(" v ")[-1].strip() if " v " in event.get("name","") else ""

        for runner in book.get("runners", []):
            runner_id    = runner.get("selectionId")
            status       = runner.get("status", "")
            if status != "ACTIVE":
                continue

            ex = runner.get("ex", {})
            best_back = ex.get("availableToBack", [{}])[0] if ex.get("availableToBack") else {}
            best_lay  = ex.get("availableToLay",  [{}])[0] if ex.get("availableToLay")  else {}

            back_price = best_back.get("price")
            lay_price  = best_lay.get("price")

            # Determine outcome from runner sort priority
            sort_prio = runner.get("sortPriority", runner_id)
            outcome   = runner_name_map.get(sort_prio, f"runner_{sort_prio}")

            records.append({
                "snapshot_id":  str(uuid.uuid4())[:8],
                "timestamp":    snapshot_ts.isoformat(),
                "market_id":    market_id,
                "match_id":     None,
                "home_raw":     home_raw,
                "away_raw":     away_raw,
                "bookmaker":    "betfair",
                "market_type":  "match_winner",
                "outcome":      outcome,
                "back_price":   back_price,
                "lay_price":    lay_price,
                "decimal_odds": back_price,  # convention: use back price as decimal odds
                "is_opening":   False,
                "is_closing":   False,
            })

    raw_cache.parent.mkdir(parents=True, exist_ok=True)
    import json
    raw_cache.write_text(json.dumps(records, indent=2))
    log.success("Betfair odds fetched", records=len(records))
    return records


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(records: list[dict]) -> pd.DataFrame:
    if not records:
        log.info("No Betfair records — returning empty DataFrame")
        return pd.DataFrame(columns=[
            "snapshot_id","timestamp","match_id","bookmaker","market_type",
            "outcome","decimal_odds","back_price","lay_price","is_opening","is_closing",
        ])

    log.stage("Cleaning Betfair records")
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

    # Compute mid price (back+lay)/2 as a spread measure for the Volatility Gate
    df["back_price"] = pd.to_numeric(df["back_price"], errors="coerce")
    df["lay_price"]  = pd.to_numeric(df["lay_price"],  errors="coerce")
    df["mid_price"]  = (df["back_price"] + df["lay_price"]) / 2.0
    df["spread_pct"] = (df["lay_price"] - df["back_price"]) / df["mid_price"]

    log.success("Betfair clean complete", records=len(df))
    return df


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    cols = ["snapshot_id","timestamp","match_id","bookmaker","market_type","outcome",
            "decimal_odds","back_price","lay_price","mid_price","spread_pct",
            "is_opening","is_closing"]
    available = [c for c in cols if c in df.columns]
    out = df[available].copy()
    return out.sort_values(["match_id","outcome"]).reset_index(drop=True)


# =============================================================================
# Spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    if df.empty:
        log.info("Empty Betfair snapshot — expected pre-tournament")
        return

    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        if pd.notna(row.get("back_price")) and float(row["back_price"]) <= 1.0:
            errors.append(f"{row.get('outcome')}: back_price {row['back_price']} <= 1.0")
        if pd.notna(row.get("lay_price")) and pd.notna(row.get("back_price")):
            if float(row["lay_price"]) < float(row["back_price"]):
                errors.append(f"{row.get('outcome')}: lay < back ({row['lay_price']} < {row['back_price']})")

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
    log.stage("=== fetch_odds_betfair · Phase 2 Task 2.6c ===")

    records   = fetch_raw(force=force)
    cleaned   = clean_and_enrich(records)
    output_df = build_output(cleaned)

    log.stage("Spot-checking Betfair records")
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
    hasher.add_file(OUTPUT_PARQUET, label="odds_betfair")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_odds_betfair")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_odds_betfair complete", rows=len(output_df))
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Betfair Exchange back/lay prices for WC 2026.")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cache exists.")
    args = parser.parse_args()
    run(force=args.force)
