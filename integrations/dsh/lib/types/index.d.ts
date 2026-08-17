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
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "narrate";
/** Configurable knobs; every key has a sane default — a bare mount is a no-op, never a boot failure. */
export type Config = {
    /** Narrate server base URL. Env `NARRATE_URL` wins when the key is absent. */
    url?: string;
    /** Speak the `🤖 BOT:` marker at the end of each assistant message. */
    autoVoice?: boolean;
    /** Register the `narrate_speak` on-demand tool. */
    tool?: boolean;
    /** Inject the `🤖 BOT:` convention section into the system prompt. */
    injectConvention?: boolean;
    /** Register the bundled narrate skill on the skills registry. */
    skill?: boolean;
    /** Force a voice (any voices.json preset) instead of the server pair. */
    voiceOverride?: string;
};
export declare const Config: Schemastery<Config>;
/**
 * Wire the narrate plugin.
 * @param ctx - Cordis context (agent loop + session services composed).
 * @param config - Validated plugin config (schema defaults applied).
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map