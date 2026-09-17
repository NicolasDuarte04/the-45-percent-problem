"""
ingestion/fetch_macro_data.py
=============================
Phase 2 · Task 2.4 — Hoffmann-HGR Macro Variables for M3

Assembles the macro-economic and structural variables used by M3's Bayesian
prior. Based on Hoffmann, Ging & Ramasamy (2002) — the 55%-explaining variables
from which the project name derives.

Variables (one row per WC 2026 qualified team)
------
  log_gdp_per_capita       float  — log(GDP per capita USD, most recent year)
  log_population           float  — log(total population, most recent year)
  mean_temp_celsius        float  — 30-year mean annual temperature (°C)
  is_host                  bool   — True for USA, MEX, CAN
  football_culture_index   float  — decay-weighted WC appearances since 1960
  wc_appearances           int    — raw WC appearance count since 1960
  gdp_per_capita           float  — GDP per capita USD (before log transform)
  population               float  — total population (before log transform)
  snapshot_date            date

Sources
-------
  GDP/capita & population : World Bank API (live; most recent year available)
  Temperature             : 30-year climate normals (1991–2020), hardcoded
                            from World Bank Climate Knowledge Portal and
                            National Meteorological Services
  WC appearances          : FIFA official records, hardcoded, 1962–2022

Run
---
  python ingestion/fetch_macro_data.py
  python ingestion/fetch_macro_data.py --force
"""

from __future__ import annotations

import argparse
import math
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import yaml

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml") as _f:
    _cfg = yaml.safe_load(_f)

OUTPUT_PARQUET = PROJECT_ROOT / _cfg["data_sources"]["macro_data"]["output_file"]
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"
CULTURE_DECAY  = float(_cfg["macro"]["culture_decay_years"])

WC_HOSTS_2026 = set(_cfg["project"]["hosts"])  # {"USA", "MEX", "CAN"}

# =============================================================================
# WC 2026 Qualified Teams — ISO alpha-3 to canonical team name
# (matches TEAM_NAME_MAP in fetch_historical_matches.py)
# =============================================================================

TEAM_ISO3: dict[str, str] = {
    "ARG": "Argentina",       "FRA": "France",
    "ESP": "Spain",           "ENG": "England",
    "BRA": "Brazil",          "PRT": "Portugal",
    "BEL": "Belgium",         "NLD": "Netherlands",
    "DEU": "Germany",         "ITA": "Italy",
    "COL": "Colombia",        "HRV": "Croatia",
    "MAR": "Morocco",         "URY": "Uruguay",
    "USA": "USA",             "MEX": "Mexico",
    "JPN": "Japan",           "CHE": "Switzerland",
    "SEN": "Senegal",         "DNK": "Denmark",
    "ECU": "Ecuador",         "CAN": "Canada",
    "IRN": "Iran",            "KOR": "South Korea",
    "AUT": "Austria",         "NGA": "Nigeria",
    "SRB": "Serbia",          "AUS": "Australia",
    "TUR": "Turkey",          "CIV": "Côte d'Ivoire",
    "HUN": "Hungary",         "SAU": "Saudi Arabia",
    "UKR": "Ukraine",         "EGY": "Egypt",
    "DZA": "Algeria",         "POL": "Poland",
    "CMR": "Cameroon",        "VEN": "Venezuela",
    "PER": "Peru",            "IRQ": "Iraq",
    "PAN": "Panama",          "SVK": "Slovakia",
    "GHA": "Ghana",           "SCO": "Scotland",
    "JOR": "Jordan",          "CRI": "Costa Rica",
    "UZB": "Uzbekistan",      "NZL": "New Zealand",
}

# Scotland uses GBR stats (World Bank doesn't have Scotland separately)
# England uses GBR stats
ISO3_WB_OVERRIDE: dict[str, str] = {
    "SCO": "GBR",
    "ENG": "GBR",
}

# =============================================================================
# Mean annual temperature (°C) — 1991-2020 climate normals
# Source: World Bank Climate Knowledge Portal, national meteorological records
# =============================================================================

MEAN_TEMP_C: dict[str, float] = {
    "ARG": 18.7,   "FRA": 11.7,   "ESP": 14.4,   "ENG": 9.6,
    "BRA": 25.0,   "PRT": 16.3,   "BEL": 10.5,   "NLD": 10.7,
    "DEU": 9.5,    "ITA": 13.8,   "COL": 24.1,   "HRV": 12.6,
    "MAR": 19.5,   "URY": 17.4,   "USA": 12.0,   "MEX": 21.5,
    "JPN": 14.0,   "CHE": 8.8,    "SEN": 27.6,   "DNK": 8.1,
    "ECU": 21.0,   "CAN": 1.3,    "IRN": 17.5,   "KOR": 12.5,
    "AUT": 8.0,    "NGA": 27.1,   "SRB": 11.7,   "AUS": 21.6,
    "TUR": 12.0,   "CIV": 26.9,   "HUN": 11.0,   "SAU": 25.5,
    "UKR": 8.7,    "EGY": 22.4,   "DZA": 22.0,   "POL": 8.5,
    "CMR": 24.9,   "VEN": 26.3,   "PER": 20.0,   "IRQ": 22.4,
    "PAN": 26.8,   "SVK": 9.3,    "GHA": 27.0,   "SCO": 8.1,
    "JOR": 17.5,   "CRI": 22.5,   "UZB": 14.0,   "NZL": 12.8,
}

# =============================================================================
# WC Appearances per team since 1962 (inclusive)
# Source: FIFA World Cup official records
# =============================================================================

WC_YEARS = [1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998,
            2002, 2006, 2010, 2014, 2018, 2022]

WC_APPEARANCES: dict[str, list[int]] = {
    "ARG": [1962,1966,1974,1978,1982,1986,1990,1994,1998,2002,2006,2010,2014,2018,2022],
    "FRA": [1966,1978,1982,1986,1998,2002,2006,2010,2014,2018,2022],
    "ESP": [1962,1966,1978,1982,1986,1990,1994,1998,2002,2006,2010,2014,2018,2022],
    "ENG": [1962,1966,1970,1982,1986,1990,1998,2002,2006,2010,2014,2018,2022],
    "BRA": [1962,1966,1970,1974,1978,1982,1986,1990,1994,1998,2002,2006,2010,2014,2018,2022],
    "PRT": [1966,1986,2002,2006,2010,2014,2018,2022],
    "BEL": [1970,1982,1986,1990,1994,1998,2002,2014,2018,2022],
    "NLD": [1974,1978,1990,1994,1998,2002,2006,2010,2014,2022],
    "DEU": [1962,1966,1970,1974,1978,1982,1986,1990,1994,1998,2002,2006,2010,2014,2018,2022],
    "ITA": [1962,1966,1970,1974,1978,1982,1986,1990,1994,1998,2002,2006,2010,2014,2022],
    "COL": [1962,1990,1994,1998,2014,2018,2022],
    "HRV": [1998,2002,2006,2014,2018,2022],
    "MAR": [1970,1986,1994,1998,2018,2022],
    "URY": [1962,1966,1970,1974,1986,1990,2002,2010,2014,2018,2022],
    "USA": [1990,1994,1998,2002,2006,2010,2014,2022],
    "MEX": [1962,1966,1970,1978,1986,1994,1998,2002,2006,2010,2014,2018,2022],
    "JPN": [1998,2002,2006,2010,2014,2018,2022],
    "CHE": [1962,1966,1994,2006,2010,2014,2018,2022],
    "SEN": [2002,2022],
    "DNK": [1986,1998,2002,2010,2018,2022],
    "ECU": [2002,2006,2014,2022],
    "CAN": [1986,2022],
    "IRN": [1978,1998,2006,2014,2018,2022],
    "KOR": [1986,1990,1994,1998,2002,2006,2010,2014,2018,2022],
    "AUT": [1978,1982,1990,1994,1998,2022],
    "NGA": [1994,1998,2002,2010,2014,2018,2022],
    "SRB": [1998,2006,2010,2018,2022],   # Yugoslavia/Serbia lineage post-1990
    "AUS": [1974,2006,2010,2014,2018,2022],
    "TUR": [1954,2002,2022],   # 1954 before our window; in window: [2002,2022]
    "CIV": [2006,2010,2014,2022],
    "HUN": [1962,1966,1978,1982,1986],
    "SAU": [1994,1998,2002,2006,2018,2022],
    "UKR": [2006,2022],
    "EGY": [1990,2018,2022],
    "DZA": [1982,1986,2010,2014,2022],
    "POL": [1974,1978,1982,1986,2002,2006,2018,2022],
    "CMR": [1982,1990,1994,1998,2002,2010,2014,2022],
    "VEN": [],   # first-time qualifier for 2026
    "PER": [1970,1978,1982,2018],
    "IRQ": [1986,2014],
    "PAN": [2018,2022],
    "SVK": [2010,2022],        # Czechoslovakia lineage; Slovakia alone: 2010
    "GHA": [2006,2010,2014,2022],
    "SCO": [1974,1978,1982,1986,1990,1998],
    "JOR": [],   # first qualifier
    "CRI": [1990,2002,2006,2014,2018,2022],
    "UZB": [],   # first qualifier
    "NZL": [1982,2010,2022],
}

# Turkey: only in-window appearances count (post-1962)
WC_APPEARANCES["TUR"] = [2002, 2022]

# =============================================================================
# World Bank API
# =============================================================================

WB_BASE = "https://api.worldbank.org/v2/country/{iso}/indicator/{indicator}?format=json&mrv=1"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _wb_get(iso3: str, indicator: str) -> float | None:
    wb_iso = ISO3_WB_OVERRIDE.get(iso3, iso3)
    url = WB_BASE.format(iso=wb_iso, indicator=indicator)
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    if len(data) < 2 or not data[1]:
        return None
    for entry in data[1]:
        if entry.get("value") is not None:
            return float(entry["value"])
    return None


def _fetch_wb_batch(iso3_list: list[str], indicator: str, label: str) -> dict[str, float | None]:
    """Fetch a World Bank indicator for a list of ISO3 codes."""
    log.info(f"Fetching {label} from World Bank", countries=len(iso3_list))
    results: dict[str, float | None] = {}
    for iso3 in iso3_list:
        try:
            results[iso3] = _wb_get(iso3, indicator)
        except Exception as exc:
            log.warning(f"World Bank {label} failed", iso3=iso3, error=str(exc)[:60])
            results[iso3] = None
    missing = [k for k, v in results.items() if v is None]
    if missing:
        log.warning(f"{label} missing for teams", teams=missing)
    return results


# =============================================================================
# Football culture index
# =============================================================================

def _culture_index(iso3: str, reference_year: int = 2026) -> float:
    """
    Decay-weighted count of WC appearances since 1962.
    decay = exp(-ln(2) * age_in_years / half_life)
    half_life = CULTURE_DECAY years (config: macro.culture_decay_years)
    """
    appearances = WC_APPEARANCES.get(iso3, [])
    total = 0.0
    for yr in appearances:
        age = reference_year - yr
        total += math.exp(-math.log(2) * age / CULTURE_DECAY)
    return round(total, 4)


# =============================================================================
# Fetch raw
# =============================================================================

def fetch_raw(force: bool = False) -> dict[str, dict]:
    raw_cache = PROJECT_ROOT / "data" / "raw" / "_macro_data_raw.json"

    if raw_cache.exists() and not force:
        log.info("Using cached macro data", path=str(raw_cache))
        import json
        return json.loads(raw_cache.read_text())

    log.stage("Fetching macro variables from World Bank API")
    iso3_list = list(TEAM_ISO3.keys())

    gdp_map = _fetch_wb_batch(iso3_list, "NY.GDP.PCAP.CD", "GDP per capita")
    pop_map = _fetch_wb_batch(iso3_list, "SP.POP.TOTL",    "Population")

    raw: dict[str, dict] = {}
    for iso3 in iso3_list:
        raw[iso3] = {
            "gdp_per_capita": gdp_map.get(iso3),
            "population":     pop_map.get(iso3),
        }

    raw_cache.parent.mkdir(parents=True, exist_ok=True)
    import json
    raw_cache.write_text(json.dumps(raw, indent=2))
    log.success("Macro raw data cached", path=str(raw_cache))
    return raw


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(raw: dict[str, dict]) -> pd.DataFrame:
    log.stage("Building macro feature table")

    rows = []
    for iso3, team_name in TEAM_ISO3.items():
        economic = raw.get(iso3, {})
        gdp      = economic.get("gdp_per_capita")
        pop      = economic.get("population")

        if gdp is None or gdp <= 0:
            log.warning("Missing/invalid GDP per capita — will NaN", team=team_name, iso3=iso3)
            log.gdp_per_capita = None
            log_gdp = None
        else:
            log_gdp = round(math.log(gdp), 6)

        if pop is None or pop <= 0:
            log.warning("Missing/invalid population — will NaN", team=team_name, iso3=iso3)
            log_pop = None
        else:
            log_pop = round(math.log(pop), 6)

        temp = MEAN_TEMP_C.get(iso3)
        if temp is None:
            log.warning("Missing temperature", team=team_name, iso3=iso3)

        is_host     = iso3 in WC_HOSTS_2026
        appearances = WC_APPEARANCES.get(iso3, [])
        culture_idx = _culture_index(iso3)

        rows.append({
            "iso3":                  iso3,
            "team_name":             team_name,
            "gdp_per_capita":        gdp,
            "population":            pop,
            "log_gdp_per_capita":    log_gdp,
            "log_population":        log_pop,
            "mean_temp_celsius":     temp,
            "is_host":               is_host,
            "wc_appearances":        len(appearances),
            "football_culture_index": culture_idx,
            "snapshot_date":         date.today(),
        })

    df = pd.DataFrame(rows)

    missing_gdp = df["log_gdp_per_capita"].isna().sum()
    missing_pop = df["log_population"].isna().sum()
    missing_tmp = df["mean_temp_celsius"].isna().sum()
    log.info(
        "Macro table built",
        teams=len(df),
        missing_gdp=int(missing_gdp),
        missing_pop=int(missing_pop),
        missing_temp=int(missing_tmp),
    )
    return df


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "iso3":                   df["iso3"],
        "team_name":              df["team_name"],
        "gdp_per_capita":         df["gdp_per_capita"],
        "population":             df["population"],
        "log_gdp_per_capita":     df["log_gdp_per_capita"],
        "log_population":         df["log_population"],
        "mean_temp_celsius":      df["mean_temp_celsius"],
        "is_host":                df["is_host"],
        "wc_appearances":         df["wc_appearances"].astype("Int64"),
        "football_culture_index": df["football_culture_index"],
        "snapshot_date":          pd.to_datetime(df["snapshot_date"]),
    })
    return out.sort_values("team_name").reset_index(drop=True)


# =============================================================================
# Schema spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        if row["log_gdp_per_capita"] is not None and pd.notna(row["log_gdp_per_capita"]):
            if not (3.0 <= row["log_gdp_per_capita"] <= 15.0):
                errors.append(f"{row['team_name']}: log_gdp {row['log_gdp_per_capita']:.2f} suspicious")
        if row["football_culture_index"] < 0:
            errors.append(f"{row['team_name']}: negative culture_index {row['football_culture_index']}")
        if row["wc_appearances"] < 0:
            errors.append(f"{row['team_name']}: negative wc_appearances")

    if errors:
        log.warning("Validation issues", count=len(errors))
        for err in errors:
            log.warning(err)
    else:
        log.success(f"Spot-check passed on {len(sample)} sample rows")

    hosts = df[df["is_host"]]["team_name"].tolist()
    log.info("Host teams", teams=hosts)
    top_culture = df.nlargest(3, "football_culture_index")[["team_name","wc_appearances","football_culture_index"]].to_dict("records")
    log.info("Top 3 by football culture index", teams=top_culture)


# =============================================================================
# Run
# =============================================================================

def run(force: bool = False) -> Path:
    log.stage("=== fetch_macro_data · Phase 2 Task 2.4 ===")

    raw         = fetch_raw(force=force)
    enriched_df = clean_and_enrich(raw)
    output_df   = build_output(enriched_df)

    log.stage("Spot-checking macro records")
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
    hasher.add_file(OUTPUT_PARQUET, label="macro_data")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_macro_data")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_macro_data complete", output=str(OUTPUT_PARQUET), teams=len(output_df))
    return OUTPUT_PARQUET


# =============================================================================
# CLI
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch Hoffmann-HGR macro variables for M3 model."
    )
    parser.add_argument("--force", action="store_true", help="Re-fetch even if cache exists.")
    args = parser.parse_args()
    run(force=args.force)
