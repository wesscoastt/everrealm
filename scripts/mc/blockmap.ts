// The owner's Minecraft blocks in the game's terms (moved out of scripts/mc/export.ts so other scripts can use it):
// what each block is as one of the game's, which become props, and which way they face.
import type { Palette } from './bedrock';
import { B } from '../../src/world/blocks';


// ---------------------------------------------------------------- the small things, as props
/** Things you can't walk through: an invisible wall in their block (owner 2026-11-05, "no collision issues"). */
export const SOLID_T = new Set(['barrel', 'crate', 'anvil', 'mcbench', 'mcfurnace', 'mcpumpkin', 'mcbeehive']);
export const SOLID_ITEM = new Set(['table', 'chest', 'hearth', 'desk', 'dresser', 'counter', 'shelves', 'bed', 'strongbox']);
/** Minecraft's facings to the game's (0 toward +z, south): a cardinal name, a facing_direction (2 north, 3 south, 4 west, 5 east), a direction (0 south, 1 west, 2 north, 3 east). */
export function facingOf(st: Record<string, unknown>): number {
  const c = String(st['minecraft:cardinal_direction'] ?? st.torch_facing_direction ?? '');
  const byName: Record<string, number> = { south: 0, west: -Math.PI / 2, north: Math.PI, east: Math.PI / 2 };
  if (c in byName) return byName[c];
  if (st.facing_direction !== undefined) { const f = Number(st.facing_direction); return f === 2 ? Math.PI : f === 4 ? -Math.PI / 2 : f === 5 ? Math.PI / 2 : 0; }
  if (st.direction !== undefined) { const d = Number(st.direction); return [0, -Math.PI / 2, Math.PI, Math.PI / 2][d & 3]; }
  if (st.weirdo_direction !== undefined) { const d = Number(st.weirdo_direction); return [Math.PI / 2, -Math.PI / 2, 0, Math.PI][d & 3]; }
  return 0;
}
/** A prop for a block that's a thing rather than a block: its kind (and furniture's item, a light's wall or hanging), or null. */
export function propOf(p: Palette): { t: string; item?: string; h?: number } | null {
  const n = p.name.replace(/^[a-z0-9_]+:/, ''), st = p.states, vanilla = p.name.startsWith('minecraft:');
  if (/^ladder$/.test(n)) return { t: 'mcladder' };
  // pumpkins (carved, lit) and bee nests: the game's own (owner 2026-11-05: "beehives got turned into wood planks")
  if (/^(pumpkin|carved_pumpkin|lit_pumpkin)$/.test(n)) return { t: 'mcpumpkin', h: n === 'lit_pumpkin' ? 2 : n === 'carved_pumpkin' ? 1 : 0 };
  if (/^(bee_nest|beehive)$/.test(n)) return { t: 'mcbeehive' };
  if (/fence_gate/.test(n)) return { t: 'mcgate' };
  // fire in a hearth, and campfires: the game's flames (owner 2026-11-05: "fireplaces not working")
  if (/^(fire|soul_fire)$/.test(n)) return { t: 'mcfire', h: 0 };
  if (/campfire/.test(n)) return st.extinguished === 1 || st.extinguished === true ? null : { t: 'mcfire', h: 1 };
  // the lamp-post add-on's pieces, stacked into posts (put back together after: one post to a stack)
  if (/^mra_cvl:lantern/.test(p.name)) return { t: 'mcpost' };
  if (/^(oak|spruce|birch|dark_oak|acacia|jungle|mangrove|cherry|bamboo|crimson|warped|pale_oak)_shelf$/.test(n)) return { t: 'furn', item: 'shelves' };
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
  // the places to work: a crafting table a joiner's bench, a furnace a forge, an anvil an anvil (game/Game.ts openCrafting)
  if (/^crafting_table$/.test(n)) return { t: 'mcbench' };
  if (/^(furnace|lit_furnace|blast_furnace|lit_blast_furnace)$/.test(n)) return { t: 'mcfurnace' };
  if (/cartography|fletching|smithing_table|loom/.test(n)) return { t: 'furn', item: 'table' };
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
export const unknown = new Map<string, number>();
export function mapBlock(p: Palette): number {
  // (the owner's review: the windows, the bars, the bookcases, the light posts, the dock's trapdoor walks)
  {
    const n0 = p.name.replace(/^[a-z0-9_]+:/, '');
    // invisible light sources (Minecraft's light blocks, the add-ons' dynamic and fake lights): nothing to see;
    // and the odd things with no block of their own (owner 2026-11-05: "random blocks on a table in the winery")
    if (/^light_block|dynamic_light|fake_light|^(moving_block|portal|web|cobweb|cake|cocoa|brewing_stand|enchanting_table|trial_spawner|vault|structure_block|jigsaw)$/.test(n0)) return B.Air;
    if (/amethyst_block|budding_amethyst/.test(n0)) return B.Crystal;
    if (/bamboo_block|bamboo_planks|bamboo_mosaic|bamboo_(stairs|slab|double_slab|fence)/.test(n0)) return B.Bamboo;
    if (/mangrove_roots/.test(n0)) return B.OakLog;
    // fences: an invisible wall the fence's height, drawn as posts and rails (world/props.ts mcFence)
    if (/fence$/.test(n0) && !/gate/.test(n0)) return B.Barrier;
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
    if (/waystone/.test(a)) return B.Air; // (the game's waymark stands in its place: world/sites.ts)
    if (/lantern|lamp|light|candle/.test(a) && !/stone/.test(a)) return B.Glowcap;
    if (/glass|window|pane/.test(a)) return B.Window;
    // furniture, plants, crates, fittings: too small or too fiddly to be a block of their own
    if (/table|chair|stool|bench|sideboard|stove|pan|placeable|plushie|bed|frame|sapling|flower|grass|seed|cropbox|grape|vine|recycler|workbench|crafter|pot|sign|door|gate|curtain|shelf item|hanging|picture|clock|rug|carpet|cushion|barrel|chest|collision|corn block top/.test(a)) return B.Air;
    if (/corn block|hay/.test(a)) return B.Hay;
    const dark = /dark oak|spruce|mangrove|crimson|warped|ebony|walnut/.test(a), pale = /birch|pale oak|white/.test(a);
    // (the side-slab add-on's bamboo: a house of it, owner 2026-11-05)
    if (/bamboo/.test(a) && !/sapling|shoot/.test(a)) return B.Bamboo;
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
  // the old leaves (their kind in a state), and the old tall plants: not stone (owner 2026-11-05, "leaves look like white stone")
  if (n === 'leaves' || n === 'leaves2') { const k = String(p.states.old_leaf_type ?? p.states.new_leaf_type ?? 'oak'); return k === 'birch' ? B.BirchLeaves : k === 'spruce' ? B.PineLeaves : B.OakLeaves; }
  if (n === 'double_plant') return B.Air;
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
