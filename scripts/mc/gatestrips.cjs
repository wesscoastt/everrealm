// The strips of stone left hanging over Verandah's gates (owner 2026-11-07: "each Verandah entrance has a strip of stone
// floating, remove them"): what came through of the owner's slabs over the main gate's road and the east gate's arch.
// Run after scripts/mc/export.ts (node scripts/mc/gatestrips.cjs).
const fs = require('fs'), zlib = require('zlib');
const STONE = 3;
const strips = [
  { y: 30, cells: [...Array(11).keys()].map((i) => [-3084 + i, 2143]) }, // the main gate, over the road inside
  { y: 25, cells: [...Array(11).keys()].map((i) => [-2756, 2128 + i]) }, // the east gate, across its arch
];
const files = new Map();
const load = (fn) => { if (!files.has(fn)) { const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = []; for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); } files.set(fn, { cols, rest: f.subarray(p), dirty: false }); } return files.get(fn); };
let n = 0;
for (const s of strips) for (const [x, z] of s.cells) {
  const cx = Math.floor(x / 32), cz = Math.floor(z / 32), d = load(cx + '_' + cz + '.bin'), c = d.cols[(z - cz * 32) * 32 + (x - cx * 32)];
  // only a stone block with air under it (so nothing that stands on the ground is touched)
  if (c[s.y] === STONE && !c[s.y - 1] && !c[s.y - 2]) { c[s.y] = 0; d.dirty = true; n++; }
}
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 }));
}
console.log('gate strips removed', n);
