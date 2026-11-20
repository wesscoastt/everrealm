// The shape layer over the owner's island (owner 2026-11-19: "stone walls / stairs / stairs in general and some other
// blocks too" came through as whole cubes; "this trident statue didn't port properly"). export.ts writes every block as
// one of the game's cubes; this reads the world again and writes, beside each island chunk's file, the cells that are
// really stairs, slabs, walls or trapdoors (world/meshCore.ts draws them so), and the ones whose stuff was mapped wrong
// (prismarine). Each entry carries the block export.ts made of it, and the game lays the entry only where that block
// is still there: the hand edits made since (the .cjs scripts) are never undone.
//
//   npx tsx scripts/mc/shapes.ts "<world>/db"
//
// public/mcland/shape/<cx>_<cz>.bin, deflated: a u32 count, then per cell [lx, lz, y, expected block, block, shape].
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { readDb } from './leveldb';
import { readSubChunk, type Palette } from './bedrock';
import { mapBlock } from './blockmap';
import { B } from '../../src/world/blocks';
import { MC_PIECES } from '../../src/world/mclandArea';
import { SHAPE } from '../../src/world/shapes';

const dir = process.argv[2];
const SY = 112, CHUNK = 32;
const out = path.resolve('public/mcland/shape');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

/** Minecraft's compass (east +x, west -x, south +z, north -z) as the game's directions (0 +x, 1 -x, 2 +z, 3 -z) in a piece. */
const DIRS = { plain: { east: 0, west: 1, south: 2, north: 3 }, rot: { east: 2, west: 3, south: 1, north: 0 } } as const;
type Compass = 'east' | 'west' | 'south' | 'north';
const WEIRDO: Compass[] = ['east', 'west', 'south', 'north'];

/** A block's shape (world/shapes.ts SHAPE), its stuff if export.ts mapped it wrong, or nothing to do. */
function shapeOf(p: Palette, rot: boolean): { shape: number; block?: number } | null {
  const n = p.name.replace(/^[a-z0-9_]+:/, ''), st = p.states, D = rot ? DIRS.rot : DIRS.plain;
  const half = String(st['minecraft:vertical_half'] ?? '') === 'top' || st.top_slot_bit === 1 || st.top_slot_bit === true || st.upside_down_bit === 1 || st.upside_down_bit === true;
  const prism = /prismarine/.test(n) ? (/dark_prismarine/.test(n) ? B.DarkPrismarine : /prismarine_brick/.test(n) ? B.PrismarineBricks : B.Prismarine) : undefined;
  if (/double_slab/.test(n)) return prism !== undefined ? { shape: 0, block: prism } : null;
  if (/stairs/.test(n)) {
    const d = D[WEIRDO[Number(st.weirdo_direction ?? 0) & 3]];
    return { shape: (half ? SHAPE.stairTop : SHAPE.stair) + d, block: prism };
  }
  if (/side\..*\.slab|side_slab|vertical_slab/.test(n)) {
    const f = String(st['minecraft:facing_direction'] ?? st['minecraft:cardinal_direction'] ?? '');
    if (f in D) return { shape: SHAPE.side + D[f as Compass], block: prism };
  }
  if (/slab/.test(n)) return { shape: half ? SHAPE.slabTop : SHAPE.slab, block: prism };
  if (/wall$/.test(n) && !/sign|banner|torch|lantern|fan/.test(n)) return { shape: SHAPE.wall, block: prism };
  if (/trapdoor/.test(n) && !(st.open_bit === 1 || st.open_bit === true)) return { shape: half ? SHAPE.hatchTop : SHAPE.hatch, block: prism };
  if (prism !== undefined) return { shape: 0, block: prism };
  return null;
}

const byChunk = new Map<string, number[]>();
let total = 0, kinds = new Map<number, number>();
for (const piece of MC_PIECES) {
  const { mx0, mz0, mx1, mz1, gx0, gz0, yOff } = piece, rot = !!piece.rot;
  const cx0 = Math.floor(mx0 / 16), cz0 = Math.floor(mz0 / 16), cx1 = Math.floor(mx1 / 16), cz1 = Math.floor(mz1 / 16);
  const sy0 = Math.floor(-yOff / 16), sy1 = Math.floor((SY - 1 - yOff) / 16);
  const db = readDb(dir, (k) => {
    if (k.length !== 10 || k[8] !== 0x2f) return false;
    const x = k.readInt32LE(0), z = k.readInt32LE(4), y = k.readInt8(9);
    return x >= cx0 && x <= cx1 && z >= cz0 && z <= cz1 && y >= sy0 && y <= sy1;
  });
  for (const [k, e] of db) {
    if (!e.value) continue;
    const b = Buffer.from(k, 'latin1'), X = b.readInt32LE(0) * 16, Z = b.readInt32LE(4) * 16, Y = b.readInt8(9) * 16;
    const sc = readSubChunk(e.value); if (!sc) continue;
    const memo = new Map<number, ReturnType<typeof shapeOf> | undefined>();
    for (let i = 0; i < 4096; i++) {
      const pi = sc.idx[i];
      let s = memo.get(pi);
      if (s === undefined) { s = shapeOf(sc.palette[pi], rot); memo.set(pi, s); }
      if (!s) continue;
      const x = X + (i >> 8), z = Z + ((i >> 4) & 15), y = Y + (i & 15);
      if (x < mx0 || x > mx1 || z < mz0 || z > mz1) continue;
      const gy = y + yOff;
      if (gy < 0 || gy >= SY) continue;
      const gx = rot ? gx0 + (mz1 - z) : gx0 + (x - mx0), gz = rot ? gz0 + (x - mx0) : gz0 + (z - mz0);
      // (what export.ts wrote then: it mapped all prismarine to mossy stone, before blockmap.ts knew better)
      const expected = /prismarine/.test(sc.palette[pi].name) ? B.MossyStone : mapBlock(sc.palette[pi]);
      if (expected === B.Air || expected === B.Barrier) continue;
      const block = s.block ?? expected;
      if (!s.shape && block === expected) continue;
      const cx = Math.floor(gx / CHUNK), cz = Math.floor(gz / CHUNK), key = cx + '_' + cz;
      let list = byChunk.get(key); if (!list) byChunk.set(key, (list = []));
      list.push(gx - cx * CHUNK, gz - cz * CHUNK, gy, expected, block, s.shape);
      total++; kinds.set(s.shape, (kinds.get(s.shape) ?? 0) + 1);
    }
  }
}
for (const [key, list] of byChunk) {
  const buf = Buffer.alloc(4 + list.length);
  buf.writeUInt32LE(list.length / 6, 0);
  for (let i = 0; i < list.length; i++) buf[4 + i] = list[i];
  fs.writeFileSync(path.join(out, key + '.bin'), zlib.deflateRawSync(buf, { level: 9 }));
}
console.log(`shape layer: ${total} cells in ${byChunk.size} chunk files`, JSON.stringify([...kinds].sort((a, b) => a[0] - b[0])));
