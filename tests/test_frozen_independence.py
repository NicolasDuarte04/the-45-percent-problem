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
keeps the frozen ``match_runs_M2`` IDENTITY columns (match_id, phase,
team_home, team_away) byte-for-byte, so the team-pairing reader (which
intentionally still reads the active batch) keeps producing the same valid
bijection (no MappingError). It perturbs everything that drives a probability:
the ``match_runs_M2`` outcome columns (reg_home_goals / reg_away_goals / seed,
which the ledger grades from) and the ``team_runs_M2`` progression marginals
(champion / qualification flags zeroed, which tournament.json and
snapshotProbs.ts aggregate). If any frozen surface were still bound to
active_batch.json, its numbers would follow the perturbed alternate and this
test would fail.

The ledger proof is differential: it shows the perturbed match_runs WOULD grade
to different p_model_on_realized / brier_contribution, then asserts the actual
ledger output is byte-for-byte the frozen values regardless.

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
    # Perturb ONLY the outcome columns of match_runs (reg_home_goals,
    # reg_away_goals, seed) so the implied per-match 1X2 distribution genuinely
    # differs from frozen; keep the identity columns (match_id, phase,
    # team_home, team_away) byte-for-byte so build_model_map's pairing bijection
    # stays valid (no MappingError). This makes the ledger test differential:
    # the alternate match_runs WOULD grade differently if it were read.
    mr = pd.read_parquet(FROZEN_MATCH_RUNS_M2)
    mr["reg_home_goals"] = 9  # every group match implies p_home == 1.0
    mr["reg_away_goals"] = 0
    mr["seed"] = mr["seed"] + 1
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


def test_ledger_values_pinned_under_repointed_active(repointable_active) -> None:
    """The ledger's graded VALUES (not just its provenance tag) are pinned.

    The ledger derives its probabilities from match_runs (reg_home_goals /
    reg_away_goals). The alternate batch keeps frozen pairings but carries
    perturbed match_runs outcomes, so reading it would produce a materially
    different 1X2 distribution and therefore different p_model_on_realized /
    brier_contribution. This proves, differentially, that the ledger ignores
    active_batch.json: a real difference is available and is not picked up.
    """
    repoint, fake_dir = repointable_active
    fake_match_runs = fake_dir / "match_runs_M2.parquet"

    from evaluation.forecast_mapping import build_model_map
    from evaluation.reconstruct_forecasts import (
        build_ledger_rows,
        reconstruct_distributions,
    )

    # ── Baseline: committed active_batch.json (points at the frozen batch) ──
    model_map = build_model_map()
    frozen_dists = reconstruct_distributions(model_map)  # default source -> frozen

    # Synthetic settled frame over the first two mapped matches.
    a, b = model_map.iloc[0], model_map.iloc[1]
    scored = pd.DataFrame(
        [
            {"match_id": a["match_id"], "home_goals": 3, "away_goals": 0,
             "settled_at": "2026-06-11T21:00:00Z"},
            {"match_id": b["match_id"], "home_goals": 0, "away_goals": 1,
             "settled_at": "2026-06-12T21:00:00Z"},
        ]
    )
    base_rows = build_ledger_rows(scored, frozen_dists, "codesha")

    # What the perturbed alternate WOULD grade to, if the ledger read it.
    perturbed_dists = reconstruct_distributions(model_map, batch_parquet=fake_match_runs)
    perturbed_rows = build_ledger_rows(scored, perturbed_dists, "codesha")

    # Sanity: the perturbation is real. The graded values genuinely differ, so
    # the equality assertions below prove a difference is being ignored, not a
    # no-op. (Perturbed match_runs force p_home == 1.0 for every match.)
    assert [r["p_model_on_realized"] for r in perturbed_rows] != [
        r["p_model_on_realized"] for r in base_rows
    ]
    assert [r["brier_contribution"] for r in perturbed_rows] != [
        r["brier_contribution"] for r in base_rows
    ]

    # ── Repoint active_batch.json at the perturbed alternate and rebuild ──
    repoint()
    model_map_alt = build_model_map()  # pairings still valid (identity cols intact)
    alt_dists = reconstruct_distributions(model_map_alt)  # default source -> frozen
    alt_rows = build_ledger_rows(scored, alt_dists, "codesha")

    # Core proof: the ACTUAL ledger output is byte-for-byte the frozen values,
    # not the perturbed ones, and tagged the frozen batch id / sha.
    assert alt_rows == base_rows, (
        "ledger graded values changed when active_batch.json was repointed; "
        "the ledger is still reading the active batch's match_runs."
    )
    assert [r["p_model_on_realized"] for r in alt_rows] != [
        r["p_model_on_realized"] for r in perturbed_rows
    ], "ledger followed the repointed active batch's perturbed match_runs"
    for r in alt_rows:
        assert r["source_batch_id"] == FROZEN_BATCH_ID
        assert r["data_sha"] == FROZEN_STRENGTH_MATRIX_SHA256


def _live_marginals() -> dict:
    """Per-team progression marginals from the live tournament_live.json."""
    doc = json.loads((LATEST / "tournament_live.json").read_text())
    out = {}
    for t in doc["teams"]:
        code = t["fifa_code"]
        out[code] = {k: v for k, v in sorted(t.items()) if k.startswith("p_")}
    return out


def test_live_conditional_bracket_walled_off_and_active_sourced(
    repointable_active,
) -> None:
    """cp-16b: the live conditional bracket is fed by the ACTIVE batch and is
    walled off from every graded surface.

    This reuses the independence harness to prove both halves at once. With
    active_batch.json repointed at the fabricated alternate (champion flags
    zeroed), the LIVE object must FOLLOW the perturbation (its champion
    marginals collapse to ~0), while the frozen tournament.json marginals,
    the ledger, and snapshotProbs.ts stay byte-for-byte pinned to the frozen
    batch. The live object therefore reads the active batch (it is the only
    consumer of it) and changes nothing graded.
    """
    repoint, fake_dir = repointable_active

    # ── Baseline: committed active_batch.json (points at the frozen batch) ──
    _run_pipeline()
    base_frozen = _marginals()
    base_live = _live_marginals()
    base_probs = SNAPSHOT_PROBS_TS.read_text()
    base_ledger = (LATEST / "ledger.jsonl").read_text()

    # The live files exist, carry the required provenance, and (today,
    # conditioning off, active == frozen) match the frozen marginals numerically.
    live_doc = json.loads((LATEST / "tournament_live.json").read_text())
    prov = live_doc["live_provenance"]
    assert prov["conditioned"] is False
    assert prov["live_source_batch_id"] == FROZEN_BATCH_ID
    assert (LATEST / "bracket_live.json").exists()
    assert base_live == base_frozen, (
        "today (active == frozen batch, conditioning off) the live object should "
        "equal the frozen forecast numerically"
    )

    # ── Repoint active_batch.json at the fabricated alternate and re-run ──
    repoint()
    _run_pipeline()
    alt_frozen = _marginals()
    alt_live = _live_marginals()
    alt_probs = SNAPSHOT_PROBS_TS.read_text()
    alt_ledger = (LATEST / "ledger.jsonl").read_text()

    # WALL: every graded surface is byte-for-byte unchanged by the repoint.
    assert alt_frozen == base_frozen, "frozen tournament.json marginals moved with the active batch"
    assert alt_probs == base_probs, "snapshotProbs.ts moved with the active batch"
    assert alt_ledger == base_ledger, "ledger.jsonl moved with the active batch"

    # ACTIVE-SOURCED: the live object FOLLOWED the perturbed active batch. The
    # fabricated batch zeroes `champion`, so live p_champion collapses to 0 for
    # every team while the frozen forecast keeps non-zero champions.
    assert any(m.get("p_champion", 0) > 0 for m in base_frozen.values())
    assert all(m.get("p_champion", 0) == 0 for m in alt_live.values()), (
        "live conditional bracket did NOT follow the repointed active batch; it "
        "is not reading the active batch as designed"
    )
    assert alt_live != alt_frozen, (
        "live and frozen marginals are identical under a perturbed active batch; "
        "the live object is not active-sourced"
    )

    # The repointed live object stamps the active (perturbed) batch id, never the
    # frozen id, so a reviewer can always tell which batch fed the live view.
    alt_prov = json.loads((LATEST / "tournament_live.json").read_text())["live_provenance"]
    assert alt_prov["live_source_batch_id"] == FAKE_BATCH_ID


@pytest.fixture()
def resim_shaped_active(tmp_path: Path):
    """Repoint active_batch.json at a PRODUCTION-shaped re-sim batch.

    The nightly cron writes match_runs with the canonical M01.. group slot ids
    (from data/raw/wc2026_fixtures.parquet), NOT the frozen G-A-1.. scheme.
    repointable_active above keeps the frozen G-A-1.. ids byte-for-byte, so it
    never exercised the scheme mismatch that emptied the ledger (cp-16a / #120's
    half-applied pin). This fixture relabels the frozen group slots to the
    canonical M01.. scheme by team pair AND perturbs the outcome columns, so a
    build_model_map that reads the active batch yields M01.. batch_slots that no
    longer join the frozen parquet (0 rows), while a fix that reads frozen still
    populates and still grades the frozen values.
    """
    backup = ACTIVE_BATCH.read_text()
    fixtures = pd.read_parquet(REPO_ROOT / "data" / "raw" / "wc2026_fixtures.parquet")
    grp_fix = fixtures[fixtures["stage"].str.lower().str.contains("group")]
    pair_to_canon = {
        (r.team_home, r.team_away): r.match_id for r in grp_fix.itertuples(index=False)
    }

    fake_dir = tmp_path / "batch_resim_M01_FAKE"
    fake_dir.mkdir(parents=True)
    mr = pd.read_parquet(FROZEN_MATCH_RUNS_M2)
    is_group = mr["phase"] == "group"
    relabelled = pd.Series(
        [
            pair_to_canon.get((th, ta), old)
            for th, ta, old in zip(mr["team_home"], mr["team_away"], mr["match_id"])
        ],
        index=mr.index,
    )
    mr.loc[is_group, "match_id"] = relabelled[is_group]
    assert mr.loc[is_group, "match_id"].str.startswith("M").all(), (
        "re-sim fake batch must carry canonical M01.. group slot ids"
    )
    # Perturb the graded outcome columns so reading this batch WOULD grade to
    # p_home == 1.0 for every match; this makes the value assertion differential.
    mr["reg_home_goals"] = 9
    mr["reg_away_goals"] = 0
    mr["seed"] = mr["seed"] + 1
    mr.to_parquet(fake_dir / "match_runs_M2.parquet", engine="pyarrow", index=False)

    def repoint() -> None:
        doc = json.loads(backup)
        doc["schema_version"] = "1.1"
        doc["active_batch_id"] = "batch_resim_M01_FAKE"
        doc["active_batch_path"] = str(fake_dir)
        doc["settled_count_at_batch_time"] = 0
        doc["settled_source"] = "test_resim_shaped_fabricated"
        ACTIVE_BATCH.write_text(json.dumps(doc, indent=2) + "\n")

    try:
        yield repoint, fake_dir / "match_runs_M2.parquet"
    finally:
        ACTIVE_BATCH.write_text(backup)


def test_ledger_populates_under_resim_shaped_active(resim_shaped_active) -> None:
    """Regression for the half-applied cp-16a pin (#120): the ledger must
    populate AND grade the frozen values even when active_batch.json points at a
    production-shaped re-sim batch (canonical M01.. group slots, perturbed
    outcomes).

    Before the fix, build_model_map() read the active batch, so batch_slot was
    M01.. and reconstruct_distributions (which reads the frozen G-A-1.. parquet)
    joined nothing -> 0 ledger rows. This is the exact gap
    test_frozen_surfaces_independent_of_active_batch missed: its fabricated batch
    kept the frozen G-A-1.. ids, so the join never broke.
    """
    from evaluation.forecast_mapping import build_model_map
    from evaluation.reconstruct_forecasts import (
        build_ledger_rows,
        reconstruct_distributions,
    )

    repoint, fake_match_runs = resim_shaped_active

    # Sanity: the fabricated batch is genuinely M01..-labelled (a real re-sim
    # shape), not the frozen G-A-1.. scheme.
    fake = pd.read_parquet(fake_match_runs, columns=["match_id", "phase"])
    fake_group_ids = fake[fake["phase"] == "group"]["match_id"].unique()
    assert all(str(x).startswith("M") for x in fake_group_ids), (
        "fixture precondition: re-sim batch must use canonical M01.. group slots"
    )

    # Frozen baseline (active still points at the frozen batch in-repo).
    model_map = build_model_map()
    frozen_dists = reconstruct_distributions(model_map)
    a, b, c = model_map.iloc[0], model_map.iloc[1], model_map.iloc[2]
    scored = pd.DataFrame(
        [
            {"match_id": a["match_id"], "home_goals": 3, "away_goals": 0,
             "settled_at": "2026-06-11T21:00:00Z"},
            {"match_id": b["match_id"], "home_goals": 0, "away_goals": 1,
             "settled_at": "2026-06-12T21:00:00Z"},
            {"match_id": c["match_id"], "home_goals": 1, "away_goals": 1,
             "settled_at": "2026-06-13T21:00:00Z"},
        ]
    )
    base_rows = build_ledger_rows(scored, frozen_dists, "codesha")
    assert len(base_rows) == 3, "frozen baseline should grade all three matches"

    # What reading the perturbed re-sim batch WOULD grade to (p_home == 1.0).
    would_dists = reconstruct_distributions(model_map, batch_parquet=fake_match_runs)
    would_rows = build_ledger_rows(scored, would_dists, "codesha")
    assert [r["p_model_on_realized"] for r in would_rows] != [
        r["p_model_on_realized"] for r in base_rows
    ], "perturbation is not real; the differential proof would be vacuous"

    # ── Repoint active at the M01.. re-sim batch and rebuild via the default path ──
    repoint()
    model_map_resim = build_model_map()  # default: must read frozen, ignore active
    resim_dists = reconstruct_distributions(model_map_resim)
    resim_rows = build_ledger_rows(scored, resim_dists, "codesha")

    # (a) The ledger POPULATES. On the pre-fix code build_model_map() read the
    #     active M01.. batch, so batch_slot was M01.., the frozen join was empty,
    #     and this length would be 0.
    assert len(resim_rows) == 3, (
        "ledger did not populate under a re-sim-shaped active batch; "
        "build_model_map is still reading active_batch.json for slot labels"
    )

    # (b) The graded VALUES are the frozen ones, not the perturbed re-sim ones.
    assert resim_rows == base_rows, (
        "ledger values changed under a re-sim-shaped active batch"
    )
    assert [r["p_model_on_realized"] for r in resim_rows] != [
        r["p_model_on_realized"] for r in would_rows
    ], "ledger followed the repointed re-sim batch's perturbed outcomes"
    for r in resim_rows:
        assert r["source_batch_id"] == FROZEN_BATCH_ID
        assert r["data_sha"] == FROZEN_STRENGTH_MATRIX_SHA256


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
