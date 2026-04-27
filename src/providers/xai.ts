import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  type VoiceInfo,
  ProviderError,
  assertOk,
} from "./base.ts";

const KNOWN_VOICES = ["eve", "ara", "rex", "sal", "leo"] as const;

interface XaiConfig {
  language?: string;
  sample_rate?: number;
  bit_rate?: number;
  codec?: "mp3" | "wav" | "pcm";
}

export class XaiProvider implements Provider {
  readonly name = "xai";
  readonly label = "xAI Grok TTS";

  private apiKey = process.env.XAI_API_KEY;

  health(): ProviderHealth {
    return this.apiKey
      ? { configured: true }
      : { configured: false, reason: "XAI_API_KEY env var not set" };
  }

  async generateSpeech(
    text: string,
    voice: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new ProviderError(this.name, null, "API key not configured");
    }

    const cfg = (opts.providerConfig ?? {}) as XaiConfig;
    const language = cfg.language ?? process.env.XAI_LANGUAGE ?? "auto";
    const voiceId = voice || process.env.XAI_VOICE_ID || "eve";
    const codec = cfg.codec ?? "mp3";

    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      signal: opts.signal,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language,
        output_format: {
          codec,
          sample_rate: cfg.sample_rate ?? 24000,
          bit_rate: cfg.bit_rate ?? 128000,
        },
      }),
    });

    await assertOk(response, this.name);
    return { buffer: await response.arrayBuffer(), format: codec };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return KNOWN_VOICES.map((id) => ({ id, name: id }));
  }
}
