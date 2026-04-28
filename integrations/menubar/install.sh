#!/usr/bin/env bash
#
# Install the narrate SwiftBar plugin.
# Symlinks ./narrate.5s.sh into the SwiftBar plugin directory so updates
# to the script in the repo flow through automatically.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/narrate.5s.sh"
SWIFTBAR_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
PLUGIN_DEST="$SWIFTBAR_DIR/narrate.5s.sh"
OLD_PLUGIN="$SWIFTBAR_DIR/voice-server.5s.sh"

GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
NC=$'\033[0m'

if [ ! -f "$PLUGIN_SRC" ]; then
    echo "❌ Plugin source not found: $PLUGIN_SRC" >&2
    exit 1
fi

if ! [ -d "/Applications/SwiftBar.app" ]; then
    echo "${YELLOW}⚠ SwiftBar.app not found at /Applications.${NC}"
    echo "  Install: brew install --cask swiftbar  (or download from https://swiftbar.app)"
fi

mkdir -p "$SWIFTBAR_DIR"

# Remove old voice-server plugin if present (it points at deleted scripts).
if [ -e "$OLD_PLUGIN" ]; then
    echo "→ Removing legacy voice-server plugin"
    rm -f "$OLD_PLUGIN"
fi

# Remove a stray copy of the helper that might be in the plugin dir from
# earlier installs — SwiftBar treats every .sh in Plugins/ as a plugin and
# would render an unwanted "?" menu icon.
STRAY_HELPER="$SWIFTBAR_DIR/narrate-menubar-speak.sh"
if [ -e "$STRAY_HELPER" ]; then
    echo "→ Removing stray helper from plugin dir (it lives in the repo)"
    rm -f "$STRAY_HELPER"
fi

# Install the plugin as a real file (not a symlink) — SwiftBar resolves
# script paths relative to the plugin location. The helper stays at the
# repo and is referenced by absolute path from inside the plugin via
# NARRATE_REPO env var (default: ~/Documents/GitHub/narrate).
chmod +x "$PLUGIN_SRC"
chmod +x "$SCRIPT_DIR/narrate-menubar-speak.sh"
cp "$PLUGIN_SRC" "$PLUGIN_DEST"
echo "${GREEN}✅ Plugin installed${NC}"
echo "    src:  $PLUGIN_SRC"
echo "    dst:  $PLUGIN_DEST"
echo "    helper (referenced from repo): $SCRIPT_DIR/narrate-menubar-speak.sh"

# Launch SwiftBar if not running, otherwise just ask it to reload plugins
# via its URL scheme — no kill/refresh signal needed.
if ! pgrep -lf SwiftBar > /dev/null 2>&1; then
    echo "→ Launching SwiftBar"
    open -a SwiftBar
else
    echo "→ Asking SwiftBar to refresh its plugins"
    open "swiftbar://refreshallplugins" >/dev/null 2>&1 || true
fi

# Add SwiftBar to macOS Login Items so the menu icon comes back after reboot.
# Idempotent: skip if already registered. Skipped if --no-autostart passed.
if [[ " $* " != *" --no-autostart "* ]]; then
    if osascript -e 'tell application "System Events" to get the name of every login item' 2>/dev/null \
        | tr ',' '\n' | grep -qiE '(^| )SwiftBar( |$)'; then
        echo "→ SwiftBar already in Login Items"
    else
        echo "→ Adding SwiftBar to Login Items (auto-start at boot)"
        osascript -e 'tell application "System Events" to make login item at end with properties {path:"/Applications/SwiftBar.app", hidden:false}' \
            >/dev/null 2>&1 \
            && echo "${GREEN}  ✓ added${NC}" \
            || echo "${YELLOW}  ⚠ could not add (System Events permissions?)${NC}"
    fi
fi

cat <<EOF

Next:
  • If SwiftBar was already running, click its menu icon → "Refresh All".
  • The narrate plugin shows: 🎙️ when the server is up, 🔇 when down.
  • Click the icon to see the provider matrix, quick-speak presets,
    recent log lines, and service controls.

Override defaults via env (set in your shell init):
  NARRATE_URL=http://localhost:8888
  NARRATE_LOG=\$HOME/Documents/GitHub/narrate/logs/narrate.log
  NARRATE_REPO=\$HOME/Documents/GitHub/narrate

Uninstall:
  rm "$PLUGIN_DEST"
EOF
