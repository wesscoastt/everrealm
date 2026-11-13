// Farm hands (owner 2026-11-13: "add ways to grant friends rights to help your farm on your land, so you could have your
// farm open to friends"). A player can open the garden round their home to their friends or their group (/farmhands).
// While it's open their client keeps a copy of its tiles here; a farm hand who walks onto it is sent the tiles and can
// water, plant, compost and weed them, and pick them too if the owner allows it. What a hand does goes back to the owner,
// now if they're in the world, or when they next come in. The client's garden is game/HomeFarm.ts.
//
//   { t: 'hgPut', tiles, open, names, reap }  the owner's garden: its tiles, who may work it ('friends' | 'group' | 'off'),
//                                             the names on their friends list, and whether hands may pick
//   { t: 'hgNear', x, z }                     the open garden a hand is standing on, if they may work it
//   { t: 'hgSet', owner, k, tile }            a hand's change to one tile (only tiles already tilled)
//   { t: 'hgGet' }                            the owner, coming in: their garden as the hands left it
// Sent:
//   { t: 'hgarden', owner, tiles, reap, mine } a garden's tiles (owner null: none here); mine when it's your own
import path from 'node:path';

const KEY = /^-?\d{1,6},-?\d{1,6}$/;
const MOST = 80;

export function gardensInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, social, log } = ctx;
  const FILE = path.join(dataDir, 'gardens.json');
  /** owner's character key -> { owner, tiles, open, names: [], reap, at, cx, cz } */
  const gardens = readJson(FILE) ?? {};
  let dirty = false;
  setInterval(() => { if (dirty) { dirty = false; writeJson(FILE, gardens); } }, 15_000);

  const centre = (tiles) => { const ks = Object.keys(tiles); if (!ks.length) return [0, 0]; let sx = 0, sz = 0; for (const k of ks) { const [x, z] = k.split(',').map(Number); sx += x; sz += z; } return [sx / ks.length, sz / ks.length]; };
  const groupedWith = (a, ownerKey) => { const g = social.groupIds(a); if (!g) return false; return g.members.some((id) => players.get(id)?.key === ownerKey); };
  const allowed = (me, key, g) => {
    if (key === me.key || g.open === 'off') return false;
    if (g.open === 'group') return groupedWith(me, key);
    return g.names.includes(me.name.toLowerCase()) || groupedWith(me, key);
  };
  const ownerOnline = (key) => [...players.values()].find((p) => p.key === key);
  const view = (g, mine = false) => ({ t: 'hgarden', owner: g.owner, tiles: g.tiles, reap: !!g.reap, mine });
  const cleanTiles = (t) => {
    if (!t || typeof t !== 'object' || Array.isArray(t)) return null;
    const out = {}; let n = 0;
    for (const [k, v] of Object.entries(t)) { if (!KEY.test(k) || !v || typeof v !== 'object' || JSON.stringify(v).length > 400) continue; out[k] = v; if (++n >= MOST) break; }
    return out;
  };

  function handle(me, msg) {
    switch (msg.t) {
      case 'hgPut': {
        const open = msg.open === 'friends' || msg.open === 'group' ? msg.open : 'off';
        if (open === 'off') { if (gardens[me.key]) { delete gardens[me.key]; dirty = true; } return true; }
        const tiles = cleanTiles(msg.tiles);
        if (!tiles) return true;
        const names = Array.isArray(msg.names) ? msg.names.filter((n) => typeof n === 'string').slice(0, 100).map((n) => n.trim().toLowerCase()) : [];
        const [cx, cz] = centre(tiles);
        gardens[me.key] = { owner: me.name, tiles, open, names, reap: !!msg.reap, at: Date.now(), cx, cz };
        dirty = true;
        return true;
      }
      case 'hgGet': {
        const g = gardens[me.key];
        if (g) send(me.ws, view(g, true));
        return true;
      }
      case 'hgNear': {
        const x = Number(msg.x), z = Number(msg.z);
        if (!Number.isFinite(x) || !Number.isFinite(z)) return true;
        let best = null, bd = 30;
        for (const [key, g] of Object.entries(gardens)) {
          const d = Math.hypot(g.cx - x, g.cz - z);
          if (d < bd && allowed(me, key, g)) { bd = d; best = g; }
        }
        send(me.ws, best ? view(best) : { t: 'hgarden', owner: null, tiles: null, reap: false, mine: false });
        return true;
      }
      case 'hgSet': {
        if (typeof msg.owner !== 'string' || typeof msg.k !== 'string' || !KEY.test(msg.k)) return true;
        const entry = Object.entries(gardens).find(([, g]) => g.owner === msg.owner);
        if (!entry) return true;
        const [key, g] = entry;
        if (!allowed(me, key, g) || !(msg.k in g.tiles)) return true; // (hands work what's tilled; they don't dig new ground)
        const tile = msg.tile;
        if (tile === null || typeof tile !== 'object' || Array.isArray(tile) || JSON.stringify(tile).length > 400) return true;
        g.tiles[msg.k] = tile;
        g.at = Date.now();
        dirty = true;
        send(me.ws, view(g));
        const o = ownerOnline(key);
        if (o) send(o.ws, view(g, true));
        return true;
      }
    }
    return false;
  }
  log(`gardens: ${Object.keys(gardens).length} open to farm hands`);
  return { handle };
}
