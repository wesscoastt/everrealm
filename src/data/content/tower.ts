import type { Appearance } from '../../entities/humanoid';
import type { DialogueTree } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import { TOWER_KEEPER, TOWER } from '../tower';
import type { RegionContent } from './types';

// The Endless Tower's keeper and its token (data/tower.ts, game/Tower.ts). Annot Crowle keeps the
// door and the book of who has climbed how far; she starts your runs, from the first floor or from the
// highest checkpoint you have cleared.

const ITEMS: ItemDef[] = [
  { id: 'tower_token', name: 'Tower token', kind: 'material', rarity: 'uncommon', stack: true, value: 0, icon: { shape: 'coin', a: '#8a8478', b: '#ffd890' },
    desc: 'A disc of the tower\'s own grey stone with a stair cut in it. Annot Crowle takes them, and nobody else does.' },
];

const keeper: NpcDef = {
  id: 'tower_crowle', name: 'Annot Crowle', title: 'Keeper of the Endless Tower',
  look: { frame: 'f', skin: '#d8b090', hair: '#c8c4bc', hairStyle: 4, eyes: '#4a5a6a', tunic: '#3a3a44', trim: '#ffd890', trousers: '#2a2a30', boots: '#1e1a16', cape: '#2a2830', gloves: '#3a3238', lashes: true, age: 0.75, build: 0.95 } as Appearance,
  schedule: [{ from: 0, to: 24, at: TOWER_KEEPER, face: [TOWER.x - 8, TOWER.z + 0.5], anim: 'idle' }],
  barks: ['Up, or out.', 'The book is open.', 'Mind the stair.'],
};

const dialogue: Record<string, DialogueTree> = {
  tower_crowle: {
    start: (g) => (g.towerBest() > 0 ? 'again' : 'hello'),
    nodes: {
      hello: {
        text: 'Annot Crowle. I keep the door and I keep the book. The book says who went up and how far. It doesn\'t say who came down.',
        options: [
          { text: 'How far does it go?', next: 'far' },
          { text: 'How does it work?', next: 'how' },
          { text: 'I\'ll climb.', next: 'start' },
          { text: 'What do the tokens buy?', next: 'trade' },
          { text: 'Not today.' },
        ],
      },
      again: {
        text: (g) => `You again. The book has you at floor ${g.towerBest()}.`,
        options: [
          { text: 'I\'ll climb.', next: 'start' },
          { text: 'Show me what the tokens buy.', effect: (g) => g.openShop('tower_crowle') },
          { text: 'How does it work?', next: 'how' },
          { text: 'Not today.' },
        ],
      },
      far: { text: 'Further than it is tall, which you\'d think was a riddle until you\'ve been up it. My mother had a climber in the book at three hundred and something. He came down with his hair white.', next: 'hello' },
      how: {
        text: 'Every floor is a hall, and something waits in it. Clear it and the stair opens. Every fifth floor, worse; every tenth, a keeper of its own. Clear a tenth and you can start after it next time. Fall, or walk out, and you\'re back at this door, but the book keeps what you cleared. And you\'re paid in these, which I take for things nobody else sells.',
        next: 'hello',
      },
      trade: {
        text: 'Things climbers left with me, and things made from what they brought down. A climber\'s helm and pauldrons, for one who\'s seen floor twenty. A white pelt, for one who\'s seen forty. I don\'t sell them to anyone who hasn\'t.',
        options: [{ text: 'Show me.', effect: (g) => g.openShop('tower_crowle') }, { text: 'Later.' }],
      },
      start: {
        text: (g) => g.towerClimbing() ? 'You\'re already on the stair.' : 'Where from?',
        options: [
          { text: 'From the first floor.', cond: (g) => !g.towerClimbing(), effect: (g) => { const why = g.towerBegin(1); if (why) g.toast(why); } },
          { text: (g) => `From floor ${Math.max(...g.towerStarts()) + 1}, after my last checkpoint.`, cond: (g) => !g.towerClimbing() && g.towerStarts().length > 1, effect: (g) => { const why = g.towerBegin(Math.max(...g.towerStarts())); if (why) g.toast(why); } },
          { text: 'Not yet.' },
        ],
      },
    },
  },
};

export const TOWER_CONTENT: RegionContent = { id: 'tower', npcs: [keeper], dialogue, items: ITEMS };
