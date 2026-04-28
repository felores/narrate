#!/usr/bin/env bash
#
# SwiftBar / xbar plugin for the narrate TTS gateway.
# Filename suffix .5s.sh = refresh every 5 seconds.
#
# Install via ./install.sh — symlinks into the SwiftBar plugin directory.
#

# SwiftBar runs plugins with a minimal PATH; restore enough for our tools.
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"

NARRATE_URL="${NARRATE_URL:-http://localhost:8888}"
NARRATE_LOG="${NARRATE_LOG:-$HOME/Documents/GitHub/narrate/logs/narrate.log}"
PLIST="$HOME/Library/LaunchAgents/com.narrate.server.plist"
REPO_ROOT="${NARRATE_REPO:-$HOME/Documents/GitHub/narrate}"

# ─── Health probe ───────────────────────────────────────────────────────────
HEALTH=$(curl -s -m 1 "$NARRATE_URL/health" 2>/dev/null)

if [ -z "$HEALTH" ] || ! echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "🔇"
    echo "---"
    echo "narrate server: ⚫ down | color=red"
    echo "URL: $NARRATE_URL | color=#666666"
    echo "---"
    echo "Start service | shell='launchctl' param1='load' param2=$PLIST terminal=false refresh=true"
    echo "View error log | bash='/bin/bash' param1='-c' param2=\"open -a Console.app '$NARRATE_LOG'\" terminal=false"
    echo "---"
    echo "Open repo | href=https://github.com/felores/narrate"
    exit 0
fi

# ─── Server up: render plugin via single python pass on $HEALTH env var ─────
# Resolve where THIS plugin lives — used to find the speak helper next to it.
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P 2>/dev/null || dirname "$0")"
SPEAK_HELPER="$PLUGIN_DIR/narrate-menubar-speak.sh"

HEALTH="$HEALTH" \
NARRATE_URL="$NARRATE_URL" \
NARRATE_LOG="$NARRATE_LOG" \
PLIST="$PLIST" \
REPO_ROOT="$REPO_ROOT" \
SPEAK_HELPER="$SPEAK_HELPER" \
python3 - <<'PY'
import os, json, subprocess, shlex

health = json.loads(os.environ['HEALTH'])
url = os.environ['NARRATE_URL']
log_path = os.environ['NARRATE_LOG']
plist = os.environ['PLIST']
repo = os.environ['REPO_ROOT']
speak_helper = os.environ['SPEAK_HELPER']

port = health.get('port', '?')
default_provider = health.get('default_provider', '?')
default_voice = health.get('default_voice') or '(none)'
providers = health.get('providers', {})
voices = health.get('voices', [])
ok = sum(1 for v in providers.values() if v.get('configured'))
total = len(providers)

# Top bar (icon + tooltip-ish summary)
print("🎙️")
print("---")
print(f"narrate · :{port} | color=green")
print(f"providers: {ok}/{total} configured | color=#666666")
print(f"default: {default_provider} · {default_voice} | color=#666666")
print(f"presets: {len(voices)} | color=#666666")

# Provider matrix
print("---")
print("Providers")
for name, p in providers.items():
    icon = '✅' if p.get('configured') else '⚪'
    reason = p.get('reason')
    extra = f"  ({reason[:40]}...)" if reason and not p.get('configured') else ""
    print(f"--{icon} {name}{extra} | color=#888888")

# Quick speak — first 8 presets. Use the wrapper helper next to this plugin
# so SwiftBar only needs one clean param (the voice name), no quote escaping.
print("---")
print("Quick speak")
for v in voices[:8]:
    print(f"--🗣 {v} | bash='{speak_helper}' param1='{v}' terminal=false refresh=false")

# Service control
print("---")
print("Service")
restart = f"launchctl unload '{plist}' 2>/dev/null; sleep 1; launchctl load '{plist}'"
print(f"--Restart server | bash='/bin/bash' param1='-c' param2={shlex.quote(restart)} terminal=false refresh=true")
print(f"--Stop server | bash='launchctl' param1='unload' param2={plist} terminal=false refresh=true")
print(f"--View narrate.log | bash='/bin/bash' param1='-c' param2=\"open -a Console.app '{log_path}'\" terminal=false")
print(f"--Tail log in Terminal | bash='/usr/bin/open' param1='-a' param2='Terminal' param3='{log_path}' terminal=false")

# Footer
print("---")
print("Open repo | href=https://github.com/felores/narrate")
verify_cmd = f"bun run {repo}/src/cli.ts verify"
print(f"narrate verify | bash='/bin/bash' param1='-c' param2={shlex.quote(verify_cmd)} terminal=true")
print("Refresh | refresh=true")
PY

# ─── Recent log lines (tail 3) — bash because python3 already exited ────────
if [ -f "$NARRATE_LOG" ]; then
    echo "---"
    echo "Recent log"
    tail -3 "$NARRATE_LOG" 2>/dev/null | while IFS= read -r line; do
        short=$(echo "$line" | cut -c1-72)
        printf -- '-- %s | color=#888888 size=10 font=Menlo\n' "$short"
    done
fi
