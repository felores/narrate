#!/usr/bin/env bash
#
# One-shot installer for voicebox.sh on macOS.
# Once installed and launched, narrate's voicebox provider will auto-detect
# it on http://127.0.0.1:17493 — no narrate config change needed.
#
# Usage:  ./voicebox-install-macos.sh
#

set -euo pipefail

ARCH=$(uname -m)
case "$ARCH" in
    arm64)
        ASSET="voicebox_aarch64.app.tar.gz"
        ;;
    x86_64)
        ASSET="voicebox_x64.app.tar.gz"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH" >&2
        echo "   See https://github.com/jamiepine/voicebox/releases for manual download" >&2
        exit 1
        ;;
esac

URL="https://github.com/jamiepine/voicebox/releases/latest/download/$ASSET"
WORK_DIR=$(mktemp -d -t voicebox-install)
APP_DIR="/Applications/Voicebox.app"

if [ -d "$APP_DIR" ]; then
    echo "ℹ️  $APP_DIR already exists. Remove it first if you want to reinstall."
    echo "    Or simply launch the existing app: open '$APP_DIR'"
    exit 0
fi

echo "→ Downloading $ASSET (~500 MB) to $WORK_DIR"
curl -L --fail --progress-bar -o "$WORK_DIR/$ASSET" "$URL"

echo "→ Extracting"
tar -xzf "$WORK_DIR/$ASSET" -C "$WORK_DIR"

if [ ! -d "$WORK_DIR/Voicebox.app" ]; then
    echo "❌ Voicebox.app not found in extracted archive" >&2
    exit 1
fi

echo "→ Moving to /Applications/"
mv "$WORK_DIR/Voicebox.app" "$APP_DIR"

echo "→ Removing macOS quarantine attribute"
xattr -dr com.apple.quarantine "$APP_DIR" 2>/dev/null || true

rm -rf "$WORK_DIR"

cat <<EOF

✅ Voicebox installed at $APP_DIR

Next steps:
  1. Launch:        open '$APP_DIR'
  2. First run will download a TTS model (~350 MB to ~8 GB depending on engine).
     Start with Kokoro (~350 MB) for fastest setup.
  3. Once running, the API listens on http://127.0.0.1:17493
  4. Verify from narrate:
        narrate verify
     The voicebox row should turn from ⚪ to ✅.
  5. Add a voicebox preset to ~/.config/narrate/voices.json:
        "morgan_local": {
          "provider": "voicebox",
          "voice_id": "Morgan",
          "description": "Voicebox local clone"
        }
  6. Use it:
        narrate --voice morgan_local "Test local"

Troubleshooting:
  - If macOS blocks the app: System Settings → Privacy & Security → "Open Anyway"
  - If port 17493 is busy: change Voicebox port in Settings, then set VOICEBOX_URL env var
  - voicebox docs: https://docs.voicebox.sh
EOF
