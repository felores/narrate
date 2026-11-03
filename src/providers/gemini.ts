import { spawn } from "child_process";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  ProviderError,
  assertOk,
} from "./base.ts";

interface GeminiConfig {
  model?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ inlineData?: { data?: string } }> };
  }>;
}

export class GeminiProvider implements Provider {
  readonly name = "gemini";
  readonly label = "Google Gemini TTS";

  private get apiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  }

  async health(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return { configured: false, reason: "GEMINI_API_KEY env var not set" };
    }
    if (!(await ffmpegAvailable())) {
      return {
        configured: false,
        reason:
          "ffmpeg not found in PATH (required for Gemini PCM→WAV conversion)",
      };
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

    const cfg = (opts.providerConfig ?? {}) as GeminiConfig;
    const model = cfg.model ?? "gemini-3.8-flash-tts";
    const voiceName = voice || "Kore";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(url, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "x-goog-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
        model,
      }),
    });

    await assertOk(response, this.name);
    const data = (await response.json()) as GeminiResponse;
    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) {
      throw new ProviderError(this.name, null, "No audio data in response");
    }

    // Gemini returns 24kHz s16le mono PCM. Convert to WAV via ffmpeg.
    const ts = Date.now();
    const pcmPath = `/tmp/narrate-gemini-${ts}.pcm`;
    const wavPath = `/tmp/narrate-gemini-${ts}.wav`;

    writeFileSync(pcmPath, trimEdgeNoise(Buffer.from(b64, "base64")));

    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn("ffmpeg", [
          "-f",
          "s16le",
          "-ar",
          "24000",
          "-ac",
          "1",
          "-i",
          pcmPath,
          "-y",
          wavPath,
        ]);
        proc.on("error", reject);
        proc.on("exit", (code) => {
          if (code === 0) resolve();
          else
            reject(
              new ProviderError(
                "gemini",
                null,
                `ffmpeg exited with code ${code}`,
              ),
            );
        });
      });
      const wavBuffer = readFileSync(wavPath);
      // Slice to ensure we return an ArrayBuffer (not SharedArrayBuffer).
      return {
        buffer: wavBuffer.buffer.slice(
          wavBuffer.byteOffset,
          wavBuffer.byteOffset + wavBuffer.byteLength,
        ) as ArrayBuffer,
        format: "wav",
      };
    } finally {
      try {
        unlinkSync(pcmPath);
      } catch {
        /* ignore */
      }
      try {
        unlinkSync(wavPath);
      } catch {
        /* ignore */
      }
    }
  }
}

// The 3.x TTS models append ~120ms of full-scale noise after the speech has
// faded to silence. Cut it: trailing 20ms windows at full scale (max 300ms)
// that follow a quiet window.
export function trimEdgeNoise(pcm: Buffer): Buffer {
  return trimTailNoise(trimHeadClick(pcm));
}

// They also start with a ~2ms full-scale click followed by silence.
function trimHeadClick(pcm: Buffer): Buffer {
  const at = (n: number) =>
    n * 2 + 1 < pcm.length ? Math.abs(pcm.readInt16LE(n * 2)) : 0;
  let hit = false;
  let last = -1;
  for (let n = 0; n < 120; n++) {
    if (at(n) >= 20000) hit = true;
    if (at(n) >= 2000) last = n;
  }
  if (!hit) return pcm;
  for (let n = 120; n < 600; n++) if (at(n) >= 2000) return pcm;
  return pcm.subarray((last + 1) * 2);
}

function trimTailNoise(pcm: Buffer): Buffer {
  const win = 480; // 20ms at 24kHz
  const peak = (w: number) => {
    let max = 0;
    for (
      let i = w * win * 2;
      i + 1 < (w + 1) * win * 2 && i + 1 < pcm.length;
      i += 2
    ) {
      max = Math.max(max, Math.abs(pcm.readInt16LE(i)));
    }
    return max;
  };
  let w = Math.floor(pcm.length / (win * 2)) - 1;
  let noisy = 0;
  while (w >= 0 && peak(w) >= 32000) {
    noisy++;
    w--;
  }
  if (noisy === 0 || noisy > 15 || w < 0 || peak(w) >= 2000) return pcm;
  return pcm.subarray(0, (w + 1) * win * 2);
}

async function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    proc.on("error", () => resolve(false));
    proc.on("exit", (code) => resolve(code === 0));
  });
}
