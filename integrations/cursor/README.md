# narrate + Cursor / Windsurf / Cline

All three have native MCP support. The MCP path is by far the cleanest — drop one config block in their MCP settings and the agent gets `narrate.speak` as a real tool.

## Recommended: MCP

Add to the client's MCP config (usually `.mcp.json`, `~/.cursor/mcp.json`, or via Settings UI):

```json
{
  "mcpServers": {
    "narrate": {
      "url": "http://localhost:8888/mcp",
      "headers": { "X-Narrate-Client-Id": "cursor" }
    }
  }
}
```

Change the client id per editor (`cursor`, `windsurf`, `cline`) so the server logs tell you which one is calling. Three tools become available:

- `narrate.speak({ text, voice?, provider?, voice_id? })`
- `narrate.list_voices()`
- `narrate.list_providers()`

Coexists with the voicebox MCP server — different ports (`8888` vs `17493`), same protocol.

## Fallback: shell tasks (no MCP)

## Cursor

Add a custom command in `.cursorrules` or via Settings → Commands:

```text
After completing a multi-file change, run:
  narrate --voice researcher "Done with <short summary>"
```

You can also bind a keybinding to a shell task that runs `narrate` with the
text from the clipboard:

```jsonc
// keybindings.json
{
  "key": "ctrl+alt+n",
  "command": "workbench.action.tasks.runTask",
  "args": "narrate-clipboard"
}
```

Where `tasks.json` defines:

```jsonc
{
  "label": "narrate-clipboard",
  "type": "shell",
  "command": "pbpaste | narrate"
}
```

## Windsurf

Same pattern — Windsurf inherits VS Code's tasks system. Use a task that pipes
text to `narrate`.

## Cline

Cline supports custom auto-approve actions. Wrap a shell command:

```bash
narrate --quiet --voice cline_voice "$ARGUMENTS"
```

## Note

The MCP route at the top of this file is the recommended path — narrate exposes
a streamable-HTTP MCP server (`narrate.speak`, `list_voices`, `list_providers`),
so any MCP-aware editor calls it natively without shelling out. The shell tasks
above are only a fallback for editors without MCP support.
