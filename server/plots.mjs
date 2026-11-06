// Group plots (owner's farming list: "a shared plot your group works together"; every activity works in a group).
// While you're in a group, the tiles you till on the towns' public fields are the group's: kept here under the group
// leader's character, so the plot lasts while the group comes and goes, and sent to everyone in the group whenever
// a tile changes. Anyone in the group can sow, water, weed and harvest them. The client's garden is game/HomeFarm.ts.
//
//   { t: 'gpGet' }                 the plot of the group you're in (sent back as 'gplot')
//   { t: 'gpSet', k, tile }        one tile of it, as the garden keeps them ("x,z" -> a small object), or null to clear it
// Sent:
//   { t: 'gplot', owner, tiles }   the group's plot (owner: the leader's name), or tiles null when you're in no group
import path from 'node:path';

const KEY = /^-?\d{1,6},-?\d{1,6}$/;
const MOST = 64; // tiles to a group's plot

export function plotsInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, social, log } = ctx;
  const FILE = path.join(dataDir, 'plots.json');
  /** leader's character key -> { owner, tiles: { "x,z": tile }, at } */
  const plots = readJson(FILE) ?? {};
  let dirty = false;
  setInterval(() => { if (dirty) { dirty = false; writeJson(FILE, plots); } }, 15_000);

  const groupOf = (p) => {
    const g = social.groupIds(p);
    if (!g) return null;
    const leader = players.get(g.leader);
    return leader ? { leader, members: g.members.map((id) => players.get(id)).filter(Boolean) } : null;
  };
  const view = (g) => { const pl = plots[g.leader.key]; return { t: 'gplot', owner: g.leader.name, tiles: pl?.tiles ?? {} }; };

  function handle(me, msg) {
    switch (msg.t) {
      case 'gpGet': {
        const g = groupOf(me);
        send(me.ws, g ? view(g) : { t: 'gplot', owner: null, tiles: null });
        return true;
      }
      case 'gpSet': {
        const g = groupOf(me);
        if (!g || typeof msg.k !== 'string' || !KEY.test(msg.k)) return true;
        const tile = msg.tile;
        if (tile !== null && (typeof tile !== 'object' || Array.isArray(tile) || JSON.stringify(tile).length > 400)) return true;
        const pl = plots[g.leader.key] ?? (plots[g.leader.key] = { owner: g.leader.name, tiles: {}, at: Date.now() });
        if (tile === null) delete pl.tiles[msg.k];
        else {
          if (!(msg.k in pl.tiles) && Object.keys(pl.tiles).length >= MOST) { send(me.ws, { t: 'sys', text: `Your group's plot is as big as it can be (${MOST} tiles).` }); return true; }
          pl.tiles[msg.k] = tile;
        }
        pl.at = Date.now();
        dirty = true;
        const v = view(g);
        for (const q of g.members) send(q.ws, v);
        return true;
      }
    }
    return false;
  }
  log(`plots: ${Object.keys(plots).length} group plots`);
  return { handle };
}
