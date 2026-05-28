#!/usr/bin/env bash
# scripts/install-launchagent.sh
# Source: docs/decisions/0012-ch10-scheduler-autonomy.md §9.2
# Install the C-Suite LaunchAgent so the scheduler runs even when C-Suite isn't open.
# Idempotent — unloads existing agent first if present.

set -euo pipefail

LABEL="com.classedu.csuite.scheduler"
PLIST_DEST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOGS_DIR="$HOME/Library/Logs/C-Suite"
APP_PATH="/Applications/C-Suite.app/Contents/MacOS/C-Suite"
TEMPLATE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/apps/main/build/launch-agent.plist.template"

# Allow overriding app path for dev/testing.
if [[ -n "${CSUITE_APP_PATH:-}" ]]; then
  APP_PATH="$CSUITE_APP_PATH"
fi

echo "C-Suite LaunchAgent installer"
echo "  Label:    $LABEL"
echo "  App:      $APP_PATH"
echo "  Logs:     $LOGS_DIR"
echo "  Plist:    $PLIST_DEST"
echo ""

# Create logs directory.
mkdir -p "$LOGS_DIR"

# Validate template exists.
if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "ERROR: plist template not found at $TEMPLATE_PATH"
  exit 1
fi

# Idempotent: unload existing agent if already loaded.
if launchctl list "$LABEL" &>/dev/null; then
  echo "Unloading existing agent..."
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
fi

# Template substitution: replace APP_PATH and LOGS_DIR placeholders.
sed \
  -e "s|APP_PATH|${APP_PATH}|g" \
  -e "s|LOGS_DIR|${LOGS_DIR}|g" \
  "$TEMPLATE_PATH" > "$PLIST_DEST"

echo "Plist written to $PLIST_DEST"

# Load the agent.
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"

echo ""
echo "LaunchAgent installed and loaded."
echo "The C-Suite scheduler will now run at login and catch up missed jobs."
echo ""
echo "To check status:   launchctl list $LABEL"
echo "To view logs:      tail -f $LOGS_DIR/scheduler.log"
echo "To uninstall:      bash $(dirname "${BASH_SOURCE[0]}")/uninstall-launchagent.sh"
