import type { DialogueTree, DNode, GameApi } from '../../game/api';
import { at, hook, killed, type Marks } from './kit';
import type { RegionContent } from './types';
import type { QuestDef } from '../quests';
import type { NpcDef } from '../npcs';
import type { ItemDef } from '../items';
import type { QuestSpawn, WorldThing } from '../places_regional';

// Two side stories on Tolmen Moor, round Scarrow Tor (levels 28 to 35; owner 2026-11-13, content order: fill the
// Counties first), with the morality system's choices (docs/MORALITY.md).
//
// tlBarrow, THE CHILDREN'S BARROW (Kenwyn Hosken, the moorman's boy, at the school): Mr Rescorla took the school to dig
// into Pellow's Barrow for a history lesson, and Kenwyn put a thing he found in his pocket: a gold collar, thin as a
// leaf. Since then something walks on the moor at night, and his father won't sleep. At the barrow, the kerb-stones have
// got up. Put the tor cairn down, and Elias Jewell, who keeps the barrows, comes up the moor: put the collar back and
// close the cut, send it to the Collegium so it's known, let the Hoskens sell it (they're poor; the dead aren't), or
// ([Bad or Evil]) keep it. tlBarrow = 'back' | 'collegium' | 'sold' | 'kept'.
//
// tlTurf, THE WIDOWS' TURF (Win Polwhele, peat cutter): every autumn Win cuts the winter's turf for the widows of the Tor,
// and her back's gone. Cut it at the bank on the moor west of the Tor, past the wolves, and carry it round: Jenifer
// Bolitho, Thomasina Hocking, and Mother Treen, the constable's mother, who wouldn't give Win's family a turf in the
// hard winter when Win's father was dying. Win says, not her. Leave her out, take it anyway, or ([Kind]) get Win to
// carry it to her door herself. tlTurf = 'left' | 'anyway' | 'win'.

const BARROW = 'tlBarrow', TURF = 'tlTurf';
const KENWYN = { x: 335.5, z: 2973.5 };
const MOUND = { x: 304, z: 3012 }, CUT = { x: 309.5, z: 3012.5 }, ELIAS = { x: 313.5, z: 3016.5 };
const CAIRN_AT: [number, number][] = [[311, 3006]];
const BANK: [number, number][] = [[286.5, 2948.5], [290.5, 2945.5], [288.5, 2952.5]];
const WOLVES: [number, number][] = [[295, 2943], [283, 2957]];
const WIDOWS = { tl_bolitho: { x: 346.0, z: 2971.0 }, tl_hocking: { x: 340.0, z: 2968.5 }, tl_treen: { x: 339.5, z: 2954.5 } } as const;

const cut = (g: GameApi) => BANK.filter((_, i) => g.flag('tlBank' + i)).length;
const given = (g: GameApi, w: string) => !!g.flag('tlGave:' + w);

// ================================================================ The Children's Barrow

const kenwyn: DialogueTree = {
  start: (g) => {
    const s = at(g, BARROW);
    if (!s) return 'k1';
    if (s === 'done') return 'after';
    return 'wait';
  },
  nodes: {
    k1: { speaker: 'narrator', text: 'A boy of ten on the schoolhouse step, long after the others have gone home, with his hand clenched in his pocket around something he hasn\'t let go of all day.', next: 'k2' },
    k2: { text: 'Kenwyn Hosken. My father keeps the moor ponies. Mr Rescorla took us up to Pellow\'s Barrow to dig, for history. Everybody found bits of pot. I found this.', next: 'k3' },
    k3: { speaker: 'narrator', text: 'He opens his hand. A collar of gold, crescent-shaped, beaten thin as a beech leaf and scratched all over with tiny lines.', next: 'k4' },
    k4: { text: 'I didn\'t tell anybody. And since, there\'s something walking on the moor at night, round our house. Father sits up with the gun and won\'t say what he\'s seen.', next: 'k5' },
    k5: {
      text: 'I think it wants this back. I\'m frightened to take it. Will you?',
      options: [{ text: 'Give it here. I\'ll go up to the barrow.', effect: (g) => { g.give('tl_lunula', 1); g.setStage(BARROW, 'barrow'); } }, { text: 'Hold on to it a little longer, Kenwyn.' }],
    },
    wait: { text: 'Pellow\'s Barrow. South-west of the Tor, on the high moor. You can see the cut from the path. We cut it. I\'m sorry.' },
    after: {
      text: (g) => {
        const f = g.flag(BARROW);
        if (f === 'back') return 'Mr Jewell says Pellow\'s asleep again. Father slept twelve hours. I\'m to take the school up and turf the cut over, as a lesson. Mr Rescorla says it\'s a better one than his.';
        if (f === 'collegium') return 'A man from the Collegium wrote to me. Me! He says it\'s the oldest gold on Tolmen. He spelled my name wrong.';
        if (f === 'sold') return 'Father bought a mare with it. A good one. He calls her Pellow. Mr Jewell won\'t speak to him.';
        return 'You kept it. Father says don\'t ask.';
      },
    },
  },
};

const eliasNodes: Record<string, DNode> = {
  el1: { speaker: 'narrator', text: 'Elias Jewell comes up the moor path at a walk that would be a run in a younger man, and stops at the edge of the cut, and looks at the broken kerb, and at you.', next: 'el2' },
  el2: { text: 'Jewell. I keep these. I told Rescorla, I told him. You don\'t dig into Pellow\'s for a lesson. Show me what came out of it.', next: 'el3' },
  el3: { text: 'A lunula. Beaten gold, for a neck, older than any name on this moor. They put it on whoever lies in there, and Pellow wants it back on.', next: 'el4' },
  el4: {
    text: 'It\'s in your hand now, not the boy\'s. What\'s it to be?',
    options: [
      { text: 'Back where it came from, and the cut closed.', moral: { id: 'tlBarrow:back', a: 4, tr: { loyalty: 2 }, rep: { scarrow: 5 }, npc: { master_jewell: 20, tl_kenwyn: 10 }, note: 'Put the gold collar back in Pellow\'s Barrow and closed the children\'s cut.', fame: 'put Pellow\'s gold back on Tolmen Moor', spread: 'local' }, effect: (g) => { g.take('tl_lunula', 1); g.setFlag(BARROW, 'back'); g.addMarks(80); g.setStage(BARROW, 'done'); }, next: 'elB' },
      { text: 'To the Collegium. It\'s the oldest thing on this moor; somebody should know it.', moral: { id: 'tlBarrow:collegium', tr: { honesty: 2 }, rep: { collegium: 6, scarrow: -2 }, npc: { master_jewell: -15, tl_kenwyn: 5 } }, effect: (g) => { g.take('tl_lunula', 1); g.setFlag(BARROW, 'collegium'); g.addMarks(90); g.setStage(BARROW, 'done'); }, next: 'elC' },
      { text: 'Let the Hoskens sell it. The living need it more than Pellow does.', moral: { id: 'tlBarrow:sold', tr: { compassion: 3 }, rep: { scarrow: 2 }, npc: { master_jewell: -25, tl_kenwyn: 15 } }, effect: (g) => { g.take('tl_lunula', 1); g.setFlag(BARROW, 'sold'); g.addMarks(70); g.setStage(BARROW, 'done'); }, next: 'elS' },
      { text: 'It\'s mine now.', need: { band: ['bad', 'evil'] }, moral: { id: 'tlBarrow:kept', a: -10, tr: { greed: 5 }, rep: { scarrow: -6 }, npc: { master_jewell: -40, tl_kenwyn: -15 }, note: 'Kept the gold collar out of Pellow\'s Barrow for yourself.', major: true, fame: 'robbed Pellow\'s Barrow on Tolmen Moor', spread: 'local' }, effect: (g) => { g.take('tl_lunula', 1); g.give('tl_lunula_kept', 1); g.setFlag(BARROW, 'kept'); g.setStage(BARROW, 'done'); }, next: 'elK' },
    ],
  },
  elB: { text: 'Good. Then hold the lamp. I\'ll lay it on him and we\'ll turf it over together, and I\'ll speak the words, and you\'ll not repeat them.' },
  elC: { text: 'Then it goes in a glass case, with a card under it in a Collegium hand. Pellow will be very cold in Ansbury. I hope they keep the room warm.' },
  elS: { text: 'The living. Aye. There are always more of them, and they always need it more. Go on. I\'ll sit up with Pellow tonight myself.' },
  elK: { text: 'Then he\'ll walk round your house instead of the boy\'s. I\'d not sleep, if I were you. I\'d not sleep at all.' },
};

// ================================================================ The Widows' Turf

const turfNodes: Record<string, DNode> = {
  wt1: { text: 'Every autumn I cut the widows\' turf. Three houses on the Tor, three loads each, enough for the winter. My mother did it, and hers. This year my back says no.', next: 'wt2' },
  wt2: {
    text: 'The bank\'s on the moor west of the Tor, past the old wall. Cut it, stack it, and carry it round. The wolves come down to the bank at this time of year. Will you?',
    options: [{ text: 'I\'ll cut the widows\' turf.', effect: (g) => g.setStage(TURF, 'cut') }, { text: 'Not now, Win.' }],
  },
  wtWait: { text: (g) => (at(g, TURF) === 'cut' ? `The bank, west, past the wall. ${cut(g)} of three cut.` : 'Jenifer Bolitho and Thomasina Hocking. Then come and see me.') },
  wtT1: { text: 'Two houses done. Good. Now, Mother Treen\'s down for a share. She\'s on the widows\' list.', next: 'wtT2' },
  wtT2: { text: 'Not her. The winter of the big snow, my father was dying in the back room, and we\'d no turf, and my mother went to her door, and she shut it. Said there was none to spare. There was a stack to the eaves. Not her.', next: 'wtT3' },
  wtT3: {
    text: 'Give her share to Jenifer. Or keep it. I don\'t care.',
    options: [
      { text: 'All right, Win. Not her.', moral: { id: 'tlTurf:left', tr: { loyalty: 3 }, npc: { marypol: 15, tl_treen: -10 } }, effect: (g) => { g.setFlag(TURF, 'left'); g.addMarks(70); g.setStage(TURF, 'done'); }, next: 'wtL' },
      { text: 'She\'s old and she\'s cold. I\'m taking it to her anyway.', moral: { id: 'tlTurf:anyway', a: 3, tr: { compassion: 3, loyalty: -2 }, npc: { marypol: -15, tl_treen: 15 } }, effect: (g) => { g.setFlag(TURF, 'anyway'); g.addMarks(70); g.setStage(TURF, 'done'); }, next: 'wtA' },
      { text: 'Carry it to her yourself, Win. I\'ll walk with you.', need: { trait: { compassion: [57, 100] } }, moral: { id: 'tlTurf:win', a: 6, tr: { compassion: 3, courage: 2 }, npc: { marypol: 20, tl_treen: 20 }, note: 'Walked Win Polwhele to Mother Treen\'s door with the widows\' turf, after forty years of a shut door.', major: true, fame: 'got Win Polwhele to carry turf to Mother Treen\'s door', spread: 'local' }, effect: (g) => { g.setFlag(TURF, 'win'); g.addMarks(90); g.setStage(TURF, 'done'); }, next: 'wtW' },
    ],
  },
  wtL: { text: 'Thank you. I know what it looks like. I don\'t care what it looks like.' },
  wtA: { text: 'Then you do it, and don\'t tell me how she looked when you did. I don\'t want to know.' },
  wtW: { speaker: 'narrator', text: 'It takes her the length of the Tor to say yes. At the door, Mother Treen looks at the turf, and at Win, for a long time. "Your mother," she says, "was the better woman." "She was," says Win. Then the door stays open, and Win goes in, and you stack the turf by the hearth by yourself.' },
  wtAfter: { text: (g) => (g.flag(TURF) === 'win' ? 'I sit with her Thursdays. She cheats at cribbage. So did my mother. They\'d have got on, if they\'d let themselves.' : 'The widows are warm. That\'s the job.') },
};

const widow = (name: string, id: string, text: string): DialogueTree => ({
  start: (g) => (at(g, TURF) === 'carry' && !given(g, id) ? 'w1' : 'w0'),
  nodes: {
    w0: { text: `${name}. Mind the cat.` },
    w1: { text, options: [{ text: '(Stack the turf by her door.)', effect: (g) => { g.setFlag('tlGave:' + id, 1); } }] },
  },
});

const quests: Record<string, QuestDef> = {
  [BARROW]: {
    id: BARROW, name: 'The Children\'s Barrow', region: 'tolmen', depth: 'quest',
    notes: (g, s) => {
      if (s === 'barrow') return 'The schoolmaster took the children digging into Pellow\'s Barrow, and Kenwyn Hosken pocketed a gold collar. Something has walked on the moor at night since. I have the collar, and I\'m going up to the barrow, south-west of the Tor.';
      if (s === 'elias') return 'The barrow\'s stones got up out of the cut, and I put them down. Elias Jewell, who keeps the barrows, is coming up the moor.';
      const f = g.flag(BARROW);
      return f === 'back' ? 'The collar went back on Pellow, and the cut was closed.' : f === 'collegium' ? 'The collar went to the Collegium in Ansbury.' : f === 'sold' ? 'The Hoskens sold the collar and bought a mare.' : 'I kept the collar.';
    },
    objectives: (g, s) => (s === 'barrow' ? [{ text: `Put down what walks at Pellow\'s Barrow (${Math.min(1, killed(g, 'tlCairn'))}/1)`, done: killed(g, 'tlCairn') >= 1 }]
      : s === 'elias' ? [{ text: 'Talk to Elias Jewell at the barrow', marker: 'tl_elias' }] : []),
    advance: (g, s) => (s === 'barrow' && killed(g, 'tlCairn') >= 1 ? 'elias' : null),
    marks: (_g, s): Marks => (!s ? { tl_kenwyn: '!' } : s === 'elias' ? { tl_elias: '?' } : {}),
    walk: { cast: ['tl_kenwyn', 'tl_elias'], kill: { barrow: [['torcairn', 1]] } },
  },
  [TURF]: {
    id: TURF, name: 'The Widows\' Turf', region: 'tolmen', depth: 'quest',
    notes: (g, s) => {
      if (s === 'cut') return 'Win Polwhele cuts the widows\' turf every autumn and her back has gone. The bank is on the moor west of the Tor, and the wolves come down to it.';
      if (s === 'carry') return 'The turf\'s cut and stacked. Carry it to Jenifer Bolitho and Thomasina Hocking on the Tor, then back to Win.';
      if (s === 'win') return 'Two houses done. Win wants a word about the third.';
      const f = g.flag(TURF);
      return f === 'left' ? 'Mother Treen got no turf, as Win wished.' : f === 'anyway' ? 'I took Mother Treen her share against Win\'s wishes.' : 'Win carried the turf to Mother Treen\'s door herself.';
    },
    objectives: (g, s) => (s === 'cut' ? [...BANK.map((_, i) => ({ text: `Cut turf at the bank (${['first', 'second', 'third'][i]} face)`, done: !!g.flag('tlBank' + i), marker: 'tlBank' + i })), { text: `Drive the wolves off the bank (${Math.min(WOLVES.length, killed(g, 'tlWolves'))}/${WOLVES.length})`, done: killed(g, 'tlWolves') >= WOLVES.length }]
      : s === 'carry' ? [{ text: 'Take turf to Jenifer Bolitho', done: given(g, 'tl_bolitho'), marker: 'tl_bolitho' }, { text: 'Take turf to Thomasina Hocking', done: given(g, 'tl_hocking'), marker: 'tl_hocking' }]
      : s === 'win' ? [{ text: 'Go back to Win Polwhele', marker: 'marypol' }] : []),
    advance: (g, s) => (s === 'cut' && cut(g) >= BANK.length && killed(g, 'tlWolves') >= WOLVES.length ? 'carry' : s === 'carry' && given(g, 'tl_bolitho') && given(g, 'tl_hocking') ? 'win' : null),
    marks: (_g, s): Marks => (!s ? { marypol: '!' } : s === 'win' ? { marypol: '?' } : {}),
    walk: { cast: ['marypol', 'tl_bolitho', 'tl_hocking'], kill: { cut: [['moorwolf', 2]] } },
  },
};

const spawns: QuestSpawn[] = [
  { tag: 'tlCairn', type: 'torcairn', at: CAIRN_AT, when: (g) => at(g, BARROW) === 'barrow' },
  { tag: 'tlWolves', type: 'moorwolf', at: WOLVES, when: (g) => at(g, TURF) === 'cut' },
];

const BANK_TOASTS = [
  'The slane goes in with a wet bite, and the turf comes up in a long black brick that smells of a thousand years of rain. You lay it to dry on the bank.',
  'Twenty bricks, thirty, stacked in little open towers so the wind can get through them. Win\'s mother stacked them the same way, she says. Everybody\'s mother did.',
  'The last face. Your back aches the way Win\'s must. Enough for three houses and a winter, if the winter\'s kind.',
];

const things: WorldThing[] = [
  ...BANK.map(([x, z], i): WorldThing => ({
    id: 'tlBank' + i, x, z, label: 'Cut turf', radius: 2.4, look: 'trampled',
    when: (g) => at(g, TURF) === 'cut' && !g.flag('tlBank' + i),
    use: (g) => { g.setFlag('tlBank' + i, 1); g.toast(BANK_TOASTS[i]); },
  })),
  { id: 'tlCut', x: CUT.x, z: CUT.z, label: 'Look into the cut', radius: 2.6, look: 'none',
    when: (g) => at(g, BARROW) === 'barrow',
    use: (g) => g.toast('The children cut in from the east, neat as a lesson, as far as the capstone. Beyond it, a dark the size of a coffin, and a smell of old cold. The kerb-stones round the mound have moved since the cut was made. One of them is missing.') },
];

const NPCS: NpcDef[] = [
  { id: 'tl_kenwyn', name: 'Kenwyn Hosken', title: 'The moorman\'s boy, Scarrow Tor', look: { skin: '#e0b48e', hair: '#3a2a1e', hairStyle: 3, eyes: '#4a5a4a', tunic: '#5a5040', trim: '#3a3428', trousers: '#3a3430', boots: '#2a1e14', freckles: true, build: 0.62, age: 0.06 },
    schedule: [{ from: 7, to: 19, at: [KENWYN.x, KENWYN.z], face: [KENWYN.x, KENWYN.z + 3], anim: 'idle' }], barks: ['I\'m sorry.'] },
  { id: 'tl_elias', name: 'Elias Jewell', title: 'Keeps the barrows on Tolmen Moor', look: { skin: '#d8a882', hair: '#d8d4cc', hairStyle: 0, beard: true, eyes: '#3a3a42', tunic: '#3a3a32', trim: '#5a5a4a', trousers: '#2e2e28', boots: '#1e1a16', cape: '#2a2a24', hat: 'hood', hatColor: '#2a2a24', build: 0.92, age: 0.8 },
    schedule: [{ from: 0, to: 24, at: [ELIAS.x, ELIAS.z], face: [MOUND.x, MOUND.z], anim: 'idle' }], when: (g) => at(g, BARROW) === 'elias', barks: ['Show me.'] },
  { id: 'tl_bolitho', name: 'Jenifer Bolitho', title: 'Scarrow Tor', look: { frame: 'f', skin: '#d8a882', hair: '#d8d4cc', hairStyle: 2, eyes: '#4a4a3a', tunic: '#2a2a30', trim: '#4a4a52', trousers: '#2a2a30', boots: '#1e1a16', hat: 'kerchief', hatColor: '#2a2a30', lashes: true, build: 0.85, age: 0.78 },
    schedule: [{ from: 7, to: 19, at: [WIDOWS.tl_bolitho.x, WIDOWS.tl_bolitho.z], face: [WIDOWS.tl_bolitho.x - 2, WIDOWS.tl_bolitho.z], anim: 'idle' }], barks: ['Is it cold yet?'] },
  { id: 'tl_hocking', name: 'Thomasina Hocking', title: 'Scarrow Tor', look: { frame: 'f', skin: '#e0b48e', hair: '#9a948c', hairStyle: 3, eyes: '#4a5a6a', tunic: '#3a3a42', trim: '#5a5a62', trousers: '#2a2a30', boots: '#1e1a16', lashes: true, build: 1.05, age: 0.7 },
    schedule: [{ from: 7, to: 19, at: [WIDOWS.tl_hocking.x, WIDOWS.tl_hocking.z], face: [WIDOWS.tl_hocking.x - 2, WIDOWS.tl_hocking.z], anim: 'idle' }], barks: ['Win\'s late this year.'] },
  { id: 'tl_treen', name: 'Mother Treen', title: 'The constable\'s mother', look: { frame: 'f', skin: '#e0b48e', hair: '#e0dcd4', hairStyle: 2, eyes: '#3a3a42', tunic: '#1e1e24', trim: '#3a3a42', trousers: '#1e1e24', boots: '#1a1614', cape: '#2a2a30', lashes: true, build: 0.8, age: 0.88 },
    schedule: [{ from: 8, to: 18, at: [WIDOWS.tl_treen.x, WIDOWS.tl_treen.z], face: [WIDOWS.tl_treen.x + 2, WIDOWS.tl_treen.z], anim: 'idle' }], barks: ['Hm.'] },
];

const ITEMS: ItemDef[] = [
  { id: 'tl_lunula', name: 'Pellow\'s collar', kind: 'quest', rarity: 'rare', stack: false, value: 0, icon: { shape: 'pendant', a: '#e0bd64', b: '#c8a040' }, desc: 'A crescent of gold beaten as thin as a beech leaf, scratched all over with tiny lines in rows. Older than any name on Tolmen Moor.' },
  { id: 'tl_lunula_kept', name: 'A barrow\'s gold collar', kind: 'collectible', rarity: 'rare', stack: false, value: 400, icon: { shape: 'pendant', a: '#e0bd64', b: '#c8a040' }, desc: 'Pellow\'s collar, out of his barrow for good. It is very cold to hold, and stays cold.' },
];

export const TOLMEN_MORE: RegionContent = {
  id: 'tolmenMore',
  items: ITEMS,
  npcs: NPCS,
  dialogue: {
    tl_kenwyn: kenwyn,
    tl_elias: { start: (g) => (at(g, BARROW) === 'elias' ? 'el1' : 'elB'), nodes: eliasNodes },
    tl_bolitho: widow('Jenifer Bolitho', 'tl_bolitho', 'Win\'s turf? Bless her. And bless you, carrying it. Stack it by the door, dear, under the eave, where it won\'t get the rain.'),
    tl_hocking: widow('Thomasina Hocking', 'tl_hocking', 'Oh, turf. I\'d been lying awake about turf. Lay it down there, by the wall. Tell Win I\'ll knit her something. She\'ll hate it.'),
    tl_treen: { start: () => 't0', nodes: { t0: { text: (g) => (g.flag(TURF) === 'win' ? 'Thursdays, Win comes. We play crib. She\'s terrible.' : g.flag(TURF) === 'anyway' ? 'Somebody left turf at my door. I know who sent it, and I know who didn\'t. Hm.' : 'Constable Treen\'s mother. Who\'s asking?') } } },
  },
  quests,
  spawns,
  things,
  hooks: (D) => {
    hook(D, 'marypol', (g) => {
      const s = at(g, TURF);
      if (!s) return 'wt1';
      if (s === 'cut' || s === 'carry') return 'wtWait';
      if (s === 'win') return 'wtT1';
      return 'wtAfter';
    }, turfNodes);
  },
};
