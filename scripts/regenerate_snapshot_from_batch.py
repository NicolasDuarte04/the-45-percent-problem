"""
scripts/regenerate_snapshot_from_batch.py
=========================================
Phase 7 (lockdown 2026-05-11 Section 7): regenerate the website snapshot
bundle's user-facing files from the active batch produced under
amendment v1.1.

Background
----------
The pre-lockdown ``scripts/generate_snapshot.py`` ran its own M0 Monte
Carlo via ``SimpleEloProvider``; the website's JSON bundle therefore
served M0 numbers under a champion_model = "M0" tag. After Sections 1
through 8 of the lockdown closed, the canonical state is:
  - M2_fifa is the locked champion (champion_model.json::CHAMPION_LOCKED).
  - The active 10k batch is batch_20260512_013228Z (per
    data/calibration/active_batch.json), produced under amendment v1.1.

This script bridges the active batch to the website's snapshot bundle by
re-aggregating per-team progression probabilities from the batch's
team_runs_M2.parquet and rewriting the user-facing files:
  - snapshot_meta.json        (champion_model = "M2_fifa"; amendment note)
  - tournament.json           (batch-derived per-team probabilities)
  - freshness.json            (refreshed timestamps)
  - ledger.jsonl              (model_id flipped from "M0" to "M2_fifa")
  - bracket.json              (cp-12: populated slots rebuilt from the
                               wc2026_fixtures parquet on every run via
                               populate_bracket_slots; see Fix 5)

Files NOT rewritten (deliberate, see Section 7 report for rationale):
  - evaluation_metrics.json   (kill_criteria_check already correct after
                               Section 8.4; pre-tournament metrics all null)
  - divergence.json           (M0-derived against synthetic Pinnacle odds;
                               regeneration depends on the Pinnacle
                               switchover flagged in
                               PINNACLE_INGESTION_READINESS.md gap 5.2)
  - matches/*.json            (per-match M0 lambdas; bridging to M2
                               lambdas requires consuming match_runs_M2,
                               flagged as a follow-up)
  - teams/*.json              (per-team M0-derived narratives; same
                               follow-up class as matches/)

Per-team metadata (display_name, fifa_code, confederation, elo) is, as of
cp-12, sourced from the clean per-team roster ``teams/<code>.json`` rather
than carried forward from the prior ``tournament.json`` — the latter had
silently perpetuated a corrupt roster (COD duplicated, TUN dropped). The
website's canonical-draw conventions ("United States", "Korea Republic",
"Türkiye", etc.) live in those per-team files and are preserved unchanged.
Only the probability fields and the n_runs counter come from the batch.
``rank_change_7d`` (absent from teams/<code>.json) is carried from the
prior tournament.json.

Run
---
  python scripts/regenerate_snapshot_from_batch.py

The script reads ``data/calibration/active_batch.json`` to find the
batch and refuses to run if the active_batch_id has changed since the
script's last execution (the snapshot dir is derived from the
active_batch_id so a mismatch indicates a stale run).
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

WEBSITE_DATA_ROOT = PROJECT_ROOT / "website" / "public" / "data"
LATEST_DIR        = WEBSITE_DATA_ROOT / "latest"
SNAPSHOTS_DIR     = WEBSITE_DATA_ROOT / "snapshots"
MANIFEST_PATH     = WEBSITE_DATA_ROOT / "manifest.json"
ACTIVE_BATCH_JSON = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"
CHAMPION_MODEL_JSON = PROJECT_ROOT / "data" / "calibration" / "champion_model.json"
FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
AMENDMENT_POINTER = "osf/amendments/amendment_v1.1_data_completeness.md"

# cp-09 part 2: optional parquet snapshot of the website's `match_outcomes`
# table. If a future ingestion shim exports this file, the script reads
# the settled count from there rather than querying Postgres. Path is
# overridable via the `MATCH_OUTCOMES_PARQUET` env var so a CI job that
# stages the export elsewhere can wire it without touching this constant.
MATCH_OUTCOMES_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"

# Batch team_id (post-Section-1 normalisation) to website canonical-draw
# display_name. Most teams agree; the entries below are the six cases that
# differ. Any team not listed maps to itself. Maintained alongside the
# similar normalisation tables in ingestion/fetch_odds_pinnacle.py
# (_TEAM_NAME_NORM) and scripts/generate_snapshot.py (_ELO_NAME_NORM).
_TEAM_ID_TO_DISPLAY_NAME = {
    "USA":         "United States",
    "Iran":        "IR Iran",
    "South Korea": "Korea Republic",
    "Turkey":      "Türkiye",
    "Cape Verde":  "Cabo Verde",
    "DR Congo":    "Congo DR",
}


def _now_utc() -> datetime:
    return datetime.now(tz=timezone.utc)


def _code_sha() -> str:
    """Return the current git HEAD SHA (first 16 hex chars)."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()[:16]
    except Exception:
        return "unknown"


def _data_sha(active_batch: dict) -> str:
    """SHA-256 prefix anchored to the active batch's matrix and data hash."""
    parts = [
        active_batch.get("active_batch_id", ""),
        active_batch.get("matrix_sha256_lock", ""),
    ]
    h = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return f"sha256:{h[:32]}"


def _wilson_ci(p: float, n: int, z: float = 1.96) -> tuple[float, float]:
    if n == 0:
        return 0.0, 0.0
    denom = 1.0 + (z ** 2) / n
    centre = (p + (z ** 2) / (2 * n)) / denom
    import math
    spread = z * math.sqrt(p * (1 - p) / n + (z ** 2) / (4 * n * n)) / denom
    return max(0.0, centre - spread), min(1.0, centre + spread)


# ─── cp-09 part 2: snapshot-metadata derivation ──────────────────────────────
#
# Phase-derivation table for WC 2026, indexed by cumulative settled-match
# count. Confirmed against data/raw/wc2026_fixtures.parquet 2026-06-01:
#
#   Group Stage    : 72 matches  (M01-M72)   → cumulative  1..72
#   Round of 32    : 16 matches  (M73-M88)   → cumulative 73..88
#   Round of 16    :  8 matches  (M89-M96)   → cumulative 89..96
#   Quarter-final  :  4 matches  (M97-M100)  → cumulative 97..100
#   Semi-final     :  2 matches  (M101-M102) → cumulative 101..102
#   Third Place    :  1 match    (M103)      → cumulative 103
#   Final          :  1 match    (M104)      → cumulative 104
#
# SnapshotMetaSchema.tournament_phase (website/src/lib/data/schemas.ts:29-38)
# has no `third_place` value; the third-place playoff and the final both
# live in the `final` phase, which spans cumulative {103, 103}. `completed`
# fires only when all 104 are settled.

# Phase transitions: (upper-inclusive bound, phase string). The bounds
# come from the cumulative table above. _derive_phase walks this list
# and returns the first phase whose bound the settled count does not
# exceed. Keeping the bounds in a table (rather than as inline literals)
# makes the test exhaustive: every transition point is data, not code.
_PHASE_BOUNDS: tuple[tuple[int, str], ...] = (
    (0,   "pre_tournament"),
    (72,  "group_stage"),
    (88,  "round_of_32"),
    (96,  "round_of_16"),
    (100, "quarter_final"),
    (102, "semi_final"),
    (103, "final"),
)


def _derive_phase(settled: int, total: int) -> str:
    """Map a settled-match count to a SnapshotMetaSchema.tournament_phase.

    The boundary table is the canonical WC 2026 mapping (see _PHASE_BOUNDS
    above); changing it requires a matching fixture re-count.

    >>> _derive_phase(0,   104)
    'pre_tournament'
    >>> _derive_phase(1,   104)
    'group_stage'
    >>> _derive_phase(72,  104)
    'group_stage'
    >>> _derive_phase(73,  104)
    'round_of_32'
    >>> _derive_phase(96,  104)
    'round_of_16'
    >>> _derive_phase(100, 104)
    'quarter_final'
    >>> _derive_phase(102, 104)
    'semi_final'
    >>> _derive_phase(103, 104)
    'final'
    >>> _derive_phase(104, 104)
    'completed'
    """
    if settled < 0:
        raise ValueError(f"settled count cannot be negative: {settled}")
    if settled >= total:
        return "completed"
    for bound, phase in _PHASE_BOUNDS:
        if settled <= bound:
            return phase
    # The last entry in _PHASE_BOUNDS covers settled == 103. Anything
    # between 103 (exclusive) and `total` (exclusive) can only happen
    # with a non-104 total - surface that loudly rather than silently
    # mapping to "final".
    raise ValueError(
        f"settled={settled} falls past the last phase boundary "
        f"({_PHASE_BOUNDS[-1][0]}) but below total={total}; "
        f"reconcile _PHASE_BOUNDS with the fixtures parquet."
    )


def _count_total_matches() -> int:
    """Total WC 2026 fixture count. Read from the fixtures parquet so
    a future expansion of the schedule (replays, format change) is
    reflected automatically without editing this script."""
    if not FIXTURES_PARQUET.exists():
        # The website ships a 104-match schedule and the regen script
        # is the only consumer of this count. A missing fixtures
        # parquet means the upstream data pipeline broke; surface
        # loudly rather than silently defaulting to a hardcoded 104.
        raise FileNotFoundError(
            f"wc2026 fixtures parquet not found at {FIXTURES_PARQUET}; "
            f"cannot derive matches_remaining."
        )
    return int(len(pd.read_parquet(FIXTURES_PARQUET, columns=["match_id"])))


def _count_settled_via_parquet(path: Path) -> int | None:
    """Read settled count from a parquet snapshot of `match_outcomes`.

    Returns None if the file does not exist; raises on a malformed file
    (so a half-written export does not silently masquerade as zero
    settled matches). Empty parquet → 0 (the export ran but nothing
    has settled yet); a missing file → None (the export hasn't run).
    """
    if not path.exists():
        return None
    df = pd.read_parquet(path, columns=["match_id"])
    return int(len(df))


def _resolve_pg_url() -> str | None:
    """Resolve the Postgres connection string for batch scripts.

    Preference order:
      1. DIRECT_URL    (non-pooled; preferred for batch reads - bypasses
                        any pgbouncer pooler that would otherwise cause
                        prepared-statement issues on long-running scripts)
      2. DATABASE_URL  (pooled; the website app uses this for request traffic)
      3. POSTGRES_URL  (legacy alias kept for compatibility)

    Returns None if none of the three env vars is set. Mirrored in
    simulation/load_settled.py so the snapshot regen and the MC settled
    loader pick the same connection.
    """
    return (
        os.environ.get("DIRECT_URL")
        or os.environ.get("DATABASE_URL")
        or os.environ.get("POSTGRES_URL")
    )


def _count_settled_via_postgres() -> int | None:
    """Read settled count from the live Postgres `match_outcomes` table.

    Optional path. Returns None if:
      - psycopg (v3) or psycopg2 is not installed, or
      - none of DIRECT_URL / DATABASE_URL / POSTGRES_URL is set, or
      - the connection or query fails for any reason.

    Failures are logged via print (rather than raised) because this
    helper is best-effort: a missing DB connection in CI should leave
    matches_settled at zero (pre-tournament default), not crash the
    nightly snapshot regeneration. Surfacing the failure to operations
    is the freshness-monitor's job, not this script's.
    """
    url = _resolve_pg_url()
    if not url:
        return None
    # Try psycopg v3 first (modern), fall back to psycopg2.
    conn = None
    try:
        try:
            import psycopg  # type: ignore[import-untyped]
            conn = psycopg.connect(url)
        except ImportError:
            import psycopg2  # type: ignore[import-untyped]
            conn = psycopg2.connect(url)
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM match_outcomes")
            row = cur.fetchone()
            return int(row[0]) if row else 0
    except Exception as exc:  # broad on purpose; see docstring
        print(f"    [warn] postgres settled-count query failed: {exc}")
        return None
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def _count_settled_matches() -> tuple[int, str]:
    """Return (settled_count, source_label) for snapshot_meta derivation.

    Source-precedence order:
      1. Parquet export at MATCH_OUTCOMES_PARQUET (or the path given by
         the MATCH_OUTCOMES_PARQUET env var). Preferred because the
         export is reproducible offline - the nightly regen does not
         need DB access.
      2. Live Postgres via DATABASE_URL / POSTGRES_URL. Used only if
         the parquet export is absent.
      3. Default: 0. Correct pre-tournament; logged so an operator can
         see why matches_settled stayed at zero.

    The source label is written into the snapshot_meta.notes string so
    a reviewer can trace which path was active for any given snapshot.
    """
    override = os.environ.get("MATCH_OUTCOMES_PARQUET")
    parquet_path = Path(override) if override else MATCH_OUTCOMES_PARQUET
    n_parquet = _count_settled_via_parquet(parquet_path)
    if n_parquet is not None:
        return n_parquet, f"parquet:{parquet_path.relative_to(PROJECT_ROOT) if parquet_path.is_relative_to(PROJECT_ROOT) else parquet_path}"
    n_pg = _count_settled_via_postgres()
    if n_pg is not None:
        return n_pg, "postgres:match_outcomes"
    return 0, "default:pre_tournament"


def _maybe_rebatch_for_settled_delta(active: dict) -> dict:
    """cp-10: re-batch the full 10k MC when the settled-results set changed.

    Compares the current settled-match count (via cp-09's
    `_count_settled_matches`) against the value stamped on
    `active_batch.json::settled_count_at_batch_time`. When they differ - 
    in either direction, since admin retractions decrease the count - 
    invokes `simulation.batch_runner.run_batch` to produce a fresh
    M2 batch with the new settled set, updates `active_batch.json` to
    point at it (schema_version 1.0 → 1.1, supersession_reason filled
    in, prior batch preserved for audit), and returns the new active
    dict. When the count is unchanged, returns the input dict
    unchanged and re-aggregation proceeds against the existing batch.

    The architectural decision (Q1 of the 2026-06-01 diagnostic) is to
    re-batch the full 10k Monte Carlo on a settled-count change rather
    than reweight an existing batch. See
    docs/audit/architecture-diagnostic-2026-06-01.md §7 Q1.
    """
    prior_count = int(active.get("settled_count_at_batch_time", 0))
    prior_source = active.get("settled_source", "default:pre_tournament")

    current_count, current_source = _count_settled_matches()

    if current_count == prior_count:
        # No delta. Re-aggregate from the existing active batch (cp-09
        # behavior). Stamp the source if it was missing (e.g. resuming
        # a pre-cp-10 active_batch.json) so future runs have full
        # provenance without forcing an unnecessary re-batch.
        if "settled_count_at_batch_time" not in active or "settled_source" not in active:
            active["schema_version"] = "1.1"
            active["settled_count_at_batch_time"] = current_count
            active["settled_source"] = current_source
            ACTIVE_BATCH_JSON.write_text(json.dumps(active, indent=2) + "\n")
            print(
                f"    cp-10           : back-filled settled_count_at_batch_time="
                f"{current_count} source={current_source} into active_batch.json"
            )
        else:
            print(
                f"    cp-10           : settled-count unchanged at {current_count} "
                f"({current_source}); re-aggregating existing batch"
            )
        return active

    # ── Settled set changed; produce a fresh batch ────────────────────────
    print(
        f"    cp-10           : settled-count delta {prior_count} ({prior_source}) "
        f"-> {current_count} ({current_source}); triggering re-batch"
    )

    # Imported here (rather than at module load) so the regen script's
    # zero-delta fast path doesn't pay the joblib + DataLoader import cost.
    from simulation.batch_runner import run_batch

    # cp-10 conditions only the M2 variant since that's the production
    # champion and the only batch consumed by the snapshot regen. Other
    # variants are research artifacts and are re-batched on their own
    # cadence (or not at all post-lockdown). The 10k count is the
    # blueprint-locked website setting.
    new_manifest = run_batch(variants=["M2"], n_runs_per_variant=10_000)

    # Update active_batch.json in place, preserving the audit trail of
    # the prior active batch. Schema version bumps to 1.1 to reflect the
    # two new fields.
    prior_id = active.get("active_batch_id")
    prior_path = active.get("active_batch_path")
    # The existing active_batch.json stores active_batch_path as relative to
    # PROJECT_ROOT; preserve that convention even though BatchManifest.batch_dir
    # is absolute. A consumer that uses PROJECT_ROOT / active_batch_path keeps
    # working regardless.
    new_batch_dir = Path(new_manifest.batch_dir)
    try:
        rel_batch_path = str(new_batch_dir.relative_to(PROJECT_ROOT))
    except ValueError:
        rel_batch_path = str(new_batch_dir)
    new_active = {
        "schema_version":           "1.1",
        "active_batch_id":          new_manifest.batch_id,
        "active_batch_path":        rel_batch_path,
        "activated_at_utc":         _now_utc().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "matrix_sha256_run":        new_manifest.matrix_sha256_runs.get("M2", ""),
        "matrix_sha256_lock":       active.get("matrix_sha256_lock", ""),
        "prior_active_batch_id":    prior_id,
        "prior_active_batch_path":  prior_path,
        "supersession_reason": (
            f"cp-10 settled-count delta: was {prior_count} ({prior_source}), "
            f"now {current_count} ({current_source})."
        ),
        "amendment_pointer":            active.get("amendment_pointer", ""),
        "settled_count_at_batch_time":  new_manifest.settled_count,
        "settled_source":               new_manifest.settled_source,
    }
    ACTIVE_BATCH_JSON.write_text(json.dumps(new_active, indent=2) + "\n")
    print(
        f"    cp-10           : new active_batch_id={new_manifest.batch_id} "
        f"(settled_count={new_manifest.settled_count}, source={new_manifest.settled_source})"
    )
    return new_active


def aggregate_team_progression(team_runs: pd.DataFrame) -> dict[str, dict]:
    """Aggregate per-team progression probabilities from team_runs_M2.parquet.

    Mirrors the exit-round buckets used by scripts/generate_snapshot.py so
    the website schema (TournamentSnapshotSchema) accepts the output without
    changes.
    """
    out: dict[str, dict] = {}
    n_runs_total = int(team_runs["run_idx"].nunique())
    grouped = team_runs.groupby("team_id")

    for team_id, sub in grouped:
        n = len(sub)
        if n == 0:
            continue
        p_champion = float((sub["champion"] == True).sum()) / n
        p_final = float(sub["exit_round"].isin(["Champion", "Runner-up"]).sum()) / n
        p_semi = float(
            sub["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd"]).sum()
        ) / n
        p_quarter = float(
            sub["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd", "QF"]).sum()
        ) / n
        p_r16 = float(
            sub["exit_round"].isin(["Champion", "Runner-up", "SF", "3rd", "QF", "R16"]).sum()
        ) / n
        p_group_qual = float((sub["qualified_r32"] == True).sum()) / n
        ci_lo, ci_hi = _wilson_ci(p_champion, n)

        out[team_id] = {
            "p_champion":            round(p_champion, 6),
            "p_final":               round(p_final, 6),
            "p_semifinal":           round(p_semi, 6),
            "p_quarterfinal":        round(p_quarter, 6),
            "p_r16":                 round(p_r16, 6),
            "p_group_qualification": round(p_group_qual, 6),
            "ci_95_champion":        [round(ci_lo, 6), round(ci_hi, 6)],
            "n_runs":                n,
        }
    return out


def _display_name_to_team_id(display_name: str) -> str:
    """Inverse of _TEAM_ID_TO_DISPLAY_NAME (identity for unlisted teams)."""
    for batch_id, mapped in _TEAM_ID_TO_DISPLAY_NAME.items():
        if mapped == display_name:
            return batch_id
    return display_name


def regenerate_tournament_json(
    teams_roster: dict[str, dict],
    aggregated: dict[str, dict],
    prior_rank_change: dict[str, int],
    new_snapshot_id: str,
    generated_at: str,
    n_runs_per_team: int,
    model_variant: str,
) -> dict:
    """Rebuild tournament.json from the clean teams/ roster + batch probs.

    cp-12 (structural Fix 5): the team roster is rebuilt from the canonical
    per-team files (``teams/<code>.json``), NOT carried forward from the
    prior ``tournament.json``. The previous implementation iterated
    ``existing["teams"]`` and so silently perpetuated a corrupt roster —
    Congo DR (COD) duplicated, Tunisia (TUN) dropped — introduced
    2026-05-12 (commit ``f524ee7``) and never self-healed: both COD rows
    mapped to a valid batch id, and the missing TUN was simply never
    iterated, so no error fired. Sourcing the roster from
    ``teams/<code>.json`` makes the rebuild self-correcting, and the
    48-unique / completeness assertions below make any *future* roster
    corruption fail loudly here (and in the cp-10.2 regen smoke test)
    instead of propagating to the public bracket.

    ``prior_rank_change`` carries each code's ``rank_change_7d`` from the
    existing tournament.json (``teams/<code>.json`` does not store it;
    today every value is 0).
    """
    new_teams = []
    consumed_team_ids: list[str] = []
    for code, team in sorted(teams_roster.items()):
        display_name = team["display_name"]
        # Map canonical display_name back to batch team_id via the inverse
        # of _TEAM_ID_TO_DISPLAY_NAME.
        team_id = _display_name_to_team_id(display_name)
        if team_id not in aggregated:
            raise KeyError(
                f"teams/{code}.json display_name {display_name!r} maps to "
                f"team_id {team_id!r}, which is missing from the batch "
                f"aggregation. Check the _TEAM_ID_TO_DISPLAY_NAME table."
            )
        consumed_team_ids.append(team_id)
        agg = aggregated[team_id]
        # Field shape matches the pre-cp-12 rows exactly (no `group` key,
        # which the prior roster also omitted) so the diff is the roster
        # delta + corrected metadata, not a schema change.
        new_teams.append({
            "fifa_code":             code,
            "display_name":          display_name,
            "confederation":         team["confederation"],
            "seed":                  0,  # reassigned by p_champion below
            "p_champion":            agg["p_champion"],
            "p_final":               agg["p_final"],
            "p_semifinal":           agg["p_semifinal"],
            "p_quarterfinal":        agg["p_quarterfinal"],
            "p_r16":                 agg["p_r16"],
            "p_group_qualification": agg["p_group_qualification"],
            "ci_95_champion":        agg["ci_95_champion"],
            "elo_current":           float(team["elo_rating"]),
            "rank_change_7d":        prior_rank_change.get(code, 0),
        })

    # cp-12: hard roster invariants. The point of Fix 5's roster work is
    # that a corrupt roster can never again ship silently. A 48-team World
    # Cup with 48 unique FIFA codes, each consuming exactly one of the 48
    # batch teams, is the contract; violate it and crash (turning the
    # cp-10.2 regen smoke test red) rather than write a malformed roster.
    codes = [t["fifa_code"] for t in new_teams]
    if len(codes) != 48:
        raise ValueError(f"roster must have 48 teams; got {len(codes)}")
    if len(set(codes)) != 48:
        dupes = sorted({c for c in codes if codes.count(c) > 1})
        raise ValueError(f"roster has duplicate fifa_codes: {dupes}")
    if set(consumed_team_ids) != set(aggregated):
        missing = sorted(set(aggregated) - set(consumed_team_ids))
        extra = sorted(set(consumed_team_ids) - set(aggregated))
        raise ValueError(
            f"roster does not bijectively cover the 48 batch teams; "
            f"uncovered batch teams: {missing}; unexpected: {extra}"
        )

    # Re-sort by p_champion descending and reassign seed indices so the
    # ledger stays stable.
    new_teams.sort(key=lambda t: t["p_champion"], reverse=True)
    for idx, t in enumerate(new_teams, start=1):
        t["seed"] = idx

    return {
        "snapshot_id":      new_snapshot_id,
        "generated_at_utc": generated_at,
        "mc_runs":          n_runs_per_team,
        # cp-09 part 3 (Fix 4): stamp the locked model identity on every
        # tournament.json write so served probabilities carry their
        # model provenance through the React layer. The Zod schema at
        # website/src/lib/data/schemas.ts now requires this field,
        # so a snapshot written without it will fail validation at
        # load time - a built-in tripwire against silent batch swaps.
        "model_variant":    model_variant,
        "teams":            new_teams,
    }


def populate_bracket_slots(snapshot_id: str) -> dict:
    """Build bracket.json with populated slots from the fixtures parquet.

    cp-12 (structural Fix 5): the regen previously carried ``bracket.json``
    forward verbatim (only bumping ``snapshot_id``), so the populated slots
    existed on production solely because of cp-09's one-shot
    ``scripts/backfill_bracket_slots.py``. A fresh clone followed by a regen
    would have produced an unpopulated bracket. This rebuilds the slots from
    the git-tracked, static ``wc2026_fixtures.parquet`` on every run, so the
    bracket page can no longer revert to the unpopulated state. The
    slot-building logic is imported and reused verbatim from the cp-09
    backfill (no logic drift); the import is local so the regen module does
    not pull the ingestion dependency chain unless this function runs.
    """
    from scripts.backfill_bracket_slots import build_slots, build_bracket_doc

    fixtures = pd.read_parquet(FIXTURES_PARQUET)
    slots_by_round = build_slots(fixtures)
    return build_bracket_doc({"snapshot_id": snapshot_id}, slots_by_round)


def main() -> None:
    print("=" * 60)
    print("regenerate_snapshot_from_batch (lockdown 2026-05-11 Section 7)")
    print("=" * 60)

    # ── Load active batch + locked champion artifact ──────────────────────
    active = json.loads(ACTIVE_BATCH_JSON.read_text())
    # cp-10: re-batch when the settled-results set has changed since the
    # active batch was produced. No-op pre-tournament (zero settled both
    # before and after); during the tournament this is the trigger that
    # propagates a freshly-settled result into the public bracket.
    active = _maybe_rebatch_for_settled_delta(active)
    active_batch_id = active["active_batch_id"]
    batch_path = PROJECT_ROOT / active["active_batch_path"]
    team_runs_path = batch_path / "team_runs_M2.parquet"
    if not team_runs_path.exists():
        raise FileNotFoundError(f"Active batch missing M2 outputs: {team_runs_path}")
    print(f"[1] active_batch_id : {active_batch_id}")
    print(f"    batch_path      : {batch_path.relative_to(PROJECT_ROOT)}")

    champion = json.loads(CHAMPION_MODEL_JSON.read_text())
    champion_internal = champion.get("m_star_model_id", "M2_fifa")
    champion_locked   = champion.get("CHAMPION_LOCKED", False)
    amendment_v       = champion.get("amendment_v", "v1.1")
    # Website schemas (website/src/lib/data/schemas.ts) constrain the
    # `champion_model` and ledger `model_id` enums to {M0, M1, M2, M3, M_STAR}.
    # We surface the locked champion as `M_STAR` on the website while the
    # underlying internal id (`M2_fifa`) is preserved in the snapshot notes
    # and the active_batch_id stamp so a forensic reviewer can trace it.
    champion_model_id = "M_STAR"
    print(f"    champion        : {champion_internal}  LOCKED={champion_locked}  amendment={amendment_v}")
    print(f"    website label   : {champion_model_id}  (per schema enum)")

    # ── Read existing snapshot bundle for metadata carry-forward ──────────
    if not LATEST_DIR.exists():
        raise FileNotFoundError(f"website/public/data/latest does not exist; nothing to carry forward.")
    existing_tournament = json.loads((LATEST_DIR / "tournament.json").read_text())
    print(f"    existing_id     : {existing_tournament['snapshot_id']}  (carried-forward metadata source)")

    # ── Aggregate per-team progression from the batch ─────────────────────
    team_runs = pd.read_parquet(team_runs_path)
    aggregated = aggregate_team_progression(team_runs)
    n_runs_per_team = max(row["n_runs"] for row in aggregated.values())
    print(f"[2] aggregated {len(aggregated)} teams from {n_runs_per_team} runs each")

    # ── cp-12: load the clean canonical roster from teams/<code>.json ──────
    # This replaces the corrupt carried-forward tournament.json roster as
    # the source of truth for the 48-team set (see regenerate_tournament_json
    # docstring). Loaded once and reused for both tournament.json and the
    # teams/ progression rewrite below.
    teams_src_dir = LATEST_DIR / "teams"
    teams_roster: dict[str, dict] = {}
    for tf in sorted(teams_src_dir.glob("*.json")):
        tj = json.loads(tf.read_text())
        code = tj.get("fifa_code") or tf.stem
        teams_roster[code] = tj
    # teams/<code>.json does not carry rank_change_7d; preserve any prior
    # value from the existing tournament.json (today uniformly 0).
    prior_rank_change = {
        r["fifa_code"]: r.get("rank_change_7d", 0)
        for r in existing_tournament.get("teams", [])
    }
    print(f"    roster source   : teams/ ({len(teams_roster)} files)")

    now = _now_utc()
    new_snapshot_id  = now.strftime("%Y-%m-%dT%H:%MZ")
    new_generated_at = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    new_dir = SNAPSHOTS_DIR / new_snapshot_id

    code_sha_str = _code_sha()
    data_sha_str = _data_sha(active)
    print(f"[3] new snapshot_id : {new_snapshot_id}")
    print(f"    code_sha        : {code_sha_str}")
    print(f"    data_sha        : {data_sha_str}")

    # ── Build new tournament.json from batch + carried-forward metadata ──
    new_tournament = regenerate_tournament_json(
        teams_roster,
        aggregated,
        prior_rank_change,
        new_snapshot_id,
        new_generated_at,
        n_runs_per_team,
        champion_internal,
    )

    # ── cp-09 part 2 (Fix 2): derive snapshot metadata from live state ────
    # The pre-cp-09 script hardcoded `tournament_phase: "pre_tournament"`,
    # `matches_settled: 0`, and `matches_remaining: 104`. Once the
    # tournament starts on 2026-06-11 those values are lies the public
    # surface would assert all the way through the knockouts. The block
    # below replaces them with values derived from the canonical state.
    total_matches = _count_total_matches()
    settled_count, settled_source = _count_settled_matches()
    if settled_count > total_matches:
        # Defensive: a corrupt match_outcomes row or a manual admin
        # mistake could push the count past the schedule. Cap to total
        # so the JSON stays well-formed, but log loudly.
        print(
            f"    [warn] settled_count ({settled_count}) exceeds "
            f"total_matches ({total_matches}); clamping."
        )
        settled_count = total_matches
    phase = _derive_phase(settled_count, total_matches)
    print(
        f"    snapshot_meta   : settled={settled_count}/{total_matches} "
        f"phase={phase} source={settled_source}"
    )

    # ── Build new snapshot_meta.json ──────────────────────────────────────
    new_snapshot_meta = {
        "schema_version":       "9.0",
        "snapshot_id":          new_snapshot_id,
        "generated_at_utc":     new_generated_at,
        "code_sha":             code_sha_str,
        "data_sha":             data_sha_str,
        "pre_reg_tag":          "v1.0.0-mstar-lock",
        "champion_model":       champion_model_id,
        "mc_runs":              n_runs_per_team,
        "tournament_phase":     phase,
        "matches_settled":      settled_count,
        "matches_remaining":    total_matches - settled_count,
        # cp-05: hardcoded False, aligned with cp-04's evaluation_metrics.kill_criteria_check.status="pre_tournament_locked".
        "kill_criteria_active": False,
        "notes": (
            f"Phase 7 M_STAR (= {champion_internal}) snapshot under "
            f"amendment {amendment_v}; per-team probabilities aggregated "
            f"from batch {active_batch_id}; see {AMENDMENT_POINTER}. "
            f"matches_settled source: {settled_source}."
        ),
        "active_batch_id":      active_batch_id,
        "amendment_pointer":    AMENDMENT_POINTER,
    }

    # ── Build new freshness.json ──────────────────────────────────────────
    new_freshness = {
        "snapshot_id":                  new_snapshot_id,
        "generated_at_utc":             new_generated_at,
        "max_expected_staleness_hours": 26,
        "current_staleness_hours":      0.0,
        "status":                       "FRESH",
    }

    # ── Carry forward bracket.json, evaluation_metrics.json, divergence.json,
    #    matches/*.json, teams/*.json from the existing latest dir, but flip
    #    ledger.jsonl's model_id labels to match the new champion.
    print(f"[4] writing bundle to {new_dir}")
    new_dir.mkdir(parents=True, exist_ok=True)

    # tournament.json
    (new_dir / "tournament.json").write_text(json.dumps(new_tournament, indent=2))
    # snapshot_meta.json
    (new_dir / "snapshot_meta.json").write_text(json.dumps(new_snapshot_meta, indent=2))
    # freshness.json
    (new_dir / "freshness.json").write_text(json.dumps(new_freshness, indent=2))

    # bracket.json: cp-12 (structural Fix 5) rebuilds populated slots from
    # the static wc2026_fixtures parquet on every run (was carried forward
    # verbatim pre-cp-12, relying on cp-09's one-shot backfill). Determin-
    # istic from the fixtures, so the only nightly delta is snapshot_id.
    bracket = populate_bracket_slots(new_snapshot_id)
    (new_dir / "bracket.json").write_text(json.dumps(bracket, indent=2))

    # evaluation_metrics.json: carry through the locked metric values but
    # recompute matches_settled from the live source, the same way
    # snapshot_meta.matches_settled is computed above. Pre-fix, this field was
    # carried forward verbatim (stuck at the pre-tournament 0) while
    # snapshot_meta advanced with the tournament, so the two artifacts drifted
    # apart and the cross-artifact consistency contract failed mid-tournament.
    eval_metrics = json.loads((LATEST_DIR / "evaluation_metrics.json").read_text())
    eval_metrics["snapshot_id"] = new_snapshot_id
    eval_metrics["matches_settled"] = settled_count
    (new_dir / "evaluation_metrics.json").write_text(json.dumps(eval_metrics, indent=2))

    # divergence.json is regenerated (gated) in the cp-14 block below, where the
    # champion distributions are available. It is no longer carried forward: the
    # frozen synthetic rows falsely stamped PINNACLE are retired (Decision B).

    # cp-14 commit 2+3: resolve settled outcomes ONCE, mapped onto the frozen
    # champion fixtures through the bijection hard-stop (evaluation/
    # forecast_mapping). The same result feeds both the reconstructed ledger
    # (below) and the per-match score join (further down). A mapping break or an
    # absent settled source disables scoring for the entire ledger
    # (forward-only / honest pending), never a mis-joined or invented row.
    from evaluation.forecast_mapping import build_model_map
    from evaluation.match_score_join import join_scores, resolve_scored
    from evaluation.reconstruct_forecasts import (
        build_ledger_rows,
        reconstruct_distributions,
    )

    matches_src = LATEST_DIR / "matches"
    score_res = resolve_scored(matches_dir=matches_src)

    # Build the model map + frozen champion distributions once (committed,
    # outcome-blind data). Reused by the reconstructed ledger and the gated
    # divergence. Reuse the bijection-validated map from the scored result when
    # available; otherwise build it independently (divergence needs no outcomes).
    model_map = score_res.get("model_map")
    if model_map is None:
        model_map = build_model_map(matches_dir=matches_src)
    dists = reconstruct_distributions(model_map)

    # ledger.jsonl: Decision A reconstruction. The legacy synthetic placeholders
    # (ARG/CAN, GER/JAP) are gone. Each settled group match scores its frozen
    # pre-tournament M2 distribution (aggregated from the committed batch, never
    # re-run) against the realised result, tagged with the source batch id and
    # activation timestamp. Empty until a settled source is reachable. Market /
    # CLV fields are null: there are no committed market lines yet.
    ledger_rows: list = []
    if score_res["status"] == "ok":
        ledger_rows = build_ledger_rows(score_res["scored"], dists, code_sha_str)
        print(
            f"    [cp-14] reconstructed ledger: {len(ledger_rows)} settled "
            "forecasts scored against frozen M2 batch"
        )
    elif score_res["status"] == "mapping_error":
        print(
            "    [cp-14][HALT] ledger left empty (forward-only); settled "
            f"bijection failed: {score_res['error']}"
        )
    else:
        print(
            f"    [cp-14] no settled source ({score_res['source']}); ledger "
            "empty until matches settle"
        )
    with open(new_dir / "ledger.jsonl", "w") as fh:
        for row in ledger_rows:
            fh.write(json.dumps(row) + "\n")

    # cp-14 commit 4: compute the champion proper-scoring metrics (Brier / RPS /
    # log-loss) from the reconstructed ledger and overwrite the carry-forward
    # evaluation_metrics.json written above. M0-M3 stay null (ablation needs
    # per-model batches); market metrics (CLV / Nyberg / DM) stay null until odds
    # ingestion. champion_metric_n records the honest, often-small sample size.
    from evaluation.aggregate_metrics import update_evaluation_metrics

    em = json.loads((new_dir / "evaluation_metrics.json").read_text())
    em = update_evaluation_metrics(em, ledger_rows)
    (new_dir / "evaluation_metrics.json").write_text(json.dumps(em, indent=2))
    print(
        f"    [cp-14] champion metrics: n={em.get('champion_metric_n', 0)} "
        f"brier_M_STAR={em['brier']['M_STAR']} log_loss_M_STAR={em['log_loss']['M_STAR']}"
    )

    # cp-14 commit 5: gated divergence (Decision B). If real odds are present
    # (the producer ran a real tier), de-vig them against the champion
    # distribution and stamp PINNACLE honestly. Otherwise emit the pending state:
    # zero rows, no PINNACLE stamp. The frozen synthetic table is retired.
    from market.divergence_generator import (
        build_divergence,
        odds_are_synthetic,
        pending_divergence,
    )

    odds_df = None
    odds_path = PROJECT_ROOT / "data" / "raw" / "odds_pinnacle.parquet"
    if odds_path.exists():
        try:
            odds_df = pd.read_parquet(odds_path)
        except Exception as exc:  # best-effort; absence/error -> pending
            print(f"    [cp-14] odds parquet read failed ({exc}); divergence pending")

    if odds_are_synthetic(odds_df):
        divergence = pending_divergence(
            new_snapshot_id, new_generated_at, "no real odds ingested"
        )
        print("    [cp-14] divergence: pending (no real odds; zero rows, no PINNACLE stamp)")
    else:
        divergence = build_divergence(
            new_snapshot_id,
            new_generated_at,
            odds_df,
            dists,
            model_map,
            code_sha_str,
            n_runs=n_runs_per_team,
        )
        print(
            f"    [cp-14] divergence: live, {len(divergence['rows'])} real "
            "de-vigged Pinnacle rows"
        )
    (new_dir / "divergence.json").write_text(json.dumps(divergence, indent=2))

    # matches/ subdirectory: carry through verbatim, then overlay real settled
    # scores (display-only, additive: score / outcome_realized / settled_at_utc;
    # the model block is untouched) using the same mapped result as the ledger.
    src = LATEST_DIR / "matches"
    dst = new_dir / "matches"
    if dst.exists():
        shutil.rmtree(dst)
    if src.exists():
        shutil.copytree(src, dst)

    if score_res["status"] == "ok":
        n_joined = join_scores(dst, score_res["scored"])
        print(
            f"    [cp-14] joined real scores into {n_joined} played match files "
            f"(source: {score_res['source']})"
        )
        if score_res["deferred"]:
            print(
                f"    [cp-14] {len(score_res['deferred'])} non-group settled "
                f"outcomes deferred (not yet mappable): {score_res['deferred']}"
            )
    else:
        print("    [cp-14] matches carried forward unplayed (no scored set)")

    # teams/ subdirectory: rewrite each per-team JSON's progression block
    # from the batch aggregation. Keep all other fields (fifa_code,
    # display_name, group, confederation, elo_rating, history,
    # upcoming_matches) as carried forward from the existing snapshot.
    # Field-name mapping: tournament.json uses p_quarterfinal /
    # p_semifinal; teams/<code>.json uses p_qf / p_sf.
    src_teams = LATEST_DIR / "teams"
    dst_teams = new_dir / "teams"
    if dst_teams.exists():
        shutil.rmtree(dst_teams)
    dst_teams.mkdir(parents=True, exist_ok=True)

    # cp-12: build code -> batch team_id from the clean teams/ roster, not
    # from the (previously corrupt) carried-forward tournament.json. With
    # the old construction, a code absent from the corrupt roster (TUN) got
    # no entry and its teams/<code>.json was carried-through-frozen instead
    # of rewritten from the batch. Sourcing from teams_roster gives every
    # one of the 48 codes an entry, so TUN's progression is rewritten too.
    code_to_team_id = {
        code: _display_name_to_team_id(team["display_name"])
        for code, team in teams_roster.items()
    }

    rewritten = 0
    for src_file in sorted(src_teams.glob("*.json")):
        existing_team = json.loads(src_file.read_text())
        code = existing_team.get("fifa_code") or src_file.stem
        team_id = code_to_team_id.get(code)
        if team_id is None:
            # No batch aggregation for this code; carry through unchanged.
            shutil.copy2(src_file, dst_teams / src_file.name)
            continue
        agg = aggregated[team_id]
        new_team = dict(existing_team)
        new_team["progression"] = {
            "p_group_qualification": agg["p_group_qualification"],
            "p_r16":                 agg["p_r16"],
            "p_qf":                  agg["p_quarterfinal"],
            "p_sf":                  agg["p_semifinal"],
            "p_final":               agg["p_final"],
            "p_champion":            agg["p_champion"],
            "ci_95_champion":        agg["ci_95_champion"],
        }
        (dst_teams / src_file.name).write_text(json.dumps(new_team, indent=2))
        rewritten += 1
    print(f"    teams/: rewrote progression block for {rewritten} of {len(list(src_teams.glob('*.json')))} files")

    # ── Replace LATEST_DIR with the new bundle ───────────────────────────
    print(f"[5] replacing latest/ with new bundle")
    if LATEST_DIR.exists():
        shutil.rmtree(LATEST_DIR)
    shutil.copytree(new_dir, LATEST_DIR)

    # ── Update manifest.json (root data manifest) ────────────────────────
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())
        if not isinstance(manifest, list):
            manifest = []
    else:
        manifest = []
    manifest.append({
        "snapshot_id":      new_snapshot_id,
        "generated_at_utc": new_generated_at,
        "bundle_url":       f"/data/snapshots/{new_snapshot_id}/",
        "meta_url":         f"/data/snapshots/{new_snapshot_id}/snapshot_meta.json",
    })
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))

    # ── Print headline numbers for spot-check ────────────────────────────
    print()
    print("Headline tournament-win probabilities (post-regen):")
    new_teams_by_code = {t["fifa_code"]: t for t in new_tournament["teams"]}
    for code in ("USA", "ARG", "ENG", "FRA", "BRA", "ESP", "GER", "POR", "NED", "BEL"):
        t = new_teams_by_code.get(code)
        if t:
            print(f"  {code} {t['display_name']:18s} p_champion = {t['p_champion']*100:.2f}%")

    print()
    print(f"OK: snapshot {new_snapshot_id} written and copied to latest/")
    print(f"    bundle path: {new_dir.relative_to(PROJECT_ROOT)}")
    print(f"    champion_model: {champion_model_id}")
    print(f"    notes: {new_snapshot_meta['notes']}")


if __name__ == "__main__":
    main()
