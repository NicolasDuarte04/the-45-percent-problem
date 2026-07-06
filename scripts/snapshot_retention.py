"""
scripts/snapshot_retention.py
=============================
cp-32 (hygiene): bounded retention for the website snapshot bundles under
``website/public/data/snapshots/``.

Background
----------
Every regen (``regenerate_snapshot_from_batch.py``) writes a new timestamped
bundle into ``website/public/data/snapshots/<snapshot_id>/`` and never prunes
the old ones. At 5+ regens per day the directory grows without bound (220+
bundles, ~145 MB and climbing), which inflates every checkout and every Vercel
deploy payload.

Git history preserves every bundle that was ever committed, so pruning the
WORKING TREE loses no audit trail: a pruned bundle is still recoverable from
history. The cost this module controls is purely checkout / deploy size.

Retention rule
--------------
Keep a bundle if EITHER:
  * its timestamp is within ``RETENTION_WINDOW`` (48 hours) of ``now``; OR
  * it is the final (latest) bundle of its Colombia civil day (America/Bogota,
    UTC-5, no DST, consistent with how the site groups days).
Prune everything else.

Absolute exclusions (never pruned, whatever the rule says):
  * ``latest/`` (the live bundle; it is a sibling of snapshots/, not a child,
    but it is guarded here anyway).
  * the frozen pre-registered batch id (lives outside snapshots/ entirely, but
    guarded here anyway).
  * anything whose name is not a timestamped-bundle id (see
    ``SNAPSHOT_BUNDLE_RE``). Stray files, ``.gitkeep``, README, etc. are never
    candidates.

The rule is idempotent: re-running over an already-pruned tree selects the same
keep set and prunes nothing (each day's surviving final is still that day's
final; every in-window bundle is still in window).
"""

from __future__ import annotations

import re
import shutil
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Iterable

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from frozen_batch import FROZEN_BATCH_ID  # noqa: E402

# Colombia has no daylight saving time, so a fixed UTC-5 offset is exact and
# matches the site's day grouping (America/Bogota).
BOGOTA_TZ = timezone(timedelta(hours=-5))

# Keep everything at least this recent, regardless of the per-day rule.
RETENTION_WINDOW = timedelta(hours=48)

# A snapshot bundle directory is named for its snapshot_id, minute precision,
# UTC ("Z"), e.g. "2026-07-05T19:27Z". Nothing else in snapshots/ matches this.
SNAPSHOT_BUNDLE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$")

# The live bundle directory name (sibling of snapshots/, guarded defensively).
LATEST_DIR_NAME = "latest"

# Names that must never be pruned even if a future rename made one look like a
# bundle. The frozen batch lives outside snapshots/, but guarding it here makes
# the retention logic provably unable to touch it.
DEFAULT_PROTECTED_NAMES = frozenset({LATEST_DIR_NAME, FROZEN_BATCH_ID})


def parse_snapshot_ts(name: str) -> datetime | None:
    """Return the UTC datetime encoded by a bundle name, or None.

    None means the name is not a timestamped-bundle id, so it is never a
    prune candidate (the caller treats None as "untouchable").
    """
    if not SNAPSHOT_BUNDLE_RE.match(name):
        return None
    return datetime.strptime(name, "%Y-%m-%dT%H:%MZ").replace(tzinfo=timezone.utc)


def _bogota_day(ts: datetime) -> date:
    return ts.astimezone(BOGOTA_TZ).date()


def select_prunable(
    names: Iterable[str],
    now: datetime,
    protected: frozenset[str] = DEFAULT_PROTECTED_NAMES,
) -> tuple[set[str], set[str]]:
    """Partition bundle names into (keep, prune).

    Pure function: depends only on the names and ``now``. Non-bundle names and
    protected names are silently excluded from BOTH sets (they are neither
    "kept by rule" nor "pruned" - they are simply not candidates).

    ``now`` must be timezone-aware UTC.
    """
    candidates: dict[str, datetime] = {}
    for name in names:
        if name in protected:
            continue
        ts = parse_snapshot_ts(name)
        if ts is None:
            continue
        candidates[name] = ts

    window_start = now - RETENTION_WINDOW

    # Latest bundle per Colombia civil day. Names are minute-unique (the dir
    # name IS the minute-precision timestamp), so no two candidates tie.
    latest_by_day: dict[date, tuple[datetime, str]] = {}
    for name, ts in candidates.items():
        day = _bogota_day(ts)
        cur = latest_by_day.get(day)
        if cur is None or ts > cur[0]:
            latest_by_day[day] = (ts, name)
    day_finals = {name for _, name in latest_by_day.values()}

    keep: set[str] = set()
    for name, ts in candidates.items():
        if ts >= window_start or name in day_finals:
            keep.add(name)
    prune = set(candidates) - keep
    return keep, prune


def prune_snapshots(
    snapshots_dir: Path,
    now: datetime,
    *,
    protected: frozenset[str] = DEFAULT_PROTECTED_NAMES,
    dry_run: bool = False,
    logger: Callable[[str], None] = print,
) -> dict[str, object]:
    """Apply the retention rule to ``snapshots_dir`` and log the outcome.

    Only prunes immediate child directories whose names are timestamped
    bundles and are not protected. Files and non-bundle directories are left
    untouched. Returns a summary dict:
      {kept, pruned, skipped_non_bundle, dry_run}.
    """
    snapshots_dir = Path(snapshots_dir)
    if not snapshots_dir.exists():
        logger(f"    [retention] snapshots dir absent ({snapshots_dir}); nothing to prune")
        return {"kept": [], "pruned": [], "skipped_non_bundle": [], "dry_run": dry_run}

    child_dirs = [p.name for p in snapshots_dir.iterdir() if p.is_dir()]
    skipped_non_bundle = sorted(
        name
        for name in child_dirs
        if parse_snapshot_ts(name) is None and name not in protected
    )

    keep, prune = select_prunable(child_dirs, now, protected=protected)

    pruned: list[str] = []
    for name in sorted(prune):
        # Belt-and-braces: never remove a protected or non-bundle entry, even
        # if select_prunable somehow returned one.
        if name in protected or parse_snapshot_ts(name) is None:
            continue
        target = snapshots_dir / name
        if not dry_run:
            shutil.rmtree(target)
        pruned.append(name)

    if pruned:
        verb = "would prune" if dry_run else "pruned"
        logger(
            f"    [retention] {verb} {len(pruned)} snapshot bundle(s); "
            f"kept {len(keep)} (last 48h + each earlier Colombia day's final)"
        )
        # List the pruned ids compactly so the regen log records exactly what
        # left the working tree (git history still has them).
        logger(f"    [retention] {verb}: {', '.join(pruned)}")
    else:
        logger(
            f"    [retention] nothing to prune; {len(keep)} bundle(s) within "
            "the keep set"
        )

    return {
        "kept": sorted(keep),
        "pruned": pruned,
        "skipped_non_bundle": skipped_non_bundle,
        "dry_run": dry_run,
    }
