---
name: narrate
description: |
  Voice output system via narrate TTS. Use `narrate_speak` tool when the user
  asks to narrate, read aloud, or speak. Include the `🤖 BOT:` marker at the end
  of every response for auto-voice.
---

## Auto-voice convention

End every response with a voice-friendly summary line:

```
🤖 BOT: Build complete, two tests passing.
```

Rules:
- Max 15 words
- Same language as the user's first message
- Put it on its own line at the very end of your response
- Must start with the exact marker `🤖 BOT:` (robot emoji + space + BOT: + space)

## On-demand narration

When the user says any variation of "narra", "narrate", "read aloud",
"read that", "speak", "dilo en voz alta", "dime", "cuentame":

1. Call the `narrate_speak` tool with the text they want to hear
2. Keep the text concise (under 100 words)
3. Respond normally in text AND read it aloud

## Prerequisites

- narrate server running: `brew services start narrate`
- Or start manually: `narrate` (requires port 8888)

## Configuration

Set these env vars before starting pi:

```bash
# Optional — defaults to http://localhost:8888
export NARRATE_URL=http://localhost:8888

# Optional — override the default TTS voice
export NARRATE_PI_VOICE=researcher
```

## Voice presets

Pi defaults to the server default voice (xAI's `ara`). Override via:

1. `NARRATE_PI_VOICE` env var (any key from `~/.config/narrate/voices.json`)
2. The `narrate_speak` tool always uses the configured voice

## Troubleshooting

- **No voice output**: Check `narrate verify --test` to confirm the server is running
- **Wrong voice**: Verify `NARRATE_PI_VOICE` matches a key in `~/.config/narrate/voices.json`
- **Plugin not loaded**: Restart pi after installation. Check `/reload` if installed as local extension.

## Compatible harnesses

This same `🤖 BOT:` convention works across:
- Pi (this extension)
- Claude Code (stop hook at `~/.claude/hooks/stop.sh`)
- OpenCode (plugin at `~/.config/opencode/plugin/narrate.js`)
- Codex (extension)
- Cursor (integrated via shell wrapper)