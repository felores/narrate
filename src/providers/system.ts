/**
 * System provider — uses the OS-bundled TTS command.
 *
 *   macOS:    `say` (always available)
 *   Linux:    `espeak` or `espeak-ng`
 *   Windows:  PowerShell `System.Speech.Synthesis` (always available)
 *
 * Audio is played directly by the OS command (delegated=true). No API key
 * needed. Useful as a zero-dep fallback when cloud providers fail.
 */

import { spawn } from "child_process";
import {
  type Provider,
  type ProviderOptions,
  type ProviderHealth,
  type AudioResult,
  type VoiceInfo,
  ProviderError,
} from "./base.ts";

interface SystemConfig {
  /** Override the rate (words per minute). */
  rate?: number;
}

export class SystemProvider implements Provider {
  readonly name = "system";
  readonly label = "System TTS (say/espeak/SAPI)";

  private platform = process.platform;
  private linuxCmd: "espeak-ng" | "espeak" | null = null;

  async health(): Promise<ProviderHealth> {
    if (this.platform === "darwin") return { configured: true };
    if (this.platform === "win32") return { configured: true };
    if (this.platform === "linux") {
      if (await commandExists("espeak-ng")) {
        this.linuxCmd = "espeak-ng";
        return { configured: true };
      }
      if (await commandExists("espeak")) {
        this.linuxCmd = "espeak";
        return { configured: true };
      }
      return {
        configured: false,
        reason: "espeak-ng / espeak not found on PATH",
      };
    }
    return {
      configured: false,
      reason: `unsupported platform: ${this.platform}`,
    };
  }

  async generateSpeech(
    text: string,
    voice: string,
    opts: ProviderOptions = {},
  ): Promise<AudioResult> {
    const cfg = (opts.providerConfig ?? {}) as SystemConfig;
    const rate = cfg.rate ?? this.computeRate(opts);

    if (this.platform === "darwin") {
      const args: string[] = ["-r", String(rate)];
      if (voice) args.push("-v", voice);
      args.push(text);
      await runCommand("say", args);
    } else if (this.platform === "linux") {
      if (!this.linuxCmd) await this.health();
      if (!this.linuxCmd) {
        throw new ProviderError(
          this.name,
          null,
          "espeak-ng / espeak not found on PATH",
        );
      }
      const args: string[] = ["-s", String(rate)];
      if (voice) args.push("-v", voice);
      args.push(text);
      await runCommand(this.linuxCmd, args);
    } else if (this.platform === "win32") {
      // SAPI rate is -10..10 (0 = normal), not WPM. Map from the multiplier.
      const sapiRate = this.computeSapiRate(opts);
      // Text + voice are passed via env vars (not interpolated) to avoid
      // PowerShell injection/quote-escaping issues.
      const script =
        "Add-Type -AssemblyName System.Speech;" +
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;" +
        `$s.Rate = ${sapiRate};` +
        (voice
          ? "try { $s.SelectVoice([string]$env:NARRATE_VOICE) } catch {};"
          : "") +
        "$s.Speak([string]$env:NARRATE_TEXT)";
      await runCommand(
        "powershell",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { ...process.env, NARRATE_TEXT: text, NARRATE_VOICE: voice },
      );
    } else {
      throw new ProviderError(
        this.name,
        null,
        `unsupported platform: ${this.platform}`,
      );
    }

    return { buffer: new ArrayBuffer(0), format: "wav", delegated: true };
  }

  private computeRate(opts: ProviderOptions): number {
    const base = opts.rate_wpm ?? 175;
    const mult = opts.rate_multiplier ?? 1.0;
    return Math.round(base * mult);
  }

  /** Map a WPM/multiplier intent onto SAPI's -10..10 rate scale. */
  private computeSapiRate(opts: ProviderOptions): number {
    const base = opts.rate_wpm ?? 175;
    const mult = opts.rate_multiplier ?? 1.0;
    // 175 wpm ≈ normal (0). Each ~17.5 wpm step ≈ 1 SAPI unit.
    const sapi = Math.round(((base * mult) / 175 - 1) * 10);
    return Math.max(-10, Math.min(10, sapi));
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (this.platform === "win32") return this.listWindowsVoices();
    if (this.platform !== "darwin") return [];
    return new Promise((resolve) => {
      const proc = spawn("say", ["-v", "?"]);
      let out = "";
      proc.stdout.on("data", (chunk) => {
        out += chunk.toString();
      });
      proc.on("error", () => resolve([]));
      proc.on("exit", () => {
        const voices = out
          .trim()
          .split("\n")
          .map((line): VoiceInfo | null => {
            const match = line.match(
              /^(.+?)\s+([a-z]{2,3}[_-][A-Z]{2})\s+#\s*(.*)$/,
            );
            if (!match) return null;
            const [, name, lang] = match;
            const id = name.trim();
            return { id, name: id, language: lang };
          })
          .filter((v): v is VoiceInfo => v !== null);
        resolve(voices);
      });
    });
  }

  private listWindowsVoices(): Promise<VoiceInfo[]> {
    const script =
      "Add-Type -AssemblyName System.Speech;" +
      "(New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices()" +
      ' | ForEach-Object { $i = $_.VoiceInfo; "$($i.Name)|$($i.Culture.Name)" }';
    return new Promise((resolve) => {
      const proc = spawn("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script,
      ]);
      let out = "";
      proc.stdout.on("data", (chunk) => {
        out += chunk.toString();
      });
      proc.on("error", () => resolve([]));
      proc.on("exit", () => {
        const voices = out
          .trim()
          .split(/\r?\n/)
          .map((line): VoiceInfo | null => {
            const [name, lang] = line.split("|");
            if (!name) return null;
            return {
              id: name.trim(),
              name: name.trim(),
              language: lang?.trim(),
            };
          })
          .filter((v): v is VoiceInfo => v !== null);
        resolve(voices);
      });
    });
  }
}

function commandExists(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("which", [cmd]);
    proc.on("error", () => resolve(false));
    proc.on("exit", (code) => resolve(code === 0));
  });
}

function runCommand(
  cmd: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, env ? { env } : {});
    proc.on("error", reject);
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new ProviderError("system", null, `${cmd} exited with code ${code}`),
        );
    });
  });
}
