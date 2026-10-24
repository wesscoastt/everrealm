import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { WESTHORN, HOOKNESS, HOOK_QUAY } from '../sickle';

// THE SICKLE, the frozen isle in the far north sea past Kell (world/terrain.ts SICKLE, data/sickle.ts,
// LORE.md "The Sickle"): a crescent of snow fells round Sickle Water, its horns pointing south. Hookness
// is the whaling town on the east horn's inner shore, where the try-works smoke all winter.
//
// THE BELL UNDER THE ICE: off the west horn stands Westhorn Tower, a watchtower of the old kingdom
// the sea came up round. Its ringers rang the boats home through fog. The last of them, Ebba Lind, kept
// ringing as the water rose, and rang until it took her. Now, on still nights, the bell rings under the
// ice again, and the drowned come up the shore toward it: the rimewights. Annis Kettlewell, the reeve,
// wants it cut down. Ida Coulter, who keeps the drowned tally, has the ringers' book, with the old peal
// that rang the boats in, and thinks the drowned are only trying to come home.
//
// Quest sickleBell: 'ida' (ask Ida about the tower) -> 'tower' (the Ringer, at the top of Westhorn Tower)
// -> 'bell' (decide: cut the bell down, or ring the home peal from the book) -> 'annis' -> done.
// Choice flag sickleBell = 'cut' (the drowned stop coming; Hookness loses its fog bell) | 'rung' (the
// drowned are rung home; Ida keeps the bell as the fog bell, and Annis pays less for it).
//
// Cast: Annis Kettlewell (reeve, owns the try-works), Ida Coulter (the chapel and the tally), Bram Ellery
// (harpooner), Elsie Fenwick (ice-fisher), Robin Grice (the Flensing Knife), Davey Penrose's boat.

const BELL = 'sickleBell';
const H = HOOKNESS;
/** The bell chamber at the top of Westhorn Tower, where the choice is made. */
export const BELL_TOP = { x: WESTHORN.x + 0.5, y: 46, z: WESTHORN.z + 0.5 };
const choice = (g: GameApi) => g.flag('sickleBell') as 'cut' | 'rung' | undefined;
const done = (g: GameApi) => at(g, BELL) === 'done';

const items: ItemDef[] = [
  { id: 'rime_shard', name: 'Rime shard', kind: 'material', rarity: 'uncommon', stack: true, value: 26, icon: { shape: 'ore', a: '#e0f4ff', b: '#7ab8d8' }, desc: 'A splinter of the ice that holds a rimewight together. It doesn\'t melt in the hand. It doesn\'t melt in the fire either, which the Hookness smiths find personally offensive.' },
  { id: 'whale_oil', name: 'Cask of whale oil', kind: 'material', rarity: 'common', stack: true, value: 18, icon: { shape: 'bag', a: '#c8a860', b: '#5a4a2a' }, desc: 'Rendered at the Hookness try-works. Burns clean and bright and smells of nothing once it\'s lit. Before it\'s lit, it smells of the try-works.' },
  { id: 'ringers_book', name: 'The ringers\' book', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#d8ccb0', b: '#5a4a3a' }, desc: 'Lent by Ida Coulter. Westhorn Tower\'s ringers wrote their peals in it for three hundred years. The last page is in a hand that shakes, and stops halfway down.' },
  { id: 'ringers_handbell', name: 'Ebba Lind\'s handbell', kind: 'collectible', rarity: 'rare', stack: false, value: 0, icon: { shape: 'whistle', a: '#c8a060', b: '#6a5030' }, desc: 'The little bell a ringer carried down the tower stair to wake the next watch. Ida gave it to you. It still rings true.' },
];

const npcs: NpcDef[] = [
  {
    id: 'annis', name: 'Annis Kettlewell', title: 'Reeve of Hookness',
    look: { skin: '#e2b894', hair: '#8a7a6a', hairStyle: 2, eyes: '#4a5a6a', tunic: '#3a4a5a', trim: '#c8b080', trousers: '#2a2e34', boots: '#1e1a16', cape: '#2a3440', lashes: true, build: 1.1, age: 0.6 } as NpcDef['look'],
    schedule: [
      { from: 6, to: 18, at: [H.x + 9.5, H.z + 10.5], face: [H.x + 9.5, H.z + 14], anim: 'idle' },
      { from: 18, to: 24, at: [H.x + 6.5, H.z - 3.6], face: [H.x + 6.5, H.z - 7], anim: 'idle' },
      { from: 0, to: 6, at: [H.x + 6.5, H.z - 3.6], face: [H.x + 6.5, H.z - 7], anim: 'idle' },
    ],
    barks: ['Oil doesn\'t render itself.', 'Ice is in early. Ice is always in early.'],
  },
  {
    id: 'ida', name: 'Ida Coulter', title: 'Keeps the drowned tally',
    look: { skin: '#f0d0b8', hair: '#dedad2', hairStyle: 1, eyes: '#5a6a7a', tunic: '#2a2a32', trim: '#a8a090', trousers: '#2a2a30', boots: '#1a1612', cape: '#3a3a42', lashes: true, build: 0.9, age: 0.85 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [H.x + 30.5, H.z + 0.5], face: [H.x + 33, H.z + 0.5], anim: 'idle' }],
    barks: ['Every name in the tally was somebody\'s.'],
  },
  {
    id: 'bram_ellery', name: 'Bram Ellery', title: 'Harpooner',
    look: { skin: '#c89070', hair: '#3a2a1a', hairStyle: 0, eyes: '#3a2a1a', beard: true, tunic: '#5a4a3a', trim: '#8a7a5a', trousers: '#3a3028', boots: '#2a1e14', hat: 'cap', hatColor: '#2a2a30', build: 1.25, age: 0.45 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [HOOK_QUAY.x0 - 6.5, HOOK_QUAY.z - 1.4], face: [HOOK_QUAY.x1, HOOK_QUAY.z], anim: 'idle' }],
    barks: ['Fog\'s coming. You can taste it.', 'Twenty years I\'ve thrown iron. The sea\'s thrown more.'],
  },
  {
    id: 'elsie_fenwick', name: 'Elsie Fenwick', title: 'Ice-fisher',
    look: { skin: '#f0cfb0', hair: '#c8a060', hairStyle: 2, eyes: '#4a6a7a', tunic: '#6a3a2a', trim: '#d8c090', trousers: '#3a3430', boots: '#2a1e14', hat: 'kerchief', hatColor: '#8a2a2a', lashes: true, build: 0.9, age: 0.2 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [HOOK_QUAY.x0 - 9.5, HOOK_QUAY.z + 8.5], face: [HOOK_QUAY.x0 - 10, HOOK_QUAY.z + 9.4], anim: 'fishWait', held: 'rod' }],
    barks: ['Char under the ice. Fat ones.', 'Don\'t stand there. That bit\'s thin.'],
  },
  {
    id: 'robin_grice', name: 'Robin Grice', title: 'The Flensing Knife',
    look: { skin: '#d8a888', hair: '#5a3a2a', hairStyle: 1, eyes: '#4a3a2a', tunic: '#6a5a40', trim: '#c8a070', trousers: '#3a3028', boots: '#2a1e14', apron: true, build: 1.15, age: 0.5 } as NpcDef['look'],
    schedule: [{ from: 0, to: 24, at: [H.x - 5.5, H.z - 3.6], face: [H.x - 5.5, H.z - 7], anim: 'idle' }],
    barks: ['Fish stew, or fish stew. I\'ve got fish stew.'],
  },
];

const quests: Record<string, QuestDef> = {
  [BELL]: {
    id: BELL, name: 'The Bell Under the Ice', region: 'sickle', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'ida') return 'On still nights a bell rings under the ice off the Sickle\'s west horn, and the rimewights come up the shore toward it. Annis Kettlewell, the reeve of Hookness, wants it cut down. Ida Coulter keeps the drowned tally at the chapel, and knows the tower.';
      if (s === 'tower') return 'Ida lent me the ringers\' book. Westhorn Tower stands off the west horn\'s tip, half under the sea. Its last ringer, Ebba Lind, rang the boats home until the water took her. Something is still ringing at the top.';
      if (s === 'bell') return 'The Ringer is down at last. The bell hangs over the drop, its rope frozen into her hands. I can cut it down, or ring the old home peal from the ringers\' book.';
      if (s === 'annis') return choice(g) === 'rung' ? 'I rang the home peal. The ice went quiet under it. Annis Kettlewell will want to know it\'s done, and she won\'t like how.' : 'I cut the bell down into the sea. Annis Kettlewell will want to know.';
      return choice(g) === 'rung' ? 'I rang the drowned home with Ebba Lind\'s peal. They don\'t come up the shore now. Ida keeps the bell as Hookness\'s fog bell.' : 'I cut the bell down. The drowned don\'t come up the shore now, and Hookness has no bell in a fog.';
    },
    objectives: (g, s) => {
      if (s === 'ida') return [{ text: 'Ask Ida Coulter about Westhorn Tower', marker: 'ida' }];
      if (s === 'tower') return [{ text: `Climb Westhorn Tower and stop the Ringer (${Math.min(1, killed(g, 'type:ringer'))}/1)`, marker: 'sickleBellTop' }];
      if (s === 'bell') return [{ text: 'Decide what becomes of the bell', marker: 'sickleBellTop' }];
      if (s === 'annis') return [{ text: 'Tell Annis Kettlewell in Hookness', marker: 'annis' }];
      return [];
    },
    advance: (g, s) => (s === 'tower' && killed(g, 'type:ringer') >= 1 ? 'bell' : null),
    marks: (_g, s): Marks => (s === undefined ? { annis: '!' } : s === 'ida' ? { ida: '?' } : s === 'annis' ? { annis: '?' } : {}),
    walk: { kill: { tower: [['ringer', 1]] }, cast: ['annis', 'ida'] },
  },
};

const annis: DialogueTree = {
  start: (g) => (at(g, BELL) === 'annis' ? 'report' : !at(g, BELL) ? 'hello' : done(g) ? 'after' : 'during'),
  nodes: {
    hello: {
      text: 'Annis Kettlewell. I keep the try-works and the town, in that order. You\'ve come at a bad time, or you\'ve come to help. Which?',
      options: [
        { text: 'What\'s wrong?', next: 'bell' },
        { text: 'Just looking round.' },
      ],
    },
    bell: {
      text: 'There\'s a bell under the ice off the west horn. On still nights it rings. And when it rings, the drowned come up the shore. We\'ve lost two dogs and a boat. Next it\'ll be a child.',
      options: [{ text: 'The drowned?', next: 'drowned' }],
    },
    drowned: {
      text: 'Rimewights, the old men call them. Dead things in ice. I don\'t care what they are. I want that bell at the bottom of the sea. Ida Coulter knows the tower. Talk to her first.',
      options: [
        { text: 'I\'ll talk to Ida.', effect: (g) => g.setStage(BELL, 'ida') },
        { text: 'Not now.' },
      ],
    },
    during: { text: 'The bell rang again last night. Go on.', options: [{ text: 'I\'m going.' }] },
    report: {
      text: (g) => (choice(g) === 'rung'
        ? 'Ida says you rang it. Rang it. With the whole town listening. And the ice went still, and nothing came. I don\'t understand it. I don\'t have to. She keeps the bell now, she says, for the fog.'
        : 'It\'s gone, then. Into the sea. Good. We\'ll come in by the surf in a fog, the way we did before there was a tower.'),
      options: [{ text: 'It\'s done.', effect: (g) => { g.give('whale_oil', 6); g.addMarks(choice(g) === 'rung' ? 220 : 340); g.setStage(BELL, 'done'); } }],
    },
    after: {
      text: (g) => (choice(g) === 'rung' ? 'Fog last week. Ida rang the boats in. Every one. I paid her for it, and she gave it back.' : 'Quiet nights now. Fog last week. We lost a boat on the horn. We\'d have lost more to the wights.'),
      options: [{ text: 'Good day, Annis.' }],
    },
  },
};

const ida: DialogueTree = {
  start: (g) => (at(g, BELL) === 'ida' ? 'tally' : done(g) && choice(g) === 'rung' && !g.has('ringers_handbell') && !g.flag('idaBell') ? 'gift' : 'hello'),
  nodes: {
    hello: {
      text: 'Ida Coulter. I keep the chapel, and the tally: every soul Hookness has given the sea, and the ones the sea gave back. Sit, if you like. Most people don\'t.',
      options: [{ text: 'Good day, Ida.' }],
    },
    tally: {
      text: 'Annis sent you about the bell. Of course she did. Before you cut it down, you should know whose it is.',
      options: [{ text: 'Whose is it?', next: 'ebba' }],
    },
    ebba: {
      text: 'The tower rang the boats home in fog, three hundred years. The last ringer was Ebba Lind. When the sea came up, she stayed at the rope. She rang until the water was over the bell. The tally says forty boats came in by her that winter.',
      options: [{ text: 'And the rimewights?', next: 'wights' }],
    },
    wights: {
      text: 'Look at the names in the tally, then at the shore on a still night. They come up toward the bell. Toward home. I don\'t think they want anything else. I think nobody rang them in.',
      options: [{ text: 'What would you do?', next: 'book' }],
    },
    book: {
      text: 'Take the ringers\' book. The home peal is the last page Ebba finished. Annis wants it cut down, and she may be right. But you\'ll be up there, not her. Decide when you see it.',
      options: [{ text: 'I\'ll take the book.', effect: (g) => { g.give('ringers_book'); g.setStage(BELL, 'tower'); } }],
    },
    gift: {
      text: 'They came in, didn\'t they. I heard it from the chapel. Here. Ebba\'s handbell, from the tower stair. It wakes the next watch. You\'re the next watch now, I suppose.',
      options: [{ text: 'Thank you, Ida.', effect: (g) => { if (g.give('ringers_handbell')) g.setFlag('idaBell'); } }],
    },
  },
};

const bram: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: (g) => (done(g) && choice(g) === 'cut' ? 'No bell now. Fog came down Tuesday. We came in by the sound of the surf on the horn. Most of us.' : done(g) ? 'Heard the old peal from the boats, the night it rang. Hair stood up on my arms. Fog bell\'s back. I\'ll take it.' : 'Bram Ellery. I throw the iron. Twenty years. My brother Alf went through the ice off the west horn. Some nights I\'d swear the bell rings in his time.'),
      options: [{ text: 'Good hunting, Bram.' }],
    },
  },
};

const elsie: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Elsie. Don\'t walk out past the red flags, the ice there\'s a day old. Char for sale, if you like char. Everybody here likes char. There\'s nothing else.',
      options: [{ text: 'Show me the char.', effect: (g) => g.openShop('elsie_fenwick') }, { text: 'Not today.' }],
    },
  },
};

const robin: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'The Flensing Knife. Stew, ale, a bed by the stove. Whalers drink here and they\'ll tell you the same story four times, so pick a different seat each night.',
      options: [{ text: 'What have you got?', effect: (g) => g.openShop('robin_grice') }, { text: 'Not just now.' }],
    },
  },
};

const shops: Record<string, ShopDef> = {
  elsie_fenwick: { id: 'elsie_fenwick', name: 'Elsie\'s char', owner: 'elsie_fenwick', stock: [{ item: 'raw_char', price: 6 }, { item: 'cooked_char', price: 12 }], buyRate: () => 0.5, footer: () => 'Caught this morning, under the ice' } as ShopDef,
  robin_grice: { id: 'robin_grice', name: 'The Flensing Knife', owner: 'robin_grice', stock: [{ item: 'cooked_char', price: 12 }, { item: 'whale_oil', price: 30 }], buyRate: () => 0.5, footer: () => 'Robin pays half for anything that isn\'t fish' } as ShopDef,
};

export const SICKLE_CONTENT: RegionContent = {
  id: 'sickle',
  items,
  npcs,
  quests,
  dialogue: { annis, ida, bram_ellery: bram, elsie_fenwick: elsie, robin_grice: robin },
  shops,
  // The Ringer, at the rope in the bell chamber, while the quest is there
  spawns: [{ tag: 'ringer', type: 'ringer', at: [[BELL_TOP.x + 2, BELL_TOP.z]], y: BELL_TOP.y, when: (g) => at(g, BELL) === 'tower' }],
  readables: {
    hookNotice: {
      title: 'Notice, by the try-works',
      body: 'HOOKNESS\n\nNo person on the bay ice past the red flags.\n\nDogs in at dark.\n\nIf the bell rings, bar your door and keep away from the shore till morning. Do not go to it. Do not answer it.\n\nA. Kettlewell, reeve\n\nUnder it, in another hand: "It is only ringing them home."',
    },
  },
  things: [
    { id: 'hookNotice', x: H.x + 2.5, z: H.z - 3.4, label: 'Read the notice', radius: 2.2, read: 'hookNotice' },
    {
      id: 'sickleBellTop', x: BELL_TOP.x, z: BELL_TOP.z, y: BELL_TOP.y, label: 'Cut the bell down', radius: 3.2,
      when: (g: GameApi) => at(g, BELL) === 'bell',
      use: (g: GameApi) => {
        g.setFlag('sickleBell', 'cut');
        g.setStage(BELL, 'annis');
        g.toast('You saw through the frozen rope with your knife. It parts all at once. The bell goes down past the stair, through the ice below, and the sea closes over it without a sound.');
      },
    },
    {
      id: 'sickleBellRing', x: BELL_TOP.x + 1.5, z: BELL_TOP.z, y: BELL_TOP.y, label: 'Ring the home peal', radius: 3.2,
      when: (g: GameApi) => at(g, BELL) === 'bell',
      use: (g: GameApi) => {
        if (!g.has('ringers_book')) { g.toast('You don\'t know the peal. Ida Coulter has the ringers\' book.'); return; }
        g.take('ringers_book');
        g.setFlag('sickleBell', 'rung');
        g.setStage(BELL, 'annis');
        g.toast('You take the rope out of the Ringer\'s hands and ring Ebba\'s peal from the last page, slow, the way it\'s marked. Out over the bay, the ice cracks along the shore and goes still. Nothing comes up out of it.');
      },
    },
  ],
};
