// Music on the world server (src/game/Bard.ts): who is playing what, so everyone near hears it.
//
// A performance is a tune, a part and an instrument from a moment on the realm clock; every game
// plays the same notes from that, so only the start crosses the wire. Free play sends notes one at a
// time, to the players in earshot. A band is a group: its members pick their parts, and whoever
// strikes up sends the tune and the moment to the rest.

const PARTS = new Set(['lead', 'harmony', 'bass', 'drum']);
const VOICES = new Set(['whistle', 'bone', 'fiddle', 'pipes', 'lute', 'harp', 'drum', 'horn', 'gurdy']);
const TUNE = /^[a-z]{2,24}$/;
/** Blocks: a note carries this far. */
const EARSHOT = 60;
/** Free-play notes per second, at most. */
const NOTE_RATE = 16;

export function musicInit(ctx) {
  const { players, send, social } = ctx;
  const near = (p, r) => [...players.values()].filter((q) => q !== p && Math.hypot(q.x - p.x, q.z - p.z) < r);
  const groupOf = (p) => (social.groupIds(p)?.members ?? []).map((id) => players.get(id)).filter((q) => q && q !== p);

  return {
    /** What a player is playing, for a newcomer's list of who is in the world. */
    perfOf(p) { return p.perf && p.perf.start + p.perf.ms > Date.now() ? p.perf : null; },
    handle(p, msg) {
      switch (msg.t) {
        case 'perform': {
          const start = Number(msg.start), reps = Math.round(Number(msg.reps)), ms = Number(msg.ms);
          if (!TUNE.test(String(msg.tune)) || !PARTS.has(msg.part) || !VOICES.has(msg.voice)) return true;
          if (!(Math.abs(start - Date.now()) < 60_000) || !(reps >= 1 && reps <= 4) || !(ms > 0 && ms < 300_000)) return true;
          p.perf = { tune: msg.tune, part: msg.part, voice: msg.voice, start, reps, ms };
          // Everyone hears it start: the ones far off pick it up as they come near
          for (const q of players.values()) if (q !== p) send(q.ws, { t: 'perform', id: p.id, ...p.perf });
          return true;
        }
        case 'perfStop': {
          if (!p.perf) return true;
          p.perf = null;
          for (const q of players.values()) if (q !== p) send(q.ws, { t: 'perfStop', id: p.id });
          return true;
        }
        case 'note': {
          const m = Math.round(Number(msg.m));
          if (!VOICES.has(msg.voice) || !(m >= 0 && m <= 110)) return true;
          const now = Date.now();
          p.notes = (p.notes ?? []).filter((t) => now - t < 1000);
          if (p.notes.length >= NOTE_RATE) return true;
          p.notes.push(now);
          for (const q of near(p, EARSHOT)) send(q.ws, { t: 'note', id: p.id, m, voice: msg.voice });
          return true;
        }
        case 'bandPart': {
          if (!PARTS.has(msg.part) || !VOICES.has(msg.voice)) return true;
          p.bandPart = { part: msg.part, voice: msg.voice };
          for (const q of groupOf(p)) send(q.ws, { t: 'bandPart', id: p.id, part: msg.part, voice: msg.voice });
          return true;
        }
        case 'bandGo': {
          const start = Number(msg.start), reps = Math.round(Number(msg.reps));
          if (!TUNE.test(String(msg.tune)) || !(Math.abs(start - Date.now()) < 30_000) || !(reps >= 1 && reps <= 4)) return true;
          const band = groupOf(p);
          if (!band.length) return true;
          for (const q of band) send(q.ws, { t: 'bandGo', from: p.id, name: p.name, tune: msg.tune, start, reps });
          return true;
        }
      }
      return false;
    },
  };
}
