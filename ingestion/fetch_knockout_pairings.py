"""
ingestion/fetch_knockout_pairings.py
====================================
cp-17 Stage 2b. Read-only ingestion of CONCRETE knockout pairings from the
Football-Data.org schedule feed.

Why this exists (Option 1, established in the Stage 2 inspection)
----------------------------------------------------------------
The repo's R32 slot descriptors were internally corrupt at the time this was
written (``1A`` appeared in two R32 matches, ``2C`` twice, ``2G`` / ``2K``
nowhere); cp-27 later repaired that winner/runner-up bijection (M76 2C->2G,
M79 1A->2K). But there is still no best-3rd allocation table for the 12-group
2026 format, so resolving the full bracket ourselves remains unreliable. We do
not. Reality already resolves the pairings: once the bracket draws,
Football-Data.org's
``/competitions/WC/matches`` feed carries a concrete ``homeTeam`` / ``awayTeam``
for each knockout fixture. This script reads that feed and records only the
matches whose BOTH sides are concrete, into a NEW namespace. It never touches
the corrupt descriptors and never invents an allocation table.

Scope and isolation (non-negotiable)
------------------------------------
- READ-ONLY learning of who plays whom. This is NOT a results source.
- Writes ONLY to ``data/live/knockout_pairings.json`` (a new namespace). It
  never writes ``match_outcomes`` and never alters
  ``ingestion/fetch_match_outcomes.py``'s FINISHED-only settled stream. The
  graded settled / conditioning path (``simulation/load_settled.py``) is
  untouched.
- A knockout match is "concrete" when the feed gives BOTH teams (and both map
  to a FIFA code). Until then it does not appear here, so the downstream
  per-match surface shows nothing for it.

Output shape
------------
``data/live/knockout_pairings.json``::

    {
      "schedule_feed": {"source": "...", "fetched_at_utc": "...Z"},
      "competition": "WC2026",
      "count": <n concrete pairings>,
      "pairings": [
        {
          "match_id": "KO-FD<source_id>",
          "source_id": <int>,
          "round": "R32" | "R16" | "QF" | "SF" | "3P" | "FIN",
          "status": "SCHEDULED" | "TIMED" | "IN_PLAY" | "FINISHED" | ...,
          "kickoff_utc": "...Z",
          "home": {"fifa_code": "USA", "source_name": "United States"},
          "away": {"fifa_code": "ITA", "source_name": "Italy"}
        },
        ...
      ]
    }

The ``match_id`` is namespaced ``KO-FD<source_id>`` so it never collides with the
canonical ``M73``..``M104`` ids that carry the corrupt descriptors. We deliberately
do NOT map onto those canonical ids.

Usage
-----
  python ingestion/fetch_knockout_pairings.py                 # live FD (needs key)
  python ingestion/fetch_knockout_pairings.py --from-file P   # offline capture
  python ingestion/fetch_knockout_pairings.py --dry-run       # print, do not write

Environment
-----------
  FOOTBALL_DATA_API_KEY   API key for football-data.org v4. Required unless
                          --from-file is given.
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

from utils.logger import get_logger  # noqa: E402
from ingestion.fetch_match_outcomes import (  # noqa: E402
    FOOTBALL_DATA_BASE,
    FOOTBALL_DATA_COMP_CODE,
    STAGE_MAP,
    _http_get_json,
    to_fifa_code,
)

log = get_logger(__name__)

# Default output: a NEW namespace, distinct from data/snapshots/ (append-only
# graded logs) and from data/processed/match_outcomes.parquet (settled stream).
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "live" / "knockout_pairings.json"

# Football-Data stage label -> canonical website round code. STAGE_MAP (shared
# with the outcomes ingestion) yields lowercase keys; the website schema and the
# per-match surface use the upper-case canonical codes below. Every non-group
# STAGE_MAP value must have an entry here, since the dict comprehension below
# looks each one up: the third-place playoff ("3p", added to STAGE_MAP in cp-43)
# maps to the "3P" round code, matching the existing uppercase display code.
_STAGE_TO_ROUND: dict[str, str] = {
    "r32": "R32",
    "r16": "R16",
    "qf": "QF",
    "sf": "SF",
    "3p": "3P",
    "final": "FIN",
}
# Knockout stage raw labels we accept from the feed. Group stage is explicitly
# excluded: this script learns knockout pairings only. THIRD_PLACE resolves
# through STAGE_MAP ("3p") and then _STAGE_TO_ROUND ("3P") like any other
# knockout label, so no special-case entry is needed.
_KO_STAGE_RAW_TO_ROUND: dict[str, str] = {
    raw: _STAGE_TO_ROUND[key]
    for raw, key in STAGE_MAP.items()
    if key != "group"
}


def _to_z(iso: str) -> str:
    """Coerce an ISO 8601 timestamp to a second-precision Z-suffixed UTC form."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _team_name(side: Optional[dict[str, Any]]) -> Optional[str]:
    """Return a usable team name from an FD side object, or None when TBD.

    Pre-resolution knockout fixtures carry ``homeTeam: null`` (or an object
    whose name fields are all null). Both forms collapse to None here so the
    pairing is treated as not-yet-concrete and skipped.
    """
    if not side:
        return None
    name = side.get("name") or side.get("shortName") or side.get("tla")
    return name or None


# =============================================================================
# Fetch
# =============================================================================


def fetch_fd_matches(api_key: str) -> dict[str, Any]:
    """Fetch every WC 2026 fixture (ALL statuses) from Football-Data.org.

    The outcomes ingestion fetches ``?status=FINISHED``; here we intentionally
    pull every status so SCHEDULED / TIMED knockout fixtures, which carry the
    freshly-drawn concrete teams before kickoff, are visible.
    """
    url = f"{FOOTBALL_DATA_BASE}/competitions/{FOOTBALL_DATA_COMP_CODE}/matches"
    return _http_get_json(url, {"X-Auth-Token": api_key})


def load_payload_file(path: Path) -> dict[str, Any]:
    """Load a captured FD payload from disk (offline / test mode)."""
    return json.loads(Path(path).read_text())


# =============================================================================
# Build
# =============================================================================


def build_pairings(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract the concrete knockout pairings from an FD matches payload.

    A pairing is kept only when its stage is a knockout round AND both teams are
    concrete (present in the feed and mappable to a FIFA code). Group matches and
    any knockout fixture still showing a TBD placeholder are skipped. Returns the
    pairings sorted by (kickoff_utc, source_id) for a stable, diffable output.
    """
    matches = payload.get("matches", [])
    pairings: list[dict[str, Any]] = []
    skipped_unresolved = 0

    for m in matches:
        stage_raw = (m.get("stage") or "").upper()
        round_code = _KO_STAGE_RAW_TO_ROUND.get(stage_raw)
        if round_code is None:
            # Group stage or an unknown stage: not in scope for this learner.
            continue

        utc = m.get("utcDate")
        home_name = _team_name(m.get("homeTeam"))
        away_name = _team_name(m.get("awayTeam"))
        if not utc or not home_name or not away_name:
            skipped_unresolved += 1
            continue

        home_code = to_fifa_code(home_name)
        away_code = to_fifa_code(away_name)
        if home_code is None or away_code is None:
            log.warning(
                "Unmapped knockout team; skipped",
                stage=stage_raw,
                home=home_name,
                away=away_name,
            )
            skipped_unresolved += 1
            continue

        source_id = m.get("id")
        pairings.append(
            {
                "match_id": f"KO-FD{source_id}",
                "source_id": source_id,
                "round": round_code,
                "status": m.get("status"),
                "kickoff_utc": _to_z(utc),
                "home": {"fifa_code": home_code, "source_name": home_name},
                "away": {"fifa_code": away_code, "source_name": away_name},
            }
        )

    pairings.sort(key=lambda p: (p["kickoff_utc"], str(p["source_id"])))
    log.info(
        "Concrete knockout pairings extracted",
        concrete=len(pairings),
        skipped_unresolved=skipped_unresolved,
    )
    return pairings


def build_document(
    pairings: list[dict[str, Any]],
    source_label: str,
    fetched_at_utc: str,
) -> dict[str, Any]:
    """Wrap the pairings list in the provenance-stamped output document."""
    return {
        "schedule_feed": {
            "source": source_label,
            "fetched_at_utc": fetched_at_utc,
        },
        "competition": "WC2026",
        "count": len(pairings),
        "pairings": pairings,
    }


# =============================================================================
# Orchestration
# =============================================================================


def run(
    *,
    from_file: Optional[Path] = None,
    out_path: Optional[Path] = None,
    dry_run: bool = False,
    allow_empty_overwrite: bool = False,
) -> int:
    """Fetch the schedule feed, extract concrete knockout pairings, write JSON.

    Returns a process exit code (0 on success). Live fetch needs
    FOOTBALL_DATA_API_KEY; --from-file reads a captured payload for offline /
    test use and needs no key.

    cp-20 durability: once the draw is set, the concrete-pairing count only ever
    grows and then plateaus; it never legitimately falls back to zero. So when a
    fetch yields zero concrete pairings but a populated file already exists on
    disk, the existing file is kept rather than overwritten, so a transient feed
    can never blank the knockout cards the regen rebuilds from it. Pass
    allow_empty_overwrite=True to force the write (an intentional reset).
    """
    log.stage("=== fetch_knockout_pairings (cp-17 Stage 2b) ===")

    fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if from_file is not None:
        payload = load_payload_file(from_file)
        source_label = f"file:{Path(from_file).name}"
    else:
        api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
        if not api_key:
            log.error("FOOTBALL_DATA_API_KEY not set (and no --from-file).")
            return 2
        try:
            payload = fetch_fd_matches(api_key)
        except Exception as exc:  # network/HTTP errors are non-fatal to the caller
            log.error("FD fetch failed", err=str(exc))
            return 3
        source_label = (
            f"football-data.org/v4/competitions/{FOOTBALL_DATA_COMP_CODE}/matches"
        )

    pairings = build_pairings(payload)
    doc = build_document(pairings, source_label, fetched_at)

    if dry_run:
        sys.stdout.write(json.dumps(doc, indent=2) + "\n")
        log.info("Dry run; nothing written", concrete=len(pairings))
        return 0

    out = Path(out_path) if out_path is not None else DEFAULT_OUTPUT

    # cp-20 durability guard: never let a fetch that found zero concrete pairings
    # wipe a file that already holds some. The knockout surface is rebuilt from
    # this file on every regen, so a transient empty feed must not blank the
    # cards. A genuine reset can still be forced with --allow-empty-overwrite.
    if not allow_empty_overwrite and len(pairings) == 0 and out.exists():
        try:
            existing_count = int(json.loads(out.read_text()).get("count", 0))
        except Exception:
            existing_count = 0
        if existing_count > 0:
            log.warning(
                "Fetch found 0 concrete pairings; keeping existing populated file",
                path=str(out),
                existing_count=existing_count,
            )
            return 0

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=2) + "\n")
    log.success(
        "Knockout pairings written",
        path=str(out),
        concrete=len(pairings),
    )
    return 0


# =============================================================================
# CLI
# =============================================================================


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch concrete WC 2026 knockout pairings from the schedule feed.",
    )
    parser.add_argument(
        "--from-file",
        type=Path,
        default=None,
        help="Read a captured FD payload from disk instead of calling the API.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Override the output path (default: data/live/knockout_pairings.json).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the document to stdout but do not write a file.",
    )
    parser.add_argument(
        "--allow-empty-overwrite",
        action="store_true",
        help="Write even a zero-pairing result over an existing populated file "
        "(an intentional reset). Off by default so a transient empty feed cannot "
        "blank the knockout cards.",
    )
    args = parser.parse_args()
    sys.exit(
        run(
            from_file=args.from_file,
            out_path=args.out,
            dry_run=args.dry_run,
            allow_empty_overwrite=args.allow_empty_overwrite,
        )
    )
