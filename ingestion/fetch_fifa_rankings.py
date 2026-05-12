"""
ingestion/fetch_fifa_rankings.py
================================
Phase 2, Task 2.3b: FIFA World Ranking Points

Fetches current FIFA Men's World Ranking points for all 48 WC 2026 qualifiers.
FIFA points (not rank position) are the input to M2's shrinkage blend.

Strategy
--------
1. Attempt to scrape the FIFA website HTML for embedded ranking data.
2. Fall back to the hardcoded 2026-04-01 ranking snapshot (all 48 WC qualifiers
   present; see the WC2026_FIFA_RANKINGS comment block for provenance).

NOTE: The FIFA v3 API returns 403/404 without backend authentication. The HTML
page is Next.js-rendered client-side and does not embed full point data in
__NEXT_DATA__. The hardcoded fallback is therefore the primary operational path.
The scraping attempt is retained so the script self-updates if FIFA ever
exposes the data server-side again.

Output
------
  data/raw/fifa_rankings.parquet : one row per WC 2026 qualified team

Columns
-------
  fifa_rank      int     : global rank position at snapshot date
  team_name      str     : standardised name (matches TEAM_NAME_MAP)
  fifa_points    float   : total FIFA ranking points (M2 model input)
  confederation  str     : FIFA confederation
  snapshot_date  date    : ranking publication date

Run
---
  python ingestion/fetch_fifa_rankings.py
  python ingestion/fetch_fifa_rankings.py --force
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import yaml

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml") as _f:
    _cfg = yaml.safe_load(_f)

OUTPUT_PARQUET = PROJECT_ROOT / _cfg["data_sources"]["fifa_rankings"]["output_file"]
RAW_CACHE      = PROJECT_ROOT / "data" / "raw" / "_fifa_rankings_raw.json"
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

# =============================================================================
# Hardcoded fallback - FIFA Men's Rankings, 2026-04-01 publication
#
# Source: FIFA Men's World Ranking, publication of 2026-04-01 (the last
# scheduled publication before the WC 2026 opening match on 2026-06-11;
# next FIFA publication is 2026-06-10). The 48 WC 2026 qualifier rows
# below were extracted from the published FIFA ranking table on
# inside.fifa.com/fifa-world-ranking/men via a founder-supervised
# automated browser transcription (the FIFA page is Next.js client-
# rendered and not WebFetch-readable in HTML). The two transcription
# CSVs that originated this list are kept on disk for audit:
#   data/raw/fifa_rankings_2026-04-01_transcribed.csv            (ranks 1-80)
#   data/raw/fifa_rankings_2026-04-01_transcribed_extension.csv  (ranks 81-133)
# The data/raw/fifa_rankings.parquet.README.md documents the
# provenance, the top-15 rank cross-reference against FIFA's own news
# article, and the supersession of the prior synthetic snapshot.
#
# History note: the prior version of this list (sealed under the label
# "March 2026 publication") did not correspond to any real FIFA
# publication near the labelled date. The 2026-05-11 data-completeness
# audit caught this and produced the present list. See osf/amendments/
# amendment_v1.1_data_completeness.md (created in Section 2 of the
# 2026-05-11 lockdown).
#
# Columns: (fifa_rank, team_name, fifa_points, confederation)
# fifa_rank is the GLOBAL FIFA rank (not sequential within qualifiers).
# Only the 48 confirmed WC 2026 qualifiers are listed.
# =============================================================================

WC2026_FIFA_RANKINGS: list[tuple[int, str, float, str]] = [
    # rank  team                       points    confederation
    ( 1, "France",                     1877.32, "UEFA"),
    ( 2, "Spain",                      1876.40, "UEFA"),
    ( 3, "Argentina",                  1874.81, "CONMEBOL"),
    ( 4, "England",                    1825.97, "UEFA"),
    ( 5, "Portugal",                   1763.83, "UEFA"),
    ( 6, "Brazil",                     1761.16, "CONMEBOL"),
    ( 7, "Netherlands",                1757.87, "UEFA"),
    ( 8, "Morocco",                    1755.87, "CAF"),
    ( 9, "Belgium",                    1734.71, "UEFA"),
    (10, "Germany",                    1730.37, "UEFA"),
    (11, "Croatia",                    1717.07, "UEFA"),
    (13, "Colombia",                   1693.09, "CONMEBOL"),
    (14, "Senegal",                    1688.99, "CAF"),
    (15, "Mexico",                     1681.03, "CONCACAF"),
    (16, "USA",                        1673.13, "CONCACAF"),
    (17, "Uruguay",                    1673.07, "CONMEBOL"),
    (18, "Japan",                      1660.43, "AFC"),
    (19, "Switzerland",                1649.40, "UEFA"),
    (21, "Iran",                       1615.30, "AFC"),
    (22, "Turkey",                     1599.04, "UEFA"),
    (23, "Ecuador",                    1594.78, "CONMEBOL"),
    (24, "Austria",                    1593.45, "UEFA"),
    (25, "South Korea",                1588.66, "AFC"),
    (27, "Australia",                  1580.67, "AFC"),
    (28, "Algeria",                    1564.26, "CAF"),
    (29, "Egypt",                      1563.24, "CAF"),
    (30, "Canada",                     1556.48, "CONCACAF"),
    (31, "Norway",                     1550.94, "UEFA"),
    (33, "Panama",                     1540.64, "CONCACAF"),
    (34, "Côte d'Ivoire",              1532.98, "CAF"),
    (38, "Sweden",                     1514.77, "UEFA"),
    (40, "Paraguay",                   1503.50, "CONMEBOL"),
    (41, "Czechia",                    1501.38, "UEFA"),
    (43, "Scotland",                   1498.35, "UEFA"),
    (44, "Tunisia",                    1483.05, "CAF"),
    (46, "DR Congo",                   1478.35, "CAF"),
    (50, "Uzbekistan",                 1465.34, "AFC"),
    (55, "Qatar",                      1454.96, "AFC"),
    (57, "Iraq",                       1447.14, "AFC"),
    (60, "South Africa",               1429.73, "CAF"),
    (61, "Saudi Arabia",               1421.43, "AFC"),
    (63, "Jordan",                     1391.45, "AFC"),
    (65, "Bosnia & Herzegovina",       1385.84, "UEFA"),
    (69, "Cape Verde",                 1366.13, "CAF"),
    (74, "Ghana",                      1346.31, "CAF"),
    (82, "Curaçao",                    1294.65, "CONCACAF"),
    (83, "Haiti",                      1291.71, "CONCACAF"),
    (85, "New Zealand",                1281.57, "OFC"),
]

SNAPSHOT_DATE = date(2026, 4, 1)  # FIFA publication date the list above reflects

# =============================================================================
# Fetch (scraping attempt + fallback)
# =============================================================================

def _try_scrape_fifa() -> pd.DataFrame | None:
    """
    Attempt to scrape the FIFA ranking page.
    Returns a DataFrame if successful, None otherwise.
    The FIFA website is Next.js-rendered; data is fetched client-side via
    an authenticated API, so this almost always returns None in practice.
    """
    try:
        import requests
        from bs4 import BeautifulSoup

        resp = requests.get(
            "https://www.fifa.com/fifa-world-ranking/men",
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
            timeout=20,
        )
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        # Look for a table or JSON script containing ranking points
        tables = soup.find_all("table")
        for table in tables:
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            if any("point" in h.lower() for h in headers):
                rows = []
                for tr in table.find_all("tr")[1:]:
                    cells = [td.get_text(strip=True) for td in tr.find_all("td")]
                    if len(cells) >= 3:
                        rows.append(cells)
                if rows:
                    df = pd.DataFrame(rows, columns=headers[:len(rows[0])])
                    log.info("FIFA table scrape succeeded", rows=len(df))
                    return df

    except Exception as exc:
        log.info("FIFA scrape attempt failed (expected)", error=str(exc)[:100])

    return None


def fetch_raw(force: bool = False) -> pd.DataFrame:
    if RAW_CACHE.exists() and not force:
        log.info("Using cached FIFA rankings", path=str(RAW_CACHE))
        return pd.read_json(RAW_CACHE, orient="records")

    log.stage("Fetching FIFA rankings (scrape attempt then hardcoded fallback)")

    df = _try_scrape_fifa()
    if df is None:
        log.info(
            "Using hardcoded 2026-04-01 FIFA ranking snapshot",
            teams=len(WC2026_FIFA_RANKINGS),
            snapshot_date=str(SNAPSHOT_DATE),
        )
        df = pd.DataFrame(
            WC2026_FIFA_RANKINGS,
            columns=["fifa_rank", "team_name", "fifa_points", "confederation"],
        )

    # Cache as JSON for reproducibility
    RAW_CACHE.parent.mkdir(parents=True, exist_ok=True)
    df.to_json(RAW_CACHE, orient="records", indent=2)
    log.success("FIFA rankings cached", path=str(RAW_CACHE), rows=len(df))
    return df


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(df: pd.DataFrame) -> pd.DataFrame:
    log.stage("Cleaning FIFA rankings")

    df = df.copy()
    df["fifa_rank"]   = df["fifa_rank"].astype(int)
    df["fifa_points"] = pd.to_numeric(df["fifa_points"], errors="coerce")
    df["snapshot_date"] = SNAPSHOT_DATE

    before = len(df)
    df = df.dropna(subset=["fifa_points"])
    if before - len(df):
        log.warning("Rows dropped due to unparseable points", count=before - len(df))

    dupes = df.duplicated(subset="team_name")
    if dupes.any():
        log.warning("Duplicate team names found; keeping first", teams=df[dupes]["team_name"].tolist())
        df = df.drop_duplicates(subset="team_name", keep="first")

    log.success(
        "FIFA rankings clean",
        teams=len(df),
        top_team=df.iloc[0]["team_name"],
        top_points=float(df.iloc[0]["fifa_points"]),
    )
    return df


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "fifa_rank":     df["fifa_rank"].astype(int),
        "team_name":     df["team_name"],
        "fifa_points":   df["fifa_points"].round(2),
        "confederation": df["confederation"],
        "snapshot_date": pd.to_datetime(df["snapshot_date"]),
    })
    return out.sort_values("fifa_rank").reset_index(drop=True)


# =============================================================================
# Schema spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    """Check fifa_points > 0, rank >= 1, confederation in known set."""
    valid_confs = {"UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"}
    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        if row["fifa_points"] <= 0:
            errors.append(f"{row['team_name']}: points {row['fifa_points']} <= 0")
        if row["fifa_rank"] < 1:
            errors.append(f"{row['team_name']}: rank {row['fifa_rank']} < 1")
        if row["confederation"] not in valid_confs:
            errors.append(f"{row['team_name']}: unknown confederation {row['confederation']!r}")

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
    log.stage("=== fetch_fifa_rankings · Phase 2 Task 2.3b ===")

    raw_df     = fetch_raw(force=force)
    cleaned_df = clean_and_enrich(raw_df)
    output_df  = build_output(cleaned_df)

    log.stage("Spot-checking FIFA ranking records")
    _validate_sample(output_df)

    OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")
    log.success(
        "Parquet written",
        path=str(OUTPUT_PARQUET),
        rows=len(output_df),
        size_kb=round(OUTPUT_PARQUET.stat().st_size / 1024, 1),
    )

    hasher = DataSnapshotHasher()
    hasher.add_file(OUTPUT_PARQUET, label="fifa_rankings")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_fifa_rankings")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_fifa_rankings complete", output=str(OUTPUT_PARQUET), teams=len(output_df))
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch FIFA Men's World Ranking points for WC 2026 qualifiers."
    )
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cache exists.")
    args = parser.parse_args()
    run(force=args.force)
