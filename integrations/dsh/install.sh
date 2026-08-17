#!/usr/bin/env bash
#
# install.sh — install narrate-dsh into a DeepSeek Harness profile.
#
# 1. Builds the plugin (tsc -> lib/types/).
# 2. Installs it into the profile via `dsh plugin --profile <name> add`,
#    which reconciles the package's `dsh.bundle` declaration into the
#    profile's bundle stack (the cordis.patch.yml insert row is then applied
#    at boot).
#
# Idempotent: re-running rebuilds and re-adds (pnpm add is a no-op for an
# already-present dependency).
#
# Usage:
#   bash install.sh                 # default profile: dsh-tui
#   bash install.sh --profile web   # pick another profile
#   bash install.sh --no-build      # skip the tsc build (already built)

set -euo pipefail

PROFILE="dsh-tui"
BUILD=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --no-build) BUILD=0; shift ;;
    *) echo "unknown argument: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLUGIN_DIR="$REPO_ROOT/integrations/dsh"

if [[ "$BUILD" -eq 1 ]]; then
  echo "→ building narrate-dsh (tsc)..."
  (cd "$PLUGIN_DIR" && bun install --frozen-lockfile 2>/dev/null || bun install)
  (cd "$PLUGIN_DIR" && bun run build)
fi

echo "→ installing narrate-dsh into profile '$PROFILE'..."
dsh plugin --profile "$PROFILE" add "$PLUGIN_DIR"

echo
echo "✓ narrate-dsh installed into profile '$PROFILE'."
echo "  Restart the harness (dsh --profile $PROFILE) to load the plugin."
echo "  Verify: dsh --profile $PROFILE --dump-config | grep -A2 'id: narrate'"
