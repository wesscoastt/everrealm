import type { DialogueTree, GameApi } from '../../game/api';
import type { Appearance } from '../../entities/humanoid';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { APPRENTICE_FEE, APPRENTICE_LEVEL, CALLINGS, crossUtilities, type CallingId } from '../classes';

// The masters of the callings. A calling is for life (chosen when a character is made), but from
// level 25 anyone may apprentice themselves to a master of another calling, where that craft is
// practised, and learn their utility skills: one of the two utility keys (7) can then hold one of
// them (data/classes.ts chosenUtilities). One master at a time; a new one means walking to them and
// paying again. What a master teaches never includes the skills that only work through their own
// calling's craft (Kindle, Rally).

interface Master { calling: CallingId; id: string; name: string; title: string; at: [number, number]; face: [number, number]; look: Partial<Appearance>; hello: string; teach: string; own: string; barks: string[] }

const MASTERS: Master[] = [
  {
    calling: 'warden', id: 'master_caddick', name: 'Hugh Caddick', title: 'Warden-sergeant, the Waystation toll', at: [707.5, 577.5], face: [703.5, 574.5],
    look: { skin: '#d8a882', hair: '#8a8a8a', hairStyle: 0, facial: 4, tunic: '#2a4a86', trim: '#e0bd64', trousers: '#2a2a30', boots: '#1e1a16', shoulderPads: '#9aa0a6', build: 1.15, age: 0.6 },
    hello: 'Caddick. I kept this toll when there were wardens on every stretch of the road. Now there\'s me, and the wolves know it.',
    teach: 'How to plant your feet and hold, and how to throw a shield and get it back. Not the rest; the rest takes ten years.',
    own: 'You\'re a warden already. Go and stand somewhere.',
    barks: ['Feet apart.', 'Hold the line.'],
  },
  {
    calling: 'reaver', id: 'master_hollis', name: 'Bet Hollis', title: 'Keeps the ring in the slag yard', at: [1010.5, 1030.5], face: [1006.5, 1027.5],
    look: { frame: 'f', skin: '#c89070', hair: '#2a1a12', hairStyle: 4, tunic: '#5a2a1e', trim: '#c86a2a', trousers: '#2a201c', boots: '#1a1614', gloves: '#3a2a1a', scar: true, lashes: true, build: 1.12, age: 0.4 },
    hello: 'Bet Hollis. I run the ring behind the slag heap. Company men fight there on pay night, and I take a cut of everything.',
    teach: 'The wide cut, the quick hands, and where to put a blade so a thing stops running. The rage you\'ll have to bring yourself.',
    own: 'You\'re a reaver. You don\'t need me; you need someone to hit.',
    barks: ['Pay night Friday.', 'Keep your guard up.'],
  },
  {
    calling: 'ashcaller', id: 'master_fenwick', name: 'Tobias Fenwick', title: 'Teaches the fire, the Glass Kirk', at: [1166.5, 1806.5], face: [1170.5, 1803.5],
    look: { skin: '#e2b894', hair: '#c8a060', hairStyle: 1, tunic: '#7a2a1a', trim: '#e8a020', trousers: '#3a2a20', boots: '#2a1e14', cape: '#5a1a12', age: 0.45 },
    hello: 'Tobias Fenwick. I teach the fire here, to anyone who\'ll sit still long enough to listen for it.',
    teach: 'A ring of fire on the ground, and a step back through cinders. The rest needs the kindling, and that needs years of sitting still.',
    own: 'You\'ve the fire already. Sit with the crystal a while; it does you good.',
    barks: ['Listen.', 'Hot or cold?'],
  },
  {
    calling: 'pathfinder', id: 'master_thackery', name: 'Ned Thackery', title: 'Tracker, Fellers\' Camp', at: [453.5, 508.5], face: [449.5, 511.5],
    look: { skin: '#c88a62', hair: '#5a3a26', hairStyle: 3, facial: 3, tunic: '#4a5a2a', trim: '#8a6a3a', trousers: '#3a3428', boots: '#2a1e14', cape: '#3a4a2a', hat: 'hood', hatColor: '#3a4a2a', age: 0.5 },
    hello: 'Thackery. I track for the fellers, so they know what\'s in the wood before they go and cut it.',
    teach: 'A snare, a rain of arrows, and how to be somewhere else when the blow comes. That\'s most of it, if I\'m honest.',
    own: 'You track already. Go on, then. Find me something.',
    barks: ['Quiet.', 'Fresh tracks.'],
  },
  {
    calling: 'wizard', id: 'master_eyre', name: 'Rosalind Eyre', title: 'Keeper, Scarth Watch', at: [311.5, 1471.5], face: [307.5, 1468.5],
    look: { frame: 'f', skin: '#e8c4a0', hair: '#dedad2', hairStyle: 7, tunic: '#2a3a5a', trim: '#8ad8f0', trousers: '#2a2a30', boots: '#1e1a16', cape: '#1e2a42', lashes: true, age: 0.7, build: 0.94 },
    hello: 'Rosalind Eyre, a keeper at Scarth Watch. I come down to Kelderby for the post and the ink, and I take a pupil when one asks.',
    teach: 'Three words: one to step through the air, one to throw ice, one to let the cold out all at once. Write them down.',
    own: 'You have the words already. Have you written them down?',
    barks: ['Write it down.', 'Cold coming.'],
  },
];

const level = (g: GameApi) => g.level('melee');
const mine = (g: GameApi) => g.flag('class') as CallingId | undefined;

function masterTree(m: Master): DialogueTree {
  const C = CALLINGS.find((c) => c.id === m.calling)!;
  const skills = crossUtilities(C).map((s) => s.name).join(', ');
  return {
    start: () => 'hello',
    nodes: {
      hello: {
        text: m.hello,
        options: [
          { text: 'What do you teach?', next: 'what' },
          { text: 'Will you teach me?', next: 'ask' },
          { text: 'Bye.' },
        ],
      },
      what: { text: m.teach, next: 'hello' },
      ask: {
        text: (g) => mine(g) === m.calling ? m.own
          : g.flag('apprentice') === m.calling ? `You've learned what I teach: ${skills}. Use them well.`
          : level(g) < APPRENTICE_LEVEL ? `Not yet. Get some years on you first: come back at level ${APPRENTICE_LEVEL}.`
          : `${APPRENTICE_FEE} marks and an afternoon. Then your second utility can be ${skills}.${g.flag('apprentice') ? ' You\'ll forget your other master\'s.' : ''}`,
        options: [
          { text: `Agreed. (${APPRENTICE_FEE} marks)`, cond: (g) => mine(g) !== m.calling && g.flag('apprentice') !== m.calling && level(g) >= APPRENTICE_LEVEL, next: 'pay' },
          { text: 'Not now.' },
        ],
      },
      pay: {
        text: (g) => g.marks >= APPRENTICE_FEE ? 'Then watch, and do it after me. Again. Again. There. Yours now.' : `That's not ${APPRENTICE_FEE} marks. Come back when it is.`,
        effect: (g) => {
          if (g.marks < APPRENTICE_FEE) return;
          g.addMarks(-APPRENTICE_FEE);
          g.setFlag('apprentice', m.calling);
          g.toast(`Apprenticed to ${m.name}: ${skills} can go on your second utility key (7). Choose it in the journal, under Calling.`);
        },
      },
    },
  };
}

const npcs: NpcDef[] = MASTERS.map((m) => ({ id: m.id, name: m.name, title: m.title, look: { eyes: '#3a2a1a', hairStyle: 1, ...m.look } as Appearance, barks: m.barks, schedule: [{ from: 0, to: 24, at: m.at, face: m.face, anim: 'idle' }] }));

export const MASTER_CONTENT: RegionContent = {
  id: 'masters',
  npcs,
  dialogue: Object.fromEntries(MASTERS.map((m) => [m.id, masterTree(m)])),
};

/** Who teaches each calling, for the journal. */
/**
 * Training dummies in each master's yard: three in a row on clear, level ground a few steps from where they
 * stand, facing them, for anyone to try a build on (game/Game.ts: the count shows over the action bar while
 * you work at one). The rows were found by a search of the built sites for open ground away from signs and stalls.
 */
const row = (a: [number, number], b: [number, number], c: [number, number], yaw: number) => [a, b, c].map(([x, z]) => ({ x: Math.floor(x), z: Math.floor(z), yaw }));
export const DUMMY_SPOTS: { x: number; z: number; yaw: number }[] = [
  ...row([701.5, 578.5], [702.5, 580.5], [703.5, 582.5], 2.16), // caddick
  ...row([1015.5, 1035.5], [1016.5, 1032.5], [1016.5, 1030.5], -1.96), // hollis
  ...row([1166.5, 1812.5], [1168.5, 1812.5], [1171.5, 1811.5], -2.75), // fenwick
  ...row([458.5, 512.5], [459.5, 509.5], [459.5, 507.5], -1.77), // thackery
  ...row([309.5, 1477.5], [311.5, 1477.5], [313.5, 1477.5], -3.14), // eyre
];

export const MASTER_OF: Record<string, { name: string; where: string }> = Object.fromEntries(MASTERS.map((m) => [m.calling, { name: m.name, where: m.title }]));
