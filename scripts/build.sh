#!/usr/bin/env bash
#
# Build standalone narrate binaries with bun build --compile.
#
# Usage:
#   bash scripts/build.sh            # native binaries only
#   bash scripts/build.sh --all      # all platforms via cross-compile
#   bash scripts/build.sh --target <t>  # one specific target (e.g. bun-darwin-x64)
#
# Output: dist/narrate{,-server}[-<os>-<arch>][.exe]
#
# The binaries self-locate via NARRATE_COMPILED=1 (baked in at compile time):
# logs and repo_dir default to ~/.local/share/narrate (override: NARRATE_DIR).

set -euo pipefail

cd "$(dirname "$0")/.."

DIST=dist
BUN="${BUN:-bun}"
mkdir -p "$DIST"

# Cross-compile matrix (bun --target). Empty target = native.
TARGETS=()
if [ "${1:-}" = "--all" ]; then
  TARGETS=(bun-darwin-arm64 bun-darwin-x64 bun-linux-x64 bun-linux-arm64 bun-windows-x64)
elif [ "${1:-}" = "--target" ]; then
  TARGETS=("${2:-}")
fi

build_one() {
  local entry="$1" name="$2" target="$3"
  local out
  if [ -z "$target" ]; then
    out="$DIST/$name"
  else
    out="$DIST/$name-${target#bun-}"
  fi
  [ "${target#*windows*}" != "$target" ] && out="$out.exe"

  echo "→ building $out"
  local args=(--compile --minify --define 'process.env.NARRATE_COMPILED="1"')
  [ -n "$target" ] && args+=(--target "$target")
  "$BUN" build \
    "${args[@]}" \
    "$entry" --outfile "$out"
}

if [ "${1:-}" = "--all" ] || [ "${1:-}" = "--target" ]; then
  for t in "${TARGETS[@]}"; do
    build_one src/server.ts narrate-server "$t"
    build_one src/cli.ts narrate "$t"
  done
else
  build_one src/server.ts narrate-server ""
  build_one src/cli.ts narrate ""
fi

echo "→ done: $(ls -lh "$DIST" | awk 'NR>1 {print $9, $5}')"
