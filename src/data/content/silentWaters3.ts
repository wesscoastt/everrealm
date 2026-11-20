import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, deed, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';
import { mcToGame } from '../../world/mclandArea';

// THE SILENT WATERS, chapters 5 and 6 (docs/VERANDAH.md section 3; 1-2 silentWaters.ts, 3-4 silentWaters2.ts).
//
// swTally, 5: THE TALLY (Captain Morvah, after Black Gull Keep): if the Good Intent went into the sea cave under the
// Fortress, she's in Mab Penhallow's tally. Morvah wants the book, quietly: send marines and the ship is gone by morning.
// Buy it from Jory Kettle (three hundred marks), take it off the hold's shelves, or ([Kind] or [Honest]) talk old Mab
// round: she's frightened of what the den has become (ships with their crews still aboard). Inside the cover, in her
// hand: "Mab Penhallow her tally. If found, Carn Hold." She is the captain's mother. swTally = 'bought' | 'stolen' | 'mab'.
//
// swTwo, 6: TWO CAPTAINS (Morvah, after The Tally): Morvah goes in tonight with the marines. Penhallow, at Carn Hold,
// begs a day to get his mother out. Side with Morvah (the raid tonight, Mab taken with the rest), give Penhallow his
// day (Mab and Jory gone before the marines land), or ([Brave] or [Honest]) bring both captains to one plan: Carn
// Hold's men on the causeway, the Vigilant at the cave mouth, Penhallow bringing his mother out himself first. Then the
// raid: the den's men on the wharf, and in the sea cave the Good Intent's nameboard and her master's chest (she
// sailed painted over as the Charity of Ansbury), with papers under Tregarthen's seal. swTwo = 'morvah' | 'penhallow' | 'both'. Chapter 7, The Underwriters, follows.

const TALLY = 'swTally', TWO = 'swTwo';
const mc = (x: number, y: number, z: number) => mcToGame('seafort', x + 0.5, y, z + 0.5);
const SHELF = mc(-977, 63, 920);
const SHIP = mc(-991, 57, 914);
const WHARF: [number, number][] = [[-990, 927], [-985, 929], [-994, 931], [-987, 925]].map(([x, z]) => { const p = mc(x, 63, z); return [p[0], p[2]] as [number, number]; });

const hasTally = (g: GameApi) => g.has('sw_tally');

const TALLY_READ = 'Mab Penhallow\'s tally: forty years of barrels in a small, clear hand. And this spring, in the same hand, other entries. "Swallow, pilchard boat, crew 3, in from the Gulls, to be kept." "Sweet Promise, same." "Good Intent, Vyvyan, salt 200 ton, in on the 9th at night, cargo out by the packet to Ansbury, ship to be painted and away. G. pays." Inside the cover: "Mab Penhallow her tally. If found, Carn Hold."';

// ================================================================ 5: The Tally

const morvahNodes: Record<string, DNode> = {
  mt1: { text: 'Into the sea cave under the Fortress, with her lamps out. Then she\'s in Jory Kettle\'s den, or she was, and if she was, she\'s in the old woman\'s tally. Mab Penhallow writes down every barrel that goes through that cave. She always has.', next: 'mt2' },
  mt2: {
    text: 'Get me that book. Quietly. If I put marines on the Fortress, whatever\'s in that cave is out of it by morning and the book\'s in the sea. Buy it, borrow it, I don\'t want to know.',
    options: [{ text: 'I\'ll get you the tally.', effect: (g) => g.setStage(TALLY, 'den') }, { text: 'Not yet.' }],
  },
  mtb1: { speaker: 'narrator', text: 'Morvah reads it standing, at the window, turning the pages fast and then slowly. When she gets to the inside of the cover she stops, and reads it again.', next: 'mtb2' },
  mtb2: { text: '"If found, Carn Hold." Penhallow. Mab Penhallow is Jago Penhallow\'s mother. Of course she is. Six years I\'ve asked why his patrols never go near the Fortress shore.', next: 'mtb3' },
  mtb3: { text: 'G. pays. Painted and away. If there\'s anything of her left in that cave, I want it before the paint\'s dry.', options: [{ text: 'What will you do?', effect: (g) => { g.take('sw_tally', 1); g.setFlag('swTallyRead', 1); g.addMarks(120); g.setStage(TALLY, 'done'); } }] },
  // 6: Two Captains
  mw1: { text: 'I go in tonight. The Vigilant at the cave mouth, marines up the stair. Everyone in that den goes to Skua Rock, the old woman with them. If Penhallow wants to argue, he can argue with the king.', next: 'mw2' },
  mw2: {
    text: 'You found the book. You\'ve earned the right to be on the boat. Or go up to Carn Hold first, if you think he deserves to hear it from somebody. I won\'t stop you. I won\'t wait for you either.',
    options: [{ text: 'I\'ll go to Penhallow first.', effect: (g) => g.setStage(TWO, 'pen') }, { text: 'Not yet, Captain.' }],
  },
  mwb1: {
    text: (g) => {
      const f = g.flag(TWO);
      if (f === 'both') return 'Penhallow brought her down the stair himself, and nobody touched her. His men held the causeway; not a soul got off the island. The Good Intent herself was gone, painted and away. I didn\'t think I\'d ever say it. That was well done.';
      if (f === 'penhallow') return 'The old woman was gone when we landed, and Jory Kettle with her, and half the den\'s silver. The rest we took. The Good Intent herself was gone, painted and away. Penhallow will answer for his day.';
      return 'We took the lot, the old woman with them. She went down the stair on her own feet and spat at my sergeant. The Good Intent herself was gone, painted and away. Penhallow came to the quay this morning and didn\'t say a word.';
    },
    next: 'mwb2',
  },
  mwb2: { text: 'Those papers out of her master\'s chest. Tregarthen\'s seal. Lewis Tregarthen, who paid Grace Vyvyan\'s claim the day it was posted. Take them somewhere I can\'t: into the town, to people who\'ll talk to you and not to a soldier.', options: [{ text: 'I will.', effect: (g) => { g.addMarks(160); g.setStage(TWO, 'done'); } }] },
};

const joryNodes: Record<string, DNode> = {
  jt1: { text: 'Mab\'s tally? That\'s not for sale. That\'s forty years of everybody\'s business. That\'s the most valuable thing on this island, after my good looks.', next: 'jt2' },
  jt2: {
    text: 'Three hundred marks. And you never had it from me, and if it comes back here with the Charter\'s stamp on it, so do you.',
    options: [
      { text: 'Three hundred. Done. (300 marks)', cond: (g) => g.marks >= 300, moral: { id: 'swTally:bought', tr: { generosity: 1 }, npc: { den_jory: 15 } }, effect: (g) => { g.addMarks(-300); g.give('sw_tally', 1); g.setFlag(TALLY, 'bought'); g.toast(TALLY_READ); g.setStage(TALLY, 'morvah'); }, next: 'jtY' },
      { text: 'Too dear.' },
    ],
  },
  jtY: { text: 'Pleasure. Mind how you go. And don\'t tell Mab it was me. She\'d have my ears.' },
};

const mab: DialogueTree = {
  start: (g) => (at(g, TALLY) === 'den' && !hasTally(g) ? 'm1' : 'mHi'),
  nodes: {
    mHi: { text: (g) => (at(g, TWO) === 'done' ? 'Go away.' : 'Forty barrels in, thirty-eight out. Wipe your feet.') },
    m1: { speaker: 'narrator', text: 'A small old woman in a coif, at a plank desk on the landing stage with a lamp and a ledger, writing in a hand as neat as a clerk\'s. She doesn\'t look up.', next: 'm2' },
    m2: { text: 'If you want something bought, Jory\'s upstairs. If you want something sold, Jory\'s upstairs. If you want me, you\'re a fool. What is it?', next: 'm3' },
    m3: {
      text: 'Well?',
      options: [
        { text: 'There were three fishing crews in chains in Black Gull Keep, Mab. It\'s in your book, isn\'t it?', need: { trait: { compassion: [57, 100] } }, moral: { id: 'swTally:mab', a: 3, tr: { compassion: 2 }, npc: { den_mab: 20 } }, effect: (g) => g.setFlag('swMabTalk', 1), next: 'm4' },
        { text: 'The Good Intent came into this cave on the ninth with her lamps out. You wrote it down. I know you did.', need: { trait: { honesty: [57, 100] } }, moral: { id: 'swTally:mab', a: 3, tr: { honesty: 2 }, npc: { den_mab: 15 } }, effect: (g) => g.setFlag('swMabTalk', 1), next: 'm4' },
        { text: 'Nothing. Just looking.' },
      ],
    },
    m4: { speaker: 'narrator', text: 'She puts the pen down.', next: 'm5' },
    m5: { text: 'I\'ve kept the tally in this cave since I was nineteen. Brandy. Tobacco. Silk, now and then, and once a bishop\'s wine. It was a trade. People paid what they owed and nobody was hurt but the Charter, and the Charter can afford it.', next: 'm6' },
    m6: { text: 'Then a man in a good coat came, and Jory took his money. And now it\'s ships with their crews still aboard, and fishermen bought off the Gulls by the head, and I write it all down, because that\'s what I do. I don\'t sleep. I\'m seventy-one. I want to sleep.', next: 'm7' },
    m7: {
      text: 'Take it. All of it\'s in there. Only don\'t tell my boy it came from me.',
      options: [{ text: 'Your boy?', effect: (g) => { g.give('sw_tally', 1); g.setFlag(TALLY, 'mab'); g.toast(TALLY_READ); g.setStage(TALLY, 'morvah'); }, next: 'm8' }],
    },
    m8: { text: 'Jago. He\'s captain up at Carn Hold. He\'s known for years what I do, and kept his men off this shore for me, and never said a word about it, and it\'s the only thing he\'s ever done wrong in his life. Go on. Before Sal comes down.' },
  },
};

// ================================================================ 6: Two Captains

const penNodes: Record<string, DNode> = {
  pt1: { speaker: 'narrator', text: 'Penhallow is at the window of the hall when you come in, looking north toward the Fortress. He knows before you speak. He has been expecting this for six years.', next: 'pt2' },
  pt2: { text: 'Morvah has the tally. Then she\'s going in. Tonight, I suppose; she never waits. And my mother goes to Skua Rock with Jory Kettle\'s cutthroats, at seventy-one, for writing down what other people did.', next: 'pt3' },
  pt3: {
    text: 'Give me a day. One day. I\'ll get her off that island myself, and Morvah can have the rest. I\'ve never asked anyone for anything. I\'m asking you.',
    options: [
      { text: 'No. Morvah goes in tonight, and I won\'t delay her for you.', moral: { id: 'swTwo:morvah', tr: { honesty: 1, loyalty: -1 }, rep: { verandah: 2 }, npc: { ver_capt_penhallow: -20, aw_morvah: 10 } }, effect: (g) => { g.setFlag(TWO, 'morvah'); g.setStage(TWO, 'raid'); }, next: 'ptM' },
      { text: 'Get her out. I\'ll see Morvah doesn\'t sail till tomorrow.', moral: { id: 'swTwo:penhallow', tr: { compassion: 2, deception: 2 }, rep: { verandah: -2 }, npc: { ver_capt_penhallow: 25, aw_morvah: -20 }, note: 'Kept Captain Morvah off the Fortress for a day so Captain Penhallow could get his mother away.' }, effect: (g) => { g.setFlag(TWO, 'penhallow'); g.setStage(TWO, 'raid'); }, next: 'ptP' },
      { text: 'Come to Awschitz with me. Your men on the causeway, her cutter at the cave mouth, and you bring your mother out first, yourself.', need: { trait: { courage: [57, 100] } }, moral: { id: 'swTwo:both', a: 5, tr: { courage: 2, honesty: 1, compassion: 1 }, rep: { verandah: 5 }, npc: { ver_capt_penhallow: 20, aw_morvah: 15 }, note: 'Brought Captains Morvah and Penhallow to one plan for the raid on the Fortress.', fame: 'brought Awschitz and Carn Hold to one plan', spread: 'faction' }, effect: (g) => { g.setFlag(TWO, 'both'); g.setStage(TWO, 'raid'); }, next: 'ptB' },
    ],
  },
  ptM: { text: 'Then that\'s that. Thank you for coming to tell me to my face. Most wouldn\'t. Go on, then. Don\'t miss the boat.' },
  ptP: { speaker: 'narrator', text: 'He takes your hand and holds it a moment too long. Then he takes his sword off the peg and goes down the stairs two at a time, and you hear him shouting for a boat.' },
  ptB: { text: 'With Morvah. On the same boat. She\'ll hate it. So will I. My men can hold the causeway; nobody gets off that island by land. All right. Let\'s go and be hated together.' },
  ptAfter: {
    text: (g) => {
      const f = g.flag(TWO);
      if (f === 'both') return 'My mother is in a room in the town, under guard, with a window and a bed. She says it\'s the best she\'s slept in a year. The king will decide. I\'ve told him everything.';
      if (f === 'penhallow') return 'She\'s in the Counties. I won\'t tell you where. I\'ll answer to the king for it. It was worth it.';
      return 'She\'s on Skua Rock. I go on the supply boat on Sundays. She won\'t speak to me. She speaks to the warden, though. Apparently the warden\'s tally is a disgrace.';
    },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [TALLY]: {
    id: TALLY, name: 'The Silent Waters: The Tally', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'den') return 'If the Good Intent went into the sea cave under the Fortress, she\'s in Mab Penhallow\'s tally. Captain Morvah wants the book, quietly. Jory Kettle sells anything; the tally\'s kept on the hold\'s shelves; and Mab herself is on the landing stage in the cave.';
      if (s === 'morvah') return 'I have Mab Penhallow\'s tally. The Good Intent is in it. Back to Captain Morvah.';
      return 'Morvah has the tally. Mab Penhallow is Captain Penhallow\'s mother.';
    },
    objectives: (_g, s) => (s === 'den' ? [{ text: 'Get Mab Penhallow\'s tally, at the Fortress den', marker: 'swShelf' }] : s === 'morvah' ? [{ text: 'Bring the tally to Captain Morvah', marker: 'aw_morvah' }] : []),
    marks: (g, s): Marks => (!s && at(g, 'swKeep') === 'done' ? { aw_morvah: '!' } : s === 'morvah' ? { aw_morvah: '?' } : {}),
    walk: { cast: ['aw_morvah', 'den_jory', 'den_mab'], from: { quests: { swGrace: 'done', swIntent: 'done', swLights: 'done', swKeep: 'done' }, flags: { swGrace: 'truth', swIntent: 'pressed', swLights: 'bound' } } },
  },
  [TWO]: {
    id: TWO, name: 'The Silent Waters: Two Captains', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'pen') return 'Captain Morvah raids the Fortress tonight. Captain Penhallow, at Carn Hold, should hear it from somebody first. His mother keeps the den\'s tally.';
      if (s === 'raid') return 'The raid on the Fortress. Clear the den\'s men off the wharf, then search the sea cave for whatever is left of the Good Intent.';
      if (s === 'back') return 'The Good Intent sailed from the cave painted over as the Charity of Ansbury. Her master\'s chest was left on the landing stage, with papers under Tregarthen\'s seal. Back to Captain Morvah.';
      const f = g.flag(TWO);
      return f === 'both' ? 'Both captains raided the Fortress together.' : f === 'penhallow' ? 'Penhallow got his mother away before the raid.' : 'Morvah raided the Fortress that night, and took Mab Penhallow with the rest.';
    },
    objectives: (g, s) => (s === 'pen' ? [{ text: 'Go to Captain Penhallow at Carn Hold', marker: 'ver_capt_penhallow' }]
      : s === 'raid' ? [
        { text: `Clear the den's men off the wharf (${Math.min(WHARF.length, killed(g, 'swRaid'))}/${WHARF.length})`, done: killed(g, 'swRaid') >= WHARF.length },
        { text: 'Search the sea cave', marker: 'swShip', done: !!g.flag('swShip') },
      ]
      : s === 'back' ? [{ text: 'Go back to Captain Morvah at Awschitz', marker: 'aw_morvah' }] : []),
    advance: (g, s) => (s === 'raid' && g.flag('swShip') ? 'back' : null),
    marks: (g, s): Marks => (!s && at(g, TALLY) === 'done' ? { aw_morvah: '!' } : s === 'pen' ? { ver_capt_penhallow: '?' } : s === 'back' ? { aw_morvah: '?' } : {}),
    walk: { cast: ['aw_morvah', 'ver_capt_penhallow'], kill: { raid: [['footpad', 4]] }, from: { quests: { swGrace: 'done', swIntent: 'done', swLights: 'done', swKeep: 'done', swTally: 'done' }, flags: { swGrace: 'truth', swIntent: 'pressed', swLights: 'bound', swTally: 'mab' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'swRaid', type: 'footpad', at: WHARF, when: (g) => at(g, TWO) === 'raid' },
];

const things: WorldThing[] = [
  {
    id: 'swShelf', x: SHELF[0], z: SHELF[2], y: SHELF[1], label: 'Take the tally from the shelf', radius: 1.8, look: 'none',
    when: (g) => at(g, TALLY) === 'den' && !hasTally(g),
    use: (g) => { g.give('sw_tally', 1); g.setFlag(TALLY, 'stolen'); deed(g, { id: 'swTally:stolen', tr: { deception: 2 }, npc: { den_jory: -10 } }); g.toast(TALLY_READ); g.setStage(TALLY, 'morvah'); },
  },
  {
    id: 'swShip', x: SHIP[0], z: SHIP[2], y: SHIP[1], label: 'Open the sea chest', radius: 2.2, look: 'crate',
    when: (g) => at(g, TWO) === 'raid' && !g.flag('swShip'),
    use: (g) => {
      if (killed(g, 'swRaid') < WHARF.length) { g.toast('The den\'s men are still on the wharf above. Deal with them first.'); return; }
      g.setFlag('swShip', 1); g.give('sw_seal', 1);
      g.toast('On the landing stage, a sea chest with brass corners, and leaning on it a long carved board, gilt letters on blue: GOOD INTENT, prised off her stern. In the chest, a master\'s coat and a packet of papers tied with tape and sealed in green wax with a ship and a scale: Tregarthen\'s seal. Under it, a bill for black paint enough for a salt ship, and for a new nameboard: CHARITY OF ANSBURY. You take the papers.');
    },
  },
];

const ITEMS: ItemDef[] = [
  { id: 'sw_tally', name: 'Mab Penhallow\'s tally', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#d8c8a0', b: '#4a3a2a' }, desc: 'Forty years of the Fortress den\'s barrels in a small, clear hand, and this spring\'s other entries. Inside the cover: "Mab Penhallow her tally. If found, Carn Hold."' },
  { id: 'sw_seal', name: 'Papers under Tregarthen\'s seal', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0d0', b: '#3a6a3a' }, desc: 'Out of the Good Intent\'s master\'s chest, left in the Fortress sea cave when she sailed painted over as the Charity of Ansbury. Tied with tape and sealed in green wax: a ship and a scale.' },
];

export const SILENT_WATERS_THREE: RegionContent = {
  id: 'silentWatersThree',
  items: ITEMS,
  dialogue: { den_mab: mab },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'aw_morvah', (g) => (at(g, TALLY) === 'morvah' && hasTally(g) ? 'mtb1' : at(g, TWO) === 'back' ? 'mwb1' : undefined), morvahNodes);
    addOption(D, 'aw_morvah', 'hello', { text: 'Petroc Hocking saw the Good Intent go into the sea cave under the Fortress.', cond: (g) => at(g, 'swKeep') === 'done' && !at(g, TALLY), next: 'mt1' });
    addOption(D, 'aw_morvah', 'hello', { text: 'What now, Captain?', cond: (g) => at(g, TALLY) === 'done' && !at(g, TWO), next: 'mw1' });
    hook(D, 'den_jory', () => undefined, joryNodes);
    addOption(D, 'den_jory', 'back', { text: 'I want to buy Mab\'s tally.', cond: (g) => at(g, TALLY) === 'den' && !hasTally(g), next: 'jt1' });
    hook(D, 'ver_capt_penhallow', (g) => (at(g, TWO) === 'pen' ? 'pt1' : undefined), penNodes);
    addOption(D, 'ver_capt_penhallow', 'hello', { text: 'Your mother, Captain.', cond: (g) => at(g, TWO) === 'done', next: 'ptAfter' });
  },
};
