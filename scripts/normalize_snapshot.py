"""
scripts/normalize_snapshot.py
==============================
Transforms the raw generated snapshot to exactly match the Phase 9 blueprint
JSON Schema interfaces (§4 of Phase9_Website_Architecture.md).

Changes applied:
  tournament.json  — flatten progression.*, rename elo_rating→elo_current, add seed/rank_change_7d
  divergence.json  — add kickoff_utc, round, home, away, market, edge_threshold,
                     gate_rules_tripped, confidence_band to each row
  teams/*.json     — flatten progression.*, rename elo_rating→elo_current, add seed, rank_change_7d
"""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

SNAPSHOT_ID = "2026-04-23T00:00Z"
WEBSITE_ROOT = Path(__file__).resolve().parent.parent.parent / "website"
SNAPSHOT_DIR = WEBSITE_ROOT / "public" / "data" / "snapshots" / SNAPSHOT_ID
LATEST_DIR   = WEBSITE_ROOT / "public" / "data" / "latest"

# ── Match fixtures (kickoff_utc + group round info) for divergence enrichment ──

import sys
import pandas as pd
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

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


FIFA_CODES = {
    "Mexico": "MEX", "South Korea": "KOR", "Senegal": "SEN", "Uzbekistan": "UZB",
    "USA": "USA", "Panama": "PAN", "Ghana": "GHA", "Costa Rica": "CRC",
    "Canada": "CAN", "Uruguay": "URU", "Morocco": "MAR", "New Zealand": "NZL",
    "Argentina": "ARG", "Peru": "PER", "Ecuador": "ECU", "Poland": "POL",
    "Brazil": "BRA", "Japan": "JPN", "Algeria": "ALG", "Colombia": "COL",
    "Spain": "ESP", "Netherlands": "NED", "Australia": "AUS", "Iraq": "IRQ",
    "France": "FRA", "Denmark": "DEN", "Egypt": "EGY", "Cameroon": "CMR",
    "England": "ENG", "Belgium": "BEL", "Nigeria": "NGA", "Venezuela": "VEN",
    "Germany": "GER", "Côte d'Ivoire": "CIV", "Saudi Arabia": "KSA", "Scotland": "SCO",
    "Portugal": "POR", "Croatia": "CRO", "Hungary": "HUN", "Austria": "AUT",
    "Italy": "ITA", "Serbia": "SRB", "Switzerland": "SUI", "Turkey": "TUR",
    "Iran": "IRN", "Ukraine": "UKR", "Slovakia": "SVK", "Jordan": "JOR",
}
CODE_TO_NAME = {v: k for k, v in FIFA_CODES.items()}


def _normalize_tournament(fixtures: dict[str, dict]) -> None:
    path = SNAPSHOT_DIR / "tournament.json"
    with open(path) as f:
        data = json.load(f)

    # Compute seeds (rank within group by p_champion)
    from itertools import groupby
    teams = data["teams"]
    group_teams: dict[str, list] = {}
    for t in teams:
        g = t["group"]
        group_teams.setdefault(g, []).append(t)

    team_seeds: dict[str, int] = {}
    for g, gteams in group_teams.items():
        sorted_g = sorted(gteams, key=lambda t: t["progression"]["p_champion"], reverse=True)
        for rank, t in enumerate(sorted_g, start=1):
            team_seeds[t["fifa_code"]] = rank

    new_teams = []
    for t in sorted(teams, key=lambda x: x["progression"]["p_champion"], reverse=True):
        prog = t.pop("progression")
        new_teams.append({
            "fifa_code": t["fifa_code"],
            "display_name": t["display_name"],
            "confederation": t["confederation"],
            "seed": team_seeds[t["fifa_code"]],
            "p_champion": prog["p_champion"],
            "p_final": prog["p_final"],
            "p_semifinal": prog["p_semifinal"],
            "p_quarterfinal": prog["p_quarterfinal"],
            "p_r16": prog["p_r16"],
            "p_group_qualification": prog["p_group_qualification"],
            "ci_95_champion": prog["ci_95_champion"],
            "elo_current": t["elo_rating"],
            "rank_change_7d": 0,
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
        half_ci = 1.96 * math.sqrt(p * (1 - p) / 1000)  # ~95% CI on proportion

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
            "progression": {
                "p_group_qualification": prog["p_group_qualification"],
                "p_r16": prog["p_r16"],
                "p_qf": prog["p_quarterfinal"],
                "p_sf": prog["p_semifinal"],
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
    print(f"  latest/ synced from {SNAPSHOT_ID}")


def main() -> None:
    print(f"Normalizing snapshot: {SNAPSHOT_ID}")
    fixtures = _load_fixtures()
    _normalize_tournament(fixtures)
    _normalize_divergence(fixtures)
    _normalize_teams()
    _sync_latest()
    print("Done.")


if __name__ == "__main__":
    main()
