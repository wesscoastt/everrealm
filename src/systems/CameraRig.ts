import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BLOCKS, isSolid } from '../world/blocks';

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
  /** Whether the camera's focus is under a roof (see update). */
  indoor = false;

  constructor(readonly camera: THREE.PerspectiveCamera, private world: VoxelWorld) {}

  addShake(amount: number): void {
    this.shake = Math.min(0.6, this.shake + amount);
  }

  rotate(dx: number, dy: number): void {
    this.yaw -= dx * 0.0055;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0045, this.firstPerson ? -1.3 : -0.55, 1.35);
  }

  /** Zoomed all the way in: you see through your character's eyes. */
  get firstPerson(): boolean { return this.targetDistance < 1; }

  zoom(steps: number): void {
    // Past the closest third-person distance the view drops into first person, and back out again
    if (this.firstPerson) { if (steps > 0) this.targetDistance = 2.5; return; }
    const next = this.targetDistance + steps * 1.1;
    if (next < 2.5) { if (this.targetDistance <= 2.5 + 0.01) { this.targetDistance = 0; this.distance = 0; } else this.targetDistance = 2.5; return; }
    this.targetDistance = Math.min(18, next);
    if (this.pitch < -0.55) this.pitch = -0.55;
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
    if (this.firstPerson) {
      // Eyes a little forward of the head, looking where the mouse points
      const eye = this.camera.position.set(target.x, target.y + 1.62, target.z);
      eye.x -= Math.sin(this.yaw) * 0.18; eye.z -= Math.cos(this.yaw) * 0.18;
      this.focus.copy(eye);
      this.actualDistance = 0;
      this.indoor = false;
      for (let y = 1; y <= 3; y++) if (this.world.solidAt(eye.x, eye.y + y, eye.z)) { this.indoor = true; break; }
      const cp = Math.cos(this.pitch);
      this.camera.lookAt(eye.x - Math.sin(this.yaw) * cp, eye.y - Math.sin(this.pitch), eye.z - Math.cos(this.yaw) * cp);
      if (this.shake > 0.001) { this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.15; this.shake *= Math.exp(-dt * 10); }
      return;
    }

    // Pull in when a block is between the player and the camera. In tight spaces (the Pit),
    // try flatter and steeper angles and use whichever leaves the most room.
    const free = (pitch: number, yawOff: number) => {
      const d = new THREE.Vector3(Math.sin(this.yaw + yawOff) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.yaw + yawOff) * Math.cos(pitch));
      const hit = this.world.raycast(this.focus.x, this.focus.y, this.focus.z, d.x, d.y, d.z, this.distance + 0.4);
      return { d, dist: hit ? Math.max(0.6, hit.distance - 0.35) : this.distance };
    };
    let best = free(this.pitch, 0);
    // Indoors (a ceiling close overhead), rooms are small: look along the room's longest open line,
    // from up under the beams, leaning towards where the player is pointing the camera.
    // A roof is solid and not leaves: a tree's canopy overhead doesn't make a room
    const roofed = (x: number, y0: number, z: number) => {
      for (let y = 1; y <= 3; y++) {
        const id = this.world.get(Math.floor(x), Math.floor(y0 + y), Math.floor(z));
        if (isSolid(id) && !BLOCKS[id]?.seeThrough) return true;
      }
      return false;
    };
    const indoor = roofed(this.focus.x, this.focus.y, this.focus.z);
    this.indoor = indoor;
    // A view that runs out of the door doesn't count: the camera stays inside, under the roof
    const inside = (c: { d: THREE.Vector3; dist: number }) => {
      for (let t = c.dist; t > 0.6; t -= 0.5) if (roofed(this.focus.x + c.d.x * t, this.focus.y + c.d.y * t - 0.6, this.focus.z + c.d.z * t)) return { d: c.d, dist: t };
      return { d: c.d, dist: 0.6 };
    };
    if (indoor) best = inside(best);
    if (indoor && best.dist < this.distance) {
      let score = best.dist;
      for (const y of [0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4]) for (const p of [this.pitch, 0.5]) {
        const c = inside(free(p, y));
        const sc = c.dist - Math.abs(y) * 0.9;
        if (sc > score + 0.3) { score = sc; best = c; }
      }
    } else if (best.dist < Math.min(3, this.distance)) {
      for (const [p, y] of [[0.05, 0], [-0.15, 0], [this.pitch, 0.5], [this.pitch, -0.5], [0.1, 0.9], [0.1, -0.9]] as const) {
        const c = free(p, y);
        if (c.dist > best.dist + 0.4) best = c;
      }
    }
    this.effPitchDir.lerp(best.d, 1 - Math.exp(-dt * (indoor ? 5 : 10))).normalize();
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
