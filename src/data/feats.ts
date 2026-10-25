import { WAKE_COSTUMES } from './costumes';
import { EVENTS, TASKS, WORLD_BOSSES } from './activities';
import { ITEMS } from './items';
import { RANKS, REVERED_TITLE } from './standing';
import { FACTIONS } from './factions';
import { REGION_INFO, type RegionId } from '../world/terrain';
import { bestiaryRoster } from './bestiary';
import { TILES } from './cards';
import { MORROW_REGIONS } from '../world/morrowLocal';

// Feats: long goals for exploring and joining in, kept in the journal. Each one pays out marks
// once and gives a title to wear under your name. Nothing here makes a character stronger.

export interface FeatApi {
  flag(key: string): unknown;
  /** How many flags start with this prefix. */
  countFlags(prefix: string): number;
  /** Explored map chunks. */
  explored: number;
  owns(item: string): boolean;
  /** Total level across all skills. */
  totalLevel: number;
  /** Quests finished, side stories and story chapters alike. */
  questsDone: number;
}

export interface FeatDef {
  id: string;
  name: string;
  group: 'Exploration' | 'The open world' | 'Stable' | 'Craft and trade' | 'Factions' | 'Collections';
  desc: string;
  need: number;
  have(g: FeatApi): number;
  marks: number;
  title: string;
}

const HALTERS = Object.values(ITEMS).filter((d) => d.mount).map((d) => d.id);

/** Creatures of the wilds by which half of the world they live in, for the bestiary's feats. */
const MORROW_SET = new Set<string>(MORROW_REGIONS);
const BEASTS = bestiaryRoster();
const COUNTY_BEASTS = BEASTS.filter((b) => b.regions.some((r) => !MORROW_SET.has(r))).map((b) => b.type);
const MORROW_BEASTS = BEASTS.filter((b) => b.regions.every((r) => MORROW_SET.has(r))).map((b) => b.type);
const killedOf = (g: FeatApi, t: string) => Number(g.flag('killed:' + t) ?? 0);

export const FEATS: FeatDef[] = [
  { id: 'vistas', name: 'Eyes on the Horizon', group: 'Exploration', desc: 'Stand at every vista: the headlands, the summits and the passes.', need: 8, have: (g) => g.countFlags('vista:'), marks: 80, title: 'Horizon-Walker' },
  { id: 'rares', name: 'Rare Hunter', group: 'The open world', desc: 'Kill five different rares: the named creatures that turn up at the landmarks.', need: 5, have: (g) => g.countFlags('rareKill:'), marks: 120, title: 'the Tracker' },
  { id: 'treasure', name: 'X Marks It', group: 'Exploration', desc: 'Dig up the treasure from six different maps.', need: 6, have: (g) => g.countFlags('dug:'), marks: 100, title: 'the Digger' },
  { id: 'wonders', name: 'Stumbled Upon', group: 'Exploration', desc: 'Find the six wonders: the Weeping Stair, the Kelpie Arch, the Stone King, the Drowned Bell-tower, the Kingfisher Steps and the Kettle.', need: 6, have: (g) => g.countFlags('found:sc-'), marks: 100, title: 'the Wide-Eyed' },
  { id: 'books', name: 'Well Read', group: 'Exploration', desc: 'Find and read twenty of the books people left across the counties. Your library is in the journal.', need: 20, have: (g) => g.countFlags('book:'), marks: 100, title: 'the Well-Read' },
  { id: 'pets', name: 'Friend to Every Dog', group: 'The open world', desc: 'Pet or stroke fifteen of the dogs and cats about the towns. They\'re about every Charter Post sign.', need: 15, have: (g) => g.countFlags('pet:'), marks: 40, title: 'Dog\'s Best Friend' },
  { id: 'inkholm', name: 'Burn It Again', group: 'Exploration', desc: 'Cross to Inkholm, relight the five reek-fires, and burn the Old Bed under Corra Fell.', need: 1, have: (g) => (g.owns('reek_sprig') ? 1 : 0), marks: 120, title: 'Reeker' },
  // The festivals (data/seasons.ts, content/seasons.ts): these take a year of fairs
  { id: 'festRound', name: 'Doorstep to Doorstep', group: 'The open world', desc: 'Make a hundred calls on the festival rounds: the doors, fires and griddles round every Post while a fair is on.', need: 100, have: (g) => Number(g.flag('sroundTotal') ?? 0), marks: 100, title: 'Guiser' },
  { id: 'festBosses', name: 'Every Fair in the Year', group: 'The open world', desc: 'Bring down all seven festival creatures, from Jack-a-Lent at Shrovetide to Old Rime at the Frostfair.', need: 7, have: (g) => g.countFlags('sbossKills:'), marks: 150, title: 'Lord of Misrule' },
  { id: 'festStories', name: 'Seven Fairs', group: 'The open world', desc: 'Help the seven people who come to Hollin Ford square for the seven fairs.', need: 7, have: (g) => g.countFlags('story:'), marks: 150, title: 'Of the Seven Fairs' },
  { id: 'wakeCostumes', name: 'Guiser', group: 'The open world', desc: 'Put all six Lantern Wake costumes in your wardrobe.', need: 6, have: (g) => WAKE_COSTUMES.filter((id) => g.flag('costume:' + id)).length, marks: 60, title: 'Guiser' },
  { id: 'festHats', name: 'A Hat for Every Fair', group: 'The open world', desc: 'Put all seven festival hats in your wardrobe.', need: 7, have: (g) => g.countFlags('hat:'), marks: 80, title: 'Well Turned Out' },
  { id: 'forts', name: 'Tally-Burner', group: 'The open world', desc: 'Clear all seven bandit forts in the counties, chief and all. Every troubled region has one, well off the road.', need: 7, have: (g) => g.countFlags('fort:'), marks: 150, title: 'the Tally-Burner' },
  { id: 'chests', name: 'Light Fingers', group: 'Exploration', desc: 'Pick the locks of twenty-five hidden chests. They\'re tucked by ruins and stones, and out in the wilds.', need: 25, have: (g) => Number(g.flag('chestsOpened') ?? 0), marks: 100, title: 'the Locksmith' },
  { id: 'delves', name: 'Lamp and Rope', group: 'Exploration', desc: 'Open the chest at the bottom of all six delves.', need: 6, have: (g) => g.countFlags('chest:delve-'), marks: 90, title: 'Delver' },
  { id: 'oldman', name: 'Older Than the Pit', group: 'Exploration', desc: 'Clear the Old Man\'s Workings, the group dungeon under Sallow Pit, with a group or with henchmen.', need: 1, have: (g) => Math.min(1, Number(g.flag('gdClears:gd-oldman') ?? 0)), marks: 60, title: 'of Number Four' },
  { id: 'kettle', name: 'What the Shepherds Saw', group: 'Exploration', desc: 'Clear Under the Kettle, the group dungeon in Scarth, with a group or with henchmen.', need: 1, have: (g) => Math.min(1, Number(g.flag('gdClears:gd-kettle') ?? 0)), marks: 120, title: 'of the Fold' },
  { id: 'dungeons', name: 'The Deep Halls', group: 'Exploration', desc: 'Open the chest in Mortlake Cellars and in the Black Cut.', need: 2, have: (g) => g.countFlags('chest:pd-'), marks: 90, title: 'of the Deep Halls' },
  { id: 'waymarks', name: 'Every Stone Woken', group: 'Exploration', desc: 'Attune every waymark in the counties.', need: 20, have: (g) => g.countFlags('wm-'), marks: 120, title: 'Waymarker' },
  { id: 'chart', name: 'Ink to the Edges', group: 'Exploration', desc: 'Explore enough of the continent to fill in 1,600 squares of the map.', need: 1600, have: (g) => g.explored, marks: 120, title: 'Mapmaker' },
  { id: 'events1', name: 'Answered the Bell', group: 'The open world', desc: 'See a world event through to the end.', need: 1, have: (g) => g.countFlags('ev:'), marks: 20, title: 'Neighbourly' },
  { id: 'events', name: 'Known in Every Parish', group: 'The open world', desc: 'See every world event through at least once.', need: EVENTS.length, have: (g) => g.countFlags('ev:'), marks: 150, title: 'Friend of the Counties' },
  { id: 'gold', name: 'First Over the Wall', group: 'The open world', desc: 'Win gold in six different world events.', need: 6, have: (g) => EVENTS.filter((e) => g.flag('ev:' + e.id) === 'Gold').length, marks: 120, title: 'Gilded' },
  { id: 'bosses', name: 'The Terrors Laid Low', group: 'The open world', desc: 'Help bring down every world boss, the Glassmother among them.', need: WORLD_BOSSES.length, have: (g) => g.countFlags('killed:'), marks: 200, title: 'Terror-Breaker' },
  { id: 'saddle', name: 'Born in the Saddle', group: 'The open world', desc: 'Ride a hundred and twenty kilometres, and reach the top rank of horsemanship.', need: 120000, have: (g) => Math.floor(Number(g.flag('rideDist') ?? 0)), marks: 150, title: 'Horse-Master' },
  { id: 'raiders', name: 'Prize Money', group: 'The open world', desc: 'Sink ten Brethren raiders or revenue cutters in a ship of your own or a hired one.', need: 10, have: (g) => Number(g.flag('raidersSunk') ?? 0), marks: 200, title: 'Privateer' },
  { id: 'freewater', name: 'Freewater Captain', group: 'The open world', desc: 'Sink another captain\'s ship in the Freewater.', need: 1, have: (g) => Number(g.flag('captainsSunk') ?? 0), marks: 150, title: 'Captain of the Freewater' },
  { id: 'rock', name: 'Off the Rock', group: 'The open world', desc: 'Go out through the vent behind your bunk on Skua Rock, and live.', need: 1, have: (g) => Number(g.flag('rockEscapes') ?? 0), marks: 0, title: 'The One Who Got Away' },
  { id: 'shards', name: 'Sealer of Stars', group: 'The open world', desc: 'Seal five Shardfalls.', need: 5, have: (g) => Number(g.flag('shardsSealed') ?? 0), marks: 120, title: 'Star-Sealer' },
  { id: 'tasks5', name: 'A Good Neighbour', group: 'The open world', desc: 'Finish five parish tasks.', need: 5, have: (g) => g.countFlags('task:'), marks: 60, title: 'Good Neighbour' },
  { id: 'tasks', name: 'Every Parish Helped', group: 'The open world', desc: 'Finish every parish task in the counties.', need: TASKS.length, have: (g) => g.countFlags('task:'), marks: 200, title: 'Friend of the Parishes' },
  { id: 'horse', name: 'Up in the Saddle', group: 'Stable', desc: 'Buy a halter and ride.', need: 1, have: (g) => HALTERS.filter((h) => g.owns(h)).length, marks: 10, title: 'Rider' },
  { id: 'stable', name: 'The Whole Stable', group: 'Stable', desc: 'Own every horse in the counties, the Cinder-shod mare included.', need: HALTERS.length, have: (g) => HALTERS.filter((h) => g.owns(h)).length, marks: 150, title: 'Horse-Lord' },
  // Collections: the bestiary filled in, the week's commissions, people helped
  { id: 'beastsWell', name: 'Known Well', group: 'Collections', desc: 'Kill fifty of twenty different creatures, and have the hunters\' word on each in your bestiary.', need: 20, have: (g) => BEASTS.filter((b) => killedOf(g, b.type) >= 50).length, marks: 150, title: 'the Naturalist' },
  { id: 'beastsCounties', name: 'Every Creature of the Counties', group: 'Collections', desc: 'Meet every creature of the Charter Counties and the isles, by land and sea, in your bestiary.', need: COUNTY_BEASTS.length, have: (g) => COUNTY_BEASTS.filter((t) => killedOf(g, t) > 0).length, marks: 200, title: 'the Countryman' },
  { id: 'beastsMorrow', name: 'Every Creature of Morrow', group: 'Collections', desc: 'Meet every creature of Morrow in your bestiary, from the Keys to the Held.', need: MORROW_BEASTS.length, have: (g) => MORROW_BEASTS.filter((t) => killedOf(g, t) > 0).length, marks: 250, title: 'Far-Travelled' },
  { id: 'commissions', name: 'On the Charter\'s Books', group: 'Collections', desc: 'Finish all three of the week\'s commissions, five weeks over.', need: 5, have: (g) => Number(g.flag('weeklyBundles') ?? 0), marks: 200, title: 'Charter Hand' },
  { id: 'tiles20', name: 'A Fair Hand', group: 'Collections', desc: 'Hold twenty different Quarters tiles.', need: 20, have: (g) => Object.keys((g.flag('qTiles') as Record<string, number> | undefined) ?? {}).length, marks: 120, title: 'Table-Wise' },
  { id: 'tilesAll', name: 'A Full Box', group: 'Collections', desc: 'Hold every Quarters tile there is, the great ones too.', need: TILES.length, have: (g) => TILES.filter((t) => ((g.flag('qTiles') as Record<string, number> | undefined) ?? {})[t.id]).length, marks: 400, title: 'Card Sharp' },
  { id: 'quests25', name: 'Errands and Favours', group: 'Collections', desc: 'Finish twenty-five quests.', need: 25, have: (g) => g.questsDone, marks: 100, title: 'the Obliging' },
  { id: 'quests100', name: 'Known Everywhere', group: 'Collections', desc: 'Finish a hundred quests.', need: 100, have: (g) => g.questsDone, marks: 300, title: 'Known Everywhere' },
  { id: 'level', name: 'Turned Your Hand', group: 'Craft and trade', desc: 'Reach a total level of 100 across your skills.', need: 100, have: (g) => g.totalLevel, marks: 100, title: 'Journeyman' },
  { id: 'level2', name: 'Master of None', group: 'Craft and trade', desc: 'Reach a total level of 250 across your skills.', need: 250, have: (g) => g.totalLevel, marks: 250, title: 'Many-Handed' },
  // Standing (data/standing.ts): the last rank in a region gives its title
  // Factions (data/factions.ts): the last rank gives its title
  ...FACTIONS.filter((f) => f.open).map((f): FeatDef => ({ id: 'fac_' + f.id, name: f.ranks[f.ranks.length - 1], group: 'Factions', desc: `Rise to ${f.ranks[f.ranks.length - 1]} in ${f.name}, through its whole storyline.`, need: f.ranks.length, have: (g) => { const r = g.flag('fac:' + f.id); return typeof r === 'number' ? r + 1 : 0; }, marks: 150, title: f.title })),
  ...(Object.keys(REVERED_TITLE) as RegionId[]).map((r): FeatDef => ({ id: 'rep_' + r, name: 'Revered in ' + REGION_INFO[r].name, group: 'The open world', desc: `Reach Revered standing in ${REGION_INFO[r].name}: its quests, parish tasks, events, rares and world boss all count.`, need: RANKS[RANKS.length - 1].at, have: (g) => Number(g.flag('rep:' + r) ?? 0), marks: 100, title: REVERED_TITLE[r] })),
];
