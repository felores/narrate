# narrate

> Provider-agnostic TTS gateway and CLI for AI coding harnesses.

`narrate` is a lightweight CLI and HTTP server that lets any AI coding harness — Claude Code, OpenCode, ChatGPT Codex, Cursor, Windsurf, Cline, or any shell script — speak through any TTS provider.

**Providers in v1:**

| Provider | Type | Auth |
|---|---|---|
| ElevenLabs | Cloud | `ELEVENLABS_API_KEY` |
| OpenAI TTS | Cloud | `OPENAI_API_KEY` |
| Google Gemini TTS | Cloud | `GEMINI_API_KEY` |
| xAI Grok TTS | Cloud | `XAI_API_KEY` |
| [Voicebox](https://github.com/jamiepine/voicebox) | Local | none |
| System (`say` / `espeak`) | Local | none |

## Quick start

```bash
git clone https://github.com/felores/narrate.git ~/Documents/GitHub/narrate
cd ~/Documents/GitHub/narrate
bun install

# config: ~/.config/narrate/config.json + voices.json
mkdir -p ~/.config/narrate
cp examples/config.example.json ~/.config/narrate/config.json
cp voices.json.example ~/.config/narrate/voices.json

# run
bun run src/server.ts &
bun run src/cli.ts "Hello world"
```

## Use it from any harness

The integration surface is **CLI** (run a shell command) or **HTTP** (POST to `localhost:8888/notify`). Pick whichever your harness supports.

- **Claude Code** — see [`integrations/claude-code/`](integrations/claude-code/)
- **OpenCode** — see [`integrations/opencode/`](integrations/opencode/)
- **ChatGPT Codex CLI** — see [`integrations/codex/`](integrations/codex/)
- **Cursor / Windsurf / Cline** — see [`integrations/cursor/`](integrations/cursor/)
- **Shell scripts** — see [`integrations/shell/`](integrations/shell/)

## narrate vs voicebox

[Voicebox](https://github.com/jamiepine/voicebox) is a full local-first TTS studio with on-device inference, voice cloning, dictation, and 7 local engines. It's a desktop app.

`narrate` is a thin gateway: a CLI and an HTTP server that routes requests across cloud and local providers via a uniform interface. **They compose** — voicebox is one of narrate's providers, available as `provider: "voicebox"` in `voices.json`.

| | narrate | voicebox |
|---|---|---|
| Form factor | CLI + HTTP server | Desktop app (Tauri) |
| Engines | Cloud + local proxy + system | 7 local engines (MLX/CUDA) |
| Voice cloning | No (uses provider voices) | Yes (zero-shot) |
| Dictation (STT) | No | Yes (Whisper hotkey) |
| Footprint | < 1 MB | GB of models |
| Best for | Drop into any agent harness or script | Privacy-first studio workflows |

Use **narrate** when you want one command that any harness or shell can call. Use **voicebox** when you want fully local, GPU-accelerated voice. Use **both** when you want to mix cloud and local providers behind a single CLI.

## Status

v0.1.0 — under active development. See [CHANGELOG.md](CHANGELOG.md).

## License

MIT — see [LICENSE](LICENSE).
