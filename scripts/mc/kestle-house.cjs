// The owner's unfinished house on the hill above No. 1, Kestle, finished in their own style (owner 2026-11-13: "the unfinished
// wood building above the house I gave Billie Eyelash, on the mountain by my house: finish that building with the style I was
// going with and make it a decent size house. I'm going to give it to a new player"). What they built: a frame thirty-six by
// thirteen, pine-log posts every four blocks with dark-plank walls between and a gap for a window in each bay, a pine beam
// round the top at the height of a storey, two doorways front and back, an inside wall begun, and the second storey's walls
// begun on the west and the south. This finishes it the way they were going: the ground floor boarded, the windows glazed,
// the inside wall carried across with a doorway, a stair up and the upper floor laid on their beam, the second storey's walls
// all round with their windows and a beam on top, and a gabled roof of dark planks with a pine ridge. It's a home for the
// homes book: data/verandahHomes.ts 'vk1', "No. 1, Kestle Heights". Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, LOG = id('PineLog'), PLANK = id('DarkPlanks'), GLASS = id('Glass');
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

// The frame: walls on x -2511 and -2476, z 2307 and 2319; the ground floor stood on at 36, the beam at 39
const X0 = -2511, X1 = -2476, Z0 = 2307, Z1 = 2319, F = 36, BEAM = 39;
const POSTS_X = [-2511, -2507, -2503, -2499, -2495, -2492, -2488, -2484, -2480, -2476];
const POSTS_Z = [2307, 2311, 2315, 2319];
const DOORS = [[-2494, Z0], [-2493, Z0], [-2494, Z1], [-2493, Z1]];
const isDoor = (x, z) => DOORS.some(([a, b]) => a === x && b === z);
const onWall = (x, z) => x === X0 || x === X1 || z === Z0 || z === Z1;
const isPost = (x, z) => (z === Z0 || z === Z1 ? POSTS_X.includes(x) : POSTS_Z.includes(z));
// a bay's window: the middle of the three planks between two posts (the owner's gaps), on the long walls; on the short ones, one each side
const isWindow = (x, z) => {
  if (z === Z0 || z === Z1) { const i = POSTS_X.findIndex((p) => p > x); if (i <= 0) return false; const a = POSTS_X[i - 1], b = POSTS_X[i]; return b - a === 4 && x === a + 2; }
  return (x === X0 || x === X1) && (z === 2309 || z === 2313 || z === 2317);
};

// 1. the ground floor boarded, the rooms cleared to the beam
for (let x = X0 + 1; x < X1; x++) for (let z = Z0 + 1; z < Z1; z++) {
  set(x, F - 1, z, PLANK);
  for (let y = F; y < BEAM; y++) { const b = get(x, y, z); if (b !== LOG && b !== PLANK && b !== AIR) continue; if (x !== -2499) set(x, y, z, AIR); }
}
// 2. the walls: the ground storey's windows glazed; the storey above built all round in the same way, windows in the same bays
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
  if (!onWall(x, z)) continue;
  if (isWindow(x, z)) set(x, F + 1, z, GLASS);
  for (let y = BEAM + 1; y <= BEAM + 3; y++) set(x, y, z, isPost(x, z) ? LOG : y === BEAM + 2 && isWindow(x, z) ? GLASS : PLANK);
  set(x, BEAM + 4, z, LOG); // the beam on top
  if (isDoor(x, z)) { set(x, F, z, AIR); set(x, F + 1, z, AIR); }
}
// 3. the inside wall the owner began, carried across, with a doorway in the middle
for (let z = Z0 + 1; z < Z1; z++) for (let y = F; y < BEAM; y++) set(-2499, y, z, z === 2312 || z === 2313 ? (y < F + 2 ? AIR : PLANK) : PLANK);
// 4. the upper floor on the beam, a stairwell left at the north wall's east end, and the stair up to it
for (let x = X0 + 1; x < X1; x++) for (let z = Z0 + 1; z < Z1; z++) {
  const well = x >= -2490 && x <= -2487 && z <= Z0 + 2;
  set(x, BEAM, z, well ? AIR : PLANK);
  for (let y = BEAM + 1; y <= BEAM + 3; y++) set(x, y, z, AIR);
}
for (const [x, y] of [[-2489, F], [-2488, F + 1], [-2487, F + 2]]) for (const z of [Z0 + 1, Z0 + 2]) { set(x, y, z, PLANK); for (let k = y - 1; k >= F; k--) set(x, k, z, PLANK); }
// 5. the roof: gabled across the short side, a step at a time from the eaves (overhanging a block) up to a pine ridge
const EAVE = BEAM + 5; // 44
for (let k = 0; k <= 7; k++) {
  const y = EAVE + k;
  for (let x = X0 - 1; x <= X1 + 1; x++) {
    if (k < 7) { set(x, y, Z0 - 1 + k, PLANK); set(x, y, Z1 + 1 - k, PLANK); }
    else set(x, y, Z0 - 1 + k, LOG);
  }
  // the gable ends, filled in under the roof, a window in each
  if (k < 7) for (const x of [X0, X1]) for (let z = Z0 + k; z <= Z1 - k; z++) set(x, y, z, k === 2 && Math.abs(z - 2313) <= 1 ? GLASS : PLANK);
}

let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}
console.log('Kestle Heights: ' + n + ' chunk files');
