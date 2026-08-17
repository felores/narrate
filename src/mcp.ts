/**
 * MCP server for narrate — exposes `narrate.speak`, `narrate.list_voices`,
 * and `narrate.list_providers` to any MCP-aware harness (Claude Code, Cursor,
 * Windsurf, Cline, VS Code, etc.) over Streamable HTTP.
 *
 * Mounted at /mcp on the same Bun server as the HTTP API.
 *
 * Coexists with voicebox's MCP server (which uses port 17493) — clients
 * configure narrate's URL separately. Use `X-Narrate-Client-Id` header to
 * tell the server which client is calling.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

import type { VoicesRegistry } from "./voices.ts";
import { ALL_PROVIDERS, type Provider } from "./providers/index.ts";

export interface NotifyHandlerInput {
  message: string;
  voice?: string;
  voice_id?: string;
  provider?: string;
  providerConfig?: Record<string, unknown>;
}

export interface NotifyHandlerResult {
  provider: string;
  voice: string;
  format: string;
  delegated: boolean;
}

export type NotifyHandler = (
  input: NotifyHandlerInput,
) => Promise<NotifyHandlerResult>;

export function createMcpServer(deps: {
  voices: VoicesRegistry;
  notify: NotifyHandler;
}): McpServer {
  const server = new McpServer(
    { name: "narrate", version: "0.3.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Use `narrate.speak` to speak text aloud through one of narrate's TTS providers. " +
        "Pass `voice` for a preset name (recommended) or `voice_id` for a raw provider voice id. " +
        "Use `narrate.list_voices` to discover available presets and `narrate.list_providers` " +
        "to see which providers are configured on this machine.",
    },
  );

  server.registerTool(
    "speak",
    {
      title: "Speak text via TTS",
      description:
        "Generate and play speech for the given text using one of narrate's configured TTS providers " +
        "(ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio, Voicebox, system). Audio is played on the host machine. " +
        "Use `voice` for a preset (resolved against voices.json) or `voice_id` to pass a raw provider voice id.",
      inputSchema: {
        text: z
          .string()
          .min(1)
          .max(5000)
          .describe("Text to speak (max 5000 chars)"),
        voice: z
          .string()
          .optional()
          .describe(
            "Voice preset name from voices.json (e.g. 'researcher', 'engineer')",
          ),
        voice_id: z
          .string()
          .optional()
          .describe(
            "Raw provider voice id (e.g. 'Samantha' for system, 'alloy' for openai). Bypasses preset registry.",
          ),
        provider: z
          .enum(["elevenlabs", "openai", "gemini", "xai", "soniox", "fish", "voicebox", "system"])
          .optional()
          .describe("Provider override. Defaults to server config or preset."),
      },
    },
    async ({ text, voice, voice_id, provider }) => {
      try {
        const result = await deps.notify({
          message: text,
          voice,
          voice_id,
          provider,
        });
        return {
          content: [
            {
              type: "text",
              text: `Spoken via ${result.provider} (voice=${result.voice}, format=${result.format}${result.delegated ? ", delegated playback" : ""})`,
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `narrate.speak failed: ${msg}` }],
        };
      }
    },
  );

  server.registerTool(
    "list_voices",
    {
      title: "List voice presets",
      description:
        "List all voice presets defined in voices.json. Each preset maps a friendly name " +
        "(like 'researcher') to a (provider, voice_id) pair. Use the preset name with `narrate.speak`'s `voice` param.",
      inputSchema: {},
    },
    async () => {
      const presets = Object.entries(deps.voices.list()).map(([name, p]) => ({
        name,
        provider: p.provider,
        voice_id: p.voice_id,
        description: p.description ?? null,
      }));
      return {
        content: [
          {
            type: "text",
            text:
              presets.length === 0
                ? "No voice presets configured. Add some to ~/.config/narrate/voices.json"
                : presets
                    .map(
                      (p) =>
                        `${p.name}: provider=${p.provider}, voice_id=${p.voice_id}${p.description ? ` — ${p.description}` : ""}`,
                    )
                    .join("\n"),
          },
        ],
        structuredContent: { presets },
      };
    },
  );

  server.registerTool(
    "list_providers",
    {
      title: "List TTS providers and their status",
      description:
        "Returns the list of TTS providers the server knows about, with `configured: true/false` per provider. " +
        "Useful to find out which cloud APIs have keys set or whether voicebox is reachable.",
      inputSchema: {},
    },
    async () => {
      const rows: Array<{
        name: string;
        label: string;
        configured: boolean;
        reason?: string;
      }> = [];
      for (const p of ALL_PROVIDERS as Provider[]) {
        const h = await p.health();
        rows.push({
          name: p.name,
          label: p.label,
          configured: h.configured,
          reason: h.reason,
        });
      }
      return {
        content: [
          {
            type: "text",
            text: rows
              .map(
                (r) =>
                  `${r.configured ? "✅" : "⚪"} ${r.name} (${r.label})${r.reason ? ` — ${r.reason}` : ""}`,
              )
              .join("\n"),
          },
        ],
        structuredContent: { providers: rows },
      };
    },
  );

  return server;
}

/**
 * Build a Web Standards-compatible MCP fetch handler.
 *
 * Returns a function `(req: Request) => Promise<Response>` to mount on /mcp.
 *
 * Stateless mode requires a fresh server + transport per request — the SDK
 * guards against reuse to prevent message-id collisions between clients.
 * The cost is one McpServer construction (3 tool registrations) per call,
 * which is microseconds compared to the TTS round-trip.
 */
export function createMcpFetchHandler(deps: {
  voices: VoicesRegistry;
  notify: NotifyHandler;
}): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const mcpServer = createMcpServer(deps);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: one request per transport
      enableJsonResponse: true,
    });
    try {
      await mcpServer.connect(transport);
      return await transport.handleRequest(req);
    } finally {
      // Best-effort cleanup; do not throw out of finally.
      try {
        await mcpServer.close();
      } catch {
        /* noop */
      }
    }
  };
}
