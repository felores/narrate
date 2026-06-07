---
name: narrate
description: >-
  Set up, configure, and use narrate — the provider-agnostic TTS gateway. Use
  this skill whenever the user wants to install or configure narrate, pick or
  preview TTS voices, choose a provider (ElevenLabs, OpenAI, Gemini, xAI, or the
  built-in system voice), add API keys, or troubleshoot "no audio". ALSO use it
  whenever the user asks to narrate, read something aloud, or speak text ("narra
  eso", "read that aloud", "dilo en voz alta", "speak this") — even if they
  don't say the word "narrate". If voice output isn't working or the user asks
  "which voice should I use", this is the skill.
---

# narrate

`narrate` is a local TTS gateway: one server (default `http://localhost:8888`)
that speaks text through six providers behind one uniform interface. This skill
does two jobs:

1. **Setup / onboarding** — get narrate installed, pick providers + voices, write config.
2. **Narration** — speak text on demand, and explain the auto-voice convention.

Figure out which one the user needs from their request, then jump to that section.

---

## Job 1 — Setup & onboarding

Goal: a working server + at least one provider the user is happy with.

### Step 1: See the current state (always do this first)

Run the bundled detection script — it reports OS, whether the server is up,
which API keys are present, and which providers are configured:

```bash
bash scripts/detect.sh
```

Read its output before asking the user anything. It tells you what's already
done so you don't ask redundant questions.

### Step 2: Make sure the server runs

If `detect.sh` says the server is down:

- **macOS (Homebrew):** `brew services start narrate`
- **Windows (Scoop):** `narrate-server` (or set up the Task Scheduler entry)
- **Linux / dev:** `narrate-server &` or `bun run src/server.ts &`

The **system provider** (macOS `say`, Linux `espeak`, Windows SAPI) needs zero
keys and works offline — so the user can hear narrate immediately:

```bash
narrate "hello, this is narrate"
```

### Step 3: Help them choose providers + voices

This is the high-value part. Don't just dump a list — let them **hear** the
voices, then pick. The provider details, voice names, models, and the exact URL
to preview each provider's voices in a browser are in:

**→ `references/providers.md`** (read it before recommending anything)

Ask which providers they want (they can pick several, or none — system works
alone). Match to their needs:

- "Just notifications / offline / free" → **system** (no setup).
- "Best quality, lots of voices" → **ElevenLabs**.
- "Cheap and good, simple" → **OpenAI**.
- "Free tier, multilingual" → **Gemini**.
- "Grok voices" → **xAI**.

Share the preview URL for each provider they're considering so they can listen
first. Then have them create an API key (links in `references/providers.md`).

### Step 4: Write the config

Keys go in `~/.env` (NOT `~/.zshrc` — background services don't read shell
init). Provider/voice defaults and presets go under `~/.config/narrate/`.

The full step-by-step (where each file lives, the exact JSON shape for
`config.json` and `voices.json`, and how voice presets abstract over providers)
is in:

**→ `references/setup.md`**

### Step 5: Verify

```bash
narrate verify           # provider health, no API calls
narrate verify --test    # smoke-test each configured provider (uses ~1 API call each)
```

Then speak with the new voice and confirm the user is happy.

---

## Job 2 — Narration

### On demand ("narra eso", "read that aloud", "speak this")

Use the best mechanism available in the current harness, in this order:

1. **Native tool** if present — `mcp__narrate__speak` (Claude Code / Cursor MCP)
   or `narrate_speak` (OpenCode / Pi). Prefer this; it returns playback info.
2. **CLI** — `narrate "the text"` (add `--voice <preset>` to pick a voice).
3. **HTTP** — `curl -s localhost:8888/notify -H 'Content-Type: application/json'
   -d '{"message":"the text"}'`.

Keep narrated text concise (under ~100 words / 500 chars). Summarize long
content before speaking it. Respond normally in text **and** speak it.

### Auto-voice (the `🤖 BOT:` convention)

narrate's harness plugins auto-speak a marker line at the end of each response:

```text
🤖 BOT: Build complete, two tests passing.
```

Rules: max 15 words, same language as the user's first message, on its own line
at the very end, starting with the exact marker `🤖 BOT:`.

> **Important:** for auto-voice to fire reliably, this instruction must live in
> the harness's always-on context (`CLAUDE.md`, `AGENTS.md`, or a system-prompt
> injection from the plugin) — **not only in this skill**, because skills load
> on demand, not every turn. If a user reports "auto-voice doesn't work", check
> that their `CLAUDE.md` / `AGENTS.md` contains the convention. See
> `references/troubleshooting.md`.

---

## When something's broken

No audio, wrong voice, server won't start, provider says "not configured" →
**`references/troubleshooting.md`**.

## Reference files

- `references/providers.md` — per-provider voices, models, preview playgrounds, API-key links.
- `references/setup.md` — config file locations + exact JSON for `config.json` / `voices.json`.
- `references/troubleshooting.md` — diagnosing no-audio, auto-voice, and provider issues.
- `scripts/detect.sh` — prints OS + server + keys + configured providers.
