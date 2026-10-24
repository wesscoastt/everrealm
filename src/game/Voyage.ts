import * as THREE from 'three';
import * as P from '../world/props';
import { shipModel } from '../world/ships';
import { SEA } from '../world/terrain';

// A voyage on the Constant, the way WoW's boats cross between its continents: you board at the quay,
// she casts off and stands out to sea with you on her deck (look about as she goes), and somewhere
// past the headland the long crossing passes behind a loading screen. On the far side you come in on
// her from the open sea, she rounds up into the harbour, and you step off onto the quay.
// The lands themselves are separate pages (world/land.ts); the sea between is where they meet.

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

type Leg = { ship: THREE.Group; t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3; heading: number; then: () => void; ease: 'out' | 'in' };

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

  /** In from the open sea to a harbour's berth; `then` when she's tied up. */
  arrive(h: Harbour, then: () => void, secs = 14): void {
    const dir = new THREE.Vector3(Math.sin(h.heading), 0, Math.cos(h.heading));
    const to = new THREE.Vector3(h.berth[0], SEA - 0.14, h.berth[1]);
    this.start({ ship: this.ship(h.heading + Math.PI), t: 0, dur: secs, from: to.clone().addScaledVector(dir, secs * 9), to, heading: h.heading + Math.PI, then, ease: 'in' });
  }

  private start(l: Leg): void {
    if (this.leg) this.host.scene.remove(this.leg.ship);
    this.leg = l;
    this.host.player.locked = true;
    this.place(0);
  }

  /** Ship and passenger where the leg has them at time t. */
  private place(dt: number): void {
    const l = this.leg!;
    const u = Math.min(1, l.t / l.dur);
    // Gathering way out of harbour; losing it coming in
    const k = l.ease === 'out' ? u * u : 1 - (1 - u) * (1 - u);
    const S = l.ship;
    S.position.lerpVectors(l.from, l.to, k);
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
    void dt;
  }

  update(dt: number): void {
    const l = this.leg;
    if (!l) return;
    l.t += dt;
    this.place(dt);
    if (l.t >= l.dur) {
      this.leg = null;
      this.host.player.locked = false;
      // Coming in, she's tied up and stays a moment; going out, the page changes under her
      if (l.ease === 'in') setTimeout(() => this.host.scene.remove(l.ship), 4000);
      l.then();
    }
  }
}
