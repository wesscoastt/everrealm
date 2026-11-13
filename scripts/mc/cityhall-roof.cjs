// Over the City Hall (owner 2026-11-12: "fix the floating stuff above the city hall in Verandah"): a copper and brass shape
// hanging two dozen blocks over the roof, with a barrier and a tuft of leaves, left from the owner's own hall when it was built
// again (scripts/mc/cityhall.cjs) — taken out; and the hall's hipped roof, whose courses met only at their corners and left
// the top open, so it looked to hover over the walls, made solid: each course stepped down onto the one below, and the top
// closed with a carved ridge. Run after cityhall.cjs. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const DARK = id('DarkPlanks'), CARVED = id('CarvedStone');
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
const cell = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] }; };
const get = (x, y, z) => cell(x, z).c[y];
const set = (x, y, z, b) => { const { d, c } = cell(x, z); if (c[y] !== b) { c[y] = b; d.dirty = true; } };

// 1. what hangs in the air over the hall
const FLOAT = new Set(['Copper', 'Brass', 'Barrier', 'OakLeaves', 'BirchLeaves'].map(id));
for (let x = -2990; x <= -2944; x++) for (let z = 2060; z <= 2102; z++) for (let y = 30; y < 112; y++) {
  const b = get(x, y, z);
  if (!FLOAT.has(b)) continue;
  if (y < 50 && !(b === id('OakLeaves') || b === id('BirchLeaves')) ) continue; // (only the leaves hang low)
  if (y < 50 && !(x >= -2985 && x <= -2982 && z >= 2077 && z <= 2084)) continue;
  set(x, y, z, 0);
}
// 2. the roof (cityhall.cjs: walls x -2979..-2955, z 2071..2091, the first course at 32 a block out from them)
const X0 = -2979, X1 = -2955, Z0 = 2071, Z1 = 2091, Y = 32;
let k = 0;
for (; ; k++) {
  const a = X0 - 1 + k, b = X1 + 1 - k, c = Z0 - 1 + k, d = Z1 + 1 - k, y = Y + k;
  if (a > b || c > d) break;
  const ring = (x, z) => x === a || x === b || z === c || z === d;
  for (let x = a; x <= b; x++) for (let z = c; z <= d; z++) {
    if (!ring(x, z)) continue;
    set(x, y, z, c === d || a === b ? CARVED : DARK);
    if (k > 0) set(x, y - 1, z, DARK); // the step under it, so each course sits on the last
  }
  if (b - a <= 2 || d - c <= 2) { for (let x = a; x <= b; x++) for (let z = c; z <= d; z++) set(x, y, z, CARVED); break; } // the ridge
}
let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}
console.log('City Hall roof: ' + n + ' chunk files, ridge at ' + (Y + k));
