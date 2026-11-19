import type { DNode } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// THE SILENT WATERS, Verandah's main storyline (OWED 97x, docs/VERANDAH.md section 3). Chapters 1 and 2, the grounded
// start: a missing boat and a lost ship, which look like two pieces of bad luck and aren't.
//
// swGrace, 1: THE LITTLE GRACE (Tegen Hocking, fishmonger): her brother Petroc is two days late in the Little Grace, a
// Vyvyan boat named for old Grace, in fair weather. Kerra Nance says he fished the grounds off the Fortress, and that
// three boats have gone from those grounds since spring, all in fair weather; what the harbour loses, the tide sets
// onto the Long Sands. There, past the crabs, the Little Grace's dan buoy and her nets, and the net ropes cut clean
// with a knife. Nobody cuts their own nets. Tell Tegen the truth, or ([Kind]) tell her only that you're still looking.
// swGrace = 'truth' | 'gentle'.
//
// swIntent, 2: LATE CARGO (Grace Vyvyan, after chapter 1): the Good Intent, a Vyvyan salt ship, is posted lost at sea in
// fair weather, and Lewis Tregarthen is paying the insurance on her with unusual speed. Grace wants her papers checked.
// Hugh Carne's clearance says she crossed the bar on the night tide of the ninth; Kerra Nance says nothing crossed the
// bar that night, because she was on it. Press Hugh, who admits the clearance came to him already written, or leave him
// be. Grace: "Then she never sailed from my harbour. So where is she?" swIntent = 'pressed' | 'spared'.
// Chapter 3, False Lights, starts with Captain Morvah.

const GRACE_Q = 'swGrace', INTENT = 'swIntent';
const GEAR = { x: -2632.5, z: 2150.5 };
const CRABS: [number, number][] = [[-2628, 2146], [-2637, 2147]];

// ================================================================ 1: The Little Grace

const tegenNodes: Record<string, DNode> = {
  t1: { speaker: 'narrator', text: 'Tegen isn\'t calling her fish today. She is gutting mackerel without looking at them, and looking instead at the harbour mouth, where nothing is coming in.', next: 't2' },
  t2: { text: 'My brother Petroc. He went out in the Little Grace on Tuesday\'s tide for the pilchards, and he was due in Wednesday night, and it\'s Friday. The weather\'s been like milk all week. You could row to the Counties in it.', next: 't3' },
  t3: {
    text: 'The Board says wait. The guard says wait. I\'ve waited. Would you ask Kerra Nance where he was fishing? The pilots see every boat go out. I can\'t leave the stall, or we don\'t eat.',
    options: [{ text: 'I\'ll ask Kerra.', effect: (g) => g.setStage(GRACE_Q, 'kerra') }, { text: 'Not now, Tegen.' }],
  },
  tb1: { speaker: 'narrator', text: 'Tegen puts the knife down when she sees what you\'re carrying, and wipes her hands, and wipes them again.', next: 'tb2' },
  tb2: {
    text: 'That\'s his dan. That\'s Petroc\'s. He painted the flag himself, the fool, and spelt Grace with an S. What else did you find?',
    options: [
      { text: 'His nets, on the sand. The ropes were cut with a knife. Somebody took the boat, Tegen. Somebody took him.', moral: { id: 'swGrace:truth', tr: { honesty: 3 }, npc: { ver_fish_tegen: 10 } }, effect: (g) => { g.take('sw_dan', 1); g.setFlag(GRACE_Q, 'truth'); g.addMarks(80); g.setStage(GRACE_Q, 'done'); }, next: 'tbT' },
      { text: 'Only the buoy. I\'m still looking. I\'ll keep looking.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'swGrace:gentle', tr: { compassion: 2, deception: 1 }, npc: { ver_fish_tegen: 15 } }, effect: (g) => { g.take('sw_dan', 1); g.setFlag(GRACE_Q, 'gentle'); g.addMarks(80); g.setStage(GRACE_Q, 'done'); }, next: 'tbG' },
    ],
  },
  tbT: { text: 'Took him. Took him where? Who takes a pilchard boat? There\'s nothing in her worth a mark but the nets, and they left the nets. No. I heard you. I\'m not saying you\'re wrong. I\'m saying it doesn\'t make sense, and when it does, I want to know.' },
  tbG: { speaker: 'narrator', text: 'Tegen nods, and nods again, and goes back to the mackerel. After a while she says, without looking up, "Thank you for looking." Then: "Keep looking." She keeps the dan on the stall, propped against the scales, with its badly spelt flag.' },
  tAfter: {
    text: (g) => (g.flag(GRACE_Q) === 'truth'
      ? 'Somebody took him. I say it every morning, to get used to it. It doesn\'t get easier. But it\'s better than waiting for a boat that won\'t come.'
      : 'Still looking? Good. So am I. Every sail at the harbour mouth, I look.'),
  },
};

const kerraNodes: Record<string, DNode> = {
  pk1: { text: 'Petroc Hocking. The Little Grace. He went out on Tuesday\'s tide for the pilchards on the grounds off the Fortress, north of the bar, where they always go. I watched him out. Fair wind, flat sea.', next: 'pk2' },
  pk2: { text: 'He\'s the third. The Swallow went off those grounds in April and the Sweet Promise in July. Fair weather, every time. No wreck, no body, no plank. The Board says the Black Gulls. The Black Gulls haven\'t got a boat that can catch a pilchard boat with the wind behind her.', next: 'pk3' },
  pk3: { text: 'What the harbour loses, the tide carries east onto the Long Sands. My buoy went there. If anything of the Little Grace came ashore, it\'ll be there.', options: [{ text: 'I\'ll search the Long Sands.', effect: (g) => g.setStage(GRACE_Q, 'sands') }] },
};

// ================================================================ 2: Late Cargo

const graceNodes: Record<string, DNode> = {
  i1: { text: 'You went looking for Petroc Hocking when the Board told everyone to wait. Good. Then you\'ll look at this. The Good Intent. Mine. Salt for Morrow, two hundred tons, posted lost at sea three days out, in weather you could have sailed a washtub in.', next: 'i2' },
  i2: { text: 'Lewis Tregarthen insured her, and he\'s paying the claim. Today. In full. Lewis Tregarthen has never paid anything in full on the day in his life. I want her papers checked by somebody who doesn\'t sit on my Board.', next: 'i3' },
  i3: { text: 'Take her clearance to Hugh Carne at the Customs and ask him to read it to you. Then ask Kerra Nance whether it\'s true.', options: [{ text: 'I\'ll take them.', effect: (g) => { g.give('sw_papers', 1); g.setStage(INTENT, 'hugh'); } }, { text: 'Not now.' }] },
  ib1: {
    text: (g) => (g.flag(INTENT) === 'pressed'
      ? 'Already written. Brought to him by somebody he won\'t name, for a ship that never crossed the bar, and Hugh Carne stamped it. Then the Good Intent never sailed from my harbour. So where is she?'
      : 'Stamped on the ninth for the night tide, and Kerra Nance on the bar all night saying nothing crossed it. Then the Good Intent never sailed from my harbour. So where is she?'),
    next: 'ib2',
  },
  ib2: {
    text: 'I\'m not going to the Board with this. Half the Board is Lewis Tregarthen\'s friends and the other half owe him money. Go to Captain Morvah at Awschitz. She hates the Board more than I do. Here, for your trouble, and keep those papers safe.',
    options: [{ text: 'I\'ll go to Awschitz.', effect: (g) => { g.addMarks(90); g.setStage(INTENT, 'done'); } }],
  },
};

const hughNodes: Record<string, DNode> = {
  ci1: { speaker: 'narrator', text: 'Hugh Carne reads the clearance through twice, holding it close to the lamp, then turns his own ledger back a fortnight and runs his finger down a column.', next: 'ci2' },
  ci2: { text: 'The Good Intent, Vyvyan, master Ralph Truscott, two hundred tons of salt for Callis, cleared on the night of the ninth to cross the bar on the night tide. Duty paid. My stamp. My hand. It\'s in order.', options: [{ text: 'Thank you, Hugh.', effect: (g) => g.setStage(INTENT, 'kerra') }] },
  hp1: {
    text: 'Kerra was on the bar all night? Then she\'s wrong, or she slept.',
    options: [
      { text: 'Kerra Nance doesn\'t sleep on the bar, Hugh. Who brought you that clearance?', moral: { id: 'swIntent:pressed', tr: { courage: 2, honesty: 1 }, npc: { vh_hugh: -10 } }, effect: (g) => { g.setFlag(INTENT, 'pressed'); g.setStage(INTENT, 'grace'); }, next: 'hp2' },
      { text: 'Perhaps she did. I\'ll tell Grace what the papers say.', moral: { id: 'swIntent:spared', tr: { compassion: 1 }, npc: { vh_hugh: 10 } }, effect: (g) => { g.setFlag(INTENT, 'spared'); g.setStage(INTENT, 'grace'); }, next: 'hp4' },
    ],
  },
  hp2: { speaker: 'narrator', text: 'Hugh shuts the ledger. For a moment you think he\'ll say nothing. Then, very quietly, to the cask head rather than to you:', next: 'hp3' },
  hp3: { text: 'It came already written. In a good hand, on the right paper, with the duty in coin on top of it. I stamped it. I stamp a hundred a week. I don\'t ask who brings them, because the Collector who asks who brings them stops being the Collector. Don\'t ask me again. Please.' },
  hp4: { text: 'Thank you. It\'s in order. It\'s all in order.' },
};

const kerraIntentNodes: Record<string, DNode> = {
  ki1: {
    text: (g) => (g.flag('vhBuoy') === 'guild'
      ? 'The night of the ninth? My boys and I were out on the bar with a lantern and a whistle every night that fortnight, after somebody let my buoy go. Nothing crossed that bar on the night of the ninth. Not the Good Intent, not a rowing boat, not a gull.'
      : 'The night of the ninth? I took the Morrow packet in over the bar at eleven, and sat in the pilot boat till the tide turned, because I had a bad feeling. Nothing crossed that bar on the night of the ninth. Not the Good Intent, not a rowing boat, not a gull.'),
    next: 'ki2',
  },
  ki2: { text: 'If Hugh\'s stamp says she went out, Hugh\'s stamp is wrong. Ask him how.', options: [{ text: 'I will.', effect: (g) => g.setStage(INTENT, 'press') }] },
};

const quests: Record<string, QuestDef> = {
  [GRACE_Q]: {
    id: GRACE_Q, name: 'The Silent Waters: The Little Grace', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'kerra') return 'Tegen Hocking\'s brother Petroc is two days late in the Little Grace, in fair weather. Kerra Nance, the pilot at the pier end, will know where he was fishing.';
      if (s === 'sands') return 'Petroc fished the grounds off the Fortress, and he\'s the third boat lost there since spring, all in fair weather. What the harbour loses comes ashore on the Long Sands.';
      if (s === 'tegen') return 'The Little Grace\'s dan buoy, and her nets, their ropes cut with a knife. Back to Tegen at the fish stalls.';
      return g.flag(GRACE_Q) === 'truth' ? 'I told Tegen that somebody took her brother.' : 'I told Tegen I\'m still looking.';
    },
    objectives: (g, s) => (s === 'kerra' ? [{ text: 'Ask Kerra Nance at the pier end', marker: 'vh_kerra' }]
      : s === 'sands' ? [
        { text: `Clear the crabs (${Math.min(CRABS.length, killed(g, 'swCrabs'))}/${CRABS.length})`, done: killed(g, 'swCrabs') >= CRABS.length },
        { text: 'Search the Long Sands', marker: 'swGear', done: !!g.flag('swGear') },
      ]
      : s === 'tegen' ? [{ text: 'Go back to Tegen Hocking at the fish stalls', marker: 'ver_fish_tegen' }] : []),
    advance: (g, s) => (s === 'sands' && g.flag('swGear') ? 'tegen' : null),
    marks: (_g, s): Marks => (!s ? { ver_fish_tegen: '!' } : s === 'kerra' ? { vh_kerra: '?' } : s === 'tegen' ? { ver_fish_tegen: '?' } : {}),
    walk: { cast: ['ver_fish_tegen', 'vh_kerra'], kill: { sands: [['crab', 2]] } },
  },
  [INTENT]: {
    id: INTENT, name: 'The Silent Waters: Late Cargo', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'hugh') return 'The Good Intent, a Vyvyan salt ship, is posted lost in fair weather, and Lewis Tregarthen is paying her insurance at once. Grace Vyvyan wants Hugh Carne at the Customs to read her clearance.';
      if (s === 'kerra') return 'Hugh\'s clearance says the Good Intent crossed the bar on the night tide of the ninth. Ask Kerra Nance whether she did.';
      if (s === 'press') return 'Kerra says nothing crossed the bar that night. Back to Hugh Carne.';
      if (s === 'grace') return 'Back to Grace Vyvyan on the pier.';
      return 'The Good Intent never sailed from Verandah. Grace Vyvyan sent me to Captain Morvah at Awschitz.';
    },
    objectives: (_g, s) => (s === 'hugh' || s === 'press' ? [{ text: 'Talk to Hugh Carne in the warehouse', marker: 'vh_hugh' }]
      : s === 'kerra' ? [{ text: 'Ask Kerra Nance at the pier end', marker: 'vh_kerra' }]
      : s === 'grace' ? [{ text: 'Go back to Grace Vyvyan on the pier', marker: 'vh_grace' }] : []),
    marks: (g, s): Marks => (!s && at(g, GRACE_Q) === 'done' ? { vh_grace: '!' } : s === 'hugh' || s === 'press' ? { vh_hugh: '?' } : s === 'kerra' ? { vh_kerra: '?' } : s === 'grace' ? { vh_grace: '?' } : {}),
    walk: { cast: ['vh_grace', 'vh_hugh', 'vh_kerra'], from: { quests: { swGrace: 'done' }, flags: { swGrace: 'truth' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'swCrabs', type: 'crab', at: CRABS, when: (g) => at(g, GRACE_Q) === 'sands' },
];

const things: WorldThing[] = [
  {
    id: 'swGear', x: GEAR.x, z: GEAR.z, label: 'Look at what came ashore', radius: 2.4, look: 'cloth',
    when: (g) => at(g, GRACE_Q) === 'sands' && !g.flag('swGear'),
    use: (g) => {
      if (killed(g, 'swCrabs') < CRABS.length) { g.toast('The crabs have found it first.'); return; }
      g.setFlag('swGear', 1); g.give('sw_dan', 1);
      g.toast('A dan buoy, a cork float on a pole with a rag of flag, painted LITTLE GRASE in a careful, wrong hand. Tangled round it, a fleet of pilchard nets, sodden and whole. Every rope that held them to a boat has been cut through, clean, with a knife.');
    },
  },
];

const ITEMS: ItemDef[] = [
  { id: 'sw_dan', name: 'The Little Grace\'s dan', kind: 'quest', rarity: 'common', stack: false, value: 0, icon: { shape: 'torch', a: '#b8322a', b: '#c8a060' }, desc: 'A cork float on a pole with a flag painted LITTLE GRASE. Found on the Long Sands, tangled in nets whose ropes were cut.' },
  { id: 'sw_papers', name: 'The Good Intent\'s papers', kind: 'quest', rarity: 'uncommon', stack: false, value: 0, icon: { shape: 'letter', a: '#e8e0d0', b: '#8a2a22' }, desc: 'The Good Intent\'s clearance, stamped by the Customs on the ninth for the night tide, and Tregarthen\'s policy on her hull and cargo.' },
];

export const SILENT_WATERS: RegionContent = {
  id: 'silentWaters',
  items: ITEMS,
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'ver_fish_tegen', (g) => (at(g, GRACE_Q) === 'tegen' ? 'tb1' : undefined), tegenNodes);
    addOption(D, 'ver_fish_tegen', 'hello', { text: 'You\'re watching the harbour mouth, Tegen.', cond: (g) => !at(g, GRACE_Q), next: 't1' });
    addOption(D, 'ver_fish_tegen', 'hello', { text: 'About Petroc.', cond: (g) => at(g, GRACE_Q) === 'done' && at(g, 'swKeep') !== 'done', next: 'tAfter' });
    hook(D, 'vh_kerra', (g) => (at(g, GRACE_Q) === 'kerra' ? 'pk1' : at(g, INTENT) === 'kerra' ? 'ki1' : undefined), { ...kerraNodes, ...kerraIntentNodes });
    hook(D, 'vh_grace', (g) => (at(g, INTENT) === 'grace' ? 'ib1' : undefined), graceNodes);
    addOption(D, 'vh_grace', 'hello', { text: 'You look as if you\'ve lost something bigger than a boat.', cond: (g) => at(g, GRACE_Q) === 'done' && !at(g, INTENT), next: 'i1' });
    hook(D, 'vh_hugh', (g) => (at(g, INTENT) === 'hugh' ? 'ci1' : at(g, INTENT) === 'press' ? 'hp1' : undefined), hughNodes);
  },
};
