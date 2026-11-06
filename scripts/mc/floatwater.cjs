// Water left hanging in the air where the import melted ice or lost what held it (owner 2026-11-06: "floating water where
// the ice and snow biome was, and in Kestle: remove all of it"): any water with air under it goes, again and again until
// none is left. Run after scripts/mc/export.ts (node scripts/mc/floatwater.cjs).
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.trim()).filter(Boolean); })();
const WATER = names.findIndex((n) => n.startsWith('Water'));
let total = 0, files = 0;
for (const fn of fs.readdirSync('public/mcland').filter((f) => f.endsWith('.bin'))) {
  const f = zlib.inflateRawSync(fs.readFileSync('public/mcland/' + fn)); let p = 0; const cols = [];
  for (let c = 0; c < 1024; c++) { const n = f[p++]; const cell = new Uint8Array(112); for (let q = 0; q < n; q++) { const y = f[p++], l = f[p++], b = f[p++]; for (let k = 0; k < l; k++) cell[y + k] = b; } cols.push(cell); }
  const rest = f.subarray(p);
  let gone = 0;
  for (const c of cols) for (let pass = 0; pass < 112; pass++) {
    let any = false;
    for (let y = 1; y < 112; y++) if (c[y] === WATER && c[y - 1] === 0) { c[y] = 0; gone++; any = true; }
    if (!any) break;
  }
  if (!gone) continue;
  const parts = [];
  for (const c of cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), rest]), { level: 9 }));
  total += gone; files++;
}
console.log('floating water removed', { blocks: total, files });
