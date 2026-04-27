# narrate + Claude Code

Three integration paths, in order of recommendation:

1. **MCP server** (recommended for v0.3+) — one command, no code, native tool integration.
2. **Stop hook** — TS hook in `~/.claude/hooks/` that extracts a marker line and shells out to `narrate`.
3. **Slash command / shell alias** — for ad-hoc narration.

## Path 1: MCP (recommended)

```bash
claude mcp add narrate \
  --transport http \
  --url http://localhost:8888/mcp \
  --header "X-Narrate-Client-Id: claude-code"
```

Claude Code now has three tools:

- `mcp__narrate__speak({ text, voice?, provider?, voice_id? })`
- `mcp__narrate__list_voices()`
- `mcp__narrate__list_providers()`

Tell the agent in your CLAUDE.md or a prompt: "When you complete a task, call `mcp__narrate__speak` with a one-line summary."

Coexists with [voicebox MCP](https://github.com/jamiepine/voicebox) — they listen on different ports (8888 vs 17493) and use different `X-*-Client-Id` headers.

## Path 2: Stop hook (legacy / when you want a marker convention)

## Pattern

Claude Code hooks are TypeScript files in `~/.claude/hooks/`. The most useful
hook for voice output is `Stop` (fires when the assistant turn ends).

The hook reads the assistant's final response, optionally extracts a "speak this"
marker (the `🤖 BOT:` convention is one common choice), and shells out to
`narrate`.

## Quick install

1. Make sure the narrate server is running:
   ```bash
   bun run /path/to/narrate/src/server.ts &
   ```
2. Copy the example hook into your hooks dir:
   ```bash
   cp stop-hook.example.ts ~/.claude/hooks/narrate-stop-hook.ts
   ```
3. Reference it in your `~/.claude/settings.json` under `hooks.Stop`.

## Marker convention

The example uses a simple convention: the assistant ends each response with a
single line in the format

```text
🤖 BOT: short voice-friendly summary
```

The hook extracts that line and narrates it. Anything before that line is
silent. This keeps voice output short and skippable while letting the full
response stay in the transcript.

You can change the marker (e.g., `🔊` or `[VOICE]`) by editing the regex in
`stop-hook.example.ts`.

## Voice selection

```bash
# Default voice from voices.json
narrate "deploy complete"

# Pick a preset
narrate --voice researcher "findings ready"

# Override with a raw provider id
narrate --provider system --id Samantha "fallback"
```

Configure voices.json once at `~/.config/narrate/voices.json` and reference
preset names from your hooks — keeps the hook code stable when you swap
providers.

## Settings.json snippet

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $HOME/.claude/hooks/narrate-stop-hook.ts"
          }
        ]
      }
    ]
  }
}
```
