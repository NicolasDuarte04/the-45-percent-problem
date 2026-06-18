"""
scripts/build_wc2026_schedule.py
================================
cp-19. Re-source the WC 2026 kickoff schedule from Football-Data.org and bake
the corrected per-match kickoffs into the single source of truth.

Why this exists
---------------
The per-group anchors in `website/src/lib/data/wc2026-official-draw.ts` plus a
uniform +5d/+10d matchday shift only *approximate* the real schedule: matchday
2/3 fixtures were "~1-3 days off" and a few matchday-1 anchors were entered with
the wrong clock time. Matchups are correct (verified against the 5 Dec 2025
draw); the kickoff timestamps were not. This script replaces the approximation
with the exact published kickoffs.

It does NOT touch scoring, settled-detection, the ledger, or the frozen batch.
Those read real results from `match_outcomes`, not these display kickoffs.

Source & mapping
----------------
Football-Data.org v4 `/competitions/WC/matches` (the same feed the project
already trusts for settled results). Unlike `fetch_match_outcomes.py`, this
pulls every status, not just FINISHED, so upcoming fixtures carry their
`utcDate`.

  - Group fixtures (M01-M72): joined to canonical match ids by the unordered
    team-code pair, which is unique within the group stage. Authoritative.
  - Knockout fixtures (M73-M104): teams are TBD in the feed, so they are mapped
    best-effort by (round, chronological order) and flagged for re-verification
    once the bracket resolves. They do not appear on the public matches listing
    (72 group fixtures only), so a wrong knockout time is low-stakes and is
    confirmed before the knockouts actually matter.

Verification gate
-----------------
Before anything is written, the FD-derived kickoffs are checked against a table
of known-official anchors (`OFFICIAL_ANCHORS`). Any mismatch is a HARD STOP
(`VerificationError`) so a bad feed can never publish wrong times.

Outputs (the same map, two consumers)
-------------------------------------
  data/raw/wc2026_kickoffs.json             python/regen overlay source
  website/src/lib/data/wc2026-kickoffs.ts   website SSOT override (imported by
                                            wc2026-official-draw.ts)

Run
---
  python scripts/build_wc2026_schedule.py                 # live FD (needs key)
  python scripts/build_wc2026_schedule.py --fixture PATH  # offline / test
  python scripts/build_wc2026_schedule.py --check         # verify only, no write
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ingestion.fetch_match_outcomes import (  # noqa: E402
    FOOTBALL_DATA_BASE,
    FOOTBALL_DATA_COMP_CODE,
    STAGE_MAP,
    _http_get_json,
    to_fifa_code,
)
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

CANONICAL_DRAW_JSON = PROJECT_ROOT / "data" / "raw" / "wc2026_official_draw.json"
KICKOFFS_JSON = PROJECT_ROOT / "data" / "raw" / "wc2026_kickoffs.json"
KICKOFFS_TS = (
    PROJECT_ROOT / "website" / "src" / "lib" / "data" / "wc2026-kickoffs.ts"
)
# Published per-match JSON: the baseline the diff report compares FD against, so
# a reviewer sees which live kickoffs FD would move and by how much.
PUBLISHED_MATCHES_DIR = (
    PROJECT_ROOT / "website" / "public" / "data" / "latest" / "matches"
)
# Moves at or above this many minutes are flagged for human review.
DIFF_FLAG_MINUTES = 30

# Canonical draw round code -> a stage key shared with FD's STAGE_MAP values.
DRAW_ROUND_TO_KEY: dict[str, str] = {
    "R32": "r32",
    "R16": "r16",
    "QF": "qf",
    "SF": "sf",
    "3P": "3p",
    "FIN": "final",
}

# FD third-place label is absent from the outcomes STAGE_MAP (that pipeline
# ignores it); add it here for the schedule join.
KO_STAGE_MAP: dict[str, str] = {**STAGE_MAP, "THIRD_PLACE": "3p"}

# Known-official kickoffs (UTC) used as the publish gate. These come from the
# official Dec 2025 draw schedule (operator-confirmed); any FD-vs-official
# mismatch on these aborts the build before a single file is written.
OFFICIAL_ANCHORS: dict[str, str] = {
    "M23": "2026-06-17T20:00:00Z",  # England v Croatia
    "M24": "2026-06-17T23:00:00Z",  # Ghana v Panama
    # M25 was 03:00Z from imperfect early research; the verified-true kickoff
    # is 01:00Z on 19 Jun (21:00 ET 18 Jun / 19:00 Guadalajara), which is also
    # what Football-Data returns. Corrected so the gate checks the real time.
    "M25": "2026-06-19T01:00:00Z",  # Mexico v Korea Republic
}


class VerificationError(RuntimeError):
    """Raised when FD-sourced kickoffs disagree with the official anchors."""


# =============================================================================
# Fetch
# =============================================================================


def fetch_fd_schedule(api_key: str) -> dict[str, Any]:
    """Fetch every WC 2026 fixture (all statuses) from Football-Data.org."""
    url = f"{FOOTBALL_DATA_BASE}/competitions/{FOOTBALL_DATA_COMP_CODE}/matches"
    return _http_get_json(url, {"X-Auth-Token": api_key})


def load_fixture(path: Path) -> dict[str, Any]:
    """Load a captured FD payload from disk (offline / test mode)."""
    return json.loads(path.read_text())


# =============================================================================
# Mapping
# =============================================================================


def _to_z(iso: str) -> str:
    """Coerce any ISO 8601 timestamp to a second-precision Z-suffixed UTC form."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _team_name(side: Optional[dict[str, Any]]) -> Optional[str]:
    if not side:
        return None
    return side.get("name") or side.get("shortName") or side.get("tla")


def build_kickoff_map(
    fd_payload: dict[str, Any], draw: dict[str, Any]
) -> dict[str, str]:
    """Map FD fixtures onto canonical match ids -> kickoff (UTC, Z form).

    Group fixtures are joined by the unordered team-code pair; knockout
    fixtures by (round, chronological order). Returns the merged map; entries
    that cannot be resolved are skipped (the consumer falls back to the
    anchor-derived time for those ids).
    """
    matches = fd_payload.get("matches", [])

    # --- Group stage: unordered team-code pair is unique within the group ---
    pair_to_id: dict[frozenset[str], str] = {}
    for m in draw.get("group_matches", []):
        pair_to_id[frozenset((m["home_code"], m["away_code"]))] = m["match_id"]

    kmap: dict[str, str] = {}
    ko_by_round: dict[str, list[tuple[str, str]]] = {}

    for m in matches:
        stage = (m.get("stage") or "").upper()
        utc = m.get("utcDate")
        if not utc:
            continue
        if KO_STAGE_MAP.get(stage) == "group" or stage == "GROUP_STAGE":
            home = to_fifa_code(_team_name(m.get("homeTeam")) or "")
            away = to_fifa_code(_team_name(m.get("awayTeam")) or "")
            if not home or not away:
                log.warning("Unmapped group teams", stage=stage, utc=utc)
                continue
            mid = pair_to_id.get(frozenset((home, away)))
            if mid is None:
                log.warning("No canonical id for pair", home=home, away=away)
                continue
            kmap[mid] = _to_z(utc)
        elif stage in KO_STAGE_MAP:
            ko_by_round.setdefault(KO_STAGE_MAP[stage], []).append(
                (utc, m.get("id", utc))
            )

    # --- Knockouts: zip FD rounds (by kickoff order) onto canonical ids ---
    canon_by_round: dict[str, list[str]] = {}
    for m in draw.get("knockout_matches", []):
        key = DRAW_ROUND_TO_KEY.get(m["round"])
        if key is None:
            continue
        canon_by_round.setdefault(key, []).append((m["kickoff_utc"], m["match_id"]))

    for key, canon in canon_by_round.items():
        fd_round = sorted(ko_by_round.get(key, []), key=lambda t: t[0])
        canon_ids = [mid for _, mid in sorted(canon, key=lambda t: t[1])]
        if fd_round and len(fd_round) != len(canon_ids):
            log.warning(
                "Knockout round count mismatch (best-effort map)",
                round=key,
                fd=len(fd_round),
                canonical=len(canon_ids),
            )
        for (utc, _), mid in zip(fd_round, canon_ids):
            kmap[mid] = _to_z(utc)

    return kmap


def verify_anchors(
    kmap: dict[str, str], anchors: dict[str, str] = OFFICIAL_ANCHORS
) -> None:
    """Hard-stop unless every official anchor is present and exact in `kmap`."""
    problems: list[str] = []
    for mid, expected in anchors.items():
        got = kmap.get(mid)
        if got is None:
            problems.append(f"{mid}: missing from FD-sourced map")
        elif _to_z(got) != _to_z(expected):
            problems.append(f"{mid}: FD={got} != official={expected}")
    if problems:
        raise VerificationError(
            "FD schedule failed the official-anchor gate; refusing to write. "
            + "; ".join(problems)
        )
    log.success("Anchor verification passed", anchors=len(anchors))


def anchor_results(
    kmap: dict[str, str], anchors: dict[str, str] = OFFICIAL_ANCHORS
) -> list[dict[str, Any]]:
    """Every anchor check (pass and fail), so report mode shows the full list."""
    rows: list[dict[str, Any]] = []
    for mid, expected in anchors.items():
        got = kmap.get(mid)
        ok = got is not None and _to_z(got) == _to_z(expected)
        rows.append({"match_id": mid, "fd": got, "anchor": expected, "ok": ok})
    return rows


def _published_baseline() -> dict[str, str]:
    """Currently-published kickoffs (match_id -> Z), the diff baseline."""
    baseline: dict[str, str] = {}
    if not PUBLISHED_MATCHES_DIR.exists():
        return baseline
    for jf in sorted(PUBLISHED_MATCHES_DIR.glob("*.json")):
        try:
            doc = json.loads(jf.read_text())
            if doc.get("kickoff_utc"):
                baseline[doc["match_id"]] = _to_z(doc["kickoff_utc"])
        except (ValueError, KeyError):
            continue
    return baseline


def diff_vs_published(kmap: dict[str, str]) -> list[dict[str, Any]]:
    """FD-vs-previously-published moves, largest first.

    Only matches that already have a published kickoff are compared (the public
    listing is the 72 group fixtures). Each row carries the delta in minutes and
    whether it crosses the review threshold.
    """
    baseline = _published_baseline()
    rows: list[dict[str, Any]] = []
    for mid, new in kmap.items():
        prev = baseline.get(mid)
        if prev is None:
            continue
        delta_min = round(
            (datetime.fromisoformat(_to_z(new).replace("Z", "+00:00"))
             - datetime.fromisoformat(prev.replace("Z", "+00:00"))).total_seconds()
            / 60
        )
        if delta_min == 0:
            continue
        rows.append(
            {
                "match_id": mid,
                "previous": prev,
                "fd": _to_z(new),
                "delta_min": delta_min,
                "flag": abs(delta_min) >= DIFF_FLAG_MINUTES,
            }
        )
    rows.sort(key=lambda r: abs(r["delta_min"]), reverse=True)
    return rows


def report(kmap: dict[str, str]) -> None:
    """Report-all: print every anchor check and every FD-vs-published move.

    Writes nothing and never raises on an anchor mismatch, so the full scope is
    visible before deciding how to fix. A flagged move (>= DIFF_FLAG_MINUTES) is
    a prompt for human review, not a hard stop.
    """
    print("\n=== Anchor checks (FD vs official) ===")
    for r in anchor_results(kmap):
        status = "OK" if r["ok"] else "MISMATCH"
        print(f"  [{status}] {r['match_id']}: FD={r['fd']} official={r['anchor']}")

    moves = diff_vs_published(kmap)
    flagged = [m for m in moves if m["flag"]]
    print(
        f"\n=== FD vs published kickoffs: {len(moves)} moved, "
        f"{len(flagged)} over {DIFF_FLAG_MINUTES} min ==="
    )
    for m in moves:
        mark = "FLAG" if m["flag"] else "    "
        sign = "+" if m["delta_min"] > 0 else ""
        print(
            f"  {mark} {m['match_id']}: {m['previous']} -> {m['fd']} "
            f"({sign}{m['delta_min']} min)"
        )
    print("")


# =============================================================================
# Output
# =============================================================================

_TS_HEADER = """\
/**
 * Per-match kickoff overrides (UTC), keyed by canonical match id ("M01".."M104").
 *
 * GENERATED ARTIFACT - do not edit by hand (hand edits drift back on the next
 * regen). Authoritative kickoff times sourced from Football-Data.org
 * (`/competitions/WC/matches`) and verified against the official FIFA schedule
 * by `scripts/build_wc2026_schedule.py`. Regenerate with the live feed (the FD
 * key only exists in the regen environment):
 *
 *   python scripts/build_wc2026_schedule.py
 *
 * A match id absent from the map falls back to the anchor-derived time in
 * `wc2026-official-draw.ts`, so a partial map is always strictly an
 * improvement. Group fixtures (M01-M72) are authoritative; knockout fixtures
 * (M73-M104) are best-effort by round + chronological order while teams are
 * TBD, and do not appear on the public matches listing.
 */
export const KICKOFF_OVERRIDES: Record<string, string> = {
"""


def write_outputs(kmap: dict[str, str]) -> None:
    """Write the kickoff map to both consumers (python JSON + website TS)."""
    ordered = {mid: kmap[mid] for mid in sorted(kmap, key=_match_sort_key)}

    payload = {
        "_comment": (
            "Authoritative per-match kickoff overrides (UTC), keyed by canonical "
            "match id. GENERATED by scripts/build_wc2026_schedule.py from "
            "Football-Data.org (/competitions/WC/matches), verified against the "
            "official FIFA schedule. The website mirror is "
            "website/src/lib/data/wc2026-kickoffs.ts; the two must agree. "
            "Consumed by the snapshot regen to heal the carried-forward "
            "matches/*.json kickoffs. Do not edit by hand."
        ),
        "_source": "football-data.org v4 /competitions/WC/matches",
        "kickoffs": ordered,
    }
    KICKOFFS_JSON.write_text(json.dumps(payload, indent=2) + "\n")
    log.success("Wrote kickoff map", path=str(KICKOFFS_JSON), n=len(ordered))

    lines = [_TS_HEADER]
    for mid, iso in ordered.items():
        lines.append(f'  {mid}: "{iso}",\n')
    lines.append("};\n")
    KICKOFFS_TS.write_text("".join(lines))
    log.success("Wrote website override", path=str(KICKOFFS_TS), n=len(ordered))


def _match_sort_key(mid: str) -> int:
    """Sort 'M07' before 'M12' numerically rather than lexically."""
    try:
        return int(mid.lstrip("M"))
    except ValueError:
        return 0


# =============================================================================
# Orchestration
# =============================================================================


def run(
    fixture: Optional[Path] = None,
    check_only: bool = False,
    report_only: bool = False,
) -> dict[str, str]:
    if not CANONICAL_DRAW_JSON.exists():
        raise FileNotFoundError(
            f"Canonical draw JSON not found at {CANONICAL_DRAW_JSON}. "
            "Regenerate it first: pnpm tsx website/scripts/export-canonical-draw-json.ts"
        )
    draw = json.loads(CANONICAL_DRAW_JSON.read_text())

    if fixture is not None:
        log.info("Loading FD fixture", path=str(fixture))
        payload = load_fixture(fixture)
    else:
        api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
        if not api_key:
            raise RuntimeError(
                "FOOTBALL_DATA_API_KEY not set. The live key exists only in the "
                "regen environment; locally pass --fixture with a captured payload."
            )
        payload = fetch_fd_schedule(api_key)

    kmap = build_kickoff_map(payload, draw)
    log.info("Built kickoff map", matches=len(kmap))

    # Report-all: surface every anchor check and every FD-vs-published move
    # without applying the hard gate or writing anything.
    if report_only:
        report(kmap)
        log.success("Report complete; no files written", matches=len(kmap))
        return kmap

    verify_anchors(kmap)

    if check_only:
        log.success("Check passed; no files written", matches=len(kmap))
        return kmap

    # Surface the FD-vs-published diff on the publish path too, as a review
    # artifact (informational; the anchor gate above is the hard stop).
    report(kmap)
    write_outputs(kmap)
    return kmap


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Re-source WC 2026 kickoffs from Football-Data and bake them in."
    )
    parser.add_argument(
        "--fixture",
        type=Path,
        default=None,
        help="Path to a captured FD payload JSON (offline / test). "
        "Omit to fetch live (needs FOOTBALL_DATA_API_KEY).",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify the anchor gate only; do not write any files.",
    )
    parser.add_argument(
        "--report",
        action="store_true",
        help="Report-all: print every anchor check and every FD-vs-published "
        "move, write nothing, and never fail on a mismatch. Use to see scope "
        "before publishing.",
    )
    args = parser.parse_args()
    try:
        run(fixture=args.fixture, check_only=args.check, report_only=args.report)
    except VerificationError as exc:
        log.error("Verification failed", error=str(exc))
        raise SystemExit(2)


if __name__ == "__main__":
    main()
