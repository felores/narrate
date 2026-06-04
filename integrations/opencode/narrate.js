/**
 * narrate OpenCode plugin
 *
 * Provides:
 *   1. Auto-voice — reads "🤖 BOT:" markers aloud via message.part.updated
 *   2. On-demand — narrate_speak tool for "read this aloud"
 *
 * Install: run `bash install.sh` or copy to ~/.config/opencode/plugin/narrate.js
 * Depends on: @opencode-ai/plugin (add to ~/.config/opencode/package.json)
 */

import { tool } from "@opencode-ai/plugin";

const NARRATE_URL = process.env.NARRATE_URL ?? "http://localhost:8888";
const NARRATE_VOICE = process.env.NARRATE_OPENCODE_VOICE ?? "";

async function speak(text) {
  if (!text) return;
  try {
    const payload = { message: text.slice(0, 500) };
    if (NARRATE_VOICE) payload.voice = NARRATE_VOICE;
    await fetch(`${NARRATE_URL}/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Narrate-Client-Id": "opencode",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    /* never crash the agent because TTS is down */
  }
}

/** Matches 🤖 BOT: <text> at end of a response */
const MARKER_REGEX = /\u{1F916}\s*BOT:\s*(.+?)(?:\n|$)/u;

function extractBotMarker(text) {
  if (!text) return null;
  const match = MARKER_REGEX.exec(text);
  if (!match) return null;
  const trimmed = match[1].trim();
  return trimmed || null;
}

export const server = async () => {
  const spoken = new Set();

  return {
    // ── Auto-voice via message.part.updated ───────────────────
    // Each message part update carries the full accumulated text.
    // We detect the BOT marker and speak it once per part ID.
    event: async ({ event }) => {
      if (event.type !== "message.part.updated") return;
      const part = event.properties.part;
      if (!part || part.type !== "text") return;
      if (spoken.has(part.id)) return;

      const botText = extractBotMarker(part.text);
      if (!botText) return;

      spoken.add(part.id);
      await speak(botText);
    },

    // ── On-demand narration tool ──────────────────────────────
    tool: {
      narrate_speak: tool({
        description:
          "Read text aloud using the narrate TTS system. " +
          "Use when the user asks to 'narrate', 'read aloud', " +
          "'speak', 'narra', 'dilo en voz alta', or requests voice output.",
        args: {
          text: tool.schema.string({
            description:
              "The text to speak aloud. Keep concise (under 100 words).",
          }),
        },
        async execute(args) {
          await speak(args.text);
          return {
            output: `Spoken via narrate (voice=${NARRATE_VOICE || "server-default"})`,
          };
        },
      }),
    },
  };
};
