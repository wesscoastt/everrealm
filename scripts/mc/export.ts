// The owner's Minecraft city (Bedrock: "Shiesty Craft Medieval"), brought into the game as an island off the
// west coast of the Counties (owner 2026-11-05). Reads the world (scripts/mc/leveldb.ts, bedrock.ts), turns
// a rectangle of it (the walled city, its farms and the houses round it) the right way round into the open sea
// south-west of the Counties, maps every Minecraft block to the nearest of the game's, and
// writes one small compressed file per game chunk (public/mcland/), streamed in by the world worker
// (world/mcland.ts), and a coarse height map for the map, the far terrain and anything that asks heightAt.
//
//   npx tsx scripts/mc/export.ts "<world>/db"
//
// The edges of the rectangle go down to the sea in a beach, except where something's built there.
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { readDb } from './leveldb';
import { NbtReader, readSubChunk, type Nbt, type Palette } from './bedrock';
import { B } from '../../src/world/blocks';
import { MC_CELL, MC_PIECES } from '../../src/world/mclandArea';
import { EDITS } from './edits';

const dir = process.argv[2];
const SY = 112, SEA = 16, CHUNK = 32; // (as world/VoxelWorld.ts)
/** The open sea's floor round the owner's land (world/terrain.ts regionHeight, 'verandah'). */
const SEA_FLOOR = SEA - 9;

// ---------------------------------------------------------------- the small things, as props
/** Minecraft's facings to the game's (0 toward +z, south): a cardinal name, a facing_direction (2 north, 3 south, 4 west, 5 east), a direction (0 south, 1 west, 2 north, 3 east). */
function facingOf(st: Record<string, unknown>): number {
  const c = String(st['minecraft:cardinal_direction'] ?? st.torch_facing_direction ?? '');
  const byName: Record<string, number> = { south: 0, west: -Math.PI / 2, north: Math.PI, east: Math.PI / 2 };
  if (c in byName) return byName[c];
  if (st.facing_direction !== undefined) { const f = Number(st.facing_direction); return f === 2 ? Math.PI : f === 4 ? -Math.PI / 2 : f === 5 ? Math.PI / 2 : 0; }
  if (st.direction !== undefined) { const d = Number(st.direction); return [0, -Math.PI / 2, Math.PI, Math.PI / 2][d & 3]; }
  if (st.weirdo_direction !== undefined) { const d = Number(st.weirdo_direction); return [Math.PI / 2, -Math.PI / 2, 0, Math.PI][d & 3]; }
  return 0;
}
/** A prop for a block that's a thing rather than a block: its kind (and furniture's item, a light's wall or hanging), or null. */
function propOf(p: Palette): { t: string; item?: string; h?: number } | null {
  const n = p.name.replace(/^[a-z0-9_]+:/, ''), st = p.states, vanilla = p.name.startsWith('minecraft:');
  if (/^ladder$/.test(n)) return { t: 'mcladder' };
  if (/torch/.test(n) && !/torchflower/.test(n)) return { t: 'mctorch', h: String(st.torch_facing_direction ?? 'top') === 'top' ? 0 : 1 };
  if (/lantern/.test(n)) {
    if (/lantern_stone|lamp_?post|street/.test(n)) return { t: 'lantern' };
    if (/wall/.test(n)) return { t: 'wallLantern' };
    return { t: 'mclantern', h: st.hanging === 1 || st.hanging === true || /hang/.test(n) ? 1 : 0 };
  }
  if (/lamp/.test(n) && !vanilla) return { t: 'furn', item: 'lamp' };
  if (/_door$|^door$|doorframe/.test(n) && !/trapdoor/.test(n)) return st.upper_block_bit === 1 || st.upper_block_bit === true || /doorframe/.test(n) ? null : { t: 'door' };
  if (/(^|_)bed$/.test(n) && !/pet_bed|flower/.test(n)) return st.head_piece_bit === 1 || st.head_piece_bit === true || !vanilla ? { t: 'furn', item: 'bed' } : null;
  if (/^(chest|trapped_chest|ender_chest)$/.test(n)) return { t: 'furn', item: 'chest' };
  if (/barrel/.test(n)) return { t: 'barrel' };
  if (/crate/.test(n) && !/cropbox/.test(n)) return { t: 'crate' };
  if (/^crafting_table$|cartography|fletching|smithing_table|loom/.test(n)) return { t: 'furn', item: 'table' };
  if (/^(furnace|smoker|blast_furnace)$|stove|oven/.test(n)) return { t: 'furn', item: 'hearth' };
  if (/anvil/.test(n)) return { t: 'anvil' };
  if (/lectern|desk/.test(n)) return { t: 'furn', item: 'desk' };
  if (/carpet|rug/.test(n) && !/moss/.test(n)) return { t: 'furn', item: 'rug' };
  if (vanilla) return null;
  // the furniture add-ons
  if (/table/.test(n)) return { t: 'furn', item: 'table' };
  if (/stool/.test(n)) return { t: 'furn', item: 'stool' };
  if (/chair|seat|throne/.test(n)) return { t: 'furn', item: 'chair' };
  if (/bench|sofa|couch/.test(n)) return { t: 'furn', item: 'bench' };
  if (/sideboard|cabinet|dresser|drawer|wardrobe/.test(n)) return { t: 'furn', item: 'dresser' };
  if (/counter/.test(n)) return { t: 'furn', item: 'counter' };
  if (/shelf/.test(n)) return { t: 'furn', item: 'shelves' };
  if (/candle/.test(n)) return { t: 'furn', item: 'candles' };
  return null;
}

// ---------------------------------------------------------------- Minecraft blocks to the game's
const unknown = new Map<string, number>();
function mapBlock(p: Palette): number {
  // (the owner's review: the windows, the bars, the bookcases, the light posts, the dock's trapdoor walks)
  {
    const n0 = p.name.replace(/^[a-z0-9_]+:/, '');
    if (/glass/.test(n0)) return B.Glass;
    if (/iron_bars|bars$/.test(n0)) return B.Bars;
    if (/bookshelf|bookcase/.test(n0)) return B.Bookshelf;
    if (/^(glowstone|sea_lantern|shroomlight|redstone_lamp|.*froglight)$/.test(n0)) return B.Glowstone;
    if (/trapdoor/.test(n0)) { const open = p.states.open_bit === 1 || p.states.open_bit === true; return open ? B.Air : /dark_oak|spruce|mangrove|crimson|warped/.test(n0) ? B.DarkPlanks : /iron/.test(n0) ? B.Blackstone : B.Planks; }
    if (propOf(p)) return B.Air;
  }
  // An add-on's blocks (behaviour packs: furniture, vertical slabs, framed glass, lanterns, waystones, farm
  // crates, meadow flowers, the biome pack's stone): by what they're made of, the way a builder would read them
  if (!p.name.startsWith('minecraft:')) {
    const a = p.name.split(':')[1].replace(/[._]/g, ' ');
    if (/^(pu biomes|ecbl bc)/.test(p.name.replace(/[._:]/g, ' '))) return /stone|bricks|geodite|rock/.test(a) && !/pebble/.test(a) ? B.Stone : /log|wood/.test(a) ? B.OakLog : /leaves/.test(a) ? B.OakLeaves : B.Air;
    if (/waystone/.test(a)) return B.Blackstone;
    if (/lantern|lamp|light|candle/.test(a) && !/stone/.test(a)) return B.Glowcap;
    if (/glass|window|pane/.test(a)) return B.Window;
    // furniture, plants, crates, fittings: too small or too fiddly to be a block of their own
    if (/table|chair|stool|bench|sideboard|stove|pan|placeable|plushie|bed|frame|sapling|flower|grass|seed|cropbox|grape|vine|recycler|workbench|crafter|pot|sign|door|gate|curtain|shelf item|hanging|picture|clock|rug|carpet|cushion|barrel|chest|collision|corn block top/.test(a)) return B.Air;
    if (/corn block|hay/.test(a)) return B.Hay;
    const dark = /dark oak|spruce|mangrove|crimson|warped|ebony|walnut/.test(a), pale = /birch|pale oak|white/.test(a);
    if (/plank|wood|beam|timber|log|bookshelf|oak|spruce|birch|acacia|jungle|cherry|mangrove|warped|crimson/.test(a)) return /log|beam/.test(a) ? B.Timber : dark ? B.DarkPlanks : pale ? B.Planks : B.Planks;
    if (/cobble/.test(a)) return /mossy/.test(a) ? B.MossyCobble : B.Cobble;
    if (/calcite|diorite|quartz|white/.test(a)) return B.Whitestone;
    if (/andesite|tiles|smooth|polished/.test(a)) return B.Flagstone;
    if (/deepslate|blackstone|basalt/.test(a)) return B.Blackstone;
    if (/sandstone/.test(a)) return B.Sandstone;
    if (/red brick|^brick|clay brick/.test(a)) return B.RedBrick;
    if (/brick|stone|rock|slate/.test(a)) return /mossy/.test(a) ? B.MossyStone : B.StoneBrick;
    if (/roof|shingle/.test(a)) return dark ? B.DarkPlanks : B.RedBrick;
    return B.Air;
  }
  const n = p.name.replace('minecraft:', '');
  const s = p.states;
  if (n === 'air' || n === 'cave_air' || n === 'void_air' || n === 'structure_void' || n === 'light_block' || n === 'barrier') return B.Air;
  if (n === 'water' || n === 'flowing_water' || n === 'bubble_column' || n === 'seagrass' || n === 'tall_seagrass' || n === 'kelp' || n === 'kelp_plant') return B.Water;
  if (n === 'lava' || n === 'flowing_lava' || n === 'magma') return B.Emberstone;
  if (/^(fire|soul_fire|trip_wire|reeds|tallgrass|sea_pickle|turtle_egg|pitcher_plant|mangrove_propagule|decorated_pot|amethyst_cluster|.*_bud)$/.test(n)) return B.Air;
  // things too small to be a block of their own: plants, torches, rails, carpets, signs, buttons
  if (/flower|tulip|dandelion|poppy|orchid|allium|bluet|daisy|cornflower|lily|rose_bush|peony|lilac|sunflower|short_grass|tall_grass|^grass$|fern|dead_bush|sapling|mushroom$|torch|rail|carpet|_sign|button|pressure_plate|lever|tripwire|string|vine|ladder|redstone_wire|repeater|comparator|frame|painting|flower_pot|candle|banner|head|skull|sweet_berry|wheat|carrots|potatoes|beetroot|sugar_cane|bamboo$|cobweb|snow_layer|^snow$|scaffolding|chain$|lightning_rod|end_rod|glow_lichen|hanging_roots|spore|moss_carpet|pink_petals|leaf_litter|bush|azalea$|cactus_flower|firefly/.test(n) && !/block/.test(n)) return n === 'snow_layer' ? B.Air : B.Air;
  if (/door|trapdoor|fence_gate|pane$|iron_bars/.test(n)) return /pane|bars/.test(n) ? B.Window : B.Air;
  if (/glass/.test(n)) return B.Window;
  if (n === 'grass_block' || n === 'grass_path' || n === 'dirt_path') return n === 'grass_block' ? B.Grass : B.Path;
  if (/podzol|mycelium/.test(n)) return B.Loam;
  if (/^dirt|coarse_dirt|rooted_dirt|farmland|mud$|packed_mud|clay$/.test(n)) return n === 'farmland' ? B.Farmland : n === 'clay' ? B.Clay : B.Dirt;
  if (/^sand$|suspicious_sand/.test(n)) return B.Sand;
  if (/red_sand/.test(n)) return B.RedSand;
  if (/gravel/.test(n)) return B.Gravel;
  if (/snow_block|powder_snow/.test(n)) return B.Snow;
  if (/ice/.test(n)) return B.Ice;
  if (/_leaves/.test(n)) return /birch/.test(n) ? B.BirchLeaves : /spruce|pine/.test(n) ? B.PineLeaves : B.OakLeaves;
  if (/_log|_wood|_stem|hyphae/.test(n)) return /birch/.test(n) ? B.BirchLog : /spruce|dark_oak|mangrove/.test(n) ? B.PineLog : B.OakLog;
  if (/planks|bookshelf|crafting_table|barrel|chest|loom|lectern|cartography|fletching|smithing|composter|beehive|bee_nest|jukebox|note_block/.test(n) || (/stairs|slab|fence/.test(n) && /oak|spruce|birch|jungle|acacia|cherry|mangrove|bamboo|crimson|warped|pale/.test(n))) {
    const wood = s.wood_type ?? '';
    return /dark_oak|spruce|crimson|mangrove|bookshelf/.test(n + wood) ? B.DarkPlanks : /fence/.test(n) ? B.Timber : B.Planks;
  }
  if (/mossy_cobblestone/.test(n)) return B.MossyCobble;
  if (/mossy_stone_brick/.test(n)) return B.MossyStone;
  if (/cobblestone|cobbled_deepslate/.test(n)) return B.Cobble;
  if (/stone_brick|deepslate_brick|deepslate_tile|tuff_brick|chiseled_stone|cracked_stone/.test(n)) return B.StoneBrick;
  if (/^brick|bricks$|^brick_/.test(n) && !/stone|deepslate|nether|end|mud|tuff|prismarine/.test(n)) return B.RedBrick;
  if (/mud_brick/.test(n)) return B.TerraBrown;
  if (/sandstone/.test(n)) return /red/.test(n) ? B.TerraOrange : B.Sandstone;
  if (/quartz|calcite|white_concrete|bone_block|diorite/.test(n)) return /diorite/.test(n) && !/polished/.test(n) ? B.Stone : B.Whitestone;
  if (/blackstone|basalt|obsidian|black_concrete|coal_block/.test(n)) return /basalt/.test(n) ? B.Basalt : B.Blackstone;
  if (/smooth_stone|polished_andesite|polished_granite|polished_tuff|polished_deepslate/.test(n)) return B.Flagstone;
  if (/granite/.test(n)) return B.Granite;
  if (/terracotta/.test(n)) return /orange|red/.test(n) ? B.TerraOrange : /white|yellow|light_gray/.test(n) ? B.TerraCream : B.TerraBrown;
  if (/concrete|wool/.test(n)) {
    if (/white/.test(n)) return /wool/.test(n) ? B.Wool : B.Plaster;
    if (/light_blue|cyan|blue/.test(n)) return B.BluePlaster;
    if (/pink|magenta/.test(n)) return B.RosePlaster;
    if (/yellow|orange/.test(n)) return B.OchrePlaster;
    if (/red/.test(n)) return B.RedBrick;
    if (/brown/.test(n)) return B.TerraBrown;
    if (/green|lime/.test(n)) return B.MossyStone;
    return B.Blackstone;
  }
  if (/hay/.test(n)) return B.Hay;
  if (/^stone$|andesite|tuff|deepslate$|deepslate_.*ore|_ore$|infested|dripstone|smooth_basalt|^cobblestone$/.test(n)) return /ore/.test(n) ? B.Stone : B.Stone;
  if (/bedrock/.test(n)) return B.DeepStone;
  if (/moss_block/.test(n)) return B.Grass;
  if (/lantern|glowstone|sea_lantern|shroomlight|jack_o_lantern|redstone_lamp|froglight|campfire/.test(n)) return /campfire/.test(n) ? B.Air : B.Glowcap;
  if (/cactus|melon|pumpkin/.test(n)) return B.Hay;
  if (/iron_block|anvil|cauldron|hopper|furnace|smoker|blast_furnace|stonecutter|grindstone|bell/.test(n)) return /furnace|smoker/.test(n) ? B.Cobble : B.Stone;
  if (/copper/.test(n)) return B.Copper;
  if (/gold_block/.test(n)) return B.Brass;
  if (/prismarine/.test(n)) return B.MossyStone;
  if (/purpur|end_stone/.test(n)) return B.Sandstone;
  if (/nether|soul|crimson|warped/.test(n)) return B.TerraBrown;
  if (/bed$|_bed$|dripleaf|amethyst_bud|double_plant|piston|command_block|observer|dispenser|dropper|target|structure_block/.test(n)) return /piston|command|observer|dispenser|dropper/.test(n) ? B.Stone : B.Air;
  if (/mushroom_block/.test(n)) return /red/.test(n) ? B.RedBrick : B.TerraBrown;
  if (/stone_stairs|stone_slab|^stone_|smooth_stone/.test(n)) return B.Stone;
  unknown.set(n, (unknown.get(n) ?? 0) + 1);
  return B.Stone;
}

// ---------------------------------------------------------------- each piece
const BUILT = new Set<number>([B.Planks, B.DarkPlanks, B.Timber, B.StoneBrick, B.MossyStone, B.Cobble, B.MossyCobble, B.RedBrick, B.Window, B.Plaster, B.BluePlaster, B.RosePlaster, B.OchrePlaster, B.Whitestone, B.Blackstone, B.Flagstone, B.Sandstone, B.TerraOrange, B.TerraCream, B.TerraBrown, B.Wool, B.Hay, B.Glowcap, B.Path, B.Brass, B.Copper]);
const out = path.resolve('public/mcland');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const heightMaps: { id: string; w: number; d: number; b64: string }[] = [];
/** Every chunk's columns, gathered over all the pieces before they're written. */
const chunkFiles = new Map<string, number[][]>();
/** The trees to fell, by the chunk their trunk stands in: [kind, logs, lx, y, lz, trunk count (2 bytes), trunk (dx+128, y, dz+128)..., leaf count (2 bytes), leaves (dx+128, y, dz+128, block)...]. */
const chunkTrees = new Map<string, number[][]>();
/** Every sign kept, in game coordinates: where, which way it faces, what kind, and its words. */
const signs: { x: number; y: number; z: number; ry: number; kind: number; text: string }[] = [];
/** The waystones (an add-on's travel stones), each by its lowest block, in game coordinates: the game's waymarks go there. */
const stones = new Map<string, { x: number; y: number; z: number; piece: string }>();
/** The small things (torches, lanterns, doors, furniture), in game coordinates: [kind, x, y, z, facing, item or h]. */
const things: (string | number)[][] = [];
for (const piece of MC_PIECES) {
  const { mx0, mz0, mx1, mz1, gx0, gz0, yOff } = piece;
  const W = mx1 - mx0 + 1, D = mz1 - mz0 + 1;
  const cx0 = Math.floor(mx0 / 16), cz0 = Math.floor(mz0 / 16), cx1 = Math.floor(mx1 / 16), cz1 = Math.floor(mz1 / 16);
  const sy0 = Math.floor(-yOff / 16), sy1 = Math.floor((SY - 1 - yOff) / 16);
  const t0 = Date.now();
  const db = readDb(dir, (k) => {
    if (k.length !== 10 || k[8] !== 0x2f) return false;
    const x = k.readInt32LE(0), z = k.readInt32LE(4), y = k.readInt8(9);
    if (x < cx0 || x > cx1 || z < cz0 || z > cz1) return false;
    // (a splice reads higher: what's above it comes down)
    const tall = (piece.splices ?? []).some((s) => x * 16 + 15 >= s.x0 && x * 16 <= s.x1 && z * 16 + 15 >= s.z0 && z * 16 <= s.z1);
    return y >= sy0 && y <= (tall ? 20 : sy1);
  });
  console.log(piece.id + ': read', db.size, 'sub-chunks in', Date.now() - t0, 'ms');
  /** The sign blocks met (their facing is in their states), by Minecraft x,y,z: the words are in the block entities. */
  const signBlocks = new Map<string, { p: Palette; gy: number }>();
  const rot = piece.rot ?? 0;
  /** Minecraft x, z to the game's: straight, or a quarter turn clockwise (north to east, east to south). */
  const toGame = (x: number, z: number): [number, number] => rot ? [gx0 + (D - 1 - (z - mz0)), gz0 + (x - mx0)] : [gx0 + (x - mx0), gz0 + (z - mz0)];
  /** The game's x, z to the grid's column (ix along Minecraft x, iz along z), or null off the piece. */
  const toGrid = (gx: number, gz: number): [number, number] | null => { const ix = rot ? gz - gz0 : gx - gx0, iz = rot ? D - 1 - (gx - gx0) : gz - gz0; return ix < 0 || iz < 0 || ix >= W || iz >= D ? null : [ix, iz]; };
  const turnRy = (ry: number) => (rot ? ry - Math.PI / 2 : ry);
  // the blocks, in game ids: [mcX - mx0][mcZ - mz0][game y]
  const grid = new Uint8Array(W * D * SY);
  const gi = (ix: number, iz: number, y: number) => (ix * D + iz) * SY + y;
  const cache = new Map<string, number>();
  /** The Minecraft chunks that have anything saved; and the blocks a snow layer lay on (they turn to snowy ground). */
  const saved = new Set<string>(), snowy: number[] = [];
  for (const [k, e] of db) {
    if (!e.value) continue;
    const b = Buffer.from(k, 'latin1');
    const scx = b.readInt32LE(0), scz = b.readInt32LE(4), scy = b.readInt8(9);
    const sc = readSubChunk(e.value);
    if (!sc) continue;
    const ids = sc.palette.map((p) => { const key = p.name + JSON.stringify(p.states); let v = cache.get(key); if (v === undefined) { v = mapBlock(p); cache.set(key, v); } return v; });
    const signAt = sc.palette.map((p) => /sign/.test(p.name) ? p : null);
    const wsAt = sc.palette.map((p) => /waystone/.test(p.name));
    const snowAt = sc.palette.map((p) => /^minecraft:snow_layer$/.test(p.name));
    saved.add(scx + ',' + scz);
    const propAt = sc.palette.map((p) => { const pr = propOf(p); return pr ? { ...pr, ry: facingOf(p.states) } : null; });
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      const mx = scx * 16 + lx, mz = scz * 16 + lz;
      if (mx < mx0 || mx > mx1 || mz < mz0 || mz > mz1) continue;
      const sp = (piece.splices ?? []).find((s) => mx >= s.x0 && mx <= s.x1 && mz >= s.z0 && mz <= s.z1);
      for (let ly = 0; ly < 16; ly++) {
        let my = scy * 16 + ly;
        if (sp) { if (my >= sp.from && my <= sp.to) continue; if (my > sp.to) my -= sp.to - sp.from + 1; }
        const gy = my + yOff;
        if (gy < 0 || gy >= SY) continue;
        const i = lx * 256 + lz * 16 + ly;
        let id = ids[sc.idx[i]];
        const sgn = signAt[sc.idx[i]];
        if (sgn) signBlocks.set(`${mx},${scy * 16 + ly},${mz}`, { p: sgn, gy });
        const pr = propAt[sc.idx[i]];
        if (pr) { const [tx, tz] = toGame(mx, mz); things.push([pr.t, tx + 0.5, gy, tz + 0.5, Math.round(turnRy(pr.ry) * 100) / 100, pr.item ?? pr.h ?? 0]); }
        if (wsAt[sc.idx[i]]) { const [wx, wz] = toGame(mx, mz); const k2 = wx + ',' + wz; const had = stones.get(k2); if (!had || had.y > gy) stones.set(k2, { x: wx + 0.5, y: gy, z: wz + 0.5, piece: piece.id }); }
        if (id === B.Air && sc.water && sc.water[i]) id = B.Water;
        if (snowAt[sc.idx[i]] && gy > 0) snowy.push(gi(mx - mx0, mz - mz0, gy - 1));
        if (id !== B.Air) grid[gi(mx - mx0, mz - mz0, gy)] = id;
      }
    }
  }
  db.clear();
  // The snow country made green like the rest (owner 2026-11-05: "make the snow biome grassy to match the
  // rest"): the snow layers go, a snow block on top turns to grass and under that to earth, the ice to water
  void snowy;
  for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
    let open = true;
    for (let y = SY - 1; y >= 0; y--) {
      const i = gi(ix, iz, y), id = grid[i];
      if (id === B.Snow || id === B.SnowGrass) { const under = y > 0 ? grid[i - 1] : B.Stone; grid[i] = open && (under === B.Water || under === B.Ice) ? (y < SEA ? B.Water : B.Air) : open ? B.Grass : B.Dirt; if (grid[i] === B.Air) continue; }
      else if (id === B.Ice && open) grid[i] = B.Water;
      if (id !== B.Air) open = false;
    }
  }
  // Chunks Minecraft never saved (a few, at the edge of what the owner explored): the ground round them carried
  // in, a column at a time from the nearest saved one, its height and its top (no buildings, no trees)
  {
    const NATTOP = new Set<number>([B.Grass, B.FlowerGrass, B.Dirt, B.Loam, B.Snow, B.SnowGrass, B.Sand, B.Stone, B.Gravel, B.Granite, B.Water, B.Clay]);
    const gnd = new Int16Array(W * D).fill(-1), topId = new Uint8Array(W * D), q: number[] = [];
    let holes = 0;
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const c = ix + iz * W;
      if (!saved.has(Math.floor((mx0 + ix) / 16) + ',' + Math.floor((mz0 + iz) / 16))) { holes++; continue; }
      for (let y = SY - 1; y >= 0; y--) { const id = grid[gi(ix, iz, y)]; if (NATTOP.has(id)) { gnd[c] = y; topId[c] = id; q.push(c); break; } }
    }
    for (let h = 0; h < q.length; h++) {
      const c = q[h], x = c % W, z = (c / W) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue;
        const j = xx + zz * W; if (gnd[j] >= 0 || saved.has(Math.floor((mx0 + xx) / 16) + ',' + Math.floor((mz0 + zz) / 16))) continue;
        gnd[j] = gnd[c]; topId[j] = topId[c]; q.push(j);
        const top = gnd[j], id = topId[j];
        for (let y = 0; y < SY; y++) grid[gi(xx, zz, y)] = y < top - 3 ? B.Stone : y < top ? (id === B.Sand ? B.Sand : id === B.Water ? B.Sand : B.Dirt) : y === top ? (id === B.Water ? B.Water : id) : y < SEA ? B.Water : B.Air;
      }
    }
    if (holes) console.log(piece.id + ':', holes, 'columns in chunks never saved, filled from the ground round them');
  }
  // The owner's changes to this piece (scripts/mc/edits.ts), in Minecraft coordinates
  const edit = EDITS[piece.id];
  if (edit) {
    const at = (x: number, y: number, z: number) => { const ix = x - mx0, iz = z - mz0, gy = y + yOff; return ix < 0 || iz < 0 || ix >= W || iz >= D || gy < 0 || gy >= SY ? -1 : gi(ix, iz, gy); };
    const set = (x: number, y: number, z: number, id: number) => { const i = at(x, y, z); if (i >= 0) grid[i] = id; };
    edit({
      get: (x, y, z) => { const i = at(x, y, z); return i < 0 ? B.Air : grid[i]; },
      set,
      fill: (x0, y0, z0, x1, y1, z1, id) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) set(x, y, z, id); },
      swap: (x0, y0, z0, x1, y1, z1, from, to) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const i = at(x, y, z); if (i >= 0 && from.includes(grid[i])) grid[i] = to; } },
    });
    console.log(piece.id + ': edited (scripts/mc/edits.ts)');
  }
  // The signs' words: block entities (key type 0x31), each a run of NBT compounds
  const ents = readDb(dir, (k) => k.length === 9 && k[8] === 0x31 && k.readInt32LE(0) >= cx0 && k.readInt32LE(0) <= cx1 && k.readInt32LE(4) >= cz0 && k.readInt32LE(4) <= cz1);
  const words = new Map<string, string>();
  for (const [, e] of ents) {
    if (!e.value) continue;
    const r = new NbtReader(e.value);
    while (r.p < e.value.length) {
      let t: Record<string, Nbt>;
      try { t = r.read() as Record<string, Nbt>; } catch { break; }
      if (!/sign/i.test(String(t.id))) continue;
      const front = (t.FrontText as Record<string, Nbt> | undefined)?.Text ?? t.Text ?? '';
      const back = (t.BackText as Record<string, Nbt> | undefined)?.Text ?? '';
      const text = String(front || back).replace(/§./g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
      if (text) words.set(`${t.x},${t.y},${t.z}`, text);
    }
  }
  let nSigns = 0;
  for (const [k, sb] of signBlocks) {
    const text = words.get(k);
    if (!text || sb.gy < 0 || sb.gy >= SY) continue;
    const [x, , z] = k.split(',').map(Number);
    const st = sb.p.states, n = sb.p.name;
    const kind = /hanging/.test(n) ? 2 : /wall/.test(n) ? 1 : 0;
    // facing: a standing sign's sixteen points from south, clockwise (west at 4); a wall sign's 2 north, 3 south, 4 west, 5 east
    let ry = 0;
    if (kind === 1 || (kind === 2 && st.facing_direction !== undefined)) { const f = Number(st.facing_direction ?? 3); ry = f === 2 ? Math.PI : f === 4 ? -Math.PI / 2 : f === 5 ? Math.PI / 2 : 0; }
    else ry = -Number(st.ground_sign_direction ?? 0) * Math.PI / 8;
    const [sgx, sgz] = toGame(x, z);
    signs.push({ x: sgx + 0.5, y: sb.gy, z: sgz + 0.5, ry: Math.round(turnRy(ry) * 1000) / 1000, kind, text, piece: piece.id } as never);
    nSigns++;
  }
  console.log(piece.id + ':', nSigns, 'signs with words');
  // an island: its own land, what's built within reach of its shore, and the sea; anything else goes under
  if (piece.island) {
    const NAT = new Set<number>([B.Grass, B.Dirt, B.Loam, B.Sand, B.RedSand, B.Gravel, B.Stone, B.Granite, B.DeepStone, B.Snow, B.Ice, B.Clay, B.Farmland, B.Path, B.Basalt]);
    // each column: 2 land (natural ground under whatever's built), 1 water, 0 neither
    const kind = new Uint8Array(W * D), ground = new Int16Array(W * D);
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      for (let y = SY - 1; y >= 0; y--) { const id = grid[gi(ix, iz, y)]; if (id === B.Water) { kind[ix + iz * W] = 1; ground[ix + iz * W] = y; break; } if (NAT.has(id)) { kind[ix + iz * W] = 2; ground[ix + iz * W] = y; break; } }
    }
    const isl = new Uint8Array(W * D), q: number[] = [];
    const s0 = (piece.island.x - mx0) + (piece.island.z - mz0) * W; isl[s0] = 1; q.push(s0);
    while (q.length) { const i = q.pop()!; const x = i % W, z = (i / W) | 0; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (!isl[j] && kind[j] === 2) { isl[j] = 1; q.push(j); } } }
    // how far each column is from the island's shore (out to its reach)
    const dist = new Uint16Array(W * D).fill(65535), bq: number[] = [];
    for (let i = 0; i < W * D; i++) if (isl[i]) { dist[i] = 0; bq.push(i); }
    for (let h = 0; h < bq.length; h++) { const i = bq[h], x = i % W, z = (i / W) | 0; if (dist[i] >= piece.island.reach) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (dist[j] === 65535) { dist[j] = dist[i] + 1; bq.push(j); } } }
    let sunk = 0;
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const i = ix + iz * W;
      if (isl[i]) continue;
      const near = dist[i] <= piece.island.reach;
      if (near && kind[i] !== 2) continue; // the sea by the shore, and what's built on it
      // other land, or the open sea past the docks: sea bed and water, nothing standing on it
      sunk++;
      const bed = kind[i] === 1 ? Math.min(SEA - 4, ground[i]) : SEA_FLOOR;
      for (let y = 0; y < SY; y++) grid[gi(ix, iz, y)] = y <= bed ? (y === bed ? B.Sand : B.Stone) : y < SEA ? B.Water : B.Air;
      // (the open sea keeps its own floor and its water; only what stood on it goes)
      if (kind[i] === 1) for (let y = 0; y <= ground[i]; y++) if (grid[gi(ix, iz, y)] === B.Air) grid[gi(ix, iz, y)] = B.Water;
    }
    console.log(piece.id + ': island', isl.reduce((a, b) => a + b, 0), 'columns; sunk', sunk);
  }
  // a natural edge: the land kept where anything's built (and round it), then falling away in a coast of its
  // own, irregular as a real one, to the open sea before the rectangle's edges are reached
  if (piece.natural) {
    const NAT = new Set<number>([B.Grass, B.Dirt, B.Loam, B.Sand, B.RedSand, B.Gravel, B.Stone, B.Granite, B.DeepStone, B.Snow, B.Ice, B.Clay, B.Basalt, B.OakLog, B.BirchLog, B.PineLog, B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.Water, B.Glowcap]);
    const src = new Uint8Array(W * D), surf = new Int16Array(W * D), wet = new Uint8Array(W * D);
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const i = ix + iz * W;
      for (let y = SY - 1; y >= SEA; y--) { const id = grid[gi(ix, iz, y)]; if (id !== B.Air && !NAT.has(id)) { src[i] = 1; break; } }
      for (let y = SY - 1; y >= 0; y--) { const id = grid[gi(ix, iz, y)]; if (id !== B.Air && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves && id !== B.OakLog && id !== B.BirchLog && id !== B.PineLog) { surf[i] = y; wet[i] = id === B.Water ? 1 : 0; break; } }
    }
    const dist = new Float32Array(W * D).fill(1e9), bq: number[] = [];
    for (let i = 0; i < W * D; i++) if (src[i]) { dist[i] = 0; bq.push(i); }
    for (let h = 0; h < bq.length; h++) { const i = bq[h], x = i % W, z = (i / W) | 0; if (dist[i] > 200) continue; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= W || zz >= D) continue; const j = xx + zz * W; if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; bq.push(j); } } }
    const { keep, fade } = piece.natural;
    const wob = (x: number, z: number) => (Math.sin(x * 0.043 + 1.7) + Math.sin(z * 0.051 + 0.3) + Math.sin((x + z) * 0.027 + 2.1) + Math.sin((x - z) * 0.071)) / 4;
    let sea = 0;
    for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
      const i = ix + iz * W, d = piece.natural.whole ? 0 : dist[i];
      const edgeRoom = Math.min(ix, iz, W - 1 - ix, D - 1 - iz);
      const R = piece.natural.whole ? edgeRoom - fade - 6 + wob(ix * 1.7, iz * 1.7) * 14 : Math.min(keep + wob(ix, iz) * keep * 0.45, edgeRoom - fade - 4);
      if (piece.natural.whole ? R >= 0 : d <= R) continue;
      // (all the way down to the world's own sea floor by the rectangle's edge, so the sea round it runs on
      // without a step or a shelf of sand: owner 2026-11-05, "no sand bars, blend seamless into the world water")
      const t = Math.min(1, Math.max(piece.natural.whole ? -R / fade : (d - R) / fade, 1 - edgeRoom / 10));
      const top = surf[i];
      let base = top;
      if (wet[i]) while (base > 0 && grid[gi(ix, iz, base)] === B.Water) base--;
      const want = Math.round(base + (SEA_FLOOR - base) * t);
      for (let y = 0; y < SY; y++) {
        const at = gi(ix, iz, y);
        if (y > want) grid[at] = y < SEA ? B.Water : B.Air;
        else if (y === want) grid[at] = want <= SEA ? B.Sand : (grid[at] === B.Air || grid[at] === B.Water ? B.Grass : grid[at] === B.Stone && t > 0.3 ? B.Gravel : grid[at]);
        else if (grid[at] === B.Air || grid[at] === B.Water) grid[at] = B.Stone;
      }
      if (want < SEA) sea++;
    }
    console.log(piece.id + ': natural coast,', sea, 'columns given to the sea');
  }
  // the edges: down to the sea in a beach, unless something's built there (not for an island: its own coast is kept)
  const EDGE = Math.min(36, Math.floor(Math.min(W, D) / 5));
  if (!piece.island && !piece.natural) for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
    const d = Math.min(ix, iz, W - 1 - ix, D - 1 - iz);
    if (d >= EDGE) continue;
    let built = false;
    for (let y = SEA; y < SY && !built; y++) if (BUILT.has(grid[gi(ix, iz, y)])) built = true;
    if (built) continue;
    const cap = Math.floor(SEA - 3 + (d / EDGE) * 14);
    for (let y = 0; y < SY; y++) {
      const at = gi(ix, iz, y);
      if (y > cap) grid[at] = y < SEA ? B.Water : B.Air;
      else if (y === cap && grid[at] !== B.Air && grid[at] !== B.Water) grid[at] = cap < SEA + 1 ? B.Sand : grid[at];
    }
  }
  // The trees. Leaves with no trunk within six blocks go (no crowns left floating where a trunk was cut or sunk);
  // then every tree standing on the ground, its trunk touching nothing built, becomes one to fell: its trunk and
  // the leaves nearest it, written after the chunk's columns (world/mcland.ts reads them as the game's trees)
  {
    const LOG = new Set<number>([B.OakLog, B.BirchLog, B.PineLog]);
    const LEAF = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves]);
    const GROUND = new Set<number>([B.Grass, B.Dirt, B.Loam, B.Snow, B.SnowGrass, B.Sand, B.Stone, B.Gravel, B.Granite, B.Clay, B.FlowerGrass, B.Farmland, B.Path]);
    const N = W * D * SY, mark = new Uint8Array(N);
    const S6 = [SY, -SY, D * SY, -D * SY, 1, -1];
    const ok = (i: number, s: number) => { const y = i % SY, c = (i - y) / SY, iz = c % D, ix = (c - iz) / D; return s === 1 ? y < SY - 1 : s === -1 ? y > 0 : s === SY ? iz < D - 1 : s === -SY ? iz > 0 : s === D * SY ? ix < W - 1 : ix > 0; };
    let q: number[] = [];
    for (let i = 0; i < N; i++) if (LOG.has(grid[i])) { mark[i] = 1; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h]; if (mark[i] > 6) continue; for (const s of S6) { if (!ok(i, s)) continue; const j = i + s; if (!mark[j] && LEAF.has(grid[j])) { mark[j] = mark[i] + 1; q.push(j); } } }
    let dropped = 0;
    for (let i = 0; i < N; i++) if (!mark[i] && LEAF.has(grid[i])) { grid[i] = B.Air; dropped++; }
    // the trees: logs joined (corners too), on the ground, with leaves, nothing built against them
    mark.fill(0); q = [];
    const found: { logs: number[]; kind: string; leaves: number[] }[] = [];
    const S26: number[] = []; for (const a of [-1, 0, 1]) for (const b of [-1, 0, 1]) for (const c of [-1, 0, 1]) if (a || b || c) S26.push(a * D * SY + b * SY + c);
    const xyz = (i: number) => { const y = i % SY, c = (i - y) / SY, iz = c % D; return [(c - iz) / D, y, iz]; };
    for (let i = 0; i < N; i++) {
      if (mark[i] || !LOG.has(grid[i])) continue;
      const comp = [i]; mark[i] = 1;
      let leafy = false, built = false;
      for (let h = 0; h < comp.length && comp.length <= 400; h++) {
        const k = comp[h], [kx, ky, kz] = xyz(k);
        for (const s of S26) {
          const j = k + s, [jx, jy, jz] = xyz(j);
          if (j < 0 || j >= N || Math.abs(jx - kx) > 1 || Math.abs(jz - kz) > 1 || Math.abs(jy - ky) > 1) continue;
          const id = grid[j];
          if (LOG.has(id)) { if (!mark[j]) { mark[j] = 1; comp.push(j); } }
          else if (LEAF.has(id)) leafy = true;
          else if (BUILT.has(id) && Math.abs(s) !== 1 && (jy === ky)) built = true;
        }
      }
      if (!leafy || built || comp.length > 400) continue;
      comp.sort((a, b) => a % SY - b % SY);
      const base = comp[0];
      if (base % SY === 0 || !GROUND.has(grid[base - 1])) continue;
      const n = (id: number) => comp.filter((c) => grid[c] === id).length;
      const kind = n(B.BirchLog) > comp.length / 2 ? 'birch' : n(B.PineLog) > comp.length / 2 ? 'pine' : comp.length >= 30 ? 'giant' : 'oak';
      found.push({ logs: comp, kind, leaves: [] });
    }
    // each leaf to the nearest tree's trunk
    mark.fill(0);
    const qi: number[] = [], qo: number[] = [];
    found.forEach((t, k) => { for (const i of t.logs) { mark[i] = 1; qi.push(i); qo.push(k); } });
    for (let h = 0; h < qi.length; h++) { const i = qi[h]; if (mark[i] > 7) continue; for (const s of S6) { if (!ok(i, s)) continue; const j = i + s; if (!mark[j] && LEAF.has(grid[j])) { mark[j] = mark[i] + 1; qi.push(j); qo.push(qo[h]); found[qo[h]].leaves.push(j); } } }
    const KIND = { oak: 0, birch: 1, pine: 2, giant: 3 } as Record<string, number>;
    for (const t of found) {
      const [bx, by, bz] = xyz(t.logs[0]);
      const [gx, gz] = toGame(mx0 + bx, mz0 + bz);
      const key = Math.floor(gx / CHUNK) + '_' + Math.floor(gz / CHUNK);
      const rel = (i: number): number[] => { const [x, y, z] = xyz(i); const [px, pz] = toGame(mx0 + x, mz0 + z); return [px - gx + 128, y, pz - gz + 128]; };
      const trunk = t.logs.flatMap(rel), leaves = t.leaves.flatMap((i) => [...rel(i), grid[i]]);
      if (trunk.some((v, k) => k % 3 !== 1 && (v < 0 || v > 255)) || leaves.some((v, k) => k % 4 !== 1 && k % 4 !== 3 && (v < 0 || v > 255))) continue;
      const logs = t.kind === 'giant' ? Math.min(9, 5 + Math.floor(t.logs.length / 25)) : Math.max(2, Math.min(5, Math.round(t.logs.length / 3)));
      let l = chunkTrees.get(key); if (!l) chunkTrees.set(key, (l = []));
      l.push([KIND[t.kind], logs, gx - Math.floor(gx / CHUNK) * CHUNK, by, gz - Math.floor(gz / CHUNK) * CHUNK, t.logs.length >> 8, t.logs.length & 255, ...trunk, t.leaves.length >> 8, t.leaves.length & 255, ...leaves]);
    }
    console.log(piece.id + ': dropped', dropped, 'leaves with no trunk near;', found.length, 'trees to fell');
  }
  // below what was read: rock; and any open space under the sea filled with water
  for (let ix = 0; ix < W; ix++) for (let iz = 0; iz < D; iz++) {
    let bottom = 0;
    while (bottom < SY && grid[gi(ix, iz, bottom)] === B.Air) grid[gi(ix, iz, bottom++)] = B.Stone;
    for (let y = 0; y < SEA; y++) if (grid[gi(ix, iz, y)] === B.Air) grid[gi(ix, iz, y)] = B.Water;
  }
  // to game coordinates, chunk by chunk
  const GW = rot ? D : W, GD = rot ? W : D;
  const gx1 = gx0 + GW - 1, gz1 = gz0 + GD - 1;
  let files = 0;
  for (let cz = Math.floor(gz0 / CHUNK); cz <= Math.floor(gz1 / CHUNK); cz++) for (let cx = Math.floor(gx0 / CHUNK); cx <= Math.floor(gx1 / CHUNK); cx++) {
    // per column: a byte for how many runs (0: not ours, leave the generated ground), then [y, len, id] runs
    const cols: number[][] = [];
    let any = false;
    for (let lz = 0; lz < CHUNK; lz++) for (let lx = 0; lx < CHUNK; lx++) {
      const at = toGrid(cx * CHUNK + lx, cz * CHUNK + lz);
      if (!at) { cols.push([0]); continue; }
      const [ix, iz] = at;
      any = true;
      const runs: number[] = [];
      let y = 0;
      while (y < SY) {
        const id = grid[gi(ix, iz, y)];
        let n = 1;
        while (y + n < SY && grid[gi(ix, iz, y + n)] === id) n++;
        if (id !== B.Air) runs.push(y, n, id);
        y += n;
      }
      cols.push([runs.length / 3, ...runs]);
    }
    if (!any) continue;
    // (pieces can share a chunk: each fills only its own columns)
    const key = `${cx}_${cz}`, had = chunkFiles.get(key);
    if (!had) { chunkFiles.set(key, cols); files++; }
    else for (let c = 0; c < CHUNK * CHUNK; c++) if (cols[c].length > 1 || cols[c][0]) had[c] = cols[c];
  }
  // the coarse height map: the top of the ground (not counting leaves) every MC_CELL blocks, game x then z
  const nx = Math.ceil(GW / MC_CELL), nz = Math.ceil(GD / MC_CELL), heights: number[] = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const [ix, iz] = toGrid(gx0 + Math.min(GW - 1, i * MC_CELL), gz0 + Math.min(GD - 1, j * MC_CELL))!;
    let top = 0;
    for (let y = SY - 1; y > 0; y--) { const id = grid[gi(ix, iz, y)]; if (id !== B.Air && id !== B.OakLeaves && id !== B.BirchLeaves && id !== B.PineLeaves) { top = id === B.Water ? Math.min(y, SEA - 1) : y + 1; break; } }
    heights.push(top);
  }
  heightMaps.push({ id: piece.id, w: nx, d: nz, b64: Buffer.from(Uint8Array.from(heights)).toString('base64') });
  console.log(`${piece.id}: ${files} chunk files; height map ${nx}x${nz}`);
}
let totalBytes = 0;
for (const [key, cols] of chunkFiles) { const tr = chunkTrees.get(key) ?? []; const buf = zlib.deflateRawSync(Buffer.from(Uint8Array.from([...cols.flat(), tr.length >> 8, tr.length & 255, ...tr.flat()])), { level: 9 }); fs.writeFileSync(path.join(out, key + '.bin'), buf); totalBytes += buf.length; }
console.log(`${chunkFiles.size} chunk files written, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log('unmapped (as stone):', [...unknown].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([n, c]) => `${n}:${c}`).join(' '));
// The signs (data/mcSigns.ts): kept only where the piece itself is kept (not sunk under the sea round an island)
fs.writeFileSync(path.resolve('src/data/mcSigns.ts'), `// Written by scripts/mc/export.ts: the signs on the owner's Minecraft builds, in game coordinates (kind 0 on a post, 1 on a wall, 2 hung).
export interface McSign { x: number; y: number; z: number; ry: number; kind: number; text: string; piece: string }
export const MC_SIGNS: McSign[] = ${JSON.stringify(signs)};
/** The small things on the owner's builds: [kind, x, y, z, facing, the furniture's item or a light's wall/hanging]. */
export const MC_THINGS: (string | number)[][] = ${JSON.stringify(things)};
/** The waystones the owner set (an add-on's): where the game's waymarks stand. */
export const MC_WAYSTONES: { x: number; y: number; z: number; piece: string }[] = ${JSON.stringify([...stones.values()])};
`);
// The height maps in code (world/mclandHeights.ts), so heightAt knows the islands the moment the game starts
fs.writeFileSync(path.resolve('src/world/mclandHeights.ts'), `// Written by scripts/mc/export.ts: the ground of each of the owner's Minecraft pieces, every ${MC_CELL} blocks (game x fastest).
export const MC_HEIGHTS: Record<string, { w: number; d: number; b64: string }> = {
${heightMaps.map((h) => `  ${h.id}: { w: ${h.w}, d: ${h.d}, b64: '${h.b64}' },`).join('\n')}
};
`);
