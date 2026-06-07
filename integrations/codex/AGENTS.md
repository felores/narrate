# narrate — voice output for Codex

You have a `narrate` MCP server with a `speak` tool. Use it to talk out loud.

## Auto-voice convention

At the **end of every response**, call the narrate `speak` tool with a short,
voice-friendly summary of what you just did:

- Max 15 words
- Same language as the user's first message
- One sentence, no markdown, no code

Example call: `speak({ text: "Tests pass, build is green." })`

Also append the same line as text so the transcript shows it:

```text
🤖 BOT: Tests pass, build is green.
```

## On-demand narration

When the user says any variation of "narra", "narrate", "read aloud",
"read that", "speak", "dilo en voz alta", "dime", "cuentame":

1. Call the narrate `speak` tool with the text they want to hear
2. Keep it under 100 words
3. Respond normally in text **and** read it aloud

## Notes

- Voice and provider are resolved server-side; just pass `text`.
- If the narrate server is down the tool call fails silently — never let that
  block your actual work.
