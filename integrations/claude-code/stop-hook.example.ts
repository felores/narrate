#!/usr/bin/env bun
/**
 * Example Claude Code Stop hook that narrates the assistant's response.
 *
 * Convention: assistant ends each response with `🤖 BOT: <short text>`.
 * This hook extracts that line and pipes it to `narrate`.
 *
 * Adjust MARKER_REGEX, VOICE_PRESET, and the path to `narrate` for your
 * own setup.
 */

import { spawn } from "child_process";

const MARKER_REGEX = /🤖\s*BOT:\s*(.+?)(?:\n|$)/;
const VOICE_PRESET = process.env.NARRATE_HOOK_VOICE ?? null; // e.g. "researcher"
const NARRATE_BIN = process.env.NARRATE_BIN ?? "narrate";

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

function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    const args = ["--quiet"];
    if (VOICE_PRESET) args.push("--voice", VOICE_PRESET);
    args.push(text);
    const proc = spawn(NARRATE_BIN, args, {
      detached: true,
      stdio: "ignore",
    });
    proc.unref();
    resolve();
  });
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

  const match = MARKER_REGEX.exec(message);
  if (!match) return; // no marker, no narration

  const text = match[1].trim();
  if (!text) return;

  await speak(text);
}

main().catch(() => {
  // Hooks must never crash — silent failure is the right default for voice.
});
