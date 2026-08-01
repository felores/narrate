#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin to set/remove provider API keys.
#
#   $1 = env key name   (OPENAI_API_KEY, GEMINI_API_KEY, ELEVENLABS_API_KEY, XAI_API_KEY)
#   $2 = provider label (for the dialog title)
#   $3 = "remove"       (optional: skip the dialog and remove the key)
#
# Prompts with a hidden-answer osascript dialog, POSTs to the narrate server
# (/keys upserts into ~/.env with a hot reload — no restart needed), then
# refreshes the menu. Cancel in the dialog = do nothing.
#
# Example:
#   narrate-menubar-key.sh OPENAI_API_KEY openai
#   narrate-menubar-key.sh OPENAI_API_KEY openai remove

set -e

KEY_NAME="${1:-}"
LABEL="${2:-}"
MODE="${3:-}"
NARRATE_URL="${NARRATE_URL:-http://localhost:8888}"

[ -z "$KEY_NAME" ] && exit 1

if [ "$MODE" != "remove" ]; then
    # hidden answer = API key stays off screen. Cancel → osascript errors → skip.
    VALUE="$(osascript \
        -e "display dialog \"API key for ${LABEL}:\" default answer \"\" with hidden answer" \
        -e "text returned of result" 2>/dev/null)" || exit 0
else
    VALUE=""
fi

# Strip any stray quotes; reject values that would break the JSON envelope.
VALUE="${VALUE//\"/}"
case "$VALUE" in
    *"\\"*|*$'\n'*) exit 1 ;;
esac

BODY="{\"${KEY_NAME}\":\"${VALUE}\"}"

curl -s -X POST "$NARRATE_URL/keys" \
    -H 'Content-Type: application/json' \
    -H 'X-Narrate-Client-Id: swiftbar' \
    -d "$BODY" > /dev/null

open "swiftbar://refreshallplugins" 2>/dev/null || true
