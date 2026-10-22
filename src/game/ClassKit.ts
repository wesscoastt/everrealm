import * as THREE from 'three';
import { CALLINGS, CallingDef, CallingId, TUNE as T } from '../data/classes';
import type { Enemy } from '../entities/Enemy';
import type { Particles } from '../systems/Particles';

// The calling in play: its three skills, its mechanic, and the effects they leave in the world
// (shields, bleeds, burning rings, bolts and arrows in flight, a star on its way down). The game
// asks it to change what the player deals and takes, and draws its gauge.

export interface KitHost {
  scene: THREE.Scene;
  particles: Particles;
  player(): THREE.Vector3;
  yaw(): number;
  enemies(): Enemy[];
  /** The target in reach (the current one, or the nearest), turning to face it. */
  faceTarget(range: number): Enemy | null;
  setTarget(e: Enemy): void;
  /** Base damage of an ordinary swing at this level and with this weapon (before the roll and crits). */
  power(): number;
  /** Deal damage (rolls ±10% and crits, shows it, gives experience, handles a kill). Returns what was dealt. */
  hit(e: Enemy, dmg: number, opts?: { crit?: boolean; quiet?: boolean }): number;
  heal(n: number): void;
  maxHp(): number;
  anim(state: 'attack' | 'cleave' | 'heal'): void;
  sfx(name: 'swing' | 'hitHeavy' | 'heal' | 'bell' | 'splash' | 'growl'): void;
  /** Move the player to a point over a short time (a leap or a step). */
  moveTo(x: number, z: number, secs: number, y?: number): void;
  /** A clear, level-enough way to the target for a leap or a step (says why not, if not). */
  canReach(e: Enemy): boolean;
  inCombat(): void;
  /** The Tolley set's shorter sustain cooldown. */
  sustainScale(): number;
  /** How much faster the skills recharge (light armour). */
  skillHaste(): number;
}

interface Flying { mesh: THREE.Object3D; to: Enemy; speed: number; dmg: number; burst?: number }
interface Pending { at: THREE.Vector3; t: number; ring: THREE.Mesh; r: number; dmg: number }
interface Dot { e: Enemy; perSec: number; left: number; tick: number }

const RING_GEO = new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2);
const BOLT_GEO = new THREE.SphereGeometry(0.22, 8, 6);
const ARROW_GEO = new THREE.BoxGeometry(0.06, 0.06, 0.7);

export class ClassKit {
  calling: CallingDef = CALLINGS[0];
  readonly cds = [0, 0, 0];
  private clock = 0;
  // Mechanics
  private resolve = 0; private resolveAt = 0;
  private fury = 0;
  private kindling = 0;
  private marks = new Map<Enemy, number>();
  // Effects
  private shield = 0; private shieldUntil = 0;
  private oathUntil = 0; private oathTick = 0;
  private redUntil = 0;
  private wardUntil = 0; private wardTick = 0;
  private stepStrike = 0;
  private dots: Dot[] = [];
  private flying: Flying[] = [];
  private pending: Pending[] = [];
  private shieldMesh: THREE.Mesh;

  constructor(private host: KitHost) {
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 16, 12), new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.18, depthWrite: false }));
    this.shieldMesh.visible = false;
    host.scene.add(this.shieldMesh);
  }

  set(id: CallingId): void {
    const c = CALLINGS.find((x) => x.id === id) ?? CALLINGS[0];
    if (c === this.calling) return;
    this.calling = c;
    this.cds.fill(0);
    // Nothing carries over from the old calling
    this.fury = this.kindling = this.resolve = this.shield = 0;
    this.shieldUntil = this.oathUntil = this.redUntil = this.wardUntil = this.stepStrike = 0;
    this.dots = [];
    this.marks.clear();
  }

  // ---------------------------------------------------------------- What the game asks
  /** Change damage the player is about to deal to e. */
  outgoing(e: Enemy, dmg: number): number {
    let k = 1;
    if (this.redUntil > this.clock) k *= T.redhour.dealt;
    if ((this.marks.get(e) ?? 0) > this.clock) k *= 1 + T.volley.markBonus;
    return dmg * k;
  }

  /** A blow of the player's landed (any source): mechanics that feed on hits. */
  landed(): void {
    if (this.calling.id === 'reaver') this.fury = Math.min(100, this.fury + T.fury.perHit);
  }

  /** Damage about to be taken: Resolve, the Oath, the Red Hour, then the shield soaks what it can. */
  incoming(dmg: number): number {
    let d = dmg;
    if (this.calling.id === 'warden') {
      d *= 1 - this.resolve * T.resolve.per;
      this.resolve = Math.min(T.resolve.max, this.resolve + 1);
      this.resolveAt = this.clock;
      if (this.oathUntil > this.clock) d *= T.oath.taken;
    }
    if (this.redUntil > this.clock) d *= T.redhour.taken;
    if (this.shield > 0 && this.shieldUntil > this.clock) {
      const soak = Math.min(this.shield, d);
      this.shield -= soak;
      d -= soak;
      this.host.particles.sparks(this.host.player().clone().setY(this.host.player().y + 1.2), 6, '#bfe4ff');
    }
    return d;
  }

  /** A Strike is about to land: Shadowstep's heavy blow. */
  strikeBonus(): { mult: number; crit: boolean } {
    if (this.stepStrike > this.clock) { this.stepStrike = 0; return { mult: T.shadowstep.mult, crit: true }; }
    return { mult: 1, crit: false };
  }

  /** The gauge under the action bar. */
  gauge(): { label: string; value: number; max: number; color: string } {
    const m = this.calling.mechanic;
    switch (this.calling.id) {
      case 'warden': return { label: `${m.name} ${this.resolve}`, value: this.resolve, max: T.resolve.max, color: m.color };
      case 'reaver': return { label: this.fury >= 100 ? 'Fury: full' : m.name, value: this.fury, max: 100, color: m.color };
      case 'ashcaller': return { label: `${m.name} ${this.kindling}/3`, value: this.kindling, max: 3, color: m.color };
      default: {
        let left = 0;
        for (const [e, until] of this.marks) if (e.alive && until > this.clock) left = Math.max(left, until - this.clock);
        return { label: left > 0 ? `${m.name}: ${Math.ceil(left)}s` : m.name, value: left, max: T.volley.mark, color: m.color };
      }
    }
  }

  slots(): { left: number; total: number }[] {
    return this.calling.skills.map((s, i) => ({ left: this.cds[i], total: i === 0 ? s.cd * this.host.sustainScale() : s.cd }));
  }

  // ---------------------------------------------------------------- The skills
  /** Use skill 0, 1 or 2. Returns false if it couldn't be used (cooling, no target). */
  use(i: number): boolean {
    if (this.cds[i] > 0) return false;
    const P = this.host.player();
    const s = this.calling.skills[i];
    const fury = this.calling.id === 'reaver' && this.fury >= 100 && s.id !== 'redhour' ? T.fury.mult : 1;
    const pw = this.host.power() * fury;
    const ok = this.cast(s.id, P, pw);
    if (!ok) return false;
    if (fury > 1) { this.fury = 0; this.host.particles.burst(P.clone().setY(P.y + 1), '#ff5a3a', 20); }
    this.cds[i] = i === 0 ? s.cd * this.host.sustainScale() : s.cd;
    if (i > 0) this.host.inCombat();
    return true;
  }

  private cast(id: string, P: THREE.Vector3, pw: number): boolean {
    const H = this.host;
    switch (id) {
      // Warden
      case 'bulwark':
        this.shield = H.maxHp() * T.bulwark.shield; this.shieldUntil = this.clock + T.bulwark.secs;
        H.anim('heal'); H.sfx('bell');
        return true;
      case 'bash': {
        const e = H.faceTarget(T.bash.range);
        if (!e) return false;
        H.anim('attack'); H.sfx('hitHeavy');
        H.hit(e, pw * T.bash.dmg);
        e.stun = Math.max(e.stun, T.bash.stun);
        H.particles.sparks(e.pos.clone().setY(e.pos.y + 1), 14, '#cfe6ff');
        return true;
      }
      case 'oath':
        this.oathUntil = this.clock + T.oath.secs; this.oathTick = 0;
        this.ring(P, T.oath.r, '#7fb0e0', T.oath.secs);
        H.anim('cleave'); H.sfx('bell');
        return true;
      // Reaver
      case 'bleed': {
        const e = H.faceTarget(T.bleed.range);
        if (!e) return false;
        H.anim('attack'); H.sfx('swing');
        H.hit(e, pw * T.bleed.dmg);
        this.dots = this.dots.filter((d) => d.e !== e);
        this.dots.push({ e, perSec: pw * T.bleed.dot, left: T.bleed.secs, tick: 1 });
        H.heal(H.maxHp() * T.bleed.heal);
        return true;
      }
      case 'leap': {
        const e = H.faceTarget(T.leap.range);
        if (!e || !H.canReach(e)) return false;
        const away = new THREE.Vector3().subVectors(P, e.pos).setY(0).normalize();
        H.moveTo(e.pos.x + away.x * 1.4, e.pos.z + away.z * 1.4, 0.32, e.pos.y);
        H.anim('cleave'); H.sfx('swing');
        this.pending.push({ at: e.pos.clone(), t: 0.32, ring: this.ring(e.pos, T.leap.r, '#e0583a', 0.32), r: T.leap.r, dmg: pw * T.leap.dmg });
        return true;
      }
      case 'redhour':
        this.redUntil = this.clock + T.redhour.secs;
        H.particles.burst(P.clone().setY(P.y + 1), '#c02a1a', 30); H.sfx('growl');
        return true;
      // Ashcaller
      case 'ward':
        this.wardUntil = this.clock + T.ward.secs; this.wardTick = 0;
        H.anim('heal'); H.sfx('heal');
        return true;
      case 'bolt': {
        const e = H.faceTarget(T.bolt.range);
        if (!e) return false;
        H.anim('attack');
        this.kindling++;
        const burst = this.kindling >= T.bolt.every;
        if (burst) this.kindling = 0;
        const m = new THREE.Mesh(BOLT_GEO, new THREE.MeshBasicMaterial({ color: burst ? '#ffd060' : '#ff8a3a' }));
        m.position.copy(P).setY(P.y + 1.4);
        if (burst) m.scale.setScalar(1.6);
        H.scene.add(m);
        this.flying.push({ mesh: m, to: e, speed: 26, dmg: pw * T.bolt.dmg, burst: burst ? pw * T.bolt.burst : undefined });
        return true;
      }
      case 'starfall': {
        const e = H.faceTarget(T.starfall.range);
        const at = e ? e.pos.clone() : P.clone().add(new THREE.Vector3(Math.sin(H.yaw()) * 8, 0, Math.cos(H.yaw()) * 8));
        H.anim('heal'); H.sfx('bell');
        this.pending.push({ at, t: T.starfall.delay, ring: this.ring(at, T.starfall.r, '#ffd27a', T.starfall.delay), r: T.starfall.r, dmg: pw * T.starfall.dmg });
        return true;
      }
      // Pathfinder
      case 'dressing':
        H.heal(H.maxHp() * T.dressing.heal); H.anim('heal'); H.sfx('heal'); H.particles.heal(P);
        return true;
      case 'volley': {
        const e = H.faceTarget(T.volley.range);
        if (!e) return false;
        H.anim('attack'); H.sfx('swing');
        for (let k = 0; k < T.volley.arrows; k++) {
          const m = new THREE.Mesh(ARROW_GEO, new THREE.MeshBasicMaterial({ color: '#e8dcc0' }));
          m.position.copy(P).setY(P.y + 1.4 - k * 0.12);
          m.visible = false;
          H.scene.add(m);
          this.flying.push({ mesh: m, to: e, speed: 34, dmg: pw * T.volley.dmg, burst: -k * 0.12 });
        }
        for (const o of H.enemies()) if (o.alive && (o === e || o.pos.distanceTo(e.pos) < T.volley.markR)) this.marks.set(o, this.clock + T.volley.mark);
        return true;
      }
      case 'shadowstep': {
        const e = H.faceTarget(T.shadowstep.range);
        if (!e || !H.canReach(e)) return false;
        H.particles.burst(P.clone().setY(P.y + 1), '#2a2a3a', 18);
        const back = new THREE.Vector3(Math.sin(e.model.root.rotation.y), 0, Math.cos(e.model.root.rotation.y));
        H.moveTo(e.pos.x - back.x * 1.6, e.pos.z - back.z * 1.6, 0.08, e.pos.y);
        e.stun = Math.max(e.stun, T.shadowstep.stun);
        this.stepStrike = this.clock + T.shadowstep.window;
        return true;
      }
    }
    return false;
  }

  /** A ground ring that fades out over secs. */
  private ring(at: THREE.Vector3, r: number, color: string, secs: number): THREE.Mesh {
    const m = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(at.x, at.y + 0.08, at.z);
    m.scale.setScalar(r);
    m.userData.life = secs; m.userData.age = 0;
    this.host.scene.add(m);
    this.rings.push(m);
    return m;
  }
  private rings: THREE.Mesh[] = [];

  // ---------------------------------------------------------------- Each frame
  update(dt: number): void {
    this.clock += dt;
    const H = this.host, P = H.player();
    const haste = H.skillHaste();
    for (let i = 0; i < 3; i++) this.cds[i] = Math.max(0, this.cds[i] - dt * haste);
    for (const [e, until] of this.marks) if (until <= this.clock || !e.alive) this.marks.delete(e);
    if (this.calling.id === 'warden' && this.resolve > 0 && this.clock - this.resolveAt > T.resolve.fade) this.resolve = 0;
    // Shield bubble
    const shielded = this.shield > 0 && this.shieldUntil > this.clock;
    this.shieldMesh.visible = shielded || this.oathUntil > this.clock;
    if (this.shieldMesh.visible) { this.shieldMesh.position.copy(P).setY(P.y + 1); (this.shieldMesh.material as THREE.MeshBasicMaterial).color.set(this.oathUntil > this.clock ? '#e8d08a' : '#9fd8ff'); }
    // The Oath burns everything close
    if (this.oathUntil > this.clock && (this.oathTick -= dt) <= 0) {
      this.oathTick = 1;
      for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < T.oath.r) H.hit(e, H.power() * T.oath.burn, { quiet: true });
    }
    // Cinder Ward: healing and a burning circle
    if (this.wardUntil > this.clock && (this.wardTick -= dt) <= 0) {
      this.wardTick = 1;
      H.heal(H.maxHp() * T.ward.heal / T.ward.secs);
      H.particles.fire(P.clone().setY(P.y + 0.4));
      for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < T.ward.r) H.hit(e, H.power() * T.ward.burn, { quiet: true });
    }
    // Bleeds
    for (const d of this.dots) {
      d.left -= dt; d.tick -= dt;
      if (d.tick <= 0 && d.e.alive) { d.tick = 1; H.hit(d.e, d.perSec, { quiet: true }); H.heal(H.maxHp() * T.bleed.heal); H.particles.sparks(d.e.pos.clone().setY(d.e.pos.y + 0.6), 4, '#a01a1a'); }
    }
    this.dots = this.dots.filter((d) => d.left > 0 && d.e.alive);
    // Bolts and arrows (an arrow's burst field holds its launch delay)
    for (const f of this.flying) {
      if (f.burst !== undefined && f.burst < 0) { f.burst += dt; if (f.burst >= 0) { f.burst = undefined; f.mesh.visible = true; } continue; }
      f.mesh.visible = true;
      const to = f.to.pos.clone().setY(f.to.pos.y + 1);
      const d = to.clone().sub(f.mesh.position);
      const step = f.speed * dt;
      if (d.length() <= step || !f.to.alive) {
        if (f.to.alive) {
          H.hit(f.to, f.dmg);
          if (f.burst) {
            H.particles.burst(to, '#ffb040', 26);
            for (const e of H.enemies()) if (e !== f.to && e.alive && e.pos.distanceTo(f.to.pos) < T.bolt.r) H.hit(e, f.burst);
          }
        }
        H.scene.remove(f.mesh);
        f.mesh.userData.done = true;
        continue;
      }
      f.mesh.position.addScaledVector(d.normalize(), step);
      f.mesh.lookAt(to);
    }
    this.flying = this.flying.filter((f) => !f.mesh.userData.done);
    // Things on their way down (a leap landing, a star)
    for (const p of this.pending) {
      p.t -= dt;
      if (p.t > 0) continue;
      H.particles.burst(p.at.clone().setY(p.at.y + 0.5), p.r > 4 ? '#ffe2a0' : '#ff7a50', p.r > 4 ? 60 : 24);
      H.sfx('hitHeavy');
      for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(p.at) < p.r) H.hit(e, p.dmg);
    }
    this.pending = this.pending.filter((p) => p.t > 0);
    // Rings fade
    for (const r of this.rings) {
      r.userData.age += dt;
      const k = r.userData.age / r.userData.life;
      (r.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k) + 0.15;
      if (k >= 1) { H.scene.remove(r); r.userData.done = true; }
    }
    this.rings = this.rings.filter((r) => !r.userData.done);
  }
}
