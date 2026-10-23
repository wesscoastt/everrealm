import * as THREE from 'three';
import { shade, Vox, VOX_MAT, type Paint } from './vox';

// The creatures you meet up close (the pets at your heels, the farmyard, the dogs and cats about the
// towns) sculpted cube by cube the way the mounts are (entities/voxmounts.ts), finer for the small ones
// so a hen's comb and a kitten's ears read. Every joint (head, jaw, tail, legs) sits exactly where the
// old smooth build put it, so the same walk, idle and pet animations drive them. Each look's cubes are
// worked out once and shared. Anything without a sculpt here is filled into cubes from its smooth
// build instead (entities/voxelize.ts).

type V3 = [number, number, number];
export interface VoxCreatureHost {
  body: THREE.Group;
  legs: THREE.Object3D[];
  head: THREE.Object3D | null;
  tail: THREE.Object3D | null;
  jaw: THREE.Object3D | null;
  plateHeight: number;
}
export interface VoxCreaturePal { a?: string; b?: string; c?: string; glow?: boolean }

const geoms = new Map<string, THREE.BufferGeometry | null>();

/** Builds a creature's parts, each a group with one mesh of cubes, the cubes shared between creatures of one look. */
class Kit {
  private n = 0;
  constructor(private key: string, private s: number) {}
  part(host: THREE.Object3D, at: V3, build: (v: Vox) => void): THREE.Group {
    const g = new THREE.Group();
    g.position.set(...at);
    const id = this.key + '#' + this.n++;
    if (!geoms.has(id)) { const v = new Vox(this.s, true); build(v); geoms.set(id, v.size ? v.mesh().geometry : null); }
    const geo = geoms.get(id);
    if (geo) {
      const m = new THREE.Mesh(geo, VOX_MAT);
      m.castShadow = true;
      m.userData.plain = true;
      g.add(m);
    }
    host.add(g);
    return g;
  }
}

/** A joint: an empty group at a pivot, for the animations to turn. */
function joint(parent: THREE.Object3D, at: V3): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...at);
  parent.add(g);
  return g;
}

/** Eyes with a catchlight, a pair either side of the head. */
function eyes(head: THREE.Object3D, x: number, y: number, z: number, colour: string, w: number, turn = 0.5, glow = false): void {
  const m = new THREE.MeshLambertMaterial({ color: colour, emissive: new THREE.Color(colour).multiplyScalar(glow ? 0.9 : 0.25) });
  const shine = new THREE.MeshLambertMaterial({ color: '#f4f0e8', emissive: new THREE.Color('#5a5a5a') });
  for (const sd of [1, -1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.9, w * 0.5), m);
    e.position.set(sd * x, y, z);
    e.rotation.y = sd * turn;
    e.userData.plain = true;
    head.add(e);
    const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, w * 0.32, w * 0.2), shine);
    s.position.set(sd * (x + w * 0.12), y + w * 0.2, z + w * 0.28);
    s.rotation.y = sd * turn;
    s.userData.plain = true;
    head.add(s);
  }
}

// ---------------------------------------------------------------- Paints
const flat = (hex: string, vary = 0.1): Paint => (_x, _y, _z, n) => shade(hex, 1 - vary / 2 + n * vary);
/** A coat: varied cube by cube, a touch darker along the top. */
const coat = (hex: string, top: number): Paint => (_x, y, _z, n) => shade(hex, 0.93 + n * 0.1 - (y > top ? 0.06 : 0));
/** Fluffy fur or a ruff: strong variation with darker roots. */
const shag = (hex: string): Paint => (_x, _y, _z, n) => shade(hex, n < 0.16 ? 0.78 : 0.9 + n * 0.16);
/** Feathers in rows like roof tiles, each feather its own shade, with flecks of a second colour. */
const feathers = (hex: string, fleck?: string): Paint => (x, y, z, n) => {
  if (fleck && n < 0.13) return shade(fleck, 0.9 + n);
  const row = Math.floor(y * 26), v = y * 26 - row, col = Math.floor(z * 26 + (row & 1) * 0.5 + Math.abs(x) * 9);
  return shade(hex, (v < 0.28 ? 0.84 : 0.97 + (((row * 31 + col * 17) >>> 0) % 7) / 90) + n * 0.04);
};

/** Builds the sculpted creatures; false for any it hasn't a sculpt for. */
export function buildVoxCreature(h: VoxCreatureHost, kind: string, pal: VoxCreaturePal): boolean {
  const key = kind + JSON.stringify(pal);
  switch (kind) {
    case 'chicken': hen(h, new Kit(key, 1 / 24), pal); return true;
    case 'duck': duck(h, new Kit(key, 1 / 24), pal); return true;
    case 'rabbit': hare(h, new Kit(key, 1 / 24), pal); return true;
    case 'cat': cat(h, new Kit(key, 1 / 24), pal); return true;
    case 'dog': dog(h, new Kit(key, 1 / 20), pal); return true;
    case 'pig': pig(h, new Kit(key, 1 / 20), pal); return true;
  }
  return false;
}

/** A hen: a round feathered body with a tail fan cocked up, folded wings, a lobed comb and wattle, three toes. a = feathers, c = speckles. */
function hen(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 0.6;
  const F = pal.a ?? '#f4efe4', fl = pal.c, red = '#d8362a', horn = '#e8a030';
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.3, -0.01], [0.15, 0.15, 0.19], feathers(F, fl));
    v.ellipsoid([0, 0.28, 0.08], [0.13, 0.13, 0.11], feathers(F, fl));                     // the breast
    v.capsule([0, 0.33, -0.14], [0, 0.5, -0.24], 0.075, 0.035, feathers(shade(F, 0.86), fl)); // the tail fan, cocked up
    for (const sd of [1, -1]) v.ellipsoid([sd * 0.13, 0.31, -0.03], [0.035, 0.09, 0.15], feathers(shade(F, 0.9), fl)); // folded wings
  });
  const head = joint(h.body, [0, 0.5, 0.14]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, -0.15, -0.05], [0, -0.03, 0], 0.065, 0.06, feathers(F, fl));             // the neck
    v.ellipsoid([0, 0, 0], [0.075, 0.085, 0.078], feathers(F, fl));
    for (const [y, z, r] of [[0.1, -0.04, 0.025], [0.125, 0.0, 0.03], [0.115, 0.04, 0.026]] as const) v.ellipsoid([0, y, z], [0.024, r, 0.026], flat(red)); // comb lobes
    v.box([-0.022, 0.07, -0.05], [0.022, 0.1, 0.06], flat(red));
    v.ellipsoid([0, -0.07, 0.06], [0.024, 0.038, 0.024], flat(red));                         // wattle
    v.cone([0, -0.005, 0.06], [0, -0.025, 0.13], 0.026, flat(horn));                        // the beak
  });
  eyes(head, 0.068, 0.02, 0.035, '#2a1810', 0.028, 0.9);
  h.head = head;
  for (const x of [0.07, -0.07]) {
    const leg = joint(h.body, [x, 0.16, 0]);
    k.part(leg, [0, 0, 0], (v) => {
      v.ellipsoid([0, 0.03, 0], [0.04, 0.05, 0.05], feathers(F, fl));                       // the thigh, feathered
      v.capsule([0, 0, 0], [0, -0.15, 0.01], 0.025, 0.023, flat(horn));
      for (const [tx, tz] of [[0.04, 0.06], [0, 0.075], [-0.04, 0.06], [0, -0.04]] as const) v.capsule([0, -0.155, 0.005], [tx, -0.16, tz], 0.02, 0.018, flat(horn));
    });
    h.legs.push(leg);
  }
}

/** A duck: a long low body, the tail end up, a rounded head on a short neck, a flat bill, webbed feet. a = body, b = head (none: a drake's green with a white collar). */
function duck(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 0.6;
  const drake = pal.b === undefined, B = pal.a ?? '#8a7a66', H = pal.b ?? '#2a6a3a', bill = '#e0b840', foot = '#e08a30';
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.18, 0], [0.14, 0.1, 0.22], feathers(B));
    v.ellipsoid([0, 0.17, 0.13], [0.12, 0.09, 0.09], feathers(drake ? '#8a5a3a' : shade(B, 1.08))); // the breast
    v.capsule([0, 0.2, -0.17], [0, 0.27, -0.27], 0.06, 0.03, feathers(shade(B, 0.82)));    // the tail, up
    for (const sd of [1, -1]) v.ellipsoid([sd * 0.12, 0.21, -0.04], [0.03, 0.07, 0.16], (x, y, z, n) => (drake && z > -0.11 && z < -0.03 && y < 0.22 ? shade('#3a5ac8', 0.9 + n * 0.2) : feathers(shade(B, 0.82))(x, y, z, n)));
  });
  const head = joint(h.body, [0, 0.38, 0.18]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, -0.17, -0.02], [0, -0.02, 0], 0.048, 0.045, feathers(H));
    if (drake) v.box([-0.05, -0.08, -0.045], [0.05, -0.06, 0.045], flat('#f4f2ec', 0.04));  // the drake's white collar
    v.ellipsoid([0, 0.03, 0.02], [0.065, 0.066, 0.078], feathers(H));
    v.ellipsoid([0, 0.0, 0.115], [0.036, 0.016, 0.062], flat(bill));                         // the bill, flat and broad
    v.box([-0.006, 0.012, 0.15], [0.006, 0.02, 0.17], flat('#3a2a10'));                      // the nail at its tip
  });
  eyes(head, 0.06, 0.05, 0.04, '#141010', 0.024, 0.9);
  h.head = head;
  for (const x of [0.07, -0.07]) {
    const leg = joint(h.body, [x, 0.1, 0]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0, 0], [0, -0.09, 0.005], 0.023, 0.021, flat(foot));
      v.tri([-0.04, -0.1, 0.0], [0.04, -0.1, 0.0], [0, -0.1, 0.085], 0.014, flat(foot));    // the webbed foot
    });
    h.legs.push(leg);
  }
}

/** A hare or a rabbit: round haunches, a deep chest, long ears pink inside, big dark eyes, a white scut. a = fur. */
function hare(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 0.6;
  const C = pal.a ?? '#9a8670', pale = shade(C, 1.18), white = '#f2ece0', pink = '#e8b0a8';
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.19, -0.03], [0.13, 0.13, 0.2], coat(C, 0.26));
    for (const sd of [1, -1]) v.ellipsoid([sd * 0.08, 0.16, -0.1], [0.065, 0.095, 0.11], coat(C, 0.24)); // the haunches
    v.ellipsoid([0, 0.2, 0.1], [0.1, 0.11, 0.08], coat(pale, 0.3));                          // the chest
    v.ellipsoid([0, 0.25, -0.22], [0.045, 0.045, 0.035], shag(white));                       // the scut
  });
  const head = joint(h.body, [0, 0.32, 0.18]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0.04], [0.08, 0.077, 0.092], coat(C, 0.05));
    v.ellipsoid([0, -0.03, 0.11], [0.048, 0.04, 0.036], coat(pale, 1));                     // the muzzle
    v.box([-0.012, -0.012, 0.14], [0.012, 0.004, 0.152], flat(pink));                        // the nose
    for (const sd of [1, -1]) {
      v.capsule([sd * 0.035, 0.02, -0.005], [sd * 0.055, 0.27, -0.06], 0.033, 0.027, coat(C, 1));   // ears, back of
      v.capsule([sd * 0.036, 0.08, 0.018], [sd * 0.055, 0.25, -0.03], 0.02, 0.016, flat(pink)); // and pink inside
    }
  });
  eyes(head, 0.062, 0.02, 0.075, '#1a1410', 0.036, 0.8);
  h.head = head;
  for (const [x, z, hind] of [[0.08, 0.12, 0], [-0.08, 0.12, 0], [0.1, -0.1, 1], [-0.1, -0.1, 1]] as const) {
    const leg = joint(h.body, [x, 0.1, z]);
    k.part(leg, [0, 0, 0], (v) => {
      if (hind) { v.box([-0.034, -0.1, -0.03], [0.034, -0.065, 0.11], coat(C, 1)); v.capsule([0, 0.04, -0.02], [0, -0.07, 0.0], 0.04, 0.034, coat(C, 1)); }            // the long hind foot
      else v.capsule([0, 0.04, 0], [0, -0.085, 0.02], 0.034, 0.03, coat(C, 1));
      v.ellipsoid([0, -0.092, hind ? 0.09 : 0.025], [0.03, 0.014, 0.035], flat(white));       // paws
    });
    h.legs.push(leg);
  }
}

/** A cat: lean and low with tabby stripes, a round head with cheeks and tall ears pink inside, green eyes, a long tail held up. a = coat, b = stripes, c = chest and paws. */
function cat(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 0.6;
  const C = pal.a ?? '#d8843a', S = pal.b ?? '#9a5420', P = pal.c ?? '#f2e8d8', pink = '#e8a0a0';
  const tabby: Paint = (x, y, z, n) => (y > 0.29 && Math.sin(z * 42 + Math.abs(x) * 6) > 0.45 ? shade(S, 0.92 + n * 0.12) : coat(C, 0.36)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.capsule([0, 0.3, 0.14], [0, 0.31, -0.2], 0.1, 0.095, tabby);
    v.ellipsoid([0, 0.25, 0.2], [0.062, 0.07, 0.045], shag(P));                              // the pale chest
  });
  const head = joint(h.body, [0, 0.44, 0.24]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0], [0.105, 0.092, 0.09], (x, y, z, n) => (y > 0.04 && Math.abs(x) < 0.04 && Math.sin(x * 120) > 0 ? shade(S, 0.95) : coat(C, 1)(x, y, z, n))); // the brow's stripes
    for (const sd of [1, -1]) v.ellipsoid([sd * 0.06, -0.035, 0.035], [0.05, 0.042, 0.045], coat(C, 1)); // cheeks
    v.ellipsoid([0, -0.042, 0.078], [0.046, 0.03, 0.026], shag(P));                         // the muzzle
    v.box([-0.012, -0.022, 0.1], [0.012, -0.008, 0.11], flat(pink));                         // the nose
    for (const sd of [1, -1]) {
      v.cone([sd * 0.06, 0.06, -0.01], [sd * 0.085, 0.16, -0.02], 0.042, coat(C, 1));        // ears
      v.cone([sd * 0.058, 0.066, 0.012], [sd * 0.078, 0.14, 0.004], 0.022, flat(pink));
    }
  });
  eyes(head, 0.05, 0.02, 0.08, '#a8d050', 0.04, 0.35, true);
  h.head = head;
  const tail = joint(h.body, [0, 0.36, -0.25]);
  k.part(tail, [0, 0, 0], (v) => {
    const pts: V3[] = [[0, 0, 0], [0, 0.11, -0.07], [0, 0.23, -0.07], [0, 0.31, -0.01], [0, 0.33, 0.04]];
    for (let i = 0; i < pts.length - 1; i++) v.capsule(pts[i], pts[i + 1], 0.032, 0.03, (x, y, z, n) => (Math.floor(y * 14) % 2 ? shade(S, 0.95 + n * 0.1) : coat(C, 9)(x, y, z, n)));
  });
  h.tail = tail;
  for (const [x, z] of [[0.065, 0.15], [-0.065, 0.15], [0.065, -0.18], [-0.065, -0.18]] as const) {
    const leg = joint(h.body, [x, 0.22, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0, 0], [0, -0.19, 0.01], 0.034, 0.03, coat(C, 1));
      v.ellipsoid([0, -0.205, 0.016], [0.036, 0.02, 0.046], shag(P));                        // paws
    });
    h.legs.push(leg);
  }
}

/** A collie: black and white with tan brows, a ruff, a white blaze and socks, ears up with the tips folded, a plumed tail; the jaw opens. a = coat, b = white, c = tan. */
function dog(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 0.95;
  const C = pal.a ?? '#26211e', W = pal.b ?? '#efe8dc', T = pal.c ?? '#a8682e';
  k.part(h.body, [0, 0, 0], (v) => {
    v.capsule([0, 0.58, 0.22], [0, 0.56, -0.34], 0.16, 0.14, (x, y, z, n) => (y < 0.47 ? shag(W)(x, y, z, n) : coat(C, 0.68)(x, y, z, n)));
    v.ellipsoid([0, 0.66, 0.26], [0.2, 0.18, 0.13], shag(C));                                // the ruff
    v.ellipsoid([0, 0.56, 0.34], [0.13, 0.15, 0.08], shag(W));                               // the white chest
    v.capsule([0, 0.7, 0.32], [0, 0.84, 0.44], 0.1, 0.09, shag(C));                          // the neck
  });
  const head = joint(h.body, [0, 0.9, 0.5]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0], [0.12, 0.105, 0.115], (x, y, z, n) => (Math.abs(x) < 0.028 && z > -0.02 ? shag(W)(x, y, z, n) : coat(C, 9)(x, y, z, n))); // the blaze
    v.capsule([0, -0.04, 0.07], [0, -0.05, 0.2], 0.056, 0.044, shag(W));                     // the muzzle
    v.box([-0.03, -0.045, 0.235], [0.03, -0.012, 0.262], flat('#141010', 0.04));            // the nose
    for (const sd of [1, -1]) {
      v.box([sd * 0.05 - 0.025, 0.05, 0.085], [sd * 0.05 + 0.025, 0.065, 0.1], flat(T));    // tan brows
      v.capsule([sd * 0.07, 0.07, -0.03], [sd * 0.09, 0.18, -0.035], 0.036, 0.026, coat(C, 9)); // ears up...
      v.capsule([sd * 0.09, 0.18, -0.035], [sd * 0.095, 0.2, 0.03], 0.024, 0.02, coat(C, 9));   // ...the tips folded
    }
  });
  eyes(head, 0.07, 0.035, 0.1, '#3a2414', 0.036, 0.45);
  const jaw = joint(head, [0, -0.09, 0.08]);
  k.part(jaw, [0, 0, 0], (v) => v.capsule([0, -0.008, 0.03], [0, -0.014, 0.15], 0.036, 0.03, shag(W)));
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.08), new THREE.MeshLambertMaterial({ color: '#d86a6a' }));
  tongue.position.set(0, 0.012, 0.13); tongue.userData.plain = true; jaw.add(tongue);
  h.head = head; h.jaw = jaw;
  const tail = joint(h.body, [0, 0.72, -0.44]);
  k.part(tail, [0, 0, 0], (v) => {
    v.capsule([0, 0, 0], [0, 0.1, -0.12], 0.05, 0.062, shag(C));
    v.capsule([0, 0.1, -0.12], [0, 0.23, -0.2], 0.062, 0.055, shag(C));
    v.capsule([0, 0.23, -0.2], [0, 0.3, -0.22], 0.05, 0.035, shag(W));                       // the white tip
  });
  h.tail = tail;
  for (const [x, z, hind] of [[0.11, 0.24, 0], [-0.11, 0.24, 0], [0.11, -0.34, 1], [-0.11, -0.34, 1]] as const) {
    const leg = joint(h.body, [x, 0.46, z]);
    const sock: Paint = (x2, y, z2, n) => (y < -0.26 ? shag(W)(x2, y, z2, n) : coat(C, 9)(x2, y, z2, n));
    k.part(leg, [0, 0, 0], (v) => {
      if (hind) { v.ellipsoid([0, -0.08, 0], [0.065, 0.13, 0.09], shag(C)); v.capsule([0, -0.18, -0.035], [0, -0.42, 0], 0.036, 0.032, sock); }
      else v.capsule([0, 0, 0], [0, -0.41, 0.02], 0.046, 0.036, sock);
      v.ellipsoid([0, -0.43, 0.03], [0.05, 0.026, 0.066], shag(W));                          // paws
    });
    h.legs.push(leg);
  }
}

/** A pig: a round barrel of a body, a broad head with jowls, a flat snout with nostrils, ears flopped forward, a curled tail, trotters. a = skin, b = patches. */
function pig(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 1.0;
  const S = pal.a ?? '#e8a8a0', D = shade(S, 0.86), P = pal.b, hoof = '#5a3a32';
  const skin: Paint = (x, y, z, n) => (P && Math.sin(x * 6 + 1) * Math.sin(z * 5 + y * 2) + Math.sin(z * 3 - x * 4) * 0.4 > 0.5 ? shade(P, 0.92 + n * 0.1) : coat(S, 0.8)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.6, -0.02], [0.31, 0.28, 0.52], skin);
    v.ellipsoid([0, 0.5, 0.0], [0.28, 0.2, 0.44], skin);                                     // the belly, hanging
  });
  const head = joint(h.body, [0, 0.62, 0.52]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0.06], [0.2, 0.18, 0.17], skin);
    v.ellipsoid([0, -0.08, 0.09], [0.17, 0.1, 0.13], skin);                                  // jowls
    v.capsule([0, -0.05, 0.2], [0, -0.06, 0.3], 0.086, 0.085, coat(D, 9));                  // the snout
    v.box([-0.08, -0.13, 0.31], [0.08, 0.01, 0.335], coat(D, 9));                            // its flat end
    for (const sd of [1, -1]) {
      v.box([sd * 0.035 - 0.014, -0.08, 0.33], [sd * 0.035 + 0.014, -0.045, 0.34], flat('#5a2a2a', 0.04)); // nostrils
      v.tri([sd * 0.1, 0.14, 0.04], [sd * 0.22, 0.2, 0.18], [sd * 0.05, 0.2, 0.2], 0.03, coat(D, 9));       // ears, flopped forward
    }
  });
  eyes(head, 0.12, 0.06, 0.18, '#141010', 0.036, 0.7);
  h.head = head;
  const tail = joint(h.body, [0, 0.74, -0.52]);
  k.part(tail, [0, 0, 0], (v) => {
    const pts: V3[] = [[0, 0, 0], [0.035, 0.03, -0.04], [0.0, 0.065, -0.06], [-0.035, 0.035, -0.08], [0, 0.0, -0.1]];
    for (let i = 0; i < pts.length - 1; i++) v.capsule(pts[i], pts[i + 1], 0.02, 0.018, coat(D, 9));
  });
  h.tail = tail;
  for (const [x, z] of [[0.18, 0.3], [-0.18, 0.3], [0.18, -0.32], [-0.18, -0.32]] as const) {
    const leg = joint(h.body, [x, 0.36, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0.06, 0], [0, -0.29, 0.01], 0.075, 0.062, skin);
      v.box([-0.06, -0.36, -0.055], [0.06, -0.3, 0.07], flat(hoof));                         // the trotter...
      v.carve((cx, cy, cz) => Math.abs(cx) < 0.012 && cy < -0.3 && cz > 0.0);               // ...cloven
    });
    h.legs.push(leg);
  }
}
