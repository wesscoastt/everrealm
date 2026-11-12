// What the owner built at Awschitz in Minecraft, and what each block became in the game (a survey for the rebuild).
//   npx tsx scripts/mc/awprobe.ts "<world>/db" gx0 gx1 gz0 gz1 [out.json]
import * as fs from 'fs';
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
import { B } from '../../src/world/blocks';
import { mapBlock } from './blockmap';
import { MC_PIECES } from '../../src/world/mclandArea';
const [dir, a, b, c, d, outf] = process.argv.slice(2);
const [gx0, gx1, gz0, gz1] = [a, b, c, d].map(Number);
const p = MC_PIECES.find((q) => q.id === 'city')!;
// game -> mc (rot 1): gx = gx0p + (mz1 - z), gz = gz0p + (x - mx0)
const mx = (gz: number) => p.mx0 + (gz - p.gz0), mz = (gx: number) => p.mz1 - (gx - p.gx0);
const xs = [mx(gz0), mx(gz1)], zs = [mz(gx1), mz(gx0)];
const cx0 = Math.floor(Math.min(...xs) / 16), cx1 = Math.floor(Math.max(...xs) / 16), cz0 = Math.floor(Math.min(...zs) / 16), cz1 = Math.floor(Math.max(...zs) / 16);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt32LE(0) >= cx0 && k.readInt32LE(0) <= cx1 && k.readInt32LE(4) >= cz0 && k.readInt32LE(4) <= cz1);
const tally = new Map<string, { n: number; to: string }>();
const cells: [number, number, number, string][] = [];
const names = Object.keys(B).filter((k) => isNaN(Number(k)));
for (const [k, e] of db) {
  const kb = Buffer.from(k, 'latin1'); if (!e.value) continue;
  const sc = readSubChunk(e.value); if (!sc) continue;
  const ccx = kb.readInt32LE(0), ccz = kb.readInt32LE(4), sy = kb.readInt8(9);
  for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) for (let ly = 0; ly < 16; ly++) {
    const x = ccx * 16 + lx, z = ccz * 16 + lz, y = sy * 16 + ly;
    if (y < 62) continue; // above the ground (game 15)
    const pal = sc.palette[sc.idx[lx * 256 + lz * 16 + ly]]; const n = pal.name.replace('minecraft:', '');
    if (n === 'air') continue;
    const gx = p.gx0 + (p.mz1 - z), gz = p.gz0 + (x - p.mx0);
    if (gx < gx0 || gx > gx1 || gz < gz0 || gz > gz1) continue;
    const to = mapBlock(pal);
    const t = tally.get(n) ?? { n: 0, to: (B as any)[to] ?? String(to) }; t.n++; tally.set(n, t);
    cells.push([gx, y - 47, gz, n]);
  }
}
console.log([...tally].sort((x, y) => y[1].n - x[1].n).map(([n, t]) => `${n} x${t.n} -> ${t.to}`).join('\n'));
if (outf) fs.writeFileSync(outf, JSON.stringify(cells));
