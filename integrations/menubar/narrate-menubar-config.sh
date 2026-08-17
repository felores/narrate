#!/usr/bin/env bash
#
# Helper invoked by the SwiftBar plugin to change voices on the fly.
#
# Modes:
#   $1 = narrate            → set default (on-demand) voice: $2 = voice_id, $3 = provider
#   $1 = auto               → set session-end (🤖 BOT:) voice: $2 = voice_id, $3 = provider
#   $1 = auto-same          → session voice = narrate voice (clears auto pair)
#   $1 = select             → switch active provider: $2 = voice_id, $3 = provider
#                            (resets default voice to $2 and clears the auto pair)
#
# Examples:
#   narrate-menubar-config.sh narrate ara xai
#   narrate-menubar-config.sh auto Bella voicebox
#   narrate-menubar-config.sh auto-same
#   narrate-menubar-config.sh select ara xai
#
# The change is applied live by the server (POST /config writes config.json,
# no restart) and the menu refreshes immediately.

set -e

TARGET="${1:-}"
VOICE="${2:-}"
PROVIDER="${3:-}"
NARRATE_URL="${NARRATE_URL:-http://localhost:8888}"

case "$TARGET" in
    narrate)
        [ -z "$VOICE" ] && exit 1
        [ -z "$PROVIDER" ] && exit 1
        BODY="{\"default_provider\":\"$PROVIDER\",\"default_voice\":\"$VOICE\"}"
        ;;
    auto)
        [ -z "$VOICE" ] && exit 1
        [ -z "$PROVIDER" ] && exit 1
        BODY="{\"auto_provider\":\"$PROVIDER\",\"auto_voice\":\"$VOICE\"}"
        ;;
    auto-same)
        BODY="{\"auto_provider\":null,\"auto_voice\":null}"
        ;;
    select)
        [ -z "$VOICE" ] && exit 1
        [ -z "$PROVIDER" ] && exit 1
        BODY="{\"default_provider\":\"$PROVIDER\",\"default_voice\":\"$VOICE\",\"auto_provider\":null,\"auto_voice\":null}"
        ;;
    *)
        exit 1
        ;;
esac

curl -s -X POST "$NARRATE_URL/config" \
    -H 'Content-Type: application/json' \
    -H 'X-Narrate-Client-Id: swiftbar' \
    -d "$BODY" > /dev/null

# SwiftBar 2.1.0/2.1.1 detach dynamic submenus when their child count changes.
# Provider switches change the voice count, and refresh cannot repair it.
SWIFTBAR_VERSION="$(mdls -name kMDItemVersion -raw /Applications/SwiftBar.app 2>/dev/null || true)"
if [ "$TARGET" = "select" ] && [[ "$SWIFTBAR_VERSION" == "2.1.0" || "$SWIFTBAR_VERSION" == "2.1.1" ]]; then
    killall SwiftBar 2>/dev/null || true
    sleep 1
    open -a SwiftBar
else
    open "swiftbar://refreshallplugins" 2>/dev/null || true
fi
