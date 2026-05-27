#!/bin/bash
# C-Suite hook installer.
# Run once after cloning the repo to enable the tracked git hooks (notably the
# auto-push hook at hooks/post-commit that satisfies Russell's directive of
# always-in-sync GitHub mirror).
#
# Idempotent — safe to run multiple times.

set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: not inside a git repository." >&2
  exit 1
fi

cd "$REPO_ROOT"

# Point git at our tracked hooks directory.
git config core.hooksPath hooks

# Ensure hook files are executable (cloning sometimes drops the +x bit).
find hooks -type f -exec chmod +x {} \;

echo "Installed C-Suite git hooks."
echo "  core.hooksPath = $(git config --get core.hooksPath)"
echo "  hooks present:  $(ls hooks/ 2>/dev/null | tr '\n' ' ')"
echo ""
echo "Auto-push is now active. Every commit will push to origin via hooks/post-commit."
echo "Logs: .git/auto-push.log"
