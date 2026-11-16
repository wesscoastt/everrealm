import * as THREE from 'three';
import { CROP, CROPS, seasonRate, type CropDef } from '../data/farming';
import { BETTER, gradeHarvest, keeping } from '../data/quality';
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
export interface Tile { c?: string; p: number; u: number; wu: number; k?: 1; wet: number; all: number; /** The soil's heart, 0 (tired) to 1 (rich): it remembers how it's been kept. */ s?: number; /** The kind last grown in it (for rotating). */ f?: string; /** The fertiliser dug in (data/farmingTwo.ts). */ fz?: Feed; /** Pickings so far, of a crop that bears again. */ r?: number }
/** A sprinkler set in your yard, and the compost heap. */
export interface Sprinkler { x: number; z: number; i: string }
export interface Heap { x: number; z: number; l: number[] }

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
export interface Herd { k: string; x: number; z: number; fed: number; got: number }

/** How many tiles of your own garden you can work at a Farming level. */
export const gardenSize = (lv: number) => Math.min(64, 8 + Math.floor(lv / 3) * 2);

export class HomeFarm {
  private drawn: { group: THREE.Group; key: string } | null = null;
  private checkAt = 0;

  constructor(private host: GardenHost) {}

  herds(): Herd[] { const v = this.host.flag('livestock'); return Array.isArray(v) ? (v as Herd[]) : []; }
  private saveHerds(h: Herd[]): void { this.host.setFlag('livestock', h); this.host.persist(); }
  /** What a herd has ready: its yield over the hours it was fed since you last collected. */
  private ready(h: Herd, now = Date.now()): number {
    const d = HERDS[h.k], from = Math.max(h.got, h.fed), to = Math.min(now, h.fed + FED_MS);
    return to <= from ? 0 : Math.min(d.most, Math.floor((to - from) / (d.every * 60000)) * d.per);
  }
  /** Work done at a herd: what you can do there now. */
  private herdCandidates(): { label: string; pos: THREE.Vector3; use: () => void; warn?: string }[] {
    const me = this.host.player(), out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string }[] = [];
    const list = this.herds();
    list.forEach((h, i) => {
      if (Math.hypot(h.x + 0.5 - me.x, h.z + 0.5 - me.z) > 3) return;
      const d = HERDS[h.k], at = new THREE.Vector3(h.x + 0.5, this.groundTop(h.x, h.z) + 1.4, h.z + 0.5), n = this.ready(h), now = Date.now();
      if (n > 0) { out.push({ label: `Collect from ${d.name} (${ITEMS[d.produce]?.name ?? d.produce} ×${n})`, pos: at, use: () => this.collect(i) }); return; }
      if (now >= h.fed + FED_MS) {
        const grain = FEEDS.find((g) => this.host.count(g) >= d.feed);
        if (grain) out.push({ label: `Feed ${d.name} (${ITEMS[grain]?.name ?? grain} ×${d.feed})`, pos: at, use: () => this.feed(i, grain) });
        else out.push({ label: `${d.name[0].toUpperCase() + d.name.slice(1)} ${d.head > 1 ? 'are' : 'is'} hungry`, pos: at, use: () => this.host.system(`${d.name[0].toUpperCase() + d.name.slice(1)} ${d.head > 1 ? 'want' : 'wants'} ${d.feed} wheat or barley. Grow it in the garden, or buy it.`), warn: 'Needs grain' });
      } else out.push({ label: `${d.name[0].toUpperCase() + d.name.slice(1)}: fed`, pos: at, use: () => this.host.system(`${d.name[0].toUpperCase() + d.name.slice(1)} ${d.head > 1 ? 'are' : 'is'} fed for another ${Math.ceil((h.fed + FED_MS - now) / 60000)} minutes. ${ITEMS[d.produce]?.name ?? d.produce} comes every ${d.every} minutes while ${d.head > 1 ? 'they are' : 'she is'}.`) });
    });
    return out;
  }
  private feed(i: number, grain: string): void {
    const list = this.herds(), h = list[i], d = HERDS[h.k];
    if (!this.host.take(grain, d.feed)) return;
    const now = Date.now();
    list[i] = { ...h, fed: now, got: Math.max(h.got, now) };
    this.saveHerds(list);
    this.host.addXp('farming', 12 * d.feed);
    this.host.sound('click');
  }
  private collect(i: number): void {
    const list = this.herds(), h = list[i], d = HERDS[h.k], n = this.ready(h);
    if (n <= 0 || !this.host.give(d.produce, n)) return;
    const from = Math.max(h.got, h.fed);
    list[i] = { ...h, got: from + Math.ceil(n / d.per) * d.every * 60000 };
    this.saveHerds(list);
    this.host.addXp('farming', 20 * n);
    this.host.sound('pickup');
    this.host.system(`${ITEMS[d.produce]?.name ?? d.produce} ×${n}, from ${d.name}.`);
  }
  private settle(k: string, x: number, z: number): void {
    const d = HERDS[k], list = this.herds();
    if (list.some((h) => h.k === k) || !this.host.take(d.item, 1)) return;
    list.push({ k, x, z, fed: 0, got: Date.now() });
    this.saveHerds(list);
    this.host.sound('discover');
    this.host.system(`${d.name[0].toUpperCase() + d.name.slice(1)} ${d.head > 1 ? 'are' : 'is'} home. Feed ${d.head > 1 ? 'them' : 'her'} grain and ${d.head > 1 ? 'they' : 'she'}'ll give.`);
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
    return { ...t, p: Math.min(1, t.p + ((wet + dry * dryRate) * pace * seasonRate(c, new Date(now))) / (c.minutes * 60000)), u: now, wet: t.wet + wet, all: t.all + span };
  }
  private stage(t: Tile): number { return !t.c ? -1 : t.p >= 1 ? 3 : t.p >= 0.66 ? 2 : t.p >= 0.33 ? 1 : 0; }
  private minsLeft(t: Tile, k?: string): number { const c = CROP(t.c!)!; const wetNow = this.isWet(t, k); return Math.max(1, Math.ceil(((1 - t.p) * c.minutes) / ((wetNow ? 1 : t.fz === 'weed' ? 0.75 : 0.5) * (t.fz === 'ash' ? 1.25 : 1) * seasonRate(c)))); }

  /** Spare produce for the heap: the plain crop you have most of, three at least. */
  private scraps(): string | undefined {
    let best: string | undefined, n = HEAP.per - 1;
    for (const c of CROPS) { const k = this.host.count(c.produce); if (k > n) { best = c.produce; n = k; } }
    return best;
  }
  /** What's done at a sprinkler or the heap, and setting either up in your yard. */
  private yardCandidates(x: number, z: number): { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] {
    const me = this.host.player(), out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string; sub?: string }[] = [];
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
    const yard = this.yardCandidates(x, z);
    if (yard.length) return yard;
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
    return [...CROPS].reverse().find((c) => c.patch === 'allotment' && c.level <= lv && this.host.count(c.seed) > 0);
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
    if (!t0?.c) return false;
    const t = this.grow(t0, Date.now(), x + ',' + z), c = CROP(t.c!)!;
    if (this.stage(t) < 3) return false;
    const lv = this.host.level('farming'), tended = t.all > 0 && t.wet / t.all >= 0.75, group = this.host.groupNearby();
    // a tile's share of a patch's crop, more for good keeping and for good company
    const soil = soilOf(t);
    const n = Math.max(1, Math.round((c.yield[0] + Math.random() * (c.yield[1] - c.yield[0])) / 3) + Math.floor((lv - c.level) / 20) + (t.k ? 1 : 0) + (tended ? 1 : 0) + (group ? 1 : 0) + (this.host.scarecrow() ? 1 : 0) + Math.round((soil - 0.4) * 2.5));
    // how well it was kept decides how much of it comes up fine or prize (data/quality.ts)
    const keep = Math.min(1, keeping({ wetShare: t.all > 0 ? t.wet / t.all : 0, compost: !!t.k, inSeason: seasonRate(c) > 1, levelsOver: lv - c.level, group, scarecrow: this.host.scarecrow() }) + (soil - 0.4) * 0.25 + (t.fz === 'bone' ? 0.25 : 0));
    const [plain, fine, prize] = gradeHarvest(n, keep);
    const [fineId, prizeId] = BETTER[c.produce] ?? [];
    if (plain) this.host.give(c.produce, plain);
    if (fine) this.host.give(fineId ?? c.produce, fine);
    if (prize) this.host.give(prizeId ?? c.produce, prize);
    // (counted for the achievements: data/feats.ts)
    this.host.setFlag('n:harvest', Number(this.host.flag('n:harvest') ?? 0) + 1);
    if (prize) this.host.setFlag('n:prize', Number(this.host.flag('n:prize') ?? 0) + prize);
    // (a public field's tile less than your own garden's: with no cap on them, they were the fastest way up; the XP audit, 2026-11-12)
    this.host.addXp('farming', Math.round(c.xpPick * n * (this.zone(x, z) === 'field' ? 0.35 : 1)));
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
    const me = this.host.player(), now = Date.now(), raining = this.host.raining();
    const all = Object.fromEntries(Object.entries(this.tiles()).filter(([k]) => { const [x, z] = k.split(',').map(Number); return Math.hypot(x - me.x, z - me.z) < 110; }));
    const herds = this.herds().filter((h) => Math.hypot(h.x - me.x, h.z - me.z) < 110);
    const sp = this.sprinklers().filter((s) => Math.hypot(s.x - me.x, s.z - me.z) < 110), hp = this.heap();
    const key = herds.map((h) => h.k + h.x + ',' + h.z).join(';') + '#' + sp.map((s) => `${s.x},${s.z},${s.i}`).join(';') + '#' + (hp ? `${hp.x},${hp.z},${hp.l.length}` : '') + '#' + Object.entries(all).map(([k, t]) => { const u = this.grow(t, now, k); return `${k}:${u.c ?? ''}:${this.stage(u)}:${this.isWet(u, k, now) ? 1 : 0}`; }).join('|');
    if (this.drawn && this.drawn.key === key) return;
    if (this.drawn) { this.host.scene.remove(this.drawn.group); this.drawn = null; }
    if (!key) return;
    this.host.clearGrass?.(Object.keys(all));
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
      if (c && st >= 0) {
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
