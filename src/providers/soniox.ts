import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  type VoiceInfo,
  ProviderError,
  assertOk,
} from "./base.ts";

const TTS_URL = "https://tts-rt.soniox.com/tts";
const MODELS_URL = "https://api.soniox.com/v1/tts-models";
const DEFAULT_MODEL = "tts-rt-v2";

interface SonioxConfig {
  model?: string;
  language?: string;
  speed?: number;
  reduce_silence?: boolean;
  sample_rate?: number;
  bitrate?: number;
}

interface SonioxVoice {
  id: string;
  description?: string;
  gender?: string;
}

interface SonioxModel {
  id: string;
  voices?: SonioxVoice[];
}

export class SonioxProvider implements Provider {
  readonly name = "soniox";
  readonly label = "Soniox TTS";

  private get apiKey(): string | undefined {
    return process.env.SONIOX_API_KEY;
  }

  health(): ProviderHealth {
    return this.apiKey
      ? { configured: true }
      : { configured: false, reason: "SONIOX_API_KEY env var not set" };
  }

  async generateSpeech(
    text: string,
    voice: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new ProviderError(this.name, null, "API key not configured");
    }

    const cfg = (opts.providerConfig ?? {}) as SonioxConfig;
    const format = opts.format === "pcm" ? "wav" : opts.format ?? "mp3";
    const body: Record<string, unknown> = {
      model: cfg.model ?? DEFAULT_MODEL,
      language: cfg.language ?? "en",
      voice,
      audio_format: format,
      text,
      speed: Math.max(0.7, Math.min(1.3, cfg.speed ?? opts.rate_multiplier ?? 1.0)),
    };
    if (cfg.reduce_silence !== undefined) body.reduce_silence = cfg.reduce_silence;
    if (cfg.sample_rate !== undefined) body.sample_rate = cfg.sample_rate;
    if (cfg.bitrate !== undefined) body.bitrate = cfg.bitrate;

    const response = await fetch(TTS_URL, {
      method: "POST",
      signal: opts.signal,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    await assertOk(response, this.name);
    return { buffer: await response.arrayBuffer(), format };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.apiKey) return [];

    const response = await fetch(MODELS_URL, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    await assertOk(response, this.name);

    const data = (await response.json()) as { models?: SonioxModel[] };
    const model = data.models?.find((item) => item.id === DEFAULT_MODEL);
    return (model?.voices ?? []).map((voice) => ({
      id: voice.id,
      name: voice.description ?? voice.id,
      gender:
        voice.gender === "male" || voice.gender === "female" || voice.gender === "neutral"
          ? voice.gender
          : "neutral",
    }));
  }
}
