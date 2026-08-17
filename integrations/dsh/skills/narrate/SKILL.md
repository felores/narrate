---
name: narrate
description: >-
  Use narrate, the local TTS gateway, to speak text aloud in DeepSeek Harness
  (dsh). Use this skill whenever the user asks to narrate, read something
  aloud, or speak text ("narra eso", "read that aloud", "dilo en voz alta",
  "speak this"), or when voice output is missing, silent, or misconfigured.
---

# narrate (dsh)

`narrate` is a local TTS gateway: one server (default `http://localhost:8888`)
that speaks text through seven providers behind one uniform interface. The
`narrate-dsh` plugin connects this harness to it.

## On-demand narration

Use the `narrate_speak` tool (the plugin registers it automatically):

1. Keep the narrated text concise — under ~100 words / 500 chars.
2. Summarize long content before speaking it.
3. Respond normally in text **and** speak it.

## Auto-voice (the `🤖 BOT:` convention)

The plugin auto-speaks a marker line at the end of each response:

```text
🤖 BOT: Build complete, two tests passing.
```

Rules: max 15 words, same language as the user's first message, on its own
line at the very end, starting with the exact marker `🤖 BOT:`.

The convention is injected into the system prompt by the plugin, so it applies
every turn — you do not need to load this skill for auto-voice to fire.

## When something's broken

No audio, wrong voice, server won't start, provider says "not configured":

- Check the server is running: `narrate verify` (or `curl -s localhost:8888/health`).
- API keys live in `~/.env` (NOT `~/.zshrc`).
- Full troubleshooting: `references/troubleshooting.md` in the narrate repo
  (`~/Documents/GitHub/narrate/skills/narrate/references/`), or the narrate
  README: https://github.com/felores/narrate#readme
