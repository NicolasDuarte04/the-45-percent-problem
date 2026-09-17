"""
ingestion/fetch_wc2026_fixtures.py
===================================
Phase 2 · Task 2.5 — WC 2026 Group Assignments & Match Schedule

Produces the confirmed 2026 World Cup fixture list: 48 teams, 12 groups (A-L),
full match schedule with kickoff times (UTC) and venues.

Data source
-----------
This script reads the canonical draw from the language-neutral JSON sidecar:

    data/raw/wc2026_official_draw.json

That file is generated from the website's TS source of truth
(`website/src/lib/data/wc2026-official-draw.ts`) by

    pnpm tsx website/scripts/export-canonical-draw-json.ts

The TS module is the single source of truth for the tournament structure.
The Postgres `teams` / `matches` tables and this Parquet output are derived
artifacts and must remain consistent with it. Per the May 2026 mandate,
no script may hard-code team pairings: all data flows through the canonical
sidecar.

Output columns (unchanged from previous version, for downstream compatibility)
------------------------------------------------------------------------------
  match_id       str     - "M01".."M104" (canonical 1-104 ordering)
  kickoff_utc    datetime - UTC kickoff time
  stage          str     - 'Group Stage' / 'Round of 32' / ...
  group          str     - 'A'..'L' (group stage only, else None)
  team_home      str     - standardised team display name OR slot descriptor
                           (e.g. "1A", "BEST3-CDEFI", "WM73") for KO matches
                           with TBD teams
  team_away      str     - same convention as team_home
  venue          str     - stadium name
  city           str     - host city
  country        str     - USA / CAN / MEX
  is_neutral     bool    - True everywhere; the host playing in their country
                           still counts as neutral per WC convention

Run
---
  python ingestion/fetch_wc2026_fixtures.py
  python ingestion/fetch_wc2026_fixtures.py --force
"""

from __future__ import annotations

import argparse
import json
import sys
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

OUTPUT_PARQUET = PROJECT_ROOT / _cfg["data_sources"]["wc2026_fixtures"]["output_file"]
SNAPSHOT_REG   = PROJECT_ROOT / "data" / "snapshots" / "snapshot_registry.jsonl"

CANONICAL_DRAW_JSON = PROJECT_ROOT / "data" / "raw" / "wc2026_official_draw.json"

# Map the canonical short round codes to the stage labels this Parquet file
# has historically used. Downstream code keys off these strings.
ROUND_TO_STAGE: dict[str, str] = {
    "GRP": "Group Stage",
    "R32": "Round of 32",
    "R16": "Round of 16",
    "QF":  "Quarter-final",
    "SF":  "Semi-final",
    "3P":  "Third Place",
    "FIN": "Final",
}


# =============================================================================
# Read canonical draw
# =============================================================================

def _load_canonical_draw() -> dict:
    if not CANONICAL_DRAW_JSON.exists():
        raise FileNotFoundError(
            f"Canonical draw JSON not found at {CANONICAL_DRAW_JSON}. "
            "Regenerate it with: pnpm tsx website/scripts/export-canonical-draw-json.ts"
        )
    with open(CANONICAL_DRAW_JSON) as f:
        draw = json.load(f)
    log.info(
        "Canonical draw loaded",
        teams=draw["counts"]["teams"],
        group_matches=draw["counts"]["group_matches"],
        knockout_matches=draw["counts"]["knockout_matches"],
        source=draw.get("source", "unknown"),
    )
    return draw


def _team_lookup(draw: dict) -> dict[str, dict]:
    """fifa_code -> team row."""
    return {t["fifa_code"]: t for t in draw["teams"]}


def _venue_lookup(draw: dict) -> dict[str, dict]:
    """venue_key -> venue row."""
    return {v["key"]: v for v in draw["venues"]}


# =============================================================================
# Build group-stage rows
# =============================================================================

def _build_group_stage(draw: dict) -> list[dict]:
    teams = _team_lookup(draw)
    venues = _venue_lookup(draw)
    rows: list[dict] = []
    for m in draw["group_matches"]:
        venue = venues[m["venue_key"]]
        rows.append({
            "match_id":    m["match_id"],
            "kickoff_utc": pd.Timestamp(m["kickoff_utc"]).tz_convert("UTC"),
            "stage":       "Group Stage",
            "group":       m["group"],
            "team_home":   teams[m["home_code"]]["display_name"],
            "team_away":   teams[m["away_code"]]["display_name"],
            "venue":       venue["stadium"],
            "city":        venue["city"],
            "country":     venue["country"],
            "is_neutral":  True,
        })
    return rows


# =============================================================================
# Build knockout rows
# =============================================================================

def _build_knockout_rounds(draw: dict) -> list[dict]:
    venues = _venue_lookup(draw)
    rows: list[dict] = []
    for m in draw["knockout_matches"]:
        venue = venues[m["venue_key"]]
        rows.append({
            "match_id":    m["match_id"],
            "kickoff_utc": pd.Timestamp(m["kickoff_utc"]).tz_convert("UTC"),
            "stage":       ROUND_TO_STAGE[m["round"]],
            "group":       None,
            # Slot descriptors for team_home/team_away. Once group results land
            # the consuming pipeline can resolve these to display names.
            "team_home":   m["home_slot"],
            "team_away":   m["away_slot"],
            "venue":       venue["stadium"],
            "city":        venue["city"],
            "country":     venue["country"],
            "is_neutral":  True,
        })
    return rows


# =============================================================================
# Pipeline stages
# =============================================================================

def fetch_raw(force: bool = False) -> list[dict]:
    """No network call needed - read the canonical draw and project to rows."""
    draw = _load_canonical_draw()
    return _build_group_stage(draw) + _build_knockout_rounds(draw)


def clean_and_enrich(rows: list[dict]) -> pd.DataFrame:
    log.stage("Building WC 2026 fixture table")
    df = pd.DataFrame(rows)

    gs = df[df["stage"] == "Group Stage"]
    teams_in_gs = pd.unique(pd.concat([gs["team_home"], gs["team_away"]]))
    log.info(
        "Group stage fixtures",
        matches=len(gs),
        unique_teams=len(teams_in_gs),
    )

    ko = df[df["stage"] != "Group Stage"]
    stage_counts = ko["stage"].value_counts().to_dict()
    log.info("Knockout fixtures", by_stage=stage_counts)

    return df


def build_output(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame({
        "match_id":    df["match_id"],
        "kickoff_utc": pd.to_datetime(df["kickoff_utc"], utc=True),
        "stage":       df["stage"],
        "group":       df["group"],
        "team_home":   df["team_home"],
        "team_away":   df["team_away"],
        "venue":       df["venue"],
        "city":        df["city"],
        "country":     df["country"],
        "is_neutral":  df["is_neutral"],
    })
    return out.sort_values("kickoff_utc").reset_index(drop=True)


def _validate_sample(df: pd.DataFrame) -> None:
    gs = df[df["stage"] == "Group Stage"]

    # Each of the 48 teams should appear in exactly 3 group-stage matches
    all_teams = pd.concat([gs["team_home"], gs["team_away"]])
    team_counts = all_teams.value_counts()
    expected_count = 3
    wrong = team_counts[team_counts != expected_count]
    if not wrong.empty:
        log.warning("Teams with != 3 group-stage matches", teams=wrong.to_dict())
    else:
        log.success(f"All {len(team_counts)} teams have exactly 3 group-stage matches")

    expected = {
        "Group Stage": 72,
        "Round of 32": 16,
        "Round of 16": 8,
        "Quarter-final": 4,
        "Semi-final": 2,
        "Third Place": 1,
        "Final": 1,
    }
    actual = df["stage"].value_counts().to_dict()
    log.info("Match counts by stage", counts=actual)
    for stage, n in expected.items():
        got = actual.get(stage, 0)
        if got != n:
            log.warning(f"Expected {n} {stage} matches, got {got}")


def run(force: bool = False) -> Path:
    log.stage("=== fetch_wc2026_fixtures · Phase 2 Task 2.5 ===")

    if OUTPUT_PARQUET.exists() and not force:
        log.info("Output already exists - use --force to rebuild", path=str(OUTPUT_PARQUET))
        return OUTPUT_PARQUET

    rows      = fetch_raw(force=force)
    df        = clean_and_enrich(rows)
    output_df = build_output(df)

    log.stage("Spot-checking fixture records")
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
    hasher.add_file(OUTPUT_PARQUET, label="wc2026_fixtures")
    snapshot_sha = hasher.finalise()

    registry = SnapshotRegistry(SNAPSHOT_REG)
    registry.register(snapshot_sha, hasher.manifest(), notes="fetch_wc2026_fixtures")
    log.info("Snapshot registered", sha=snapshot_sha[:16])

    log.success("fetch_wc2026_fixtures complete", output=str(OUTPUT_PARQUET), rows=len(output_df))
    return OUTPUT_PARQUET


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Build WC 2026 group assignments and match schedule from the canonical draw."
    )
    parser.add_argument("--force", action="store_true", help="Re-build even if output exists.")
    args = parser.parse_args()
    run(force=args.force)
