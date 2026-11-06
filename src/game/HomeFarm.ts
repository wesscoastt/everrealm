import * as THREE from 'three';
import { CROP, CROPS, type CropDef } from '../data/farming';
import { ITEMS } from '../data/items';
import type { SkillId } from '../data/items';
import { B } from '../world/blocks';
import type { VoxelWorld } from '../world/VoxelWorld';
import * as P from '../world/props';

// Farming at home (the farming overhaul, owner 2026-11-06: "add farming into the game you can do on a lot, and
// it's a skill"). The garden round your own house: hoe the grass into tilled ground a tile at a time, as much as
// your Farming lets you work (eight tiles to start, sixty-four at the last), and every tile takes its own
// seed. A crop grows on the real clock, at full speed while the ground's wet and half speed when it's dry:
// water it with the can (a few tiles at a go) and it stays wet a while; rain waters the lot. Kept well
// watered, and composted, more comes up. The town patches (game/Farming.ts) are still there for anyone.

export interface GardenHost {
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
}

/** A tilled tile: its crop, how far grown (0..1), when that was worked out, wet until when, composted, and how much of its growing was wet. */
interface Tile { c?: string; p: number; u: number; wu: number; k?: 1; wet: number; all: number }

/** How long a watering keeps the ground wet. */
const WET_MS = 20 * 60000;
const TILLABLE = new Set<number>([B.Grass, B.FlowerGrass, B.Dirt, B.Loam, B.Farmland, B.SnowGrass, B.Path]);
const STAGE_SCALE = [0.3, 0.55, 0.8, 1];

/** How many tiles you can work at a Farming level. */
export const gardenSize = (lv: number) => Math.min(64, 8 + Math.floor(lv / 3) * 2);

export class HomeFarm {
  private drawn: { group: THREE.Group; key: string } | null = null;
  private checkAt = 0;

  constructor(private host: GardenHost) {}

  private tiles(): Record<string, Tile> { const v = this.host.flag('garden'); return v && typeof v === 'object' ? (v as Record<string, Tile>) : {}; }
  private save(t: Record<string, Tile>): void { this.host.setFlag('garden', t); this.host.persist(); }

  /** A tile brought up to now: how far it's grown, wet or dry. */
  private grow(t: Tile, now = Date.now()): Tile {
    const c = t.c ? CROP(t.c) : undefined;
    if (!c || t.p >= 1) return { ...t, u: now };
    const span = Math.max(0, now - t.u);
    const wet = this.host.raining() ? span : Math.max(0, Math.min(now, t.wu) - t.u);
    const dry = span - wet;
    return { ...t, p: Math.min(1, t.p + (wet + dry * 0.5) / (c.minutes * 60000)), u: now, wet: t.wet + wet, all: t.all + span };
  }
  private stage(t: Tile): number { return !t.c ? -1 : t.p >= 1 ? 3 : t.p >= 0.66 ? 2 : t.p >= 0.33 ? 1 : 0; }
  private minsLeft(t: Tile): number { const c = CROP(t.c!)!; const wetNow = this.host.raining() || Date.now() < t.wu; return Math.max(1, Math.ceil(((1 - t.p) * c.minutes) / (wetNow ? 1 : 0.5))); }

  private groundTop(x: number, z: number): number { return this.host.voxels.topSolid(x, z); }
  /** Can this cell be tilled: in your yard, outside the house, open ground of earth or grass. */
  private tillable(x: number, z: number): boolean {
    const g = this.host.garden();
    if (!g) return false;
    const [ya, yb, yc, yd] = g.yard, [ha, hb, hc, hd] = g.house;
    if (x < ya || x > yc || z < yb || z > yd) return false;
    if (x >= ha - 1 && x <= hc + 1 && z >= hb - 1 && z <= hd + 1) return false;
    const top = this.groundTop(x, z);
    return TILLABLE.has(this.host.voxels.get(x, top, z)) && this.host.voxels.get(x, top + 1, z) === B.Air && this.host.voxels.get(x, top + 2, z) === B.Air;
  }

  /** The tile in front of you. */
  private target(): [number, number] {
    const p = this.host.player(), f = this.host.facing();
    return [Math.floor(p.x + Math.sin(f) * 1.1), Math.floor(p.z + Math.cos(f) * 1.1)];
  }

  // ---------------------------------------------------------------- Working it
  candidates(): { label: string; pos: THREE.Vector3; use: () => void; warn?: string }[] {
    const g = this.host.garden();
    if (!g) return [];
    const me = this.host.player();
    if (me.x < g.yard[0] - 2 || me.x > g.yard[2] + 2 || me.z < g.yard[1] - 2 || me.z > g.yard[3] + 2) return [];
    const [x, z] = this.target(), key = x + ',' + z, all = this.tiles(), here = all[key];
    const at = new THREE.Vector3(x + 0.5, this.groundTop(x, z) + 1.2, z + 0.5);
    const out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string }[] = [];
    if (!here) {
      if (!this.tillable(x, z)) return [];
      const used = Object.keys(all).length, max = gardenSize(this.host.level('farming'));
      if (this.host.count('hoe') < 1) out.push({ label: 'Till the ground', pos: at, use: () => this.host.system('You need a hoe. Bertram Sowerby sells them, by Hollin Ford\'s west garden.'), warn: 'Needs a hoe' });
      else if (used >= max) out.push({ label: `Till the ground (${used} of ${max})`, pos: at, use: () => this.host.system(`You can work ${max} tiles of ground at your Farming. More as you learn.`), warn: 'No more for now' });
      else out.push({ label: `Till the ground (${used + 1} of ${max})`, pos: at, use: () => this.till(x, z) });
      return out;
    }
    const t = this.grow(here), st = this.stage(t), c = t.c ? CROP(t.c) : undefined;
    if (!c) {
      const s = this.bestSeed();
      if (s) out.push({ label: `Plant ${s.name.toLowerCase()}`, pos: at, use: () => this.plant(x, z, s) });
      else out.push({ label: 'Tilled ground', pos: at, use: () => this.host.system('It wants seed. Bertram Sowerby sells it, by Hollin Ford\'s west garden.'), warn: 'No seed for it' });
      return out;
    }
    if (st >= 3) { out.push({ label: `Harvest the ${c.name.toLowerCase()}`, pos: at, use: () => this.harvest(x, z) }); return out; }
    const wet = this.host.raining() || Date.now() < t.wu;
    if (!wet && this.host.count('watering_can') > 0) out.push({ label: `Water the ${c.name.toLowerCase()}`, pos: at, use: () => this.water(x, z) });
    else if (!t.k && this.host.count('compost') > 0) out.push({ label: `Add compost (${c.name.toLowerCase()})`, pos: at, use: () => this.compost(x, z) });
    else out.push({ label: `${c.name}, ripe in ${this.minsLeft(t)} min${wet ? '' : ', dry'}`, pos: at, use: () => this.host.system(`${c.name}: ripe in about ${this.minsLeft(t)} minutes.${wet ? ' The ground\'s wet.' : ' The ground\'s dry: it grows at half speed till it\'s watered.'}${t.k ? ' Composted.' : ''}`), warn: wet ? undefined : 'Dry' });
    return out;
  }

  private bestSeed(): CropDef | undefined {
    const lv = this.host.level('farming');
    return [...CROPS].reverse().find((c) => c.patch === 'allotment' && c.level <= lv && this.host.count(c.seed) > 0);
  }

  private till(x: number, z: number): void {
    const all = this.tiles();
    if (all[x + ',' + z] || !this.tillable(x, z) || Object.keys(all).length >= gardenSize(this.host.level('farming'))) return;
    all[x + ',' + z] = { p: 0, u: Date.now(), wu: 0, wet: 0, all: 0 };
    this.save(all);
    this.host.addXp('farming', 8);
    this.host.sound('chop');
    this.refresh();
  }

  private plant(x: number, z: number, c: CropDef): void {
    const all = this.tiles(), t = all[x + ',' + z];
    if (!t || t.c || !this.host.take(c.seed, 1)) return;
    all[x + ',' + z] = { c: c.id, p: 0, u: Date.now(), wu: t.wu, wet: 0, all: 0 };
    this.save(all);
    this.host.addXp('farming', c.xpPlant);
    this.host.sound('click');
    this.refresh();
  }

  /** The can: this tile and the planted ones next to it. */
  private water(x: number, z: number): void {
    const all = this.tiles(), now = Date.now();
    let n = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const k = (x + dx) + ',' + (z + dz), t = all[k];
      if (!t || !t.c) continue;
      all[k] = { ...this.grow(t, now), wu: now + WET_MS };
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
    all[x + ',' + z] = { ...this.grow(t), k: 1 };
    this.save(all);
    this.host.addXp('farming', 4);
    this.host.sound('click');
  }

  private harvest(x: number, z: number): void {
    const all = this.tiles(), t0 = all[x + ',' + z];
    if (!t0?.c) return;
    const t = this.grow(t0), c = CROP(t.c!)!;
    if (this.stage(t) < 3) return;
    const lv = this.host.level('farming'), tended = t.all > 0 && t.wet / t.all >= 0.75;
    // a tile's share of a patch's crop, more for good keeping
    const n = Math.max(1, Math.round((c.yield[0] + Math.random() * (c.yield[1] - c.yield[0])) / 3) + Math.floor((lv - c.level) / 20) + (t.k ? 1 : 0) + (tended ? 1 : 0));
    this.host.give(c.produce, n);
    this.host.addXp('farming', c.xpPick * n);
    if (Math.random() < (t.k ? 0.35 : 0.2)) this.host.give(c.seed, 1);
    all[x + ',' + z] = { p: 0, u: Date.now(), wu: t.wu, wet: 0, all: 0 };
    this.save(all);
    this.host.sound('pickup');
    this.host.system(`${n} ${ITEMS[c.produce]?.name.toLowerCase() ?? c.produce}${tended ? ', well watered' : ''}${t.k ? ', composted' : ''}.`);
    this.refresh();
  }

  // ---------------------------------------------------------------- Drawing it
  update(dt: number): void {
    if ((this.checkAt -= dt) > 0) return;
    this.checkAt = 2;
    const g = this.host.garden(), me = this.host.player();
    const near = !!g && Math.hypot((g.yard[0] + g.yard[2]) / 2 - me.x, (g.yard[1] + g.yard[3]) / 2 - me.z) < 110;
    const all = this.tiles(), now = Date.now(), raining = this.host.raining();
    const key = near ? Object.entries(all).map(([k, t]) => { const u = this.grow(t, now); return `${k}:${u.c ?? ''}:${this.stage(u)}:${raining || now < u.wu ? 1 : 0}`; }).join('|') : '';
    if (this.drawn && this.drawn.key === key) return;
    if (this.drawn) { this.host.scene.remove(this.drawn.group); this.drawn = null; }
    if (!near || !key) return;
    const group = this.draw(all, now, raining);
    this.host.scene.add(group);
    this.drawn = { group, key };
  }
  private refresh(): void { this.checkAt = 0; if (this.drawn) this.drawn.key = '!'; }

  private draw(all: Record<string, Tile>, now: number, raining: boolean): THREE.Group {
    const batch = new P.Batcher();
    const box = (g: THREE.Group, w: number, h: number, d: number, c: string, x: number, y: number, z: number, rz = 0) => { const m = new THREE.Mesh(P.box(w, h, d), P.flat(c)); m.position.set(x, y, z); m.rotation.z = rz; g.add(m); };
    const hash = (x: number, z: number) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
    for (const [k, t0] of Object.entries(all)) {
      const [x, z] = k.split(',').map(Number), t = this.grow(t0, now), top = this.groundTop(x, z) + 1;
      const g = new THREE.Group();
      // the tilled earth, darker where it's wet, in furrows
      const wet = raining || now < t.wu;
      box(g, 0.98, 0.07, 0.98, wet ? '#3a2818' : '#5e4128', 0, 0.035, 0);
      for (const fz of [-0.25, 0.25]) box(g, 0.94, 0.05, 0.12, wet ? '#2e2014' : '#4e3520', 0, 0.08, fz);
      const c = t.c ? CROP(t.c) : undefined, st = this.stage(t);
      if (c && st >= 0) {
        const sc = STAGE_SCALE[st], ripe = st >= 3, j = (hash(x, z) - 0.5) * 0.2;
        switch (c.shape) {
          case 'root':
            for (let q = 0; q < 3; q++) box(g, 0.06, 0.4 * sc, 0.12, c.colors.leaf, (q - 1) * 0.1, 0.1 + 0.2 * sc, j, (q - 1) * 0.35);
            if (ripe) box(g, 0.22, 0.12, 0.22, c.colors.fruit, 0, 0.12, 0);
            break;
          case 'leafy':
            if (c.id === 'leek') { box(g, 0.14, 0.5 * sc, 0.14, c.colors.fruit, 0, 0.1 + 0.25 * sc, 0); box(g, 0.3, 0.5 * sc, 0.06, c.colors.leaf, 0, 0.2 + 0.55 * sc, 0, 0.3); }
            else { box(g, 0.5 * sc, 0.38 * sc, 0.5 * sc, ripe ? c.colors.fruit : c.colors.leaf, 0, 0.1 + 0.2 * sc, 0); box(g, 0.7 * sc, 0.1, 0.7 * sc, c.colors.leaf, 0, 0.13, 0); }
            break;
          case 'grain':
            for (let q = 0; q < 4; q++) { const hh = 1.1 * sc; box(g, 0.04, hh, 0.04, ripe ? c.colors.fruit : c.colors.leaf, (q % 2 - 0.5) * 0.3, 0.08 + hh / 2, (Math.floor(q / 2) - 0.5) * 0.3); if (st >= 2) box(g, 0.08, 0.2, 0.08, c.colors.fruit, (q % 2 - 0.5) * 0.3, 0.12 + hh, (Math.floor(q / 2) - 0.5) * 0.3); }
            break;
          case 'berry':
            box(g, 0.6 * sc, 0.3 * sc, 0.6 * sc, c.colors.leaf, 0, 0.1 + 0.15 * sc, 0);
            if (ripe) for (let q = 0; q < 4; q++) box(g, 0.08, 0.08, 0.08, c.colors.fruit, Math.cos(q * 1.7) * 0.25, 0.38, Math.sin(q * 1.7) * 0.25);
            break;
          case 'bine':
            box(g, 0.08, 2.6, 0.08, '#6a4a2a', 0, 1.35, 0); box(g, 0.32, 2.4 * sc, 0.32, c.colors.leaf, 0, 0.1 + 1.2 * sc, 0);
            if (ripe) for (let q = 0; q < 5; q++) box(g, 0.12, 0.14, 0.12, c.colors.fruit, Math.cos(q * 2) * 0.2, 0.7 + q * 0.38, Math.sin(q * 2) * 0.2);
            break;
          case 'squash':
            box(g, 0.7, 0.08, 0.7, c.colors.leaf, 0, 0.12, 0);
            if (st >= 2) g.add(P.pumpkin(ripe ? c.colors.fruit : '#7a8a3a', 0.4 + sc * 0.5));
            break;
          default: break;
        }
      }
      batch.addGroup(g, P.mat4(x + 0.5, top, z + 0.5, c ? hash(z, x) * 6 : 0));
    }
    return batch.build(true);
  }
}
