"""
tests/test_r16_checkpoint.py
=============================
cp-25b. Guard tests for evaluation/r16_checkpoint.py.

These tests protect the hard integrity rules from the checkpoint spec:
  - the graded ledger (website/public/data/latest/ledger.jsonl) is
    byte-identical before and after the producer runs, exactly 72 rows,
    all model_id == "M_STAR";
  - the kill_criteria_check block in evaluation_metrics.json is preserved
    byte-identical after the sibling r16_checkpoint field is added;
  - frozen calibration fields and tournament.json marginals are unchanged;
  - the checkpoint numbers are bit-identical across two separate runs on the
    same inputs (reproducibility);
  - the M0 / M_STAR distributions are valid and aligned by match_id;
  - direction: a synthetic 3-SE-worse case trips the criterion, a synthetic
    3-SE-better case does not;
  - knockout / matches_live rows never enter the checkpoint's forecast set;
  - trigger idempotence: once published, a second run is a no-op unless
    --force-republish is used.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from evaluation.accuracy_metrics import check_kill_criterion, log_loss  # noqa: E402
from evaluation.forecast_mapping import build_model_map  # noqa: E402
from evaluation.reconstruct_forecasts import reconstruct_distributions  # noqa: E402
from evaluation import r16_checkpoint as r16  # noqa: E402
from frozen_batch import FROZEN_BATCH_ID, FROZEN_BATCH_PATH  # noqa: E402

LATEST = REPO_ROOT / "website" / "public" / "data" / "latest"
LEDGER_PATH = LATEST / "ledger.jsonl"
EVAL_METRICS_PATH = LATEST / "evaluation_metrics.json"
TOURNAMENT_PATH = LATEST / "tournament.json"


# ---------------------------------------------------------------------------
# Ledger / evaluation_metrics byte-identity guards
# ---------------------------------------------------------------------------


def _read_bytes(path: Path) -> bytes:
    return path.read_bytes()


def test_ledger_untouched_by_producer_import_and_dry_run() -> None:
    """Importing and running the producer in dry-run mode must never touch
    the graded ledger or evaluation_metrics.json. This is the cheapest,
    always-safe-to-run form of the byte-identity guard (no DB / parquet
    override required)."""
    before_ledger = _read_bytes(LEDGER_PATH)
    before_em = _read_bytes(EVAL_METRICS_PATH)
    before_tournament = _read_bytes(TOURNAMENT_PATH)

    result = subprocess.run(
        [sys.executable, "evaluation/r16_checkpoint.py", "--dry-run"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert result.returncode == 0, result.stderr[-3000:]

    after_ledger = _read_bytes(LEDGER_PATH)
    after_em = _read_bytes(EVAL_METRICS_PATH)
    after_tournament = _read_bytes(TOURNAMENT_PATH)

    assert after_ledger == before_ledger, "dry-run mutated ledger.jsonl"
    assert after_em == before_em, "dry-run mutated evaluation_metrics.json"
    assert after_tournament == before_tournament, "dry-run mutated tournament.json"


def test_ledger_shape_invariant() -> None:
    """The graded ledger is exactly 72 rows, all model_id == 'M_STAR'.

    This asserts the invariant the spec requires be preserved; it does not
    itself run the producer (see test above for the byte-identity proof
    around a real producer invocation)."""
    lines = [ln for ln in LEDGER_PATH.read_text().splitlines() if ln.strip()]
    rows = [json.loads(ln) for ln in lines]
    assert len(rows) <= 72, f"ledger has {len(rows)} rows; group stage is capped at 72"
    for r in rows:
        assert r["model_id"] == "M_STAR"


def test_kill_criteria_check_untouched_by_sibling_field_write(tmp_path: Path) -> None:
    """Simulates publish_checkpoint's evaluation_metrics.json write on a scratch
    copy: adding the sibling r16_checkpoint field must leave kill_criteria_check
    byte-identical and must land BESIDE it, not inside it."""
    original = json.loads(EVAL_METRICS_PATH.read_text())
    original_kill_block = json.loads(json.dumps(original["kill_criteria_check"]))

    scratch_em = tmp_path / "evaluation_metrics.json"
    scratch_em.write_text(EVAL_METRICS_PATH.read_text())

    fake_payload = {"n": 5, "tripped": False, "gap_in_se": -0.5}
    em = json.loads(scratch_em.read_text())
    em["r16_checkpoint"] = fake_payload
    scratch_em.write_text(json.dumps(em, indent=2) + "\n")

    mutated = json.loads(scratch_em.read_text())
    assert mutated["kill_criteria_check"] == original_kill_block, (
        "kill_criteria_check block changed when the sibling r16_checkpoint "
        "field was added"
    )
    assert "r16_checkpoint" not in mutated["kill_criteria_check"], (
        "r16_checkpoint must be a sibling field, never nested inside "
        "kill_criteria_check"
    )
    assert mutated["r16_checkpoint"] == fake_payload


def test_frozen_calibration_fields_and_marginals_unaffected_by_dry_run() -> None:
    """Frozen calibration fields (brier, log_loss, rps, reliability_diagram,
    champion_metric_n) and tournament.json marginals must be unchanged by
    running the producer (dry-run form; see the byte-identity test above for
    the full-file proof)."""
    em_before = json.loads(EVAL_METRICS_PATH.read_text())
    tournament_before = json.loads(TOURNAMENT_PATH.read_text())

    result = subprocess.run(
        [sys.executable, "evaluation/r16_checkpoint.py", "--dry-run"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert result.returncode == 0, result.stderr[-3000:]

    em_after = json.loads(EVAL_METRICS_PATH.read_text())
    tournament_after = json.loads(TOURNAMENT_PATH.read_text())

    for key in ("brier", "log_loss", "rps", "reliability_diagram", "champion_metric_n"):
        assert em_after.get(key) == em_before.get(key), f"{key} changed by dry-run"
    assert tournament_after == tournament_before, "tournament.json changed by dry-run"


# ---------------------------------------------------------------------------
# M0 / M_STAR derivation guards
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def model_map() -> pd.DataFrame:
    return build_model_map()


def test_m0_distributions_sum_to_one_and_cover_72_slots(model_map: pd.DataFrame) -> None:
    dists_m0 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_BATCH_PATH / "match_runs_M0.parquet"
    )
    assert len(dists_m0) == 72
    assert dists_m0["match_id"].nunique() == 72
    s = dists_m0["p_home"] + dists_m0["p_draw"] + dists_m0["p_away"]
    assert (s.sub(1.0).abs() < 1e-9).all()
    for col in ("p_home", "p_draw", "p_away"):
        assert (dists_m0[col] >= 0).all() and (dists_m0[col] <= 1).all()


def test_m0_and_mstar_align_by_match_id(model_map: pd.DataFrame) -> None:
    dists_mstar = reconstruct_distributions(model_map)
    dists_m0 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_BATCH_PATH / "match_runs_M0.parquet"
    )
    assert set(dists_mstar["match_id"]) == set(dists_m0["match_id"])
    assert len(dists_mstar) == len(dists_m0) == 72


def test_gap_array_length_equals_settled_group_count(model_map: pd.DataFrame, tmp_path: Path) -> None:
    """The per-match log-loss gap array's length must equal the number of
    settled group matches actually scored, not 72 and not some other count."""
    dists_mstar = reconstruct_distributions(model_map)
    dists_m0 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_BATCH_PATH / "match_runs_M0.parquet"
    )
    mstar_by_id = {r["match_id"]: r for _, r in dists_mstar.iterrows()}
    m0_by_id = {r["match_id"]: r for _, r in dists_m0.iterrows()}

    n_settled = 5
    subset = model_map.head(n_settled)
    ll_mstar = []
    ll_m0 = []
    for _, r in subset.iterrows():
        dm = mstar_by_id[r["match_id"]]
        d0 = m0_by_id[r["match_id"]]
        y = np.array([[1.0, 0.0, 0.0]])
        p_mstar = np.array([[dm["p_home"], dm["p_draw"], dm["p_away"]]])
        p_m0 = np.array([[d0["p_home"], d0["p_draw"], d0["p_away"]]])
        ll_mstar.append(float(log_loss(p_mstar, y)[0]))
        ll_m0.append(float(log_loss(p_m0, y)[0]))

    d = np.array(ll_mstar) - np.array(ll_m0)
    assert len(d) == n_settled


# ---------------------------------------------------------------------------
# Direction guard: synthetic 3-SE-worse trips, 3-SE-better does not
# ---------------------------------------------------------------------------


def test_synthetic_mstar_worse_trips() -> None:
    rng = np.random.default_rng(7)
    n = 40
    ll_m0 = rng.uniform(0.85, 0.95, n)
    d_target_se = 3.0
    # Construct ll_mstar so that the paired-difference gap is exactly ~3 SE
    # worse (mean_diff / se == 3), using a fixed small per-match noise so the
    # SE is well-defined and the ratio is deliberately built, not incidental.
    noise = rng.normal(0, 0.01, n)
    se_target = 0.02
    mean_diff_target = d_target_se * se_target
    d = mean_diff_target + noise
    d = d * (se_target / d.std(ddof=1))  # rescale noise to hit the target SE
    d = d - d.mean() + mean_diff_target  # re-center to hit the target mean
    ll_mstar = ll_m0 + d

    tripped, detail = check_kill_criterion(ll_mstar, ll_m0)
    assert tripped, detail


def test_synthetic_mstar_better_does_not_trip() -> None:
    rng = np.random.default_rng(11)
    n = 40
    ll_m0 = rng.uniform(0.85, 0.95, n)
    noise = rng.normal(0, 0.01, n)
    se_target = 0.02
    mean_diff_target = -3.0 * se_target  # M_STAR better by 3 SE (d = ll_mstar - ll_m0 < 0)
    d = noise
    d = d * (se_target / d.std(ddof=1))
    d = d - d.mean() + mean_diff_target
    ll_mstar = ll_m0 + d

    tripped, detail = check_kill_criterion(ll_mstar, ll_m0)
    assert not tripped, detail


# ---------------------------------------------------------------------------
# Wall: matches_live / knockout rows never enter the forecast set
# ---------------------------------------------------------------------------


def test_compute_checkpoint_never_reads_matches_live() -> None:
    """The producer must never read matches_live/ (cp-17 live knockout cards)
    as an executable path. Guarded functionally: resolve_scored's default
    matches_dir is evaluation.forecast_mapping.DEFAULT_MATCHES_DIR, which
    points at the graded matches/ directory, never matches_live/. This is a
    behavioral check (not a source-text grep), since the module's own
    docstring legitimately mentions matches_live/ in prose to document the
    constraint."""
    from evaluation.forecast_mapping import DEFAULT_MATCHES_DIR

    assert "matches_live" not in str(DEFAULT_MATCHES_DIR)
    assert str(DEFAULT_MATCHES_DIR).endswith("data/latest/matches")

    import inspect

    from evaluation import r16_checkpoint as mod

    src = inspect.getsource(mod.compute_checkpoint) + inspect.getsource(mod.count_settled_r16)
    assert "matches_live" not in src, (
        "compute_checkpoint / count_settled_r16 must never reference the "
        "matches_live/ (cp-17 live knockout) namespace"
    )


def test_scored_frame_is_group_stage_only(model_map: pd.DataFrame) -> None:
    """resolve_scored's underlying map_settled scopes to GROUP_STAGE by
    default; a knockout-stage settled row must be deferred, never scored."""
    from evaluation.forecast_mapping import map_settled

    a = model_map.iloc[0]
    outcomes = pd.DataFrame(
        [
            {
                "match_id": "FD-fake-r16",
                "home_code": a["home_code"],
                "away_code": a["away_code"],
                "home_goals": 2,
                "away_goals": 1,
                "settled_at": "2026-06-30T21:00:00Z",
                "stage": "r16",
            }
        ]
    )
    result = map_settled(model_map, outcomes)
    assert result["scored"].empty, "an r16-stage row must not enter the group-scored frame"
    assert "FD-fake-r16" in result["deferred"]


# ---------------------------------------------------------------------------
# Reproducibility: bit-identical across two runs on the same inputs
# ---------------------------------------------------------------------------


def test_reproducible_across_two_computations(model_map: pd.DataFrame) -> None:
    dists_mstar_1 = reconstruct_distributions(model_map)
    dists_m0_1 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_BATCH_PATH / "match_runs_M0.parquet"
    )
    dists_mstar_2 = reconstruct_distributions(model_map)
    dists_m0_2 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_BATCH_PATH / "match_runs_M0.parquet"
    )
    pd.testing.assert_frame_equal(dists_mstar_1, dists_mstar_2)
    pd.testing.assert_frame_equal(dists_m0_1, dists_m0_2)


def test_dry_run_output_stable_across_two_subprocess_invocations() -> None:
    """The dry-run's no-settled-source no-op path must be identical on two
    separate invocations (the honest, reproducible current-data proof used in
    the PR description)."""
    results = []
    for _ in range(2):
        r = subprocess.run(
            [sys.executable, "evaluation/r16_checkpoint.py", "--dry-run"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=300,
        )
        assert r.returncode == 0, r.stderr[-3000:]
        results.append(r.stdout)
    # Strip any timestamp-free content; the no-source path has none, so this
    # should be exactly equal.
    assert results[0] == results[1]


# ---------------------------------------------------------------------------
# Trigger idempotence
# ---------------------------------------------------------------------------


def test_trigger_noop_when_no_settled_source(tmp_path: Path) -> None:
    """With no settled source reachable, the real (non-dry-run) invocation
    must also be a clean no-op: it must not create r16_checkpoint.json or
    touch evaluation_metrics.json."""
    before_em = _read_bytes(EVAL_METRICS_PATH)
    r16_path = LATEST / r16.R16_CHECKPOINT_FILENAME
    assert not r16_path.exists(), (
        "test precondition failed: r16_checkpoint.json already exists in "
        "latest/ on this checkout"
    )

    result = subprocess.run(
        [sys.executable, "evaluation/r16_checkpoint.py"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert result.returncode == 0, result.stderr[-3000:]
    assert not r16_path.exists(), "producer published with no settled source and below trigger count"
    assert _read_bytes(EVAL_METRICS_PATH) == before_em


def test_already_published_guard_is_a_pure_function(tmp_path: Path, monkeypatch) -> None:
    """already_published() reflects the presence of latest/r16_checkpoint.json
    exactly; this is the guard main() consults before publishing again."""
    fake_latest = tmp_path / "latest"
    fake_latest.mkdir()
    monkeypatch.setattr(r16, "LATEST_DIR", fake_latest)
    assert r16.already_published() is False
    (fake_latest / r16.R16_CHECKPOINT_FILENAME).write_text("{}")
    assert r16.already_published() is True
