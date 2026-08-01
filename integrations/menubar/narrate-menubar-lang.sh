#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin to switch the menu language.
#
# Usage:
#   narrate-menubar-lang.sh en
#   narrate-menubar-lang.sh es
#
# Persists to ~/.config/narrate/menubar.json and refreshes the menu.

set -e

LANG_CODE="${1:-en}"
STATE_DIR="$HOME/.config/narrate"
STATE_FILE="$STATE_DIR/menubar.json"

case "$LANG_CODE" in
    en|es) ;;
    *) exit 1 ;;
esac

mkdir -p "$STATE_DIR"
printf '{"lang":"%s"}\n' "$LANG_CODE" > "$STATE_FILE"

open "swiftbar://refreshallplugins" 2>/dev/null || true
