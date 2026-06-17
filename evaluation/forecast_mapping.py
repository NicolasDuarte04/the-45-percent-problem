"""
evaluation/forecast_mapping.py
==============================
cp-14, commit 1. The tri-partite identity mapping that protects the
calibration claim.

Three id spaces have to be reconciled before any forecast can be scored:

  1. Batch slot id    "G-A-1" .. "G-L-6"   (outputs/phase5/batches/.../match_runs_M2.parquet)
  2. Published match   "M01" .. "M72"       (website/public/data/latest/matches/*.json)
  3. Settled outcome   "FD{source_id}"      (Postgres match_outcomes / its parquet snapshot)

The champion model (M2) produced a full pre-tournament forecast for all 72
group matches in the frozen, committed batch batch_20260512_013228Z
(activated 2026-05-12, before the first kickoff). cp-14 scores that frozen
opening forecast against each result as it settles. A single mis-mapped
forecast would be scored against the wrong outcome and corrupt the published
Brier invisibly, so the mapping is validated as an exact bijection and any
failure is a HARD STOP (MappingError), never a best-effort skip.

Scope: group stage only. The OSF deviation claim is narrow (frozen
pre-tournament champion calibration against group-stage results). Knockout
slots carry different teams per Monte Carlo run and cannot be statically
mapped to fixtures until the teams are known; settled knockout outcomes are
returned as "deferred", not scored.

This module is pure data reconciliation. It does not read odds, compute
metrics, or write to any append-only log.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# The batch parquet stores team display names ("Mexico", "South Korea").
# DISPLAY_NAME_TO_FIFA is the canonical display-name -> FIFA-code table the
# outcome ingester already uses, so both ends of the join share one source of
# truth for team identity.
from ingestion.fetch_match_outcomes import DISPLAY_NAME_TO_FIFA  # noqa: E402

GROUP_PHASE = "group"
GROUP_STAGE = "group"
N_GROUP_MATCHES = 72

DEFAULT_MATCHES_DIR = (
    PROJECT_ROOT / "website" / "public" / "data" / "latest" / "matches"
)


class MappingError(RuntimeError):
    """The id mapping is not an exact bijection.

    This is a hard stop. A caller that scores forecasts must catch it and fall
    back to forward-only logging for the entire ledger rather than score a
    possibly mis-mapped forecast. It must never be swallowed silently.
    """


def _fifa_from_display(name: str) -> Optional[str]:
    """Map a batch display name to its FIFA 3-letter code, or None if unknown."""
    return DISPLAY_NAME_TO_FIFA.get(name)


def build_model_map(
    matches_dir: Path = DEFAULT_MATCHES_DIR,
    batch_parquet: Optional[Path] = None,
) -> pd.DataFrame:
    """Build the model-side bijection: published M{NN} <-> batch group slot.

    Both inputs are committed, frozen, pre-tournament artifacts, so this map is
    deterministic and outcome-blind. Returns a 72-row frame with columns:
        match_id, batch_slot, home_code, away_code, home_name, away_name,
        kickoff_utc
    keyed by the ordered (home_code, away_code) team pair.

    Raises MappingError if the result is not an exact 72 <-> 72 bijection with
    consistent home/away orientation and every batch team name resolvable.
    """
    matches_dir = Path(matches_dir)

    # Side A: published per-match files (group stage only).
    rows: list[dict[str, Any]] = []
    for path in sorted(matches_dir.glob("M*.json")):
        doc = json.loads(path.read_text())
        if doc.get("round") != "GRP":
            continue
        rows.append(
            {
                "match_id": doc["match_id"],
                "home_code": doc["home"]["fifa_code"],
                "away_code": doc["away"]["fifa_code"],
                "home_name": doc["home"]["display_name"],
                "away_name": doc["away"]["display_name"],
                "kickoff_utc": doc["kickoff_utc"],
            }
        )
    published = pd.DataFrame(rows)
    if len(published) != N_GROUP_MATCHES:
        raise MappingError(
            f"expected {N_GROUP_MATCHES} published group matches, "
            f"found {len(published)} in {matches_dir}"
        )

    # Side B: batch group slots (one fixed team pairing each in group stage).
    if batch_parquet is None:
        batch_parquet = _active_batch_match_runs()
    batch = pd.read_parquet(
        batch_parquet, columns=["match_id", "phase", "team_home", "team_away"]
    )
    batch = batch[batch["phase"] == GROUP_PHASE]
    slots = batch[["match_id", "team_home", "team_away"]].drop_duplicates()

    multi = slots.groupby("match_id").size()
    offenders = sorted(multi[multi > 1].index.tolist())
    if offenders:
        raise MappingError(
            f"batch group slots with more than one team pairing: {offenders}"
        )
    if slots["match_id"].nunique() != N_GROUP_MATCHES:
        raise MappingError(
            f"expected {N_GROUP_MATCHES} batch group slots, "
            f"found {slots['match_id'].nunique()} in {batch_parquet}"
        )

    slots = slots.rename(columns={"match_id": "batch_slot"})
    slots["home_code"] = slots["team_home"].map(_fifa_from_display)
    slots["away_code"] = slots["team_away"].map(_fifa_from_display)
    unresolved = sorted(
        set(slots.loc[slots["home_code"].isna(), "team_home"])
        | set(slots.loc[slots["away_code"].isna(), "team_away"])
    )
    if unresolved:
        raise MappingError(
            f"batch team names absent from DISPLAY_NAME_TO_FIFA: {unresolved}"
        )

    # Join on the ordered (home, away) FIFA-code pair. Orientation matters: a
    # swapped home/away would not match and would surface as an unmapped row.
    published["_key"] = published["home_code"] + ">" + published["away_code"]
    slots["_key"] = slots["home_code"] + ">" + slots["away_code"]

    merged = published.merge(
        slots[["batch_slot", "_key"]],
        on="_key",
        how="outer",
        indicator=True,
    )
    left_only = merged.loc[merged["_merge"] == "left_only", "match_id"].tolist()
    right_only = merged.loc[merged["_merge"] == "right_only", "batch_slot"].tolist()
    if left_only or right_only:
        raise MappingError(
            "model-side mapping is not a bijection. "
            f"published matches with no batch slot: {left_only}; "
            f"batch slots with no published match: {right_only}"
        )

    out = (
        merged[merged["_merge"] == "both"]
        .drop(columns=["_key", "_merge"])
        .sort_values("match_id")
        .reset_index(drop=True)
    )
    if out["match_id"].nunique() != N_GROUP_MATCHES or out["batch_slot"].nunique() != N_GROUP_MATCHES:
        raise MappingError(
            "model-side mapping collapsed (duplicate keys). "
            f"unique M={out['match_id'].nunique()} unique slots={out['batch_slot'].nunique()}"
        )
    return out


def _active_batch_match_runs() -> Path:
    """Resolve the active batch's M2 match-runs parquet from active_batch.json."""
    active = json.loads(
        (PROJECT_ROOT / "data" / "calibration" / "active_batch.json").read_text()
    )
    return PROJECT_ROOT / active["active_batch_path"] / "match_runs_M2.parquet"


def normalise_outcomes(rows: Any) -> pd.DataFrame:
    """Coerce settled-outcome input into a canonical frame.

    Accepts a DataFrame or an iterable of dicts using either the Postgres /
    parquet snake_case columns (match_id, home_team, away_team, home_goals,
    away_goals, settled_at, stage) or the ingest camelCase keys (matchId,
    homeTeam, awayTeam, homeGoals, awayGoals, settledAt, stage). Returns columns:
        match_id, home_code, away_code, home_goals, away_goals, settled_at, stage
    """
    df = rows.copy() if isinstance(rows, pd.DataFrame) else pd.DataFrame(list(rows))
    if df.empty:
        return pd.DataFrame(
            columns=[
                "match_id",
                "home_code",
                "away_code",
                "home_goals",
                "away_goals",
                "settled_at",
                "stage",
            ]
        )
    alias = {
        "matchId": "match_id",
        "homeTeam": "home_code",
        "home_team": "home_code",
        "awayTeam": "away_code",
        "away_team": "away_code",
        "homeGoals": "home_goals",
        "awayGoals": "away_goals",
        "settledAt": "settled_at",
    }
    df = df.rename(columns=alias)
    required = ["match_id", "home_code", "away_code", "home_goals", "away_goals", "stage"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise MappingError(f"settled outcomes missing required columns: {missing}")
    if "settled_at" not in df.columns:
        df["settled_at"] = None
    return df[
        ["match_id", "home_code", "away_code", "home_goals", "away_goals", "settled_at", "stage"]
    ]


def map_settled(
    model_map: pd.DataFrame,
    outcomes: Any,
    *,
    stage_scope: str = GROUP_STAGE,
) -> dict[str, Any]:
    """Map settled outcomes onto the model map and validate the bijection.

    Returns a dict:
        {
          "scored":   DataFrame of in-scope settled matches joined to M{NN}
                      and the batch slot (one row per settled group match),
          "deferred": list of settled-outcome match_ids out of stage scope
                      (e.g. knockout), not scored,
        }

    Raises MappingError (HARD STOP) if any in-scope settled outcome fails to
    map exactly: unknown team pair, swapped orientation, no matching fixture,
    or two outcomes colliding on one fixture (the classic phantom/duplicate
    prod row). The caller must catch this and fall back to forward-only.
    """
    out = normalise_outcomes(outcomes)
    deferred = sorted(out.loc[out["stage"] != stage_scope, "match_id"].tolist())
    scoped = out[out["stage"] == stage_scope].copy()
    if scoped.empty:
        return {"scored": _empty_scored(), "deferred": deferred}

    scoped["_key"] = scoped["home_code"] + ">" + scoped["away_code"]
    lookup = model_map.assign(_key=model_map["home_code"] + ">" + model_map["away_code"])

    # 1. Every in-scope settled outcome must resolve to a known fixture pair.
    known = set(lookup["_key"])
    unmapped = scoped.loc[~scoped["_key"].isin(known)]
    if not unmapped.empty:
        detail = unmapped[["match_id", "home_code", "away_code"]].to_dict("records")
        raise MappingError(
            "settled outcomes that map to no group fixture (identity or "
            f"orientation failure): {detail}"
        )

    # 2. No two settled outcomes may collide on one fixture.
    collisions = (
        scoped.groupby("_key")["match_id"].apply(list).loc[lambda s: s.str.len() > 1]
    )
    if len(collisions):
        raise MappingError(
            "multiple settled outcomes collide on one fixture (phantom or "
            f"duplicate row): {collisions.to_dict()}"
        )

    joined = scoped.merge(
        lookup[["_key", "match_id", "batch_slot", "kickoff_utc", "home_name", "away_name"]],
        on="_key",
        suffixes=("_fd", ""),
    )

    # 2b. If a settled row carries a canonical M{NN} id (admin entries do), that
    #     id must agree with the fixture its team pair resolves to. A
    #     disagreement means the stored id and the stored teams are inconsistent
    #     (a remap or data-entry error). Halt rather than trust one over the other.
    canonical = set(model_map["match_id"])
    src_is_canonical = joined["match_id_fd"].isin(canonical)
    id_mismatch = joined[src_is_canonical & (joined["match_id_fd"] != joined["match_id"])]
    if not id_mismatch.empty:
        detail = id_mismatch[
            ["match_id_fd", "match_id", "home_code", "away_code"]
        ].to_dict("records")
        raise MappingError(
            "settled row carries a canonical id that disagrees with its team "
            f"identity: {detail}"
        )

    # 3. Kickoff-date agreement: a settled outcome's settle timestamp must fall
    #    on or after its fixture's kickoff date. Settle time is typically ~2h
    #    after kickoff; a settle that predates the kickoff date is a mis-map.
    joined["_kickoff_date"] = pd.to_datetime(
        joined["kickoff_utc"], utc=True, errors="coerce"
    ).dt.date
    settled_dt = pd.to_datetime(joined["settled_at"], utc=True, errors="coerce")
    joined["_settled_date"] = settled_dt.dt.date
    has_settle = joined["_settled_date"].notna()
    bad_date = joined[has_settle & (joined["_settled_date"] < joined["_kickoff_date"])]
    if not bad_date.empty:
        detail = bad_date[["match_id", "match_id_fd", "kickoff_utc", "settled_at"]].to_dict(
            "records"
        )
        raise MappingError(
            f"settled outcome predates its fixture kickoff date (mis-map): {detail}"
        )

    scored = (
        joined.rename(columns={"match_id_fd": "fd_match_id"})[
            [
                "match_id",
                "batch_slot",
                "fd_match_id",
                "home_code",
                "away_code",
                "home_goals",
                "away_goals",
                "kickoff_utc",
                "settled_at",
            ]
        ]
        .sort_values("match_id")
        .reset_index(drop=True)
    )
    return {"scored": scored, "deferred": deferred}


def _empty_scored() -> pd.DataFrame:
    return pd.DataFrame(
        columns=[
            "match_id",
            "batch_slot",
            "fd_match_id",
            "home_code",
            "away_code",
            "home_goals",
            "away_goals",
            "kickoff_utc",
            "settled_at",
        ]
    )
