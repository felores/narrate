#!/usr/bin/env bash
#
# Uninstall the narrate systemd user service.
#

set -euo pipefail

UNIT_NAME="narrate.service"
UNIT_DEST="$HOME/.config/systemd/user/$UNIT_NAME"

if systemctl --user list-unit-files | grep -q "^$UNIT_NAME"; then
    systemctl --user disable --now "$UNIT_NAME" || true
fi

if [ -f "$UNIT_DEST" ]; then
    rm -f "$UNIT_DEST"
    systemctl --user daemon-reload
    echo "✅ narrate systemd service removed"
else
    echo "ℹ️  $UNIT_DEST not found. Nothing to uninstall."
fi
