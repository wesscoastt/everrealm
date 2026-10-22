// AI-voiced townsfolk: free conversation with a few NPCs, answered by Claude through the Anthropic
// API. The key lives only here, on the server (ANTHROPIC_API_KEY in the host's environment); the
// browser never sees it and never calls the API.
//
// What it is and isn't:
//   - Talk only. A reply is text shown in the dialogue box. Nothing the model says is read by the
//     game: it can't give items, marks or experience, start or finish quests, or change any flag.
//   - Separate from everything else on the socket. The call is made off the message loop and its
//     reply arrives on its own later; movement, combat, trades and saves never wait for it.
//   - Bounded. Per character: one request at a time, a few seconds apart, a few dozen a day. For the
//     whole realm: a daily budget in dollars (NPC_DAILY_USD, default $1), counted from the tokens each
//     reply really used, so the credit lasts a known number of days whatever the model or the crowd.
//   - Fails soft. Without a key the feature is off and the game shows nothing new; a limit, an error
//     or a refusal gets one of the NPC's own written lines instead of a reply.
//
// Messages: client -> { t: 'npcSay', npc, text }; server -> { t: 'npcLine', npc, text, ok, why? }.
// Which NPCs can chat is sent on joining ('welcome'.npcAi).

import Anthropic from '@anthropic-ai/sdk';
import { PERSONAS } from './npc-personas.mjs';

const MODEL = process.env.NPC_MODEL || 'claude-opus-5-5';
const DAILY_USD = Math.max(0, Number(process.env.NPC_DAILY_USD ?? 1) || 0);
// Dollars per million tokens: [input, output, cache read, cache write]. A model not listed is
// counted at Opus 5.5's price, so a guess errs towards stopping early.
const PRICES = { 'claude-opus-5-5': [4, 20, 0.2, 5], 'claude-haiku-5-5': [0.1, 0.5, 0.01, 0.125] };
const PRICE = PRICES[MODEL] ?? PRICES['claude-opus-5-5'];
const PER_DAY = 60, PER_TEN_MIN = 15, GAP_MS = 3000;
const MAX_IN = 240, MAX_OUT_CHARS = 420, HISTORY = 8, IDLE_MS = 20 * 60_000;
// Server-side refusal fallback is offered on these models (see the Anthropic docs); not on Haiku
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

export function npcInit(ctx) {
  const { send, log } = ctx;
  const enabled = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  // Retries are few and quick: a player is waiting at the bar, not a batch job
  const client = enabled ? new Anthropic({ timeout: 20_000, maxRetries: 1 }) : null;
  log(enabled ? `AI townsfolk on (${MODEL}, ${DAILY_USD} a day)` : 'AI townsfolk off (no ANTHROPIC_API_KEY)');

  /** Character key -> { day, dayCount, recent: ms[], last, busy } */
  const usage = new Map();
  /** "characterKey:npc" -> { msgs, at } */
  const memory = new Map();
  let today = dayOf(Date.now()), todayCount = 0, spent = 0;

  function dayOf(ms) { return Math.floor(ms / 86_400_000); }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const line = (me, npc, text, ok, why) => { if (me.ws.readyState === 1) send(me.ws, { t: 'npcLine', npc, text, ok, ...(why ? { why } : {}) }); };

  /** Is this character allowed another line now? Returns why not, or null. */
  function limit(me) {
    const now = Date.now();
    if (dayOf(now) !== today) { today = dayOf(now); todayCount = 0; spent = 0; }
    if (spent >= DAILY_USD) return 'realm';
    let u = usage.get(me.key);
    if (!u || u.day !== today) usage.set(me.key, (u = { day: today, dayCount: 0, recent: [], last: 0, busy: false }));
    if (u.busy) return 'busy';
    if (now - u.last < GAP_MS) return 'busy';
    u.recent = u.recent.filter((t) => now - t < 600_000);
    if (u.recent.length >= PER_TEN_MIN) return 'busy';
    if (u.dayCount >= PER_DAY) return 'day';
    return null;
  }

  /** What the player typed, made safe to pass on: printable, one line, short. */
  function clean(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_IN);
  }

  /** What the model said, made safe to show: plain speech, no markup, not too long. */
  function tidy(text) {
    let t = text.replace(/\*[^*]*\*/g, ' ').replace(/[#_`>|]/g, '').replace(/\s+/g, ' ').trim();
    if (t.length > MAX_OUT_CHARS) {
      const cut = t.slice(0, MAX_OUT_CHARS);
      const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
      t = end > 80 ? cut.slice(0, end + 1) : cut.trimEnd() + '…';
    }
    return t;
  }

  async function ask(me, npcId, persona, said) {
    const key = me.key + ':' + npcId;
    let mem = memory.get(key);
    if (!mem || Date.now() - mem.at > IDLE_MS) memory.set(key, (mem = { msgs: [], at: Date.now() }));
    const messages = [...mem.msgs, { role: 'user', content: `${me.name}: ${said}` }];
    const params = {
      model: MODEL,
      max_tokens: 1024,
      // The persona is the same for every request, so it's cached once it's long enough to be
      system: [{ type: 'text', text: persona.system, cache_control: { type: 'ephemeral' } }],
      messages,
      // Small talk doesn't need deep thought: low effort keeps replies quick and cheap
      output_config: { effort: 'low' },
      ...(FALLBACK_MODELS.has(MODEL) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
    };
    const res = await client.beta.messages.create(params);
    const u = res.usage ?? {};
    spent += ((u.input_tokens ?? 0) * PRICE[0] + (u.output_tokens ?? 0) * PRICE[1]
      + (u.cache_read_input_tokens ?? 0) * PRICE[2] + (u.cache_creation_input_tokens ?? 0) * PRICE[3]) / 1e6;
    if (res.stop_reason === 'refusal') return { text: pick(persona.declined), ok: false, why: 'declined' };
    const text = tidy(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(' '));
    if (!text) return { text: pick(persona.busy), ok: false, why: 'empty' };
    // Remember the exchange (as plain text) so the next line follows on
    mem.msgs.push({ role: 'user', content: `${me.name}: ${said}` }, { role: 'assistant', content: text });
    if (mem.msgs.length > HISTORY) mem.msgs.splice(0, mem.msgs.length - HISTORY);
    mem.at = Date.now();
    return { text, ok: true };
  }

  function handle(me, msg) {
    if (msg.t !== 'npcSay') return false;
    const npcId = typeof msg.npc === 'string' ? msg.npc : '';
    const persona = Object.prototype.hasOwnProperty.call(PERSONAS, npcId) ? PERSONAS[npcId] : null;
    if (!persona || !client) { line(me, npcId, persona ? pick(persona.busy) : '', false, 'off'); return true; }
    const said = clean(msg.text);
    if (!said) return true;
    const why = limit(me);
    if (why) { line(me, npcId, why === 'day' || why === 'realm' ? pick(persona.tired) : pick(persona.busy), false, why); return true; }
    const u = usage.get(me.key);
    u.busy = true; u.last = Date.now(); u.recent.push(u.last); u.dayCount++; todayCount++;
    ask(me, npcId, persona, said)
      .then((r) => line(me, npcId, r.text, r.ok, r.why))
      .catch((e) => {
        // Typed errors from the SDK: a limit or an outage gets the NPC's own line, never a crash
        const kind = e instanceof Anthropic.RateLimitError ? 'rate limit' : e instanceof Anthropic.AuthenticationError ? 'bad API key' : e instanceof Anthropic.APIError ? `API ${e.status}` : (e?.name ?? 'error');
        log(`npc ${npcId} for ${me.name}: ${kind}${e?.message ? ': ' + String(e.message).slice(0, 160) : ''}`);
        line(me, npcId, pick(persona.busy), false, 'error');
      })
      .finally(() => {
        u.busy = false;
        if (todayCount % 25 === 0) log(`AI townsfolk today: ${todayCount} replies, ${spent.toFixed(3)} of ${DAILY_USD}`);
      });
    return true;
  }

  return {
    handle,
    /** The NPCs that can chat (nothing when the feature is off). */
    available: () => (client ? Object.keys(PERSONAS) : []),
    leave(me) { for (const k of [...memory.keys()]) if (k.startsWith(me.key + ':')) memory.delete(k); },
  };
}
