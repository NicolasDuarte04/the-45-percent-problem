"""
ingestion/fetch_historical_matches.py
======================================
Phase 2 · Task 2.2 — Historical Match Results

Downloads Mart Jürisoo's open international football results dataset and
filters it to the exact calibration corpus defined in Framework Blueprint v1.0:

  Calibration set  : World Cups 2010, 2014, 2018
                     UEFA Euro 2020/2024
                     Copa América 2021/2024
                     Africa Cup of Nations 2021/2023
                     AFC Asian Cup 2023

  Hold-out set     : FIFA World Cup 2022  (used for M★ selection)

Output
------
  data/raw/historical_matches.parquet   — validated Match records
  data/raw/historical_matches_stats.txt — summary printed to console + file

Run
---
  python ingestion/fetch_historical_matches.py

  # Force re-download even if cache exists:
  python ingestion/fetch_historical_matches.py --force
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

# ── Project root on sys.path so we can import utils / schemas ─────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)

# =============================================================================
# Constants
# =============================================================================

SOURCE_URL = (
    "https://raw.githubusercontent.com/martj42/international_results"
    "/master/results.csv"
)
RAW_CSV_CACHE  = PROJECT_ROOT / "data" / "raw" / "_historical_matches_raw.csv"
OUTPUT_PARQUET = PROJECT_ROOT / "data" / "raw" / "historical_matches.parquet"
STATS_FILE     = PROJECT_ROOT / "data" / "raw" / "historical_matches_stats.txt"
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

# =============================================================================
# Tournament filter
# =============================================================================

# Each entry: (dataset_tournament_name, date_start, date_end, canonical_name, is_holdout)
TOURNAMENT_WINDOWS = [
    # ── World Cups (calibration) ──────────────────────────────────────────────
    ("FIFA World Cup", "2010-06-11", "2010-07-11", "FIFA World Cup 2010",  False),
    ("FIFA World Cup", "2014-06-12", "2014-07-13", "FIFA World Cup 2014",  False),
    ("FIFA World Cup", "2018-06-14", "2018-07-15", "FIFA World Cup 2018",  False),
    # ── Hold-out set ──────────────────────────────────────────────────────────
    ("FIFA World Cup", "2022-11-20", "2022-12-18", "FIFA World Cup 2022",  True),
    # ── Continental tournaments ───────────────────────────────────────────────
    ("UEFA Euro",              "2020-06-11", "2021-07-11", "UEFA Euro 2020",             False),
    ("UEFA Euro",              "2024-06-14", "2024-07-14", "UEFA Euro 2024",             False),
    ("Copa América",           "2021-06-13", "2021-07-10", "Copa America 2021",          False),
    ("Copa América",           "2024-06-20", "2024-07-14", "Copa America 2024",          False),
    ("Africa Cup of Nations",  "2021-01-09", "2022-02-06", "Africa Cup of Nations 2021", False),
    ("Africa Cup of Nations",  "2023-01-13", "2024-02-11", "Africa Cup of Nations 2023", False),
    ("AFC Asian Cup",          "2023-01-12", "2024-02-10", "AFC Asian Cup 2023",         False),
]

# =============================================================================
# Team name standardisation
# =============================================================================

# Maps dataset team names → standardised display names
# (full ISO mapping is done in a later preprocessing step;
#  this handles known inconsistencies in the raw dataset)
TEAM_NAME_MAP: dict = {
    # Americas
    "United States":                "USA",
    "USA":                          "USA",
    "Trinidad and Tobago":          "Trinidad and Tobago",
    "Korea Republic":               "South Korea",
    "Republic of Korea":            "South Korea",
    "South Korea":                  "South Korea",
    "Korea DPR":                    "North Korea",
    "Democratic People's Republic of Korea": "North Korea",
    "IR Iran":                      "Iran",
    "Islamic Republic of Iran":     "Iran",
    "China PR":                     "China",
    "China":                        "China",
    "Bosnia and Herzegovina":       "Bosnia & Herzegovina",
    "Bosnia-Herzegovina":           "Bosnia & Herzegovina",
    "Ivory Coast":                  "Côte d'Ivoire",
    "Cote d'Ivoire":                "Côte d'Ivoire",
    "Cape Verde Islands":           "Cape Verde",
    "Cape Verde":                   "Cape Verde",
    "Cabo Verde":                   "Cape Verde",
    "Congo DR":                     "DR Congo",
    "Democratic Republic of the Congo": "DR Congo",
    "DR Congo":                     "DR Congo",
    "Republic of Ireland":          "Ireland",
    "Northern Ireland":             "Northern Ireland",
    "Czech Republic":               "Czechia",
    "Czechia":                      "Czechia",
    "North Macedonia":              "North Macedonia",
    "Republic of North Macedonia":  "North Macedonia",
    "Saint Kitts and Nevis":        "St. Kitts & Nevis",
    "Trinidad & Tobago":            "Trinidad and Tobago",
    "Equatorial Guinea":            "Equatorial Guinea",
    "São Tomé and Príncipe":        "São Tomé & Príncipe",
    "Chinese Taipei":               "Chinese Taipei",
    "Kyrgyz Republic":              "Kyrgyzstan",
    "FYR Macedonia":                "North Macedonia",
    "Eswatini":                     "Eswatini",
    "Swaziland":                    "Eswatini",
    "Türkiye":                      "Turkey",
}


def standardise_team(name: str) -> str:
    """Return a cleaned, standardised team name."""
    return TEAM_NAME_MAP.get(name.strip(), name.strip())


# =============================================================================
# Fetch raw CSV
# =============================================================================

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _download_csv(url: str) -> str:
    """Download the CSV and return its text content, with up to 3 retries."""
    log.info("Downloading raw dataset", url=url)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def fetch_raw(force: bool = False) -> pd.DataFrame:
    """
    Return the full raw dataset as a DataFrame.
    Uses a local cache in data/raw/ to avoid repeated downloads.
    """
    if RAW_CSV_CACHE.exists() and not force:
        log.info("Using cached raw CSV", path=str(RAW_CSV_CACHE))
        return pd.read_csv(RAW_CSV_CACHE)

    log.stage("Downloading raw international match results")
    text = _download_csv(SOURCE_URL)
    RAW_CSV_CACHE.parent.mkdir(parents=True, exist_ok=True)
    RAW_CSV_CACHE.write_text(text, encoding="utf-8")
    log.success("Raw CSV saved", path=str(RAW_CSV_CACHE))

    df = pd.read_csv(RAW_CSV_CACHE)
    log.info("Raw dataset loaded", total_rows=len(df))
    return df


# =============================================================================
# Filter to calibration corpus
# =============================================================================

def filter_to_calibration_corpus(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the tournament windows defined in TOURNAMENT_WINDOWS.
    Returns a DataFrame with added columns:
      - canonical_tournament : our standard tournament name
      - is_holdout           : True for 2022 WC
    """
    df["date"] = pd.to_datetime(df["date"])
    frames = []

    for raw_name, start, end, canonical, holdout in TOURNAMENT_WINDOWS:
        start_dt = pd.Timestamp(start)
        end_dt   = pd.Timestamp(end)

        # The dataset uses slightly different tournament name spellings across
        # editions — use a case-insensitive partial match
        name_mask = df["tournament"].str.contains(
            raw_name, case=False, na=False, regex=False
        )
        date_mask = (df["date"] >= start_dt) & (df["date"] <= end_dt)
        subset = df[name_mask & date_mask].copy()

        if len(subset) == 0:
            log.warning(
                "No matches found for tournament window",
                tournament=canonical,
                start=start,
                end=end,
            )
            continue

        subset["canonical_tournament"] = canonical
        subset["is_holdout"] = holdout
        frames.append(subset)
        log.info(
            "Loaded tournament",
            tournament=canonical,
            matches=len(subset),
            holdout=holdout,
        )

    if not frames:
        raise RuntimeError("No matches matched any tournament window — check the dataset.")

    return pd.concat(frames, ignore_index=True)


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardise team names, build match_id, infer neutral venue, add metadata.
    """
    log.stage("Cleaning and enriching match records")

    # ── Standardise team names ────────────────────────────────────────────────
    df["home_team"] = df["home_team"].apply(standardise_team)
    df["away_team"] = df["away_team"].apply(standardise_team)

    # ── Build deterministic match_id ──────────────────────────────────────────
    df["match_id"] = (
        df["date"].dt.strftime("%Y-%m-%d")
        + "_"
        + df["home_team"].str.replace(" ", "_", regex=False)
        + "_"
        + df["away_team"].str.replace(" ", "_", regex=False)
    )

    # ── Handle neutral venue ──────────────────────────────────────────────────
    # Dataset has a 'neutral' column (True/False)
    if "neutral" in df.columns:
        df["neutral_venue"] = df["neutral"].astype(bool)
    else:
        df["neutral_venue"] = False

    # ── Scores ────────────────────────────────────────────────────────────────
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")

    # ── Stage inference ───────────────────────────────────────────────────────
    # The Jürisoo dataset does not tag stage directly.
    # We default to GROUP_STAGE; a separate enrichment step can refine this
    # using Wikipedia/official fixture lists for knockout rounds.
    df["stage"] = "Group Stage"

    # ── Extra time / penalties ────────────────────────────────────────────────
    # Not available in this dataset; set to None
    df["extra_time"]     = None
    df["penalties"]      = None
    df["penalty_winner"] = None

    # ── Host country ─────────────────────────────────────────────────────────
    host_map = {
        "FIFA World Cup 2010":           "ZAF",
        "FIFA World Cup 2014":           "BRA",
        "FIFA World Cup 2018":           "RUS",
        "FIFA World Cup 2022":           "QAT",
        "UEFA Euro 2020":                "EUR",  # Multi-host
        "UEFA Euro 2024":                "DEU",
        "Copa America 2021":             "BRA",
        "Copa America 2024":             "USA",
        "Africa Cup of Nations 2021":    "CMR",
        "Africa Cup of Nations 2023":    "CIV",
        "AFC Asian Cup 2023":            "QAT",
    }
    df["host_country"] = df["canonical_tournament"].map(host_map)

    # ── Deduplicate (safety check) ────────────────────────────────────────────
    before = len(df)
    df = df.drop_duplicates(subset="match_id", keep="first")
    dupes = before - len(df)
    if dupes > 0:
        log.warning("Removed duplicate match_ids", count=dupes)

    log.success(
        "Cleaning complete",
        total_matches=len(df),
        holdout_matches=int(df["is_holdout"].sum()),
        calibration_matches=int((~df["is_holdout"]).sum()),
    )
    return df


# =============================================================================
# Build output DataFrame
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    """Select and rename columns to match our schema."""
    out = pd.DataFrame({
        "match_id":          df["match_id"],
        "date":              df["date"].dt.tz_localize("UTC"),
        "tournament":        df["canonical_tournament"],
        "stage":             df["stage"],
        "team_home":         df["home_team"],
        "team_away":         df["away_team"],
        "score_home":        df["home_score"].astype("Int64"),
        "score_away":        df["away_score"].astype("Int64"),
        "neutral_venue":     df["neutral_venue"],
        "host_country":      df["host_country"],
        "extra_time":        df["extra_time"],
        "penalties":         df["penalties"],
        "penalty_winner":    df["penalty_winner"],
        "is_holdout":        df["is_holdout"],
    })
    return out.sort_values(["date", "match_id"]).reset_index(drop=True)


# =============================================================================
# Stats report
# =============================================================================

def print_stats(df: pd.DataFrame) -> str:
    """Print a detailed summary and return it as a string."""
    lines = [
        "=" * 62,
        "  Historical Matches — Ingestion Report",
        f"  Generated : {datetime.now(timezone.utc).isoformat()}",
        "=" * 62,
        f"  Total matches         : {len(df):>6,}",
        f"  Calibration matches   : {int((~df['is_holdout']).sum()):>6,}",
        f"  Hold-out (2022 WC)    : {int(df['is_holdout'].sum()):>6,}",
        f"  Date range            : {df['date'].min().date()} → {df['date'].max().date()}",
        "",
        "  Matches per tournament:",
    ]
    for t, grp in df.groupby("tournament"):
        holdout_flag = "  [HOLD-OUT]" if grp["is_holdout"].any() else ""
        lines.append(f"    {t:<42} {len(grp):>4}{holdout_flag}")

    lines += [
        "",
        "  Unique teams  : " + str(
            len(set(df["team_home"].tolist() + df["team_away"].tolist()))
        ),
        "  Missing scores: " + str(
            int(df["score_home"].isna().sum() + df["score_away"].isna().sum())
        ),
        "=" * 62,
    ]
    report = "\n".join(lines)
    print(report)
    return report


# =============================================================================
# Main
# =============================================================================

def run(force: bool = False) -> Path:
    """
    Full ingestion pipeline. Returns the path to the output Parquet file.

    Args:
        force: If True, re-download the raw CSV even if a cache exists.
    """
    log.stage("=== fetch_historical_matches · Phase 2 Task 2.2 ===")

    # 1. Fetch
    raw_df = fetch_raw(force=force)

    # 2. Filter
    log.stage("Filtering to calibration corpus")
    filtered_df = filter_to_calibration_corpus(raw_df)

    # 3. Clean & enrich
    cleaned_df = clean_and_enrich(filtered_df)

    # 4. Build output
    output_df = build_output(cleaned_df)

    # 5. Validate a sample against the Match schema
    #    (We validate 5 random rows to catch schema regressions without
    #    paying the cost of validating all ~700 rows on every run)
    log.stage("Spot-checking records against Match schema")
    _validate_sample(output_df)

    # 6. Write Parquet
    OUTPUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    output_df.to_parquet(OUTPUT_PARQUET, index=False, engine="pyarrow")
    log.success(
        "Parquet written",
        path=str(OUTPUT_PARQUET),
        rows=len(output_df),
        size_kb=round(OUTPUT_PARQUET.stat().st_size / 1024, 1),
    )

    # 7. Hash & register snapshot
    hasher = DataSnapshotHasher()
    hasher.add_file(OUTPUT_PARQUET, label="historical_matches")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_historical_matches")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    # 8. Stats report
    report = print_stats(output_df)
    STATS_FILE.write_text(report, encoding="utf-8")

    log.success("fetch_historical_matches complete", output=str(OUTPUT_PARQUET))
    return OUTPUT_PARQUET


def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    """Validate n random rows against the Match schema."""
    try:
        from schemas import Match  # type: ignore[import]
    except ImportError:
        log.warning("schemas.py not importable — skipping schema validation")
        return

    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        try:
            Match(
                match_id=str(row["match_id"]),
                date=row["date"],
                tournament=str(row["tournament"]),
                stage=row["stage"],
                team_home=str(row["team_home"]),
                team_away=str(row["team_away"]),
                score_home=None if pd.isna(row["score_home"]) else int(row["score_home"]),
                score_away=None if pd.isna(row["score_away"]) else int(row["score_away"]),
                neutral_venue=bool(row["neutral_venue"]),
                is_holdout=bool(row["is_holdout"]),
            )
        except Exception as e:
            errors.append(f"{row['match_id']}: {e}")

    if errors:
        log.warning("Schema validation issues in sample", count=len(errors))
        for err in errors:
            log.warning("  " + err)
    else:
        log.success(f"Schema validation passed on {len(sample)} sample rows")


# =============================================================================
# CLI entry point
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch and filter historical international match results."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download of the raw CSV even if a local cache exists.",
    )
    args = parser.parse_args()
    run(force=args.force)
