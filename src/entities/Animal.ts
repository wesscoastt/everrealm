import * as THREE from 'three';
import { B, isSolid } from '../world/blocks';
import { VoxelWorld } from '../world/VoxelWorld';
import { CreatureModel } from './creatures';

/** Peaceful wildlife and livestock: wander, graze, and flee from the player when skittish. */
export class Animal {
  readonly model: CreatureModel;
  readonly pos = new THREE.Vector3();
  private home = new THREE.Vector3();
  private target = new THREE.Vector3();
  private yaw = Math.random() * 6.28;
  private timer = Math.random() * 3;
  private mode: 'idle' | 'walk' | 'flee' | 'graze' = 'idle';
  private skittish: boolean;
  private speed: number;

  constructor(readonly kind: 'deer' | 'rabbit' | 'sheep' | 'chicken', x: number, z: number, private radius: number, private world: VoxelWorld, ground?: { topSolid(x: number, z: number): number }) {
    this.model = new CreatureModel(kind);
    this.home.set(x, (ground ?? world).topSolid(x, z) + 1, z);
    this.pos.copy(this.home);
    this.target.copy(this.home);
    this.skittish = kind === 'deer' || kind === 'rabbit';
    this.speed = kind === 'deer' ? 2.2 : kind === 'rabbit' ? 2.6 : kind === 'sheep' ? 1.0 : 1.4;
  }

  /** Where it would stand at (x, z), coming from height y: ground a step up or down at most, room for its body, no water. */
  private walkable(x: number, z: number, y = this.pos.y): number | null {
    const ix = Math.floor(x), iz = Math.floor(z), tall = this.kind === 'deer' ? 3 : 2;
    for (const dy of [0, 1, -1]) {
      const fy = Math.floor(y + 0.1) + dy;
      if (!isSolid(this.world.get(ix, fy - 1, iz)) || this.world.get(ix, fy, iz) === B.Water) continue;
      let open = true;
      for (let h = 0; h < tall; h++) if (isSolid(this.world.get(ix, fy + h, iz))) open = false;
      if (open) return fy;
    }
    return null;
  }

  /** Could it walk straight to (x, z)? Checked every half block, its nose half a body ahead of its feet. */
  private clearTo(x: number, z: number): boolean {
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.5) return true;
    const ux = dx / d, uz = dz / d, nose = this.kind === 'deer' ? 0.8 : 0.4;
    let y = this.pos.y;
    for (let s = 0.5; s <= d + nose; s += 0.5) {
      const fy = this.walkable(this.pos.x + ux * s, this.pos.z + uz * s, y);
      if (fy === null) return false;
      y = fy;
    }
    return true;
  }

  /** A spot to walk to that it can reach in a straight line: anywhere round home, or away from someone. */
  private pickTarget(away?: THREE.Vector3): boolean {
    for (let k = 0; k < 8; k++) {
      let x: number, z: number;
      if (away) {
        // Straight away first, then turning aside a little more each try
        const a = Math.atan2(this.pos.x - away.x, this.pos.z - away.z) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45;
        x = this.pos.x + Math.sin(a) * 10; z = this.pos.z + Math.cos(a) * 10;
      } else {
        const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
        x = this.home.x + Math.cos(a) * r; z = this.home.z + Math.sin(a) * r;
      }
      if (Math.hypot(x - this.home.x, z - this.home.z) > this.radius + 12) continue;
      if (this.clearTo(x, z)) { this.target.set(x, 0, z); return true; }
    }
    return false;
  }

  update(dt: number, player: THREE.Vector3): void {
    this.timer -= dt;
    const dp = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
    if (this.skittish && dp < (this.kind === 'deer' ? 8 : 4.5) && this.mode !== 'flee') {
      // Bolt away from you, round a wall rather than into it; cornered, it stands its ground
      if (this.pickTarget(player)) { this.mode = 'flee'; this.timer = 2.5; }
    }
    if (this.timer <= 0) {
      if (this.mode === 'idle' || this.mode === 'graze' || this.mode === 'flee') {
        if (this.pickTarget()) { this.mode = 'walk'; this.timer = 6; } else { this.mode = 'graze'; this.timer = 2 + Math.random() * 3; }
      } else {
        this.mode = Math.random() < 0.5 ? 'graze' : 'idle';
        this.timer = 2 + Math.random() * 5;
      }
    }
    let moving = 0;
    if (this.mode === 'walk' || this.mode === 'flee') {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      const sp = this.mode === 'flee' ? this.speed * 2.6 : this.speed;
      if (d < 0.3) { this.mode = 'idle'; this.timer = 1 + Math.random() * 3; }
      else {
        const nx = this.pos.x + (dx / d) * sp * dt, nz = this.pos.z + (dz / d) * sp * dt;
        const fy = this.walkable(nx, nz);
        this.yaw = Math.atan2(dx, dz);
        if (fy !== null && Math.hypot(nx - this.home.x, nz - this.home.z) < this.radius + 14) {
          this.pos.set(nx, fy, nz);
          moving = sp;
        } else if (this.mode === 'flee' ? !this.pickTarget(player) : !this.pickTarget()) { this.mode = 'idle'; this.timer = 1 + Math.random() * 2; }
      }
    }
    const g = this.world.groundBelow(this.pos.x, this.pos.y + 0.6, this.pos.z);
    this.pos.y += (g - this.pos.y) * Math.min(1, dt * 12);
    this.model.setAnim(moving > 0 ? (this.mode === 'flee' ? 'run' : 'walk') : this.mode === 'graze' ? 'graze' : 'idle');
    this.model.update(dt, moving);
    this.model.root.position.copy(this.pos);
    let dy = this.yaw - this.model.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.model.root.rotation.y += dy * Math.min(1, dt * 8);
  }
}
