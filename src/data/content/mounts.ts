import type { GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';

// Mounts of the far places (entities/creatures.ts buildBeast): what each country rides, in Everrealm's
// own terms. The Kilnfolk breed great cats on the Kiln's warm slopes and build clockwork striders in the
// Works; the Held's herders ride sabre-toothed fell cats; the caravans of the Glass Flats ride drakes
// that walk; the Keys ride their turtles; the Sunder's skyfarmers keep slabbacks, oxen plated with the
// stone they graze; the Assembly keeps griffins in the eyries of its towers; and grave-wyrms sleep under
// Kingsbarrow. Stags come from the woods on both continents. Every mount keeps the same pace: what
// you earn is the look, and the story of where it came from.
//
// Earned by standing (sold once a region trusts you), by the stories (sold once they're done), and as
// rare finds from the creatures and bosses of their country. Sellers and drops are listed in each item.

const rep = (g: GameApi, r: string, n: number) => Number(g.flag('rep:' + r) ?? 0) >= n;
const HONOURED = 1200, REVERED = 2400;

type M = { id: string; name: string; breed: NonNullable<NonNullable<ItemDef['mount']>['breed']>; coat: string; mane: string; cloth: string; glow?: boolean; rarity: ItemDef['rarity']; desc: string; from: string };
const LIST: M[] = [
  // The Kiln's great cats
  { id: 'mount_kilncat_ember', name: 'Ember kilncat', breed: 'cat', coat: '#c86a24', mane: '#ff7a30', cloth: '#2a1e18', glow: true, rarity: 'epic', desc: 'The Kilnfolk breed them on the warm slopes, where they lie on the vent plates all day. The stripes stay warm long after dark.', from: 'Agnes Lusty, Brasswick, once Kell holds you in honour' },
  { id: 'mount_kilncat_ash', name: 'Ash kilncat', breed: 'cat', coat: '#6a6a68', mane: '#2a2a2a', cloth: '#7a2a22', rarity: 'epic', desc: 'Grey as the ash on the Kiln\'s high slope, and as quiet. The Escapement\'s wardens kept one to catch the brass mites.', from: 'The Mainspring, under the Kiln, now and then' },
  { id: 'mount_kilncat_brass', name: 'Brass kilncat', breed: 'cat', coat: '#c8a050', mane: '#5a4018', cloth: '#3e8a74', rarity: 'legendary', desc: 'A wild one, gold from nose to tail, off the far side of the Kiln where nobody goes. It came to the fire and stayed.', from: 'Cinderhounds on Kell, very rarely' },
  // The Held's fell sabres
  { id: 'mount_sabre_snow', name: 'Snow sabre', breed: 'sabre', coat: '#e8ecf0', mane: '#8a9aa8', cloth: '#2a3038', rarity: 'epic', desc: 'The Held\'s herders ride them over drifts a horse would drown in. The teeth are for the wolves. Mostly.', from: 'Maud Hale, Northgate, once the postern is yours' },
  { id: 'mount_sabre_glacier', name: 'Glacier sabre', breed: 'sabre', coat: '#9fc8e8', mane: '#3a6a9a', cloth: '#e8ecf0', rarity: 'epic', desc: 'Blue-white, from the ice above Kingsbarrow. Northgate keeps a few in the barracks and lends them to people it trusts with its walls.', from: 'Maud Hale, Northgate, once the Held Country reveres you' },
  { id: 'mount_sabre_barrow', name: 'Barrow sabre', breed: 'sabre', coat: '#3a3a44', mane: '#9fe8ff', cloth: '#22222a', glow: true, rarity: 'legendary', desc: 'One of the old king\'s hunting cats, laid in the barrow with him. Its eyes are the colour of the cold under the black.', from: 'The Old King, under Kingsbarrow, now and then' },
  // The Flats' drakes
  { id: 'mount_drake_sun', name: 'Sun drake', breed: 'drake', coat: '#c89030', mane: '#f0d060', cloth: '#a8382c', rarity: 'epic', desc: 'The caravans ride them over the glass: they don\'t mind the heat, they don\'t mind the salt, and they eat reavers if you let them.', from: 'Cass Moran, Tenwells, once the caravans run again' },
  { id: 'mount_drake_storm', name: 'Storm drake', breed: 'drake', coat: '#3a5a8a', mane: '#9fd8ff', cloth: '#d8c8a0', glow: true, rarity: 'epic', desc: 'Hatched under a lightning storm, the storm-hunters say, and it never forgot. The ridge along its back fizzes in the rain.', from: 'Cass Moran, Tenwells, once the Glass Flats revere you' },
  { id: 'mount_drake_glass', name: 'Black-glass drake', breed: 'drake', coat: '#18181e', mane: '#6a5a8a', cloth: '#c8c8c0', rarity: 'legendary', desc: 'Its scales are the black glass the lightning makes, or near enough that nobody can tell. Sharp to sit on without the saddle.', from: 'Glass basilisks, very rarely' },
  // The Keys' turtles
  { id: 'mount_turtle_reef', name: 'Reef turtle', breed: 'turtle', coat: '#6a4a2a', mane: '#7aa86a', cloth: '#2a6a7a', rarity: 'rare', desc: 'One of Sal Mudge\'s hatchlings, from a clutch forty years ago, grown. It remembers her. It doesn\'t hurry for anyone else.', from: 'Sal Mudge, Conch Key, once the hatchlings are safe' },
  { id: 'mount_turtle_green', name: 'Green key turtle', breed: 'turtle', coat: '#3a5a2a', mane: '#a8c878', cloth: '#e0d4b0', rarity: 'epic', desc: 'The Brethren carry them on long voyages for luck, and let them off on whatever beach they ask for.', from: 'Sal Mudge, Conch Key, once the Brethren revere you' },
  { id: 'mount_turtle_old', name: 'Old Shell', breed: 'turtle', coat: '#4a4a42', mane: '#8a8a7a', cloth: '#7a2a22', rarity: 'legendary', desc: 'Barnacled, slow, and older than Saltpenny. Every captain on the Keys claims to have ridden it as a child.', from: 'Mangrove crabs, very rarely: it walks with them' },
  // The Sunder's slabbacks
  { id: 'mount_slabback_stone', name: 'Stone slabback', breed: 'slabback', coat: '#6a6258', mane: '#9a9488', cloth: '#5a6a3a', rarity: 'epic', desc: 'The skyfarmers plough with them and ride them over the bridges. They don\'t look down. They don\'t have to.', from: 'Pol Vidal, Liftwick, once the plumb marks are read' },
  { id: 'mount_slabback_white', name: 'White slabback', breed: 'slabback', coat: '#7a7468', mane: '#cfe8f0', cloth: '#2f4a7a', glow: true, rarity: 'epic', desc: 'Grazed on the hanging slabs, where the white comes through the turf. The plates on its back glow faintly and weigh nothing.', from: 'Pol Vidal, Liftwick, once the Sunder reveres you' },
  { id: 'mount_slabback_moss', name: 'Moss slabback', breed: 'slabback', coat: '#5a5040', mane: '#5a7a3a', cloth: '#3a3430', rarity: 'legendary', desc: 'A wild one from the rift floor, grown over with moss and fern, that followed a skyfarmer home and wouldn\'t leave.', from: 'Slab-crawlers in the Sunder, very rarely' },
  // The Kilnfolk's striders
  { id: 'mount_strider_brass', name: 'Brass strider', breed: 'strider', coat: '#c8a050', mane: '#3a2a1e', cloth: '#3e8a74', rarity: 'epic', desc: 'The Kilnfolk\'s answer to the horse: it doesn\'t eat, it doesn\'t tire, and it ticks. Gerens Tonkin winds it each morning.', from: 'Gerens Tonkin, Brasswick, once the Escapement runs slow' },
  { id: 'mount_strider_copper', name: 'Copper strider', breed: 'strider', coat: '#b87348', mane: '#2e5a4e', cloth: '#d8b050', rarity: 'epic', desc: 'Copper-plated and gone green at the joints. The Wheel gave one to each of its keepers. Now it gives them to friends.', from: 'Gerens Tonkin, Brasswick, once Kell reveres you' },
  { id: 'mount_strider_iron', name: 'Black-iron strider', breed: 'strider', coat: '#3a3a40', mane: '#1e1e22', cloth: '#a8382c', rarity: 'legendary', desc: 'One of the Escapement\'s own, the kind that walked the galleries before anyone alive was born. Somebody refitted it with a saddle.', from: 'The Governor, under the Kiln, now and then' },
  // The Assembly's griffins
  { id: 'mount_griffin_white', name: 'Tower griffin', breed: 'griffin', coat: '#c8a878', mane: '#f4f2ec', cloth: '#2f4a7a', rarity: 'legendary', desc: 'The Assembly keeps griffins in the eyries at the tops of its towers, and lends one, now and then, to someone it owes.', from: 'Benet Sala, Speaker of the Assembly, after the Third Daughter' },
  { id: 'mount_griffin_crimson', name: 'Crimson griffin', breed: 'griffin', coat: '#8a3a2a', mane: '#e8d0b0', cloth: '#d8b050', rarity: 'epic', desc: 'Bred in the Old Tower\'s eyrie. Marta Vidal measures them too: wingspan, weight, and how far they lean when the tower does.', from: 'Marta Vidal, Callis, once the Bright Coast reveres you' },
  { id: 'mount_griffin_black', name: 'Black griffin', breed: 'griffin', coat: '#2a2a30', mane: '#4a4a58', cloth: '#9fe8ff', rarity: 'legendary', desc: 'The old kingdom kept griffins too, and buried them with their riders. This one was the Barrow-warden\'s.', from: 'The Barrow-warden, under Kingsbarrow, now and then' },
  // Kingsbarrow's grave-wyrms
  { id: 'mount_wyrm_bone', name: 'Bone wyrm', breed: 'wyrm', coat: '#d8d0c0', mane: '#5a5050', cloth: '#22222a', rarity: 'legendary', desc: 'It slept curled round the old king\'s bier for three hundred years and woke when he did. It lies still when he does, and goes where you go.', from: 'The Old King, under Kingsbarrow, rarely' },
  { id: 'mount_wyrm_gold', name: 'Gilded wyrm', breed: 'wyrm', coat: '#3a3428', mane: '#d8b050', cloth: '#2a2a40', glow: true, rarity: 'legendary', desc: 'Its scales were gilded for the old king\'s burial, every one, by people who expected it to stay buried.', from: 'The Old King, under Kingsbarrow, very rarely' },
  // Stags of the woods
  { id: 'mount_stag_moss', name: 'Mossback stag', breed: 'elk', coat: '#5a5a3a', mane: '#4a6a2a', cloth: '#3a5a2a', rarity: 'legendary', desc: 'The fellers in Hagworm Wood say it\'s older than the wood, and that the moss on its antlers is the wood starting again.', from: 'Thornback stalkers in Hagworm Wood, very rarely' },
  { id: 'mount_stag_autumn', name: 'Wold stag', breed: 'elk', coat: '#8a4a1e', mane: '#c8782a', cloth: '#5a3a1e', rarity: 'epic', desc: 'Red as the Amberwold in the long autumn that never quite ends. Ivo Larch hangs a moth-dust lamp from its antlers.', from: 'Ivo Larch, Branchley, once the doorposts are painted' },
  { id: 'mount_stag_rime', name: 'Rime stag', breed: 'elk', coat: '#d8e0e8', mane: '#8aa8c8', cloth: '#2a3a4a', rarity: 'legendary', desc: 'White over grey, frost in its coat even in summer. Kelderby\'s shepherds count it a good winter when they see it.', from: 'Frost wolves in the Scarth Highlands, very rarely' },
];

const items: ItemDef[] = LIST.map((m) => ({
  id: m.id, name: m.name, kind: 'collectible', rarity: m.rarity, stack: false, value: 0,
  icon: { shape: 'shoe', a: m.coat, b: m.cloth },
  mount: { coat: m.coat, mane: m.mane, cloth: m.cloth, glow: m.glow, breed: m.breed },
  desc: m.desc, stats: `From: ${m.from}. Use it, or press G, to ride. Every mount keeps the same pace.`,
}));

/** The far towns' mount sellers, besides those whose shops are elsewhere (data/content/kell.ts, morrowTowns.ts). */
const mountShop = (owner: string, name: string, stock: ShopDef['stock'], who: string): ShopDef => ({ id: owner, name, owner, stock, buyRate: () => 0.5, footer: () => `${who} pays half of an item's worth` });

export const MOUNT_CONTENT: RegionContent = {
  id: 'mounts',
  items,
  shops: {
    cass_moran: mountShop('cass_moran', 'Tenwells drake pens', [
      { item: 'mount_drake_sun', price: 14000, when: (g) => g.stage('tenReavers') === 'done' },
      { item: 'mount_drake_storm', price: 19000, when: (g) => rep(g, 'glassflats', REVERED) },
      { item: 'caravan_dates', price: 46 },
    ], 'Cass'),
    pol_vidal: mountShop('pol_vidal', 'Liftwick slabbacks', [
      { item: 'mount_slabback_stone', price: 12000, when: (g) => g.stage('liftSlabs') === 'done' },
      { item: 'mount_slabback_white', price: 16000, when: (g) => rep(g, 'sunder', REVERED) },
      { item: 'sky_honey', price: 60 },
    ], 'Pol'),
    maud_hale: mountShop('maud_hale', 'Northgate barracks stable', [
      { item: 'mount_sabre_snow', price: 15000, when: (g) => g.stage('tdHeld') === 'done' },
      { item: 'mount_sabre_glacier', price: 20000, when: (g) => rep(g, 'held', REVERED) },
    ], 'Maud'),
    ivo_larch: mountShop('ivo_larch', 'Ivo Larch\'s stags', [
      { item: 'mount_stag_autumn', price: 10000, when: (g) => g.stage('woldLamps') === 'done' },
      { item: 'moth_dust', price: 30 },
    ], 'Ivo'),
    marta_vidal: mountShop('marta_vidal', 'The Old Tower eyrie', [
      { item: 'mount_griffin_crimson', price: 16000, when: (g) => rep(g, 'bright', REVERED) },
    ], 'Marta'),
  },
};

/** Stock the Kell and Conch Key sellers add (their shops are in kell.ts and morrowTowns.ts). */
export const KELL_MOUNT_STOCK = {
  agnes: [{ item: 'mount_kilncat_ember', price: 9000, when: (g: GameApi) => rep(g, 'kell', HONOURED) }],
  gerens: [{ item: 'mount_strider_brass', price: 11000, when: (g: GameApi) => g.stage('kellEscapement') === 'done' }, { item: 'mount_strider_copper', price: 15000, when: (g: GameApi) => rep(g, 'kell', REVERED) }],
  sal: [{ item: 'mount_turtle_reef', price: 8000, when: (g: GameApi) => g.stage('conchCrabs') === 'done' }, { item: 'mount_turtle_green', price: 12500, when: (g: GameApi) => rep(g, 'keys', REVERED) }],
};
/** Where the rare ones turn up: [creature, mount, chance]. */
export const MOUNT_DROPS: [string, string, number][] = [
  ['dg_mainspring', 'mount_kilncat_ash', 0.03], ['cinderhound', 'mount_kilncat_brass', 0.002],
  ['dg_oldking', 'mount_sabre_barrow', 0.03], ['dg_oldking', 'mount_wyrm_bone', 0.02], ['dg_oldking', 'mount_wyrm_gold', 0.008],
  ['basilisk', 'mount_drake_glass', 0.003], ['mangrovecrab', 'mount_turtle_old', 0.002], ['slabcrawler', 'mount_slabback_moss', 0.003],
  ['dg_governor', 'mount_strider_iron', 0.03], ['dg_barrowwarden', 'mount_griffin_black', 0.02],
  ['thornwolf', 'mount_stag_moss', 0.002], ['frostwolf', 'mount_stag_rime', 0.002],
];
