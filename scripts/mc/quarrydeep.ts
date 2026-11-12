// The Verandah quarry as deep as the owner dug it (owner 2026-11-12: "make it as deep as it is in the Minecraft world").
// The export reads the world down to Minecraft 47, the game's old foot; the owner's pit goes on to about Minecraft 27.
// The world now reaches down to MINY (world/VoxelWorld.ts), so this reads the pit's columns from Minecraft 47 + MINY
// up to 47 and writes them as small files beside the island's own (public/mcland/deep/<cx>_<cz>.bin, deflated): per
// column a count of runs, then [y - MINY, length, block] runs, for the columns the pit is open to the foot in. The
// worker lays them in under the pit (world/mcland.ts mcApply). Run after the export and the patch scripts:
//   npx tsx scripts/mc/quarrydeep.ts "<world>/db"
import * as fs from 'fs';
import * as zlib from 'zlib';
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
import { B } from '../../src/world/blocks';
import { mapBlock } from './blockmap';
import { MC_PIECES } from '../../src/world/mclandArea';
import { MINY } from '../../src/world/VoxelWorld';

const dir = process.argv[2];
/** The pit, in game coordinates, with a margin round it. */
const X0 = -3110, X1 = -3060, Z0 = 2008, Z1 = 2066;
const piece = MC_PIECES.find((p) => p.id === 'city')!;
const mcX = (gz: number) => piece.mx0 + (gz - piece.gz0), mcZ = (gx: number) => piece.mz1 - (gx - piece.gx0);
const LOW = 47 + MINY; // the lowest Minecraft height read

// the island's own files: which columns are open down to the foot (their only block the floor at 0, air over it)
const bins = new Map<string, number[][][]>();
const columnRuns = (gx: number, gz: number): number[][] => {
  const cx = Math.floor(gx / 32), cz = Math.floor(gz / 32), k = cx + '_' + cz;
  if (!bins.has(k)) {
    const f = zlib.inflateRawSync(fs.readFileSync(`public/mcland/${k}.bin`));
    let p = 0; const cols: number[][][] = [];
    for (let c = 0; c < 1024; c++) { const n = f[p++]; const r: number[][] = []; for (let q = 0; q < n; q++) r.push([f[p++], f[p++], f[p++]]); cols.push(r); }
    bins.set(k, cols);
  }
  return bins.get(k)![(gz - cz * 32) * 32 + (gx - cx * 32)];
};
const open = (gx: number, gz: number) => { const r = columnRuns(gx, gz); return r.length > 0 && !r.some(([y, l]) => y <= 1 && y + l > 1); };

// the Minecraft blocks of those columns, from LOW to 47
const xs = [mcX(Z0), mcX(Z1)], zs = [mcZ(X1), mcZ(X0)];
const [cx0, cx1, cz0, cz1] = [Math.floor(Math.min(...xs) / 16), Math.floor(Math.max(...xs) / 16), Math.floor(Math.min(...zs) / 16), Math.floor(Math.max(...zs) / 16)];
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt32LE(0) >= cx0 && k.readInt32LE(0) <= cx1 && k.readInt32LE(4) >= cz0 && k.readInt32LE(4) <= cz1);
const mc = new Map<string, number>();
for (const [k, e] of db) {
  const kb = Buffer.from(k, 'latin1'); if (!e.value) continue;
  const sc = readSubChunk(e.value); if (!sc) continue;
  const ccx = kb.readInt32LE(0), ccz = kb.readInt32LE(4), sy = kb.readInt8(9);
  if (sy * 16 + 15 < LOW || sy * 16 > 47) continue;
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) for (let ly = 0; ly < 16; ly++) {
    const y = sy * 16 + ly; if (y < LOW || y > 47) continue;
    mc.set(`${ccx * 16 + lx},${y},${ccz * 16 + lz}`, mapBlock(sc.palette[sc.idx[lx * 256 + lz * 16 + ly]]));
  }
}

const out = new Map<string, number[][]>(); // chunk -> per column runs (y offset from MINY)
let cols = 0, deepest = 99;
for (let gx = X0; gx <= X1; gx++) for (let gz = Z0; gz <= Z1; gz++) {
  if (!open(gx, gz)) continue;
  const x = mcX(gz), z = mcZ(gx);
  const col: number[] = [];
  for (let y = LOW; y <= 47; y++) {
    const id = mc.get(`${x},${y},${z}`);
    col.push(id === undefined ? B.Stone : id === B.Water ? B.Water : id);
  }
  // runs of non-air, y counted from the floor (MINY); the game's 0 is Minecraft 47, the last read
  const runs: number[] = [];
  for (let i = 0; i < col.length;) {
    if (col[i] === B.Air) { i++; continue; }
    let l = 1; while (i + l < col.length && col[i + l] === col[i] && l < 255) l++;
    runs.push(i, l, col[i]); i += l;
  }
  let top = -1; for (let i = col.length - 1; i >= 0; i--) if (col[i] !== B.Air) { top = i; break; }
  // (open all the way through the old foot: the floor's air lies over whatever's top)
  if (top === col.length - 1) continue;
  deepest = Math.min(deepest, top + MINY + 1);
  const cx = Math.floor(gx / 32), cz = Math.floor(gz / 32), k = cx + '_' + cz;
  if (!out.has(k)) out.set(k, Array.from({ length: 1024 }, () => null as unknown as number[]));
  out.get(k)![(gz - cz * 32) * 32 + (gx - cx * 32)] = runs;
  cols++;
}
fs.mkdirSync('public/mcland/deep', { recursive: true });
for (const [k, columns] of out) {
  // (255: not the pit's, left as the island has it; 0: open all the way down)
  const parts = columns.map((r) => (r ? Buffer.from([r.length / 3, ...r]) : Buffer.from([255])));
  fs.writeFileSync(`public/mcland/deep/${k}.bin`, zlib.deflateRawSync(Buffer.concat(parts), { level: 9 }));
}
console.log(`the quarry's deep part: ${cols} columns in ${out.size} chunks, its floor stood on at ${deepest} (Minecraft ${deepest + 47})`);
