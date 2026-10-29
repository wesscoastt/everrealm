import * as THREE from 'three';
import type * as P from './props';
import { mewJetty } from './sites';
import { coastX, SEA } from './terrain';
import { deckAt, hullHalf, shipModel, SHIPS } from './ships';
import type { FerryPlan, FerryRoute } from '../data/ferries';

const KIND = 'cog' as const;
/** The cog's castles (her frame): stern and bow, from x to x, standing this high over the deck. */
const CASTLES: [number, number, number][] = [[-SHIPS.cog.len / 2 + 0.3, -SHIPS.cog.len / 2 + 3.6, 1.8], [SHIPS.cog.len / 2 - 3.4, SHIPS.cog.len / 2 - 0.8, 1.4]];
/** Her deck on a whole block's height, so a walker stands on it as on any floor. */
const DECK_Y = Math.round(SEA + SHIPS[KIND].deck) - SHIPS[KIND].deck;

const ease = (s: number) => { const k = Math.min(1, Math.max(0, s)); return k * k * (3 - 2 * k); };
/** The ship's bow is +x: the turn that points it along (dx, dz). */
const heading = (v: THREE.Vector3) => Math.atan2(-v.z, v.x);

/**
 * A ship you can walk aboard while she sails: her hull is solid to walkers (below the deck, the
 * bulwarks with a gangway amidships either side, the castles), and anyone over her deck goes where she
 * goes. The ferries (below) put her where their timetables say.
 */
export abstract class Boardable {
  readonly root = new THREE.Group();
  protected readonly hull = new THREE.Group();
  protected readonly sailing: THREE.Group;
  protected readonly moored: THREE.Group;

  constructor(M: P.PropMaterials, livery: { wale: string; trim: string; flag: string; sail?: string; name?: string }) {
    this.sailing = shipModel(M, KIND, { sails: 'set', ...livery });
    this.moored = shipModel(M, KIND, { sails: 'furled', ...livery });
    this.hull.add(this.sailing, this.moored);
    this.root.add(this.hull);
  }

  /** Puts her where she is at this moment (seconds on the realm clock). */
  abstract update(now: number): void;

  /** After she's placed: under sail or alongside, a little swell, and her frame for the walkers. */
  protected settle(now: number, docked: boolean): void {
    this.sailing.visible = !docked;
    this.moored.visible = docked;
    // A little swell under her (only to look at: her deck stays where you stand on it, so it's kept small
    // enough that nobody standing there seems to sink into the boards and rise out of them)
    this.hull.position.y = Math.sin(now * 0.9) * 0.025;
    this.hull.rotation.x = Math.sin(now * 0.7) * (docked ? 0.005 : 0.012);
    this.root.updateMatrixWorld(true);
    this.inv.copy(this.root.matrixWorld).invert();
  }

  private readonly inv = new THREE.Matrix4();
  private readonly prev = new THREE.Matrix4();
  private prevYaw = 0;
  private hasPrev = false;
  private readonly _v = new THREE.Vector3();
  private readonly _m = new THREE.Matrix4();

  /** Whether her hull is solid at a point in her own frame: below the deck, the bulwarks, the castles. */
  private solidLocal(lx: number, ly: number, lz: number, half: number): boolean {
    const hw = hullHalf(KIND, lx), S = SHIPS[KIND];
    if (hw < 0 || ly < -S.draft - 0.3 || Math.abs(lz) > hw + half) return false;
    if (ly < S.deck) return true;
    const end = Math.abs(lx) > S.len / 2 - 0.5;
    // The bulwarks, with a gangway through them amidships on either side to step aboard from a jetty
    if (ly < S.deck + 0.95 && (end || (Math.abs(lz) > hw - 0.3 - half && Math.abs(lx) > 1.2))) return true;
    return CASTLES.some(([a, b, h]) => lx > a - half && lx < b + half && ly < S.deck + h);
  }

  /** Whether a body (feet at p, half its width, this tall) runs into her. */
  blocks(px: number, py: number, pz: number, half: number, height: number): boolean {
    if (!this.root.visible || Math.abs(px - this.root.position.x) > 18 || Math.abs(pz - this.root.position.z) > 18) return false;
    // (feet a hair above the soles: standing on her deck the boards must count as underfoot, so the
    // "still on the ground" test a few hundredths lower finds them; at 0.05 it missed, and a walker
    // flickered between standing and falling the whole crossing)
    for (const dy of [0.01, height * 0.5, height - 0.05]) {
      const v = this._v.set(px, py + dy, pz).applyMatrix4(this.inv);
      if (this.solidLocal(v.x, v.y, v.z, half)) return true;
    }
    return false;
  }

  /** Is a point over her deck (standing on it, or in the air above it)? */
  aboard(p: THREE.Vector3): boolean {
    if (Math.abs(p.x - this.root.position.x) > 18 || Math.abs(p.z - this.root.position.z) > 18) return false;
    const local = this._v.copy(p).applyMatrix4(this.inv), d = deckAt(KIND, local.x, local.z);
    return d !== null && local.y > d - 0.3 && local.y < d + 3.5;
  }

  /**
   * Someone standing on her deck goes where she goes: where they are now (by how far she's moved and
   * turned since the last frame) and the turn to add to their heading; null if they're not aboard.
   */
  carry(p: THREE.Vector3, onGround: boolean): { pos: THREE.Vector3; turn: number } | null {
    const m = this.root.matrixWorld;
    let out: { pos: THREE.Vector3; turn: number } | null = null;
    if (this.hasPrev && Math.abs(p.x - this.root.position.x) < 18 && Math.abs(p.z - this.root.position.z) < 18) {
      const local = this._v.copy(p).applyMatrix4(this._m.copy(this.prev).invert());
      const d = deckAt(KIND, local.x, local.z);
      // On her deck, or in the air over it (a jump, a stumble off a coil): you go with her either way, as
      // on any ship; stepping off her side is the only way off
      const over = d !== null && (onGround ? Math.abs(local.y - d) < 0.25 : local.y > d - 0.3 && local.y < d + 3.5);
      if (over) out = { pos: local.applyMatrix4(m).clone(), turn: this.root.rotation.y - this.prevYaw };
    }
    this.prev.copy(m);
    this.prevYaw = this.root.rotation.y;
    this.hasPrev = true;
    return out;
  }
}

// The Mewstones ferry: a two-master on a timetable between Gullmouth's south jetty and the
// Mewstones' jetty. Where she is comes from the realm clock, so everyone sees her in the same place.
// She sails a loop and never turns on the spot: alongside the head of each jetty for a minute, out on
// the southern course, home on the northern one round the breakwater's end.

const DOCK = 60, SAIL = 90, ROUND = 2 * (DOCK + SAIL);

export class Ferry extends Boardable {
  private readonly path: THREE.CatmullRomCurve3;
  /** Where on the loop (0..1 by distance) she lies at the Mewstones; Gullmouth is 0. */
  private readonly uMew: number;
  private readonly tan = new THREE.Vector3();

  constructor(M: P.PropMaterials) {
    super(M, { wale: '#2f528f', trim: '#d8b04a', flag: '#d8b04a' });
    const C = coastX(600), J = mewJetty(), y = DECK_Y;
    // Gullmouth: off the south jetty's head heading south. The Mewstones: off their jetty's head heading north.
    // (at the Mewstones she lies right alongside the jetty's end, her side a stride from its boards)
    const gull: [number, number] = [C + 38, 607], mew: [number, number] = [J.x1 - 3, J.z + 1];
    const pts: [number, number][] = [
      gull, [C + 58, 618], [1900, 628], [2000, 690], [2120, 740], [2215, 785], [J.x1 - 34, J.z + 30],
      mew, [J.x1 - 14, J.z - 42], [2150, 648], [1990, 618], [C + 70, 606], [C + 50, 600],
    ];
    this.path = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)), true, 'centripetal');
    // Find the Mewstones berth's place along the loop
    let best = 0, bd = Infinity;
    const p = new THREE.Vector3(mew[0], y, mew[1]);
    for (let i = 0; i <= 2000; i++) { const d = this.path.getPointAt(i / 2000).distanceTo(p); if (d < bd) { bd = d; best = i / 2000; } }
    this.uMew = best;
  }

  update(now: number): void {
    const t = ((now % ROUND) + ROUND) % ROUND;
    let u: number;
    const docked = t < DOCK || (t >= DOCK + SAIL && t < 2 * DOCK + SAIL);
    if (t < DOCK) u = 0;
    else if (t < DOCK + SAIL) u = this.uMew * ease((t - DOCK) / SAIL);
    else if (t < 2 * DOCK + SAIL) u = this.uMew;
    else u = this.uMew + (1 - this.uMew) * ease((t - 2 * DOCK - SAIL) / SAIL);
    u = u % 1;
    this.root.position.copy(this.path.getPointAt(u));
    this.root.rotation.y = heading(this.path.getTangentAt(u, this.tan));
    this.settle(now, docked);
  }
}

// The scheduled ferries (data/ferries.ts): each sails her route out to its last stop and back, calling at
// every stop in turn and lying alongside its jetty for a while. At either end of the run she's warped
// round at the jetty, so she leaves bow first the way she came.

/** How long the swing round takes at the end of a run. */
const SWING = 20;

/** A stretch of her timetable: alongside a stop, or under way from one stop to the next. */
type Spell = { kind: 'dock'; stop: number; t0: number; t1: number; dir: 1 | -1; swing: boolean } | { kind: 'sail'; from: number; to: number; t0: number; t1: number };

/** Where she is in her timetable: alongside (and how long till she sails, and for where) or under way. */
export interface FerryState { docked: number | null; from: number; to: number; /** Seconds till she sails (alongside) or comes in (under way). */ left: number; spell: number }

export class ScheduledShip extends Boardable {
  private readonly path: THREE.CatmullRomCurve3;
  /** Each stop's place along her course (0..1 by distance). */
  private readonly stopU: number[];
  private readonly spells: Spell[] = [];
  /** A round: there and back, alongside at every stop. */
  readonly round: number;
  private readonly tan = new THREE.Vector3();

  constructor(M: P.PropMaterials, readonly route: FerryRoute, readonly plan: FerryPlan, private readonly offset = 0) {
    super(M, { ...route.livery, name: route.ship.replace(/^the /, '').toUpperCase() });
    this.path = new THREE.CatmullRomCurve3(plan.course.map(([x, z]) => new THREE.Vector3(x, DECK_Y, z)), false, 'centripetal');
    const total = this.path.getLength();
    this.stopU = plan.at.map((i) => {
      const p = new THREE.Vector3(plan.course[i][0], DECK_Y, plan.course[i][1]);
      let best = 0, bd = Infinity;
      for (let k = 0; k <= 4000; k++) { const d = this.path.getPointAt(k / 4000).distanceTo(p); if (d < bd) { bd = d; best = k / 4000; } }
      return best;
    });
    // Out to the last stop and back: alongside each, under way between
    const n = route.stops.length, order = [...Array(n).keys(), ...Array.from({ length: n - 2 }, (_, i) => n - 2 - i)];
    let t = 0;
    order.forEach((stop, i) => {
      const next = order[(i + 1) % order.length];
      // (dir: the way she leaves along her course; at either end she came in the other way)
      const dir: 1 | -1 = this.stopU[next] >= this.stopU[stop] ? 1 : -1;
      this.spells.push({ kind: 'dock', stop, t0: t, t1: t + route.dock, dir, swing: stop === 0 || stop === n - 1 });
      t += route.dock;
      const len = Math.abs(this.stopU[next] - this.stopU[stop]) * total;
      this.spells.push({ kind: 'sail', from: stop, to: next, t0: t, t1: t + len / route.speed });
      t += len / route.speed;
    });
    this.round = t;
  }

  /** Where she is in her timetable at a moment. */
  state(now: number): FerryState {
    const t = (((now + this.offset) % this.round) + this.round) % this.round;
    const i = this.spells.findIndex((s) => t >= s.t0 && t < s.t1), s = this.spells[Math.max(0, i)];
    if (s.kind === 'dock') {
      const next = this.spells[(i + 1) % this.spells.length] as Extract<Spell, { kind: 'sail' }>;
      return { docked: s.stop, from: s.stop, to: next.to, left: s.t1 - t, spell: i };
    }
    return { docked: null, from: s.from, to: s.to, left: s.t1 - t, spell: i };
  }

  /** How long till she next sails from a stop (0 if she's alongside it now), and where she's bound then. */
  nextFrom(stop: number, now: number): { wait: number; to: number; alongside: boolean } {
    const t = (((now + this.offset) % this.round) + this.round) % this.round;
    let best: { wait: number; to: number; alongside: boolean } | null = null;
    this.spells.forEach((s, i) => {
      if (s.kind !== 'dock' || s.stop !== stop) return;
      const next = this.spells[(i + 1) % this.spells.length] as Extract<Spell, { kind: 'sail' }>;
      const alongside = t >= s.t0 && t < s.t1;
      const wait = alongside ? 0 : (((s.t0 - t) % this.round) + this.round) % this.round;
      if (!best || wait < best.wait) best = { wait: alongside ? s.t1 - t : wait, to: next.to, alongside };
    });
    return best ?? { wait: 0, to: stop, alongside: false };
  }

  update(now: number): void {
    const t = (((now + this.offset) % this.round) + this.round) % this.round;
    const s = this.spells.find((x) => t >= x.t0 && t < x.t1) ?? this.spells[0];
    let u: number, docked = false;
    if (s.kind === 'dock') {
      u = this.stopU[s.stop];
      docked = true;
      // Warped round at the end of a run: she came in one way and goes out the other
      const k = s.swing ? ease((t - s.t0) / SWING) : 1;
      this.path.getTangentAt(u, this.tan);
      const yIn = heading(this.tan.clone().multiplyScalar(-s.dir)), yOut = heading(this.tan.clone().multiplyScalar(s.dir));
      let dy = yOut - yIn;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.root.position.copy(this.path.getPointAt(u));
      this.root.rotation.y = s.swing ? yIn + dy * k : yOut;
    } else {
      const a = this.stopU[s.from], b = this.stopU[s.to];
      u = a + (b - a) * ease((t - s.t0) / (s.t1 - s.t0));
      this.path.getTangentAt(Math.min(1, Math.max(0, u)), this.tan);
      if (b < a) this.tan.multiplyScalar(-1);
      this.root.position.copy(this.path.getPointAt(Math.min(1, Math.max(0, u))));
      this.root.rotation.y = heading(this.tan);
    }
    this.settle(now, docked);
  }
}
