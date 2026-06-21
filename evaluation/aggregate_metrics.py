"""
evaluation/aggregate_metrics.py
===============================
cp-14, commit 4 (Section 2 workstream 3). Aggregate the reconstructed ledger
into the published evaluation_metrics.json.

The per-row Brier / RPS / log-loss contributions were computed in
reconstruct_forecasts via accuracy_metrics. The champion (M_STAR) aggregate is
just their mean over the settled group matches. Only M_STAR is populated: the
M0 / M1 / M3 ablation arms would each need their own committed batch, which is
out of cp-14 scope, so they stay null. Market-dependent metrics (CLV, Nyberg,
Diebold-Mariano vs market) stay null until odds ingestion is live, consistent
with the narrow proper-scoring calibration claim.

The kill-criteria block is carried through unchanged: it is locked
pre-registration state and cp-14 does not touch the champion lock.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.accuracy_metrics import brier, log_loss, rps  # noqa: E402

_LABEL_IDX = {"1": 0, "X": 1, "2": 2}


def compute_champion_metrics(ledger_rows: list[dict]) -> dict:
    """Return {n, brier, rps, log_loss} for M_STAR over the settled ledger.

    Recomputes the aggregate directly from the predicted distributions and
    realised outcomes via accuracy_metrics (rather than averaging the stored
    contributions) so the aggregate has a single, auditable derivation. Returns
    null metrics when there are no settled rows.
    """
    rows = [r for r in ledger_rows if r.get("model_id") == "M_STAR"]
    n = len(rows)
    if n == 0:
        return {"n": 0, "brier": None, "rps": None, "log_loss": None}

    p = np.zeros((n, 3), dtype=float)
    y = np.zeros((n, 3), dtype=float)
    for i, r in enumerate(rows):
        d = r["outcome_predicted_distribution"]
        p[i, 0], p[i, 1], p[i, 2] = d["1"], d["X"], d["2"]
        y[i, _LABEL_IDX[r["outcome_realized"]]] = 1.0

    return {
        "n": n,
        "brier": round(float(brier(p, y).mean()), 6),
        "rps": round(float(rps(p, y).mean()), 6),
        "log_loss": round(float(log_loss(p, y).mean()), 6),
    }


def compute_reliability_diagram(ledger_rows: list[dict]) -> list[dict]:
    """Return decile reliability bins for M_STAR over the settled ledger.

    Standard confidence-calibration reliability diagram (Guo et al. 2017): one
    point per settled match, so the bin counts sum to the number of M_STAR rows.

    Binning definition (documented per checkpoint requirement):
      - The probability that is binned is the model's CONFIDENCE, i.e. the
        largest of the three predicted class probabilities max(p1, pX, p2) -- the
        probability assigned to the model's predicted (argmax) outcome.
      - frequency_realized is the ACCURACY within the bin: the fraction of
        matches in the bin whose predicted (argmax) outcome equals the realised
        outcome. On the diagonal, mean confidence equals realised frequency
        (perfect calibration).
      - Bins are the 10 equal deciles [0.0, 0.1), [0.1, 0.2), ..., [0.9, 1.0],
        with the final bin closed at 1.0. Only non-empty bins (n >= 1) are
        returned, matching the component which renders one point per decile bin.

    The (match, confidence, hit) triples come from the SAME reconstructed frozen
    ledger rows that feed the M_STAR scalar metrics, so the diagram is derived
    from the frozen pre-tournament champion batch, never the active re-sim batch.
    """
    rows = [r for r in ledger_rows if r.get("model_id") == "M_STAR"]
    if not rows:
        return []

    confidences = np.empty(len(rows), dtype=float)
    hits = np.empty(len(rows), dtype=float)
    for i, r in enumerate(rows):
        d = r["outcome_predicted_distribution"]
        probs = (d["1"], d["X"], d["2"])
        pred_idx = int(np.argmax(probs))
        confidences[i] = probs[pred_idx]
        hits[i] = 1.0 if pred_idx == _LABEL_IDX[r["outcome_realized"]] else 0.0

    bins: list[dict] = []
    for k in range(10):
        lower = k / 10.0
        upper = (k + 1) / 10.0
        # Last decile is closed on the right so confidence == 1.0 is included.
        if k == 9:
            mask = (confidences >= lower) & (confidences <= upper)
        else:
            mask = (confidences >= lower) & (confidences < upper)
        n = int(mask.sum())
        if n == 0:
            continue
        bins.append(
            {
                "bin_lower": round(lower, 4),
                "bin_upper": round(upper, 4),
                "p_model_mean": round(float(confidences[mask].mean()), 6),
                "frequency_realized": round(float(hits[mask].mean()), 6),
                "n": n,
            }
        )
    return bins


def update_evaluation_metrics(prior: dict, ledger_rows: list[dict]) -> dict:
    """Write the champion proper-scoring metrics into an evaluation_metrics dict.

    Mutates a copy of `prior` (the carried-forward metrics) and returns it. M0 /
    M1 / M2 / M3 are left at their prior (null) values; only M_STAR is populated
    from the reconstructed ledger. Market and significance fields are untouched
    (they stay null / pending). The kill-criteria block is preserved verbatim.

    Also writes `reliability_diagram` (calibration deciles) from the same frozen
    ledger rows; empty when nothing is settled.
    """
    out = dict(prior)
    champ = compute_champion_metrics(ledger_rows)

    for key in ("brier", "rps", "log_loss"):
        block = dict(out.get(key) or {"M0": None, "M1": None, "M2": None, "M3": None, "M_STAR": None})
        block["M_STAR"] = champ[key]
        out[key] = block

    # Explicit honest sample size for the UI; never implies significance.
    out["champion_metric_n"] = champ["n"]

    # Calibration reliability diagram, derived from the same frozen ledger rows
    # as the M_STAR scalars above (never the active re-sim batch). Empty when no
    # rows are settled, matching the carry-forward placeholder.
    out["reliability_diagram"] = compute_reliability_diagram(ledger_rows)
    return out
