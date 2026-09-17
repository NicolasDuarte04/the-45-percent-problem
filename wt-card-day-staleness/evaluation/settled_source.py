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

import os
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

DEFAULT_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"

_COLUMNS = ["match_id", "stage", "home_team", "away_team", "home_goals", "away_goals", "settled_at"]


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
        return _coerce(df), f"parquet:{path}"

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
                "home_goals, away_goals, settled_at FROM match_outcomes",
                conn,
            )
            return _coerce(df), "postgres:match_outcomes"
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
