# narrate — SwiftBar plugin

A macOS menu bar indicator for the narrate TTS gateway. Shows server status, the provider matrix, recent log lines, and one-click quick-speak for each voice preset.

## What it shows

- **🎙️** when the narrate server responds healthy on `localhost:8888`, **🔇** when down.
- Click to open the dropdown:
  - Active port, default provider/voice, configured-provider count.
  - Per-provider status with `✅` / `⚪`.
  - **Quick speak** — first 8 voice presets from your `voices.json`. Click one and the server speaks a test message in that voice.
  - Last 3 lines of `narrate.log` (so you can spot a stuck request without leaving your menu bar).
  - Service controls — Restart / Stop the LaunchAgent, open `narrate.log` in Console.app or Terminal.
  - `narrate verify` shortcut.

## Install

```bash
./install.sh
```

This:

1. Removes the legacy `voice-server.5s.sh` plugin if it's there (it points at scripts that no longer exist after the migration to narrate).
2. Symlinks `narrate.5s.sh` into `$HOME/Library/Application Support/SwiftBar/Plugins/` so future updates from the repo are picked up automatically.
3. Launches SwiftBar if it isn't already running.

After install, click the SwiftBar icon → **Refresh All** if your menu bar doesn't show 🎙️ within 5 seconds.

## Manual install

If you don't want a symlink:

```bash
cp narrate.5s.sh "$HOME/Library/Application Support/SwiftBar/Plugins/"
chmod +x "$HOME/Library/Application Support/SwiftBar/Plugins/narrate.5s.sh"
open -a SwiftBar
```

## Override defaults

Set in your shell init (`~/.zshrc` etc.) before SwiftBar launches the plugin:

```bash
export NARRATE_URL="http://localhost:8888"
export NARRATE_LOG="$HOME/Documents/GitHub/narrate/logs/narrate.log"
export NARRATE_REPO="$HOME/Documents/GitHub/narrate"
```

## Requires

- [SwiftBar](https://swiftbar.app) (or [xbar](https://xbarapp.com), same plugin format) — `brew install --cask swiftbar`
- Python 3 (for parsing `/health` JSON; macOS ships it at `/usr/bin/python3`)
- `curl` (macOS bundled)

## Uninstall

```bash
rm "$HOME/Library/Application Support/SwiftBar/Plugins/narrate.5s.sh"
```
