// Gate Row: four houses on the open ground on the open strip against the quarry wall (owner 2026-11-06: "add some on the empty side
// by the gate"), built in the owner's manner (whitestone walls on a cobble footing, oak posts at the corners, glass in
// the windows, a dark plank roof pitched over a whitestone gable). Run after scripts/mc/export.ts
// (node scripts/mc/gaterow.cjs); the houses are for sale in data/verandahHomes.ts (GATE_ROW), their doors here in MC_THINGS.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n.split(' ')[0]); if (i < 0) throw n; return i; };
const AIR = 0, COBBLE = id('Cobble'), WHITE = id('Whitestone'), LOG = id('OakLog'), GLASS = id('Glass'), PLANKS = id('Planks'), DARK = id('DarkPlanks'), PATH = id('Path'), DIRT = id('Dirt');
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

const W = -3119, E = -3111, F = 21; // walls x W..E, backs to the quarry wall; the floor at F, stood on at F + 1
const ROWS = [2033, 2043, 2053];
const doors = [];
for (const Z0 of ROWS) {
  const Z1 = Z0 + 8, DZ = Z0 + 4;
  // clear the plot and its eaves, and set it on a footing
  for (let x = W - 1; x <= E + 1; x++) for (let z = Z0 - 1; z <= Z1 + 1; z++) {
    for (let y = F + 1; y < 40; y++) set(x, y, z, AIR);
    for (let y = F - 6; y < F; y++) set(x, y, z, x === W - 1 || x === E + 1 || z === Z0 - 1 || z === Z1 + 1 ? DIRT : COBBLE);
    set(x, F, z, x >= W && x <= E && z >= Z0 && z <= Z1 ? (x === W || x === E || z === Z0 || z === Z1 ? COBBLE : PLANKS) : PATH);
  }
  // walls five high: oak at the corners, whitestone between, glass in pairs
  for (let x = W; x <= E; x++) for (let z = Z0; z <= Z1; z++) {
    const edgeX = x === W || x === E, edgeZ = z === Z0 || z === Z1;
    if (!edgeX && !edgeZ) continue;
    const corner = edgeX && edgeZ;
    for (let y = F + 1; y <= F + 5; y++) {
      const along = edgeX ? z - Z0 : x - W;
      const win = !corner && (y === F + 2 || y === F + 3) && (along === 2 || along === 6);
      set(x, y, z, corner ? LOG : win ? GLASS : WHITE);
    }
  }
  // the door in the west wall, onto the path, with a way to it
  set(W, F + 1, DZ, AIR); set(W, F + 2, DZ, AIR);
  for (let x = W - 12; x <= W - 1; x++) { set(x, F, DZ, PATH); set(x, F + 1, DZ, AIR); set(x, F + 2, DZ, AIR); }
  doors.push(['mcdoor', W + 0.5, F + 1, DZ + 0.5, -1.571, 0]);
  // the roof: pitched east and west over the length of the house, the gables whitestone
  for (let k = 0; k <= 5; k++) {
    const y = F + 6 + k, a = W - 1 + k, b = E + 1 - k;
    if (a > b) break;
    for (let z = Z0 - 1; z <= Z1 + 1; z++) {
      set(a, y, z, DARK); set(b, y, z, DARK);
      if (a === b) continue;
      if (z === Z0 || z === Z1) for (let x = a + 1; x < b; x++) set(x, y, z, x === (W + E) / 2 && k === 2 ? GLASS : WHITE);
    }
  }
  // a beam across under the roof, and the ridge
  for (let x = W + 1; x < E; x++) set(x, F + 6, Z0 + 4, LOG);
}

let n = 0;
for (const [fn, d] of files) if (d.dirty) {
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); n++;
}
// their doors, among the owner's (once)
const SF = 'src/data/mcSigns.ts'; let s = fs.readFileSync(SF, 'utf8');
const a = s.indexOf('export const MC_THINGS'), st = s.indexOf('[', s.indexOf('=', a)), en = s.indexOf('];', st) + 1;
const arr = JSON.parse(s.slice(st, en)).filter((t) => !(t[0] === 'mcdoor' && t[1] === W + 0.5 && ROWS.some((z) => t[3] === z + 4.5)));
s = s.slice(0, st) + JSON.stringify(arr.concat(doors)) + s.slice(en);
fs.writeFileSync(SF, s);
console.log('gate row built', { files: n, doors: doors.length });
