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

const guard = (skin: string, hair: string, frame?: 'f', extra: Partial<Appearance> = {}): Appearance => ({ ...GUARD_LOOK, skin, hair, ...(frame ? { frame, lashes: true } : {}), ...extra });
const BOW = 'w_hollin_bow';

/** The butts on the green by the castle path: targets at the east end, the line at the west. */
export const BUTTS_PROPS: { t: 'butt' | 'barrel' | 'crate' | 'bench'; x: number; y: number; z: number; ry?: number }[] = [
  { t: 'butt', x: -3060.5, y: 23, z: 1952.5, ry: -Math.PI / 2 }, { t: 'butt', x: -3060.5, y: 23, z: 1955.5, ry: -Math.PI / 2 },
  { t: 'butt', x: -3066.5, y: 23, z: 1951.5, ry: -Math.PI / 2 },
  { t: 'barrel', x: -3081.5, y: 22, z: 1951.5 }, { t: 'crate', x: -3081.5, y: 22, z: 1956.5 }, { t: 'bench', x: -3083.5, y: 22, z: 1954, ry: Math.PI / 2 },
];

const npcs: NpcDef[] = [
  // the barracks
  { id: 'ver_sgt_rendle', name: 'Sergeant Rendle', title: 'The King’s Guard', look: guard('#c88a62', '#5a5a52', undefined, { facial: 3, age: 0.6, build: 1.2 }),
    schedule: [{ from: 6, to: 22, at: [-2911.5, 2085.5], face: [-2911.5, 2088.5], anim: 'idle', y: 32 }],
    barks: ['Boots clean, buckles bright, mouth shut.', 'If you’re not on the roll, you’re not in my barracks.'] },
  { id: 'ver_guard_clemo', name: 'Guard Clemo', title: 'The King’s Guard', look: guard('#e2b894', '#c88a3a'),
    schedule: [{ from: 8, to: 20, at: [-2912.5, 2087.5], face: [-2915.5, 2087.5], anim: 'idle', y: 36 }],
    barks: ['Night watch. Don’t ask me anything before noon.', 'The sergeant counts the buttons on your coat. Every one.'] },
  // the watch tower: a sentry on the platform day and night, looking out to sea
  { id: 'ver_sentry_keast', name: 'Guard Keast', title: 'The watch tower', look: guard('#d8a07a', '#2a1e14'),
    schedule: [{ from: 6, to: 18, at: [-2926.5, 2073.5], face: [-2926.5, 2066.5], anim: 'idle', y: 67 }],
    barks: ['Sail to the north. Counties colours.', 'You can see Mizuholm from up here on a clear day.'] },
  { id: 'ver_sentry_hosking', name: 'Guard Hosking', title: 'The watch tower', look: guard('#e8c4a4', '#4a2a1e', 'f'),
    schedule: [{ from: 18, to: 24, at: [-2925.5, 2072.5], face: [-2919.5, 2072.5], anim: 'idle', y: 67 }, { from: 0, to: 6, at: [-2925.5, 2072.5], face: [-2919.5, 2072.5], anim: 'idle', y: 67 }],
    barks: ['Quiet night. I like a quiet night.', 'The lights in the harbour go out one by one. Then it’s just me.'] },
  // the butts
  { id: 'ver_archer_trewin', name: 'Bersaba Trewin', title: 'Master of the Butts', look: guard('#d8b090', '#2a1e14', 'f', { cape: '#3a5a2a', age: 0.5 }),
    schedule: [{ from: 7, to: 19, at: [-3081.5, 1953.5], face: [-3060.5, 1953.5], anim: 'idle', y: 22 }],
    barks: ['Draw to the cheek, not the chin. The cheek.', 'Loose when you’re ready, not when you’re tired.'] },
  { id: 'ver_archer_penna', name: 'Guard Penna', title: 'The King’s Guard', look: guard('#c88a62', '#1e1a16'),
    schedule: [{ from: 7, to: 18, at: [-3078.5, 1952.5], face: [-3060.5, 1952.5], anim: 'shoot', y: 22, held: BOW }],
    barks: ['Gold! Did you see that? Nobody saw that.'] },
  { id: 'ver_archer_jose', name: 'Guard Jose', title: 'The King’s Guard', look: guard('#e2b894', '#8a6a3a', 'f'),
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

export const VERANDAH_GUARDS: RegionContent = { id: 'verandahGuards', npcs, dialogue: { ver_sgt_rendle: rendle, ver_archer_trewin: trewin } };
