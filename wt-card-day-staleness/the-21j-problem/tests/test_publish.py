"""
tests/test_publish.py
=====================
Session 11 · El Voto del 21 de Junio — daily publish wrapper tests.

Covers the three behaviours the brief calls out, against a real throwaway git
repo (so the git plumbing is exercised, not mocked) with the pipeline steps
injected as deterministic fakes (so no network and no real Monte Carlo):

  1. skip-if-unchanged   — identical model data_hash + no Pulso change => no commit,
                           and the volatile churn is reverted (tree left clean).
  2. silence-freeze      — on/after publish.silence_boundary the wrapper does NOT
                           run the poll pipeline and does NOT publish a fresh
                           poll-driven number; it stamps a notice on the frozen
                           snapshot and preserves the existing number. Idempotent.
  3. writes-only-21J     — the wrapper stages/commits ONLY the-21j-problem/data/;
                           a file dirtied outside that subtree is never committed,
                           and the scope assertion rejects an out-of-subtree path.

Run from the-21j-problem/ root:
    python -m pytest tests/test_publish.py -v
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import scripts.publish_voto_snapshot as P  # noqa: E402

# A date safely BEFORE the configured silence boundary (normal-publishing day),
# and one safely on/after it (silence). Derived from config so the tests track
# whatever boundary is set rather than hardcoding a second copy of it.
PRE_SILENCE_DAY = P.SILENCE_BOUNDARY.replace(day=max(1, P.SILENCE_BOUNDARY.day - 3))
SILENCE_DAY = P.SILENCE_BOUNDARY

# An instant safely AFTER poll close (event settled), derived from config so the
# tests track whatever poll_close is set rather than hardcoding it.
AFTER_CLOSE = P.POLL_CLOSE + timedelta(hours=6)


# =============================================================================
# Fixtures — a real tmp git repo wired to the publish module's path constants
# =============================================================================


def _git(root: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(root), *args],
        capture_output=True, text=True, check=True,
    ).stdout.strip()


@pytest.fixture
def repo_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """A tmp git repo laid out like the real one, with P's paths repointed into it."""
    root = tmp_path
    data = root / "the-21j-problem" / "data"
    snap21j = data / "snapshots" / "21j"
    pulso = data / "snapshots" / "pulso"
    raw = data / "raw"
    processed = data / "processed"
    for d in (snap21j, pulso, raw, processed, root / "website"):
        d.mkdir(parents=True, exist_ok=True)

    # Initial committed state: a published model snapshot + a Pulso snapshot.
    model_latest = snap21j / "latest.json"
    model_dated = snap21j / "snapshot_20260608.json"
    model_doc = {"snapshot_date": "2026-06-08", "data_hash": "MODEL_HASH_A", "p_cepeda": 0.4637}
    model_latest.write_text(json.dumps(model_doc, indent=2), encoding="utf-8")
    model_dated.write_text(json.dumps(model_doc, indent=2), encoding="utf-8")
    (raw / "polls_co_2026.parquet").write_text("PARQUET_A", encoding="utf-8")
    (processed / "mapa_municipios.json").write_text(json.dumps({"data_hash": "MAPA_A"}), encoding="utf-8")
    pulso_latest = pulso / "latest.json"
    pulso_latest.write_text(json.dumps({"data_hash": "PULSO_HASH_A"}), encoding="utf-8")
    registry = data / "snapshots" / "snapshot_registry.jsonl"
    registry.write_text("", encoding="utf-8")
    # A World-Cup-side file OUTSIDE the 21J data subtree, to prove scope.
    wc_file = root / "website" / "wc_snapshot.json"
    wc_file.write_text(json.dumps({"wc": "untouched"}), encoding="utf-8")

    _git(root, "init", "-q")
    _git(root, "config", "user.name", "test")
    _git(root, "config", "user.email", "test@example.com")
    _git(root, "add", "-A")
    _git(root, "commit", "-q", "-m", "initial")

    # Repoint the publish module's path constants into the tmp repo.
    monkeypatch.setattr(P, "DATA_DIR", data)
    monkeypatch.setattr(P, "MODEL_LATEST", model_latest)
    monkeypatch.setattr(P, "MODEL_SNAPSHOT_DIR", snap21j)
    monkeypatch.setattr(P, "PULSO_LATEST", pulso_latest)
    monkeypatch.setattr(P, "PULSO_SNAPSHOT_DIR", pulso)
    monkeypatch.setattr(
        P, "MODEL_OUTPUTS",
        [raw / "polls_co_2026.parquet", snap21j, processed / "mapa_municipios.json"],
    )
    monkeypatch.setattr(P, "PULSO_OUTPUTS", [pulso])

    return {
        "root": root, "repo": P.GitRepo(root),
        "model_latest": model_latest, "model_dated": model_dated,
        "pulso_latest": pulso_latest, "registry": registry, "wc_file": wc_file,
        "pulso_dir": pulso,
    }


def _status_clean(root: Path) -> bool:
    return _git(root, "status", "--porcelain") == ""


def _committed_files(root: Path) -> list[str]:
    """Paths touched by the HEAD commit (vs its parent)."""
    return [
        ln for ln in _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").splitlines()
        if ln.strip()
    ]


# Fake pipeline builders. Each returns a callable(force) that mutates the tmp
# files the way the real scripts would, parametrised by whether the model / Pulso
# substance actually changed (new data_hash) or only churned (same hash, new
# wall-clock-ish field).


def _make_pipeline(env, *, model_changes: bool, pulso_changes: bool):
    calls = {"n": 0}

    def pipeline(force: bool) -> None:
        calls["n"] += 1
        # Model side: rewrite latest + dated + parquet + mapa; append a registry line.
        new_hash = "MODEL_HASH_B" if model_changes else "MODEL_HASH_A"
        for f in (env["model_latest"], env["model_dated"]):
            doc = json.loads(f.read_text())
            doc["data_hash"] = new_hash
            doc["generated_at"] = "2026-06-08T11:30:00+00:00"  # always-churning field
            if model_changes:
                doc["p_cepeda"] = 0.51
            f.write_text(json.dumps(doc, indent=2), encoding="utf-8")
        (env["pulso_dir"].parent.parent / "raw" / "polls_co_2026.parquet").write_text(
            "PARQUET_B" if model_changes else "PARQUET_A_churn", encoding="utf-8"
        )
        # Pulso side: rewrite latest, append history, drop a new hourly file.
        pdoc = json.loads(env["pulso_latest"].read_text())
        pdoc["data_hash"] = "PULSO_HASH_B" if pulso_changes else "PULSO_HASH_A"
        pdoc["generated_at"] = "2026-06-08T11:30:00+00:00"
        env["pulso_latest"].write_text(json.dumps(pdoc, indent=2), encoding="utf-8")
        (env["pulso_dir"] / "pulso_2026060811.json").write_text(json.dumps(pdoc), encoding="utf-8")
        with env["registry"].open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"run": calls["n"]}) + "\n")

    pipeline.calls = calls  # type: ignore[attr-defined]
    return pipeline


# =============================================================================
# 1 · skip-if-unchanged
# =============================================================================


def test_skip_if_unchanged_makes_no_commit_and_reverts_churn(repo_env):
    env = repo_env
    head_before = env["repo"].head()
    # Pipeline churns timestamps but neither data_hash changes.
    pipeline = _make_pipeline(env, model_changes=False, pulso_changes=False)

    result = P.publish(
        today=PRE_SILENCE_DAY, force=True, do_commit=True,
        repo=env["repo"], run_pipeline=pipeline,
    )

    assert result.committed is False
    assert result.action == "skip"
    assert result.model_changed is False and result.pulso_changed is False
    assert env["repo"].head() == head_before, "no new commit on a no-op run"
    assert _status_clean(env["root"]), "volatile churn must be reverted, tree left clean"


def test_change_commits_only_changed_group(repo_env):
    """A Pulso-only change commits Pulso + registry, not the unchanged model files."""
    env = repo_env
    pipeline = _make_pipeline(env, model_changes=False, pulso_changes=True)

    result = P.publish(
        today=PRE_SILENCE_DAY, force=True, do_commit=True,
        repo=env["repo"], run_pipeline=pipeline,
    )

    assert result.committed is True and result.action == "commit"
    files = _committed_files(env["root"])
    assert all(f.startswith("the-21j-problem/data/") for f in files)
    # Pulso latest committed; the unchanged poll parquet / model snapshot are NOT.
    assert any("snapshots/pulso/" in f for f in files)
    assert not any(f.endswith("polls_co_2026.parquet") for f in files), \
        "model group unchanged -> its churn must not be committed"
    assert _status_clean(env["root"])


# =============================================================================
# 2 · silence-freeze
# =============================================================================


def test_silence_freezes_without_publishing_a_new_number(repo_env):
    env = repo_env
    pipeline = _make_pipeline(env, model_changes=True, pulso_changes=True)

    result = P.publish(
        today=SILENCE_DAY, force=True, do_commit=True,
        repo=env["repo"], run_pipeline=pipeline,
    )

    # The poll pipeline must NOT have run during silence.
    assert pipeline.calls["n"] == 0, "no ingestion/aggregation during electoral silence"
    assert result.silence is True
    assert result.committed is True and result.action == "silence-freeze-commit"

    doc = json.loads(env["model_latest"].read_text())
    # A visible notice was stamped...
    assert doc["publication_notice"]["status"] == "electoral_silence"
    assert doc["publication_notice"]["silence_boundary"] == P.SILENCE_BOUNDARY.isoformat()
    # ...and the EXISTING number was preserved, not recomputed.
    assert doc["p_cepeda"] == 0.4637
    assert doc["data_hash"] == "MODEL_HASH_A"

    files = _committed_files(env["root"])
    assert all(f.startswith("the-21j-problem/data/") for f in files)
    assert _status_clean(env["root"])


def test_silence_freeze_is_idempotent_second_run_skips(repo_env):
    env = repo_env
    pipeline = _make_pipeline(env, model_changes=False, pulso_changes=False)

    first = P.publish(today=SILENCE_DAY, force=True, do_commit=True,
                      repo=env["repo"], run_pipeline=pipeline)
    assert first.committed is True

    head_after_first = env["repo"].head()
    second = P.publish(today=SILENCE_DAY, force=True, do_commit=True,
                       repo=env["repo"], run_pipeline=pipeline)

    assert second.committed is False
    assert second.action == "silence-skip"
    assert env["repo"].head() == head_after_first, "notice already present -> no second commit"
    assert _status_clean(env["root"])


def test_silence_freezes_pulso_by_default(repo_env, monkeypatch):
    """With the conservative default, Pulso is not run during silence."""
    env = repo_env
    monkeypatch.setattr(P, "SILENCE_FREEZES_PULSO", True)
    pulso_calls = {"n": 0}

    def pulso_only(force):  # should never be called
        pulso_calls["n"] += 1

    P.publish(today=SILENCE_DAY, force=True, do_commit=True,
              repo=env["repo"], run_pipeline=_make_pipeline(env, model_changes=False, pulso_changes=False),
              run_pulso_only=pulso_only)
    assert pulso_calls["n"] == 0


# =============================================================================
# 2b · event-closed (poll close) — Session 18
# =============================================================================


def test_event_close_marks_final_pre_electoral_without_publishing(repo_env):
    """On/after poll_close the wrapper stamps event_closed, runs no pipeline, and
    preserves the existing (frozen) number as the archived final forecast."""
    env = repo_env
    pipeline = _make_pipeline(env, model_changes=True, pulso_changes=True)

    result = P.publish(
        now=AFTER_CLOSE, force=True, do_commit=True,
        repo=env["repo"], run_pipeline=pipeline,
    )

    # No ingestion/aggregation once the vote has closed.
    assert pipeline.calls["n"] == 0, "no ingestion/aggregation after the vote closes"
    assert result.event_closed is True
    assert result.committed is True and result.action == "event-closed-commit"

    doc = json.loads(env["model_latest"].read_text())
    notice = doc["publication_notice"]
    assert notice["status"] == "event_closed"
    assert notice["poll_close"] == P.POLL_CLOSE.isoformat()
    assert notice["frozen_snapshot_date"] == "2026-06-08"
    # The EXISTING number is preserved, never recomputed.
    assert doc["p_cepeda"] == 0.4637
    assert doc["data_hash"] == "MODEL_HASH_A"

    files = _committed_files(env["root"])
    assert all(f.startswith("the-21j-problem/data/") for f in files)
    assert _status_clean(env["root"])


def test_event_close_is_idempotent_second_run_skips(repo_env):
    env = repo_env
    pipeline = _make_pipeline(env, model_changes=False, pulso_changes=False)

    first = P.publish(now=AFTER_CLOSE, force=True, do_commit=True,
                      repo=env["repo"], run_pipeline=pipeline)
    assert first.committed is True and first.action == "event-closed-commit"

    head_after_first = env["repo"].head()
    second = P.publish(now=AFTER_CLOSE, force=True, do_commit=True,
                       repo=env["repo"], run_pipeline=pipeline)

    assert second.committed is False
    assert second.action == "event-closed-skip"
    assert env["repo"].head() == head_after_first, "notice already present -> no second commit"
    assert _status_clean(env["root"])


def test_event_closed_takes_precedence_over_silence(repo_env):
    """After poll close the notice is event_closed, not electoral_silence, even
    though the silence boundary is also in the past."""
    env = repo_env
    result = P.publish(now=AFTER_CLOSE, force=True, do_commit=True,
                       repo=env["repo"],
                       run_pipeline=_make_pipeline(env, model_changes=False, pulso_changes=False))

    assert result.event_closed is True and result.silence is False
    doc = json.loads(env["model_latest"].read_text())
    assert doc["publication_notice"]["status"] == "event_closed"


# =============================================================================
# 3 · writes-only-21J-paths invariant
# =============================================================================


def test_scope_assertion_rejects_out_of_subtree_path():
    subtree = "the-21j-problem/data"
    # All inside -> OK.
    P._assert_within_subtree(
        ["the-21j-problem/data/snapshots/21j/latest.json", "the-21j-problem/data"], subtree
    )
    # One path outside -> raises.
    with pytest.raises(P.PublishScopeError):
        P._assert_within_subtree(
            ["the-21j-problem/data/x.json", "website/wc_snapshot.json"], subtree
        )
    # A sibling that merely shares the prefix string is still outside.
    with pytest.raises(P.PublishScopeError):
        P._assert_within_subtree(["the-21j-problem/data-evil/x"], subtree)


def test_commit_never_includes_files_outside_the_subtree(repo_env):
    """Even if the pipeline dirties a WC file, it is never staged or committed."""
    env = repo_env

    def pipeline(force):
        # Legit 21J change...
        doc = json.loads(env["model_latest"].read_text())
        doc["data_hash"] = "MODEL_HASH_B"
        doc["p_cepeda"] = 0.51
        env["model_latest"].write_text(json.dumps(doc, indent=2), encoding="utf-8")
        # ...plus an accidental write OUTSIDE the 21J subtree.
        env["wc_file"].write_text(json.dumps({"wc": "TAMPERED"}), encoding="utf-8")

    result = P.publish(today=PRE_SILENCE_DAY, force=True, do_commit=True,
                       repo=env["repo"], run_pipeline=pipeline)

    assert result.committed is True
    files = _committed_files(env["root"])
    assert all(f.startswith("the-21j-problem/data/") for f in files)
    assert "website/wc_snapshot.json" not in files, "WC file must never be committed by the publish job"
    # The WC file remains dirty in the working tree (untouched by the wrapper's git ops).
    assert "website/wc_snapshot.json" in _git(env["root"], "status", "--porcelain")


def test_dry_run_stages_checks_then_leaves_tree_clean(repo_env):
    env = repo_env
    head_before = env["repo"].head()
    pipeline = _make_pipeline(env, model_changes=True, pulso_changes=True)

    result = P.publish(today=PRE_SILENCE_DAY, force=True, do_commit=False,
                       repo=env["repo"], run_pipeline=pipeline)

    assert result.committed is False and result.action == "dry-run"
    assert result.staged_paths and all(
        p.startswith("the-21j-problem/data/") for p in result.staged_paths
    )
    assert env["repo"].head() == head_before
    assert _status_clean(env["root"]), "dry-run must leave the working tree clean"
