#!/usr/bin/env bash
#
# narrate → Codex CLI installer
#
# Codex (https://github.com/openai/codex) supports streamable-HTTP MCP servers
# via ~/.codex/config.toml. narrate exposes exactly that. This installer:
#   1. Adds [mcp_servers.narrate] to ~/.codex/config.toml (idempotent append)
#   2. Appends the narrate voice convention to ~/.codex/AGENTS.md
#
# Usage:
#   bash install.sh                # global install (~/.codex/)
#   bash install.sh --no-agents    # MCP only, skip AGENTS.md
#
# Env:
#   NARRATE_URL   narrate server base URL (default http://localhost:8888)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_SRC="$SCRIPT_DIR/AGENTS.md"

CODEX_DIR="$HOME/.codex"
CONFIG="$CODEX_DIR/config.toml"
AGENTS="$CODEX_DIR/AGENTS.md"
URL="${NARRATE_URL:-http://localhost:8888}"

DO_AGENTS=true
for arg in "$@"; do
  case "$arg" in
    --no-agents) DO_AGENTS=false ;;
  esac
done

mkdir -p "$CODEX_DIR"

# ── 1. MCP server block ─────────────────────────────────────────
if [ -f "$CONFIG" ] && grep -q '^\[mcp_servers\.narrate\]' "$CONFIG"; then
  echo "✅ [mcp_servers.narrate] already in $CONFIG"
else
  {
    printf '\n[mcp_servers.narrate]\n'
    printf 'url = "%s/mcp"\n' "$URL"
    printf 'http_headers = { "X-Narrate-Client-Id" = "codex" }\n'
    printf 'startup_timeout_sec = 10\n'
    printf 'enabled = true\n'
  } >> "$CONFIG"
  echo "✅ MCP 'narrate' added → $CONFIG"
fi

# ── 2. AGENTS.md convention ─────────────────────────────────────
if [ "$DO_AGENTS" = true ]; then
  if [ -f "$AGENTS" ] && grep -q '🤖 BOT:' "$AGENTS"; then
    echo "✅ narrate convention already in $AGENTS"
  else
    [ -f "$AGENTS" ] && printf '\n\n' >> "$AGENTS"
    cat "$AGENTS_SRC" >> "$AGENTS"
    echo "✅ Voice convention appended → $AGENTS"
  fi
fi

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  narrate + Codex installed!

  Restart Codex to load the MCP server.

  Prerequisites:
  • narrate server running (brew services start narrate)
  • Codex CLI with streamable-HTTP MCP support (recent versions)

  Config written:
    $CONFIG        ([mcp_servers.narrate])
    $AGENTS   (voice convention)

  Verify:
    codex mcp list          # should list 'narrate'

  Tip: to skip the per-call approval prompt for the speak tool, add
       default_tools_approval_mode = "auto" under [mcp_servers.narrate].
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
