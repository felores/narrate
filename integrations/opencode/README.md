# narrate + OpenCode

[OpenCode](https://opencode.ai) plugin that gives your AI agent a voice:
auto-narrates "🤖 BOT:" markers, plus an on-demand `narrate_speak` tool.

## Quick install

```bash
# From the narrate repo:
bash integrations/opencode/install.sh

# Or one-liner (if narrate is installed):
bash <(curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/integrations/opencode/install.sh)
```

Then **restart OpenCode**.

## What you get

### Auto-voice

After every response, the agent outputs a `🤖 BOT:` marker. The plugin detects
it and speaks it aloud via narrate.

```
You:  "deploy the api"
Agent: "...done, all tests pass.
🤖 BOT: API deployed, green build."
      ← you hear this spoken
```

### On-demand narration

Say "narra eso", "read that aloud", "dilo en voz alta" — the agent calls
`narrate_speak` and reads the text aloud.

## Requirements

| Thing | How |
|-------|-----|
| narrate server | `brew install felores/narrate/narrate && brew services start narrate` |
| OpenCode | any recent version |
| Internet (for cloud TTS) | xAI, ElevenLabs, etc. — or use `system` for offline `say` |

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `NARRATE_URL` | `http://localhost:8888` | narrate server address |
| `NARRATE_OPENCODE_VOICE` | *(server default)* | Voice preset from voices.json |

### Voice presets

Narrate defaults to **xAI/ara** if no voice is set. To pick a different one:

1. Add a preset to `~/.config/narrate/voices.json`:
   ```json
   { "voices": { "opencode": { "provider": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM" } } }
   ```
2. Set the env var:
   ```bash
   export NARRATE_OPENCODE_VOICE=opencode
   ```

## How it works

```
OpenCode session
  │
  ├─ message.part.updated ──────► plugin/narrate.js
  │   (streaming text part)          │
  │                                  ├─ extract 🤖 BOT: marker
  │                                  └─ POST /notify → narrate → speaks
  │
  ├─ narrate_speak tool ──────────► plugin/narrate.js
  │   (user: "read this")             │
  │                                   └─ POST /notify → narrate → speaks
  │
  └─ skills/narrate/SKILL.md ────► system prompt
      (teaches the AI about           │
       the convention + tool)         └─ agent outputs 🤖 BOT: marker
```

## Files installed

| File | Purpose |
|------|---------|
| `~/.config/opencode/plugin/narrate.js` | Plugin: event hooks + narrate_speak tool |
| `~/.config/opencode/skills/narrate/SKILL.md` | Companion skill: teaches the AI |
| `~/.config/opencode/package.json` | Dependency: @opencode-ai/plugin |

## Uninstall

```bash
rm -f ~/.config/opencode/plugin/narrate.js
rm -rf ~/.config/opencode/skills/narrate
# Optionally remove @opencode-ai/plugin from ~/.config/opencode/package.json
```

## References

- [OpenCode plugins docs](https://opencode.ai/docs/plugins/)
- [narrate README](https://github.com/felores/narrate)
