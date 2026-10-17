// Everrealm world server.
//
// What it does:
//   - accounts: sign up and sign in with a name and a password, from any browser or device; the
//     account's characters live on the server and come down to wherever you sign in
//   - presence: every connected player sees the others move, with their look and animation
//   - chat: plain text to everyone on the server, rate-limited
//   - groups of up to five and trades between two players (server/social.mjs)
//   - guilds, kept between sessions (server/guilds.mjs)
//   - characters: a copy of each character's save, owned by an account (or, for players without
//     one, claimed by a per-browser secret as before)
//
// What it does not do yet: validate gameplay. The browser is still the authority for inventory,
// skills and quests; the server stores what it is sent, after basic shape and size checks.
//
// HTTP (same port as the socket):
//   POST /api/register {user, pass}      -> {user, token}
//   POST /api/login    {user, pass}      -> {user, token}
//   POST /api/logout                     (Authorization: Bearer <token>)
//   GET  /api/me                         -> {user, characters: [{name, save, updated}]}
//   PUT  /api/characters/<name> {save}   -> {ok}
//   DELETE /api/characters/<name>        -> {ok}
//   GET  /api/vault                      -> {vault, ver}   (the bank vault all the account's characters share)
//   PUT  /api/vault {vault, ver}         -> {ok, ver}, or 409 {vault, ver} when ver is stale
//
// Run: npm run server   (PORT, HOST and EVERREALM_DATA environment variables override the defaults)
//
// Hosts whose disk doesn't last (Render's free plan wipes it on every restart) can keep the realm
// in Upstash Redis: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. The files stay the
// working copy; every write is mirrored to Redis, and on start the files are restored from it.

import { WebSocketServer } from 'ws';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { socialInit } from './social.mjs';
import { guildsInit } from './guilds.mjs';

const PORT = Number(process.env.PORT ?? 8787);
// Local only by default; a host (or a PORT given by a hosting service) listens on every interface.
const HOST = process.env.HOST ?? (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const DATA = path.resolve(process.env.EVERREALM_DATA ?? 'server/data');
const CHAR_DIR = path.join(DATA, 'characters');
const ACC_DIR = path.join(DATA, 'accounts');
const SESSIONS_FILE = path.join(DATA, 'sessions.json');
fs.mkdirSync(CHAR_DIR, { recursive: true });
fs.mkdirSync(ACC_DIR, { recursive: true });

const TICK_MS = 100;            // snapshot rate
const MAX_MSG = 600_000;        // bytes; a save is ~20-60 KB
const MAX_SAVE = 512_000;
const CHAT_GAP_MS = 600;
const SESSION_DAYS = 60;
const MAX_CHARS = 6;
const WORLD = [-384, 2432];
const ANIMS = new Set(['idle', 'ride', 'walk', 'run', 'swim', 'tread', 'attack', 'cleave', 'mine', 'chop', 'fishCast', 'fishWait', 'hit', 'dead', 'roll', 'talk', 'hammer', 'bellows', 'jump', 'heal', 'cook', 'wave', 'bow', 'cheer', 'dance', 'sit', 'clap', 'point', 'kneel', 'laugh', 'salute', 'shrug', 'sleep']);
const HELD = new Set(['none', 'sword', 'bronzeSword', 'pickaxe', 'hatchet', 'rod', 'hammer', 'tongs']);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
/** Names are unique case-insensitively; the file key keeps letters, digits, space, apostrophe and hyphen. */
const keyFor = (name) => name.toLowerCase().replace(/[^a-z0-9' -]/g, '').trim().replace(/[ ']/g, '_');
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

// ---------------------------------------------------------------- Storage
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL, REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const MIRROR = !!(REDIS_URL && REDIS_TOKEN);
async function redis(cmd) {
  const r = await fetch(REDIS_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + REDIS_TOKEN }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
/** The file's key in Redis: its path under the data folder. */
const mirrorKey = (file) => 'er:' + path.relative(DATA, file).split(path.sep).join('/');
function mirror(file, text) {
  if (!MIRROR) return;
  redis(text === null ? ['DEL', mirrorKey(file)] : ['SET', mirrorKey(file), text]).catch((e) => log('mirror failed:', e.message));
}
/** On start: bring every file back from Redis (the disk may be new and empty). */
async function restore() {
  if (!MIRROR) return;
  try {
    const keys = await redis(['KEYS', 'er:*']);
    for (let i = 0; i < keys.length; i += 100) {
      const part = keys.slice(i, i + 100);
      const vals = await redis(['MGET', ...part]);
      part.forEach((k, j) => {
        if (vals[j] == null) return;
        const file = path.join(DATA, ...k.slice(3).split('/'));
        if (!file.startsWith(DATA)) return;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, vals[j]);
      });
    }
    log(`restored ${keys.length} records from Redis`);
  } catch (e) { log('restore from Redis failed:', e.message); }
}
await restore();

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function writeJson(file, data) {
  const text = JSON.stringify(data);
  fs.writeFileSync(file + '.tmp', text);
  fs.renameSync(file + '.tmp', file);
  mirror(file, text);
}
const loadChar = (key) => readJson(path.join(CHAR_DIR, key + '.json'));
const storeChar = (key, rec) => writeJson(path.join(CHAR_DIR, key + '.json'), rec);
const accKey = (user) => user.toLowerCase();
const loadAccount = (user) => readJson(path.join(ACC_DIR, accKey(user) + '.json'));
const storeAccount = (acc) => writeJson(path.join(ACC_DIR, accKey(acc.user) + '.json'), acc);

/** A save is accepted if it is the shape the client writes and belongs to this character. */
function validSave(save, name) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) return 'not an object';
  if (save.name !== name) return 'name mismatch';
  if (!Array.isArray(save.inv) || save.inv.length > 64) return 'bad inventory';
  if (typeof save.marks !== 'number' || save.marks < 0 || save.marks > 1e7) return 'bad marks';
  if (!save.xp || typeof save.xp !== 'object') return 'bad skills';
  if (typeof save.playTime !== 'number') return 'bad play time';
  return null;
}

// ---------------------------------------------------------------- Accounts and sessions
/** Passwords are kept as scrypt hashes with their own salt. */
function hashPass(pass, salt) { return crypto.scryptSync(pass, salt, 32).toString('hex'); }
function passMatches(acc, pass) {
  const a = Buffer.from(hashPass(pass, acc.salt), 'hex'), b = Buffer.from(acc.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
/** Sessions by the hash of their token (the token itself is never stored). */
const sessions = new Map(Object.entries(readJson(SESSIONS_FILE) ?? {}));
function saveSessions() { writeJson(SESSIONS_FILE, Object.fromEntries(sessions)); }
function newSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(hash(token), { user, exp: Date.now() + SESSION_DAYS * 864e5 });
  saveSessions();
  return token;
}
function sessionUser(token) {
  if (typeof token !== 'string' || token.length < 32) return null;
  const s = sessions.get(hash(token));
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(hash(token)); saveSessions(); return null; }
  return s.user;
}
const validUser = (u) => typeof u === 'string' && /^[A-Za-z0-9_]{3,20}$/.test(u);
const validPass = (p) => typeof p === 'string' && p.length >= 8 && p.length <= 200;

/** Ten sign-in attempts a minute from one address, then wait. */
const attempts = new Map();
function limited(ip) {
  const now = Date.now(), a = (attempts.get(ip) ?? []).filter((t) => now - t < 60_000);
  a.push(now);
  attempts.set(ip, a);
  return a.length > 10;
}

// ---------------------------------------------------------------- HTTP: the account API
function reply(res, code, body) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size <= MAX_MSG) chunks.push(c); });
    req.on('end', () => { if (size > MAX_MSG) return resolve(null); try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch { resolve(null); } });
  });
}
const bearer = (req) => (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');

async function api(req, res) {
  const url = new URL(req.url, 'http://x');
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress;
  if (req.method === 'OPTIONS') return reply(res, 204, {});
  if (url.pathname === '/' || url.pathname === '/health') return reply(res, 200, { ok: true, name: 'Everrealm', online: players.size });

  if (req.method === 'POST' && (url.pathname === '/api/register' || url.pathname === '/api/login')) {
    if (limited(ip)) return reply(res, 429, { error: 'Too many tries. Wait a minute.' });
    const body = await readBody(req);
    const user = body?.user, pass = body?.pass;
    if (!validUser(user)) return reply(res, 400, { error: 'Account names are 3 to 20 letters, digits or underscores.' });
    if (!validPass(pass)) return reply(res, 400, { error: 'Passwords need at least 8 characters.' });
    let acc = loadAccount(user);
    if (url.pathname === '/api/register') {
      if (acc) return reply(res, 409, { error: 'That account name is taken.' });
      const salt = crypto.randomBytes(16).toString('hex');
      acc = { user, salt, hash: hashPass(pass, salt), created: Date.now(), chars: [] };
      storeAccount(acc);
      log(`new account ${user}`);
    } else if (!acc || !passMatches(acc, pass)) return reply(res, 401, { error: 'That name and password don\'t match.' });
    return reply(res, 200, { user: acc.user, token: newSession(acc.user) });
  }

  const user = sessionUser(bearer(req));
  if (url.pathname.startsWith('/api/') && !user) return reply(res, 401, { error: 'Sign in again.' });
  const acc = user && loadAccount(user);
  if (user && !acc) return reply(res, 401, { error: 'Sign in again.' });

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    sessions.delete(hash(bearer(req)));
    saveSessions();
    return reply(res, 200, { ok: true });
  }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const characters = acc.chars.map((k) => loadChar(k)).filter((r) => r && r.owner === acc.user).map((r) => ({ name: r.name, save: r.save, updated: r.updated ?? r.created }));
    return reply(res, 200, { user: acc.user, characters });
  }
  if (url.pathname === '/api/vault') {
    if (req.method === 'GET') return reply(res, 200, { vault: acc.vault ?? { items: {}, marks: 0 }, ver: acc.vaultVer ?? 0 });
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const v = body?.vault;
      // A change made against an older copy (another of the account's characters got there first)
      if (Number(body?.ver) !== (acc.vaultVer ?? 0)) return reply(res, 409, { vault: acc.vault ?? { items: {}, marks: 0 }, ver: acc.vaultVer ?? 0 });
      const items = {};
      const entries = v && typeof v.items === 'object' && v.items ? Object.entries(v.items) : [];
      if (entries.length > 80) return reply(res, 400, { error: 'The vault holds 80 kinds of things.' });
      for (const [k, n] of entries) if (/^[a-z0-9_]{1,40}$/.test(k) && Number.isInteger(n) && n > 0 && n <= 1e6) items[k] = n;
      const marks = Number.isInteger(v?.marks) && v.marks >= 0 && v.marks <= 1e9 ? v.marks : 0;
      acc.vault = { items, marks };
      acc.vaultVer = (acc.vaultVer ?? 0) + 1;
      storeAccount(acc);
      return reply(res, 200, { ok: true, ver: acc.vaultVer });
    }
  }
  const m = url.pathname.match(/^\/api\/characters\/(.+)$/);
  if (m) {
    const name = decodeURIComponent(m[1]).trim().slice(0, 20), key = keyFor(name);
    if (!key) return reply(res, 400, { error: 'Bad name.' });
    let rec = loadChar(key);
    if (rec && rec.owner !== acc.user) {
      // A name claimed before accounts, by a browser secret: its holder can bring it into an account
      const body = req.method === 'PUT' ? await readBody(req) : null;
      if (!(rec.tokenHash && body?.legacyToken && hash(body.legacyToken) === rec.tokenHash && !rec.owner)) return reply(res, 403, { error: `The name ${name} belongs to someone else on this server.` });
      rec.owner = acc.user;
      if (body.save && !validSave(body.save, rec.name)) { rec.save = body.save; rec.updated = Date.now(); }
      storeChar(key, rec);
      if (!acc.chars.includes(key)) { acc.chars.push(key); storeAccount(acc); }
      return reply(res, 200, { ok: true });
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      const bad = validSave(body?.save, body?.save?.name);
      if (bad || keyFor(body.save.name) !== key) return reply(res, 400, { error: 'That save was refused: ' + (bad ?? 'name mismatch') });
      if (!rec) {
        if (acc.chars.length >= MAX_CHARS) return reply(res, 403, { error: `An account keeps at most ${MAX_CHARS} characters.` });
        rec = { name: body.save.name, owner: acc.user, created: Date.now(), save: null };
        log(`${acc.user} claimed ${rec.name}`);
      }
      rec.save = body.save;
      rec.updated = Date.now();
      storeChar(key, rec);
      if (!acc.chars.includes(key)) { acc.chars.push(key); storeAccount(acc); }
      return reply(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      if (rec) { fs.rmSync(path.join(CHAR_DIR, key + '.json'), { force: true }); mirror(path.join(CHAR_DIR, key + '.json'), null); }
      acc.chars = acc.chars.filter((k) => k !== key);
      storeAccount(acc);
      return reply(res, 200, { ok: true });
    }
  }
  return reply(res, 404, { error: 'Not found.' });
}

const server = http.createServer((req, res) => { api(req, res).catch((e) => { log('api error', e); reply(res, 500, { error: 'Server error.' }); }); });

// ---------------------------------------------------------------- The world socket
/** id -> session */
const players = new Map();
let nextId = 1;

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });
server.listen(PORT, HOST, () => log(`Everrealm server listening on http://${HOST}:${PORT} and ws://${HOST}:${PORT}  (data in ${DATA})`));

function send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(msg, except) {
  const s = JSON.stringify(msg);
  for (const p of players.values()) if (p !== except && p.ws.readyState === 1) p.ws.send(s);
}
const social = socialInit({ players, send });
const guilds = guildsInit({ players, send, broadcast, readJson, writeJson, dataDir: DATA, mirrorDelete: (file) => mirror(file, null), log });
const pub = (p) => ({ id: p.id, name: p.name, look: p.look, x: p.x, y: p.y, z: p.z, yaw: p.yaw, anim: p.anim, held: p.held, mount: p.mount, guild: p.guildName ?? null });

wss.on('connection', (ws, req) => {
  let me = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (!msg || typeof msg.t !== 'string') return;

    if (!me) {
      if (msg.t !== 'hello') return;
      const name = typeof msg.name === 'string' ? msg.name.trim().slice(0, 20) : '';
      const key = keyFor(name);
      if (!key) { send(ws, { t: 'denied', reason: 'That name can\'t be used here.' }); ws.close(); return; }
      if ([...players.values()].some((p) => p.key === key)) { send(ws, { t: 'denied', reason: `${name} is already in the world.` }); ws.close(); return; }
      let rec = loadChar(key);
      const user = sessionUser(msg.session);
      if (user) {
        // Signed in: the character must be this account's, or a free name it now takes
        if (rec && rec.owner !== user) { send(ws, { t: 'denied', reason: `The name ${name} belongs to someone else on this server.` }); ws.close(); return; }
        if (!rec) {
          const acc = loadAccount(user);
          rec = { name, owner: user, created: Date.now(), save: null };
          storeChar(key, rec);
          if (acc && !acc.chars.includes(key)) { acc.chars.push(key); storeAccount(acc); }
        }
      } else {
        if (typeof msg.token !== 'string' || msg.token.length < 16) { send(ws, { t: 'denied', reason: 'That name can\'t be used here.' }); ws.close(); return; }
        if (rec && (rec.owner || rec.tokenHash !== hash(msg.token))) { send(ws, { t: 'denied', reason: `The name ${name} belongs to someone else on this server.` }); ws.close(); return; }
        if (!rec) { rec = { name, tokenHash: hash(msg.token), created: Date.now(), save: null }; storeChar(key, rec); log(`new character ${name}`); }
      }
      me = {
        id: nextId++, key, name: rec.name, ws, look: msg.look && typeof msg.look === 'object' ? msg.look : {},
        x: 0, y: 0, z: 0, yaw: 0, anim: 'idle', held: 'none', mount: null, lastChat: 0, dirty: true,
      };
      players.set(me.id, me);
      me.guildName = null;
      send(ws, { t: 'welcome', id: me.id, players: [...players.values()].filter((p) => p !== me).map(pub), save: rec.save ?? null });
      guilds.join(me);
      broadcast({ t: 'join', player: pub(me) }, me);
      broadcast({ t: 'sys', text: `${me.name} has entered the world.` }, me);
      log(`${me.name} joined${user ? ` (${user})` : ''} from ${req.socket.remoteAddress} (${players.size} online)`);
      return;
    }

    if (social.handle(me, msg) || guilds.handle(me, msg)) return;
    switch (msg.t) {
      case 'state': {
        const x = num(msg.x, WORLD[0], WORLD[1]), y = num(msg.y, -10, 200), z = num(msg.z, WORLD[0], WORLD[1]), yaw = num(msg.yaw, -100, 100);
        if (x === null || y === null || z === null || yaw === null) return;
        me.x = x; me.y = y; me.z = z; me.yaw = yaw;
        if (ANIMS.has(msg.anim)) me.anim = msg.anim;
        if (HELD.has(msg.held)) me.held = msg.held;
        // The horse being ridden, by its halter's id (only its look is shared)
        me.mount = typeof msg.mount === 'string' && /^halter_[a-z]{2,16}$/.test(msg.mount) ? msg.mount : null;
        me.dirty = true;
        break;
      }
      case 'look': {
        if (msg.look && typeof msg.look === 'object' && JSON.stringify(msg.look).length < 2000) { me.look = msg.look; broadcast({ t: 'look', id: me.id, look: me.look }, me); }
        break;
      }
      case 'chat': {
        const now = Date.now();
        const kind = msg.kind === 'emote' ? 'emote' : 'say';
        const text = typeof msg.text === 'string' ? msg.text.replace(/\s+/g, ' ').trim().slice(0, kind === 'emote' ? 120 : 200) : '';
        if (!text || now - me.lastChat < CHAT_GAP_MS) return;
        me.lastChat = now;
        // Everyone gets it, the speaker too (that's their confirmation); id puts the bubble over the right head
        broadcast({ t: 'chat', from: me.name, id: me.id, text, kind });
        break;
      }
      case 'evStart': {
        // A player is near an event: join the run that's on, or start one if it isn't cooling down
        if (typeof msg.id !== 'string' || !/^ev-[a-z]{2,20}$/.test(msg.id)) return;
        const now = Date.now();
        let ev = events.get(msg.id);
        if (ev && !ev.done) { send(ws, evState(ev)); return; }
        if (ev && now < ev.coolUntil) { send(ws, { t: 'evCool', id: ev.id, left: Math.round((ev.coolUntil - now) / 1000) }); return; }
        const waves = Array.isArray(msg.waves) ? msg.waves.slice(0, 6).map((n) => num(n, 1, 12)) : [];
        const time = num(msg.time, 30, 900), cooldown = num(msg.cooldown, 30, 3600);
        if (!waves.length || waves.includes(null) || time === null || cooldown === null) return;
        ev = { id: msg.id, waves, total: waves.reduce((a, b) => a + b, 0), killed: 0, endsAt: now + time * 1000, done: false, coolUntil: 0, cooldown, shares: new Map() };
        events.set(ev.id, ev);
        broadcast(evState(ev));
        break;
      }
      case 'evKill': {
        const ev = events.get(msg.id);
        if (!ev || ev.done) return;
        const now = Date.now();
        if (!me.killWindow || now - me.killWindow.at > 1000) me.killWindow = { at: now, n: 0 };
        if (++me.killWindow.n > 10) return;
        ev.killed++;
        ev.shares.set(me.name, (ev.shares.get(me.name) ?? 0) + 1);
        if (ev.killed >= ev.total) endEvent(ev, true); else broadcast(evState(ev));
        break;
      }
      case 'bossSync': {
        // A player has the boss in front of them: tell them where its health stands
        const b = bossFor(msg.id, msg.cycle, msg.max);
        if (b) send(ws, bossState(b));
        break;
      }
      case 'bossHit': {
        const b = bossFor(msg.id, msg.cycle, msg.max);
        const dmg = num(msg.dmg, 0, BOSS_HIT_MAX);
        if (!b || b.down || !dmg) return;
        const now = Date.now();
        if (!me.hitWindow || now - me.hitWindow.at > 1000) me.hitWindow = { at: now, n: 0 };
        if (++me.hitWindow.n > BOSS_HITS_PER_SEC) return;
        b.hp = Math.max(0, b.hp - Math.round(dmg));
        b.hitters.add(me.name);
        if (b.hp <= 0) {
          b.down = true;
          broadcast({ t: 'bossDown', id: b.id, cycle: b.cycle, by: [...b.hitters] });
          log(`${b.id} (cycle ${b.cycle}) brought down by ${[...b.hitters].join(', ')}`);
        } else broadcast(bossState(b));
        break;
      }
      case 'save': {
        if (raw.length > MAX_SAVE) { send(ws, { t: 'sys', text: 'The server refused your save: too large.' }); return; }
        const bad = validSave(msg.save, me.name);
        if (bad) { log(`rejected save from ${me.name}: ${bad}`); return; }
        const rec = loadChar(me.key);
        if (!rec) return;
        rec.save = msg.save;
        rec.updated = Date.now();
        storeChar(me.key, rec);
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!me) return;
    social.leave(me);
    guilds.leave(me);
    players.delete(me.id);
    broadcast({ t: 'leave', id: me.id });
    broadcast({ t: 'sys', text: `${me.name} has left.` });
    log(`${me.name} left (${players.size} online)`);
  });
});

// World bosses are shared: the server keeps each one's health for the cycle it's up in. Every hit
// is sent here, everyone is told the new health, and the boss falls when the server says so.
const bosses = new Map(); // "wb-id:cycle" -> { id, cycle, hp, max, down, hitters: Set<name>, at }
const BOSS_HIT_MAX = 600;     // no single blow does more than this
const BOSS_HITS_PER_SEC = 12;
function bossState(b) { return { t: 'boss', id: b.id, cycle: b.cycle, hp: b.hp, max: b.max, down: b.down }; }
function bossFor(id, cycle, max) {
  if (typeof id !== 'string' || !/^wb-[a-z]{2,20}$/.test(id) || !Number.isInteger(cycle) || cycle < 0) return null;
  const key = id + ':' + cycle;
  let b = bosses.get(key);
  if (!b) {
    const m = num(max, 500, 50000);
    if (m === null) return null;
    b = { id, cycle, hp: m, max: m, down: false, hitters: new Set(), at: Date.now() };
    bosses.set(key, b);
  }
  return b;
}
setInterval(() => { const old = Date.now() - 2 * 3600_000; for (const [k, b] of bosses) if (b.at < old) bosses.delete(k); }, 600_000);

// Dynamic events are shared too: one run of each at a time. The first player near it starts it;
// everyone's kills count toward its waves, the clock is the server's, and when it ends each player
// is told their share of the work (which sets their medal).
const events = new Map(); // id -> { id, waves, total, killed, endsAt, done, coolUntil, cooldown, shares: Map<name, kills> }
function waveOf(ev) { let n = 0; for (let i = 0; i < ev.waves.length; i++) { n += ev.waves[i]; if (ev.killed < n) return i; } return ev.waves.length - 1; }
function evState(ev) { return { t: 'ev', id: ev.id, killed: ev.killed, total: ev.total, wave: waveOf(ev), left: Math.max(0, Math.round((ev.endsAt - Date.now()) / 1000)) }; }
function endEvent(ev, ok) {
  ev.done = true;
  ev.coolUntil = Date.now() + (ok ? ev.cooldown : 60) * 1000;
  broadcast({ t: 'evDone', id: ev.id, ok, total: ev.total, shares: Object.fromEntries(ev.shares) });
}
setInterval(() => { const now = Date.now(); for (const ev of events.values()) if (!ev.done && now > ev.endsAt) endEvent(ev, false); }, 1000);

// Movement snapshots: only players who moved, to everyone else.
setInterval(() => {
  const moved = [...players.values()].filter((p) => p.dirty);
  if (!moved.length) return;
  for (const p of moved) p.dirty = false;
  for (const to of players.values()) {
    const rows = moved.filter((p) => p !== to).map((p) => [p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), p.anim, p.held, p.mount ?? 0]);
    if (rows.length) send(to.ws, { t: 'snap', p: rows });
  }
}, TICK_MS);

// Drop connections that stop answering.
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);
