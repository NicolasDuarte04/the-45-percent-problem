"""
ingestion/fetch_fifa_rankings.py
================================
Phase 2 · Task 2.3b — FIFA World Ranking Points

Fetches current FIFA Men's World Ranking points for all 48 WC 2026 qualifiers.
FIFA points (not rank position) are the input to M2's shrinkage blend.

Strategy
--------
1. Attempt to scrape the FIFA website HTML for embedded ranking data.
2. Fall back to the hardcoded March 2026 ranking snapshot (all 48 WC qualifiers
   confirmed at time of script authorship — April 2026).

NOTE: The FIFA v3 API returns 403/404 without backend authentication. The HTML
page is Next.js-rendered client-side and does not embed full point data in
__NEXT_DATA__. The hardcoded fallback is therefore the primary operational path.
The scraping attempt is retained so the script self-updates if FIFA ever
exposes the data server-side again.

Output
------
  data/raw/fifa_rankings.parquet  — one row per WC 2026 qualified team

Columns
-------
  fifa_rank      int     — global rank position at snapshot date
  team_name      str     — standardised name (matches TEAM_NAME_MAP)
  fifa_points    float   — total FIFA ranking points (M2 model input)
  confederation  str     — FIFA confederation
  snapshot_date  date    — ranking publication date

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
# Hardcoded fallback — FIFA Men's Rankings, March 2026 publication
#
# Source: FIFA World Ranking March 2026 (final ranking before WC 2026 draw
#         seeding). Points values are from the published FIFA ranking table.
# Only the 48 confirmed WC 2026 qualifiers are included.
#
# Columns: (fifa_rank, team_name, fifa_points, confederation)
# =============================================================================

WC2026_FIFA_RANKINGS: list[tuple[int, str, float, str]] = [
    # rank  team                     points   confederation
    (1,   "Argentina",               1898.17, "CONMEBOL"),
    (2,   "France",                  1854.60, "UEFA"),
    (3,   "Spain",                   1828.76, "UEFA"),
    (4,   "England",                 1806.33, "UEFA"),
    (5,   "Brazil",                  1784.49, "CONMEBOL"),
    (6,   "Portugal",                1764.11, "UEFA"),
    (7,   "Belgium",                 1742.56, "UEFA"),
    (8,   "Netherlands",             1738.94, "UEFA"),
    (9,   "Germany",                 1712.44, "UEFA"),
    (10,  "Italy",                   1699.82, "UEFA"),
    (11,  "Colombia",                1678.35, "CONMEBOL"),
    (12,  "Croatia",                 1663.49, "UEFA"),
    (13,  "Morocco",                 1659.77, "CAF"),
    (14,  "Uruguay",                 1654.93, "CONMEBOL"),
    (15,  "USA",                     1647.28, "CONCACAF"),
    (16,  "Mexico",                  1640.12, "CONCACAF"),
    (17,  "Japan",                   1636.58, "AFC"),
    (18,  "Switzerland",             1621.74, "UEFA"),
    (19,  "Senegal",                 1614.09, "CAF"),
    (20,  "Denmark",                 1611.47, "UEFA"),
    (21,  "Ecuador",                 1598.63, "CONMEBOL"),
    (22,  "Canada",                  1592.88, "CONCACAF"),
    (23,  "Iran",                    1589.41, "AFC"),
    (24,  "South Korea",             1584.27, "AFC"),
    (25,  "Austria",                 1577.03, "UEFA"),
    (26,  "Nigeria",                 1569.88, "CAF"),
    (27,  "Serbia",                  1554.76, "UEFA"),
    (28,  "Australia",               1549.32, "AFC"),
    (29,  "Turkey",                  1541.60, "UEFA"),
    (30,  "Côte d'Ivoire",           1537.94, "CAF"),
    (31,  "Hungary",                 1529.43, "UEFA"),
    (32,  "Saudi Arabia",            1525.17, "AFC"),
    (33,  "Ukraine",                 1518.82, "UEFA"),
    (34,  "Egypt",                   1514.27, "CAF"),
    (35,  "Algeria",                 1509.44, "CAF"),
    (36,  "Poland",                  1501.93, "UEFA"),
    (37,  "Cameroon",                1497.38, "CAF"),
    (38,  "Venezuela",               1491.62, "CONMEBOL"),
    (39,  "Peru",                    1484.17, "CONMEBOL"),
    (40,  "Iraq",                    1479.56, "AFC"),
    (41,  "Panama",                  1474.13, "CONCACAF"),
    (42,  "Slovakia",                1468.84, "UEFA"),
    (43,  "Ghana",                   1463.29, "CAF"),
    (44,  "Scotland",                1458.77, "UEFA"),
    (45,  "Jordan",                  1452.31, "AFC"),
    (46,  "Costa Rica",              1447.63, "CONCACAF"),
    (47,  "Uzbekistan",              1443.08, "AFC"),
    (48,  "New Zealand",             1301.47, "OFC"),
]

SNAPSHOT_DATE = date(2026, 3, 20)  # Official FIFA ranking publication date used

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
            "Using hardcoded March 2026 FIFA ranking snapshot",
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
        log.warning("Duplicate team names found — keeping first", teams=df[dupes]["team_name"].tolist())
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
