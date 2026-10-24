import * as THREE from 'three';
import { HULLS, inFreewater, LANES, pointOfSail, RAIDERS, REVENUE_PRICE, windAt, type Hull, type HullId, type Livery, type RaiderKind } from '../data/naval';
import { B, isSolid } from '../world/blocks';
import { realmNow } from '../world/clock';
import type { PropMaterials } from '../world/props';
import { shipModel, SHIPS } from '../world/ships';
import { SEA } from '../world/terrain';
import type { VoxelWorld } from '../world/VoxelWorld';

// Ships under sail, and fighting them (the ships and the sea lanes: data/naval.ts). You take the helm of
// a ship of your own or a hired one: W and S set and take in sail (furled, fighting sail, all plain sail),
// A and D put the helm over, Q fires the port broadside and E the starboard. The wind is everyone's: run
// before it or reach across it and she flies; point her up into it and she stops. Her guns are on her
// sides, so you fight her by turning her: bring the enemy abeam and fire.
//
// Brethren raiders work the sea lanes and come for any ship that isn't theirs; revenue cutters come for
// captains with a price on them. Out in the Freewater, other players' ships (online: server/naval.mjs)
// can be fired on and fire back. A ship sunk under you goes to the bottom with you swimming; the yard
// will raise her again for a tenth of her worth.

export interface SailingHost {
  scene: THREE.Scene;
  props: PropMaterials;
  voxels: VoxelWorld;
  sfx(name: string, vol?: number): void;
  system(text: string): void;
  banner(title: string, sub: string): void;
  floatAt(pos: THREE.Vector3, h: number, text: string, kind: 'player' | 'enemy' | 'crit'): void;
  /** A raider went down to your guns. */
  sank(kind: RaiderKind, name: string, at: THREE.Vector3): void;
  /** Your ship went down under you, here. */
  lost(at: THREE.Vector3): void;
  /** The largest price on your head in any town's book (the revenue cutters' business). */
  wanted(): number;
  /** Online: your ship's state for the others, a hit you've landed on someone's ship, your ship gone down to someone. */
  sendState?(s: ShipState | null): void;
  sendHit?(name: string, dmg: number): void;
  sendSunk?(by: string | null): void;
}

/** A ship as the realm passes it between players. */
export interface ShipState { hull: HullId; livery: Livery; x: number; z: number; yaw: number; sails: number; hp: number; sinking: boolean }

const SAIL_SET = [0, 0.55, 1];
const V = () => new THREE.Vector3();
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Is the sea open (water at the surface, nothing over it) at a point? Unloaded ground counts as sea. */
function openSea(V: VoxelWorld, x: number, z: number): boolean {
  const ix = Math.floor(x), iz = Math.floor(z);
  if (!V.isLoaded(ix, iz)) return true;
  return V.get(ix, SEA - 1, iz) === B.Water && !isSolid(V.get(ix, SEA, iz));
}

export class Ship {
  readonly root = new THREE.Group();
  private readonly set: THREE.Group;
  private readonly furled: THREE.Group;
  readonly pos = V();
  yaw = 0;
  speed = 0;
  /** 0 furled, 1 fighting sail, 2 all plain sail. */
  sails = 0;
  hp: number;
  /** Seconds to each broadside: [port, starboard]. */
  readonly reload: [number, number] = [0, 0];
  /** Going down: seconds since she started, or -1 afloat. */
  sinking = -1;
  /** A raider's mind; a remote captain's name. */
  npc: { kind: RaiderKind; name: string; flee: boolean; think: number; goal: THREE.Vector3; lane: number } | null = null;
  remote: string | null = null;
  /** Where a remote ship is heading, for smoothing. */
  readonly goal = V();
  goalYaw = 0;

  constructor(M: PropMaterials, readonly hull: Hull, readonly livery: Livery) {
    const o = { hull: livery.hull, wale: livery.wale, sail: livery.sail, name: livery.name.toUpperCase().slice(0, 18) };
    this.set = shipModel(M, hull.kind, { ...o, sails: 'set' });
    this.furled = shipModel(M, hull.kind, { ...o, sails: 'furled' });
    this.root.add(this.set, this.furled);
    this.hp = hull.hp;
    this.show();
  }

  get deck(): number { return SHIPS[this.hull.kind].deck + 0.17; }
  get fwd(): THREE.Vector3 { return tmp.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  /** Starboard: to the right of her heading. */
  side(sd: 1 | -1, out = V()): THREE.Vector3 { return out.set(-Math.cos(this.yaw) * sd, 0, Math.sin(this.yaw) * sd); }
  private show(): void { this.set.visible = this.sails > 0; this.furled.visible = this.sails === 0; }

  setSails(n: number): void { const k = Math.max(0, Math.min(2, n)); if (k !== this.sails) { this.sails = k; this.show(); } }

  /** Under way for dt: the wind on her sails, the helm (turn, -1..1), the land in her way. */
  sail(dt: number, turn: number, V2: VoxelWorld, wind: { dir: number; strength: number }): void {
    const h = this.hull;
    const want = h.speed * SAIL_SET[this.sails] * pointOfSail(wind.dir - this.yaw) * (0.55 + 0.45 * wind.strength);
    this.speed += (want - this.speed) * Math.min(1, dt * (want > this.speed ? 0.3 : 0.6));
    this.yaw += turn * h.turn * dt * (0.3 + 0.7 * Math.min(1, this.speed / h.speed));
    const f = this.fwd, step = this.speed * dt;
    const nx = this.pos.x + f.x * step, nz = this.pos.z + f.z * step;
    const bow = h.len * 0.5 + 0.5, beam = h.beam * 0.5;
    const sx = f.z * beam, sz = -f.x * beam;
    if (openSea(V2, nx + f.x * bow, nz + f.z * bow) && openSea(V2, nx + sx, nz + sz) && openSea(V2, nx - sx, nz - sz) && openSea(V2, nx - f.x * bow * 0.8, nz - f.z * bow * 0.8)) {
      this.pos.x = nx; this.pos.z = nz;
    } else this.speed *= -0.25;
  }

  /** Model where she is: the swell under her, heeling to the wind when she's pressed; going down by the head when she's sinking. */
  place(wind: { dir: number; strength: number }): void {
    const t = performance.now() / 1000 + this.pos.x * 0.01;
    const heel = this.sails ? Math.sin(wind.dir - this.yaw) * 0.06 * SAIL_SET[this.sails] * wind.strength : 0;
    let y = SEA - 0.14 + Math.sin(t * 0.9) * 0.16, pitch = Math.sin(t * 0.7) * 0.03, roll = Math.sin(t * 0.55 + 1) * 0.025 + heel;
    if (this.sinking >= 0) { const k = Math.min(1, this.sinking / 6); y -= k * k * (this.deck + 6); pitch -= k * 0.35; roll += k * 0.3; }
    this.root.position.set(this.pos.x, y, this.pos.z);
    this.root.rotation.set(0, this.yaw - Math.PI / 2, 0, 'YXZ');
    this.set.rotation.set(roll, 0, pitch);
    this.furled.rotation.copy(this.set.rotation);
  }

  /** Where someone stands at her helm, on her quarterdeck aft. */
  helm(out = V()): THREE.Vector3 {
    const f = this.fwd, aft = this.hull.len * 0.33;
    return out.set(this.pos.x - f.x * aft, this.root.position.y + this.deck + (this.hull.kind === 'galleon' ? 1.6 : this.hull.kind === 'clipper' ? 0.6 : 0), this.pos.z - f.z * aft);
  }

  /** Is a point inside her hull (or near enough above it to strike her rigging and deck)? */
  struck(p: THREE.Vector3): boolean {
    if (this.sinking >= 0) return false;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const along = dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw), across = -dx * Math.cos(this.yaw) + dz * Math.sin(this.yaw);
    return Math.abs(along) < this.hull.len * 0.5 && Math.abs(across) < this.hull.beam * 0.5 + 0.25 && p.y > SEA - 1.2 && p.y < SEA + this.deck + 3;
  }
}

/** A ball in flight, whose it is, and what it does when it lands. */
type Ball = { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3; from: Ship; dmg: number; life: number };
/** Smoke, a splash, a splinter: a mesh that grows, falls and fades. */
type Fx = { mesh: THREE.Mesh; vel: THREE.Vector3; grow: number; life: number; max: number; fall: number };

export class Sailing {
  /** The ship you're sailing, and whether you have the helm. */
  mine: Ship | null = null;
  atHelm = false;
  readonly ships: Ship[] = [];
  private balls: Ball[] = [];
  private fx: Fx[] = [];
  private spawnT = 0;
  private sendT = 0;
  private readonly ballGeo = new THREE.SphereGeometry(0.18, 6, 5);
  private readonly ballMat = new THREE.MeshLambertMaterial({ color: '#1a1a1c' });
  private readonly puffGeo = new THREE.IcosahedronGeometry(0.6, 0);
  private readonly splashGeo = new THREE.CylinderGeometry(0.25, 0.6, 1, 7, 1, true);
  private readonly chipGeo = new THREE.BoxGeometry(0.12, 0.08, 0.35);

  constructor(private host: SailingHost) {}

  wind(): { dir: number; strength: number } { return windAt(realmNow()); }

  // ------------------------------------------------------------------------------- your ship

  /** Launch a ship of yours (or a hired one) at a berth, and take her helm. */
  launch(hullId: HullId, livery: Livery, x: number, z: number, yaw: number, hp?: number): Ship {
    this.stow();
    const s = new Ship(this.host.props, HULLS[hullId], livery);
    s.pos.set(x, SEA, z);
    s.yaw = yaw;
    if (hp !== undefined) s.hp = Math.max(1, Math.min(s.hull.hp, hp));
    s.place(this.wind());
    this.host.scene.add(s.root);
    this.mine = s;
    this.atHelm = true;
    return s;
  }

  /** Your ship back to the yard (out of the water). */
  stow(): void {
    if (!this.mine) return;
    this.host.scene.remove(this.mine.root);
    this.mine = null;
    this.atHelm = false;
    this.host.sendState?.(null);
  }

  /** At the helm, each frame: sails (+1 set more, -1 take in), helm (-1..1), and a broadside wanted (-1 port, 1 starboard, 0 none). */
  steer(dt: number, sails: number, turn: number, fire: -1 | 0 | 1): void {
    const s = this.mine;
    if (!s || s.sinking >= 0) return;
    if (sails) { const was = s.sails; s.setSails(s.sails + sails); if (s.sails !== was) this.host.sfx(s.sails > was ? 'open' : 'close', 0.6); }
    s.sail(dt, turn, this.host.voxels, this.wind());
    if (fire) this.broadside(s, fire);
  }

  /** Fire a broadside, if her guns on that side are loaded. */
  broadside(s: Ship, sd: -1 | 1): boolean {
    const i = sd < 0 ? 0 : 1;
    if (s.reload[i] > 0 || s.sinking >= 0) return false;
    s.reload[i] = s.hull.reload;
    const f = s.fwd.clone(), side = s.side(sd);
    const n = s.hull.guns, y = s.root.position.y + s.deck + 0.55;
    for (let g = 0; g < n; g++) {
      const along = n === 1 ? 0 : (g / (n - 1) - 0.5) * s.hull.len * 0.62;
      const at = V().set(s.pos.x + f.x * along + side.x * (s.hull.beam * 0.5 + 0.35), y, s.pos.z + f.z * along + side.z * (s.hull.beam * 0.5 + 0.35));
      // A ripple of fire down her side, not all at once
      setTimeout(() => this.shoot(s, at, side, f), g * 90 + Math.random() * 40);
    }
    return true;
  }

  private shoot(s: Ship, at: THREE.Vector3, side: THREE.Vector3, f: THREE.Vector3): void {
    if (s.sinking >= 0) return;
    const spread = (Math.random() - 0.5) * 0.08, up = 0.075 + Math.random() * 0.03;
    const dir = V().copy(side).applyAxisAngle(tmp2.set(0, 1, 0), spread).normalize();
    const vel = dir.multiplyScalar(46 * Math.cos(up)).setY(46 * Math.sin(up)).addScaledVector(f, s.speed);
    const mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
    mesh.position.copy(at);
    this.host.scene.add(mesh);
    this.balls.push({ mesh, pos: at.clone(), vel, from: s, dmg: s.hull.shot * (0.85 + Math.random() * 0.3), life: 4 });
    this.puff(at, side, '#d8d4cc', 1.6, 1.8);
    this.puff(at, side, '#ffb040', 0.5, 0.12);
    const d = this.mine ? at.distanceTo(this.mine.pos) : 99;
    this.host.sfx('hitHeavy', Math.max(0.15, 1 - d / 120));
  }

  private puff(at: THREE.Vector3, dir: THREE.Vector3, color: string, size: number, life: number): void {
    const mesh = new THREE.Mesh(this.puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    mesh.position.copy(at); mesh.scale.setScalar(size * 0.5);
    this.host.scene.add(mesh);
    this.fx.push({ mesh, vel: dir.clone().multiplyScalar(3).setY(0.6), grow: size, life, max: life, fall: 0 });
  }
  private splash(at: THREE.Vector3): void {
    const mesh = new THREE.Mesh(this.splashGeo, new THREE.MeshBasicMaterial({ color: '#eef4f6', transparent: true, opacity: 0.8, depthWrite: false }));
    mesh.position.set(at.x, SEA + 0.4, at.z); mesh.scale.set(1, 0.4, 1);
    this.host.scene.add(mesh);
    this.fx.push({ mesh, vel: V().set(0, 4.5, 0), grow: 1.8, life: 0.9, max: 0.9, fall: 9 });
  }
  private splinters(at: THREE.Vector3): void {
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(this.chipGeo, this.host.props.wood);
      mesh.position.copy(at);
      mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.host.scene.add(mesh);
      this.fx.push({ mesh, vel: V().set((Math.random() - 0.5) * 7, 3 + Math.random() * 4, (Math.random() - 0.5) * 7), grow: 0, life: 1.1, max: 1.1, fall: 14 });
    }
    this.puff(at, tmp2.set(0, 1, 0), '#8a8278', 1.2, 1.2);
  }

  // ------------------------------------------------------------------------------- hits and sinking

  /** Damage to a ship: yours (and the realm's word on it), a raider's, or a remote captain's (sent on). */
  private hit(target: Ship, dmg: number, by: Ship): void {
    const n = Math.round(dmg);
    if (target.remote) { if (by === this.mine) this.host.sendHit?.(target.remote, n); this.host.floatAt(target.pos.clone().setY(SEA + target.deck + 2), 1, `-${n}`, 'enemy'); return; }
    target.hp -= n;
    this.host.floatAt(target.pos.clone().setY(SEA + target.deck + 2), 1, `-${n}`, target === this.mine ? 'player' : 'enemy');
    if (target.hp <= 0) this.sink(target, by);
  }

  /** A remote captain's ball struck your ship (the realm says so). */
  hurtByRemote(dmg: number, from: string): void {
    const s = this.mine;
    if (!s || s.sinking >= 0) return;
    s.hp -= dmg;
    this.splinters(s.pos.clone().setY(SEA + s.deck));
    this.host.floatAt(s.pos.clone().setY(SEA + s.deck + 2), 1, `-${dmg}`, 'player');
    if (s.hp <= 0) { this.host.sendSunk?.(from); this.sink(s, null); }
  }

  private sink(s: Ship, by: Ship | null): void {
    if (s.sinking >= 0) return;
    s.sinking = 0;
    s.speed = 0;
    s.setSails(0);
    this.host.sfx('hitHeavy', 0.9);
    if (s.npc && by === this.mine) this.host.sank(s.npc.kind, s.npc.name, s.pos.clone());
    if (s === this.mine) { this.host.banner('She\'s going down', `${s.livery.name} is sinking`); if (!by?.remote) this.host.sendSunk?.(null); }
  }

  // ------------------------------------------------------------------------------- the raiders

  private spawn(P: THREE.Vector3): void {
    const wanted = this.host.wanted();
    LANES.forEach((L, li) => {
      if (P.x < L.x0 - 200 || P.x > L.x1 + 200 || P.z < L.z0 - 200 || P.z > L.z1 + 200) return;
      if (L.revenue && wanted < REVENUE_PRICE) return;
      const have = this.ships.filter((s) => s.npc?.lane === li && s.sinking < 0).length;
      if (have >= L.n) return;
      const kind = RAIDERS.find((r) => r.id === L.raider)!;
      for (let tries = 0; tries < 6; tries++) {
        const a = Math.random() * Math.PI * 2, d = 180 + Math.random() * 80;
        const x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
        if (x < L.x0 || x > L.x1 || z < L.z0 || z > L.z1 || !openSea(this.host.voxels, x, z)) continue;
        const name = kind.names[Math.floor(Math.random() * kind.names.length)];
        const s = new Ship(this.host.props, HULLS[kind.hull], { ...kind.livery, name });
        s.pos.set(x, SEA, z);
        s.yaw = Math.atan2(P.x - x, P.z - z) + (Math.random() - 0.5);
        s.setSails(2);
        s.npc = { kind, name, flee: false, think: 0, goal: V().set(x, SEA, z), lane: li };
        this.host.scene.add(s.root);
        this.ships.push(s);
        break;
      }
    });
  }

  /** A raider's turn: hunt you down and lay alongside to fire, or run when she's beaten. */
  private think(s: Ship, dt: number): void {
    const n = s.npc!, me = this.mine;
    const prey = me && me.sinking < 0 ? me : null;
    let turn = 0;
    if (prey) {
      const dx = prey.pos.x - s.pos.x, dz = prey.pos.z - s.pos.z, d = Math.hypot(dx, dz), bearing = Math.atan2(dx, dz);
      if (s.hp < s.hull.hp * 0.25 && !n.flee) { n.flee = true; this.host.system(`The ${n.name} is breaking off.`); }
      let want: number;
      if (n.flee) { want = bearing + Math.PI; s.setSails(2); }
      else if (d > 50) { want = bearing + 0.35; s.setSails(2); }
      else {
        // Close: put her beam to you, on whichever side you're already on
        const sd: 1 | -1 = angleTo(s.yaw, bearing) < 0 ? 1 : -1;
        want = bearing + (sd > 0 ? Math.PI / 2 : -Math.PI / 2);
        if (d < 18) want += sd * 0.5;
        s.setSails(1);
        const aim = Math.abs(angleTo(Math.atan2(s.side(sd).x, s.side(sd).z), bearing));
        if (aim < 0.3 && d < 48) this.broadside(s, sd);
      }
      turn = Math.max(-1, Math.min(1, angleTo(s.yaw, want) * 2));
    } else {
      // Nobody to hunt: work the lane, a new mark every while
      n.think -= dt;
      const L = LANES[n.lane];
      if (n.think <= 0 || s.pos.distanceTo(n.goal) < 30) { n.think = 40; n.goal.set(L.x0 + Math.random() * (L.x1 - L.x0), SEA, L.z0 + Math.random() * (L.z1 - L.z0)); }
      s.setSails(1);
      turn = Math.max(-1, Math.min(1, angleTo(s.yaw, Math.atan2(n.goal.x - s.pos.x, n.goal.z - s.pos.z)) * 2));
    }
    // Land ahead: bear away from it
    const f = s.fwd, look = s.hull.len + 12;
    if (!openSea(this.host.voxels, s.pos.x + f.x * look, s.pos.z + f.z * look)) {
      const l = s.side(-1), clearL = openSea(this.host.voxels, s.pos.x + (f.x + l.x) * look, s.pos.z + (f.z + l.z) * look);
      turn = clearL ? 1 : -1;
    }
    s.sail(dt, turn, this.host.voxels, this.wind());
  }

  // ------------------------------------------------------------------------------- remote ships

  /** Another captain's ship as the realm last had it (null: gone). */
  remoteShip(name: string, st: ShipState | null): void {
    let s = this.ships.find((x) => x.remote === name);
    if (!st) { if (s) { this.host.scene.remove(s.root); this.ships.splice(this.ships.indexOf(s), 1); } return; }
    if (!s || s.hull.id !== st.hull) {
      if (s) { this.host.scene.remove(s.root); this.ships.splice(this.ships.indexOf(s), 1); }
      s = new Ship(this.host.props, HULLS[st.hull] ?? HULLS.cutter, st.livery);
      s.remote = name;
      s.pos.set(st.x, SEA, st.z);
      s.yaw = st.yaw;
      this.host.scene.add(s.root);
      this.ships.push(s);
    }
    s.goal.set(st.x, SEA, st.z);
    s.goalYaw = st.yaw;
    s.setSails(st.sails);
    s.hp = st.hp;
    if (st.sinking && s.sinking < 0) s.sinking = 0;
  }

  // ------------------------------------------------------------------------------- each frame

  update(dt: number, player: THREE.Vector3): void {
    const wind = this.wind(), me = this.mine;
    // The raiders come when you're at sea in a lane, and go when you've left them far behind
    this.spawnT -= dt;
    if (me && me.sinking < 0 && this.spawnT <= 0) { this.spawnT = 8; this.spawn(me.pos); }
    for (const s of [...this.ships]) {
      for (let i = 0; i < 2; i++) s.reload[i] = Math.max(0, s.reload[i] - dt);
      if (s.sinking >= 0) {
        s.sinking += dt;
        if (s.sinking > 7) { this.host.scene.remove(s.root); this.ships.splice(this.ships.indexOf(s), 1); continue; }
      } else if (s.npc) {
        if (s.pos.distanceTo(player) > 480) { this.host.scene.remove(s.root); this.ships.splice(this.ships.indexOf(s), 1); continue; }
        this.think(s, dt);
      } else if (s.remote) {
        // Toward where the realm last said she was
        s.pos.lerp(s.goal, Math.min(1, dt * 3));
        s.yaw += angleTo(s.yaw, s.goalYaw) * Math.min(1, dt * 3);
      }
      s.place(wind);
    }
    if (me) {
      for (let i = 0; i < 2; i++) me.reload[i] = Math.max(0, me.reload[i] - dt);
      if (me.sinking >= 0) {
        me.sinking += dt;
        if (me.sinking > 6) { const at = me.pos.clone(); this.stow(); this.host.lost(at); }
      }
      // (she may have just gone to the bottom and been stowed: nothing more of her, then)
      if (this.mine === me) me.place(wind);
      // Your ship's state to the realm, four times a second
      this.sendT -= dt;
      if (this.mine === me && this.sendT <= 0 && this.host.sendState) {
        this.sendT = 0.25;
        this.host.sendState({ hull: me.hull.id, livery: me.livery, x: Math.round(me.pos.x * 10) / 10, z: Math.round(me.pos.z * 10) / 10, yaw: Math.round(me.yaw * 100) / 100, sails: me.sails, hp: Math.round(me.hp), sinking: me.sinking >= 0 });
      }
    }
    // Shot in the air: falling, striking a hull, into the sea, or into the land
    const targets = [...this.ships, ...(this.mine ? [this.mine] : [])];
    for (const b of [...this.balls]) {
      b.life -= dt;
      // (in steps of half a block or so, so a fast ball in a slow frame can't pass clean through a hull)
      const steps = Math.max(1, Math.ceil((b.vel.length() * dt) / 0.6)), h = dt / steps;
      let done = b.life <= 0;
      for (let k = 0; k < steps && !done; k++) {
        b.vel.y -= 9.8 * h;
        b.pos.addScaledVector(b.vel, h);
        for (const s of targets) {
          if (s === b.from || !s.struck(b.pos)) continue;
          // (only in the Freewater do captains' balls touch each other's ships)
          const pvp = (s.remote || s === this.mine) && (b.from.remote || b.from === this.mine);
          if (pvp && !inFreewater(s.pos.x, s.pos.z)) continue;
          this.splinters(b.pos);
          this.host.sfx('hit', Math.max(0.2, 1 - b.pos.distanceTo(player) / 80));
          this.hit(s, b.dmg, b.from);
          done = true;
          break;
        }
        if (!done && b.pos.y < SEA) { this.splash(b.pos); done = true; }
        if (!done) { const id = this.host.voxels.get(Math.floor(b.pos.x), Math.floor(b.pos.y), Math.floor(b.pos.z)); if (isSolid(id)) { this.puff(b.pos, tmp2.set(0, 1, 0), '#9a9080', 1, 0.8); done = true; } }
      }
      b.mesh.position.copy(b.pos);
      if (done) { this.host.scene.remove(b.mesh); this.balls.splice(this.balls.indexOf(b), 1); }
    }
    // Smoke drifting off downwind, splashes falling back, splinters tumbling
    const wx = Math.sin(wind.dir) * wind.strength * 2, wz = Math.cos(wind.dir) * wind.strength * 2;
    for (const e of [...this.fx]) {
      e.life -= dt;
      const k = 1 - e.life / e.max;
      e.vel.y -= e.fall * dt;
      e.mesh.position.addScaledVector(e.vel, dt);
      if (!e.fall) { e.mesh.position.x += wx * dt; e.mesh.position.z += wz * dt; }
      if (e.grow) { const g = e.mesh.geometry === this.splashGeo ? [1 + k, 0.4 + k * e.grow * 2, 1 + k] : [0.5 + k * e.grow, 0.5 + k * e.grow, 0.5 + k * e.grow]; e.mesh.scale.set(g[0], g[1], g[2]); }
      else { e.mesh.rotation.x += dt * 8; e.mesh.rotation.z += dt * 5; }
      const m = e.mesh.material as THREE.MeshBasicMaterial;
      if (m.transparent) m.opacity = 0.85 * (1 - k);
      if (e.life <= 0) { this.host.scene.remove(e.mesh); if (m.transparent) m.dispose(); this.fx.splice(this.fx.indexOf(e), 1); }
    }
  }

  /** The nearest enemy ship and how far, for the gunnery panel. */
  nearestFoe(): { ship: Ship; d: number } | null {
    const me = this.mine;
    if (!me) return null;
    let best: { ship: Ship; d: number } | null = null;
    for (const s of this.ships) { if (s.sinking >= 0) continue; const d = s.pos.distanceTo(me.pos); if (!best || d < best.d) best = { ship: s, d }; }
    return best;
  }
}
