import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLANT_KINDS } from './plantKinds';
import { hash2 } from './noise';

// What grows to pick (game: foraging, E), as plants you'd know at a glance (owner 2026-11-05: "blackberries,
// garlic etc have no world asset, need believable plants"): a bramble mound in fruit, black, purple and a
// few still red; wild garlic's broad leaves with white star-heads on stalks; a cluster of chanterelles; a
// bilberry shrub dotted blue; cloudberry leaves with their amber fruit; a clump of jointed samphire. Each
// kind is one geometry with its colours baked in, drawn for every plant of that kind in one go (instanced),
// and a picked one shows stripped (the fruit gone, the heads taken) until it grows back.

/** Where a plant stands and whether it's been picked: GameWorld's forage spots. */
export interface PlantSpot { x: number; y: number; z: number; kind: string; bareUntil: number }

type Part = THREE.BufferGeometry;
const _c = new THREE.Color();

/** A coloured box, turned and set in place. */
function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, ry = 0, rx = 0, rz = 0): Part {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  _c.set(color);
  const n = g.getAttribute('position').count, col = new Float32Array(n * 3);
  // (a touch darker underneath, so the parts read as round)
  const pos = g.getAttribute('position');
  for (let i = 0; i < n; i++) { const k = pos.getY(i) < y ? 0.78 : 1; col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  return g;
}

/** A little seeded random, so every plant of a kind is the same plant (the instances turn and size them). */
function rng(seed: number): () => number { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function bramble(fruit: boolean): Part[] {
  const p: Part[] = [], r = rng(11);
  const leaf = ['#3c6a2c', '#4a7a32', '#36602a', '#527e36'];
  // the mound: leafy clumps heaped over each other
  for (const [x, y, z, s] of [[0, 0.18, 0, 0.62], [0.2, 0.36, -0.08, 0.44], [-0.18, 0.32, 0.14, 0.42], [0.05, 0.5, 0.1, 0.34], [-0.12, 0.22, -0.22, 0.36], [0.26, 0.16, 0.2, 0.32]]) {
    p.push(box(s, s * 0.62, s, x, y, z, leaf[Math.floor(r() * leaf.length)], r() * 3));
  }
  // canes arching out of it, dark red-brown
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; p.push(box(0.045, 0.045, 0.5, Math.sin(a) * 0.32, 0.42, Math.cos(a) * 0.32, '#5a2e2a', a, -0.5)); }
  if (fruit) {
    // fruit in clusters of three: ripe black, purple, and the odd red one not ready
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, h = 0.22 + r() * 0.36, rad = 0.26 + r() * 0.14;
      const bx = Math.sin(a) * rad, bz = Math.cos(a) * rad;
      const ripe = i % 4 === 3 ? '#a82a2a' : i % 2 ? '#24102a' : '#4a1838';
      for (let k = 0; k < 3; k++) p.push(box(0.075, 0.085, 0.075, bx + (k - 1) * 0.06, h + (k % 2) * 0.05, bz + (k % 2 ? 0.04 : -0.03), ripe));
    }
  }
  return p;
}

function garlic(flowers: boolean): Part[] {
  const p: Part[] = [], r = rng(23);
  // broad, pointed, glossy leaves fanning out of the ground
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.4, len = 0.34 + r() * 0.16, lean = 0.55 + r() * 0.35;
    const cx = Math.sin(a) * len * 0.42, cz = Math.cos(a) * len * 0.42;
    p.push(box(0.13, len, 0.018, cx, len * 0.42, cz, i % 2 ? '#3f8a34' : '#4c9a3c', a, lean));
  }
  if (flowers) {
    // stalks with white star-heads, a little ball of flowers on each
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6, sx = Math.sin(a) * 0.08, sz = Math.cos(a) * 0.08, h = 0.46 + r() * 0.14;
      p.push(box(0.025, h, 0.025, sx, h / 2, sz, '#6aa848'));
      for (let k = 0; k < 7; k++) {
        const b = (k / 7) * Math.PI * 2;
        p.push(box(0.045, 0.045, 0.045, sx + Math.sin(b) * 0.05, h + 0.02 + (k % 2) * 0.03, sz + Math.cos(b) * 0.05, '#f6f4ec'));
      }
      p.push(box(0.05, 0.05, 0.05, sx, h + 0.06, sz, '#fbfaf2'));
    }
  }
  return p;
}

function chanterelles(all: boolean): Part[] {
  const p: Part[] = [], r = rng(37);
  const n = all ? 6 : 1;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = i ? 0.1 + r() * 0.16 : 0, s = 0.75 + r() * 0.5;
    const x = Math.sin(a) * d, z = Math.cos(a) * d, h = 0.1 * s;
    p.push(box(0.05 * s, h, 0.05 * s, x, h / 2, z, '#e0a040'));
    // the funnel cap: wide and wavy on top, ridged gold underneath
    p.push(box(0.15 * s, 0.035, 0.15 * s, x, h + 0.01, z, '#d08a24', r()));
    p.push(box(0.19 * s, 0.03, 0.19 * s, x, h + 0.035, z, '#f0b040', r()));
    p.push(box(0.1 * s, 0.02, 0.1 * s, x, h + 0.05, z, '#c8801e', r()));
  }
  // a little moss round them
  p.push(box(0.4, 0.03, 0.34, 0, 0.015, 0, '#5a7a34', 0.3));
  return p;
}

function bilberry(fruit: boolean): Part[] {
  const p: Part[] = [], r = rng(41);
  for (const [x, z, s] of [[0, 0, 0.42], [0.16, 0.1, 0.3], [-0.14, 0.12, 0.28], [0.04, -0.17, 0.3]]) {
    p.push(box(s, s * 0.6, s, x, s * 0.32, z, r() < 0.5 ? '#3a6a34' : '#467a3a', r() * 3));
  }
  // the red-green twigs poking through
  for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2; p.push(box(0.025, 0.2, 0.025, Math.sin(a) * 0.12, 0.3, Math.cos(a) * 0.12, '#7a4a2a', 0, r() * 0.5 - 0.25)); }
  if (fruit) for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = 0.1 + r() * 0.16;
    p.push(box(0.065, 0.065, 0.065, Math.sin(a) * d, 0.16 + r() * 0.18, Math.cos(a) * d, i % 3 ? '#2a3a7a' : '#4a5a9a'));
  }
  return p;
}

function cloudberry(fruit: boolean): Part[] {
  const p: Part[] = [], r = rng(53);
  // broad, crinkled leaves on short stems, low over the moss
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3, d = 0.14 + r() * 0.06, x = Math.sin(a) * d, z = Math.cos(a) * d, h = 0.08 + r() * 0.06;
    p.push(box(0.02, h, 0.02, x, h / 2, z, '#5a7a3a'));
    p.push(box(0.2, 0.025, 0.2, x, h, z, i % 2 ? '#5a8a3a' : '#4e7e34', a, 0.15));
  }
  if (fruit) for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 1, x = Math.sin(a) * 0.08, z = Math.cos(a) * 0.08;
    p.push(box(0.018, 0.2, 0.018, x, 0.1, z, '#6a7a3a'));
    // the fruit: a knobbly amber cap of drupelets
    p.push(box(0.11, 0.1, 0.11, x, 0.24, z, '#f0a040'));
    p.push(box(0.07, 0.04, 0.07, x, 0.3, z, '#f8c060'));
  }
  return p;
}

function samphire(full: boolean): Part[] {
  const p: Part[] = [], r = rng(61);
  // jointed, fleshy green stems, branching like little candelabra
  for (let i = 0; i < (full ? 9 : 5); i++) {
    const a = r() * Math.PI * 2, d = r() * 0.18, x = Math.sin(a) * d, z = Math.cos(a) * d;
    const h1 = (full ? 0.14 : 0.08) + r() * 0.08, h2 = (full ? 0.1 : 0.05) + r() * 0.06;
    p.push(box(0.05, h1, 0.05, x, h1 / 2, z, '#5a9a44'));
    p.push(box(0.04, h2, 0.04, x, h1 + h2 / 2 + 0.01, z, '#7ab858'));
    if (full && i % 2) { const bx = x + 0.05; p.push(box(0.035, h2, 0.035, bx, h1 * 0.7 + h2 / 2, z, '#6aaa4c')); }
  }
  return p;
}

const BUILDERS: Record<string, (whole: boolean) => Part[]> = {
  blackberries: bramble, wild_garlic: garlic, chanterelles, bilberries: bilberry, cloudberries: cloudberry, samphire,
};

export { PLANT_KINDS };

const MAX = 1024;

/** Every forage plant in the loaded world, as one instanced mesh per kind and state. */
export class ForagePlants {
  readonly group = new THREE.Group();
  private meshes = new Map<string, THREE.InstancedMesh>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private v = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor() {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const kind of PLANT_KINDS) for (const whole of [true, false]) {
      const geo = mergeGeometries(BUILDERS[kind](whole))!;
      geo.computeVertexNormals();
      const im = new THREE.InstancedMesh(geo, mat, MAX);
      im.count = 0;
      im.frustumCulled = false;
      im.castShadow = false;
      im.receiveShadow = true;
      this.group.add(im);
      this.meshes.set(kind + (whole ? '' : ':bare'), im);
    }
  }

  /** Put every plant where it stands, whole or picked. */
  sync(spots: Iterable<PlantSpot>, now: number): void {
    const n = new Map<string, number>();
    for (const im of this.meshes.values()) im.count = 0;
    for (const f of spots) {
      const key = f.kind + (f.bareUntil > now ? ':bare' : ''), im = this.meshes.get(key);
      if (!im) continue;
      const i = n.get(key) ?? 0;
      if (i >= MAX) continue;
      const h = hash2(Math.floor(f.x), Math.floor(f.z), 961);
      this.q.setFromAxisAngle(this.up, h * Math.PI * 2);
      const k = 1.15 + h * 0.35;
      this.m.compose(this.v.set(f.x, f.y, f.z), this.q, this.s.set(k, k, k));
      im.setMatrixAt(i, this.m);
      n.set(key, i + 1);
    }
    for (const [key, im] of this.meshes) { im.count = n.get(key) ?? 0; im.visible = im.count > 0; im.instanceMatrix.needsUpdate = true; }
  }
}
