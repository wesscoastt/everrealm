import type { DialogueTree, DOption, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// The Black Gull's Doubloons (owner 2026-11-13: "add something similar to the fortnite pirate token event but in
// everrealm"): every week ten of the wreckers' cursed doubloons lie somewhere out in the Counties, the same ten for
// everyone, each with a column of gold light over it you can see a long way off (game/Doubloons.ts). Pick one up
// and it counts for your groupmates near you too. Morwenna Veale, who sailed with the Black Gull once and won't say
// what she did there, buys them on Gullmouth quay for things you can't get anywhere else. Looks and comfort only.

export const DOUBLOONS_A_WEEK = 10;

const items: ItemDef[] = [
  { id: 'doubloon', name: 'Black Gull doubloon', kind: 'collectible', rarity: 'rare', stack: true, value: 0, icon: { shape: 'coin', a: '#e8c040', b: '#3a2a10' },
    desc: 'Heavy gold, stamped with a gull on one side and a hanged man on the other. Salt has eaten the edge. It is cold in the hand, colder than gold should be.',
    stats: 'Trade them to Morwenna Veale on Gullmouth quay. Ten lie out in the Counties each week.' },
  { id: 'rum_ration', name: 'Rum ration', kind: 'food', rarity: 'uncommon', stack: true, value: 4, icon: { shape: 'bottle', a: '#7a3a1a' }, heal: 45,
    desc: 'A tot of dark rum in a tin cup. Sailors call it Nelson’s blood. Nobody in the Counties knows who Nelson was.', stats: 'Restores 45 health.' },
  { id: 'dye_doubloon', name: 'Doubloon-gold dye', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'gel', a: '#d8a830' }, dye: { color: '#d8a830', name: 'Doubloon-gold' },
    desc: 'The deep yellow of old gold under lamplight.', stats: 'Use it to add this colour to your wardrobe for good: every cloth, trim, cloak and hat swatch in Change look.' },
  { id: 'dye_tar', name: 'Ship’s-tar dye', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'gel', a: '#1a1612' }, dye: { color: '#1a1612', name: 'Ship’s tar' },
    desc: 'Black with brown in it, the colour of a hull new-paid with pitch.', stats: 'Use it to add this colour to your wardrobe for good: every cloth, trim, cloak and hat swatch in Change look.' },
  { id: 'hat_tricorn', name: 'Corsair’s tricorn', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'flatcap', a: '#1a1612', b: '#d8a830' }, hat: 'tricorn',
    desc: 'Three sides of the brim turned up, a red plume over one. Morwenna says it belonged to a captain. She doesn’t say which, or what happened to him.', stats: 'Use it to add it to your wardrobe for good (Change look, Hat).' },
  { id: 'halter_corsair', name: 'Black Gull’s mare', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'shoe', a: '#16141a', b: '#7a1e1a' }, mount: { coat: '#16141a', mane: '#0a0a0c', cloth: '#7a1e1a' },
    desc: 'Black as the inside of a hold, with a red saddle cloth. The wreckers rode her along the cliffs on dark nights with a lamp on the saddle. She doesn’t like lamps now.', stats: 'Use it, or press G, to ride. Every horse keeps the same pace.' },
];

/** What Morwenna trades, in doubloons. */
export const DOUBLOON_STALL: { item: string; price: number }[] = [
  { item: 'rum_ration', price: 1 }, { item: 'dye_doubloon', price: 8 }, { item: 'dye_tar', price: 8 }, { item: 'hat_tricorn', price: 15 }, { item: 'halter_corsair', price: 30 },
];

const npcs: NpcDef[] = [
  { id: 'dbl_veale', name: 'Morwenna Veale', title: 'Buys doubloons, Gullmouth quay',
    look: { frame: 'f', skin: '#c8906a', hair: '#2a2420', hairStyle: 5, eyes: '#3a4a3a', tunic: '#3a2a22', trim: '#d8a830', shirt: '#e8e0d0', trousers: '#2a2420', boots: '#1a1612', hat: 'tricorn', hatColor: '#1a1612', earring: '#d8a830', scar: true, lashes: true, age: 0.55 },
    schedule: [{ from: 7, to: 21, at: [1787.5, 602.5], face: [1789.5, 602.5], anim: 'idle' }],
    barks: ['Doubloons. Black Gull doubloons. Bring me them.', 'Cold, aren’t they? They always are.', 'I pay in goods, not questions.'] },
];

const trade = (it: { item: string; price: number }, name: string): DOption => ({
  text: (g: GameApi) => `${name} for ${it.price} doubloon${it.price === 1 ? '' : 's'}${g.count('doubloon') < it.price ? ` (you have ${g.count('doubloon')})` : ''}.`,
  effect: (g) => {
    if (g.count('doubloon') < it.price) { g.toast(`You need ${it.price} doubloons for that.`); return; }
    g.take('doubloon', it.price);
    if (!g.give(it.item)) { g.give('doubloon', it.price); g.toast('Your pack is full.'); return; }
    g.toast(`Morwenna takes the doubloons and hands it over without looking at it.`);
  },
  next: 'shop',
});

const dialogue: Record<string, DialogueTree> = {
  dbl_veale: {
    start: () => 'hello',
    nodes: {
      hello: {
        text: (g) => `Morwenna Veale. I buy doubloons. The Black Gull’s, with the hanged man on the back. When their ship broke on the Jawbones the sea took the hold and gave it back a coin at a time, all over the Counties, and it hasn’t stopped. Ten a week, near enough, and they glow so you can find them. Don’t ask me why they glow. ${g.flag('dblGot') ? '' : 'You look like someone who walks a lot. Walk, and look up.'}`,
        options: [
          { text: 'What will you give for them?', next: 'shop' },
          { text: 'Where do I look?', next: 'where' },
          { text: 'You sailed with the Black Gull?', next: 'gull' },
          { text: 'Goodbye.' },
        ],
      },
      where: {
        text: 'Anywhere but the towns. Out by the waymark stones, mostly, a fair walk off from them, as if the sea had a sense of humour. Look for a pillar of gold light over the trees. It shows a long way. If you’re in a group, pick it up and your friends nearby get one too. The curse is generous like that. It’s the only generous thing about it.',
        options: [{ text: 'What will you give for them?', next: 'shop' }, { text: 'Goodbye.' }],
      },
      gull: {
        text: 'I sailed on a ship. The ship was called the Black Gull. Those are two facts, and you can have them for nothing. Anything after that costs more doubloons than there are.',
        options: [{ text: 'What will you give for them?', next: 'shop' }, { text: 'Fair enough. Goodbye.' }],
      },
      shop: {
        text: (g) => `You have ${g.count('doubloon')} doubloon${g.count('doubloon') === 1 ? '' : 's'}. This week you’ve found ${((g.flag('dblGot') as { week: number; got: number[] } | undefined)?.got.length ?? 0)} of ${DOUBLOONS_A_WEEK}. Here’s what I’ve got.`,
        options: [
          trade(DOUBLOON_STALL[0], 'A rum ration'),
          trade(DOUBLOON_STALL[1], 'Doubloon-gold dye'),
          trade(DOUBLOON_STALL[2], 'Ship’s-tar dye'),
          trade(DOUBLOON_STALL[3], 'The corsair’s tricorn'),
          trade(DOUBLOON_STALL[4], 'The Black Gull’s mare'),
          { text: 'That’s all.' },
        ],
      },
    },
  },
};

export const DOUBLOONS_CONTENT: RegionContent = { id: 'doubloons', items, npcs, dialogue };
