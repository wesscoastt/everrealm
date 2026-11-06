import type { DialogueTree } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';

// Every one of Verandah's named houses with someone running it (owner 2026-11-06: "make sure all places have
// people running them, like the Mages Guild, the Fighters Guild, the library, the winery"). The library, the
// winery, the taverns and the shops were done; these are the rest of the owner's signs: the Chapel of Verandah,
// the Vanguard Hospital, the Fighters Guild, the Mages Guild, the City Hall and the Bank of Verandah.

type Look = NpcDef['look'];
const at = (x: number, y: number, z: number, fx: number, fz: number, anim: 'idle' | 'cast' | 'attack' | 'crouch' = 'idle', held?: string) =>
  ({ at: [x, z] as [number, number], face: [fx, fz] as [number, number], anim, y, ...(held ? { held } : {}) });
const person = (id: string, name: string, title: string, look: Look, spot: ReturnType<typeof at>, barks: string[], from = 7, to = 21): NpcDef =>
  ({ id, name, title, look, schedule: [{ from, to, ...spot }], barks });

const npcs: NpcDef[] = [
  // the Chapel: the pews in two rows, the table at the front
  person('ver_keverne', 'Brother Pasco Keverne', 'Chapel of Verandah', { skin: '#e2b894', hair: '#cfcac0', hairStyle: 0, eyes: '#4a5a6a', tunic: '#3a3430', trim: '#d8d0b8', trousers: '#3a3430', boots: '#2a1e14', hat: 'hood', hatColor: '#3a3430', age: 0.75 },
    at(-2994.5, 21, 2013.5, -2994.5, 2019.5), ['Sit where you like. The pews are all the same distance from heaven.', 'Bells at dawn and dusk. Not my idea.'], 6, 22),
  // the Vanguard Hospital: beds below, a ward and the doctor's table above
  person('ver_rodda', 'Doctor Eleanor Rodda', 'Vanguard Hospital', { frame: 'f', skin: '#d8a888', hair: '#3a2a1e', hairStyle: 5, eyes: '#3a4a5a', tunic: '#e8e0d0', trim: '#7a2a24', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', apron: true, lashes: true, age: 0.5 },
    at(-2948.5, 21, 2012.5, -2950.5, 2012.5), ['Sit. Show me. Hm. That’ll need stitching.', 'Quarrymen, fishermen and Arena fighters. Mostly Arena fighters.'], 0, 24),
  person('ver_jewell', 'Bessie Jewell', 'Nurse, the Vanguard Hospital', { frame: 'f', skin: '#e8c4a4', hair: '#c8a060', hairStyle: 1, eyes: '#4a6a7a', tunic: '#4a6a8a', trim: '#e8e0d0', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', apron: true, lashes: true, age: 0.3 },
    at(-2954.5, 25, 2010.5, -2954.5, 2012.5), ['Quiet on the ward, please.', 'The doctor says rest. Rest means lying down.']),
  // the Fighters Guild
  person('ver_treneer', 'Ancrum Treneer', 'Master of the Fighters Guild', { skin: '#c88a62', hair: '#5a5a52', hairStyle: 0, facial: 3, eyes: '#3a2a1e', tunic: '#5a2a24', trim: '#8a8a7a', trousers: '#2a2620', boots: '#1e1a16', build: 1.3, age: 0.55, scar: true },
    at(-2957.5, 22, 2000.5, -2962.5, 2000.5), ['Guild dues are paid in sweat. And marks. Mostly marks.', 'You’ve a sword. Can you use it? We’ll see.']),
  person('ver_tresidder', 'Hob Tresidder', 'Trainer, the Fighters Guild', { skin: '#d8a07a', hair: '#2a1e14', hairStyle: 3, eyes: '#3a4a2a', tunic: '#4a4a42', trim: '#5a2a24', trousers: '#2a2620', boots: '#1e1a16', build: 1.2 },
    at(-2964.5, 22, 2000.5, -2961.5, 2000.5, 'attack', 'sword'), ['Feet first. The sword follows the feet.', 'Again. Slower. Now faster.']),
  // the Mages Guild: the hall below, the reading rooms and their shelves above
  person('ver_pendarves', 'Selina Pendarves', 'Warden of the Mages Guild', { frame: 'f', skin: '#e2b894', hair: '#9a948c', hairStyle: 5, eyes: '#4a6a7a', tunic: '#2a3a6a', trim: '#d8b04a', trousers: '#2a2630', boots: '#1e1a16', cape: '#2a3a6a', lashes: true, age: 0.65 },
    at(-2989.5, 22, 1995.5, -2989.5, 1998.5), ['The Guild teaches what the old kingdom knew. Slowly. Carefully. With the windows open.', 'Touch nothing that hums.']),
  person('ver_bunt', 'Lowdy Bunt', 'Scholar, the Mages Guild', { frame: 'f', skin: '#d8b090', hair: '#6a3a1e', hairStyle: 1, eyes: '#4a5a3a', tunic: '#4a3a6a', trim: '#e8dcc0', trousers: '#2a2630', boots: '#1e1a16', lashes: true, age: 0.4 },
    at(-2994.5, 25, 1993.5, -2996.5, 1993.5), ['Shh. I’ve lost my page.', 'Every book in this room disagrees with the one next to it.']),
  person('ver_trembath', 'Peder Trembath', 'Apprentice, the Mages Guild', { skin: '#e8c4a4', hair: '#c88a3a', hairStyle: 2, eyes: '#3a5a6a', tunic: '#3a4a7a', trim: '#e8dcc0', trousers: '#2a2630', boots: '#1e1a16', age: 0.15, freckles: true },
    at(-2984.5, 25, 1996.5, -2984.5, 1999.5, 'cast'), ['It’s meant to be blue. It’s green. Don’t tell the Warden.', 'Third year. Second fire.']),
  // the City Hall and the Bank
  person('ver_couch', 'Reuben Couch', 'Clerk of the City Hall', { skin: '#e2b894', hair: '#4a3a2a', hairStyle: 1, eyes: '#4a5a6a', tunic: '#22365a', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2630', boots: '#1e1a16', hat: 'beret', hatColor: '#22365a', age: 0.5 },
    at(-2977.5, 22, 2096.5, -2972.5, 2097.5), ['Forms in triplicate. The king likes three of everything.', 'Next.'], 8, 18),
  person('ver_trevenna', 'Silvanus Trevenna', 'The Bank of Verandah', { skin: '#d8a888', hair: '#1e1a16', hairStyle: 0, facial: 1, eyes: '#3a2a1e', tunic: '#1e1e24', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#1e1e24', boots: '#141418', age: 0.55 },
    at(-2998.5, 21, 2116.5, -2994.5, 2116.5), ['Deposits on the left, complaints to the king.', 'Every mark in the vault is counted twice a day. By me.'], 8, 18),
];

const tree = (hello: string, opts: [string, string][]): DialogueTree => ({
  start: () => 'hello',
  nodes: {
    hello: { text: hello, options: [...opts.map(([q], i) => ({ text: q, next: 'a' + i })), { text: 'Good day.' }] },
    ...Object.fromEntries(opts.map(([, a], i) => ['a' + i, { text: a, next: 'hello' }])),
  },
});

const dialogue: Record<string, DialogueTree> = {
  ver_keverne: tree('Brother Pasco Keverne. This is Verandah’s chapel: the sailors’ chapel, really, though the farmers come when it doesn’t rain on a Sunday. Sit, if you need to.', [
    ['Who comes here?', 'Wives of men at sea, mostly, and men who came back from it and didn’t expect to. I read the names of the ones who didn’t on the first of every month. It’s a long list. It used to be longer.'],
    ['Why the two rows of pews?', 'One for the town and one for the farms. They don’t mix on a Sunday and they don’t mix on a Monday. I’ve stopped trying.'],
  ]),
  ver_rodda: tree('Doctor Eleanor Rodda, the Vanguard Hospital. If you’re bleeding, sit there. If you’re not, you’re in the way of someone who is.', [
    ['Why the Vanguard?', 'The king’s grandfather built it after the second raid, for the men who stood at the front. We still mostly patch fighters. The Arena keeps us busy.'],
    ['Do you need anything?', 'Clean linen, honest herbs and fewer fools with swords. I’ll settle for the linen.'],
  ]),
  ver_treneer: tree('Ancrum Treneer. I keep the Fighters Guild. We train the King’s Guard, the caravan guards, and anybody who’d rather not die on the road. Here to learn, or here to show off?', [
    ['What does the Guild do?', 'Teaches. Hob there takes the new ones on the floor; I take them on the road once they stop falling over. We hire out to the farms and the boats when there’s trouble, and there’s always trouble.'],
    ['How did you get the scar?', 'The second raid. I was nine. I held the gate with a fishing gaff and a lot of shouting. The scar was the gaff.'],
  ]),
  ver_pendarves: tree('Selina Pendarves, Warden of the Mages Guild. We keep what the old kingdom wrote down about the marks and the stones, and we teach it slowly, because the last time it was taught quickly the old kingdom fell.', [
    ['What do you study?', 'The glyphs on the standing stones. The marks they made on the blanks. Why some ground lifts and some sinks. Mostly we read, and argue about what we read.'],
    ['Can I join?', 'You can read. Upstairs, with Lowdy, if she lets you. Joining takes longer. Years, usually. Peder is in his third and has set fire to the same table twice.'],
  ]),
  ver_couch: tree('Reuben Couch, clerk. The City Hall keeps the town’s rolls: who owns what, who rents what, who owes the king what. You’ll be wanting a form.', [
    ['Which form?', 'All of them. Houses for sale are listed at the door; rents are paid here or by post. If you’re buying, you sign three times. The king likes three of everything.'],
  ]),
  ver_trevenna: tree('Silvanus Trevenna, the Bank of Verandah. Your marks are safe here: the vault is under our feet and the only key is round my neck. What can the bank do for you?', [
    ['May I see the vault?', 'Down the stair behind the counter. Your box is where you left it; mind the step at the bottom, everybody misses it.'],
    ['How safe is the vault?', 'Two raids, one fire and a flood, and not a mark lost. The walls are as thick as the castle’s. Thicker, I’m told. I’ve never been in the castle.'],
  ]),
};

/** The strongroom under the bank (dug by scripts/mc/bankvault.cjs, floor 15): its door, strongboxes, chests and the ledgers. */
export const BANK_VAULT_PROPS: { item: string; x: number; z: number; ry: number }[] = [
  { item: 'vault', x: -2998.6, z: 2113.5, ry: Math.PI / 2 },
  ...[-2997.5, -2995.5, -2993.5, -2991.5].map((x) => ({ item: 'strongbox', x, z: 2110.6, ry: 0 })),
  ...[2112.5, 2114.5].map((z) => ({ item: 'chest', x: -2990.6, z, ry: -Math.PI / 2 })),
  { item: 'shelves', x: -2994.5, z: 2115.4, ry: Math.PI }, { item: 'desk', x: -2995.5, z: 2113.5, ry: 0 }, { item: 'letters', x: -2995.5, z: 2113.5, ry: 0 },
  { item: 'candles', x: -2997.5, z: 2111.5, ry: 0 }, { item: 'candles', x: -2991.5, z: 2115.5, ry: 0 },
];

export const VERANDAH_HALLS: RegionContent = {
  id: 'verandahHalls', npcs, dialogue,
  things: [
    { id: 'ver-bankvault', x: -2995.5, y: 15, z: 2112.5, label: 'Open your vault (the Bank of Verandah)', radius: 3.2, use: (g) => g.openVaultAt('The Bank of Verandah', -2995.5, 2112.5) },
  ],
};
