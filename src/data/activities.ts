import type { EnemyType } from './gameplay';
import type { RegionId } from '../world/terrain';
import { MORROW_OX } from '../world/morrow';

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
  // Chains (owner 2026-11-27: "i want some events to be dynamic ones like guild wars 2 has"): an event can be more than
  // waves. It can be something to hold, fires to put out, or things to carry. It can open with a call for help, and how it
  // ends decides what comes next and what's left in the world.
  /** Something to hold. The creatures go for it until you hit them, and if it breaks the event is lost. hp counts blows. */
  ward?: { label: string; hp: number; look: 'well' | 'fold' | 'nests' | 'stack' | 'hay' };
  /** Fires that break out one after another and spread. Put each out with E before it burns down; `lose` burnt down loses it. */
  fires?: { count: number; lose: number };
  /** Things scattered about to pick up with E. */
  gather?: { count: number; look: 'cutting' | 'sheep' | 'egg' | 'goat' | 'crate' | 'tool' | 'sheaf'; /** what you press E to do */ act: string; /** what the tracker counts */ noun: string };
  /** Ground to take and hold (GW2's capture points): stand in the ring for so many seconds in all; it only fills while none
   *  of the event's creatures stand in it with you. */
  capture?: { secs: number; label: string };
  /** A lookout of theirs that goes up when the event begins and comes down when it's won (owner 2026-11-27, the
   *  voxel-destruction kit: "a tower coming down"): where it stands from the event's middle, and how tall. */
  tower?: { dx: number; dz: number; h: number };
  /** Someone to walk somewhere (data/escorts.ts, a chained one): the link is won when they get there and lost if they go down. */
  escort?: string;
  /** Someone calls for help first, so many seconds before it starts (GW2's pre-events). */
  call?: { who: string; text: string; secs: number };
  /** Opened by a quest: it only flares up while this flag is set (and starts as soon as you're near), and when it ends
   *  it writes '<id>:result' ('win' or 'fail') for the quest to read and clears the flag. */
  gate?: string;
  /** A follow-up. It only flares up after this other event has ended this way, and it starts as soon as anyone is near. */
  after?: { id: string; result: 'win' | 'fail' };
  /** What its ending leaves behind: a world state set or cleared (WORLD_STATES), and a line from whoever called for help. */
  won?: { set?: string; clear?: string; say?: string };
  lost?: { set?: string; clear?: string; say?: string };
}

/** What a chain's ending can leave in the world until a later event puts it right. Every player on the realm sees the same. */
export const WORLD_STATES: Record<string, { x: number; z: number; r: number; look: 'burnt' | 'hurdles' | 'dug' | 'none'; guards?: { type: EnemyType; count: number }; note: string }> = {
  terracesburnt: { x: 8828, z: 958, r: 11, look: 'burnt', note: 'The top terrace at Cala Roja burned. The vines are black stumps.' },
  wellsheld: { x: 7496, z: -196, r: 9, look: 'none', guards: { type: 'saltreaver', count: 4 }, note: 'Salt reavers hold Tenwells\' outer wells.' },
  nestsdug: { x: 5100, z: 3460, r: 4, look: 'dug', note: 'The lizards dug out the turtle nests on Conch Key\'s beach.' },
  pensbroken: { x: 7186, z: 1625, r: 6, look: 'hurdles', note: 'Branchley\'s goat pens are broken and the goats are in the wold.' },
  heldfold: { x: 6970, z: -1500, r: 6, look: 'hurdles', note: 'Lew Garth\'s fold on the Held is down and his sheep are on the fell.' },
  kestlefold: { x: -2340, z: 2445, r: 6, look: 'hurdles', note: 'Thirza Rosewarne\'s fold at Kestle is down and her sheep are on the moor.' },
  eastwalkburnt: { x: 7689, z: 2548, r: 9, look: 'burnt', note: 'Three roofs on Reedwater\'s east walk burned on glim night.' },
  foldbroken: { x: 8615, z: -1054, r: 6, look: 'hurdles', note: 'The hurdles of Cold Harbour\'s fold are down and the sheep are loose on the cliff.' },
};

export const EVENTS: EventDef[] = [
  { id: 'ev-lantern', name: 'The Lantern Wolves', region: 'greenwake', x: 86, z: 262, goal: 'Drive the wolves off the Lantern ridge', waves: [{ type: 'wolf', count: 3 }, { type: 'wolf', count: 3 }], leader: 'wolf', time: 240, cooldown: 360, xp: 160, marks: [6, 12], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'wolfskin_hood', chance: 0.08 }] },
  { id: 'ev-wetlings', name: 'Mire Bloom in the Wetlings', region: 'greenwake', x: 204, z: 246, goal: 'Clear the jellies out of the low fields', waves: [{ type: 'jelly', count: 4 }, { type: 'jelly', count: 4 }], time: 240, cooldown: 360, xp: 120, marks: [4, 9], loot: [{ item: 'jelly_residue', chance: 1 }] },
  { id: 'ev-meadow', name: 'Boars in the Hay Meadows', region: 'crownroad', x: 545, z: 370, goal: 'Keep the boars off Nathaniel Crouch\'s haycocks before they root them flat', ward: { label: 'The haycocks', hp: 50, look: 'hay' },
    call: { who: 'Nathaniel Crouch', text: 'Boars in the hay! A whole sounder of them, rooting under the cocks! A week\'s cutting, and they\'ll have it flat in an hour!', secs: 12 },
    won: { say: 'They\'ve gone back to the wallow down by the brook. Every year they come up from there. Clear it and they\'ll go somewhere else to be a nuisance.' },
    lost: { say: 'Flat. All of it, rooted and scattered over the field. If we get it stooked again before the rain, there\'s still feed in it. Will you lend a hand?' },
    waves: [{ type: 'boar', count: 3 }, { type: 'boar', count: 3 }], leader: 'boar', time: 270, cooldown: 420, xp: 320, marks: [10, 18], loot: [{ item: 'boar_hide', chance: 1 }, { item: 'toll_sabre', chance: 0.06 }] },
  { id: 'ev-drove', name: 'Wolves on the Drove Road', region: 'crownroad', x: 836, z: 884, goal: 'Keep the wolves off the drove road', waves: [{ type: 'roadwolf', count: 4 }, { type: 'roadwolf', count: 4 }], leader: 'roadwolf', time: 270, cooldown: 420, xp: 380, marks: [12, 20], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'wolfskin_hood', chance: 0.08 }, { item: 'toll_sabre', chance: 0.06 }] },
  { id: 'ev-fellers', name: 'Stalkers round the Fellers\' Camp', region: 'brambledeep', x: 470, z: 566, goal: 'Keep the thornbacks off the camp\'s timber stack and its tools', ward: { label: 'The timber stack', hp: 60, look: 'stack' },
    call: { who: 'Ide Marrow', text: 'Thornbacks in the clearing! They\'re after the camp, the stack, everything! Get between them and the timber!', secs: 12 },
    won: { say: 'Jabez says they came from a lair in the brambles south of the clearing. If somebody cleared it, my fellers could work without a man on watch.' },
    lost: { say: 'They\'ve dragged the tools off into the brambles, the axes and the saws with them. No tools, no work, no pay. Help me find them.' },
    waves: [{ type: 'thornwolf', count: 2 }, { type: 'thornwolf', count: 3 }], leader: 'thornwolf', time: 300, cooldown: 480, xp: 560, marks: [16, 28], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'thorn_blade', chance: 0.08 }, { item: 'moss_hood', chance: 0.08 }] },
  { id: 'ev-spores', name: 'Spore Bloom at Peg\'s Water', region: 'brambledeep', x: 476, z: 968, goal: 'Burst the spore jellies before they spread', waves: [{ type: 'sporejelly', count: 3 }, { type: 'sporejelly', count: 4 }], time: 300, cooldown: 480, xp: 520, marks: [14, 26], loot: [{ item: 'jelly_residue', chance: 1 }, { item: 'moss_hood', chance: 0.08 }] },
  { id: 'ev-strand', name: 'Crabs on the Strand', region: 'saltwind', x: 1712, z: 420, goal: 'Clear the crabs off the strand', waves: [{ type: 'crab', count: 3 }, { type: 'crab', count: 3 }], leader: 'crab', time: 300, cooldown: 480, xp: 640, marks: [18, 30], loot: [{ item: 'crab_shell', chance: 1 }, { item: 'oilskin_hat', chance: 0.08 }] },
  { id: 'ev-shallows', name: 'Brine in the Shallows', region: 'saltwind', x: 1716, z: 700, goal: 'Burst the brine jellies in the shallows', waves: [{ type: 'brinejelly', count: 3 }, { type: 'brinejelly', count: 4 }], time: 300, cooldown: 480, xp: 600, marks: [16, 28], loot: [{ item: 'jelly_residue', chance: 1 }, { item: 'brine_cutlass', chance: 0.08 }] },
  { id: 'ev-canyon', name: 'Dust Wolves at the Canyon Mouth', region: 'redstone', x: 1152, z: 1322, goal: 'Break the dust wolf pack', waves: [{ type: 'dustwolf', count: 3 }, { type: 'dustwolf', count: 3 }], leader: 'dustwolf', time: 300, cooldown: 480, xp: 820, marks: [22, 36], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'harrow_cleaver', chance: 0.05 }] },
  { id: 'ev-cuts', name: 'Redbacks in the Ore Cuts', region: 'redstone', x: 952, z: 1104, goal: 'Clear the redbacks out of the cuts', waves: [{ type: 'redback', count: 2 }, { type: 'redback', count: 3 }], leader: 'redback', time: 300, cooldown: 480, xp: 860, marks: [22, 36], loot: [{ item: 'iron_ore', chance: 1 }, { item: 'redback_helm', chance: 0.08 }] },
  { id: 'ev-pasture', name: 'Frost Wolves on the High Pasture', region: 'starfall', x: 424, z: 1524, goal: 'Drive the frost wolves off the pasture', waves: [{ type: 'frostwolf', count: 2 }, { type: 'frostwolf', count: 3 }], leader: 'frostwolf', time: 330, cooldown: 540, xp: 1200, marks: [30, 46], loot: [{ item: 'frost_pelt', chance: 1 }, { item: 'frost_cowl', chance: 0.08 }] },
  { id: 'ev-tarn', name: 'Shards at Coldwater Tarn', region: 'starfall', x: 566, z: 1506, goal: 'Shatter the shard jellies round the tarn', waves: [{ type: 'shardjelly', count: 3 }, { type: 'shardjelly', count: 3 }], time: 330, cooldown: 540, xp: 1100, marks: [28, 44], loot: [{ item: 'star_crystal', chance: 1 }, { item: 'starglass_edge', chance: 0.06 }] },
  // Verandah (owner 2026-11-07: "Verandah gets events like the rest of the map, fitted to its own lore"): the port's
  // wealth draws thieves to it by land and by sea. Wreckers from Black Gull light false lamps on the headland under
  // Awschitz to bring ships onto the rocks; footpads work the sands below the port where the cargo is landed;
  // poachers take the deer in the Mizuholm woods; wolves come down on Kestle's sheep; crabs swarm the Long Sands.
  { id: 'ev-falselights', name: 'False Lights on Awschitz Head', region: 'verandah', x: -3458, z: 1912, goal: 'Put out the wreckers\' false lamps on the headland before a ship steers for them', fires: { count: 7, lose: 3 },
    call: { who: 'Wenna Chegwidden', text: 'Lights on the Head! That\'s no lighthouse, that\'s Black Gull\'s lot, and there\'s a coaster standing in for the harbour. Put them out before she turns for them!', secs: 12 },
    won: { say: 'She\'s seen the true light and gone about. The wreckers ran down the cliff path to their cove. Catch them there before they try it again.' },
    lost: { say: 'She\'s on the rocks under the Head. The crew got off, God knows how, but her cargo\'s coming ashore in every cove. Help me get it in before the wreckers do.' },
    waves: [{ type: 'wrecker', count: 3 }, { type: 'wrecker', count: 4 }], leader: 'wrecker', time: 330, cooldown: 540, xp: 980, marks: [26, 42], loot: [{ item: 'raw_mackerel', chance: 1 }, { item: 'lampman_hood', chance: 0.05 }, { item: 'brine_cutlass', chance: 0.05 }] },
  { id: 'ev-portsands', name: 'Footpads on the Port Sands', region: 'verandah', x: -2937, z: 1905, goal: 'Run the footpads off the sands where the cargo comes ashore', waves: [{ type: 'footpad', count: 3 }, { type: 'footpad', count: 4 }], leader: 'footpad', time: 300, cooldown: 480, xp: 900, marks: [24, 40], loot: [{ item: 'bread', chance: 1 }, { item: 'toll_sabre', chance: 0.06 }] },
  { id: 'ev-mizuholm', name: 'Poachers in the Mizuholm Woods', region: 'verandah', x: -2862, z: 2735, goal: 'Catch the poachers before they clear the woods of deer', waves: [{ type: 'poacher', count: 3 }, { type: 'poacher', count: 3 }], leader: 'poacher', time: 300, cooldown: 480, xp: 920, marks: [24, 40], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'thorn_blade', chance: 0.06 }] },
  { id: 'ev-kestlefolds', name: 'Wolves at the Kestle Folds', region: 'verandah', x: -2340, z: 2445, goal: 'Keep the moor wolves out of Thirza Rosewarne’s fold', ward: { label: 'The fold', hp: 60, look: 'fold' },
    call: { who: 'Thirza Rosewarne', text: 'Wolves off the moor, and the snow\'s brought them hungry! They\'re at my fold! Anyone with a blade!', secs: 12 },
    won: { clear: 'kestlefold', say: 'They\'ve gone back up the valley to the rocks where they den. Go and finish it, and I\'ll owe you a fleece.' },
    lost: { set: 'kestlefold', say: 'The hurdles are down and the sheep are all over the moor. They\'ll freeze or the wolves will have them. Help me bring them in.' },
    waves: [{ type: 'moorwolf', count: 2 }, { type: 'moorwolf', count: 3 }], leader: 'moorwolf', time: 330, cooldown: 540, xp: 1000, marks: [26, 42], loot: [{ item: 'frost_pelt', chance: 1 }, { item: 'frost_cowl', chance: 0.06 }] },
  { id: 'ev-longsands', name: 'Crabs on the Long Sands', region: 'verandah', x: -2642, z: 2158, goal: 'Clear the crabs off the Long Sands before the tide brings more', waves: [{ type: 'crab', count: 4 }, { type: 'crab', count: 4 }], leader: 'crab', time: 300, cooldown: 480, xp: 860, marks: [22, 38], loot: [{ item: 'crab_shell', chance: 1 }, { item: 'oilskin_hat', chance: 0.08 }] },
  // Morrow (owner 2026-11-26: "it also needs events dungeons all that"): two in every region, each from that country's own
  // trouble, the places found flat and dry and off the roads, near the towns that would send for help
  { id: 'ev-mcauseway', name: 'Snakes on the Causeway', region: 'keys', x: 5151, z: 3369, goal: 'Clear the mangrove snakes off the causeway before the Conch carts come through', waves: [{ type: 'mangrovesnake', count: 4 }, { type: 'mangrovesnake', count: 4 }], leader: 'mangrovesnake', time: 300, cooldown: 420, xp: 900, marks: [16, 28], loot: [{ item: 'adder_skin', chance: 1 }] },
  { id: 'ev-mturtles', name: 'The Turtle Beach', region: 'keys', x: 5100, z: 3460, goal: 'Keep the key lizards off the turtle nests before the eggs are gone', waves: [{ type: 'keylizard', count: 3 }, { type: 'keylizard', count: 4 }], leader: 'keylizard', time: 300, cooldown: 420, xp: 880, marks: [16, 28], loot: [{ item: 'lizard_hide', chance: 1 }],
    ward: { label: 'The turtle nests', hp: 50, look: 'nests' },
    call: { who: 'Sal Mudge', text: 'Lizards on the nesting beach! They\'re digging! Every egg they get is one less turtle back here in thirty years. Help me!', secs: 12 },
    won: { clear: 'nestsdug', say: 'They\'ve gone back to their burrows up in the dune scrub. If someone cleared those out, the nests would have a quiet season for once.' },
    lost: { set: 'nestsdug', say: 'They\'ve had half the nests open. There are still eggs in the sand, if we\'re quick. Help me bury them again.' } },
  { id: 'ev-mglims', name: 'Glim Night at Reedwater', region: 'glades', x: 7770, z: 2536, goal: 'Put out the glims drifting in over the marsh towards the stilt walks', waves: [{ type: 'glim', count: 4 }, { type: 'glim', count: 4 }], leader: 'glim', time: 300, cooldown: 420, xp: 1000, marks: [18, 30], loot: [{ item: 'jelly_residue', chance: 1 }] },
  { id: 'ev-mwebs', name: 'Webs on the Punt Channel', region: 'glades', x: 7615, z: 2655, goal: 'Cut the glade spiders out of the punt channel before they web it shut', waves: [{ type: 'gladespider', count: 3 }, { type: 'gladelizard', count: 2 }], leader: 'gladespider', time: 300, cooldown: 420, xp: 1050, marks: [18, 30], loot: [{ item: 'lizard_hide', chance: 1 }] },
  { id: 'ev-mlynx', name: 'The Lynx Run', region: 'amberwold', x: 7186, z: 1625, goal: 'Keep the amber lynxes out of Branchley’s goat pens', ward: { label: 'The goat pens', hp: 60, look: 'fold' },
    call: { who: 'Hester Crane', text: 'Lynx at the pens! Three of them, maybe more in the trees! I can\'t hold them off with a crook!', secs: 12 },
    won: { clear: 'pensbroken', say: 'They\'ve run back into the wold. There\'s a lynx den under the windfall east of here. That\'s where they keep coming from.' },
    lost: { set: 'pensbroken', say: 'The pens are down and the goats have bolted into the trees. Help me find them before dark, before the lynx do.' },
    waves: [{ type: 'amberlynx', count: 3 }, { type: 'amberlynx', count: 3 }], leader: 'amberlynx', time: 300, cooldown: 420, xp: 1120, marks: [19, 32], loot: [{ item: 'wolf_pelt', chance: 1 }] },
  { id: 'ev-mmoths', name: 'Lamp-Moth Swarm', region: 'amberwold', x: 7180, z: 1500, goal: 'Drive the lamp-moths off the old road’s lanterns before they put every one out', waves: [{ type: 'lampmoth', count: 4 }, { type: 'lampmoth', count: 4 }], leader: 'lampmoth', time: 300, cooldown: 420, xp: 1120, marks: [19, 32], loot: [{ item: 'moth_dust', chance: 1 }] },
  { id: 'ev-mjackals', name: 'Jackals in the Terraces', region: 'bright', x: 8845, z: 951, goal: 'Run the terrace jackals out of Cala’s vines before the vintage', waves: [{ type: 'terracejackal', count: 3 }, { type: 'terracejackal', count: 3 }], leader: 'terracejackal', time: 300, cooldown: 420, xp: 1200, marks: [20, 34], loot: [{ item: 'wolf_pelt', chance: 1 }] },
  { id: 'ev-mbeetles', name: 'Beetles in the White Quarry', region: 'bright', x: 8280, z: 1100, goal: 'Clear the quarry beetles out of the white workings so the cutters can go back', waves: [{ type: 'quarrybeetle', count: 3 }, { type: 'quarrybeetle', count: 3 }], leader: 'quarrybeetle', time: 300, cooldown: 420, xp: 1200, marks: [20, 34], loot: [{ item: 'white_chip', chance: 1 }] },
  { id: 'ev-mcrawlers', name: 'Crawlers on the Rim', region: 'sunder', x: 7916, z: 233, goal: 'Knock the slab crawlers off Liftwick’s rim before they foul the bridges', waves: [{ type: 'slabcrawler', count: 3 }, { type: 'slabcrawler', count: 3 }], leader: 'slabcrawler', time: 300, cooldown: 420, xp: 1340, marks: [22, 38], loot: [{ item: 'white_chip', chance: 1 }] },
  { id: 'ev-mriftpack', name: 'The Rift Pack', region: 'sunder', x: 7750, z: 300, goal: 'Break up the rift wolves hunting the skyfarm flocks', waves: [{ type: 'riftwolf', count: 3 }, { type: 'riftwolf', count: 3 }], leader: 'riftwolf', time: 300, cooldown: 420, xp: 1360, marks: [22, 38], loot: [{ item: 'wolf_pelt', chance: 1 }] },
  { id: 'ev-mreavers', name: 'Reavers at the Outer Wells', region: 'glassflats', x: 7496, z: -196, goal: 'Keep the salt reavers off the outer well head. If they foul it, Tenwells loses the well', waves: [{ type: 'saltreaver', count: 3 }, { type: 'saltreaver', count: 3 }], leader: 'saltreaver', time: 300, cooldown: 420, xp: 1500, marks: [24, 42], loot: [{ item: 'black_glass', chance: 1 }],
    ward: { label: 'The outer well head', hp: 70, look: 'well' },
    call: { who: 'Ennis Wade', text: 'Reavers on the flats, and they\'re making for the outer wells! If they foul the well head we carry water from the fort all summer. Get out there!', secs: 15 },
    won: { clear: 'wellsheld', say: 'They\'re falling back to their camp on the flats. Hit them there and they won\'t try the wells again this season.' },
    lost: { set: 'wellsheld', say: 'They\'ve got the outer wells. They\'ll sit on them and sell us our own water if we let them.' } },
  { id: 'ev-mglassbacks', name: 'Glassbacks Before the Storm', region: 'glassflats', x: 7550, z: -400, goal: 'See off the glassbacks and their basilisk before the lightning comes in over the flats', waves: [{ type: 'glassback', count: 3 }, { type: 'glassback', count: 2 }], leader: 'basilisk', time: 300, cooldown: 420, xp: 1520, marks: [24, 42], loot: [{ item: 'black_glass', chance: 1 }] },
  { id: 'ev-mhounds', name: 'Waste Hounds at the Harbour', region: 'greywaste', x: 8615, z: -1054, goal: 'Keep the waste hounds from breaking into Cold Harbour’s fold', waves: [{ type: 'wastehound', count: 3 }, { type: 'wastehound', count: 3 }], leader: 'wastehound', time: 300, cooldown: 420, xp: 1660, marks: [26, 46], loot: [{ item: 'wolf_pelt', chance: 1 }],
    ward: { label: 'The fold', hp: 60, look: 'fold' },
    call: { who: 'Wat Aske', text: 'Hounds! They\'re at the fold! Those are the last sheep in Cold Harbour. Don\'t let them through the hurdles!', secs: 12 },
    won: { clear: 'foldbroken', say: 'They\'ve run back to their den in the rocks above the cove. Go and finish it, and I might sleep tonight.' },
    lost: { set: 'foldbroken', say: 'They broke the hurdles. The sheep are all over the cliff. Help me find them before the hounds come back for them.' } },
  { id: 'ev-mrisen', name: 'The Risen on the Moor', region: 'greywaste', x: 6970, z: -1150, goal: 'Lay the risen down before they walk as far as Northgate’s fields', waves: [{ type: 'risen', count: 3 }, { type: 'risen', count: 3 }], leader: 'risen', time: 300, cooldown: 420, xp: 1700, marks: [26, 46], loot: [{ item: 'grave_iron', chance: 1 }] },
  { id: 'ev-mwights', name: 'Wights at the Dig', region: 'held', x: 7364, z: -1884, goal: 'Hold the diggers’ camp against the barrow-wights coming up out of the dark', waves: [{ type: 'risen', count: 3 }, { type: 'barrowwight', count: 2 }], leader: 'barrowwight', time: 300, cooldown: 420, xp: 1900, marks: [30, 52], loot: [{ item: 'grave_iron', chance: 1 }] },
  { id: 'ev-mtroll', name: 'A Troll at the Folds', region: 'held', x: 6970, z: -1500, goal: 'Keep the fell troll and what follows it out of Lew Garth’s fold', waves: [{ type: 'cavebear', count: 2 }, { type: 'felltroll', count: 1 }], leader: 'felltroll', time: 360, cooldown: 480, xp: 2000, marks: [32, 56], loot: [{ item: 'troll_hide', chance: 1 }],
    ward: { label: 'The fold', hp: 70, look: 'fold' },
    call: { who: 'Lew Garth', text: 'There\'s a troll come down off the fell, and the bears are following it for the leavings! It\'s heading for my fold!', secs: 12 },
    won: { clear: 'heldfold', say: 'It came down the scree from the old cave above the tarn. The bears will have found its larder by now. Clear it, or another one will come for it.' },
    lost: { set: 'heldfold', say: 'It\'s through the hurdles. What it didn\'t eat has run up the fell. They\'ll die of cold up there by morning if nobody brings them down.' } },
  // The chains' other links: they only flare up once the one before has ended a certain way (after), and they put the
  // world back as it was, or leave it worse
  { id: 'ev-mterracefire', name: 'Fire on the Terraces', region: 'bright', x: 8828, z: 958, goal: 'Put out the fires on Cala Roja’s top terrace before the whole hill goes up', waves: [], fires: { count: 8, lose: 3 }, time: 240, cooldown: 900, xp: 1240, marks: [22, 36], loot: [{ item: 'olive_bread', chance: 0.6 }],
    call: { who: 'Jordi Vall', text: 'Fire on the top terrace! The whole hill is dry as tinder. Anyone with two hands, there are buckets at the cistern!', secs: 10 },
    won: { clear: 'terracesburnt', say: 'That wasn\'t lightning. There\'s lamp oil on the stakes, and boot prints going down to the cove. Someone wanted us looking up here.' },
    lost: { set: 'terracesburnt', say: 'It\'s gone. Three years of vines. If we can save the cuttings there\'s something to plant. Help me find them.' } },
  { id: 'ev-mlanding', name: 'The Black-Runners\' Landing', region: 'bright', x: 8802, z: 996, goal: 'Catch the black-runners at the cove before their boat takes the cargo off', after: { id: 'ev-mterracefire', result: 'win' }, waves: [{ type: 'blackrunner', count: 3 }, { type: 'blackrunner', count: 3 }], leader: 'blackrunner', time: 240, cooldown: 900, xp: 1380, marks: [24, 40], loot: [{ item: 'black_shard', chance: 1 }],
    won: { say: 'They lit my hill to land a few casks. The casks are ours now, if we can get them up the hill. I\'ll load the cart.' },
    lost: { say: 'The boat\'s away. They\'ll be back when the hill is dry again.' } },
  { id: 'ev-mcasks', name: 'The Casks to Cala Roja', region: 'bright', x: 8806, z: 990, goal: 'Walk Jordi Vall and the black-runners\' casks up past the terraces to Cala Roja', after: { id: 'ev-mlanding', result: 'win' }, escort: 'es-casks', waves: [], time: 480, cooldown: 900, xp: 900, marks: [16, 26], loot: [{ item: 'olive_bread', chance: 0.6 }],
    won: { say: 'Every cask up the hill and counted. Cala Roja won\'t forget who came running.' },
    lost: { say: 'They had the cart over. Half the casks went down the hill. Still, the rest are ours.' } },
  { id: 'ev-mcuttings', name: 'What the Fire Left', region: 'bright', x: 8828, z: 958, goal: 'Find the vine cuttings that came through the fire so the terrace can be planted again', after: { id: 'ev-mterracefire', result: 'fail' }, waves: [{ type: 'terracejackal', count: 2 }], gather: { count: 7, look: 'cutting', act: 'Pick up the vine cuttings', noun: 'cuttings' }, time: 240, cooldown: 900, xp: 1100, marks: [18, 30], loot: [{ item: 'olive_bread', chance: 0.6 }],
    won: { clear: 'terracesburnt', say: 'They\'ll take. Heeled in by tonight, and in three years it\'s a terrace again. Thank you.' } },
  { id: 'ev-mreavercamp', name: 'The Reaver Camp', region: 'glassflats', x: 7590, z: -200, goal: 'Break the reavers’ camp on the flats and bring down their lookout', after: { id: 'ev-mreavers', result: 'win' }, tower: { dx: 6, dz: -4, h: 11 }, waves: [{ type: 'saltreaver', count: 3 }, { type: 'saltreaver', count: 4 }], leader: 'saltreaver', time: 300, cooldown: 900, xp: 1700, marks: [28, 46], loot: [{ item: 'black_glass', chance: 1 }, { item: 'callis_red', chance: 0.4 }],
    won: { say: 'Down it comes! Camp\'s broken and their water skins are cut. They\'ll have to go a long way round to find another well.' } },
  { id: 'ev-mretakewells', name: 'Take Back the Outer Wells', region: 'glassflats', x: 7496, z: -196, goal: 'Take the outer wells back and hold the ground round them while the reavers try to win it back', after: { id: 'ev-mreavers', result: 'fail' }, capture: { secs: 60, label: 'The outer wells' }, waves: [{ type: 'saltreaver', count: 3 }, { type: 'saltreaver', count: 3 }], leader: 'saltreaver', time: 300, cooldown: 900, xp: 1600, marks: [26, 44], loot: [{ item: 'black_glass', chance: 1 }],
    call: { who: 'Ennis Wade', text: 'Enough of this. Every reaver on that well is one more mouth we\'re watering. We\'re taking it back. Who\'s with me?', secs: 10 },
    won: { clear: 'wellsheld', say: 'The wells are ours. Somebody fetch rope and a clean bucket, and nobody drink from it until I\'ve tasted it.' } },
  { id: 'ev-mhoundden', name: 'The Hounds\' Den', region: 'greywaste', x: 8580, z: -1100, goal: 'Clear the waste hounds out of their den in the rocks above Cold Harbour', after: { id: 'ev-mhounds', result: 'win' }, waves: [{ type: 'wastehound', count: 3 }, { type: 'wastehound', count: 4 }], leader: 'wastehound', time: 300, cooldown: 900, xp: 1820, marks: [28, 48], loot: [{ item: 'wolf_pelt', chance: 1 }],
    won: { say: 'The den\'s empty. First quiet night at the fold since my father had it.' } },
  { id: 'ev-mstrays', name: 'The Scattered Flock', region: 'greywaste', x: 8615, z: -1054, goal: 'Bring the sheep back from the cliff before the hounds find them', after: { id: 'ev-mhounds', result: 'fail' }, waves: [{ type: 'wastehound', count: 2 }], gather: { count: 6, look: 'sheep', act: 'Bring the sheep back', noun: 'sheep' }, time: 240, cooldown: 900, xp: 1500, marks: [24, 40], loot: [{ item: 'wolf_pelt', chance: 0.6 }],
    won: { clear: 'foldbroken', say: 'That\'s every one of them. I\'ll have the hurdles up again by dark.' } },
  { id: 'ev-mburrows', name: 'The Lizards\' Burrows', region: 'keys', x: 5130, z: 3430, goal: 'Clear the key lizards out of their burrows in the dune scrub', after: { id: 'ev-mturtles', result: 'win' }, waves: [{ type: 'keylizard', count: 3 }, { type: 'keylizard', count: 4 }], leader: 'keylizard', time: 300, cooldown: 900, xp: 960, marks: [18, 30], loot: [{ item: 'lizard_hide', chance: 1 }],
    won: { say: 'Burrows empty. The turtles get a quiet season. I\'ll put it in the tally book with your name on it.' } },
  { id: 'ev-meggs', name: 'Eggs in the Sand', region: 'keys', x: 5100, z: 3460, goal: 'Find the turtle eggs the lizards dug up and bury them again before the sun cooks them', after: { id: 'ev-mturtles', result: 'fail' }, waves: [{ type: 'keylizard', count: 2 }], gather: { count: 6, look: 'egg', act: 'Bury the eggs again', noun: 'clutches' }, time: 240, cooldown: 900, xp: 820, marks: [14, 26], loot: [{ item: 'lizard_hide', chance: 0.6 }],
    won: { clear: 'nestsdug', say: 'Six clutches back in the sand. Not all of them will take, but most will. Thank you.' } },
  { id: 'ev-mlynxden', name: 'The Lynx Den', region: 'amberwold', x: 7220, z: 1650, goal: 'Drive the amber lynxes out of their den under the windfall', after: { id: 'ev-mlynx', result: 'win' }, waves: [{ type: 'amberlynx', count: 3 }, { type: 'amberlynx', count: 4 }], leader: 'amberlynx', time: 300, cooldown: 900, xp: 1200, marks: [20, 34], loot: [{ item: 'wolf_pelt', chance: 1 }],
    won: { say: 'Den\'s empty. My goats will be fat by autumn, and I\'ll owe you a cheese.' } },
  { id: 'ev-mgoats', name: 'Goats in the Wold', region: 'amberwold', x: 7186, z: 1625, goal: 'Find Hester Crane’s goats in the wold and bring them back to the pens', after: { id: 'ev-mlynx', result: 'fail' }, waves: [{ type: 'amberlynx', count: 2 }], gather: { count: 6, look: 'goat', act: 'Bring the goat back', noun: 'goats' }, time: 240, cooldown: 900, xp: 1050, marks: [18, 30], loot: [{ item: 'wolf_pelt', chance: 0.6 }],
    won: { clear: 'pensbroken', say: 'Every one of them, and the old nanny too. I\'ll have the pens up again by tonight.' } },
  { id: 'ev-mlarder', name: 'The Troll\'s Larder', region: 'held', x: 7010, z: -1540, goal: 'Clear the bears out of the troll’s old cave above the tarn', after: { id: 'ev-mtroll', result: 'win' }, waves: [{ type: 'cavebear', count: 2 }, { type: 'cavebear', count: 3 }], leader: 'cavebear', time: 330, cooldown: 900, xp: 2100, marks: [34, 58], loot: [{ item: 'troll_hide', chance: 0.5 }],
    won: { say: 'Nothing left up there to bring another one down. I\'ll sleep in the house tonight instead of by the fold.' } },
  { id: 'ev-mfell', name: 'Sheep on the Fell', region: 'held', x: 6970, z: -1500, goal: 'Bring Lew Garth’s sheep down off the fell before the cold takes them', after: { id: 'ev-mtroll', result: 'fail' }, waves: [{ type: 'cavebear', count: 1 }], gather: { count: 6, look: 'sheep', act: 'Bring the sheep back', noun: 'sheep' }, time: 270, cooldown: 900, xp: 1800, marks: [28, 48], loot: [{ item: 'troll_hide', chance: 0.3 }],
    won: { clear: 'heldfold', say: 'All six. They\'re cold, but they\'ll live. I\'ll mend the hurdles before I sleep.' } },
  { id: 'ev-wreckcove', name: 'The Wreckers\' Cove', region: 'verandah', x: -3440, z: 1890, goal: 'Catch the wreckers in their cove under Awschitz Head', after: { id: 'ev-falselights', result: 'win' }, waves: [{ type: 'wrecker', count: 3 }, { type: 'wrecker', count: 4 }], leader: 'wrecker', time: 330, cooldown: 900, xp: 1080, marks: [28, 44], loot: [{ item: 'lampman_hood', chance: 0.08 }, { item: 'brine_cutlass', chance: 0.08 }],
    won: { say: 'Their lamps are smashed and their boat\'s stove in. Awschitz owes you a drink, and I\'ll see you get it.' } },
  { id: 'ev-salvage', name: 'A Ship on the Rocks', region: 'verandah', x: -3458, z: 1912, goal: 'Bring in the wrecked coaster\'s cargo before the wreckers carry it off', after: { id: 'ev-falselights', result: 'fail' }, waves: [{ type: 'wrecker', count: 3 }], gather: { count: 6, look: 'crate', act: 'Haul the cargo up', noun: 'cargo' }, time: 270, cooldown: 900, xp: 900, marks: [24, 40], loot: [{ item: 'raw_mackerel', chance: 1 }],
    won: { say: 'Six crates, and the owners will have them back. Black Gull gets nothing out of this one.' } },
  { id: 'ev-kestleden', name: 'The Wolves\' Rocks', region: 'verandah', x: -2310, z: 2475, goal: 'Clear the moor wolves out of their den in the rocks up the valley', after: { id: 'ev-kestlefolds', result: 'win' }, waves: [{ type: 'moorwolf', count: 3 }, { type: 'moorwolf', count: 3 }], leader: 'moorwolf', time: 330, cooldown: 900, xp: 1100, marks: [28, 44], loot: [{ item: 'frost_pelt', chance: 1 }],
    won: { say: 'The rocks are empty. A quiet winter, then. Come by in spring and the fleece is yours.' } },
  { id: 'ev-kestlestrays', name: 'Sheep on the Moor', region: 'verandah', x: -2340, z: 2445, goal: 'Bring Thirza Rosewarne’s sheep in off the moor before the cold or the wolves take them', after: { id: 'ev-kestlefolds', result: 'fail' }, waves: [{ type: 'moorwolf', count: 2 }], gather: { count: 6, look: 'sheep', act: 'Bring the sheep back', noun: 'sheep' }, time: 270, cooldown: 900, xp: 950, marks: [24, 40], loot: [{ item: 'frost_pelt', chance: 0.6 }],
    won: { clear: 'kestlefold', say: 'All of them, and not a bite on one. I\'ll have the hurdles up by dark.' } },
  { id: 'ev-wallow', name: 'The Boars\' Wallow', region: 'crownroad', x: 552, z: 404, goal: 'Clear the boars out of their wallow by the brook', after: { id: 'ev-meadow', result: 'win' }, waves: [{ type: 'boar', count: 3 }, { type: 'boar', count: 3 }], leader: 'boar', time: 270, cooldown: 900, xp: 360, marks: [12, 20], loot: [{ item: 'boar_hide', chance: 1 }],
    won: { say: 'Empty, and the brook\'s running clear for once. Next year\'s hay is safe.' } },
  { id: 'ev-stooks', name: 'Stooking the Hay', region: 'crownroad', x: 545, z: 370, goal: 'Stook the scattered hay again before the rain comes', after: { id: 'ev-meadow', result: 'fail' }, waves: [{ type: 'boar', count: 2 }], gather: { count: 6, look: 'sheaf', act: 'Stook the hay', noun: 'stooks' }, time: 240, cooldown: 900, xp: 300, marks: [10, 18], loot: [{ item: 'boar_hide', chance: 0.6 }],
    won: { say: 'That\'ll dry. Half a week\'s cutting saved, and I owe you a drink at the Weighhouse.' } },
  { id: 'ev-thornlair', name: 'The Thornback Lair', region: 'crownroad', x: 505, z: 572, goal: 'Clear the thornbacks out of their lair in the brambles', after: { id: 'ev-fellers', result: 'win' }, waves: [{ type: 'thornwolf', count: 3 }, { type: 'thornwolf', count: 3 }], leader: 'thornwolf', time: 300, cooldown: 900, xp: 620, marks: [18, 30], loot: [{ item: 'wolf_pelt', chance: 1 }, { item: 'thorn_blade', chance: 0.08 }],
    won: { say: 'Lair\'s empty. My lads can fell without looking over their shoulders. Come by for a cup when you\'re passing.' } },
  { id: 'ev-felltools', name: 'Tools in the Brambles', region: 'crownroad', x: 470, z: 566, goal: 'Find the axes and saws the thornbacks dragged into the brambles', after: { id: 'ev-fellers', result: 'fail' }, waves: [{ type: 'thornwolf', count: 2 }], gather: { count: 6, look: 'tool', act: 'Pick up the tool', noun: 'tools' }, time: 270, cooldown: 900, xp: 520, marks: [14, 24], loot: [{ item: 'wolf_pelt', chance: 0.6 }],
    won: { say: 'Every axe and both saws. Chewed handles, but they\'ll cut. Thank you.' } },
  // (a quest's set piece: data/content/reedRoofs.ts opens it)
  { id: 'ev-mreedfire', name: 'The East Walk Burns', region: 'glades', x: 7689, z: 2548, goal: 'Put out the burning roofs on Reedwater\'s east walk and drive the glims back to the marsh', gate: 'rwRoofs:fire', waves: [{ type: 'glim', count: 3 }, { type: 'glim', count: 4 }], fires: { count: 9, lose: 4 }, time: 300, cooldown: 600, xp: 1500, marks: [20, 34], loot: [],
    call: { who: 'Joan Reddy', text: 'There! The long house, the eaves have caught! Buckets, now, before it gets into the next one!', secs: 8 },
    won: { say: 'That\'s the last of it. Look at them. Still there, every one.' },
    lost: { set: 'eastwalkburnt', say: 'It\'s in the rafters. Get back, it\'s coming down. Get back!' } },
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

/** The Mother's Bed, in the Glass Flats west of Tenwells, where the Glassmother comes down. */
export const GLASSMOTHER_BED = { x: MORROW_OX + 700, z: -380 };

/** The Lantern Ring, in the deep of the Amberwold west of Branchley, where Old Lantern comes down at dusk. */
export const LANTERN_RING = { x: MORROW_OX + 100, z: 1350 };

export const WORLD_BOSSES: BossDef[] = [
  { id: 'wb-bramblemaw', type: 'bramblemaw', x: 120, z: 1157, where: 'the Bramble Ring, Hagworm Wood', every: 1800, offset: 0, adds: 'thornwolf' },
  { id: 'wb-tidewright', type: 'tidewright', x: 1708, z: 1004, where: 'Jenny\'s Strand, the Fleet Coast', every: 1800, offset: 450, adds: 'crab' },
  { id: 'wb-cinderhorn', type: 'cinderhorn', x: 1245, z: 1375, where: 'Clinker Bottom, the Raddle Barrens', every: 1800, offset: 900, adds: 'dustwolf' },
  { id: 'wb-rimeglass', type: 'rimeglass', x: 957, z: 1734, where: 'the Rime Bowl, Scarth', every: 1800, offset: 1350, adds: 'shardjelly' },
  // Morrow's: the Glassmother comes down on the Mother's Bed in the Glass Flats, her brood with her
  // and Old Lantern in the Amberwold, her swarm with her
  { id: 'wb-oldlantern', type: 'oldlantern', x: LANTERN_RING.x, z: LANTERN_RING.z, where: 'the Lantern Ring, the Amberwold', every: 1800, offset: 1125, adds: 'lampmoth' },
  { id: 'wb-glassmother', type: 'glassmother', x: GLASSMOTHER_BED.x, z: GLASSMOTHER_BED.z, where: 'the Mother\'s Bed, the Glass Flats', every: 1800, offset: 225, adds: 'flatsdrake' },
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
  // Verandah: the farm's corn before the boars get it; the stables' paddock rails, and the horse thieves who broke them
  { id: 'tk-vhbarley', name: 'Verandah Farm Corn', region: 'verandah', x: -2715, z: 2222, r: 10, goal: 'Stook the farm’s corn before the boars trample it.', verb: 'Stook', noun: 'corn sheaf', prop: 'sheaf', pests: { type: 'boar', max: 2 }, xp: 1000, marks: 40, loot: ['boar_hide', 'bread'] },
  { id: 'tk-vhpaddocks', name: 'The Stable Paddocks', region: 'verandah', x: -3282, z: 2064, r: 10, goal: 'Mend the paddock rails at the stables and see off the horse thieves.', verb: 'Mend', noun: 'broken rail', prop: 'rail', pests: { type: 'footpad', max: 2 }, xp: 1000, marks: 40, loot: ['bread', 'toll_sabre'] },
  { id: 'tk-cairns', name: 'The Cairn Road', region: 'starfall', x: 143, z: 1573, r: 24, goal: 'Build the fallen waymark cairns back up and shatter the shard jellies.', verb: 'Rebuild', noun: 'fallen cairn', prop: 'cairn', pests: { type: 'shardjelly', max: 3 }, xp: 1300, marks: 48, loot: ['star_crystal', 'cooked_char'] },
];

// Placed on the first continent: none of them in Morrow (world/land.ts)
