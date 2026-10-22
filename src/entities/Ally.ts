import * as THREE from 'three';
import { playerHp, playerPower } from '../data/scaling';
import { B, isSolid } from '../world/blocks';
import type { VoxelWorld } from '../world/VoxelWorld';
import { AnimState, Appearance, Humanoid } from './humanoid';
import type { Henchman } from '../data/dungeons';

// A henchman: someone who fights beside you in a group dungeon (data/dungeons.ts). The body, the
// walking and the health are here; what they choose to do (follow, hold, mend, hit) is in
// game/Dungeons.ts. They walk the way creatures do: a block up at a time, never into water.

const BASE: Appearance = { skin: '#d8a882', hair: '#3a2418', hairStyle: 0, eyes: '#3a2a1a', tunic: '#5a4a3a', trim: '#8a6a3a', trousers: '#3a3430', boots: '#2a1e14' };

/**
 * Health and blows by role, for a henchman of level L: the tank lasts, the damage dealers hit. Shares
 * of a player's own health and swing at that level (data/scaling.ts), so they're as useful at 50 as at 5.
 */
export function allyStats(role: Henchman['role'], L: number): { hp: number; hit: number; every: number; mend: number } {
  const hp = playerHp(L), pw = playerPower(L), mend = 0.3 * hp;
  if (role === 'tank') return { hp: 2.15 * hp, hit: 0.4 * pw, every: 1.3, mend };
  if (role === 'healer') return { hp: 1.3 * hp, hit: 0.31 * pw, every: 1.6, mend };
  return { hp: 1.43 * hp, hit: 0.63 * pw, every: 1.15, mend };
}

let nextBubble = -100;

export class Ally {
  readonly model: Humanoid;
  readonly pos = new THREE.Vector3();
  yaw = 0;
  hp: number;
  readonly max: number;
  readonly hit: number;
  readonly every: number;
  /** A healer's single mend and group round. */
  readonly mendBy: number;
  /** Seconds until the next blow, the next mend, the role's skill (a tank's call, a healer's round). */
  cd = 0;
  mend = 0;
  skill = 0;
  /** Knocked down: lying where they fell until someone gets them up. */
  down = false;
  downFor = 0;
  /** What they're doing this frame, for the animation. */
  act: AnimState = 'idle';
  actTime = 0;
  /** A speech bubble's id (Game's bubbles): negative, so it never meets a player's id. */
  readonly bubble = nextBubble--;
  /** Seconds since they last said something (they don't chatter). */
  quiet = 0;
  /** Getting nowhere toward where they want to be: after a while they catch up some other way. */
  stuck = 0;
  /** In reach of what it's fighting: it stays put until the foe is well out of reach again (no stepping in and out every frame). */
  inReach = false;
  /** Where a healer means to stand, eased toward each new spot so it doesn't jump between foes. */
  goal: THREE.Vector2 | null = null;
  /** The way the body faces, turned toward yaw rather than snapped to it. */
  private shownYaw = 0;
  private vy = 0;

  constructor(readonly def: Henchman, readonly level: number, private world: VoxelWorld) {
    this.model = new Humanoid({ ...BASE, ...def.look });
    this.model.setHeld(def.held);
    const s = allyStats(def.role, level);
    this.max = this.hp = Math.round(s.hp);
    this.hit = s.hit;
    this.every = s.every;
    this.mendBy = s.mend;
  }

  get name(): string { return this.def.name; }
  get role(): Henchman['role'] { return this.def.role; }
  get up(): boolean { return !this.down; }

  place(x: number, y: number, z: number): void {
    this.pos.set(x, y, z);
    this.vy = 0;
    this.shownYaw = this.yaw;
    this.sync();
  }

  /** Take a blow; true if it knocked them down. Tanks take less (they're braced for it). */
  hurt(dmg: number): boolean {
    if (this.down) return false;
    this.hp -= Math.max(1, Math.round(dmg * (this.def.role === 'tank' ? 0.6 : 1)));
    this.act = 'hit';
    this.actTime = 0;
    if (this.hp > 0) return false;
    this.hp = 0;
    this.down = true;
    this.downFor = 0;
    return true;
  }

  heal(n: number): number {
    if (this.down) return 0;
    const h = Math.min(this.max - this.hp, Math.round(n));
    this.hp += h;
    return h;
  }

  /** Back on their feet with this share of their health. */
  getUp(share: number): void {
    this.down = false;
    this.hp = Math.max(1, Math.round(this.max * share));
    this.act = 'idle';
  }

  /** Walk toward a point; false if the way is blocked. */
  stepToward(tx: number, tz: number, speed: number, dt: number): boolean {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return false;
    this.yaw = Math.atan2(dx, dz);
    const step = Math.min(d, speed * dt);
    const nx = this.pos.x + (dx / d) * step, nz = this.pos.z + (dz / d) * step;
    let fy = this.canStand(nx, nz, this.pos.y + 0.1);
    // Slide along a wall rather than stopping dead against it
    if (fy === null) {
      const ax = this.canStand(nx, this.pos.z, this.pos.y + 0.1), az = this.canStand(this.pos.x, nz, this.pos.y + 0.1);
      if (ax !== null && Math.abs(dx) > 0.05) { this.pos.x = nx; fy = ax; }
      else if (az !== null && Math.abs(dz) > 0.05) { this.pos.z = nz; fy = az; }
      else return false;
    } else { this.pos.x = nx; this.pos.z = nz; }
    if (fy > this.pos.y + 0.1) this.pos.y = fy;
    return true;
  }

  face(x: number, z: number): void { this.yaw = Math.atan2(x - this.pos.x, z - this.pos.z); }

  private canStand(x: number, z: number, y: number): number | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (const dy of [0, 1, -1, -2]) {
      const fy = Math.floor(y) + dy;
      if (isSolid(this.world.get(ix, fy - 1, iz)) && !isSolid(this.world.get(ix, fy, iz)) && !isSolid(this.world.get(ix, fy + 1, iz))) {
        return this.world.get(ix, fy, iz) === B.Water ? null : fy;
      }
    }
    return null;
  }

  /** Gravity, the animation, and the body where the henchman is. */
  update(dt: number, moving: number): void {
    this.quiet += dt;
    this.actTime += dt;
    if (this.world.isLoaded(this.pos.x, this.pos.z)) {
      const ground = this.world.groundBelow(this.pos.x, this.pos.y + 0.6, this.pos.z);
      if (this.pos.y > ground + 0.01) { this.vy -= 25 * dt; this.pos.y = Math.max(ground, this.pos.y + this.vy * dt); }
      else { this.vy = 0; this.pos.y = ground; }
    }
    const M = this.model;
    if (this.down) M.setState('dead');
    else if ((this.act === 'attack' || this.act === 'cleave') && this.actTime < 0.45) M.setState(this.act);
    else if (this.act === 'heal' && this.actTime < 0.8) M.setState('heal');
    else if (this.act === 'hit' && this.actTime < 0.25) M.setState('hit');
    else M.setState(moving > 0.3 ? (moving > 4.5 ? 'run' : 'walk') : 'idle');
    M.update(dt, this.down ? 0 : moving);
    this.sync(dt);
  }

  private sync(dt = 0): void {
    this.model.root.position.copy(this.pos);
    // Turn at a walking pace the short way round
    let d = this.yaw - this.shownYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.shownYaw += dt > 0 ? Math.sign(d) * Math.min(Math.abs(d), dt * 9) : d;
    this.model.root.rotation.y = this.shownYaw;
  }
}
