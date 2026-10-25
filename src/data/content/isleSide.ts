import type { DNode, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { NpcDef } from '../npcs';
import type { QuestDef } from '../quests';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';

// The isles' side stories.
//
// isJowan, STANDING STILL (Wenna Rowse, the Staithe Inn, Gillsby): her son Jowan had the cough in the
// spring and walked into the caps, the way the greyed do. She leaves a plate at the wood's edge every
// night. He's standing in a clearing inland, grey to the elbows but not to the face. Reek smoke breaks
// the Grey down: Doctor Hale proved it. Bryony Kitto gives you a bundle from the reek-house; you burn it
// upwind of him, and he coughs grey dust and sits down. 'find' -> 'reek' -> 'burn' -> 'wenna' -> done.
// He doesn't remember the summer. Choice isJowan = 'told' (Wenna tells him) | 'ill' (he was ill abed).
//
// isCog, THE WHEEL'S COG (Ebrel Rundle, the Wheelhouse, Brasswick): old Hedra Penhallow of the Wheel lost
// her cog badge on the slope, and the brass mites strip anything bright. They hoard what they take in a
// cleft above the town. Thin them, find the hoard, bring the cog back. Only after the Escapement: Hedra
// was the first hand up when the Wheel voted you its badge. 'mites' -> 'hoard' -> 'ebrel' -> done.

const JOWAN = 'isJowan', COG = 'isCog';
/** Jowan's clearing, inland of Gillsby Staithe among the caps; and where he sits once he's home. */
const CLEARING: [number, number] = [2580.5, 1640.5], HOME: [number, number] = [2509.5, 1650.5];
/** The brass mites' hoard: a cleft on the Kiln's lower slope, above Brasswick. */
const HOARD: [number, number] = [2560.5, -640.5];
const MITES = 4;

const items: ItemDef[] = [
  { id: 'hedra_cog', name: 'Hedra Penhallow\'s cog', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'bar', a: '#c8a050', b: '#7a5a20' }, desc: 'A brass cog the size of a thumbnail, on a pin. Seven teeth, one worn smooth by a thumb over eighty years.' },
];

const npcs: NpcDef[] = [
  {
    // Before he's found: standing still among the caps, grey to the elbows
    land: 'counties', id: 'jowan_still', name: 'Jowan Rowse', title: 'Standing still',
    look: { skin: '#a8aaa4', hair: '#5a5a54', hairStyle: 3, eyes: '#4a4a48', tunic: '#6a6a64', trim: '#8a8a84', trousers: '#4a4a44', boots: '#3a3a34', build: 0.95, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: CLEARING, face: [CLEARING[0] - 10, CLEARING[1]], anim: 'idle' }],
    barks: ['...'],
    when: (g: GameApi) => !at(g, JOWAN) || at(g, JOWAN) === 'find' || at(g, JOWAN) === 'reek' || at(g, JOWAN) === 'burn',
  },
  {
    // After: home at the inn, by the fire, wrapped in a blanket and eating
    land: 'counties', id: 'jowan', name: 'Jowan Rowse', title: 'Home',
    look: { skin: '#d8b090', hair: '#5a3a24', hairStyle: 3, eyes: '#4a3a24', tunic: '#5a6a4a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', build: 0.95, age: 0.2 },
    schedule: [{ from: 0, to: 24, at: HOME, face: [HOME[0] - 2, HOME[1]], anim: 'idle' }],
    barks: ['Mum says I was ill. I don\'t remember being ill.'],
    when: (g: GameApi) => at(g, JOWAN) === 'wenna' || at(g, JOWAN) === 'done',
  },
];

// ---------------------------------------------------------------- Standing Still
const wennaNodes: Record<string, DNode> = {
  jw1: {
    text: 'My Jowan had the cough in the spring. Then the grey on his hands. Then he walked into the caps, the way they do.',
    options: [{ text: 'I\'m sorry.', next: 'jw2' }],
  },
  jw2: {
    text: 'I leave a plate at the wood\'s edge every night. In the morning it\'s cold and full. Would you look for him? I can\'t. I\'d stand there with him.',
    options: [{ text: 'I\'ll look.', effect: (g) => g.setStage(JOWAN, 'find') }, { text: 'What have you got?', effect: (g) => g.openShop('wenna_rowse') }, { text: 'Not now.' }],
  },
  jwWait: { text: (g) => (at(g, JOWAN) === 'find' ? 'Inland, east of the staithe. He liked the clearing where the lantern caps grow.' : 'Bryony has the reek. Doctor Hale says it breaks the Grey. Please.'), options: [{ text: 'What have you got?', effect: (g) => g.openShop('wenna_rowse') }, { text: 'Going.' }] },
  jwBack: {
    text: 'He came in the door on his own feet and asked for his supper. He\'s eaten three. He doesn\'t remember the summer.',
    options: [{ text: 'Does he need to?', next: 'jwBack2' }],
  },
  jwBack2: {
    text: 'He keeps asking why the plate\'s at the door. What do I tell him?',
    options: [
      { text: 'The truth. He\'ll hear it from someone.', next: 'jwTold' },
      { text: 'That he was ill abed all summer, and he\'s better now.', next: 'jwIll' },
    ],
  },
  jwTold: {
    text: 'Then I\'ll tell him tonight, by the fire, all of it. Here. It\'s everything in the till, and it\'s not enough.',
    options: [{ text: 'Keep the plate by the door.', effect: (g) => { g.addMarks(160); g.setFlag('isJowan', 'told'); g.setStage(JOWAN, 'done'); } }],
  },
  jwIll: {
    text: 'Ill abed. Half the staithe will tell him different by Sunday, but he can have this week. Here. It\'s everything in the till, and it\'s not enough.',
    options: [{ text: 'He\'s home. That\'s enough.', effect: (g) => { g.addMarks(160); g.setFlag('isJowan', 'ill'); g.setStage(JOWAN, 'done'); } }],
  },
};

const bryonyNodes: Record<string, DNode> = {
  jb1: {
    text: 'Wenna\'s boy. Standing, you say, not sitting. Grey to the elbows. Then there\'s time. Take this, and light it upwind of him, close.',
    options: [{ text: 'What will it do?', next: 'jb2' }],
  },
  jb2: {
    text: 'Make him cough. Make him sick. The doctor says the smoke breaks it down. I say it\'s what we did for three hundred years, before she said so.',
    options: [{ text: 'Thank you, Bryony.', effect: (g) => { g.give('reek_bundle'); g.setStage(JOWAN, 'burn'); } }],
  },
};

// ---------------------------------------------------------------- The Wheel's Cog
const ebrelNodes: Record<string, DNode> = {
  cg1: {
    text: 'The mountain\'s quiet, so the Wheel has a smaller trouble. Hedra Penhallow\'s sat on it eighty years, and she\'s lost her cog on the slope.',
    options: [{ text: 'Can\'t the Wheel give her another?', next: 'cg2' }],
  },
  cg2: {
    text: 'Seven cogs. Seven seats. There isn\'t another. The mites strip anything bright off the slope and hoard it in a cleft above the town.',
    options: [{ text: 'I\'ll get it back.', effect: (g) => { g.setFlag('isCog:base', killed(g, 'type:brassmite')); g.setStage(COG, 'mites'); } }, { text: 'Not my business.' }],
  },
  cgWait: {
    text: (g) => (at(g, COG) === 'mites' ? `Thin the mites on the slope first, or they'll swarm you at the hoard. ${Math.min(MITES, killed(g, 'type:brassmite') - Number(g.flag('isCog:base') ?? 0))} of ${MITES}.` : 'The hoard\'s in a cleft above the town. Everything bright on Kell ends up there.'),
    options: [{ text: 'Going.' }],
  },
  cgBack: {
    text: 'That\'s hers. The worn tooth. Eighty years of her thumb. She\'ll sit tomorrow.',
    options: [{ text: 'Good.', next: 'cgBack2' }],
  },
  cgBack2: {
    text: 'You should know. When the Wheel voted you its badge, Hedra\'s hand was up first. Before I\'d finished asking.',
    options: [{ text: 'Tell her thank you.', effect: (g) => { g.take('hedra_cog'); g.addMarks(220); g.setStage(COG, 'done'); } }],
  },
};

const quests: Record<string, QuestDef> = {
  [JOWAN]: {
    id: JOWAN, name: 'Standing Still', region: 'inkholm', depth: 'quest',
    notes: (g, s) => {
      if (s === 'find') return 'Wenna Rowse\'s son Jowan had the cough in the spring and walked into the caps, the way the greyed do. She asked me to look for him, inland east of Gillsby Staithe.';
      if (s === 'reek') return 'Jowan is standing in a clearing among the lantern caps, grey to the elbows but not yet to the face. Reek smoke breaks the Grey down. Bryony Kitto keeps the reek-house.';
      if (s === 'burn') return 'Bryony gave me a bundle of reek. I\'m to light it upwind of Jowan, close.';
      if (s === 'wenna') return 'Jowan coughed the Grey out of himself and went home on his own feet. Wenna will want to see me.';
      return g.flag('isJowan') === 'told' ? 'Wenna told Jowan where he spent the summer, by the fire, all of it.' : 'Jowan thinks he was ill abed all summer. He can have the week.';
    },
    objectives: (_g, s) => (s === 'find' ? [{ text: 'Look for Jowan inland of Gillsby Staithe', marker: 'jowan_still' }]
      : s === 'reek' ? [{ text: 'Ask Bryony Kitto for reek', marker: 'bryony' }]
      : s === 'burn' ? [{ text: 'Burn the reek beside Jowan', marker: 'isReek' }]
      : s === 'wenna' ? [{ text: 'Go back to Wenna Rowse at the Staithe Inn', marker: 'wenna_rowse' }] : []),
    marks: (_g, s): Marks => (s === 'reek' ? { bryony: '?' } : s === 'wenna' ? { wenna_rowse: '?' } : {}),
    walk: { cast: ['wenna_rowse', 'bryony'], from: { quests: { inkPriory: 'done' } } },
  },
  [COG]: {
    id: COG, name: 'The Wheel\'s Cog', region: 'kell', depth: 'quest',
    notes: (g, s) => {
      if (s === 'mites') return `Hedra Penhallow of the Wheel lost her cog badge on the slope above Brasswick, and the brass mites strip anything bright. Ebrel Rundle wants them thinned before I go near their hoard. (${Math.min(MITES, killed(g, 'type:brassmite') - Number(g.flag('isCog:base') ?? 0))}/${MITES})`;
      if (s === 'hoard') return 'The mites hoard what they take in a cleft above Brasswick. Hedra\'s cog will be in it.';
      if (s === 'ebrel') return 'I have Hedra Penhallow\'s cog. Ebrel Rundle is in the Wheelhouse.';
      return 'Hedra Penhallow has her cog back and will sit tomorrow. When the Wheel voted me its badge, hers was the first hand up.';
    },
    objectives: (g, s) => (s === 'mites' ? [{ text: `Thin the brass mites on the slope (${Math.min(MITES, killed(g, 'type:brassmite') - Number(g.flag('isCog:base') ?? 0))}/${MITES})` }]
      : s === 'hoard' ? [{ text: 'Search the mites\' hoard above Brasswick', marker: 'isHoard' }]
      : s === 'ebrel' ? [{ text: 'Bring the cog to Ebrel Rundle', marker: 'ebrel' }] : []),
    advance: (g, s) => (s === 'mites' && killed(g, 'type:brassmite') - Number(g.flag('isCog:base') ?? 0) >= MITES ? 'hoard' : null),
    marks: (_g, s): Marks => (s === 'ebrel' ? { ebrel: '?' } : {}),
    walk: { cast: ['ebrel'], from: { quests: { kellEscapement: 'done' } }, kill: { mites: [['brassmite', MITES]] } },
  },
};

export const ISLE_SIDE_CONTENT: RegionContent = {
  id: 'isleSide', items, npcs, quests,
  things: [
    {
      id: 'isJowanFound', x: CLEARING[0] - 1.5, z: CLEARING[1], label: 'Look at the grey man', radius: 3,
      when: (g: GameApi) => at(g, JOWAN) === 'find',
      use: (g: GameApi) => { g.setStage(JOWAN, 'reek'); g.toast('A young man in a fisherman\'s jersey, standing still. Grey to the elbows. His face is still his own, and his eyes follow you.'); },
    },
    {
      id: 'isReek', x: CLEARING[0] - 1.5, z: CLEARING[1], label: 'Light the reek upwind of him', radius: 3,
      when: (g: GameApi) => at(g, JOWAN) === 'burn' && g.count('reek_bundle') > 0,
      use: (g: GameApi) => { g.take('reek_bundle'); g.setStage(JOWAN, 'wenna'); g.toast('He coughs up grey dust like flour from a sack, sits down in the caps and says, "Mum?" Then he gets up and walks home.'); },
    },
    {
      id: 'isHoard', x: HOARD[0], z: HOARD[1], label: 'Search the mites\' hoard', radius: 3,
      when: (g: GameApi) => at(g, COG) === 'hoard',
      use: (g: GameApi) => { if (!g.give('hedra_cog')) return; g.setStage(COG, 'ebrel'); g.toast('Buckles, spoons, a coffee pot, nine thimbles, a doorknob. At the bottom, a brass cog on a pin with one tooth worn smooth.'); },
    },
  ],
  hooks: (D) => {
    hook(D, 'wenna_rowse', (g) => (at(g, 'inkPriory') !== 'done' ? undefined : !at(g, JOWAN) ? 'jw1' : at(g, JOWAN) === 'wenna' ? 'jwBack' : at(g, JOWAN) !== 'done' ? 'jwWait' : undefined), wennaNodes);
    hook(D, 'bryony', (g) => (at(g, JOWAN) === 'reek' ? 'jb1' : undefined), bryonyNodes);
    hook(D, 'ebrel', (g) => (at(g, 'kellEscapement') !== 'done' ? undefined : !at(g, COG) ? 'cg1' : at(g, COG) === 'ebrel' ? 'cgBack' : at(g, COG) !== 'done' ? 'cgWait' : undefined), ebrelNodes);
  },
};
