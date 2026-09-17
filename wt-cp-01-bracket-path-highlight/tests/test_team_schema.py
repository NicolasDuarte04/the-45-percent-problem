"""tests/test_team_schema.py

Schema regression test for the per-team snapshot JSONs.

Reads the current snapshot folder via website/public/data/manifest.json,
globs every teams/*.json, and asserts the invariant fields are present
and well-typed. This catches downstream normalization steps that drop
fields like ``confederation`` or ``elo_rating`` (the regression we fixed
in scripts/normalize_snapshot.py).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEBSITE_DATA = PROJECT_ROOT / "website" / "public" / "data"
MANIFEST_PATH = WEBSITE_DATA / "manifest.json"

VALID_CONFEDERATIONS = {"UEFA", "CONMEBOL", "AFC", "CAF", "CONCACAF", "OFC"}

REQUIRED_PROGRESSION_KEYS = {
    "p_group_qualification",
    "p_r16",
    "p_qf",
    "p_sf",
    "p_final",
    "p_champion",
    "ci_95_champion",
}


def _current_snapshot_dir() -> Path:
    with open(MANIFEST_PATH) as f:
        manifest = json.load(f)
    snapshot_id = manifest[0]["snapshot_id"]
    return WEBSITE_DATA / "snapshots" / snapshot_id


def _team_files() -> list[Path]:
    snapshot_dir = _current_snapshot_dir()
    teams_dir = snapshot_dir / "teams"
    files = sorted(teams_dir.glob("*.json"))
    if not files:
        pytest.fail(f"No team JSON files found under {teams_dir}")
    return files


@pytest.mark.parametrize("team_file", _team_files(), ids=lambda p: p.stem)
def test_team_json_schema(team_file: Path) -> None:
    with open(team_file) as f:
        team = json.load(f)

    required_top_level = {
        "fifa_code",
        "display_name",
        "group",
        "confederation",
        "elo_rating",
        "progression",
    }
    missing = required_top_level - team.keys()
    assert not missing, f"{team_file.name} missing keys: {sorted(missing)}"

    assert isinstance(team["fifa_code"], str) and len(team["fifa_code"]) == 3, (
        f"{team_file.name}: fifa_code must be a 3-letter string, got {team['fifa_code']!r}"
    )
    assert isinstance(team["display_name"], str) and team["display_name"], (
        f"{team_file.name}: display_name must be a non-empty string"
    )
    assert team["confederation"] in VALID_CONFEDERATIONS, (
        f"{team_file.name}: confederation {team['confederation']!r} not in {VALID_CONFEDERATIONS}"
    )
    assert isinstance(team["elo_rating"], float), (
        f"{team_file.name}: elo_rating must be float, got {type(team['elo_rating']).__name__}"
    )
    assert 800.0 <= team["elo_rating"] <= 2500.0, (
        f"{team_file.name}: elo_rating {team['elo_rating']} outside plausible Elo range"
    )

    progression = team["progression"]
    assert isinstance(progression, dict), f"{team_file.name}: progression must be a dict"
    missing_prog = REQUIRED_PROGRESSION_KEYS - progression.keys()
    assert not missing_prog, (
        f"{team_file.name}: progression missing keys: {sorted(missing_prog)}"
    )
