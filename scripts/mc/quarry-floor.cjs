// The Verandah quarry's floor (owner 2026-11-12: "the bottom of the Verandah quarry turns into a void of sky"): where the
// owner's pit went on below the lowest height the export reads (scripts/mc/quarrydeep.ts), its columns came over with no
// floor at all, open to the bottom of the world. Each is given a floor of stone, at the height of the pit floor round it
// (spread in from the columns that have one), with the rock under it. Run after quarrydeep.ts. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => names.indexOf(n);
const MINY = -24, H = 25, STONE = id('Stone'), GRAVEL = id('Gravel'), WATER = id('Water');
const files = new Map(), cols = new Map();
for (const fn of fs.readdirSync('public/mcland/deep')) {
  const [cx, cz] = fn.replace('.bin', '').split('_').map(Number);
  const d = zlib.inflateRawSync(fs.readFileSync('public/mcland/deep/' + fn)); let q = 0; const list = [];
  for (let c = 0; c < 1024; c++) {
    const n = d[q++]; if (n === 255) { list.push(null); continue; }
    const col = new Uint8Array(H);
    for (let k = 0; k < n; k++) { const y = d[q++], l = d[q++], b = d[q++]; for (let j = 0; j < l; j++) if (y + j < H) col[y + j] = b; }
    list.push(col); cols.set((cx * 32 + (c % 32)) + ',' + (cz * 32 + Math.floor(c / 32)), col);
  }
  files.set(fn, list);
}
const solid = (b) => b && b !== WATER;
// a column's floor: scanning down from the old foot, the first solid block
const floorOf = (col) => { for (let i = H - 1; i >= 0; i--) if (solid(col[i])) return i; return -1; };
const known = new Map(), todo = [];
for (const [k, col] of cols) { const f = floorOf(col); if (f >= 0) known.set(k, f); else todo.push(k); }
let left = todo.slice(), guard = 0;
while (left.length && guard++ < 200) {
  const next = [];
  for (const k of left) {
    const [x, z] = k.split(',').map(Number); const fs2 = [];
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const f = known.get((x + a) + ',' + (z + b)); if (f !== undefined) fs2.push(f); }
    if (!fs2.length) { next.push(k); continue; }
    known.set(k, Math.round(fs2.reduce((s, v) => s + v, 0) / fs2.length));
  }
  if (next.length === left.length) { for (const k of next) known.set(k, 3); break; }
  left = next;
}
for (const k of todo) { const col = cols.get(k), f = known.get(k); for (let i = 0; i <= f; i++) if (!solid(col[i])) col[i] = i === f && (k.length % 3 === 0) ? GRAVEL : STONE; }
for (const [fn, list] of files) {
  const parts = [];
  for (const col of list) {
    if (!col) { parts.push(Buffer.from([255])); continue; }
    const runs = []; let y = 0;
    while (y < H) { if (!col[y]) { y++; continue; } let l = 1; while (y + l < H && col[y + l] === col[y]) l++; runs.push(y, l, col[y]); y += l; }
    parts.push(Buffer.from([runs.length / 3, ...runs]));
  }
  fs.writeFileSync('public/mcland/deep/' + fn, zlib.deflateRawSync(Buffer.concat(parts), { level: 9 }));
}
console.log('the quarry floor: ' + todo.length + ' columns floored');

// The waterfall (owner 2026-11-12: "fix the waterfall in the quarry too"): the owner's stream comes down the north face a
// step at a time and fell short of the floor, ending in the air at the old foot. It now runs on down into a pool cut in
// the pit floor at its foot, two deep, stone under it.
{
  const deepFiles = new Map();
  for (const fn of fs.readdirSync('public/mcland/deep')) deepFiles.set(fn, zlib.inflateRawSync(fs.readFileSync('public/mcland/deep/' + fn)));
  const read = (fn) => { const d = deepFiles.get(fn); let q = 0; const list = []; for (let c = 0; c < 1024; c++) { const n = d[q++]; if (n === 255) { list.push(null); continue; } const col = new Uint8Array(H); for (let k = 0; k < n; k++) { const y = d[q++], l = d[q++], b = d[q++]; for (let j = 0; j < l; j++) if (y + j < H) col[y + j] = b; } list.push(col); } return list; };
  const lists = new Map([...deepFiles.keys()].map((fn) => [fn, read(fn)]));
  const at = (x, z) => { const fn = Math.floor(x / 32) + '_' + Math.floor(z / 32) + '.bin'; const l = lists.get(fn); return l ? l[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] : null; };
  let n = 0;
  for (let x = -3090; x <= -3084; x++) for (let z = 2008; z <= 2011; z++) {
    const col = at(x, z); if (!col) continue;
    const edge = x === -3090 || x === -3084 || z === 2011;
    col[H - 4] = STONE;                         // -3
    col[H - 3] = edge ? STONE : WATER;          // -2
    col[H - 2] = edge ? STONE : WATER;          // -1
    col[H - 1] = edge ? 0 : (z === 2008 && (x === -3088 || x === -3087) ? WATER : 0); // 0: where the stream meets it
    n++;
  }
  for (const [fn, list] of lists) {
    const parts = [];
    for (const col of list) { if (!col) { parts.push(Buffer.from([255])); continue; } const runs = []; let y = 0; while (y < H) { if (!col[y]) { y++; continue; } let l = 1; while (y + l < H && col[y + l] === col[y]) l++; runs.push(y, l, col[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
    fs.writeFileSync('public/mcland/deep/' + fn, zlib.deflateRawSync(Buffer.concat(parts), { level: 9 }));
  }
  console.log('the waterfall\'s pool: ' + n + ' columns');
}
