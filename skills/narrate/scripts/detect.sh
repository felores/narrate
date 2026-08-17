#!/usr/bin/env bash
#
# narrate setup detection — prints what's already in place so the agent driving
# setup doesn't ask redundant questions. Read-only, never fails hard.
#
# Reports: OS, narrate CLI/server presence, server health, API keys in ~/.env,
# and which providers are configured.
#
# Env: NARRATE_URL (default http://localhost:8888)

URL="${NARRATE_URL:-http://localhost:8888}"
ENV_FILE="$HOME/.env"

say() { printf '%s\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

# ── OS ──────────────────────────────────────────────────────────
case "$(uname -s 2>/dev/null)" in
  Darwin)  OS="macOS (system voice: say)" ;;
  Linux)   OS="Linux (system voice: espeak-ng)" ;;
  MINGW*|MSYS*|CYGWIN*) OS="Windows (system voice: SAPI)" ;;
  *)       OS="${OS:-unknown}" ;;
esac

say "── narrate setup state ──────────────────────────────"
say "OS:            $OS"

# ── CLI / server binaries ───────────────────────────────────────
if have narrate; then say "narrate CLI:    ✅ on PATH ($(command -v narrate))"
else say "narrate CLI:    ⚪ not on PATH (install via brew/scoop/curl)"; fi

if have narrate-server; then say "narrate-server: ✅ on PATH"
else say "narrate-server: ⚪ not on PATH"; fi

# ── Server health ───────────────────────────────────────────────
HEALTH=""
if have curl; then HEALTH="$(curl -fsS --max-time 3 "$URL/health" 2>/dev/null)"; fi
if [ -n "$HEALTH" ]; then
  say "server:        ✅ up at $URL"
else
  say "server:        ❌ not responding at $URL  (start it before testing voice)"
fi

# ── API keys in ~/.env ──────────────────────────────────────────
say ""
say "API keys in ~/.env:"
check_key() {
  local var="$1" label="$2"
  if [ -f "$ENV_FILE" ] && grep -qE "^[[:space:]]*(export[[:space:]]+)?$var=." "$ENV_FILE" 2>/dev/null; then
    say "  ✅ $label ($var)"
  elif [ -n "${!var:-}" ]; then
    say "  ✅ $label ($var, from environment)"
  else
    say "  ⚪ $label ($var) — not set"
  fi
}
check_key ELEVENLABS_API_KEY "ElevenLabs"
check_key OPENAI_API_KEY     "OpenAI"
check_key GEMINI_API_KEY     "Gemini"
check_key XAI_API_KEY        "xAI"
check_key SONIOX_API_KEY     "Soniox"
check_key FISH_AUDIO_API_KEY "Fish Audio"
say "  (system provider needs no key — always available)"

# ── Configured providers (from /health if up) ───────────────────
if [ -n "$HEALTH" ]; then
  say ""
  say "Providers reported by the server (/health):"
  if have python3; then
    printf '%s' "$HEALTH" | python3 -c '
import sys, json
try:
    h = json.load(sys.stdin)
except Exception:
    sys.exit(0)
provs = h.get("providers") or {}
if isinstance(provs, dict):
    items = list(provs.items())
elif isinstance(provs, list):
    items = [(p.get("name", "?"), p) for p in provs]
else:
    items = []
for name, info in items:
    ok = info.get("configured") if isinstance(info, dict) else info
    mark = "✅" if ok else "⚪"
    print("  " + mark + " " + str(name))
default = h.get("default_provider")
if default:
    print("  default_provider: " + str(default))
' 2>/dev/null || say "  (could not parse /health JSON)"
  else
    say "  (install python3 or run: narrate verify  — for the provider matrix)"
  fi
fi

# ── Config files ────────────────────────────────────────────────
say ""
say "Config files:"
for f in "$HOME/.config/narrate/config.json" "$HOME/.config/narrate/voices.json"; do
  if [ -f "$f" ]; then say "  ✅ $f"; else say "  ⚪ $f (not created)"; fi
done
say "─────────────────────────────────────────────────────"
