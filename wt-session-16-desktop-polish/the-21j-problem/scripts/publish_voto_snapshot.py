"""
scripts/publish_voto_snapshot.py
================================
Session 11 · El Voto del 21 de Junio — daily publishing wrapper

A thin, unattended wrapper around the existing 21J pipeline. Run on a schedule by
``.github/workflows/voto_snapshot_publish.yml`` it refreshes the public snapshot so
the live page updates itself through 21 de junio without a human running the
pipeline by hand.

What it does (normal day)
-------------------------
Runs, in order, the four pipeline entry points already in the repo:

  1. ``ingestion/fetch_polls.py``      (force) — re-read the poll corpus
  2. ``model/simulate_runoff.py``      (force) — aggregator + Monte Carlo. The
     calibrated-cycle eligibility gate (model/eligibility.py, Session 10) runs
     AUTOMATICALLY inside the aggregator boundary here — there is no per-pollster
     human step. An ineligible real poll is recorded as excluded, never deleted.
  3. ``model/build_mapa.py``           (force) — per-departamento decisiveness map
  4. ``pulso/run_pulso.py``            (force) — sentiment/intensity index

Then it commits the refreshed snapshots — and ONLY the refreshed snapshots, all of
which live under ``the-21j-problem/data/``.

Two safety behaviours make it fit to run unattended:

* **Skip-if-unchanged.** A re-run with identical inputs reproduces an identical
  model ``data_hash`` (the hash excludes wall-clock fields). If the model
  ``data_hash`` is unchanged AND Pulso did not change, the wrapper reverts the
  volatile churn (fresh timestamps, re-appended registry lines) and makes NO
  commit. A near-no-op run is silent.

* **Electoral-silence freeze.** Colombia restricts publishing NEW poll-based
  numbers in the days before a vote. On or after ``publish.silence_boundary``
  (config; compared against the real UTC run date) the wrapper STOPS ingesting and
  STOPS publishing a fresh poll-driven number. It freezes the last legally
  publishable model snapshot in place and stamps a visible ``publication_notice``
  on it. It never silently emits a new poll-driven number during silence. The
  boundary date and whether Pulso is also frozen are read from config and flagged
  for legal confirmation — this wrapper does not encode a guess about the law.

Scope invariant (hard)
-----------------------
The wrapper stages and commits ONLY ``publish.writable_subtree``
(``the-21j-problem/data``). It never touches a World-Cup file, the WC snapshot
registry, the WC parquets, or root config. If the pipeline ever dirties a path
outside that subtree, the wrapper refuses to commit (raises ``PublishScopeError``)
rather than push a cross-project change. It uses no World-Cup DB secrets.

Run
---
  python scripts/publish_voto_snapshot.py            # production: refresh + commit
  python scripts/publish_voto_snapshot.py --dry-run  # run + decide + report, no commit
  python scripts/publish_voto_snapshot.py --today 2026-06-15   # exercise the silence path
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from pathlib import Path

import yaml

# ── Project root on sys.path so we can import the pipeline + utils ────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from utils.logger import get_logger  # noqa: E402

log = get_logger(__name__)

# =============================================================================
# Config
# =============================================================================

with open(PROJECT_ROOT / "config.yaml", encoding="utf-8") as _f:
    CFG = yaml.safe_load(_f)

_PUB = CFG["publish"]
SILENCE_BOUNDARY = date.fromisoformat(str(_PUB["silence_boundary"]))
SILENCE_FREEZES_PULSO = bool(_PUB["silence_freezes_pulso"])
# Collapse the YAML folded scalar to a single clean line.
SILENCE_NOTICE = " ".join(str(_PUB["silence_notice"]).split())
COMMIT_AUTHOR_NAME = str(_PUB["commit_author_name"])
COMMIT_AUTHOR_EMAIL = str(_PUB["commit_author_email"])
WRITABLE_SUBTREE_CFG = str(_PUB["writable_subtree"]).rstrip("/")

# Snapshot pointers (read for the skip-if-unchanged decision and the freeze).
MODEL_LATEST = PROJECT_ROOT / CFG["paths_session04"]["latest_pointer"]
MODEL_SNAPSHOT_DIR = PROJECT_ROOT / CFG["paths_session04"]["snapshot_dir"]
PULSO_LATEST = PROJECT_ROOT / CFG["paths_session05"]["latest_pointer"]
PULSO_SNAPSHOT_DIR = PROJECT_ROOT / CFG["paths_session05"]["snapshot_dir"]
DATA_DIR = PROJECT_ROOT / "data"

# Output groups, for dropping churn from a group that did not meaningfully change
# (so a Pulso-only day does not re-commit the poll parquet / model snapshot with a
# fresh ingested_at / generated_at and nothing else). The registry is shared and
# append-only; it is left to record every run and is never reverted on a commit.
MODEL_OUTPUTS = [
    PROJECT_ROOT / CFG["paths"]["output_parquet"],   # data/raw/polls_co_2026.parquet
    MODEL_SNAPSHOT_DIR,                               # data/snapshots/21j/
    PROJECT_ROOT / CFG["mapa"]["paths"]["output_json"],  # data/processed/mapa_municipios.json
]
PULSO_OUTPUTS = [PULSO_SNAPSHOT_DIR]                 # data/snapshots/pulso/


class PublishScopeError(RuntimeError):
    """Raised when a commit would touch a path outside the 21J data subtree."""


# =============================================================================
# Git
# =============================================================================


class GitRepo:
    """Thin git wrapper, scoped to one repository root. Injectable for tests."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root)

    def _git(self, *args: str, check: bool = True) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["git", "-C", str(self.root), *args],
            capture_output=True,
            text=True,
            check=check,
        )

    def toplevel(self) -> Path:
        return Path(self._git("rev-parse", "--show-toplevel").stdout.strip())

    def head(self) -> str:
        return self._git("rev-parse", "HEAD").stdout.strip()

    def restore(self, pathspec: str) -> None:
        """Revert everything under ``pathspec`` to exactly HEAD.

        ``reset`` unstages (so a staged-but-new file becomes untracked rather than
        surviving ``clean``); ``checkout HEAD`` restores tracked files' index and
        worktree to HEAD; ``clean`` removes any remaining untracked files (e.g. a
        fresh hourly Pulso snapshot). Together they leave the subtree exactly as
        HEAD, whether the churn was staged or not.
        """
        self._git("reset", "-q", "HEAD", "--", pathspec, check=False)
        self._git("checkout", "HEAD", "--", pathspec, check=False)
        self._git("clean", "-fdq", "--", pathspec, check=False)

    def stage(self, pathspec: str) -> None:
        self._git("add", "--", pathspec)

    def staged_paths(self) -> list[str]:
        out = self._git("diff", "--cached", "--name-only").stdout
        return [line.strip() for line in out.splitlines() if line.strip()]

    def commit(self, message: str, *, author_name: str, author_email: str) -> None:
        self._git(
            "-c", f"user.name={author_name}",
            "-c", f"user.email={author_email}",
            "commit", "-m", message,
        )


def _git_root() -> Path:
    """The repository top level containing this project (via git, with a fallback)."""
    try:
        return GitRepo(PROJECT_ROOT).toplevel()
    except Exception:  # noqa: BLE001 — outside a git tree (shouldn't happen in CI)
        return PROJECT_ROOT.parent


def _data_subtree_rel(git_root: Path) -> str:
    """The 21J data dir as a pathspec relative to the git root.

    Derived from the filesystem (robust to where the repo is checked out) and
    cross-checked against ``publish.writable_subtree`` in config so a layout drift
    surfaces loudly instead of silently widening the commit scope.
    """
    rel = DATA_DIR.resolve().relative_to(Path(git_root).resolve()).as_posix()
    if rel != WRITABLE_SUBTREE_CFG:
        raise PublishScopeError(
            f"Computed data subtree {rel!r} != config publish.writable_subtree "
            f"{WRITABLE_SUBTREE_CFG!r}. Refusing to run with an ambiguous commit scope."
        )
    return rel


def _rel_to(git_root: Path, p: Path) -> str:
    """A pathspec for ``p`` relative to the git root (posix)."""
    return Path(p).resolve().relative_to(Path(git_root).resolve()).as_posix()


def _assert_within_subtree(paths: list[str], subtree: str) -> None:
    """Raise unless every path is the subtree itself or sits under it."""
    prefix = subtree.rstrip("/") + "/"
    outside = [p for p in paths if not (p == subtree or p.startswith(prefix))]
    if outside:
        raise PublishScopeError(
            "Refusing to commit — paths outside the 21J data subtree "
            f"({subtree}): {outside}"
        )


# =============================================================================
# Pipeline
# =============================================================================


def _default_pipeline(force: bool) -> None:
    """Run the four 21J entry points in order, in-process.

    The eligibility gate runs automatically inside ``simulate_runoff`` (it calls
    ``model.eligibility.partition_polls`` at the aggregator boundary), so there is
    no separate gate step here — that is the point.
    """
    from ingestion.fetch_polls import run as ingest_run
    from model.simulate_runoff import run as simulate_run
    from model.build_mapa import run as mapa_run
    from pulso.run_pulso import run as pulso_run

    log.stage("Pipeline 1/4 · ingestion (force=%s)" % force)
    ingest_run(force=force)
    log.stage("Pipeline 2/4 · aggregator + simulator (eligibility gate runs inside)")
    simulate_run(force=force)
    log.stage("Pipeline 3/4 · build_mapa")
    mapa_run(force=force)
    log.stage("Pipeline 4/4 · run_pulso")
    pulso_run(force=force)


def _run_pulso_only(force: bool) -> None:
    """Run only Pulso (used during silence iff Pulso is not frozen)."""
    from pulso.run_pulso import run as pulso_run

    log.stage("Pulso only (silence, Pulso not frozen)")
    pulso_run(force=force)


# =============================================================================
# Skip-if-unchanged + silence helpers
# =============================================================================


def _read_data_hash(path: Path) -> str | None:
    """The reproducible ``data_hash`` recorded in a snapshot pointer, or None."""
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8")).get("data_hash")
    except Exception:  # noqa: BLE001 — a malformed pointer counts as "changed"
        return None


def _silence_notice_for(doc: dict) -> dict:
    """The deterministic publication_notice for a given frozen snapshot doc.

    Deterministic (no timestamps) so re-stamping the same frozen snapshot is a
    no-op: the freeze commits once, then subsequent silent days skip.
    """
    return {
        "status": "electoral_silence",
        "message": SILENCE_NOTICE,
        "silence_boundary": SILENCE_BOUNDARY.isoformat(),
        "frozen_snapshot_date": doc.get("snapshot_date"),
    }


def _freeze_targets() -> list[Path]:
    """The model snapshot files to stamp: latest.json + its dated twin."""
    targets: list[Path] = []
    if MODEL_LATEST.exists():
        targets.append(MODEL_LATEST)
        try:
            latest = json.loads(MODEL_LATEST.read_text(encoding="utf-8"))
            sd = latest.get("snapshot_date")
            if sd:
                dated = MODEL_SNAPSHOT_DIR / f"snapshot_{sd.replace('-', '')}.json"
                if dated.exists() and dated.resolve() != MODEL_LATEST.resolve():
                    targets.append(dated)
        except Exception:  # noqa: BLE001
            pass
    return targets


def apply_silence_freeze() -> bool:
    """Stamp the electoral-silence notice onto the frozen model snapshot(s).

    Reads only the EXISTING committed snapshot and adds a ``publication_notice``
    field — it never recomputes a number. Idempotent: returns True iff a file
    actually changed.
    """
    targets = _freeze_targets()
    if not targets:
        log.warning(
            "Electoral silence active but no model snapshot to freeze — nothing published"
        )
        return False

    changed = False
    for t in targets:
        doc = json.loads(t.read_text(encoding="utf-8"))
        notice = _silence_notice_for(doc)
        if doc.get("publication_notice") != notice:
            doc["publication_notice"] = notice
            t.write_text(
                json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            changed = True
            log.info("Silence notice stamped", path=str(t))
        else:
            log.info("Silence notice already present (idempotent skip)", path=str(t))
    return changed


# =============================================================================
# Orchestrator
# =============================================================================


@dataclass
class PublishResult:
    action: str                      # "commit" | "skip" | "silence-freeze-commit" | "silence-skip" | "dry-run"
    committed: bool
    silence: bool
    model_changed: bool
    pulso_changed: bool
    reason: str
    staged_paths: list[str] = field(default_factory=list)
    head_before: str = ""
    head_after: str = ""


def publish(
    *,
    today: date | None = None,
    force: bool = True,
    do_commit: bool = True,
    repo: GitRepo | None = None,
    run_pipeline=None,
    run_pulso_only=None,
) -> PublishResult:
    """Refresh the 21J snapshot and commit it, or skip if nothing changed.

    ``today`` (defaults to the real UTC date), ``repo``, and the pipeline
    callables are injectable so the wrapper can be exercised deterministically and
    without a live network in tests. In production all default to the real thing.
    """
    today = today or datetime.now(timezone.utc).date()
    repo = repo or GitRepo(_git_root())
    run_pipeline = run_pipeline or _default_pipeline
    run_pulso_only = run_pulso_only or _run_pulso_only

    subtree = _data_subtree_rel(repo.toplevel())
    head_before = repo.head()
    silence = today >= SILENCE_BOUNDARY

    if silence:
        log.warning(
            "ELECTORAL SILENCE ACTIVE — freezing the last publishable snapshot",
            run_date=today.isoformat(),
            silence_boundary=SILENCE_BOUNDARY.isoformat(),
            pulso_frozen=SILENCE_FREEZES_PULSO,
        )
        # No ingestion, no aggregator, no fresh poll-driven number.
        model_changed = apply_silence_freeze()
        pulso_changed = False
        if SILENCE_FREEZES_PULSO:
            log.info("Pulso frozen during silence (conservative; needs legal sign-off)")
        else:
            pre_pulso = _read_data_hash(PULSO_LATEST)
            run_pulso_only(force)
            pulso_changed = _read_data_hash(PULSO_LATEST) != pre_pulso
    else:
        pre_model = _read_data_hash(MODEL_LATEST)
        pre_pulso = _read_data_hash(PULSO_LATEST)
        run_pipeline(force)
        model_changed = _read_data_hash(MODEL_LATEST) != pre_model
        pulso_changed = _read_data_hash(PULSO_LATEST) != pre_pulso

    meaningful = model_changed or pulso_changed
    log.info(
        "Change decision",
        silence=silence,
        model_changed=model_changed,
        pulso_changed=pulso_changed,
        meaningful=meaningful,
    )

    # ── Skip: revert the volatile churn, make no commit ───────────────────────
    if not meaningful:
        repo.restore(subtree)
        action = "silence-skip" if silence else "skip"
        reason = (
            "silence active and notice already present — nothing to publish"
            if silence
            else "identical model data_hash and no Pulso change — near-no-op"
        )
        log.success("No-op run — no commit", action=action, reason=reason)
        return PublishResult(
            action=action,
            committed=False,
            silence=silence,
            model_changed=model_changed,
            pulso_changed=pulso_changed,
            reason=reason,
            head_before=head_before,
            head_after=head_before,
        )

    # Drop churn from a group that did not meaningfully change, so a single-group
    # change (e.g. Pulso moved but the poll set did not) does not re-commit the
    # other group's files with only a fresh timestamp. The registry is left alone.
    git_root = repo.toplevel()
    if not model_changed:
        for p in MODEL_OUTPUTS:
            repo.restore(_rel_to(git_root, p))
    if not pulso_changed:
        for p in PULSO_OUTPUTS:
            repo.restore(_rel_to(git_root, p))

    # ── Commit: stage ONLY the 21J data subtree, then guard the scope ─────────
    repo.stage(subtree)
    staged = repo.staged_paths()
    _assert_within_subtree(staged, subtree)  # raises PublishScopeError on violation

    if not staged:
        # Defensive: meaningful by hash but git sees no diff (e.g. only ignored
        # files moved). Treat as a skip rather than an empty commit.
        repo.restore(subtree)
        log.success("Nothing staged after all — no commit")
        return PublishResult(
            action="silence-skip" if silence else "skip",
            committed=False,
            silence=silence,
            model_changed=model_changed,
            pulso_changed=pulso_changed,
            reason="meaningful by hash but no git diff to commit",
            head_before=head_before,
            head_after=head_before,
        )

    if not do_commit:
        # Dry run: report what WOULD be committed, then leave the tree clean.
        repo.restore(subtree)
        log.success("Dry run — would commit", staged=staged)
        return PublishResult(
            action="dry-run",
            committed=False,
            silence=silence,
            model_changed=model_changed,
            pulso_changed=pulso_changed,
            reason="dry-run: staged + scope-checked, then reverted",
            staged_paths=staged,
            head_before=head_before,
            head_after=head_before,
        )

    if silence:
        msg = (
            f"chore(voto): freeze 21J snapshot for electoral silence "
            f"{today.isoformat()}"
        )
        action = "silence-freeze-commit"
    else:
        bits = []
        if model_changed:
            bits.append("model")
        if pulso_changed:
            bits.append("pulso")
        msg = (
            f"chore(voto): daily 21J snapshot {today.isoformat()} "
            f"({'+'.join(bits)} refreshed)"
        )
        action = "commit"

    repo.commit(msg, author_name=COMMIT_AUTHOR_NAME, author_email=COMMIT_AUTHOR_EMAIL)
    head_after = repo.head()
    log.success("Committed", action=action, commit_msg=msg, head=head_after[:12], files=len(staged))
    return PublishResult(
        action=action,
        committed=True,
        silence=silence,
        model_changed=model_changed,
        pulso_changed=pulso_changed,
        reason=msg,
        staged_paths=staged,
        head_before=head_before,
        head_after=head_after,
    )


def _print_report(result: PublishResult) -> None:
    line = "=" * 70
    print(line)
    print("  El Voto del 21 de Junio — daily publish wrapper (Session 11)")
    print(line)
    print(f"  action          : {result.action}")
    print(f"  committed       : {result.committed}")
    print(f"  silence active  : {result.silence}  (boundary {SILENCE_BOUNDARY.isoformat()})")
    print(f"  model changed   : {result.model_changed}")
    print(f"  pulso changed   : {result.pulso_changed}")
    print(f"  reason          : {result.reason}")
    if result.staged_paths:
        print(f"  staged paths    : {len(result.staged_paths)} (all under the 21J data subtree)")
        for p in result.staged_paths:
            print(f"      {p}")
    if result.committed:
        print(f"  HEAD            : {result.head_before[:12]} -> {result.head_after[:12]}")
    print(line)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Daily 21J publish wrapper: refresh the snapshot and commit it, "
        "silence-aware and skip-if-unchanged."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the pipeline and decide commit-or-skip, but never commit; "
        "leave the working tree clean. Safe on any branch.",
    )
    parser.add_argument(
        "--no-force",
        action="store_true",
        help="Do not pass --force to the pipeline steps (default is force=True).",
    )
    parser.add_argument(
        "--today",
        type=str,
        default=None,
        help="Override the run date (YYYY-MM-DD) to exercise the silence path locally.",
    )
    args = parser.parse_args()

    today = date.fromisoformat(args.today) if args.today else None
    result = publish(today=today, force=not args.no_force, do_commit=not args.dry_run)
    _print_report(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
