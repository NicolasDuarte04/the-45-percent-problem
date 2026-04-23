"""
ingestion/fetch_elo_ratings.py
==============================
Phase 2 · Task 2.3a — Elo Ratings Snapshot

Fetches current World Elo ratings for all national teams from eloratings.net.
The TSV endpoint returns 244 teams with rank, 2-letter code, and Elo rating.
Team codes are mapped to standardised display names matching the TEAM_NAME_MAP
established in fetch_historical_matches.py.

Output
------
  data/raw/elo_ratings.parquet   — ranked Elo snapshot with standardised names

Run
---
  python ingestion/fetch_elo_ratings.py
  python ingestion/fetch_elo_ratings.py --force
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.hasher import DataSnapshotHasher, SnapshotRegistry
from utils.logger import get_logger

log = get_logger(__name__)

import yaml
with open(PROJECT_ROOT / "config.yaml") as f:
    cfg = yaml.safe_load(f)

SOURCE_URL     = cfg["data_sources"]["elo_ratings"]["url"]
OUTPUT_PARQUET = PROJECT_ROOT / cfg["data_sources"]["elo_ratings"]["output_file"]
RAW_TSV_CACHE  = PROJECT_ROOT / "data" / "raw" / "_elo_ratings_raw.tsv"
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

# =============================================================================
# eloratings.net 2-letter code → standardised team name
# These codes are eloratings.net-specific and differ from ISO alpha-2.
# =============================================================================

ELO_CODE_TO_NAME: dict[str, str] = {
    # UEFA
    "EN": "England",
    "FR": "France",
    "ES": "Spain",
    "DE": "Germany",
    "PT": "Portugal",
    "NL": "Netherlands",
    "HR": "Croatia",
    "BE": "Belgium",
    "DK": "Denmark",
    "CH": "Switzerland",
    "AT": "Austria",
    "RS": "Serbia",
    "SQ": "Scotland",
    "TR": "Turkey",
    "PL": "Poland",
    "HU": "Hungary",
    "UA": "Ukraine",
    "SI": "Slovenia",
    "AL": "Albania",
    "RO": "Romania",
    "GR": "Greece",
    "CZ": "Czechia",
    "SE": "Sweden",
    "NO": "Norway",
    "WA": "Wales",
    "SK": "Slovakia",
    "GE": "Georgia",
    "FI": "Finland",
    "IS": "Iceland",
    "IE": "Ireland",
    "EI": "Northern Ireland",
    "NS": "Northern Ireland",
    "BA": "Bosnia & Herzegovina",
    "NM": "North Macedonia",
    "ME": "Montenegro",
    "KO": "Kosovo",
    "BY": "Belarus",
    "BG": "Bulgaria",
    "CY": "Cyprus",
    "EE": "Estonia",
    "LV": "Latvia",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MD": "Moldova",
    "MT": "Malta",
    "AM": "Armenia",
    "AZ": "Azerbaijan",
    "AD": "Andorra",
    "FO": "Faroe Islands",
    "GI": "Gibraltar",
    "KZ": "Kazakhstan",
    "LI": "Liechtenstein",
    "MC": "Monaco",
    "SM": "San Marino",
    "IL": "Israel",
    "RU": "Russia",
    # CONMEBOL
    "AR": "Argentina",
    "BR": "Brazil",
    "CO": "Colombia",
    "EC": "Ecuador",
    "UY": "Uruguay",
    "PY": "Paraguay",
    "VE": "Venezuela",
    "CL": "Chile",
    "PE": "Peru",
    "BO": "Bolivia",
    "GY": "Guyana",
    "SR": "Suriname",
    # CONCACAF
    "US": "USA",
    "MX": "Mexico",
    "CA": "Canada",
    "PA": "Panama",
    "CR": "Costa Rica",
    "HN": "Honduras",
    "JM": "Jamaica",
    "HT": "Haiti",
    "GT": "Guatemala",
    "SV": "El Salvador",
    "NI": "Nicaragua",
    "TT": "Trinidad and Tobago",
    "CU": "Cuba",
    "DO": "Dominican Republic",
    "BZ": "Belize",
    "GD": "Grenada",
    "VC": "St. Vincent & Grenadines",
    "BB": "Barbados",
    "AG": "Antigua and Barbuda",
    "KN": "St. Kitts & Nevis",
    "LC": "St. Lucia",
    "DM": "Dominica",
    "BM": "Bermuda",
    "CW": "Curaçao",
    "GP": "Guadeloupe",
    "MQ": "Martinique",
    "PR": "Puerto Rico",
    "CK": "Cayman Islands",
    "KY": "Cayman Islands",
    "AI": "Anguilla",
    "MS": "Montserrat",
    "TC": "Turks & Caicos",
    "VI": "US Virgin Islands",
    "VG": "British Virgin Islands",
    # CAF
    "MA": "Morocco",
    "SN": "Senegal",
    "NG": "Nigeria",
    "DZ": "Algeria",
    "CI": "Côte d'Ivoire",
    "CM": "Cameroon",
    "EG": "Egypt",
    "CD": "DR Congo",
    "GH": "Ghana",
    "TN": "Tunisia",
    "ML": "Mali",
    "ZA": "South Africa",
    "AO": "Angola",
    "BF": "Burkina Faso",
    "GN": "Guinea",
    "MG": "Madagascar",
    "MZ": "Mozambique",
    "ZW": "Zimbabwe",
    "ZM": "Zambia",
    "UG": "Uganda",
    "TZ": "Tanzania",
    "KE": "Kenya",
    "SD": "Sudan",
    "SL": "Sierra Leone",
    "RW": "Rwanda",
    "NA": "Namibia",
    "MR": "Mauritania",
    "GQ": "Equatorial Guinea",
    "GA": "Gabon",
    "CV": "Cape Verde",
    "GM": "Gambia",
    "LY": "Libya",
    "BJ": "Benin",
    "NE": "Niger",
    "TG": "Togo",
    "BI": "Burundi",
    "ET": "Ethiopia",
    "BW": "Botswana",
    "GW": "Guinea-Bissau",
    "MW": "Malawi",
    "CF": "Central African Republic",
    "CG": "Congo",
    "LS": "Lesotho",
    "ER": "Eritrea",
    "LR": "Liberia",
    "MU": "Mauritius",
    "SC": "Seychelles",
    "SS": "South Sudan",
    "TD": "Chad",
    "DJ": "Djibouti",
    "SO": "Somalia",
    "KM": "Comoros",
    "ST": "São Tomé & Príncipe",
    "RE": "Réunion",
    "ZN": "Zanzibar",
    # AFC
    "JP": "Japan",
    "KR": "South Korea",
    "IR": "Iran",
    "AU": "Australia",
    "SA": "Saudi Arabia",
    "IQ": "Iraq",
    "JO": "Jordan",
    "UZ": "Uzbekistan",
    "AE": "United Arab Emirates",
    "SY": "Syria",
    "OM": "Oman",
    "CN": "China",
    "QA": "Qatar",
    "BH": "Bahrain",
    "KW": "Kuwait",
    "PS": "Palestine",
    "LB": "Lebanon",
    "KP": "North Korea",
    "ID": "Indonesia",
    "MY": "Malaysia",
    "TH": "Thailand",
    "VN": "Vietnam",
    "SG": "Singapore",
    "IN": "India",
    "HK": "Hong Kong",
    "TW": "Chinese Taipei",
    "MM": "Myanmar",
    "BD": "Bangladesh",
    "PK": "Pakistan",
    "NP": "Nepal",
    "KH": "Cambodia",
    "LA": "Laos",
    "MN": "Mongolia",
    "AF": "Afghanistan",
    "LK": "Sri Lanka",
    "MV": "Maldives",
    "BN": "Brunei",
    "BT": "Bhutan",
    "TL": "Timor-Leste",
    "TM": "Turkmenistan",
    "TJ": "Tajikistan",
    "KG": "Kyrgyzstan",
    # OFC
    "NZ": "New Zealand",
    "PG": "Papua New Guinea",
    "FJ": "Fiji",
    "VU": "Vanuatu",
    "SB": "Solomon Islands",
    "NC": "New Caledonia",
    "WS": "Samoa",
    "TO": "Tonga",
    "WF": "Wallis & Futuna",
    "KI": "Kiribati",
    "TV": "Tuvalu",
    "MH": "Marshall Islands",
    "FM": "Micronesia",
    "MP": "Northern Mariana Islands",
    "GU": "Guam",
    "AS": "American Samoa",
    "NU": "Niue",
    "CX": "Cook Islands",
    "CC": "Cocos Islands",
    "PW": "Palau",
    # Europe — additional codes
    "IT": "Italy",
    # Asia-Pacific
    "PH": "Philippines",
    # CONCACAF — additional
    "BS": "Bahamas",
    # OFC — eloratings.net non-standard
    "TE": "Tahiti",
    # Non-FIFA / unusual
    "HG": "Hong Kong",  # may be duplicate of HK
    "AB": "Abkhazia",
    "EU": "Euzkadi",    # Basque Country
    "JS": "Jersey",
    "TI": "Timor-Leste",
    "MF": "Martinique",  # may duplicate MQ
    "GF": "French Guiana",
    "YT": "Mayotte",
    "BL": "Saint Barthélemy",
    "SX": "Sint Maarten",
    "AW": "Aruba",
    "GL": "Greenland",
    "BQ": "Caribbean Netherlands",
    "PM": "Saint Pierre & Miquelon",
    "VA": "Vatican City",
    "YE": "Yemen",
    "SW": "Eswatini",
    "MO": "Macau",
    "FK": "Falkland Islands",
    "EH": "Western Sahara",
    "KD": "Kurdistan",
}


def _code_to_name(code: str) -> str:
    """Return standardised team name for a 2-letter eloratings.net code."""
    return ELO_CODE_TO_NAME.get(code, code)


# =============================================================================
# Fetch raw TSV
# =============================================================================

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _download_tsv(url: str) -> str:
    log.info("Downloading Elo ratings TSV", url=url)
    resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
    resp.raise_for_status()
    return resp.text


def fetch_raw(force: bool = False) -> pd.DataFrame:
    if RAW_TSV_CACHE.exists() and not force:
        log.info("Using cached Elo TSV", path=str(RAW_TSV_CACHE))
        raw = RAW_TSV_CACHE.read_text(encoding="utf-8")
    else:
        log.stage("Downloading Elo ratings from eloratings.net")
        raw = _download_tsv(SOURCE_URL)
        RAW_TSV_CACHE.parent.mkdir(parents=True, exist_ok=True)
        RAW_TSV_CACHE.write_text(raw, encoding="utf-8")
        log.success("Elo TSV cached", path=str(RAW_TSV_CACHE))

    # TSV columns (eloratings.net World.tsv format, 31 columns):
    # 0: rank, 1: prev_rank, 2: team_code, 3: elo_rating,
    # 4-5: best rank / best elo, 6-7: worst rank / worst elo,
    # 8-30: various period deltas and win/draw/loss counts
    rows = []
    for line in raw.strip().split("\n"):
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        try:
            rows.append({
                "rank":        int(parts[0]),
                "prev_rank":   int(parts[1]),
                "team_code":   parts[2].strip(),
                "elo_rating":  float(parts[3]),
            })
        except (ValueError, IndexError):
            log.warning("Skipping malformed TSV row", line=line[:80])
            continue

    df = pd.DataFrame(rows)
    log.info("Raw Elo data loaded", teams=len(df))
    return df


# =============================================================================
# Clean & enrich
# =============================================================================

def clean_and_enrich(df: pd.DataFrame) -> pd.DataFrame:
    log.stage("Cleaning and enriching Elo ratings")

    df = df.copy()
    df["team_name"] = df["team_code"].apply(_code_to_name)

    unmapped = df[df["team_name"] == df["team_code"]]
    if len(unmapped) > 0:
        log.warning(
            "Unmapped team codes (using raw code as name)",
            count=len(unmapped),
            codes=unmapped["team_code"].tolist(),
        )

    df["snapshot_date"] = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    log.success(
        "Elo enrichment complete",
        teams=len(df),
        top_team=df.iloc[0]["team_name"] if len(df) else "N/A",
        top_elo=df.iloc[0]["elo_rating"] if len(df) else 0,
    )
    return df


# =============================================================================
# Build output
# =============================================================================

def build_output(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "rank":          df["rank"].astype(int),
        "prev_rank":     df["prev_rank"].astype(int),
        "team_code":     df["team_code"],
        "team_name":     df["team_name"],
        "elo_rating":    df["elo_rating"].round(1),
        "snapshot_date": df["snapshot_date"],
    })
    return out.sort_values("rank").reset_index(drop=True)


# =============================================================================
# Schema spot-check
# =============================================================================

def _validate_sample(df: pd.DataFrame, n: int = 5) -> None:
    """
    Spot-check: rank > 0, team_name non-empty, rating > 0.
    Ratings below 800 are expected for weak non-WC teams (eloratings.net
    includes all 244 FIFA members); the Team schema's ge=800 floor applies
    only to the 48 WC qualifiers joined in data_loader.py.
    """
    sample = df.sample(min(n, len(df)), random_state=42)
    errors = []
    for _, row in sample.iterrows():
        if row["elo_rating"] <= 0:
            errors.append(f"{row['team_name']}: elo_rating {row['elo_rating']} <= 0")
        if row["elo_rating"] > 2500.0:
            errors.append(f"{row['team_name']}: elo_rating {row['elo_rating']} > 2500")
        if row["rank"] < 1:
            errors.append(f"{row['team_name']}: rank {row['rank']} < 1")
        if not row["team_name"]:
            errors.append(f"Empty team_name for code {row['team_code']}")

    below_800 = int((df["elo_rating"] < 800).sum())
    if below_800:
        log.info(
            "Teams with Elo < 800 (expected — weak non-WC nations; schema floor applies at join time)",
            count=below_800,
        )

    if errors:
        log.warning("Validation issues in sample", count=len(errors))
        for err in errors:
            log.warning(err)
    else:
        log.success(f"Spot-check passed on {len(sample)} sample rows")


# =============================================================================
# Main
# =============================================================================

def run(force: bool = False) -> Path:
    log.stage("=== fetch_elo_ratings · Phase 2 Task 2.3a ===")

    raw_df     = fetch_raw(force=force)
    cleaned_df = clean_and_enrich(raw_df)
    output_df  = build_output(cleaned_df)

    log.stage("Spot-checking Elo records")
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
    hasher.add_file(OUTPUT_PARQUET, label="elo_ratings")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_elo_ratings")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_elo_ratings complete", output=str(OUTPUT_PARQUET), teams=len(output_df))
    return OUTPUT_PARQUET


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Elo ratings from eloratings.net.")
    parser.add_argument("--force", action="store_true", help="Re-download even if cache exists.")
    args = parser.parse_args()
    run(force=args.force)
