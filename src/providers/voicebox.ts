/**
 * Voicebox provider — proxy to a locally-running voicebox.sh instance.
 *
 * Voicebox (https://github.com/jamiepine/voicebox) is a desktop voice studio
 * exposing a REST API at http://127.0.0.1:17493 by default. This provider
 * uses POST /speak which speaks via voicebox's own UI/audio pipeline —
 * narrate must NOT replay the (empty) buffer afterwards (delegated=true).
 *
 * Env:
 *   VOICEBOX_URL          Override base URL (default http://127.0.0.1:17493)
 *   VOICEBOX_CLIENT_ID    Override client identifier (default "narrate")
 */

import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  type VoiceInfo,
  assertOk,
} from "./base.ts";

const VOICEBOX_URL = process.env.VOICEBOX_URL ?? "http://127.0.0.1:17493";
const CLIENT_ID = process.env.VOICEBOX_CLIENT_ID ?? "narrate";

interface VoiceboxConfig {
  personality?: boolean;
  language?: string;
  /**
   * Natural-language delivery instruction (Qwen CustomVoice only).
   * Examples: "warm and friendly conversational tone",
   * "professional and authoritative, broadcast quality",
   * "speak slowly with emphasis", "whisper, intimate and close".
   * Other engines ignore this field.
   */
  instruct?: string;
  /** When true, use /generate (return audio buffer) instead of /speak (delegated playback). */
  return_audio?: boolean;
}

interface VoiceboxProfile {
  id: string;
  name?: string;
  language?: string;
}

const PROFILE_CACHE_TTL_MS = 60_000;

export class VoiceboxProvider implements Provider {
  readonly name = "voicebox";
  readonly label = "Voicebox (local)";
  readonly delegated = true;

  private profileCache: Map<string, VoiceboxProfile> | null = null;
  private profileCacheAt = 0;

  /**
   * Look up profile metadata (id, language) by name.
   * Voicebox /speak does NOT auto-pull language from the profile — it
   * defaults to "en" if not specified — so we resolve it here. Cached
   * 60s to avoid an extra round-trip per generation.
   */
  private async resolveProfile(name: string): Promise<VoiceboxProfile | null> {
    const now = Date.now();
    if (
      !this.profileCache ||
      now - this.profileCacheAt > PROFILE_CACHE_TTL_MS
    ) {
      try {
        const res = await fetch(`${VOICEBOX_URL}/profiles`, {
          headers: { "X-Voicebox-Client-Id": CLIENT_ID },
          signal: AbortSignal.timeout(2000),
        });
        if (!res.ok) return null;
        const profiles = (await res.json()) as VoiceboxProfile[];
        this.profileCache = new Map(profiles.map((p) => [p.name ?? p.id, p]));
        this.profileCacheAt = now;
      } catch {
        return null;
      }
    }
    return this.profileCache?.get(name) ?? null;
  }

  async health(): Promise<ProviderHealth> {
    try {
      const res = await fetch(`${VOICEBOX_URL}/profiles`, {
        signal: AbortSignal.timeout(2000),
        headers: { "X-Voicebox-Client-Id": CLIENT_ID },
      });
      return res.ok
        ? { configured: true }
        : {
            configured: false,
            reason: `voicebox at ${VOICEBOX_URL} returned ${res.status}`,
          };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        configured: false,
        reason: `voicebox not reachable at ${VOICEBOX_URL}: ${msg}`,
      };
    }
  }

  async generateSpeech(
    text: string,
    voice: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    const cfg = (opts.providerConfig ?? {}) as VoiceboxConfig;

    if (cfg.return_audio) {
      // /generate returns audio buffer; narrate handles playback.
      const response = await fetch(`${VOICEBOX_URL}/generate`, {
        method: "POST",
        signal: opts.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Voicebox-Client-Id": CLIENT_ID,
        },
        body: JSON.stringify({
          text,
          profile_id: voice,
          language: cfg.language ?? "en",
        }),
      });
      await assertOk(response, this.name);
      return { buffer: await response.arrayBuffer(), format: "wav" };
    }

    // Resolve language: explicit cfg.language wins; otherwise pull it
    // from the profile (voicebox /speak does NOT default to
    // profile.language — it defaults to "en" — so a Spanish-trained voice
    // would speak English without this lookup).
    let language = cfg.language;
    if (!language) {
      const profile = await this.resolveProfile(voice);
      language = profile?.language;
    }

    // Default: /speak — voicebox plays through its own audio pipeline.
    const speakBody: Record<string, unknown> = { text, profile: voice };
    if (language) speakBody.language = language;
    if (cfg.personality !== undefined) speakBody.personality = cfg.personality;
    if (cfg.instruct) speakBody.instruct = cfg.instruct;

    const response = await fetch(`${VOICEBOX_URL}/speak`, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Voicebox-Client-Id": CLIENT_ID,
      },
      body: JSON.stringify(speakBody),
    });
    await assertOk(response, this.name);
    return { buffer: new ArrayBuffer(0), format: "mp3", delegated: true };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    try {
      const res = await fetch(`${VOICEBOX_URL}/profiles`, {
        headers: { "X-Voicebox-Client-Id": CLIENT_ID },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) return [];
      const profiles = (await res.json()) as VoiceboxProfile[];
      return profiles.map((p) => ({
        id: p.id,
        name: p.name ?? p.id,
        language: p.language,
      }));
    } catch {
      return [];
    }
  }
}
