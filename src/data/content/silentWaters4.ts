import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { addOption, at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// THE SILENT WATERS, chapters 7 and 8, the end (docs/VERANDAH.md section 3; 1-6 in silentWaters.ts, 2.ts and 3.ts).
//
// swUnder, 7: THE UNDERWRITERS (Grace Vyvyan, after Two Captains): the papers under Tregarthen's seal are the Good
// Intent's policy, written for twice her worth, the claim payable not to Grace but to "A. Garland and partners, Ansbury".
// Lewis Tregarthen never moved his strongroom after the cellar flood: his real books are down in the Tregarthen Vaults,
// under his great-grandfather's bones. Bring down Lord Ansel and open the strongroom: four ships insured twice over, the
// claims paid to Garland, and nine thousand marks owed to Harrowgate's bank. Hugh Carne, shown it, names the man who
// brings him the written clearances: Ambrose Garland, Harrowgate's factor, at the Dolphyn. Ada Blackwell says he paid up
// this morning and went down to the quay with two men and his trunks for the noon packet. On the pier, his two men; then
// Garland himself, with a trunk and a ticket.
//
// swCouncil, 8: THE KING'S COUNCIL (Garland, caught): King Edmund hears it all in his hall, with the Board summoned. Read
// it all in open council, the Charter's part too (the treaty shamed, the king rewrites it on his own terms, Ansbury will
// remember); let Edmund settle it with Ansbury quietly (Garland sent home, the Charter pays for silence and withdraws its
// cutters); or lay it all on Tregarthen and say nothing of the Charter (easiest; the Charter keeps its hooks in the
// harbour). swCouncil = 'open' | 'quiet' | 'tregarthen'. Then Tregarthen (swTreg = 'gaol' | 'exile' | 'pardon') and
// Hugh Carne (swHugh = 'kept' | 'dismissed'). This is the kingdom-politics example owed under OWED u.

const UNDER = 'swUnder', COUNCIL = 'swCouncil';
const STRONG = { x: -2993.5, y: 8, z: 2484.5 };
const GARLAND = { x: -2893.5, y: 16, z: 1884.5 };
const HIRED: [number, number][] = [[-2888.5, 1893.5], [-2893.5, 1880.5]];

const anselDown = (g: GameApi) => Number(g.flag('killed:cr_tregarthen') ?? 0) > Number(g.flag('swAnselBase') ?? 0);

// ================================================================ 7: The Underwriters

const graceNodes: Record<string, DNode> = {
  u1: { speaker: 'narrator', text: 'Grace Vyvyan breaks Tregarthen\'s green wax with her thumbnail, reads the first page, and then reads it again with her lips moving, the way she counts barrels.', next: 'u2' },
  u2: { text: 'The policy on the Good Intent. Written for twice what she was worth, hull and cargo. And the claim\'s not payable to me. It\'s payable to "A. Garland and partners, Ansbury". Lewis paid me out of his own pocket, to keep me quiet, and drew twice as much from his partners in Ansbury for a ship that isn\'t lost.', next: 'u3' },
  u3: { text: 'He\'ll have done it before. It\'ll be in his books. Not the books in his new house in the town: the real ones. Lewis never moved the strongroom after the cellar flood. He couldn\'t afford to, and he couldn\'t bear to. It\'s still down in the Tregarthen Vaults, under the hill, with his great-grandfather.', next: 'u4' },
  u4: {
    text: 'And Lord Ansel never did like visitors. Take friends.',
    options: [{ text: 'I\'ll bring you Lewis\'s books.', effect: (g) => { g.setFlag('swAnselBase', Number(g.flag('killed:cr_tregarthen') ?? 0)); g.setStage(UNDER, 'vault'); } }, { text: 'Not yet.' }],
  },
  uAfter: {
    text: (g) => {
      const c = g.flag(COUNCIL);
      if (c === 'open') return 'The king read it all out with the Board standing in front of him like schoolboys. I\'ve never enjoyed a morning more. My boats go out again. They come back.';
      if (c === 'quiet') return 'Settled quietly, I hear. Ansbury paid. My boats go out again and come back, and nobody will ever say why they didn\'t. That\'s politics. I prefer fish.';
      return 'Lewis Tregarthen, and nobody else. As if Lewis could plan a picnic. Well. My boats come back now. I\'ll take that and count it.';
    },
  },
};

const hughNodes: Record<string, DNode> = {
  hu1: { speaker: 'narrator', text: 'Hugh Carne turns the pages of Tregarthen\'s strongroom ledger slowly. When he gets to the column headed "A. G. & ptnrs" he stops turning.', next: 'hu2' },
  hu2: { text: 'Ambrose Garland. Harrowgate\'s factor. He keeps rooms at the Dolphyn and lends money to anyone on the Board who needs it, and to some who aren\'t. He brings me the clearances, already written, with the duty on top. He holds my debts. Forty marks a month, and my brother\'s, and my mother\'s roof.', next: 'hu3' },
  hu3: { text: 'There. I\'ve said it. You\'ll want to hurry: the noon packet goes at the turn of the tide, and Garland has been asking about the noon packet all week.', options: [{ text: 'The Dolphyn, then.', effect: (g) => g.setStage(UNDER, 'dolphyn') }] },
};

const adaNodes: Record<string, DNode> = {
  ad1: { text: 'Mr Garland? He paid his bill this morning, every penny, which he\'s never done in two years, and went down to the quay with two men from the Boatman\'s Tail carrying his trunks. For the noon packet, he said. You might catch him, if you run.', options: [{ text: 'Thank you, Ada.', effect: (g) => g.setStage(UNDER, 'quay') }] },
};

const garland: DialogueTree = {
  start: (g) => (killed(g, 'swHired') >= HIRED.length ? 'g1' : 'g0'),
  nodes: {
    g0: { text: 'I\'d stand back, if I were you. These gentlemen are paid to be unpleasant.' },
    g1: { speaker: 'narrator', text: 'A neat man of fifty in a very good grey coat, sitting on his own trunk at the pier end with a packet ticket in one gloved hand, watching his two hired men be carried off. He doesn\'t get up.', next: 'g2' },
    g2: { text: 'Ambrose Garland. You\'ll have read my name in Lewis\'s book; he always did write too much down. Do you know what you\'ve done? This harbour was going to fail. Not today. In five years, or ten. Too small, too proud, too far from anywhere.', next: 'g3' },
    g3: { text: 'Under the Charter it would have been safe. Charter cutters in the harbour, Charter customs on the quay, and nobody\'s boats going missing, ever again. I was going to save it. I was only going to frighten it first.', next: 'g4' },
    g4: {
      text: 'Well. I suppose you\'re taking me to your king.',
      options: [{ text: 'I am. Get up.', effect: (g) => { g.setFlag('swGarlandCaught', 1); g.addMarks(150); g.setStage(UNDER, 'done'); } }],
    },
  },
};

// ================================================================ 8: The King's Council

const kingNodes: Record<string, DNode> = {
  k1: { speaker: 'narrator', text: 'The hall is full. The Board stands in a row on the red carpet below the throne: Grace Vyvyan with her slate, Honor Trefusis, the Portreeve, Kerra Nance in her pilot\'s coat. Lewis Tregarthen is between two guards, grey in the face. Morvah and Penhallow stand on either side of the door and don\'t look at each other. Garland sits on a bench, quite at his ease.', next: 'k2' },
  k2: { text: 'I\'ve read it. The tally, the policy, Lewis\'s book, and Hugh Carne\'s confession, which he wrote out last night in a very steady hand. Four ships. Three crews in chains. Nine thousand marks owed to Harrowgate. And a man from Ansbury who meant to frighten my harbour into the Charter.', next: 'k3' },
  k3: { text: 'Everyone in this hall is going to tell me what to do with it. I\'d rather hear it from you. You found it. What does Verandah do now?', next: 'k4' },
  k4: {
    text: 'Well?',
    options: [
      { text: 'Read all of it, here, now, the Charter\'s part too. Let Ansbury hear what was done in its name.', moral: { id: 'swCouncil:open', a: 4, tr: { honesty: 3, courage: 2 }, rep: { verandah: 10, charter: -15 }, npc: { ver_king: 15, vh_grace: 10 }, note: 'Had the whole of the Silent Waters read in open council at Verandah, the Charter\'s part with it.', fame: 'laid the Charter\'s plot against Verandah bare before the king', spread: 'realm' }, effect: (g) => g.setFlag(COUNCIL, 'open'), next: 'kO' },
      { text: 'Settle it with Ansbury quietly. Send Garland home, and make the Charter pay for the silence.', moral: { id: 'swCouncil:quiet', tr: { loyalty: 2, greed: 1 }, rep: { verandah: 5, charter: 5 }, npc: { ver_king: 10 }, note: 'Advised King Edmund to settle the Silent Waters with Ansbury quietly, for a price.' }, effect: (g) => g.setFlag(COUNCIL, 'quiet'), next: 'kQ' },
      { text: 'Lay it on Tregarthen. He signed the policies. Leave the Charter out of it.', moral: { id: 'swCouncil:tregarthen', a: -3, tr: { deception: 3 }, rep: { verandah: -3, charter: 10 }, npc: { ver_king: -5, vh_grace: -10 }, note: 'Advised King Edmund to put the Silent Waters on Lewis Tregarthen alone, and keep the Charter out of it.' }, effect: (g) => g.setFlag(COUNCIL, 'tregarthen'), next: 'kT' },
    ],
  },
  kO: { text: 'All of it. Yes. Margery, open the doors; I want the quay to hear this. Mr Garland, you\'ll sit there and listen to every word, and then you\'ll carry a letter to Ansbury from me. It will tell them the Packet Treaty is void, and what I\'ll sign in its place, and they will sign it, because the alternative is that everyone hears this twice.', next: 'k5' },
  kQ: { text: 'Quietly. You sound like my steward. Very well. Mr Garland goes home on the next packet with a letter, and the Charter buys my silence with its cutters out of my strait and a sum I\'ll enjoy naming. Nobody will ever know why. That\'s the price of it. I\'ll pay it.', next: 'k5' },
  kT: { speaker: 'narrator', text: 'The king looks at you for a long moment. Garland, on his bench, smiles very slightly at the floor. "Lewis Tregarthen," the king says at last, "signed his name to every page. That much is true." He doesn\'t say anything else about it.', next: 'k5' },
  k5: {
    text: 'And Lewis. He\'s been a fool for money, and other men have been hurt by it. What would you do with him?',
    options: [
      { text: 'Gaol. Three crews sat in chains for his debts.', moral: { id: 'swTreg:gaol', tr: { honesty: 1, cruelty: 1 } }, effect: (g) => g.setFlag('swTreg', 'gaol'), next: 'k6' },
      { text: 'Send him off the island. Let his house pay the Vyvyans back first.', moral: { id: 'swTreg:exile', tr: { compassion: 1 } }, effect: (g) => g.setFlag('swTreg', 'exile'), next: 'k6' },
      { text: 'Pardon him, if he swears to all of it before the Board.', moral: { id: 'swTreg:pardon', tr: { compassion: 2, generosity: 1 }, npc: { vh_grace: -5 } }, effect: (g) => g.setFlag('swTreg', 'pardon'), next: 'k6' },
    ],
  },
  k6: {
    text: 'And my Collector, who stamped what he was shown and then told me so in writing.',
    options: [
      { text: 'Keep him. He\'ll never stamp a paper unread again.', moral: { id: 'swHugh:kept', tr: { compassion: 2 }, npc: { vh_hugh: 25 } }, effect: (g) => g.setFlag('swHugh', 'kept'), next: 'k7' },
      { text: 'He can\'t be Collector after this.', moral: { id: 'swHugh:dismissed', tr: { honesty: 1 }, npc: { vh_hugh: -15 } }, effect: (g) => g.setFlag('swHugh', 'dismissed'), next: 'k7' },
    ],
  },
  k7: { text: 'So be it. Margery will write it all down; she always does. And you. My grandfather would have given you a title. I\'ll give you what he never had, which is money, and the freedom of the harbour, and my thanks, which are rarer than either.', options: [{ text: 'Thank you, Your Majesty.', effect: (g) => { g.addMarks(400); g.setStage(COUNCIL, 'done'); } }] },
  kAfter: {
    text: (g) => {
      const c = g.flag(COUNCIL);
      if (c === 'open') return 'Ansbury signed. Every word. Their cutters are gone from my strait, and the harbour dues are mine to set. They\'ll never forgive me. I find I sleep well.';
      if (c === 'quiet') return 'Ansbury paid. The cutters are gone. The harbour is quiet. Some mornings I wonder what we sold, besides silence.';
      return 'Lewis is gone, and the Charter\'s cutters still go round my point twice a day. I watch them from the window. I don\'t know what else they carry.';
    },
  },
};

const quests: Record<string, QuestDef> = {
  [UNDER]: {
    id: UNDER, name: 'The Silent Waters: The Underwriters', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'vault') return 'The Good Intent was insured for twice her worth, the claim payable to "A. Garland and partners, Ansbury". Lewis Tregarthen\'s real books are in the strongroom of the Tregarthen Vaults, under the hill, where Lord Ansel lies.';
      if (s === 'hugh') return 'Tregarthen\'s strongroom ledger: four ships insured twice over, the claims paid to A. Garland, and nine thousand marks owed to Harrowgate\'s bank. Show it to Hugh Carne at the Customs.';
      if (s === 'dolphyn') return 'Ambrose Garland, Harrowgate\'s factor, brought Hugh the written clearances. He keeps rooms at the Dolphyn.';
      if (s === 'quay') return 'Garland paid up and went down to the quay with two hired men for the noon packet.';
      return 'Ambrose Garland was caught on the pier with his trunk and his ticket.';
    },
    objectives: (g, s) => (s === 'vault' ? [{ text: 'Bring down Lord Ansel Tregarthen in the Vaults', done: anselDown(g) }, { text: 'Open the strongroom', marker: 'swStrong', done: g.has('sw_ledger') }]
      : s === 'hugh' ? [{ text: 'Show the ledger to Hugh Carne in the warehouse', marker: 'vh_hugh' }]
      : s === 'dolphyn' ? [{ text: 'Find Garland at the Dolphyn (ask Ada Blackwell)', marker: 'ver_ada' }]
      : s === 'quay' ? [{ text: `Deal with Garland's men on the pier (${Math.min(HIRED.length, killed(g, 'swHired'))}/${HIRED.length})`, done: killed(g, 'swHired') >= HIRED.length }, { text: 'Stop Garland', marker: 'sw_garland' }] : []),
    advance: (g, s) => (s === 'vault' && g.has('sw_ledger') ? 'hugh' : null),
    marks: (g, s): Marks => (!s && at(g, 'swTwo') === 'done' ? { vh_grace: '!' } : s === 'hugh' ? { vh_hugh: '?' } : s === 'dolphyn' ? { ver_ada: '?' } : s === 'quay' ? { sw_garland: '?' } : {}),
    walk: { cast: ['vh_grace', 'vh_hugh', 'ver_ada', 'sw_garland'], kill: { vault: [['cr_tregarthen', 1]], quay: [['footpad', 2]] }, from: { quests: { swGrace: 'done', swIntent: 'done', swLights: 'done', swKeep: 'done', swTally: 'done', swTwo: 'done' }, flags: { swGrace: 'truth', swIntent: 'pressed', swLights: 'bound', swTally: 'mab', swTwo: 'both' } } },
  },
  [COUNCIL]: {
    id: COUNCIL, name: 'The Silent Waters: The King\'s Council', region: 'verandah', depth: 'storyline',
    notes: (g, s) => {
      if (s === 'king' || !s) return 'Take Ambrose Garland, and everything found, to King Edmund in his hall.';
      const c = g.flag(COUNCIL);
      return c === 'open' ? 'It was all read in open council, the Charter\'s part too. The Packet Treaty is void.' : c === 'quiet' ? 'The king settled it with Ansbury quietly, for a price.' : 'It was all laid on Lewis Tregarthen. The Charter was left out of it.';
    },
    objectives: (_g, s) => (s === 'king' ? [{ text: 'Go before King Edmund in his hall', marker: 'ver_king' }] : []),
    marks: (g, s): Marks => (!s && at(g, UNDER) === 'done' ? { ver_king: '!' } : s === 'king' ? { ver_king: '?' } : {}),
    walk: { cast: ['ver_king'], from: { quests: { swGrace: 'done', swIntent: 'done', swLights: 'done', swKeep: 'done', swTally: 'done', swTwo: 'done', swUnder: 'done' }, flags: { swGrace: 'truth', swIntent: 'pressed', swLights: 'bound', swTally: 'mab', swTwo: 'both' } } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'swHired', type: 'footpad', at: HIRED, when: (g) => at(g, UNDER) === 'quay' },
];

const things: WorldThing[] = [
  {
    id: 'swStrong', x: STRONG.x, z: STRONG.z, y: STRONG.y, label: 'Open the strongroom', radius: 2.2, look: 'none',
    when: (g) => at(g, UNDER) === 'vault' && !g.has('sw_ledger'),
    use: (g) => {
      if (!anselDown(g)) { g.toast('Lord Ansel Tregarthen still keeps his vault.'); return; }
      g.give('sw_ledger', 1);
      g.toast('Behind the old lord\'s bones, an iron door green with damp, and the house\'s strongroom: the water marks a foot up the walls, and on a high shelf, dry, a ledger bound in red. Four ships this year and last, insured for twice their worth: the Good Intent, the Fair Maid, the Brothers, the Hope of Kestle. Every claim paid to "A. G. & ptnrs, Ansbury". And on the last page, a note of hand to Harrowgate\'s bank for nine thousand marks, signed Lewis Tregarthen.');
    },
  },
];

const NPCS: NpcDef[] = [
  { id: 'sw_garland', name: 'Ambrose Garland', title: 'Factor, Harrowgate & Daughters', look: { skin: '#e2c0a0', hair: '#8a8a82', hairStyle: 0, eyes: '#4a5a6a', tunic: '#5a5a62', trim: '#2a2a30', shirt: '#e8e0d0', trousers: '#2a2a30', boots: '#1e1a16', hat: 'tophat', hatColor: '#2a2a30', build: 0.95, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [GARLAND.x, GARLAND.z], face: [GARLAND.x, GARLAND.z - 4], anim: 'seated', y: GARLAND.y }],
    when: (g) => at(g, UNDER) === 'quay', barks: ['Mind the trunk. It\'s older than you.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'sw_ledger', name: 'Tregarthen\'s strongroom ledger', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'letter', a: '#8a2a22', b: '#e8d8a8' }, desc: 'Bound in red, kept dry on a high shelf in the flooded strongroom. Four ships insured twice over, the claims paid to "A. G. & ptnrs, Ansbury", and a note of hand to Harrowgate\'s bank for nine thousand marks.' },
];

export const SILENT_WATERS_FOUR: RegionContent = {
  id: 'silentWatersFour',
  items: ITEMS,
  npcs: NPCS,
  dialogue: { sw_garland: garland },
  quests,
  spawns,
  things,
  hooks: (D) => {
    addOption(D, 'vh_grace', 'hello', { text: 'The papers out of the Good Intent\'s chest. Tregarthen\'s seal.', cond: (g) => at(g, 'swTwo') === 'done' && !at(g, UNDER), next: 'u1' });
    addOption(D, 'vh_grace', 'hello', { text: 'Your boats, Grace.', cond: (g) => at(g, COUNCIL) === 'done', next: 'uAfter' });
    hook(D, 'vh_grace', () => undefined, graceNodes);
    hook(D, 'vh_hugh', (g) => (at(g, UNDER) === 'hugh' ? 'hu1' : undefined), hughNodes);
    hook(D, 'ver_ada', (g) => (at(g, UNDER) === 'dolphyn' ? 'ad1' : undefined), adaNodes);
    hook(D, 'ver_king', (g) => (at(g, COUNCIL) === 'king' ? 'k1' : undefined), kingNodes);
    for (const n of ['meet', 'again']) addOption(D, 'ver_king', n, { text: 'I\'ve brought you Ambrose Garland, Your Majesty, and everything we found.', cond: (g) => at(g, UNDER) === 'done' && !at(g, COUNCIL), effect: (g) => g.setStage(COUNCIL, 'king'), next: 'k1' });
    addOption(D, 'ver_king', 'again', { text: 'The harbour, Your Majesty.', cond: (g) => at(g, COUNCIL) === 'done', next: 'kAfter' });
  },
};
