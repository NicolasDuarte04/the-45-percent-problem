"""
ingestion/fetch_odds_polymarket.py
===================================
Phase 2 · Task 2.6b — Polymarket Odds & Volume

Fetches de-vigged market prices and 24-hour volume for WC 2026 match markets
on Polymarket. Volume is a Volatility Gate trigger (floor: $50,000/24h per
config.yaml).

Polymarket API: Gamma API at https://gamma-api.polymarket.com (no auth needed)
Clob API:       https://clob.polymarket.com (for order book / last price)

The script:
  1. Searches Gamma API for active soccer / World Cup markets
  2. Extracts best ask price (= implied probability) per outcome
  3. Stores 24h volume alongside price
  4. Logs a Volatility Gate warning when volume < threshold

Run
---
  python ingestion/fetch_odds_polymarket.py
  python ingestion/fetch_odds_polymarket.py --force
"""

from __future__ import annotations

import argparse
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import yaml

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml") as _f:
    _cfg = yaml.safe_load(_f)

OUTPUT_PARQUET    = PROJECT_ROOT / _cfg["data_sources"]["odds_polymarket"]["output_file"]
GAMMA_BASE        = _cfg["data_sources"]["odds_polymarket"]["base_url"]
SNAPSHOT_REG      = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"
VOLUME_FLOOR      = float(_cfg["volatility_gate"]["polymarket_min_volume_usd"])


# =============================================================================
# API helpers
# =============================================================================

@retry(
    retry=retry_if_exception_type(requests.exceptions.RequestException),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _gamma_get(path: str, params: dict | None = None) -> list | dict:
    url = GAMMA_BASE.rstrip("/") + "/" + path.lstrip("/")
    resp = requests.get(url, params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


# =============================================================================
# Fetch raw
# =============================================================================

def fetch_raw(force: bool = False) -> list[dict]:
    raw_cache = PROJECT_ROOT / "data" / "raw" / "_odds_polymarket_raw.json"

    if raw_cache.exists() and not force:
        log.info("Using cached Polymarket odds", path=str(raw_cache))
        import json
        return json.loads(raw_cache.read_text())

    log.stage("Fetching Polymarket odds")

    try:
        # Search for World Cup or soccer markets
        markets = _gamma_get("/markets", {
            "active": "true",
            "closed": "false",
            "tag_slug": "sports",
            "limit": 500,
        })
    except Exception as exc:
        log.warning("Polymarket Gamma API unreachable", error=str(exc)[:120])
        return []

    if not markets:
        log.warning("No active Polymarket markets found")
        return []

    # Filter to World Cup / soccer markets
    wc_markets = [
        m for m in (markets if isinstance(markets, list) else markets.get("markets", []))
        if any(kw in str(m.get("question", "")).lower() for kw in
               ["world cup", "wc2026", "2026 fifa", "fifa 2026"])
    ]

    if not wc_markets:
        log.warning("No WC 2026 markets found on Polymarket yet — lines may not be live")
        return []

    log.info("WC 2026 Polymarket markets found", count=len(wc_markets))
    snapshot_ts = datetime.now(timezone.utc)
    records: list[dict] = []

    for market in wc_markets:
        market_id     = market.get("id", "")
        question      = market.get("question", "")
        volume_24h    = float(market.get("volume24hr", 0) or 0)
        tokens        = market.get("tokens", [])

        if volume_24h < VOLUME_FLOOR:
            log.warning(
                "Polymarket market below volume floor",
                market=question[:60],
                volume_24h=volume_24h,
                floor=VOLUME_FLOOR,
            )

        for token in tokens:
            outcome  = token.get("outcome", "")
            price    = token.get("price")  # 0–1 probability
            if price is None:
                continue

            # Convert Polymarket probability to decimal odds
            if float(price) > 0:
                decimal_odds = round(1.0 / float(price), 4)
            else:
                decimal_odds = None

            records.append({
                "snapshot_id":     str(uuid.uuid4())[:8],
                "timestamp":       snapshot_ts.isoformat(),
                "market_id":       market_id,
                "match_id":        None,  # resolved in clean_and_enrich if possible
                "question":        question,
                "bookmaker":       "polymarket",
                "market_type":     "match_winner",
                "outcome":         outcome,
                "decimal_odds":    decimal_odds,
                "devigged_prob":   float(price),
                "volume_24h_usd":  volume_24h,
                "is_opening":      False,  # Polymarket is continuous; no opening/closing distinction
                "is_closing":      False,
            })

    raw_cache.parent.mkdir(parents=True, exist_ok=True)
    import json
    raw_cache.write_text(json.dumps(records, indent=2))
    log.success("Polymarket odds fetched", records=len(records))
    return records


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(records: list[dict]) -> pd.DataFrame:
    if not records:
        log.info("No Polymarket records — returning empty DataFrame")
        return pd.DataFrame(columns=[
            "snapshot_id", "timestamp", "match_id", "bookmaker", "market_type",
            "outcome", "decimal_odds", "devigged_prob", "volume_24h_usd",
            "is_opening", "is_closing",
        ])

    log.stage("Cleaning Polymarket records")
    df = pd.DataFrame(records)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.dropna(subset=["decimal_odds"])
    df["decimal_odds"] = df["decimal_odds"].astype(float)

    # Flag markets below volume threshold
    low_vol = df[df["volume_24h_usd"] < VOLUME_FLOOR]
    if not low_vol.empty:
        log.warning(
            "Records below Volatility Gate volume floor",
            count=len(low_vol),
            floor_usd=VOLUME_FLOOR,
        )

    log.success("Polymarket clean complete", records=len(df))
    return df


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    cols = ["snapshot_id","timestamp","match_id","bookmaker","market_type",
            "outcome","decimal_odds","devigged_prob","volume_24h_usd",
            "is_opening","is_closing"]
    available = [c for c in cols if c in df.columns]
    out = df[available].copy()
    return out.sort_values(["match_id","outcome"]).reset_index(drop=True)


# =============================================================================
# Spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    if df.empty:
        log.info("Empty Polymarket snapshot — expected pre-tournament")
        return

    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        if pd.notna(row.get("devigged_prob")) and not (0.0 <= float(row["devigged_prob"]) <= 1.0):
            errors.append(f"{row.get('outcome')}: devigged_prob {row['devigged_prob']} out of [0,1]")
        if pd.notna(row.get("decimal_odds")) and float(row["decimal_odds"]) <= 1.0:
            errors.append(f"{row.get('outcome')}: decimal_odds {row['decimal_odds']} <= 1.0")

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
    log.stage("=== fetch_odds_polymarket · Phase 2 Task 2.6b ===")

    records   = fetch_raw(force=force)
    cleaned   = clean_and_enrich(records)
    output_df = build_output(cleaned)

    log.stage("Spot-checking Polymarket records")
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
    hasher.add_file(OUTPUT_PARQUET, label="odds_polymarket")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_odds_polymarket")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_odds_polymarket complete", rows=len(output_df))
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Polymarket WC 2026 odds and volume.")
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cache exists.")
    args = parser.parse_args()
    run(force=args.force)
