# Providers — voices, models, and where to preview them

Use this to help the user pick a provider and a voice. Always share the
**preview URL** so they can hear voices before committing. Voice/model lists are
time-sensitive — verified **2026-07-31**; if something 404s, the provider
changed it, so check their docs.

narrate maps friendly preset names to a `{provider, voice_id/voice}` pair in
`~/.config/narrate/voices.json` (see `setup.md`). The values below are what you
put behind a preset.

---

## system — built-in OS voice (no key, offline)

The zero-setup default. Works everywhere, no account.

- **Preview:** macOS → `say -v '?'` lists installed voices. Windows → Settings →
  Time & Language → Speech. Linux → `espeak-ng --voices`.
- **Voice id:** the OS voice name, e.g. macOS `Samantha`, `Daniel`; Windows
  `Microsoft Zira Desktop`.
- **Use:** `narrate --provider system --id Samantha "hola"`
- Best for notifications, offline, or "I don't want to sign up for anything".

---

## ElevenLabs — highest quality, biggest voice library

- **Preview voices (browser):** https://elevenlabs.io/voice-library
  (TTS playground: https://elevenlabs.io/app/speech-synthesis/text-to-speech)
- **API key env var:** `ELEVENLABS_API_KEY`
- **Create key:** https://elevenlabs.io/app/settings/api-keys
- **Voices:** referenced by opaque `voice_id` strings, not fixed names. The user
  browses the library, adds a voice to their workspace, and copies its
  `voice_id`. ⚠️ The classic default IDs (Rachel `21m00Tcm4TlvDq8ikWAM`, Adam
  `pNInz6obpgDQGcFmaJgB`, etc.) are **Legacy and expire 2026-12-31** — don't bake
  them in; have the user pick a current `voice_id` from the library.
- **Models (`model_id`):** `eleven_multilingual_v2` (narrate's default, most
  lifelike), `eleven_flash_v2_5` (ultra-low latency, 32 langs), `eleven_v3`
  (most expressive). Avoid the deprecated `eleven_turbo_*`.
- **narrate usage:** `narrate --provider elevenlabs --id <voice_id> "..."`
- Best for: production-quality narration, voice variety, cloning.

---

## OpenAI — cheap, simple, solid

- **Preview voices (browser):** https://www.openai.fm  (official interactive TTS demo)
- **API key env var:** `OPENAI_API_KEY`
- **Create key:** https://platform.openai.com/api-keys
- **Voices:** `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`,
  `onyx`, `sage`, `shimmer`, `verse`, `marin`, `cedar`. (`marin`/`cedar` are
  newest/best.) Note: the legacy `tts-1`/`tts-1-hd` models only support the
  smaller set — `alloy, ash, coral, echo, fable, onyx, nova, sage, shimmer`.
- **Models:** narrate defaults to `gpt-4o-mini-tts` (supports an `instructions`
  param for tone/accent) — override via the preset's `providerConfig.model`.
  Legacy `tts-1`/`tts-1-hd` only support the 9-voice subset above.
- **narrate usage:** `narrate --provider openai --id nova "..."`
- Best for: good-enough quality at very low cost, minimal fuss.

---

## Google Gemini — free tier, multilingual

- **Preview voices (browser):** https://aistudio.google.com/generate-speech
- **API key env var:** `GEMINI_API_KEY`
- **Create key:** https://aistudio.google.com/apikey
- **Voices (30 prebuilt):** Zephyr, Puck, Charon, Kore (narrate default),
  Fenrir, Leda, Orus, Aoede, Callirrhoe, Autonoe, Enceladus, Iapetus, Umbriel,
  Algieba, Despina, Erinome, Algenib, Rasalgethi, Laomedeia, Achernar, Alnilam,
  Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi, Vindemiatrix, Sadachbia,
  Sadaltager, Sulafat.
- **Models:** `gemini-2.5-flash-preview-tts` (narrate default),
  `gemini-2.5-pro-preview-tts`, `gemini-3.1-flash-tts-preview` (newest per docs,
  verified 2026-07-31).
- **Output:** raw PCM (s16le, 24 kHz, mono) — narrate converts to WAV, which
  **requires `ffmpeg` installed**. If audio fails on Gemini, check ffmpeg.
- **narrate usage:** `narrate --provider gemini --id Puck "..."`
- Best for: free experimentation, many languages.

---

## xAI (Grok) — Grok's voices

- **Preview voices (browser):** https://console.x.ai/team/default/voice/text-to-speech
  (public demo: https://x.ai/api/voice)
- **API key env var:** `XAI_API_KEY`
- **Create key:** https://console.x.ai (API Keys)
- **Voices (26, all multilingual):** `ara` ♀, `eve` ♀, `iris` ♀, `carina` ♀,
  `celeste` ♀, `luna` ♀, `ursa` ♀, `rex` ♂, `sal` ♂, `leo` ♂, `altair` ♂,
  `atlas` ♂, `castor` ♂, `cosmo` ♂, `helios` ♂, `helix` ♂, `kepler` ♂,
  `lumen` ♂, `lux` ♂, `naksh` ♂, `orion` ♂, `perseus` ♂, `rigel` ♂,
  `sirius` ♂, `zagan` ♂, `zenith` ♂. Verified via `GET /v1/tts/voices`
  2026-07-31. narrate's xAI default is `ara`.
- **Model:** the REST endpoint (`POST /v1/tts`) takes no `model` field — the
  model is implicit. Pass `voice_id`, not a model name.
- **narrate usage:** `narrate --provider xai --id ara "..."`
- Best for: users who want the Grok voice aesthetic.

---

## Fish Audio — voice models trained from your own audio

- **Preview voices (browser):** https://fish.audio/models
  (playground: https://fish.audio/tts)
- **API key env var:** `FISH_AUDIO_API_KEY`
- **Create key:** https://fish.audio → API Keys
- **Voices are "models", not fixed names:** the user creates a voice model from
  reference audio (or clones a public model). The voice id is the model id
  (e.g. `1f07c1d4cb88455c9d5a03de429ab894`) — find them at
  https://fish.audio/models. `narrate verify --test` also lists the user's
  trained models via `GET /model`.
- **Models (`model` header):** `s2.1-pro-free` (narrate default, free dev
  tier), `s2.1-pro`, `s2-pro`, `s1`. Override via `FISH_AUDIO_MODEL` env or a
  preset's `providerConfig.model`.
- **narrate usage:** `narrate --provider fish --id <model-id> "..."`
- Best for: users who want their own (or cloned) voice, free tier.

---

## Soniox — real-time multilingual TTS

- **Preview voices (browser):** https://console.soniox.com
- **API key env var:** `SONIOX_API_KEY`
- **Voices:** fetched live from `GET /v1/tts-models` for `tts-rt-v2`; use
  `Adrian` as the default/sample voice. Every built-in voice supports every
  supported language.
- **Model:** `tts-rt-v2` (narrate default; v1 is deprecated).
- **narrate usage:** `narrate --provider soniox --id Adrian "Hello"`
- Best for: low-latency, multilingual narration.

---

## voicebox — local voice cloning (optional)

Not a cloud provider — a local app narrate proxies to. Auto-detected on
`:17493`. Out of scope for first-time setup; mention only if the user asks about
voice cloning. See the repo README "Voicebox deep dive".

---

## Quick recommendation cheat-sheet

| User says… | Recommend |
|---|---|
| "free / offline / just notifications" | **system** |
| "best quality, many voices" | **ElevenLabs** |
| "cheap and easy" | **OpenAI** |
| "free tier, other languages" | **Gemini** |
| "Grok voices" | **xAI** |
| "low-latency multilingual narration" | **Soniox** |
| "my own / cloned voice" | **Fish Audio** (or voicebox, local) |
| "clone my own voice" | **voicebox** (see README) |
