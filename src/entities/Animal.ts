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

  private walkable(x: number, z: number): number | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (const dy of [0, 1, -1]) {
      const fy = Math.floor(this.pos.y + 0.1) + dy;
      if (isSolid(this.world.get(ix, fy - 1, iz)) && !isSolid(this.world.get(ix, fy, iz)) && !isSolid(this.world.get(ix, fy + 1, iz)) && this.world.get(ix, fy, iz) !== B.Water) return fy;
    }
    return null;
  }

  update(dt: number, player: THREE.Vector3): void {
    this.timer -= dt;
    const dp = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
    if (this.skittish && dp < (this.kind === 'deer' ? 8 : 4.5) && this.mode !== 'flee') {
      this.mode = 'flee';
      this.timer = 2.5;
      const ax = this.pos.x - player.x, az = this.pos.z - player.z;
      const l = Math.hypot(ax, az) || 1;
      this.target.set(this.pos.x + (ax / l) * 12, 0, this.pos.z + (az / l) * 12);
    }
    if (this.timer <= 0) {
      if (this.mode === 'idle' || this.mode === 'graze' || this.mode === 'flee') {
        const a = Math.random() * Math.PI * 2, r = Math.random() * this.radius;
        this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
        this.mode = 'walk';
        this.timer = 6;
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
        } else { this.mode = 'idle'; this.timer = 0.5; }
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
