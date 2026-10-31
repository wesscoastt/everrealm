import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Gull Castle on the cliff above Gullmouth (world/sites.ts, the great hall): the Fleet lords built it to
// keep the harbour, the last of them sold it to the Charter for his debts, and the Charter keeps a
// garrison in it. Edith Penberthy captains them; Simon Teague keeps the hall and the books; Kit Hocking
// stands the gate; Mary Opie keeps the tables.

type Look = NpcDef['look'];
const look = (o: Record<string, unknown>) => ({ eyes: '#4a3a2a', trousers: '#2a2a30', boots: '#1a1612', hairStyle: 1, age: 0.45, ...o }) as Look;
const GARRISON = { tunic: '#7a2a24', trim: '#c8a050' };

const npcs: NpcDef[] = [
  {
    id: 'gc_edith', name: 'Edith Penberthy', title: 'Captain of the garrison',
    look: look({ skin: '#d8a888', hair: '#6a5a4a', hairStyle: 2, lashes: true, ...GARRISON, age: 0.6, build: 1.05 }),
    schedule: [
      { from: 6, to: 11, at: [1755.9, 718.2], face: [1755.9, 712], anim: 'idle' },
      { from: 11, to: 17, at: [1760.5, 698.5], face: [1760.5, 690], anim: 'idle' },
      { from: 17, to: 24, at: [1755.9, 718.2], face: [1755.9, 712], anim: 'idle' },
      { from: 0, to: 6, at: [1755.9, 718.2], face: [1755.9, 712], anim: 'idle' },
    ],
    barks: ['Wall, gate, harbour. In that order.', 'Somebody tell the galleon it can still see us.'],
  },
  {
    id: 'gc_simon', name: 'Simon Teague', title: 'Steward of Gull Castle',
    look: look({ skin: '#e2b894', hair: '#3a2a1a', tunic: '#3a3a40', trim: '#8a7a5a', age: 0.5, beard: true }),
    schedule: [{ from: 0, to: 24, at: [1762.4, 710.2], face: [1763.6, 710.6], anim: 'idle' }],
    barks: ['Two hundred candles a month. Two hundred.', 'If it isn\'t written down, it didn\'t happen.'],
  },
  {
    id: 'gc_kit', name: 'Kit Hocking', title: 'Garrison',
    look: look({ skin: '#c89070', hair: '#2a1e14', ...GARRISON, age: 0.3, hat: 'cap', hatColor: '#4a1e1a' }),
    schedule: [{ from: 0, to: 24, at: [1758.5, 696.8], face: [1758.5, 690], anim: 'idle' }],
    barks: ['Castle\'s open in the day. Mind the stairs.', 'No, I haven\'t seen a gull take a whole pie. Ask me tomorrow.'],
  },
  {
    id: 'gc_mary', name: 'Mary Opie', title: 'Hall servant',
    look: look({ skin: '#f0d0b8', hair: '#8a5a32', hairStyle: 2, lashes: true, tunic: '#5a6a4a', trim: '#e8dcc0', apron: true, age: 0.35 }),
    schedule: [
      { from: 6, to: 14, at: [1752.5, 714.2], face: [1750.5, 714.2], anim: 'idle' },
      { from: 14, to: 22, at: [1758.6, 711.8], face: [1760.5, 711.8], anim: 'idle' },
    ],
    barks: ['Mind the benches. I\'ve just done the floor.', 'Captain eats last. Don\'t tell her I told you.'],
  },
];

const edith: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (g.flag('metEdith') ? 'Back again. Is it the customs, or the Toll Office?' : 'Edith Penberthy, captain here. If it\'s the customs, the Toll Office is on the quay. If it\'s the Toll Office, sit down.'),
      effect: (g) => g.setFlag('metEdith'),
      options: [
        { text: 'Who holds the castle?', next: 'held' },
        { text: 'What does the garrison do?', next: 'work' },
        { text: 'About the Gannet, and the light.', next: 'gannet', cond: (g) => !!g.flag('gannetChoice') },
        { text: 'Good day, Captain.' },
      ],
    },
    held: {
      text: 'The Fleet lords built it to keep the harbour. The last of them sold it to the Charter for his debts. The Charter pays for thirty of us. There are twenty-two.',
      options: [{ text: 'Where are the other eight?', next: 'eight' }, { text: 'What does the garrison do?', next: 'work' }, { text: 'Good day.' }],
    },
    eight: {
      text: 'In Ansbury\'s ledgers, drawing pay. I\'ve written twice. Simon keeps copies of both letters. He keeps copies of everything.',
      options: [{ text: 'What does the garrison do?', next: 'work' }, { text: 'Good day.' }],
    },
    work: {
      text: 'Walk the wall. Watch the harbour mouth. Pull drunks off the quay before the tide does. The Charter\'s galleon anchors off to dodge the dues, so I row out and count her guns.',
      options: [{ text: 'Who holds the castle?', next: 'held' }, { text: 'Good day.' }],
    },
    gannet: {
      text: (g) => (g.flag('gannetChoice') === 'spare'
        ? 'You told Jory his father cut the channel too fine. Maybe he did. I asked Ansbury for Hester\'s oil in two reports. I didn\'t ask a third time.'
        : 'Six barrels where nine were ordered. I asked Ansbury for Hester\'s oil in two reports. I should have sent a third. I should have sent the men with it.'),
      options: [{ text: 'Who holds the castle?', next: 'held' }, { text: 'Good day.' }],
    },
  },
};

const simon: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Simon Teague, steward. Hall, stores, books. Mostly books. What can I find for you?',
      options: [
        { text: 'What\'s the hall used for?', next: 'hall' },
        { text: 'The captain says the garrison is short.', next: 'short', cond: (g) => !!g.flag('metEdith') },
        { text: 'Nothing, thanks.' },
      ],
    },
    hall: {
      text: 'Meals, the harbour court on the first of the month, and the Wake. Half the town dances in here and I sweep for a week.',
      options: [{ text: 'Nothing else, thanks.' }],
    },
    short: {
      text: 'Eight men short, paid in full. The pay leaves Ansbury heavy and comes here light. I have both letters, and the replies. There were no replies.',
      options: [{ text: 'Nothing else, thanks.' }],
    },
  },
};

const kit: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Kit Hocking, garrison. I stand the gate. Castle\'s open in the day, so mostly I stand it for the look of the thing.',
      options: [
        { text: 'Anything worth seeing up here?', next: 'see' },
        { text: 'What happened with the pie?', next: 'pie' },
        { text: 'Carry on.' },
      ],
    },
    see: {
      text: 'The wall walk, on a clear day. The galleon in the bay, the Mewstones past her. Captain says don\'t point at the galleon. They can see us pointing.',
      options: [{ text: 'Thanks.' }],
    },
    pie: {
      text: 'A pork pie, still warm. I set it down for one breath, and a gull ate the lot on the harbour tower, watching me.',
      options: [{ text: 'I believe you.' }],
    },
  },
};

const mary: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Mary Opie. Mind the floor, I\'ve just done it. Supper\'s at seven. It\'s fish. It\'s always fish.',
      options: [
        { text: 'How long have you worked here?', next: 'long' },
        { text: 'Who sits at the high table?', next: 'table' },
        { text: 'I\'ll leave you to it.' },
      ],
    },
    long: {
      text: 'Since I was twelve. My mother did the tables when the Fleet lord had it. He sold the roof over us for a boat he never sailed.',
      options: [{ text: 'And the Charter?', next: 'charter' }],
    },
    charter: {
      text: 'The Charter pays on time, which he never did. Mr Teague counts every candle. I\'d rather be counted than not paid.',
      options: [{ text: 'Fair enough.' }],
    },
    table: {
      text: 'The captain, Mr Teague, and the harbourmaster on court days. The Speaker once, at the Wake. She asked for more fish. Cook never got over it.',
      options: [{ text: 'Thanks, Mary.' }],
    },
  },
};

export const GULL_CASTLE_CONTENT: RegionContent = { id: 'gullCastle', npcs, dialogue: { gc_edith: edith, gc_simon: simon, gc_kit: kit, gc_mary: mary } };
