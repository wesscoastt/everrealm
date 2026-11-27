// Kestle, a village and not a Minecraft one (owner 2026-11-26: "make sure kestle isnt left with leftover villager houses and
// that it looks like a natural town"). Kestle grew round a taiga village the world generated, and eight of its houses
// are that village's stock pieces: four the same little log cabin, two the same bigger one, two the same narrow one, all
// with the same steep plank roof and the same cobble chimney in the same corner. Each is taken down to its floor and a
// cottage of its own put up on the same ground, with its door where the old one was (the path leads there):
//   whitewash and pine, thatched; grey stone under dark shingles; ochre plaster in a timber frame, thatched; rose plaster
//   on a stone ground floor, tiled; a fisherman's blue cottage, thatched; clay and thatch with a brick chimney; a
//   timber-framed house in plaster, slated; and a narrow two-storey house of stone and dark boards.
// Every one: a foundation down to the ground, windows in each wall, a gabled roof with an overhang where there's room
// and a ridge, a chimney at a gable end with a lit hearth inside, a floor, a bed, a shelf, flowers by the door and a
// woodpile at the side. The Minecraft props inside (torches, lanterns, furnaces, chests, fences) go; the door is moved
// to the new doorway. Not idempotent: run once, on the chunks as they were at bc71e81 (it finds the houses by where
// they stood, and they won't be there twice).
const fs = require('fs'), zlib = require('zlib');
const names = (() => { const s = fs.readFileSync('src/world/blocks.ts', 'utf8'); const b = s.slice(s.indexOf('export enum B {') + 15, s.indexOf('}', s.indexOf('export enum B {'))); return b.replace(/\/\/.*$/gm, '').split(',').map((x) => x.split('=')[0].trim()).filter(Boolean); })();
const id = (n) => { const i = names.indexOf(n); if (i < 0) throw new Error(n); return i; };
const AIR = 0, GRASS = id('Grass'), FLOWERS = id('FlowerGrass'), WATER = id('Water');
const NATURAL = new Set(['Grass', 'Dirt', 'Stone', 'Sand', 'Gravel', 'Snow', 'SnowGrass', 'Clay', 'Loam', 'Granite', 'Path', 'Farmland', 'FlowerGrass'].map(id));
const LEAVES = new Set(['OakLeaves', 'BirchLeaves', 'PineLeaves'].map(id));
const dry = process.argv.includes('--dry');

// ---- chunk files
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
const get = (x, y, z) => (y < 0 || y > 111 ? AIR : cell(x, z).c[y]);
const set = (x, y, z, b) => { if (y < 0 || y > 111) return; const { d, c } = cell(x, z); if (c[y] !== b) { c[y] = b; d.dirty = true; } };

// ---- the props
const SIGNS = 'src/data/mcSigns.ts';
const src = fs.readFileSync(SIGNS, 'utf8');
const ta = src.indexOf('export const MC_THINGS'), ts = src.indexOf('[', src.indexOf('=', ta)), te = src.indexOf(';\n', ts);
let THINGS = JSON.parse(src.slice(ts, te));

// ---- the houses: the template's ground plan (the posts included) and which style goes up there
const HOUSES = [
  { box: [-2319, 2308, -2313, 2314], style: 'whitewash' },
  { box: [-2367, 2333, -2361, 2339], style: 'stone' },
  { box: [-2326, 2343, -2320, 2349], style: 'ochre' },
  { box: [-2329, 2371, -2323, 2377], style: 'rose' },
  { box: [-2391, 2333, -2385, 2339], style: 'blue' },
  { box: [-2335, 2333, -2329, 2339], style: 'clay' },
  { box: [-2322, 2333, -2317, 2339], style: 'timber' },
  { box: [-2382, 2343, -2376, 2348], style: 'tall' },
];
const STYLES = {
  whitewash: { wall: 'Plaster', post: 'PineLog', roof: 'Thatch', ridge: 'Thatch', chimney: 'Cobble', floor: 'Planks', found: 'Cobble', storeys: 1 },
  stone: { wall: 'StoneBrick', post: 'StoneBrick', roof: 'DarkPlanks', ridge: 'PineLog', chimney: 'StoneBrick', floor: 'Flagstone', found: 'MossyCobble', storeys: 1 },
  ochre: { wall: 'OchrePlaster', post: 'Timber', roof: 'Thatch', ridge: 'Thatch', chimney: 'RedBrick', floor: 'Planks', found: 'Cobble', storeys: 1, band: 'Timber' },
  rose: { wall: 'RosePlaster', low: 'StoneBrick', post: 'StoneBrick', roof: 'TerraOrange', ridge: 'TerraBrown', chimney: 'RedBrick', floor: 'Flagstone', found: 'StoneBrick', storeys: 1 },
  blue: { wall: 'BluePlaster', post: 'PineLog', roof: 'Thatch', ridge: 'Thatch', chimney: 'Cobble', floor: 'Planks', found: 'MossyCobble', storeys: 1 },
  clay: { wall: 'Clay', post: 'OakLog', roof: 'Thatch', ridge: 'Thatch', chimney: 'RedBrick', floor: 'Planks', found: 'Cobble', storeys: 1 },
  timber: { wall: 'Plaster', post: 'Timber', roof: 'TerraBrown', ridge: 'TerraOrange', chimney: 'StoneBrick', floor: 'DarkPlanks', found: 'StoneBrick', storeys: 1, band: 'Timber', frame: true },
  tall: { wall: 'DarkPlanks', low: 'Cobble', post: 'PineLog', roof: 'DarkPlanks', ridge: 'PineLog', chimney: 'Cobble', floor: 'DarkPlanks', found: 'Cobble', storeys: 2, band: 'PineLog' },
};

const BUILT = (b) => b !== AIR && !NATURAL.has(b) && !LEAVES.has(b) && b !== WATER;
let built = 0, propsGone = 0;
for (const h of HOUSES) {
  const [x0, z0, x1, z1] = h.box, st = STYLES[h.style], B = (n) => id(n);
  const W = x1 - x0 + 1, D = z1 - z0 + 1;
  // the floor the old house stood on: the lowest built block in its middle column
  const mx = Math.round((x0 + x1) / 2), mz = Math.round((z0 + z1) / 2);
  let F = -1; for (let y = 1; y < 100; y++) if (BUILT(get(mx, y, mz))) { F = y; break; }
  if (F < 0) { console.log('no house at', h.box); continue; }
  // the old door: where the path comes to, and which wall it was in
  const door = THINGS.find((t) => t[0] === 'mcdoor' && +t[1] >= x0 - 1 && +t[1] <= x1 + 1 && +t[3] >= z0 - 1 && +t[3] <= z1 + 1);
  const dx = door ? Math.floor(+door[1]) : mx, dz = door ? Math.floor(+door[3]) : z1;
  const dist = { n: dz - z0, s: z1 - dz, w: dx - x0, e: x1 - dx };
  const side = Object.entries(dist).sort((a, b) => a[1] - b[1])[0][0];
  const DX = side === 'w' ? x0 : side === 'e' ? x1 : Math.max(x0 + 1, Math.min(x1 - 1, dx));
  const DZ = side === 'n' ? z0 : side === 's' ? z1 : Math.max(z0 + 1, Math.min(z1 - 1, dz));
  // take the old house down: everything built above the floor in its ground plan, and its roof's overhang round it
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = F + 1; y < Math.min(112, F + 20); y++) if (BUILT(get(x, y, z))) set(x, y, z, AIR);
  const H = st.storeys === 2 ? 7 : 4; // wall height over the floor
  const top = F + H; // the wall plate
  const isCorner = (x, z) => (x === x0 || x === x1) && (z === z0 || z === z1);
  const onWall = (x, z) => x === x0 || x === x1 || z === z0 || z === z1;
  // gable along the longer side; the roof's slope runs across the short one
  const alongX = W >= D;
  // foundation down to the ground, and the floor
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (onWall(x, z)) { set(x, F, z, B(st.found)); for (let y = F - 1; y > F - 8 && (get(x, y, z) === AIR || get(x, y, z) === WATER); y--) set(x, y, z, B(st.found)); }
    else set(x, F, z, B(st.floor));
  }
  // walls, posts, windows, the band between storeys
  const winAt = (x, z, y) => {
    if (isCorner(x, z)) return false;
    const rel = y - F; if (!(rel === 2 || (st.storeys === 2 && rel === 5))) return false;
    const along = x === x0 || x === x1 ? z - z0 : x - x0, len = x === x0 || x === x1 ? D : W;
    return (len <= 6 ? along === Math.floor(len / 2) : along === 2 || along === len - 3) && !(x === DX && z === DZ);
  };
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (!onWall(x, z)) continue;
    for (let y = F + 1; y <= top; y++) {
      let b = B(st.wall);
      if (st.low && y <= F + (st.storeys === 2 ? 3 : 1)) b = B(st.low);
      if (st.band && (y === top || (st.storeys === 2 && y === F + 4))) b = B(st.band);
      if (st.frame && !isCorner(x, z) && ((x - x0 + z - z0) % 3 === 0)) b = B('Timber');
      if (isCorner(x, z)) b = B(st.post);
      if (winAt(x, z, y)) b = B('Window');
      if (x === DX && z === DZ && y <= F + 2) b = AIR; // the doorway
      set(x, y, z, b);
    }
  }
  // the roof: rising a block for every block in from the long eaves, an overhang where nothing's in the way
  const half = Math.floor(((alongX ? D : W) - 1) / 2); // the ridge is this many blocks in from the eaves
  const roofAt = (x, y, z, b) => { if (get(x, y, z) === AIR || BUILT(get(x, y, z)) && (x >= x0 && x <= x1 && z >= z0 && z <= z1)) set(x, y, z, b); };
  for (let k = -1; k <= half; k++) {
    const y = top + 1 + Math.max(0, k);
    for (let t = (alongX ? x0 : z0) - 1; t <= (alongX ? x1 : z1) + 1; t++) {
      for (const sideK of [0, 1]) {
        const across = alongX ? (sideK ? z1 - k : z0 + k) : (sideK ? x1 - k : x0 + k);
        const x = alongX ? t : across, z = alongX ? across : t;
        const ridge = alongX ? (z1 - k) - (z0 + k) <= 0 : (x1 - k) - (x0 + k) <= 0;
        roofAt(x, k < 0 ? top : y, z, B(ridge ? st.ridge : st.roof));
      }
    }
    // the gable ends, walled up under the roof
    if (k >= 0) for (const e of [alongX ? x0 : z0, alongX ? x1 : z1]) for (let a = (alongX ? z0 : x0) + k + 1; a <= (alongX ? z1 : x1) - k - 1; a++) {
      const x = alongX ? e : a, z = alongX ? a : e;
      set(x, top + 1 + k, z, B(st.storeys === 2 ? st.wall : st.band ?? st.wall));
    }
  }
  // the chimney, at the gable end away from the door, with a hearth inside
  const cx = alongX ? (side === 'w' ? x1 : x0) : Math.round((x0 + x1) / 2) + 1, cz = alongX ? Math.round((z0 + z1) / 2) + 1 : (side === 'n' ? z1 : z0);
  for (let y = F + 1; y <= top + half + 2; y++) set(cx, y, cz, B(st.chimney));
  const ix = cx + (cx === x0 ? 1 : cx === x1 ? -1 : 0), iz = cz + (cz === z0 ? 1 : cz === z1 ? -1 : 0);
  set(ix, F + 1, iz, B('Emberstone')); set(ix, F + 2, iz, AIR);
  // a bed (two of wool) and a shelf against the walls inside, out of the doorway's line
  const inner = [];
  for (let x = x0 + 1; x <= x1 - 1; x++) for (let z = z0 + 1; z <= z1 - 1; z++) if ((x === x0 + 1 || x === x1 - 1 || z === z0 + 1 || z === z1 - 1) && Math.abs(x - DX) + Math.abs(z - DZ) > 2 && !(x === ix && z === iz)) inner.push([x, z]);
  if (inner.length > 3) {
    const [bx, bz] = inner[0]; set(bx, F + 1, bz, B('Wool'));
    const nb = inner.find(([x, z]) => Math.abs(x - bx) + Math.abs(z - bz) === 1); if (nb) set(nb[0], F + 1, nb[1], B('Wool'));
    const [sx, sz] = inner[inner.length - 1]; set(sx, F + 1, sz, B('Bookshelf'));
  }
  // flowers either side of the door, and a woodpile against a side wall, on the grass outside
  const out = side === 'n' ? [0, -1] : side === 's' ? [0, 1] : side === 'w' ? [-1, 0] : [1, 0];
  for (const off of [-2, -1, 1, 2]) {
    const fx = DX + out[0] + (out[0] ? 0 : off), fz = DZ + out[1] + (out[1] ? 0 : off);
    for (let y = F + 1; y >= F - 2; y--) if (get(fx, y, fz) === GRASS && get(fx, y + 1, fz) === AIR) { set(fx, y, fz, FLOWERS); break; }
  }
  const wp = alongX ? [x0 + 1, side === 'n' ? z1 + 1 : z0 - 1] : [side === 'w' ? x1 + 1 : x0 - 1, z0 + 1];
  for (let y = F + 1; y >= F - 2; y--) if (NATURAL.has(get(wp[0], y, wp[1])) && get(wp[0], y + 1, wp[1]) === AIR) { set(wp[0], y + 1, wp[1], B('OakLog')); if (get(wp[0] + (alongX ? 1 : 0), y + 1, wp[1] + (alongX ? 0 : 1)) === AIR && NATURAL.has(get(wp[0] + (alongX ? 1 : 0), y, wp[1] + (alongX ? 0 : 1)))) set(wp[0] + (alongX ? 1 : 0), y + 1, wp[1] + (alongX ? 0 : 1), B('OakLog')); break; }
  // the props: the old house's go, its door moves to the new doorway
  const before = THINGS.length;
  THINGS = THINGS.filter((t) => !(t !== door && +t[1] >= x0 - 1 && +t[1] <= x1 + 1 && +t[3] >= z0 - 1 && +t[3] <= z1 + 1 && t[0] !== 'mcsign'));
  propsGone += before - THINGS.length;
  if (door) { door[1] = DX + 0.5; door[2] = F + 1; door[3] = DZ + 0.5; door[4] = side === 'n' ? Math.PI : side === 's' ? 0 : side === 'w' ? -Math.PI / 2 : Math.PI / 2; }
  built++;
  console.log(h.style.padEnd(10), 'at', h.box.join(','), 'floor', F, 'door', side, DX, DZ);
}

let written = 0;
for (const [fn, d] of files) {
  if (!d.dirty) continue; written++;
  if (dry) continue;
  const parts = [];
  for (const c of d.cols) { const runs = []; let k = 0; while (k < 112) { if (!c[k]) { k++; continue; } let l = 1; while (k + l < 112 && c[k + l] === c[k] && l < 255) l++; runs.push(k, l, c[k]); k += l; } parts.push(runs.length / 3, ...runs); }
  fs.writeFileSync('public/mcland/' + fn, zlib.deflateRawSync(Buffer.concat([Buffer.from(parts), d.rest]), { level: 9 }));
}
if (!dry) fs.writeFileSync(SIGNS, src.slice(0, ts) + JSON.stringify(THINGS) + src.slice(te));
console.log('Kestle cottages', { built, propsGone, files: written, dry });
