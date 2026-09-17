"""cp-10.2 smoke test — the cp-09-class regression guard.

cp-09 introduced a read of a gitignored input parquet
(`data/raw/wc2026_fixtures.parquet`) in the snapshot-regen path. The existing
tests mocked the count and never invoked the real script against a clean tree,
so the regression shipped to `main` and broke the nightly cron for three nights.

This smoke test runs `scripts/regenerate_snapshot_from_batch.py` end-to-end
against the checked-out tree. On a fresh checkout that is missing a file the
script reads, the script raises `FileNotFoundError` and exits non-zero — this
test goes red and the PR is blocked. cp-10.1 force-tracked the six input
parquets so the script succeeds today; this test is what keeps them tracked.

Run locally with:  pytest tests/scripts/test_snapshot_regen_smoke.py
Note: invoking the script mutates the working tree (writes website snapshot
bundles, back-fills `data/calibration/active_batch.json`). That is intended —
the point is to exercise the real script against the real checkout. Run
`git checkout .` afterwards if you want a pristine tree back.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SNAPSHOT_META = REPO_ROOT / "website" / "public" / "data" / "latest" / "snapshot_meta.json"


def test_regenerate_snapshot_from_batch_runs_end_to_end() -> None:
    """The regen script must exit 0 and (re)write the latest snapshot bundle.

    Asserting on `snapshot_meta.json` (not just the return code) is deliberate:
    the prompt's decision tree flags that a bare exit-0 check could pass even if
    the script no-op'd. We require the script to actually produce a snapshot
    with a non-empty `snapshot_id`.
    """
    result = subprocess.run(
        [sys.executable, "scripts/regenerate_snapshot_from_batch.py"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=600,
    )

    assert result.returncode == 0, (
        f"regenerate_snapshot_from_batch.py exited {result.returncode} "
        f"(a cp-09-class regression — likely a read of an untracked/gitignored "
        f"file on a clean checkout).\n"
        f"stdout tail:\n{result.stdout[-2000:]}\n"
        f"stderr tail:\n{result.stderr[-2000:]}"
    )

    assert SNAPSHOT_META.exists(), (
        f"Script exited 0 but did not write {SNAPSHOT_META.relative_to(REPO_ROOT)}."
    )
    meta = json.loads(SNAPSHOT_META.read_text())
    assert meta.get("snapshot_id"), (
        f"snapshot_meta.json is missing a non-empty 'snapshot_id': {meta!r}"
    )
