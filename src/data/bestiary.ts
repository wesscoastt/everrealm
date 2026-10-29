import { ENEMIES, REGION_SPAWNS, type EnemyType } from './gameplay';
import type { RegionId } from '../world/terrain';

// The bestiary (the journal's Bestiary page): every creature of the wilds, entered as you meet it. One kill
// writes its name, its level and where it's found; ten, how it fights and what it leaves; fifty, the note a
// hunter would give you about it over a drink. Counts are the "killed:<type>" flags the game already keeps.

/** Kill counts that open each part of an entry: met, known, and known well. */
export const BEAST_TIERS = [1, 10, 50] as const;

/** How each way of attacking reads to a player, from the ground's warning. */
export const ATTACK_WAYS: Record<string, string> = {
  lunge: 'Closes in and lunges: a red strip marks where it\'s going. Step off the strip.',
  slam: 'Rears up and comes down on everything round it: a red circle. Get out of the circle.',
  charge: 'Lowers its head and charges down a long lane. Step sideways out of the lane.',
  throw: 'Hangs back and throws, marking where you stand. Keep moving and close the gap.',
  cast: 'Hangs back and gathers something in its hand over a gold ring. Stun it to break the spell, or roll as the bolt comes.',
};
/** What a foe does besides its blows (data/foeKinds.ts), told the same way. */
export const ROLE_WAYS: Record<string, string> = {
  mend: 'Heals the most hurt of its friends: a green ring at its feet. Kill it first, or stun it while it gathers.',
  guard: 'Fights behind a shield that turns most of a blow from the front. Get round it, or stun it.',
  summon: 'Calls more of its kind when the fight starts and again when it\'s hurt. Stun it while it calls; they leave when it falls.',
};

/** What a hunter would tell you, once you've killed fifty. Plain and short; every one a thing that's true in the world. */
export const BEAST_NOTES: Partial<Record<EnemyType, string>> = {
  // Hollindale and the Turnpike
  wolf: 'Vale wolves follow the sheep down in a hard winter and go back up in spring. Old Notch was one of them, once. Ashcrofts nail the fangs over the barn door.',
  heathadder: 'Lies in the warm on the heath paths till noon. It bites what steps on it, and nothing else. Hollin children learn to stamp as they walk.',
  huss: 'A dogfish, really. Gullmouth sells it as rock salmon and nobody believes them. It follows the boats in for the gutting.',
  boar: 'Roots the hedge banks along the Turnpike and charges anything that stops to look at it. The toll-keepers eat well in autumn.',
  roadwolf: 'Turnpike wolves have learned the carts. They take the last one, always the last. Josiah Yeo rides second from last and sleeps fine.',
  brownbear: 'Comes down to the Crown Road orchards when the apples fall and eats till it can barely walk. Don\'t be between it and the trees.',
  conger: 'Lives in the wrecks and the harbour walls, and bites like a gate shutting. Gullmouth riggers bind their splices in its skin.',
  // Hagworm Wood
  thornwolf: 'Grows a mane of bramble along its back, rooted in the skin, and hunts in it like a man in a cloak. The fellers hear it before they see it, if they\'re lucky.',
  sporejelly: 'A jelly that\'s eaten something in the wood it shouldn\'t have. It breathes out a yellow dust that the fellers swear makes the trees whisper.',
  weaver: 'Strings its webs between the giant trees at head height. Ned Thackery carries a stick in front of him, and you\'ll see why.',
  thornray: 'Lies flat in the sand of the shallows with its barbed tail up. Tread on one and you\'ll limp for a month.',
  // The Fleet Coast
  crab: 'Grows to the size of a cart wheel on the Fleet strand, and fights for its rock like a cottager for his garden.',
  brinejelly: 'Drifts in on the tide and lies in the pools when it goes out. Glows faintly at night, and the fishwives say it\'s counting.',
  cavebat: 'Roosts in the sea caves by the thousand and comes out at dusk in a cloud you can hear from the cliff path.',
  lionsmane: 'A jelly as wide as a boat, with a mane of stinging hair three fathoms long. The Gullmouth boats give it the sea.',
  // The Raddle Barrens
  dustwolf: 'Runs in big packs over the Barrens, the colour of the dust, and you see the cloud before the wolves. They hate the smelter smoke.',
  redback: 'A rustback grown big on the iron in the old cuts. Nests on old rail, which is why the company\'s spikes keep going missing. Partly why.',
  redadder: 'The colour of the Raddle and as short-tempered. Basks on the slag, where it\'s warmest, and doesn\'t move for anybody.',
  slagcairn: 'One of the old cairns that gets up and walks, made of slag instead of stone. Nobody knows who raised the first ones. Nobody knows who raised these.',
  porbeagle: 'A mackerel shark that comes in with the shoals. Gullmouth men say it\'s the cleverest fish in the sea, and it bites like it knows it.',
  // The Scarth Highlands
  frostwolf: 'White in winter and grey in summer, and always hungry on the plateau. Hale\'s Fold keeps its fire high for them.',
  shardjelly: 'Grows round a splinter of star crystal it swallowed, and glows with it. They came up out of the crack at the Glass Kirk the day the floor lifted.',
  whitebear: 'Walks the high snow alone and fishes the tarns through the ice. It fears nothing but the storm glass at Scarth Watch, which is to say nothing.',
  rimecairn: 'An old cairn under a crust of ice, with the mark nobody can read lit blue inside the stones. The Kelderby shepherds walk round them.',
  blueshark: 'Follows the deep water up the Scarth coast in summer, long and slow and curious. It will circle a boat for an hour.',
  // The Gannet Cliffs
  clifffox: 'Thieves of the egg ledges, red as rust and quick as gossip. Cragsby keeps a ring of stones round the egg store and the foxes go over it.',
  cragboar: 'A small black boar that lives on the cliff tops among the thrift, and charges climbers on their way back up the rope.',
  cliffbat: 'Hunts moths along the cliff face at dusk, so close to the rock that the climmers feel the wind of it.',
  // The Wrath Levels
  fenjelly: 'Lives in the drains and the dykes of the Levels, and lately in Harrowgate\'s new drain, which it seems to like.',
  bogboar: 'Wallows in the reed beds, and grows a coat of mud that dries like armour. The eel-catchers hear it grunting at night.',
  fenadder: 'Swims better than it walks, and suns itself on the staithe posts. The punts go round it.',
  raftspider: 'Sits on the open water on its long legs and runs across it to take fish. Tilly Brewer says they watch the reed-cutters work.',
  // Tolmen Moor
  moorwolf: 'Big, grey and silent, and hunts the moor in threes. The tinners light peat at the mine heads to keep them back.',
  graniteback: 'A moor beetle with a shell like a split boulder, studded with crystal from the ground it eats. It charges whatever moves.',
  torcairn: 'The moor\'s own walking cairn, granite and lichen. The Tolmen shepherds leave them be and walk round. So should you.',
  // Inkholm
  greyed: 'What the Grey leaves of a person: they keep their clothes, their habits and the way home, and nothing else.',
  puffball: 'A fungus the size of a sheep that bursts when it\'s struck. The spores are the Grey. Breathe out, not in.',
  greyhog: 'The island\'s pigs, gone grey with the rest. They still root where the orchards were.',
  gillcrab: 'A shore crab with grey gills growing out of its shell. It moves wrongly, as if it has to think about it.',
  greyweaver: 'A spider whose web is grey thread, damp and soft, that sticks like regret.',
  // Kell
  cinderhound: 'The Kilnfolk breed them to guard the vents, and some went wild. They run hot: snow melts where they lie.',
  ashcrawler: 'Burrows through the warm ash on the volcano\'s flanks and comes up under whatever\'s walking on it.',
  brassmite: 'Clockwork, the size of a dog, wound by nobody anyone has met. It mends itself from the brass it finds.',
  ventjelly: 'Lives in the steam vents and throws scalding water. The Kilnfolk cook eggs in the vents it leaves.',
  ashbat: 'Roosts in the warm cracks of the volcano and comes out grey with ash, like smoke with teeth.',
  // The Sickle
  icewolf: 'The Sickle\'s wolves, white the year round, and bigger than anything on the mainland. They hunt across the frozen bay.',
  rimewight: 'Something that walked out onto the ice and didn\'t come back as itself. It sheds snow as it moves.',
  icebear: 'Hunts seals at the edge of Sickle Water, and people, when there are no seals.',
  fellcairn: 'The biggest of the walking cairns, on the Sickle\'s north fells, with ice in every crack and the old mark lit white.',
  // The Keys
  mangrovecrab: 'Climbs the mangrove roots and drops on what passes. The turtle-watchers wear hats with wide brims.',
  keylizard: 'Basks on the reef stones and swims between keys. It hisses like a kettle before it bites.',
  reefjelly: 'Lives in the reef pools, coloured like the coral, so you see it after it stings you.',
  keywrecker: 'Lights false lamps on the reefs to bring boats in, and picks over what comes ashore. The Keys have a short way with them.',
  mangrovesnake: 'Hangs in the mangroves at head height, green on green. The Brethren keep a cat aboard for them.',
  // The Glades
  gladelizard: 'Waits under Reedwater\'s walks for whatever falls. The reeve pays for them by the tail.',
  glim: 'The lights in the creeks at night. Pretty from the walks. Less pretty up close, when they throw.',
  marshmoth: 'Pale green and the size of a dog, it follows lamps over the sawgrass. Its dust glows faintly.',
  gladespider: 'Builds its web across the creeks at water level to catch moths coming down to drink.',
  // The Amberwold
  lampmoth: 'Comes to every light in the wold. Its dust glows for a week, and Branchley paints its doorposts with it before the long nights.',
  amberlynx: 'Tawny, tufted and silent in the wold\'s gold leaves. It watches from the branches a long time before it comes down.',
  leafback: 'A boar that rolls in the fallen leaves till they mat into its coat. In autumn you can\'t see it until it moves.',
  amberbear: 'Eats acorns all autumn and sleeps under the great trees. Mags Briar leaves it the burnt loaves.',
  // The Bright Coast
  terracejackal: 'Runs the terrace walls above Callis in packs and steals from the vineyards. The Assembly pays a bounty in olives.',
  quarrybeetle: 'Lives in the white stone quarries and eats the stone. The quarrymen follow its tunnels to the good seams.',
  blackrunner: 'A Brethren thief, quick, in black, who runs the coast road from Cala Roja to the quarries. Never alone.',
  quarrybat: 'Roosts in the worked-out galleries of the white quarries and comes out chalk-white.',
  // The Sunder
  slabcrawler: 'Clings to the undersides of the hanging slabs and climbs up their ropes. The skyfarmers check their ropes every morning.',
  liftmoth: 'Rides the warm air up out of the Sunder. Its dust is light enough to make a feather rise.',
  riftwolf: 'Hunts along the rim of the Sunder and drives its prey over the edge. It doesn\'t go down after it.',
  riftcairn: 'A walking cairn of white stone at the Sunder\'s edge. The skyfarmers say they hold the slabs down, and leave them be.',
  // The Glass Flats
  basilisk: 'Lies in the glare with its eyes half shut, and spits black glass. The caravans cross its ground at night.',
  glassback: 'A beetle with a shell of black glass, fused by the lightning that strikes the Flats. It charges at the flash.',
  saltreaver: 'Waits for the lightning to pass and comes out of the glare. Owns its own wells a day north, and charges a mark a skin.',
  flatsdrake: 'One of the wild drakes round the Mother\'s Bed. The storm-hunters say they\'re the Glassmother\'s brood. The caravan folk don\'t argue.',
  // The Greywaste and the Held
  wastehound: 'Gaunt grey dogs of the Waste, that follow the risen at a distance and eat what they leave.',
  risen: 'The old dead of the Waste, up out of the barrows with their grave iron still on them, walking the old roads as if they had somewhere to be.',
  fendamp: 'A cold mist that thickens into something with weight. The Waste\'s marshes are full of them in the mornings.',
  barrowspider: 'Lives in the barrow passages among the bones and weaves across the doors.',
  barrowwight: 'An old king\'s guard, still keeping the door it was buried to keep. It doesn\'t follow you past the threshold.',
  felltroll: 'Lives under the Held\'s fells and comes out in the dark. Stone-grey, slow, and it doesn\'t stop.',
  cavebear: 'Sleeps in the Held\'s caves all winter and wakes hungry. The fell folk mark the caves with a red hand.',
};

/** Every creature of the wilds, with the regions it's found in (from the spawn tables), in the order the journal lists them. */
export function bestiaryRoster(): { type: EnemyType; regions: RegionId[] }[] {
  const by = new Map<EnemyType, RegionId[]>();
  for (const [r, t] of Object.entries(REGION_SPAWNS) as [RegionId, { enemies: EnemyType[]; sea: EnemyType[] }][]) {
    for (const ty of [...t.enemies, ...t.sea]) {
      if (!ENEMIES[ty]) continue;
      const list = by.get(ty) ?? [];
      if (!list.includes(r)) list.push(r);
      by.set(ty, list);
    }
  }
  return [...by.entries()].map(([type, regions]) => ({ type, regions })).sort((a, b) => ENEMIES[a.type].level - ENEMIES[b.type].level);
}
