import type { DNode } from '../../game/api';
import { at, hook, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import { CALLIS_SPOTS } from '../../world/morrow';

// rwSons, THE FENN BOYS (Hessie Fenn, the west walk, Reedwater; after The Bright Nails). Morrow, the Glades and Callis
// (owner 2026-11-26: "start fleshing out continent 2"). Davy, Ned and Joss Fenn went to Callis for the Works two summers
// back and stopped writing. Hessie asks you to find them, the next time you're in the city. Jaume Roig in the Market
// takes on Morrow lads to carry for his forge, and remembers them: Joss is still with him, at the quench trough.
// Joss tells it. Ned signed onto the Kittiwake for the Brethren's wage and is somewhere in the Keys; Davy went to the
// Tolbooth for a debt at cards and came out and won't face anyone. Joss stopped writing because he couldn't write
// any of that to his mother. Then: Joss writes her all of it, and you carry it ('letter'); you tell Hessie only that
// all three are alive and working ('spared'); or ([Kind]) Joss puts down his tongs and comes home with you on the
// Kittiwake's next run south ('home'). rwSons = 'letter' | 'spared' | 'home'.

const SONS = 'rwSons';
const M = CALLIS_SPOTS.market;
const JOSS = { x: M.x + 17.5, z: M.z - 13.4 };

const hessieNodes: Record<string, DNode> = {
  fs1: { speaker: 'narrator', text: 'Hessie Fenn looks up from her doorway, and then down at her hands, and then makes up her mind.', next: 'fs2' },
  fs2: { text: 'You go to Callis. Everybody goes to Callis. Davy, Ned and Joss went to Callis, two summers back, for the Works, and wrote every month for a year, and then nothing.', next: 'fs3' },
  fs3: {
    text: 'I don\'t want them back. I want to know. If they\'re dead, I\'ll know where to put the nails. If they\'re not, I\'ll know what to stop waiting for. Will you look, next time you\'re there?',
    options: [{ text: 'I\'ll find your boys, Hessie.', effect: (g) => g.setStage(SONS, 'callis') }, { text: 'Not now.' }],
  },
  fsW: { text: (g) => (at(g, SONS) === 'callis' ? 'They went to the Works. Ask anybody who hires Morrow lads. They\'re tall, all three. They\'ve their father\'s ears.' : 'You found them? Come in. Sit. Tell me sitting down.') },
  fsB1: { text: 'Well? Sit down. Tell me sitting down.', next: 'fsB2' },
  fsB2: {
    text: (g) => {
      const f = g.flag(SONS);
      if (f === 'home') return 'Hessie looks past you, down the west walk, at the tall young man with his father\'s ears standing on the third board, which has gone soft. She doesn\'t get up. She can\'t. He comes to her.';
      if (f === 'spared') return 'All three? Working? In Callis? Then why don\'t they write? No. Don\'t answer that. They\'re alive. That\'s what I asked. That\'s what I asked for.';
      return 'Joss\'s hand. Joss always pressed too hard. She reads it twice, her lips moving, and at Davy\'s name she stops, and at Ned\'s she nearly laughs, and at the end she folds it very small. "He should have just written," she says. "That\'s all. He should have just written it."';
    },
    effect: (g) => { if (at(g, SONS) === 'hessie') { g.take('rw_joss_letter', 1); g.addMarks(70); g.setStage(SONS, 'done'); } },
  },
};

const jaumeNodes: Record<string, DNode> = {
  jf1: { text: 'Fenn? From the Glades? Three of them, tall, ears like jug handles. I took all three on to carry for the forge, two summers back. One\'s still here.', next: 'jf2' },
  jf2: { text: 'Joss. At the quench trough, round the side. Good lad. Doesn\'t talk. Talks less since his brothers went. Go easy.', effect: (g) => g.setStage(SONS, 'joss') },
};

const jossNodes: Record<string, DNode> = {
  jo1: { speaker: 'narrator', text: 'A tall young man with a leather apron and arms burned in a dozen places, dipping hot pins in the trough. When you say his mother\'s name he puts the tongs down very carefully, the way a man does when he\'d rather drop them.', next: 'jo2' },
  jo2: { text: 'Mam sent you. Course she did. She\'s all right? She\'s still on the west walk? The third board\'s gone soft. I always meant to fix it.', next: 'jo3' },
  jo3: { text: 'Ned went for a Brethren hull. The Kittiwake. Paid three times what Jaume pays, and you don\'t ask what\'s in the hold. He\'s in the Keys somewhere. He sends money. To me, not to Mam. He says she wouldn\'t take it if she knew whose it was.', next: 'jo4' },
  jo4: { text: 'Davy played cards in the dock taverns and lost what he hadn\'t got, and did four months in the Tolbooth for it. He\'s out. He sweeps the fish market. He crosses the road when he sees me.', next: 'jo5' },
  jo5: { text: 'And I couldn\'t write any of that to her. So I didn\'t write anything. A year of not writing. You start, you can\'t stop.', next: 'jo6' },
  jo6: {
    text: 'What do I do?',
    options: [
      { text: 'Write it down. All of it. I\'ll carry it to her.', moral: { id: 'rwSons:letter', a: 3, tr: { honesty: 3 }, npc: { rw_joss: 15, rw_hessie: 15 }, note: 'Carried Joss Fenn\'s letter home to his mother in Reedwater, with everything in it.' }, effect: (g) => { g.give('rw_joss_letter', 1); g.setFlag(SONS, 'letter'); g.setStage(SONS, 'hessie'); }, next: 'joL' },
      { text: 'Leave it with me. I\'ll tell her you\'re all alive, and working. That\'s what she asked.', moral: { id: 'rwSons:spared', tr: { deception: 2, compassion: 1 }, npc: { rw_joss: 10, rw_hessie: 5 }, note: 'Told Hessie Fenn her three sons were alive and working in Callis, and nothing else.' }, effect: (g) => { g.setFlag(SONS, 'spared'); g.setStage(SONS, 'hessie'); }, next: 'joS' },
      { text: 'Put the tongs down, Joss. The Kittiwake goes south on the next tide. Come home and tell her yourself, and fix the board.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'rwSons:home', a: 6, tr: { compassion: 3, courage: 1 }, npc: { rw_joss: 25, rw_hessie: 30 }, note: 'Brought Joss Fenn home from Callis to his mother on the west walk in Reedwater.', major: true, fame: 'brought a son home to Reedwater', spread: 'local' }, effect: (g) => { g.setFlag(SONS, 'home'); g.setStage(SONS, 'hessie'); }, next: 'joH' },
    ],
  },
  joL: { text: 'All of it. Ned and the hull, and Davy and the Tolbooth, and me not writing. Here. I pressed too hard. I always press too hard. Mam\'ll say so.' },
  joS: { text: 'Alive and working. It\'s true, isn\'t it? It\'s true. I\'ll write next month. I will. Don\'t look at me like that.' },
  joH: { text: 'Jaume will skin me. No, he won\'t. He\'ll tell me to bring back eels. All right. All right. The next tide. I\'ll need to tell Davy. He\'ll cross the road. I\'ll cross it after him.' },
  joAfter: { text: (g) => (g.flag(SONS) === 'home' ? 'Fixed the board. Mam says it\'s worse. It isn\'t.' : g.flag(SONS) === 'letter' ? 'She wrote back. Two lines. "You pressed too hard. Come home at Lammas." I\'m going at Lammas.' : 'I\'m going to write. Next month.') },
};

const quests: Record<string, QuestDef> = {
  [SONS]: {
    id: SONS, name: 'The Fenn Boys', region: 'glades', depth: 'quest',
    notes: (g, s) => {
      if (s === 'callis') return 'Hessie Fenn\'s three sons, Davy, Ned and Joss, went from Reedwater to Callis for the Works two summers back and stopped writing. She wants to know. Ask in Callis for anyone who hires Morrow lads: Jaume Roig, who cuts the black in the Market, takes them on.';
      if (s === 'joss') return 'Jaume Roig took all three Fenns on to carry for his forge. One is still there: Joss, at the quench trough round the side.';
      if (s === 'hessie') return g.flag(SONS) === 'home' ? 'Joss is coming home on the Kittiwake\'s next run south. Go back to Reedwater.' : g.flag(SONS) === 'letter' ? 'I have Joss Fenn\'s letter for his mother, with everything in it. Back to Reedwater.' : 'I\'ll tell Hessie her sons are alive and working, and nothing else. Back to Reedwater.';
      const f = g.flag(SONS);
      return f === 'home' ? 'Joss Fenn came home to the west walk, and fixed the board.' : f === 'letter' ? 'Hessie Fenn has Joss\'s letter, and knows where all three of her sons are.' : 'I told Hessie Fenn her sons were alive and working.';
    },
    objectives: (_g, s) => (s === 'callis' ? [{ text: 'Ask Jaume Roig in the Callis Market about the Fenn boys', marker: 'jaume_roig' }]
      : s === 'joss' ? [{ text: 'Find Joss Fenn at Jaume Roig\'s quench trough', marker: 'rw_joss' }]
      : s === 'hessie' ? [{ text: 'Go back to Hessie Fenn on the west walk in Reedwater', marker: 'rw_hessie' }] : []),
    marks: (g, s): Marks => (!s && !!g.flag('rwNails') ? { rw_hessie: '!' } : s === 'callis' ? { jaume_roig: '?' } : s === 'joss' ? { rw_joss: '?' } : s === 'hessie' ? { rw_hessie: '?' } : {}),
    walk: { cast: ['rw_hessie', 'jaume_roig', 'rw_joss'], from: { quests: { rwNails: 'done' }, flags: { rwNails: 'kept' } } },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'rw_joss', name: 'Joss Fenn', title: 'Carries for the forge', look: { skin: '#b88a60', hair: '#5a3a1e', hairStyle: 3, eyes: '#4a5a3a', tunic: '#4a3a2a', trim: '#2a2420', trousers: '#3a3028', boots: '#1e1a16', apron: true, build: 1.1, height: 1.12, age: 0.25 },
    schedule: [{ from: 0, to: 24, at: [JOSS.x, JOSS.z], face: [JOSS.x + 3, JOSS.z], anim: 'hammer' }], when: (g) => g.flag(SONS) !== 'home' || at(g, SONS) !== 'done', barks: ['Mind the trough.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'rw_joss_letter', name: 'Joss Fenn\'s letter', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'letter', a: '#e8dcc0', b: '#5a3a1e' }, desc: 'Three pages for Hessie Fenn on the west walk, pressed so hard the words come through on the back.' },
];

export const REEDWATER_SONS: RegionContent = {
  id: 'reedwaterSons',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { rw_joss: { start: (g) => (at(g, SONS) === 'joss' ? 'jo1' : 'joAfter'), nodes: jossNodes } },
  quests,
  hooks: (D) => {
    hook(D, 'rw_hessie', (g) => {
      const s = at(g, SONS);
      if (!s && g.flag('rwNails') && at(g, 'rwNails') === 'done') return 'fs1';
      if (s === 'callis' || s === 'joss') return 'fsW';
      if (s === 'hessie') return 'fsB1';
      return undefined;
    }, hessieNodes);
    hook(D, 'jaume_roig', (g) => (at(g, SONS) === 'callis' ? 'jf1' : undefined), jaumeNodes);
  },
};

