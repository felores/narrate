/**
 * Audio playback abstraction. Used by server.ts when a provider returns
 * a non-delegated audio buffer (cloud providers). Picks the right player
 * for the platform.
 */

import { spawn } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import type { AudioFormat } from "./providers/base.ts";

const platform = process.platform;

export async function playAudio(
  buffer: ArrayBuffer,
  format: AudioFormat,
): Promise<void> {
  if (buffer.byteLength === 0) return;

  const ts = Date.now();
  const tempPath = `/tmp/narrate-${ts}.${format}`;
  writeFileSync(tempPath, Buffer.from(buffer));

  try {
    await runPlayer(tempPath);
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      /* ignore */
    }
  }
}

async function runPlayer(path: string): Promise<void> {
  const player = pickPlayer();
  return new Promise((resolve, reject) => {
    const proc = spawn(player.cmd, [...player.args, path]);
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${player.cmd} exited with code ${code}`));
    });
  });
}

function pickPlayer(): { cmd: string; args: string[] } {
  if (platform === "darwin") return { cmd: "afplay", args: [] };
  // Linux / others: ffplay handles every format we generate.
  return {
    cmd: "ffplay",
    args: ["-nodisp", "-autoexit", "-loglevel", "error"],
  };
}
