"""
evaluation/reconstruct_forecasts.py
===================================
cp-14, commit 3 (Section 2 workstream 2). Decision A: reconstruction, framed
correctly.

The champion model M2 produced a full pre-tournament forecast for all 72 group
matches in the frozen, committed batch batch_20260512_013228Z (activated
2026-05-12, before the first kickoff, unchanged since). cp-14 does NOT re-run
the model and does NOT invent forecasts. It aggregates the committed Monte
Carlo regulation-goal samples into a per-match 1X2 distribution and scores that
frozen opening forecast against each result as it settles.

This is a legitimate, maximally defensible out-of-sample calibration: every
scored forecast provably predates its outcome (the batch activation timestamp
predates the earliest kickoff). The claim is narrow: the frozen pre-tournament
champion distributions are well calibrated against group-stage results. It is
NOT a market-timing or CLV claim. q_market, CLV, Nyberg, and DM-vs-market stay
null/pending until real odds ingestion is live, because there are no committed
market lines.

Every emitted ledger row is tagged with the source batch id, the batch
activation timestamp, and the code sha, so a reviewer can trace each forecast
back to the frozen artifact it was reconstructed from.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.accuracy_metrics import brier, log_loss, rps  # noqa: E402

ACTIVE_BATCH = PROJECT_ROOT / "data" / "calibration" / "active_batch.json"
GROUP_PHASE = "group"

# Website ledger outcome labels: "1" home, "X" draw, "2" away.
_OUTCOME_LABEL = {"H": "1", "D": "X", "A": "2"}


def batch_provenance() -> dict:
    """Frozen-batch provenance tags written onto every reconstructed row."""
    active = json.loads(ACTIVE_BATCH.read_text())
    return {
        "source_batch_id": active.get("active_batch_id", ""),
        "source_batch_activated_utc": active.get("activated_at_utc", ""),
        "source_strength_matrix_sha": active.get("matrix_sha256_lock", ""),
        "active_batch_path": active.get("active_batch_path", ""),
    }


def reconstruct_distributions(
    model_map: pd.DataFrame,
    batch_parquet: Optional[Path] = None,
) -> pd.DataFrame:
    """Aggregate the frozen M2 batch into a per-match 1X2 distribution.

    Returns columns: match_id (M{NN}), batch_slot, p_home, p_draw, p_away,
    n_runs, mc_seed. Probabilities are run frequencies over regulation goals
    and sum to 1 exactly. This is a pure aggregation of committed samples; the
    model is never re-run.
    """
    prov = batch_provenance()
    if batch_parquet is None:
        batch_parquet = PROJECT_ROOT / prov["active_batch_path"] / "match_runs_M2.parquet"
    batch = pd.read_parquet(
        batch_parquet,
        columns=["match_id", "phase", "reg_home_goals", "reg_away_goals", "seed"],
    )
    batch = batch[batch["phase"] == GROUP_PHASE]

    rows = []
    for _, m in model_map.iterrows():
        slot = m["batch_slot"]
        s = batch[batch["match_id"] == slot]
        n = len(s)
        if n == 0:
            continue
        hg = s["reg_home_goals"].to_numpy()
        ag = s["reg_away_goals"].to_numpy()
        p_home = float((hg > ag).mean())
        p_away = float((hg < ag).mean())
        p_draw = float(1.0 - p_home - p_away)
        # Representative seed: run 0's seed, a real value from the committed
        # batch (the aggregate has no single seed; provenance lives in the
        # source_batch_id tag).
        seed_series = s["seed"]
        mc_seed = int(seed_series.iloc[0]) if len(seed_series) else 0
        rows.append(
            {
                "match_id": m["match_id"],
                "batch_slot": slot,
                "p_home": p_home,
                "p_draw": p_draw,
                "p_away": p_away,
                "n_runs": n,
                "mc_seed": mc_seed,
            }
        )
    return pd.DataFrame(rows)


def _realized_label(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "1"
    if home_goals < away_goals:
        return "2"
    return "X"


def build_ledger_rows(
    scored: pd.DataFrame,
    distributions: pd.DataFrame,
    code_sha: str,
) -> list[dict]:
    """Build website ledger.jsonl rows for settled matches.

    Joins each settled match (scored, post-bijection) to its reconstructed M2
    distribution, computes the per-row proper-scoring contributions via
    accuracy_metrics, and tags provenance. Market-dependent fields
    (q_market_devigged_on_realized, edge, gate, clv, hit_miss) are null: there
    are no committed market lines, so a market claim would be invented.

    Rows are deterministic given the frozen batch, so regenerating the ledger
    each night is idempotent for already-settled matches and only appends rows
    as new matches settle.
    """
    prov = batch_provenance()
    dist_by_id = {r["match_id"]: r for _, r in distributions.iterrows()}

    rows: list[dict] = []
    for _, sc in scored.sort_values("match_id").iterrows():
        match_id = str(sc["match_id"])
        dist = dist_by_id.get(match_id)
        if dist is None:
            continue
        p = np.array([[dist["p_home"], dist["p_draw"], dist["p_away"]]], dtype=float)
        realized = _realized_label(int(sc["home_goals"]), int(sc["away_goals"]))
        idx = {"1": 0, "X": 1, "2": 2}[realized]
        y = np.zeros((1, 3), dtype=float)
        y[0, idx] = 1.0

        rows.append(
            {
                "forecast_id": f"recon-{prov['source_batch_id']}-{match_id}-1x2-M_STAR",
                "match_id": match_id,
                "model_id": "M_STAR",
                "market": "1X2",
                "outcome_predicted_distribution": {
                    "1": round(float(dist["p_home"]), 6),
                    "X": round(float(dist["p_draw"]), 6),
                    "2": round(float(dist["p_away"]), 6),
                },
                "outcome_realized": realized,
                "p_model_on_realized": round(float(p[0, idx]), 6),
                # Market layer pending real odds ingestion (Pinnacle / Odds API).
                "q_market_devigged_on_realized": None,
                "edge_E_at_close": None,
                "gate_status_at_close": None,
                "brier_contribution": round(float(brier(p, y)[0]), 6),
                "log_loss_contribution": round(float(log_loss(p, y)[0]), 6),
                "rps_contribution": round(float(rps(p, y)[0]), 6),
                "clv_bps": None,
                "hit_miss_label": None,
                "code_sha": code_sha,
                "data_sha": prov["source_strength_matrix_sha"],
                "mc_seed": int(dist["mc_seed"]),
                "settled_at_utc": (
                    None if pd.isna(sc.get("settled_at")) else str(sc.get("settled_at"))
                ),
                # cp-14 provenance: this forecast was reconstructed from the
                # frozen pre-tournament champion batch, not emitted live.
                "provenance": "reconstructed_frozen_pretournament_batch",
                "source_batch_id": prov["source_batch_id"],
                "source_batch_activated_utc": prov["source_batch_activated_utc"],
            }
        )
    return rows
