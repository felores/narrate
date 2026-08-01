#!/usr/bin/env bash
#
# narrate → OpenCode plugin installer
#
# Installs:
#   1. Plugin → ~/.config/opencode/plugins/narrate.js
#   2. Skill  → ~/.config/opencode/skills/narrate/ (canonical skill, copied)
#   3. Dependency → adds @opencode-ai/plugin to ~/.config/opencode/package.json
#   4. AGENTS.md → 🤖 BOT: auto-voice convention (asks first)
#
# Why step 4: the plugin listens for the 🤖 BOT: marker but doesn't inject the
# convention into the model's context. A skill loads on demand, so it can't make
# the model emit the marker every turn. The convention has to live in always-on
# context (AGENTS.md). We ask before editing AGENTS.md.
#
# Usage:
#   bash install.sh                    # global install (~/.config/opencode/)
#   bash install.sh --project          # project-level install (.opencode/)
#   bash install.sh --convention       # inject AGENTS.md block without prompting
#   bash install.sh --no-convention    # never touch AGENTS.md
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$SCRIPT_DIR/narrate.js"
CANON_SKILL="$SCRIPT_DIR/../../skills/narrate"
CONVENTION_SRC="$CANON_SKILL/assets/convention.md"

MARK_BEGIN="<!-- >>> narrate auto-voice (managed) >>> -->"
MARK_END="<!-- <<< narrate auto-voice (managed) <<< -->"

CONVENTION=ask          # ask | yes | no
PROJECT=false
for arg in "$@"; do
  case "$arg" in
    --project)       PROJECT=true ;;
    --convention)    CONVENTION=yes ;;
    --no-convention) CONVENTION=no ;;
  esac
done

if [ "$PROJECT" = true ]; then
  BASE_DIR="$(pwd)/.opencode"
  echo "→ Installing at project level: $BASE_DIR"
else
  BASE_DIR="$HOME/.config/opencode"
  echo "→ Installing globally: $BASE_DIR"
fi

# OpenCode loads plugins from <config>/plugins/ (NOT "plugin" — that dir is
# ignored). We learned this the hard way: old installs went to plugin/ and the
# plugin silently didn't load.
PLUGIN_DIR="$BASE_DIR/plugins"
SKILL_DIR="$BASE_DIR/skills/narrate"
AGENTS_MD="$BASE_DIR/AGENTS.md"

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

# ── Install skill (canonical, copied) ───────────────────────────
if [ -d "$CANON_SKILL" ]; then
  cp -R "$CANON_SKILL/." "$SKILL_DIR/"
  echo "✅ Skill  → $SKILL_DIR/ (canonical)"
else
  echo "⚠️  Canonical skill not found at $CANON_SKILL — run from the repo to install the skill."
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

# ── Auto-voice convention → AGENTS.md (asks first) ──────────────
inject_convention() {
  if [ ! -f "$CONVENTION_SRC" ]; then
    echo "⚠️  Convention snippet not found — skipping AGENTS.md."
    return
  fi
  if [ -f "$AGENTS_MD" ] && grep -qF "$MARK_BEGIN" "$AGENTS_MD"; then
    echo "✅ Auto-voice convention already in $AGENTS_MD"
    return
  fi
  {
    printf '\n%s\n' "$MARK_BEGIN"
    cat "$CONVENTION_SRC"
    printf '%s\n' "$MARK_END"
  } >> "$AGENTS_MD"
  echo "✅ Auto-voice convention added to $AGENTS_MD"
  echo "   (remove the block between the 'narrate auto-voice (managed)' markers to undo)"
}

case "$CONVENTION" in
  yes) inject_convention ;;
  no)  echo "ℹ️  Skipped AGENTS.md convention (--no-convention)." ;;
  ask)
    if [ -t 0 ]; then
      printf '\n❓ Add the 🤖 BOT: auto-voice convention to %s?\n' "$AGENTS_MD"
      printf '   Without it, auto-voice will not fire for fresh sessions. [y/N] '
      read -r reply </dev/tty || reply=""
      case "$reply" in [yY]*) inject_convention ;; *) echo "ℹ️  Left AGENTS.md unchanged." ;; esac
    else
      echo "ℹ️  Non-interactive run — not touching AGENTS.md."
      echo "   Re-run with --convention to add the 🤖 BOT: auto-voice block, or add it manually."
    fi
    ;;
esac

# ── Done ────────────────────────────────────────────────────────
cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  narrate + OpenCode installed!

  Restart OpenCode to activate the plugin.

  Prerequisites:
  • narrate server running (brew services start narrate)
  • The 🤖 BOT: convention in AGENTS.md (this installer offers to add it)

  Env vars (optional):
    NARRATE_URL=http://localhost:8888
    NARRATE_OPENCODE_VOICE=engineer

  Test it:
    opencode> "hola"
    → should hear "🤖 BOT: ..." spoken aloud
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
