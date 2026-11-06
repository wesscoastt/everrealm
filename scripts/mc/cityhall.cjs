// Verandah's City Hall, repaired where it stands (owner 2026-11-06: "restore the City Hall building: it came over broken
// and missing walls; fix it yourself if needed"). The owner built it on the diagonal; its plank floor with the brown
// tile pattern and the stone-brick foot of its tower came through, its walls didn't. This raises whitestone walls round
// the floor's edge (its steps follow the diagonal), windows in them, a dark plank roof over it, and the door at its
// south end by the sign; nothing the owner's import put there is overwritten. Run after scripts/mc/export.ts.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, WHITE = id('Whitestone'), GLASS = id('Glass'), DARK = id('DarkPlanks'), CARVED = id('CarvedStone'), LOG = id('OakLog'), PLANKS = id('Planks'), TERRA = id('TerraBrown');
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
const col = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] }; };
const get = (x, y, z) => col(x, z).c[y];
const set = (x, y, z, b) => { const { d, c } = col(x, z); if (c[y] !== b) { c[y] = b; d.dirty = true; } };
const fill = (x, y, z, b) => { if (!get(x, y, z)) set(x, y, z, b); }; // only where the import left air

const FL = 24, X0 = -2980, X1 = -2952, Z0 = 2070, Z1 = 2094;
const floor = new Set();
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) { const b = get(x, FL, z); if (b === PLANKS || b === TERRA) floor.add(x + ',' + z); }
const isF = (x, z) => floor.has(x + ',' + z);
const TOP = FL + 6; // walls 25..30
let walls = 0;
for (const k of floor) {
  const [x, z] = k.split(',').map(Number);
  const edge = !isF(x + 1, z) || !isF(x - 1, z) || !isF(x, z + 1) || !isF(x, z - 1);
  if (edge) {
    const corner = [!isF(x + 1, z), !isF(x - 1, z), !isF(x, z + 1), !isF(x, z - 1)].filter(Boolean).length >= 2;
    for (let y = FL + 1; y <= TOP; y++) fill(x, y, z, corner ? LOG : (y === FL + 2 || y === FL + 3) && (x + z) % 3 === 0 ? GLASS : WHITE);
    fill(x, TOP + 1, z, CARVED);
    walls++;
  } else fill(x, TOP + 1, z, DARK);
}
// the roof pitched a little: a second course over the inner part
for (const k of floor) {
  const [x, z] = k.split(',').map(Number);
  let inner = true; for (let dx = -2; dx <= 2 && inner; dx++) for (let dz = -2; dz <= 2; dz++) if (!isF(x + dx, z + dz)) { inner = false; break; }
  if (inner) fill(x, TOP + 2, z, DARK);
}
// nothing of the roof left without support (owner 2026-11-06: "the roof is floating, add support"): oak posts on a grid
// through the hall, and an oak post under any roof block at the edge that has no wall beneath it
let posts = 0;
for (const k of floor) {
  const [x, z] = k.split(',').map(Number);
  const open = () => { for (let y = FL + 1; y <= TOP; y++) if (get(x, y, z)) return false; return true; };
  const roofed = get(x, TOP + 1, z) || get(x, TOP + 2, z);
  const nearEdge = !isF(x + 1, z) || !isF(x - 1, z) || !isF(x, z + 1) || !isF(x, z - 1);
  if (roofed && open() && ((x % 4 === 0 && z % 4 === 0) || nearEdge)) { for (let y = FL + 1; y <= TOP; y++) set(x, y, z, LOG); posts++; }
}
// and any roof the import left over open ground round the hall: a post down to the ground under each corner of it
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
  if (isF(x, z)) continue;
  for (let y = TOP + 2; y >= FL + 2; y--) {
    const b = get(x, y, z); if (!b || b === GLASS) continue; if (![DARK, PLANKS, WHITE, CARVED, TERRA].includes(b)) break;
    let g = y - 1; while (g > 0 && !get(x, g, z)) g--;
    if (y - g > 2 && (x + z) % 3 === 0) { for (let k = g + 1; k < y; k++) set(x, k, z, LOG); posts++; }
    break;
  }
}
console.log('posts', posts);
// the stone well west of the hall (owner 2026-11-06: "the stone well on the left, its moss roof is floating"): its posts
// didn't come through; oak posts at its four corners, up to the roof
for (const [x, z] of [[-2992, 2075], [-2989, 2075], [-2992, 2080], [-2989, 2080]]) {
  let y = 18; while (y < 40 && get(x, y + 1, z)) y++;               // the ground
  let top = y + 1; while (top < 40 && !get(x, top, z)) top++;       // the roof's underside over it
  if (top >= 40) continue;
  for (let k = y + 1; k < top; k++) set(x, k, z, LOG);
}
// the door at the south end, toward the sign: the southernmost edge cells, two high
const south = [...floor].map((k) => k.split(',').map(Number)).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 2);
for (const [x, z] of south) for (let y = FL + 1; y <= FL + 3; y++) set(x, y, z, AIR);

let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
console.log('City Hall repaired', { floor: floor.size, walls, door: south, files: n });
