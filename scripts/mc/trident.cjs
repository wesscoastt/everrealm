// The trident garden inside Verandah's main gate (owner 2026-11-27: "trident statue in verandah still missing blocks",
// "canopy needs to be filled in"; where: "inside main entrance gate"). The owner's trident leans north out of the garden
// on its east side, one block thick in the plane x = -3086, and what came through the import was its stair-stepped
// shaft with every other step missing and a scatter of its head. It's raised again in the same plane, in the same stone:
// a shaft of mossy stone stepped with no gaps, a crossbar of cream terracotta square to it, three prongs of mossy stone
// on along the shaft's line, the middle one longest, and a glowcap barb at the tip of each, like the sea-glass the
// owner used. And the ring of awnings round the garden (sites.ts TRIDENT_AWNING: each raised gate there is drawn as an
// awning) had a six-block gap down each long side and one missing at the south end, so it read as six canopies; it's
// filled so the canvas runs all the way round. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.split('=')[0].trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw new Error(n); return i; };
const AIR = 0, MOSS = id('MossyStone'), GLOW = id('Glowcap'), CREAM = id('TerraCream'), BARRIER = id('Barrier'), GRASS = id('Grass');
const files = new Map();
const load = (cx, cz) => {
  const fn = cx + '_' + cz + '.bin';
  if (!files.has(fn)) {
    const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = [];
    for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); }
    files.set(fn, { cols, rest: f.subarray(p), dirty: false });
  }
  return files.get(fn);
};
const cellAt = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] }; };
const get = (x, y, z) => cellAt(x, z).c[y];
const set = (x, y, z, b) => { const { d, c } = cellAt(x, z); if (c[y] !== b) { c[y] = b; d.dirty = true; } };

const X = -3086;
// what's left of the old one (its stone, its glow, its cream, and the barriers that walled its steps)
let cleared = 0;
for (let z = 2078; z <= 2100; z++) for (let y = 23; y <= 44; y++) { const b = get(X, y, z); if (b === MOSS || b === GLOW || b === CREAM || b === BARRIER || (b === GRASS && y > 23)) { set(X, y, z, AIR); cleared++; } }
// a line of blocks stepping from (z, y) by (dz, dy) n times, each step two high so a diagonal has no gaps
const line = (z, y, dz, dy, n, b) => { for (let t = 0; t <= n; t++) { set(X, y + t * dy, z + t * dz, b); set(X, y + t * dy + 1, z + t * dz, b); } };
// the shaft: from the foot in the grass at the south, up and leaning north
const Z0 = 2097, Y0 = 23, LEN = 9;
line(Z0, Y0, -1, 1, LEN, MOSS);
const CZ = Z0 - LEN, CY = Y0 + LEN; // where the shaft meets the crossbar
// the crossbar, square to the shaft, three each way
line(CZ - 3, CY - 3, 1, 1, 6, CREAM);
// the prongs, on along the shaft's line from each end of the crossbar and from the middle; a glowcap at each tip
const prong = (z, y, n) => { line(z, y, -1, 1, n, MOSS); set(X, y + n + 2, z - n - 1, GLOW); set(X, y + n + 1, z - n - 1, GLOW); };
prong(CZ - 3, CY - 2, 3);
prong(CZ + 3, CY + 4, 3);
prong(CZ, CY + 2, 5);
// barbs: a block back from each outer tip, on the outside
set(X, CY + 3, CZ - 5, GLOW); set(X, CY + 9, CZ + 3, GLOW);

// the awnings: raised gates at the ring's height in its gaps
const SIGNS = 'src/data/mcSigns.ts';
const src = fs.readFileSync(SIGNS, 'utf8');
const ta = src.indexOf('export const MC_THINGS'), ts = src.indexOf('[', src.indexOf('=', ta)), te = src.indexOf(';\n', ts);
const THINGS = JSON.parse(src.slice(ts, te));
const have = new Set(THINGS.filter((t) => t[0] === 'mcgate' && +t[2] === 26).map((t) => t[1] + ',' + t[3]));
let added = 0;
const gate = (x, z, ry) => { if (have.has(x + ',' + z)) return; THINGS.push(['mcgate', x, 26, z, ry, 0]); have.add(x + ',' + z); added++; };
for (let z = 2088.5; z <= 2093.5; z++) { gate(-3088.5, z, 1.57); gate(-3094.5, z, -1.57); }
gate(-3091.5, 2096.5, 0);

let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 }));
  n++;
}
if (added) fs.writeFileSync(SIGNS, src.slice(0, ts) + JSON.stringify(THINGS) + src.slice(te));
console.log(`trident: ${cleared} old blocks cleared, raised again; ${added} awnings added to the ring; ${n} chunk file(s) written`);
