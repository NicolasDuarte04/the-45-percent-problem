"""
tests/test_frozen_independence.py
=================================
cp-16 step (a): the core independence proof.

Every "frozen pre-tournament" probability surface must be derived from the
frozen batch (``batch_20260512_013228Z``) and must NOT change when
``data/calibration/active_batch.json`` is repointed at a different batch (which
the nightly rebatch does whenever the settled count changes).

This test runs the real pipeline end to end twice: once with the committed
active_batch.json (which points at the frozen batch) and once with
active_batch.json repointed at a fabricated alternate batch. The alternate batch
copies the frozen ``match_runs_M2`` verbatim (so the team-pairing reader, which
intentionally still reads the active batch, keeps producing the same valid
bijection) but carries deliberately different ``team_runs_M2`` marginals (all
champion / qualification flags zeroed). If any frozen surface were still bound
to active_batch.json, the published marginals would collapse toward the
perturbed alternate and this test would fail.

Surfaces proven independent (each asserted below):
  - the scored ledger (latest/ledger.jsonl) and its provenance tags
  - the published per-team progression marginals (latest/tournament.json)
  - the snapshotProbs.ts table (bracket page + pick evaluator)
  - snapshot_meta.active_batch_id (stamps the frozen id)
  - the press-packet batch provenance (scripts/extract_athletic_press_cuts)

The pipeline mutates website/public/data and snapshotProbs.ts and back-fills
active_batch.json. The fixture restores all of it via git checkout on teardown,
so the test leaves a clean tree.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from frozen_batch import (  # noqa: E402
    FROZEN_BATCH_ID,
    FROZEN_MATCH_RUNS_M2,
    FROZEN_STRENGTH_MATRIX_SHA256,
    FROZEN_TEAM_RUNS_M2,
)

ACTIVE_BATCH = REPO_ROOT / "data" / "calibration" / "active_batch.json"
LATEST = REPO_ROOT / "website" / "public" / "data" / "latest"
SNAPSHOTS = REPO_ROOT / "website" / "public" / "data" / "snapshots"
SNAPSHOT_PROBS_TS = REPO_ROOT / "website" / "src" / "lib" / "sim" / "snapshotProbs.ts"

FAKE_BATCH_ID = "batch_99999999_999999Z_FAKE"


def _run(script: str) -> None:
    result = subprocess.run(
        [sys.executable, script],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=600,
    )
    assert result.returncode == 0, (
        f"{script} exited {result.returncode}\n"
        f"stdout tail:\n{result.stdout[-3000:]}\n"
        f"stderr tail:\n{result.stderr[-3000:]}"
    )


def _run_pipeline() -> None:
    _run("scripts/regenerate_snapshot_from_batch.py")
    _run("scripts/generate_snapshot_probs_ts.py")


def _marginals() -> dict:
    """Per-team progression marginals from the published tournament.json."""
    doc = json.loads((LATEST / "tournament.json").read_text())
    out = {}
    for t in doc["teams"]:
        code = t["fifa_code"]
        out[code] = {k: v for k, v in sorted(t.items()) if k.startswith("p_")}
    return out


def _snapshot_meta() -> dict:
    return json.loads((LATEST / "snapshot_meta.json").read_text())


@pytest.fixture()
def repointable_active(tmp_path: Path):
    """Build a fabricated alternate batch and restore the tree on teardown."""
    backup = ACTIVE_BATCH.read_text()
    # Snapshot dirs are tracked; the regen writes a fresh one per run keyed by
    # the wall-clock minute. Record the pre-existing set so teardown can remove
    # only the ones this test created (git checkout cannot remove untracked dirs).
    pre_existing = {p.name for p in SNAPSHOTS.iterdir()} if SNAPSHOTS.exists() else set()

    fake_dir = tmp_path / FAKE_BATCH_ID
    fake_dir.mkdir(parents=True)
    # Copy frozen match_runs verbatim: identical pairings keep build_model_map's
    # bijection valid, so a failure here can only come from the probability pin.
    mr = pd.read_parquet(FROZEN_MATCH_RUNS_M2)
    mr.to_parquet(fake_dir / "match_runs_M2.parquet", engine="pyarrow", index=False)
    # Perturb team_runs marginals: zero champion + qualification flags so the
    # alternate batch's progression probabilities are unmistakably different.
    tr = pd.read_parquet(FROZEN_TEAM_RUNS_M2)
    tr["champion"] = False
    tr["reached_final"] = False
    tr["qualified_r32"] = False
    tr.to_parquet(fake_dir / "team_runs_M2.parquet", engine="pyarrow", index=False)

    def repoint() -> None:
        doc = json.loads(backup)
        doc["schema_version"] = "1.1"
        doc["active_batch_id"] = FAKE_BATCH_ID
        doc["active_batch_path"] = str(fake_dir)
        doc["settled_count_at_batch_time"] = 0
        doc["settled_source"] = "test_independence_fabricated"
        ACTIVE_BATCH.write_text(json.dumps(doc, indent=2) + "\n")

    try:
        yield repoint, fake_dir
    finally:
        ACTIVE_BATCH.write_text(backup)
        subprocess.run(
            [
                "git",
                "checkout",
                "--",
                "website/public/data",
                "website/src/lib/sim/snapshotProbs.ts",
                "data/calibration/active_batch.json",
            ],
            cwd=REPO_ROOT,
            check=False,
        )
        # Remove the untracked snapshot dirs this run created (git checkout
        # restores tracked files but leaves new directories behind).
        if SNAPSHOTS.exists():
            for p in SNAPSHOTS.iterdir():
                if p.is_dir() and p.name not in pre_existing:
                    shutil.rmtree(p, ignore_errors=True)


def test_frozen_surfaces_independent_of_active_batch(repointable_active) -> None:
    repoint, fake_dir = repointable_active

    # ── Baseline: committed active_batch.json (points at the frozen batch) ──
    _run_pipeline()
    base_marginals = _marginals()
    base_probs = SNAPSHOT_PROBS_TS.read_text()
    base_ledger = (LATEST / "ledger.jsonl").read_text()
    base_meta = _snapshot_meta()

    # Sanity: the fabricated alternate genuinely differs from the frozen batch,
    # so equality of the published surfaces below is a real result, not a no-op.
    alt_champ = pd.read_parquet(fake_dir / "team_runs_M2.parquet")["champion"].any()
    assert not alt_champ, "fabricated batch should have zero champions"
    assert any(m.get("p_champion", 0) > 0 for m in base_marginals.values()), (
        "frozen marginals should have non-zero champion probabilities"
    )

    # ── Repoint active_batch.json at the fabricated alternate and re-run ──
    repoint()
    _run_pipeline()
    alt_marginals = _marginals()
    alt_probs = SNAPSHOT_PROBS_TS.read_text()
    alt_ledger = (LATEST / "ledger.jsonl").read_text()
    alt_meta = _snapshot_meta()

    # ── The core assertions: every frozen surface is unchanged + frozen-tagged ──
    assert alt_marginals == base_marginals, (
        "tournament.json per-team marginals changed when active_batch.json was "
        "repointed; the published bracket is still bound to the re-sim."
    )
    assert alt_probs == base_probs, (
        "snapshotProbs.ts changed when active_batch.json was repointed; the "
        "bracket/evaluator table is still bound to the re-sim."
    )
    assert alt_ledger == base_ledger, "ledger.jsonl changed when active_batch.json was repointed."

    for meta in (base_meta, alt_meta):
        assert meta["active_batch_id"] == FROZEN_BATCH_ID, (
            f"snapshot_meta.active_batch_id should stamp the frozen id, got "
            f"{meta['active_batch_id']!r}"
        )


def test_ledger_provenance_pinned_under_repointed_active(repointable_active) -> None:
    """The ledger reconstruction reads the frozen batch even with active repointed."""
    repoint, _ = repointable_active

    code = (
        "import json, sys; sys.path.insert(0, '.');"
        "from evaluation.reconstruct_forecasts import batch_provenance, reconstruct_distributions;"
        "from evaluation.forecast_mapping import build_model_map;"
        "prov = batch_provenance();"
        "d = reconstruct_distributions(build_model_map());"
        "out = {'id': prov['source_batch_id'], 'sha': prov['source_strength_matrix_sha'],"
        " 'rows': int(len(d)), 'sig': float(d['p_home'].sum())};"
        "print(json.dumps(out))"
    )

    def probe() -> dict:
        r = subprocess.run(
            [sys.executable, "-c", code], cwd=REPO_ROOT, capture_output=True, text=True, timeout=300
        )
        assert r.returncode == 0, r.stderr[-3000:]
        return json.loads(r.stdout.strip().splitlines()[-1])

    base = probe()
    repoint()
    alt = probe()

    assert base["id"] == alt["id"] == FROZEN_BATCH_ID
    assert base["sha"] == alt["sha"] == FROZEN_STRENGTH_MATRIX_SHA256
    assert base["rows"] == alt["rows"] == 72
    assert base["sig"] == alt["sig"], (
        "ledger distributions moved when active_batch.json was repointed"
    )


def test_press_provenance_pinned_under_repointed_active(repointable_active) -> None:
    """scripts/extract_athletic_press_cuts pins its batch id to the frozen batch."""
    repoint, _ = repointable_active
    repoint()  # active now points at the fabricated alternate

    code = (
        "import sys; sys.path.insert(0, '.');"
        "import scripts.extract_athletic_press_cuts as P;"
        "print(P.BATCH_ID); print(P.LOCK_SHA)"
    )
    r = subprocess.run(
        [sys.executable, "-c", code], cwd=REPO_ROOT, capture_output=True, text=True, timeout=120
    )
    assert r.returncode == 0, r.stderr[-3000:]
    out = r.stdout.strip().splitlines()
    assert out[0] == FROZEN_BATCH_ID
    assert out[1] == FROZEN_STRENGTH_MATRIX_SHA256
