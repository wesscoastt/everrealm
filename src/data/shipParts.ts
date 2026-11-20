import { HULLS, type Hull, type HullId } from './naval';

// SHIPS BUILT TO YOUR OWN DESIGN (owner 2026-11-19: "ship building like starfield but building boats and naval combat to
// fit them"; docs/SHIPBUILD.md). A shipwright lays down a keel (cutter, brig or frigate) and you choose what goes in
// each of her slots: what's at her bow and her stern, her rig and her sailcloth, her planking, what each gun deck
// carries, and what fills her hold. Every part has its weight, its price and what it does; the keel says how much she
// can carry before she wallows. The sum is a Hull (data/naval.ts) that sails and fights in game/Sailing.ts, and a short
// string the realm passes to other captains so they see the ship you built.

export type SlotKind = 'bow' | 'stern' | 'rig' | 'cloth' | 'plank' | 'deck' | 'hold';

/** A gun: what a ball does, how far it carries (its speed and flight), how long to load, and its weight. */
export interface Gun { id: string; name: string; dmg: number; speed: number; life: number; reload: number; mass: number; vsRig: number }
export const GUNS: Record<string, Gun> = {
  light: { id: 'light', name: 'Light guns (six-pounders)', dmg: 46, speed: 48, life: 1.8, reload: 4.2, mass: 3, vsRig: 1 },
  long: { id: 'long', name: 'Long guns (twelve-pounders)', dmg: 70, speed: 64, life: 2.4, reload: 6.5, mass: 6, vsRig: 1 },
  carronade: { id: 'carronade', name: 'Carronades (twenty-four-pounders)', dmg: 118, speed: 40, life: 1.1, reload: 7.5, mass: 5, vsRig: 0.7 },
  chain: { id: 'chain', name: 'Guns loaded with chain', dmg: 30, speed: 46, life: 1.5, reload: 6, mass: 4, vsRig: 3.2 },
};

/** A part for a slot. Everything a part changes is optional: absent means it changes nothing. */
export interface ShipPart {
  id: string; slot: SlotKind; name: string; blurb: string;
  mass: number;
  marks: number; items?: Record<string, number>;
  /** Which keels take it (all, if absent). */
  keels?: HullId[];
  hpMul?: number; hpAdd?: number; speedMul?: number; turnMul?: number;
  /** Rig: how close to the wind she'll sail (radians off the no-go cone; + is closer) and her speed running before it. */
  upwind?: number; downwind?: number;
  /** Rigging's strength against shot that cuts it (1 is ordinary canvas). */
  rigHp?: number;
  /** A gun deck's guns (GUNS id); null for a deck left open. */
  gun?: string | null;
  /** Bow and stern: a chaser gun firing ahead or astern; a ram's damage per block a second of speed. */
  chaser?: string; ram?: number;
  cargo?: number; crew?: number; reloadMul?: number;
  /** Hull mended a little each second while no gun has fired at her for a while. */
  repair?: number;
}

const P = (p: ShipPart) => p;
export const PARTS: Record<string, ShipPart> = Object.fromEntries([
  // the bow
  P({ id: 'stem', slot: 'bow', name: 'Plain stem', blurb: 'A clean bow and nothing on it. The lightest there is.', mass: 0, marks: 0 }),
  P({ id: 'figurehead', slot: 'bow', name: 'Carved figurehead', blurb: 'A crew sails harder under a good figurehead. Nobody can say why; nobody sails without one if they can help it.', mass: 1, marks: 600, items: { oak_logs: 4 }, reloadMul: 0.95 }),
  P({ id: 'ram', slot: 'bow', name: 'Bronze ram', blurb: 'A beak of cast bronze at the waterline. Run her into another ship at speed and she does the work of a broadside.', mass: 8, marks: 1800, items: { bronze_bar: 12 }, ram: 34, speedMul: 0.97 }),
  P({ id: 'bowchaser', slot: 'bow', name: 'Bow chaser', blurb: 'A long gun in the bow, firing dead ahead, for a ship you\'re chasing. R fires it.', mass: 6, marks: 1400, items: { iron_fittings: 6 }, chaser: 'long' }),
  // the stern
  P({ id: 'transom', slot: 'stern', name: 'Open transom', blurb: 'A flat stern and a tiller. Light, and nothing more.', mass: 0, marks: 0 }),
  P({ id: 'castle', slot: 'stern', name: 'Sterncastle', blurb: 'A raised deck aft, timbered thick: harder to sink, slower to turn.', mass: 9, marks: 1600, items: { oak_logs: 20 }, hpMul: 1.12, turnMul: 0.94, crew: 2 }),
  P({ id: 'sternchaser', slot: 'stern', name: 'Stern chaser', blurb: 'A long gun through the stern windows, for a ship chasing you. R fires it.', mass: 6, marks: 1400, items: { iron_fittings: 6 }, chaser: 'long' }),
  P({ id: 'cabin', slot: 'stern', name: 'Great cabin', blurb: 'The captain\'s cabin across the stern: lockers, a chart table, and the ship\'s carpenter\'s stores under the deck.', mass: 4, marks: 1200, items: { pine_logs: 12 }, cargo: 6, repair: 2 }),
  // the rig
  P({ id: 'foreaft', slot: 'rig', name: 'Fore-and-aft rig', blurb: 'Sails along her length: she points closer to the wind than any square-rigger, and gives a little away running before it.', mass: 0, marks: 0, upwind: 0.18, downwind: 0.94 }),
  P({ id: 'square', slot: 'rig', name: 'Square rig', blurb: 'Yards across the masts: magnificent with the wind behind her, sulky with it ahead.', mass: 4, marks: 1500, items: { ship_cable: 6, sailcloth: 4 }, upwind: -0.12, downwind: 1.14 }),
  P({ id: 'brigantine', slot: 'rig', name: 'Brigantine rig', blurb: 'Square sails on the foremast, fore-and-aft on the main: good enough at everything, best at nothing.', mass: 2, marks: 900, items: { ship_cable: 4, sailcloth: 2 }, upwind: 0.06, downwind: 1.05 }),
  // the sailcloth
  P({ id: 'canvas', slot: 'cloth', name: 'Canvas', blurb: 'Ordinary flax canvas. Patchable anywhere.', mass: 0, marks: 0 }),
  P({ id: 'duck', slot: 'cloth', name: 'Heavy duck', blurb: 'Double-woven cotton duck: shot goes through it and it holds.', mass: 2, marks: 800, items: { sailcloth: 8 }, rigHp: 1.6, speedMul: 0.97 }),
  P({ id: 'silk', slot: 'cloth', name: 'Callis silk', blurb: 'Light as breath and drawing like a dream. It tears if you look at it.', mass: -1, marks: 2600, items: { sailcloth: 4 }, rigHp: 0.6, speedMul: 1.08 }),
  // the planking
  P({ id: 'oak', slot: 'plank', name: 'Oak planking', blurb: 'Seasoned oak, the way ships have always been built.', mass: 0, marks: 0 }),
  P({ id: 'pine', slot: 'plank', name: 'Pine planking', blurb: 'Light and quick, and shot goes through it like a door.', mass: -8, marks: 0, hpMul: 0.82, speedMul: 1.05, turnMul: 1.05 }),
  P({ id: 'copper', slot: 'plank', name: 'Copper-sheathed oak', blurb: 'Oak with copper over her bottom: no weed, no worm, and a knot more for it.', mass: 3, marks: 2400, items: { copper_ore: 30 }, speedMul: 1.07 }),
  P({ id: 'ironband', slot: 'plank', name: 'Iron-banded oak', blurb: 'Oak strapped with iron along the wale. She\'ll take a beating, and she\'ll sit low doing it.', mass: 12, marks: 3000, items: { iron_bar: 20 }, hpMul: 1.3, speedMul: 0.95 }),
  // the gun decks
  P({ id: 'opendeck', slot: 'deck', name: 'Open deck (cargo)', blurb: 'No guns: the deck is stowed with cargo instead.', mass: 0, marks: 0, gun: null, cargo: 10 }),
  P({ id: 'g_light', slot: 'deck', name: 'Light guns', blurb: 'Six-pounders: quick to load, and they don\'t hit hard.', mass: 0, marks: 400, items: { iron_fittings: 4 }, gun: 'light' }),
  P({ id: 'g_long', slot: 'deck', name: 'Long guns', blurb: 'Twelve-pounders with long barrels: they reach, and they\'re slow to load.', mass: 0, marks: 900, items: { iron_fittings: 6, iron_bar: 4 }, gun: 'long' }),
  P({ id: 'g_carronade', slot: 'deck', name: 'Carronades', blurb: 'Short fat twenty-four-pounders: at close quarters nothing hits harder. At a distance nothing misses more.', mass: 0, marks: 1200, items: { iron_fittings: 6, iron_bar: 6 }, gun: 'carronade' }),
  P({ id: 'g_chain', slot: 'deck', name: 'Chain-shot guns', blurb: 'Guns loaded with two balls on a chain: they cut rigging to rags and leave the hull alone. A ship with no sails is a ship you can catch.', mass: 0, marks: 900, items: { iron_fittings: 4, ship_cable: 4 }, gun: 'chain' }),
  // the hold
  P({ id: 'cargo', slot: 'hold', name: 'Cargo hold', blurb: 'An empty hold, for whatever you\'re carrying.', mass: 0, marks: 0, cargo: 12 }),
  P({ id: 'berths', slot: 'hold', name: 'Crew berths', blurb: 'Hammocks for more hands: more hands at the guns, faster loading.', mass: 2, marks: 700, items: { sailcloth: 2, pine_logs: 6 }, crew: 6 }),
  P({ id: 'magazine', slot: 'hold', name: 'Powder magazine', blurb: 'A lined, lamp-lit room for the powder, and the boys to run it up: every gun loads faster.', mass: 4, marks: 1500, items: { iron_fittings: 6, pine_tar: 4 }, reloadMul: 0.86 }),
  P({ id: 'carpenter', slot: 'hold', name: 'Carpenter\'s walk', blurb: 'A passage round the inside of her hull, and a carpenter and his mates to plug shot holes as they come.', mass: 3, marks: 1300, items: { oak_logs: 10, pine_tar: 6 }, repair: 4 }),
  P({ id: 'ballast', slot: 'hold', name: 'Iron ballast', blurb: 'Pig iron low in her hold: she stands up to the wind and turns like a cart.', mass: 10, marks: 300, items: { iron_bar: 10 }, turnMul: 0.9, hpMul: 1.06 }),
].map((p) => [p.id, p]));

/** What a keel offers: the decks and how many guns a side each holds, the hold's slots, and how much weight she carries well. */
export interface Keel { decks: number[]; holds: number; capacity: number; crew: number; cargo: number }
export const KEELS: Record<HullId, Keel> = {
  cutter: { decks: [2], holds: 1, capacity: 24, crew: 6, cargo: 6 },
  brig: { decks: [2, 2], holds: 2, capacity: 64, crew: 12, cargo: 12 },
  frigate: { decks: [3, 2, 2], holds: 3, capacity: 104, crew: 24, cargo: 20 },
};

/** A design: a keel and a part in each slot, keyed bow, stern, rig, cloth, plank, d0.., h0.. */
export interface Design { keel: HullId; parts: Record<string, string> }

export function slotsOf(keel: HullId): { key: string; kind: SlotKind; label: string }[] {
  const k = KEELS[keel];
  return [
    { key: 'bow', kind: 'bow', label: 'Bow' }, { key: 'stern', kind: 'stern', label: 'Stern' },
    { key: 'rig', kind: 'rig', label: 'Rig' }, { key: 'cloth', kind: 'cloth', label: 'Sailcloth' }, { key: 'plank', kind: 'plank', label: 'Planking' },
    ...k.decks.map((n, i) => ({ key: 'd' + i, kind: 'deck' as const, label: `${['Main', 'Upper', 'Quarter'][i]} deck (${n} guns a side)` })),
    ...Array.from({ length: k.holds }, (_, i) => ({ key: 'h' + i, kind: 'hold' as const, label: k.holds > 1 ? `Hold ${i + 1}` : 'Hold' })),
  ];
}

/** The parts that fit a slot on a keel, plainest first. */
export const partsFor = (keel: HullId, kind: SlotKind) => Object.values(PARTS).filter((p) => p.slot === kind && (!p.keels || p.keels.includes(keel)));

/** The plain ship of a keel, as the yards laid them before you could choose (her old guns: light on a cutter, long above). */
export function baseDesign(keel: HullId): Design {
  const parts: Record<string, string> = { bow: 'stem', stern: 'transom', rig: keel === 'cutter' ? 'foreaft' : 'square', cloth: 'canvas', plank: 'oak' };
  KEELS[keel].decks.forEach((_, i) => { parts['d' + i] = keel === 'cutter' ? 'g_light' : 'g_long'; });
  for (let i = 0; i < KEELS[keel].holds; i++) parts['h' + i] = 'cargo';
  return { keel, parts };
}

/** A design in the short form the realm passes on: "brig:bow=ram,stern=castle,...". */
export function encodeDesign(d: Design): string { return d.keel + ':' + slotsOf(d.keel).map((s) => `${s.key}=${d.parts[s.key] ?? ''}`).join(','); }
export function decodeDesign(s: unknown): Design | null {
  if (typeof s !== 'string' || s.length > 240) return null;
  const [keel, rest] = s.split(':');
  if (!(keel in KEELS)) return null;
  const d = baseDesign(keel as HullId);
  for (const kv of (rest ?? '').split(',')) {
    const [k, v] = kv.split('=');
    const slot = slotsOf(d.keel).find((x) => x.key === k), part = PARTS[v];
    if (slot && part && part.slot === slot.kind && (!part.keels || part.keels.includes(d.keel))) d.parts[k] = v;
  }
  return d;
}

/** A gun deck as built: its gun, how many a side. */
export interface Battery { gun: Gun; n: number }
/** A built ship: the Hull she sails and fights as, and everything the shipyard shows. */
export interface BuiltShip extends Hull {
  design: Design; code: string;
  batteries: Battery[]; bowChaser: Gun | null; sternChaser: Gun | null; ram: number;
  upwind: number; downwind: number; rigHp: number; repair: number; reloadMul: number;
  cargo: number; crew: number; crewNeeded: number; mass: number; capacity: number;
  /** What the parts cost, over the keel's own price. */
  cost: { marks: number; items: Record<string, number> };
}

/** Everything a design adds up to. */
export function buildShip(d: Design): BuiltShip {
  const base = HULLS[d.keel], keel = KEELS[d.keel];
  let hpMul = 1, hpAdd = 0, speedMul = 1, turnMul = 1, mass = 0, cargo = keel.cargo, crew = keel.crew, reloadMul = 1, repair = 0, rigHp = 1, ram = 0;
  let upwind = 0, downwind = 1;
  let bowChaser: Gun | null = null, sternChaser: Gun | null = null;
  const batteries: Battery[] = [];
  const marks = { n: 0 }, items: Record<string, number> = {};
  for (const s of slotsOf(d.keel)) {
    const p = PARTS[d.parts[s.key]] ?? partsFor(d.keel, s.kind)[0];
    mass += p.mass; hpMul *= p.hpMul ?? 1; hpAdd += p.hpAdd ?? 0; speedMul *= p.speedMul ?? 1; turnMul *= p.turnMul ?? 1;
    cargo += p.cargo ?? 0; crew += p.crew ?? 0; reloadMul *= p.reloadMul ?? 1; repair += p.repair ?? 0; rigHp *= p.rigHp ?? 1; ram += p.ram ?? 0;
    if (p.upwind !== undefined) upwind = p.upwind;
    if (p.downwind !== undefined) downwind = p.downwind;
    if (p.chaser && s.kind === 'bow') bowChaser = GUNS[p.chaser];
    if (p.chaser && s.kind === 'stern') sternChaser = GUNS[p.chaser];
    if (s.kind === 'deck' && p.gun) { const g = GUNS[p.gun], n = keel.decks[Number(s.key.slice(1))]; batteries.push({ gun: g, n }); mass += g.mass * n * 2; }
    marks.n += p.marks;
    for (const [it, n] of Object.entries(p.items ?? {})) items[it] = (items[it] ?? 0) + n;
  }
  if (bowChaser) mass += bowChaser.mass;
  if (sternChaser) mass += sternChaser.mass;
  // Overloaded, she wallows: speed and handiness fall away past her capacity; light, she's a little livelier
  const over = mass / keel.capacity;
  const load = over > 1 ? Math.max(0.55, 1 - (over - 1) * 0.6) : 1 + (1 - Math.max(0, over)) * 0.05;
  const guns = batteries.reduce((a, b) => a + b.n, 0) + (bowChaser ? 1 : 0) + (sternChaser ? 1 : 0);
  const crewNeeded = Math.max(4, guns * 2 + 2);
  const handy = Math.min(1.1, Math.max(0.6, crew / crewNeeded));
  reloadMul /= handy;
  const first = batteries[0], perSide = batteries.reduce((a, b) => a + b.n, 0);
  return {
    ...base, design: d, code: encodeDesign(d),
    hp: Math.round(base.hp * hpMul + hpAdd),
    speed: +(base.speed * speedMul * load).toFixed(2),
    turn: +(base.turn * turnMul * Math.min(1.05, load)).toFixed(3),
    // (all decks together, for anything that reads a broadside as one: the batteries are what fires)
    guns: perSide,
    shot: perSide ? Math.round(batteries.reduce((a, x) => a + x.gun.dmg * x.n, 0) / perSide) : 0,
    reload: first ? +(Math.max(...batteries.map((x) => x.gun.reload)) * reloadMul).toFixed(2) : base.reload,
    batteries, bowChaser, sternChaser, ram, upwind, downwind, rigHp, repair, reloadMul,
    cargo, crew, crewNeeded, mass, capacity: keel.capacity,
    cost: { marks: marks.n, items },
  };
}

/** The weight of a broadside on one side (every gun of every deck), for the shipyard's figures. */
export const broadside = (b: BuiltShip) => b.batteries.reduce((a, x) => a + x.gun.dmg * x.n, 0);
