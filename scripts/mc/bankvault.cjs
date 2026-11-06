// The vault under the Bank of Verandah (owner 2026-11-05: "make the vault under the bank in Verandah detailed").
// The owner's bank had earth under its floor: this digs the strongroom there, lined in stone brick, and a stair down
// to it from the banking hall along its north side. Run after scripts/mc/export.ts (node scripts/mc/bankvault.cjs);
// its furnishings and the way into your vault are data/content/verandahHalls.ts and world/sites.ts 'ver-bankvault'.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, BRICK = id('StoneBrick'), CARVED = id('CarvedStone'), FLAG = id('Flagstone');
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
const set = (x, y, z, b) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); const c = d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)]; if (c[y] !== b) { c[y] = b; d.dirty = true; } };

const X0 = -2999, X1 = -2990, Z0 = 2110, Z1 = 2117, FLOOR = 14, CEIL = 19;
// the walls and the strongroom's own floor and ceiling, all of stone
for (let x = X0 - 1; x <= X1 + 1; x++) for (let z = Z0 - 1; z <= Z1 + 1; z++) for (let y = FLOOR; y <= CEIL; y++) set(x, y, z, BRICK);
// the room: a flagstone floor, the air, carved pillars at its corners
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) { set(x, FLOOR, z, (x + z) % 3 ? FLAG : CARVED); for (let y = FLOOR + 1; y < CEIL; y++) set(x, y, z, AIR); }
for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) for (let y = FLOOR + 1; y < CEIL; y++) set(x, y, z, CARVED);
// the stair down from the banking hall (its floor at 20, stood on at 21), stepping west along the north side
for (let k = 1; k <= 6; k++) {
  const x = X1 - k + 1, stand = 21 - k;
  for (const z of [Z1 - 1, Z1]) {
    for (let y = FLOOR; y < stand; y++) set(x, y, z, BRICK);
    for (let y = stand; y <= 20; y++) set(x, y, z, AIR);
  }
}
let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
console.log('vault dug', { files: n });
