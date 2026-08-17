<div align="center">

<pre>
███╗   ██╗ █████╗ ██████╗ ██████╗  █████╗ ████████╗███████╗
████╗  ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
██╔██╗ ██║███████║██████╔╝██████╔╝███████║   ██║   █████╗  
██║╚██╗██║██╔══██║██╔══██╗██╔══██╗██╔══██║   ██║   ██╔══╝  
██║ ╚████║██║  ██║██║  ██║██║  ██║██║  ██║   ██║   ███████╗
╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
         Make your AI agents speak. Zero lock-in.
</pre>

🇬🇧 **English**  ·  🇪🇸 [Español](README.es.md)

A provider-agnostic TTS gateway — one server, one set of keys, the same voice in every harness.

**Claude Code · Cursor · OpenCode · Pi · Codex · any shell**

</div>

---

## Why narrate

Your AI agents generate text. **narrate makes them speak** — with the voice you want, from the provider you already pay for, inside whichever coding tool you use. You wire it up once, and every harness, script, and cron job speaks through the same server.

- **Voice without lock-in.** ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio, local [Voicebox](https://github.com/jamiepine/voicebox), or your OS's built-in voice — all behind one interface. Swap providers by changing one line, never agent code.
- **Speaks on day one.** A fresh install talks immediately with the OS voice (macOS `say` / Linux `espeak` / Windows SAPI). API keys are optional — add them when you want studio quality.
- **One setup, every tool.** CLI for shells and cron, HTTP for anything that can `fetch`, MCP for agents with native tool calling. Same keys, same voices, same server.
- **Drops into any AI harness.** One-command installers for Claude Code, OpenCode, Pi, and Codex: auto-voice on every response (`🤖 BOT:` convention), on-demand narration, zero manual JSON.
- **Zero dependencies to run.** Prebuilt binaries for macOS, Windows, and Linux — no bun, no git, no Node. One command installs it, including auto-start as a service.

## How versatile

| | |
|---|---|
| **8 providers** | Cloud (ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio) + local (Voicebox, system) — add any subset, narrate uses what you configure |
| **3 interfaces** | CLI · HTTP · MCP — one code path, three doors in |
| **6+ harnesses** | Claude Code, OpenCode, Pi, Codex one-command installers; Cursor/Windsurf/Cline via MCP; any shell script |
| **3 operating systems** | macOS (launchd), Windows (SAPI + Task Scheduler), Linux (systemd) — same commands everywhere |
| **0 required keys** | System voice works offline out of the box; premium providers are strictly additive |

The full provider table is [below](#providers); the harness table is [here](#use-it-from-each-harness).

---

## 60-second quickstart (macOS)

Hear narrate speak in three commands — no API keys, no signup:

```bash
brew install felores/narrate/narrate
brew services start narrate
narrate "Hello, narrate"
```

That's it. Uses your built-in macOS voice. Want studio-quality voices? Add an [API key](#add-an-api-key) — it's optional.

> **Windows?** `scoop bucket add narrate https://github.com/felores/scoop-narrate && scoop install narrate`, then `narrate-server` and `narrate "hello"`. Or download the [prebuilt binaries](https://github.com/felores/narrate/releases/latest) — no scoop, no bun.

> **Linux?** `curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh | bash` (grabs a prebuilt binary — no bun needed), then `sudo apt install espeak-ng`, then `narrate-server &` and `narrate "hello"`.

---

<details>
<summary><strong>Table of contents</strong></summary>

- [Why narrate](#why-narrate)
- [How versatile](#how-versatile)
- [Add an API key](#add-an-api-key) — for premium voices
- [Use it from your AI tool](#use-it-from-each-harness) — Claude Code, Cursor, OpenCode, etc.
- [Providers](#providers)
- [Install](#install) — other methods
- [Where things live](#where-things-live)
- [Configure](#configure)
- [Quickstart by interface](#quickstart-by-interface)
- [Provider setup detail](#provider-setup-detail)
- [Voicebox deep dive](#voicebox-deep-dive) — local voice cloning
- [voices.json — voice presets](#voicesjson--voice-presets)
- [CLI reference](#cli-reference)
- [HTTP API reference](#http-api-reference)
- [MCP tools reference](#mcp-tools-reference)
- [Configuration precedence](#configuration-precedence)
- [Run as a service](#run-as-a-service)
- [Logging and observability](#logging-and-observability)
- [Architecture](#architecture)
- [Project layout](#project-layout)
- [narrate vs voicebox](#narrate-vs-voicebox)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

</details>

---

## Add an API key

Optional. The default macOS voice works fine for notifications, but premium providers sound dramatically better. Pick one (or several):

| Provider | Where to get the key | Cost |
|---|---|---|
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io) | free tier, premium voices |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | pay-per-use, very cheap |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | free tier |
| xAI | [console.x.ai](https://console.x.ai) | pay-per-use |
| Soniox | [console.soniox.com](https://console.soniox.com) | pay-per-use |
| Fish Audio | [fish.audio](https://fish.audio) | free dev tier, then per-use |

Then add the key(s) to `~/.env` and switch the default provider:

```bash
echo 'OPENAI_API_KEY=sk-...' >> ~/.env       # any subset works
echo 'ELEVENLABS_API_KEY=...' >> ~/.env

mkdir -p ~/.config/narrate
echo '{"default_provider":"openai","default_voice":"nova"}' > ~/.config/narrate/config.json

brew services restart narrate
narrate "Now I sound much better"
```

`narrate verify` shows you which providers are configured. See [Provider setup detail](#provider-setup-detail) for per-provider voice IDs.

> **Why `~/.env`, not `~/.zshrc`?** Background services (`brew services`, LaunchAgent, systemd) don't run shell init. `~/.env` is the only path that works for both CLI and the server-as-service.

## Providers

| Provider | Type | Auth | Notes |
|---|---|---|---|
| **ElevenLabs** | Cloud | `ELEVENLABS_API_KEY` | High quality, premium voices |
| **OpenAI TTS** | Cloud | `OPENAI_API_KEY` | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| **Google Gemini TTS** | Cloud | `GEMINI_API_KEY` | Multilingual, requires `ffmpeg` for PCM→WAV |
| **xAI Grok TTS** | Cloud | `XAI_API_KEY` | `eve`, `ara`, `rex`, `sal`, `leo` |
| **Soniox TTS** | Cloud | `SONIOX_API_KEY` | `tts-rt-v2`, live voice catalog, default `Adrian` |
| **Fish Audio** | Cloud | `FISH_AUDIO_API_KEY` | Voice models trained from your audio, free dev tier (`s2.1-pro-free`) |
| **[Voicebox](https://github.com/jamiepine/voicebox)** | Local proxy | none | Auto-detects on `:17493` — voice cloning, 7 local engines, 23 languages |
| **System (`say` / `espeak` / SAPI)** | Local | none | Zero-dep fallback, works offline — macOS `say`, Linux `espeak`, Windows SAPI |

Add any subset. narrate uses what you've configured and reports the rest as `⚪ not configured` in `narrate verify`.

## Install

### macOS — Homebrew (recommended, one command)

```bash
brew install felores/narrate/narrate
brew services start narrate          # auto-start at login
```

That's everything. Bun is pulled in as a dependency. After this you can run `narrate "hello"` and you'll hear it.

### Any OS — prebuilt binary (no bun, no git)

The installer downloads a standalone compiled binary from GitHub Releases.
Nothing to install beforehand — no bun, no git:

```bash
curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh -o /tmp/narrate-install.sh
bash /tmp/narrate-install.sh
"$HOME/.local/share/narrate/service/launchd/install.sh" \
  NARRATE_BIN="$HOME/.local/share/narrate/bin/narrate-server-darwin-arm64"   # macOS
```

- **Linux**: replace the service line with the systemd one:
  `NARRATE_BIN=.../narrate-server-linux-x64 "$HOME/.local/share/narrate/service/systemd/install.sh"`
- Binary lives at `~/.local/share/narrate/bin/`, wrappers at `~/.local/bin/{narrate,narrate-server}`.
- If no prebuilt binary exists for your platform, the installer falls back to the source install automatically (`NARRATE_MODE=source` forces it; `NARRATE_MODE=binary` requires it; `NARRATE_VERSION=vX.Y.Z` pins a release).
- The standalone server writes its data + logs to `~/.local/share/narrate` (override with `NARRATE_DIR`).

After any of the installs above, run the interactive setup to register API keys, pick your default voice, integrate your harnesses, and install the auto-start service:

```bash
narrate setup
```

`narrate setup --check` prints the same info without asking anything. All of it is optional — narrate speaks with the system voice the moment the server is up.

### Linux / macOS — curl install (source)

Requires [bun](https://bun.sh) first (`curl -fsSL https://bun.sh/install | bash`).

```bash
curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh -o /tmp/narrate-install.sh
NARRATE_MODE=source bash /tmp/narrate-install.sh
"$HOME/.local/share/narrate/service/launchd/install.sh"   # macOS
"$HOME/.local/share/narrate/service/systemd/install.sh"   # Linux
```

Clones to `~/.local/share/narrate`, writes wrappers to `~/.local/bin/{narrate,narrate-server}`, then installs the auto-start service. Override paths via `NARRATE_DIR`, `BIN_DIR`, `NARRATE_REF`.

### Windows — Scoop or binary

**Scoop** (source, bun as dependency):

```powershell
scoop bucket add narrate https://github.com/felores/scoop-narrate
scoop install narrate
narrate-server                      # start the server
narrate "hello from Windows"
```

Uses Windows SAPI (`System.Speech`) out of the box — no API key needed. Run it at login with the one-command Task Scheduler helper:

```powershell
powershell -ExecutionPolicy Bypass -File "$(scoop prefix narrate)\install-service.ps1"
```

See [`packaging/scoop/`](packaging/scoop/) for the manifest, service setup, and premium-voice config.

**Prebuilt binary** (no scoop, no bun):

```powershell
# download from https://github.com/felores/narrate/releases/latest
# narrate-windows-x64.exe  +  narrate-server-windows-x64.exe
narrate-server-windows-x64.exe    # start the server
narrate-windows-x64.exe "hello from Windows"
```

The server auto-detects the SAPI voices on Windows — no API key needed. Create a
Task Scheduler entry (at logon) to auto-start it.

### Development — git clone

```bash
git clone https://github.com/felores/narrate.git ~/Documents/GitHub/narrate
cd ~/Documents/GitHub/narrate
bun install
bun run src/server.ts &
bun run src/cli.ts verify
```

## Where things live

Once installed, the repo + scripts are at one of these paths depending on the method you used:

| Install method | `$NARRATE_DIR` | Logs |
|---|---|---|
| Homebrew | `$(brew --prefix narrate)/libexec` | `$NARRATE_DIR/logs/narrate.log` |
| prebuilt binary | `~/.local/share/narrate` | `$NARRATE_DIR/logs/narrate.log` |
| curl install | `~/.local/share/narrate` | `$NARRATE_DIR/logs/narrate.log` |
| git clone (dev) | wherever you cloned (e.g. `~/Documents/GitHub/narrate`) | `$NARRATE_DIR/logs/narrate.log` |

Set it once in your shell init so the recipes below work copy-paste:

```bash
# pick the line that matches how you installed
export NARRATE_DIR="$(brew --prefix narrate)/libexec"   # brew
export NARRATE_DIR="$HOME/.local/share/narrate"         # curl
export NARRATE_DIR="$HOME/Documents/GitHub/narrate"     # git clone
```

The running server reports its own location at `GET /health` (`repo_dir`, `logs_dir`) — useful for plugins and tooling that need to self-locate.

## Configure

You can skip this entirely if the [Add an API key](#add-an-api-key) section above covered your needs. This section is for **named voice presets** and **per-provider tweaks**.

### Voice presets (`voices.json`)

Map a friendly name to a `(provider, voice_id)` triple so you can swap providers without touching agent code:

```bash
mkdir -p ~/.config/narrate
cp "$NARRATE_DIR/voices.json.example" ~/.config/narrate/voices.json
narrate --voice researcher "Findings ready"   # uses the preset from voices.json
```

Edit `~/.config/narrate/voices.json` to add your own presets. Full schema in [voices.json — voice presets](#voicesjson--voice-presets).

### Custom defaults (`config.json`)

```bash
cat > ~/.config/narrate/config.json <<EOF
{
  "default_provider": "openai",
  "default_voice": "researcher",
  "port": 8888
}
EOF
brew services restart narrate
```

See [Configuration precedence](#configuration-precedence) for the full resolution chain.

## Quickstart by interface

narrate exposes three interfaces. Pick whichever your tool supports.

### CLI — `narrate "..."`

Best for shells, hooks, scripts, cron, terminal one-offs.

```bash
narrate "Build complete"
narrate --voice engineer "Tests passed"
narrate --provider system --id Samantha "Local fallback"
echo "Long output" | narrate --quiet
narrate verify              # doctor-style health snapshot
narrate verify --test       # also play one sample per configured provider (1 API call each)
```

### HTTP — `POST localhost:8888/notify`

Best for plugin code, webhooks, anything that can fetch.

```bash
curl -X POST http://localhost:8888/notify \
  -H 'Content-Type: application/json' \
  -H 'X-Narrate-Client-Id: my-app' \
  -d '{"message":"Build green","voice":"engineer"}'
```

### MCP — `narrate.speak(...)`

Best for AI agents with native tool calling. The agent itself decides when to speak.

```bash
# Claude Code one-liner
claude mcp add narrate \
  --transport http \
  --url http://localhost:8888/mcp \
  --header "X-Narrate-Client-Id: claude-code"
```

Or via `.mcp.json` in any HTTP MCP client (Cursor, Windsurf, VS Code, Cline):

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

The agent now sees `narrate.speak`, `narrate.list_voices`, and `narrate.list_providers` as tools.

## Use it from each harness

Per-harness recipes live under [`integrations/`](integrations/). Summary:

| Harness | Method | One-command install | Recipe |
|---|---|---|---|
| **Claude Code** | MCP + Stop hook + skill | `bash integrations/claude-code/install.sh` | [`integrations/claude-code/`](integrations/claude-code/) |
| **OpenCode** | Plugin (auto-voice + `narrate_speak` tool) | `integrations/opencode/install.sh` | [`integrations/opencode/`](integrations/opencode/) |
| **Pi (pi-mono)** | Extension (`message_end` auto-voice) + skill | `integrations/pi/install.sh` | [`integrations/pi/`](integrations/pi/) |
| **ChatGPT Codex CLI** | MCP (streamable HTTP) + AGENTS.md | `bash integrations/codex/install.sh` | [`integrations/codex/`](integrations/codex/) |
| **DeepSeek Harness (dsh)** | Cordis plugin (auto-voice + `narrate_speak` tool) | `bash integrations/dsh/install.sh` | [`integrations/dsh/`](integrations/dsh/) |
| **Cursor / Windsurf / Cline** | MCP | manual config snippet | [`integrations/cursor/`](integrations/cursor/) |
| **Shell scripts / cron / CI** | Direct CLI | n/a | [`integrations/shell/`](integrations/shell/) |

The five first-class harnesses (Claude Code, OpenCode, Pi, Codex, DeepSeek Harness) ship a
one-command installer that auto-registers everything (MCP, hooks/extensions, the
`🤖 BOT:` auto-voice convention, and a companion skill). No manual JSON editing.

### OpenCode plugin

[OpenCode](https://opencode.ai) has a built-in plugin system. The narrate plugin
hooks into message streaming to auto-speak responses, plus provides an
on-demand `narrate_speak` tool.

**Install:**

```bash
# 1. Make sure narrate is installed and running
brew install felores/narrate/narrate
brew services start narrate

# 2. Install the plugin
curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/integrations/opencode/install.sh | bash

# 3. Restart OpenCode
```

After installing, every response that ends with a `🤖 BOT:` marker will be
spoken aloud automatically (the companion skill teaches the agent this
convention). Say "narra eso", "read aloud", or "narrate" for on-demand speech.

To set a different voice:

```bash
export NARRATE_OPENCODE_VOICE=researcher   # any preset from voices.json
```

See [`integrations/opencode/`](integrations/opencode/) for details, voice
presets, and troubleshooting.

## Provider setup detail

### ElevenLabs

1. Sign up at [elevenlabs.io](https://elevenlabs.io) → API Keys → create a key.
2. `echo 'ELEVENLABS_API_KEY=your_key' >> ~/.env`
3. Voice IDs: find them at [elevenlabs.io/voice-lab](https://elevenlabs.io/voice-lab) (each voice's URL ends in its ID).
4. Add to `voices.json`:
   ```json
   "rachel": { "provider": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM" }
   ```

### OpenAI TTS

1. Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. `echo 'OPENAI_API_KEY=sk-...' >> ~/.env`
3. Six built-in voices (no IDs to look up): `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`.
4. Optional providerConfig: `{ "model": "tts-1-hd", "speed": 1.2 }` for higher quality / faster speech.
   ```json
   "narrator": {
     "provider": "openai",
     "voice_id": "fable",
     "providerConfig": { "model": "tts-1-hd" }
   }
   ```

### Google Gemini TTS

1. Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. `echo 'GEMINI_API_KEY=...' >> ~/.env`
3. Install `ffmpeg` (Gemini returns raw PCM that we convert to WAV):
   ```bash
   brew install ffmpeg                     # macOS
   sudo apt install ffmpeg                 # Linux
   ```
4. Voice names: `Kore`, `Puck`, `Charon`, `Fenrir`, `Aoede` (and others — see [Gemini docs](https://ai.google.dev/gemini-api/docs/speech-generation)).

### xAI Grok TTS

1. Get a key at [console.x.ai](https://console.x.ai).
2. `echo 'XAI_API_KEY=...' >> ~/.env`
3. Voice IDs: `eve`, `ara`, `rex`, `sal`, `leo`.
4. Optional: `XAI_LANGUAGE=auto` (default), `XAI_VOICE_ID=ara` set as default voice.

### Fish Audio

1. Sign up at [fish.audio](https://fish.audio) → API Keys → create a key.
2. `echo 'FISH_AUDIO_API_KEY=...' >> ~/.env`
3. Voices are **voice models** — create one in [fish.audio/models](https://fish.audio/models) from your own reference audio, or use a public model. The voice id is the model id (e.g. `1f07c1d4cb88455c9d5a03de429ab894`). `narrate verify --test` lists your trained models via `GET /model`.
4. Model header (quality/latency): `s2.1-pro-free` (default, free tier), `s2.1-pro`, `s2-pro`, `s1` — override with `FISH_AUDIO_MODEL` or per-preset:
   ```json
   "me": {
     "provider": "fish",
     "voice_id": "<model-id>",
     "providerConfig": { "model": "s2.1-pro", "latency": "balanced" }
   }
   ```

### Soniox TTS

1. Get a key at [console.soniox.com](https://console.soniox.com).
2. `echo 'SONIOX_API_KEY=...' >> ~/.env`
3. Use the live `tts-rt-v2` catalog; `Adrian` is the default voice.
4. Optional providerConfig: `{ "model": "tts-rt-v2", "language": "en", "speed": 1.1, "reduce_silence": true, "sample_rate": 24000, "bitrate": 128000 }`.

```json
"adrian": { "provider": "soniox", "voice_id": "Adrian" }
```

### Voicebox (local)

See [Voicebox deep dive](#voicebox-deep-dive). TLDR:

```bash
"$NARRATE_DIR/examples/voicebox-install-macos.sh"
open /Applications/Voicebox.app
# wait for Kokoro model download via Settings → Engines (or another engine)
"$NARRATE_DIR/examples/voicebox-create-profile.sh"     # creates "Bella" profile
narrate --provider voicebox --id Bella "Local voice"
```

### System (`say` / `espeak` / SAPI)

Zero config on macOS — `say` is built in. Zero config on Windows — uses
`System.Speech.Synthesis` (SAPI) via PowerShell. On Linux, install `espeak-ng`:

```bash
sudo apt install espeak-ng     # Debian/Ubuntu
sudo dnf install espeak-ng     # Fedora
```

Voice names: any voice your system speaks.

```bash
# macOS
say -v '?'                                          # list installed voices
narrate --provider system --id Samantha "macOS Samantha"

# Windows — use any installed SAPI voice by name
# (manage voices in Settings → Time & Language → Speech)
narrate --provider system --id "Microsoft Zira Desktop" "Windows Zira"
```

## Voicebox deep dive

[Voicebox](https://github.com/jamiepine/voicebox) is a local-first desktop app that runs TTS engines on your GPU. narrate uses it as a provider — your agent calls `narrate.speak`, narrate proxies to voicebox, voicebox plays the audio.

### Install

```bash
"$NARRATE_DIR/examples/voicebox-install-macos.sh"
```

(Or download manually from [voicebox.sh](https://voicebox.sh) and drag to `/Applications`.)

### Engine vs profile (gotcha)

Voicebox has two concepts:

- **Engine** = the underlying TTS model (Kokoro, Qwen, Chatterbox, TADA, LuxTTS). Each engine ships preset voices.
- **Profile** = a usable voice instance, either created from a preset or cloned from audio.

`/speak` only accepts profile names — preset voices have to be **promoted to profiles** first. Do it via UI, or with the helper:

```bash
"$NARRATE_DIR/examples/voicebox-create-profile.sh"                          # creates "Bella" from kokoro/af_bella
"$NARRATE_DIR/examples/voicebox-create-profile.sh" Adam kokoro am_adam en
"$NARRATE_DIR/examples/voicebox-create-profile.sh" Dora kokoro ef_dora es
"$NARRATE_DIR/examples/voicebox-create-profile.sh" George kokoro bm_george en
```

### Multi-language behavior

Kokoro voices are flexible: the same profile can speak any of Kokoro's 8 languages depending on what `language` you pass to `/speak`. Voices are style vectors at the model level — they describe a timbre, not a language. Pointing them at a different language is supported.

- A `kokoro/ef_dora`-backed profile created with `language: "es"` speaks natural Spanish.
- The same Dora profile asked to speak `language: "en"` speaks English with a Spanish accent (her trained timbre + English phonetics).
- A `kokoro/af_bella`-backed profile (en-trained) asked to speak `language: "es"` speaks Spanish with Bella's American voice timbre but proper Spanish phonetics — this is **the way to make Bella speak Spanish naturally**.
- narrate's voicebox provider resolves `profile.language` automatically (cached 60s) as the default. Override per-call with `--language es` (CLI), `providerConfig.language: "es"` (POST body or voices.json), or pin a preset:

```json
"bella_es": {
  "provider": "voicebox",
  "voice_id": "Bella",
  "providerConfig": { "language": "es" }
}
```

### Available Kokoro presets at a glance

50 presets total. Some highlights:

| Preset | Name | Language / accent |
|---|---|---|
| `af_bella`, `af_nova`, `af_sky`, `af_nicole` | various | en-female (US) |
| `am_adam`, `am_onyx`, `am_echo` | Adam, Onyx, Echo | en-male (US) |
| `bf_emma`, `bf_alice` | Emma, Alice | en-female (UK) |
| `bm_george`, `bm_daniel` | George, Daniel | en-male (UK) |
| `ef_dora`, `em_alex` | Dora, Alex | es female / male |
| `ff_siwis` | Siwis | fr female |
| `hf_alpha`, `hm_omega` | various | hi female / male |
| `jf_alpha`, `jm_kumo` | various | ja female / male |
| `zf_xiaoxiao`, others | various | zh female |

Full list: `curl http://127.0.0.1:17493/profiles/presets/kokoro`.

## voices.json — voice presets

Map a friendly name to a `(provider, voice_id, options)` triple so you can swap providers without touching agent code.

### v2 schema (current)

```json
{
  "default_voice": "fred",
  "default_rate": 175,
  "voices": {
    "fred":      { "provider": "elevenlabs", "voice_id": "s3TPKV1kjDlVtZbl4Ksh" },
    "researcher":{ "provider": "openai",     "voice_id": "nova"     },
    "engineer":  { "provider": "openai",     "voice_id": "alloy"    },
    "narrator":  { "provider": "openai",     "voice_id": "fable",
                   "providerConfig": { "model": "tts-1-hd" } },
    "ara":       { "provider": "xai",        "voice_id": "ara"      },
    "adrian":    { "provider": "soniox",     "voice_id": "Adrian"   },
    "kore":      { "provider": "gemini",     "voice_id": "Kore"     },
    "me":        { "provider": "fish",       "voice_id": "<model-id>" },
    "bella":     { "provider": "voicebox",   "voice_id": "Bella"    },
    "dora":      { "provider": "voicebox",   "voice_id": "Dora"     },
    "samantha":  { "provider": "system",     "voice_id": "Samantha" }
  }
}
```

Use it with the preset name: `narrate --voice dora "Hola"`.

### v1 backward-compat

If your `voices.json` only has `voice_name` per entry (no `provider` field), narrate auto-assumes `provider: "system"` (the v1 schema was for macOS `say`). You'll see a one-line warning at startup.

### Per-preset providerConfig

Each provider accepts extra options under `providerConfig`:

| Provider | Useful keys |
|---|---|
| ElevenLabs | `model_id`, `voice_settings: {stability, similarity_boost, style, use_speaker_boost}` |
| OpenAI | `model` (`tts-1` / `tts-1-hd`), `speed` (0.25–4.0) |
| Gemini | `model` |
| xAI | `language`, `sample_rate`, `bit_rate`, `codec` |
| Soniox | `model` (`tts-rt-v2`), `language`, `speed` (0.7-1.3), `reduce_silence`, `sample_rate`, `bitrate` (bits/s) |
| Fish Audio | `model` (`s2.1-pro-free`, `s2.1-pro`, `s2-pro`, `s1`), `latency` (`normal`/`balanced`/`low`) |
| Voicebox | `language`, `instruct` (Qwen CustomVoice natural-language delivery), `personality` (boolean), `return_audio` (use `/generate` instead of `/speak`) |
| System | `rate` |

## CLI reference

```text
narrate [options] "text to speak"
narrate verify [--test]
echo "text" | narrate [options]

Options:
  -v, --voice NAME      Voice preset from voices.json (e.g. fred, researcher)
  -i, --id ID           Raw provider voice id (bypasses preset registry)
  -p, --provider NAME   elevenlabs | openai | gemini | xai | soniox | fish | voicebox | system
  -l, --language LANG   Force generation language (e.g. es, en, ja, fr).
                        Useful with cross-language voices: a Kokoro Bella
                        (en-trained) speaks proper Spanish phonetics with
                        --language es, since Kokoro is multilingual at the
                        model level.
  --instruct TEXT       Natural-language delivery hint (Qwen CustomVoice
                        only). E.g. "warm conversational tone",
                        "broadcast news quality", "speak slowly with
                        emphasis". Other engines ignore this flag.
  -u, --url URL         Server URL (default http://localhost:8888)
  -q, --quiet           Suppress output
  -h, --help            Show help

Subcommands:
  verify                Health snapshot — server status, provider matrix, voices
  verify --test         Also play one sample per configured provider (1 API call each)
  setup                 Interactive setup — API keys, default voice, harness integrations, service
  setup --check         Non-interactive setup report (same info, asks nothing)

Env:
  NARRATE_URL           Override default server URL
  NARRATE_VOICE         Default preset (fallback for omitted --voice)
```

`--language` and `--instruct` forward as `providerConfig.{language,instruct}` and override both preset providerConfig and the voicebox provider's auto-resolved profile defaults.

```bash
# Bella is en-trained, but Kokoro can aim her at Spanish phonetics:
narrate --provider voicebox --id Bella --language es "Hola, soy Bella en español"

# Qwen Ryan with delivery direction:
narrate --provider voicebox --id Ryan --instruct "broadcast news quality" "Headlines tonight"
```

## HTTP API reference

### `POST /notify`

Speak text. Returns immediately; audio plays asynchronously.

**Body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | yes | Up to 5000 chars, no control characters |
| `voice` | string | no | Preset name from voices.json |
| `voice_id` | string | no | Raw provider voice id (bypasses presets) |
| `voice_name` | string | no | Legacy alias for `voice_id` |
| `provider` | string | no | Override default provider |
| `voice_enabled` | boolean | no (default `true`) | If `false`, returns `{status: "ok", message: "voice_enabled=false; nothing to do"}` |
| `providerConfig` | object | no | Per-provider passthrough config (see provider table above) |

**Headers:**

| Header | Purpose |
|---|---|
| `X-Narrate-Client-Id` | Client identifier (logged + future per-client routing) |

**Response (200):**

```json
{ "status": "success", "provider": "openai", "voice": "alloy", "format": "mp3", "delegated": false }
```

`delegated: true` means the provider played the audio itself (voicebox, system) and narrate skipped local playback.

### `POST /pai`

Legacy alias for `/notify` (PAI Voice compatibility).

### `GET /health`

Server + provider snapshot.

```json
{
  "status": "healthy",
  "port": 8888,
  "default_provider": "xai",
  "default_voice": "ara",
  "voices_path": "/Users/you/.config/narrate/voices.json",
  "voices": ["fred", "researcher", "engineer", ...],
  "providers": {
    "elevenlabs": { "configured": true },
    "openai": { "configured": true },
    "gemini": { "configured": true },
    "xai": { "configured": true },
    "fish": { "configured": true, "credits": "128,000 / 500,000 chars (free)" },
    "voicebox": { "configured": true },
    "system": { "configured": true }
  }
}
```

### `GET /voices`

Full voices.json contents.

```json
{
  "default_voice": "fred",
  "default_rate": 175,
  "voices": { "fred": { ... }, "researcher": { ... } }
}
```

### `POST /mcp`

MCP Streamable HTTP endpoint. JSON-RPC 2.0. See [MCP tools reference](#mcp-tools-reference).

## MCP tools reference

Three tools available via the MCP server at `/mcp`:

### `speak`

```typescript
narrate.speak({
  text: string,                  // required, max 5000
  voice?: string,                // preset name from voices.json
  voice_id?: string,             // raw provider voice id
  provider?: "elevenlabs" | "openai" | "gemini" | "xai" | "soniox" | "fish" | "voicebox" | "system"
}) -> "Spoken via <provider> (voice=<voice>, format=<fmt>, delegated playback)"
```

### `list_voices`

```typescript
narrate.list_voices() -> Array<{ name, provider, voice_id, description }>
```

Returns all voice presets from voices.json.

### `list_providers`

```typescript
narrate.list_providers() -> Array<{ name, label, configured, reason? }>
```

Returns the provider health matrix — same data as `GET /health`'s `providers` field.

### Discover via JSON-RPC

```bash
# tools/list
curl -X POST http://localhost:8888/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# tools/call
curl -X POST http://localhost:8888/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"speak","arguments":{"text":"Hello","voice":"researcher"}}}'
```

## Configuration precedence

Higher rows win. narrate reads each layer at startup; mid-flight changes need a server restart.

| # | Layer | Used for |
|---|---|---|
| 1 | CLI flags / POST body / MCP tool args | per-call provider, voice, providerConfig |
| 2 | `~/.config/narrate/config.json` | default_provider, default_voice, port, voices_path |
| 3 | `NARRATE_*` env vars | `NARRATE_PORT`, `NARRATE_PROVIDER`, `NARRATE_VOICE`, `NARRATE_VOICES_PATH`, `NARRATE_URL` (CLI only) |
| 4 | `~/.claude/settings.json` (legacy compat) | `TTS_PROVIDER` and `DA_VOICE_ID`/`NARRATE_VOICE_ID` are read for backward-compat |
| 5 | `~/.env` | API keys (`ELEVENLABS_API_KEY`, etc.) auto-loaded if present |
| 6 | Built-in defaults | `port: 8888`, `default_provider: "system"`, `default_rate: 175` |

API keys come from `process.env` (loaded from your shell or auto-loaded from `~/.env`). Never put them in `config.json` or `voices.json`.

## Run as a service

### macOS (launchd)

```bash
brew services start narrate              # if installed via Homebrew
"$NARRATE_DIR/service/launchd/install.sh" # if installed via curl/git
NARRATE_BIN="$NARRATE_DIR/bin/narrate-server-darwin-arm64" \
  "$NARRATE_DIR/service/launchd/install.sh"   # if installed as prebuilt binary
```

The installer:
1. Renders `com.narrate.server.plist` from a template (`$HOME` and `$NARRATE_DIR` substituted at install time, with a static `PATH` of `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`, plus the bun dir in source mode).
2. Drops it at `~/Library/LaunchAgents/`.
3. Loads it with `launchctl`.
4. Verifies it's running.

Without `NARRATE_BIN` it runs `bun run src/server.ts`; with `NARRATE_BIN` it runs the compiled binary directly (no bun needed). The binary-mode service reads data/log paths from `NARRATE_DIR` (set via `NARRATE_DIR=... install.sh` or the server's `NARRATE_DIR` env).

To remove:

```bash
brew services stop narrate
"$NARRATE_DIR/service/launchd/uninstall.sh"
```

### Linux (systemd)

```bash
"$NARRATE_DIR/service/systemd/install.sh"
NARRATE_BIN="$NARRATE_DIR/bin/narrate-server-linux-x64" \
  "$NARRATE_DIR/service/systemd/install.sh"   # binary mode
```

Installs as a user service (`~/.config/systemd/user/narrate.service`) and runs `systemctl --user enable --now`.

To remove:

```bash
"$NARRATE_DIR/service/systemd/uninstall.sh"
```

## Logging and observability

### Live logs

| File | What |
|---|---|
| `logs/narrate.log` | All requests, with timestamp, provider, voice, latency, client id |
| `logs/narrate-error.log` | Errors |
| `logs/launchd-stdout.log` | Pre-init startup output (small, only grows on crashes) |
| `logs/launchd-stderr.log` | Same for stderr |

```bash
# follow live request log (resolve the path via /health if you don't know it)
LOGS_DIR="$(curl -s localhost:8888/health | python3 -c 'import sys,json;print(json.load(sys.stdin)["logs_dir"])')"
tail -f "$LOGS_DIR/narrate.log"

# or if you set $NARRATE_DIR per "Where things live":
tail -f "$NARRATE_DIR/logs/narrate.log"

# example line
2026-04-27T23:44:36.733Z [/notify] → provider=voicebox voice=Dora bytes=42 from=localhost client=- ua=Bun/1.2.10
2026-04-27T23:44:36.755Z [/notify] ✅ 25ms provider=voicebox voice=Dora format=mp3 delegated=true
```

### Log rotation

In-process rotation. Defaults: 10 MiB per file, keep last 5 (`narrate.log` → `narrate.log.1` → ... → `narrate.log.5`).

```bash
# tune via env (read once at server start)
NARRATE_LOG_MAX_BYTES=20971520 NARRATE_LOG_KEEP=10 narrate-server

# disable entirely (use raw stdout/stderr — useful for `bun run` dev mode)
NARRATE_LOG_DISABLED=1 narrate-server
```

### `narrate verify` doctor

```bash
narrate verify
narrate verify --test    # also play 1 sample per configured provider
```

Prints server health, default provider/voice, voices file path, preset list, and per-provider configured/reason status.

## Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                      narrate (Bun process)                 │
│                                                            │
│   HTTP server (port 8888)                                  │
│   ├─ POST /notify    POST /pai (legacy)                    │
│   ├─ GET  /health    GET  /voices                          │
│   └─ POST /mcp       (MCP Streamable HTTP)                 │
│                                                            │
│            │                                               │
│            ▼                                               │
│   handleNotify()                                           │
│            │                                               │
│            ▼                                               │
│   Provider registry  (ALL_PROVIDERS)                       │
│   ┌──────────────┬──────────────┬────────────┐             │
│   │ ElevenLabs   │ OpenAI       │ Gemini     │  cloud      │
│   ├──────────────┼──────────────┼────────────┤             │
│   │ xAI          │ Soniox       │ Fish       │  cloud      │
│   ├──────────────┼──────────────┼────────────┤             │
│   │ Voicebox     │ System       │            │  local      │
│   └──────────────┴──────────────┴────────────┘             │
│            │                                               │
│            ▼                                               │
│   ArrayBuffer  (or delegated=true)                         │
│            │                                               │
│            ▼                                               │
│   playback.ts → afplay (macOS) / ffplay (Linux)            │
└────────────────────────────────────────────────────────────┘
```

Each `Provider` (in `src/providers/`) implements a small interface:

```typescript
interface Provider {
  name: string;
  label: string;
  health(): Promise<ProviderHealth>;
  generateSpeech(text: string, voice: string, opts?: ProviderOptions): Promise<AudioResult>;
  listVoices?(): Promise<VoiceInfo[]>;
}
```

Provider implementations talk to their respective APIs (or local services like voicebox `:17493`). The result is either an `ArrayBuffer` (cloud — narrate plays it locally via `playback.ts`) or `delegated: true` (voicebox, system — they handled playback themselves).

The MCP server is a thin wrapper: it registers `narrate.speak`, `narrate.list_voices`, `narrate.list_providers` as tools, and the `speak` tool calls the same `handleNotify` function as the HTTP handler. One code path, three interfaces.

## Project layout

```text
narrate/
├── src/
│   ├── providers/
│   │   ├── base.ts              # Provider interface, types
│   │   ├── elevenlabs.ts
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   ├── xai.ts
│   │   ├── soniox.ts
│   │   ├── fish.ts
│   │   ├── voicebox.ts
│   │   ├── system.ts
│   │   └── index.ts             # registry
│   ├── voices.ts                # voices.json loader (v1 → v2 compat)
│   ├── config.ts                # XDG config + env vars + ~/.claude/settings.json shim
│   ├── playback.ts              # afplay / ffplay
│   ├── logger.ts                # rotating file logger
│   ├── mcp.ts                   # MCP server (Streamable HTTP)
│   ├── server.ts                # HTTP server
│   └── cli.ts                   # narrate CLI
├── integrations/                # one folder per harness with real refs
│   ├── claude-code/
│   ├── opencode/
│   ├── pi/
│   ├── codex/
│   ├── cursor/
│   └── shell/
├── service/
│   ├── launchd/                 # macOS install + plist template
│   └── systemd/                 # Linux install + unit template
├── examples/
│   ├── config.example.json
│   ├── voicebox-install-macos.sh
│   └── voicebox-create-profile.sh
├── voices.json.example
├── install.sh                   # curl install entry point
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .github/workflows/           # CI (TBD)
```

## narrate vs voicebox

[Voicebox](https://github.com/jamiepine/voicebox) is a full local-first TTS studio with on-device inference, voice cloning, dictation, MCP server, and 7 local engines. It's a desktop app.

`narrate` is a thin gateway. **They compose** — voicebox is one of narrate's providers.

| | narrate | voicebox |
|---|---|---|
| Form factor | CLI + HTTP server + MCP | Desktop app (Tauri) |
| Engines | Cloud + voicebox proxy + system | 7 local engines (MLX/CUDA) |
| Voice cloning | No (uses provider voices) | Yes (zero-shot) |
| Dictation (STT) | No | Yes (Whisper hotkey) |
| MCP server | Yes (`/mcp`) | Yes (`/mcp` on :17493) |
| Footprint | < 1 MB + bun | GB of models |
| Best for | Drop into any agent or shell | Privacy-first studio workflows |

Use **narrate** when you want one command that any harness or shell can call, mixing cloud and local providers. Use **voicebox** when you want fully local, GPU-accelerated voice. Use **both** when you want voicebox's quality plus narrate's harness-agnostic gateway.

## Roadmap

| Status | Item |
|---|---|
| ✅ v0.1.0 | 6 providers, CLI, HTTP server, voices.json v2, launchd + systemd |
| ✅ v0.2.0 | Per-request observability, `narrate verify`, real OpenCode + Pi integrations, voicebox install helper |
| ✅ v0.3.0 | MCP server (`/mcp`), curl install script, Homebrew tap, voicebox profile helper, multi-language fix |
| ✅ v0.3.1 | In-process log rotation |
| ✅ v0.3.2 | Voicebox `instruct` passthrough (Qwen natural-language delivery) |
| ✅ v0.3.3 | CLI `--language` and `--instruct` flags |
| ✅ v0.3.4 | SwiftBar / xbar menubar plugin |
| ✅ v0.3.5 | Portability fixes — `/health` exposes `repo_dir`/`logs_dir`, plugin auto-locates, SwiftBar Login Items autostart, plist drops `$PATH` snapshot |
| ✅ v0.3.6 | First-run UX: default provider is `system` so fresh installs work without API keys. README rewritten for non-technical users with a 3-command quickstart at the top. |
| ✅ v0.4.0 | Windows support (SAPI system provider + Scoop bucket). Canonical `narrate` skill (guided setup + voice previews). One-command installers for Claude Code + Codex. Auto-voice always-on injection fix. Pi extension. Spanish README. |
| ✅ v0.5.0 | Pre-built single-binary releases (no bun) + GitHub Actions release pipeline. Interactive `narrate setup` wizard. Fish Audio provider (trained voice models, free dev tier). Binary-mode launchd/systemd services. Windows Task Scheduler helper. |
| Planned v0.5 | More providers (Cartesia, Hume EVI, Azure TTS) |
| Planned v0.6 | `--direct` CLI mode (skip server, call providers directly) |
| Planned v0.7 | Streaming TTS over WebSocket |
| Planned v0.8 | Auth tokens for `/notify` and `/mcp` (currently localhost-only) |
| Planned v1.0 | Test suite, GitHub Actions CI, npm publish |

## Troubleshooting

### `narrate verify` says provider X is `⚪ not configured`

- Cloud provider: API key env var not set. `cat ~/.env | grep <PROVIDER>_API_KEY`. Restart the server after adding (`brew services restart narrate` or relaunch LaunchAgent).
- Voicebox: app not running, or running on a non-default port. Open `/Applications/Voicebox.app`. If on a different port, set `VOICEBOX_URL=http://127.0.0.1:NNNNN`.
- System on Linux: install `espeak-ng`.

### Server logs show `[xai] 404 Voice 'Samantha' not found`

The default provider is whatever `~/.claude/settings.json` says (or `default_provider` in `config.json`). When you pass `--id Samantha` without `--provider system`, narrate uses the default provider — which doesn't know about Samantha. Either:

- `narrate --provider system --id Samantha "..."` (explicit provider)
- `narrate --voice samantha "..."` (preset that bundles provider + voice id)

### Voicebox profile speaks the wrong language

Solved in v0.3.0 (`aede995`): voicebox's `/speak` doesn't auto-pull `language` from the profile, it defaults to `"en"`. narrate now resolves and passes profile.language automatically. If still wrong, force it via `providerConfig.language`:

```json
"dora_es": {
  "provider": "voicebox", "voice_id": "Dora",
  "providerConfig": { "language": "es" }
}
```

### Two `narrate` binaries on PATH

If you both `brew install narrate` AND ran the curl install, you have `/opt/homebrew/bin/narrate` and `~/.local/bin/narrate`. Both work; PATH order decides which wins. Pick one and remove the other.

### Logs are massive

Tune rotation:

```bash
# in your shell init or LaunchAgent EnvironmentVariables
NARRATE_LOG_MAX_BYTES=2097152    # 2 MiB
NARRATE_LOG_KEEP=3
```

Or disable entirely:

```bash
NARRATE_LOG_DISABLED=1
```

### "Stateless transport cannot be reused" on `/mcp`

Already fixed in v0.3.0 (`a5aaa14`). If you see this, your local install is pre-fix — pull `main` and reload.

## Contributing

```bash
git clone https://github.com/felores/narrate.git
cd narrate
bun install
bun run --watch src/server.ts                      # hot-reload dev mode
./node_modules/.bin/tsc --noEmit                   # typecheck
```

To add a new TTS provider:

1. Create `src/providers/<name>.ts` implementing the `Provider` interface from `src/providers/base.ts`.
2. Register it in `src/providers/index.ts`.
3. Add an integration test in `narrate verify --test` (the `sampleVoiceFor` map).
4. Document it in this README's [Provider setup detail](#provider-setup-detail).

PRs welcome. Issues: https://github.com/felores/narrate/issues

## License

MIT — see [LICENSE](LICENSE).
