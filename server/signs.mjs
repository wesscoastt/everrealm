// Message posts, on the world server: a few words a player leaves standing at a place for everyone who
// comes after (owner 2026-11-04, "sign posts work like Where Winds Meet, leaving text places to help").
//
// Posts weather (owner 2026-11-13: "make the posts you leave work like where winds meet where you use wood or whatever to
// make it last longer so they arent just littered forever"): a post stands three days; each player who finds it
// helpful adds half a day, and anyone can spend logs on it for three more, up to a month ahead at most. When its time
// is up it comes down.
//
// A post is kept in its land, with who left it (by player id), how many found it helpful, and who
// has reported it. Everyone in that land is sent the posts when they come in and each new one as it goes
// up. What can go on one is checked here, not in the browser: a short line, no links, nothing hateful or
// foul, not a wall of one letter. Each player keeps at most POSTS_EACH posts (the oldest comes down for a
// new one), and puts up one a minute at most. Three players reporting a post takes it down until the
// realm's keeper has looked; the keeper can list them, put one back or take one away for good.

import path from 'node:path';

const MAX_LEN = 140, MIN_LEN = 3, POSTS_EACH = 8, GAP_MS = 60_000, VOTE_GAP_MS = 1500, REPORTS_TO_HIDE = 3, CLOSE = 2.5;
const SEND_MAX = 800;
const DAY = 86_400_000, LIFE_MS = 3 * DAY, UP_MS = DAY / 2, MEND_MS = 3 * DAY, AHEAD_MAX = 30 * DAY, MEND_GAP_MS = 1500;

// Words a post can't carry, matched on the letters alone (spaces, dots and look-alike digits taken out), so
// "s.l.u.r" and "5lur" are caught too. Kept short and plain: slurs and the worst of the swearing.
const BLOCKED = ['nigger', 'nigga', 'faggot', 'fagot', 'retard', 'tranny', 'chink', 'spic', 'kike', 'wetback', 'raghead', 'coon', 'paki', 'gook', 'dyke',
  'cunt', 'fuck', 'shit', 'bitch', 'whore', 'slut', 'cock', 'dick', 'pussy', 'rape', 'rapist', 'nazi', 'hitler', 'kys', 'killyourself', 'porn', 'cum'];
// (short ones only count as a whole word: "cocky", "dickens", "scum" and "Hitchcock" are fine)
const WHOLE = new Set(['chink', 'coon', 'paki', 'gook', 'dyke', 'cock', 'dick', 'cum', 'kys', 'spic', 'rape', 'nazi', 'slut', 'shit']);
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };
const letters = (s) => s.toLowerCase().replace(/[0-9@$!|]/g, (c) => LEET[c] ?? c).normalize('NFKD').replace(/[^a-z\s]/g, '');

/** Why a line can't go on a post, or null if it can (and the line, tidied). */
export function checkPost(raw) {
  if (typeof raw !== 'string') return { why: 'Write something first.' };
  // one line, ordinary spacing, no control characters or the invisible ones
  const text = raw.replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯﻿]/g, '').replace(/\s+/g, ' ').trim();
  if (text.length < MIN_LEN) return { why: 'Write a few more words.' };
  if (text.length > MAX_LEN) return { why: `A post holds ${MAX_LEN} letters at most.` };
  if (/(https?:|www\.|\.(com|net|org|gg|io|ru|xyz|ly)\b|discord|@[a-z0-9_]{3,})/i.test(text)) return { why: 'No links or handles on a post: say it in your own words.' };
  if (/(.)\1{5,}/.test(text) || !/[a-z]{2}/i.test(text)) return { why: 'That reads like nothing. Say something someone could use.' };
  if (text.replace(/[^A-Z]/g, '').length > 12 && text.replace(/[^A-Z]/g, '').length > text.replace(/[^a-z]/g, '').length * 2) return { why: 'Not all in capitals, please.' };
  const flat = letters(text), squashed = flat.replace(/\s/g, ''), words = new Set(flat.split(/\s+/));
  for (const w of BLOCKED) if (WHOLE.has(w) ? words.has(w) || words.has(w + 's') : squashed.includes(w)) return { why: 'That can\'t go on a post.' };
  return { text };
}

export function signsInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, log } = ctx;
  const FILE = path.join(dataDir, 'signs.json');
  const book = readJson(FILE) ?? { next: 1, list: [] };
  if (!Array.isArray(book.list)) book.list = [];
  // (posts from before they weathered get a week's grace from today)
  for (const s of book.list) if (!Number.isFinite(s.until)) s.until = Date.now() + 7 * DAY;
  // (written at once: posts and votes come seldom, and a restart must never lose one)
  const save = () => writeJson(FILE, book);
  const pubPost = (s, me) => ({ id: s.id, x: s.x, y: s.y, z: s.z, yaw: s.yaw, text: s.text, by: s.by, at: s.at, until: s.until, up: s.up.length, mine: !!me && s.pid === me.pid, voted: !!me && s.up.includes(me.pid) });
  const toLand = (land, msg) => { for (const p of players.values()) if (p.land === land && p.ws.readyState === 1) send(p.ws, msg); };
  const shown = (land) => book.list.filter((s) => s.land === land && !s.hidden);
  /** Posts whose time is up come down. */
  const weather = () => {
    const now = Date.now(), gone = book.list.filter((s) => s.until < now);
    if (!gone.length) return;
    book.list = book.list.filter((s) => s.until >= now);
    for (const s of gone) if (!s.hidden) toLand(s.land, { t: 'postGone', id: s.id });
    save();
    log(`posts: ${gone.length} weathered away`);
  };
  setTimeout(weather, 2000);
  setInterval(weather, 10 * 60_000);
  const keep = (s, ms) => { const now = Date.now(); s.until = Math.min(Math.max(s.until ?? now, now) + ms, now + AHEAD_MAX); };

  return {
    /** Everything standing in their land, the most helpful first if there are too many to send. */
    join(me) {
      const list = shown(me.land);
      const pick = list.length > SEND_MAX ? [...list].sort((a, b) => b.up.length - a.up.length || b.at - a.at).slice(0, SEND_MAX) : list;
      send(me.ws, { t: 'posts', list: pick.map((s) => pubPost(s, me)) });
    },
    handle(me, msg) {
      switch (msg.t) {
        case 'postPut': {
          const now = Date.now();
          if (!me.pid) return true;
          if (now - (me.lastPost ?? 0) < GAP_MS) { send(me.ws, { t: 'postNo', why: 'You put one up a moment ago. Give it a minute.' }); return true; }
          const ok = checkPost(msg.text);
          if (!ok.text) { send(me.ws, { t: 'postNo', why: ok.why }); return true; }
          const [x, y, z, yaw] = [msg.x, msg.y, msg.z, msg.yaw].map(Number);
          if (![x, y, z, yaw].every(Number.isFinite) || Math.hypot(x - me.x, z - me.z) > 4 || Math.abs(y - me.y) > 3) return true;
          if (shown(me.land).some((s) => Math.hypot(s.x - x, s.z - z) < CLOSE && Math.abs(s.y - y) < 2)) { send(me.ws, { t: 'postNo', why: 'There\'s a post here already. Stand a few steps off.' }); return true; }
          me.lastPost = now;
          // their oldest comes down if they've too many up
          const theirs = book.list.filter((s) => s.pid === me.pid).sort((a, b) => a.at - b.at);
          for (const old of theirs.slice(0, Math.max(0, theirs.length - POSTS_EACH + 1))) {
            book.list = book.list.filter((s) => s !== old);
            toLand(old.land, { t: 'postGone', id: old.id });
          }
          const s = { id: book.next++, land: me.land, x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), yaw: +yaw.toFixed(2), text: ok.text, by: me.name, pid: me.pid, at: now, until: now + LIFE_MS, up: [], reports: [], hidden: false };
          book.list.push(s);
          save();
          for (const p of players.values()) if (p.land === s.land && p.ws.readyState === 1) send(p.ws, { t: 'post', post: pubPost(s, p) });
          log(`post ${s.id} by ${me.name} (${me.pid}) at ${s.x.toFixed(0)},${s.z.toFixed(0)}: ${s.text}`);
          return true;
        }
        case 'postUp': {
          const s = book.list.find((p) => p.id === msg.id && !p.hidden);
          const now = Date.now();
          if (!s || !me.pid || s.pid === me.pid || s.up.includes(me.pid) || now - (me.lastVote ?? 0) < VOTE_GAP_MS) return true;
          me.lastVote = now;
          s.up.push(me.pid);
          keep(s, UP_MS);
          save();
          toLand(s.land, { t: 'postUp', id: s.id, up: s.up.length, until: s.until });
          // the one who left it hears, if they're about: a kind word goes both ways
          const author = [...players.values()].find((p) => p.pid === s.pid);
          if (author) send(author.ws, { t: 'sys', text: `${me.name} found your post helpful ("${s.text.length > 40 ? s.text.slice(0, 40) + '…' : s.text}"). ${s.up.length} have now.` });
          return true;
        }
        case 'postMend': {
          // logs spent on a post (the browser takes them from the pack): three more days, a month ahead at most
          const s = book.list.find((q) => q.id === msg.id && !q.hidden);
          const now = Date.now();
          if (!s || !me.pid || now - (me.lastMend ?? 0) < MEND_GAP_MS || Math.hypot(s.x - me.x, s.z - me.z) > 8) return true;
          me.lastMend = now;
          keep(s, MEND_MS);
          save();
          toLand(s.land, { t: 'postTime', id: s.id, until: s.until });
          const author = [...players.values()].find((q) => q.pid === s.pid);
          if (author && author !== me) send(author.ws, { t: 'sys', text: `${me.name} mended your post ("${s.text.length > 40 ? s.text.slice(0, 40) + '…' : s.text}"). It will stand a while longer.` });
          return true;
        }
        case 'postReport': {
          const s = book.list.find((p) => p.id === msg.id && !p.hidden);
          if (!s || !me.pid || s.pid === me.pid || s.reports.some((r) => r.pid === me.pid)) return true;
          const why = typeof msg.why === 'string' ? msg.why.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
          s.reports.push({ pid: me.pid, by: me.name, why, at: Date.now() });
          if (s.reports.length >= REPORTS_TO_HIDE) { s.hidden = true; toLand(s.land, { t: 'postGone', id: s.id }); log(`post ${s.id} by ${s.by} taken down on ${s.reports.length} reports`); }
          save();
          send(me.ws, { t: 'sys', text: 'Thank you. The realm\'s keeper will read it, and enough reports take a post down at once.' });
          return true;
        }
        case 'postRemove': {
          // your own, or any of them for the keeper
          const s = book.list.find((p) => p.id === msg.id);
          if (!s || !(s.pid === me.pid || me.dev)) return true;
          book.list = book.list.filter((p) => p !== s);
          save();
          toLand(s.land, { t: 'postGone', id: s.id });
          if (me.dev && s.pid !== me.pid) log(`${me.name} removed post ${s.id} by ${s.by}: ${s.text}`);
          return true;
        }
        case 'postReview': {
          // the keeper: posts that have been reported, and putting one back
          if (!me.dev) return true;
          if (Number.isInteger(msg.restore)) {
            const s = book.list.find((p) => p.id === msg.restore);
            if (s) { s.hidden = false; s.reports = []; save(); for (const p of players.values()) if (p.land === s.land && p.ws.readyState === 1) send(p.ws, { t: 'post', post: pubPost(s, p) }); send(me.ws, { t: 'sys', text: `Post ${s.id} is back up.` }); }
            return true;
          }
          const list = book.list.filter((s) => s.reports.length).sort((a, b) => b.reports.length - a.reports.length).slice(0, 12);
          if (!list.length) { send(me.ws, { t: 'sys', text: 'No posts have been reported.' }); return true; }
          for (const s of list) send(me.ws, { t: 'sys', text: `Post ${s.id}${s.hidden ? ' (down)' : ''} by ${s.by} [${s.pid}], ${s.reports.length} report(s): "${s.text}". ${s.reports.map((r) => `${r.by}: ${r.why || 'no reason given'}`).join('; ')}` });
          send(me.ws, { t: 'sys', text: '/postdel <id> takes one away for good; /postback <id> puts one back up.' });
          return true;
        }
      }
      return false;
    },
  };
}
