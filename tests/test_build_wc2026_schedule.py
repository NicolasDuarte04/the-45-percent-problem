"""
tests/test_build_wc2026_schedule.py
===================================
cp-19. Unit tests for the WC 2026 kickoff re-sourcing logic. These exercise the
pure mapping + verification functions with in-memory payloads, so they run
without the live Football-Data feed or the gitignored canonical-draw sidecar.
"""

from __future__ import annotations

import pytest

from scripts.build_wc2026_schedule import (
    VerificationError,
    _to_z,
    build_kickoff_map,
    verify_anchors,
)

# Minimal canonical draw: the three official anchors plus a knockout pair.
DRAW = {
    "group_matches": [
        {"match_id": "M23", "home_code": "ENG", "away_code": "CRO"},
        {"match_id": "M24", "home_code": "GHA", "away_code": "PAN"},
        {"match_id": "M25", "home_code": "MEX", "away_code": "KOR"},
    ],
    "knockout_matches": [
        {"match_id": "M73", "round": "R32", "kickoff_utc": "2026-06-28T19:00:00Z"},
        {"match_id": "M74", "round": "R32", "kickoff_utc": "2026-06-28T22:00:00Z"},
    ],
}

PAYLOAD = {
    "matches": [
        # Group fixtures with real team names (joined by team-code pair).
        {
            "stage": "GROUP_STAGE",
            "utcDate": "2026-06-17T20:00:00Z",
            "homeTeam": {"name": "England"},
            "awayTeam": {"name": "Croatia"},
        },
        {
            "stage": "GROUP_STAGE",
            "utcDate": "2026-06-17T23:00:00Z",
            "homeTeam": {"name": "Ghana"},
            "awayTeam": {"name": "Panama"},
        },
        {
            "stage": "GROUP_STAGE",
            "utcDate": "2026-06-19T03:00:00Z",
            "homeTeam": {"name": "Mexico"},
            "awayTeam": {"name": "Korea Republic"},
        },
        # Knockouts: teams TBD, mapped by (round, chronological order).
        {"stage": "LAST_32", "utcDate": "2026-06-28T22:00:00Z", "id": 2},
        {"stage": "LAST_32", "utcDate": "2026-06-28T19:00:00Z", "id": 1},
    ]
}


def test_to_z_normalises_offsets_and_z():
    assert _to_z("2026-06-19T03:00:00+00:00") == "2026-06-19T03:00:00Z"
    assert _to_z("2026-06-19T03:00:00Z") == "2026-06-19T03:00:00Z"
    # A +02:00 wall time converts back to UTC.
    assert _to_z("2026-06-19T05:00:00+02:00") == "2026-06-19T03:00:00Z"


def test_group_fixtures_join_by_team_pair():
    kmap = build_kickoff_map(PAYLOAD, DRAW)
    assert kmap["M23"] == "2026-06-17T20:00:00Z"
    assert kmap["M24"] == "2026-06-17T23:00:00Z"
    assert kmap["M25"] == "2026-06-19T03:00:00Z"


def test_group_pair_is_orientation_independent():
    # FD lists the away team as home; the unordered pair still resolves.
    flipped = {
        "matches": [
            {
                "stage": "GROUP_STAGE",
                "utcDate": "2026-06-17T23:00:00Z",
                "homeTeam": {"name": "Panama"},
                "awayTeam": {"name": "Ghana"},
            }
        ]
    }
    assert build_kickoff_map(flipped, DRAW)["M24"] == "2026-06-17T23:00:00Z"


def test_knockouts_mapped_by_round_and_chronology():
    kmap = build_kickoff_map(PAYLOAD, DRAW)
    # Earliest FD R32 kickoff binds to the earliest canonical id.
    assert kmap["M73"] == "2026-06-28T19:00:00Z"
    assert kmap["M74"] == "2026-06-28T22:00:00Z"


def test_verify_anchors_passes_on_official_times():
    verify_anchors(build_kickoff_map(PAYLOAD, DRAW))  # no raise


def test_verify_anchors_raises_on_mismatch():
    bad = build_kickoff_map(PAYLOAD, DRAW)
    bad["M24"] = "2026-06-18T02:00:00Z"  # the original wrong value
    with pytest.raises(VerificationError, match="M24"):
        verify_anchors(bad)


def test_verify_anchors_raises_on_missing():
    partial = {"M23": "2026-06-17T20:00:00Z"}
    with pytest.raises(VerificationError, match="missing"):
        verify_anchors(partial)
