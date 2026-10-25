// Guilds, on the world server. They outlast sessions: one file per guild under data/guilds,
// mirrored to Redis like everything else, keyed by the guild's name.
//
// Anyone not in a guild can found one, free. Ranks: the leader, officers and members. Officers
// invite, remove members and set the motto; the leader also promotes, demotes, removes officers
// and can hand the guild to someone else. When the leader leaves, the longest-serving officer
// (or failing that, member) leads; when the last member leaves, the guild is gone.
// Members are characters (by name key), so a guild remembers them while they're offline.
//
// The guild vault, at any bank counter: goods and marks the guild holds in common, kept in the guild's
// file with a log of the last thirty movements. Anyone in the guild pays in. Officers and the leader
// take out what they like; a member takes out up to twenty things and two hundred marks a day. (The
// browser keeps the pack: it sets goods or coin aside before paying in and gets them back if the vault
// turns them down; on the way out, the vault agrees first and then the pack takes them.)
//
// Guild halls on Hall Row outside Ansbury (src/data/guildhalls.ts): a guild's officers lease one of the
// eight from the guild vault, and the guild builds it out one project at a time from what its members
// bring (or an officer pays from the vault). The hall, what's built and the roll of honour go in the
// guild's file; every player hears the book of halls (who holds which, and what's built in each), so
// everyone passing sees the banners and the wings. Messages, client to server:
//   { t: 'uHallGet' }                       your guild's hall, as its members see it
//   { t: 'uHallLease', id }                 an officer leases a free hall, from the vault
//   { t: 'uHallPick', project }             an officer sets what the guild builds next
//   { t: 'uHallGive', item, n, vault? }     goods (item) or marks (null) toward it: from your pack (set aside
//                                           already; what isn't needed comes back as uHallRefund), or an
//                                           officer's from the vault
//   { t: 'uHonour', name }                  a great beast a member helped bring down, for the roll
//   { t: 'uHallLeave' }                     the leader gives the hall up
// Server to client: { t: 'halls', list } (the book, to everyone), { t: 'uHall', ... }, { t: 'uHallRefund', item, n, why }.

import fs from 'node:fs';
import path from 'node:path';

const NAME = /^[A-Za-z][A-Za-z' -]{1,22}[A-Za-z]$/;
const RANKS = ['member', 'officer', 'leader'];
const MAX_MEMBERS = 200;
const ITEM = /^[a-z0-9_]{2,40}$/;
const VAULT_KINDS = 100;
const MEMBER_DAY = { items: 20, marks: 200 };
const HALL_IDS = ['fullers', 'dyers', 'chandlers', 'saddlers', 'coopers', 'mercers', 'vintners', 'cordwainers'];
const HALL_LEASE = 5000;
/** What each wing of a hall takes to build. */
const PROJECTS = {
  table: { items: { oak_logs: 80, birch_logs: 40 }, marks: 1000 },
  forge: { items: { iron_bar: 40, bronze_bar: 20, pine_logs: 60 }, marks: 1500 },
  counting: { items: { silver_bar: 15, oak_logs: 60 }, marks: 2000 },
  maproom: { items: { elder_logs: 30, silver_bar: 10 }, marks: 3000 },
  honour: { items: { wolf_pelt: 30, boar_hide: 30, frost_pelt: 10 }, marks: 2000 },
};
const HONOUR_NAME = /^[A-Za-z][A-Za-z' ,-]{1,38}[A-Za-z]$/;

export function guildsInit(ctx) {
  const { players, send, broadcast, readJson, writeJson, dataDir, mirrorDelete, log } = ctx;
  const DIR = path.join(dataDir, 'guilds');
  fs.mkdirSync(DIR, { recursive: true });
  const gkey = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileOf = (key) => path.join(DIR, key + '.json');

  /** guild key -> guild; character key -> guild key */
  const guilds = new Map();
  const memberOf = new Map();
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue;
    const g = readJson(path.join(DIR, f));
    if (!g?.members) continue;
    guilds.set(g.key, g);
    for (const ck of Object.keys(g.members)) memberOf.set(ck, g.key);
  }
  log(`${guilds.size} guild(s) loaded`);
  /** invitee player id -> { guild key, from name, at } */
  const invites = new Map();

  const store = (g) => writeJson(fileOf(g.key), g);
  const sys = (p, text) => send(p.ws, { t: 'sys', text });
  const guildOf = (p) => { const k = memberOf.get(p.key); return k ? guilds.get(k) ?? null : null; };
  const online = (g) => [...players.values()].filter((p) => g.members[p.key]);
  const rankOf = (g, p) => g.members[p.key]?.rank ?? null;
  const atLeast = (r, want) => RANKS.indexOf(r) >= RANKS.indexOf(want);
  const byName = (name) => { const n = String(name ?? '').trim().toLowerCase(); return [...players.values()].find((p) => p.name.toLowerCase() === n) ?? null; };
  const memberKeyByName = (g, name) => { const n = String(name ?? '').trim().toLowerCase(); return Object.keys(g.members).find((k) => g.members[k].name.toLowerCase() === n) ?? null; };

  function view(g, forP) {
    const on = new Set(online(g).map((p) => p.key));
    return {
      t: 'guild', name: g.name, motto: g.motto ?? '', rank: rankOf(g, forP), founded: g.created,
      members: Object.entries(g.members).map(([k, m]) => ({ name: m.name, rank: m.rank, online: on.has(k), seen: m.seen ?? m.joined })),
    };
  }
  function sendAll(g) { for (const p of online(g)) send(p.ws, view(g, p)); }
  /** Their guild tag for everyone (on founding, joining or leaving one), and its hall for them. */
  function tag(p) { const g = guildOf(p); p.guildName = g?.name ?? null; broadcast({ t: 'gtag', id: p.id, guild: p.guildName }); send(p.ws, g ? hallView(g, p) : { t: 'uHall', guild: null }); }
  function tell(g, text) { for (const p of online(g)) sys(p, text); }

  function removeMember(g, ck) {
    delete g.members[ck];
    memberOf.delete(ck);
    const left = Object.entries(g.members);
    if (!left.length) {
      guilds.delete(g.key);
      try { fs.unlinkSync(fileOf(g.key)); } catch { /* already gone */ }
      mirrorDelete(fileOf(g.key));
      log(`guild ${g.name} disbanded`);
      if (g.hall) broadcast({ t: 'halls', list: hallsBook() });
      return;
    }
    if (!left.some(([, m]) => m.rank === 'leader')) {
      // The longest-serving officer leads; failing that, the longest-serving member
      const next = left.sort(([, a], [, b]) => (RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank)) || (a.joined - b.joined))[0];
      next[1].rank = 'leader';
      tell(g, `${next[1].name} now leads ${g.name}.`);
    }
    store(g);
  }

  // ------------------------------------------------------------------ guild halls
  /** Who holds which hall, and what's built in each: for everyone. */
  function hallsBook() {
    const list = {};
    for (const g of guilds.values()) if (g.hall) list[g.hall.id] = { guild: g.name, built: g.hall.built, honour: g.hall.honour };
    return list;
  }
  const hallHolder = (id) => [...guilds.values()].find((g) => g.hall?.id === id) ?? null;
  /** The hall as a member sees it: what's built, what's being built and how far it's got, what everything costs. */
  function hallView(g, p) {
    const h = g.hall;
    const free = HALL_IDS.filter((id) => !hallHolder(id));
    return { t: 'uHall', guild: g.name, rank: rankOf(g, p), hall: h?.id ?? null, built: h?.built ?? [], project: h?.project ?? null, got: h?.got ?? {}, honour: h?.honour ?? [], costs: PROJECTS, lease: HALL_LEASE, vaultMarks: vaultOf(g).marks, free };
  }
  function hallChanged(g, book = false) {
    store(g);
    for (const p of online(g)) send(p.ws, hallView(g, p));
    if (book) broadcast({ t: 'halls', list: hallsBook() });
  }
  /** What the project still wants of a thing (item null: marks). */
  function wanted(g, item) {
    const h = g.hall, pr = h?.project && PROJECTS[h.project];
    if (!pr) return 0;
    const got = h.got[h.project] ?? {};
    return item ? Math.max(0, (pr.items[item] ?? 0) - (got[item] ?? 0)) : Math.max(0, pr.marks - (got.marks ?? 0));
  }
  /** Something given toward the project; finishing it if that was the last of it. */
  function given(g, who, item, n) {
    const h = g.hall, got = (h.got[h.project] ??= {});
    got[item ?? 'marks'] = (got[item ?? 'marks'] ?? 0) + n;
    const pr = PROJECTS[h.project];
    if ((got.marks ?? 0) >= pr.marks && Object.entries(pr.items).every(([k, v]) => (got[k] ?? 0) >= v)) {
      h.built.push(h.project);
      delete h.got[h.project];
      tell(g, `The guild's hall has a new wing: ${h.project === 'table' ? 'the long table' : h.project === 'forge' ? 'the forge' : h.project === 'counting' ? 'the counting room' : h.project === 'maproom' ? 'the map room' : 'the roll of honour'} is built. ${who} brought the last of it.`);
      log(`guild ${g.name} built ${h.project} in the ${h.id} hall`);
      h.project = null;
      return true;
    }
    return false;
  }

  /** A player has entered the world: their guild, and their tag for everyone else; and the book of halls. */
  function join(me) {
    send(me.ws, { t: 'halls', list: hallsBook() });
    const g = guildOf(me);
    me.guildName = g?.name ?? null;
    if (!g) return;
    g.members[me.key].name = me.name;
    send(me.ws, view(g, me));
    send(me.ws, hallView(g, me));
    for (const p of online(g)) if (p !== me) send(p.ws, view(g, p));
  }

  function leave(me) {
    invites.delete(me.id);
    const g = guildOf(me);
    if (!g) return;
    g.members[me.key].seen = Date.now();
    store(g);
    for (const p of online(g)) if (p !== me) send(p.ws, view(g, p));
  }

  /** The vault as the guild sees it: what's in it, and who moved what lately. */
  function vaultOf(g) { return (g.vault ??= { items: {}, marks: 0, log: [], day: {} }); }
  const vaultView = (g, p) => {
    const v = vaultOf(g), today = Math.floor(Date.now() / 86_400_000), d = v.day[p.key];
    const used = d && d.day === today ? d : { items: 0, marks: 0 };
    const officer = atLeast(rankOf(g, p), 'officer');
    return { t: 'uVault', guild: g.name, items: v.items, marks: v.marks, log: v.log.slice(-30), left: officer ? null : { items: MEMBER_DAY.items - used.items, marks: MEMBER_DAY.marks - used.marks }, kinds: VAULT_KINDS };
  };
  function note(g, text) { const v = vaultOf(g); v.log.push({ at: Date.now(), text }); if (v.log.length > 30) v.log.splice(0, v.log.length - 30); }
  /** A member's day: what they've taken out today, counted against their allowance. */
  function spend(g, p, items, marks) {
    if (atLeast(rankOf(g, p), 'officer')) return true;
    const v = vaultOf(g), today = Math.floor(Date.now() / 86_400_000);
    const d = v.day[p.key]?.day === today ? v.day[p.key] : { day: today, items: 0, marks: 0 };
    if (d.items + items > MEMBER_DAY.items || d.marks + marks > MEMBER_DAY.marks) return false;
    d.items += items; d.marks += marks; v.day[p.key] = d;
    return true;
  }

  function handle(me, msg) {
    switch (msg.t) {
      case 'uHallGet': {
        const g = guildOf(me);
        send(me.ws, g ? hallView(g, me) : { t: 'uHall', guild: null });
        return true;
      }
      case 'uHallLease': {
        const g = guildOf(me);
        const id = HALL_IDS.includes(msg.id) ? msg.id : null;
        if (!g || !atLeast(rankOf(g, me), 'officer')) { sys(me, g ? 'Only the guild\'s officers and its leader can lease a hall.' : 'You aren\'t in a guild.'); return true; }
        if (g.hall) { sys(me, 'Your guild already has a hall.'); return true; }
        if (!id || hallHolder(id)) { sys(me, 'That hall is let already.'); send(me.ws, hallView(g, me)); return true; }
        const v = vaultOf(g);
        if (v.marks < HALL_LEASE) { sys(me, `The lease is ${HALL_LEASE.toLocaleString()} marks, from the guild vault. It holds ${v.marks.toLocaleString()}.`); return true; }
        v.marks -= HALL_LEASE;
        note(g, `${me.name} paid ${HALL_LEASE} marks for the lease of a hall`);
        g.hall = { id, since: Date.now(), built: [], project: null, got: {}, honour: [] };
        tell(g, `${me.name} has leased a hall on Hall Row for ${g.name}. It's yours.`);
        log(`guild ${g.name} leased the ${id} hall`);
        hallChanged(g, true);
        return true;
      }
      case 'uHallPick': {
        const g = guildOf(me);
        const pr = typeof msg.project === 'string' && PROJECTS[msg.project] ? msg.project : null;
        if (!g?.hall || !atLeast(rankOf(g, me), 'officer')) { sys(me, g?.hall ? 'Only the guild\'s officers and its leader choose what to build.' : 'Your guild has no hall.'); return true; }
        if (!pr || g.hall.built.includes(pr)) { sys(me, 'That\'s built already.'); return true; }
        g.hall.project = pr;
        tell(g, `${me.name} has set the guild to building the next wing of its hall.`);
        hallChanged(g);
        return true;
      }
      case 'uHallGive': {
        const g = guildOf(me);
        const item = typeof msg.item === 'string' && ITEM.test(msg.item) ? msg.item : null;
        const n = Number.isInteger(msg.n) && msg.n >= 1 && msg.n <= 100_000 ? msg.n : null;
        const fromVault = !!msg.vault;
        const back = (left, why) => { if (!fromVault && left > 0) send(me.ws, { t: 'uHallRefund', item, n: left, why }); else if (why) sys(me, why); };
        if (!g?.hall?.project) { back(n ?? 0, g?.hall ? 'Nothing is being built. An officer has to choose what\'s next.' : 'Your guild has no hall.'); return true; }
        if (n === null) { back(0, 'The clerk can\'t make sense of that.'); return true; }
        if (fromVault && !atLeast(rankOf(g, me), 'officer')) { sys(me, 'Only officers pay from the vault.'); return true; }
        const want = wanted(g, item);
        let take = Math.min(n, want);
        if (fromVault) {
          const v = vaultOf(g);
          take = Math.min(take, item ? v.items[item] ?? 0 : v.marks);
          if (take <= 0) { sys(me, want ? 'The vault hasn\'t any to give.' : 'The project doesn\'t need that.'); return true; }
          if (item) { v.items[item] -= take; if (v.items[item] <= 0) delete v.items[item]; } else v.marks -= take;
          note(g, `${me.name} gave ${take} ${item ? '× ' + item : 'marks'} from the vault toward the hall`);
        }
        if (take <= 0) { back(n, 'The project doesn\'t need that, or has all it needs of it.'); return true; }
        given(g, me.name, item, take);
        back(n - take, n > take ? `It only needed ${take}. The rest is back in your ${item ? 'pack' : 'purse'}.` : '');
        hallChanged(g, !g.hall.project);
        return true;
      }
      case 'uHonour': {
        const g = guildOf(me);
        const name = typeof msg.name === 'string' && HONOUR_NAME.test(msg.name) ? msg.name : null;
        if (!g?.hall || !name || g.hall.honour.includes(name) || g.hall.honour.length >= 40) return true;
        g.hall.honour.push(name);
        if (g.hall.built.includes('honour')) tell(g, `${name} goes on the roll of honour in the hall.`);
        hallChanged(g, true);
        return true;
      }
      case 'uHallLeave': {
        const g = guildOf(me);
        if (!g?.hall || rankOf(g, me) !== 'leader') { sys(me, g?.hall ? 'Only the leader can give up the hall.' : 'Your guild has no hall.'); return true; }
        tell(g, `${me.name} has given up the guild's hall. The Charter will let it to someone else.`);
        log(`guild ${g.name} gave up the ${g.hall.id} hall`);
        delete g.hall;
        hallChanged(g, true);
        return true;
      }
      case 'uVaultGet': {
        const g = guildOf(me);
        if (!g) { send(me.ws, { t: 'uVault', guild: null }); return true; }
        send(me.ws, vaultView(g, me));
        return true;
      }
      case 'uDeposit': {
        // Goods or marks paid in: the browser set them aside; if the vault won't take them they go back
        const g = guildOf(me);
        const item = typeof msg.item === 'string' && ITEM.test(msg.item) ? msg.item : null;
        const n = Number.isInteger(msg.n) && msg.n >= 1 && msg.n <= 100_000 ? msg.n : null;
        const back = (why) => { send(me.ws, { t: 'uRefund', item, n: n ?? 0, coin: !item, why }); };
        if (!g) { back('You aren\'t in a guild.'); return true; }
        if (n === null) { back('The clerk can\'t make sense of that.'); return true; }
        const v = vaultOf(g);
        if (item) {
          if (!v.items[item] && Object.keys(v.items).length >= VAULT_KINDS) { back(`The guild vault holds ${VAULT_KINDS} kinds of things. Somebody will have to take something out first.`); return true; }
          v.items[item] = (v.items[item] ?? 0) + n;
          note(g, `${me.name} paid in ${n} × ${item}`);
        } else {
          v.marks += n;
          note(g, `${me.name} paid in ${n} marks`);
        }
        store(g);
        send(me.ws, vaultView(g, me));
        return true;
      }
      case 'uWithdraw': {
        // Goods or marks taken out: the vault agrees, then the browser takes them into the pack
        const g = guildOf(me);
        const item = typeof msg.item === 'string' && ITEM.test(msg.item) ? msg.item : null;
        const n = Number.isInteger(msg.n) && msg.n >= 1 && msg.n <= 100_000 ? msg.n : null;
        if (!g || n === null) { sys(me, g ? 'The clerk can\'t make sense of that.' : 'You aren\'t in a guild.'); return true; }
        const v = vaultOf(g);
        if (item) {
          if ((v.items[item] ?? 0) < n) { sys(me, 'The guild vault hasn\'t that many.'); send(me.ws, vaultView(g, me)); return true; }
          if (!spend(g, me, n, 0)) { sys(me, `A member takes out up to ${MEMBER_DAY.items} things a day. An officer can take out more.`); return true; }
          v.items[item] -= n;
          if (v.items[item] <= 0) delete v.items[item];
          note(g, `${me.name} took out ${n} × ${item}`);
          store(g);
          send(me.ws, { t: 'uWithdrawn', item, n });
        } else {
          if (v.marks < n) { sys(me, 'The guild vault hasn\'t that many marks.'); send(me.ws, vaultView(g, me)); return true; }
          if (!spend(g, me, 0, n)) { sys(me, `A member takes out up to ${MEMBER_DAY.marks} marks a day. An officer can take out more.`); return true; }
          v.marks -= n;
          note(g, `${me.name} took out ${n} marks`);
          store(g);
          send(me.ws, { t: 'uWithdrawn', item: null, n });
        }
        send(me.ws, vaultView(g, me));
        return true;
      }
      case 'uCreate': {
        const name = typeof msg.name === 'string' ? msg.name.replace(/\s+/g, ' ').trim() : '';
        if (guildOf(me)) { sys(me, 'You\'re already in a guild. Leave it first.'); return true; }
        if (!NAME.test(name)) { sys(me, 'A guild\'s name is 3 to 24 letters (spaces, hyphens and apostrophes allowed).'); return true; }
        const key = gkey(name);
        if (guilds.has(key)) { sys(me, `There is already a guild called ${guilds.get(key).name}.`); return true; }
        const now = Date.now();
        const g = { key, name, motto: typeof msg.motto === 'string' ? msg.motto.slice(0, 140) : '', created: now, members: { [me.key]: { name: me.name, rank: 'leader', joined: now, seen: now } } };
        guilds.set(key, g);
        memberOf.set(me.key, key);
        store(g);
        sys(me, `You have founded ${name}.`);
        send(me.ws, view(g, me));
        tag(me);
        log(`${me.name} founded guild ${name}`);
        return true;
      }
      case 'uInvite': {
        const g = guildOf(me);
        if (!g || !atLeast(rankOf(g, me), 'officer')) { sys(me, g ? 'Only officers and the leader can invite.' : 'You aren\'t in a guild.'); return true; }
        const to = byName(msg.name);
        if (!to || to === me) { sys(me, to ? 'You\'re already in it.' : `Nobody called ${String(msg.name ?? '').slice(0, 20)} is in the world.`); return true; }
        if (guildOf(to)) { sys(me, `${to.name} is already in a guild.`); return true; }
        if (Object.keys(g.members).length >= MAX_MEMBERS) { sys(me, 'The guild is full.'); return true; }
        invites.set(to.id, { key: g.key, from: me.name, at: Date.now() });
        send(to.ws, { t: 'uInvited', from: me.name, guild: g.name });
        sys(me, `You invite ${to.name} to ${g.name}.`);
        return true;
      }
      case 'uAnswer': {
        const inv = invites.get(me.id);
        invites.delete(me.id);
        const g = inv && Date.now() - inv.at < 120_000 ? guilds.get(inv.key) : null;
        if (!g) { sys(me, 'That invitation has lapsed.'); return true; }
        if (!msg.accept) { const from = byName(inv.from); if (from) sys(from, `${me.name} declines to join ${g.name}.`); return true; }
        if (guildOf(me)) { sys(me, 'You\'re already in a guild.'); return true; }
        const now = Date.now();
        g.members[me.key] = { name: me.name, rank: 'member', joined: now, seen: now };
        memberOf.set(me.key, g.key);
        store(g);
        tell(g, `${me.name} has joined ${g.name}.`);
        sendAll(g);
        tag(me);
        return true;
      }
      case 'uLeave': {
        const g = guildOf(me);
        if (!g) { sys(me, 'You aren\'t in a guild.'); return true; }
        removeMember(g, me.key);
        send(me.ws, { t: 'guild', name: null });
        sys(me, `You have left ${g.name}.`);
        if (guilds.has(g.key)) { tell(g, `${me.name} has left the guild.`); sendAll(g); }
        tag(me);
        return true;
      }
      case 'uKick': {
        const g = guildOf(me);
        const ck = g && memberKeyByName(g, msg.name);
        if (!g || !ck || ck === me.key) { sys(me, 'They aren\'t in your guild.'); return true; }
        const mine = rankOf(g, me), theirs = g.members[ck].rank;
        if (!atLeast(mine, 'officer') || RANKS.indexOf(theirs) >= RANKS.indexOf(mine)) { sys(me, 'You can only remove someone of a lower rank.'); return true; }
        const name = g.members[ck].name;
        removeMember(g, ck);
        const them = [...players.values()].find((p) => p.key === ck);
        if (them) { send(them.ws, { t: 'guild', name: null }); sys(them, `You have been removed from ${g.name}.`); tag(them); }
        tell(g, `${name} has been removed from the guild.`);
        sendAll(g);
        return true;
      }
      case 'uRank': {
        const g = guildOf(me);
        const ck = g && memberKeyByName(g, msg.name);
        const rank = RANKS.includes(msg.rank) ? msg.rank : null;
        if (!g || rankOf(g, me) !== 'leader') { sys(me, 'Only the leader can change ranks.'); return true; }
        if (!ck || !rank || ck === me.key) { sys(me, 'No such member.'); return true; }
        if (rank === 'leader') { g.members[me.key].rank = 'officer'; tell(g, `${me.name} hands ${g.name} to ${g.members[ck].name}.`); }
        g.members[ck].rank = rank;
        store(g);
        if (rank !== 'leader') tell(g, `${g.members[ck].name} is now ${rank === 'officer' ? 'an officer' : 'a member'}.`);
        sendAll(g);
        return true;
      }
      case 'uMotto': {
        const g = guildOf(me);
        if (!g || !atLeast(rankOf(g, me), 'officer')) { sys(me, 'Only officers and the leader can set the motto.'); return true; }
        g.motto = typeof msg.text === 'string' ? msg.text.replace(/\s+/g, ' ').trim().slice(0, 140) : '';
        store(g);
        sendAll(g);
        return true;
      }
      case 'uChat': {
        const g = guildOf(me);
        const text = typeof msg.text === 'string' ? msg.text.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
        if (!g) { sys(me, 'You aren\'t in a guild.'); return true; }
        const now = Date.now();
        if (!text || now - (me.lastChat ?? 0) < 600) return true;
        me.lastChat = now;
        for (const p of online(g)) send(p.ws, { t: 'chat', from: me.name, id: me.id, text, kind: 'guild' });
        return true;
      }
      case 'uRoster': {
        const g = guildOf(me);
        send(me.ws, g ? view(g, me) : { t: 'guild', name: null });
        return true;
      }
    }
    return false;
  }

  return { handle, join, leave };
}
