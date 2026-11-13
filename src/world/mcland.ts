import { B } from './blocks';
import { CHUNK, localIdx, MINY, SY } from './VoxelWorld';
import { MC_CELL, MC_PIECES, pieceBounds } from './mclandArea';
import { MC_HEIGHTS } from './mclandHeights';
import type { ChunkResult, GenTree } from './chunkgen';
import type { TreeKind } from './generate';
import { hash2 } from './noise';

// The owner's Minecraft island (scripts/mc/export.ts made it; world/mclandArea.ts says where it lies). Its
// chunks come as small files (public/mcland/<cx>_<cz>.bin, deflated: per column a count of runs, then
// [y, length, block] runs), fetched by the world worker before it generates one of them, and laid over the
// generated sea: every column of the island is the Minecraft column, block for block. Its ground is also
// known to heightAt from the start (mclandHeights.ts), for the map, the far terrain and placing things.

const SEA = 16;
const PIECES = MC_PIECES.map((p) => ({ ...pieceBounds(p), id: p.id, h: null as Uint8Array | null }));

/** Is this game chunk any part of one of the pieces? */
export function mcChunk(cx: number, cz: number): boolean {
  return PIECES.some((b) => cx * CHUNK + CHUNK - 1 >= b.x0 && cx * CHUNK <= b.x1 && cz * CHUNK + CHUNK - 1 >= b.z0 && cz * CHUNK <= b.z1);
}
const pieceAt = (x: number, z: number, margin = 0) => PIECES.find((b) => x >= b.x0 - margin && x <= b.x1 + margin && z >= b.z0 - margin && z <= b.z1 + margin);
/** Inside one of the pieces' rectangles (the margin: a little sea round it counts, for the coast). */
export function inMcLand(x: number, z: number, margin = 0): boolean { return !!pieceAt(x, z, margin); }

/** A piece's ground at a point, from its coarse height map (bilinear), or null off them all. */
export function mcHeight(x: number, z: number): number | null {
  const b = pieceAt(x, z);
  if (!b) return null;
  const hm = MC_HEIGHTS[b.id];
  if (!b.h) { const s = atob(hm.b64); b.h = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b.h[i] = s.charCodeAt(i); }
  const W = hm.w, D = hm.d, c = MC_CELL, fx = (x - b.x0) / c, fz = (z - b.z0) / c;
  const i = Math.min(W - 2, Math.max(0, Math.floor(fx))), j = Math.min(D - 2, Math.max(0, Math.floor(fz)));
  const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - j));
  const heights = b.h, MC_HEIGHTS_W = W;
  const h = (a: number, bb: number) => heights[bb * MC_HEIGHTS_W + a];
  const v = h(i, j) * (1 - tx) * (1 - tz) + h(i + 1, j) * tx * (1 - tz) + h(i, j + 1) * (1 - tx) * tz + h(i + 1, j + 1) * tx * tz;
  return Math.round(v);
}

const files = new Map<string, Uint8Array | null>();
/** The Verandah farm, by its sign: its farmland grows corn. */
const VERANDAH_FARM = [-2667, 2192];
/** Columns dug below the old foot (the Verandah quarry): per column 255 (not dug) or a count of [y - MINY, length, block] runs. */
const deep = new Map<string, Uint8Array>();
const pending = new Map<string, Promise<void>>();

/** Fetch an island chunk's file, once (the worker awaits this before generating the chunk). */
export function mcLoad(cx: number, cz: number, base: string): Promise<void> {
  const key = cx + '_' + cz;
  if (files.has(key)) return Promise.resolve();
  let p = pending.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`${base}mcland/${key}.bin`);
        if (!res.ok) { files.set(key, null); return; }
        // the quarry's deep part under the old foot, for the few chunks that have one (scripts/mc/quarrydeep.ts)
        try {
          const d = await fetch(`${base}mcland/deep/${key}.bin`);
          if (d.ok && (d.headers.get('content-type') ?? '').indexOf('html') < 0) deep.set(key, new Uint8Array(await new Response(d.body!.pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()));
        } catch { /* none */ }
        const raw = res.body!.pipeThrough(new DecompressionStream('deflate-raw'));
        files.set(key, new Uint8Array(await new Response(raw).arrayBuffer()));
      } catch { files.set(key, null); }
    })();
    pending.set(key, p);
  }
  return p;
}

const GRASSY = new Set<number>([B.Grass, B.FlowerGrass, B.Loam]);
/** The farmland across from Verandah Winery, a vineyard. */
const VINEYARD = { x0: -2970, x1: -2860, z0: 1935, z1: 1990 };
/** Tops that aren't anything built: the country. */
const NATURAL = new Set<number>([B.Grass, B.FlowerGrass, B.Loam, B.Dirt, B.Snow, B.SnowGrass, B.Sand, B.Stone, B.Granite, B.Gravel, B.Water, B.Ice, B.Clay, B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.OakLog, B.BirchLog, B.PineLog]);

/** Lay the island's columns over a generated chunk: its blocks, its map colours, grass on its lawns. */
export function mcApply(r: ChunkResult, mapColor: (id: number) => [number, number, number]): void {
  const f = files.get(r.cx + '_' + r.cz);
  if (!f) return;
  const ox = r.cx * CHUNK, oz = r.cz * CHUNK;
  const ours = new Uint8Array(CHUNK * CHUNK), tops = new Int16Array(CHUNK * CHUNK).fill(-1), builtTop = new Uint8Array(CHUNK * CHUNK);
  const veg: number[] = [...r.veg];
  let p = 0;
  // The quarry's deep part (scripts/mc/quarrydeep.ts): its columns' runs from the world's floor up through the old
  // foot at 0, laid in after the island's own (which closed the pit off with a floor at 0)
  const dp = deep.get(r.cx + '_' + r.cz), deepCols: (number[] | null)[] = [];
  if (dp) {
    let q = 0;
    for (let c = 0; c < CHUNK * CHUNK; c++) {
      const n = dp[q++];
      if (n === 255) { deepCols.push(null); continue; }
      const runs: number[] = [];
      for (let k = 0; k < n; k++) runs.push(dp[q++] + MINY, dp[q++], dp[q++]);
      deepCols.push(runs);
    }
  }
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    const n = f[p++];
    if (!n) continue;
    ours[lx + lz * CHUNK] = 1;
    for (let y = 0; y < SY; y++) r.data[localIdx(lx, y, lz)] = B.Air;
    let top = -1, topId: number = B.Air;
    for (let k = 0; k < n; k++) {
      const y0 = f[p++], len = f[p++], id = f[p++];
      for (let y = y0; y < y0 + len && y < SY; y++) r.data[localIdx(lx, y, lz)] = id;
      if (y0 + len - 1 > top) { top = y0 + len - 1; topId = id; }
    }
    const dc = deepCols[lx + lz * CHUNK];
    if (dc) {
      for (let y = MINY; y <= 0; y++) r.data[localIdx(lx, y, lz)] = B.Air;
      for (let k = 0; k < dc.length; k += 3) for (let y = dc[k]; y < dc[k] + dc[k + 1] && y <= 0; y++) r.data[localIdx(lx, y, lz)] = dc[k + 2];
      if (top <= 0) { top = -1; for (let y = 0; y >= MINY; y--) if (r.data[localIdx(lx, y, lz)] !== B.Air) { top = y; topId = r.data[localIdx(lx, y, lz)]; break; } }
    }
    tops[lx + lz * CHUNK] = top; if (!NATURAL.has(topId)) builtTop[lx + lz * CHUNK] = 1;
    // the explored map: the top block's colour, the water's by depth, a touch of shade by height
    const mi = (lz * CHUNK + lx) * 4;
    let col: [number, number, number];
    // (water by its depth, as the rest of the world's sea is drawn: world/chunkgen.ts; the owner 2026-11-05,
    // "water colours around Verandah and on the map are different than the rest of the oceans")
    if (topId === B.Water) { let d = 0; while (d < 8 && top - d >= 0 && r.data[localIdx(lx, top - d, lz)] === B.Water) d++; col = [70 - d * 6, 150 - d * 10, 200 - d * 6]; }
    else col = mapColor(topId);
    const shade = 1 + (top - 22) * 0.008;
    r.map[mi] = col[0] * shade; r.map[mi + 1] = col[1] * shade; r.map[mi + 2] = col[2] * shade; r.map[mi + 3] = 255;
    // crops on the farmland: wheat and corn in turns of rows; the Verandah farm all corn (owner 2026-11-12: "all the wheat
    // blocks on the Verandah farm are supposed to be corn")
    if (topId === B.Farmland && top + 1 < SY) {
      const x = ox + lx, z = oz + lz, corn = Math.hypot(x - VERANDAH_FARM[0], z - VERANDAH_FARM[1]) < 90 || Math.floor(x / 5) % 2 === 0;
      // across from the winery, a vineyard (owner 2026-11-05: "replace the farmland across the winery with grapes")
      if (x >= VINEYARD.x0 && x <= VINEYARD.x1 && z >= VINEYARD.z0 && z <= VINEYARD.z1) veg.push(x + 0.5, top + 1, z + 0.5, 16, 1.7, x % 2 ? 0 : Math.PI, 1, 1, 1);
      else for (let k = 0; k < 2; k++) veg.push(x + 0.25 + k * 0.5, top + 1, z + 0.5, corn ? 15 : 6, corn ? 1.9 : 1.05, (x * 7 + z) % 6, 1, 1, 1);
    }
    // grass and the odd flower on open lawns
    if (GRASSY.has(topId) && top + 1 < SY) {
      const x = ox + lx, z = oz + lz, h = ((x * 73856093) ^ (z * 19349663)) >>> 0, q = (h % 1000) / 1000;
      if (q < 0.45) veg.push(x + 0.2 + q * 0.6, top + 1, z + 0.5, q < 0.08 ? 2 + (h % 4) : q < 0.3 ? 0 : 1, 0.8 + q * 0.5, q * 6.28, 0.82, 0.8, 0.9);
    }
  }
  // what the generator put on the sea that was here goes: its fish, its creatures, anything to pick
  /** Nothing built within r columns (inside this chunk). */
  const wild = (lx: number, lz: number, rr: number) => { for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { const a = lx + dx, b = lz + dz; if (a < 0 || b < 0 || a >= CHUNK || b >= CHUNK) continue; if (builtTop[a + b * CHUNK] || !ours[a + b * CHUNK]) return false; } return true; };
  const mine = (x: number, z: number) => { const lx = Math.floor(x) - ox, lz = Math.floor(z) - oz; return lx >= 0 && lz >= 0 && lx < CHUNK && lz < CHUNK && ours[lx + lz * CHUNK] === 1; };
  r.fish = r.fish.filter((q) => !mine(q.x, q.z));
  r.trees = r.trees.filter((q) => !mine(q.x, q.z));
  r.ores = r.ores.filter((q) => !mine(q.x, q.z));
  const ownTrees: GenTree[] = [], ownOres: ChunkResult['ores'] = [], ownForage: ChunkResult['forage'] = [], ownSpawns: ChunkResult['spawns'] = [];
  // The island's own trees, written after the columns (scripts/mc/export.ts): each one to fell, its stump left
  if (p + 1 < f.length) {
    const KINDS: TreeKind[] = ['oak', 'birch', 'pine', 'giant'];
    const nt = (f[p] << 8) | f[p + 1]; p += 2;
    for (let k = 0; k < nt; k++) {
      const kind = KINDS[f[p++]], logs = f[p++], x = ox + f[p++], y = f[p++], z = oz + f[p++];
      const trunk: number[] = [], leaves: number[] = [];
      const n1 = (f[p] << 8) | f[p + 1]; p += 2;
      for (let i = 0; i < n1; i++, p += 3) trunk.push(x + f[p] - 128, f[p + 1], z + f[p + 2] - 128);
      const n2 = (f[p] << 8) | f[p + 1]; p += 2;
      for (let i = 0; i < n2; i++, p += 4) leaves.push(x + f[p] - 128, f[p + 1], z + f[p + 2] - 128, f[p + 3]);
      ownTrees.push({ kind, x, y, z, trunk, leaves, logs } as GenTree);
    }
  }
  // What grows and lives on it, as anywhere else in the world: ore in the bare rock, things to pick on the grass
  // and in the snow, and creatures out in the country (never among the houses)
  for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
    const t = tops[lx + lz * CHUNK]; if (t < 0) continue;
    const x = ox + lx, z = oz + lz, id = r.data[localIdx(lx, t, lz)], h = hash2(x, z, 961);
    if ((id === B.Stone || id === B.Granite) && t > SEA && h < 0.006) {
      const kind = h < 0.0028 ? 'copper' : h < 0.0048 ? 'tin' : 'iron';
      r.data[localIdx(lx, t, lz)] = kind === 'copper' ? B.CopperOre : kind === 'tin' ? B.TinOre : B.IronOre;
      ownOres.push({ kind, x, y: t, z });
    } else if (h < 0.0022 && t + 1 < SY && wild(lx, lz, 3)) {
      const list = id === B.Snow || id === B.SnowGrass ? ['cloudberries', 'bilberries'] : GRASSY.has(id) ? ['blackberries', 'wild_garlic', 'wild_garlic', 'chanterelles'] : id === B.Sand && t <= SEA + 2 ? ['samphire'] : null;
      if (list) ownForage.push({ x: x + 0.5, y: t + 1, z: z + 0.5, kind: list[Math.floor(hash2(x * 7 + 3, z * 13 + 5, 962) * list.length)] });
    }
  }
  const wilds = (() => { let n = 0; for (let i = 0; i < CHUNK * CHUNK; i++) if (ours[i] && tops[i] >= SEA && !builtTop[i]) n++; return n; })();
  for (let i = 0; i < 3; i++) {
    const roll = hash2(r.cx * 7 + i, r.cz, 963);
    if (roll > (i === 2 ? 0.25 : 0.6)) continue;
    const lx = Math.floor(hash2(r.cx, r.cz + i * 13, 964) * 28) + 2, lz = Math.floor(hash2(r.cx + i * 17, r.cz, 965) * 28) + 2;
    const t = tops[lx + lz * CHUNK], id = t >= 0 ? r.data[localIdx(lx, t, lz)] : B.Air;
    if (!ours[lx + lz * CHUNK] || t < SEA || id === B.Water || !wild(lx, lz, 6)) continue;
    // creatures that fight only where the chunk is all country
    if (i === 2 && wilds < CHUNK * CHUNK * 0.97) continue;
    ownSpawns.push({ x: ox + lx + 0.5, z: oz + lz + 0.5, region: 'verandah', roll: hash2(ox + lx, oz + lz, 966), animal: i !== 2 });
  }
  r.ores = r.ores.concat(ownOres);
  r.trees = r.trees.concat(ownTrees);
  r.forage = r.forage.filter((q) => !mine(q.x, q.z)).concat(ownForage);
  r.spawns = r.spawns.filter((q) => !mine(q.x, q.z)).concat(ownSpawns);
  const keep: number[] = [];
  for (let i = 0; i < veg.length; i += 9) if (i >= r.veg.length || !mine(veg[i], veg[i + 2])) keep.push(...veg.slice(i, i + 9));
  r.veg = new Float32Array(keep);
}
export { SEA as MC_SEA };
