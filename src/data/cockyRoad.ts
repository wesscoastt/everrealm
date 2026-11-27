// Cocky Road (owner 2026-11-27, docs/briefs/cocky-road.md): the old drove road north of Hollin Ford, where the Henwife
// turns you into a cockerel and sets you on it. Shared by the world's builder (world/sites.ts buildCockyRoad: the lanes
// are real ground) and the minigame (game/CockyRoad.ts: the traffic on them, drawn only while someone plays).
//
// The road runs east from START. Each lane is one block across in x and spans the road's width in z (HALF either side
// of Z). Lane 0 is the first grass you're set down on; lane LANES - 1 is the far gate.

export const COCKY = { x: 141, z: 100, half: 6, lanes: 150 };
/** Where the Henwife's cottage stands, west of the road's start, and where you're set down when the curse lifts. */
export const HENWIFE = { x: 128, z: 108 };
export const COCKY_BACK = { x: 134.5, z: 100.5 };

export type LaneKind = 'grass' | 'road' | 'river';
export interface Lane {
  kind: LaneKind;
  /** On grass: the z of each hay bale or stump in the way (blocks you can't hop into). */
  blocks?: number[];
  /** On a road or river: which way its traffic goes (+1 north to south, -1 back), and how fast it is at its gentlest. */
  dir?: 1 | -1;
  speed?: number;
}

/** A small seeded random, so the builder and the game lay out the same road. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * The road, lane by lane. Runs of grass, roads and rivers, the runs getting longer and the traffic quicker the further
 * east you go, so it starts gentle and ends hard. Never two rivers without grass or a road between, so there's always
 * somewhere to stand; never a grass lane that can't be crossed.
 */
export const LANES: Lane[] = (() => {
  const r = rng(271828), out: Lane[] = [];
  const grass = (n: number, sparse = false) => {
    for (let i = 0; i < n; i++) {
      const blocks: number[] = [];
      const count = sparse ? 0 : Math.floor(r() * 4);
      for (let k = 0; k < count; k++) { const z = Math.round(-COCKY.half + r() * (COCKY.half * 2)); if (!blocks.includes(z) && blocks.length < COCKY.half * 2 - 2) blocks.push(z); }
      out.push({ kind: 'grass', blocks });
    }
  };
  grass(4, true);
  let lastRiver = false;
  while (out.length < COCKY.lanes - 3) {
    const far = out.length / COCKY.lanes; // 0 at the start, 1 at the gate
    const roll = r();
    if (roll < 0.42) {
      const n = 1 + Math.floor(r() * (1 + far * 4));
      for (let i = 0; i < n; i++) out.push({ kind: 'road', dir: r() < 0.5 ? 1 : -1, speed: 2.2 + far * 4.5 + r() * 1.5 });
      lastRiver = false;
    } else if (roll < 0.72 && !lastRiver && out.length > 8) {
      const n = 1 + Math.floor(r() * (1 + far * 3));
      let dir: 1 | -1 = r() < 0.5 ? 1 : -1;
      for (let i = 0; i < n; i++) { out.push({ kind: 'river', dir, speed: 1.4 + far * 2.2 + r() * 0.8 }); dir = dir === 1 ? -1 : 1; }
      lastRiver = true;
    } else {
      grass(1 + Math.floor(r() * 2));
      lastRiver = false;
    }
  }
  while (out.length < COCKY.lanes - 1) grass(1, true);
  out.push({ kind: 'grass', blocks: [] }); // the far gate
  return out.slice(0, COCKY.lanes);
})();

/** The furthest you've got, and the score at which each of the Henwife's tasks is done. */
export const COCKY_GOALS = { first: 20, half: 75, gate: COCKY.lanes - 1 };
