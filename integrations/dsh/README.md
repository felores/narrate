# narrate-dsh — narrate plugin for DeepSeek Harness

Voice output for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`) via [narrate](https://github.com/felores/narrate), the local
provider-agnostic TTS gateway. A Cordis runtime plugin — the same voice
features the [OpenCode](../opencode/README.md), [Pi](../pi/README.md), and
[Codex](../codex/README.md) integrations provide, for the dsh TUI (and any
other dsh profile).

## Features

| Feature | Mechanism |
|---|---|
| **Auto-voice** | Listens for `assistant/message` session events, extracts the `🤖 BOT:` marker from the final line, speaks it with the session voice (`auto_voice` pair from `/health`) |
| **On-demand** | Registers the `narrate_speak` tool — "narra", "read aloud", "dilo en voz alta" |
| **Convention** | Injects the `🤖 BOT:` convention into the system prompt as a stable section (always-on; a skill alone cannot guarantee it every turn) |
| **Skill** | Registers a bundled `narrate` SKILL.md on the skills registry (`/skill narrate`) |

Every narrate call is fire-and-forget and swallows errors — TTS downtime
never breaks the agent. Nothing is appended to the session log (the plugin
only listens), so sessions stay resumable.

## Requirements

- `dsh` CLI with a profile (tested with `dsh-tui`).
- The narrate server running (default `http://localhost:8888`). Override with
  `NARRATE_URL` or the `url` config key.
- [Bun](https://bun.sh) for the build.

## Install

```bash
bash install.sh                 # default: dsh-tui profile
bash install.sh --profile web   # other profile
```

What it does:

1. Builds the plugin (`tsc` → `lib/types/`).
2. Runs `dsh plugin --profile <name> add <plugin dir>` — pnpm installs the
   package into the profile and reconciles its `dsh.bundle` declaration into
   `dsh.profile.bundles`, so the `cordis.patch.yml` insert row (plugin id
   `narrate`) is applied at boot.

Then restart the harness: `dsh --profile dsh-tui`.

Verify the row is composed:

```bash
dsh --profile dsh-tui --dump-config | grep -A2 'id: narrate'
```

## Configuration

The plugin row in `cordis.patch.yml` carries defaults; override by id in the
profile's own `cordis.patch.yml` or a `--patch` overlay (a later layer
replaces the whole `config`):

```yaml
- id: narrate
  config:
    url: http://localhost:8888   # narrate server (env NARRATE_URL wins when absent)
    autoVoice: true              # speak 🤖 BOT: markers
    tool: true                   # register narrate_speak
    injectConvention: true       # system-prompt section with the convention
    skill: true                  # register the bundled narrate skill
    voiceOverride: ''            # force a voices.json preset for all calls
```

Env overrides:

- `NARRATE_URL` — server base URL.
- `NARRATE_DSH_VOICE` — force a voice (any `voices.json` preset) for both
  auto-voice and `narrate_speak` (mirrors `NARRATE_OPENCODE_VOICE`).

Voices are never guessed: the plugin asks the server (`/health`) for the
voice of the right kind — `session` for the `🤖 BOT:` marker, `narrate` for
`narrate_speak` — and falls back to the narrate voice when the session voice
is unset (server-side `auto_*` null semantics).

## How it works

- **Seam 1 (session events):** `ctx.on('session/event', ...)` filters
  `assistant/message`, dedups by message id per session (the durable log
  replays these events on `/resume`, so dedup also prevents double-speaking),
  extracts the marker from the final line only, and POSTs to `/notify` with
  `X-Narrate-Client-Id: dsh`.
- **Tool seam:** `ctx.tools.register(defineTool(...))`, the same shape as
  `@deepseek-ai/dsh-tool-todo`.
- **Prompt seam:** `ctx.inject(['systemPrompt'], ...)` adds the stable
  `narrate:dsh` section (order 61), removed with the plugin fiber.
- **Skills seam:** `ctx.inject(['skills'], ...)` registers the bundled
  `skills/narrate/SKILL.md` (read from the package root at apply time;
  unreadable → silently skipped).

## Uninstall

```bash
dsh plugin --profile dsh-tui remove narrate-dsh
```

## Development

```bash
bun install
bun run typecheck     # tsc --noEmit
bun run build         # tsc → lib/types/
```

The bundled `skills/narrate/SKILL.md` mirrors the canonical narrate skill
(`../../skills/narrate/`) — keep it in sync when the canonical one changes.

## Files

- `src/index.ts` — the plugin (three contract exports: `name`, `Config`, `apply`).
- `cordis.patch.yml` — bundle patch inserting the `narrate` row.
- `skills/narrate/SKILL.md` — bundled skill (registered on the skills registry).
- `install.sh` — build + `dsh plugin add`.
