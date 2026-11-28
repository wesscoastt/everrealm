// Verandah tidied (owner 2026-11-27: "the double doors in kestle stone wall need to be removed and blocked off with stone,
// lots of left over floating torches and doors. make all fence gates not on ground in verandah area into fences to fix
// some issues"). On the owner's import (public/mcland chunks and MC_THINGS in data/mcSigns.ts):
// - a wall torch with no wall beside it (left when a house came down round it) goes;
// - a door with nothing under it, or no jamb either side at its height or the one above, goes;
// - a fence gate with nothing under it becomes a fence post, joined to the fences, gates and walls beside it (the ring
//   round the trident garden excepted: those are awnings, sites.ts TRIDENT_AWNING);
// - the three pairs of double doors in Kestle's stone wall are walled up in the wall's own stone, two blocks high.
// Safe to run again (what it removes is gone, and what it walls up stays walled). --dry to count only.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.split('=')[0].trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw new Error(n); return i; };
const AIR = 0, WATER = id('Water');
const dry = process.argv.includes('--dry');

const files = new Map();
const load = (cx, cz) => {
  const fn = cx + '_' + cz + '.bin';
  if (!files.has(fn)) {
    if (!fs.existsSync('public/mcland/' + fn)) { files.set(fn, null); return null; }
    const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = [];
    for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); }
    files.set(fn, { cols, rest: f.subarray(p), dirty: false });
  }
  return files.get(fn);
};
const cellAt = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return d ? { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] } : null; };
const get = (x, y, z) => { if (y < 0 || y > 111) return AIR; const c = cellAt(x, z); return c ? c.c[y] : AIR; };
const set = (x, y, z, b) => { if (y < 0 || y > 111) return; const c = cellAt(x, z); if (c && c.c[y] !== b) { c.c[y] = b; c.d.dirty = true; } };
const solid = (x, y, z) => { const b = get(x, y, z); return b !== AIR && b !== WATER; };

const SIGNS = 'src/data/mcSigns.ts';
const src = fs.readFileSync(SIGNS, 'utf8');
const ta = src.indexOf('export const MC_THINGS'), ts = src.indexOf('[', src.indexOf('=', ta)), te = src.indexOf(';\n', ts);
let THINGS = JSON.parse(src.slice(ts, te));
const cellKey = (t) => Math.floor(+t[1]) + ',' + t[2] + ',' + Math.floor(+t[3]);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const TRIDENT = { x0: -3094.5, x1: -3088.5, z0: 2085.5, z1: 2096.5, y: 26 };
const inTrident = (t) => +t[2] === TRIDENT.y && +t[1] >= TRIDENT.x0 && +t[1] <= TRIDENT.x1 && +t[3] >= TRIDENT.z0 && +t[3] <= TRIDENT.z1;

// Kestle's walled-up doors: the wall's own stone (the jamb beside each pair), two high
const KESTLE_WALL = [[-2353, -2352, 2352], [-2353, -2352, 2359], [-2353, -2352, 2367]];
let walled = 0;
const gone = new Set();
for (const [xa, xb, z] of KESTLE_WALL) {
  for (const t of THINGS) {
    if (t[0] !== 'mcdoor' || Math.floor(+t[3]) !== z || Math.floor(+t[1]) < xa || Math.floor(+t[1]) > xb) continue;
    const y = +t[2], stone = get(xb + 1, y + 1, z) || get(xa - 1, y + 1, z) || id('StoneBrick');
    for (let x = xa; x <= xb; x++) for (let k = 0; k < 2; k++) set(x, y + k, z, stone);
    gone.add(t); walled++;
  }
}

// Floating torches and doors
const DOORS = new Set(THINGS.filter((t) => t[0] === 'mcdoor' || t[0] === 'mcgate').map(cellKey));
let torches = 0, doors = 0;
for (const t of THINGS) {
  if (gone.has(t)) continue;
  const x = Math.floor(+t[1]), y = +t[2], z = Math.floor(+t[3]);
  if (t[0] === 'mctorch' && +t[5] === 1 && !N4.some(([a, b]) => solid(x + a, y, z + b))) { gone.add(t); torches++; }
  else if (t[0] === 'mcdoor') {
    const jamb = N4.some(([a, b]) => (solid(x + a, y, z + b) && !DOORS.has((x + a) + ',' + y + ',' + (z + b))) || solid(x + a, y + 1, z + b));
    if (!jamb || !solid(x, y - 1, z)) { gone.add(t); doors++; }
  }
}
THINGS = THINGS.filter((t) => !gone.has(t));

// Gates in the air become fence posts, joined to what's beside them
const raised = THINGS.filter((t) => t[0] === 'mcgate' && !inTrident(t) && !solid(Math.floor(+t[1]), +t[2] - 1, Math.floor(+t[3])));
for (const t of raised) { t[0] = 'mcfence'; t[4] = 0; t[5] = 0; }
const FENCES = new Set(THINGS.filter((t) => t[0] === 'mcfence' || t[0] === 'mcgate').map(cellKey));
for (const t of raised) {
  const x = Math.floor(+t[1]), y = +t[2], z = Math.floor(+t[3]);
  let mask = 0;
  for (const [bit, a, b] of [[1, 1, 0], [2, -1, 0], [4, 0, 1], [8, 0, -1]]) if (FENCES.has((x + a) + ',' + y + ',' + (z + b)) || solid(x + a, y, z + b)) mask |= bit;
  t[5] = mask;
}

console.log(`walled up ${walled} doors in Kestle's wall; floating: ${torches} torches, ${doors} doors gone; ${raised.length} raised gates made fences`);
if (dry) process.exit(0);
let n = 0;
for (const [fn, d] of files) {
  if (!d || !d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 }));
  n++;
}
fs.writeFileSync(SIGNS, src.slice(0, ts) + JSON.stringify(THINGS) + src.slice(te));
console.log(`${n} chunk file(s) written, MC_THINGS saved`);
