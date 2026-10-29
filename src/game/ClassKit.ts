import * as THREE from 'three';
import { CALLINGS, CallingDef, CallingId, chosenUtilities, SkillDef, TUNE, WEAPON_SKILLS, WeaponLine } from '../data/classes';
import { tuned, type Tune } from '../data/talents';

/** The calling's numbers with the player's talents applied (data/talents.ts); one kit, one player. */
let T: Tune = TUNE;
import type { Enemy } from '../entities/Enemy';
import type { Particles } from '../systems/Particles';
import { Ally } from '../entities/Ally';
import type { Henchman } from '../data/dungeons';
import type { VoxelWorld } from '../world/VoxelWorld';

// The calling in play: its three skills, its mechanic, and the effects they leave in the world
// (shields, bleeds, burning rings, bolts and arrows in flight, a star on its way down). The game
// asks it to change what the player deals and takes, and draws its gauge.

/**
 * Someone on your side, for the Mender's heals and wards: you, a henchman, a groupmate near you. A
 * groupmate's heal or ward goes to them by the realm (game/Game.ts friends).
 */
export interface Friend { name: string; pos: THREE.Vector3; hp: number; max: number; me?: boolean; heal(n: number): void; ward(n: number, secs: number): void }

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
  anim(state: 'attack' | 'cleave' | 'heal' | 'shoot'): void;
  /** A bow in hand (the Pathfinder's arrows are loosed from it). */
  bow?(): boolean;
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
  /** You and everyone on your side near you (you first). */
  friends(): Friend[];
  /** Your health now, your level, and the world (a Gravecaller's raised dead walk in it). */
  hp(): number;
  level(): number;
  voxels(): VoxelWorld;
  /** A skill went off: it counts towards its rank (data/skillpoints.ts). */
  used?(id: string): void;
}

interface Flying { mesh: THREE.Object3D; to: Enemy; speed: number; dmg: number; burst?: number; stun?: number; chill?: boolean; lance?: boolean; crit?: boolean; bounce?: number; wither?: boolean }
interface Pending { at: THREE.Vector3; t: number; ring: THREE.Mesh; r: number; dmg: number; stun?: number }
interface Dot { e: Enemy; perSec: number; left: number; tick: number }
/** Ground that hurts for a while (a ring of fire, a rain of arrows, cinders), or a snare waiting for a foot. */
interface Zone { at: THREE.Vector3; r: number; left: number; tick: number; dmg: number; ring: THREE.Mesh; snare?: { stun: number }; chill?: boolean; fire?: boolean; mark?: boolean }
interface Cut { e: Enemy; t: number; dmg: number }

/** The body a Gravecaller raises: grave-dirt and old bone, an old blade still in its hand. */
const THRALL: Henchman = {
  id: 'thrall', name: 'The Fallen', title: '', role: 'damage', held: 'sword',
  look: { skin: '#c8c4b0', hair: '#4a4842', hairStyle: 0, eyes: '#a8d870', tunic: '#4a4a40', trim: '#6a6a58', trousers: '#3a3a32', boots: '#2a2a24', build: 0.86, age: 0.95 },
  barks: { pull: [], low: [], kill: [], down: '', up: '' },
};

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
  /** The Mender's Grace, and Sanctuary (where it stands, until when, its burn) and the Restorations ticking on each friend. */
  private grace = 0;
  private sanct: { at: THREE.Vector3; until: number; tick: number; burn: number } | null = null;
  private hots: { f: Friend; per: number; left: number; tick: number }[] = [];
  /** The Gravecaller's Lifeblood (a share of your health), the Wither on each foe, and the raised dead. */
  private blood = 0;
  private wither = new Map<Enemy, { n: number; until: number; tick: number }>();
  private thralls: { body: Ally; left: number; swing: number }[] = [];
  // Effects
  private shield = 0; private shieldUntil = 0;
  /** Whose the shield is: a Bulwark and an Ice Barrier each do something of their own when it breaks or runs out (talents). */
  private shieldKind: 'bulwark' | 'ice' | 'bone' | 'other' = 'other';
  /** Survivor: healing still to come from a Field Dressing, a share of health a second, until then. */
  private hot = 0; private hotUntil = 0; private hotTick = 0;
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
    this.holdUntil = this.rushUntil = this.riposteUntil = this.hotUntil = 0;
    this.shieldKind = 'other';
    this.boltMult = 1;
    this.dots = [];
    this.marks.clear();
    this.chill.clear();
    this.evadeUntil = 0;
    this.grace = 0; this.sanct = null; this.hots = [];
    this.blood = 0; this.wither.clear(); this.dismissThralls();
  }

  /** Put these utilities on the bar (the calling's own, and one of a master's for an apprentice). */
  setUtilities(ids: unknown, ap: CallingDef | null = null): void {
    const u = chosenUtilities(this.calling, ids, ap);
    this.bar = [this.calling.skills[0], ...u, this.calling.skills[2]];
  }

  /** The weapon skill for the weapon in hand. */
  get weaponSkill(): SkillDef { return WEAPON_SKILLS[this.weapon]; }

  // ---------------------------------------------------------------- What the game asks
  /** Change damage the player is about to deal to e. */
  /** One arrow from a bow (a Strike with a bow in hand): it flies to the target and hits there. */
  loose(e: Enemy, dmg: number, crit: boolean): void {
    const P = this.host.player();
    const m = new THREE.Mesh(ARROW_GEO, new THREE.MeshBasicMaterial({ color: '#e8dcc0' }));
    m.position.copy(P).setY(P.y + 1.45);
    m.visible = false;
    this.host.scene.add(m);
    this.flying.push({ mesh: m, to: e, speed: 38, dmg, crit, burst: -0.12 });
  }

  outgoing(e: Enemy, dmg: number): number {
    let k = 1;
    if (this.redUntil > this.clock) k *= T.redhour.dealt;
    if ((this.marks.get(e) ?? 0) > this.clock) k *= 1 + T.volley.markBonus;
    if (this.calling.id === 'warden') k *= 1 + this.resolve * T.resolve.dmg;
    return dmg * k;
  }

  /** A blow of the player's landed (any source): mechanics that feed on hits. */
  landed(): void {
    if (this.calling.id === 'reaver') this.fury = Math.min(100, this.fury + T.fury.perHit * (this.redUntil > this.clock ? T.fury.red : 1));
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
    if (this.inSanctuary(this.host.player())) d *= T.sanctuary.taken;
    if (this.shield > 0 && this.shieldUntil > this.clock) {
      // Frostbite: the ice bites back
      if (this.shieldKind === 'ice' && from && Math.random() < T.icebarrier.bite) this.addChill(from);
      // Bone Ward: whatever strikes it withers
      if (this.shieldKind === 'bone' && from) this.addWither(from, 1);
      const soak = Math.min(this.shield, d);
      this.shield -= soak;
      d -= soak;
      this.host.particles.sparks(this.host.player().clone().setY(this.host.player().y + 1.2), 6, '#bfe4ff');
      if (this.shield <= 0) this.shieldBroken();
    }
    return d;
  }

  /** A shield broken by a blow: Unbroken's burst, or Shatter Shell's nova. */
  private shieldBroken(): void {
    const H = this.host, P = H.player();
    if (this.shieldKind === 'bulwark' && T.bulwark.burst > 0) {
      this.ring(P, 4, '#cfe6ff', 0.5);
      H.particles.burst(P.clone().setY(P.y + 1), '#cfe6ff', 30); H.sfx('hitHeavy');
      for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < 4) { H.hit(e, H.power() * T.bulwark.burst); e.stun = Math.max(e.stun, T.bulwark.burstStun); }
    }
    if (this.shieldKind === 'ice' && T.icebarrier.nova > 0) this.nova(P, H.power());
    this.shieldKind = 'other';
  }

  /** Frost Nova: cold bursting out of you. Whether anything was caught. */
  private nova(P: THREE.Vector3, pw: number): boolean {
    const H = this.host;
    H.anim('cleave'); H.sfx('hitHeavy');
    this.ring(P, T.frostnova.r, '#bfe4ff', 0.6);
    H.particles.burst(P.clone().setY(P.y + 0.6), '#dff6ff', 40);
    let any = false;
    for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < T.frostnova.r) { H.hit(e, pw * T.frostnova.dmg); e.stun = Math.max(e.stun, T.frostnova.freeze); any = true; }
    return any;
  }

  /** A skill's cooldown, with its talents. */
  private cdOf(s: SkillDef, i: number): number { return (i === 0 ? s.cd * this.host.sustainScale() : s.cd) * (T.cd[s.id] ?? 1); }

  /** Hold Fast: nothing knocks you back. */
  steady(): boolean { return this.holdUntil > this.clock; }

  /** Blood Rush: how much faster you swing. */
  attackSpeed(): number { return this.rushUntil > this.clock ? T.rush.speed : 1; }
  /** A wound from outside the calling (a named piece's): it ticks with the calling's own. */
  addDot(e: Enemy, perSec: number, secs: number): void { this.dots.push({ e, perSec, left: secs, tick: 1 }); }
  /** A ward from outside the calling (a named piece's): it takes blows until it's spent or runs out. */
  addShield(amount: number, secs: number): void { this.shield = Math.max(this.shield, amount); this.shieldUntil = Math.max(this.shieldUntil, this.clock + secs); this.shieldKind = 'other'; }

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
      case 'gravecaller': return { label: `${m.name} ${Math.round(this.blood * 100)}%`, value: this.blood, max: T.lifeblood.max, color: m.color };
      case 'mender': return { label: this.grace >= T.grace.max ? 'Grace: full' : `${m.name} ${this.grace}/${T.grace.max}`, value: this.grace, max: T.grace.max, color: m.color };
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
  setTalents(learned: string[], extra?: (t: Tune) => void): void { T = tuned(learned); extra?.(T); }

  slots(): { left: number; total: number }[] {
    return this.bar.map((s, i) => ({ left: this.cds[i], total: this.cdOf(s, i) }));
  }

  weaponSlot(): { left: number; total: number } { return { left: this.wcd, total: this.weaponSkill.cd }; }

  /** The weapon skill (key 3). */
  useWeapon(): boolean {
    if (this.wcd > 0) return false;
    const s = this.weaponSkill;
    if (!this.cast(s.id, this.host.player(), this.host.power())) return false;
    this.host.used?.(s.id);
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
    this.host.used?.(s.id);
    if (fury > 1) { this.fury = 0; this.host.particles.burst(P.clone().setY(P.y + 1), '#ff5a3a', 20); }
    this.cds[i] = this.cdOf(s, i);
    if (i > 0) this.host.inCombat();
    return true;
  }

  private cast(id: string, P: THREE.Vector3, pw: number): boolean {
    const H = this.host;
    switch (id) {
      // Warden
      case 'bulwark':
        this.shield = H.maxHp() * T.bulwark.shield; this.shieldUntil = this.clock + T.bulwark.secs; this.shieldKind = 'bulwark';
        H.anim('heal'); H.sfx('bell');
        return true;
      case 'bash': {
        const e = H.faceTarget(T.bash.range);
        if (!e) return false;
        H.anim('attack'); H.sfx('hitHeavy');
        H.hit(e, pw * T.bash.dmg);
        e.stun = Math.max(e.stun, T.bash.stun);
        // Toll Due: everything close to the target takes it too
        if (T.bash.cleave > 0) for (const o of H.enemies()) if (o !== e && o.alive && o.pos.distanceTo(e.pos) < T.bash.cleave) { H.hit(o, pw * T.bash.dmg); o.stun = Math.max(o.stun, T.bash.stun); }
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
        H.heal(H.maxHp() * T.bleed.cutHeal);
        return true;
      }
      case 'leap': {
        const at = H.aim(T.leap.range);
        if (at.distanceTo(P) < 1.5 || Math.abs(at.y - P.y) > 4 || !H.clear(at)) return false;
        H.moveTo(at.x, at.z, 0.32, at.y);
        H.anim('cleave'); H.sfx('swing');
        this.pending.push({ at: at.clone(), t: 0.32, ring: this.ring(at, T.leap.r, '#e0583a', 0.32), r: T.leap.r, dmg: pw * T.leap.dmg, stun: T.leap.stun || undefined });
        return true;
      }
      case 'redhour':
        this.redUntil = this.clock + T.redhour.secs;
        H.particles.burst(P.clone().setY(P.y + 1), '#c02a1a', 30); H.sfx('growl');
        return true;
      // Gravecaller
      case 'siphon': {
        const e = H.faceTarget(T.siphon.range);
        if (!e) return false;
        H.anim('heal'); H.sfx('growl');
        H.hit(e, pw * T.siphon.dmg);
        H.particles.burst(e.pos.clone().setY(e.pos.y + 1.2), '#a8303a', 20);
        H.particles.sparks(P.clone().setY(P.y + 1.2), 12, '#c84048');
        // Whatever heals past full goes into Lifeblood
        const want = H.maxHp() * T.siphon.heal, room = Math.max(0, H.maxHp() - H.hp());
        H.heal(want);
        if (want > room) this.addBlood((want - room) / H.maxHp() * T.lifeblood.siphon);
        return true;
      }
      case 'wither': {
        const e = H.faceTarget(T.wither.range);
        if (!e) return false;
        H.anim('attack');
        const m = new THREE.Mesh(BOLT_GEO, new THREE.MeshBasicMaterial({ color: '#9ac060' }));
        m.position.copy(P).setY(P.y + 1.4);
        H.scene.add(m);
        this.flying.push({ mesh: m, to: e, speed: 24, dmg: pw * T.wither.dmg, wither: true });
        return true;
      }
      case 'raise':
        this.dismissThralls();
        for (let k = 0; k < T.raise.n; k++) {
          const a = (k / T.raise.n) * Math.PI * 2 + H.yaw();
          const body = new Ally(THRALL, H.level(), H.voxels());
          body.place(P.x + Math.sin(a) * 1.6, P.y, P.z + Math.cos(a) * 1.6);
          body.yaw = H.yaw();
          H.scene.add(body.model.root);
          this.thralls.push({ body, left: T.raise.secs, swing: 0.6 + k * 0.4 });
          H.particles.dust(body.pos.clone().setY(body.pos.y + 0.3), 16);
        }
        this.ring(P, 2.5, '#9ac060', 0.8);
        H.anim('heal'); H.sfx('growl');
        return true;
      case 'boneward':
        this.shield = Math.max(this.shield, H.maxHp() * T.boneward.shield);
        this.shieldUntil = this.clock + T.boneward.secs;
        this.shieldKind = 'bone';
        H.particles.burst(P.clone().setY(P.y + 1), '#ece6d4', 24);
        H.anim('heal'); H.sfx('bell');
        return true;
      case 'gravegrip': {
        const e = H.faceTarget(T.gravegrip.range);
        if (!e) return false;
        H.anim('cleave'); H.sfx('hitHeavy');
        const at = e.pos.clone();
        this.ring(at, T.gravegrip.r, '#7a8a5a', 0.7);
        H.particles.dust(at.clone().setY(at.y + 0.3), 20);
        // Held fast: a stun, so a blow being wound up is lost
        for (const o of H.enemies()) if (o.alive && o.pos.distanceTo(at) < T.gravegrip.r) { H.hit(o, pw * T.gravegrip.dmg); o.stun = Math.max(o.stun, T.gravegrip.stun); }
        return true;
      }
      case 'graverot': {
        const e = H.faceTarget(T.graverot.range);
        if (!e) return false;
        H.anim('cleave'); H.sfx('growl');
        const at = e.pos.clone();
        this.ring(at, T.graverot.r, '#7a8a3a', 0.8);
        H.particles.burst(at.clone().setY(at.y + 0.8), '#8aa040', 30);
        let n = 0;
        for (const o of H.enemies()) if (o.alive && o.pos.distanceTo(at) < T.graverot.r) { H.hit(o, pw * T.graverot.dmg); this.addWither(o, T.graverot.stacks); n++; }
        if (n && T.graverot.heal > 0) H.heal(H.maxHp() * T.graverot.heal * n);
        return true;
      }
      // Mender
      case 'mend': {
        const full = this.grace >= T.grace.max;
        const fr = H.friends();
        // Full Grace: everyone near, twice over; otherwise you and the most hurt of the rest
        const who = full ? fr.filter((f) => f.pos.distanceTo(P) < T.grace.r) : [fr[0], this.mostHurt(T.mend.r, true)].filter((f): f is Friend => !!f);
        for (const f of who) this.mendFriend(f, T.mend.heal * (full ? T.grace.mult : 1) * (f.me ? T.mend.self : 1));
        this.grace = full ? 0 : Math.min(T.grace.max, this.grace + 2);
        if (full) { this.ring(P, T.grace.r, '#f8e8a8', 0.8); H.particles.burst(P.clone().setY(P.y + 1.2), '#fff0c0', 40); }
        H.anim('heal'); H.sfx('heal');
        return true;
      }
      case 'lanternlight': {
        const e = H.faceTarget(T.lanternlight.range);
        if (!e) return false;
        H.anim('attack');
        const m = new THREE.Mesh(BOLT_GEO, new THREE.MeshBasicMaterial({ color: '#fff0b8' }));
        m.position.copy(P).setY(P.y + 1.4);
        H.scene.add(m);
        this.flying.push({ mesh: m, to: e, speed: 28, dmg: pw * T.lanternlight.dmg, bounce: T.lanternlight.bounce });
        // Its glow: the most hurt of you and yours, a little, and Grace
        const f = this.mostHurt(T.lanternlight.r, false);
        if (f && f.hp < f.max) this.mendFriend(f, T.lanternlight.heal);
        return true;
      }
      case 'sanctuary':
        this.sanct = { at: P.clone(), until: this.clock + T.sanctuary.secs, tick: 0, burn: pw * T.sanctuary.burn };
        this.ring(P, T.sanctuary.r, '#f8e090', T.sanctuary.secs);
        H.anim('heal'); H.sfx('bell');
        H.particles.burst(P.clone().setY(P.y + 0.4), '#fff0c0', 50);
        return true;
      case 'lampward':
        for (const f of H.friends()) if (f.pos.distanceTo(P) < T.lampward.r) {
          if (f.me) { this.shield = Math.max(this.shield, f.max * T.lampward.shield); this.shieldUntil = this.clock + T.lampward.secs; this.shieldKind = 'other'; }
          else f.ward(f.max * T.lampward.shield, T.lampward.secs);
          H.particles.sparks(f.pos.clone().setY(f.pos.y + 1.2), 10, '#f8e8a8');
        }
        H.anim('heal'); H.sfx('bell');
        return true;
      case 'rebuke': {
        H.anim('cleave'); H.sfx('hitHeavy');
        this.ring(P, T.rebuke.r, '#fff4c8', 0.5);
        H.particles.burst(P.clone().setY(P.y + 1), '#fff4c8', 36);
        let n = 0;
        for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < T.rebuke.r) { H.hit(e, pw * T.rebuke.dmg); e.stun = Math.max(e.stun, T.rebuke.stun); n++; }
        // Hard Mercy: every foe struck mends you and yours
        if (n && T.rebuke.heal > 0) for (const f of H.friends()) if (f.pos.distanceTo(P) < 10) this.mendFriend(f, T.rebuke.heal * n, false);
        return n > 0 || true;
      }
      case 'restore':
        for (const f of H.friends()) if (f.pos.distanceTo(P) < T.restore.r) this.hots.push({ f, per: f.max * T.restore.heal / T.restore.secs, left: T.restore.secs, tick: 1 });
        this.grace = Math.min(T.grace.max, this.grace + 1);
        H.anim('heal'); H.sfx('heal');
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
        // Two Stars: another behind it
        if (T.starfall.twice > 0) this.pending.push({ at: at.clone(), t: T.starfall.delay + 0.7, ring: this.ring(at, T.starfall.r, '#ffe8b0', T.starfall.delay + 0.7), r: T.starfall.r, dmg: pw * T.starfall.dmg * T.starfall.twice });
        return true;
      }
      // Wizard
      case 'icebarrier':
        this.shield = H.maxHp() * T.icebarrier.shield; this.shieldUntil = this.clock + T.icebarrier.secs; this.shieldKind = 'ice';
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
      case 'frostnova':
        return this.nova(P, pw) || !!H.faceTarget(T.frostnova.r);
      // Pathfinder
      case 'dressing':
        H.heal(H.maxHp() * T.dressing.heal); H.anim('heal'); H.sfx('heal'); H.particles.heal(P);
        if (T.dressing.hot > 0) { this.hot = T.dressing.hot / 5; this.hotUntil = this.clock + 5; this.hotTick = 1; }
        return true;
      case 'volley': {
        const e = H.faceTarget(T.volley.range);
        if (H.bow?.()) H.anim('shoot');
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
        if (T.quickstep.evade > 0) this.evadeUntil = this.clock + T.quickstep.evade;
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
        this.flying.push({ mesh: m, to: e, speed: 24, dmg: pw * T.shieldthrow.dmg, stun: T.shieldthrow.stun, bounce: T.shieldthrow.bounce });
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
        this.zones[this.zones.length - 1].fire = true;
        return true;
      }
      case 'cinderstep': {
        const back = new THREE.Vector3(-Math.sin(H.yaw()), 0, -Math.cos(H.yaw()));
        const from = P.clone();
        if (!H.dash(back, T.cinderstep.dist)) return false;
        this.zone(from, T.cinderstep.r, T.cinderstep.secs, pw * T.cinderstep.burn, '#ff9a40');
        this.zones[this.zones.length - 1].fire = true;
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
        this.zones[this.zones.length - 1].mark = T.rain.mark > 0;
        return true;
      }
      case 'quickstep': {
        const back = new THREE.Vector3(-Math.sin(H.yaw()), 0, -Math.cos(H.yaw()));
        if (!H.dash(back, T.quickstep.dist)) return false;
        this.stepStrike = this.clock + T.quickstep.window;
        if (T.quickstep.evade > 0) this.evadeUntil = this.clock + T.quickstep.evade;
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

  /** Lifeblood, up to what it holds. */
  private addBlood(share: number): void { this.blood = Math.min(T.lifeblood.max, this.blood + share); }
  /** Lifeblood, as a share of your health (a blood skill takes it first). */
  get lifeblood(): number { return this.blood; }
  /** Pay a blood price (a share of your health): Lifeblood first; what's left over comes out of your health. */
  payBlood(share: number): number { const from = Math.min(this.blood, share); this.blood -= from; return share - from; }
  /** Wither on a foe, deeper (up to its most) and fresh again. */
  private addWither(e: Enemy, n: number): void {
    const w = this.wither.get(e);
    if (w) { w.n = Math.min(T.wither.max, w.n + n); w.until = this.clock + T.wither.secs; }
    else this.wither.set(e, { n: Math.min(T.wither.max, n), until: this.clock + T.wither.secs, tick: 1 });
  }
  /** The raised lie down again. */
  private dismissThralls(): void {
    for (const t of this.thralls) { this.host.particles.dust(t.body.pos.clone().setY(t.body.pos.y + 0.5), 14); this.host.scene.remove(t.body.model.root); }
    this.thralls = [];
  }

  /** The most hurt of you and yours within r (by share of health; others before you unless you're worse off). */
  private mostHurt(r: number, othersOnly: boolean): Friend | null {
    const P = this.host.player();
    let best: Friend | null = null, bk = 1.01;
    for (const f of this.host.friends()) {
      if ((othersOnly && f.me) || f.pos.distanceTo(P) > r) continue;
      const k = f.hp / Math.max(1, f.max);
      if (k < bk) { bk = k; best = f; }
    }
    return best;
  }
  /** A heal of a share of a friend's own health, with a glow on them. */
  private mendFriend(f: Friend, share: number, glow = true): void {
    f.heal(f.max * share);
    if (glow) this.host.particles.sparks(f.pos.clone().setY(f.pos.y + 1.4), 8, '#fff0b8');
  }
  /** Are you standing on your Sanctuary? */
  private inSanctuary(at: THREE.Vector3): boolean {
    const s = this.sanct;
    return !!s && s.until > this.clock && Math.hypot(at.x - s.at.x, at.z - s.at.z) < T.sanctuary.r && Math.abs(at.y - s.at.y) < 3;
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
      for (const e of H.enemies()) if (e.alive && Math.hypot(e.pos.x - z.at.x, e.pos.z - z.at.z) < z.r && Math.abs(e.pos.y - z.at.y) < 3) {
        H.hit(e, z.dmg, { quiet: true });
        if (z.chill) for (let k = 0; k < T.blizzard.chills; k++) this.addChill(e);
        if (z.mark) this.marks.set(e, this.clock + T.volley.mark);
      }
      // Hearth: your own fire mends you while you stand in it
      if (z.fire && T.firewall.heal > 0 && Math.hypot(P.x - z.at.x, P.z - z.at.z) < z.r) H.heal(H.maxHp() * T.firewall.heal);
      if (z.chill) for (let k = 0; k < 3; k++) H.particles.dust(z.at.clone().add(new THREE.Vector3((Math.random() - 0.5) * z.r * 1.6, 4, (Math.random() - 0.5) * z.r * 1.6)), 6);
      else H.particles.sparks(z.at.clone().setY(z.at.y + 0.4), 6, '#ffb060');
    }
    for (const z of this.zones) if (z.left <= 0) { z.ring.userData.age = z.ring.userData.life; }
    this.zones = this.zones.filter((z) => z.left > 0);
    for (const [e, until] of this.marks) if (until <= this.clock || !e.alive) this.marks.delete(e);
    for (const [e, c] of this.chill) if (c.until <= this.clock || !e.alive) this.chill.delete(e);
    if (this.calling.id === 'warden' && this.resolve > 0 && this.clock - this.resolveAt > T.resolve.fade) this.resolve = 0;
    // A Bulwark running out: Mending Ward gives back some of what was left
    if (this.shield > 0 && this.shieldUntil <= this.clock) {
      if (this.shieldKind === 'bulwark' && T.bulwark.mend > 0) H.heal(this.shield * T.bulwark.mend);
      this.shield = 0; this.shieldKind = 'other';
    }
    // Survivor: the rest of a Field Dressing
    if (this.hotUntil > this.clock && (this.hotTick -= dt) <= 0) { this.hotTick = 1; H.heal(H.maxHp() * this.hot); }
    // Shield bubble
    const shielded = this.shield > 0 && this.shieldUntil > this.clock;
    this.shieldMesh.visible = shielded || this.oathUntil > this.clock;
    if (this.shieldMesh.visible) { this.shieldMesh.position.copy(P).setY(P.y + 1); (this.shieldMesh.material as THREE.MeshBasicMaterial).color.set(this.oathUntil > this.clock ? '#e8d08a' : '#9fd8ff'); }
    // The Oath burns everything close
    if (this.oathUntil > this.clock && (this.oathTick -= dt) <= 0) {
      this.oathTick = 1;
      for (const e of H.enemies()) if (e.alive && e.pos.distanceTo(P) < T.oath.r) H.hit(e, H.power() * T.oath.burn, { quiet: true });
      if (T.oath.heal > 0) H.heal(H.maxHp() * T.oath.heal);
    }
    // Wither eats at each foe it's on and stores life; a foe dying under it gives up the rest
    for (const [e, w] of this.wither) {
      if (!e.alive) { if (w.until > this.clock) this.addBlood(T.lifeblood.kill); this.wither.delete(e); continue; }
      if (w.until <= this.clock) { this.wither.delete(e); continue; }
      if ((w.tick -= dt) <= 0) {
        w.tick = 1;
        H.hit(e, H.power() * T.wither.dot * w.n, { quiet: true });
        this.addBlood(T.lifeblood.tick * w.n);
        H.particles.sparks(e.pos.clone().setY(e.pos.y + 1), 4 + w.n * 2, '#8aa040');
      }
    }
    // The raised: each goes for the nearest foe near you (or keeps close), and lies down when its time is up
    for (const th of this.thralls) {
      th.left -= dt; th.swing -= dt;
      const b = th.body;
      let foe: Enemy | null = null, best = 18;
      for (const e of H.enemies()) { const k = e.pos.distanceTo(P); if (e.alive && k < best) { foe = e; best = k; } }
      let moving = 0;
      if (foe) {
        if (Math.hypot(foe.pos.x - b.pos.x, foe.pos.z - b.pos.z) > 1.6) { if (b.stepToward(foe.pos.x, foe.pos.z, 5.5, dt)) moving = 5.5; }
        else {
          b.face(foe.pos.x, foe.pos.z);
          if (th.swing <= 0) { th.swing = T.raise.every; b.act = 'attack'; b.actTime = 0; H.hit(foe, H.power() * T.raise.dmg); }
        }
      } else if (b.pos.distanceTo(P) > 3 && b.stepToward(P.x, P.z, 6, dt)) moving = 6;
      // Left behind (a cliff, a river): up out of the ground beside you again
      if (b.pos.distanceTo(P) > 30) { b.place(P.x + 1, P.y, P.z + 1); H.particles.dust(b.pos.clone().setY(b.pos.y + 0.3), 10); }
      b.update(dt, moving);
    }
    if (this.thralls.some((t) => t.left <= 0)) {
      for (const t of this.thralls) if (t.left <= 0) { H.particles.dust(t.body.pos.clone().setY(t.body.pos.y + 0.5), 14); H.scene.remove(t.body.model.root); }
      this.thralls = this.thralls.filter((t) => t.left > 0);
    }
    // Sanctuary: everyone of yours on it mends, foes on it burn
    if (this.sanct) {
      const s = this.sanct;
      if (s.until <= this.clock) this.sanct = null;
      else if ((s.tick -= dt) <= 0) {
        s.tick = 1;
        for (const f of H.friends()) if (Math.hypot(f.pos.x - s.at.x, f.pos.z - s.at.z) < T.sanctuary.r && Math.abs(f.pos.y - s.at.y) < 3) this.mendFriend(f, T.sanctuary.heal);
        for (const e of H.enemies()) if (e.alive && Math.hypot(e.pos.x - s.at.x, e.pos.z - s.at.z) < T.sanctuary.r && Math.abs(e.pos.y - s.at.y) < 3) H.hit(e, s.burn, { quiet: true });
        H.particles.sparks(s.at.clone().setY(s.at.y + 0.3), 10, '#fff0b8');
      }
    }
    // Restoration, a second at a time on each friend it was laid on
    for (const h of this.hots) { h.left -= dt; if ((h.tick -= dt) <= 0) { h.tick = 1; h.f.heal(h.per); } }
    this.hots = this.hots.filter((h) => h.left > 0);
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
    // Exsanguinate: a bleed outlives what it was in, and finds the next
    if (T.bleed.spread > 0) for (const d of this.dots) {
      if (d.e.alive || d.left <= 0) continue;
      let near: Enemy | null = null, best = T.bleed.spread;
      for (const o of H.enemies()) { const k = o.pos.distanceTo(d.e.pos); if (o.alive && k < best && !this.dots.some((x) => x.e === o)) { near = o; best = k; } }
      if (near) { H.particles.sparks(near.pos.clone().setY(near.pos.y + 0.8), 10, '#a01a1a'); this.dots.push({ e: near, perSec: d.perSec, left: d.left, tick: 1 }); }
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
          H.hit(f.to, f.dmg * (frozen ? T.icelance.frozen : 1), frozen || f.crit ? { crit: true } : undefined);
          if (f.lance) H.particles.burst(to, '#dff6ff', frozen ? 24 : 10);
          if (f.chill) this.addChill(f.to);
          if (f.wither) this.addWither(f.to, 1);
          if (f.stun) f.to.stun = Math.max(f.to.stun, f.stun);
          // Toll Due: the shield springs on to the next foe
          if (f.bounce) {
            let next: Enemy | null = null, best = 8;
            for (const o of H.enemies()) { const k = o.pos.distanceTo(f.to.pos); if (o !== f.to && o.alive && k < best) { next = o; best = k; } }
            if (next) {
              const m = (f.mesh as THREE.Mesh).clone();
              m.position.copy(to); H.scene.add(m);
              this.flying.push({ mesh: m, to: next, speed: f.speed, dmg: f.dmg, stun: f.stun, bounce: f.bounce - 1 });
            }
          }
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
