#!/usr/bin/env bash
#
# Install narrate as a systemd user service (Linux).
#
# Usage:  ./install.sh             # uses repo dir as NARRATE_DIR
#         ./install.sh /path/to/narrate
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NARRATE_DIR="${1:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
BUN_PATH="$(command -v bun || true)"
UNIT_NAME="narrate.service"
UNIT_TEMPLATE="$SCRIPT_DIR/$UNIT_NAME.template"
UNIT_DEST="$HOME/.config/systemd/user/$UNIT_NAME"

if [ -z "$BUN_PATH" ]; then
    echo "❌ bun not found in PATH. Install from https://bun.sh" >&2
    exit 1
fi

if [ ! -f "$NARRATE_DIR/src/server.ts" ]; then
    echo "❌ Could not find $NARRATE_DIR/src/server.ts" >&2
    exit 1
fi

if [ ! -f "$UNIT_TEMPLATE" ]; then
    echo "❌ Template not found: $UNIT_TEMPLATE" >&2
    exit 1
fi

mkdir -p "$NARRATE_DIR/logs"
mkdir -p "$HOME/.config/systemd/user"

echo "→ Rendering $UNIT_NAME"
sed \
    -e "s|__BUN_PATH__|$BUN_PATH|g" \
    -e "s|__NARRATE_DIR__|$NARRATE_DIR|g" \
    -e "s|__HOME__|$HOME|g" \
    -e "s|__PATH_VALUE__|$PATH|g" \
    "$UNIT_TEMPLATE" > "$UNIT_DEST"

echo "  → wrote $UNIT_DEST"

systemctl --user daemon-reload
systemctl --user enable --now "$UNIT_NAME"

if systemctl --user is-active --quiet "$UNIT_NAME"; then
    echo "✅ narrate service active"
    echo "   Logs:    $NARRATE_DIR/logs/narrate.log"
    echo "   Status:  systemctl --user status $UNIT_NAME"
    echo "   Stop:    systemctl --user stop $UNIT_NAME"
else
    echo "⚠️  Service not active. Check: journalctl --user -u $UNIT_NAME"
    exit 1
fi
