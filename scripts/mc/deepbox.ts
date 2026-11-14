// Any box of the owner's world read down below the old foot (owner 2026-11-13: "the rest of the Drowned Cistern never ported,
// it's missing the bottom half: make the world of the Verandah area go to bedrock"). The export reads Minecraft down to 47,
// the game's 0; the world now reaches down to MINY, so this reads every column of a box from Minecraft 47 + MINY up to 47 and
// lays it into the deep files (public/mcland/deep/<cx>_<cz>.bin, as scripts/mc/quarrydeep.ts writes them), merging: columns
// outside the box keep what they had. world/mclandarea's mcApply lays them in under the island.
//   npx tsx scripts/mc/deepbox.ts "<world>/db" <gx0> <gz0> <gx1> <gz1>
import * as fs from 'fs';
import * as zlib from 'zlib';
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
import { B } from '../../src/world/blocks';
import { mapBlock } from './blockmap';
import { MC_PIECES } from '../../src/world/mclandArea';
import { MINY } from '../../src/world/VoxelWorld';

const [dir, ...box] = process.argv.slice(2);
const [X0, Z0, X1, Z1] = box.map(Number);
const piece = MC_PIECES.find((p) => p.id === 'city')!;
const D = piece.mz1 - piece.mz0 + 1;
/** A game column's Minecraft x and z (the city piece is turned: game x runs down Minecraft z). */
const mcOf = (gx: number, gz: number): [number, number] => [piece.mx0 + (gz - piece.gz0), piece.mz0 + (D - 1 - (gx - piece.gx0))];
const TOP = -piece.yOff, LOW = TOP + MINY; // Minecraft 47 is the game's 0
const H = -MINY + 1; // rows MINY..0

const corners = [mcOf(X0, Z0), mcOf(X1, Z1)];
const cx0 = Math.floor(Math.min(corners[0][0], corners[1][0]) / 16), cx1 = Math.floor(Math.max(corners[0][0], corners[1][0]) / 16);
const cz0 = Math.floor(Math.min(corners[0][1], corners[1][1]) / 16), cz1 = Math.floor(Math.max(corners[0][1], corners[1][1]) / 16);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt32LE(0) >= cx0 && k.readInt32LE(0) <= cx1 && k.readInt32LE(4) >= cz0 && k.readInt32LE(4) <= cz1);
const mc = new Map<string, number>();
for (const [k, e] of db) {
  const kb = Buffer.from(k, 'latin1'); if (!e.value) continue;
  const sc = readSubChunk(e.value); if (!sc) continue;
  const ccx = kb.readInt32LE(0), ccz = kb.readInt32LE(4), sy = kb.readInt8(9);
  if (sy * 16 + 15 < LOW || sy * 16 > TOP) continue;
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) for (let ly = 0; ly < 16; ly++) {
    const y = sy * 16 + ly; if (y < LOW || y > TOP) continue;
    mc.set(`${ccx * 16 + lx},${y},${ccz * 16 + lz}`, mapBlock(sc.palette[sc.idx[lx * 256 + lz * 16 + ly]]));
  }
}

// the deep files as they are, to merge into
const files = new Map<string, (number[] | null)[]>();
const fileOf = (k: string) => {
  if (!files.has(k)) {
    const list: (number[] | null)[] = [];
    const fn = `public/mcland/deep/${k}.bin`;
    if (fs.existsSync(fn)) {
      const d = zlib.inflateRawSync(fs.readFileSync(fn)); let q = 0;
      for (let c = 0; c < 1024; c++) { const n = d[q++]; if (n === 255) { list.push(null); continue; } const r: number[] = []; for (let i = 0; i < n * 3; i++) r.push(d[q++]); list.push(r); }
    } else for (let c = 0; c < 1024; c++) list.push(null);
    files.set(k, list);
  }
  return files.get(k)!;
};

let cols = 0, open = 0;
for (let gx = X0; gx <= X1; gx++) for (let gz = Z0; gz <= Z1; gz++) {
  const [x, z] = mcOf(gx, gz);
  const col: number[] = [];
  for (let y = LOW; y <= TOP; y++) { const id = mc.get(`${x},${y},${z}`); col.push(id === undefined ? B.Stone : id); }
  if (col.length !== H) throw new Error('rows');
  if (col.some((b) => b === B.Air)) open++;
  // (the very bottom row always rock: the world has a floor)
  if (col[0] === B.Air || col[0] === B.Water) col[0] = B.Stone;
  const runs: number[] = [];
  for (let i = 0; i < col.length;) {
    if (col[i] === B.Air) { i++; continue; }
    let l = 1; while (i + l < col.length && col[i + l] === col[i] && l < 255) l++;
    runs.push(i, l, col[i]); i += l;
  }
  const cx = Math.floor(gx / 32), cz = Math.floor(gz / 32);
  fileOf(cx + '_' + cz)[(gz - cz * 32) * 32 + (gx - cx * 32)] = runs;
  cols++;
}
fs.mkdirSync('public/mcland/deep', { recursive: true });
for (const [k, list] of files) {
  const parts = list.map((r) => (r ? Buffer.from([r.length / 3, ...r]) : Buffer.from([255])));
  fs.writeFileSync(`public/mcland/deep/${k}.bin`, zlib.deflateRawSync(Buffer.concat(parts), { level: 9 }));
}
console.log(`deep box ${X0},${Z0}..${X1},${Z1}: ${cols} columns (${open} with room below the old foot) in ${files.size} chunk files`);
