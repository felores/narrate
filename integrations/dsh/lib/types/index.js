/**
 * narrate-dsh — narrate TTS integration for DeepSeek Harness (dsh).
 *
 * A Cordis runtime plugin (see the dsh-TUI plugin guide, docs/plugins.md) that
 * gives any dsh profile the same narrate voice features the OpenCode / Pi /
 * Codex harness integrations provide:
 *
 *   1. Auto-voice — listens for `assistant/message` session events, extracts
 *      the `🤖 BOT:` marker from the final line, and speaks it with the
 *      session voice (narrate `/health` `auto_voice` pair).
 *   2. On-demand — registers the `narrate_speak` tool so the agent can read
 *      text aloud ("narra", "read aloud", "dilo en voz alta").
 *   3. Convention — injects the `🤖 BOT:` convention into the system prompt
 *      as a stable section (the load-bearing always-on mechanism; a skill
 *      alone cannot guarantee the marker every turn).
 *   4. Skill — registers the bundled `narrate` SKILL.md on the skills
 *      registry (documentation + onboarding, discoverable via /skill).
 *
 * Failure policy: every narrate call is fire-and-forget and swallows errors —
 * TTS downtime never breaks the agent. Nothing is appended to the session log
 * (this plugin only listens), so no event-type registration is needed.
 *
 * @module narrate-dsh
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
export const name = 'narrate';
// Explicit annotation: the inferred z.dict output references cosmokit's Dict
// through a pnpm-virtual path, which is not portable in declaration emit
// (TS2883) when the dependency graph shifts (same fix as dsh-working-activity).
export const Config = z.object({
    url: z.string().default('http://localhost:8888'),
    autoVoice: z.boolean().default(true),
    tool: z.boolean().default(true),
    injectConvention: z.boolean().default(true),
    skill: z.boolean().default(true),
    voiceOverride: z.string().default(''),
});
/**
 * The `🤖 BOT:` convention — mirrored verbatim from the canonical narrate
 * skill (`skills/narrate/assets/convention.md`). Kept as a stable constant so
 * the injected section text never changes between runs (KV-cache stability).
 */
const BOT_CONVENTION = [
    '## Voice output (narrate)',
    '',
    'End every response with a one-line voice summary so narrate can speak it aloud:',
    '',
    '`🤖 BOT: <max 15 words, in the user\'s first-message language>`',
    '',
    'Put it on its own line at the very end. It must start with the exact marker',
    '`🤖 BOT:` (robot emoji + space + `BOT:` + space). When the user asks to "narra",',
    '"read aloud", "speak", or "dilo en voz alta", narrate it on demand too.',
].join('\n');
/** Client id sent to narrate per request for log filtering. */
const CLIENT_ID = 'dsh';
const MAX_CHARS = 5000;
/**
 * Matches `🤖 BOT: <text>` only when it is the FINAL line of the response.
 * Not anchored this way, inline examples of the marker in the message body
 * (quotes, bullets) trigger auto-voice and speak the wrong text. Mirrors the
 * OpenCode plugin's extraction.
 */
function extractBotMarker(text) {
    const lines = text.trimEnd().split('\n');
    const match = /\u{1F916}\s*BOT:\s*(.+)$/u.exec(lines[lines.length - 1] ?? '');
    if (match === null)
        return null;
    const trimmed = match[1].trim();
    return trimmed === '' ? null : trimmed;
}
/** Concatenate the text blocks of an assistant message (reasoning excluded). */
function textOf(message) {
    let out = '';
    for (const block of message.content) {
        if (block.type === 'text')
            out += block.text;
    }
    return out;
}
/** Resolve the voice pair for one kind from the narrate /health endpoint. */
async function serverVoice(url, kind) {
    try {
        const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
        if (!res.ok)
            return null;
        const h = (await res.json());
        if (kind === 'session') {
            if (!h.auto_voice)
                return null;
            return { provider: h.auto_provider || h.default_provider, voice_id: h.auto_voice };
        }
        if (!h.default_voice)
            return null;
        return { provider: h.default_provider, voice_id: h.default_voice };
    }
    catch {
        return null;
    }
}
/**
 * Send one narration request to the narrate server. Fire-and-forget: callers
 * never await this for their own completion and all failures are swallowed.
 */
async function speak(resolved, text, kind) {
    const message = text.slice(0, MAX_CHARS);
    if (message === '')
        return;
    try {
        const payload = { message };
        if (resolved.voiceOverride !== '') {
            payload.voice = resolved.voiceOverride;
        }
        else {
            const voice = await serverVoice(resolved.url, kind);
            if (voice !== null) {
                payload.voice_id = voice.voice_id;
                if (voice.provider !== undefined)
                    payload.provider = voice.provider;
            }
        }
        await fetch(`${resolved.url}/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Narrate-Client-Id': CLIENT_ID },
            body: JSON.stringify(payload),
        });
    }
    catch {
        // TTS being down must never break the agent.
    }
}
/** Read the bundled SKILL.md from the package root (built or source layout). */
function bundledSkillBody() {
    const here = fileURLToPath(new URL('.', import.meta.url));
    for (const rel of ['../../skills/narrate/SKILL.md', '../skills/narrate/SKILL.md']) {
        const candidate = join(here, rel);
        if (existsSync(candidate))
            return readFileSync(candidate, 'utf8');
    }
    return '';
}
/**
 * Wire the narrate plugin.
 * @param ctx - Cordis context (agent loop + session services composed).
 * @param config - Validated plugin config (schema defaults applied).
 */
export function apply(ctx, config = {}) {
    const resolved = {
        url: config.url || process.env.NARRATE_URL || 'http://localhost:8888',
        autoVoice: config.autoVoice ?? true,
        tool: config.tool ?? true,
        injectConvention: config.injectConvention ?? true,
        skill: config.skill ?? true,
        voiceOverride: config.voiceOverride || process.env.NARRATE_DSH_VOICE || '',
    };
    // Convention injection: the always-on mechanism. A skill loads on demand and
    // cannot guarantee the marker every turn; a stable system-prompt section
    // can. Removed automatically when this fiber unloads.
    if (resolved.injectConvention) {
        ctx.inject(['systemPrompt'], (promptCtx) => {
            promptCtx.systemPrompt.section({
                name: 'narrate:dsh',
                order: 61,
                text: BOT_CONVENTION,
            });
        });
    }
    // Auto-voice: one narration per assistant message id, per session. The
    // durable log replays `assistant/message` on resume, so dedup by message id
    // also guards against double-speaking after /resume.
    if (resolved.autoVoice) {
        const spoken = new Map();
        ctx.on('session/event', (session, event) => {
            if (event.type !== 'assistant/message')
                return;
            let seen = spoken.get(session);
            if (seen === undefined) {
                seen = new Set();
                spoken.set(session, seen);
            }
            if (seen.has(event.data.message.id))
                return;
            seen.add(event.data.message.id);
            const marker = extractBotMarker(textOf(event.data.message));
            if (marker !== null)
                void speak(resolved, marker, 'session');
        });
        ctx.on('session/disposed', (session) => {
            spoken.delete(session);
        });
    }
    // On-demand narration tool. Registered on the injected tools context so it
    // lives exactly as long as the tools service is composed.
    if (resolved.tool) {
        ctx.inject(['tools'], (toolsCtx) => {
            toolsCtx.tools.register(defineTool({
                name: 'narrate_speak',
                description: 'Read text aloud using the narrate TTS system. ' +
                    'Use when the user asks to "narrate", "read aloud", "speak", "narra", ' +
                    '"dilo en voz alta", or requests voice output. Keep the text concise ' +
                    '(under 100 words); summarize long content before speaking it.',
                parameters: {
                    text: {
                        type: 'string',
                        required: true,
                        description: 'The text to speak aloud. Keep concise (under 100 words / 500 chars); ' +
                            'summarize long content first.',
                    },
                },
                output: {
                    schema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            status: { type: 'string', required: true },
                        },
                    },
                    render: (_args, value) => [{ type: 'text', text: value.status }],
                },
                execute: async (args) => {
                    await speak(resolved, args.text, 'narrate');
                    return { status: `Spoken via narrate (voice=${resolved.voiceOverride || 'server-default'})` };
                },
                presentCall: (args) => ({
                    card: 'generic',
                    title: 'Narrate (TTS)',
                    kind: 'other',
                    rawInput: args.text,
                }),
            }));
        });
    }
    // Bundled skill: documentation + onboarding, discoverable via the skill
    // surface. Read from the package root; an unreadable body silently skips
    // registration (skill failure must never fail the plugin).
    if (resolved.skill) {
        const body = bundledSkillBody();
        if (body !== '') {
            ctx.inject(['skills'], (skillsCtx) => {
                skillsCtx.skills.register({
                    name: 'narrate',
                    description: 'Use narrate — the local TTS gateway. Setup, providers, voices, ' +
                        'auto-voice convention, and troubleshooting.',
                    content: body,
                    path: 'skills/narrate/SKILL.md',
                    source: 'bundled',
                });
            });
        }
    }
}
//# sourceMappingURL=index.js.map