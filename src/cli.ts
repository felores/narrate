#!/usr/bin/env bun
/**
 * narrate CLI — POSTs text to the local narrate server.
 *
 * Usage:
 *   narrate "text"
 *   narrate --voice researcher "text"
 *   narrate --provider system --id Samantha "text"
 *   echo "text" | narrate
 */

import { loadConfig } from "./config.ts";

const config = loadConfig();

interface CliArgs {
  voice?: string;
  voiceId?: string;
  provider?: string;
  serverUrl: string;
  quiet: boolean;
  text: string;
}

const HELP = `narrate - speak text via the narrate TTS gateway

Usage:
  narrate [options] "text to speak"
  echo "text" | narrate [options]

Options:
  -v, --voice NAME      Voice preset from voices.json (e.g. fred, researcher)
  -i, --id ID           Raw provider voice id (bypasses preset registry)
  -p, --provider NAME   Provider: elevenlabs, openai, gemini, xai, voicebox, system
  -u, --url URL         Server URL (default http://localhost:${config.port})
  -q, --quiet           Suppress output
  -h, --help            Show this help

Env:
  NARRATE_URL           Override default server URL
  NARRATE_VOICE         Default preset (fallback for omitted --voice)

Examples:
  narrate "Deploy complete"
  narrate --voice researcher "Findings ready"
  narrate --provider system --id Samantha "Local fallback"
  narrate --provider voicebox --voice Morgan "Local cloned voice"
`;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    serverUrl: process.env.NARRATE_URL ?? `http://localhost:${config.port}`,
    quiet: false,
    text: "",
  };
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(HELP);
        process.exit(0);
      case "-q":
      case "--quiet":
        args.quiet = true;
        break;
      case "-v":
      case "--voice":
        args.voice = argv[++i];
        break;
      case "-i":
      case "--id":
        args.voiceId = argv[++i];
        break;
      case "-p":
      case "--provider":
        args.provider = argv[++i];
        break;
      case "-u":
      case "--url":
        args.serverUrl = argv[++i];
        break;
      default:
        if (arg.startsWith("-")) {
          fatal(`Unknown option: ${arg}\nUse --help for usage`);
        }
        rest.push(arg);
    }
  }

  args.text = rest.join(" ");
  return args;
}

function info(args: CliArgs, msg: string): void {
  if (!args.quiet) console.error(`→ ${msg}`);
}

function fatal(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.text && !process.stdin.isTTY) {
    args.text = await readStdin();
  }

  if (!args.text) {
    fatal("No text provided. Use --help for usage.");
  }

  if (args.text.length > 5000) {
    info(args, `Text truncated to 5000 chars (was ${args.text.length})`);
    args.text = args.text.slice(0, 5000);
  }

  // Health probe
  try {
    const res = await fetch(`${args.serverUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) fatal(`Server unhealthy at ${args.serverUrl}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fatal(
      `Server not reachable at ${args.serverUrl}: ${msg}\n` +
        `Start it with: bun run src/server.ts`,
    );
  }

  const body: Record<string, unknown> = {
    message: args.text,
    title: "Narration",
    voice_enabled: true,
  };
  if (args.voice) body.voice = args.voice;
  if (args.voiceId) body.voice_id = args.voiceId;
  if (args.provider) body.provider = args.provider;
  if (!args.voice && !args.voiceId && process.env.NARRATE_VOICE) {
    body.voice = process.env.NARRATE_VOICE;
  }

  info(args, `Narrating via ${args.provider ?? "default"}...`);

  const response = await fetch(`${args.serverUrl}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = (await response.json()) as {
    status: string;
    message?: string;
    provider?: string;
    voice?: string;
    delegated?: boolean;
  };

  if (result.status === "success") {
    info(
      args,
      `OK (provider=${result.provider}, voice=${result.voice}${result.delegated ? ", delegated" : ""})`,
    );
    process.exit(0);
  }
  fatal(result.message ?? "Unknown error");
}

main().catch((err) => fatal(err instanceof Error ? err.message : String(err)));
