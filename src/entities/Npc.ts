import * as THREE from 'three';
import { NpcDef, ScheduleSlot } from '../data/npcs';
import { VoxelWorld } from '../world/VoxelWorld';
import { Humanoid } from './humanoid';
import { B } from '../world/blocks';

const LEAVES = new Set<number>([B.OakLeaves, B.BirchLeaves, B.PineLeaves]);

export class Npc {
  readonly model: Humanoid;
  readonly pos = new THREE.Vector3();
  private slot: ScheduleSlot | null = null;
  private route: [number, number][] = [];
  private yaw = 0;
  talking = false;
  private wanderT = 0;
  private wanderTarget: [number, number] | null = null;
  barkCooldown = 0;
  /** False until the NPC has been dropped onto loaded ground. */
  placed = false;
  /** Extra animation override while something special is happening (casting the bell). */
  override: { anim: 'hammer' | 'bellows' | 'idle'; held?: 'hammer' | 'tongs' | 'none' } | null = null;

  constructor(readonly def: NpcDef, private world: VoxelWorld) {
    this.model = new Humanoid(def.look);
  }

  get id(): string { return this.def.id; }

  /** Hollindale has overhangs (the bell bay) below y 40; the regional towns sit on open ground that can be higher. */
  private groundAt(x: number, z: number): number {
    const top = x < 320 && z < 320 ? 40 : 95;
    // People stand on the ground, never on a canopy: look down through leaves.
    let y = this.world.groundBelow(x, top, z);
    while (y > 1 && LEAVES.has(this.world.get(Math.floor(x), y - 1, Math.floor(z)))) y = this.world.groundBelow(x, y - 2, z);
    return y;
  }

  private slotFor(hour: number): ScheduleSlot {
    for (const s of this.def.schedule) {
      if (s.from < s.to ? hour >= s.from && hour < s.to : hour >= s.from || hour < s.to) return s;
    }
    return this.def.schedule[0];
  }

  place(hour: number): void {
    const s = this.slotFor(hour);
    this.slot = s;
    this.route = [];
    this.pos.set(s.at[0], this.groundAt(s.at[0], s.at[1]), s.at[1]);
  }

  update(dt: number, hour: number, player: THREE.Vector3): void {
    const s = this.slotFor(hour);
    const far = this.pos.distanceTo(player) > 70;
    if (s !== this.slot) {
      this.slot = s;
      this.route = [...(s.path ?? []), s.at];
      if (far) { this.route = []; this.pos.set(s.at[0], this.groundAt(s.at[0], s.at[1]), s.at[1]); }
    }
    let speed = 0;
    if (this.route.length && !this.talking) {
      const [tx, tz] = this.route[0];
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) this.route.shift();
      else {
        const step = Math.min(d, 2.1 * dt);
        this.pos.x += (dx / d) * step;
        this.pos.z += (dz / d) * step;
        this.yaw = Math.atan2(dx, dz);
        speed = 2.1;
      }
    } else if (this.def.wander && !this.talking) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 3 + Math.random() * 5;
        const a = Math.random() * Math.PI * 2, r = Math.random() * this.def.wander;
        this.wanderTarget = Math.random() < 0.6 ? [s.at[0] + Math.cos(a) * r, s.at[1] + Math.sin(a) * r] : null;
      }
      if (this.wanderTarget) {
        const dx = this.wanderTarget[0] - this.pos.x, dz = this.wanderTarget[1] - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.2) {
          const sp = this.def.id === 'dilly' ? 2.6 : 1.3;
          const step = Math.min(d, sp * dt);
          const nx = this.pos.x + (dx / d) * step, nz = this.pos.z + (dz / d) * step;
          if (!this.world.solidAt(nx, this.pos.y + 0.2, nz) || !this.world.solidAt(nx, this.pos.y + 1.2, nz)) {
            this.pos.x = nx; this.pos.z = nz;
            this.yaw = Math.atan2(dx, dz);
            speed = sp;
          } else this.wanderTarget = null;
        } else this.wanderTarget = null;
      }
    }
    const g = this.world.groundBelow(this.pos.x, this.pos.y + 1.2, this.pos.z);
    this.pos.y += (g - this.pos.y) * Math.min(1, dt * 10);

    const atPost = this.route.length === 0 && !this.def.wander;
    if (this.talking) {
      this.yaw = Math.atan2(player.x - this.pos.x, player.z - this.pos.z);
      this.model.setState('talk');
      this.model.setHeld(this.model.heldKind === 'rod' ? 'rod' : 'none');
    } else if (speed > 0) {
      this.model.setState('walk');
      this.model.setHeld('none');
    } else if (atPost) {
      this.yaw = Math.atan2(s.face[0] - this.pos.x, s.face[1] - this.pos.z);
      const anim = this.override?.anim ?? s.anim;
      this.model.setState(anim);
      this.model.setHeld(this.override?.held ?? s.held ?? 'none');
    } else this.model.setState('idle');

    this.model.update(dt, speed);
    this.model.root.position.copy(this.pos);
    let dy = this.yaw - this.model.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.model.root.rotation.y += dy * Math.min(1, dt * 7);
    this.barkCooldown -= dt;
  }

  /** True while doing something noisy at the forge (used to time anvil sounds and sparks). */
  get striking(): boolean {
    return this.model.state === 'hammer';
  }
}
