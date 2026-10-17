import type { EnemyType } from './gameplay';
import type { RegionId } from '../world/terrain';

// Things that happen in the world whether or not anyone is there to see them start (the runtime is
// game/Activities.ts). Dynamic events flare up when you come near and run on a timer; world bosses
// rise on a schedule every player shares; Shardfalls come down in Scarth one after another. The
// dungeons, delves, vistas and wonders are sites (world/sites.ts) and need no data here.

export interface EventDef {
  id: string;
  name: string;
  region: RegionId;
  x: number;
  z: number;
  /** The tracker's line while it runs. */
  goal: string;
  /** Waves, one after another; the last is led by a bigger one of its kind if leader is set. */
  waves: { type: EnemyType; count: number }[];
  leader?: EnemyType;
  /** Seconds to see it through, and seconds before it can flare up again. */
  time: number;
  cooldown: number;
  xp: number;
  marks: [number, number];
  loot: { item: string; chance: number }[];
}

export const EVENTS: EventDef[] = [
  { id: 'ev-lantern', name: 'The Lantern Wolves', region: 'greenwake', x: 86, z: 262, goal: 'Drive the wolves off the Lantern ridge', waves: [{ type: 'wolf', count: 3 }, { type: 'wolf', count: 3 }], leader: 'wolf', time: 240, cooldown: 360, xp: 160, marks: [6, 12], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'wolfskin_hood', chance: 0.08 }] },
  { id: 'ev-wetlings', name: 'Mire Bloom in the Wetlings', region: 'greenwake', x: 204, z: 246, goal: 'Clear the jellies out of the low fields', waves: [{ type: 'jelly', count: 4 }, { type: 'jelly', count: 4 }], time: 240, cooldown: 360, xp: 120, marks: [4, 9], loot: [{ item: 'jelly_residue', chance: 1 }] },
  { id: 'ev-meadow', name: 'Boars in the Hay Meadows', region: 'crownroad', x: 522, z: 384, goal: 'Turn the boars out of the meadows', waves: [{ type: 'boar', count: 3 }, { type: 'boar', count: 3 }], leader: 'boar', time: 270, cooldown: 420, xp: 320, marks: [10, 18], loot: [{ item: 'boar_hide', chance: 1 }, { item: 'toll_sabre', chance: 0.06 }] },
  { id: 'ev-drove', name: 'Wolves on the Drove Road', region: 'crownroad', x: 836, z: 884, goal: 'Keep the wolves off the drove road', waves: [{ type: 'roadwolf', count: 4 }, { type: 'roadwolf', count: 4 }], leader: 'roadwolf', time: 270, cooldown: 420, xp: 380, marks: [12, 20], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'wolfskin_hood', chance: 0.08 }, { item: 'toll_sabre', chance: 0.06 }] },
  { id: 'ev-fellers', name: 'Stalkers round the Fellers\' Camp', region: 'brambledeep', x: 470, z: 566, goal: 'Drive the thornbacks back from the camp', waves: [{ type: 'thornwolf', count: 2 }, { type: 'thornwolf', count: 3 }], leader: 'thornwolf', time: 300, cooldown: 480, xp: 560, marks: [16, 28], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'thorn_blade', chance: 0.08 }, { item: 'moss_hood', chance: 0.08 }] },
  { id: 'ev-spores', name: 'Spore Bloom at Peg\'s Water', region: 'brambledeep', x: 476, z: 968, goal: 'Burst the spore jellies before they spread', waves: [{ type: 'sporejelly', count: 3 }, { type: 'sporejelly', count: 4 }], time: 300, cooldown: 480, xp: 520, marks: [14, 26], loot: [{ item: 'jelly_residue', chance: 1 }, { item: 'moss_hood', chance: 0.08 }] },
  { id: 'ev-strand', name: 'Crabs on the Strand', region: 'saltwind', x: 1712, z: 420, goal: 'Clear the crabs off the strand', waves: [{ type: 'crab', count: 3 }, { type: 'crab', count: 3 }], leader: 'crab', time: 300, cooldown: 480, xp: 640, marks: [18, 30], loot: [{ item: 'crab_shell', chance: 1 }, { item: 'oilskin_hat', chance: 0.08 }] },
  { id: 'ev-shallows', name: 'Brine in the Shallows', region: 'saltwind', x: 1716, z: 700, goal: 'Burst the brine jellies in the shallows', waves: [{ type: 'brinejelly', count: 3 }, { type: 'brinejelly', count: 4 }], time: 300, cooldown: 480, xp: 600, marks: [16, 28], loot: [{ item: 'jelly_residue', chance: 1 }, { item: 'brine_cutlass', chance: 0.08 }] },
  { id: 'ev-canyon', name: 'Dust Wolves at the Canyon Mouth', region: 'redstone', x: 1152, z: 1322, goal: 'Break the dust wolf pack', waves: [{ type: 'dustwolf', count: 3 }, { type: 'dustwolf', count: 3 }], leader: 'dustwolf', time: 300, cooldown: 480, xp: 820, marks: [22, 36], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'harrow_cleaver', chance: 0.05 }] },
  { id: 'ev-cuts', name: 'Redbacks in the Ore Cuts', region: 'redstone', x: 952, z: 1104, goal: 'Clear the redbacks out of the cuts', waves: [{ type: 'redback', count: 2 }, { type: 'redback', count: 3 }], leader: 'redback', time: 300, cooldown: 480, xp: 860, marks: [22, 36], loot: [{ item: 'iron_ore', chance: 1 }, { item: 'redback_helm', chance: 0.08 }] },
  { id: 'ev-pasture', name: 'Frost Wolves on the High Pasture', region: 'starfall', x: 424, z: 1524, goal: 'Drive the frost wolves off the pasture', waves: [{ type: 'frostwolf', count: 2 }, { type: 'frostwolf', count: 3 }], leader: 'frostwolf', time: 330, cooldown: 540, xp: 1200, marks: [30, 46], loot: [{ item: 'frost_pelt', chance: 1 }, { item: 'frost_cowl', chance: 0.08 }] },
  { id: 'ev-tarn', name: 'Shards at Coldwater Tarn', region: 'starfall', x: 566, z: 1506, goal: 'Shatter the shard jellies round the tarn', waves: [{ type: 'shardjelly', count: 3 }, { type: 'shardjelly', count: 3 }], time: 330, cooldown: 540, xp: 1100, marks: [28, 44], loot: [{ item: 'star_crystal', chance: 1 }, { item: 'starglass_edge', chance: 0.06 }] },
];

export interface BossDef {
  id: string;
  type: EnemyType;
  /** Where it rises, and what that place is called on the announcement. */
  x: number;
  z: number;
  where: string;
  /** It rises every `every` seconds, `offset` seconds into the cycle, and stays ten minutes. */
  every: number;
  offset: number;
  /** What it calls in at two-thirds and one-third health. */
  adds: EnemyType;
}

export const WORLD_BOSSES: BossDef[] = [
  { id: 'wb-bramblemaw', type: 'bramblemaw', x: 120, z: 1157, where: 'the Bramble Ring, Hagworm Wood', every: 1800, offset: 0, adds: 'thornwolf' },
  { id: 'wb-tidewright', type: 'tidewright', x: 1708, z: 1004, where: 'Tidewright Sands, the Fleet Coast', every: 1800, offset: 450, adds: 'crab' },
  { id: 'wb-cinderhorn', type: 'cinderhorn', x: 1245, z: 1375, where: 'Cinderhorn Pit, the Raddle Barrens', every: 1800, offset: 900, adds: 'dustwolf' },
  { id: 'wb-rimeglass', type: 'rimeglass', x: 957, z: 1734, where: 'the Rime Bowl, Scarth', every: 1800, offset: 1350, adds: 'shardjelly' },
];
/** How long a world boss stays up once it has risen, and how long before that it is announced (seconds). */
export const BOSS_UP = 600;
export const BOSS_WARN = 180;

/** Shardfalls: a star comes down at one of these, in turn, every SHARDFALL_EVERY seconds. */
export const SHARDFALLS: [number, number][] = [[513, 1568], [666, 1772], [830, 1733], [1058, 1971], [1344, 1731], [1404, 1906]];
export const SHARDFALL_EVERY = 360;

// ---------------------------------------------------------------- Parish tasks
// Areas where the locals want a hand (Guild Wars 2's renown hearts, in our own clothes): do the
// chores at the glowing spots and drive off the pests until the bar fills, once per character.

export type ChoreProp = 'crop' | 'withy' | 'sheaf' | 'rail' | 'clamp' | 'skep' | 'salt' | 'kelp' | 'ochre' | 'cistern' | 'peat' | 'cairn';

export interface TaskDef {
  id: string;
  name: string;
  region: RegionId;
  x: number; z: number;
  /** How far the task's ground reaches. */
  r: number;
  goal: string;
  /** The chore: "Lift the turnip row". */
  verb: string; noun: string; prop: ChoreProp;
  pests: { type: EnemyType; max: number };
  xp: number;
  marks: number;
  loot: string[];
}

export const TASKS: TaskDef[] = [
  { id: 'tk-ridley', name: 'The Ridley Allotments', region: 'greenwake', x: 289, z: 161, r: 22, goal: 'Lift the turnips for the allotment holders and see off the wolves.', verb: 'Lift', noun: 'turnip row', prop: 'crop', pests: { type: 'wolf', max: 2 }, xp: 260, marks: 14, loot: ['bread', 'bread'] },
  { id: 'tk-withies', name: 'Sallowmere Withy Beds', region: 'greenwake', x: 38, z: 133, r: 22, goal: 'Cut withies for the basket-makers and clear the jellies out of the beds.', verb: 'Cut', noun: 'withy bundle', prop: 'withy', pests: { type: 'jelly', max: 3 }, xp: 260, marks: 14, loot: ['copper_ore', 'copper_ore'] },
  { id: 'tk-askew', name: 'Askew\'s Stubble', region: 'crownroad', x: 418, z: 301, r: 24, goal: 'Stook the cut barley before the boars trample it.', verb: 'Stook', noun: 'barley sheaf', prop: 'sheaf', pests: { type: 'boar', max: 2 }, xp: 480, marks: 22, loot: ['boar_hide', 'bread'] },
  { id: 'tk-paddocks', name: 'The Drove Paddocks', region: 'crownroad', x: 684, z: 844, r: 24, goal: 'Mend the paddock rails and keep the road wolves off the stock.', verb: 'Mend', noun: 'broken rail', prop: 'rail', pests: { type: 'roadwolf', max: 3 }, xp: 520, marks: 24, loot: ['wolf_pelt', 'bread'] },
  { id: 'tk-colliers', name: 'The Colliers\' Clearing', region: 'brambledeep', x: 333, z: 793, r: 24, goal: 'Bank up the charcoal clamps for the colliers and drive off the thornbacks.', verb: 'Bank up', noun: 'charcoal clamp', prop: 'clamp', pests: { type: 'thornwolf', max: 2 }, xp: 720, marks: 30, loot: ['elder_logs', 'elder_logs'] },
  { id: 'tk-skeps', name: 'Mossbank Bee Garths', region: 'brambledeep', x: 331, z: 391, r: 22, goal: 'Set the bee skeps back on their stands and burst the spore jellies.', verb: 'Right', noun: 'fallen skep', prop: 'skep', pests: { type: 'sporejelly', max: 3 }, xp: 700, marks: 30, loot: ['jelly_residue', 'cooked_trout'] },
  { id: 'tk-saltpans', name: 'The Saltings Pans', region: 'saltwind', x: 1612, z: 378, r: 24, goal: 'Rake the salt pans and turn the crabs out of them.', verb: 'Rake', noun: 'salt pan', prop: 'salt', pests: { type: 'crab', max: 3 }, xp: 820, marks: 34, loot: ['crab_shell', 'cooked_mackerel'] },
  { id: 'tk-wrack', name: 'Wrack Fields', region: 'saltwind', x: 1765, z: 832, r: 24, goal: 'Spread the kelp heaps on the fields and keep the brine jellies off them.', verb: 'Spread', noun: 'kelp heap', prop: 'kelp', pests: { type: 'brinejelly', max: 3 }, xp: 820, marks: 34, loot: ['jelly_residue', 'cooked_mackerel'] },
  { id: 'tk-ochre', name: 'The Ochre Diggings', region: 'redstone', x: 1146, z: 896, r: 24, goal: 'Dig out ochre for the dyers and keep the redbacks off the diggers.', verb: 'Dig', noun: 'ochre seam', prop: 'ochre', pests: { type: 'redback', max: 2 }, xp: 1000, marks: 40, loot: ['iron_ore', 'iron_ore'] },
  { id: 'tk-cisterns', name: 'The Thirsty Mile', region: 'redstone', x: 866, z: 1381, r: 24, goal: 'Clear the silted cisterns along the track and see off the dust wolves.', verb: 'Clear', noun: 'silted cistern', prop: 'cistern', pests: { type: 'dustwolf', max: 3 }, xp: 1000, marks: 40, loot: ['wolf_pelt', 'iron_ore'] },
  { id: 'tk-peat', name: 'Kelder Peat Hags', region: 'starfall', x: 659, z: 1889, r: 24, goal: 'Cut and stack peat for the winter and keep the frost wolves back.', verb: 'Cut', noun: 'peat bank', prop: 'peat', pests: { type: 'frostwolf', max: 2 }, xp: 1300, marks: 48, loot: ['frost_pelt', 'cooked_char'] },
  { id: 'tk-cairns', name: 'The Cairn Road', region: 'starfall', x: 143, z: 1573, r: 24, goal: 'Build the fallen waymark cairns back up and shatter the shard jellies.', verb: 'Rebuild', noun: 'fallen cairn', prop: 'cairn', pests: { type: 'shardjelly', max: 3 }, xp: 1300, marks: 48, loot: ['star_crystal', 'cooked_char'] },
];
