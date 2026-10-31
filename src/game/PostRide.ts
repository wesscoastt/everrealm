import * as THREE from 'three';
import { mountModel, type CreatureModel, type MountLook } from '../entities/creatures';
import { Humanoid, type Appearance } from '../entities/humanoid';
import { passengerSeat, riderLift, type Seat } from '../entities/seats';
import { VoxelWorld } from '../world/VoxelWorld';
import { POST_CART, POST_RIDER_SEAT } from '../data/postStations';
import { lanePath, standAt } from './lanes';

/** Headroom a cart needs over the road, the tilt and the cage's roof included (blocks). */
const ROOM = 4;
export { rideMinutes, roadNet, wayLength } from '../world/roadNet';

// The Charter Post as a ride: pay the carter at a post sign and the cart takes you there in real time,
// along the Charter's roads (and through the towns by their streets: data/postLegs.ts), the country
// going by. It's slow, and it's cheap; a waymark is quick and dear. Get off whenever you like.

type Pt = [number, number];

/** The Charter's post cart: an open carrier's cart in the Charter's blue behind a bay, so you see the country go by. */
export const CART: MountLook = POST_CART;
export const CARTER: Appearance = {
  frame: 'm', facial: 3, top: 2, shirt: '#d8d0b8', legs: 0, hose: '#d8d0b8', shoes: 1, brows: 1, freckles: false,
  skin: '#c89070', hair: '#5a4030', hairStyle: 1, eyes: '#3a4a5a', tunic: '#2f528f', trim: '#c8a050', trousers: '#3a3028', boots: '#2a1e14',
  cape: null, lashes: false, apron: false, hat: 'cap', hatColor: '#2a3a5a', build: 1.05, height: 1, age: 0.55,
} as Appearance;
const SPEED = 11, SLOW = 5;

export class PostRide {
  readonly cart: CreatureModel;
  private readonly carter: Humanoid;
  private way: Pt[] = [];
  private cum: number[] = [];
  private s = 0;
  private speed = 0;
  private yaw = 0;
  private readonly pos = new THREE.Vector3();
  /** The road ahead looked over for room every so often; a stretch already found impassable isn't looked at again. */
  private mendT = 0;
  private given = -1;
  active = false;
  /** Where she's bound (a post stop's id). */
  dest = '';

  /** (The watch's wagon to the gaol is driven the same way: game/Justice.ts gives its own cage, constable, seat and pace.) */
  constructor(scene: THREE.Object3D, private readonly voxels: VoxelWorld, private readonly look: MountLook = CART, driver: Appearance = CARTER, private readonly riderSeat = POST_RIDER_SEAT, private readonly top = SPEED) {
    this.cart = mountModel(look);
    this.carter = new Humanoid(driver);
    this.cart.root.visible = this.carter.root.visible = false;
    scene.add(this.cart.root, this.carter.root);
  }

  /** A point along the way, s blocks from its start. */
  private at(s: number, out: THREE.Vector3): THREE.Vector3 {
    const c = this.cum, w = this.way;
    s = Math.max(0, Math.min(c[c.length - 1], s));
    let i = 1;
    while (i < c.length - 1 && c[i] < s) i++;
    const t = (s - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]);
    return out.set(w[i - 1][0] + (w[i][0] - w[i - 1][0]) * t, out.y, w[i - 1][1] + (w[i][1] - w[i - 1][1]) * t);
  }

  start(way: Pt[], y: number, dest: string): void {
    this.way = way;
    this.cum = [0];
    for (let i = 1; i < way.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(way[i][0] - way[i - 1][0], way[i][1] - way[i - 1][1]));
    this.s = 0;
    this.speed = 0;
    this.mendT = 0; this.given = -1;
    this.dest = dest;
    this.pos.set(way[0][0], y, way[0][1]);
    const ahead = this.at(2, new THREE.Vector3());
    this.yaw = Math.atan2(ahead.x - this.pos.x, ahead.z - this.pos.z);
    this.active = true;
    this.cart.root.visible = this.carter.root.visible = true;
    this.place(0);
  }

  end(): void {
    this.active = false;
    this.cart.root.visible = this.carter.root.visible = false;
  }

  /** The length of the way left, in blocks. */
  get left(): number { return this.cum[this.cum.length - 1] - this.s; }

  /** On along the way: easing off for corners and the stop, waiting where the road ahead hasn't loaded. True on arrival. */
  update(dt: number): boolean {
    const total = this.cum[this.cum.length - 1];
    const ahead = this.at(this.s + 14, new THREE.Vector3());
    let want = this.voxels.isLoaded(ahead.x, ahead.z) ? this.top : 0;
    // A sharp bend coming: slow for it
    const a = this.at(this.s + 6, new THREE.Vector3()), b = this.at(this.s + 12, new THREE.Vector3());
    const turn = Math.abs(Math.atan2(Math.sin(Math.atan2(b.x - a.x, b.z - a.z) - this.yaw), Math.cos(Math.atan2(b.x - a.x, b.z - a.z) - this.yaw)));
    if (turn > 0.5) want = Math.min(want, SLOW);
    want = Math.min(want, Math.max(1.2, (total - this.s) * 0.9));
    this.speed += (want - this.speed) * Math.min(1, dt * (want < this.speed ? 2.5 : 0.8));
    this.s = Math.min(total, this.s + this.speed * dt);
    this.mend(dt);
    this.place(dt);
    return this.s >= total - 0.05;
  }

  /**
   * The road map's lines are straight between its points, so where a street bends one can cut a corner through
   * a house, or run under a jettied upper floor or a low bough. Looked over a little way ahead as she goes (where
   * it has loaded): a stretch without room is steered round over the blocks themselves.
   */
  private mend(dt: number): void {
    if ((this.mendT -= dt) > 0) return;
    this.mendT = 0.4;
    const total = this.cum[this.cum.length - 1], V = this.voxels, p = new THREE.Vector3();
    let y = Math.round(this.pos.y), ok = -1, ya = y, blocked = false;
    for (let d = this.s + 2; d < Math.min(total - 1, this.s + 36); d += 1) {
      this.at(d, p);
      if (!V.isLoaded(p.x, p.z)) return;
      const g = standAt(V, Math.floor(p.x), Math.floor(p.z), y, ROOM);
      if (g === null) {
        if (d <= this.given) continue;
        blocked = true;
        continue;
      }
      if (blocked && ok >= 0) { this.detour(ok, d, ya); return; }
      y = g; ok = d; ya = g; blocked = false;
    }
  }

  private detour(sa: number, sb: number, y: number): void {
    const a = this.at(sa, new THREE.Vector3()), b = this.at(sb, new THREE.Vector3());
    const path = lanePath(this.voxels, [a.x, a.z], [b.x, b.z], y, Math.ceil(sb - sa) + 12, ROOM);
    if (!path) { this.given = sb; return; }
    const w = this.way, c = this.cum;
    const before = w.filter((_, i) => c[i] < sa), after = w.filter((_, i) => c[i] > sb);
    this.way = [...before, ...path, ...after];
    this.cum = [0];
    for (let i = 1; i < this.way.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(this.way[i][0] - this.way[i - 1][0], this.way[i][1] - this.way[i - 1][1]));
  }

  private place(dt: number): void {
    const p = this.at(this.s, this.pos), look = this.at(this.s + 3, new THREE.Vector3()), back = this.at(this.s - 1, new THREE.Vector3());
    if (Math.hypot(look.x - back.x, look.z - back.z) > 0.2) {
      const want = Math.atan2(look.x - back.x, look.z - back.z);
      const d = Math.atan2(Math.sin(want - this.yaw), Math.cos(want - this.yaw));
      this.yaw += d * Math.min(1, dt ? dt * 4 : 1);
    }
    // The road under her, a step at a time (and over a bridge's deck)
    const g = this.voxels.groundBelow(p.x, p.y + 2.5, p.z);
    p.y += dt ? (g - p.y) * Math.min(1, dt * 8) : g - p.y;
    const r = this.cart.root;
    r.position.copy(p);
    r.rotation.y = this.yaw;
    this.cart.setAnim(this.speed > 6 ? 'run' : this.speed > 0.3 ? 'walk' : 'idle');
    this.cart.update(dt, this.speed);
    this.carter.root.position.set(p.x, p.y + riderLift(this.look), p.z);
    this.carter.root.rotation.y = this.yaw;
    this.carter.setState('seated');
    this.carter.update(dt, 0);
  }

  /** Where the cart is, and which way she faces (what the realm passes round while you ride her). */
  get where(): { x: number; y: number; z: number; yaw: number } { return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw }; }

  /** Where the passenger sits: on the back bench, the far side. */
  seat(): Seat {
    return passengerSeat(this.look, this.riderSeat, this.pos.x, this.pos.y, this.pos.z, this.yaw)!;
  }
}
