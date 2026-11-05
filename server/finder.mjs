// The Group Finder, on the world server: a queue for each group dungeon (src/data/dungeons.ts).
//
// A player queues for a dungeon as a tank, a healer or a damage dealer. When the queue holds a full
// group (one tank, one healer, two damage) those four are asked; once someone has waited a minute
// and a half, whoever is queued for that dungeon is asked, and henchmen (in each player's own game)
// fill the empty places. Anyone queued can say go now rather than wait (qNow): the same happens at
// once. A group's leader can also take the group in as it stands. Everyone asked
// has thirty seconds to say yes; if anyone says no or lets it lapse, the rest go back to the front
// of the queue. When all have said yes the run starts: they're grouped, told who's in it and which
// places henchmen fill, and from then on the server passes their blows and kills to each other
// (the creatures live in each player's own game, as everywhere else).

const NEED = { tank: 1, healer: 1, damage: 2 };
const PARTY = ['tank', 'healer', 'damage', 'damage'];
const ROLES = new Set(Object.keys(NEED));
const FILL_MS = 90_000;
const READY_MS = 30_000;
const DUNGEON = /^gd-[a-z]{2,20}(-vet|-cor)?$/; // "-vet": the dungeon's veteran mode, queued apart; "-cor": corrupted, a group's leader's key (groups only)
/** The Endless Tower, from a floor ("tw-11"): a group's leader takes the group up; no queue. Up to five climb. */
const TOWER = /^tw-\d{1,3}$/;
const TOWER_PARTY = 5;
const EVENTS_PER_SEC = 40;
/** How long a run waits for a member who dropped out (a lost connection, a reload) to come back to it. */
const BACK_MS = 15 * 60_000;
/** A share of a creature's health, in ten-thousandths (as game/Dungeons.ts SHARE): a creature's whole health. */
const WHOLE = 10_000;

/** The places a group is short of, given the roles it has (as data/dungeons.ts missingRoles). */
function missingRoles(have) {
  const left = [...have], out = [];
  for (const r of PARTY) { const i = left.indexOf(r); if (i >= 0) left.splice(i, 1); else out.push(r); }
  return out.slice(0, Math.max(0, PARTY.length - have.length));
}

export function finderInit(ctx) {
  const { players, send, log, social } = ctx;
  /** Queued players, oldest first: { id, dungeon, role, at } */
  let queue = [];
  /** run id -> { id, dungeon, entries, members: Set<id>, yes: Map<id, role>, until, started } */
  const runs = new Map();
  let nextRun = 1;
  const sys = (p, text) => send(p.ws, { t: 'sys', text });

  function status(dungeon) {
    const n = queue.filter((q) => q.dungeon === dungeon).length;
    for (const q of queue) if (q.dungeon === dungeon) { const p = players.get(q.id); if (p) send(p.ws, { t: 'qStatus', dungeon, n }); }
  }
  function unqueue(id, tell = true) {
    const q = queue.find((x) => x.id === id);
    if (!q) return;
    queue = queue.filter((x) => x.id !== id);
    const p = players.get(id);
    if (p && tell) send(p.ws, { t: 'qStatus', dungeon: null, n: 0 });
    status(q.dungeon);
  }
  function runOf(id) { for (const r of runs.values()) if (r.members.has(id)) return r; return null; }

  /** Ask these players if they're ready. Entries with a role came out of the queue (and go back if it fails). */
  function readyCheck(dungeon, entries) {
    const r = { id: nextRun++, dungeon, entries, members: new Set(entries.map((q) => q.id)), yes: new Map(), until: Date.now() + READY_MS, started: false };
    runs.set(r.id, r);
    const names = entries.map((q) => players.get(q.id)?.name).filter(Boolean);
    for (const q of entries) {
      const p = players.get(q.id);
      if (p) send(p.ws, { t: 'qReady', run: r.id, dungeon, names, henchmen: Math.max(0, PARTY.length - entries.length), secs: READY_MS / 1000 });
    }
  }

  /** Someone said no (or nothing, or left): everyone else goes back to the front of the queue. */
  function failCheck(r, why, drop) {
    runs.delete(r.id);
    const back = r.entries.filter((q) => q.role && players.has(q.id) && !drop.has(q.id));
    queue = [...back, ...queue];
    for (const q of r.entries) {
      const p = players.get(q.id);
      if (!p) continue;
      sys(p, why);
      if (!back.includes(q)) send(p.ws, { t: 'qStatus', dungeon: null, n: 0 });
    }
    if (back.length) status(r.dungeon);
  }

  function begin(r) {
    r.started = true;
    const ids = [...r.members].filter((id) => players.has(id));
    r.members = new Set(ids);
    const missing = missingRoles(ids.map((id) => r.yes.get(id)));
    // What the run remembers, for whoever comes back to it or comes in late: each creature's health taken
    // (shares), who's dead, each room's state, and who dropped out and may come back
    r.missing = missing;
    r.state = { hits: new Map(), dead: new Set(), rooms: new Map() };
    r.gone = new Map();
    if (ids.length > 1) social.formGroup(ids);
    for (const id of ids) {
      const p = players.get(id);
      p.inRun = r.id;
      send(p.ws, { t: 'dStart', run: r.id, dungeon: r.dungeon, members: ids.filter((x) => x !== id).map((x) => ({ id: x, name: players.get(x).name, role: r.yes.get(x) })), missing });
    }
    log(`run ${r.id} into ${r.dungeon}: ${ids.map((id) => `${players.get(id).name} (${r.yes.get(id)})`).join(', ')}${missing.length ? `, henchmen as ${missing.join(', ')}` : ''}`);
  }

  /** A full group out of the queue, or whoever's there once the first of them has waited long enough. */
  function match() {
    const now = Date.now();
    for (const dungeon of new Set(queue.map((q) => q.dungeon))) {
      const qd = queue.filter((q) => q.dungeon === dungeon);
      const need = { ...NEED }, pick = [];
      for (const q of qd) if (need[q.role] > 0) { need[q.role]--; pick.push(q); }
      if (pick.length < PARTY.length && !qd.some((q) => q.now || now - q.at >= FILL_MS)) continue;
      queue = queue.filter((q) => !pick.includes(q));
      status(dungeon);
      readyCheck(dungeon, pick);
    }
  }

  function leaveRun(me, dropped = false) {
    const r = runOf(me.id);
    if (!r) return;
    if (!r.started) { failCheck(r, `${me.name} has gone. Back in the queue.`, new Set([me.id])); return; }
    // dropped out (not walked out): their place is kept a while, for them to come back to
    if (dropped && me.key) r.gone.set(me.key, { role: r.yes.get(me.id) ?? 'damage', at: Date.now(), name: me.name });
    r.members.delete(me.id);
    me.inRun = null;
    for (const id of r.members) { const p = players.get(id); if (p) send(p.ws, { t: 'dLeft', name: me.name, back: dropped }); }
    if (!r.members.size && !r.gone.size) runs.delete(r.id);
  }

  /** Into a run already under way: its members, its henchmen, and where the fight is, so they see what the others see. */
  function rejoin(me, r, role) {
    r.members.add(me.id);
    r.yes.set(me.id, role);
    r.gone.delete(me.key);
    me.inRun = r.id;
    const others = [...r.members].filter((x) => x !== me.id && players.has(x));
    send(me.ws, {
      t: 'dStart', run: r.id, dungeon: r.dungeon, members: others.map((x) => ({ id: x, name: players.get(x).name, role: r.yes.get(x) })), missing: r.missing ?? [],
      state: { hits: [...r.state.hits], dead: [...r.state.dead], rooms: [...r.state.rooms] },
    });
    for (const id of others) send(players.get(id).ws, { t: 'dBack', id: me.id, name: me.name, role });
    log(`${me.name} into run ${r.id} (${r.dungeon}) under way`);
  }

  /** A Group Finder message; returns true if it was one. */
  function handle(me, msg) {
    switch (msg.t) {
      case 'qJoin': {
        if (typeof msg.dungeon !== 'string' || !DUNGEON.test(msg.dungeon) || msg.dungeon.endsWith('-cor') || !ROLES.has(msg.role)) return true;
        if (runOf(me.id)) { sys(me, 'You\'re in a dungeon run already.'); return true; }
        unqueue(me.id, false);
        queue.push({ id: me.id, dungeon: msg.dungeon, role: msg.role, at: Date.now() });
        status(msg.dungeon);
        match();
        return true;
      }
      case 'qLeave': unqueue(me.id); return true;
      case 'qNow': {
        // Don't wait for the full four: whoever's queued goes, henchmen for the rest
        const q = queue.find((x) => x.id === me.id);
        if (q) { q.now = true; match(); }
        return true;
      }
      case 'qGroup': {
        // A group's leader takes the group in: everyone is asked, roles come with the answers
        if (typeof msg.dungeon !== 'string' || !(DUNGEON.test(msg.dungeon) || TOWER.test(msg.dungeon))) return true;
        const g = social.groupIds(me);
        if (!g || g.leader !== me.id) { sys(me, 'Only a group\'s leader can take the group in.'); return true; }
        const most = TOWER.test(msg.dungeon) ? TOWER_PARTY : PARTY.length;
        if (g.members.length > most) { sys(me, TOWER.test(msg.dungeon) ? `The tower takes ${most} at most.` : `A group dungeon is for ${PARTY.length}.`); return true; }
        if (g.members.some((id) => runOf(id))) { sys(me, 'Someone in your group is in a run already.'); return true; }
        for (const id of g.members) unqueue(id);
        readyCheck(msg.dungeon, g.members.map((id) => ({ id, dungeon: msg.dungeon, role: null, at: Date.now() })));
        return true;
      }
      case 'qAnswer': {
        const r = runs.get(msg.run);
        if (!r || r.started || !r.members.has(me.id)) return true;
        if (!msg.yes) { failCheck(r, `${me.name} isn't ready.${r.entries.some((q) => q.role) ? ' Back in the queue.' : ''}`, new Set([me.id])); return true; }
        r.yes.set(me.id, ROLES.has(msg.role) ? msg.role : 'damage');
        if ([...r.members].every((id) => r.yes.has(id))) begin(r);
        return true;
      }
      case 'dEv': {
        const r = runs.get(msg.run);
        if (!r || !r.started || !r.members.has(me.id)) return true;
        const k = msg.k === 'kill' || msg.k === 'hit' || msg.k === 'room' ? msg.k : null; // room: a room started (dmg 1) or done (2)
        const i = Number(msg.i), dmg = Number(msg.dmg);
        if (!k || !Number.isInteger(i) || i < 0 || i > 400 || !Number.isFinite(dmg) || dmg < 0 || dmg > 5000) return true;
        const now = Date.now();
        if (!me.dWindow || now - me.dWindow.at > 1000) me.dWindow = { at: now, n: 0 };
        if (++me.dWindow.n > EVENTS_PER_SEC) return true;
        if (r.state) {
          if (k === 'hit') r.state.hits.set(i, Math.min(WHOLE, (r.state.hits.get(i) ?? 0) + Math.round(dmg)));
          else if (k === 'kill') r.state.dead.add(i);
          else r.state.rooms.set(i, Math.max(r.state.rooms.get(i) ?? 0, Math.round(dmg)));
        }
        for (const id of r.members) if (id !== me.id) { const p = players.get(id); if (p) send(p.ws, { t: 'dEv', from: me.id, k, i, dmg: Math.round(dmg) }); }
        return true;
      }
      case 'dLeave': leaveRun(me); return true;
      case 'dRejoin': {
        // Back into the run they dropped out of; or, late, into the one their group is in (if there's room)
        if (runOf(me.id)) return true;
        let r = Number.isInteger(msg.run) ? runs.get(msg.run) : null;
        if (r && r.started && r.gone?.has(me.key) && Date.now() - r.gone.get(me.key).at < BACK_MS) { rejoin(me, r, r.gone.get(me.key).role); return true; }
        const g = social.groupIds(me);
        r = g ? [...runs.values()].find((x) => x.started && x.state && g.members.some((id) => x.members.has(id))) : null;
        if (!r) { sys(me, 'Your group isn\'t in a dungeon.'); return true; }
        const most = TOWER.test(r.dungeon) ? TOWER_PARTY : PARTY.length;
        if (r.members.size >= most) { sys(me, 'Their run is full.'); return true; }
        const roles = [...r.members].map((id) => r.yes.get(id));
        const role = ROLES.has(msg.role) ? msg.role : missingRoles(roles)[0] ?? 'damage';
        // a henchman steps out for them, if one was standing in their place
        const k = (r.missing ?? []).indexOf(role);
        if (k >= 0) r.missing = r.missing.filter((_, i) => i !== k);
        rejoin(me, r, role);
        return true;
      }
    }
    return false;
  }

  function leave(me) {
    unqueue(me.id, false);
    leaveRun(me, true);
  }
  /** Coming into the world: if they dropped out of a run that's still going, they're asked whether to go back. */
  function join(me) {
    const now = Date.now();
    for (const r of runs.values()) {
      const g = r.gone?.get(me.key);
      if (g && now - g.at < BACK_MS && r.members.size) { send(me.ws, { t: 'dResume', run: r.id, dungeon: r.dungeon }); return; }
    }
  }

  // Matches, and ready checks that lapsed
  setInterval(() => {
    match();
    const now = Date.now();
    for (const r of [...runs.values()]) {
      if (r.started || now < r.until) continue;
      failCheck(r, 'Not everyone answered in time.', new Set([...r.members].filter((id) => !r.yes.has(id))));
    }
    // places kept for those who dropped out lapse; a run nobody is left in goes
    for (const r of [...runs.values()]) {
      if (!r.started || !r.gone) continue;
      for (const [k, g] of r.gone) if (now - g.at > BACK_MS) r.gone.delete(k);
      if (!r.members.size && !r.gone.size) runs.delete(r.id);
    }
  }, 2000);

  return { handle, leave, join };
}
