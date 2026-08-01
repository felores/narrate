#!/usr/bin/env bash
#
# Install narrate as a systemd user service (Linux).
#
# Usage:  ./install.sh             # uses repo dir as NARRATE_DIR
#         ./install.sh /path/to/narrate
#
# Binary mode (standalone compiled binaries, no bun needed):
#         NARRATE_BIN=/path/to/narrate-server ./install.sh /path/to/narrate
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NARRATE_DIR="${1:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NARRATE_BIN="${NARRATE_BIN:-}"
BUN_PATH="$(command -v bun || true)"
UNIT_NAME="narrate.service"
UNIT_TEMPLATE="$SCRIPT_DIR/$UNIT_NAME.template"
UNIT_DEST="$HOME/.config/systemd/user/$UNIT_NAME"

# ─── ExecStart: binary mode vs source mode ──────────────────────────────────
if [ -n "$NARRATE_BIN" ]; then
    if [ ! -x "$NARRATE_BIN" ]; then
        echo "❌ Binary not found or not executable: $NARRATE_BIN" >&2
        exit 1
    fi
    PROGRAM_ARGS="$NARRATE_BIN"
else
    if [ -z "$BUN_PATH" ]; then
        echo "❌ bun not found in PATH. Install from https://bun.sh" >&2
        echo "   (or use a prebuilt binary: NARRATE_BIN=/path/to/narrate-server)" >&2
        exit 1
    fi
    if [ ! -f "$NARRATE_DIR/src/server.ts" ]; then
        echo "❌ Could not find $NARRATE_DIR/src/server.ts" >&2
        exit 1
    fi
    PROGRAM_ARGS="$BUN_PATH run $NARRATE_DIR/src/server.ts"
fi

if [ ! -f "$UNIT_TEMPLATE" ]; then
    echo "❌ Template not found: $UNIT_TEMPLATE" >&2
    exit 1
fi

mkdir -p "$NARRATE_DIR/logs"
mkdir -p "$HOME/.config/systemd/user"

echo "→ Rendering $UNIT_NAME"
export NARRATE_DIR HOME PROGRAM_ARGS
python3 - "$UNIT_TEMPLATE" "$UNIT_DEST" <<'PY'
import os, sys
src, dst = sys.argv[1:3]
t = open(src).read()
t = t.replace("__NARRATE_DIR__", os.environ["NARRATE_DIR"])
t = t.replace("__HOME__", os.environ["HOME"])
t = t.replace("__PATH_VALUE__", os.environ.get("PATH_VALUE", "/usr/local/bin:/usr/bin:/bin"))
t = t.replace("__PROGRAM_ARGS__", os.environ["PROGRAM_ARGS"])
open(dst, "w").write(t)
PY

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
