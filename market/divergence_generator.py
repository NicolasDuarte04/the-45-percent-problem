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
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from market.devig import devig  # noqa: E402
from market.edge_calculator import EdgeFlag  # noqa: E402
from market.news_monitor import NewsWindow  # noqa: E402
from market.volatility_gate import (  # noqa: E402
    GateStatus,
    MarketSnapshot,
    apply_gate,
)

# Pre-registered Pinnacle bias deltas, reported on each real row for provenance.
_DRAW_DELTA = 0.014
_HOST_DELTA = -0.006
_EDGE_THRESHOLD_MAINLINE = 0.03

# ---------------------------------------------------------------------------
# cp-30: knockout divergence
# ---------------------------------------------------------------------------
# Knockout 1X2 is the plain 90-minute h2h market (still H/D/A, draw included),
# matching the model's per-match 1X2 output. It is de-vigged with the pre-
# registered KNOCKOUT stage so market/devig.py applies the pre-registered
# knockout draw correction (+0.014) and NOT the group-stage host correction.
# The round code on each pairing (R32/R16/QF/SF/3P/FIN) maps to the devig stage
# string purely to trigger that one correction; the correction magnitude is the
# same across knockout rounds, so an unknown round still de-vigs as a knockout.
_ROUND_TO_DEVIG_STAGE = {
    "R32": "round_of_32",
    "R16": "round_of_16",
    "QF": "quarter_final",
    "SF": "semi_final",
    "3P": "third_place",
    "FIN": "final",
}
_KNOCKOUT_DEVIG_STAGE_FALLBACK = "round_of_16"

# Freshness guard (cp-30). Operational plumbing, NOT a pre-registered Volatility
# Gate rule: it decides whether the WHOLE published feed is fresh enough to carry
# status "live", independently of the per-row Rule 5 staleness annotation that
# market/volatility_gate.py computes. The odds are pulled once per day by the
# nightly workflow and the committed parquet is re-read all day by on-demand
# regens, so a normally-operating pipeline serves odds up to ~24h old. The
# threshold sits above that daily cadence with headroom for on-demand regens and
# runner clock skew, so it trips only when at least one full nightly cycle has
# been missed (the exact failure that stranded the June-28 parquet for ~7 days,
# ~10000 minutes). See stale_divergence / is_odds_snapshot_stale.
STALE_ODDS_THRESHOLD_MINUTES = 1800  # 30 hours

# ---------------------------------------------------------------------------
# Volatility Gate coverage (cp-volatility-gate)
# ---------------------------------------------------------------------------
# The divergence producer reads ONE odds pull (data/raw/odds_pinnacle.parquet).
# market/volatility_gate.py degrades gracefully: each rule abstains when its
# input is absent, so apply_gate on the fields this producer actually has
# yields a REAL computed PASS/SUPPRESSED, not a hardcoded "OPEN".
#
# Only Rule 5 (LIQUIDITY_PINNACLE_STALE) is evaluable from a single Pinnacle
# snapshot: it is purely (ts - last_refreshed), both present in the odds
# parquet. The other four rules are honestly UNAVAILABLE here, with the reason
# recorded per row in gate_coverage so a PASS/"OPEN" can never be misread as
# "all five rules cleared". Lighting up Rules 1-4 is deferred market-pipeline
# scope (news ingestion, the odds-capture cadence, cross-book / Polymarket
# loading) and is NOT done here.
_RULE_UNAVAILABLE = {
    "NAMED_EVENT_6H": "news monitor not wired into the divergence producer (Rule 1)",
    "PRICE_DISCOVERY_INTRA_BOOK": (
        "intra-book price history not captured; blocked on the odds-capture "
        "cadence (Rule 2)"
    ),
    "PRICE_DISCOVERY_CROSS_BOOK": (
        "Betfair cross-book odds not loaded by the divergence producer (Rule 3)"
    ),
    "LIQUIDITY_POLYMARKET_LOW": (
        "Polymarket 24h volume not loaded by the divergence producer (Rule 4)"
    ),
}
_RULE5_NO_TS = (
    "Pinnacle last_refreshed timestamp absent in this odds snapshot (Rule 5)"
)

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


def stale_divergence(
    snapshot_id: str,
    generated_at_utc: str,
    age_minutes: Optional[int],
    threshold_minutes: int = STALE_ODDS_THRESHOLD_MINUTES,
) -> dict:
    """The honest stale state: real odds exist but the snapshot is too old.

    Emitted (zero rows, status "stale", no PINNACLE stamp) when the committed
    odds parquet has not been refreshed within ``threshold_minutes``. Keeps
    status "live" reserved for genuinely fresh odds so a stranded snapshot can
    never masquerade as live coverage. Distinct from "pending" (no real odds ever
    ingested): here odds DID land once but have gone stale.
    """
    return {
        "snapshot_id": snapshot_id,
        "generated_at_utc": generated_at_utc,
        "status": "stale",
        "stale_reason": (
            f"odds snapshot is {age_minutes} minutes old "
            f"(threshold {threshold_minutes})"
            if age_minutes is not None
            else "odds snapshot timestamp is missing or unreadable"
        ),
        "snapshot_age_minutes": age_minutes,
        "rows": [],
        "notes": (
            "Live odds ingestion is stale. The most recent committed bookmaker "
            "lines are older than the freshness threshold, so no divergence rows "
            "are published and no bookmaker source is stamped. This is an "
            "operational freshness guard on the odds feed, separate from the "
            "pre-registered Volatility Gate. Rows return once a fresh odds pull "
            "lands."
        ),
    }


def odds_snapshot_age_minutes(
    odds_df: Optional[pd.DataFrame], generated_at_utc: str
) -> Optional[int]:
    """Age in minutes of the freshest odds row in the frame vs generation time.

    The odds parquet from one pull carries a single capture time, but we take the
    max ``timestamp`` defensively so a mixed frame is judged by its newest line.
    Returns None when there is no parseable timestamp (which the freshness gate
    treats as stale: we cannot vouch for the age).
    """
    if odds_df is None or odds_df.empty or "timestamp" not in odds_df.columns:
        return None
    ts = pd.to_datetime(odds_df["timestamp"], utc=True, errors="coerce")
    if not ts.notna().any():
        return None
    newest = ts.max()
    gen = _as_utc(generated_at_utc)
    if gen is None:
        return None
    return int(round((pd.Timestamp(gen) - newest).total_seconds() / 60.0))


def is_odds_snapshot_stale(
    odds_df: Optional[pd.DataFrame],
    generated_at_utc: str,
    threshold_minutes: int = STALE_ODDS_THRESHOLD_MINUTES,
) -> bool:
    """True when the odds snapshot is older than the freshness threshold.

    A missing/unreadable timestamp (age None) is treated as stale: an unfreshly
    dated feed must never be published as live.
    """
    age = odds_snapshot_age_minutes(odds_df, generated_at_utc)
    if age is None:
        return True
    return age > threshold_minutes


def _as_utc(val: object) -> Optional[datetime]:
    """Parse a parquet/JSON timestamp to a tz-aware UTC datetime, or None.

    Real Pinnacle pulls carry `timestamp` and `last_refreshed`; a thin fixture
    or an absent column yields None, in which case the dependent rule abstains.
    """
    if val is None:
        return None
    try:
        t = pd.to_datetime(val, utc=True)
    except (ValueError, TypeError):
        return None
    if t is None or pd.isna(t):
        return None
    return t.to_pydatetime()


def _snapshot_age_minutes(
    ts: Optional[datetime], generated_at_utc: str
) -> Optional[int]:
    """Honest minutes between the odds snapshot and generation time.

    None (not 0) when the snapshot timestamp is absent: a fabricated 0 would
    imply a freshly captured line that we cannot vouch for.
    """
    if ts is None:
        return None
    gen = _as_utc(generated_at_utc)
    if gen is None:
        return None
    return int(round((gen - ts).total_seconds() / 60.0))


def _evaluate_gate(
    match_id: str,
    ts: Optional[datetime],
    last_refreshed: Optional[datetime],
    q_now: float,
    generated_at_utc: str,
) -> tuple[str, list[str], Optional[int], dict]:
    """Run market/volatility_gate.py on the fields this producer actually has.

    Returns (gate_status, gate_rules_tripped, snapshot_age_minutes, coverage).
    Rule 5 is leg-independent (it depends only on ts vs last_refreshed), so one
    decision per fixture is attached to all three outcome rows.
    """
    rule5_evaluable = ts is not None and last_refreshed is not None
    unavailable = dict(_RULE_UNAVAILABLE)
    if rule5_evaluable:
        evaluated = ["LIQUIDITY_PINNACLE_STALE"]
    else:
        evaluated = []
        unavailable["LIQUIDITY_PINNACLE_STALE"] = _RULE5_NO_TS
    coverage = {"evaluated": evaluated, "unavailable": unavailable}

    if ts is None:
        # No snapshot timestamp: the gate cannot be constructed. No suppression
        # rule was evaluated; report an honest OPEN with empty coverage.
        return "OPEN", [], None, coverage

    snapshot = MarketSnapshot(
        market_id=match_id,
        outcome_id="match_winner",
        ts=ts,
        pinnacle_q_now=q_now,            # leg-independent for the only live rule
        pinnacle_last_updated=last_refreshed,
    )
    flag = EdgeFlag(
        outcome_id="match_winner",
        E=0.0,
        E_star=0.0,
        sigma_p=0.0,
        sigma_q=0.0,
        threshold=_EDGE_THRESHOLD_MAINLINE,
        flagged=False,
        reason_code="NOT_FLAGGED",
    )
    decision = apply_gate(flag, snapshot, NewsWindow())

    if decision.gate_status == GateStatus.SUPPRESSED:
        gate_status = "FIRED"
        tripped = [decision.reason_code.value]
    else:
        gate_status = "OPEN"
        tripped = []

    return gate_status, tripped, _snapshot_age_minutes(ts, generated_at_utc), coverage


def _confidence_band(p: float, n_runs: int) -> list[float]:
    """A simple 95% binomial band around the Monte Carlo frequency estimate."""
    if n_runs <= 0:
        return [p, p]
    se = math.sqrt(max(p * (1.0 - p), 0.0) / n_runs)
    return [max(0.0, p - 1.96 * se), min(1.0, p + 1.96 * se)]


def _knockout_row_context(
    card: dict, generated_at_utc: str
) -> Optional[dict]:
    """Extract the divergence context for one knockout pairing from its live card.

    Returns a dict with the model 1X2, display fields, round, kickoff, and the
    devig stage; or None when the pairing must be dropped at publication:
      * the card is already settled (a realised score is present), or
      * the fixture has kicked off at/after generated_at (a pre-match edge is
        post-hoc once the match starts).
    This is the settled-at-source filter for the knockout surface: a dropped
    pairing never reaches divergence.json, not just the display filter.
    """
    # Settled cards carry a realised score; never publish a post-hoc edge.
    if card.get("score") is not None or card.get("outcome_realized") is not None:
        return None

    kickoff = card.get("kickoff_utc")
    ko = _as_utc(kickoff)
    gen = _as_utc(generated_at_utc)
    if ko is not None and gen is not None and ko <= gen:
        return None  # already kicked off

    p1x2 = card.get("p_model_1x2") or {}
    try:
        p_home = float(p1x2["H"])
        p_draw = float(p1x2["D"])
        p_away = float(p1x2["A"])
    except (KeyError, TypeError, ValueError):
        return None

    home = card.get("home") or {}
    away = card.get("away") or {}
    round_code = str(card.get("round", "R16"))
    return {
        "p_model": {"home_win": p_home, "draw": p_draw, "away_win": p_away},
        "home_code": str(home.get("fifa_code", "")),
        "home_name": str(home.get("display_name", "")),
        "away_code": str(away.get("fifa_code", "")),
        "away_name": str(away.get("display_name", "")),
        "round": round_code,
        "kickoff_utc": str(kickoff) if kickoff is not None else "",
        "devig_stage": _ROUND_TO_DEVIG_STAGE.get(
            round_code, _KNOCKOUT_DEVIG_STAGE_FALLBACK
        ),
    }


def build_divergence(
    snapshot_id: str,
    generated_at_utc: str,
    odds_df: pd.DataFrame,
    distributions: pd.DataFrame,
    model_map: pd.DataFrame,
    code_sha: str,
    n_runs: int = 10000,
    knockout_cards: Optional[dict] = None,
) -> dict:
    """Build real, de-vigged 1X2 divergence rows from live Pinnacle odds.

    odds_df must carry the canonical producer schema (snapshot_id, match_id,
    bookmaker, market_type, outcome, decimal_odds, is_closing). For each fixture
    with a complete latest available market line 1X2 triple, de-vig via the power
    method and emit three rows (HOME / DRAW / AWAY) stamped source_book PINNACLE.

    Group fixtures (M{NN} ids) take their model probabilities from the frozen
    champion per-match distribution and de-vig at the group stage. Knockout
    fixtures (KO-FD ids, cp-30) take their model probabilities from the live
    conditioned per-match card in ``knockout_cards`` (the same p_model_1x2 the
    matches_live surface serves) and de-vig at the knockout stage so the pre-
    registered knockout draw correction applies. Knockout rows are explicitly
    ungraded, exactly like the knockout cards; they never enter the graded ledger
    or the calibration metrics. Settled or already-kicked-off knockout pairings
    are dropped here, at publication.

    Each row carries a REAL Volatility Gate annotation computed by
    market/volatility_gate.py from the single Pinnacle snapshot (gate_status,
    gate_rules_tripped, snapshot_age_minutes) plus a gate_coverage block naming
    which of the five rules were evaluated vs unavailable. See _evaluate_gate.
    history stays empty: no intra-snapshot history is captured yet.
    """
    dist_by_id = {r["match_id"]: r for _, r in distributions.iterrows()}
    fixture_by_id = {r["match_id"]: r for _, r in model_map.iterrows()}
    knockout_cards = knockout_cards or {}

    match_winner = odds_df[odds_df["market_type"] == "match_winner"].copy()
    # Select the LATEST available market line per match. The real Odds API feed is
    # a single point-in-time snapshot (one timestamp per match); the synthetic feed
    # carries an opening triple (kickoff-7d) and a closing triple (kickoff-5m),
    # whose later timestamp selects the closing triple. is_opening / is_closing
    # columns are left intact (reserved for deferred CLV work), but they no longer
    # gate selection: a snapshot feed carries neither tag yet is the current line.
    latest = match_winner
    if "timestamp" in match_winner.columns:
        ts_parsed = pd.to_datetime(match_winner["timestamp"], utc=True, errors="coerce")
        if ts_parsed.notna().any():
            latest_per_match = ts_parsed.groupby(match_winner["match_id"]).transform("max")
            latest = match_winner[ts_parsed == latest_per_match].copy()

    rows: list[dict] = []
    row_idx = 0
    for match_id, group in latest.groupby("match_id"):
        match_id = str(match_id)

        # Resolve the model source for this fixture: frozen group distribution
        # (M{NN}) or the live conditioned knockout card (KO-FD, cp-30). A fixture
        # with neither is an odds row we cannot price against a model; skip it.
        dist = dist_by_id.get(match_id)
        fixture = fixture_by_id.get(match_id)
        ko_ctx = None
        if dist is not None and fixture is not None:
            is_knockout = False
        else:
            ko_ctx = _knockout_row_context(
                knockout_cards.get(match_id, {}), generated_at_utc
            )
            if ko_ctx is None:
                continue
            is_knockout = True

        prices = {str(r["outcome"]): float(r["decimal_odds"]) for _, r in group.iterrows()}
        if not all(k in prices for k in _OUTCOME_KEYS):
            continue

        # De-vig at the correct stage so market/devig.py applies the pre-
        # registered corrections that fit the fixture: group stage for group
        # markets, knockout stage for knockout markets (fires the +0.014 draw
        # correction, never the group host correction).
        devig_stage = ko_ctx["devig_stage"] if is_knockout else "group"
        ordered = [prices[k] for k in _OUTCOME_KEYS]
        result = devig(
            ordered,
            book="pinnacle",
            market_type="match_winner",
            stage=devig_stage,
            outcome_labels=list(_OUTCOME_KEYS),
        )
        q_devigged = dict(zip(_OUTCOME_KEYS, result.q))

        # Real Volatility Gate annotation (cp-volatility-gate). One decision per
        # fixture from the single Pinnacle snapshot's own fields; Rule 5 is the
        # only rule whose inputs are present, the rest abstain and are recorded
        # as unavailable in gate_coverage. Computed, never hardcoded.
        ts = _as_utc(group["timestamp"].iloc[0]) if "timestamp" in group.columns else None
        last_refreshed = (
            _as_utc(group["last_refreshed"].iloc[0])
            if "last_refreshed" in group.columns
            else None
        )
        gate_status, gate_rules_tripped, snapshot_age, gate_coverage = _evaluate_gate(
            match_id, ts, last_refreshed, float(q_devigged["home_win"]), generated_at_utc
        )

        # Model probabilities and display context per fixture kind.
        if is_knockout:
            p_model_by_key = ko_ctx["p_model"]
            round_code = ko_ctx["round"]
            kickoff_utc = ko_ctx["kickoff_utc"]
            home_ref = {"fifa_code": ko_ctx["home_code"], "display_name": ko_ctx["home_name"]}
            away_ref = {"fifa_code": ko_ctx["away_code"], "display_name": ko_ctx["away_name"]}
            # Only the knockout draw correction is in play at a neutral-venue
            # knockout; the group host correction does not apply.
            bias_applied = {"draw_delta": _DRAW_DELTA, "host_delta": 0.0}
        else:
            p_model_by_key = {k: float(dist[_P_MODEL_COL[k]]) for k in _OUTCOME_KEYS}
            round_code = "GRP"
            kickoff_utc = str(fixture["kickoff_utc"])
            home_ref = {
                "fifa_code": str(fixture["home_code"]),
                "display_name": str(fixture["home_name"]),
            }
            away_ref = {
                "fifa_code": str(fixture["away_code"]),
                "display_name": str(fixture["away_name"]),
            }
            bias_applied = {"draw_delta": _DRAW_DELTA, "host_delta": _HOST_DELTA}

        for key in _OUTCOME_KEYS:
            p_model = float(p_model_by_key[key])
            q = float(q_devigged[key])
            rows.append(
                {
                    "row_id": f"ROW-{row_idx:05d}",
                    "match_id": match_id,
                    "kickoff_utc": kickoff_utc,
                    "round": round_code,
                    "home": home_ref,
                    "away": away_ref,
                    "market": "1X2",
                    "outcome": _OUTCOME_LABEL[key],
                    "p_model": round(p_model, 6),
                    "q_market_raw_decimal": round(prices[key], 4),
                    "q_market_devigged": round(q, 6),
                    "edge_E": round(p_model - q, 6),
                    "edge_threshold": _EDGE_THRESHOLD_MAINLINE,
                    "gate_status": gate_status,
                    "gate_rules_tripped": gate_rules_tripped,
                    "snapshot_age_minutes": snapshot_age,
                    "gate_coverage": gate_coverage,
                    "confidence_band": [
                        round(x, 6) for x in _confidence_band(p_model, n_runs)
                    ],
                    "source_book": "PINNACLE",
                    "pinnacle_bias_applied": bias_applied,
                    "model_version": f"M2_fifa@{code_sha}",
                    "graded": False,
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
            "de-vigged latest available market line. p_model is the frozen "
            "champion (M2_fifa) per-match distribution for group fixtures and the "
            "live conditioned per-match 1X2 for knockout fixtures (KO-FD). "
            "Knockout rows are live and ungraded: they are not part of the "
            "pre-registered scored record."
        ),
    }
