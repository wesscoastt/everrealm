import * as THREE from 'three';
import { box, cyl, flat, type PropMaterials } from './props';
import { gunwale, halfBeam, rocker, SHIPS, type SailState, type ShipKind, type Spec } from './shipHull';

export { deckAt, hullHalf, inHull, shipDeckY, SHIPS, type SailState, type ShipKind } from './shipHull';

// Ships, the way an MMO harbour wants them: hulls lofted smooth from stations (not stacked boxes),
// planked, with a painted wale; castles, rails, hatches and capstans on deck; masts with tops, yards,
// shrouds and ratlines; sails that belly; lanterns and lit stern windows; a figurehead. Six kinds:
//
//   smack     a fishing boat: one mast, a tan gaff sail, nets and pots
//   cog       the Counties' trader and the Mewstones ferry: one great square sail, castles fore and aft
//   carrack   the merchantman: three masts, a high stern, a figurehead
//   galleon   a man-of-war (and, black-hulled, the pirates of the Saltpenny isles)
//   longship  the north's: clinker-built, shields along the rail, a carved prow
//   clipper   Morrow's: white and gold, fine-lined, blue sails
//
// Bow toward +x. y 0 is the waterline: set a ship at the water's surface and she floats right. Each
// kind's deck height above the water and its hull's size are in SHIPS (world/shipHull.ts), for collision
// and gangplanks.


export interface ShipOpts { sails?: SailState; hull?: string; wale?: string; sail?: string; trim?: string; flag?: string; name?: string }

// ---------------------------------------------------------------- The hull

/** The half-beam at a station u (0 stern .. 1 bow), as a share of the beam's half. */
/** A point on the hull's side: station u, girth v (0 keel .. 1 gunwale), side ±1. */
function hullPoint(s: Spec, u: number, v: number, side: number, out: THREE.Vector3, swell = 0): THREE.Vector3 {
  const x = (u - 0.5) * s.len, k = rocker(s, u), top = gunwale(s, u);
  const y = k + (top - k) * v - s.draft;
  // A round bilge, nearly upright sides, and a little tumblehome under the rail
  const w = Math.pow(Math.sin((Math.min(1, v * 1.25) * Math.PI) / 2), 0.6) * (1 - Math.max(0, v - 0.85) * 0.25);
  return out.set(x, y, side * ((s.beam / 2) * halfBeam(s, u) * w + swell));
}

/** The hull's skin, both sides, lofted from stations: planks run along its length. */
function hullGeometry(s: Spec, v0 = 0, v1 = 1, swell = 0): THREE.BufferGeometry {
  const N = 28, M = 9, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3();
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) {
      const u = i / N, v = v0 + ((v1 - v0) * j) / M;
      hullPoint(s, u, v, side, p, swell);
      pos.push(p.x, p.y, p.z);
      uv.push(p.x, v * (s.draft + s.deck + 0.6));
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = base + i * (M + 1) + j, b = a + M + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The transom: the flat of a square stern, closing the hull's skin across from side to side, keel to rail. */
function transomGeometry(s: Spec): THREE.BufferGeometry {
  const M = 9, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= M; j++) for (const side of [1, -1]) {
    hullPoint(s, 0, j / M, side, p);
    pos.push(p.x, p.y, p.z);
    uv.push(p.z, p.y);
    if (j < M) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The deck: a level floor inside the hull at the deck's height. */
function deckGeometry(s: Spec, y: number): THREE.BufferGeometry {
  const N = 24, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const u = 0.02 + (0.96 * i) / N;
    // The hull's half-width at the deck's height on this station
    const k = rocker(s, u), top = gunwale(s, u), v = Math.min(1, (y + s.draft - k) / (top - k));
    hullPoint(s, u, v, 1, p);
    const hw = Math.max(0.05, p.z - 0.06);
    pos.push(p.x, y, hw, p.x, y, -hw);
    uv.push(p.x, hw, p.x, -hw);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A sail that bellies: w wide (across z), h tall, pushed forward by belly in the middle; a triangle when tri. */
function sailGeometry(w: number, h: number, belly: number, tri = false): THREE.BufferGeometry {
  const NX = 8, NY = 8, pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const a = i / NX, b = j / NY;
    const ww = tri ? w * (1 - b) : w * (1 - b * 0.12);
    const z = (a - 0.5) * ww + (tri ? (w * b) / 2 - w / 2 + ww / 2 : 0);
    const x = belly * Math.sin(Math.PI * a) * Math.sin(Math.PI * (0.15 + b * 0.85));
    pos.push(x, -b * h, z);
    uv.push(a, b);
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const p = j * (NX + 1) + i, q = p + NX + 1; idx.push(p, q, p + 1, q, q + 1, p + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- Shared materials

const cache = new Map<string, THREE.Material>();
function hullMat(M: PropMaterials, color: string): THREE.Material {
  const k = 'hull' + color;
  let m = cache.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ map: M.wood.map, color, side: THREE.DoubleSide }); cache.set(k, m); }
  return m;
}
function clothMat(color: string): THREE.Material {
  const k = 'cloth' + color;
  let m = cache.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }); cache.set(k, m); }
  return m;
}
const windowGlow = new THREE.MeshLambertMaterial({ color: '#ffd080', emissive: new THREE.Color('#ff9a40'), emissiveIntensity: 0.9 });

// ---------------------------------------------------------------- Building one

/** A ship of a kind, sails set, furled, or bare (no masts: a hull still on the slip). */
export function shipModel(M: PropMaterials, kind: ShipKind, o: ShipOpts = {}): THREE.Group {
  const base = SHIPS[kind];
  const s: Spec = { ...base, hull: o.hull ?? base.hull, wale: o.wale ?? base.wale, sail: o.sail ?? base.sail, trim: o.trim ?? base.trim };
  const sails = o.sails ?? 'furled';
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m;
  };
  const piece = (w: number, h: number, d: number, mat: THREE.Material | string, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
    add(box(w, h, d), typeof mat === 'string' ? flat(mat) : mat, x, y, z, ry, rx, rz);
  const line = (a: THREE.Vector3, b: THREE.Vector3, r = 0.025, mat: THREE.Material = M.rope) => {
    const d = b.clone().sub(a), len = d.length();
    const m = new THREE.Mesh(box(r * 2, len, r * 2), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.add(m);
  };
  const L = s.len, Y = s.deck; // the deck's height above the water
  const p = new THREE.Vector3();
  /** The rail's height and half-width at a point along the length (x). */
  const railAt = (x: number) => { const u = x / L + 0.5; hullPoint(s, u, 1, 1, p); return { y: p.y, w: p.z }; };

  // ---- Hull, wale, the deck and the rail on top of the bulwark
  add(hullGeometry(s), hullMat(M, s.hull));
  // (a square stern is closed across; without it you saw into her from astern, and out through her)
  if (s.transom > 0) add(transomGeometry(s), hullMat(M, s.hull));
  add(hullGeometry(s, 0.62, 0.7, 0.025), flat(s.wale));
  add(hullGeometry(s, 0.0, 0.32, 0.015), flat('#2a2622')); // the bottom, tarred
  add(deckGeometry(s, Y), M.wood);
  if (kind !== 'longship') {
    for (let x = -L * 0.44; x <= L * 0.44; x += L / 18) {
      const r = railAt(x);
      for (const sd of [1, -1]) piece(0.1, 0.12, 0.1, M.darkWood, x, r.y + 0.05, sd * (r.w - 0.06));
    }
  }

  // ---- The stern and bow: transom with windows, a castle where the kind has one
  const sternX = -L / 2, bowX = L / 2;
  const tr = railAt(sternX + 0.6);
  if (s.transom > 0.2) {
    piece(0.2, Math.max(0.6, tr.y - Y + 0.2), tr.w * 2 * 0.9, flat(s.hull), sternX + 0.35, (tr.y + Y) / 2, 0);
  }
  const castle = (x0: number, x1: number, h: number, windows: boolean, crenel = false) => {
    const xm = (x0 + x1) / 2, r = railAt(xm), w = r.w * 2 - 0.1;
    piece(x1 - x0, h, w, hullMat(M, s.hull), xm, Y + h / 2, 0);
    piece(x1 - x0 + 0.1, 0.12, w + 0.1, M.wood, xm, Y + h + 0.06, 0);
    piece(x1 - x0 + 0.14, 0.18, w + 0.14, flat(s.wale), xm, Y + h - 0.15, 0);
    // The castle's own rail
    for (let x = x0 + 0.2; x <= x1 - 0.1; x += 0.6) for (const sd of [1, -1]) piece(crenel ? 0.36 : 0.08, crenel ? 0.42 : 0.5, crenel ? 0.14 : 0.08, crenel ? hullMat(M, s.hull) : M.darkWood, x, Y + h + 0.3, sd * (w / 2 - 0.05));
    for (const sd of [1, -1]) piece(x1 - x0, 0.08, 0.08, M.darkWood, xm, Y + h + 0.55, sd * (w / 2 - 0.05));
    if (windows) {
      // Lit windows across the stern and down each side
      for (let k = -1; k <= 1; k++) piece(0.06, 0.42, 0.5, windowGlow, x0 - 0.02, Y + h * 0.55, k * w * 0.28);
      for (const sd of [1, -1]) for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.1) piece(0.4, 0.34, 0.05, windowGlow, x, Y + h * 0.55, sd * (w / 2 + 0.02));
      piece(0.08, 0.18, w + 0.06, flat(s.trim), x0 - 0.04, Y + h * 0.85, 0); // a gilded band over the windows
    }
    // A door into it from the deck
    piece(0.06, 1.3, 0.8, M.darkWood, x1 + 0.02, Y + 0.65, 0);
  };
  const lantern = (x: number, y: number, z = 0) => { piece(0.06, 0.5, 0.06, M.iron, x, y + 0.25, z); piece(0.32, 0.4, 0.32, M.glow, x, y + 0.7, z); piece(0.38, 0.06, 0.38, M.iron, x, y + 0.93, z); };

  if (kind === 'cog') {
    castle(sternX + 0.3, sternX + 3.6, 1.8, true, true);
    castle(bowX - 3.4, bowX - 0.8, 1.4, false, true);
    lantern(sternX + 0.6, Y + 1.9);
  } else if (kind === 'carrack') {
    castle(sternX + 0.3, sternX + 5.2, 2.0, true);
    castle(sternX + 0.3, sternX + 2.8, 3.8, true); // the poop above the quarterdeck
    castle(bowX - 4.4, bowX - 1.0, 1.6, false);
    lantern(sternX + 0.5, Y + 3.9, 1.0); lantern(sternX + 0.5, Y + 3.9, -1.0);
  } else if (kind === 'galleon') {
    castle(sternX + 0.3, sternX + 7.0, 2.2, true);
    castle(sternX + 0.3, sternX + 3.8, 4.2, true);
    castle(bowX - 4.8, bowX - 1.4, 1.7, false);
    // A stern gallery: a balcony across the transom
    piece(0.7, 0.1, railAt(sternX + 1).w * 1.7, M.wood, sternX - 0.1, Y + 1.2, 0);
    for (let z = -1.8; z <= 1.8; z += 0.45) piece(0.06, 0.5, 0.06, flat(s.trim), sternX - 0.4, Y + 1.45, z);
    lantern(sternX + 0.5, Y + 4.3, 1.4); lantern(sternX + 0.5, Y + 4.3, -1.4); lantern(sternX + 0.5, Y + 4.3, 0);
  } else if (kind === 'clipper') {
    castle(sternX + 0.3, sternX + 4.0, 1.2, true);
    lantern(sternX + 0.5, Y + 1.3);
  } else if (kind === 'smack') {
    // A little cuddy aft, nets over the rail and pots on deck
    piece(2.0, 1.0, 2.0, hullMat(M, s.hull), sternX + 2.0, Y + 0.5, 0);
    piece(2.2, 0.1, 2.2, M.darkWood, sternX + 2.0, Y + 1.05, 0);
    for (const sd of [1, -1]) piece(3.0, 0.5, 0.06, flat('#6a7a5a'), 0.6, railAt(0.6).y - 0.2, sd * (railAt(0.6).w + 0.03));
    for (let k = 0; k < 4; k++) { piece(0.5, 0.4, 0.5, flat('#7a5a3a'), 1.4 + (k % 2) * 0.6, Y + 0.2 + (k > 1 ? 0.4 : 0), -0.4 + (k % 2) * 0.1); }
    lantern(sternX + 0.7, Y + 0.1);
  } else if (kind === 'longship') {
    // Shields along both rails, oars out, a carved head and tail on the posts
    const sc = ['#a8382c', '#efe3c4', '#2f528f', '#c8a050'];
    for (let x = -L * 0.36, k = 0; x <= L * 0.36; x += 0.95, k++) {
      const r = railAt(x);
      for (const sd of [1, -1]) {
        const sh = add(cyl(0.38, 0.38, 0.06, 10), flat(sc[(k + (sd > 0 ? 0 : 2)) % 4]), x, r.y - 0.25, sd * (r.w + 0.04), 0, Math.PI / 2);
        void sh;
        add(cyl(0.08, 0.08, 0.07, 6), M.iron, x, r.y - 0.25, sd * (r.w + 0.08), 0, Math.PI / 2);
      }
      if (k % 2 === 0 && sails !== 'bare') for (const sd of [1, -1]) line(new THREE.Vector3(x + 0.3, r.y - 0.1, sd * r.w), new THREE.Vector3(x + 0.6, -0.3, sd * (r.w + 2.6)), 0.05, M.wood);
    }
    for (const [x0, dir] of [[bowX - 0.4, 1], [sternX + 0.4, -1]] as const) {
      // The posts curl up and over; the bow's ends in a beast's head
      let px = x0, py = railAt(x0 - dir * 0.4).y;
      for (let k = 0; k < 7; k++) {
        const a = (k / 6) * Math.PI * 0.85;
        const nx = px + dir * Math.cos(a) * 0.45, ny = py + Math.sin(a) * 0.45 + 0.15;
        line(new THREE.Vector3(px, py, 0), new THREE.Vector3(nx, ny, 0), 0.12, hullMat(M, s.hull));
        px = nx; py = ny;
      }
      if (dir > 0) { piece(0.7, 0.42, 0.34, hullMat(M, s.hull), px + 0.25, py, 0); piece(0.3, 0.1, 0.36, flat('#ffcc40'), px + 0.4, py + 0.1, 0); piece(0.4, 0.08, 0.22, flat('#a8382c'), px + 0.55, py - 0.12, 0); }
    }
  }

  // ---- On deck: a hatch, a capstan, barrels and coils, the wheel or the tiller
  if (kind !== 'longship') {
    piece(1.6, 0.18, 1.3, M.darkWood, L * 0.06, Y + 0.09, 0);
    for (let k = -2; k <= 2; k++) piece(1.5, 0.04, 0.06, M.wood, L * 0.06, Y + 0.2, k * 0.24);
    if (kind !== 'smack') {
      add(cyl(0.32, 0.38, 0.7, 10), M.darkWood, L * 0.24, Y + 0.35, 0);
      for (let k = 0; k < 4; k++) piece(1.3, 0.07, 0.07, M.wood, L * 0.24, Y + 0.62, 0, (k * Math.PI) / 4);
      for (const [x, z] of [[L * 0.15, 1.1], [L * 0.17, 1.6], [-L * 0.05, -1.4]] as const) { add(cyl(0.3, 0.3, 0.8, 8), M.darkWood, x, Y + 0.4, z); add(cyl(0.31, 0.31, 0.06, 8), M.iron, x, Y + 0.6, z); }
      for (const [x, z] of [[L * 0.32, -1.0], [-L * 0.12, 1.3]] as const) for (let k = 0; k < 3; k++) add(new THREE.TorusGeometry(0.28 - k * 0.04, 0.035, 5, 14), M.rope, x, Y + 0.04 + k * 0.06, z, 0, Math.PI / 2);
    }
  }
  const helmX = kind === 'carrack' ? sternX + 4.6 : kind === 'galleon' ? sternX + 6.4 : kind === 'clipper' ? sternX + 4.4 : kind === 'cog' ? sternX + 4.2 : sternX + 0.9;
  const helmY = kind === 'carrack' ? Y + 2.1 : kind === 'galleon' ? Y + 2.3 : kind === 'clipper' ? Y + 1.25 : Y;
  if (kind === 'carrack' || kind === 'galleon' || kind === 'clipper') {
    // The wheel, spoked, on its stand
    piece(0.3, 0.9, 0.3, M.darkWood, helmX, helmY + 0.45, 0);
    add(new THREE.TorusGeometry(0.45, 0.05, 6, 16), M.darkWood, helmX + 0.2, helmY + 1.0, 0, Math.PI / 2);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; piece(0.05, 1.1, 0.05, M.darkWood, helmX + 0.2, helmY + 1.0 + Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0, a); }
  } else {
    // A tiller over the stern
    piece(1.6, 0.1, 0.12, M.darkWood, sternX + 1.0, helmY + 0.9, 0, 0, 0, -0.2);
  }

  // ---- Bowsprit and figurehead
  const bowTop = railAt(bowX - 0.6);
  if (kind !== 'longship' && kind !== 'smack') {
    line(new THREE.Vector3(bowX - 1.2, bowTop.y, 0), new THREE.Vector3(bowX + L * 0.22, bowTop.y + 1.6, 0), 0.13, M.wood);
    if (kind === 'carrack' || kind === 'galleon' || kind === 'clipper') {
      // A figurehead under the bowsprit: a gilded figure leaning out
      const fx = bowX + 0.1, fy = bowTop.y - 0.6;
      piece(0.7, 0.45, 0.4, flat(s.trim), fx, fy, 0, 0, 0, -0.5);
      piece(0.34, 0.34, 0.34, flat(s.trim), fx + 0.38, fy + 0.3, 0);
      piece(0.5, 0.1, 0.9, flat(s.trim), fx + 0.05, fy + 0.1, 0, 0, 0.3, -0.4);
    }
  }
  // An anchor at the cathead
  if (kind !== 'longship') {
    const ax = bowX - 1.6, r = railAt(ax);
    piece(0.08, 1.0, 0.08, M.iron, ax, r.y - 0.7, r.w + 0.12);
    piece(0.5, 0.08, 0.08, M.iron, ax, r.y - 1.15, r.w + 0.12, 0, 0, 0.5);
    piece(0.5, 0.08, 0.08, M.iron, ax, r.y - 1.15, r.w + 0.12, 0, 0, -0.5);
  }

  if (sails === 'bare') return g;

  // ---- Masts, tops, yards and sails
  type Mast = { x: number; h: number; yards: number[]; lateen?: boolean; gaff?: boolean };
  const masts: Mast[] =
    kind === 'smack' ? [{ x: L * 0.1, h: 8, yards: [], gaff: true }]
      : kind === 'cog' ? [{ x: 0, h: 13, yards: [11.5] }]
        : kind === 'longship' ? [{ x: 0, h: 9.5, yards: [8.6] }]
          : kind === 'carrack' ? [{ x: L * 0.3, h: 11, yards: [9.6, 6.6] }, { x: L * 0.02, h: 15, yards: [13.4, 9.4] }, { x: -L * 0.3, h: 10.5, yards: [], lateen: true }]
            : kind === 'galleon' ? [{ x: L * 0.3, h: 14, yards: [12.8, 9.4, 6.4] }, { x: L * 0.02, h: 18, yards: [16.6, 12.4, 8.4] }, { x: -L * 0.3, h: 12.5, yards: [], lateen: true }]
              : [{ x: L * 0.24, h: 14, yards: [12.6, 9.0] }, { x: -L * 0.08, h: 16, yards: [14.4, 10.6] }];
  const cloth = clothMat(s.sail), stripe = clothMat(kind === 'longship' ? s.trim : s.trim);
  for (const m of masts) {
    const top = Y + m.h;
    add(cyl(0.13 + m.h * 0.006, 0.2 + m.h * 0.008, m.h + 0.4), M.wood, m.x, Y + m.h / 2, 0);
    // A top (the platform) on the bigger masts
    if (m.h >= 11) { add(cyl(0.6, 0.5, 0.18, 10), M.darkWood, m.x, top - m.h * 0.3, 0); }
    // Shrouds to each rail, ratlines across them
    const r = railAt(m.x), from = top - m.h * 0.3;
    for (const sd of [1, -1]) {
      const feet = [-0.6, 0, 0.6].map((dx) => new THREE.Vector3(m.x + dx, r.y + 0.05, sd * (r.w + 0.05)));
      for (const f of feet) line(new THREE.Vector3(m.x, from, sd * 0.25), f, 0.018);
      for (let k = 1; k < 7; k++) {
        const t = k / 7;
        line(new THREE.Vector3(m.x - 0.6 * (1 - t), r.y + (from - r.y) * t, sd * (r.w + (0.25 - r.w) * t)), new THREE.Vector3(m.x + 0.6 * (1 - t), r.y + (from - r.y) * t, sd * (r.w + (0.25 - r.w) * t)), 0.012);
      }
    }
    if (m.gaff) {
      // A gaff sail: a boom low, a gaff high, the sail between, abaft the mast
      line(new THREE.Vector3(m.x, Y + 1.2, 0), new THREE.Vector3(m.x - 4.2, Y + 1.0, 0), 0.07, M.wood);
      line(new THREE.Vector3(m.x, Y + 6.8, 0), new THREE.Vector3(m.x - 3.8, Y + 7.6, 0), 0.06, M.wood);
      if (sails === 'set') { const sl = add(sailGeometry(4.0, 5.8, 0.5), cloth, m.x - 2.0, Y + 7.0, 0, Math.PI / 2); sl.rotation.z = 0.04; }
      else add(cyl(0.18, 0.18, 4.0, 6), cloth, m.x - 2.1, Y + 1.35, 0, 0, 0, Math.PI / 2);
      continue;
    }
    if (m.lateen) {
      // The mizzen's lateen: a long yard slung slantwise, the triangle under it
      const a = new THREE.Vector3(m.x + 2.6, Y + 2.5, 0), b = new THREE.Vector3(m.x - 3.4, top + 0.6, 0);
      line(a, b, 0.07, M.wood);
      if (sails === 'set') { const sl = add(sailGeometry(5.4, 6.5, 0.6, true), cloth, m.x - 0.4, top - 0.8, 0, -Math.PI / 2); sl.rotation.x = -0.55; }
      else add(cyl(0.16, 0.16, 6.4, 6), cloth, m.x - 0.4, (a.y + b.y) / 2 - 0.15, 0, 0, 0, Math.atan2(b.y - a.y, b.x - a.x));
      continue;
    }
    m.yards.forEach((yy, k) => {
      const yw = s.beam * (kind === 'longship' ? 1.5 : 1.25) * (1 - k * 0.14), y = Y + yy;
      piece(0.18, 0.18, yw, M.darkWood, m.x + 0.22, y, 0);
      const next = m.yards[k + 1] !== undefined ? Y + m.yards[k + 1] : Y + 2.0, sh = (y - next) * 0.92;
      if (sails === 'set') {
        add(sailGeometry(yw * 0.96, sh, 0.55 + sh * 0.06), cloth, m.x + 0.3, y - 0.1, 0);
        // A painted band across the course: the ship's colours
        if (k === m.yards.length - 1 || kind === 'cog' || kind === 'longship') {
          const band = add(sailGeometry(yw * 0.96, sh * 0.22, 0.55 + sh * 0.06), stripe, m.x + 0.33, y - 0.1 - sh * 0.4, 0);
          void band;
        }
      } else add(cyl(0.2, 0.2, yw * 0.9, 6), cloth, m.x + 0.25, y - 0.22, 0, 0, Math.PI / 2);
    });
    // A pennant at the masthead
    piece(0.03, 0.3, 1.2, clothMat(o.flag ?? s.trim), m.x, top + 0.25, 0.6);
  }
  // Stays: from each masthead forward to the next, and the foremost to the bowsprit's end
  const sorted = [...masts].sort((a, b) => b.x - a.x);
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i], top = new THREE.Vector3(m.x, Y + m.h - 0.3, 0);
    const to = i === 0 ? (kind === 'smack' || kind === 'longship' ? new THREE.Vector3(bowX - 0.3, bowTop.y, 0) : new THREE.Vector3(bowX + L * 0.22, bowTop.y + 1.6, 0)) : new THREE.Vector3(sorted[i - 1].x, Y + 2.2, 0);
    line(top, to, 0.025);
    if (i === sorted.length - 1) line(top, new THREE.Vector3(sternX + 0.6, railAt(sternX + 0.8).y + 0.6, 0), 0.025);
  }
  // A jib forward of the foremast on the bigger ships
  if (sails === 'set' && (kind === 'carrack' || kind === 'galleon' || kind === 'clipper')) {
    const f = sorted[0], j = add(sailGeometry(3.4, 5.4, 0.4, true), cloth, f.x + 1.6, Y + f.h * 0.75, 0, -Math.PI / 2);
    j.rotation.x = 0.5;
  }
  return g;
}

