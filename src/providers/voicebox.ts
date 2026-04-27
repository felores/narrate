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
  /** When true, use /generate (return audio buffer) instead of /speak (delegated playback). */
  return_audio?: boolean;
}

interface VoiceboxProfile {
  id: string;
  name?: string;
  language?: string;
}

export class VoiceboxProvider implements Provider {
  readonly name = "voicebox";
  readonly label = "Voicebox (local)";

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

    // Default: /speak — voicebox plays through its own audio pipeline.
    const response = await fetch(`${VOICEBOX_URL}/speak`, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Voicebox-Client-Id": CLIENT_ID,
      },
      body: JSON.stringify({
        text,
        profile: voice,
        ...(cfg.personality !== undefined
          ? { personality: cfg.personality }
          : {}),
      }),
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
