"""
frozen_batch.py
===============
cp-16 step (a): single source of truth for the frozen, pre-registered champion
batch.

The published probabilities are a FROZEN pre-tournament forecast. The champion
model M2 produced that forecast in batch ``batch_20260512_013228Z`` (activated
2026-05-12, before the first kickoff), whose ``match_runs_M2.parquet`` and
``team_runs_M2.parquet`` are force-tracked in the repo.

Several "frozen-labeled" surfaces (the scored ledger, the published per-team
progression marginals in tournament.json, and the snapshotProbs.ts table the
bracket page and pick evaluator render and grade against) historically read
whatever ``data/calibration/active_batch.json`` pointed at. The nightly regen
re-simulates and repoints active_batch.json each time the settled count changes,
so those frozen surfaces were silently bound to the nightly re-sim. That was
only harmless while conditioning was a no-op. This module pins every frozen
surface to the batch below so correctness no longer depends on that.

What this module does NOT touch: the model, the rebatch / _maybe_rebatch logic,
the conditioning loader, or the team-pairing reader (pairings are identical
across batches; only the probability/marginal SOURCE is pinned here).

Provenance literals are copied from the frozen batch state at pin time and
cross-checked against the batch's own committed artifacts by
``tests/test_frozen_batch.py``, so a future batch swap (a changed id or a
mismatched strength-matrix sha) fails loudly rather than silently.
"""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent

# The only hardcoded identity of the frozen batch. Everything else derives from
# it (paths) or is cross-checked against the batch's committed files (sha).
FROZEN_BATCH_ID = "batch_20260512_013228Z"

# Path is stored relative to PROJECT_ROOT to match the convention
# active_batch.json uses for ``active_batch_path`` (a consumer that does
# ``PROJECT_ROOT / path`` keeps working).
FROZEN_BATCH_REL_PATH = f"outputs/phase5/batches/{FROZEN_BATCH_ID}"
FROZEN_BATCH_PATH = PROJECT_ROOT / "outputs" / "phase5" / "batches" / FROZEN_BATCH_ID
FROZEN_MATCH_RUNS_M2 = FROZEN_BATCH_PATH / "match_runs_M2.parquet"
FROZEN_TEAM_RUNS_M2 = FROZEN_BATCH_PATH / "team_runs_M2.parquet"

# Activation timestamp: data/calibration/active_batch.json::activated_at_utc as
# of the pin (equals this batch's manifest end_time_utc, truncated to seconds).
FROZEN_BATCH_ACTIVATED_UTC = "2026-05-12T01:33:11Z"

# Locked strength-matrix sha256 for the M2 run. Equals this batch's
# acceptance_report.json::matrix_sha256_run_M2 (== matrix_sha256_lock); the
# integrity test asserts the literal still equals the committed value.
FROZEN_STRENGTH_MATRIX_SHA256 = (
    "f732c0e7bb018496fe345263f8ba1b893c2cea23ce979927edbf2c25bd096efe"
)

# Expected run geometry of the frozen M2 parquets (blueprint-locked 10k website
# batch over 72 group matches / 48 teams). Asserted by the integrity test.
FROZEN_N_RUNS = 10_000
FROZEN_N_GROUP_MATCHES = 72
FROZEN_N_TEAMS = 48


def frozen_provenance() -> dict:
    """Provenance tags written onto every frozen pre-tournament surface.

    Keys mirror the shape the ledger and snapshot writers already consume from
    active_batch.json, so call sites swap the source without restructuring:
    ``source_batch_id``, ``source_batch_activated_utc``,
    ``source_strength_matrix_sha`` and ``active_batch_path`` (the latter kept
    for backward-compatible path resolution and doc annotations).
    """
    return {
        "source_batch_id": FROZEN_BATCH_ID,
        "source_batch_activated_utc": FROZEN_BATCH_ACTIVATED_UTC,
        "source_strength_matrix_sha": FROZEN_STRENGTH_MATRIX_SHA256,
        "active_batch_path": FROZEN_BATCH_REL_PATH,
    }
