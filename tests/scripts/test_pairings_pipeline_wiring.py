"""
tests/scripts/test_pairings_pipeline_wiring.py
==============================================
cp-20 acceptance: the knockout pairings feed is automatic.

These tests lock the durable wiring that makes the Matches page self-populate
knockout cards on every regen with no manual "Refresh WC 2026 kickoff schedule"
dispatch. The root cause cp-20 fixes was operational: data/live/knockout_pairings.json
was written only by the dispatch-only refresh_schedule.yml, so on main the file
was absent and the regen emitted nothing. The fix wires the fetch into both
automated regen pipelines, ahead of the regen step that reads it.

What is proven here:

1. fetch-before-regen: in BOTH automated regen pipelines (nightly_pipeline.yml and
   on_demand_regen.yml) the fetch_knockout_pairings.py step runs BEFORE the
   regenerate_snapshot_from_batch.py step in the same job, so the regen reads the
   freshly written pairings.
2. staged-before-commit: both pipelines stage data/live/knockout_pairings.json
   before the commit step, so the refreshed file rides forward as the next run's
   last-good base.
3. fetch wired safely: every pairings-bearing workflow (the two regen pipelines
   plus the kept refresh_schedule.yml) carries the fetch step with the
   FOOTBALL_DATA_API_KEY wired in; in the regen pipelines the step is non-fatal so
   a transient feed outage cannot break the snapshot publish.
4. populated -> cards: a populated pairings file yields matches_live/ cards (the
   regen emitter turns concrete pairings into per-match knockout cards).
5. status inclusion: the producer keeps SCHEDULED, IN_PLAY and FINISHED concrete
   knockouts (no SCHEDULED-only filter), so played knockouts settle and upcoming
   ones forecast.
6. durability guard: a zero-pairing fetch never wipes a populated file unless an
   explicit reset is requested.

Run:
  pytest tests/scripts/test_pairings_pipeline_wiring.py -v
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
import yaml

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import ingestion.fetch_knockout_pairings as ING  # noqa: E402
import scripts.regenerate_snapshot_from_batch as R  # noqa: E402
from frozen_batch import FROZEN_BATCH_ID  # noqa: E402

WORKFLOWS = PROJECT_ROOT / ".github" / "workflows"
CONCRETE_FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "fd_wc_knockouts_concrete.json"
UNRESOLVED_FIXTURE = PROJECT_ROOT / "tests" / "fixtures" / "fd_wc_schedule_sample.json"
TEAMS_DIR = PROJECT_ROOT / "website" / "public" / "data" / "latest" / "teams"

# The two automated regen pipelines cp-20 wires the fetch into.
REGEN_PIPELINES = ["nightly_pipeline.yml", "on_demand_regen.yml"]
# Every workflow that must carry the pairings fetch (the two above + the kept
# manual refresh, which still fetches pairings in publish mode).
ALL_PAIRINGS_WORKFLOWS = REGEN_PIPELINES + ["refresh_schedule.yml"]

# Needles, matched against each step's parsed `run` string (YAML strips the
# descriptive `#` comments above a step, so these match the executed shell only).
FETCH = "ingestion/fetch_knockout_pairings.py"
REGEN = "scripts/regenerate_snapshot_from_batch.py"
STAGE = "git add data/live/knockout_pairings.json"
COMMIT = "git commit"


def _steps(workflow_name: str) -> list[dict]:
    """Return the ordered step list of a single-job workflow."""
    doc = yaml.safe_load((WORKFLOWS / workflow_name).read_text())
    jobs = doc["jobs"]
    assert len(jobs) == 1, f"{workflow_name}: expected a single job, got {list(jobs)}"
    (job,) = jobs.values()
    return job["steps"]


def _index(steps: list[dict], needle: str) -> int | None:
    """Index of the first step whose `run` contains needle, or None."""
    for i, step in enumerate(steps):
        if needle in (step.get("run") or ""):
            return i
    return None


def _fetch_step(steps: list[dict]) -> dict | None:
    for step in steps:
        if FETCH in (step.get("run") or ""):
            return step
    return None


# ── 1. fetch-before-regen, in the same job ───────────────────────────────────


@pytest.mark.parametrize("wf", REGEN_PIPELINES)
def test_fetch_precedes_regen(wf: str):
    steps = _steps(wf)
    fetch_i = _index(steps, FETCH)
    regen_i = _index(steps, REGEN)
    assert fetch_i is not None, f"{wf}: no knockout-pairings fetch step found"
    assert regen_i is not None, f"{wf}: no snapshot regen step found"
    assert fetch_i < regen_i, (
        f"{wf}: the pairings fetch (step {fetch_i}) must run BEFORE the regen "
        f"(step {regen_i}); otherwise the regen reads a stale or missing file"
    )


# ── 2. staged before commit ──────────────────────────────────────────────────


@pytest.mark.parametrize("wf", REGEN_PIPELINES)
def test_pairings_staged_before_commit(wf: str):
    steps = _steps(wf)
    stage_i = _index(steps, STAGE)
    commit_i = _index(steps, COMMIT)
    assert stage_i is not None, f"{wf}: data/live/knockout_pairings.json is never staged"
    assert commit_i is not None, f"{wf}: no commit step found"
    assert stage_i < commit_i, (
        f"{wf}: the pairings file must be staged (step {stage_i}) before the "
        f"commit (step {commit_i})"
    )


# ── 3. fetch step wired with the FD key, and non-fatal in the regen pipelines ─


@pytest.mark.parametrize("wf", ALL_PAIRINGS_WORKFLOWS)
def test_fetch_step_carries_fd_key(wf: str):
    step = _fetch_step(_steps(wf))
    assert step is not None, f"{wf}: no knockout-pairings fetch step found"
    env = step.get("env") or {}
    assert "FOOTBALL_DATA_API_KEY" in env, (
        f"{wf}: the pairings fetch step must wire FOOTBALL_DATA_API_KEY"
    )


@pytest.mark.parametrize("wf", REGEN_PIPELINES)
def test_fetch_step_is_non_fatal(wf: str):
    # A transient FD outage must not break the nightly/on-demand publish; the
    # step swallows a non-zero exit and emits a GitHub warning annotation.
    step = _fetch_step(_steps(wf))
    run = step.get("run") or ""
    assert "||" in run and "::warning" in run, (
        f"{wf}: the pairings fetch step must be non-fatal (guarded with '|| echo "
        f"::warning::') so an FD outage cannot break the snapshot publish"
    )


# ── 4. a populated pairings file yields matches_live/ cards ───────────────────


def _roster() -> dict[str, dict]:
    roster: dict[str, dict] = {}
    for tf in sorted(TEAMS_DIR.glob("*.json")):
        tj = json.loads(tf.read_text())
        roster[tj.get("fifa_code") or tf.stem] = tj
    return roster


def test_populated_pairings_yield_cards(tmp_path, monkeypatch):
    out_dir = tmp_path / "bundle"
    out_dir.mkdir()

    doc = ING.build_document(
        ING.build_pairings(json.loads(CONCRETE_FIXTURE.read_text())),
        source_label="file:test",
        fetched_at_utc="2026-06-30T00:00:00Z",
    )
    assert doc["count"] == 4
    pairings_path = tmp_path / "knockout_pairings.json"
    pairings_path.write_text(json.dumps(doc, indent=2) + "\n")

    monkeypatch.setattr(R, "LIVE_KNOCKOUT_PAIRINGS", pairings_path)
    R.emit_live_knockout_matches(
        _roster(), FROZEN_BATCH_ID, "2026-06-30T00:00:00Z", out_dir
    )

    cards = sorted((out_dir / R.MATCHES_LIVE_DIRNAME).glob("*.json"))
    assert [c.stem for c in cards] == [
        "KO-FD5201",
        "KO-FD5202",
        "KO-FD5203",
        "KO-FD5301",
    ], [c.name for c in cards]
    # Every card is explicitly ungraded and namespaced into matches_live/.
    for c in cards:
        card = json.loads(c.read_text())
        assert card["match_id"].startswith("KO-FD")
        assert card["live_provenance"]["graded"] is False


# ── 5. SCHEDULED + IN_PLAY + FINISHED all kept (no status filter) ─────────────


def test_producer_keeps_scheduled_in_play_and_finished():
    """The R32 is a mix of SCHEDULED, IN_PLAY and FINISHED. All concrete ones are
    kept; status is recorded as metadata, never used to drop a fixture."""

    def ko(mid: int, status: str, home: str, away: str, when: str) -> dict:
        return {
            "id": mid,
            "stage": "LAST_32",
            "status": status,
            "utcDate": when,
            "homeTeam": {"name": home},
            "awayTeam": {"name": away},
        }

    payload = {
        "matches": [
            ko(9001, "SCHEDULED", "Portugal", "Norway", "2026-06-28T19:00:00Z"),
            ko(9002, "IN_PLAY", "Brazil", "Japan", "2026-06-28T22:00:00Z"),
            ko(9003, "FINISHED", "France", "Croatia", "2026-06-29T19:00:00Z"),
        ]
    }
    by_id = {p["source_id"]: p for p in ING.build_pairings(payload)}
    assert set(by_id) == {9001, 9002, 9003}, (
        "all three statuses must be kept; got " + repr(sorted(by_id))
    )
    assert by_id[9001]["status"] == "SCHEDULED"
    assert by_id[9002]["status"] == "IN_PLAY"
    assert by_id[9003]["status"] == "FINISHED"


# ── 6. durability guard: a 0-pairing fetch never wipes a populated file ───────


def test_durability_guard_keeps_populated_file(tmp_path):
    out = tmp_path / "kp.json"

    # Seed a populated file (4 concrete pairings).
    assert ING.run(from_file=CONCRETE_FIXTURE, out_path=out) == 0
    assert json.loads(out.read_text())["count"] == 4

    # A fetch that finds zero concrete pairings must KEEP the populated file.
    assert ING.run(from_file=UNRESOLVED_FIXTURE, out_path=out) == 0
    assert json.loads(out.read_text())["count"] == 4

    # An explicit reset still overwrites with the empty result.
    assert (
        ING.run(from_file=UNRESOLVED_FIXTURE, out_path=out, allow_empty_overwrite=True)
        == 0
    )
    assert json.loads(out.read_text())["count"] == 0


def test_empty_fetch_writes_when_no_existing_file(tmp_path):
    # The normal pre-draw state: no file yet, an empty result writes a 0-count
    # file (the guard only protects an EXISTING populated file).
    out = tmp_path / "kp.json"
    assert ING.run(from_file=UNRESOLVED_FIXTURE, out_path=out) == 0
    assert out.exists() and json.loads(out.read_text())["count"] == 0
