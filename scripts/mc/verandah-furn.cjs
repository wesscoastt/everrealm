// Verandah's furniture made usable (owner 2026-11-12): "the Screaming Mermaid, the wooden blocks and fence posts inside and
// outside were tables and chairs but didn't port well, replace them with usable ones"; and the winery, "remove the first
// stair block ... also remove the random wood blocks over the tables inside". In Minecraft a table was a fence post with a
// slab or a pressure plate on it, and a chair a stair: they came over as a barrier with a block of planks on top, and a
// lone block of planks. This finds them in each room, takes the blocks out, and writes real tables and chairs in their
// places (src/data/content/verandahFurn.ts, set by world/sites.ts 'ver-furn'). Run after the export and the other patches
// (node scripts/mc/verandah-furn.cjs [--dry]); safe to run again: what it took out isn't there to find a second time,
// and the furniture it found is kept in the file.
const fs = require('fs'), zlib = require('zlib');
const DRY = process.argv.includes('--dry');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const AIR = 0, BAR = id('Barrier'), DARK = id('DarkPlanks'), PLANKS = id('Planks'), OAK = id('OakLog');
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
const WOOD = new Set([DARK, PLANKS]);

const OUT = 'src/data/content/verandahFurn.ts';
const kept = fs.existsSync(OUT) ? JSON.parse((fs.readFileSync(OUT, 'utf8').match(/= (\[[\s\S]*\]);/) ?? [null, '[]'])[1]) : [];
const furn = [...kept];
const have = new Set(furn.map((f) => `${Math.floor(f.x)},${f.y},${Math.floor(f.z)}`));
const add = (item, x, y, z, ry) => { const k = `${x},${y},${z}`; if (have.has(k)) return; have.add(k); furn.push({ item, x: x + 0.5, y, z: z + 0.5, ry: +ry.toFixed(3) }); };

/** One room: its box and the floor stood on. Tables first (a post with a top), then the chairs round them. */
function room(name, x0, z0, x1, z1, y) {
  const tables = [];
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (get(x, y, z) === BAR && WOOD.has(get(x, y + 1, z))) { tables.push([x, z]); if (!DRY) { set(x, y, z, AIR); set(x, y + 1, z, AIR); } add('table', x, y, z, 0); }
  }
  let chairs = 0;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    // a lone block of planks at seat height, nothing on it, beside a table or with open floor round it
    if (!WOOD.has(get(x, y, z)) || get(x, y + 1, z) !== AIR) continue;
    let run = 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (WOOD.has(get(x + dx, y, z + dz))) run++;
    if (run > 0) continue; // (a counter or a bench run along a wall, its ends too, stays what it is)
    const near = tables.map(([tx, tz]) => [tx, tz, Math.hypot(tx - x, tz - z)]).sort((a, b) => a[2] - b[2])[0];
    const ry = near && near[2] < 3 ? Math.atan2(near[0] - x, near[1] - z) : 0;
    if (!DRY) set(x, y, z, AIR);
    add('chair', x, y, z, ry);
    chairs++;
  }
  console.log(`${name}: ${tables.length} tables, ${chairs} chairs`);
}

// The Screaming Mermaid: the inn, and its tables out front
room('Screaming Mermaid', -2836, 1928, -2828, 1951, 17);
room('the Mermaid\'s yard', -2850, 1944, -2837, 1956, 17);
// The winery: the first block of the stair up (it caught people at the foot), and the wood the tables came over as
if (!DRY) set(-2924, 21, 1987, AIR);
// (the wood over its tables: waiting on the owner to point it out; the dark rows in it are a counter and a bench)

if (!DRY) {
  let n = 0;
  for (const [fn, d] of files) {
    if (!d.dirty) continue;
    const parts = [];
    for (const c of d.cols) { const runs = []; let y = 0; while (y < 112) { if (!c[y]) { y++; continue; } let l = 1; while (y + l < 112 && c[y + l] === c[y] && l < 255) l++; runs.push(y, l, c[y]); y += l; } parts.push(Buffer.from([runs.length / 3, ...runs])); }
    fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([...parts, d.rest]), { level: 9 })); n++;
  }
  fs.writeFileSync(OUT, `// Written by scripts/mc/verandah-furn.cjs: the tables and chairs in Verandah's inns and the winery, where the\n// Minecraft fence-post tables and stair chairs came over as blocks (set by world/sites.ts 'ver-furn').\nexport const VERANDAH_FURN: { item: string; x: number; y: number; z: number; ry: number }[] = ${JSON.stringify(furn, null, 0).replace(/\},\{/g, '},\n  {')};\n`);
  console.log(`${n} chunk files, ${furn.length} pieces of furniture`);
}
