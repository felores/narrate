# narrate + Pi

Voice output for the [pi](https://pi.dev) coding agent via [narrate](https://github.com/felores/narrate) TTS.

## What it does

- **Auto-voice**: reads every `🤖 BOT: ...` marker aloud at the end of responses
- **On-demand**: `narrate_speak` tool for "narra", "read aloud", "speak this"
- **System prompt**: injects the `🤖 BOT:` convention automatically

## Install

```bash
# Option 1: via pi install (recommended)
pi install git:github.com/felores/narrate/integrations/pi

# Option 2: local path
pi install ~/Documents/GitHub/narrate/integrations/pi

# Option 3: manual copy
bash install.sh
```

## Prerequisites

- narrate server running: `brew services start narrate`
- Pi 0.3.0+ (needs extension API)

## Configuration (optional)

```bash
export NARRATE_URL=http://localhost:8888
export NARRATE_PI_VOICE=researcher    # any voice from ~/.config/narrate/voices.json
```

## How it works

```
pi session
├── before_agent_start → injects 🤖 BOT: convention
├── message_end (assistant) → extract 🤖 BOT: marker, speak it
└── narrate_speak tool → on-demand narration
```

Uses Pi's native extension API — no external SDK dependencies. `message_end` fires once per finalized assistant message, so we don't need the complex dedup we had with OpenCode's streaming `message.part.updated`.

## Cross-harness compatibility

The `🤖 BOT:` convention works across all harnesses:

| Harness | Integration | Location |
|---------|-------------|----------|
| **Pi** | Extension | `integrations/pi/` |
| **Claude Code** | Stop hook | `~/.claude/hooks/stop.sh` |
| **OpenCode** | Plugin | `~/.config/opencode/plugin/narrate.js` |
| **Codex** | Extension | `integrations/codex/` |
| **Cursor** | Shell wrapper | `integrations/cursor/` |

## Files

```
integrations/pi/
├── package.json          # pi package manifest
├── extensions/
│   └── narrate.ts        # main extension
├── skills/
│   └── narrate/
│       └── SKILL.md      # convention docs (loadable as /narrate)
├── install.sh            # manual installer
└── README.md             # this file
```

## publish to npm

```bash
cd integrations/pi
npm publish --access public
```

Then: `pi install npm:pi-narrate`