import * as THREE from 'three';
import { plan, type HiddenChest } from '../world/sites';
import type { VoxelWorld } from '../world/VoxelWorld';
import { regionAt, type RegionId } from '../world/terrain';
import { REGION_ARMOUR } from '../data/armour';
import { REGION_WEAPONS } from '../data/weapons';
import { TREASURE_MAPS } from '../data/wilds';
import type { DropSource } from '../data/gear';

// Hidden chests, the way ESO scatters them (world/sites.ts hideChests places them): find one, pick
// its lock, and take what's inside. Plain chests are easy and hold a little; iron-bound ones more;
// ornate ones take a steady hand and are worth it. Each chest fills again for you a while after
// you've emptied it. You need a lockpick for every lock, and a slip snaps one.

export const TIERS = [
  { name: 'Plain chest', pins: 3, zone: 0.26, speed: 1.0, refill: 20 },
  { name: 'Iron-bound chest', pins: 4, zone: 0.18, speed: 1.25, refill: 30 },
  { name: 'Ornate chest', pins: 5, zone: 0.12, speed: 1.5, refill: 45 },
] as const;

/** Chests placed by hand in Hollindale (the authored valley): the ground under them is found as they load. */
const VALLEY: HiddenChest[] = [
  { id: 9001, x: 78.5, y: -1, z: 258.5, tier: 1, region: 'greenwake', ry: 0.6 },
  { id: 9002, x: 101.5, y: -1, z: 123.5, tier: 0, region: 'greenwake', ry: 2.1 },
  { id: 9003, x: 255.5, y: -1, z: 238.5, tier: 0, region: 'greenwake', ry: 4.0 },
  { id: 9004, x: 230.5, y: -1, z: 112.5, tier: 0, region: 'greenwake', ry: 1.2 },
];

const MATS: Record<RegionId, string[]> = {
  greenwake: ['copper_ore', 'tin_ore', 'oak_logs'], crownroad: ['boar_hide', 'birch_logs', 'tin_ore'], brambledeep: ['elder_logs', 'boar_hide', 'jelly_residue'],
  saltwind: ['crab_shell', 'pine_logs', 'raw_mackerel'], redstone: ['iron_ore', 'copper_ore', 'jelly_residue'], starfall: ['star_crystal', 'iron_ore', 'pine_logs'],
  gannet: ['boar_hide', 'crab_shell', 'pine_logs'], wrath: ['jelly_residue', 'elder_logs', 'raw_trout'], tolmen: ['iron_ore', 'boar_hide', 'pine_logs'],
};

export interface ChestHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  flag(k: string): unknown;
  setFlag(k: string, v?: unknown): void;
  count(item: string): number;
  take(item: string, n?: number): boolean;
  /** Pay out: marks scaled to the region, items rolled for quality from this source. */
  reward(marks: number, items: { id: string; source?: DropSource }[], why: string): void;
  system(text: string): void;
  sound(name: 'open' | 'click' | 'fail' | 'coin' | 'chest' | 'unlock' | 'pickSnap'): void;
  /** The lockpicking: resolves true when the last pin sets, false if you give up or run out of picks. */
  lockpick(tier: 0 | 1 | 2, picks: () => number, snap: () => void): Promise<boolean>;
  known(item: string): boolean;
}

export class Chests {
  private list: HiddenChest[];
  /** Chests drawn now, by id. */
  private shown = new Map<number, THREE.Group>();
  private busy = false;
  private mats = {
    wood: new THREE.MeshLambertMaterial({ color: '#7a5230' }),
    dark: new THREE.MeshLambertMaterial({ color: '#4a3020' }),
    iron: new THREE.MeshLambertMaterial({ color: '#5a5e66' }),
    gold: new THREE.MeshLambertMaterial({ color: '#d8a840', emissive: new THREE.Color('#3a2a08') }),
    red: new THREE.MeshLambertMaterial({ color: '#7a2a2a' }),
  };

  constructor(private readonly host: ChestHost) {
    this.list = [...plan().chests, ...VALLEY];
  }

  get count(): number { return this.list.length; }

  /** Seconds before a chest is full again for you (0: ready). */
  private wait(c: HiddenChest): number {
    const at = Number(this.host.flag('hc:' + c.id) ?? 0);
    return Math.max(0, (at + TIERS[c.tier].refill * 60_000 - Date.now()) / 1000);
  }

  /** Draw the ready chests near you; take away the ones you've emptied or walked far from. */
  update(): void {
    const P = this.host.player();
    for (const c of this.list) {
      const near = Math.abs(c.x - P.x) < 80 && Math.abs(c.z - P.z) < 80;
      const g = this.shown.get(c.id);
      if (near && !g && this.wait(c) === 0 && this.host.voxels.isLoaded(c.x, c.z)) {
        const y = c.y >= 0 ? c.y : this.host.voxels.groundBelow(c.x, 120, c.z);
        const m = this.model(c.tier);
        m.position.set(c.x, y, c.z);
        m.rotation.y = c.ry;
        this.host.scene.add(m);
        this.shown.set(c.id, m);
      } else if (g && (!near || this.wait(c) > 0)) {
        this.host.scene.remove(g);
        this.shown.delete(c.id);
      }
    }
  }

  /** Press E on a chest close by. */
  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const [id, g] of this.shown) {
      const d = Math.hypot(g.position.x - p.x, g.position.z - p.z);
      if (d > 2.2 || Math.abs(g.position.y - p.y) > 2) continue;
      const c = this.list.find((x) => x.id === id)!;
      out.push({ label: `Pick the lock (${TIERS[c.tier].name.toLowerCase()})`, pos: g.position.clone().add(new THREE.Vector3(0, 0.6, 0)), use: () => void this.open(c) });
    }
    return out;
  }

  private async open(c: HiddenChest): Promise<void> {
    if (this.busy) return;
    if (this.host.count('lockpick') < 1) { this.host.system('You need a lockpick. General traders and smiths sell them.'); this.host.sound('fail'); return; }
    this.busy = true;
    const ok = await this.host.lockpick(c.tier, () => this.host.count('lockpick'), () => { this.host.take('lockpick', 1); this.host.sound('pickSnap'); });
    this.busy = false;
    if (!ok) return;
    this.host.setFlag('hc:' + c.id, Date.now());
    this.host.setFlag('chestsOpened', Number(this.host.flag('chestsOpened') ?? 0) + 1);
    this.host.sound('unlock');
    setTimeout(() => this.host.sound('chest'), 320);
    this.loot(c);
    this.update();
  }

  /** What's inside: marks, the region's materials, now and then its gear or a treasure map. */
  private loot(c: HiddenChest): void {
    const reg = c.region ?? regionAt(c.x, c.z).a;
    const items: { id: string; source?: DropSource }[] = [];
    const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
    const mats = MATS[reg] ?? MATS.greenwake;
    const nMats = [1 + Math.floor(Math.random() * 2), 2 + Math.floor(Math.random() * 2), 3][c.tier];
    for (let i = 0; i < nMats; i++) items.push({ id: pick(mats) });
    const gearChance = [0.12, 0.3, 0.7][c.tier];
    const pool = [...(REGION_ARMOUR[reg] ?? []), ...(REGION_WEAPONS[reg] ?? [])];
    if (pool.length && Math.random() < gearChance) items.push({ id: pick(pool), source: (['mob', 'elite', 'boss'] as const)[c.tier] });
    if (Math.random() < [0.06, 0.12, 0.25][c.tier]) {
      const maps = TREASURE_MAPS.filter((m) => m.region === reg && !this.host.known(m.id));
      if (maps.length) items.push({ id: pick(maps).id });
    }
    const marks = [[6, 14], [18, 34], [50, 90]][c.tier];
    this.host.reward(marks[0] + Math.floor(Math.random() * (marks[1] - marks[0] + 1)), items, TIERS[c.tier].name);
  }

  /** A chest: plain boards, iron bands, or dark wood with gilt corners and a lock plate. */
  private model(tier: 0 | 1 | 2): THREE.Group {
    const g = new THREE.Group(), M = this.mats;
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      o.castShadow = true;
      g.add(o);
      return o;
    };
    const body = tier === 2 ? M.dark : M.wood;
    box(0.82, 0.42, 0.52, body, 0, 0.21, 0);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.82, 10, 1, false, 0, Math.PI), body);
    lid.rotation.set(0, 0, Math.PI / 2);
    lid.position.set(0, 0.42, 0);
    lid.castShadow = true;
    g.add(lid);
    if (tier === 0) for (const y of [0.1, 0.32]) box(0.84, 0.03, 0.54, M.dark, 0, y, 0); // board seams
    const band = tier === 2 ? M.gold : M.iron;
    if (tier >= 1) for (const x of [-0.3, 0, 0.3]) { box(0.06, 0.44, 0.54, band, x, 0.22, 0); box(0.06, 0.03, 0.5, band, x, 0.69, 0); }
    if (tier === 2) for (const x of [-0.41, 0.41]) for (const z of [-0.26, 0.26]) box(0.06, 0.44, 0.06, M.gold, x, 0.22, z); // gilt corners
    box(0.14, 0.16, 0.04, tier === 0 ? M.iron : M.gold, 0, 0.4, 0.27); // the lock plate
    if (tier === 2) box(0.5, 0.06, 0.02, M.red, 0, 0.1, 0.265); // a painted band
    return g;
  }
}
