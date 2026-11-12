// Ported furniture hanging on nothing (owner 2026-11-07: "this tree has furnishing on it; bug fix furniture that was
// ported"): any of the owner's furniture with air under it drops to the floor if one is close beneath, and goes if
// it's hung high (shelves and pots up a tree trunk). Run after scripts/mc/export.ts (node scripts/mc/floatfurn.cjs).
const fs = require('fs'), zlib = require('zlib'); const cache = {};
const col = (x, z) => { const cx = Math.floor(x / 32), cz = Math.floor(z / 32), k = cx + '_' + cz; if (!(k in cache)) { try { const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + k + '.bin')); let p = 0; const cols = []; for (let c = 0; c < 1024; c++) { const n = f[p++]; const r = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let i = 0; i < l; i++) r[y + i] = b; } cols.push(r); } cache[k] = cols; } catch { cache[k] = null; } } const f = cache[k]; return f ? f[(z - cz * 32) * 32 + (x - cx * 32)] : null; };
const SF = 'src/data/mcSigns.ts'; let s = fs.readFileSync(SF, 'utf8');
const a = s.indexOf('export const MC_THINGS'), st = s.indexOf('[', s.indexOf('=', a)), en = s.indexOf('];', st) + 1;
const arr = JSON.parse(s.slice(st, en));
// (a stack of things counts as support for the one on top)
const occupied = new Set(arr.map((t) => Math.floor(t[1]) + ',' + t[2] + ',' + Math.floor(t[3])));
let dropped = 0, gone = 0;
const keep = [];
for (const t of arr) {
  if (t[0] !== 'furn' && t[0] !== 'barrel') { keep.push(t); continue; }
  const X = Math.floor(t[1]), Y = +t[2], Z = Math.floor(t[3]); const c = col(X, Z);
  if (!c || c[Y - 1] || occupied.has(X + ',' + (Y - 1) + ',' + Z)) { keep.push(t); continue; }
  let g = Y - 1; while (g > 0 && !c[g - 1] && Y - g < 4) g--;
  t.__was = Y;
  if (c[g - 1] && Y - g <= 3) { t[2] = g; keep.push(t); dropped++; } else { t.__gone = true; gone++; }
}
s = s.slice(0, st) + JSON.stringify(keep, (k, v) => (k === '__was' || k === '__gone' ? undefined : v)) + s.slice(en); fs.writeFileSync(SF, s);
console.log('floating furniture', { dropped, gone });

// The solid ones (barrels, chests, tables, beds and the rest) had a barrier in their block: it moves with them, or goes.
{
  const names = (() => { const t = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = t.slice(t.indexOf('export enum B {') + 15, t.indexOf('}', t.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean); })();
  const BARRIER = names.indexOf('Barrier');
  const SOLID = new Set(['table', 'chest', 'hearth', 'desk', 'dresser', 'counter', 'shelves', 'bed', 'strongbox']);
  const files = new Map();
  const cell = (x, z) => { const cx = Math.floor(x / 32), cz = Math.floor(z / 32), fn = cx + '_' + cz + '.bin'; if (!files.has(fn)) { const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = []; for (let c = 0; c < 1024; c++) { const n = f[p++]; const r = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let i = 0; i < l; i++) r[y + i] = b; } cols.push(r); } files.set(fn, { cols, rest: f.subarray(p), dirty: false }); } const d = files.get(fn); return { d, c: d.cols[(z - cz * 32) * 32 + (x - cx * 32)] }; };
  for (const t of arr) {
    if (!(t[0] === 'barrel' || (t[0] === 'furn' && SOLID.has(String(t[5]))))) continue;
    const X = Math.floor(t[1]), Z = Math.floor(t[3]), was = t.__was;
    if (was === undefined) continue;
    const { d, c } = cell(X, Z);
    if (c[was] === BARRIER) { c[was] = 0; d.dirty = true; }
    if (t.__gone !== true && !c[+t[2]]) { c[+t[2]] = BARRIER; d.dirty = true; }
  }
  for (const [fn, d] of files) if (d.dirty) { const parts = []; for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); } fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 })); }
}
