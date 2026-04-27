#!/usr/bin/env bash
#
# narrate install — clones the repo and creates wrapper scripts on PATH.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh | bash
#
# Env overrides:
#   NARRATE_DIR=/path/to/install   (default: ~/.local/share/narrate)
#   BIN_DIR=/path/to/bin           (default: ~/.local/bin)
#   NARRATE_REF=branch_or_tag      (default: main)
#

set -euo pipefail

NARRATE_DIR="${NARRATE_DIR:-$HOME/.local/share/narrate}"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
NARRATE_REF="${NARRATE_REF:-main}"
REPO_URL="https://github.com/felores/narrate.git"

GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[0;31m'
NC=$'\033[0m'

info()  { echo -e "${GREEN}→${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}❌${NC} $*" >&2; exit 1; }

# ─── Pre-flight ──────────────────────────────────────────────────────────────
if ! command -v bun >/dev/null 2>&1; then
    error "bun is required but not found in PATH.
   Install bun first:
     curl -fsSL https://bun.sh/install | bash
   Then re-run this installer."
fi

if ! command -v git >/dev/null 2>&1; then
    error "git is required but not found in PATH."
fi

# ─── Clone / update ──────────────────────────────────────────────────────────
mkdir -p "$(dirname "$NARRATE_DIR")"

if [ -d "$NARRATE_DIR/.git" ]; then
    info "Updating existing install at $NARRATE_DIR"
    git -C "$NARRATE_DIR" fetch --quiet --depth 1 origin "$NARRATE_REF"
    git -C "$NARRATE_DIR" reset --hard "origin/$NARRATE_REF" --quiet
elif [ -e "$NARRATE_DIR" ]; then
    error "$NARRATE_DIR exists but is not a git checkout. Move or delete it first."
else
    info "Cloning narrate ($NARRATE_REF) into $NARRATE_DIR"
    git clone --quiet --depth 1 --branch "$NARRATE_REF" "$REPO_URL" "$NARRATE_DIR"
fi

# ─── Install deps ────────────────────────────────────────────────────────────
info "Installing dependencies"
(cd "$NARRATE_DIR" && bun install --silent)

# ─── Create wrapper scripts on PATH ─────────────────────────────────────────
mkdir -p "$BIN_DIR"

cat > "$BIN_DIR/narrate" <<EOF
#!/usr/bin/env bash
exec bun run "$NARRATE_DIR/src/cli.ts" "\$@"
EOF
chmod +x "$BIN_DIR/narrate"

cat > "$BIN_DIR/narrate-server" <<EOF
#!/usr/bin/env bash
exec bun run "$NARRATE_DIR/src/server.ts" "\$@"
EOF
chmod +x "$BIN_DIR/narrate-server"

info "Wrappers installed:"
echo "    $BIN_DIR/narrate"
echo "    $BIN_DIR/narrate-server"

# ─── PATH check ──────────────────────────────────────────────────────────────
if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
    warn "$BIN_DIR is NOT on your PATH. Add this to your shell init:"
    echo "    export PATH=\"$BIN_DIR:\$PATH\""
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
cat <<EOF

${GREEN}✅ narrate installed${NC}

Next steps:

  1. Configure API keys (any subset):
        export ELEVENLABS_API_KEY=...
        export OPENAI_API_KEY=...
        export GEMINI_API_KEY=...
        export XAI_API_KEY=...
     (or put them in ~/.env — narrate auto-loads it)

  2. Optional: copy example voice presets:
        mkdir -p ~/.config/narrate
        cp $NARRATE_DIR/voices.json.example ~/.config/narrate/voices.json

  3. Start the server (one-shot, foreground):
        narrate-server

     Or as a background service:
        $NARRATE_DIR/service/launchd/install.sh    # macOS
        $NARRATE_DIR/service/systemd/install.sh    # Linux

  4. Verify:
        narrate verify

  5. Speak something:
        narrate "Hello world"

Docs: https://github.com/felores/narrate
EOF
