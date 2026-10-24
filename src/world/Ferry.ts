import * as THREE from 'three';
import type * as P from './props';
import { mewJetty } from './sites';
import { coastX, SEA } from './terrain';
import { deckAt, hullHalf, shipModel, SHIPS } from './ships';

const KIND = 'cog' as const;
/** The cog's castles (her frame): stern and bow, from x to x, standing this high over the deck. */
const CASTLES: [number, number, number][] = [[-SHIPS.cog.len / 2 + 0.3, -SHIPS.cog.len / 2 + 3.6, 1.8], [SHIPS.cog.len / 2 - 3.4, SHIPS.cog.len / 2 - 0.8, 1.4]];

// The Mewstones ferry: a two-master on a timetable between Gullmouth's south jetty and the
// Mewstones' jetty. Where she is comes from the realm clock, so everyone sees her in the same place.
// She sails a loop and never turns on the spot: alongside the head of each jetty for a minute, out on
// the southern course, home on the northern one round the breakwater's end.

const DOCK = 60, SAIL = 90, ROUND = 2 * (DOCK + SAIL);

const ease = (s: number) => { const k = Math.min(1, Math.max(0, s)); return k * k * (3 - 2 * k); };
/** The ship's bow is +x: the turn that points it along (dx, dz). */
const heading = (v: THREE.Vector3) => Math.atan2(-v.z, v.x);

export class Ferry {
  readonly root = new THREE.Group();
  private readonly hull = new THREE.Group();
  private readonly sailing: THREE.Group;
  private readonly moored: THREE.Group;
  private readonly path: THREE.CatmullRomCurve3;
  /** Where on the loop (0..1 by distance) she lies at the Mewstones; Gullmouth is 0. */
  private readonly uMew: number;
  private readonly tan = new THREE.Vector3();

  constructor(M: P.PropMaterials) {
    this.sailing = shipModel(M, KIND, { sails: 'set', wale: '#2f528f', trim: '#d8b04a', flag: '#d8b04a' });
    this.moored = shipModel(M, KIND, { sails: 'furled', wale: '#2f528f', trim: '#d8b04a', flag: '#d8b04a' });
    this.hull.add(this.sailing, this.moored);
    this.root.add(this.hull);
    // (her deck on a whole block's height, so a walker stands on it as on any floor)
    const C = coastX(600), J = mewJetty(), y = Math.round(SEA + SHIPS[KIND].deck) - SHIPS[KIND].deck;
    // Gullmouth: off the south jetty's head heading south. The Mewstones: off their jetty's head heading north.
    const gull: [number, number] = [C + 38, 607], mew: [number, number] = [J.x1 - 5, J.z + 1];
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

  /** Puts her where the timetable says for this moment (seconds on the realm clock). */
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
    this.sailing.visible = !docked;
    this.moored.visible = docked;
    // A little swell under her (only to look at: her deck stays where you stand on it)
    this.hull.position.y = Math.sin(now * 0.9) * 0.06;
    this.hull.rotation.x = Math.sin(now * 0.7) * (docked ? 0.012 : 0.03);
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
    if (ly < S.deck + 0.95 && (end || Math.abs(lz) > hw - 0.3 - half)) return true;
    return CASTLES.some(([a, b, h]) => lx > a - half && lx < b + half && ly < S.deck + h);
  }

  /** Whether a body (feet at p, half its width, this tall) runs into her. */
  blocks(px: number, py: number, pz: number, half: number, height: number): boolean {
    if (Math.abs(px - this.root.position.x) > 18 || Math.abs(pz - this.root.position.z) > 18) return false;
    for (const dy of [0.05, height * 0.5, height - 0.05]) {
      const v = this._v.set(px, py + dy, pz).applyMatrix4(this.inv);
      if (this.solidLocal(v.x, v.y, v.z, half)) return true;
    }
    return false;
  }

  /**
   * Someone standing on her deck goes where she goes: where they are now (by how far she's moved and
   * turned since the last frame) and the turn to add to their heading; null if they're not aboard.
   */
  carry(p: THREE.Vector3, onGround: boolean): { pos: THREE.Vector3; turn: number } | null {
    const m = this.root.matrixWorld;
    let out: { pos: THREE.Vector3; turn: number } | null = null;
    if (this.hasPrev && onGround && Math.abs(p.x - this.root.position.x) < 18 && Math.abs(p.z - this.root.position.z) < 18) {
      const local = this._v.copy(p).applyMatrix4(this._m.copy(this.prev).invert());
      const d = deckAt(KIND, local.x, local.z);
      if (d !== null && Math.abs(local.y - d) < 0.25) out = { pos: local.applyMatrix4(m).clone(), turn: this.root.rotation.y - this.prevYaw };
    }
    this.prev.copy(m);
    this.prevYaw = this.root.rotation.y;
    this.hasPrev = true;
    return out;
  }
}
