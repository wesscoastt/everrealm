import * as THREE from 'three';
import * as P from './props';
import { mewJetty } from './sites';
import { coastX, SEA } from './terrain';

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
    this.sailing = P.ship(M, 'set', '#2f528f', '#d8b04a');
    this.moored = P.ship(M, 'furled', '#2f528f', '#d8b04a');
    this.hull.add(this.sailing, this.moored);
    this.root.add(this.hull);
    const C = coastX(600), J = mewJetty(), y = SEA + 2 - 2.27;
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
    // A little swell under her
    this.hull.position.y = Math.sin(now * 0.9) * 0.06;
    this.hull.rotation.x = Math.sin(now * 0.7) * (docked ? 0.012 : 0.03);
  }
}
