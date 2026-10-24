import * as THREE from 'three';
import { CROP, CROPS, RAKE_XP, WEED_MINUTES, type CropDef } from '../data/farming';
import { ITEMS } from '../data/items';
import type { SkillId } from '../data/items';
import type { Site } from '../world/sites';
import type { VoxelWorld } from '../world/VoxelWorld';
import * as P from '../world/props';
import type { MapMarker } from '../ui/Hud';

// The farming patches in the running game (data/farming.ts has the crops). Each player has their own
// crop in every patch: what's in it, when it went in, whether it was composted, and how far the weeds
// have got are kept in the save, so the patch at Hollin Ford grows your potatoes and someone else's
// carrots at once. The crops are drawn when you're near, a stage at a time as they grow.

export interface FarmHost {
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
}

export interface Patch { id: string; name: string; kind: 'allotment' | 'orchard'; x0: number; z0: number; x1: number; z1: number }
interface PatchState { c?: string; t?: number; compost?: number; w: number; wt: number }

/** The patches: Hollin Ford's three kitchen gardens, and on every town farm a vegetable patch in the first field and an orchard patch in the second. */
export function farmPatches(sites: Site[]): Patch[] {
  const out: Patch[] = [
    { id: 'hollin-a', name: 'Hollin Ford, the west garden', kind: 'allotment', x0: 116, z0: 167, x1: 122, z1: 171 },
    { id: 'hollin-b', name: 'Hollin Ford, the pit-road garden', kind: 'allotment', x0: 205, z0: 169, x1: 211, z1: 173 },
    { id: 'hollin-c', name: 'Hollin Ford, the east garden', kind: 'allotment', x0: 215, z0: 168, x1: 221, z1: 172 },
  ];
  for (const s of sites) {
    if (!s.id.startsWith('farm-')) continue;
    const name = s.props.find((d) => d.t === 'sign')?.text ?? 'a farm';
    out.push({ id: s.id + '-veg', name: `${name}, the vegetable patch`, kind: 'allotment', x0: s.x - 16, z0: s.z + 7, x1: s.x - 11, z1: s.z + 10 });
    out.push({ id: s.id + '-orchard', name: `${name}, the orchard patch`, kind: 'orchard', x0: s.x - 16, z0: s.z + 19, x1: s.x - 12, z1: s.z + 22 });
  }
  return out;
}

const STAGE_SCALE = [0.3, 0.55, 0.8, 1];

export class Farming {
  private drawn = new Map<string, { group: THREE.Group; key: string }>();
  private checkAt = 0;

  constructor(private host: FarmHost, readonly patches: Patch[]) {}

  // ---------------------------------------------------------------- The state of a patch
  private state(p: Patch): PatchState {
    const s = this.host.flag('farm:' + p.id) as PatchState | undefined;
    return s ?? { w: 3, wt: 0 };
  }
  private save(p: Patch, s: PatchState): void { this.host.setFlag('farm:' + p.id, s); this.host.persist(); }
  /** How weedy it is now: weeds come back to an empty patch a level every few minutes. */
  private weeds(s: PatchState, now = Date.now()): number { return s.c ? 0 : Math.min(3, s.w + Math.floor((now - s.wt) / (WEED_MINUTES * 60000))); }
  /** 0 a seedling .. 3 ripe. */
  private stage(s: PatchState, now = Date.now()): number {
    const c = s.c ? CROP(s.c) : undefined;
    if (!c || s.t === undefined) return -1;
    const f = (now - s.t) / (c.minutes * 60000);
    return f >= 1 ? 3 : f >= 0.66 ? 2 : f >= 0.33 ? 1 : 0;
  }
  private minsLeft(s: PatchState): number { const c = CROP(s.c!)!; return Math.max(1, Math.ceil((s.t! + c.minutes * 60000 - Date.now()) / 60000)); }

  // ---------------------------------------------------------------- Working it
  /** What to press E on: the patch you're standing at, and what it wants. */
  candidates(pos: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void; warn?: string }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void; warn?: string }[] = [];
    for (const p of this.patches) {
      if (pos.x < p.x0 - 1.6 || pos.x > p.x1 + 2.6 || pos.z < p.z0 - 1.6 || pos.z > p.z1 + 2.6) continue;
      const s = this.state(p), at = new THREE.Vector3((p.x0 + p.x1 + 1) / 2, this.groundAt((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2) + 0.8, (p.z0 + p.z1 + 1) / 2);
      const w = this.weeds(s), st = this.stage(s);
      if (w > 0) { out.push({ label: 'Rake the weeds', pos: at, use: () => this.rake(p) }); continue; }
      if (!s.c) {
        const c = this.bestSeed(p);
        if (c) out.push({ label: `Plant ${c.name.toLowerCase()}`, pos: at, use: () => this.plant(p, c) });
        else out.push({ label: p.kind === 'orchard' ? 'An orchard patch, cleared' : 'A patch, cleared and dug', pos: at, use: () => this.host.system(p.kind === 'orchard' ? 'It wants a sapling or a cutting. The seedsman by Hollin Ford\'s west garden sells them.' : 'It wants seed. The seedsman by Hollin Ford\'s west garden sells it.'), warn: 'No seed for it' });
        continue;
      }
      const c = CROP(s.c)!;
      if (st >= 3) { out.push({ label: `Harvest the ${c.name.replace(/^An? /, '').toLowerCase()}`, pos: at, use: () => this.harvest(p) }); continue; }
      if (!s.compost && this.host.count('compost') > 0) out.push({ label: `Add compost (${c.name.toLowerCase()}, ripe in ${this.minsLeft(s)} min)`, pos: at, use: () => this.compost(p) });
      else out.push({ label: `${c.name}, ripe in ${this.minsLeft(s)} min`, pos: at, use: () => this.host.system(`${c.name} in ${p.name}: ripe in about ${this.minsLeft(s)} minutes.${s.compost ? ' Composted.' : ''}`) });
    }
    return out;
  }

  /** The best seed you carry that you can plant here. */
  private bestSeed(p: Patch): CropDef | undefined {
    const lv = this.host.level('farming');
    return [...CROPS].reverse().find((c) => c.patch === p.kind && c.level <= lv && this.host.count(c.seed) > 0);
  }

  private rake(p: Patch): void {
    const s = this.state(p), w = this.weeds(s);
    if (w <= 0) return;
    this.save(p, { w: w - 1, wt: Date.now() });
    this.host.addXp('farming', RAKE_XP);
    this.host.sound('chop');
    if (Math.random() < 0.3) this.host.give('compost', 1);
    if (w - 1 === 0) this.host.system(`${p.name}: clear. Plant it before the weeds come back.`);
    this.refresh(p);
  }

  private plant(p: Patch, c: CropDef): void {
    if (this.host.level('farming') < c.level) { this.host.system(`You need Farming ${c.level} for ${c.name.toLowerCase()}.`); return; }
    if (!this.host.take(c.seed, 1)) return;
    this.save(p, { c: c.id, t: Date.now(), w: 0, wt: Date.now() });
    this.host.addXp('farming', c.xpPlant);
    this.host.sound('click');
    this.host.system(`You plant ${c.name.toLowerCase()} in ${p.name}. Ripe in about ${c.minutes >= 60 ? `${Math.round(c.minutes / 60)} hours` : `${c.minutes} minutes`}.`);
    this.refresh(p);
  }

  private compost(p: Patch): void {
    const s = this.state(p);
    if (!s.c || s.compost || !this.host.take('compost', 1)) return;
    this.save(p, { ...s, compost: 1 });
    this.host.addXp('farming', 4);
    this.host.sound('click');
    this.host.system('You dig the compost in round the roots. More will come up.');
  }

  private harvest(p: Patch): void {
    const s = this.state(p), c = s.c ? CROP(s.c) : undefined;
    if (!c || this.stage(s) < 3) return;
    const lv = this.host.level('farming');
    const n = c.yield[0] + Math.floor(Math.random() * (c.yield[1] - c.yield[0] + 1)) + Math.floor((lv - c.level) / 12) + (s.compost ? 2 : 0);
    this.host.give(c.produce, n);
    this.host.addXp('farming', c.xpPick * n);
    // A seed back, now and then (more often from a composted patch)
    if (Math.random() < (s.compost ? 0.45 : 0.25)) { this.host.give(c.seed, 1); }
    this.save(p, { w: 0, wt: Date.now() });
    this.host.sound('pickup');
    this.host.system(`${n} ${ITEMS[c.produce]?.name.toLowerCase() ?? c.produce} from ${p.name}.`);
    this.refresh(p);
  }

  /** Patches with something ripe in them, for the map. */
  markers(): MapMarker[] {
    const out: MapMarker[] = [];
    for (const p of this.patches) { const s = this.state(p); if (s.c && this.stage(s) >= 3) out.push({ x: (p.x0 + p.x1) / 2, z: (p.z0 + p.z1) / 2, kind: 'task', label: `${CROP(s.c)!.name}: ripe` }); }
    return out;
  }

  // ---------------------------------------------------------------- Drawing it
  update(dt: number): void {
    if ((this.checkAt -= dt) > 0) return;
    this.checkAt = 2;
    const me = this.host.player();
    for (const p of this.patches) {
      const near = Math.hypot((p.x0 + p.x1) / 2 - me.x, (p.z0 + p.z1) / 2 - me.z) < 90 && this.host.voxels.isLoaded(p.x0, p.z0);
      const have = this.drawn.get(p.id);
      if (!near) { if (have) { this.host.scene.remove(have.group); this.drawn.delete(p.id); } continue; }
      const s = this.state(p), key = `${s.c ?? ''}:${this.stage(s)}:${this.weeds(s)}`;
      if (have && have.key === key) continue;
      if (have) this.host.scene.remove(have.group);
      const group = this.draw(p, s);
      this.host.scene.add(group);
      this.drawn.set(p.id, { group, key });
    }
  }

  private refresh(p: Patch): void { const have = this.drawn.get(p.id); if (have) { this.host.scene.remove(have.group); this.drawn.delete(p.id); } this.checkAt = 0; }

  private groundAt(x: number, z: number): number { return this.host.voxels.topSolid(Math.floor(x), Math.floor(z)) + 1; }

  private draw(p: Patch, s: PatchState): THREE.Group {
    const batch = new P.Batcher();
    const add = (g: THREE.Object3D, x: number, z: number, ry = 0) => batch.addGroup(g, P.mat4(x, this.groundAt(x, z), z, ry));
    const box = (g: THREE.Group, w: number, h: number, d: number, c: string, x: number, y: number, z: number, rz = 0) => { const m = new THREE.Mesh(P.box(w, h, d), P.flat(c)); m.position.set(x, y, z); m.rotation.z = rz; g.add(m); };
    const hash = (x: number, z: number) => { const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return v - Math.floor(v); };
    const w = this.weeds(s), st = this.stage(s), c = s.c ? CROP(s.c) : undefined;
    // Weeds: tufts, more of them the longer it's been let go
    if (w > 0) for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) {
      if (hash(x, z) > w / 3) continue;
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) box(g, 0.08, 0.3 + hash(x + k, z) * 0.4, 0.08, k % 2 ? '#5a7a2a' : '#7a8a3a', (hash(z, x + k) - 0.5) * 0.6, 0.2, (hash(x - k, z) - 0.5) * 0.6, (hash(k, x) - 0.5) * 0.6);
      add(g, x + 0.5, z + 0.5);
    }
    if (c && st >= 0) {
      const sc = STAGE_SCALE[st], ripe = st >= 3;
      if (c.patch === 'orchard') {
        // One tree or a row of vine in the middle of the patch
        const cx = (p.x0 + p.x1 + 1) / 2, cz = (p.z0 + p.z1 + 1) / 2;
        const g = new THREE.Group();
        if (c.shape === 'vine') { const v = P.vineRow(propMats(), 4, false); v.scale.set(1, 0.4 + sc * 0.6, 1); if (!ripe) for (const m of [...v.children]) { const mat = (m as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined; if (mat?.color?.getHexString() === '4a2a4a') v.remove(m); } g.add(v); }
        else {
          const h = 1 + sc * 2.4;
          box(g, 0.22 * sc + 0.1, h, 0.22 * sc + 0.1, '#5a3a24', 0, h / 2, 0);
          for (const [dx, dy, dz, r] of [[0, 0, 0, 1.4], [0.6, -0.3, 0.3, 1], [-0.5, -0.2, -0.4, 1.1], [0.2, 0.4, -0.5, 0.9]]) box(g, r * sc * 1.6, r * sc * 1.2, r * sc * 1.6, c.colors.leaf, dx * sc, h + dy * sc, dz * sc);
          if (ripe) for (let k = 0; k < 9; k++) box(g, 0.18, 0.18, 0.18, c.colors.fruit, Math.cos(k * 2.4) * 1.2, h - 0.6 + (k % 3) * 0.3, Math.sin(k * 2.4) * 1.2);
        }
        add(g, cx, cz);
      } else {
        for (let z = p.z0; z <= p.z1; z++) for (let x = p.x0; x <= p.x1; x++) {
          const g = new THREE.Group(), j = (hash(x, z) - 0.5) * 0.2;
          switch (c.shape) {
            case 'root':
              for (let k = 0; k < 3; k++) box(g, 0.06, 0.4 * sc, 0.12, c.colors.leaf, (k - 1) * 0.1, 0.2 * sc, j, (k - 1) * 0.35);
              if (ripe) box(g, 0.22, 0.12, 0.22, c.colors.fruit, 0, 0.05, 0);
              break;
            case 'leafy':
              if (c.id === 'leek') { box(g, 0.14, 0.5 * sc, 0.14, c.colors.fruit, 0, 0.25 * sc, 0); box(g, 0.3, 0.5 * sc, 0.06, c.colors.leaf, 0, 0.55 * sc + 0.1, 0, 0.3); }
              else { box(g, 0.5 * sc, 0.38 * sc, 0.5 * sc, ripe ? c.colors.fruit : c.colors.leaf, 0, 0.2 * sc, 0); box(g, 0.7 * sc, 0.1, 0.7 * sc, c.colors.leaf, 0, 0.08, 0); }
              break;
            case 'grain':
              for (let k = 0; k < 4; k++) { const hh = 1.1 * sc; box(g, 0.04, hh, 0.04, ripe ? c.colors.fruit : c.colors.leaf, (k % 2 - 0.5) * 0.3, hh / 2, (Math.floor(k / 2) - 0.5) * 0.3); if (st >= 2) box(g, 0.08, 0.2, 0.08, c.colors.fruit, (k % 2 - 0.5) * 0.3, hh + 0.05, (Math.floor(k / 2) - 0.5) * 0.3); }
              break;
            case 'berry':
              box(g, 0.6 * sc, 0.3 * sc, 0.6 * sc, c.colors.leaf, 0, 0.15 * sc, 0);
              if (ripe) for (let k = 0; k < 4; k++) box(g, 0.08, 0.08, 0.08, c.colors.fruit, Math.cos(k * 1.7) * 0.25, 0.3, Math.sin(k * 1.7) * 0.25);
              break;
            case 'bine':
              if ((x + z) % 2 === 0) { box(g, 0.08, 2.6, 0.08, '#6a4a2a', 0, 1.3, 0); box(g, 0.32, 2.4 * sc, 0.32, c.colors.leaf, 0, 1.2 * sc, 0); if (ripe) for (let k = 0; k < 5; k++) box(g, 0.12, 0.14, 0.12, c.colors.fruit, Math.cos(k * 2) * 0.2, 0.6 + k * 0.38, Math.sin(k * 2) * 0.2); }
              break;
            case 'squash':
              box(g, 0.7, 0.08, 0.7, c.colors.leaf, 0, 0.05, 0);
              if (st >= 2 && (x + z) % 2 === 0) { const pk = P.pumpkin(ripe ? c.colors.fruit : '#7a8a3a', 0.4 + sc * 0.5); g.add(pk); }
              break;
            default: break;
          }
          add(g, x + 0.5, z + 0.5, hash(z, x) * 6);
        }
      }
    }
    const g = batch.build(true);
    return g;
  }
}

let mats: P.PropMaterials | null = null;
const propMats = () => (mats ??= P.createPropMaterials());
