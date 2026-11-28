import * as THREE from 'three';
import { campFlame, fireMaterial } from '../world/props';

// What a chained event (data/activities.ts) puts in the world while it runs, and what it leaves when it's lost: the
// thing you hold (a well head, a sheep fold), the fires you put out, the things you carry, and the scars. Built small
// and by hand from boxes, in the same blocky hand as the rest of the world.

const mats = new Map<string, THREE.MeshLambertMaterial>();
function mat(c: string): THREE.MeshLambertMaterial {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); mats.set(c, m); }
  return m;
}
const BOX = new THREE.BoxGeometry(1, 1, 1);
function box(g: THREE.Object3D, w: number, h: number, d: number, c: string, x: number, y: number, z: number, ry = 0, rz = 0): THREE.Mesh {
  const m = new THREE.Mesh(BOX, mat(c));
  m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.set(0, ry, rz);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  return m;
}

/** The thing a defend event is about. */
export function wardMesh(look: 'well' | 'fold' | 'nests'): THREE.Group {
  const g = new THREE.Group();
  if (look === 'nests') nests(g);
  else if (look === 'well') {
    // A ring of dressed stone, a timber frame over it with a windlass and rope, a bucket on the lip
    const stones = ['#b8ac94', '#a89c84', '#c4b8a0'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      box(g, 0.62, 0.9, 0.36, stones[i % 3], Math.cos(a) * 1.05, 0.45, Math.sin(a) * 1.05, -a + Math.PI / 2);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12 + 1 / 24) * Math.PI * 2;
      box(g, 0.6, 0.14, 0.42, '#d4c8ae', Math.cos(a) * 1.05, 0.97, Math.sin(a) * 1.05, -a + Math.PI / 2);
    }
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.85, 16).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#2a4a5a' }));
    water.position.y = 0.55; g.add(water);
    for (const s of [-1, 1]) {
      box(g, 0.16, 2.3, 0.16, '#6a4a2a', s * 1.15, 1.15, 0);
      box(g, 0.24, 0.24, 0.24, '#5a3c22', s * 1.15, 2.2, 0);
    }
    box(g, 2.5, 0.12, 0.12, '#7a5a34', 0, 2.25, 0);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 10).rotateZ(Math.PI / 2), mat('#8a6a40'));
    drum.position.set(0, 1.9, 0); g.add(drum);
    box(g, 0.08, 0.42, 0.08, '#5a3c22', 1.3, 1.75, 0.0);
    box(g, 0.08, 0.08, 0.3, '#5a3c22', 1.3, 1.55, 0.15);
    box(g, 0.03, 1.1, 0.03, '#c8b890', 0.1, 1.3, 0);
    // the bucket, on the stone lip
    box(g, 0.34, 0.36, 0.34, '#7a5a34', 0.95, 1.22, 0.55);
    box(g, 0.38, 0.05, 0.38, '#4a4a4c', 0.95, 1.33, 0.55);
    box(g, 0.38, 0.05, 0.38, '#4a4a4c', 0.95, 1.1, 0.55);
    // a trough beside it, the kind the carts water from
    box(g, 1.8, 0.5, 0.6, '#8a7a62', 0, 0.25, 2.0);
    box(g, 1.6, 0.06, 0.42, '#3a5a68', 0, 0.48, 2.0);
  } else {
    // A square of wattle hurdles, a gate of rails, and the sheep inside it
    const hurdle = (x: number, z: number, ry: number) => {
      const h = new THREE.Group();
      h.position.set(x, 0, z); h.rotation.y = ry;
      for (const s of [-0.9, 0, 0.9]) box(h, 0.1, 1.15, 0.1, '#5a4228', s, 0.55, 0);
      for (let i = 0; i < 5; i++) box(h, 1.9, 0.09, 0.08, i % 2 ? '#8a6a42' : '#7a5c38', 0, 0.2 + i * 0.2, (i % 2 ? 0.03 : -0.03));
      g.add(h);
    };
    const n = 3, s = 1.9;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * s;
      hurdle(o, -n * s / 2, 0);
      hurdle(o, n * s / 2, 0);
      hurdle(-n * s / 2, o, Math.PI / 2);
      if (i !== 1) hurdle(n * s / 2, o, Math.PI / 2);
    }
    // the gate: two rails between posts, tied shut with a twist of rope
    box(g, 0.14, 1.3, 0.14, '#4a3420', n * s / 2, 0.65, -0.95);
    box(g, 0.14, 1.3, 0.14, '#4a3420', n * s / 2, 0.65, 0.95);
    for (const y of [0.45, 0.9]) box(g, 0.08, 0.1, 1.8, '#9a7a4a', n * s / 2, y, 0);
    box(g, 0.16, 0.16, 0.16, '#c8b890', n * s / 2, 0.9, 0.85);
    for (let i = 0; i < 5; i++) {
      const sh = sheepMesh(i % 3 === 2);
      sh.position.set(Math.cos(i * 2.4) * 1.5, 0, Math.sin(i * 2.4) * 1.4);
      sh.rotation.y = i * 1.7;
      g.add(sh);
    }
    // straw down in a corner
    box(g, 1.4, 0.12, 1.2, '#d8c078', -1.6, 0.06, -1.5);
  }
  return g;
}

/** A sheep, in a blocky fleece. */
export function sheepMesh(dark = false): THREE.Group {
  const g = new THREE.Group();
  const wool = dark ? '#8a8278' : '#e8e2d4', face = dark ? '#2a2420' : '#3a3430';
  box(g, 0.62, 0.48, 0.95, wool, 0, 0.62, 0);
  box(g, 0.66, 0.2, 0.7, dark ? '#9a9286' : '#f2ece0', 0, 0.9, 0);
  box(g, 0.32, 0.32, 0.34, face, 0, 0.82, 0.6);
  box(g, 0.36, 0.14, 0.2, wool, 0, 1.0, 0.52);
  for (const s of [-1, 1]) box(g, 0.14, 0.06, 0.08, face, s * 0.22, 0.86, 0.6);
  for (const [x, z] of [[-0.18, -0.32], [0.18, -0.32], [-0.18, 0.32], [0.18, 0.32]]) box(g, 0.1, 0.42, 0.1, face, x, 0.21, z);
  return g;
}

/** A vine cutting: a bundle of brown canes tied with bast, a few green buds at the top. */
export function cuttingMesh(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    box(g, 0.06, 0.8, 0.06, i % 2 ? '#6a4a2a' : '#7a5632', Math.cos(a) * 0.07, 0.42, Math.sin(a) * 0.07, 0, Math.cos(a) * 0.08);
    box(g, 0.07, 0.07, 0.07, '#7aa83a', Math.cos(a) * 0.08, 0.84, Math.sin(a) * 0.08);
  }
  box(g, 0.24, 0.08, 0.24, '#c8b070', 0, 0.36, 0);
  box(g, 0.5, 0.04, 0.5, '#4a3a28', 0, 0.02, 0);
  return g;
}

/** A pale gold glint over something to pick up, so it reads from a distance. */
export function glintMesh(): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: '#ffe08a' }));
  m.position.y = 1.6;
  return m;
}

/** A fire on the ground: the camp flame, a ring of glowing coals under it. */
export function fireSpot(): { root: THREE.Group; flame: THREE.Mesh; coals: THREE.Mesh } {
  const root = new THREE.Group();
  const flame = new THREE.Mesh(campFlame(), fireMaterial());
  flame.scale.set(2.2, 2.6, 2.2);
  root.add(flame);
  // the grass catching round it
  for (const [x, z, k] of [[0.9, 0.3, 1.3], [-0.6, -0.8, 1.0], [-0.3, 0.9, 0.8]]) {
    const f = new THREE.Mesh(flame.geometry, flame.material);
    f.position.set(x, 0, z); f.scale.set(k, k * 1.15, k); f.rotation.y = x * 2;
    root.add(f);
  }
  const coals = new THREE.Mesh(new THREE.CircleGeometry(1.7, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.55, depthWrite: false }));
  coals.position.y = 0.05;
  root.add(coals);
  return { root, flame, coals };
}

/** Where a fire burned down, or one was put out: a black circle and a stump of something. */
export function charMark(out: boolean): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CircleGeometry(out ? 1.0 : 1.5, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: out ? '#3a3a36' : '#140e0a', transparent: true, opacity: out ? 0.45 : 0.75, depthWrite: false }));
  m.position.y = 0.04; m.rotation.y = Math.random() * 6;
  g.add(m);
  if (!out) for (let i = 0; i < 3; i++) box(g, 0.12, 0.5 + i * 0.2, 0.12, '#1a1410', Math.cos(i * 2.1) * 0.5, 0.25 + i * 0.1, Math.sin(i * 2.1) * 0.5, 0, (i - 1) * 0.3);
  return g;
}

/** A burned terrace: rows of black vine stumps on their stakes, ash between them, a few still smoking (WORLD_STATES 'burnt'). */
export function burntGround(r: number, ground: (x: number, z: number) => number): { root: THREE.Group; smokes: THREE.Vector3[] } {
  const root = new THREE.Group();
  const smokes: THREE.Vector3[] = [];
  let k = 7;
  const rnd = () => { k = (k * 16807) % 2147483647; return k / 2147483647; };
  for (let row = -r; row <= r; row += 2.2) for (let x = -r; x <= r; x += 1.6) {
    if (Math.hypot(x, row) > r) continue;
    const jx = x + (rnd() - 0.5) * 0.4, jz = row + (rnd() - 0.5) * 0.3, y = ground(jx, jz);
    if (!Number.isFinite(y)) continue;
    const g = new THREE.Group();
    g.position.set(jx, y, jz);
    box(g, 0.08, 1.1, 0.08, '#2a221c', 0, 0.55, 0);
    box(g, 0.14, 0.4 + rnd() * 0.3, 0.14, '#16100c', 0.08, 0.2, 0, 0, (rnd() - 0.5) * 0.6);
    if (rnd() < 0.5) box(g, 0.5, 0.06, 0.06, '#1e1814', 0.2, 0.5, 0, 0, -0.4);
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.7 + rnd() * 0.5, 9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: rnd() < 0.5 ? '#2a2622' : '#4a4640', transparent: true, opacity: 0.7, depthWrite: false }));
    ash.position.y = 0.03;
    g.add(ash);
    root.add(g);
    if (rnd() < 0.08) smokes.push(new THREE.Vector3(jx, y + 0.3, jz));
  }
  return { root, smokes };
}

/** The fold with its hurdles down and the gate off (WORLD_STATES 'hurdles'). */
export function brokenFold(): THREE.Group {
  const g = new THREE.Group();
  const lay = (x: number, z: number, ry: number, tilt: number) => {
    const h = new THREE.Group();
    h.position.set(x, 0.08, z); h.rotation.set(tilt, ry, 0);
    for (const s of [-0.9, 0, 0.9]) box(h, 0.1, 1.15, 0.1, '#5a4228', s, 0.55, 0);
    for (let i = 0; i < 5; i++) box(h, 1.9, 0.09, 0.08, '#7a5c38', 0, 0.2 + i * 0.2, 0);
    g.add(h);
  };
  lay(-1.9, -2.9, 0.1, -1.45); lay(0.2, -2.9, -0.2, 1.4); lay(-2.9, 0.5, Math.PI / 2 + 0.3, -1.5);
  lay(2.4, 1.6, 0.9, 1.5); lay(0.6, 3.0, 0.2, -1.2);
  for (const [x, z] of [[-2.85, -2.85], [2.85, -2.85], [-2.85, 2.85], [2.85, 2.85], [0, -2.85]]) box(g, 0.14, 1.2, 0.14, '#4a3420', x, 0.6, z);
  box(g, 1.4, 0.12, 1.2, '#b8a060', -1.6, 0.06, -1.5);
  for (let i = 0; i < 4; i++) box(g, 0.3, 0.14, 0.2, '#e8e2d4', Math.cos(i * 1.9) * 1.8, 0.07, Math.sin(i * 1.9) * 1.6, i);
  return g;
}

/** Turtle eggs: a clutch of round white eggs half in the sand. */
export function eggMesh(): THREE.Group {
  const g = new THREE.Group();
  const sand = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e2d2a4'));
  sand.scale.set(1, 0.35, 1); g.add(sand);
  const egg = new THREE.SphereGeometry(0.12, 10, 8);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(egg, mat(i % 3 ? '#f4efe2' : '#ebe4d2'));
    const a = i * 0.9, r = i ? 0.16 + (i % 2) * 0.08 : 0;
    m.position.set(Math.cos(a) * r, 0.14 + (i % 2) * 0.06, Math.sin(a) * r);
    m.castShadow = true; g.add(m);
  }
  return g;
}

/** A nesting beach: mounds of turned sand, each marked by the watchers with a driftwood stake and a strip of red rag. */
function nests(g: THREE.Group): void {
  const mound = new THREE.SphereGeometry(0.75, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const spots: [number, number][] = [[0, 0], [2.2, 0.8], [-1.9, 1.3], [0.9, -2.1], [-1.4, -1.8], [2.6, -1.6]];
  spots.forEach(([x, z], i) => {
    const m = new THREE.Mesh(mound, mat(i % 2 ? '#dccb98' : '#e6d6a6'));
    m.scale.set(1, 0.4, 1); m.position.set(x, 0, z); m.receiveShadow = true; g.add(m);
    box(g, 0.08, 1.1, 0.08, '#9a8a70', x + 0.6, 0.55, z + 0.2, 0, 0.12);
    box(g, 0.05, 0.22, 0.14, '#b83a2a', x + 0.66, 1.0, z + 0.2);
    // a few eggs showing where the sand's been scraped
    if (i % 2 === 0) for (let k = 0; k < 3; k++) box(g, 0.16, 0.14, 0.16, '#f2ecde', x + (k - 1) * 0.2, 0.25, z - 0.3);
  });
  // the watchers' tally board on a post
  box(g, 0.12, 1.5, 0.12, '#6a5238', -3.2, 0.75, 0);
  box(g, 0.9, 0.6, 0.06, '#a08660', -3.2, 1.35, 0.06);
  for (let k = 0; k < 4; k++) box(g, 0.04, 0.3, 0.02, '#2a2420', -3.5 + k * 0.12, 1.35, 0.1);
}

/** A goat: rough brown and white, short horns, a beard. */
export function goatMesh(dark = false): THREE.Group {
  const g = new THREE.Group();
  const coat = dark ? '#5a4232' : '#b89a72', light = '#e8dcc4';
  box(g, 0.46, 0.42, 0.85, coat, 0, 0.62, 0);
  box(g, 0.48, 0.12, 0.5, light, 0, 0.44, 0.05);
  box(g, 0.24, 0.3, 0.3, coat, 0, 0.92, 0.5);
  box(g, 0.2, 0.18, 0.2, light, 0, 0.86, 0.68);
  box(g, 0.08, 0.16, 0.06, '#d8d0c0', 0, 0.7, 0.72);
  for (const s of [-1, 1]) {
    box(g, 0.05, 0.22, 0.05, '#3a3028', s * 0.08, 1.14, 0.44, 0, s * 0.35);
    box(g, 0.14, 0.05, 0.08, coat, s * 0.17, 0.98, 0.46);
  }
  box(g, 0.06, 0.2, 0.06, coat, 0, 0.82, -0.44, 0, 0.6);
  for (const [x, z] of [[-0.14, -0.3], [0.14, -0.3], [-0.14, 0.3], [0.14, 0.3]]) box(g, 0.09, 0.42, 0.09, '#3a3028', x, 0.21, z);
  return g;
}

/** Nests dug out by the lizards: holes in the sand, broken shell round them (WORLD_STATES 'dug'). */
export function dugNests(): THREE.Group {
  const g = new THREE.Group();
  const hole = new THREE.CircleGeometry(0.6, 12).rotateX(-Math.PI / 2);
  const spots: [number, number][] = [[0, 0], [2.2, 0.8], [-1.9, 1.3], [0.9, -2.1], [-1.4, -1.8], [2.6, -1.6]];
  for (const [x, z] of spots) {
    const h = new THREE.Mesh(hole, new THREE.MeshBasicMaterial({ color: '#8a7650', transparent: true, opacity: 0.85, depthWrite: false }));
    h.position.set(x, 0.04, z); g.add(h);
    for (let k = 0; k < 5; k++) box(g, 0.12, 0.03, 0.08, '#f2ecde', x + Math.cos(k * 1.3) * 0.75, 0.03, z + Math.sin(k * 1.3) * 0.7, k);
    box(g, 0.08, 0.6, 0.08, '#9a8a70', x + 0.7, 0.15, z + 0.3, 0, 1.2);
  }
  return g;
}

/** Cargo off a wreck: a sea-stained crate or a cask, a tangle of weed and rope on it. */
export function crateMesh(i: number): THREE.Group {
  const g = new THREE.Group();
  if (i % 3 === 2) {
    const cask = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.8, 10), mat('#7a5a34'));
    cask.rotation.z = Math.PI / 2; cask.position.y = 0.36; cask.castShadow = true; g.add(cask);
    for (const x of [-0.28, 0.28]) { const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 10), mat('#3a3a3c')); hoop.rotation.z = Math.PI / 2; hoop.position.set(x, 0.36, 0); g.add(hoop); }
  } else {
    box(g, 0.8, 0.7, 0.7, '#8a6a42', 0, 0.35, 0);
    for (const y of [0.12, 0.58]) box(g, 0.84, 0.08, 0.74, '#5a4228', 0, y, 0);
    box(g, 0.08, 0.72, 0.74, '#5a4228', 0, 0.35, 0);
    box(g, 0.5, 0.05, 0.3, '#2a2420', 0.1, 0.71, 0.1);
  }
  box(g, 0.6, 0.04, 0.12, '#3a5a2a', -0.1, 0.74, -0.15, 0.6);
  box(g, 0.05, 0.05, 0.7, '#c8b890', 0.25, 0.73, 0, 0.3);
  return g;
}
