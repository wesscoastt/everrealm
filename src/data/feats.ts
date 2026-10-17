import { EVENTS, TASKS, WORLD_BOSSES } from './activities';
import { ITEMS } from './items';

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
}

export interface FeatDef {
  id: string;
  name: string;
  group: 'Exploration' | 'The open world' | 'Stable' | 'Craft and trade';
  desc: string;
  need: number;
  have(g: FeatApi): number;
  marks: number;
  title: string;
}

const HALTERS = Object.values(ITEMS).filter((d) => d.mount).map((d) => d.id);

export const FEATS: FeatDef[] = [
  { id: 'vistas', name: 'Eyes on the Horizon', group: 'Exploration', desc: 'Stand at every vista: the headlands, the summits and the passes.', need: 8, have: (g) => g.countFlags('vista:'), marks: 80, title: 'Horizon-Walker' },
  { id: 'wonders', name: 'Stumbled Upon', group: 'Exploration', desc: 'Find the six wonders: the Weeping Stair, the Kelpie Arch, the Stone King, the Drowned Bell-tower, the Kingfisher Steps and the Great Starfall.', need: 6, have: (g) => g.countFlags('found:sc-'), marks: 100, title: 'the Wide-Eyed' },
  { id: 'delves', name: 'Lamp and Rope', group: 'Exploration', desc: 'Open the chest at the bottom of all six delves.', need: 6, have: (g) => g.countFlags('chest:delve-'), marks: 90, title: 'Delver' },
  { id: 'dungeons', name: 'The Deep Halls', group: 'Exploration', desc: 'Open the chest in Mortlake Cellars and in the Black Cut.', need: 2, have: (g) => g.countFlags('chest:pd-'), marks: 90, title: 'of the Deep Halls' },
  { id: 'chart', name: 'Ink to the Edges', group: 'Exploration', desc: 'Explore enough of the continent to fill in 1,600 squares of the map.', need: 1600, have: (g) => g.explored, marks: 120, title: 'Mapmaker' },
  { id: 'events1', name: 'Answered the Bell', group: 'The open world', desc: 'See a world event through to the end.', need: 1, have: (g) => g.countFlags('ev:'), marks: 20, title: 'Neighbourly' },
  { id: 'events', name: 'Known in Every Parish', group: 'The open world', desc: 'See every world event through at least once.', need: EVENTS.length, have: (g) => g.countFlags('ev:'), marks: 150, title: 'Friend of the Counties' },
  { id: 'gold', name: 'First Over the Wall', group: 'The open world', desc: 'Win gold in six different world events.', need: 6, have: (g) => EVENTS.filter((e) => g.flag('ev:' + e.id) === 'Gold').length, marks: 120, title: 'Gilded' },
  { id: 'bosses', name: 'Four Terrors Laid Low', group: 'The open world', desc: 'Help bring down each of the four world bosses.', need: WORLD_BOSSES.length, have: (g) => g.countFlags('killed:'), marks: 200, title: 'Terror-Breaker' },
  { id: 'shards', name: 'Sealer of Stars', group: 'The open world', desc: 'Seal five Shardfalls.', need: 5, have: (g) => Number(g.flag('shardsSealed') ?? 0), marks: 120, title: 'Star-Sealer' },
  { id: 'tasks5', name: 'A Good Neighbour', group: 'The open world', desc: 'Finish five parish tasks.', need: 5, have: (g) => g.countFlags('task:'), marks: 60, title: 'Good Neighbour' },
  { id: 'tasks', name: 'Every Parish Helped', group: 'The open world', desc: 'Finish every parish task in the counties.', need: TASKS.length, have: (g) => g.countFlags('task:'), marks: 200, title: 'Friend of the Parishes' },
  { id: 'horse', name: 'Up in the Saddle', group: 'Stable', desc: 'Buy a halter and ride.', need: 1, have: (g) => HALTERS.filter((h) => g.owns(h)).length, marks: 10, title: 'Rider' },
  { id: 'stable', name: 'The Whole Stable', group: 'Stable', desc: 'Own every horse in the counties, the Cinder-shod mare included.', need: HALTERS.length, have: (g) => HALTERS.filter((h) => g.owns(h)).length, marks: 150, title: 'Horse-Lord' },
  { id: 'level', name: 'Turned Your Hand', group: 'Craft and trade', desc: 'Reach a total level of 100 across your skills.', need: 100, have: (g) => g.totalLevel, marks: 100, title: 'Journeyman' },
  { id: 'level2', name: 'Master of None', group: 'Craft and trade', desc: 'Reach a total level of 250 across your skills.', need: 250, have: (g) => g.totalLevel, marks: 250, title: 'Many-Handed' },
];
