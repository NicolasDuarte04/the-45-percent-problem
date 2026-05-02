#!/usr/bin/env bash
# Install repo-managed git hooks into .git/hooks/.
#
# Required setup step on a fresh clone — see CLAUDE.md "Workflow Conventions".
# Re-run any time scripts/git-hooks/* changes (the symlinks survive, but the
# executable bit on a newly-added hook needs this script to be set).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SRC="$REPO_ROOT/scripts/git-hooks"
DST="$REPO_ROOT/.git/hooks"

if [ ! -d "$SRC" ]; then
  echo "Error: $SRC not found" >&2
  exit 1
fi

mkdir -p "$DST"

installed=()
for hook in "$SRC"/*; do
  name=$(basename "$hook")
  # Skip non-hook files (READMEs, samples)
  case "$name" in
    *.md|*.txt|*.sample) continue ;;
  esac
  chmod +x "$hook"
  ln -sf "$hook" "$DST/$name"
  installed+=("$name")
done

if [ "${#installed[@]}" -eq 0 ]; then
  echo "No hooks found in $SRC" >&2
  exit 1
fi

echo "Installed git hooks: ${installed[*]}"
echo "(Symlinks under .git/hooks/ point at scripts/git-hooks/.)"
