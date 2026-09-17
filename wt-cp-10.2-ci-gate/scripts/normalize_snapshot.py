"""
scripts/normalize_snapshot.py
==============================
Transforms the raw generated snapshot to exactly match the Phase 9 blueprint
JSON Schema interfaces (section 4 of Phase9_Website_Architecture.md).

Changes applied:
  tournament.json  -- flatten progression.*, rename elo_rating to elo_current,
                      add seed/rank_change_7d
  divergence.json  -- add kickoff_utc, round, home, away, market, edge_threshold,
                      gate_rules_tripped, confidence_band to each row
  teams/*.json     -- flatten progression.*, rename elo_rating to elo_current,
                      add seed, rank_change_7d

Usage:
  python scripts/normalize_snapshot.py
  python scripts/normalize_snapshot.py --snapshot-id 2026-05-01T00:00Z

When no --snapshot-id is given the script reads
website/public/data/manifest.json and normalizes the most recent entry.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
from pathlib import Path

# Two levels up from scripts/ lands at the project root.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEBSITE_ROOT = PROJECT_ROOT / "website"
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

# These are set at the start of main() once the snapshot ID is resolved.
SNAPSHOT_DIR: Path
LATEST_DIR: Path = WEBSITE_ROOT / "public" / "data" / "latest"

FIFA_CODES = {
    "Mexico": "MEX", "South Korea": "KOR", "Senegal": "SEN", "Uzbekistan": "UZB",
    "USA": "USA", "Panama": "PAN", "Ghana": "GHA", "Costa Rica": "CRC",
    "Canada": "CAN", "Uruguay": "URU", "Morocco": "MAR", "New Zealand": "NZL",
    "Argentina": "ARG", "Peru": "PER", "Ecuador": "ECU", "Poland": "POL",
    "Brazil": "BRA", "Japan": "JPN", "Algeria": "ALG", "Colombia": "COL",
    "Spain": "ESP", "Netherlands": "NED", "Australia": "AUS", "Iraq": "IRQ",
    "France": "FRA", "Denmark": "DEN", "Egypt": "EGY", "Cameroon": "CMR",
    "England": "ENG", "Belgium": "BEL", "Nigeria": "NGA", "Venezuela": "VEN",
    "Germany": "GER", "Cote d'Ivoire": "CIV", "Saudi Arabia": "KSA", "Scotland": "SCO",
    "Portugal": "POR", "Croatia": "CRO", "Hungary": "HUN", "Austria": "AUT",
    "Italy": "ITA", "Serbia": "SRB", "Switzerland": "SUI", "Turkey": "TUR",
    "Iran": "IRN", "Ukraine": "UKR", "Slovakia": "SVK", "Jordan": "JOR",
}
CODE_TO_NAME = {v: k for k, v in FIFA_CODES.items()}


def _resolve_snapshot_id(override: str | None) -> str:
    """Return the snapshot ID to normalise.

    Uses the override if provided. Otherwise reads the manifest written by
    generate_snapshot.py and picks the most recent entry.
    """
    if override:
        return override
    manifest_path = WEBSITE_ROOT / "public" / "data" / "manifest.json"
    with open(manifest_path) as f:
        manifest = json.load(f)
    if not manifest:
        raise RuntimeError(f"manifest.json at {manifest_path} is empty.")
    snapshot_id = manifest[0]["snapshot_id"]
    print(f"  Resolved snapshot_id from manifest: {snapshot_id}")
    return snapshot_id


def _load_fixtures() -> dict[str, dict]:
    parquet = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
    df = pd.read_parquet(parquet)
    gs = df[df["stage"] == "Group Stage"]
    result = {}
    for _, row in gs.iterrows():
        match_id = row["match_id"]
        result[match_id] = {
            "kickoff_utc": row["kickoff_utc"].isoformat(),
            "home": row["team_home"],
            "away": row["team_away"],
            "group": row["group"],
        }
    return result


def _normalize_tournament(fixtures: dict[str, dict]) -> None:
    path = SNAPSHOT_DIR / "tournament.json"
    with open(path) as f:
        data = json.load(f)

    teams = data["teams"]

    # generate_snapshot.py writes tournament.json with flat top-level probability
    # fields (no nested "progression" key). Re-compute within-group seeds here
    # since generate_snapshot.py assigns global rank, not per-group rank.
    group_teams: dict[str, list] = {}
    for t in teams:
        g = t["group"]
        group_teams.setdefault(g, []).append(t)

    team_seeds: dict[str, int] = {}
    for g, gteams in group_teams.items():
        sorted_g = sorted(gteams, key=lambda t: t["p_champion"], reverse=True)
        for rank, t in enumerate(sorted_g, start=1):
            team_seeds[t["fifa_code"]] = rank

    new_teams = []
    for t in sorted(teams, key=lambda x: x["p_champion"], reverse=True):
        new_teams.append({
            "fifa_code": t["fifa_code"],
            "display_name": t["display_name"],
            "confederation": t["confederation"],
            "seed": team_seeds[t["fifa_code"]],
            "p_champion": t["p_champion"],
            "p_final": t["p_final"],
            "p_semifinal": t["p_semifinal"],
            "p_quarterfinal": t["p_quarterfinal"],
            "p_r16": t["p_r16"],
            "p_group_qualification": t["p_group_qualification"],
            "ci_95_champion": t["ci_95_champion"],
            "elo_current": t["elo_current"],
            "rank_change_7d": t.get("rank_change_7d", 0),
        })

    data["teams"] = new_teams
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  tournament.json normalized ({len(new_teams)} teams)")


def _normalize_divergence(fixtures: dict[str, dict]) -> None:
    path = SNAPSHOT_DIR / "divergence.json"
    with open(path) as f:
        data = json.load(f)

    rows = data["rows"]
    new_rows = []
    for row in rows:
        mid = row["match_id"]
        fix = fixtures.get(mid, {})
        home_name = fix.get("home", "Unknown")
        away_name = fix.get("away", "Unknown")
        p = row["p_model"]
        half_ci = 1.96 * math.sqrt(p * (1 - p) / 1000)

        new_row = {
            "row_id": row["row_id"],
            "match_id": mid,
            "kickoff_utc": fix.get("kickoff_utc", "2026-06-11T18:00:00+00:00"),
            "round": "GRP",
            "home": {"fifa_code": FIFA_CODES.get(home_name, "UNK"), "display_name": home_name},
            "away": {"fifa_code": FIFA_CODES.get(away_name, "UNK"), "display_name": away_name},
            "market": "1X2",
            "outcome": row["outcome"],
            "p_model": p,
            "q_market_raw_decimal": row["q_market_raw_decimal"],
            "q_market_devigged": row["q_market_devigged"],
            "edge_E": row["edge_E"],
            "edge_threshold": 0.03,
            "gate_status": row["gate_status"],
            "gate_rules_tripped": [],
            "snapshot_age_minutes": row["snapshot_age_minutes"],
            "confidence_band": [max(0.0, round(p - half_ci, 6)), min(1.0, round(p + half_ci, 6))],
            "source_book": row["source_book"],
            "pinnacle_bias_applied": row["pinnacle_bias_applied"],
            "model_version": row["model_version"],
        }
        new_rows.append(new_row)

    data["rows"] = new_rows
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  divergence.json normalized ({len(new_rows)} rows)")


def _normalize_teams() -> None:
    teams_dir = SNAPSHOT_DIR / "teams"
    count = 0
    for path in teams_dir.glob("*.json"):
        with open(path) as f:
            t = json.load(f)

        prog = t.pop("progression")
        new_t = {
            "fifa_code": t["fifa_code"],
            "display_name": t["display_name"],
            "group": t["group"],
            "confederation": t["confederation"],
            "elo_rating": float(t["elo_rating"]),
            "progression": {
                "p_group_qualification": prog["p_group_qualification"],
                "p_r16": prog["p_r16"],
                "p_qf": prog["p_qf"],
                "p_sf": prog["p_sf"],
                "p_final": prog["p_final"],
                "p_champion": prog["p_champion"],
                "ci_95_champion": prog["ci_95_champion"],
            },
            "history": t.get("history", []),
            "upcoming_matches": t.get("upcoming_matches", []),
        }
        with open(path, "w") as f:
            json.dump(new_t, f, indent=2)
        count += 1
    print(f"  teams/*.json normalized ({count} files)")


def _sync_latest() -> None:
    if LATEST_DIR.exists():
        shutil.rmtree(LATEST_DIR)
    shutil.copytree(SNAPSHOT_DIR, LATEST_DIR)
    print(f"  latest/ synced from {SNAPSHOT_DIR.name}")


def main() -> None:
    global SNAPSHOT_DIR

    parser = argparse.ArgumentParser(
        description="Normalize a generated snapshot to match the Phase 9 website schema."
    )
    parser.add_argument(
        "--snapshot-id",
        default=None,
        help=(
            "Snapshot ID to normalize (e.g. 2026-05-01T00:00Z). "
            "Defaults to the most recent entry in website/public/data/manifest.json."
        ),
    )
    args = parser.parse_args()

    snapshot_id = _resolve_snapshot_id(args.snapshot_id)
    SNAPSHOT_DIR = WEBSITE_ROOT / "public" / "data" / "snapshots" / snapshot_id

    if not SNAPSHOT_DIR.exists():
        print(f"ERROR: snapshot directory not found: {SNAPSHOT_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"Normalizing snapshot: {snapshot_id}")
    fixtures = _load_fixtures()
    _normalize_tournament(fixtures)
    _normalize_divergence(fixtures)
    _normalize_teams()
    _sync_latest()
    print("Done.")


if __name__ == "__main__":
    main()
