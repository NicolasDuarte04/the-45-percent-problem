"""
tests/scripts/test_live_knockout_conditioning.py
================================================
cp-27: the LIVE re-sim conditions on the real knockout draw.

Two mechanisms are exercised:

  1. Real-draw consumption. ``simulation/live_knockout.build_live_knockout_plan``
     translates ``data/live/knockout_pairings.json`` into the runner's name space
     and orders the 16 R32 pairings into bracket order. The plan's pairings must
     be EXACTLY the real draw, and every decided knockout match must appear in the
     settled-winners map.

  2. Knockout conditioning in the runner. A ``MonteCarloRunner`` given the plan
     fixes the decided knockout matches: the R32 loser reaches R16 in zero runs
     (eliminated) and the R32 winner reaches R16 in every run (advanced), while a
     never-qualified team carries zero knockout mass.

The settled set is reconstructed from committed data (the real group scores in
``matches/`` and the real R32 results in ``matches_live/``), so the test is
hermetic and needs no database. The graded path is never touched here; the
frozen-independence proof lives in tests/test_frozen_independence.py.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from ingestion.fetch_match_outcomes import to_fifa_code
from simulation.bracket_encoder import BracketEncoder
from simulation.live_knockout import (
    build_live_knockout_plan,
    order_r32_by_canonical_slot,
    order_r32_by_r16_membership,
)
from simulation.match_model import MatchModel
from simulation.monte_carlo_runner import MonteCarloRunner, SimpleEloProvider
from simulation.shootout_model import ShootoutModel

LATEST = PROJECT_ROOT / "website" / "public" / "data" / "latest"
PAIRINGS = PROJECT_ROOT / "data" / "live" / "knockout_pairings.json"
_SAFE_SETTLED_AT = "2026-07-15T00:00:00+00:00"

_R16_OR_LATER = {"Champion", "Runner-up", "SF", "3rd", "QF", "R16"}


# ── Real settled-set reconstruction from committed data ──────────────────────


def _real_settled_rows() -> list[dict]:
    """72 real group results + the settled R32 results, as match_outcomes rows."""
    rows: list[dict] = []
    for f in sorted((LATEST / "matches").glob("M*.json")):
        d = json.loads(f.read_text())
        if d.get("round") != "GRP":
            continue
        sc = d.get("score")
        if not sc or sc.get("home") is None:
            continue
        rows.append(
            {
                "match_id": d["match_id"],
                "stage": "group",
                "home_team": d["home"]["fifa_code"],
                "away_team": d["away"]["fifa_code"],
                "home_goals": int(sc["home"]),
                "away_goals": int(sc["away"]),
                "settled_at": _SAFE_SETTLED_AT,
                "shootout_winner": None,
                "meta": None,
            }
        )
    live_dir = LATEST / "matches_live"
    if live_dir.exists():
        for f in sorted(live_dir.glob("*.json")):
            d = json.loads(f.read_text())
            if d.get("round") != "R32" or not d.get("score"):
                continue
            sc = d["score"]
            so = d.get("shootout") or {}
            # A penalty-decided R32 is a regulation draw; carry the shootout
            # winner (FIFA code) so the plan can determine the advancing team.
            sw = None
            if so.get("winner") == "H":
                sw = d["home"]["fifa_code"]
            elif so.get("winner") == "A":
                sw = d["away"]["fifa_code"]
            meta = None
            if so.get("home") is not None and so.get("away") is not None:
                meta = json.dumps({"shootout": {"home": so["home"], "away": so["away"]}})
            rows.append(
                {
                    "match_id": d["match_id"].replace("KO-", ""),
                    "stage": "r32",
                    "home_team": d["home"]["fifa_code"],
                    "away_team": d["away"]["fifa_code"],
                    "home_goals": int(sc["home"]),
                    "away_goals": int(sc["away"]),
                    "settled_at": _SAFE_SETTLED_AT,
                    "shootout_winner": sw,
                    "meta": meta,
                }
            )
    return rows


def _real_r32_pairs_by_code() -> set[frozenset]:
    doc = json.loads(PAIRINGS.read_text())
    return {
        frozenset((p["home"]["fifa_code"], p["away"]["fifa_code"]))
        for p in doc["pairings"]
        if p["round"] == "R32"
    }


@pytest.fixture(scope="module")
def real_plan(tmp_path_factory):
    """Build the live knockout plan against the real reconstructed settled set."""
    import os

    rows = _real_settled_rows()
    grp = [r for r in rows if r["stage"] == "group"]
    r32 = [r for r in rows if r["stage"] == "r32"]
    if len(grp) != 72 or len(r32) != 16:
        pytest.skip(f"committed settled set incomplete (group={len(grp)}, r32={len(r32)})")

    tmp = tmp_path_factory.mktemp("live_ko")
    path = tmp / "match_outcomes.parquet"
    pd.DataFrame(rows).to_parquet(path, index=False)
    prev = os.environ.get("MATCH_OUTCOMES_PARQUET")
    os.environ["MATCH_OUTCOMES_PARQUET"] = str(path)
    try:
        plan, src = build_live_knockout_plan()
    finally:
        if prev is None:
            os.environ.pop("MATCH_OUTCOMES_PARQUET", None)
        else:
            os.environ["MATCH_OUTCOMES_PARQUET"] = prev
    assert plan is not None, f"plan should build from the real draw; got {src}"
    return plan


# ── 1. Real-draw consumption ─────────────────────────────────────────────────


def test_plan_pairs_exactly_the_real_r32_draw(real_plan) -> None:
    """The plan's 16 R32 pairings are exactly the pairings in knockout_pairings.json.

    Pairings are compared as unordered FIFA-code pairs (the plan works in display
    names, so we round-trip through to_fifa_code), independent of bracket order.
    """
    plan_pairs = {
        frozenset((to_fifa_code(a), to_fifa_code(b))) for a, b in plan_r32(real_plan)
    }
    assert plan_pairs == _real_r32_pairs_by_code()


def plan_r32(plan):
    return list(plan.r32_pairs)


def test_plan_has_all_settled_r32_winners(real_plan) -> None:
    """Every settled R32 match is in the settled-winners map (16 today)."""
    assert len(real_plan.settled_winners) >= 16
    # 32 teams are qualified; each settled winner is one of them.
    for winner in real_plan.settled_winners.values():
        assert winner in real_plan.qualified_teams


def test_qualified_set_is_the_32_real_r32_teams(real_plan) -> None:
    codes = {to_fifa_code(t) for t in real_plan.qualified_teams}
    real_codes = set()
    for pair in _real_r32_pairs_by_code():
        real_codes |= set(pair)
    assert codes == real_codes
    assert len(codes) == 32


# ── 2. Knockout conditioning in the runner ───────────────────────────────────


def _build_elo() -> dict[str, float]:
    df = pd.read_parquet(PROJECT_ROOT / "data" / "raw" / "elo_ratings.parquet")
    return dict(zip(df["team_name"], df["elo_rating"].astype(float)))


def _run_conditioned(plan, n_runs: int = 300, seed_base: int = 20260628):
    """Run the wc2026 MC with the live knockout plan; aggregate exit rounds.

    Group conditioning is intentionally omitted: the plan overrides qualified_r32
    and the knockout rounds, so group sampling is irrelevant to the knockout
    marginals under test. Returns {team_id: {"p_r16": .., "p_group_qual": ..}}.
    """
    elo = _build_elo()
    rng = np.random.default_rng(0)
    mm = MatchModel(rng=rng)
    sm = ShootoutModel(match_model=mm, rng=rng)
    runner = MonteCarloRunner(
        match_model=mm,
        shootout_model=sm,
        bracket_encoder=BracketEncoder(),
        strength_provider=SimpleEloProvider(elo_ratings=elo),
        code_sha="test-cp27",
        tournament_variant="wc2026",
        live_knockout_plan=plan,
    )
    r16_counts: dict[str, int] = {}
    qual_counts: dict[str, int] = {}
    ts = pd.Timestamp("2026-06-28", tz="UTC")
    for i in range(n_runs):
        team_df, _ = runner.run_one(
            run_idx=i, seed=seed_base + i, model_id="c", data_hash="d", timestamp_utc=ts
        )
        for row in team_df.itertuples(index=False):
            if row.exit_round in _R16_OR_LATER:
                r16_counts[row.team_id] = r16_counts.get(row.team_id, 0) + 1
            if row.qualified_r32:
                qual_counts[row.team_id] = qual_counts.get(row.team_id, 0) + 1
    teams = set(r16_counts) | set(qual_counts)
    return {
        t: {
            "p_r16": r16_counts.get(t, 0) / n_runs,
            "p_group_qual": qual_counts.get(t, 0) / n_runs,
        }
        for t in teams
    }


def _display_for(code: str) -> str:
    fx = pd.read_parquet(PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet")
    gs = fx[fx["stage"] == "Group Stage"]
    for name in set(gs["team_home"]) | set(gs["team_away"]):
        if to_fifa_code(str(name)) == code:
            return str(name)
    raise AssertionError(f"no display name for {code}")


@pytest.fixture(scope="module")
def conditioned(real_plan):
    return _run_conditioned(real_plan)


@pytest.mark.parametrize("loser_code", ["BIH", "ECU", "GER", "NED", "GHA", "ALG"])
def test_settled_r32_loser_reaches_r16_in_zero_runs(conditioned, loser_code) -> None:
    """A team that LOST its settled R32 match is eliminated: p_r16 == 0 exactly.

    These six are the diagnosis cases the live surface previously published wrong
    (BIH/ECU at 1.0, GER at ~0.59, GHA/ALG excluded entirely). Under conditioning
    each is a settled R32 loser, so its conditioned R16 reach is exactly zero.
    """
    disp = _display_for(loser_code)
    p_r16 = conditioned.get(disp, {}).get("p_r16", 0.0)
    p_gq = conditioned.get(disp, {}).get("p_group_qual", 0.0)
    assert p_r16 == 0.0, f"{loser_code} p_r16={p_r16} after a settled R32 loss; must be 0"
    # ALG/GHA were wrongly shown at 0 group qualification before; they DID qualify.
    assert p_gq == 1.0, f"{loser_code} p_group_qual={p_gq}; a real R32 team must be 1.0"


@pytest.mark.parametrize("winner_code", ["USA", "MAR", "COL", "SUI", "ARG"])
def test_settled_r32_winner_reaches_r16_in_every_run(conditioned, winner_code) -> None:
    """A team that WON its settled R32 match reaches R16 in every run: p_r16 == 1."""
    disp = _display_for(winner_code)
    p_r16 = conditioned.get(disp, {}).get("p_r16", 0.0)
    assert p_r16 == 1.0, f"{winner_code} p_r16={p_r16} after a settled R32 win; must be 1.0"


def test_never_qualified_team_has_zero_knockout_mass(conditioned) -> None:
    """A team not in the real R32 (e.g. a group non-qualifier) has p_r16 == 0."""
    # UZB (group K) did not qualify in the real draw.
    disp = _display_for("UZB")
    p_r16 = conditioned.get(disp, {}).get("p_r16", 0.0)
    p_gq = conditioned.get(disp, {}).get("p_group_qual", 0.0)
    assert p_r16 == 0.0
    assert p_gq == 0.0, f"UZB p_group_qual={p_gq}; a never-qualified team must be 0"


# ── 3. Ordering helpers ──────────────────────────────────────────────────────


def test_r16_membership_ordering_pairs_consecutively() -> None:
    """R16-membership ordering emits the two feeder R32 matches consecutively."""
    r32 = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H")]
    # R16: winner(A/B)=A vs winner(E/F)=E, then winner(C/D)=C vs winner(G/H)=G
    r16 = [("A", "E"), ("C", "G")]
    ordered = order_r32_by_r16_membership(r32, r16)
    assert ordered == [("A", "B"), ("E", "F"), ("C", "D"), ("G", "H")]


def test_r16_membership_ordering_needs_full_r16() -> None:
    """Partial R16 coverage returns None (caller falls back / degrades)."""
    r32 = [("A", "B"), ("C", "D"), ("E", "F"), ("G", "H")]
    assert order_r32_by_r16_membership(r32, [("A", "E")]) is None
    assert order_r32_by_r16_membership(r32, []) is None


def test_canonical_ordering_places_by_known_side() -> None:
    """Canonical ordering resolves each slot's 1X/2X known side to a real pairing."""
    standings = {g: [f"{g}1", f"{g}2", f"{g}3", f"{g}4"] for g in "ABCDEFGHIJKL"}
    # Two canonical-style slots: M-a home 1A (winner A), M-b home 2B (runner-up B).
    descriptors = [("Ma", "1A", "BEST3-XYZ"), ("Mb", "2B", "2C")]
    real_pairs = [("B2", "C2"), ("A1", "Zthird")]  # order deliberately scrambled
    ordered = order_r32_by_canonical_slot(real_pairs, standings, descriptors)
    # Slot Ma (1A -> A1) takes the (A1, Zthird) pairing; Mb (2B -> B2) the other.
    assert ordered == [("A1", "Zthird"), ("B2", "C2")]
