"""
simulation/load_settled.py
==========================
cp-10: settled-result conditioning for the Monte Carlo group stage.

Loads the website's `match_outcomes` rows that the MC should treat as
realized (rather than sampled) for the current batch. Returns a dict
keyed by canonical match_id (M01..M72 for the group stage) mapping to
a fully-populated `MatchResult`.

The team-name source-of-truth is the **fixtures parquet**, not the DB.
`match_outcomes.home_team` / `away_team` store FIFA 3-letter codes
(e.g. "MEX"), while `MatchResult.home` / `away` and the strength
provider key off the project-canonical full names ("Mexico"). This
loader looks up home/away names from the fixtures parquet by match_id
and uses the DB row only for `home_goals` / `away_goals` / `stage`.

cp-10 conditions ONLY on group-stage matches (`stage == "group"`).
Knockout rows are present in the DB once knockout matches settle but
are filtered out here. A separate post-cp-10 checkpoint extends this
loader to knockouts.

Source-precedence order (mirrors cp-09's `_count_settled_matches`):
  1. Parquet export at MATCH_OUTCOMES_PARQUET (override via the
     `MATCH_OUTCOMES_PARQUET` env var). Preferred because the export
     is reproducible offline; the nightly regen does not need DB access.
  2. Live Postgres via DIRECT_URL / DATABASE_URL / POSTGRES_URL.
     DIRECT_URL is preferred for batch scripts to bypass any pgbouncer
     pooler. Used only if the parquet export is absent.
  3. Empty dict. Correct pre-tournament; logged so an operator can
     see why settled_results stayed empty.

Returns `(settled_results, source_label)`. The source label is written
into batch / snapshot provenance so a reviewer can trace which path
was active.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation.bracket_encoder import MatchResult
from utils.logger import get_logger

log = get_logger(__name__)

FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
MATCH_OUTCOMES_PARQUET = PROJECT_ROOT / "data" / "processed" / "match_outcomes.parquet"

# `match_outcomes.stage` enum value for group matches. The website's
# Postgres schema (website/src/lib/db/schema.ts) uses the short lowercase
# form; the fixtures parquet uses the human-readable "Group Stage". This
# constant is the DB-side spelling.
_DB_STAGE_GROUP = "group"


def _resolve_pg_url() -> Optional[str]:
    """Mirror of scripts/regenerate_snapshot_from_batch.py::_resolve_pg_url.

    Preference: DIRECT_URL (non-pooled, batch-safe) → DATABASE_URL
    (pooled, app traffic) → POSTGRES_URL (legacy alias). Kept in sync
    by hand; the two helpers are small enough that a shared module
    would be more friction than benefit.
    """
    return (
        os.environ.get("DIRECT_URL")
        or os.environ.get("DATABASE_URL")
        or os.environ.get("POSTGRES_URL")
    )


def _load_fixture_name_map() -> dict[str, tuple[str, str]]:
    """Return `dict[match_id → (team_home, team_away)]` for every fixture.

    Reads the canonical fixtures parquet and indexes by match_id. Used
    by the settled-results loader to recover the full team names the MC
    expects, given a DB row that only carries FIFA codes.

    Covers all 104 fixtures (group + knockout) so the same map can be
    used by the future knockout-conditioning checkpoint without code
    change here.
    """
    if not FIXTURES_PARQUET.exists():
        raise FileNotFoundError(
            f"wc2026 fixtures parquet not found at {FIXTURES_PARQUET}; "
            f"cannot resolve settled-results team names."
        )
    df = pd.read_parquet(
        FIXTURES_PARQUET, columns=["match_id", "team_home", "team_away"]
    )
    return {
        str(row.match_id): (str(row.team_home), str(row.team_away))
        for row in df.itertuples(index=False)
    }


def _build_results_from_rows(
    rows: pd.DataFrame,
    name_map: dict[str, tuple[str, str]],
) -> dict[str, MatchResult]:
    """Translate a DataFrame of settled-outcome rows into a MatchResult dict.

    `rows` must carry columns `match_id`, `home_goals`, `away_goals`,
    `stage`. Rows whose match_id is missing from the fixtures parquet
    are skipped with a warning rather than raising - a stray DB row
    must not crash the nightly snapshot.
    """
    out: dict[str, MatchResult] = {}
    for row in rows.itertuples(index=False):
        match_id = str(row.match_id)
        names = name_map.get(match_id)
        if names is None:
            log.warning(
                "settled-outcome row references unknown match_id; skipping",
                match_id=match_id,
            )
            continue
        home_name, away_name = names
        out[match_id] = MatchResult(
            home=home_name,
            away=away_name,
            home_goals=int(row.home_goals),
            away_goals=int(row.away_goals),
        )
    return out


def _load_via_parquet(path: Path) -> Optional[pd.DataFrame]:
    """Read settled-outcome rows from a parquet snapshot of `match_outcomes`.

    Returns None if the file does not exist (the export hasn't run);
    returns an empty DataFrame if the file exists but contains no rows
    (the export ran but nothing has settled yet); raises on a malformed
    file so a half-written export does not silently masquerade as empty.

    Filters in-loader to `stage == "group"` per cp-10's scope cut.
    """
    if not path.exists():
        return None
    df = pd.read_parquet(
        path, columns=["match_id", "home_goals", "away_goals", "stage"]
    )
    return df[df["stage"] == _DB_STAGE_GROUP].copy()


def _load_via_postgres() -> Optional[pd.DataFrame]:
    """Read settled-outcome rows from the live Postgres `match_outcomes` table.

    Returns None on any failure (driver missing, env var unset, query
    error) - same best-effort contract as cp-09's
    `_count_settled_via_postgres`. The freshness-monitor surfaces
    these failures to operations; this loader silently falls through.
    """
    url = _resolve_pg_url()
    if not url:
        return None
    conn = None
    try:
        try:
            import psycopg  # type: ignore[import-untyped]
            conn = psycopg.connect(url)
        except ImportError:
            import psycopg2  # type: ignore[import-untyped]
            conn = psycopg2.connect(url)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT match_id, home_goals, away_goals, stage "
                "FROM match_outcomes WHERE stage = %s",
                (_DB_STAGE_GROUP,),
            )
            rows = cur.fetchall()
        return pd.DataFrame(
            rows, columns=["match_id", "home_goals", "away_goals", "stage"]
        )
    except Exception as exc:  # broad on purpose; see docstring
        log.warning("postgres settled-load query failed", error=str(exc))
        return None
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


def load_settled_results() -> tuple[dict[str, MatchResult], str]:
    """Return `(settled_results, source_label)` for the MC group-stage loop.

    `settled_results` is keyed by canonical match_id (M01..M72) and
    maps to a `MatchResult(home, away, home_goals, away_goals)` with
    team names pulled from the fixtures parquet (not the DB row's
    FIFA codes).

    The source label mirrors cp-09's convention so the active_batch
    provenance is consistent:
      - "parquet:<rel-or-abs-path>" when the parquet export was used
      - "postgres:match_outcomes"   when the live DB was queried
      - "default:pre_tournament"    when neither source returned rows
    """
    override = os.environ.get("MATCH_OUTCOMES_PARQUET")
    parquet_path = Path(override) if override else MATCH_OUTCOMES_PARQUET
    name_map = _load_fixture_name_map()

    df_parquet = _load_via_parquet(parquet_path)
    if df_parquet is not None:
        rel = (
            parquet_path.relative_to(PROJECT_ROOT)
            if parquet_path.is_relative_to(PROJECT_ROOT)
            else parquet_path
        )
        return _build_results_from_rows(df_parquet, name_map), f"parquet:{rel}"

    df_pg = _load_via_postgres()
    if df_pg is not None:
        return _build_results_from_rows(df_pg, name_map), "postgres:match_outcomes"

    return {}, "default:pre_tournament"
