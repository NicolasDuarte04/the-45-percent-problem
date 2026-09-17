"""
simulation/bracket_encoder.py
==============================
Phase 5 — Deliverable 3: FIFA 2026 48-Team Bracket Encoder

Implements §5 of Phase5_Simulation_Engine_Design.md.

Tournament structure (§5.1):
  - 48 teams in 12 groups (A–L), 6 matches per group = 72 total
  - Round of 32: 24 (top-2 per group) + 8 best third-placed teams = 32 teams
  - Knockout path: R32 → R16 → QF → SF → 3rd-place + Final

Key data:
  R32_BRACKET     — 16 frozen R32Slot dataclasses describing the cross-group matchups.
  THIRD_PLACE_MAP — 15-entry table mapping which 4 zone-representative groups qualified
                    their thirds to specific bracket slot assignments (§5.2).

IMPORTANT — VERIFICATION REQUIRED BEFORE TOURNAMENT START:
  The R32_BRACKET and THIRD_PLACE_MAP were constructed from public information about
  the FIFA 2026 bracket structure and the zone-pair model (zones AB, CD, EF, GH, IJ, KL).
  They must be cross-checked against the official FIFA 2026 bracket document before
  any production batch runs. The Qatar 2022 smoke test (§8.2) uses a separate
  hardcoded QATAR2022_R16 bracket that is definitively verified.

  Source: FIFA World Cup 2026 format — https://www.fifa.com/tournaments/mens/worldcup/2026
  Accessed: 2026-04-21  (to be re-verified against official bracket press release)

Group tiebreaker order (§5.3):
  Points → GD → GS → H2H Points → H2H GD → Fair Play (stub=0) → Lots (PRNG)
  H2H criteria re-scope recursively when ≥3 teams are still tied.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


# ── Type aliases ─────────────────────────────────────────────────────────────
TeamId = str   # e.g. "Argentina", "Brazil"


# ── R32Slot dataclass ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class R32Slot:
    """One of the 16 Round-of-32 matches, identified by origin descriptors.

    side_a / side_b use the notation:
      "1A"          — 1st-placed team from group A
      "2B"          — 2nd-placed team from group B
      "3A|B"        — 3rd-placed team from either group A or B (resolved by THIRD_PLACE_MAP)
    """
    slot_id: int
    side_a: str
    side_b: str


# ═══════════════════════════════════════════════════════════════════════════════
# FIFA 2026 R32 Bracket — 16 slots
# ═══════════════════════════════════════════════════════════════════════════════
#
# Structure:
#   Matches 1–12 : pure 1st-vs-2nd cross-group pairings, organised by zone pair.
#                  Zones: AB, CD, EF, GH, IJ, KL.  Each zone contributes 2 R32 matches.
#   Matches 13–16: intra-zone third-place playoff matches.  Exactly 4 zones will have
#                  BOTH their third-place teams in the best-8; those zones produce an
#                  intra-zone 3rd-vs-3rd R32 match.  The THIRD_PLACE_MAP (15 entries)
#                  maps which 4 of the 6 zone-representatives qualify to specific slot IDs.
#
# VERIFY: Cross-check matches 1–16 against the official FIFA 2026 bracket release.
#
R32_BRACKET: tuple[R32Slot, ...] = (
    # ── Zone A-B ─────────────────────────────────────────────────────────────
    R32Slot(slot_id=1,  side_a="1A", side_b="2B"),
    R32Slot(slot_id=2,  side_a="1B", side_b="2A"),
    # ── Zone C-D ─────────────────────────────────────────────────────────────
    R32Slot(slot_id=3,  side_a="1C", side_b="2D"),
    R32Slot(slot_id=4,  side_a="1D", side_b="2C"),
    # ── Zone E-F ─────────────────────────────────────────────────────────────
    R32Slot(slot_id=5,  side_a="1E", side_b="2F"),
    R32Slot(slot_id=6,  side_a="1F", side_b="2E"),
    # ── Zone G-H ─────────────────────────────────────────────────────────────
    R32Slot(slot_id=7,  side_a="1G", side_b="2H"),
    R32Slot(slot_id=8,  side_a="1H", side_b="2G"),
    # ── Zone I-J ─────────────────────────────────────────────────────────────
    R32Slot(slot_id=9,  side_a="1I", side_b="2J"),
    R32Slot(slot_id=10, side_a="1J", side_b="2I"),
    # ── Zone K-L ─────────────────────────────────────────────────────────────
    R32Slot(slot_id=11, side_a="1K", side_b="2L"),
    R32Slot(slot_id=12, side_a="1L", side_b="2K"),
    # ── Third-place playoff slots (resolved by THIRD_PLACE_MAP) ──────────────
    # side_a / side_b encode "3X|Y" meaning: the 3rd from group X or group Y
    # (exactly one of each pair qualifies to this slot; THIRD_PLACE_MAP picks which).
    R32Slot(slot_id=13, side_a="3A|B", side_b="3A|B"),   # intra-AB zone 3rd match
    R32Slot(slot_id=14, side_a="3C|D", side_b="3C|D"),   # intra-CD zone
    R32Slot(slot_id=15, side_a="3E|F", side_b="3E|F"),   # intra-EF zone
    R32Slot(slot_id=16, side_a="3G|H", side_b="3G|H"),   # intra-GH zone  (VERIFY)
)


# ═══════════════════════════════════════════════════════════════════════════════
# THIRD_PLACE_MAP — 15-entry combinatorial lookup (§5.2)
# ═══════════════════════════════════════════════════════════════════════════════
#
# The 12 groups are organised into 6 zone pairs (AB, CD, EF, GH, IJ, KL).
# Each zone has a "zone representative" group (A, C, E, G, I, K — the first
# alphabetically in each pair).  A zone "qualifies" for a third-place R32 match
# when BOTH of its groups' third-place teams are in the best-8 overall thirds.
#
# Exactly 4 of the 6 zones will have both thirds in the best-8.  The remaining
# 2 zones' thirds did not both qualify (one or both ranked outside the top-8).
#
# THIRD_PLACE_MAP maps:
#   key  : sorted tuple of 4 zone-representative letters that qualified
#   value: dict mapping slot_id → (group_a, group_b) for that slot's 3rd-vs-3rd match
#          where group_a = first alpha, group_b = second alpha in the zone pair
#
# C({A,C,E,G,I,K}, 4) = 15 entries.
#
# VERIFY: The slot_id assignments within each configuration must be validated
# against the official FIFA 2026 bracket to ensure correct bracket positioning.
# Current assignments are systematic (sorted zone order → ascending slot ID).
#
_ZONE_PARTNERS: dict[str, str] = {
    "A": "B", "B": "A",
    "C": "D", "D": "C",
    "E": "F", "F": "E",
    "G": "H", "H": "G",
    "I": "J", "J": "I",
    "K": "L", "L": "K",
}

# Zone representatives (first group in each zone pair)
_ZONE_REPS: tuple[str, ...] = ("A", "C", "E", "G", "I", "K")

# Slot IDs reserved for third-place zone matches
_THIRD_PLACE_SLOT_IDS: tuple[int, ...] = (13, 14, 15, 16)


def _build_third_place_map() -> dict[tuple[str, ...], dict[int, tuple[str, str]]]:
    """Programmatically generate all C(6,4)=15 configurations."""
    from itertools import combinations
    result: dict[tuple[str, ...], dict[int, tuple[str, str]]] = {}
    for reps in combinations(_ZONE_REPS, 4):
        # Sort the 4 qualifying zone representatives
        key = tuple(sorted(reps))
        # Assign each zone's third-place match to a slot ID in ascending order
        slot_assignment: dict[int, tuple[str, str]] = {}
        for slot_id, zone_rep in zip(_THIRD_PLACE_SLOT_IDS, sorted(reps)):
            partner = _ZONE_PARTNERS[zone_rep]
            slot_assignment[slot_id] = (zone_rep, partner)
        result[key] = slot_assignment
    return result


THIRD_PLACE_MAP: dict[tuple[str, ...], dict[int, tuple[str, str]]] = _build_third_place_map()


# ═══════════════════════════════════════════════════════════════════════════════
# Qatar 2022 bracket — for the §8.2 smoke test (32-team format, no thirds)
# ═══════════════════════════════════════════════════════════════════════════════
#
# 8 groups of 4 (A–H), top 2 per group → 16 in R16, no third-place qualifiers.
# Source: FIFA World Cup 2022 official bracket.  Verified against match results:
#   https://www.fifa.com/tournaments/mens/worldcup/qatar2022
#
QATAR2022_GROUPS: dict[str, list[str]] = {
    "A": ["Qatar",     "Ecuador",      "Senegal",    "Netherlands"],
    "B": ["England",   "Iran",         "USA",        "Wales"],
    "C": ["Argentina", "Saudi Arabia", "Mexico",     "Poland"],
    "D": ["France",    "Australia",    "Denmark",    "Tunisia"],
    "E": ["Spain",     "Costa Rica",   "Germany",    "Japan"],
    "F": ["Belgium",   "Canada",       "Morocco",    "Croatia"],
    "G": ["Brazil",    "Serbia",       "Switzerland","Cameroon"],
    "H": ["Portugal",  "Ghana",        "Uruguay",    "South Korea"],
}

# Qatar 2022 R16 bracket — 8 matchups (no thirds, all 1st vs 2nd)
# Cross-group pairings verified against official 2022 bracket:
# Match 49: 1A vs 2B;  Match 50: 1C vs 2D;  Match 51: 1D vs 2C;  Match 52: 1B vs 2A
# Match 53: 1E vs 2F;  Match 54: 1G vs 2H;  Match 55: 1F vs 2E;  Match 56: 1H vs 2G
QATAR2022_R16: tuple[R32Slot, ...] = (
    R32Slot(slot_id=1, side_a="1A", side_b="2B"),
    R32Slot(slot_id=2, side_a="1C", side_b="2D"),
    R32Slot(slot_id=3, side_a="1D", side_b="2C"),
    R32Slot(slot_id=4, side_a="1B", side_b="2A"),
    R32Slot(slot_id=5, side_a="1E", side_b="2F"),
    R32Slot(slot_id=6, side_a="1G", side_b="2H"),
    R32Slot(slot_id=7, side_a="1F", side_b="2E"),
    R32Slot(slot_id=8, side_a="1H", side_b="2G"),
)


# ═══════════════════════════════════════════════════════════════════════════════
# MatchResult — lightweight record of one group match for tiebreaker computation
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MatchResult:
    home: TeamId
    away: TeamId
    home_goals: int
    away_goals: int

    @property
    def home_points(self) -> int:
        if self.home_goals > self.away_goals:
            return 3
        if self.home_goals == self.away_goals:
            return 1
        return 0

    @property
    def away_points(self) -> int:
        if self.away_goals > self.home_goals:
            return 3
        if self.away_goals == self.home_goals:
            return 1
        return 0


# ═══════════════════════════════════════════════════════════════════════════════
# BracketEncoder
# ═══════════════════════════════════════════════════════════════════════════════

class BracketEncoder:
    """Resolves group-stage results into an R32 bracket.

    Implements §5.3 (tiebreakers), §5.4 (best-thirds selection), and
    §5.5 (bracket seeding) of Phase5_Simulation_Engine_Design.md.
    """

    # ── Public API ────────────────────────────────────────────────────────────

    def rank_group(
        self,
        group_matches: list[MatchResult],
        rng: np.random.Generator,
    ) -> list[TeamId]:
        """Apply tiebreakers recursively. Return teams ordered 1st → 4th.

        Tiebreaker order (§5.3):
          1. Points
          2. Goal Difference (all group matches)
          3. Goals Scored (all group matches)
          4. H2H Points (re-scoped to tied subset)
          5. H2H Goal Difference (re-scoped to tied subset)
          6. Fair Play (stub: 0 for all — Phase 7 wires real data)
          7. Drawing of Lots (PRNG draw, logged via rng)
        """
        # Collect all teams from matches
        teams: set[TeamId] = set()
        for m in group_matches:
            teams.add(m.home)
            teams.add(m.away)

        stats = _compute_group_stats(list(teams), group_matches)
        ranked = _rank_with_tiebreakers(list(teams), stats, group_matches, rng)
        return ranked

    def select_best_thirds(
        self,
        all_group_rankings: dict[str, list[TeamId]],
        all_group_matches: dict[str, list[MatchResult]],
        rng: np.random.Generator,
    ) -> list[tuple[str, TeamId]]:
        """Select 8 best third-placed teams from 12 groups.

        Comparison criteria: Points → GD → GS → Fair Play → Lots.
        Returns list of (group_letter, team_id) for 8 qualifiers,
        sorted best-to-worst.
        """
        thirds: list[tuple[str, TeamId]] = []
        for group_letter, ranking in all_group_rankings.items():
            if len(ranking) >= 3:
                thirds.append((group_letter, ranking[2]))   # 3rd-placed team

        def _third_sort_key(item: tuple[str, TeamId]) -> tuple:
            g, team = item
            matches = all_group_matches[g]
            stats = _compute_group_stats(
                [r for grp in all_group_rankings.values() for r in grp],
                matches,
            )
            s = stats.get(team, _TeamStats())
            return (-s.points, -s.gd, -s.gs, rng.random())   # last = lots tiebreak

        thirds_sorted = sorted(thirds, key=_third_sort_key)
        return thirds_sorted[:8]

    def seed_bracket(
        self,
        group_rankings: dict[str, list[TeamId]],
        best_thirds: list[tuple[str, TeamId]],
    ) -> list[tuple[TeamId, TeamId]]:
        """Resolve R32_BRACKET placeholders into 16 concrete (teamA, teamB) matchups.

        Uses the module-level R32_BRACKET and THIRD_PLACE_MAP.
        """
        return _resolve_bracket(R32_BRACKET, group_rankings, best_thirds, THIRD_PLACE_MAP)

    def seed_qatar2022_bracket(
        self,
        group_rankings: dict[str, list[TeamId]],
    ) -> list[tuple[TeamId, TeamId]]:
        """Resolve the Qatar 2022 R16 bracket (no thirds, 8 matchups)."""
        matchups: list[tuple[TeamId, TeamId]] = []
        for slot in QATAR2022_R16:
            team_a = _resolve_position(slot.side_a, group_rankings, {}, {})
            team_b = _resolve_position(slot.side_b, group_rankings, {}, {})
            matchups.append((team_a, team_b))
        return matchups


# ═══════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ═══════════════════════════════════════════════════════════════════════════════

class _TeamStats:
    __slots__ = ("points", "gd", "gs")

    def __init__(self) -> None:
        self.points: int = 0
        self.gd: int = 0
        self.gs: int = 0


def _compute_group_stats(
    teams: list[TeamId],
    matches: list[MatchResult],
) -> dict[TeamId, _TeamStats]:
    """Compute points, GD, GS for each team across the given match list."""
    stats: dict[TeamId, _TeamStats] = {t: _TeamStats() for t in teams}
    for m in matches:
        if m.home in stats:
            stats[m.home].points += m.home_points
            stats[m.home].gd     += m.home_goals - m.away_goals
            stats[m.home].gs     += m.home_goals
        if m.away in stats:
            stats[m.away].points += m.away_points
            stats[m.away].gd     += m.away_goals - m.home_goals
            stats[m.away].gs     += m.away_goals
    return stats


def _h2h_matches(teams: list[TeamId], all_matches: list[MatchResult]) -> list[MatchResult]:
    """Return only the matches played between teams in `teams`."""
    team_set = set(teams)
    return [m for m in all_matches if m.home in team_set and m.away in team_set]


def _rank_with_tiebreakers(
    teams: list[TeamId],
    all_stats: dict[TeamId, _TeamStats],
    all_matches: list[MatchResult],
    rng: np.random.Generator,
    _depth: int = 0,
) -> list[TeamId]:
    """Recursively rank `teams` using the §5.3 criteria.

    `all_stats` covers all group matches (for criteria 1–3).
    When H2H is applied (criteria 4–5), it re-scopes to the still-tied subset.
    """
    if len(teams) == 1:
        return list(teams)

    # ── Criteria 1–3: points, GD, GS (full group matches) ────────────────────
    def sort_key_full(t: TeamId) -> tuple:
        s = all_stats[t]
        return (-s.points, -s.gd, -s.gs)

    teams_sorted = sorted(teams, key=sort_key_full)

    # Split into groups with identical (points, GD, GS)
    result: list[TeamId] = []
    i = 0
    while i < len(teams_sorted):
        j = i + 1
        while j < len(teams_sorted) and (
            sort_key_full(teams_sorted[j]) == sort_key_full(teams_sorted[i])
        ):
            j += 1
        tied_group = teams_sorted[i:j]
        if len(tied_group) == 1:
            result.extend(tied_group)
        else:
            # ── Criteria 4–5: H2H within tied group ──────────────────────────
            result.extend(
                _break_h2h(tied_group, all_matches, rng, _depth=_depth + 1)
            )
        i = j

    return result


def _break_h2h(
    teams: list[TeamId],
    all_matches: list[MatchResult],
    rng: np.random.Generator,
    _depth: int,
) -> list[TeamId]:
    """Apply H2H criteria (criteria 4–5), re-scoping recursively."""
    h2h_matches = _h2h_matches(teams, all_matches)
    h2h_stats = _compute_group_stats(teams, h2h_matches)

    def h2h_key(t: TeamId) -> tuple:
        s = h2h_stats[t]
        return (-s.points, -s.gd, -s.gs)

    teams_sorted = sorted(teams, key=h2h_key)

    result: list[TeamId] = []
    i = 0
    while i < len(teams_sorted):
        j = i + 1
        while j < len(teams_sorted) and (
            h2h_key(teams_sorted[j]) == h2h_key(teams_sorted[i])
        ):
            j += 1
        tied_group = teams_sorted[i:j]
        if len(tied_group) == 1:
            result.extend(tied_group)
        elif len(tied_group) < len(teams) and _depth < 10:
            # Some teams broke free → re-scope H2H to the still-tied subset
            result.extend(
                _break_h2h(tied_group, all_matches, rng, _depth=_depth + 1)
            )
        else:
            # Criteria 6 (Fair Play — stub: all equal) → Criteria 7 (Lots)
            result.extend(_lots(tied_group, rng))
        i = j

    return result


def _lots(teams: list[TeamId], rng: np.random.Generator) -> list[TeamId]:
    """Deterministic pseudo-draw (§5.3 criterion 7). Reproducible under seed."""
    indices = list(range(len(teams)))
    rng.shuffle(indices)
    return [teams[i] for i in indices]


def _resolve_bracket(
    bracket: tuple[R32Slot, ...],
    group_rankings: dict[str, list[TeamId]],
    best_thirds: list[tuple[str, TeamId]],
    third_place_map: dict[tuple[str, ...], dict[int, tuple[str, str]]],
) -> list[tuple[TeamId, TeamId]]:
    """Resolve R32_BRACKET slot descriptors into concrete team pairs."""
    # Build lookup: group_letter → team_id for the 3rd-place qualifiers
    third_lookup: dict[str, TeamId] = {g: t for g, t in best_thirds}

    # Determine which zone-representative thirds qualified (for THIRD_PLACE_MAP lookup)
    qualifying_thirds_groups = {g for g, _ in best_thirds}

    # Identify which zone representatives have BOTH zone partners qualifying
    qualifying_zone_reps: list[str] = []
    for rep in _ZONE_REPS:
        partner = _ZONE_PARTNERS[rep]
        if rep in qualifying_thirds_groups and partner in qualifying_thirds_groups:
            qualifying_zone_reps.append(rep)

    # Look up THIRD_PLACE_MAP
    map_key = tuple(sorted(qualifying_zone_reps[:4]))  # take first 4 if more
    slot_assignment = third_place_map.get(map_key, {})

    matchups: list[tuple[TeamId, TeamId]] = []
    for slot in bracket:
        team_a = _resolve_position(slot.side_a, group_rankings, third_lookup, slot_assignment)
        team_b = _resolve_position(slot.side_b, group_rankings, third_lookup, slot_assignment)
        matchups.append((team_a, team_b))
    return matchups


def _resolve_position(
    descriptor: str,
    group_rankings: dict[str, list[TeamId]],
    third_lookup: dict[str, TeamId],
    slot_assignment: dict[int, tuple[str, str]],
) -> TeamId:
    """Resolve a single slot descriptor (e.g., '1A', '2B', '3A|B') to a team ID."""
    if descriptor.startswith("3"):
        # Third-place team: descriptor is "3X|Y" (two group letters separated by |)
        candidates_str = descriptor[1:]   # e.g., "A|B"
        candidate_groups = [g.strip() for g in candidates_str.split("|")]
        # Find which candidate group actually supplied a qualifying third
        for g in candidate_groups:
            if g in third_lookup:
                return third_lookup[g]
        # Fallback: take first qualifying group in sorted order (should not happen
        # if THIRD_PLACE_MAP is complete and correct)
        for g in sorted(candidate_groups):
            if g in group_rankings and len(group_rankings[g]) >= 3:
                return group_rankings[g][2]
        # Ultimate fallback
        return "UNKNOWN_THIRD"

    # Determine finish position and group letter
    pos = int(descriptor[0]) - 1   # 0-indexed: "1A" → 0, "2B" → 1
    group = descriptor[1]           # "A", "B", …
    ranking = group_rankings.get(group, [])
    if pos < len(ranking):
        return ranking[pos]
    return f"UNKNOWN_{descriptor}"
