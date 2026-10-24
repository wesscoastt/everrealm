import type { DialogueTree, DOption, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { COTTAGE, LAND_BOARD, LOT_D, LOT_PRICE, LOT_W, LOTS } from '../housing';
import { LODGINGS } from '../lodgings';
import { landOf } from '../../world/land';

// The Charter's land book: every lot for sale, every room and inn to let, and Wendside Cottage, with
// what each costs and whether it's yours, read out by the land clerks (by the land board at Oak Side,
// in Ansbury's Guild Ward, at Gullmouth's harbourmaster's office, at the Works' company office). Pick
// one and it's pinned on your map.

const lots = LOTS.map((l) => ({ ...l, cx: l.x0 + LOT_W / 2, cz: l.z0 + LOT_D / 2 }));
const lets = LODGINGS.filter((l) => landOf(l) === 'counties');
const plotOf = (g: GameApi) => g.flag('plot') as { lot?: string; spec?: unknown } | undefined;
const flatOf = (g: GameApi) => g.flag('flat') as { house?: string; until?: number } | undefined;

const lotStatus = (g: GameApi, id: string) => (plotOf(g)?.lot === id ? 'yours' : `for sale, ${LOT_PRICE} marks`);
const letStatus = (g: GameApi, id: string, rent: number) => { const f = flatOf(g); return f?.house === id && (f.until ?? 0) > Date.now() ? 'you rent a room here' : `${rent} marks a week`; };

const pin = (x: number, z: number, label: string) => (g: GameApi) => g.markOnMap(x, z, label);

const book: DialogueTree = {
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'The Charter\'s land book. Lots to build on, a cottage for sale, rooms and inns to let by the week. What are you after?',
      options: [
        { text: 'Lots to build on.', next: 'lots' },
        { text: 'A house as it stands.', next: 'cottage' },
        { text: 'Rooms in the towns.', next: 'rooms' },
        { text: 'Inns on the roads.', next: 'inns' },
        { text: 'Nothing today.' },
      ],
    },
    lots: {
      text: (g) => `Five lots along the waste ground at Oak Side and Brook Side, west of Cotter's End. ${LOT_PRICE} marks the lease, and you build to your own plans at the land board. ${plotOf(g)?.lot ? 'You have one already.' : 'One to a person.'}`,
      options: [
        ...lots.map((l): DOption => ({ text: (g) => `${l.name}: ${lotStatus(g, l.id)}. Show me.`, effect: pin(l.cx, l.cz, l.name), next: 'lots' })),
        { text: 'The land board itself.', effect: pin(LAND_BOARD.x, LAND_BOARD.z, 'The Charter land board'), next: 'lots' },
        { text: 'Something else.', next: 'hello' },
      ],
    },
    cottage: {
      text: (g) => (g.flag('home') && !plotOf(g)?.spec && !flatOf(g)?.house ? 'Wendside Cottage is yours. You\'ll know where it is.' : `Wendside Cottage, by the brook at Oak Side: one room and a hearth, ${COTTAGE.price} marks as it stands. Buy it at the door.`),
      options: [{ text: 'Show me.', effect: pin(COTTAGE.x0 + COTTAGE.w / 2, COTTAGE.z0 + COTTAGE.d / 2, 'Wendside Cottage'), next: 'hello' }, { text: 'Something else.', next: 'hello' }],
    },
    rooms: {
      text: 'Rooms by the week in the towns: furnish them, sleep in them, keep a chest that opens on your bank. Pay at the door, up to four weeks ahead.',
      options: [
        ...lets.filter((l) => !l.inn).map((l): DOption => ({ text: (g) => `${l.name}, ${l.town}: ${letStatus(g, l.id, l.rent)}. Show me.`, effect: pin(l.x, l.z, `${l.name}, ${l.town}`), next: 'rooms' })),
        { text: 'Something else.', next: 'hello' },
      ],
    },
    inns: {
      text: 'The inns out on the roads let rooms too, a day\'s walk from anywhere. Handy if you live on the road.',
      options: [
        ...lets.filter((l) => l.inn).map((l): DOption => ({ text: (g) => `${l.name}, ${l.town}: ${letStatus(g, l.id, l.rent)}. Show me.`, effect: pin(l.x, l.z, `${l.name}, ${l.town}`), next: 'inns' })),
        { text: 'Something else.', next: 'hello' },
      ],
    },
  },
};

const look = (skin: string, hair: string, tunic: string, extra = {}) => ({ skin, hair, hairStyle: 1, eyes: '#4a3a2a', tunic, trim: '#c8a050', trousers: '#2a2a30', boots: '#1a1612', age: 0.5, ...extra });
const clerk = (id: string, name: string, title: string, at: [number, number], face: [number, number], l: ReturnType<typeof look>): NpcDef =>
  ({ id, name, title, look: l as NpcDef['look'], schedule: [{ from: 0, to: 24, at, face, anim: 'idle' }], barks: [] });

const npcs: NpcDef[] = [
  clerk('land_joan', 'Joan Pike', 'Charter land agent', [LAND_BOARD.x + 2, LAND_BOARD.z + 2], [LAND_BOARD.x, LAND_BOARD.z], look('#e2b894', '#6a4a2a', '#2f4a6a', { lashes: true, hairStyle: 2 })),
  clerk('land_thomas', 'Thomas Ashdown', 'Charter land clerk', [781.5, 158.5], [781.5, 164], look('#c89a78', '#3a2a1a', '#2a2a30', { beard: true })),
  clerk('land_peter', 'Peter Vosper', 'Harbourmaster', [1778.5, 584.2], [1778.5, 590], look('#b8865e', '#8a847c', '#1f3a4a', { beard: true, age: 0.65, hat: 'tricorn' })),
  clerk('land_nell', 'Nell Grainger', 'Company clerk', [981.5, 995.2], [981.5, 1000], look('#f0d0b8', '#4a3020', '#4a3a2a', { lashes: true, hairStyle: 2, age: 0.35 })),
];

export const LISTINGS_CONTENT: RegionContent = {
  id: 'listings',
  npcs,
  dialogue: Object.fromEntries(npcs.map((n) => [n.id, book])),
};
