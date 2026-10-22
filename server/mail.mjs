// The Charter Post's letters, on the world server. Anyone can write to any character on the realm,
// in the world or away from it: a subject, a letter, and up to six stacks and some marks sent with
// it (the browser takes the postage: a mark a letter and a mark a stack). A letter waits in its
// reader's box, read at any Charter Post box; what came with it stays in the letter until they take
// it out. A reader can send a letter back, things and all. Letters keep thirty days; anything still
// in one then goes back to its sender.
//
// (As with trades and the Exchange, the browser keeps the inventory: the post keeps the letters.)

import fs from 'node:fs';
import path from 'node:path';

const ITEM = /^[a-z0-9_]{2,64}$/;
const BOX_MAX = 60;           // letters a box holds
const STACKS = 6;             // stacks a letter carries
const SUBJECT = 60;
const BODY = 1200;
const KEEP_MS = 30 * 24 * 3600_000;
const PER_HOUR = 20;          // letters a character may post in an hour

export function mailInit(ctx) {
  const { players, send, readJson, writeJson, dataDir, keyFor, nameOf, log } = ctx;
  const DIR = path.join(dataDir, 'mail');
  fs.mkdirSync(DIR, { recursive: true });
  const fileOf = (key) => path.join(DIR, key + '.json');
  /** character key -> { next, letters } (read from disk the first time it's wanted) */
  const boxes = new Map();
  /** character key -> when they posted lately */
  const posted = new Map();
  const box = (key) => {
    let b = boxes.get(key);
    if (!b) { b = { next: 1, letters: [], ...(readJson(fileOf(key)) ?? {}) }; boxes.set(key, b); }
    return b;
  };
  const store = (key) => writeJson(fileOf(key), box(key));
  const here = (key) => [...players.values()].find((p) => p.key === key) ?? null;
  const sys = (p, text) => send(p.ws, { t: 'sys', text });
  const unread = (key) => box(key).letters.filter((l) => !l.read).length;
  const holds = (l) => l.items.length > 0 || l.marks > 0;
  const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
  const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max) : '');

  /** Put a letter in a box, and tell its reader if they're in the world. False if the box is full. */
  function deliver(key, letter) {
    const b = box(key);
    if (b.letters.length >= BOX_MAX) return false;
    letter.id = b.next++;
    b.letters.push(letter);
    store(key);
    const p = here(key);
    if (p) send(p.ws, { t: 'mailNew', letter, unread: unread(key) });
    return true;
  }
  /** A letter on its way home, with whatever was still in it. */
  function back(l, why) {
    return {
      from: 'The Charter Post', fromKey: null, toName: l.from, subject: ('Returned: ' + l.subject).slice(0, SUBJECT),
      body: `Your letter to ${l.toName} has come back to you. ${why}`, items: l.items, marks: l.marks, at: Date.now(), read: false, returned: true,
    };
  }
  /** Letters past thirty days go; anything still in one goes back to its sender. */
  function lapse(key) {
    const b = box(key), now = Date.now();
    const old = b.letters.filter((l) => now - l.at > KEEP_MS);
    if (!old.length) return;
    b.letters = b.letters.filter((l) => now - l.at <= KEEP_MS);
    store(key);
    for (const l of old) if (holds(l) && l.fromKey && !l.returned && !deliver(l.fromKey, back(l, 'It lay at the Post for thirty days with nobody to take it.'))) log(`mail: a returned letter for ${l.from} was lost (box full)`);
  }

  return {
    join(p) {
      lapse(p.key);
      const n = unread(p.key);
      if (n) send(p.ws, { t: 'mailUnread', n });
    },
    handle(p, msg) {
      switch (msg.t) {
        case 'mailBox':
          lapse(p.key);
          send(p.ws, { t: 'mailBox', letters: box(p.key).letters });
          return true;
        case 'mailSend': {
          const items = Array.isArray(msg.items) ? msg.items : [];
          const marks = int(msg.marks, 0, 1_000_000), postage = int(msg.postage, 0, 100) ?? 0;
          // Whatever went wrong, the browser gets back what it took out of the pack
          const refuse = (why) => send(p.ws, { t: 'mailRefused', items: items.filter((s) => s && ITEM.test(s.id) && int(s.n, 1, 999)), marks: marks ?? 0, postage, why });
          const to = text(msg.to, 20), key = to ? keyFor(to) : '';
          const name = key ? nameOf(key) : null;
          if (!name) { refuse(`Nobody called ${to || 'that'} is known to the Charter Post.`); return true; }
          if (key === p.key) { refuse('The Post won\'t carry a letter to yourself.'); return true; }
          if (marks === null || items.length > STACKS || !items.every((s) => s && typeof s.id === 'string' && ITEM.test(s.id) && int(s.n, 1, 999))) { refuse('The clerk can\'t make sense of that letter.'); return true; }
          const now = Date.now(), times = (posted.get(p.key) ?? []).filter((t) => now - t < 3600_000);
          if (times.length >= PER_HOUR) { refuse('You\'ve posted a great many letters this hour. The clerk asks you to wait a while.'); return true; }
          const letter = {
            from: p.name, fromKey: p.key, toName: name, subject: text(msg.subject, SUBJECT) || '(No subject)', body: text(msg.body, BODY),
            items: items.map((s) => ({ id: s.id, n: s.n })), marks, at: now, read: false,
          };
          if (!deliver(key, letter)) { refuse(`${name}'s box at the Post is full. They'll need to clear it before anything more will fit.`); return true; }
          times.push(now);
          posted.set(p.key, times);
          send(p.ws, { t: 'mailSent', to: name, items: letter.items.length, marks });
          log(`mail: ${p.name} to ${name}${holds(letter) ? ` (${letter.items.length} stack(s), ${marks} marks)` : ''}`);
          return true;
        }
        case 'mailRead': {
          const l = box(p.key).letters.find((x) => x.id === msg.id);
          if (l && !l.read) { l.read = true; store(p.key); }
          send(p.ws, { t: 'mailUnread', n: unread(p.key) });
          return true;
        }
        case 'mailTake': {
          const l = box(p.key).letters.find((x) => x.id === msg.id);
          if (!l || !holds(l)) { send(p.ws, { t: 'mailTaken', id: msg.id, items: [], marks: 0 }); return true; }
          const items = l.items, marks = l.marks;
          l.items = [];
          l.marks = 0;
          l.read = true;
          store(p.key);
          send(p.ws, { t: 'mailTaken', id: l.id, items, marks });
          return true;
        }
        case 'mailDelete': {
          const b = box(p.key), l = b.letters.find((x) => x.id === msg.id);
          if (!l) { send(p.ws, { t: 'mailGone', id: msg.id }); return true; }
          if (holds(l)) { sys(p, 'Take out what came with it first, or send it back.'); return true; }
          b.letters = b.letters.filter((x) => x !== l);
          store(p.key);
          send(p.ws, { t: 'mailGone', id: l.id, unread: unread(p.key) });
          return true;
        }
        case 'mailReturn': {
          const b = box(p.key), l = b.letters.find((x) => x.id === msg.id);
          if (!l) { send(p.ws, { t: 'mailGone', id: msg.id }); return true; }
          if (!l.fromKey || l.returned) { sys(p, 'That letter has nobody to go back to.'); return true; }
          if (!deliver(l.fromKey, back(l, `${p.name} sent it back.`))) { sys(p, `${l.from}'s box is full, so the Post can't send it back yet.`); return true; }
          b.letters = b.letters.filter((x) => x !== l);
          store(p.key);
          send(p.ws, { t: 'mailGone', id: l.id, unread: unread(p.key) });
          sys(p, `The Post will take it back to ${l.from}.`);
          return true;
        }
      }
      return false;
    },
  };
}
