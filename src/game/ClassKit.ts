import * as THREE from 'three';
import { CALLINGS, CallingDef, CallingId, chosenUtilities, SkillDef, TUNE, WEAPON_SKILLS, WeaponLine } from '../data/classes';
import { tuned, type Tune } from '../data/talents';

/** The calling's numbers with the player's talents applied (data/talents.ts); one kit, one player. */
let T: Tune = TUNE;
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
  /** The ground point a ground-aimed skill lands on: under the cursor (or on the target, on a touch screen), at most range away. */
  aim(range: number): THREE.Vector3;
  /** Spring this far along dir (stopping short of walls and drops); false if there's no room. */
  dash(dir: THREE.Vector3, dist: number): boolean;
  /** A straight, open way from you to a ground point (no wall between, not up a cliff). */
  clear(at: THREE.Vector3): boolean;
}

interface Flying { mesh: THREE.Object3D; to: Enemy; speed: number; dmg: number; burst?: number; stun?: number; chill?: boolean; lance?: boolean }
interface Pending { at: THREE.Vector3; t: number; ring: THREE.Mesh; r: number; dmg: number; stun?: number }
interface Dot { e: Enemy; perSec: number; left: number; tick: number }
/** Ground that hurts for a while (a ring of fire, a rain of arrows, cinders), or a snare waiting for a foot. */
interface Zone { at: THREE.Vector3; r: number; left: number; tick: number; dmg: number; ring: THREE.Mesh; snare?: { stun: number }; chill?: boolean }
interface Cut { e: Enemy; t: number; dmg: number }

const RING_GEO = new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2);
const BOLT_GEO = new THREE.SphereGeometry(0.22, 8, 6);
const ARROW_GEO = new THREE.BoxGeometry(0.06, 0.06, 0.7);

export class ClassKit {
  calling: CallingDef = CALLINGS[0];
  /** The bar: the heal, three utilities, the elite (keys 4 to 8). */
  bar: SkillDef[] = [CALLINGS[0].skills[0], ...chosenUtilities(CALLINGS[0], null), CALLINGS[0].skills[2]];
  readonly cds = [0, 0, 0, 0, 0];
  /** The weapon skill (key 3): the line of the weapon in hand, and its cooldown. */
  weapon: WeaponLine = 'balanced';
  wcd = 0;
  private clock = 0;
  // Mechanics
  private resolve = 0; private resolveAt = 0;
  private fury = 0;
  private kindling = 0;
  private marks = new Map<Enemy, number>();
  /** The Wizard's Chill on each foe, and when it fades. */
  private chill = new Map<Enemy, { n: number; until: number }>();
  private evadeUntil = 0;
  // Effects
  private shield = 0; private shieldUntil = 0;
  private oathUntil = 0; private oathTick = 0;
  private redUntil = 0;
  private wardUntil = 0; private wardTick = 0;
  private stepStrike = 0;
  private holdUntil = 0;
  private rushUntil = 0;
  private riposteUntil = 0;
  private boltMult = 1;
  private zones: Zone[] = [];
  private cuts: Cut[] = [];
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
    this.bar = [c.skills[0], ...chosenUtilities(c, null), c.skills[2]];
    this.cds.fill(0);
    // Nothing carries over from the old calling
    this.fury = this.kindling = this.resolve = this.shield = 0;
    this.shieldUntil = this.oathUntil = this.redUntil = this.wardUntil = this.stepStrike = 0;
    this.holdUntil = this.rushUntil = this.riposteUntil = 0;
    this.boltMult = 1;
    this.dots = [];
    this.marks.clear();
    this.chill.clear();
    this.evadeUntil = 0;
  }

  /** Put these utilities (ids, three of the calling's four) on the bar. */
  setUtilities(ids: unknown): void {
    const u = chosenUtilities(this.calling, ids);
    this.bar = [this.calling.skills[0], ...u, this.calling.skills[2]];
  }

  /** The weapon skill for the weapon in hand. */
  get weaponSkill(): SkillDef { return WEAPON_SKILLS[this.weapon]; }

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

  /** Damage about to be taken: a Riposte turns it aside; Resolve, the Oath, Hold Fast, the Red Hour; then the shield soaks what it can. */
  incoming(dmg: number, from?: Enemy): number {
    // A Wizard's Blink: nothing touches you for a moment
    if (this.evadeUntil > this.clock) return 0;
    if (this.riposteUntil > this.clock) {
      this.riposteUntil = 0;
      const P = this.host.player();
      this.host.sfx('hitHeavy');
      this.host.particles.sparks(P.clone().setY(P.y + 1.2), 16, '#ffe8a0');
      if (from && from.alive) { this.host.setTarget(from); this.host.hit(from, this.host.power() * T.riposte.dmg, { crit: true }); }
      return 0;
    }
    let d = dmg;
    if (this.holdUntil > this.clock) d *= T.holdfast.taken;
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

  /** Hold Fast: nothing knocks you back. */
  steady(): boolean { return this.holdUntil > this.clock; }

  /** Blood Rush: how much faster you swing. */
  attackSpeed(): number { return this.rushUntil > this.clock ? T.rush.speed : 1; }

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
      case 'wizard': {
        let n = 0;
        for (const [e, c] of this.chill) if (e.alive && c.until > this.clock) n = Math.max(n, c.n);
        return { label: `${m.name} ${n}/${T.chill.max}`, value: n, max: T.chill.max, color: m.color };
      }
      default: {
        let left = 0;
        for (const [e, until] of this.marks) if (e.alive && until > this.clock) left = Math.max(left, until - this.clock);
        return { label: left > 0 ? `${m.name}: ${Math.ceil(left)}s` : m.name, value: left, max: T.volley.mark, color: m.color };
      }
    }
  }

  /** Apply the talents learned for this calling. */
  setTalents(learned: string[]): void { T = tuned(learned); }

  slots(): { left: number; total: number }[] {
    return this.bar.map((s, i) => ({ left: this.cds[i], total: i === 0 ? s.cd * this.host.sustainScale() : s.cd }));
  }

  weaponSlot(): { left: number; total: number } { return { left: this.wcd, total: this.weaponSkill.cd }; }

  /** The weapon skill (key 3). */
  useWeapon(): boolean {
    if (this.wcd > 0) return false;
    const s = this.weaponSkill;
    if (!this.cast(s.id, this.host.player(), this.host.power())) return false;
    this.wcd = s.cd;
    this.host.inCombat();
    return true;
  }

  // ---------------------------------------------------------------- The skills
  /** Use bar slot i (0 the heal, 1 to 3 the utilities, 4 the elite). Returns false if it couldn't be used (cooling, no target). */
  use(i: number): boolean {
    if (this.cds[i] > 0) return false;
    const P = this.host.player();
    const s = this.bar[i];
    if (!s) return false;
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
        const at = H.aim(T.leap.range);
        if (at.distanceTo(P) < 1.5 || Math.abs(at.y - P.y) > 4 || !H.clear(at)) return false;
        H.moveTo(at.x, at.z, 0.32, at.y);
        H.anim('cleave'); H.sfx('swing');
        this.pending.push({ at: at.clone(), t: 0.32, ring: this.ring(at, T.leap.r, '#e0583a', 0.32), r: T.leap.r, dmg: pw * T.leap.dmg });
        return true;
      }
      case 'redhour':
        this.redUntil = this.clock + T.redhour.secs;
        H.particles.burst(P.clone().setY(P.y + 1), '#c02a1a', 30); H.sfx('growl');
        return true;
      // Kindler
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
        const k = this.boltMult;
        this.boltMult = 1;
        const m = new THREE.Mesh(BOLT_GEO, new THREE.MeshBasicMaterial({ color: burst ? '#ffd060' : k > 1 ? '#fff0a0' : '#ff8a3a' }));
        m.position.copy(P).setY(P.y + 1.4);
        if (burst || k > 1) m.scale.setScalar(1.6);
        H.scene.add(m);
        this.flying.push({ mesh: m, to: e, speed: 26, dmg: pw * T.bolt.dmg * k, burst: burst ? pw * T.bolt.burst : undefined });
        return true;
      }
      case 'starfall': {
        const at = H.aim(T.starfall.range);
        H.anim('heal'); H.sfx('bell');
        this.pending.push({ at, t: T.starfall.delay, ring: this.ring(at, T.starfall.r, '#ffd27a', T.starfall.delay), r: T.starfall.r, dmg: pw * T.starfall.dmg });
        return true;
      }
      // Wizard
      case 'icebarrier':
        this.shield = H.maxHp() * T.icebarrier.shield; this.shieldUntil = this.clock + T.icebarrier.secs;
        H.anim('heal'); H.sfx('bell');
        H.particles.burst(P.clone().setY(P.y + 1), '#cfefff', 18);
        return true;
      case 'frostbolt':
      case 'icelance': {
        const lance = id === 'icelance';
        const e = H.faceTarget(lance ? T.icelance.range : T.frostbolt.range);
        if (!e) return false;
        H.anim('attack');
        const m = new THREE.Mesh(lance ? new THREE.ConeGeometry(0.12, 1.1, 6).rotateX(Math.PI / 2) : new THREE.OctahedronGeometry(0.24, 0), new THREE.MeshBasicMaterial({ color: lance ? '#bfefff' : '#8ad8f0' }));
        m.position.copy(P).setY(P.y + 1.4);
        H.scene.add(m);
        this.flying.push({ mesh: m, to: e, speed: lance ? 34 : 24, dmg: pw * (lance ? T.icelance.dmg : T.frostbolt.dmg), chill: !lance, lance });
        return true;
      }
      case 'blizzard': {
        const at = H.aim(T.blizzard.range);
        H.anim('heal'); H.sfx('bell');
        this.zone(at, T.blizzard.r, T.blizzard.secs, pw * T.blizzard.dmg, '#bfe4ff', undefined, true);
        return true;
      }
      case 'blink': {
        const at = H.aim(T.blink.range);
        if (at.distanceTo(P) < 1.5 || Math.abs(at.y - P.y) > 4 || !H.clear(at)) return false;
        H.particles.burst(P.clone().setY(P.y + 1), '#b8a8ff', 20);
        H.moveTo(at.x, at.z, 0.06, at.y);
        this.evadeUntil = this.clock + T.blink.evade;
        H.particles.burst(at.clone().setY(at.y + 1), '#b8a8ff', 20);
        return true;
      }
      case 'frostnova': {
        H.anim('cleave'); H.sfx('hitHeavy');
        this.ring(P, T.frostnova.r, '#bfe4ff', 0.6);
        H.particles.burst(P.clone().setY(P.y + 0.6), '#dff6ff', 40);
        let any = false;
        for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < T.frostnova.r) { H.hit(e, pw * T.frostnova.dmg); e.stun = Math.max(e.stun, T.frostnova.freeze); any = true; }
        return any || !!H.faceTarget(T.frostnova.r);
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
      // Warden utilities
      case 'holdfast':
        this.holdUntil = this.clock + T.holdfast.secs;
        this.ring(P, 1.4, '#9fc4e8', T.holdfast.secs);
        H.anim('heal'); H.sfx('bell');
        return true;
      case 'shieldthrow': {
        const e = H.faceTarget(T.shieldthrow.range);
        if (!e) return false;
        H.anim('attack'); H.sfx('swing');
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 10).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#8aa0c0' }));
        m.position.copy(P).setY(P.y + 1.3);
        H.scene.add(m);
        this.flying.push({ mesh: m, to: e, speed: 24, dmg: pw * T.shieldthrow.dmg, stun: T.shieldthrow.stun });
        return true;
      }
      case 'rally':
        H.heal(H.maxHp() * T.rally.heal);
        this.resolve = T.resolve.max; this.resolveAt = this.clock;
        H.anim('heal'); H.sfx('heal'); H.particles.heal(P);
        return true;
      // Reaver utilities
      case 'rend': {
        H.anim('cleave'); H.sfx('swing');
        const face = new THREE.Vector3(Math.sin(H.yaw()), 0, Math.cos(H.yaw()));
        let any = false;
        for (const e of H.enemies()) {
          if (!e.alive) continue;
          const to = new THREE.Vector3().subVectors(e.pos, P).setY(0);
          const d = to.length();
          if (d > T.rend.r || (d > 1 && to.normalize().dot(face) < 0.2)) continue;
          H.hit(e, pw * T.rend.dmg);
          this.dots = this.dots.filter((x) => x.e !== e);
          this.dots.push({ e, perSec: pw * T.rend.dot, left: T.rend.secs, tick: 1 });
          any = true;
        }
        H.particles.sparks(P.clone().add(face.multiplyScalar(1.5)).setY(P.y + 1), 14, '#ff8a6a');
        return any || !!H.faceTarget(T.rend.r);
      }
      case 'rush':
        this.rushUntil = this.clock + T.rush.secs;
        H.particles.burst(P.clone().setY(P.y + 1), '#e0583a', 18); H.sfx('growl');
        return true;
      case 'hamstring': {
        const e = H.faceTarget(T.hamstring.range);
        if (!e) return false;
        H.anim('attack'); H.sfx('hitHeavy');
        H.hit(e, pw * T.hamstring.dmg);
        e.stun = Math.max(e.stun, T.hamstring.stun);
        return true;
      }
      // Kindler utilities
      case 'firewall': {
        const at = H.aim(T.firewall.range);
        H.anim('heal'); H.sfx('bell');
        this.zone(at, T.firewall.r, T.firewall.secs, pw * T.firewall.burn, '#ff7a30');
        return true;
      }
      case 'cinderstep': {
        const back = new THREE.Vector3(-Math.sin(H.yaw()), 0, -Math.cos(H.yaw()));
        const from = P.clone();
        if (!H.dash(back, T.cinderstep.dist)) return false;
        this.zone(from, T.cinderstep.r, T.cinderstep.secs, pw * T.cinderstep.burn, '#ff9a40');
        H.particles.fire(from.clone().setY(from.y + 0.3));
        return true;
      }
      case 'kindle':
        this.kindling = Math.min(T.bolt.every - 1, this.kindling + T.kindle.stacks);
        this.boltMult = T.kindle.mult;
        H.particles.fire(P.clone().setY(P.y + 1)); H.sfx('heal');
        return true;
      // Pathfinder utilities
      case 'snare': {
        const at = H.aim(T.snare.range);
        H.anim('attack'); H.sfx('swing');
        this.zone(at, T.snare.r, T.snare.secs, pw * T.snare.dmg, '#c8b080', { stun: T.snare.stun });
        return true;
      }
      case 'rain': {
        const at = H.aim(T.rain.range);
        H.anim('attack'); H.sfx('swing');
        this.zone(at, T.rain.r, T.rain.secs, pw * T.rain.dmg, '#e8dcc0');
        return true;
      }
      case 'quickstep': {
        const back = new THREE.Vector3(-Math.sin(H.yaw()), 0, -Math.cos(H.yaw()));
        if (!H.dash(back, T.quickstep.dist)) return false;
        this.stepStrike = this.clock + T.quickstep.window;
        H.particles.dust(P, 8);
        return true;
      }
      // Weapon skills
      case 'riposte':
        this.riposteUntil = this.clock + T.riposte.secs;
        H.anim('attack'); H.sfx('swing');
        H.particles.sparks(P.clone().setY(P.y + 1.3), 8, '#ffe8a0');
        return true;
      case 'flurry': {
        const e = H.faceTarget(T.flurry.range);
        if (!e) return false;
        for (let k = 0; k < T.flurry.hits; k++) this.cuts.push({ e, t: k * T.flurry.every, dmg: pw * T.flurry.dmg });
        H.anim('attack'); H.sfx('swing');
        return true;
      }
      case 'sunder': {
        const at = H.aim(T.sunder.range);
        H.anim('cleave'); H.sfx('swing');
        this.pending.push({ at, t: T.sunder.delay, ring: this.ring(at, T.sunder.r, '#ffd27a', T.sunder.delay), r: T.sunder.r, dmg: pw * T.sunder.dmg, stun: T.sunder.stun });
        return true;
      }
    }
    return false;
  }

  /** Ground that hurts for a while, or a snare. */
  private zone(at: THREE.Vector3, r: number, secs: number, dmg: number, color: string, snare?: { stun: number }, chill?: boolean): void {
    const ring = this.ring(at, r, color, secs);
    this.zones.push({ at: at.clone(), r, left: secs, tick: snare ? 0 : 0.2, dmg, ring, snare, chill });
  }

  /** Chill a foe; at full Chill it freezes solid for a moment and cracks for extra damage. */
  private addChill(e: Enemy): void {
    if (!e.alive) return;
    const c = this.chill.get(e);
    const n = (c && c.until > this.clock ? c.n : 0) + 1;
    if (n < T.chill.max) { this.chill.set(e, { n, until: this.clock + T.chill.fade }); return; }
    this.chill.delete(e);
    e.stun = Math.max(e.stun, T.chill.freeze);
    this.host.particles.burst(e.pos.clone().setY(e.pos.y + 1), '#dff6ff', 30);
    this.host.sfx('hitHeavy');
    this.host.hit(e, this.host.power() * T.chill.shatter);
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
    for (let i = 0; i < this.cds.length; i++) this.cds[i] = Math.max(0, this.cds[i] - dt * haste);
    this.wcd = Math.max(0, this.wcd - dt * haste);
    // Flurry's cuts, one after another
    for (const c of this.cuts) {
      c.t -= dt;
      if (c.t <= 0 && c.e.alive && c.e.pos.distanceTo(P) < T.flurry.range + 1.5) { H.hit(c.e, c.dmg); H.sfx('swing'); }
    }
    this.cuts = this.cuts.filter((c) => c.t > 0);
    // Burning ground, arrows falling, snares waiting
    for (const z of this.zones) {
      z.left -= dt;
      if (z.snare) {
        const caught = H.enemies().find((e) => e.alive && Math.hypot(e.pos.x - z.at.x, e.pos.z - z.at.z) < z.r);
        if (caught) { caught.stun = Math.max(caught.stun, z.snare.stun); H.hit(caught, z.dmg); H.particles.sparks(z.at.clone().setY(z.at.y + 0.5), 12, '#c8b080'); z.left = 0; }
        continue;
      }
      if ((z.tick -= dt) > 0) continue;
      z.tick = 1;
      for (const e of H.enemies()) if (e.alive && Math.hypot(e.pos.x - z.at.x, e.pos.z - z.at.z) < z.r && Math.abs(e.pos.y - z.at.y) < 3) { H.hit(e, z.dmg, { quiet: true }); if (z.chill) this.addChill(e); }
      if (z.chill) for (let k = 0; k < 3; k++) H.particles.dust(z.at.clone().add(new THREE.Vector3((Math.random() - 0.5) * z.r * 1.6, 4, (Math.random() - 0.5) * z.r * 1.6)), 6);
      else H.particles.sparks(z.at.clone().setY(z.at.y + 0.4), 6, '#ffb060');
    }
    for (const z of this.zones) if (z.left <= 0) { z.ring.userData.age = z.ring.userData.life; }
    this.zones = this.zones.filter((z) => z.left > 0);
    for (const [e, until] of this.marks) if (until <= this.clock || !e.alive) this.marks.delete(e);
    for (const [e, c] of this.chill) if (c.until <= this.clock || !e.alive) this.chill.delete(e);
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
          // An Ice Lance on a frozen foe (stunned, by frost or anything else) hits far harder
          const frozen = f.lance && f.to.stun > 0;
          H.hit(f.to, f.dmg * (frozen ? T.icelance.frozen : 1), frozen ? { crit: true } : undefined);
          if (f.lance) H.particles.burst(to, '#dff6ff', frozen ? 24 : 10);
          if (f.chill) this.addChill(f.to);
          if (f.stun) f.to.stun = Math.max(f.to.stun, f.stun);
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
      for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(p.at) < p.r) { H.hit(e, p.dmg); if (p.stun) e.stun = Math.max(e.stun, p.stun); }
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
