#!/usr/bin/env bash
#
# Install narrate as a macOS LaunchAgent (auto-starts at login).
#
# Usage:  ./install.sh             # uses repo dir as NARRATE_DIR
#         ./install.sh /path/to/narrate
#
# Binary mode (standalone compiled binaries, no bun needed):
#         NARRATE_BIN=/path/to/narrate-server ./install.sh /path/to/narrate
#

set -euo pipefail

# ─── Locate paths ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NARRATE_DIR="${1:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
NARRATE_BIN="${NARRATE_BIN:-}"
BUN_PATH="$(command -v bun || true)"
PLIST_NAME="com.narrate.server.plist"
PLIST_TEMPLATE="$SCRIPT_DIR/$PLIST_NAME.template"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

# Bake a STATIC PATH into the plist instead of snapshotting the install-time
# shell PATH. The server only needs: ffmpeg (gemini), system binaries.
# A snapshot of $PATH ages poorly — it captures dirs that may not exist later.
PATH_VALUE="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# ─── Program args: binary mode vs source mode ───────────────────────────────
if [ -n "$NARRATE_BIN" ]; then
    # Compiled binary: no bun, no repo source. NARRATE_DIR env steers
    # logs/repo_dir (see src/server.ts compiled detection).
    if [ ! -x "$NARRATE_BIN" ]; then
        echo "❌ Binary not found or not executable: $NARRATE_BIN" >&2
        exit 1
    fi
    PROGRAM_ARGS="        <string>$NARRATE_BIN</string>"
else
    if [ -z "$BUN_PATH" ]; then
        echo "❌ bun not found in PATH. Install from https://bun.sh" >&2
        echo "   (or use a prebuilt binary: NARRATE_BIN=/path/to/narrate-server)" >&2
        exit 1
    fi
    if [ ! -f "$NARRATE_DIR/src/server.ts" ]; then
        echo "❌ Could not find $NARRATE_DIR/src/server.ts" >&2
        echo "   Pass the narrate repo path as first argument: ./install.sh /path/to/narrate" >&2
        exit 1
    fi
    PATH_VALUE="$(dirname "$BUN_PATH"):$PATH_VALUE"
    PROGRAM_ARGS="        <string>$BUN_PATH</string>
        <string>run</string>
        <string>$NARRATE_DIR/src/server.ts</string>"
fi

if [ ! -f "$PLIST_TEMPLATE" ]; then
    echo "❌ Template not found: $PLIST_TEMPLATE" >&2
    exit 1
fi

mkdir -p "$NARRATE_DIR/logs"
mkdir -p "$HOME/Library/LaunchAgents"
# launchd-stdout/stderr must live outside ~/Documents — see template comment.
mkdir -p "$HOME/Library/Logs/narrate"

# ─── Render template ────────────────────────────────────────────────────────
echo "→ Rendering $PLIST_NAME"
export NARRATE_DIR PATH_VALUE PROGRAM_ARGS
python3 - "$PLIST_TEMPLATE" "$PLIST_DEST" <<'PY'
import os, sys
src, dst = sys.argv[1:3]
t = open(src).read()
t = t.replace("__NARRATE_DIR__", os.environ["NARRATE_DIR"])
t = t.replace("__HOME__", os.environ.get("HOME", ""))
t = t.replace("__PATH_VALUE__", os.environ["PATH_VALUE"])
t = t.replace("__PROGRAM_ARGS__", os.environ["PROGRAM_ARGS"])
open(dst, "w").write(t)
PY

echo "  → wrote $PLIST_DEST"

# ─── Reload service ─────────────────────────────────────────────────────────
if launchctl list | grep -q "com.narrate.server"; then
    echo "→ Unloading existing service"
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

echo "→ Loading service"
launchctl load "$PLIST_DEST"

# ─── Verify ─────────────────────────────────────────────────────────────────
sleep 1
if launchctl list | grep -q "com.narrate.server"; then
    echo "✅ narrate service installed and running"
    echo "   Logs:    $NARRATE_DIR/logs/narrate.log"
    echo "   Plist:   $PLIST_DEST"
    echo "   Stop:    launchctl unload $PLIST_DEST"
    echo "   Start:   launchctl load   $PLIST_DEST"
else
    echo "⚠️  Service did not appear in launchctl list. Check $NARRATE_DIR/logs/narrate-error.log"
    exit 1
fi
