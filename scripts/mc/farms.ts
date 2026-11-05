// Where the farmland and the houses (doors and beds) are, round a Bedrock world's city: 32-block cells.
import { readDb } from './leveldb';
import { readSubChunk } from './bedrock';
const [dir, x0s, z0s, x1s, z1s] = process.argv.slice(2);
const X0 = Math.floor(+x0s / 16), Z0 = Math.floor(+z0s / 16), X1 = Math.floor(+x1s / 16), Z1 = Math.floor(+z1s / 16);
const db = readDb(dir, (k) => k.length === 10 && k[8] === 0x2f && k.readInt8(9) >= 3 && k.readInt8(9) <= 6 && (() => { const x = k.readInt32LE(0), z = k.readInt32LE(4); return x >= X0 && x <= X1 && z >= Z0 && z <= Z1; })());
const farm = new Map<string, number>(), house = new Map<string, number>(), built = new Map<string, number>();
const FARM = /farmland|wheat|carrots|potatoes|beetroot|pumpkin_stem|melon_stem/, HOUSE = /_door$|wooden_door|_bed$|^bed$/, BUILT = /planks|brick|glass|stairs|slab|fence|_wall|cobblestone|stone_bricks|terracotta|concrete|wool|hay/;
for (const [k, e] of db) {
  if (!e.value) continue;
  const b = Buffer.from(k, 'latin1'), sc = readSubChunk(e.value); if (!sc) continue;
  const key = Math.floor(b.readInt32LE(0) / 2) + ',' + Math.floor(b.readInt32LE(4) / 2);
  const f = sc.palette.map((p) => FARM.test(p.name.replace('minecraft:', ''))), h = sc.palette.map((p) => HOUSE.test(p.name.replace('minecraft:', ''))), bl = sc.palette.map((p) => BUILT.test(p.name.replace('minecraft:', '')));
  let nf = 0, nh = 0, nb = 0; for (let i = 0; i < 4096; i++) { if (f[sc.idx[i]]) nf++; if (h[sc.idx[i]]) nh++; if (bl[sc.idx[i]]) nb++; }
  if (nf) farm.set(key, (farm.get(key) ?? 0) + nf); if (nh) house.set(key, (house.get(key) ?? 0) + nh); if (nb) built.set(key, (built.get(key) ?? 0) + nb);
}
console.log(`x ${X0 * 16}.., z ${Z0 * 16}.., 32 blocks a character: F farmland, H doors/beds, # built, + some building`);
for (let z = Math.floor(Z0 / 2); z <= Math.floor(Z1 / 2); z++) { let r = String(z * 32).padStart(6) + ' '; for (let x = Math.floor(X0 / 2); x <= Math.floor(X1 / 2); x++) { const k = x + ',' + z; r += (farm.get(k) ?? 0) > 60 ? 'F' : (house.get(k) ?? 0) > 3 ? 'H' : (built.get(k) ?? 0) > 400 ? '#' : (built.get(k) ?? 0) > 60 ? '+' : '.'; } console.log(r); }
