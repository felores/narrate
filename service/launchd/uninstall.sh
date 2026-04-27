#!/usr/bin/env bash
#
# Uninstall the narrate LaunchAgent.
#

set -euo pipefail

PLIST_DEST="$HOME/Library/LaunchAgents/com.narrate.server.plist"

if [ ! -f "$PLIST_DEST" ]; then
    echo "ℹ️  $PLIST_DEST not found. Nothing to uninstall."
    exit 0
fi

echo "→ Unloading service"
launchctl unload "$PLIST_DEST" 2>/dev/null || true

echo "→ Removing $PLIST_DEST"
rm -f "$PLIST_DEST"

echo "✅ narrate LaunchAgent removed"
echo "   Logs preserved at \$NARRATE_DIR/logs/ — delete manually if desired."
