import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type CreatureKind = 'wolf' | 'notch' | 'jelly' | 'rustback' | 'deer' | 'rabbit' | 'sheep' | 'chicken' | 'boar' | 'horse'
  | 'shark' | 'eel' | 'ray' | 'medusa';

/** Body plans that live in the sea: they swim in three dimensions and never come ashore. */
export const SWIM_KINDS: ReadonlySet<CreatureKind> = new Set(['shark', 'eel', 'ray', 'medusa']);

/** Colour overrides so one body plan can serve several regional species. */
export interface Palette { a?: string; b?: string; c?: string; glow?: boolean }
export type CreatureAnim = 'idle' | 'walk' | 'run' | 'windup' | 'attack' | 'hit' | 'dead' | 'graze';

const mats = new Map<string, THREE.Material>();
const lam = (c: string, extra: THREE.MeshLambertMaterialParameters = {}) => {
  const key = c + JSON.stringify(extra);
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, ...extra }); mats.set(key, m); }
  return m;
};
const rb = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));

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
    switch (kind) {
      case 'wolf':
      case 'notch': this.buildWolf(kind === 'notch'); break;
      case 'jelly': this.buildJelly(); break;
      case 'rustback': this.buildRustback(); break;
      case 'boar': this.buildBoar(); break;
      case 'deer': this.buildDeer(); break;
      case 'rabbit': this.buildRabbit(); break;
      case 'sheep': this.buildSheep(); break;
      case 'chicken': this.buildChicken(); break;
      case 'horse': this.buildHorse(); break;
      case 'shark': this.buildShark(); break;
      case 'eel': this.buildEel(); break;
      case 'ray': this.buildRay(); break;
      case 'medusa': this.buildMedusa(); break;
    }
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
    const s = (elite ? 1.45 : 1) * this.extraScale;
    this.body.scale.setScalar(s);
    this.plateHeight = 1.3 * s;
    add(this.body, rb(0.48, 0.44, 1.0, 0.1), lam(fur), 0, 0.72, 0);
    add(this.body, rb(0.52, 0.5, 0.42, 0.12), lam(dark), 0, 0.8, 0.32); // ruff
    add(this.body, rb(0.4, 0.12, 0.8, 0.05), lam(belly), 0, 0.5, 0);
    const head = new THREE.Group();
    head.position.set(0, 0.92, 0.6);
    this.body.add(head);
    add(head, rb(0.38, 0.34, 0.36, 0.08), lam(fur), 0, 0, 0.08);
    add(head, rb(0.22, 0.18, 0.3, 0.05), lam(belly), 0, -0.07, 0.36);
    add(head, rb(0.1, 0.08, 0.08, 0.03), lam('#1a1410'), 0, -0.02, 0.52);
    for (const sd of [1, -1]) {
      const ear = add(head, new THREE.ConeGeometry(0.08, 0.2, 4), lam(dark), sd * 0.12, 0.24, 0.0, 0, Math.PI / 4, sd * -0.15);
      if (elite && sd === 1) ear.scale.set(1, 0.55, 1);
      add(head, rb(0.08, 0.05, 0.02, 0.01), lam(elite ? '#e8a030' : '#e8d070', { emissive: new THREE.Color(elite ? '#552200' : '#332a00') }), sd * 0.1, 0.05, 0.27);
    }
    if (elite) add(head, rb(0.02, 0.18, 0.02, 0.005), lam('#d8cfc0'), 0.12, 0.04, 0.27, 0, 0, 0.4); // scar
    this.head = head;
    const tail = new THREE.Group();
    tail.position.set(0, 0.86, -0.5);
    this.body.add(tail);
    add(tail, rb(0.14, 0.14, 0.5, 0.06), lam(fur), 0, -0.08, -0.22, 0.6);
    add(tail, rb(0.12, 0.12, 0.16, 0.05), lam(belly), 0, -0.24, -0.42, 0.8);
    this.tail = tail;
    for (const [x, z] of [[0.16, 0.36], [-0.16, 0.36], [0.16, -0.36], [-0.16, -0.36]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.56, z);
      this.body.add(leg);
      add(leg, rb(0.14, 0.52, 0.16, 0.04), lam(fur), 0, -0.26, 0);
      add(leg, rb(0.15, 0.08, 0.2, 0.03), lam(dark), 0, -0.52, 0.03);
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
    const fur = lam('#9a8670');
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

  private buildSheep(): void {
    this.plateHeight = 1.2;
    const wool = lam('#eeeae0');
    add(this.body, rb(0.66, 0.6, 0.96, 0.2), wool, 0, 0.72, 0);
    for (let i = 0; i < 5; i++) add(this.body, rb(0.3, 0.26, 0.3, 0.1), wool, (i % 2 ? 0.2 : -0.2), 1.0, -0.3 + i * 0.15);
    const head = new THREE.Group();
    head.position.set(0, 0.86, 0.52);
    this.body.add(head);
    add(head, rb(0.26, 0.3, 0.32, 0.08), lam('#3a3430'), 0, 0, 0.08);
    add(head, rb(0.3, 0.14, 0.2, 0.06), wool, 0, 0.16, 0.0);
    for (const sd of [1, -1]) add(head, rb(0.16, 0.06, 0.08, 0.02), lam('#3a3430'), sd * 0.18, 0.04, 0.0);
    this.head = head;
    for (const [x, z] of [[0.18, 0.3], [-0.18, 0.3], [0.18, -0.3], [-0.18, -0.3]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.44, z);
      this.body.add(leg);
      add(leg, rb(0.1, 0.44, 0.1, 0.03), lam('#3a3430'), 0, -0.22, 0);
      this.legs.push(leg);
    }
  }

  private buildChicken(): void {
    this.plateHeight = 0.6;
    add(this.body, rb(0.28, 0.28, 0.36, 0.08), lam('#f4efe4'), 0, 0.3, 0);
    add(this.body, rb(0.2, 0.2, 0.12, 0.05), lam('#f4efe4'), 0, 0.38, -0.2, -0.5);
    const head = new THREE.Group();
    head.position.set(0, 0.5, 0.14);
    this.body.add(head);
    add(head, rb(0.16, 0.18, 0.16, 0.05), lam('#f4efe4'), 0, 0, 0);
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

  /** A riding horse: a = coat, b = mane, tail and lower legs, c = saddle cloth; glow lights the hooves. */
  private buildHorse(): void {
    this.plateHeight = 2.4;
    const coat = lam(this.pal.a ?? '#7a4a2a'), dark = lam(this.pal.b ?? '#2a1e16'), cloth = lam(this.pal.c ?? '#2e4a7a');
    const leather = lam('#4a3020'), brass = lam('#c8a050');
    const hoof = this.pal.glow ? lam('#ff9a3a', { emissive: new THREE.Color('#c84a10') }) : lam('#26201a');
    add(this.body, rb(0.7, 0.72, 1.62, 0.16), coat, 0, 1.36, 0);
    add(this.body, rb(0.64, 0.6, 0.5, 0.14), coat, 0, 1.4, 0.7); // chest
    add(this.body, rb(0.62, 0.56, 0.5, 0.14), coat, 0, 1.4, -0.66); // quarters
    // Neck and head, the neck reaching forward and up
    add(this.body, rb(0.34, 0.95, 0.44, 0.1), coat, 0, 1.92, 0.98, 0.55);
    add(this.body, rb(0.1, 0.92, 0.2, 0.04), dark, 0, 2.0, 0.84, 0.55); // mane
    const head = new THREE.Group();
    head.position.set(0, 2.32, 1.24);
    this.body.add(head);
    add(head, rb(0.34, 0.36, 0.62, 0.1), coat, 0, 0, 0.16, 0.5);
    add(head, rb(0.3, 0.3, 0.28, 0.08), coat, 0, -0.2, 0.42, 0.5); // muzzle
    add(head, rb(0.24, 0.1, 0.12, 0.03), dark, 0, -0.3, 0.55, 0.5);
    add(head, rb(0.36, 0.05, 0.05, 0.01), leather, 0, -0.1, 0.36, 0.5); // noseband
    for (const sd of [1, -1]) {
      add(head, new THREE.ConeGeometry(0.06, 0.2, 4), coat, sd * 0.11, 0.24, -0.04, -0.2, Math.PI / 4, sd * -0.15);
      add(head, rb(0.04, 0.07, 0.07, 0.02), lam('#120c08'), sd * 0.17, 0.06, 0.12, 0.5);
      add(head, rb(0.03, 0.03, 0.03, 0.01), brass, sd * 0.17, -0.12, 0.4);
    }
    add(head, rb(0.12, 0.14, 0.24, 0.04), dark, 0, 0.2, -0.06, 0.3); // forelock
    this.head = head;
    // Reins from the bit back to the pommel
    for (const sd of [1, -1]) add(this.body, rb(0.02, 0.02, 0.9, 0.005), leather, sd * 0.16, 1.98, 0.86, -0.42);
    // Tail
    const tail = new THREE.Group();
    tail.position.set(0, 1.62, -0.92);
    this.body.add(tail);
    add(tail, rb(0.16, 0.24, 0.2, 0.06), dark, 0, 0, -0.04, -0.4);
    add(tail, rb(0.2, 0.8, 0.16, 0.07), dark, 0, -0.44, -0.18, 0.25);
    this.tail = tail;
    // Saddle on a cloth
    add(this.body, rb(0.78, 0.05, 0.74, 0.02), cloth, 0, 1.73, 0.04);
    add(this.body, rb(0.8, 0.26, 0.06, 0.02), cloth, 0, 1.6, -0.32);
    add(this.body, rb(0.5, 0.12, 0.56, 0.05), leather, 0, 1.8, 0.04);
    add(this.body, rb(0.42, 0.16, 0.08, 0.03), leather, 0, 1.9, -0.22); // cantle
    add(this.body, rb(0.2, 0.16, 0.1, 0.03), leather, 0, 1.9, 0.3); // pommel
    for (const sd of [1, -1]) {
      add(this.body, rb(0.03, 0.42, 0.04, 0.01), leather, sd * 0.4, 1.55, 0.06);
      add(this.body, rb(0.12, 0.04, 0.1, 0.01), brass, sd * 0.42, 1.33, 0.06);
    }
    for (const [x, z] of [[0.21, 0.62], [-0.21, 0.62], [0.21, -0.6], [-0.21, -0.6]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 1.12, z);
      this.body.add(leg);
      add(leg, rb(0.2, 0.56, 0.26, 0.06), coat, 0, -0.26, 0);
      add(leg, rb(0.14, 0.44, 0.16, 0.04), dark, 0, -0.74, 0.01);
      add(leg, rb(0.18, 0.12, 0.2, 0.03), hoof, 0, -1.04, 0.02);
      this.legs.push(leg);
    }
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

  update(dt: number, speed: number): void {
    this.animTime += dt;
    if (SWIM_KINDS.has(this.kind)) { this.updateFlash(dt); this.updateSwim(dt, speed); return; }
    const t = this.animTime;
    this.phase += dt * (speed > 0.1 ? (this.kind === 'horse' ? 3.4 + speed * 0.62 : 3 + speed * 1.6) : 0);
    const sw = Math.sin(this.phase);
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    if (this.kind !== 'notch' && this.kind !== 'wolf' && this.kind !== 'boar') this.body.scale.setScalar(this.kind === 'jelly' || this.kind === 'rustback' ? this.extraScale : 1);

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
    if (this.tail) this.tail.rotation.y = Math.sin(performance.now() * 0.008) * (this.anim === 'run' ? 0.5 : 0.2);
    if (this.head) this.head.rotation.set(0, 0, 0);

    switch (this.anim) {
      case 'idle':
        if (this.head) this.head.rotation.y = Math.sin(performance.now() * 0.0009 + this.phase) * 0.25;
        break;
      case 'graze':
        if (this.head) this.head.rotation.x = 0.7 + Math.sin(t * 6) * 0.05;
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
