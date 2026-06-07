# narrate + Claude Code

## Install (one command, recommended)

```bash
# narrate server running first (brew services start narrate)
bash integrations/claude-code/install.sh
```

Idempotent and safe to re-run. It does everything:

1. **MCP server** — registers `narrate` via `claude mcp add` (streamable HTTP).
2. **Stop hook** — copies the hook to `~/.claude/hooks/narrate-stop-hook.ts`
   and **merges** it into `~/.claude/settings.json` (no clobber, no manual JSON).
3. **Skill** — drops `~/.claude/skills/narrate/SKILL.md` teaching the
   `🤖 BOT:` auto-voice convention and when to call the speak tool.

Restart Claude Code. You get three MCP tools:

- `mcp__narrate__speak({ text, voice?, provider?, voice_id? })`
- `mcp__narrate__list_voices()`
- `mcp__narrate__list_providers()`

Auto-voice: end any reply with `🤖 BOT: <short summary>` → the Stop hook speaks
it. On-demand: ask "narra eso" → the agent calls `mcp__narrate__speak`.

```bash
bash install.sh --no-mcp       # hook + skill only
bash install.sh --no-hook      # MCP + skill only
NARRATE_HOOK_VOICE=researcher bash install.sh   # pick the hook voice
```

Coexists with [voicebox MCP](https://github.com/jamiepine/voicebox) — different
ports (8888 vs 17493) and `X-*-Client-Id` headers.

## How the Stop hook works (reference)

## Pattern

Claude Code hooks are TypeScript files in `~/.claude/hooks/`. The most useful
hook for voice output is `Stop` (fires when the assistant turn ends).

The hook reads the assistant's final response, optionally extracts a "speak this"
marker (the `🤖 BOT:` convention is one common choice), and shells out to
`narrate`.

The one-command installer above handles copying the hook and merging it into
`settings.json` for you — this section is just reference for what it sets up.

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

## Settings.json snippet (manual fallback)

If you skipped the installer, add this to `~/.claude/settings.json` by hand:

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
