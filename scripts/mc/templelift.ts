// The Sunken Temple, the owner's own (owner 2026-11-07: "the Sunken Temple is supposed to be the actual dungeon; it had
// an internal layout you can use from Minecraft"). The owner built it underground beside the pit, at Minecraft 28 to 43,
// lower than the game's world reaches (its floor is Minecraft 47), so the export never brought it. This reads it from
// the world and sets it in the game nineteen blocks higher: its rooms at game 0 to 15, under the hill east of the pit,
// with the hill's own ground still over it. Its lanterns, chains, barrels and doors come as the export brings any.
// Run after scripts/mc/export.ts:   npx tsx scripts/mc/templelift.ts "<world>/db"
import * as fs from 'fs';
import * as zlib from 'zlib';
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
import { B } from '../../src/world/blocks';
import { facingOf, mapBlock, propOf, SOLID_ITEM, SOLID_T } from './blockmap';
import { MC_PIECES } from '../../src/world/mclandArea';

const dir = process.argv[2];
const MX0 = -178, MX1 = -117, MZ0 = 1283, MZ1 = 1323, MY0 = 28, MY1 = 43, LIFT = 19;
const piece = MC_PIECES.find((p) => p.id === 'city')!;
const D = piece.mz1 - piece.mz0 + 1;
const toGame = (x: number, z: number): [number, number] => [piece.gx0 + (D - 1 - (z - piece.mz0)), piece.gz0 + (x - piece.mx0)];
const gyOf = (my: number) => my + piece.yOff + LIFT;

// the game's chunk files, as the patch scripts keep them
const files = new Map<string, { cols: Uint8Array[]; rest: Buffer; dirty: boolean }>();
const col = (x: number, z: number) => {
  const cx = Math.floor(x / 32), cz = Math.floor(z / 32), fn = cx + '_' + cz + '.bin';
  if (!files.has(fn)) {
    const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols: Uint8Array[] = [];
    for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); }
    files.set(fn, { cols, rest: f.subarray(p), dirty: false });
  }
  const d = files.get(fn)!;
  return { d, c: d.cols[(z - cz * 32) * 32 + (x - cx * 32)] };
};

const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt32LE(0) >= Math.floor(MX0 / 16) && k.readInt32LE(0) <= Math.floor(MX1 / 16) && k.readInt32LE(4) >= Math.floor(MZ0 / 16) && k.readInt32LE(4) <= Math.floor(MZ1 / 16) && k.readInt8(9) >= 1 && k.readInt8(9) <= 2);
const cache = new Map<string, number>();
const things: (string | number)[][] = [];
let blocks = 0;
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), scx = b.readInt32LE(0), scz = b.readInt32LE(4), scy = b.readInt8(9);
  const sc = readSubChunk(e.value); if (!sc) continue;
  const ids = sc.palette.map((p) => { const key = p.name + JSON.stringify(p.states); let v = cache.get(key); if (v === undefined) { v = mapBlock(p); cache.set(key, v); } return v; });
  const props = sc.palette.map((p) => { const pr = propOf(p); return pr ? { ...pr, ry: facingOf(p.states) } : null; });
  for (let i = 0; i < 4096; i++) {
    const lx = i >> 8, lz = (i >> 4) & 15, ly = i & 15, mx = scx * 16 + lx, mz = scz * 16 + lz, my = scy * 16 + ly;
    if (mx < MX0 || mx > MX1 || mz < MZ0 || mz > MZ1 || my < MY0 || my > MY1) continue;
    let id = ids[sc.idx[i]];
    const pr = props[sc.idx[i]];
    if (pr && (SOLID_T.has(pr.t) || (pr.t === 'furn' && SOLID_ITEM.has(pr.item ?? '')))) id = B.Barrier;
    if (id === B.Air && sc.water && sc.water[i]) id = B.Water;
    const [gx, gz] = toGame(mx, mz), gy = gyOf(my);
    const { d, c } = col(gx, gz);
    if (c[gy] !== id) { c[gy] = id; d.dirty = true; }
    blocks++;
    if (pr) things.push([pr.t === 'door' ? 'mcdoor' : pr.t, gx + 0.5, gy, gz + 0.5, Math.round((pr.ry - Math.PI / 2) * 100) / 100, pr.item ?? pr.h ?? 0]);
  }
}
db.clear();
// its lowest rooms stood on a floor at Minecraft 24, under the part brought up: a flagstone floor laid where its bottom is open
const [fx0, fz0] = toGame(MX0, MZ0), [fx1, fz1] = toGame(MX1, MZ1);
for (let x = Math.min(fx0, fx1); x <= Math.max(fx0, fx1); x++) for (let z = Math.min(fz0, fz1); z <= Math.max(fz0, fz1); z++) {
  const { d, c } = col(x, z);
  if (c[0] === B.Air || c[0] === B.Water) { c[0] = (x + z) % 3 ? B.Flagstone : B.StoneBrick; d.dirty = true; }
}
// the way in from the pit: a doorway three wide through its west wall, a step down inside
for (const z of [2451, 2452, 2453]) {
  const { d, c } = col(-3403, z);
  c[1] = B.StoneBrick; for (let y = 2; y <= 4; y++) c[y] = B.Air; c[5] = B.CarvedStone; d.dirty = true;
}

let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts: number[] = [];
  for (const c of d.cols) { const runs: number[] = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
// its things among the owner's (once: anything already in its box from an earlier run is replaced)
const [ax, az] = toGame(MX0, MZ0), [bx, bz] = toGame(MX1, MZ1);
const gx0 = Math.min(ax, bx), gx1 = Math.max(ax, bx), gz0 = Math.min(az, bz), gz1 = Math.max(az, bz);
const SF = 'src/data/mcSigns.ts'; let s = fs.readFileSync(SF, 'utf8');
const a = s.indexOf('export const MC_THINGS'), st = s.indexOf('[', s.indexOf('=', a)), en = s.indexOf('];', st) + 1;
const keep = (JSON.parse(s.slice(st, en)) as (string | number)[][]).filter((t) => !(+t[1] >= gx0 && +t[1] <= gx1 + 1 && +t[3] >= gz0 && +t[3] <= gz1 + 1 && +t[2] <= gyOf(MY1)));
s = s.slice(0, st) + JSON.stringify(keep.concat(things)) + s.slice(en);
fs.writeFileSync(SF, s);
console.log('temple lifted', { blocks, things: things.length, files: n, box: [gx0, gz0, gx1, gz1], y: [gyOf(MY0), gyOf(MY1)] });
