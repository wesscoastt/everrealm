// Interiors for the voxel houses: what stands where inside, the stairs to an upper floor, and which
// cells furniture fills so nobody walks through a table. Pure data (no three.js), shared by the
// streamed sites (sites.ts) and the authored valley (structures.ts), which each turn the result into
// blocks and props in their own way.

export type Role = 'home' | 'inn' | 'shop' | 'office' | 'workshop' | 'store' | 'vacant';
export type FurnItem = 'bed' | 'table' | 'stool' | 'dresser' | 'hearth' | 'rug' | 'chest' | 'barrel' | 'crate' | 'counter' | 'shelves' | 'lamp' | 'bench' | 'desk' | 'chair' | 'candles';

export interface HouseShape {
  x0: number; z0: number; w: number; d: number; floors: number; base: number;
  door: 'n' | 's' | 'e' | 'w'; doorX: number; doorZ: number;
  /** The chimney's column, when the house has one (it rises from the top floor's ceiling). */
  chimney?: [number, number];
  role?: Role;
  /** Rug colour: 0..2 picks red, blue, green. */
  tint?: number;
}

/**
 * Each piece's footprint, width (local x) by depth (local z), in blocks, measured from the props.
 * A piece claims every floor cell its footprint reaches into, so nothing is set down over it.
 */
export const FURN_SIZE: Record<FurnItem, [number, number]> = {
  bed: [1, 2], table: [1.6, 0.86], stool: [0.4, 0.4], dresser: [1.5, 0.56], hearth: [1.9, 0.9], rug: [1.8, 1.2], chest: [0.8, 0.54],
  barrel: [0.72, 0.72], crate: [0.72, 0.72], counter: [2.5, 0.7], shelves: [1.42, 0.43], lamp: [0.28, 0.28], bench: [1.8, 0.42], desk: [1.6, 0.8],
  chair: [1, 0.83], candles: [0.4, 0.4],
};

/** World cells a piece covers: those its footprint overlaps by more than a sliver. */
export function furnCells(item: FurnItem, x: number, z: number, ry: number): [number, number][] {
  const [w, l] = FURN_SIZE[item];
  const c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
  const hx = (w * c + l * sn) / 2, hz = (w * sn + l * c) / 2;
  const out: [number, number][] = [];
  for (let cx = Math.floor(x - hx); cx <= Math.floor(x + hx); cx++) for (let cz = Math.floor(z - hz); cz <= Math.floor(z + hz); cz++) {
    const ox = Math.min(x + hx, cx + 1) - Math.max(x - hx, cx), oz = Math.min(z + hz, cz + 1) - Math.max(z - hz, cz);
    if (ox > 0.1 && oz > 0.1) out.push([cx, cz]);
  }
  return out;
}

export interface Furn { item: FurnItem; x: number; y: number; z: number; ry: number; tint?: number }
export interface FitOut {
  furn: Furn[];
  /** Block edits: upper floors, stair steps, and invisible barriers under solid furniture. */
  blocks: [number, number, number, 'floor' | 'step' | 'barrier' | 'air'][];
  lights: [number, number, number][];
}

/** Interior frame: u runs along the door wall, v runs from the door wall towards the back. */
interface Frame { W: number; D: number; du: number; cell: (u: number, v: number) => [number, number]; out: [number, number] }

function frame(h: HouseShape): Frame {
  const { x0, z0, w, d } = h;
  switch (h.door) {
    case 's': return { W: w - 2, D: d - 2, du: h.doorX - (x0 + 1), cell: (u, v) => [x0 + 1 + u, z0 + d - 2 - v], out: [0, 1] };
    case 'n': return { W: w - 2, D: d - 2, du: h.doorX - (x0 + 1), cell: (u, v) => [x0 + 1 + u, z0 + 1 + v], out: [0, -1] };
    case 'e': return { W: d - 2, D: w - 2, du: h.doorZ - (z0 + 1), cell: (u, v) => [x0 + w - 2 - v, z0 + 1 + u], out: [1, 0] };
    default: return { W: d - 2, D: w - 2, du: h.doorZ - (z0 + 1), cell: (u, v) => [x0 + 1 + v, z0 + 1 + u], out: [-1, 0] };
  }
}

const hashi = (a: number, b: number) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function fitOut(h: HouseShape): FitOut {
  const F = frame(h);
  const { W, D, du } = F;
  const out: FitOut = { furn: [], blocks: [], lights: [] };
  if (W < 2 || D < 2) return out;
  const role = h.role ?? 'home';
  const seed = hashi(h.x0, h.z0);
  // World direction for a facing given in the room frame: "front" faces the door wall, "back" the back wall.
  const fwd: [number, number] = F.out; // towards the door wall
  const side = (sign: number): [number, number] => { const [a, b] = F.cell(1, 0), [c, e] = F.cell(0, 0); return [(a - c) * sign, (b - e) * sign]; };
  const ryOf = (dir: [number, number]) => Math.atan2(dir[0], dir[1]);
  const facing = { front: ryOf(fwd), back: ryOf([-fwd[0], -fwd[1]]), right: ryOf(side(-1)), left: ryOf(side(1)) };

  for (let f = 0; f < h.floors; f++) {
    const y = h.base + f * 4;
    // Cells are tracked in world coordinates, so a piece's real footprint can claim them
    const used = new Set<string>();
    const room = new Set<string>();
    for (let u = 0; u < W; u++) for (let v = 0; v < D; v++) room.add(F.cell(u, v).join(','));
    const k = (u: number, v: number) => F.cell(u, v).join(',');
    const free = (u: number, v: number) => u >= 0 && v >= 0 && u < W && v < D && !used.has(k(u, v));
    // Keep the way in clear: the door column on the ground floor, two cells deep.
    if (f === 0) for (let v = 0; v < Math.min(2, D); v++) used.add(k(du, v));
    // ...and the cell the open door leaf swings into
    if (f === 0) { const leaf = openDoorPlace(h); used.add([Math.floor(leaf.x), Math.floor(leaf.z)].join(',')); }
    // Stairs up, along the back wall, on the side away from the door: four steps, the last at floor height.
    const stairsHere = f < h.floors - 1 && W >= 5 && D >= 3;
    if (stairsHere) {
      const right = du < W / 2;
      for (let s = 0; s < 4; s++) {
        const u = right ? W - 1 - (3 - s) : 3 - s; // ascending away from the door side
        const [x, z] = F.cell(u, D - 1);
        for (let yy = y; yy <= y + s; yy++) out.blocks.push([x, yy, z, 'step']);
        // The climb and the row beside it stay clear of furniture
        used.add(k(u, D - 1)); used.add(k(u, D - 2));
        // Headroom through the floor above: over the first three steps and the row beside them, as
        // a body is wider than its feet and overlaps the step it's leaving (see the stairwell below)
        if (s <= 2) for (const v of [D - 1, D - 2]) { const [hx, hz] = F.cell(u, v); out.blocks.push([hx, y + 3, hz, 'air']); }
      }
      used.add(k(right ? W - 5 : 4, D - 1)); // landing at the foot of the stairs stays clear
      used.add(k(right ? W - 4 : 3, D - 2));
    }
    // The floor of the storey above (the ground floor's is the foundation)
    if (f > 0) {
      for (let u = 0; u < W; u++) for (let v = 0; v < D; v++) {
        const [x, z] = F.cell(u, v);
        out.blocks.push([x, y - 1, z, 'floor']);
      }
      // The stairwell from below stays open, three steps long and two rows wide, with a rail round
      // it (invisible, a block high) so nobody walks off the edge upstairs
      if (W >= 5 && D >= 3) {
        const right = du < W / 2;
        const uOf = (s: number) => (right ? W - 1 - (3 - s) : 3 - s);
        for (const st of [0, 1, 2]) for (const v of [D - 1, D - 2]) { const [x, z] = F.cell(uOf(st), v); out.blocks.push([x, y - 1, z, 'air']); used.add(k(uOf(st), v)); }
        for (const st of [0, 1, 2]) if (D - 3 >= 0) { const [x, z] = F.cell(uOf(st), D - 3); out.blocks.push([x, y, z, 'barrier']); used.add(k(uOf(st), D - 3)); }
        const outer = uOf(-1);
        if (outer >= 0 && outer < W) for (const v of [D - 1, D - 2]) { const [x, z] = F.cell(outer, v); out.blocks.push([x, y, z, 'barrier']); used.add(k(outer, v)); }
        // The top step and the floor beside it: the way off the stairs
        used.add(k(uOf(3), D - 1)); used.add(k(uOf(3), D - 2));
      }
    }
    const put = (item: FurnItem, u: number, v: number, ry: number, cells: [number, number][] = [[u, v]], du2 = 0.5, dv2 = 0.5, solid = true, tint?: number) => {
      if (!cells.every(([a, b]) => free(a, b))) return false;
      // Centre between the cells it fills
      const cs = cells.map(([a, b]) => F.cell(a, b));
      const cx = cs.reduce((s, c) => s + c[0], 0) / cs.length + 0.5, cz = cs.reduce((s, c) => s + c[1], 0) / cs.length + 0.5;
      const [ox, oz] = F.cell(u, v);
      const fx = cs.length > 1 ? cx : ox + du2, fz = cs.length > 1 ? cz : oz + dv2;
      // Rugs lie under things; everything else needs all the floor it reaches, inside the walls
      if (item !== 'rug') {
        const reach = furnCells(item, fx, fz, ry).map((c) => c.join(','));
        if (!reach.every((c) => room.has(c) && !used.has(c))) return false;
        for (const c of reach) used.add(c);
      }
      for (const [a, b] of cells) used.add(k(a, b));
      out.furn.push({ item, x: fx, y, z: fz, ry, tint });
      if (solid) for (const [x, z] of cs) { out.blocks.push([x, y, z, 'barrier']); out.blocks.push([x, y + 1, z, 'barrier']); }
      return true;
    };
    // Back wall pieces sit against the back wall, side pieces against a side wall.
    const backV = D - 1, leftU = 0, rightU = W - 1;
    const awayU = du < W / 2 ? rightU : leftU, nearU = du < W / 2 ? leftU : rightU;
    const towardsAway = du < W / 2 ? facing.right : facing.left; // faces into the room from the near side
    const awayFacing = du < W / 2 ? facing.left : facing.right;
    // A lamp hung in the middle of each storey: from the boards of the floor above, or under the top
    // storey's roof from its beam
    const lc = F.cell(Math.floor(W / 2), Math.floor(D / 2)), hang = f === h.floors - 1 ? 3.9 : 3;
    out.lights.push([lc[0] + 0.5, y + hang - 0.8, lc[1] + 0.5]);
    out.furn.push({ item: 'lamp', x: lc[0] + 0.5, y: y + hang, z: lc[1] + 0.5, ry: 0 });

    const ground = f === 0;
    const topFloor = f === h.floors - 1;
    /** The hearth goes in front of the chimney when it stands in an outside wall. */
    const hearthAtChimney = () => {
      if (!h.chimney) return false;
      const [chx, chz] = h.chimney;
      for (let u = 0; u < W; u++) for (let v = 0; v < D; v++) {
        const [x, z] = F.cell(u, v);
        if (Math.abs(x - chx) + Math.abs(z - chz) !== 1) continue;
        return put('hearth', u, v, ryOf([x - chx, z - chz]), [[u, v]]);
      }
      return false;
    };
    // A house for sale: swept out, the lamp and the hearth left for whoever moves in
    if (role === 'vacant') { if (ground) hearthAtChimney(); continue; }
    if (role === 'inn' && ground) {
      // Bar along the back wall with barrels behind it, tables with benches out front, a hearth on the side
      hearthAtChimney() || put('hearth', awayU, Math.floor(D / 2), awayFacing, [[awayU, Math.floor(D / 2)]]);
      if (W >= 4) for (let u = 0; u + 2 < W; u += 3) if (put('counter', u + 1, backV - (D > 4 ? 1 : 0), facing.front, [[u, backV - (D > 4 ? 1 : 0)], [u + 1, backV - (D > 4 ? 1 : 0)], [u + 2, backV - (D > 4 ? 1 : 0)]])) break;
      if (D > 4) for (let u = 0; u < W; u += 2) put('barrel', u, backV, 0, [[u, backV]], 0.5, 0.5);
      for (let v = 1; v + 1 < D - 1; v += 3) for (let u = 0; u + 1 < W; u += 3) {
        if (u <= du && du <= u + 1) continue;
        if (put('table', u, v, facing.left, [[u, v], [u + 1, v]])) {
          put('bench', u, v + 1, facing.front, [[u, v + 1], [u + 1, v + 1]], 0.5, 0.5, false);
          if (v - 1 >= 0) put('bench', u, v - 1, facing.back, [[u, v - 1], [u + 1, v - 1]], 0.5, 0.5, false);
        }
      }
    } else if (role === 'shop' && ground) {
      const cv = Math.min(D - 2, Math.max(1, Math.floor(D / 2)));
      const cells: [number, number][] = [];
      for (let u = 0; u < W; u++) if (Math.abs(u - du) > 0) cells.push([u, cv]);
      // Counter in two runs either side of the walkway
      const leftRun = cells.filter(([u]) => u < du), rightRun = cells.filter(([u]) => u > du);
      if (leftRun.length >= 2) put('counter', leftRun[0][0], cv, facing.front, leftRun.slice(-3));
      if (rightRun.length >= 2) put('counter', rightRun[0][0], cv, facing.front, rightRun.slice(0, 3));
      for (let u = 0; u < W; u += 2) put('shelves', u, backV, facing.front, [[u, backV]]);
      put('crate', nearU, 0, 0, [[nearU, 0]]);
      put('barrel', awayU, 0, 0, [[awayU, 0]]);
      put('rug', du, cv, facing.front, [[du, cv]], 0.5, 0.5, false, h.tint);
    } else if (role === 'office' && ground) {
      put('desk', Math.max(0, du - 1), backV - (D > 3 ? 1 : 0), facing.front, [[Math.max(0, du - 1), backV - (D > 3 ? 1 : 0)], [Math.max(0, du - 1) + 1, backV - (D > 3 ? 1 : 0)]]);
      put('shelves', awayU, backV, facing.front, [[awayU, backV]]);
      put('shelves', nearU, backV, facing.front, [[nearU, backV]]);
      put('chest', awayU, 1, towardsAway, [[awayU, 1]]);
      put('stool', du, backV - (D > 3 ? 2 : 1), facing.back, [[du, backV - (D > 3 ? 2 : 1)]], 0.5, 0.5, false);
      put('rug', du, Math.floor(D / 2), facing.front, [[du, Math.floor(D / 2)]], 0.5, 0.5, false, h.tint);
    } else if ((role === 'workshop' || role === 'store') && ground) {
      if (role === 'workshop') put('desk', awayU === rightU ? W - 2 : 0, backV, facing.front, [[awayU === rightU ? W - 2 : 0, backV], [awayU === rightU ? W - 1 : 1, backV]]);
      for (let u = 0; u < W; u++) for (let v = 0; v < D; v++) {
        if (Math.abs(u - du) <= 0 || (u > 0 && u < W - 1 && v > 0 && v < D - 1)) continue;
        put(hashi(u + h.x0, v + h.z0) < 0.5 ? 'crate' : 'barrel', u, v, hashi(u, v) * 3, [[u, v]]);
      }
      put('shelves', du === 0 ? 1 : 0, backV, facing.front, [[du === 0 ? 1 : 0, backV]]);
    } else {
      // A home. Ground floor: hearth, table and stools, dresser; beds go upstairs if there is one.
      if (ground) {
        if (!hearthAtChimney()) if (!put('hearth', awayU, backV, awayFacing, [[awayU, backV]])) put('hearth', awayU, Math.max(0, backV - 1), awayFacing, [[awayU, Math.max(0, backV - 1)]]);
        const tv = Math.max(1, Math.min(D - 2, Math.floor(D / 2)));
        let tu = du + 1 < W - 1 ? du + 1 : du - 2;
        if (tu < 0) tu = 0;
        if (W >= 3 && D >= 3 && put('table', tu, tv, facing.front, tu + 1 < W ? [[tu, tv], [tu + 1, tv]] : [[tu, tv]])) {
          put('rug', tu, tv, facing.front, [[tu, tv]], 1, 0.5, false, h.tint);
          put('stool', tu, tv + 1, facing.front, [[tu, tv + 1]], 0.5, 0.35, false);
          put('stool', tu + 1, tv - 1, facing.back, [[tu + 1, tv - 1]], 0.5, 0.65, false);
        }
        put('dresser', nearU, backV, facing.front, [[nearU, backV]]) || put('dresser', nearU, Math.max(0, backV - 1), towardsAway, [[nearU, Math.max(0, backV - 1)]]);
        put('barrel', nearU, 0, 0, [[nearU, 0]]);
        if (seed < 0.5) put('crate', awayU, 0, 0, [[awayU, 0]]);
      }
      if (topFloor || (ground && h.floors === 1)) {
        // Beds along the side walls, heads to the back wall, a chest at the foot
        const bedCells = (u: number): [number, number][] => [[u, backV], [u, backV - 1]];
        if (D >= 3) {
          if (put('bed', awayU, backV - 1, facing.front, bedCells(awayU))) put('chest', awayU, backV - 2, facing.front, [[awayU, backV - 2]]);
          if (!ground && W >= 4) put('bed', nearU, backV - 1, facing.front, bedCells(nearU));
        } else put('chest', awayU, backV, facing.front, [[awayU, backV]]);
        if (!ground) {
          put('dresser', Math.floor(W / 2), backV, facing.front, [[Math.floor(W / 2), backV]]);
          put('rug', Math.floor(W / 2), Math.floor(D / 2), facing.front, [[Math.floor(W / 2), Math.floor(D / 2)]], 0.5, 0.5, false, h.tint);
        }
      }
    }
    if (!ground && role !== 'home') {
      // Upper floors of inns and shops: beds for guests or the family above the shop
      for (let u = 0; u < W; u += 2) if (D >= 3) put('bed', u, backV - 1, facing.front, [[u, backV], [u, backV - 1]]);
      put('chest', du, 0, facing.back, [[du, 0]]);
    }
  }
  // An invisible ceiling over the top floor, where the roof (a model, not blocks) is all there is:
  // it's what tells the game you're indoors up there (windows you can see out of, the camera kept
  // under the beams). Four blocks over the floor, out of reach of a jump.
  for (let z = h.z0 + 1; z < h.z0 + h.d - 1; z++) for (let x = h.x0 + 1; x < h.x0 + h.w - 1; x++) out.blocks.push([x, h.base + h.floors * 4, z, 'barrier']);
  return out;
}

/**
 * The chimney's wall cell: the middle of a gable end (the walls across the ridge), on the end
 * without the door, so the stack rises past the gable and the hearth stands inside against it.
 */
export function chimneyCell(h: Pick<HouseShape, 'x0' | 'z0' | 'w' | 'd' | 'door'>): [number, number] {
  const { x0, z0, w, d } = h;
  const alongX = w >= d; // the ridge runs along the longer side
  if (alongX) return h.door === 'w' ? [x0 + w - 1, z0 + Math.floor(d / 2)] : [x0, z0 + Math.floor(d / 2)];
  return h.door === 'n' ? [x0 + Math.floor(w / 2), z0 + d - 1] : [x0 + Math.floor(w / 2), z0];
}

/** Where the open door leaf stands: against the jamb, swung into the room. */
export function openDoorPlace(h: HouseShape): { x: number; z: number; ry: number } {
  const F = frame(h);
  const [nx, nz] = F.out;
  // Tangent along the wall, and the hinge side: the jamb nearer the house's corner
  const tx = -nz, tz = nx;
  const cx = h.doorX + 0.5, cz = h.doorZ + 0.5;
  return { x: cx + tx * 0.42 - nx * 0.5, z: cz + tz * 0.42 - nz * 0.5, ry: Math.atan2(nx, nz) };
}
