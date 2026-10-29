import type { ShipKind } from '../world/shipHull';
import { FERRY_PLANS } from './ferryRoutes';

// THE FERRIES. Ships on a timetable that you walk aboard, as in any port: each keeps to a route between
// jetties of its own, calls at every stop on it in turn there and back, and lies alongside for a while at
// each, the bell rung when she comes in and again before she goes. Where she is comes from the realm
// clock, so everyone sees her in the same place and anyone aboard sails with everyone else aboard. They
// cost nothing; the Charter pays for them out of the harbour dues. (A waymark is quicker and dear.)
//
// The routes are written here; their jetties, where each ship lies at them and her courses between them
// over clear water are worked out by scripts/ferries.ts (npm run -s ferries) into data/ferryRoutes.ts.
// The jetties are built with the world (world/sites.ts buildPiers); the ships sail in world/Ferry.ts.

export interface FerryStop {
  /** The Charter Post stop the jetty serves. */
  post: string;
  /** What the mate calls it. */
  name: string;
  /** Where the generator starts the jetty (on the shore or a quay's edge) and the way it runs out; else it finds them from the post. */
  from?: [number, number];
  dir?: [number, number];
  /** The jetty runs out at least this far (to keep her clear of another ship's jetty). */
  minLen?: number;
  /** A flag you need to be let ashore there (the Assembly's passes). */
  gate?: string;
  /** What the mate says to someone without it. */
  refused?: string;
}

export interface FerryRoute {
  id: string;
  /** Her name, as the mate and the timetables give it. */
  ship: string;
  kind: ShipKind;
  livery: { wale: string; trim: string; flag: string; sail?: string };
  land: 'counties' | 'morrow';
  stops: FerryStop[];
  /** Seconds alongside at each stop; and her speed under way, blocks a second. */
  dock: number;
  speed: number;
  /** Two ships on the long runs, half a round apart, so nobody waits long. */
  ships?: number;
}

export const FERRY_ROUTES: FerryRoute[] = [
  {
    id: 'plover', ship: 'the Plover', kind: 'cog', land: 'counties', dock: 50, speed: 17,
    livery: { wale: '#2f528f', trim: '#d8b04a', flag: '#d8b04a' },
    stops: [
      { post: 'gullmouth', name: 'Gullmouth', from: [1809, 570], dir: [1, 0] },
      { post: 'kell', name: 'Kell', from: [2340, -566], dir: [-1, 0] },
      { post: 'sickle', name: 'the Sickle' },
    ],
  },
  {
    id: 'wren', ship: 'the Wren', kind: 'cog', land: 'counties', dock: 50, speed: 17,
    livery: { wale: '#7a2a1e', trim: '#e8dcc0', flag: '#7a2a1e', sail: '#e8d8b8' },
    stops: [
      { post: 'gullmouth', name: 'Gullmouth', from: [1809, 586], dir: [1, 0], minLen: 22 },
      { post: 'skua', name: 'Skua Rock' },
      { post: 'inkholm', name: 'Inkholm' },
    ],
  },
  {
    id: 'kittiwake', ship: 'the Kittiwake', kind: 'cog', land: 'morrow', dock: 50, speed: 18, ships: 2,
    livery: { wale: '#1c1c20', trim: '#ece6d6', flag: '#ece6d6' },
    stops: [
      { post: 'saltpenny', name: 'Saltpenny Key', gate: 'saltFerry', refused: 'Saltpenny\'s for those the Assembly sends. Ask at the Assembly.' },
      { post: 'callis', name: 'Callis', from: [8696, 1200], dir: [1, 0] },
      { post: 'coldharbour', name: 'Cold Harbour', gate: 'coldFerry', refused: 'Nobody goes to Cold Harbour without the Assembly\'s say. Not on my ship.' },
    ],
  },
];

/** What the generator worked out for a route: its jetties and the ship's dock at each (by stop), and the way she sails. */
export interface FerryPlan {
  /** Each stop's jetty, shore end to head; where she lies alongside it and which way she points coming in. */
  piers: { from: [number, number]; to: [number, number]; dock: [number, number]; heading: number }[];
  /** Her course from the first stop to the last through every stop's dock, and the index of each stop's dock in it. */
  course: [number, number][];
  at: number[];
}

export const FERRY_PLAN: Record<string, FerryPlan | undefined> = FERRY_PLANS;
/** Every route that has been planned (the generator's run since it was last changed). */
export const FERRIES = FERRY_ROUTES.filter((r) => FERRY_PLAN[r.id]);
/** The routes calling at a Charter Post stop. */
export const ferriesAt = (post: string) => FERRIES.filter((r) => r.stops.some((s) => s.post === post));
