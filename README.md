# narrate

> Provider-agnostic TTS gateway and CLI for AI coding harnesses.

`narrate` is a lightweight CLI and HTTP server that lets any AI coding harness — **Claude Code, OpenCode, Pi, ChatGPT Codex, Cursor, Windsurf, Cline** — or any shell script speak through any TTS provider, cloud or local. One command, one HTTP endpoint, six providers, every harness.

```bash
narrate "Deploy complete"                          # default voice/provider
narrate --voice researcher "Findings ready"        # preset
narrate --provider system --id Samantha "Local"    # zero-dep fallback
narrate verify                                     # health snapshot
```

## Providers (v1)

| Provider | Type | Auth | Notes |
|---|---|---|---|
| **ElevenLabs** | Cloud | `ELEVENLABS_API_KEY` | High quality, premium voices |
| **OpenAI TTS** | Cloud | `OPENAI_API_KEY` | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| **Google Gemini TTS** | Cloud | `GEMINI_API_KEY` | Multilingual, requires `ffmpeg` |
| **xAI Grok TTS** | Cloud | `XAI_API_KEY` | `eve`, `ara`, `rex`, `sal`, `leo` |
| **[Voicebox](https://github.com/jamiepine/voicebox)** | Local proxy | none | Auto-detects on `:17493` — voice cloning, 7 local engines |
| **System (`say` / `espeak`)** | Local | none | Zero-dep fallback, works offline |

## Quick start

```bash
git clone https://github.com/felores/narrate.git ~/Documents/GitHub/narrate
cd ~/Documents/GitHub/narrate
bun install

# Config (XDG)
mkdir -p ~/.config/narrate
cp examples/config.example.json ~/.config/narrate/config.json
cp voices.json.example          ~/.config/narrate/voices.json

# Add API keys to ~/.env (or your shell init)
echo 'OPENAI_API_KEY=sk-...'      >> ~/.env
echo 'ELEVENLABS_API_KEY=...'     >> ~/.env

# Run the server
bun run src/server.ts &

# Test
bun run src/cli.ts verify          # structural health
bun run src/cli.ts "Hello world"   # speak
```

### Run as a service (auto-start at login)

```bash
# macOS
./service/launchd/install.sh

# Linux
./service/systemd/install.sh
```

## Verify your installation

```bash
narrate verify
```

```text
narrate doctor — checking http://localhost:8888

✅ server     healthy on port 8888
   default   provider=xai voice=ara
   voices    /Users/you/.config/narrate/voices.json
   presets   7 (fred, researcher, engineer, ara, kore, morgan_local, samantha)

providers:
  ✅ elevenlabs
  ✅ openai
  ✅ gemini
  ✅ xai
  ⚪ voicebox (voicebox not reachable at http://127.0.0.1:17493)
  ✅ system

(run `narrate verify --test` to play a short sample on each configured provider)
```

`narrate verify --test` will play one sample per configured provider — useful one-time, but each cloud test costs ~1 API call.

## Use it from any harness

The integration surface is **CLI** (`narrate "..."`) or **HTTP** (`POST localhost:8888/notify`). Both work everywhere. Per-harness recipes:

| Harness | Method | Recipe |
|---|---|---|
| **Claude Code** | MCP (recommended) **or** stop hook | [`integrations/claude-code/`](integrations/claude-code/) |
| **Cursor / Windsurf / Cline** | MCP (recommended) | [`integrations/cursor/`](integrations/cursor/) |
| **OpenCode** | Plugin (`@opencode-ai/plugin`) | [`integrations/opencode/`](integrations/opencode/) — real plugin contract reference |
| **Pi (pi-mono)** | `agent.subscribe('turn_end')` | [`integrations/pi/`](integrations/pi/) — `pi-agent-core` event subscription |
| **ChatGPT Codex CLI** | Wrapper script | [`integrations/codex/`](integrations/codex/) |
| **Shell scripts / cron / CI** | Direct CLI | [`integrations/shell/`](integrations/shell/) — aliases + helpers |

### MCP — universal one-liner

Any MCP-aware harness gets `narrate.speak`, `narrate.list_voices`, and `narrate.list_providers` for free:

```bash
# Claude Code
claude mcp add narrate \
  --transport http \
  --url http://localhost:8888/mcp \
  --header "X-Narrate-Client-Id: claude-code"
```

Or in `.mcp.json` for Cursor/Windsurf/VS Code/Cline:

```json
{
  "mcpServers": {
    "narrate": {
      "url": "http://localhost:8888/mcp",
      "headers": { "X-Narrate-Client-Id": "cursor" }
    }
  }
}
```

Coexists with [voicebox's MCP server](https://github.com/jamiepine/voicebox) — they live on different ports (`8888` vs `17493`).

## HTTP API

```bash
# Speak
curl -X POST http://localhost:8888/notify \
  -H 'Content-Type: application/json' \
  -H 'X-Narrate-Client-Id: my-app' \
  -d '{"message":"Build green","voice":"engineer"}'

# Health snapshot (provider matrix, configured presets, etc.)
curl http://localhost:8888/health

# All voice presets
curl http://localhost:8888/voices

# MCP endpoint (Streamable HTTP, JSON-RPC 2.0)
curl -X POST http://localhost:8888/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

The server logs every request with provider, voice, latency, and client id — tail `~/Documents/GitHub/narrate/logs/narrate.log` (or wherever your service writes) for full observability.

## Voice presets — `voices.json`

Map a friendly name like `researcher` to a `(provider, voice_id, options)` triple so you can swap providers without touching agent code:

```json
{
  "default_voice": "fred",
  "voices": {
    "researcher": { "provider": "openai",     "voice_id": "nova"     },
    "engineer":   { "provider": "openai",     "voice_id": "alloy"    },
    "ara":        { "provider": "xai",        "voice_id": "ara"      },
    "kore":       { "provider": "gemini",     "voice_id": "Kore"     },
    "morgan":     { "provider": "voicebox",   "voice_id": "Morgan"   },
    "samantha":   { "provider": "system",     "voice_id": "Samantha" }
  }
}
```

Backward-compat: a v1 `voices.json` (no `provider` field, just `voice_name`) is auto-detected and assumed to be `provider: "system"` (matches macOS `say` voice naming).

## narrate vs voicebox

[Voicebox](https://github.com/jamiepine/voicebox) is a full local-first TTS studio with on-device inference, voice cloning, dictation, MCP server, and 7 local engines. It's a desktop app.

`narrate` is a thin gateway. **They compose** — voicebox is one of narrate's providers.

| | narrate | voicebox |
|---|---|---|
| Form factor | CLI + HTTP server | Desktop app (Tauri) |
| Engines | Cloud + local proxy + system | 7 local engines (MLX/CUDA) |
| Voice cloning | No (uses provider voices) | Yes (zero-shot) |
| Dictation (STT) | No | Yes (Whisper hotkey) |
| MCP server | Yes (`/mcp`, v0.3+) | Yes (built-in `/mcp` on :17493) |
| Footprint | < 1 MB | GB of models |
| Best for | Drop into any agent harness or script | Privacy-first studio workflows |

Use **narrate** when you want one command that any harness or shell can call. Use **voicebox** when you want fully local, GPU-accelerated voice. Use **both** when you want to mix cloud and local providers behind a single CLI.

### Install voicebox to use as a local provider

```bash
./examples/voicebox-install-macos.sh
# Launch Voicebox.app, let it download a TTS model
narrate verify   # voicebox row should flip from ⚪ to ✅
```

Then add a voicebox preset to `voices.json` and use `narrate --voice <preset> "..."`.

## Configuration precedence

1. CLI flags (`--provider`, `--voice`, `--id`)
2. POST body (`provider`, `voice`, `voice_id`)
3. `~/.config/narrate/config.json`
4. `NARRATE_*` env vars (`NARRATE_PROVIDER`, `NARRATE_VOICE`, `NARRATE_PORT`, `NARRATE_URL`)
5. `~/.claude/settings.json` (legacy compat shim — read but never written)
6. Built-in defaults

API keys are always loaded from environment (`ELEVENLABS_API_KEY`, etc.) or `~/.env`. Never put them in `config.json` or `voices.json`.

## Development

```bash
bun install
bun run --watch src/server.ts
./node_modules/.bin/tsc --noEmit   # typecheck
```

Project layout:

```text
narrate/
├── src/
│   ├── providers/    # one file per provider, all implement Provider interface
│   ├── voices.ts     # voices.json loader (v1 → v2 compat)
│   ├── config.ts     # XDG config + env vars
│   ├── playback.ts   # afplay / ffplay
│   ├── server.ts     # HTTP server (Bun)
│   └── cli.ts        # narrate CLI
├── integrations/     # one folder per harness with real refs
├── service/          # launchd + systemd installers (templates)
├── examples/         # config example + voicebox installer
└── voices.json.example
```

## Status

**v0.3.0** — MCP server at `/mcp` (tools: `speak`, `list_voices`, `list_providers`). Universal harness adapter: any MCP-aware client integrates with one config block.

**v0.2.0** — per-request observability, `narrate verify` doctor, real OpenCode/Pi integrations, voicebox install helper.

**v0.1.0** — initial release: 6 providers, CLI, HTTP server, voices.json v2 schema, launchd + systemd, 5 harness integrations.

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
