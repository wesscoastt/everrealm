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

/** A shape coloured through, turned and set in place (the rounded and pointed parts the boxes can't make). */
function shaped(g0: THREE.BufferGeometry, sx: number, sy: number, sz: number, x: number, y: number, z: number, color: string, ry = 0, rx = 0, rz = 0, shade = 0.8): Part {
  const g = (g0.index ? g0.toNonIndexed() : g0.clone());
  g.scale(sx, sy, sz);
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ'));
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  _c.set(color);
  const n = g.getAttribute('position').count, col = new Float32Array(n * 3), pos = g.getAttribute('position');
  for (let i = 0; i < n; i++) { const k = pos.getY(i) < y ? shade : 1; col[i * 3] = _c.r * k; col[i * 3 + 1] = _c.g * k; col[i * 3 + 2] = _c.b * k; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('uv');
  if (g.getAttribute('normal')) g.deleteAttribute('normal');
  return g;
}
/** A leaf: pointed at both ends, thin, its upper face lit and its underside darker. */
const LEAF = new THREE.OctahedronGeometry(1, 0);
/** A berry's drupelet, or a round fruit. */
const BEAD = new THREE.IcosahedronGeometry(1, 0);
/** A cane or a twig. */
const STICK = new THREE.CylinderGeometry(1, 1, 1, 5);
/** Mix two hex colours (k from 0 to 1). */
const mixC = (a: string, b: string, k: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();

/**
 * Leaves heaped over a mound, each tilted out from the middle and a shade of its own: a bush that reads as leaves at
 * any distance, not as a block (owner 2026-11-14: "blackberry bushes still roblox looking, flat colour").
 */
function leafMound(p: Part[], r: () => number, n: number, rad: number, hgt: number, len: number, wid: number, dark: string, light: string): void {
  for (let i = 0; i < n; i++) {
    // over a dome: more leaves low and outside, fewer on top
    const a = r() * Math.PI * 2, u = Math.sqrt(r()), d = rad * u, y = hgt * (1 - u * u * 0.85) * (0.55 + r() * 0.45);
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    const col = mixC(dark, light, 0.15 + r() * 0.85 * (y / hgt));
    p.push(shaped(LEAF, wid, 0.012, len, x, y + 0.04, z, col, a + (r() - 0.5) * 0.9, -0.35 - u * 0.5 + (r() - 0.5) * 0.4, (r() - 0.5) * 0.5, 0.62));
  }
}

function bramble(fruit: boolean): Part[] {
  const p: Part[] = [], r = rng(11);
  // a dark heart, so no light shows through the middle of the mound
  p.push(shaped(BEAD, 0.34, 0.24, 0.34, 0, 0.2, 0, '#25451c', 0, 0, 0, 0.7));
  // the leaves, in threes and fives along the canes: dark below, fresher at the top where the light is
  leafMound(p, r, 54, 0.46, 0.62, 0.085, 0.05, '#28501f', '#5e8e3a');
  // canes arching up and out, dark red-brown, a thorn or two on each
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.5, out = 0.26 + r() * 0.12;
    p.push(shaped(STICK, 0.014, 0.5, 0.014, Math.sin(a) * out * 0.5, 0.36, Math.cos(a) * out * 0.5, i % 2 ? '#6a2e2a' : '#58301e', a, 0.9 + r() * 0.3, 0, 0.75));
    p.push(shaped(LEAF, 0.008, 0.008, 0.025, Math.sin(a) * out * 0.7, 0.44, Math.cos(a) * out * 0.7, '#c8a080', a + 1.2, 0.4));
  }
  if (fruit) {
    // fruit in loose clusters on the outside of the mound: ripe black, purple, red not ready, the odd green one
    for (let i = 0; i < 11; i++) {
      const a = r() * Math.PI * 2, h = 0.2 + r() * 0.36, rad = 0.3 + r() * 0.14 - h * 0.12;
      const bx = Math.sin(a) * rad, bz = Math.cos(a) * rad;
      const ripe = i % 5 === 4 ? '#7a9a3a' : i % 4 === 3 ? '#b02a2e' : i % 2 ? '#1c0c22' : '#3e1634';
      // a blackberry is a knot of drupelets: seven beads round one
      for (let k = 0; k < 7; k++) {
        const t = (k / 6) * Math.PI * 2;
        p.push(shaped(BEAD, 0.018, 0.018, 0.018, bx + (k ? Math.cos(t) * 0.02 : 0), h + (k ? Math.sin(t * 2) * 0.012 : 0.012), bz + (k ? Math.sin(t) * 0.02 : 0), ripe, 0, 0, 0, 0.7));
      }
      // its little green cap where it meets the stalk
      p.push(shaped(LEAF, 0.02, 0.006, 0.02, bx, h + 0.032, bz, '#4a6a2a', r() * 3));
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
  // a low wiry shrub: green twigs standing up through small, round, bright leaves
  for (let i = 0; i < 9; i++) { const a = r() * Math.PI * 2, d = r() * 0.16; p.push(shaped(STICK, 0.01, 0.3 + r() * 0.12, 0.01, Math.sin(a) * d, 0.17, Math.cos(a) * d, i % 3 ? '#4a7a2a' : '#7a4a2a', a, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5, 0.8)); }
  leafMound(p, r, 40, 0.3, 0.36, 0.04, 0.032, '#2e5a28', '#6aa040');
  if (fruit) for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = 0.08 + r() * 0.2;
    // round, dusky, the bloom on them a paler blue
    p.push(shaped(BEAD, 0.034, 0.034, 0.034, Math.sin(a) * d, 0.12 + r() * 0.22, Math.cos(a) * d, i % 3 ? '#2a3466' : '#4a5a92', 0, 0, 0, 0.72));
  }
  return p;
}

function cloudberry(fruit: boolean): Part[] {
  const p: Part[] = [], r = rng(53);
  // broad, crinkled, lobed leaves on short stems, low over the moss: each three lobes round a middle
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, d = 0.13 + r() * 0.07, x = Math.sin(a) * d, z = Math.cos(a) * d, h = 0.07 + r() * 0.06;
    p.push(shaped(STICK, 0.008, h, 0.008, x, h / 2, z, '#5a7a3a'));
    const col = mixC('#3e6e2c', '#6a9a40', r());
    for (let l = 0; l < 3; l++) { const b = a + (l - 1) * 0.9; p.push(shaped(LEAF, 0.06, 0.01, 0.07, x + Math.sin(b) * 0.04, h, z + Math.cos(b) * 0.04, col, b, 0.15 + r() * 0.2)); }
  }
  if (fruit) for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 1, x = Math.sin(a) * 0.07, z = Math.cos(a) * 0.07;
    p.push(shaped(STICK, 0.008, 0.22, 0.008, x, 0.11, z, '#6a7a3a'));
    // the fruit: a knobbly amber cap of drupelets, paler at the top
    for (let k = 0; k < 9; k++) { const t = (k / 8) * Math.PI * 2; p.push(shaped(BEAD, 0.024, 0.024, 0.024, x + (k ? Math.cos(t) * 0.028 : 0), 0.25 + (k ? Math.sin(t * 3) * 0.012 : 0.02), z + (k ? Math.sin(t) * 0.028 : 0), k ? '#e89030' : '#f8c060', 0, 0, 0, 0.75)); }
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

/** A pumpkin vine (owner 2026-11-06: "make the pumpkins harvestable, and grow them round the whole map"): broad leaves along the ground, a curl of vine, and one ripe pumpkin, ribbed, with its stalk; picked, the leaves are left. */
function pumpkinVine(ripe: boolean): Part[] {
  const p: Part[] = [], r = rng(37);
  const leaf = ['#3e6e2a', '#4a7a32', '#557f34', '#36602a'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.5, d = 0.32 + r() * 0.22, s = 0.26 + r() * 0.12;
    p.push(box(s, 0.04, s * 0.9, Math.sin(a) * d, 0.1 + r() * 0.08, Math.cos(a) * d, leaf[i % leaf.length], a, -0.25 + r() * 0.2));
    p.push(box(0.025, 0.12, 0.025, Math.sin(a) * d, 0.05, Math.cos(a) * d, '#4a6a2a'));
  }
  for (let i = 0; i < 5; i++) { const a = i * 0.9; p.push(box(0.035, 0.035, 0.22, Math.sin(a) * 0.5, 0.03, Math.cos(a) * 0.5, '#5a7a32', a + Math.PI / 2)); }
  if (ripe) {
    // ribs: six slices round the middle, a little apart, deep and pale orange in turn
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; p.push(box(0.62, 0.42, 0.2, 0, 0.22, 0, k % 2 ? '#e8801e' : '#d06a14', a)); }
    p.push(box(0.4, 0.46, 0.4, 0, 0.22, 0, '#e07818'));
    p.push(box(0.07, 0.16, 0.07, 0.02, 0.5, 0, '#5a4a22', 0, 0.2));
  }
  return p;
}

const BUILDERS: Record<string, (whole: boolean) => Part[]> = {
  pumpkin: pumpkinVine,
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
