# Changelog

## v0.2.0 — 2026-04-27 (in development)

### Added
- **Per-request server logging** — every `/notify` and `/pai` request logs provider, voice, byte size, latency, client IP, `X-Narrate-Client-Id` header, and user-agent. Errors logged with timing. Tail `logs/narrate.log` for full observability.
- **`narrate verify` CLI subcommand** — doctor-style health snapshot of the server and provider matrix. Add `--test` to play a one-line sample on each configured provider (one API call each — use sparingly).
- **`examples/voicebox-install-macos.sh`** — one-shot installer that downloads the latest voicebox arm64/x64 release, extracts, moves to `/Applications/`, and prints next-step instructions.
- **Pi (pi-mono) integration** at `integrations/pi/README.md` — real `agent.subscribe('turn_end')` pattern from `@mariozechner/pi-agent-core`, SDK + wrapper script.
- **OpenCode integration rewritten** at `integrations/opencode/README.md` — references the actual `@opencode-ai/plugin` Hooks contract and the internal event bus, no more generic placeholders.
- **README expanded** — multi-harness quickstart matrix, voices.json schema example, configuration precedence, project layout.

### Changed
- The voicebox row in `narrate verify` shows the actual reachability error message when down (no more silent "configured: false").
- README explicitly notes the MCP server is v2 roadmap so users don't expect it in v1.

## v0.1.0 — 2026-04-27

Initial release.

### Added
- 6 TTS providers via uniform `Provider` interface:
  - **ElevenLabs** (cloud, `ELEVENLABS_API_KEY`)
  - **OpenAI TTS** (cloud, `OPENAI_API_KEY`)
  - **Google Gemini TTS** (cloud, `GEMINI_API_KEY`, requires `ffmpeg`)
  - **xAI Grok TTS** (cloud, `XAI_API_KEY`)
  - **Voicebox** (local proxy to `:17493`, no auth)
  - **System** (`say` on macOS, `espeak`/`espeak-ng` on Linux, no auth)
- HTTP server (Bun) on port 8888 with endpoints `/notify`, `/pai` (legacy alias), `/health`, `/voices`.
- `narrate` CLI with `--voice` (preset), `--id` (raw), `--provider`, `--url`, `--quiet`.
- `voices.json` v2 schema with `provider` field + automatic v1 backward-compat (legacy `voice_name` files auto-migrate to `provider: "system"`).
- XDG config at `~/.config/narrate/{config.json, voices.json}` with `~/.claude/settings.json` legacy compat shim.
- Service installers — `service/launchd/install.sh` (macOS) and `service/systemd/install.sh` (Linux) with `$HOME` substitution at install time (no hardcoded paths).
- Integration templates for Claude Code, OpenCode, Codex, Cursor, and shell.
- MIT license, public release.
