// The King's own chair (owner 2026-11-13: "I had the Verandah king's chair prebuilt, you put him in one in the doorway. Put him
// in the one I made in front of him, or replace it with yours since it looks better"). Their chair stood at the top of the red
// carpet, a seat with arms and a tall back of dark planks, and came over as blocks; this takes those blocks out so the game's
// throne stands in the same place (data/content/verandahCourt.ts THRONE). Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
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
// the chair: three wide, two deep, from the floor up to the top of its back
for (let x = -3066; x <= -3064; x++) for (let z = 1910; z <= 1911; z++) for (let y = 30; y <= 33; y++) {
  const { d, c } = cell(x, z);
  if (/^(DarkPlanks|Blackstone)$/.test(names[c[y]] ?? '')) { c[y] = 0; d.dirty = true; }
}
let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}
console.log('the King\'s chair: ' + n + ' chunk files');
