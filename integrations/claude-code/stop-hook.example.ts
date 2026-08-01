#!/usr/bin/env bun
/**
 * Example Claude Code Stop hook that narrates the assistant's response.
 *
 * Convention: assistant ends each response with `🤖 BOT: <short text>`.
 * This hook extracts that line and pipes it to `narrate`.
 *
 * The voice comes from the narrate server's session voice (auto_voice in
 * config.json, changeable from the SwiftBar menu). Set NARRATE_HOOK_VOICE to
 * a voices.json preset to force an override.
 *
 * Adjust MARKER_REGEX and the path to `narrate` for your own setup.
 */

import { spawn } from "child_process";

const MARKER_REGEX = /🤖\s*BOT:\s*(.+)$/;

/**
 * Extract the 🤖 BOT: text only when the marker is the FINAL line of the
 * response — inline examples of the marker in the message body (quotes,
 * bullets) must not trigger auto-voice.
 */
function extractBotMarker(message: string): string | null {
  const lines = message.trimEnd().split("\n");
  const match = MARKER_REGEX.exec(lines[lines.length - 1] ?? "");
  if (!match) return null;
  const text = match[1].trim();
  return text || null;
}
const VOICE_PRESET = process.env.NARRATE_HOOK_VOICE ?? null; // e.g. "researcher"
const NARRATE_BIN = process.env.NARRATE_BIN ?? "narrate";
const NARRATE_URL = process.env.NARRATE_URL ?? "http://localhost:8888";

/** Session voice pair from /health (auto_voice), null when unset. */
async function sessionVoice(): Promise<{ provider: string; voice_id: string } | null> {
  try {
    const res = await fetch(`${NARRATE_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const h = await res.json();
    if (!h.auto_voice) return null;
    return { provider: h.auto_provider || h.default_provider, voice_id: h.auto_voice };
  } catch {
    return null;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

interface StopHookPayload {
  transcript_path?: string;
  // Other Claude Code hook fields omitted — only transcript_path is used here.
}

async function getLastAssistantMessage(
  payload: StopHookPayload,
): Promise<string | null> {
  if (!payload.transcript_path) return null;
  const fs = await import("fs/promises");
  try {
    const content = await fs.readFile(payload.transcript_path, "utf-8");
    const lines = content.split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const event = JSON.parse(lines[i]);
      if (event?.type === "assistant" && event?.message?.content) {
        const blocks = event.message.content;
        const textBlock = blocks.find(
          (b: { type: string }) => b.type === "text",
        );
        if (textBlock?.text) return textBlock.text as string;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function speak(text: string): Promise<void> {
  const args = ["--quiet"];
  if (VOICE_PRESET) {
    args.push("--voice", VOICE_PRESET);
  } else {
    const v = await sessionVoice();
    if (v) {
      args.push("--id", v.voice_id, "--provider", v.provider);
    }
  }
  args.push(text);
  const proc = spawn(NARRATE_BIN, args, {
    detached: true,
    stdio: "ignore",
  });
  proc.unref();
}

async function main() {
  const raw = await readStdin();
  let payload: StopHookPayload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    /* hook may pass plain text — ignore */
  }

  const message = await getLastAssistantMessage(payload);
  if (!message) return;

  const text = extractBotMarker(message);
  if (!text) return; // no marker, no narration

  await speak(text);
}

main().catch(() => {
  // Hooks must never crash — silent failure is the right default for voice.
});
