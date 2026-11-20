import * as THREE from 'three';
import { HULLS, inFreewater, LANES, pointOfSail, RAIDERS, REVENUE_PRICE, windAt, type Hull, type HullId, type Livery, type RaiderKind } from '../data/naval';
import { B, isSolid } from '../world/blocks';
import { realmNow } from '../world/clock';
import type { PropMaterials } from '../world/props';
import { shipModel, SHIPS } from '../world/ships';
import { baseDesign, buildShip, decodeDesign, type Battery, type BuiltShip, type Gun } from '../data/shipParts';
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
  /** A raider a story wants at sea (the Black Hen, for the Margery's Bell), for the lane it works; or null. */
  raiderName?(lane: number): string | null;
  /** Your mastery's share in your own guns and your own hull (data/mastery.ts). */
  gunMul?(): number;
  hullMul?(): number;
  /** Online: your ship's state for the others, a hit you've landed on someone's ship, your ship gone down to someone. */
  sendState?(s: ShipState | null): void;
  sendHit?(name: string, dmg: number): void;
  sendSunk?(by: string | null): void;
}

/** A ship as the realm passes it between players. */
export interface ShipState { hull: HullId; livery: Livery; x: number; z: number; yaw: number; sails: number; hp: number; sinking: boolean; /** Her design (data/shipParts.ts), if she was built to one. */ d?: string }

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
  /** Each gun deck's loading, a side: [port, starboard], a number a deck (data/shipParts.ts batteries). */
  readonly deckReload: [number[], number[]] = [[], []];
  /** The bow and stern chasers' loading. */
  chaserReload = 0;
  /** Her rigging, whole at 1: shot that cuts it (chain shot above all) slows her till it's mended. */
  rig = 1;
  /** Seconds since she last fired or was struck: once it's quiet her carpenter and bosun get to work. */
  quiet = 0;
  ramCd = 0;
  /** Her gun decks as built; a ship with no design fires her hull's broadside as one. */
  batteries(): Battery[] { const b = this.hull as BuiltShip; return Array.isArray(b.batteries) ? b.batteries : this.hull.guns ? [{ gun: oldGun(this.hull), n: this.hull.guns }] : []; }
  reloadMul(): number { return (this.hull as BuiltShip).reloadMul ?? 1; }
  /** Where a remote ship is heading, for smoothing. */
  readonly goal = V();
  goalYaw = 0;

  constructor(M: PropMaterials, readonly hull: Hull, readonly livery: Livery) {
    const o = { hull: livery.hull, wale: livery.wale, sail: livery.sail, name: livery.name.toUpperCase().slice(0, 18) };
    this.set = shipModel(M, hull.kind, { ...o, sails: 'set' });
    this.furled = shipModel(M, hull.kind, { ...o, sails: 'furled' });
    this.root.add(this.set, this.furled);
    // what she was built with shows on her (data/shipParts.ts)
    const kit = shipKit(hull, SHIPS[hull.kind].deck + 0.17);
    if (kit) { this.set.add(kit); this.furled.add(kit.clone()); }
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
    // (her rig decides how close to the wind she points and how she runs before it; torn rigging, how much of it draws)
    const b = h as BuiltShip, off = Math.atan2(Math.sin(wind.dir - this.yaw), Math.cos(wind.dir - this.yaw));
    const running = Math.abs(off) < 0.9 ? (b.downwind ?? 1) : 1;
    const want = h.speed * SAIL_SET[this.sails] * pointOfSail(off - Math.sign(off || 1) * (b.upwind ?? 0)) * running * (0.55 + 0.45 * wind.strength) * (0.35 + 0.65 * this.rig);
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
type Ball = { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3; from: Ship; dmg: number; life: number; vsRig: number };
const kitMats = new Map<string, THREE.MeshLambertMaterial>();
const kitMat = (c: string, glow = false) => { const k = c + (glow ? '+' : ''); let m = kitMats.get(k); if (!m) { m = new THREE.MeshLambertMaterial({ color: c, ...(glow ? { emissive: new THREE.Color(c), emissiveIntensity: 0.8 } : {}) }); kitMats.set(k, m); } return m; };
const kitBox = new THREE.BoxGeometry(1, 1, 1), kitCyl = new THREE.CylinderGeometry(1, 1, 1, 8), kitCone = new THREE.ConeGeometry(1, 1, 8);
/**
 * What a ship built to a design shows of it (owner 2026-11-19, ship building): her ram, figurehead and chasers, her
 * sterncastle or her great cabin's lit windows, iron bands or copper along her hull, and her guns run out of their ports
 * by deck, long or squat as they are. Along +x from her middle (the model's way), her deck at deck.
 */
function shipKit(h: Hull, deck: number): THREE.Group | null {
  const b = h as BuiltShip;
  if (!b.design) return null;
  const g = new THREE.Group(), L = h.len, B = h.beam, P = b.design.parts;
  const put = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0, glow = false) => { const m = new THREE.Mesh(geo, kitMat(color, glow)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  const barrel = (x: number, y: number, z: number, len: number, r: number, dir: 'x' | '-x' | 'z' | '-z', color = '#2a2a2e') => {
    const along = dir === 'x' || dir === '-x';
    const sgn = dir === 'x' || dir === 'z' ? 1 : -1;
    put(kitCyl, color, x + (along ? sgn * len / 2 : 0), y, z + (along ? 0 : sgn * len / 2), r, len, r, along ? 0 : Math.PI / 2, 0, along ? Math.PI / 2 : 0);
  };
  // the bow
  if (P.bow === 'ram') put(kitCone, '#b08d57', L / 2 + 0.55, 0.35, 0, 0.32, 1.3, 0.32, 0, 0, -Math.PI / 2);
  if (P.bow === 'figurehead') { put(kitBox, '#d8b04a', L / 2 + 0.15, deck - 0.45, 0, 0.35, 0.9, 0.3, 0, 0, -0.5); put(kitBox, '#e8d8b0', L / 2 + 0.35, deck - 0.05, 0, 0.25, 0.28, 0.25); }
  if (P.bow === 'bowchaser') barrel(L / 2 - 1.2, deck + 0.45, 0, 1.6, 0.12, 'x');
  // the stern
  if (P.stern === 'castle') { put(kitBox, '#4a3420', -L / 2 + L * 0.14, deck + 0.6, 0, L * 0.26, 1.2, B * 0.82); put(kitBox, '#2e2014', -L / 2 + L * 0.14, deck + 1.25, 0, L * 0.28, 0.12, B * 0.88); }
  if (P.stern === 'cabin') for (const z of [-B * 0.25, 0, B * 0.25]) put(kitBox, '#ffd890', -L / 2 - 0.02, deck - 0.25, z, 0.05, 0.35, B * 0.16, 0, 0, 0, true);
  if (P.stern === 'sternchaser') barrel(-L / 2 + 1.2, deck + 0.85, 0, 1.4, 0.11, '-x');
  // the planking
  if (P.plank === 'ironband') for (const sd of [1, -1]) for (const y of [deck - 0.65, deck - 0.2]) put(kitBox, '#3a3c40', 0, y, sd * (B / 2 + 0.02), L * 0.66, 0.1, 0.05);
  // (copper at the waterline, along her straight middle: the hull narrows toward the keel, where a band would stand off it)
  if (P.plank === 'copper') for (const sd of [1, -1]) put(kitBox, '#c07040', 0, Math.max(0.32, deck - 1.0), sd * (B / 2 - 0.03), L * 0.5, 0.16, 0.05);
  // the guns, deck by deck, run out of her ports on both sides
  b.batteries.forEach((bt, bi) => {
    const n = bt.n, y = deck + 0.25 + bi * 0.45;
    const len = bt.gun.id === 'long' ? 1.1 : bt.gun.id === 'carronade' ? 0.55 : 0.75, r = bt.gun.id === 'carronade' ? 0.17 : bt.gun.id === 'light' ? 0.09 : 0.12;
    for (let k = 0; k < n; k++) {
      const x = (n === 1 ? 0 : (k / (n - 1) - 0.5) * L * 0.62) + (bi % 2 ? 0.7 : 0);
      for (const sd of [1, -1] as const) barrel(x, y, sd * (B / 2 - 0.2), len, r, sd > 0 ? 'z' : '-z', bt.gun.id === 'chain' ? '#3a3026' : '#2a2a2e');
    }
  });
  return g;
}

/** The guns of a ship with no design: her hull's broadside as one deck. */
const oldGun = (h: Hull): Gun => ({ id: 'old', name: 'guns', dmg: h.shot, speed: 46, life: 4, reload: h.reload, mass: 0, vsRig: 1 });
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
  launch(hullId: HullId, livery: Livery, x: number, z: number, yaw: number, hp?: number, design?: string): Ship {
    this.stow();
    // (a ship built to a design of yours sails and fights as it adds up: data/shipParts.ts)
    const d = design ? decodeDesign(design) : null;
    const s = new Ship(this.host.props, d && d.keel === hullId ? buildShip(d) : design === undefined ? HULLS[hullId] : buildShip(baseDesign(hullId)), livery);
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
  steer(dt: number, sails: number, turn: number, fire: -1 | 0 | 1, chase = false): void {
    const s = this.mine;
    if (!s || s.sinking >= 0) return;
    if (sails) { const was = s.sails; s.setSails(s.sails + sails); if (s.sails !== was) this.host.sfx(s.sails > was ? 'open' : 'close', 0.6); }
    s.sail(dt, turn, this.host.voxels, this.wind());
    if (fire) this.broadside(s, fire);
    if (chase) this.chase(s);
  }

  /** Fire a broadside, if her guns on that side are loaded. */
  broadside(s: Ship, sd: -1 | 1): boolean {
    const i = sd < 0 ? 0 : 1;
    if (s.sinking >= 0) return false;
    const bats = s.batteries(), f = s.fwd.clone(), side = s.side(sd);
    let fired = false, k = 0;
    // every deck that's loaded fires, each its own guns, and each loads again in its own time
    bats.forEach((bt, bi) => {
      if ((s.deckReload[i][bi] ?? 0) > 0) return;
      s.deckReload[i][bi] = bt.gun.reload * s.reloadMul();
      fired = true;
      const n = bt.n, y = s.root.position.y + s.deck + 0.55 + bi * 0.45;
      for (let g = 0; g < n; g++) {
        const along = (n === 1 ? 0 : (g / (n - 1) - 0.5) * s.hull.len * 0.62) + (bi % 2 ? 0.7 : 0);
        const at = V().set(s.pos.x + f.x * along + side.x * (s.hull.beam * 0.5 + 0.35), y, s.pos.z + f.z * along + side.z * (s.hull.beam * 0.5 + 0.35));
        // A ripple of fire down her side, not all at once
        setTimeout(() => this.shoot(s, at, side, f, bt.gun), (k++) * 90 + Math.random() * 40);
      }
    });
    s.reload[i] = Math.max(0, ...bats.map((_, bi) => s.deckReload[i][bi] ?? 0));
    if (fired) s.quiet = 0;
    return fired;
  }

  /** Fire the chasers (R): the bow gun dead ahead, the stern gun dead astern, whichever she carries. */
  chase(s: Ship): boolean {
    const h = s.hull as BuiltShip;
    if (s.sinking >= 0 || s.chaserReload > 0 || (!h.bowChaser && !h.sternChaser)) return false;
    s.chaserReload = Math.max(h.bowChaser?.reload ?? 0, h.sternChaser?.reload ?? 0) * s.reloadMul();
    const f = s.fwd.clone(), y = s.root.position.y + s.deck + 0.8, L = s.hull.len * 0.5;
    if (h.bowChaser) this.shoot(s, V().set(s.pos.x + f.x * (L + 0.6), y, s.pos.z + f.z * (L + 0.6)), f.clone(), f, h.bowChaser);
    if (h.sternChaser) this.shoot(s, V().set(s.pos.x - f.x * (L + 0.3), y + 0.4, s.pos.z - f.z * (L + 0.3)), f.clone().multiplyScalar(-1), f, h.sternChaser);
    s.quiet = 0;
    return true;
  }

  /** A ship's clocks for dt: her decks' and chasers' loading, and her repairs once the guns have been quiet a while. */
  private tick(s: Ship, dt: number): void {
    for (let i = 0; i < 2; i++) {
      const d = s.deckReload[i];
      for (let b = 0; b < d.length; b++) d[b] = Math.max(0, d[b] - dt);
      s.reload[i] = d.length ? Math.max(0, ...d) : Math.max(0, s.reload[i] - dt);
    }
    s.chaserReload = Math.max(0, s.chaserReload - dt);
    s.ramCd = Math.max(0, s.ramCd - dt);
    s.quiet += dt;
    if (s.sinking < 0 && s.quiet > 8 && !s.remote) {
      const rep = (s.hull as BuiltShip).repair ?? 0;
      if (rep && s.hp < s.hull.hp) s.hp = Math.min(s.hull.hp, s.hp + rep * dt);
      s.rig = Math.min(1, s.rig + dt * 0.012 * (1 + rep / 4));
    }
  }

  private shoot(s: Ship, at: THREE.Vector3, side: THREE.Vector3, f: THREE.Vector3, gun: Gun = oldGun(s.hull)): void {
    if (s.sinking >= 0) return;
    const spread = (Math.random() - 0.5) * 0.08, up = 0.075 + Math.random() * 0.03;
    const dir = V().copy(side).applyAxisAngle(tmp2.set(0, 1, 0), spread).normalize();
    const vel = dir.multiplyScalar(gun.speed * Math.cos(up)).setY(gun.speed * Math.sin(up)).addScaledVector(f, s.speed);
    const mesh = new THREE.Mesh(this.ballGeo, this.ballMat);
    mesh.position.copy(at);
    this.host.scene.add(mesh);
    this.balls.push({ mesh, pos: at.clone(), vel, from: s, dmg: gun.dmg * (0.85 + Math.random() * 0.3) * (s === this.mine ? this.host.gunMul?.() ?? 1 : 1), life: gun.life, vsRig: gun.vsRig });
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
    const n = Math.round(target === this.mine ? dmg / (this.host.hullMul?.() ?? 1) : dmg);
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
        const wanted = this.host.raiderName?.(li);
        const name = wanted && !this.ships.some((x) => x.npc?.name === wanted && x.sinking < 0) ? wanted : kind.names[Math.floor(Math.random() * kind.names.length)];
        const s = new Ship(this.host.props, kind.design ? buildShip(decodeDesign(kind.design) ?? baseDesign(kind.hull)) : HULLS[kind.hull], { ...kind.livery, name });
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
      // end-on, she tries her chasers
      if (!n.flee && d < 70 && Math.abs(angleTo(s.yaw, bearing)) < 0.25) this.chase(s);
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
    if (!s || s.hull.id !== st.hull || ((s.hull as BuiltShip).code ?? '') !== (st.d ?? '')) {
      if (s) { this.host.scene.remove(s.root); this.ships.splice(this.ships.indexOf(s), 1); }
      const d = st.d ? decodeDesign(st.d) : null;
      s = new Ship(this.host.props, d && d.keel === st.hull ? buildShip(d) : HULLS[st.hull] ?? HULLS.cutter, st.livery);
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
      this.tick(s, dt);
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
      this.tick(me, dt);
      // A ram: her bow into another ship's side at speed does the work of a broadside, and costs her a little
      const rh = me.hull as BuiltShip;
      if (me.sinking < 0 && rh.ram && me.speed > 2.5 && me.ramCd <= 0) {
        const f = me.fwd, L = me.hull.len * 0.5 + 0.4, bow = V().set(me.pos.x + f.x * L, SEA + 0.5, me.pos.z + f.z * L);
        for (const s of this.ships) {
          if (s.sinking >= 0 || !s.struck(bow)) continue;
          if (s.remote && !inFreewater(s.pos.x, s.pos.z)) continue;
          const dmg = rh.ram * me.speed;
          this.splinters(bow); this.host.sfx('hitHeavy', 1);
          this.hit(s, dmg, me);
          me.hp -= dmg * 0.12; me.speed *= 0.25; me.ramCd = 2.5; me.quiet = 0; s.quiet = 0;
          break;
        }
      }
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
        this.host.sendState({ hull: me.hull.id, d: (me.hull as BuiltShip).code, livery: me.livery, x: Math.round(me.pos.x * 10) / 10, z: Math.round(me.pos.z * 10) / 10, yaw: Math.round(me.yaw * 100) / 100, sails: me.sails, hp: Math.round(me.hp), sinking: me.sinking >= 0 });
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
          // shot that strikes high cuts her rigging (chain shot does little else); her hull takes the rest
          const high = b.pos.y > s.root.position.y + s.deck + 1.2, chain = b.vsRig > 2;
          if (!s.remote) s.rig = Math.max(0.1, s.rig - (b.dmg * b.vsRig * (high || chain ? 1 : 0.3)) / (600 * ((s.hull as BuiltShip).rigHp ?? 1) * Math.sqrt(s.hull.hp / 1500)));
          s.quiet = 0;
          this.hit(s, b.dmg * (chain ? 0.35 : high ? 0.7 : 1), b.from);
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
