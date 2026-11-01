# Contributing

Thanks for your interest in improving narrate.

## Open an issue before a large PR

narrate is one Bun process with three interfaces (HTTP, MCP, CLI) over one
provider registry. A fix in one interface is often a fix in the shared path, so
before opening a sizable PR, **file an issue first** describing the bug or change.
It avoids work against the wrong place.

Read [`AGENTS.md`](./AGENTS.md) before changing code. Its architecture invariants
are intentional, and each one records why it exists.

## Adding a provider

Implement the `Provider` interface (`src/providers/base.ts`) and register it once
in `PROVIDER_REGISTRY` (`src/providers/index.ts`). The HTTP, CLI and MCP handlers
pick it up from there: no switch statements to update.

Keep the dependency list lean. narrate ships two runtime dependencies, and every
new one is reviewed.

## Dev

```bash
bun install
bun run dev                     # hot-reload server
bun run typecheck               # tsc --noEmit
bun run src/cli.ts verify       # smoke test against the running server
```

There is no test suite yet. `typecheck` and `narrate verify --test` are the gates.

Keep changes surgical and match the surrounding style.
