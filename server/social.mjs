// Groups and trades, on the world server.
//
// Groups: up to five players. One invites another by name; the other accepts or declines within
// a minute. Everyone in a group is sent the group (names, health, level, where they are) twice a
// second, and can talk in group chat. The first member is the leader: only the leader invites and
// removes, and if the leader leaves the next member takes over. A group of one is no group.
//
// Trades: two players within twelve blocks of each other. Each puts up to eight stacks and some
// marks on the table; either side changing its offer unlocks both. When both have locked and then
// accepted, each is told what to give up and what to take. (The browser still keeps the
// inventory, as with everything else here; this keeps both sides agreeing on the same deal.)

const GROUP_MAX = 5;
const INVITE_MS = 60_000;
const TRADE_RANGE = 12;

/** groupId -> { id, members: number[] } (member ids in join order; the first leads) */
const groups = new Map();
let nextGroup = 1;
/** invitee id -> { from: id, group: groupId | null, at } */
const invites = new Map();
/** tradeId -> { id, a, b, offer: {[id]: {items, marks}}, locked: {[id]: bool}, accepted: {[id]: bool}, open: bool } */
const trades = new Map();
let nextTrade = 1;
/** asker -> asked, waiting for an answer */
const tradeAsks = new Map();

const ITEM = /^[a-z0-9_]{2,40}$/;

export function socialInit(ctx) {
  const { players, send } = ctx;
  const byName = (name) => {
    const n = String(name ?? '').trim().toLowerCase();
    return [...players.values()].find((p) => p.name.toLowerCase() === n) ?? null;
  };
  const sys = (p, text) => send(p.ws, { t: 'sys', text });
  const groupOf = (p) => (p.group ? groups.get(p.group) ?? null : null);

  function groupView(g) {
    return {
      t: 'group', id: g.id, leader: g.members[0],
      members: g.members.map((id) => players.get(id)).filter(Boolean).map((p) => ({
        id: p.id, name: p.name, hp: p.hp ?? 0, max: p.maxHp ?? 100, level: p.level ?? 1, calling: p.calling ?? '', x: Math.round(p.x), z: Math.round(p.z),
      })),
    };
  }
  function sendGroup(g) {
    const v = groupView(g);
    for (const id of g.members) { const p = players.get(id); if (p) send(p.ws, v); }
  }
  function leaveGroup(p, why) {
    const g = groupOf(p);
    if (!g) return;
    g.members = g.members.filter((id) => id !== p.id);
    p.group = null;
    send(p.ws, { t: 'group', id: 0, leader: 0, members: [] });
    for (const id of g.members) { const o = players.get(id); if (o) sys(o, `${p.name} ${why}.`); }
    if (g.members.length < 2) {
      // A group of one is no group
      for (const id of g.members) { const o = players.get(id); if (o) { o.group = null; send(o.ws, { t: 'group', id: 0, leader: 0, members: [] }); sys(o, 'The group has broken up.'); } }
      groups.delete(g.id);
    } else sendGroup(g);
  }

  function tradeOf(p) { return p.trade ? trades.get(p.trade) ?? null : null; }
  function tradeView(tr, forId) {
    const other = forId === tr.a ? tr.b : tr.a;
    return {
      t: 'trade', id: tr.id, with: players.get(other)?.name ?? '',
      mine: tr.offer[forId], theirs: tr.offer[other],
      myLock: !!tr.locked[forId], theirLock: !!tr.locked[other],
      myAccept: !!tr.accepted[forId], theirAccept: !!tr.accepted[other],
    };
  }
  function sendTrade(tr) {
    for (const id of [tr.a, tr.b]) { const p = players.get(id); if (p) send(p.ws, tradeView(tr, id)); }
  }
  function closeTrade(tr, why) {
    trades.delete(tr.id);
    for (const id of [tr.a, tr.b]) {
      const p = players.get(id);
      if (!p) continue;
      p.trade = null;
      send(p.ws, { t: 'tradeEnd', why });
    }
  }
  /** Visitor id -> { host id, when asked } */
  const homeAsks = new Map();
  const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) <= TRADE_RANGE;

  /** A message about groups or trades; returns true if it was one. */
  function handle(me, msg) {
    switch (msg.t) {
      // ------------------------------------------------------------ Groups
      case 'gInvite': {
        const to = byName(msg.name);
        if (!to || to === me) { sys(me, to ? 'You can\'t invite yourself.' : `Nobody called ${String(msg.name ?? '').slice(0, 20)} is in the world.`); return true; }
        const g = groupOf(me);
        if (g && g.members[0] !== me.id) { sys(me, 'Only the group\'s leader can invite.'); return true; }
        if (g && g.members.length >= GROUP_MAX) { sys(me, `The group is full (${GROUP_MAX}).`); return true; }
        if (to.group) { sys(me, `${to.name} is already in a group.`); return true; }
        invites.set(to.id, { from: me.id, group: g?.id ?? null, at: Date.now() });
        send(to.ws, { t: 'gInvited', from: me.name });
        sys(me, `You invite ${to.name} to group.`);
        return true;
      }
      case 'gAnswer': {
        const inv = invites.get(me.id);
        invites.delete(me.id);
        if (!inv || Date.now() - inv.at > INVITE_MS) { sys(me, 'That invitation has lapsed.'); return true; }
        const from = players.get(inv.from);
        if (!from) { sys(me, 'Whoever invited you has left.'); return true; }
        if (!msg.accept) { sys(from, `${me.name} declines.`); return true; }
        if (me.group) leaveGroup(me, 'has left the group');
        let g = groupOf(from);
        if (!g) { g = { id: nextGroup++, members: [from.id] }; groups.set(g.id, g); from.group = g.id; }
        if (g.members.length >= GROUP_MAX) { sys(me, 'That group is full.'); return true; }
        g.members.push(me.id);
        me.group = g.id;
        for (const id of g.members) { const o = players.get(id); if (o && o !== me) sys(o, `${me.name} has joined the group.`); }
        sys(me, `You join ${from.name}'s group.`);
        sendGroup(g);
        return true;
      }
      case 'gLeave': leaveGroup(me, 'has left the group'); return true;
      case 'gKick': {
        const g = groupOf(me);
        const who = byName(msg.name);
        if (!g || g.members[0] !== me.id) { sys(me, 'Only the group\'s leader can do that.'); return true; }
        if (!who || who.group !== g.id || who === me) { sys(me, 'They aren\'t in your group.'); return true; }
        sys(who, `${me.name} has removed you from the group.`);
        leaveGroup(who, 'has been removed from the group');
        return true;
      }
      case 'gChat': {
        const g = groupOf(me);
        const text = typeof msg.text === 'string' ? msg.text.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
        if (!g) { sys(me, 'You aren\'t in a group.'); return true; }
        const now = Date.now();
        if (!text || now - (me.lastChat ?? 0) < 600) return true;
        me.lastChat = now;
        for (const id of g.members) { const o = players.get(id); if (o) send(o.ws, { t: 'chat', from: me.name, id: me.id, text, kind: 'group' }); }
        return true;
      }
      case 'vitals': {
        const hp = Number(msg.hp), max = Number(msg.max), level = Number(msg.level);
        if (Number.isFinite(hp) && Number.isFinite(max) && max > 0 && max < 100000) { me.hp = Math.max(0, Math.min(max, hp)); me.maxHp = max; }
        if (Number.isFinite(level) && level >= 1 && level <= 999) me.level = Math.round(level);
        if (typeof msg.calling === 'string' && /^[a-z]{3,16}$/.test(msg.calling)) me.calling = msg.calling;
        return true;
      }
      // ------------------------------------------------------------ Home visits
      // Everyone's Wendside Cottage stands in the same spot; a visit shows the visitor the host's
      // furniture in place of their own. The host says yes first, then sends their layout.
      case 'hAsk': {
        const to = byName(msg.name);
        if (!to || to === me) { sys(me, to ? "That's your own home." : `Nobody called ${String(msg.name ?? '').slice(0, 20)} is in the world.`); return true; }
        homeAsks.set(me.id, { to: to.id, at: Date.now() });
        send(to.ws, { t: 'hAsked', from: me.name });
        sys(me, `You ask to visit ${to.name}'s home.`);
        return true;
      }
      case 'hShow': {
        const asker = byName(msg.name);
        const ask = asker && homeAsks.get(asker.id);
        if (!asker || !ask || ask.to !== me.id || Date.now() - ask.at > 120_000) { sys(me, 'That request to visit has lapsed.'); return true; }
        homeAsks.delete(asker.id);
        if (!msg.accept) { sys(asker, `${me.name} would rather not have visitors just now.`); return true; }
        if (!Array.isArray(msg.pieces)) { sys(asker, `${me.name} doesn't have a home yet.`); return true; }
        const pieces = msg.pieces.slice(0, 24).filter((p) => Array.isArray(p) && p.length === 4 && typeof p[0] === 'string' && p[0].length < 40 && [1, 2, 3].every((i) => Number.isFinite(p[i])));
        const pl = msg.plot && typeof msg.plot === 'object' ? msg.plot : null;
        const plot = pl && typeof pl.lot === 'string' && pl.lot.length < 8 ? { lot: pl.lot, spec: pl.spec && typeof pl.spec === 'object' ? { size: String(pl.spec.size).slice(0, 12), floors: Number(pl.spec.floors) === 2 ? 2 : 1, wall: String(pl.spec.wall).slice(0, 12), roof: String(pl.spec.roof).slice(0, 12) } : undefined } : null;
        send(asker.ws, { t: 'hShow', owner: me.name, pieces, plot });
        sys(me, `${asker.name} can see round your home now.`);
        return true;
      }
      // ------------------------------------------------------------ Trades
      case 'tAsk': {
        const to = byName(msg.name);
        if (!to || to === me) { sys(me, to ? 'You can\'t trade with yourself.' : `Nobody called ${String(msg.name ?? '').slice(0, 20)} is in the world.`); return true; }
        if (me.trade || to.trade) { sys(me, me.trade ? 'You\'re already trading.' : `${to.name} is busy trading.`); return true; }
        if (!near(me, to)) { sys(me, `${to.name} is too far away to trade. Stand closer.`); return true; }
        tradeAsks.set(me.id, to.id);
        send(to.ws, { t: 'tAsked', from: me.name });
        sys(me, `You ask ${to.name} to trade.`);
        return true;
      }
      case 'tAnswer': {
        const asker = byName(msg.name);
        if (!asker || tradeAsks.get(asker.id) !== me.id) { sys(me, 'That offer to trade has lapsed.'); return true; }
        tradeAsks.delete(asker.id);
        if (!msg.accept) { sys(asker, `${me.name} doesn't want to trade.`); return true; }
        if (asker.trade || me.trade) { sys(me, 'One of you is already trading.'); return true; }
        if (!near(asker, me)) { sys(me, `${asker.name} is too far away now.`); return true; }
        const tr = { id: nextTrade++, a: asker.id, b: me.id, offer: { [asker.id]: { items: [], marks: 0 }, [me.id]: { items: [], marks: 0 } }, locked: {}, accepted: {} };
        trades.set(tr.id, tr);
        asker.trade = me.trade = tr.id;
        sendTrade(tr);
        return true;
      }
      case 'tOffer': {
        const tr = tradeOf(me);
        if (!tr) return true;
        const items = Array.isArray(msg.items) ? msg.items.slice(0, 8).filter((s) => s && typeof s.id === 'string' && ITEM.test(s.id) && Number.isInteger(s.n) && s.n >= 1 && s.n <= 999).map((s) => ({ id: s.id, n: s.n })) : [];
        const marks = Math.max(0, Math.min(1_000_000, Math.floor(Number(msg.marks) || 0)));
        tr.offer[me.id] = { items, marks };
        // Any change unlocks both sides: nobody accepts a deal they haven't seen
        tr.locked = {}; tr.accepted = {};
        sendTrade(tr);
        return true;
      }
      case 'tLock': {
        const tr = tradeOf(me);
        if (!tr) return true;
        tr.locked[me.id] = !!msg.on;
        if (!msg.on) tr.accepted = {};
        sendTrade(tr);
        return true;
      }
      case 'tAccept': {
        const tr = tradeOf(me);
        if (!tr) return true;
        if (!tr.locked[tr.a] || !tr.locked[tr.b]) { sys(me, 'Both of you need to lock the trade first.'); return true; }
        const a = players.get(tr.a), b = players.get(tr.b);
        if (!a || !b || !near(a, b)) { closeTrade(tr, 'You moved too far apart.'); return true; }
        tr.accepted[me.id] = true;
        if (tr.accepted[tr.a] && tr.accepted[tr.b]) {
          // Done: each side gives what it put up and takes the other's
          for (const [p, other] of [[a, b], [b, a]]) send(p.ws, { t: 'tradeDone', with: other.name, give: tr.offer[p.id], take: tr.offer[other.id] });
          trades.delete(tr.id);
          a.trade = b.trade = null;
          return true;
        }
        sendTrade(tr);
        return true;
      }
      case 'tCancel': {
        const tr = tradeOf(me);
        if (tr) closeTrade(tr, `${me.name} has cancelled the trade.`);
        return true;
      }
    }
    return false;
  }

  /** A player has gone: out of their group, and out of any trade. */
  function leave(me) {
    invites.delete(me.id);
    tradeAsks.delete(me.id);
    const tr = tradeOf(me);
    if (tr) closeTrade(tr, `${me.name} has left.`);
    leaveGroup(me, 'has left the world');
  }

  // Groups see each other's health and whereabouts twice a second; trades end if the two walk apart.
  setInterval(() => {
    for (const g of groups.values()) sendGroup(g);
    for (const tr of [...trades.values()]) {
      const a = players.get(tr.a), b = players.get(tr.b);
      if (!a || !b) closeTrade(tr, 'The other trader has gone.');
      else if (!near(a, b)) closeTrade(tr, 'You moved too far apart to trade.');
    }
    const now = Date.now();
    for (const [id, inv] of invites) if (now - inv.at > INVITE_MS) invites.delete(id);
  }, 500);

  return { handle, leave };
}
