# narrate + OpenCode

[OpenCode](https://github.com/sst/opencode) is a terminal-first AI coding agent.
The integration surface is the same as any shell-driven harness: invoke
`narrate` from a hook, command, or post-task script.

## Quick wiring

OpenCode supports custom commands. Add a wrapper that pipes the agent's last
response into `narrate`:

```bash
# ~/.config/opencode/scripts/say.sh
#!/usr/bin/env bash
narrate --quiet "$1"
```

Then call it from agent prompts or post-completion scripts.

## HTTP path

If your OpenCode setup runs in an environment without a `narrate` binary on
PATH (e.g. inside a sandboxed container), POST directly:

```bash
curl -s http://localhost:8888/notify \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"$MESSAGE\",\"voice\":\"researcher\"}"
```

## Tips

- Set `NARRATE_VOICE=opencode_voice` in OpenCode's environment so every
  call uses a distinct voice — easier to tell which agent is talking when
  you run multiple harnesses simultaneously.
- Use `--provider system` for deterministic output during development
  (no API costs, no rate limits).
