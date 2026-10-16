import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';

/** Third-person orbit camera with voxel collision and soft follow. */
export class CameraRig {
  yaw = Math.PI;
  pitch = 0.32;
  /** Highest the camera may sit (under the surface while the player swims under it). */
  ceiling = Infinity;
  distance = 8;
  targetDistance = 8;
  private focus = new THREE.Vector3();
  private shake = 0;
  private tmp = new THREE.Vector3();
  private effPitchDir = new THREE.Vector3(0, 0.3, 1).normalize();
  private closeness = 8;
  /** Current distance from focus to camera, so the game can fade the player when it gets tiny. */
  actualDistance = 8;

  constructor(readonly camera: THREE.PerspectiveCamera, private world: VoxelWorld) {}

  addShake(amount: number): void {
    this.shake = Math.min(0.6, this.shake + amount);
  }

  rotate(dx: number, dy: number): void {
    this.yaw -= dx * 0.0055;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0045, -0.55, 1.35);
  }

  zoom(steps: number): void {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + steps * 1.1, 2.5, 18);
  }

  /** Forward direction on the ground plane. */
  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt: number, target: THREE.Vector3): void {
    const want = this.tmp.set(target.x, target.y + 1.55, target.z);
    const k = 1 - Math.exp(-dt * 12);
    this.focus.lerp(want, this.focus.distanceToSquared(want) > 400 ? 1 : k);
    this.distance += (this.targetDistance - this.distance) * (1 - Math.exp(-dt * 8));

    // Pull in when a block is between the player and the camera. In tight spaces (the Pit),
    // try flatter and steeper angles and use whichever leaves the most room.
    const free = (pitch: number, yawOff: number) => {
      const d = new THREE.Vector3(Math.sin(this.yaw + yawOff) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw + yawOff) * Math.cos(pitch));
      const hit = this.world.raycast(this.focus.x, this.focus.y, this.focus.z, d.x, d.y, d.z, this.distance + 0.4);
      return { d, dist: hit ? Math.max(0.6, hit.distance - 0.35) : this.distance };
    };
    let best = free(this.pitch, 0);
    if (best.dist < Math.min(3, this.distance)) {
      for (const [p, y] of [[0.05, 0], [-0.15, 0], [this.pitch, 0.5], [this.pitch, -0.5], [0.1, 0.9], [0.1, -0.9]] as const) {
        const c = free(p, y);
        if (c.dist > best.dist + 0.4) best = c;
      }
    }
    this.effPitchDir.lerp(best.d, 1 - Math.exp(-dt * 10)).normalize();
    const dir = this.effPitchDir;
    this.closeness += ((best.dist) - this.closeness) * Math.min(1, dt * 12);
    const dist = Math.min(best.dist, this.closeness + 0.5);
    const pos = this.camera.position.copy(this.focus).addScaledVector(dir, dist);
    this.actualDistance = dist;
    // Never dip below the terrain surface at the camera position.
    const floor = this.world.groundBelow(pos.x, pos.y + 0.5, pos.z) + 0.35;
    if (pos.y < floor && !this.world.solidAt(pos.x, pos.y + 0.6, pos.z)) pos.y = floor;
    if (pos.y > this.ceiling) pos.y = this.ceiling;

    if (this.shake > 0.001) {
      pos.x += (Math.random() - 0.5) * this.shake * 0.4;
      pos.y += (Math.random() - 0.5) * this.shake * 0.4;
      this.shake *= Math.exp(-dt * 10);
    }
    this.camera.lookAt(this.focus);
  }

  snap(target: THREE.Vector3): void {
    this.focus.set(target.x, target.y + 1.55, target.z);
  }
}
