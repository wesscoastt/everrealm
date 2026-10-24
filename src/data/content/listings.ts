import type { DialogueTree, DOption, GameApi } from '../../game/api';
import type { NpcDef } from '../npcs';
import type { RegionContent } from './types';
import { COTTAGE, LAND_BOARD, LOT_D, LOT_PRICE, LOT_W, LOTS, WENDSIDE_LOTS } from '../housing';
import { ESTATES } from '../estates';
import { LODGINGS } from '../lodgings';
import { POSTS } from '../travel';
import { landAt, landOf } from '../../world/land';
import { yardShop } from './buildyard';

// The Charter's land book: every lot to let (Wendside's, and the estates by the Post towns, the
// Assembly's in Morrow among them), every room and inn to let, and Wendside Cottage, with what each
// costs and who holds it, read out by the land clerks (by the land board at Oak Side, in Ansbury's Guild
// Ward, at Gullmouth's harbourmaster's office, at the Works' company office). Pick one and it's pinned
// on your map.

const CALLIS_POST = POSTS.find((q) => q.id === 'callis')!;
const lots = WENDSIDE_LOTS.map((l) => ({ ...l, cx: l.x0 + LOT_W / 2, cz: l.z0 + LOT_D / 2 }));
/** Each estate with its lots, its middle (to pin), and the town it's by. */
const estates = ESTATES.map((e) => {
  const mine = LOTS.filter((l) => l.estate === e.name && l.town === e.town);
  return { ...e, ids: mine.map((l) => l.id), cx: mine.reduce((a, l) => a + l.x0 + LOT_W / 2, 0) / mine.length, cz: mine.reduce((a, l) => a + l.z0 + LOT_D / 2, 0) / mine.length, land: landAt(mine[0].x0) };
});
/** The Post towns with estates by them, the Counties' first: the town's own name, without its stop's. */
const townName = (id: string) => (POSTS.find((q) => q.id === id)?.name ?? id).split(',')[0].replace(/ Works$/, '');
const towns = [...new Set(estates.map((e) => e.town))].sort((a, b) => Number(estates.find((e) => e.town === a)!.land === 'morrow') - Number(estates.find((e) => e.town === b)!.land === 'morrow'));
const lets = LODGINGS.filter((l) => landOf(l) === 'counties');
const plotOf = (g: GameApi) => g.flag('plot') as { lot?: string; spec?: unknown } | undefined;
const flatOf = (g: GameApi) => g.flag('flat') as { house?: string; until?: number } | undefined;

const lotStatus = (g: GameApi, id: string) => { const h = g.homeHolder(id); return plotOf(g)?.lot === id ? 'yours' : h ? `${h}'s` : `to let, ${LOT_PRICE} marks`; };
const freeOn = (g: GameApi, ids: string[]) => ids.filter((id) => !g.homeHolder(id)).length;
const letStatus = (g: GameApi, id: string, rent: number) => { const f = flatOf(g); return f?.house === id && (f.until ?? 0) > Date.now() ? 'you rent a room here' : `${rent} marks a week`; };

const pin = (x: number, z: number, label: string) => (g: GameApi) => g.markOnMap(x, z, label);

const book = (clerk: string): DialogueTree => ({
  start: () => 'hello',
  nodes: {
    hello: {
      text: 'The Charter\'s land book. Lots to build on, a cottage for sale, rooms and inns to let by the week. What are you after?',
      options: [
        { text: 'Lots to build on.', next: 'lots' },
        { text: 'Stone and timber, to build with myself.', effect: (g) => g.openShop('yard_' + clerk) },
        { text: 'A house as it stands.', next: 'cottage' },
        { text: 'Rooms in the towns.', next: 'rooms' },
        { text: 'Inns on the roads.', next: 'inns' },
        { text: 'Nothing today.' },
      ],
    },
    lots: {
      text: (g) => `Wendside, and an estate by every Post town. ${LOT_PRICE} marks for ninety-nine years; build what you like. Three months away and it lapses. ${plotOf(g)?.lot ? 'You have one.' : 'One each.'}`,
      options: [
        { text: (g) => `Wendside, by Hollin Ford: ${freeOn(g, lots.map((l) => l.id))} of ${lots.length} to let.`, next: 'lots:wendside' },
        ...towns.filter((t) => estates.find((e) => e.town === t)!.land === 'counties').map((t): DOption => ({ text: (g) => `By ${townName(t)}: ${freeOn(g, estates.filter((e) => e.town === t).flatMap((e) => e.ids))} to let.`, next: 'lots:' + t })),
        { text: 'Over the sea, in Morrow.', next: 'lots:morrow' },
        { text: 'Something else.', next: 'hello' },
      ],
    },
    'lots:wendside': {
      text: 'Five lots along the waste ground at Oak Side and Brook Side, west of Cotter\'s End. The land board stands between the two rows.',
      options: [
        ...lots.map((l): DOption => ({ text: (g) => `${l.name}: ${lotStatus(g, l.id)}. Show me.`, effect: pin(l.cx, l.cz, l.name), next: 'lots:wendside' })),
        { text: 'The land board itself.', effect: pin(LAND_BOARD.x, LAND_BOARD.z, 'The Charter land board'), next: 'lots:wendside' },
        { text: 'Other lots.', next: 'lots' },
      ],
    },
    'lots:morrow': {
      text: 'In Morrow the Assembly lets lots on the Charter\'s terms, by treaty, and the Charter keeps the book for both. Same price, same lease. You\'ll want the packet.',
      options: [
        ...towns.filter((t) => estates.find((e) => e.town === t)!.land === 'morrow').map((t): DOption => ({ text: (g) => `By ${townName(t)}: ${freeOn(g, estates.filter((e) => e.town === t).flatMap((e) => e.ids))} to let.`, next: 'lots:' + t })),
        { text: 'Other lots.', next: 'lots' },
      ],
    },
    ...Object.fromEntries(towns.map((t) => ['lots:' + t, {
      text: `The estates by ${townName(t)}: rows of lots on a lane of their own, levelled and staked, the track out to the road.`,
      options: [
        ...estates.filter((e) => e.town === t).map((e): DOption => ({ text: (g) => `${e.name}: ${freeOn(g, e.ids)} of ${e.ids.length} to let. Show me.`, effect: pin(e.cx, e.cz, e.name), next: 'lots:' + t })),
        { text: 'Other lots.', next: estates.find((e) => e.town === t)!.land === 'morrow' ? 'lots:morrow' : 'lots' },
      ],
    }])),
    cottage: {
      text: (g) => (g.flag('home') && !plotOf(g)?.spec && !flatOf(g)?.house ? 'Wendside Cottage is yours. You\'ll know where it is.' : g.homeHolder('cottage') ? `Wendside Cottage, by the brook at Oak Side. ${g.homeHolder('cottage')} has it now.` : `Wendside Cottage, by the brook at Oak Side: one room and a hearth, ${COTTAGE.price} marks as it stands. Buy it at the door.`),
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
});

const look = (skin: string, hair: string, tunic: string, extra = {}) => ({ skin, hair, hairStyle: 1, eyes: '#4a3a2a', tunic, trim: '#c8a050', trousers: '#2a2a30', boots: '#1a1612', age: 0.5, ...extra });
const clerk = (id: string, name: string, title: string, at: [number, number], face: [number, number], l: ReturnType<typeof look>): NpcDef =>
  ({ id, name, title, look: l as NpcDef['look'], schedule: [{ from: 0, to: 24, at, face, anim: 'idle' }], barks: [] });

const npcs: NpcDef[] = [
  clerk('land_joan', 'Joan Pike', 'Charter land agent', [LAND_BOARD.x + 2, LAND_BOARD.z + 2], [LAND_BOARD.x, LAND_BOARD.z], look('#e2b894', '#6a4a2a', '#2f4a6a', { lashes: true, hairStyle: 2 })),
  clerk('land_thomas', 'Thomas Ashdown', 'Charter land clerk', [781.5, 158.5], [781.5, 164], look('#c89a78', '#3a2a1a', '#2a2a30', { beard: true })),
  clerk('land_peter', 'Peter Vosper', 'Harbourmaster', [1778.5, 584.2], [1778.5, 590], look('#b8865e', '#8a847c', '#1f3a4a', { beard: true, age: 0.65, hat: 'tricorn' })),
  clerk('land_nell', 'Nell Grainger', 'Company clerk', [981.5, 995.2], [981.5, 1000], look('#f0d0b8', '#4a3020', '#4a3a2a', { lashes: true, hairStyle: 2, age: 0.35 })),
  // By the Post in Callis: the Assembly's clerk, who keeps the Charter's book for Morrow's lots by treaty
  clerk('land_marti', 'Marti Coll', 'Assembly land clerk', [CALLIS_POST.x + 2.5, CALLIS_POST.z + 2.5], [CALLIS_POST.x, CALLIS_POST.z], look('#d8a878', '#1a1410', '#e8e2d4', { trim: '#2a2a30', beard: true, age: 0.45 })),
];

export const LISTINGS_CONTENT: RegionContent = {
  id: 'listings',
  npcs,
  dialogue: Object.fromEntries(npcs.map((n) => [n.id, book(n.id)])),
  shops: Object.fromEntries(npcs.map((n) => [yardShop(n.id).id, yardShop(n.id, n.id === 'land_marti')])),
};
