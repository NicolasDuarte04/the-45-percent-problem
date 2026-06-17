"""
market/divergence_generator.py
==============================
cp-14, commit 5 (Section 2 workstream 4). Decision B: honest gated divergence.

The published divergence.json has been a frozen, synthetic, Elo-derived table
since 2026-05-07 with every row falsely stamped source_book "PINNACLE". This
module replaces the carry-forward with a gated regeneration:

  * Real odds present (the producer ran a real tier, so the odds parquet is not
    all synthetic): de-vig the real Pinnacle lines via market/devig.py, compute
    the model-vs-market edge against the frozen champion distribution, and emit
    rows honestly stamped PINNACLE.

  * No real odds (synthetic fallback, or the parquet is absent): emit the honest
    pending state, zero rows, status "pending", and NO source_book stamp
    anywhere. No synthetic data is published behind a disclosure banner.

The gate is on the data itself (are the odds synthetic?), which also covers the
case where a key is set but the producer has not run yet. THE_ODDS_API_KEY and
PINNACLE_API_KEY are equally valid unblocks; both yield non-synthetic
snapshot_id prefixes.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path
from typing import Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.devig import devig  # noqa: E402

# Pre-registered Pinnacle bias deltas, reported on each real row for provenance.
_DRAW_DELTA = 0.014
_HOST_DELTA = -0.006
_EDGE_THRESHOLD_MAINLINE = 0.03

# 1X2 outcome ordering used by devig and the website row schema.
_OUTCOME_KEYS = ("home_win", "draw", "away_win")
_OUTCOME_LABEL = {"home_win": "HOME", "draw": "DRAW", "away_win": "AWAY"}
_P_MODEL_COL = {"home_win": "p_home", "draw": "p_draw", "away_win": "p_away"}


def odds_are_synthetic(odds_df: Optional[pd.DataFrame]) -> bool:
    """True when there are no real odds to publish.

    Synthetic rows carry snapshot_id prefixed "syn_". The frozen fallback
    parquet is entirely synthetic; a real producer run yields "oa_" (Odds API)
    or an 8-char uuid (Pinnacle commercial) prefix. An empty or absent frame is
    treated as synthetic (nothing real to show).
    """
    if odds_df is None or odds_df.empty or "snapshot_id" not in odds_df.columns:
        return True
    prefixes = odds_df["snapshot_id"].astype(str).str.split("_").str[0].unique()
    return all(p == "syn" for p in prefixes)


def pending_divergence(snapshot_id: str, generated_at_utc: str, reason: str) -> dict:
    """The honest pending state: zero rows, no PINNACLE stamp."""
    return {
        "snapshot_id": snapshot_id,
        "generated_at_utc": generated_at_utc,
        "status": "pending",
        "pending_reason": reason,
        "rows": [],
        "notes": (
            "Live odds ingestion pending. No real bookmaker lines are available "
            "yet, so no divergence rows are published. The previous synthetic, "
            "Elo-derived rows (which carried a bookmaker source attribution they "
            "did not come from) have been retired. When a real odds key is "
            "provisioned and the odds producer runs, real de-vigged divergence "
            "appears here."
        ),
    }


def _confidence_band(p: float, n_runs: int) -> list[float]:
    """A simple 95% binomial band around the Monte Carlo frequency estimate."""
    if n_runs <= 0:
        return [p, p]
    se = math.sqrt(max(p * (1.0 - p), 0.0) / n_runs)
    return [max(0.0, p - 1.96 * se), min(1.0, p + 1.96 * se)]


def build_divergence(
    snapshot_id: str,
    generated_at_utc: str,
    odds_df: pd.DataFrame,
    distributions: pd.DataFrame,
    model_map: pd.DataFrame,
    code_sha: str,
    n_runs: int = 10000,
) -> dict:
    """Build real, de-vigged 1X2 divergence rows from live Pinnacle odds.

    odds_df must carry the canonical producer schema (snapshot_id, match_id,
    bookmaker, market_type, outcome, decimal_odds, is_closing). For each fixture
    with a complete closing 1X2 triple, de-vig via the power method and emit
    three rows (HOME / DRAW / AWAY) stamped source_book PINNACLE.
    """
    dist_by_id = {r["match_id"]: r for _, r in distributions.iterrows()}
    fixture_by_id = {r["match_id"]: r for _, r in model_map.iterrows()}

    closing = odds_df[
        (odds_df["market_type"] == "match_winner") & (odds_df.get("is_closing", True))
    ].copy()

    rows: list[dict] = []
    row_idx = 0
    for match_id, group in closing.groupby("match_id"):
        match_id = str(match_id)
        dist = dist_by_id.get(match_id)
        fixture = fixture_by_id.get(match_id)
        if dist is None or fixture is None:
            continue
        prices = {str(r["outcome"]): float(r["decimal_odds"]) for _, r in group.iterrows()}
        if not all(k in prices for k in _OUTCOME_KEYS):
            continue

        ordered = [prices[k] for k in _OUTCOME_KEYS]
        result = devig(
            ordered,
            book="pinnacle",
            market_type="match_winner",
            stage="group",
            outcome_labels=list(_OUTCOME_KEYS),
        )
        q_devigged = dict(zip(_OUTCOME_KEYS, result.q))

        for key in _OUTCOME_KEYS:
            p_model = float(dist[_P_MODEL_COL[key]])
            q = float(q_devigged[key])
            rows.append(
                {
                    "row_id": f"ROW-{row_idx:05d}",
                    "match_id": match_id,
                    "kickoff_utc": str(fixture["kickoff_utc"]),
                    "round": "GRP",
                    "home": {
                        "fifa_code": str(fixture["home_code"]),
                        "display_name": str(fixture["home_name"]),
                    },
                    "away": {
                        "fifa_code": str(fixture["away_code"]),
                        "display_name": str(fixture["away_name"]),
                    },
                    "market": "1X2",
                    "outcome": _OUTCOME_LABEL[key],
                    "p_model": round(p_model, 6),
                    "q_market_raw_decimal": round(prices[key], 4),
                    "q_market_devigged": round(q, 6),
                    "edge_E": round(p_model - q, 6),
                    "edge_threshold": _EDGE_THRESHOLD_MAINLINE,
                    "gate_status": "OPEN",
                    "gate_rules_tripped": [],
                    "snapshot_age_minutes": 0,
                    "confidence_band": [
                        round(x, 6) for x in _confidence_band(p_model, n_runs)
                    ],
                    "source_book": "PINNACLE",
                    "pinnacle_bias_applied": {
                        "draw_delta": _DRAW_DELTA,
                        "host_delta": _HOST_DELTA,
                    },
                    "model_version": f"M2_fifa@{code_sha}",
                    "history": [],
                }
            )
            row_idx += 1

    return {
        "snapshot_id": snapshot_id,
        "generated_at_utc": generated_at_utc,
        "status": "live",
        "rows": rows,
        "notes": (
            "Real de-vigged Pinnacle divergence. q_market is the power-method "
            "de-vigged closing line; p_model is the frozen champion (M2_fifa) "
            "per-match distribution."
        ),
    }
