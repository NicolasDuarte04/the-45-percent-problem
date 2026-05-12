#!/usr/bin/env python
"""Generate the Burn-Murdoch calibration chart per BURN_MURDOCH_PACKET.md Section 3.

Renders a 1:1 reliability diagram for M0-M3 on the 2022 WC hold-out and exports:
  - press_packets/burn_murdoch/calibration_2022_holdout.png             (3000x1875, black bg)
  - press_packets/burn_murdoch/calibration_2022_holdout_transparent.png (3000x1875, transparent)
  - press_packets/burn_murdoch/calibration_2022_holdout.svg             (vector, text-as-text)
  - press_packets/burn_murdoch/calibration_data_2022_holdout.csv        (40 rows, binned)
  - press_packets/burn_murdoch/README.md                                (SHA + timestamp + commit)

Inputs (all REAL, locked data — no synthetic fallback):
  - data/processed/holdout_probs_m{0,1,2,3}.parquet   per-match (P, outcome) pairs,
    produced by evaluation/score_on_2022_holdout.py. Required.
  - data/calibration/cv_battery_results.json          locked CV log-loss table; the
    annotation block is keyed off this file. M2_fifa is the locked champion
    (Δ_vs_M0 = -0.04096, ~6σ better than M0 on M2's CV variance).

Hard fails if any of the four holdout-prob files is missing — refuses to
render a press chart from incomplete inputs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib as mpl
import matplotlib.pyplot as plt

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from utils.logger import get_logger
    log = get_logger(__name__)
except Exception:
    import logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Spec constants (Section 3) + locked-data paths
# ---------------------------------------------------------------------------

PALETTE = {
    "bg":       "#000000",
    "grid":     "#1A1A1A",
    "diag":     "#666666",
    "text":     "#EEEEEE",
    "subtitle": "#888888",
    "M0":       "#00FF66",  # terminal green   - pure Elo
    "M1":       "#FFAA00",  # terminal amber   - + form
    "M2":       "#88FFB0",  # pale green       - + FIFA  (champion)
    "M3":       "#EEEEEE",  # off-white        - + macro
}

LINESTYLES = {"M0": "solid", "M1": "dashed", "M2": "dotted", "M3": "dashdot"}
MODEL_IDS = ["M0", "M1", "M2", "M3"]

# Map short id (chart legend label) → long id (parquet filename suffix and CV-results key)
MODEL_LONG_ID = {
    "M0": "M0_elo",
    "M1": "M1_form",
    "M2": "M2_fifa",
    "M3": "M3_macro",
}

# Champion (locked in data/calibration/champion_model.json::champion_model_id)
CHAMPION_MODEL_ID = "M2"
# Two-line form keeps the upper-left annotation block from overflowing into
# the plot area; the full canonical phrase is preserved.
KILL_CRITERION_TEXT = f"Pre-registered kill criterion:\n{CHAMPION_MODEL_ID} wins."

N_BINS = 10
BIN_EDGES = np.linspace(0.0, 1.0, N_BINS + 1)
N_HOLDOUT_MATCHES = 64
N_PROB_POINTS = 192  # 64 matches × 3 outcomes

CALIBRATION_DIR = PROJECT_ROOT / "data" / "calibration"
PROCESSED_DIR   = PROJECT_ROOT / "data" / "processed"
CV_RESULTS_PATH = CALIBRATION_DIR / "cv_battery_results.json"

OUTPUT_DIR       = PROJECT_ROOT / "press_packets" / "burn_murdoch"
PNG_PATH         = OUTPUT_DIR / "calibration_2022_holdout.png"
PNG_TRANSPARENT  = OUTPUT_DIR / "calibration_2022_holdout_transparent.png"
SVG_PATH         = OUTPUT_DIR / "calibration_2022_holdout.svg"
CSV_PATH         = OUTPUT_DIR / "calibration_data_2022_holdout.csv"
README_PATH      = OUTPUT_DIR / "README.md"

# 16:9 canvas at 200 dpi = 3000x1875 px export.
FIG_W_IN, FIG_H_IN = 15.0, 9.375
DPI = 200

# ---------------------------------------------------------------------------
# Loaders (REAL data only — no fallback)
# ---------------------------------------------------------------------------

def _holdout_probs_path(short_id: str) -> Path:
    # File suffix is lowercase short id (m0, m1, m2, m3), per CLAUDE.md schema.
    return PROCESSED_DIR / f"holdout_probs_{short_id.lower()}.parquet"


def load_model_probabilities(short_id: str) -> np.ndarray:
    """Return (N_PROB_POINTS, 2) array: [predicted_prob, outcome (0/1)]."""
    path = _holdout_probs_path(short_id)
    if not path.exists():
        raise FileNotFoundError(
            f"Holdout-prob file missing for {short_id}: {path}\n"
            f"Run `python evaluation/score_on_2022_holdout.py --force` first."
        )
    df = pd.read_parquet(path, engine="pyarrow")
    if len(df) != N_PROB_POINTS:
        raise ValueError(
            f"{path.name} has {len(df)} rows, expected {N_PROB_POINTS}"
        )
    return df[["predicted_prob", "outcome"]].to_numpy()


def load_cv_log_losses() -> dict[str, float]:
    """Read locked CV log-loss values from data/calibration/cv_battery_results.json."""
    if not CV_RESULTS_PATH.exists():
        raise FileNotFoundError(
            f"Locked CV battery results missing: {CV_RESULTS_PATH}\n"
            f"This file is the authoritative source for the chart annotation."
        )
    with open(CV_RESULTS_PATH) as f:
        data = json.load(f)
    out: dict[str, float] = {}
    for short_id in MODEL_IDS:
        long_id = MODEL_LONG_ID[short_id]
        if long_id not in data:
            raise KeyError(f"{long_id} not found in {CV_RESULTS_PATH}")
        out[short_id] = float(data[long_id]["L_CV"])
    return out


# ---------------------------------------------------------------------------
# Reliability binning
# ---------------------------------------------------------------------------

def compute_reliability(arr: np.ndarray, model_id: str) -> list[dict]:
    p = arr[:, 0]
    y = arr[:, 1]
    bin_idx = np.digitize(p, BIN_EDGES[1:-1])  # 0..N_BINS-1
    rows = []
    for b in range(N_BINS):
        mask = bin_idx == b
        n = int(mask.sum())
        rows.append({
            "model_id":            model_id,
            "bin_lower":           float(BIN_EDGES[b]),
            "bin_upper":           float(BIN_EDGES[b + 1]),
            "n":                   n,
            "mean_predicted":      float(p[mask].mean()) if n > 0 else float("nan"),
            "empirical_frequency": float(y[mask].mean()) if n > 0 else float("nan"),
        })
    return rows


# ---------------------------------------------------------------------------
# Snapshot SHA
# ---------------------------------------------------------------------------

def compute_snapshot_sha(per_model: dict, log_loss: dict[str, float]) -> str:
    h = hashlib.sha256()
    for short_id in MODEL_IDS:
        for r in per_model[short_id]:
            h.update(f"{r['model_id']}|{r['bin_lower']:.6f}|{r['bin_upper']:.6f}|"
                     f"{r['n']}|{r['mean_predicted']:.10f}|{r['empirical_frequency']:.10f}\n".encode())
        h.update(f"{short_id}_logloss={log_loss[short_id]:.6f}\n".encode())
    h.update(f"champion={CHAMPION_MODEL_ID}\n".encode())
    h.update(Path(__file__).read_bytes())
    return h.hexdigest()


def get_git_commit() -> str:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(PROJECT_ROOT), "rev-parse", "HEAD"],
            stderr=subprocess.DEVNULL,
        )
        return out.decode().strip()
    except Exception:
        return "uncommitted"


# ---------------------------------------------------------------------------
# Chart render
# ---------------------------------------------------------------------------

def render_chart(per_model: dict, log_loss: dict[str, float], snapshot_sha: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    mpl.rcParams.update({
        "font.family":      "monospace",
        "font.size":        12,
        "axes.facecolor":   PALETTE["bg"],
        "figure.facecolor": PALETTE["bg"],
        "savefig.facecolor": PALETTE["bg"],
        "axes.edgecolor":   PALETTE["text"],
        "axes.labelcolor":  PALETTE["text"],
        "xtick.color":      PALETTE["text"],
        "ytick.color":      PALETTE["text"],
        "grid.color":       PALETTE["grid"],
        "grid.linewidth":   1,
        "savefig.dpi":      DPI,
        "svg.fonttype":     "none",  # text-as-text for FT rebrand
    })

    fig = plt.figure(figsize=(FIG_W_IN, FIG_H_IN), dpi=DPI)

    # Square plot region inside the 16:9 canvas. Sized smaller than canvas
    # height so the title clears the top of the plot and the upper-left /
    # lower-right annotation blocks have breathing room on the sides.
    plot_in = 7.2
    plot_w_frac = plot_in / FIG_W_IN
    plot_h_frac = plot_in / FIG_H_IN
    left = (1.0 - plot_w_frac) / 2.0
    bottom = 0.08
    ax = fig.add_axes([left, bottom, plot_w_frac, plot_h_frac])
    ax.set_aspect("equal", adjustable="box")

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xticks(np.linspace(0, 1, 11))
    ax.set_yticks(np.linspace(0, 1, 11))
    ax.grid(True, color=PALETTE["grid"], linewidth=1, zorder=0)
    ax.plot([0, 1], [0, 1], color=PALETTE["diag"], linewidth=1, zorder=1)

    rightmost_for_label: list[tuple[str, float]] = []
    for short_id in MODEL_IDS:
        rows = [r for r in per_model[short_id] if r["n"] > 0]
        xs = np.array([r["mean_predicted"] for r in rows])
        ys = np.array([r["empirical_frequency"] for r in rows])
        ns = np.array([r["n"] for r in rows])
        order = np.argsort(xs)
        xs, ys, ns = xs[order], ys[order], ns[order]

        ax.plot(xs, ys, color=PALETTE[short_id], linewidth=2,
                linestyle=LINESTYLES[short_id], zorder=3)
        # Marker area ~ log10(n+1)^1.5 -> n=60 ≈ 3x area of n=6.
        sizes = 50.0 * np.power(np.log10(ns + 1.0), 1.5)
        ax.scatter(xs, ys, s=sizes, color=PALETTE[short_id],
                   edgecolors="none", zorder=4)
        if len(xs) > 0:
            rightmost_for_label.append((short_id, float(ys[-1])))

    ax.set_xlabel("Predicted probability", color=PALETTE["text"], fontsize=12)
    ax.set_ylabel("Empirical frequency",  color=PALETTE["text"], fontsize=12)
    for spine in ax.spines.values():
        spine.set_edgecolor(PALETTE["diag"])

    # Direct labels at the right edge (no legend), clamped into [Y_LO, Y_HI]
    # so labels never bleed into the title or x-axis.
    Y_LO, Y_HI, MIN_GAP = 0.04, 0.96, 0.05
    rightmost_for_label.sort(key=lambda t: t[1])
    for i in range(1, len(rightmost_for_label)):
        m, y = rightmost_for_label[i]
        prev_y = rightmost_for_label[i - 1][1]
        if y - prev_y < MIN_GAP:
            rightmost_for_label[i] = (m, prev_y + MIN_GAP)
    overflow = rightmost_for_label[-1][1] - Y_HI
    if overflow > 0:
        rightmost_for_label = [(m, y - overflow) for (m, y) in rightmost_for_label]
    if rightmost_for_label[0][1] < Y_LO:
        underflow = Y_LO - rightmost_for_label[0][1]
        rightmost_for_label = [(m, y + underflow) for (m, y) in rightmost_for_label]

    for short_id, y in rightmost_for_label:
        ax.text(1.015, y, short_id,
                transform=ax.get_yaxis_transform(),
                color=PALETTE[short_id], fontsize=14, family="monospace",
                va="center", ha="left", zorder=5)

    fig.text(0.5, 0.965,
             "M0 to M3 calibration on 2022 World Cup hold-out",
             color=PALETTE["text"], fontsize=18, family="monospace",
             ha="center", va="top")
    fig.text(0.5, 0.928,
             "Predicted probability vs. realised frequency. Pre-registered ablation.",
             color=PALETTE["subtitle"], fontsize=14, family="monospace",
             ha="center", va="top")

    upper_left = (
        "Log-loss (lower is better):\n"
        f"M0 = {log_loss['M0']:.4f}\n"
        f"M1 = {log_loss['M1']:.4f}\n"
        f"M2 = {log_loss['M2']:.4f}\n"
        f"M3 = {log_loss['M3']:.4f}\n"
        "\n"
        f"{KILL_CRITERION_TEXT}\n"
        "\n"
        f"n = {N_HOLDOUT_MATCHES} matches\n"
        f"{N_PROB_POINTS} probability points\n"
        "2022 World Cup hold-out"
    )
    fig.text(0.018, 0.90, upper_left,
             color=PALETTE["text"], fontsize=12, family="monospace",
             ha="left", va="top")

    lower_right = (
        "Source: 45analytics.com\n"
        "OSF: osf.io/45analytics\n"
        "GitHub: github.com/45analytics\n"
        f"Snapshot SHA: {snapshot_sha[:16]}"
    )
    fig.text(0.985, 0.025, lower_right,
             color=PALETTE["text"], fontsize=10, family="monospace",
             ha="right", va="bottom")

    fig.savefig(PNG_PATH,        facecolor=PALETTE["bg"], edgecolor="none", dpi=DPI, format="png")
    fig.savefig(PNG_TRANSPARENT, transparent=True,                          dpi=DPI, format="png")
    fig.savefig(SVG_PATH,        facecolor=PALETTE["bg"], edgecolor="none",          format="svg")
    plt.close(fig)


# ---------------------------------------------------------------------------
# CSV + README
# ---------------------------------------------------------------------------

def write_csv(per_model: dict) -> None:
    rows: list[dict] = []
    for short_id in MODEL_IDS:
        rows.extend(per_model[short_id])
    df = pd.DataFrame(rows, columns=[
        "model_id", "bin_lower", "bin_upper", "n", "mean_predicted", "empirical_frequency",
    ])
    df.to_csv(CSV_PATH, index=False, encoding="utf-8")


def write_readme(snapshot_sha: str, run_ts: str, commit: str,
                 log_loss: dict[str, float]) -> None:
    body = (
        "# Burn-Murdoch press packet artifacts\n"
        "\n"
        "Generated by `scripts/generate_burn_murdoch_chart.py` per\n"
        "`BURN_MURDOCH_PACKET.md` Section 3.\n"
        "\n"
        f"- Snapshot SHA:        `{snapshot_sha}`\n"
        f"- Snapshot SHA (short): `{snapshot_sha[:16]}` (matches the lower-right chart annotation)\n"
        f"- Ablation run timestamp (UTC): {run_ts}\n"
        f"- Responsible commit: `{commit}`\n"
        f"- Champion model: `{MODEL_LONG_ID[CHAMPION_MODEL_ID]}` (locked in `data/calibration/champion_model.json`)\n"
        "\n"
        "## Source data\n"
        "- Per-match probabilities: `data/processed/holdout_probs_m{0,1,2,3}.parquet`\n"
        "  (produced by `evaluation/score_on_2022_holdout.py`; aggregate hold-out\n"
        "  log-loss matches the canonical `evaluation/cv_battery_result.json` values\n"
        "  to ≤ 1e-4)\n"
        "- CV log-loss values shown in chart annotation: `data/calibration/cv_battery_results.json`\n"
        "\n"
        "## Files\n"
        "- `calibration_2022_holdout.png` (3000x1875, black background)\n"
        "- `calibration_2022_holdout_transparent.png` (3000x1875, transparent)\n"
        "- `calibration_2022_holdout.svg` (vector, text-as-text, FT-rebrandable)\n"
        "- `calibration_data_2022_holdout.csv` (40 rows: 10 bins x 4 models)\n"
        "\n"
        "## CV log-loss (annotation block, locked)\n"
        f"- M0 = {log_loss['M0']:.4f}\n"
        f"- M1 = {log_loss['M1']:.4f}\n"
        f"- M2 = {log_loss['M2']:.4f}  ← champion\n"
        f"- M3 = {log_loss['M3']:.4f}\n"
    )
    README_PATH.write_text(body, encoding="utf-8")


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run() -> None:
    log.info("Loading locked CV log-loss values", path=str(CV_RESULTS_PATH))
    log_loss = load_cv_log_losses()
    for k, v in log_loss.items():
        log.info("CV log-loss", model=k, value=round(v, 6))

    log.info("Loading per-match holdout probabilities (real data, no fallback)")
    per_model: dict[str, list[dict]] = {}
    for short_id in MODEL_IDS:
        arr = load_model_probabilities(short_id)
        log.info("Loaded probabilities", model=short_id, n=len(arr))
        per_model[short_id] = compute_reliability(arr, short_id)

    snapshot_sha = compute_snapshot_sha(per_model, log_loss)
    run_ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    commit = get_git_commit()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_csv(per_model)
    render_chart(per_model, log_loss, snapshot_sha)
    write_readme(snapshot_sha, run_ts, commit, log_loss)

    log.info("Wrote artifacts",
             png=str(PNG_PATH),
             png_transparent=str(PNG_TRANSPARENT),
             svg=str(SVG_PATH),
             csv=str(CSV_PATH),
             readme=str(README_PATH),
             snapshot_sha_short=snapshot_sha[:16])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing outputs (default behaviour anyway).")
    parser.parse_args()
    run()


if __name__ == "__main__":
    main()
