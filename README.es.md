<div align="center">

<pre>
███╗   ██╗ █████╗ ██████╗ ██████╗  █████╗ ████████╗███████╗
████╗  ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██╔════╝
██╔██╗ ██║███████║██████╔╝██████╔╝███████║   ██║   █████╗  
██║╚██╗██║██╔══██║██╔══██╗██╔══██╗██╔══██║   ██║   ██╔══╝  
██║ ╚████║██║  ██║██║  ██║██║  ██║██║  ██║   ██║   ███████╗
╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝

                     HTTP · CLI · MCP
        Haz que tus agentes de IA hablen. Cero lock-in.
</pre>

🇪🇸 **Español**  ·  🇬🇧 [English](README.md)

Un gateway de TTS agnóstico al proveedor: un servidor, un set de llaves, la misma voz en cualquier harness.

**Claude Code · Cursor · OpenCode · Pi · Codex · DeepSeek Harness · cualquier shell**

</div>

---

## Por qué narrate

Tus agentes de IA generan texto. **narrate les da voz** — con la voz que quieras, del proveedor que ya pagas, dentro de la herramienta que uses. Lo configuras una vez, y cada harness, script y cron habla a través del mismo servidor.

- **Voz sin lock-in.** ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio, [Voicebox](https://github.com/jamiepine/voicebox) local o la voz integrada de tu sistema operativo — todo detrás de una sola interfaz. Cambiar de proveedor es una línea, nunca código del agente.
- **Habla desde el día uno.** Una instalación nueva habla de inmediato con la voz del sistema (macOS `say` / Linux `espeak` / Windows SAPI). Las llaves de API son opcionales — agrégalas cuando quieras calidad de estudio.
- **Una configuración, todas las herramientas.** CLI para shells y cron, HTTP para cualquier cosa que haga `fetch`, MCP para agentes con tool calling nativo. Mismas llaves, mismas voces, mismo servidor.
- **Entra en cualquier harness de IA.** Instaladores de un comando para Claude Code, OpenCode, Pi, Codex y DeepSeek Harness: voz automática en cada respuesta (convención `🤖 BOT:`), narración a demanda, cero JSON manual.
- **Cero dependencias para correr.** Binarios precompilados para macOS, Windows y Linux — sin bun, sin git, sin Node. Un comando instala todo, incluido el auto-arranque como servicio.

## Cuán versátil es

| | |
|---|---|
| **8 proveedores** | Nube (ElevenLabs, OpenAI, Gemini, xAI, Soniox, Fish Audio) + local (Voicebox, sistema) — agrega cualquier subconjunto, narrate usa lo que configures |
| **3 interfaces** | CLI · HTTP · MCP — un solo código, tres puertas de entrada |
| **6+ harnesses** | Instaladores de un comando para Claude Code, OpenCode, Pi, Codex y DeepSeek Harness; Cursor/Windsurf/Cline vía MCP; cualquier script de shell |
| **3 sistemas operativos** | macOS (launchd), Windows (SAPI + Task Scheduler), Linux (systemd) — los mismos comandos en todos |
| **0 llaves requeridas** | La voz del sistema funciona offline de fábrica; los proveedores premium son estrictamente aditivos |

La tabla completa de proveedores está [abajo](#proveedores); la de harnesses está [aquí](#úsalo-desde-cada-harness).

---

## Quickstart en 60 segundos (macOS)

Escucha a narrate hablar en tres comandos, sin llaves de API ni registro:

```bash
brew install felores/narrate/narrate
brew services start narrate
narrate "Hello, narrate"
```

Eso es todo. Usa la voz integrada de macOS. ¿Quieres voces con calidad de estudio? Agrega una [llave de API](#agregar-una-llave-de-api), es opcional.

> **¿Windows?** `scoop bucket add narrate https://github.com/felores/scoop-narrate && scoop install narrate`, después `narrate-server` y `narrate "hello"`. O descarga los [binarios precompilados](https://github.com/felores/narrate/releases/latest) — sin scoop, sin bun.

> **¿Linux?** `curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh | bash` (baja un binario precompilado, sin bun), luego `sudo apt install espeak-ng`, después `narrate-server &` y `narrate "hello"`.

---

<details>
<summary><strong>Tabla de contenido</strong></summary>

- [Por qué narrate](#por-qué-narrate)
- [Cuán versátil es](#cuán-versátil-es)
- [Agregar una llave de API](#agregar-una-llave-de-api) : para voces premium
- [Úsalo desde tu herramienta de IA](#úsalo-desde-cada-harness) : Claude Code, Cursor, OpenCode, etc.
- [Proveedores](#proveedores)
- [Instalación](#instalación) : otros métodos
- [Dónde vive todo](#dónde-vive-todo)
- [Configurar](#configurar)
- [Quickstart por interfaz](#quickstart-por-interfaz)
- [Detalle de configuración por proveedor](#detalle-de-configuración-por-proveedor)
- [Voicebox a fondo](#voicebox-a-fondo) : clonación de voz local
- [voices.json : presets de voz](#voicesjson--presets-de-voz)
- [Referencia del CLI](#referencia-del-cli)
- [Referencia de la API HTTP](#referencia-de-la-api-http)
- [Referencia de herramientas MCP](#referencia-de-herramientas-mcp)
- [Precedencia de configuración](#precedencia-de-configuración)
- [Correr como servicio](#correr-como-servicio)
- [Logging y observabilidad](#logging-y-observabilidad)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [narrate vs voicebox](#narrate-vs-voicebox)
- [Roadmap](#roadmap)
- [Solución de problemas](#solución-de-problemas)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

</details>

---

## Agregar una llave de API

Opcional. La voz por defecto de macOS funciona bien para notificaciones, pero los proveedores premium suenan mucho mejor. Elige uno (o varios):

| Proveedor | Dónde obtener la llave | Costo |
|---|---|---|
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io) | tier gratis, voces premium |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | pago por uso, muy barato |
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | tier gratis |
| xAI | [console.x.ai](https://console.x.ai) | pago por uso |
| Soniox | [console.soniox.com](https://console.soniox.com) | pago por uso |
| Fish Audio | [fish.audio](https://fish.audio) | tier dev gratis, luego por uso |

Luego agrega la(s) llave(s) a `~/.env` y cambia el proveedor por defecto:

```bash
echo 'OPENAI_API_KEY=sk-...' >> ~/.env       # any subset works
echo 'ELEVENLABS_API_KEY=...' >> ~/.env

mkdir -p ~/.config/narrate
echo '{"default_provider":"openai","default_voice":"nova"}' > ~/.config/narrate/config.json

brew services restart narrate
narrate "Now I sound much better"
```

`narrate verify` te muestra qué proveedores están configurados. Mira [Detalle de configuración por proveedor](#detalle-de-configuración-por-proveedor) para los IDs de voz de cada uno.

> **¿Por qué `~/.env` y no `~/.zshrc`?** Los servicios en segundo plano (`brew services`, LaunchAgent, systemd) no corren el init del shell. `~/.env` es la única ruta que funciona tanto para el CLI como para el servidor como servicio.

---

## Proveedores

| Proveedor | Tipo | Auth | Notas |
|---|---|---|---|
| **ElevenLabs** | Nube | `ELEVENLABS_API_KEY` | Alta calidad, voces premium |
| **OpenAI TTS** | Nube | `OPENAI_API_KEY` | `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` |
| **Google Gemini TTS** | Nube | `GEMINI_API_KEY` | Multilingüe, requiere `ffmpeg` para PCM→WAV |
| **xAI Grok TTS** | Nube | `XAI_API_KEY` | `eve`, `ara`, `rex`, `sal`, `leo` |
| **Soniox TTS** | Nube | `SONIOX_API_KEY` | `tts-rt-v2`, catálogo de voces en vivo, `Adrian` por defecto |
| **Fish Audio** | Nube | `FISH_AUDIO_API_KEY` | Modelos de voz entrenados desde tu audio, tier dev gratis (`s2.1-pro-free`) |
| **[Voicebox](https://github.com/jamiepine/voicebox)** | Proxy local | ninguna | Auto-detecta en `:17493` : clonación de voz, 7 motores locales, 23 idiomas |
| **System (`say` / `espeak` / SAPI)** | Local | ninguna | Fallback sin dependencias, funciona offline : macOS `say`, Linux `espeak`, Windows SAPI |

Agrega cualquier subconjunto. narrate usa lo que tengas configurado y reporta el resto como `⚪ not configured` en `narrate verify`.

## Instalación

### macOS : Homebrew (recomendado, un comando)

```bash
brew install felores/narrate/narrate
brew services start narrate          # auto-start at login
```

Eso es todo. Bun se incluye como dependencia. Después de esto puedes correr `narrate "hello"` y lo escucharás.

### Cualquier OS : binario precompilado (sin bun, sin git)

El instalador descarga un binario compilado standalone desde GitHub Releases.
No requiere nada instalado de antemano, ni bun ni git:

```bash
curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh -o /tmp/narrate-install.sh
bash /tmp/narrate-install.sh
"$HOME/.local/share/narrate/service/launchd/install.sh" \
  NARRATE_BIN="$HOME/.local/share/narrate/bin/narrate-server-darwin-arm64"   # macOS
```

- **Linux**: usa la línea de systemd:
  `NARRATE_BIN=.../narrate-server-linux-x64 "$HOME/.local/share/narrate/service/systemd/install.sh"`
- El binario queda en `~/.local/share/narrate/bin/`, wrappers en `~/.local/bin/{narrate,narrate-server}`.
- Si no existe binario precompilado para tu plataforma, el instalador cae automáticamente a la instalación desde fuente (`NARRATE_MODE=source` la fuerza; `NARRATE_MODE=binary` la exige; `NARRATE_VERSION=vX.Y.Z` fija una release).
- El servidor standalone escribe sus datos y logs en `~/.local/share/narrate` (sobrescribe con `NARRATE_DIR`).

Después de cualquiera de las instalaciones de arriba, corre el setup interactivo para registrar llaves, elegir tu voz por defecto, integrar tus harnesses e instalar el servicio de auto-arranque:

```bash
narrate setup
```

`narrate setup --check` imprime la misma información sin preguntar nada. Todo es opcional — narrate habla con la voz del sistema apenas el servidor esté arriba.

### Linux / macOS : instalación con curl (fuente)

Requiere [bun](https://bun.sh) primero (`curl -fsSL https://bun.sh/install | bash`).

```bash
curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/install.sh -o /tmp/narrate-install.sh
NARRATE_MODE=source bash /tmp/narrate-install.sh
"$HOME/.local/share/narrate/service/launchd/install.sh"   # macOS
"$HOME/.local/share/narrate/service/systemd/install.sh"   # Linux
```

Clona en `~/.local/share/narrate`, escribe wrappers en `~/.local/bin/{narrate,narrate-server}`, y luego instala el servicio de auto-arranque. Sobrescribe rutas con `NARRATE_DIR`, `BIN_DIR`, `NARRATE_REF`.

### Windows : Scoop o binario

**Scoop** (fuente, bun como dependencia):

```powershell
scoop bucket add narrate https://github.com/felores/scoop-narrate
scoop install narrate
narrate-server                      # start the server
narrate "hello from Windows"
```

Usa Windows SAPI (`System.Speech`) de fábrica, sin necesidad de llave de API. Córrelo al iniciar sesión con el helper de Task Scheduler de un comando:

```powershell
powershell -ExecutionPolicy Bypass -File "$(scoop prefix narrate)\install-service.ps1"
```

Mira [`packaging/scoop/`](packaging/scoop/) para el manifest, la configuración del servicio y las voces premium.

**Binario precompilado** (sin scoop, sin bun):

```powershell
# descarga desde https://github.com/felores/narrate/releases/latest
# narrate-windows-x64.exe  +  narrate-server-windows-x64.exe
narrate-server-windows-x64.exe    # inicia el servidor
narrate-windows-x64.exe "hello from Windows"
```

El servidor detecta automáticamente las voces SAPI de Windows, sin llave de API. Crea una entrada en Task Scheduler (al iniciar sesión) para auto-arrancarlo.

### Desarrollo : git clone

```bash
git clone https://github.com/felores/narrate.git ~/Documents/GitHub/narrate
cd ~/Documents/GitHub/narrate
bun install
bun run src/server.ts &
bun run src/cli.ts verify
```

## Dónde vive todo

Una vez instalado, el repo y los scripts quedan en una de estas rutas según el método que usaste:

| Método de instalación | `$NARRATE_DIR` | Logs |
|---|---|---|
| Homebrew | `$(brew --prefix narrate)/libexec` | `$NARRATE_DIR/logs/narrate.log` |
| binario precompilado | `~/.local/share/narrate` | `$NARRATE_DIR/logs/narrate.log` |
| instalación con curl | `~/.local/share/narrate` | `$NARRATE_DIR/logs/narrate.log` |
| git clone (dev) | donde lo hayas clonado (ej. `~/Documents/GitHub/narrate`) | `$NARRATE_DIR/logs/narrate.log` |

Configúralo una vez en el init de tu shell para que las recetas de abajo funcionen copiar y pegar:

```bash
# pick the line that matches how you installed
export NARRATE_DIR="$(brew --prefix narrate)/libexec"   # brew
export NARRATE_DIR="$HOME/.local/share/narrate"         # curl
export NARRATE_DIR="$HOME/Documents/GitHub/narrate"     # git clone
```

El servidor en ejecución reporta su propia ubicación en `GET /health` (`repo_dir`, `logs_dir`), útil para plugins y herramientas que necesitan auto-ubicarse.

## Configurar

Puedes saltarte esto por completo si la sección [Agregar una llave de API](#agregar-una-llave-de-api) cubrió lo que necesitabas. Esta sección es para **presets de voz con nombre** y **ajustes por proveedor**.

### Presets de voz (`voices.json`)

Mapea un nombre amigable a un triple `(provider, voice_id)` para que puedas cambiar de proveedor sin tocar el código del agente:

```bash
mkdir -p ~/.config/narrate
cp "$NARRATE_DIR/voices.json.example" ~/.config/narrate/voices.json
narrate --voice researcher "Findings ready"   # uses the preset from voices.json
```

Edita `~/.config/narrate/voices.json` para agregar tus propios presets. Schema completo en [voices.json : presets de voz](#voicesjson--presets-de-voz).

### Defaults personalizados (`config.json`)

```bash
cat > ~/.config/narrate/config.json <<EOF
{
  "default_provider": "openai",
  "default_voice": "researcher",
  "port": 8888
}
EOF
brew services restart narrate
```

Mira [Precedencia de configuración](#precedencia-de-configuración) para la cadena completa de resolución.

## Quickstart por interfaz

narrate expone tres interfaces. Elige la que tu herramienta soporte.

### CLI : `narrate "..."`

Ideal para shells, hooks, scripts, cron, comandos sueltos en terminal.

```bash
narrate "Build complete"
narrate --voice engineer "Tests passed"
narrate --provider system --id Samantha "Local fallback"
echo "Long output" | narrate --quiet
narrate verify              # doctor-style health snapshot
narrate verify --test       # also play one sample per configured provider (1 API call each)
```

### HTTP : `POST localhost:8888/notify`

Ideal para código de plugins, webhooks, cualquier cosa que pueda hacer fetch.

```bash
curl -X POST http://localhost:8888/notify \
  -H 'Content-Type: application/json' \
  -H 'X-Narrate-Client-Id: my-app' \
  -d '{"message":"Build green","voice":"engineer"}'
```

### MCP : `narrate.speak(...)`

Ideal para agentes de IA con tool calling nativo. El agente mismo decide cuándo hablar.

```bash
# Claude Code one-liner
claude mcp add narrate \
  --transport http \
  --url http://localhost:8888/mcp \
  --header "X-Narrate-Client-Id: claude-code"
```

O vía `.mcp.json` en cualquier cliente MCP por HTTP (Cursor, Windsurf, VS Code, Cline):

```json
{
  "mcpServers": {
    "narrate": {
      "url": "http://localhost:8888/mcp",
      "headers": { "X-Narrate-Client-Id": "cursor" }
    }
  }
}
```

El agente ahora ve `narrate.speak`, `narrate.list_voices` y `narrate.list_providers` como herramientas.

## Úsalo desde cada harness

Las recetas por harness viven en [`integrations/`](integrations/). Resumen:

| Harness | Método | Instalación de un comando | Receta |
|---|---|---|---|
| **Claude Code** | MCP + Stop hook + skill | `bash integrations/claude-code/install.sh` | [`integrations/claude-code/`](integrations/claude-code/) |
| **OpenCode** | Plugin (auto-voz + herramienta `narrate_speak`) | `integrations/opencode/install.sh` | [`integrations/opencode/`](integrations/opencode/) |
| **Pi (pi-mono)** | Extensión (auto-voz por `message_end`) + skill | `integrations/pi/install.sh` | [`integrations/pi/`](integrations/pi/) |
| **ChatGPT Codex CLI** | MCP (streamable HTTP) + AGENTS.md | `bash integrations/codex/install.sh` | [`integrations/codex/`](integrations/codex/) |
| **DeepSeek Harness (dsh)** | Plugin Cordis (auto-voz + herramienta `narrate_speak`) | `bash integrations/dsh/install.sh` | [`integrations/dsh/`](integrations/dsh/) |
| **Cursor / Windsurf / Cline** | MCP | snippet de config manual | [`integrations/cursor/`](integrations/cursor/) |
| **Scripts de shell / cron / CI** | CLI directo | n/a | [`integrations/shell/`](integrations/shell/) |

Los cinco harnesses de primera clase (Claude Code, OpenCode, Pi, Codex, DeepSeek Harness) traen un instalador de un comando que auto-registra todo (MCP, hooks/extensiones, la convención de auto-voz `🤖 BOT:`, y un skill acompañante). Sin editar JSON a mano.

### Plugin de OpenCode

[OpenCode](https://opencode.ai) tiene un sistema de plugins integrado. El plugin de narrate se engancha al streaming de mensajes para narrar respuestas automáticamente, y además provee una herramienta `narrate_speak` bajo demanda.

**Instalar:**

```bash
# 1. Make sure narrate is installed and running
brew install felores/narrate/narrate
brew services start narrate

# 2. Install the plugin
curl -fsSL https://raw.githubusercontent.com/felores/narrate/main/integrations/opencode/install.sh | bash

# 3. Restart OpenCode
```

Tras instalar, toda respuesta que termine con un marcador `🤖 BOT:` se leerá en voz alta automáticamente (el skill acompañante le enseña esta convención al agente). Di "narra eso", "read aloud" o "narrate" para narración bajo demanda.

Para usar otra voz:

```bash
export NARRATE_OPENCODE_VOICE=researcher   # any preset from voices.json
```

Mira [`integrations/opencode/`](integrations/opencode/) para detalles, presets de voz y solución de problemas.

## Detalle de configuración por proveedor

### ElevenLabs

1. Regístrate en [elevenlabs.io](https://elevenlabs.io) → API Keys → crea una llave.
2. `echo 'ELEVENLABS_API_KEY=your_key' >> ~/.env`
3. IDs de voz: encuéntralos en [elevenlabs.io/voice-lab](https://elevenlabs.io/voice-lab) (la URL de cada voz termina en su ID).
4. Agrega a `voices.json`:
   ```json
   "rachel": { "provider": "elevenlabs", "voice_id": "21m00Tcm4TlvDq8ikWAM" }
   ```

### OpenAI TTS

1. Obtén una llave en [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. `echo 'OPENAI_API_KEY=sk-...' >> ~/.env`
3. Seis voces integradas (sin IDs que buscar): `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`.
4. providerConfig opcional: `{ "model": "tts-1-hd", "speed": 1.2 }` para mayor calidad / habla más rápida.
   ```json
   "narrator": {
     "provider": "openai",
     "voice_id": "fable",
     "providerConfig": { "model": "tts-1-hd" }
   }
   ```

### Google Gemini TTS

1. Obtén una llave en [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. `echo 'GEMINI_API_KEY=...' >> ~/.env`
3. Instala `ffmpeg` (Gemini devuelve PCM crudo que convertimos a WAV):
   ```bash
   brew install ffmpeg                     # macOS
   sudo apt install ffmpeg                 # Linux
   ```
4. Nombres de voz: `Kore`, `Puck`, `Charon`, `Fenrir`, `Aoede` (y otros, mira la [doc de Gemini](https://ai.google.dev/gemini-api/docs/speech-generation)).

### xAI Grok TTS

1. Obtén una llave en [console.x.ai](https://console.x.ai).
2. `echo 'XAI_API_KEY=...' >> ~/.env`
3. IDs de voz: `eve`, `ara`, `rex`, `sal`, `leo`.
4. Opcional: `XAI_LANGUAGE=auto` (default), `XAI_VOICE_ID=ara` para fijar la voz por defecto.

### Fish Audio

1. Regístrate en [fish.audio](https://fish.audio) → API Keys → crea una llave.
2. `echo 'FISH_AUDIO_API_KEY=...' >> ~/.env`
3. Las voces son **modelos de voz** — crea uno en [fish.audio/models](https://fish.audio/models) desde tu propio audio de referencia, o usa un modelo público. El id de voz es el id del modelo (p. ej. `1f07c1d4cb88455c9d5a03de429ab894`). `narrate verify --test` lista tus modelos entrenados vía `GET /model`.
4. Header de modelo (calidad/latencia): `s2.1-pro-free` (default, tier gratis), `s2.1-pro`, `s2-pro`, `s1` — sobrescribe con `FISH_AUDIO_MODEL` o por preset:
   ```json
   "me": {
     "provider": "fish",
     "voice_id": "<model-id>",
     "providerConfig": { "model": "s2.1-pro", "latency": "balanced" }
   }
   ```

### Soniox TTS

1. Obtén una llave en [console.soniox.com](https://console.soniox.com).
2. `echo 'SONIOX_API_KEY=...' >> ~/.env`
3. Usa el catálogo en vivo de `tts-rt-v2`; `Adrian` es la voz por defecto.
4. providerConfig opcional: `{ "model": "tts-rt-v2", "language": "en", "speed": 1.1, "reduce_silence": true, "sample_rate": 24000, "bitrate": 128000 }`.

```json
"adrian": { "provider": "soniox", "voice_id": "Adrian" }
```

### Voicebox (local)

Mira [Voicebox a fondo](#voicebox-a-fondo). En resumen:

```bash
"$NARRATE_DIR/examples/voicebox-install-macos.sh"
open /Applications/Voicebox.app
# wait for Kokoro model download via Settings → Engines (or another engine)
"$NARRATE_DIR/examples/voicebox-create-profile.sh"     # creates "Bella" profile
narrate --provider voicebox --id Bella "Local voice"
```

### System (`say` / `espeak` / SAPI)

Cero configuración en macOS, `say` viene integrado. Cero configuración en Windows, usa `System.Speech.Synthesis` (SAPI) vía PowerShell. En Linux, instala `espeak-ng`:

```bash
sudo apt install espeak-ng     # Debian/Ubuntu
sudo dnf install espeak-ng     # Fedora
```

Nombres de voz: cualquier voz que hable tu sistema.

```bash
# macOS
say -v '?'                                          # list installed voices
narrate --provider system --id Samantha "macOS Samantha"

# Windows — use any installed SAPI voice by name
# (manage voices in Settings → Time & Language → Speech)
narrate --provider system --id "Microsoft Zira Desktop" "Windows Zira"
```

## Voicebox a fondo

[Voicebox](https://github.com/jamiepine/voicebox) es una app de escritorio local-first que corre motores de TTS en tu GPU. narrate la usa como proveedor: tu agente llama a `narrate.speak`, narrate hace proxy a voicebox, y voicebox reproduce el audio.

### Instalar

```bash
"$NARRATE_DIR/examples/voicebox-install-macos.sh"
```

(O descárgala manualmente desde [voicebox.sh](https://voicebox.sh) y arrástrala a `/Applications`.)

### Motor vs perfil (truco)

Voicebox tiene dos conceptos:

- **Motor (Engine)** = el modelo de TTS subyacente (Kokoro, Qwen, Chatterbox, TADA, LuxTTS). Cada motor trae voces preset.
- **Perfil (Profile)** = una instancia de voz usable, creada desde un preset o clonada de audio.

`/speak` solo acepta nombres de perfil: las voces preset deben **promoverse a perfiles** primero. Hazlo por la UI, o con el helper:

```bash
"$NARRATE_DIR/examples/voicebox-create-profile.sh"                          # creates "Bella" from kokoro/af_bella
"$NARRATE_DIR/examples/voicebox-create-profile.sh" Adam kokoro am_adam en
"$NARRATE_DIR/examples/voicebox-create-profile.sh" Dora kokoro ef_dora es
"$NARRATE_DIR/examples/voicebox-create-profile.sh" George kokoro bm_george en
```

### Comportamiento multilingüe

Las voces de Kokoro son flexibles: el mismo perfil puede hablar cualquiera de los 8 idiomas de Kokoro según el `language` que le pases a `/speak`. Las voces son vectores de estilo a nivel del modelo: describen un timbre, no un idioma. Apuntarlas a otro idioma está soportado.

- Un perfil basado en `kokoro/ef_dora` creado con `language: "es"` habla español natural.
- El mismo perfil Dora pidiéndole `language: "en"` habla inglés con acento español (su timbre entrenado + fonética inglesa).
- Un perfil basado en `kokoro/af_bella` (entrenado en inglés) pidiéndole `language: "es"` habla español con el timbre americano de Bella pero fonética española correcta: esta es **la forma de hacer que Bella hable español de forma natural**.
- El proveedor voicebox de narrate resuelve `profile.language` automáticamente (cacheado 60s) como default. Sobrescribe por llamada con `--language es` (CLI), `providerConfig.language: "es"` (body del POST o voices.json), o fija un preset:

```json
"bella_es": {
  "provider": "voicebox",
  "voice_id": "Bella",
  "providerConfig": { "language": "es" }
}
```

### Presets de Kokoro disponibles de un vistazo

50 presets en total. Algunos destacados:

| Preset | Nombre | Idioma / acento |
|---|---|---|
| `af_bella`, `af_nova`, `af_sky`, `af_nicole` | varias | en-femenino (US) |
| `am_adam`, `am_onyx`, `am_echo` | Adam, Onyx, Echo | en-masculino (US) |
| `bf_emma`, `bf_alice` | Emma, Alice | en-femenino (UK) |
| `bm_george`, `bm_daniel` | George, Daniel | en-masculino (UK) |
| `ef_dora`, `em_alex` | Dora, Alex | es femenino / masculino |
| `ff_siwis` | Siwis | fr femenino |
| `hf_alpha`, `hm_omega` | varias | hi femenino / masculino |
| `jf_alpha`, `jm_kumo` | varias | ja femenino / masculino |
| `zf_xiaoxiao`, otras | varias | zh femenino |

Lista completa: `curl http://127.0.0.1:17493/profiles/presets/kokoro`.

## voices.json : presets de voz

Mapea un nombre amigable a un triple `(provider, voice_id, options)` para cambiar de proveedor sin tocar el código del agente.

### Schema v2 (actual)

```json
{
  "default_voice": "fred",
  "default_rate": 175,
  "voices": {
    "fred":      { "provider": "elevenlabs", "voice_id": "s3TPKV1kjDlVtZbl4Ksh" },
    "researcher":{ "provider": "openai",     "voice_id": "nova"     },
    "engineer":  { "provider": "openai",     "voice_id": "alloy"    },
    "narrator":  { "provider": "openai",     "voice_id": "fable",
                   "providerConfig": { "model": "tts-1-hd" } },
    "ara":       { "provider": "xai",        "voice_id": "ara"      },
    "adrian":    { "provider": "soniox",     "voice_id": "Adrian"   },
    "kore":      { "provider": "gemini",     "voice_id": "Kore"     },
    "me":        { "provider": "fish",       "voice_id": "<model-id>" },
    "bella":     { "provider": "voicebox",   "voice_id": "Bella"    },
    "dora":      { "provider": "voicebox",   "voice_id": "Dora"     },
    "samantha":  { "provider": "system",     "voice_id": "Samantha" }
  }
}
```

Úsalo con el nombre del preset: `narrate --voice dora "Hola"`.

### Compatibilidad con v1

Si tu `voices.json` solo tiene `voice_name` por entrada (sin campo `provider`), narrate asume automáticamente `provider: "system"` (el schema v1 era para `say` de macOS). Verás una advertencia de una línea al arrancar.

### providerConfig por preset

Cada proveedor acepta opciones extra bajo `providerConfig`:

| Proveedor | Llaves útiles |
|---|---|
| ElevenLabs | `model_id`, `voice_settings: {stability, similarity_boost, style, use_speaker_boost}` |
| OpenAI | `model` (`tts-1` / `tts-1-hd`), `speed` (0.25–4.0) |
| Gemini | `model` |
| xAI | `language`, `sample_rate`, `bit_rate`, `codec` |
| Soniox | `model` (`tts-rt-v2`), `language`, `speed` (0.7-1.3), `reduce_silence`, `sample_rate`, `bitrate` (bits/s) |
| Fish Audio | `model` (`s2.1-pro-free`, `s2.1-pro`, `s2-pro`, `s1`), `latency` (`normal`/`balanced`/`low`) |
| Voicebox | `language`, `instruct` (entrega en lenguaje natural de Qwen CustomVoice), `personality` (booleano), `return_audio` (usa `/generate` en vez de `/speak`) |
| System | `rate` |

## Referencia del CLI

```text
narrate [options] "text to speak"
narrate verify [--test]
echo "text" | narrate [options]

Options:
  -v, --voice NAME      Voice preset from voices.json (e.g. fred, researcher)
  -i, --id ID           Raw provider voice id (bypasses preset registry)
  -p, --provider NAME   elevenlabs | openai | gemini | xai | soniox | fish | voicebox | system
  -l, --language LANG   Force generation language (e.g. es, en, ja, fr).
                        Useful with cross-language voices: a Kokoro Bella
                        (en-trained) speaks proper Spanish phonetics with
                        --language es, since Kokoro is multilingual at the
                        model level.
  --instruct TEXT       Natural-language delivery hint (Qwen CustomVoice
                        only). E.g. "warm conversational tone",
                        "broadcast news quality", "speak slowly with
                        emphasis". Other engines ignore this flag.
  -u, --url URL         Server URL (default http://localhost:8888)
  -q, --quiet           Suppress output
  -h, --help            Show help

Subcommands:
  verify                Health snapshot — server status, provider matrix, voices
  verify --test         Also play one sample per configured provider (1 API call each)
  setup                 Interactive setup — API keys, default voice, harness integrations, service
  setup --check         Non-interactive setup report (same info, asks nothing)

Env:
  NARRATE_URL           Override default server URL
  NARRATE_VOICE         Default preset (fallback for omitted --voice)
```

`--language` e `--instruct` se reenvían como `providerConfig.{language,instruct}` y sobrescriben tanto el providerConfig del preset como los defaults del perfil auto-resueltos por el proveedor voicebox.

```bash
# Bella is en-trained, but Kokoro can aim her at Spanish phonetics:
narrate --provider voicebox --id Bella --language es "Hola, soy Bella en español"

# Qwen Ryan with delivery direction:
narrate --provider voicebox --id Ryan --instruct "broadcast news quality" "Headlines tonight"
```

## Referencia de la API HTTP

### `POST /notify`

Narra texto. Devuelve de inmediato; el audio se reproduce de forma asíncrona.

**Body:**

| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| `message` | string | sí | Hasta 5000 caracteres, sin caracteres de control |
| `voice` | string | no | Nombre de preset de voices.json |
| `voice_id` | string | no | ID de voz crudo del proveedor (omite presets) |
| `voice_name` | string | no | Alias legacy de `voice_id` |
| `provider` | string | no | Sobrescribe el proveedor por defecto |
| `voice_enabled` | boolean | no (default `true`) | Si es `false`, devuelve `{status: "ok", message: "voice_enabled=false; nothing to do"}` |
| `providerConfig` | object | no | Config passthrough por proveedor (mira la tabla de arriba) |

**Headers:**

| Header | Propósito |
|---|---|
| `X-Narrate-Client-Id` | Identificador del cliente (logueado + ruteo por cliente a futuro) |

**Respuesta (200):**

```json
{ "status": "success", "provider": "openai", "voice": "alloy", "format": "mp3", "delegated": false }
```

`delegated: true` significa que el proveedor reprodujo el audio él mismo (voicebox, system) y narrate se saltó la reproducción local.

### `POST /pai`

Alias legacy de `/notify` (compatibilidad con PAI Voice).

### `GET /health`

Snapshot del servidor y los proveedores.

```json
{
  "status": "healthy",
  "port": 8888,
  "default_provider": "xai",
  "default_voice": "ara",
  "voices_path": "/Users/you/.config/narrate/voices.json",
  "voices": ["fred", "researcher", "engineer", ...],
  "providers": {
    "elevenlabs": { "configured": true },
    "openai": { "configured": true },
    "gemini": { "configured": true },
    "xai": { "configured": true },
    "fish": { "configured": true, "credits": "128,000 / 500,000 chars (free)" },
    "voicebox": { "configured": true },
    "system": { "configured": true }
  }
}
```

### `GET /voices`

Contenido completo de voices.json.

```json
{
  "default_voice": "fred",
  "default_rate": 175,
  "voices": { "fred": { ... }, "researcher": { ... } }
}
```

### `POST /mcp`

Endpoint MCP Streamable HTTP. JSON-RPC 2.0. Mira [Referencia de herramientas MCP](#referencia-de-herramientas-mcp).

## Referencia de herramientas MCP

Tres herramientas disponibles vía el servidor MCP en `/mcp`:

### `speak`

```typescript
narrate.speak({
  text: string,                  // required, max 5000
  voice?: string,                // preset name from voices.json
  voice_id?: string,             // raw provider voice id
  provider?: "elevenlabs" | "openai" | "gemini" | "xai" | "soniox" | "fish" | "voicebox" | "system"
}) -> "Spoken via <provider> (voice=<voice>, format=<fmt>, delegated playback)"
```

### `list_voices`

```typescript
narrate.list_voices() -> Array<{ name, provider, voice_id, description }>
```

Devuelve todos los presets de voz de voices.json.

### `list_providers`

```typescript
narrate.list_providers() -> Array<{ name, label, configured, reason? }>
```

Devuelve la matriz de salud de proveedores: los mismos datos que el campo `providers` de `GET /health`.

### Descubrir vía JSON-RPC

```bash
# tools/list
curl -X POST http://localhost:8888/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# tools/call
curl -X POST http://localhost:8888/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"speak","arguments":{"text":"Hello","voice":"researcher"}}}'
```

## Precedencia de configuración

Las filas más altas ganan. narrate lee cada capa al arrancar; los cambios en caliente necesitan reiniciar el servidor.

| # | Capa | Usada para |
|---|---|---|
| 1 | Flags del CLI / body del POST / args de la herramienta MCP | provider, voice, providerConfig por llamada |
| 2 | `~/.config/narrate/config.json` | default_provider, default_voice, port, voices_path |
| 3 | Variables de entorno `NARRATE_*` | `NARRATE_PORT`, `NARRATE_PROVIDER`, `NARRATE_VOICE`, `NARRATE_VOICES_PATH`, `NARRATE_URL` (solo CLI) |
| 4 | `~/.claude/settings.json` (compat legacy) | `TTS_PROVIDER` y `DA_VOICE_ID`/`NARRATE_VOICE_ID` se leen por retrocompatibilidad |
| 5 | `~/.env` | Llaves de API (`ELEVENLABS_API_KEY`, etc.) auto-cargadas si existen |
| 6 | Defaults integrados | `port: 8888`, `default_provider: "system"`, `default_rate: 175` |

Las llaves de API vienen de `process.env` (cargadas de tu shell o auto-cargadas de `~/.env`). Nunca las pongas en `config.json` ni en `voices.json`.

## Correr como servicio

### macOS (launchd)

```bash
brew services start narrate              # if installed via Homebrew
"$NARRATE_DIR/service/launchd/install.sh" # if installed via curl/git
NARRATE_BIN="$NARRATE_DIR/bin/narrate-server-darwin-arm64" \
  "$NARRATE_DIR/service/launchd/install.sh"   # binario precompilado
```

El instalador:
1. Renderiza `com.narrate.server.plist` desde una plantilla (`$HOME` y `$NARRATE_DIR` sustituidos al instalar, con un `PATH` estático de `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`, más el dir de bun en modo fuente).
2. Lo deja en `~/Library/LaunchAgents/`.
3. Lo carga con `launchctl`.
4. Verifica que esté corriendo.

Sin `NARRATE_BIN` corre `bun run src/server.ts`; con `NARRATE_BIN` corre el binario compilado directamente (sin bun). El servidor en modo binario lee sus rutas de datos/logs de `NARRATE_DIR`.

Para removerlo:

```bash
brew services stop narrate
"$NARRATE_DIR/service/launchd/uninstall.sh"
```

### Linux (systemd)

```bash
"$NARRATE_DIR/service/systemd/install.sh"
NARRATE_BIN="$NARRATE_DIR/bin/narrate-server-linux-x64" \
  "$NARRATE_DIR/service/systemd/install.sh"   # modo binario
```

Lo instala como servicio de usuario (`~/.config/systemd/user/narrate.service`) y corre `systemctl --user enable --now`.

Para removerlo:

```bash
"$NARRATE_DIR/service/systemd/uninstall.sh"
```

## Logging y observabilidad

### Logs en vivo

| Archivo | Qué |
|---|---|
| `logs/narrate.log` | Todos los requests, con timestamp, proveedor, voz, latencia, client id |
| `logs/narrate-error.log` | Errores |
| `logs/launchd-stdout.log` | Salida de arranque pre-init (pequeña, solo crece en crashes) |
| `logs/launchd-stderr.log` | Lo mismo para stderr |

```bash
# follow live request log (resolve the path via /health if you don't know it)
LOGS_DIR="$(curl -s localhost:8888/health | python3 -c 'import sys,json;print(json.load(sys.stdin)["logs_dir"])')"
tail -f "$LOGS_DIR/narrate.log"

# or if you set $NARRATE_DIR per "Where things live":
tail -f "$NARRATE_DIR/logs/narrate.log"

# example line
2026-04-27T23:44:36.733Z [/notify] → provider=voicebox voice=Dora bytes=42 from=localhost client=- ua=Bun/1.2.10
2026-04-27T23:44:36.755Z [/notify] ✅ 25ms provider=voicebox voice=Dora format=mp3 delegated=true
```

### Rotación de logs

Rotación en proceso. Defaults: 10 MiB por archivo, mantiene los últimos 5 (`narrate.log` → `narrate.log.1` → ... → `narrate.log.5`).

```bash
# tune via env (read once at server start)
NARRATE_LOG_MAX_BYTES=20971520 NARRATE_LOG_KEEP=10 narrate-server

# disable entirely (use raw stdout/stderr — useful for `bun run` dev mode)
NARRATE_LOG_DISABLED=1 narrate-server
```

### Doctor `narrate verify`

```bash
narrate verify
narrate verify --test    # also play 1 sample per configured provider
```

Imprime la salud del servidor, proveedor/voz por defecto, ruta del archivo de voces, lista de presets, y el estado configurado/razón de cada proveedor.

## Arquitectura

```text
┌────────────────────────────────────────────────────────────┐
│                      narrate (Bun process)                 │
│                                                            │
│   HTTP server (port 8888)                                  │
│   ├─ POST /notify    POST /pai (legacy)                    │
│   ├─ GET  /health    GET  /voices                          │
│   └─ POST /mcp       (MCP Streamable HTTP)                 │
│                                                            │
│            │                                               │
│            ▼                                               │
│   handleNotify()                                           │
│            │                                               │
│            ▼                                               │
│   Provider registry  (ALL_PROVIDERS)                       │
│   ┌──────────────┬──────────────┬────────────┐             │
│   │ ElevenLabs   │ OpenAI       │ Gemini     │  cloud      │
│   ├──────────────┼──────────────┼────────────┤             │
│   │ xAI          │ Soniox       │ Fish       │  cloud      │
│   ├──────────────┼──────────────┼────────────┤             │
│   │ Voicebox     │ System       │            │  local      │
│   └──────────────┴──────────────┴────────────┘             │
│            │                                               │
│            ▼                                               │
│   ArrayBuffer  (or delegated=true)                         │
│            │                                               │
│            ▼                                               │
│   playback.ts → afplay (macOS) / ffplay (Linux)            │
└────────────────────────────────────────────────────────────┘
```

Cada `Provider` (en `src/providers/`) implementa una interfaz pequeña:

```typescript
interface Provider {
  name: string;
  label: string;
  health(): Promise<ProviderHealth>;
  generateSpeech(text: string, voice: string, opts?: ProviderOptions): Promise<AudioResult>;
  listVoices?(): Promise<VoiceInfo[]>;
}
```

Las implementaciones de proveedor hablan con sus respectivas APIs (o servicios locales como voicebox `:17493`). El resultado es un `ArrayBuffer` (nube: narrate lo reproduce localmente vía `playback.ts`) o `delegated: true` (voicebox, system: ellos manejan la reproducción).

El servidor MCP es un wrapper delgado: registra `narrate.speak`, `narrate.list_voices`, `narrate.list_providers` como herramientas, y la herramienta `speak` llama a la misma función `handleNotify` que el handler HTTP. Una sola ruta de código, tres interfaces.

## Estructura del proyecto

```text
narrate/
├── src/
│   ├── providers/
│   │   ├── base.ts              # Provider interface, types
│   │   ├── elevenlabs.ts
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   ├── xai.ts
│   │   ├── soniox.ts
│   │   ├── fish.ts
│   │   ├── voicebox.ts
│   │   ├── system.ts
│   │   └── index.ts             # registry
│   ├── voices.ts                # voices.json loader (v1 → v2 compat)
│   ├── config.ts                # XDG config + env vars + ~/.claude/settings.json shim
│   ├── playback.ts              # afplay / ffplay
│   ├── logger.ts                # rotating file logger
│   ├── mcp.ts                   # MCP server (Streamable HTTP)
│   ├── server.ts                # HTTP server
│   └── cli.ts                   # narrate CLI
├── integrations/                # one folder per harness with real refs
│   ├── claude-code/
│   ├── opencode/
│   ├── pi/
│   ├── codex/
│   ├── dsh/
│   ├── cursor/
│   └── shell/
├── service/
│   ├── launchd/                 # macOS install + plist template
│   └── systemd/                 # Linux install + unit template
├── examples/
│   ├── config.example.json
│   ├── voicebox-install-macos.sh
│   └── voicebox-create-profile.sh
├── voices.json.example
├── install.sh                   # curl install entry point
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── LICENSE
└── .github/workflows/           # CI (TBD)
```

## narrate vs voicebox

[Voicebox](https://github.com/jamiepine/voicebox) es un estudio de TTS local-first completo, con inferencia en el dispositivo, clonación de voz, dictado, servidor MCP y 7 motores locales. Es una app de escritorio.

`narrate` es un gateway delgado. **Se componen**: voicebox es uno de los proveedores de narrate.

| | narrate | voicebox |
|---|---|---|
| Forma | CLI + servidor HTTP + MCP | App de escritorio (Tauri) |
| Motores | Nube + proxy voicebox + system | 7 motores locales (MLX/CUDA) |
| Clonación de voz | No (usa voces del proveedor) | Sí (zero-shot) |
| Dictado (STT) | No | Sí (hotkey Whisper) |
| Servidor MCP | Sí (`/mcp`) | Sí (`/mcp` en :17493) |
| Tamaño | < 1 MB + bun | GB de modelos |
| Ideal para | Caer en cualquier agente o shell | Flujos de estudio privacy-first |

Usa **narrate** cuando quieras un comando que cualquier harness o shell pueda llamar, mezclando proveedores de nube y locales. Usa **voicebox** cuando quieras voz totalmente local y acelerada por GPU. Usa **ambos** cuando quieras la calidad de voicebox más el gateway agnóstico de narrate.

## Roadmap

| Estado | Item |
|---|---|
| ✅ v0.1.0 | 6 proveedores, CLI, servidor HTTP, voices.json v2, launchd + systemd |
| ✅ v0.2.0 | Observabilidad por request, `narrate verify`, integraciones reales de OpenCode + Pi, helper de instalación de voicebox |
| ✅ v0.3.0 | Servidor MCP (`/mcp`), script de instalación con curl, tap de Homebrew, helper de perfiles de voicebox, fix multilingüe |
| ✅ v0.3.1 | Rotación de logs en proceso |
| ✅ v0.3.2 | Passthrough de `instruct` de Voicebox (entrega en lenguaje natural de Qwen) |
| ✅ v0.3.3 | Flags `--language` e `--instruct` del CLI |
| ✅ v0.3.4 | Plugin de menubar SwiftBar / xbar |
| ✅ v0.3.5 | Fixes de portabilidad: `/health` expone `repo_dir`/`logs_dir`, el plugin se auto-ubica, autostart de SwiftBar en Login Items, el plist deja de hacer snapshot de `$PATH` |
| ✅ v0.3.6 | UX de primer arranque: el proveedor por defecto es `system` para que las instalaciones nuevas funcionen sin llaves de API. README reescrito para usuarios no técnicos con un quickstart de 3 comandos arriba. |
| ✅ v0.4.0 | Soporte Windows (provider SAPI + bucket de Scoop). Skill canónico `narrate` (setup guiado + previews de voz). Instaladores de un comando para Claude Code + Codex. Fix de inyección siempre-activa de auto-voz. Extensión de Pi. README en español. |
| ✅ v0.5.0 | Releases de binario único precompilado (sin bun) + pipeline de release en GitHub Actions. Wizard interactivo `narrate setup`. Provider de Fish Audio (modelos de voz entrenados, tier dev gratis). Servicios launchd/systemd en modo binario. Helper de Task Scheduler para Windows. |
| ✅ v0.5.1 | Provider Soniox `tts-rt-v2` con voces en vivo. Integración con DeepSeek Harness. Actualizador de SwiftBar y fix de compatibilidad para submenús dinámicos deshabilitados. |
| ✅ v0.5.2 | Enlaces de API keys en SwiftBar y acciones de prueba restauradas para cada voz. |
| Planeado v0.6 | Modo CLI `--direct` (omite el servidor, llama a los proveedores directo) |
| Planeado v0.7 | TTS en streaming sobre WebSocket |
| Planeado v0.8 | Tokens de auth para `/notify` y `/mcp` (actualmente solo localhost) |
| Planeado v1.0 | Suite de tests, GitHub Actions CI, publicación en npm |

## Solución de problemas

### `narrate verify` dice que el proveedor X está `⚪ not configured`

- Proveedor de nube: la variable de la llave de API no está seteada. `cat ~/.env | grep <PROVIDER>_API_KEY`. Reinicia el servidor tras agregarla (`brew services restart narrate` o relanza el LaunchAgent).
- Voicebox: la app no está corriendo, o corre en un puerto no-default. Abre `/Applications/Voicebox.app`. Si está en otro puerto, setea `VOICEBOX_URL=http://127.0.0.1:NNNNN`.
- System en Linux: instala `espeak-ng`.

### Los logs del servidor muestran `[xai] 404 Voice 'Samantha' not found`

El proveedor por defecto es el que diga `~/.claude/settings.json` (o `default_provider` en `config.json`). Cuando pasas `--id Samantha` sin `--provider system`, narrate usa el proveedor por defecto, que no conoce a Samantha. Entonces:

- `narrate --provider system --id Samantha "..."` (proveedor explícito)
- `narrate --voice samantha "..."` (preset que junta proveedor + id de voz)

### El perfil de voicebox habla el idioma equivocado

Resuelto en v0.3.0 (`aede995`): el `/speak` de voicebox no toma `language` del perfil automáticamente, usa `"en"` por defecto. narrate ahora resuelve y pasa profile.language solo. Si sigue mal, fuérzalo con `providerConfig.language`:

```json
"dora_es": {
  "provider": "voicebox", "voice_id": "Dora",
  "providerConfig": { "language": "es" }
}
```

### Dos binarios `narrate` en el PATH

Si hiciste `brew install narrate` Y además corriste la instalación con curl, tienes `/opt/homebrew/bin/narrate` y `~/.local/bin/narrate`. Ambos funcionan; el orden del PATH decide cuál gana. Elige uno y elimina el otro.

### Los logs son enormes

Ajusta la rotación:

```bash
# in your shell init or LaunchAgent EnvironmentVariables
NARRATE_LOG_MAX_BYTES=2097152    # 2 MiB
NARRATE_LOG_KEEP=3
```

O desactívala por completo:

```bash
NARRATE_LOG_DISABLED=1
```

### "Stateless transport cannot be reused" en `/mcp`

Ya está arreglado en v0.3.0 (`a5aaa14`). Si lo ves, tu instalación local es previa al fix: trae `main` y recarga.

## Contribuir

```bash
git clone https://github.com/felores/narrate.git
cd narrate
bun install
bun run --watch src/server.ts                      # hot-reload dev mode
./node_modules/.bin/tsc --noEmit                   # typecheck
```

Para agregar un nuevo proveedor de TTS:

1. Crea `src/providers/<name>.ts` implementando la interfaz `Provider` de `src/providers/base.ts`.
2. Regístralo en `src/providers/index.ts`.
3. Agrega un test de integración en `narrate verify --test` (el mapa `sampleVoiceFor`).
4. Documéntalo en la sección [Detalle de configuración por proveedor](#detalle-de-configuración-por-proveedor) de este README.

PRs bienvenidos. Issues: https://github.com/felores/narrate/issues

## Licencia

MIT, mira [LICENSE](LICENSE).
