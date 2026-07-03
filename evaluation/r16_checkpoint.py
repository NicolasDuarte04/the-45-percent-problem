"""
evaluation/r16_checkpoint.py
============================
cp-25b: the Round of 16 pre-registered kill-criterion checkpoint grader.

The pre-registration commits to a second evaluation of the 2-SE kill criterion
once the Round of 16 settles (see the vault kill-criteria essay, section "The
two checkpoints"). This module computes that live checkpoint and publishes a
single, once-only artifact.

Design (fixed by the cp-25b Stage 1 inspection and architect review):

  1. Forecast set (architect reading a). The statistic is computed over the 72
     pre-registered group-stage per-match forecasts, re-scored against the
     realized group results, and published at the R16 settlement moment. No
     knockout forecasts enter: there are no frozen per-match knockout forecasts
     in the champion batch (knockout slots carry different teams per Monte Carlo
     run), so the pre-registered live set is the frozen group forecasts scored
     against their realized outcomes. This is the honest interpretation of "the
     kill criterion re-evaluated on live tournament data": the frozen champion
     distributions vs. the results that have actually settled.

  2. Direction. The kill fires when M_STAR (M2) is WORSE than M0 by at least
     2 standard errors, via the existing check_kill_criterion(ll_mstar, ll_m0)
     in evaluation.accuracy_metrics (paired per-match log-loss differences,
     se = d.std(ddof=1) / sqrt(n), threshold from the locked yaml).

  3. Presentation. The live gap is its own event with its own construction. It
     is a paired per-match SE over settled group results; it is never a
     continuation of, nor numerically compared to, the Phase 8 pre-tournament
     1.75 SE or 6.22 SE cross-validation readings. The "construction" note on
     the artifact says so explicitly.

  4. Trigger. Computed inside the nightly pipeline, idempotent and once-only:
     it fires (computes and writes) when the count of settled Round-of-16 rows
     reaches R16_SETTLEMENT_COUNT (8) AND no checkpoint artifact exists yet;
     once published it is carried forward byte-identical and never recomputed.
     A manual override (force=True) bypasses the settled-count gate for the
     workflow_dispatch path.

  5. Artifact. r16_checkpoint.json, written into the snapshot namespace next to
     evaluation_metrics.json (both the timestamped snapshot dir and, via the
     regen's copytree into latest/, the latest bundle), plus a sibling field
     r16_checkpoint mirrored onto evaluation_metrics.json.

This module composes existing, tested functions (build_model_map,
resolve_scored, halt_if_mapping_error, reconstruct_distributions,
accuracy_metrics.log_loss, check_kill_criterion). It never re-runs the model,
never touches the frozen batch or any sealed parameter, and never reads the
cp-17 live knockout cards. The graded ledger is untouched: this is a read-only
re-scoring of the same frozen group forecasts.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation import accuracy_metrics  # noqa: E402
from evaluation.accuracy_metrics import check_kill_criterion, log_loss  # noqa: E402
from evaluation.match_score_join import (  # noqa: E402
    halt_if_mapping_error,
    regulation_outcome,
    resolve_scored,
)
from evaluation.reconstruct_forecasts import reconstruct_distributions  # noqa: E402
from evaluation.settled_source import load_settled_outcomes  # noqa: E402
from frozen_batch import FROZEN_BATCH_ID, FROZEN_BATCH_PATH  # noqa: E402

# The published checkpoint artifact filename inside the snapshot namespace.
CHECKPOINT_FILENAME = "r16_checkpoint.json"

# Round of 16 = 8 matches (16 teams). The checkpoint fires once all eight have
# settled. NOTE: the settled-source stage enum is lowercase "r16" (see
# ingestion/fetch_match_outcomes.STAGE_MAP); the spec's literal "R16" does not
# occur in the data, so the count matches case-insensitively on "r16".
R16_STAGE = "r16"
R16_SETTLEMENT_COUNT = 8

# The M0 null-baseline batch parquet lives beside the champion M2 parquet in the
# frozen batch dir. Referenced (never redefined) via FROZEN_BATCH_PATH.
FROZEN_MATCH_RUNS_M0 = FROZEN_BATCH_PATH / "match_runs_M0.parquet"

# Locked 2-SE threshold, read from the same yaml check_kill_criterion reads.
KILL_THRESHOLD_SE = float(
    accuracy_metrics._CONST["kill_criterion"]["threshold_standard_errors"]
)

_LABEL_IDX = {"H": 0, "D": 1, "A": 2}

_CONSTRUCTION_NOTE = (
    "Paired per-match standard error over the settled group-stage results: "
    "se = d.std(ddof=1) / sqrt(n) on the per-match log-loss differences "
    "d_i = ll_mstar_i - ll_m0_i. This is a different construction from the "
    "Phase 8 pre-tournament cross-validation readings (1.75 SE paired-difference "
    "and 6.22 SE marginal); the live gap is its own event and is never a "
    "continuation of, or numerically compared to, those cross-validation numbers."
)

_FORECAST_SET_NOTE = (
    "The 72 pre-registered group-stage per-match forecasts from the frozen "
    "champion batch, re-scored against realized group results at the Round of 16 "
    "settlement moment. No knockout forecasts enter: no frozen per-match knockout "
    "forecasts exist (knockout slots carry different teams per Monte Carlo run)."
)


def _git_sha() -> str:
    """Return the current git HEAD SHA (first 16 hex chars), matching the regen."""
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


def count_settled_r16(parquet_path: Optional[Path] = None) -> int:
    """Return the number of settled Round-of-16 outcomes in the settled source.

    Reads the same settled-outcome source the graded pipeline uses
    (evaluation.settled_source.load_settled_outcomes) and counts rows whose
    stage is the canonical R16 enum ("r16"), case-insensitively. Returns 0 when
    no source is reachable (the normal pre-R16 / offline-CI state).
    """
    outcomes, _ = load_settled_outcomes(parquet_path)
    if outcomes is None or outcomes.empty or "stage" not in outcomes.columns:
        return 0
    stage = outcomes["stage"].astype(str).str.strip().str.lower()
    return int((stage == R16_STAGE).sum())


def compute_checkpoint(
    code_sha: Optional[str] = None,
    evaluated_at_utc: Optional[str] = None,
    matches_dir: Optional[Path] = None,
    parquet_path: Optional[Path] = None,
) -> Optional[dict]:
    """Compute the R16 kill-criterion checkpoint over the settled group forecasts.

    Returns the checkpoint dict, or None when no settled source is reachable
    (a clean skip). On a mapping-error the bijection hard-stop is honored via
    halt_if_mapping_error (SystemExit(2)); nothing is published on a broken map.

    The M_STAR and M0 sides are BOTH recomputed from their frozen distributions
    and pushed through the one identical accuracy_metrics.log_loss path, aligned
    by match_id, so neither model reads stored ledger contributions.
    """
    # 1. Resolve settled group matches exactly as the graded pipeline does.
    score_res = resolve_scored(matches_dir=matches_dir, parquet_path=parquet_path)
    halt_if_mapping_error(score_res)  # SystemExit(2) before any output on a broken map
    if score_res["status"] == "no_source":
        return None
    scored = score_res["scored"]
    if scored is None or scored.empty:
        return None

    model_map = score_res.get("model_map")
    if model_map is None:  # defensive; resolve_scored returns it on status "ok"
        from evaluation.forecast_mapping import build_model_map

        model_map = build_model_map(matches_dir=matches_dir) if matches_dir else build_model_map()

    # 2. Frozen distributions for both models (M_STAR = M2 default, M0 explicit).
    dists_mstar = reconstruct_distributions(model_map)
    dists_m0 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_MATCH_RUNS_M0
    )
    mstar_by_id = {r["match_id"]: r for _, r in dists_mstar.iterrows()}
    m0_by_id = {r["match_id"]: r for _, r in dists_m0.iterrows()}

    # 3. Per-match log-loss for BOTH models, aligned by match_id, one identical
    #    scoring path. Settled group matches only (scored is group-scoped).
    ll_mstar: list[float] = []
    ll_m0: list[float] = []
    for _, sc in scored.sort_values("match_id").iterrows():
        match_id = str(sc["match_id"])
        dm = mstar_by_id.get(match_id)
        d0 = m0_by_id.get(match_id)
        if dm is None or d0 is None:
            # A settled group match with no reconstructed distribution would be a
            # frozen-batch coverage break; skip it rather than invent a score.
            continue
        realized = regulation_outcome(int(sc["home_goals"]), int(sc["away_goals"]))
        y = np.zeros((1, 3), dtype=float)
        y[0, _LABEL_IDX[realized]] = 1.0
        p_mstar = np.array([[dm["p_home"], dm["p_draw"], dm["p_away"]]], dtype=float)
        p_m0 = np.array([[d0["p_home"], d0["p_draw"], d0["p_away"]]], dtype=float)
        ll_mstar.append(float(log_loss(p_mstar, y)[0]))
        ll_m0.append(float(log_loss(p_m0, y)[0]))

    n = len(ll_mstar)
    if n == 0:
        return None

    arr_mstar = np.asarray(ll_mstar, dtype=float)
    arr_m0 = np.asarray(ll_m0, dtype=float)

    # 4. The locked kill-criterion check (direction: M_STAR worse than M0).
    tripped, detail = check_kill_criterion(arr_mstar, arr_m0)

    # Display statistics, recomputed from the same arrays with the same formulas
    # check_kill_criterion uses (paired per-match SE). gap_in_se is signed:
    # positive means M_STAR is worse than M0 (the failing direction).
    d = arr_mstar - arr_m0
    mean_diff = float(d.mean())
    se = float(d.std(ddof=1) / np.sqrt(n))
    gap_in_se = float(mean_diff / se) if se > 0 else 0.0

    return {
        "forecast_set": _FORECAST_SET_NOTE,
        "n": n,
        "mean_log_loss_mstar": round(float(arr_mstar.mean()), 6),
        "mean_log_loss_m0": round(float(arr_m0.mean()), 6),
        "mean_diff": round(mean_diff, 6),
        "se": round(se, 6),
        "gap_in_se": round(gap_in_se, 6),
        "threshold_se": KILL_THRESHOLD_SE,
        "tripped": bool(tripped),
        "check_detail": detail,
        "source_batch_id": FROZEN_BATCH_ID,
        "evaluated_at_utc": evaluated_at_utc,
        "code_sha": code_sha if code_sha is not None else _git_sha(),
        "settled_source": score_res.get("source"),
        "construction": _CONSTRUCTION_NOTE,
    }


def _already_published(latest_dir: Path) -> Optional[dict]:
    """Return the previously published checkpoint from latest/, or None."""
    path = Path(latest_dir) / CHECKPOINT_FILENAME
    if path.exists():
        try:
            return json.loads(path.read_text())
        except (ValueError, OSError):
            return None
    return None


def publish_if_triggered(
    new_dir: Path,
    latest_dir: Path,
    code_sha: Optional[str] = None,
    evaluated_at_utc: Optional[str] = None,
    *,
    force: bool = False,
    matches_dir: Optional[Path] = None,
    parquet_path: Optional[Path] = None,
    writer=None,
) -> Optional[dict]:
    """Publish the checkpoint into new_dir when the trigger fires; else no-op.

    Called from the regen driver AFTER evaluation_metrics.json is written into
    new_dir and BEFORE the copytree into latest/, so a written artifact rides
    into latest/ for free. Behavior:

      - already published (latest/r16_checkpoint.json exists): carry it forward
        byte-identical into new_dir and mirror it onto new_dir's
        evaluation_metrics.json. No recomputation. This is the once-only no-op.
      - not yet published, and (force OR settled R16 count >= 8): compute the
        checkpoint, write new_dir/r16_checkpoint.json, and mirror it onto
        new_dir's evaluation_metrics.json.
      - otherwise (interim, R16 not settled): write nothing; the website keeps
        the interim sentence.

    Returns the checkpoint dict when one is present after the call (published or
    carried forward), else None.
    """
    new_dir = Path(new_dir)
    latest_dir = Path(latest_dir)
    emit = writer if writer is not None else (lambda m: print(m))

    prior = _already_published(latest_dir)
    if prior is not None:
        # Once-only: carry the frozen result forward verbatim; never recompute.
        (new_dir / CHECKPOINT_FILENAME).write_text(json.dumps(prior, indent=2))
        _mirror_onto_evaluation_metrics(new_dir, prior)
        emit(
            "    [cp-25b] R16 checkpoint already published; carried forward "
            f"(tripped={prior.get('tripped')}, n={prior.get('n')})"
        )
        return prior

    if not force:
        settled_r16 = count_settled_r16(parquet_path)
        if settled_r16 < R16_SETTLEMENT_COUNT:
            emit(
                "    [cp-25b] R16 checkpoint not yet due "
                f"(settled R16 = {settled_r16}/{R16_SETTLEMENT_COUNT}); interim state"
            )
            return None
        emit(
            f"    [cp-25b] R16 settled ({settled_r16}/{R16_SETTLEMENT_COUNT}); "
            "computing the pre-registered kill-criterion checkpoint"
        )
    else:
        emit("    [cp-25b] R16 checkpoint forced (manual override)")

    checkpoint = compute_checkpoint(
        code_sha=code_sha,
        evaluated_at_utc=evaluated_at_utc,
        matches_dir=matches_dir,
        parquet_path=parquet_path,
    )
    if checkpoint is None:
        emit("    [cp-25b] no settled source / no scored group set; nothing published")
        return None

    (new_dir / CHECKPOINT_FILENAME).write_text(json.dumps(checkpoint, indent=2))
    _mirror_onto_evaluation_metrics(new_dir, checkpoint)
    emit(
        "    [cp-25b] R16 checkpoint PUBLISHED: "
        f"n={checkpoint['n']} gap_in_se={checkpoint['gap_in_se']} "
        f"threshold={checkpoint['threshold_se']} tripped={checkpoint['tripped']}"
    )
    return checkpoint


def _mirror_onto_evaluation_metrics(new_dir: Path, checkpoint: dict) -> None:
    """Add the r16_checkpoint sibling field to new_dir/evaluation_metrics.json.

    Additive: only the new top-level key is set; every other field (including
    the byte-identical kill_criteria_check block and the frozen calibration
    fields) is left exactly as written by the cp-14 aggregator.
    """
    em_path = Path(new_dir) / "evaluation_metrics.json"
    if not em_path.exists():
        return
    em = json.loads(em_path.read_text())
    em["r16_checkpoint"] = checkpoint
    em_path.write_text(json.dumps(em, indent=2))


def _cli() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description=(
            "cp-25b R16 pre-registered kill-criterion checkpoint grader. "
            "Dry-run computes and prints the numbers without writing anything."
        )
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="compute and print the checkpoint; write nothing (the default).",
    )
    parser.add_argument(
        "--matches-dir",
        type=Path,
        default=None,
        help="override the published matches dir (defaults to latest/matches).",
    )
    parser.add_argument(
        "--parquet",
        type=Path,
        default=None,
        help="override the settled-outcomes parquet path.",
    )
    args = parser.parse_args()

    settled_r16 = count_settled_r16(args.parquet)
    checkpoint = compute_checkpoint(
        matches_dir=args.matches_dir, parquet_path=args.parquet
    )
    print(f"settled R16 count: {settled_r16}/{R16_SETTLEMENT_COUNT}")
    if checkpoint is None:
        print("no settled source or no scored group set; nothing to compute")
        return 0
    print(json.dumps(checkpoint, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
