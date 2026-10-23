import * as THREE from 'three';
import { shade, Vox, VOX_MAT, type Paint } from './vox';

// Every mount, sculpted in cubes a sixteenth of a block on a side: the world's own pixel size, so a
// horse's coat, a kilncat's stripes and a turtle's scutes read like the blocks around them. Each keeps
// the saddle height (the rider sits at 1.08 over the ground) and four legs in the same order, fore
// pair then hind, so the gaits drive them. a = coat, hide or metal; b = mane, markings, plates or
// plumage; c = saddle cloth; glow lights eyes (hooves on a horse, antlers on a stag).
// The cubes are worked out once per look and shared by every mount that wears it.

type V3 = [number, number, number];
export interface VoxMountHost { body: THREE.Group; legs: THREE.Object3D[]; segs: THREE.Object3D[] }
export interface VoxMountPal { a?: string; b?: string; c?: string; glow?: boolean; breed?: string; pillion?: boolean; /** In the shafts of a wagon: a harness, not a saddle. */ harness?: boolean }
/** A wagon behind the animal: an open cart or a wagon with a canvas tilt; paint for the boards and wheels. */
export interface WagonLook { kind: 'cart' | 'covered' | 'cage'; paint?: string; canvas?: string }

const S = 1 / 16;
const geoms = new Map<string, THREE.BufferGeometry | null>();
const glowMats = new Map<string, THREE.Material>();
const glowMat = (hex: string) => {
  let m = glowMats.get(hex);
  if (!m) { m = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(hex).multiplyScalar(0.55) }); glowMats.set(hex, m); }
  return m;
};

const flat = (hex: string, vary = 0.1): Paint => (_x, _y, _z, n) => shade(hex, 1 - vary / 2 + n * vary);
/** A coat: its colour varied cube by cube, darker along the top, a little paler underneath. */
const coat = (hex: string, top = 1.72, under = 1.1): Paint => (_x, y, _z, n) => shade(hex, 0.92 + n * 0.1 - (y > top ? 0.07 : 0) + (y < under ? 0.05 : 0));
/** Shaggy hair, wool or a ruff: strong variation, with dark roots showing through. */
const shag = (hex: string): Paint => (_x, _y, _z, n) => shade(hex, n < 0.18 ? 0.72 : 0.88 + n * 0.2);
/** Overlapping scales in rows, each scale its own shade, its lower edge in shadow. */
const scales = (hide: string): Paint => (x, y, z, n) => {
  const row = Math.floor(y * 8), v = y * 8 - row, col = Math.floor(z * 8 + (row & 1) * 0.5 + Math.abs(x) * 3);
  const h = ((row * 73856093) ^ (col * 19349663)) >>> 0;
  return shade(hide, (v < 0.3 ? 0.78 : 0.9 + (h % 13) / 100) + n * 0.05 - (y > 1.72 ? 0.05 : 0));
};
/** Feathers in rows, layered like roof tiles. */
const feathers = (hex: string): Paint => (x, y, z, n) => {
  const row = Math.floor(y * 10), v = y * 10 - row, col = Math.floor(z * 10 + (row & 1) * 0.5 + Math.abs(x) * 4);
  return shade(hex, (v < 0.25 ? 0.8 : 0.95 + (((row * 31 + col * 17) >>> 0) % 7) / 100) + n * 0.05);
};

/** Builds a mount's parts, each a group with one mesh of cubes, sharing the cubes between mounts of one look. */
class Kit {
  private n = 0;
  constructor(private key: string) {}
  part(host: THREE.Object3D, at: V3, build: (v: Vox) => void, mat?: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    g.position.set(...at);
    const id = this.key + '#' + this.n++;
    if (!geoms.has(id)) { const v = new Vox(S); build(v); geoms.set(id, v.size ? v.mesh().geometry : null); }
    const geo = geoms.get(id);
    if (geo) {
      const m = new THREE.Mesh(geo, mat ?? VOX_MAT);
      m.castShadow = true;
      m.userData.plain = true;
      g.add(m);
    }
    host.add(g);
    return g;
  }
}

function eyes(head: THREE.Group, x: number, y: number, z: number, colour: string, glow: boolean, w = 0.07) {
  const m = new THREE.MeshLambertMaterial({ color: colour, emissive: new THREE.Color(colour).multiplyScalar(glow ? 0.9 : 0.3) });
  const shine = new THREE.MeshLambertMaterial({ color: '#f4f0e8', emissive: new THREE.Color('#5a5a5a') });
  for (const sd of [1, -1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(w, w * 0.75, 0.04), m);
    e.position.set(sd * x, y, z);
    e.rotation.y = sd * 0.5;
    e.userData.plain = true;
    head.add(e);
    if (!glow) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, w * 0.3, 0.02), shine);
      s.position.set(sd * (x + 0.012), y + w * 0.15, z + 0.02);
      s.rotation.y = sd * 0.5;
      s.userData.plain = true;
      head.add(s);
    }
  }
}

/**
 * A bridle on a beast's head (head-local): a brass ring either side at the bit, where the reins start,
 * and a cheek strap from each ring back up the head.
 */
function bridle(v: Vox, bit: V3, cheek: V3) {
  for (const sd of [1, -1]) {
    v.capsule([sd * bit[0], bit[1], bit[2]], [sd * cheek[0], cheek[1], cheek[2]], 0.035, 0.035, flat('#4a2a16'));
    v.box([sd * bit[0] - 0.04, bit[1] - 0.04, bit[2] - 0.04], [sd * bit[0] + 0.04, bit[1] + 0.04, bit[2] + 0.04], flat('#c8a050'));
  }
}

/** A band round a limb or a muzzle (a noseband, a horn's ridges): the cubes near the capsule a-b's skin, at t0 along it. */
function ring(v: Vox, a: V3, b: V3, r: number, t0: number, w: number, paint: Paint) {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  const R = r + 0.06;
  v.fill([Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R], [Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R], (x, y, z) => {
    const t = ((x - a[0]) * d[0] + (y - a[1]) * d[1] + (z - a[2]) * d[2]) / L2;
    if (Math.abs(t - t0) * Math.sqrt(L2) > w) return false;
    const dist = Math.hypot(a[0] + d[0] * t - x, a[1] + d[1] * t - y, a[2] + d[2] * t - z);
    return dist <= r + 0.04 && dist > r - 0.05;
  }, paint);
}

/**
 * The saddle: a cloth over the back, its border woven in gold; a dished seat with the cantle rising
 * behind and the pommel in front, stirrups hanging either side. `within` keeps the cloth to the back.
 */
function saddle(v: Vox, y: number, z: number, cloth: string, within: (x: number, y: number, z: number) => boolean, half = 0.42, P: VoxMountPal = {}) {
  const trim = '#d8b050', leather = '#7a4a28', dark = '#4a2a16', pillion = !!P.pillion;
  if (P.harness) {
    // In harness: a padded back-band with its girth, brass rings on top for the reins to run through
    v.fill([-half - 0.12, y - 0.8, z - 0.1], [half + 0.12, y + 0.04, z + 0.1], (px, py, pz) => within(px, py, pz) && Math.abs(pz - z) < 0.08, (_x, _y, _z, n) => shade(dark, 0.9 + n * 0.12));
    v.box([-0.18, y - 0.02, z - 0.14], [0.18, y + 0.08, z + 0.14], (_x, _y, _z, n) => shade(cloth, 0.9 + n * 0.1));
    for (const sd of [1, -1]) v.box([sd * 0.12 - 0.04, y + 0.08, z - 0.04], [sd * 0.12 + 0.04, y + 0.16, z + 0.04], flat('#c8a050'));
    return;
  }
  const drape = (z0: number, z1: number) => v.fill([-half - 0.1, y - 0.46, z0], [half + 0.1, y + 0.04, z1], (px, py, pz) => within(px, py, pz) && py > y - 0.46,
    (_x, py, pz, n) => (py < y - 0.39 || Math.abs(pz - (z0 + z1) / 2) > (z1 - z0) / 2 - 0.07 ? shade(trim, 0.9 + n * 0.15) : shade(cloth, 0.88 + n * 0.12)));
  drape(z - 0.36, z + 0.36);
  const seat = (z0: number, back: boolean) => v.fill([-0.25, y, z0 - 0.32], [0.25, y + 0.26, z0 + 0.34], (px, py, pz) => {
    const u = (pz - z0) / 0.3;
    if ((px / 0.24) ** 2 + (u * 0.95) ** 2 > 1) return false;
    const top = 0.07 + (back ? Math.max(0, -u - 0.55) * 0.36 : 0) + (back && u > 0.7 && Math.abs(px) < 0.1 ? (u - 0.7) * 0.5 : 0);
    return py - y <= top;
  }, (px, py, _z, n) => (Math.abs(px) > 0.18 || py > y + 0.12 ? shade(dark, 0.95 + n * 0.1) : shade(leather, 0.9 + n * 0.14)));
  seat(z, true);
  for (const sd of [1, -1]) {
    const x = sd * (half + 0.05);
    v.box([x - 0.04, y - 0.62, z - 0.02], [x + 0.04, y - 0.02, z + 0.08], flat(dark));
    v.box([x - 0.08, y - 0.72, z - 0.06], [x + 0.08, y - 0.62, z + 0.12], flat('#c8a050'));
  }
  if (pillion) { drape(z - 0.9, z - 0.4); seat(z - 0.64, false); }
}

// ---------------------------------------------------------------------------------------------
// Horses, and what rides like one: the piebald, the shire, the stag, the ram, the kelpie, the pack pony

function horse(k: Kit, host: VoxMountHost, P: VoxMountPal, breed: string): VoxMountParts {
  const B = host.body, glow = !!P.glow;
  const a = P.a ?? '#7a4a2a', b = P.b ?? '#2a1e16', c = P.c ?? '#2e4a7a';
  const pied = breed === 'pied', shire = breed === 'shire', elk = breed === 'elk', ram = breed === 'ram', kelpie = breed === 'kelpie', pack = breed === 'pack';
  const white = '#f0ece4';
  const patch = (x: number, y: number, z: number) => pied && Math.sin(x * 4.1 + z * 2.3 + 1) * Math.sin(y * 3.3 - z * 1.7) > 0.16;
  const coatP: Paint = (x, y, z, n) => (patch(x, y, z) ? shade(white, 0.94 + n * 0.08) : coat(a)(x, y, z, n));
  const maneP: Paint = kelpie ? (_x, _y, _z, n) => (n > 0.7 ? shade('#2e5a3a', 0.9 + n * 0.2) : shade(b, 0.85 + n * 0.25)) : (_x, y, z, n) => shade(b, 0.82 + n * 0.22 + Math.sin(z * 30 + y * 9) * 0.05);
  const leather = '#4a2a16', brass = '#c8a050';
  const inBarrel = (x: number, y: number, z: number) => (x / 0.4) ** 2 + ((y - 1.4) / 0.44) ** 2 + (z / 0.86) ** 2 <= 1;

  k.part(B, [0, 0, 0], (v) => {
    v.ellipsoid([0, 1.4, 0], [0.36, 0.4, 0.8], coatP); // the barrel
    v.ellipsoid([0, 1.38, 0.6], [0.34, 0.4, 0.36], coatP); // the chest
    v.ellipsoid([0, 1.47, -0.6], [0.37, 0.4, 0.42], coatP); // the quarters
    v.ellipsoid([0, 1.7, 0.48], [0.2, 0.16, 0.28], coatP); // the withers
    v.capsule([0, 1.62, 0.78], [0, 2.28, 1.18], 0.26, 0.17, coatP); // the neck
    // The girth under the belly
    v.fill([-0.4, 0.95, 0.18], [0.4, 1.75, 0.3], (x, y, z) => Math.abs(z - 0.24) < 0.05 && y < 1.7 && (x / 0.38) ** 2 + ((y - 1.4) / 0.43) ** 2 <= 1 && (x / 0.31) ** 2 + ((y - 1.4) / 0.36) ** 2 > 1, flat(leather));
    if (elk) {
      v.ellipsoid([0, 1.86, 1.04], [0.21, 0.32, 0.2], shag(b)); // a shaggy throat
      v.capsule([0, 1.86, 0.72], [0, 2.4, 1.1], 0.06, 0.06, shag(b));
    } else if (ram) {
      // The fleece, in lumps over the back, the neck and the shoulders
      for (const [x, y, z, r] of [[0, 1.62, 0.36, 0.34], [0, 1.66, -0.36, 0.36], [0.24, 1.46, 0.0, 0.26], [-0.24, 1.46, 0.0, 0.26], [0, 1.66, 0.82, 0.24], [0, 1.52, -0.82, 0.26], [0.18, 1.5, 0.6, 0.24], [-0.18, 1.5, 0.6, 0.24], [0.2, 1.52, -0.6, 0.26], [-0.2, 1.52, -0.6, 0.26]] as const) v.ellipsoid([x, y, z], [r * 1.2, r, r * 1.1], shag(a));
    } else {
      // The mane: along the crest, falling in strands down the right side
      v.capsule([0, 1.9, 0.7], [0, 2.44, 1.1], 0.075, 0.065, maneP);
      for (let i = 0; i <= 9; i++) {
        const t = i / 9, cy = 1.88 + 0.54 * t, cz = 0.72 + 0.38 * t;
        v.capsule([0.04, cy, cz], [0.17 + (i % 2) * 0.03, cy - 0.24 - (i % 3) * 0.07, cz + 0.03], 0.06, 0.05, maneP);
      }
      if (kelpie) for (let i = 0; i < 5; i++) v.capsule([0.12, 1.98 + i * 0.1, 0.74 + i * 0.08], [0.2, 1.62 + i * 0.08, 0.8 + i * 0.08], 0.05, 0.045, flat('#2e5a3a', 0.25));
    }
    saddle(v, 1.84, 0.04, c, inBarrel, 0.38, P);
    // In harness, the reins from the bit along the neck to the band (ridden, the rider holds them: CreatureModel.holdReins)
    if (P.harness) for (const sd of [1, -1]) v.capsule([sd * 0.15, 2.02, 1.66], [sd * 0.18, 1.86, 1.12], 0.045, 0.045, flat(leather));
    if (pack) {
      // A canvas pannier either side, a bedroll behind the saddle, a kettle and a pan
      for (const sd of [1, -1]) {
        v.box([sd * 0.38 - (sd > 0 ? 0 : 0.24), 1.16, -0.46], [sd * 0.38 + (sd > 0 ? 0.24 : 0), 1.66, 0.16], (_x, y, z, n) => (Math.abs(y - 1.56) < 0.04 || Math.abs(z + 0.15) < 0.04 ? shade(leather, 0.95 + n * 0.1) : shade('#b8a888', 0.88 + n * 0.14)));
      }
      v.capsule([-0.46, 1.98, -0.46], [0.46, 1.98, -0.46], 0.15, 0.15, (x, y, z, n) => (Math.abs(Math.atan2(y - 1.98, z + 0.46) * 0.8 + x * 3) % 1 < 0.15 ? shade(c, 0.7) : shade(c, 0.95 + n * 0.1)));
      v.fill([0.6, 1.1, -0.48], [0.82, 1.28, -0.24], (x, _y, z) => (x - 0.71) ** 2 + (z + 0.36) ** 2 < 0.1 ** 2, flat('#3a3a3c'));
      v.box([-0.7, 1.1, -0.5], [-0.62, 1.38, -0.22], flat('#3a3a3c'));
    }
  });

  // The head hangs nose-down from the poll, so turning and grazing move it whole
  const blaze = pied ? 0.05 : shire ? 0.08 : 0;
  const faceP: Paint = (x, y, z, n) => (blaze && Math.abs(x) < blaze && y * 0.66 + z * 0.75 > 0.15 && y < 0.12 ? shade(white, 0.95 + n * 0.06) : coat(elk ? shade(a, 1.05) : a, 9, -9)(x, y, z, n));
  const head = k.part(B, [0, 2.42, 1.28], (v) => {
    v.ellipsoid([0, 0, 0.04], [0.17, 0.17, 0.19], faceP);
    v.ellipsoid([0, -0.1, 0.05], [0.16, 0.14, 0.17], faceP); // the jowl
    v.capsule([0, -0.06, 0.14], [0, -0.38, 0.42], 0.14, elk ? 0.1 : 0.12, faceP); // the long face
    v.ellipsoid([0, -0.42, 0.46], [elk ? 0.1 : 0.13, 0.11, 0.12], elk ? flat(shade(b, 0.8)) : faceP); // the muzzle
    v.ellipsoid([0, -0.51, 0.44], [0.09, 0.05, 0.08], flat(shade(b, 0.9)));
    for (const sd of [1, -1]) {
      v.box([sd * 0.065 - 0.04, -0.46, 0.53], [sd * 0.065 + 0.04, -0.4, 0.59], flat('#1a1410'));
      if (elk) v.cone([sd * 0.12, 0.08, -0.02], [sd * 0.3, 0.16, -0.06], 0.07, coat(a)); // a deer's ears, out to the side
      else if (!ram) v.cone([sd * 0.09, 0.12, 0.0], [sd * 0.12, 0.34, -0.02], 0.065, faceP);
      if (!elk && !ram) {
        v.capsule([sd * 0.17, 0.08, 0.06], [sd * 0.15, -0.36, 0.4], 0.045, 0.045, flat(leather)); // the cheek strap
        v.box([sd * 0.15 - 0.04, -0.47, 0.42], [sd * 0.15 + 0.04, -0.39, 0.5], flat(brass)); // the bit ring
      }
    }
    if (!elk && !ram) {
      v.box([-0.18, 0.08, -0.02], [0.18, 0.14, 0.04], flat(leather)); // the brow band
      ring(v, [0, -0.06, 0.14], [0, -0.38, 0.42], 0.13, 0.78, 0.04, flat(leather)); // the noseband
      v.capsule([0, 0.16, 0.04], [0.02, -0.02, 0.22], 0.07, 0.06, maneP); // the forelock
    }
    if (ram) {
      // Curled horns, ridged, turning back, down and forward round the ear
      for (const sd of [1, -1]) {
        let prev: V3 = [sd * 0.12, 0.12, 0.0];
        for (let i = 1; i <= 14; i++) {
          const t = (i / 14) * Math.PI * 1.7, r = 0.2 - i * 0.008;
          const p: V3 = [sd * (0.14 + i * 0.012), 0.0 + r * Math.cos(t), -0.02 - r * Math.sin(t)];
          v.capsule(prev, p, 0.085 - i * 0.003, 0.082 - i * 0.003, (_x, _y, _z, n) => shade('#8a7656', (i % 2 ? 0.8 : 1.0) + n * 0.08));
          prev = p;
        }
      }
    }
  });
  eyes(head, 0.16, -0.02, 0.13, kelpie ? '#9af0e0' : '#1a1410', kelpie, 0.07);
  if (elk) {
    // Broad, branching antlers: the beam sweeping up and back, tines forward, a palm at the crown
    const horn = glow ? '#e8f4ff' : '#d8c8a8';
    k.part(head, [0, 0.14, 0], (v) => {
      const hp: Paint = (_x, y, _z, n) => shade(horn, 0.86 + n * 0.12 + Math.min(0.1, y * 0.08));
      for (const sd of [1, -1]) {
        const p0: V3 = [sd * 0.1, 0, 0], p1: V3 = [sd * 0.3, 0.3, -0.1], p2: V3 = [sd * 0.44, 0.62, -0.04], p3: V3 = [sd * 0.42, 0.92, -0.16];
        v.capsule(p0, p1, 0.06, 0.055, hp); v.capsule(p1, p2, 0.055, 0.05, hp); v.capsule(p2, p3, 0.05, 0.045, hp);
        v.capsule([sd * 0.15, 0.06, -0.02], [sd * 0.2, 0.14, 0.24], 0.05, 0.045, hp); // brow tine
        v.capsule(p1, [sd * 0.36, 0.5, 0.18], 0.05, 0.045, hp);
        v.capsule(p2, [sd * 0.62, 0.82, 0.06], 0.05, 0.045, hp);
        v.tri(p2, p3, [sd * 0.62, 0.84, -0.12], 0.1, hp); // the palm
        v.capsule(p3, [sd * 0.3, 1.08, -0.2], 0.045, 0.045, hp);
      }
    }, glow ? glowMat('#4a6a8a') : undefined);
  }

  // Legs: the forelegs straight with a knee; the hind with a strong gaskin and the hock bent back.
  // Each ends in a fetlock and a hoof; a shire's are hidden in white feathering.
  const hoof = glow && !elk && !kelpie ? '#ff9a3a' : '#2a221c';
  const sock = elk || ram ? shade(a, 0.8) : b;
  for (const [x, z, hind] of [[0.2, 0.62, 0], [-0.2, 0.62, 0], [0.21, -0.62, 1], [-0.21, -0.62, 1]] as const) {
    const lp: Paint = (px, py, pz, n) => coatP(px + x, py + 1.12, pz + z, n);
    host.legs.push(k.part(B, [x, 1.12, z], (v) => {
      if (hind) {
        v.ellipsoid([0, -0.12, -0.04], [0.13, 0.32, 0.18], lp); // the gaskin
        v.capsule([0, -0.3, -0.06], [0, -0.52, -0.14], 0.1, 0.085, lp);
        v.ellipsoid([0, -0.54, -0.14], [0.08, 0.08, 0.09], lp); // the hock
        v.capsule([0, -0.54, -0.14], [0, -0.92, -0.04], 0.065, 0.065, flat(sock));
      } else {
        v.capsule([0, 0.1, 0], [0, -0.46, 0.01], 0.11, 0.09, lp); // the forearm
        v.ellipsoid([0, -0.5, 0.01], [0.085, 0.08, 0.1], lp); // the knee
        v.capsule([0, -0.5, 0.01], [0, -0.92, 0.02], 0.065, 0.065, flat(sock));
      }
      v.ellipsoid([0, -0.94, 0.02], [0.08, 0.06, 0.09], flat(sock)); // the fetlock
      if (shire) v.ellipsoid([0, -0.92, 0.02], [0.14, 0.17, 0.15], shag(white));
      if (elk || ram) {
        for (const sd of [1, -1]) v.box([sd * 0.045 - 0.04, -1.12, -0.04], [sd * 0.045 + 0.04, -0.98, 0.1], flat('#2a221c')); // cloven hooves
      } else v.fill([-0.1, -1.12, -0.08], [0.1, -0.98, 0.14], (px, py, pz) => (px / (0.08 + (-0.98 - py) * 0.2)) ** 2 + ((pz - 0.03) / (0.09 + (-0.98 - py) * 0.2)) ** 2 <= 1, flat(hoof));
    }));
  }

  // The tail: a horse's set high and falling in strands; a deer's or a ram's short
  const tail = k.part(B, [0, elk || ram ? 1.62 : 1.72, -0.98], (v) => {
    if (elk) { v.ellipsoid([0, -0.06, -0.06], [0.08, 0.14, 0.07], flat(shade(a, 1.15))); return; }
    if (ram) { v.ellipsoid([0, -0.1, -0.04], [0.12, 0.16, 0.1], shag(a)); return; }
    v.capsule([0, 0, 0], [0, -0.12, -0.16], 0.08, 0.08, maneP);
    for (const [x, len, back] of [[0, 0.86, 0.22], [0.05, 0.76, 0.3], [-0.05, 0.8, 0.14], [0.02, 0.66, 0.36], [-0.03, 0.7, 0.26]] as const) v.capsule([x, -0.1, -0.16], [x * 2, -0.1 - len, -0.16 - back], 0.065, 0.05, maneP);
  });
  return { head, tail, bit: [0.15, -0.43, 0.46], girth: 0.38 };
}

// ---------------------------------------------------------------------------------------------
// The far places' mounts

/** What a mount's build hands back: its head and tail, the right-hand bit ring (head-local; the left
 * is its mirror) where the reins start, and its half-width where the rider's legs go round it. */
export interface VoxMountParts { head: THREE.Group; tail: THREE.Group; bit: V3; girth: number }

export function buildVoxMount(host: VoxMountHost, breed: string, P: VoxMountPal): VoxMountParts {
  const a = P.a ?? '#8a5a2e', b = P.b ?? '#2a1e16', c = P.c ?? '#2e4a7a', glow = !!P.glow;
  const k = new Kit([breed, a, b, c, glow ? 1 : 0, P.pillion ? 1 : 0, P.harness ? 1 : 0].join('|'));
  const B = host.body;
  const leg = (at: V3, build: (v: Vox) => void) => { host.legs.push(k.part(B, at, build)); };
  let head: THREE.Group, tail: THREE.Group, bit: V3, girth: number;

  if (breed === 'cat' || breed === 'sabre') {
    // ---- A great cat: the kilncat of the Kiln's slopes, or the Held's sabre-toothed fell cat.
    // A heavy head with cheek ruffs, banded flanks, a pale belly, broad paws.
    const sabre = breed === 'sabre', pale = sabre ? '#f4f4f0' : '#f2e2c0';
    const band = (x: number, y: number, z: number) => Math.sin(z * 9 + Math.abs(x) * 4 + Math.sin(y * 5) * 1.2) > 0.55;
    const coatC: Paint = (x, y, z, n) => (band(x, y, z) ? shade(b, (glow ? 1.15 : 0.9) + n * 0.12) : shade(a, 0.92 + n * 0.1 - (y > 1.62 ? 0.07 : 0)));
    const bodyP: Paint = (x, y, z, n) => (y < 1.02 + 0.04 * Math.sin(z * 7) ? shade(pale, 0.94 + n * 0.08) : coatC(x, y, z, n));
    const inBody = (x: number, y: number, z: number) => (x / 0.48) ** 2 + ((y - 1.32) / 0.5) ** 2 + ((z + 0.05) / 0.92) ** 2 <= 1.12;
    k.part(B, [0, 0, 0], (v) => {
      v.ellipsoid([0, 1.32, -0.05], [0.44, 0.46, 0.88], bodyP);
      v.ellipsoid([0, 1.3, 0.6], [0.47, 0.5, 0.42], bodyP);
      v.ellipsoid([0, 1.36, -0.68], [0.45, 0.48, 0.42], bodyP);
      if (sabre) v.ellipsoid([0, 1.48, 0.82], [0.5, 0.5, 0.28], shag(b)); // the ruff
      saddle(v, 1.84, -0.04, c, inBody, 0.44, P);
    });
    head = k.part(B, [0, 1.6, 1.1], (v) => {
      v.ellipsoid([0, 0, 0], [0.33, 0.29, 0.29], (x, y, _z, n) => (y > 0.06 && Math.sin(x * 26) > 0.45 ? shade(b, 0.9 + n * 0.1) : shade(a, 0.92 + n * 0.1)));
      for (const sd of [1, -1]) {
        v.ellipsoid([sd * 0.24, -0.08, -0.06], [0.12, 0.16, 0.14], (_x, y, _z, n) => (y < -0.14 ? shade(pale, 0.92 + n * 0.1) : shade(a, 0.9 + n * 0.12))); // cheek ruff
        v.cone([sd * 0.19, 0.18, -0.04], [sd * 0.27, 0.44, -0.1], 0.1, coat(a, 9, -9)); // ears
        v.box([sd * 0.24 - 0.04, 0.3, -0.06], [sd * 0.24 + 0.04, 0.36, -0.02], flat(b)); // the ear-tufts
        if (sabre) v.cone([sd * 0.08, -0.2, 0.3], [sd * 0.09, -0.56, 0.34], 0.05, flat('#efe6d0'));
      }
      v.ellipsoid([0, -0.1, 0.24], [0.18, 0.13, 0.15], flat(pale));
      v.ellipsoid([0, -0.2, 0.2], [0.12, 0.06, 0.1], flat(pale)); // the chin
      v.box([-0.06, -0.04, 0.36], [0.06, 0.03, 0.4], flat('#5a2a2a')); // the nose
      ring(v, [0, -0.1, 0.02], [0, -0.1, 0.42], 0.17, 0.6, 0.035, flat('#4a2a16')); // the noseband
      bridle(v, [0.19, -0.1, 0.26], [0.23, 0.12, -0.06]);
    });
    bit = [0.19, -0.1, 0.26]; girth = sabre ? 0.5 : 0.48;
    eyes(head, 0.13, 0.06, 0.26, glow ? b : '#e8c040', glow, 0.08);
    for (const [x, z, hind] of [[0.25, 0.62, 0], [-0.25, 0.62, 0], [0.27, -0.72, 1], [-0.27, -0.72, 1]] as const) leg([x, 1.0, z], (v) => {
      const lp: Paint = (px, py, pz, n) => coatC(px + x, py + 1.0, pz + z, n);
      if (hind) { v.ellipsoid([0, -0.1, -0.06], [0.22, 0.34, 0.26], lp); v.capsule([0, -0.36, -0.12], [0, -0.88, 0.04], 0.14, 0.12, lp); }
      else v.capsule([0, 0.02, 0.02], [0, -0.86, 0.06], 0.17, 0.14, lp);
      v.ellipsoid([0, -0.93, 0.12], [0.17, 0.08, 0.2], flat(sabre ? pale : shade(a, 0.9)));
      for (const t of [-1, 0, 1]) v.box([t * 0.07 - 0.03, -1.0, 0.28], [t * 0.07 + 0.03, -0.96, 0.34], flat('#efe6d0'));
    });
    tail = k.part(B, [0, 1.56, -1.0], (v) => {
      v.capsule([0, 0, 0], [0, -0.12, -0.36], 0.1, 0.09, coatC);
      v.capsule([0, -0.12, -0.36], [0, -0.38, -0.66], 0.09, 0.08, (_x, _y, z, n) => (Math.sin(z * 22) > 0.3 ? shade(b, 0.95 + n * 0.1) : shade(a, 0.95 + n * 0.1)));
      v.capsule([0, -0.38, -0.66], [0, -0.26, -0.96], 0.08, 0.07, flat(b));
    });
  } else if (breed === 'drake' || breed === 'wyrm') {
    // ---- A drake of the Glass Flats, wings raised; or a grave-wyrm of Kingsbarrow, long and low,
    // wingless, armoured down the back in plates like old bone
    const wyrm = breed === 'wyrm', ivory = '#efe6d0';
    const hide = wyrm ? b : a, plate = wyrm ? a : b;
    const skin: Paint = (x, y, z, n) => {
      if (y < 1.0) return shade(plate, (Math.floor(z * 6) & 1 ? 1.04 : 0.9) + n * 0.06); // the belly plates
      if (wyrm && y > 1.6 && ((z * 4) % 1 + 1) % 1 > 0.2) return shade(plate, 0.9 + n * 0.12); // the back plates
      return scales(hide)(x, y, z, n);
    };
    const len = wyrm ? 1.15 : 0.92;
    const inBody = (x: number, y: number, z: number) => (x / 0.5) ** 2 + ((y - 1.3) / 0.52) ** 2 + ((z + 0.05) / len) ** 2 <= 1.12;
    const neckTop: V3 = wyrm ? [0, 1.72, 1.36] : [0, 1.9, 1.3];
    k.part(B, [0, 0, 0], (v) => {
      v.ellipsoid([0, 1.3, -0.05], [0.47, 0.5, len], skin);
      v.ellipsoid([0, 1.3, 0.62], [0.48, 0.52, 0.4], skin);
      if (wyrm) v.ellipsoid([0, 1.26, -0.95], [0.4, 0.44, 0.5], skin);
      v.capsule([0, 1.5, 0.8], neckTop, 0.28, 0.2, skin);
      // Spines down the back and the neck, clear of the saddle
      for (let z = 1.2; z > -1.4; z -= 0.17) {
        if (Math.abs(z + 0.05) < 0.48) continue;
        const top = z > 0.8 ? 1.5 + (z - 0.8) * (neckTop[1] - 1.5) / (neckTop[2] - 0.8) + 0.24 : 1.3 + 0.5 * Math.sqrt(Math.max(0, 1 - (z / (len + 0.3)) ** 2));
        v.cone([0, top - 0.05, z], [0, top + 0.2, z - 0.12], 0.06, flat(wyrm ? ivory : shade(b, 0.8)));
      }
      saddle(v, 1.86, -0.06, c, inBody, 0.46, P);
    });
    bit = [0.18, -0.09, 0.3]; girth = 0.5;
    head = k.part(B, [0, neckTop[1] + 0.08, neckTop[2] + 0.12], (v) => {
      v.ellipsoid([0, 0, 0], [0.24, 0.21, 0.26], skin);
      v.ellipsoid([0, -0.04, 0.32], [0.17, 0.13, 0.24], skin); // the snout
      v.box([-0.14, -0.2, 0.08], [0.14, -0.12, 0.52], flat(shade(plate, 0.85))); // the jaw
      bridle(v, [0.18, -0.09, 0.3], [0.21, 0.04, -0.02]);
      for (const sd of [1, -1]) {
        v.box([sd * 0.07 - 0.03, -0.02, 0.52], [sd * 0.07 + 0.03, 0.03, 0.56], flat('#1a1410')); // nostrils
        v.box([sd * 0.15 - 0.05, 0.1, 0.04], [sd * 0.15 + 0.05, 0.16, 0.22], flat(shade(hide, 0.7))); // the brow ridge
        // Horns swept back from the brow
        v.capsule([sd * 0.13, 0.12, -0.06], [sd * 0.24, 0.24, -0.38], 0.07, 0.055, flat(wyrm ? ivory : shade(b, 0.85)));
        v.capsule([sd * 0.24, 0.24, -0.38], [sd * 0.28, 0.4, -0.62], 0.055, 0.03, flat(wyrm ? ivory : shade(b, 0.75)));
        for (let t = 0; t < 4; t++) v.box([sd * 0.11 - 0.03, -0.14, 0.18 + t * 0.09], [sd * 0.11 + 0.03, -0.1, 0.22 + t * 0.09], flat(ivory)); // teeth
      }
      if (wyrm) for (let i = 0; i < 5; i++) v.cone([0, 0.16 - i * 0.02, -0.1 - i * 0.1], [0, 0.4 - i * 0.03, -0.24 - i * 0.12], 0.05, flat(ivory));
    });
    eyes(head, 0.17, 0.06, 0.16, glow ? b : wyrm ? '#9fe8ff' : '#e8c040', glow || wyrm);
    for (const [x, z, hind] of [[0.3, 0.62, 0], [-0.3, 0.62, 0], [0.32, -0.7, 1], [-0.32, -0.7, 1]] as const) leg([x, 0.96, z], (v) => {
      const lp: Paint = (px, py, pz, n) => scales(hide)(px + x, py + 1.4, pz + z, n);
      v.ellipsoid([0, -0.1, hind ? -0.05 : 0], [0.21, 0.3, 0.25], lp);
      v.capsule([0, -0.3, hind ? -0.1 : 0.02], [0, -0.86, 0.04], 0.15, 0.13, lp);
      v.ellipsoid([0, -0.9, 0.1], [0.17, 0.07, 0.2], flat(shade(hide, 0.8)));
      for (const t of [-1, 0, 1]) v.cone([t * 0.08, -0.92, 0.26], [t * 0.09, -0.95, 0.38], 0.04, flat(ivory));
    });
    if (!wyrm) for (const sd of [1, -1]) {
      // Wings raised: the arm up from the shoulder to the wrist, three fingers from the wrist, the web between
      const w = k.part(B, [sd * 0.38, 1.74, 0.34], (v) => {
        const S0: V3 = [0, 0, 0], E: V3 = [sd * 0.32, 0.72, -0.18], T: V3 = [sd * 0.62, 1.08, -0.86], F2: V3 = [sd * 0.8, 0.6, -1.12], F3: V3 = [sd * 0.6, 0.14, -1.16], R: V3 = [sd * 0.04, -0.04, -0.86];
        const web: Paint = (_x, y, _z, n) => shade(b, 0.78 + n * 0.1 + Math.min(0.2, y * 0.18));
        v.tri(E, T, F2, 0.11, web); v.tri(E, F2, F3, 0.11, web); v.tri(E, F3, R, 0.11, web); v.tri(S0, E, R, 0.11, web);
        const bone = flat(shade(hide, 0.8));
        v.capsule(S0, E, 0.09, 0.07, scales(hide)); v.capsule(E, T, 0.065, 0.045, bone); v.capsule(E, F2, 0.05, 0.045, bone); v.capsule(E, F3, 0.05, 0.045, bone);
        v.cone(E, [sd * 0.34, 0.86, -0.1], 0.05, flat(ivory)); // the claw at the wrist
      });
      w.userData.sd = sd;
      host.segs.push(w);
    }
    tail = k.part(B, [0, 1.36, wyrm ? -1.4 : -0.95], (v) => {
      const pts: V3[] = [[0, 0, 0], [0, -0.16, -0.5], [0, -0.38, -1.0], [0, -0.5, -1.5], [0, -0.56, -1.9]];
      const rs = [0.27, 0.2, 0.13, 0.08, 0.05];
      for (let i = 0; i < 4; i++) v.capsule(pts[i], pts[i + 1], rs[i], rs[i + 1], (px, py, pz, n) => skin(px, py + 1.36, pz, n));
      if (!wyrm) v.tri([0, -0.5, -1.7], [0, -0.3, -2.1], [0, -0.7, -2.1], 0.1, flat(shade(b, 0.8))); // the spade
      else for (let i = 0; i < 4; i++) v.cone([0, 0.18 - i * 0.12, -0.3 - i * 0.42], [0, 0.34 - i * 0.14, -0.46 - i * 0.42], 0.05, flat(ivory));
    });
  } else if (breed === 'turtle') {
    // ---- A key turtle the size of a cart: a high shell in scutes, the saddle strapped to its crown
    const skin = b;
    const scute: Paint = (x, y, z, n) => {
      if (y < 1.04) return shade(b, 1.12 + n * 0.08); // the rim
      const u = (x * 3.1 + 10) % 1, w = (z * 2.6 + (Math.floor(x * 3.1 + 10) % 2) * 0.5 + 10) % 1;
      if (u < 0.12 || w < 0.1) return shade(a, 0.62 + n * 0.08); // the seams between scutes
      return shade(a, 0.95 + n * 0.12 + (y - 1.3) * 0.25);
    };
    const skinP: Paint = (_x, _y, _z, n) => (n > 0.82 ? shade(skin, 0.78) : shade(skin, 0.94 + n * 0.1));
    const inShell = (x: number, y: number, z: number) => (x / 0.8) ** 2 + ((y - 1.22) / 0.62) ** 2 + (z / 1.0) ** 2 <= 1.1 && y > 0.94;
    k.part(B, [0, 0, 0], (v) => {
      v.fill([-0.8, 0.94, -1.0], [0.8, 1.84, 1.0], (x, y, z) => (x / 0.78) ** 2 + ((y - 1.22) / 0.6) ** 2 + (z / 0.98) ** 2 <= 1 && y > 0.94, scute);
      v.ellipsoid([0, 0.94, 0], [0.66, 0.12, 0.84], flat('#d8c890')); // the plastron
      v.capsule([0, 1.0, 0.82], [0, 1.08, 1.12], 0.17, 0.15, skinP);
      saddle(v, 1.86, -0.04, c, inShell, 0.5, P);
    });
    head = k.part(B, [0, 1.1, 1.24], (v) => {
      v.ellipsoid([0, 0, 0.04], [0.18, 0.16, 0.22], skinP);
      v.box([-0.12, -0.1, 0.18], [0.12, -0.03, 0.27], flat('#3a3a2e')); // the beak
      bridle(v, [0.16, -0.06, 0.14], [0.17, 0.06, -0.08]);
    });
    bit = [0.16, -0.06, 0.14]; girth = 0.8;
    eyes(head, 0.13, 0.04, 0.12, '#1a1a14', false, 0.06);
    for (const [x, z, hind] of [[0.6, 0.6, 0], [-0.6, 0.6, 0], [0.58, -0.62, 1], [-0.58, -0.62, 1]] as const) leg([x, 0.92, z], (v) => {
      v.capsule([0, 0, 0], [Math.sign(x) * 0.06, -0.8, hind ? -0.04 : 0.06], 0.22, 0.18, skinP);
      v.ellipsoid([Math.sign(x) * 0.06, -0.86, 0.06], [0.22, 0.08, 0.26], flat(shade(skin, 0.85)));
    });
    tail = k.part(B, [0, 0.98, -0.98], (v) => { v.cone([0, 0, 0], [0, -0.06, -0.34], 0.12, flat(skin)); });
  } else if (breed === 'slabback') {
    // ---- A slabback of the Sunder: an ox the size of a hut, shaggy, plated with the stone it grazes
    const fur: Paint = (_x, y, _z, n) => shade(a, 0.86 + n * 0.2 - (y > 1.75 ? 0.06 : 0));
    const stone: Paint = (x, _y, z, n) => (n < 0.12 ? shade(b, 0.7) : shade(b, 0.92 + n * 0.12 + Math.sin(x * 9 + z * 7) * 0.04));
    const inBody = (x: number, y: number, z: number) => (x / 0.64) ** 2 + ((y - 1.3) / 0.62) ** 2 + ((z + 0.05) / 1.02) ** 2 <= 1.15;
    k.part(B, [0, 0, 0], (v) => {
      v.ellipsoid([0, 1.3, -0.05], [0.6, 0.58, 1.0], fur);
      v.ellipsoid([0, 1.58, 0.48], [0.5, 0.36, 0.42], fur); // the hump
      v.fill([-0.5, 0.6, -0.9], [0.5, 0.8, 0.9], (x, y, z) => (x / 0.5) ** 2 + (z / 0.9) ** 2 < 0.8 && y > 0.66 + Math.abs(Math.sin(x * 23 + z * 17)) * 0.14, shag(shade(a, 0.85))); // the fringe under the belly
      for (const [cx, cy, cz, rx, ry, rz] of [[0, 1.86, 0.82, 0.42, 0.13, 0.26], [0, 1.78, -0.62, 0.44, 0.13, 0.3], [0, 1.62, -1.0, 0.34, 0.12, 0.2], [0.56, 1.4, 0, 0.08, 0.3, 0.5], [-0.56, 1.4, 0, 0.08, 0.3, 0.5]] as const) v.ellipsoid([cx, cy, cz], [rx, ry, rz], stone);
      saddle(v, 1.96, -0.12, c, inBody, 0.58, P);
    });
    bit = [0.22, -0.12, 0.38]; girth = 0.66;
    head = k.part(B, [0, 1.3, 1.08], (v) => {
      v.ellipsoid([0, 0, 0.1], [0.33, 0.29, 0.33], fur);
      v.ellipsoid([0, -0.12, 0.38], [0.22, 0.16, 0.14], flat('#5a4a3a'));
      bridle(v, [0.22, -0.12, 0.38], [0.33, 0.02, 0.08]);
      v.ellipsoid([0, 0.26, 0.06], [0.34, 0.1, 0.22], stone); // the brow plate
      for (const sd of [1, -1]) {
        v.capsule([sd * 0.26, 0.16, 0.0], [sd * 0.54, 0.3, 0.14], 0.09, 0.07, flat('#efe6d0'));
        v.capsule([sd * 0.54, 0.3, 0.14], [sd * 0.62, 0.52, 0.36], 0.07, 0.04, flat('#efe6d0'));
        v.box([sd * 0.07 - 0.03, -0.14, 0.5], [sd * 0.07 + 0.03, -0.1, 0.53], flat('#1a1410'));
      }
    });
    eyes(head, 0.22, 0.06, 0.38, glow ? b : '#1a1410', glow, 0.06);
    for (const [x, z, hind] of [[0.34, 0.6, 0], [-0.34, 0.6, 0], [0.36, -0.68, 1], [-0.36, -0.68, 1]] as const) leg([x, 0.96, z], (v) => {
      v.capsule([0, 0, hind ? -0.04 : 0], [0, -0.82, 0.02], 0.25, 0.21, fur);
      v.box([-0.2, -0.96, -0.16], [0.2, -0.8, 0.22], flat('#2a2018'));
    });
    tail = k.part(B, [0, 1.5, -1.0], (v) => { v.capsule([0, 0, 0], [0, -0.5, -0.12], 0.06, 0.05, fur); v.ellipsoid([0, -0.56, -0.14], [0.1, 0.12, 0.1], shag(shade(a, 0.7))); });
  } else if (breed === 'strider') {
    // ---- The Kilnfolk's clockwork strider: a riveted brass boiler on jointed legs, a wheel in each
    // flank, copper pipes along the back, a lamp of a head with two slits of light, a stack for a tail
    const brass: Paint = (_x, y, z, n) => {
      const bandz = Math.abs(((z * 2.9) % 1 + 1) % 1 - 0.5) < 0.07;
      if (bandz) return n > 0.85 ? '#f0d890' : shade(b, 0.9 + n * 0.1);
      return shade(a, 0.9 + n * 0.08 + (y - 1.42) * 0.3);
    };
    const copper = '#5ea08a';
    k.part(B, [0, 0, 0], (v) => {
      v.capsule([0, 1.42, 0.66], [0, 1.42, -0.74], 0.38, 0.36, brass);
      for (const sd of [1, -1]) {
        v.fill([sd * 0.36 - 0.03, 1.12, -0.36], [sd * 0.36 + 0.06, 1.72, 0.24], (_x, y, z) => (y - 1.42) ** 2 + (z + 0.06) ** 2 < 0.28 ** 2, (_x, y, z, n) => { const r = Math.hypot(y - 1.42, z + 0.06), ang = Math.atan2(y - 1.42, z + 0.06); return r < 0.06 || (r > 0.1 && Math.abs(Math.sin(ang * 4)) < 0.25) || r > 0.24 ? shade('#c8a050', 0.95 + n * 0.1) : shade(copper, 0.85 + n * 0.1); });
        v.capsule([sd * 0.18, 1.82, 0.5], [sd * 0.18, 1.82, -0.6], 0.05, 0.05, flat(copper));
      }
      v.capsule([0, 1.62, 0.8], [0, 2.0, 1.04], 0.14, 0.12, flat(b));
      v.capsule([0, 1.7, -0.8], [0, 2.14, -0.86], 0.1, 0.09, flat(b));
      v.box([-0.12, 2.12, -0.98], [0.12, 2.18, -0.74], flat('#c8a050'));
      saddle(v, 1.86, -0.06, c, (x, y, z) => x * x + (y - 1.42) ** 2 < 0.44 ** 2 && z > -0.8 && z < 0.7, 0.42, P);
    });
    head = k.part(B, [0, 2.12, 1.1], (v) => {
      v.box([-0.2, -0.15, -0.2], [0.2, 0.15, 0.28], brass);
      v.box([-0.22, 0.12, -0.22], [0.22, 0.17, 0.3], flat(b));
      v.box([-0.06, 0.17, -0.06], [0.06, 0.25, 0.06], flat('#c8a050'));
      bridle(v, [0.22, -0.06, 0.2], [0.22, -0.06, -0.12]);
    });
    bit = [0.22, -0.06, 0.2]; girth = 0.42;
    eyes(head, 0.1, 0.02, 0.3, '#ffc060', true, 0.12);
    for (const [x, z, hind] of [[0.26, 0.6, 0], [-0.26, 0.6, 0], [0.26, -0.62, 1], [-0.26, -0.62, 1]] as const) leg([x, 1.14, z], (v) => {
      v.ellipsoid([0, 0, 0], [0.12, 0.12, 0.12], flat('#c8a050'));
      v.capsule([0, 0, 0], [0, -0.58, hind ? -0.12 : 0.1], 0.06, 0.055, flat(b));
      v.ellipsoid([0, -0.6, hind ? -0.12 : 0.1], [0.09, 0.09, 0.09], flat('#c8a050'));
      v.capsule([0, -0.6, hind ? -0.12 : 0.1], [0, -1.06, 0.04], 0.055, 0.05, flat(a));
      v.box([-0.12, -1.14, -0.1], [0.12, -1.06, 0.2], flat(b));
    });
    tail = new THREE.Group(); B.add(tail);
  } else if (breed === 'griffin') {
    // ---- A tower griffin of Callis: a lion behind, an eagle before, plumage in rows, wings raised
    const plume = b;
    const lion: Paint = coat(a, 1.6, 1.0);
    const inBody = (x: number, y: number, z: number) => (x / 0.48) ** 2 + ((y - 1.36) / 0.52) ** 2 + ((z - 0.05) / 0.98) ** 2 <= 1.12;
    k.part(B, [0, 0, 0], (v) => {
      v.ellipsoid([0, 1.34, -0.38], [0.44, 0.46, 0.6], lion);
      v.ellipsoid([0, 1.4, 0.42], [0.47, 0.54, 0.48], feathers(plume));
      v.capsule([0, 1.62, 0.72], [0, 1.94, 1.06], 0.3, 0.24, feathers(plume));
      saddle(v, 1.88, -0.2, c, inBody, 0.44, P);
    });
    bit = [0.14, -0.06, 0.26]; girth = 0.48;
    head = k.part(B, [0, 2.06, 1.2], (v) => {
      v.ellipsoid([0, 0, 0], [0.25, 0.24, 0.28], feathers(plume));
      v.capsule([0, 0.0, 0.2], [0, -0.03, 0.48], 0.12, 0.07, flat('#e0b040')); // the beak
      v.capsule([0, -0.03, 0.48], [0, -0.18, 0.54], 0.07, 0.04, flat('#a87020')); // its hook
      v.box([-0.08, -0.14, 0.2], [0.08, -0.08, 0.4], flat('#c89030')); // the lower beak
      bridle(v, [0.14, -0.06, 0.26], [0.24, 0.02, -0.02]);
      for (const sd of [1, -1]) {
        v.box([sd * 0.2 - 0.04, 0.04, 0.0], [sd * 0.2 + 0.04, 0.09, 0.16], flat(shade(a, 0.6))); // the dark brow
        v.cone([sd * 0.12, 0.12, -0.16], [sd * 0.2, 0.2, -0.48], 0.07, flat(shade(plume, 0.85))); // crest feathers
      }
      v.cone([0, 0.16, -0.14], [0, 0.3, -0.5], 0.08, flat(shade(a, 0.9)));
    });
    eyes(head, 0.2, 0.02, 0.12, glow ? '#9fe8ff' : '#e8a020', glow, 0.07);
    for (const [x, z, hind] of [[0.24, 0.62, 0], [-0.24, 0.62, 0], [0.26, -0.66, 1], [-0.26, -0.66, 1]] as const) leg([x, 1.0, z], (v) => {
      if (hind) {
        const lp: Paint = (px, py, pz, n) => lion(px, py + 1.0, pz, n);
        v.ellipsoid([0, -0.12, -0.04], [0.2, 0.32, 0.24], lp);
        v.capsule([0, -0.36, -0.08], [0, -0.9, 0.04], 0.13, 0.11, lp);
        v.ellipsoid([0, -0.95, 0.1], [0.15, 0.07, 0.18], flat(shade(a, 0.85)));
      } else {
        v.capsule([0, 0, 0], [0, -0.4, 0.04], 0.17, 0.14, feathers(plume));
        v.capsule([0, -0.4, 0.04], [0, -0.92, 0.06], 0.08, 0.07, (_x, y, _z, n) => (Math.floor(y * 20) & 1 ? shade('#d8a840', 0.9) : shade('#e0b040', 0.95 + n * 0.08)));
        for (const t of [-1, 0, 1]) v.capsule([t * 0.05, -0.94, 0.06], [t * 0.09, -0.98, 0.26], 0.045, 0.04, flat('#3a3028'));
      }
    });
    for (const sd of [1, -1]) {
      // Wings raised: coverts near the arm in the plume colour, the long flight feathers in the coat's
      const w = k.part(B, [sd * 0.4, 1.8, 0.4], (v) => {
        const S0: V3 = [0, 0, 0], E: V3 = [sd * 0.3, 0.7, -0.2], T: V3 = [sd * 0.6, 1.12, -0.9], P2: V3 = [sd * 0.54, 0.34, -1.36], R: V3 = [sd * 0.04, -0.04, -0.72];
        const fl: Paint = (_x, y, z, n) => {
          const along = -z + y * 0.3;
          if (along > 0.95) return shade(a, (Math.floor((y - z) * 11) & 1 ? 0.7 : 0.82) + n * 0.08);
          return Math.floor((y - z) * 11) & 1 ? shade(plume, 0.86 + n * 0.06) : shade(plume, 0.98 + n * 0.06);
        };
        v.tri(S0, E, R, 0.12, fl); v.tri(E, T, P2, 0.12, fl); v.tri(E, P2, R, 0.12, fl);
        v.capsule(S0, E, 0.1, 0.08, feathers(plume)); v.capsule(E, T, 0.08, 0.05, feathers(plume));
      });
      w.userData.sd = sd;
      host.segs.push(w);
    }
    tail = k.part(B, [0, 1.56, -0.92], (v) => { v.capsule([0, 0, 0], [0, -0.3, -0.66], 0.065, 0.055, lion); v.ellipsoid([0, -0.34, -0.74], [0.11, 0.13, 0.14], shag(shade(a, 0.7))); });
  } else {
    return horse(k, host, P, breed);
  }
  return { head, tail, bit, girth };
}

// ---------------------------------------------------------------------------------------------
// Wagons: an open carrier's cart or a covered wagon, with the animal out in front in the shafts.
// The model's origin is the driver's box, where the player sits; the animal walks ahead of it.

/** How far ahead of the box the animal stands. */
export const wagonLead = (breed: string) => (breed === 'slabback' || breed === 'turtle' ? 2.85 : 2.5);
/** Benches in the back: how many rows of two, how far behind the box, how high the seat. */
export const WAGON_ROWS = [0.9, 1.75];
export const WAGON_BENCH = 1.18;
export const WAGON_BOX = 1.38;
const WHEEL_R = 0.52;

/**
 * Builds the wagon onto a mount's root: moves the animal's body forward into the shafts and lays the
 * wagon behind it. Returns the four wheels, to turn as it rolls.
 */
export function buildVoxWagon(root: THREE.Object3D, body: THREE.Object3D, breed: string, W: WagonLook): THREE.Object3D[] {
  const lead = wagonLead(breed), covered = W.kind === 'covered', cage = W.kind === 'cage';
  const paint = W.paint ?? '#7a2a24', canvas = W.canvas ?? '#e8dcc0';
  const wood = '#8a5a32', dark = '#4a3020', iron = '#3a3a3c', leather = '#4a2a16';
  const k = new Kit(['wagon', W.kind, paint, canvas, lead].join('|'));
  const front = new THREE.Group();
  front.position.z = lead;
  root.remove(body);
  front.add(body);
  root.add(front);

  const chassis = k.part(root, [0, 0, 0], (v) => {
    const boards: Paint = (x, _y, _z, n) => shade(wood, (Math.floor(x * 7) & 1 ? 0.88 : 1.0) + n * 0.08);
    const sideP: Paint = (_x, y, z, n) => {
      if (y > 1.26) return shade(paint, 0.92 + n * 0.1); // the top rail
      if (Math.abs((((z + 2.5) * 1.6) % 1) - 0.5) > 0.42) return shade(dark, 0.95 + n * 0.1); // the stakes
      return shade(wood, (Math.floor((y - 0.9) * 8) & 1 ? 0.86 : 1.0) + n * 0.08);
    };
    v.box([-0.72, 0.78, -2.5], [0.72, 0.9, 0.55], boards); // the floor
    for (const sd of [1, -1]) {
      v.box([sd > 0 ? 0.66 : -0.78, 0.9, -2.5], [sd > 0 ? 0.78 : -0.66, 1.32, 0.55], sideP);
      v.box([sd * 0.36 - 0.05, 0.62, -2.6], [sd * 0.36 + 0.05, 0.78, 0.7], flat(dark)); // the beams
      // The shafts, out to the animal's shoulders
      v.capsule([sd * 0.5, 0.95, 0.55], [sd * 0.48, 1.32, lead + 0.75], 0.055, 0.05, flat(wood));
      // The reins, from the bit back to the driver's hands
      v.capsule([sd * 0.18, 1.86, lead + 1.12], [sd * 0.16, 1.72, 0.36], 0.045, 0.045, flat(leather));
    }
    v.box([-0.78, 0.9, -2.56], [0.78, 1.32, -2.44], sideP); // the tailboard
    v.box([-0.78, 0.9, 0.49], [0.78, 1.24, 0.61], sideP); // the front board
    for (const az of [0.05, -1.95]) v.box([-0.92, 0.46, az - 0.06], [0.92, 0.58, az + 0.06], flat(iron)); // the axles
    // The driver's box: a painted bench on its riser, a footboard over the shafts
    v.box([-0.5, 0.9, -0.06], [0.5, WAGON_BOX - 0.12, 0.2], flat(dark));
    v.box([-0.62, WAGON_BOX - 0.12, -0.1], [0.62, WAGON_BOX, 0.26], (_x, _y, _z, n) => shade(paint, 0.95 + n * 0.1));
    v.box([-0.6, 0.98, 0.55], [0.6, 1.04, 0.86], boards);
    // Benches in the back for passengers
    for (const r of covered || cage ? WAGON_ROWS : WAGON_ROWS.slice(0, 1)) v.box([-0.66, WAGON_BENCH - 0.1, -r - 0.1], [0.66, WAGON_BENCH, -r + 0.12], (_x, _y, _z, n) => shade(wood, 0.92 + n * 0.1));
    // Goods at the tail: sacks and a crate
    v.ellipsoid([-0.4, 1.06, -2.24], [0.2, 0.16, 0.18], (_x, y, _z, n) => shade('#b8a070', 0.88 + n * 0.12 + (y > 1.15 ? 0.06 : 0)));
    v.ellipsoid([-0.1, 1.02, -2.3], [0.16, 0.12, 0.15], (_x, _y, _z, n) => shade('#a89060', 0.88 + n * 0.12));
    v.box([0.22, 0.9, -2.42], [0.64, 1.3, -2.06], (x, y, z, n) => (Math.abs(x - 0.43) > 0.17 || Math.abs(y - 1.1) > 0.16 || Math.abs(z + 2.24) > 0.14 ? shade(dark, 0.95 + n * 0.1) : shade(wood, 0.95 + n * 0.1)));
    // A lamp on a post at the front corner
    v.box([-0.7, 1.24, 0.44], [-0.62, 1.86, 0.52], flat(dark));
    if (cage) {
      // The watch's wagon: an iron cage over the bed, bars a hand apart, a plank roof, the door at the back
      const bar = (u: number) => ((((u + 4) * 5) % 1) + 1) % 1 < 0.32;
      v.fill([-0.8, 1.32, -2.5], [0.8, 2.44, -0.28], (x, y, z) => {
        if (y > 2.32) return Math.abs(x) <= 0.8;
        const sideWall = Math.abs(x) > 0.7, endWall = z < -2.44 || z > -0.34;
        if (!sideWall && !endWall) return false;
        if (y > 1.8 && y < 1.9) return true;
        return sideWall ? bar(z) : bar(x);
      }, (_x, y, _z, n) => (y > 2.32 ? shade(dark, 0.95 + n * 0.1) : shade(iron, 0.85 + n * 0.2)));
    }
    if (covered) {
      // The tilt: canvas stretched over five bows, sagging a little between them, open at both ends
      const bows = [-2.4, -1.875, -1.35, -0.825, -0.3];
      v.fill([-0.84, 1.3, -2.45], [0.84, 2.42, -0.28], (x, y, z) => {
        if (y < 1.3) return false;
        const sag = Math.min(...bows.map((b) => Math.abs(z - b))) * 0.06;
        const e = (x / (0.8 - sag)) ** 2 + ((y - 1.3) / (1.08 - sag)) ** 2;
        return e <= 1 && (x / (0.72 - sag)) ** 2 + ((y - 1.3) / (1.0 - sag)) ** 2 > 1;
      }, (_x, y, z, n) => {
        const near = Math.min(...bows.map((b) => Math.abs(z - b)));
        if (near < 0.05) return shade(dark, 0.95 + n * 0.1);
        return shade(canvas, 0.86 + n * 0.06 + Math.min(0.12, near * 0.4) + (y > 2.2 ? 0.04 : 0));
      });
    }
  });
  const lampM = new THREE.MeshLambertMaterial({ color: '#ffd890', emissive: new THREE.Color('#c88a30') });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), lampM);
  lamp.position.set(-0.66, 1.95, 0.48);
  lamp.userData.plain = true;
  chassis.add(lamp);

  // The wheels: an iron tyre on a painted felloe, eight spokes, an iron hub
  const wheels: THREE.Object3D[] = [];
  for (const [x, z] of [[0.86, 0.05], [-0.86, 0.05], [0.86, -1.95], [-0.86, -1.95]] as const) wheels.push(k.part(root, [x, WHEEL_R, z], (v) => {
    v.fill([-0.1, -WHEEL_R - 0.02, -WHEEL_R - 0.02], [0.1, WHEEL_R + 0.02, WHEEL_R + 0.02], (px, y, zz) => {
      const r = Math.hypot(y, zz);
      if (Math.abs(px) > 0.05) return r < 0.11;
      if (r <= WHEEL_R && r >= 0.4) return true;
      if (r < 0.11) return true;
      return Math.abs(Math.sin(Math.atan2(y, zz) * 4)) * r < 0.04;
    }, (_x, y, zz, n) => {
      const r = Math.hypot(y, zz);
      return r > 0.47 || r < 0.11 ? shade(iron, 0.9 + n * 0.15) : shade(paint, 0.88 + n * 0.12);
    });
  }));
  return wheels;
}

export { WHEEL_R };
