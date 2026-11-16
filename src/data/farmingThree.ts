import type { ItemDef } from './items';

// Farming, part three (docs/briefs/farming-cozy.md, owner 2026-11-14: "farming and gardening should be in depth like
// cozy games"). The yard's animals get names and a heart that grows with feeding and brushing, and that shows in what
// they give: more of it, and better. And the makers: a cheese press, a churn, a loom, a preserves shelf, a cider
// press and a keg, set up in your yard, turning what the garden and the animals give into goods worth more, on the
// real clock. The working of them is game/HomeFarm.ts.

/** Names the yard's animals come with (one name for a cow, a pair for the ewes, three for the hens). */
export const ANIMAL_NAMES: Record<string, string[]> = {
  cow: ['Primrose', 'Clover', 'Bluebell', 'Hettie', 'Marigold', 'Duchess', 'Bramble', 'Nettle'],
  ewes: ['Sorrel and Thrift', 'Dulcie and Moss', 'Teasel and Fern', 'Agnes and Bet', 'Heather and Ling'],
  hens: ['Peg, Dot and Mabel', 'Ida, Florrie and Nan', 'Gertie, Win and Tilly', 'Ada, Rosie and Pip'],
};

/** How an animal feels about you, by its heart (0 to 100). */
export const heartWord = (h: number) => (h >= 90 ? 'follows you about' : h >= 70 ? 'devoted to you' : h >= 45 ? 'fond of you' : h >= 20 ? 'used to you' : 'wary of you');
/** What a day's care adds: fed, brushed (each once a day); and what a day unfed takes away. */
export const HEART = { fed: 3, brushed: 4, missed: 4 };

/** A maker's batches: what goes in, what comes out, and how long it takes on the real clock. */
export interface MakerBatch { in: Record<string, number>; out: string; n: number; mins: number }
export interface MakerDef { item: string; name: string; verb: string; batches: MakerBatch[] }

const FRUITS: [string, string, string][] = [
  ['strawberries', 'Strawberry jam', '#c8202a'], ['raspberries', 'Raspberry jam', '#a8203a'], ['plums', 'Plum jam', '#5a2a5a'],
  ['cherries', 'Cherry jam', '#8a102a'], ['apples', 'Apple jelly', '#d8a040'], ['pears', 'Pear butter', '#c8a850'],
  ['quinces', 'Quince cheese', '#d8902a'], ['peaches', 'Peach preserve', '#f0a070'], ['rhubarb', 'Rhubarb jam', '#c84a5a'],
];
const jamId = (fruit: string) => 'jam_' + fruit;

export const MAKERS: Record<string, MakerDef> = {
  churn: { item: 'maker_churn', name: 'butter churn', verb: 'Churn', batches: [{ in: { milk: 2 }, out: 'butter', n: 2, mins: 30 }] },
  press: { item: 'maker_cheese', name: 'cheese press', verb: 'Press', batches: [{ in: { milk: 4 }, out: 'cheese', n: 2, mins: 120 }] },
  loom: { item: 'maker_loom', name: 'loom', verb: 'Weave', batches: [{ in: { wool: 4 }, out: 'homespun', n: 1, mins: 60 }, { in: { fleece: 3 }, out: 'homespun', n: 1, mins: 90 }] },
  jars: { item: 'maker_jars', name: 'preserves shelf', verb: 'Put up', batches: FRUITS.map(([f]) => ({ in: { [f]: 3 }, out: jamId(f), n: 2, mins: 60 })) },
  cider: { item: 'maker_cider', name: 'cider press', verb: 'Press', batches: [{ in: { apples: 5 }, out: 'home_cider', n: 3, mins: 90 }, { in: { pears: 5 }, out: 'home_perry', n: 3, mins: 90 }] },
  keg: { item: 'maker_keg', name: 'keg', verb: 'Brew', batches: [{ in: { hops: 2, barley: 3 }, out: 'home_ale', n: 4, mins: 180 }, { in: { grapes: 6 }, out: 'home_wine', n: 2, mins: 240 }] },
};
export const MAKER_OF_ITEM: Record<string, string> = Object.fromEntries(Object.entries(MAKERS).map(([k, m]) => [m.item, k]));

const maker = (id: string, name: string, a: string, b: string, value: number, desc: string, stats: string): ItemDef =>
  ({ id, name, kind: 'collectible', rarity: 'uncommon', stack: false, value, icon: { shape: 'chest', a, b }, desc, stats: stats + ' Set it up in your own yard (Farming).' });
const drink = (id: string, name: string, a: string, value: number, heal: number, desc: string): ItemDef =>
  ({ id, name, kind: 'food', rarity: 'uncommon', stack: true, value, icon: { shape: 'gel', a, b: '#e8dcc0' }, heal, buff: { slot: 'drink', power: 0.04, hp: 0.04, mins: 15 }, desc, stats: `Restores ${heal} health; a little harder and a little hardier for a quarter of an hour.` });

export const FARM_THREE_ITEMS: ItemDef[] = [
  maker('maker_churn', 'Butter churn', '#8a6a3a', '#c8b898', 90, 'A tall oak barrel with a dasher through the lid. Twenty minutes of up and down and your arms know about it.', 'Two milk in, two butter out half an hour later.'),
  maker('maker_cheese', 'Cheese press', '#6a4a2a', '#e8c860', 220, 'A screw press over a mould, with a drip tray. The weight does the work; you only have to wait.', 'Four milk in, two farmhouse cheeses out two hours later.'),
  maker('maker_loom', 'Floor loom', '#7a5434', '#ece6d6', 300, 'A frame loom with two treadles and a bench, the shuttle worn smooth by somebody\'s grandmother.', 'Four spun wool (or three fleeces) in, a bolt of homespun out.'),
  maker('maker_jars', 'Preserves shelf', '#8a6a3a', '#c8302a', 140, 'A plank shelf, a copper pan and a crate of stoneware jars with waxed paper lids.', 'Three of a fruit in, two jars of preserve out an hour later.'),
  maker('maker_cider', 'Cider press', '#5a3a24', '#c8a040', 360, 'A slatted basket under an oak beam and a screw. The apples go in whole; the wasps come anyway.', 'Five apples (or pears) in, three bottles of cider (or perry) out.'),
  maker('maker_keg', 'Brewing keg', '#6a4a2a', '#a8c870', 420, 'An iron-hooped oak keg on a stand, with a tap and a bung that sighs while it works.', 'Hops and barley in, home-brewed ale out; or grapes, for wine.'),
  { id: 'homespun', name: 'Bolt of homespun', kind: 'material', rarity: 'uncommon', stack: true, value: 110, icon: { shape: 'bag', a: '#d8ccb0', b: '#8a6a4a' }, desc: 'Plain twill off your own loom, from your own ewes. Tailors pay well for cloth with a story in it.', stats: 'Sells to tailors and drapers.' },
  drink('home_cider', 'Farmhouse cider', '#d8a040', 28, 70, 'Cloudy and dry, from your own trees. It tastes of the year the apples had.'),
  drink('home_perry', 'Perry', '#e0d080', 32, 70, 'Pear cider, pale and quick. It goes to the head faster than anyone expects.'),
  drink('home_ale', 'Home-brewed ale', '#a8702a', 24, 60, 'Brown and bitter from your own hops. Matthias Garrow would call it promising, which is a compliment from him.'),
  drink('home_wine', 'Country wine', '#5a2040', 60, 90, 'Dark and a little rough, from your own vines. It will be better in a year. So will you.'),
  ...FRUITS.map(([f, name, a]): ItemDef => ({ id: jamId(f), name, kind: 'food', rarity: 'uncommon', stack: true, value: 40, icon: { shape: 'bread', a }, heal: 160, desc: 'A stoneware jar under waxed paper, your own fruit boiled down with sugar on your own stove.', stats: 'Restores 160 health.' })),
];

export const FARM_THREE_RECIPES = [
  { id: 'maker_churn', station: 'bench', skill: 'woodcutting', level: 10, xp: 60, inputs: { oak_logs: 4 }, output: 'maker_churn', count: 1, time: 3 },
  { id: 'maker_jars', station: 'bench', skill: 'woodcutting', level: 12, xp: 70, inputs: { oak_logs: 3, iron_bar: 1 }, output: 'maker_jars', count: 1, time: 3 },
  { id: 'maker_cheese', station: 'bench', skill: 'woodcutting', level: 18, xp: 110, inputs: { oak_logs: 6, iron_bar: 1 }, output: 'maker_cheese', count: 1, time: 3.4 },
  { id: 'maker_loom', station: 'bench', skill: 'woodcutting', level: 22, xp: 140, inputs: { oak_logs: 8, wool: 2 }, output: 'maker_loom', count: 1, time: 3.6 },
  { id: 'maker_cider', station: 'bench', skill: 'woodcutting', level: 26, xp: 170, inputs: { oak_logs: 8, iron_bar: 2 }, output: 'maker_cider', count: 1, time: 3.8 },
  { id: 'maker_keg', station: 'bench', skill: 'woodcutting', level: 30, xp: 200, inputs: { oak_logs: 6, iron_bar: 2 }, output: 'maker_keg', count: 1, time: 4 },
] as const;
