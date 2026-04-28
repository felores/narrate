/**
 * Config loader for narrate.
 *
 * Resolution order (highest precedence last):
 *   1. Built-in defaults
 *   2. ~/.config/narrate/config.json    (XDG, primary)
 *   3. ~/.claude/settings.json          (legacy compat shim — only if present)
 *   4. ~/.env                            (loaded into process.env if not set)
 *   5. NARRATE_* env vars                (final overrides)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface NarrateConfig {
  port: number;
  default_provider: string;
  default_voice: string | null;
  default_rate: number;
  voices_path: string | null;
}

export const DEFAULTS: NarrateConfig = {
  port: 8888,
  // "system" is the only provider that's always available out of the box
  // (macOS `say` / Linux `espeak-ng`). First-run with zero config still works.
  // Set default_provider in ~/.config/narrate/config.json or NARRATE_PROVIDER
  // to switch.
  default_provider: "system",
  default_voice: null,
  default_rate: 175,
  voices_path: null,
};

export function configDir(): string {
  return join(homedir(), ".config/narrate");
}

export function loadConfig(): NarrateConfig {
  const cfg: NarrateConfig = { ...DEFAULTS };

  // Layer: ~/.config/narrate/config.json
  const xdgPath = join(configDir(), "config.json");
  if (existsSync(xdgPath)) {
    try {
      const parsed = JSON.parse(readFileSync(xdgPath, "utf-8"));
      Object.assign(cfg, parsed);
    } catch (err) {
      console.error(`⚠️  Failed to parse ${xdgPath}:`, err);
    }
  }

  // Layer: ~/.claude/settings.json (legacy compat)
  const claudeSettings = join(homedir(), ".claude/settings.json");
  if (existsSync(claudeSettings)) {
    try {
      const settings = JSON.parse(readFileSync(claudeSettings, "utf-8"));
      const env = settings.env ?? {};
      if (
        env.TTS_PROVIDER &&
        cfg.default_provider === DEFAULTS.default_provider
      ) {
        cfg.default_provider = String(env.TTS_PROVIDER).toLowerCase();
      }
      if (!cfg.default_voice) {
        cfg.default_voice = env.NARRATE_VOICE_ID ?? env.DA_VOICE_ID ?? null;
      }
    } catch {
      /* ignore — settings.json is optional */
    }
  }

  // Layer: ~/.env auto-load (legacy parity with original voice-server)
  loadDotenv(join(homedir(), ".env"));

  // Layer: NARRATE_* env var overrides
  if (process.env.NARRATE_PORT) {
    const n = parseInt(process.env.NARRATE_PORT, 10);
    if (!Number.isNaN(n)) cfg.port = n;
  }
  if (process.env.NARRATE_PROVIDER) {
    cfg.default_provider = process.env.NARRATE_PROVIDER.toLowerCase();
  }
  if (process.env.NARRATE_VOICE) {
    cfg.default_voice = process.env.NARRATE_VOICE;
  }
  if (process.env.NARRATE_VOICES_PATH) {
    cfg.voices_path = process.env.NARRATE_VOICES_PATH;
  }

  return cfg;
}

function loadDotenv(path: string): void {
  if (!existsSync(path)) return;
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    /* ignore */
  }
}
