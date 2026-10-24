import * as THREE from 'three';
import * as P from '../world/props';
import { shipModel } from '../world/ships';
import { SEA } from '../world/terrain';

// A voyage on the Constant between the continents: you board at the quay, she casts off and stands out
// to sea with you on her deck, and then she makes the crossing itself over the real sea between the
// lands (it's one world: world/land.ts), round whatever's in the way, the coasts going by (look about as
// she goes). On the far side she comes in from the offing, rounds up into the harbour, and you step off
// onto the quay.

export interface VoyageHost {
  scene: THREE.Scene;
  props: P.PropMaterials;
  player: { position: THREE.Vector3; velocity: THREE.Vector3; yaw: number; locked: boolean; teleport(x: number, y: number, z: number): void };
  sfx(name: string, vol?: number): void;
  banner(title: string, sub: string): void;
}

/** Where a voyage starts and ends at each harbour: the berth, and the way out to the open sea. */
export interface Harbour { berth: [number, number]; heading: number }

/** The deck's height above the sea, and where on it you stand (aft of the mainmast, by the rail). */
const DECK = 2.27, SPOT: [number, number] = [1.6, 0.9];

type Leg = { ship: THREE.Group; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; heading: number; then: () => void; ease: 'out' | 'in' | 'path';
  /** The crossing: the course's corners, the distance to each, and the heading she's turning from. */
  path?: THREE.Vector3[]; cum?: number[]; turn?: number };

/** The crossing's pace: a packet under full sail in the open sea. */
const CROSS_SPEED = 40;

export class Voyage {
  private leg: Leg | null = null;

  constructor(private host: VoyageHost) {}

  get active(): boolean { return !!this.leg; }

  private ship(heading: number): THREE.Group {
    const s = shipModel(this.host.props, 'carrack', { sails: 'set', wale: '#2f4a7a', flag: '#e8e0c8' });
    s.rotation.y = heading - Math.PI / 2;
    this.host.scene.add(s);
    return s;
  }

  /** Cast off from a harbour and stand out to sea; `then` when she's well out (the crossing proper). */
  depart(h: Harbour, then: () => void, secs = 20): void {
    const dir = new THREE.Vector3(Math.sin(h.heading), 0, Math.cos(h.heading));
    const from = new THREE.Vector3(h.berth[0], SEA - 0.14, h.berth[1]);
    this.start({ ship: this.ship(h.heading), t: 0, dur: secs, from, to: from.clone().addScaledVector(dir, secs * 11), heading: h.heading, then, ease: 'out' });
    this.host.sfx('bell', 0.7);
    this.host.banner('The Constant casts off', 'A day and a night at sea');
  }

  /** Where a harbour's own leg begins or ends out at sea: its berth, so far out along its heading. */
  static offing(h: Harbour, far: number): [number, number] {
    return [h.berth[0] + Math.sin(h.heading) * far, h.berth[1] + Math.cos(h.heading) * far];
  }
  /** Departing legs end this far out, arriving ones start this far out (their pace times their time). */
  static readonly OUT = 20 * 11;
  static readonly IN = 14 * 9;

  /** The crossing proper, over the open sea by these points (from one offing to the other); `then` at the last. */
  cross(points: [number, number][], then: () => void): void {
    const path = points.map(([x, z]) => new THREE.Vector3(x, SEA - 0.14, z)), cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
    const prev = this.last;
    const heading = Math.atan2(path[1].x - path[0].x, path[1].z - path[0].z);
    const ship = prev?.ship ?? this.ship(heading);
    this.start({ ship, t: 0, dur: cum[cum.length - 1] / CROSS_SPEED, from: path[0], to: path[path.length - 1], heading, then, ease: 'path', path, cum, turn: prev?.heading ?? heading });
  }
  /** The leg just finished (the ship sails on from it into the next, if there is one). */
  private last: Leg | null = null;

  /** In from the open sea to a harbour's berth; `then` when she's tied up. */
  arrive(h: Harbour, then: () => void, secs = 14): void {
    const dir = new THREE.Vector3(Math.sin(h.heading), 0, Math.cos(h.heading));
    const to = new THREE.Vector3(h.berth[0], SEA - 0.14, h.berth[1]);
    // (the ship that made the crossing comes on in, if there was one)
    const ship = this.last?.ship ?? this.ship(h.heading + Math.PI);
    ship.rotation.y = h.heading + Math.PI - Math.PI / 2;
    this.start({ ship, t: 0, dur: secs, from: to.clone().addScaledVector(dir, secs * 9), to, heading: h.heading + Math.PI, then, ease: 'in' });
  }

  private start(l: Leg): void {
    if (this.leg && this.leg.ship !== l.ship) this.host.scene.remove(this.leg.ship);
    if (this.last && this.last.ship !== l.ship && this.last.ease !== 'in') this.host.scene.remove(this.last.ship);
    this.last = null;
    this.leg = l;
    this.host.player.locked = true;
    this.place(0);
  }

  /** Ship and passenger where the leg has them at time t. */
  private place(dt: number): void {
    const l = this.leg!;
    const u = Math.min(1, l.t / l.dur);
    const S = l.ship;
    if (l.ease === 'path' && l.path && l.cum) {
      // Along the course at a steady pace, turning onto each new leg of it over a few seconds
      const d = u * l.cum[l.cum.length - 1];
      let i = 1;
      while (i < l.cum.length - 1 && l.cum[i] < d) i++;
      const a = l.path[i - 1], b = l.path[i], f = (d - l.cum[i - 1]) / Math.max(1e-6, l.cum[i] - l.cum[i - 1]);
      S.position.lerpVectors(a, b, f);
      const want = Math.atan2(b.x - a.x, b.z - a.z);
      const cur = l.turn ?? want, dh = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
      l.turn = cur + dh * Math.min(1, dt * 0.6);
      l.heading = l.turn;
      S.rotation.y = l.turn - Math.PI / 2;
    } else {
      // Gathering way out of harbour; losing it coming in
      const k = l.ease === 'out' ? u * u : 1 - (1 - u) * (1 - u);
      S.position.lerpVectors(l.from, l.to, k);
    }
    // The swell: a slow pitch and roll, and a rise and fall
    const now = performance.now() / 1000;
    S.position.y = l.from.y + Math.sin(now * 0.9) * 0.18;
    S.rotation.x = Math.sin(now * 0.7) * 0.035;
    S.rotation.z = Math.sin(now * 0.55 + 1) * 0.025;
    // You, on her deck by the rail
    const c = Math.cos(S.rotation.y), s = Math.sin(S.rotation.y);
    const px = S.position.x + SPOT[0] * c + SPOT[1] * s, pz = S.position.z - SPOT[0] * s + SPOT[1] * c;
    const P = this.host.player;
    P.teleport(px, S.position.y + DECK, pz);
    P.velocity.set(0, 0, 0);
    P.yaw = l.heading;
  }

  update(dt: number): void {
    const l = this.leg;
    if (!l) return;
    l.t += dt;
    this.place(dt);
    if (l.t >= l.dur) {
      this.leg = null;
      this.host.player.locked = false;
      // Coming in, she's tied up and stays a moment; out of harbour and across, she sails on into the next leg
      if (l.ease === 'in') setTimeout(() => this.host.scene.remove(l.ship), 4000);
      else this.last = l;
      l.then();
      if (this.last === l) { this.host.scene.remove(l.ship); this.last = null; }
    }
  }
}
