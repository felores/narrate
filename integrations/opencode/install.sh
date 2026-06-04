#!/usr/bin/env bash
#
# narrate → OpenCode plugin installer
#
# Installs:
#   1. Plugin → ~/.config/opencode/plugin/narrate.js
#   2. Skill  → ~/.config/opencode/skills/narrate/SKILL.md
#   3. Dependency → adds @opencode-ai/plugin to ~/.config/opencode/package.json
#
# Usage:
#   bash install.sh                    # global install (~/.config/opencode/)
#   bash install.sh --project          # project-level install (.opencode/)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/narrate.js"
SKILL_SRC="$SCRIPT_DIR/SKILL.md"

if [ "${1:-}" = "--project" ]; then
  BASE_DIR="$(pwd)/.opencode"
  echo "→ Installing at project level: $BASE_DIR"
else
  BASE_DIR="$HOME/.config/opencode"
  echo "→ Installing globally: $BASE_DIR"
fi

PLUGIN_DIR="$BASE_DIR/plugin"
SKILL_DIR="$BASE_DIR/skills/narrate"

# ── Create directories ──────────────────────────────────────────
mkdir -p "$PLUGIN_DIR" "$SKILL_DIR"

# ── Install plugin ──────────────────────────────────────────────
if [ -f "$PLUGIN_DIR/narrate.js" ]; then
  echo "ℹ️  $PLUGIN_DIR/narrate.js already exists — leaving it."
  echo "   Diff: diff $PLUGIN_DIR/narrate.js $PLUGIN_SRC"
else
  cp "$PLUGIN_SRC" "$PLUGIN_DIR/narrate.js"
  echo "✅ Plugin → $PLUGIN_DIR/narrate.js"
fi

# ── Install skill ───────────────────────────────────────────────
if [ -f "$SKILL_DIR/SKILL.md" ]; then
  echo "ℹ️  $SKILL_DIR/SKILL.md already exists — leaving it."
else
  cp "$SKILL_SRC" "$SKILL_DIR/SKILL.md"
  echo "✅ Skill  → $SKILL_DIR/SKILL.md"
fi

# ── Ensure @opencode-ai/plugin dependency ───────────────────────
PKG_JSON="$BASE_DIR/package.json"
NEED_INSTALL=false

if [ ! -f "$PKG_JSON" ]; then
  echo '{"dependencies":{"@opencode-ai/plugin":"latest"}}' > "$PKG_JSON"
  NEED_INSTALL=true
  echo "📦 Created $PKG_JSON with @opencode-ai/plugin"
elif ! grep -q '@opencode-ai/plugin' "$PKG_JSON" 2>/dev/null; then
  # Add to existing package.json (basic — works for simple deps objects)
  TMP=$(mktemp)
  node -e "
    const p = require('$PKG_JSON');
    p.dependencies = p.dependencies || {};
    p.dependencies['@opencode-ai/plugin'] = 'latest';
    require('fs').writeFileSync('$TMP', JSON.stringify(p, null, 2) + '\n');
  "
  mv "$TMP" "$PKG_JSON"
  NEED_INSTALL=true
  echo "📦 Added @opencode-ai/plugin to $PKG_JSON"
else
  echo "✅ @opencode-ai/plugin already in $PKG_JSON"
fi

if [ "$NEED_INSTALL" = true ]; then
  echo "→ Running bun install..."
  (cd "$BASE_DIR" && bun install) 2>/dev/null || npm install --prefix "$BASE_DIR" 2>/dev/null || echo "⚠️  Could not auto-install. Run 'bun install' in $BASE_DIR manually."
fi

# ── Done ────────────────────────────────────────────────────────
cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  narrate + OpenCode installed!

  Restart OpenCode to activate the plugin.

  Prerequisites:
  • narrate server running (brew services start narrate)
  • Your agent's system prompt includes the 🤖 BOT: convention
    (the companion skill adds it automatically)

  Env vars (optional):
    NARRATE_URL=http://localhost:8888
    NARRATE_OPENCODE_VOICE=engineer

  Test it:
    opencode> "hola"
    → should hear "🤖 BOT: ..." spoken aloud
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
