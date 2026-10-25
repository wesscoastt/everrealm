import { B } from '../world/blocks';
import type { FrontId, PropDesc, TrimId } from '../world/sites';
import type { Station } from './gameplay';

// HALL ROW. When Ansbury had its first charter, its trading companies (the fullers, the dyers, the
// chandlers and the rest) built their halls outside the old south wall, where land was cheap. The new
// wall went up along the old one's line and left them outside it, on a lane off the south road. The
// companies have dwindled to a few old men and a dinner a year, and the Charter took the halls for
// what the companies owed. Now it lets them to guilds, through Walter Pinnock, Clerk of the Halls, who
// keeps a desk at the lane's head (data/content/guildhalls.ts).
//
// A guild leases one hall (five thousand marks from its vault), and everyone passing sees its banners
// and its name on the board at the gate. Then its members build it out, one project at a time, from
// what they bring: the long table, the forge in the yard, the counting room, the map room, the roll of
// honour. The realm keeps the book (server/guilds.mjs: who holds which hall, what's built, what's been
// given toward the next thing, and what each costs); game/GuildHalls.ts puts the wings in the world.
//
// Each hall is a two-storey house as the builders make them (world/sites.ts buildHallRow), its own
// company's colours and dressing, with a walled yard behind it through a back door. The way up is in
// the back corner on the east side; the long table runs down the middle of the ground floor, and the
// upper floor is the counting room (west) and the map room (east).

export type HallId = 'fullers' | 'dyers' | 'chandlers' | 'saddlers' | 'coopers' | 'mercers' | 'vintners' | 'cordwainers';
export type ProjectId = 'table' | 'forge' | 'counting' | 'maproom' | 'honour';

export interface Hall {
  id: HallId;
  name: string;
  /** The body of it: corner, size, floor height; its door faces the lane. */
  x0: number; z0: number; w: number; d: number; base: number; door: 'n' | 's';
  wall: number; roof: 'thatch' | 'red' | 'slate' | 'blue'; front: FrontId; trim: TrimId[];
  /** The company's own dressing, out front or in the yard (world/sites.ts buildHallRow). */
  dress: 'tenters' | 'cloths' | 'lamps' | 'rail' | 'casks' | 'statue' | 'vines' | 'hides';
  /** What the clerk says of it. */
  blurb: string;
}

/** The lane: off the south road, east along the foot of the wall's glacis, between the two rows. */
export const HALL_LANE: [number, number][] = [[800, 505], [990, 505]];
/** Walter Pinnock's desk at the lane's head, and where he stands behind it. */
export const HALL_CLERK = { desk: { x: 853.5, z: 503.1 }, at: [853.5, 501.9] as [number, number] };

const W = 15, D = 11, BASE = 24;
const north = (x0: number) => ({ x0, z0: 491, w: W, d: D, base: BASE, door: 's' as const });
const south = (x0: number) => ({ x0, z0: 509, w: W, d: D, base: BASE, door: 'n' as const });

/** West to east: the north row (under the wall), then the south row. */
export const HALLS: Hall[] = [
  { id: 'fullers', name: 'the Fullers\' Hall', ...north(858), wall: B.OchrePlaster, roof: 'thatch', front: 'framed', trim: ['hood', 'shutters'], dress: 'tenters', blurb: 'The oldest on the row, and the yard still has the tenter frames they stretched the cloth on. The thatch was done three summers ago. Five thousand marks.' },
  { id: 'chandlers', name: 'the Chandlers\' Hall', ...north(892), wall: B.RedBrick, roof: 'red', front: 'quoined', trim: ['boxes'], dress: 'lamps', blurb: 'Brick, and lamps either side of the door that the company kept lit every night for two hundred years. I light them now. Five thousand marks.' },
  { id: 'coopers', name: 'the Coopers\' Hall', ...north(926), wall: B.StoneBrick, roof: 'slate', front: 'quoined', trim: ['hood'], dress: 'casks', blurb: 'Stone and slate. Plain, and dry as a bone. The coopers left their racks in the yard and a hundred staves nobody\'s come for. Five thousand marks.' },
  { id: 'vintners', name: 'the Vintners\' Hall', ...north(960), wall: B.RosePlaster, roof: 'red', front: 'framed', trim: ['shutters', 'boxes'], dress: 'vines', blurb: 'Pink, which the vintners say is the colour of claret. The vine along the front is older than I am and still fruits. Five thousand marks.' },
  { id: 'dyers', name: 'the Dyers\' Hall', ...south(858), wall: B.BluePlaster, roof: 'slate', front: 'framed', trim: ['boxes'], dress: 'cloths', blurb: 'They washed it in their own woad. The lines in the yard are for drying cloth, and the stains on the flags won\'t come out. Five thousand marks.' },
  { id: 'saddlers', name: 'the Saddlers\' Hall', ...south(892), wall: B.Planks, roof: 'red', front: 'boarded', trim: ['hood'], dress: 'rail', blurb: 'Weatherboard, with a rail out front to tie up at. Warm in winter. The saddlers kept a good fire. Five thousand marks.' },
  { id: 'mercers', name: 'the Mercers\' Hall', ...south(926), wall: B.Sandstone, roof: 'blue', front: 'quoined', trim: ['hood', 'shutters'], dress: 'statue', blurb: 'The grandest on the row. The mercers had money, and wanted you to know. That\'s their founder at the gate. Five thousand marks, same as the rest.' },
  { id: 'cordwainers', name: 'the Cordwainers\' Hall', ...south(960), wall: B.Whitestone, roof: 'slate', front: 'white', trim: ['shutters'], dress: 'hides', blurb: 'The shoemakers\'. Whitestone, and a frame in the yard where they dressed their leather. It still smells of it in the rain. Five thousand marks.' },
];
export const HALL_BY_ID = new Map(HALLS.map((h) => [h.id, h]));

/** What leasing a hall costs, from the guild's vault. (The realm decides: server/guilds.mjs.) */
export const HALL_LEASE = 5000;

export interface HallProject { id: ProjectId; name: string; blurb: string; /** What it does for the guild. */ perk: string }
/** In the order the clerk suggests them; a guild builds them in any order, one at a time. What each costs is the realm's (server/guilds.mjs). */
export const HALL_PROJECTS: HallProject[] = [
  { id: 'table', name: 'The long table', blurb: 'Oak tables down the middle of the hall, benches either side, a fire on the west wall and barrels by the door.', perk: 'Supper in hall: once a day, sit down at the table for a meal that sees you through the next three-quarters of an hour.' },
  { id: 'forge', name: 'The forge', blurb: 'A forge and an anvil under a lean-to in the yard, a joiner\'s bench beside them, and an iron range at the end.', perk: 'Every member can smelt, smith, make furniture and cook in the yard.' },
  { id: 'counting', name: 'The counting room', blurb: 'A counter upstairs on the west side, with a strongroom door behind it and a clerk\'s desk.', perk: 'Your bank and the guild vault, upstairs in the hall.' },
  { id: 'maproom', name: 'The map room', blurb: 'The Charter\'s maps on a table upstairs on the east side, a glass at the window, and the Post\'s book on a shelf.', perk: 'Ride from the hall to any Charter Post you know, at half the fare.' },
  { id: 'honour', name: 'The roll of honour', blurb: 'A board on the back wall of the hall, lettered in gold, with room for every great beast the guild brings down.', perk: 'Every world boss a member helps bring down goes on the roll, for everyone who walks in to read.' },
];
export const PROJECT_BY_ID = new Map(HALL_PROJECTS.map((p) => [p.id, p]));

/** A guild's colours, worked from its name: field, charge, and how the field's divided. */
export function guildArms(name: string): { field: string; charge: string; division: number; initial: string } {
  let h = 2166136261;
  for (const c of name.toLowerCase()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h >>>= 0;
  const FIELDS = ['#8a1e1e', '#1e3a7a', '#1e5a2e', '#5a1e6a', '#1a1a1e', '#8a5a14', '#6a1e3a', '#14505a'];
  const CHARGES = ['#e8c860', '#ece6d6', '#c8c8cc'];
  return { field: FIELDS[h % FIELDS.length], charge: CHARGES[(h >>> 4) % CHARGES.length], division: (h >>> 8) % 5, initial: (name.match(/[A-Za-z]/)?.[0] ?? '?').toUpperCase() };
}

/** A point in a hall: u across its front from the west end, v in from its front wall (v past d is the yard), floor 0 or 1. */
export function hallAt(h: Hall, u: number, v: number, floor = 0): { x: number; y: number; z: number } {
  return { x: h.x0 + u, y: h.base + floor * 4, z: h.door === 's' ? h.z0 + h.d - v : h.z0 + v };
}
/** Facing in a hall: toward its front (the lane), its back, east or west. */
export function hallFacing(h: Hall, way: 'front' | 'back' | 'east' | 'west'): number {
  const front = h.door === 's' ? 0 : Math.PI;
  return way === 'front' ? front : way === 'back' ? front + Math.PI : way === 'east' ? Math.PI / 2 : -Math.PI / 2;
}
/** The yard behind a hall: its corners (world x0, z0, x1, z1), walls included. */
export function hallYard(h: Hall): [number, number, number, number] {
  return h.door === 's' ? [h.x0, h.z0 - 10, h.x0 + h.w, h.z0] : [h.x0, h.z0 + h.d, h.x0 + h.w, h.z0 + h.d + 10];
}
/** Is a point inside a hall (or its yard)? */
export function inHall(h: Hall, x: number, z: number, yard = true): boolean {
  const [yx0, yz0, yx1, yz1] = hallYard(h);
  const zs = yard ? [Math.min(h.z0, yz0), Math.max(h.z0 + h.d, yz1)] : [h.z0, h.z0 + h.d];
  return x >= Math.min(h.x0, yx0) && x <= Math.max(h.x0 + h.w, yx1) && z >= zs[0] && z <= zs[1];
}

/** Where the members work in the forge yard: a station each, where you stand to use it. */
export function forgeStations(h: Hall): { station: Station; label: string; x: number; y: number; z: number }[] {
  const at = (u: number, v: number) => hallAt(h, u, v);
  return [
    { station: 'furnace', label: 'Use the guild forge', ...at(3, 17.4) },
    { station: 'anvil', label: 'Use the guild anvil', ...at(5.6, 16.4) },
    { station: 'bench', label: 'Work at the guild\'s bench', ...at(9.5, 17.4) },
    { station: 'hearth', label: 'Cook at the guild\'s range', ...at(12.4, 17.4) },
  ];
}
/** The long table's middle (where you sit down to supper), the counting room's counter, the map room's table. */
export const hallTable = (h: Hall) => hallAt(h, 7.5, 5.5);
export const hallCounter = (h: Hall) => hallAt(h, 3.5, 4.5, 1);
export const hallMaps = (h: Hall) => hallAt(h, 10.5, 4.5, 1);
/** Where you arrive when you go to the hall: inside the front door. */
export const hallArrive = (h: Hall) => hallAt(h, 7.5, 2.2);

/**
 * What a guild's hall shows, as props for the world: its banners and gate board, and each wing it has built.
 * guild null: to let. honour: the great beasts on the roll, by name.
 */
export function hallProps(h: Hall, guild: string | null, built: ProjectId[], honour: string[]): PropDesc[] {
  const out: PropDesc[] = [];
  const F = (item: string, u: number, v: number, floor: number, way: 'front' | 'back' | 'east' | 'west', tint = 0) => { const p = hallAt(h, u, v, floor); out.push({ t: 'furn', item, x: p.x, y: p.y, z: p.z, ry: hallFacing(h, way), tint }); };
  const P = (t: PropDesc['t'], u: number, v: number, floor: number, way: 'front' | 'back' | 'east' | 'west', more: Partial<PropDesc> = {}) => { const p = hallAt(h, u, v, floor); out.push({ t, x: p.x, y: p.y, z: p.z, ry: hallFacing(h, way), ...more }); };
  const title = h.name.replace(/^the /, '').toUpperCase();
  // The board at the gate: whose it is, or that it's to let
  P('sign', 11.5, -2.3, 0, 'front', { text: guild ? `${title}\n${guild.toUpperCase()}` : `${title}\nTO LET: THE CLERK` });
  if (!guild) return out;
  // The guild's banners, hung from the upper windows' sills either side of the door
  for (const u of [4.5, 10.5]) P('banner', u, -0.12, 1, 'front', { kind: `guild:${guild}` as const, y: h.base + 7.4 });
  const has = new Set(built);
  if (has.has('table')) {
    for (const u of [4.7, 6.3, 7.9, 9.5]) F('table', u, 5.5, 0, 'front');
    for (const u of [5.5, 8.7]) { F('bench', u, 4.6, 0, 'back'); F('bench', u, 6.4, 0, 'front'); }
    F('candles', 3.3, 5.5, 0, 'east'); F('candles', 11.1, 5.5, 0, 'west');
    F('hearth', 1.5, 5.5, 0, 'east');
    F('barrel', 13.5, 2.5, 0, 'west'); F('barrel', 13.5, 3.4, 0, 'west');
    F('dresser', 13.6, 6, 0, 'west');
    F('rug', 7.5, 2.4, 0, 'front', 1);
  }
  if (has.has('honour')) {
    P('roll', 4.5, 9.62, 0, 'front', { text: honour.join('\n'), len: 3.2 });
    for (const u of [2.7, 6.4]) P('wallLantern', u, 9.6, 0, 'front', { y: h.base + 2.4 });
  }
  if (has.has('counting')) {
    F('counter', 3.5, 4.5, 1, 'front');
    F('vault', 3, 9.6, 1, 'front');
    F('strongbox', 5.4, 9.4, 1, 'front');
    F('desk', 1.6, 7, 1, 'east'); F('chair', 2.4, 7, 1, 'west');
    F('shelves', 1.3, 2.2, 1, 'east');
  }
  if (has.has('maproom')) {
    F('desk', 10.5, 4.5, 1, 'front'); F('chair', 10.5, 5.5, 1, 'front');
    F('spyglass', 12.6, 1.4, 1, 'front');
    F('shelves', 13.7, 4.5, 1, 'west');
    F('easel', 8.4, 1.6, 1, 'back');
  }
  if (has.has('forge')) {
    // Under a lean-to against the yard's far wall
    const r = hallAt(h, 7.5, 17.6);
    out.push({ t: 'roof', x: r.x, y: h.base + 3.1, z: r.z, ry: 0, len: 13, span: 3.6, mat: 'slate', open: true });
    F('forge', 3, 18.3, 0, 'back');
    out.push({ t: 'flame', ...hallAt(h, 3, 18.3), y: h.base + 0.9 }, { t: 'smoke', ...hallAt(h, 3, 18.4), y: h.base + 2.6 });
    P('bellows', 1.6, 18.2, 0, 'east');
    F('anvil', 5.6, 17.2, 0, 'front');
    F('barrel', 7, 18.2, 0, 'front');
    F('desk', 9.5, 18.3, 0, 'back');
    F('hearth', 12.4, 18.4, 0, 'back');
    P('woodpile', 13.4, 14.5, 0, 'west', { len: 3 });
  }
  return out;
}
