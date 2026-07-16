"""
evaluation/ablation_report.py
=============================
cp-36: the templated R16 ablation report, published with honest nulls.

This module does NOT compute a new evaluation. It is a thin adapter that feeds
the existing, tested ablation compiler (evaluation.evaluation_dashboard.
compile_ablation) with a real MetricsTable assembled from the frozen
reconstruction path:

    forecast_mapping.build_model_map        (committed matches <-> frozen slots)
    reconstruct_forecasts.reconstruct_distributions   (frozen batch samples)
    accuracy_metrics.{brier, rps, log_loss, diebold_mariano, _bootstrap_ci,
                      check_kill_criterion}

scored against the 72 committed group-stage ledger outcomes. It reuses the exact
construction the R16 kill-criterion checkpoint (evaluation.r16_checkpoint) uses:
per-match regulation outcomes over the settled group results, one identical
scoring path for M0 and the champion M2. It adds no new forecasts and estimates
nothing.

Only three cells are populated: M0, M2, and M_STAR (= M2) accuracy with 95
percent seeded bootstrap CIs, plus the HLN-corrected Diebold-Mariano comparison
of M2 and M_STAR against M0. Every other cell is null and stays null:

  - M1 and M3 accuracy: no committed per-match shadow forecasts exist.
  - Market-devigged row, dm_vs_market: no committed market lines exist.
  - Nyberg market-efficiency test: same reason (no committed market lines).
  - All trading / CLV columns: mstar_report and shadow_results are empty.
  - Knockout stages: structurally absent (the frozen batch carries no per-match
    knockout forecasts, since knockout slots hold different teams per Monte
    Carlo run), so by_stage carries only the single group row (n = 72).

Honest nulls, not invented fill. The compiler renders a null cell as null in
JSON and as the "---" placeholder in LaTeX.

Provenance and constants: the report embeds the LIVE pre_reg_constants.yaml sha
(compile_ablation reads it from disk). It deliberately does NOT pass
expected_constants_sha: the committed evaluation/constants.sha is the Phase 8
seal-time hash and no longer matches the YAML after post-seal additive sections
were appended (commit 39899d24). That situation is documented in the deviation
note, not silently reconciled.

Cross-check: the M2 and M0 mean log-losses this adapter computes MUST equal the
values already published in website/public/data/latest/r16_checkpoint.json
(mean_log_loss_mstar / mean_log_loss_m0). If they differ, the build STOPS rather
than shipping a report that disagrees with the once-only checkpoint.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any, Optional

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.accuracy_metrics import (  # noqa: E402
    DMResult,
    MetricsTable,
    ModelMetrics,
    StageMetrics,
    _bootstrap_ci,
    brier,
    check_kill_criterion,
    diebold_mariano,
    log_loss,
    rps,
)
from evaluation.evaluation_dashboard import compile_ablation  # noqa: E402
from evaluation.forecast_mapping import build_model_map  # noqa: E402
from evaluation.match_score_join import regulation_outcome  # noqa: E402
from evaluation.reconstruct_forecasts import reconstruct_distributions  # noqa: E402
from frozen_batch import FROZEN_BATCH_ID, FROZEN_BATCH_PATH  # noqa: E402

# The M0 null-baseline parquet lives beside the champion M2 parquet in the frozen
# batch dir (referenced, never redefined, like r16_checkpoint does).
FROZEN_MATCH_RUNS_M0 = FROZEN_BATCH_PATH / "match_runs_M0.parquet"

DEFAULT_MATCHES_DIR = PROJECT_ROOT / "website" / "public" / "data" / "latest" / "matches"
R16_CHECKPOINT_PATH = (
    PROJECT_ROOT / "website" / "public" / "data" / "latest" / "r16_checkpoint.json"
)

ABLATION_JSON_FILENAME = "ablation.json"

_LABEL_IDX = {"H": 0, "D": 1, "A": 2}

# The single group stage row. Knockout stages are structurally absent (see the
# module docstring), so by_stage never carries a knockout key.
_GROUP_STAGE_KEY = "group"

# The gaps paragraph, carried verbatim into the deviation note and the JSON meta.
GAPS_NOTE = (
    "This report scores the 72 pre-registered group-stage forecasts from the "
    "frozen champion batch, re-scored against the realized group results with "
    "the same per-match regulation-outcome construction the R16 kill-criterion "
    "checkpoint uses. It populates M0 and the champion M2 (= M_STAR) accuracy "
    "with 95 percent seeded bootstrap confidence intervals and the "
    "HLN-corrected Diebold-Mariano comparison of M2 and M_STAR against M0. "
    "Every other cell is null, and null means null: M1 and M3 have no committed "
    "per-match forecasts, so their accuracy is null; there are no committed "
    "market lines, so the de-vigged market row, the DM-vs-market column, and "
    "the Nyberg market-efficiency test are all null; every trading and CLV "
    "column is null because no bet ledger was committed; and the knockout "
    "stages are structurally absent because the frozen batch carries no "
    "per-match knockout forecasts (knockout slots hold different teams on every "
    "Monte Carlo run), so by_stage carries only the single group row (n = 72). "
    "No shadow model, market estimate, or knockout score was invented to fill a "
    "column."
)

# The timing disclosure (ruling 8), carried into the JSON meta, the caption, and
# the deviation note.
TIMING_DISCLOSURE = (
    "The kill-criterion checkpoint was published within the 72-hour window on "
    "2026-07-07; this full templated report reuses that same frozen re-scoring, "
    "adds no new forecasts, and was compiled after that window, dated "
    "accordingly."
)

_CONSTANTS_SHA_NOTE = (
    "The report embeds the live pre_reg_constants.yaml sha. The committed "
    "evaluation/constants.sha is the Phase 8 seal-time hash and no longer "
    "matches the YAML after post-seal additive sections were appended (commit "
    "39899d24). expected_constants_sha is intentionally not enforced here; the "
    "situation is documented in the deviation note rather than silently "
    "reconciled."
)


def _read_frozen_group_outcomes(matches_dir: Path) -> dict[str, str]:
    """Read the settled group-stage outcomes from the committed match files.

    Returns {match_id: "H" | "D" | "A"} for every played group match, derived
    from the committed ``score`` block via the same regulation_outcome the
    graded pipeline and the R16 checkpoint use. Reads frozen committed artifacts
    only; computes nothing about the model.
    """
    outcomes: dict[str, str] = {}
    for path in sorted(Path(matches_dir).glob("M*.json")):
        doc = json.loads(path.read_text())
        if doc.get("round") != "GRP":
            continue
        score = doc.get("score")
        if not score or score.get("home") is None or score.get("away") is None:
            continue
        outcomes[doc["match_id"]] = regulation_outcome(
            int(score["home"]), int(score["away"])
        )
    return outcomes


def _per_match_losses(
    matches_dir: Path,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, int]:
    """Score both models on the frozen distributions and committed outcomes.

    Returns aligned per-match arrays for M0 and M2 (the champion, also M_STAR):
        (brier_m0, rps_m0, ll_m0, brier_m2, rps_m2, ll_m2, n)

    Both sides are reconstructed from their frozen batch distributions and pushed
    through the one identical accuracy_metrics scoring path, aligned by match_id,
    exactly as evaluation.r16_checkpoint does. Neither reads stored ledger
    contributions.
    """
    model_map = build_model_map(matches_dir=matches_dir)
    dists_m2 = reconstruct_distributions(model_map)
    dists_m0 = reconstruct_distributions(model_map, batch_parquet=FROZEN_MATCH_RUNS_M0)
    m2_by_id = {r["match_id"]: r for _, r in dists_m2.iterrows()}
    m0_by_id = {r["match_id"]: r for _, r in dists_m0.iterrows()}

    outcomes = _read_frozen_group_outcomes(matches_dir)

    p_m2_rows: list[list[float]] = []
    p_m0_rows: list[list[float]] = []
    y_rows: list[list[float]] = []
    for match_id in sorted(outcomes):
        dm2 = m2_by_id.get(match_id)
        dm0 = m0_by_id.get(match_id)
        if dm2 is None or dm0 is None:
            # A settled group match with no reconstructed distribution would be a
            # frozen-batch coverage break; skip rather than invent a score.
            continue
        y = [0.0, 0.0, 0.0]
        y[_LABEL_IDX[outcomes[match_id]]] = 1.0
        y_rows.append(y)
        p_m2_rows.append([dm2["p_home"], dm2["p_draw"], dm2["p_away"]])
        p_m0_rows.append([dm0["p_home"], dm0["p_draw"], dm0["p_away"]])

    p_m2 = np.asarray(p_m2_rows, dtype=float)
    p_m0 = np.asarray(p_m0_rows, dtype=float)
    y_oh = np.asarray(y_rows, dtype=float)
    n = len(y_rows)

    return (
        brier(p_m0, y_oh),
        rps(p_m0, y_oh),
        log_loss(p_m0, y_oh),
        brier(p_m2, y_oh),
        rps(p_m2, y_oh),
        log_loss(p_m2, y_oh),
        n,
    )


def _model_metrics_from_losses(
    model_id: str,
    bs: np.ndarray,
    rl: np.ndarray,
    ll: np.ndarray,
) -> ModelMetrics:
    """Build a ModelMetrics with 95 percent seeded bootstrap CIs and the single
    group-stage row. The bootstrap seed is fixed (accuracy_metrics._bootstrap_ci
    defaults to rng_seed=42), so the CIs are deterministic."""
    n = len(bs)
    group = StageMetrics(
        stage=_GROUP_STAGE_KEY,
        n=n,
        brier_mean=float(bs.mean()),
        brier_ci=_bootstrap_ci(bs),
        rps_mean=float(rl.mean()),
        rps_median=float(np.median(rl)),
        rps_ci=_bootstrap_ci(rl),
        log_loss_mean=float(ll.mean()),
        log_loss_ci=_bootstrap_ci(ll),
    )
    return ModelMetrics(
        model_id=model_id,
        n=n,
        brier_mean=float(bs.mean()),
        brier_ci=_bootstrap_ci(bs),
        rps_mean=float(rl.mean()),
        rps_median=float(np.median(rl)),
        rps_ci=_bootstrap_ci(rl),
        log_loss_mean=float(ll.mean()),
        log_loss_ci=_bootstrap_ci(ll),
        by_stage={_GROUP_STAGE_KEY: group},
    )


def build_frozen_metrics_table(
    matches_dir: Optional[Path] = None,
) -> tuple[MetricsTable, dict[str, float]]:
    """Assemble the MetricsTable that feeds compile_ablation.

    Populates only M0, M2, and M_STAR (= M2) accuracy plus the HLN-corrected DM
    comparison of M2 and M_STAR against M0 (Brier loss). Every other model and
    test is left absent, so the compiler renders it null.

    Returns (metrics, crosscheck) where crosscheck carries the mean log-losses
    for the R16-checkpoint cross-check.
    """
    md = Path(matches_dir) if matches_dir is not None else DEFAULT_MATCHES_DIR
    bs0, rl0, ll0, bs2, rl2, ll2, n = _per_match_losses(md)

    mm_m0 = _model_metrics_from_losses("M0", bs0, rl0, ll0)
    mm_m2 = _model_metrics_from_losses("M2", bs2, rl2, ll2)
    mm_mstar = _model_metrics_from_losses("M_STAR", bs2, rl2, ll2)

    # HLN-corrected Diebold-Mariano on Brier loss, both M2 and M_STAR vs M0. The
    # compiler surfaces the loss_type == "brier" DM into the dm_vs_m0 cell.
    dm_results: list[DMResult] = [
        diebold_mariano(bs2, bs0, model_a="M2", model_b="M0", loss_type="brier"),
        diebold_mariano(bs2, bs0, model_a="M_STAR", model_b="M0", loss_type="brier"),
    ]

    # The kill criterion, recomputed on the same log-loss arrays (direction:
    # M_STAR worse than M0). Matches the published checkpoint (does not fire).
    kill_tripped, kill_detail = check_kill_criterion(ll2, ll0)

    metrics = MetricsTable(
        model_metrics={"M0": mm_m0, "M2": mm_m2, "M_STAR": mm_mstar},
        dm_results=dm_results,
        nyberg_results=[],
        kill_criterion_tripped=kill_tripped,
        kill_criterion_detail=kill_detail,
    )
    crosscheck = {
        "n": n,
        "mean_log_loss_mstar": round(float(ll2.mean()), 6),
        "mean_log_loss_m0": round(float(ll0.mean()), 6),
    }
    return metrics, crosscheck


def _published_checkpoint_reference() -> Optional[dict[str, Any]]:
    """Load the once-only R16 checkpoint values for the cross-check, or None."""
    if not R16_CHECKPOINT_PATH.exists():
        return None
    try:
        return json.loads(R16_CHECKPOINT_PATH.read_text())
    except (ValueError, OSError):
        return None


def crosscheck_against_r16(crosscheck: dict[str, float]) -> dict[str, Any]:
    """Verify the adapter's mean log-losses equal the published checkpoint.

    Raises ValueError (STOP; do not ship) if they differ. Returns a dict of the
    reference values and the equality result for the JSON meta.
    """
    ref = _published_checkpoint_reference()
    if ref is None:
        # No committed checkpoint to check against. Surface it rather than
        # silently passing.
        raise ValueError(
            "r16_checkpoint.json not found; cannot cross-check the ablation "
            f"means (expected at {R16_CHECKPOINT_PATH})."
        )
    ref_mstar = ref.get("mean_log_loss_mstar")
    ref_m0 = ref.get("mean_log_loss_m0")
    got_mstar = crosscheck["mean_log_loss_mstar"]
    got_m0 = crosscheck["mean_log_loss_m0"]
    if got_mstar != ref_mstar or got_m0 != ref_m0:
        raise ValueError(
            "ablation cross-check FAILED against r16_checkpoint.json. "
            f"M_STAR/M2 mean log-loss: got {got_mstar}, checkpoint {ref_mstar}. "
            f"M0 mean log-loss: got {got_m0}, checkpoint {ref_m0}. "
            "Refusing to publish a report that disagrees with the once-only "
            "kill-criterion checkpoint."
        )
    return {
        "matches_r16_checkpoint": True,
        "mean_log_loss_mstar": got_mstar,
        "mean_log_loss_m0": got_m0,
        "checkpoint_source": ref.get("settled_source"),
        "checkpoint_evaluated_at_utc": ref.get("evaluated_at_utc"),
    }


def build_meta(crosscheck_result: dict[str, Any], n: int) -> dict[str, Any]:
    """The additive top-level ``meta`` block for ablation.json."""
    return {
        "report_kind": "r16_ablation_templated",
        "timing_disclosure": TIMING_DISCLOSURE,
        "gaps_note": GAPS_NOTE,
        "constants_sha_note": _CONSTANTS_SHA_NOTE,
        "source_batch_id": FROZEN_BATCH_ID,
        "n_scored": n,
        "populated_cells": [
            "M0.accuracy",
            "M2.accuracy",
            "M_STAR.accuracy",
            "M2.dm_vs_m0",
            "M_STAR.dm_vs_m0",
        ],
        "null_cells": [
            "M1.accuracy",
            "M3.accuracy",
            "MARKET_DEVIGGED.accuracy",
            "*.dm_vs_market",
            "*.nyberg",
            "*.trading",
            "knockout_stages",
        ],
        "checkpoint_crosscheck": crosscheck_result,
    }


def _normalise_millis(ts: str) -> str:
    """Ensure an ISO-8601 UTC timestamp carries millisecond precision + Z, to
    satisfy the ablation_v7 generated_at_utc pattern. A stamp that already has
    fractional seconds is returned unchanged."""
    if ts.endswith("Z") and "." in ts:
        return ts
    if ts.endswith("Z"):
        return ts[:-1] + ".000Z"
    return ts + ".000Z"


def compute_ablation(
    output_dir: Path,
    generated_at_utc: str,
    matches_dir: Optional[Path] = None,
) -> dict[str, float]:
    """Build the MetricsTable, cross-check it, and write the ablation artifacts.

    Writes ablation.json, ablation_table.tex, and ablation_caption.tex into
    output_dir via the tested compile_ablation. Returns the crosscheck dict.
    """
    metrics, crosscheck = build_frozen_metrics_table(matches_dir=matches_dir)
    crosscheck_result = crosscheck_against_r16(crosscheck)
    meta = build_meta(crosscheck_result, int(crosscheck["n"]))

    compile_ablation(
        metrics=metrics,
        mstar_report=None,
        shadow_results={},
        output_dir=Path(output_dir),
        expected_constants_sha=None,  # ruling 3: do not enforce the stale seal
        generated_at_utc=_normalise_millis(generated_at_utc),
        meta=meta,
    )
    return crosscheck


def publish_ablation(
    new_dir: Path,
    latest_dir: Path,
    generated_at_utc: str,
    *,
    matches_dir: Optional[Path] = None,
    writer=None,
) -> Optional[dict[str, Any]]:
    """Give ablation.json the same regen treatment as r16_checkpoint.json.

    Called from the regen driver AFTER the snapshot bundle is assembled in
    new_dir and BEFORE the copytree into latest/, so a written artifact rides
    into latest/ for free. Behaviour mirrors r16_checkpoint.publish_if_triggered:

      - already published (latest/ablation.json exists): carry it forward
        byte-identical into new_dir. No recomputation. The content is frozen (it
        scores the fixed 72 group outcomes), so this is the steady state.
      - not yet published: compute it fresh into new_dir (only ablation.json is
        kept in the bundle; the .tex fragments live under evaluation/outputs/).

    Returns the ablation dict present after the call, or None on a compute skip.
    """
    new_dir = Path(new_dir)
    latest_dir = Path(latest_dir)
    emit = writer if writer is not None else (lambda m: print(m))

    prior = latest_dir / ABLATION_JSON_FILENAME
    if prior.exists():
        shutil.copyfile(prior, new_dir / ABLATION_JSON_FILENAME)
        try:
            carried = json.loads((new_dir / ABLATION_JSON_FILENAME).read_text())
        except (ValueError, OSError):
            carried = None
        emit("    [cp-36] ablation.json already published; carried forward byte-identical")
        return carried

    # First-publish fallback (never hit once the PR commits latest/ablation.json).
    emit("    [cp-36] ablation.json absent from latest/; computing fresh")
    compute_ablation(
        output_dir=new_dir,
        generated_at_utc=generated_at_utc,
        matches_dir=matches_dir,
    )
    # Keep only ablation.json in the snapshot bundle; the LaTeX fragments are
    # repo-record deliverables under evaluation/outputs/, not snapshot artifacts.
    for tex_name in ("ablation_table.tex", "ablation_caption.tex"):
        tex_path = new_dir / tex_name
        if tex_path.exists():
            tex_path.unlink()
    try:
        return json.loads((new_dir / ABLATION_JSON_FILENAME).read_text())
    except (ValueError, OSError):
        return None


def _cli() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description=(
            "cp-36 templated R16 ablation report. Assembles a MetricsTable from "
            "the frozen reconstruction path and writes ablation.json + the LaTeX "
            "fragments via the tested compile_ablation."
        )
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="directory to write ablation.json + ablation_table.tex + ablation_caption.tex",
    )
    parser.add_argument(
        "--generated-at-utc",
        type=str,
        default="2026-07-16T00:00:00.000Z",
        help="fixed generated_at_utc stamp (millisecond precision, ...Z).",
    )
    parser.add_argument(
        "--matches-dir",
        type=Path,
        default=None,
        help="override the committed matches dir (defaults to latest/matches).",
    )
    args = parser.parse_args()
    crosscheck = compute_ablation(
        output_dir=args.output_dir,
        generated_at_utc=args.generated_at_utc,
        matches_dir=args.matches_dir,
    )
    print(json.dumps(crosscheck, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_cli())
