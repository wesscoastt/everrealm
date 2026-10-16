import * as THREE from 'three';
import { isSolid } from '../world/blocks';
import { SY, VoxelWorld } from '../world/VoxelWorld';
import { Appearance, Humanoid, ROLL_TIME } from './humanoid';

const HALF = 0.3;
const HEIGHT = 1.8;
const GRAVITY = 28;
const JUMP = 9.2;

/**
 * Kinematic character with voxel AABB collision, auto-step and swimming. Swimming works like
 * Guild Wars 2: you float at the surface with your head out, dive by holding C or by swimming
 * where the camera looks, hold your depth underwater, and rise with Space. Nobody drowns.
 */
export class Player {
  readonly model: Humanoid;
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  private visualYaw = 0;
  onGround = false;
  inWater = false;
  swimming = false;
  /** Head under the surface. */
  underwater = false;
  /** Set by the game each frame: Space and C held, and where the camera aims (up is positive, radians). */
  rise = false;
  sink = false;
  swimAim = 0;
  /** The surface's height over the player while swimming. */
  waterTop = 0;
  /** Which way the body points while swimming (0 level, positive head-up), for the stroke pose. */
  swimPitch = 0;
  private swimLift = 0;
  /** Smoothed vertical offset applied after a step-up so the model glides instead of popping. */
  private stepOffset = 0;
  speed = 0;
  /** Lock movement while doing something (gathering, talking, dead). */
  locked = false;
  rolling = 0;
  private rollDir = new THREE.Vector3();
  fallStartY = 0;
  /** In the saddle: the rider sits this high over the ground (0 on foot). */
  seat = 0;
  private seatLift = 0;

  constructor(private world: VoxelWorld, look: Appearance) {
    this.model = new Humanoid(look);
  }

  setAppearance(look: Appearance, scene: THREE.Object3D): void {
    const parent = this.model.root.parent ?? scene;
    parent.remove(this.model.root);
    const held = this.model.heldKind;
    (this as { model: Humanoid }).model = new Humanoid(look);
    this.model.setHeld(held);
    parent.add(this.model.root);
  }

  /** Where the feet are, smoothed through steps (for a mount to stand on). */
  footPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.position.x, this.position.y + this.stepOffset, this.position.z);
  }

  get facing(): number { return this.visualYaw; }

  teleport(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }

  faceTowards(x: number, z: number): void {
    this.yaw = Math.atan2(x - this.position.x, z - this.position.z);
  }

  private collides(px: number, py: number, pz: number): boolean {
    const x0 = Math.floor(px - HALF), x1 = Math.floor(px + HALF - 1e-4);
    const y0 = Math.floor(py), y1 = Math.floor(py + HEIGHT - 1e-4);
    const z0 = Math.floor(pz - HALF), z1 = Math.floor(pz + HALF - 1e-4);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (isSolid(this.world.get(x, y, z))) return true;
    }
    return false;
  }

  startRoll(dir: THREE.Vector3): void {
    this.rolling = ROLL_TIME;
    this.rollDir.copy(dir).setY(0).normalize();
    if (this.rollDir.lengthSq() < 0.1) this.rollDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
  }

  /**
   * move: desired horizontal direction (unit or zero) in world space.
   * Returns fall distance on landing (0 otherwise).
   */
  update(dt: number, move: THREE.Vector3, wantSpeed: number, jump: boolean): number {
    let landed = 0;
    const chestWater = this.world.isWater(this.position.x, this.position.y + 1.2, this.position.z);
    this.inWater = this.world.isWater(this.position.x, this.position.y + 0.3, this.position.z);
    this.swimming = chestWater;
    if (this.swimming) {
      let top = Math.floor(this.position.y + 1.2);
      while (top < SY - 1 && this.world.isWater(this.position.x, top, this.position.z)) top++;
      this.waterTop = top;
    }
    this.underwater = this.swimming && this.world.isWater(this.position.x, this.position.y + 1.75, this.position.z);
    // Float with the shoulders at the surface; below that, swimming holds its depth
    const floatY = this.waterTop - 1.35;
    const submerged = this.swimming && this.position.y < floatY - 0.45;
    const moving = move.lengthSq() > 0.01 && !this.locked;
    // Swim where the camera aims once under (or when aiming well down from the surface)
    const diving = this.swimming && moving && (submerged ? Math.abs(this.swimAim) > 0.12 : this.swimAim < -0.45);
    const aim = diving ? this.swimAim : 0;

    let vx = 0, vz = 0;
    if (this.rolling > 0) {
      // Strong push off, easing as the roll comes up into a crouch
      const sp = 12 * (0.35 + 0.65 * (this.rolling / ROLL_TIME));
      this.rolling -= dt;
      vx = this.rollDir.x * sp;
      vz = this.rollDir.z * sp;
    } else if (!this.locked) {
      const sp = wantSpeed * (this.swimming ? 0.62 : this.inWater ? 0.8 : 1) * (diving ? Math.cos(aim) : 1);
      vx = move.x * sp;
      vz = move.z * sp;
      if (move.lengthSq() > 0.01) this.yaw = Math.atan2(move.x, move.z);
    }
    // Ease horizontal velocity for weight
    const accel = this.onGround ? 18 : 6;
    this.velocity.x += (vx - this.velocity.x) * Math.min(1, dt * accel);
    this.velocity.z += (vz - this.velocity.z) * Math.min(1, dt * accel);

    if (this.swimming) {
      let want: number;
      if (this.sink) want = -3.4;
      else if (this.rise) want = 3.6;
      else if (diving) want = Math.sin(aim) * wantSpeed * 0.62;
      else if (submerged) want = 0.35; // near neutral, drifting slowly up
      else want = THREE.MathUtils.clamp((floatY - this.position.y) * 3, -2, 2.4);
      this.velocity.y += (want - this.velocity.y) * Math.min(1, dt * 4);
      // At the surface Space kicks up hard enough to climb out onto a bank
      if (jump && !submerged) this.velocity.y = 6.2;
      // The body follows the stroke: level at the surface, pitched along the dive below it
      const pitchTo = moving ? (diving ? aim : this.rise ? 0.5 : this.sink ? -0.6 : 0) : 0;
      this.swimPitch += (pitchTo - this.swimPitch) * Math.min(1, dt * 5);
    } else {
      this.swimPitch = 0;
      this.velocity.y -= GRAVITY * dt;
      if (jump && this.onGround && !this.locked) {
        this.velocity.y = JUMP;
        this.onGround = false;
      }
    }
    this.velocity.y = Math.max(this.velocity.y, -40);

    const p = this.position;
    // X axis with auto-step
    const stepX = this.velocity.x * dt;
    if (stepX !== 0) {
      if (!this.collides(p.x + stepX, p.y, p.z)) p.x += stepX;
      else if ((this.onGround || this.inWater) && !this.collides(p.x + stepX, p.y + 1.02, p.z) && !this.collides(p.x, p.y + 1.02, p.z)) {
        p.y += 1.02; p.x += stepX; this.stepOffset -= 1.02;
      } else this.velocity.x = 0;
    }
    const stepZ = this.velocity.z * dt;
    if (stepZ !== 0) {
      if (!this.collides(p.x, p.y, p.z + stepZ)) p.z += stepZ;
      else if ((this.onGround || this.inWater) && !this.collides(p.x, p.y + 1.02, p.z + stepZ) && !this.collides(p.x, p.y + 1.02, p.z)) {
        p.y += 1.02; p.z += stepZ; this.stepOffset -= 1.02;
      } else this.velocity.z = 0;
    }
    const stepY = this.velocity.y * dt;
    const wasGround = this.onGround;
    if (!this.collides(p.x, p.y + stepY, p.z)) {
      p.y += stepY;
      this.onGround = false;
    } else {
      if (stepY < 0) {
        // Snap onto the block top
        p.y = Math.floor(p.y + stepY) + 1;
        // Bounded: outside the map edge every height reads as solid, and an unbounded climb froze the page.
        for (let i = 0; i < SY && this.collides(p.x, p.y, p.z); i++) p.y += 1;
        if (!wasGround) landed = Math.max(0, this.fallStartY - p.y);
        this.onGround = true;
      }
      this.velocity.y = 0;
    }
    if (this.onGround && !this.collides(p.x, p.y - 0.05, p.z)) this.onGround = false;
    if (wasGround && !this.onGround) this.fallStartY = p.y;
    if (!this.onGround && this.velocity.y > 0) this.fallStartY = p.y;
    if (this.swimming) this.fallStartY = p.y;
    if (p.y < -5) p.y = this.world.groundBelow(p.x, 63, p.z) + 1;

    this.stepOffset += (0 - this.stepOffset) * Math.min(1, dt * 14);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);

    // Model transform
    let dy = this.yaw - this.visualYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.visualYaw += dy * Math.min(1, dt * 14);
    // At the surface the stroking body rides high, back and head out; treading sits shoulder-deep
    const lift = this.swimming && !this.underwater ? (this.speed > 0.6 ? 0.08 : -0.05) : 0;
    this.swimLift += (lift - this.swimLift) * Math.min(1, dt * 6);
    this.seatLift += (this.seat - this.seatLift) * Math.min(1, dt * 12);
    this.model.root.position.set(p.x, p.y + this.stepOffset + this.swimLift + this.seatLift, p.z);
    this.model.root.rotation.y = this.visualYaw;
    return landed;
  }
}
