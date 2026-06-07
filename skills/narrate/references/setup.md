# Setup — config file locations and exact shapes

## Where things live

| What | Path | Why here |
|---|---|---|
| API keys | `~/.env` | Background services (brew/launchd/systemd/Task Scheduler) don't read `~/.zshrc`. `~/.env` is the only path that works for both CLI and the service. |
| Defaults | `~/.config/narrate/config.json` | Default provider/voice/port. |
| Voice presets | `~/.config/narrate/voices.json` | Friendly names → `{provider, voice_id}`. |

On Windows the home dir is `%USERPROFILE%`, so `%USERPROFILE%\.env` and
`%USERPROFILE%\.config\narrate\`.

## Step 1: API keys → `~/.env`

Append only the providers the user chose (any subset):

```bash
echo 'ELEVENLABS_API_KEY=...' >> ~/.env
echo 'OPENAI_API_KEY=sk-...'  >> ~/.env
echo 'GEMINI_API_KEY=...'     >> ~/.env
echo 'XAI_API_KEY=...'        >> ~/.env
```

After editing `~/.env`, restart the server so it picks them up
(`brew services restart narrate`, or restart `narrate-server`).

## Step 2: defaults → `config.json`

```bash
mkdir -p ~/.config/narrate
```

```json
{
  "port": 8888,
  "default_provider": "openai",
  "default_voice": "researcher",
  "default_rate": 175
}
```

`default_provider` is what `narrate "text"` uses when no `--provider`/`--voice`
is given. Keep it `system` if the user wants zero-key default; point it at a
cloud provider once a key is set.

## Step 3: voice presets → `voices.json` (v2 schema)

Presets let the user say `narrate --voice researcher` without remembering which
provider/voice_id that is. This is narrate's best feature — set up 2-4 named
voices the user actually wants.

```json
{
  "default_voice": "researcher",
  "default_rate": 175,
  "voices": {
    "researcher": { "provider": "openai",     "voice_id": "nova" },
    "narrator":   { "provider": "openai",     "voice_id": "fable",
                    "providerConfig": { "model": "gpt-4o-mini-tts" } },
    "premium":    { "provider": "elevenlabs", "voice_id": "<voice_id from library>" },
    "grok":       { "provider": "xai",        "voice_id": "ara" },
    "offline":    { "provider": "system",     "voice_id": "Samantha" }
  }
}
```

Each preset needs `provider` + `voice_id`. Optional per-preset:
`providerConfig` (e.g. `{"model": "..."}` for OpenAI/Gemini/ElevenLabs,
`{"language": "es"}` for voicebox), `rate_wpm`, `rate_multiplier`,
`description`, `type`.

Use a preset: `narrate --voice researcher "findings ready"`.

> v1 compat: an older flat `voices.json` without a `provider` field is assumed
> to be `system`. Don't rewrite a user's v1 file unless they ask — it still works.

## Step 4: verify

```bash
narrate verify           # health matrix, no API calls
narrate verify --test    # smoke-test each configured provider (~1 API call each)
narrate --voice researcher "setup complete"
```

## Common gotcha: keys in shell but not in `~/.env`

If `detect.sh` shows a key "from environment" but the server's `/health` marks
that provider `⚪ not configured`, the key is in the user's shell but **not in
`~/.env`** — so the background server never sees it. Fix: add it to `~/.env` and
restart the server.
