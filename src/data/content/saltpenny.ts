import type { DialogueTree, GameApi } from '../../game/api';
import type { ItemDef } from '../items';
import type { QuestDef } from '../quests';
import type { ShopDef } from '../shops';
import { at, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import { GIL_CLEAR } from './justice';
import { DUELISTS, LADDER_PRIZE } from '../duels';
import { BIGHT, BIGHT_BOAT, SALT_COCKPIT, SALT_FLOOR, SALT_HULLS, SALT_PIERS, SALTPENNY } from '../../world/morrow';

// SALTPENNY KEY, the Brethren's city of wrecks at the far end of the Keys (world/sites.ts
// buildSaltpenny, docs/MORROW.md). The Brethren are a free company of captains who answer to no
// Charter and no Assembly, and run anything that pays more untaxed. Ned Vey speaks for them at the
// Captains' Table. Their people come from everywhere, and their names do too.
//
// THE THIRD DAUGHTER, chapter XIX, What Pays. The Kittiwake carries the black to Callis. Her master,
// Mara Coyle, loads it in the north and won't say where: cargo is the Table's business. Ned Vey will
// tell, for a price: burn the boat of the Key wreckers Pryce has started using to run black past the
// Brethren, or owe him a favour (flag tdFavour, for the ending). The black loads at Cold Harbour, under
// the Greywaste cliffs; diggers bring it down from the barrows, and Pryce went north with the last load.
//
// Side: Dinah Lowry, who draws maps, and the treasure-map questline the Brethren tell stories about:
// dinahSalt (a map of the key itself), dinahKeys (two of the Keys, and a page of Ysolde Gale's log in
// the second chest), dinahGale (Gale's own hoard by Heron Mere). After it, Dinah sells maps of every
// region in Morrow. Gale was the first of the Brethren, sixty years dead.

const SALT = 'tdSalt', D1 = 'dinahSalt', D2 = 'dinahKeys', D3 = 'dinahGale';
const ACT = 'The Third Daughter';
const F = SALT_FLOOR, H = SALT_HULLS, SX = SALTPENNY.x, SZ = SALTPENNY.z;
const zc = (h: { z: number }) => h.z + 0.5;
const WRECKERS = 5;
const wreckers = (g: GameApi) => Math.min(WRECKERS, killed(g, 'bight'));
/** Dug since Dinah handed it over (a map of the same name may have been dug before, from a chest). */
const dugSince = (g: GameApi, map: string) => Number(g.flag('dug:' + map) ?? 0) > Number(g.flag('dinahBase:' + map) ?? 0);

// ================================================================ Chapter XIX

const mara: DialogueTree = {
  start: (g) => (at(g, SALT) === 'sail' ? 'k1' : at(g, SALT) === 'done' ? 'kDone' : 'k0'),
  nodes: {
    k0: { text: 'Mara Coyle. The Kittiwake sails when she\'s loaded and not before. Ask me again when she\'s loaded.' },
    k1: { text: 'Mara Coyle, master of the Kittiwake. If the Assembly sent you, I\'ve been paid. If Harrowgate sent you, I\'ve been paid twice.', next: 'k2' },
    k2: {
      text: 'So which is it?',
      options: [
        { text: 'Where do you load the black?', next: 'k3' },
        { text: 'Neither. I\'m looking for Aubrey Pryce.', next: 'k5' },
      ],
    },
    k3: { text: 'North. That\'s as far as I go for free. Cargo\'s the Table\'s business, and the Table is Ned Vey.', next: 'k4' },
    k4: { text: 'The Captains\' Table, the hull with the long table in it. He\'ll be sitting at the head of it. He always is.', effect: (g) => g.setStage(SALT, 'vey') },
    k5: { text: 'Then you\'re looking north as well. Everything I know about Pryce is cargo, and cargo is the Table\'s business.', next: 'k4' },
    kDone: { text: 'Cold Harbour. I hate the place. The diggers don\'t sing, and diggers always sing.' },
  },
};

const ned: DialogueTree = {
  start: (g) => {
    const s = at(g, SALT);
    if (s === 'vey') return 'n1';
    if (s === 'bight') return 'nBight';
    if (s === 'told') return 't1';
    if (s === 'done') return 'nDone';
    return 'n0';
  },
  nodes: {
    n0: { text: 'Ned Vey. I speak for the captains, when they let me. Have a drink at the Mast. Don\'t have a fight at the Mast.' },
    n1: { text: 'Ned Vey. I speak for the captains. You\'re the one the Speaker in Callis has been writing letters about.', next: 'n2' },
    n2: { text: 'You want to know where the black loads, and who\'s digging it. Everybody here knows. Nobody\'s been paid to tell you.', next: 'n3' },
    n3: {
      text: 'So. What are you paying with?',
      options: [
        { text: 'What do you want?', next: 'n4' },
        { text: 'You\'re carrying grave-stone to hold up a city.', next: 'n3b' },
      ],
    },
    n3b: { text: 'We\'re carrying what pays. If it\'s grave-stone, it pays very well. Nobody\'s ever paid us to think about it.', next: 'n3' },
    n4: { text: 'Pryce has started running black past us. Key wreckers, out of a cove east of here. They don\'t fly our colours.', next: 'n4b' },
    n4b: { text: 'They undercut us, and they sink anyone who asks why. Two of mine, this summer.', next: 'n5' },
    n5: {
      text: 'Deal with them, and I\'ll tell you what you came for. Or owe me. I\'m easy either way.',
      options: [
        { text: 'I\'ll deal with the wreckers.', next: 'n6', effect: (g) => g.setStage(SALT, 'bight') },
        { text: 'I\'ll owe you a favour.', next: 'n7', effect: (g) => { g.setFlag('tdFavour', true); g.setStage(SALT, 'told'); } },
      ],
    },
    n6: { text: 'Wreckers\' Bight, on a key east along the causeway. Burn their boat. Whoever\'s still standing will understand.' },
    n7: { text: 'A favour. One day a captain of mine will come and ask you for something, and you\'ll do it, and you won\'t ask why.', next: 'n8' },
    n8: { text: 'I\'d rather have that than a burnt boat, to be honest. Boats are cheap.', next: 't1' },
    nBight: { text: (g) => (wreckers(g) >= WRECKERS && !g.flag('bightBurnt') ? 'And the boat? A wrecker with a boat is a wrecker again by Tuesday.' : 'Wreckers\' Bight, east along the causeway. Burn the boat.') },
    t1: { text: 'Cold Harbour. A cove under the Greywaste cliffs, two days north of Callis with a fair wind.', next: 't2' },
    t2: { text: 'Diggers bring the black down to the shingle in carts. A long man with Harrowgate paper pays them and signs for every load.', next: 't3' },
    t3: { text: 'Pryce. Yes. He went up with the last load, a month back, and didn\'t come down.', next: 't4' },
    t4: { text: 'The diggers say the dead got up where they were digging. Diggers say a lot of things. They\'ve also stopped coming down.', next: 't5' },
    t5: { text: 'We carry what pays. If the dead are walking, nothing pays. Go and look, and tell me what you see.', effect: (g) => { g.addMarks(300); g.setFlag('coldFerry', true); g.setStage(SALT, 'done'); } },
    nDone: { text: 'Cold Harbour. And if you see Pryce, tell him the Table wants a word with him. A long one.' },
  },
};

// ================================================================ Dinah Lowry and the maps

const dinah: DialogueTree = {
  start: (g) => {
    if (at(g, D1) === 'back') return 'a3';
    if (at(g, D1) === 'dig') return 'aWait';
    if (at(g, D2) === 'back') return 'b3';
    if (at(g, D2) === 'dig') return 'bWait';
    if (at(g, D1) === 'done' && !at(g, D2)) return 'b1';
    if (at(g, D3) === 'back') return 'c3';
    if (at(g, D3) === 'dig') return 'cWait';
    if (at(g, D2) === 'done' && !at(g, D3)) return 'c1';
    if (at(g, D3) === 'done') return 'z0';
    return 'a0';
  },
  nodes: {
    a0: {
      text: 'Dinah Lowry. I draw maps. I don\'t sell them to people who can\'t read them.',
      options: [
        { text: 'Then teach me.', next: 'a1' },
        { text: 'What sort of maps?', next: 'a0b' },
        { text: 'Bye.' },
      ],
    },
    a0b: { text: 'The sort with an X. Wreckers talk in their cups, and drowned men keep charts. I listen, and I copy.', next: 'a0' },
    a1: { text: 'There\'s no teaching it. Here: Saltpenny Key, drawn by me, with an X on it. Dig where the X is and bring me what you find.', next: 'a2', effect: (g) => { g.give('tmap_salt'); g.setStage(D1, 'dig'); } },
    a2: { text: 'The map\'s the right way up. Most people don\'t check.' },
    aWait: { text: 'Behind the piers, on the lee side. The map\'s the right way up.' },
    a3: { text: 'A tin of my own buttons, buried before you were born. You can read a map.', effect: (g) => { g.addMarks(40); g.setStage(D1, 'done'); } },
    b1: { text: 'Now a real one. Two, in fact. The Keys, both drawn from what wreckers told me when they\'d had enough to tell it.', next: 'b2' },
    b2: {
      text: 'Dig them both. Bring me whatever isn\'t coin.',
      effect: (g) => {
        for (const m of ['tmap_keys_1', 'tmap_keys_2']) { g.setFlag('dinahBase:' + m, Number(g.flag('dug:' + m) ?? 0)); g.give(m); }
        g.setStage(D2, 'dig');
      },
    },
    bWait: { text: 'Two maps, two X\'s, near the old towers and camps on the Keys. Bring me whatever isn\'t coin.' },
    b3: { speaker: 'narrator', text: 'You turn out your pockets. Among the coins from the second chest is a square of oilcloth, folded small, with a drawing on it.', next: 'b4' },
    b4: { text: 'That\'s Ysolde Gale\'s hand. I learned to draw copying it.', next: 'b5' },
    b5: { text: 'Gale was the first of the Brethren. She sank more Assembly ships than anyone has since, and she buried what she took.', next: 'b6' },
    b6: { text: 'Leave it with me. Come back in an hour. I won\'t be sleeping anyway.', effect: (g) => { g.addMarks(80); g.setStage(D2, 'done'); } },
    c1: { text: 'Finished. Gale\'s page, copied fair. Heron Mere, in the Glades. Sixty years, and nobody\'s found it.', next: 'c2', effect: (g) => { g.give('tmap_gale'); g.setStage(D3, 'dig'); } },
    c2: { text: 'Mind the lizards out there. They mind you.' },
    cWait: { text: 'Heron Mere, in the Glades. The dead tree she drew as a cross. Dig under it.' },
    c3: { text: 'You found her. Tell me.', next: 'c4' },
    c4: { speaker: 'narrator', text: 'You tell her: an iron box, a brass compass, and a cloak folded on top with a compass rose sewn on it.', next: 'c5' },
    c5: { text: 'Keep the cloak. She\'d want it worn, not framed. I\'ll keep the compass. I\'ll want it for the drawing.', next: 'c6', effect: (g) => { g.give('cape_rose'); g.addMarks(250); g.setStage(D3, 'done'); } },
    c6: { text: 'And now I\'ve maps to sell, if you\'ve marks. Every land in Morrow. Pay first, dig after.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('dinah_lowry') }, { text: 'Bye.' }] },
    z0: { text: 'Maps of every land in Morrow, from wreckers\' talk and drowned men\'s charts. Pay first, dig after.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('dinah_lowry') }, { text: 'Bye.' }] },
  },
};

// ================================================================ The rest of Saltpenny

const gil: DialogueTree = {
  start: () => 'g0',
  nodes: {
    g0: { text: 'Gil Fenner. I buy what you\'ve got, and I don\'t ask where it was. I pay better than Callis, and I don\'t write it down.', options: [{ text: 'What have you got?', effect: (g) => g.openShop('gil_fenner') }, { text: 'Can the Brethren get my name off the books?', next: 'gf0' }, { text: 'Bye.' }] },
    ...GIL_CLEAR,
  },
};
const annie: DialogueTree = {
  start: () => 'a0',
  nodes: {
    a0: {
      text: 'The Leaning Mast. Rum, chowder, and no fighting. Fighting\'s at the Cockpit, and you pay Jago for it.',
      options: [{ text: 'What have you got?', effect: (g) => g.openShop('annie_coe') }, { text: 'Why is it leaning?', next: 'a1' }, { text: 'Bye.' }],
    },
    a1: { text: 'She ran up the beach in a gale forty years back and settled on her side. We put the bar on the low end. Saves on chairs.' },
  },
};
const won = (g: GameApi, id: string) => !!g.flag('duelWon:' + id);
const jago: DialogueTree = {
  start: () => 'j0',
  nodes: {
    j0: {
      text: (g) => (won(g, 'coyle') ? 'The one who beat Mara Coyle. The Mast hasn\'t stopped talking about it. What\'ll it be?' : 'Jago Sweeney. I keep the Cockpit. Captains don\'t take each other to law. They take each other here.'),
      options: [{ text: 'I\'ll fight.', next: 'jList' }, { text: 'What are the rules?', next: 'j1' }, { text: 'Bye.' }],
    },
    j1: { text: 'First blood: they yield at half, you yield at a quarter, and nobody dies. Step out of the ring and it\'s forfeit.', next: 'j2' },
    j2: { text: 'The loser buys a round at the Mast. We\'re thieves, not animals. Dead men don\'t pay for rounds.', next: 'j0' },
    jList: {
      text: 'You work up the ladder. Nobody fights Mara Coyle who hasn\'t beaten the rest. Step into the ring when I call it.',
      options: [
        ...DUELISTS.map((d, i) => ({
          text: (g: GameApi) => `${d.name}, ${d.title}${won(g, d.id) ? ' (beaten)' : ''}`,
          cond: (g: GameApi) => i === 0 || won(g, DUELISTS[i - 1].id),
          effect: (g: GameApi) => g.duel(d.id),
        })),
        { text: 'Not today.' },
      ],
    },
  },
};

// ================================================================ The quests

const quests: Record<string, QuestDef> = {
  [SALT]: {
    id: SALT, name: 'What Pays', region: 'keys', story: { chapter: 29, title: 'What Pays', act: ACT }, next: ['storyTamLetter', 'ned'],
    notes: (g, s) => {
      if (s === 'sail') return 'The Kittiwake is a Brethren hull out of Saltpenny Key, at the far end of the Keys. The black comes to Callis in her hold, and Pryce went south with the Brethren. The packet from Callis runs to Saltpenny now.';
      if (s === 'vey') return 'Mara Coyle, the Kittiwake\'s master, loads the black somewhere in the north, and won\'t say where. Cargo is the Captains\' Table\'s business, and the Table is Ned Vey.';
      if (s === 'bight') return `Ned Vey will tell me where the black loads, for a price. Pryce has started running it past the Brethren with Key wreckers out of Wreckers' Bight. Ned wants their boat burnt. (${wreckers(g)}/${WRECKERS})`;
      if (s === 'told') return g.flag('tdFavour') ? 'I owe Ned Vey a favour, to be paid when a Brethren captain asks for it. In return he\'ll tell me where the black loads.' : 'The wreckers\' boat is burnt. Ned Vey will tell me where the black loads.';
      return 'The black loads at Cold Harbour, a cove under the Greywaste cliffs. Diggers bring it down from the barrows, and Pryce pays them. He went north with the last load and didn\'t come down. The diggers say the dead got up where they dug.';
    },
    objectives: (g, s) => {
      if (s === 'sail') return [{ text: 'Find the Kittiwake\'s master at Saltpenny Key\'s piers (the packet from Callis)', marker: 'mara_coyle' }];
      if (s === 'vey') return [{ text: 'Talk to Ned Vey at the Captains\' Table', marker: 'ned_vey' }];
      if (s === 'bight') return [{ text: `Drive off the wreckers at Wreckers' Bight (${wreckers(g)}/${WRECKERS})` }, { text: 'Burn the wreckers\' boat', done: !!g.flag('bightBurnt'), marker: 'bightBoat' }];
      if (s === 'told') return [{ text: 'Hear Ned Vey out', marker: 'ned_vey' }];
      return [];
    },
    advance: (g, s) => (s === 'bight' && wreckers(g) >= WRECKERS && g.flag('bightBurnt') ? 'told' : null),
    marks: (_g, s): Marks => (s === 'sail' ? { mara_coyle: '?' } : s === 'vey' || s === 'told' ? { ned_vey: '?' } : {}),
    walk: { from: { quests: { storyBell: 'done', tdCrew: 'done', tdCallis: 'done', [SALT]: 'sail' }, flags: { 'comp:tam:joined': 1 } } },
  },
  [D1]: {
    id: D1, name: 'An X on the Key', region: 'keys', depth: 'short',
    notes: (_g, s) => (s === 'dig' ? 'Dinah Lowry draws maps in the Mercy\'s hold, and won\'t sell them to anyone who can\'t read one. She gave me a map of Saltpenny Key with an X on it.' : s === 'back' ? 'I dug up what was under Dinah\'s X.' : 'Under Dinah\'s X: a tin of her own buttons. I can read a map.'),
    objectives: (_g, s) => (s === 'dig' ? [{ text: 'Dig at the X on Dinah\'s map of the key' }] : s === 'back' ? [{ text: 'Go back to Dinah Lowry in the Mercy', marker: 'dinah_lowry' }] : []),
    advance: (g, s) => (s === 'dig' && Number(g.flag('dug:tmap_salt') ?? 0) > 0 ? 'back' : null),
    marks: (_g, s): Marks => (!s ? { dinah_lowry: '!' } : s === 'back' ? { dinah_lowry: '?' } : {}),
    walk: { auto: { dig: 'back' } },
  },
  [D2]: {
    id: D2, name: 'The Keys\' Own', region: 'keys', depth: 'quest',
    notes: (_g, s) => (s === 'dig' ? 'Dinah Lowry gave me two maps of the Keys, drawn from wreckers\' talk. She wants whatever I find that isn\'t coin.' : s === 'back' ? 'Both of Dinah\'s X\'s on the Keys are dug.' : 'In the second chest on the Keys was a page of Ysolde Gale\'s log. Gale was the first of the Brethren, and buried what she took.'),
    objectives: (g, s) => (s === 'dig' ? (['tmap_keys_1', 'tmap_keys_2'] as const).map((m, i) => ({ text: `Dig at the X on the ${i ? 'second' : 'first'} map of the Keys`, done: dugSince(g, m) })) : s === 'back' ? [{ text: 'Go back to Dinah Lowry in the Mercy', marker: 'dinah_lowry' }] : []),
    advance: (g, s) => (s === 'dig' && dugSince(g, 'tmap_keys_1') && dugSince(g, 'tmap_keys_2') ? 'back' : null),
    marks: (g, s): Marks => (!s && at(g, D1) === 'done' ? { dinah_lowry: '!' } : s === 'back' ? { dinah_lowry: '?' } : {}),
    walk: { auto: { dig: 'back' }, from: { quests: { [D1]: 'done' } } },
  },
  [D3]: {
    id: D3, name: 'Gale\'s Last', region: 'keys', depth: 'quest',
    notes: (_g, s) => (s === 'dig' ? 'Dinah Lowry copied Ysolde Gale\'s page into a map: Heron Mere in the Glades, a dead tree, and an X under it. Nobody has found Gale\'s hoard in sixty years.' : s === 'back' ? 'I dug up Ysolde Gale\'s hoard by Heron Mere.' : 'Gale\'s hoard: an iron box, a brass compass, and her cloak with a compass rose sewn on it. Dinah kept the compass. I kept the cloak.'),
    objectives: (_g, s) => (s === 'dig' ? [{ text: 'Dig at the X on Gale\'s map, by Heron Mere in the Glades' }] : s === 'back' ? [{ text: 'Go back to Dinah Lowry in the Mercy', marker: 'dinah_lowry' }] : []),
    advance: (g, s) => (s === 'dig' && Number(g.flag('dug:tmap_gale') ?? 0) > 0 ? 'back' : null),
    marks: (g, s): Marks => (!s && at(g, D2) === 'done' ? { dinah_lowry: '!' } : s === 'back' ? { dinah_lowry: '?' } : {}),
    walk: { auto: { dig: 'back' }, from: { quests: { [D1]: 'done', [D2]: 'done' } } },
  },
};

// ================================================================ Things, people, places

const items: ItemDef[] = [
  { id: 'brethren_rum', name: 'Brethren rum', kind: 'food', rarity: 'common', stack: true, value: 26, icon: { shape: 'gel', a: '#8a4a1e', b: '#3a1a0a' }, desc: 'Dark, sweet and thick, from a cask with somebody else\'s mark burnt into it.', heal: 160, stats: 'Restores 160 health.' },
  { id: LADDER_PRIZE, name: 'The Cockpit\'s ribbon', kind: 'collectible', rarity: 'epic', stack: false, value: 0, icon: { shape: 'letter', a: '#a83a2a', b: '#d8b050' }, desc: 'A strip of red sailcloth with two oars crossed in gold thread, tied on by Jago Sweeney himself. Every captain in Saltpenny knows what it means: you beat Mara Coyle in the ring.' },
  { id: 'conch_chowder', name: 'Conch chowder', kind: 'food', rarity: 'uncommon', stack: true, value: 40, icon: { shape: 'cooked', a: '#e8d0a0', b: '#c87a4a' }, desc: 'The Leaning Mast\'s, in a bowl that was a helmet once. Annie Coe won\'t say whose.', heal: 260, stats: 'Restores 260 health.' },
];

/** Dinah's prices: what a dig in that land is worth to you, give or take (scripts/economy.ts). */
const MAP_PRICE: Record<string, number> = { keys: 172, glades: 190, amberwold: 208, bright: 220, sunder: 241, glassflats: 265, greywaste: 292, held: 322 };

const BRETHREN = { skin: '#b0784a', eyes: '#3a2a1e' };

export const SALTPENNY_CONTENT: RegionContent = {
  id: 'saltpenny',
  items,
  npcs: [
    {
      land: 'morrow', id: 'ned_vey', name: 'Ned Vey', title: 'For the captains, the Captains\' Table',
      look: { ...BRETHREN, hair: '#5a4030', hairStyle: 3, facial: 6, tunic: '#5a2a22', trim: '#d8b050', trousers: '#2a2a30', boots: '#1e1a16', cape: '#1e2a3a', hat: 'wide', hatColor: '#1a1a1e', build: 1.1, age: 0.6 },
      schedule: [{ from: 0, to: 24, at: [H.table.x + 5.6, zc(H.table)], y: F, face: [H.table.x + 12, zc(H.table)], anim: 'idle' }],
      barks: ['The Table will hear it.', 'What pays?'],
    },
    {
      land: 'morrow', id: 'mara_coyle', name: 'Mara Coyle', title: 'Master of the Kittiwake',
      look: { ...BRETHREN, skin: '#c8946a', hair: '#2a1e16', hairStyle: 4, tunic: '#2a3a4a', trim: '#a8a090', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#7a2a22', lashes: true, scar: true, build: 1.0, age: 0.45 },
      schedule: [{ from: 0, to: 24, at: [SX - 140.5, SALT_PIERS[1] + 1.5], face: [SX - 140.5, SALT_PIERS[1] + 8], anim: 'idle' }],
      barks: ['When she\'s loaded.'],
    },
    {
      land: 'morrow', id: 'dinah_lowry', name: 'Dinah Lowry', title: 'Maps',
      look: { ...BRETHREN, skin: '#d8a880', hair: '#c8c4bc', hairStyle: 2, tunic: '#4a5a3a', trim: '#c8b070', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#3a3024', lashes: true, age: 0.8 },
      schedule: [{ from: 0, to: 24, at: [H.mercy.x + 8.5, zc(H.mercy) + 4.6], y: F, face: [H.mercy.x + 8.5, zc(H.mercy)], anim: 'idle' }],
      barks: ['Right way up.', 'An X is a promise.'],
    },
    {
      land: 'morrow', id: 'gil_fenner', name: 'Gil Fenner', title: 'Low Tide',
      look: { ...BRETHREN, skin: '#e0b894', hair: '#3a2a1e', hairStyle: 0, facial: 1, tunic: '#3a3a30', trim: '#6a6a5a', trousers: '#2a2a26', boots: '#1e1a16', build: 0.9, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [H.lowtide.x + 12.0, zc(H.lowtide) - 2.4], y: F, face: [H.lowtide.x + 12.0, zc(H.lowtide) + 2], anim: 'idle' }],
      barks: ['No questions.'],
    },
    {
      land: 'morrow', id: 'annie_coe', name: 'Annie Coe', title: 'The Leaning Mast',
      look: { ...BRETHREN, hair: '#8a3a1e', hairStyle: 7, tunic: '#6a3a3a', trim: '#e0c890', trousers: '#3a2e26', boots: '#2a2018', apron: true, lashes: true, freckles: true, build: 1.1, age: 0.5 },
      schedule: [{ from: 0, to: 24, at: [H.mast.x + 3.3, zc(H.mast)], y: F, face: [H.mast.x + 9, zc(H.mast)], anim: 'idle' }],
      barks: ['No fighting.', 'Chowder\'s on.'],
    },
    {
      land: 'morrow', id: 'jago_sweeney', name: 'Jago Sweeney', title: 'Keeper of the Cockpit',
      look: { ...BRETHREN, skin: '#8a5a3a', hair: '#1a1410', hairStyle: 0, facial: 8, tunic: '#2a2a2a', trim: '#a83a2a', trousers: '#2a2622', boots: '#1a1612', shoulderPads: '#3a2a20', build: 1.3, age: 0.55 },
      schedule: [{ from: 0, to: 24, at: [SALT_COCKPIT.x - SALT_COCKPIT.r - 2.5, SALT_COCKPIT.z - 3.5], face: [SALT_COCKPIT.x, SALT_COCKPIT.z], anim: 'idle' }],
      barks: ['First blood.'],
    },
  ],
  dialogue: { mara_coyle: mara, ned_vey: ned, dinah_lowry: dinah, gil_fenner: gil, annie_coe: annie, jago_sweeney: jago },
  quests,
  shops: {
    annie_coe: {
      id: 'annie_coe', name: 'The Leaning Mast', owner: 'annie_coe',
      stock: [{ item: 'brethren_rum', price: 40 }, { item: 'conch_chowder', price: 62 }, { item: 'olive_bread', price: 30 }],
      buyRate: () => 0.5,
      footer: () => 'Annie pays half of an item\'s worth',
    } as ShopDef,
    gil_fenner: {
      id: 'gil_fenner', name: 'Low Tide', owner: 'gil_fenner',
      stock: [{ item: 'lockpick', price: 6 }, { item: 'loupe', price: 25 }, { item: 'black_shard', price: 64 }, { item: 'callis_red', price: 38 }, { item: 'pack_seabag', price: 6000 }],
      buyRate: () => 0.65,
      footer: () => 'Gil pays well over half, and asks nothing',
    } as ShopDef,
    dinah_lowry: {
      id: 'dinah_lowry', name: 'Dinah Lowry\'s maps', owner: 'dinah_lowry',
      stock: Object.entries(MAP_PRICE).flatMap(([r, price]) => [1, 2].map((n) => ({ item: `tmap_${r}_${n}`, price: price + (n - 1) * 20, when: (g: GameApi) => at(g, D3) === 'done' }))),
      buyRate: () => 0.5,
      footer: () => 'Dinah sells her maps once she knows you can dig',
    } as ShopDef,
  },
  things: [
    {
      land: 'morrow', id: 'bightBoat', x: BIGHT_BOAT.x, z: BIGHT_BOAT.z, label: 'Set the wreckers\' boat alight', radius: 3,
      when: (g: GameApi) => at(g, SALT) === 'bight' && !g.flag('bightBurnt'),
      use: (g: GameApi) => {
        g.setFlag('bightBurnt', true);
        g.toast('You put a brand from their own fire into the tar between the boat\'s ribs. It catches slowly, then all at once.');
      },
    },
  ],
  spawns: [
    { land: 'morrow', tag: 'bight', type: 'keywrecker', at: [[BIGHT.x + 4, BIGHT.z - 4], [BIGHT.x - 4, BIGHT.z - 3], [BIGHT.x + 7, BIGHT.z + 4], [BIGHT.x - 6, BIGHT.z + 5], [BIGHT.x + 1, BIGHT.z + 8]], when: (g: GameApi) => at(g, SALT) === 'bight' },
  ],
};
