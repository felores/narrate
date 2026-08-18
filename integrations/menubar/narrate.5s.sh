#!/usr/bin/env bash
# <xbar.title>narrate</xbar.title>
# <xbar.version>v0.5.2</xbar.version>
# <xbar.author>Felo Restrepo</xbar.author>
# <xbar.author.github>felores</xbar.author.github>
# <xbar.desc>Text-to-speech gateway for Claude Code, OpenCode, Pi, Codex, DeepSeek Harness and other tools, across ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio, Voicebox and system voices.</xbar.desc>
# <xbar.abouturl>https://github.com/felores/narrate</xbar.abouturl>
#
# SwiftBar plugin for the narrate TTS gateway (5s refresh; EN/ES toggle).
# Install via ./install.sh — copies into the SwiftBar plugin directory.

# SwiftBar runs plugins with a minimal PATH; restore enough for our tools.
export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"

NARRATE_URL="${NARRATE_URL:-http://localhost:8888}"
PLIST="$HOME/Library/LaunchAgents/com.narrate.server.plist"

# ─── Health probe ───────────────────────────────────────────────────────────
HEALTH=$(curl -s -m 1 "$NARRATE_URL/health" 2>/dev/null)

# Pull repo_dir / logs_dir from /health so the plugin works regardless of
# install method (brew, curl, git clone). Env vars still win as override.
extract_json_string() {
    # $1 = json, $2 = key — minimal extractor, no jq dependency.
    echo "$1" | python3 -c "import sys,json
try:
    print(json.loads(sys.stdin.read()).get('$2',''))
except Exception:
    pass" 2>/dev/null
}

if [ -n "$HEALTH" ]; then
    SERVER_REPO_DIR="$(extract_json_string "$HEALTH" "repo_dir")"
    SERVER_LOGS_DIR="$(extract_json_string "$HEALTH" "logs_dir")"
fi

# Fallback chain: env override → server-reported → common install paths.
REPO_ROOT="${NARRATE_REPO:-${SERVER_REPO_DIR:-}}"
if [ -z "$REPO_ROOT" ]; then
    for candidate in \
        "$HOME/.local/share/narrate" \
        "$HOME/Documents/GitHub/narrate" \
        "$(brew --prefix narrate 2>/dev/null)/libexec"; do
        if [ -f "$candidate/src/cli.ts" ]; then
            REPO_ROOT="$candidate"
            break
        fi
    done
fi

NARRATE_LOG="${NARRATE_LOG:-${SERVER_LOGS_DIR:+$SERVER_LOGS_DIR/narrate.log}}"
NARRATE_LOG="${NARRATE_LOG:-$REPO_ROOT/logs/narrate.log}"

if [ -z "$HEALTH" ] || ! echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo "🔇"
    echo "---"
    echo "narrate server: ⚫ down | color=red"
    echo "URL: $NARRATE_URL | color=#666666"
    echo "---"
    echo "Start service | shell='launchctl' param1='load' param2=$PLIST terminal=false refresh=true"
    echo "View error log | bash='/bin/bash' param1='-c' param2=\"open -a Console.app '$NARRATE_LOG'\" terminal=false"
    echo "---"
    echo "Open repo | href=https://github.com/felores/narrate"
    exit 0
fi

# ─── Server up: render plugin via single python pass on $HEALTH env var ─────
# The helpers live in the narrate repo (NOT next to this plugin) — putting
# helper .sh files in the SwiftBar plugin dir makes SwiftBar try to run them
# as plugins (extra "?" menu bar icon).
SPEAK_HELPER="$REPO_ROOT/integrations/menubar/narrate-menubar-speak.sh"
CONFIG_HELPER="$REPO_ROOT/integrations/menubar/narrate-menubar-config.sh"
KEY_HELPER="$REPO_ROOT/integrations/menubar/narrate-menubar-key.sh"
LANG_HELPER="$REPO_ROOT/integrations/menubar/narrate-menubar-lang.sh"
UPDATE_HELPER="$REPO_ROOT/integrations/menubar/narrate-menubar-update.sh"

HEALTH="$HEALTH" \
NARRATE_URL="$NARRATE_URL" \
NARRATE_LOG="$NARRATE_LOG" \
PLIST="$PLIST" \
REPO_ROOT="$REPO_ROOT" \
SPEAK_HELPER="$SPEAK_HELPER" \
CONFIG_HELPER="$CONFIG_HELPER" \
KEY_HELPER="$KEY_HELPER" \
LANG_HELPER="$LANG_HELPER" \
UPDATE_HELPER="$UPDATE_HELPER" \
python3 - <<'PY'
import os, json, shlex, ssl, urllib.request

health = json.loads(os.environ['HEALTH'])
url = os.environ['NARRATE_URL']
log_path = os.environ['NARRATE_LOG']
plist = os.environ['PLIST']
repo = os.environ['REPO_ROOT']
speak_helper = os.environ['SPEAK_HELPER']
config_helper = os.environ['CONFIG_HELPER']
key_helper = os.environ['KEY_HELPER']
lang_helper = os.environ['LANG_HELPER']
update_helper = os.environ['UPDATE_HELPER']

# ─── Language (en default; toggle at bottom of the menu) ────────────────────
lang = "en"
try:
    with open(os.path.expanduser("~/.config/narrate/menubar.json")) as f:
        lang = json.load(f).get("lang", "en")
except Exception:
    pass

T = {
    "en": {
        "providers_configured": "providers: {ok}/{total} configured",
        "narrate_header": "🎤 narrate: {voice}",
        "session_default": "🔊 session: = narrate",
        "session_header": "🔊 session: {voice}",
        "providers_section": "Providers",
        "select_provider": "Select provider",
        "change_key": "Change API key",
        "remove_key": "Remove API key",
        "add_key": "Add API key",
        "get_key": "Get API key",
        "install_voicebox": "Install / start voicebox",
        "retry": "Retry",
        "voices_section": "Voices",
        "narrate_voice": "🎤 Narrate voice: {voice}",
        "session_voice_default": "🔊 Session voice (🤖 BOT): = narrate",
        "session_voice_header": "🔊 Session voice (🤖 BOT): {voice}",
        "use_same": "Use same as narrate",
        "no_voices": "No voices available — is the provider running?",
        "test_narrate": "▶ Test narrate voice",
        "test_narrate_msg": "This is the narrate voice.",
        "test_session": "▶ Test session voice",
        "test_session_msg": "This is the session voice.",
        "service_section": "Service",
        "restart": "Restart server",
        "stop": "Stop server",
        "view_log": "View narrate.log",
        "tail_log": "Tail log in Terminal",
        "update": "Update narrate",
        "recent_log": "Recent log",
        "open_repo": "Open repo",
        "language_section": "Language",
    },
    "es": {
        "providers_configured": "proveedores: {ok}/{total} configurados",
        "narrate_header": "🎤 narrate: {voice}",
        "session_default": "🔊 sesión: = narrate",
        "session_header": "🔊 sesión: {voice}",
        "providers_section": "Proveedores",
        "select_provider": "Elegir proveedor",
        "change_key": "Cambiar API key",
        "remove_key": "Quitar API key",
        "add_key": "Añadir API key",
        "get_key": "Obtener API key",
        "install_voicebox": "Instalar / iniciar voicebox",
        "retry": "Reintentar",
        "voices_section": "Voces",
        "narrate_voice": "🎤 Voz narrate: {voice}",
        "session_voice_default": "🔊 Voz de sesión (🤖 BOT): = narrate",
        "session_voice_header": "🔊 Voz de sesión (🤖 BOT): {voice}",
        "use_same": "Usar la misma de narrate",
        "no_voices": "No hay voces — ¿está el proveedor activo?",
        "test_narrate": "▶ Probar voz narrate",
        "test_narrate_msg": "Esta es la voz de narrate.",
        "test_session": "▶ Probar voz de sesión",
        "test_session_msg": "Esta es la voz de sesión.",
        "service_section": "Servicio",
        "restart": "Reiniciar servidor",
        "stop": "Detener servidor",
        "view_log": "Ver narrate.log",
        "tail_log": "Abrir log en Terminal",
        "update": "Actualizar narrate",
        "recent_log": "Registro reciente",
        "open_repo": "Abrir repo",
        "language_section": "Idioma",
    },
}
t = T[lang]

port = health.get('port', '?')
default_provider = health.get('default_provider', 'system')
default_voice = health.get('default_voice') or ''
auto_provider = health.get('auto_provider')
auto_voice = health.get('auto_voice') or ''
providers = health.get('providers', {})
ok = sum(1 for v in providers.values() if v.get('configured'))
total = len(providers)

auto_is_default = not auto_provider and not auto_voice

# ─── Voice catalogs ─────────────────────────────────────────────────────────
# Raw provider voices (curated, matches the server's own lists). Voicebox
# profiles are fetched live from the local voicebox instance.
SAMPLES = {
    "elevenlabs": [
        ("Sarah",     "EXAVITQu4vr4xnSDxMaL"),
        ("Roger",     "CwhRBWXzGAHq8TQ4Fs17"),
        ("Laura",     "FGY2WhTYpPnrIDTdsKH5"),
        ("Charlie",   "IKne3meq5aSn9XLyUdCD"),
        ("George",    "JBFqnCBsd6RMkjVDRZzb"),
        ("Callum",    "N2lVS1w4EtoT3dr4eOWO"),
        ("River",     "SAz9YHcvj6GT2YYXdXww"),
        ("Harry",     "SOYHLrjzK2X1ezoPC6cr"),
        ("Liam",      "TX3LPaxmHKxFdv7VOQHJ"),
        ("Alice",     "Xb7hH8MSUJpSbSDYk0k2"),
        ("Matilda",   "XrExE9yKIg1WjnnlVkGX"),
        ("Will",      "bIHbv24MWmeRgasZH58o"),
        ("Jessica",   "cgSgspJ2msm6clMCkdW9"),
        ("Eric",      "cjVigY5qzO86Huf0OWal"),
        ("Bella",     "hpp4J3VqNfWAUOO0d1Us"),
        ("Chris",     "iP95p4xoKVk53GoZ742B"),
        ("Brian",     "nPczCjzI2devNBz1zQrb"),
        ("Daniel",    "onwK4e9ZLuTAKqWW03F9"),
        ("Lily",      "pFZP5JQG7iQjIQuC4Bku"),
        ("Adam",      "pNInz6obpgDQGcFmaJgB"),
        ("Bill",      "pqHfZKP75CvOlQylNhV4"),
    ],
    "openai": [
        ("alloy",   "alloy"),
        ("ash",     "ash"),
        ("ballad",  "ballad"),
        ("cedar",   "cedar"),
        ("coral",   "coral"),
        ("echo",    "echo"),
        ("fable",   "fable"),
        ("marin",   "marin"),
        ("nova",    "nova"),
        ("onyx",    "onyx"),
        ("sage",    "sage"),
        ("shimmer", "shimmer"),
        ("verse",   "verse"),
    ],
    "gemini": [
        ("Kore · firm",              "Kore"),
        ("Puck · upbeat",            "Puck"),
        ("Charon · informative",     "Charon"),
        ("Fenrir · excitable",       "Fenrir"),
        ("Aoede · breezy",           "Aoede"),
        ("Zephyr · bright",          "Zephyr"),
        ("Leda · youthful",          "Leda"),
        ("Orus · firm",              "Orus"),
        ("Callirrhoe · easy-going",  "Callirrhoe"),
        ("Autonoe · bright",         "Autonoe"),
        ("Enceladus · breathy",      "Enceladus"),
        ("Iapetus · clear",          "Iapetus"),
        ("Umbriel · easy-going",     "Umbriel"),
        ("Algieba · smooth",         "Algieba"),
        ("Despina · smooth",         "Despina"),
        ("Erinome · clear",          "Erinome"),
        ("Algenib · gravelly",       "Algenib"),
        ("Rasalgethi · informative", "Rasalgethi"),
        ("Laomedeia · upbeat",       "Laomedeia"),
        ("Achernar · soft",          "Achernar"),
        ("Alnilam · firm",           "Alnilam"),
        ("Schedar · even",           "Schedar"),
        ("Gacrux · mature",          "Gacrux"),
        ("Pulcherrima · forward",    "Pulcherrima"),
        ("Achird · friendly",        "Achird"),
        ("Zubenelgenubi · casual",   "Zubenelgenubi"),
        ("Vindemiatrix · gentle",    "Vindemiatrix"),
        ("Sadachbia · lively",       "Sadachbia"),
        ("Sadaltager · knowledgeable", "Sadaltager"),
        ("Sulafat · warm",           "Sulafat"),
    ],
    "xai": [
        ("Ara ♀",     "ara"),
        ("Eve ♀",     "eve"),
        ("Iris ♀",    "iris"),
        ("Carina ♀",  "carina"),
        ("Celeste ♀", "celeste"),
        ("Luna ♀",    "luna"),
        ("Ursa ♀",    "ursa"),
        ("Rex ♂",     "rex"),
        ("Sal ♂",     "sal"),
        ("Leo ♂",     "leo"),
        ("Altair ♂",  "altair"),
        ("Atlas ♂",   "atlas"),
        ("Castor ♂",  "castor"),
        ("Cosmo ♂",   "cosmo"),
        ("Helios ♂",  "helios"),
        ("Helix ♂",   "helix"),
        ("Kepler ♂",  "kepler"),
        ("Lumen ♂",   "lumen"),
        ("Lux ♂",     "lux"),
        ("Naksh ♂",   "naksh"),
        ("Orion ♂",   "orion"),
        ("Perseus ♂", "perseus"),
        ("Rigel ♂",   "rigel"),
        ("Sirius ♂",  "sirius"),
        ("Zagan ♂",   "zagan"),
        ("Zenith ♂",  "zenith"),
    ],
    "soniox": [
        ("Adrian", "Adrian"),
    ],
    "system": [
        ("Samantha (en-US f)",       "Samantha"),
        ("Daniel (en-GB m)",         "Daniel"),
        ("Karen (en-AU f)",          "Karen"),
        ("Tom (en-US m)",            "Tom"),
        ("Fred (en-US m, robotic)",  "Fred"),
        ("Whisper (en-US, low)",     "Whisper"),
    ],
}

provider_voices = {
    prov: [{"label": lbl, "voice_id": vid} for lbl, vid in lst]
    for prov, lst in SAMPLES.items()
}

# Default voice per provider when switching providers from the menu.
DEFAULT_VOICE = {
    "elevenlabs": "EXAVITQu4vr4xnSDxMaL",  # Sarah — premade (library voices 402 on free tier)
    "openai": "alloy",
    "gemini": "Kore",
    "xai": "ara",
    "soniox": "Adrian",
    "system": "Samantha",
}

# Voicebox profiles (localhost /profiles, ~5ms). Fail silently.
try:
    with urllib.request.urlopen("http://127.0.0.1:17493/profiles", timeout=1) as resp:
        vb_profiles = json.loads(resp.read().decode())
    for p in sorted(vb_profiles, key=lambda x: x.get('name', '')):
        name = p.get('name', '?')
        lang_tag = p.get('language', '?')
        engine = p.get('preset_engine') or 'cloned'
        provider_voices.setdefault("voicebox", []).append({
            "label": f"{name} · {lang_tag} · {engine}",
            "voice_id": name,
            "langs": [lang_tag] if lang_tag and lang_tag != '?' else [],
        })
    if provider_voices.get("voicebox"):
        DEFAULT_VOICE["voicebox"] = provider_voices["voicebox"][0]["voice_id"]
except Exception:
    pass

# Soniox voices are model-specific. Fetch the live tts-rt-v2 catalog, retaining
# Adrian as the small fallback when no key or request is available.
try:
    with open(os.path.expanduser("~/.env")) as f:
        soniox_key = None
        for line in f:
            if line.startswith("SONIOX_API_KEY="):
                soniox_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if soniox_key:
        req = urllib.request.Request(
            "https://api.soniox.com/v1/tts-models",
            headers={"Authorization": f"Bearer {soniox_key}"},
        )
        with urllib.request.urlopen(req, timeout=3, context=ssl._create_unverified_context()) as resp:
            soniox_models = json.loads(resp.read().decode()).get("models", [])
        soniox_model = next((m for m in soniox_models if m.get("id") == "tts-rt-v2"), None)
        live = []
        for v in (soniox_model or {}).get("voices", []):
            voice_id = v.get("id")
            if not voice_id:
                continue
            details = [v.get("description"), v.get("gender")]
            label = " · ".join([voice_id, *(d for d in details if d)])
            live.append({"label": label, "voice_id": voice_id})
        if live:
            provider_voices["soniox"] = live
except Exception:
    pass

# Fish Audio voices are user-created models — fetch live from the API using
# the key in ~/.env (same file the menu writes keys to). Fail silently.
# The public model list is big (1000+) and shifts constantly, so fetch ALL
# pages and cache them for 15 min — otherwise a previously-selected voice
# falls out of the window and the menu shows its raw id again.
# Note: system python's cert store often can't verify api.fish.audio, so use
# an unverified context (read-only catalog fetch — same pragmatism as the
# plain-HTTP voicebox profiles call above).
try:
    import ssl, time
    ssl_ctx = ssl._create_unverified_context()
    fish_cache = os.path.expanduser("~/.cache/narrate/fish-models.json")
    with open(os.path.expanduser("~/.env")) as f:
        fish_key = None
        for line in f:
            if line.startswith("FISH_AUDIO_API_KEY="):
                fish_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if fish_key:
        fish_models = []
        try:
            if time.time() - os.stat(fish_cache).st_mtime < 15 * 60:
                with open(fish_cache) as f:
                    fish_models = json.load(f)
        except Exception:
            pass
        if not fish_models:
            page = 1
            while page <= 15:  # safety cap (~1500 models)
                req = urllib.request.Request(
                    f"https://api.fish.audio/model?page_size=100&page_number={page}",
                    headers={"Authorization": f"Bearer {fish_key}"},
                )
                with urllib.request.urlopen(req, timeout=3, context=ssl_ctx) as resp:
                    data = json.loads(resp.read().decode())
                items = data.get("items", [])
                if not items:
                    break
                fish_models.extend(items)
                if not data.get("has_more"):
                    break
                page += 1
            try:
                os.makedirs(os.path.dirname(fish_cache), exist_ok=True)
                with open(fish_cache, "w") as f:
                    json.dump(fish_models, f)
            except Exception:
                pass
        for m in sorted(fish_models, key=lambda x: x.get("title", "")):
            if m.get("type") not in (None, "tts"):
                continue
            if m.get("state") not in (None, "trained"):
                continue
            langs = m.get("languages") or []
            label = m.get("title", "?")
            if langs:
                label += f" · {', '.join(langs)}"
            provider_voices.setdefault("fish", []).append({
                "label": label,
                "voice_id": m.get("_id", ""),
                "langs": langs,
            })
except Exception:
    pass

# ElevenLabs: use the account's REAL voice names — the curated list goes
# stale (ElevenLabs renames premade voices, e.g. EXAVIT... "Bella" → "Sarah").
# Same SSL caveat as the fish fetch above. Fall back to SAMPLES.
try:
    import ssl
    ssl_ctx = ssl._create_unverified_context()
    with open(os.path.expanduser("~/.env")) as f:
        el_key = None
        for line in f:
            if line.startswith("ELEVENLABS_API_KEY="):
                el_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if el_key:
        req = urllib.request.Request(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": el_key},
        )
        with urllib.request.urlopen(req, timeout=3, context=ssl_ctx) as resp:
            el_voices = json.loads(resp.read().decode()).get("voices", [])
        live = [
            {"label": v.get("name") or v["voice_id"], "voice_id": v["voice_id"]}
            for v in el_voices
            if v.get("voice_id")
        ]
        if live:
            provider_voices["elevenlabs"] = live
except Exception:
    pass

PROVIDER_ORDER = ["elevenlabs", "openai", "gemini", "xai", "soniox", "fish", "voicebox", "system"]
PROVIDER_NAMES = {
    "elevenlabs": "ElevenLabs", "openai": "OpenAI", "gemini": "Gemini",
    "xai": "xAI", "soniox": "Soniox", "fish": "Fish Audio", "voicebox": "Voicebox", "system": "System",
}

# Keys that can be entered from the menu (env var name per provider).
KEY_BY_PROVIDER = {
    "elevenlabs": "ELEVENLABS_API_KEY",
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "xai": "XAI_API_KEY",
    "soniox": "SONIOX_API_KEY",
    "fish": "FISH_AUDIO_API_KEY",
}
API_KEY_URL_BY_PROVIDER = {
    "elevenlabs": "https://elevenlabs.io/app/settings/api-keys",
    "openai": "https://platform.openai.com/api-keys",
    "gemini": "https://aistudio.google.com/api-keys",
    "xai": "https://console.x.ai/team/default/api-keys",
    "soniox": "https://console.soniox.com/",
    "fish": "https://fish.audio/app/api-keys/",
}

def sanitize(s):
    return str(s).replace("|", "-").strip() or "?"

def provider_label(prov):
    return PROVIDER_NAMES.get(prov, prov)

def voice_catalog(prov):
    return provider_voices.get(prov, [])

def provider_default_voice(prov, catalog):
    """Voice to use when selecting a provider."""
    return DEFAULT_VOICE.get(prov, catalog[0]["voice_id"] if catalog else "")

def check_row(attrs):
    return " checked=true" if attrs else ""

def voice_display_name(voice_id, catalog):
    """Show the voice NAME (e.g. Sarah), not the raw id (e.g. EXAVIT...) or its descriptor."""
    if not voice_id:
        return voice_id
    for v in catalog:
        if v["voice_id"] == voice_id:
            return v["label"].split(" · ")[0].split(" - ")[0]
    return voice_id

active_catalog = voice_catalog(default_provider)
session_provider = auto_provider if auto_provider else default_provider
session_catalog = voice_catalog(session_provider) or active_catalog

# ─── Top bar ────────────────────────────────────────────────────────────────
print("🎙️")
print("---")
print(f"narrate · :{port} | color=green")
print(f"{t['providers_configured'].format(ok=ok, total=total)} | color=#666666")
print(f"{t['narrate_header'].format(voice=sanitize(voice_display_name(default_voice, active_catalog) or '(none)'))} · {provider_label(default_provider)} | color=#666666")
if auto_is_default:
    print(f"{t['session_default']} | color=#666666")
else:
    print(f"{t['session_header'].format(voice=sanitize(voice_display_name(auto_voice, session_catalog)))} · {provider_label(auto_provider)} | color=#666666")

# ─── Providers (status + API keys) ──────────────────────────────────────────
print("---")
print(f"{t['providers_section']} | refresh=true")
for prov in PROVIDER_ORDER:
    cfg = providers.get(prov, {})
    name = provider_label(prov)
    if cfg.get('configured'):
        print(f"--✅ {name} | refresh=true")
        if prov in KEY_BY_PROVIDER:
            env_key = KEY_BY_PROVIDER[prov]
            print(f"----🔑 {t['change_key']} | bash='{key_helper}' param1='{env_key}' param2='{prov}' terminal=false refresh=false")
            print(f"----🗑 {t['remove_key']} | bash='{key_helper}' param1='{env_key}' param2='{prov}' param3='remove' terminal=false refresh=false")
            print(f"----↗ {t['get_key']} | bash='/usr/bin/open' param1={shlex.quote(API_KEY_URL_BY_PROVIDER[prov])} terminal=false")
    else:
        row = f"--⚪ {name}"
        reason = cfg.get('reason')
        extra = f" ({reason[:40]}...)" if reason else ""
        print(f"{row}{extra} | refresh=true color=#888888")
        if prov == "voicebox":
            print(f"----📖 {t['install_voicebox']} | bash='/usr/bin/open' param1='https://github.com/jamiepine/voicebox' terminal=false")
            print(f"----🔄 {t['retry']} | refresh=true")
        elif prov in KEY_BY_PROVIDER:
            env_key = KEY_BY_PROVIDER[prov]
            print(f"----🔑 {t['add_key']} | bash='{key_helper}' param1='{env_key}' param2='{prov}' terminal=false refresh=false")
            print(f"----↗ {t['get_key']} | bash='/usr/bin/open' param1={shlex.quote(API_KEY_URL_BY_PROVIDER[prov])} terminal=false")

# ─── Voices (each target selects its own provider + voice) ──────────────────
print("---")
print(f"{t['voices_section']} | refresh=true")

def voice_row(target, voice_id, provider, label, current, level=4):
    """One clickable voice row. target: narrate|auto"""
    checked = " checked=true" if current else ""
    print(
        f"{'-' * level}🗣 {sanitize(label)}"
        f" | bash={shlex.quote(config_helper)} param1={shlex.quote(target)}"
        f" param2={shlex.quote(voice_id)} param3={shlex.quote(provider)}"
        f" terminal=false refresh=false{checked}"
    )

LANG_NAMES = {
    "es": "Español", "en": "English", "zh": "中文", "ru": "Русский", "ja": "日本語",
    "ar": "العربية", "pt": "Português", "fr": "Français", "de": "Deutsch",
    "it": "Italiano", "ko": "한국어", "nl": "Nederlands", "hi": "हिन्दी",
    "id": "Bahasa Indonesia", "tr": "Türkçe", "pl": "Polski", "uk": "Українська",
    "vi": "Tiếng Việt", "th": "ไทย", "he": "עברית", "fa": "فارسی",
    "el": "Ελληνικά", "cs": "Čeština", "sv": "Svenska", "da": "Dansk",
    "fi": "Suomi", "no": "Norsk", "hu": "Magyar", "ro": "Română",
}

def lang_display(code):
    return LANG_NAMES.get(code, code)

def voice_list(target, catalog, current_voice, provider, level):
    """Render a picker. Big multilingual catalogs are grouped into
    per-language submenus (Fish); other catalogs stay flat."""
    if not catalog:
        print(f"{'-' * level}{t['no_voices']} | color=#888888")
        return
    if len(catalog) > 12 and all("langs" in v for v in catalog):
        groups = {}
        for v in catalog:
            langs = v.get("langs") or []
            g = lang_display(langs[0]) if langs else "🌐"
            groups.setdefault(g, []).append(v)
        for g, vs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
            print(f"{'-' * level}{g} ({len(vs)}) | refresh=true color=#888888 size=11")
            for v in vs:
                voice_row(target, v["voice_id"], provider, v["label"].split(" · ")[0],
                          v["voice_id"] == current_voice, level=level + 2)
        return
    for v in catalog:
        voice_row(target, v["voice_id"], provider, v["label"], v["voice_id"] == current_voice, level=level)

def target_picker(target, provider, current_voice, provider_mode):
    for prov in PROVIDER_ORDER:
        if not providers.get(prov, {}).get("configured"):
            continue
        catalog = voice_catalog(prov)
        if not catalog:
            continue
        current = prov == provider
        row = f"----{provider_label(prov)}"
        if current:
            print(f"{row} | refresh=true{check_row(True)}")
            voice_list(target, catalog, current_voice, prov, level=6)
        else:
            voice_id = provider_default_voice(prov, catalog)
            print(
                f"{row} | bash={shlex.quote(config_helper)} param1={shlex.quote(provider_mode)}"
                f" param2={shlex.quote(voice_id)} param3={shlex.quote(prov)}"
                " terminal=false refresh=false"
            )

# Narrate voice
print(f"--{t['narrate_voice'].format(voice=sanitize(voice_display_name(default_voice, active_catalog) or '(none)'))} | refresh=true")
target_picker("narrate", default_provider, default_voice, "narrate-provider")
if default_voice:
    print(f"----{t['test_narrate']} | bash={shlex.quote(speak_helper)} param1={shlex.quote(default_voice)} param2={shlex.quote(default_provider)} param3={shlex.quote(t['test_narrate_msg'])} terminal=false refresh=false")

# Session voice
if auto_is_default:
    print(f"--{t['session_voice_default']} | refresh=true")
    target_picker("auto", default_provider, default_voice, "auto-provider")
else:
    print(f"--{t['session_voice_header'].format(voice=sanitize(voice_display_name(auto_voice, session_catalog)))} | refresh=true")
    target_picker("auto", session_provider, auto_voice, "auto-provider")
print(f"----{t['use_same']} | bash='{config_helper}' param1='auto-same' terminal=false refresh=false{check_row(auto_is_default)}")
session_voice = auto_voice or default_voice
if session_voice:
    print(f"----{t['test_session']} | bash={shlex.quote(speak_helper)} param1={shlex.quote(session_voice)} param2={shlex.quote(session_provider)} param3={shlex.quote(t['test_session_msg'])} terminal=false refresh=false")

# ─── Service control ───────────────────────────────────────────────────────
print("---")
print(f"{t['service_section']} | refresh=true")
version = health.get('version', '')
version_suffix = f" (v{version})" if version else ""
print(f"--🔄 {t['update']}{version_suffix} | bash='{update_helper}' terminal=false refresh=false")
restart = f"launchctl unload '{plist}' 2>/dev/null; sleep 1; launchctl load '{plist}'"
print(f"--{t['restart']} | bash='/bin/bash' param1='-c' param2={shlex.quote(restart)} terminal=false refresh=true")
print(f"--{t['stop']} | bash='launchctl' param1='unload' param2={plist} terminal=false refresh=true")
print(f"--{t['view_log']} | bash='/bin/bash' param1='-c' param2=\"open -a Console.app '{log_path}'\" terminal=false")
print(f"--{t['tail_log']} | bash='/usr/bin/open' param1='-a' param2='Terminal' param3='{log_path}' terminal=false")

# ─── Recent log lines ──────────────────────────────────────────────────────
try:
    lines = open(log_path, errors="replace").read().splitlines()[-3:]
    if lines:
        print("---")
        print(f"{t['recent_log']} | refresh=true")
        for line in lines:
            short = line[:72]
            print(f"-- {short} | color=#888888 size=10 font=Menlo")
except Exception:
    pass

# ─── Footer + language (one row per language; active one checked) ──────────
# The lang helper writes the choice and refreshes the menu via the URL scheme.
print("---")
print(t["open_repo"] + " | href=https://github.com/felores/narrate")
print("---")
print(f"{t['language_section']} | refresh=true")
print(f"--🇬🇧 English | bash='{lang_helper}' param1='en' terminal=false refresh=false{check_row(lang == 'en')}")
print(f"--🇪🇸 Español | bash='{lang_helper}' param1='es' terminal=false refresh=false{check_row(lang == 'es')}")
PY
