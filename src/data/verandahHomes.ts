import { MC_HOUSES, MC_SIGNS, MC_THINGS, MC_WAYSTONES } from './mcSigns';
import { GORRAN_WAYMARK } from './content/gorran';
import { inOwnerHome } from './content/ownerHome';

// Verandah's houses for sale (owner 2026-11-05: "allow the exterior homes in Verandah to be purchased by players
// based off their looks; some are big and unique"; 2026-11-06: "players can buy all exterior homes"). Every
// house of theirs with a door the exporter could find a roofed room behind (MC_HOUSES, scripts/mc/export.ts),
// rooms that touch counted as one house: those with a shop's, a guild's or a hall's sign about them are the
// town's, the owner's own house is theirs, and the rest are for sale, bought outright as the Mirador's are
// (game/Game.ts buyVilla) and priced by their floor: a two-room cottage a few thousand marks, a big house more.

export interface VerandahHome {
  /** In the realm's homes book: 'vh1'... (west to east). */
  id: string;
  /** An address: its number, and the nearest of the owner's waystones ("No. 3, Verandah Port"). */
  name: string;
  /** The ground floor's extent, in the game's x and z, and its floor. */
  x0: number; z0: number; x1: number; z1: number; base: number;
  /** The front door's cell. */
  door: [number, number];
  /** Floor area, blocks. */
  area: number;
  price: number;
  /** Every door into it from outside (front and back), and which way it faces out: [x, z, ry]; its FOR SALE board stands by each. */
  doors: [number, number, number][];
}

/** Signs that don't make a building public: a house's own, a mailbox, a name. */
const PRIVATE = /^(house|home|mailbox|w|for sale.*|chief killianos)$/i;

function build(): VerandahHome[] {
  // rooms that touch (or nearly), on floors not far apart, are one house
  const rooms = MC_HOUSES.map((r) => ({ x0: r[0], z0: r[1], x1: r[2], z1: r[3], base: r[4], door: [r[5], r[6]] as [number, number], area: r[7] }));
  const group = rooms.map((_, i) => i);
  const find = (i: number): number => (group[i] === i ? i : (group[i] = find(group[i])));
  for (let i = 0; i < rooms.length; i++) for (let j = i + 1; j < rooms.length; j++) {
    const a = rooms[i], b = rooms[j];
    if (Math.abs(a.base - b.base) <= 12 && a.x0 <= b.x1 + 2 && b.x0 <= a.x1 + 2 && a.z0 <= b.z1 + 2 && b.z0 <= a.z1 + 2) group[find(i)] = find(j);
  }
  const houses = new Map<number, typeof rooms>();
  rooms.forEach((r, i) => { const k = find(i); let l = houses.get(k); if (!l) houses.set(k, (l = [])); l.push(r); });
  const out: Omit<VerandahHome, 'id' | 'name' | 'doors'>[] = [];
  for (const list of houses.values()) {
    const x0 = Math.min(...list.map((r) => r.x0)), x1 = Math.max(...list.map((r) => r.x1)), z0 = Math.min(...list.map((r) => r.z0)), z1 = Math.max(...list.map((r) => r.z1));
    const base = Math.min(...list.map((r) => r.base)), area = list.reduce((a, r) => a + r.area, 0);
    // the front door: the ground floor's, nearest the street (the room with the lowest floor's own door)
    const front = list.slice().sort((a, b) => a.base - b.base || b.area - a.area)[0];
    if (area < 14 || area > 900) continue;
    if (inOwnerHome((x0 + x1) / 2, (z0 + z1) / 2)) continue;
    // a public building: a sign about it that isn't a house's own
    if (MC_SIGNS.some((s) => s.x >= x0 - 3 && s.x <= x1 + 3 && s.z >= z0 - 3 && s.z <= z1 + 3 && Math.abs(s.y - base) < 10 && !PRIVATE.test(s.text.split(String.fromCharCode(10)).join(' ').trim()))) continue;
    out.push({ x0, z0, x1, z1, base, door: front.door, area, price: Math.round((1500 + area * 30) / 100) * 100 });
  }
  out.sort((a, b) => a.x0 - b.x0 || a.z0 - b.z0);
  // addresses: numbered within the nearest waystone's neighbourhood
  const count = new Map<string, number>();
  // the doors: the owner's doors just outside the house's walls, on its ground floor
  const mcDoors = MC_THINGS.filter((t) => t[0] === 'mcdoor').map((t) => [Math.floor(+t[1]), +t[2], Math.floor(+t[3])]);
  const doorsOf = (h: Omit<VerandahHome, 'id' | 'name' | 'doors'>): [number, number, number][] => {
    const list: [number, number, number][] = [];
    for (const [x, y, z] of mcDoors) {
      if (Math.abs(y - h.base) > 1.5) continue;
      const inX = x >= h.x0 && x <= h.x1, inZ = z >= h.z0 && z <= h.z1;
      if (inX && z === h.z1 + 1) list.push([x, z, 0]);
      else if (inX && z === h.z0 - 1) list.push([x, z, Math.PI]);
      else if (inZ && x === h.x1 + 1) list.push([x, z, Math.PI / 2]);
      else if (inZ && x === h.x0 - 1) list.push([x, z, -Math.PI / 2]);
    }
    if (!list.length) list.push([h.door[0], h.door[1], h.door[1] > h.z1 ? 0 : h.door[1] < h.z0 ? Math.PI : h.door[0] > h.x1 ? Math.PI / 2 : -Math.PI / 2]);
    return list;
  };
  return out.slice(0, 99).map((h0, i) => {
    const h = { ...h0, doors: doorsOf(h0) };
    const cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2;
    const near = [...MC_WAYSTONES.filter((w) => w.name), GORRAN_WAYMARK].sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
    const area = near?.name ?? 'Verandah', n = (count.get(area) ?? 0) + 1;
    count.set(area, n);
    return { ...h, id: 'vh' + (i + 1), name: `No. ${n}, ${area}` };
  });
}

/** Quarry Row, three houses on the open strip against the quarry wall (scripts/mc/gaterow.cjs; owner 2026-11-06: "add some on
 * the empty side by the gate", "against the quarry wall on the open strip of land"): for sale like the rest, listed after them so
 * no house already held changes its id. */
const GATE_ROW: VerandahHome[] = [2033, 2043, 2053].map((z0, i) => ({
  id: 'vg' + (i + 1), name: `No. ${i + 1}, Quarry Row`, x0: -3118, z0: z0 + 1, x1: -3112, z1: z0 + 7, base: 22,
  door: [-3119, z0 + 4] as [number, number], area: 49, price: 3000, doors: [[-3119, z0 + 4, -Math.PI / 2]] as [number, number, number][],
}));
export const VERANDAH_HOMES: VerandahHome[] = [...build(), ...GATE_ROW];
export const VERANDAH_HOME_BY_ID = new Map(VERANDAH_HOMES.map((h) => [h.id, h]));
