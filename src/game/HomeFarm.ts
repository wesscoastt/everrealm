import * as THREE from 'three';
import { CROP, CROPS, seasonRate, type CropDef } from '../data/farming';
import { BETTER, gradeHarvest, keeping } from '../data/quality';
import { ANIMAL_NAMES, HEART, heartWord, MAKERS, MAKER_OF_ITEM, type MakerBatch } from '../data/farmingThree';
import { GIANT, GIANTS } from '../data/farmingFive';
import { DECOR, DECOR_OF_ITEM, isFence, type DecorKind } from '../data/farmingSix';
import { type Colour, FLOWER_OF, GREENHOUSE, HIVE, HONEYS, crossOf, flowerId } from '../data/farmingFour';
import { FEEDS as FERTS, HEAP, REGROW, SPRINKLERS, SPRINKLER_REACH, type Feed } from '../data/farmingTwo';
import { ITEMS } from '../data/items';
import type { SkillId } from '../data/items';
import { B } from '../world/blocks';
import type { VoxelWorld } from '../world/VoxelWorld';
import * as P from '../world/props';

// Farming a tile at a time (the farming overhaul, owner 2026-11-06: "farming you can do on a lot, and it's a
// skill; maybe public farms too"). Two kinds of ground. The garden round your own house: hoe the grass into
// tilled ground, as much as your Farming lets you work (eight tiles to start, sixty-four at the last). And the
// towns' public fields (the old allotments at Hollin Ford and on every town farm): anyone may till them, and
// they don't count against your garden. Every tile takes its own seed. A crop grows on the real clock, at full
// speed while the ground's wet and half speed when it's dry: water it with a can (the better the can, the
// further it reaches and the longer the ground stays wet) and rain waters the lot. Kept well watered, and
// composted, more comes up; and more again with your group about you. A scythe takes the ripe tiles round you
// in a few strokes. (The orchard patches, a tree each, are still game/Farming.ts.)

export interface GardenHost {
  /** Your group's plot on the public fields (server/plots.mjs), or null when you're in no group or playing offline. */
  groupPlot(): Record<string, Tile> | null;
  /** Change one tile of it, for the whole group (null clears it). */
  groupPlotSet(k: string, t: Tile | null): void;
  /** A scarecrow set out at home: the birds keep off the garden, and every harvest is one more. */
  scarecrow(): boolean;
  scene: THREE.Scene;
  voxels: VoxelWorld;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  give(item: string, n?: number): boolean;
  take(item: string, n?: number): boolean;
  count(item: string): number;
  level(s: SkillId): number;
  addXp(s: SkillId, n: number): void;
  system(t: string): void;
  sound(n: 'pickup' | 'chop' | 'click' | 'fail' | 'discover'): void;
  persist(): void;
  player(): THREE.Vector3;
  /** Which way you face (radians, 0 toward +z). */
  facing(): number;
  /** Is it raining where you are? */
  raining(): boolean;
  /** Your house's footprint and the garden round it (game x, z), or null with no home. */
  garden(): { house: [number, number, number, number]; yard: [number, number, number, number] } | null;
  /** The towns' public fields: anyone may work them, a tile at a time. */
  fields(): { name: string; rect: [number, number, number, number] }[];
  /** A friend's garden you're standing on and may work as a farm hand (server/gardens.mjs), or null. */
  handGarden(): { owner: string; tiles: Record<string, Tile>; reap: boolean } | null;
  /** Change one tile of it, for its owner. */
  handGardenSet(k: string, t: Tile): void;
  /** Your own garden's tiles have changed: kept for your farm hands, if it's open to them. */
  gardenChanged(home: Record<string, Tile>): void;
  /** No grass growing up through these tilled cells. */
  clearGrass?(cells: string[]): void;
  /** Someone from your group near you (hands make light work: more comes up). */
  groupNearby(): boolean;
}

/** A tilled tile: its crop, how far grown (0..1), when that was worked out, wet until when, composted, and how much of its growing was wet. */
export interface Tile { c?: string; p: number; u: number; wu: number; k?: 1; wet: number; all: number; /** The soil's heart, 0 (tired) to 1 (rich): it remembers how it's been kept. */ s?: number; /** The kind last grown in it (for rotating). */ f?: string; /** The fertiliser dug in (data/farmingTwo.ts). */ fz?: Feed; /** Pickings so far, of a crop that bears again. */ r?: number; /** Part of a giant: its centre tile; tried for one already; strokes cut into it. */ g?: string; gr?: 1; gh?: number }
/** A sprinkler set in your yard, and the compost heap. */
export interface Sprinkler { x: number; z: number; i: string }
export interface Heap { x: number; z: number; l: number[] }
/** A maker in your yard (data/farmingThree.ts): what kind, where, and the batch in it with when it started. */
export interface Maker { k: string; x: number; z: number; b?: number; t?: number }

/** Peas and beans put back into the ground what other crops take out. */
const LEGUMES = new Set(['peas', 'beans']);
/** A crop's family, for rotating: roots, leaves, grain, the climbers, the fruiting kinds. */
const family = (c: CropDef) => (LEGUMES.has(c.id) ? 'legume' : c.shape);
/** A tile's soil, new ground starting middling. */
export const soilOf = (t: Tile) => t.s ?? 0.4;
/** What the soil is like, in a word. */
export const soilWord = (s: number) => (s >= 0.8 ? 'rich, dark soil' : s >= 0.55 ? 'good soil' : s >= 0.3 ? 'ordinary soil' : 'tired soil');

/** The cans, best first: how far round the tile they reach, and how many minutes the ground stays wet. */
export const CANS: { item: string; reach: number; wetMin: number }[] = [
  { item: 'watering_can_gilded', reach: 3, wetMin: 40 },
  { item: 'watering_can_iron', reach: 2, wetMin: 30 },
  { item: 'watering_can_copper', reach: 1, wetMin: 30 },
  { item: 'watering_can', reach: 1, wetMin: 20 },
];
const TILLABLE = new Set<number>([B.Grass, B.FlowerGrass, B.Dirt, B.Loam, B.Farmland, B.SnowGrass, B.Path]);
const STAGE_SCALE = [0.3, 0.55, 0.8, 1];
/** A sprinkler's spray and the heap's steam, shared by every one drawn. */
const DROPS = new THREE.MeshBasicMaterial({ color: '#bfe4ff', transparent: true, opacity: 0.55, depthWrite: false });
const GLASS = new THREE.MeshLambertMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.22, depthWrite: false });
const LAMPGLOW = new THREE.MeshBasicMaterial({ color: '#ffd890' });
const STEAM = new THREE.MeshBasicMaterial({ color: '#e8e8e0', transparent: true, opacity: 0.22, depthWrite: false });

/**
 * Livestock at home (farming part three): a coop of hens, a pair of ewes, a dairy cow, each bought from Bertram
 * and set up somewhere in your yard. Fed (grain from the garden: wheat or barley), they give for three hours on
 * the real clock: eggs every so often, milk, a fleece; collect it when you come by.
 */
export const HERDS: Record<string, { item: string; animal: 'chicken' | 'sheep' | 'cow'; head: number; name: string; feed: number; produce: string; every: number; per: number; most: number; place: string }> = {
  hens: { item: 'stock_hens', animal: 'chicken', head: 3, name: 'the hens', feed: 2, produce: 'egg', every: 20, per: 1, most: 9, place: 'Set up the hen coop here' },
  ewes: { item: 'stock_ewes', animal: 'sheep', head: 2, name: 'the ewes', feed: 3, produce: 'fleece', every: 60, per: 1, most: 4, place: 'Pen the ewes here' },
  cow: { item: 'stock_cow', animal: 'cow', head: 1, name: 'the cow', feed: 4, produce: 'milk', every: 30, per: 1, most: 6, place: 'Tether the cow here' },
};
const FED_MS = 3 * 3600000;
const FEEDS = ['barley', 'wheat'];
/** A herd in your yard: where, when last fed and collected; its names, its heart, the days it was fed and brushed (farming part three). */
export interface Herd { k: string; x: number; z: number; fed: number; got: number; n?: string; h?: number; fd?: string; bd?: string }
const DAY_MS = 86400000;
const today = () => new Date().toDateString();
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** How many tiles of your own garden you can work at a Farming level. */
export const gardenSize = (lv: number) => Math.min(64, 8 + Math.floor(lv / 3) * 2);

export class HomeFarm {
  private drawn: { group: THREE.Group; key: string } | null = null;
  private checkAt = 0;

  constructor(private host: GardenHost) {}

  herds(): Herd[] { const v = this.host.flag('livestock'); return Array.isArray(v) ? (v as Herd[]) : []; }
  private saveHerds(h: Herd[]): void { this.host.setFlag('livestock', h); this.host.persist(); }
  /** A herd's name: its own (the cow's, the ewes', the hens'), or what kind it is. */
  private herdName(h: Herd): string { return h.n ?? HERDS[h.k].name; }
  /** Its heart now: what care has built, less a little for every day it went unfed (data/farmingThree.ts). */
  heartOf(h: Herd, now = Date.now()): number {
    const missed = h.fed > 0 ? Math.max(0, Math.floor((now - h.fed) / DAY_MS) - 1) : 0;
    return Math.max(0, Math.min(100, (h.h ?? 0) - missed * HEART.missed));
  }
  /** What a herd has ready: its yield over the hours it was fed since you last collected (a fond one gives more). */
  private ready(h: Herd, now = Date.now()): number {
    const d = HERDS[h.k], from = Math.max(h.got, h.fed), to = Math.min(now, h.fed + FED_MS);
    if (to <= from) return 0;
    const n = Math.floor((to - from) / (d.every * 60000)) * d.per, heart = this.heartOf(h, now);
    return n ? Math.min(d.most + (heart >= 70 ? 2 : 0), n + (heart >= 45 ? 1 : 0)) : 0;
  }
  /** Work done at a herd: what you can do there now. */
  private herdCandidates(): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const me = this.host.player(), out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] = [];
    const list = this.herds();
    list.forEach((h, i) => {
      if (Math.hypot(h.x + 0.5 - me.x, h.z + 0.5 - me.z) > 3) return;
      const d = HERDS[h.k], at = new THREE.Vector3(h.x + 0.5, this.groundTop(h.x, h.z) + 1.4, h.z + 0.5), n = this.ready(h), now = Date.now();
      const name = this.herdName(h), many = d.head > 1, heart = this.heartOf(h), sub = `${many ? 'they are' : 'she is'} ${heartWord(heart)} (${heart} of 100)`;
      if (n > 0) { out.push({ label: `Collect from ${name} (${ITEMS[d.produce]?.name ?? d.produce} ×${n})`, sub, pos: at, use: () => this.collect(i) }); return; }
      if (now >= h.fed + FED_MS) {
        const grain = FEEDS.find((g) => this.host.count(g) >= d.feed);
        if (grain) out.push({ label: `Feed ${name} (${ITEMS[grain]?.name ?? grain} ×${d.feed})`, sub, pos: at, use: () => this.feed(i, grain) });
        else out.push({ label: `${cap(name)} ${many ? 'are' : 'is'} hungry`, sub, pos: at, use: () => this.host.system(`${cap(name)} ${many ? 'want' : 'wants'} ${d.feed} wheat or barley. Grow it in the garden, or buy it.`), warn: 'Needs grain' });
      } else if (h.bd !== today()) out.push({ label: `Brush ${name} down`, sub, pos: at, use: () => this.brush(i) });
      else out.push({ label: `${cap(name)}: fed and brushed`, sub, pos: at, use: () => this.host.system(`${cap(name)} ${many ? 'are' : 'is'} fed for another ${Math.ceil((h.fed + FED_MS - now) / 60000)} minutes. ${ITEMS[d.produce]?.name ?? d.produce} comes every ${d.every} minutes while ${many ? 'they are' : 'she is'}. Fed and brushed every day, ${many ? 'they give' : 'she gives'} more, and better.`) });
    });
    return out;
  }
  private feed(i: number, grain: string): void {
    const list = this.herds(), h = list[i], d = HERDS[h.k];
    if (!this.host.take(grain, d.feed)) return;
    const now = Date.now(), first = h.fd !== today();
    list[i] = { ...h, fed: now, got: Math.max(h.got, now), h: Math.min(100, this.heartOf(h, now) + (first ? HEART.fed : 0)), fd: today() };
    this.saveHerds(list);
    this.host.addXp('farming', 12 * d.feed);
    this.host.sound('click');
  }
  private brush(i: number): void {
    const list = this.herds(), h = list[i];
    if (!h || h.bd === today()) return;
    const before = this.heartOf(h), after = Math.min(100, before + HEART.brushed);
    list[i] = { ...h, h: (h.h ?? 0) + (after - before), bd: today() };
    this.saveHerds(list);
    this.host.addXp('farming', 15);
    this.host.sound('pickup');
    const name = cap(this.herdName(h)), many = HERDS[h.k].head > 1;
    const said = h.k === 'hens' ? `${name} put up with the brush, mostly, and talk about it after.` : h.k === 'ewes' ? `${name} lean into the brush till you have to lean back.` : `${name} leans into the brush and closes her eyes.`;
    this.host.system(`${said}${heartWord(after) !== heartWord(before) ? ` ${many ? 'They are' : 'She is'} ${heartWord(after)} now.` : ''}`);
  }
  private collect(i: number): void {
    const list = this.herds(), h = list[i], d = HERDS[h.k], n = this.ready(h);
    if (n <= 0) return;
    // a fond animal's give is better: some of it fine or prize (data/quality.ts)
    const [plain, fine, prize] = gradeHarvest(n, this.heartOf(h) / 110), [fineId, prizeId] = BETTER[d.produce] ?? [];
    if (plain) this.host.give(d.produce, plain);
    if (fine) this.host.give(fineId ?? d.produce, fine);
    if (prize) this.host.give(prizeId ?? d.produce, prize);
    const from = Math.max(h.got, h.fed), base = Math.floor((Math.min(Date.now(), h.fed + FED_MS) - from) / (d.every * 60000));
    list[i] = { ...h, got: from + Math.max(1, base) * d.every * 60000 };
    this.saveHerds(list);
    this.host.addXp('farming', 20 * n);
    this.host.sound('pickup');
    const graded = fine || prize ? ` (${[fine ? `${fine} fine` : '', prize ? `${prize} prize` : ''].filter(Boolean).join(', ')})` : '';
    this.host.system(`${ITEMS[d.produce]?.name ?? d.produce} ×${n}${graded}, from ${this.herdName(h)}.`);
  }
  private settle(k: string, x: number, z: number): void {
    const d = HERDS[k], list = this.herds();
    if (list.some((h) => h.k === k) || !this.host.take(d.item, 1)) return;
    const names = ANIMAL_NAMES[k] ?? [], n = names[Math.floor(Math.random() * names.length)];
    list.push({ k, x, z, fed: 0, got: Date.now(), n, h: 10 });
    this.saveHerds(list);
    this.host.sound('discover');
    const many = d.head > 1;
    this.host.system(`${n ?? cap(d.name)} ${many ? 'are' : 'is'} home. Bertram wrote ${many ? 'their names' : 'her name'} on the bill of sale. Feed ${many ? 'them' : 'her'} grain and brush ${many ? 'them' : 'her'} down every day, and ${many ? 'they give' : 'she gives'} more, and better.`);
    this.refresh();
  }

  private own(): Record<string, Tile> { const v = this.host.flag('garden'); return v && typeof v === 'object' ? (v as Record<string, Tile>) : {}; }
  /** Your garden's tiles, and, in a group, the group's plot on the public fields over them. */
  private tiles(): Record<string, Tile> { const gp = this.host.groupPlot(), hg = this.host.handGarden(); return { ...this.own(), ...(gp ?? {}), ...(hg?.tiles ?? {}) }; }
  /** Is this tile in a friend's garden you're working as a hand? */
  private hands(k: string): boolean { const hg = this.host.handGarden(); return !!hg && k in hg.tiles && !(k in this.own()); }
  /**
   * Keep the tiles: in a group, a tile on a public field that's the group's (or newly tilled there) goes to the
   * group's plot, for everyone in it; the rest are your own, as ever.
   */
  private save(t: Record<string, Tile>): void {
    // a friend's garden's tiles go back to its owner
    const hg = this.host.handGarden();
    if (hg) for (const k of Object.keys(hg.tiles)) { if (k in this.own()) continue; if (t[k] && JSON.stringify(t[k]) !== JSON.stringify(hg.tiles[k])) this.host.handGardenSet(k, t[k]); delete t[k]; }
    const gp = this.host.groupPlot();
    if (!gp) { this.host.setFlag('garden', t); this.host.persist(); this.host.gardenChanged(this.homeOnly(t)); return; }
    const own = this.own(), mine: Record<string, Tile> = {};
    for (const k of new Set([...Object.keys(t), ...Object.keys(gp)])) {
      const [x, z] = k.split(',').map(Number);
      const shared = k in gp || (!(k in own) && this.zone(x, z) === 'field');
      if (!shared) { if (t[k]) mine[k] = t[k]; continue; }
      if (JSON.stringify(t[k] ?? null) !== JSON.stringify(gp[k] ?? null)) this.host.groupPlotSet(k, t[k] ?? null);
    }
    this.host.setFlag('garden', mine); this.host.persist(); this.host.gardenChanged(this.homeOnly(mine));
  }
  /** The tiles of your own yard (not the public fields). */
  homeOnly(t: Record<string, Tile> = this.own()): Record<string, Tile> { const o: Record<string, Tile> = {}; for (const [k, v] of Object.entries(t)) { const [x, z] = k.split(',').map(Number); if (this.zone(x, z) === 'home') o[k] = v; } return o; }
  /** Your garden as your farm hands left it (server/gardens.mjs): their work on your yard's tiles taken in. */
  takeHandsWork(tiles: Record<string, Tile>): void {
    const own = { ...this.own() };
    let n = 0;
    for (const [k, v] of Object.entries(tiles)) if (k in own && JSON.stringify(own[k]) !== JSON.stringify(v)) { own[k] = v; n++; }
    if (!n) return;
    this.host.setFlag('garden', own); this.host.persist(); this.refresh();
  }

  // ---------------------------------------------------------------- Sprinklers and the compost heap (farming part two)
  sprinklers(): Sprinkler[] { const v = this.host.flag('sprinklers'); return Array.isArray(v) ? (v as Sprinkler[]) : []; }
  private heap(): Heap | null { const v = this.host.flag('heap'); return v && typeof v === 'object' ? (v as Heap) : null; }
  /** Is this tile of your own yard in a sprinkler's reach? */
  private sprinkled(k?: string): boolean {
    if (!k) return false;
    const [x, z] = k.split(',').map(Number);
    return this.sprinklers().some((s) => Math.max(Math.abs(s.x - x), Math.abs(s.z - z)) <= (SPRINKLER_REACH[s.i] ?? 1)) && k in this.own();
  }
  /** Wet now: rain, a can's water not dried yet, or a sprinkler on it. */
  private isWet(t: Tile, k?: string, now = Date.now()): boolean { return this.host.raining() || now < t.wu || this.sprinkled(k); }

  /** A tile brought up to now: how far it's grown, wet or dry (a sprinkler's keep it wet throughout; the fertilisers change the pace). */
  private grow(t: Tile, now = Date.now(), k?: string): Tile {
    const c = t.c ? CROP(t.c) : undefined;
    if (!c || t.p >= 1) return { ...t, u: now };
    const span = Math.max(0, now - t.u);
    const wet = this.host.raining() || this.sprinkled(k) ? span : Math.max(0, Math.min(now, t.wu) - t.u);
    const dry = span - wet, dryRate = t.fz === 'weed' ? 0.75 : 0.5, pace = t.fz === 'ash' ? 1.25 : 1;
    return { ...t, p: Math.min(1, t.p + ((wet + dry * dryRate) * pace * this.seasonAt(c, k, now)) / (c.minutes * 60000)), u: now, wet: t.wet + wet, all: t.all + span };
  }
  private stage(t: Tile): number { return !t.c ? -1 : t.p >= 1 ? 3 : t.p >= 0.66 ? 2 : t.p >= 0.33 ? 1 : 0; }
  private minsLeft(t: Tile, k?: string): number { const c = CROP(t.c!)!; const wetNow = this.isWet(t, k); return Math.max(1, Math.ceil(((1 - t.p) * c.minutes) / ((wetNow ? 1 : t.fz === 'weed' ? 0.75 : 0.5) * (t.fz === 'ash' ? 1.25 : 1) * this.seasonAt(c, k)))); }

  // ---------------------------------------------------------------- The makers (farming part three)
  makers(): Maker[] { const v = this.host.flag('makers'); return Array.isArray(v) ? (v as Maker[]) : []; }
  private saveMakers(m: Maker[]): void { this.host.setFlag('makers', m); this.host.persist(); this.refresh(); }
  /** Minutes till a maker's batch is done (0 when it is, -1 when it's empty). */
  private makerLeft(m: Maker, now = Date.now()): number {
    if (m.b === undefined || m.t === undefined) return -1;
    const b = MAKERS[m.k].batches[m.b];
    return Math.max(0, Math.ceil((m.t + b.mins * 60000 - now) / 60000));
  }
  private batchSay(b: MakerBatch): string { return Object.entries(b.in).map(([it, n]) => `${(ITEMS[it]?.name ?? it).toLowerCase()} ×${n}`).join(', '); }
  private makerCandidates(): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const me = this.host.player(), out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] = [];
    const list = this.makers();
    let best = -1, bestD = 2.4;
    list.forEach((m, i) => { const d = Math.hypot(m.x + 0.5 - me.x, m.z + 0.5 - me.z); if (d < bestD) { bestD = d; best = i; } });
    if (best < 0) return out;
    const m = list[best], def = MAKERS[m.k], at = new THREE.Vector3(m.x + 0.5, this.groundTop(m.x, m.z) + 1.6, m.z + 0.5), left = this.makerLeft(m);
    const Name = def.name[0].toUpperCase() + def.name.slice(1);
    if (left === 0) {
      const b = def.batches[m.b!];
      out.push({ label: `Take ${(ITEMS[b.out]?.name ?? b.out).toLowerCase()} from the ${def.name} (×${b.n})`, pos: at, use: () => this.makerTake(best) });
    } else if (left > 0) {
      const b = def.batches[m.b!];
      out.push({ label: `${Name}: ${(ITEMS[b.out]?.name ?? b.out).toLowerCase()} in ${left} min`, pos: at, use: () => this.host.system(`The ${def.name} is working: ${b.n} ${(ITEMS[b.out]?.name ?? b.out).toLowerCase()} in about ${left} minutes.`) });
    } else {
      const bi = def.batches.findIndex((b) => Object.entries(b.in).every(([it, n]) => this.host.count(it) >= n));
      if (bi >= 0) { const b = def.batches[bi]; out.push({ label: `${def.verb}: ${this.batchSay(b)}`, sub: `${b.n} ${(ITEMS[b.out]?.name ?? b.out).toLowerCase()} in ${b.mins} min`, pos: at, use: () => this.makerStart(best, bi) }); }
      else out.push({ label: `${Name} (empty)`, pos: at, use: () => this.host.system(`The ${def.name} takes ${def.batches.slice(0, 4).map((b) => `${this.batchSay(b)} for ${(ITEMS[b.out]?.name ?? b.out).toLowerCase()}`).join('; ')}${def.batches.length > 4 ? '; or any other fruit, three at a time' : ''}.`), warn: 'Nothing to put in' });
    }
    return out;
  }
  private makerStart(i: number, bi: number): void {
    const list = this.makers(), m = list[i], b = MAKERS[m?.k]?.batches[bi];
    if (!m || !b || this.makerLeft(m) >= 0) return;
    if (!Object.entries(b.in).every(([it, n]) => this.host.count(it) >= n)) return;
    for (const [it, n] of Object.entries(b.in)) this.host.take(it, n);
    list[i] = { ...m, b: bi, t: Date.now() };
    this.saveMakers(list);
    this.host.addXp('farming', 10 + b.mins / 6);
    this.host.sound('click');
  }
  private makerTake(i: number): void {
    const list = this.makers(), m = list[i];
    if (!m || this.makerLeft(m) !== 0) return;
    const b = MAKERS[m.k].batches[m.b!];
    if (!this.host.give(b.out, b.n)) return;
    list[i] = { k: m.k, x: m.x, z: m.z };
    this.saveMakers(list);
    this.host.addXp('farming', 20 + b.mins / 3);
    this.host.setFlag('n:made', Number(this.host.flag('n:made') ?? 0) + b.n);
    this.host.sound('pickup');
    this.host.system(`${ITEMS[b.out]?.name ?? b.out} ×${b.n}, from your own ${MAKERS[m.k].name}.`);
  }
  private makerSet(item: string, x: number, z: number): void {
    const k = MAKER_OF_ITEM[item];
    if (!k || !this.host.take(item, 1)) return;
    this.saveMakers([...this.makers(), { k, x, z }]);
    this.host.sound('discover');
    this.host.system(`The ${MAKERS[k].name} is set up. Bring it what it takes and come back for what it makes.`);
  }
  // ---------------------------------------------------------------- Bees and the greenhouse (farming part four)
  hives(): { x: number; z: number; t: number }[] { const v = this.host.flag('hives'); return Array.isArray(v) ? (v as { x: number; z: number; t: number }[]) : []; }
  private greenhouse(): { x: number; z: number } | null { const v = this.host.flag('greenhouse'); return v && typeof v === 'object' ? (v as { x: number; z: number }) : null; }
  /** Is this tile under the greenhouse's glass? */
  private underGlass(k?: string): boolean {
    const gh = this.greenhouse();
    if (!gh || !k) return false;
    const [x, z] = k.split(',').map(Number);
    return x >= gh.x && x < gh.x + GREENHOUSE.size && z >= gh.z && z < gh.z + GREENHOUSE.size;
  }
  /** How fast a crop grows for its season: in the greenhouse, always as if in season. */
  private seasonAt(c: CropDef, k?: string, now = Date.now()): number { return this.underGlass(k) ? 1.5 : seasonRate(c, new Date(now)); }
  /** Jars waiting in a hive. */
  private hiveJars(h: { t: number }, now = Date.now()): number { return Math.min(HIVE.most, Math.floor((now - h.t) / (HIVE.everyMins * 60000))); }
  /** Is a hive near enough to this cell for its bees to work it? */
  private beesAt(x: number, z: number): boolean { return this.hives().some((h) => Math.hypot(h.x - x, h.z - z) <= HIVE.reach); }
  /** The honey a hive makes: of the flowers growing nearest it, most of one kind; or the garden's. */
  private honeyOf(hx: number, hz: number): string {
    const n: Record<string, number> = {};
    for (const [k, t] of Object.entries(this.own())) {
      const f = t.c ? FLOWER_OF[t.c] : undefined;
      if (!f) continue;
      const [x, z] = k.split(',').map(Number);
      if (Math.hypot(x - hx, z - hz) <= HIVE.reach && this.stage(this.grow(t, Date.now(), k)) >= 2) n[f.sp] = (n[f.sp] ?? 0) + 1;
    }
    const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
    return HONEYS[top?.[0] ?? 'none'] ?? HONEYS.none;
  }
  private hiveCandidates(x: number, z: number): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const me = this.host.player(), list = this.hives();
    const i = list.findIndex((h) => Math.hypot(h.x + 0.5 - me.x, h.z + 0.5 - me.z) < 2.2);
    if (i >= 0) {
      const h = list[i], n = this.hiveJars(h), at = new THREE.Vector3(h.x + 0.5, this.groundTop(h.x, h.z) + 1.6, h.z + 0.5), kind = ITEMS[this.honeyOf(h.x, h.z)]?.name ?? 'Honey';
      if (n > 0) return [{ label: `Take the honey (${kind} ×${n})`, pos: at, use: () => this.hiveTake(i) }];
      const mins = Math.ceil((h.t + HIVE.everyMins * 60000 - Date.now()) / 60000);
      return [{ label: `Beehive: a jar in ${mins} min`, sub: kind.toLowerCase(), pos: at, use: () => this.host.system(`The bees are working. A jar in about ${mins} minutes; up to ${HIVE.most} wait for you. Flowers grown within ${HIVE.reach} tiles of the hive flavour the honey, and the berries, squashes and climbers near it bear more.`) }];
    }
    if (this.zone(x, z) !== 'home' || this.tiles()[x + ',' + z]) return [];
    const at = new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.2, z + 0.5);
    if (this.host.count('beehive') > 0 && list.length < 3) return [{ label: 'Set the beehive here', pos: at, use: () => this.hiveSet(x, z) }];
    if (this.host.count('greenhouse_kit') > 0 && !this.greenhouse()) {
      const fits = this.greenhouseFits(x, z);
      return [{ label: 'Raise the greenhouse here', sub: fits ? 'five tiles square, from here away from you' : 'not enough of your yard here', pos: at, use: () => (fits ? this.greenhouseSet(x, z) : this.host.system('It needs five tiles by five of your own yard, clear of the house.')), warn: fits ? undefined : 'No room' }];
    }
    return [];
  }
  /** The greenhouse's corner nearest you at (x, z), growing away from you: where it would stand. */
  private greenhouseAt(x: number, z: number): [number, number] {
    const me = this.host.player(), sx = me.x > x + 0.5 ? -1 : 1, sz = me.z > z + 0.5 ? -1 : 1;
    return [sx > 0 ? x : x - GREENHOUSE.size + 1, sz > 0 ? z : z - GREENHOUSE.size + 1];
  }
  private greenhouseFits(x: number, z: number): boolean {
    const [gx, gz] = this.greenhouseAt(x, z);
    for (let dz = 0; dz < GREENHOUSE.size; dz++) for (let dx = 0; dx < GREENHOUSE.size; dx++) if (this.zone(gx + dx, gz + dz) !== 'home') return false;
    return true;
  }
  private greenhouseSet(x: number, z: number): void {
    if (this.greenhouse() || !this.greenhouseFits(x, z) || !this.host.take('greenhouse_kit', 1)) return;
    const [gx, gz] = this.greenhouseAt(x, z);
    // the beds already there brought up to now, so the glass counts from today
    const own = { ...this.own() }, now = Date.now();
    for (const [k, t] of Object.entries(own)) own[k] = this.grow(t, now, k);
    this.host.setFlag('garden', own);
    this.host.setFlag('greenhouse', { x: gx, z: gz });
    this.host.persist();
    this.host.sound('discover');
    this.host.system('The greenhouse is up, every pane in. Whatever grows under it grows as if it were its own season, and comes up better.');
    this.refresh();
  }
  private hiveSet(x: number, z: number): void {
    if (this.hives().length >= 3 || !this.host.take('beehive', 1)) return;
    this.host.setFlag('hives', [...this.hives(), { x, z, t: Date.now() }]);
    this.host.persist();
    this.host.sound('discover');
    this.host.system('The hive is set. The bees come out to look at the place, decide it will do, and go to work. Flowers near it flavour the honey.');
    this.refresh();
  }
  private hiveTake(i: number): void {
    const list = this.hives(), h = list[i], n = h ? this.hiveJars(h) : 0;
    if (!n) return;
    const kind = this.honeyOf(h.x, h.z);
    if (!this.host.give(kind, n)) return;
    list[i] = { ...h, t: n >= HIVE.most ? Date.now() : h.t + n * HIVE.everyMins * 60000 };
    this.host.setFlag('hives', list);
    this.host.persist();
    this.host.addXp('farming', 25 * n);
    this.host.sound('pickup');
    this.host.system(`${ITEMS[kind]?.name ?? 'Honey'} ×${n}. Only one sting, and that one was your fault.`);
    this.refresh();
  }
  /** At a flower's picking: a seed of a new colour, now and then, from a different colour of its kind beside it. */
  private crossAt(x: number, z: number, id: string, all: Record<string, Tile>): string | null {
    const me = FLOWER_OF[id];
    if (!me) return null;
    // one chance a picking: the likeliest cross among the flowers of its kind beside it (bees make it likelier)
    let best: { makes: string; chance: number } | null = null;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const k = (x + dx) + ',' + (z + dz), t = all[k], f = t?.c ? FLOWER_OF[t.c] : undefined;
      if (!f || f.sp !== me.sp || this.stage(this.grow(t, Date.now(), k)) < 2) continue;
      const cx = crossOf(me.c, f.c);
      if (cx && (!best || cx.chance > best.chance)) best = { makes: cx.makes, chance: cx.chance };
    }
    if (best && Math.random() < best.chance * (this.beesAt(x, z) ? 1.3 : 1)) return 'seed_' + flowerId(me.sp, best.makes as Colour);
    return null;
  }
  // ---------------------------------------------------------------- Giant crops (farming part five)
  /**
   * Nine ripe tiles of a crop that can go giant, in a square, each kept well watered: once, they may join into one
   * giant (data/farmingFive.ts). Checked as you come by; a square that didn't join won't try again till it's replanted.
   */
  private giantCheck(now: number): void {
    const own = { ...this.own() }, joined: string[] = [];
    let changed = false;
    for (const [k, t0] of Object.entries(own)) {
      if (!t0.c || !GIANTS[t0.c] || t0.g || t0.gr) continue;
      const [x, z] = k.split(',').map(Number), keys: string[] = [];
      let ok = true;
      for (let dz = 0; dz <= 2 && ok; dz++) for (let dx = 0; dx <= 2 && ok; dx++) {
        const kk = (x + dx) + ',' + (z + dz), t = own[kk];
        if (!t || t.c !== t0.c || t.g || t.gr) { ok = false; break; }
        const u = this.grow(t, now, kk);
        if (this.stage(u) < 3 || !(u.all > 0 && u.wet / u.all >= 0.6)) ok = false;
        keys.push(kk);
      }
      if (!ok) continue;
      const join = Math.random() < GIANT.chance, centre = (x + 1) + ',' + (z + 1);
      for (const kk of keys) own[kk] = { ...own[kk], gr: 1, ...(join ? { g: centre, gh: 0 } : {}) };
      changed = true;
      if (join) joined.push(GIANTS[t0.c].name);
    }
    if (!changed) return;
    this.host.setFlag('garden', own);
    this.host.persist();
    for (const n of joined) { this.host.sound('discover'); this.host.system(`Nine plants in a square have grown together into one ${n}. It will take some cutting; it takes less with your group about you.`); }
  }
  /** A stroke at a giant: enough strokes (fewer in company) and it's cut, a giant's worth of prize produce and the giant itself. */
  private giantCut(centre: string): void {
    const own = { ...this.own() }, c0 = own[centre];
    if (!c0?.g || !c0.c) return;
    const crop = CROP(c0.c)!, gd = GIANTS[c0.c], need = this.host.groupNearby() ? GIANT.groupStrokes : GIANT.strokes, hits = (c0.gh ?? 0) + 1;
    if (hits < need) {
      own[centre] = { ...c0, gh: hits };
      this.host.setFlag('garden', own); this.host.persist();
      this.host.sound('chop');
      this.host.system(`You cut into the ${gd.name}. (${hits} of ${need}${need === GIANT.strokes ? '; fewer with your group about you' : ''})`);
      return;
    }
    const [fineId, prizeId] = BETTER[crop.produce] ?? [];
    this.host.give(prizeId ?? crop.produce, GIANT.prize);
    this.host.give(fineId ?? crop.produce, GIANT.fine);
    this.host.give(gd.item, 1);
    const now = Date.now();
    for (const [k, t] of Object.entries(own)) if (t.g === centre) own[k] = { p: 0, u: now, wu: t.wu, wet: 0, all: 0, s: Math.min(1, soilOf(t) + 0.06), f: family(crop) };
    this.host.setFlag('garden', own);
    this.host.setFlag('n:giant', Number(this.host.flag('n:giant') ?? 0) + 1);
    { const gr = { ...((this.host.flag('grown') as Record<string, [number, number]> | undefined) ?? {}) }, was = gr[crop.id] ?? [0, 0]; gr[crop.id] = [was[0] + GIANT.prize + GIANT.fine, 2]; this.host.setFlag('grown', gr); }
    this.host.setFlag('n:harvest', Number(this.host.flag('n:harvest') ?? 0) + 9);
    this.host.addXp('farming', crop.xpPick * 30);
    this.host.persist();
    this.host.sound('pickup');
    this.host.system(`The ${gd.name} comes away at last. ${ITEMS[crop.produce]?.name ?? crop.produce} ×${GIANT.prize + GIANT.fine} (${GIANT.prize} prize), and the ${gd.name} itself, for the show.`);
    this.refresh();
  }
  // ---------------------------------------------------------------- The garden's look (data/farmingSix.ts)
  decor(): { x: number; z: number; k: DecorKind; r: number }[] { const v = this.host.flag('yardDecor'); return Array.isArray(v) ? (v as { x: number; z: number; k: DecorKind; r: number }[]) : []; }
  private decorAt(x: number, z: number) { return this.decor().find((d) => d.x === x && d.z === z); }
  /** The piece you're laying, if you've chosen one and still have it. */
  private laying(): DecorKind | null {
    const it = this.host.flag('decorPick') as string | undefined, k = it ? DECOR_OF_ITEM[it] : undefined;
    return k && this.host.count(DECOR[k].item) > 0 ? k : null;
  }
  /** Laying a piece, or taking one up. */
  private decorCandidates(x: number, z: number, laying: boolean): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const at = new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.1, z + 0.5), here = this.decorAt(x, z), k = this.laying();
    if (here) return [{ label: `Take up the ${DECOR[here.k].name.toLowerCase()}`, pos: at, use: () => this.decorTake(x, z) }];
    if (!laying || !k) return [];
    if (this.zone(x, z) !== 'home') return [{ label: `Lay the ${DECOR[k].name.toLowerCase()}`, pos: at, use: () => this.host.system('Garden pieces go in your own yard, outside the house.'), warn: 'Not your yard' }];
    if (this.tiles()[x + ',' + z]) return [{ label: `Lay the ${DECOR[k].name.toLowerCase()}`, pos: at, use: () => this.host.system('That ground is tilled. Lay it on the grass beside the beds.'), warn: 'Tilled ground' }];
    return [{ label: `Lay the ${DECOR[k].name.toLowerCase()}`, sub: `${this.host.count(DECOR[k].item)} left; use it from your bag again to stop`, pos: at, use: () => this.decorLay(x, z, k) }];
  }
  private decorLay(x: number, z: number, k: DecorKind): void {
    if (this.decorAt(x, z) || !this.host.take(DECOR[k].item, 1)) return;
    const f = this.host.facing(), r = Math.round(f / (Math.PI / 2)) & 3;
    this.host.setFlag('yardDecor', [...this.decor(), { x, z, k, r }]);
    this.host.persist();
    this.host.sound('click');
    this.refresh();
  }
  private decorTake(x: number, z: number): void {
    const list = this.decor(), i = list.findIndex((d) => d.x === x && d.z === z);
    if (i < 0 || !this.host.give(DECOR[list[i].k].item, 1)) return;
    list.splice(i, 1);
    this.host.setFlag('yardDecor', list);
    this.host.persist();
    this.host.sound('pickup');
    this.refresh();
  }
  /** Is there a trellis beside this tile for a climber to go up? */
  private trellisBy(x: number, z: number): boolean { return this.decor().some((d) => d.k === 'trellis' && Math.max(Math.abs(d.x - x), Math.abs(d.z - z)) <= 1); }
  /** Draw one piece: paths flat on the grass, fences joined to their neighbours. */
  private drawDecor(g: THREE.Group, d: { x: number; z: number; k: DecorKind; r: number }, box: (g: THREE.Group, w: number, h: number, dd: number, c: string, x: number, y: number, z: number, rz?: number) => void, hash: (x: number, z: number) => number): void {
    const k = d.k;
    if (k === 'path_flags') { for (let q = 0; q < 3; q++) { const w = 0.42 + hash(d.x + q, d.z) * 0.1; box(g, w, 0.05, 0.3, q % 2 ? '#a8a49a' : '#9a968c', (hash(d.z, d.x + q) - 0.5) * 0.2, 0.025, -0.32 + q * 0.32); box(g, 0.46 - w * 0.4, 0.05, 0.28, '#b4b0a6', 0.3, 0.025, -0.32 + q * 0.32); } return; }
    if (k === 'path_brick') { for (let q = 0; q < 4; q++) for (let p = 0; p < 2; p++) box(g, (q + p) % 2 ? 0.46 : 0.22, 0.05, (q + p) % 2 ? 0.22 : 0.46, ['#a85a3a', '#984e32', '#b8664a'][(q * 2 + p) % 3], -0.24 + p * 0.48, 0.025, -0.36 + q * 0.24); return; }
    if (k === 'path_gravel') { box(g, 0.98, 0.04, 0.98, '#c8bca0', 0, 0.02, 0); for (let q = 0; q < 8; q++) box(g, 0.06, 0.03, 0.06, q % 2 ? '#a89c84' : '#d8d0bc', (hash(d.x + q, d.z) - 0.5) * 0.8, 0.045, (hash(d.x, d.z + q) - 0.5) * 0.8); return; }
    if (isFence(k)) {
      const n = this.decor().filter((o) => isFence(o.k) && Math.abs(o.x - d.x) + Math.abs(o.z - d.z) === 1);
      const white = k === 'fence_paling' || k === 'gate', wood = white ? '#ece6d6' : '#8a6a3a';
      if (k === 'gate') {
        const along = d.r % 2 ? 'z' : 'x';
        for (const s of [-0.45, 0.45]) box(g, 0.1, 1.0, 0.1, '#e4ddcc', along === 'x' ? s : 0, 0.5, along === 'x' ? 0 : s);
        for (const y of [0.3, 0.7]) box(g, along === 'x' ? 0.8 : 0.05, 0.07, along === 'x' ? 0.05 : 0.8, wood, 0, y, 0);
        for (let q = 0; q < 5; q++) box(g, along === 'x' ? 0.08 : 0.04, 0.6, along === 'x' ? 0.04 : 0.08, wood, along === 'x' ? -0.32 + q * 0.16 : 0, 0.5, along === 'x' ? 0 : -0.32 + q * 0.16);
        return;
      }
      box(g, 0.12, 0.9, 0.12, white ? '#e4ddcc' : '#6a4a2a', 0, 0.45, 0);
      const arms = n.length ? n.map((o) => [o.x - d.x, o.z - d.z]) : [[d.r % 2 ? 0 : 1, d.r % 2 ? 1 : 0], [d.r % 2 ? 0 : -1, d.r % 2 ? -1 : 0]];
      for (const [ax, az] of arms) {
        const cx = ax * 0.25, cz = az * 0.25, lx = ax ? 0.5 : 0.05, lz = az ? 0.5 : 0.05;
        if (white) { for (const y of [0.3, 0.65]) box(g, lx, 0.06, lz, wood, cx, y, cz); for (const t of [0.12, 0.32]) box(g, ax ? 0.07 : 0.035, 0.75, az ? 0.07 : 0.035, wood, ax * t, 0.4, az * t); }
        else { for (let y = 0; y < 5; y++) box(g, lx + 0.02, 0.1, lz + 0.02, y % 2 ? '#7a5a30' : '#9a7a46', cx, 0.15 + y * 0.14, cz); }
      }
      return;
    }
    if (k === 'trellis') { for (const s of [-0.4, 0.4]) box(g, 0.08, 1.9, 0.08, '#6a4a2a', s, 0.95, 0); for (let q = 0; q < 6; q++) { box(g, 0.85, 0.04, 0.04, '#8a6a3a', 0, 0.3 + q * 0.28, 0, 0.5); box(g, 0.85, 0.04, 0.04, '#8a6a3a', 0, 0.3 + q * 0.28, 0, -0.5); } for (let q = 0; q < 5; q++) box(g, 0.14, 0.1, 0.06, '#4a7a32', (hash(d.x + q, d.z) - 0.5) * 0.7, 0.4 + q * 0.3, 0.04); return; }
    if (k === 'bench') { const rot = new THREE.Group(); rot.rotation.y = d.r * Math.PI / 2; for (const s of [-0.6, 0.6]) { box(rot, 0.08, 0.45, 0.4, '#2a2a2a', s, 0.22, 0); box(rot, 0.08, 0.45, 0.06, '#2a2a2a', s, 0.65, -0.2); } for (let q = 0; q < 3; q++) box(rot, 1.4, 0.05, 0.11, '#7a5434', 0, 0.46, -0.13 + q * 0.13); for (let q = 0; q < 2; q++) box(rot, 1.4, 0.1, 0.04, '#7a5434', 0, 0.62 + q * 0.18, -0.22); g.add(rot); return; }
    if (k === 'lantern') { box(g, 0.1, 1.9, 0.1, '#2a2a2a', 0, 0.95, 0); box(g, 0.3, 0.06, 0.06, '#2a2a2a', 0.12, 1.85, 0); box(g, 0.2, 0.26, 0.2, '#2a2a2a', 0.24, 1.66, 0); const m = new THREE.Mesh(P.box(0.15, 0.2, 0.15), LAMPGLOW); m.position.set(0.24, 1.66, 0); g.add(m); box(g, 0.24, 0.05, 0.24, '#2a2a2a', 0.24, 1.81, 0); return; }
    if (k === 'birdbath') { box(g, 0.3, 0.1, 0.3, '#a8a49a', 0, 0.05, 0); box(g, 0.16, 0.6, 0.16, '#b8b4aa', 0, 0.4, 0); box(g, 0.66, 0.08, 0.66, '#b8b4aa', 0, 0.74, 0); box(g, 0.56, 0.06, 0.06, '#b8b4aa', 0, 0.8, 0.28); box(g, 0.56, 0.06, 0.06, '#b8b4aa', 0, 0.8, -0.28); box(g, 0.06, 0.06, 0.56, '#b8b4aa', 0.28, 0.8, 0); box(g, 0.06, 0.06, 0.56, '#b8b4aa', -0.28, 0.8, 0); box(g, 0.5, 0.02, 0.5, '#6a9aba', 0, 0.79, 0); return; }
    if (k === 'tub') { box(g, 0.66, 0.4, 0.66, '#8a5a32', 0, 0.2, 0); for (const y of [0.08, 0.32]) box(g, 0.7, 0.05, 0.7, '#3a3a3a', 0, y, 0); box(g, 0.56, 0.06, 0.56, '#3a2a1a', 0, 0.4, 0); box(g, 0.5, 0.18, 0.5, '#4a7a32', 0, 0.5, 0); for (let q = 0; q < 7; q++) box(g, 0.1, 0.1, 0.1, ['#d8402a', '#e8c020', '#f0ece0', '#e87aa0'][q % 4], Math.cos(q * 0.9) * 0.2, 0.62, Math.sin(q * 0.9) * 0.2); return; }
    if (k === 'arch') { const rot = new THREE.Group(); rot.rotation.y = d.r * Math.PI / 2; for (const s of [-0.48, 0.48]) box(rot, 0.06, 1.9, 0.06, '#3a3a3a', s, 0.95, 0); for (let q = 0; q < 7; q++) { const a = (q / 6) * Math.PI; box(rot, 0.18, 0.06, 0.06, '#3a3a3a', Math.cos(a) * 0.48, 1.9 + Math.sin(a) * 0.35, 0, a + Math.PI / 2); } for (let q = 0; q < 12; q++) { const s = q % 2 ? -0.48 : 0.48, y = 0.4 + (q >> 1) * 0.3; box(rot, 0.14, 0.12, 0.12, q % 3 ? '#4a7a32' : '#c8304a', s + (hash(q, d.x) - 0.5) * 0.1, Math.min(y, 2.1), (hash(d.z, q) - 0.5) * 0.12); } g.add(rot); }
  }
  /** Spare produce for the heap: the plain crop you have most of, three at least. */
  private scraps(): string | undefined {
    let best: string | undefined, n = HEAP.per - 1;
    for (const c of CROPS) { const k = this.host.count(c.produce); if (k > n) { best = c.produce; n = k; } }
    return best;
  }
  /** What's done at a sprinkler or the heap, and setting either up in your yard. */
  private yardCandidates(x: number, z: number): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const me = this.host.player(), out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] = [];
    const mk = this.makerCandidates();
    if (mk.length) return mk;
    const hv = this.hiveCandidates(x, z);
    if (hv.length) return hv;
    const h = this.heap();
    if (h && Math.hypot(h.x + 0.5 - me.x, h.z + 0.5 - me.z) < 2.6) {
      const at = new THREE.Vector3(h.x + 0.5, this.groundTop(h.x, h.z) + 1.5, h.z + 0.5), now = Date.now();
      const ready = h.l.filter((t) => now >= t + HEAP.mins * 60000).length, rotting = h.l.length - ready, scrap = this.scraps();
      if (ready) out.push({ label: `Dig out the compost (×${ready * HEAP.gives})`, pos: at, use: () => this.heapTake() });
      else if (scrap && h.l.length < HEAP.most) out.push({ label: `Put scraps on the heap (${ITEMS[scrap]?.name ?? scrap} ×${HEAP.per})`, sub: rotting ? `${rotting} rotting down` : undefined, pos: at, use: () => this.heapAdd(scrap) });
      else {
        const next = rotting ? Math.ceil((Math.min(...h.l) + HEAP.mins * 60000 - now) / 60000) : 0;
        out.push({ label: rotting ? `Compost heap: ready in ${next} min` : 'Compost heap', pos: at, use: () => this.host.system(rotting ? `${rotting} load${rotting > 1 ? 's' : ''} rotting down. The first is ready in about ${next} minutes.` : `It wants spare produce, ${HEAP.per} of a kind at a time, and gives ${HEAP.gives} compost for each load ninety minutes later.`), warn: rotting ? undefined : 'Wants scraps' });
      }
      return out;
    }
    const list = this.sprinklers(), si = list.findIndex((s) => s.x === x && s.z === z);
    if (si >= 0) {
      const s = list[si];
      out.push({ label: `Take up the ${(ITEMS[s.i]?.name ?? 'sprinkler').toLowerCase()}`, pos: new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.3, z + 0.5), use: () => this.unsprinkle(si) });
      return out;
    }
    if (this.zone(x, z) !== 'home' || this.tiles()[x + ',' + z] || this.herds().some((q) => q.x === x && q.z === z) || (h && h.x === x && h.z === z)) return out;
    const at = new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.2, z + 0.5);
    if (this.makers().some((m) => m.x === x && m.z === z)) return out;
    const mItem = Object.keys(MAKER_OF_ITEM).find((it) => this.host.count(it) > 0);
    if (mItem) { out.push({ label: `Set up the ${MAKERS[MAKER_OF_ITEM[mItem]].name} here`, pos: at, use: () => this.makerSet(mItem, x, z) }); return out; }
    if (!h && this.host.count('compost_heap') > 0) { out.push({ label: 'Build the compost heap here', pos: at, use: () => this.heapBuild(x, z) }); return out; }
    const sp = SPRINKLERS.find((q) => this.host.count(q.item) > 0);
    if (sp) out.push({ label: `Set the ${(ITEMS[sp.item]?.name ?? 'sprinkler').toLowerCase()} here`, sub: `keeps the beds ${sp.reach} round it wet`, pos: at, use: () => this.sprinkle(x, z, sp.item) });
    return out;
  }
  private sprinkle(x: number, z: number, item: string): void {
    if (!this.host.take(item, 1)) return;
    // the tiles it will reach brought up to now first, so the time before it was set isn't counted wet
    const own = { ...this.own() }, now = Date.now(), r = SPRINKLER_REACH[item] ?? 1;
    for (const [k, t] of Object.entries(own)) { const [tx, tz] = k.split(',').map(Number); if (Math.max(Math.abs(tx - x), Math.abs(tz - z)) <= r) own[k] = this.grow(t, now, k); }
    this.host.setFlag('garden', own);
    this.host.setFlag('sprinklers', [...this.sprinklers(), { x, z, i: item }]);
    this.host.persist();
    this.host.sound('discover');
    this.host.system(`The ${(ITEMS[item]?.name ?? 'sprinkler').toLowerCase()} is set. The tilled ground ${r} round it stays wet from now on.`);
    this.refresh();
  }
  private unsprinkle(i: number): void {
    const list = this.sprinklers(), s = list[i];
    if (!s) return;
    // its tiles brought up to now while still wet
    const own = { ...this.own() }, now = Date.now();
    for (const [k, t] of Object.entries(own)) own[k] = this.grow(t, now, k);
    if (!this.host.give(s.i, 1)) return;
    list.splice(i, 1);
    this.host.setFlag('garden', own);
    this.host.setFlag('sprinklers', list);
    this.host.persist();
    this.host.sound('pickup');
    this.refresh();
  }
  private heapBuild(x: number, z: number): void {
    if (this.heap() || !this.host.take('compost_heap', 1)) return;
    this.host.setFlag('heap', { x, z, l: [] } as Heap);
    this.host.setFlag('heapBuilt', 1);
    this.host.persist();
    this.host.sound('discover');
    this.host.system(`The heap is up. Give it spare produce, ${HEAP.per} of a kind at a time, and dig out compost ninety minutes later.`);
    this.refresh();
  }
  private heapAdd(item: string): void {
    const h = this.heap();
    if (!h || h.l.length >= HEAP.most || !this.host.take(item, HEAP.per)) return;
    this.host.setFlag('heap', { ...h, l: [...h.l, Date.now()] });
    this.host.persist();
    this.host.addXp('farming', 10);
    this.host.sound('click');
    this.refresh();
  }
  private heapTake(): void {
    const h = this.heap(), now = Date.now();
    if (!h) return;
    const ready = h.l.filter((t) => now >= t + HEAP.mins * 60000).length;
    if (!ready || !this.host.give('compost', ready * HEAP.gives)) return;
    this.host.setFlag('heap', { ...h, l: h.l.filter((t) => now < t + HEAP.mins * 60000) });
    this.host.persist();
    this.host.addXp('farming', 15 * ready);
    this.host.sound('pickup');
    this.host.system(`Compost ×${ready * HEAP.gives}, black and crumbly and warm in the middle.`);
    this.refresh();
  }
  /** Dig a fertiliser into a growing tile. */
  private fertilise(x: number, z: number, f: Feed): void {
    const all = this.tiles(), k = x + ',' + z, t = all[k];
    if (!t?.c || t.fz || !this.host.take(FERTS[f].item, 1)) return;
    all[k] = { ...this.grow(t, Date.now(), k), fz: f };
    this.save(all);
    this.host.addXp('farming', 5);
    this.host.sound('click');
    this.host.system(`${FERTS[f].name[0].toUpperCase() + FERTS[f].name.slice(1)} dug in: ${FERTS[f].does}.`);
    this.refresh();
  }

  private groundTop(x: number, z: number): number { return this.host.voxels.topSolid(x, z); }
  /** Which ground a cell is: your own yard (outside the house), a public field, or neither. */
  private zone(x: number, z: number): 'home' | 'field' | null {
    const g = this.host.garden();
    if (g) {
      const [ya, yb, yc, yd] = g.yard, [ha, hb, hc, hd] = g.house;
      if (x >= ya && x <= yc && z >= yb && z <= yd && !(x >= ha - 1 && x <= hc + 1 && z >= hb - 1 && z <= hd + 1)) return 'home';
    }
    return this.host.fields().some((f) => x >= f.rect[0] && x <= f.rect[2] && z >= f.rect[1] && z <= f.rect[3]) ? 'field' : null;
  }
  /** How many tiles of your own garden you've tilled (the public fields don't count). */
  private homeTiles(all: Record<string, Tile>): number { return Object.keys(all).filter((k) => { const [x, z] = k.split(',').map(Number); return this.zone(x, z) === 'home'; }).length; }
  /** Can this cell be tilled: your garden or a public field, open ground of earth or grass. */
  private tillable(x: number, z: number): boolean {
    if (!this.zone(x, z)) return false;
    const top = this.groundTop(x, z);
    return TILLABLE.has(this.host.voxels.get(x, top, z)) && this.host.voxels.get(x, top + 1, z) === B.Air && this.host.voxels.get(x, top + 2, z) === B.Air;
  }
  /** The best can you carry. */
  private can() { return CANS.find((c) => this.host.count(c.item) > 0); }

  /** The tile in front of you. */
  private target(): [number, number] {
    const p = this.host.player(), f = this.host.facing();
    return [Math.floor(p.x + Math.sin(f) * 1.1), Math.floor(p.z + Math.cos(f) * 1.1)];
  }

  // ---------------------------------------------------------------- Working it
  candidates(): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const herd = this.herdCandidates();
    if (herd.length) return herd;
    const [x, z] = this.target(), key = x + ',' + z, all = this.tiles(), here = all[key];
    const lay = this.laying() ? this.decorCandidates(x, z, true) : [];
    if (lay.length) return lay;
    const yard = this.yardCandidates(x, z);
    if (yard.length) return yard;
    const piece = this.decorCandidates(x, z, false);
    if (piece.length) return piece;
    if (!here && !this.zone(x, z)) return [];
    // somewhere in your own yard to set up stock you've bought
    if (!here && this.zone(x, z) === 'home') {
      const k = Object.keys(HERDS).find((q) => this.host.count(HERDS[q].item) > 0 && !this.herds().some((h) => h.k === q));
      if (k) return [{ label: HERDS[k].place, pos: new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.2, z + 0.5), use: () => this.settle(k, x, z) }];
    }
    const at = new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.2, z + 0.5);
    const out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] = [];
    if (!here) {
      if (!this.tillable(x, z)) return [];
      const used = this.homeTiles(all), max = gardenSize(this.host.level('farming')), field = this.zone(x, z) === 'field';
      if (this.host.count('hoe') < 1) out.push({ label: 'Till the ground', pos: at, use: () => this.host.system("You need a hoe. Bertram Sowerby sells them, by Hollin Ford's west garden."), warn: 'Needs a hoe' });
      else if (field) out.push({ label: 'Till the public field', pos: at, use: () => this.till(x, z) });
      else if (used >= max) out.push({ label: `Till the ground (${used} of ${max})`, pos: at, use: () => this.host.system(`You can work ${max} tiles of your own garden at your Farming. More as you learn; the towns' public fields are free to anyone.`), warn: 'No more for now' });
      else out.push({ label: `Till the ground (${used + 1} of ${max})`, pos: at, use: () => this.till(x, z) });
      return out;
    }
    if (here.g && here.c && GIANTS[here.c]) { const centre = here.g, c0 = this.own()[centre]; out.push({ label: `Cut the ${GIANTS[here.c].name}`, sub: `${c0?.gh ?? 0} of ${this.host.groupNearby() ? GIANT.groupStrokes : GIANT.strokes} strokes`, pos: at, use: () => this.giantCut(centre) }); return out; }
    const t = this.grow(here, Date.now(), key), st = this.stage(t), c = t.c ? CROP(t.c) : undefined;
    if (!c) {
      const s = this.bestSeed();
      // (the soil, and a word if the last crop here was the same kind: rotate)
      const tired = s && t.f && t.f === (LEGUMES.has(s.id) ? 'legume' : s.shape) && t.f !== 'legume' ? ', same kind as last' : '';
      if (s) out.push({ label: `Plant ${s.name.toLowerCase()}${seasonRate(s) > 1 ? ' (in season)' : ''}`, sub: `${soilWord(soilOf(t))}${tired}`, pos: at, use: () => this.plant(x, z, s) });
      else out.push({ label: 'Tilled ground', pos: at, use: () => this.host.system("It wants seed. Bertram Sowerby sells it, by Hollin Ford's west garden."), warn: 'No seed for it' });
      return out;
    }
    const hg = this.hands(key) ? this.host.handGarden() : null;
    if (st >= 3 && hg && !hg.reap) { out.push({ label: `${c.name}, ripe: ${hg.owner}'s to pick`, pos: at, use: () => this.host.system(`${hg.owner} keeps the picking for themselves. You can water, plant and compost here.`), warn: 'Not yours to pick' }); return out; }
    if (st >= 3) {
      const rg = REGROW[c.id], left = rg ? rg.picks - (t.r ?? 0) - 1 : 0;
      out.push({ label: `${rg ? 'Pick' : 'Harvest'} the ${c.name.toLowerCase()}`, sub: rg ? (left > 0 ? `it bears ${left} more time${left > 1 ? 's' : ''} after this` : 'its last picking') : undefined, pos: at, use: () => this.harvest(x, z) });
      return out;
    }
    const wet = this.isWet(t, key), sprinkled = this.sprinkled(key);
    const feed = !t.fz ? (Object.keys(FERTS) as Feed[]).find((f) => this.host.count(FERTS[f].item) > 0) : undefined;
    const kept = [sprinkled ? 'sprinkled' : '', t.k ? 'composted' : '', t.fz ? `${FERTS[t.fz].name} dug in` : ''].filter(Boolean).join(', ');
    if (!wet && this.can()) out.push({ label: `Water the ${c.name.toLowerCase()}`, pos: at, use: () => this.water(x, z) });
    else if (!t.k && this.host.count('compost') > 0) out.push({ label: `Add compost (${c.name.toLowerCase()})`, pos: at, use: () => this.compost(x, z) });
    else if (feed) out.push({ label: `Dig in ${FERTS[feed].name} (${c.name.toLowerCase()})`, sub: FERTS[feed].does, pos: at, use: () => this.fertilise(x, z, feed) });
    else out.push({ label: `${c.name}, ripe in ${this.minsLeft(t, key)} min${wet ? '' : ', dry'}`, sub: kept || undefined, pos: at, use: () => this.host.system(`${c.name}: ripe in about ${this.minsLeft(t, key)} minutes.${sprinkled ? ' The sprinkler keeps it wet.' : wet ? " The ground's wet." : ` The ground's dry: it grows at ${t.fz === 'weed' ? 'three-quarter' : 'half'} speed till it's watered.`}${t.k ? ' Composted.' : ''}${t.fz ? ` ${FERTS[t.fz].name[0].toUpperCase() + FERTS[t.fz].name.slice(1)} dug in.` : ''}`), warn: wet ? undefined : 'Dry' });
    return out;
  }

  private bestSeed(): CropDef | undefined {
    const lv = this.host.level('farming');
    const pick = this.host.flag('sowing') as string | undefined, chosen = pick ? CROPS.find((c) => c.seed === pick) : undefined;
    if (chosen && chosen.level <= lv && this.host.count(chosen.seed) > 0) return chosen;
    return [...CROPS].reverse().find((c) => c.patch === 'allotment' && c.shape !== 'flower' && c.level <= lv && this.host.count(c.seed) > 0) ?? [...CROPS].reverse().find((c) => c.patch === 'allotment' && c.level <= lv && this.host.count(c.seed) > 0);
  }

  private till(x: number, z: number): void {
    const all = this.tiles();
    if (all[x + ',' + z] || !this.tillable(x, z)) return;
    if (this.zone(x, z) === 'home' && this.homeTiles(all) >= gardenSize(this.host.level('farming'))) return;
    all[x + ',' + z] = { p: 0, u: Date.now(), wu: 0, wet: 0, all: 0 };
    this.save(all);
    this.host.addXp('farming', 8);
    this.host.sound('chop');
    this.refresh();
  }

  /** With a seed drill, the tilled, empty tiles round the one you're at sown too, a seed each, as far as your seed goes. */
  private plant(x: number, z: number, c: CropDef): void {
    const all = this.tiles(), reach = this.host.count('seed_drill') > 0 ? 1 : 0;
    let n = 0;
    for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
      const k = (x + dx) + ',' + (z + dz), t = all[k];
      if (!t || t.c || !this.host.take(c.seed, 1)) continue;
      all[k] = { c: c.id, p: 0, u: Date.now(), wu: t.wu, wet: 0, all: 0, s: t.s, f: t.f };
      n++;
    }
    if (!n) return;
    this.save(all);
    if (n > 1) this.host.system(`The drill sows ${n} tiles in one pass.`);
    this.host.addXp('farming', c.xpPlant * n);
    this.host.sound('click');
    this.refresh();
  }

  /** The can: this tile and the planted ones round it, as far as the can reaches. */
  /**
   * A companion living at your house tending a tile of your own garden (game/HouseGuests.ts): watered as the plain
   * can waters it, if it's growing and dry. No experience: it's their work, not yours. True if it was watered.
   */
  tendTile(k: string): boolean {
    const own = this.own(), t = own[k], now = Date.now();
    if (!t?.c || this.isWet(t, k, now)) return false;
    own[k] = { ...this.grow(t, now, k), wu: now + CANS[CANS.length - 1].wetMin * 60000 };
    this.host.setFlag('garden', own); this.host.persist();
    this.refresh();
    return true;
  }
  private water(x: number, z: number): void {
    const all = this.tiles(), now = Date.now(), can = this.can();
    if (!can) return;
    const r = can.reach;
    let n = 0;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const k = (x + dx) + ',' + (z + dz), t = all[k];
      if (!t || !t.c) continue;
      all[k] = { ...this.grow(t, now, k), wu: now + can.wetMin * 60000 * (t.fz === 'weed' ? 2 : 1) };
      n++;
    }
    if (!n) return;
    this.save(all);
    this.host.addXp('farming', 3 * n);
    this.host.sound('click');
    this.refresh();
  }

  private compost(x: number, z: number): void {
    const all = this.tiles(), t = all[x + ',' + z];
    if (!t?.c || t.k || !this.host.take('compost', 1)) return;
    all[x + ',' + z] = { ...this.grow(t, Date.now(), x + ',' + z), k: 1 };
    this.save(all);
    this.host.addXp('farming', 4);
    this.host.sound('click');
  }

  /** With a scythe, every ripe tile round the one you're at; without, that one. */
  private harvest(x: number, z: number): void {
    const reach = this.host.count('scythe') > 0 ? 1 : 0;
    let got = this.harvestOne(x, z, true) ? 1 : 0;
    for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) if (dx || dz) got += this.harvestOne(x + dx, z + dz, false) ? 1 : 0;
    if (got > 1) this.host.system(`The scythe takes ${got} tiles in a few strokes.`);
    if (got) this.refresh();
  }
  private harvestOne(x: number, z: number, say: boolean): boolean {
    const all = this.tiles(), t0 = all[x + ',' + z];
    if (!t0?.c || t0.g) return false;
    const t = this.grow(t0, Date.now(), x + ',' + z), c = CROP(t.c!)!;
    if (this.stage(t) < 3) return false;
    const lv = this.host.level('farming'), tended = t.all > 0 && t.wet / t.all >= 0.75, group = this.host.groupNearby();
    // a tile's share of a patch's crop, more for good keeping and for good company
    const soil = soilOf(t);
    const n = Math.max(1, Math.round((c.yield[0] + Math.random() * (c.yield[1] - c.yield[0])) / 3) + Math.floor((lv - c.level) / 20) + (t.k ? 1 : 0) + (tended ? 1 : 0) + (group ? 1 : 0) + (this.host.scarecrow() ? 1 : 0) + Math.round((soil - 0.4) * 2.5) + (this.beesAt(x, z) && ['berry', 'squash', 'bine', 'flower'].includes(c.shape) ? 1 : 0) + (c.shape === 'bine' && this.trellisBy(x, z) ? 1 : 0));
    // how well it was kept decides how much of it comes up fine or prize (data/quality.ts)
    const keep = Math.min(1, keeping({ wetShare: t.all > 0 ? t.wet / t.all : 0, compost: !!t.k, inSeason: this.seasonAt(c, x + ',' + z) > 1, levelsOver: lv - c.level, group, scarecrow: this.host.scarecrow() }) + (soil - 0.4) * 0.25 + (t.fz === 'bone' ? 0.25 : 0) + (this.underGlass(x + ',' + z) ? 0.1 : 0));
    const [plain, fine, prize] = gradeHarvest(n, keep);
    const [fineId, prizeId] = BETTER[c.produce] ?? [];
    if (plain) this.host.give(c.produce, plain);
    if (fine) this.host.give(fineId ?? c.produce, fine);
    if (prize) this.host.give(prizeId ?? c.produce, prize);
    // (counted for the achievements: data/feats.ts)
    this.host.setFlag('n:harvest', Number(this.host.flag('n:harvest') ?? 0) + 1);
    { const gr = { ...((this.host.flag('grown') as Record<string, [number, number]> | undefined) ?? {}) }, was = gr[c.id] ?? [0, 0]; gr[c.id] = [was[0] + n, Math.max(was[1], prize ? 2 : fine ? 1 : 0)]; this.host.setFlag('grown', gr); }
    if (prize) this.host.setFlag('n:prize', Number(this.host.flag('n:prize') ?? 0) + prize);
    // (a public field's tile less than your own garden's: with no cap on them, they were the fastest way up; the XP audit, 2026-11-12)
    this.host.addXp('farming', Math.round(c.xpPick * n * (this.zone(x, z) === 'field' ? 0.35 : 1)));
    const crossed = this.crossAt(x, z, c.id, all);
    if (crossed) { this.host.give(crossed, 1); this.host.setFlag('n:crossed', Number(this.host.flag('n:crossed') ?? 0) + 1); this.host.sound('discover'); this.host.system(`A seed head has set that isn't either colour: ${ITEMS[crossed]?.name ?? crossed}.`); }
    // a crop that bears again: back to flowering, the soil left alone till its last picking (data/farmingTwo.ts)
    const rg = REGROW[c.id], picks = (t.r ?? 0) + 1;
    if (rg && picks < rg.picks) {
      all[x + ',' + z] = { c: c.id, p: rg.back, u: Date.now(), wu: t.wu, wet: 0, all: 0, s: t.s, f: t.f, r: picks };
      this.save(all);
      this.host.sound('pickup');
      const graded = fine || prize ? ` (${[fine ? `${fine} fine` : '', prize ? `${prize} prize` : ''].filter(Boolean).join(', ')})` : '';
      const left = rg.picks - picks;
      if (say) this.host.system(`${ITEMS[c.produce]?.name ?? c.produce} ×${n}${graded}. It will bear again${left === 1 ? ', once more' : ''}.`);
      return true;
    }
    if (Math.random() < (t.k ? 0.35 : 0.2)) this.host.give(c.seed, 1);
    // the soil remembers: compost and steady watering feed it, the same family twice running tires it, peas and beans mend it
    const fam = family(c), again = t.f === fam && fam !== 'legume';
    const s2 = Math.max(0, Math.min(1, soil + (t.k ? 0.12 : 0) + (tended ? 0.04 : -0.02) + (LEGUMES.has(c.id) ? 0.12 : 0) - (again ? 0.14 : 0.03)));
    all[x + ',' + z] = { p: 0, u: Date.now(), wu: t.wu, wet: 0, all: 0, s: s2, f: fam };
    this.save(all);
    this.host.sound('pickup');
    const soilSaid = again && s2 < soil ? ' The bed is tiring of it: grow something of another kind here next.' : s2 >= 0.8 && soil < 0.8 ? ' The soil here is rich now.' : '';
    const graded = fine || prize ? ` (${[fine ? `${fine} fine` : '', prize ? `${prize} prize` : ''].filter(Boolean).join(', ')})` : '';
    if (say) this.host.system(`${ITEMS[c.produce]?.name ?? c.produce} ×${n}${graded}${tended ? ', well watered' : ''}${t.k ? ', composted' : ''}${group ? ", and more for your group's help" : ''}.${soilSaid}`);
    return true;
  }

  // ---------------------------------------------------------------- Drawing it
  update(dt: number): void {
    if ((this.checkAt -= dt) > 0) return;
    this.checkAt = 2;
    this.giantCheck(Date.now());
    const me = this.host.player(), now = Date.now(), raining = this.host.raining();
    const all = Object.fromEntries(Object.entries(this.tiles()).filter(([k]) => { const [x, z] = k.split(',').map(Number); return Math.hypot(x - me.x, z - me.z) < 110; }));
    const herds = this.herds().filter((h) => Math.hypot(h.x - me.x, h.z - me.z) < 110);
    const sp = this.sprinklers().filter((s) => Math.hypot(s.x - me.x, s.z - me.z) < 110), hp = this.heap();
    const mks = this.makers().map((m) => `${m.k}${m.x},${m.z}:${this.makerLeft(m, now) === 0 ? 'done' : m.b ?? ''}`).join(';');
    const key = herds.map((h) => h.k + h.x + ',' + h.z).join(';') + '#' + sp.map((s) => `${s.x},${s.z},${s.i}`).join(';') + '#' + (hp ? `${hp.x},${hp.z},${hp.l.length}` : '') + '#' + mks + '#' + this.hives().map((h) => `${h.x},${h.z},${this.hiveJars(h, now)}`).join(';') + '#' + JSON.stringify(this.greenhouse()) + '#' + JSON.stringify(this.decor()) + '#' + Object.entries(all).map(([k, t]) => { const u = this.grow(t, now, k); return `${k}:${u.c ?? ''}:${u.g ?? ''}:${this.stage(u)}:${this.isWet(u, k, now) ? 1 : 0}`; }).join('|');
    if (this.drawn && this.drawn.key === key) return;
    if (this.drawn) { this.host.scene.remove(this.drawn.group); this.drawn = null; }
    if (!key) return;
    this.host.clearGrass?.([...Object.keys(all), ...this.decor().filter((d) => d.k.startsWith('path')).map((d) => d.x + ',' + d.z)]);
    const group = this.draw(all, now, raining, herds);
    this.host.scene.add(group);
    this.drawn = { group, key };
  }
  refresh(): void { this.checkAt = 0; if (this.drawn) this.drawn.key = '!'; }

  private draw(all: Record<string, Tile>, now: number, raining: boolean, herds: Herd[] = []): THREE.Group {
    const batch = new P.Batcher();
    const box = (g: THREE.Group, w: number, h: number, d: number, c: string, x: number, y: number, z: number, rz = 0) => { const m = new THREE.Mesh(P.box(w, h, d), P.flat(c)); m.position.set(x, y, z); m.rotation.z = rz; g.add(m); };
    // the hen coop on its legs, with a ramp and a nesting box; a trough for the ewes or the cow
    for (const h of herds) {
      const g = new THREE.Group();
      if (h.k === 'hens') {
        for (const [lx, lz] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) box(g, 0.1, 0.5, 0.1, '#5a3a24', lx, 0.25, lz);
        box(g, 1.4, 0.8, 1.0, '#8a5a32', 0, 0.9, 0); box(g, 1.6, 0.1, 1.2, '#6a2a24', 0, 1.35, 0, 0.12);
        box(g, 0.4, 0.4, 0.06, '#2a1e14', 0.3, 0.8, 0.51); box(g, 0.3, 0.06, 0.9, '#8a5a32', 0.3, 0.3, 0.9, 0.5);
        box(g, 0.5, 0.3, 0.4, '#a8783a', -0.95, 0.8, 0); box(g, 0.4, 0.1, 0.3, '#d8c070', -0.95, 0.98, 0);
      } else {
        box(g, 1.8, 0.45, 0.6, '#6a4a2a', 0, 0.22, 0); box(g, 1.6, 0.06, 0.45, '#3a6aa8', 0, 0.42, 0);
        box(g, 0.1, 1.1, 0.1, '#5a3a24', -1.4, 0.55, 0); box(g, 0.1, 1.1, 0.1, '#5a3a24', 1.4, 0.55, 0);
      }
      batch.addGroup(g, P.mat4(h.x + 0.5, this.groundTop(h.x, h.z) + 1, h.z + 0.5, 0));
    }
    const hash = (x: number, z: number) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
    // sprinklers: a spike and a head, with the spray caught in the air round it
    const me = this.host.player();
    for (const s of this.sprinklers()) {
      if (Math.hypot(s.x - me.x, s.z - me.z) > 110) continue;
      const g = new THREE.Group(), r = SPRINKLER_REACH[s.i] ?? 1;
      const metal = s.i === 'sprinkler_silver' ? '#d8dce4' : s.i === 'sprinkler_iron' ? '#5a5a62' : '#b8803a';
      box(g, 0.08, 0.5, 0.08, '#4a4a4a', 0, 0.25, 0);
      box(g, 0.26, 0.12, 0.26, metal, 0, 0.55, 0);
      box(g, 0.1, 0.08, 0.1, metal, 0, 0.66, 0);
      for (let q = 0; q < 4; q++) box(g, 0.32, 0.03, 0.04, metal, Math.cos(q * Math.PI / 2) * 0.16, 0.6, Math.sin(q * Math.PI / 2) * 0.16, 0);
      // the spray: beads of water in arcs out to its reach
      for (let q = 0; q < 16; q++) {
        const a = q * Math.PI / 8 + hash(s.x + q, s.z) * 0.3;
        for (let d = 1; d <= 3; d++) {
          const f = (d / 3) * (r + 0.4), m = new THREE.Mesh(P.box(0.05, 0.05, 0.05), DROPS);
          m.position.set(Math.cos(a) * f, 0.65 + Math.sin((d / 3) * Math.PI) * 0.45, Math.sin(a) * f);
          g.add(m);
        }
      }
      batch.addGroup(g, P.mat4(s.x + 0.5, this.groundTop(s.x, s.z) + 1, s.z + 0.5, 0));
    }
    for (const d of this.decor()) {
      if (Math.hypot(d.x - me.x, d.z - me.z) > 110) continue;
      const g = new THREE.Group();
      this.drawDecor(g, d, box, hash);
      batch.addGroup(g, P.mat4(d.x + 0.5, this.groundTop(d.x, d.z) + 1, d.z + 0.5, 0));
    }
    // the hives: a white box hive on legs under a roof, bees about it, the honey showing at the entrance when it's ready
    for (const h of this.hives()) {
      if (Math.hypot(h.x - me.x, h.z - me.z) > 110) continue;
      const g = new THREE.Group(), jars = this.hiveJars(h, now);
      for (const [lx, lz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) box(g, 0.08, 0.4, 0.08, '#5a3a24', lx, 0.2, lz);
      box(g, 0.66, 0.08, 0.66, '#6a4a2a', 0, 0.42, 0);
      for (let y = 0; y < 3; y++) box(g, 0.6, 0.24, 0.6, y % 2 ? '#e4ddcc' : '#ece6d6', 0, 0.58 + y * 0.25, 0);
      box(g, 0.78, 0.08, 0.78, '#8a8a92', 0, 1.33, 0); box(g, 0.66, 0.06, 0.66, '#8a8a92', 0, 1.39, 0);
      box(g, 0.3, 0.05, 0.08, '#2a1e14', 0, 0.5, 0.3); box(g, 0.36, 0.03, 0.14, '#6a4a2a', 0, 0.47, 0.36);
      if (jars) box(g, 0.24, 0.05, 0.05, '#d8a040', 0, 0.54, 0.31);
      for (let q = 0; q < 7; q++) { const a = q * 0.9 + h.x, r = 0.45 + (q % 3) * 0.2; box(g, 0.05, 0.04, 0.05, q % 2 ? '#2a2010' : '#d8a020', Math.cos(a) * r, 0.7 + (q % 4) * 0.22, Math.sin(a) * r); }
      batch.addGroup(g, P.mat4(h.x + 0.5, this.groundTop(h.x, h.z) + 1, h.z + 0.5, 0));
    }
    // the greenhouse: oak glazing bars and panes, a door on the south side left open
    const gh = this.greenhouse();
    if (gh && Math.hypot(gh.x - me.x, gh.z - me.z) < 120) {
      const g = new THREE.Group(), S = GREENHOUSE.size, Wh = 2.6, oak = '#6a4a2a';
      const base = this.groundTop(gh.x, gh.z) + 1;
      const pane = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0, rx = 0) => { const m = new THREE.Mesh(P.box(w, h, d), GLASS); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); };
      for (let i = 0; i <= S; i++) for (const [x, z] of [[i, 0], [i, S], [0, i], [S, i]]) box(g, 0.08, Wh, 0.08, oak, x, Wh / 2, z);
      for (const y of [0.25, Wh]) { box(g, S + 0.08, 0.08, 0.08, oak, S / 2, y, 0); box(g, S + 0.08, 0.08, 0.08, oak, S / 2, y, S); box(g, 0.08, 0.08, S + 0.08, oak, 0, y, S / 2); box(g, 0.08, 0.08, S + 0.08, oak, S, y, S / 2); }
      // the walls' panes, leaving the doorway in the middle of the south side
      for (let i = 0; i < S; i++) {
        pane(0.98, Wh - 0.3, 0.02, i + 0.5, (Wh + 0.25) / 2, S);
        pane(0.02, Wh - 0.3, 0.98, 0, (Wh + 0.25) / 2, i + 0.5);
        pane(0.02, Wh - 0.3, 0.98, S, (Wh + 0.25) / 2, i + 0.5);
        if (i !== Math.floor(S / 2)) pane(0.98, Wh - 0.3, 0.02, i + 0.5, (Wh + 0.25) / 2, 0);
      }
      box(g, 0.12, 0.25, 0.12, oak, Math.floor(S / 2), 0.12, 0); box(g, 0.12, 0.25, 0.12, oak, Math.floor(S / 2) + 1, 0.12, 0);
      // the pitched roof, ridge north to south
      const half = S / 2, slope = Math.atan2(1.1, half), run = Math.hypot(half, 1.1);
      for (const side of [-1, 1]) { pane(run, 0.02, S, half + side * half / 2, Wh + 0.55, S / 2, side * -slope); for (let i = 0; i <= S; i++) box(g, run, 0.06, 0.06, oak, half + side * half / 2, Wh + 0.55, i, side * -slope); }
      box(g, 0.1, 0.1, S + 0.1, oak, half, Wh + 1.1, S / 2);
      for (const z of [0, S]) for (const side of [-1, 1]) for (let q = 0; q < 4; q++) { const o = q * 0.6 + 0.3, hh = 1.1 * (1 - (o + 0.3) / half); if (hh > 0.05) pane(0.6, hh, 0.02, half + side * o, Wh + hh / 2, z); }
      batch.addGroup(g, P.mat4(gh.x, base, gh.z, 0));
    }
    // the makers, each its own shape; a full one shows what's in it, a finished one has its goods out on top
    for (const m of this.makers()) {
      if (Math.hypot(m.x - me.x, m.z - me.z) > 110) continue;
      const g = new THREE.Group(), left = this.makerLeft(m, now), b = m.b !== undefined ? MAKERS[m.k].batches[m.b] : undefined;
      const outCol = b ? (ITEMS[b.out]?.icon?.a ?? '#d8c070') : '#d8c070';
      if (m.k === 'churn') { box(g, 0.6, 0.9, 0.6, '#8a6a3a', 0, 0.45, 0); for (const y of [0.2, 0.7]) box(g, 0.64, 0.06, 0.64, '#4a4a4a', 0, y, 0); box(g, 0.06, 0.6, 0.06, '#c8b898', 0, 1.15, 0); box(g, 0.3, 0.05, 0.05, '#c8b898', 0, 1.42, 0); }
      else if (m.k === 'press') { box(g, 1.0, 0.1, 0.8, '#6a4a2a', 0, 0.6, 0); for (const px of [-0.42, 0.42]) box(g, 0.1, 1.4, 0.1, '#5a3a24', px, 0.7, 0); box(g, 0.94, 0.12, 0.14, '#5a3a24', 0, 1.36, 0); box(g, 0.08, 0.5, 0.08, '#8a8a8a', 0, 1.05, 0); box(g, 0.4, 0.2, 0.4, b ? '#e8e0c8' : '#7a5a3a', 0, 0.75, 0); for (const lx of [-0.4, 0.4]) box(g, 0.08, 0.55, 0.08, '#4a3220', lx, 0.28, 0); }
      else if (m.k === 'loom') { for (const px of [-0.6, 0.6]) { box(g, 0.1, 1.5, 0.1, '#7a5434', px, 0.75, -0.3); box(g, 0.1, 0.9, 0.1, '#7a5434', px, 0.45, 0.4); } box(g, 1.3, 0.1, 0.1, '#7a5434', 0, 1.45, -0.3); box(g, 1.3, 0.08, 0.8, '#7a5434', 0, 0.85, 0.05); box(g, 1.1, 0.02, 0.7, b ? '#ece6d6' : '#c8b898', 0, 0.9, 0.05); box(g, 1.0, 0.5, 0.02, '#ece6d6', 0, 1.15, -0.3); box(g, 1.2, 0.1, 0.3, '#5a3a24', 0, 0.45, 0.85); }
      else if (m.k === 'jars') { box(g, 1.2, 0.08, 0.4, '#8a6a3a', 0, 0.9, 0); box(g, 1.2, 0.08, 0.4, '#8a6a3a', 0, 0.4, 0); for (const px of [-0.55, 0.55]) box(g, 0.08, 1.1, 0.4, '#6a4a2a', px, 0.55, 0); for (let q = 0; q < 5; q++) { box(g, 0.16, 0.22, 0.16, '#e0d8c8', -0.4 + q * 0.2, 1.05, 0); box(g, 0.14, 0.14, 0.14, b ? outCol : '#c8c0b0', -0.4 + q * 0.2, 1.02, 0); box(g, 0.18, 0.03, 0.18, '#e8e0c8', -0.4 + q * 0.2, 1.17, 0); } box(g, 0.4, 0.2, 0.4, '#c87a3a', 0, 0.55, 0); }
      else if (m.k === 'cider') { box(g, 1.2, 0.1, 1.0, '#5a3a24', 0, 0.35, 0); box(g, 0.7, 0.6, 0.7, '#8a6a3a', 0, 0.7, 0); for (const px of [-0.55, 0.55]) box(g, 0.12, 1.6, 0.12, '#4a3220', px, 0.8, 0); box(g, 1.3, 0.16, 0.16, '#4a3220', 0, 1.6, 0); box(g, 0.08, 0.5, 0.08, '#8a8a8a', 0, 1.3, 0); if (b) box(g, 0.6, 0.12, 0.6, outCol, 0, 1.05, 0); for (const lx of [-0.5, 0.5]) box(g, 0.1, 0.35, 0.1, '#4a3220', lx, 0.17, 0.4); }
      else if (m.k === 'keg') { box(g, 0.9, 0.3, 0.7, '#5a3a24', 0, 0.15, 0); const k2 = new THREE.Group(); box(k2, 0.8, 0.7, 0.7, '#6a4a2a', 0, 0, 0); for (const xx of [-0.28, 0.28]) box(k2, 0.06, 0.74, 0.74, '#3a3a3a', xx, 0, 0); box(k2, 0.06, 0.08, 0.2, '#a8a8a8', 0, -0.15, 0.4); k2.position.set(0, 0.68, 0); g.add(k2); }
      // the goods out on top when it's done
      if (left === 0 && b) for (let q = 0; q < Math.min(3, b.n); q++) box(g, 0.16, 0.2, 0.16, outCol, -0.2 + q * 0.2, m.k === 'jars' ? 1.32 : m.k === 'loom' ? 1.0 : 1.75, m.k === 'jars' ? 0.12 : 0.3);
      batch.addGroup(g, P.mat4(m.x + 0.5, this.groundTop(m.x, m.z) + 1, m.z + 0.5, 0));
    }
    // the compost heap: a slatted bin, the heap higher the more is in it, steaming while it rots
    const hp = this.heap();
    if (hp && Math.hypot(hp.x - me.x, hp.z - me.z) < 110) {
      const g = new THREE.Group(), fill = Math.min(1, hp.l.length / HEAP.most);
      for (const [px, pz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) box(g, 0.12, 0.95, 0.12, '#4a3220', px, 0.47, pz);
      for (let y = 0; y < 3; y++) {
        box(g, 1.5, 0.16, 0.06, y % 2 ? '#7a5434' : '#6a4a2a', 0, 0.18 + y * 0.28, -0.72);
        box(g, 0.06, 0.16, 1.5, y % 2 ? '#6a4a2a' : '#7a5434', -0.72, 0.18 + y * 0.28, 0);
        box(g, 0.06, 0.16, 1.5, y % 2 ? '#7a5434' : '#6a4a2a', 0.72, 0.18 + y * 0.28, 0);
        if (y < 2) box(g, 1.5, 0.16, 0.06, '#6a4a2a', 0, 0.18 + y * 0.28, 0.72);
      }
      box(g, 1.36, 0.2 + fill * 0.5, 1.36, '#3a2a1a', 0, 0.1 + (0.2 + fill * 0.5) / 2, 0);
      if (hp.l.length) {
        box(g, 0.3, 0.12, 0.24, '#6a8a3a', -0.3, 0.32 + fill * 0.5, 0.2); box(g, 0.2, 0.1, 0.3, '#c88a4a', 0.25, 0.32 + fill * 0.5, -0.15); box(g, 0.24, 0.08, 0.18, '#d8c070', 0.1, 0.33 + fill * 0.5, 0.35);
        for (let q = 0; q < 4; q++) { const m = new THREE.Mesh(P.box(0.22, 0.22, 0.22), STEAM); m.position.set(Math.cos(q * 1.9) * 0.3, 0.75 + fill * 0.5 + q * 0.28, Math.sin(q * 1.9) * 0.3); g.add(m); }
      }
      batch.addGroup(g, P.mat4(hp.x + 0.5, this.groundTop(hp.x, hp.z) + 1, hp.z + 0.5, 0));
    }
    for (const [k, t0] of Object.entries(all)) {
      const [x, z] = k.split(',').map(Number), t = this.grow(t0, now, k), top = this.groundTop(x, z) + 1;
      const g = new THREE.Group();
      // the tilled earth, darker where it's wet, in furrows
      const wet = this.isWet(t, k, now);
      // (richer soil darker and browner, tired soil pale and sandy)
      const rich = soilOf(t0), mix = (a: number[], b: number[], k: number) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
      const dry = mix([0x7a, 0x60, 0x44], [0x4a, 0x30, 0x1c], rich), damp = mix([0x4e, 0x3a, 0x28], [0x2a, 0x1a, 0x0e], rich);
      box(g, 0.98, 0.07, 0.98, wet ? damp : dry, 0, 0.035, 0);
      for (const fz of [-0.25, 0.25]) box(g, 0.94, 0.05, 0.12, mix(wet ? [0x40, 0x2e, 0x1e] : [0x6a, 0x50, 0x36], [0x20, 0x14, 0x0a], rich), 0, 0.08, fz);
      // dry ground cracks pale; fresh-watered ground shines; a fertiliser shows as what it is, scattered on top
      if (!wet) for (let q = 0; q < 3; q++) box(g, 0.5 + hash(x + q, z) * 0.3, 0.012, 0.025, '#3a2a1a', (hash(z, x + q) - 0.5) * 0.5, 0.075, -0.4 + q * 0.4, 0);
      else if (now < t.wu || this.sprinkled(k)) for (let q = 0; q < 3; q++) { const m = new THREE.Mesh(P.box(0.14, 0.01, 0.1), DROPS); m.position.set((hash(x + q, z + 1) - 0.5) * 0.7, 0.075, (hash(x, z + q) - 0.5) * 0.7); g.add(m); }
      if (t.fz) { const fc = t.fz === 'bone' ? '#ece6d6' : t.fz === 'ash' ? '#9a9a96' : '#2e5a3a'; for (let q = 0; q < 5; q++) box(g, 0.06, 0.02, t.fz === 'weed' ? 0.16 : 0.06, fc, (hash(x + q * 3, z) - 0.5) * 0.8, 0.08, (hash(x, z + q * 3) - 0.5) * 0.8); }
      const c = t.c ? CROP(t.c) : undefined, st = this.stage(t);
      if (c && t.g) {
        if (t.g === k) {
          box(g, 2.6, 0.08, 2.6, c.colors.leaf, 0, 0.1, 0);
          for (let q = 0; q < 6; q++) box(g, 0.9, 0.06, 0.5, c.colors.leaf, Math.cos(q) * 1.1, 0.14, Math.sin(q) * 1.1, 0.2);
          if (c.id === 'cabbage') { for (let q = 0; q < 4; q++) { const w = 2.4 - q * 0.45; box(g, w, 0.5, w, q % 2 ? c.colors.fruit : c.colors.leaf, 0, 0.35 + q * 0.42, 0); } }
          else if (c.id === 'marrow') { box(g, 2.6, 0.95, 1.1, c.colors.fruit, 0, 0.55, 0); for (let q = -2; q <= 2; q++) box(g, 0.14, 0.97, 1.12, '#c8d870', q * 0.5, 0.55, 0); box(g, 0.2, 0.2, 0.2, '#5a5a26', 1.4, 0.7, 0); }
          else g.add(P.pumpkin(c.colors.fruit, 4.4));
        }
      } else if (c && st >= 0) {
        const ripe = st >= 3, thirsty = !wet && !ripe, sc = STAGE_SCALE[st] * (thirsty ? 0.86 : 1), j = (hash(x, z) - 0.5) * 0.2;
        const leaf = thirsty ? mix([0, 1, 2].map((i) => parseInt(c.colors.leaf.slice(1 + i * 2, 3 + i * 2), 16)), [0xa8, 0x98, 0x50], 0.45) : c.colors.leaf;
        switch (c.shape) {
          case 'root':
            for (let q = 0; q < 3; q++) box(g, 0.06, 0.4 * sc, 0.12, leaf, (q - 1) * 0.1, 0.1 + 0.2 * sc, j, (q - 1) * 0.35);
            if (ripe) box(g, 0.22, 0.12, 0.22, c.colors.fruit, 0, 0.12, 0);
            break;
          case 'leafy':
            if (c.id === 'leek') { box(g, 0.14, 0.5 * sc, 0.14, c.colors.fruit, 0, 0.1 + 0.25 * sc, 0); box(g, 0.3, 0.5 * sc, 0.06, leaf, 0, 0.2 + 0.55 * sc, 0, 0.3); }
            else { box(g, 0.5 * sc, 0.38 * sc, 0.5 * sc, ripe ? c.colors.fruit : leaf, 0, 0.1 + 0.2 * sc, 0); box(g, 0.7 * sc, 0.1, 0.7 * sc, leaf, 0, 0.13, 0); }
            break;
          case 'grain':
            for (let q = 0; q < 4; q++) { const hh = 1.1 * sc; box(g, 0.04, hh, 0.04, ripe ? c.colors.fruit : leaf, (q % 2 - 0.5) * 0.3, 0.08 + hh / 2, (Math.floor(q / 2) - 0.5) * 0.3); if (st >= 2) box(g, 0.08, 0.2, 0.08, c.colors.fruit, (q % 2 - 0.5) * 0.3, 0.12 + hh, (Math.floor(q / 2) - 0.5) * 0.3); }
            break;
          case 'berry':
            box(g, 0.6 * sc, 0.3 * sc, 0.6 * sc, leaf, 0, 0.1 + 0.15 * sc, 0);
            if (ripe) for (let q = 0; q < 4; q++) box(g, 0.08, 0.08, 0.08, c.colors.fruit, Math.cos(q * 1.7) * 0.25, 0.38, Math.sin(q * 1.7) * 0.25);
            break;
          case 'bine':
            box(g, 0.08, 2.6, 0.08, '#6a4a2a', 0, 1.35, 0); box(g, 0.32, 2.4 * sc, 0.32, leaf, 0, 0.1 + 1.2 * sc, 0);
            if (ripe) for (let q = 0; q < 5; q++) box(g, 0.12, 0.14, 0.12, c.colors.fruit, Math.cos(q * 2) * 0.2, 0.7 + q * 0.38, Math.sin(q * 2) * 0.2);
            break;
          case 'flower': {
            const kind = FLOWER_OF[c.id]?.sp, bloom = c.colors.fruit;
            if (kind === 'rose') {
              box(g, 0.55 * sc, 0.5 * sc, 0.55 * sc, leaf, 0, 0.1 + 0.25 * sc, 0);
              box(g, 0.4 * sc, 0.3 * sc, 0.4 * sc, leaf, 0.08, 0.15 + 0.5 * sc, -0.05);
              if (st >= 2) for (let q = 0; q < (ripe ? 6 : 3); q++) { const a = q * 1.1 + j, r = 0.2 + (q % 2) * 0.06; box(g, ripe ? 0.13 : 0.07, ripe ? 0.11 : 0.09, ripe ? 0.13 : 0.07, ripe ? bloom : '#5a8a3a', Math.cos(a) * r, 0.25 + 0.5 * sc + (q % 3) * 0.06, Math.sin(a) * r); }
            } else if (kind === 'tulip') {
              for (let q = 0; q < 5; q++) {
                const fx = Math.cos(q * 1.26 + j) * 0.24, fz = Math.sin(q * 1.26 + j) * 0.24, hh = 0.45 * sc + (q % 2) * 0.06;
                box(g, 0.05, 0.22 * sc, 0.12, leaf, fx * 0.8, 0.1 + 0.11 * sc, fz * 0.8, 0.25);
                box(g, 0.03, hh, 0.03, leaf, fx, 0.08 + hh / 2, fz);
                if (st >= 2) { box(g, ripe ? 0.12 : 0.07, ripe ? 0.14 : 0.1, ripe ? 0.12 : 0.07, ripe ? bloom : '#7aa84a', fx, 0.1 + hh, fz); if (ripe) box(g, 0.06, 0.04, 0.06, bloom, fx, 0.19 + hh, fz); }
              }
            } else {
              box(g, 0.7 * sc, 0.1, 0.7 * sc, leaf, 0, 0.12, 0);
              if (st >= 2) for (let q = 0; q < 7; q++) { const a = q * 0.9 + j, r = 0.08 + (q % 3) * 0.1; box(g, ripe ? 0.12 : 0.06, 0.03, ripe ? 0.12 : 0.06, ripe ? (q % 3 === 0 && c.id.endsWith('_yellow') === false ? '#3a2a4a' : bloom) : '#7aa84a', Math.cos(a) * r, 0.2, Math.sin(a) * r); if (ripe) box(g, 0.04, 0.035, 0.04, '#e8c020', Math.cos(a) * r, 0.215, Math.sin(a) * r); }
            }
            break;
          }
          case 'squash':
            box(g, 0.7, 0.08, 0.7, leaf, 0, 0.12, 0);
            if (st >= 2) g.add(P.pumpkin(ripe ? c.colors.fruit : '#7a8a3a', 0.4 + sc * 0.5));
            break;
          default: break;
        }
      }
      batch.addGroup(g, P.mat4(x + 0.5, top, z + 0.5, Math.floor(hash(z, x) * 4) * Math.PI / 2));
    }
    return batch.build(true);
  }
}
