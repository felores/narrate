#!/usr/bin/env bun
/**
 * narrate setup — interactive first-run wizard (and `--check` for scripts).
 *
 * Configures, in order:
 *   1. API keys → ~/.env (0600) + POST /keys if the server is running
 *   2. Default provider (+ optional voice preset) → ~/.config/narrate/config.json
 *      + POST /config if the server is running
 *   3. Harness integrations (claude, opencode, codex, pi) if installed
 *   4. Background service (launchd on macOS, systemd on Linux)
 *
 * Works in both source mode and compiled binary mode (assets are read from
 * the repo checkout, or from ~/.local/share/narrate/src for binary installs).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { configDir, configPath, loadConfig } from "./config.ts";

const HOME = homedir();
const ENV_PATH = join(HOME, ".env");

interface ProviderMeta {
  name: string;
  env: string | null;
  label: string;
  hint: string;
}

const PROVIDERS: ProviderMeta[] = [
  { name: "elevenlabs", env: "ELEVENLABS_API_KEY", label: "ElevenLabs", hint: "https://elevenlabs.io" },
  { name: "openai", env: "OPENAI_API_KEY", label: "OpenAI", hint: "https://platform.openai.com/api-keys" },
  { name: "gemini", env: "GEMINI_API_KEY", label: "Google Gemini", hint: "https://aistudio.google.com/apikey" },
  { name: "xai", env: "XAI_API_KEY", label: "xAI", hint: "https://console.x.ai" },
  { name: "soniox", env: "SONIOX_API_KEY", label: "Soniox TTS", hint: "https://console.soniox.com" },
  { name: "fish", env: "FISH_AUDIO_API_KEY", label: "Fish Audio", hint: "https://fish.audio" },
  { name: "voicebox", env: null, label: "Voicebox (local cloning)", hint: "no key — local server at 127.0.0.1:17493" },
  { name: "system", env: null, label: "System voice", hint: "no key — macOS say / Linux espeak-ng" },
];

const HARNESSES: { bin: string; dir: string; script: string; label: string }[] = [
  { bin: "claude", dir: "claude-code", script: "install.sh", label: "Claude Code" },
  { bin: "opencode", dir: "opencode", script: "install.sh", label: "OpenCode" },
  { bin: "codex", dir: "codex", script: "install.sh", label: "Codex" },
  { bin: "pi", dir: "pi", script: "install.sh", label: "Pi" },
];

const GREEN = "\x1b[32m", YELLOW = "\x1b[33m", RED = "\x1b[31m", BOLD = "\x1b[1m", NC = "\x1b[0m";

// ─── ~/.env helpers ──────────────────────────────────────────────────────────
export function readDotenv(): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(ENV_PATH)) return map;
  for (const line of readFileSync(ENV_PATH, "utf-8").split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

export function writeDotenv(entries: Map<string, string>): void {
  const lines: string[] = [];
  for (const [k, v] of entries) lines.push(`${k}=${v}`);
  mkdirSync(dirname(ENV_PATH), { recursive: true });
  writeFileSync(ENV_PATH, lines.join("\n") + "\n", { mode: 0o600 });
}

// ─── detection ───────────────────────────────────────────────────────────────
function repoAssetsDir(): string | null {
  const candidates = [
    dirname(dirname(fileURLToPath(import.meta.url))),
    process.env.NARRATE_DIR ? join(process.env.NARRATE_DIR, "src") : null,
    join(HOME, ".local/share/narrate/src"),
    join(HOME, ".local/share/narrate"),
  ];
  for (const c of candidates) {
    if (c && existsSync(join(c, "integrations"))) return c;
  }
  return null;
}

function serverUrl(): string {
  const cfg = loadConfig();
  return process.env.NARRATE_URL ?? `http://localhost:${cfg.port}`;
}

async function serverHealth(url: string): Promise<{ ok: boolean; health?: any; error?: string }> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true, health: await res.json() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function commandOnPath(bin: string): boolean {
  const dirs = (process.env.PATH ?? "").split(":");
  for (const d of dirs) {
    if (!d) continue;
    try {
      if (existsSync(join(d, bin))) return true;
    } catch { /* ignore */ }
  }
  return false;
}

function isCompiled(): boolean {
  return process.env.NARRATE_COMPILED === "1";
}

// ─── interactive helpers ─────────────────────────────────────────────────────
// Note: Bun's node:readline drops buffered input after the first question
// (confirmed with a pty and with a pipe). We read stdin lines ourselves.
async function* inputLines(): AsyncGenerator<string> {
  let buf = "";
  for await (const chunk of process.stdin as AsyncIterable<string | Buffer>) {
    // normalize line endings: canonical mode sends \n, raw mode sends \r
    buf += (typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8")).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    let idx: number;
    while ((idx = buf.indexOf("\n")) >= 0) {
      yield buf.slice(0, idx);
      buf = buf.slice(idx + 1);
    }
  }
  if (buf.trim()) yield buf;
}

let lineGen: AsyncGenerator<string> | null = null;
function nextInput(): Promise<string> {
  if (!lineGen) lineGen = inputLines();
  return lineGen.next().then((r) => r.value ?? "");
}

async function ask(q: string, def?: string): Promise<string> {
  process.stdout.write(`${q}${def !== undefined ? ` [${def}]` : ""}: `);
  const a = (await nextInput()).trim();
  if (a === "" && def !== undefined) return def;
  return a;
}

async function confirm(q: string, def: boolean): Promise<boolean> {
  const a = (await ask(q, def ? "y" : "n")).toLowerCase();
  return a === "y" || a === "yes" || a === "";
}

async function askSecret(q: string): Promise<string> {
  process.stdout.write(q);
  // Raw mode: the TTY doesn't echo keystrokes (and line endings arrive as \r,
  // which inputLines normalizes). Reading through the same generator avoids
  // deadlock when input was already buffered (pipes, pasted bursts).
  const raw = process.stdin.isTTY && typeof (process.stdin as any).setRawMode === "function";
  if (raw) (process.stdin as any).setRawMode(true);
  let val = "";
  try {
    val = (await nextInput()).trim();
  } finally {
    if (raw) (process.stdin as any).setRawMode(false);
  }
  process.stdout.write("\n");
  return val;
}

function printSection(title: string): void {
  console.log(`\n${BOLD}${title}${NC}`);
}

function printOk(msg: string): void {
  console.log(`  ${GREEN}✓${NC} ${msg}`);
}

function printWarn(msg: string): void {
  console.log(`  ${YELLOW}⚠${NC} ${msg}`);
}

// ─── apply steps ─────────────────────────────────────────────────────────────
async function applyKeys(server: string, keys: Map<string, string>, changed: string[]): Promise<void> {
  if (changed.length === 0) return;
  writeDotenv(keys);
  printOk(`wrote ${changed.join(", ")} to ${ENV_PATH} (0600)`);
  const h = await serverHealth(server);
  if (h.ok) {
    const payload: Record<string, string> = {};
    for (const k of changed) payload[k] = keys.get(k) ?? "";
    const res = await fetch(`${server}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    printOk(res.ok ? "server hot-reloaded the keys (no restart needed)" : `server /keys returned ${res.status}`);
  } else {
    printWarn(`server not running — keys apply on next start (${server})`);
  }
}

async function applyDefaults(server: string, provider: string, voice: string | null): Promise<void> {
  const cfg = loadConfig();
  cfg.default_provider = provider;
  if (voice) cfg.default_voice = voice;
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configPath(), JSON.stringify(cfg, null, 2) + "\n", "utf-8");
  printOk(`wrote default provider=${provider}${voice ? ` voice=${voice}` : ""} to ${configPath()}`);
  const h = await serverHealth(server);
  if (h.ok) {
    const res = await fetch(`${server}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_provider: provider, ...(voice ? { default_voice: voice } : {}) }),
    });
    printOk(res.ok ? "server applied it live" : `server /config returned ${res.status}`);
  }
}

// ─── harness + service steps ─────────────────────────────────────────────────
function runScript(cwd: string, script: string, env?: Record<string, string>): void {
  const full = join(cwd, script);
  if (!existsSync(full)) {
    printWarn(`missing: ${full}`);
    return;
  }
  console.log(`  ${YELLOW}→${NC} running ${full}`);
  const proc = Bun.spawn(["bash", full], { cwd, stdio: ["inherit", "inherit", "inherit"], env: { ...process.env, ...env } });
  proc.exited.then((code) => {
    if (code === 0) printOk(`${script} done`);
    else printWarn(`${script} exited ${code} (may be fine if already installed)`);
  }).catch(() => printWarn(`${script} failed to run`));
}

function configuredProviderNames(env: Map<string, string>): string[] {
  const names: string[] = ["system"];
  for (const p of PROVIDERS) {
    if (p.env && env.has(p.env)) names.push(p.name);
  }
  if (env.has("VOICEBOX_URL")) names.push("voicebox");
  return names;
}

// ─── interactive wizard ──────────────────────────────────────────────────────
export async function runSetup(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("narrate setup is interactive. Use `narrate setup --check` for a non-interactive status report.");
    process.exit(1);
  }
  const server = serverUrl();
  const env = readDotenv();
  const mode = isCompiled() ? "binary" : "source";

  console.log(`${BOLD}narrate setup${NC} — ${mode} mode`);
  const h = await serverHealth(server);
  if (h.ok) {
    printOk(`server running at ${server} (provider=${h.health.default_provider}, voice=${h.health.default_voice ?? "default"})`);
  } else {
    printWarn(`server not running (${h.error ?? "unknown"}) — config changes apply on next start`);
  }

  // 1. API keys
  printSection("API keys");
  const changed: string[] = [];
  for (const p of PROVIDERS) {
    if (!p.env) continue;
    if (env.has(p.env)) {
      console.log(`  ${GREEN}✓${NC} ${p.label} configured`);
      continue;
    }
    if (await confirm(`Add ${p.label} key? (${p.hint})`, false)) {
      const key = await askSecret(`  ${p.label} API key: `);
      if (key) {
        env.set(p.env, key);
        changed.push(p.env);
      }
    }
  }
  if (changed.length > 0) await applyKeys(server, env, changed);

  // 2. Default provider + voice
  printSection("Default voice");
  const available = configuredProviderNames(env);
  console.log("  Available providers:");
  available.forEach((n, i) => console.log(`    ${i + 1}) ${n}`));
  const pick = await ask("  Pick provider", available[0] ?? "system");
  const provider = available[Number(pick) - 1] ?? pick;
  if (!available.includes(provider)) {
    printWarn(`unknown provider '${provider}' — writing anyway`);
  }
  let voice: string | null = null;
  const h2 = await serverHealth(server);
  if (h2.ok && Array.isArray(h2.health.voices) && h2.health.voices.length > 0) {
    const voices = h2.health.voices as string[];
    console.log("  Presets:");
    voices.slice(0, 15).forEach((v, i) => console.log(`    ${i + 1}) ${v}`));
    if (voices.length > 15) console.log(`    ... (${voices.length - 15} more)`);
    const vpick = await ask("  Pick a voice preset (Enter to keep default)", "");
    if (vpick) voice = voices[Number(vpick) - 1] ?? vpick;
  } else {
    printWarn("no voice presets found (voices.json missing) — provider default will be used");
  }
  await applyDefaults(server, provider, voice);

  // 3. Harness integrations
  const assets = repoAssetsDir();
  if (!assets) {
    printWarn("repo assets not found — harness integration installers unavailable (binary install without src download?)");
  } else {
    printSection("Harness integrations");
    for (const hs of HARNESSES) {
      if (!commandOnPath(hs.bin)) continue;
      if (await confirm(`Install narrate for ${hs.label}?`, false)) {
        runScript(join(assets, "integrations", hs.dir), hs.script);
      }
    }
  }

  // 4. Background service
  printSection("Background service");
  const assetsDir = assets ?? null;
  const binDir = process.env.NARRATE_DIR ? join(process.env.NARRATE_DIR, "bin") : join(HOME, ".local/share/narrate/bin");
  const bin = existsSync(binDir)
    ? readdirSync(binDir).find((f) => f.startsWith("narrate-server") && !f.includes("windows"))
    : undefined;
  const h3 = await serverHealth(server);
  if (h3.ok) {
    printOk("server already running — no service changes needed");
  } else if (!assetsDir) {
    printWarn("service installers not available (no repo assets)");
  } else {
    if (await confirm("Install auto-start service?", true)) {
      if (process.platform === "darwin") {
        runScript(join(assetsDir, "service", "launchd"), "install.sh", bin ? { NARRATE_BIN: join(binDir, bin) } : undefined);
      } else if (process.platform === "linux") {
        runScript(join(assetsDir, "service", "systemd"), "install.sh", bin ? { NARRATE_BIN: join(binDir, bin) } : undefined);
      } else {
        printWarn(`no service installer for ${process.platform} — run narrate-server manually at login`);
      }
    }
  }

  printSection("Done");
  console.log("  Try:  narrate verify   →  narrate \"Hello\"\n");
}

// ─── non-interactive check ───────────────────────────────────────────────────
export async function runSetupCheck(): Promise<void> {
  const env = readDotenv();
  const h = await serverHealth(serverUrl());
  console.log(`narrate setup — status report (${isCompiled() ? "binary" : "source"} mode)`);
  console.log("");
  if (h.ok) {
    console.log(`server   ${GREEN}✅${NC} ${serverUrl()} (${h.health.default_provider}/${h.health.default_voice ?? "default"})`);
  } else {
    console.log(`server   ${YELLOW}⚪${NC} not running (${h.error ?? ""})`);
  }
  console.log("");
  console.log("providers:");
  for (const p of PROVIDERS) {
    const has = p.env ? env.has(p.env) : true;
    console.log(`  ${has ? GREEN + "✅" : YELLOW + "⚪"}${NC} ${p.label}${p.env ? "" : "  (no key needed)"}`);
  }
  console.log("");
  console.log("harnesses:");
  for (const hs of HARNESSES) {
    console.log(`  ${commandOnPath(hs.bin) ? GREEN + "✅" + NC : "⚪"} ${hs.bin}${commandOnPath(hs.bin) ? "" : "  (not found)"}`);
  }
  const assets = repoAssetsDir();
  console.log("");
  console.log(`assets   ${assets ? GREEN + "✅" + NC : YELLOW + "⚠" + NC} ${assets ?? "no repo assets found (service/integrations unavailable)"}`);
  console.log(`keys     ${ENV_PATH}${existsSync(ENV_PATH) ? "" : "  (does not exist yet)"}`);
  console.log(`config   ${configPath()}`);
}
