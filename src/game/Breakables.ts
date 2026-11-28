import * as THREE from 'three';
import * as P from '../world/props';
import type { BreakSpot, Site } from '../world/sites';
import type { Particles } from '../systems/Particles';
import type { Sfx } from '../systems/Audio';

// Pots, barrels and crates in the dungeons and delves that burst when you hit them (the dungeon pass, after the
// dark-crawler kit's breakables): a swing that would land on a creature lands on them too, they go to pieces
// with a crack and a spray of splinters or sherds, and now and then there's something inside: a few marks,
// a draught, a heel of bread, a bit of ore. In a group each of you smashes your own (what's inside is yours,
// as with everything else you find down there), and they're whole again a quarter of an hour after.
// The builders in world/sites.ts lay them (Site.breakables); Game hooks the swing (resolveAttack) and the frame.

export interface BreakHost {
  scene: THREE.Scene;
  props: P.PropMaterials;
  particles: Particles;
  sites(): readonly Site[];
  player(): THREE.Vector3;
  sound(name: Sfx, dist: number, vol: number): void;
  /** What was inside: marks (at the dungeon's own level; Game pays them at yours) and items. */
  loot(marks: number, items: string[], at: THREE.Vector3): void;
}

/** How long a smashed one stays smashed (seconds). */
const REGROW = 900;
/** How near they're built and kept (blocks). */
const NEAR = 48, FAR = 64;
const RADIUS: Record<BreakSpot['kind'], number> = { pot: 0.32, barrel: 0.38, crate: 0.42 };
const CHIPS: Record<BreakSpot['kind'], string[]> = { pot: ['#b86a44', '#8a4a30', '#d89a70'], barrel: ['#8a6038', '#5a3e24', '#3a3a3e'], crate: ['#a87a48', '#6a4a2a', '#c89a60'] };

interface Live { spot: BreakSpot; obj: THREE.Object3D; key: string }

const potMats = new Map<string, THREE.Material>();
const potMat = (c: string) => { let m = potMats.get(c); if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); potMats.set(c, m); } return m; };
/** A clay pot: one of three shapes (a squat jar, a tall one, a round one with a lid), terracotta or glazed dark. */
function pot(seed: number): THREE.Group {
  const g = new THREE.Group();
  const shape = seed % 3, glaze = seed % 5 === 0;
  const prof: [number, number][] = shape === 0 ? [[0.0, 0], [0.18, 0], [0.27, 0.12], [0.3, 0.28], [0.24, 0.44], [0.14, 0.5], [0.15, 0.56], [0.0, 0.56]]
    : shape === 1 ? [[0.0, 0], [0.14, 0], [0.22, 0.2], [0.24, 0.5], [0.16, 0.74], [0.11, 0.8], [0.13, 0.86], [0.0, 0.86]]
    : [[0.0, 0], [0.2, 0], [0.3, 0.16], [0.31, 0.3], [0.22, 0.46], [0.0, 0.48]];
  const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  g.add(new THREE.Mesh(geo, potMat(glaze ? '#3a4a5a' : '#b86a44')));
  // a darker band round its shoulder
  const band = prof[Math.floor(prof.length / 2)];
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(band[0] + 0.012, band[0] + 0.012, 0.05, 12, 1, true), potMat(glaze ? '#c8a050' : '#7a3e26')).translateY(band[1]));
  if (shape === 2) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.06, 10), potMat('#7a3e26')).translateY(0.5));
  return g;
}

export class Breakables {
  private live = new Map<string, Live>();
  /** When each smashed one was smashed (by its key), in game seconds. */
  private broken = new Map<string, number>();
  private clock = 0;
  private scanIn = 0;
  private readonly tmp = new THREE.Vector3();
  /** How many have been smashed this session (for the tests). */
  smashed = 0;

  constructor(private host: BreakHost) {}

  private key(s: BreakSpot): string { return `${s.x.toFixed(1)},${s.y},${s.z.toFixed(1)}`; }

  private build(s: BreakSpot): THREE.Object3D {
    const seed = Math.abs(Math.round(s.x * 7 + s.z * 13));
    const g = s.kind === 'pot' ? pot(seed) : s.kind === 'barrel' ? P.barrel(this.host.props) : P.crate(this.host.props, 0.66);
    const b = new P.Batcher();
    b.addGroup(g, P.mat4(s.x, s.y, s.z, s.ry ?? 0));
    const out = b.build(true);
    out.traverse((o) => { (o as THREE.Mesh).receiveShadow = true; });
    return out;
  }

  /** Every frame: build what's near, take down what's far, put back what's had time to be made whole, keep you out of them. */
  update(dt: number): void {
    this.clock += dt;
    const P0 = this.host.player();
    this.scanIn -= dt;
    if (this.scanIn <= 0) {
      this.scanIn = 0.5;
      const want = new Set<string>();
      for (const site of this.host.sites()) {
        if (!site.breakables?.length || Math.abs(site.x - P0.x) > 220 || Math.abs(site.z - P0.z) > 220) continue;
        for (const s of site.breakables) {
          const d = Math.hypot(s.x - P0.x, s.z - P0.z);
          if (d > FAR || Math.abs(s.y - P0.y) > 24) continue;
          const k = this.key(s);
          const when = this.broken.get(k);
          // made whole again only once you're away and it's had its time
          if (when !== undefined) { if (this.clock - when > REGROW && d > 30) this.broken.delete(k); else continue; }
          want.add(k);
          if (!this.live.has(k) && d < NEAR) { const obj = this.build(s); this.host.scene.add(obj); this.live.set(k, { spot: s, obj, key: k }); }
        }
      }
      for (const [k, l] of this.live) if (!want.has(k)) this.drop(l);
    }
    // You can't walk through one: it pushes you back out (a pot's worth, not a wall's)
    for (const l of this.live.values()) {
      const s = l.spot, r = RADIUS[s.kind] + 0.3;
      const dx = P0.x - s.x, dz = P0.z - s.z, d = Math.hypot(dx, dz);
      if (d < r && d > 0.001 && P0.y < s.y + 0.9 && P0.y > s.y - 1) { P0.x = s.x + (dx / d) * r; P0.z = s.z + (dz / d) * r; }
    }
  }

  private drop(l: Live): void {
    this.host.scene.remove(l.obj);
    l.obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    this.live.delete(l.key);
  }

  /**
   * A swing from P facing face (flat, unit), reaching reach: everything it would land on bursts. all: a
   * sweep all round (Cleave), else only what's in front. Returns how many burst.
   */
  strike(P0: THREE.Vector3, face: THREE.Vector3, reach: number, all: boolean): number {
    let n = 0;
    for (const l of [...this.live.values()]) {
      const s = l.spot, dx = s.x - P0.x, dz = s.z - P0.z, d = Math.hypot(dx, dz);
      if (d > reach + RADIUS[s.kind] || Math.abs(s.y - P0.y) > 2.2) continue;
      if (!all && d > 0.9 && (dx * face.x + dz * face.z) / d < Math.cos(1.35)) continue;
      this.burst(l);
      n++;
    }
    return n;
  }

  /** Everything within r of a point bursts (a blast, a charge going through them). */
  blast(at: THREE.Vector3, r: number): number {
    let n = 0;
    for (const l of [...this.live.values()]) if (Math.hypot(l.spot.x - at.x, l.spot.z - at.z) < r && Math.abs(l.spot.y - at.y) < 3) { this.burst(l); n++; }
    return n;
  }

  private burst(l: Live): void {
    const s = l.spot, at = this.tmp.set(s.x, s.y + 0.45, s.z), P0 = this.host.player();
    this.drop(l);
    this.broken.set(l.key, this.clock);
    this.smashed++;
    this.host.particles.debris(at, CHIPS[s.kind], s.kind === 'pot' ? 16 : 20, s.kind === 'pot' ? 3.5 : 4.5);
    this.host.particles.dust(at, 6);
    this.host.sound(s.kind === 'pot' ? 'oreBreak' : 'chop', at.distanceTo(P0), s.kind === 'pot' ? 0.7 : 0.9);
    // What's inside: most hold nothing; a few marks in some, now and then something more
    const r = hash(s.x, s.z, Math.floor(this.clock / REGROW));
    const items: string[] = [];
    let marks = 0;
    if (r < 0.42) marks = 1 + Math.floor(r * 7);
    const r2 = hash(s.z, s.x, 7 + Math.floor(this.clock / REGROW));
    if (r2 < 0.07) items.push('potion_mend');
    else if (r2 < 0.12) items.push('bread');
    else if (r2 < 0.16) items.push(s.kind === 'pot' ? 'wild_garlic' : 'torch');
    else if (r2 < 0.19) items.push(['copper_ore', 'tin_ore', 'iron_ore'][Math.floor(r2 * 1000) % 3]);
    if (marks || items.length) this.host.loot(marks, items, at.clone());
  }

  /** What's built round you now (for the tests). */
  get count(): number { return this.live.size; }
}

function hash(x: number, z: number, k: number): number { const v = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); }
