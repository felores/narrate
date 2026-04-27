# narrate + Cursor / Windsurf / Cline

These editors don't have a hook system as rich as Claude Code, but they can all
shell out to `narrate` from tasks, commands, or scripts.

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

## MCP route (future)

A future version of narrate will expose an MCP server (`narrate.speak` tool)
so any MCP-aware editor (Cursor, Windsurf, Claude Code, etc.) can call it
without shelling out. Until then, the CLI/HTTP path covers all of them.
