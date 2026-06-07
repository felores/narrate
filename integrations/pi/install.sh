#!/usr/bin/env bash
#
# narrate → Pi extension installer
#
# Two install methods:
#   1. pi install (recommended) — managed by pi, survives updates
#   2. Manual copy — drop files into ~/.pi/agent/
#
# Usage:
#   bash install.sh                    # manual copy (global)
#   bash install.sh --pi               # use pi install (global)
#   bash install.sh --pi --project     # use pi install (project-level)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_SRC="$SCRIPT_DIR/extensions/narrate.ts"
SKILL_SRC="$SCRIPT_DIR/skills/narrate/SKILL.md"

# ── pi install path (recommended) ──────────────────────────────
if [ "${1:-}" = "--pi" ]; then
  if [ "${2:-}" = "--project" ]; then
    echo "→ Installing at project level via pi install..."
    pi install -l "$SCRIPT_DIR"
  else
    echo "→ Installing globally via pi install..."
    pi install "$SCRIPT_DIR"
  fi
  cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pi-narrate installed via pi!

  Restart pi to activate the extension.

  Prerequisites:
  • narrate server running (brew services start narrate)

  Env vars (optional):
    NARRATE_URL=http://localhost:8888
    NARRATE_PI_VOICE=researcher

  Test it in pi:
    > "hola"
    → should hear "🤖 BOT: ..." spoken aloud
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
  exit 0
fi

# ── Manual copy path ───────────────────────────────────────────
PI_EXT_DIR="$HOME/.pi/agent/extensions"
PI_SKILL_DIR="$HOME/.pi/agent/skills/narrate"

mkdir -p "$PI_EXT_DIR" "$PI_SKILL_DIR"

# ── Extension ──────────────────────────────────────────────────
if [ -f "$PI_EXT_DIR/narrate.ts" ]; then
  echo "ℹ️  $PI_EXT_DIR/narrate.ts already exists — overwriting."
fi
cp "$EXT_SRC" "$PI_EXT_DIR/narrate.ts"
echo "✅ Extension → $PI_EXT_DIR/narrate.ts"

# ── Skill ──────────────────────────────────────────────────────
if [ -f "$PI_SKILL_DIR/SKILL.md" ]; then
  echo "ℹ️  $PI_SKILL_DIR/SKILL.md already exists — overwriting."
fi
cp "$SKILL_SRC" "$PI_SKILL_DIR/SKILL.md"
echo "✅ Skill  → $PI_SKILL_DIR/SKILL.md"

cat <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pi-narrate installed!

  Restart pi or run /reload to activate the extension.

  Prerequisites:
  • narrate server running (brew services start narrate)

  Env vars (optional):
    NARRATE_URL=http://localhost:8888
    NARRATE_PI_VOICE=researcher

  Test it in pi:
    > "hola"
    → should hear "🤖 BOT: ..." spoken aloud

  Tip: for managed installs, use pi install instead:
    bash install.sh --pi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF