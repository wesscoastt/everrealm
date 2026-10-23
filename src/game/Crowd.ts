import * as THREE from 'three';
import { Appearance, Humanoid } from '../entities/humanoid';
import { characterDetail } from '../entities/lod';
import { VoxelWorld } from '../world/VoxelWorld';
import { B } from '../world/blocks';
import { heightAt } from '../world/terrain';

// Townsfolk on the streets. They aren't anyone in particular: they walk the paved streets of a
// town from one stretch to the next, stop to look about, step aside for the player, and now and
// then say something as you pass. A capital is busy and a hamlet is quiet; at night most of them
// have gone in. They're made near the player and dropped once the player has left the town.

/** What a street is paved with: walkers only ever set foot on these. */
const STREET = new Set<number>([B.Cobble, B.StoneBrick, B.MossyCobble, B.Path, B.Gravel]);
const MAX_WALKERS = 44;
const MAX_SHOWN = 16;
const SHOW_DIST = 80;

export interface CrowdZone {
  id: string;
  x: number; z: number;
  /** How far from the centre people walk. */
  r: number;
  /** How many are out in the day. */
  n: number;
  /** Lines only heard here, on top of the common ones. */
  lines?: string[];
}

const COMMON = [
  'Toll\'s gone up a ha\'penny again.',
  'Mind the gutter, it\'s running.',
  'She said Thursday. It is Thursday.',
  'Two marks for that? I\'ll grow my own leeks.',
  'Rain by evening. My knee knows.',
  'Who\'s that? Not from round here.',
  'The Post\'s late. The Post\'s always late.',
  'I told him: slate costs more, but it doesn\'t burn.',
  'Keep left on the bridge. Everyone keeps left.',
  'If you see Absalom, he owes me a shilling.',
  'Fresh loaves by the well, if you\'re quick.',
  'No, the other way. Past the trough.',
  'My cousin\'s on the boats. Says the mackerel are thick this year.',
  'Old Pruett swears he saw a statue turn its head.',
  'They\'ve whitewashed the inn. Looks like a ghost.',
  'Count your change. Always count your change.',
];

const POOLS = {
  skin: ['#f1c9a5', '#e0b090', '#c9946a', '#a8744c', '#8a5a3a', '#6a4430', '#f5d6b8', '#b98258'],
  hair: ['#2a1c12', '#4a2e1a', '#6a4426', '#8a6a3a', '#c8a060', '#a84a22', '#3a3a3a', '#d8d0c0', '#1a1a1e', '#7a5a40'],
  tunic: ['#6a5a3c', '#4a5a6a', '#7a3a2a', '#3a5a3a', '#8a7a5a', '#5a4a6a', '#9a8a6a', '#3a4a5a', '#7a6a4a', '#a0522d', '#556b2f', '#704a5a'],
  trim: ['#c8b080', '#8a6a3a', '#d8d0b8', '#6a4a2a', '#b89a5a'],
  trousers: ['#4a3a2c', '#3a3a3a', '#5a4a3a', '#2e3a4a', '#6a5a44'],
  boots: ['#3a2a1c', '#2a2018', '#4a3424', '#1e1a16'],
  hatColor: ['#5a4a3a', '#7a2a24', '#3a4a3a', '#d8d0c0', '#4a5a6a'],
};
const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

function townsLook(): Appearance {
  const r = Math.random();
  const fem = Math.random() < 0.5;
  return {
    frame: fem ? 'f' : 'm', facial: !fem && Math.random() < 0.4 ? 1 + Math.floor(Math.random() * 8) : 0,
    top: pick([0, 0, 1, 2, 3, 4, 6, 7, ...(fem ? [5, 5] : [])]), shirt: pick(POOLS.trim), legs: pick([0, 0, 1, 3]), hose: pick(POOLS.trim),
    shoes: pick([0, 0, 1, 2]), brows: Math.floor(Math.random() * 4), freckles: Math.random() < 0.15,
    skin: pick(POOLS.skin), hair: pick(POOLS.hair), hairStyle: Math.floor(Math.random() * 13), eyes: pick(['#3a5a7a', '#4a3a2a', '#3a5a3a', '#5a4a3a']),
    tunic: pick(POOLS.tunic), trim: pick(POOLS.trim), trousers: pick(POOLS.trousers), boots: pick(POOLS.boots),
    cape: Math.random() < 0.12 ? pick(POOLS.tunic) : null,
    lashes: fem, apron: Math.random() < 0.18,
    hat: r < 0.18 ? 'cap' : r < 0.3 ? 'kerchief' : r < 0.36 ? 'hood' : 'none', hatColor: pick(POOLS.hatColor),
    build: 0.9 + Math.random() * 0.24, height: 0.9 + Math.random() * 0.16, age: Math.random() < 0.15 ? 0.85 : Math.random() * 0.6,
  };
}

class Walker {
  readonly pos = new THREE.Vector3();
  target: { x: number; z: number } | null = null;
  heading = Math.random() * Math.PI * 2;
  wait = Math.random() * 3;
  yaw = 0;
  speed = 1.2 + Math.random() * 0.6;
  chat = 20 + Math.random() * 60;
  stuck = 0;
  constructor(readonly model: Humanoid, public zone: CrowdZone) {}
}

/** The paved cells of a town, found a few rows at a time once its chunks have loaded. */
interface Survey { cells: number[]; row: number; at: number }

export class Crowd {
  private walkers: Walker[] = [];
  private surveys = new Map<CrowdZone, Survey>();
  private pool: Humanoid[] = [];
  private spawnT = 0;
  private clock = 0;
  private chatT = 0;

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly voxels: VoxelWorld,
    private readonly zones: CrowdZone[],
    /** Show a line someone says over their head. */
    private readonly say: (pos: THREE.Vector3, height: number, text: string) => void,
  ) {}

  /** How many are out at this hour, as a share of the day's number. */
  private static share(hour: number): number {
    if (hour >= 7 && hour < 19) return 1;
    if (hour >= 19 && hour < 21) return 0.55;
    if (hour >= 6 && hour < 7) return 0.5;
    return 0.18;
  }

  /** Paved and clear for two blocks above, at street level (not a wall top or a roof). */
  private standable(x: number, z: number, fromY: number): number | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (!this.voxels.isLoaded(ix, iz)) return null;
    const g = this.voxels.groundBelow(ix + 0.5, fromY, iz + 0.5);
    if (!STREET.has(this.voxels.get(ix, g - 1, iz))) return null;
    if (this.voxels.get(ix, g, iz) !== B.Air || this.voxels.get(ix, g + 1, iz) !== B.Air) return null;
    return g;
  }

  /** A new place to walk to: along the street in roughly the way they were going. */
  private chooseTarget(w: Walker): void {
    const tries = 10;
    for (let i = 0; i < tries; i++) {
      const a = i < 4 ? w.heading + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2;
      const dx = Math.sin(a), dz = Math.cos(a);
      const want = 5 + Math.random() * 18;
      let y = w.pos.y, ok = 0;
      for (let s = 1; s <= want; s++) {
        const g = this.standable(w.pos.x + dx * s, w.pos.z + dz * s, y + 1.6);
        if (g === null || Math.abs(g - y) > 1.1) break;
        y = g; ok = s;
      }
      // Stay inside the town
      const ex = w.pos.x + dx * ok, ez = w.pos.z + dz * ok;
      if (Math.hypot(ex - w.zone.x, ez - w.zone.z) > w.zone.r) continue;
      if (ok >= 4) { w.target = { x: ex, z: ez }; w.heading = a; return; }
    }
    w.target = null;
    w.heading += Math.PI;
    w.wait = 1 + Math.random() * 2;
  }

  /** Look over a few more rows of the town for street to stand on (every other block). */
  private survey(zone: CrowdZone, now: number): Survey {
    let sv = this.surveys.get(zone);
    if (!sv) this.surveys.set(zone, (sv = { cells: [], row: 0, at: now }));
    const rows = Math.ceil(zone.r);
    // Chunks keep arriving as the player comes in: look the town over again now and then
    if (sv.row >= rows && now - sv.at > 20 && sv.cells.length < zone.n * 30) { sv.row = 0; sv.cells = []; }
    for (let k = 0; k < 6 && sv.row < rows; k++, sv.row++) {
      const z = Math.floor(zone.z - zone.r) + sv.row * 2;
      for (let x = Math.floor(zone.x - zone.r); x <= zone.x + zone.r; x += 2) {
        if (Math.hypot(x - zone.x, z - zone.z) > zone.r) continue;
        const h = heightAt(x, z);
        const g = this.standable(x, z, h + 4);
        if (g !== null && Math.abs(g - h) <= 4) sv.cells.push(x, z);
      }
      if (sv.row === rows - 1) sv.at = now;
    }
    return sv;
  }

  private spawn(zone: CrowdZone, player: THREE.Vector3, near: boolean, cells: number[]): boolean {
    if (cells.length === 0) return false;
    for (let i = 0; i < 8; i++) {
      const c = Math.floor(Math.random() * (cells.length / 2)) * 2;
      const x = cells[c] + 0.5, z = cells[c + 1] + 0.5;
      // Not out of thin air right beside the player once they're in town
      if (!near && Math.hypot(x - player.x, z - player.z) < 28) continue;
      if (this.walkers.some((o) => Math.hypot(o.pos.x - x, o.pos.z - z) < 2)) continue;
      const g = this.standable(x, z, heightAt(x, z) + 4);
      if (g === null || Math.abs(g - heightAt(x, z)) > 4) continue;
      const model = this.pool.pop() ?? new Humanoid(townsLook());
      const w = new Walker(model, zone);
      w.pos.set(x, g, z);
      model.root.position.copy(w.pos);
      model.root.visible = true;
      this.scene.add(model.root);
      this.walkers.push(w);
      return true;
    }
    return false;
  }

  private drop(i: number): void {
    const w = this.walkers[i];
    this.scene.remove(w.model.root);
    if (this.pool.length < 16) this.pool.push(w.model);
    this.walkers.splice(i, 1);
  }

  update(dt: number, player: THREE.Vector3, camera: THREE.Vector3, hour: number, paused = false): void {
    // Who should be out, town by town
    const share = Crowd.share(hour);
    this.spawnT -= dt;
    this.clock += dt;
    for (const zone of this.zones) {
      const d = Math.hypot(player.x - zone.x, player.z - zone.z);
      const want = d < zone.r + 90 ? Math.round(zone.n * share) : 0;
      if (!want) { this.surveys.delete(zone); }
      const have = this.walkers.filter((w) => w.zone === zone);
      if (have.length < want && this.walkers.length < MAX_WALKERS) {
        const sv = this.survey(zone, this.clock);
        if (this.spawnT <= 0 && this.spawn(zone, player, d > zone.r + 20, sv.cells)) this.spawnT = 0.05;
      } else if (have.length > want) {
        // Go in somewhere out of sight
        const out = have.find((w) => w.pos.distanceTo(player) > 30);
        if (out) this.drop(this.walkers.indexOf(out));
      }
    }

    this.chatT -= dt;
    // Each figure is a dozen draw calls even far off: only the nearest are drawn (and moved)
    let cut = SHOW_DIST;
    if (this.walkers.length > MAX_SHOWN) cut = Math.min(cut, this.walkers.map((w) => w.pos.distanceTo(camera)).sort((a, b) => a - b)[MAX_SHOWN - 1]);
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const w = this.walkers[i];
      if (!this.voxels.isLoaded(w.pos.x, w.pos.z)) { this.drop(i); continue; }
      const dc = w.pos.distanceTo(camera);
      w.model.root.visible = dc <= cut;
      if (!w.model.root.visible) continue;
      let speed = 0;
      const dp = Math.hypot(w.pos.x - player.x, w.pos.z - player.z);
      if (!paused) {
        if (w.wait > 0) w.wait -= dt;
        else if (!w.target) this.chooseTarget(w);
        else if (dp < 1.3) { w.wait = 0.6; w.yaw = Math.atan2(player.x - w.pos.x, player.z - w.pos.z); }
        else {
          const dx = w.target.x - w.pos.x, dz = w.target.z - w.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.3) {
            w.target = null;
            if (Math.random() < 0.35) w.wait = 1.5 + Math.random() * 5; // a look at the shop fronts
          } else {
            const step = Math.min(dist, w.speed * dt);
            const nx = w.pos.x + (dx / dist) * step, nz = w.pos.z + (dz / dist) * step;
            const g = this.standable(nx, nz, w.pos.y + 1.6);
            // Someone in the way: wait a moment, then find another way round
            const other = this.walkers.find((o) => o !== w && Math.hypot(o.pos.x - nx, o.pos.z - nz) < 0.9 && Math.hypot(o.pos.x - w.pos.x, o.pos.z - w.pos.z) > Math.hypot(o.pos.x - nx, o.pos.z - nz));
            if (other) { w.wait = 0.4 + Math.random() * 0.8; if (Math.random() < 0.5) { w.target = null; w.heading += Math.PI * (0.5 + Math.random()); } }
            else if (g === null || Math.abs(g - w.pos.y) > 1.1) { w.target = null; if (++w.stuck > 6) { w.heading += Math.PI; w.stuck = 0; } }
            else { w.pos.x = nx; w.pos.z = nz; speed = w.speed; w.yaw = Math.atan2(dx, dz); w.stuck = 0; }
          }
        }
      }
      const g = this.voxels.groundBelow(w.pos.x, w.pos.y + 1.2, w.pos.z);
      w.pos.y += (g - w.pos.y) * Math.min(1, dt * 10);
      w.model.setState(speed > 0 ? 'walk' : 'idle');
      w.model.update(dt, speed);
      w.model.root.position.copy(w.pos);
      let dy = w.yaw - w.model.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      w.model.root.rotation.y += dy * Math.min(1, dt * 6);
      characterDetail(w.model.root, dc);

      // Overheard in passing
      w.chat -= dt;
      if (!paused && dp < 5 && w.chat <= 0 && this.chatT <= 0) {
        const lines = w.zone.lines ? [...COMMON, ...w.zone.lines, ...w.zone.lines] : COMMON;
        this.say(w.pos, 2.3, pick(lines));
        w.chat = 60 + Math.random() * 60;
        this.chatT = 9;
      }
    }
  }

  /** Everyone indoors (used when the scene changes under them). */
  /** How many townsfolk are out within r of a point (witnesses, for the law). */
  near(p: THREE.Vector3, r: number): number { return this.walkers.filter((w) => w.model.root.parent && w.pos.distanceTo(p) < r).length; }

  clear(): void {
    for (let i = this.walkers.length - 1; i >= 0; i--) this.drop(i);
  }

  get count(): number { return this.walkers.length; }
}
