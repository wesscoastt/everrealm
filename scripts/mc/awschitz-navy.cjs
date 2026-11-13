// Awschitz's military dock and kitchen beds (owner 2026-11-13, with screenshots: "put the giant military dock here",
// the shore north of the fort's north wall, out from the owner's own plank pad; "put crops here", the owner's little
// grid of paths in the yard). Run after scripts/mc/awschitz.cjs; safe to run again (it only sets blocks to what
// they should be). Its props and people are data/content/awschitz.ts (AWSCHITZ_NAVY_PROPS, the dock's garrison).
//
// The dock: a stone mole eighteen wide carried on from the owner's pad north over the dunes and out into the sea, a
// sea wall with merlons along its west side for the weather, a T-head across its end with a gun parapet facing the
// open water, a watchtower at the T-head's west end and a beacon at its east, timber berths east and west for the
// warships, and a store by the shore.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, BRICK = id('StoneBrick'), MOSSY = id('MossyStone'), CARVED = id('CarvedStone'), FLAG = id('Flagstone'), PLANKS = id('Planks'), DARK = id('DarkPlanks'),
  LOG = id('OakLog'), WATER = id('Water'), GLASS = id('Window'), GRASS = id('Grass'), FARM = id('Farmland'), GLOW = id('Glowstone'), FLOWER = id('FlowerGrass');
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
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const stone = (x, y, z) => (hash(x, y, z) < (y <= 15 ? 0.16 : 0.07) ? MOSSY : BRICK);
const box = (x0, y0, z0, x1, y1, z1, b) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = y0; y <= y1; y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, typeof b === 'function' ? b(x, y, z) : b); };
/** Stone from the sea bed (or the ground) up to the deck at 15, flagged on top, the air cleared above. */
const pier = (x0, z0, x1, z1, top = FLAG) => {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
    let y = 14; while (y > 0 && (get(x, y, z) === WATER || get(x, y, z) === AIR || get(x, y, z) === GRASS)) y--;
    box(x, y + 1, z, x, 14, z, stone);
    set(x, 15, z, typeof top === 'function' ? top(x, 15, z) : top);
    box(x, 16, z, x, 30, z, AIR);
  }
};
/** A parapet along a line: two high, merlons on every other block above. */
const parapet = (x0, z0, x1, z1, gaps = []) => {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) {
    if (gaps.some(([a, b]) => (x0 === x1 ? z : x) >= a && (x0 === x1 ? z : x) <= b)) continue;
    set(x, 16, z, stone(x, 16, z)); set(x, 17, z, stone(x, 17, z));
    if ((x + z) % 2 === 0) set(x, 18, z, BRICK); else set(x, 18, z, AIR);
  }
};

// ---------------------------------------------------------------- the dock
const MX0 = -3450, MX1 = -3433, MZ0 = 1856, MZ1 = 1922; // the mole
const TX0 = -3474, TX1 = -3410, TZ0 = 1846, TZ1 = 1855; // the T-head
pier(MX0, MZ0, MX1, MZ1, (x, y, z) => (x === MX0 || x === MX1 ? CARVED : FLAG));
pier(TX0, TZ0, TX1, TZ1, (x, y, z) => (z === TZ0 || x === TX0 || x === TX1 ? CARVED : FLAG));
// the sea wall down the mole's weather side, open where the west berth leaves it; the gun parapet along the T-head's sea face
pier(MX0 - 1, MZ0, MX0 - 1, MZ1, BRICK);
parapet(MX0 - 1, MZ0, MX0 - 1, 1916, [[1876, 1879]]);
pier(TX0, TZ0 - 1, TX1, TZ0 - 1, BRICK);
parapet(TX0, TZ0 - 1, TX1, TZ0 - 1);
parapet(TX0 - 1, TZ0 - 1, TX0 - 1, TZ1);
// The watchtower at the T-head's west end: seven square, a floor at 22, windows, crenels, its door to the east
{
  const x0 = TX0, z0 = TZ0, x1 = TX0 + 6, z1 = TZ0 + 6;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    for (let y = 16; y <= 27; y++) set(x, y, z, edge ? stone(x, y, z) : y === 22 ? DARK : AIR);
    set(x, 28, z, edge && (x + z) % 2 === 0 ? BRICK : AIR);
    if (!edge) set(x, 28, z, AIR);
  }
  box(x0 + 1, 27, z0 + 1, x1 - 1, 27, z1 - 1, PLANKS); // its roof, stood on behind the crenels
  for (const [x, z] of [[x0 + 3, z0], [x0 + 3, z1], [x0, z0 + 3]]) { set(x, 19, z, GLASS); set(x, 24, z, GLASS); }
  for (let z = z0 + 2; z <= z0 + 4; z++) for (let y = 16; y <= 18; y++) set(x1, y, z, AIR);
  set(x1, 24, z0 + 3, GLASS);
}
// The beacon at the T-head's east end
box(TX1 - 2, 16, TZ0, TX1, 18, TZ0 + 2, stone);
set(TX1 - 1, 19, TZ0 + 1, GLOW);
// The berths: timber decks on log piles, east (the big ship) and west (through the sea wall)
const deck = (x0, z0, x1, z1) => box(x0, 15, z0, x1, 15, z1, (x, y, z) => (hash(x, y, z) < 0.15 ? DARK : PLANKS));
const pile = (x, z) => { let y = 14; while (y > 1 && (get(x, y, z) === WATER || get(x, y, z) === AIR)) y--; box(x, y + 1, z, x, 15, z, LOG); set(x, 16, z, LOG); };
deck(MX1 + 1, 1896, -3404, 1899);
for (let x = MX1 + 3; x <= -3404; x += 4) { pile(x, 1896); pile(x, 1899); }
deck(-3478, 1876, MX0 - 2, 1879);
box(MX0 - 1, 15, 1876, MX0 - 1, 15, 1879, PLANKS);
for (let x = -3478; x <= MX0 - 3; x += 4) { pile(x, 1876); pile(x, 1879); }
// The store by the shore: stone, a door to the mole's walk, windows north and south; its roof is a prop
{
  const x0 = MX0 + 1, z0 = 1906, x1 = MX0 + 9, z1 = 1914;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const edge = x === x0 || x === x1 || z === z0 || z === z1;
    for (let y = 16; y <= 20; y++) set(x, y, z, edge ? stone(x, y, z) : AIR);
  }
  for (let z = 1909; z <= 1911; z++) { set(x1, 16, z, AIR); set(x1, 17, z, AIR); }
  for (const x of [x0 + 2, x0 + 6]) { set(x, 18, z0, GLASS); set(x, 18, z1, GLASS); }
}

// ---------------------------------------------------------------- the kitchen beds in the yard
// The grass the owner's paths enclose (scripts' map: the little grid at -3421..-3413, 1965..1970), dug for crops
let beds = 0;
for (let z = 1965; z <= 1970; z++) {
  const row = [];
  for (let x = -3421; x <= -3412; x++) row.push(get(x, 15, z) === id('Path') ? 'p' : get(x, 15, z) === GRASS || get(x, 15, z) === FLOWER || get(x, 15, z) === FARM ? 'g' : '?');
  // a run of grass with path at both ends
  for (let i = 0; i < row.length; i++) {
    if (row[i] !== 'g' || i === 0 || row[i - 1] !== 'p') continue;
    let j = i; while (j < row.length && row[j] === 'g') j++;
    if (j < row.length && row[j] === 'p') for (let k = i; k < j; k++) { set(-3421 + k, 15, z, FARM); box(-3421 + k, 16, z, -3421 + k, 17, z, AIR); beds++; }
    i = j;
  }
}

let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}
console.log('Awschitz navy: ' + n + ' chunk files, ' + beds + ' bed cells dug');
