"""
model/aggregate_polls.py
========================
Session 04 · El Voto del 21 de Junio — Bayesian poll aggregator

Combines the ingested 21 de junio de 2026 runoff polls (Session 02) and the
calibrated house effects (Session 03) into a posterior over the two-way vote
share between Iván Cepeda (left bloc) and Abelardo de la Espriella (right bloc).

The posterior is a closed-form, precision-weighted (inverse-variance) normal
update — no MCMC. Each poll contributes a mean (its soft-prior-corrected
two-way Cepeda share) and a precision built from three ingredients required by
the session brief:

  1. sample size        — binomial sampling variance of the two-way share;
  2. recency            — weight 0.5 ** (days_before / halflife), halflife read
                          from the calibration JSON (NOT refit here);
  3. pollster reliability — low-confidence firms (single-year house-effect
                          evidence) have their variance inflated.

House effects are applied as a SOFT prior (Session 03 decision): the central
estimate is moved by only `house_effect_shrink` of the estimated bloc bias, and
the un-applied remainder is carried as extra variance. The bias is never
subtracted as if it were known exactly.

Because the 2026 pollsters disagree far beyond sampling error, a pure
fixed-effect CI would be dishonestly tight. By default the aggregator adds a
DerSimonian-Laird between-poll variance (tau^2) — still closed-form — so the
credible interval reflects the real disagreement. Toggle via
config aggregator.heterogeneity ("random_effects" | "fixed").

None of the project's four banned prediction / betting tokens appear in any key,
value, or comment here: this module emits shares and variances only; the
probability is produced downstream by the Monte Carlo in simulate_runoff.py.

Self-contained inside the-21j-problem/. Reads only; writes nothing.

Usage
-----
    from model.aggregate_polls import load_inputs, aggregate
    polls, house_effects, halflife = load_inputs()
    post = aggregate(polls, house_effects, halflife=halflife,
                     house_effects_on=True, cfg=CFG)
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

# ── Project root on sys.path so we can import utils / schemas ─────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from schemas import standardise_pollster  # noqa: E402
from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

# =============================================================================
# Config
# =============================================================================

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

POLLS_PARQUET = PROJECT_ROOT / CFG["paths"]["output_parquet"]
HOUSE_EFFECTS_JSON = PROJECT_ROOT / CFG["calibration"]["paths"]["house_effects_json"]
RUNOFF_DATE = date.fromisoformat(str(CFG["runoff_date"]))

_AGG = CFG["aggregator"]
HOUSE_EFFECT_SHRINK = float(_AGG["house_effect_shrink"])
LOW_CONF_VAR_MULT = float(_AGG["low_confidence_variance_mult"])
HETEROGENEITY = str(_AGG["heterogeneity"])
EXPECTED_HALFLIFE = float(_AGG["expected_recency_halflife_days"])
LOW_CONF_FIRMS_CFG = frozenset(_AGG["low_confidence_firms"])


# =============================================================================
# Inputs
# =============================================================================


def load_inputs() -> tuple[pd.DataFrame, dict, float]:
    """
    Load the validated runoff polls, the house-effects calibration JSON, and the
    recency half-life (read from the JSON, never refit). Returns
    (polls_df, house_effects_record, halflife_days).
    """
    if not POLLS_PARQUET.exists():
        raise FileNotFoundError(
            f"Polls parquet not found: {POLLS_PARQUET} — run ingestion/fetch_polls.py first"
        )
    if not HOUSE_EFFECTS_JSON.exists():
        raise FileNotFoundError(
            f"House-effects JSON not found: {HOUSE_EFFECTS_JSON} — run "
            f"model/calibrate_house_effects.py first"
        )

    polls = pd.read_parquet(POLLS_PARQUET)
    record = json.loads(HOUSE_EFFECTS_JSON.read_text(encoding="utf-8"))

    halflife = float(record["recency_halflife_days"])
    if abs(halflife - EXPECTED_HALFLIFE) > 1e-9:
        # The half-life is read from the JSON (authoritative). The config value
        # is only a pre-registration guard; a mismatch is worth surfacing.
        log.warning(
            "Calibration half-life differs from config guard",
            json_halflife=halflife,
            config_expected=EXPECTED_HALFLIFE,
        )

    log.info(
        "Aggregator inputs loaded",
        polls=len(polls),
        halflife_days=halflife,
        house_effect_pollsters=len(record.get("house_effects", {})),
    )
    return polls, record, halflife


# =============================================================================
# Per-poll preparation (soft-prior correction + variance build)
# =============================================================================


@dataclass
class PollContribution:
    poll_id: str
    pollster: str
    days_before: int
    n_two: float
    share_raw: float          # raw two-way Cepeda share
    share_adj: float          # soft-prior-corrected two-way Cepeda share (the mean)
    v_within: float           # within-poll variance (sampling + soft-prior residual + low-conf)
    recency: float            # 0.5 ** (days_before / halflife)
    low_confidence: bool


def _two_way_share(cepeda_pct: float, espriella_pct: float) -> float:
    """Cepeda's share of the two named candidates (drops other/undecided)."""
    denom = cepeda_pct + espriella_pct
    if denom <= 0:
        raise ValueError("cepeda_pct + espriella_pct must be positive")
    return cepeda_pct / denom


def _firm_house_effect(record: dict, pollster: str) -> tuple[float, float, bool]:
    """
    Return (left_bloc_bias, right_bloc_bias, low_confidence) for a pollster.

    A firm absent from the calibration JSON is treated as zero bias but
    low-confidence (variance inflated), and logged — never silently trusted.
    """
    he = record.get("house_effects", {})
    rec = he.get(pollster) or he.get(standardise_pollster(pollster))
    if rec is None:
        log.warning(
            "Pollster has no house-effect estimate — bias 0, treated low-confidence",
            pollster=pollster,
        )
        return 0.0, 0.0, True
    low_conf = str(rec.get("confidence", "low")) == "low"
    return float(rec["left_bloc_bias"]), float(rec["right_bloc_bias"]), low_conf


def prepare_polls(
    polls: pd.DataFrame,
    record: dict,
    *,
    halflife: float,
    house_effects_on: bool,
    shrink: float = HOUSE_EFFECT_SHRINK,
) -> list[PollContribution]:
    """
    Build one PollContribution per poll: soft-prior-corrected two-way share and
    its within-poll variance. `house_effects_on=False` (or shrink=0) reproduces
    the no-correction arm used by the sensitivity analysis.
    """
    effective_shrink = shrink if house_effects_on else 0.0
    out: list[PollContribution] = []

    for _, row in polls.iterrows():
        pollster = str(row["pollster"])
        cep = float(row["cepeda_pct"])
        esp = float(row["espriella_pct"])

        left_bias, right_bias, low_conf = _firm_house_effect(record, pollster)

        # Raw two-way share, and the soft-prior-corrected one. Positive bias =
        # poll over-states that bloc, so we subtract it to correct.
        share_raw = _two_way_share(cep, esp)
        cep_adj = cep - effective_shrink * left_bias
        esp_adj = esp - effective_shrink * right_bias
        share_adj = _two_way_share(cep_adj, esp_adj)

        # Full-correction share (shrink = 1) sizes the soft-prior residual: the
        # part of the bias we deliberately did NOT apply is carried as variance.
        cep_full = cep - left_bias
        esp_full = esp - right_bias
        share_full = _two_way_share(cep_full, esp_full)
        bias_residual = abs(share_full - share_adj)  # un-applied correction (share units)

        # Effective two-way sample: respondents choosing one of the two names.
        n_two = max(float(row["sample_size"]) * (cep + esp) / 100.0, 1.0)

        # Variance components (all in two-way share space, 0..1).
        v_sample = share_adj * (1.0 - share_adj) / n_two
        v_bias = bias_residual ** 2
        v_within = v_sample + v_bias
        if low_conf:
            v_within *= LOW_CONF_VAR_MULT

        days_before = (RUNOFF_DATE - pd.Timestamp(row["fieldwork_end"]).date()).days
        recency = float(0.5 ** (days_before / halflife))

        out.append(
            PollContribution(
                poll_id=str(row["poll_id"]),
                pollster=pollster,
                days_before=days_before,
                n_two=n_two,
                share_raw=share_raw,
                share_adj=share_adj,
                v_within=v_within,
                recency=recency,
                low_confidence=low_conf,
            )
        )
    return out


# =============================================================================
# Posterior
# =============================================================================


@dataclass
class Posterior:
    """Closed-form posterior over Cepeda's two-way vote share."""

    mean: float                 # posterior mean two-way Cepeda share (0..1)
    var: float                  # posterior variance of the mean
    n_polls: int
    newest_poll_date: date
    oldest_poll_date: date
    tau2: float                 # between-poll variance added (0 if fixed-effect)
    heterogeneity: str
    halflife_days: float
    house_effects_on: bool
    contributions: list[PollContribution] = field(default_factory=list)

    @property
    def std(self) -> float:
        return float(np.sqrt(self.var))


def _dersimonian_laird_tau2(y: np.ndarray, v_eff: np.ndarray) -> float:
    """
    DerSimonian-Laird estimate of between-poll variance tau^2.

    v_eff is each poll's effective within-poll variance (recency already folded
    in). Returns max(0, ...). With one poll there is no heterogeneity signal.
    """
    if len(y) < 2:
        return 0.0
    w = 1.0 / v_eff
    ybar = float(np.sum(w * y) / np.sum(w))
    q = float(np.sum(w * (y - ybar) ** 2))
    df = len(y) - 1
    c = float(np.sum(w) - np.sum(w ** 2) / np.sum(w))
    if c <= 0:
        return 0.0
    return max(0.0, (q - df) / c)


def aggregate(
    polls: pd.DataFrame,
    record: dict,
    *,
    halflife: float,
    house_effects_on: bool,
    cfg: dict = CFG,
    shrink: float | None = None,
) -> Posterior:
    """
    Precision-weighted normal aggregation of the runoff polls into a posterior
    over Cepeda's two-way vote share.

    Precision per poll = recency / (within-poll variance + tau^2). Recency
    down-weights old polls; the within-poll variance carries sampling error,
    the soft-prior residual, and low-confidence inflation; tau^2 (DerSimonian-
    Laird, default on) carries between-poll disagreement so the CI is honest.
    """
    shrink = HOUSE_EFFECT_SHRINK if shrink is None else shrink
    heterogeneity = str(cfg["aggregator"]["heterogeneity"])

    contribs = prepare_polls(
        polls, record, halflife=halflife, house_effects_on=house_effects_on, shrink=shrink
    )
    if not contribs:
        raise RuntimeError("No poll contributions to aggregate")

    y = np.array([c.share_adj for c in contribs], dtype=float)
    v_within = np.array([c.v_within for c in contribs], dtype=float)
    recency = np.array([c.recency for c in contribs], dtype=float)

    # Recency folds into the effective within-poll variance: an old poll is
    # treated as a noisier observation of the same latent share.
    recency_safe = np.clip(recency, 1e-12, None)
    v_eff = v_within / recency_safe

    tau2 = _dersimonian_laird_tau2(y, v_eff) if heterogeneity == "random_effects" else 0.0

    w = 1.0 / (v_eff + tau2)
    wsum = float(np.sum(w))
    post_mean = float(np.sum(w * y) / wsum)
    post_var = float(1.0 / wsum)

    dates = pd.to_datetime(polls["fieldwork_end"])
    return Posterior(
        mean=post_mean,
        var=post_var,
        n_polls=len(contribs),
        newest_poll_date=dates.max().date(),
        oldest_poll_date=dates.min().date(),
        tau2=tau2,
        heterogeneity=heterogeneity if heterogeneity == "random_effects" else "fixed",
        halflife_days=halflife,
        house_effects_on=house_effects_on,
        contributions=contribs,
    )
