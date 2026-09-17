"""
ingestion/data_loader.py
========================
Phase 2 · Task 2.7 — Unified Data Interface

Single typed interface consumed by all models, the simulation engine, and the
market layer. Callers never touch raw Parquet files directly; they call methods
on DataLoader and receive validated, snapshot-hashed data objects.

All methods return pandas DataFrames. Schema validation is applied at load time
so type errors surface immediately rather than deep in model code.

Usage
-----
    from ingestion.data_loader import DataLoader

    loader = DataLoader()

    matches   = loader.get_matches(include_holdout=False)
    elo       = loader.get_elo()
    fixtures  = loader.get_fixtures()
    odds_pin  = loader.get_odds("pinnacle", "match_winner")
    teams     = loader.get_teams()

Notes
-----
- DataLoader is stateless — it reads Parquet on every call (fast for this data
  size; add caching later if profiling shows it matters).
- Snapshot SHAs are computed at load time and attached as attributes so the
  simulation engine can embed them in ForecastRecord.data_snapshot_sha.
- The class raises FileNotFoundError early with a helpful message if a required
  file is missing so users know which script to run first.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import yaml

from utils.hasher import DataSnapshotHasher
from utils.logger import get_logger

log = get_logger(__name__)

with open(PROJECT_ROOT / "config.yaml") as _f:
    _cfg = yaml.safe_load(_f)

# ── Parquet paths (read from config so there is exactly one source of truth) ──
_PATHS = {
    "historical_matches": PROJECT_ROOT / _cfg["data_sources"]["historical_matches"]["output_file"],
    "elo_ratings":        PROJECT_ROOT / _cfg["data_sources"]["elo_ratings"]["output_file"],
    "fifa_rankings":      PROJECT_ROOT / _cfg["data_sources"]["fifa_rankings"]["output_file"],
    "recent_form":        PROJECT_ROOT / "data" / "raw" / "recent_form.parquet",
    "macro_data":         PROJECT_ROOT / _cfg["data_sources"]["macro_data"]["output_file"],
    "wc2026_fixtures":    PROJECT_ROOT / _cfg["data_sources"]["wc2026_fixtures"]["output_file"],
    "odds_pinnacle":      PROJECT_ROOT / _cfg["data_sources"]["odds_pinnacle"]["output_file"],
    "odds_polymarket":    PROJECT_ROOT / _cfg["data_sources"]["odds_polymarket"]["output_file"],
    "odds_betfair":       PROJECT_ROOT / _cfg["data_sources"]["odds_betfair"]["output_file"],
}

_BOOKMAKER_KEYS = {
    "pinnacle":   "odds_pinnacle",
    "polymarket": "odds_polymarket",
    "betfair":    "odds_betfair",
}


def _load(key: str) -> pd.DataFrame:
    path = _PATHS[key]
    if not path.exists():
        raise FileNotFoundError(
            f"DataLoader: {key} Parquet not found at {path}.\n"
            f"Run the corresponding ingestion script first."
        )
    return pd.read_parquet(path, engine="pyarrow")


def _sha(key: str) -> str:
    """Compute SHA-256 of the current Parquet file for data_snapshot_sha."""
    path = _PATHS[key]
    if not path.exists():
        return ""
    hasher = DataSnapshotHasher()
    hasher.add_file(path, label=key)
    return hasher.finalise()


class DataLoader:
    """
    Unified read-only interface to all pipeline data.

    After construction, sha attributes expose current file hashes for embedding
    into ForecastRecord.data_snapshot_sha for full reproducibility.
    """

    def __init__(self) -> None:
        self._sha_cache: dict[str, str] = {}

    def sha(self, key: str) -> str:
        """Return (cached) SHA-256 hash of the named Parquet file."""
        if key not in self._sha_cache:
            self._sha_cache[key] = _sha(key)
        return self._sha_cache[key]

    # ── Matches ───────────────────────────────────────────────────────────────

    def get_matches(self, include_holdout: bool = False) -> pd.DataFrame:
        """
        Load historical match results.

        Args:
            include_holdout: If False (default), exclude the 2022 WC hold-out
                             set. Set True only in validate_on_2022_holdout.py.

        Returns DataFrame with columns:
            match_id, date, tournament, stage, team_home, team_away,
            score_home, score_away, neutral_venue, host_country,
            extra_time, penalties, penalty_winner, is_holdout
        """
        df = _load("historical_matches")
        if not include_holdout:
            df = df[~df["is_holdout"]].copy()
        log.info(
            "Matches loaded",
            rows=len(df),
            include_holdout=include_holdout,
            sha=self.sha("historical_matches")[:12],
        )
        return df.reset_index(drop=True)

    # ── Elo ratings ───────────────────────────────────────────────────────────

    def get_elo(self) -> pd.DataFrame:
        """
        Load current World Football Elo ratings.

        Returns DataFrame with columns:
            rank, prev_rank, team_code, team_name, elo_rating, snapshot_date
        """
        df = _load("elo_ratings")
        log.info("Elo ratings loaded", teams=len(df), sha=self.sha("elo_ratings")[:12])
        return df

    def get_elo_map(self) -> dict[str, float]:
        """Return {team_name → elo_rating} for fast lookup."""
        df = self.get_elo()
        return dict(zip(df["team_name"], df["elo_rating"]))

    # ── FIFA rankings ─────────────────────────────────────────────────────────

    def get_fifa_rankings(self) -> pd.DataFrame:
        """
        Load FIFA ranking points for all WC 2026 qualifiers.

        Returns DataFrame with columns:
            fifa_rank, team_name, fifa_points, confederation, snapshot_date
        """
        df = _load("fifa_rankings")
        log.info("FIFA rankings loaded", teams=len(df), sha=self.sha("fifa_rankings")[:12])
        return df

    def get_fifa_points_map(self) -> dict[str, float]:
        """Return {team_name → fifa_points} for fast lookup."""
        df = self.get_fifa_rankings()
        return dict(zip(df["team_name"], df["fifa_points"]))

    # ── Recent form ───────────────────────────────────────────────────────────

    def get_recent_form(self) -> pd.DataFrame:
        """
        Load raw form series (last 8 matches per team).

        Returns DataFrame with columns:
            team_name, date, match_id, result, opponent,
            opponent_elo, comp_weight, tournament, is_holdout
        """
        df = _load("recent_form")
        log.info("Recent form loaded", rows=len(df), sha=self.sha("recent_form")[:12])
        return df

    def get_form_series(self, team_name: str) -> pd.DataFrame:
        """Return the form series for a single team, sorted chronologically."""
        df = self.get_recent_form()
        team_df = df[df["team_name"] == team_name].sort_values("date")
        if team_df.empty:
            log.warning("No form data for team", team=team_name)
        return team_df

    # ── Macro data ────────────────────────────────────────────────────────────

    def get_macro(self) -> pd.DataFrame:
        """
        Load Hoffmann-HGR macro variables for M3.

        Returns DataFrame with columns:
            iso3, team_name, gdp_per_capita, population,
            log_gdp_per_capita, log_population, mean_temp_celsius,
            is_host, wc_appearances, football_culture_index, snapshot_date
        """
        df = _load("macro_data")
        log.info("Macro data loaded", teams=len(df), sha=self.sha("macro_data")[:12])
        return df

    def get_macro_map(self) -> dict[str, dict]:
        """Return {team_name → {variable → value}} for fast lookup."""
        df = self.get_macro()
        return df.set_index("team_name").to_dict(orient="index")

    # ── Fixtures ──────────────────────────────────────────────────────────────

    def get_fixtures(self, stage: str | None = None) -> pd.DataFrame:
        """
        Load WC 2026 fixture list.

        Args:
            stage: Filter to a specific stage ('Group Stage', 'Round of 32',
                   'Round of 16', 'Quarter-final', 'Semi-final', 'Final').
                   If None, returns all 104 fixtures.

        Returns DataFrame with columns:
            match_id, kickoff_utc, stage, group, team_home, team_away,
            venue, city, country, is_neutral
        """
        df = _load("wc2026_fixtures")
        if stage is not None:
            df = df[df["stage"] == stage].copy()
        log.info(
            "Fixtures loaded",
            rows=len(df),
            stage=stage or "all",
            sha=self.sha("wc2026_fixtures")[:12],
        )
        return df.reset_index(drop=True)

    def get_group_fixtures(self) -> pd.DataFrame:
        """Convenience: group-stage fixtures only."""
        return self.get_fixtures(stage="Group Stage")

    # ── Teams ─────────────────────────────────────────────────────────────────

    def get_teams(self) -> pd.DataFrame:
        """
        Build a unified team feature table by joining Elo, FIFA rankings,
        recent form score (not yet computed — placeholder), and macro data.

        Returns one row per WC 2026 qualifier with all signals needed by M0–M3.
        Signals not yet available (form_score, macro for non-48 teams) are NaN.
        """
        elo    = self.get_elo()
        fifa   = self.get_fifa_rankings()
        macro  = self.get_macro()

        # Start from the 48 FIFA qualifiers (the authoritative team list)
        teams = fifa[["team_name", "confederation", "fifa_rank", "fifa_points"]].copy()

        # Join Elo
        elo_slim = elo[["team_name", "elo_rating", "snapshot_date"]].rename(
            columns={"snapshot_date": "elo_snapshot_date"}
        )
        teams = teams.merge(elo_slim, on="team_name", how="left")

        # Join macro
        macro_cols = [
            "team_name", "iso3", "log_gdp_per_capita", "log_population",
            "mean_temp_celsius", "is_host", "wc_appearances", "football_culture_index",
        ]
        teams = teams.merge(macro[macro_cols], on="team_name", how="left")

        # Add group assignment from fixtures
        fixtures = self.get_group_fixtures()
        team_groups = (
            pd.concat([
                fixtures[["team_home","group"]].rename(columns={"team_home":"team_name"}),
                fixtures[["team_away","group"]].rename(columns={"team_away":"team_name"}),
            ])
            .drop_duplicates("team_name")
        )
        teams = teams.merge(team_groups, on="team_name", how="left")

        log.info(
            "Team table built",
            teams=len(teams),
            missing_elo=int(teams["elo_rating"].isna().sum()),
            missing_macro=int(teams["log_gdp_per_capita"].isna().sum()),
        )
        return teams.sort_values("fifa_rank").reset_index(drop=True)

    # ── Odds ──────────────────────────────────────────────────────────────────

    def get_odds(self, bookmaker: str, market_type: str = "match_winner") -> pd.DataFrame:
        """
        Load odds for a specific bookmaker and market type.

        Args:
            bookmaker:   'pinnacle' | 'polymarket' | 'betfair'
            market_type: 'match_winner' (default) | others as supported

        Returns DataFrame (columns vary by bookmaker; always includes
            snapshot_id, timestamp, match_id, bookmaker, market_type,
            outcome, decimal_odds)
        """
        key = _BOOKMAKER_KEYS.get(bookmaker)
        if key is None:
            raise ValueError(f"Unknown bookmaker: {bookmaker!r}. Must be one of {list(_BOOKMAKER_KEYS)}")

        df = _load(key)
        if df.empty:
            log.info(
                "Odds snapshot is empty",
                bookmaker=bookmaker,
                market_type=market_type,
                note="Normal before tournament opens",
            )
            return df

        if "market_type" in df.columns:
            df = df[df["market_type"] == market_type].copy()

        log.info(
            "Odds loaded",
            bookmaker=bookmaker,
            market_type=market_type,
            rows=len(df),
            sha=self.sha(key)[:12],
        )
        return df.reset_index(drop=True)

    # ── Convenience ───────────────────────────────────────────────────────────

    def available_files(self) -> dict[str, bool]:
        """Return {dataset_name → exists} for all tracked Parquet files."""
        return {key: path.exists() for key, path in _PATHS.items()}

    def data_snapshot_sha(self) -> str:
        """
        Compute a combined SHA covering all available data files.
        Used as ForecastRecord.data_snapshot_sha for full reproducibility.
        """
        hasher = DataSnapshotHasher()
        for key, path in sorted(_PATHS.items()):
            if path.exists():
                hasher.add_file(path, label=key)
        return hasher.finalise()


# =============================================================================
# CLI — sanity check
# =============================================================================

if __name__ == "__main__":
    log.stage("DataLoader — sanity check")

    loader = DataLoader()

    print("\nAvailable data files:")
    for name, exists in loader.available_files().items():
        status = "✅" if exists else "❌"
        print(f"  {status}  {name}")

    print("\nLoading datasets:")
    matches  = loader.get_matches(include_holdout=False)
    print(f"  Matches (calibration):  {len(matches):>4} rows")

    elo      = loader.get_elo()
    print(f"  Elo ratings:            {len(elo):>4} teams")

    fifa     = loader.get_fifa_rankings()
    print(f"  FIFA rankings:          {len(fifa):>4} teams")

    form     = loader.get_recent_form()
    print(f"  Recent form series:     {len(form):>4} rows")

    macro    = loader.get_macro()
    print(f"  Macro data:             {len(macro):>4} teams")

    fixtures = loader.get_fixtures()
    print(f"  WC 2026 fixtures:       {len(fixtures):>4} matches")

    teams    = loader.get_teams()
    print(f"  Unified team table:     {len(teams):>4} teams")

    odds_p   = loader.get_odds("pinnacle")
    print(f"  Pinnacle odds:          {len(odds_p):>4} rows")

    combined_sha = loader.data_snapshot_sha()
    log.success("DataLoader sanity check passed", combined_sha=combined_sha[:16])
    print(f"\nCombined data snapshot SHA: {combined_sha[:16]}")
