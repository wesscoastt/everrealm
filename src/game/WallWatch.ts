import * as THREE from 'three';
import { GUARD_LOOK } from '../data/content/verandahCourt';
import { Humanoid } from '../entities/humanoid';
import type { VoxelWorld } from '../world/VoxelWorld';

// The watch on Verandah's walls (owner 2026-11-06: "have guards patrolling the Verandah city walls"): two of the
// King's Guard walking the wall-walk of the owner's walls, along the north wall from its west end to the corner
// tower and down the east wall to where it turns, and back, one well behind the other. Kept by the real clock,
// as the riders are (game/VerandahPatrols.ts), so everyone sees them in the same place; drawn while you're near.

/** The wall-walk (game x, the walk's floor, z): the north wall at 40, the east wall at 41. */
const ROUTE: [number, number, number][] = [[-3026.5, 40, 1963.5], [-2857.5, 40, 1963.5], [-2856.5, 41, 1965.5], [-2856.5, 41, 2106.5]];
const SPEED = 1.3;
const GAP = 140;

export class WallWatch {
  private men: { man: Humanoid; shown: boolean }[] = [];
  private cum: number[] = [0];

  constructor(private scene: THREE.Scene, private voxels: VoxelWorld) {
    for (let i = 1; i < ROUTE.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][2] - ROUTE[i - 1][2]));
  }

  private at(s: number): { x: number; y: number; z: number; yaw: number } {
    const L = this.cum[this.cum.length - 1], m = ((s % (2 * L)) + 2 * L) % (2 * L), back = m > L, d = back ? 2 * L - m : m;
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < d) i++;
    const a = ROUTE[i - 1], b = ROUTE[i], t = (d - this.cum[i - 1]) / Math.max(0.01, this.cum[i] - this.cum[i - 1]);
    const dx = b[0] - a[0], dz = b[2] - a[2];
    return { x: a[0] + dx * t, y: a[1] + (b[1] - a[1]) * t, z: a[2] + dz * t, yaw: Math.atan2(back ? -dx : dx, back ? -dz : dz) };
  }

  update(dt: number, P: THREE.Vector3): void {
    if (!this.men.length) for (let k = 0; k < 2; k++) {
      const man = new Humanoid({ ...GUARD_LOOK, skin: k ? '#d8a888' : '#c88a62', hair: k ? '#4a2a1e' : '#1e1a16' });
      man.setHeld('sword');
      man.setState('walk');
      this.men.push({ man, shown: false });
    }
    const s0 = (Date.now() / 1000) * SPEED;
    this.men.forEach((g, k) => {
      const p = this.at(s0 - k * GAP);
      const near = Math.hypot(p.x - P.x, p.z - P.z) < 120 && this.voxels.isLoaded(p.x, p.z);
      if (near !== g.shown) { if (near) this.scene.add(g.man.root); else this.scene.remove(g.man.root); g.shown = near; }
      if (!near) return;
      // on the walk itself, never down to the street below it
      const y = this.voxels.groundBelow(p.x, p.y + 1.4, p.z);
      g.man.root.position.set(p.x, Math.abs(y - p.y) < 2 ? y : p.y, p.z);
      g.man.root.rotation.y = p.yaw;
      g.man.update(dt, SPEED);
    });
  }
}
