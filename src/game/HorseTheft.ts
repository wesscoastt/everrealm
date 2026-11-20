import * as THREE from 'three';
import { Humanoid, type Appearance } from '../entities/humanoid';
import { mountModel, type CreatureModel, type MountLook } from '../entities/creatures';
import { riderLift } from '../entities/seats';
import type { Roadfolk } from './Roadfolk';

// Horse theft (owner 2026-11-20: "add a way to steal horses from citizens or guards and you get wanted and have to
// escape and change your clothing or hair etc to lose them like GTA 6, add a pulling them off animation").
//
// Walk up beside anyone riding past (the riders on the roads and the mounted watch: game/Roadfolk.ts) and take hold:
// you reach up and drag them down by the belt, they go over the horse's side and hit the road, and you swing up into
// the saddle they've left. It's theft from a townsman, and from one of the watch it's a blow at the watch itself; the
// town writes it down, with how you looked and the horse (game/Justice.ts), and the watch comes after you, the mounted
// one at a gallop. Lose them: ride out of reach, or get down off the horse somewhere out of their sight and change
// your clothes, your hat or your hair (the pack's Outfits). The thrown rider picks themself up and shouts the road
// down. A stolen horse left standing wanders off home after a while.
//
// The rider off the road is for you only: Roadfolk is on the realm's clock, and everyone else still sees them ride on.

/** What a horse is worth to the book, stolen from a townsman (one of the watch's is a blow at the watch). */
export const HORSE_PRICE = 180;
/** How long a thrown rider is off the road (realm seconds), and how long a horse you leave stands before it goes home. */
const OFF_ROAD = 600, LEFT_STANDS = 90;
/** How far out from the horse a thrown rider lands. */
const LAND = 2.3;

const SHOUTS = { folk: ['Thief! Horse thief!', 'Stop! That\'s my horse!', 'Watch! Somebody, the watch!'], watch: ['You\'ll hang for that!', 'After them! They\'ve got my horse!', 'Horse thief! Stop!'] };
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export interface HorseTheftHost {
  scene: THREE.Scene;
  roadfolk: Roadfolk;
  player: { position: THREE.Vector3; locked: boolean; faceTowards(x: number, z: number): void };
  /** The player's own figure, for the reach and the pull. */
  pose(state: 'yank' | null, secs: number): void;
  /** Up into the saddle of a horse that isn't yours. */
  rideStolen(model: CreatureModel, look: MountLook): void;
  /** The crime written in the book of the town that has the road (a townsman's horse, or one of the watch's). */
  crime(guard: boolean, at: THREE.Vector3, town: string | undefined): void;
  ground(x: number, z: number, fromY: number): number;
  say(pos: THREE.Vector3, h: number, text: string): void;
  sfx(name: string, vol?: number): void;
  system(text: string): void;
}

interface Pull {
  t: number;
  rider: Humanoid;
  horse: CreatureModel;
  look: MountLook;
  guard: boolean;
  town?: string;
  /** Where they land: the side you pulled them from. */
  side: THREE.Vector3;
  from: THREE.Vector3;
  yaw: number;
  mounted: boolean;
  shouted: boolean;
  /** After they're up: running (from you, or after you on foot), until they fade. */
  run: number;
}

export class HorseTheft {
  private pull: Pull | null = null;
  /** Thrown riders still on their feet nearby, and horses left standing. */
  private afoot: { man: Humanoid; vel: THREE.Vector3; t: number }[] = [];
  private left: { horse: CreatureModel; t: number }[] = [];

  constructor(private host: HorseTheftHost) {}

  get busy(): boolean { return !!this.pull && this.pull.t < 1.0; }
  /** The horse being pulled out from under its rider just now, as the watch would tell it (written down with the crime). */
  get pendingKey(): string | null { return this.pull ? HorseTheft.keyOf(this.pull.look) : null; }
  static keyOf(m: MountLook): string { return [m.coat, m.mane, m.cloth].join('/'); }

  /** Riders you could pull down from where you stand, for the interact prompt. */
  candidates(P: THREE.Vector3): { label: string; sub: string; pos: THREE.Vector3; use: () => void; warn: string }[] {
    if (this.pull) return [];
    return this.host.roadfolk.ridersNear(P, 3.4).filter((r) => r.moving < 6).map((r) => ({
      label: r.guard ? 'Pull the watchman down and take the horse' : 'Pull the rider down and take the horse',
      sub: r.guard ? 'A blow at the watch' : 'Horse theft',
      pos: new THREE.Vector3(r.pos.x, r.pos.y + 2.2, r.pos.z),
      use: () => this.start(r.id),
      warn: r.guard ? 'That\'s one of the watch. They\'ll come for you with blades out.' : 'The town will want you for it. Lose them, then change your look.',
    }));
  }

  private start(id: string): void {
    const P = this.host.player.position;
    const u = this.host.roadfolk.unseat(id, OFF_ROAD);
    if (!u) return;
    // The horse stands where it was, stopped short; the rider still astride, for a moment
    const horse = mountModel(u.horse);
    const y = this.host.ground(u.pos.x, u.pos.z, u.pos.y + 2);
    horse.root.position.set(u.pos.x, y, u.pos.z);
    horse.root.rotation.y = u.yaw;
    horse.setAnim('idle');
    const rider = new Humanoid(u.look as Appearance);
    rider.setState('ride');
    rider.straddle = horse.girth;
    rider.root.position.set(u.pos.x, y + riderLift(u.horse), u.pos.z);
    rider.root.rotation.y = u.yaw;
    this.host.scene.add(horse.root, rider.root);
    // They come down on your side of the horse
    // (over the horse's flank on your side, square to the way it faces, and clear of it)
    const right = new THREE.Vector3(Math.cos(u.yaw), 0, -Math.sin(u.yaw));
    const toYou = right.multiplyScalar((P.x - u.pos.x) * right.x + (P.z - u.pos.z) * right.z < 0 ? -1 : 1);
    this.pull = { t: 0, rider, horse, look: u.horse, guard: u.guard, town: u.town, side: toYou, from: rider.root.position.clone(), yaw: u.yaw, mounted: false, shouted: false, run: 0 };
    this.host.player.faceTowards(u.pos.x, u.pos.z);
    this.host.player.locked = true;
    this.host.pose('yank', 1.1);
    this.host.sfx('grunt', 0.7);
  }

  update(dt: number): void {
    const p = this.pull;
    if (p) {
      p.t += dt;
      const R = p.rider.root;
      if (p.t < 0.35) {
        // Your hand on their belt: they lean, startled, toward you
        R.rotation.z = -Math.sign(1) * 0.15 * (p.t / 0.35);
        p.rider.update(dt, 0);
      } else if (p.t < 1.0) {
        // Over the horse's side and down: a quarter-turn and a drop, and a step out to where they land
        if (!p.shouted) { p.shouted = true; this.host.sfx('hitHeavy', 0.6); this.host.crime(p.guard, p.from, p.town); p.horse.setAnim('hit'); }
        const k = (p.t - 0.35) / 0.65, e = k * k;
        const ground = this.host.ground(p.from.x + p.side.x * LAND, p.from.z + p.side.z * LAND, p.from.y + 2);
        R.position.set(p.from.x + p.side.x * LAND * k, p.from.y + (ground + 0.2 - p.from.y) * e + Math.sin(k * Math.PI) * 0.35, p.from.z + p.side.z * LAND * k);
        // (falling sideways, away from the horse: roll about the line along the horse)
        const along = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
        R.quaternion.setFromAxisAngle(along, -Math.sign(p.side.x * along.z - p.side.z * along.x || 1) * (Math.PI / 2) * e).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw));
        p.rider.setState('hit');
        p.rider.update(dt, 0);
        if (k > 0.55 && !p.mounted) {
          // Up into the saddle they've left
          p.mounted = true;
          this.host.player.locked = false;
          p.horse.setAnim('idle');
          this.host.rideStolen(p.horse, p.look);
        }
      } else if (p.t < 2.6) {
        // Flat on the road, winded
        p.rider.setState('dead');
        p.rider.update(dt, 0);
        if (p.t - dt < 1.0) { this.host.sfx('land', 0.7); R.rotation.set(0, p.yaw + Math.PI / 2, 0); R.position.y = this.host.ground(R.position.x, R.position.z, R.position.y + 2); }
      } else {
        // Up, and shouting the road down; then off after help (or after you, if they're the watch)
        R.rotation.set(0, R.rotation.y, 0);
        p.rider.setState('idle');
        this.host.say(R.position, 2.3, pick(p.guard ? SHOUTS.watch : SHOUTS.folk));
        const P = this.host.player.position;
        const away = new THREE.Vector3(R.position.x - P.x, 0, R.position.z - P.z).normalize().multiplyScalar(p.guard ? -5.2 : 4.4);
        this.afoot.push({ man: p.rider, vel: away, t: p.guard ? 5 : 7 });
        this.pull = null;
      }
    }
    // Thrown riders running off (or after you) until they're out of the picture
    for (let i = this.afoot.length - 1; i >= 0; i--) {
      const a = this.afoot[i], R = a.man.root;
      a.t -= dt;
      R.position.x += a.vel.x * dt; R.position.z += a.vel.z * dt;
      R.position.y += (this.host.ground(R.position.x, R.position.z, R.position.y + 2) - R.position.y) * Math.min(1, dt * 10);
      R.rotation.y = Math.atan2(a.vel.x, a.vel.z);
      a.man.setState('run');
      a.man.update(dt, 5);
      if (a.t <= 0) { this.host.scene.remove(R); this.afoot.splice(i, 1); }
    }
    // A horse left standing grazes a while, then goes home
    for (let i = this.left.length - 1; i >= 0; i--) {
      const l = this.left[i];
      l.t -= dt;
      l.horse.update(dt, 0);
      if (l.t <= 0) { this.host.scene.remove(l.horse.root); this.left.splice(i, 1); }
    }
  }

  /** You got down off a stolen horse: it stands where you left it, grazing, and goes home after a while. */
  leave(horse: CreatureModel): void {
    horse.setAnim('graze');
    this.left.push({ horse, t: LEFT_STANDS });
  }
}
