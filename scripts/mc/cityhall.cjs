// Verandah's City Hall, built again on its own plot (owner 2026-11-06: "restore the City Hall: it came over broken and
// missing walls; fix it yourself", then "rebuild it yourself"; 2026-11-07: "overhaul the interior to look detailed").
// The owner built it on the diagonal and almost none of it came through, so the game builds it again where it stood:
// whitestone on a stone-brick plinth, oak posts, tall windows, a carved cornice, a dark plank roof hipped all round, a
// porch of carved columns over steps down to the street, a gallery inside; and oak posts under the moss roof of the
// owner's stone well beside it. Run after scripts/mc/export.ts; its furnishings are world/sites.ts 'ver-cityhall'.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, BRICK = id('StoneBrick'), WHITE = id('Whitestone'), CARVED = id('CarvedStone'), LOG = id('OakLog'), GLASS = id('Glass'),
  PLANKS = id('Planks'), DARK = id('DarkPlanks'), STONE = id('Stone'), FLAG = id('Flagstone'), GRASS = id('Grass'), DIRT = id('Dirt');
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
const set = (x, y, z, b) => { const { d, c } = cell(x, z); if (c[y] !== b) { c[y] = b; d.dirty = true; } };
const get = (x, y, z) => cell(x, z).c[y];
const box = (x0, y0, z0, x1, y1, z1, b) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, typeof b === 'function' ? b(x, y, z) : b); };

const X0 = -2979, X1 = -2955, Z0 = 2071, Z1 = 2091, F = 22; // walls; the floor at 22, stood on at 23
const WALL = 8; // walls 22..29
// the plot cleared to the hill behind, footed, the hill cut back and grassed
box(X0 - 3, F + 1, Z0 - 4, X1 + 3, F + 30, Z1 + 4, AIR); // (the broken remains of the owner's hall too)
box(X0 - 2, F - 4, Z0 - 3, X1 + 2, F - 1, Z1 + 4, STONE);
box(X0 - 2, F, Z0 - 3, X1 + 2, F, Z0 - 1, GRASS);
box(X0 - 2, F, Z1 + 1, X1 + 2, F, Z1 + 3, FLAG);
box(X0 - 2, F - 1, Z1 + 4, X1 + 2, F - 1, Z1 + 4, FLAG); box(X0 - 2, F, Z1 + 4, X1 + 2, F + 3, Z1 + 4, AIR);
box(X0 - 2, F, Z0, X0 - 1, F, Z1, FLAG); box(X1 + 1, F, Z0, X1 + 2, F, Z1, FLAG);
// the floor, the walls: a plinth of stone brick, whitestone over it, oak posts every four, windows tall between them
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
  const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
  set(x, F, z, edge ? BRICK : (x + z) % 2 ? PLANKS : DARK);
  if (!edge) continue;
  const along = x === X0 || x === X1 ? z - Z0 : x - X0, post = along % 4 === 0;
  for (let y = F + 1; y <= F + WALL; y++) {
    const win = !post && (along % 4 === 2) && y >= F + 3 && y <= F + 6;
    set(x, y, z, post ? LOG : y === F + 1 ? BRICK : win ? GLASS : WHITE);
  }
  set(x, F + WALL + 1, z, CARVED); // the cornice
}
// a gallery floor round three sides inside, at F + 5, open in the middle
for (let x = X0 + 1; x < X1; x++) for (let z = Z0 + 1; z < Z1; z++) if (z <= Z0 + 2 || x <= X0 + 2 || x >= X1 - 2) set(x, F + 5, z, PLANKS);
// a stair up to it in the north-west corner
for (let k = 0; k < 4; k++) for (const x of [X0 + 3, X0 + 4]) { box(x, F + 1, Z0 + 7 - k, x, F + 1 + k, Z0 + 7 - k, PLANKS); box(x, F + 2 + k, Z0 + 7 - k, x, F + 4, Z0 + 7 - k, AIR); }
box(X0 + 3, F + 5, Z0 + 3, X0 + 4, F + 5, Z0 + 4, AIR); // the stairhead
// the hipped roof: each course a block in from the last, dark planks, the ridge carved
for (let k = 0; k <= 8; k++) {
  const y = F + WALL + 2 + k, a = X0 - 1 + k, b = X1 + 1 - k, c = Z0 - 1 + k, d = Z1 + 1 - k;
  if (a > b || c > d) break;
  for (let x = a; x <= b; x++) for (let z = c; z <= d; z++) if (x === a || x === b || z === c || z === d) set(x, y, z, c === d || a === b ? CARVED : DARK);
}
// the front door: three wide, five high, in the middle of the street side, and the porch before it
const DX = Math.round((X0 + X1) / 2);
box(DX - 1, F + 1, Z1, DX + 1, F + 5, Z1, AIR);
box(DX - 1, F + 6, Z1, DX + 1, F + 6, Z1, CARVED);
box(DX - 5, F, Z1 + 1, DX + 5, F, Z1 + 3, FLAG);
for (const x of [DX - 5, DX - 2, DX + 2, DX + 5]) box(x, F + 1, Z1 + 3, x, F + 6, Z1 + 3, CARVED); // the columns
box(DX - 6, F + 7, Z1 + 1, DX + 6, F + 7, Z1 + 3, CARVED);   // the porch roof
box(DX - 5, F + 8, Z1 + 2, DX + 5, F + 8, Z1 + 3, WHITE);    // its pediment, stepped
box(DX - 3, F + 9, Z1 + 3, DX + 3, F + 9, Z1 + 3, WHITE);
set(DX, F + 10, Z1 + 3, CARVED);

// what was left of the owner's front steps, a stub of cobble and turf in front of the porch: cleared to the street
box(-2966, F, Z1 + 5, -2962, F + 10, Z1 + 6, AIR);
// the stone well west of the hall (owner 2026-11-06: "the stone well on the left, its moss roof is floating"): its posts
// didn't come through; oak posts at its four corners, up to the roof
for (const [x, z] of [[-2992, 2075], [-2989, 2075], [-2992, 2080], [-2989, 2080]]) {
  let y = 18; while (y < 40 && get(x, y + 1, z)) y++;               // the ground
  let top = y + 1; while (top < 40 && !get(x, top, z)) top++;       // the roof's underside over it
  if (top >= 40) continue;
  for (let k = y + 1; k < top; k++) set(x, k, z, LOG);
}

let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
// the old things left floating on the plot go; the hall's sign goes up over its door
const SF = 'src/data/mcSigns.ts'; let s = fs.readFileSync(SF, 'utf8');
const inPlot = (x, z) => x > X0 - 3 && x < X1 + 3 && z > Z0 - 4 && z < Z1 + 5;
{
  const a = s.indexOf('export const MC_THINGS'), st = s.indexOf('[', s.indexOf('=', a)), en = s.indexOf('];', st) + 1;
  const arr = JSON.parse(s.slice(st, en)).filter((t) => !inPlot(+t[1], +t[3]));
  s = s.slice(0, st) + JSON.stringify(arr) + s.slice(en);
}
s = s.replace('{"x":-2979.5,"y":22,"z":2100.5,"ry":0,"kind":2,"text":"Verandah\\nCity Hall","piece":"city"}', `{"x":${DX + 0.5},"y":${F + 7},"z":${Z1 + 0.9},"ry":0,"kind":2,"text":"Verandah\\nCity Hall","piece":"city"}`);
fs.writeFileSync(SF, s);
console.log('City Hall built', { files: n, door: [DX, F + 1, Z1] });
