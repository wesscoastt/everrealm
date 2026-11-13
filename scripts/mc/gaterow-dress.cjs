// Quarry Row made into three houses of their own (owner 2026-11-12: "overhaul the town homes on the western side of
// Verandah by the gate you added, they look sloppy"). gaterow.cjs put up three of the same whitestone box with a roof
// whose courses only met at the corners. This gives each its own front: No. 1 limewashed and timber-framed, No. 2 red
// brick with carved stone dressings, No. 3 the owner's whitestone with oak posts; all three on a stone-brick plinth,
// the roofs made solid with a ridge, a brick chimney, a hood over the door, and a flagged path to the
// door. Run after gaterow.cjs. Safe to run again.
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

const W = -3119, E = -3111, F = 21;
const ROWS = [2033, 2043, 2053];
ROWS.forEach((Z0, i) => {
  const Z1 = Z0 + 8, DZ = Z0 + 4;
  // the walls, each house its own way
  for (let x = W; x <= E; x++) for (let z = Z0; z <= Z1; z++) {
    const edgeX = x === W || x === E, edgeZ = z === Z0 || z === Z1;
    if (!edgeX && !edgeZ) continue;
    const corner = edgeX && edgeZ, along = edgeX ? z - Z0 : x - W;
    for (let y = F + 1; y <= F + 5; y++) {
      const b = get(x, y, z);
      if (b === GLASS || b === AIR) {
        // round the windows and the door: dressed
        continue;
      }
      let m;
      if (y === F + 1) m = SBRICK; // the plinth course
      else if (i === 0) m = corner || along === 4 || along === 0 || along === 8 || y === F + 4 ? TIMBER : PLASTER;
      else if (i === 1) m = corner ? CARVED : BRICK;
      else m = corner || along === 4 ? LOG : WHITE;
      set(x, y, z, m);
    }
    // No. 2's dressings: carved stone over and under each window
    if (i === 1) for (let y = F + 1; y <= F + 5; y++) if (get(x, y, z) === GLASS) { if (get(x, y + 1, z) !== GLASS) set(x, y + 1, z, CARVED); if (get(x, y - 1, z) !== GLASS) set(x, y - 1, z, CARVED); }
  }
  // the roof made solid: each course stepped onto the one below; the gables in the house's own wall
  const gable = i === 0 ? PLASTER : i === 1 ? BRICK : WHITE;
  for (let k = 0; k <= 5; k++) {
    const y = F + 6 + k, a = W - 1 + k, b = E + 1 - k;
    if (a > b) break;
    for (let z = Z0 - 1; z <= Z1 + 1; z++) {
      set(a, y, z, DARK); set(b, y, z, DARK);
      // (an earlier pass set these a block in; they are taken out where they aren't the gable)
      if (k > 0 && a + 1 < b - 1 && z !== Z0 && z !== Z1) { set(a + 1, y - 1, z, AIR); set(b - 1, y - 1, z, AIR); }
      set(a, y - 1, z, DARK); set(b, y - 1, z, DARK);
      if ((z === Z0 || z === Z1) && a + 1 < b) for (let x = a + 1; x < b; x++) { set(x, y, z, x === (W + E) / 2 && k === 2 ? GLASS : gable); }
    }
  }
  // the chimney, up the back slope at the north end
  for (let y = F + 6; y <= F + 13; y++) set(E - 2, y, Z0 + 1, y === F + 13 ? SBRICK : BRICK);
  // a hood over the door, on two brackets
  for (const z of [DZ - 1, DZ, DZ + 1]) set(W - 1, F + 4, z, DARK);
  set(W - 1, F + 3, DZ - 1, LOG); set(W - 1, F + 3, DZ + 1, LOG);
  // a flagged path to the door (the window boxes first tried here came out as plain turf: taken up)
  for (const z of [Z0 + 2, Z0 + 6]) { if (get(W - 1, F + 1, z) === FLOWERS) set(W - 1, F + 1, z, AIR); }
  for (let x = W - 12; x <= W - 1; x++) if (get(x, F, DZ) !== AIR) set(x, F, DZ, FLAG);
  // inside: a plank floor kept clear, the beam across left as it was
  for (let x = W + 1; x < E; x++) for (let z = Z0 + 1; z < Z1; z++) set(x, F, z, PLANKS);
});
let n = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
}
console.log('Quarry Row dressed: ' + n + ' chunk files');
