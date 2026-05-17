#!/usr/bin/env bash
# scripts/simulate_stress_test.sh
#
# Pre-launch stress test automator · §12.10 / §11.2-11.4
#
# Usage:
#   ./scripts/simulate_stress_test.sh <snapshots_dir>
#
# <snapshots_dir> must contain one sub-directory per snapshot bundle,
# named by snapshot_id (e.g. 2022-11-20T04:00Z, 2022-11-21T04:00Z …).
# Each sub-directory is a complete bundle as specified in §4.1.
#
# The script iterates chronologically, copies each bundle into
# public/data/latest, commits to the deploy/snapshot branch, and pushes.
# It waits for the CI pipeline to reach a terminal state before advancing
# to the next snapshot. A full pass/fail report is printed at the end.
#
# Requirements:
#   - git                (working tree clean before starting)
#   - gh (GitHub CLI)    (authenticated; gh run watch must be available)
#   - node               (for manifest.json update)
#   - bash ≥ 4

set -euo pipefail

# ── Argument & environment validation ────────────────────────────────────────

SNAPSHOTS_DIR="${1:?Usage: $0 <snapshots_dir>}"
BRANCH="deploy/snapshot"

if [[ ! -d "$SNAPSHOTS_DIR" ]]; then
  echo "ERROR: snapshots directory not found: $SNAPSHOTS_DIR" >&2
  exit 1
fi

if [[ ! -f "package.json" ]] || [[ ! -d "public/data" ]]; then
  echo "ERROR: run this script from the website root directory." >&2
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "ERROR: gh (GitHub CLI) is required but not found in PATH." >&2
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "ERROR: gh is not authenticated. Run 'gh auth login' first." >&2
  exit 1
fi

# ── Collect snapshot bundle directories ──────────────────────────────────────
# Lexicographic sort == chronological order for ISO-8601 timestamps.

mapfile -t SNAPSHOTS < <(find "$SNAPSHOTS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#SNAPSHOTS[@]} -eq 0 ]]; then
  echo "ERROR: no snapshot bundle directories found in $SNAPSHOTS_DIR" >&2
  exit 1
fi

echo "Stress test: ${#SNAPSHOTS[@]} snapshot bundles found"
echo "Branch:      $BRANCH"
echo ""

# ── Require a clean working tree before touching anything ────────────────────

if ! git diff --quiet HEAD 2>/dev/null; then
  echo "ERROR: working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

# ── Checkout / create the deploy branch ──────────────────────────────────────

git fetch origin "$BRANCH" 2>/dev/null || true

if git show-ref --quiet "refs/remotes/origin/$BRANCH"; then
  git checkout -B "$BRANCH" "origin/$BRANCH"
else
  git checkout -B "$BRANCH"
fi

# ── Main loop ─────────────────────────────────────────────────────────────────

PASS=0
FAIL=0
FAILED_SNAPSHOTS=()

for SNAPSHOT_PATH in "${SNAPSHOTS[@]}"; do
  SNAPSHOT_ID="$(basename "$SNAPSHOT_PATH")"
  INDEX=$((PASS + FAIL + 1))

  echo "━━━ [$INDEX/${#SNAPSHOTS[@]}] $SNAPSHOT_ID ━━━"

  # Replace public/data/latest with the incoming bundle.
  # Both directory and symlink forms are handled.
  if [[ -L "public/data/latest" ]]; then
    rm "public/data/latest"
  else
    rm -rf "public/data/latest"
  fi
  mkdir -p "public/data/latest"
  cp -r "$SNAPSHOT_PATH/." "public/data/latest/"

  # Mirror bundle into the snapshots archive for full audit trail.
  SNAPSHOT_DEST="public/data/snapshots/$SNAPSHOT_ID"
  rm -rf "$SNAPSHOT_DEST"
  mkdir -p "$SNAPSHOT_DEST"
  cp -r "$SNAPSHOT_PATH/." "$SNAPSHOT_DEST/"

  # Prepend this snapshot_id to manifest.json (newest first).
  GEN_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node - "$SNAPSHOT_ID" "$GEN_UTC" <<'EOF'
const fs = require("fs");
const [,, id, gen] = process.argv;
const path = "public/data/manifest.json";
let manifest = [];
if (fs.existsSync(path)) {
  manifest = JSON.parse(fs.readFileSync(path, "utf8"));
}
// Remove any duplicate entry for this snapshot_id.
manifest = manifest.filter((e) => e.snapshot_id !== id);
manifest.unshift({ snapshot_id: id, generated_at_utc: gen });
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
EOF

  # Stage, commit, and push to trigger CI.
  git add public/data/latest "public/data/snapshots/$SNAPSHOT_ID" public/data/manifest.json
  git commit -m "stress-test(deploy): snapshot $SNAPSHOT_ID"
  git push origin "$BRANCH"

  echo "  Pushed: waiting for CI run to register..."
  sleep 15

  # Locate the run triggered by this push.
  # We want the most recent run on the branch that is not yet completed,
  # or the very latest run if all are already completed.
  RUN_ID=""
  for attempt in $(seq 1 12); do
    # Prefer a run that is still in-progress (queued or running).
    RUN_ID="$(gh run list \
      --branch "$BRANCH" \
      --limit 5 \
      --json databaseId,status \
      --jq '[.[] | select(.status != "completed")] | first | .databaseId // empty' \
      2>/dev/null || echo "")"

    # Fall back to the most recent run regardless of status.
    if [[ -z "$RUN_ID" ]]; then
      RUN_ID="$(gh run list \
        --branch "$BRANCH" \
        --limit 1 \
        --json databaseId \
        --jq '.[0].databaseId // empty' \
        2>/dev/null || echo "")"
    fi

    [[ -n "$RUN_ID" ]] && break
    echo "  Waiting for run to appear (attempt $attempt/12)..."
    sleep 5
  done

  if [[ -z "$RUN_ID" ]]; then
    echo "  ERROR: could not locate CI run for $SNAPSHOT_ID" >&2
    FAIL=$((FAIL + 1))
    FAILED_SNAPSHOTS+=("$SNAPSHOT_ID: no run found")
    continue
  fi

  echo "  Run ID: $RUN_ID"

  # Watch to completion; --exit-status makes it return non-zero on failure.
  if gh run watch "$RUN_ID" --exit-status 2>/dev/null; then
    echo "  PASS"
    PASS=$((PASS + 1))
  else
    CONCLUSION="$(gh run view "$RUN_ID" --json conclusion \
      --jq '.conclusion // "unknown"' 2>/dev/null || echo "unknown")"
    echo "  FAIL (conclusion: $CONCLUSION)"
    FAIL=$((FAIL + 1))
    FAILED_SNAPSHOTS+=("$SNAPSHOT_ID. $CONCLUSION")
    # Continue rather than abort: §11.4 requires a complete report.
  fi

  echo ""
done

# ── Summary report ────────────────────────────────────────────────────────────

echo "━━━ Stress Test Report ━━━"
printf "Total snapshots: %d\n" "${#SNAPSHOTS[@]}"
printf "CI passed:       %d\n" "$PASS"
printf "CI failed:       %d\n" "$FAIL"

if [[ ${#FAILED_SNAPSHOTS[@]} -gt 0 ]]; then
  echo ""
  echo "Failed snapshots:"
  for s in "${FAILED_SNAPSHOTS[@]}"; do
    echo "  - $s"
  done
fi

echo ""
if [[ $FAIL -gt 0 ]]; then
  echo "RESULT: FAILED: review CI logs above before requesting prod sign-off (§11.4)."
  exit 1
else
  echo "RESULT: ALL PASS: cleared for §11.4 manual review and sign-off."
fi
