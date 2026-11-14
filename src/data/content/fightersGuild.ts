import type { DialogueTree, GameApi } from '../../game/api';
import { addOption, at, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// THE FIGHTERS GUILD (owner 2026-11-14: "add mages and fighters guilds around the world, verandah has both";
// "questlines for them too"). Its hall is the owner\'s own Fighters Guild in Verandah, by the Vanguard Hospital, kept
// by Ancrum Treneer, who held the gate in the second raid with a fishing gaff at nine years old (data/content/
// verandahHalls.ts has him and Hob Tresidder, the trainer). It trains the King\'s Guard and the caravan guards and hires
// out to anyone with honest trouble. Its one rule is the Guild\'s word: a Guild sword is never hired to collect a debt
// or break a strike. It has a chapter house on the quay at Gullmouth, over the water in the Counties.
//
// Chapters (each a rank):
//   fgFeet     FEET FIRST (Initiate): Hob\'s floor, then a first contract: run the footpads off the Port Sands.
//   fgChapter  THE GULLMOUTH CHAPTER (Sword): the chapter house has gone quiet. Its master, Jory Kessell, has taken
//              Harrowgate\'s money to clear striking porters off the quay. Talk him round (he tears up the contract)
//              or bring his letter to Ancrum (he\'s struck off and the chapter is yours to hold). fgJory = 'round' | 'off'.
//   fgLights   WRECKERS' LIGHTS (Shieldbearer): the King\'s Dock hires the Guild against the wreckers on Awschitz Head.
//              On their leader, a note of the tides, in a Verandah clerk\'s hand. Ancrum sends it to the king.
//   fgWord     THE GUILD\'S WORD (Captain): Commander Joan Ellery of the King\'s Guard comes with the king\'s offer: the
//              Guild under the Guard\'s colours, the king\'s pay and the king\'s orders. Ancrum is retiring and leaves it
//              to you. Take the commission, or keep the Guild free. fgEnd = 'king' | 'free'.

const FEET = 'fgFeet', CHAPTER = 'fgChapter', LIGHTS = 'fgLights', WORD = 'fgWord';

/** The hall\'s door side, where people stand to be met (the sign is on its east wall). */
const HALL = { x: -2957.5, z: 2000.5 };
/** Gullmouth\'s chapter house is on the quay street, by Bet Polglase. */
const JORY = { x: 1749.5, z: 601.5 };
const SANDS: [number, number][] = [[-2934, 1902], [-2941, 1907], [-2930, 1909], [-2945, 1901]];
const HEAD: [number, number][] = [[-3455, 1907], [-3461, 1915], [-3452, 1918], [-3464, 1909]];
const NOTE = { x: -3458.5, z: 1912.5 };

const done = (g: GameApi, q: string) => at(g, q) === 'done';
const kills = (g: GameApi, tag: string) => Number(g.flag('kills:' + tag) ?? 0);
const rank = (g: GameApi, r: number) => { const cur = g.flag('fac:fighters'); if (typeof cur !== 'number' || cur < r) g.setFlag('fac:fighters', r); };
const jory = (g: GameApi) => g.flag('fgJory') as 'round' | 'off' | undefined;

// ================================================================ Ancrum Treneer, Master of the Guild (hooked onto his talk)

const ancrumNodes: DialogueTree['nodes'] = {
  // I. Feet First
  fj1: { text: 'You want to join. Everybody wants to join on a Monday. By Friday they want their mothers.', next: 'fj2' },
  fj2: { text: 'Hob takes the new ones on the floor. If he says you\'ll do, you get a contract. If the contract doesn\'t kill you, you get a badge. That\'s the whole of it.', next: 'fj3' },
  fj3: { text: 'One more thing, and it\'s the only thing. The Guild\'s word: a Guild sword is never hired to collect a debt or to break a strike. Not for money, not for a king. Say it back.', next: 'fj4' },
  fj4: {
    text: 'Well?',
    options: [
      { text: 'Never to collect a debt, never to break a strike.', effect: (g) => g.setStage(FEET, 'floor'), next: 'fj5' },
      { text: 'Why those two?', next: 'fjWhy' },
    ],
  },
  fjWhy: { text: 'Because those are the two jobs that pay best and leave the worst marks. The old kingdom\'s guild took both. The second raid came through a gate nobody would hold for them.', next: 'fj4' },
  fj5: { text: 'Good. Go and let Hob knock you down.' },
  fjBack: { text: 'Four footpads off the Port Sands, and the cargo landed. Hob says you fall over properly, which is rarer than you\'d think.', next: 'fjBack2' },
  fjBack2: {
    text: 'Initiate of the Fighters Guild. Wear it like you mean it.',
    effect: (g) => { g.setStage(FEET, 'done'); rank(g, 0); g.addMarks(40); g.give('fg_badge', 1); },
  },
  // II. The Gullmouth Chapter
  fc1: { text: 'The Guild has a chapter house in Gullmouth, over the water. Jory Kessell keeps it. Good man. Was a good man. He hasn\'t written in two months.', next: 'fc2' },
  fc2: { text: 'Gullmouth\'s porters have stopped work on the quay. They want the Counting House\'s rate, and Harrowgate\'s factor wants the quay cleared. Somebody with swords has been clearing it.', next: 'fc3' },
  fc3: { text: 'Go and find out if it\'s Jory. I hope it isn\'t. If it is, I want to know why before I want to know anything else.', effect: (g) => g.setStage(CHAPTER, 'jory') },
  fcRound: { text: 'He tore it up? Hm. Then the chapter\'s poorer and the Guild\'s word is still the Guild\'s word. I\'ll send him a barrel and a letter. The letter will be shorter than the barrel.', next: 'fcDone' },
  fcOff: { speaker: 'narrator', text: 'Ancrum reads the factor\'s letter twice, then folds it very small and puts it in his pocket, as if it might get out.', next: 'fcOff2' },
  fcOff2: { text: 'Twenty years I\'ve known Jory. He held the north stair at the second raid when he was fourteen. Struck off. I\'ll write it myself. And the Gullmouth chapter wants a sword in it who keeps the word: that\'s you, when you\'re over there.', next: 'fcDone' },
  fcDone: {
    text: 'You\'re a Sword of the Guild. The badge doesn\'t change. The trouble does.',
    effect: (g) => { g.setStage(CHAPTER, 'done'); rank(g, 1); g.addMarks(80); },
  },
  // III. Wreckers' Lights
  fl1: { text: 'Work. Honest work, for once paid well. The King\'s Dock lost a grain ship off Awschitz Head last month, and a wine boat the month before. Somebody\'s lighting lamps on the headland on dark nights.', next: 'fl2' },
  fl2: { text: 'The harbour wants them gone. Go up the Head, clear them off, and bring me anything they had on them. Wreckers don\'t think of themselves. Someone tells them when a ship\'s due.', effect: (g) => g.setStage(LIGHTS, 'head') },
  flBack: { speaker: 'narrator', text: 'Ancrum reads the slip of tides, then holds it up to the window, then reads it again.', next: 'flBack2' },
  flBack2: { text: 'That\'s a harbour clerk\'s hand. The ships, the days, the tides they\'d come in on. Somebody in the king\'s own harbour office has been selling his ships to the rocks.', next: 'flBack3' },
  flBack3: { text: 'This goes to the king, sealed, by me. Not to the harbour office. You did well. Shieldbearer: it means when the Guild goes out, you\'re the one at the front.', effect: (g) => { g.take('fg_tides', 1); g.setStage(LIGHTS, 'done'); rank(g, 2); g.addMarks(120); } },
  // IV. The Guild\'s Word
  fw1: { text: 'The king read the slip. The clerk\'s gone, and the king is grateful, and when a king is grateful he wants something.', next: 'fw2' },
  fw2: { text: 'Commander Ellery of the Guard is coming with an offer. And I\'m sixty-one, and my knee has an opinion about every stair in this building. I\'m done after this.', next: 'fw3' },
  fw3: { text: 'So you\'ll hear her, not me. It\'ll be your Guild to answer for.', effect: (g) => g.setStage(WORD, 'ellery') },
  fwEnd: {
    text: (g) => (g.flag('fgEnd') === 'king'
      ? 'The king\'s colours, then. Better pay, better steel, and the king\'s orders. I hope he\'s a good king for a long time. Captain of the Fighters Guild: the badge is yours.'
      : 'Free. Poor, and free. They\'ll put the Guard\'s rates up to take our caravans, and we\'ll be leaner for a winter. The word holds. Captain of the Fighters Guild: the badge is yours.'),
    effect: (g) => { g.setStage(WORD, 'done'); rank(g, 3); g.addMarks(200); g.give('fg_captain_blade', 1); },
  },
};

const ancrumStart = (g: GameApi): string | null => {
  const f = at(g, FEET), c = at(g, CHAPTER), l = at(g, LIGHTS), w = at(g, WORD);
  if (f === 'back') return 'fjBack';
  if (f === 'done' && !c) return 'fc1';
  if (c === 'back') return jory(g) === 'off' ? 'fcOff' : 'fcRound';
  if (c === 'done' && !l) return 'fl1';
  if (l === 'back') return 'flBack';
  if (l === 'done' && !w) return 'fw1';
  if (w === 'back') return 'fwEnd';
  return null;
};

// ================================================================ Hob Tresidder, the floor

const hobNodes: DialogueTree['nodes'] = {
  fh1: { text: 'New one. Stand there. No, there. Feet apart, weight forward. You\'re standing like you\'re waiting for a cart.', next: 'fh2' },
  fh2: { speaker: 'narrator', text: 'He comes at you three times with a blunt practice sword, slow, then not slow. The third time you\'re on the floor and he\'s offering you a hand.', next: 'fh3' },
  fh3: { text: 'You got up. Most don\'t, the first time: they lie there wondering what happened. That\'s the lesson. Get up.', next: 'fh4' },
  fh4: { text: 'Contract for you. The footpads on the Port Sands have been robbing the cargo as it comes ashore. Four of them, last count. Run them off and the dock pays the Guild, and the Guild pays you.', effect: (g) => g.setStage(FEET, 'sands') },
};

// ================================================================ Jory Kessell, the Gullmouth chapter house

const joryTree: DialogueTree = {
  start: (g) => (at(g, CHAPTER) === 'jory' ? 'j1' : at(g, CHAPTER) === 'done' && jory(g) === 'round' ? 'after' : 'idle'),
  nodes: {
    idle: { text: 'Chapter house. If you\'ve trouble, sit down. If you are trouble, stand up.' },
    after: { text: 'The porters got their rate in the end. One of them bought me a drink. I didn\'t deserve it, and I drank it.' },
    j1: { speaker: 'narrator', text: 'A heavy man with a beard going grey, at a table with a ledger open in front of him and his sword hung on the back of the door, the way you hang a coat.', next: 'j2' },
    j2: { text: 'Treneer sent you. Two months I haven\'t written, so he sends someone. He always did hate a silence.', next: 'j3' },
    j3: {
      text: 'You\'ll want to know about the quay.',
      options: [
        { text: 'Is it the chapter clearing the porters?', next: 'j4' },
        { text: 'I want to know why you stopped writing.', next: 'j4' },
      ],
    },
    j4: { text: 'Same answer. Harrowgate\'s factor came in with a purse and a letter. The chapter\'s roof leaks, I\'ve four swords and no contracts, and the porters were blocking a quay the whole town eats from.', next: 'j5' },
    j5: { speaker: 'narrator', text: 'He pushes the letter across the table. Harrowgate & Daughters\' seal; "for the keeping of the quay clear of obstruction", forty marks a week.', next: 'j6' },
    j6: { text: 'I told myself it wasn\'t breaking a strike. It was keeping a quay. You can tell yourself most things on forty marks a week.', next: 'j7' },
    j7: {
      text: 'So. What are you going to tell Treneer?',
      options: [
        { text: 'Nothing yet. Tear it up, Jory. Give it back to them in pieces.', effect: (g) => { g.setFlag('fgJory', 'round'); g.setStage(CHAPTER, 'back'); }, next: 'r1' },
        { text: 'The truth. He\'ll want this letter.', effect: (g) => { g.setFlag('fgJory', 'off'); g.give('fg_factor_letter', 1); g.setStage(CHAPTER, 'back'); }, next: 'o1' },
      ],
    },
    r1: { speaker: 'narrator', text: 'He looks at you a long while. Then he tears the letter across, and across again, and puts the pieces in an envelope addressed to the factor.', next: 'r2' },
    r2: { text: 'The roof can leak. Tell Treneer I\'ll write. Tell him I\'m sorry. No. I\'ll tell him that myself.' },
    o1: { text: 'He will. Take it. I\'d rather he heard it from somebody who keeps the word than from me.', next: 'o2' },
    o2: { speaker: 'narrator', text: 'He takes his sword off the back of the door, looks at it, and hangs it back up.' },
  },
};

// ================================================================ Commander Joan Ellery, the King\'s Guard

const ellery: DialogueTree = {
  start: () => 'e1',
  nodes: {
    e1: { text: 'Commander Ellery, the King\'s Guard. You\'re the one who found the tide slip. The king remembers a favour. It\'s one of his better qualities.', next: 'e2' },
    e2: { text: 'Here is his offer. The Fighters Guild under the Guard\'s colours. The king\'s pay, which is twice what the farms pay you. The king\'s steel from the castle forge. And the king\'s orders.', next: 'e3' },
    e3: {
      text: 'You\'d still train the caravans. You\'d still hire to the boats. And when the king needs a quay cleared, or a debt collected, you\'d be the swords he sends. That\'s what a guard is.',
      options: [
        { text: 'Then we\'ll take the king\'s colours.', effect: (g) => { g.setFlag('fgEnd', 'king'); g.setStage(WORD, 'back'); }, next: 'k1' },
        { text: 'The Guild keeps its word, and keeps it free. Thank the king.', effect: (g) => { g.setFlag('fgEnd', 'free'); g.setStage(WORD, 'back'); }, next: 'f1' },
        { text: 'Would he ever send us to break a strike?', next: 'q1' },
      ],
    },
    q1: { text: 'I won\'t lie to you. He hasn\'t yet. He\'s a king. One day he\'ll need to, and on that day he won\'t ask.', next: 'e3' },
    k1: { text: 'Good. The forge will send blades by the end of the month. Tell Treneer he can rest his knee.' },
    f1: { speaker: 'narrator', text: 'She nods, as if she\'d expected it, and maybe hoped it.', next: 'f2' },
    f2: { text: 'He\'ll be sorry. I won\'t. Somebody in this town should be able to say no to him.' },
  },
};

// ================================================================ Quests

const quests: Record<string, QuestDef> = {
  [FEET]: {
    id: FEET, name: 'Feet First', region: 'verandah', depth: 'storyline',
    notes: (g, s) => ({
      floor: 'Ancrum Treneer will take me into the Fighters Guild if Hob Tresidder, the trainer, says I\'ll do.',
      sands: 'Hob gave me a first contract: run the footpads off the Port Sands, where Verandah\'s cargo comes ashore.',
      back: 'The Port Sands are clear. Back to Ancrum Treneer.',
      done: 'I\'m an Initiate of the Fighters Guild, and I gave my word: never to collect a debt, never to break a strike.',
    } as Record<string, string>)[s ?? ''] ?? '',
    objectives: (g, s) => (s === 'floor' ? [{ text: 'Let Hob Tresidder try you on the floor', marker: 'ver_tresidder' }]
      : s === 'sands' ? [{ text: `Run the footpads off the Port Sands (${Math.min(4, kills(g, 'fgSands'))}/4)`, marker: 'fgSandsSpot' }]
      : s === 'back' ? [{ text: 'Go back to Ancrum Treneer', marker: 'ver_treneer' }] : []),
    advance: (g, s) => (s === 'sands' && kills(g, 'fgSands') >= SANDS.length ? 'back' : null),
    marks: (g, s): Marks => (!s ? { ver_treneer: '!' } : s === 'floor' ? { ver_tresidder: '?' } : s === 'back' ? { ver_treneer: '?' } : {}),
    walk: { cast: ['ver_treneer', 'ver_tresidder'], auto: { sands: 'back' } },
  },
  [CHAPTER]: {
    id: CHAPTER, name: 'The Gullmouth Chapter', region: 'saltwind', depth: 'storyline',
    notes: (g, s) => (s === 'jory' ? 'The Guild\'s chapter house at Gullmouth has been silent two months, and swords have been clearing striking porters off the quay. Ancrum wants to know if it\'s Jory Kessell, and why.'
      : s === 'back' ? (jory(g) === 'off' ? 'Jory took Harrowgate\'s money to keep the quay clear. I\'m taking the factor\'s letter to Ancrum.' : 'Jory took Harrowgate\'s money, and tore up their contract when I asked him to. I should tell Ancrum.')
      : s === 'done' ? 'The Gullmouth chapter keeps the Guild\'s word again. I\'m a Sword of the Guild.' : ''),
    objectives: (g, s) => (s === 'jory' ? [{ text: 'Find Jory Kessell at the chapter house, on the Gullmouth quay', marker: 'fg_jory' }] : s === 'back' ? [{ text: 'Go back to Ancrum Treneer in Verandah', marker: 'ver_treneer' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, FEET) ? { ver_treneer: '!' } : {}) : s === 'jory' ? { fg_jory: '?' } : s === 'back' ? { ver_treneer: '?' } : {}),
    walk: { from: { quests: { [FEET]: 'done' }, flags: { 'fac:fighters': 0 } }, cast: ['ver_treneer', 'fg_jory'] },
  },
  [LIGHTS]: {
    id: LIGHTS, name: 'Wreckers\' Lights', region: 'verandah', depth: 'storyline',
    notes: (g, s) => (s === 'head' ? 'The King\'s Dock has hired the Guild against the wreckers lighting false lamps on Awschitz Head. Clear them off, and bring Ancrum whatever they carried.'
      : s === 'search' ? 'The wreckers on the Head are gone. Their leader dropped something by the lamp.'
      : s === 'back' ? 'On the wreckers\' leader, a slip of ships and tides, in a clerk\'s hand. For Ancrum.'
      : s === 'done' ? 'The tide slip went to the king, sealed, by Ancrum\'s hand. I\'m a Shieldbearer of the Guild.' : ''),
    objectives: (g, s) => (s === 'head' ? [{ text: `Clear the wreckers off Awschitz Head (${Math.min(4, kills(g, 'fgWreck'))}/4)`, marker: 'fgHeadSpot' }]
      : s === 'search' ? [{ text: 'Search by the wreckers\' lamp', marker: 'fgNote' }]
      : s === 'back' ? [{ text: 'Bring the slip to Ancrum Treneer', marker: 'ver_treneer' }] : []),
    advance: (g, s) => (s === 'head' && kills(g, 'fgWreck') >= HEAD.length ? 'search' : null),
    marks: (g, s): Marks => (!s ? (done(g, CHAPTER) ? { ver_treneer: '!' } : {}) : s === 'back' ? { ver_treneer: '?' } : {}),
    walk: { from: { quests: { [FEET]: 'done', [CHAPTER]: 'done' }, flags: { 'fac:fighters': 1 } }, auto: { head: 'search' } },
  },
  [WORD]: {
    id: WORD, name: 'The Guild\'s Word', region: 'verandah', depth: 'storyline',
    notes: (g, s) => (s === 'ellery' ? 'Commander Joan Ellery of the King\'s Guard has come to the Guild with the king\'s offer, and Ancrum, retiring, has left the answer to me.'
      : s === 'back' ? 'I\'ve given Ellery the Guild\'s answer. Ancrum is waiting.'
      : s === 'done' ? (g.flag('fgEnd') === 'king' ? 'The Fighters Guild wears the king\'s colours now, and I\'m its Captain.' : 'The Fighters Guild stays free, and keeps its word. I\'m its Captain.') : ''),
    objectives: (g, s) => (s === 'ellery' ? [{ text: 'Hear Commander Ellery out, at the Guild', marker: 'fg_ellery' }] : s === 'back' ? [{ text: 'Talk to Ancrum Treneer', marker: 'ver_treneer' }] : []),
    marks: (g, s): Marks => (!s ? (done(g, LIGHTS) ? { ver_treneer: '!' } : {}) : s === 'ellery' ? { fg_ellery: '?' } : s === 'back' ? { ver_treneer: '?' } : {}),
    walk: { from: { quests: { [FEET]: 'done', [CHAPTER]: 'done', [LIGHTS]: 'done' }, flags: { 'fac:fighters': 2 } }, cast: ['ver_treneer', 'fg_ellery'] },
  },
};

// ================================================================ The world

const spawns: QuestSpawn[] = [
  { tag: 'fgSands', type: 'footpad', at: SANDS, when: (g) => at(g, FEET) === 'sands' },
  { tag: 'fgWreck', type: 'wrecker', at: HEAD, when: (g) => at(g, LIGHTS) === 'head' },
];

const things: WorldThing[] = [
  { id: 'fgSandsSpot', x: SANDS[0][0], z: SANDS[0][1], label: 'The Port Sands', radius: 0, look: 'none', when: () => false },
  { id: 'fgHeadSpot', x: HEAD[0][0], z: HEAD[0][1], label: 'Awschitz Head', radius: 0, look: 'none', when: () => false },
  {
    id: 'fgNote', x: NOTE.x, z: NOTE.z, label: 'Search by the wreckers\' lamp', radius: 2.4, look: 'letter',
    when: (g) => at(g, LIGHTS) === 'search',
    use: (g) => {
      if (!g.give('fg_tides', 1)) { g.toast('Your pack is full.'); return; }
      g.setStage(LIGHTS, 'back');
      g.toast('Under the shuttered lamp, folded small and kept dry in oilcloth: a slip of ships and dates and tides, in a neat clerk\'s hand.');
    },
  },
];

const LOOK_JORY = { skin: '#d8a07a', hair: '#7a7268', hairStyle: 0, beard: true, eyes: '#3a4a5a', tunic: '#5a2a24', trim: '#8a8a7a', trousers: '#2a2620', boots: '#1e1a16', build: 1.3, age: 0.6 };
const LOOK_ELLERY = { frame: 'f' as const, skin: '#c88a62', hair: '#2a1e16', hairStyle: 4, eyes: '#3a2a1e', tunic: '#7a2a24', trim: '#d8b04a', trousers: '#2a2620', boots: '#1e1a16', cape: '#7a2a24', lashes: true, build: 1.05, age: 0.45, scar: true };

const NPCS_F: NpcDef[] = [
  { id: 'fg_jory', name: 'Jory Kessell', title: 'Master of the Gullmouth chapter, the Fighters Guild', look: LOOK_JORY, schedule: [{ from: 0, to: 24, at: [JORY.x, JORY.z], face: [JORY.x, JORY.z - 3], anim: 'idle' }], barks: ['The roof leaks.', 'Sit, if you\'ve trouble.'] },
  { id: 'fg_ellery', name: 'Commander Joan Ellery', title: 'The King\'s Guard', look: LOOK_ELLERY, schedule: [{ from: 0, to: 24, at: [HALL.x + 2, HALL.z + 1.5], face: [HALL.x, HALL.z], anim: 'idle' }], when: (g) => at(g, WORD) === 'ellery' },
];

const ITEMS_F: ItemDef[] = [
  { id: 'fg_badge', name: 'Fighters Guild badge', kind: 'collectible', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'coin', a: '#8a8a7a', b: '#5a2a24' }, desc: 'Pewter, a crossed sword and gaff, worn smooth on the back where it sits against the coat. Every Initiate is given one, and the word that goes with it.' },
  { id: 'fg_factor_letter', name: 'Harrowgate\'s letter to Jory Kessell', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'scroll', a: '#e8dcc0' }, desc: 'Harrowgate & Daughters\' seal: "for the keeping of the quay clear of obstruction", forty marks a week, to the Gullmouth chapter.' },
  { id: 'fg_tides', name: 'A slip of tides', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'scroll', a: '#e8dcc0' }, desc: 'Ships, dates and the tides they would come in on, in a neat clerk\'s hand, from a wrecker on Awschitz Head.' },
  {
    id: 'fg_captain_blade', name: 'The Guild captain\'s sword', kind: 'weapon', rarity: 'epic', stack: false, value: 400, icon: { shape: 'sword', a: '#c8ccd0', b: '#5a2a24' },
    desc: 'Plain, heavy and very well kept: the sword every captain of the Fighters Guild has carried since the second raid. There is a nick in the blade nobody has ever ground out.',
    weapon: { damage: 7, speed: 1, held: 'sword', crit: 0.03 }, stats: 'Damage +7, critical hits +3%.',
  },
];

export const FIGHTERS_GUILD: RegionContent = {
  id: 'fightersGuild',
  items: ITEMS_F,
  npcs: NPCS_F,
  dialogue: { fg_jory: joryTree, fg_ellery: ellery },
  quests,
  spawns,
  things,
  hooks: (D) => {
    // (Hob has had only his barks till now: he gets a word of his own)
    D.ver_tresidder ??= { start: () => 'idle', nodes: { idle: { text: 'Feet first. The sword follows the feet. Come back when you\'ve joined, and I\'ll show you.' } } };
    const a = D.ver_treneer, h = D.ver_tresidder;
    if (a) {
      const s0 = a.start;
      a.start = (g) => ancrumStart(g) ?? (typeof s0 === 'function' ? s0(g) : s0);
      Object.assign(a.nodes, ancrumNodes);
      addOption(D, 'ver_treneer', 'hello', { text: 'I want to join the Guild.', cond: (g) => !at(g, FEET), next: 'fj1' });
    }
    if (h) {
      const s0 = h.start;
      h.start = (g) => (at(g, FEET) === 'floor' ? 'fh1' : typeof s0 === 'function' ? s0(g) : s0);
      Object.assign(h.nodes, hobNodes);
    }
  },
};
