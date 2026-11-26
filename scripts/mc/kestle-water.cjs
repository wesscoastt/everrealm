// Kestle's melted water (owner 2026-11-13: "finish Kestle also, still some melted water and unfinished buildings etc").
// The import turned the village's ice and snow to water, which left square pits of water and one-block puddles in the
// streets and gardens, by the shore, and on the glass roofs. Small inland pools that are open to the air at the top
// (fewer than 120 blocks, not part of the sea or a pond) are filled in. Each block becomes what the ground around it is
// made of: grass, path, sand or gravel on top, then dirt, then stone. Water sitting on glass or planks above the sea
// just goes. A deep shaft in the rock with water at its foot (a well) is kept. Water sealed underground, which you can never see, is left alone. Safe to run again: a second run finds
// nothing to fill.
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.split('=')[0].trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw new Error(n); return i; };
const AIR = 0, WATER = id('Water'), DIRT = id('Dirt'), STONE = id('Stone'), GRASS = id('Grass');
const TOPS = new Set(['Grass', 'Path', 'Sand', 'Gravel'].map(id));
const ROOF = new Set(names.map((n, i) => (/Glass|Plank|Window/.test(n) ? i : -1)).filter((i) => i >= 0));
const BARRIER = id('Barrier');
const ROCK = new Set(['Stone', 'Cobble', 'Gravel'].map(id));
const SEA = 16, MAX = 120;
const X0 = -2440, X1 = -2280, Z0 = 2280, Z1 = 2450;
const dry = process.argv.includes('--dry');

const files = new Map();
const load = (cx, cz) => {
  const fn = cx + '_' + cz + '.bin';
  if (!files.has(fn)) {
    let d = null;
    try {
      const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = [];
      for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); }
      d = { cols, rest: f.subarray(p), dirty: false };
    } catch { d = null; }
    files.set(fn, d);
  }
  return files.get(fn);
};
const cell = (x, z) => { const d = load(Math.floor(x / 32), Math.floor(z / 32)); return d ? { d, c: d.cols[(z - Math.floor(z / 32) * 32) * 32 + (x - Math.floor(x / 32) * 32)] } : null; };
const get = (x, y, z) => { const k = cell(x, z); return k ? k.c[y] : -1; };
const set = (x, y, z, b) => { const k = cell(x, z); if (k && k.c[y] !== b) { k.c[y] = b; k.d.dirty = true; } };

const seen = new Set(), key = (x, y, z) => x + ',' + y + ',' + z;
let pools = 0, filled = 0, dried = 0;
for (let x = X0; x < X1; x++) for (let z = Z0; z < Z1; z++) for (let y = 1; y < 112; y++) {
  if (get(x, y, z) !== WATER || seen.has(key(x, y, z))) continue;
  // the whole pool, given up on once it's bigger than a puddle or a pit (the sea, the ponds)
  const st = [[x, y, z]], blocks = []; seen.add(key(x, y, z)); let big = false, open = false;
  while (st.length) {
    const [a, b, c] = st.pop(); blocks.push([a, b, c]);
    if (blocks.length > MAX) big = true;
    // open to the sky, as thaw water is (a pool in a cave under the village is the land's own)
    if (get(a, b + 1, c) === AIR) { let sky = true; for (let k = b + 1; k < 112 && sky; k++) { const g = get(a, k, c); if (g !== AIR && g !== BARRIER) sky = false; } if (sky) open = true; }
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = a + dx, ny = b + dy, nz = c + dz; if (ny < 1 || ny > 111) continue;
      const g = get(nx, ny, nz);
      if (g === -1) { big = true; continue; } // runs off the owner's land: not ours to judge
      if (g === WATER && !seen.has(key(nx, ny, nz))) { seen.add(key(nx, ny, nz)); st.push([nx, ny, nz]); }
    }
  }
  if (big || !open) continue;
  // a deep shaft cut in the rock with water at its foot (a well, a sump) is the owner's, not the thaw's
  if (blocks.length > 50 && blocks.every(([a, b, c]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => { const g = get(a + dx, b, c + dz); return g === WATER || ROCK.has(g); }))) continue;
  pools++;
  if (process.argv.includes('--list')) { const xs = blocks.map((p) => p[0]), ys = blocks.map((p) => p[1]), zs = blocks.map((p) => p[2]); const rim = {}; for (const [a, b, c] of blocks) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const g = get(a + dx, b, c + dz); if (g > 0 && g !== WATER) rim[names[g]] = (rim[names[g]] || 0) + 1; } console.log(blocks.length, [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys), Math.min(...zs), Math.max(...zs)].join(','), JSON.stringify(rim)); }
  // highest first, so each block can look at the one above it
  blocks.sort((p, q) => q[1] - p[1]);
  for (const [a, b, c] of blocks) {
    const under = get(a, b - 1, c);
    if (b > SEA && (ROOF.has(under) || under === AIR)) { set(a, b, c, AIR); dried++; continue; }
    // standing on the ground with nothing round it, a puddle, not a hole: it just goes
    if (get(a, b + 1, c) === AIR && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) => { const g = get(a + dx, b, c + dz); return g === AIR || g === WATER || g === BARRIER; })) { set(a, b, c, AIR); dried++; continue; }
    const above = get(a, b + 1, c);
    let fill;
    if (above === AIR || above === -1) {
      // a top block like its neighbours' at this height, or grass
      const n = {};
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const g = get(a + dx, b, c + dz); if (TOPS.has(g)) n[g] = (n[g] || 0) + 1; }
      const best = Object.entries(n).sort((p, q) => q[1] - p[1])[0];
      fill = best ? +best[0] : GRASS;
    } else fill = get(a, b + 3, c) === AIR || get(a, b + 2, c) === AIR ? DIRT : STONE;
    set(a, b, c, fill); filled++;
  }
  // grass buried under a new top block turns to dirt
  for (const [a, b, c] of blocks) if (get(a, b - 1, c) === GRASS && get(a, b, c) !== AIR) set(a, b - 1, c, DIRT);
}
let written = 0;
for (const [fn, d] of files) {
  if (!d || !d.dirty) continue; written++;
  if (dry) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 }));
}
console.log('Kestle water', { pools, filled, dried, files: written, dry });
