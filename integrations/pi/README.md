# narrate + Pi (pi-mono)

[Pi](https://github.com/badlogic/pi-mono) is a minimal terminal coding harness
built on `@mariozechner/pi-agent-core`. Pi exposes a stateful agent with a
clean event subscription API — perfect for narration.

## What Pi actually exposes

The agent emits a structured event sequence per turn:

```text
prompt("Hello")
├─ agent_start
├─ turn_start
├─ message_start    { message: userMessage }
├─ message_end      { message: userMessage }
├─ message_start    { message: assistantMessage }
├─ message_update   { message: partial... }   // streaming
├─ message_end      { message: assistantMessage }
├─ turn_end         { message, toolResults: [] }
└─ agent_end        { messages: [...] }
```

Source: [`packages/agent/README.md`](https://github.com/badlogic/pi-mono/blob/main/packages/agent/README.md)

The right hook for narration is **`turn_end`** — fires once per turn with the
final assistant message and any tool results.

## SDK integration

If you embed Pi via SDK:

```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

const NARRATE_URL = process.env.NARRATE_URL ?? "http://localhost:8888";
const VOICE_PRESET = process.env.NARRATE_PI_VOICE ?? "researcher";

async function speak(text: string): Promise<void> {
  if (!text) return;
  try {
    await fetch(`${NARRATE_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Narrate-Client-Id": "pi",
      },
      body: JSON.stringify({
        message: text.slice(0, 500),
        voice: VOICE_PRESET,
        voice_enabled: true,
      }),
    });
  } catch {
    /* never block the agent on TTS */
  }
}

const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
  },
});

agent.subscribe((event) => {
  if (event.type === "turn_end") {
    const text = event.message?.content
      ?.filter((b: { type: string }) => b.type === "text")
      ?.map((b: { text: string }) => b.text)
      .join(" ");
    if (text) void speak(text);
  }
});

await agent.prompt("Hello!");
```

## CLI integration (Pi extension)

Pi supports **Extensions** — TypeScript packages that add commands, hooks, or
tools without forking. See the [Pi packages
guide](https://github.com/badlogic/pi-mono#pi-packages).

Wrap the agent's stop event in a Pi extension and ship it as
`pi-narrate-extension` on npm. Until that exists, the simplest path is the
SDK integration above.

## Wrapper script (no SDK changes)

For interactive Pi sessions, redirect stdout and narrate the last line:

```bash
pi "$@" 2>&1 | tee /tmp/pi.out
last=$(tail -n 1 /tmp/pi.out)
[ -n "$last" ] && narrate --quiet --voice researcher "$last"
```

## Tips

- **Voice per agent**: `NARRATE_PI_VOICE=researcher` so Pi sounds different
  from your other harnesses.
- **Skip tool-only turns**: in `turn_end`, check
  `event.toolResults?.length > 0 && !event.message?.content` and skip
  narration for tool-call-only turns to avoid noise.
- **Streaming TTS**: don't subscribe to `message_update` — narrate works in
  full sentences. `turn_end` is the right boundary.

## References

- Pi-mono repo: https://github.com/badlogic/pi-mono
- pi-agent-core README: https://github.com/badlogic/pi-mono/blob/main/packages/agent/README.md
- Pi extensions docs: https://github.com/badlogic/pi-mono#extensions
- Real-world SDK integration example: https://github.com/openclaw/openclaw
