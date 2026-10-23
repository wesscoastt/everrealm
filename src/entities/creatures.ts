import * as THREE from 'three';
import { buildVoxCreature } from './voxcreatures';
import { voxelize } from './voxelize';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildVoxMount, buildVoxWagon, WHEEL_R, type WagonLook } from './voxmounts';

export type CreatureKind = 'wolf' | 'notch' | 'jelly' | 'rustback' | 'deer' | 'rabbit' | 'sheep' | 'chicken' | 'boar' | 'horse' | 'dog' | 'cat' | 'duck' | 'cow' | 'pig'
  | 'shark' | 'eel' | 'ray' | 'medusa'
  /** Morrow's: a lizard, low and long-tailed; a moth the size of a dog, that flies. */
  | 'lizard' | 'moth'
  /** People, not creatures: an Enemy with this body is built from a humanoid (entities/foes.ts). */
  | 'bandit';

/** Body plans that live in the sea: they swim in three dimensions and never come ashore. */
export const SWIM_KINDS: ReadonlySet<CreatureKind> = new Set(['shark', 'eel', 'ray', 'medusa']);

/** Colour overrides so one body plan can serve several regional species. */
/** A horse's breed, past its colours: patches, heavy feet, antlers, horns and wool, a water-horse's weed, a pack pony's load. */
export type Breed = 'pied' | 'shire' | 'elk' | 'ram' | 'kelpie' | 'pack'
  /** Mounts that aren't horses at all (beastMount): the same seat, a different animal under it. */
  | 'cat' | 'sabre' | 'drake' | 'turtle' | 'slabback' | 'strider' | 'griffin' | 'wyrm';
export interface Palette { a?: string; b?: string; c?: string; glow?: boolean; breed?: Breed; /** A second seat behind the saddle (a two-seat mount). */ pillion?: boolean; /** A wagon behind, the animal in its shafts. */ wagon?: WagonLook }
/** What a halter calls (data/items.ts mount): enough to build the model. */
export interface MountLook { coat: string; mane: string; cloth: string; glow?: boolean; breed?: Breed; seats?: number; wagon?: WagonLook & { bed: number } }
export type CreatureAnim = 'idle' | 'walk' | 'run' | 'windup' | 'attack' | 'hit' | 'dead' | 'graze' | 'sit' | 'swim';

const mats = new Map<string, THREE.Material>();
const lam = (c: string, extra: THREE.MeshLambertMaterialParameters = {}) => {
  const key = c + JSON.stringify(extra);
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, ...extra }); mats.set(key, m); }
  return m;
};
/**
 * A horse's surfaces, painted at 16 pixels a face like everything else: a coat with the lie of the
 * hair (and dapples on a grey), a mane in strands, saddle cloth woven with a border, leather with
 * its grain and stitching. Cached by kind and colour.
 */
const horseMats = new Map<string, THREE.MeshLambertMaterial>();
type Surface = 'coat' | 'fur' | 'mane' | 'cloth' | 'leather' | 'shell' | 'scale' | 'wool';
function horseMat(kind: Surface, color: string, extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  const key = kind + color + JSON.stringify(extra);
  const hit = horseMats.get(key);
  if (hit) return hit;
  const N = 16, c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d')!;
  const base = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  let seed = 0;
  for (const ch of key) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const px = (i: number, j: number, dl: number) => { const k = base.clone().offsetHSL(0, 0, dl); x.fillStyle = `#${k.getHexString()}`; x.fillRect(i, j, 1, 1); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let dl = (rnd() - 0.5) * 0.05;
    if (kind === 'coat') {
      // Short hairs lying one way: a darker pixel now and then along a slant, a little sheen on top
      if ((i + j * 2) % 7 === 0) dl -= 0.035;
      dl += (N / 2 - j) * 0.004;
    } else if (kind === 'mane') {
      // Strands: columns, each a shade apart, darker at the roots
      dl = ((i * 7) % 5 - 2) * 0.03 + (j < 3 ? -0.04 : 0) + (rnd() - 0.5) * 0.02;
    } else if (kind === 'cloth') {
      // A woven check, and a pale border round the edge
      dl = ((i + j) % 2 ? 0.02 : -0.02) + (rnd() - 0.5) * 0.02;
      if (i < 2 || j < 2 || i > N - 3 || j > N - 3) dl = i === 0 || j === 0 || i === N - 1 || j === N - 1 ? -0.08 : 0.22;
    } else if (kind === 'fur') {
      // Guard hairs: short streaks down each column, dark and pale ones mixed, darker where each starts
      const o = (i * 7) % 4, run = Math.floor((j + o) / 4);
      const h = ((i * 73856093) ^ (run * 19349663)) >>> 0;
      dl = [-0.1, -0.05, 0, 0.04, 0.08][h % 5] + ((j + o) % 4 === 0 ? -0.03 : 0) + (rnd() - 0.5) * 0.03;
    } else if (kind === 'shell') {
      // Plates of chitin: a dark seam every few pixels, each plate lighter along its top edge
      const pj = j % 4, pi = (i + (Math.floor(j / 4) % 2) * 4) % 8;
      dl = pj === 3 || pi === 7 ? -0.12 : pj === 0 ? 0.08 : (rnd() - 0.5) * 0.04;
    } else if (kind === 'scale') {
      // Overlapping scales in offset rows, each with a pale lip
      const row = Math.floor(j / 4), ci = (i + (row % 2) * 2) % 4;
      dl = j % 4 === 0 && ci !== 0 ? 0.035 : ci === 0 ? -0.03 : (rnd() - 0.5) * 0.03;
    } else if (kind === 'wool') {
      // Curls: little bright knots on a darker fleece
      dl = ((i * 3 + j * 5) % 8 < 2 ? 0.05 : (i * 3 + j * 5) % 8 === 4 ? -0.12 : -0.05) + (rnd() - 0.5) * 0.05;
    } else {
      // Grain, and a row of stitches a pixel in from the edge
      dl = (rnd() - 0.5) * 0.07;
      if ((i === 1 || j === 1 || i === N - 2 || j === N - 2) && (i + j) % 3 === 0) dl = 0.18;
    }
    px(i, j, dl);
  }
  // Dapples on a grey: paler rings with darker middles
  if (kind === 'coat' && hsl.s < 0.12 && hsl.l > 0.5 && hsl.l < 0.85) {
    for (let k = 0; k < 4; k++) {
      const cx = 2 + Math.floor(rnd() * 12), cy = 2 + Math.floor(rnd() * 12);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(cx + dx, cy + dy, 0.07);
      px(cx, cy, -0.05);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshLambertMaterial({ map: t, ...extra });
  horseMats.set(key, m);
  return m;
}

const rb = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));

/** Narrows a box toward its back (-z) end: to `wide` across and `deep` from the bottom up, keeping the top line. */
function taper(g: THREE.BufferGeometry, wide: number, deep: number): THREE.BufferGeometry {
  g.computeBoundingBox();
  const b = g.boundingBox!, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = (b.max.z - p.getZ(i)) / (b.max.z - b.min.z);
    p.setX(i, p.getX(i) * (1 - (1 - wide) * k));
    p.setY(i, b.max.y - (b.max.y - p.getY(i)) * (1 - (1 - deep) * k));
  }
  p.needsUpdate = true;
  return g;
}

/** Lays a texture on by each face's own position, `perUnit` tiles a block: big parts and small ones get the same size of pixel. */
function boxUV(g: THREE.BufferGeometry, perUnit: number): void {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i) * perUnit, p.getY(i) * perUnit);
    else if (ay >= az) uv.setXY(i, p.getX(i) * perUnit, p.getZ(i) * perUnit);
    else uv.setXY(i, p.getX(i) * perUnit, p.getY(i) * perUnit);
  }
  uv.needsUpdate = true;
}

/** Joins the parts on each joint that share a material into one mesh: a creature is a handful of draw calls, not forty. */
function mergeParts(root: THREE.Object3D, keep: Set<THREE.Object3D>): void {
  const joints: THREE.Object3D[] = [];
  root.traverse((o) => { if (!(o as THREE.Mesh).isMesh) joints.push(o); });
  for (const j of joints) {
    const byMat = new Map<THREE.Material, THREE.Mesh[]>();
    for (const c of j.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || m.children.length || keep.has(m) || !m.visible || Array.isArray(m.material) || m.material.transparent) continue;
      let list = byMat.get(m.material);
      if (!list) byMat.set(m.material, (list = []));
      list.push(m);
    }
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const merged = mergeGeometries(list.map((m) => {
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        m.updateMatrix();
        return g.applyMatrix4(m.matrix);
      }), false);
      if (!merged) continue;
      for (const m of list) { j.remove(m); m.geometry.dispose(); }
      const one = new THREE.Mesh(merged, mat);
      one.castShadow = true;
      j.add(one);
    }
  }
}

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export class CreatureModel {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  legs: THREE.Object3D[] = [];
  head: THREE.Object3D | null = null;
  tail: THREE.Object3D | null = null;
  /** A swimmer's jaw (opens to bite) and its rippling segments (an eel's body, a jellyfish's arms). */
  jaw: THREE.Object3D | null = null;
  segs: THREE.Object3D[] = [];
  /** A wagon's wheels, turned as it rolls. */
  wheels: THREE.Object3D[] = [];
  private phase = Math.random() * 10;
  anim: CreatureAnim = 'idle';
  animTime = 0;
  /** Height above ground of the head, for nameplates. */
  plateHeight = 1.2;
  private flash = 0;
  private flashMats: THREE.MeshLambertMaterial[] = [];
  /** Each flashing material's own glow (eyes, a jellyfish's bell), put back after a hit. */
  private flashBase: THREE.Color[] = [];

  constructor(readonly kind: CreatureKind, private pal: Palette = {}, private extraScale = 1) {
    this.root.add(this.body);
    // The ones you meet up close are sculpted in cubes (entities/voxcreatures.ts); the rest are filled from their smooth build
    if (!buildVoxCreature(this, kind, this.pal, extraScale)) switch (kind) {
      case 'wolf':
      case 'notch': this.buildWolf(kind === 'notch'); break;
      case 'jelly': this.buildJelly(); break;
      case 'rustback': this.buildRustback(); break;
      case 'boar': this.buildBoar(); break;
      case 'deer': this.buildDeer(); break;
      case 'rabbit': this.buildRabbit(); break;
      case 'sheep': this.buildSheep(); break;
      case 'cow': this.buildCow(); break;
      case 'pig': this.buildPig(); break;
      case 'dog': this.buildDog(); break;
      case 'cat': this.buildCat(); break;
      case 'duck': this.buildDuck(); break;
      case 'chicken': this.buildChicken(); break;
      case 'horse': this.buildHorse(); break;
      case 'shark': this.buildShark(); break;
      case 'eel': this.buildEel(); break;
      case 'ray': this.buildRay(); break;
      case 'medusa': this.buildMedusa(); break;
      case 'lizard': this.buildLizard(); break;
      case 'moth': this.buildMoth(); break;
    }
    // Every creature in cubes, the world's own pixel size, joints and all (entities/voxelize.ts)
    voxelize(this.root, kind + JSON.stringify(pal) + extraScale, new Set<THREE.Object3D>([...this.legs, ...this.segs, this.head, this.tail, this.jaw].filter((o): o is THREE.Object3D => !!o)));
    // Texture the plain surfaces (fur, chitin, scales, fleece) so nothing looks moulded out of putty;
    // glowing parts (eyes, a jelly's bell) and see-through ones keep their own look
    const surface: Partial<Record<CreatureKind, Surface>> = { wolf: 'fur', notch: 'fur', boar: 'fur', deer: 'fur', rabbit: 'fur', chicken: 'scale', sheep: 'wool', cow: 'fur', pig: 'fur', dog: 'fur', cat: 'fur', rustback: 'shell', shark: 'scale', eel: 'scale', ray: 'scale', lizard: 'scale', moth: 'fur' };
    const skin = surface[kind];
    if (skin) this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      const mat = m.material as THREE.MeshLambertMaterial;
      if (!m.isMesh || m.userData.plain || !mat?.isMeshLambertMaterial || mat.map || mat.transparent || mat.emissive.getHex() !== 0) return;
      m.material = horseMat(skin, '#' + mat.color.getHexString());
      boxUV(m.geometry, 2);
    });
    mergeParts(this.root, new Set<THREE.Object3D>([...this.legs, ...this.segs, this.head, this.tail, this.jaw].filter((o): o is THREE.Object3D => !!o)));
    // Per-instance materials for hit flashes
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.MeshLambertMaterial).isMeshLambertMaterial) {
        const own = (m.material as THREE.MeshLambertMaterial).clone();
        m.material = own;
        this.flashMats.push(own);
        this.flashBase.push(own.emissive.clone());
      }
    });
  }

  private buildWolf(elite: boolean): void {
    const fur = this.pal.a ?? (elite ? '#5a5048' : '#8a7c6a');
    const dark = this.pal.b ?? (elite ? '#3a332e' : '#5e5446');
    const belly = this.pal.c ?? (elite ? '#8a8072' : '#c8bca6');
    const F = lam(fur), D = lam(dark), L = lam(belly);
    const s = (elite ? 1.45 : 1) * this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 1.45 * s;
    // One body from a deep chest back to a tucked waist, a dark saddle along the top and a pale chest
    add(this.body, taper(rb(0.44, 0.52, 1.02, 0.05), 0.8, 0.7), F, 0, 0.8, -0.1);
    add(this.body, rb(0.3, 0.06, 0.82, 0.02), D, 0, 1.065, -0.12);
    add(this.body, rb(0.3, 0.06, 0.36, 0.02), L, 0, 0.55, 0.14);
    add(this.body, rb(0.3, 0.32, 0.06, 0.02), L, 0, 0.72, 0.41);
    // The ruff, a thick collar of darker fur wider than the chest, and the neck rising out of it
    add(this.body, rb(0.52, 0.48, 0.22, 0.05), D, 0, 0.94, 0.33);
    add(this.body, rb(0.3, 0.32, 0.3, 0.04), F, 0, 1.04, 0.5, -0.5);
    const head = new THREE.Group();
    head.position.set(0, 1.18, 0.7);
    head.scale.setScalar(1.15);
    this.body.add(head);
    add(head, rb(0.32, 0.26, 0.28, 0.04), F, 0, 0, 0);
    add(head, rb(0.4, 0.16, 0.14, 0.04), F, 0, -0.07, -0.06); // cheek fur
    add(head, taper(rb(0.18, 0.13, 0.3, 0.03), 0.75, 0.8), F, 0, -0.05, 0.25, 0, Math.PI); // muzzle, narrowing to the nose
    add(head, rb(0.1, 0.04, 0.26, 0.015), D, 0, 0.02, 0.23); // the ridge down the nose
    add(head, rb(0.15, 0.04, 0.2, 0.015), L, 0, -0.1, 0.22); // pale lips
    const nose = add(head, rb(0.08, 0.06, 0.05, 0.02), lam('#16110e'), 0, -0.01, 0.4);
    nose.userData.plain = true;
    for (const sd of [1, -1]) {
      // Slanted amber eyes under a dark brow, and tall ears set back on the skull
      add(head, rb(0.055, 0.028, 0.02, 0.008), lam(elite ? '#e8a030' : '#e8c060', { emissive: new THREE.Color(elite ? '#552200' : '#3a2c00') }), sd * 0.085, 0.045, 0.145, 0, 0, sd * 0.25);
      add(head, rb(0.09, 0.03, 0.05, 0.01), D, sd * 0.085, 0.08, 0.13, 0, 0, sd * 0.2);
      const ear = add(head, new THREE.ConeGeometry(0.075, 0.24, 4), D, sd * 0.1, 0.22, -0.05, -0.15, Math.PI / 4, sd * -0.12);
      const inner = add(head, new THREE.ConeGeometry(0.045, 0.16, 4), lam('#3a2a26'), sd * 0.1, 0.2, -0.015, -0.15, Math.PI / 4, sd * -0.12);
      inner.userData.plain = true;
      if (elite && sd === 1) { ear.scale.set(1, 0.55, 1); inner.scale.set(1, 0.5, 1); }
    }
    if (elite) add(head, rb(0.02, 0.18, 0.02, 0.005), lam('#d8cfc0'), 0.12, 0.04, 0.16, 0, 0, 0.4); // scar
    for (const sd of [1, -1]) { const fang = add(head, new THREE.ConeGeometry(0.014, 0.05, 4), lam('#efe8d8'), sd * 0.05, -0.135, 0.35, Math.PI); fang.userData.plain = true; }
    // The lower jaw hinges open to bite
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.11, 0.1);
    head.add(jaw);
    add(jaw, rb(0.12, 0.045, 0.24, 0.015), L, 0, -0.02, 0.12);
    const teeth = add(jaw, rb(0.1, 0.025, 0.02, 0.005), lam('#efe8d8'), 0, 0.012, 0.23);
    teeth.userData.plain = true;
    this.head = head;
    this.jaw = jaw;
    // Carried low and thick with fur, curving down from the rump to a dark tip
    const tail = new THREE.Group();
    tail.position.set(0, 0.96, -0.58);
    this.body.add(tail);
    add(tail, rb(0.14, 0.14, 0.26, 0.04), F, 0, -0.073, -0.107, -0.6);
    add(tail, rb(0.19, 0.19, 0.3, 0.05), F, 0, -0.256, -0.285, -1.0);
    add(tail, rb(0.15, 0.15, 0.16, 0.04), D, 0, -0.43, -0.384, -1.2);
    this.tail = tail;
    // Forelegs straight under the shoulder; hind legs with a thick thigh and the hock bent back
    for (const [x, z, hind] of [[0.15, 0.3, 0], [-0.15, 0.3, 0], [0.14, -0.44, 1], [-0.14, -0.44, 1]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.72, z);
      this.body.add(leg);
      if (hind) {
        add(leg, rb(0.16, 0.36, 0.26, 0.04), F, 0, -0.1, 0);
        add(leg, rb(0.09, 0.3, 0.1, 0.03), F, 0, -0.38, -0.06, 0.3);
        add(leg, rb(0.08, 0.22, 0.09, 0.03), D, 0, -0.62, -0.09, -0.12);
        add(leg, rb(0.12, 0.06, 0.16, 0.02), D, 0, -0.69, -0.03);
      } else {
        add(leg, rb(0.14, 0.3, 0.16, 0.04), F, 0, -0.12, 0);
        add(leg, rb(0.09, 0.42, 0.1, 0.03), F, 0, -0.46, 0.01);
        add(leg, rb(0.12, 0.06, 0.16, 0.02), D, 0, -0.69, 0.04);
      }
      this.legs.push(leg);
    }
  }

  private buildJelly(): void {
    this.plateHeight = 1.0;
    const shellCol = this.pal.a ?? '#7ccf5a';
    const shell = new THREE.MeshLambertMaterial({ color: shellCol, transparent: true, opacity: 0.72, emissive: new THREE.Color(shellCol).multiplyScalar(this.pal.glow ? 0.45 : 0.15) });
    add(this.body, rb(0.9, 0.8, 0.9, 0.2), shell, 0, 0.4, 0);
    add(this.body, rb(0.36, 0.32, 0.36, 0.1), lam(this.pal.b ?? '#3f8a2a'), 0, 0.34, 0);
    this.body.scale.setScalar(this.extraScale);
    // Things it has swallowed from the ditches
    add(this.body, rb(0.1, 0.1, 0.24, 0.03), lam('#6a4a2a'), 0.2, 0.2, 0.1, 0.4, 0.6);
    add(this.body, rb(0.08, 0.08, 0.08, 0.02), lam('#9aa0a6'), -0.22, 0.5, -0.1);
    for (const sd of [1, -1]) {
      add(this.body, rb(0.13, 0.17, 0.04, 0.03), lam('#ffffff'), sd * 0.17, 0.52, 0.45);
      add(this.body, rb(0.07, 0.09, 0.03, 0.02), lam('#102010'), sd * 0.17, 0.5, 0.47);
    }
    add(this.body, rb(0.2, 0.04, 0.03, 0.01), lam('#1f4a18'), 0, 0.35, 0.46);
  }

  private buildRustback(): void {
    this.plateHeight = 1.1;
    const shell = lam(this.pal.a ?? '#7a4a2a');
    const rust = lam(this.pal.b ?? '#b5622e');
    const verd = lam('#4fae8c', { emissive: new THREE.Color('#0e3a2c') });
    // Stepped dome carapace
    add(this.body, rb(1.1, 0.25, 1.3, 0.08), shell, 0, 0.42, 0);
    add(this.body, rb(0.9, 0.22, 1.1, 0.08), rust, 0, 0.62, -0.02);
    add(this.body, rb(0.62, 0.18, 0.82, 0.07), shell, 0, 0.8, -0.04);
    add(this.body, rb(0.04, 0.5, 1.0, 0.01), lam('#3a2414'), 0, 0.64, -0.02); // split line
    for (let i = 0; i < 6; i++) add(this.body, rb(0.1, 0.06, 0.1, 0.02), verd, (i % 2 ? 1 : -1) * (0.18 + (i % 3) * 0.08), 0.74 + (i % 2) * 0.06, -0.3 + i * 0.12);
    const head = new THREE.Group();
    head.position.set(0, 0.42, 0.7);
    this.body.add(head);
    add(head, rb(0.5, 0.3, 0.34, 0.08), lam('#4a2e1c'), 0, 0, 0);
    for (const sd of [1, -1]) {
      add(head, rb(0.08, 0.08, 0.36, 0.02), lam('#2a1a10'), sd * 0.16, -0.04, 0.26, 0, -sd * 0.4);
      add(head, rb(0.07, 0.07, 0.03, 0.02), lam('#e86a2a', { emissive: new THREE.Color('#5a1a00') }), sd * 0.14, 0.07, 0.17);
      add(head, rb(0.03, 0.03, 0.4, 0.01), lam('#2a1a10'), sd * 0.1, 0.16, 0.3, -0.6, sd * 0.3);
    }
    this.head = head;
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? 1 : -1;
      const z = -0.4 + (i % 3) * 0.4;
      const leg = new THREE.Group();
      leg.position.set(side * 0.5, 0.38, z);
      this.body.add(leg);
      add(leg, rb(0.36, 0.08, 0.08, 0.02), lam('#3a2414'), side * 0.16, 0, 0, 0, 0, side * -0.5);
      add(leg, rb(0.07, 0.3, 0.07, 0.02), lam('#3a2414'), side * 0.32, -0.2, 0);
      this.legs.push(leg);
    }
  }

  /**
   * A lizard: a long low body slung between splayed legs, a flat wedge of a head with a hinged jaw
   * and a dewlap, a crest of scutes down the spine, and a long tail in segments that swings as it
   * walks. a = hide, b = belly and throat, c = crest, bands and feet.
   */
  private buildLizard(): void {
    const s = this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 1.0 * s;
    const H = lam(this.pal.a ?? '#6a8a4a'), P = lam(this.pal.b ?? '#d8cc90'), C = lam(this.pal.c ?? '#2e3a22');
    add(this.body, taper(rb(0.5, 0.3, 1.1, 0.1), 0.85, 0.8), H, 0, 0.42, 0);
    add(this.body, rb(0.42, 0.06, 0.92, 0.03), P, 0, 0.28, 0.02); // the belly
    for (let i = 0; i < 6; i++) add(this.body, new THREE.ConeGeometry(0.045, 0.15 - i * 0.012, 4), C, 0, 0.62 - i * 0.008, 0.46 - i * 0.18);
    for (const z of [0.22, -0.08, -0.38]) add(this.body, rb(0.5, 0.05, 0.09, 0.02), C, 0, 0.555, z); // bands over the back
    add(this.body, rb(0.3, 0.22, 0.3, 0.06), H, 0, 0.45, 0.62); // the neck
    const head = new THREE.Group();
    head.position.set(0, 0.48, 0.8);
    this.body.add(head);
    add(head, taper(rb(0.32, 0.17, 0.44, 0.05), 0.7, 0.8), H, 0, 0.03, 0.14, 0, Math.PI);
    add(head, rb(0.2, 0.1, 0.22, 0.03), P, 0, -0.1, 0.0); // the dewlap
    for (const sd of [1, -1]) {
      add(head, rb(0.06, 0.05, 0.05, 0.015), lam('#e8c040', { emissive: new THREE.Color('#3a2a00') }), sd * 0.12, 0.09, 0.12).userData.plain = true;
      add(head, rb(0.08, 0.03, 0.12, 0.01), C, sd * 0.11, 0.13, 0.12); // the brow ridge
    }
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.05, 0.06);
    head.add(jaw);
    add(jaw, rb(0.24, 0.05, 0.34, 0.02), P, 0, -0.02, 0.14);
    for (const sd of [1, -1]) add(jaw, new THREE.ConeGeometry(0.012, 0.04, 4), lam('#efe8d8'), sd * 0.07, 0.02, 0.26).userData.plain = true;
    this.head = head;
    this.jaw = jaw;
    // The tail: five segments, each hung from the last, thinning to a point
    let parent: THREE.Object3D = this.body, z = -0.55;
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0.4 : 0, z);
      parent.add(seg);
      const k = 1 - i * 0.17;
      add(seg, rb(0.26 * k, 0.2 * k, 0.36, 0.04 * k), i % 2 ? C : H, 0, -0.02 * i, -0.16);
      this.segs.push(seg);
      parent = seg;
      z = -0.32;
    }
    this.tail = this.segs[0];
    for (const [x, zz] of [[0.28, 0.32], [-0.28, 0.32], [0.28, -0.32], [-0.28, -0.32]]) {
      const sd = Math.sign(x);
      const leg = new THREE.Group();
      leg.position.set(x, 0.32, zz);
      this.body.add(leg);
      add(leg, rb(0.26, 0.11, 0.13, 0.03), H, sd * 0.11, 0, 0); // out to the side from the shoulder
      add(leg, rb(0.11, 0.24, 0.11, 0.03), H, sd * 0.24, -0.12, 0); // and down to the ground
      add(leg, rb(0.17, 0.04, 0.22, 0.015), C, sd * 0.26, -0.25, 0.05); // the splayed foot
      this.legs.push(leg);
    }
  }

  /**
   * A moth the size of a dog: a furred thorax over a glowing abdomen, feathered antennae, two pairs
   * of broad wings with eye-spots, and thin legs folded under. It flies: the body hangs well above
   * the ground and bobs while the wings beat (see updateMoth). a = wings, b = the glow, c = fur.
   */
  private buildMoth(): void {
    this.body.scale.setScalar(this.extraScale);
    this.plateHeight = 2.3 * this.extraScale;
    const glow = this.pal.b ?? '#ffb040';
    const W = lam(this.pal.a ?? '#7a5a3a'), F = lam(this.pal.c ?? '#5a4030');
    const G = lam(glow, { emissive: new THREE.Color(glow).multiplyScalar(0.75) });
    add(this.body, rb(0.34, 0.32, 0.42, 0.12), F, 0, 0, 0.08); // the thorax
    add(this.body, taper(rb(0.28, 0.26, 0.66, 0.11), 0.6, 0.6), G, 0, -0.06, -0.42); // the abdomen
    for (let i = 0; i < 3; i++) add(this.body, rb(0.3, 0.04, 0.05, 0.02), F, 0, 0.06 - i * 0.01, -0.26 - i * 0.16); // its rings
    const head = new THREE.Group();
    head.position.set(0, 0.02, 0.36);
    this.body.add(head);
    add(head, rb(0.24, 0.2, 0.18, 0.07), F, 0, 0, 0);
    for (const sd of [1, -1]) {
      add(head, rb(0.1, 0.12, 0.1, 0.04), lam('#140e0a'), sd * 0.1, 0.02, 0.06).userData.plain = true;
      // Feathered antennae: a stalk and a broad comb
      add(head, rb(0.02, 0.02, 0.36, 0.008), F, sd * 0.07, 0.16, 0.18, -0.6, sd * 0.35);
      add(head, rb(0.12, 0.012, 0.26, 0.005), F, sd * 0.14, 0.27, 0.3, -0.6, sd * 0.35);
      for (const lz of [0.08, -0.04, -0.16]) add(this.body, rb(0.025, 0.3, 0.025, 0.008), lam('#2a2018'), sd * 0.12, -0.24, lz, 0.25, 0, sd * 0.35).userData.plain = true;
    }
    this.head = head;
    // The wings: a fore and a hind pair, hinged at the thorax; each wing reaches out from its hinge
    for (const [z, len, span, hind] of [[0.16, 1.2, 0.72, 0], [-0.1, 0.9, 0.6, 1]] as const) for (const sd of [1, -1]) {
      const w = new THREE.Group();
      w.position.set(sd * 0.15, 0.1, z);
      w.userData.sd = sd;
      w.userData.hind = hind;
      this.body.add(w);
      add(w, rb(len, 0.025, span, 0.01), W, sd * len / 2, 0, hind ? -span * 0.25 : 0, 0, sd * (hind ? 0.3 : -0.15));
      add(w, rb(0.2, 0.03, 0.2, 0.01), G, sd * len * 0.62, 0.004, hind ? -span * 0.3 : 0.02).userData.plain = true; // the eye-spot
      add(w, rb(len * 0.9, 0.03, 0.05, 0.01), F, sd * len * 0.45, 0.003, hind ? -span * 0.05 : span * 0.4 - 0.03); // the leading edge
      this.segs.push(w);
    }
  }

  private buildBoar(): void {
    const s = this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 1.25 * s;
    const hide = this.pal.a ?? '#5a3e2a', bristle = this.pal.b ?? '#3a281a', snout = this.pal.c ?? '#b8867a';
    add(this.body, rb(0.62, 0.62, 1.1, 0.16), lam(hide), 0, 0.68, 0);
    add(this.body, rb(0.22, 0.24, 0.9, 0.06), lam(bristle), 0, 1.02, -0.02);
    const head = new THREE.Group();
    head.position.set(0, 0.7, 0.62);
    this.body.add(head);
    add(head, rb(0.46, 0.44, 0.4, 0.1), lam(hide), 0, 0, 0.08);
    add(head, rb(0.26, 0.22, 0.2, 0.06), lam(snout), 0, -0.08, 0.34);
    for (const sd of [1, -1]) {
      add(head, new THREE.ConeGeometry(0.035, 0.24, 5), lam('#efe6cf'), sd * 0.14, -0.06, 0.38, -0.9, 0, sd * 0.4);
      add(head, rb(0.08, 0.12, 0.05, 0.02), lam(bristle), sd * 0.16, 0.24, 0.0, 0, 0, sd * -0.3);
      add(head, rb(0.05, 0.05, 0.02, 0.01), lam('#1a1410'), sd * 0.12, 0.08, 0.29);
    }
    this.head = head;
    const tail = new THREE.Group();
    tail.position.set(0, 0.84, -0.56);
    this.body.add(tail);
    add(tail, rb(0.05, 0.18, 0.05, 0.02), lam(bristle), 0, -0.08, -0.03, 0.4);
    this.tail = tail;
    for (const [x, z] of [[0.2, 0.36], [-0.2, 0.36], [0.2, -0.36], [-0.2, -0.36]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.42, z);
      this.body.add(leg);
      add(leg, rb(0.16, 0.42, 0.18, 0.04), lam(hide), 0, -0.21, 0);
      add(leg, rb(0.17, 0.06, 0.2, 0.02), lam('#1e1612'), 0, -0.42, 0.02);
      this.legs.push(leg);
    }
  }

  /**
   * A dairy cow: a deep barrel of a body with hips and shoulders showing, a long head with a pale
   * muzzle, short horns, ears out sideways, an udder, and a tail ending in a tuft. a = coat,
   * b = the patches (white on a dun or black cow), c = muzzle and udder.
   */
  private buildCow(): void {
    this.plateHeight = 1.75;
    const C = lam(this.pal.a ?? '#8a5a36'), P = lam(this.pal.b ?? '#efe8dc'), M = lam(this.pal.c ?? '#e8d6c4');
    add(this.body, rb(0.78, 0.74, 1.62, 0.2), C, 0, 1.08, -0.02);
    add(this.body, rb(0.7, 0.3, 1.2, 0.1), C, 0, 0.78, 0); // the belly
    add(this.body, rb(0.8, 0.22, 0.34, 0.08), C, 0, 1.4, -0.62); // the hips
    // The patches: sections of white that wrap the body, a touch proud of the coat so they read on both flanks
    for (const [y, z, h, d] of [[1.12, 0.3, 0.5, 0.42], [0.98, -0.42, 0.42, 0.36]] as const) add(this.body, rb(0.83, h, d, 0.19), P, 0, y, z);
    add(this.body, rb(0.34, 0.2, 0.36, 0.08), M, 0, 0.62, -0.42); // the udder
    for (const [x, z] of [[0.08, -0.34], [-0.08, -0.34], [0.08, -0.5], [-0.08, -0.5]]) add(this.body, rb(0.04, 0.1, 0.04, 0.015), M, x, 0.5, z);
    add(this.body, rb(0.36, 0.42, 0.34, 0.1), C, 0, 1.2, 0.84); // the neck, dropping to the head
    const head = new THREE.Group();
    head.position.set(0, 1.22, 1.02);
    this.body.add(head);
    add(head, taper(rb(0.36, 0.42, 0.56, 0.1), 0.85, 0.9), C, 0, -0.04, 0.16);
    add(head, rb(0.3, 0.22, 0.16, 0.07), M, 0, -0.18, 0.44); // the muzzle
    add(head, rb(0.22, 0.16, 0.2, 0.05), P, 0, 0.14, 0.2); // a blaze on the brow
    for (const sd of [1, -1]) {
      add(head, rb(0.05, 0.05, 0.02, 0.01), lam('#141010'), sd * 0.16, 0.06, 0.32).userData.plain = true;
      add(head, rb(0.04, 0.04, 0.02, 0.01), lam('#3a2a2a'), sd * 0.06, -0.2, 0.53).userData.plain = true; // nostrils
      add(head, rb(0.22, 0.07, 0.12, 0.03), C, sd * 0.25, 0.1, 0.02, 0, 0, sd * -0.15); // ears
      add(head, new THREE.ConeGeometry(0.035, 0.16, 6), lam('#e8dcc0'), sd * 0.15, 0.26, 0.02, 0, 0, sd * -0.9).userData.plain = true; // horns
    }
    this.head = head;
    const tail = new THREE.Group();
    tail.position.set(0, 1.42, -0.82);
    this.body.add(tail);
    add(tail, rb(0.05, 0.62, 0.05, 0.02), C, 0, -0.32, -0.02, 0.08);
    add(tail, rb(0.1, 0.16, 0.1, 0.04), lam('#2a1e16'), 0, -0.66, -0.04);
    this.tail = tail;
    for (const [x, z] of [[0.24, 0.6], [-0.24, 0.6], [0.24, -0.62], [-0.24, -0.62]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.74, z);
      this.body.add(leg);
      add(leg, rb(0.18, 0.5, 0.2, 0.05), C, 0, -0.24, 0);
      add(leg, rb(0.13, 0.22, 0.14, 0.03), P, 0, -0.56, 0.01);
      add(leg, rb(0.15, 0.07, 0.17, 0.02), lam('#1e1612'), 0, -0.71, 0.02);
      this.legs.push(leg);
    }
  }

  /** A pig: pink and round, a flat snout, ears flopped forward over the eyes, a curl of a tail. a = skin, b = spots. */
  private buildPig(): void {
    this.plateHeight = 1.0;
    const S = lam(this.pal.a ?? '#e8a8a0'), D = lam(new THREE.Color(this.pal.a ?? '#e8a8a0').multiplyScalar(0.86).getStyle());
    add(this.body, rb(0.62, 0.56, 1.02, 0.2), S, 0, 0.6, -0.02);
    if (this.pal.b) for (const [x, y, z] of [[0.312, 0.66, 0.12], [-0.312, 0.56, -0.2], [0, 0.885, -0.28]] as const) add(this.body, rb(x ? 0.02 : 0.26, x ? 0.22 : 0.02, 0.26, 0.008), lam(this.pal.b), x, y, z);
    const head = new THREE.Group();
    head.position.set(0, 0.62, 0.52);
    this.body.add(head);
    add(head, rb(0.42, 0.38, 0.34, 0.12), S, 0, 0, 0.08);
    add(head, rb(0.2, 0.16, 0.08, 0.05), D, 0, -0.06, 0.28); // the snout
    for (const sd of [1, -1]) {
      add(head, rb(0.035, 0.05, 0.02, 0.01), lam('#5a2a2a'), sd * 0.045, -0.06, 0.325).userData.plain = true;
      add(head, rb(0.04, 0.04, 0.02, 0.01), lam('#141010'), sd * 0.12, 0.06, 0.25).userData.plain = true;
      add(head, rb(0.16, 0.04, 0.18, 0.02), D, sd * 0.14, 0.2, 0.14, 0.7, 0, sd * -0.25); // ears, flopped forward
    }
    this.head = head;
    const tail = new THREE.Group();
    tail.position.set(0, 0.74, -0.52);
    this.body.add(tail);
    for (let k = 0; k < 4; k++) add(tail, rb(0.04, 0.04, 0.06, 0.015), D, Math.sin(k * 1.6) * 0.04, Math.cos(k * 1.6) * 0.04, -0.02 - k * 0.02);
    this.tail = tail;
    for (const [x, z] of [[0.18, 0.3], [-0.18, 0.3], [0.18, -0.32], [-0.18, -0.32]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.36, z);
      this.body.add(leg);
      add(leg, rb(0.13, 0.32, 0.14, 0.04), S, 0, -0.16, 0);
      add(leg, rb(0.14, 0.05, 0.15, 0.02), lam('#5a3a32'), 0, -0.33, 0.02);
      this.legs.push(leg);
    }
  }

  private buildDeer(): void {
    this.plateHeight = 1.8;
    const fur = lam('#a8723e'), belly = lam('#e8d4b4');
    add(this.body, rb(0.42, 0.46, 1.05, 0.12), fur, 0, 1.0, 0);
    add(this.body, rb(0.36, 0.14, 0.9, 0.05), belly, 0, 0.78, 0);
    const head = new THREE.Group();
    head.position.set(0, 1.3, 0.55);
    this.body.add(head);
    add(head, rb(0.18, 0.5, 0.2, 0.06), fur, 0, 0.1, 0, 0.35);
    add(head, rb(0.26, 0.26, 0.42, 0.08), fur, 0, 0.36, 0.16);
    add(head, rb(0.1, 0.08, 0.06, 0.02), lam('#1a1410'), 0, 0.33, 0.38);
    for (const sd of [1, -1]) {
      add(head, rb(0.05, 0.4, 0.05, 0.02), lam('#6a5038'), sd * 0.1, 0.66, 0.08, 0, 0, sd * -0.3);
      add(head, rb(0.05, 0.2, 0.05, 0.02), lam('#6a5038'), sd * 0.2, 0.74, 0.12, 0.5, 0, sd * -0.9);
      add(head, rb(0.14, 0.08, 0.05, 0.02), fur, sd * 0.17, 0.48, 0.06, 0, 0, sd * 0.5);
    }
    this.head = head;
    add(this.body, rb(0.12, 0.14, 0.1, 0.04), belly, 0, 1.12, -0.55);
    for (const [x, z] of [[0.14, 0.38], [-0.14, 0.38], [0.14, -0.38], [-0.14, -0.38]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.82, z);
      this.body.add(leg);
      add(leg, rb(0.1, 0.8, 0.1, 0.03), fur, 0, -0.4, 0);
      add(leg, rb(0.1, 0.06, 0.12, 0.02), lam('#2a2018'), 0, -0.8, 0.01);
      this.legs.push(leg);
    }
  }

  private buildRabbit(): void {
    this.plateHeight = 0.6;
    const fur = lam(this.pal.a ?? '#9a8670');
    add(this.body, rb(0.26, 0.24, 0.38, 0.08), fur, 0, 0.18, 0);
    const head = new THREE.Group();
    head.position.set(0, 0.32, 0.18);
    this.body.add(head);
    add(head, rb(0.2, 0.18, 0.2, 0.06), fur, 0, 0, 0.04);
    for (const sd of [1, -1]) add(head, rb(0.05, 0.22, 0.04, 0.02), fur, sd * 0.05, 0.18, -0.02, -0.2);
    add(head, rb(0.04, 0.04, 0.02, 0.01), lam('#1a1410'), 0.07, 0.03, 0.14);
    add(head, rb(0.04, 0.04, 0.02, 0.01), lam('#1a1410'), -0.07, 0.03, 0.14);
    this.head = head;
    add(this.body, rb(0.1, 0.1, 0.08, 0.04), lam('#f2ece0'), 0, 0.22, -0.21);
    for (const [x, z] of [[0.08, 0.12], [-0.08, 0.12], [0.1, -0.1], [-0.1, -0.1]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.1, z);
      this.body.add(leg);
      add(leg, rb(0.06, 0.1, 0.12, 0.02), fur, 0, -0.05, 0);
      this.legs.push(leg);
    }
  }

  /** A sheep: a deep fleece in tufts over a narrower body, a long dark face with side ears, wool to the knee. a = fleece, b = face and legs; a ram (breed 'ram') has curled horns. */
  private buildSheep(): void {
    this.plateHeight = 1.25;
    const W = lam(this.pal.a ?? '#ece6d8'), Wd = lam(new THREE.Color(this.pal.a ?? '#ece6d8').multiplyScalar(0.88).getStyle()), F = lam(this.pal.b ?? '#2e2a26');
    // The fleece: a core, and tufts all over it so the outline is lumpy, not a box
    add(this.body, rb(0.7, 0.58, 1.0, 0.2), W, 0, 0.78, -0.02);
    const tufts: [number, number, number, number][] = [
      [0, 1.06, 0.28, 0.36], [0.18, 1.04, -0.02, 0.34], [-0.18, 1.04, -0.02, 0.34], [0, 1.08, -0.3, 0.36], [0.2, 1.0, -0.42, 0.3], [-0.2, 1.0, -0.42, 0.3],
      [0.34, 0.86, 0.2, 0.3], [-0.34, 0.86, 0.2, 0.3], [0.36, 0.82, -0.22, 0.32], [-0.36, 0.82, -0.22, 0.32], [0, 0.88, 0.48, 0.34], [0, 0.82, -0.52, 0.34],
      [0.26, 0.6, 0.28, 0.26], [-0.26, 0.6, 0.28, 0.26], [0.27, 0.58, -0.3, 0.26], [-0.27, 0.58, -0.3, 0.26],
    ];
    tufts.forEach(([x, y, z, s], i) => add(this.body, rb(s, s * 0.82, s, s * 0.32), i % 3 === 0 ? Wd : W, x, y, z));
    const head = new THREE.Group();
    head.position.set(0, 0.98, 0.56);
    this.body.add(head);
    add(head, taper(rb(0.24, 0.26, 0.4, 0.07), 0.78, 0.82), F, 0, -0.04, 0.1, 0, Math.PI); // the long face, narrowing to the nose
    add(head, rb(0.3, 0.16, 0.2, 0.07), W, 0, 0.13, -0.04); // the woolly poll
    const nose = add(head, rb(0.12, 0.06, 0.04, 0.015), lam('#1a1614'), 0, -0.09, 0.31);
    nose.userData.plain = true;
    for (const sd of [1, -1]) {
      // Pale eyes with the long dark pupil, set wide; ears straight out to the side, drooping a little
      const eye = add(head, rb(0.05, 0.04, 0.02, 0.008), lam('#d8c890'), sd * 0.122, 0.035, 0.08, 0, sd * 0.35, 0);
      eye.userData.plain = true;
      const pupil = add(head, rb(0.032, 0.012, 0.012, 0.004), lam('#141010'), sd * 0.128, 0.035, 0.092, 0, sd * 0.35, 0);
      pupil.userData.plain = true;
      add(head, rb(0.18, 0.05, 0.08, 0.02), F, sd * 0.2, 0.06, -0.02, 0, 0, sd * -0.35);
      if (this.pal.breed === 'ram') {
        // Horns curling back and down round the ear
        for (let k = 0; k < 4; k++) {
          const a = k * 0.9;
          add(head, rb(0.08, 0.08, 0.12, 0.03), lam('#c8b890'), sd * (0.16 + k * 0.02), 0.12 - Math.sin(a) * 0.1, -0.06 - Math.cos(a) * 0.08 + 0.04, a, 0, 0).userData.plain = true;
        }
      }
    }
    this.head = head;
    // A short woolly tail
    const tail = new THREE.Group();
    tail.position.set(0, 0.86, -0.56);
    this.body.add(tail);
    add(tail, rb(0.14, 0.2, 0.12, 0.05), W, 0, -0.08, -0.03, 0.3);
    this.tail = tail;
    // Legs: wool to the knee, then thin and dark, with cloven hooves
    for (const [x, z] of [[0.2, 0.32], [-0.2, 0.32], [0.2, -0.34], [-0.2, -0.34]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.56, z);
      this.body.add(leg);
      add(leg, rb(0.17, 0.2, 0.18, 0.06), W, 0, -0.06, 0);
      add(leg, rb(0.08, 0.36, 0.08, 0.02), F, 0, -0.32, 0.01);
      add(leg, rb(0.1, 0.06, 0.11, 0.02), lam('#1e1a16'), 0, -0.53, 0.02);
      this.legs.push(leg);
    }
  }

  /** A working dog, collie-built: a = coat, b = the white of chest, muzzle, feet and tail tip, c = tan points. */
  private buildDog(): void {
    this.plateHeight = 0.95;
    const C = lam(this.pal.a ?? '#26211e'), Wt = lam(this.pal.b ?? '#efe8dc'), T = lam(this.pal.c ?? '#a8682e');
    add(this.body, taper(rb(0.32, 0.36, 0.78, 0.06), 0.82, 0.78), C, 0, 0.56, -0.06);
    add(this.body, rb(0.3, 0.3, 0.12, 0.05), Wt, 0, 0.52, 0.32); // the white chest
    add(this.body, rb(0.4, 0.34, 0.2, 0.07), C, 0, 0.68, 0.26); // ruff
    add(this.body, rb(0.24, 0.24, 0.24, 0.05), C, 0, 0.78, 0.38, -0.5); // neck
    const head = new THREE.Group();
    head.position.set(0, 0.9, 0.5);
    this.body.add(head);
    add(head, rb(0.26, 0.22, 0.24, 0.05), C, 0, 0, 0);
    add(head, rb(0.08, 0.22, 0.2, 0.02), Wt, 0, 0.01, 0.02); // the white blaze up the face
    add(head, taper(rb(0.15, 0.11, 0.22, 0.03), 0.8, 0.8), Wt, 0, -0.05, 0.19, 0, Math.PI); // muzzle
    const nose = add(head, rb(0.07, 0.05, 0.05, 0.018), lam('#141010'), 0, -0.02, 0.31);
    nose.userData.plain = true;
    for (const sd of [1, -1]) {
      const eye = add(head, rb(0.045, 0.04, 0.02, 0.01), lam('#3a2414'), sd * 0.075, 0.04, 0.115);
      eye.userData.plain = true;
      add(head, rb(0.05, 0.025, 0.02, 0.008), T, sd * 0.075, 0.085, 0.11); // tan brows
      // Ears up, tips folded over
      add(head, rb(0.08, 0.13, 0.04, 0.015), C, sd * 0.09, 0.17, -0.03, 0, 0, sd * -0.15);
      add(head, rb(0.07, 0.06, 0.035, 0.012), C, sd * 0.1, 0.235, 0.0, 0.7, 0, sd * -0.15);
    }
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.09, 0.08);
    head.add(jaw);
    add(jaw, rb(0.1, 0.035, 0.17, 0.012), Wt, 0, -0.01, 0.09);
    const tongue = add(jaw, rb(0.05, 0.015, 0.08, 0.006), lam('#d86a6a'), 0, 0.006, 0.14);
    tongue.userData.plain = true;
    this.head = head;
    this.jaw = jaw;
    // A plumed tail carried up, white at the tip
    const tail = new THREE.Group();
    tail.position.set(0, 0.72, -0.44);
    this.body.add(tail);
    add(tail, rb(0.1, 0.1, 0.22, 0.03), C, 0, 0.04, -0.09, 0.6);
    add(tail, rb(0.13, 0.13, 0.22, 0.04), C, 0, 0.16, -0.2, 1.0);
    add(tail, rb(0.11, 0.11, 0.1, 0.03), Wt, 0, 0.27, -0.26, 1.2);
    this.tail = tail;
    for (const [x, z, hind] of [[0.11, 0.24, 0], [-0.11, 0.24, 0], [0.11, -0.34, 1], [-0.11, -0.34, 1]] as const) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.46, z);
      this.body.add(leg);
      if (hind) {
        add(leg, rb(0.12, 0.24, 0.18, 0.04), C, 0, -0.08, 0);
        add(leg, rb(0.07, 0.22, 0.07, 0.02), C, 0, -0.28, -0.04, 0.25);
      } else add(leg, rb(0.08, 0.38, 0.09, 0.02), C, 0, -0.2, 0.01);
      add(leg, rb(0.09, 0.07, 0.12, 0.02), Wt, 0, -0.42, 0.03); // white feet
      this.legs.push(leg);
    }
  }

  /** A cat: lean and low, a round head with tall ears, a long tail held up. a = coat, b = stripes, c = chest and paws. */
  private buildCat(): void {
    this.plateHeight = 0.6;
    const C = lam(this.pal.a ?? '#d8843a'), S = lam(this.pal.b ?? '#9a5420'), P = lam(this.pal.c ?? '#f2e8d8');
    add(this.body, rb(0.2, 0.2, 0.46, 0.06), C, 0, 0.3, -0.02);
    for (let k = 0; k < 3; k++) add(this.body, rb(0.21, 0.04, 0.05, 0.012), S, 0, 0.39, -0.16 + k * 0.12); // stripes over the back
    add(this.body, rb(0.16, 0.14, 0.08, 0.04), P, 0, 0.27, 0.2); // pale chest
    const head = new THREE.Group();
    head.position.set(0, 0.44, 0.24);
    this.body.add(head);
    add(head, rb(0.22, 0.19, 0.18, 0.07), C, 0, 0, 0);
    add(head, rb(0.12, 0.07, 0.07, 0.025), P, 0, -0.045, 0.085); // muzzle
    const nose = add(head, rb(0.035, 0.025, 0.02, 0.008), lam('#d88a8a'), 0, -0.02, 0.12);
    nose.userData.plain = true;
    for (const sd of [1, -1]) {
      const eye = add(head, rb(0.05, 0.045, 0.02, 0.012), lam('#a8d050', { emissive: new THREE.Color('#1a2a00') }), sd * 0.055, 0.025, 0.09);
      eye.userData.plain = true;
      const slit = add(head, rb(0.01, 0.04, 0.01, 0.003), lam('#101010'), sd * 0.055, 0.025, 0.1);
      slit.userData.plain = true;
      add(head, new THREE.ConeGeometry(0.05, 0.12, 4), C, sd * 0.07, 0.13, -0.01, 0, Math.PI / 4, sd * -0.18);
      add(head, rb(0.08, 0.004, 0.004, 0.001), lam('#f0f0f0'), sd * 0.1, -0.04, 0.1, 0, 0, sd * 0.15).userData.plain = true; // whiskers
    }
    add(head, rb(0.05, 0.02, 0.05, 0.01), S, 0, 0.09, 0.03); // the stripe on the brow
    this.head = head;
    // The tail, up and curving over at the tip
    const tail = new THREE.Group();
    tail.position.set(0, 0.36, -0.25);
    this.body.add(tail);
    for (let k = 0; k < 5; k++) add(tail, rb(0.055, 0.055, 0.1, 0.02), k % 2 ? S : C, 0, 0.03 + k * 0.07, -0.05 - Math.sin(k * 0.5) * 0.06 + k * 0.012, -0.9 + k * 0.32);
    this.tail = tail;
    for (const [x, z] of [[0.065, 0.15], [-0.065, 0.15], [0.065, -0.18], [-0.065, -0.18]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.22, z);
      this.body.add(leg);
      add(leg, rb(0.06, 0.2, 0.07, 0.02), C, 0, -0.1, 0);
      add(leg, rb(0.065, 0.04, 0.08, 0.015), P, 0, -0.21, 0.01);
      this.legs.push(leg);
    }
  }

  /** A duck: a = body, b = head (a drake's green, a duck's brown), with the blue flash on the wing. */
  private buildDuck(): void {
    this.plateHeight = 0.6;
    const Bd = lam(this.pal.a ?? '#8a7a66'), H = lam(this.pal.b ?? '#2a6a3a'), Bill = lam('#e0b840');
    add(this.body, rb(0.28, 0.2, 0.44, 0.09), Bd, 0, 0.18, 0);
    add(this.body, rb(0.24, 0.12, 0.16, 0.05), Bd, 0, 0.26, -0.2, -0.4); // the tail end, up
    add(this.body, rb(0.24, 0.1, 0.12, 0.04), lam('#e8e0d0'), 0, 0.16, 0.16); // breast
    for (const sd of [1, -1]) {
      add(this.body, rb(0.04, 0.12, 0.3, 0.03), lam('#6a5e50'), sd * 0.14, 0.22, -0.04);
      add(this.body, rb(0.042, 0.04, 0.08, 0.01), lam('#3a5ac8'), sd * 0.145, 0.22, -0.08).userData.plain = true; // the speculum
    }
    const head = new THREE.Group();
    head.position.set(0, 0.38, 0.18);
    this.body.add(head);
    add(head, rb(0.08, 0.14, 0.08, 0.03), H, 0, -0.06, -0.01); // neck
    add(head, rb(0.14, 0.13, 0.15, 0.05), H, 0, 0.04, 0.02);
    add(head, rb(0.07, 0.035, 0.12, 0.015), Bill, 0, 0.0, 0.14).userData.plain = true;
    for (const sd of [1, -1]) add(head, rb(0.02, 0.025, 0.02, 0.006), lam('#101010'), sd * 0.065, 0.06, 0.06).userData.plain = true;
    if (this.pal.b === undefined) add(head, rb(0.145, 0.02, 0.13, 0.008), lam('#f0f0f0'), 0, -0.04, 0.02); // the drake's white collar
    this.head = head;
    for (const x of [0.07, -0.07]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.1, 0);
      this.body.add(leg);
      add(leg, rb(0.03, 0.1, 0.03, 0.01), lam('#e08a30'), 0, -0.05, 0);
      add(leg, rb(0.07, 0.015, 0.08, 0.005), lam('#e08a30'), 0, -0.1, 0.03);
      this.legs.push(leg);
    }
  }

  private buildChicken(): void {
    this.plateHeight = 0.6;
    // White farmyard birds; a pet hen (data/pets.ts) in her own colour, speckled with a second
    const feather = this.pal.a ?? '#f4efe4';
    add(this.body, rb(0.28, 0.28, 0.36, 0.08), lam(feather), 0, 0.3, 0);
    add(this.body, rb(0.2, 0.2, 0.12, 0.05), lam(feather), 0, 0.38, -0.2, -0.5);
    if (this.pal.c) for (const [x, y, z] of [[0.141, 0.34, 0.05], [-0.141, 0.3, -0.06], [0.141, 0.26, -0.1], [-0.141, 0.38, 0.08], [0.06, 0.445, -0.02], [-0.05, 0.445, 0.1]]) add(this.body, rb(0.05, 0.05, 0.05, 0.01), lam(this.pal.c), x, y, z);
    const head = new THREE.Group();
    head.position.set(0, 0.5, 0.14);
    this.body.add(head);
    add(head, rb(0.16, 0.18, 0.16, 0.05), lam(feather), 0, 0, 0);
    add(head, rb(0.06, 0.05, 0.08, 0.02), lam('#e8a030'), 0, -0.01, 0.11);
    add(head, rb(0.04, 0.08, 0.1, 0.02), lam('#d8362a'), 0, 0.12, 0.01);
    this.head = head;
    for (const x of [0.07, -0.07]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.16, 0);
      this.body.add(leg);
      add(leg, rb(0.03, 0.16, 0.03, 0.01), lam('#e8a030'), 0, -0.08, 0);
      this.legs.push(leg);
    }
  }

  /**
   * A riding mount, sculpted in voxels (entities/voxmounts.ts): the horse and its breeds (piebald,
   * shire, stag, ram, kelpie, pack pony) and the far places' beasts (kilncat, fell sabre, drake,
   * key turtle, slabback, clockwork strider, tower griffin, grave-wyrm). a = coat, b = mane and
   * markings, c = saddle cloth; glow lights hooves, eyes or antlers. Everyone sits at the same height.
   */
  private buildHorse(): void {
    this.plateHeight = this.pal.wagon?.kind === 'covered' ? 2.9 : 2.6;
    const breed = this.pal.breed ?? 'horse';
    const { head, tail } = buildVoxMount(this, breed, { ...this.pal, harness: !!this.pal.wagon });
    this.head = head; this.tail = tail;
    if (this.pal.wagon) this.wheels = buildVoxWagon(this.root, this.body, breed, this.pal.wagon);
  }

  /** Sharks (the huss, the porbeagle, the blue): a = back, b = belly, c = fins. */
  private buildShark(): void {
    const s = this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 1.1 * s;
    const back = lam(this.pal.a ?? '#5a6670'), belly = lam(this.pal.b ?? '#d8dcd8'), fin = lam(this.pal.c ?? '#46525c');
    add(this.body, rb(0.56, 0.5, 1.3, 0.14), back, 0, 0.47, 0.08);
    add(this.body, rb(0.48, 0.18, 1.22, 0.07), belly, 0, 0.27, 0.1);
    add(this.body, rb(0.06, 0.44, 0.36, 0.02), fin, 0, 0.86, 0.1, -0.55); // the dorsal fin, raked back
    for (const sd of [1, -1]) add(this.body, rb(0.5, 0.05, 0.26, 0.02), fin, sd * 0.42, 0.26, 0.34, 0, sd * 0.45, sd * -0.3);
    const head = new THREE.Group();
    head.position.set(0, 0.47, 0.72);
    this.body.add(head);
    add(head, rb(0.48, 0.42, 0.46, 0.12), back, 0, 0.02, 0.16);
    add(head, rb(0.34, 0.28, 0.3, 0.1), back, 0, 0.05, 0.46); // snout
    add(head, rb(0.4, 0.12, 0.36, 0.05), belly, 0, -0.14, 0.14);
    for (const sd of [1, -1]) {
      add(head, rb(0.04, 0.07, 0.07, 0.02), lam('#0c0e10'), sd * 0.22, 0.1, 0.32);
      for (let k = 0; k < 3; k++) add(head, rb(0.02, 0.22, 0.02, 0.005), lam('#2a3238'), sd * 0.25, 0, -0.02 - k * 0.07); // gill slits
    }
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.16, 0.06);
    head.add(jaw);
    add(jaw, rb(0.36, 0.1, 0.42, 0.04), belly, 0, -0.04, 0.2);
    add(jaw, rb(0.3, 0.04, 0.03, 0.01), lam('#f4f0e4'), 0, 0.03, 0.38); // teeth
    this.jaw = jaw;
    this.head = head;
    const tail = new THREE.Group();
    tail.position.set(0, 0.47, -0.55);
    this.body.add(tail);
    add(tail, rb(0.38, 0.36, 0.56, 0.1), back, 0, 0, -0.26);
    add(tail, rb(0.2, 0.22, 0.46, 0.06), back, 0, 0.02, -0.72);
    add(tail, rb(0.04, 0.14, 0.14, 0.01), fin, 0, 0.22, -0.46, -0.5);
    add(tail, rb(0.06, 0.6, 0.22, 0.02), fin, 0, 0.28, -1.04, -0.62); // the tail's long upper lobe
    add(tail, rb(0.06, 0.34, 0.18, 0.02), fin, 0, -0.16, -1.0, 0.62);
    this.tail = tail;
  }

  /** The conger: a head and a chain of segments the swim ripples down. a = back, b = belly, c = fin. */
  private buildEel(): void {
    const s = this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 0.9 * s;
    const back = lam(this.pal.a ?? '#4a4a3c'), belly = lam(this.pal.b ?? '#a8a486'), fin = lam(this.pal.c ?? '#33332a');
    const head = new THREE.Group();
    head.position.set(0, 0.36, 0.46);
    this.body.add(head);
    add(head, rb(0.34, 0.3, 0.52, 0.1), back, 0, 0.02, 0.1);
    add(head, rb(0.24, 0.2, 0.2, 0.07), back, 0, 0.04, 0.42);
    for (const sd of [1, -1]) {
      add(head, rb(0.05, 0.09, 0.09, 0.02), lam('#c8c090'), sd * 0.15, 0.1, 0.26);
      add(head, rb(0.02, 0.05, 0.05, 0.01), lam('#0c0c08'), sd * 0.17, 0.1, 0.27);
      add(head, rb(0.04, 0.12, 0.16, 0.02), fin, sd * 0.18, -0.02, -0.08, 0, sd * 0.3); // pectoral fin
    }
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.1, 0.04);
    head.add(jaw);
    add(jaw, rb(0.26, 0.08, 0.5, 0.03), belly, 0, -0.04, 0.2);
    add(jaw, rb(0.2, 0.03, 0.02, 0.005), lam('#e8e4d4'), 0, 0.02, 0.42);
    this.jaw = jaw;
    this.head = head;
    let parent: THREE.Object3D = this.body;
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0.36 : 0, i === 0 ? 0.26 : -0.34);
      parent.add(seg);
      const w = 0.3 - i * 0.022, h = 0.3 - i * 0.02;
      add(seg, rb(w, h, 0.38, Math.min(0.08, w * 0.3)), back, 0, 0, -0.17);
      add(seg, rb(w * 0.8, 0.06, 0.36, 0.02), belly, 0, -h / 2 + 0.02, -0.17);
      add(seg, rb(0.03, 0.08, 0.36, 0.01), fin, 0, h / 2 + 0.03, -0.17); // the fin running down its back
      this.segs.push(seg);
      parent = seg;
    }
    add(parent, rb(0.03, 0.2, 0.3, 0.01), fin, 0, 0, -0.48);
  }

  /** The thornback ray: a flat diamond that flies through the water. a = back, b = belly, c = spots. */
  private buildRay(): void {
    const s = this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 0.8 * s;
    const back = lam(this.pal.a ?? '#7a6a4a'), belly = lam(this.pal.b ?? '#e8e2d2'), spot = lam(this.pal.c ?? '#b8a478'), thorn = lam('#efe6cc');
    add(this.body, rb(0.66, 0.18, 0.86, 0.07), back, 0, 0.3, 0.04);
    add(this.body, rb(0.6, 0.04, 0.8, 0.02), belly, 0, 0.2, 0.04);
    add(this.body, rb(0.3, 0.14, 0.24, 0.05), back, 0, 0.32, 0.54); // snout
    for (const sd of [1, -1]) {
      add(this.body, rb(0.06, 0.06, 0.06, 0.02), lam('#1a1610'), sd * 0.11, 0.42, 0.34);
      const wing = new THREE.Group();
      wing.position.set(sd * 0.32, 0.3, 0.04);
      this.body.add(wing);
      add(wing, rb(0.56, 0.08, 0.7, 0.03), back, sd * 0.28, 0, 0);
      add(wing, rb(0.4, 0.06, 0.42, 0.02), back, sd * 0.68, 0, -0.04);
      add(wing, rb(0.2, 0.05, 0.2, 0.02), back, sd * 0.94, 0, -0.08);
      add(wing, rb(0.52, 0.03, 0.62, 0.01), belly, sd * 0.3, -0.05, 0);
      for (const [x, z] of [[0.2, 0.12], [0.46, -0.16], [0.7, 0.06], [0.32, -0.3]]) add(wing, rb(0.09, 0.02, 0.09, 0.01), spot, sd * x, 0.05, z);
      this.legs.push(wing);
    }
    for (let k = 0; k < 5; k++) add(this.body, new THREE.ConeGeometry(0.03, 0.1, 4), thorn, 0, 0.42, 0.3 - k * 0.16);
    const tail = new THREE.Group();
    tail.position.set(0, 0.3, -0.4);
    this.body.add(tail);
    add(tail, rb(0.12, 0.08, 0.5, 0.03), back, 0, 0, -0.25);
    add(tail, rb(0.07, 0.06, 0.6, 0.02), back, 0, 0, -0.78);
    for (let k = 0; k < 6; k++) add(tail, new THREE.ConeGeometry(0.025, 0.08, 4), thorn, 0, 0.07, -0.1 - k * 0.17);
    add(tail, rb(0.02, 0.1, 0.12, 0.005), spot, 0, 0.06, -1.04);
    this.tail = tail;
  }

  /** The lion's mane: a pulsing bell, frilled arms and a curtain of stinging threads. a = bell, b = arms, c = threads. */
  private buildMedusa(): void {
    const s = this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 2.0 * s;
    const bellCol = this.pal.a ?? '#e0803a';
    const bell = new THREE.MeshLambertMaterial({ color: bellCol, transparent: true, opacity: 0.78, emissive: new THREE.Color(bellCol).multiplyScalar(this.pal.glow ? 0.4 : 0.18) });
    const arms = lam(this.pal.b ?? '#c04a24', { transparent: true, opacity: 0.85 });
    const thread = lam(this.pal.c ?? '#f0b070', { transparent: true, opacity: 0.7 });
    const top = new THREE.Group();
    top.position.set(0, 1.4, 0);
    this.body.add(top);
    add(top, rb(1.2, 0.3, 1.2, 0.14), bell, 0, 0, 0);
    add(top, rb(0.96, 0.24, 0.96, 0.12), bell, 0, 0.24, 0);
    add(top, rb(0.6, 0.18, 0.6, 0.08), bell, 0, 0.42, 0);
    add(top, rb(0.5, 0.2, 0.5, 0.08), lam('#ffd0a0', { emissive: new THREE.Color('#5a2a10') }), 0, 0.08, 0); // what shows through the bell
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      add(top, rb(0.26, 0.12, 0.1, 0.04), bell, Math.cos(a) * 0.6, -0.16, Math.sin(a) * 0.6, 0, -a - Math.PI / 2);
    }
    this.head = top;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const arm = new THREE.Group();
      arm.position.set(Math.cos(a) * 0.14, 1.22, Math.sin(a) * 0.14);
      this.body.add(arm);
      add(arm, rb(0.2, 0.8, 0.12, 0.05), arms, 0, -0.4, 0, 0, a);
      add(arm, rb(0.28, 0.2, 0.06, 0.03), arms, 0, -0.65, 0, 0, a + 0.6);
      this.segs.push(arm);
    }
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2, len = 0.8 + (k % 3) * 0.2;
      const t = new THREE.Group();
      t.position.set(Math.cos(a) * 0.5, 1.24, Math.sin(a) * 0.5);
      this.body.add(t);
      add(t, rb(0.04, len, 0.04, 0.01), thread, 0, -len / 2, 0);
      this.legs.push(t);
    }
  }

  setAnim(a: CreatureAnim): void {
    if (a !== this.anim) { this.anim = a; this.animTime = 0; }
  }

  flashHit(): void {
    this.flash = 0.12;
  }

  private updateFlash(dt: number): void {
    if (this.flash > 0) {
      this.flash -= dt;
      for (const m of this.flashMats) m.emissive.setRGB(0.9, 0.85, 0.8);
      this.flashed = true;
    } else if (this.flashed) {
      this.flashed = false;
      this.flashMats.forEach((m, i) => m.emissive.copy(this.flashBase[i]));
    }
  }
  private flashed = false;

  /** Swimmers: tails beat, wings fly, bells pulse; even at rest they keep moving. */
  private updateSwim(dt: number, speed: number): void {
    const t = this.animTime, es = this.extraScale;
    this.phase += dt * (2.2 + speed * 1.3);
    const sw = Math.sin(this.phase);
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.scale.setScalar(es);
    if (this.jaw) this.jaw.rotation.x = 0;
    const fast = this.anim === 'run' ? 1.4 : this.anim === 'walk' ? 1 : 0.6;
    const k = this.anim === 'windup' ? Math.min(1, t / 0.5) : 0;
    const a = this.anim === 'attack' ? Math.sin(Math.min(1, t / 0.35) * Math.PI) : 0;
    switch (this.kind) {
      case 'shark':
        this.tail!.rotation.y = sw * 0.42 * fast;
        this.head!.rotation.y = -sw * 0.06 * fast;
        this.body.rotation.x = -0.22 * k;
        this.body.position.z = a * 0.5;
        this.jaw!.rotation.x = 0.55 * Math.max(k, a);
        break;
      case 'eel':
        this.segs.forEach((s, i) => { s.rotation.y = Math.sin(this.phase * 1.3 - i * 0.75) * (0.18 + 0.1 * fast + k * 0.25); });
        this.head!.rotation.y = Math.sin(this.phase * 1.3 + 0.75) * 0.1;
        this.body.position.z = -0.35 * k + a * 0.9;
        this.jaw!.rotation.x = 0.6 * Math.max(k, a);
        break;
      case 'ray': {
        const f = sw * 0.38 * fast;
        this.legs[0].rotation.z = f;
        this.legs[1].rotation.z = -f;
        this.body.position.y = -Math.cos(this.phase) * 0.06;
        this.tail!.rotation.y = Math.sin(this.phase * 0.7) * 0.25;
        this.body.rotation.x = -0.45 * k;
        // The sting: the tail arches over the back in the wind-up and whips down
        this.tail!.rotation.x = -0.9 * k + (this.anim === 'attack' ? -0.9 + 1.8 * a : 0);
        break;
      }
      case 'medusa': {
        const pulse = Math.sin(this.phase * 0.7);
        const sq = this.anim === 'windup' ? 1 - 0.25 * k : this.anim === 'attack' ? 1 + 0.3 * a : 1 + pulse * 0.08;
        this.head!.scale.set(sq, 1 / sq, sq);
        const flare = a * 0.7;
        this.legs.forEach((l, i) => {
          const w = Math.sin(this.phase * 0.5 + i * 1.7) * 0.12, ang = (i / this.legs.length) * Math.PI * 2;
          l.rotation.set(-Math.sin(ang) * flare + w, 0, Math.cos(ang) * flare + w * 0.6);
        });
        this.segs.forEach((s, i) => { s.rotation.x = Math.sin(this.phase * 0.4 + i) * 0.15; });
        this.body.position.y = pulse * 0.08;
        break;
      }
    }
    if (this.anim === 'hit') this.body.rotation.x = -0.2 * Math.max(0, 1 - t / 0.25);
    if (this.anim === 'dead') {
      const d = Math.min(1, t / 0.8);
      if (this.kind === 'medusa') this.body.scale.setScalar(es * (1 - 0.6 * d));
      else {
        // Belly up, turned about its middle
        const mid = this.kind === 'shark' ? 0.47 : this.kind === 'eel' ? 0.36 : 0.3;
        this.body.rotation.z = Math.PI * d;
        this.body.position.y = 2 * mid * es * d;
      }
    }
  }

  /** A moth hangs in the air and bobs, its wings beating; it climbs to wind up, dives to strike, and falls when it dies. */
  private updateMoth(t: number): void {
    const now = performance.now() * 0.001;
    let y = 1.3 + Math.sin(now * 2.1 + this.phase) * 0.12, pitch = 0, roll = 0, beat = 1;
    if (this.anim === 'windup') { const k = Math.min(1, t / 0.5); y += 0.45 * k; pitch = -0.35 * k; }
    else if (this.anim === 'attack') { const k = Math.sin(Math.min(1, t / 0.35) * Math.PI); y -= 0.6 * k; pitch = 0.55 * k; }
    else if (this.anim === 'hit') pitch = -0.3 * Math.max(0, 1 - t / 0.25);
    else if (this.anim === 'dead') { const d = Math.min(1, t / 0.7); y = 1.3 * (1 - d) * (1 - d) + 0.12 * d; roll = (Math.PI / 2) * d; beat = 1 - d; }
    const fast = this.anim === 'run' || this.anim === 'attack' || this.anim === 'windup' ? 24 : 16;
    this.body.position.y = y * this.extraScale;
    this.body.rotation.set(pitch, 0, roll);
    for (const w of this.segs) {
      const f = Math.sin(now * fast + this.phase - (w.userData.hind ? 0.5 : 0));
      w.rotation.z = w.userData.sd * (0.1 + f * 0.7 * beat) - w.userData.sd * (1 - beat) * 0.2;
    }
  }

  update(dt: number, speed: number): void {
    this.animTime += dt;
    for (const w of this.wheels) w.rotation.x += (dt * speed) / WHEEL_R;
    if (SWIM_KINDS.has(this.kind)) { this.updateFlash(dt); this.updateSwim(dt, speed); return; }
    const t = this.animTime;
    this.phase += dt * (speed > 0.1 ? (this.kind === 'horse' ? 3.4 + speed * 0.62 : 3 + speed * 1.6) : 0);
    const sw = Math.sin(this.phase);
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    if (this.kind !== 'notch' && this.kind !== 'wolf' && this.kind !== 'boar') this.body.scale.setScalar(this.kind === 'jelly' || this.kind === 'rustback' || this.kind === 'lizard' || this.kind === 'moth' ? this.extraScale : 1);

    this.updateFlash(dt);

    if (this.kind === 'jelly') {
      // Squash and stretch carries all the motion
      let sy = 1 + Math.sin(performance.now() * 0.004 + this.phase) * 0.06;
      let y = 0;
      if (this.anim === 'walk' || this.anim === 'run') {
        const hop = Math.abs(Math.sin(this.phase * 0.6));
        y = hop * 0.35;
        sy = 0.85 + hop * 0.3;
      } else if (this.anim === 'windup') {
        sy = 1 - Math.min(1, t / 0.6) * 0.35;
      } else if (this.anim === 'attack') {
        const k = Math.min(1, t / 0.45);
        y = Math.sin(k * Math.PI) * 1.4;
        sy = k < 0.8 ? 1.25 : 0.6;
      } else if (this.anim === 'dead') {
        sy = Math.max(0.05, 1 - t * 2);
      }
      const es = this.extraScale;
      this.body.scale.set(es / Math.sqrt(sy), es * sy, es / Math.sqrt(sy));
      this.body.position.y = y;
      return;
    }

    if (this.kind === 'moth') { this.updateMoth(t); return; }

    if (this.kind === 'duck' && this.anim !== 'swim') for (const l of this.legs) l.visible = true;
    const legAmp = this.anim === 'run' ? 0.8 : this.anim === 'walk' ? 0.45 : 0;
    this.legs.forEach((leg, i) => {
      const off = this.kind === 'rustback' ? (i % 2) * Math.PI : i === 0 || i === 3 ? 0 : Math.PI;
      leg.rotation.x = Math.sin(this.phase + off) * legAmp;
      if (this.kind === 'rustback') leg.rotation.y = Math.sin(this.phase + off) * legAmp * 0.6;
    });
    if (this.anim === 'walk' || this.anim === 'run') this.body.position.y = Math.abs(Math.cos(this.phase)) * (this.kind === 'rabbit' ? 0.18 : this.kind === 'horse' && this.anim === 'run' ? 0.1 : 0.04);
    // A gallop rocks the horse fore and aft, front legs paired against the hind
    if (this.kind === 'horse' && this.anim === 'run') {
      this.body.rotation.x = Math.sin(this.phase) * 0.07;
      this.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(this.phase + (i < 2 ? 0 : 2.2) + (i % 2) * 0.35) * 0.75; });
    }
    if (this.kind === 'lizard') {
      // A lizard walks with its whole body: the trunk sways, and the tail swings behind in a wave
      const walking = legAmp > 0;
      this.body.rotation.y = walking ? Math.sin(this.phase) * 0.1 : 0;
      const swing = 0.08 + legAmp * 0.3, wave = walking ? this.phase : performance.now() * 0.0012;
      this.segs.forEach((g, i) => { g.rotation.y = Math.sin(wave - i * 0.8) * swing; });
    } else if (this.tail) this.tail.rotation.y = Math.sin(performance.now() * (this.kind === 'dog' ? 0.016 : this.kind === 'cat' ? 0.002 : 0.008)) * (this.anim === 'run' ? 0.5 : this.kind === 'dog' ? 0.45 : 0.2);
    if (this.head) this.head.rotation.set(0, 0, 0);
    // A wolf pants as it stands, and its jaw opens as it gathers to bite
    if (this.jaw) this.jaw.rotation.x = this.anim === 'idle' ? 0.08 + Math.sin(t * 9) * 0.05 : this.anim === 'windup' ? 0.35 * Math.min(1, t / 0.4) : this.anim === 'attack' ? 0.55 * (1 - Math.min(1, t / 0.3)) : this.anim === 'dead' ? 0.3 : 0.05;

    switch (this.anim) {
      case 'idle':
        if (this.head) this.head.rotation.y = Math.sin(performance.now() * 0.0009 + this.phase) * 0.25;
        break;
      case 'graze':
        if (this.head) this.head.rotation.x = 0.7 + Math.sin(t * 6) * 0.05;
        break;
      case 'sit': {
        // Sitting up: the back end down on its haunches, the front legs straight
        const k = Math.min(1, t / 0.4);
        this.body.rotation.x = -0.42 * k;
        this.body.position.y = -0.06 * k;
        this.body.position.z = -0.1 * k;
        if (this.legs[0]) { this.legs[0].rotation.x = 0.42 * k; this.legs[1].rotation.x = 0.42 * k; }
        if (this.legs[2]) { this.legs[2].rotation.x = -0.9 * k; this.legs[3].rotation.x = -0.9 * k; }
        if (this.head) { this.head.rotation.x = 0.3 * k; this.head.rotation.y = Math.sin(performance.now() * 0.0007 + this.phase) * 0.3; }
        break;
      }
      case 'swim':
        // Afloat: a gentle bob, the feet paddling out of sight
        this.body.position.y = -0.12 + Math.sin(performance.now() * 0.003 + this.phase) * 0.02;
        this.legs.forEach((l) => { l.visible = false; });
        if (this.head) this.head.rotation.x = Math.sin(performance.now() * 0.002) * 0.1;
        break;
      case 'windup': {
        const k = Math.min(1, t / 0.5);
        this.body.position.y = -0.12 * k;
        this.body.rotation.x = 0.12 * k;
        if (this.head) this.head.rotation.x = -0.2 * k;
        if (this.kind === 'rustback') this.body.rotation.x = -0.15 * k;
        break;
      }
      case 'attack': {
        const k = Math.min(1, t / 0.35);
        this.body.rotation.x = -0.25 * Math.sin(k * Math.PI);
        this.body.position.y = 0.25 * Math.sin(k * Math.PI);
        if (this.head) this.head.rotation.x = 0.4 * Math.sin(k * Math.PI);
        break;
      }
      case 'hit': {
        const k = Math.max(0, 1 - t / 0.25);
        this.body.rotation.x = -0.2 * k;
        break;
      }
      case 'dead': {
        const k = Math.min(1, t / 0.5);
        this.body.rotation.z = (Math.PI / 2) * k;
        this.body.position.y = 0.1 * k;
        break;
      }
    }
  }
}

/** The model a halter calls: a horse, a beast, or either one in the shafts of a wagon. */
export function mountModel(m: MountLook): CreatureModel {
  return new CreatureModel('horse', { a: m.coat, b: m.mane, c: m.cloth, glow: m.glow, breed: m.breed, pillion: m.seats === 2 && !m.wagon, wagon: m.wagon });
}
