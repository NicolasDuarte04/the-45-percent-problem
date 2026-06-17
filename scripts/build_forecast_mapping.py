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
    map_settled,
)

MATCH_OUTCOMES_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"
COMMITTED_AUDIT = PROJECT_ROOT / "docs" / "cp-14" / "forecast_mapping.md"
RUNTIME_AUDIT = PROJECT_ROOT / "data" / "processed" / "forecast_mapping_audit.json"
ACTIVE_BATCH = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"


def _resolve_pg_url() -> Optional[str]:
    return (
        os.environ.get("DIRECT_URL")
        or os.environ.get("DATABASE_URL")
        or os.environ.get("POSTGRES_URL")
    )


def _load_outcomes(outcomes_parquet: Optional[Path]) -> tuple[Optional[pd.DataFrame], str]:
    """Return (outcomes_df, source_label). df is None when no source is reachable."""
    path = outcomes_parquet or MATCH_OUTCOMES_PARQUET
    if path and Path(path).exists():
        return pd.read_parquet(path), f"parquet:{path}"

    url = _resolve_pg_url()
    if url:
        try:
            import psycopg  # type: ignore

            with psycopg.connect(url) as conn:
                df = pd.read_sql(
                    "SELECT match_id, stage, home_team, away_team, "
                    "home_goals, away_goals, settled_at FROM match_outcomes",
                    conn,
                )
            return df, "postgres:match_outcomes"
        except Exception as exc:  # best-effort; absence is not fatal here
            print(f"[warn] Postgres read failed: {type(exc).__name__}: {exc}")

    return None, "none"


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
    print(f"[info] champion batch {prov['active_batch_id']} activated {prov['activated_at_utc']}")

    try:
        model_map = build_model_map()
    except MappingError as exc:
        print(f"[HALT] model-side mapping failed: {exc}")
        return 2
    print(f"[ok] model-side bijection: {len(model_map)} group matches mapped 1:1")

    _write_committed_audit(model_map, args.reference_date, prov)
    print(f"[ok] wrote committed audit -> {COMMITTED_AUDIT.relative_to(PROJECT_ROOT)}")

    outcomes, source = _load_outcomes(args.outcomes_parquet)
    audit: dict[str, Any] = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "code_sha": _git_sha(),
        "champion_batch": prov,
        "settled_source": source,
        "model_side_matches": int(len(model_map)),
    }

    if outcomes is None:
        print(
            "[info] no settled-outcome source reachable. FD-side bijection "
            "deferred to a secrets-enabled pipeline run."
        )
        audit["settled_status"] = "deferred_no_source"
        audit["scored"] = []
        audit["deferred_outcomes"] = []
    else:
        try:
            result = map_settled(model_map, outcomes)
        except MappingError as exc:
            print(f"[HALT] settled bijection failed (fall back to forward-only): {exc}")
            RUNTIME_AUDIT.parent.mkdir(parents=True, exist_ok=True)
            audit["settled_status"] = "mapping_error"
            audit["error"] = str(exc)
            RUNTIME_AUDIT.write_text(json.dumps(audit, indent=2))
            return 3
        scored = result["scored"]
        audit["settled_status"] = "ok"
        audit["scored"] = scored.to_dict("records")
        audit["deferred_outcomes"] = result["deferred"]
        print(
            f"[ok] settled bijection: {len(scored)} group matches scored, "
            f"{len(result['deferred'])} deferred (non-group)"
        )

    RUNTIME_AUDIT.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_AUDIT.write_text(json.dumps(audit, indent=2, default=str))
    print(f"[ok] wrote runtime audit -> {RUNTIME_AUDIT.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
