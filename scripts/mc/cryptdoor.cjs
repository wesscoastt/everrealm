// The Tregarthen Vaults' outer doors (owner 2026-11-07: "the crypt delve door outside is wooden but barrels ported over:
// change them to wood to look like the open doors"): the owner's two great doors of dark planks came through with a
// barrel every fourth course where their wood was laid on its side; those become planks, and the barrels go.
// Run after scripts/mc/export.ts (node scripts/mc/cryptdoor.cjs).
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
const DARK = names.indexOf('DarkPlanks'), BARRIER = names.indexOf('Barrier');
const CELLS = [[-2988, 2481], [-2989, 2482], [-2990, 2483], [-2991, 2484], [-2982, 2485], [-2983, 2485], [-2984, 2485], [-2985, 2485]];
const files = new Map();
const col = (x, z) => { const cx = Math.floor(x / 32), cz = Math.floor(z / 32), fn = cx + '_' + cz + '.bin'; if (!files.has(fn)) { const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = []; for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); } files.set(fn, { cols, rest: f.subarray(p), dirty: false }); } const d = files.get(fn); return { d, c: d.cols[(z - cz * 32) * 32 + (x - cx * 32)] }; };
let n = 0;
for (const [x, z] of CELLS) { const { d, c } = col(x, z); for (const y of [27, 31, 35]) if (c[y] === BARRIER) { c[y] = DARK; d.dirty = true; n++; } }
for (const [fn, d] of files) if (d.dirty) { const parts = []; for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); } fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); }
const SF = 'src/data/mcSigns.ts'; let s = fs.readFileSync(SF, 'utf8');
const a = s.indexOf('export const MC_THINGS'), st = s.indexOf('[', s.indexOf('=', a)), en = s.indexOf('];', st) + 1;
const set = new Set(CELLS.map(([x, z]) => x + ',' + z));
const arr = JSON.parse(s.slice(st, en)); const keep = arr.filter((t) => !(t[0] === 'barrel' && set.has(Math.floor(t[1]) + ',' + Math.floor(t[3])) && [27, 31, 35].includes(+t[2])));
s = s.slice(0, st) + JSON.stringify(keep) + s.slice(en); fs.writeFileSync(SF, s);
console.log('crypt doors', { planks: n, barrelsGone: arr.length - keep.length });
