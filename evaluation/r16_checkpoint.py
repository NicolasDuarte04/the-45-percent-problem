"""
evaluation/r16_checkpoint.py
=============================
cp-25b. The R16 pre-registered kill-criterion checkpoint.

Background
----------
The pre-registered kill criterion (evaluation/accuracy_metrics.check_kill_criterion,
threshold in evaluation/pre_reg_constants.yaml::kill_criterion.threshold_standard_errors)
was already evaluated once, pre-tournament, on cross-validation hold-out data (the
Phase 8 sanity gate; see website/src/app/(editorial)/vault/kill-criteria/page.mdx).
This module evaluates the SAME criterion a second time, on live tournament data,
at the moment the Round of 16 settles. This is a distinct event with its own
construction: a paired per-match log-loss comparison over the 72 pre-registered
group-stage forecasts, rescored once real outcomes are known, computed once the
settled R16 row count reaches 8. It must never be presented as a continuation of,
or a numeric comparison against, the pre-tournament 1.75 SE / 6.22 SE readings.

No knockout forecast enters this statistic. There is no frozen knockout
per-match forecast to score (see osf/amendments/ for the note documenting this
scope choice); the checkpoint statistic is entirely the 72 pre-registered
group-stage forecasts, scored once R16 settlement reaches the gate.

What this module composes (nothing here is reimplemented):
  - evaluation.forecast_mapping.build_model_map / evaluation.match_score_join.
    resolve_scored / halt_if_mapping_error: the same settled-outcome mapping and
    bijection hard-stop the graded ledger uses. On a mapping error this module
    halts and never publishes, exactly like the ledger producer.
  - evaluation.reconstruct_forecasts.reconstruct_distributions: aggregates the
    frozen batch's committed Monte Carlo samples into a per-match 1X2
    distribution. Called twice: once for M_STAR (default source, the frozen M2
    parquet) and once for M0 (batch_parquet=FROZEN_BATCH_PATH /
    "match_runs_M0.parquet"), so both models pass through the identical
    aggregation path.
  - evaluation.accuracy_metrics.log_loss / check_kill_criterion: the same
    scoring function and the same kill-criterion check the pre-tournament gate
    used. The M_STAR side is recomputed from the distributions here (never read
    from stored ledger contributions) so both models are scored through one
    identical path.

Trigger (decision 4): fires (writes/publishes) once the count of settled rows
with stage == "r16" reaches 8 AND no checkpoint artifact exists yet. Otherwise a
clean no-op. A manual override (--force-republish) bypasses BOTH the settled-
count gate and the already-published guard, for an explicit, deliberate
re-publish; ordinary re-runs after publication are a no-op regardless of the
settled count changing further, unless --force-republish is passed.

Dry-run mode (--dry-run) computes and prints to stdout; it writes nothing and
bypasses the trigger gate, for verification before R16 has actually settled 8
matches. It never mutates any file.

Nothing in this module touches the frozen batch, evaluation/accuracy_metrics.py,
evaluation/pre_reg_constants.yaml, config.yaml, the cp-14 bijection guard, or the
matches_live/ live-knockout surface. The graded ledger (website/public/data/
latest/ledger.jsonl) is never read or written by this module.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.accuracy_metrics import check_kill_criterion, log_loss  # noqa: E402
from evaluation.forecast_mapping import GROUP_STAGE  # noqa: E402
from evaluation.match_score_join import halt_if_mapping_error, resolve_scored  # noqa: E402
from evaluation.reconstruct_forecasts import reconstruct_distributions  # noqa: E402
from evaluation.settled_source import load_settled_outcomes  # noqa: E402
from frozen_batch import FROZEN_BATCH_ID, FROZEN_BATCH_PATH  # noqa: E402

WEBSITE_DATA_ROOT = PROJECT_ROOT / "website" / "public" / "data"
LATEST_DIR = WEBSITE_DATA_ROOT / "latest"
SNAPSHOTS_DIR = WEBSITE_DATA_ROOT / "snapshots"

R16_CHECKPOINT_FILENAME = "r16_checkpoint.json"
EVALUATION_METRICS_FILENAME = "evaluation_metrics.json"

# Trigger gate (decision 4): fires once this many settled R16 rows exist.
R16_SETTLED_TRIGGER_COUNT = 8

# stage label for Round of 16 rows in the settled-outcome stream. Matches the
# lowercase convention in ingestion/fetch_match_outcomes.py::STAGE_MAP
# ("ROUND_OF_16" -> "r16"), the same convention forecast_mapping.GROUP_STAGE
# ("group") uses.
R16_STAGE_LABEL = "r16"

FORECAST_SET_DESCRIPTION = "the 72 pre-registered group-stage forecasts"

CONSTRUCTION_NOTE = (
    "This checkpoint is a paired per-match standard error computed over the "
    "72 pre-registered group-stage forecasts, rescored once real outcomes are "
    "known, at the moment the Round of 16 settlement gate is reached. It is a "
    "different construction from the pre-tournament cross-validation readings "
    "published for the Phase 8 sanity gate (the 1.75 standard error paired "
    "difference reading and the 6.22 standard error marginal reading in "
    "champion_model.json). Those readings were computed on cross-validation "
    "hold-out data before the tournament began; this checkpoint is computed on "
    "live tournament outcomes. The two are not numerically comparable and this "
    "checkpoint must never be presented as a continuation of either."
)


def _code_sha() -> str:
    """Return the current git HEAD SHA (short form), mirroring the convention
    in scripts/regenerate_snapshot_from_batch.py::_code_sha (there truncated
    to 16 hex chars; this checkpoint uses git's own --short form)."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except Exception:
        return "unknown"


def _now_utc_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def count_settled_r16(matches_src: Optional[Path] = None) -> tuple[int, str]:
    """Return (settled_r16_count, settled_source_label).

    Reads the same settled-outcome stream the graded ledger uses
    (evaluation.settled_source.load_settled_outcomes) and counts rows whose
    stage equals R16_STAGE_LABEL. Returns (0, source_label) when no settled
    source is reachable; the source label is still returned so a caller can
    log why the count is zero (mirrors the "no_source" status the ledger
    producer already surfaces).
    """
    rows, source = load_settled_outcomes()
    if rows is None:
        return 0, source
    stage_series = rows["stage"].astype(str).str.lower()
    n_r16 = int((stage_series == R16_STAGE_LABEL).sum())
    return n_r16, source


def compute_checkpoint(matches_src: Optional[Path] = None) -> Optional[dict[str, Any]]:
    """Compute the R16 checkpoint payload from currently-settled data.

    Returns None if no settled source is reachable at all (a clean, safe
    no-op: this must be safe to run every night before any data exists) or if
    there are zero scored group-stage matches to evaluate (the kill-criterion
    SE computation is undefined for n < 2).

    On a mapping error, calls halt_if_mapping_error, which raises SystemExit(2)
    before anything is returned or published -- exactly the same hard stop the
    graded ledger producer uses. This function never publishes; it only
    computes. The caller decides whether the trigger gate permits writing.
    """
    kwargs = {}
    if matches_src is not None:
        kwargs["matches_dir"] = matches_src
    score_res = resolve_scored(**kwargs)

    halt_if_mapping_error(score_res)  # SystemExit(2) before anything is computed/published

    if score_res["status"] == "no_source":
        print(
            f"    [cp-25b] no settled source reachable (source: {score_res['source']}); "
            "R16 checkpoint cannot be computed yet"
        )
        return None

    scored = score_res["scored"]
    if scored is None or scored.empty:
        print("    [cp-25b] no settled group-stage matches yet; R16 checkpoint cannot be computed")
        return None

    model_map = score_res.get("model_map")

    # dists_mstar defaults to the frozen M2 parquet (M_STAR); dists_m0 reads the
    # sibling M0 parquet in the same frozen batch directory. Neither re-runs the
    # model; both are pure aggregations of already-committed Monte Carlo samples.
    dists_mstar = reconstruct_distributions(model_map)
    dists_m0 = reconstruct_distributions(
        model_map, batch_parquet=FROZEN_BATCH_PATH / "match_runs_M0.parquet"
    )

    mstar_by_id = {r["match_id"]: r for _, r in dists_mstar.iterrows()}
    m0_by_id = {r["match_id"]: r for _, r in dists_m0.iterrows()}

    ll_mstar_list: list[float] = []
    ll_m0_list: list[float] = []
    match_ids: list[str] = []
    for _, sc in scored.sort_values("match_id").iterrows():
        match_id = str(sc["match_id"])
        dm = mstar_by_id.get(match_id)
        d0 = m0_by_id.get(match_id)
        if dm is None or d0 is None:
            # Should not happen: build_model_map guarantees a 72-slot bijection
            # and both parquets share the same frozen batch's group slots.
            continue
        home_goals = int(sc["home_goals"])
        away_goals = int(sc["away_goals"])
        if home_goals > away_goals:
            idx = 0
        elif home_goals < away_goals:
            idx = 2
        else:
            idx = 1
        y = np.zeros((1, 3), dtype=float)
        y[0, idx] = 1.0

        p_mstar = np.array([[dm["p_home"], dm["p_draw"], dm["p_away"]]], dtype=float)
        p_m0 = np.array([[d0["p_home"], d0["p_draw"], d0["p_away"]]], dtype=float)

        ll_mstar_list.append(float(log_loss(p_mstar, y)[0]))
        ll_m0_list.append(float(log_loss(p_m0, y)[0]))
        match_ids.append(match_id)

    n = len(match_ids)
    if n < 2:
        # check_kill_criterion's SE (ddof=1) is undefined for n < 2. A single
        # settled group match is not enough to evaluate the gap; report a
        # clean skip rather than crash on a degenerate sample.
        print(
            f"    [cp-25b] only {n} scored group match(es) available; "
            "need at least 2 to compute a standard error. R16 checkpoint not computed"
        )
        return None

    ll_mstar = np.array(ll_mstar_list, dtype=float)
    ll_m0 = np.array(ll_m0_list, dtype=float)

    d = ll_mstar - ll_m0
    mean_diff = float(d.mean())
    se = float(d.std(ddof=1) / np.sqrt(n))
    tripped, detail = check_kill_criterion(ll_mstar, ll_m0)

    from evaluation.accuracy_metrics import _CONST  # local import: internal constant table

    threshold_se = float(_CONST["kill_criterion"]["threshold_standard_errors"])
    gap_in_se = (mean_diff / se) if se > 0 else float("nan")

    n_r16_settled, r16_source = count_settled_r16()

    payload: dict[str, Any] = {
        "forecast_set": FORECAST_SET_DESCRIPTION,
        "n": n,
        "mean_log_loss_m_star": round(float(ll_mstar.mean()), 6),
        "mean_log_loss_m0": round(float(ll_m0.mean()), 6),
        "mean_diff": round(mean_diff, 6),
        "se": round(se, 6),
        "gap_in_se": round(gap_in_se, 6) if gap_in_se == gap_in_se else None,  # NaN guard
        "threshold_se": threshold_se,
        "tripped": tripped,
        "kill_criterion_detail": detail,
        "source_batch_id": FROZEN_BATCH_ID,
        "evaluated_at_utc": _now_utc_iso(),
        "code_sha": _code_sha(),
        "settled_source": score_res.get("source"),
        "r16_settled_count": n_r16_settled,
        "r16_settled_source": r16_source,
        "r16_trigger_count": R16_SETTLED_TRIGGER_COUNT,
        "construction_note": CONSTRUCTION_NOTE,
    }
    return payload


def _write_json(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=2) + "\n")


def publish_checkpoint(payload: dict[str, Any]) -> None:
    """Write r16_checkpoint.json into latest/ and a timestamped snapshot dir,
    and add the sibling r16_checkpoint field onto evaluation_metrics.json
    (beside kill_criteria_check, never inside it). Never touches
    kill_criteria_check itself.
    """
    # latest/
    _write_json(LATEST_DIR / R16_CHECKPOINT_FILENAME, payload)

    em_path = LATEST_DIR / EVALUATION_METRICS_FILENAME
    em = json.loads(em_path.read_text())
    em["r16_checkpoint"] = payload
    em_path.write_text(json.dumps(em, indent=2) + "\n")

    # Timestamped snapshot dir, mirroring the convention in
    # scripts/regenerate_snapshot_from_batch.py (SNAPSHOTS_DIR / "%Y-%m-%dT%H:%MZ").
    # This checkpoint writes into the MOST RECENT existing snapshot dir if one
    # was created by the same nightly run; otherwise it creates its own,
    # timestamped at publish time, so the artifact is never lost even if no
    # other snapshot dir exists yet.
    snapshot_id = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    snapshot_dir = SNAPSHOTS_DIR / snapshot_id
    _write_json(snapshot_dir / R16_CHECKPOINT_FILENAME, payload)
    # Mirror the sibling field into the snapshot's evaluation_metrics.json too,
    # if that snapshot dir already has one (carried forward by the regen).
    snap_em_path = snapshot_dir / EVALUATION_METRICS_FILENAME
    if snap_em_path.exists():
        snap_em = json.loads(snap_em_path.read_text())
        snap_em["r16_checkpoint"] = payload
        snap_em_path.write_text(json.dumps(snap_em, indent=2) + "\n")


def already_published() -> bool:
    return (LATEST_DIR / R16_CHECKPOINT_FILENAME).exists()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute and print the checkpoint to stdout. Writes nothing. "
             "Bypasses the trigger gate for verification purposes only.",
    )
    parser.add_argument(
        "--force-republish",
        action="store_true",
        help="Bypass both the settled-count gate and the already-published "
             "no-op guard, and publish (or overwrite) the checkpoint artifact "
             "unconditionally. Use only for a deliberate, explicit re-publish.",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("evaluation/r16_checkpoint.py (cp-25b)")
    print("=" * 60)

    if args.dry_run:
        payload = compute_checkpoint()
        if payload is None:
            print("[dry-run] no checkpoint could be computed on current data (clean no-op).")
            return 0
        print("[dry-run] computed checkpoint (nothing written):")
        print(json.dumps(payload, indent=2))
        return 0

    if already_published() and not args.force_republish:
        print(
            f"    [cp-25b] {R16_CHECKPOINT_FILENAME} already exists in latest/; "
            "no-op (pass --force-republish to override)."
        )
        return 0

    n_r16_settled, r16_source = count_settled_r16()
    if not args.force_republish and n_r16_settled < R16_SETTLED_TRIGGER_COUNT:
        print(
            f"    [cp-25b] settled R16 rows = {n_r16_settled} "
            f"(source: {r16_source}), below trigger threshold "
            f"{R16_SETTLED_TRIGGER_COUNT}; no-op."
        )
        return 0

    payload = compute_checkpoint()
    if payload is None:
        print("    [cp-25b] trigger condition met but no checkpoint could be computed "
              "(no scored group matches available); no-op, nothing published.")
        return 0

    publish_checkpoint(payload)
    print(
        f"    [cp-25b] published {R16_CHECKPOINT_FILENAME}: n={payload['n']} "
        f"gap_in_se={payload['gap_in_se']} tripped={payload['tripped']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
