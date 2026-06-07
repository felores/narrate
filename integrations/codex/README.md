# narrate + ChatGPT Codex CLI

[Codex CLI](https://github.com/openai/codex) is OpenAI's open-source coding
agent. Recent versions support **streamable-HTTP MCP servers** in
`~/.codex/config.toml` — which is exactly what narrate exposes.

## Install (recommended)

```bash
# 1. narrate server running
brew services start narrate            # or: narrate-server

# 2. register narrate as an MCP server + add the voice convention
bash integrations/codex/install.sh
```

This writes two things and is safe to re-run:

- **`~/.codex/config.toml`** — a `[mcp_servers.narrate]` block pointing at
  `http://localhost:8888/mcp` with the `X-Narrate-Client-Id: codex` header.
- **`~/.codex/AGENTS.md`** — the `🤖 BOT:` voice convention (auto-voice +
  on-demand narration), instructing Codex to call the narrate `speak` tool.

Restart Codex, then verify:

```bash
codex mcp list                          # should list 'narrate'
```

Codex now has the narrate tools (`speak`, `list_voices`, `list_providers`).
Because Codex has no stop-hook, auto-voice works by the agent **calling the
`speak` tool itself** at the end of each turn (the AGENTS.md teaches this).

## What the config block looks like

```toml
[mcp_servers.narrate]
url = "http://localhost:8888/mcp"
http_headers = { "X-Narrate-Client-Id" = "codex" }
startup_timeout_sec = 10
enabled = true
```

Tip: to skip the per-call approval prompt for the `speak` tool, add
`default_tools_approval_mode = "auto"` to that block.

## Options

```bash
bash integrations/codex/install.sh --no-agents   # MCP only, leave AGENTS.md alone
NARRATE_URL=http://host:8888 bash integrations/codex/install.sh
```

## Fallback: shell wrapper (no MCP)

For older Codex versions without streamable-HTTP MCP, narrate the final line of
output directly:

```bash
output=$(codex "$@"); echo "$output"
narrate --quiet --voice engineer "$(echo "$output" | tail -n 1)"
```

Or, inside a sandbox, hit the HTTP endpoint:

```bash
curl -s http://host.docker.internal:8888/notify \
  -H 'Content-Type: application/json' \
  -d '{"message":"task complete","voice":"engineer"}'
```
