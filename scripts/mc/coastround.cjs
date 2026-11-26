// Run on the exported chunks (node scripts/mc/coastround.cjs [--dry]): Verandah's island filled its rectangle
// to the edges, so it showed on the map as a square. Its corners are rounded off here, and its long sides bitten
// into in bays and headlands, the ground falling away to the sea floor over a shore of its own (owner 2026-11-26,
// "round it off where able"). Nothing within ROOM blocks of anything built is touched, and only the ground is
// ever lowered. Run it once, on the export (each run lowers the slopes again). A tree whose foot is lost goes with all its blocks; the city's height map
// (src/world/mclandHeights.ts) is rewritten from the result. Writes F:/everrealm-scratch/coast-before.png and
// coast-after.png (top-down, one pixel a column) to look at.
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const s = fs.readFileSync('src/world/blocks.ts', 'utf8');
const names = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))).replace(/\/\/.*$/gm, '').split(',').map((x) => x.split('=')[0].trim()).filter(Boolean);
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw n; return i; };
const SEA = 16, SY = 112, FLOOR = SEA - 9, ROOM = 40, FADE = 30, CR = 260, CELL = 8;
const X0 = -3560, Z0 = 1800, W = 1290, D = 1080; // the city piece (world/mclandArea.ts pieceBounds)
const AIR = 0, WATER = id('Water'), STONE = id('Stone'), SAND = id('Sand'), GRASS = id('Grass'), GRAVEL = id('Gravel');
const NAT = new Set(['Grass', 'Dirt', 'Loam', 'Sand', 'RedSand', 'Gravel', 'Stone', 'Granite', 'DeepStone', 'Snow', 'Ice', 'Clay', 'Basalt', 'OakLog', 'BirchLog', 'PineLog', 'OakLeaves', 'BirchLeaves', 'PineLeaves', 'Water', 'Glowcap'].map(id));
const TREE = new Set(['OakLog', 'BirchLog', 'PineLog', 'OakLeaves', 'BirchLeaves', 'PineLeaves'].map(id));
const DRY = process.argv.includes('--dry');
if (AIR !== 0 || names[0] !== 'Air') throw 'Air is not 0';

// ---- read every chunk: columns (runs of y, length, block) and its trees
const DIR = 'public/mcland', chunks = new Map();
for (const fn of fs.readdirSync(DIR).filter((f) => /^-?\d+_-?\d+\.bin$/.test(f))) {
  const [cx, cz] = fn.replace('.bin', '').split('_').map(Number);
  const f = zlib.inflateRawSync(fs.readFileSync(path.join(DIR, fn)));
  let p = 0; const cols = [];
  for (let c = 0; c < 1024; c++) { const n = f[p++]; const r = []; for (let q = 0; q < n; q++) r.push([f[p++], f[p++], f[p++]]); cols.push(r); }
  const trees = [];
  if (p + 1 < f.length) {
    const nt = (f[p] << 8) | f[p + 1]; p += 2;
    for (let k = 0; k < nt; k++) {
      const st = p; const kind = f[p++], logs = f[p++], tx = f[p++], ty = f[p++], tz = f[p++];
      const n1 = (f[p] << 8) | f[p + 1]; p += 2; const trunk = []; for (let i = 0; i < n1; i++, p += 3) trunk.push([cx * 32 + tx + f[p] - 128, f[p + 1], cz * 32 + tz + f[p + 2] - 128]);
      const n2 = (f[p] << 8) | f[p + 1]; p += 2; const leaves = []; for (let i = 0; i < n2; i++, p += 4) leaves.push([cx * 32 + tx + f[p] - 128, f[p + 1], cz * 32 + tz + f[p + 2] - 128]);
      trees.push({ x: cx * 32 + tx, z: cz * 32 + tz, bytes: f.subarray(st, p), trunk, leaves, kind, logs });
    }
  }
  if (p !== f.length) throw fn + ': ' + (f.length - p) + ' bytes left over';
  chunks.set(fn, { cx, cz, cols, trees, dirty: false });
}
const colAt = (x, z) => { const ch = chunks.get(Math.floor(x / 32) + '_' + Math.floor(z / 32) + '.bin'); if (!ch) return null; return { ch, c: (x - Math.floor(x / 32) * 32) + (z - Math.floor(z / 32) * 32) * 32 }; };
const expand = (r) => { const a = new Uint8Array(SY); for (const [y, l, b] of r) for (let k = 0; k < l; k++) if (y + k < SY) a[y + k] = b; return a; };
const pack = (a) => { const r = []; for (let y = 0; y < SY;) { if (!a[y]) { y++; continue; } let l = 1; while (y + l < SY && a[y + l] === a[y] && l < 255) l++; r.push([y, l, a[y]]); y += l; } return r; };

// ---- the island as a grid: built or not, its ground's top, and what's there now
const N = W * D, built = new Uint8Array(N), ground = new Int16Array(N).fill(-1), have = new Uint8Array(N);
for (let iz = 0; iz < D; iz++) for (let ix = 0; ix < W; ix++) {
  const at = colAt(X0 + ix, Z0 + iz); if (!at) continue;
  const i = ix + iz * W; have[i] = 1;
  const a = expand(at.ch.cols[at.c]);
  for (let y = SY - 1; y >= 0; y--) { const b = a[y]; if (!b) continue; if (y >= SEA && !NAT.has(b)) built[i] = 1; if (ground[i] < 0 && !TREE.has(b) && b !== WATER) ground[i] = y; }
}
// distance from anything built, true distance (a two-pass chamfer, so its edge is round, not a diamond)
const dist = new Float32Array(N).fill(1e9), SQ = Math.SQRT2;
for (let i = 0; i < N; i++) if (built[i]) dist[i] = 0;
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) { const i = x + z * W; let d = dist[i]; if (x > 0) d = Math.min(d, dist[i - 1] + 1); if (z > 0) { d = Math.min(d, dist[i - W] + 1); if (x > 0) d = Math.min(d, dist[i - W - 1] + SQ); if (x < W - 1) d = Math.min(d, dist[i - W + 1] + SQ); } dist[i] = d; }
for (let z = D - 1; z >= 0; z--) for (let x = W - 1; x >= 0; x--) { const i = x + z * W; let d = dist[i]; if (x < W - 1) d = Math.min(d, dist[i + 1] + 1); if (z < D - 1) { d = Math.min(d, dist[i + W] + 1); if (x < W - 1) d = Math.min(d, dist[i + W + 1] + SQ); if (x > 0) d = Math.min(d, dist[i + W - 1] + SQ); } dist[i] = d; }

const wob = (x, z) => (Math.sin(x * 0.043 + 1.7) + Math.sin(z * 0.051 + 0.3) + Math.sin((x + z) * 0.027 + 2.1) + Math.sin((x - z) * 0.071)) / 4;
const low = (x, z) => (Math.sin(x * 0.011 + 0.4) + Math.sin(z * 0.013 + 2.2) + Math.sin((x + z) * 0.008 + 1.1)) / 3;
const hsh = (x, z) => { let h = (x * 374761393 + z * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// how far the ground at a column is to fall toward the sea floor: 0 none, 1 all the way
// (high ground falls over a longer slope, about 1 in 2.2, so a hill meets the sea in a grassy fall, not a cliff)
const fall = (ix, iz, g) => {
  const ex = Math.min(ix, W - 1 - ix), ez = Math.min(iz, D - 1 - iz);
  const room = ex < CR && ez < CR ? CR - Math.hypot(CR - ex, CR - ez) : Math.min(ex, ez);
  const fl = Math.max(FADE, (g - FLOOR) * 2.2);
  const R = room - FADE - 6 - (45 + 40 * low(ix, iz)) + wob(ix * 1.7, iz * 1.7) * 14;
  const d = dist[ix + iz * W];
  const keep = ROOM - d + wob(ix * 1.3 + 50, iz * 1.3) * 8; // (within ROOM of a building: kept, falling away past it)
  const Reff = Math.max(R, keep);
  return Reff >= 0 ? 0 : Math.min(1, Math.max(-Reff / fl, 1 - room / 12)); // (down to the floor by the rectangle's edge)
};

// ---- carve, and note the trees that lose their foot
const lostTree = new Set(); let carved = 0;
const before = new Uint8Array(N * 3), after = new Uint8Array(N * 3);
const tint = (out, i, a) => { let top = -1, b = 0; for (let y = SY - 1; y >= 0; y--) if (a[y]) { top = y; b = a[y]; break; } const c = b === WATER ? [70, 110, 150] : TREE.has(b) ? [60, 110, 50] : NAT.has(b) ? (b === SAND ? [210, 195, 140] : [120, 160, 90]) : [150, 120, 100]; const k = Math.max(0.5, Math.min(1.3, 0.6 + top / 60)); out[i * 3] = Math.min(255, c[0] * k); out[i * 3 + 1] = Math.min(255, c[1] * k); out[i * 3 + 2] = Math.min(255, c[2] * k); };
const sunk = new Uint8Array(N);
for (let iz = 0; iz < D; iz++) for (let ix = 0; ix < W; ix++) {
  const i = ix + iz * W; if (!have[i]) continue;
  const at = colAt(X0 + ix, Z0 + iz), a = expand(at.ch.cols[at.c]);
  tint(before, i, a);
  const g = ground[i], t = built[i] ? 0 : fall(ix, iz, g);
  if (t > 0 && g > FLOOR) {
    let base = g; // (ground under any water standing on it)
    const want = Math.round(base + (FLOOR - base) * t);
    if (want < g) {
      for (let y = 0; y < SY; y++) {
        const b = a[y];
        if (y > want) { if (!TREE.has(b)) a[y] = y < SEA ? WATER : AIR; else if (y < SEA) a[y] = WATER; }
        else if (y === want) a[y] = want < SEA ? (hsh(X0 + ix, Z0 + iz) < 0.3 ? GRAVEL : SAND) : want === SEA ? SAND : (b === AIR || b === WATER || TREE.has(b) ? GRASS : b === STONE ? (t > 0.6 ? GRAVEL : b) : b === id('Dirt') || b === id('Loam') ? GRASS : b);
        else if (b === AIR || b === WATER || TREE.has(b)) a[y] = STONE;
      }
      at.ch.cols[at.c] = pack(a); at.ch.dirty = true; carved++; sunk[i] = 1;
    }
  }
}
// a tree whose foot was lowered: it and every block of it go
for (const ch of chunks.values()) ch.trees = ch.trees.filter((tr) => {
  const ix = tr.x - X0, iz = tr.z - Z0;
  if (ix < 0 || iz < 0 || ix >= W || iz >= D || !sunk[ix + iz * W]) return true;
  lostTree.add(tr); ch.dirty = true; return false;
});
for (const tr of lostTree) for (const [x, y, z] of [...tr.trunk, ...tr.leaves]) {
  const at = colAt(x, z); if (!at) continue;
  const a = expand(at.ch.cols[at.c]); if (!TREE.has(a[y])) continue;
  a[y] = y < SEA ? WATER : AIR; at.ch.cols[at.c] = pack(a); at.ch.dirty = true;
}
// loose leaves and logs left standing over the new sea with no tree of their own (a kept tree's crown overhanging is left)
const kept = new Set(); for (const ch of chunks.values()) for (const tr of ch.trees) for (const [x, y, z] of [...tr.trunk, ...tr.leaves]) kept.add(x + ',' + y + ',' + z);
let loose = 0;
for (let iz = 0; iz < D; iz++) for (let ix = 0; ix < W; ix++) {
  const i = ix + iz * W; if (!sunk[i]) continue;
  const at = colAt(X0 + ix, Z0 + iz), a = expand(at.ch.cols[at.c]); let ch = false;
  for (let y = 0; y < SY; y++) if (TREE.has(a[y]) && !kept.has((X0 + ix) + ',' + y + ',' + (Z0 + iz))) { a[y] = y < SEA ? WATER : AIR; ch = true; loose++; }
  if (ch) { at.ch.cols[at.c] = pack(a); at.ch.dirty = true; }
}
for (let i = 0; i < N; i++) if (have[i]) { const at = colAt(X0 + (i % W), Z0 + ((i / W) | 0)); tint(after, i, expand(at.ch.cols[at.c])); }

// ---- pictures
const png = (w, h, rgb) => {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
fs.writeFileSync('F:/everrealm-scratch/coast-before.png', png(W, D, before));
fs.writeFileSync('F:/everrealm-scratch/coast-after.png', png(W, D, after));

// ---- write
let files = 0;
if (!DRY) {
  for (const [fn, ch] of chunks) {
    if (!ch.dirty) continue; files++;
    const parts = []; for (const r of ch.cols) { if (r.length > 255) throw fn + ': too many runs'; parts.push(r.length); for (const [y, l, b] of r) parts.push(y, l, b); }
    const tb = [ch.trees.length >> 8, ch.trees.length & 255];
    fs.writeFileSync(path.join(DIR, fn), zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), Buffer.from(tb), ...ch.trees.map((t) => Buffer.from(t.bytes))]), { level: 9 }));
  }
  // the city's coarse height map, as the export takes it: the top of the ground (not leaves) every CELL blocks
  const hf = 'src/world/mclandHeights.ts', src = fs.readFileSync(hf, 'utf8');
  const m = src.match(/city: \{ w: (\d+), d: (\d+), b64: '([^']*)' \}/); if (!m) throw 'no city height map';
  const nx = +m[1], nz = +m[2], hts = Buffer.from(m[3], 'base64');
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const ix = Math.min(W - 1, i * CELL), iz = Math.min(D - 1, j * CELL);
    if (!sunk[ix + iz * W]) continue;
    const at = colAt(X0 + ix, Z0 + iz), a = expand(at.ch.cols[at.c]); let top = 0;
    for (let y = SY - 1; y > 0; y--) { const b = a[y]; if (b && b !== id('OakLeaves') && b !== id('BirchLeaves') && b !== id('PineLeaves')) { top = b === WATER ? Math.min(y, SEA - 1) : y + 1; break; } }
    hts[i + j * nx] = top;
  }
  fs.writeFileSync(hf, src.replace(m[0], `city: { w: ${nx}, d: ${nz}, b64: '${hts.toString('base64')}' }`));
}
console.log({ carved, treesLost: lostTree.size, looseBlocks: loose, files, dry: DRY });
