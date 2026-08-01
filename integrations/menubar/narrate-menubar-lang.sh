#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin to switch the menu language.
#
# Usage:
#   narrate-menubar-lang.sh en
#   narrate-menubar-lang.sh es
#
# Persists to ~/.config/narrate/menubar.json (merging with other keys such
# as voice_search) and refreshes the menu.

set -e

LANG_CODE="${1:-en}"
STATE_DIR="$HOME/.config/narrate"
STATE_FILE="$STATE_DIR/menubar.json"

case "$LANG_CODE" in
    en|es) ;;
    *) exit 1 ;;
esac

mkdir -p "$STATE_DIR"

python3 - "$STATE_FILE" "$LANG_CODE" <<'PY'
import json, sys

path, lang = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        state = json.load(f)
except Exception:
    state = {}
state["lang"] = lang
with open(path, "w") as f:
    json.dump(state, f, ensure_ascii=False)
PY

open "swiftbar://refreshallplugins" 2>/dev/null || true
