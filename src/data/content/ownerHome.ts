import type { RegionContent } from './types';

// The owner's own house in Verandah (owner 2026-11-05): "all the chests and farm area under my house keep all
// that and make that property mine, the stables near it for my mounts, the mine near it I dug for me to explore,
// and the big backyard for me to fish in the pond". The house on the rise north of the farm (Minecraft -226, 64,
// 384), its storage room under it, the farm and stables beside it, the mine shaft and the pond out the back.
// It belongs to their account: to them it's home, and the chests open their vault; to anyone else it's a
// private house, to look at and leave be.

/** The owner's account (server/server.mjs DEV_ACCOUNTS). */
export const OWNER_ACCOUNT = 'wesscoastt';
/** The property, house, grounds and pond. */
export const OWNER_HOME = { x0: -2500, z0: 2360, x1: -2390, z1: 2440 };
export const inOwnerHome = (x: number, z: number) => x >= OWNER_HOME.x0 && x <= OWNER_HOME.x1 && z >= OWNER_HOME.z0 && z <= OWNER_HOME.z1;
/** Is this account the owner's (the game passes the signed-in account's name)? */
export const isHomeOwner = (account: string | null | undefined) => (account ?? '').toLowerCase() === OWNER_ACCOUNT;

export const OWNER_HOME_CONTENT: RegionContent = {
  id: 'ownerHome',
  things: [
    // the storage room under the house: sixty chests round the walls, and everything in them is the vault's
    { id: 'ownerChests', x: -2470.5, y: 11, z: 2394.5, label: 'Open your chests', radius: 5, when: (g) => isHomeOwner(g.accountName()), use: (g) => g.openVaultAt('Your chests', -2470.5, 2394.5) },
    { id: 'ownerChestsShut', x: -2470.5, y: 11, z: 2394.5, label: 'Look at the chests', radius: 5, when: (g) => !isHomeOwner(g.accountName()), use: (g) => g.toast('The chests are locked, every one. This is somebody\'s house.') },
  ],
};
