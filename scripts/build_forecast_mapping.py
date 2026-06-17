"""
scripts/build_forecast_mapping.py
=================================
cp-14, commit 1. Build the FD <-> M{NN} <-> batch-slot mapping, validate the
bijection over settled matches, and emit a reviewable audit table.

Two outputs:

  docs/cp-14/forecast_mapping.md      committed model-side bijection (all 72
                                      group matches), the PR review artifact.
  data/processed/forecast_mapping_audit.json
                                      runtime audit including the settled
                                      (FD-joined) rows when match_outcomes is
                                      reachable. Gitignored; regenerated per run.

Settled-outcome source resolution (first that is available):
  1. --outcomes-parquet PATH, else data/processed/match_outcomes.parquet
  2. live Postgres match_outcomes via DIRECT_URL / DATABASE_URL (read-only)
  3. none: the model-side audit is still emitted; the settled bijection is
     reported as "deferred to a secrets-enabled run".

The bijection is a HARD STOP. If any in-scope settled outcome fails to map,
this script exits non-zero (MappingError) so the operator sees the break
before any metric is computed. The forecast-logging step applies the same
check and falls back to forward-only on failure.

Usage
-----
  python scripts/build_forecast_mapping.py
  python scripts/build_forecast_mapping.py --outcomes-parquet data/processed/match_outcomes.parquet
  python scripts/build_forecast_mapping.py --reference-date 2026-06-16
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.forecast_mapping import (  # noqa: E402
    MappingError,
    build_model_map,
)
from evaluation.match_score_join import resolve_scored  # noqa: E402
from evaluation.reconstruct_forecasts import (  # noqa: E402
    build_ledger_rows,
    reconstruct_distributions,
)
from evaluation.aggregate_metrics import compute_champion_metrics  # noqa: E402

SETTLED_TABLE = PROJECT_ROOT / "data" / "processed" / "cp14_settled_table.md"

MATCH_OUTCOMES_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"
COMMITTED_AUDIT = PROJECT_ROOT / "docs" / "cp-14" / "forecast_mapping.md"
RUNTIME_AUDIT = PROJECT_ROOT / "data" / "processed" / "forecast_mapping_audit.json"
ACTIVE_BATCH = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"


def _emit(text: str) -> None:
    """Write the table to disk, print it, and append to the Actions job summary."""
    SETTLED_TABLE.parent.mkdir(parents=True, exist_ok=True)
    SETTLED_TABLE.write_text(text)
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as fh:
            fh.write(text + "\n")


def _write_settled_table(
    scored,
    ledger_rows,
    res: dict,
    prov: dict,
    code_sha: str,
    *,
    metrics: Optional[dict] = None,
    halted: Optional[str] = None,
) -> None:
    """Emit the reviewable settled-set table accounting for every settled row."""
    lines: list[str] = ["# cp-14 settled-set verification", ""]
    lines.append(f"- Champion batch: `{prov['active_batch_id']}` activated `{prov['activated_at_utc']}`")
    lines.append(f"- Settled source: `{res.get('source')}`")
    lines.append(f"- Code SHA: `{code_sha}`")
    lines.append("")

    if halted is not None:
        lines.append("## RESULT: HALTED (bijection failure)")
        lines.append("")
        lines.append(f"Named reason: `{halted}`")
        lines.append("")
        lines.append(
            "No ledger or metrics were produced. Resolve the flagged settled "
            "row(s) before this can merge."
        )
        _emit("\n".join(lines) + "\n")
        return

    if res["status"] == "no_source":
        lines.append("## RESULT: settled set NOT validated (no DB / no parquet)")
        lines.append("")
        lines.append(
            "Run this with database access to validate the FD-side bijection "
            "and emit the per-match table."
        )
        _emit("\n".join(lines) + "\n")
        return

    ledger_by_id = {r["match_id"]: r for r in (ledger_rows or [])}
    n_scored = len(scored) if scored is not None else 0
    deferred = res.get("deferred", [])
    collapsed = res.get("collapsed", [])

    lines.append("## Classification of every settled row")
    lines.append("")
    lines.append(f"- mapped + scored: **{n_scored}**")
    lines.append(f"- deferred (non-group, not scored): **{len(deferred)}** {deferred or ''}")
    lines.append(
        f"- collapsed (exact-identical duplicate): **{len(collapsed)}** "
        + (str(collapsed) if collapsed else "")
    )
    lines.append("- halted: **0** (any halt exits non-zero before this point)")
    lines.append("")

    if metrics is not None:
        lines.append(
            f"## Champion metrics (n={metrics['n']}): "
            f"Brier `{metrics['brier']}` · RPS `{metrics['rps']}` · "
            f"log-loss `{metrics['log_loss']}`"
        )
        lines.append("")
        lines.append("A small sample is suggestive, not a track record.")
        lines.append("")

    lines.append("## Per-match settled table")
    lines.append("")
    lines.append(
        "| FD id | M id | slot | teams | kickoff (UTC) | score | outcome | "
        "recon champion 1X2 (H/D/A) | Brier contrib |"
    )
    lines.append("|---|---|---|---|---|---|---|---|---|")
    if scored is not None:
        for _, row in scored.sort_values("match_id").iterrows():
            mid = str(row["match_id"])
            lr = ledger_by_id.get(mid, {})
            d = lr.get("outcome_predicted_distribution", {})
            recon = (
                f"{d.get('1', float('nan')):.3f}/{d.get('X', float('nan')):.3f}/{d.get('2', float('nan')):.3f}"
                if d
                else "-"
            )
            lines.append(
                f"| {row['fd_match_id']} | {mid} | {row['batch_slot']} | "
                f"{row['home_code']} v {row['away_code']} | {row['kickoff_utc']} | "
                f"{int(row['home_goals'])}-{int(row['away_goals'])} | "
                f"{lr.get('outcome_realized', '-')} | {recon} | "
                f"{lr.get('brier_contribution', '-')} |"
            )
    lines.append("")
    _emit("\n".join(lines) + "\n")


def _batch_provenance() -> dict[str, str]:
    active = json.loads(ACTIVE_BATCH.read_text())
    return {
        "active_batch_id": active.get("active_batch_id", ""),
        "active_batch_path": active.get("active_batch_path", ""),
        "activated_at_utc": active.get("activated_at_utc", ""),
    }


def _git_sha() -> str:
    head = PROJECT_ROOT / ".git" / "HEAD"
    try:
        ref = head.read_text().strip()
        if ref.startswith("ref:"):
            ref_path = PROJECT_ROOT / ".git" / ref.split(" ", 1)[1]
            return ref_path.read_text().strip()[:12]
        return ref[:12]
    except Exception:
        return "unknown"


def _write_committed_audit(
    model_map: pd.DataFrame,
    reference_date: Optional[str],
    prov: dict[str, str],
) -> None:
    COMMITTED_AUDIT.parent.mkdir(parents=True, exist_ok=True)
    ref = pd.to_datetime(reference_date, utc=True) if reference_date else None
    kickoffs = pd.to_datetime(model_map["kickoff_utc"], utc=True, errors="coerce")
    played_flags = (
        (kickoffs <= ref) if ref is not None else pd.Series([False] * len(model_map))
    )
    n_played = int(played_flags.sum())

    lines: list[str] = []
    lines.append("# cp-14 forecast mapping audit (model side)")
    lines.append("")
    lines.append(
        "Exact bijection between published match ids (M01..M72) and the frozen "
        "pre-tournament champion batch group slots. Built from committed, "
        "outcome-blind artifacts only."
    )
    lines.append("")
    lines.append(f"- Champion batch: `{prov['active_batch_id']}`")
    lines.append(f"- Batch activated (UTC): `{prov['activated_at_utc']}`")
    lines.append(f"- Batch path: `{prov['active_batch_path']}/match_runs_M2.parquet`")
    if reference_date:
        lines.append(f"- Reference date: `{reference_date}` (kicked off: {n_played} of 72)")
    lines.append("")
    lines.append(
        "The FD-side join (settled `match_outcomes` -> M{NN}) runs in the "
        "pipeline with database access; it asserts the same bijection over "
        "settled matches and halts on any break. Eyeball the kicked-off rows "
        "below for team identity and slot assignment."
    )
    lines.append("")
    header = "| M id | batch slot | home | away | kickoff (UTC) | kicked off |"
    lines.append(header)
    lines.append("|------|-----------|------|------|---------------|-----------|")
    for i, row in model_map.iterrows():
        flag = "yes" if bool(played_flags.iloc[i]) else "no"
        lines.append(
            f"| {row['match_id']} | {row['batch_slot']} | "
            f"{row['home_code']} ({row['home_name']}) | "
            f"{row['away_code']} ({row['away_name']}) | "
            f"{row['kickoff_utc']} | {flag} |"
        )
    lines.append("")
    COMMITTED_AUDIT.write_text("\n".join(lines) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--outcomes-parquet",
        type=Path,
        default=None,
        help="Path to a match_outcomes parquet snapshot. Defaults to the "
        "canonical path, then Postgres, then none.",
    )
    parser.add_argument(
        "--reference-date",
        type=str,
        default=None,
        help="UTC date (YYYY-MM-DD) used only to flag which fixtures have "
        "kicked off in the committed audit. Does not affect the bijection.",
    )
    args = parser.parse_args()

    prov = _batch_provenance()
    matches_src = PROJECT_ROOT / "website" / "public" / "data" / "latest" / "matches"
    print(f"[info] champion batch {prov['active_batch_id']} activated {prov['activated_at_utc']}")

    try:
        model_map = build_model_map()
    except MappingError as exc:
        print(f"[HALT] model-side mapping failed: {exc}")
        return 2
    print(f"[ok] model-side bijection: {len(model_map)} group matches mapped 1:1")

    _write_committed_audit(model_map, args.reference_date, prov)
    print(f"[ok] wrote committed audit -> {COMMITTED_AUDIT.relative_to(PROJECT_ROOT)}")

    # Settled-side: resolve through the bijection gate. mapping_error is a HARD
    # STOP (non-zero exit) so this verify run fails exactly as the regen would,
    # rather than reporting a partial table.
    res = resolve_scored(matches_dir=matches_src, parquet_path=args.outcomes_parquet)
    code_sha = _git_sha()
    audit: dict[str, Any] = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "code_sha": code_sha,
        "champion_batch": prov,
        "settled_source": res["source"],
        "model_side_matches": int(len(model_map)),
        "settled_status": res["status"],
    }

    if res["status"] == "mapping_error":
        print(f"[HALT] settled-set bijection FAILED: {res['error']}", file=sys.stderr)
        audit["error"] = res["error"]
        RUNTIME_AUDIT.parent.mkdir(parents=True, exist_ok=True)
        RUNTIME_AUDIT.write_text(json.dumps(audit, indent=2, default=str))
        _write_settled_table(None, None, res, prov, code_sha, halted=res["error"])
        return 3

    if res["status"] == "no_source":
        print(
            "[info] no settled-outcome source reachable "
            f"({res['source']}); FD-side table needs a secrets-enabled run."
        )
        audit["scored"] = []
        audit["deferred_outcomes"] = []
        _write_settled_table(None, None, res, prov, code_sha)
        RUNTIME_AUDIT.parent.mkdir(parents=True, exist_ok=True)
        RUNTIME_AUDIT.write_text(json.dumps(audit, indent=2, default=str))
        return 0

    # status == ok: reconstruct, score, and emit the full reviewable table.
    dists = reconstruct_distributions(res["model_map"])
    ledger_rows = build_ledger_rows(res["scored"], dists, code_sha)
    metrics = compute_champion_metrics(ledger_rows)
    audit["scored"] = res["scored"].to_dict("records")
    audit["deferred_outcomes"] = res["deferred"]
    audit["collapsed"] = res.get("collapsed", [])
    audit["champion_metrics"] = metrics
    print(
        f"[ok] settled bijection: {len(ledger_rows)} scored, "
        f"{len(res['deferred'])} deferred, {len(res.get('collapsed', []))} collapsed; "
        f"brier={metrics['brier']} rps={metrics['rps']} log_loss={metrics['log_loss']} n={metrics['n']}"
    )
    _write_settled_table(res["scored"], ledger_rows, res, prov, code_sha, metrics=metrics)
    RUNTIME_AUDIT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_AUDIT.write_text(json.dumps(audit, indent=2, default=str))
    print(f"[ok] wrote settled table -> {SETTLED_TABLE.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
