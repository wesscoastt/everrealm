// The closed trapdoors in a box of the owner's world, where they land in the game (owner 2026-11-13: "fix my trap doors for my
// house cellar, it's blocks of wood planks right now, just remove them"): a closed trapdoor came over as a block of planks.
//   npx tsx scripts/mc/traps.ts "<world>/db" <gx0> <gz0> <gx1> <gz1>    (the box in the game's x and z)
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
import { MC_PIECES } from '../../src/world/mclandArea';

const [dir, ...box] = process.argv.slice(2);
const [gx0b, gz0b, gx1b, gz1b] = box.map(Number);
const SY = 112;
const out: { gx: number; gy: number; gz: number; open: boolean; name: string }[] = [];
for (const piece of MC_PIECES) {
  const { mx0, mz0, mx1, mz1, gx0, gz0, yOff } = piece;
  const D = mz1 - mz0 + 1, rot = piece.rot ?? 0;
  const toGame = (x: number, z: number): [number, number] => (rot ? [gx0 + (D - 1 - (z - mz0)), gz0 + (x - mx0)] : [gx0 + (x - mx0), gz0 + (z - mz0)]);
  const cx0 = Math.floor(mx0 / 16), cz0 = Math.floor(mz0 / 16), cx1 = Math.floor(mx1 / 16), cz1 = Math.floor(mz1 / 16);
  // only the Minecraft chunks that land in the box
  const inBox = (mx: number, mz: number) => { const [x, z] = toGame(mx, mz); return x >= gx0b && x <= gx1b && z >= gz0b && z <= gz1b; };
  const db = readDb(dir, (k) => {
    if (k.length !== 10 || k[8] !== 0x2f) return false;
    const x = k.readInt32LE(0), z = k.readInt32LE(4);
    if (x < cx0 || x > cx1 || z < cz0 || z > cz1) return false;
    return [[0, 0], [15, 0], [0, 15], [15, 15], [8, 8]].some(([a, b]) => inBox(x * 16 + a, z * 16 + b));
  });
  for (const [k, e] of db) {
    if (!e.value) continue;
    const b = Buffer.from(k, 'latin1');
    const scx = b.readInt32LE(0), scz = b.readInt32LE(4), scy = b.readInt8(9);
    const sc = readSubChunk(e.value);
    if (!sc) continue;
    const trap = sc.palette.map((p) => (/trapdoor/.test(p.name) ? { open: p.states.open_bit === 1 || p.states.open_bit === true, name: p.name } : null));
    if (!trap.some(Boolean)) continue;
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) for (let ly = 0; ly < 16; ly++) {
      const t = trap[sc.idx[lx * 256 + lz * 16 + ly]];
      if (!t) continue;
      const mx = scx * 16 + lx, mz = scz * 16 + lz, gy = scy * 16 + ly + yOff;
      if (mx < mx0 || mx > mx1 || mz < mz0 || mz > mz1 || gy < 0 || gy >= SY || !inBox(mx, mz)) continue;
      const [gx, gz] = toGame(mx, mz);
      out.push({ gx, gy, gz, open: t.open, name: t.name });
    }
  }
}
console.log(JSON.stringify(out));
