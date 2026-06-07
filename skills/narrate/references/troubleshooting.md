# Troubleshooting

Run `bash scripts/detect.sh` first — it pinpoints most of these.

## No audio at all

1. **Server up?** `detect.sh` → "server: ❌" means start it
   (`brew services start narrate` / `narrate-server`).
2. **Try the zero-dep path:** `narrate --provider system "test"`. If this is
   silent, the problem is OS audio/output, not narrate.
3. **Logs:** `tail -f <repo>/logs/narrate.log` (path is in `/health` →
   `logs_dir`). Errors per request show up here.
4. **Volume / output device** is actually set and audible.

## A provider shows "⚪ not configured"

- The key isn't where the **server** can read it. Keys must be in `~/.env`, not
  just the shell. If `detect.sh` says "from environment" but `/health` says not
  configured, that's exactly this — add to `~/.env`, restart the server.
- After editing `~/.env` you must **restart** the server; it reads keys at start.

## Auto-voice (`🤖 BOT:`) doesn't fire

This is the most common confusion. Auto-voice needs two things:

1. **A plugin/hook that listens** for the marker (Pi extension, OpenCode plugin,
   Claude Code stop-hook, or Codex calling the tool). Confirm it's installed.
2. **The convention in always-on context** so the model actually emits
   `🤖 BOT:` every turn. A skill is NOT enough — skills load on demand. The
   marker instruction must be in:
   - Claude Code → `~/.claude/CLAUDE.md`
   - OpenCode → `~/.config/opencode/AGENTS.md`
   - Pi → injected by the extension's `before_agent_start` (automatic)
   - Codex → `~/.codex/AGENTS.md` (added by its installer)

   If a fresh user has the plugin but no convention in their CLAUDE.md/AGENTS.md,
   the model never writes the marker, so nothing speaks. Add the convention
   there (the harness installers do this; re-run the installer if missing).

3. **Test the listener directly:** `narrate "🤖 BOT: test"` won't help — instead
   confirm the hook by checking `logs/narrate.log` for a request with the right
   `client=` id after a turn.

## Wrong voice / falls back to system

- The preset's provider isn't configured, so narrate falls back. Check
  `narrate verify` — the preset's provider must be ✅.
- Typo in the preset name → narrate can't resolve it. `voices.json` keys are
  case-sensitive.

## Gemini fails but others work

Gemini returns raw PCM; narrate needs **`ffmpeg`** to wrap it as WAV. Install
ffmpeg (`brew install ffmpeg` / `apt install ffmpeg` / `scoop install ffmpeg`).

## Windows: system voice silent

The system provider uses PowerShell `System.Speech`. It needs Windows PowerShell
(`powershell.exe`, present on all desktop Windows). On Windows Server Core,
`System.Speech` may be absent — use a cloud provider there.

## Server won't start

- Port 8888 already in use (maybe an old `voice-server`): `lsof -i :8888`
  (macOS/Linux). Change `port` in `config.json` or stop the other process.
- Bun missing: narrate needs Bun. `brew install bun` / `scoop install bun`.
