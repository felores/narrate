import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  type VoiceInfo,
  ProviderError,
  assertOk,
} from "./base.ts";

/**
 * Fish Audio — https://fish.audio
 *
 * Voices are user-created "models" (trained from reference audio or picked
 * from the public library). `/v1/tts` takes a `reference_id` pointing at one.
 *
 * API reference (OpenAPI v1):
 *   POST https://api.fish.audio/v1/tts
 *   GET  https://api.fish.audio/model   (list voice models)
 */

const API_BASE = "https://api.fish.audio";

const FISH_MODELS = ["s1", "s2-pro", "s2.1-pro", "s2.1-pro-free"] as const;

interface FishConfig {
  /** TTS model (header `model`). Default: s2.1-pro-free. */
  model?: string;
  temperature?: number;
  top_p?: number;
  /** "normal" | "balanced" | "low" — latency/quality trade-off. */
  latency?: string;
  /** Prosody control, e.g. { speed: 1, volume: 0, normalize_loudness: true }. */
  prosody?: { speed?: number; volume?: number; normalize_loudness?: boolean };
  sample_rate?: number;
  mp3_bitrate?: 64 | 128 | 192;
  normalize?: boolean;
}

interface FishModelEntity {
  _id: string;
  type?: string;
  title?: string;
  state?: string;
  languages?: string[];
  samples?: { audio?: string }[];
}

export class FishProvider implements Provider {
  readonly name = "fish";
  readonly label = "Fish Audio";

  private get apiKey(): string | undefined {
    return process.env.FISH_AUDIO_API_KEY;
  }

  async health(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { configured: false, reason: "FISH_AUDIO_API_KEY env var not set" };
    }
    try {
      const response = await fetch(`${API_BASE}/wallet/self/package`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const pkg = (await response.json()) as {
          balance?: number;
          total?: number;
          type?: string;
        };
        if (typeof pkg.total === "number" && typeof pkg.balance === "number") {
          return {
            configured: true,
            credits: `${pkg.balance.toLocaleString()} / ${pkg.total.toLocaleString()} credits (${pkg.type ?? "?"} package)`,
          };
        }
      }
    } catch {
      /* offline — still configured */
    }
    return { configured: true };
  }

  async generateSpeech(
    text: string,
    voice: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new ProviderError(this.name, null, "API key not configured");
    }

    const cfg = (opts.providerConfig ?? {}) as FishConfig;
    const model = cfg.model ?? process.env.FISH_AUDIO_MODEL ?? "s2.1-pro-free";
    const referenceId = voice || process.env.FISH_AUDIO_VOICE_ID;
    if (!referenceId) {
      throw new ProviderError(
        this.name,
        null,
        "No voice — pass a model/reference id (e.g. --id <model-id>) or set FISH_AUDIO_VOICE_ID",
      );
    }

    const format = opts.format ?? "mp3";

    const body: Record<string, unknown> = {
      text,
      reference_id: referenceId,
      format,
      temperature: cfg.temperature ?? 0.7,
      top_p: cfg.top_p ?? 0.7,
      latency: cfg.latency ?? "normal",
      normalize: cfg.normalize ?? true,
    };
    if (cfg.prosody) body.prosody = cfg.prosody;
    if (cfg.sample_rate) body.sample_rate = cfg.sample_rate;
    if (cfg.mp3_bitrate) body.mp3_bitrate = cfg.mp3_bitrate;

    const response = await fetch(`${API_BASE}/v1/tts`, {
      method: "POST",
      signal: opts.signal,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        model,
      },
      body: JSON.stringify(body),
    });

    await assertOk(response, this.name);
    return { buffer: await response.arrayBuffer(), format };
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.apiKey) return [];

    const response = await fetch(`${API_BASE}/model?page_size=100`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new ProviderError(
        this.name,
        response.status,
        `Failed to list voice models: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { items?: FishModelEntity[] };
    const voices: VoiceInfo[] = [];
    for (const item of data.items ?? []) {
      if (item.type && item.type !== "tts") continue;
      if (item.state && item.state !== "trained") continue;
      voices.push({
        id: item._id,
        name: item.title || item._id,
        language: item.languages?.[0],
        preview_url: item.samples?.[0]?.audio,
      });
    }
    return voices;
  }
}
