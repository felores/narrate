/**
 * narrate OpenCode plugin
 *
 * Provides:
 *   1. Auto-voice — reads "🤖 BOT:" markers aloud via message.part.updated
 *   2. On-demand — narrate_speak tool for "read this aloud"
 *
 * Voices come from the narrate server (/health): the 🤖 BOT: marker uses the
 * session voice (auto_voice), the narrate_speak tool uses the on-demand voice
 * (default_voice). Both are changeable on the fly from the SwiftBar menu.
 * Set NARRATE_OPENCODE_VOICE to a voices.json preset to force an override.
 *
 * Install: run `bash install.sh` or copy to ~/.config/opencode/plugins/narrate.js
 * Depends on: @opencode-ai/plugin (add to ~/.config/opencode/package.json)
 */

import { tool } from "@opencode-ai/plugin";

const NARRATE_URL = process.env.NARRATE_URL ?? "http://localhost:8888";
const VOICE_OVERRIDE = process.env.NARRATE_OPENCODE_VOICE ?? "";

async function serverVoices() {
  try {
    const res = await fetch(`${NARRATE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const h = await res.json();
    return {
      narrate: h.default_voice
        ? { provider: h.default_provider, voice_id: h.default_voice }
        : null,
      session: h.auto_voice
        ? {
            provider: h.auto_provider || h.default_provider,
            voice_id: h.auto_voice,
          }
        : null,
    };
  } catch {
    return null;
  }
}

async function speak(text, kind) {
  if (!text) return;
  try {
    const payload = { message: text.slice(0, 5000) };
    if (VOICE_OVERRIDE) {
      payload.voice = VOICE_OVERRIDE;
    } else {
      const voices = await serverVoices();
      const v = voices?.[kind];
      if (v) {
        payload.voice_id = v.voice_id;
        payload.provider = v.provider;
      }
    }
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

/**
 * Matches 🤖 BOT: <text> only when it is the FINAL line of the response.
 * Not anchored this way, inline examples of the marker in the message body
 * (quotes, bullets) trigger auto-voice and speak the wrong text.
 */
function extractBotMarker(text) {
  if (!text) return null;
  const lines = text.trimEnd().split("\n");
  const match = /\u{1F916}\s*BOT:\s*(.+)$/u.exec(lines[lines.length - 1] ?? "");
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
      await speak(botText, "session");
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
          await speak(args.text, "narrate");
          return {
            output: `Spoken via narrate (voice=${VOICE_OVERRIDE || "server-default"})`,
          };
        },
      }),
    },
  };
};
