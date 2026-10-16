import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type CreatureKind = 'wolf' | 'notch' | 'jelly' | 'rustback' | 'deer' | 'rabbit' | 'sheep' | 'chicken' | 'boar' | 'horse';

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
  private phase = Math.random() * 10;
  anim: CreatureAnim = 'idle';
  animTime = 0;
  /** Height above ground of the head, for nameplates. */
  plateHeight = 1.2;
  private flash = 0;
  private flashMats: THREE.MeshLambertMaterial[] = [];

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
    }
    // Per-instance materials for hit flashes
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.material as THREE.MeshLambertMaterial).isMeshLambertMaterial) {
        const own = (m.material as THREE.MeshLambertMaterial).clone();
        m.material = own;
        this.flashMats.push(own);
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

  setAnim(a: CreatureAnim): void {
    if (a !== this.anim) { this.anim = a; this.animTime = 0; }
  }

  flashHit(): void {
    this.flash = 0.12;
  }

  update(dt: number, speed: number): void {
    this.animTime += dt;
    const t = this.animTime;
    this.phase += dt * (speed > 0.1 ? (this.kind === 'horse' ? 3.4 + speed * 0.62 : 3 + speed * 1.6) : 0);
    const sw = Math.sin(this.phase);
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    if (this.kind !== 'notch' && this.kind !== 'wolf' && this.kind !== 'boar') this.body.scale.setScalar(this.kind === 'jelly' || this.kind === 'rustback' ? this.extraScale : 1);

    if (this.flash > 0) {
      this.flash -= dt;
      for (const m of this.flashMats) m.emissive.setRGB(0.9, 0.85, 0.8);
    } else for (const m of this.flashMats) if (m.emissive.r > 0.5) m.emissive.setRGB(0, 0, 0);

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
