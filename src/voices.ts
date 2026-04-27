/**
 * Voices registry — loads voices.json and resolves preset names to
 * (provider, voice_id, options) tuples.
 *
 * Schema v2 (current):
 *   { default_voice, default_rate, voices: { name: { provider, voice_id, ... } } }
 *
 * Schema v1 (legacy, no `provider` field):
 *   detected when voices have `voice_name` but no `provider`. Auto-migrated
 *   in-memory to provider="system" (the v1 voice_name format matched macOS
 *   `say` voice names like "Ava (Premium)", "Slimbot").
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { ProviderOptions } from "./providers/base.ts";

export interface VoicePreset {
  provider: string;
  voice_id: string;
  rate_wpm?: number;
  rate_multiplier?: number;
  description?: string;
  type?: string;
  providerConfig?: Record<string, unknown>;
}

export interface VoicesFile {
  default_voice?: string;
  default_rate?: number;
  voices: Record<string, VoicePreset>;
}

interface LegacyVoice {
  voice_name: string;
  rate_wpm?: number;
  rate_multiplier?: number;
  description?: string;
  type?: string;
}

interface LegacyFile {
  default_rate?: number;
  voices: Record<string, LegacyVoice>;
}

export class VoicesRegistry {
  constructor(
    public file: VoicesFile,
    public sourcePath: string | null = null,
  ) {}

  get(name: string): VoicePreset | null {
    return this.file.voices[name] ?? null;
  }

  defaultVoice(): string | null {
    return this.file.default_voice ?? null;
  }

  defaultRate(): number {
    return this.file.default_rate ?? 175;
  }

  list(): Record<string, VoicePreset> {
    return this.file.voices;
  }

  toOptions(preset: VoicePreset): ProviderOptions {
    return {
      rate_wpm: preset.rate_wpm ?? this.defaultRate(),
      rate_multiplier: preset.rate_multiplier,
      providerConfig: preset.providerConfig,
    };
  }
}

export function loadVoices(explicitPath?: string): VoicesRegistry {
  const candidates = explicitPath
    ? [explicitPath]
    : [
        join(homedir(), ".config/narrate/voices.json"),
        // Legacy fallback so existing setups keep working pre-migration:
        join(homedir(), ".claude/voice-server/voices.json"),
      ];

  for (const p of candidates) {
    if (existsSync(p)) {
      return new VoicesRegistry(parseVoicesFile(p), p);
    }
  }

  return new VoicesRegistry({ voices: {} });
}

function parseVoicesFile(path: string): VoicesFile {
  const raw = JSON.parse(readFileSync(path, "utf-8"));

  if (!raw || typeof raw !== "object" || !raw.voices) {
    throw new Error(`Invalid voices.json at ${path}: missing "voices" key`);
  }

  // Detect legacy v1 (no `provider` field on any voice) → assume system.
  const allLegacy =
    raw.voices &&
    Object.values(raw.voices).length > 0 &&
    Object.values(raw.voices).every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        !("provider" in v) &&
        "voice_name" in v,
    );

  if (allLegacy) {
    console.warn(
      `⚠️  voices.json at ${path} uses legacy v1 schema (no "provider" field). ` +
        `Auto-migrating in-memory: provider="system" for all voices. ` +
        `Update to v2 schema with explicit "provider" per preset for full control.`,
    );
    const legacy = raw as LegacyFile;
    const voices: Record<string, VoicePreset> = {};
    for (const [name, v] of Object.entries(legacy.voices)) {
      voices[name] = {
        provider: "system",
        voice_id: v.voice_name,
        rate_wpm: v.rate_wpm,
        rate_multiplier: v.rate_multiplier,
        description: v.description,
        type: v.type,
      };
    }
    return { default_rate: legacy.default_rate, voices };
  }

  return raw as VoicesFile;
}
