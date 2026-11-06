import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { GUARD_LOOK } from '../data/content/verandahCourt';
import { mountModel, type CreatureModel } from '../entities/creatures';
import { Humanoid } from '../entities/humanoid';
import { riderLift, riderPose } from '../entities/seats';
import type { VoxelWorld } from '../world/VoxelWorld';

// Verandah's mounted guard (owner 2026-11-05: "guardsmen, some on horses patrolling"): two riders of the town
// guard on the island's black horses, at a walk, out from the Charter yard by the stables, along the road north,
// east to the main street, down it to the high street and into the town, and back again; one a few lengths
// behind the other. Their round is kept by the real clock, so everyone sees them in the same place. Drawn while
// you're near (as the Charter yards' carts are: game/PostStations.ts).

/** The round, on the roads (game x, z). */
const ROUTE: [number, number][] = [[-3290, 2054], [-3288, 2040], [-3288, 2028], [-3220, 2028], [-3132, 2028], [-3132, 2080], [-3132, 2130], [-3060, 2131], [-2985, 2131]];
const SPEED = 2.2;
const BEHIND = 5;

interface Rider { horse: CreatureModel; man: Humanoid; shown: boolean }

export class VerandahPatrols {
  private riders: Rider[] = [];
  private cum: number[] = [0];

  constructor(private scene: THREE.Scene, private voxels: VoxelWorld) {
    for (let i = 1; i < ROUTE.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1]));
  }

  /** Where along the round, at a distance s (it runs out and back). */
  private at(s: number): { x: number; z: number; yaw: number } {
    const L = this.cum[this.cum.length - 1], m = ((s % (2 * L)) + 2 * L) % (2 * L), back = m > L, d = back ? 2 * L - m : m;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = ROUTE[i - 1], b = ROUTE[i], t = (d - this.cum[i - 1]) / Math.max(0.01, this.cum[i] - this.cum[i - 1]);
    const dx = b[0] - a[0], dz = b[1] - a[1];
    return { x: a[0] + dx * t, z: a[1] + dz * t, yaw: Math.atan2(back ? -dx : dx, back ? -dz : dz) };
  }

  /** Where the riders are, for their name plates (owner 2026-11-06: "the ones riding horses: Verandah Conscript"). */
  plates(): { x: number; y: number; z: number; name: string; sub: string }[] {
    return this.riders.filter((r) => r.shown).map((r) => ({ x: r.man.root.position.x, y: r.man.root.position.y + 2.2, z: r.man.root.position.z, name: 'Verandah Conscript', sub: 'On patrol' }));
  }

  update(dt: number, P: THREE.Vector3): void {
    const s0 = (Date.now() / 1000) * SPEED;
    if (!this.riders.length) {
      const look = ITEMS.halter_ver_black?.mount;
      for (let k = 0; k < 2; k++) {
        const horse = mountModel({ ...(look ?? { coat: '#141012', mane: '#0a0808' }), cloth: '#22365a' });
        const man = new Humanoid({ ...GUARD_LOOK, skin: k ? '#e2b894' : '#c88a62', hair: k ? '#c88a3a' : '#2a1e14' });
        man.setState(riderPose(look));
        horse.setAnim('walk');
        this.riders.push({ horse, man, shown: false });
      }
    }
    this.riders.forEach((r, k) => {
      const p = this.at(s0 - k * BEHIND);
      const near = Math.hypot(p.x - P.x, p.z - P.z) < 140 && this.voxels.isLoaded(p.x, p.z);
      if (near !== r.shown) { if (near) this.scene.add(r.horse.root, r.man.root); else this.scene.remove(r.horse.root, r.man.root); r.shown = near; }
      if (!near) return;
      const y = this.voxels.groundBelow(p.x, 60, p.z);
      r.horse.root.position.set(p.x, y, p.z);
      r.horse.root.rotation.y = p.yaw;
      r.man.root.position.set(p.x, y + riderLift(ITEMS.halter_ver_black?.mount), p.z);
      r.man.root.rotation.y = p.yaw;
      r.horse.update(dt, SPEED);
      r.man.update(dt, 0);
    });
  }
}
