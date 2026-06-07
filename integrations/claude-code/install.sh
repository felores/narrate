#!/usr/bin/env bash
#
# narrate → Claude Code installer (one command, no manual JSON editing)
#
# Installs:
#   1. MCP server   → registered via `claude mcp add` (idempotent)
#   2. Stop hook    → ~/.claude/hooks/narrate-stop-hook.ts
#   3. settings.json → Stop hook merged in automatically (no clobber)
#   4. Skill        → ~/.claude/skills/narrate/ (canonical skill, copied)
#   5. CLAUDE.md    → 🤖 BOT: auto-voice convention (asks first)
#
# Why step 5: auto-voice only fires if the model emits the 🤖 BOT: marker every
# turn. A skill loads on demand, so it can't guarantee that — the convention has
# to live in always-on context (CLAUDE.md). We ask before editing CLAUDE.md.
#
# Usage:
#   bash install.sh                # global install (~/.claude/)
#   bash install.sh --no-mcp       # skip MCP registration
#   bash install.sh --no-hook      # skip Stop hook
#   bash install.sh --convention   # inject the CLAUDE.md block without prompting
#   bash install.sh --no-convention# never touch CLAUDE.md
#
# Env:
#   NARRATE_URL   narrate server base URL (default http://localhost:8888)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SRC="$SCRIPT_DIR/stop-hook.example.ts"
CANON_SKILL="$SCRIPT_DIR/../../skills/narrate"
CONVENTION_SRC="$CANON_SKILL/assets/convention.md"

CLAUDE_DIR="$HOME/.claude"
HOOK_DEST="$CLAUDE_DIR/hooks/narrate-stop-hook.ts"
SKILL_DEST_DIR="$CLAUDE_DIR/skills/narrate"
CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"
SETTINGS="$CLAUDE_DIR/settings.json"
URL="${NARRATE_URL:-http://localhost:8888}"

MARK_BEGIN="<!-- >>> narrate auto-voice (managed) >>> -->"
MARK_END="<!-- <<< narrate auto-voice (managed) <<< -->"

DO_MCP=true
DO_HOOK=true
CONVENTION=ask          # ask | yes | no
for arg in "$@"; do
  case "$arg" in
    --no-mcp)        DO_MCP=false ;;
    --no-hook)       DO_HOOK=false ;;
    --convention)    CONVENTION=yes ;;
    --no-convention) CONVENTION=no ;;
  esac
done

mkdir -p "$CLAUDE_DIR/hooks" "$SKILL_DEST_DIR"

# pick a JS runtime for safe JSON merging (narrate already requires bun)
JS_BIN=""
command -v bun  >/dev/null 2>&1 && JS_BIN="bun"
[ -z "$JS_BIN" ] && command -v node >/dev/null 2>&1 && JS_BIN="node"

# ── 1. MCP server ───────────────────────────────────────────────
if [ "$DO_MCP" = true ]; then
  if command -v claude >/dev/null 2>&1; then
    if claude mcp list 2>/dev/null | grep -q '^narrate'; then
      echo "✅ MCP 'narrate' already registered."
    else
      claude mcp add narrate \
        --transport http \
        --url "$URL/mcp" \
        --header "X-Narrate-Client-Id: claude-code" \
        && echo "✅ MCP 'narrate' registered → $URL/mcp"
    fi
  else
    echo "ℹ️  'claude' CLI not found — skipping MCP. Register manually later:"
    echo "    claude mcp add narrate --transport http --url $URL/mcp \\"
    echo "      --header \"X-Narrate-Client-Id: claude-code\""
  fi
fi

# ── 2. Stop hook file ───────────────────────────────────────────
if [ "$DO_HOOK" = true ]; then
  cp "$HOOK_SRC" "$HOOK_DEST"
  echo "✅ Hook  → $HOOK_DEST"

  # ── 3. Merge Stop hook into settings.json ─────────────────────
  HOOK_CMD="bun run \$HOME/.claude/hooks/narrate-stop-hook.ts"
  if [ -n "$JS_BIN" ]; then
    "$JS_BIN" -e '
      const fs = require("fs");
      const f = process.argv[1], cmd = process.argv[2];
      let s = {};
      try { s = JSON.parse(fs.readFileSync(f, "utf-8")); } catch {}
      s.hooks = s.hooks || {};
      s.hooks.Stop = s.hooks.Stop || [];
      const already = JSON.stringify(s.hooks.Stop).includes("narrate-stop-hook");
      if (!already) {
        s.hooks.Stop.push({ matcher: ".*", hooks: [{ type: "command", command: cmd }] });
        fs.writeFileSync(f, JSON.stringify(s, null, 2) + "\n");
        console.log("merged");
      } else {
        console.log("present");
      }
    ' "$SETTINGS" "$HOOK_CMD" >/tmp/narrate-cc-merge 2>/dev/null || true
    case "$(cat /tmp/narrate-cc-merge 2>/dev/null)" in
      merged)  echo "✅ Stop hook added to $SETTINGS" ;;
      present) echo "✅ Stop hook already in $SETTINGS" ;;
      *)       echo "⚠️  Could not auto-merge $SETTINGS — add the Stop hook manually." ;;
    esac
  else
    echo "⚠️  No bun/node found — add this to $SETTINGS under \"hooks\":"
    echo "    { \"Stop\": [ { \"matcher\": \".*\", \"hooks\": [ { \"type\": \"command\", \"command\": \"$HOOK_CMD\" } ] } ] }"
  fi
fi

# ── 4. Skill (canonical, copied) ────────────────────────────────
if [ -d "$CANON_SKILL" ]; then
  cp -R "$CANON_SKILL/." "$SKILL_DEST_DIR/"
  echo "✅ Skill → $SKILL_DEST_DIR/ (canonical)"
else
  echo "⚠️  Canonical skill not found at $CANON_SKILL — run from the repo to install the skill."
fi

# ── 5. Auto-voice convention → CLAUDE.md (asks first) ───────────
inject_convention() {
  if [ ! -f "$CONVENTION_SRC" ]; then
    echo "⚠️  Convention snippet not found — skipping CLAUDE.md."
    return
  fi
  if [ -f "$CLAUDE_MD" ] && grep -qF "$MARK_BEGIN" "$CLAUDE_MD"; then
    echo "✅ Auto-voice convention already in $CLAUDE_MD"
    return
  fi
  {
    printf '\n%s\n' "$MARK_BEGIN"
    cat "$CONVENTION_SRC"
    printf '%s\n' "$MARK_END"
  } >> "$CLAUDE_MD"
  echo "✅ Auto-voice convention added to $CLAUDE_MD"
  echo "   (remove the block between the 'narrate auto-voice (managed)' markers to undo)"
}

case "$CONVENTION" in
  yes) inject_convention ;;
  no)  echo "ℹ️  Skipped CLAUDE.md convention (--no-convention)." ;;
  ask)
    if [ -t 0 ]; then
      printf '\n❓ Add the 🤖 BOT: auto-voice convention to %s?\n' "$CLAUDE_MD"
      printf '   Without it, auto-voice will not fire for fresh sessions. [y/N] '
      read -r reply </dev/tty || reply=""
      case "$reply" in [yY]*) inject_convention ;; *) echo "ℹ️  Left CLAUDE.md unchanged." ;; esac
    else
      echo "ℹ️  Non-interactive run — not touching CLAUDE.md."
      echo "   Re-run with --convention to add the 🤖 BOT: auto-voice block, or add it manually."
    fi
    ;;
esac

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  narrate + Claude Code installed!

  Restart Claude Code to pick up the MCP server, hook, and skill.

  Prerequisites:
  • narrate server running (brew services start narrate)

  Env vars (optional):
    NARRATE_URL=$URL
    NARRATE_HOOK_VOICE=researcher

  Test it:
    • Auto-voice: end any reply with "🤖 BOT: ..." → spoken aloud
    • On-demand:  ask "narra eso" → calls mcp__narrate__speak
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
