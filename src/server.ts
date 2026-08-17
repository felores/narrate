#!/usr/bin/env bun
/**
 * narrate HTTP server — provider-agnostic TTS gateway.
 *
 * Endpoints:
 *   POST /notify   { message, voice|voice_id, provider, voice_enabled, providerConfig }
 *   POST /pai      legacy alias for /notify (PAI Voice compat)
 *   GET  /health   provider health matrix + active config
 *   GET  /voices   voices.json contents
 *   POST /config   { default_provider?, default_voice?, auto_provider?, auto_voice? }
 *                  persist + apply live (no restart). null voice = clear.
 *   POST /keys     { OPENAI_API_KEY?: string, ... } upsert into ~/.env (hot reload)
 */

import { serve } from "bun";
import { spawnSync } from "child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { installLogger } from "./logger.ts";
import { loadConfig, writeConfigFile } from "./config.ts";
import { loadVoices, type VoicesRegistry } from "./voices.ts";
import {
  ALL_PROVIDERS,
  getProvider,
  PROVIDER_REGISTRY,
} from "./providers/index.ts";
import type { ProviderOptions } from "./providers/base.ts";
import { playAudio } from "./playback.ts";
import { createMcpFetchHandler } from "./mcp.ts";

// Initialize log rotation BEFORE any other code logs. Override via
// NARRATE_LOGS_DIR if you want logs somewhere other than <repo>/logs.
// Compiled binaries (bun build --compile, NARRATE_COMPILED=1) have no repo
// on disk: default to ~/.local/share/narrate unless NARRATE_DIR is set.
const isCompiled = process.env.NARRATE_COMPILED === "1";
const repoRoot = isCompiled
  ? process.env.NARRATE_DIR ?? join(homedir(), ".local", "share", "narrate")
  : dirname(dirname(fileURLToPath(import.meta.url)));
const logsDir = process.env.NARRATE_LOGS_DIR ?? join(repoRoot, "logs");
installLogger(join(logsDir, "narrate.log"), join(logsDir, "narrate-error.log"));

let serverVersion = "unknown";
try {
  serverVersion = (
    JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf-8")) as { version?: string }
  ).version ?? "unknown";
} catch {
  /* binary installs may lack package.json — leave "unknown" */
}

const config = loadConfig();
const voices: VoicesRegistry = loadVoices(config.voices_path ?? undefined);

const PORT = config.port;

console.log(`🎙️  narrate server starting on port ${PORT}`);
console.log(`🎤 Default provider: ${config.default_provider}`);
console.log(
  `🎤 Default voice: ${config.default_voice ?? "(none — set NARRATE_VOICE or default_voice)"}`,
);
console.log(
  `🎤 Session voice: ${config.auto_voice ? `${config.auto_voice} (${config.auto_provider ?? config.default_provider})` : "(= default)"}`,
);
console.log(
  `📒 Voices: ${voices.sourcePath ?? "(none — only raw voice_id calls work)"}`,
);

for (const p of ALL_PROVIDERS) {
  const h = await p.health();
  const icon = h.configured ? "✅" : "⚪";
  const reason = h.configured ? "" : ` (${h.reason})`;
  console.log(`   ${icon} ${p.label}${reason}`);
}

const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  if (ip === "localhost" || ip === "127.0.0.1" || ip === "::1") return true;
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function validateMessage(input: unknown): { valid: boolean; error?: string } {
  if (typeof input !== "string")
    return { valid: false, error: "message must be a string" };
  if (input.length === 0) return { valid: false, error: "message is empty" };
  if (input.length > 5000)
    return { valid: false, error: "message too long (max 5000)" };
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(input)) {
    return { valid: false, error: "message contains control characters" };
  }
  return { valid: true };
}

interface NotifyRequest {
  message: string;
  title?: string;
  voice?: string;
  voice_id?: string;
  voice_name?: string;
  provider?: string;
  voice_enabled?: boolean;
  providerConfig?: Record<string, unknown>;
}

async function handleNotify(req: NotifyRequest) {
  const validation = validateMessage(req.message);
  if (!validation.valid) throw new Error(validation.error);

  let providerName = req.provider ?? config.default_provider;
  let voiceId: string | null = null;
  let opts: ProviderOptions = {};

  if (req.voice) {
    const preset = voices.get(req.voice);
    if (!preset) {
      const available = Object.keys(voices.list()).join(", ") || "(none)";
      throw new Error(
        `Unknown voice preset "${req.voice}". Available: ${available}`,
      );
    }
    providerName = preset.provider;
    voiceId = preset.voice_id;
    opts = voices.toOptions(preset);
  } else {
    voiceId = req.voice_id ?? req.voice_name ?? config.default_voice;
  }

  if (!voiceId) {
    throw new Error(
      "No voice specified — pass `voice` (preset) or `voice_id` (raw), or set default_voice in config",
    );
  }

  if (!PROVIDER_REGISTRY.has(providerName)) {
    throw new Error(
      `Unknown provider "${providerName}". Available: ${[...PROVIDER_REGISTRY.keys()].join(", ")}`,
    );
  }

  if (req.providerConfig) {
    opts.providerConfig = {
      ...(opts.providerConfig ?? {}),
      ...req.providerConfig,
    };
  }

  const provider = getProvider(providerName);

  if (provider.delegated) {
    // Provider plays through its own pipeline (voicebox /speak, system say).
    // The moment generateSpeech lands, audio starts — so the WHOLE call must
    // wait its turn in the queue or a follow-up request (e.g. the next
    // "🤖 BOT:" auto-voice) would cut this narration mid-word. The response
    // still returns immediately — the slot is reserved in arrival order and
    // playback happens in the background.
    enqueuePlayback(async (waitedMs) => {
      if (waitedMs > 200) {
        console.log(
          `[queue] ⏳ ${providerName} waited ${waitedMs}ms for prior narration to finish`,
        );
      }
      const r = await provider.generateSpeech(req.message, voiceId, opts);
      if (r.delegated) {
        // Can't observe the end of playback; hold the slot by estimate.
        await sleep(estimatedPlaybackMs(req.message));
      } else if (r.buffer.byteLength > 0) {
        await playAudio(r.buffer, r.format);
      }
    });
    return {
      provider: providerName,
      voice: voiceId,
      format: "mp3",
      delegated: true,
    };
  }

  const result = await provider.generateSpeech(req.message, voiceId, opts);
  if (result.buffer.byteLength > 0) {
    await enqueuePlayback(() => playAudio(result.buffer, result.format));
  }

  return {
    provider: providerName,
    voice: voiceId,
    format: result.format,
    delegated: !!result.delegated,
  };
}

const mcpHandler = createMcpFetchHandler({
  voices,
  notify: (input) =>
    handleNotify({
      message: input.message,
      voice: input.voice,
      voice_id: input.voice_id,
      provider: input.provider,
      providerConfig: input.providerConfig,
    }),
});

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "http://localhost",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Mcp-Session-Id, Last-Event-Id, X-Narrate-Client-Id",
};

// ─── Narration queue ───────────────────────────────────────────────────────
// Serializes playback so a new /notify never interrupts one still playing.
// Why: voicebox's audio output STOPS any playback in progress when a new
// /speak arrives (verified in voicebox's play_audio_to_devices — stop_flag).
// The on-demand narrate_speak tool returns instantly (delegated), the model
// keeps going, and its follow-up "🤖 BOT:" auto-voice killed the long
// narration mid-word. With the queue every narration plays to completion.
// For delegated providers we can't observe the end of playback, so the slot
// is held for an estimated duration (chars / CHARS_PER_SECOND + padding).
let queueTail: Promise<void> = Promise.resolve();

function enqueuePlayback(run: (waitedMs: number) => Promise<void>): Promise<void> {
  const t0 = Date.now();
  const next = queueTail.then(
    () => run(Date.now() - t0),
    () => run(Date.now() - t0),
  );
  queueTail = next.catch(() => {});
  return next;
}

const CHARS_PER_SECOND = 12; // slow-ish; padding keeps the next one from cutting in

function estimatedPlaybackMs(text: string): number {
  return Math.round((text.length / CHARS_PER_SECOND) * 1000) + 400;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "localhost";

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!checkRateLimit(ip)) {
      return jsonResponse(
        { status: "error", message: "Rate limit exceeded" },
        429,
      );
    }

    if (url.pathname === "/health") {
      const providers: Record<
        string,
        { configured: boolean; reason?: string }
      > = {};
      for (const p of ALL_PROVIDERS) {
        providers[p.name] = await p.health();
      }
      return jsonResponse({
        status: "healthy",
        version: serverVersion,
        port: PORT,
        default_provider: config.default_provider,
        default_voice: config.default_voice,
        auto_provider: config.auto_provider,
        auto_voice: config.auto_voice,
        voices_path: voices.sourcePath,
        repo_dir: repoRoot,
        logs_dir: logsDir,
        voices: Object.keys(voices.list()),
        providers,
      });
    }

    if (url.pathname === "/voices" && req.method === "GET") {
      return jsonResponse({
        default_voice: voices.defaultVoice(),
        default_rate: voices.defaultRate(),
        voices: voices.list(),
      });
    }

    // ── POST /config — live-update default + session voices ────────────────
    if (url.pathname === "/config" && req.method === "POST") {
      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return jsonResponse({ status: "error", message: "Invalid JSON body" }, 400);
      }

      const patch: Partial<typeof config> = {};
      for (const key of ["default_provider", "auto_provider"] as const) {
        if (body[key] === undefined || body[key] === null) continue;
        const v = String(body[key]).toLowerCase();
        if (!PROVIDER_REGISTRY.has(v)) {
          return jsonResponse(
            { status: "error", message: `Unknown provider "${v}". Available: ${[...PROVIDER_REGISTRY.keys()].join(", ")}` },
            400,
          );
        }
        patch[key] = v;
      }
      for (const key of ["default_voice", "auto_voice"] as const) {
        if (body[key] === undefined) continue;
        const v = body[key];
        if (v === null) {
          patch[key] = null; // clear → fall back to default pair / no voice
          if (key === "auto_voice") patch.auto_provider = null;
          continue;
        }
        if (typeof v !== "string" || !v.trim() || v.trim().length > 100) {
          return jsonResponse({ status: "error", message: `Invalid ${key}: must be a non-empty string (max 100)` }, 400);
        }
        patch[key] = v.trim();
      }

      if (Object.keys(patch).length === 0) {
        return jsonResponse({ status: "error", message: "Nothing to update — send default_provider, default_voice, auto_provider or auto_voice" }, 400);
      }

      Object.assign(config, patch);
      writeConfigFile(config);
      console.log(
        `[/config] default=${config.default_provider}/${config.default_voice ?? "-"} session=${config.auto_provider ?? config.default_provider}/${config.auto_voice ?? "=default"} applied=${Object.keys(patch).join(",")}`,
      );
      return jsonResponse({
        status: "ok",
        default_provider: config.default_provider,
        default_voice: config.default_voice,
        auto_provider: config.auto_provider,
        auto_voice: config.auto_voice,
      });
    }

    // ── POST /keys — upsert API keys into ~/.env (hot reload, no restart) ──
    if (url.pathname === "/keys" && req.method === "POST") {
      const ALLOWED_KEYS = new Set([
        "ELEVENLABS_API_KEY",
        "OPENAI_API_KEY",
        "GEMINI_API_KEY",
        "XAI_API_KEY",
        "SONIOX_API_KEY",
        "FISH_AUDIO_API_KEY",
      ]);
      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return jsonResponse({ status: "error", message: "Invalid JSON body" }, 400);
      }

      const envPath = join(homedir(), ".env");
      let lines: string[] = [];
      if (existsSync(envPath)) {
        lines = readFileSync(envPath, "utf-8").split("\n");
      }
      const results: Record<string, string> = {};
      let changed = false;

      for (const [k, rawV] of Object.entries(body)) {
        if (!ALLOWED_KEYS.has(k)) {
          return jsonResponse({ status: "error", message: `Unsupported key "${k}". Allowed: ${[...ALLOWED_KEYS].join(", ")}` }, 400);
        }
        const clean = typeof rawV === "string" ? rawV.trim().replace(/^["']|["']$/g, "") : "";
        const idx = lines.findIndex((l) => l.startsWith(`${k}=`));
        if (clean) {
          if (idx >= 0) lines[idx] = `${k}=${clean}`;
          else lines.push(`${k}=${clean}`);
          process.env[k] = clean;
          results[k] = "set";
        } else {
          if (idx >= 0) lines.splice(idx, 1);
          delete process.env[k];
          results[k] = "removed";
        }
        changed = true;
      }

      if (changed) {
        writeFileSync(envPath, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8");
        try {
          chmodSync(envPath, 0o600);
        } catch {
          /* non-posix or already private — ignore */
        }
        // Keep the launchd user domain in sync: keys set via `launchctl setenv`
        // would otherwise shadow ~/.env on the next server restart. Best-effort.
        for (const [k, s] of Object.entries(results)) {
          const sub = spawnSync("launchctl", s === "set" ? ["setenv", k, process.env[k] ?? ""] : ["unsetenv", k], {
            stdio: "ignore",
          });
          if (sub.error) console.warn(`[/keys] launchctl ${s === "set" ? "setenv" : "unsetenv"} ${k} failed: ${sub.error.message}`);
        }
        console.log(`[/keys] updated ~/.env: ${Object.entries(results).map(([k, s]) => `${k}=${s}`).join(", ")}`);
      }
      return jsonResponse({ status: "ok", keys: results });
    }

    if (url.pathname === "/mcp") {
      const clientId = req.headers.get("x-narrate-client-id") ?? "-";
      const t0 = Date.now();
      try {
        const res = await mcpHandler(req);
        console.log(
          `[/mcp] ${req.method} ${res.status} ${Date.now() - t0}ms client=${clientId}`,
        );
        // Augment CORS for the MCP response without mutating its body.
        const merged = new Headers(res.headers);
        for (const [k, v] of Object.entries(corsHeaders)) merged.set(k, v);
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: merged,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[/mcp] ❌ ${msg}`);
        return jsonResponse(
          { jsonrpc: "2.0", error: { code: -32603, message: msg } },
          500,
        );
      }
    }

    if (
      (url.pathname === "/notify" || url.pathname === "/pai") &&
      req.method === "POST"
    ) {
      const t0 = Date.now();
      const tag = `[${url.pathname}]`;
      let body: NotifyRequest;
      try {
        body = (await req.json()) as NotifyRequest;
      } catch (err) {
        console.error(`${tag} ❌ invalid json from=${ip}`);
        return jsonResponse(
          { status: "error", message: "Invalid JSON body" },
          400,
        );
      }

      if (body.voice_enabled === false) {
        console.log(`${tag} ⏭  skipped (voice_enabled=false) from=${ip}`);
        return jsonResponse({
          status: "ok",
          message: "voice_enabled=false; nothing to do",
        });
      }

      const requestedProvider = body.provider ?? config.default_provider;
      const requestedVoice =
        body.voice ?? body.voice_id ?? body.voice_name ?? config.default_voice;
      const userAgent = req.headers.get("user-agent") ?? "-";
      const clientId = req.headers.get("x-narrate-client-id") ?? "-";
      console.log(
        `${tag} → provider=${requestedProvider} voice=${requestedVoice} bytes=${body.message?.length ?? 0} from=${ip} client=${clientId} ua=${userAgent.slice(0, 40)}`,
      );

      try {
        const result = await handleNotify(body);
        const ms = Date.now() - t0;
        console.log(
          `${tag} ✅ ${ms}ms provider=${result.provider} voice=${result.voice} format=${result.format} delegated=${result.delegated}`,
        );
        return jsonResponse({ status: "success", ...result });
      } catch (err) {
        const ms = Date.now() - t0;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${tag} ❌ ${ms}ms error=${msg}`);
        const isClientErr =
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("unknown") ||
          msg.toLowerCase().includes("no voice");
        return jsonResponse(
          { status: "error", message: msg },
          isClientErr ? 400 : 500,
        );
      }
    }

    return new Response(
      `narrate server\n\n` +
        `POST /notify  { message, voice|voice_id, provider, providerConfig }\n` +
        `GET  /health\n` +
        `GET  /voices\n` +
        `POST /config  { default_provider, default_voice, auto_provider, auto_voice }\n` +
        `POST /keys    { OPENAI_API_KEY, GEMINI_API_KEY, ELEVENLABS_API_KEY, XAI_API_KEY, SONIOX_API_KEY, FISH_AUDIO_API_KEY }\n` +
        `ALL  /mcp     Streamable HTTP MCP endpoint (tools: speak, list_voices, list_providers)\n`,
      { status: 200, headers: corsHeaders },
    );
  },
});

console.log(`🚀 narrate listening on http://localhost:${PORT}`);
console.log(`📡 POST http://localhost:${PORT}/notify`);
