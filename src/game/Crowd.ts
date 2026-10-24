import * as THREE from 'three';
import { Appearance, Humanoid } from '../entities/humanoid';
import { characterDetail } from '../entities/lod';
import { VoxelWorld } from '../world/VoxelWorld';
import { B, isSolid } from '../world/blocks';
import type { Door } from '../world/Doors';
import { heightAt } from '../world/terrain';

// Townsfolk on the streets. They aren't anyone in particular, but each has a front door: they come
// out of their houses of a morning, walk the paved streets from one stretch to the next, stop to look
// about, step aside for the player, go into the shops on errands, and say something now and then as
// you pass. At the end of the day they come out of the shops and workshops and walk home; of an
// evening some go to the inn first, and late on they come out of it and find their own doors. Doors
// open for them as they come (world/Doors.ts) and they go in by them. A capital is busy and a hamlet
// is quiet. They're made near the player and dropped once the player has left the town.

/** What a street is paved with: walkers only ever set foot on these. */
const STREET = new Set<number>([B.Cobble, B.StoneBrick, B.MossyCobble, B.Path, B.Gravel]);
const MAX_WALKERS = 56;
const MAX_SHOWN = 20;
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

/** A swinging house door as the townsfolk use it: the middle of the doorway, and which way is out. */
interface Doorway { door: Door; x: number; z: number; nx: number; nz: number; y: number; role: string }

function doorwayOf(d: Door): Doorway {
  const nx = Math.sin(d.open), nz = Math.cos(d.open);
  // The hinge is on the jamb, 0.42 along the wall from the doorway's middle (see interiors.openDoorPlace)
  return { door: d, x: d.hinge.x + nz * 0.42 + nx * 0.05, z: d.hinge.z - nx * 0.42 + nz * 0.05, nx, nz, y: d.hinge.y, role: d.role ?? 'home' };
}

/** Where people work (interiors.Role): they come out of these at the end of the day. */
const WORK = new Set(['shop', 'workshop', 'office', 'bank', 'store']);

/** What someone says on their way somewhere. */
const BOUND = {
  work: ['Late again. He\'ll stop it out of my wages.', 'Bread first, then the shop.', 'If the cart\'s not loaded by nine, I\'m not loading it.'],
  home: ['That\'s me done for the day.', 'Supper, bed, then all of it again tomorrow.', 'My feet finished an hour before I did.'],
  inn: ['Just the one. I mean it this time.', 'If he\'s singing again, I\'m not stopping.', 'It was my round last night. I remember that much.'],
  late: ['Quiet. She\'ll hear us.', 'Who moved the street?', 'Good night. No, I said good night already.'],
};
type Bound = keyof typeof BOUND;

interface Pt { x: number; z: number; y: number }

const DIRS8: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const K = (x: number, z: number) => (x + 8192) * 16384 + (z + 8192);
const KX = (k: number) => Math.floor(k / 16384) - 8192;
const KZ = (k: number) => (k % 16384) - 8192;

class Walker {
  readonly pos = new THREE.Vector3();
  target: { x: number; z: number } | null = null;
  heading = Math.random() * Math.PI * 2;
  wait = Math.random() * 3;
  yaw = 0;
  speed = 1.2 + Math.random() * 0.6;
  chat = 20 + Math.random() * 60;
  stuck = 0;
  /** Their own front door. */
  home: Doorway | null = null;
  /** The door they're making for (home, the inn, a shop on an errand), if any. */
  goal: Doorway | null = null;
  /** Where they're walking to by the streets, and the way (null until it's worked out; empty once there). */
  dest: { x: number; z: number } | null = null;
  path: Pt[] | null = null;
  tries = 0;
  /** On their way in somewhere: not counted among those out and about. */
  leaving = false;
  /** Walking straight through a doorway, and whether that's in (then they're gone) or out. */
  through: { x: number; z: number }[] | null = null;
  goingIn = false;
  bound: Bound | null = null;
  constructor(readonly model: Humanoid, public zone: CrowdZone) {}
}

/** The paved cells of a town, found a few rows at a time once its chunks have loaded. */
interface Survey { cells: number[]; row: number; at: number }

export class Crowd {
  private walkers: Walker[] = [];
  private surveys = new Map<CrowdZone, Survey>();
  private ways = new Map<CrowdZone, { list: Doorway[]; at: number }>();
  private wayOf = new WeakMap<Door, Doorway>();
  private pool: Humanoid[] = [];
  private spawnT = 0;
  private clock = 0;
  private chatT = 0;
  private routeT = 0;
  private inAt = new Map<CrowdZone, number>();

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly voxels: VoxelWorld,
    private readonly zones: CrowdZone[],
    /** Show a line someone says over their head. */
    private readonly say: (pos: THREE.Vector3, height: number, text: string) => void,
    /** The swinging doors built round the player just now. */
    private readonly doors: () => Iterable<Door> = () => [],
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

  /** Any firm, dry ground clear for two blocks above and a step or less from y: its height, or null. */
  private footing(x: number, z: number, y: number): number | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (!this.voxels.isLoaded(ix, iz)) return null;
    const g = this.voxels.groundBelow(ix + 0.5, y + 1.6, iz + 0.5);
    if (Math.abs(g - y) > 1.1) return null;
    const a = this.voxels.get(ix, g, iz);
    if (isSolid(a) || a === B.Water || isSolid(this.voxels.get(ix, g + 1, iz))) return null;
    return g;
  }

  /** Whether someone can walk straight from a to b, shoulders and all (and on the paving, if `paved`). */
  private straight(a: Pt, b: Pt, paved: boolean): boolean {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.35);
    if (!n) return true;
    const sx = (-dz / d) * 0.28, sz = (dx / d) * 0.28;
    let y = a.y;
    for (let s = 1; s <= n; s++) {
      const x = a.x + (dx * s) / n, z = a.z + (dz * s) / n;
      const g = this.footing(x, z, y);
      if (g === null || this.footing(x + sx, z + sz, y) === null || this.footing(x - sx, z - sz, y) === null) return false;
      if (paved && !STREET.has(this.voxels.get(Math.floor(x), g - 1, Math.floor(z)))) return false;
      y = g;
    }
    return true;
  }

  /** The way on foot from where w stands to (tx, tz): by the streets where there are any, round walls and water. */
  private route(w: Walker, tx: number, tz: number): Pt[] | null {
    const zone = w.zone, lim = zone.r + 16;
    const sx = Math.floor(w.pos.x), sz = Math.floor(w.pos.z), gx = Math.floor(tx), gz = Math.floor(tz);
    const start = K(sx, sz), goal = K(gx, gz);
    const best = new Map<number, number>(), from = new Map<number, number>(), high = new Map<number, number>();
    const closed = new Set<number>(), foot = new Map<number, number>();
    const ground = (x: number, z: number, y: number): number | null => {
      // (looked up from each height it's come at: a terrace is a step from one side and a wall from the other)
      const k = K(x, z) * 512 + y;
      let g = foot.get(k);
      if (g === undefined) foot.set(k, (g = this.footing(x + 0.5, z + 0.5, y) ?? -1));
      return g < 0 ? null : g;
    };
    const heap: { f: number; k: number }[] = [];
    const push = (f: number, k: number) => {
      heap.push({ f, k });
      for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p].f <= heap[i].f) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        for (let i = 0; ;) {
          const l = i * 2 + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l].f < heap[m].f) m = l;
          if (r < heap.length && heap[r].f < heap[m].f) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
        }
      }
      return top.k;
    };
    const h = (x: number, z: number) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); };
    best.set(start, 0); high.set(start, Math.round(w.pos.y));
    push(h(sx, sz), start);
    let found = false;
    for (let n = 0; heap.length && n < 5000; n++) {
      const k = pop();
      if (k === goal) { found = true; break; }
      if (closed.has(k)) continue;
      closed.add(k);
      const x = KX(k), z = KZ(k), y = high.get(k)!, c = best.get(k)!;
      for (const [dx, dz] of DIRS8) {
        const nx = x + dx, nz = z + dz;
        if (Math.hypot(nx - zone.x, nz - zone.z) > lim) continue;
        const g = ground(nx, nz, y);
        if (g === null) continue;
        // No cutting a corner: both cells beside a diagonal step must be clear
        if (dx && dz && (ground(x + dx, z, y) === null || ground(x, z + dz, y) === null)) continue;
        const paved = STREET.has(this.voxels.get(nx, g - 1, nz));
        const nk = K(nx, nz), nc = c + (dx && dz ? 1.41 : 1) * (paved ? 1 : 2.2) + (g !== y ? 0.4 : 0);
        if (nc >= (best.get(nk) ?? Infinity)) continue;
        best.set(nk, nc); from.set(nk, k); high.set(nk, g);
        push(nc + h(nx, nz), nk);
      }
    }
    if (!found) return null;
    const cells: (Pt & { paved: boolean })[] = [];
    for (let k: number | undefined = goal; k !== undefined && k !== start; k = from.get(k)) {
      const x = KX(k), z = KZ(k), y = high.get(k)!;
      cells.push({ x: x + 0.5, z: z + 0.5, y, paved: STREET.has(this.voxels.get(x, y - 1, z)) });
    }
    cells.reverse();
    // Straighten it: from each point straight on to the furthest one in clear line (and keep to the paving where it did)
    const out: Pt[] = [];
    let at: Pt = { x: w.pos.x, z: w.pos.z, y: w.pos.y };
    for (let i = 0; i < cells.length;) {
      let j = Math.min(cells.length - 1, i + 8);
      while (j > i && !this.straight(at, cells[j], cells.slice(i, j + 1).every((c) => c.paved))) j--;
      out.push(cells[j]); at = cells[j]; i = j + 1;
    }
    return out;
  }

  /** The town's swinging doors, looked over again every few seconds as the buildings round the player change. */
  private doorways(zone: CrowdZone): Doorway[] {
    let e = this.ways.get(zone);
    if (!e || this.clock - e.at > 4) {
      const list: Doorway[] = [];
      for (const d of this.doors()) {
        if (Math.hypot(d.hinge.x - zone.x, d.hinge.z - zone.z) > zone.r + 4) continue;
        let dw = this.wayOf.get(d);
        if (!dw) this.wayOf.set(d, (dw = doorwayOf(d)));
        list.push(dw);
      }
      this.ways.set(zone, (e = { list, at: this.clock }));
    }
    return e.list;
  }

  /** A door within reach of (x, z) that suits: the nearest, or any. */
  private pickDoor(zone: CrowdZone, x: number, z: number, reach: number, suits: (d: Doorway) => boolean, nearest = false): Doorway | null {
    const c = this.doorways(zone).filter((d) => Math.hypot(d.x - x, d.z - z) < reach && suits(d) && this.voxels.isLoaded(d.x, d.z));
    if (!c.length) return null;
    return nearest ? c.reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b)) : pick(c);
  }

  /** The ground just outside a doorway, if someone can stand there. */
  private stepOut(d: Doorway): Pt | null {
    const x = d.x + d.nx, z = d.z + d.nz;
    const g = this.footing(x, z, d.y);
    return g === null ? null : { x: Math.floor(x) + 0.5, z: Math.floor(z) + 0.5, y: g };
  }

  /** Make for a door and go in by it. */
  private makeFor(w: Walker, d: Doorway | null, bound: Bound | null): void {
    w.leaving = true;
    w.goal = d;
    const st = d && this.stepOut(d);
    w.dest = st ? { x: st.x, z: st.z } : null;
    w.path = null; w.tries = 0; w.target = null; w.bound = bound;
  }

  /** Time someone went in: home, or of an evening perhaps to the inn first. */
  private sendIn(w: Walker, hour: number): void {
    const inn = hour >= 18.5 && hour < 23 && Math.random() < 0.45 ? this.pickDoor(w.zone, w.pos.x, w.pos.z, 90, (d) => d.role === 'inn', true) : null;
    const home = w.home && Math.hypot(w.home.x - w.pos.x, w.home.z - w.pos.z) < 70 && this.stepOut(w.home) ? w.home : null;
    this.makeFor(w, inn ?? home ?? this.pickDoor(w.zone, w.pos.x, w.pos.z, 45, (d) => d.role === 'home', true), inn ? 'inn' : hour >= 22 || hour < 4 ? 'late' : 'home');
  }

  /** An errand in the day: into a shop, or calling at someone's house. */
  private errand(w: Walker): void {
    const shop = Math.random() < 0.7;
    const d = this.pickDoor(w.zone, w.pos.x, w.pos.z, 32, (o) => o !== w.home && (shop ? WORK.has(o.role) : o.role === 'home'));
    if (d && this.stepOut(d)) this.makeFor(w, d, null);
  }

  /** A street to walk out to from a door: one of the paved cells near it. */
  private streetNear(zone: CrowdZone, x: number, z: number): { x: number; z: number } | null {
    const cells = this.surveys.get(zone)?.cells ?? [];
    let best: { x: number; z: number } | null = null, bd = Infinity;
    for (let c = 0; c < cells.length; c += 2) {
      const d = Math.hypot(cells[c] + 0.5 - x, cells[c + 1] + 0.5 - z) + Math.random() * 4;
      if (d < bd && d > 2) { bd = d; best = { x: cells[c] + 0.5, z: cells[c + 1] + 0.5 }; }
    }
    return bd < 30 ? best : null;
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

  private add(zone: CrowdZone, x: number, y: number, z: number): Walker {
    const model = this.pool.pop() ?? new Humanoid(townsLook());
    const w = new Walker(model, zone);
    w.pos.set(x, y, z);
    model.root.position.copy(w.pos);
    model.root.visible = true;
    this.scene.add(model.root);
    this.walkers.push(w);
    return w;
  }

  /** Someone already out on the street (as the player comes into town, or somewhere they aren't looking). */
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
      const w = this.add(zone, x, g, z);
      w.home = this.pickDoor(zone, x, z, 60, (d) => d.role === 'home');
      return true;
    }
    return false;
  }

  /**
   * Someone comes out of a door near the player: from home of a morning, from work at the end of the
   * day (and off home), from the inn late on (and home, by a roundabout way), from anywhere between.
   */
  private emerge(zone: CrowdZone, player: THREE.Vector3, hour: number): boolean {
    const free = (d: Doorway) => !this.walkers.some((o) => Math.hypot(o.pos.x - d.x, o.pos.z - d.z) < 2.5);
    const by = (suits: (d: Doorway) => boolean) => this.pickDoor(zone, player.x, player.z, 70, (d) => suits(d) && free(d));
    let from: Doorway | null = null, bound: Bound | null = null;
    if (hour >= 21 || hour < 2) { from = by((d) => d.role === 'inn'); bound = 'late'; }
    else if (hour >= 17) { from = by((d) => WORK.has(d.role)); bound = 'home'; }
    else if (hour >= 6 && hour < 10) { from = by((d) => d.role === 'home'); bound = 'work'; }
    if (!from) { from = by(() => true); bound = null; }
    const out = from && this.stepOut(from);
    if (!from || !out) return false;
    const home = from.role === 'home' ? from : this.pickDoor(zone, from.x, from.z, 80, (d) => d.role === 'home' && d !== from && !!this.stepOut(d));
    const street = bound === 'late' || bound === 'home' ? null : this.streetNear(zone, out.x, out.z);
    if (!street && !(home && bound)) return false;
    const w = this.add(zone, from.x - from.nx * 1.1, from.y, from.z - from.nz * 1.1);
    w.home = home;
    w.yaw = Math.atan2(from.nx, from.nz);
    w.model.root.rotation.y = w.yaw;
    // A moment indoors while the door swings, then out
    w.wait = 0.5;
    w.through = [{ x: from.x, z: from.z }, { x: out.x, z: out.z }];
    if (street) { w.dest = street; w.bound = bound; }
    else this.makeFor(w, home, bound);
    return true;
  }

  private drop(i: number): void {
    const w = this.walkers[i];
    this.scene.remove(w.model.root);
    if (this.pool.length < 16) this.pool.push(w.model);
    this.walkers.splice(i, 1);
  }

  /** Someone else close ahead of w, on the way to (nx, nz). */
  private inTheWay(w: Walker, nx: number, nz: number): boolean {
    return this.walkers.some((o) => o !== w && !o.through && Math.hypot(o.pos.x - nx, o.pos.z - nz) < 0.9 && Math.hypot(o.pos.x - w.pos.x, o.pos.z - w.pos.z) > Math.hypot(o.pos.x - nx, o.pos.z - nz));
  }

  update(dt: number, player: THREE.Vector3, camera: THREE.Vector3, hour: number, paused = false): void {
    // Who should be out, town by town
    const share = Crowd.share(hour);
    this.spawnT -= dt;
    this.clock += dt;
    for (const zone of this.zones) {
      const d = Math.hypot(player.x - zone.x, player.z - zone.z);
      const want = d < zone.r + 90 ? Math.round(zone.n * share) : 0;
      if (!want) { this.surveys.delete(zone); this.ways.delete(zone); }
      const have = this.walkers.filter((w) => w.zone === zone);
      if (have.length < want && this.walkers.length < MAX_WALKERS) {
        const sv = this.survey(zone, this.clock);
        if (this.spawnT <= 0) {
          // Short of people (just come into town): put them about the streets out of sight. After that
          // they come out of their doors where the player can see, one at a time.
          const short = have.length < want * 0.6 || d > zone.r + 20;
          if ((!short && this.emerge(zone, player, hour)) || this.spawn(zone, player, d > zone.r + 20, sv.cells)) this.spawnT = short ? 0.05 : 1 + Math.random() * 2;
        }
      } else {
        const out = have.filter((w) => !w.leaving);
        if (out.length > want) {
          // Someone out of sight just goes in; someone in view walks home first (or to the inn)
          const far = out.find((w) => w.pos.distanceTo(player) > 40);
          if (far) this.drop(this.walkers.indexOf(far));
          else if ((this.inAt.get(zone) ?? 0) <= this.clock) { this.sendIn(pick(out), hour); this.inAt.set(zone, this.clock + 1.5); }
        }
      }
    }

    // One way worked out at a time: a long one is a few milliseconds
    this.routeT -= dt;
    if (this.routeT <= 0) {
      const w = this.walkers.find((o) => o.dest && !o.path && !o.through && o.model.root.visible);
      if (w && w.dest) {
        this.routeT = 0.15;
        const path = this.route(w, w.dest.x, w.dest.z);
        if (path) w.path = path;
        else if (w.goal && ++w.tries < 3) {
          // No way to that door from here: another near by
          const g = this.pickDoor(w.zone, w.pos.x, w.pos.z, 40, (d) => d !== w.goal && (w.leaving && !w.bound ? true : d.role === 'home'), true);
          const st = g && this.stepOut(g);
          w.goal = g; w.dest = st ? { x: st.x, z: st.z } : null;
        } else { w.goal = null; w.dest = null; w.path = null; if (!w.bound) w.leaving = false; }
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
      const dp = Math.hypot(w.pos.x - player.x, w.pos.z - player.z);
      w.model.root.visible = dc <= cut;
      // Gone in somewhere where nobody saw: no need to walk them to the door
      if (w.leaving && !w.through && (!w.dest || !w.model.root.visible) && dp > 30) { this.drop(i); continue; }
      if (!w.model.root.visible) continue;
      let speed = 0;
      if (!paused) {
        if (w.wait > 0) w.wait -= dt;
        else if (w.through) {
          // Through the doorway, straight: the door has opened for them
          const p = w.through[0];
          const dx = p.x - w.pos.x, dz = p.z - w.pos.z, dist = Math.hypot(dx, dz);
          if (dist < 0.15) {
            w.through.shift();
            if (!w.through.length) { w.through = null; if (w.goingIn) { this.drop(i); continue; } }
          } else {
            const step = Math.min(dist, w.speed * 0.8 * dt);
            w.pos.x += (dx / dist) * step; w.pos.z += (dz / dist) * step;
            speed = w.speed * 0.8; w.yaw = Math.atan2(dx, dz);
          }
        } else if (dp < 1.3) { w.wait = 0.6; w.yaw = Math.atan2(player.x - w.pos.x, player.z - w.pos.z); }
        else if (w.dest && !w.path) { /* working out the way */ }
        else if (w.path) {
          if (!w.path.length) {
            // There: in at the door, or out on the street to walk about
            const g = w.goal;
            w.path = null; w.dest = null;
            if (g) { w.through = [{ x: g.x, z: g.z }, { x: g.x - g.nx * 1.1, z: g.z - g.nz * 1.1 }]; w.goingIn = true; }
          } else {
            const p = w.path[0];
            const dx = p.x - w.pos.x, dz = p.z - w.pos.z, dist = Math.hypot(dx, dz);
            if (dist < 0.25) w.path.shift();
            else {
              const step = Math.min(dist, w.speed * dt);
              const nx = w.pos.x + (dx / dist) * step, nz = w.pos.z + (dz / dist) * step;
              const g = this.footing(nx, nz, w.pos.y);
              // Someone in the way: wait a moment; if they don't shift, squeeze past
              if (this.inTheWay(w, nx, nz) && w.stuck++ < 6) w.wait = 0.3 + Math.random() * 0.5;
              else if (g === null) { if (++w.stuck > 12) { w.stuck = 0; w.path = null; } }
              else { w.pos.x = nx; w.pos.z = nz; speed = w.speed; w.yaw = Math.atan2(dx, dz); w.stuck = 0; }
            }
          }
        }
        else if (!w.target) this.chooseTarget(w);
        else {
          const dx = w.target.x - w.pos.x, dz = w.target.z - w.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.3) {
            w.target = null;
            if (hour >= 8 && hour < 18 && Math.random() < 0.07) this.errand(w);
            else if (Math.random() < 0.35) w.wait = 1.5 + Math.random() * 5; // a look at the shop fronts
          } else {
            const step = Math.min(dist, w.speed * dt);
            const nx = w.pos.x + (dx / dist) * step, nz = w.pos.z + (dz / dist) * step;
            const g = this.standable(nx, nz, w.pos.y + 1.6);
            // Someone in the way: wait a moment, then find another way round
            if (this.inTheWay(w, nx, nz)) { w.wait = 0.4 + Math.random() * 0.8; if (Math.random() < 0.5) { w.target = null; w.heading += Math.PI * (0.5 + Math.random()); } }
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

      // Overheard in passing (and where they're off to, if they're off somewhere)
      w.chat -= dt;
      if (!paused && dp < 5 && w.chat <= 0 && this.chatT <= 0) {
        const lines = w.bound && Math.random() < 0.6 ? BOUND[w.bound] : w.zone.lines ? [...COMMON, ...w.zone.lines, ...w.zone.lines] : COMMON;
        this.say(w.pos, 2.3, pick(lines));
        w.chat = 60 + Math.random() * 60;
        this.chatT = 9;
      }
    }
  }

  /** Where each of them is that's about, for the doors to open as they come. */
  movers(): THREE.Vector3[] { return this.walkers.filter((w) => w.model.root.visible).map((w) => w.pos); }

  /** How many townsfolk are out within r of a point (witnesses, for the law). */
  near(p: THREE.Vector3, r: number): number { return this.walkers.filter((w) => w.model.root.parent && w.pos.distanceTo(p) < r).length; }

  /** Everyone indoors (used when the scene changes under them). */
  clear(): void {
    for (let i = this.walkers.length - 1; i >= 0; i--) this.drop(i);
  }

  get count(): number { return this.walkers.length; }
}
