import * as THREE from 'three';
import { voiceOf, type Sfx } from '../systems/Audio';
import { scaleDef } from '../data/scaling';
import { EnemyDef } from '../data/gameplay';
import { B, isSolid, isLeaves } from '../world/blocks';
import { VoxelWorld } from '../world/VoxelWorld';
import { CreatureKind, CreatureModel, SWIM_KINDS } from './creatures';
import { FoeModel } from './foes';

export type EnemyState = 'idle' | 'wander' | 'chase' | 'windup' | 'attack' | 'recover' | 'return' | 'dead';

export interface EnemyContext {
  player: THREE.Vector3;
  playerAlive: boolean;
  playerInvulnerable: boolean;
  /** The player is in the water (sea creatures only go after swimmers). */
  playerSwimming: boolean;
  hitPlayer(damage: number, from: Enemy): void;
  sound(name: Sfx, at: THREE.Vector3): void;
  /** The player's level: every creature meets you at it (data/scaling.ts). */
  level?: number;
  /**
   * In a group: a blow that lands on a circle (a slam, a boss's signature) also catches everyone
   * else standing in it. "player" above is whoever the creature is after; this is the rest.
   */
  splash?(at: THREE.Vector3, r: number, damage: number, from: Enemy): void;
}

const telegraphMat = new THREE.MeshBasicMaterial({ color: '#ff3a24', transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const telegraphFill = new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
const RING_GEO = new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2);
/** What a thrower lobs (a lit lamp, a shard of glass): a small block. */
const SHOT_GEO = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const DISC_GEO = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
const FILL_FROM = new THREE.Color('#ff5a2a'), FILL_TO = new THREE.Color('#ff2a10'), FILL_NOW = new THREE.Color('#fff0c0');
/** A boss's signature attack: a wide circle round it, wound up slowly, every fourth attack. */
const SIGNATURE = { every: 4, windup: 1.5, damage: 1.4 };

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  /** The creature as written (data/gameplay.ts). */
  readonly base: EnemyDef;
  /** This one as met: the written creature scaled to the player's level (scaleTo). */
  def: EnemyDef;
  readonly model: CreatureModel | FoeModel;
  readonly pos = new THREE.Vector3();
  readonly home = new THREE.Vector3();
  yaw = Math.random() * Math.PI * 2;
  hp: number;
  state: EnemyState = 'idle';
  private timer = 0;
  private cooldown = 0;
  private wanderTarget = new THREE.Vector3();
  private attackDir = new THREE.Vector3();
  private attackOrigin = new THREE.Vector3();
  private hitDone = false;
  private vy = 0;
  respawnIn = 0;
  readonly telegraph = new THREE.Group();
  private teleOutline: THREE.Mesh;
  private teleFill: THREE.Mesh;
  lastHitAt = -99;
  /** Set when a quest put this creature in the world; its kills are counted and it does not respawn. */
  questTag?: string;
  /** Where it spawns ("type@x,z"): the key the spawn ledger and the realm server know it by. */
  spawnKey?: string;
  /** A training dummy: seconds since it was last struck. */
  private calm = 0;
  private planted = false;
  /** Set true for one frame when the enemy dies so the game can grant rewards. */
  justDied = false;
  /** Seconds left stunned or rooted by a class skill: no moving, no attacking. */
  stun = 0;
  /** Seconds left holding still for one of its own big moves (a boss winding up): it faces holdYaw and waits. */
  hold = 0;
  holdYaw = 0;
  /** Seconds left chilled by a named piece: it moves at two thirds of its pace. */
  slowLeft = 0;
  /** Seconds left tarnished by a named piece: its blows do 15% less. */
  weakLeft = 0;
  knock = new THREE.Vector3();
  /** A hit's squash, decaying (the game makes it bigger for crits). */
  punch = 0;
  /** Big fights: enraged below 35% health, and set for one frame when it happens. */
  enraged = false;
  justEnraged = false;
  /** The current wind-up is the boss's signature circle. */
  signature = false;
  private attacks = 0;
  private fillMat = telegraphFill.clone();
  private bigRing: THREE.Mesh;
  private bigFill: THREE.Mesh;
  /** Sea creatures: they swim in three dimensions, nose up or down along the way. */
  readonly swims: boolean;
  private pitch = 0;
  /** How tall a swimmer's body is (the water must cover it), and how long its quarry has been out of the water. */
  private swimH = 0.9;
  private dry = 0;
  private attackDir3 = new THREE.Vector3();
  /** A thrower's shot, flying from its hand to the circle (a child of the telegraph, so local to the circle). */
  private shotMesh: THREE.Mesh | null = null;
  private shotFrom = new THREE.Vector3();

  /** ground: optional height source for placing the home point (the Hollindale grid before its chunks stream in). */
  constructor(def: EnemyDef, x: number, z: number, private world: VoxelWorld, ground?: { topSolid(x: number, z: number): number; landTop?(x: number, z: number): number; groundBelow(x: number, y: number, z: number): number }) {
    this.base = def;
    this.def = { ...def };
    const kind = def.model ?? (def.type as CreatureKind);
    this.model = kind === 'bandit' ? new FoeModel(def.look ?? {}, def.held ?? 'sword', x * 31 + z * 17) : new CreatureModel(kind, def.palette, def.scale);
    this.hp = def.hp;
    this.swims = SWIM_KINDS.has(kind);
    const src = ground ?? world;
    // (under a tree the top is the canopy: stand on the ground itself)
    const y = (src.landTop ? src.landTop(x, z) : src.topSolid(x, z)) + 1;
    this.home.set(x + 0.5, y, z + 0.5);
    if (this.swims) {
      // Out in the water between the sea bed and the surface, lower in deep water
      this.swimH = (kind === 'medusa' ? 1.9 : kind === 'ray' ? 0.6 : 0.9) * (def.scale ?? 1);
      let top = y;
      while (top < y + 60 && world.get(Math.floor(x), top, Math.floor(z)) === B.Water) top++;
      this.home.y = Math.max(y + 0.4, Math.min(top - this.swimH - 1.2, y + (top - y) * 0.4));
      this.model.root.rotation.order = 'YXZ';
      this.telegraph.rotation.order = 'YXZ';
    }
    // Rustbacks live underground: find the cave floor instead of the hill top.
    if (def.type === 'rustback') this.home.y = src.groundBelow(x + 0.5, 25, z + 0.5);
    this.pos.copy(this.home);
    this.wanderTarget.copy(this.home);

    const isCircle = def.attack === 'slam' || def.attack === 'throw';
    const outlineGeo = isCircle ? new THREE.CircleGeometry(def.attack === 'throw' ? def.blast ?? 1.8 : def.range, 28) : new THREE.PlaneGeometry(1.6, def.range);
    if (!isCircle) outlineGeo.translate(0, def.range / 2, 0);
    outlineGeo.rotateX(-Math.PI / 2);
    this.teleOutline = new THREE.Mesh(outlineGeo, telegraphMat);
    this.teleFill = new THREE.Mesh(outlineGeo, this.fillMat);
    this.bigRing = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: '#ffb0a0', transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.bigFill = new THREE.Mesh(DISC_GEO, this.fillMat);
    this.bigRing.visible = this.bigFill.visible = false;
    this.telegraph.add(this.teleOutline, this.teleFill, this.bigRing, this.bigFill);
    if (def.attack === 'throw') {
      this.shotMesh = new THREE.Mesh(SHOT_GEO, new THREE.MeshBasicMaterial({ color: def.shot ?? '#ffb040' }));
      this.shotMesh.visible = false;
      this.telegraph.add(this.shotMesh);
    }
    this.telegraph.visible = false;
    this.syncModel();
  }

  /** Gone for now without a death scene: dead, hidden, and back after `secs`. */
  vanish(secs: number): void {
    this.hp = 0;
    this.state = 'dead';
    this.timer = 99;
    this.respawnIn = secs;
    this.justDied = false;
    this.telegraph.visible = false;
    this.model.root.visible = false;
  }

  /** World bosses and story bosses (not ordinary elites like Old Notch): boss bar, enrage, signature attack. */
  get isBoss(): boolean { return !!this.base.elite && this.base.hp >= 1500; }

  /** Meet the player at their level, keeping its share of health (everything scales to you). */
  scaleTo(L: number): void {
    if (this.def.level === L || !(L >= 1)) return;
    const frac = this.def.hp > 0 ? this.hp / this.def.hp : 1;
    this.def = scaleDef(this.base, L);
    if (this.state !== 'dead') this.hp = Math.max(1, Math.round(this.def.hp * frac));
  }

  /** Reach of the signature circle. */
  get signatureRadius(): number { return Math.max(5, this.def.range + 3); }

  private get windupTime(): number { return this.signature ? SIGNATURE.windup : this.def.windup * (this.enraged ? 0.8 : 1); }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  get name(): string {
    return this.def.name;
  }

  takeDamage(amount: number, from: THREE.Vector3, now: number): boolean {
    if (!this.alive) return false;
    // A training dummy takes it all and never falls (it's whole again once it's left alone: update)
    if (this.def.anchored) { this.hp = Math.max(1, this.hp - amount); this.lastHitAt = now; this.calm = 0; this.model.flashHit(); this.punch = Math.max(this.punch, 0.16); this.model.setAnim('hit'); return true; }
    this.hp -= amount;
    this.lastHitAt = now;
    this.model.flashHit();
    this.punch = Math.max(this.punch, this.def.elite ? 0.06 : 0.14);
    if (this.isBoss && !this.enraged && this.hp > 0 && this.hp < this.def.hp * 0.35) { this.enraged = true; this.justEnraged = true; }
    const away = new THREE.Vector3().subVectors(this.pos, from).setY(0).normalize();
    this.knock.addScaledVector(away, this.def.elite ? 2 : 5);
    if (this.state === 'idle' || this.state === 'wander' || this.state === 'return') this.state = 'chase';
    if (this.state !== 'windup' && this.state !== 'attack') this.model.setAnim('hit');
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.timer = 0;
      this.respawnIn = this.def.respawn;
      this.model.setAnim('dead');
      this.telegraph.visible = false;
      this.justDied = true;
    }
    return true;
  }

  private canStand(x: number, z: number, y: number): number | null {
    // Returns the new feet height if the creature may move there (step up to 1 block, never into water).
    const ix = Math.floor(x), iz = Math.floor(z);
    for (const dy of [0, 1, -1, -2]) {
      const fy = Math.floor(y) + dy;
      const below = this.world.get(ix, fy - 1, iz);
      // (never up onto leaves: a step onto a low bough, then the next, and a boar's up a tree)
      if (isSolid(below) && !isLeaves(below) && !isSolid(this.world.get(ix, fy, iz)) && !isSolid(this.world.get(ix, fy + 1, iz))) {
        if (this.world.get(ix, fy, iz) === B.Water) return null;
        return fy;
      }
    }
    return null;
  }

  private stepToward(tx: number, tz: number, speed: number, dt: number): boolean {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return false;
    const step = Math.min(d, speed * dt);
    const nx = this.pos.x + (dx / d) * step, nz = this.pos.z + (dz / d) * step;
    const fy = this.canStand(nx, nz, this.pos.y + 0.1);
    this.yaw = Math.atan2(dx, dz);
    if (fy === null) return false;
    this.pos.x = nx;
    this.pos.z = nz;
    if (fy > this.pos.y + 0.1) this.pos.y = fy;
    return true;
  }

  /** Room to swim here: water from the belly to the back, so a swimmer never beaches or breaks the surface. */
  private swimOk(x: number, y: number, z: number): boolean {
    const ix = Math.floor(x), iz = Math.floor(z);
    return this.world.get(ix, Math.floor(y + 0.15), iz) === B.Water && this.world.get(ix, Math.floor(y + this.swimH), iz) === B.Water
      && this.world.get(ix, Math.floor(y + this.swimH * 0.5), iz) === B.Water;
  }

  /** Swim toward a point, sliding along the sea bed or the surface when the straight way is out of the water. */
  private swimToward(tx: number, ty: number, tz: number, speed: number, dt: number): boolean {
    const p = this.pos;
    const dx = tx - p.x, dy = ty - p.y, dz = tz - p.z;
    const d = Math.hypot(dx, dy, dz), flat = Math.hypot(dx, dz);
    if (d < 0.05) return false;
    const step = Math.min(d, speed * dt);
    const nx = p.x + (dx / d) * step, ny = p.y + (dy / d) * step, nz = p.z + (dz / d) * step;
    if (flat > 0.05) this.yaw = Math.atan2(dx, dz);
    const pitchTo = THREE.MathUtils.clamp(Math.atan2(dy, Math.max(0.3, flat)), -0.7, 0.7);
    this.pitch += (pitchTo - this.pitch) * Math.min(1, dt * 5);
    if (this.swimOk(nx, ny, nz)) { p.set(nx, ny, nz); return true; }
    if (this.swimOk(nx, p.y, nz)) { p.x = nx; p.z = nz; return true; }
    if (this.swimOk(p.x, ny, p.z)) { p.y = ny; return true; }
    return false;
  }

  /** The swimmers' fight: the same states as on land, but in three dimensions and only against swimmers. */
  private updateSwimmer(dt: number, ctx: EnemyContext): void {
    const def = this.def;
    // Bites land on the player's middle (their feet plus a little, less this body's own half height)
    const aim = new THREE.Vector3(ctx.player.x, ctx.player.y + 0.9 - this.swimH * 0.5, ctx.player.z);
    const to = new THREE.Vector3().subVectors(aim, this.pos);
    const distP = to.length();
    const distHome = this.pos.distanceTo(this.home);
    const reachable = ctx.playerAlive && ctx.playerSwimming;
    this.dry = reachable ? 0 : this.dry + dt;
    let moveSpeed = 0;

    if (this.knock.lengthSq() > 0.001) {
      const nx = this.pos.x + this.knock.x * dt, nz = this.pos.z + this.knock.z * dt;
      if (this.swimOk(nx, this.pos.y, nz)) { this.pos.x = nx; this.pos.z = nz; }
      this.knock.multiplyScalar(Math.exp(-dt * 8));
    }
    // Holding still for its own big move: it faces where it means to strike and gathers itself
    if (this.hold > 0 && this.state !== 'dead') {
      this.hold -= dt;
      this.telegraph.visible = false;
      if (this.state === 'windup' || this.state === 'attack') { this.state = 'chase'; this.cooldown = Math.max(this.cooldown, 0.4); }
      this.yaw = this.holdYaw;
      this.model.setAnim('windup');
      this.model.update(dt, 0);
      this.syncModel();
      return;
    }
    if (this.stun > 0 && this.state !== 'dead') {
      this.stun -= dt;
      this.telegraph.visible = false;
      if (this.state === 'windup' || this.state === 'attack') { this.state = 'chase'; this.cooldown = Math.max(this.cooldown, 0.6); }
      this.model.setAnim('hit');
      this.model.update(dt, 0);
      this.syncModel();
      return;
    }
    switch (this.state) {
      case 'dead':
        this.respawnIn -= dt;
        // Belly up, drifting toward the light
        if (this.timer > 0.8 && this.swimOk(this.pos.x, this.pos.y + 0.6, this.pos.z)) this.pos.y += dt * 0.5;
        if (this.respawnIn <= 0) {
          this.hp = def.hp;
          this.pos.copy(this.home);
          this.state = 'idle';
          this.model.setAnim('idle');
          this.timer = 0;
          this.enraged = false;
          this.attacks = 0;
        }
        this.model.update(dt, 0);
        this.syncModel();
        this.model.root.visible = this.respawnIn > 0 ? this.timer < 5 : true;
        return;
      case 'idle':
      case 'wander': {
        if (reachable && distP < def.aggro) {
          this.state = 'chase';
          ctx.sound(voiceOf(def.model ?? def.type, 'aggro'), this.pos);
          break;
        }
        if (this.state === 'idle' && this.timer > 1.5 + Math.random() * 3) {
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 6;
          this.wanderTarget.set(this.home.x + Math.cos(a) * r, this.home.y + (Math.random() - 0.5) * 3, this.home.z + Math.sin(a) * r);
          this.state = 'wander';
          this.timer = 0;
        }
        if (this.state === 'wander') {
          const moved = this.swimToward(this.wanderTarget.x, this.wanderTarget.y, this.wanderTarget.z, def.speed * 0.35, dt);
          moveSpeed = moved ? def.speed * 0.35 : 0;
          if (!moved || this.timer > 7) { this.state = 'idle'; this.timer = 0; }
        } else this.pitch *= Math.exp(-dt * 2);
        break;
      }
      case 'chase': {
        // Out of the water a moment too long, or led too far: back home
        if (!ctx.playerAlive || this.dry > 1.5 || distHome > def.leash) { this.state = 'return'; break; }
        if (reachable && distP <= def.range * 0.85 && this.cooldown <= 0) {
          this.state = 'windup';
          this.timer = 0;
          this.attacks++;
          this.signature = false;
          this.teleOutline.visible = this.teleFill.visible = true;
          this.bigRing.visible = this.bigFill.visible = false;
          this.attackOrigin.copy(this.pos);
          this.attackDir3.copy(to).normalize();
          this.attackDir.set(this.attackDir3.x, 0, this.attackDir3.z).normalize();
          this.yaw = Math.atan2(this.attackDir3.x, this.attackDir3.z);
          this.telegraph.visible = true;
          this.model.setAnim('windup');
          break;
        }
        const pace = def.speed * (this.enraged ? 1.15 : 1) * (this.slowLeft > 0 ? 0.67 : 1);
        if (distP > def.range * 0.6) {
          const moved = this.swimToward(aim.x, aim.y, aim.z, pace, dt);
          moveSpeed = moved ? pace : 0;
        } else this.yaw = Math.atan2(to.x, to.z);
        break;
      }
      case 'windup': {
        const k = Math.min(1, this.timer / this.windupTime);
        // A bite tracks its quarry early in the wind-up; a charge is set once it starts
        if (def.attack === 'lunge' && k < 0.6) {
          this.attackDir3.copy(to).normalize();
          this.attackDir.set(this.attackDir3.x, 0, this.attackDir3.z).normalize();
          this.yaw = Math.atan2(this.attackDir3.x, this.attackDir3.z);
        }
        this.teleFill.scale.setScalar(Math.max(0.01, k));
        if (def.attack !== 'slam') this.teleFill.scale.set(1, 1, Math.max(0.01, k));
        if (k > 0.82) { this.fillMat.color.copy(FILL_NOW); this.fillMat.opacity = 0.6; }
        else { this.fillMat.color.copy(FILL_FROM).lerp(FILL_TO, k); this.fillMat.opacity = 0.28 + k * 0.22; }
        if (this.timer >= this.windupTime) {
          this.state = 'attack';
          this.timer = 0;
          this.hitDone = false;
          this.attackOrigin.copy(this.pos);
          this.model.setAnim('attack');
          ctx.sound('swing', this.pos);
        }
        break;
      }
      case 'attack': {
        const dur = def.attack === 'charge' ? def.range / 13 : def.attack === 'lunge' ? 0.26 : 0.45;
        if (def.attack !== 'slam') {
          const speed = def.attack === 'charge' ? 13 : (def.range * 0.95) / 0.26;
          const D = this.attackDir3;
          this.swimToward(this.pos.x + D.x, this.pos.y + D.y, this.pos.z + D.z, speed, dt);
          moveSpeed = speed;
          if (!this.hitDone && reachable && !ctx.playerInvulnerable) {
            // The tube swept so far, from where the rush began
            const rel = new THREE.Vector3().subVectors(aim, this.attackOrigin);
            const along = rel.dot(D);
            const side = rel.addScaledVector(D, -along).length();
            const reach = this.pos.distanceTo(this.attackOrigin) + 0.9;
            if (along > -0.3 && along < reach && side < 1.1) {
              this.hitDone = true;
              ctx.hitPlayer(def.damage, this);
            }
          }
        } else if (!this.hitDone && this.timer > 0.4) {
          // A sting all round: the threads reach every way at once
          this.hitDone = true;
          if (reachable && !ctx.playerInvulnerable && distP < def.range) ctx.hitPlayer(def.damage, this);
          ctx.sound('squelch', this.pos);
        }
        if (this.timer >= dur) {
          this.state = 'recover';
          this.timer = 0;
          this.cooldown = def.cooldown * (this.enraged ? 0.65 : 1);
          this.telegraph.visible = false;
          this.model.setAnim('idle');
        }
        break;
      }
      case 'recover':
        if (this.timer > 0.55) { this.state = 'chase'; this.timer = 0; }
        break;
      case 'return': {
        const moved = this.swimToward(this.home.x, this.home.y, this.home.z, def.speed * 0.8, dt);
        moveSpeed = moved ? def.speed * 0.8 : 0;
        this.hp = Math.min(def.hp, this.hp + def.hp * dt * 0.5);
        if (distHome < 1 || !moved) {
          if (!moved) this.pos.copy(this.home);
          this.state = 'idle';
          this.timer = 0;
          this.hp = def.hp;
        }
        break;
      }
    }
    if (this.state === 'chase' || this.state === 'wander' || this.state === 'return') this.model.setAnim(moveSpeed > 0.1 ? (moveSpeed > def.speed * 0.6 ? 'run' : 'walk') : 'idle');
    else if (this.state === 'idle') this.model.setAnim('idle');
    if (this.model.anim === 'hit' && this.model.animTime > 0.25) this.model.setAnim('idle');
    this.model.update(dt, moveSpeed);
    this.syncModel();
  }

  update(dt: number, ctx: EnemyContext): void {
    this.justDied = false;
    if (this.slowLeft > 0) this.slowLeft -= dt;
    if (this.weakLeft > 0) this.weakLeft -= dt;
    if (ctx.level) this.scaleTo(ctx.level);
    this.timer += dt;
    this.cooldown -= dt;
    if (this.swims) { this.updateSwimmer(dt, ctx); return; }
    if (this.def.anchored) {
      // On its post: it rocks when struck, and a few seconds' peace makes it whole
      // (and the first time its ground is there, it stands on it: it was set down before the land was)
      if (!this.planted && this.world.isLoaded(this.pos.x, this.pos.z)) { const y = this.world.groundBelow(this.pos.x, 140, this.pos.z, true); if (y > 0) { this.pos.y = this.home.y = y; this.planted = true; } }
      this.calm += dt;
      if (this.hp < this.def.hp && this.calm > 6) this.hp = this.def.hp;
      this.model.update(dt, 0);
      this.syncModel();
      return;
    }
    const def = this.def;
    const toPlayer = new THREE.Vector3().subVectors(ctx.player, this.pos);
    const distP = Math.hypot(toPlayer.x, toPlayer.z);
    const distHome = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z);
    let moveSpeed = 0;

    // Knockback and gravity
    if (this.knock.lengthSq() > 0.001) {
      const kx = this.knock.x * dt, kz = this.knock.z * dt;
      const fy = this.canStand(this.pos.x + kx, this.pos.z + kz, this.pos.y + 0.1);
      if (fy !== null) { this.pos.x += kx; this.pos.z += kz; }
      this.knock.multiplyScalar(Math.exp(-dt * 8));
    }
    const ground = this.world.groundBelow(this.pos.x, this.pos.y + 0.6, this.pos.z, !this.swims);
    if (this.pos.y > ground + 0.01) {
      this.vy -= 25 * dt;
      this.pos.y = Math.max(ground, this.pos.y + this.vy * dt);
    } else {
      this.vy = 0;
      this.pos.y = ground;
    }

    // Stunned: stands dazed, any wind-up lost
    // Holding still for its own big move: it faces where it means to strike and gathers itself
    if (this.hold > 0 && this.state !== 'dead') {
      this.hold -= dt;
      this.telegraph.visible = false;
      if (this.state === 'windup' || this.state === 'attack') { this.state = 'chase'; this.cooldown = Math.max(this.cooldown, 0.4); }
      this.yaw = this.holdYaw;
      this.model.setAnim('windup');
      this.model.update(dt, 0);
      this.syncModel();
      return;
    }
    if (this.stun > 0 && this.state !== 'dead') {
      this.stun -= dt;
      this.telegraph.visible = false;
      if (this.state === 'windup' || this.state === 'attack') { this.state = 'chase'; this.cooldown = Math.max(this.cooldown, 0.6); }
      this.model.setAnim('hit');
      this.model.update(dt, 0);
      this.syncModel();
      return;
    }
    switch (this.state) {
      case 'dead':
        this.respawnIn -= dt;
        if (this.timer > 2.5) this.model.root.position.y -= dt * 0.6;
        if (this.respawnIn <= 0) {
          this.hp = def.hp;
          this.pos.copy(this.home);
          this.state = 'idle';
          this.model.setAnim('idle');
          this.timer = 0;
          this.enraged = false;
          this.attacks = 0;
        }
        this.model.update(dt, 0);
        if (this.timer <= 2.5) this.syncModel();
        this.model.root.visible = this.respawnIn > 0 ? this.timer < 5 : true;
        return;
      case 'idle':
      case 'wander': {
        if (ctx.playerAlive && distP < def.aggro && Math.abs(toPlayer.y) < 4) {
          this.state = 'chase';
          ctx.sound(voiceOf(def.model ?? def.type, 'aggro'), this.pos);
          break;
        }
        if (this.state === 'idle' && this.timer > 2 + Math.random() * 4) {
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
          this.wanderTarget.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          this.state = 'wander';
          this.timer = 0;
        }
        if (this.state === 'wander') {
          const moved = this.stepToward(this.wanderTarget.x, this.wanderTarget.z, def.speed * 0.35, dt);
          moveSpeed = moved ? def.speed * 0.35 : 0;
          if (!moved || this.timer > 6) { this.state = 'idle'; this.timer = 0; }
        }
        break;
      }
      case 'chase': {
        if (!ctx.playerAlive || distHome > def.leash) { this.state = 'return'; break; }
        if (distP <= def.range * (def.attack === 'charge' ? 0.9 : 0.85) && this.cooldown <= 0) {
          this.state = 'windup';
          this.timer = 0;
          // A boss's every fourth attack is its signature: a wide circle round it, slow to come
          this.attacks++;
          this.signature = this.isBoss && this.attacks % SIGNATURE.every === 0;
          this.teleOutline.visible = this.teleFill.visible = !this.signature;
          this.bigRing.visible = this.bigFill.visible = this.signature;
          if (this.signature) { this.bigRing.scale.setScalar(this.signatureRadius); ctx.sound('growl', this.pos); }
          this.attackOrigin.copy(def.attack === 'throw' && !this.signature ? ctx.player : this.pos);
          this.attackDir.set(toPlayer.x, 0, toPlayer.z).normalize();
          this.yaw = Math.atan2(this.attackDir.x, this.attackDir.z);
          this.telegraph.visible = true;
          this.model.setAnim('windup');
          break;
        }
        // A thrower stands off at about half its throw; the rest come in close
        const keep = def.attack === 'throw' ? def.range * 0.5 : def.range * 0.6;
        const pace = def.speed * (this.enraged ? 1.15 : 1) * (this.slowLeft > 0 ? 0.67 : 1);
        if (distP > keep) {
          const moved = this.stepToward(ctx.player.x, ctx.player.z, pace, dt);
          moveSpeed = moved ? pace : 0;
        } else this.yaw = Math.atan2(toPlayer.x, toPlayer.z);
        break;
      }
      case 'windup': {
        const k = Math.min(1, this.timer / this.windupTime);
        if (def.attack !== 'slam') {
          // Lunges track the player a little during windup; charges lock direction.
          if (def.attack === 'lunge' && k < 0.6) {
            this.attackDir.set(toPlayer.x, 0, toPlayer.z).normalize();
            this.yaw = Math.atan2(this.attackDir.x, this.attackDir.z);
          }
        }
        this.teleFill.scale.setScalar(Math.max(0.01, k));
        if (def.attack !== 'slam' && def.attack !== 'throw') this.teleFill.scale.set(1, 1, Math.max(0.01, k));
        if (def.attack === 'throw') this.yaw = Math.atan2(this.attackOrigin.x - this.pos.x, this.attackOrigin.z - this.pos.z);
        this.bigFill.scale.setScalar(Math.max(0.01, k) * this.signatureRadius);
        // The fill reddens and thickens as it comes, and flashes pale in the last moment: that's the cue to roll
        if (k > 0.82) { this.fillMat.color.copy(FILL_NOW); this.fillMat.opacity = 0.6; }
        else { this.fillMat.color.copy(FILL_FROM).lerp(FILL_TO, k); this.fillMat.opacity = 0.28 + k * 0.22; }
        if (this.timer >= this.windupTime) {
          this.state = 'attack';
          this.timer = 0;
          this.hitDone = false;
          if (def.attack !== 'throw' || this.signature) this.attackOrigin.copy(this.pos);
          else if (this.shotMesh) { this.shotFrom.copy(this.pos).sub(this.attackOrigin).setY(this.pos.y - this.attackOrigin.y + 1.4); this.shotMesh.visible = true; }
          this.model.setAnim('attack');
          ctx.sound('swing', this.pos);
        }
        break;
      }
      case 'attack': {
        const dur = this.signature ? 0.5 : def.attack === 'charge' ? def.range / 13 : def.attack === 'lunge' ? 0.26 : def.attack === 'throw' ? 0.6 : 0.45;
        // The shot in flight: an arc from the hand down into the circle
        if (this.shotMesh?.visible) {
          const t = Math.min(1, this.timer / 0.5);
          this.shotMesh.position.copy(this.shotFrom).multiplyScalar(1 - t).setY(this.shotFrom.y * (1 - t) + Math.sin(t * Math.PI) * 2.2);
          if (t >= 1) this.shotMesh.visible = false;
        }
        if (this.signature) {
          if (!this.hitDone && this.timer > 0.2) {
            this.hitDone = true;
            if (ctx.playerAlive && !ctx.playerInvulnerable && distP < this.signatureRadius && Math.abs(toPlayer.y) < 2.5) ctx.hitPlayer(def.damage * SIGNATURE.damage, this);
            ctx.splash?.(this.pos, this.signatureRadius, def.damage * SIGNATURE.damage, this);
            ctx.sound('squelch', this.pos);
          }
        } else if (def.attack === 'charge' || def.attack === 'lunge') {
          const speed = def.attack === 'charge' ? 13 : (def.range * 0.95) / 0.26;
          this.stepToward(this.pos.x + this.attackDir.x, this.pos.z + this.attackDir.z, speed, dt);
          moveSpeed = speed;
          // Hit test against the strip swept so far
          if (!this.hitDone && ctx.playerAlive && !ctx.playerInvulnerable) {
            const rel = new THREE.Vector3().subVectors(ctx.player, this.attackOrigin);
            const along = rel.x * this.attackDir.x + rel.z * this.attackDir.z;
            const side = Math.abs(rel.x * this.attackDir.z - rel.z * this.attackDir.x);
            const reach = Math.hypot(this.pos.x - this.attackOrigin.x, this.pos.z - this.attackOrigin.z) + 0.9;
            if (along > -0.3 && along < reach && side < 1.0 && Math.abs(rel.y) < 2) {
              this.hitDone = true;
              ctx.hitPlayer(def.damage, this);
            }
          }
        } else if (def.attack === 'throw') {
          // It lands in the circle, wherever you are now
          if (!this.hitDone && this.timer > 0.5) {
            this.hitDone = true;
            const r = def.blast ?? 1.8, o = this.attackOrigin;
            if (ctx.playerAlive && !ctx.playerInvulnerable && Math.hypot(ctx.player.x - o.x, ctx.player.z - o.z) < r && Math.abs(ctx.player.y - o.y) < 2) ctx.hitPlayer(def.damage, this);
            ctx.splash?.(o, r, def.damage, this);
            ctx.sound('squelch', o);
          }
        } else if (!this.hitDone && this.timer > 0.4) {
          this.hitDone = true;
          if (ctx.playerAlive && !ctx.playerInvulnerable && distP < def.range && Math.abs(toPlayer.y) < 2) ctx.hitPlayer(def.damage, this);
          ctx.splash?.(this.pos, def.range, def.damage, this);
          ctx.sound('squelch', this.pos);
        }
        if (this.timer >= dur) {
          this.state = 'recover';
          this.timer = 0;
          this.cooldown = def.cooldown * (this.enraged ? 0.65 : 1) * (this.signature ? 1.4 : 1);
          this.telegraph.visible = false;
          this.signature = false;
          this.model.setAnim('idle');
        }
        break;
      }
      case 'recover':
        if (this.timer > 0.55) { this.state = 'chase'; this.timer = 0; }
        break;
      case 'return': {
        const moved = this.stepToward(this.home.x, this.home.z, def.speed * 0.8, dt);
        moveSpeed = moved ? def.speed * 0.8 : 0;
        this.hp = Math.min(def.hp, this.hp + def.hp * dt * 0.5);
        if (distHome < 1 || !moved) {
          if (!moved) this.pos.copy(this.home);
          this.state = 'idle';
          this.timer = 0;
          this.hp = def.hp;
        }
        break;
      }
    }

    if (this.state === 'chase' || this.state === 'wander' || this.state === 'return') this.model.setAnim(moveSpeed > 0.1 ? (moveSpeed > def.speed * 0.6 ? 'run' : 'walk') : 'idle');
    else if (this.state === 'idle') this.model.setAnim('idle');
    if (this.model.anim === 'hit' && this.model.animTime > 0.25) this.model.setAnim('idle');
    this.model.update(dt, moveSpeed);
    this.syncModel();
  }

  private syncModel(): void {
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = this.yaw;
    if (this.swims) this.model.root.rotation.x = this.state === 'dead' ? 0 : -this.pitch;
    // The hit punch: wide and low for a moment, then back
    if (this.punch > 0.001) {
      this.punch *= 0.82;
      this.model.root.scale.set(1 + this.punch, 1 - this.punch * 0.7, 1 + this.punch);
    } else if (this.model.root.scale.x !== 1) this.model.root.scale.setScalar(1);
    if (this.telegraph.visible) {
      this.telegraph.position.set(this.attackOrigin.x, this.attackOrigin.y + 0.06, this.attackOrigin.z);
      this.telegraph.rotation.y = this.def.attack === 'slam' || this.def.attack === 'throw' ? 0 : Math.atan2(this.attackDir.x, this.attackDir.z) + Math.PI;
      if (this.state === 'windup' && (this.def.attack === 'slam' || this.signature)) this.telegraph.position.copy(this.pos).setY(this.pos.y + 0.06);
      if (this.signature) this.telegraph.rotation.y = 0;
      // In the water the warning hangs at the creature's own depth, tilted along the line of its rush
      if (this.swims) {
        this.telegraph.position.copy(this.state === 'windup' ? this.pos : this.attackOrigin).setY((this.state === 'windup' ? this.pos.y : this.attackOrigin.y) + this.swimH * 0.5);
        const D = this.attackDir3;
        this.telegraph.rotation.x = this.def.attack === 'slam' ? 0 : Math.atan2(D.y, Math.hypot(D.x, D.z));
      }
    }
  }
}
