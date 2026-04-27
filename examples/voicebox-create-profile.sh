#!/usr/bin/env bash
#
# Create a voicebox profile from a Kokoro / Qwen preset, ready to use with
# narrate's voicebox provider.
#
# Voicebox distinguishes engine (downloaded model) from profile (a usable
# voice). Engines come with preset voices, but each preset has to be turned
# into a profile before /speak will accept it. This script does that.
#
# Usage:
#   ./voicebox-create-profile.sh                  # creates default "Bella" from Kokoro af_bella
#   ./voicebox-create-profile.sh "Adam" "kokoro" "am_adam"
#   ./voicebox-create-profile.sh "Kore" "qwen" "Cherry"
#
# Prereqs:
#   - Voicebox app running (http://127.0.0.1:17493 reachable)
#   - The engine (kokoro, qwen, etc.) already downloaded via Voicebox UI
#

set -euo pipefail

NAME="${1:-Bella}"
ENGINE="${2:-kokoro}"
PRESET_VOICE_ID="${3:-af_bella}"
LANG="${4:-en}"
VOICEBOX_URL="${VOICEBOX_URL:-http://127.0.0.1:17493}"

GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
NC=$'\033[0m'

# Pre-flight
if ! curl -s -m 2 "$VOICEBOX_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ voicebox not reachable at $VOICEBOX_URL${NC}" >&2
    echo "   Launch the app:  open /Applications/Voicebox.app" >&2
    exit 1
fi

# Check the preset exists for this engine
PRESET_CHECK=$(curl -s "$VOICEBOX_URL/profiles/presets/$ENGINE" || echo '{}')
if ! echo "$PRESET_CHECK" | grep -q "\"voice_id\":\"$PRESET_VOICE_ID\""; then
    echo -e "${RED}❌ preset '$PRESET_VOICE_ID' not found for engine '$ENGINE'${NC}" >&2
    echo "   Make sure the $ENGINE engine is downloaded (Voicebox UI → Settings → Engines)." >&2
    echo "   Available presets for $ENGINE:" >&2
    echo "$PRESET_CHECK" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for v in d.get('voices', []):
    print(f\"     {v['voice_id']}  ({v['name']}, {v.get('gender','?')}, {v.get('language','?')})\", file=sys.stderr)
" 2>/dev/null || true
    exit 1
fi

# Create the profile
echo "→ Creating voicebox profile '$NAME' from $ENGINE/$PRESET_VOICE_ID"
RESP=$(curl -s -X POST "$VOICEBOX_URL/profiles" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$NAME\",\"voice_type\":\"preset\",\"preset_engine\":\"$ENGINE\",\"preset_voice_id\":\"$PRESET_VOICE_ID\",\"language\":\"$LANG\",\"description\":\"Created by narrate voicebox-create-profile.sh\"}")

PROFILE_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

if [ -z "$PROFILE_ID" ]; then
    echo -e "${RED}❌ profile creation failed:${NC}" >&2
    echo "$RESP" >&2
    exit 1
fi

echo -e "${GREEN}✅ profile created${NC}"
echo "   id:       $PROFILE_ID"
echo "   name:     $NAME"
echo "   engine:   $ENGINE"
echo "   preset:   $PRESET_VOICE_ID"
echo ""
echo "Test it:"
echo "   narrate --provider voicebox --id $NAME 'Test from voicebox $NAME'"
echo ""
echo "Or add it to your narrate voices.json:"
cat <<EOF
   {
     "voices": {
       "$(echo "$NAME" | tr '[:upper:]' '[:lower:]')": {
         "provider": "voicebox",
         "voice_id": "$NAME",
         "description": "$ENGINE/$PRESET_VOICE_ID via voicebox"
       }
     }
   }
EOF
