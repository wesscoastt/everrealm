import * as THREE from 'three';
import { shade, Vox, VOX_MAT, type Paint } from '../entities/vox';
import { realmNow } from '../world/clock';
import { heightAt, regionAt, SEA, type RegionId } from '../world/terrain';

// Birds in the sky, the same for everyone: each patch of land keeps its own flocks, and where every
// bird is comes from the realm's clock (which the server keeps for everyone) and the patch it belongs
// to, so two players looking up at the same field see the same crows turning over it without a word
// passing between them. Gulls over the coasts and the sea, crows and starlings over the fields, hawks
// high over the moors, ravens in the cold north, geese crossing in a V. All in cubes, wings beating
// (a hawk mostly glides); they roost after dark. Drawn as a few instanced meshes per kind.

type Kind = 'gull' | 'crow' | 'starling' | 'hawk' | 'raven' | 'goose';
interface Flock { key: string; kind: Kind; ax: number; az: number; alt: number; r: number; speed: number; n: number; phase: number; dir: number; cross: boolean }

const CELL = 150;
const hash = (a: number, b: number, s: number) => { let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

/** What flies where: by the region, and whether the patch is over the sea. */
function kindFor(reg: RegionId, sea: boolean, roll: number): Kind | null {
  if (sea) return roll < 0.75 ? 'gull' : null;
  if (roll < 0.07) return 'goose';
  switch (reg) {
    case 'saltwind': case 'gannet': case 'keys': case 'bright': return roll < 0.6 ? 'gull' : 'crow';
    case 'starfall': case 'kell': case 'tolmen': case 'sunder': return roll < 0.5 ? 'hawk' : 'raven';
    case 'held': case 'greywaste': case 'wrath': return roll < 0.6 ? 'raven' : 'crow';
    case 'glassflats': case 'redstone': return roll < 0.5 ? 'hawk' : null;
    default: return roll < 0.45 ? 'crow' : roll < 0.8 ? 'starling' : 'hawk';
  }
}

const SIZE: Record<Kind, { count: [number, number]; alt: [number, number]; speed: number; flap: number; amp: number; span: number }> = {
  gull: { count: [3, 7], alt: [10, 26], speed: 7, flap: 7, amp: 0.55, span: 1 },
  crow: { count: [4, 9], alt: [12, 24], speed: 8, flap: 11, amp: 0.7, span: 0.8 },
  starling: { count: [14, 26], alt: [10, 20], speed: 10, flap: 18, amp: 0.8, span: 0.45 },
  hawk: { count: [1, 2], alt: [30, 50], speed: 6, flap: 5, amp: 0.15, span: 1.15 },
  raven: { count: [2, 5], alt: [18, 34], speed: 7, flap: 8, amp: 0.6, span: 1 },
  goose: { count: [7, 11], alt: [28, 40], speed: 11, flap: 6, amp: 0.6, span: 1.2 },
};

const feathers = (hex: string): Paint => (_x, _y, z, n) => shade(hex, 0.9 + n * 0.14 - (Math.floor(z * 40) % 2 ? 0.05 : 0));

/** A bird's body (with head, beak and tail) and its left wing (the right is the same, mirrored). */
function buildBird(kind: Kind): { body: THREE.BufferGeometry; wing: THREE.BufferGeometry } {
  const b = new Vox(1 / 24, true), w = new Vox(1 / 24, true);
  const look: Record<Kind, { body: string; head: string; wing: string; tip: string; beak: string; L: number }> = {
    gull: { body: '#f4f2ec', head: '#f4f2ec', wing: '#a8b0b8', tip: '#1a1a1e', beak: '#e8c040', L: 0.5 },
    crow: { body: '#1a1a20', head: '#1a1a20', wing: '#22222a', tip: '#16161c', beak: '#2a2a2a', L: 0.38 },
    starling: { body: '#2a2a34', head: '#2a2a34', wing: '#3a3448', tip: '#2a2430', beak: '#d8c040', L: 0.2 },
    hawk: { body: '#8a5a32', head: '#6a4a2a', wing: '#7a5030', tip: '#3a2414', beak: '#e8c040', L: 0.55 },
    raven: { body: '#141418', head: '#141418', wing: '#1a1a22', tip: '#101014', beak: '#202020', L: 0.48 },
    goose: { body: '#8a8478', head: '#1e1e1e', wing: '#7a7468', tip: '#3a3630', beak: '#2a2a2a', L: 0.6 },
  };
  const c = look[kind], s = SIZE[kind].span;
  b.ellipsoid([0, 0, 0], [0.07 * s, 0.065 * s, 0.17 * s], feathers(c.body));
  if (kind === 'goose') b.capsule([0, 0.02, 0.12], [0, 0.1, 0.28], 0.04, 0.035, feathers(c.head)); // the long black neck
  const hz = kind === 'goose' ? 0.3 : 0.16 * s, hy = kind === 'goose' ? 0.11 : 0.04 * s;
  b.ellipsoid([0, hy, hz], [0.05 * s, 0.05 * s, 0.055 * s], feathers(c.head));
  if (kind === 'goose') b.ellipsoid([0, hy - 0.02, hz + 0.01], [0.045, 0.03, 0.03], feathers('#f0ece0')); // the white chinstrap
  b.cone([0, hy - 0.005, hz + 0.04 * s], [0, hy - 0.015, hz + 0.1 * s], 0.022 * s, feathers(c.beak));
  b.tri([-0.06 * s, 0, -0.14 * s], [0.06 * s, 0, -0.14 * s], [0, 0, -0.27 * s], 0.03, feathers(c.tip)); // the tail
  const L = c.L * s;
  w.tri([0, 0, -0.07 * s], [0, 0, 0.08 * s], [L, 0, -0.03 * s], 0.035, (x, y, z, n) => (x > L * 0.7 ? shade(c.tip, 0.92 + n * 0.1) : feathers(c.wing)(x, y, z, n)));
  return { body: b.mesh().geometry, wing: w.mesh().geometry };
}

export class Birds {
  private flocks = new Map<string, Flock>();
  private meshes = new Map<Kind, { body: THREE.InstancedMesh; wingL: THREE.InstancedMesh; wingR: THREE.InstancedMesh }>();
  private checkAt = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler(0, 0, 0, 'YXZ');
  private v = new THREE.Vector3();
  private one = new THREE.Vector3(1, 1, 1);
  private mirror = new THREE.Vector3(-1, 1, 1);
  private wq = new THREE.Quaternion();
  private wm = new THREE.Matrix4();

  constructor(private scene: THREE.Scene) {
    for (const k of Object.keys(SIZE) as Kind[]) {
      const g = buildBird(k), cap = 64;
      const mk = (geo: THREE.BufferGeometry) => { const im = new THREE.InstancedMesh(geo, VOX_MAT, cap); im.count = 0; im.frustumCulled = false; im.castShadow = false; scene.add(im); return im; };
      this.meshes.set(k, { body: mk(g.body), wingL: mk(g.wing), wingR: mk(g.wing) });
    }
  }

  /** Keep the flocks over the land round the player, and move every bird. `night` 0..1 (they roost after dark). */
  update(dt: number, P: THREE.Vector3, night: number): void {
    if ((this.checkAt -= dt) <= 0) {
      this.checkAt = 3;
      const cx0 = Math.floor(P.x / CELL), cz0 = Math.floor(P.z / CELL), want = new Set<string>();
      for (let cz = cz0 - 2; cz <= cz0 + 2; cz++) for (let cx = cx0 - 2; cx <= cx0 + 2; cx++) {
        const key = cx + ',' + cz;
        want.add(key);
        if (this.flocks.has(key) || hash(cx, cz, 901) > 0.6) continue;
        const ax = (cx + 0.2 + hash(cx, cz, 902) * 0.6) * CELL, az = (cz + 0.2 + hash(cx, cz, 903) * 0.6) * CELL;
        const ground = heightAt(Math.floor(ax), Math.floor(az)), sea = ground <= SEA + 1;
        const kind = kindFor(regionAt(ax, az).a, sea, hash(cx, cz, 904));
        if (!kind) continue;
        const sz = SIZE[kind];
        this.flocks.set(key, {
          key, kind, ax, az,
          alt: Math.max(ground, SEA) + sz.alt[0] + hash(cx, cz, 905) * (sz.alt[1] - sz.alt[0]),
          r: 18 + hash(cx, cz, 906) * 40, speed: sz.speed * (0.85 + hash(cx, cz, 907) * 0.3),
          n: Math.round(sz.count[0] + hash(cx, cz, 908) * (sz.count[1] - sz.count[0])),
          phase: hash(cx, cz, 909) * 100, dir: hash(cx, cz, 910) < 0.5 ? 1 : -1, cross: kind === 'goose',
        });
      }
      for (const k of [...this.flocks.keys()]) if (!want.has(k)) this.flocks.delete(k);
    }
    const counts = new Map<Kind, number>();
    for (const m of this.meshes.values()) { m.body.count = 0; m.wingL.count = 0; m.wingR.count = 0; }
    if (night > 0.55) return;
    const T = realmNow() / 1000;
    for (const f of this.flocks.values()) {
      const sz = SIZE[f.kind], me = this.meshes.get(f.kind)!;
      for (let i = 0; i < f.n; i++) {
        const at = (t: number, out: THREE.Vector3) => {
          if (f.cross) {
            // Geese cross the patch in a line, a V behind the leader, and come round again
            const L = CELL * 2.4, d = (((t * f.speed + f.phase * 10) % L) + L) % L - L / 2;
            const side = i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2);
            const back = Math.abs(side) * 1.6, ang = f.phase;
            return out.set(f.ax + Math.cos(ang) * (d - back) - Math.sin(ang) * side * 1.6, f.alt + Math.sin(t * 0.7 + i) * 0.3, f.az + Math.sin(ang) * (d - back) + Math.cos(ang) * side * 1.6);
          }
          // The rest wheel over the patch, each bird a little apart and drifting in and out
          const a = f.dir * (t * f.speed) / f.r + f.phase + i * (f.kind === 'starling' ? 0.06 : 0.35);
          const r = f.r * (1 + Math.sin(t * 0.13 + i) * (f.kind === 'starling' ? 0.15 : 0.25)) + Math.sin(i * 2.3) * 3;
          return out.set(f.ax + Math.cos(a) * r, f.alt + Math.sin(t * 0.4 + i * 1.3) * 2.5 + Math.cos(i * 1.7) * 1.5, f.az + Math.sin(a) * r * 0.75 + Math.cos(a * 2) * 6);
        };
        const p = at(T, new THREE.Vector3()), ahead = at(T + 0.2, this.v);
        const yaw = Math.atan2(ahead.x - p.x, ahead.z - p.z), climb = Math.atan2(ahead.y - p.y, Math.hypot(ahead.x - p.x, ahead.z - p.z));
        const bank = f.cross ? 0 : -f.dir * 0.35;
        this.q.setFromEuler(this.e.set(-climb, yaw, bank));
        const idx = counts.get(f.kind) ?? 0;
        if (idx >= 64) continue;
        counts.set(f.kind, idx + 1);
        this.m.compose(p, this.q, this.one);
        me.body.setMatrixAt(idx, this.m);
        // Wings: up and down on their hinges at the shoulders; a hawk holds them out and only now and then beats
        const beat = f.kind === 'hawk' ? (Math.sin(T * 0.6 + i) > 0.7 ? Math.sin(T * sz.flap + i) * 0.6 : 0.08) : Math.sin(T * sz.flap + i * 1.7) * sz.amp;
        for (const [im, sd] of [[me.wingL, 1], [me.wingR, -1]] as const) {
          this.wq.setFromEuler(this.e.set(0, 0, sd * beat));
          this.wm.compose(this.v.set(0, 0.02, 0), this.wq, sd > 0 ? this.one : this.mirror);
          im.setMatrixAt(idx, this.m.clone().multiply(this.wm));
        }
      }
    }
    for (const [k, me] of this.meshes) {
      const n = counts.get(k) ?? 0;
      for (const im of [me.body, me.wingL, me.wingR]) { im.count = n; im.instanceMatrix.needsUpdate = true; }
    }
  }
}
