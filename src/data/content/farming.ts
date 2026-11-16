import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { ShopDef } from '../shops';
import type { RegionContent } from './types';
import { FARM_ITEMS, ordersToday, seasonNow, CROPS } from '../farming';
import { MORE_SEED_PRICES } from '../farmingMore';
import { FLOWER_SEED_PRICES } from '../farmingFour';
import { DECOR } from '../farmingSix';
const ITEMS: Record<string, { name: string }> = Object.fromEntries(FARM_ITEMS.map((i) => [i.id, i]));

const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const done = (g: { flag(k: string): unknown }, i: number) => { const v = g.flag('farmOrders') as { d?: string; done?: number[] } | undefined; return v?.d === dayKey() && (v.done ?? []).includes(i); };
const inSeason = () => CROPS.filter((c) => c.season === seasonNow()).map((c) => c.name.toLowerCase().replace(/^an? /, '')).join(', ');

// Farming's people: the seedsman by Hollin Ford's west garden, who sells seed, saplings and compost and
// will tell you how a patch works. (The crops and the patches: data/farming.ts, game/Farming.ts.)

const npcs: NpcDef[] = [
  {
    id: 'seed_bertram', name: 'Bertram Sowerby', title: 'Seedsman',
    look: { skin: '#d8a888', hair: '#c8c4bc', hairStyle: 1, eyes: '#4a5a3a', tunic: '#5a6a3a', trim: '#3a2a1c', trousers: '#4a3a2a', boots: '#2a1e14', hat: 'straw', apron: true, age: 0.7, build: 1.05 },
    schedule: [{ from: 6, to: 20, at: [117.4, 180.6], face: [117.4, 184], anim: 'idle' }, { from: 20, to: 6, at: [117.4, 180.6], face: [117.4, 184], anim: 'idle' }], // (out at the front of the cottage: his old spot was inside its north wall, and he stood on the roof)
    barks: ['Seed! Good seed!', 'Mind my beans.', 'Rake it before you sow it.'],
  },
  {
    // the Hollin Ford Show's secretary (data/farmingFive.ts), at her trestle by Bertram's garden
    id: 'show_hester', name: 'Hester Wragg', title: 'Show Secretary',
    look: { skin: '#e0b898', hair: '#8a7a6a', hairStyle: 4, eyes: '#4a3a2a', tunic: '#3a4a6a', trim: '#e8dcc0', trousers: '#2a2a3a', boots: '#2a1e14', hat: 'coif', hatColor: '#e8dcc0', age: 0.6, build: 0.9 },
    schedule: [{ from: 7, to: 19, at: [113.6, 182.4], face: [117.4, 184], anim: 'idle' }, { from: 19, to: 7, at: [113.6, 182.4], face: [117.4, 184], anim: 'idle' }],
    barks: ['Entries by noon! Or after noon. Entries whenever.', 'No shop-bought, and I can tell.', 'Six classes, a card in every one.'],
  },
];

const bertram: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Bertram Sowerby. Seed, sets, saplings and muck, the best in the Wend. You want to grow something, or you want to stand there?',
      options: [
        { text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') },
        { text: 'How does a patch work?', next: 'how' },
        { text: 'Any orders from the town?', next: 'orders' },
        { text: 'What grows best just now?', next: 'season' },
        { text: 'Good day.' },
      ],
    },
    season: { text: () => `It's ${seasonNow()}. What's in season grows half as fast again: ${inSeason()}. Everything else grows as it always does.`, next: 'hello' },
    orders: {
      text: () => 'The town sends its orders through me. Three today, and they pay better than I do: ' + ordersToday().map((o) => `${o.who} wants ${o.n} ${(ITEMS[o.item]?.name ?? o.item).toLowerCase()}`).join('; ') + '.',
      options: [
        ...[0, 1, 2].map((i) => ({
          text: (g: import('../../game/api').GameApi) => { const o = ordersToday()[i]; return done(g, i) ? `(${o.who}: delivered)` : `Deliver ${o.n} ${(ITEMS[o.item]?.name ?? o.item).toLowerCase()} for ${o.who} (${o.marks} marks)`; },
          cond: (g: import('../../game/api').GameApi) => { const o = ordersToday()[i]; return !done(g, i) && g.count(o.item) >= o.n; },
          effect: (g: import('../../game/api').GameApi) => {
            const o = ordersToday()[i];
            if (done(g, i) || !g.take(o.item, o.n)) return;
            g.addMarks(o.marks); g.addXp('farming', o.xp); g.setFlag('n:orders', Number(g.flag('n:orders') ?? 0) + 1);
            const v = g.flag('farmOrders') as { d?: string; done?: number[] } | undefined;
            g.setFlag('farmOrders', { d: dayKey(), done: [...(v?.d === dayKey() ? v.done ?? [] : []), i] });
            g.toast(`Bertram writes it in the book and counts out ${o.marks} marks. "${o.who[0].toUpperCase() + o.who.slice(1)} will be pleased. Or they'll say nothing, which is the same thing."`);
          },
          next: 'orders',
        })),
        { text: 'What do you sell?', effect: (g: import('../../game/api').GameApi) => g.openShop('seed_bertram') },
        { text: 'Good day.' },
      ],
    },
    how: {
      text: "A hoe to turn the ground, a tile at a time, then the seed, then water it. Wet ground grows twice as fast as dry, and the rain does the watering for you. Compost and keep it wet, and more comes up. Root crops in a few minutes, trees in a few hours. A bigger can waters more at a go; a scythe takes a whole bed when it's ripe.",
      options: [
        { text: 'Where are the patches?', next: 'where' },
        { text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') },
        { text: 'Good day.' },
      ],
    },
    where: {
      text: "Your own garden first, if you own a house: a hoe and a can and the grass is up round it by supper. Then the public fields: my three here in the Ford and a field on every farm round the towns. Anyone can work them, and they don't count against your own ground. The orchards still let a corner each for a tree.",
      options: [{ text: 'What do you sell?', effect: (g) => g.openShop('seed_bertram') }, { text: 'Good day.' }],
    },
  },
};

type Api = import('../../game/api').GameApi;
const PLACE = ['', 'first', 'second', 'third'];
const hester: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => {
        const v = g.showView?.() ?? [];
        const firsts = v.filter((c) => c.place === 1).length;
        return `Hester Wragg, secretary of the Hollin Ford Show, which is every season and has been since before the bridge. You've a card in ${v.filter((c) => c.place).length} of the six classes this season${firsts ? `, ${firsts} of them first` : ''}. Four firsts in a season and the cup is yours.`;
      },
      options: [
        { text: 'I want to enter something.', next: 'enter' },
        { text: 'How does the judging work?', next: 'how' },
        { text: 'Good day.' },
      ],
    },
    how: {
      text: "One entry a class a day, and I'll pick your best for you, because people bring me their worst and then argue. The judges look at what it is, how well it was grown (fine beats plain, prize beats fine), and who grew it. A family entry, your group about you, they like. Anything grown giant goes in its own class and has never not won it. First is a rosette and eighty marks, second a blue card and forty, third a yellow and twenty.",
      next: 'hello',
    },
    enter: {
      text: (g) => {
        const v = g.showView?.() ?? [];
        return v.map((c) => `${c.name}${c.place ? ` (${PLACE[c.place]} this season)` : ''}: ${c.today ? 'entered today' : c.best ? `your ${c.best.name.toLowerCase()}` : 'nothing of yours'}`).join('. ') + '.';
      },
      options: [
        ...(['veg', 'fruit', 'flowers', 'larder', 'yard', 'giants'] as const).map((id) => ({
          text: (g: Api) => { const c = g.showView?.().find((x) => x.id === id); return c?.best ? `Enter my ${c.best.name.toLowerCase()} in ${c.name.toLowerCase()}.` : ''; },
          cond: (g: Api) => { const c = g.showView?.().find((x) => x.id === id); return !!c?.best && !c.today; },
          effect: (g: Api) => g.showEnter?.(id),
          next: 'enter',
        })),
        { text: 'That\'s all for today.' },
      ],
    },
  },
};

const shop: ShopDef = {
  id: 'seed_bertram', name: 'Bertram Sowerby\'s seeds', owner: 'seed_bertram',
  stock: [
    { item: 'hoe', price: 30 }, { item: 'watering_can', price: 45 },
    { item: 'stock_hens', price: 320, when: (g) => g.level('farming') >= 5 && !g.has('stock_hens') }, { item: 'stock_ewes', price: 720, when: (g) => g.level('farming') >= 15 && !g.has('stock_ewes') }, { item: 'stock_cow', price: 1200, when: (g) => g.level('farming') >= 25 && !g.has('stock_cow') },
    { item: 'watering_can_copper', price: 180, when: (g) => g.level('farming') >= 15 && !g.has('watering_can_copper') }, { item: 'seed_drill', price: 320, when: (g) => g.level('farming') >= 25 && !g.has('seed_drill') }, { item: 'scythe', price: 240, when: (g) => g.level('farming') >= 20 && !g.has('scythe') },
    { item: 'watering_can_iron', price: 650, when: (g) => g.level('farming') >= 35 && !g.has('watering_can_iron') }, { item: 'watering_can_gilded', price: 2400, when: (g) => g.level('farming') >= 60 && !g.has('watering_can_gilded') }, { item: 'compost', price: 4 }, { item: 'bone_meal', price: 12 }, { item: 'wood_ash', price: 6 }, { item: 'seaweed_feed', price: 10 }, { item: 'maker_churn', price: 160, when: (g) => g.level('farming') >= 6 }, { item: 'maker_jars', price: 220, when: (g) => g.level('farming') >= 12 }, { item: 'maker_cheese', price: 420, when: (g) => g.level('farming') >= 20 }, { item: 'maker_loom', price: 560, when: (g) => g.level('farming') >= 24 }, { item: 'maker_cider', price: 680, when: (g) => g.level('farming') >= 40 }, { item: 'maker_keg', price: 820, when: (g) => g.level('farming') >= 36 }, { item: 'compost_heap', price: 150, when: (g) => !g.has('compost_heap') && !g.flag('heapBuilt') }, { item: 'sprinkler_bronze', price: 320, when: (g) => g.level('farming') >= 18 }, { item: 'sprinkler_iron', price: 900, when: (g) => g.level('farming') >= 40 }, { item: 'seed_potato', price: 4 }, { item: 'seed_onion', price: 6 }, { item: 'seed_cabbage', price: 8 }, { item: 'seed_carrot', price: 10 },
    { item: 'seed_wheat', price: 12 }, { item: 'seed_strawberry', price: 18 }, { item: 'seed_barley', price: 20 }, { item: 'seed_leek', price: 24 }, { item: 'seed_hops', price: 32 },
    { item: 'seed_pumpkin', price: 40 }, { item: 'sapling_apple', price: 120 }, { item: 'sapling_pear', price: 180 }, { item: 'cutting_vine', price: 260 },
    // the new seed, each once you're near the level to grow it
    ...MORE_SEED_PRICES.map(([item, price, level]) => ({ item, price, when: (g: import('../../game/api').GameApi) => g.level('farming') >= level - 5 })),
    ...FLOWER_SEED_PRICES.map(([item, price, level]) => ({ item, price, when: (g: import('../../game/api').GameApi) => g.level('farming') >= level - 5 })),
    ...Object.values(DECOR).map((d) => ({ item: d.item, price: d.price })),
    { item: 'beehive', price: 300, when: (g: import('../../game/api').GameApi) => g.level('farming') >= 15 },
    { item: 'greenhouse_kit', price: 2400, when: (g: import('../../game/api').GameApi) => g.level('farming') >= 30 && !g.has('greenhouse_kit') && !g.flag('greenhouse') },
  ],
  buyRate: () => 0.5,
  footer: () => 'Bertram pays half of an item\'s worth',
} as ShopDef;

export const FARM_CONTENT: RegionContent = {
  id: 'farming',
  items: FARM_ITEMS,
  npcs,
  dialogue: { seed_bertram: bertram, show_hester: hester },
  shops: { seed_bertram: shop },
};
