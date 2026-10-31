import type { SkillDef } from './classes';
import type { Cost } from './combat';

// The realm's skill lines: what anyone can learn, whatever their calling, the way ESO's guild and world
// lines sit beside its class lines. Each is taught by a people of the realm and opens when you've
// reached them (a level, or setting foot in their country); its skills open one by one as you level,
// each bought with a skill point like a calling's, and each goes in a utility key (6 or 7) beside your
// signature. They rank with use and are paid in stamina or magicka like any other skill.
//
// A line skill is made of effects (Fx), which game/ClassKit.ts plays in order: so the same few pieces,
// a blow, a burst, a patch of ground, a leap, a heal, a ward, a few seconds' strength, make thirty skills
// that each do their own thing. Numbers are in the calling skills' terms: dmg is a share of a full
// swing's power, heal and ward a share of your health. scripts/classbalance.ts holds them to a utility's
// worth.

export type Fx =
  /** One foe in reach: a blow, and what it leaves (stun, slow, a wound, exposed, several quick blows). */
  | { k: 'strike'; range: number; dmg: number; hits?: number; stun?: number; slow?: number; dot?: [number, number]; expose?: number }
  /** Everything round you. */
  | { k: 'burst'; r: number; dmg: number; stun?: number; slow?: number }
  /** A point on the ground, after a moment (a thrown pot, a horse's hooves, a ship's guns). */
  | { k: 'ground'; range: number; r: number; dmg: number; delay: number; stun?: number }
  /** Ground that hurts each second for a while, or a snare that springs on the first foot in it. */
  | { k: 'zone'; range: number; r: number; secs: number; dmg: number; slow?: number; snare?: number; color: string }
  /** To the target, striking as you land. */
  | { k: 'leap'; range: number; dmg: number; stun?: number; expose?: number }
  /** Forward along the way you face. */
  | { k: 'dash'; dist: number }
  /** To a point on the ground. */
  | { k: 'blink'; range: number }
  /** Health back now, and over some seconds; harms taken off. */
  | { k: 'heal'; now?: number; over?: [number, number]; cleanse?: number }
  /** A ward on you (or on everyone with you) that soaks blows. */
  | { k: 'ward'; amt: number; secs: number; all?: boolean }
  /** A few seconds' change: what you deal, what you take, blows that miss you, out of sight. */
  | { k: 'buff'; secs: number; dealt?: number; taken?: number; evade?: boolean; hide?: boolean };

export interface LineSkill extends SkillDef { line: string; need: number; cost: Cost; fx: Fx[]; color: string }

export interface LineCtx { level: number; been(region: string): boolean }

export interface SkillLine {
  id: string;
  name: string;
  /** Who teaches it, in a line. */
  blurb: string;
  /** How it opens, in words. */
  opensWhen: string;
  opens(c: LineCtx): boolean;
  skills: LineSkill[];
}

const st = (n: number): Cost => ({ pool: 'stamina', n });
const mg = (n: number): Cost => ({ pool: 'magicka', n });

export const LINES: SkillLine[] = [
  {
    id: 'wayfare', name: 'The Wayfarers\' Road',
    blurb: 'What the carters, drovers and Post riders know: how to keep going when you\'d rather sit down.',
    opensWhen: 'Level 3',
    opens: (c) => c.level >= 3,
    skills: [
      { line: 'wayfare', id: 'ln_secondwind', name: 'Second Wind', icon: 'dressing', cd: 16, need: 3, cost: st(12), color: '#9ad87a',
        desc: 'Get your breath back: a fifth of your health over six seconds, and the newest harm on you shaken off.', fx: [{ k: 'heal', over: [0.2, 6], cleanse: 1 }] },
      { line: 'wayfare', id: 'ln_longstride', name: 'Long Stride', icon: 'quickstep', cd: 10, need: 6, cost: st(10), color: '#9ad87a',
        desc: 'Seven blocks forward in one go, and for two seconds after it, blows land a fifth lighter.', fx: [{ k: 'dash', dist: 7 }, { k: 'buff', secs: 2, taken: 0.8 }] },
      { line: 'wayfare', id: 'ln_roadsong', name: 'Road Song', icon: 'rally', cd: 24, need: 10, cost: st(14), color: '#e8c060',
        desc: 'The song that gets a cart up the last hill: for ten seconds your blows land an eighth harder.', fx: [{ k: 'buff', secs: 10, dealt: 1.12 }] },
      { line: 'wayfare', id: 'ln_remedy', name: 'Roadside Remedy', icon: 'mend', cd: 18, need: 14, cost: mg(14), color: '#9ad87a',
        desc: 'A dock leaf and a swig from the flask: two harms off you and a tenth of your health back.', fx: [{ k: 'heal', now: 0.1, cleanse: 2 }] },
      { line: 'wayfare', id: 'ln_waymark', name: 'Waymark Step', icon: 'blink', cd: 16, need: 20, cost: mg(16), color: '#8ac8ff',
        desc: 'The step the waymarks take, taken by hand: to a point up to twelve blocks off, and nothing touches you for half a second as you go.', fx: [{ k: 'buff', secs: 0.5, evade: true }, { k: 'blink', range: 12 }] },
    ],
  },
  {
    id: 'muster', name: 'The Muster',
    blurb: 'Sergeant Holroyd\'s roll of old toll riders, who still ride the Charter\'s roads for whoever pays them.',
    opensWhen: 'Level 8, or on the Crown Road',
    opens: (c) => c.level >= 8 || c.been('crownroad'),
    skills: [
      { line: 'muster', id: 'ln_ridercharge', name: 'Rider\'s Charge', icon: 'leap', cd: 14, need: 8, cost: st(16), color: '#e07a4a',
        desc: 'At the target from up to twelve blocks, the way a toll rider comes at a man who won\'t pay: a heavy blow and a stagger.', fx: [{ k: 'leap', range: 12, dmg: 1.3, stun: 0.8 }] },
      { line: 'muster', id: 'ln_hock', name: 'Cut the Hock', icon: 'hamstring', cd: 10, need: 11, cost: st(12), color: '#c84a3a',
        desc: 'Low and to the back of the leg: it bleeds for six seconds and goes slow for five.', fx: [{ k: 'strike', range: 3.5, dmg: 0.8, slow: 5, dot: [1.2, 6] }] },
      { line: 'muster', id: 'ln_horn', name: 'Muster Horn', icon: 'oath', cd: 30, need: 15, cost: st(18), color: '#e8c060',
        desc: 'Three notes on the horn: for eight seconds you strike a seventh harder and take a tenth less.', fx: [{ k: 'buff', secs: 8, dealt: 1.15, taken: 0.9 }] },
      { line: 'muster', id: 'ln_closeranks', name: 'Close Ranks', icon: 'holdfast', cd: 22, need: 19, cost: st(16), color: '#8aa8d0',
        desc: 'Shoulder to shoulder: a ward of a sixth of your health on you and everyone with you, for eight seconds.', fx: [{ k: 'ward', amt: 0.16, secs: 8, all: true }] },
      { line: 'muster', id: 'ln_trample', name: 'Trample', icon: 'groundpound', cd: 18, need: 24, cost: st(18), color: '#c89a5a',
        desc: 'Ride them down: hooves land on a point up to eight blocks off, hard, and everything there is knocked off its feet.', fx: [{ k: 'ground', range: 8, r: 3.5, dmg: 1.5, delay: 0.4, stun: 1 }] },
    ],
  },
  {
    id: 'hedge', name: 'Hedge-craft',
    blurb: 'The wise women of the dales and the woods: poultices, bitter cups, and a few things the Kirk doesn\'t ask about.',
    opensWhen: 'Level 12, or in Hagworm Wood',
    opens: (c) => c.level >= 12 || c.been('brambledeep'),
    skills: [
      { line: 'hedge', id: 'ln_poultice', name: 'Nettle Poultice', icon: 'restore', cd: 18, need: 12, cost: mg(14), color: '#7ac85a',
        desc: 'It stings, then it doesn\'t: a quarter of your health back over eight seconds.', fx: [{ k: 'heal', over: [0.25, 8] }] },
      { line: 'hedge', id: 'ln_thorns', name: 'Hex of Thorns', icon: 'graverot', cd: 12, need: 15, cost: mg(14), color: '#6a9a3a',
        desc: 'A word, and a twist of bramble in the hand: the target bleeds thorns for eight seconds.', fx: [{ k: 'strike', range: 14, dmg: 0.4, dot: [2.2, 8] }] },
      { line: 'hedge', id: 'ln_rowan', name: 'Rowan Charm', icon: 'lampward', cd: 20, need: 18, cost: mg(16), color: '#e07050',
        desc: 'Red berries on red thread: a ward of a fifth of your health for ten seconds.', fx: [{ k: 'ward', amt: 0.2, secs: 10 }] },
      { line: 'hedge', id: 'ln_bitter', name: 'Bitter Cup', icon: 'mercy', cd: 20, need: 22, cost: mg(12), color: '#c8a050',
        desc: 'Three harms off you and a little health back, and for six seconds your blows land a twelfth harder.', fx: [{ k: 'heal', now: 0.06, cleanse: 3 }, { k: 'buff', secs: 6, dealt: 1.08 }] },
      { line: 'hedge', id: 'ln_fairyring', name: 'Fairy Ring', icon: 'snare', cd: 20, need: 28, cost: mg(18), color: '#b07ae0',
        desc: 'A ring of pale toadstools on a point up to twelve blocks off: for six seconds whatever stands in it is slowed and stung.', fx: [{ k: 'zone', range: 12, r: 3, secs: 6, dmg: 0.4, slow: 1.5, color: '#b07ae0' }] },
    ],
  },
  {
    id: 'wheel', name: 'The Wheel',
    blurb: 'The Kilnfolk\'s guild of makers, who build in brass and steam and don\'t teach mainlanders, as a rule.',
    opensWhen: 'Level 25, or on Kell',
    opens: (c) => c.level >= 25 || c.been('kell'),
    skills: [
      { line: 'wheel', id: 'ln_brassbomb', name: 'Brass Bomb', icon: 'flashfire', cd: 14, need: 25, cost: st(16), color: '#ffb040',
        desc: 'Thrown to a point up to fourteen blocks off; it goes up a moment after it lands.', fx: [{ k: 'ground', range: 14, r: 3, dmg: 1.7, delay: 0.8 }] },
      { line: 'wheel', id: 'ln_steamvent', name: 'Steam Vent', icon: 'smoke', cd: 14, need: 28, cost: mg(14), color: '#e8eef0',
        desc: 'A valve opened on your back: scalding steam round you, and everything close is staggered.', fx: [{ k: 'burst', r: 3.5, dmg: 0.8, stun: 0.8 }] },
      { line: 'wheel', id: 'ln_springheel', name: 'Spring Heel', icon: 'tumble', cd: 12, need: 32, cost: st(12), color: '#ffb040',
        desc: 'Brass springs in the boots: nine blocks forward, and nothing lands on you as you go.', fx: [{ k: 'buff', secs: 0.45, evade: true }, { k: 'dash', dist: 9 }] },
      { line: 'wheel', id: 'ln_governor', name: 'Governor\'s Ward', icon: 'shield', cd: 22, need: 36, cost: mg(16), color: '#ffcc60',
        desc: 'A spinning brass cage that takes the blows: a ward of a fifth of your health for eight seconds.', fx: [{ k: 'ward', amt: 0.22, secs: 8 }] },
      { line: 'wheel', id: 'ln_escapement', name: 'Let the Escapement Go', icon: 'kindle', cd: 30, need: 44, cost: st(20), color: '#ff8a2a',
        desc: 'Everything at once: for six seconds your blows land a fifth harder, and you take a tenth more.', fx: [{ k: 'buff', secs: 6, dealt: 1.2, taken: 1.1 }] },
    ],
  },
  {
    id: 'gate', name: 'The Gatekeepers\' Rolls',
    blurb: 'Northgate\'s Archive keeps the old charges against the dead, and Edda Rusk will copy them out for anyone who\'ll stand on the wall.',
    opensWhen: 'Level 40, or in the Greywaste or the Held',
    opens: (c) => c.level >= 40 || c.been('greywaste') || c.been('held'),
    skills: [
      { line: 'gate', id: 'ln_saltline', name: 'Salt Line', icon: 'caltrops', cd: 16, need: 30, cost: mg(14), color: '#f4f0e8',
        desc: 'A line of salt across a point up to ten blocks off: the first thing to step over it is held there.', fx: [{ k: 'zone', range: 10, r: 3, secs: 12, dmg: 0.6, snare: 1.6, color: '#f4f0e8' }] },
      { line: 'gate', id: 'ln_rollcall', name: 'Roll Call', icon: 'cover', cd: 24, need: 34, cost: mg(16), color: '#9fe8ff',
        desc: 'Every name read out, and everyone here answers: a ward of a seventh of their health on you and everyone with you.', fx: [{ k: 'ward', amt: 0.14, secs: 10, all: true }] },
      { line: 'gate', id: 'ln_shutgate', name: 'Shut the Gate', icon: 'bash', cd: 16, need: 38, cost: st(18), color: '#9fe8ff',
        desc: 'Against the dead, never the living: a blow that throws back everything round you, and holds it a moment.', fx: [{ k: 'burst', r: 4.5, dmg: 1.2, stun: 1.2 }] },
      { line: 'gate', id: 'ln_gatelantern', name: 'Gate Lantern', icon: 'lanternlight', cd: 18, need: 42, cost: mg(18), color: '#ffc070',
        desc: 'The lantern they hang over the postern, set down on a point up to twelve blocks off: it burns what stands by it for seven seconds.', fx: [{ k: 'zone', range: 12, r: 3, secs: 7, dmg: 0.55, color: '#ffc070' }] },
      { line: 'gate', id: 'ln_lastwatch', name: 'The Last Watch', icon: 'vigil', cd: 40, need: 48, cost: st(20), color: '#9fe8ff',
        desc: 'Forty years at the gate: for six seconds you take a third less, and a tenth of your health comes back.', fx: [{ k: 'heal', now: 0.1 }, { k: 'buff', secs: 6, taken: 0.65 }] },
    ],
  },
  {
    id: 'brethren', name: 'The Brethren\'s Ways',
    blurb: 'How the captains of the Keys fight, which is however wins. Ned Vey says you start out pulling an oar.',
    opensWhen: 'Level 45, or in the Keys',
    opens: (c) => c.level >= 45 || c.been('keys'),
    skills: [
      { line: 'brethren', id: 'ln_boardinghook', name: 'Boarding Hook', icon: 'hook', cd: 14, need: 45, cost: st(16), color: '#c8a070',
        desc: 'Over the rail on a rope to the target from up to fourteen blocks: it takes a fifth more from every blow for three seconds.', fx: [{ k: 'leap', range: 14, dmg: 0.9, expose: 3 }] },
      { line: 'brethren', id: 'ln_cutlass', name: 'Cutlass Work', icon: 'flurry', cd: 9, need: 48, cost: st(14), color: '#d8d0c0',
        desc: 'Four quick cuts, the way they teach it on a crowded deck.', fx: [{ k: 'strike', range: 3.5, dmg: 0.42, hits: 4 }] },
      { line: 'brethren', id: 'ln_smokepot', name: 'Smoke Pot', icon: 'smoke', cd: 22, need: 52, cost: st(16), color: '#8a8a8a',
        desc: 'Broken at your feet: everything close coughs and staggers, and for three seconds nothing can find you.', fx: [{ k: 'burst', r: 3, dmg: 0.3, stun: 0.6 }, { k: 'buff', secs: 3, hide: true }] },
      { line: 'brethren', id: 'ln_grog', name: 'A Tot of Grog', icon: 'bloodup', cd: 30, need: 56, cost: st(14), color: '#c86a2a',
        desc: 'A sixth of your health back, and for ten seconds you hit an eighth harder and feel a little less.', fx: [{ k: 'heal', now: 0.15 }, { k: 'buff', secs: 10, dealt: 1.12, taken: 0.95 }] },
      { line: 'brethren', id: 'ln_broadside', name: 'Broadside', icon: 'pillar', cd: 24, need: 62, cost: st(20), color: '#ff8a40',
        desc: 'Signal the guns: a second later, iron lands on a point up to sixteen blocks off.', fx: [{ k: 'ground', range: 16, r: 4, dmg: 2.1, delay: 1 }] },
    ],
  },
];

export const LINE_SKILLS: LineSkill[] = LINES.flatMap((l) => l.skills);
export const lineSkill = (id: string): LineSkill | undefined => LINE_SKILLS.find((s) => s.id === id);
export const lineOf = (id: string): SkillLine | undefined => LINES.find((l) => l.skills.some((s) => s.id === id));
