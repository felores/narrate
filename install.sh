#!/usr/bin/env bash
#
# narrate install — installs narrate and creates wrapper scripts on PATH.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh | bash
#
# Modes:
#   binary (default) — downloads the prebuilt standalone binary from GitHub
#                      Releases. No bun, no git required.
#   source           — clones the repo and runs from source (needs bun + git).
#                      NARRATE_MODE=source install.sh
#
# Env overrides:
#   NARRATE_DIR=/path/to/install     (default: ~/.local/share/narrate)
#   BIN_DIR=/path/to/bin             (default: ~/.local/bin)
#   NARRATE_MODE=auto|binary|source  (default: auto — binary if available, else source)
#   NARRATE_VERSION=latest|vX.Y.Z    (default: latest)
#   NARRATE_REF=branch_or_tag        (source mode only, default: main)
#

set -euo pipefail

NARRATE_DIR="${NARRATE_DIR:-$HOME/.local/share/narrate}"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
NARRATE_MODE="${NARRATE_MODE:-auto}"
NARRATE_VERSION="${NARRATE_VERSION:-latest}"
NARRATE_REF="${NARRATE_REF:-main}"
REPO_URL="https://github.com/felores/narrate.git"
RELEASE_URL_BASE="${NARRATE_RELEASE_URL_BASE:-https://github.com/felores/narrate/releases}"

GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[0;31m'
NC=$'\033[0m'

info()  { echo -e "${GREEN}→${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
error() { echo -e "${RED}❌${NC} $*" >&2; exit 1; }

# ─── Platform detection ───────────────────────────────────────────────────────
detect_platform() {
    local os arch
    os="$(uname -s | tr '[:upper:]' '[:lower:]')"
    arch="$(uname -m)"
    case "$os:$arch" in
        darwin:arm64)   echo "darwin-arm64" ;;
        darwin:x86_64)  echo "darwin-x64" ;;
        linux:x86_64)   echo "linux-x64" ;;
        linux:aarch64)  echo "linux-arm64" ;;
        *)              echo "" ;;
    esac
}
PLAT="$(detect_platform)"

# ─── Binary mode ──────────────────────────────────────────────────────────────
install_binary() {
    [ -n "$PLAT" ] || return 1
    local tag="$NARRATE_VERSION"
    local url_base="$RELEASE_URL_BASE/$tag/download"
    local name url
    mkdir -p "$NARRATE_DIR/bin"
    for name in narrate narrate-server; do
        url="$url_base/$name-$PLAT"
        info "Downloading $name ($PLAT)"
        if ! curl -fsSL -o "$NARRATE_DIR/bin/$name-$PLAT" "$url"; then
            rm -rf "$NARRATE_DIR/bin"
            rmdir "$NARRATE_DIR" 2>/dev/null || true
            return 1
        fi
        chmod +x "$NARRATE_DIR/bin/$name-$PLAT"
    done
    # Source assets (service installers, harness integrations, skill). Not
    # needed to run, but needed for `narrate setup` and service installs.
    local src_tar_url
    if [ "$NARRATE_VERSION" = "latest" ]; then
        src_tar_url="https://github.com/felores/narrate/archive/refs/heads/main.tar.gz"
    else
        src_tar_url="https://github.com/felores/narrate/archive/refs/tags/$NARRATE_VERSION.tar.gz"
    fi
    info "Downloading source assets (service + integrations)"
    rm -rf "$NARRATE_DIR/src"
    mkdir -p "$NARRATE_DIR/src"
    if ! curl -fsSL "$src_tar_url" | tar -xz -C "$NARRATE_DIR/src" --strip-components=1 -f -; then
        rm -rf "$NARRATE_DIR/src"
        warn "Source assets unavailable — service installers and harness integrations won't be present"
    fi
}

# ─── Source mode ──────────────────────────────────────────────────────────────
install_source() {
    if ! command -v bun >/dev/null 2>&1; then
        error "source mode needs bun (not found in PATH).
   Install bun first:
     curl -fsSL https://bun.sh/install | bash
   Then re-run this installer.
   (Or let the installer use a prebuilt binary instead.)"
    fi
    if ! command -v git >/dev/null 2>&1; then
        error "git is required but not found in PATH."
    fi
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
    info "Installing dependencies"
    (cd "$NARRATE_DIR" && bun install --silent)
}

# ─── Run install ──────────────────────────────────────────────────────────────
MODE="$NARRATE_MODE"
if [ "$MODE" = "auto" ]; then
    if install_binary; then
        MODE="binary"
    else
        warn "No prebuilt binary for this platform ($PLAT) — falling back to source install"
        install_source
        MODE="source"
    fi
elif [ "$MODE" = "binary" ]; then
    install_binary || error "Binary download failed for $PLAT. Try NARRATE_MODE=source or check https://github.com/felores/narrate/releases"
elif [ "$MODE" = "source" ]; then
    install_source
else
    error "Unknown NARRATE_MODE: $MODE (auto|binary|source)"
fi

# ─── Create wrapper scripts on PATH ───────────────────────────────────────────
mkdir -p "$BIN_DIR"

if [ "$MODE" = "binary" ]; then
    cat > "$BIN_DIR/narrate" <<EOF
#!/usr/bin/env bash
exec "$NARRATE_DIR/bin/narrate-$PLAT" "\$@"
EOF
    chmod +x "$BIN_DIR/narrate"
    cat > "$BIN_DIR/narrate-server" <<EOF
#!/usr/bin/env bash
exec "$NARRATE_DIR/bin/narrate-server-$PLAT" "\$@"
EOF
    chmod +x "$BIN_DIR/narrate-server"
else
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
fi

info "Wrappers installed:"
echo "    $BIN_DIR/narrate"
echo "    $BIN_DIR/narrate-server"

# ─── PATH check ──────────────────────────────────────────────────────────────
if ! echo ":$PATH:" | grep -q ":$BIN_DIR:"; then
    warn "$BIN_DIR is NOT on your PATH. Add this to your shell init:"
    echo "    export PATH=\"$BIN_DIR:\$PATH\""
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
SERVICE_HINT=""
if [ "$MODE" = "binary" ]; then
    SERVICE_HINT="      NARRATE_BIN=$NARRATE_DIR/bin/narrate-server-$PLAT $NARRATE_DIR/src/service/launchd/install.sh $NARRATE_DIR    # macOS
      NARRATE_BIN=$NARRATE_DIR/bin/narrate-server-$PLAT $NARRATE_DIR/src/service/systemd/install.sh $NARRATE_DIR    # Linux"
else
    SERVICE_HINT="      $NARRATE_DIR/service/launchd/install.sh    # macOS
      $NARRATE_DIR/service/systemd/install.sh    # Linux"
fi

cat <<EOF

${GREEN}✅ narrate installed ($MODE)${NC}

Next steps:

  1. Configure API keys (any subset):
        export ELEVENLABS_API_KEY=...
        export OPENAI_API_KEY=...
        export GEMINI_API_KEY=...
        export XAI_API_KEY=...
     (or put them in ~/.env — narrate auto-loads it)

  2. Start the server (one-shot, foreground):
        narrate-server

     Or as a background service:
$SERVICE_HINT

  3. Run the interactive setup wizard (keys, default voice, harness
     integrations, background service):
        narrate setup
     (or `narrate setup --check` for a non-interactive status report)

  4. Verify:
        narrate verify

  5. Speak something:
        narrate "Hello world"

Docs: https://github.com/felores/narrate
EOF
