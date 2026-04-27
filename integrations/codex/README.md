# narrate + ChatGPT Codex CLI

[Codex CLI](https://github.com/openai/codex) is OpenAI's open-source coding
agent. It runs as a CLI, can be wrapped in shell, and supports custom prompts
and post-execution scripts.

## Wrapper script

```bash
#!/usr/bin/env bash
# codex-with-voice — runs codex and narrates the final answer
set -e
output=$(codex "$@")
echo "$output"
narrate --quiet --voice engineer "$(echo "$output" | tail -n 1)"
```

## Inline narration in prompts

Tell Codex to print a final voice-friendly summary line, then post-process:

```bash
codex "implement X. End with a single line prefixed 'SAY:' that summarizes." \
  | tee /tmp/codex.out
grep '^SAY:' /tmp/codex.out | sed 's/^SAY: //' | narrate
```

## HTTP fallback

When the Codex agent runs inside a container or sandbox, point it at the
narrate HTTP endpoint:

```bash
curl -s http://host.docker.internal:8888/notify \
  -H 'Content-Type: application/json' \
  -d '{"message":"task complete","voice":"engineer"}'
```

(Replace `host.docker.internal` with your host bridge.)

## Tips

- Voice the **plan**, not the implementation: prompt Codex to narrate only
  the high-level decision, not every file change. Otherwise narration becomes
  noise.
- Distinct voice per agent: `narrate --voice codex_voice` makes Codex sound
  different from your other harnesses (Claude Code, OpenCode, etc.).
