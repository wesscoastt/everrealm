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
/** The world-boss finder: boss id -> ids of players looking for a group to take it on (src/game/Game.ts wbLook). */
const wbSeekers = new Map();
/** How long a player stays on a boss's list before they're taken off it. */
const WB_SEEK_MS = 30 * 60_000;
const BOSS_ID = /^wb-[a-z]{2,20}$/;
/**
 * The open world's board (the Group Finder's, as GW2's and WoW's): a notice from anyone doing something now (a
 * quest, a land's content, the tower, exploring), and anyone may join them with a click, into their group or a
 * new one with them. poster id -> { kind, label, region, at }. A notice comes down when its poster takes it down
 * or leaves, when the group is full, or after half an hour. No free text: the game writes the words.
 */
const notices = new Map();
const NOTICE_MS = 30 * 60_000;
const NOTICE_KINDS = new Set(['quest', 'region', 'tower', 'explore', 'event']);
const cleanText = (s, n) => String(s ?? '').replace(/[^A-Za-z0-9' ,.:-]/g, '').slice(0, n);

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
    sys(p, why === 'has left the group' ? 'You have left the group.' : 'You are no longer in the group.');
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
      case 'wbLook': {
        // Looking for a group for a world boss: a group already going after it takes you in; failing
        // that, the next player who looks makes a group with you. A group's leader who looks opens
        // their own group to the others looking.
        const boss = typeof msg.boss === 'string' && BOSS_ID.test(msg.boss) ? msg.boss : null;
        if (!boss) return true;
        const name = typeof msg.name === 'string' ? msg.name.replace(/[^A-Za-z' -]/g, '').slice(0, 40) || 'the boss' : 'the boss';
        wbDrop(me);
        const mine = groupOf(me);
        if (mine && mine.members[0] === me.id) {
          mine.boss = boss;
          for (const id of [...(wbSeekers.get(boss) ?? [])]) {
            const o = players.get(id);
            if (!o || mine.members.length >= GROUP_MAX) continue;
            wbDrop(o);
            if (o.group) leaveGroup(o, 'has left the group');
            mine.members.push(o.id); o.group = mine.id;
            sys(o, `You join ${me.name}'s group, going after ${name}.`);
            send(o.ws, { t: 'wbSeek', boss: null });
          }
          sendGroup(mine);
          sys(me, `Your group is open to anyone looking for ${name}.`);
          return true;
        }
        if (mine && mine.boss === boss) { sys(me, `Your group is already going after ${name}.`); return true; }
        const open = [...groups.values()].find((g) => g.boss === boss && g.members.length < GROUP_MAX && !g.members.includes(me.id));
        if (open) {
          if (me.group) leaveGroup(me, 'has left the group');
          open.members.push(me.id); me.group = open.id;
          for (const id of open.members) { const o = players.get(id); if (o && o !== me) sys(o, `${me.name} has joined the group, for ${name}.`); }
          sys(me, `You join a group going after ${name}.`);
          sendGroup(open);
          send(me.ws, { t: 'wbSeek', boss: null });
          return true;
        }
        const other = [...(wbSeekers.get(boss) ?? [])].map((id) => players.get(id)).find((o) => o && o !== me);
        if (other) {
          wbDrop(other);
          formGroup([other.id, me.id], `You're grouped to go after ${name}.`);
          const g = groupOf(me);
          if (g) g.boss = boss;
          for (const o of [other, me]) send(o.ws, { t: 'wbSeek', boss: null });
          return true;
        }
        if (!wbSeekers.has(boss)) wbSeekers.set(boss, new Set());
        wbSeekers.get(boss).add(me.id);
        me.wbAt = Date.now();
        send(me.ws, { t: 'wbSeek', boss });
        sys(me, `You're on the list for ${name}. You'll be grouped with the next player who looks, or put in a group going after it.`);
        return true;
      }
      case 'wbStop': wbDrop(me); send(me.ws, { t: 'wbSeek', boss: null }); return true;
      // ------------------------------------------------------------ The open world's board
      case 'lfgList': boardTo(me); return true;
      case 'lfgPost': {
        if (!NOTICE_KINDS.has(msg.kind)) return true;
        notices.set(me.id, { kind: msg.kind, label: cleanText(msg.label, 60) || 'Out and about', region: cleanText(msg.region, 32), at: Date.now() });
        sys(me, 'Your notice is up on the board. Anyone can join you from the Group Finder.');
        boardTo(me);
        return true;
      }
      case 'lfgStop': notices.delete(me.id); boardTo(me); return true;
      case 'lfgJoin': {
        const id = Number(msg.id), poster = players.get(id), n = notices.get(id);
        if (!poster || !n) { sys(me, 'That notice has come down.'); boardTo(me); return true; }
        if (poster === me) return true;
        const g = groupOf(poster);
        if (g) {
          if (g.members.includes(me.id)) { sys(me, 'You\'re in that group already.'); return true; }
          if (g.members.length >= GROUP_MAX) { notices.delete(id); sys(me, 'That group has filled up.'); boardTo(me); return true; }
          if (me.group) leaveGroup(me, 'has left the group');
          g.members.push(me.id); me.group = g.id;
          for (const m of g.members) { const o = players.get(m); if (o && o !== me) sys(o, `${me.name} has joined the group from the board.`); }
          sys(me, `You join ${poster.name}'s group: ${n.label}.`);
          sendGroup(g);
          if (g.members.length >= GROUP_MAX) notices.delete(id);
        } else formGroup([poster.id, me.id], `Grouped from the board: ${n.label}.`);
        boardTo(me);
        return true;
      }
      case 'gPromote': {
        const g = groupOf(me);
        const who = byName(msg.name);
        if (!g || g.members[0] !== me.id) { sys(me, 'Only the group\'s leader can do that.'); return true; }
        if (!who || who.group !== g.id || who === me) { sys(me, 'They aren\'t in your group.'); return true; }
        g.members = [who.id, ...g.members.filter((id) => id !== who.id)];
        for (const id of g.members) { const o = players.get(id); if (o) sys(o, `${who.name} now leads the group.`); }
        sendGroup(g);
        return true;
      }
      // ------------------------------------------------------------ Whispers and friends
      case 'whisper': {
        const to = byName(msg.to);
        const text = typeof msg.text === 'string' ? msg.text.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
        if (!to) { sys(me, `Nobody called ${String(msg.to ?? '').slice(0, 20)} is in the world.`); return true; }
        if (to === me || !text) return true;
        const now = Date.now();
        if (now - (me.lastChat ?? 0) < 600) return true;
        me.lastChat = now;
        send(to.ws, { t: 'chat', from: me.name, id: me.id, text, kind: 'whisper' });
        send(me.ws, { t: 'chat', from: to.name, id: me.id, text, kind: 'whisperTo' });
        return true;
      }
      case 'fWatch': {
        // The names on this player's friends list: who of them is in the world, and word as they come and go
        const names = Array.isArray(msg.names) ? msg.names.filter((n) => typeof n === 'string').slice(0, 100).map((n) => n.trim().toLowerCase()) : [];
        me.watch = new Set(names);
        send(me.ws, friendStatus(me));
        return true;
      }
      case 'gKick': {
        const g = groupOf(me);
        const who = byName(msg.name);
        if (!g || g.members[0] !== me.id) { sys(me, 'Only the group\'s leader can do that.'); return true; }
        if (!who || who.group !== g.id || who === me) { sys(me, 'They aren\'t in your group.'); return true; }
        sys(who, `${me.name} has removed you from the group.`);
        leaveGroup(who, 'has been removed from the group');
        return true;
      }
      case 'gKill': {
        // A kill in a group counts for everyone in it nearby (their quests and bounty counts): ESO's and GW2's way
        const g = groupOf(me);
        const type = typeof msg.type === 'string' && /^[a-z0-9_]{2,40}$/.test(msg.type) ? msg.type : null;
        if (!g || !type) return true;
        for (const id of g.members) { const o = players.get(id); if (o && o !== me && o.land === me.land && Math.hypot(o.x - me.x, o.z - me.z) < 80) send(o.ws, { t: 'gKill', type, from: me.name }); }
        return true;
      }
      case 'gAid': {
        // A Mender's heal or ward for a groupmate near them (src/game/ClassKit.ts): passed on, within reason.
        // (The one receiving it caps it again by their own health: the realm doesn't keep anyone's health.)
        const g = groupOf(me), to = g && g.members.includes(Number(msg.to)) ? players.get(Number(msg.to)) : null;
        const num = (v, max) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Number(v))) : 0);
        const heal = num(msg.heal, 50000), ward = num(msg.ward, 50000), secs = num(msg.secs, 12);
        const now = Date.now();
        me.aidAt = (me.aidAt ?? []).filter((t) => now - t < 1000);
        if (!to || to === me || to.land !== me.land || Math.hypot(to.x - me.x, to.z - me.z) > 60 || me.aidAt.length >= 8 || (!heal && !ward)) return true;
        me.aidAt.push(now);
        send(to.ws, { t: 'gAid', from: me.name, heal, ward, secs });
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
      case 'roll': {
        // Dice, rolled by the realm so nobody can pick their number: everyone within forty blocks hears it, and the group
        const max = Math.max(2, Math.min(1000, Math.floor(Number(msg.max) || 100)));
        const n = 1 + Math.floor(Math.random() * max), text = `${me.name} rolls ${n} (1-${max}).`;
        const g = groupOf(me);
        for (const p of players.values()) if (p === me || (p.land === me.land && Math.hypot((p.x ?? 0) - (me.x ?? 0), (p.z ?? 0) - (me.z ?? 0)) < 40) || g?.members.includes(p.id)) sys(p, text);
        return true;
      }
      case 'hShow': {
        const asker = byName(msg.name);
        const ask = asker && homeAsks.get(asker.id);
        if (!asker || !ask || ask.to !== me.id || Date.now() - ask.at > 120_000) { sys(me, 'That request to visit has lapsed.'); return true; }
        homeAsks.delete(asker.id);
        if (!msg.accept) { sys(asker, `${me.name} would rather not have visitors just now.`); return true; }
        if (!Array.isArray(msg.pieces)) { sys(asker, `${me.name} doesn't have a home yet.`); return true; }
        const pieces = msg.pieces.slice(0, 24).filter((p) => Array.isArray(p) && (p.length === 4 || p.length === 5) && typeof p[0] === 'string' && p[0].length < 40 && p.slice(1).every((n) => Number.isFinite(n)));
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
  /** Who on this player's friends list is in the world, and where. */
  function friendStatus(me) {
    return { t: 'fStatus', online: [...players.values()].filter((p) => p !== me && me.watch?.has(p.name.toLowerCase())).map((p) => ({ name: p.name, x: Math.round(p.x), z: Math.round(p.z) })) };
  }
  /** A player has come into the world or gone: tell everyone who keeps them as a friend. */
  function announce(who, on) {
    const n = who.name.toLowerCase();
    for (const p of players.values()) if (p !== who && p.watch?.has(n)) send(p.ws, { t: on ? 'fOn' : 'fOff', name: who.name });
  }
  function join(me) { announce(me, true); }
  /** Off every world boss's list. */
  function wbDrop(p) { if (!p) return; for (const [k, set] of wbSeekers) { set.delete(p.id); if (!set.size) wbSeekers.delete(k); } }

  function leave(me) {
    announce(me, false);
    invites.delete(me.id);
    tradeAsks.delete(me.id);
    const tr = tradeOf(me);
    if (tr) closeTrade(tr, `${me.name} has left.`);
    leaveGroup(me, 'has left the world');
    wbDrop(me);
    notices.delete(me.id);
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
    for (const [id, n] of notices) if (!players.has(id) || now - n.at > NOTICE_MS) { notices.delete(id); const o = players.get(id); if (o) sys(o, 'Your notice on the board has come down after half an hour.'); }
    for (const set of wbSeekers.values()) for (const id of set) { const o = players.get(id); if (!o || now - (o.wbAt ?? 0) > WB_SEEK_MS) { if (o) { wbDrop(o); send(o.ws, { t: 'wbSeek', boss: null }); sys(o, 'Nobody else was looking: you are off the world boss list.'); } else set.delete(id); } }
  }, 500);

  /** The board as one player sees it: everyone's notice, with their group's size, and which is theirs. */
  function boardTo(p) {
    const list = [...notices].filter(([id]) => players.has(id)).map(([id, n]) => {
      const o = players.get(id), g = groupOf(o);
      return { id, name: o.name, kind: n.kind, label: n.label, region: n.region, level: o.level ?? 1, size: g ? g.members.length : 1, mine: id === p.id };
    });
    send(p.ws, { t: 'lfg', list });
  }

  /** Put these players in one group of their own (the Group Finder's), out of any they were in. */
  function formGroup(ids, said = 'You\'re grouped for the dungeon.') {
    const ps = ids.map((id) => players.get(id)).filter(Boolean);
    if (ps.length < 2) return;
    const g0 = groupOf(ps[0]);
    if (g0 && g0.members.length === ps.length && ps.every((p) => p.group === g0.id)) return; // already just them
    for (const p of ps) if (p.group) leaveGroup(p, 'has left the group');
    const g = { id: nextGroup++, members: ps.map((p) => p.id) };
    groups.set(g.id, g);
    for (const p of ps) { p.group = g.id; sys(p, said); }
    sendGroup(g);
  }
  /** A player's group: its leader and members (ids), or null. */
  function groupIds(p) { const g = groupOf(p); return g ? { leader: g.members[0], members: [...g.members] } : null; }

  return { handle, join, leave, formGroup, groupIds };
}
