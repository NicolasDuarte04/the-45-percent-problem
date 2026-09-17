"""
evaluation/match_score_join.py
==============================
cp-14, commit 2 (Section 2 workstream 1). Join settled scores into the
published per-match files so a played match renders its real result instead of
appearing unplayed.

matches/*.json has carried the pre-tournament M0 forecast verbatim since
launch and has no score field at all, so every played match renders as
unplayed. This module adds three additive, display-only fields to a played
match file:

    "score":            {"home": int, "away": int}
    "outcome_realized": "H" | "D" | "A"   (regulation result)
    "settled_at_utc":   ISO-8601 string

Unplayed matches are left untouched (the fields stay absent; the website Zod
schema makes them optional). The join is idempotent: re-running rewrites the
same fields. The model probability block (p_model_1x2, lambda, ...) is never
modified; this is purely the realised-result overlay.

Inputs come from evaluation.forecast_mapping.map_settled, so every score
written here has already passed the bijection hard-stop: the M{NN} it lands on
is the fixture whose team identity matches the settled outcome.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def resolve_scored(
    matches_dir: Optional[Path] = None,
    batch_parquet: Optional[Path] = None,
    parquet_path: Optional[Path] = None,
) -> dict:
    """Load settled outcomes, map them onto the frozen champion fixtures, and
    return the validated scored frame (or a forward-only signal).

    Returns a dict:
        status:   "ok" | "no_source" | "mapping_error"
        source:   label of the settled-outcome source
        scored:   DataFrame of settled group matches (None unless status=="ok")
        deferred: list of non-group settled outcome ids
        error:    MappingError text (only when status=="mapping_error")

    On a mapping break the status is "mapping_error" and scored is None: the
    caller must fall back to forward-only and must NOT join or score anything.
    The bijection hard-stop is never swallowed; it is surfaced here so a single
    break disables scoring for the entire ledger, per the calibration-integrity
    rule.
    """
    from evaluation.forecast_mapping import MappingError, build_model_map, map_settled
    from evaluation.settled_source import load_settled_outcomes

    outcomes, source = load_settled_outcomes(parquet_path)
    if outcomes is None:
        return {"status": "no_source", "source": source, "scored": None, "deferred": []}

    kwargs = {}
    if matches_dir is not None:
        kwargs["matches_dir"] = matches_dir
    if batch_parquet is not None:
        kwargs["batch_parquet"] = batch_parquet
    try:
        model_map = build_model_map(**kwargs)
        result = map_settled(model_map, outcomes)
    except MappingError as exc:
        return {
            "status": "mapping_error",
            "source": source,
            "scored": None,
            "model_map": None,
            "deferred": [],
            "error": str(exc),
        }
    return {
        "status": "ok",
        "source": source,
        "scored": result["scored"],
        "model_map": model_map,
        "deferred": result["deferred"],
        "collapsed": result.get("collapsed", []),
    }


def halt_if_mapping_error(score_res: dict, *, writer=None) -> None:
    """Armed gate. HARD STOP on a settled-set bijection failure.

    Call this immediately after resolve_scored and BEFORE writing any artifact.
    On status "mapping_error" it prints the named reason and raises SystemExit(2)
    so the whole regen run fails and nothing is published (the workflow's commit
    step is gated on a clean regen). For "ok" and "no_source" it returns
    normally: a missing settled source is a clean skip, not a failure. The two
    cases are deliberately distinct, never collapsed into one catch.
    """
    import sys

    emit = writer if writer is not None else (lambda m: print(m, file=sys.stderr))
    if score_res.get("status") == "mapping_error":
        emit(
            "    [cp-14][HALT] settled-set bijection FAILED; refusing to publish. "
            f"reason: {score_res.get('error')}"
        )
        raise SystemExit(2)


def regulation_outcome(home_goals: int, away_goals: int) -> str:
    """Map a regulation scoreline to H / D / A. Group-stage matches can draw."""
    if home_goals > away_goals:
        return "H"
    if home_goals < away_goals:
        return "A"
    return "D"


def join_scores(matches_dir: Path, scored: pd.DataFrame) -> int:
    """Write settled-score fields into the per-match files under matches_dir.

    `scored` is the `scored` frame from forecast_mapping.map_settled: one row
    per settled match with columns match_id (M{NN}), home_goals, away_goals,
    and settled_at. Returns the number of match files updated.
    """
    matches_dir = Path(matches_dir)
    if scored is None or scored.empty:
        return 0

    updated = 0
    for _, row in scored.iterrows():
        match_id = str(row["match_id"])
        path = matches_dir / f"{match_id}.json"
        if not path.exists():
            # Should not happen: the bijection guarantees a published fixture.
            print(f"    [warn] score join: no match file for {match_id}; skipping")
            continue
        doc = json.loads(path.read_text())
        home_goals = int(row["home_goals"])
        away_goals = int(row["away_goals"])
        doc["score"] = {"home": home_goals, "away": away_goals}
        doc["outcome_realized"] = regulation_outcome(home_goals, away_goals)
        settled_at = row.get("settled_at")
        doc["settled_at_utc"] = None if pd.isna(settled_at) else str(settled_at)
        path.write_text(json.dumps(doc, indent=2) + "\n")
        updated += 1
    return updated
