import * as THREE from 'three';
import { B, isSolid } from '../world/blocks';
import { VoxelWorld } from '../world/VoxelWorld';
import { CreatureModel, type Palette } from './creatures';

export type AnimalKind = 'deer' | 'rabbit' | 'sheep' | 'chicken' | 'dog' | 'cat' | 'duck' | 'cow' | 'pig';

/**
 * Peaceful wildlife and livestock: wander, graze, and flee from the player when skittish. Dogs come
 * over to see you and sit; cats loaf about and slink off if you rush them; ducks keep to the water.
 */
export class Animal {
  readonly model: CreatureModel;
  readonly pos = new THREE.Vector3();
  readonly home = new THREE.Vector3();
  private target = new THREE.Vector3();
  private yaw = Math.random() * 6.28;
  private timer = Math.random() * 3;
  private mode: 'idle' | 'walk' | 'flee' | 'graze' | 'sit' = 'idle';
  /** A sound now and then (a bark, a meow, a quack), told to whoever's listening. */
  static voice: ((kind: AnimalKind, at: THREE.Vector3) => void) | null = null;
  private voiceIn = 4 + Math.random() * 20;
  /** Petted: a little hop of joy, for this long. */
  private glad = 0;
  private skittish: boolean;
  private speed: number;

  constructor(readonly kind: AnimalKind, x: number, z: number, private radius: number, private world: VoxelWorld, ground?: { topSolid(x: number, z: number): number; landTop?(x: number, z: number): number }, pal: Palette = {}) {
    this.model = new CreatureModel(kind, pal);
    // (under a tree the top is the canopy: stand on the ground itself)
    const src = ground ?? world, top = src.landTop ? src.landTop(x, z) : src.topSolid(x, z);
    this.home.set(x, kind === 'duck' ? this.surface(x, z) ?? top + 1 : top + 1, z);
    this.pos.copy(this.home);
    this.target.copy(this.home);
    this.skittish = kind === 'deer' || kind === 'rabbit';
    this.speed = kind === 'deer' ? 2.2 : kind === 'rabbit' ? 2.6 : kind === 'sheep' ? 1.0 : kind === 'dog' ? 2.2 : kind === 'cat' ? 1.3 : kind === 'duck' ? 0.7 : kind === 'cow' ? 0.7 : kind === 'pig' ? 1.1 : 1.4;
  }

  /** The top of the water at (x, z), if there's water there two deep (a duck's floor). */
  private surface(x: number, z: number): number | null {
    const ix = Math.floor(x), iz = Math.floor(z);
    for (let y = 90; y > 2; y--) {
      const id = this.world.get(ix, y, iz);
      if (id === B.Water) return this.world.get(ix, y - 1, iz) === B.Water ? y + 0.88 : null;
      if (id !== B.Air) return null;
    }
    return null;
  }

  /** Where it would stand at (x, z), coming from height y: ground a step up or down at most, room for its body, no water. */
  private walkable(x: number, z: number, y = this.pos.y): number | null {
    if (this.kind === 'duck') { const s = this.surface(x, z); return s !== null && Math.abs(s - y) < 0.5 ? s : null; }
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

  /** Stroked or patted: it's pleased about it. */
  pet(): void { this.glad = 1.2; this.mode = this.kind === 'dog' ? 'sit' : 'idle'; this.timer = 4; }

  /** Struck: it bolts away from whoever did it. */
  scare(from: THREE.Vector3): void {
    if (this.pickTarget(from)) { this.mode = 'flee'; this.timer = 3.5; }
  }

  update(dt: number, player: THREE.Vector3, playerSpeed = 0): void {
    this.timer -= dt;
    this.glad = Math.max(0, this.glad - dt);
    this.voiceIn -= dt;
    if (this.voiceIn <= 0) {
      this.voiceIn = (this.kind === 'cat' ? 25 : 12) + Math.random() * 30;
      const near = Math.hypot(player.x - this.pos.x, player.z - this.pos.z) < 30;
      if (near && (this.kind === 'dog' || this.kind === 'cat' || this.kind === 'duck' || this.kind === 'sheep' || this.kind === 'cow' || this.kind === 'pig')) Animal.voice?.(this.kind, this.pos);
    }
    // A dog trots over to see who you are, and sits by you; a cat slinks off if you come at it fast
    const dpl = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
    if (this.kind === 'dog' && dpl < 9 && dpl > 2.2 && this.mode !== 'walk' && Math.hypot(player.x - this.home.x, player.z - this.home.z) < this.radius + 10) {
      const a = Math.atan2(this.pos.x - player.x, this.pos.z - player.z);
      const tx = player.x + Math.sin(a) * 1.6, tz = player.z + Math.cos(a) * 1.6;
      if (this.clearTo(tx, tz)) { this.target.set(tx, 0, tz); this.mode = 'walk'; this.timer = 5; }
    } else if (this.kind === 'dog' && dpl <= 2.4 && this.mode === 'idle') { this.mode = 'sit'; this.timer = 3 + Math.random() * 4; }
    if (this.kind === 'cat' && dpl < 3 && playerSpeed > 5 && this.mode !== 'flee' && this.pickTarget(player)) { this.mode = 'flee'; this.timer = 2; }
    const dp = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
    if (this.skittish && dp < (this.kind === 'deer' ? 8 : 4.5) && this.mode !== 'flee') {
      // Bolt away from you, round a wall rather than into it; cornered, it stands its ground
      if (this.pickTarget(player)) { this.mode = 'flee'; this.timer = 2.5; }
    }
    if (this.timer <= 0) {
      if (this.mode === 'idle' || this.mode === 'graze' || this.mode === 'flee') {
        if (this.kind === 'cat' && Math.random() < 0.6) { this.mode = 'sit'; this.timer = 8 + Math.random() * 16; } // a cat mostly sits
        else if (this.pickTarget()) { this.mode = 'walk'; this.timer = 6; } else { this.mode = 'graze'; this.timer = 2 + Math.random() * 3; }
      } else if (this.mode === 'sit') {
        this.mode = 'idle'; this.timer = 1 + Math.random() * 2;
      } else {
        this.mode = this.kind === 'dog' || this.kind === 'cat' ? (Math.random() < 0.5 ? 'sit' : 'idle') : Math.random() < 0.5 ? 'graze' : 'idle';
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
    if (this.kind !== 'duck') {
      const g = this.world.groundBelow(this.pos.x, this.pos.y + 0.6, this.pos.z);
      this.pos.y += (g - this.pos.y) * Math.min(1, dt * 12);
    }
    this.model.setAnim(this.kind === 'duck' ? 'swim' : moving > 0 ? (this.mode === 'flee' ? 'run' : 'walk') : this.mode === 'sit' ? 'sit' : this.mode === 'graze' ? 'graze' : 'idle');
    this.model.update(dt, moving);
    this.model.root.position.copy(this.pos);
    if (this.glad > 0) this.model.root.position.y += Math.abs(Math.sin(this.glad * 9)) * (this.kind === 'dog' ? 0.18 : 0.05);
    let dy = this.yaw - this.model.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.model.root.rotation.y += dy * Math.min(1, dt * 8);
  }
}
