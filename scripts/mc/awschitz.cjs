// Awschitz Fort (owner 2026-11-06: "make it another kind of fort for Verandah"): the owner's fort on the headland west
// of the town hardly came through, so the game builds Verandah's coastal watch fort there in its own blocks: a curtain
// wall of stone brick with a walk along its top and teeth on its face, a tower at each corner, the gate on the east
// onto the coast road, a flagged yard, the garrison's hall, and a stone quay with a jetty out from the owner's pier.
// Run after scripts/mc/export.ts (node scripts/mc/awschitz.cjs); its garrison is data/content/awschitz.ts.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, BRICK = id('StoneBrick'), MOSSY = id('MossyStone'), CARVED = id('CarvedStone'), FLAG = id('Flagstone'), COBBLE = id('Cobble'),
  PLANKS = id('Planks'), DARK = id('DarkPlanks'), LOG = id('OakLog'), GLASS = id('Glass'), STONE = id('Stone'), PATH = id('Path');
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
const hash = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const stone = (x, y, z) => (hash(x, y, z) < 0.15 ? MOSSY : BRICK);
const box = (x0, y0, z0, x1, y1, z1, b) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) set(x, y, z, typeof b === 'function' ? b(x, y, z) : b); };

const G = 15;              // the ground: walked on at 16
const X0 = -3375, X1 = -3349, Z0 = 1951, Z1 = 1979; // the curtain's outer face
const TOP = G + 7;         // the wall walk, stood on at TOP + 1

// the plot cleared, footed in stone, the yard flagged
box(X0 - 2, G + 1, Z0 - 2, X1 + 2, G + 20, Z1 + 2, AIR);
box(X0 - 2, G - 3, Z0 - 2, X1 + 2, G - 1, Z1 + 2, STONE);
box(X0, G, Z0, X1, G, Z1, (x, y, z) => ((x + z) % 4 === 0 ? COBBLE : FLAG));
box(X0 - 2, G, Z0 - 2, X1 + 2, G, Z0 - 1, PATH); box(X0 - 2, G, Z1 + 1, X1 + 2, G, Z1 + 2, PATH);
box(X0 - 2, G, Z0, X0 - 1, G, Z1, PATH); box(X1 + 1, G, Z0, X1 + 2, G, Z1, PATH);

// the curtain: two thick, its walk on top, teeth on the outer face
for (let x = X0; x <= X1; x++) for (let z = Z0; z <= Z1; z++) {
  const ring = x <= X0 + 1 || x >= X1 - 1 || z <= Z0 + 1 || z >= Z1 - 1;
  if (!ring) continue;
  box(x, G + 1, z, x, TOP, z, stone);
  const outer = x === X0 || x === X1 || z === Z0 || z === Z1;
  if (outer && (x + z) % 2 === 0) set(x, TOP + 1, z, stone(x, TOP + 1, z));
  // arrow slits in the outer face
  if (outer && (x + z) % 6 === 0) set(x, G + 4, z, AIR);
}
// towers at the corners: seven square, four higher than the wall, hollow, their roofs walked on and toothed
for (const [tx, tz] of [[X0 - 1, Z0 - 1], [X1 - 5, Z0 - 1], [X0 - 1, Z1 - 5], [X1 - 5, Z1 - 5]]) {
  for (let x = tx; x < tx + 7; x++) for (let z = tz; z < tz + 7; z++) {
    const edge = x === tx || x === tx + 6 || z === tz || z === tz + 6;
    for (let y = G - 1; y <= TOP + 4; y++) set(x, y, z, edge ? (y === TOP + 4 ? CARVED : stone(x, y, z)) : y === TOP + 4 || y === TOP || y === G ? PLANKS : AIR);
    if (edge && (x + z) % 2 === 0) set(x, TOP + 5, z, stone(x, TOP + 5, z));
  }
  // a door from the yard into each tower, and from the tower out onto the walk
  const ix = tx === X0 - 1 ? tx + 6 : tx, iz = tz === Z0 - 1 ? tz + 6 : tz;
  set(ix, G + 1, tz + 3, AIR); set(ix, G + 2, tz + 3, AIR);
  set(tx + 3, TOP + 1, iz, AIR); set(tx + 3, TOP + 2, iz, AIR);
  set(ix, TOP + 1, tz + 3, AIR); set(ix, TOP + 2, tz + 3, AIR);
}

// the gate on the east, onto the coast road: three wide, four high, a carved arch over it
const GZ = Math.round((Z0 + Z1) / 2);
box(X1 - 1, G + 1, GZ - 1, X1, G + 4, GZ + 1, AIR);
box(X1 - 1, G + 5, GZ - 2, X1, G + 5, GZ + 2, CARVED);
for (const z of [GZ - 2, GZ + 2]) box(X1 + 1, G + 1, z, X1 + 1, TOP + 1, z, CARVED); // the gate's buttresses
box(X1 + 1, G, GZ - 1, X1 + 7, G, GZ + 1, PATH); // the way out to the road

// the stair up to the walk: along the inside of the south wall, rising westward
for (let k = 0; k < TOP - G; k++) {
  const x = X1 - 7 - k, y = G + 1 + k;
  for (const z of [Z1 - 2, Z1 - 3]) { box(x, G + 1, z, x, y - 1, z, stone); set(x, y, z, BRICK); }
}

// the garrison's hall: stone below, timber above, a pitched roof; its door on the yard
const HX0 = X0 + 5, HX1 = X0 + 15, HZ0 = Z0 + 4, HZ1 = Z0 + 11;
for (let x = HX0; x <= HX1; x++) for (let z = HZ0; z <= HZ1; z++) {
  const edge = x === HX0 || x === HX1 || z === HZ0 || z === HZ1, corner = (x === HX0 || x === HX1) && (z === HZ0 || z === HZ1);
  set(x, G, z, edge ? COBBLE : PLANKS);
  for (let y = G + 1; y <= G + 8; y++) {
    if (!edge) { set(x, y, z, y === G + 5 ? (x === HX0 + 1 && z <= HZ0 + 2 ? AIR : PLANKS) : AIR); continue; }
    const win = !corner && (y === G + 2 || y === G + 3 || y === G + 6 || y === G + 7) && (x + z) % 3 === 0;
    set(x, y, z, corner ? LOG : win ? GLASS : y <= G + 4 ? stone(x, y, z) : PLANKS);
  }
}
for (let k = 0; k <= 6; k++) for (let x = HX0 - 1; x <= HX1 + 1; x++) {
  const y = G + 9 + k, a = HZ0 - 1 + k, b = HZ1 + 1 - k; if (a > b) break;
  set(x, y, a, DARK); set(x, y, b, DARK);
  if (x === HX0 - 1 || x === HX1 + 1) continue;
  if (x === HX0 || x === HX1) for (let z = a + 1; z < b; z++) set(x, y, z, PLANKS);
}
const HDZ = Math.round((HZ0 + HZ1) / 2);
set(HX1, G + 1, HDZ, AIR); set(HX1, G + 2, HDZ, AIR);
// a ladder's well up to the loft (the ladder itself is in MC_THINGS)
const LADDER = [HX0 + 1, HZ0 + 1];

// the quay: dressed stone along the shore by the owner's pier, and a jetty out to the east on piles
box(-3338, G - 2, 1956, -3336, G, 1978, (x, y, z) => (y === G ? CARVED : STONE));
for (const z of [1966, 1967]) box(-3331, G, z, -3316, G, z, PLANKS);
for (let x = -3331; x <= -3316; x += 3) for (const z of [1965, 1968]) box(x, G - 9, z, x, G, z, LOG);
set(-3316, G + 1, 1965, LOG); set(-3316, G + 1, 1968, LOG);

let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
// the hall's door and the loft ladder, among the owner's things (once)
const SF = 'src/data/mcSigns.ts'; let s = fs.readFileSync(SF, 'utf8');
const a = s.indexOf('export const MC_THINGS'), st = s.indexOf('[', s.indexOf('=', a)), en = s.indexOf('];', st) + 1;
const ours = [['mcdoor', HX1 + 0.5, G + 1, HDZ + 0.5, 1.571, 0], ...[1, 2, 3, 4].map((k) => ['mcladder', LADDER[0] + 0.5, G + k, LADDER[1] + 0.5, 0, 0])];
const arr = JSON.parse(s.slice(0, 0) || s.slice(st, en)).filter((t) => !(t[1] > X0 - 3 && t[1] < X1 + 3 && t[3] > Z0 - 3 && t[3] < Z1 + 3));
s = s.slice(0, st) + JSON.stringify(arr.concat(ours)) + s.slice(en);
fs.writeFileSync(SF, s);
console.log('Awschitz Fort built', { files: n, gate: [X1, G + 1, GZ], hall: [HX0, HZ0, HX1, HZ1], walk: TOP + 1 });
