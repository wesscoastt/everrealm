// Guard for growing the world: the land players already know must not move.
//   npm run heights            compare with the saved record (exit 1 on any change)
//   npm run heights -- --save  record the land as it is now (only on purpose, after reviewing a change)
//
// Samples every fourth block over the world as it stood before the expansion (-384..2432 on both
// axes): the ground you stand on (after the planner's flattening round sites), the region and its
// blend, and whether a road or a river runs there. Open sea more than 120 blocks from any land is
// left out, so new isles may rise there; everything else has to come out the same.

import zlib from 'node:zlib';
import fs from 'node:fs';
import { heightAt, regionAt, roadDist, riverDist, SEA, RegionId } from '../src/world/terrain';
import { plan } from '../src/world/sites';

const X0 = -384, SIZE = 2816, S = 4, N = SIZE / S;
const FILE = 'scripts/baselines/heights.bin.gz';
const IDS: RegionId[] = ['greenwake', 'crownroad', 'brambledeep', 'saltwind', 'redstone', 'starfall'];
const MARGIN = 30; // samples (120 blocks) of sea kept round the land: harbours, jetties, the Kelpie Arch

plan(); // the planner's flattening is part of the ground
const cur = Buffer.alloc(N * N * 3);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const x = X0 + i * S + 2, z = X0 + j * S + 2;
  const r = regionAt(x, z);
  const o = (j * N + i) * 3;
  cur[o] = heightAt(x, z);
  cur[o + 1] = (IDS.indexOf(r.a) & 15) | ((IDS.indexOf(r.b) & 15) << 4);
  cur[o + 2] = Math.round(r.t * 30) | (roadDist(x, z) < 3 ? 64 : 0) | (riverDist(x, z) < 6 ? 128 : 0);
}

if (process.argv.includes('--save')) {
  fs.mkdirSync('scripts/baselines', { recursive: true });
  fs.writeFileSync(FILE, zlib.gzipSync(cur, { level: 9 }));
  console.log(`Recorded ${N * N} samples to ${FILE}.`);
  process.exit(0);
}

const base = zlib.gunzipSync(fs.readFileSync(FILE));
// Which samples are guarded: land in the record, and the sea within MARGIN of it
const land = new Uint8Array(N * N);
for (let k = 0; k < N * N; k++) land[k] = base[k * 3] >= SEA - 1 ? 1 : 0;
const rows = new Uint8Array(N * N), guard = new Uint8Array(N * N);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  let v = 0;
  for (let d = -MARGIN; d <= MARGIN && !v; d++) { const ii = i + d; if (ii >= 0 && ii < N && land[j * N + ii]) v = 1; }
  rows[j * N + i] = v;
}
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  let v = 0;
  for (let d = -MARGIN; d <= MARGIN && !v; d++) { const jj = j + d; if (jj >= 0 && jj < N && rows[jj * N + i]) v = 1; }
  guard[j * N + i] = v;
}

const name = (b: number) => IDS[b & 15] ?? 'new region';
let changed = 0, guarded = 0;
const tiles = new Map<string, { n: number; x: number; z: number; was: string; now: string }>();
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const k = j * N + i;
  if (!guard[k]) continue;
  guarded++;
  const o = k * 3;
  if (base[o] === cur[o] && base[o + 1] === cur[o + 1] && base[o + 2] === cur[o + 2]) continue;
  changed++;
  const x = X0 + i * S + 2, z = X0 + j * S + 2;
  const key = `${Math.floor(x / 64) * 64},${Math.floor(z / 64) * 64}`;
  const t = tiles.get(key);
  const desc = (b: Buffer) => `h ${b[o]} ${name(b[o + 1])}${b[o + 2] & 64 ? ' road' : ''}${b[o + 2] & 128 ? ' river' : ''}`;
  if (t) t.n++;
  else tiles.set(key, { n: 1, x, z, was: desc(base), now: desc(cur) });
}
console.log(`${guarded} samples of today's land and shore checked.`);
if (!changed) { console.log('No change.'); process.exit(0); }
console.log(`${changed} changed, in ${tiles.size} tiles of 64 blocks:`);
for (const [k, t] of [...tiles].sort((a, b) => b[1].n - a[1].n).slice(0, 40)) console.log(`  tile ${k}: ${t.n} samples, e.g. (${t.x}, ${t.z}) was ${t.was}, now ${t.now}`);
process.exit(1);
