#!/usr/bin/env bash
# scripts/uninstall-launchagent.sh
# Source: docs/decisions/0012-ch10-scheduler-autonomy.md §9.3
# Remove the C-Suite LaunchAgent.

set -euo pipefail

LABEL="com.classedu.csuite.scheduler"
PLIST_DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"

echo "C-Suite LaunchAgent uninstaller"
echo "  Label: $LABEL"
echo ""

# Bootout (unload) if running.
if launchctl list "$LABEL" &>/dev/null; then
  echo "Stopping and unloading agent..."
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  echo "Agent stopped."
else
  echo "Agent not currently loaded."
fi

# Remove plist file.
if [[ -f "$PLIST_DEST" ]]; then
  rm "$PLIST_DEST"
  echo "Removed plist: $PLIST_DEST"
else
  echo "Plist not found at $PLIST_DEST (already removed)."
fi

echo ""
echo "C-Suite LaunchAgent uninstalled."
