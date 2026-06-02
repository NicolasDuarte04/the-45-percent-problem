"""
scripts/backfill_bracket_slots.py
=================================
cp-09 part 1: one-shot backfill of `website/public/data/latest/bracket.json`
from `data/raw/wc2026_fixtures.parquet`.

Why this script exists
----------------------
`scripts/regenerate_snapshot_from_batch.py` deliberately carries the
existing `bracket.json` forward unchanged (see Section 7 rationale in
that script's docstring). Every nightly snapshot therefore preserves
whatever shape `bracket.json` already has. Since the cp-04..cp-07 era
that shape has been seven rounds with empty slot arrays, which forces
`BracketBoard.tsx` into the `slotsPopulated=false` branch and renders
the pre-tournament empty-state copy.

The 2026 World Cup draw is resolved and lives in
`data/raw/wc2026_fixtures.parquet`: 72 group-stage fixtures with
concrete teams and 32 knockout fixtures with bracket-slot placeholders
(e.g. "1A", "2B", "WM73", "BEST3-ABCDF"). Populating `bracket.json`
from that parquet flips the React component to the slots-populated
branch and makes the draw-resolved subtitle visible. This is a
one-shot: the draw is fixed for the tournament, so this script is
intended to be run once. The structural fix (regen script writes the
slots on every run) is deferred to cp-12.

Idempotency
-----------
Re-running the script against an already-populated `bracket.json`
produces byte-identical output (modulo trailing newline). Slots are
keyed by `match_id` from the fixtures parquet and ordered by
`(stage_index, match_id)` so two runs from the same fixtures parquet
yield the same slot list.

Slot schema
-----------
`BracketRoundSchema` accepts `slots: z.array(z.record(z.string(), z.unknown()))`
(see `website/src/lib/data/schemas.ts:277`), so each slot is a free-form
record. We emit a forward-looking shape so downstream consumers
(future bracket renderers, cp-12 structural fix) have everything they
need:

    {
        "slot_id":     "GRP-M01",
        "match_id":    "M01",
        "kickoff_utc": "2026-06-11T19:00:00Z",
        "stage_label": "Group Stage",
        "group":       "A",            # null for knockout slots
        "home":        {"code": "MEX", "label": "Mexico", "placeholder": false},
        "away":        {"code": "RSA", "label": "South Africa", "placeholder": false},
        "venue":       "Estadio Banorte",
        "city":        "Mexico City",
        "country":     "MEX",
        "is_neutral":  true,
    }

For knockout fixtures the home/away `code` is null and `placeholder`
is true; the bracket-slot label from the fixtures parquet
(e.g. "1A", "WM73", "BEST3-ABCDF") is preserved in `label` so the
downstream renderer can show "Winner of Match 73" or "1st place
Group A" when those slots are still pending.

Run
---
    python scripts/backfill_bracket_slots.py

Optional flag:
    --dry-run            print the slot counts and exit without writing

The script preserves the top-level `snapshot_id` field of the existing
`bracket.json` so cross-artifact-consistency contract tests stay green
(see `website/tests/contracts/snapshot.contract.test.ts:349`).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger  # noqa: E402

# Reuse the canonical display-name -> FIFA-code table from the live
# match-outcomes ingestion path so we do not maintain two name maps.
# The fetch_match_outcomes module loads its own dependencies (httpx
# transitively via `requests`); import lazily to keep this script's
# dependency surface narrow at runtime.
from ingestion.fetch_match_outcomes import DISPLAY_NAME_TO_FIFA  # noqa: E402

log = get_logger(__name__)

FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
BRACKET_JSON = (
    PROJECT_ROOT / "website" / "public" / "data" / "latest" / "bracket.json"
)

# Map fixtures-parquet `stage` column values to the seven round codes
# accepted by BracketRoundSchema (website/src/lib/data/schemas.ts:278).
# Order in this dict defines the canonical round order written to
# bracket.json.rounds.
STAGE_TO_ROUND_CODE: dict[str, str] = {
    "Group Stage":    "GRP",
    "Round of 32":    "R32",
    "Round of 16":    "R16",
    "Quarter-final":  "QF",
    "Semi-final":     "SF",
    "Third Place":    "3P",
    "Final":          "FIN",
}

# Patterns that identify a knockout-bracket placeholder rather than a
# concrete team name. The fixtures parquet uses several placeholder
# styles:
#   "1A".."1L", "2A".."2L"      -> 1st/2nd place of group {letter}
#   "BEST3-ABCDF" etc.          -> one of the eight best 3rd-placed
#                                  teams across the listed groups
#   "WM73".."WM102"             -> winner of match {n}
#   "LM101", "LM102"            -> loser of match {n} (used for the
#                                  third-place playoff seeding)
_PLACEHOLDER_PATTERNS = (
    re.compile(r"^[12][A-L]$"),
    re.compile(r"^BEST3-[A-L]+$"),
    re.compile(r"^WM\d{2,3}$"),
    re.compile(r"^LM\d{2,3}$"),
)


def _is_placeholder(label: str) -> bool:
    return any(p.match(label) for p in _PLACEHOLDER_PATTERNS)


def _resolve_team(label: str) -> dict:
    """Build the home/away sub-record for a fixture row.

    Real-team labels resolve to a FIFA 3-letter code via the shared
    DISPLAY_NAME_TO_FIFA table. Placeholder labels (1A, WM73, etc.)
    pass through as `placeholder=True` with `code=None` so a downstream
    renderer can show "winner of M73" or "1st of Group A" instead of
    a country chip. A real team that is missing from the FIFA-code
    table is surfaced loudly: we emit `code=None` and a warning rather
    than silently dropping it, because the team will still need a
    code once the slot renders.
    """
    s = label.strip()
    if _is_placeholder(s):
        return {"code": None, "label": s, "placeholder": True}
    code = DISPLAY_NAME_TO_FIFA.get(s)
    if code is None:
        log.warning(
            "Unmapped team label in fixtures parquet",
            label=s,
        )
    return {"code": code, "label": s, "placeholder": False}


def _kickoff_iso(ts: pd.Timestamp) -> str:
    """ISO-8601 UTC string with a trailing Z.

    The fixtures parquet stores `kickoff_utc` as a tz-aware Timestamp.
    We render as 'YYYY-MM-DDTHH:MM:SSZ' to match the snapshot_id and
    other timestamp shapes the website expects elsewhere.
    """
    # Convert to UTC defensively (the column is already tz-aware UTC
    # in practice; this is a no-op then).
    ts_utc = ts.tz_convert("UTC") if ts.tzinfo is not None else ts.tz_localize("UTC")
    return ts_utc.strftime("%Y-%m-%dT%H:%M:%SZ")


def build_slots(fixtures: pd.DataFrame) -> dict[str, list[dict]]:
    """Group fixtures rows by stage and emit the per-round slot lists.

    Returns a mapping from round code (GRP/R32/.../FIN) to an ordered
    list of slot dicts. Slots are sorted by match_id so two runs from
    the same fixtures parquet produce byte-identical bracket.json.
    """
    slots_by_round: dict[str, list[dict]] = {
        code: [] for code in STAGE_TO_ROUND_CODE.values()
    }
    unknown_stages: set[str] = set()
    for _, row in fixtures.iterrows():
        stage = row["stage"]
        round_code = STAGE_TO_ROUND_CODE.get(stage)
        if round_code is None:
            unknown_stages.add(stage)
            continue
        match_id = row["match_id"]
        slot = {
            "slot_id":     f"{round_code}-{match_id}",
            "match_id":    match_id,
            "kickoff_utc": _kickoff_iso(row["kickoff_utc"]),
            "stage_label": stage,
            "group":       (row["group"] if pd.notna(row["group"]) else None),
            "home":        _resolve_team(row["team_home"]),
            "away":        _resolve_team(row["team_away"]),
            "venue":       row["venue"],
            "city":        row["city"],
            "country":     row["country"],
            "is_neutral":  bool(row["is_neutral"]),
        }
        slots_by_round[round_code].append(slot)
    if unknown_stages:
        log.warning(
            "Fixtures parquet contained unknown stages (skipped)",
            stages=sorted(unknown_stages),
        )
    for code, lst in slots_by_round.items():
        lst.sort(key=lambda s: s["match_id"])
    return slots_by_round


def build_bracket_doc(
    existing: dict, slots_by_round: dict[str, list[dict]]
) -> dict:
    """Return a new bracket.json doc with populated slots.

    Preserves the existing snapshot_id so cross-artifact contract
    tests (snapshot_id consistency) stay green. The rounds list is
    written in the canonical order defined by STAGE_TO_ROUND_CODE.
    """
    snapshot_id = existing.get("snapshot_id", "")
    rounds = [
        {"round": code, "slots": slots_by_round[code]}
        for code in STAGE_TO_ROUND_CODE.values()
    ]
    return {"snapshot_id": snapshot_id, "rounds": rounds}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the slot counts and exit without writing bracket.json.",
    )
    args = parser.parse_args()

    if not FIXTURES_PARQUET.exists():
        log.error("Fixtures parquet not found", path=str(FIXTURES_PARQUET))
        raise SystemExit(2)
    if not BRACKET_JSON.exists():
        log.error("bracket.json not found at the expected path", path=str(BRACKET_JSON))
        raise SystemExit(2)

    log.stage("Reading fixtures parquet", path=str(FIXTURES_PARQUET))
    fixtures = pd.read_parquet(FIXTURES_PARQUET)
    log.info("Fixtures loaded", rows=len(fixtures))

    slots_by_round = build_slots(fixtures)
    total = sum(len(v) for v in slots_by_round.values())
    for code in STAGE_TO_ROUND_CODE.values():
        log.info("Slots per round", round=code, count=len(slots_by_round[code]))
    log.info("Total slots", count=total)

    existing = json.loads(BRACKET_JSON.read_text())
    new_doc = build_bracket_doc(existing, slots_by_round)

    if args.dry_run:
        log.info("--dry-run set; not writing bracket.json")
        return

    BRACKET_JSON.write_text(json.dumps(new_doc, indent=2) + "\n")
    log.success("Wrote bracket.json", path=str(BRACKET_JSON), total_slots=total)


if __name__ == "__main__":
    main()
