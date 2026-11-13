import { BEND, DOWNS, POST_AT, RACE_MS, STABLE, STRAIGHT, T_OFF, T_PARADE, T_STALLS, type Runner } from '../data/races';

// The races at Amberwold Downs worked out from the realm clock (data/races.ts): which six go to post, their odds,
// and every horse's place on the course at every moment, the same on every player's screen. Pure: nothing
// here draws, pays or talks to the realm.

/** A small seeded generator, so a race is the same wherever it's worked out. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The course's length round, along the middle of the track. */
export const LAP = 4 * STRAIGHT + 2 * Math.PI * BEND;
/** Where the stalls stand: halfway down the back straight. */
export const START_AT = 2 * STRAIGHT + Math.PI * BEND + STRAIGHT;
/** The trip: from the stalls once round and on to the post. */
export const TRIP = LAP + ((POST_AT - START_AT + LAP) % LAP);
const STEP = 0.25;

/**
 * A point on the course: s along it from the start of the home straight (which runs east, in front of the stand on
 * the south side), out from the middle of the track by off. Returns where, and the way it faces.
 */
export function coursePoint(s: number, off = 0): { x: number; z: number; yaw: number } {
  const A = STRAIGHT, R = BEND + off, L = LAP;
  let u = ((s % L) + L) % L;
  const cx = DOWNS.x, cz = DOWNS.z, arc = Math.PI * BEND;
  if (u < 2 * A) return { x: cx - A + u, z: cz + R, yaw: Math.PI / 2 };
  u -= 2 * A;
  if (u < arc) { const th = (u / arc) * Math.PI; return { x: cx + A + R * Math.sin(th), z: cz + R * Math.cos(th), yaw: Math.PI / 2 - th }; }
  u -= arc;
  if (u < 2 * A) return { x: cx + A - u, z: cz - R, yaw: -Math.PI / 2 };
  u -= 2 * A;
  const th = (u / arc) * Math.PI;
  return { x: cx - A - R * Math.sin(th), z: cz - R * Math.cos(th), yaw: -Math.PI / 2 - th };
}

/** Which race the clock is on, and how far into its six minutes (seconds). */
export function raceNow(now: number): { k: number; t: number } { return { k: Math.floor(now / RACE_MS), t: (now % RACE_MS) / 1000 }; }
/** When race k goes off (ms of realm time). */
export const offAt = (k: number): number => k * RACE_MS + T_OFF * 1000;

const ODDS: [number, string][] = [[1.5, '1 to 2'], [1.67, '4 to 6'], [1.8, '4 to 5'], [2, 'evens'], [2.2, '6 to 5'], [2.5, '6 to 4'], [2.75, '7 to 4'], [3, '2 to 1'], [3.5, '5 to 2'], [4, '3 to 1'],
  [4.5, '7 to 2'], [5, '4 to 1'], [6, '5 to 1'], [7, '6 to 1'], [8, '7 to 1'], [9, '8 to 1'], [11, '10 to 1'], [13, '12 to 1'], [15, '14 to 1'], [17, '16 to 1'], [21, '20 to 1'], [26, '25 to 1'], [34, '33 to 1']];

export interface Field {
  k: number;
  runners: Runner[];
  /** Each runner's odds: what a mark returns if it wins (the mark included), and as the board writes it. */
  price: number[];
  odds: string[];
}

const fields = new Map<number, Field>();
/** The six who go to post in race k, and the book's prices on them. */
export function fieldFor(k: number): Field {
  const hit = fields.get(k);
  if (hit) return hit;
  const r = rng(k * 7919 + 17);
  const pool = STABLE.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const runners = pool.slice(0, 6);
  // The book: each runner's chance, from the field run three hundred times over (the bookmaker's eye), with his eighth
  // on top, written as the nearest price on the board
  const won = runners.map(() => 1);
  for (let j = 0; j < 300; j++) won[simulate(runners, k * 7 + j * 7741 + 999).order[0]]++;
  const sum = won.reduce((a, b) => a + b, 0);
  const price: number[] = [], odds: string[] = [];
  for (const wi of won) {
    const fair = sum / wi, want = fair / 1.12;
    let best = ODDS[0];
    for (const o of ODDS) if (Math.abs(Math.log(o[0] / want)) < Math.abs(Math.log(best[0] / want))) best = o;
    price.push(best[0]); odds.push(best[1]);
  }
  const f = { k, runners, price, odds };
  fields.set(k, f);
  if (fields.size > 12) fields.delete(fields.keys().next().value!);
  return f;
}

export interface RaceRun {
  /** Each runner's distance run, every quarter second from the off. */
  dist: Float32Array[];
  /** Each runner's time to the post, and the order they passed it (indexes into the field). */
  time: number[];
  order: number[];
}

const runs = new Map<number, RaceRun>();
/** Race k run through, start to finish (the same every time it's asked). */
export function runRace(k: number): RaceRun {
  const hit = runs.get(k);
  if (hit) return hit;
  const run = simulate(fieldFor(k).runners, k * 104729 + 3);
  runs.set(k, run);
  if (runs.size > 12) runs.delete(runs.keys().next().value!);
  return run;
}

/** A field run through on one seed. */
function simulate(runners: Runner[], seed: number): RaceRun {
  const r = rng(seed);
  const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return (s - 2) * 1.22; };
  const dist: Float32Array[] = [], time: number[] = [];
  const steps = Math.ceil(70 / STEP);
  for (const h of runners) {
    const d = new Float32Array(steps);
    const base = 13.4 + (h.rating - 75) * 0.04, day = gauss() * 0.7;
    let x = 0, drift = 0, fin = Infinity;
    for (let i = 0; i < steps; i++) {
      const t = i * STEP, frac = x / TRIP;
      drift = drift * 0.94 + gauss() * 0.09;
      // Away from the stalls (a few strides to full speed), early pace, the long middle, then the run for home
      const jump = Math.min(1, t / 2.2);
      let v = base + day + drift;
      if (frac < 0.3) v += (h.pace - 0.5) * 1.5;
      else if (frac > 0.72) v += (h.stamina - 0.5) * 2.1 + (frac > 0.9 ? 0.3 : 0);
      v *= jump;
      d[i] = x;
      if (x >= TRIP && fin === Infinity) fin = t - (x - TRIP) / Math.max(1, v);
      // Pulled up past the post
      x += (x > TRIP ? Math.max(1.5, v * Math.max(0, 1 - (x - TRIP) / 40)) : v) * STEP;
    }
    dist.push(d); time.push(fin);
  }
  const order = time.map((t, i) => [t, i]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  return { dist, time, order };
}

export interface HorseAt { s: number; lane: number; speed: number; gait: 'idle' | 'walk' | 'run' }

/** Where each of race k's runners is, t seconds into its six minutes. */
export function horsesAt(k: number, t: number): HorseAt[] {
  const f = fieldFor(k);
  return f.runners.map((_, i) => {
    const lane = i;
    if (t < T_PARADE) return { s: POST_AT - 4 - i * 3, lane, speed: 0, gait: 'idle' };
    if (t < T_STALLS) {
      // Down to the start at a walk, in single file
      const walk = (START_AT - POST_AT + LAP) % LAP, u = Math.min(1, (t - T_PARADE) / (T_STALLS - T_PARADE - 6));
      return { s: POST_AT - 4 - i * 3 + u * (walk + 4 + i * 3), lane, speed: u < 1 ? 1.6 : 0, gait: u < 1 ? 'walk' : 'idle' };
    }
    if (t < T_OFF) return { s: START_AT, lane, speed: 0, gait: 'idle' };
    const run = runRace(k), d = run.dist[i], q = (t - T_OFF) / STEP, a = Math.min(d.length - 1, Math.floor(q)), b = Math.min(d.length - 1, a + 1);
    const x = d[a] + (d[b] - d[a]) * (q - a), speed = (d[b] - d[a]) / STEP;
    return { s: START_AT + x, lane, speed, gait: speed > 6 ? 'run' : speed > 0.4 ? 'walk' : 'idle' };
  });
}

/** The race's state for the stand and the board. */
export function racePhase(t: number): 'parade' | 'down' | 'stalls' | 'running' | 'over' {
  if (t < T_PARADE) return 'parade';
  if (t < T_STALLS) return 'down';
  if (t < T_OFF) return 'stalls';
  return t < T_OFF + 75 ? 'running' : 'over';
}
