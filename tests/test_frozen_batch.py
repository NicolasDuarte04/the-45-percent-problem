"""
tests/test_frozen_batch.py
==========================
cp-16 step (a): frozen-parquet integrity.

These tests pin the frozen pre-registered champion batch
(``batch_20260512_013228Z``) so a future batch swap, a truncated parquet, or a
strength-matrix drift fails loudly here rather than silently feeding the public
forecast. They assert the committed parquets parse, carry the blueprint-locked
10k run geometry, and that the frozen constant's strength-matrix sha still
matches the batch's own committed acceptance_report (the chain of custody).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from frozen_batch import (  # noqa: E402
    FROZEN_BATCH_ID,
    FROZEN_BATCH_PATH,
    FROZEN_MATCH_RUNS_M2,
    FROZEN_N_GROUP_MATCHES,
    FROZEN_N_RUNS,
    FROZEN_N_TEAMS,
    FROZEN_STRENGTH_MATRIX_SHA256,
    FROZEN_TEAM_RUNS_M2,
    frozen_provenance,
)

GROUP_PHASE = "group"


def test_frozen_batch_dir_is_committed() -> None:
    assert FROZEN_BATCH_PATH.is_dir(), f"frozen batch dir missing: {FROZEN_BATCH_PATH}"
    assert FROZEN_MATCH_RUNS_M2.exists(), FROZEN_MATCH_RUNS_M2
    assert FROZEN_TEAM_RUNS_M2.exists(), FROZEN_TEAM_RUNS_M2


def test_frozen_match_runs_parse_with_locked_geometry() -> None:
    mr = pd.read_parquet(
        FROZEN_MATCH_RUNS_M2,
        columns=["match_id", "phase", "reg_home_goals", "reg_away_goals", "seed"],
    )
    grp = mr[mr["phase"] == GROUP_PHASE]
    per_match = grp.groupby("match_id").size()
    assert per_match.index.nunique() == FROZEN_N_GROUP_MATCHES
    # Every group match carries exactly the locked 10k run count.
    assert set(per_match.unique().tolist()) == {FROZEN_N_RUNS}


def test_frozen_team_runs_parse_with_locked_geometry() -> None:
    tr = pd.read_parquet(
        FROZEN_TEAM_RUNS_M2,
        columns=["team_id", "run_idx", "exit_round", "champion", "qualified_r32"],
    )
    assert tr["run_idx"].nunique() == FROZEN_N_RUNS
    assert tr["team_id"].nunique() == FROZEN_N_TEAMS
    per_team = tr.groupby("team_id").size()
    assert set(per_team.unique().tolist()) == {FROZEN_N_RUNS}


def test_frozen_strength_matrix_sha_matches_acceptance_report() -> None:
    """The frozen constant's sha must equal the batch's own committed sha.

    This is the chain-of-custody check: if someone repoints FROZEN_BATCH_ID at a
    different batch, or the strength matrix drifts, the literal and the committed
    acceptance_report diverge and this test goes red.
    """
    report = json.loads((FROZEN_BATCH_PATH / "acceptance_report.json").read_text())
    assert report["matrix_sha256_run_M2"] == FROZEN_STRENGTH_MATRIX_SHA256
    assert report["matrix_sha256_lock"] == FROZEN_STRENGTH_MATRIX_SHA256
    assert report.get("matrix_run_M2_equals_lock") is True


def test_frozen_provenance_shape() -> None:
    prov = frozen_provenance()
    assert prov["source_batch_id"] == FROZEN_BATCH_ID
    assert prov["source_strength_matrix_sha"] == FROZEN_STRENGTH_MATRIX_SHA256
    assert prov["source_batch_activated_utc"].startswith("2026-05-12")
    assert prov["active_batch_path"].endswith(FROZEN_BATCH_ID)
