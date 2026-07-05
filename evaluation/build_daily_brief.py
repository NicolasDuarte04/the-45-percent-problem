"""
evaluation/build_daily_brief.py
===============================
cp-31: the automated Today's Brief producer.

Background
----------
Today's Brief is a daily editorial surface. Before cp-31 no producer existed
anywhere in the repo (only a dev-only Vercel Blob seeder), so production served
a single stale issue and an interim guard in ``LiveDataBlock.tsx`` labelled it
"LATEST ISSUE" so it stayed honest but visibly dormant. This module is the
lightweight automated producer: it generates one issue per Colombia calendar day
during every snapshot regen, deterministically, from the committed snapshot
bundle only. No LLM calls, no external APIs, no new paid dependencies.

Storage decision (see the cp-31 PR description for the full rationale)
---------------------------------------------------------------------
Generated issues are committed into the website's snapshot data namespace at
``website/public/data/briefs/<YYYY-MM-DD>.json`` and served from there by
``website/src/lib/brief.ts``. The Vercel Blob path is NOT trivially writable
from the regen Actions job: no ``BLOB_READ_WRITE_TOKEN`` is provisioned in
``nightly_pipeline.yml`` / ``on_demand_regen.yml``, whereas those workflows
already ``git add website/public/data/`` and commit. Committing the issue rides
that existing, already-authenticated path with zero new secrets. The Blob
archive of pre-cp-31 issues stays readable for backward compatibility (the
website reader unions committed issues with the Blob archive).

Standing prohibition (enforced structurally here)
-------------------------------------------------
The Brief must never rank, feature, or single out specific market divergences or
edges. This producer enforces that in code, not by convention:
  - ``top_divergences`` is always ``[]``.
  - ``teaser`` is always ``{"has_divergence": false}``.
  - ``tournament_movers`` is always ``[]`` (the published per-team marginals are
    a frozen pre-tournament forecast; they do not move day to day).
  - The only divergence-layer content is the AGGREGATE status: "live with N
    fixtures covered" or "paused", with no per-match numbers. When
    ``divergence.json`` has any ``status`` other than ``"live"``, the Brief says
    the layer is paused and nothing more.

Knockout posture
----------------
Model numbers for knockout ties are live and NOT graded; only the frozen 72
pre-tournament group forecasts are scored. Every knockout fixture the Brief
lists carries that disclaimer, reusing the site's standard wording.

Determinism
-----------
The output is a pure function of the committed bundle plus the regen's
``generated_at_utc`` stamp. Re-running a regen the same Colombia day overwrites
that day's issue in place (idempotent); it never duplicates. The Colombia civil
day is UTC-5 year round (Colombia observes no DST), so the offset is a fixed
constant and needs no tz database.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

# ── Constants ────────────────────────────────────────────────────────────────

# Colombia civil time. America/Bogota is UTC-5 all year (no DST), so a fixed
# offset is correct and dependency-free. Days are keyed here to match the rest
# of the site (dailyShareCard.ts groups by America/Bogota).
BOGOTA = timezone(timedelta(hours=-5))

# Issue numbering is anchored so the first produced issue continues the archive
# monotonically. Production's last pre-cp-31 issue was No. 12 on 2026-06-10, so
# that day is the anchor; every later Colombia day is +1. The gap between the
# anchor and the first produced issue is real (no producer ran on those days)
# and is left visible rather than back-filled.
ISSUE_EPOCH_DATE = date(2026, 6, 10)
ISSUE_EPOCH_NUMBER = 12

# The site's standard ungraded-knockout disclaimer wording (matches the
# UngradedBanner on /match/live/[id] and the LiveKnockoutRounds footnote).
KNOCKOUT_DISCLAIMER = (
    "Model numbers for knockout ties are live and not graded; only the "
    "frozen pre-tournament group forecasts are scored."
)

# Human labels for SnapshotMetaSchema.tournament_phase values (see
# _derive_phase in scripts/regenerate_snapshot_from_batch.py).
PHASE_LABELS = {
    "pre_tournament": "Pre-tournament",
    "group_stage": "Group stage",
    "round_of_32": "Round of 32",
    "round_of_16": "Round of 16",
    "quarter_final": "Quarter-finals",
    "semi_final": "Semi-finals",
    "final": "Final",
    "completed": "Completed",
}

# Standard methodology links (identical to the pre-cp-31 sample brief).
METHODOLOGY_LINKS = {
    "model_card": "/methodology/m-star",
    "devig_method": "/methodology/power-devig",
}

# Round codes that are ungraded live surfaces (everything that is not the frozen
# group stage). Group matches (round "GRP") are the graded frozen forecast.
_GRADED_ROUND = "GRP"


# ── Small parsing / formatting helpers ───────────────────────────────────────


def _parse_iso(value: str) -> datetime:
    """Parse the ISO stamps the bundle uses into an aware UTC datetime.

    Handles the three shapes that appear in the committed data:
      - "2026-07-04T21:00:00Z"
      - "2026-06-28T02:00:00+00:00"
      - "2026-07-05 05:20:12+00:00"  (space separator, from a settled_at stamp)
    """
    s = value.strip().replace(" ", "T", 1)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _bogota_date(iso_utc: str) -> date:
    return _parse_iso(iso_utc).astimezone(BOGOTA).date()


def _kickoff_local_label(iso_utc: str) -> str:
    """A Colombia-time kickoff label, e.g. "9:00 PM COT"."""
    local = _parse_iso(iso_utc).astimezone(BOGOTA)
    hour24 = local.hour
    suffix = "AM" if hour24 < 12 else "PM"
    hour12 = hour24 % 12
    if hour12 == 0:
        hour12 = 12
    return f"{hour12}:{local.minute:02d} {suffix} COT"


def _issue_number(brief_day: date) -> int:
    return ISSUE_EPOCH_NUMBER + (brief_day - ISSUE_EPOCH_DATE).days


def _phase_label(phase: str) -> str:
    return PHASE_LABELS.get(phase, phase.replace("_", " ").title())


def modal_scoreline(grid: Optional[list]) -> Optional[dict]:
    """The most likely exact scoreline under the model.

    Mirrors website/src/lib/data/matchListing.ts::topScorelines byte-for-byte so
    the Brief agrees with the match detail page: clip the goal grid to the 0..6
    range (7x7), walk cells in row-major order (home outer, away inner), and take
    the max joint probability; ties resolve to the lower home then lower away
    goal count (a stable sort preserves the row-major order). Returns None when
    the grid is missing or empty.
    """
    if not grid:
        return None
    clipped = [row[:7] for row in grid[:7]]
    cells: list[tuple[int, int, float]] = []
    for h, row in enumerate(clipped):
        for a, p in enumerate(row):
            cells.append((h, a, float(p)))
    if not cells:
        return None
    # Python's sort is stable, so equal probabilities keep row-major order.
    cells.sort(key=lambda c: -c[2])
    top = cells[0]
    return {"home": top[0], "away": top[1]}


def _team_ref(card: dict, side: str) -> dict:
    ref = card.get(side) or {}
    return {
        "fifa_code": ref.get("fifa_code", ""),
        "display_name": ref.get("display_name", ref.get("fifa_code", "")),
    }


def _is_settled(card: dict) -> bool:
    score = card.get("score")
    return (
        isinstance(score, dict)
        and score.get("home") is not None
        and score.get("away") is not None
    )


# ── Bundle readers ───────────────────────────────────────────────────────────


def _read_json(path: Path) -> Optional[Any]:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def _load_match_cards(bundle_dir: Path) -> list[dict]:
    """Every priced match card in the bundle: graded group cards (matches/) plus
    the explicitly ungraded live knockout cards (matches_live/)."""
    cards: list[dict] = []
    for subdir in ("matches", "matches_live"):
        d = bundle_dir / subdir
        if not d.exists():
            continue
        for f in sorted(d.glob("*.json")):
            card = _read_json(f)
            if isinstance(card, dict) and card.get("kickoff_utc"):
                cards.append(card)
    return cards


# ── Content builders (each returns plain data; no market edges anywhere) ─────


def _fixture_entry(card: dict) -> dict:
    round_code = card.get("round", _GRADED_ROUND)
    p = card.get("p_model_1x2") or {}
    modal = modal_scoreline(card.get("p_model_goals"))
    return {
        "match_id": card.get("match_id", ""),
        "round": round_code,
        "graded": round_code == _GRADED_ROUND,
        "kickoff_utc": card.get("kickoff_utc"),
        "kickoff_local_label": _kickoff_local_label(card["kickoff_utc"]),
        "home": _team_ref(card, "home"),
        "away": _team_ref(card, "away"),
        "p_home": p.get("H"),
        "p_draw": p.get("D"),
        "p_away": p.get("A"),
        "modal_scoreline": (
            f"{modal['home']}-{modal['away']}" if modal is not None else None
        ),
    }


def _result_entry(card: dict) -> dict:
    round_code = card.get("round", _GRADED_ROUND)
    score = card.get("score") or {}
    home = _team_ref(card, "home")
    away = _team_ref(card, "away")
    hg, ag = score.get("home"), score.get("away")
    outcome = card.get("outcome_realized")

    # cp-22 / cp-28: a knockout decided on penalties is a REGULATION draw; the
    # score above is the regulation (incl. extra time) result, never the
    # penalty-inflated aggregate. The shootout block (when present) carries the
    # penalty tally so the result reads honestly without inflating the line.
    shootout = None
    label = f"{home['display_name']} {hg}, {away['display_name']} {ag}"
    so = card.get("shootout")
    if isinstance(so, dict) and so.get("home") is not None and so.get("away") is not None:
        winner_side = so.get("winner")
        winner_name = (
            home["display_name"]
            if winner_side == "H"
            else away["display_name"]
            if winner_side == "A"
            else None
        )
        shootout = {
            "winner_name": winner_name,
            "home": so.get("home"),
            "away": so.get("away"),
        }
        if winner_name is not None:
            hi, lo = max(so["home"], so["away"]), min(so["home"], so["away"])
            label = f"{label} ({winner_name} won the shootout {hi}-{lo})"

    return {
        "match_id": card.get("match_id", ""),
        "round": round_code,
        "graded": round_code == _GRADED_ROUND,
        "home": home,
        "away": away,
        "score": {"home": hg, "away": ag},
        "outcome": outcome,
        "shootout": shootout,
        "result_label": label,
    }


def _divergence_status(bundle_dir: Path) -> dict:
    """Aggregate divergence-layer status ONLY. Never per-match figures.

    Per the standing prohibition and the cp-31 hard rules: if divergence.json is
    absent or its status is anything other than "live", the layer is reported as
    paused and nothing more. When live, only the count of covered fixtures is
    surfaced (an aggregate), never any edge, side, or match name.
    """
    div = _read_json(bundle_dir / "divergence.json")
    if not isinstance(div, dict) or div.get("status") != "live":
        return {
            "status": "paused",
            "fixtures_covered": 0,
            "sentence": (
                "The model-versus-market divergence layer is paused; no "
                "divergence figures are published today."
            ),
        }
    rows = div.get("rows") or []
    fixtures = {r.get("match_id") for r in rows if isinstance(r, dict)}
    n = len(fixtures)
    return {
        "status": "live",
        "fixtures_covered": n,
        "sentence": (
            f"The model-versus-market divergence layer is live, covering {n} "
            f"{'fixture' if n == 1 else 'fixtures'}. This brief reports the "
            "layer status only; it never ranks or names individual divergences."
        ),
    }


def _r16_checkpoint_status(bundle_dir: Path) -> dict:
    """R16 pre-registered kill-criterion checkpoint status.

    Interim before the artifact exists, result after, mirroring the vault
    R16CheckpointStatusBlock wording so the Brief and the vault agree.
    """
    checkpoint = _read_json(bundle_dir / "r16_checkpoint.json")
    if not isinstance(checkpoint, dict):
        em = _read_json(bundle_dir / "evaluation_metrics.json")
        if isinstance(em, dict) and isinstance(em.get("r16_checkpoint"), dict):
            checkpoint = em["r16_checkpoint"]

    if not isinstance(checkpoint, dict):
        return {
            "status": "pending",
            "sentence": (
                "The Round of 16 live checkpoint remains wired and will be "
                "evaluated when the Round of 16 settles, on a live M2-versus-M0 "
                "comparison over the 72 pre-registered group-stage forecasts."
            ),
        }

    n = checkpoint.get("n")
    gap = checkpoint.get("gap_in_se")
    threshold = checkpoint.get("threshold_se")
    tripped = bool(checkpoint.get("tripped"))
    direction = "worse than" if (gap or 0) > 0 else "better than"
    magnitude = abs(float(gap)) if gap is not None else 0.0
    threshold_label = f"{float(threshold):.1f}" if threshold is not None else "2.0"
    verdict = (
        "the pre-registered kill criterion fired; per the pre-committed "
        "contingency the paper pivots to its contingency framing and the full "
        "report follows within 72 hours"
        if tripped
        else "the kill criterion did not fire"
    )
    return {
        "status": "published",
        "sentence": (
            f"The Round of 16 checkpoint has been evaluated: on the {n} "
            "pre-registered group-stage forecasts, M2 was "
            f"{magnitude:.2f} SE {direction} M0 against the {threshold_label} SE "
            f"threshold; {verdict}."
        ),
    }


# ── Top-level brief assembly ─────────────────────────────────────────────────


def build_brief(bundle_dir: Path, generated_at_utc: str) -> dict:
    """Build the full BriefSample-shaped issue dict from a committed bundle.

    Pure: a function of the files under ``bundle_dir`` and the ``generated_at_utc``
    stamp. Writes nothing. Used directly by the unit tests against a synthetic
    bundle, and by ``publish_daily_brief`` during regen.
    """
    bundle_dir = Path(bundle_dir)
    meta = _read_json(bundle_dir / "snapshot_meta.json") or {}
    tournament = _read_json(bundle_dir / "tournament.json") or {}

    brief_day = _bogota_date(generated_at_utc)
    today = brief_day
    yesterday = brief_day - timedelta(days=1)
    brief_date_str = brief_day.isoformat()

    # ── Fixtures today / results yesterday, from the priced cards ─────────────
    cards = _load_match_cards(bundle_dir)
    today_fixtures: list[dict] = []
    yesterday_results: list[dict] = []
    future_days: list[date] = []
    for card in cards:
        kickoff = card["kickoff_utc"]
        kday = _bogota_date(kickoff)
        settled = _is_settled(card)
        if kday == today and not settled:
            today_fixtures.append((kickoff, _fixture_entry(card)))
        elif kday == yesterday and settled:
            yesterday_results.append((kickoff, _result_entry(card)))
        elif kday > today and not settled:
            future_days.append(kday)

    today_fixtures.sort(key=lambda x: _parse_iso(x[0]))
    yesterday_results.sort(key=lambda x: _parse_iso(x[0]))
    today_fixtures = [e for _, e in today_fixtures]
    yesterday_results = [e for _, e in yesterday_results]
    next_fixture_date = min(future_days).isoformat() if future_days else None

    # ── Tournament state ─────────────────────────────────────────────────────
    settled_count = int(meta.get("matches_settled", 0))
    remaining = int(meta.get("matches_remaining", 0))
    total = settled_count + remaining
    phase_label = _phase_label(str(meta.get("tournament_phase", "")))
    tournament_state = {
        "phase_label": phase_label,
        "matches_settled": settled_count,
        "matches_remaining": remaining,
        "total_matches": total,
        "sentence": (
            f"{phase_label}: {settled_count} of {total} matches settled, "
            f"{remaining} remaining."
        ),
    }

    r16 = _r16_checkpoint_status(bundle_dir)
    divergence = _divergence_status(bundle_dir)

    # ── Featured teams: display-only, from today's fixtures then yesterday's
    #    results. No probabilities attached. Capped at five chips. ────────────
    featured: list[dict] = []
    seen: set[str] = set()
    for entry in [*today_fixtures, *yesterday_results]:
        for side in ("home", "away"):
            ref = entry[side]
            code = ref.get("fifa_code")
            if code and code not in seen:
                seen.add(code)
                featured.append(
                    {"code": code, "name": (ref.get("display_name") or code).upper()}
                )
            if len(featured) >= 5:
                break
        if len(featured) >= 5:
            break

    # ── Prose: lead-in + headline. Calibration-led, no per-match edges. ──────
    has_ko_today = any(not f["graded"] for f in today_fixtures)
    tournament_sentence = f"{tournament_state['sentence']} {r16['sentence']}"

    if today_fixtures:
        n = len(today_fixtures)
        tie_word = "tie" if n == 1 else "ties"
        match_sentence = (
            f"{n} {tie_word} scheduled today; the model's 1X2 and modal "
            "scorelines are logged against each fixture."
        )
        if has_ko_today:
            match_sentence += " " + KNOCKOUT_DISCLAIMER
    elif yesterday_results:
        n = len(yesterday_results)
        res_word = "result" if n == 1 else "results"
        match_sentence = (
            f"No ties are scheduled today. {n} {res_word} from yesterday are "
            "recorded below and reconciled into the tournament state."
        )
    else:
        tail = (
            f" The next fixtures are on {next_fixture_date}."
            if next_fixture_date
            else ""
        )
        match_sentence = (
            "No ties are scheduled today and none settled yesterday. The bracket "
            "state carries forward." + tail
        )

    summary_line = (
        "The frozen pre-tournament forecast is logged against the day's "
        "fixtures, extending the running calibration record."
    )
    movers_line = divergence["sentence"]

    daily = {
        "generated_at_utc": generated_at_utc,
        "tournament": tournament_state,
        "r16_checkpoint": r16,
        "divergence": divergence,
        "knockout_disclaimer": KNOCKOUT_DISCLAIMER,
        "today_fixtures": today_fixtures,
        "yesterday_results": yesterday_results,
        "next_fixture_date": next_fixture_date,
    }

    brief = {
        "brief_date": brief_date_str,
        "issue_number": _issue_number(brief_day),
        "model_variant": str(meta.get("champion_model", "M_STAR")),
        "code_sha": str(meta.get("code_sha", "")),
        "data_snapshot_sha": str(meta.get("data_sha", "")),
        "mc_runs": int(meta.get("mc_runs", tournament.get("mc_runs", 0)) or 0),
        "next_brief_utc": f"{(brief_day + timedelta(days=1)).isoformat()}T12:00:00Z",
        "latest_archive_url": f"/briefs/{brief_date_str}",
        "lead_in": {
            "tournament_sentence": tournament_sentence,
            "match_sentence": match_sentence,
            "fallback_used": not today_fixtures and not yesterday_results,
        },
        "headline": {
            "summary_line": summary_line,
            "movers_line": movers_line,
        },
        # Standing prohibition, enforced structurally: the Brief never ranks,
        # features, or single-outs a market divergence. These three fields are
        # ALWAYS empty/absent regardless of what divergence.json contains.
        "teaser": {"has_divergence": False},
        "top_divergences": [],
        "tournament_movers": [],
        "suppressed_today": [],
        "featured_teams": featured,
        "methodology_links": {
            **METHODOLOGY_LINKS,
            "this_brief_archive": f"/briefs/{brief_date_str}",
        },
        "daily": daily,
    }

    _assert_no_typographic_dashes(brief)
    return brief


def _assert_no_typographic_dashes(brief: dict) -> None:
    """Structural guard: no en dash (U+2013) or em dash (U+2014) may reach a
    generated issue. ASCII hyphen-minus is fine. Raises so a bad build fails
    loudly rather than shipping a forbidden character into published copy."""
    blob = json.dumps(brief, ensure_ascii=False)
    # Detect en dash (U+2013) and em dash (U+2014) by codepoint, never by
    # embedding the literal glyphs in this source file.
    for cp, name in ((0x2013, "en dash"), (0x2014, "em dash")):
        if chr(cp) in blob:
            raise ValueError(
                f"generated brief contains a forbidden {name} (U+{cp:04X})"
            )


def publish_daily_brief(
    bundle_dir: Path,
    briefs_dir: Path,
    generated_at_utc: str,
) -> Path:
    """Build today's issue and write it to ``briefs_dir/<YYYY-MM-DD>.json``.

    Idempotent: the filename is the Colombia civil day, so re-running a regen the
    same day overwrites that day's issue in place and never duplicates. Returns
    the written path.
    """
    briefs_dir = Path(briefs_dir)
    briefs_dir.mkdir(parents=True, exist_ok=True)
    brief = build_brief(bundle_dir, generated_at_utc)
    out = briefs_dir / f"{brief['brief_date']}.json"
    out.write_text(json.dumps(brief, indent=2) + "\n")
    return out


# ── Manual invocation ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    _PROJECT_ROOT = Path(__file__).resolve().parent.parent
    _DATA_ROOT = _PROJECT_ROOT / "website" / "public" / "data"

    parser = argparse.ArgumentParser(
        description="Build today's automated daily Brief from a committed bundle."
    )
    parser.add_argument(
        "--bundle-dir",
        type=Path,
        default=_DATA_ROOT / "latest",
        help="Snapshot bundle to read (default: website/public/data/latest).",
    )
    parser.add_argument(
        "--briefs-dir",
        type=Path,
        default=_DATA_ROOT / "briefs",
        help="Output dir (default: website/public/data/briefs).",
    )
    parser.add_argument(
        "--generated-at-utc",
        type=str,
        default=None,
        help="Override the generation stamp (ISO Z). Defaults to the bundle's "
        "snapshot_meta.generated_at_utc so a manual run is deterministic.",
    )
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Print the issue JSON to stdout instead of writing it.",
    )
    args = parser.parse_args()

    gen = args.generated_at_utc
    if gen is None:
        meta = _read_json(args.bundle_dir / "snapshot_meta.json") or {}
        gen = meta.get("generated_at_utc") or meta.get("snapshot_id")
    if not gen:
        raise SystemExit(
            "no generated_at_utc available; pass --generated-at-utc explicitly."
        )

    if args.print_only:
        print(json.dumps(build_brief(args.bundle_dir, gen), indent=2))
    else:
        written = publish_daily_brief(args.bundle_dir, args.briefs_dir, gen)
        print(f"daily brief written: {written}")
