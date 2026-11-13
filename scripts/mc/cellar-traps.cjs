// The owner's cellar trapdoors (owner 2026-11-13: "fix my trap doors for my house cellar, it's blocks of wood planks right now,
// just remove them"): the two closed spruce trapdoors over the stair down to the chest room under their house came over as
// blocks of planks (scripts/mc/traps.ts found them in the world); taken out, so the way down is open. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const files = new Map();
const load = (cx, cz) => { const fn = cx + '_' + cz + '.bin'; if (!files.has(fn)) { const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = []; for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); } files.set(fn, { cols, rest: f.subarray(p), dirty: false }); } return files.get(fn); };
const cell = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] }; };
for (const [x, y, z] of [[-2463, 16, 2394], [-2464, 16, 2394]]) {
  const { d, c } = cell(x, z);
  console.log(x, y, z, 'was', names[c[y]] ?? 'Air');
  if (/Planks|Timber/.test(names[c[y]] ?? '')) { c[y] = 0; d.dirty = true; }
}
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 }));
  console.log('wrote', fn);
}
