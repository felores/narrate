# narrate + OpenCode

[OpenCode](https://github.com/sst/opencode) ships a real plugin system and an
internal event bus — that's the right integration surface (no need for shell
hacks).

## What OpenCode actually exposes

- **Plugins** are TypeScript modules in `~/.config/opencode/plugins/`, or
  npm-installed packages, loaded by `packages/opencode/src/plugin/loader.ts`.
- **Hooks** are typed callbacks declared via the `Hooks` interface from the
  `@opencode-ai/plugin` package — installed plugins return one of these
  objects.
- **Bus events** are defined in `packages/opencode/src/bus/` and emitted on
  lifecycle transitions (turn end, message added, etc.). Plugins can subscribe
  via `Bus.subscribe(...)`.

This is the same surface OpenCode's built-in plugins (`codex`, `cloudflare`,
`github-copilot`) use — so the contract is stable and supported.

## Plugin pattern

Drop this in `~/.config/opencode/plugins/narrate.ts`:

```typescript
import type { PluginInput, Hooks } from "@opencode-ai/plugin";

const NARRATE_URL = process.env.NARRATE_URL ?? "http://localhost:8888";
const VOICE_PRESET = process.env.NARRATE_OPENCODE_VOICE ?? "engineer";

async function speak(text: string): Promise<void> {
  if (!text) return;
  try {
    await fetch(`${NARRATE_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Narrate-Client-Id": "opencode",
      },
      body: JSON.stringify({
        message: text.slice(0, 500),
        voice: VOICE_PRESET,
        voice_enabled: true,
      }),
    });
  } catch {
    /* never crash the agent because TTS is down */
  }
}

export const server = async (input: PluginInput): Promise<Hooks> => {
  return {
    // Hook names depend on the @opencode-ai/plugin version. Common ones:
    //   - "session.message" — after the assistant produces a message
    //   - "session.turn"    — at the end of each turn
    // Inspect Hooks type from your installed @opencode-ai/plugin to confirm.
    "session.turn": async (_input, output) => {
      const text = output?.message?.text ?? output?.summary;
      await speak(text);
    },
  };
};
```

> **Note:** the exact hook names are owned by `@opencode-ai/plugin`. Run
> `npm view @opencode-ai/plugin` in your OpenCode environment, or grep the
> installed package for `Hooks` type members. The example above assumes a
> turn-end style hook; adjust if your version differs.

## Without a plugin (shell wrapper)

If you don't want to write a plugin, wrap your OpenCode invocation:

```bash
opencode "$@" | tee /tmp/opencode.out
last_line=$(tail -n 1 /tmp/opencode.out)
narrate --quiet --voice engineer "$last_line"
```

## HTTP from inside containers

If OpenCode runs in a Docker container, point its env at the host:

```bash
NARRATE_URL=http://host.docker.internal:8888 opencode
```

## Tips

- **Different voice per agent**: set `NARRATE_OPENCODE_VOICE=engineer` so you
  hear which agent is speaking when you run multiple harnesses.
- **Throttle**: only narrate after lengthy operations (file changes, test
  runs) — narrating every keystroke is noise.
- **Errors in voice**: route `error` events to a distinct voice (e.g.
  `--voice pentester`) so failures sound different from successes.

## References

- OpenCode plugin source: https://github.com/sst/opencode/tree/dev/packages/opencode/src/plugin
- Event bus: https://github.com/sst/opencode/tree/dev/packages/opencode/src/bus
- Plugin docs (community): https://opencode.ai/docs
