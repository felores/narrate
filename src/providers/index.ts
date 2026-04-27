import type { Provider } from "./base.ts";
import { ElevenLabsProvider } from "./elevenlabs.ts";
import { OpenAIProvider } from "./openai.ts";
import { GeminiProvider } from "./gemini.ts";
import { XaiProvider } from "./xai.ts";
import { VoiceboxProvider } from "./voicebox.ts";
import { SystemProvider } from "./system.ts";

export const ALL_PROVIDERS: Provider[] = [
  new ElevenLabsProvider(),
  new OpenAIProvider(),
  new GeminiProvider(),
  new XaiProvider(),
  new VoiceboxProvider(),
  new SystemProvider(),
];

export const PROVIDER_REGISTRY = new Map<string, Provider>(
  ALL_PROVIDERS.map((p) => [p.name, p]),
);

export function getProvider(name: string): Provider {
  const p = PROVIDER_REGISTRY.get(name.toLowerCase());
  if (!p) {
    throw new Error(
      `Unknown provider: "${name}". Available: ${[...PROVIDER_REGISTRY.keys()].join(", ")}`,
    );
  }
  return p;
}

export function listProviderNames(): string[] {
  return [...PROVIDER_REGISTRY.keys()];
}

export * from "./base.ts";
