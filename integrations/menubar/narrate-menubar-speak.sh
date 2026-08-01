#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin click handlers.
#
# Two modes:
#   $1 = preset name           (uses voices.json registry)
#   $1 = voice id, $2 = provider (raw provider voice id, bypasses presets)
#   $3 = optional message     (default: "Probando <voice> desde la barra de menú")
#
# Examples:
#   narrate-menubar-speak.sh fred                       # preset
#   narrate-menubar-speak.sh Rachel elevenlabs          # raw voice id
#   narrate-menubar-speak.sh alloy openai
#
# Exists so the SwiftBar plugin can call us with one or two clean params —
# avoids escape hell when embedding curl + JSON in a SwiftBar `bash=` line.
#

set -e

VOICE="${1:-}"
PROVIDER="${2:-}"
NARRATE_URL="${NARRATE_URL:-http://localhost:8888}"

if [ -z "$VOICE" ]; then
    osascript -e 'display notification "no voice arg" with title "narrate"' || true
    exit 1
fi

MSG="${3:-Probando ${VOICE} desde la barra de menú}"

if [ -n "$PROVIDER" ]; then
    BODY="{\"message\":\"$MSG\",\"voice_id\":\"$VOICE\",\"provider\":\"$PROVIDER\",\"voice_enabled\":true}"
else
    BODY="{\"message\":\"$MSG\",\"voice\":\"$VOICE\",\"voice_enabled\":true}"
fi

curl -s -X POST "$NARRATE_URL/notify" \
    -H 'Content-Type: application/json' \
    -H 'X-Narrate-Client-Id: swiftbar' \
    -d "$BODY" > /dev/null
