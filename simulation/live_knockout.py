"""
simulation/live_knockout.py
===========================
cp-27: the live re-simulation's knockout plan.

cp-10/cp-16c condition the Monte Carlo group stage on settled results, but the
knockout rounds were still (a) sampled from an internal zone-pair bracket that is
not the real FIFA draw, and (b) never conditioned on decided knockout matches. So
the live conditional bracket published false probabilities: teams that never
qualified appeared with knockout mass, eliminated teams kept advancing, and the
runners-up of the two groups whose R32 slots were transcribed wrong
(cp-27 descriptor repair) showed zero knockout probability.

This module builds a ``LiveKnockoutPlan`` that the ``MonteCarloRunner`` consumes
in the LIVE re-sim only:

  - ``r32_pairs``   : the 16 REAL Round-of-32 pairings (from the
                      Football-Data.org schedule feed learned into
                      ``data/live/knockout_pairings.json`` by cp-20), ordered by
                      canonical bracket slot (M73..M88) so the runner's structural
                      progression (winner-of-2k-1 vs winner-of-2k) reproduces the
                      real R16/QF/SF wiring.
  - ``settled_winners`` : decided knockout matches (any round), keyed by the
                      unordered pair of team names, mapping to the realised
                      winner. The runner fixes these instead of sampling: the
                      winner advances with probability 1, the loser is eliminated.
  - ``qualified_teams`` : the 32 teams actually in the Round of 32. A team not in
                      this set never qualified; its knockout mass is 0.

Everything here is on the SIMULATION side. The graded loader
(``evaluation/forecast_mapping.py`` group-only scope, the cp-14 bijection guard)
is untouched; the graded 72-row ledger never sees this plan. The frozen batch is
never re-run, so the frozen surfaces are unaffected.

Namespace note
--------------
The Monte Carlo works in the fixtures-parquet display-name space ("South Africa",
"South Korea", "USA"), which is exactly the space the strength provider keys off
(it matches fifa_df / elo verbatim). The schedule feed and the settled stream use
FIFA 3-letter codes. We translate codes to the parquet display name via
``ingestion.fetch_match_outcomes.to_fifa_code`` applied to the parquet group
roster (a clean bijection over the 48 teams), so the plan the runner receives is
already in the runner's own name space.

Degrade-not-break
-----------------
The plan is all-or-nothing and defensive: any structural problem (no drawn R32
yet, incomplete group conditioning, an unmappable code, an R32 pairing that does
not line up with a canonical slot) returns ``(None, reason)``. The runner then
falls back to its pre-cp-27 behaviour (zone-pair sampling) and the live
provenance records the degrade. A plan is only returned when the full real R32 is
drawn and every pairing maps cleanly, so the live view either reflects reality or
is explicitly flagged as not-yet-conditioned; it is never garbage.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation.bracket_encoder import BracketEncoder, MatchResult
from utils.logger import get_logger

log = get_logger(__name__)

FIXTURES_PARQUET = PROJECT_ROOT / "data" / "raw" / "wc2026_fixtures.parquet"
LIVE_KNOCKOUT_PAIRINGS = PROJECT_ROOT / "data" / "live" / "knockout_pairings.json"

# Group-stage settled rows are conditioned by simulation/load_settled.py; here we
# only need the KNOCKOUT settled rows (winners), so this is the group-scope label
# we exclude from the settled-outcome stream.
_GROUP_STAGE_LABEL = "group"


@dataclass(frozen=True)
class LiveKnockoutPlan:
    """The real-draw knockout override consumed by the MonteCarloRunner (live)."""

    # 16 (home_display, away_display) pairings, canonical bracket order M73..M88.
    r32_pairs: tuple[tuple[str, str], ...]
    # frozenset({team_a_display, team_b_display}) -> winner_display, decided KOs.
    settled_winners: dict[frozenset, str]
    # The 32 display names actually in the Round of 32.
    qualified_teams: frozenset
    # Provenance for the live object.
    source_label: str = ""
    settled_ko_count: int = 0


# =============================================================================
# Helpers
# =============================================================================


def _code_to_display(fixtures: pd.DataFrame) -> dict[str, str]:
    """Map FIFA 3-letter code -> fixtures-parquet display name (the MC's names).

    Built from the 48 group-stage teams via the shared code resolver. A clean
    bijection in practice; a collision or unmappable name raises so a rename that
    breaks the mapping fails loud rather than silently mis-pairing.
    """
    from ingestion.fetch_match_outcomes import to_fifa_code

    gs = fixtures[fixtures["stage"] == "Group Stage"]
    names = sorted(set(gs["team_home"]) | set(gs["team_away"]))
    out: dict[str, str] = {}
    for name in names:
        code = to_fifa_code(str(name))
        if code is None:
            raise ValueError(f"group team {name!r} did not resolve to a FIFA code")
        if code in out and out[code] != name:
            raise ValueError(
                f"FIFA code {code} maps to two names: {out[code]!r} and {name!r}"
            )
        out[code] = str(name)
    return out


def _group_of_match(fixtures: pd.DataFrame) -> dict[str, str]:
    """match_id (M01..M72) -> group letter, from the group-stage fixtures."""
    gs = fixtures[fixtures["stage"] == "Group Stage"]
    return {str(r.match_id): str(r.group) for r in gs.itertuples(index=False)}


def _canonical_r32_descriptors(fixtures: pd.DataFrame) -> list[tuple[str, str, str]]:
    """Return [(match_id, home_slot, away_slot), ...] for R32, in M73..M88 order.

    Reads the repaired descriptors from the canonical fixtures parquet (cp-27
    fixed M76 2C->2G and M79 1A->2K). Ordered by the numeric match-id suffix so
    consecutive entries feed the same R16 match under the runner's structural
    progression.
    """
    r32 = fixtures[fixtures["stage"] == "Round of 32"].copy()
    r32["_n"] = r32["match_id"].str.slice(1).astype(int)
    r32 = r32.sort_values("_n")
    return [
        (str(r.match_id), str(r.team_home), str(r.team_away))
        for r in r32.itertuples(index=False)
    ]


def _group_standings(
    settled_group: dict[str, MatchResult],
    group_of_match: dict[str, str],
) -> Optional[dict[str, list[str]]]:
    """Rank every group from the settled group results (display-name space).

    Returns ``{group_letter: [1st, 2nd, 3rd, 4th]}`` or ``None`` when any group
    does not have all six of its matches settled (so the knockout draw cannot be
    trusted to be final and the override is skipped).
    """
    by_group: dict[str, list[MatchResult]] = {}
    for match_id, res in settled_group.items():
        g = group_of_match.get(match_id)
        if g is None:
            continue
        by_group.setdefault(g, []).append(res)

    encoder = BracketEncoder()
    # Deterministic rng: with a fully-settled group the tiebreakers resolve on
    # points/GD/GS/H2H and never reach the lots draw; the seed only fixes the
    # (unused-in-practice) lots path so the plan is reproducible.
    rng = np.random.default_rng(0)
    standings: dict[str, list[str]] = {}
    for g in "ABCDEFGHIJKL":
        matches = by_group.get(g, [])
        if len(matches) != 6:
            return None
        standings[g] = encoder.rank_group(matches, rng)
    return standings


def _resolve_known_side(slot: str, standings: dict[str, list[str]]) -> Optional[str]:
    """Resolve a '1X'/'2X' slot descriptor to a concrete team; None otherwise.

    BEST3 / other descriptors return None (their concrete team is taken from the
    real pairing, not resolved here).
    """
    if len(slot) == 2 and slot[0] in "12" and slot[1] in "ABCDEFGHIJKL":
        pos = int(slot[0]) - 1
        ranking = standings.get(slot[1], [])
        if pos < len(ranking):
            return ranking[pos]
    return None


def order_r32_by_canonical_slot(
    real_pairs: list[tuple[str, str]],
    standings: dict[str, list[str]],
    canonical_descriptors: list[tuple[str, str, str]],
) -> Optional[list[tuple[str, str]]]:
    """Order the real R32 pairings by canonical bracket slot (M73..M88).

    Each canonical slot has at least one KNOWN side (a group winner/runner-up).
    Resolve that side to a concrete team via the settled standings, then take the
    real pairing that contains that team. The BEST3 side is whatever the real
    pairing supplies, so the unreliable best-third allocation table is never
    consulted.

    Returns the 16 pairings in canonical order, or None when the mapping is not a
    clean bijection (a slot's known side is unresolved, or its team is in no real
    pairing, or a pairing is claimed twice).
    """
    team_to_pair: dict[str, tuple[str, str]] = {}
    for pair in real_pairs:
        team_to_pair[pair[0]] = pair
        team_to_pair[pair[1]] = pair

    ordered: list[tuple[str, str]] = []
    used: set[tuple[str, str]] = set()
    for _match_id, home_slot, away_slot in canonical_descriptors:
        known = _resolve_known_side(home_slot, standings) or _resolve_known_side(
            away_slot, standings
        )
        if known is None:
            return None
        pair = team_to_pair.get(known)
        if pair is None or pair in used:
            return None
        ordered.append(pair)
        used.add(pair)

    if len(ordered) != len(real_pairs):
        return None
    return ordered


def order_r32_by_r16_membership(
    real_r32: list[tuple[str, str]],
    real_r16: list[tuple[str, str]],
) -> Optional[list[tuple[str, str]]]:
    """Order the R32 pairings from the drawn R16 pairings (no standings needed).

    Each R16 team is the winner of exactly one R32 match, so an R16 pairing names
    the two R32 matches that feed it. Emitting those two R32 matches consecutively
    for each R16 pairing (in R16 file order) yields an R32 order whose structural
    progression (winner of 2k-1 vs winner of 2k) reproduces the drawn R16 wiring.

    Returns None when the R16 pairings do not cleanly cover all 16 R32 matches
    (e.g. R16 not fully drawn yet), so the caller can fall back or degrade.
    """
    if len(real_r16) * 2 != len(real_r32) or not real_r16:
        return None
    team_to_pair: dict[str, tuple[str, str]] = {}
    for pair in real_r32:
        team_to_pair[pair[0]] = pair
        team_to_pair[pair[1]] = pair

    ordered: list[tuple[str, str]] = []
    used: set[tuple[str, str]] = set()
    for r16_home, r16_away in real_r16:
        for team in (r16_home, r16_away):
            pair = team_to_pair.get(team)
            if pair is None or pair in used:
                return None
            ordered.append(pair)
            used.add(pair)
    if len(ordered) != len(real_r32):
        return None
    return ordered


def _winner_display(
    home_code: str,
    away_code: str,
    home_goals: int,
    away_goals: int,
    shootout_winner: Optional[str],
    code_to_display: dict[str, str],
) -> Optional[str]:
    """Realised winner (display name) of a decided knockout match, or None.

    ``home_goals``/``away_goals`` are the regulation (incl. extra time) score; a
    regulation draw is decided by ``shootout_winner`` (a FIFA code). Returns None
    when the winner cannot be determined (a draw with no shootout winner).
    """
    if home_goals > away_goals:
        code = home_code
    elif away_goals > home_goals:
        code = away_code
    elif shootout_winner:
        code = shootout_winner
    else:
        return None
    return code_to_display.get(code)


# =============================================================================
# Plan builder
# =============================================================================


def build_live_knockout_plan(
    *,
    pairings_path: Path = LIVE_KNOCKOUT_PAIRINGS,
    fixtures_parquet: Path = FIXTURES_PARQUET,
    settled_group_results: Optional[dict[str, MatchResult]] = None,
) -> tuple[Optional[LiveKnockoutPlan], str]:
    """Build the real-draw knockout plan for the live re-sim, or degrade.

    Returns ``(plan, source_label)``. ``plan`` is None (with a reason in the
    label) when no override should apply: the R32 is not yet drawn, group
    conditioning is incomplete, or a pairing cannot be mapped cleanly. The caller
    passes ``plan`` to the runner; None means the runner keeps its pre-cp-27
    behaviour and the live provenance records ``knockout_conditioned=false``.

    ``settled_group_results`` may be supplied (the group dict cp-16c already
    loaded for the batch) to avoid re-reading; when None it is loaded here.
    """
    if not pairings_path.exists():
        return None, "live_knockout:no_pairings_file"
    try:
        doc = json.loads(Path(pairings_path).read_text())
    except (ValueError, OSError) as exc:
        return None, f"live_knockout:pairings_read_error:{exc}"
    pairings = doc.get("pairings", [])
    r32_raw = [p for p in pairings if p.get("round") == "R32"]
    if len(r32_raw) != 16:
        return None, f"live_knockout:r32_not_drawn(n={len(r32_raw)})"

    if not fixtures_parquet.exists():
        return None, "live_knockout:no_fixtures_parquet"
    fixtures = pd.read_parquet(fixtures_parquet)

    try:
        code_to_display = _code_to_display(fixtures)
    except ValueError as exc:
        log.error("live knockout plan: code->display map failed", error=str(exc))
        return None, f"live_knockout:code_map_error:{exc}"

    # ── settled group results -> standings (needed only for canonical ordering) ──
    if settled_group_results is None:
        from simulation.load_settled import load_settled_results

        settled_group_results, _grp_src = load_settled_results()
    group_of_match = _group_of_match(fixtures)
    standings = _group_standings(settled_group_results, group_of_match)
    if standings is None:
        return None, "live_knockout:group_conditioning_incomplete"

    # ── translate the real R32/R16 pairings into the MC name space ───────────────
    def _to_display_pairs(round_code: str) -> Optional[list[tuple[str, str]]]:
        out: list[tuple[str, str]] = []
        for p in pairings:
            if p.get("round") != round_code:
                continue
            hc = (p.get("home") or {}).get("fifa_code")
            ac = (p.get("away") or {}).get("fifa_code")
            hd = code_to_display.get(hc)
            ad = code_to_display.get(ac)
            if hd is None or ad is None:
                return None
            out.append((hd, ad))
        return out

    real_pairs = _to_display_pairs("R32")
    if real_pairs is None:
        return None, "live_knockout:unmapped_r32_pairing"
    team_to_pair: dict[str, tuple[str, str]] = {}
    for pair in real_pairs:
        team_to_pair[pair[0]] = pair
        team_to_pair[pair[1]] = pair
    if len(team_to_pair) != 32:
        return None, f"live_knockout:r32_teams_not_32(n={len(team_to_pair)})"

    # ── order the 16 pairings into canonical bracket order ───────────────────────
    # Primary: derive the order from the drawn R16 pairings. Each R16 team is a
    # distinct R32 winner, so the R16 pairings name the R32-match adjacency
    # directly from reality; this reproduces the true R16/QF wiring regardless of
    # whether the internal descriptor structure matches FIFA's actual bracket.
    # Fallback (only while R16 is not yet drawn): anchor each pairing to its
    # canonical R32 slot (M73..M88) via the settled standings. When neither
    # resolves (R16 not drawn and the descriptor structure disagrees with the
    # real draw), degrade: the runner keeps its pre-cp-27 behaviour.
    real_r16 = _to_display_pairs("R16") or []
    ordered = order_r32_by_r16_membership(real_pairs, real_r16)
    order_method = "r16_membership"
    if ordered is None:
        ordered = order_r32_by_canonical_slot(
            real_pairs, standings, _canonical_r32_descriptors(fixtures)
        )
        order_method = "canonical"
    if ordered is None:
        return None, "live_knockout:ordering_failed"

    # ── settled knockout winners (any round) ─────────────────────────────────────
    settled_winners: dict[frozenset, str] = {}
    from evaluation.settled_source import load_settled_outcomes

    ko_rows, _ko_src = load_settled_outcomes()
    if ko_rows is not None:
        for _, row in ko_rows.iterrows():
            stage = str(row.get("stage") or "").lower()
            if stage == _GROUP_STAGE_LABEL:
                continue
            hg, ag = row.get("home_goals"), row.get("away_goals")
            if hg is None or ag is None or pd.isna(hg) or pd.isna(ag):
                continue
            hc, ac = row.get("home_team"), row.get("away_team")
            hd, ad = code_to_display.get(hc), code_to_display.get(ac)
            if hd is None or ad is None:
                continue
            sw = row.get("shootout_winner")
            sw = sw if isinstance(sw, str) and sw else None
            winner = _winner_display(hc, ac, int(hg), int(ag), sw, code_to_display)
            if winner is None:
                continue
            settled_winners[frozenset((hd, ad))] = winner

    plan = LiveKnockoutPlan(
        r32_pairs=tuple(ordered),
        settled_winners=settled_winners,
        qualified_teams=frozenset(team_to_pair),
        source_label="live_knockout:real_draw",
        settled_ko_count=len(settled_winners),
    )
    log.info(
        "live knockout plan built",
        r32=len(ordered),
        order_method=order_method,
        settled_ko=len(settled_winners),
        qualified=len(plan.qualified_teams),
    )
    return plan, plan.source_label
