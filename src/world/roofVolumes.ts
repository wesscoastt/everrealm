// The shapes of the roofs, for the camera. Roofs are meshes laid over the voxel walls, so the
// camera's voxel raycast goes straight through them and its near plane cuts them open: you'd see
// the inside of the thatch. Every house roof and tower cap registers its volume here as it's built
// (world/props.ts addHouseRoof, world/siteProps.ts, world/structures.ts), and systems/CameraRig.ts
// keeps the camera out of them.

interface Gable {
  kind: 'gable';
  x: number; y: number; z: number;
  /** cos and sin of the ridge's turn (0 when the ridge runs along world X). */
  c: number; s: number;
  /** Half the length along the ridge, half the span across, and the half span with the eaves. */
  L: number; half: number; S: number;
  rise: number; thick: number;
  /** How far the eave tips curl up. */
  up: number;
}
interface Cone { kind: 'cone'; x: number; y: number; z: number; r: number; h: number }
type Volume = Gable | Cone;

const CELL = 16;
const grid = new Map<number, Volume[]>();
const seen = new Set<string>();
const key = (cx: number, cz: number) => (cx + 2048) * 4096 + (cz + 2048);

function add(v: Volume, id: string, R: number): void {
  // Sites are built again when you come back to them: the same roof is only kept once
  if (seen.has(id)) return;
  seen.add(id);
  for (let cx = Math.floor((v.x - R) / CELL); cx <= Math.floor((v.x + R) / CELL); cx++) {
    for (let cz = Math.floor((v.z - R) / CELL); cz <= Math.floor((v.z + R) / CELL); cz++) {
      const k = key(cx, cz);
      let list = grid.get(k);
      if (!list) grid.set(k, (list = []));
      list.push(v);
    }
  }
}

/**
 * A gable roof (props.ts gableRoof) set at (x, y, z) on the wall plate and turned ry: len along the
 * ridge, span across, rising rise over half the span, overhanging ov past the walls.
 */
export function addGableVolume(x: number, y: number, z: number, len: number, span: number, rise: number, ov: number, ry: number, thick: number, up = 0): void {
  const L = len / 2 + ov, S = span / 2 + ov;
  add({ kind: 'gable', x, y, z, c: Math.cos(ry), s: Math.sin(ry), L, half: span / 2, S, rise, thick, up }, `g${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`, Math.hypot(L, S));
}

/** A conical cap from y up to y + h, r across at its foot. */
export function addConeVolume(x: number, y: number, z: number, r: number, h: number): void {
  add({ kind: 'cone', x, y, z, r, h }, `c${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`, r);
}

/** The underside of the highest roof over (x, z), or -Infinity: where rain stops (world/precip.ts). */
export function roofOver(px: number, pz: number): number {
  const list = grid.get(key(Math.floor(px / CELL), Math.floor(pz / CELL)));
  if (!list) return -Infinity;
  let best = -Infinity;
  for (const v of list) {
    if (v.kind === 'cone') { if (Math.hypot(px - v.x, pz - v.z) <= v.r) best = Math.max(best, v.y); continue; }
    const dx = px - v.x, dz = pz - v.z;
    const lx = dx * v.c - dz * v.s, lz = dx * v.s + dz * v.c;
    if (Math.abs(lx) > v.L || Math.abs(lz) > v.S) continue;
    const a = Math.abs(lz);
    best = Math.max(best, a <= v.half ? v.y : v.y + (v.rise * (v.S - a)) / v.half - v.thick);
  }
  return best;
}

/** Whether a point is in a roof, or within m of its surfaces. */
export function inRoof(px: number, py: number, pz: number, m = 0.3): boolean {
  const list = grid.get(key(Math.floor(px / CELL), Math.floor(pz / CELL)));
  if (!list) return false;
  for (const v of list) {
    if (v.kind === 'cone') {
      const dy = py - v.y;
      if (dy < -m || dy > v.h + m) continue;
      if (Math.hypot(px - v.x, pz - v.z) <= v.r * Math.min(1, 1 - dy / v.h) + m) return true;
      continue;
    }
    const dx = px - v.x, dz = pz - v.z;
    const lx = dx * v.c - dz * v.s, lz = dx * v.s + dz * v.c;
    if (Math.abs(lx) > v.L + m) continue;
    const a = Math.abs(lz);
    if (a > v.S + m) continue;
    const top = v.y + (v.rise * (v.S - Math.min(a, v.S))) / v.half;
    if (py > top + m + (a > v.half ? v.up : 0)) continue;
    // Over the walls it's roof and attic from the wall plate up; out over the eaves, just the slab
    if (a <= v.half) { if (py >= v.y) return true; continue; }
    if (py >= top - v.thick - m) return true;
  }
  return false;
}
