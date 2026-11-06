// The Arena at Verandah (owner 2026-11-05: "where people can 1v1 or 2v2 and duel in pvp, and people can watch in
// the crowd"). Players in and around the Arena challenge each other, one to one, or their group of two against
// another's; the challenged answer; the server runs the match. Nobody dies: a fighter brought to the end of
// their health yields, and the last side with someone standing wins.
//
// The server doesn't keep anybody's health (each game keeps its own, as it does against creatures). It keeps
// the match: who's in it and on which side, who's yielded, the clock. A hit is the attacker's game saying "I
// struck this player this hard" (a share of a swing, not a number of hit points: a level 5 and a level 40 hit
// each other the same); the server checks it (both in the same match, on opposite sides, standing, near each
// other, not faster than anyone can swing) and passes it on. The struck game takes it off its own health, by
// a share of its own maximum, and says when it's yielded. Everyone near the Arena is told how the fight
// stands, for the crowd.
//
// Messages, from a game:
//   pvpChallenge { to, mode: '1v1' | '2v2' }      pvpAnswer { from, yes }
//   pvpHit { to, power }                          pvpHp { frac }          pvpYield {}
// To a game:
//   pvpInvite { from, name, mode, with }          pvpNo { why }
//   pvpStart { id, mode, side: 0|1, sides: [[ids],[ids]], names, at }
//   pvpHurt { from, power }                       pvpBoard { id, mode, sides, names, hp, down }
//   pvpEnd { id, won: 0|1, names }

/** The Arena's floor in the game's coordinates (world/mclandArea.ts: the owner's Verandah, turned), and how far
 *  round it counts as being at the Arena (the stands and the gate). */
const FLOOR = { x0: -3266, x1: -3248, z0: 2260, z1: 2286 }; // (Verandah's Arena, in the game: mclandArea VX/VZ)
const MID = { x: (FLOOR.x0 + FLOOR.x1) / 2, z: (FLOOR.z0 + FLOOR.z1) / 2 };
const NEAR = 75;
/** Seconds of countdown, the longest a match runs, how far apart two fighters can be and still strike, and swings a second. */
const COUNT = 5, LONGEST = 240, REACH = 6.5, RATE = 3.5;

export function arenaInit({ players, send, social, log }) {
  const invites = new Map(); // challenged player id -> { from, mode, at, with: [ids] }
  const matches = new Map(); // id -> { id, mode, sides: [[ids], [ids]], down: Set, hp: Map, at, ends }
  let nextMatch = 1;
  const near = (p) => Math.hypot(p.x - MID.x, p.z - MID.z) < NEAR;
  const onFloor = (p, slack = 2) => p.x >= FLOOR.x0 - slack && p.x <= FLOOR.x1 + slack && p.z >= FLOOR.z0 - slack && p.z <= FLOOR.z1 + slack;
  const matchOf = (p) => { for (const m of matches.values()) if (m.sides[0].includes(p.id) || m.sides[1].includes(p.id)) return m; return null; };
  const sideOf = (m, id) => (m.sides[0].includes(id) ? 0 : m.sides[1].includes(id) ? 1 : -1);
  const names = (m) => Object.fromEntries([...m.sides[0], ...m.sides[1]].map((id) => [id, players.get(id)?.name ?? '?']));
  /** The pair a player brings to a 2v2: their group, if it's two and both are at the Arena. */
  const pairOf = (p) => {
    const g = social.groupIds(p);
    if (!g || g.members.length !== 2) return null;
    const other = players.get(g.members.find((id) => id !== p.id));
    return other && near(other) && !matchOf(other) ? [p.id, other.id] : null;
  };
  const board = (m) => {
    const msg = { t: 'pvpBoard', id: m.id, mode: m.mode, sides: m.sides, names: names(m), hp: Object.fromEntries(m.hp), down: [...m.down] };
    for (const p of players.values()) if (near(p) || sideOf(m, p.id) >= 0) send(p.ws, msg);
  };
  const end = (m, won, why) => {
    matches.delete(m.id);
    const msg = { t: 'pvpEnd', id: m.id, won, names: names(m), why };
    for (const p of players.values()) if (near(p) || sideOf(m, p.id) >= 0) send(p.ws, msg);
    log(`arena: ${m.sides[won].map((id) => players.get(id)?.name ?? '?').join(' & ')} beat ${m.sides[1 - won].map((id) => players.get(id)?.name ?? '?').join(' & ')} (${m.mode}${why ? ', ' + why : ''})`);
  };
  const yieldOf = (m, id, why) => {
    if (m.down.has(id)) return;
    m.down.add(id);
    m.hp.set(id, 0);
    const s = sideOf(m, id);
    if (m.sides[s].every((x) => m.down.has(x))) end(m, 1 - s, why);
    else board(m);
  };

  function handle(me, msg) {
    switch (msg.t) {
      case 'pvpChallenge': {
        const them = players.get(msg.to), mode = msg.mode === '2v2' ? '2v2' : '1v1';
        const no = (why) => { send(me.ws, { t: 'pvpNo', why }); return true; };
        if (!them || them === me || them.land !== me.land) return no('They\'re not here.');
        if (!near(me) || !near(them)) return no('Challenges are made at the Arena in Verandah. You both have to be there.');
        if (matchOf(me) || matchOf(them)) return no('One of you is already in a fight.');
        let mine = [me.id], theirs = [them.id];
        if (mode === '2v2') {
          mine = pairOf(me); theirs = pairOf(them);
          if (!mine) return no('For two against two, you need a group of exactly two, both here at the Arena.');
          if (!theirs) return no(`${them.name} needs a group of exactly two, both here at the Arena.`);
          if (mine.some((id) => theirs.includes(id))) return no('You can\'t fight your own group.');
        }
        invites.set(them.id, { from: me.id, mode, at: Date.now(), mine, theirs });
        send(them.ws, { t: 'pvpInvite', from: me.id, name: me.name, mode, with: mine.filter((id) => id !== me.id).map((id) => players.get(id)?.name ?? '?') });
        send(me.ws, { t: 'sys', text: `You challenge ${them.name} to ${mode === '2v2' ? 'two against two' : 'a duel'}. Waiting for an answer.` });
        return true;
      }
      case 'pvpAnswer': {
        const inv = invites.get(me.id);
        if (!inv || inv.from !== msg.from || Date.now() - inv.at > 60_000) return true;
        invites.delete(me.id);
        const from = players.get(inv.from);
        if (!from) return true;
        if (!msg.yes) { send(from.ws, { t: 'pvpNo', why: `${me.name} turns you down.` }); return true; }
        const all = [...inv.mine, ...inv.theirs].map((id) => players.get(id));
        if (all.some((p) => !p || !near(p) || matchOf(p))) { send(me.ws, { t: 'pvpNo', why: 'Somebody has left the Arena, or is in another fight.' }); send(from.ws, { t: 'pvpNo', why: 'Somebody has left the Arena, or is in another fight.' }); return true; }
        const m = { id: nextMatch++, mode: inv.mode, sides: [inv.mine, inv.theirs], down: new Set(), hp: new Map(all.map((p) => [p.id, 1])), last: new Map(), at: Date.now() + COUNT * 1000, ends: Date.now() + (COUNT + LONGEST) * 1000 };
        matches.set(m.id, m);
        for (const p of all) send(p.ws, { t: 'pvpStart', id: m.id, mode: m.mode, side: sideOf(m, p.id), sides: m.sides, names: names(m), at: COUNT });
        board(m);
        return true;
      }
      case 'pvpHit': {
        const m = matchOf(me), them = players.get(msg.to), power = Number(msg.power);
        if (!m || !them || Date.now() < m.at || !(power > 0 && power <= 2)) return true;
        const a = sideOf(m, me.id), b = sideOf(m, them.id);
        if (a < 0 || b < 0 || a === b || m.down.has(me.id) || m.down.has(them.id)) return true;
        if (Math.hypot(them.x - me.x, them.z - me.z) > REACH || Math.abs(them.y - me.y) > 3) return true;
        const now = Date.now(), last = m.last.get(me.id) ?? 0;
        if (now - last < 1000 / RATE) return true;
        m.last.set(me.id, now);
        send(them.ws, { t: 'pvpHurt', from: me.id, power });
        return true;
      }
      case 'pvpHp': {
        const m = matchOf(me), f = Number(msg.frac);
        if (!m || !(f >= 0 && f <= 1)) return true;
        m.hp.set(me.id, f);
        board(m);
        return true;
      }
      case 'pvpYield': {
        const m = matchOf(me);
        if (m) yieldOf(m, me.id, '');
        return true;
      }
    }
    return false;
  }

  // The clock: a match that's gone on too long goes to the side with more health left; anyone who's left the
  // floor once it's begun has yielded
  setInterval(() => {
    const now = Date.now();
    for (const m of [...matches.values()]) {
      if (now > m.at) for (const id of [...m.sides[0], ...m.sides[1]]) { const p = players.get(id); if (!p) yieldOf(m, id, 'left the world'); else if (!onFloor(p, 4)) yieldOf(m, id, 'left the floor'); }
      if (!matches.has(m.id)) continue;
      if (now > m.ends) {
        const sum = (s) => m.sides[s].reduce((a, id) => a + (m.down.has(id) ? 0 : m.hp.get(id) ?? 0), 0);
        end(m, sum(0) >= sum(1) ? 0 : 1, 'time');
      }
    }
    for (const [id, inv] of invites) if (now - inv.at > 60_000) invites.delete(id);
  }, 1000);

  function leave(p) {
    invites.delete(p.id);
    const m = matchOf(p);
    if (m) yieldOf(m, p.id, 'left the world');
  }

  return { handle, leave };
}
