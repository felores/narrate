---
name: narrate
description: |
  Voice output system via narrate TTS. Use `narrate_speak` tool when the user
  asks to narrate, read aloud, or speak. Include the `BOT:` marker at the end
  of every response for auto-voice.
---

## Auto-voice convention

End every response with a voice-friendly summary line like this:

`🤖 BOT: Build complete, two tests passing.`

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
