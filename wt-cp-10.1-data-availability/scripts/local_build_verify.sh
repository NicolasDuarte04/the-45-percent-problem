#!/usr/bin/env bash
# scripts/local_build_verify.sh
#
# Local-only Next.js build verification. No git, no remote, no CI.
#
# For every bundle in website/public/data/snapshots/:
#   1. Symlink it to website/public/data/latest/
#   2. Rewrite website/public/data/manifest.json to point at it
#   3. Run `npm run build` inside website/
#   4. Log the build, surface route sizes, and grep for hydration/minify warnings
#
# Original state of latest/ and manifest.json is restored on exit.
# Stops on the first failing build so the error log can be inspected.

set -uo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WEBSITE_ROOT="$PROJECT_ROOT/website"
SNAPSHOTS_DIR="$WEBSITE_ROOT/public/data/snapshots"
LATEST_LINK="$WEBSITE_ROOT/public/data/latest"
MANIFEST="$WEBSITE_ROOT/public/data/manifest.json"
LOG_DIR="$PROJECT_ROOT/logs/local_build_verify"

[[ -d "$SNAPSHOTS_DIR" ]] || { echo "ERROR: $SNAPSHOTS_DIR not found." >&2; exit 1; }

BUNDLES=()
while IFS= read -r line; do
  BUNDLES+=("$line")
done < <(find "$SNAPSHOTS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
[[ ${#BUNDLES[@]} -gt 0 ]] || { echo "ERROR: no snapshot bundles in $SNAPSHOTS_DIR" >&2; exit 1; }

mkdir -p "$LOG_DIR"

# ── Backup current state of latest/ and manifest.json ───────────────────────
ORIG_KIND="absent"
BACKUP=""
if [[ -L "$LATEST_LINK" ]]; then
  ORIG_KIND="symlink"
  BACKUP="$(readlink "$LATEST_LINK")"
elif [[ -d "$LATEST_LINK" ]]; then
  ORIG_KIND="dir"
  BACKUP="${LATEST_LINK}.backup.$$"
  mv "$LATEST_LINK" "$BACKUP"
fi

MANIFEST_BACKUP=""
if [[ -f "$MANIFEST" ]]; then
  MANIFEST_BACKUP="${MANIFEST}.backup.$$"
  cp "$MANIFEST" "$MANIFEST_BACKUP"
fi

restore() {
  rm -rf "$LATEST_LINK"
  case "$ORIG_KIND" in
    symlink) ln -s "$BACKUP" "$LATEST_LINK" ;;
    dir)     mv "$BACKUP" "$LATEST_LINK" ;;
    absent)  : ;;
  esac
  if [[ -n "$MANIFEST_BACKUP" && -f "$MANIFEST_BACKUP" ]]; then
    mv "$MANIFEST_BACKUP" "$MANIFEST"
  fi
}
trap restore EXIT

# ── Main loop ───────────────────────────────────────────────────────────────
PASS=0
FAIL=0
FAILED=()

echo "Local build verify — ${#BUNDLES[@]} bundle(s)"
echo "Logs:           $LOG_DIR"
echo ""

for BUNDLE in "${BUNDLES[@]}"; do
  ID="$(basename "$BUNDLE")"
  SAFE_ID="${ID//[:\/]/_}"
  LOG="$LOG_DIR/${SAFE_ID}.log"

  echo "━━━ $ID ━━━"

  rm -rf "$LATEST_LINK"
  ln -s "$BUNDLE" "$LATEST_LINK"

  GEN_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  cat > "$MANIFEST" <<JSON
[
  {
    "snapshot_id": "$ID",
    "generated_at_utc": "$GEN_UTC",
    "bundle_url": "/data/snapshots/$ID/",
    "meta_url": "/data/snapshots/$ID/snapshot_meta.json"
  }
]
JSON

  set +e
  (cd "$WEBSITE_ROOT" && npm run build) > "$LOG" 2>&1
  STATUS=$?
  set -e

  if [[ $STATUS -ne 0 ]]; then
    FAIL=$((FAIL + 1))
    FAILED+=("$ID")
    echo "  build: FAILED (exit $STATUS)"
    echo "  --- last 60 log lines ---"
    tail -n 60 "$LOG" | sed 's/^/    /'
    break
  fi

  PASS=$((PASS + 1))
  echo "  build: OK"

  echo "  --- route sizes ---"
  awk '/Route \(app\)/,/^[[:space:]]*$/' "$LOG" | sed 's/^/    /'

  HYDRATION="$(grep -ciE "hydrat" "$LOG" || true)"
  MINIFY="$(grep -ciE "minif" "$LOG" || true)"
  echo "  hydration matches:    $HYDRATION"
  echo "  minification matches: $MINIFY"
  if [[ "$HYDRATION" -gt 0 ]]; then
    echo "  --- hydration lines ---"
    grep -niE "hydrat" "$LOG" | sed 's/^/    /'
  fi
  if [[ "$MINIFY" -gt 0 ]]; then
    echo "  --- minification lines ---"
    grep -niE "minif" "$LOG" | sed 's/^/    /'
  fi
  echo ""
done

echo "━━━ Summary ━━━"
echo "  pass: $PASS"
echo "  fail: $FAIL"
if (( FAIL > 0 )); then
  echo "  failed:"
  for f in "${FAILED[@]}"; do echo "    - $f"; done
  exit 1
fi
