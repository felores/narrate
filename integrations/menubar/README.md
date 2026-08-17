# narrate — SwiftBar plugin

A macOS menu bar control panel for the narrate TTS gateway. Shows server status, the provider matrix with API key management, and two independent voice targets: on-demand `narrate` and session-end `🤖 BOT:`. Each target selects its own provider and voice. Menu is English by default with an EN/ES toggle at the bottom.

## What it shows

- **🎙️** when the narrate server responds healthy on `localhost:8888`, **🔇** when down.
- Click to open the dropdown:
  - Active port, configured-provider count, current voice pair.
  - **Providers** — one row per provider for API key and status management only. Cloud providers (ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio) show `✅` with a key present or `⚪` without; each has an API key submenu (`Change` / `Remove`, or `Add` when missing). Keys are written to `~/.env` **and** synced to the launchd user domain (`launchctl setenv`/`unsetenv`), so they survive restarts and match what the LaunchAgent sees. Voicebox shows `✅` when the local instance responds; when down it appears `⚪` with an "Install / start voicebox" link to the project. System is always available.
  - **Voices** — the Narrate and Session targets each show their selected voice and provider. Under each target, every configured provider with a catalog is a selector. Selecting a different provider assigns that target the provider's default voice; only the selected provider expands to its catalog. At most two catalogs render. Soniox stays flat with its live `tts-rt-v2` descriptions; Fish stays grouped by language. The narrate picker sets `default_provider`/`default_voice`; the session picker sets `auto_provider`/`auto_voice`. `Use same as narrate` clears the session pair.
  - **Test buttons** — `▶ Test narrate voice` and `▶ Test session voice` speak a sample phrase in the current pairs without changing config.
  - Last 3 lines of `narrate.log`.
  - Service controls — Restart / Stop the LaunchAgent, open `narrate.log` in Console.app or Terminal.
  - **Language** — a section at the bottom with one row per language (`🇬🇧 English` / `🇪🇸 Español`); the active one is checked and clicking the other row switches instantly. Persisted to `~/.config/narrate/menubar.json`. Note: SwiftBar renders one clickable item per line (the first `|` starts the item's params — `MenuLineParameters.swift`), so two separately clickable buttons on the same row are not possible; each language gets its own row.

## How voice switching works

The menu posts to `POST /config` (server-side, `src/server.ts`), which validates the pair, persists it to `~/.config/narrate/config.json` (`writeConfigFile`), and applies it in memory — **no restart needed**, and it survives restarts. The two knobs:

| Field | Meaning |
|---|---|
| `default_provider` / `default_voice` | Voice used for on-demand narration (`narrate` CLI, `narrate_speak`, POST `/speak`) |
| `auto_provider` / `auto_voice` | Voice used by harnesses for the `🤖 BOT:` session-end marker (OpenCode plugin, Pi extension, Claude Code stop hook) |

`auto_voice: null` + `auto_provider: null` = session voice follows the narrate voice ("Use same as narrate"). The menu does not have an active provider: changing a target provider changes only that target's pair.

## Install

```bash
./install.sh                  # default: also adds SwiftBar to Login Items
./install.sh --no-autostart   # skip the Login Items step
```

This:

1. Removes the legacy `voice-server.5s.sh` plugin if it's there (it points at scripts that no longer exist after the migration to narrate).
2. **Copies** `narrate.5s.sh` into `$HOME/Library/Application Support/SwiftBar/Plugins/`. (A real file, not a symlink — SwiftBar resolves `BASH_SOURCE` relative to the plugin location.) The four helper scripts are **not** copied: the plugin references them by absolute path back to the repo, so `install.sh` re-runs pick up changes without a stale helper copy.
3. Adds SwiftBar to macOS Login Items so the menu icon survives reboot, unless `--no-autostart` is passed.
4. Launches SwiftBar (or asks it to reload plugins via the `swiftbar://refreshallplugins` URL scheme if already running). On SwiftBar 2.1.0/2.1.1, install, update, provider, and key changes relaunch the app automatically to work around the upstream dynamic-submenu regression fixed in 2.1.2.

After install, click the SwiftBar icon → **Refresh All** if your menu bar doesn't show 🎙️ within 5 seconds.

## Manual install

```bash
cp narrate.5s.sh "$HOME/Library/Application Support/SwiftBar/Plugins/"
chmod +x "$HOME/Library/Application Support/SwiftBar/Plugins/narrate.5s.sh"
open -a SwiftBar
```

To make SwiftBar auto-start at boot manually: System Settings → General → Login Items, click `+`, pick `/Applications/SwiftBar.app`.

## Helper scripts (repo, referenced by absolute path)

- `narrate-menubar-config.sh` — voice changes: `narrate VOICE PROVIDER`, `auto VOICE PROVIDER`, `auto-same` (session = narrate), `narrate-provider VOICE PROVIDER`, or `auto-provider VOICE PROVIDER`. `select VOICE PROVIDER` remains for external legacy callers. SwiftBar 2.1.0/2.1.1 relaunches only for provider-changing modes and legacy `select`; ordinary voice changes refresh via URL. Newer versions always use URL refresh.
- `narrate-menubar-key.sh` — prompts for an API key (hidden input) or removes one (`remove` mode); calls `POST /keys`.
- `narrate-menubar-speak.sh` — speaks `$3` (or a default phrase) with `$1` voice / `$2` provider.
- `narrate-menubar-lang.sh` — writes `{"lang":"en|es"}` to `~/.config/narrate/menubar.json` and refreshes.

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
