import * as THREE from 'three';
import type { FestivalDef } from '../data/festivals';
import { utcDay } from '../data/calendar';
import { ITEMS } from '../data/items';
import { BOOTHS, FACES, FAIR, FAIR_GAMES, PATCH_PICKS, PRIZE_PLAYS, giantWeight, prizeFor, type FairGameId } from '../data/wakeFair';
import type { VoxelWorld } from '../world/VoxelWorld';
import { B, isLeaves } from '../world/blocks';
import * as P from '../world/props';
import type { Particles } from '../systems/Particles';
import type { Sfx } from '../systems/Audio';
import type { MapMarker } from '../ui/Hud';

// The Wake Fair at Hollin Ford (data/wakeFair.ts): built on the meadow east of the bridge while the
// Lantern Wake is on and you're near, and taken down when it isn't. The games are played here: the
// fair folk start them from their conversations (data/content/wakefair.ts), or you step up to a booth.
// Each game is a little overlay with one button (Space, E or a click), played out on the booth in
// front of you: rings fly onto pumpkins, lanterns go over, the judge's scale swings.

export interface FairHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  particles: Particles;
  /** Points the world's lamp pool lights at night (shared with the festival stalls). */
  lamps: THREE.Vector3[];
  fest(): FestivalDef | null;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  give(item: string, n?: number): boolean;
  take(item: string, n?: number): boolean;
  count(item: string): number;
  marks(): number;
  addMarks(n: number): void;
  system(t: string): void;
  banner(title: string, sub: string): void;
  sound(n: Sfx): void;
  player(): THREE.Vector3;
}

interface DayState { day: number; plays: Partial<Record<FairGameId, number>>; guessed?: number; picked: number[]; best: Partial<Record<FairGameId, number>> }

/** A game in progress, and what's on the overlay. */
interface Run {
  game: FairGameId;
  paid: boolean;
  score: number;
  /** Rings, balls, or seconds left. */
  left: number;
  phase: number;
  /** Waiting for a throw to land before the next. */
  wait: number;
  over: boolean;
  // hoop-la: the pumpkin aimed at and the mark on the swing
  target?: number; band?: [number, number];
  // apples: the apple's angle, the mouth's width, breath
  angle?: number; mouth?: number; breath?: number;
  el: HTMLElement;
}

const ROW_POINTS = [1, 2, 3];
const SPEEDS = { hoopla: 3.1, shy: 2.3 };

export class WakeFair {
  private group: THREE.Group | null = null;
  private picks: (THREE.Object3D | null)[] = [];
  /** The hoop-la pumpkins' stalk tops, near row first: [x, y, z, row]. */
  private hoopTargets: [number, number, number, number][] = [];
  private lanterns: { obj: THREE.Group; base: THREE.Vector3; down: number; fallen: boolean }[] = [];
  private apples: THREE.Mesh[] = [];
  private tub = new THREE.Vector3();
  private flights: { obj: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number; arc: number; then?: () => void }[] = [];
  private thrown: THREE.Object3D[] = [];
  private lamps: THREE.Vector3[] = [];
  private fires: THREE.Vector3[] = [];
  private run: Run | null = null;
  private clock = 0;
  private keys = (e: KeyboardEvent) => this.onKey(e);

  constructor(private host: FairHost) {}

  /** The Wake is on: the fair is up. */
  get on(): boolean { return this.host.fest()?.id === 'lantern'; }
  /** A game is being played: the game holds the player still and keeps the keys. */
  get playing(): boolean { return !!this.run; }

  // ---------------------------------------------------------------- The day's record
  private state(): DayState {
    const s = this.host.flag('wfair') as DayState | undefined, day = utcDay();
    return s && s.day === day ? s : { day, plays: {}, picked: [], best: {} };
  }
  private save(s: DayState): void { this.host.setFlag('wfair', s); }
  playsLeft(game: FairGameId): number { return Math.max(0, PRIZE_PLAYS - (this.state().plays[game] ?? 0)); }
  guessedToday(): boolean { return this.state().guessed !== undefined; }

  markers(): MapMarker[] { return this.on ? [{ x: FAIR.x, z: FAIR.z, kind: 'fair', label: 'The Wake Fair' }] : []; }

  // ---------------------------------------------------------------- Things to press E on
  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    if (!this.group || this.run) return [];
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    const picked = this.state().picked;
    PATCH_PICKS.forEach(([x, z], i) => {
      if (picked.includes(i) || Math.hypot(x - p.x, z - p.z) > 1.8) return;
      out.push({ label: 'Pick a pumpkin', pos: new THREE.Vector3(x, this.gy(x, z) + 0.6, z), use: () => this.pick(i) });
    });
    for (const g of ['hoopla', 'shy', 'apples'] as const) {
      const [sx, sz] = BOOTHS[g].stand;
      if (Math.hypot(sx - p.x, sz - p.z) > 1.6) continue;
      const left = this.playsLeft(g);
      out.push({ label: `${FAIR_GAMES[g].name}${left ? ` (${FAIR_GAMES[g].price} marks)` : ' (for fun)'}`, pos: new THREE.Vector3(sx, this.gy(sx, sz) + 1.2, sz), use: () => this.play(g) });
    }
    return out;
  }

  private pick(i: number): void {
    const s = this.state();
    if (s.picked.includes(i)) return;
    if (!this.host.give('pumpkin', 1)) { this.host.system('No room in your pack for a pumpkin.'); return; }
    s.picked.push(i);
    this.save(s);
    if (Math.random() < 0.25) { this.host.give(this.token(), 1); this.host.system('There was a wake candle tucked under the leaves.'); }
    this.host.sound('pickup');
    if (this.picks[i]) this.picks[i]!.visible = false;
    if (s.picked.length === PATCH_PICKS.length) this.host.system('That\'s the patch picked for today. They\'ll have set out more by morning.');
  }

  private token(): string { return this.host.fest()?.token ?? 'wake_candle'; }

  // ---------------------------------------------------------------- Each frame
  update(dt: number, night: number): void {
    this.clock += dt;
    const p = this.host.player();
    const near = Math.hypot(p.x - FAIR.x, p.z - FAIR.z) < 170;
    if (this.group && (!this.on || !near)) this.takeDown();
    if (!this.group && this.on && near && [[FAIR.x0, FAIR.z0], [FAIR.x1, FAIR.z0], [FAIR.x0, FAIR.z1], [FAIR.x1, FAIR.z1]].every(([x, z]) => this.host.voxels.isLoaded(x, z))) this.build();
    if (!this.group) return;
    // The apples go round in the tub
    this.apples.forEach((a, i) => {
      const t = this.clock * (0.5 + i * 0.07) + i * 1.3;
      a.position.set(this.tub.x + Math.cos(t) * 0.42, this.tub.y + Math.sin(this.clock * 3 + i) * 0.03, this.tub.z + Math.sin(t) * 0.42);
    });
    // Things in the air: rings and balls
    for (const f of [...this.flights]) {
      f.t += dt / f.dur;
      const k = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, k);
      f.obj.position.y += Math.sin(Math.PI * k) * f.arc;
      if (k >= 1) { this.flights.splice(this.flights.indexOf(f), 1); f.then?.(); }
    }
    // Knocked lanterns go over backwards and drop off the rail
    for (const l of this.lanterns) if (l.fallen && l.down < 1) {
      l.down = Math.min(1, l.down + dt * 2.2);
      l.obj.rotation.x = -l.down * 1.6;
      l.obj.position.y = l.base.y - l.down * l.down * 1.1;
    }
    // Brazier sparks after dark
    if (night > 0.3) for (const f of this.fires) if (Math.random() < dt * 5) this.host.particles.fire(f);
    if (this.run) this.tick(this.run, dt);
  }

  private gy(x: number, z: number): number {
    const V = this.host.voxels;
    let y = V.topSolid(x, z);
    while (y > 0 && isLeaves(V.get(Math.floor(x), y, Math.floor(z)))) y--;
    return y + 1;
  }

  private takeDown(): void {
    this.stop();
    this.close();
    if (this.group) this.host.scene.remove(this.group);
    this.group = null;
    for (const l of this.lamps) { const i = this.host.lamps.indexOf(l); if (i >= 0) this.host.lamps.splice(i, 1); }
    this.lamps = []; this.fires = []; this.picks = []; this.lanterns = []; this.apples = []; this.hoopTargets = []; this.flights = []; this.thrown = [];
  }

  // ---------------------------------------------------------------- Putting it up
  private build(): void {
    const M = propMats();
    const root = new THREE.Group();
    const batch = new P.Batcher();
    const put = (g: THREE.Object3D, x: number, z: number, ry = 0, y = this.gy(x, z)) => batch.addGroup(g, P.mat4(x, y, z, ry));
    const mat = (c: string) => P.flat(c);
    const piece = (w: number, h: number, d: number, c: string | THREE.Material, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => {
      const m = new THREE.Mesh(P.box(w, h, d), typeof c === 'string' ? mat(c) : c);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      return m;
    };
    /** A booth's parts in its own frame (front to +z), placed at (x, z) turned ry. */
    const local = (bx: number, bz: number, ry: number, lx: number, lz: number): [number, number] => [bx + lz * Math.sin(ry) + lx * Math.cos(ry), bz + lz * Math.cos(ry) - lx * Math.sin(ry)];
    const lamp = (x: number, y: number, z: number) => { const v = new THREE.Vector3(x, y, z); this.lamps.push(v); this.host.lamps.push(v); };
    const tones = ['#e8801e', '#d86a14', '#f0962a', '#e8c890', '#c8641a', '#5a7a3a', '#e8801e'];

    // ---- The bunting round the meadow, on posts each with a lantern on top, open at the north for the gate
    const ring: [number, number][] = [];
    for (let x = FAIR.x0; x <= FAIR.x1; x += 6) ring.push([x, FAIR.z0]);
    for (let z = FAIR.z0 + 6; z <= FAIR.z1; z += 6) ring.push([FAIR.x1, z]);
    for (let x = FAIR.x1 - 6; x >= FAIR.x0; x -= 6) ring.push([x, FAIR.z1]);
    for (let z = FAIR.z1 - 6; z > FAIR.z0; z -= 6) ring.push([FAIR.x0, z]);
    const posts = ring.filter(([x, z]) => !(z === FAIR.z0 && Math.abs(x - FAIR.x) < 4));
    const cloth = ['#e8701a', '#5b3a8a', '#2a2420', '#d8c8a0'];
    posts.forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.add(piece(0.16, 3.1, 0.16, '#3a2a1c', 0, 1.55, 0));
      const j = P.jackOLantern(i % 6, 0.7, tones[i % tones.length]); j.position.y = 3.1; g.add(j);
      put(g, x, z, Math.atan2(FAIR.x - x, FAIR.z - z));
    });
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      if ((az === FAIR.z0 && bz === FAIR.z0 && Math.abs((ax + bx) / 2 - FAIR.x) < 4)) continue; // the gate
      if (!posts.some(([x, z]) => x === ax && z === az) || !posts.some(([x, z]) => x === bx && z === bz)) continue;
      const ya = this.gy(ax, az) + 2.85, yb = this.gy(bx, bz) + 2.85, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      const g = new THREE.Group();
      // The line sags between the posts; a flag hangs from it every tenth of the way
      const yAt = (t: number) => ya + (yb - ya) * t - Math.sin(Math.PI * t) * 0.5;
      for (let k = 0; k < 10; k++) {
        const t0 = k / 10, t1 = (k + 1) / 10, dy = yAt(t1) - yAt(t0);
        g.add(piece(0.025, 0.025, Math.hypot(len / 10, dy) + 0.02, '#d8ccb0', 0, (yAt(t0) + yAt(t1)) / 2, ((t0 + t1) / 2) * len, 0, -Math.atan2(dy, len / 10)));
        if (k > 0) g.add(piece(0.02, 0.3, 0.26, cloth[(k + i) % cloth.length], 0, yAt(t0) - 0.17, t0 * len));
      }
      put(g, ax, az, ry, 0);
    }

    // ---- The gate: two posts and a beam hung with lanterns, hay and pumpkins at its feet, the fair's board
    {
      const gx = FAIR.x, gz = FAIR.z0, y = this.gy(gx, gz), g = new THREE.Group();
      for (const s of [-2.6, 2.6]) { g.add(piece(0.3, 4.2, 0.3, '#3a2a1c', s, 2.1, 0)); g.add(piece(1.4, 0.8, 0.9, '#d8b860', s * 1.25, 0.4, 0.9)); }
      g.add(piece(6.2, 0.3, 0.32, '#3a2a1c', 0, 4.05, 0));
      g.add(piece(5.4, 0.24, 0.12, '#5b3a8a', 0, 3.72, 0.12));
      for (const lx of [-1.8, -0.6, 0.6, 1.8]) { g.add(piece(0.02, 0.45, 0.02, '#8a7a5a', lx, 3.6, 0)); const t = P.carvedTurnip(true); t.position.set(lx, 3.0, 0); g.add(t); }
      for (const [lx, lz, f, s] of [[-3.6, 1.2, 0, 1.2], [3.5, 1.3, 3, 1.1], [-2.9, 1.9, 5, 0.8], [3.0, 2.0, 1, 0.9]] as const) { const j = P.jackOLantern(f, s); j.position.set(lx, 0, lz); j.rotation.y = 0.3 * lx; g.add(j); }
      put(g, gx, gz, Math.PI, y);
      put(P.standingSign(M, 'The Wake Fair\nHollin Ford'), gx - 4.6, gz - 1.4, Math.PI);
      lamp(gx, y + 3.2, gz);
    }

    // ---- Hoop-la: a striped booth, a counter, and the pumpkins on a stepped table behind it
    {
      const b = BOOTHS.hoopla, y = this.gy(b.x, b.z), g = new THREE.Group();
      this.boothFrame(g, piece, 4.4, 3.4, ['#e8701a', '#f2e6c8']);
      g.add(piece(4.0, 1.0, 0.7, '#6a4a2a', 0, 0.5, 1.3));
      g.add(piece(4.2, 0.1, 0.9, '#3a2a1c', 0, 1.05, 1.3));
      for (const [lz, h] of [[0.4, 0.75], [-0.4, 1.05], [-1.2, 1.35]] as const) g.add(piece(3.6, h, 0.8, '#5a3a24', 0, h / 2, lz));
      [0.4, -0.4, -1.2].forEach((lz, row) => {
        const h = [0.75, 1.05, 1.35][row];
        for (const lx of [-1.15, 0, 1.15]) {
          const s = 0.75 - row * 0.08, pk = P.pumpkin(tones[(row * 3 + Math.round(lx + 1)) % 5], s);
          pk.position.set(lx, h, lz); g.add(pk);
          const [wx, wz] = local(b.x, b.z, b.ry, lx, lz);
          this.hoopTargets.push([wx, y + h + 0.5 * s, wz, row]);
        }
      });
      // Rings waiting on a peg
      for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 5, 14), mat('#c8a050')); r.position.set(1.9, 1.3 - k * 0.05, 1.25); r.rotation.x = Math.PI / 2; g.add(r); }
      put(g, b.x, b.z, b.ry, y);
      const [sx, sz] = local(b.x, b.z, b.ry, -2.9, 2.2);
      put(P.standingSign(M, 'Hoop-la\nFive rings, two marks'), sx, sz, b.ry);
      lamp(b.x, y + 2.6, b.z);
    }

    // ---- The lantern shy: six lanterns on posts along a rail, a cloth behind, a rope to throw from
    {
      const b = BOOTHS.shy, y = this.gy(b.x, b.z), g = new THREE.Group();
      g.add(piece(7.6, 3.4, 0.12, '#3a2a40', 0, 1.7, -1.6));
      for (const lx of [-3.8, 3.8]) g.add(piece(0.2, 3.8, 0.2, '#3a2a1c', lx, 1.9, -1.6));
      g.add(piece(7.8, 0.24, 0.3, '#5b3a8a', 0, 3.5, -1.55));
      g.add(piece(7.0, 0.12, 0.2, '#3a2a1c', 0, 1.15, -0.6));
      for (let k = 0; k < 6; k++) g.add(piece(0.1, 1.15, 0.1, '#3a2a1c', -2.75 + k * 1.1, 0.58, -0.6));
      for (const lx of [-3.4, 3.4]) g.add(piece(0.12, 1.0, 0.12, '#3a2a1c', lx, 0.5, 2.6));
      g.add(piece(6.8, 0.04, 0.04, '#a88b5a', 0, 0.92, 2.6));
      // A bucket of balls by the rope
      g.add(piece(0.5, 0.45, 0.5, '#6a4a2a', 3.0, 0.22, 2.2));
      for (let k = 0; k < 5; k++) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#e8dcc0')); ball.position.set(2.85 + (k % 3) * 0.12, 0.5, 2.1 + (k >> 1) * 0.1); g.add(ball); }
      put(g, b.x, b.z, b.ry, y);
      for (let k = 0; k < 6; k++) {
        const [wx, wz] = local(b.x, b.z, b.ry, -2.75 + k * 1.1, -0.6);
        const o = k % 2 ? P.jackOLantern(k, 0.62) : P.carvedTurnip(true);
        o.position.set(wx, y + 1.21, wz);
        o.rotation.y = b.ry;
        root.add(o);
        this.lanterns.push({ obj: o, base: o.position.clone(), down: 0, fallen: false });
      }
      const [sx, sz] = local(b.x, b.z, b.ry, -4.6, 2.8);
      put(P.standingSign(M, 'The Lantern Shy\nSix balls, two marks'), sx, sz, b.ry);
      lamp(b.x, y + 2.4, b.z);
    }

    // ---- Apples in a tub on a trestle, towels hung on the end
    {
      const b = BOOTHS.apples, y = this.gy(b.x, b.z), g = new THREE.Group();
      g.add(piece(2.2, 0.6, 1.2, '#6a4a2a', 0, 0.3, 0));
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.add(piece(0.22, 0.7, 0.08, '#7a5232', Math.cos(a) * 0.62, 0.95, Math.sin(a) * 0.62, -a + Math.PI / 2)); }
      g.add(piece(1.24, 0.06, 1.24, '#3a2a1c', 0, 0.62, 0));
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 16), P.flat('#4a6a8a'));
      water.position.set(0, 1.2, 0); g.add(water);
      for (const dy of [0.75, 1.15]) g.add(piece(1.36, 0.06, 1.36, '#3a3a3c', 0, dy, 0));
      g.add(piece(0.06, 0.5, 0.5, '#e8dcc0', 1.1, 0.75, 0.3));
      g.add(piece(0.4, 0.4, 0.4, '#a85a2a', -0.9, 0.8, -0.35));
      for (let k = 0; k < 4; k++) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), P.flat('#b82a1e')); a.position.set(-0.98 + (k % 2) * 0.14, 1.05, -0.42 + (k >> 1) * 0.14); g.add(a); }
      put(g, b.x, b.z, b.ry, y);
      this.tub.set(b.x, y + 1.25, b.z);
      for (let k = 0; k < 6; k++) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 6), P.flat(k % 3 ? '#c8301e' : '#8ab030')); root.add(a); this.apples.push(a); }
      const [sx, sz] = local(b.x, b.z, b.ry, 2.2, 0.8);
      put(P.standingSign(M, 'Bob for Apples\nTwo marks a go'), sx, sz, b.ry);
    }

    // ---- The giant pumpkin on its cart, the scale on its tripod, the judge's table and ledger
    {
      const b = BOOTHS.guess, y = this.gy(b.x, b.z), g = new THREE.Group();
      g.add(piece(3.2, 0.2, 2.4, '#6a4a2a', 0, 0.75, 0));
      for (const lx of [-1.0, 1.0]) for (const lz of [-1.25, 1.25]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12), P.flat('#4a3220')); w.rotation.x = Math.PI / 2; w.position.set(lx, 0.45, lz); g.add(w); }
      g.add(piece(0.12, 0.12, 1.4, '#3a2a1c', 2.2, 0.6, 0, 0, 0, 0.2));
      // (squat, as a giant one sits under its own weight)
      const giant = P.pumpkin('#e07018', 4.2); giant.position.set(0, 0.85, 0); giant.scale.y = 0.72; g.add(giant);
      // A rosette on it: first in the Wend
      g.add(piece(0.04, 0.34, 0.34, '#2f528f', 1.3, 1.6, 0)); g.add(piece(0.05, 0.16, 0.16, '#f2d75a', 1.32, 1.6, 0));
      // The tripod and the steelyard, at the cart's far end
      const [tx, tz] = [2.9, 0.4];
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; g.add(piece(0.1, 3.6, 0.1, '#5a3a24', tx + Math.cos(a) * 0.55, 1.7, tz + Math.sin(a) * 0.55, 0, Math.sin(a) * 0.16, -Math.cos(a) * 0.16)); }
      g.add(piece(1.6, 0.08, 0.08, '#3a3a3c', tx, 3.0, tz));
      g.add(piece(0.02, 0.8, 0.02, '#8a7a5a', tx - 0.6, 2.6, tz));
      g.add(piece(0.5, 0.06, 0.5, '#6a4a2a', tx - 0.6, 2.2, tz));
      g.add(piece(0.3, 0.3, 0.06, '#e8e0c8', tx, 2.78, tz + 0.06));
      // The judge's table at the cart's near end, a ledger open on it (Ida sits behind it: data/content/wakefair.ts)
      g.add(piece(1.8, 0.75, 0.8, '#6a4a2a', -2.4, 0.375, 1.2));
      g.add(piece(0.6, 0.04, 0.42, '#efe6cf', -2.5, 0.78, 1.2));
      g.add(piece(0.04, 0.02, 0.3, '#2a2a2c', -2.1, 0.8, 1.2, 0.4));
      put(g, b.x, b.z, b.ry, y);
      const [sx, sz] = local(b.x, b.z, b.ry, 2.4, 3.1);
      put(P.standingSign(M, 'Guess the Weight\nOne guess a day'), sx, sz, b.ry);
      lamp(b.x, y + 2.8, b.z);
    }

    // ---- The carver's trestle: three finished faces, knives, a pile of tops and seeds
    {
      const b = BOOTHS.carve, y = this.gy(b.x, b.z), g = new THREE.Group();
      g.add(piece(2.6, 0.08, 0.9, '#7a5232', 0, 0.82, 0));
      for (const lx of [-1.1, 1.1]) for (const lz of [-0.32, 0.32]) g.add(piece(0.08, 0.82, 0.08, '#3a2a1c', lx, 0.41, lz));
      [0, 3, 4].forEach((f, k) => { const j = P.jackOLantern(f, 0.7); j.position.set(-0.8 + k * 0.8, 0.86, 0.05); g.add(j); });
      g.add(piece(0.3, 0.02, 0.04, '#9aa0a8', 0.5, 0.88, 0.32, 0.5)); g.add(piece(0.12, 0.03, 0.05, '#3a2a1c', 0.33, 0.88, 0.25, 0.5));
      for (let k = 0; k < 4; k++) g.add(piece(0.2, 0.05, 0.2, '#d86a14', -1.9 + (k % 2) * 0.14, 0.05 + k * 0.05, 0.2 - (k >> 1) * 0.15));
      g.add(piece(0.6, 0.35, 0.4, '#6a4a2a', 1.6, 0.18, 0.2));
      put(g, b.x, b.z, b.ry, y);
      const [sx, sz] = local(b.x, b.z, b.ry, -2.2, 0.8);
      put(P.standingSign(M, 'Carving\nBring your own pumpkin'), sx, sz, b.ry);
    }

    // ---- The patch: rows of dug earth, vines, pumpkins everywhere, a scarecrow; ten for picking
    {
      // A block of row at a time, each on the ground where it is (the meadow isn't quite level)
      for (let z = 218; z <= 227; z += 2) for (let x = 217; x <= 230; x++) {
        const g = new THREE.Group();
        g.add(piece(1.02, 0.12, 1.1, '#3a2a1c', 0, 0.04, 0));
        g.add(piece(0.9, 0.05, 0.16, x % 2 ? '#4a6a2a' : '#3f5a26', 0, 0.11, Math.sin(x * 1.7 + z) * 0.25, x * 0.5));
        if ((x + z) % 2 === 0) g.add(piece(0.34, 0.03, 0.34, '#5a7a3a', 0.2, 0.12, Math.cos(x * 2.3 + z) * 0.3, x));
        put(g, x + 0.5, z);
      }
      for (let k = 0; k < 26; k++) {
        const x = 217.6 + ((k * 5.3) % 13), z = 218 + ((k * 3.7) % 9.5);
        if (PATCH_PICKS.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.1)) continue;
        put(P.pumpkin(tones[k % tones.length], 0.55 + ((k * 7) % 5) * 0.12), x, z, k * 0.9);
      }
      PATCH_PICKS.forEach(([x, z], i) => {
        const o = P.pumpkin(tones[i % 5], 0.85 + (i % 3) * 0.1);
        o.position.set(x, this.gy(x, z), z); o.rotation.y = i * 1.3;
        root.add(o);
        this.picks[i] = o;
      });
      const picked = this.state().picked;
      for (const i of picked) if (this.picks[i]) this.picks[i]!.visible = false;
      put(P.scarecrow(M), 224, 222.5, 0.4);
    }

    // ---- The middle: a brazier, hay bales to sit on, more lanterns
    {
      const x = FAIR.x, z = 214, y = this.gy(x, z), g = new THREE.Group();
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; g.add(piece(0.08, 1.0, 0.08, '#2a2a2c', Math.cos(a) * 0.35, 0.5, Math.sin(a) * 0.35)); }
      g.add(piece(0.8, 0.3, 0.8, '#2a2a2c', 0, 1.05, 0));
      g.add(piece(0.6, 0.12, 0.6, '#ff8a30', 0, 1.22, 0));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; g.add(piece(1.3, 0.55, 0.65, '#d8b860', Math.cos(a) * 3, 0.28, Math.sin(a) * 3, -a)); const j = P.jackOLantern(k, 0.6); j.position.set(Math.cos(a) * 3.9, 0, Math.sin(a) * 3.9); j.rotation.y = -a + Math.PI / 2; g.add(j); }
      put(g, x, z, 0, y);
      this.fires.push(new THREE.Vector3(x, y + 1.3, z));
      lamp(x, y + 1.6, z);
    }

    const baked = batch.build();
    root.add(baked);
    this.group = root;
    this.host.scene.add(root);
  }

  /** A booth's frame: four posts and a striped awning, sloping to the front. */
  private boothFrame(g: THREE.Group, piece: (w: number, h: number, d: number, c: string, x: number, y: number, z: number, ry?: number, rx?: number) => THREE.Mesh, w: number, h: number, stripes: string[]): void {
    for (const sx of [-w / 2, w / 2]) for (const sz of [-1.6, 1.7]) g.add(piece(0.14, h + (sz > 0 ? 0 : 0.4), 0.14, '#3a2a1c', sx, (h + (sz > 0 ? 0 : 0.4)) / 2, sz));
    const n = Math.round(w / 0.5);
    for (let i = 0; i < n; i++) {
      g.add(piece(w / n + 0.01, 0.06, 3.7, stripes[i % 2], -w / 2 + (i + 0.5) * (w / n), h + 0.2, 0.05, 0, 0.11));
      g.add(piece(w / n + 0.01, 0.34, 0.04, stripes[i % 2], -w / 2 + (i + 0.5) * (w / n), h - 0.12, 1.92));
    }
  }

  // ---------------------------------------------------------------- Playing
  /** Step up to a game (from a fair hand's conversation, or the booth). */
  play(game: FairGameId): void {
    if (!this.on || !this.group || this.run) return;
    if (game === 'guess') { this.openGuess(); return; }
    if (game === 'carve') { this.openCarve(); return; }
    const price = FAIR_GAMES[game].price, paid = this.playsLeft(game) > 0;
    if (paid && this.host.marks() < price) { this.host.system(`${FAIR_GAMES[game].name} is ${price} marks a go.`); this.host.sound('fail'); return; }
    if (paid) this.host.addMarks(-price);
    this.host.sound('coin');
    const el = this.overlay(FAIR_GAMES[game].name, FAIR_GAMES[game].how + (paid ? '' : ' (You\'ve had your prizes today: this one\'s for fun.)'));
    const run: Run = { game, paid, score: 0, left: game === 'hoopla' ? 5 : game === 'shy' ? 6 : 25, phase: Math.random() * 6, wait: 0, over: false, el };
    if (game === 'hoopla') this.nextTarget(run);
    if (game === 'shy') for (const l of this.lanterns) { l.fallen = false; l.down = 0; l.obj.rotation.x = 0; l.obj.position.copy(l.base); l.obj.visible = true; }
    if (game === 'apples') { run.angle = 0; run.mouth = 0.4; run.breath = 1; }
    this.run = run;
    this.draw(run);
    window.addEventListener('keydown', this.keys, true);
  }

  private overlay(title: string, how: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'fg';
    el.innerHTML = `<div class="fg-card"><div class="fg-h"><b>${title}</b><span class="fg-score"></span></div><div class="fg-play"></div><div class="fg-how">${how}</div><div class="fg-keys">Space, E or click to throw · Esc to stop</div></div>`;
    el.querySelector('.fg-play')!.addEventListener('pointerdown', (e) => { e.preventDefault(); this.act(); });
    document.body.append(el);
    return el;
  }

  /** Leave whatever's open: a game in play ends with the score it has. */
  private stop(): void {
    const run = this.run;
    if (!run) return;
    if (run.over || run.game === 'guess' || run.game === 'carve') this.close();
    else this.finish(run, true);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.run) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.stop(); return; }
    // (the guess box and the carver's faces have their own keys: typing a number isn't a throw)
    if (this.run.game === 'guess' || this.run.game === 'carve') return;
    if (this.run.over) { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); this.close(); } return; }
    if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) this.act(); }
  }

  private nextTarget(run: Run): void {
    const r = Math.random(), row = r < 0.5 ? 0 : r < 0.83 ? 1 : 2;
    const col = Math.floor(Math.random() * 3);
    run.target = row * 3 + col;
    const w = [0.24, 0.15, 0.09][row], c = 0.18 + Math.random() * 0.64;
    run.band = [c - w / 2, c + w / 2];
  }

  /** The one button: throw a ring, throw a ball, duck for an apple. */
  private act(): void {
    const run = this.run;
    if (!run || run.over || run.wait > 0) return;
    const P0 = this.host.player(), hand = new THREE.Vector3(P0.x, P0.y + 1.35, P0.z);
    if (run.game === 'hoopla' && run.left > 0) {
      const m = (Math.sin(run.phase) + 1) / 2, [a, b] = run.band!, hit = m >= a && m <= b;
      const [tx, ty, tz, row] = this.hoopTargets[run.target!];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 5, 14), P.flat('#c8a050'));
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(hand);
      this.group!.add(ring); this.thrown.push(ring);
      const miss = new THREE.Vector3((Math.random() - 0.5) * 0.9, -0.3, (Math.random() - 0.5) * 0.9);
      const to = hit ? new THREE.Vector3(tx, ty - 0.12, tz) : new THREE.Vector3(tx, ty, tz).add(miss);
      run.left--; run.wait = 0.9;
      this.host.sound('swing');
      this.flights.push({ obj: ring, from: hand, to, t: 0, dur: 0.6, arc: 1.1, then: () => {
        if (hit) { run.score += ROW_POINTS[row]; this.host.sound('clink'); this.host.particles.burst(new THREE.Vector3(tx, ty, tz), '#ffd070', 10); }
        else this.host.sound('click');
        this.draw(run);
      } });
      if (run.left > 0) this.nextTarget(run);
    } else if (run.game === 'shy' && run.left > 0) {
      const c = (Math.sin(run.phase) + 1) / 2, slot = Math.min(5, Math.floor(c * 6)), off = c * 6 - slot - 0.5;
      const L = this.lanterns[slot], hit = Math.abs(off) < 0.32 && !L.fallen;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), P.flat('#e8dcc0'));
      ball.position.copy(hand);
      this.group!.add(ball); this.thrown.push(ball);
      const to = L.base.clone().add(new THREE.Vector3(0, 0.25, 0));
      if (!hit) to.add(new THREE.Vector3(0, 0.7 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6));
      run.left--; run.wait = 0.55;
      this.host.sound('swing');
      this.flights.push({ obj: ball, from: hand, to, t: 0, dur: 0.38, arc: 0.4, then: () => {
        ball.visible = false;
        if (hit) { run.score++; L.fallen = true; this.host.sound('hit'); this.host.particles.burst(to, '#ffb040', 12); }
        else this.host.sound('click');
        this.draw(run);
      } });
    } else if (run.game === 'apples') {
      // The apple is in your mouth's reach when it's at the bottom of the tub, within the mouth's width
      const a = ((run.angle! % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), d = Math.abs(a - Math.PI / 2);
      if (run.breath! < 0.18) { this.host.sound('fail'); return; }
      run.wait = 0.5;
      this.host.particles.splash(this.tub.clone(), 10);
      this.host.sound('splash');
      if (d < run.mouth!) { run.score++; run.breath! -= 0.16; run.mouth = Math.max(0.16, run.mouth! - 0.035); run.angle! += 1.5 + Math.random() * 2; this.host.sound('bite'); }
      else run.breath! -= 0.3;
      this.draw(run);
    }
  }

  private tick(run: Run, dt: number): void {
    if (run.over) return;
    run.wait = Math.max(0, run.wait - dt);
    if (run.game === 'hoopla') run.phase += dt * SPEEDS.hoopla;
    if (run.game === 'shy') run.phase += dt * (SPEEDS.shy + (6 - run.left) * 0.3);
    if (run.game === 'apples') {
      run.left -= dt;
      run.angle! += dt * (1.5 + Math.sin(this.clock * 0.7) * 0.5);
      run.breath = Math.min(1, run.breath! + dt * 0.09);
      if (run.left <= 0) { run.left = 0; this.finish(run); return; }
    }
    if ((run.game === 'hoopla' || run.game === 'shy') && run.left <= 0 && run.wait <= 0 && !this.flights.length) { this.finish(run); return; }
    this.draw(run);
  }

  /** The overlay's moving parts for the game in hand. */
  private draw(run: Run): void {
    const play = run.el.querySelector('.fg-play') as HTMLElement, score = run.el.querySelector('.fg-score') as HTMLElement;
    if (run.over) return;
    if (run.game === 'hoopla') {
      const m = (Math.sin(run.phase) + 1) / 2, [a, b] = run.band!, row = Math.floor(run.target! / 3);
      score.textContent = `Rings ${run.left} · Points ${run.score}`;
      play.innerHTML = `<div class="fg-target">${run.left > 0 ? ['The near row: one point', 'The middle row: two points', 'The back row: three points'][row] : 'Last ring\'s in the air...'}</div><div class="fg-meter"><i class="fg-band" style="left:${a * 100}%;width:${(b - a) * 100}%"></i><i class="fg-needle" style="left:${m * 100}%"></i></div>`;
    } else if (run.game === 'shy') {
      const c = (Math.sin(run.phase) + 1) / 2;
      score.textContent = `Balls ${run.left} · Down ${run.score}`;
      play.innerHTML = `<div class="fg-shy">${this.lanterns.map((l) => `<span class="${l.fallen ? 'down' : ''}"></span>`).join('')}<i class="fg-sight" style="left:${c * 100}%"></i></div>`;
    } else if (run.game === 'apples') {
      const a = run.angle!, r = 46, ax = 60 + Math.cos(a) * r, ay = 60 + Math.sin(a) * r, w = (run.mouth! * 180) / Math.PI;
      score.textContent = `${Math.ceil(run.left)}s · Apples ${run.score}`;
      play.innerHTML = `<div class="fg-tub"><i class="fg-mouth" style="--w:${w * 2}deg"></i><i class="fg-apple" style="left:${ax}px;top:${ay}px"></i></div><div class="fg-breath"><i style="width:${run.breath! * 100}%"></i><span>Breath</span></div>`;
    }
  }

  private finish(run: Run, quit = false): void {
    if (run.over) { this.close(); return; }
    run.over = true;
    const s = this.state();
    if (run.paid) s.plays[run.game] = (s.plays[run.game] ?? 0) + 1;
    s.best[run.game] = Math.max(s.best[run.game] ?? 0, run.score);
    this.save(s);
    const lines: string[] = [];
    const scoreText = run.game === 'hoopla' ? `${run.score} points` : run.game === 'shy' ? `${run.score} of 6 down` : `${run.score} apple${run.score === 1 ? '' : 's'}`;
    if (run.paid) lines.push(...this.award(run.game, run.score));
    else lines.push('No prize on a free go, but Dilly\'s keeping count.');
    const play = run.el.querySelector('.fg-play') as HTMLElement;
    play.innerHTML = `<div class="fg-result"><b>${quit ? 'Stopped: ' : ''}${scoreText}</b>${lines.map((l) => `<p>${l}</p>`).join('')}<p class="fg-best">Your best today: ${s.best[run.game]}</p></div><div class="fg-btns"><button class="fg-again">${this.playsLeft(run.game) ? `Again (${FAIR_GAMES[run.game].price} marks)` : 'Again (for fun)'}</button><button class="fg-done">Done</button></div>`;
    (run.el.querySelector('.fg-keys') as HTMLElement).textContent = 'Enter to close';
    play.querySelector('.fg-again')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); const g = run.game; this.close(); this.play(g); });
    play.querySelector('.fg-done')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.close(); });
    // The shy's lanterns stand up again for the next comer, the rings come off
    setTimeout(() => { for (const l of this.lanterns) if (!this.run || this.run.game !== 'shy') { l.fallen = false; l.down = 0; l.obj.rotation.x = 0; l.obj.position.copy(l.base); } }, 2500);
  }

  /** Hand over a game's prize; the lines that say what it was. */
  private award(game: FairGameId, score: number, off = 1): string[] {
    const pz = prizeFor(game, score, off), out: string[] = [];
    if (pz.candles) { this.host.give(this.token(), pz.candles); out.push(`${pz.candles} wake candle${pz.candles === 1 ? '' : 's'}.`); }
    if (pz.item && this.host.give(pz.item, 1)) out.push(`And ${ITEMS[pz.item]?.name.toLowerCase() ?? pz.item}.`);
    if (pz.hatChance && Math.random() < pz.hatChance && !this.host.flag('hat:pumpkin') && !this.host.count('hat_pumpkin') && this.host.give('hat_pumpkin', 1)) {
      out.push('And the top prize off the pole: a pumpkin head, carved and lit!');
      this.host.banner('The top prize!', 'A pumpkin head, to wear');
      this.host.sound('discover');
    } else if (pz.candles >= 4) this.host.sound('coin');
    if (!out.length) out.push('Nothing this time. Everyone says the next go is the lucky one.');
    return out;
  }

  private close(): void {
    if (!this.run) return;
    this.run.el.remove();
    this.run = null;
    window.removeEventListener('keydown', this.keys, true);
    for (const o of this.thrown) setTimeout(() => o.parent?.remove(o), 4000);
    this.thrown = [];
  }

  // ---------------------------------------------------------------- The giant pumpkin and the carver
  private openGuess(): void {
    if (this.guessedToday()) { this.host.system('You\'ve had your guess today. Ida has a new one on the cart every morning.'); return; }
    const el = this.overlay('The Giant Pumpkin', FAIR_GAMES.guess.how);
    el.querySelector('.fg-keys')!.textContent = 'Enter to guess · Esc to leave it';
    const play = el.querySelector('.fg-play') as HTMLElement;
    play.innerHTML = `<div class="fg-guess"><input type="number" min="1" max="5000" placeholder="Pounds"><button>Guess</button></div>`;
    const input = play.querySelector('input') as HTMLInputElement;
    const run: Run = { game: 'guess', paid: true, score: 0, left: 0, phase: 0, wait: 0, over: false, el };
    this.run = run;
    window.addEventListener('keydown', this.keys, true);
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.code === 'Enter') submit(); if (e.code === 'Escape') this.close(); });
    const submit = () => {
      const g = Math.round(Number(input.value));
      if (!g || g < 1) { input.focus(); return; }
      const w = giantWeight(utcDay()), off = Math.abs(g - w) / w;
      const s = this.state(); s.guessed = g; this.save(s);
      run.over = true;
      const said = off <= 0.02 ? 'Ida looks at you over her spectacles. "Have you been at my scale?"' : off <= 0.1 ? '"Close," says Ida, and writes your name in the book.' : off <= 0.2 ? '"Not bad. Not good either."' : '"Bless you," says Ida, which is not the same as well done.';
      play.innerHTML = `<div class="fg-result"><p>Ida hangs the pumpkin from the steelyard and slides the weight along.</p><b>${w} pounds. You said ${g}.</b><p>${said}</p>${this.award('guess', 0, off).map((l) => `<p>${l}</p>`).join('')}</div><div class="fg-btns"><button class="fg-done">Done</button></div>`;
      play.querySelector('.fg-done')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.close(); });
      this.host.sound('bell');
    };
    play.querySelector('button')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); submit(); });
    setTimeout(() => input.focus(), 30);
  }

  private openCarve(): void {
    const n = this.host.count('pumpkin');
    if (!n) { this.host.system('Gil needs a pumpkin to carve. There are some in the patch you can pick.'); return; }
    const el = this.overlay('Carving', FAIR_GAMES.carve.how);
    el.querySelector('.fg-keys')!.textContent = 'Click a face · Esc to leave it';
    const play = el.querySelector('.fg-play') as HTMLElement;
    play.innerHTML = `<div class="fg-faces">${FACES.map((f, i) => `<button data-f="${i}">${faceSvg(i)}<span>${f}</span></button>`).join('')}</div><div class="fg-how">Pumpkins in your pack: ${n}</div>`;
    const run: Run = { game: 'carve', paid: false, score: 0, left: 0, phase: 0, wait: 0, over: false, el };
    this.run = run;
    window.addEventListener('keydown', this.keys, true);
    play.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (run.over) return;
      const f = Number((b as HTMLElement).dataset.f);
      if (!this.host.take('pumpkin', 1)) { this.close(); return; }
      if (!this.host.give('furn_pumpkin', 1)) { this.host.give('pumpkin', 1); this.host.system('No room in your pack for it.'); this.close(); return; }
      run.over = true;
      this.host.sound('chop');
      play.innerHTML = `<div class="fg-result"><p>Gil turns it in his hands, finds the face that was already in it, and cuts it out in about a minute: ${FACES[f].toLowerCase()}. He drops a candle stub in and hands it back.</p><b>A jack-o'-lantern, for your house.</b></div><div class="fg-btns">${this.host.count('pumpkin') ? '<button class="fg-again">Carve another</button>' : ''}<button class="fg-done">Done</button></div>`;
      play.querySelector('.fg-again')?.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); this.close(); this.openCarve(); });
      play.querySelector('.fg-done')!.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); this.close(); });
    }));
  }
}

/** A carved face as a little drawing, for the carver's choices (the same six as props.jackOLantern). */
function faceSvg(f: number): string {
  const g = 'fill="#ffb040"';
  const faces = [
    `<polygon ${g} points="14,26 22,26 18,18"/><polygon ${g} points="34,26 42,26 38,18"/><polygon ${g} points="26,32 30,32 28,28"/><path ${g} d="M14 37 H42 L38 44 H18 Z"/>`,
    `<circle ${g} cx="18" cy="23" r="4"/><circle ${g} cx="38" cy="23" r="4"/><ellipse ${g} cx="28" cy="39" rx="5" ry="6"/>`,
    `<polygon ${g} points="12,20 24,25 22,28 12,24"/><polygon ${g} points="44,20 32,25 34,28 44,24"/><rect ${g} x="17" y="37" width="22" height="3"/><rect ${g} x="15" y="38" width="3" height="6"/><rect ${g} x="38" y="38" width="3" height="6"/>`,
    `<rect ${g} x="15" y="20" width="6" height="5"/><rect ${g} x="35" y="20" width="6" height="5"/><rect ${g} x="13" y="33" width="30" height="11"/><path fill="#c8641a" d="M16 33h4v4h-4zM24 33h4v4h-4zM32 33h4v4h-4zM20 40h4v4h-4zM28 40h4v4h-4zM36 40h4v4h-4z"/>`,
    `<polygon ${g} points="12,24 24,21 24,25 12,26"/><polygon ${g} points="44,24 32,21 32,25 44,26"/><polygon ${g} points="26,31 30,31 28,28"/><path ${g} d="M20 36 L28 40 L36 36 L36 39 L28 43 L20 39 Z"/>`,
    `<polygon ${g} points="14,26 22,26 18,18"/><rect ${g} x="33" y="23" width="10" height="2"/><path ${g} d="M14 38 L42 34 L43 38 L16 43 Z"/>`,
  ];
  return `<svg viewBox="0 0 56 56" width="52" height="52"><ellipse cx="28" cy="31" rx="24" ry="20" fill="#e8801e"/><path d="M8 31 Q28 4 48 31" fill="none" stroke="#c8641a" stroke-width="2"/><rect x="26" y="6" width="4" height="7" fill="#5a5a26"/>${faces[f % 6]}</svg>`;
}

let mats: P.PropMaterials | null = null;
const propMats = () => (mats ??= P.createPropMaterials());
void B;
