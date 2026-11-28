import type { DNode, DialogueTree, GameApi } from '../../game/api';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import { at, deed, type Marks } from './kit';
import type { RegionContent } from './types';
import { TOWNS } from '../../world/morrow';

// THE ROJA BRAND, a side story of Cala Roja on the Bright Coast (Morrow's thinner regions: docs/OWED.md).
//
// Every cask of Cala Roja red leaves the town with the Roja brand burned into its head, and Quim Ribas keeps the iron
// that burns it. Casks with the brand have turned up in Callis full of thin sour red that never came off these hills,
// and the wine guild has written to ask him why. His iron hasn't left its hook. Somebody has made another.
//
// cbBrand (Quim Ribas, the brand-master):
//   'look'   three things to look at: a cask on the quay with the brand on it (the R is cut the wrong way round, as a
//            copy cut from a print would be); a half-filed brand blank in the scrap behind the smithy; and a tally,
//            hidden in the old press house, of casks sent to Callis and paid for by the black-runners.
//   'quim'   back to Quim with what you found. The tally is in his nephew Biel's hand: Biel owed the runners for a
//            boat that went down, and they took it in casks. Choose:
//              'guild'   take it to the wine guild: the brand comes out clean, and Biel is fined and barred from every
//                        cellar on the coast (honesty);
//              'family'  leave it in the family: Quim melts the false iron in front of Biel and pays the runners off
//                        himself, and the guild never learns why the casks went bad (loyalty).
//
// Bright Coast names are Catalan, as Cala Roja's are: Vall, Pujol, Ribas.

const Q = 'cbBrand';
const T = TOWNS.cala;
const P = (dx: number, dz: number) => ({ x: T.x + 0.5 + dx, z: T.z + 0.5 + dz });
const QUIM = P(-6, -5);
const FINDS: [string, { x: number; z: number }, string, string][] = [
  ['rbCask', P(6, 8), 'Look at the branded cask on the quay', 'A cask stacked with the others for the Callis boat, the Roja brand burned into its head. You look at it a long time before you see it: the R is backwards. Whoever cut this iron cut it from a print, and cut it the way the print showed it.'],
  ['rbBlank', P(-14, -10), 'Search the scrap behind the smithy', 'In the scrap behind the smithy, under a heap of old hoops, a bar of iron with a flat end half-filed into a shape. An R, backwards, and the curve of a wave under it. Somebody started a second one and spoiled it.'],
  ['rbTally', P(-24, 4), 'Search the old press house', 'In the old press house, behind a loose board in the wall, a tally: casks marked off in fives, the word "runners" at the top of every page, and at the bottom of the last, "and the boat is paid for". The hand is small and careful, and young.'],
];
const found = (g: GameApi) => FINDS.filter(([id]) => g.flag(id)).length;

const quimNodes: Record<string, DNode> = {
  qr1: { speaker: 'narrator', text: 'A grey man in a leather apron, standing under a beam where a single brand iron hangs on its own hook, polished like a church plate. He is reading a letter for what is plainly not the first time.', next: 'qr2' },
  qr2: { text: 'Quim Ribas. I keep the Roja brand. That iron there. Every cask that leaves this town goes under it, and has for sixty years, and I\'ve burned every one for thirty.', next: 'qr3' },
  qr3: { text: 'This is from the wine guild in Callis. Casks with my brand on them, full of red that would strip paint. They want to know why. So do I. That iron hasn\'t left its hook.', next: 'qr4' },
  qr4: {
    text: 'Somebody\'s made another. I can\'t go asking round the town, everybody knows my face and half of them are my cousins. You could. Will you look?',
    options: [
      { text: 'I\'ll find out who made it.', effect: (g) => g.setStage(Q, 'look') },
      { text: 'Not now.' },
    ],
  },
  qrWait: { text: (g) => `Look at the casks on the quay for the Callis boat. Ask the smith, he\'d know if anyone\'s been at his scrap. And the old press house, nobody goes there now. ${found(g)} of three.` },
  qrB1: { speaker: 'narrator', text: 'Quim turns the tally over in his hands. He knows the writing before he reads a word of it. He sits down on the cask behind him.', next: 'qrB2' },
  qrB2: { text: 'Biel. My sister\'s boy. His boat went down off the Head in the spring, and it wasn\'t paid for. I knew he owed somebody. I didn\'t ask who.', next: 'qrB3' },
  qrB3: { text: 'The runners took it in casks. Bad red, in my casks, under my brand, going to Callis with this town\'s name on it. And he cut the iron backwards. He never could read a print.', next: 'qrB4' },
  qrB4: {
    text: 'So. I can take this to the guild, and the brand comes out clean, and Biel never works a cellar on this coast again. Or I melt that blank in front of him, pay the runners off myself, and the guild goes on wondering. Tell me what you\'d do.',
    options: [
      { text: 'Take it to the guild. The brand is the whole town\'s, not your family\'s.', next: 'qrGuild' },
      { text: 'Keep it in the family. Melt the iron and pay his debt.', next: 'qrFamily' },
    ],
  },
  qrGuild: {
    text: 'The whole town\'s. Yes. That\'s what my father would have said, and he\'d have been right, and I\'d have hated him for it. I\'ll walk it to Callis myself. Here. For your trouble, and for saying it so I didn\'t have to.',
    options: [{ text: 'I\'m sorry it was Biel.', effect: (g) => { g.setFlag(Q, 'guild'); deed(g, { id: 'cbBrand:guild', a: 4, tr: { honesty: 6 }, npc: { cb_quim: 5 }, note: 'Told Quim Ribas to take his nephew\'s false brand to the wine guild.', fame: 'the one who made Quim Ribas turn in his own nephew' }); g.addMarks(480); g.setStage(Q, 'done'); } }],
  },
  qrFamily: {
    text: 'Family. Aye. He\'s a fool and he\'s ours. I\'ll put that blank in the forge with him standing there, and I\'ll find the runners\' money. The guild will have to wonder. Take this, and say nothing in Callis.',
    options: [{ text: 'Nothing in Callis.', effect: (g) => { g.setFlag(Q, 'family'); deed(g, { id: 'cbBrand:family', tr: { loyalty: 6, honesty: -3 }, npc: { cb_quim: 15 }, rep: { callis: -5 }, note: 'Helped Quim Ribas keep his nephew\'s false brand from the wine guild.' }); g.addMarks(480); g.setStage(Q, 'done'); } }],
  },
  qrAfter: {
    text: (g) => (g.flag(Q) === 'guild'
      ? 'The guild struck Biel off. He\'s gone to Callis to load ships. He doesn\'t speak to me. The brand\'s clean, though. I keep telling myself that\'s what matters.'
      : 'I melted it with him watching. He cried. I paid the runners at the cove with my own money and told them if they came near him again I\'d brand them. The guild still writes. I don\'t answer.'),
  },
};

const quim: DialogueTree = {
  start: (g) => { const s = at(g, Q); return !s ? 'qr1' : s === 'quim' ? 'qrB1' : s === 'done' ? 'qrAfter' : 'qrWait'; },
  nodes: quimNodes,
};

const quests: Record<string, QuestDef> = {
  [Q]: {
    id: Q, name: 'The Roja Brand', region: 'bright', depth: 'quest',
    notes: (g, s) => {
      if (s === 'look') return `Casks with Cala Roja's brand have turned up in Callis full of bad red, and Quim Ribas's iron hasn't left its hook. Somebody made another. Look at the casks on the quay, the smith's scrap and the old press house. (${found(g)}/3)`;
      if (s === 'quim') return 'The false iron was cut backwards from a print, and the tally of casks sent to the runners is in a young hand. Quim Ribas should see it.';
      return g.flag(Q) === 'guild' ? 'Quim Ribas took his nephew Biel\'s false brand to the wine guild. The brand is clean, and Biel is barred from the cellars.' : 'Quim Ribas melted his nephew Biel\'s false brand and paid off the black-runners himself. The guild was never told.';
    },
    objectives: (g, s) => (s === 'look'
      ? FINDS.map(([id, , label]) => ({ text: label, marker: id, done: !!g.flag(id) }))
      : s === 'quim' ? [{ text: 'Bring the tally to Quim Ribas', marker: 'cb_quim' }] : []),
    advance: (g, s) => (s === 'look' && found(g) >= 3 ? 'quim' : null),
    marks: (_g, s): Marks => (!s ? { cb_quim: '!' } : s === 'quim' ? { cb_quim: '?' } : {}),
    walk: { cast: ['cb_quim'] },
  },
};

const NPCS: NpcDef[] = [
  { land: 'morrow', id: 'cb_quim', name: 'Quim Ribas', title: 'Brand-master, Cala Roja',
    look: { skin: '#c89068', hair: '#9a948a', hairStyle: 0, facial: 2, eyes: '#3a2a1e', tunic: '#5a4a3a', trim: '#c8a070', trousers: '#2a2a30', boots: '#1e1a16', apron: true, build: 1.0, age: 0.75 },
    schedule: [{ from: 0, to: 24, at: [QUIM.x, QUIM.z], face: [QUIM.x + 2, QUIM.z + 3], anim: 'idle' }],
    barks: ['Sixty years under that iron.', 'Backwards. Who cuts an R backwards?'] },
];

export const ROJA_BRAND_CONTENT: RegionContent = {
  id: 'rojaBrand', quests, npcs: NPCS,
  dialogue: { cb_quim: quim },
  things: FINDS.map(([id, p, label, text]) => ({
    land: 'morrow' as const, id, x: p.x, z: p.z, label, radius: 2.6,
    when: (g: GameApi) => at(g, Q) === 'look' && !g.flag(id),
    use: (g: GameApi) => { g.setFlag(id, 1); g.toast(text); if (found(g) >= 3) g.setStage(Q, 'quim'); },
  })),
};
