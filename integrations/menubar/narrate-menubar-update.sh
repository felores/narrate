#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin to update narrate and restart the
# service. Works for both install types:
#   - git checkout (dev/source mode): git pull --ff-only + bun install
#   - binary install (~/.local/share/narrate): re-downloads install.sh + runs
#     it in binary mode (idempotent)
#
# Writes a log to /tmp/narrate-update.log, notifies on success/failure, and
# refreshes the menu.

set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/Documents/GitHub/narrate}"
BIN_DIR="$HOME/.local/share/narrate"
PLIST="$HOME/Library/LaunchAgents/com.narrate.server.plist"
LOG="${NARRATE_UPDATE_LOG:-/tmp/narrate-update.log}"

notify() { osascript -e "display notification \"$2\" with title \"narrate update\" sound name \"$1\"" >/dev/null 2>&1 || true; }

run_update() {
    echo "== narrate update $(date '+%Y-%m-%d %H:%M:%S') =="
    if [ -d "$REPO_ROOT/.git" ]; then
        echo "[1/3] git pull --ff-only ($REPO_ROOT)"
        git -C "$REPO_ROOT" pull --ff-only
        if command -v bun >/dev/null 2>&1; then
            echo "      bun install"
            (cd "$REPO_ROOT" && bun install --silent)
        fi
    elif [ -d "$BIN_DIR/bin" ]; then
        echo "[1/3] re-running installer (binary mode)"
        curl -fsSL "https://raw.githubusercontent.com/felores/narrate/main/install.sh" \
            -o /tmp/narrate-install.sh
        NARRATE_MODE=binary bash /tmp/narrate-install.sh
    else
        echo "No install found (no git checkout, no binary dir). Nothing to do."
        exit 1
    fi
    echo "[2/3] restarting service"
    launchctl kickstart -k "gui/$(id -u)/com.narrate.server" 2>/dev/null \
        || { launchctl unload "$PLIST" 2>/dev/null || true; sleep 1; launchctl load "$PLIST" 2>/dev/null || true; }
    echo "[3/3] done"
}

if run_update >>"$LOG" 2>&1; then
    notify "Glass" "narrate updated. See /tmp/narrate-update.log"
else
    notify "Sosumi" "Update FAILED. See /tmp/narrate-update.log"
fi

open "swiftbar://refreshallplugins" 2>/dev/null || true
