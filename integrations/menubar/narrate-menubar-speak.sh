#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin's "Quick speak" entries.
# Posts to /notify with the given preset name (single arg).
# Exists so the SwiftBar plugin can call us with one clean param —
# avoids escape hell when embedding curl + JSON in a SwiftBar `bash=` line.
#
# Usage: narrate-menubar-speak.sh <voice_preset>
#

set -e

VOICE="${1:-}"
NARRATE_URL="${NARRATE_URL:-http://localhost:8888}"

if [ -z "$VOICE" ]; then
    osascript -e 'display notification "no voice arg" with title "narrate"'
    exit 1
fi

MSG="Probando ${VOICE} desde la barra de menú"

curl -s -X POST "$NARRATE_URL/notify" \
    -H 'Content-Type: application/json' \
    -H 'X-Narrate-Client-Id: swiftbar' \
    --data-binary @- <<EOF > /dev/null
{"message":"$MSG","voice":"$VOICE","voice_enabled":true}
EOF
