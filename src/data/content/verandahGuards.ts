import type { DialogueTree } from '../../game/api';
import type { Appearance } from '../../entities/humanoid';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { GUARD_LOOK } from './verandahCourt';

// The King's Guard at home (owner 2026-11-05: "the big tower on the hill in Verandah is a guard watch tower and
// below it above the market is a guard barracks area ... and there's a guard archer combat training area near
// there too for the guards to train"). The watch tower is the owner's lookout on the rock above the high
// street, with a sentry on its platform by day and another by night. The barracks is the owner's stone house on
// the slope below it, bunks upstairs, the armoury chests and forges down, kept by Sergeant Rendle. The butts
// are on the green by the castle path, where the guard practise with the bow (world/sites.ts 'ver-butts').
// The outpost (owner 2026-11-06: "the big castle south of the Airport in Verandah is a Verandah outpost for
// guards") is the owner's keep on the peak west of the Airport: Captain Penhallow's garrison quartered in its hall,
// a smith at the anvil below, a lookout with a glass in the room at the top (world/sites.ts 'ver-outpost').
// The king's household (owner 2026-11-05: "the big house next to the giant king castle house is also the king's,
// and more of where his workers sleep") is the owner's great timber house west of the castle, its forges, kitchen
// and bunk rooms kept by Jenifer Treloar, the king's housekeeper.

const guard = (skin: string, hair: string, frame?: 'f', extra: Partial<Appearance> = {}): Appearance => ({ ...GUARD_LOOK, skin, hair, ...(frame ? { frame, lashes: true } : {}), ...extra });
const BOW = 'w_hollin_bow';

/** The butts on the green by the castle path: targets at the east end, the line at the west. */
export const BUTTS_PROPS: { t: 'butt' | 'barrel' | 'crate' | 'bench'; x: number; y: number; z: number; ry?: number }[] = [
  { t: 'butt', x: -3060.5, y: 23, z: 1952.5, ry: -Math.PI / 2 }, { t: 'butt', x: -3060.5, y: 23, z: 1955.5, ry: -Math.PI / 2 },
  { t: 'butt', x: -3066.5, y: 23, z: 1951.5, ry: -Math.PI / 2 },
  { t: 'barrel', x: -3081.5, y: 22, z: 1951.5 }, { t: 'crate', x: -3081.5, y: 22, z: 1956.5 }, { t: 'bench', x: -3083.5, y: 22, z: 1954, ry: Math.PI / 2 },
];

/** The outpost keep's hall (floor 67), its lookout room (95) and its forge (58). */
export const OUTPOST_PROPS: { item: string; x: number; y: number; z: number; ry: number }[] = [
  ...[2324.5, 2326.5, 2328.5, 2336.5, 2338.5, 2340.5].map((z) => ({ item: 'bed', x: -3127.5, y: 67, z, ry: Math.PI / 2 })),
  { item: 'table', x: -3141.5, y: 67, z: 2339.5, ry: 0 }, { item: 'table', x: -3140.5, y: 67, z: 2339.5, ry: 0 },
  { item: 'stool', x: -3141.5, y: 67, z: 2340.5, ry: 0 }, { item: 'stool', x: -3140.5, y: 67, z: 2340.5, ry: 0 }, { item: 'stool', x: -3142.5, y: 67, z: 2339.5, ry: 0 },
  { item: 'candles', x: -3141.5, y: 67, z: 2339.5, ry: 0 },
  { item: 'desk', x: -3140.5, y: 67, z: 2325.5, ry: 0 }, { item: 'letters', x: -3140.5, y: 67, z: 2325.5, ry: 0 },
  { item: 'chest', x: -3145.5, y: 67, z: 2324.5, ry: -Math.PI / 2 }, { item: 'chest', x: -3145.5, y: 67, z: 2325.5, ry: -Math.PI / 2 },
  { item: 'shelves', x: -3145.5, y: 67, z: 2340.5, ry: -Math.PI / 2 }, { item: 'hearth', x: -3145.5, y: 67, z: 2332.5, ry: -Math.PI / 2 },
  { item: 'spyglass', x: -3130.5, y: 95, z: 2334.5, ry: Math.PI / 2 },
  { item: 'forge', x: -3136.5, y: 58, z: 2332.5, ry: 0 },
];

const npcs: NpcDef[] = [
  // the king's household, the great house by the castle
  { id: 'ver_treloar', name: 'Jenifer Treloar', title: 'The king’s housekeeper', look: { frame: 'f', skin: '#e2b894', hair: '#9a948c', hairStyle: 5, eyes: '#4a5a6a', tunic: '#22365a', trim: '#d8b04a', shirt: '#e8e0d0', trousers: '#2a2620', boots: '#1e1a16', apron: true, lashes: true, age: 0.65 },
    schedule: [{ from: 6, to: 22, at: [-3118.5, 1963.5], face: [-3118.5, 1959.5], anim: 'idle', y: 24 }],
    barks: ['Wipe your feet. This is the king’s house, even if the king never sets foot in it.', 'Forty mouths under this roof, and every one of them hungry at six.'] },
  { id: 'ver_cook_hicks', name: 'Ebb Hicks', title: 'The household’s cook', look: { skin: '#c88a62', hair: '#2a1e14', hairStyle: 0, facial: 1, eyes: '#3a2a1e', tunic: '#e8e0d0', trim: '#8a6a3a', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#1e1a16', apron: true, hat: 'coif', hatColor: '#e8e0d0', build: 1.25 },
    schedule: [{ from: 5, to: 20, at: [-3130.5, 1963.5], face: [-3132.5, 1963.5], anim: 'cook', y: 24 }],
    barks: ['Stew. It’s always stew. Ask me why. Go on.', 'Sandor’s pasties? Sandor learned from my mother.'] },
  { id: 'ver_wright_pascoe', name: 'Abel Pascoe', title: 'The household’s wright', look: { skin: '#d8a07a', hair: '#6a4426', hairStyle: 3, facial: 2, eyes: '#4a5a3a', tunic: '#5a4a3a', trim: '#2a2018', trousers: '#3a3430', boots: '#2a1e14', apron: true, build: 1.2 },
    schedule: [{ from: 7, to: 19, at: [-3109.5, 1962.5], face: [-3108.5, 1960.5], anim: 'hammer', y: 24, held: 'hammer' }],
    barks: ['Hinges for the castle, nails for the stables, a crown for the king when he sits on the last one.', 'Ruan on the docks is my cousin. Every Pascoe on the island is my cousin.'] },
  { id: 'ver_maid_kitto', name: 'Rosen Kitto', title: 'The household', look: { frame: 'f', skin: '#d8b090', hair: '#c88a3a', hairStyle: 1, eyes: '#4a6a7a', tunic: '#4a5a6a', trim: '#e8dcc0', shirt: '#e8e0d0', trousers: '#3a3430', boots: '#2a1e14', apron: true, lashes: true, age: 0.3 },
    schedule: [{ from: 8, to: 18, at: [-3128.5, 1964.5], face: [-3131.5, 1963.5], anim: 'crouch', y: 37 }],
    barks: ['Twelve beds a morning. Thirteen when the steward stays over.'] },
  // the outpost on the peak
  { id: 'ver_capt_penhallow', name: 'Captain Penhallow', title: 'The outpost', look: guard('#c88a62', '#2a1e14', undefined, { facial: 2, age: 0.5, build: 1.15, cape: '#7a2a24' }),
    schedule: [{ from: 6, to: 23, at: [-3140.5, 2327.5], face: [-3140.5, 2331.5], anim: 'idle', y: 67 }],
    barks: ['From up here I can see a raid before it can see me.', 'Report, or keep walking.'] },
  { id: 'ver_guard_nancarrow', name: 'Verandah Guard', title: 'The outpost', look: guard('#e2b894', '#6a3a1e'),
    schedule: [{ from: 6, to: 22, at: [-3140.5, 2337.5], face: [-3140.5, 2339.5], anim: 'idle', y: 67 }],
    barks: ['Long climb for a bowl of stew.', 'The wind never stops up here. Never.'] },
  { id: 'ver_guard_tamsin', name: 'Verandah Guard', title: 'The outpost', look: guard('#d8a888', '#c8a060', 'f'),
    schedule: [{ from: 6, to: 22, at: [-3129.5, 2330.5], face: [-3127.5, 2330.5], anim: 'idle', y: 67 }],
    barks: ['Elowen at the lumberyard? My sister. Don’t believe a word she says about me.'] },
  { id: 'ver_lookout_crago', name: 'Verandah Guard', title: 'Lookout', look: guard('#c88a62', '#1e1a16'),
    schedule: [{ from: 0, to: 24, at: [-3130.5, 2332.5], face: [-3124.5, 2332.5], anim: 'idle', y: 95 }],
    barks: ['Smoke on the north shore. Charcoal burners. Probably.', 'You can see the whole island from here. And it can see you.'] },
  { id: 'ver_smith_bolitho', name: 'Gwen Bolitho', title: 'The outpost’s smith', look: { frame: 'f', skin: '#d8a07a', hair: '#3a2a1e', hairStyle: 5, eyes: '#3a2a1e', tunic: '#4a3a2a', trim: '#2a2018', shirt: '#c8b8a0', trousers: '#2a2620', boots: '#1e1a16', apron: true, lashes: true, build: 1.15 },
    schedule: [{ from: 7, to: 19, at: [-3133.5, 2336.5], face: [-3133.5, 2338.5], anim: 'hammer', y: 58, held: 'hammer' }],
    barks: ['Arthur at the fish stalls is my brother. He gets the bad knives.', 'Horseshoes, spearheads, hinges. Same iron, different day.'] },

  // the barracks
  { id: 'ver_sgt_rendle', name: 'Sergeant Rendle', title: 'The King’s Guard', look: guard('#c88a62', '#5a5a52', undefined, { facial: 3, age: 0.6, build: 1.2 }),
    schedule: [{ from: 6, to: 22, at: [-2911.5, 2085.5], face: [-2911.5, 2088.5], anim: 'idle', y: 32 }],
    barks: ['Boots clean, buckles bright, mouth shut.', 'If you’re not on the roll, you’re not in my barracks.'] },
  { id: 'ver_guard_clemo', name: 'Verandah Guard', title: 'The King’s Guard', look: guard('#e2b894', '#c88a3a'),
    schedule: [{ from: 8, to: 20, at: [-2912.5, 2087.5], face: [-2915.5, 2087.5], anim: 'idle', y: 36 }],
    barks: ['Night watch. Don’t ask me anything before noon.', 'The sergeant counts the buttons on your coat. Every one.'] },
  // the watch tower: a sentry on the platform day and night, looking out to sea
  { id: 'ver_sentry_keast', name: 'Verandah Guard', title: 'The watch tower', look: guard('#d8a07a', '#2a1e14'),
    schedule: [{ from: 6, to: 18, at: [-2926.5, 2073.5], face: [-2926.5, 2066.5], anim: 'idle', y: 67 }],
    barks: ['Sail to the north. Counties colours.', 'You can see Mizuholm from up here on a clear day.'] },
  { id: 'ver_sentry_hosking', name: 'Verandah Guard', title: 'The watch tower', look: guard('#e8c4a4', '#4a2a1e', 'f'),
    schedule: [{ from: 18, to: 24, at: [-2924.5, 2073.5], face: [-2919.5, 2073.5], anim: 'idle', y: 67 }, { from: 0, to: 6, at: [-2924.5, 2073.5], face: [-2919.5, 2073.5], anim: 'idle', y: 67 }],
    barks: ['Quiet night. I like a quiet night.', 'The lights in the harbour go out one by one. Then it’s just me.'] },
  // the butts
  { id: 'ver_archer_trewin', name: 'Bersaba Trewin', title: 'Master of the Butts', look: guard('#d8b090', '#2a1e14', 'f', { cape: '#3a5a2a', age: 0.5 }),
    schedule: [{ from: 7, to: 19, at: [-3081.5, 1953.5], face: [-3060.5, 1953.5], anim: 'idle', y: 22 }],
    barks: ['Draw to the cheek, not the chin. The cheek.', 'Loose when you’re ready, not when you’re tired.'] },
  { id: 'ver_archer_penna', name: 'Verandah Guard', title: 'The King’s Guard', look: guard('#c88a62', '#1e1a16'),
    schedule: [{ from: 7, to: 18, at: [-3078.5, 1952.5], face: [-3060.5, 1952.5], anim: 'shoot', y: 22, held: BOW }],
    barks: ['Gold! Did you see that? Nobody saw that.'] },
  { id: 'ver_archer_jose', name: 'Verandah Guard', title: 'The King’s Guard', look: guard('#e2b894', '#8a6a3a', 'f'),
    schedule: [{ from: 9, to: 19, at: [-3078.5, 1955.5], face: [-3060.5, 1955.5], anim: 'shoot', y: 22, held: BOW }],
    barks: ['Wind’s off the sea. Aim a hand left.'] },
];

const rendle: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Sergeant Rendle, the King’s Guard. This is the barracks: twelve bunks, eight guards, and one of me to make sure nobody sleeps in the wrong one. State your business.',
      options: [
        { text: 'What does the guard do here?', next: 'duty' },
        { text: 'Who’s up in the tower?', next: 'tower' },
        { text: 'Nothing. Good day, Sergeant.' },
      ],
    },
    duty: { text: 'Gate by the great bridge, the docks, two beats through the town on the hour, two riders round the outskirts, and a sentry on the rock day and night. The rest of the time they’re on the butts with Trewin or polishing something I’ve told them to polish.', next: 'hello' },
    tower: { text: 'Keast by day, Hosking by night. You can see every ship from the Counties to Mizuholm from that platform, and every fire in the town. It’s a long ladder. Nobody goes up who doesn’t have to.', next: 'hello' },
  },
};

const trewin: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Mind the line. Nobody crosses it while there’s a bow drawn, and there’s always a bow drawn. Bersaba Trewin. I teach the King’s Guard which end of an arrow goes forward.',
      options: [
        { text: 'Are they any good?', next: 'good' },
        { text: 'Why archery? It’s an island.', next: 'why' },
        { text: 'I’ll stay behind the line.' },
      ],
    },
    good: { text: 'Penna is. Jose will be, when she stops listening to Penna. The rest hit the butt more often than the ground, which is where we started.', next: 'hello' },
    why: { text: 'Because the next raid will come from the sea, like the last two, and a guard on the wall with a bow is worth five at the gate with a spear. The king remembers the second raid. So do I.', next: 'hello' },
  },
};

const penhallow: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Captain Penhallow, and this is the outpost. The highest ground on the island, the oldest stone on it, and the only place a raid from the west can’t get past without my say. Did the sergeant send you?',
      options: [
        { text: 'What do you watch for?', next: 'watch' },
        { text: 'Who built this place?', next: 'built' },
        { text: 'Just passing through.' },
      ],
    },
    watch: { text: 'Sails, mostly. Smoke, sometimes. The second raid came in on the west shore under fog, and burned half the farms before the town knew. The king built this so that never happens again, and I make sure it doesn’t.', next: 'hello' },
    built: { text: 'The old king, the first one, the harbourmaster who called himself king to win an argument. He put a beacon up here. Every king since has added a floor. This one added the lookout and the forge, and asked me why it cost so much.', next: 'hello' },
  },
};

const treloar: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'Jenifer Treloar, housekeeper to the king. This is his house, the big one by the castle, where the people who keep the castle running eat and sleep. The castle’s for show. This is where the work is done.',
      options: [
        { text: 'Who lives here?', next: 'who' },
        { text: 'Does the king ever come over?', next: 'king' },
        { text: 'I’ll leave you to it.' },
      ],
    },
    who: { text: 'Grooms, cooks, the wright and his boys, the maids, the steward when she can’t face the walk home. Forty, give or take a cousin. The forges are downstairs, the kitchen is through there, and the beds are up the ladders. Mind the third rung.', next: 'hello' },
    king: { text: 'Once a year, at the harvest, to say thank you and eat Ebb’s stew. He says it’s the best meal of his year. Ebb says it’s the same stew as every other day. They’re both right.', next: 'hello' },
  },
};

export const VERANDAH_GUARDS: RegionContent = { id: 'verandahGuards', npcs, dialogue: { ver_sgt_rendle: rendle, ver_archer_trewin: trewin, ver_capt_penhallow: penhallow, ver_treloar: treloar } };
