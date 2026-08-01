import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  ProviderError,
  assertOk,
} from "./base.ts";

interface ElevenLabsConfig {
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export class ElevenLabsProvider implements Provider {
  readonly name = "elevenlabs";
  readonly label = "ElevenLabs";

  private get apiKey(): string | undefined {
    return process.env.ELEVENLABS_API_KEY;
  }

  async health(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { configured: false, reason: "ELEVENLABS_API_KEY env var not set" };
    }
    return this.fetchCredits();
  }

  /** GET /v1/user → subscription char quota. Best-effort, 3s timeout. */
  private async fetchCredits(): Promise<ProviderHealth> {
    try {
      const response = await fetch("https://api.elevenlabs.io/v1/user", {
        headers: { "xi-api-key": this.apiKey as string },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return { configured: true };
      const body = (await response.json()) as {
        subscription?: {
          character_count?: number;
          character_limit?: number;
          tier?: string;
        };
      };
      const sub = body.subscription;
      if (sub && typeof sub.character_limit === "number") {
        const used = sub.character_count ?? 0;
        return {
          configured: true,
          credits: `${used.toLocaleString()} / ${sub.character_limit.toLocaleString()} chars (${sub.tier ?? "free"} tier)`,
        };
      }
    } catch {
      /* offline — still configured */
    }
    return { configured: true };
  }

  async generateSpeech(
    text: string,
    voiceId: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    if (!this.apiKey) {
      throw new ProviderError(this.name, null, "API key not configured");
    }

    const cfg = (opts.providerConfig ?? {}) as ElevenLabsConfig;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        signal: opts.signal,
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: cfg.model_id ?? "eleven_multilingual_v2",
          voice_settings: cfg.voice_settings ?? {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      },
    );

    await assertOk(response, this.name);
    return { buffer: await response.arrayBuffer(), format: "mp3" };
  }
}
