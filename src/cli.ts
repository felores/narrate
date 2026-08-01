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
import { runSetup, runSetupCheck } from "./setup.ts";

const config = loadConfig();

interface CliArgs {
  voice?: string;
  voiceId?: string;
  provider?: string;
  language?: string;
  instruct?: string;
  serverUrl: string;
  quiet: boolean;
  text: string;
  flags: string[];
}

const HELP = `narrate - speak text via the narrate TTS gateway

Usage:
  narrate [options] "text to speak"
  narrate verify [--test]
  echo "text" | narrate [options]

Subcommands:
  verify                Print server + provider health (no API calls)
  verify --test         Same, plus smoke-test each configured provider
                        (WARNING: each cloud test consumes ~1 API call)
  setup                 Interactive first-run wizard: keys, default voice,
                        harness integrations, background service
  setup --check         Non-interactive setup status report

Options:
  -v, --voice NAME      Voice preset from voices.json (e.g. fred, researcher)
  -i, --id ID           Raw provider voice id (bypasses preset registry)
  -p, --provider NAME   Provider: elevenlabs, openai, gemini, xai, fish, voicebox, system
  -l, --language LANG   Force generation language (e.g. es, en, ja, fr).
                        Useful with cross-language voices: a voicebox Kokoro
                        Bella (en-trained) speaks proper Spanish phonetics
                        with --language es.
  --instruct TEXT       Natural-language delivery hint (Qwen CustomVoice
                        only). E.g. "warm conversational tone",
                        "broadcast news quality", "speak slowly with
                        emphasis". Other engines ignore this.
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
  narrate --provider voicebox --id Bella --language es "Hola, soy Bella en español"
  narrate --provider voicebox --id Ryan --instruct "warm conversational" "Hi there"
  narrate verify                  # health snapshot
  narrate verify --test           # also play 1 sample per provider
`;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    serverUrl: process.env.NARRATE_URL ?? `http://localhost:${config.port}`,
    quiet: false,
    text: "",
    flags: [],
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
      case "--test":
      case "--check":
        args.flags.push(arg.slice(2));
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
      case "-l":
      case "--language":
        args.language = argv[++i];
        break;
      case "--instruct":
        args.instruct = argv[++i];
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

interface HealthResponse {
  status: string;
  port: number;
  default_provider: string;
  default_voice: string | null;
  voices_path: string | null;
  voices: string[];
  providers: Record<string, { configured: boolean; reason?: string; credits?: string }>;
}

async function runVerify(serverUrl: string, runTests: boolean): Promise<void> {
  let health: HealthResponse;
  try {
    const res = await fetch(`${serverUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) fatal(`Server unhealthy at ${serverUrl} (${res.status})`);
    health = (await res.json()) as HealthResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fatal(`Server not reachable at ${serverUrl}: ${msg}`);
  }

  console.log(`narrate doctor — checking ${serverUrl}`);
  console.log("");
  console.log(`✅ server     ${health.status} on port ${health.port}`);
  console.log(
    `   default   provider=${health.default_provider} voice=${health.default_voice ?? "(none)"}`,
  );
  console.log(
    `   voices    ${health.voices_path ?? "(none — only raw voice_id calls work)"}`,
  );
  console.log(
    `   presets   ${health.voices.length} (${health.voices.slice(0, 8).join(", ")}${health.voices.length > 8 ? "..." : ""})`,
  );
  console.log("");
  console.log("providers:");
  for (const [name, p] of Object.entries(health.providers)) {
    const icon = p.configured ? "✅" : "⚪";
    const reason = p.reason ? ` (${p.reason})` : "";
    const credits = p.configured && p.credits ? `  — ${p.credits}` : "";
    console.log(`  ${icon} ${name}${reason}${credits}`);
  }

  if (!runTests) {
    console.log("");
    console.log(
      "(run `narrate verify --test` to play a short sample on each configured provider)",
    );
    return;
  }

  console.log("");
  console.log("running smoke tests on configured providers...");
  for (const [name, p] of Object.entries(health.providers)) {
    if (!p.configured) continue;
    process.stdout.write(`  → ${name}... `);
    try {
      const sampleVoice = await sampleVoiceFor(name);
      const t0 = Date.now();
      const res = await fetch(`${serverUrl}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Test ${name}`,
          provider: name,
          voice_id: sampleVoice,
          voice_enabled: true,
        }),
      });
      const ms = Date.now() - t0;
      const body = (await res.json()) as { status: string; message?: string };
      if (body.status === "success") {
        console.log(`OK (${ms}ms, voice=${sampleVoice})`);
      } else {
        console.log(`FAILED — ${body.message ?? "(no message)"}`);
      }
    } catch (err) {
      console.log(
        `FAILED — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

async function sampleVoiceFor(provider: string): Promise<string> {
  switch (provider) {
    case "elevenlabs":
      // Free tier can't use library voices via API (402) — premade works.
      if (process.env.NARRATE_TEST_ELEVENLABS_VOICE) return process.env.NARRATE_TEST_ELEVENLABS_VOICE;
      try {
        if (process.env.ELEVENLABS_API_KEY) {
          const res = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const voices = (await res.json()) as { voices?: { voice_id: string; category?: string }[] };
            const premade = voices.voices?.find((v) => v.category === "premade");
            if (premade) return premade.voice_id;
          }
        }
      } catch { /* fall through to Rachel */ }
      return "21m00Tcm4TlvDq8ikWAM"; // Rachel (public library)
    case "openai":
      return "alloy";
    case "gemini":
      return "Kore";
    case "xai":
      return "ara";
    case "fish":
      // Fish voices are user-created models — use the first trained one.
      if (process.env.NARRATE_TEST_FISH_VOICE) return process.env.NARRATE_TEST_FISH_VOICE;
      try {
        const { FishProvider } = await import("./providers/fish.ts");
        const voices = await new FishProvider().listVoices();
        return voices[0]?.id ?? "default";
      } catch {
        return "default";
      }
    case "voicebox":
      if (process.env.NARRATE_TEST_VOICEBOX_PROFILE) return process.env.NARRATE_TEST_VOICEBOX_PROFILE;
      try {
        const { VoiceboxProvider } = await import("./providers/voicebox.ts");
        const voices = await new VoiceboxProvider().listVoices();
        return voices[0]?.id ?? "default";
      } catch {
        return "default";
      }
    case "system":
      return process.platform === "darwin" ? "Samantha" : "default";
    default:
      return "default";
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Subcommand: verify
  if (args.text === "verify" || args.text.startsWith("verify ")) {
    const runTests = args.flags.includes("test") || args.text.includes("--test");
    return runVerify(args.serverUrl, runTests);
  }

  // Subcommand: setup
  if (args.text === "setup" || args.text.startsWith("setup ")) {
    if (args.flags.includes("check")) return runSetupCheck();
    return runSetup();
  }

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
  // providerConfig overrides — these win over preset providerConfig and
  // over auto-resolved profile defaults (e.g. voicebox profile.language).
  const providerConfig: Record<string, unknown> = {};
  if (args.language) providerConfig.language = args.language;
  if (args.instruct) providerConfig.instruct = args.instruct;
  if (Object.keys(providerConfig).length > 0) {
    body.providerConfig = providerConfig;
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
