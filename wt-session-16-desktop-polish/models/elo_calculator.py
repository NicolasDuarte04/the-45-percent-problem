"""
models/elo_calculator.py
========================
Phase 3 — Elo Engine

Stateless math functions + a walk-forward Elo engine that ingests the cleaned
historical match table from Phase 2 and emits a per-match rating snapshot
series. All locked priors follow Phase3_Elo_Calibration_Design.md §1.

LOCKED constants must not be re-optimised here. See Phase 6 for ρ/λ₃.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger

log = get_logger(__name__)

# ── Locked priors (Design Doc §1.6) ───────────────────────────────────────────
K0: float = 40.0
H_HOME: float = 100.0
H_NEUTRAL: float = 0.0

IMPORTANCE: dict[str, float] = {
    "WC_GROUP":       1.50,
    "WC_KO":          1.50,
    "CONT_FINALS":    1.25,
    "WC_QUAL":        1.00,
    "CONT_QUAL":      1.00,
    "NATIONS_LEAGUE": 0.85,
    "FRIENDLY":       0.50,
}


def _classify_tournament(name: str) -> str:
    """Map raw tournament name → competition_type key."""
    n = name.lower()
    if "world cup" in n:
        return "WC_GROUP"
    if any(x in n for x in (
        "euro", "copa america", "africa cup", "afcon", "african cup",
        "asian cup", "gold cup", "nations cup",
    )):
        return "CONT_FINALS"
    if "qualifier" in n or "qualification" in n:
        return "WC_QUAL"
    if "nations league" in n:
        return "NATIONS_LEAGUE"
    return "FRIENDLY"


# ── Core math ─────────────────────────────────────────────────────────────────

def expected_score(R_i: float, R_j: float, H: float) -> float:
    """
    Elo expected score for team i (home-adjusted) vs team j.

    E_i = 1 / (1 + 10^((R_j − (R_i + H)) / 400))
    """
    return 1.0 / (1.0 + 10.0 ** ((R_j - (R_i + H)) / 400.0))


def goal_multiplier(goal_diff: int) -> float:
    """
    G = 1              if Δg ≤ 1
    G = 1 + 0.5·ln(Δg) if Δg ≥ 2

    Equivalent: G = 1 + max(0, 0.5·ln(max(Δg, 1)))
    """
    delta = max(0, goal_diff)
    if delta <= 1:
        return 1.0
    return 1.0 + 0.5 * math.log(delta)


def k_factor(competition_type: str, goal_diff: int) -> float:
    """K = K₀ · I · G."""
    I = IMPORTANCE.get(competition_type, 1.00)
    G = goal_multiplier(goal_diff)
    return K0 * I * G


def update_ratings(
    R_i: float,
    R_j: float,
    S_i: float,
    H: float,
    K: float,
) -> tuple[float, float]:
    """
    Apply one zero-sum Elo update.

    R_i' = R_i + K·(S_i − E_i)
    R_j' = R_j − K·(S_i − E_i)   [zero-sum identity]
    """
    E_i = expected_score(R_i, R_j, H)
    delta = K * (S_i - E_i)
    return R_i + delta, R_j - delta


# ── Walk-forward engine ────────────────────────────────────────────────────────

def run_walk_forward(
    matches_df: pd.DataFrame,
    initial_rating: float = 1500.0,
) -> pd.DataFrame:
    """
    Iterate through matches_df in chronological order.

    Maintains a {team → current_rating} dict. At each match, snapshots the
    PRE-match ratings (what calibration consumes), then applies update_ratings()
    to roll forward.

    Args:
        matches_df: Cleaned match table from DataLoader.get_matches().
                    Expected columns: match_id, date, tournament, team_home,
                    team_away, score_home, score_away, neutral_venue.
                    Optional: competition_type, H.
        initial_rating: Starting Elo for first appearance (LOCKED at 1500).

    Returns:
        Long-format DataFrame with columns:
            match_id, date, home_team, away_team, competition_type,
            R_home_pre, R_away_pre, H_used, K_used, G_used,
            S_home, score_home, score_away,
            R_home_post, R_away_post
    """
    df = matches_df.copy()
    df["date"] = pd.to_datetime(df["date"], utc=True)
    df = df.sort_values("date").reset_index(drop=True)

    if "competition_type" not in df.columns:
        df["competition_type"] = df["tournament"].apply(_classify_tournament)

    if "H" not in df.columns:
        df["H"] = df["neutral_venue"].map({True: H_NEUTRAL, False: H_HOME}).fillna(H_NEUTRAL)

    ratings: dict[str, float] = {}
    records: list[dict] = []

    for row in df.itertuples(index=False):
        home: str = row.team_home
        away: str = row.team_away

        # Skip if score is missing
        if pd.isna(row.score_home) or pd.isna(row.score_away):
            log.warning("Missing score — skipping", match_id=row.match_id)
            continue

        score_home = int(row.score_home)
        score_away = int(row.score_away)
        delta_g = abs(score_home - score_away)

        R_home = ratings.get(home, initial_rating)
        R_away = ratings.get(away, initial_rating)
        H = float(row.H)
        ctype: str = row.competition_type

        G = goal_multiplier(delta_g)
        K = K0 * IMPORTANCE.get(ctype, 1.00) * G

        if score_home > score_away:
            S_home = 1.0
        elif score_home == score_away:
            S_home = 0.5
        else:
            S_home = 0.0

        R_home_post, R_away_post = update_ratings(R_home, R_away, S_home, H, K)

        records.append({
            "match_id":        row.match_id,
            "date":            row.date,
            "home_team":       home,
            "away_team":       away,
            "competition_type": ctype,
            "R_home_pre":      R_home,
            "R_away_pre":      R_away,
            "H_used":          H,
            "K_used":          K,
            "G_used":          G,
            "S_home":          S_home,
            "score_home":      score_home,
            "score_away":      score_away,
            "R_home_post":     R_home_post,
            "R_away_post":     R_away_post,
        })

        ratings[home] = R_home_post
        ratings[away] = R_away_post

    result = pd.DataFrame(records)

    log.info(
        "Walk-forward Elo complete",
        matches=len(result),
        teams=len(ratings),
        nan_ratings=int(result[["R_home_pre", "R_away_pre"]].isna().any(axis=1).sum()),
    )
    return result
