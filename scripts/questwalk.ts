// The quest walker: plays every quest headlessly, down every branch, and reports what it finds.
//
//   npm run quests            walk everything
//   npm run quests -- <id>    walk one quest (prints every ending's path)
//
// It drives the same data the game uses (quests, dialogue trees, world things, quest creatures)
// against a mock of GameApi, so a quest that passes here behaves the same in the game, as far as
// its data goes. What it can do as a player: talk to people (every dialogue path), read and search
// world things, kill quest creatures, and gather/buy/craft the items a quest's walk hints name.
// Engine-driven events (a casting finishing, the ground lifting) come from walk.auto.
//
// Errors fail the run: a quest that can't start or can't finish, a dead end, a broken dialogue
// link, an unknown item, an objective marker that points nowhere, an item no in-game source can
// provide, writing that breaks the style guide, and gear off the horizontal budget (GEAR_BUDGET). Warnings are reported but don't fail it.

import fs from 'node:fs';
import { WEIGHTS } from '../src/data/armour';
import { DIALOGUE, READABLES } from '../src/data/dialogue';
import { ENEMIES, FISH_TABLE, ORE_INFO, RECIPES, SHOP_STOCK, TREE_INFO } from '../src/data/gameplay';
import { GEAR_BUDGET, gearPoints, ITEMS } from '../src/data/items';
import { NPCS } from '../src/data/npcs';
import { QUEST_SPAWNS, WORLD_THINGS } from '../src/data/places_regional';
import { QUESTS, type QuestDef } from '../src/data/quests';
import { SHOPS } from '../src/data/shops';
import { BOARDS } from '../src/data/content';
import { offLand } from '../src/world/land';
import type { DNode, GameApi } from '../src/game/api';

// The walker walks both lands' quests at once: put back the people, things and creatures placed in the other land
NPCS.push(...offLand(NPCS));
WORLD_THINGS.push(...offLand(WORLD_THINGS));
QUEST_SPAWNS.push(...offLand(QUEST_SPAWNS));

// ---------------------------------------------------------------- State and the mock game

interface State { quests: Record<string, string>; flags: Record<string, unknown>; inv: Record<string, number>; marks: number }
const clone = (s: State): State => ({ quests: { ...s.quests }, flags: { ...s.flags }, inv: { ...s.inv }, marks: s.marks });
const hash = (s: State) => JSON.stringify([s.quests, Object.keys(s.flags).sort().map((k) => [k, s.flags[k]]), Object.keys(s.inv).sort().map((k) => [k, s.inv[k]])]);

const errors = new Map<string, string>();
const warnings = new Map<string, string>();
const err = (key: string, msg: string) => { if (!errors.has(key)) errors.set(key, msg); };
const warn = (key: string, msg: string) => { if (!warnings.has(key)) warnings.set(key, msg); };
const texts = new Map<string, string>(); // where -> rendered text, for the style pass
const visited = new Set<string>();       // "tree.node"
let walkVisit: Set<string> | null = null; // nodes passed through during the current quest's walk
const givenByContent = new Set<string>();

class Mock implements GameApi {
  /** Flags read, when someone wants to know (endings are told apart by what the finished journal reads). */
  reads?: Set<string>;
  constructor(public s: State, public where = '') {}
  flag(k: string) { this.reads?.add(k); return this.s.flags[k]; }
  setFlag(k: string, v: unknown = true) { this.s.flags[k] = v; }
  stage(q: string) { return this.s.quests[q]; }
  setStage(q: string, st: string) {
    if (!QUESTS[q]) err('stage:' + q, `${this.where}: setStage on unknown quest "${q}"`);
    if (this.s.quests[q] === st) return;
    this.s.quests[q] = st;
    const def = QUESTS[q];
    if (st === 'done' && def?.next && !this.s.quests[def.next[0]]) this.s.quests[def.next[0]] = def.next[1];
  }
  private item(i: string) { if (!ITEMS[i]) err('item:' + i, `${this.where}: unknown item "${i}"`); }
  count(i: string) { this.item(i); return this.s.inv[i] ?? 0; }
  has(i: string, n = 1) { return this.count(i) >= n; }
  give(i: string, n = 1) { this.item(i); this.s.inv[i] = (this.s.inv[i] ?? 0) + n; givenByContent.add(i); return true; }
  take(i: string, n = 1) { this.item(i); if ((this.s.inv[i] ?? 0) < n) return false; this.s.inv[i] -= n; if (!this.s.inv[i]) delete this.s.inv[i]; return true; }
  get marks() { return this.s.marks; }
  addMarks(n: number) { this.s.marks += n; }
  level() { return 99; }
  hasTool(skill: string) { return Object.keys(this.s.inv).some((i) => ITEMS[i]?.tool?.skill === skill); }
  toast(t: string) { texts.set(`${this.where} (toast)`, t); }
  openShop(id?: string) { if (id && !SHOPS[id]) err('shop:' + id, `${this.where}: opens unknown shop "${id}"`); }
  openCrafting() {}
  openTravel() {}
  crossLand() {}
  duel() {}
  openBoard(id: string) { if (!BOARDS.some((b) => b.id === id)) err('board:' + id, `${this.where}: opens unknown board "${id}"`); }
  startCasting() { this.s.flags.__casting = true; }
  ride() {}
  quake() {}
  buyHome() { this.s.flags.home = []; }
  arrangeHome() {}
  lotAction() {}
  openBank() {}
  openExchange() {}
  openMail() {}
  playerName = 'Tester';
}

/** Automatic stage changes, as the game's per-frame quest update makes them. */
function settle(m: Mock) {
  for (let i = 0; i < 20; i++) {
    let changed = false;
    for (const [id, st] of Object.entries(m.s.quests)) {
      const nxt = QUESTS[id]?.advance?.(m, st);
      if (nxt && nxt !== st) { m.setStage(id, nxt); changed = true; }
    }
    if (!changed) return;
  }
  err('settle', `${m.where}: quest advance keeps changing stage (loop)`);
}

const textOf = (t: string | ((g: GameApi) => string), m: Mock) => (typeof t === 'function' ? t(m) : t);

// ---------------------------------------------------------------- Actions a player can take

interface Step { state: State; label: string }

/** Every way a conversation with `id` can go from this state. */
function converse(s: State, id: string): Step[] {
  const tree = DIALOGUE[id];
  if (!tree) return [];
  const out: Step[] = [];
  const m0 = new Mock(clone(s), `talk ${id}`);
  let start: string;
  try { start = tree.start(m0); } catch (e) { err('start:' + id, `${id}: start() throws: ${(e as Error).message}`); return []; }
  const seenHere = new Set<string>();
  const dfs = (st: State, nodeId: string, path: string[], steps: number) => {
    const key = nodeId + '|' + hash(st);
    if (seenHere.has(key) || steps > 120) return;
    seenHere.add(key);
    const node: DNode | undefined = tree.nodes[nodeId];
    if (!node) { err(`node:${id}.${nodeId}`, `${id}: link to missing node "${nodeId}" (after: ${path.slice(-1)[0] ?? 'start'})`); return; }
    visited.add(`${id}.${nodeId}`);
    walkVisit?.add(`${id}.${nodeId}`);
    const m = new Mock(clone(st), `${id}.${nodeId}`);
    try {
      texts.set(`${id}.${nodeId}`, textOf(node.text, m));
      node.effect?.(m);
      settle(m);
    } catch (e) { err(`run:${id}.${nodeId}`, `${id}.${nodeId}: throws: ${(e as Error).message}`); return; }
    const opts = (node.options ?? []).filter((o) => { try { return !o.cond || o.cond(m); } catch (e) { err(`cond:${id}.${nodeId}`, `${id}.${nodeId}: option condition throws: ${(e as Error).message}`); return false; } });
    if (!opts.length) {
      if (node.next) dfs(m.s, node.next, path, steps + 1);
      else out.push({ state: m.s, label: `talk ${id}${path.length ? ': ' + path.join(' > ') : ''}` });
      return;
    }
    for (const o of opts) {
      const m2 = new Mock(clone(m.s), `${id}.${nodeId} option`);
      const label = textOf(o.text, m2);
      texts.set(`${id}.${nodeId} [${label.slice(0, 24)}]`, label);
      try { o.effect?.(m2); settle(m2); } catch (e) { err(`opt:${id}.${nodeId}`, `${id}.${nodeId}: option "${label}" throws: ${(e as Error).message}`); continue; }
      if (o.next) dfs(m2.s, o.next, [...path, label], steps + 1);
      else out.push({ state: m2.s, label: `talk ${id}: ${[...path, label].join(' > ')}` });
    }
  };
  dfs(m0.s, start, [], 0);
  return out;
}

/** Hollindale's authored interactables, by kind, as Game.useThing handles them. */
const AUTHORED = ['notice', 'minenotice', 'gauge', 'bellframe', 'ledger', 'chest'];
function useAuthored(s: State, kind: string): Step[] {
  const m = new Mock(clone(s), `use ${kind}`);
  const board = BOARDS.find((b) => b.interactable === kind);
  if (board) return converse(s, 'board:' + board.id).map((x) => ({ ...x, label: `read the ${board.name} board > ${x.label}` }));
  if (kind === 'chest') {
    if (m.flag('lanternOpened')) return [];
    m.setFlag('lanternOpened'); m.give('wren_whistle'); m.addMarks(12);
  } else {
    const r = READABLES[kind];
    if (!r) return [];
    texts.set(`readable ${kind}`, textOf(r.body, m));
    r.effect?.(m);
  }
  settle(m);
  return [{ state: m.s, label: `use ${kind}` }];
}

function useThings(s: State): Step[] {
  const out: Step[] = [];
  for (const wt of WORLD_THINGS) {
    const m = new Mock(clone(s), `thing ${wt.id}`);
    try { if (wt.when && !wt.when(m)) continue; } catch (e) { err('when:' + wt.id, `${wt.id}: when() throws: ${(e as Error).message}`); continue; }
    if (wt.id.startsWith('post:')) continue; // travel
    if (wt.id.startsWith('board:')) { out.push(...converse(s, wt.id).map((x) => ({ ...x, label: `read ${wt.id} > ${x.label}` }))); continue; }
    if (wt.read) {
      const r = READABLES[wt.read];
      if (!r) { err('read:' + wt.read, `${wt.id}: reads missing readable "${wt.read}"`); continue; }
      texts.set(`readable ${wt.read}`, textOf(r.body, m));
      r.effect?.(m);
    } else wt.use?.(m);
    settle(m);
    out.push({ state: m.s, label: `${wt.read ? 'read' : 'use'} ${wt.id}` });
  }
  for (const k of AUTHORED) out.push(...useAuthored(s, k));
  return out;
}

function kill(s: State): Step[] {
  const out: Step[] = [];
  for (const qs of QUEST_SPAWNS) {
    const m = new Mock(clone(s), `spawn ${qs.tag}`);
    if (!qs.when(m)) continue;
    const left = qs.at.length - Number(m.flag('kills:' + qs.tag) ?? 0);
    if (left <= 0) continue;
    m.setFlag('kills:' + qs.tag, qs.at.length);
    m.setFlag('killed:' + qs.type, Number(m.flag('killed:' + qs.type) ?? 0) + left);
    settle(m);
    out.push({ state: m.s, label: `kill ${left} ${ENEMIES[qs.type]?.name ?? qs.type} (${qs.tag})` });
  }
  return out;
}

/** Everything that can provide an item without a quest giving it. */
const SOURCES = new Map<string, string>();
for (const o of Object.values(ORE_INFO)) SOURCES.set(o.item, 'mining');
for (const t of Object.values(TREE_INFO)) SOURCES.set(t.item, 'woodcutting');
for (const list of Object.values(FISH_TABLE)) for (const f of list) SOURCES.set(f.item, 'fishing');
for (const r of RECIPES) SOURCES.set(r.output, 'crafting');
for (const st of SHOP_STOCK) SOURCES.set(st.item, 'Tamsin');
for (const sh of Object.values(SHOPS)) for (const st of sh.stock) SOURCES.set(st.item, `shop ${sh.id}`);
for (const e of Object.values(ENEMIES)) for (const l of e.loot) SOURCES.set(l.item, `loot from ${e.name}`);

function hinted(s: State, def: QuestDef): Step[] {
  const out: Step[] = [];
  const st = s.quests[def.id];
  if (!st) return out;
  for (const [item, n] of def.walk?.obtain?.[st] ?? []) {
    if (!SOURCES.has(item)) err(`src:${def.id}:${item}`, `${def.id}: obtains "${item}" at "${st}", but nothing in the game sells, drops, grows or makes it`);
    const m = new Mock(clone(s), `${def.id} obtain`);
    if (m.count(item) >= n) continue;
    m.give(item, n - m.count(item));
    settle(m);
    out.push({ state: m.s, label: `get ${n} ${ITEMS[item]?.name ?? item} (${SOURCES.get(item) ?? '?'})` });
  }
  for (const [type, n] of def.walk?.kill?.[st] ?? []) {
    if (!ENEMIES[type as keyof typeof ENEMIES]) err(`kill:${def.id}:${type}`, `${def.id}: kills unknown creature type "${type}"`);
    const m = new Mock(clone(s), `${def.id} kill`);
    const have = Number(m.flag('killed:' + type) ?? 0);
    if (have >= n) continue;
    m.setFlag('killed:' + type, n);
    settle(m);
    out.push({ state: m.s, label: `kill ${n - have} ${ENEMIES[type as keyof typeof ENEMIES]?.name ?? type}` });
  }
  const auto = def.walk?.auto?.[st];
  if (auto) { const m = new Mock(clone(s), `${def.id} auto`); m.setStage(def.id, auto); settle(m); out.push({ state: m.s, label: `(the game moves ${def.id} to ${auto})` }); }
  return out;
}

/** People worth talking to for this quest at this state. */
function castFor(s: State, def: QuestDef, sticky: Set<string>): string[] {
  const m = new Mock(clone(s), `${def.id} cast`);
  const st = s.quests[def.id];
  // Anyone the quest has involved stays worth talking to (their waiting lines, their reactions).
  const ids = sticky;
  for (const c of def.walk?.cast ?? []) ids.add(c);
  try { for (const k of Object.keys(def.marks?.(m, st) ?? {})) ids.add(k); } catch (e) { err('marks:' + def.id, `${def.id}: marks() throws: ${(e as Error).message}`); }
  if (st) try { for (const o of def.objectives(m, st)) if (o.marker && DIALOGUE[o.marker]) ids.add(o.marker); } catch (e) { err('obj:' + def.id, `${def.id}: objectives() throws: ${(e as Error).message}`); }
  for (const b of BOARDS) if (b.postings.some((p) => p.quest === def.id)) ids.add('board:' + b.id);
  return [...ids].filter((id) => DIALOGUE[id]);
}

// ---------------------------------------------------------------- Walking one quest

const STRUCTURE_KEYS = (() => {
  const src = fs.readFileSync('src/world/structures.ts', 'utf8');
  const keys = new Set<string>();
  for (const mm of src.matchAll(/poi\.(\w+)\s*=/g)) keys.add(mm[1]);
  for (const mm of src.matchAll(/id: '(\w+)'/g)) keys.add(mm[1]);
  for (const mm of src.matchAll(/kind: '(\w+)'/g)) keys.add(mm[1]);
  return keys;
})();
const markerOk = (k: string) => k.startsWith('ore:') || k.startsWith('tree:') || NPCS.some((n) => n.id === k) || WORLD_THINGS.some((w) => w.id === k) || STRUCTURE_KEYS.has(k) || BOARDS.some((b) => 'board:' + b.id === k);

interface Ending { signature: string; path: string[]; notes: string }
interface Line { tree: string; node: string; order: number; speaker: string; who: string; text: string; options: string[] }
interface QuestReport {
  id: string; name: string; region?: string; depth?: string; story: boolean; states: number; started: boolean;
  endings: Ending[]; deadEnds: { stage: string; path: string[] }[]; stages: string[];
  /** What the journal says at each stage, in the order a player first reaches them. */
  journal: { stage: string; notes: string; objectives: string[] }[];
  /** Conversation lines a player passes through in this quest. */
  lines: Line[];
  /** Who offers it (a "!" before it starts, or a notice board), and what it leads on to. */
  givers: string[];
  next?: string;
  follows?: string;
}

function fresh(def: QuestDef): State {
  const s: State = { quests: { ...(def.walk?.from?.quests ?? {}) }, flags: { ...(def.walk?.from?.flags ?? {}) }, inv: {}, marks: 500 };
  for (const [i, n] of def.walk?.from?.items ?? []) s.inv[i] = n;
  return s;
}

function walk(def: QuestDef, limit = 15000): QuestReport {
  const s0 = fresh(def);
  const src = def.notes.toString() + (def.objectives.toString());
  const relevant = (k: string) => src.includes(`'${k}'`) || src.includes(`"${k}"`);
  const rep: QuestReport = { id: def.id, name: def.name, region: def.region, depth: def.depth, story: !!def.story, states: 0, started: !!s0.quests[def.id], endings: [], deadEnds: [], stages: [], journal: [], lines: [], givers: [], next: def.next?.[0], follows: Object.values(QUESTS).find((q) => q.next?.[0] === def.id)?.id };
  try {
    const gm = new Mock(clone(s0), `${def.id} givers`);
    for (const [k, v] of Object.entries(def.marks?.(gm, undefined) ?? {})) if (v === '!') rep.givers.push(NPCS.find((n) => n.id === k)?.name ?? k);
  } catch { /* marks may need state */ }
  for (const b of BOARDS) if (b.postings.some((p) => p.quest === def.id)) rep.givers.push(`the ${b.name} notice board`);
  walkVisit = new Set();
  const endNotes = new Map<string, string>();
  const stages = new Set<string>();
  const endings = new Map<string, string[]>();
  const sticky = new Set<string>();
  const seen = new Set<string>([hash(s0)]);
  const queue: { s: State; path: string[] }[] = [{ s: s0, path: [] }];
  while (queue.length && seen.size < limit) {
    const { s, path } = queue.shift()!;
    const st = s.quests[def.id];
    if (st) { rep.started = true; stages.add(st); }
    // Check what the journal shows at this stage
    if (st) {
      const m = new Mock(clone(s), `${def.id} journal`);
      try {
        const notes = def.notes(m, st);
        texts.set(`${def.id} notes @${st}`, notes);
        if (st !== 'done' && !rep.journal.some((j) => j.stage === st)) rep.journal.push({ stage: st, notes, objectives: def.objectives(m, st).map((o) => o.text) });
        for (const o of def.objectives(m, st)) {
          texts.set(`${def.id} objective @${st}: ${o.text.slice(0, 30)}`, o.text);
          if (o.marker && !markerOk(o.marker)) err(`marker:${def.id}:${o.marker}`, `${def.id} @${st}: objective marker "${o.marker}" points at nothing`);
        }
      } catch (e) { err(`journal:${def.id}`, `${def.id} @${st}: journal throws: ${(e as Error).message}`); }
    }
    if (st === 'done') {
      // An ending is what the finished journal entry depends on.
      const m = new Mock(clone(s), `${def.id} ending`);
      m.reads = new Set();
      def.notes(m, 'done');
      const sig = [...m.reads].sort().map((k) => `${k}=${String(s.flags[k])}`).join(', ') || '(single ending)';
      if (!endings.has(sig)) {
        endings.set(sig, path);
        endNotes.set(sig, def.notes(new Mock(clone(s), `${def.id} ending`), 'done'));
        // Hear what everyone involved says afterwards (only to visit those lines).
        for (const id of Object.keys(DIALOGUE)) converse(s, id);
      }
      continue;
    }
    const steps: Step[] = [];
    for (const id of castFor(s, def, sticky)) steps.push(...converse(s, id));
    steps.push(...useThings(s), ...kill(s), ...hinted(s, def));
    let moved = false;
    for (const x of steps) {
      const h = hash(x.state);
      if (h === hash(s)) continue;
      // Stay on this quest: ignore actions that start or move other quests (they get their own walk).
      if (Object.keys({ ...s.quests, ...x.state.quests }).some((q) => q !== def.id && x.state.quests[q] !== s.quests[q] && !(def.next && q === def.next[0]))) continue;
      moved = true;
      if (seen.has(h)) continue;
      seen.add(h);
      queue.push({ s: x.state, path: [...path, x.label] });
    }
    if (!moved && st) rep.deadEnds.push({ stage: st, path });
  }
  rep.states = seen.size;
  rep.stages = [...stages];
  rep.endings = [...endings].map(([signature, path]) => ({ signature, path, notes: endNotes.get(signature) ?? '' }));
  // The conversation lines this quest walks through, in tree order
  const cast = new Set([...sticky, ...BOARDS.filter((b) => b.postings.some((p) => p.quest === def.id)).map((b) => 'board:' + b.id)]);
  for (const key of walkVisit) {
    const [tree, node] = [key.slice(0, key.indexOf('.')), key.slice(key.indexOf('.') + 1)];
    if (!cast.has(tree)) continue;
    const n = DIALOGUE[tree]?.nodes[node];
    if (!n) continue;
    const who = tree.startsWith('board:') ? 'Notice board' : NPCS.find((x) => x.id === tree)?.name ?? tree;
    rep.lines.push({ tree, node, order: Object.keys(DIALOGUE[tree].nodes).indexOf(node), speaker: n.speaker ?? 'npc', who, text: texts.get(key) ?? (typeof n.text === 'string' ? n.text : ''), options: (n.options ?? []).map((o) => (typeof o.text === 'string' ? o.text : '(varies)')) });
  }
  walkVisit = null;
  if (!rep.started) err('start:' + def.id, `${def.id}: nothing a player can do starts it (walked ${seen.size} states)`);
  else if (!rep.endings.length) err('finish:' + def.id, `${def.id}: never reaches "done" (stages seen: ${rep.stages.join(', ')}; ${seen.size} states)`);
  for (const d of rep.deadEnds.slice(0, 3)) err(`dead:${def.id}:${d.stage}`, `${def.id}: dead end at "${d.stage}" after: ${d.path.slice(-3).join(' | ')}`);
  if (seen.size >= limit) warn('limit:' + def.id, `${def.id}: stopped at ${limit} states; some branches may be unexplored`);
  return rep;
}

// ---------------------------------------------------------------- Static checks

function staticChecks() {
  const ids = new Set<string>();
  for (const n of NPCS) {
    if (ids.has(n.id)) err('dupnpc:' + n.id, `duplicate NPC id "${n.id}"`);
    ids.add(n.id);
    if (n.title && !DIALOGUE[n.id]) warn('nodlg:' + n.id, `NPC "${n.id}" (${n.name}) has a title but no dialogue tree`);
  }
  for (const id of Object.keys(DIALOGUE)) {
    if (!id.startsWith('board:') && !ids.has(id)) warn('orphan:' + id, `dialogue tree "${id}" belongs to no NPC`);
    for (const [nid, node] of Object.entries(DIALOGUE[id].nodes)) {
      if (node.next && !DIALOGUE[id].nodes[node.next]) err(`link:${id}.${nid}`, `${id}.${nid}: next "${node.next}" doesn't exist`);
      for (const o of node.options ?? []) if (o.next && !DIALOGUE[id].nodes[o.next]) err(`olink:${id}.${nid}.${o.next}`, `${id}.${nid}: option goes to missing node "${o.next}"`);
      if (typeof node.text === 'string') texts.set(`${id}.${nid}`, node.text);
    }
  }
  for (const [k, r] of Object.entries(READABLES)) if (typeof r.body === 'string') texts.set(`readable ${k}`, r.body);
  for (const b of BOARDS) for (const p of b.postings) { texts.set(`board ${b.id}: ${p.quest}`, p.text); if (!QUESTS[p.quest]) err('post:' + p.quest, `board ${b.id}: posting for unknown quest "${p.quest}"`); }
  for (const it of Object.values(ITEMS)) texts.set(`item ${it.id}`, it.desc);
}

// ---------------------------------------------------------------- Style pass (docs/NARRATIVE_STYLE.md)

const BANNED: [RegExp, string][] = [
  [/\bdestin(y|ies|ed)\b/i, 'destiny'], [/\bchosen one\b/i, 'chosen one'], [/\bancient evil\b/i, 'ancient evil'],
  [/only time will tell/i, 'stock phrase'], [/more than meets the eye/i, 'stock phrase'], [/we meet again/i, 'stock phrase'],
  [/your journey (begins|starts)/i, 'stock phrase'], [/fate of the (world|realm)/i, 'grand stakes'], [/\b(welcome|greetings),? (adventurer|traveller|traveler|stranger|friend)\b/i, 'greeting boilerplate'],
  [/\badventurer\b/i, '"adventurer"'], [/little did/i, 'trailer voice'], [/\btapestry\b/i, 'AI trope'], [/\ba testament to\b/i, 'AI trope'],
  [/\bdelv(e|ing)\b/i, 'AI trope'], [/\bembark\b/i, 'AI trope'], [/\bin the realm of\b/i, 'AI trope'], [/\bwhispers? of\b/i, 'AI trope'],
  [/\bechoes of\b/i, 'AI trope'], [/\bunbeknownst\b/i, 'AI trope'], [/\bnestled\b/i, 'AI trope'], [/\bbustling\b/i, 'AI trope'],
  [/\bit'?s not (just )?(about )?\w+[^.]*?,? it'?s\b/i, '"it\'s not X, it\'s Y"'], [/\bever-?changing\b/i, 'AI trope'], [/\bintricate\b/i, 'AI trope'],
  [/\.\.\.|…/, 'ellipsis'],
];
function stylePass() {
  for (const [where, t] of texts) {
    for (const [re, why] of BANNED) if (re.test(t)) err(`style:${where}:${why}`, `${where}: ${why}: "${t.slice(0, 90)}"`);
    const isLine = !where.startsWith('item ') && !where.startsWith('readable ') && !where.startsWith('board ') && !where.includes(' notes @');
    if (isLine) {
      const words = t.split(/\s+/).filter(Boolean).length;
      if (words > 30) warn(`long:${where}`, `${where}: ${words} words (guide: under 25 unless the speaker has a reason)`);
    }
    if ((t.match(/!/g) ?? []).length > 2) warn(`bang:${where}`, `${where}: ${(t.match(/!/g) ?? []).length} exclamation marks`);
  }
}

// ---------------------------------------------------------------- Run

const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
staticChecks();
const reports: QuestReport[] = [];
// Greet everyone once from a fresh game, so opening and ambient lines are checked too.
if (!only) for (const id of Object.keys(DIALOGUE)) converse({ quests: {}, flags: {}, inv: {}, marks: 500 }, id);
for (const def of Object.values(QUESTS)) {
  if (only && def.id !== only) continue;
  reports.push(walk(def));
}
stylePass();
// Gear is horizontal: past the starter pieces, every weapon and helm spends the same budget.
const STARTER = new Set(['worn_sword']);
for (const d of Object.values(ITEMS)) {
  if (!(d.weapon || d.armor) || STARTER.has(d.id)) continue;
  // Named pieces spend two more and do one thing of their own (npm run gear checks them)
  if (d.named) continue;
  // Body armour spends no budget: its defence is its weight's, and it carries nothing else (data/armour.ts)
  if (d.armor && d.armor.slot !== 'head') {
    const a = d.armor;
    if (!a.weight || a.defense !== WEIGHTS[a.weight].defense || a.vigor || a.wind || a.roll) err('gear:' + d.id, `${d.id}: body armour should have its weight's defence and nothing else`);
    continue;
  }
  const budget = d.weapon ? GEAR_BUDGET.weapon : GEAR_BUDGET.head, pts = gearPoints(d);
  if (Math.abs(pts - budget) > 0.01) err('gear:' + d.id, `${d.id}: gear worth ${pts.toFixed(2)} points, the budget is ${budget}`);
}
if (!only) {
  // Content nobody reaches, in trees that belong to walked quests' casts
  const castTrees = new Set([...visited].map((v) => v.split('.')[0]));
  // A tree shared by two people (the same person in two places) counts as visited if either was.
  const sameTree = (id: string) => Object.keys(DIALOGUE).filter((k) => DIALOGUE[k] === DIALOGUE[id]);
  for (const id of castTrees) for (const nid of Object.keys(DIALOGUE[id]?.nodes ?? {})) if (!sameTree(id).some((k) => visited.has(`${k}.${nid}`))) warn(`unvisited:${id}.${nid}`, `${id}.${nid}: no walk reaches this node`);
}

fs.mkdirSync('.walker', { recursive: true });
fs.writeFileSync('.walker/report.json', JSON.stringify({ when: new Date().toISOString(), reports, errors: [...errors.values()], warnings: [...warnings.values()] }, null, 1));

for (const r of reports) {
  const mark = r.endings.length ? 'ok ' : 'ERR';
  console.log(`${mark} ${r.id.padEnd(20)} ${String(r.endings.length).padStart(2)} ending(s)  ${String(r.states).padStart(5)} states  ${r.region ?? (r.story ? 'story' : '')}`);
  if (only) for (const e of r.endings) console.log(`      ${e.signature}\n        ${e.path.join('\n        ')}`);
}
console.log(`\n${reports.length} quests walked. ${errors.size} error(s), ${warnings.size} warning(s). Full report: .walker/report.json`);
for (const e of errors.values()) console.log('  ERROR ' + e);
const showWarn = process.argv.includes('--warnings');
if (showWarn) for (const w of warnings.values()) console.log('  warn  ' + w);
else if (warnings.size) console.log(`  (run with --warnings to list them)`);
process.exit(errors.size ? 1 : 0);
