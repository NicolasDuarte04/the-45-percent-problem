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

cp-16 step (a): the per-team progression marginals (tournament.json) and
their provenance stamps are pinned to the FROZEN pre-registered batch via
``frozen_batch.py`` (``FROZEN_BATCH_ID``), NOT to ``active_batch.json``. The
nightly rebatch (``_maybe_rebatch_for_settled_delta``) still runs and still
updates ``active_batch.json`` (consumed by the conditioning loader and kept
as an audit trail), but its re-simulated output no longer feeds any frozen
surface. See ``frozen_batch.py`` for the rationale.
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

from frozen_batch import (  # noqa: E402
    FROZEN_BATCH_ID,
    FROZEN_BATCH_PATH,
    FROZEN_STRENGTH_MATRIX_SHA256,
    FROZEN_TEAM_RUNS_M2,
)
from scripts.snapshot_retention import prune_snapshots  # noqa: E402

WEBSITE_DATA_ROOT = PROJECT_ROOT / "website" / "public" / "data"
LATEST_DIR        = WEBSITE_DATA_ROOT / "latest"
SNAPSHOTS_DIR     = WEBSITE_DATA_ROOT / "snapshots"
# cp-31: committed archive of automated daily Brief issues, one JSON per Colombia
# civil day. Served by website/src/lib/brief.ts; persisted by the same
# `git add website/public/data/` the nightly / on-demand regen already commits.
BRIEFS_DIR        = WEBSITE_DATA_ROOT / "briefs"
MANIFEST_PATH     = WEBSITE_DATA_ROOT / "manifest.json"
ACTIVE_BATCH_JSON = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"
CHAMPION_MODEL_JSON = PROJECT_ROOT / "data" / "calibration" / "champion_model.json"
FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
# cp-19: FD-sourced kickoff overrides (match_id -> ISO Z), produced by
# scripts/build_wc2026_schedule.py. Used to heal the kickoffs that this regen
# otherwise carries forward verbatim (see overlay_kickoffs).
KICKOFFS_JSON = PROJECT_ROOT / "data" / "raw" / "wc2026_kickoffs.json"
AMENDMENT_POINTER = "osf/amendments/amendment_v1.1_data_completeness.md"

# cp-09 part 2: optional parquet snapshot of the website's `match_outcomes`
# table. If a future ingestion shim exports this file, the script reads
# the settled count from there rather than querying Postgres. Path is
# overridable via the `MATCH_OUTCOMES_PARQUET` env var so a CI job that
# stages the export elsewhere can wire it without touching this constant.
MATCH_OUTCOMES_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"

# cp-17 Stage 2b: the concrete knockout pairings learned from the schedule feed
# (ingestion/fetch_knockout_pairings.py) and the per-match live knockout surface
# the producer emits from them. Both live in their own namespaces, disjoint from
# the graded `matches/` files and the frozen bracket surfaces.
LIVE_KNOCKOUT_PAIRINGS = PROJECT_ROOT / "data" / "live" / "knockout_pairings.json"
MATCHES_LIVE_DIRNAME = "matches_live"
# Seeded, fixed-size per-pairing Monte Carlo for the advance / tie-level probs.
# Deterministic given the locked strengths, so each regen recomputes a stable
# number; no per-card freeze-pin is required (Stage 2b methodology).
LIVE_KNOCKOUT_MC_SIMS = 20000
LIVE_KNOCKOUT_SEED_BASE = 20260512


# cp-19: kickoff healing ------------------------------------------------------
def load_kickoff_overrides(path: Path = KICKOFFS_JSON) -> dict[str, str]:
    """Load the FD-sourced kickoff map (match_id -> ISO Z). Empty if absent."""
    if not path.exists():
        return {}
    doc = json.loads(path.read_text())
    return doc.get("kickoffs", {}) or {}


def overlay_kickoffs(matches_dir: Path, kickoffs: dict[str, str]) -> int:
    """Heal carried-forward match kickoffs from the authoritative FD map.

    This regen copies ``matches/*.json`` forward verbatim, so a kickoff baked
    into an older snapshot would otherwise persist even after the source was
    corrected. This rewrites ``kickoff_utc`` for any match id present in
    ``kickoffs``, normalised to the same ``+00:00`` ISO form the published
    files already use. Additive and idempotent: ids absent from the map are
    untouched, so a partial map is strictly an improvement. Returns the number
    of files changed.
    """
    if not kickoffs:
        return 0
    changed = 0
    for jf in sorted(Path(matches_dir).glob("*.json")):
        doc = json.loads(jf.read_text())
        new = kickoffs.get(doc.get("match_id"))
        if not new:
            continue
        normalised = datetime.fromisoformat(new.replace("Z", "+00:00")).isoformat()
        if doc.get("kickoff_utc") != normalised:
            doc["kickoff_utc"] = normalised
            jf.write_text(json.dumps(doc, indent=2) + "\n")
            changed += 1
    return changed


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


def emit_live_conditional_bracket(
    active: dict,
    teams_roster: dict[str, dict],
    prior_rank_change: dict[str, int],
    new_snapshot_id: str,
    new_generated_at: str,
    model_variant: str,
    out_dir: Path,
) -> None:
    """cp-16b: emit the live conditional bracket from the ACTIVE re-sim batch.

    Writes two SEPARATE, explicitly UNGRADED files into ``out_dir``:
    ``tournament_live.json`` (per-team progression marginals aggregated from the
    active batch) and ``bracket_live.json`` (the structural slots, identical to
    the frozen bracket), each stamped with a REQUIRED ``live_provenance`` block
    so they can never be mistaken for the frozen pre-registered surfaces.

    The active handle is ``active`` AFTER ``_maybe_rebatch_for_settled_delta``,
    captured in ``main`` before the frozen override (``active_batch_id =
    FROZEN_BATCH_ID``) shadows it. Today, conditioning is not yet wired, so the
    active batch is an unconditioned re-simulation of the champion and the live
    object equals the frozen forecast numerically (``conditioned=False``).

    Reuses the batch-agnostic helpers ``aggregate_team_progression`` and
    ``regenerate_tournament_json`` verbatim. No graded surface reads these files
    (disjoint filenames + the loadLiveBracket null loader). See
    osf/amendments/deviation_cp-16b_live_conditional_bracket.md.

    Defensive: any failure (missing active parquet, aggregation error) is logged
    and the live emission is SKIPPED. The caller has already finished the frozen
    bundle in ``out_dir``; skipping here leaves the frozen publish untouched, and
    the null loader renders the public page frozen-only.
    """
    try:
        active_batch_id = active.get("active_batch_id")
        active_batch_path = active.get("active_batch_path")
        if not active_batch_id or not active_batch_path:
            print(
                "    [cp-16b] active_batch.json missing id/path; "
                "live conditional bracket skipped"
            )
            return
        live_team_runs = PROJECT_ROOT / active_batch_path / "team_runs_M2.parquet"
        if not live_team_runs.exists():
            print(
                f"    [cp-16b] active team_runs absent ({live_team_runs}); "
                "live conditional bracket skipped (frozen bundle unaffected)"
            )
            return

        live_runs = pd.read_parquet(live_team_runs)
        live_aggregated = aggregate_team_progression(live_runs)
        live_n_runs = max(row["n_runs"] for row in live_aggregated.values())

        # cp-16c: derive the honest conditioning flag from the active batch's
        # stamped provenance. settled_count_at_batch_time is the CONDITIONED
        # count load_settled produced for this batch (len of the M{NN}-keyed
        # dict); settled_source carries a ";conditioning_error=<reason>" tag when
        # the loader degraded on a structural failure. The live object is marked
        # conditioned only when the batch conditioned at least one match and the
        # loader did not degrade.
        settled_count = int(active.get("settled_count_at_batch_time", 0) or 0)
        settled_source = str(active.get("settled_source", "") or "")
        conditioning_error = None
        if "conditioning_error=" in settled_source:
            conditioning_error = settled_source.split("conditioning_error=", 1)[1]
        conditioned = settled_count > 0 and conditioning_error is None
        if conditioned:
            conditioned_reason = None
        elif conditioning_error is not None:
            conditioned_reason = f"structural_failure:{conditioning_error}"
        else:
            conditioned_reason = "no_settled_group_matches"

        # cp-27: read the LIVE knockout-conditioning provenance the batch runner
        # stamped on the active batch's manifest. knockout_conditioned is True
        # when the active batch consumed the REAL R32 draw and fixed the decided
        # knockout matches; the count is how many knockout matches were fixed.
        # Absent (older manifest) -> False, so the copy degrades honestly.
        knockout_conditioned = False
        knockout_conditioned_count = 0
        try:
            manifest_path = PROJECT_ROOT / active_batch_path / "manifest.json"
            if manifest_path.exists():
                mf = json.loads(manifest_path.read_text())
                knockout_conditioned = bool(mf.get("knockout_conditioned", False))
                knockout_conditioned_count = int(mf.get("knockout_settled_count", 0) or 0)
        except Exception as exc:  # provenance is best-effort; never break the live emit
            print(f"    [cp-27] knockout provenance read skipped ({exc})")

        live_provenance = {
            # The active batch the live marginals were aggregated from. Distinct
            # from FROZEN_BATCH_ID once the rebatch repoints; today they coincide.
            "live_source_batch_id": active_batch_id,
            # cp-16c: True once result-conditioning fired on this batch.
            "conditioned": conditioned,
            "conditioned_count": settled_count,
            "conditioned_reason": conditioned_reason,
            "settled_source": settled_source,
            # cp-27: knockout-stage conditioning on the real R32 draw.
            "knockout_conditioned": knockout_conditioned,
            "knockout_conditioned_count": knockout_conditioned_count,
            "generated_at_utc": new_generated_at,
        }

        live_tournament = regenerate_tournament_json(
            teams_roster,
            live_aggregated,
            prior_rank_change,
            new_snapshot_id,
            new_generated_at,
            live_n_runs,
            model_variant,
        )
        live_tournament["live_provenance"] = live_provenance

        live_bracket = populate_bracket_slots(new_snapshot_id)
        live_bracket["live_provenance"] = live_provenance

        (out_dir / "tournament_live.json").write_text(
            json.dumps(live_tournament, indent=2)
        )
        (out_dir / "bracket_live.json").write_text(
            json.dumps(live_bracket, indent=2)
        )
        print(
            f"    [cp-16b/c] live conditional bracket emitted from "
            f"active_batch_id={active_batch_id} conditioned={conditioned} "
            f"conditioned_count={settled_count}"
            + (f" reason={conditioned_reason}" if conditioned_reason else "")
        )
    except Exception as exc:  # broad on purpose: live emission must never break
        print(
            f"    [cp-16b] live conditional bracket skipped (error: {exc}); "
            "frozen bundle unaffected"
        )


def _knockout_strengths(teams_roster: dict[str, dict]) -> tuple[dict[str, float], dict[str, str]]:
    """Build (elo_by_display, code_to_display) from the clean teams/ roster.

    teams/<code>.json carries the SAME locked ``elo_rating`` the group producer's
    strength provider uses (it was written from load_elo_ratings; it reproduces
    the published group-card lambdas exactly). Sourcing the per-pairing strengths
    from here keeps the knockout cards on the same locked strengths the group
    producer uses, with zero dependency on the gitignored canonical-draw file or
    on the corrupt knockout slot descriptors. M2_fifa stays locked: no unlock,
    refit, or re-estimation happens here.
    """
    elo_by_display: dict[str, float] = {}
    code_to_display: dict[str, str] = {}
    for code, tj in teams_roster.items():
        display = tj.get("display_name") or code
        code_to_display[code] = display
        elo = tj.get("elo_rating")
        if elo is not None:
            elo_by_display[display] = float(elo)
    return elo_by_display, code_to_display


def _build_knockout_card(
    *,
    home_code: str,
    away_code: str,
    home_display: str,
    away_display: str,
    round_code: str,
    sp,
    mm,
    n_sims: int,
    seed: int,
) -> dict:
    """Compute one ungraded knockout card under the locked engine.

    1X2 and the goal matrix are analytic from ``MatchModel.joint_pmf`` on the
    locked lambdas, exactly as the group cards are built. Advance and tie-level
    probabilities come from a seeded per-pairing Monte Carlo that calls
    ``ShootoutModel.resolve_knockout`` verbatim (regulation, damped extra time,
    penalties) so there is zero tie-resolution drift. The winner is a true
    sample, so the advance probability is legitimate; the penalty SCORES are
    never rendered (they are expected-value estimates, not a sampled sequence).
    """
    import numpy as np

    from simulation.match_model import MatchModel
    from simulation.shootout_model import ShootoutModel

    lam_h, lam_a = sp.get_lambdas(home_display, away_display, context=round_code)
    pmf = mm.joint_pmf(lam_h, lam_a)
    p_home = float(np.tril(pmf, k=-1).sum())
    p_draw = float(np.trace(pmf))
    p_away = float(np.triu(pmf, k=1).sum())
    goals_matrix = pmf[:11, :11].tolist()

    # Seeded per-pairing Monte Carlo. A fresh MatchModel + ShootoutModel share one
    # seeded rng (the same wiring the MonteCarloRunner uses per run), so the
    # advance numbers are deterministic and reproducible across regens.
    rng = np.random.default_rng(seed)
    mc_mm = MatchModel(rho=mm.rho, lambda3=mm.lambda3, max_goals=mm.max_goals, rng=rng)
    mc_sm = ShootoutModel(match_model=mc_mm, rng=rng)
    elo_a = sp.get_elo(home_display)
    elo_b = sp.get_elo(away_display)

    home_adv = 0
    to_et = 0
    to_pens = 0
    home_pen_wins = 0
    for _ in range(n_sims):
        reg_h, reg_a = mc_mm.sample_scoreline(lam_h, lam_a)
        if reg_h > reg_a:
            home_adv += 1
        elif reg_a > reg_h:
            pass  # away advances
        else:
            ko = mc_sm.resolve_knockout(lam_h, lam_a, elo_a, elo_b, reg_score=(reg_h, reg_a))
            to_et += 1
            if ko["went_to_pens"]:
                to_pens += 1
            if ko["winner"] == "home":
                home_adv += 1
                if ko["went_to_pens"]:
                    home_pen_wins += 1

    p_advance_home = home_adv / n_sims
    p_advance_away = (n_sims - home_adv) / n_sims
    p_to_extra_time = to_et / n_sims
    p_to_shootout = to_pens / n_sims
    # Conditional home shootout-win probability, only when it falls out cleanly
    # (at least one sampled shootout). Never the penalty scores; just P(home wins
    # | the tie reaches penalties), whose winner is a true sample.
    p_shootout_home_if_ko = (home_pen_wins / to_pens) if to_pens > 0 else None

    return {
        "match_id": None,  # filled by the caller
        "round": round_code,
        "kickoff_utc": None,  # filled by the caller
        "home": {"fifa_code": home_code, "display_name": home_display},
        "away": {"fifa_code": away_code, "display_name": away_display},
        "p_model_1x2": {"H": p_home, "D": p_draw, "A": p_away},
        "p_model_goals": goals_matrix,
        "lambda": {"home": float(lam_h), "away": float(lam_a), "rho": float(mm.rho)},
        "shootout_applicable": True,
        "p_shootout_home_if_ko": p_shootout_home_if_ko,
        "market_divergence": [],
        "strength_inputs": {
            "elo_home": float(elo_a),
            "elo_away": float(elo_b),
            "form_home": 0.0,
            "form_away": 0.0,
            "fifa_rank_home": 0,
            "fifa_rank_away": 0,
        },
        "forecast_ids": [],
        # Additive knockout fields. p_advance_home + p_advance_away == 1 by
        # construction (every simulated tie resolves to a winner).
        "p_advance_home": p_advance_home,
        "p_advance_away": p_advance_away,
        "p_to_extra_time": p_to_extra_time,
        "p_to_shootout": p_to_shootout,
    }


def _knockout_settle_lookup(stage_scope_excluded: set[str]) -> dict[str, dict]:
    """Build a settle lookup of FINISHED knockout outcomes, keyed for matching.

    Reads the settled stream via the shared settled-source reader (the same one
    cp-14 uses) but keeps ONLY knockout-stage rows (stage not in the excluded
    group scope). This is display-only settling of the live card; it never writes
    match_outcomes and never feeds the graded ledger. Returns a dict keyed by
    both the FD source id (``FD<id>``) and the unordered FIFA-code pair, so a
    pairing settles whether its id or its team identity matches.
    """
    from evaluation.settled_source import load_settled_outcomes

    rows, _source = load_settled_outcomes()
    lookup: dict[str, dict] = {}
    if rows is None:
        return lookup
    for _, row in rows.iterrows():
        stage = str(row.get("stage") or "").lower()
        if stage in stage_scope_excluded:
            continue
        hg, ag = row.get("home_goals"), row.get("away_goals")
        if hg is None or ag is None or pd.isna(hg) or pd.isna(ag):
            continue
        # cp-22: penalty-shootout fields ride alongside the regulation score.
        # home_goals/away_goals are the REGULATION (incl. extra time) result;
        # the shootout tally is carried separately for display.
        sw = row.get("shootout_winner")
        sw = sw if isinstance(sw, str) and sw else None
        sh = row.get("shootout_home")
        sa_pens = row.get("shootout_away")
        rec = {
            "home_team": row.get("home_team"),
            "away_team": row.get("away_team"),
            "home_goals": int(hg),
            "away_goals": int(ag),
            "settled_at": row.get("settled_at"),
            "shootout_winner": sw,
            "shootout_home": None if sh is None or pd.isna(sh) else int(sh),
            "shootout_away": None if sa_pens is None or pd.isna(sa_pens) else int(sa_pens),
        }
        mid = str(row.get("match_id") or "")
        if mid:
            lookup[mid] = rec
        hc, ac = rec["home_team"], rec["away_team"]
        if hc and ac:
            lookup[f"pair:{frozenset((hc, ac))}"] = rec
    return lookup


def emit_live_knockout_matches(
    teams_roster: dict[str, dict],
    source_batch_id: str,
    new_generated_at: str,
    out_dir: Path,
) -> dict[str, dict]:
    """cp-17 Stage 2b: emit per-match live knockout cards from the real draw.

    Reads the concrete pairings learned by ingestion/fetch_knockout_pairings.py
    (``data/live/knockout_pairings.json``) and, for each, writes an explicitly
    UNGRADED card to ``out_dir/matches_live/{match_id}.json``. Each card is built
    under the locked engine (analytic 1X2 + goal matrix, plus a seeded
    resolve_knockout Monte Carlo for the advance / tie-level probabilities) and
    stamped with a ``live_provenance`` block carrying ``graded: false``.

    Integrity (Stage 2b constraints):
      - These files are read by NO graded surface. They live in their own
        ``matches_live/`` namespace with their own loader; the frozen ledger,
        snapshotProbs.ts, tournament.json marginals, and the frozen override are
        untouched.
      - The schedule feed is used only to learn who plays whom; it is never a
        results source. A FINISHED knockout settles the live card (display-only
        realised score next to the locked pre-match forecast) and never touches
        the frozen graded ledger or the frozen Brier.
      - M2_fifa stays locked; the strengths come from the same roster the group
        producer uses (see ``_knockout_strengths``).

    Defensive: any failure (missing pairings file, roster gap, aggregation error)
    is logged and the emission is SKIPPED, leaving the frozen bundle in
    ``out_dir`` untouched. A missing or empty pairings file is the normal
    pre-draw state and emits nothing.
    """
    emitted_cards: dict[str, dict] = {}
    try:
        if not LIVE_KNOCKOUT_PAIRINGS.exists():
            print(
                "    [cp-17] no knockout pairings file "
                f"({LIVE_KNOCKOUT_PAIRINGS}); live knockout surface skipped"
            )
            return emitted_cards
        doc = json.loads(LIVE_KNOCKOUT_PAIRINGS.read_text())
        pairings = doc.get("pairings", [])
        if not pairings:
            print("    [cp-17] knockout pairings file has 0 concrete pairings; nothing to emit")
            return emitted_cards

        from simulation.match_model import MatchModel
        from simulation.monte_carlo_runner import SimpleEloProvider

        elo_by_display, code_to_display = _knockout_strengths(teams_roster)
        sp = SimpleEloProvider(elo_by_display)
        mm = MatchModel()

        schedule_feed = doc.get("schedule_feed", {})
        settle_lookup = _knockout_settle_lookup(stage_scope_excluded={"group"})

        live_dir = out_dir / MATCHES_LIVE_DIRNAME
        live_dir.mkdir(parents=True, exist_ok=True)

        emitted = 0
        settled = 0
        for p in pairings:
            match_id = p.get("match_id")
            home_code = (p.get("home") or {}).get("fifa_code")
            away_code = (p.get("away") or {}).get("fifa_code")
            home_display = code_to_display.get(home_code)
            away_display = code_to_display.get(away_code)
            if not match_id or home_display is None or away_display is None:
                print(
                    f"    [cp-17] pairing {match_id} unmapped "
                    f"({home_code} / {away_code}); skipped"
                )
                continue

            # Deterministic per-pairing seed derived from the stable match id.
            seed = LIVE_KNOCKOUT_SEED_BASE + (
                int(hashlib.sha256(str(match_id).encode()).hexdigest(), 16) % 1_000_000
            )
            card = _build_knockout_card(
                home_code=home_code,
                away_code=away_code,
                home_display=home_display,
                away_display=away_display,
                round_code=p.get("round", "R32"),
                sp=sp,
                mm=mm,
                n_sims=LIVE_KNOCKOUT_MC_SIMS,
                seed=seed,
            )
            card["match_id"] = match_id
            card["kickoff_utc"] = p.get("kickoff_utc")

            # Settle the live card (display-only) when the match has FINISHED.
            source_id = p.get("source_id")
            rec = settle_lookup.get(f"FD{source_id}") or settle_lookup.get(
                f"pair:{frozenset((home_code, away_code))}"
            )
            if rec is not None:
                hg, ag = rec["home_goals"], rec["away_goals"]
                card["score"] = {"home": hg, "away": ag}
                card["outcome_realized"] = "H" if hg > ag else ("A" if ag > hg else "D")
                sa = rec.get("settled_at")
                card["settled_at_utc"] = None if sa is None or pd.isna(sa) else str(sa)
                # cp-22: a penalty-decided knockout is a regulation draw
                # (outcome_realized == "D"); the score above is the regulation
                # (incl. extra time) result, NEVER the penalty-inflated
                # aggregate. Attach the shootout result so the card can render
                # "Decided on penalties (X won N-M)". Display-only and ungraded.
                sw = rec.get("shootout_winner")
                sh, sa_pens = rec.get("shootout_home"), rec.get("shootout_away")
                if sw or (sh is not None and sa_pens is not None):
                    winner_side = (
                        "H" if sw == home_code else ("A" if sw == away_code else None)
                    )
                    card["shootout"] = {
                        "winner": winner_side,
                        "home": sh,
                        "away": sa_pens,
                    }
                settled += 1

            card["live_provenance"] = {
                "source_batch_id": source_batch_id,
                "schedule_feed": {
                    "source": schedule_feed.get("source"),
                    "fetched_at_utc": schedule_feed.get("fetched_at_utc"),
                },
                "graded": False,
                "n_sims": LIVE_KNOCKOUT_MC_SIMS,
                "generated_at_utc": new_generated_at,
            }

            (live_dir / f"{match_id}.json").write_text(json.dumps(card, indent=2) + "\n")
            emitted_cards[str(match_id)] = card
            emitted += 1

        print(
            f"    [cp-17] live knockout cards emitted: {emitted} "
            f"({settled} settled) into {MATCHES_LIVE_DIRNAME}/"
        )
    except Exception as exc:  # broad on purpose: live emission must never break
        print(
            f"    [cp-17] live knockout surface skipped (error: {exc}); "
            "frozen bundle unaffected"
        )
    return emitted_cards


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
    # cp-16 step (a): the published per-team progression marginals are a FROZEN
    # pre-tournament forecast. Read them from the frozen batch via
    # frozen_batch.py, NOT from active_batch.json which the rebatch above
    # repoints whenever the settled count changes. The rebatch keeps running
    # (it still updates active_batch.json for the conditioning loader and the
    # audit trail); its output is simply not read by any frozen surface.
    # active_batch_id holds the frozen id here so the snapshot_meta /
    # data_sha provenance stamps describe the frozen source they came from.
    active_batch_id = FROZEN_BATCH_ID
    batch_path = FROZEN_BATCH_PATH
    team_runs_path = FROZEN_TEAM_RUNS_M2
    if not team_runs_path.exists():
        raise FileNotFoundError(f"Frozen batch missing M2 outputs: {team_runs_path}")
    print(f"[1] active_batch_id : {active_batch_id}  (frozen pin)")
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
    # cp-16 step (a): anchor the published data_sha to the FROZEN batch, not the
    # rebatched active dict, so it is independent of active_batch.json. (The lock
    # sha is carried forward unchanged across rebatches, so the value is stable
    # today; this makes the independence explicit rather than incidental.)
    data_sha_str = _data_sha(
        {
            "active_batch_id": FROZEN_BATCH_ID,
            "matrix_sha256_lock": FROZEN_STRENGTH_MATRIX_SHA256,
        }
    )
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
    from evaluation.match_score_join import (
        halt_if_mapping_error,
        join_scores,
        resolve_scored,
    )
    from evaluation.reconstruct_forecasts import (
        build_ledger_rows,
        reconstruct_distributions,
    )

    matches_src = LATEST_DIR / "matches"
    score_res = resolve_scored(matches_dir=matches_src)

    # cp-14 ARMED GATE. Three explicit, distinct branches:
    #   mapping_error: a settled match failed the bijection (no-fixture,
    #     score-conflict, double-claim, orientation, or id-vs-team disagreement).
    #     HALT with a non-zero exit BEFORE writing any artifact. The snapshot is
    #     not swapped into latest/ (that happens far below), the workflow's
    #     commit step is gated on a clean regen, so a bad settled match is never
    #     auto-published. This is a hard stop, never a silent fallback.
    #   no_source: no settled data is reachable (the common no-DB CI path). A
    #     clean, clearly-logged skip; the ledger is simply empty. Exit stays 0
    #     so the cp-09 smoke (which runs with no DB) stays green.
    #   ok: proceed and reconstruct.
    halt_if_mapping_error(score_res)  # SystemExit(2) before any artifact write
    if score_res["status"] == "no_source":
        print(
            f"    [cp-14] DB unavailable, settled join skipped "
            f"(source: {score_res['source']}); ledger empty until matches settle"
        )

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
    # status is "ok" or "no_source" here (mapping_error already halted above).
    ledger_rows: list = []
    if score_res["status"] == "ok":
        ledger_rows = build_ledger_rows(score_res["scored"], dists, code_sha_str)
        collapsed = score_res.get("collapsed") or []
        print(
            f"    [cp-14] reconstructed ledger: {len(ledger_rows)} settled "
            f"forecasts scored against frozen M2 batch"
            + (f"; {len(collapsed)} exact-identical duplicate(s) collapsed" if collapsed else "")
        )
        if score_res.get("deferred"):
            print(
                f"    [cp-14] {len(score_res['deferred'])} non-group settled "
                f"outcome(s) deferred: {score_res['deferred']}"
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

    # cp-25b: the Round of 16 pre-registered kill-criterion checkpoint. Runs
    # AFTER evaluation_metrics.json is written into new_dir and BEFORE the
    # copytree into latest/, so a written artifact rides into latest/ for free
    # (the same pattern the live bracket / knockout emitters use). Idempotent and
    # once-only: it publishes r16_checkpoint.json exactly once (when the settled
    # R16 count reaches 8), then carries the frozen result forward byte-identical
    # on every later run. It never recomputes after publication, never touches the
    # graded ledger or the kill_criteria_check block, and only ADDS the
    # r16_checkpoint sibling field onto evaluation_metrics.json. R16_CHECKPOINT_FORCE
    # is the manual workflow_dispatch override (bypasses the settled-count gate).
    from evaluation.r16_checkpoint import publish_if_triggered as publish_r16_checkpoint

    r16_force = os.environ.get("R16_CHECKPOINT_FORCE", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )
    try:
        publish_r16_checkpoint(
            new_dir=new_dir,
            latest_dir=LATEST_DIR,
            code_sha=code_sha_str,
            evaluated_at_utc=new_generated_at,
            force=r16_force,
            matches_dir=matches_src,
        )
    except SystemExit:
        # A bijection HALT inside the checkpoint is a hard stop, same contract as
        # the ledger scorer above; let it propagate so nothing is published.
        raise
    except Exception as exc:  # noqa: BLE001 - defensive; never break the nightly
        print(f"    [cp-25b] checkpoint skipped (non-fatal): {exc}")

    # cp-30: emit the live knockout cards BEFORE the divergence block so the
    # knockout divergence can read this run's own conditioned per-match 1X2
    # (p_model_1x2) as its model source. The cards are written into new_dir (they
    # still ride the copytree into latest/); we also capture them in-memory to
    # feed build_divergence. Defensive: on any failure this returns {} and
    # divergence simply produces no knockout rows.
    knockout_cards = emit_live_knockout_matches(
        teams_roster,
        FROZEN_BATCH_ID,
        new_generated_at,
        new_dir,
    )

    # cp-14 commit 5 / cp-30: gated divergence (Decision B, extended to knockout).
    # If real odds are present (the producer ran a real tier) AND the snapshot is
    # fresh, de-vig them: group fixtures against the frozen champion distribution,
    # knockout fixtures against the live conditioned per-match cards, all stamped
    # PINNACLE honestly. If no real odds -> pending. If real but stale (older than
    # the operational freshness threshold) -> stale. Both publish zero rows and no
    # PINNACLE stamp; status "live" is reserved for genuinely fresh odds. The
    # freshness guard is operational plumbing, NOT a pre-registered gate rule.
    from market.divergence_generator import (
        build_divergence,
        is_odds_snapshot_stale,
        odds_are_synthetic,
        odds_snapshot_age_minutes,
        pending_divergence,
        stale_divergence,
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
    elif is_odds_snapshot_stale(odds_df, new_generated_at):
        age = odds_snapshot_age_minutes(odds_df, new_generated_at)
        divergence = stale_divergence(new_snapshot_id, new_generated_at, age)
        print(
            f"    [cp-30] divergence: stale (odds age {age} min exceeds freshness "
            "threshold; zero rows, no PINNACLE stamp)"
        )
    else:
        divergence = build_divergence(
            new_snapshot_id,
            new_generated_at,
            odds_df,
            dists,
            model_map,
            code_sha_str,
            n_runs=n_runs_per_team,
            knockout_cards=knockout_cards,
        )
        n_ko = sum(1 for r in divergence["rows"] if r.get("round") != "GRP")
        print(
            f"    [cp-14] divergence: live, {len(divergence['rows'])} real "
            f"de-vigged Pinnacle rows ({n_ko} knockout)"
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

    # cp-19: heal kickoffs that copytree carried forward verbatim. The FD-sourced
    # map is the authoritative display time; this overlay is the one place the
    # frozen carry-forward gets corrected on every regen.
    n_kickoffs = overlay_kickoffs(dst, load_kickoff_overrides())
    if n_kickoffs:
        print(f"    [cp-19] healed {n_kickoffs} kickoff(s) from {KICKOFFS_JSON.name}")

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

    # ── cp-16b: emit the live conditional bracket from the ACTIVE batch ───
    # Written into new_dir BEFORE the copytree below, so it rides snapshot
    # retention into latest/ for free (history carries it too). `active` is the
    # rebatch handle captured above, before the frozen override shadowed it.
    # Defensive: skips-with-log on any failure, leaving the frozen bundle intact.
    emit_live_conditional_bracket(
        active,
        teams_roster,
        prior_rank_change,
        new_snapshot_id,
        new_generated_at,
        champion_internal,
        new_dir,
    )

    # ── cp-17 Stage 2b: live knockout cards ───────────────────────────────
    # Emitted earlier (before the divergence block) so cp-30 knockout divergence
    # can read this run's own conditioned per-match 1X2 as its model source. The
    # cards were written into new_dir there and ride the copytree into latest/.
    # Read by no graded surface (own matches_live/ namespace + dedicated null
    # loader); the frozen ledger, calibration, and locked model are untouched.

    # ── cp-31: generate today's automated daily Brief ────────────────────
    # A pure function of the bundle just written into new_dir (tournament,
    # snapshot_meta, divergence, matches/, matches_live/, r16_checkpoint). Runs
    # after every producing block so it reads the final state, and BEFORE the
    # copytree so the issue is committed alongside the snapshot. Idempotent: one
    # file per Colombia civil day, overwritten in place on re-run. Defensive: a
    # failure here never breaks the nightly (same contract as the live emitters).
    try:
        from evaluation.build_daily_brief import publish_daily_brief

        brief_path = publish_daily_brief(
            bundle_dir=new_dir,
            briefs_dir=BRIEFS_DIR,
            generated_at_utc=new_generated_at,
        )
        print(f"    [cp-31] daily brief written: {brief_path.relative_to(PROJECT_ROOT)}")
    except Exception as exc:  # noqa: BLE001 - never break the nightly on the brief
        print(f"    [cp-31] daily brief skipped (non-fatal): {exc}")

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

    # ── cp-32: bounded snapshot retention ────────────────────────────────
    # Prune old bundles from the working tree (keep the last 48h + each earlier
    # Colombia civil day's final bundle) so checkout / deploy payload stays
    # bounded. Git history still holds every pruned bundle, so no audit trail is
    # lost. The just-written new_dir is within the 48h window, so it is always
    # kept. latest/ is a sibling of snapshots/ (never iterated here) and is
    # additionally in the protected set; the frozen batch lives outside
    # snapshots/ and is protected too. manifest.json is deliberately left intact
    # as the complete, git-history-backed index. Defensive: any failure here is
    # logged and swallowed, leaving the freshly published bundle untouched.
    try:
        prune_snapshots(SNAPSHOTS_DIR, now)
    except Exception as exc:  # noqa: BLE001 - retention must never break a publish
        print(f"    [retention] skipped (non-fatal): {exc}")

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
