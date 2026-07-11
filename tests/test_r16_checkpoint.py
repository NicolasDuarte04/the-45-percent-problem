"""
tests/test_r16_checkpoint.py
============================
cp-25b guard tests for the Round of 16 pre-registered kill-criterion checkpoint
grader (evaluation/r16_checkpoint.py).

These pin the integrity invariants fixed by the cp-25b spec:
  - the graded ledger stays byte-identical (the producer never writes it);
  - the kill_criteria_check block and the frozen calibration fields stay
    byte-identical when the r16_checkpoint sibling field is added;
  - the checkpoint numbers are reproducible bit-for-bit across runs;
  - the M0 distributions are valid, cover the 72 group slots, and align to
    M_STAR by match_id; the gap array length equals the settled-group count;
  - the locked direction (M_STAR worse than M0 by >= 2 SE) trips correctly;
  - knockout (deferred) rows never enter the checkpoint forecast set;
  - once the artifact exists the producer is a no-op (carry-forward).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from evaluation.accuracy_metrics import check_kill_criterion
from evaluation.forecast_mapping import build_model_map
from evaluation.reconstruct_forecasts import reconstruct_distributions
from evaluation.r16_checkpoint import (
    FROZEN_MATCH_RUNS_M0,
    R16_SETTLEMENT_COUNT,
    compute_checkpoint,
    count_settled_r16,
    publish_if_triggered,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LATEST_DIR = PROJECT_ROOT / "website" / "public" / "data" / "latest"
LEDGER_PATH = LATEST_DIR / "ledger.jsonl"
EVAL_METRICS_PATH = LATEST_DIR / "evaluation_metrics.json"
TOURNAMENT_PATH = LATEST_DIR / "tournament.json"

# Late settled timestamp: after every group kickoff (June 2026), so the
# map_settled kickoff-date gate passes for the synthetic settled rows.
_SETTLED_AT = "2026-07-31T00:00:00Z"


@pytest.fixture(scope="module")
def model_map() -> pd.DataFrame:
    return build_model_map()


def _write_outcomes(
    tmp_path: Path,
    model_map: pd.DataFrame,
    n_group: int,
    n_r16: int,
) -> Path:
    """Write a synthetic settled-outcomes parquet: n_group real group fixtures
    (locked orientation, so the bijection maps cleanly) plus n_r16 deferred
    knockout rows tagged stage='r16'."""
    rows = []
    for i in range(n_group):
        m = model_map.iloc[i]
        rows.append(
            {
                "match_id": m["match_id"],
                "stage": "group",
                "home_team": m["home_code"],
                "away_team": m["away_code"],
                # Deterministic pseudo-scores; only the realized 1X2 label matters.
                "home_goals": (i % 3),
                "away_goals": ((i + 1) % 2),
                "settled_at": _SETTLED_AT,
            }
        )
    for j in range(n_r16):
        rows.append(
            {
                "match_id": f"FDR16-{j}",
                "stage": "r16",
                "home_team": "BRA",
                "away_team": "ARG",
                "home_goals": 2,
                "away_goals": 1,
                "settled_at": _SETTLED_AT,
            }
        )
    df = pd.DataFrame(rows)
    path = tmp_path / "outcomes.parquet"
    df.to_parquet(path)
    return path


# ---------------------------------------------------------------------------
# Ledger + snapshot invariants
# ---------------------------------------------------------------------------


def test_committed_ledger_is_72_rows_all_mstar() -> None:
    lines = [ln for ln in LEDGER_PATH.read_text().splitlines() if ln.strip()]
    assert len(lines) == 72
    for ln in lines:
        assert json.loads(ln)["model_id"] == "M_STAR"


def test_producer_never_touches_the_ledger(tmp_path: Path, model_map) -> None:
    before = LEDGER_PATH.read_bytes()

    # A fully independent new_dir / latest_dir; the producer writes only into
    # new_dir. Force publication so a compute path actually runs.
    new_dir = tmp_path / "new"
    latest = tmp_path / "latest"
    new_dir.mkdir()
    latest.mkdir()
    (new_dir / "evaluation_metrics.json").write_text(
        EVAL_METRICS_PATH.read_text()
    )
    parquet = _write_outcomes(tmp_path, model_map, n_group=8, n_r16=0)

    publish_if_triggered(
        new_dir=new_dir,
        latest_dir=latest,
        code_sha="testsha",
        evaluated_at_utc="2026-07-15T00:00:00Z",
        force=True,
        parquet_path=parquet,
        writer=lambda _m: None,
    )

    assert LEDGER_PATH.read_bytes() == before  # byte-identical, untouched


def test_mirror_preserves_kill_block_and_calibration_fields(
    tmp_path: Path, model_map
) -> None:
    new_dir = tmp_path / "new"
    latest = tmp_path / "latest"
    new_dir.mkdir()
    latest.mkdir()

    original = json.loads(EVAL_METRICS_PATH.read_text())
    (new_dir / "evaluation_metrics.json").write_text(json.dumps(original, indent=2))
    parquet = _write_outcomes(tmp_path, model_map, n_group=10, n_r16=0)

    publish_if_triggered(
        new_dir=new_dir,
        latest_dir=latest,
        code_sha="testsha",
        evaluated_at_utc="2026-07-15T00:00:00Z",
        force=True,
        parquet_path=parquet,
        writer=lambda _m: None,
    )

    after = json.loads((new_dir / "evaluation_metrics.json").read_text())

    # The sibling field was added.
    assert "r16_checkpoint" in after
    # kill_criteria_check block is byte-identical.
    assert json.dumps(after["kill_criteria_check"], sort_keys=True) == json.dumps(
        original["kill_criteria_check"], sort_keys=True
    )
    # Frozen calibration fields unchanged.
    for key in ("brier", "log_loss", "rps", "reliability_diagram", "champion_metric_n"):
        assert after.get(key) == original.get(key)


def test_tournament_marginals_untouched(tmp_path: Path, model_map) -> None:
    before = TOURNAMENT_PATH.read_bytes()
    new_dir = tmp_path / "new"
    latest = tmp_path / "latest"
    new_dir.mkdir()
    latest.mkdir()
    (new_dir / "evaluation_metrics.json").write_text(EVAL_METRICS_PATH.read_text())
    parquet = _write_outcomes(tmp_path, model_map, n_group=8, n_r16=0)
    publish_if_triggered(
        new_dir=new_dir,
        latest_dir=latest,
        code_sha="testsha",
        evaluated_at_utc="2026-07-15T00:00:00Z",
        force=True,
        parquet_path=parquet,
        writer=lambda _m: None,
    )
    assert TOURNAMENT_PATH.read_bytes() == before


# ---------------------------------------------------------------------------
# Reproducibility
# ---------------------------------------------------------------------------


def test_checkpoint_numbers_reproducible(tmp_path: Path, model_map) -> None:
    parquet = _write_outcomes(tmp_path, model_map, n_group=20, n_r16=0)
    a = compute_checkpoint(
        code_sha="fixed", evaluated_at_utc="2026-07-15T00:00:00Z", parquet_path=parquet
    )
    b = compute_checkpoint(
        code_sha="fixed", evaluated_at_utc="2026-07-15T00:00:00Z", parquet_path=parquet
    )
    assert a == b  # bit-identical, including the metadata we pinned


# ---------------------------------------------------------------------------
# M0 derivation
# ---------------------------------------------------------------------------


def test_m0_distributions_valid_cover_and_align(model_map) -> None:
    dists_mstar = reconstruct_distributions(model_map)
    dists_m0 = reconstruct_distributions(model_map, batch_parquet=FROZEN_MATCH_RUNS_M0)

    # Cover exactly the 72 group slots.
    assert len(dists_m0) == 72
    assert dists_m0["match_id"].nunique() == 72

    # Sum to 1 per match.
    s = dists_m0["p_home"] + dists_m0["p_draw"] + dists_m0["p_away"]
    assert (s.sub(1.0).abs() < 1e-9).all()

    # Align to M_STAR by match_id.
    assert set(dists_m0["match_id"]) == set(dists_mstar["match_id"])


def test_gap_array_length_equals_settled_group_count(tmp_path: Path, model_map) -> None:
    parquet = _write_outcomes(tmp_path, model_map, n_group=7, n_r16=0)
    cp = compute_checkpoint(
        code_sha="x", evaluated_at_utc="t", parquet_path=parquet
    )
    assert cp is not None
    assert cp["n"] == 7  # n is the paired-difference gap array length


# ---------------------------------------------------------------------------
# Direction
# ---------------------------------------------------------------------------


def _shifted_pair(target_gap_se: float, n: int = 24):
    """Return (ll_mstar, ll_m0) whose paired difference d = ll_mstar - ll_m0 has
    mean = target_gap_se * SE(d), so check_kill_criterion sees exactly that many
    SE of separation in the M_STAR-worse (positive) direction."""
    base = np.array(
        [0.10, 0.55, -0.30, 0.80, -0.20, 0.42, -0.61, 0.71, 0.05, 0.33,
         -0.14, 0.27, 0.63, -0.48, 0.19, 0.36, -0.22, 0.58, -0.07, 0.44,
         0.11, -0.39, 0.66, -0.51],
        dtype=float,
    )[:n]
    centered = base - base.mean()
    se = float(centered.std(ddof=1) / np.sqrt(n))
    d = centered + target_gap_se * se  # mean(d) = target_gap_se * se
    ll_m0 = np.full(n, 1.0)
    ll_mstar = ll_m0 + d
    return ll_mstar, ll_m0


def test_direction_three_se_worse_trips() -> None:
    ll_mstar, ll_m0 = _shifted_pair(+3.0)
    tripped, _detail = check_kill_criterion(ll_mstar, ll_m0)
    assert tripped is True


def test_direction_three_se_better_does_not_trip() -> None:
    ll_mstar, ll_m0 = _shifted_pair(-3.0)
    tripped, _detail = check_kill_criterion(ll_mstar, ll_m0)
    assert tripped is False


# ---------------------------------------------------------------------------
# Wall: knockout deferred rows never enter the forecast set
# ---------------------------------------------------------------------------


def test_knockout_rows_never_enter_forecast_set(tmp_path: Path, model_map) -> None:
    parquet = _write_outcomes(tmp_path, model_map, n_group=6, n_r16=5)
    cp = compute_checkpoint(code_sha="x", evaluated_at_utc="t", parquet_path=parquet)
    assert cp is not None
    # Only the 6 group matches are scored; the 5 r16 rows are deferred.
    assert cp["n"] == 6
    assert count_settled_r16(parquet) == 5


def test_count_settled_r16_reaches_threshold(tmp_path: Path, model_map) -> None:
    parquet = _write_outcomes(tmp_path, model_map, n_group=1, n_r16=R16_SETTLEMENT_COUNT)
    assert count_settled_r16(parquet) == R16_SETTLEMENT_COUNT


# ---------------------------------------------------------------------------
# Trigger idempotence: once published, the producer is a no-op
# ---------------------------------------------------------------------------


def test_carry_forward_is_byte_identical_no_op(tmp_path: Path, model_map) -> None:
    new_dir = tmp_path / "new"
    latest = tmp_path / "latest"
    new_dir.mkdir()
    latest.mkdir()
    (new_dir / "evaluation_metrics.json").write_text(EVAL_METRICS_PATH.read_text())

    # A prior published artifact with a sentinel value that could NOT be
    # recomputed from data (proves carry-forward, not recomputation).
    sentinel = {
        "forecast_set": "sentinel",
        "n": 999,
        "gap_in_se": 42.0,
        "tripped": True,
        "threshold_se": 2.0,
        "source_batch_id": "batch_20260512_013228Z",
    }
    (latest / "r16_checkpoint.json").write_text(json.dumps(sentinel, indent=2))

    # A settled source is present and would otherwise produce different numbers;
    # the producer must ignore it because the artifact already exists.
    parquet = _write_outcomes(tmp_path, model_map, n_group=20, n_r16=0)
    result = publish_if_triggered(
        new_dir=new_dir,
        latest_dir=latest,
        code_sha="testsha",
        evaluated_at_utc="2026-07-15T00:00:00Z",
        force=False,
        parquet_path=parquet,
        writer=lambda _m: None,
    )

    carried = json.loads((new_dir / "r16_checkpoint.json").read_text())
    assert carried == sentinel  # byte-identical carry-forward, no recompute
    assert result == sentinel
    # Mirrored onto evaluation_metrics without recomputation.
    em = json.loads((new_dir / "evaluation_metrics.json").read_text())
    assert em["r16_checkpoint"] == sentinel


def test_interim_state_writes_nothing(tmp_path: Path, model_map) -> None:
    new_dir = tmp_path / "new"
    latest = tmp_path / "latest"
    new_dir.mkdir()
    latest.mkdir()

    # Seed a SYNTHETIC pre-checkpoint evaluation_metrics.json. The interim state
    # is defined by the ABSENCE of the r16_checkpoint field, so the seed must not
    # already carry that key. Reading the live committed EVAL_METRICS_PATH here
    # would be non-hermetic: the checkpoint fired and published on 2026-07-07, so
    # the live metrics file now carries r16_checkpoint permanently, which would
    # make the "no field" assertion below pass or fail on repo state rather than
    # on producer behavior.
    (new_dir / "evaluation_metrics.json").write_text(
        json.dumps({"snapshot_id": "synthetic-interim"}, indent=2)
    )

    # Below the R16 settlement threshold and not forced: no artifact, no field.
    parquet = _write_outcomes(tmp_path, model_map, n_group=10, n_r16=3)
    result = publish_if_triggered(
        new_dir=new_dir,
        latest_dir=latest,
        code_sha="testsha",
        evaluated_at_utc="2026-07-15T00:00:00Z",
        force=False,
        parquet_path=parquet,
        writer=lambda _m: None,
    )
    assert result is None
    assert not (new_dir / "r16_checkpoint.json").exists()
    em = json.loads((new_dir / "evaluation_metrics.json").read_text())
    assert "r16_checkpoint" not in em
