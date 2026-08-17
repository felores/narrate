# Changelog

## v0.5.1 — 2026-08-17

### Added
- **Soniox TTS provider** using the `tts-rt-v2` REST API, with live voice discovery, multilingual language selection, speed and silence controls, and full CLI/HTTP/MCP/setup/SwiftBar integration.
- **DeepSeek Harness integration** with automatic `🤖 BOT:` narration, the `narrate_speak` tool, always-on convention injection, and bundled skill.
- **SwiftBar update action** for source and binary installs, with live version display.

### Changed
- Removed provider credit/quota network probes from `/health`, `narrate verify`, and SwiftBar so health checks stay fast and reliable.
- Soniox voices are loaded live in SwiftBar and displayed as a flat list with their descriptions.
- SwiftBar now lets the narrate and session voices use independent providers while retaining the "Use same as narrate" option.

### Fixed
- SwiftBar 2.1.0/2.1.1 no longer leaves voice submenus permanently disabled after provider or key changes. Narrate relaunches affected versions where refresh is known to fail; 2.1.2+ keeps normal URL refresh.
- Release builds now publish one complete `SHA256SUMS.txt` across all platform artifacts.

## v0.5.0 — 2026-08-01

### Added
- **Standalone binaries** (`scripts/build.sh`): `bun build --compile` per platform — macOS arm64/x64, Linux arm64/x64, Windows x64. A single binary replaces the bun prerequisite on every install path. `dist/` naming is platform-clean (`narrate-linux-arm64`, `narrate-server-windows-x64.exe`).
- **GitHub Actions release pipeline** (`.github/workflows/release.yml`): on `v*` tags, a native matrix builds and attaches per-platform binaries + `SHA256SUMS.txt` to the GitHub Release (via softprops/action-gh-release).
- **Bunless installer** (`install.sh`): `curl | bash` now downloads the prebuilt binary for the detected platform (auto-fallback to source if none exists), also fetches the source tarball to `NARRATE_DIR/src` so service installers and integrations work without bun. Overridable via `NARRATE_MODE` (`auto`/`binary`/`source`), `NARRATE_VERSION`, `NARRATE_RELEASE_URL_BASE`.
- **Binary-mode services**: launchd and systemd installers accept `NARRATE_BIN=/path/to/narrate-server`; templates render `__PROGRAM_ARGS__` and pass `NARRATE_DIR` so compiled servers self-locate data/logs. The compiled server detects its own binary and uses `NARRATE_DIR` instead of the repo layout.
- **Interactive `narrate setup` wizard** (`src/setup.ts`): walks through API keys (secret input, written to `~/.env` 0600 + `POST /keys`), default provider/voice, harness integrations (Claude Code, OpenCode, Pi, Codex), and service install (launchd/systemd, binary mode when available). `narrate setup --check` prints the same report non-interactively. Uses a custom stdin reader — Bun's `node:readline` drops buffered input after the first question.
- **Fish Audio provider** (`src/providers/fish.ts`): trained voice models from your own audio, free dev tier (`s2.1-pro-free`), `listVoices()` via `GET /model`, `credits` surfaced in `/health` and `narrate verify`. Registered in CLI, MCP, `/keys`, `narrate setup`, and `verify --test`.
- **Provider credits in `/health`**: providers can report a human-readable quota/credit summary (`credits` field); shown by `narrate verify` and the SwiftBar menu as sub-rows.
- **Scoop Task Scheduler helper** (`packaging/scoop/install-service.ps1`): one command registers the `narrate-server` logon task (`schtasks`-backed, relative `%~dp0` shim); referenced from the manifest notes and README.
- **Windows quickstart** in both READMEs (scoop or prebuilt binary).

### Changed
- **READMEs rewritten to lead with benefits and versatility**: "Why narrate" (voice without lock-in, speaks day one, one setup for every tool, drops into any harness, zero dependencies) and "How versatile" (7 providers × 3 interfaces × 6+ harnesses × 3 OS × 0 required keys) now sit above the quickstart. Fish Audio added throughout: provider table, API-key table, provider setup, `providerConfig` table, health example, architecture diagram, project layout, MCP enum, CLI provider list.
- `narrate setup` added to CLI reference and install docs; precedence table's built-in default corrected to `system` (was stale `elevenlabs`).
- `narrate verify --test` now resolves live sample voices (ElevenLabs premade lookup, Fish/Voicebox `listVoices()`) instead of hardcoded IDs.

### Fixed
- `narrate verify --test` failed with "Error: Unknown option: --test" (CLI flag parsing for subcommand flags).
- Precedence doc/table stated `default_provider: "elevenlabs"` while the code defaults to `system` since v0.3.6.

## v0.4.0 — 2026-06-07

### Added
- **Windows support**:
  - `system` provider now speaks on Windows via PowerShell `System.Speech.Synthesis` (SAPI) — zero deps, offline, no API key, the Windows peer of macOS `say` / Linux `espeak`. Text and voice are passed via env vars (`NARRATE_TEXT` / `NARRATE_VOICE`) to avoid PowerShell injection; SAPI's `-10..10` rate is mapped from the WPM/multiplier intent. `listVoices()` enumerates installed SAPI voices.
  - **Scoop packaging** (`packaging/scoop/narrate.json`) mirroring the Homebrew tap, installed from the [`felores/scoop-narrate`](https://github.com/felores/scoop-narrate) bucket: `scoop bucket add narrate … && scoop install narrate`. Depends on `bun`, generates `narrate.cmd` / `narrate-server.cmd` shims in `pre_install` (before Scoop's `create_shims`). Run-at-login via Task Scheduler.
- **Canonical `narrate` skill** (`skills/narrate/`): guided setup/onboarding (OS detection via `scripts/detect.sh`, provider selection, **voice-preview playground links**, config writing) plus an on-demand narration reference. One source, copied into each harness's skills dir by its installer.
- **Claude Code one-command installer** (`integrations/claude-code/install.sh`): idempotently registers the MCP server, copies the Stop hook and **merges it into `settings.json`** (no manual JSON editing), copies the canonical skill, and offers to add the `🤖 BOT:` convention to `~/.claude/CLAUDE.md`.
- **Codex integration** (`integrations/codex/install.sh`): registers narrate as a streamable-HTTP MCP server in `~/.codex/config.toml` and adds the voice convention to `~/.codex/AGENTS.md`.
- **Pi extension** (`integrations/pi/`): native `ExtensionAPI` extension with `message_end` auto-voice, system-prompt injection, and a `narrate_speak` tool; installable via `pi install` or `install.sh`.
- **Spanish README** (`README.es.md`) with a 🇬🇧/🇪🇸 language switcher and a centered ASCII banner on both READMEs.

### Fixed
- **Auto-voice reliability for OpenCode + Claude Code**: the `🤖 BOT:` convention is now written to the harness's always-on context (`AGENTS.md` / `CLAUDE.md`) by the installer, not left only in a skill. Skills load on demand, so auto-voice silently didn't fire for fresh users. (Pi injects via the extension; Codex via AGENTS.md.)
- **Provider API-key import-order race**: `apiKey` on the ElevenLabs / OpenAI / Gemini / xAI providers is now a lazy getter, read from `process.env` at call time instead of cached at construction — fixes voice generation failing when the provider was instantiated before `~/.env` was loaded.
- **launchd logs moved out of `~/Documents`**: recent macOS TCC sandboxing denies `xpcproxy` read access under `~/Documents`, aborting the spawn (exit 78). `StandardOutPath`/`StandardErrorPath` now live under `~/Library/Logs/narrate/`.

### Changed
- README leads with the provider-agnostic pitch + harness matrix; harness table documents the one-command installers and the streamable-HTTP MCP path for Codex/Cursor.

## v0.3.6 — 2026-04-28

### Fixed
- **First-run UX**: default provider is now `system` (macOS `say` / Linux `espeak-ng`) instead of `elevenlabs`. Fresh installs work end-to-end without any API keys — `narrate "hello"` produces audio immediately. Users with an existing `config.json` or `NARRATE_PROVIDER` env override are unaffected.
- **README rewritten for non-technical users**:
  - Top of README is now a 60-second 3-command quickstart (`brew install` → `brew services start` → `narrate "hello"`) using the zero-config system voice. No API keys, no signup.
  - New "Add an API key" section right after quickstart with a provider/cost table and copy-paste config snippets — replaces the dense Configure section as the primary path.
  - "Why narrate" demoted below the quickstart (people who got here already know why).
  - Long flat TOC collapsed under `<details>` so it doesn't push the install path below the fold.
  - Install section reordered: Homebrew first (one command), curl install second (with a clear callout that bun is a prerequisite), git clone last (development only).
  - Configure section trimmed: leads with "you can skip this" and focuses on voice presets / custom defaults — API keys are now covered earlier.

## v0.3.5 — 2026-04-28

### Added
- **`/health` exposes `repo_dir` and `logs_dir`** so plugins and tooling can self-locate the running install instead of guessing paths. The SwiftBar plugin now uses this — works regardless of install method (Homebrew, curl, git clone) without env overrides.
- **SwiftBar Login Items auto-registration**: `integrations/menubar/install.sh` now adds SwiftBar to macOS Login Items so the menu icon survives reboot. Pass `--no-autostart` to skip. Idempotent.

### Fixed
- **Plist no longer snapshots install-time `$PATH`**. The previous `s|__PATH_VALUE__|$PATH|g` substitution captured whatever PATH the user happened to have at install time, including dirs that might not exist later. The new template bakes a static, sensible PATH (`<bun_dir>:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`).
- **README portability**: replaced hardcoded `~/Documents/GitHub/narrate/...` paths with `$NARRATE_DIR` everywhere, plus a new "Where things live" section documenting the canonical install path per method.
- **README env var clarity**: explicit note that API keys must live in `~/.env` (not `.zshrc`/`.bashrc`) when running narrate as a service. LaunchAgents and systemd units don't read shell init.
- **menubar/README** corrected: `install.sh` copies the plugin (not symlinks it). The doc claimed symlink but the actual installer was changed to `cp` to fix `BASH_SOURCE` resolution.
- **SwiftBar plugin self-locates** via `/health` + fallback chain (`~/.local/share/narrate`, `~/Documents/GitHub/narrate`, `$(brew --prefix narrate)/libexec`). No more broken defaults for non-git-clone users.

## v0.3.4 — 2026-04-27

### Added
- **SwiftBar / xbar plugin** at `integrations/menubar/narrate.5s.sh`. Shows a 🎙️ icon when narrate is healthy, 🔇 when down. Click to see the provider matrix (6 providers with `✅`/`⚪`), quick-speak shortcuts for the first 8 voice presets (one click → POSTs to `/notify` and that voice speaks), the last 3 lines of `narrate.log`, and service controls (Restart / Stop the LaunchAgent, open log in Console). Works as a SwiftBar plugin or any xbar-compatible runner.
- `integrations/menubar/install.sh` — symlinks the plugin into `~/Library/Application Support/SwiftBar/Plugins/`, removes the legacy `voice-server.5s.sh` if present, and launches SwiftBar if it isn't already running.
- `integrations/menubar/README.md` — install + customize.

### Notes
- The legacy `voice-server.5s.sh` plugin (from the old `~/.claude/voice-server/` setup) referenced scripts that no longer exist after the migration to narrate. The installer auto-removes it.

## v0.3.3 — 2026-04-27

### Added
- **CLI `--language` flag**: forces the generation language regardless of the voice's trained language. Useful with cross-language voices — e.g. `narrate --provider voicebox --id Bella --language es "Hola"` makes Kokoro Bella (en-trained) speak proper Spanish phonetics. Kokoro is multilingual at the model level; voices are just style vectors, so they can be aimed at any of the engine's supported languages with this override.
- **CLI `--instruct` flag**: passes natural-language delivery hint to Qwen CustomVoice. E.g. `narrate --provider voicebox --id Ryan --instruct "broadcast news quality" "..."`. Other engines ignore this.
- Both flags forward as `providerConfig.{language,instruct}` to the server, where they win over preset providerConfig and over auto-resolved profile defaults.
- `voices.json.example` now includes `bella_es` as a working example: same Bella voice, forced Spanish phonetics, no need for a separate Spanish-trained voice.

### Fixed
- The voicebox provider's auto-resolution of `profile.language` is correct for default behavior (a Spanish-trained Dora speaks Spanish without extra config) but was previously not overridable from the CLI. Adding `--language` closes that gap.

## v0.3.2 — 2026-04-27

### Added
- **Voicebox `instruct` passthrough**: the voicebox provider now forwards `providerConfig.instruct` to voicebox's `/speak` endpoint. This unlocks Qwen CustomVoice's natural-language delivery control directly from narrate — no need to bypass to curl. Supported instructions include `"warm and friendly conversational tone"`, `"professional and authoritative, broadcast quality"`, `"speak slowly with emphasis"`, `"whispering, intimate and close"`, `"excited and energetic, like sports commentary"`. Other engines ignore the field.
- **`voices.json.example` Qwen presets** showcasing the pattern: `ryan_calm` (calm-engineer delivery) and `ryan_broadcast` (news-anchor delivery), both backed by the same Qwen Ryan profile but different deliveries.

### Notes
- Qwen CustomVoice's engine name in the voicebox API is `qwen_custom_voice` (with underscores), not `qwen-customvoice`. The voicebox `/profiles/presets/{engine}` endpoint returns empty for Qwen — you must use POST `/profiles` with `voice_type: "preset"`, `preset_engine: "qwen_custom_voice"`, and `preset_voice_id` matching one of: `Ryan`, `Aiden` (English), `Vivian`, `Serena`, `Uncle Fu`, `Dylan`, `Eric` (Chinese), `Ono Anna` (Japanese), `Sohee` (Korean).

## v0.3.1 — 2026-04-27

### Added
- **In-process log rotation** in `src/logger.ts`. Replaces global `console.log`/`console.error` with size-rotating file writers.
  - `NARRATE_LOG_MAX_BYTES` (default 10 MiB) — rotation threshold
  - `NARRATE_LOG_KEEP` (default 5) — number of rotations to keep
  - `NARRATE_LOG_DISABLED=1` — opt out (raw stdout/stderr, useful for `bun run` dev)
  - Files rotate: `narrate.log` → `narrate.log.1` → ... → `narrate.log.5` (oldest dropped)
- launchd / systemd templates updated to redirect their own stdout/stderr to `logs/launchd-stdout.log` / `logs/launchd-stderr.log` (a separate channel for pre-init startup output and crashes — never grows during normal operation).
- **Voicebox `language` fix** (`aede995`): the voicebox provider now resolves `profile.language` from voicebox's `/profiles` (cached 60s) and passes it to `/speak`. Spanish-trained voices (Dora, Alex via `ef_dora` / `em_alex`) now correctly speak Spanish. Override via `providerConfig.language`.
- **Comprehensive README** covering install (3 paths), per-provider setup, voicebox deep dive, voices.json schema, full CLI / HTTP API / MCP tool references, configuration precedence, run-as-service, log rotation, architecture diagram, project layout, narrate-vs-voicebox comparison, roadmap, troubleshooting, and contributing.

### Notes
- Existing service users must rerun `service/launchd/install.sh` (or systemd equivalent) to pick up the new log paths.

## v0.3.0 — 2026-04-27

### Added
- **Homebrew install** via the `felores/narrate` tap:
  ```bash
  brew tap felores/narrate
  brew install narrate
  ```
  Includes a `brew services` recipe so `brew services start narrate` auto-starts the server at login. Tap repo: https://github.com/felores/homebrew-narrate
- **curl install script** at `install.sh` (root of repo). Clones to `~/.local/share/narrate` and writes wrappers (`narrate`, `narrate-server`) to `~/.local/bin`. Idempotent — re-running updates an existing install. Honors `NARRATE_DIR`, `BIN_DIR`, `NARRATE_REF` env vars.
- **MCP server at `/mcp`** — narrate now speaks the Model Context Protocol over Streamable HTTP. Three tools exposed:
  - `speak({ text, voice?, voice_id?, provider? })` — generate and play audio
  - `list_voices()` — preset registry from voices.json
  - `list_providers()` — provider health matrix
- **Universal harness adapter**: any MCP-aware client (Claude Code, Cursor, Windsurf, Cline, VS Code MCP) integrates with one config line:
  ```bash
  claude mcp add narrate --transport http --url http://localhost:8888/mcp \
    --header "X-Narrate-Client-Id: claude-code"
  ```
  Or via `.mcp.json` for HTTP MCP clients. Coexists with voicebox's MCP server (different ports).
- **Per-request `/mcp` logging** — same observability format as `/notify` (method, status, latency, client id).

### Implementation notes
- Uses `@modelcontextprotocol/sdk@1.29.0` with `WebStandardStreamableHTTPServerTransport` (Bun/Web-API native — no Node.js http types).
- Stateless mode: fresh transport per request to avoid message-id collisions across clients (per SDK guidance).
- Mounted on the same Bun server as the existing HTTP API — no separate process or port.

## v0.2.0 — 2026-04-27

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
