import * as THREE from 'three';
import { Humanoid, type Appearance } from '../entities/humanoid';
import type { MountLook } from '../entities/creatures';
import type { VoxelWorld } from '../world/VoxelWorld';
import { roadNet, wayLength, type Pt } from '../world/roadNet';
import { BOAT_FROM } from '../data/skua';
import { PostRide } from './PostRide';

// The watch's cart going by with someone in the back (owner 2026-11-12: "players can throw apples at criminals
// passing in prison carts"). Now and then, while you're in Ansbury or Gullmouth, the cage cart comes down the
// street with a prisoner in it: in Ansbury on the way to the Weighhouse cells, in Gullmouth down to the south
// jetty and the Charter's boat for Skua Rock. With an apple in your pack you can throw it at them. Most land.
// The prisoner has something to say about it, and the constable on the box has something to say to you.

const CAGE: MountLook = { coat: '#141214', mane: '#0a0a0a', cloth: '#2a3a5a', seats: 5, wagon: { kind: 'cage', bed: 0, paint: '#2a2a30' } };
const SPEED = 4.2;

interface Run { town: string; from: Pt; to: Pt }
/** The streets a cart takes: from the middle of town to where the prisoner is going. */
const RUNS: Run[] = [
  { town: 'Ansbury', from: [880, 300], to: [821.5, 348.5] },
  { town: 'Gullmouth', from: [1692, 600], to: [BOAT_FROM.x, BOAT_FROM.z] },
];

const PRISONER_SAYS = {
  hit: ['Oi! That was a good apple!', 'I\'ll remember your face!', 'Is that the best you can throw?', 'I was framed! Framed!', 'Thank you. I haven\'t eaten since Tuesday.', 'My mother lives on this street!', 'Right in the ear. Lovely.'],
  miss: ['Missed! Ha!', 'You throw like a magistrate.', 'Over here, love. Over here.'],
  ride: ['It was a misunderstanding about a pig.', 'I want my lawyer. I don\'t have a lawyer.', 'Tell my wife I\'m late.'],
};
const CONSTABLE_SAYS = ['Fruit only, friends. Keep it to fruit.', 'Mind the horse.', 'Move along, nothing to see.'];
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export interface PrisonCartHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player: () => THREE.Vector3;
  count(item: string): number;
  take(item: string, n: number): void;
  say(pos: THREE.Vector3, h: number, text: string): void;
  sfx(name: 'swing' | 'hit' | 'click', vol?: number): void;
  burst(pos: THREE.Vector3, color: string, n: number): void;
  /** A look for the prisoner: someone off the streets, a little the worse for wear. */
  prisonerLook(): Appearance;
  constable(): Appearance;
}

interface Flight { mesh: THREE.Mesh; from: THREE.Vector3; t: number; hit: boolean }

export class PrisonCart {
  private cart: PostRide | null = null;
  private prisoner: Humanoid | null = null;
  private run: Run | null = null;
  private next = 20;
  private clock = 0;
  private nextLine = 0;
  private flights: Flight[] = [];
  private readonly appleMat = new THREE.MeshLambertMaterial({ color: '#c8302a' });
  private readonly appleGeo = new THREE.SphereGeometry(0.11, 8, 6);

  constructor(private readonly host: PrisonCartHost) {}

  /** The cart's prisoner's head, for throwing at; null when no cart is going by. */
  private target(): THREE.Vector3 | null {
    if (!this.cart || !this.prisoner) return null;
    return this.prisoner.root.position.clone().setY(this.prisoner.root.position.y + 1.2);
  }

  update(dt: number): void {
    this.clock += dt;
    const P = this.host.player();
    if (!this.cart) {
      if (this.clock < this.next) return;
      const run = RUNS.find((r) => Math.hypot(P.x - r.from[0], P.z - r.from[1]) < 120 || Math.hypot(P.x - r.to[0], P.z - r.to[1]) < 120);
      if (!run) { this.next = this.clock + 10; return; }
      const net = roadNet(), a = net.near(run.from[0], run.from[1]), b = net.near(run.to[0], run.to[1]);
      const way = a.d < 20 && b.d < 20 ? net.route(a.p, b.p) : null;
      if (!way || wayLength(way) < 20 || !this.host.voxels.isLoaded(Math.floor(a.p[0]), Math.floor(a.p[1]))) { this.next = this.clock + 60; return; }
      this.cart = new PostRide(this.host.scene, this.host.voxels, CAGE, this.host.constable(), 0, SPEED);
      this.cart.start(way, this.host.voxels.groundBelow(a.p[0], 90, a.p[1]), 'cart');
      this.prisoner = new Humanoid(this.host.prisonerLook());
      this.prisoner.setState('seated');
      this.host.scene.add(this.prisoner.root);
      this.run = run;
      this.nextLine = this.clock + 8;
      return;
    }
    const done = this.cart.update(dt);
    const st = this.cart.seat();
    this.prisoner!.root.position.set(st.x, st.y, st.z);
    this.prisoner!.root.rotation.y = st.yaw;
    this.prisoner!.update(dt, 0, false);
    // Now and then, to whoever's near
    if (this.clock > this.nextLine) {
      this.nextLine = this.clock + 14 + Math.random() * 10;
      if (this.prisoner!.root.position.distanceTo(P) < 24) this.host.say(this.prisoner!.root.position, 2.2, pick(PRISONER_SAYS.ride));
    }
    this.fly(dt);
    if (done) this.finish();
  }

  /** Gone in at the gaol's door, or down to the boat: the next in a while. */
  private finish(): void {
    this.cart?.end();
    if (this.prisoner) this.host.scene.remove(this.prisoner.root);
    this.cart = null; this.prisoner = null; this.run = null;
    this.next = this.clock + 240 + Math.random() * 240;
  }

  /** Something to do near the cart: throw an apple, if you have one. */
  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const t = this.target();
    if (!t || t.distanceTo(p) > 14 || this.host.count('apples') < 1) return [];
    return [{ label: 'Throw an apple at the prisoner', pos: t.clone().setY(t.y + 0.6), use: () => this.throwApple() }];
  }

  private throwApple(): void {
    const t = this.target();
    if (!t || this.host.count('apples') < 1) return;
    this.host.take('apples', 1);
    const from = this.host.player().clone().setY(this.host.player().y + 1.6);
    const mesh = new THREE.Mesh(this.appleGeo, this.appleMat);
    mesh.position.copy(from);
    this.host.scene.add(mesh);
    this.flights.push({ mesh, from, t: 0, hit: Math.random() < 0.75 });
    this.host.sfx('swing', 0.5);
  }

  private fly(dt: number): void {
    const t = this.target();
    for (const f of [...this.flights]) {
      f.t += dt / 0.6;
      const to = (t ?? f.from).clone();
      if (!f.hit) to.add(new THREE.Vector3(0.9, -1.1, 0.6));
      const k = Math.min(1, f.t);
      f.mesh.position.lerpVectors(f.from, to, k).setY(f.from.y + (to.y - f.from.y) * k + Math.sin(k * Math.PI) * 1.6);
      if (f.t >= 1) {
        this.host.scene.remove(f.mesh);
        this.flights.splice(this.flights.indexOf(f), 1);
        if (!t || !this.prisoner) continue;
        if (f.hit) {
          this.host.burst(f.mesh.position, '#e8d070', 10);
          this.host.sfx('hit', 0.4);
          this.host.say(this.prisoner.root.position, 2.2, pick(PRISONER_SAYS.hit));
          if (Math.random() < 0.3 && this.cart) { const w = this.cart.where; this.host.say(new THREE.Vector3(w.x, w.y, w.z), 2.6, pick(CONSTABLE_SAYS)); }
        } else this.host.say(this.prisoner.root.position, 2.2, pick(PRISONER_SAYS.miss));
      }
    }
  }
}
