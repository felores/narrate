#!/usr/bin/env bash
#
# Copy the narrate Stop hook into ~/.claude/hooks/ and print the snippet
# to add to ~/.claude/settings.json.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SRC="$SCRIPT_DIR/stop-hook.example.ts"
HOOK_DEST="$HOME/.claude/hooks/narrate-stop-hook.ts"

mkdir -p "$HOME/.claude/hooks"

if [ -f "$HOOK_DEST" ]; then
    echo "ℹ️  $HOOK_DEST already exists — leaving it alone."
    echo "    Diff against the example: diff $HOOK_DEST $HOOK_SRC"
else
    cp "$HOOK_SRC" "$HOOK_DEST"
    echo "✅ Copied hook → $HOOK_DEST"
fi

cat <<'EOF'

Add this to ~/.claude/settings.json under "hooks":

{
  "hooks": {
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          { "type": "command", "command": "bun run $HOME/.claude/hooks/narrate-stop-hook.ts" }
        ]
      }
    ]
  }
}

Make sure the narrate server is running. Either:
  • Manually:    bun run /path/to/narrate/src/server.ts
  • As service:  /path/to/narrate/service/launchd/install.sh

EOF
