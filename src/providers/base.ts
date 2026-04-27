/**
 * Provider interface — every TTS backend (cloud or local) implements this.
 *
 * A Provider takes text and a voice identifier and returns an audio buffer.
 * It does NOT play the audio — playback is handled by src/playback.ts so
 * the same Provider works for HTTP responses (return audio) and CLI calls
 * (play locally).
 */

export type AudioFormat = "mp3" | "wav" | "pcm";

export interface ProviderOptions {
  /** Words-per-minute hint (used by `system` provider; ignored by most cloud providers). */
  rate_wpm?: number;
  /** Multiplier applied to base rate (also `system`-only by default). */
  rate_multiplier?: number;
  /** Preferred output format. Provider may downgrade if unsupported. */
  format?: AudioFormat;
  /** Cancel an in-flight request. */
  signal?: AbortSignal;
  /** Provider-specific passthrough config (e.g., ElevenLabs voice_settings). */
  providerConfig?: Record<string, unknown>;
}

export interface AudioResult {
  buffer: ArrayBuffer;
  format: AudioFormat;
  /**
   * True when the provider already produced sound (e.g., `system` `say`,
   * voicebox `/speak`). Callers must NOT play `buffer` again — typically
   * `buffer` is empty in this case.
   */
  delegated?: boolean;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language?: string;
  gender?: "male" | "female" | "neutral";
  preview_url?: string;
}

export interface ProviderHealth {
  configured: boolean;
  reason?: string;
}

export interface Provider {
  /** Lowercase provider key — must match the `provider` field in voices.json. */
  readonly name: string;

  /** Human-readable label for UI/logs. */
  readonly label: string;

  /** Whether this provider has the credentials/runtime it needs. */
  health(): Promise<ProviderHealth> | ProviderHealth;

  /** Generate speech audio for `text` using the provider-native voice id. */
  generateSpeech(
    text: string,
    voice: string,
    opts?: ProviderOptions,
  ): Promise<AudioResult>;

  /** Optional: list voices the provider exposes (for /voices endpoint). */
  listVoices?(): Promise<VoiceInfo[]>;
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public status: number | null,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

/** Helper used by HTTP-based providers to wrap fetch failures consistently. */
export async function assertOk(
  response: Response,
  providerName: string,
): Promise<void> {
  if (response.ok) return;
  let detail = "";
  try {
    detail = await response.text();
  } catch {
    /* ignore */
  }
  throw new ProviderError(
    providerName,
    response.status,
    `${response.status} ${response.statusText}${detail ? ` — ${detail.slice(0, 500)}` : ""}`,
  );
}
