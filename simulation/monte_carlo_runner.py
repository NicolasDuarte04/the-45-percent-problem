"""
simulation/monte_carlo_runner.py
=================================
Phase 5 — Deliverable 4: Monte Carlo Tournament Simulator

Implements §6 of Phase5_Simulation_Engine_Design.md.

Single-run loop (§6.1):
  1. Group stage — 72 matches, sample scorelines from BP+DC model
  2. Tiebreakers + bracket seeding
  3. Knockout rounds (R32 → R16 → QF → SF → 3rd-place + Final): 31 matches + 1 = 32
  4. Emit two DataFrames: team_runs (48 rows) and match_runs (104 rows)

Output schema (§6.2):
  team_runs  — one row per (run, team): group finish, points, qualified_r32, exit_round, etc.
  match_runs — one row per (run, match): scorelines, ET, penalty outcomes.

StrengthProvider interface:
  get_lambdas(team_a, team_b, context) → (λ_home, λ_away)
  get_elo(team) → float
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Protocol

import numpy as np
import pandas as pd
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

_yaml_path = PROJECT_ROOT / "evaluation" / "pre_reg_constants.yaml"
with open(_yaml_path) as _fh:
    _pre_reg = yaml.safe_load(_fh)

_C_STAR  = float(_pre_reg["elo"]["c_star"])
_MU_STAR = float(_pre_reg["elo"]["mu_star"])

from simulation.match_model import MatchModel
from simulation.shootout_model import ShootoutModel
from simulation.bracket_encoder import (
    BracketEncoder,
    MatchResult,
    TeamId,
    QATAR2022_GROUPS,
)


# ── StrengthProvider protocol ─────────────────────────────────────────────────

class StrengthProvider(Protocol):
    """Interface consumed by the simulation engine (§2)."""

    def get_lambdas(
        self, team_a: str, team_b: str, context: str
    ) -> tuple[float, float]:
        """Return (λ_home, λ_away) for team_a hosting vs team_b."""
        ...

    def get_elo(self, team: str) -> float:
        """Return current Elo rating for `team`."""
        ...


# ── ModelStrengthProvider (wraps BaseModel for 2026 engine) ──────────────────

class ModelStrengthProvider:
    """Adapts a Phase 4 BaseModel + Elo ratings into a StrengthProvider."""

    def __init__(
        self,
        strength_matrix: np.ndarray,           # (N, N) S[i,j] = λ(team_i vs team_j)
        team_index: dict[str, int],            # team_name → row/col index
        elo_ratings: dict[str, float],         # team_name → Elo
        default_lambda: float = 1.0,
        default_elo: float = 1500.0,
    ) -> None:
        self._S = strength_matrix
        self._team_index = team_index
        self._elo = elo_ratings
        self._default_lambda = default_lambda
        self._default_elo = default_elo

    def get_lambdas(self, team_a: str, team_b: str, context: str) -> tuple[float, float]:
        i = self._team_index.get(team_a)
        j = self._team_index.get(team_b)
        if i is None or j is None:
            return self._default_lambda, self._default_lambda
        return float(self._S[i, j]), float(self._S[j, i])

    def get_elo(self, team: str) -> float:
        return self._elo.get(team, self._default_elo)


# ── SimpleEloProvider (for smoke test / standalone use) ──────────────────────

class SimpleEloProvider:
    """Constructs λ pairs from Elo ratings + calibrated (c*, μ*) directly.

    Used by the Qatar 2022 smoke test (§8.2) where we don't have a fitted
    BaseModel but do have Elo ratings and the Phase 3 locked parameters.
    """

    def __init__(
        self,
        elo_ratings: dict[str, float],
        c_star: float = _C_STAR,
        mu_star: float = _MU_STAR,
        default_elo: float = 1500.0,
    ) -> None:
        self._elo = elo_ratings
        self._c = c_star
        self._mu = mu_star
        self._default_elo = default_elo
        import math
        self._math = math

    def get_lambdas(self, team_a: str, team_b: str, context: str) -> tuple[float, float]:
        R_a = self._elo.get(team_a, self._default_elo)
        R_b = self._elo.get(team_b, self._default_elo)
        import math
        lam_a = self._mu * math.exp(self._c * (R_a - R_b) / 400.0)
        lam_b = self._mu * math.exp(self._c * (R_b - R_a) / 400.0)
        return lam_a, lam_b

    def get_elo(self, team: str) -> float:
        return self._elo.get(team, self._default_elo)


# ═══════════════════════════════════════════════════════════════════════════════
# Group fixture lists for FIFA 2026
# ═══════════════════════════════════════════════════════════════════════════════

# 12 groups (A–L), each with exactly 6 fixtures (round-robin of 4 teams).
# Loaded lazily from the WC 2026 fixtures parquet.

def _load_wc2026_fixtures() -> dict[str, list[tuple[str, str]]]:
    """Load group fixtures from data/raw/wc2026_fixtures.parquet."""
    parquet_path = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
    if not parquet_path.exists():
        raise FileNotFoundError(f"WC 2026 fixtures not found at {parquet_path}")
    df = pd.read_parquet(parquet_path)
    group_df = df[df["stage"] == "Group Stage"]
    fixtures: dict[str, list[tuple[str, str]]] = {}
    for _, row in group_df.iterrows():
        g = row["group"]
        if g not in fixtures:
            fixtures[g] = []
        fixtures[g].append((row["team_home"], row["team_away"]))
    return fixtures


# ── Qatar 2022 fixtures (hardcoded for smoke test, known ground truth) ────────

def _build_qatar2022_fixtures() -> dict[str, list[tuple[str, str]]]:
    """Generate round-robin fixtures for Qatar 2022 groups."""
    fixtures: dict[str, list[tuple[str, str]]] = {}
    for g, teams in QATAR2022_GROUPS.items():
        group_fixtures: list[tuple[str, str]] = []
        for i in range(len(teams)):
            for j in range(i + 1, len(teams)):
                group_fixtures.append((teams[i], teams[j]))
        fixtures[g] = group_fixtures
    return fixtures


# ═══════════════════════════════════════════════════════════════════════════════
# MonteCarloRunner
# ═══════════════════════════════════════════════════════════════════════════════

# Exit round labels in bracket order
_EXIT_ROUNDS_2026 = ["Group", "R32", "R16", "QF", "SF", "3rd", "Runner-up", "Champion"]
_EXIT_ROUNDS_2022 = ["Group", "R16", "QF", "SF", "3rd", "Runner-up", "Champion"]

_KO_ROUND_NAMES_2026 = ["R32", "R16", "QF", "SF"]
_KO_ROUND_NAMES_2022 = ["R16", "QF", "SF"]


class MonteCarloRunner:
    """Simulates a complete FIFA World Cup tournament (one run).

    Implements §6 of Phase5_Simulation_Engine_Design.md.
    """

    def __init__(
        self,
        match_model: MatchModel,
        shootout_model: ShootoutModel,
        bracket_encoder: BracketEncoder,
        strength_provider: StrengthProvider,
        code_sha: str,
        tournament_variant: str = "wc2026",  # "wc2026" or "qatar2022"
    ) -> None:
        self._mm = match_model
        self._sm = shootout_model
        self._be = bracket_encoder
        self._sp = strength_provider
        self._code_sha = code_sha
        self._variant = tournament_variant

        # Load fixtures
        if tournament_variant == "qatar2022":
            self._group_fixtures = _build_qatar2022_fixtures()
            self._groups = list("ABCDEFGH")
        else:
            self._group_fixtures = _load_wc2026_fixtures()
            self._groups = list("ABCDEFGHIJKL")

    def run_one(
        self,
        run_idx: int,
        seed: int,
        model_id: str,
        data_hash: str,
        timestamp_utc: pd.Timestamp,
    ) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Simulate one complete tournament. Return (team_runs_df, match_runs_df).

        Output schemas match §6.2 exactly.
        """
        rng = np.random.default_rng(seed)

        # Share the rng across match_model and shootout_model
        self._mm.rng = rng
        self._sm.rng = rng

        team_rows: list[dict] = []
        match_rows: list[dict] = []

        # Common metadata prefix
        meta = {
            "run_idx": run_idx,
            "model_id": model_id,
            "data_hash": data_hash,
            "seed": seed,
            "code_sha": self._code_sha,
            "timestamp_utc": timestamp_utc,
        }

        # ── 1. Group stage ────────────────────────────────────────────────────
        group_results: dict[str, list[MatchResult]] = {}
        for group in self._groups:
            fixtures = self._group_fixtures.get(group, [])
            group_match_results: list[MatchResult] = []
            for match_num, (home, away) in enumerate(fixtures, start=1):
                lam_h, lam_a = self._sp.get_lambdas(home, away, context="group")
                h_goals, a_goals = self._mm.sample_scoreline(lam_h, lam_a)
                mr = MatchResult(home, away, h_goals, a_goals)
                group_match_results.append(mr)
                match_rows.append({
                    **meta,
                    "match_id": f"G-{group}-{match_num}",
                    "phase": "group",
                    "team_home": home,
                    "team_away": away,
                    "lambda_home": round(lam_h, 6),
                    "lambda_away": round(lam_a, 6),
                    "reg_home_goals": h_goals,
                    "reg_away_goals": a_goals,
                    "went_to_ET": False,
                    "et_home_goals": None,
                    "et_away_goals": None,
                    "went_to_pens": False,
                    "pen_home_score": None,
                    "pen_away_score": None,
                    "winner": None,   # draws are valid in group stage
                })
            group_results[group] = group_match_results

        # ── 2. Group rankings + bracket seeding ──────────────────────────────
        group_rankings: dict[str, list[TeamId]] = {}
        for group in self._groups:
            group_rankings[group] = self._be.rank_group(group_results[group], rng)

        if self._variant == "qatar2022":
            r_matchups = self._be.seed_qatar2022_bracket(group_rankings)
            ko_round_names = _KO_ROUND_NAMES_2022
        else:
            best_thirds = self._be.select_best_thirds(
                group_rankings, group_results, rng
            )
            r_matchups = self._be.seed_bracket(group_rankings, best_thirds)
            ko_round_names = _KO_ROUND_NAMES_2026

        # ── 3. Build team_runs rows (pre-knockout stats) ───────────────────────
        group_team_stats: dict[str, dict] = {}   # team → stats dict
        for group in self._groups:
            ranked = group_rankings[group]
            matches = group_results[group]

            from simulation.bracket_encoder import _compute_group_stats
            stats = _compute_group_stats(ranked, matches)

            for pos, team in enumerate(ranked, start=1):
                s = stats.get(team)
                group_team_stats[team] = {
                    "group_letter": group,
                    "group_finish": pos,
                    "group_points": s.points if s else 0,
                    "group_gd": s.gd if s else 0,
                    "group_gs": s.gs if s else 0,
                    "qualified_r32": pos <= 2,   # updated for thirds below
                    "exit_round": "Group",
                    "reached_final": False,
                    "champion": False,
                }

        # Mark qualifying thirds
        if self._variant != "qatar2022":
            for group in self._groups:
                ranked = group_rankings[group]
                if len(ranked) >= 3:
                    third_team = ranked[2]
                    # Will be updated to True if they appear in r_matchups
                    group_team_stats[third_team]["qualified_r32"] = False

        # Mark all R32 participants
        r32_teams_set = {t for pair in r_matchups for t in pair}
        for team in r32_teams_set:
            if team in group_team_stats:
                group_team_stats[team]["qualified_r32"] = True

        # ── 4. Knockout rounds ─────────────────────────────────────────────────
        current_round = r_matchups
        round_losers: dict[str, list[TeamId]] = {}
        sf_losers: list[TeamId] = []

        for round_idx, round_name in enumerate(ko_round_names):
            next_round: list[tuple[TeamId, TeamId]] = []
            round_losers[round_name] = []
            for match_num, (team_a, team_b) in enumerate(current_round, start=1):
                lam_h, lam_a = self._sp.get_lambdas(team_a, team_b, context=round_name)
                reg_h, reg_a = self._mm.sample_scoreline(lam_h, lam_a)

                went_ET = False
                et_h: Optional[int] = None
                et_a: Optional[int] = None
                went_pens = False
                pen_h: Optional[int] = None
                pen_a: Optional[int] = None
                winner: str

                if reg_h > reg_a:
                    winner = team_a
                elif reg_a > reg_h:
                    winner = team_b
                else:
                    # Draw → ET + possible penalties
                    elo_a = self._sp.get_elo(team_a)
                    elo_b = self._sp.get_elo(team_b)
                    ko_result = self._sm.resolve_knockout(
                        lam_h, lam_a, elo_a, elo_b, reg_score=(reg_h, reg_a)
                    )
                    went_ET = ko_result["went_to_ET"]
                    et_h = ko_result["et_home"]
                    et_a = ko_result["et_away"]
                    went_pens = ko_result["went_to_pens"]
                    pen_h = ko_result["pen_home_score"]
                    pen_a = ko_result["pen_away_score"]
                    winner = team_a if ko_result["winner"] == "home" else team_b

                loser = team_b if winner == team_a else team_a
                next_round.append(winner)
                round_losers[round_name].append(loser)

                # Update exit round for loser
                if loser in group_team_stats:
                    group_team_stats[loser]["exit_round"] = round_name

                match_rows.append({
                    **meta,
                    "match_id": f"KO-{round_name}-{match_num}",
                    "phase": round_name,
                    "team_home": team_a,
                    "team_away": team_b,
                    "lambda_home": round(lam_h, 6),
                    "lambda_away": round(lam_a, 6),
                    "reg_home_goals": reg_h,
                    "reg_away_goals": reg_a,
                    "went_to_ET": went_ET,
                    "et_home_goals": et_h,
                    "et_away_goals": et_a,
                    "went_to_pens": went_pens,
                    "pen_home_score": pen_h,
                    "pen_away_score": pen_a,
                    "winner": winner,
                })

            if round_name == "SF":
                sf_losers = round_losers["SF"]

            # Pair up winners for the next round
            current_round = list(zip(next_round[::2], next_round[1::2]))

        # After SF: current_round has 1 pair (the finalists) + sf_losers has 2 (3rd-place)
        finalists = [w for pair in current_round for w in pair]

        # ── 3rd-place playoff ─────────────────────────────────────────────────
        if len(sf_losers) == 2:
            t3, t4 = sf_losers
            lam_h, lam_a = self._sp.get_lambdas(t3, t4, context="3rd")
            reg_h, reg_a = self._mm.sample_scoreline(lam_h, lam_a)
            went_ET_3rd = False
            et_h3: Optional[int] = None
            et_a3: Optional[int] = None
            went_pens_3rd = False
            pen_h3: Optional[int] = None
            pen_a3: Optional[int] = None
            if reg_h > reg_a:
                third = t3
                fourth = t4
            elif reg_a > reg_h:
                third = t4
                fourth = t3
            else:
                elo_a = self._sp.get_elo(t3)
                elo_b = self._sp.get_elo(t4)
                ko_result = self._sm.resolve_knockout(
                    lam_h, lam_a, elo_a, elo_b, reg_score=(reg_h, reg_a)
                )
                went_ET_3rd = True
                et_h3 = ko_result["et_home"]
                et_a3 = ko_result["et_away"]
                went_pens_3rd = ko_result["went_to_pens"]
                pen_h3 = ko_result["pen_home_score"]
                pen_a3 = ko_result["pen_away_score"]
                third = t3 if ko_result["winner"] == "home" else t4
                fourth = t4 if ko_result["winner"] == "home" else t3

            if third in group_team_stats:
                group_team_stats[third]["exit_round"] = "3rd"
            if fourth in group_team_stats:
                group_team_stats[fourth]["exit_round"] = "3rd"

            match_rows.append({
                **meta,
                "match_id": "KO-3rd-1",
                "phase": "3rd-place",
                "team_home": t3,
                "team_away": t4,
                "lambda_home": round(lam_h, 6),
                "lambda_away": round(lam_a, 6),
                "reg_home_goals": reg_h,
                "reg_away_goals": reg_a,
                "went_to_ET": went_ET_3rd,
                "et_home_goals": et_h3,
                "et_away_goals": et_a3,
                "went_to_pens": went_pens_3rd,
                "pen_home_score": pen_h3,
                "pen_away_score": pen_a3,
                "winner": third,
            })

        # ── Final ─────────────────────────────────────────────────────────────
        if len(finalists) == 2:
            f1, f2 = finalists
            lam_h, lam_a = self._sp.get_lambdas(f1, f2, context="Final")
            reg_h, reg_a = self._mm.sample_scoreline(lam_h, lam_a)
            went_ET_fin = False
            et_h_fin: Optional[int] = None
            et_a_fin: Optional[int] = None
            went_pens_fin = False
            pen_h_fin: Optional[int] = None
            pen_a_fin: Optional[int] = None
            if reg_h > reg_a:
                champion = f1
                runner_up = f2
            elif reg_a > reg_h:
                champion = f2
                runner_up = f1
            else:
                elo_a = self._sp.get_elo(f1)
                elo_b = self._sp.get_elo(f2)
                ko_result = self._sm.resolve_knockout(
                    lam_h, lam_a, elo_a, elo_b, reg_score=(reg_h, reg_a)
                )
                went_ET_fin = True
                et_h_fin = ko_result["et_home"]
                et_a_fin = ko_result["et_away"]
                went_pens_fin = ko_result["went_to_pens"]
                pen_h_fin = ko_result["pen_home_score"]
                pen_a_fin = ko_result["pen_away_score"]
                champion = f1 if ko_result["winner"] == "home" else f2
                runner_up = f2 if ko_result["winner"] == "home" else f1

            if runner_up in group_team_stats:
                group_team_stats[runner_up]["exit_round"] = "Runner-up"
                group_team_stats[runner_up]["reached_final"] = True
            if champion in group_team_stats:
                group_team_stats[champion]["exit_round"] = "Champion"
                group_team_stats[champion]["reached_final"] = True
                group_team_stats[champion]["champion"] = True

            match_rows.append({
                **meta,
                "match_id": "KO-Final-1",
                "phase": "Final",
                "team_home": f1,
                "team_away": f2,
                "lambda_home": round(lam_h, 6),
                "lambda_away": round(lam_a, 6),
                "reg_home_goals": reg_h,
                "reg_away_goals": reg_a,
                "went_to_ET": went_ET_fin,
                "et_home_goals": et_h_fin,
                "et_away_goals": et_a_fin,
                "went_to_pens": went_pens_fin,
                "pen_home_score": pen_h_fin,
                "pen_away_score": pen_a_fin,
                "winner": champion,
            })

        # ── Assemble DataFrames ───────────────────────────────────────────────
        for team, stats in group_team_stats.items():
            team_rows.append({**meta, "team_id": team, **stats})

        team_df = pd.DataFrame(team_rows)
        match_df = pd.DataFrame(match_rows)

        # Enforce dtypes per §6.2
        if not team_df.empty:
            team_df["run_idx"]       = team_df["run_idx"].astype("int64")
            team_df["seed"]          = team_df["seed"].astype("int64")
            team_df["group_finish"]  = team_df["group_finish"].astype("int8")
            team_df["group_points"]  = team_df["group_points"].astype("int8")
            team_df["group_gd"]      = team_df["group_gd"].astype("int16")
            team_df["group_gs"]      = team_df["group_gs"].astype("int16")
            team_df["qualified_r32"] = team_df["qualified_r32"].astype(bool)
            team_df["reached_final"] = team_df["reached_final"].astype(bool)
            team_df["champion"]      = team_df["champion"].astype(bool)

        if not match_df.empty:
            match_df["run_idx"]          = match_df["run_idx"].astype("int64")
            match_df["seed"]             = match_df["seed"].astype("int64")
            match_df["reg_home_goals"]   = match_df["reg_home_goals"].astype("int8")
            match_df["reg_away_goals"]   = match_df["reg_away_goals"].astype("int8")
            match_df["went_to_ET"]       = match_df["went_to_ET"].astype(bool)
            match_df["went_to_pens"]     = match_df["went_to_pens"].astype(bool)
            match_df["lambda_home"]      = match_df["lambda_home"].astype("float32")
            match_df["lambda_away"]      = match_df["lambda_away"].astype("float32")

        return team_df, match_df
