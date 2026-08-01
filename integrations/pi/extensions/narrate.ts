/**
 * narrate Pi extension
 *
 * Provides:
 *   1. Auto-voice — reads "🤖 BOT:" markers aloud via message_end
 *   2. On-demand — narrate_speak tool for "read this aloud"
 *   3. System prompt — injects the 🤖 BOT: convention
 *
 * Install:
 *   pi install git:github.com/felores/narrate/integrations/pi
 *   or copy to ~/.pi/agent/extensions/narrate.ts
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const NARRATE_URL = process.env.NARRATE_URL ?? "http://localhost:8888";
const VOICE_OVERRIDE = process.env.NARRATE_PI_VOICE ?? "";

/** Fetch the server's voice pairs. kind: "narrate" (on-demand) | "session" (BOT marker). */
async function serverVoice(
  kind: "narrate" | "session",
): Promise<{ provider: string; voice_id: string } | null> {
  try {
    const res = await fetch(`${NARRATE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const h = await res.json();
    if (kind === "session" && h.auto_voice) {
      return { provider: h.auto_provider || h.default_provider, voice_id: h.auto_voice };
    }
    if (kind === "narrate" && h.default_voice) {
      return { provider: h.default_provider, voice_id: h.default_voice };
    }
    return null;
  } catch {
    return null;
  }
}

async function speak(text: string, kind: "narrate" | "session"): Promise<void> {
  if (!text) return;
  try {
    const payload: Record<string, unknown> = {
      message: text.slice(0, 500),
    };
    if (VOICE_OVERRIDE) {
      payload.voice = VOICE_OVERRIDE;
    } else {
      const v = await serverVoice(kind);
      if (v) {
        payload.voice_id = v.voice_id;
        payload.provider = v.provider;
      }
    }
    await fetch(`${NARRATE_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Narrate-Client-Id": "pi",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    /* never crash the agent because TTS is down */
  }
}

/**
 * Matches 🤖 BOT: <text> only when it is the FINAL line of the response.
 * Not anchored this way, inline examples of the marker in the message body
 * (quotes, bullets) trigger auto-voice and speak the wrong text.
 */
function extractBotMarker(text: string): string | null {
  if (!text) return null;
  const lines = text.trimEnd().split("\n");
  const match = /\u{1F916}\s*BOT:\s*(.+)$/u.exec(lines[lines.length - 1] ?? "");
  if (!match) return null;
  return match[1].trim() || null;
}

const CONVENTION = `

## Auto-voice convention

End every response with a voice-friendly summary line like this:

\`🤖 BOT: Build complete, two tests passing.\`

Rules:
- Max 15 words
- Same language as the user's first message
- Put it on its own line at the very end of your response
- Must start with the exact marker \`🤖 BOT:\` (robot emoji + space + BOT: + space)

## On-demand narration

When the user says "narra", "narrate", "read aloud", "read that",
"speak", "dilo en voz alta", "dime", "cuentame":

1. Call the \`narrate_speak\` tool with the text they want to hear
2. Keep the text concise (under 100 words)
3. Respond normally in text AND read it aloud
`;

export default function (pi: ExtensionAPI) {
  // ── Auto-voice via message_end ──────────────────────────
  // Unlike OpenCode's message.part.updated (streaming), Pi's
  // message_end fires once per finalized assistant message.
  // No dedup needed.
  pi.on("message_end", async (event) => {
    if (event.message.role !== "assistant") return;

    const text = event.message.content
      ?.filter((b: { type: string }) => b.type === "text")
      ?.map((b: { text: string }) => b.text)
      .join(" ");

    if (!text) return;

    const botText = extractBotMarker(text);
    // Fire-and-forget: do NOT await. The fetch must not keep the
    // event handler alive — OMP's TUI repaints after handler return
    // and awaiting would race the render, wiping displayed messages.
    if (botText) speak(botText, "session").catch(() => {});
  });

  // ── System prompt injection ─────────────────────────────
  // Injects the 🤖 BOT: convention. Guard against duplication
  // (user's AGENTS.md or another extension may already have it).
  pi.on("before_agent_start", async (event) => {
    if (event.systemPrompt.includes("🤖 BOT:")) return;
    return { systemPrompt: event.systemPrompt + CONVENTION };
  });

  // ── On-demand narration tool ────────────────────────────
  pi.registerTool({
    name: "narrate_speak",
    label: "Narrate Speak",
    description:
      "Read text aloud using the narrate TTS system. " +
      "Use when the user asks to 'narrate', 'read aloud', " +
      "'speak', 'narra', 'dilo en voz alta', or requests voice output.",
    promptSnippet:
      "Read text aloud via narrate TTS",
    promptGuidelines: [
      "Use narrate_speak when the user says 'narrate', 'read aloud', " +
      "'narra', 'dilo en voz alta', 'speak this', or asks for voice output. " +
      "Keep the text concise (under 100 words).",
    ],
    parameters: Type.Object({
      text: Type.String({
        description:
          "The text to speak aloud. Keep concise (under 100 words).",
      }),
    }),
    async execute(_toolCallId, params) {
      await speak(params.text, "narrate");
      const voiceInfo = VOICE_OVERRIDE ? ` (voice=${VOICE_OVERRIDE})` : "";
      return {
        content: [{ type: "text", text: `Spoken via narrate${voiceInfo}` }],
        details: {},
      };
    },
  });
}