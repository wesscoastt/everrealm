import * as THREE from 'three';
import { CreatureModel } from '../entities/creatures';
import { COCKY, LANES } from '../data/cockyRoad';

// Cocky Road (owner 2026-11-27, docs/briefs/cocky-road.md): the Henwife's curse turns you into a cockerel and sets you on
// the first lane of the old drove road north of Hollin Ford. Hop a block at a time (W or the up arrow forward, S back,
// A and D across); carts on the roads squash you, the rivers drown you unless you're on a log or a punt, and a log that
// carries you off the edge sweeps you away. Your score is the furthest lane you reach; your best is kept. The lanes are
// real ground (world/sites.ts buildCockyRoad); the traffic is drawn here, only while someone plays, new every run.

export interface CockyHost {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pressed(code: string): boolean;
  banner(title: string, sub: string): void;
  system(text: string): void;
  sfx(name: string): void;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  /** Keep the player (hidden) where the bird is, so the world stays loaded round it. */
  follow(x: number, y: number, z: number): void;
  /** The run is over: the game puts the player back by the Henwife and lifts the curse. */
  ended(score: number, best: number, how: string): void;
}

interface Mover { lane: number; z: number; len: number; v: number; mesh: THREE.Object3D }

const Y = 20; // the road's surface: where the bird stands
const HOP = 0.16; // seconds a hop takes

const mat = (c: string) => new THREE.MeshLambertMaterial({ color: c });
const M = { cart: mat('#7a5230'), hay: mat('#d8b850'), wheel: mat('#3a2a1a'), horse: mat('#5a3a22'), log: mat('#6a4a2a'), bark: mat('#4a3220'), punt: mat('#3a2e24'), pole: mat('#8a6a42') };

export class CockyRoad {
  active = false;
  private bird: CreatureModel | null = null;
  private movers: Mover[] = [];
  private group = new THREE.Group();
  /** The bird: its lane, its place across the road (a float: logs carry it), and its hop. */
  private lane = 0;
  private z = 0;
  private hop: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private score = 0;
  private dying: { t: number; how: string } | null = null;
  private yaw = Math.PI / 2;
  private hud: HTMLDivElement | null = null;
  private camPos = new THREE.Vector3();
  private lastDt = 1 / 60;

  constructor(private host: CockyHost) {}

  get best(): number { return Number(this.host.flag('cocky:best') ?? 0); }

  /** Put the curse on: the bird on the first lane, the traffic on the road. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.lane = 0; this.z = 0; this.score = 0; this.dying = null; this.hop = null;
    const bird = new CreatureModel('chicken', { a: '#c8642a', c: '#2a2a2e' });
    bird.root.scale.multiplyScalar(1.7);
    this.bird = bird;
    this.group.add(bird.root);
    this.buildTraffic();
    this.host.scene.add(this.group);
    this.place();
    this.camPos.copy(this.birdPos()).add(new THREE.Vector3(-7, 8, 0));
    this.makeHud();
    this.host.banner('Cocky Road', `You are a cockerel. Best so far: ${this.best}`);
    this.host.system('Cocky Road: W or the up arrow hops forward, S back, A and D across. Mind the carts, and don\'t fall in the river except onto a log or a punt. Escape gives up.');
  }

  /** Lift the curse and clear the road. */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.host.scene.remove(this.group);
    this.group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.group = new THREE.Group();
    this.movers = [];
    this.bird = null;
    this.hud?.remove(); this.hud = null;
  }

  private x(lane: number): number { return COCKY.x + lane + 0.5; }
  private birdPos(): THREE.Vector3 { return new THREE.Vector3(this.x(this.lane), Y, COCKY.z + 0.5 + this.z); }

  /** Carts on every road, logs and punts on every river: each lane its own speed and gaps, new every run. */
  private buildTraffic(): void {
    const W = COCKY.half + 7; // they come on and go off past the hedges
    LANES.forEach((lane, i) => {
      if (lane.kind === 'grass') return;
      const v = (lane.speed ?? 2) * (0.85 + Math.random() * 0.4) * (lane.dir ?? 1);
      const river = lane.kind === 'river';
      const n = river ? 3 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 3);
      const span = W * 2, start = Math.random() * span;
      for (let k = 0; k < n; k++) {
        const len = river ? 3 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 2);
        const mesh = river ? (Math.random() < 0.3 ? this.punt(len) : this.log(len)) : this.cart(len, v > 0);
        mesh.position.set(this.x(i), river ? Y - 0.35 : Y, 0);
        this.group.add(mesh);
        this.movers.push({ lane: i, z: -W + ((start + (k * span) / n) % span), len, v, mesh });
      }
    });
  }

  private cart(len: number, south: boolean): THREE.Object3D {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, len - 0.4), M.cart); body.position.y = 0.55; g.add(body);
    const hay = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, len - 0.6), M.hay); hay.position.y = 1.05; g.add(hay);
    for (const dz of [-(len / 2 - 0.5), len / 2 - 0.7]) for (const dx of [-0.48, 0.48]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10), M.wheel); w.rotation.z = Math.PI / 2; w.position.set(dx, 0.28, dz); g.add(w);
    }
    // the horse in the shafts, the way it's going
    const horse = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 1.1), M.horse); horse.position.set(0, 0.75, (south ? 1 : -1) * (len / 2 + 0.3)); g.add(horse);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.45), M.horse); head.position.set(0, 1.2, (south ? 1 : -1) * (len / 2 + 0.85)); g.add(head);
    return g;
  }

  private log(len: number): THREE.Object3D {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, len, 10), M.log); m.rotation.x = Math.PI / 2; g.add(m);
    for (const s of [-1, 1]) { const end = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 10), M.bark); end.rotation.x = Math.PI / 2; end.position.z = s * len / 2; g.add(end); }
    return g;
  }

  private punt(len: number): THREE.Object3D {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, len), M.punt); hull.position.y = 0.15; g.add(hull);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), M.pole); pole.position.set(0.3, 1.2, len / 2 - 0.5); pole.rotation.x = 0.3; g.add(pole);
    return g;
  }

  private makeHud(): void {
    const d = document.createElement('div');
    d.id = 'cocky-hud';
    d.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);padding:6px 16px;background:rgba(20,16,12,0.72);color:#f4e8c8;font:600 18px/1.3 Georgia,serif;border:1px solid #c8a050;border-radius:6px;pointer-events:none;z-index:50;text-align:center';
    document.body.appendChild(d);
    this.hud = d;
    this.drawHud();
  }

  private drawHud(): void {
    if (this.hud) this.hud.innerHTML = `Cocky Road &nbsp; <b style="font-size:24px">${this.score}</b> &nbsp; <span style="opacity:.75">best ${Math.max(this.best, this.score)}</span>`;
  }

  /** Where the bird can go: on the road, across its width, and not into a hay bale or a stump. */
  private open(lane: number, z: number): boolean {
    if (lane < 0 || lane >= LANES.length || Math.abs(z) > COCKY.half) return false;
    const L = LANES[lane];
    return L.kind !== 'grass' || !(L.blocks ?? []).includes(Math.round(z));
  }

  private tryHop(dl: number, dz: number): void {
    if (this.hop || this.dying) return;
    const nl = this.lane + dl, nz = Math.round(this.z) + dz;
    this.yaw = dl > 0 ? Math.PI / 2 : dl < 0 ? -Math.PI / 2 : dz > 0 ? 0 : Math.PI;
    if (!this.open(nl, nz)) return;
    const from = this.birdPos();
    this.lane = nl; this.z = LANES[nl].kind === 'river' ? this.z + dz : nz; // (on a log you keep your place on it)
    this.hop = { from, to: this.birdPos(), t: 0 };
    this.host.sfx('step');
    if (this.lane > this.score) { this.score = this.lane; this.drawHud(); }
  }

  private place(): void {
    const b = this.bird; if (!b) return;
    const p = this.hop ? this.hop.from.clone().lerp(this.hop.to, Math.min(1, this.hop.t / HOP)) : this.birdPos();
    if (this.hop) p.y += Math.sin(Math.min(1, this.hop.t / HOP) * Math.PI) * 0.6;
    b.root.position.copy(p);
    b.root.rotation.y = this.yaw;
  }

  /** One frame of the run: the keys, the traffic, the hop, what's under the bird, and the camera. */
  update(dt: number): void {
    if (!this.active || !this.bird) return;
    const H = this.host;
    if (H.pressed('Escape')) { this.die('gave up', true); }
    if (H.pressed('KeyW') || H.pressed('ArrowUp')) this.tryHop(1, 0);
    else if (H.pressed('KeyS') || H.pressed('ArrowDown')) this.tryHop(-1, 0);
    else if (H.pressed('KeyA') || H.pressed('ArrowLeft')) this.tryHop(0, -1);
    else if (H.pressed('KeyD') || H.pressed('ArrowRight')) this.tryHop(0, 1);

    // the traffic: round and round, on past the hedges and back on at the far side
    const W = COCKY.half + 7;
    for (const m of this.movers) {
      m.z += m.v * dt;
      if (m.z > W) m.z -= W * 2; else if (m.z < -W) m.z += W * 2;
      m.mesh.position.z = COCKY.z + 0.5 + m.z;
      m.mesh.visible = Math.abs(m.lane - this.lane) < 30;
    }

    if (this.hop) { this.hop.t += dt; if (this.hop.t >= HOP) this.hop = null; }
    if (!this.dying && !this.hop) this.judge(dt);
    if (this.dying) {
      this.dying.t += dt;
      const k = Math.min(1, this.dying.t / 0.4);
      if (this.dying.how === 'squashed') this.bird.root.scale.y = 1.7 * (1 - 0.85 * k);
      else if (this.dying.how === 'drowned' || this.dying.how === 'swept away') this.bird.root.position.y = Y - 0.9 * k;
      if (this.dying.t > 1.6) this.finish();
    } else this.place();
    this.bird.update(dt, this.hop ? 4 : 0);

    const p = this.bird.root.position;
    H.follow(p.x, Y, p.z);
    this.lastDt = dt;
  }

  /** The camera, after the game's own has had its turn: behind the bird and up, looking down the road ahead. */
  aim(): void {
    if (!this.active || !this.bird) return;
    const p = this.bird.root.position;
    const want = new THREE.Vector3(p.x - 7, Y + 8, p.z + 1.5);
    this.camPos.lerp(want, Math.min(1, this.lastDt * 4));
    this.host.camera.position.copy(this.camPos);
    this.host.camera.lookAt(p.x + 4, Y, p.z);
  }

  /** What's under the bird once it lands: a cart, the water, a log carrying it. */
  private judge(dt: number): void {
    const L = LANES[this.lane];
    const on = this.movers.filter((m) => m.lane === this.lane && Math.abs(m.z - this.z) < m.len / 2 + (L.kind === 'road' ? 0.25 : -0.05));
    if (L.kind === 'road' && on.length) { this.die('squashed'); return; }
    if (L.kind === 'river') {
      if (!on.length) { this.die('drowned'); return; }
      this.z += on[0].v * dt; // carried
      if (Math.abs(this.z) > COCKY.half + 0.5) { this.die('swept away'); return; }
    }
    if (this.lane === LANES.length - 1) this.die('through the far gate');
  }

  private die(how: string, quiet = false): void {
    if (this.dying) return;
    this.dying = { t: quiet ? 1.6 : 0, how };
    this.host.sfx(how === 'through the far gate' ? 'quest' : how === 'squashed' ? 'hit' : 'splash');
  }

  private finish(): void {
    const how = this.dying?.how ?? 'gave up';
    const best = Math.max(this.best, this.score);
    if (best > this.best) this.host.setFlag('cocky:best', best);
    this.host.setFlag('cocky:runs', Number(this.host.flag('cocky:runs') ?? 0) + 1);
    const score = this.score;
    this.stop();
    this.host.ended(score, best, how);
  }
}
