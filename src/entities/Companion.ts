import * as THREE from 'three';
import { PETS } from '../data/pets';
import { CreatureModel } from './creatures';

/**
 * A pet at someone's heels (data/pets.ts): it trots to a spot just behind and beside them, stops
 * when they stop, pecks about while it waits, and catches up at once if they've got far ahead
 * (a ride, a ferry, a door into a cellar). Looks only.
 */
export class Companion {
  readonly model: CreatureModel;
  readonly pos = new THREE.Vector3();
  private yaw = 0;
  private idleT = 0;

  constructor(readonly pet: string, at: THREE.Vector3) {
    const def = PETS[pet];
    this.model = new CreatureModel(def.kind, def.pal);
    this.model.root.scale.multiplyScalar(def.scale);
    this.pos.copy(at);
    this.model.root.position.copy(at);
  }

  /**
   * Follow a leader standing at `at`, facing `yaw`. `ground` says where the feet go at (x, z) near
   * a height, if it knows; otherwise it keeps the leader's height.
   */
  update(dt: number, at: THREE.Vector3, yaw: number, ground?: (x: number, z: number, near: number) => number | null): void {
    // Its spot: a body behind the leader and a little to the left
    const tx = at.x - Math.sin(yaw) * 1.4 + Math.cos(yaw) * 0.8, tz = at.z - Math.cos(yaw) * 1.4 - Math.sin(yaw) * 0.8;
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d > 22 || Math.abs(at.y - this.pos.y) > 6) { this.pos.set(tx, at.y, tz); }
    let speed = 0;
    if (d > 0.6) {
      speed = Math.min(d > 4 ? 9 : 4.5, d * 2.2);
      const step = Math.min(d, speed * dt);
      this.pos.x += (dx / d) * step; this.pos.z += (dz / d) * step;
      const want = Math.atan2(dx, dz);
      let dy = want - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yaw += dy * Math.min(1, dt * 10);
    } else if ((this.idleT -= dt) <= 0) {
      // Waiting: turn about now and then to look at something
      this.idleT = 2 + Math.random() * 4;
      this.yaw += (Math.random() - 0.5) * 2;
    }
    const g = ground?.(this.pos.x, this.pos.z, at.y);
    this.pos.y += ((g ?? at.y) - this.pos.y) * Math.min(1, dt * 12);
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    this.model.setAnim(speed > 5 ? 'run' : speed > 0.2 ? 'walk' : 'idle');
    this.model.update(dt, speed);
  }
}
