// The Sunken Temple's ringing chamber (owner 2026-11-13: "in the Sunken Temple I got stuck in that floor area"): lumps of cobble
// and gravel hung at head height over its floor, a block's gap under them, the room open above: walk under one and you were
// wedged between it and the floor. What hangs there with air under it and over it is taken out. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const files = new Map();
const load = (cx, cz) => { const fn = cx + '_' + cz + '.bin'; if (!files.has(fn)) { const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = []; for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); } files.set(fn, { cols, rest: f.subarray(p), dirty: false }); } return files.get(fn); };
const cell = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] }; };
let n = 0;
for (let x = -3398; x <= -3386; x++) for (let z = 2472; z <= 2482; z++) {
  const { d, c } = cell(x, z);
  if (c[1] !== 0) continue; // (the walls and what stands on the floor stay)
  // the lump: from 2 up, solid, with open air over it before the room's top
  let top = 2; while (top < 4 && c[top + 1]) top++;
  if (!c[2] || c[top + 1]) continue;
  for (let y = 2; y <= top; y++) { c[y] = 0; n++; }
  d.dirty = true;
}
let w = 0;
for (const [fn, d] of files) { if (!d.dirty) continue; const parts = []; for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); } fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); w++; }
console.log('the ringing chamber: ' + n + ' blocks taken out, ' + w + ' chunk files');
