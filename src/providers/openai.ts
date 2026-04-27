import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  type VoiceInfo,
  ProviderError,
  assertOk,
} from "./base.ts";

const VALID_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;
type OpenAIVoice = (typeof VALID_VOICES)[number];

interface OpenAIConfig {
  model?: "tts-1" | "tts-1-hd" | string;
  speed?: number;
}

export class OpenAIProvider implements Provider {
  readonly name = "openai";
  readonly label = "OpenAI TTS";

  private apiKey = process.env.OPENAI_API_KEY;

  health(): ProviderHealth {
    return this.apiKey
      ? { configured: true }
      : { configured: false, reason: "OPENAI_API_KEY env var not set" };
  }

  async generateSpeech(
    text: string,
    voice: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new ProviderError(this.name, null, "API key not configured");
    }

    const voiceLower = voice.toLowerCase() as OpenAIVoice;
    if (!VALID_VOICES.includes(voiceLower)) {
      throw new ProviderError(
        this.name,
        null,
        `Unknown voice "${voice}". Valid: ${VALID_VOICES.join(", ")}`,
      );
    }

    const cfg = (opts.providerConfig ?? {}) as OpenAIConfig;
    const speed = cfg.speed ?? opts.rate_multiplier ?? 1.0;
    const format = opts.format ?? "mp3";

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      signal: opts.signal,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model ?? "tts-1",
        voice: voiceLower,
        input: text,
        response_format: format,
        speed: Math.max(0.25, Math.min(4.0, speed)),
      }),
    });

    await assertOk(response, this.name);
    return { buffer: await response.arrayBuffer(), format };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    return VALID_VOICES.map((id) => ({ id, name: id }));
  }
}
