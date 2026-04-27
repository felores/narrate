# narrate + Claude Code

Wire `narrate` into Claude Code's hook system so the agent speaks turn results
out loud.

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
