import type { NpcDef } from '../../npcs';

// Turnpike: the people the side quests add to Ansbury, Cotter's End, the Waystation and the
// country between. Voices are noted beside each; canon is in docs/LORE.md under Turnpike.
// Positions are literal because content modules import types only. Ansbury's keep is at
// (820, 300) and its south gate at z 370; Cotter's End's well is at (486, 252); the Waystation's
// firepit is at (712.5, 574.5); Gullmouth's chandlery is at about (1764, 605).

const rosieLook = { skin: '#f0cfb0', hair: '#6a4a2a', hairStyle: 1, eyes: '#5a6a7a', tunic: '#2e3a5a', trim: '#e0c060', trousers: '#2a2a34', boots: '#1e1a18', cape: '#4a2a3a', lashes: true, build: 0.92, age: 0.15 } as const;
const jemLook = { skin: '#c89070', hair: '#2a2018', hairStyle: 0, eyes: '#3a2a1a', tunic: '#6a5a3a', trim: '#8a7a5a', trousers: '#4a4034', boots: '#3a2a1c', build: 1.05, age: 0.15 } as const;
const davyLook = { skin: '#c88a62', hair: '#7a5a3a', hairStyle: 0, eyes: '#4a3a2a', tunic: '#7a2e22', trim: '#c8a060', trousers: '#3a3430', boots: '#2a1e14', hat: 'cap', hatColor: '#3a2a1a', build: 1.0, age: 0.1 } as const;
const watLook = { skin: '#d8b090', hair: '#9a948c', hairStyle: 3, beard: true, eyes: '#4a4a3a', tunic: '#4a4a3a', trim: '#8a7a4a', trousers: '#3a3430', boots: '#2a2220', build: 0.95, age: 0.9 } as const;

export const CR_PEOPLE: NpcDef[] = [
  // ================================================================ Ansbury
  {
    // Founder on Tanners' Row, sixties. Talks about metal as if it had manners. Proud, broke, quotes prices.
    id: 'gisborne', name: 'Gisborne', title: 'Founder, Tanners\' Row',
    look: { skin: '#e0b090', hair: '#8a8478', hairStyle: 3, beard: true, eyes: '#4a3a2a', tunic: '#5a3a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.12, age: 0.7 },
    schedule: [{ from: 0, to: 24, at: [784.5, 316.2], face: [784.5, 320], anim: 'idle' }],
    barks: ['Bell metal wants a slow hand.'],
  },
  {
    // His daughter, late twenties. The better founder. Dry, quick, keeps the books. Calls him "Dad" only when angry.
    id: 'linnet', name: 'Dorcas Gisborne', title: 'Founder, Tanners\' Row',
    look: { skin: '#d8a07a', hair: '#3a2418', hairStyle: 4, eyes: '#4a3a2a', tunic: '#4a4a52', trim: '#a88a5a', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, build: 0.96, age: 0.3 },
    schedule: [{ from: 0, to: 24, at: [778.5, 316.2], face: [780.5, 319], anim: 'idle' }],
  },
  {
    // Night watch at the south gate. Big, easy, jokes to get out of things. Can't read; draws what comes through.
    id: 'ferris', name: 'Ferris Wade', title: 'Night watch, South Gate',
    look: { skin: '#c08060', hair: '#5a3a22', hairStyle: 0, beard: true, eyes: '#4a3a2a', tunic: '#2e3a5a', trim: '#e0c060', trousers: '#2a2a34', boots: '#1e1a18', build: 1.2, height: 1.05, age: 0.4 },
    schedule: [{ from: 0, to: 24, at: [830.5, 362.5], face: [827, 365.5], anim: 'idle' }],
    barks: ['Nothing came through. I drew it.'],
  },
  {
    // Ferris's daughter, nine. Earnest, literal, practising her letters in chalk on anything that holds still.
    id: 'tansy', name: 'Tansy Wade', title: '',
    look: { skin: '#c89070', hair: '#5a3a22', hairStyle: 4, eyes: '#4a3a2a', tunic: '#8a6a3a', trim: '#c8b890', trousers: '#4a3a2a', boots: '#3a2a1c', lashes: true, build: 0.8, height: 0.78, age: 0 },
    schedule: [{ from: 0, to: 24, at: [802.6, 331.2], face: [806, 334], anim: 'idle' }],
    barks: ['L-O-A-D.'],
  },
  {
    // Keeper of the Standards. Guards the sealed Ansbury stone. Ceremonial, exact, measures in grains.
    id: 'dorn', name: 'Tallis Dorn', title: 'Keeper of the Standards',
    look: { skin: '#f0d0b8', hair: '#d8d4cc', hairStyle: 0, eyes: '#5a5a6a', tunic: '#3a2a4a', trim: '#e0c060', trousers: '#2a2a34', boots: '#1e1a18', cape: '#2a2a3a', hat: 'cap', hatColor: '#1e1a22', build: 0.88, age: 0.8 },
    schedule: [{ from: 0, to: 24, at: [826.5, 313.2], face: [826.5, 317], anim: 'idle' }],
    barks: ['A grain is a grain.'],
  },
  {
    // Pie seller on the Charter Market. Loud, quick, never sits down.
    id: 'dory', name: 'Dory Pask', title: 'Pies, Charter Market',
    look: { skin: '#e8b890', hair: '#a85a2a', hairStyle: 2, eyes: '#4a5a3a', tunic: '#8a4a3a', trim: '#e8d0a0', trousers: '#3a2a2a', boots: '#2a1e1a', apron: true, hat: 'kerchief', hatColor: '#e8dcc0', lashes: true, build: 1.15, age: 0.45 },
    schedule: [{ from: 0, to: 24, at: [816, 323.4], face: [816, 318], anim: 'idle' }],
    barks: ['Mutton, eel, Weighhouse!'],
  },
  {
    // Rosie at home after 'home'. Osric's granddaughter, nineteen: sharp, and straightens things like he does.
    id: 'rosieHome', name: 'Rosie Penhallow', title: 'The Weighhouse',
    look: rosieLook,
    schedule: [{ from: 0, to: 24, at: [834.2, 323.4], face: [834.2, 318], anim: 'idle' }],
    when: (g) => g.flag('rosieChoice') === 'home',
  },
  {
    // Caleb Hollis after 'strake': sweeping the gatehouse and sleeping by its stove.
    id: 'watCity', name: 'Caleb Hollis', title: 'Gatehouse',
    look: watLook,
    schedule: [{ from: 0, to: 24, at: [815.5, 365.6], face: [818, 368], anim: 'idle' }],
    when: (g) => g.flag('lampChoice') === 'strake',
  },

  // ================================================================ Cotter's End
  {
    // Hob Tannet's wife. Runs the Tannets' two carts. Warm, brisk, worries in the form of arrangements.
    id: 'bel', name: 'Bel Tannet', title: 'Cotter\'s End',
    look: { skin: '#d8a880', hair: '#8a7a6a', hairStyle: 2, eyes: '#4a5a4a', tunic: '#5a6a4a', trim: '#c8b890', trousers: '#4a4034', boots: '#3a2a1c', apron: true, lashes: true, build: 1.05, age: 0.6 },
    schedule: [{ from: 0, to: 24, at: [477.5, 249.2], face: [486.5, 252.5], anim: 'idle' }],
    barks: ['Firstday. Company carts.'],
  },
  {
    // Wheelwright. Slow, measuring, kind. Jem's and Bee's father.
    id: 'garth', name: 'Garth Mallow', title: 'Wheelwright, Cotter\'s End',
    look: { skin: '#c88a62', hair: '#4a3a2a', hairStyle: 0, beard: true, eyes: '#4a3a2a', tunic: '#6a4a2a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.1, age: 0.55 },
    schedule: [{ from: 0, to: 24, at: [497.5, 256.4], face: [495, 258.5], anim: 'idle' }],
    barks: ['Straight grain or nothing.'],
  },
  {
    // Davy home after 'cart' or 'walk'.
    id: 'davyHome', name: 'Davy Tannet', title: 'Cotter\'s End',
    look: davyLook,
    schedule: [{ from: 0, to: 24, at: [480.2, 250.2], face: [486.5, 252.5], anim: 'idle' }],
    when: (g) => g.flag('davyChoice') === 'cart' || g.flag('davyChoice') === 'walk',
  },

  // ================================================================ The Waystation
  {
    // Keeps the Waystation. Sorts the Post for the south road. Counts beds, wry about Harrowgate's firstdays.
    id: 'hetty', name: 'Hetty Brannock', title: 'The Waystation',
    look: { skin: '#e8c4a4', hair: '#2a1e18', hairStyle: 1, eyes: '#3a4a5a', tunic: '#3a4a6a', trim: '#e8d0a0', trousers: '#2a2a34', boots: '#1e1a18', apron: true, lashes: true, build: 1.08, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [709.2, 570.6], face: [706, 573], anim: 'idle' }],
    barks: ['Two marks a bed. Barn\'s one.'],
  },
  {
    // Lamp-keeper of the old drove road's shrines, seventies. Plain, measures oil by the pint, knees gone.
    id: 'aud', name: 'Aud Merrow', title: 'Lamp-keeper',
    look: { skin: '#e8c8a8', hair: '#c8c4bc', hairStyle: 2, eyes: '#4a5a6a', tunic: '#4a4038', trim: '#8a7a5a', trousers: '#3a3430', boots: '#2a2220', cape: '#2a2a2a', hat: 'hood', hatColor: '#3a3a32', lashes: true, build: 0.9, height: 0.94, age: 0.85 },
    schedule: [{ from: 0, to: 24, at: [720.6, 569.6], face: [719.5, 566], anim: 'idle' }],
    barks: ['A pint a lamp.'],
  },
  {
    // Hob's son, nineteen. Drives for Harrowgate. Proud, ashamed, quick to anger. Talks company: "on the slate".
    id: 'davy', name: 'Davy Tannet', title: 'Driver, Harrowgate & Daughters',
    look: davyLook,
    schedule: [{ from: 0, to: 24, at: [726.6, 572.2], face: [724, 574], anim: 'idle' }],
    when: (g) => g.flag('davyChoice') !== 'cart' && g.flag('davyChoice') !== 'walk',
  },
  {
    id: 'rosie', name: 'Rosie Penhallow', title: '',
    look: rosieLook,
    schedule: [{ from: 0, to: 24, at: [709.2, 577.6], face: [712.5, 574.5], anim: 'idle' }],
    when: (g) => !!g.stage('crElope') && !g.flag('rosieChoice'),
  },
  {
    // Garth Mallow's son, twenty. Steady, few words. Splices rope better than he drives.
    id: 'jem', name: 'Jem Mallow', title: '',
    look: jemLook,
    schedule: [{ from: 0, to: 24, at: [711.2, 577.8], face: [712.5, 574.5], anim: 'idle' }],
    when: (g) => !!g.stage('crElope') && !g.flag('rosieChoice'),
  },

  // ================================================================ The country
  {
    // Kept the old drove-road toll tower before the Turnpike was paved. Formal, bitter-funny. Pension stopped.
    id: 'wat', name: 'Caleb Hollis', title: 'Toll-keeper, retired',
    look: watLook,
    schedule: [{ from: 0, to: 24, at: [929.5, 140.2], face: [929.5, 134], anim: 'idle' }],
    when: (g) => g.flag('lampChoice') !== 'strake',
  },
  {
    // Farms east of Ansbury. Unsentimental, practical, short with boars and with people about boars.
    id: 'pru', name: 'Pru Askew', title: 'Askew farm',
    look: { skin: '#d8a07a', hair: '#a87a3a', hairStyle: 4, eyes: '#4a5a3a', tunic: '#5a6a3a', trim: '#a8a070', trousers: '#4a4034', boots: '#3a2a1c', apron: true, hat: 'cap', hatColor: '#6a5a3a', lashes: true, build: 1.05, age: 0.5 },
    schedule: [{ from: 0, to: 24, at: [983.2, 238.6], face: [980.5, 236], anim: 'idle' }],
    barks: ['A third of the barley.'],
  },

  // ================================================================ Gullmouth
  {
    id: 'rosieGull', name: 'Rosie Penhallow', title: 'Bett Rook\'s books',
    look: rosieLook,
    schedule: [{ from: 0, to: 24, at: [1761.4, 608.6], face: [1764.4, 605.5], anim: 'idle' }],
    when: (g) => g.flag('rosieChoice') === 'letter' || g.flag('rosieChoice') === 'gone',
  },
  {
    id: 'jemGull', name: 'Jem Mallow', title: 'Rope hand',
    look: jemLook,
    schedule: [{ from: 0, to: 24, at: [1759.2, 608.6], face: [1764.4, 605.5], anim: 'idle' }],
    when: (g) => !!g.flag('rosieChoice'),
  },
];
