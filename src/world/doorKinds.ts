// The kinds of door a building can have (built by props.doorLeaf). Kept apart from props.ts so the
// world plan (sites.ts, in the worker) can name them without pulling in meshes and textures.
//
// A cottage has a plank door on ledges and a brace, a townhouse a painted panelled one with a brass
// knocker; an inn a stable door split across the middle, its top half glazed and lit; a shop half
// glass; a smithy, a gaol or a tower heavy boards, iron bands and studs; a bank iron plate and rivets;
// a chapel or a hall carved oak with scrolled hinges; a store or a shed rough boards and a rope pull.

export type DoorKind = 'cottage' | 'painted' | 'panelled' | 'dutch' | 'glazed' | 'studded' | 'iron' | 'carved' | 'rough';
/** House door paints: the country's colours. */
export const DOOR_PAINTS = ['#4a6a3a', '#2f4a6a', '#7a2a24', '#2a2a2c', '#7a5a2a', '#2a5a5a', '#5a3a4a', '#3a5a4a', '#6a2a1a'];
/** Morrow's white-stone towns paint their doors darker. */
export const MORROW_PAINTS = ['#1e2a2a', '#1f3a4a', '#4a1e1e', '#2a3a2a', '#141416', '#3a2a40'];
