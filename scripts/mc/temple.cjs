// The temple in the pit (owner 2026-11-06: "a temple in a hole I want to use as a dungeon"; Minecraft -165, 56, 1334).
// The owner's temple stands at Minecraft 30 to 40, under the floor the game's world reaches (Minecraft 47), so it
// can't come through: this builds the game's own in its place, on the pit's floor, in the owner's manner (stone
// brick, carved pillars, moss, grass round its foot), and a stair cut down the pit's south side. Run after
// scripts/mc/export.ts (node scripts/mc/temple.cjs); data/content/sunkenTemple.ts puts its dead in it.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, STONE = id('Stone'), GRASS = id('Grass'), DIRT = id('Dirt'), BRICK = id('StoneBrick'), MOSSY = id('MossyStone'), CARVED = id('CarvedStone'), COBBLE = id('MossyCobble');
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
const top = (x, z) => { const c = cell(x, z).c; for (let y = 111; y >= 0; y--) if (c[y]) return y; return -1; };
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wall = (x, y, z) => (hash(x, y, z) < 0.22 ? MOSSY : BRICK);

// The pit's floor: grass over earth over stone, where nothing else stands
let floor = 0;
for (let x = -3437; x <= -3401; x++) for (let z = 2428; z <= 2474; z++) if (top(x, z) <= 1) { set(x, 0, z, STONE); set(x, 1, z, hash(x, 1, z) < 0.12 ? COBBLE : GRASS); floor++; }

// The temple, against the pit's north wall, its face to the south: x -3426..-3414, z 2432..2444
const X0 = -3426, X1 = -3414, Z0 = 2432, Z1 = 2444, F = 1, H = 9;
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
  set(x, F, z, (x + z) % 2 ? BRICK : CARVED); // the floor, chequered
  const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
  for (let y = F + 1; y <= F + H; y++) set(x, y, z, edge ? wall(x, y, z) : AIR);
  set(x, F + H + 1, z, BRICK); // the roof
  if (edge && (x + z) % 2 === 0) set(x, F + H + 2, z, MOSSY); // the parapet, toothed
}
// carved pillars at the corners and along the face, standing proud of it
for (const x of [X0, X0 + 3, X0 + 6, X0 + 9, X1]) for (let y = F + 1; y <= F + H + 1; y++) { set(x, y, Z1, CARVED); if (y <= F + H) set(x, y, Z1 + 1, CARVED); }
for (const x of [X0, X1]) for (let y = F + 1; y <= F + H + 1; y++) set(x, y, Z0, CARVED);
// the door in the face: three wide, four high, between the middle pillars
for (let x = X0 + 5; x <= X0 + 7; x++) for (let y = F + 1; y <= F + 4; y++) { set(x, y, Z1, AIR); set(x, y, Z1 + 1, AIR); }
for (let x = X0 + 4; x <= X0 + 8; x++) set(x, F + 5, Z1 + 1, CARVED); // the lintel
// the inner wall between the hall and the sanctum, with its arch
for (let x = X0 + 1; x < X1; x++) for (let y = F + 1; y <= F + H; y++) set(x, y, Z0 + 5, x >= X0 + 5 && x <= X0 + 7 && y <= F + 4 ? AIR : wall(x, y, Z0 + 5));
// pillars down the hall
for (const [x, z] of [[X0 + 2, Z0 + 8], [X1 - 2, Z0 + 8], [X0 + 2, Z0 + 11], [X1 - 2, Z0 + 11]]) for (let y = F + 1; y <= F + H; y++) set(x, y, z, CARVED);
// the altar in the sanctum
for (let x = X0 + 5; x <= X0 + 7; x++) set(x, F + 1, Z0 + 1, CARVED);
// the steps up to the door
for (let x = X0 + 3; x <= X0 + 9; x++) { set(x, F, Z1 + 2, BRICK); set(x, F, Z1 + 3, BRICK); }

// The stair down the pit's south side, cut into the rim: x -3411..-3409, from the rim northward to the floor
const SX = [-3411, -3410, -3409];
let z = 2477, y = Math.max(...SX.map((x) => top(x, z))) + 1, steps = 0;
while (y > F + 1 && steps < 40) {
  for (const x of SX) {
    for (let k = 0; k < y; k++) if (!get(x, k, z) || k >= y - 1) set(x, k, z, k === y - 1 ? BRICK : get(x, k, z) || STONE);
    for (let k = y; k < y + 4 && k < 112; k++) set(x, k, z, AIR);
  }
  // the stair's walls on the pit side, knee-high
  for (const x of [SX[0] - 1, SX[2] + 1]) if (top(x, z) < y) { for (let k = 0; k <= y; k++) if (!get(x, k, z)) set(x, k, z, BRICK); }
  z--; y--; steps++;
}

let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
console.log({ floor, steps, stairBottom: [SX[1], y, z], files: n });
