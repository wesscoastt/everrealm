// Ships at sea, shared (the game side: src/game/Sailing.ts, src/data/naval.ts).
//
// A captain's ship is sent four times a second while she's in the water: the realm passes it on to
// everyone within six hundred blocks, and takes it away when she's stowed or her captain leaves. A ball
// that strikes another captain's ship is reported by the one who fired it; the realm checks that both
// ships are out in the Freewater (the only water where captains may fire on each other), close enough
// for a broadside, and not being hit faster than a crew could load and run out, and then tells the
// captain who was struck. When a ship goes down to another captain's guns, that captain is told.

/** The Freewater (data/naval.ts FREEWATER: x 3300 to MORROW_OX - 600, z 300 to 3400). */
const FREE = { x0: 3300, x1: 6400 - 600, z0: 300, z1: 3400 };
const HULLS = new Set(['cutter', 'brig', 'frigate']);
const HEX = /^#[0-9a-fA-F]{6}$/;
const NAME = /^[A-Za-z' ,.-]{1,32}$/;
/** Furthest a ship is heard of, and furthest a broadside carries. */
const NEAR = 600, RANGE = 90;
/** No more than this many hits on one ship from one captain in this many milliseconds (a frigate's seven guns, twice over). */
const HITS = 14, HIT_MS = 6000;

export function navalInit(ctx) {
  const { players, send } = ctx;
  /** player id -> the ship as last sent */
  const ships = new Map();
  /** `${shooter}>${target}` -> recent hit times */
  const hits = new Map();
  const inFree = (s) => s.x >= FREE.x0 && s.x <= FREE.x1 && s.z >= FREE.z0 && s.z <= FREE.z1;
  const byName = (name) => { const n = String(name ?? '').toLowerCase(); return [...players.values()].find((p) => p.name.toLowerCase() === n) ?? null; };

  /** A ship's state as the client sends it, kept to the shape the others read. */
  function clean(st) {
    if (!st || typeof st !== 'object' || !HULLS.has(st.hull)) return null;
    const L = st.livery && typeof st.livery === 'object' ? st.livery : {};
    const n = (v, a, b) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : null);
    const x = n(st.x, -2304, 10496), z = n(st.z, -2304, 4096), yaw = n(st.yaw, -1000, 1000), hp = n(st.hp, 0, 5000), sails = n(st.sails, 0, 2);
    if (x === null || z === null || yaw === null || hp === null || sails === null) return null;
    return {
      hull: st.hull, x, z, yaw, hp: Math.round(hp), sails: Math.round(sails), sinking: !!st.sinking,
      livery: { hull: HEX.test(L.hull) ? L.hull : '#3a2a1e', wale: HEX.test(L.wale) ? L.wale : '#2f528f', sail: HEX.test(L.sail) ? L.sail : '#efe3c4', name: typeof L.name === 'string' && NAME.test(L.name) ? L.name : 'Unnamed' },
    };
  }
  function tell(me, st) {
    for (const p of players.values()) if (p !== me && (st === null || Math.hypot((p.x ?? 0) - st.x, (p.z ?? 0) - st.z) < NEAR)) send(p.ws, { t: 'shS', name: me.name, st });
  }

  return {
    handle(me, msg) {
      switch (msg.t) {
        case 'shS': {
          const st = clean(msg.st);
          if (!st) { if (ships.delete(me.id)) tell(me, null); return true; }
          ships.set(me.id, st);
          tell(me, st);
          return true;
        }
        case 'shHit': {
          const them = byName(msg.name), mine = ships.get(me.id), theirs = them && ships.get(them.id);
          if (!them || them === me || !mine || !theirs || theirs.sinking || !inFree(mine) || !inFree(theirs)) return true;
          if (Math.hypot(mine.x - theirs.x, mine.z - theirs.z) > RANGE) return true;
          const key = `${me.id}>${them.id}`, now = Date.now(), recent = (hits.get(key) ?? []).filter((t) => now - t < HIT_MS);
          if (recent.length >= HITS) return true;
          recent.push(now);
          hits.set(key, recent);
          const dmg = Math.max(1, Math.min(120, Math.round(Number(msg.dmg) || 0)));
          send(them.ws, { t: 'shHurt', from: me.name, dmg });
          return true;
        }
        case 'shSunk': {
          // (sunk by another captain's guns: they're told it was theirs)
          const by = msg.by ? byName(msg.by) : null;
          if (by && by !== me && ships.has(by.id)) send(by.ws, { t: 'shKill', name: me.name });
          return true;
        }
      }
      return false;
    },
    leave(me) {
      if (ships.delete(me.id)) tell(me, null);
      for (const k of [...hits.keys()]) if (k.startsWith(me.id + '>') || k.endsWith('>' + me.id)) hits.delete(k);
    },
  };
}
