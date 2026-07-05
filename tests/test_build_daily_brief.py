"""
tests/test_build_daily_brief.py
===============================
cp-31: unit tests for the automated Today's Brief producer.

Covered:
  - a synthetic snapshot yields a structurally valid issue;
  - idempotence (same Colombia day twice updates in place, no duplicate);
  - shootout rendering (regulation draw + penalty tally, never inflated);
  - divergence status live vs stale/paused wording;
  - the standing prohibition, asserted STRUCTURALLY: no ranked or per-match
    market divergence can ever reach the issue, whatever divergence.json holds;
  - empty days still produce a valid, honest issue;
  - modal scoreline matches the site's 7x7 argmax with the row-major tie-break;
  - no en/em dash reaches a generated issue.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from evaluation.build_daily_brief import (  # noqa: E402
    build_brief,
    modal_scoreline,
    publish_daily_brief,
)

GEN_AT = "2026-07-05T18:01:05Z"  # Bogota (UTC-5) civil day: 2026-07-05


# ── Synthetic-bundle helpers ─────────────────────────────────────────────────


def _peaked_grid(home: int, away: int) -> list[list[float]]:
    """An 11x11 goal grid whose single largest cell is (home, away)."""
    grid = [[0.001 for _ in range(11)] for _ in range(11)]
    grid[home][away] = 0.9
    return grid


def _ko_card(
    match_id: str,
    home_code: str,
    away_code: str,
    kickoff: str,
    *,
    p_1x2: dict,
    modal: tuple[int, int],
    settled: dict | None = None,
) -> dict:
    card = {
        "match_id": match_id,
        "round": "R16",
        "kickoff_utc": kickoff,
        "home": {"fifa_code": home_code, "display_name": home_code.title()},
        "away": {"fifa_code": away_code, "display_name": away_code.title()},
        "p_model_1x2": p_1x2,
        "p_model_goals": _peaked_grid(*modal),
        "live_provenance": {"graded": False},
    }
    if settled is not None:
        card.update(settled)
    return card


def _write_bundle(
    bundle: Path,
    *,
    meta: dict,
    tournament: dict,
    divergence: dict,
    matches: list[dict] | None = None,
    matches_live: list[dict] | None = None,
    r16_checkpoint: dict | None = None,
) -> None:
    bundle.mkdir(parents=True, exist_ok=True)
    (bundle / "snapshot_meta.json").write_text(json.dumps(meta))
    (bundle / "tournament.json").write_text(json.dumps(tournament))
    (bundle / "divergence.json").write_text(json.dumps(divergence))
    if r16_checkpoint is not None:
        (bundle / "r16_checkpoint.json").write_text(json.dumps(r16_checkpoint))
    md = bundle / "matches"
    md.mkdir(exist_ok=True)
    for c in matches or []:
        (md / f"{c['match_id']}.json").write_text(json.dumps(c))
    ld = bundle / "matches_live"
    ld.mkdir(exist_ok=True)
    for c in matches_live or []:
        (ld / f"{c['match_id']}.json").write_text(json.dumps(c))


def _base_meta() -> dict:
    return {
        "champion_model": "M_STAR",
        "code_sha": "deadbeefcafe",
        "data_sha": "sha256:abc123",
        "mc_runs": 10000,
        "tournament_phase": "round_of_16",
        "matches_settled": 90,
        "matches_remaining": 14,
    }


def _live_divergence(n: int = 2) -> dict:
    return {
        "status": "live",
        "rows": [
            {
                "match_id": f"KO-{i}",
                "edge_E": -0.0421,
                "q_market_devigged": 0.55,
                "p_model": 0.44,
                "outcome": "HOME",
            }
            for i in range(n)
        ],
    }


def _standard_bundle(bundle: Path, divergence: dict | None = None) -> None:
    today_ko = _ko_card(
        "KO-TODAY",
        "BRA",
        "NOR",
        "2026-07-05T20:00:00Z",  # Bogota 15:00 on 2026-07-05
        p_1x2={"H": 0.46, "D": 0.23, "A": 0.31},
        modal=(1, 1),
    )
    # Settled yesterday, penalty shootout: regulation 1-1 draw, home won 4-3.
    pen_ko = _ko_card(
        "KO-PENS",
        "PAR",
        "FRA",
        "2026-07-04T21:00:00Z",  # Bogota 16:00 on 2026-07-04
        p_1x2={"H": 0.30, "D": 0.40, "A": 0.30},
        modal=(1, 1),
        settled={
            "score": {"home": 1, "away": 1},
            "outcome_realized": "D",
            "settled_at_utc": "2026-07-05 05:20:12+00:00",
            "shootout": {"winner": "H", "home": 4, "away": 3},
        },
    )
    _write_bundle(
        bundle,
        meta=_base_meta(),
        tournament={"model_variant": "M2_fifa", "mc_runs": 10000, "teams": []},
        divergence=divergence if divergence is not None else _live_divergence(2),
        matches_live=[today_ko, pen_ko],
    )


# ── Tests ────────────────────────────────────────────────────────────────────


def test_valid_issue_shape(tmp_path):
    _standard_bundle(tmp_path)
    brief = build_brief(tmp_path, GEN_AT)

    # Core BriefSample fields present.
    for key in (
        "brief_date",
        "issue_number",
        "model_variant",
        "code_sha",
        "data_snapshot_sha",
        "mc_runs",
        "next_brief_utc",
        "latest_archive_url",
        "lead_in",
        "headline",
        "teaser",
        "top_divergences",
        "tournament_movers",
        "suppressed_today",
        "methodology_links",
        "featured_teams",
        "daily",
    ):
        assert key in brief, f"missing {key}"

    assert brief["brief_date"] == "2026-07-05"
    assert brief["issue_number"] == 37  # anchored: 12 on 2026-06-10, +25 days
    assert brief["lead_in"]["fallback_used"] is False
    d = brief["daily"]
    assert d["tournament"]["phase_label"] == "Round of 16"
    assert d["tournament"]["total_matches"] == 104
    assert len(d["today_fixtures"]) == 1
    assert d["today_fixtures"][0]["home"]["fifa_code"] == "BRA"
    assert d["today_fixtures"][0]["graded"] is False
    assert len(d["yesterday_results"]) == 1


def test_prohibition_is_structural(tmp_path):
    """No ranked or per-match market divergence can EVER reach the issue, even
    when divergence.json is full of rows with edges."""
    _standard_bundle(tmp_path, divergence=_live_divergence(5))
    brief = build_brief(tmp_path, GEN_AT)

    assert brief["top_divergences"] == []
    assert brief["teaser"] == {"has_divergence": False}
    assert brief["tournament_movers"] == []
    assert brief["suppressed_today"] == []

    # The divergence layer surfaces the AGGREGATE count only, never a per-match
    # edge / price. The raw edge value from divergence.json must not appear
    # anywhere in the serialized issue.
    blob = json.dumps(brief)
    assert "0.0421" not in blob and "-0.0421" not in blob
    assert "edge" not in blob.lower()
    assert brief["daily"]["divergence"]["status"] == "live"
    assert brief["daily"]["divergence"]["fixtures_covered"] == 5


def test_divergence_paused_when_not_live(tmp_path):
    for status in ("pending", "stale", "paused", "unknown"):
        _standard_bundle(tmp_path, divergence={"status": status, "rows": []})
        brief = build_brief(tmp_path, GEN_AT)
        dv = brief["daily"]["divergence"]
        assert dv["status"] == "paused"
        assert dv["fixtures_covered"] == 0
        assert "paused" in dv["sentence"]
        assert "paused" in brief["headline"]["movers_line"]


def test_divergence_live_reports_count_only(tmp_path):
    _standard_bundle(tmp_path, divergence=_live_divergence(3))
    brief = build_brief(tmp_path, GEN_AT)
    dv = brief["daily"]["divergence"]
    assert dv["status"] == "live"
    assert dv["fixtures_covered"] == 3
    assert "covering 3 fixtures" in dv["sentence"]


def test_shootout_rendering(tmp_path):
    _standard_bundle(tmp_path)
    brief = build_brief(tmp_path, GEN_AT)
    result = brief["daily"]["yesterday_results"][0]
    # Regulation score is the draw, never the penalty-inflated aggregate.
    assert result["score"] == {"home": 1, "away": 1}
    assert result["outcome"] == "D"
    assert result["shootout"] == {"winner_name": "Par", "home": 4, "away": 3}
    assert result["result_label"] == "Par 1, Fra 1 (Par won the shootout 4-3)"


def test_idempotent_same_day(tmp_path):
    bundle = tmp_path / "bundle"
    briefs = tmp_path / "briefs"
    _standard_bundle(bundle)

    p1 = publish_daily_brief(bundle, briefs, GEN_AT)
    p2 = publish_daily_brief(bundle, briefs, "2026-07-05T23:59:00Z")  # same COT day

    assert p1 == p2
    files = sorted(briefs.glob("*.json"))
    assert len(files) == 1
    assert files[0].name == "2026-07-05.json"


def test_empty_day_is_valid(tmp_path):
    # No fixtures today, none settled yesterday; a future fixture exists.
    future_ko = _ko_card(
        "KO-FUTURE",
        "ESP",
        "GER",
        "2026-07-08T20:00:00Z",
        p_1x2={"H": 0.5, "D": 0.25, "A": 0.25},
        modal=(2, 1),
    )
    _write_bundle(
        tmp_path,
        meta=_base_meta(),
        tournament={"model_variant": "M2_fifa", "mc_runs": 10000, "teams": []},
        divergence={"status": "pending", "rows": []},
        matches_live=[future_ko],
    )
    brief = build_brief(tmp_path, GEN_AT)
    assert brief["lead_in"]["fallback_used"] is True
    assert brief["daily"]["today_fixtures"] == []
    assert brief["daily"]["yesterday_results"] == []
    assert brief["daily"]["next_fixture_date"] == "2026-07-08"
    assert "bracket state carries forward" in brief["lead_in"]["match_sentence"]
    # Still a complete, valid issue.
    assert brief["issue_number"] == 37
    assert brief["headline"]["summary_line"]


def test_r16_checkpoint_interim_then_published(tmp_path):
    # Interim: no artifact.
    _standard_bundle(tmp_path)
    interim = build_brief(tmp_path, GEN_AT)["daily"]["r16_checkpoint"]
    assert interim["status"] == "pending"
    assert "will be evaluated when the Round of 16 settles" in interim["sentence"]

    # Published: artifact present, kill did not fire.
    _standard_bundle(tmp_path)
    (tmp_path / "r16_checkpoint.json").write_text(
        json.dumps(
            {
                "n": 72,
                "gap_in_se": -1.47,
                "threshold_se": 2.0,
                "tripped": False,
                "evaluated_at_utc": "2026-07-08T12:00:00Z",
            }
        )
    )
    published = build_brief(tmp_path, GEN_AT)["daily"]["r16_checkpoint"]
    assert published["status"] == "published"
    assert "1.47 SE better than M0" in published["sentence"]
    assert "did not fire" in published["sentence"]


def test_modal_scoreline_matches_site_argmax():
    # Peak at (2, 1) but with a 7x7 clip: a huge cell outside 0..6 must be
    # ignored, matching the site's clip-to-7x7 behaviour.
    grid = [[0.0 for _ in range(11)] for _ in range(11)]
    grid[2][1] = 0.4
    grid[8][8] = 0.99  # outside the 7x7 clip; must not win
    assert modal_scoreline(grid) == {"home": 2, "away": 1}
    assert modal_scoreline(None) is None
    assert modal_scoreline([]) is None


def test_no_typographic_dashes(tmp_path):
    _standard_bundle(tmp_path)
    brief = build_brief(tmp_path, GEN_AT)
    blob = json.dumps(brief, ensure_ascii=False)
    assert chr(0x2013) not in blob  # en dash
    assert chr(0x2014) not in blob  # em dash
