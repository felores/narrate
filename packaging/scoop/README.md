# narrate on Windows (Scoop)

Windows packaging for narrate, mirroring the macOS Homebrew tap. Uses
[Scoop](https://scoop.sh) — the closest Windows equivalent to Homebrew.

## Install (end users)

```powershell
# 1. Install Scoop (if you don't have it)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. Add the narrate bucket + install
scoop bucket add narrate https://github.com/felores/scoop-narrate
scoop install narrate

# 3. Start the server, then speak
narrate-server          # leave running in a terminal (or set up the service below)
narrate "hello from Windows"
```

`bun` is pulled in automatically as a dependency. The **system provider** uses
Windows SAPI (`System.Speech.Synthesis`) — zero API keys, works offline, same
role as macOS `say` / Linux `espeak`.

### Premium voices (optional)

Add any subset to `%USERPROFILE%\.env`:

```text
ELEVENLABS_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
XAI_API_KEY=...
```

Then point the default provider at one:

```powershell
mkdir "$env:USERPROFILE\.config\narrate" -Force
'{"default_provider":"openai","default_voice":"nova"}' | Set-Content "$env:USERPROFILE\.config\narrate\config.json"
```

## Run the server at login (service equivalent)

Windows has no `brew services`. Use **Task Scheduler** to run `narrate-server`
at logon:

```powershell
$action  = New-ScheduledTaskAction -Execute "narrate-server"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "narrate" -Action $action -Trigger $trigger -Description "narrate TTS server"
```

Remove it with `Unregister-ScheduledTask -TaskName "narrate" -Confirm:$false`.

## What `narrate.json` does

- `depends`: `main/bun` — Scoop installs Bun first.
- `url` + `hash` + `extract_dir`: downloads + verifies the GitHub release tarball.
- `pre_install`: generates `narrate.cmd` / `narrate-server.cmd` wrappers that
  `bun run` `src/cli.ts` / `src/server.ts` (resolved relative to the app dir via
  `%~dp0`, so updates don't break the shims). **This must be `pre_install`, not
  `post_install`** — Scoop's `create_shims` runs before `post_install`, so the
  `.cmd` files have to exist first or the `bin` shims fail.
- `bin`: shims both `.cmd` wrappers onto PATH.
- `post_install`: `bun install --frozen-lockfile` in the app dir (after shims;
  doesn't affect them).
- `checkver` + `autoupdate`: `scoop update narrate` tracks new GitHub tags.

## Maintainer: publishing a new version

The manifest lives here in-repo for review, but Scoop installs it from a
**bucket repo** (`felores/scoop-narrate`), analogous to the Homebrew tap.
On each release:

```powershell
# bump version + url in narrate.json (or let `scoop update` autoupdate it),
# then copy into the bucket repo and push:
cp packaging/scoop/narrate.json ../scoop-narrate/bucket/narrate.json
cd ../scoop-narrate; git commit -am "narrate X.Y.Z"; git push
```

> The `scoop-narrate` bucket repo doesn't exist yet — create it (a repo with a
> `bucket/` folder containing `narrate.json`) before the first Windows release.
