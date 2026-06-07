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
const NARRATE_VOICE = process.env.NARRATE_PI_VOICE ?? "";

async function speak(text: string): Promise<void> {
  if (!text) return;
  try {
    const payload: Record<string, unknown> = {
      message: text.slice(0, 500),
    };
    if (NARRATE_VOICE) payload.voice = NARRATE_VOICE;
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

/** Matches 🤖 BOT: <text> at end of a response */
const MARKER_REGEX = /\u{1F916}\s*BOT:\s*(.+?)(?:\n|$)/u;

function extractBotMarker(text: string): string | null {
  if (!text) return null;
  const match = MARKER_REGEX.exec(text);
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
    if (botText) await speak(botText);
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
      await speak(params.text);
      const voiceInfo = NARRATE_VOICE ? ` (voice=${NARRATE_VOICE})` : "";
      return {
        content: [{ type: "text", text: `Spoken via narrate${voiceInfo}` }],
        details: {},
      };
    },
  });
}