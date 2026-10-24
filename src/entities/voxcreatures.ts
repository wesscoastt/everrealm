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
  /** Wings, arms, or a snake's run of joints. */
  segs: THREE.Object3D[];
  plateHeight: number;
}
export interface VoxCreaturePal { a?: string; b?: string; c?: string; glow?: boolean; breed?: string }

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
export function buildVoxCreature(h: VoxCreatureHost, kind: string, pal: VoxCreaturePal, scale = 1): boolean {
  const key = kind + JSON.stringify(pal);
  switch (kind) {
    case 'chicken': hen(h, new Kit(key, 1 / 24), pal); return true;
    case 'duck': duck(h, new Kit(key, 1 / 24), pal); return true;
    case 'rabbit': hare(h, new Kit(key, 1 / 24), pal); return true;
    case 'cat': cat(h, new Kit(key, 1 / 24), pal); return true;
    case 'dog': dog(h, new Kit(key, 1 / 20), pal); return true;
    case 'pig': pig(h, new Kit(key, 1 / 20), pal); return true;
    case 'wolf': case 'notch': wolf(h, new Kit(key + scale, 1 / 16), pal, kind === 'notch', scale); return true;
    case 'sheep': sheep(h, new Kit(key, 1 / 16), pal); return true;
    case 'cow': cow(h, new Kit(key, 1 / 16), pal); return true;
    case 'boar': boar(h, new Kit(key + scale, 1 / 16), pal, scale); return true;
    case 'deer': deer(h, new Kit(key, 1 / 16)); return true;
    case 'shark': shark(h, new Kit(key + scale, 1 / 16), pal, scale); return true;
    case 'ray': ray(h, new Kit(key + scale, 1 / 16), pal, scale); return true;
    case 'bear': bear(h, new Kit(key, 1 / 16), pal, scale); return true;
    case 'spider': spider(h, new Kit(key, 1 / 18), pal, scale); return true;
    case 'bat': bat(h, new Kit(key, 1 / 20), pal, scale); return true;
    case 'golem': golem(h, new Kit(key, 1 / 14), pal, scale); return true;
    case 'drake': drake(h, new Kit(key, 1 / 16), pal, scale); return true;
    case 'dragon': drake(h, new Kit(key, 1 / 16), pal, scale, true); return true;
    case 'adder': adder(h, new Kit(key, 1 / 18), pal, scale); return true;
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

// ---------------------------------------------------------------- The wild and the field, at the mounts' own cube size

/** A wolf: a deep chest to a tucked waist, a dark saddle and ruff, a pale belly, amber eyes, fangs and a jaw that opens, a brush tail. The pack leader (elite) is bigger, darker, one ear torn. a = fur, b = saddle and ruff, c = belly. */
function wolf(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, elite: boolean, scale: number): void {
  const F = pal.a ?? (elite ? '#5a5048' : '#8a7c6a'), D = pal.b ?? (elite ? '#3a332e' : '#5e5446'), L = pal.c ?? (elite ? '#8a8072' : '#c8bca6');
  const s = (elite ? 1.45 : 1) * scale;
  h.body.scale.setScalar(s);
  h.plateHeight = 1.45 * s;
  const pelt: Paint = (x, y, z, n) => (y > 1.0 ? shag(D)(x, y, z, n) : y < 0.64 ? shag(L)(x, y, z, n) : shag(F)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.capsule([0, 0.86, 0.26], [0, 0.86, -0.5], 0.24, 0.16, pelt);
    v.ellipsoid([0, 0.78, 0.28], [0.21, 0.27, 0.19], pelt);                                      // the deep chest
    v.ellipsoid([0, 0.95, 0.36], [0.27, 0.26, 0.16], shag(D));                                   // the ruff
    v.capsule([0, 0.98, 0.42], [0, 1.12, 0.62], 0.14, 0.12, pelt);                               // the neck
  });
  const head = joint(h.body, [0, 1.18, 0.7]);
  head.scale.setScalar(1.15);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0], [0.15, 0.12, 0.14], shag(F));
    v.ellipsoid([0, -0.06, -0.05], [0.2, 0.09, 0.08], shag(F));                                  // cheek fur
    v.capsule([0, -0.04, 0.12], [0, -0.06, 0.36], 0.075, 0.05, (x, y, z, n) => (y < -0.085 ? shag(L)(x, y, z, n) : Math.abs(x) < 0.03 && y > -0.02 ? coat(D, 9)(x, y, z, n) : coat(F, 9)(x, y, z, n))); // the muzzle, a dark ridge, pale lips
    v.box([-0.035, -0.06, 0.37], [0.035, -0.01, 0.41], flat('#16110e', 0.05));                  // the nose
    for (const sd of [1, -1]) {
      v.cone([sd * 0.09, 0.09, -0.04], [sd * 0.12, elite && sd === 1 ? 0.2 : 0.3, -0.07], 0.06, coat(D, 9)); // ears (the leader's right one torn)
      v.cone([sd * 0.05, -0.1, 0.32], [sd * 0.05, -0.17, 0.335], 0.018, flat('#efe8d8', 0.04)); // fangs
      v.box([sd * 0.085 - 0.045, 0.07, 0.11], [sd * 0.085 + 0.045, 0.09, 0.15], coat(D, 9));     // the dark brow
    }
    if (elite) v.capsule([0.1, -0.02, 0.15], [0.14, 0.1, 0.12], 0.012, 0.012, flat('#d8cfc0'));  // the scar
  });
  eyes(head, 0.085, 0.045, 0.145, elite ? '#e8a030' : '#e8c060', 0.034, 0.4, true);
  const jaw = joint(head, [0, -0.11, 0.1]);
  k.part(jaw, [0, 0, 0], (v) => {
    v.capsule([0, -0.02, 0.02], [0, -0.03, 0.24], 0.045, 0.034, shag(L));
    v.box([-0.04, 0.0, 0.2], [0.04, 0.02, 0.23], flat('#efe8d8', 0.04));                        // teeth
  });
  h.head = head; h.jaw = jaw;
  const tail = joint(h.body, [0, 0.96, -0.58]);
  k.part(tail, [0, 0, 0], (v) => {
    v.capsule([0, 0, 0], [0, -0.13, -0.15], 0.07, 0.09, shag(F));
    v.capsule([0, -0.13, -0.15], [0, -0.32, -0.3], 0.09, 0.08, shag(F));
    v.capsule([0, -0.32, -0.3], [0, -0.45, -0.38], 0.07, 0.04, shag(D));                         // the dark tip
  });
  h.tail = tail;
  for (const [x, z, hind] of [[0.15, 0.3, 0], [-0.15, 0.3, 0], [0.14, -0.44, 1], [-0.14, -0.44, 1]] as const) {
    const leg = joint(h.body, [x, 0.72, z]);
    k.part(leg, [0, 0, 0], (v) => {
      if (hind) {
        v.ellipsoid([0, -0.1, 0], [0.09, 0.19, 0.13], shag(F));                                  // the thigh
        v.capsule([0, -0.25, -0.02], [0, -0.5, -0.1], 0.055, 0.045, coat(F, 9));                 // the hock, bent back
        v.capsule([0, -0.5, -0.1], [0, -0.66, -0.06], 0.042, 0.04, coat(D, 9));
      } else {
        v.capsule([0, 0.02, 0], [0, -0.3, 0.02], 0.08, 0.06, shag(F));
        v.capsule([0, -0.3, 0.02], [0, -0.66, 0.03], 0.05, 0.042, coat(F, 9));
      }
      v.ellipsoid([0, -0.69, hind ? -0.02 : 0.05], [0.06, 0.03, 0.08], coat(D, 9));             // paws
    });
    h.legs.push(leg);
  }
}

/** A sheep: a lumpy fleece in tufts, a long dark face with a woolly poll, ears out sideways, pale eyes, wool to the knee, cloven hooves; a ram's horns curl round the ear. a = fleece, b = face and legs. */
function sheep(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 1.25;
  const W = pal.a ?? '#ece6d8', F = pal.b ?? '#2e2a26', hoof = '#1e1a16';
  const wool: Paint = (_x, y, _z, n) => shade(W, n < 0.2 ? 0.8 : 0.93 + n * 0.1 - (y < 0.62 ? 0.05 : 0));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.8, -0.02], [0.36, 0.31, 0.52], wool);
    for (const [x, y, z, r] of [[0, 1.06, 0.28, 0.18], [0.18, 1.04, -0.02, 0.17], [-0.18, 1.04, -0.02, 0.17], [0, 1.08, -0.3, 0.18], [0.2, 1.0, -0.42, 0.15], [-0.2, 1.0, -0.42, 0.15],
      [0.34, 0.86, 0.2, 0.15], [-0.34, 0.86, 0.2, 0.15], [0.36, 0.82, -0.22, 0.16], [-0.36, 0.82, -0.22, 0.16], [0, 0.88, 0.48, 0.17], [0, 0.82, -0.52, 0.17],
      [0.26, 0.6, 0.28, 0.13], [-0.26, 0.6, 0.28, 0.13], [0.27, 0.58, -0.3, 0.13], [-0.27, 0.58, -0.3, 0.13]] as const) v.ellipsoid([x, y, z], [r, r * 0.85, r], wool); // the tufts, so the outline is lumpy
  });
  const head = joint(h.body, [0, 0.98, 0.56]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, -0.02, -0.02], [0, -0.08, 0.28], 0.11, 0.07, coat(F, 9));                   // the long face
    v.ellipsoid([0, 0.12, -0.04], [0.15, 0.08, 0.11], wool);                                     // the woolly poll
    v.box([-0.05, -0.12, 0.31], [0.05, -0.07, 0.34], flat('#1a1614', 0.04));                    // the nose
    for (const sd of [1, -1]) {
      v.capsule([sd * 0.09, 0.05, -0.02], [sd * 0.22, 0.0, -0.02], 0.035, 0.03, coat(F, 9));    // ears out to the side
      if (pal.breed === 'ram') {
        let prev: V3 = [sd * 0.12, 0.13, -0.02];
        for (let i = 1; i <= 7; i++) {
          const a = i * 0.85, next: V3 = [sd * (0.14 + i * 0.012), 0.06 + Math.cos(a) * 0.09, -0.06 - Math.sin(a) * 0.09];
          v.capsule(prev, next, 0.045 - i * 0.003, 0.042 - i * 0.003, flat('#c8b890'));         // the horn, curling back and round
          prev = next;
        }
      }
    }
  });
  eyes(head, 0.11, 0.035, 0.08, '#d8c890', 0.04, 0.35);
  h.head = head;
  const tail = joint(h.body, [0, 0.86, -0.56]);
  k.part(tail, [0, 0, 0], (v) => { v.ellipsoid([0, -0.08, -0.04], [0.07, 0.1, 0.06], wool); });
  h.tail = tail;
  for (const [x, z] of [[0.2, 0.32], [-0.2, 0.32], [0.2, -0.34], [-0.2, -0.34]] as const) {
    const leg = joint(h.body, [x, 0.56, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.ellipsoid([0, -0.06, 0], [0.09, 0.11, 0.09], wool);                                     // wool to the knee
      v.capsule([0, -0.14, 0], [0, -0.5, 0.01], 0.04, 0.036, coat(F, 9));
      v.box([-0.05, -0.56, -0.045], [0.05, -0.5, 0.06], flat(hoof));
      v.carve((cx, cy, cz) => Math.abs(cx) < 0.01 && cy < -0.5 && cz > 0.0);                   // cloven
    });
    h.legs.push(leg);
  }
}

/** A dairy cow: a deep barrel with hips and shoulders showing, patches, an udder, a long head with a white face and pale muzzle, short horns, ears out sideways, white socks, a tufted tail. a = coat, b = patches, c = muzzle and udder. */
function cow(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal): void {
  h.plateHeight = 1.75;
  const C = pal.a ?? '#8a5a36', P = pal.b ?? '#efe8dc', M = pal.c ?? '#e8d6c4', hoof = '#1e1612';
  const hide: Paint = (x, y, z, n) => (Math.sin(x * 4 + 1) * Math.sin(z * 3 + y * 2) + Math.sin(z * 2.3 - x * 3) * 0.5 > 0.45 ? shade(P, 0.93 + n * 0.1) : coat(C, 1.38)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 1.08, -0.02], [0.39, 0.37, 0.84], hide);
    v.ellipsoid([0, 0.88, 0.0], [0.35, 0.24, 0.62], hide);                                     // the belly
    v.ellipsoid([0, 1.36, -0.6], [0.4, 0.13, 0.2], hide);                                      // the hips
    v.ellipsoid([0, 1.32, 0.5], [0.36, 0.12, 0.2], hide);                                      // the shoulders
    v.ellipsoid([0, 0.68, -0.42], [0.17, 0.12, 0.18], coat(M, 9));                              // the udder
    for (const [x, z] of [[0.07, -0.34], [-0.07, -0.34], [0.07, -0.5], [-0.07, -0.5]] as const) v.capsule([x, 0.6, z], [x, 0.52, z], 0.022, 0.02, coat(M, 9));
    v.capsule([0, 1.15, 0.72], [0, 1.22, 1.0], 0.2, 0.17, hide);                               // the neck
  });
  const head = joint(h.body, [0, 1.22, 1.02]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, 0.02, 0], [0, -0.08, 0.36], 0.17, 0.14, (x, y, z, n) => (Math.abs(x) < 0.08 && y > -0.02 && z < 0.3 ? shade(P, 0.93 + n * 0.1) : coat(C, 9)(x, y, z, n))); // a white face
    v.ellipsoid([0, -0.17, 0.44], [0.15, 0.11, 0.09], coat(M, 9));                              // the muzzle
    for (const sd of [1, -1]) {
      v.box([sd * 0.055 - 0.02, -0.21, 0.52], [sd * 0.055 + 0.02, -0.17, 0.54], flat('#3a2a2a', 0.04)); // nostrils
      v.capsule([sd * 0.15, 0.08, 0.02], [sd * 0.32, 0.06, 0.03], 0.05, 0.035, coat(C, 9));     // ears
      v.cone([sd * 0.12, 0.16, 0.02], [sd * 0.26, 0.3, 0.0], 0.036, flat('#e8dcc0'));            // horns
    }
  });
  eyes(head, 0.15, 0.05, 0.3, '#141010', 0.045, 0.6);
  h.head = head;
  const tail = joint(h.body, [0, 1.42, -0.82]);
  k.part(tail, [0, 0, 0], (v) => {
    v.capsule([0, 0, 0], [0, -0.6, -0.04], 0.032, 0.03, coat(C, 9));
    v.ellipsoid([0, -0.66, -0.04], [0.05, 0.09, 0.05], shag('#2a1e16'));                       // the tuft
  });
  h.tail = tail;
  for (const [x, z] of [[0.24, 0.6], [-0.24, 0.6], [0.24, -0.62], [-0.24, -0.62]] as const) {
    const leg = joint(h.body, [x, 0.74, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0.04, 0], [0, -0.5, 0.01], 0.1, 0.075, coat(C, 9));
      v.capsule([0, -0.5, 0.01], [0, -0.66, 0.01], 0.07, 0.065, coat(P, 9));                    // white socks
      v.box([-0.08, -0.74, -0.07], [0.08, -0.66, 0.09], flat(hoof));
      v.carve((cx, cy, cz) => Math.abs(cx) < 0.012 && cy < -0.66 && cz > 0.01);
    });
    h.legs.push(leg);
  }
}

/** A boar: a heavy hump at the shoulder with a bristle crest along the spine, a wedge of a head, a flat snout, tusks curving up, short legs. a = hide, b = bristles, c = snout. */
function boar(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 1.25 * scale;
  const Hd = pal.a ?? '#5a3e2a', B = pal.b ?? '#3a281a', Sn = pal.c ?? '#b8867a', hoof = '#1e1612';
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.68, -0.04], [0.31, 0.31, 0.56], shag(Hd));
    v.ellipsoid([0, 0.84, 0.26], [0.3, 0.27, 0.28], shag(Hd));                                  // the hump
    for (let z = -0.42; z <= 0.44; z += 0.07) {
      const top = 0.96 + Math.max(0, 0.12 - Math.abs(z - 0.25) * 0.2);
      v.cone([0, top - 0.04, z], [0, top + 0.12, z - 0.03], 0.045, shag(B));                     // the bristle crest
    }
  });
  const head = joint(h.body, [0, 0.7, 0.62]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, 0.04, 0], [0, -0.06, 0.3], 0.22, 0.13, shag(Hd));
    v.box([-0.12, -0.16, 0.34], [0.12, 0.0, 0.42], coat(Sn, 9));                               // the snout
    for (const sd of [1, -1]) {
      v.box([sd * 0.05 - 0.02, -0.1, 0.42], [sd * 0.05 + 0.02, -0.06, 0.43], flat('#3a2a2a', 0.04));
      v.cone([sd * 0.12, -0.12, 0.3], [sd * 0.2, 0.04, 0.4], 0.03, flat('#efe6cf'));             // tusks, curving up
      v.capsule([sd * 0.13, 0.18, -0.02], [sd * 0.2, 0.3, -0.06], 0.05, 0.03, shag(B));          // ears
    }
  });
  eyes(head, 0.14, 0.08, 0.24, '#1a1410', 0.04, 0.6);
  h.head = head;
  const tail = joint(h.body, [0, 0.84, -0.56]);
  k.part(tail, [0, 0, 0], (v) => { v.capsule([0, 0, 0], [0, -0.18, -0.06], 0.026, 0.024, shag(B)); v.ellipsoid([0, -0.22, -0.07], [0.035, 0.05, 0.035], shag(B)); });
  h.tail = tail;
  for (const [x, z] of [[0.2, 0.36], [-0.2, 0.36], [0.2, -0.36], [-0.2, -0.36]] as const) {
    const leg = joint(h.body, [x, 0.42, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0.04, 0], [0, -0.38, 0.01], 0.085, 0.065, shag(Hd));
      v.box([-0.075, -0.45, -0.06], [0.075, -0.38, 0.085], flat(hoof));
      v.carve((cx, cy, cz) => Math.abs(cx) < 0.012 && cy < -0.38 && cz > 0.0);
    });
    h.legs.push(leg);
  }
}

/** A red deer stag: slim and long-legged, a pale belly and white rump, a long neck, big ears and branching antlers. */
function deer(h: VoxCreatureHost, k: Kit): void {
  h.plateHeight = 1.8;
  const F = '#a8723e', Bl = '#e8d4b4', Ant = '#6a5038', hoof = '#2a2018';
  const pelt: Paint = (x, y, z, n) => (y < 0.86 ? coat(Bl, 9)(x, y, z, n) : coat(F, 1.16)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.capsule([0, 1.02, 0.36], [0, 1.0, -0.44], 0.21, 0.19, pelt);
    v.ellipsoid([0, 1.06, -0.5], [0.15, 0.15, 0.09], coat(Bl, 9));                              // the white rump
    v.ellipsoid([0, 1.14, -0.58], [0.05, 0.08, 0.045], coat(F, 9));                             // the tail
  });
  const head = joint(h.body, [0, 1.3, 0.55]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, -0.14, -0.1], [0, 0.28, 0.1], 0.09, 0.075, coat(F, 9));                      // the neck
    v.capsule([0, 0.34, 0.05], [0, 0.3, 0.34], 0.11, 0.06, coat(F, 9));                         // the head, narrowing to the nose
    v.box([-0.035, 0.28, 0.37], [0.035, 0.33, 0.4], flat('#1a1410', 0.04));
    for (const sd of [1, -1]) {
      v.capsule([sd * 0.08, 0.42, 0.04], [sd * 0.2, 0.47, 0.02], 0.04, 0.03, coat(F, 9));       // ears
      v.capsule([sd * 0.06, 0.4, 0.04], [sd * 0.16, 0.8, -0.02], 0.048, 0.04, flat(Ant));      // the main beam
      v.capsule([sd * 0.08, 0.5, 0.05], [sd * 0.09, 0.55, 0.19], 0.04, 0.034, flat(Ant));        // brow tine
      v.capsule([sd * 0.11, 0.62, 0.02], [sd * 0.07, 0.75, 0.15], 0.04, 0.034, flat(Ant));
      v.capsule([sd * 0.14, 0.72, 0.0], [sd * 0.25, 0.86, 0.06], 0.038, 0.032, flat(Ant));       // the crown
    }
  });
  eyes(head, 0.085, 0.36, 0.2, '#1a1410', 0.036, 0.7);
  h.head = head;
  for (const [x, z] of [[0.14, 0.38], [-0.14, 0.38], [0.14, -0.38], [-0.14, -0.38]] as const) {
    const leg = joint(h.body, [x, 0.82, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0.04, 0], [0, -0.42, 0], 0.065, 0.045, coat(F, 9));
      v.capsule([0, -0.42, 0], [0, -0.76, 0.01], 0.036, 0.034, coat(F, 9));
      v.box([-0.04, -0.82, -0.04], [0.04, -0.76, 0.05], flat(hoof));
    });
    h.legs.push(leg);
  }
}

// ---------------------------------------------------------------- The sea

/** A shark: dark above and pale below, a raked dorsal fin, pectoral fins out to the sides, gill slits, a jaw full of teeth, a tall upper tail lobe. a = back, b = belly, c = fins. */
function shark(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 1.1 * scale;
  const Bk = pal.a ?? '#5a6670', Bl = pal.b ?? '#d8dcd8', Fn = pal.c ?? '#46525c';
  const hide = (under: number): Paint => (x, y, z, n) => (y < under ? coat(Bl, 9)(x, y, z, n) : coat(Bk, 9)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.capsule([0, 0.46, 0.5], [0, 0.47, -0.5], 0.27, 0.2, hide(0.38));
    v.tri([0, 0.66, 0.26], [0, 0.66, -0.06], [0, 1.08, -0.16], 0.07, coat(Fn, 9));             // the dorsal fin, raked back
    for (const sd of [1, -1]) v.tri([sd * 0.2, 0.3, 0.42], [sd * 0.2, 0.3, 0.14], [sd * 0.72, 0.12, 0.04], 0.06, coat(Fn, 9)); // pectoral fins
  });
  const head = joint(h.body, [0, 0.47, 0.72]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, 0.02, 0.0], [0, 0.04, 0.48], 0.23, 0.12, (x, y, z, n) => (Math.abs(x) > 0.17 && z < -0.0 && z > -0.2 && Math.floor(z * 30) % 2 === 0 ? shade('#2a3238', 0.95) : hide(-0.08)(x, y, z, n))); // the gill slits
  });
  eyes(head, 0.19, 0.1, 0.3, '#0c0e10', 0.05, 0.9);
  const jaw = joint(head, [0, -0.16, 0.06]);
  k.part(jaw, [0, 0, 0], (v) => {
    v.capsule([0, -0.02, 0.05], [0, -0.03, 0.36], 0.12, 0.07, coat(Bl, 9));
    v.box([-0.09, 0.0, 0.33], [0.09, 0.05, 0.38], flat('#f4f0e4', 0.04));                      // teeth
  });
  h.head = head; h.jaw = jaw;
  const tail = joint(h.body, [0, 0.47, -0.55]);
  k.part(tail, [0, 0, 0], (v) => {
    v.capsule([0, 0, 0], [0, 0.02, -0.76], 0.19, 0.07, hide(-0.06));
    v.tri([0, 0.04, -0.6], [0, 0.04, -0.84], [0, 0.64, -1.12], 0.06, coat(Fn, 9));            // the long upper lobe
    v.tri([0, -0.02, -0.66], [0, -0.02, -0.84], [0, -0.36, -0.98], 0.06, coat(Fn, 9));        // and the short lower one
    v.tri([0, 0.14, -0.38], [0, 0.14, -0.52], [0, 0.3, -0.56], 0.05, coat(Fn, 9));            // the second dorsal
  });
  h.tail = tail;
}

/** A ray: a broad flat disc of wings hinged either side, spotted on top and pale beneath, thorns down the spine, a long whip of a tail with its sting. a = back, b = belly, c = spots. */
function ray(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 0.8 * scale;
  const Bk = pal.a ?? '#7a6a4a', Bl = pal.b ?? '#e8e2d2', Sp = pal.c ?? '#b8a478', thorn = '#efe6cc';
  const skin = (under: number): Paint => (x, y, z, n) => (y < under ? coat(Bl, 9)(x, y, z, n) : n < 0.09 ? shade(Sp, 0.95 + n) : coat(Bk, 9)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.3, 0.04], [0.33, 0.09, 0.43], skin(0.27));
    v.ellipsoid([0, 0.32, 0.5], [0.15, 0.07, 0.13], skin(0.29));                                // the snout
    for (let z = 0.3; z >= -0.34; z -= 0.16) v.cone([0, 0.36, z], [0, 0.45, z - 0.02], 0.03, flat(thorn)); // thorns down the spine
  });
  eyes(h.body, 0.11, 0.42, 0.34, '#1a1610', 0.05, 0);
  for (const sd of [1, -1]) {
    const wing = joint(h.body, [sd * 0.32, 0.3, 0.04]);
    k.part(wing, [0, 0, 0], (v) => {
      v.ellipsoid([sd * 0.42, 0, -0.02], [0.48, 0.045, 0.38], skin(-0.02));
      v.tri([sd * 0.72, 0, 0.12], [sd * 0.72, 0, -0.26], [sd * 1.04, 0, -0.12], 0.05, skin(-0.02)); // the wingtip
    });
    h.legs.push(wing);
  }
  const tail = joint(h.body, [0, 0.3, -0.4]);
  k.part(tail, [0, 0, 0], (v) => {
    v.capsule([0, 0, 0], [0, 0, -1.04], 0.055, 0.02, coat(Bk, 9));
    for (let z = -0.1; z > -0.95; z -= 0.17) v.cone([0, 0.03, z], [0, 0.1, z - 0.03], 0.025, flat(thorn));
    v.tri([0, 0.02, -0.98], [0, 0.02, -1.1], [0, 0.12, -1.06], 0.03, coat(Sp, 9));             // the sting
  });
  h.tail = tail;
}

/** A part that glows (a rune, a throat full of fire): a plain box with its own light, not cubes. */
function glowBox(parent: THREE.Object3D, at: V3, size: V3, colour: string): void {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshLambertMaterial({ color: colour, emissive: new THREE.Color(colour).multiplyScalar(0.9) }));
  m.position.set(...at);
  m.userData.plain = true;
  parent.add(m);
}

/**
 * A bear: a heavy barrel of a body under a shoulder hump, a broad dished face with small round ears,
 * thick legs on wide paws with pale claws. a = coat, b = the darker legs and hump, c = the muzzle.
 */
function bear(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 1.75 * scale;
  const F = pal.a ?? '#6a4a2e', D = pal.b ?? '#46301c', M = pal.c ?? '#a8865e', claw = '#d8ccb0';
  const pelt: Paint = (x, y, z, n) => (y < 0.62 ? shag(D)(x, y, z, n) : y > 1.2 ? shag(shade(F, 0.88))(x, y, z, n) : shag(F)(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.94, -0.14], [0.42, 0.4, 0.7], pelt);                                       // the barrel
    v.ellipsoid([0, 1.1, 0.3], [0.38, 0.36, 0.36], pelt);                                        // the shoulders
    v.ellipsoid([0, 1.22, 0.26], [0.26, 0.2, 0.26], shag(D));                                    // the hump over them
    v.ellipsoid([0, 0.88, 0.5], [0.33, 0.36, 0.24], pelt);                                       // the chest
    v.ellipsoid([0, 0.98, -0.66], [0.36, 0.36, 0.26], pelt);                                     // the haunches
  });
  const head = joint(h.body, [0, 1.06, 0.78]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.04, 0], [0.25, 0.23, 0.23], shag(F));                                      // the skull, broad across
    v.ellipsoid([0, 0, -0.08], [0.28, 0.24, 0.16], shag(F));                                     // the ruff at the cheeks
    v.capsule([0, -0.02, 0.12], [0, -0.06, 0.34], 0.13, 0.1, coat(M, 9));                        // the muzzle
    v.box([-0.055, -0.06, 0.4], [0.055, 0.01, 0.45], flat('#1a1210', 0.04));                     // the nose
    for (const sd of [1, -1]) v.ellipsoid([sd * 0.17, 0.22, -0.04], [0.065, 0.07, 0.04], shag(D)); // round ears
  });
  eyes(head, 0.11, 0.1, 0.18, '#1a1008', 0.04, 0.5);
  const jaw = joint(head, [0, -0.1, 0.1]);
  k.part(jaw, [0, 0, 0], (v) => {
    v.capsule([0, -0.02, 0], [0, -0.04, 0.22], 0.08, 0.06, coat(M, 9));
    for (const sd of [1, -1]) v.cone([sd * 0.05, 0, 0.2], [sd * 0.05, 0.07, 0.21], 0.018, flat('#f0e8d8')); // the lower fangs
  });
  h.jaw = jaw;
  h.head = head;
  const tail = joint(h.body, [0, 1.0, -0.9]);
  k.part(tail, [0, 0, 0], (v) => { v.ellipsoid([0, -0.02, -0.03], [0.07, 0.07, 0.06], shag(F)); });
  h.tail = tail;
  for (const [x, z] of [[0.26, 0.48], [-0.26, 0.48], [0.26, -0.6], [-0.26, -0.6]] as const) {
    const leg = joint(h.body, [x, 0.66, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0.12, 0], [0, -0.54, 0.02], 0.16, 0.13, shag(D));
      v.ellipsoid([0, -0.6, 0.06], [0.14, 0.07, 0.17], shag(D));                                 // the paw
      for (const cx of [-0.08, -0.027, 0.027, 0.08]) v.cone([cx, -0.62, 0.2], [cx, -0.66, 0.27], 0.02, flat(claw));
    });
    h.legs.push(leg);
  }
}

/**
 * A great spider: a domed head-and-chest with a cluster of eyes and two hooked fangs, a heavy abdomen
 * behind with pale chevrons down its back, and eight long banded legs, each kneed up above the body and
 * down to the ground. a = body, b = the chevrons and leg bands, c = the eyes (they shine, with glow).
 */
function spider(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 1.25 * scale;
  const A = pal.a ?? '#3a2e24', Mk = pal.b ?? '#b8862a', E = pal.c ?? '#c83a2a';
  const hairy: Paint = (_x, _y, _z, n) => shade(A, n < 0.2 ? 0.75 : 0.92 + n * 0.12);
  // Chevrons pointing forward down the back of the abdomen
  const abdomen: Paint = (x, y, z, n) => (y > 0.78 && (-z * 5 + Math.abs(x) * 3) % 1 < 0.24 ? shade(Mk, 0.9 + n * 0.15) : hairy(x, y, z, n));
  const banded: Paint = (x, y, z, n) => ((Math.abs(x) * 6 + 10) % 1 < 0.2 ? shade(Mk, 0.85 + n * 0.12) : hairy(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.56, 0.2], [0.26, 0.19, 0.28], hairy);                                     // the head and chest
    v.capsule([0, 0.58, -0.02], [0, 0.62, -0.12], 0.08, 0.08, hairy);                           // the waist
    v.ellipsoid([0, 0.66, -0.4], [0.36, 0.32, 0.42], abdomen);                                  // the abdomen
    v.cone([0, 0.6, -0.8], [0, 0.56, -0.88], 0.04, hairy);                                      // the spinnerets
  });
  const head = joint(h.body, [0, 0.58, 0.44]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.02, 0], [0.15, 0.12, 0.1], hairy);
    for (const sd of [1, -1]) {
      v.capsule([sd * 0.06, -0.04, 0.06], [sd * 0.06, -0.16, 0.12], 0.045, 0.035, hairy);       // the jaws
      v.cone([sd * 0.06, -0.16, 0.12], [sd * 0.03, -0.25, 0.08], 0.025, flat('#1a1410'));        // the fangs, hooked in
      v.capsule([sd * 0.1, -0.06, 0.06], [sd * 0.17, -0.14, 0.17], 0.025, 0.02, banded);         // the feelers
    }
  });
  // Eight eyes: two great ones in front, six smaller round them
  eyes(head, 0.045, 0.08, 0.09, E, 0.05, 0.2, !!pal.glow);
  eyes(head, 0.1, 0.1, 0.06, E, 0.03, 0.6, !!pal.glow);
  eyes(head, 0.06, 0.13, 0.05, E, 0.025, 0.3, !!pal.glow);
  eyes(head, 0.11, 0.05, 0.03, E, 0.022, 0.9, !!pal.glow);
  h.head = head;
  const rows = [0.36, 0.25, 0.13, 0.0], reach = [0.62, 0.26, -0.2, -0.58];
  for (let r = 0; r < 4; r++) for (const sd of [1, -1]) {
    const leg = joint(h.body, [sd * 0.2, 0.56, rows[r]]);
    k.part(leg, [0, 0, 0], (v) => {
      const knee: V3 = [sd * 0.5, 0.36, reach[r] * 0.45], foot: V3 = [sd * 0.92, -0.56, reach[r]];
      v.capsule([0, 0, 0], knee, 0.06, 0.05, banded);
      v.capsule(knee, foot, 0.05, 0.025, banded);
    });
    h.legs.push(leg);
  }
}

/**
 * A great bat: a furred body and a big-eared, snub-nosed head, and two wings of skin stretched over the
 * long finger bones, a hooked thumb at each wrist. a = fur, b = the wings, c = the eyes. It flies the
 * way the moths do (CreatureModel.updateMoth): its wings are its segments.
 */
function bat(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 2.1 * scale;
  const F = pal.a ?? '#4a3a30', W = pal.b ?? '#2e2420', E = pal.c ?? '#e8a030';
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, -0.02], [0.17, 0.16, 0.26], shag(F));
    v.capsule([0, -0.04, -0.24], [0, -0.1, -0.4], 0.07, 0.03, shag(F));                          // the rump, tucked
    for (const sd of [1, -1]) v.capsule([sd * 0.08, -0.12, -0.3], [sd * 0.1, -0.24, -0.4], 0.025, 0.015, flat(W)); // the feet, trailing
  });
  const head = joint(h.body, [0, 0.04, 0.24]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0.02], [0.12, 0.11, 0.11], shag(F));
    v.capsule([0, -0.02, 0.08], [0, -0.04, 0.16], 0.06, 0.04, shag(shade(F, 0.85)));             // the snout
    for (const sd of [1, -1]) {
      v.tri([sd * 0.05, 0.08, 0], [sd * 0.14, 0.08, -0.02], [sd * 0.12, 0.3, -0.04], 0.03, flat(W)); // tall ears
      v.cone([sd * 0.025, -0.08, 0.15], [sd * 0.025, -0.13, 0.15], 0.012, flat('#f0e8d8'));        // fangs
    }
  });
  eyes(head, 0.06, 0.03, 0.1, E, 0.035, 0.4, true);
  h.head = head;
  for (const sd of [1, -1]) {
    const w = joint(h.body, [sd * 0.12, 0.04, 0.04]);
    w.userData.sd = sd;
    w.userData.hind = 0;
    k.part(w, [0, 0, 0], (v) => {
      // The arm out to the wrist, the long fingers fanned from it, and the skin between them and down to the flank
      const wrist: V3 = [sd * 0.42, 0.06, 0.08];
      const tips: V3[] = [[sd * 0.95, 0, 0.18], [sd * 0.98, -0.02, -0.12], [sd * 0.8, -0.04, -0.38], [sd * 0.45, -0.04, -0.42]];
      v.capsule([0, 0, 0], wrist, 0.035, 0.025, flat(F));
      for (const t of tips) v.capsule(wrist, t, 0.016, 0.01, flat(shade(W, 0.8)));
      for (let i = 0; i < tips.length - 1; i++) v.tri(wrist, tips[i], tips[i + 1], 0.03, flat(W, 0.12));
      v.tri([0, 0, 0], wrist, tips[3], 0.03, flat(W, 0.12));
      v.tri([0, 0, 0], tips[3], [sd * 0.06, -0.06, -0.3], 0.03, flat(W, 0.12));
      v.cone(wrist, [sd * 0.46, 0.12, 0.14], 0.02, flat('#d8ccb8'));                             // the thumb's hook
    });
    h.segs.push(w);
  }
}

/**
 * A cairn woken: boulders stacked into a body, shoulders and a head, held together by moss and old
 * roots, with rune-light burning in a crack in its chest and in its eyes. It walks on two pillars of
 * stone and fights with its fists (its arms are its segments). a = the stone, b = the moss, c = the light.
 */
function golem(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 2.9 * scale;
  const S = pal.a ?? '#7a7a74', Ms = pal.b ?? '#4a6a2e', R = pal.c ?? '#7fd8f0';
  // Stone in courses, as a dry-stone wall is; moss in patches on the upper stones
  const stone: Paint = (x, y, _z, n) => shade(S, 0.82 + n * 0.22 - ((Math.floor(y * 9 + Math.abs(x) * 3) & 1) ? 0.05 : 0));
  const mossy: Paint = (x, y, z, n) => (n < 0.3 ? shade(Ms, 0.8 + n * 0.6) : stone(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.ellipsoid([0, 1.1, 0], [0.36, 0.2, 0.26], stone);                                         // the hips
    v.ellipsoid([0, 1.38, 0], [0.42, 0.3, 0.3], stone);                                         // the belly stone
    v.ellipsoid([0, 1.84, 0.02], [0.6, 0.36, 0.38], stone);                                     // the chest, one great slab
    v.ellipsoid([0, 2.04, -0.06], [0.44, 0.2, 0.3], mossy);                                     // moss across the shoulders
    v.carve((x, y, z) => z > 0.28 && Math.abs(x) < 0.07 && y > 1.66 && y < 1.98);               // the crack the light shows through
  });
  glowBox(h.body, [0, 1.82, 0.32], [0.12, 0.3, 0.1], R);
  const head = joint(h.body, [0, 2.14, 0.12]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0.14, 0], [0.22, 0.18, 0.2], mossy);
    v.box([-0.2, 0.2, 0.1], [0.2, 0.27, 0.2], stone);                                           // the brow, overhanging
  });
  eyes(head, 0.08, 0.12, 0.19, R, 0.06, 0.1, true);
  h.head = head;
  for (const sd of [1, -1]) {
    const arm = joint(h.body, [sd * 0.62, 1.94, 0.02]);
    k.part(arm, [0, 0, 0], (v) => {
      v.ellipsoid([sd * 0.04, 0.04, 0], [0.24, 0.22, 0.24], mossy);                             // the shoulder
      v.capsule([sd * 0.08, -0.1, 0], [sd * 0.12, -0.62, 0.04], 0.17, 0.15, stone);
      v.capsule([sd * 0.12, -0.66, 0.04], [sd * 0.12, -1.0, 0.08], 0.15, 0.14, stone);
      v.ellipsoid([sd * 0.12, -1.16, 0.08], [0.22, 0.22, 0.24], mossy);                         // the fist
    });
    h.segs.push(arm);
  }
  for (const sd of [1, -1]) {
    const leg = joint(h.body, [sd * 0.24, 1.0, 0]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0, 0], [0, -0.66, 0.02], 0.2, 0.18, stone);
      v.box([-0.2, -1.0, -0.18], [0.2, -0.72, 0.26], mossy);                                    // the foot, a block
    });
    h.legs.push(leg);
  }
}

/**
 * A drake: a small dragon the size of a pony, on four clawed legs, with a long neck and a horned head, a
 * ridge of spines down its back and a spade at the tip of its tail, and leathery wings folded along its
 * sides that it opens as it rears to spit fire (the wings are its segments). a = scales, b = belly and
 * wing skin, c = the fire in its throat.
 */
function drake(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number, great = false): void {
  // A dragon (great) is the same beast grown into its wings: they reach more than twice as far, a second
  // pair of horns curls back behind the first, and a crest of plates runs down its skull
  const W = great ? 2.4 : 1;
  h.body.scale.setScalar(scale);
  h.plateHeight = 2.0 * scale;
  const Sc = pal.a ?? '#6a2a1e', Bl = pal.b ?? '#c89a5a', Fi = pal.c ?? '#ff8a30', spine = shade(Sc, 0.7);
  const scales: Paint = (_x, y, z, n) => { const row = Math.floor(z * 14 + (Math.floor(y * 14) & 1) * 0.5); return shade(Sc, 0.86 + (((row * 7) % 5) + 5) % 5 / 30 + n * 0.08); };
  const belly: Paint = (x, y, z, n) => (y < 0.84 ? shade(Bl, 0.9 + ((Math.floor(z * 12) & 1) ? 0.06 : 0) + n * 0.05) : scales(x, y, z, n));
  k.part(h.body, [0, 0, 0], (v) => {
    v.capsule([0, 0.98, 0.34], [0, 1.0, -0.5], 0.32, 0.26, belly);                              // the body
    v.capsule([0, 1.08, 0.42], [0, 1.5, 0.72], 0.18, 0.13, belly);                              // the neck, raised
    for (let z = -0.5; z <= 0.36; z += 0.1) v.cone([0, 1.22, z], [0, 1.38, z - 0.06], 0.04, flat(spine));
    for (let t = 0.2; t <= 0.8; t += 0.2) v.cone([0, 1.2 + t * 0.4, 0.42 + t * 0.3], [0, 1.32 + t * 0.4, 0.38 + t * 0.3], 0.03, flat(spine));
  });
  const head = joint(h.body, [0, 1.56, 0.78]);
  k.part(head, [0, 0, 0], (v) => {
    v.capsule([0, 0.02, -0.04], [0, -0.02, 0.3], 0.14, 0.09, scales);                           // the skull and snout
    for (const sd of [1, -1]) {
      v.cone([sd * 0.08, 0.1, -0.04], [sd * 0.16, 0.2, -0.32], 0.035, flat('#d8ccb0'));          // horns, swept back
      if (great) v.cone([sd * 0.06, 0.04, -0.08], [sd * 0.22, 0.02, -0.4], 0.03, flat('#c8bca0'));  // the second pair, lower
      v.cone([sd * 0.1, 0, 0.06], [sd * 0.2, 0.04, -0.02], 0.025, flat(spine));                  // the frills at its cheeks
    }
  });
  eyes(head, 0.09, 0.06, 0.14, '#f0c030', 0.035, 0.5, true);
  const jaw = joint(head, [0, -0.08, 0.02]);
  k.part(jaw, [0, 0, 0], (v) => {
    v.capsule([0, -0.02, 0], [0, -0.03, 0.28], 0.07, 0.05, belly);
    for (const sd of [1, -1]) for (const z of [0.12, 0.19, 0.25]) v.cone([sd * 0.045, 0, z], [sd * 0.045, 0.05, z], 0.012, flat('#f0e8d8'));
  });
  glowBox(jaw, [0, 0.01, 0.14], [0.07, 0.03, 0.16], Fi);
  h.jaw = jaw;
  h.head = head;
  const tail = joint(h.body, [0, 0.98, -0.72]);
  k.part(tail, [0, 0, 0], (v) => {
    v.capsule([0, 0, 0], [0, -0.3, -0.7], 0.16, 0.08, scales);
    v.capsule([0, -0.3, -0.7], [0, -0.5, -1.2], 0.08, 0.03, scales);
    v.tri([0, -0.48, -1.12], [0.14, -0.52, -1.3], [-0.14, -0.52, -1.3], 0.03, flat(spine));     // the spade
  });
  h.tail = tail;
  for (const sd of [1, -1]) {
    const w = joint(h.body, [sd * 0.24, 1.18, 0.24]);
    w.userData.sd = sd;
    k.part(w, [0, 0, 0], (v) => {
      const wrist: V3 = [sd * 0.5 * (great ? 1.5 : 1), 0.25 * (great ? 1.4 : 1), 0];
      const tips: V3[] = ([[1.15, 0.1, -0.1], [1.1, -0.1, -0.45], [0.75, -0.2, -0.65]] as V3[]).map(([x, y, z]) => [sd * x * W, y * (great ? 1.6 : 1), z * (great ? 1.6 : 1)] as V3);
      v.capsule([0, 0, 0], wrist, 0.06, 0.04, scales);
      for (const t of tips) v.capsule(wrist, t, 0.025, 0.012, flat(spine));
      for (let i = 0; i < tips.length - 1; i++) v.tri(wrist, tips[i], tips[i + 1], 0.03, flat(Bl, 0.14));
      v.tri([0, 0, 0], wrist, tips[2], 0.03, flat(Bl, 0.14));
      v.tri([0, 0, 0], tips[2], [sd * 0.05, -0.1, -0.5], 0.03, flat(Bl, 0.14));
      v.cone(wrist, [sd * 0.54, 0.38, 0.06], 0.03, flat('#d8ccb0'));                             // the claw at the wrist
    });
    h.segs.push(w);
  }
  for (const [x, z] of [[0.26, 0.34], [-0.26, 0.34], [0.26, -0.42], [-0.26, -0.42]] as const) {
    const leg = joint(h.body, [x, 0.62, z]);
    k.part(leg, [0, 0, 0], (v) => {
      v.capsule([0, 0.12, 0], [0, -0.28, -0.06], 0.13, 0.09, scales);                           // the thigh
      v.capsule([0, -0.28, -0.06], [0, -0.58, 0.04], 0.08, 0.07, scales);
      for (const cx of [-0.06, 0, 0.06]) v.cone([cx, -0.6, 0.06], [cx, -0.64, 0.18], 0.025, flat('#2a2018'));
    });
    h.legs.push(leg);
  }
}

/**
 * A great adder: long and heavy, marked with a dark zigzag down its back over a pale belly, with a broad
 * head and a forked tongue. Its body is a chain of joints, each hung on the one before, so the lizard's
 * wave (CreatureModel) runs down it as an S. It rears its head to strike. a = scales, b = zigzag, c = belly.
 */
function adder(h: VoxCreatureHost, k: Kit, pal: VoxCreaturePal, scale: number): void {
  h.body.scale.setScalar(scale);
  h.plateHeight = 0.9 * scale;
  const Sc = pal.a ?? '#8a7a4a', Zz = pal.b ?? '#2a2218', Bl = pal.c ?? '#d8c890';
  const skin = (r: number): Paint => (x, y, z, n) => {
    if (y < -r * 0.45) return shade(Bl, 0.92 + n * 0.08);
    if (y > r * 0.3 && Math.abs(x - Math.sin(z * 18) * r * 0.45) < r * 0.28) return shade(Zz, 0.9 + n * 0.1);
    return shade(Sc, 0.88 + n * 0.14);
  };
  const R = [0.11, 0.13, 0.14, 0.14, 0.13, 0.11, 0.09, 0.07, 0.05, 0.035], L = 0.26;
  let parent: THREE.Object3D = h.body, at: V3 = [0, 0.14, 0.5];
  for (let i = 0; i < R.length; i++) {
    const seg = joint(parent, at);
    const r = R[i], r2 = R[i + 1] ?? 0.02;
    k.part(seg, [0, 0, 0], (v) => { v.capsule([0, 0, 0], [0, 0, -L], r, r2, skin(r)); });
    h.segs.push(seg);
    parent = seg;
    at = [0, 0, -L];
  }
  const head = joint(h.body, [0, 0.16, 0.56]);
  k.part(head, [0, 0, 0], (v) => {
    v.ellipsoid([0, 0, 0.06], [0.12, 0.07, 0.14], skin(0.12));
    v.box([-0.05, 0.05, 0.0], [0.05, 0.08, 0.12], flat(Zz));                                    // the dark crown
    v.capsule([0, -0.02, 0.2], [0, -0.02, 0.3], 0.012, 0.008, flat('#c82a3a'));                // the tongue
    for (const sd of [1, -1]) v.capsule([0, -0.02, 0.3], [sd * 0.03, -0.02, 0.35], 0.008, 0.006, flat('#c82a3a'));
  });
  eyes(head, 0.08, 0.03, 0.12, '#c8a020', 0.03, 0.6);
  h.head = head;
}
