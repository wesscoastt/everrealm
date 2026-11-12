// Awschitz, the owner's walled fort on the coast west of Verandah (owner 2026-11-07: "improve on what's already there
// of Awschitz, not add a new walled thing inside: improve on the walls there and add buildings within, and the dock").
// The owner built the curtain (two faces of stone brick with a walk between, a low parapet each side), the gatehouses,
// the corner towers, an orchard of fruit trees, a strip of farmland, a row of furnaces and chests, and the pier east of
// the gate. The import kept the walls and the trunks but lost the fruit trees' leaves (an add-on's blocks), so the orchard
// stood as bare posts, and the cherries came over as heaps of planks. This:
//   - gives the orchard its leaves back, where the owner had them (scripts/mc/awschitz-orchard.json, read from the world);
//   - cuts merlons into the outer parapet, weathers the faces with moss, and adds four wall towers and two stairs up;
//   - builds the garrison inside: the hall (stone below, timber and plaster above, a slate roof), the barracks along the
//     west wall, the smithy, the stable, the water-gate store between the north gates, and a shed over the owner's own
//     furnace row; flagged yards and paths between them;
//   - runs a jetty out from the owner's pier, with a T-head for the boats.
// The roofs, the furniture and the gear are props (data/content/awschitz.ts, AWSCHITZ_PROPS); the garrison is there too.
// Run after scripts/mc/export.ts, in its place in the patch order (node scripts/mc/awschitz.cjs).
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, BRICK = id('StoneBrick'), MOSSY = id('MossyStone'), CARVED = id('CarvedStone'), FLAG = id('Flagstone'), COBBLE = id('Cobble'),
  PLANKS = id('Planks'), DARK = id('DarkPlanks'), LOG = id('OakLog'), TIMBER = id('Timber'), PLASTER = id('Plaster'), WINDOW = id('Window'),
  LEAVES = id('OakLeaves'), GRASS = id('Grass'), PATH = id('Path'), WATER = id('Water'), HAY = id('Hay'), BARRIER = id('Barrier'), BARS = id('Bars'),
  FLOWER = id('FlowerGrass'), DIRT = id('Dirt');
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
const stone = (x, y, z) => (hash(x, y, z) < (y <= 17 ? 0.22 : 0.1) ? MOSSY : BRICK);
const box = (x0, y0, z0, x1, y1, z1, b) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = y0; y <= y1; y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, typeof b === 'function' ? b(x, y, z) : b); };
const G = 15; // the yard's ground: stood on at 16

// ---------------------------------------------------------------- the orchard's leaves
for (const [x, y, z] of JSON.parse(fs.readFileSync('scripts/mc/awschitz-orchard.json', 'utf8'))) {
  const b = get(x, y, z);
  if (b === AIR || b === PLANKS) set(x, y, z, LEAVES);
}

// ---------------------------------------------------------------- the owner's walls
// A wall cell is stone brick at 17 and 18; the faces carry the parapet (top 20), the walk between them tops at 19.
const WX0 = -3495, WX1 = -3340, WZ0 = 1931, WZ1 = 1990, CX = -3420, CZ = 1960;
const isWall = (x, z) => { const c = cell(x, z).c; return c[17] === BRICK && c[18] === BRICK; };
const topOf = (x, z) => { const c = cell(x, z).c; for (let y = 60; y >= 0; y--) if (c[y]) return y; return -1; };
const parapets = [];
for (let x = WX0; x <= WX1; x++) for (let z = WZ0; z <= WZ1; z++) {
  if (!isWall(x, z)) continue;
  // weathering: moss in the faces, thicker near the ground
  for (let y = 16; y <= 20; y++) if (get(x, y, z) === BRICK && hash(x, y, z) < (y <= 17 ? 0.2 : 0.09)) set(x, y, z, MOSSY);
  if (topOf(x, z) === 20) parapets.push([x, z]);
}
// merlons on the outer parapet: the face farther from the yard than the walk beside it, every other block
for (const [x, z] of parapets) {
  let walk = null;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (isWall(x + dx, z + dz) && topOf(x + dx, z + dz) === 19) { walk = [dx, dz]; break; }
  if (!walk) continue;
  const d0 = Math.hypot(x - CX, z - CZ), d1 = Math.hypot(x + walk[0] - CX, z + walk[1] - CZ);
  if (d0 <= d1) continue; // the inner parapet stays low
  const along = walk[1] !== 0 ? x : z;
  if (((along % 2) + 2) % 2 === 0 && get(x, 21, z) === AIR) set(x, 21, z, stone(x, 21, z));
}

// ---------------------------------------------------------------- the wall towers
// Square, on the wall: solid to the walk, a guardroom at the walk's height with the walk running through it, slits
// in its outer faces, a flagged roof over it with a parapet and merlons, a ladder up from the guardroom.
const ladders = [];
const tower = (x0, z0, x1, z1, runsAlongX, ladder) => {
  box(x0, G, z0, x1, 19, z1, stone);
  box(x0, 20, z0, x1, 22, z1, stone);
  box(x0 + 1, 20, z0 + 1, x1 - 1, 22, z1 - 1, AIR);
  // the walk goes through: open the two ends where the wall comes in
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const end = runsAlongX ? (x === x0 || x === x1) : (z === z0 || z === z1);
    const inner = runsAlongX ? (z > z0 && z < z1) : (x > x0 && x < x1);
    if (end && inner) {
      const ox = runsAlongX ? (x === x0 ? -1 : 1) : 0, oz = runsAlongX ? 0 : (z === z0 ? -1 : 1);
      if (isWall(x + ox, z + oz) && topOf(x + ox, z + oz) === 19) { set(x, 20, z, AIR); set(x, 21, z, AIR); }
    }
  }
  // slits in the faces across the wall
  const mx = Math.floor((x0 + x1) / 2), mz = Math.floor((z0 + z1) / 2);
  if (runsAlongX) { set(mx, 21, z0, BARS); set(mx, 21, z1, BARS); } else { set(x0, 21, mz, BARS); set(x1, 21, mz, BARS); }
  // a carved string course, the roof, its parapet and merlons
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) set(x, 19, z, CARVED);
  box(x0, 23, z0, x1, 23, z1, FLAG);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) { set(x, 23, z, stone(x, 23, z)); set(x, 24, z, stone(x, 24, z)); if ((x + z) % 2 === 0) set(x, 25, z, stone(x, 25, z)); }
  // the ladder: up the inside of a face, through a hatch in the roof
  const [lx, lz, ry] = ladder;
  set(lx, 23, lz, AIR);
  for (let y = 20; y <= 23; y++) ladders.push(['mcladder', lx + 0.5, y, lz + 0.5, ry, 0]);
};
tower(-3492, 1953, -3487, 1958, false, [-3488, 1954, 0]);    // the west wall
tower(-3405, 1984, -3400, 1989, true, [-3404, 1985, 0]);     // the south wall, west
tower(-3372, 1984, -3367, 1989, true, [-3368, 1985, 0]);     // the south wall, east
tower(-3385, 1943, -3380, 1948, true, [-3384, 1944, 0]);     // the inner north wall

// stairs up to the walk on the yard side: four blocks rising beside the inner face, the parapet opened at the top
const stair = (cells, gap) => { cells.forEach(([x, z], i) => box(x, 16, z, x, 16 + i, z, stone)); set(gap[0], 20, gap[1], AIR); };
stair([[-3486, 1983], [-3486, 1982], [-3486, 1981], [-3486, 1980]], [-3487, 1980]); // the west wall, by the barracks
stair([[-3415, 1984], [-3414, 1984], [-3413, 1984], [-3412, 1984]], [-3412, 1985]); // the south wall, by the stable

// ---------------------------------------------------------------- the garrison
const ground = (x0, z0, x1, z1, b) => box(x0, G, z0, x1, G, z1, b);
const clear = (x0, z0, x1, z1, y1 = 30) => box(x0, 16, z0, x1, y1, z1, AIR);
// The hall: stone below with tall windows, a carved band, timber and plaster above, the door in the middle of the south front.
{
  const X0 = -3468, X1 = -3448, Z0 = 1944, Z1 = 1957, UP = 21;
  clear(X0, Z0, X1, Z1);
  ground(X0, Z0, X1, Z1, FLAG);
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
    if (!edge) continue;
    const corner = (x === X0 || x === X1) && (z === Z0 || z === Z1);
    box(x, 16, z, x, 20, z, (xx, y, zz) => (corner ? CARVED : stone(xx, y, zz)));
    set(x, UP, z, CARVED);
    const post = corner || (z === Z0 || z === Z1 ? (x - X0) % 4 === 0 : (z - Z0) % 4 === 0);
    box(x, UP + 1, z, x, UP + 4, z, post ? TIMBER : PLASTER);
    set(x, UP + 4, z, TIMBER);
    // windows: tall ones below between the posts, shorter above
    const mid = z === Z0 || z === Z1 ? (x - X0) % 4 === 2 : (z - Z0) % 4 === 2;
    if (mid && !corner) { set(x, 18, z, WINDOW); set(x, 19, z, WINDOW); set(x, UP + 2, z, WINDOW); set(x, UP + 3, z, WINDOW); }
  }
  // the upper floor, with the ladder's hatch in the north-east corner
  box(X0 + 1, UP, Z0 + 1, X1 - 1, UP, Z1 - 1, PLANKS);
  set(X1 - 1, UP, Z0 + 1, AIR);
  for (let y = 16; y <= UP; y++) ladders.push(['mcladder', X1 - 1 + 0.5, y, Z0 + 1 + 0.5, Math.PI, 0]);
  // the door: three wide, under a carved lintel, a step of flags before it
  box(-3459, 16, Z1, -3457, 18, Z1, AIR);
  box(-3460, 19, Z1, -3456, 19, Z1, CARVED);
  set(-3460, 16, Z1, CARVED); set(-3460, 17, Z1, CARVED); set(-3460, 18, Z1, CARVED);
  set(-3456, 16, Z1, CARVED); set(-3456, 17, Z1, CARVED); set(-3456, 18, Z1, CARVED);
}
// The barracks along the west wall: a course of stone, timber and plaster over it, thatched, the door on the yard side.
{
  const X0 = -3486, X1 = -3478, Z0 = 1961, Z1 = 1978;
  clear(X0, Z0, X1, Z1);
  ground(X0, Z0, X1, Z1, PLANKS);
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    if (!(x === X0 || x === X1 || z === Z0 || z === Z1)) continue;
    const corner = (x === X0 || x === X1) && (z === Z0 || z === Z1);
    set(x, 16, z, stone(x, 16, z));
    const post = corner || ((x === X0 || x === X1) && (z - Z0) % 3 === 0) || ((z === Z0 || z === Z1) && (x - X0) % 4 === 0);
    box(x, 17, z, x, 19, z, post ? TIMBER : PLASTER);
    if (x === X1 && (z - Z0) % 3 === 2 && z !== 1969 && z !== 1970) set(x, 18, z, WINDOW);
  }
  box(X1, 16, 1969, X1, 18, 1970, AIR); // the door
}
// The smithy: stone on three sides, open to the yard on the south, a flagged floor, its chimney at the back.
{
  const X0 = -3444, X1 = -3436, Z0 = 1964, Z1 = 1972;
  clear(X0, Z0, X1, Z1);
  ground(X0, Z0, X1, Z1, COBBLE);
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    if (z === Z1) { if (x === X0 || x === X1 || x === -3440) box(x, 16, z, x, 19, z, LOG); continue; }
    if (x === X0 || x === X1 || z === Z0) box(x, 16, z, x, 19, z, stone);
  }
  box(-3441, 16, Z0 + 1, -3439, 17, Z0 + 1, stone); // the forge's hearth against the back wall
  box(-3441, 20, Z0, -3439, 26, Z0 + 1, stone);   // its chimney up through the roof
  box(-3440, 26, Z0, -3440, 26, Z0 + 1, AIR);
}
// The stable against the south wall: open to the north on oak posts, plank stalls, hay.
{
  const X0 = -3434, X1 = -3422, Z0 = 1975, Z1 = 1984;
  clear(X0, Z0, X1, Z1);
  ground(X0, Z0, X1, Z1, DIRT);
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
    if (z === Z0) { if ((x - X0) % 4 === 0) box(x, 16, z, x, 18, z, LOG); continue; }
    if (x === X0 || x === X1 || z === Z1) box(x, 16, z, x, 18, z, (x === X0 || x === X1) && (z === Z1) ? LOG : PLANKS);
  }
  for (const x of [-3430, -3426]) box(x, 16, Z0 + 3, x, 17, Z1 - 1, PLANKS); // the stalls' partitions
  for (const [x, z] of [[-3433, 1983], [-3432, 1983], [-3433, 1982], [-3423, 1983], [-3424, 1983]]) set(x, 16, z, HAY);
  set(-3433, 17, 1983, HAY);
}
// The water-gate store between the north gates, flush to the wall: stone, its door on the yard.
{
  const X0 = -3447, X1 = -3437, Z0 = 1935, Z1 = 1942;
  clear(X0, Z0, X1, Z1);
  ground(X0, Z0, X1, Z1, PLANKS);
  for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) if (x === X0 || x === X1 || z === Z0 || z === Z1) box(x, 16, z, x, 19, z, (xx, y, zz) => ((xx === X0 || xx === X1) && (zz === Z0 || zz === Z1) ? CARVED : stone(xx, y, zz)));
  box(-3443, 16, Z1, -3441, 18, Z1, AIR);
  for (const x of [-3446, -3438]) set(x, 18, Z1, WINDOW);
}
// A shed over the owner's own furnace row and chests (they stand in the open at x -3364): a stone back wall to the
// west, oak posts to the east, a roof (a prop) over them.
{
  const X = -3365, Z0 = 1953, Z1 = 1965;
  for (let z = Z0; z <= Z1; z++) { if (!get(X, 16, z)) box(X, 16, z, X, 19, z, stone); }
  for (const z of [Z0, 1957, 1961, Z1]) box(-3362, 16, z, -3362, 19, z, LOG);
  for (let z = Z0; z <= Z1; z++) box(-3365, 19, z, -3362, 19, z, (x) => (x === -3365 || x === -3362 ? TIMBER : get(x, 19, z)));
  ground(-3364, Z0, -3363, Z1, FLAG);
}

// ---------------------------------------------------------------- the yard: flags before the hall, the paths
const pave = (x0, z0, x1, z1, b) => { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const g = get(x, G, z); if ((g === GRASS || g === FLOWER || g === PATH) && !get(x, 16, z)) set(x, G, z, typeof b === 'function' ? b(x, z) : b); } };
const flags = (x, z) => (hash(x, 3, z) < 0.12 ? COBBLE : FLAG);
pave(-3470, 1958, -3436, 1963, flags);       // the yard before the hall and round the well
pave(-3449, 1935, -3448, 1958, PATH);        // from the west water gate
pave(-3436, 1943, -3435, 1963, PATH);        // from the east water gate, past the smithy
pave(-3460, 1964, -3458, 1990, PATH);        // down to the walled road south-west
pave(-3477, 1968, -3471, 1970, PATH);        // to the barracks door
pave(-3435, 1963, -3352, 1964, PATH);        // east through the orchard to the gate
pave(-3420, 1964, -3419, 1974, PATH);        // to the stable

// ---------------------------------------------------------------- the dock: a jetty off the owner's pier, a T-head
{
  const deck = (x0, z0, x1, z1) => box(x0, 15, z0, x1, 15, z1, (x, y, z) => (hash(x, y, z) < 0.15 ? DARK : PLANKS));
  const pile = (x, z) => { let y = 15; while (y > 2 && (get(x, y - 1, z) === WATER || get(x, y - 1, z) === AIR)) y--; box(x, y, z, x, 16, z, LOG); };
  // open the pier's rail where the jetty leaves it
  for (let z = 1959; z <= 1962; z++) if (get(-3332, 16, z) === BARRIER) set(-3332, 16, z, AIR);
  deck(-3331, 1959, -3321, 1962);
  deck(-3320, 1954, -3317, 1967);
  for (const x of [-3331, -3327, -3323]) { pile(x, 1959); pile(x, 1962); }
  for (const [x, z] of [[-3320, 1954], [-3317, 1954], [-3320, 1967], [-3317, 1967], [-3317, 1960], [-3317, 1961]]) pile(x, z);
}

let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}

// ---------------------------------------------------------------- the small things: the ladders in, the jetty's rail out
{
  const f = 'src/data/mcSigns.ts'; let s = fs.readFileSync(f, 'utf8');
  const i = s.indexOf('MC_THINGS'), a = s.indexOf('=', i) + 1, e = s.indexOf(';\n', a);
  let T = JSON.parse(s.slice(a, e));
  const gone = (t) => t[0] === 'mcfence' && Math.floor(+t[1]) === -3332 && Math.floor(+t[2]) === 16 && Math.floor(+t[3]) >= 1959 && Math.floor(+t[3]) <= 1962;
  const have = new Set(T.map((t) => JSON.stringify(t)));
  T = T.filter((t) => !gone(t));
  for (const l of ladders) if (!have.has(JSON.stringify(l))) T.push(l);
  s = s.slice(0, a) + ' ' + JSON.stringify(T) + s.slice(e);
  fs.writeFileSync(f, s);
}
console.log('Awschitz: ' + n + ' chunk files, ' + ladders.length + ' ladder rungs');
