/**
 * In-process log rotation for narrate.
 *
 * Replaces global console.log / console.error with size-rotating file
 * writers. Rotates when the active file exceeds NARRATE_LOG_MAX_BYTES
 * (default 10 MB) and keeps the last NARRATE_LOG_KEEP rotations
 * (default 5).
 *
 * Disable entirely via NARRATE_LOG_DISABLED=1 (then console.* keeps its
 * default stdout/stderr behavior — useful for `bun run src/server.ts`
 * during development).
 *
 * The launchd / systemd unit should redirect its own StandardOutPath /
 * StandardErrorPath to a SEPARATE file (e.g. logs/launchd.log) — those
 * only capture pre-init startup and crash output. The real per-request
 * log lives in logs/narrate.log via this rotator.
 */

import {
  existsSync,
  statSync,
  renameSync,
  appendFileSync,
  unlinkSync,
  mkdirSync,
} from "fs";
import { dirname } from "path";

const MAX_BYTES = Math.max(
  1024,
  parseInt(process.env.NARRATE_LOG_MAX_BYTES ?? "10485760", 10), // 10 MiB
);
const KEEP = Math.max(1, parseInt(process.env.NARRATE_LOG_KEEP ?? "5", 10));
const DISABLED = process.env.NARRATE_LOG_DISABLED === "1";
const SIZE_CHECK_EVERY = 50;

class RotatingFile {
  private writes = 0;

  constructor(public file: string) {
    mkdirSync(dirname(file), { recursive: true });
  }

  write(line: string): void {
    const out = line.endsWith("\n") ? line : line + "\n";
    try {
      appendFileSync(this.file, out);
    } catch {
      /* never let logging crash the server */
    }
    this.writes++;
    if (this.writes >= SIZE_CHECK_EVERY) {
      this.writes = 0;
      this.maybeRotate();
    }
  }

  private maybeRotate(): void {
    let size = 0;
    try {
      size = statSync(this.file).size;
    } catch {
      return;
    }
    if (size < MAX_BYTES) return;

    // Drop the oldest if it exists at the boundary.
    const oldest = `${this.file}.${KEEP}`;
    if (existsSync(oldest)) {
      try {
        unlinkSync(oldest);
      } catch {
        /* ignore */
      }
    }

    // Shift: file.(K-1) → file.K, ..., file.1 → file.2
    for (let i = KEEP - 1; i >= 1; i--) {
      const src = `${this.file}.${i}`;
      const dst = `${this.file}.${i + 1}`;
      if (existsSync(src)) {
        try {
          renameSync(src, dst);
        } catch {
          /* ignore */
        }
      }
    }

    // Move current: file → file.1, then a fresh file gets created on next write.
    try {
      renameSync(this.file, `${this.file}.1`);
    } catch {
      /* ignore */
    }
  }
}

function fmt(args: unknown[]): string {
  const ts = new Date().toISOString();
  const parts = args.map((a) => {
    if (typeof a === "string") return a;
    if (typeof a === "number" || typeof a === "boolean") return String(a);
    if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ""}`;
    try {
      return JSON.stringify(a);
    } catch {
      return String(a);
    }
  });
  return `${ts} ${parts.join(" ")}`;
}

export function installLogger(stdoutFile: string, stderrFile: string): void {
  if (DISABLED) return;

  const out = new RotatingFile(stdoutFile);
  const err = new RotatingFile(stderrFile);

  console.log = (...args: unknown[]) => out.write(fmt(args));
  console.info = (...args: unknown[]) => out.write(fmt(args));
  console.error = (...args: unknown[]) => err.write(fmt(args));
  console.warn = (...args: unknown[]) => err.write(fmt(args));
}

/** Test helper: force-rotate stdout once. Used from `narrate verify`. */
export function rotateOnce(file: string): void {
  const r = new RotatingFile(file);
  // Force rotation by setting writes high
  // @ts-expect-error access private for forced rotate
  r.writes = SIZE_CHECK_EVERY;
  // Trigger a no-op append to reach the rotation check path
  r.write("");
}
