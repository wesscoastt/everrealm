import type { ItemDef } from './items';

// Trophy mounts, as ESO hands you a trophy for the wall from what you brought down: every rare creature
// (data/wilds.ts RARES, and Old Notch) leaves its head, its claw, its jaws or its heart mounted on an oak
// shield, to hang on a wall of your own house (game/Home.ts: a wall piece snaps flat to the nearest wall).
// The model is "head:<kind>:<coat>:<second colour>" (world/props.ts mountedHead).

export type MountKind = 'wolf' | 'fox' | 'cat' | 'dog' | 'boar' | 'claw' | 'heart' | 'jaws';

const mount = (id: string, name: string, kind: MountKind, a: string, b: string, desc: string, rarity: ItemDef['rarity'] = 'rare'): ItemDef => ({
  id, name, kind: 'collectible', rarity, stack: true, value: 0, icon: { shape: kind === 'claw' || kind === 'jaws' ? 'fang' : kind === 'heart' ? 'heart' : 'pelt', a, b },
  furn: { model: `head:${kind}:${a}:${b}` }, desc, stats: 'A wall mount: set it on a wall of a house of your own (Arrange your house).',
});

export const TROPHY_MOUNTS: ItemDef[] = [
  mount('mount_notch', 'Old Notch, mounted', 'wolf', '#7a7268', '#4a443c', 'The old wolf of the Hollindale woods on an oak shield, the torn ear and all. Somebody at the Lantern will want to buy it. Don\'t sell it.'),
  mount('mount_brindle', 'Old Brindle, mounted', 'cat', '#8a6a4a', '#3a2a20', 'Striped like a tabby, as big as a calf, and glaring still. Every farmer below the Lantern will say it was theirs.'),
  mount('mount_barley', 'The Barley Boar, mounted', 'boar', '#8a6a3a', '#e8dcc0', 'Five sacks of Hob Tannet\'s barley went into that head. The tusks are as long as your hand.'),
  mount('mount_mosscap', 'Mosscap\'s heart, cased', 'heart', '#7aba4a', '#2a4a1a', 'The green glass heart of the thing in Hagworm, under a glass dome on an oak shield. It is still slightly warm.'),
  mount('mount_barnacle', 'Old Barnacle\'s claw, mounted', 'claw', '#d8d0b8', '#6a6a5a', 'The great claw, crusted white, on an oak shield. Gullmouth\'s harbourmaster will want to know how old it is.'),
  mount('mount_pitdog', 'The Pit Dog, mounted', 'dog', '#8a3a1a', '#c8a050', 'The Works\' old guard dog, with his company collar still on. H & D 41.'),
  mount('mount_whiteface', 'Whiteface, mounted', 'wolf', '#f4f4f4', '#c8d0d8', 'Not a grey hair in it. Kelderby\'s inn would pay for this, and you can tell them no.', 'epic'),
  mount('mount_eggthief', 'The Egg Thief, mounted', 'fox', '#e8a060', '#f4f0e4', 'A fox with a look of no regret whatever. There is eggshell in its whiskers still.'),
  mount('mount_mudgut', 'Old Mudgut, mounted', 'boar', '#2a2018', '#d8d0b8', 'Black with peat to the bristles. The fen children\'s song about him has a verse about this.'),
  mount('mount_torhound', 'The Tor Hound, mounted', 'dog', '#4a4a4a', '#e8e4dc', 'The hound off Scarrow Tor, grey as the stones, its fangs as long as a finger.', 'epic'),
  mount('mount_bigmary', 'Big Mary\'s jaws, mounted', 'jaws', '#2e3640', '#f4f0e4', 'Every Gullmouth crew has a story about her. The jaws on your wall end most of them.', 'epic'),
];

/** Which creature leaves which mount (its loot gets it: data/gameplay.ts). */
export const MOUNT_OF: Record<string, string> = {
  notch: 'mount_notch', r_brindle: 'mount_brindle', r_barley: 'mount_barley', r_mosscap: 'mount_mosscap', r_barnacle: 'mount_barnacle',
  r_pitdog: 'mount_pitdog', r_whiteface: 'mount_whiteface', r_eggthief: 'mount_eggthief', r_mudgut: 'mount_mudgut', r_torhound: 'mount_torhound', r_bigmary: 'mount_bigmary',
};

/** Is a furniture model a wall piece? */
export const isWallPiece = (model: string | undefined) => !!model && model.startsWith('head:');
/** How high a wall piece hangs: its middle above the floor. */
export const WALL_HEIGHT = 2.1;
