"""
ingestion/fetch_match_outcomes.py
=================================
Checkpoint 15 (UX rollout). Live WC 2026 match-outcome ingestion.

Hourly cron during the tournament window. Pulls newly-finished matches
from Football-Data.org, normalises team names to FIFA 3-letter codes,
maps the dataset's stage labels to the schema used by match_outcomes
(group / r32 / r16 / qf / sf / 3p / final), and POSTs each batch to the
website's bearer-authenticated ingest endpoint at
`/api/ingest/match-outcomes`.

Local state lives in `data/snapshots/ingested_match_outcomes.jsonl`
(append-only). Each line records a settled (matchId, source_id,
ingested_at) triple so re-runs do not re-POST already-ingested matches.

Why Football-Data.org? Free tier (10 req/min). Stable JSON schema.
Covers the FIFA World Cup (competition code WC). API-FOOTBALL is the
backup if Football-Data.org loses WC 2026 coverage; ESPN's public
scoreboard requires HTML scraping and is held in reserve.

Usage
-----
  python ingestion/fetch_match_outcomes.py --dev-sandbox
  python ingestion/fetch_match_outcomes.py --dry-run             # fetch & print, no POST
  python ingestion/fetch_match_outcomes.py --force --dev-sandbox # re-fetch all settled
  python ingestion/fetch_match_outcomes.py                       # CI only (no sandbox)

Environment
-----------
  FOOTBALL_DATA_API_KEY   API key for football-data.org v4. Required.
  INGEST_TOKEN            Bearer token for the website ingest endpoint.
                          Required unless --dry-run is set.
  SITE_URL                Base URL of the website. Defaults to
                          https://45analytics.com.
  CI                      Set to "true" in CI. The --dev-sandbox guard
                          uses this to decide whether to allow writes to
                          data/snapshots/.

Tournament window
-----------------
The script short-circuits (exit 0, log "no tournament window") outside
the June 11 - July 19, 2026 window plus a 3-day buffer on each side.
The GitHub Action runs hourly all year; the window gate keeps the
script free of API calls outside that range.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
from typing import Any

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.hasher import DataSnapshotHasher, SnapshotRegistry  # noqa: E402
from utils.logger import get_logger  # noqa: E402
from ingestion.fetch_historical_matches import (  # noqa: E402
    TEAM_NAME_MAP,
    standardise_team,
)

log = get_logger(__name__)

# =============================================================================
# Constants
# =============================================================================

FOOTBALL_DATA_BASE = "https://api.football-data.org/v4"
# Competition code for the FIFA World Cup on football-data.org. The v4
# /competitions/WC/matches endpoint returns the current tournament's
# fixtures when in season.
FOOTBALL_DATA_COMP_CODE = "WC"

# Tournament window. The official WC 2026 schedule runs June 11 to
# July 19, 2026. A 3-day buffer on each side covers operational quirks
# (delayed kickoffs, replays, the post-final settlement window).
WINDOW_START = date(2026, 6, 8)
WINDOW_END = date(2026, 7, 22)

# Match the website route's hard cap.
MAX_BATCH = 50

INGEST_LOG_NAME = "ingested_match_outcomes.jsonl"
DEFAULT_SITE_URL = "https://45analytics.com"

# =============================================================================
# Team name normalisation
# =============================================================================

# Football-Data.org publishes long-form English names (e.g. "Spain",
# "United States"). The website canonical scheme uses FIFA 3-letter
# codes. We standardise through TEAM_NAME_MAP first (which yields
# project-canonical display names) and then map display name to FIFA
# code with the table below. The codes are the same set published in
# website/src/lib/data/wc2026-official-draw.ts; mapping is many-to-one
# from the various source spellings of each team into a single FIFA
# code, so the mapping does not duplicate TEAM_NAME_MAP's purpose.
DISPLAY_NAME_TO_FIFA: dict[str, str] = {
    # Pot 1 hosts and confederation champions
    "Mexico": "MEX",
    "Canada": "CAN",
    "USA": "USA",
    "United States": "USA",
    "Brazil": "BRA",
    "Argentina": "ARG",
    "France": "FRA",
    "Spain": "ESP",
    "England": "ENG",
    "Germany": "GER",
    "Belgium": "BEL",
    "Netherlands": "NED",
    "Portugal": "POR",
    # Pot 2 / 3
    "South Africa": "RSA",
    "Bosnia & Herzegovina": "BIH",
    "Bosnia and Herzegovina": "BIH",
    "Morocco": "MAR",
    "Paraguay": "PAR",
    "Curaçao": "CUW",
    "Curacao": "CUW",
    "Japan": "JPN",
    "Sweden": "SWE",
    "Egypt": "EGY",
    "Cape Verde": "CPV",
    "Cabo Verde": "CPV",
    "Senegal": "SEN",
    "Algeria": "ALG",
    "Uzbekistan": "UZB",
    "Croatia": "CRO",
    # Pot 3 (extra)
    "South Korea": "KOR",
    "Korea Republic": "KOR",
    "Qatar": "QAT",
    "Haiti": "HAI",
    "Australia": "AUS",
    "Côte d'Ivoire": "CIV",
    "Cote d'Ivoire": "CIV",
    "Ivory Coast": "CIV",
    "Tunisia": "TUN",
    "Iran": "IRN",
    "IR Iran": "IRN",
    "Saudi Arabia": "KSA",
    "Iraq": "IRQ",
    "Austria": "AUT",
    "Colombia": "COL",
    "Ghana": "GHA",
    # Pot 4
    "Czechia": "CZE",
    "Czech Republic": "CZE",
    "Switzerland": "SUI",
    "Scotland": "SCO",
    "Turkey": "TUR",
    "Türkiye": "TUR",
    "Ecuador": "ECU",
    "New Zealand": "NZL",
    "Uruguay": "URU",
    "Norway": "NOR",
    "Jordan": "JOR",
    "DR Congo": "COD",
    "Congo DR": "COD",
    "Panama": "PAN",
}


def to_fifa_code(source_name: str) -> str | None:
    """Map a source-side team name to a FIFA 3-letter code.

    The function first standardises through TEAM_NAME_MAP from
    fetch_historical_matches (the project's canonical display-name
    normaliser), then resolves the display name to a FIFA code via the
    DISPLAY_NAME_TO_FIFA table above. Returns None when no mapping is
    available; callers should log a warning and skip the match rather
    than POSTing an unmapped outcome.
    """
    display = standardise_team(source_name)
    code = DISPLAY_NAME_TO_FIFA.get(display) or DISPLAY_NAME_TO_FIFA.get(source_name.strip())
    if code is None:
        # Last-resort: try a raw upper-case acronym match for cases
        # like "USA" or "GER" appearing already as codes.
        candidate = source_name.strip().upper()
        if len(candidate) == 3 and candidate.isalpha():
            return candidate
    return code


# =============================================================================
# Stage mapping
# =============================================================================

# Football-Data.org stage labels (v4 schema) to the website's
# match_outcomes schema. The website knockout schema mirrors WC 2026's
# Round of 32 entrant tree.
STAGE_MAP: dict[str, str] = {
    "GROUP_STAGE": "group",
    "LAST_32": "r32",
    "ROUND_OF_32": "r32",
    "LAST_16": "r16",
    "ROUND_OF_16": "r16",
    "QUARTER_FINALS": "qf",
    "QUARTER_FINAL": "qf",
    "SEMI_FINALS": "sf",
    "SEMI_FINAL": "sf",
    # cp-43: the third-place playoff. Football-Data v4 labels this match
    # THIRD_PLACE, distinct from every other knockout label, so without
    # this entry STAGE_MAP.get returns None and clean_and_enrich silently
    # skips the bronze match as an "Unknown stage". The "3p" key matches
    # the repo's lowercase stage convention (group / r32 / ... / final) and
    # the existing uppercase "3P" round label used across the live surfaces.
    "THIRD_PLACE": "3p",
    "FINAL": "final",
}


# =============================================================================
# Fetch
# =============================================================================


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _http_get_json(url: str, headers: dict[str, str]) -> dict[str, Any]:
    """GET a JSON payload with up to 3 retries (exponential backoff)."""
    log.info("Fetching", url=url)
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_raw(api_key: str) -> dict[str, Any]:
    """Fetch the raw football-data.org matches payload for WC 2026.

    The endpoint returns every match for the competition in scope. We
    filter to FINISHED status downstream; in-play and scheduled matches
    are ignored. The endpoint paginates only above 1000 matches; the WC
    has 104 so a single call suffices.
    """
    url = f"{FOOTBALL_DATA_BASE}/competitions/{FOOTBALL_DATA_COMP_CODE}/matches?status=FINISHED"
    headers = {"X-Auth-Token": api_key}
    return _http_get_json(url, headers)


# =============================================================================
# Clean & enrich
# =============================================================================


def _regulation_score(
    full_home: int,
    full_away: int,
    pen_home: int,
    pen_away: int,
) -> tuple[int | None, int | None]:
    """Recover the regulation (incl. extra time) score of a penalty knockout.

    Football-Data v4's ``score.fullTime`` for a penalty-decided match is the
    post-shootout aggregate (the end-of-extra-time score with the shootout tally
    added in); ``score.penalties`` is the shootout tally alone. The pre-shootout
    result is always a draw (a shootout only happens when the sides are level),
    so:

      * if fullTime is already level, it IS the regulation score; or
      * if removing the shootout tally yields a non-negative draw, fullTime was
        penalty-inflated and the remainder is the regulation score.

    Anything else does not reconcile (an inconsistent feed); return
    ``(None, None)`` so the caller keeps fullTime untouched rather than inventing
    a score. See cp-22.
    """
    if full_home == full_away:
        return full_home, full_away
    reg_home = full_home - pen_home
    reg_away = full_away - pen_away
    if reg_home >= 0 and reg_away >= 0 and reg_home == reg_away:
        return reg_home, reg_away
    return None, None


def clean_and_enrich(raw: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalise raw match rows into the website ingest schema.

    Returns a list of dicts shaped like the OutcomeSchema in
    /api/ingest/match-outcomes. Rows that fail any mapping (unknown
    team, unknown stage, missing scores) are logged at WARNING level
    and skipped; the rest are returned.
    """
    matches = raw.get("matches", [])
    log.info("Raw matches received", count=len(matches))

    outcomes: list[dict[str, Any]] = []
    skipped = 0
    for m in matches:
        if m.get("status") != "FINISHED":
            continue

        source_id = m.get("id")
        stage_raw = (m.get("stage") or "").upper()
        stage = STAGE_MAP.get(stage_raw)
        if stage is None:
            log.warning("Unknown stage", source_id=source_id, stage=stage_raw)
            skipped += 1
            continue

        home_name = ((m.get("homeTeam") or {}).get("name")) or ""
        away_name = ((m.get("awayTeam") or {}).get("name")) or ""
        home_code = to_fifa_code(home_name)
        away_code = to_fifa_code(away_name)
        if home_code is None or away_code is None:
            log.warning(
                "Unmapped team",
                source_id=source_id,
                home=home_name,
                away=away_name,
            )
            skipped += 1
            continue

        score = m.get("score") or {}
        full = score.get("fullTime") or {}
        full_home = full.get("home")
        full_away = full.get("away")
        if full_home is None or full_away is None:
            log.warning("Missing fulltime score", source_id=source_id)
            skipped += 1
            continue
        full_home = int(full_home)
        full_away = int(full_away)

        # cp-22: penalty-shootout knockouts. Football-Data v4 reports
        # score.fullTime for a penalty-decided knockout as the POST-shootout
        # aggregate (the end-of-extra-time score with the shootout tally added
        # in) while exposing the shootout tally separately in score.penalties.
        # Read verbatim, fullTime turns a 1-1 that went to penalties into a
        # phantom 4-5 away "win". We store the REGULATION (incl. extra time)
        # score as the scoreline and keep the shootout apart, so the 90-minute
        # forecast is scored against the real 90-minute result and the card can
        # label the tie honestly. Group matches never carry penalties, so this
        # branch never alters a graded group row.
        home_goals, away_goals = full_home, full_away
        shootout_winner = None
        shootout: dict[str, int] | None = None
        penalties = score.get("penalties") or {}
        p_home = penalties.get("home")
        p_away = penalties.get("away")
        if p_home is not None and p_away is not None:
            p_home = int(p_home)
            p_away = int(p_away)
            reg_home, reg_away = _regulation_score(full_home, full_away, p_home, p_away)
            if reg_home is None or reg_away is None:
                # Could not reconcile fullTime + penalties to a level result.
                # Keep fullTime as-is and attach NO shootout (a non-draw paired
                # with a shootout would fail the endpoint's
                # shootout-only-when-drawn guard); surface it for review rather
                # than inventing a score.
                log.warning(
                    "Penalty score did not reconcile to a draw; keeping fullTime",
                    source_id=source_id,
                    full_time=[full_home, full_away],
                    penalties=[p_home, p_away],
                )
            else:
                home_goals, away_goals = reg_home, reg_away
                shootout = {"home": p_home, "away": p_away}
                if p_home != p_away:
                    shootout_winner = home_code if p_home > p_away else away_code

        settled_at = m.get("lastUpdated") or m.get("utcDate")
        if not settled_at:
            log.warning("Missing timestamp", source_id=source_id)
            skipped += 1
            continue
        settled_at_iso = _normalise_iso(settled_at)

        # match_id: stable identifier. Football-Data.org's `id` is an
        # integer; we prefix it with FD to namespace and to make the
        # admin route's manual-entry IDs (M01..M104) distinguishable.
        match_id = f"FD{source_id}"

        outcome = {
            "matchId": match_id,
            "competition": "WC2026",
            "stage": stage,
            "homeTeam": home_code,
            "awayTeam": away_code,
            "homeGoals": home_goals,
            "awayGoals": away_goals,
            "settledAt": settled_at_iso,
        }
        if shootout_winner is not None:
            outcome["shootoutWinner"] = shootout_winner
        if shootout is not None:
            # The shootout tally rides in meta, which the ingest endpoint and the
            # match_outcomes.meta jsonb column already carry end to end, so the
            # card can show "won the shootout N-M" with no schema migration.
            outcome["meta"] = {"shootout": shootout}
        outcomes.append(outcome)

    log.info("Cleaned", kept=len(outcomes), skipped=skipped)
    return outcomes


def _normalise_iso(s: str) -> str:
    """Coerce a source timestamp string into a Z-suffixed ISO 8601 form.

    Football-Data.org returns values like "2026-06-11T19:00:00Z" already;
    we leave those alone. Any other tz form is converted to UTC.
    """
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return s
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


# =============================================================================
# Build output (filter to newly-settled)
# =============================================================================


def load_ingested_ids(log_path: Path) -> set[str]:
    """Read the append-only log and return the set of match IDs already POSTed."""
    if not log_path.exists():
        return set()
    out: set[str] = set()
    for line in log_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            log.warning("Skipping malformed log line")
            continue
        mid = row.get("matchId")
        if mid:
            out.add(str(mid))
    return out


def build_output(
    outcomes: list[dict[str, Any]],
    already_ingested: set[str],
    force: bool,
) -> list[dict[str, Any]]:
    """Filter to the newly-settled outcomes (unless --force)."""
    if force:
        return outcomes
    fresh = [o for o in outcomes if o["matchId"] not in already_ingested]
    log.info(
        "Filtered to newly-settled",
        total=len(outcomes),
        newly_settled=len(fresh),
        already_ingested=len(outcomes) - len(fresh),
    )
    return fresh


# =============================================================================
# POST
# =============================================================================


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
def _post_batch(url: str, token: str, batch: list[dict[str, Any]]) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = json.dumps({"outcomes": batch})
    resp = requests.post(url, data=body, headers=headers, timeout=30)
    # 207 is Multi-Status, used by the route when the evaluator failed
    # but the upserts succeeded. Treat it as a non-fatal "accepted but
    # deferred" so the daily cron picks up the gap; we do not retry.
    if resp.status_code in (200, 207):
        return resp.json()
    resp.raise_for_status()
    return resp.json()


def post_outcomes(
    site_url: str,
    token: str,
    outcomes: list[dict[str, Any]],
) -> dict[str, Any]:
    """POST outcomes in batches of MAX_BATCH and return a summary dict."""
    endpoint = f"{site_url.rstrip('/')}/api/ingest/match-outcomes"
    accepted = 0
    transitions = 0
    deferred = False

    for start in range(0, len(outcomes), MAX_BATCH):
        chunk = outcomes[start:start + MAX_BATCH]
        log.info("Posting batch", count=len(chunk), endpoint=endpoint)
        result = _post_batch(endpoint, token, chunk)
        accepted += int(result.get("accepted") or 0)
        transitions += int(result.get("transitionsCount") or 0)
        if result.get("evaluatorError") == "deferred":
            deferred = True

    return {
        "accepted": accepted,
        "transitionsCount": transitions,
        "evaluatorDeferred": deferred,
    }


# =============================================================================
# Snapshot logging
# =============================================================================


def append_ingest_log(
    log_path: Path,
    posted: list[dict[str, Any]],
) -> None:
    """Append one row per posted outcome to the append-only log."""
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as f:
        for o in posted:
            f.write(
                json.dumps(
                    {
                        "matchId": o["matchId"],
                        "stage": o["stage"],
                        "homeTeam": o["homeTeam"],
                        "awayTeam": o["awayTeam"],
                        "homeGoals": o["homeGoals"],
                        "awayGoals": o["awayGoals"],
                        "ingested_at": now_iso,
                    },
                )
                + "\n"
            )


# =============================================================================
# Window gate
# =============================================================================


def in_tournament_window(today: date | None = None) -> bool:
    today = today or datetime.now(timezone.utc).date()
    return WINDOW_START <= today <= WINDOW_END


# =============================================================================
# Orchestration
# =============================================================================


def run(
    *,
    force: bool = False,
    dry_run: bool = False,
    dev_sandbox: bool = False,
) -> int:
    """Full ingestion run. Returns a process exit code (0 on success).

    Args:
        force: Re-POST every settled outcome even if already in the
               local log. Useful for a one-shot reconciliation.
        dry_run: Fetch and print but do not POST. Useful for local
                 inspection without credentials.
        dev_sandbox: Redirect snapshot-log writes from data/snapshots/
                     to tmp/snapshots/. Required for local runs.
    """
    log.stage("=== fetch_match_outcomes - Checkpoint 15 ===")

    if not in_tournament_window():
        log.info("No tournament window. Exiting cleanly.")
        return 0

    if dev_sandbox:
        snapshots_dir = PROJECT_ROOT / "tmp" / "snapshots"
    elif os.environ.get("CI") == "true":
        snapshots_dir = PROJECT_ROOT / "data" / "snapshots"
    else:
        log.error(
            "Refusing to write to data/snapshots/ outside CI. Pass --dev-sandbox for local runs.",
        )
        return 2

    log_path = snapshots_dir / INGEST_LOG_NAME

    api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
    if not api_key:
        log.error("FOOTBALL_DATA_API_KEY not set.")
        return 2

    # 1. Fetch
    try:
        raw = fetch_raw(api_key)
    except (requests.HTTPError, requests.ConnectionError, RetryError) as e:
        log.error("Fetch failed after retries", err=str(e))
        return 3

    # 2. Normalise
    outcomes = clean_and_enrich(raw)

    # 3. Filter to newly-settled
    already = load_ingested_ids(log_path)
    fresh = build_output(outcomes, already, force=force)

    if not fresh:
        log.success("Nothing new to POST.")
        return 0

    # 4. Dry-run path: print and exit.
    if dry_run:
        log.info("Dry run; outcomes that would have been POSTed:")
        for o in fresh:
            sys.stdout.write(json.dumps(o) + "\n")
        return 0

    # 5. POST
    token = os.environ.get("INGEST_TOKEN")
    if not token:
        log.error("INGEST_TOKEN not set.")
        return 2
    site_url = os.environ.get("SITE_URL", DEFAULT_SITE_URL)

    try:
        summary = post_outcomes(site_url, token, fresh)
    except (requests.HTTPError, requests.ConnectionError, RetryError) as e:
        log.error("POST failed after retries", err=str(e))
        return 4

    log.info(
        "POST summary",
        accepted=summary["accepted"],
        transitions=summary["transitionsCount"],
        deferred=summary["evaluatorDeferred"],
    )

    # 6. Append to local log
    append_ingest_log(log_path, fresh)

    # 7. Snapshot registry: each batch is a new snapshot keyed off the
    #    set of newly-POSTed matchIds. We do not write a Parquet file
    #    (the website's match_outcomes table is the authoritative
    #    store); the snapshot SHA hashes the in-memory batch contents
    #    so the OSF audit trail can prove what was ingested at what
    #    time.
    hasher = DataSnapshotHasher()
    hasher.add_dict(
        {"outcomes": fresh},
        label="ingested_match_outcomes_batch",
    )
    sha = hasher.finalise()
    registry_path = snapshots_dir / "snapshot_registry.jsonl"
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    registry = SnapshotRegistry(registry_path)
    registry.register(
        sha,
        hasher.manifest(),
        notes=f"fetch_match_outcomes batch of {len(fresh)}",
    )
    log.info("Snapshot registered", sha=sha[:16])

    log.success(
        "fetch_match_outcomes complete",
        posted=len(fresh),
        transitions=summary["transitionsCount"],
    )
    return 0


# =============================================================================
# CLI
# =============================================================================


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Fetch and POST newly-settled WC 2026 match outcomes.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-POST every settled outcome even if already in the local log.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and print outcomes but do not POST. Local inspection.",
    )
    parser.add_argument(
        "--dev-sandbox",
        action="store_true",
        help="Redirect writes to tmp/snapshots/ instead of data/snapshots/. "
        "Required for any local invocation; CI omits this flag.",
    )
    args = parser.parse_args()
    code = run(
        force=args.force,
        dry_run=args.dry_run,
        dev_sandbox=args.dev_sandbox,
    )
    sys.exit(code)
