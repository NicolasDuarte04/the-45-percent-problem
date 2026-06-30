"""
evaluation/settled_source.py
============================
cp-14. One reader for the full settled-outcome rows that the score join and
the forecast scorer both need.

simulation/load_settled.py (cp-10) reads only match_id / home_goals /
away_goals / stage because the Monte Carlo conditioning keys on the canonical
match_id directly. cp-14 maps settled outcomes by TEAM IDENTITY (because the
match_outcomes table can hold both admin M{NN} rows and cron FD{id} rows), so
it also needs home_team / away_team / settled_at. This loader returns those.

Source precedence mirrors the regen settled-count path:
  1. parquet snapshot at data/processed/match_outcomes.parquet (or override)
  2. live Postgres match_outcomes via DIRECT_URL / DATABASE_URL (read-only)
  3. None when neither is reachable (caller treats this as "no settled data")

This module never writes anything and never raises on a missing source; an
absent source is a normal pre-tournament / offline-CI state.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

DEFAULT_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"

# cp-22 adds the penalty-shootout columns. shootout_winner is a real DB column;
# shootout_home / shootout_away are derived from the match_outcomes.meta jsonb
# (meta.shootout = {home, away}) so no schema migration is needed. These are
# additive and read-only for the knockout card path; the graded scorer selects
# its own column subset (see evaluation/forecast_mapping.normalise_outcomes), so
# the extra columns are inert to the ledger.
_COLUMNS = [
    "match_id",
    "stage",
    "home_team",
    "away_team",
    "home_goals",
    "away_goals",
    "settled_at",
    "shootout_winner",
    "shootout_home",
    "shootout_away",
]


def _resolve_pg_url() -> Optional[str]:
    return (
        os.environ.get("DIRECT_URL")
        or os.environ.get("DATABASE_URL")
        or os.environ.get("POSTGRES_URL")
    )


def load_settled_outcomes(parquet_path: Optional[Path] = None) -> tuple[Optional[pd.DataFrame], str]:
    """Return (rows, source_label). rows is None when no source is reachable.

    Rows carry the canonical snake_case columns the mapping expects:
    match_id, stage, home_team, away_team, home_goals, away_goals, settled_at.
    """
    override = os.environ.get("MATCH_OUTCOMES_PARQUET")
    path = parquet_path or (Path(override) if override else DEFAULT_PARQUET)
    if path and Path(path).exists():
        df = pd.read_parquet(path)
        return _coerce(_extract_shootout(df)), f"parquet:{path}"

    url = _resolve_pg_url()
    if url:
        conn = None
        try:
            try:
                import psycopg  # type: ignore
                conn = psycopg.connect(url)
            except ImportError:
                import psycopg2  # type: ignore
                conn = psycopg2.connect(url)
            df = pd.read_sql(
                "SELECT match_id, stage, home_team, away_team, "
                "home_goals, away_goals, settled_at, shootout_winner, meta "
                "FROM match_outcomes",
                conn,
            )
            return _coerce(_extract_shootout(df)), "postgres:match_outcomes"
        except Exception as exc:  # best-effort; absence is not fatal
            print(f"    [warn] settled-outcomes postgres read failed: {exc}")
            return None, "postgres:error"
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

    return None, "none"


def _coerce(df: pd.DataFrame) -> pd.DataFrame:
    """Best-effort column normalisation for parquet snapshots that may use
    slightly different names. Missing optional columns are filled with None."""
    alias = {
        "matchId": "match_id",
        "homeTeam": "home_team",
        "awayTeam": "away_team",
        "homeGoals": "home_goals",
        "awayGoals": "away_goals",
        "settledAt": "settled_at",
    }
    df = df.rename(columns=alias)
    for col in _COLUMNS:
        if col not in df.columns:
            df[col] = None
    return df[_COLUMNS].copy()


def _shootout_from_meta(meta: object) -> Optional[tuple[int, int]]:
    """Pull (shootout_home, shootout_away) out of a match_outcomes.meta value.

    cp-22 stores the penalty tally under meta.shootout = {home, away}. The DB
    returns jsonb as a dict (psycopg / psycopg2 both decode it by default); a
    parquet snapshot may carry it as a JSON string or not at all. Returns None
    for any row without a well-formed shootout block (every group match, and any
    knockout that did not go to penalties)."""
    if meta is None:
        return None
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except (ValueError, TypeError):
            return None
    if not isinstance(meta, dict):
        return None
    so = meta.get("shootout")
    if not isinstance(so, dict):
        return None
    h, a = so.get("home"), so.get("away")
    if h is None or a is None:
        return None
    try:
        return int(h), int(a)
    except (TypeError, ValueError):
        return None


def _extract_shootout(df: pd.DataFrame) -> pd.DataFrame:
    """Derive shootout_home / shootout_away columns from the meta jsonb (cp-22).

    Additive and defensive: when shootout columns already exist (a future
    parquet) they are kept; otherwise they are computed from meta.shootout, with
    None for rows that have no shootout. The meta column itself is dropped by
    ``_coerce`` (it is not in _COLUMNS), so nothing downstream sees raw meta."""
    df = df.copy()
    if "shootout_home" in df.columns and "shootout_away" in df.columns:
        return df
    meta_series = df["meta"] if "meta" in df.columns else None
    homes: list = []
    aways: list = []
    for i in range(len(df)):
        pair = _shootout_from_meta(meta_series.iloc[i]) if meta_series is not None else None
        homes.append(pair[0] if pair else None)
        aways.append(pair[1] if pair else None)
    df["shootout_home"] = homes
    df["shootout_away"] = aways
    return df
