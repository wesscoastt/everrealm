// Quarry Row's front paths laid on the ground (owner 2026-11-19: "fix the farthest right walkway, it's lifted and in the
// path"). gaterow-dress.cjs flagged each house's path at the floor's height all the way to the lane; where the ground
// falls away in front of No. 3 the flags stood a block proud of the grass, and the paths ran over the lane's own path,
// with a cobble step left on it at the lane's south end. This lays each flag on the ground it's over, stops the paths
// at the lane's edge, and takes the step off the lane. Run after gaterow-dress.cjs. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, WHITE = id('Whitestone'), LOG = id('OakLog'), GLASS = id('Glass'), DARK = id('DarkPlanks'), PLASTER = id('Plaster'), TIMBER = id('Timber'),
  BRICK = id('RedBrick'), CARVED = id('CarvedStone'), SBRICK = id('StoneBrick'), FLAG = id('Flagstone'), FLOWERS = id('FlowerGrass'), PLANKS = id('Planks');
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
const PATH = id('Path'), GRASS = id('Grass'), COBBLE = id('Cobble');
const W = -3119, F = 21, LANE = [-3133, -3132, -3131];
for (const Z0 of [2033, 2043, 2053]) {
  const DZ = Z0 + 4;
  for (let x = W - 12; x <= W - 1; x++) {
    // on the lane: the lane's own path, at the lane's own level (its neighbour along it)
    if (LANE.includes(x)) { if (get(x, F, DZ) !== FLAG && get(x, F, DZ) !== AIR) continue; const up = get(x, F, DZ - 1) === PATH; set(x, F, DZ, up ? PATH : AIR); if (!up && get(x, F - 1, DZ) !== PATH) set(x, F - 1, DZ, PATH); continue; }
    if (get(x, F, DZ) !== FLAG) continue;
    // the ground under it: a flag laid on grass a block down sinks to the grass
    if (get(x, F - 1, DZ) === GRASS && get(x, F - 1, DZ - 1) === GRASS && get(x, F, DZ - 1) === AIR) { set(x, F, DZ, AIR); set(x, F - 1, DZ, FLAG); }
  }
}
// a flag still standing over air (the ground falls two blocks by No. 3's door): a stone step under it
for (const Z0 of [2033, 2043, 2053]) for (let x = W - 12; x <= W - 1; x++) if (get(x, F, Z0 + 4) === FLAG && get(x, F - 1, Z0 + 4) === AIR) { set(x, F - 1, Z0 + 4, SBRICK); if (get(x, F - 2, Z0 + 4) === AIR) set(x, F - 2, Z0 + 4, SBRICK); }
// the cobble step on the lane at its south end
for (const x of LANE) for (let z = 2050; z <= 2056; z++) if (get(x, F, z) === COBBLE && get(x, F - 1, z) !== AIR) { set(x, F, z, AIR); set(x, F - 1, z, PATH); }
let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}
console.log('Quarry Row paths laid: ' + n + ' chunk files');
