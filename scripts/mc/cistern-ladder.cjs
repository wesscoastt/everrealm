// A way back up out of the Drowned Cistern's bottom hall (owner 2026-11-13, "populate it"): in the owner's world the bottom
// was flooded and you swam up out of it; drained, it was a pit with no way out. Three blocks of rock cut out at (-2757, 2240),
// between the hall and the corridor at -4 above it, for a ladder (world/ladders.ts CISTERN_LADDER, drawn by world/sites.ts).
// Run after scripts/mc/deepbox.ts. Safe to run again.
const fs = require('fs'), zlib = require('zlib');
const MINY = -24, H = 25, X = -2757, Z = 2240;
const cx = Math.floor(X / 32), cz = Math.floor(Z / 32), fn = `public/mcland/deep/${cx}_${cz}.bin`;
const d = zlib.inflateRawSync(fs.readFileSync(fn)); let q = 0; const list = [];
for (let c = 0; c < 1024; c++) { const n = d[q++]; if (n === 255) { list.push(null); continue; } const a = new Uint8Array(H); for (let i = 0; i < n; i++) { const y = d[q++], l = d[q++], b = d[q++]; for (let j = 0; j < l; j++) if (y + j < H) a[y + j] = b; } list.push(a); }
const col = list[(Z - cz * 32) * 32 + (X - cx * 32)];
for (let y = -7; y <= -5; y++) col[y - MINY] = 0;
const parts = list.map((a) => { if (!a) return Buffer.from([255]); const r = []; let y = 0; while (y < H) { if (!a[y]) { y++; continue; } let l = 1; while (y + l < H && a[y + l] === a[y]) l++; r.push(y, l, a[y]); y += l; } return Buffer.from([r.length / 3, ...r]); });
fs.writeFileSync(fn, zlib.deflateRawSync(Buffer.concat(parts), { level: 9 }));
console.log('the cistern ladder shaft cut');
