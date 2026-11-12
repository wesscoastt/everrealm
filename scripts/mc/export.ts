// The owner's Minecraft city (Bedrock: "Shiesty Craft Medieval"), brought into the game as an island off the
// west coast of the Counties (owner 2026-11-05). Reads the world (scripts/mc/leveldb.ts, bedrock.ts), turns
// a rectangle of it (the walled city, its farms and the houses round it) the right way round into the open sea
// south-west of the Counties, maps every Minecraft block to the nearest of the game's, and
// writes one small compressed file per game chunk (public/mcland/), streamed in by the world worker
// (world/mcland.ts), and a coarse height map for the map, the far terrain and anything that asks heightAt.
//
//   npx tsx scripts/mc/export.ts "<world>/db"
//
// The edges of the rectangle go down to the sea in a beach, except where something's built there.
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { readDb } from './leveldb';
import { NbtReader, readSubChunk, type Nbt, type Palette } from './bedrock';
import { B } from '../../src/world/blocks';
import { MC_CELL, MC_PIECES } from '../../src/world/mclandArea';
import { EDITS } from './edits';

const dir = process.argv[2];
const SY = 112, SEA = 16, CHUNK = 32; // (as world/VoxelWorld.ts)
/** The open sea's floor round the owner's land (world/terrain.ts regionHeight, 'verandah'). */
const SEA_FLOOR = SEA - 9;
import { facingOf, mapBlock, propOf, SOLID_ITEM, SOLID_T, unknown } from './blockmap';

// ---------------------------------------------------------------- each piece
const BUILT = new Set<number>([B.Planks, B.DarkPlanks, B.Timber, B.StoneBrick, B.MossyStone, B.Cobble, B.MossyCobble, B.RedBrick, B.Window, B.Plaster, B.BluePlaster, B.RosePlaster, B.OchrePlaster, B.Whitestone, B.Blackstone, B.Flagstone, B.Sandstone, B.TerraOrange, B.TerraCream, B.TerraBrown, B.Wool, B.Hay, B.Glowcap, B.Path, B.Brass, B.Copper]);
const out = path.resolve('public/mcland');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const heightMaps: { id: string; w: number; d: number; b64: string }[] = [];
/** Every chunk's columns, gathered over all the pieces before they're written. */
const chunkFiles = new Map<string, number[][]>();
/** The trees to fell, by the chunk their trunk stands in: [kind, logs, lx, y, lz, trunk count (2 bytes), trunk (dx+128, y, dz+128)..., leaf count (2 bytes), leaves (dx+128, y, dz+128, block)...]. */
const chunkTrees = new Map<string, number[][]>();
/** Every sign kept, in game coordinates: where, which way it faces, what kind, and its words. */
const signs: { x: number; y: number; z: number; ry: number; kind: number; text: string }[] = [];
/** The waystones (an add-on's travel stones), each by its lowest block, in game coordinates: the game's waymarks go there. */
const stones = new Map<string, { x: number; y: number; z: number; piece: string; name?: string; mc: [number, number, number] }>();
/** The small things (torches, lanterns, doors, furniture), in game coordinates: [kind, x, y, z, facing, item or h]. */
const things: (string | number)[][] = [];
/** The houses found behind the owner's doors (a roofed room on one side of a door), in game coordinates: [x0, z0, x1, z1, floor, door x, door z, floor area]. */
const houses: number[][] = [];
for (const piece of MC_PIECES) {
  const { mx0, mz0, mx1, mz1, gx0, gz0, yOff } = piece;
  const W = mx1 - mx0 + 1, D = mz1 - mz0 + 1;
  const cx0 = Math.floor(mx0 / 16), cz0 = Math.floor(mz0 / 16), cx1 = Math.floor(mx1 / 16), cz1 = Math.floor(mz1 / 16);
  const sy0 = Math.floor(-yOff / 16), sy1 = Math.floor((SY - 1 - yOff) / 16);
  const t0 = Date.now();
  /** Where this piece's things start in `things`. */
  const thingsFrom = things.length;
  const db = readDb(dir, (k) => {
    if (k.length !== 10 || k[8] !== 0x2f) return false;
    const x = k.readInt32LE(0), z = k.readInt32LE(4), y = k.readInt8(9);
    if (x < cx0 || x > cx1 || z < cz0 || z > cz1) return false;
    // (a splice reads higher: what's above it comes down)
    const tall = (piece.splices ?? []).some((s) => x * 16 + 15 >= s.x0 && x * 16 <= s.x1 && z * 16 + 15 >= s.z0 && z * 16 <= s.z1);
    return y >= sy0 && y <= (tall ? 20 : sy1);
  });
  console.log(piece.id + ': read', db.size, 'sub-chunks in', Date.now() - t0, 'ms');
  /** The sign blocks met (their facing is in their states), by Minecraft x,y,z: the words are in the block entities. */
  const signBlocks = new Map<string, { p: Palette; gy: number }>();
  const rot = piece.rot ?? 0;
  /** Minecraft x, z to the game's: straight, or a quarter turn clockwise (north to east, east to south). */
  const toGame = (x: number, z: number): [number, number] => rot ? [gx0 + (D - 1 - (z - mz0)), gz0 + (x - mx0)] : [gx0 + (x - mx0), gz0 + (z - mz0)];
  /** The game's x, z to the grid's column (ix along Minecraft x, iz along z), or null off the piece. */
  const toGrid = (gx: number, gz: number): [number, number] | null => { const ix = rot ? gz - gz0 : gx - gx0, iz = rot ? D - 1 - (gx - gx0) : gz - gz0; return ix < 0 || iz < 0 || ix >= W || iz >= D ? null : [ix, iz]; };
  const turnRy = (ry: number) => (rot ? ry - Math.PI / 2 : ry);
  // the blocks, in game ids: [mcX - mx0][mcZ - mz0][game y]
  const grid = new Uint8Array(W * D * SY);
  const gi = (ix: number, iz: number, y: number) => (ix * D + iz) * SY + y;
  const cache = new Map<string, number>();
  /** The Minecraft chunks that have anything saved; and the blocks a snow layer lay on (they turn to snowy ground). */
  const saved = new Set<string>(), snowy: number[] = [], hedges: number[] = [];
  /** The doors met: their place in `things`, and their grid column and height. */
  const doorways: { k: number; ix: number; iz: number; gy: number }[] = [];
  /** The fences met. */
  const fences: { ix: number; iz: number; gy: number; mx: number; mz: number }[] = [];
  /** The trapdoors met, and where the ladders are (a trapdoor over a ladder is a cellar's hatch). */
  const traps: { ix: number; iz: number; gy: number; mx: number; mz: number; ry: number }[] = [];
  const ladderCells = new Set<string>();
  for (const [k, e] of db) {
    if (!e.value) continue;
    const b = Buffer.from(k, 'latin1');
    const scx = b.readInt32LE(0), scz = b.readInt32LE(4), scy = b.readInt8(9);
    const sc = readSubChunk(e.value);
    if (!sc) continue;
    const ids = sc.palette.map((p) => { const key = p.name + JSON.stringify(p.states); let v = cache.get(key); if (v === undefined) { v = mapBlock(p); cache.set(key, v); } return v; });
    const signAt = sc.palette.map((p) => /sign/.test(p.name) ? p : null);
    const wsAt = sc.palette.map((p) => /waystone/.test(p.name));
    const snowAt = sc.palette.map((p) => /^minecraft:snow_layer$/.test(p.name));
    const trapAt = sc.palette.map((p) => (/trapdoor/.test(p.name) ? facingOf(p.states) : null));
    const ladderAt = sc.palette.map((p) => /^minecraft:ladder$/.test(p.name));
    const fenceAt = sc.palette.map((p) => /fence$/.test(p.name) && !/gate/.test(p.name));
    const placedLeaf = sc.palette.map((p) => /leaves/.test(p.name) && (p.states.persistent_bit === 1 || p.states.persistent_bit === true || p.states['ecbl_bc:place_by_player'] === 1));
    saved.add(scx + ',' + scz);
    const propAt = sc.palette.map((p) => { const pr = propOf(p); return pr ? { ...pr, ry: facingOf(p.states) } : null; });
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      const mx = scx * 16 + lx, mz = scz * 16 + lz;
      if (mx < mx0 || mx > mx1 || mz < mz0 || mz > mz1) continue;
      const sp = (piece.splices ?? []).find((s) => mx >= s.x0 && mx <= s.x1 && mz >= s.z0 && mz <= s.z1);
      for (let ly = 0; ly < 16; ly++) {
        let my = scy * 16 + ly;
        if (sp) { if (my >= sp.from && my <= sp.to) continue; if (my > sp.to) my -= sp.to - sp.from + 1; }
        const gy = my + yOff;
        if (gy < 0 || gy >= SY) continue;
        const i = lx * 256 + lz * 16 + ly;
        let id = ids[sc.idx[i]];
        const sgn = signAt[sc.idx[i]];
        if (sgn) signBlocks.set(`${mx},${scy * 16 + ly},${mz}`, { p: sgn, gy });
        const pr = propAt[sc.idx[i]];
        if (pr && (SOLID_T.has(pr.t) || (pr.t === 'furn' && SOLID_ITEM.has(pr.item ?? '')))) id = B.Barrier;
        if (pr) { const [tx, tz] = toGame(mx, mz); if (pr.t === 'door' || pr.t === 'mcgate') doorways.push({ k: things.length, ix: mx - mx0, iz: mz - mz0, gy }); things.push([pr.t, tx + 0.5, gy, tz + 0.5, Math.round(turnRy(pr.ry) * 100) / 100, pr.item ?? pr.h ?? 0]); }
        if (wsAt[sc.idx[i]]) { const [wx, wz] = toGame(mx, mz); const k2 = wx + ',' + wz; const had = stones.get(k2); if (!had || had.y > gy) stones.set(k2, { x: wx + 0.5, y: gy, z: wz + 0.5, piece: piece.id, mc: [mx, scy * 16 + ly, mz] }); }
        if (id === B.Air && sc.water && sc.water[i]) id = B.Water;
        if (snowAt[sc.idx[i]] && gy > 0) snowy.push(gi(mx - mx0, mz - mz0, gy - 1));
        if (trapAt[sc.idx[i]] !== null) traps.push({ ix: mx - mx0, iz: mz - mz0, gy, mx, mz, ry: trapAt[sc.idx[i]]! });
        if (ladderAt[sc.idx[i]]) ladderCells.add(mx + ',' + gy + ',' + mz);
        if (fenceAt[sc.idx[i]]) fences.push({ ix: mx - mx0, iz: mz - mz0, gy, mx, mz });
        if (placedLeaf[sc.idx[i]]) hedges.push(gi(mx - mx0, mz - mz0, gy));
        if (id !== B.Air) grid[gi(mx - mx0, mz - mz0, gy)] = id;
      }
    }
  }
  db.clear();
  const gates = new Set<number>();
  // A trapdoor over a ladder: a hatch, stood open, the way down clear (owner 2026-11-05: "my cellar trapdoors are wood blocks")
  for (const t of traps) {
    if (!ladderCells.has(t.mx + ',' + (t.gy - 1) + ',' + t.mz) && !ladderCells.has(t.mx + ',' + (t.gy - 2) + ',' + t.mz)) continue;
    grid[gi(t.ix, t.iz, t.gy)] = B.Air;
    const [tx, tz] = toGame(t.mx, t.mz);
    things.push(['mchatch', tx + 0.5, t.gy, tz + 0.5, Math.round(turnRy(t.ry) * 100) / 100, 0]);
  }
  // Each door turned to swing across its doorway: walls either side along Minecraft x, the way through is along z
  {
    // (the other leaf of a double door counts as wall: owner 2026-11-06, double doors turned across their doorway)
    const leaves = new Set(doorways.map((d) => d.ix + ',' + d.iz + ',' + d.gy));
    const solid = (ix: number, iz: number, y: number) => leaves.has(ix + ',' + iz + ',' + y) || (ix >= 0 && iz >= 0 && ix < W && iz < D && grid[gi(ix, iz, y)] !== B.Air && grid[gi(ix, iz, y)] !== B.Water);
    for (const d of doorways) {
      const wallsX = solid(d.ix - 1, d.iz, d.gy) && solid(d.ix + 1, d.iz, d.gy), wallsZ = solid(d.ix, d.iz - 1, d.gy) && solid(d.ix, d.iz + 1, d.gy);
      const alongZ = wallsX || !wallsZ;
      // Minecraft +x is the game's +z on a turned piece, and +z its -x
      const ry = rot ? (alongZ ? -Math.PI / 2 : 0) : (alongZ ? 0 : Math.PI / 2);
      if (things[d.k][0] === 'mcgate') gates.add(gi(d.ix, d.iz, d.gy));
      things[d.k][0] = things[d.k][0] === 'mcgate' ? 'mcgate' : 'mcdoor'; things[d.k][4] = Math.round(ry * 100) / 100;
    }
    // The fences: each post's rails toward what it joins (another fence, a gate, a wall), in the game's directions;
    // and the invisible wall half a block higher, as a fence is (no stepping over it)
    const joins = (ix: number, iz: number, y: number) => { if (ix < 0 || iz < 0 || ix >= W || iz >= D) return false; const i = gi(ix, iz, y), id = grid[i]; return gates.has(i) || (id !== B.Air && id !== B.Water && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves); };
    for (const f of fences) {
      // Minecraft +x, -x, +z, -z to the game's bits (1 +x, 2 -x, 4 +z, 8 -z): a turned piece's +x is the game's +z, its +z the game's -x
      const m = [joins(f.ix + 1, f.iz, f.gy), joins(f.ix - 1, f.iz, f.gy), joins(f.ix, f.iz + 1, f.gy), joins(f.ix, f.iz - 1, f.gy)];
      const mask = rot ? (m[0] ? 4 : 0) | (m[1] ? 8 : 0) | (m[2] ? 2 : 0) | (m[3] ? 1 : 0) : (m[0] ? 1 : 0) | (m[1] ? 2 : 0) | (m[2] ? 4 : 0) | (m[3] ? 8 : 0);
      const [tx, tz] = toGame(f.mx, f.mz);
      things.push(['mcfence', tx + 0.5, f.gy, tz + 0.5, 0, mask]);
      if (f.gy + 1 < SY && grid[gi(f.ix, f.iz, f.gy + 1)] === B.Air) grid[gi(f.ix, f.iz, f.gy + 1)] = B.Barrier;
    }
  }
  // The houses: from each door, the room on its inside, a floor you can walk across with a roof over all of
  // it, closed in all round (owner 2026-11-05: "allow the exterior homes in Verandah to be purchased")
  {
    const seen = new Set<number>();
    const walk = (ix: number, iz: number, y: number) => { if (ix < 0 || iz < 0 || ix >= W || iz >= D || y < 1 || y + 1 >= SY) return false; const a = grid[gi(ix, iz, y)], b = grid[gi(ix, iz, y + 1)]; return (a === B.Air || a === B.Barrier) && (b === B.Air || b === B.Barrier) && grid[gi(ix, iz, y - 1)] !== B.Air && grid[gi(ix, iz, y - 1)] !== B.Water; };
    const roofed = (ix: number, iz: number, y: number) => { for (let k = y + 2; k < Math.min(SY, y + 10); k++) { const id = grid[gi(ix, iz, k)]; if (id !== B.Air && id !== B.Barrier && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves) return true; } return false; };
    for (const d of doorways) {
      if (things[d.k][0] !== 'mcdoor') continue;
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x0 = d.ix + sx, z0 = d.iz + sz;
        if (!walk(x0, z0, d.gy) || seen.has(x0 * D + z0 + d.gy * W * D)) continue;
        const q: number[] = [x0 * D + z0], got = new Set<number>(q);
        let ok = true;
        for (let h = 0; h < q.length && ok; h++) {
          const c = q[h], cx = Math.floor(c / D), cz = c % D;
          if (!roofed(cx, cz, d.gy)) { ok = false; break; }
          for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + ax, nz = cz + az, k = nx * D + nz;
            if (got.has(k) || (nx === d.ix && nz === d.iz) || !walk(nx, nz, d.gy)) continue;
            got.add(k); q.push(k);
            if (q.length > 700) { ok = false; break; }
          }
        }
        if (!ok || q.length < 9) continue;
        for (const c of q) seen.add(c + d.gy * W * D);
        let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        for (const c of q) { const [gx, gz] = toGame(mx0 + Math.floor(c / D), mz0 + (c % D)); a0 = Math.min(a0, gx); a1 = Math.max(a1, gx); b0 = Math.min(b0, gz); b1 = Math.max(b1, gz); }
        const [dx, dz] = toGame(mx0 + d.ix, mz0 + d.iz);
        if (piece.id === 'city') houses.push([a0, b0, a1, b1, d.gy, dx, dz, q.length]);
      }
    }
    console.log(piece.id + ':', houses.length, 'rooms behind doors so far');
  }
  // The snow country made green like the rest (owner 2026-11-05: "make the snow biome grassy to match the
  // rest"): the snow layers go, a snow block on top turns to grass and under that to earth, the ice to water
  void snowy;
  for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
    let open = true;
    for (let y = SY - 1; y >= 0; y--) {
      const i = gi(ix, iz, y), id = grid[i];
      if (id === B.Snow || id === B.SnowGrass) { const under = y > 0 ? grid[i - 1] : B.Stone; grid[i] = open && (under === B.Water || under === B.Ice) ? (y < SEA ? B.Water : B.Air) : open ? B.Grass : B.Dirt; if (grid[i] === B.Air) continue; }
      // the ice melts all the way down, and what stood above the sea goes (owner 2026-11-06: "all the ice and melted
      // water still all over in the ocean, remove it all"): water left above the sea's level floated over it
      else if (id === B.Ice) { grid[i] = y < SEA ? B.Water : B.Air; continue; }
      if (id !== B.Air) open = false;
    }
  }
  // Chunks Minecraft never saved (a few, at the edge of what the owner explored): the ground round them carried
  // in, a column at a time from the nearest saved one, its height and its top (no buildings, no trees)
  {
    const NATTOP = new Set<number>([B.Grass, B.FlowerGrass, B.Dirt, B.Loam, B.Snow, B.SnowGrass, B.Sand, B.Stone, B.Gravel, B.Granite, B.Water, B.Clay]);
    const gnd = new Int16Array(W * D).fill(-1), topId = new Uint8Array(W * D), q: number[] = [];
    let holes = 0;
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const c = ix + iz * W;
      if (!saved.has(Math.floor((mx0 + ix) / 16) + ',' + Math.floor((mz0 + iz) / 16))) { holes++; continue; }
      for (let y = SY - 1; y >= 0; y--) { const id = grid[gi(ix, iz, y)]; if (NATTOP.has(id)) { gnd[c] = y; topId[c] = id; q.push(c); break; } }
    }
    for (let h = 0; h < q.length; h++) {
      const c = q[h], x = c % W, z = (c / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue;
        const j = xx + zz * W; if (gnd[j] >= 0 || saved.has(Math.floor((mx0 + xx) / 16) + ',' + Math.floor((mz0 + zz) / 16))) continue;
        gnd[j] = gnd[c]; topId[j] = topId[c]; q.push(j);
        const top = gnd[j], id = topId[j];
        for (let y = 0; y < SY; y++) grid[gi(xx, zz, y)] = y < top - 3 ? B.Stone : y < top ? (id === B.Sand ? B.Sand : id === B.Water ? B.Sand : B.Dirt) : y === top ? (id === B.Water ? B.Water : id) : y < SEA ? B.Water : B.Air;
      }
    }
    if (holes) console.log(piece.id + ':', holes, 'columns in chunks never saved, filled from the ground round them');
  }
  // The owner's changes to this piece (scripts/mc/edits.ts), in Minecraft coordinates
  const edit = EDITS[piece.id];
  if (edit) {
    const at = (x: number, y: number, z: number) => { const ix = x - mx0, iz = z - mz0, gy = y + yOff; return ix < 0 || iz < 0 || ix >= W || iz >= D || gy < 0 || gy >= SY ? -1 : gi(ix, iz, gy); };
    const set = (x: number, y: number, z: number, id: number) => { const i = at(x, y, z); if (i >= 0) grid[i] = id; };
    edit({
      get: (x, y, z) => { const i = at(x, y, z); return i < 0 ? B.Air : grid[i]; },
      set,
      fill: (x0, y0, z0, x1, y1, z1, id) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id); },
      swap: (x0, y0, z0, x1, y1, z1, from, to) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const i = at(x, y, z); if (i >= 0 && from.includes(grid[i])) grid[i] = to; } },
    });
    console.log(piece.id + ': edited (scripts/mc/edits.ts)');
  }
  // The signs' words: block entities (key type 0x31), each a run of NBT compounds
  const ents = readDb(dir, (k) => k.length === 9 && k[8] === 0x31 && k.readInt32LE(0) >= cx0 && k.readInt32LE(0) <= cx1 && k.readInt32LE(4) >= cz0 && k.readInt32LE(4) <= cz1);
  const words = new Map<string, string>();
  for (const [, e] of ents) {
    if (!e.value) continue;
    const r = new NbtReader(e.value);
    while (r.p < e.value.length) {
      let t: Record<string, Nbt>;
      try { t = r.read() as Record<string, Nbt>; } catch { break; }
      if (!/sign/i.test(String(t.id))) continue;
      const front = (t.FrontText as Record<string, Nbt> | undefined)?.Text ?? t.Text ?? '';
      const back = (t.BackText as Record<string, Nbt> | undefined)?.Text ?? '';
      const text = String(front || back).replace(/§./g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
      if (text) words.set(`${t.x},${t.y},${t.z}`, text);
    }
  }
  let nSigns = 0;
  for (const [k, sb] of signBlocks) {
    const text = words.get(k);
    if (!text || sb.gy < 0 || sb.gy >= SY) continue;
    // (Minecraft's own contraptions go unsigned: owner 2026-11-05, "remove anything that says XP farm")
    // (and the price boards: the stables' horses and the house for sale are sold in the game's own way)
    if (/xp\s*farm|work\s*in\s*progress|snow\s*village|shiesty\s*airport|horses\s*\d+|for\s*sale/i.test(text.split(String.fromCharCode(10)).join(' '))) continue;
    const [x, , z] = k.split(',').map(Number);
    const st = sb.p.states, n = sb.p.name;
    const kind = /hanging/.test(n) ? 2 : /wall/.test(n) ? 1 : 0;
    // facing: a standing sign's sixteen points from south, clockwise (west at 4); a wall sign's 2 north, 3 south, 4 west, 5 east
    let ry = 0;
    if (kind === 1 || (kind === 2 && st.facing_direction !== undefined)) { const f = Number(st.facing_direction ?? 3); ry = f === 2 ? Math.PI : f === 4 ? -Math.PI / 2 : f === 5 ? Math.PI / 2 : 0; }
    else ry = -Number(st.ground_sign_direction ?? 0) * Math.PI / 8;
    const [sgx, sgz] = toGame(x, z);
    signs.push({ x: sgx + 0.5, y: sb.gy, z: sgz + 0.5, ry: Math.round(turnRy(ry) * 1000) / 1000, kind, text, piece: piece.id } as never);
    nSigns++;
  }
  console.log(piece.id + ':', nSigns, 'signs with words');
  // an island: its own land, what's built within reach of its shore, and the sea; anything else goes under
  if (piece.island) {
    const NAT = new Set<number>([B.Grass, B.Dirt, B.Loam, B.Sand, B.RedSand, B.Gravel, B.Stone, B.Granite, B.DeepStone, B.Snow, B.Ice, B.Clay, B.Farmland, B.Path, B.Basalt]);
    // each column: 2 land (natural ground under whatever's built), 1 water, 0 neither
    const kind = new Uint8Array(W * D), ground = new Int16Array(W * D);
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      for (let y = SY - 1; y >= 0; y--) { const id = grid[gi(ix, iz, y)]; if (id === B.Water) { kind[ix + iz * W] = 1; ground[ix + iz * W] = y; break; } if (NAT.has(id)) { kind[ix + iz * W] = 2; ground[ix + iz * W] = y; break; } }
    }
    const isl = new Uint8Array(W * D), q: number[] = [];
    const s0 = (piece.island.x - mx0) + (piece.island.z - mz0) * W; isl[s0] = 1; q.push(s0);
    while (q.length) { const i = q.pop()!; const x = i % W, z = (i / W) | 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (!isl[j] && kind[j] === 2) { isl[j] = 1; q.push(j); } } }
    // how far each column is from the island's shore (out to its reach)
    const dist = new Uint16Array(W * D).fill(65535), bq: number[] = [];
    for (let i = 0; i < W * D; i++) if (isl[i]) { dist[i] = 0; bq.push(i); }
    for (let h = 0; h < bq.length; h++) { const i = bq[h], x = i % W, z = (i / W) | 0; if (dist[i] >= piece.island.reach) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (dist[j] === 65535) { dist[j] = dist[i] + 1; bq.push(j); } } }
    let sunk = 0;
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const i = ix + iz * W;
      if (isl[i]) continue;
      const near = dist[i] <= piece.island.reach;
      if (near && kind[i] !== 2) continue; // the sea by the shore, and what's built on it
      // other land, or the open sea past the docks: sea bed and water, nothing standing on it
      sunk++;
      const bed = kind[i] === 1 ? Math.min(SEA - 4, ground[i]) : SEA_FLOOR;
      for (let y = 0; y < SY; y++) grid[gi(ix, iz, y)] = y <= bed ? (y === bed ? B.Sand : B.Stone) : y < SEA ? B.Water : B.Air;
      // (the open sea keeps its own floor and its water; only what stood on it goes)
      if (kind[i] === 1) for (let y = 0; y <= ground[i]; y++) if (grid[gi(ix, iz, y)] === B.Air) grid[gi(ix, iz, y)] = B.Water;
    }
    console.log(piece.id + ': island', isl.reduce((a, b) => a + b, 0), 'columns; sunk', sunk);
  }
  // a natural edge: the land kept where anything's built (and round it), then falling away in a coast of its
  // own, irregular as a real one, to the open sea before the rectangle's edges are reached
  if (piece.natural) {
    const NAT = new Set<number>([B.Grass, B.Dirt, B.Loam, B.Sand, B.RedSand, B.Gravel, B.Stone, B.Granite, B.DeepStone, B.Snow, B.Ice, B.Clay, B.Basalt, B.OakLog, B.BirchLog, B.PineLog, B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.Water, B.Glowcap]);
    const src = new Uint8Array(W * D), surf = new Int16Array(W * D), wet = new Uint8Array(W * D);
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const i = ix + iz * W;
      for (let y = SY - 1; y >= SEA; y--) { const id = grid[gi(ix, iz, y)]; if (id !== B.Air && !NAT.has(id)) { src[i] = 1; break; } }
      for (let y = SY - 1; y >= 0; y--) { const id = grid[gi(ix, iz, y)]; if (id !== B.Air && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves && id !== B.OakLog && id !== B.BirchLog && id !== B.PineLog) { surf[i] = y; wet[i] = id === B.Water ? 1 : 0; break; } }
    }
    const dist = new Float32Array(W * D).fill(1e9), bq: number[] = [];
    for (let i = 0; i < W * D; i++) if (src[i]) { dist[i] = 0; bq.push(i); }
    for (let h = 0; h < bq.length; h++) { const i = bq[h], x = i % W, z = (i / W) | 0; if (dist[i] > 200) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; bq.push(j); } } }
    const { keep, fade } = piece.natural;
    const wob = (x: number, z: number) => (Math.sin(x * 0.043 + 1.7) + Math.sin(z * 0.051 + 0.3) + Math.sin((x + z) * 0.027 + 2.1) + Math.sin((x - z) * 0.071)) / 4;
    let sea = 0;
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const i = ix + iz * W, d = piece.natural.whole ? 0 : dist[i];
      const edgeRoom = Math.min(ix, iz, W - 1 - ix, D - 1 - iz);
      const R = piece.natural.whole ? edgeRoom - fade - 6 + wob(ix * 1.7, iz * 1.7) * 14 : Math.min(keep + wob(ix, iz) * keep * 0.45, edgeRoom - fade - 4);
      if (piece.natural.whole ? R >= 0 : d <= R) continue;
      // (all the way down to the world's own sea floor by the rectangle's edge, so the sea round it runs on
      // without a step or a shelf of sand: owner 2026-11-05, "no sand bars, blend seamless into the world water")
      const t = Math.min(1, Math.max(piece.natural.whole ? -R / fade : (d - R) / fade, 1 - edgeRoom / 10));
      const top = surf[i];
      let base = top;
      if (wet[i]) while (base > 0 && grid[gi(ix, iz, base)] === B.Water) base--;
      const want = Math.round(base + (SEA_FLOOR - base) * t);
      for (let y = 0; y < SY; y++) {
        const at = gi(ix, iz, y);
        if (y > want) grid[at] = y < SEA ? B.Water : B.Air;
        else if (y === want) grid[at] = want <= SEA ? B.Sand : (grid[at] === B.Air || grid[at] === B.Water ? B.Grass : grid[at] === B.Stone && t > 0.3 ? B.Gravel : grid[at]);
        else if (grid[at] === B.Air || grid[at] === B.Water) grid[at] = B.Stone;
      }
      if (want < SEA) sea++;
    }
    console.log(piece.id + ': natural coast,', sea, 'columns given to the sea');
  }
  // the edges: down to the sea in a beach, unless something's built there (not for an island: its own coast is kept)
  const EDGE = Math.min(36, Math.floor(Math.min(W, D) / 5));
  if (!piece.island && !piece.natural) for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
    const d = Math.min(ix, iz, W - 1 - ix, D - 1 - iz);
    if (d >= EDGE) continue;
    let built = false;
    for (let y = SEA; y < SY && !built; y++) if (BUILT.has(grid[gi(ix, iz, y)])) built = true;
    if (built) continue;
    const cap = Math.floor(SEA - 3 + (d / EDGE) * 14);
    for (let y = 0; y < SY; y++) {
      const at = gi(ix, iz, y);
      if (y > cap) grid[at] = y < SEA ? B.Water : B.Air;
      else if (y === cap && grid[at] !== B.Air && grid[at] !== B.Water) grid[at] = cap < SEA + 1 ? B.Sand : grid[at];
    }
  }
  // Things left with nothing under or over them (where the coast was let down to the sea): gone with the ground
  {
    let gone = 0;
    for (let k = things.length - 1; k >= thingsFrom; k--) {
      const t = things[k], at = toGrid(Math.floor(+t[1]), Math.floor(+t[3]));
      if (!at) continue;
      const y = +t[2];
      let near = false;
      // (anything solid within three blocks up or down, in its own column or the ones beside it: a ladder's wall counts)
      for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) for (let dz = -1; dz <= 1 && !near; dz++) {
        const yy = y + dy, cx = at[0] + dx, cz = at[1] + dz;
        if ((dx || dz || dy) && yy >= 0 && yy < SY && cx >= 0 && cz >= 0 && cx < W && cz < D) { const id = grid[gi(cx, cz, yy)]; if (id !== B.Air && id !== B.Water) near = true; }
      }
      if (!near) { things.splice(k, 1); gone++; continue; }
      // a hanging lantern's chain, up to what it hangs from (1 + its length: 'floating lights' otherwise)
      if (t[0] === 'mclantern' && +t[5] >= 1) { let n = 0; while (n < 8 && y + 1 + n < SY && grid[gi(at[0], at[1], y + 1 + n)] === B.Air) n++; t[5] = 1 + (n < 8 ? n : 0); }
    }
    if (gone) console.log(piece.id + ':', gone, 'things left floating where the coast went, taken away');
    // A ladder that stops short of the floor above it (two blocks or more to climb off): carried on up to that
    // floor (owner 2026-11-05: "I got stuck down here under my house")
    const lad = new Set<string>();
    for (let k = thingsFrom; k < things.length; k++) if (things[k][0] === 'mcladder') lad.add(Math.floor(+things[k][1]) + ',' + things[k][2] + ',' + Math.floor(+things[k][3]));
    const open = (gx: number, y: number, gz: number) => { const c = toGrid(gx, gz); return !!c && y >= 0 && y < SY && grid[gi(c[0], c[1], y)] === B.Air; };
    const floorAt = (gx: number, y: number, gz: number) => { const c = toGrid(gx, gz); return !!c && y > 0 && y < SY && grid[gi(c[0], c[1], y - 1)] !== B.Air && grid[gi(c[0], c[1], y - 1)] !== B.Water && open(gx, y, gz) && open(gx, y + 1, gz); };
    let added = 0;
    const tops = things.slice(thingsFrom).filter((t) => t[0] === 'mcladder' && !lad.has(Math.floor(+t[1]) + ',' + (+t[2] + 1) + ',' + Math.floor(+t[3])));
    for (const t of tops) {
      const gx = Math.floor(+t[1]), gz = Math.floor(+t[3]);
      let y = +t[2];
      const landing = (yy: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => floorAt(gx + dx, yy, gz + dz));
      // already within a step of a floor: fine
      if (landing(y + 1) || landing(y + 2)) continue;
      for (let n = 0; n < 4 && open(gx, y + 1, gz); n++) {
        y++; things.push(['mcladder', t[1], y, t[3], t[4], 0]); added++;
        if (landing(y + 1)) break;
      }
    }
    if (added) console.log(piece.id + ':', added, 'rungs added where ladders stopped short');
  }
  // The trees. Leaves with no trunk within six blocks go (no crowns left floating where a trunk was cut or sunk);
  // then every tree standing on the ground, its trunk touching nothing built, becomes one to fell: its trunk and
  // the leaves nearest it, written after the chunk's columns (world/mcland.ts reads them as the game's trees)
  {
    const LOG = new Set<number>([B.OakLog, B.BirchLog, B.PineLog]);
    const LEAF = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves]);
    const GROUND = new Set<number>([B.Grass, B.Dirt, B.Loam, B.Snow, B.SnowGrass, B.Sand, B.Stone, B.Gravel, B.Granite, B.Clay, B.FlowerGrass, B.Farmland, B.Path]);
    const N = W * D * SY, mark = new Uint8Array(N);
    const S6 = [SY, -SY, D * SY, -D * SY, 1, -1];
    const ok = (i: number, s: number) => { const y = i % SY, c = (i - y) / SY, iz = c % D, ix = (c - iz) / D; return s === 1 ? y < SY - 1 : s === -1 ? y > 0 : s === SY ? iz < D - 1 : s === -SY ? iz > 0 : s === D * SY ? ix < W - 1 : ix > 0; };
    let q: number[] = [];
    for (let i = 0; i < N; i++) if (LOG.has(grid[i])) { mark[i] = 1; q.push(i); }
    for (const i of hedges) if (LEAF.has(grid[i]) && !mark[i]) { mark[i] = 1; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h]; if (mark[i] > 6) continue; for (const s of S6) { if (!ok(i, s)) continue; const j = i + s; if (!mark[j] && LEAF.has(grid[j])) { mark[j] = mark[i] + 1; q.push(j); } } }
    let dropped = 0;
    for (let i = 0; i < N; i++) if (!mark[i] && LEAF.has(grid[i])) { grid[i] = B.Air; dropped++; }
    // the trees: logs joined (corners too), on the ground, with leaves, nothing built against them
    mark.fill(0); q = [];
    const found: { logs: number[]; kind: string; leaves: number[] }[] = [];
    const S26: number[] = []; for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) if (a || b || c) S26.push(a * D * SY + b * SY + c);
    const xyz = (i: number) => { const y = i % SY, c = (i - y) / SY, iz = c % D; return [(c - iz) / D, y, iz]; };
    for (let i = 0; i < N; i++) {
      if (mark[i] || !LOG.has(grid[i])) continue;
      const comp = [i]; mark[i] = 1;
      let leafy = false, built = false;
      for (let h = 0; h < comp.length && comp.length <= 400; h++) {
        const k = comp[h], [kx, ky, kz] = xyz(k);
        for (const s of S26) {
          const j = k + s, [jx, jy, jz] = xyz(j);
          if (j < 0 || j >= N || Math.abs(jx - kx) > 1 || Math.abs(jz - kz) > 1 || Math.abs(jy - ky) > 1) continue;
          const id = grid[j];
          if (LOG.has(id)) { if (!mark[j]) { mark[j] = 1; comp.push(j); } }
          else if (LEAF.has(id)) leafy = true;
          else if (BUILT.has(id) && Math.abs(s) !== 1 && (jy === ky)) built = true;
        }
      }
      if (!leafy || built || comp.length > 400) continue;
      comp.sort((a, b) => a % SY - b % SY);
      const base = comp[0];
      if (base % SY === 0 || !GROUND.has(grid[base - 1])) continue;
      const n = (id: number) => comp.filter((c) => grid[c] === id).length;
      const kind = n(B.BirchLog) > comp.length / 2 ? 'birch' : n(B.PineLog) > comp.length / 2 ? 'pine' : comp.length >= 30 ? 'giant' : 'oak';
      found.push({ logs: comp, kind, leaves: [] });
    }
    // each leaf to the nearest tree's trunk
    mark.fill(0);
    const qi: number[] = [], qo: number[] = [];
    found.forEach((t, k) => { for (const i of t.logs) { mark[i] = 1; qi.push(i); qo.push(k); } });
    for (let h = 0; h < qi.length; h++) { const i = qi[h]; if (mark[i] > 7) continue; for (const s of S6) { if (!ok(i, s)) continue; const j = i + s; if (!mark[j] && LEAF.has(grid[j])) { mark[j] = mark[i] + 1; qi.push(j); qo.push(qo[h]); found[qo[h]].leaves.push(j); } } }
    const KIND = { oak: 0, birch: 1, pine: 2, giant: 3 } as Record<string, number>;
    for (const t of found) {
      const [bx, by, bz] = xyz(t.logs[0]);
      const [gx, gz] = toGame(mx0 + bx, mz0 + bz);
      const key = Math.floor(gx / CHUNK) + '_' + Math.floor(gz / CHUNK);
      const rel = (i: number): number[] => { const [x, y, z] = xyz(i); const [px, pz] = toGame(mx0 + x, mz0 + z); return [px - gx + 128, y, pz - gz + 128]; };
      const trunk = t.logs.flatMap(rel), leaves = t.leaves.flatMap((i) => [...rel(i), grid[i]]);
      if (trunk.some((v, k) => k % 3 !== 1 && (v < 0 || v > 255)) || leaves.some((v, k) => k % 4 !== 1 && k % 4 !== 3 && (v < 0 || v > 255))) continue;
      const logs = t.kind === 'giant' ? Math.min(9, 5 + Math.floor(t.logs.length / 25)) : Math.max(2, Math.min(5, Math.round(t.logs.length / 3)));
      let l = chunkTrees.get(key); if (!l) chunkTrees.set(key, (l = []));
      l.push([KIND[t.kind], logs, gx - Math.floor(gx / CHUNK) * CHUNK, by, gz - Math.floor(gz / CHUNK) * CHUNK, t.logs.length >> 8, t.logs.length & 255, ...trunk, t.leaves.length >> 8, t.leaves.length & 255, ...leaves]);
    }
    console.log(piece.id + ': dropped', dropped, 'leaves with no trunk near;', found.length, 'trees to fell');
  }
  // below what was read: rock; and any open space under the sea filled with water
  for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
    // (a floor at the world's foot, no more: the mines, the quarry pit and the owner's farm under their house go
    // down that far, and filling them up from below made solid pillars of stone; owner 2026-11-05)
    if (grid[gi(ix, iz, 0)] === B.Air) grid[gi(ix, iz, 0)] = B.Stone;
    // (no water poured in: Minecraft's own water is in the blocks already, and the coast's sea is laid with it;
    // a cellar, a mine, the quarry pit stay as dry as the owner left them: owner 2026-11-05)
  }
  // to game coordinates, chunk by chunk
  const GW = rot ? D : W, GD = rot ? W : D;
  const gx1 = gx0 + GW - 1, gz1 = gz0 + GD - 1;
  let files = 0;
  for (let cz = Math.floor(gz0 / CHUNK); cz <= Math.floor(gz1 / CHUNK); cz++) for (let cx = Math.floor(gx0 / CHUNK); cx <= Math.floor(gx1 / CHUNK); cx++) {
    // per column: a byte for how many runs (0: not ours, leave the generated ground), then [y, len, id] runs
    const cols: number[][] = [];
    let any = false;
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const at = toGrid(cx * CHUNK + lx, cz * CHUNK + lz);
      if (!at) { cols.push([0]); continue; }
      const [ix, iz] = at;
      any = true;
      const runs: number[] = [];
      let y = 0;
      while (y < SY) {
        const id = grid[gi(ix, iz, y)];
        let n = 1;
        while (y + n < SY && grid[gi(ix, iz, y + n)] === id) n++;
        if (id !== B.Air) runs.push(y, n, id);
        y += n;
      }
      cols.push([runs.length / 3, ...runs]);
    }
    if (!any) continue;
    // (pieces can share a chunk: each fills only its own columns)
    const key = `${cx}_${cz}`, had = chunkFiles.get(key);
    if (!had) { chunkFiles.set(key, cols); files++; }
    else for (let c = 0; c < CHUNK * CHUNK; c++) if (cols[c].length > 1 || cols[c][0]) had[c] = cols[c];
  }
  // the coarse height map: the top of the ground (not counting leaves) every MC_CELL blocks, game x then z
  const nx = Math.ceil(GW / MC_CELL), nz = Math.ceil(GD / MC_CELL), heights: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const [ix, iz] = toGrid(gx0 + Math.min(GW - 1, i * MC_CELL), gz0 + Math.min(GD - 1, j * MC_CELL))!;
    let top = 0;
    for (let y = SY - 1; y > 0; y--) { const id = grid[gi(ix, iz, y)]; if (id !== B.Air && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves) { top = id === B.Water ? Math.min(y, SEA - 1) : y + 1; break; } }
    heights.push(top);
  }
  heightMaps.push({ id: piece.id, w: nx, d: nz, b64: Buffer.from(Uint8Array.from(heights)).toString('base64') });
  console.log(`${piece.id}: ${files} chunk files; height map ${nx}x${nz}`);
}
let totalBytes = 0;
for (const [key, cols] of chunkFiles) { const tr = chunkTrees.get(key) ?? []; const buf = zlib.deflateRawSync(Buffer.from(Uint8Array.from([...cols.flat(), tr.length >> 8, tr.length & 255, ...tr.flat()])), { level: 9 }); fs.writeFileSync(path.join(out, key + '.bin'), buf); totalBytes += buf.length; }
console.log(`${chunkFiles.size} chunk files written, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log('unmapped (as stone):', [...unknown].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([n, c]) => `${n}:${c}`).join(' '));
// The waystones' names, as the owner gave them (the add-on keeps them in the world's own records, by where each
// stands); one renamed: the village by their house is Kestle (owner 2026-11-05: "name it something")
{
  const RENAME: Record<string, string> = { 'Snow Village': 'Kestle' };
  const named = new Map<string, string>();
  for (const [, e] of readDb(dir, (k) => !(k.length === 10 && k[8] === 0x2f) && !(k.length === 9 && k[8] === 0x31))) {
    if (!e.value) continue;
    for (const m of e.value.toString('latin1').matchAll(/\{"pos":\{"x":(-?\d+),"y":(-?\d+),"z":(-?\d+)\},"dimensionId":"minecraft:overworld","facing":"\w+","type":"\w+","name":"([^"]*)"/g)) named.set(m[1] + ',' + m[2] + ',' + m[3], m[4]);
  }
  for (const s of stones.values()) {
    const n = named.get(s.mc.join(',')) ?? named.get([s.mc[0], s.mc[1] - 1, s.mc[2]].join(',')) ?? named.get([s.mc[0], s.mc[1] + 1, s.mc[2]].join(','));
    if (n) s.name = RENAME[n] ?? n;
  }
  console.log('waystones named:', [...stones.values()].map((s) => s.name ?? '?').join(', '));
}
// The lamp-post add-on's pieces put back together: a stack of them one street lamp post (the game's), a piece on its own a lantern
{
  const posts = new Map<string, (string | number)[][]>();
  for (const t of things) if (t[0] === 'mcpost') { const k = t[1] + ',' + t[3]; let l = posts.get(k); if (!l) posts.set(k, (l = [])); l.push(t); }
  const out = things.filter((t) => t[0] !== 'mcpost');
  for (const list of posts.values()) {
    list.sort((a, b) => +a[2] - +b[2]);
    let run: (string | number)[][] = [];
    const flush = () => { if (!run.length) return; const b = run[0]; out.push(run.length > 1 ? ['lantern', b[1], b[2], b[3], 0, 0] : ['mclantern', b[1], b[2], b[3], b[4], 0]); run = []; };
    for (const t of list) { if (run.length && +t[2] !== +run[run.length - 1][2] + 1) flush(); run.push(t); }
    flush();
  }
  things.length = 0; things.push(...out);
}
// The signs (data/mcSigns.ts): kept only where the piece itself is kept (not sunk under the sea round an island)
// signs the owner wants gone (2026-11-07: the "torcher chamber" sign in Black Gull Keep)
const DROP_SIGNS = /torcher chamber/i;
fs.writeFileSync(path.resolve('src/data/mcSigns.ts'), `// Written by scripts/mc/export.ts: the signs on the owner's Minecraft builds, in game coordinates (kind 0 on a post, 1 on a wall, 2 hung).
export interface McSign { x: number; y: number; z: number; ry: number; kind: number; text: string; piece: string }
export const MC_SIGNS: McSign[] = ${JSON.stringify(signs.filter((s) => !DROP_SIGNS.test(s.text)))};
/** The small things on the owner's builds: [kind, x, y, z, facing, the furniture's item or a light's wall/hanging]. */
export const MC_THINGS: (string | number)[][] = ${JSON.stringify(things)};
/** The houses behind the owner's doors (scripts/mc/export.ts): [x0, z0, x1, z1, floor, door x, door z, floor area], west to east. */
export const MC_HOUSES: number[][] = ${JSON.stringify(houses.sort((a, b) => a[0] - b[0] || a[1] - b[1]))};
/** The waystones the owner set (an add-on's): where the game's waymarks stand. */
export const MC_WAYSTONES: { x: number; y: number; z: number; piece: string; name?: string }[] = ${JSON.stringify([...stones.values()].map(({ mc: _mc, ...s }) => s))};
`);
// The height maps in code (world/mclandHeights.ts), so heightAt knows the islands the moment the game starts
fs.writeFileSync(path.resolve('src/world/mclandHeights.ts'), `// Written by scripts/mc/export.ts: the ground of each of the owner's Minecraft pieces, every ${MC_CELL} blocks (game x fastest).
export const MC_HEIGHTS: Record<string, { w: number; d: number; b64: string }> = {
${heightMaps.map((h) => `  ${h.id}: { w: ${h.w}, d: ${h.d}, b64: '${h.b64}' },`).join('\n')}
};
`);
