import * as THREE from 'three';
import { damageScale, rewardScale } from '../data/scaling';
import { Ally } from '../entities/Ally';
import { Enemy, EnemyContext } from '../entities/Enemy';
import { ENEMIES, EnemyType } from '../data/gameplay';
import { BossPlan, CALLING_ROLE, DUNGEON_BY_ID, DungeonDef, DUNGEONS, HENCHMEN, henchmenFor, missingRoles, Role, ROLE_NAMES } from '../data/dungeons';
import type { CallingId } from '../data/classes';
import { ITEMS } from '../data/items';
import { plan, Site, SiteActivity } from '../world/sites';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { Particles } from '../systems/Particles';
import type { GroupRow } from './Social';

// Group dungeons in play (data/dungeons.ts says what they are). A run is entered from the Group
// Finder: alone with henchmen at once, or with players the realm server matched (server/finder.mjs),
// henchmen filling whatever roles are short. Creatures live on each player's own machine as
// everywhere else, so a run is naturally its group's own: they're put down when the group goes in
// and removed when it leaves. Online, the members tell each other their blows and kills, so every
// copy of a creature takes the whole group's damage and falls for everyone.
//
// Who a creature goes after is threat, as in the big games: damage done (a tank's counts more),
// healing done (a little), and a tank's call, which puts the tank on top. Henchmen follow the
// player's footsteps, step out of anything they see coming, and fight to their role.

export interface DungeonNet {
  on(): boolean;
  queue(dungeon: string, role: Role): void;
  unqueue(): void;
  /** A group's leader takes the group in (each member answers the ready check). */
  groupGo(dungeon: string): void;
  answer(run: number, yes: boolean, role: Role): void;
  /** A blow ('hit', on creature i, for dmg) or a kill ('kill') for the rest of the run. */
  event(run: number, k: 'hit' | 'kill', i: number, dmg: number): void;
  leaveRun(run: number): void;
}

export interface DungeonHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  particles: Particles;
  player(): THREE.Vector3;
  dead(): boolean;
  invulnerable(): boolean;
  swimming(): boolean;
  level(): number;
  hp(): { hp: number; max: number };
  calling(): string;
  inCombat(): boolean;
  /** A blow on the player (Game's own: armour, rolls and all). */
  hurtPlayer(dmg: number, from: Enemy): void;
  healPlayer(n: number): void;
  /** Up again where you fell, with this share of your health. */
  raise(share: number): void;
  addEnemy(e: Enemy): void;
  removeEnemy(e: Enemy): void;
  /** Run the game's kill handling (experience, loot, counts) for a creature that fell to a henchman or another player. */
  killed(e: Enemy): void;
  target(): Enemy | null;
  /** Travel: into the dungeon at its arrival point, or back out of its door. */
  travel(at: [number, number, number], yaw: number, banner: string, sub: string): void;
  reward(xp: number, marks: number, items: string[], why: string): void;
  banner(title: string, sub: string): void;
  system(text: string): void;
  /** A line in the log under a name, and (bubble) over a henchman's head. */
  say(who: string, text: string, bubble?: number): void;
  float(at: THREE.Vector3, h: number, text: string, cls: string): void;
  sound(name: 'growl' | 'squelch' | 'skitter' | 'swing', at: THREE.Vector3): void;
  sfx(name: 'open' | 'levelUp' | 'heal' | 'bell' | 'click' | 'discover', vol?: number): void;
  ask(text: string, yes: () => void, no: () => void, secs: number): void;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  persist(): void;
  /** Standing in a region goes up (data/standing.ts). */
  standing(region: string, n: number): void;
  net: DungeonNet;
  /** Other players' avatars, by id. */
  remote(id: number): THREE.Vector3 | null;
  /** The online group: null when not in one, else whether you lead it and how many are in it. */
  group(): { leader: boolean; size: number } | null;
  /** The finder panel and the group frames need drawing again. */
  refresh(): void;
}

type Key = string; // 'me', 'a<bubble id>' for a henchman, 'r<player id>' for another player
interface LiveBoss { plan: BossPlan; enemy: Enemy; crew: Enemy[]; calls: number; nextHazard: number; engaged: boolean; done: boolean }
interface Hazard { at: THREE.Vector3; r: number; t: number; windup: number; dmg: number; from: Enemy; mesh: THREE.Group }
interface Run {
  def: DungeonDef;
  act: SiteActivity;
  site: Site;
  /** The realm's id for an online run; 0 for henchmen only. */
  id: number;
  role: Role;
  allies: Ally[];
  others: { id: number; name: string; role: Role }[];
  /** Every creature in the order the members agree on: the packs', then the bosses', then their crews'. */
  mobs: Enemy[];
  packOf: Map<Enemy, Enemy[]>;
  bosses: LiveBoss[];
  adds: Enemy[];
  threat: Map<Enemy, Map<Key, number>>;
  spawned: boolean;
  seen: Set<number>;
  hazards: Hazard[];
  done: boolean;
  chest: boolean;
  trail: THREE.Vector3[];
  calm: number;
  raiseIn: number;
  wipeIn: number;
  hits: Map<number, number>;
  sendT: number;
  rowsT: number;
}

export interface FinderView {
  online: boolean;
  role: Role;
  group: { leader: boolean; size: number } | null;
  queue: { dungeon: string; secs: number; count: number } | null;
  run: { name: string; done: boolean; henchmen: string[]; others: string[] } | null;
  dungeons: { id: string; name: string; where: string; blurb: string; clears: number }[];
  level: number;
}

const HAZARD_RING = new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2);
/** Blows passed between members are a share of the creature's health, in ten-thousandths. */
const SHARE = 10000;
const HAZARD_DISC = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const FILL_MS = 90;

export class Dungeons {
  run: Run | null = null;
  /** In the realm's queue (heard: the server has answered since). */
  queued: { dungeon: string; since: number; count: number; heard?: boolean } | null = null;
  private clock = 0;
  private qT = 0;

  constructor(private host: DungeonHost) {}

  get active(): boolean { return !!this.run; }

  /** The role you go in as: the one you last chose on this character, or your calling's. */
  get role(): Role {
    const r = this.host.flag('gdRole');
    return r === 'tank' || r === 'healer' || r === 'damage' ? r : CALLING_ROLE[this.host.calling() as CallingId] ?? 'damage';
  }

  setRole(r: Role): void { this.host.setFlag('gdRole', r); this.host.refresh(); }

  // ---------------------------------------------------------------- The finder
  view(): FinderView {
    const r = this.run;
    return {
      online: this.host.net.on(), role: this.role, group: this.host.group(), level: this.host.level(),
      queue: this.queued ? { dungeon: this.queued.dungeon, secs: Math.floor(this.clock - this.queued.since), count: this.queued.count } : null,
      run: r ? { name: r.def.name, done: r.done, henchmen: r.allies.map((a) => `${a.name} (${ROLE_NAMES[a.role]})`), others: r.others.map((o) => `${o.name} (${ROLE_NAMES[o.role]})`) } : null,
      dungeons: DUNGEONS.map((d) => ({ id: d.id, name: d.name, where: d.where, blurb: d.blurb, clears: Number(this.host.flag('gdClears:' + d.id) ?? 0) })),
    };
  }

  /** Why you can't go in just now, if you can't. */
  private blocked(): string | null {
    if (this.run) return 'You\'re in a dungeon already. Leave it first (the way you came in, or Leave in the Group Finder).';
    if (this.host.dead()) return 'Not while you\'re down.';
    if (this.host.inCombat()) return 'Not in the middle of a fight.';
    return null;
  }

  /** Go in now with henchmen in every other place. */
  goWithHenchmen(id: string): string | null {
    const why = this.blocked();
    if (why) return why;
    if (this.queued) this.unqueue();
    this.begin(DUNGEON_BY_ID[id], 0, [], henchmenFor(missingRoles([this.role])).map((h) => h.id));
    return null;
  }

  /** Queue for a group (online); henchmen fill whatever's short after a minute and a half. */
  findGroup(id: string): string | null {
    const why = this.blocked();
    if (why) return why;
    if (!this.host.net.on()) return 'Finding a group needs the online realm. You can go in with henchmen.';
    const g = this.host.group();
    if (g && !g.leader) return 'You\'re in a group: its leader takes the group in.';
    if (g) {
      if (g.size > 4) return 'A group dungeon is for four. Your group is ' + g.size + '.';
      this.host.net.groupGo(id);
      this.host.system(`Asking your group whether they're ready for ${DUNGEON_BY_ID[id].name}.`);
      return null;
    }
    this.host.net.queue(id, this.role);
    this.queued = { dungeon: id, since: this.clock, count: 1 };
    this.host.system(`Looking for a group for ${DUNGEON_BY_ID[id].name}, as ${ROLE_NAMES[this.role].toLowerCase()}. Henchmen fill the places nobody takes after a minute and a half.`);
    this.host.refresh();
    return null;
  }

  unqueue(): void {
    if (!this.queued) return;
    this.host.net.unqueue();
    this.queued = null;
    this.host.refresh();
  }

  /** The server: how the queue stands (null: you're out of it). */
  onQueue(dungeon: string | null, count: number): void {
    if (!dungeon) { this.queued = null; this.host.refresh(); return; }
    if (this.queued && this.queued.dungeon === dungeon) { this.queued.count = count; this.queued.heard = true; }
    else this.queued = { dungeon, since: this.clock, count, heard: true };
    this.host.refresh();
  }

  /** The server: a group is ready; answer within the time. */
  onReady(run: number, dungeon: string, names: string[], henchmen: number, secs: number): void {
    const d = DUNGEON_BY_ID[dungeon];
    if (!d) return;
    const who = names.length ? names.join(', ') : 'you';
    const fill = henchmen ? `, with ${henchmen === 1 ? 'a henchman' : henchmen + ' henchmen'} to make four` : '';
    this.host.sfx('bell');
    this.host.ask(`Your group for ${d.name} is ready: ${who}${fill}. Go in as ${ROLE_NAMES[this.role].toLowerCase()}?`, () => {
      const why = this.blocked();
      if (why) { this.host.system(why); this.host.net.answer(run, false, this.role); return; }
      this.host.net.answer(run, true, this.role);
    }, () => this.host.net.answer(run, false, this.role), secs);
  }

  /** The server: everyone said yes. In we go. */
  onStart(run: number, dungeon: string, others: { id: number; name: string; role: Role }[], henchmen: string[]): void {
    const d = DUNGEON_BY_ID[dungeon];
    this.queued = null;
    if (!d || this.run) return;
    this.begin(d, run, others, henchmen);
  }

  /** Another member's blow or kill. */
  onEvent(from: number, k: 'hit' | 'kill', i: number, dmg: number): void {
    const r = this.run;
    const e = r?.mobs[i];
    if (!r || !e || !e.alive) return;
    const at = this.host.remote(from) ?? e.pos;
    if (k === 'kill') { e.takeDamage(e.hp + 1, at, this.clock); this.host.killed(e); return; }
    const local = Math.round((dmg / SHARE) * e.def.hp);
    e.takeDamage(Math.min(e.hp, local), at, this.clock);
    this.addThreat(e, 'r' + from, local);
    if (e.justDied) this.host.killed(e);
  }

  /** The server: a member has gone. */
  onLeft(name: string): void {
    const r = this.run;
    if (!r) return;
    r.others = r.others.filter((o) => o.name !== name);
    this.host.system(`${name} has left the dungeon.`);
    this.host.refresh();
  }

  leave(): void {
    const r = this.run;
    if (!r) return;
    this.host.travel([r.def.out[0], r.def.out[1], r.def.out[2]], r.def.out[3], r.def.name, r.done ? 'Back up the ladder' : 'You leave the dungeon');
    this.end();
  }

  // ---------------------------------------------------------------- A run
  private begin(def: DungeonDef, id: number, others: { id: number; name: string; role: Role }[], henchmen: string[]): void {
    const site = plan().sites.find((s) => s.id === def.id);
    const act = site?.act;
    if (!site || !act || act.kind !== 'group' || !act.arrive) return;
    const lvl = Math.max(1, this.host.level());
    const allies = henchmen.filter((h) => HENCH[h]).map((h) => new Ally(HENCH[h], lvl, this.host.voxels));
    this.run = {
      def, act, site, id, role: this.role, allies, others, mobs: [], packOf: new Map(), bosses: [], adds: [], threat: new Map(),
      spawned: false, seen: new Set(), hazards: [], done: false, chest: false, trail: [], calm: 0, raiseIn: -1, wipeIn: -1,
      hits: new Map(), sendT: 0, rowsT: 0,
    };
    this.host.travel(act.arrive, Math.PI / 2, def.name, `Group dungeon · ${def.where}`);
    this.host.refresh();
  }

  private spawn(): void {
    const r = this.run!, a = r.act;
    const make = (x: number, y: number, z: number, type: string): Enemy => {
      const e = new Enemy({ ...ENEMIES[type as EnemyType] }, Math.floor(x), Math.floor(z), this.host.voxels);
      e.home.set(Math.floor(x) + 0.5, y, Math.floor(z) + 0.5);
      e.pos.copy(e.home);
      e.questTag = 'dungeon';
      this.host.addEnemy(e);
      return e;
    };
    for (const pack of a.packs ?? []) {
      const list = pack.map(([x, y, z, t]) => make(x, y, z, t));
      for (const e of list) r.packOf.set(e, list);
      r.mobs.push(...list);
    }
    (a.bosses ?? []).forEach((b, i) => {
      const e = make(b.at[0], b.at[1], b.at[2], b.type);
      r.mobs.push(e);
      r.bosses.push({ plan: r.def.bosses[i], enemy: e, crew: [], calls: 0, nextHazard: 0, engaged: false, done: false });
    });
    (a.bosses ?? []).forEach((b, i) => {
      const crew = (b.crew ?? []).map(([x, y, z, t]) => make(x, y, z, t));
      r.bosses[i].crew = crew;
      r.mobs.push(...crew);
      const all = [r.bosses[i].enemy, ...crew];
      for (const e of all) r.packOf.set(e, all);
    });
    const [ax, ay, az] = a.arrive!;
    r.allies.forEach((al, i) => {
      al.place(ax + 1.2 + (i % 2) * 1.1, ay, az + (i - 1) * 1.3);
      this.host.scene.add(al.model.root);
    });
    for (const al of r.allies) if (Math.random() < 0.5) { this.bark(al, al.def.barks.pull); break; }
    r.spawned = true;
    this.host.refresh();
  }

  private end(): void {
    const r = this.run;
    if (!r) return;
    for (const e of [...r.mobs, ...r.adds]) this.host.removeEnemy(e);
    for (const al of r.allies) this.host.scene.remove(al.model.root);
    for (const h of r.hazards) this.host.scene.remove(h.mesh);
    if (r.id) this.host.net.leaveRun(r.id);
    this.run = null;
    this.host.refresh();
  }

  /** Is this creature one of the run's? */
  owns(e: Enemy): boolean { return !!this.run && (this.run.packOf.has(e) || this.run.adds.includes(e)); }

  // ---------------------------------------------------------------- Threat
  private addThreat(e: Enemy, k: Key, n: number): void {
    const r = this.run;
    if (!r || !this.owns(e)) return;
    let t = r.threat.get(e);
    if (!t) { t = new Map(); r.threat.set(e, t); }
    t.set(k, (t.get(k) ?? 0) + n);
  }

  /** The player's blow on a creature: threat (a tank's counts three times), and word to the rest of the run. */
  onPlayerHit(e: Enemy, dmg: number): void {
    const r = this.run;
    if (!r || !this.owns(e)) return;
    this.addThreat(e, 'me', dmg * (r.role === 'tank' ? 3 : 1));
    // A healer's blows mend: six tenths of each, to whoever near is most hurt (you too)
    if (r.role === 'healer') this.mendFromBlow(dmg * 0.6);
    const i = r.mobs.indexOf(e);
    if (r.id && i >= 0) r.hits.set(i, (r.hits.get(i) ?? 0) + dmg);
  }

  /** A creature of the run fell (from Game's kill handling, whoever's blow it was). */
  onKilled(e: Enemy): void {
    const r = this.run;
    if (!r || !this.owns(e)) return;
    const i = r.mobs.indexOf(e);
    if (r.id && i >= 0) { r.hits.delete(i); this.host.net.event(r.id, 'kill', i, 0); }
    e.respawnIn = Infinity;
    r.threat.delete(e);
    const b = r.bosses.find((x) => x.enemy === e);
    if (b && !b.done) this.bossDown(b);
    for (const al of r.allies) if (!al.down && al.quiet > 6 && Math.random() < 0.18) { this.bark(al, al.def.barks.kill); break; }
  }

  private mendFromBlow(n: number): void {
    const r = this.run!, P = this.host.player();
    const hurt: { frac: number; heal: (k: number) => void }[] = [];
    const v = this.host.hp();
    if (!this.host.dead() && v.hp < v.max) hurt.push({ frac: v.hp / v.max, heal: (k) => this.host.healPlayer(Math.min(v.max - v.hp, Math.round(k))) });
    for (const a of r.allies) {
      if (a.down || a.hp >= a.max || a.pos.distanceTo(P) > 16) continue;
      hurt.push({ frac: a.hp / a.max, heal: (k) => { const h = a.heal(k); if (h > 0) { this.host.float(a.pos, 2.2, '+' + h, 'heal'); this.host.particles.heal(a.pos); } } });
    }
    hurt.sort((x, y) => x.frac - y.frac);
    hurt[0]?.heal(n);
    hurt[1]?.heal(n * 0.55);
  }

  /** A run creature that's after someone other than you (for the Old Man's set). */
  onSomeoneElse(e: Enemy): boolean {
    if (!this.run || !this.owns(e) || !(e.state === 'chase' || e.state === 'windup' || e.state === 'attack' || e.state === 'recover')) return false;
    return this.victim(e).k !== 'me';
  }

  /** A healer's mending: the player's own healing skill shares with the group when the player is the healer. */
  shareHeal(n: number): void {
    const r = this.run;
    if (!r || r.role !== 'healer' || n <= 0) return;
    const share = n / Math.max(1, this.host.hp().max), P = this.host.player();
    for (const al of r.allies) {
      if (al.down || al.pos.distanceTo(P) > 12) continue;
      const h = al.heal(al.max * share * 0.8);
      if (h > 0) { this.host.float(al.pos, 2.2, `+${h}`, 'heal'); this.host.particles.heal(al.pos); }
    }
  }

  private members(): { k: Key; pos: THREE.Vector3; up: boolean; ally?: Ally }[] {
    const r = this.run!;
    const out: { k: Key; pos: THREE.Vector3; up: boolean; ally?: Ally }[] = [{ k: 'me', pos: this.host.player(), up: !this.host.dead() }];
    for (const a of r.allies) out.push({ k: 'a' + a.bubble, pos: a.pos, up: !a.down, ally: a });
    for (const o of r.others) { const p = this.host.remote(o.id); if (p) out.push({ k: 'r' + o.id, pos: p, up: true }); }
    return out;
  }

  /** Whoever the creature goes after: the most threat among those standing, or (not yet in a fight) the nearest. */
  private victim(e: Enemy): { k: Key; pos: THREE.Vector3; up: boolean; ally?: Ally } {
    const ms = this.members().filter((m) => m.up);
    if (!ms.length) return { k: 'me', pos: this.host.player(), up: false };
    const t = this.run!.threat.get(e);
    let best = ms[0], bv = -1;
    if (t && t.size) for (const m of ms) { const v = t.get(m.k) ?? 0; if (v > bv) { bv = v; best = m; } }
    if (bv <= 0) { let bd = Infinity; for (const m of ms) { const d = m.pos.distanceTo(e.pos); if (d < bd) { bd = d; best = m; } } }
    return best;
  }

  /** The context a run's creature fights in this frame: its victim, and everyone else for a circle that lands. */
  ctxFor(e: Enemy, base: EnemyContext): EnemyContext | null {
    if (!this.run || !this.owns(e)) return null;
    const v = this.victim(e);
    const engagedBefore = e.state === 'chase' || e.state === 'windup' || e.state === 'attack' || e.state === 'recover';
    // Others caught in the circle take most of it; whoever it was aimed at takes it all (in Enemy)
    const splash = (at: THREE.Vector3, rad: number, full: number, from: Enemy) => {
      const dmg = full * 0.7;
      for (const m of this.members()) {
        if (m.k === v.k || !m.up || Math.hypot(m.pos.x - at.x, m.pos.z - at.z) > rad || Math.abs(m.pos.y - at.y) > 2.5) continue;
        if (m.k === 'me') { if (!this.host.invulnerable()) this.host.hurtPlayer(dmg, from); }
        else if (m.ally) this.hurtAlly(m.ally, dmg);
      }
    };
    if (!engagedBefore) {
      // Coming into the fight: the nearest member draws it first (a tank always does, if near)
      const t = this.run.threat.get(e);
      if (!t || !t.size) {
        const tank = this.members().find((m) => m.up && (m.ally?.role === 'tank' || (m.k === 'me' && this.run!.role === 'tank')) && m.pos.distanceTo(e.pos) < e.def.aggro);
        if (tank) { this.addThreat(e, tank.k, 1); return this.ctxFor(e, base); }
      }
    }
    if (v.k === 'me') return { ...base, splash };
    const ally = v.ally;
    return {
      player: v.pos, playerAlive: v.up, playerInvulnerable: false, playerSwimming: false, level: base.level,
      hitPlayer: ally ? (d: number) => this.hurtAlly(ally, d) : () => {},
      sound: base.sound, splash,
    };
  }

  private hurtAlly(a: Ally, dmg: number): void {
    if (a.down) return;
    const before = a.hp;
    const knocked = a.hurt(dmg * (0.9 + Math.random() * 0.2));
    this.host.float(a.pos, 2.2, `-${before - a.hp}`, 'tick');
    if (knocked) { this.host.say(a.name, a.def.barks.down, a.bubble); this.dropThreat('a' + a.bubble); }
    else if (a.hp < a.max * 0.3 && a.quiet > 8) this.bark(a, a.def.barks.low);
  }

  /** Someone's down: the creatures forget them. */
  private dropThreat(k: Key): void { for (const t of this.run!.threat.values()) t.delete(k); }

  private bark(a: Ally, lines: string[]): void {
    if (!lines.length) return;
    a.quiet = 0;
    this.host.say(a.name, lines[Math.floor(Math.random() * lines.length)], a.bubble);
  }

  // ---------------------------------------------------------------- Each frame
  update(dt: number): void {
    this.clock += dt;
    // The queue's clock on the finder ticks while it's open
    if (this.queued) {
      this.qT -= dt;
      if (this.qT <= 0) { this.qT = 1; this.host.refresh(); }
      // A realm that doesn't answer (an older server, or one restarting): don't leave you waiting
      if (!this.queued.heard && this.clock - this.queued.since > 8) {
        this.queued = null;
        this.host.system('The realm didn\'t answer the Group Finder (it may be updating). You can go in with henchmen, or try again in a minute.');
        this.host.refresh();
      }
    }
    const r = this.run;
    if (!r) return;
    const P = this.host.player();
    // Gone some other way (a waymark, the post): the run's over
    if (Math.hypot(P.x - r.site.x, P.z - r.site.z) > 260 && r.spawned) { this.end(); return; }
    if (!r.spawned) { if (this.host.voxels.isLoaded(r.act.arrive![0], r.act.arrive![2]) && Math.hypot(P.x - r.act.arrive![0], P.z - r.act.arrive![2]) < 20) this.spawn(); return; }

    // The player's footsteps, for the henchmen to follow round corners
    const last = r.trail[r.trail.length - 1];
    if (!this.host.dead() && (!last || last.distanceTo(P) > 0.9)) { r.trail.push(P.clone()); if (r.trail.length > 40) r.trail.shift(); }

    // A word the first time the group comes into each place
    r.def.notes.forEach((n, i) => {
      if (r.seen.has(i) || Math.hypot(P.x - n.x, P.z - n.z) > n.r) return;
      r.seen.add(i);
      const who = r.allies.find((a) => a.def.id === (n.who ?? 'bet') && !a.down);
      if (who) this.host.say(who.name, n.said, who.bubble); else this.host.say('', n.seen);
    });

    // Packs pull together; a boss's crew comes with it
    const engaged = this.engaged();
    for (const e of engaged) if (!r.threat.get(e)?.size) this.addThreat(e, this.victim(e).k, 1);
    for (const e of engaged) for (const o of r.packOf.get(e) ?? []) if (o.alive && (o.state === 'idle' || o.state === 'wander')) { o.state = 'chase'; this.addThreat(o, this.victim(e).k, 1); }
    this.bosses(dt);
    this.tickHazards(dt);

    // Henchmen
    if (engaged.length) r.calm = 0; else r.calm += dt;
    r.allies.forEach((a, i) => a.update(dt, this.allyAct(a, i, dt, engaged)));
    this.downs(dt, engaged.length > 0);

    // Online: blows go out four times a second
    r.sendT -= dt;
    if (r.id && r.sendT <= 0) {
      r.sendT = 0.25;
      for (const [i, dmg] of r.hits) { const e = r.mobs[i]; if (e) this.host.net.event(r.id, 'hit', i, Math.max(1, Math.round((dmg / e.def.hp) * SHARE))); }
      r.hits.clear();
    }
    r.rowsT -= dt;
    if (r.rowsT <= 0) { r.rowsT = 0.5; this.host.refresh(); }
  }

  /** The run's creatures in a fight right now. */
  private engaged(): Enemy[] {
    const r = this.run!;
    return [...r.mobs, ...r.adds].filter((e) => e.alive && (e.state === 'chase' || e.state === 'windup' || e.state === 'attack' || e.state === 'recover'));
  }

  // ---------------------------------------------------------------- Bosses
  private bosses(dt: number): void {
    const r = this.run!;
    for (const b of r.bosses) {
      if (b.done || !b.enemy.alive) continue;
      const e = b.enemy;
      const fighting = e.state === 'chase' || e.state === 'windup' || e.state === 'attack' || e.state === 'recover';
      if (fighting && !b.engaged) {
        b.engaged = true;
        b.nextHazard = this.clock + (b.plan.hazard?.every ?? 99) * 0.6;
        this.host.say(b.plan.pull[0], b.plan.pull[1]);
        this.host.sound('growl', e.pos);
        for (const c of b.crew) if (c.alive && c.state === 'idle') c.state = 'chase';
      }
      if (!b.engaged) continue;
      if (!fighting && e.state === 'return') { this.resetBoss(b); continue; }
      const share = e.hp / e.def.hp;
      const call = b.plan.adds?.[b.calls];
      if (call && share < call.at) {
        b.calls++;
        this.host.say(call.line[0], call.line[1]);
        call.types.forEach((t, k) => {
          const ang = (k / call.types.length) * Math.PI * 2 + b.calls;
          const x = e.pos.x + Math.cos(ang) * 4.5, z = e.pos.z + Math.sin(ang) * 4.5;
          const add = new Enemy({ ...ENEMIES[t as EnemyType] }, Math.floor(x), Math.floor(z), this.host.voxels);
          add.home.set(Math.floor(e.home.x) + 0.5, e.home.y, Math.floor(e.home.z) + 0.5);
          add.pos.set(Math.floor(x) + 0.5, e.pos.y, Math.floor(z) + 0.5);
          add.questTag = 'dungeon';
          add.state = 'chase';
          this.host.addEnemy(add);
          r.adds.push(add);
          this.host.particles.burst(add.pos.clone().setY(add.pos.y + 0.5), '#c8b090', 12);
        });
      }
      const hz = b.plan.hazard;
      if (hz && this.clock >= b.nextHazard) {
        b.nextHazard = this.clock + hz.every * (e.enraged ? 0.7 : 1);
        const ms = this.members().filter((m) => m.up && (m.k === 'me' || m.ally));
        // Not always the tank: they're busy holding it
        const pool = ms.filter((m) => !(m.ally?.role === 'tank' || (m.k === 'me' && r.role === 'tank')));
        const pick = (pool.length ? pool : ms).sort(() => Math.random() - 0.5).slice(0, hz.count);
        if (pick.length) this.host.system(hz.line);
        for (const m of pick) this.addHazard(m.pos.clone(), hz.r, hz.windup, Math.round(hz.damage * damageScale(this.host.level(), r.def.level)), e, hz.color);
      }
    }
  }

  private resetBoss(b: LiveBoss): void {
    const r = this.run!;
    b.engaged = false;
    b.calls = 0;
    for (const a of r.adds) this.host.removeEnemy(a);
    r.adds = [];
    for (const h of r.hazards) this.host.scene.remove(h.mesh);
    r.hazards = [];
  }

  private bossDown(b: LiveBoss): void {
    const r = this.run!;
    b.done = true;
    this.host.say(b.plan.fall[0], b.plan.fall[1]);
    // What it called in goes back into the walls
    for (const a of r.adds) { if (a.alive) this.host.particles.burst(a.pos.clone().setY(a.pos.y + 0.4), '#c8b090', 8); this.host.removeEnemy(a); }
    r.adds = [];
    for (const h of r.hazards) this.host.scene.remove(h.mesh);
    r.hazards = [];
    const last = r.bosses.every((x) => x.done);
    const items: string[] = [];
    if (Math.random() < b.plan.chance || last) items.push(b.plan.drops[Math.floor(Math.random() * b.plan.drops.length)]);
    this.host.reward(0, 0, items, `${b.enemy.name} · ${r.def.name}`);
    for (const id of items) { const d = ITEMS[id]; if (d?.stats) this.host.system(`${d.name}: ${d.stats}`); }
    this.host.banner(b.enemy.name, last ? 'Defeated · the way to the chest is open' : 'Defeated');
    if (last) this.complete();
  }

  private complete(): void {
    const r = this.run!;
    r.done = true;
    const k = 'gdClears:' + r.def.id, n = Number(this.host.flag(k) ?? 0) + 1;
    this.host.setFlag(k, n);
    this.host.standing(r.site.region, 100);
    this.host.sfx('levelUp', 0.8);
    this.host.system(`${r.def.name} cleared${n > 1 ? ` (${n} times now)` : ' for the first time'}. The chest by the far wall is yours, and the ladder is back where you came in.`);
    this.host.persist();
    this.host.refresh();
  }

  // ---------------------------------------------------------------- Hazards
  private addHazard(at: THREE.Vector3, r: number, windup: number, dmg: number, from: Enemy, color: string): void {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(HAZARD_RING, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    const fill = new THREE.Mesh(HAZARD_DISC, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    fill.scale.setScalar(0.01);
    g.add(ring, fill);
    g.scale.setScalar(r);
    g.position.set(at.x, at.y + 0.07, at.z);
    g.renderOrder = 3;
    this.host.scene.add(g);
    this.run!.hazards.push({ at, r, t: 0, windup, dmg, from, mesh: g });
  }

  private tickHazards(dt: number): void {
    const r = this.run!;
    r.hazards = r.hazards.filter((h) => {
      h.t += dt;
      const k = Math.min(1, h.t / h.windup);
      (h.mesh.children[1] as THREE.Mesh).scale.setScalar(Math.max(0.01, k));
      if (h.t < h.windup) return true;
      this.host.scene.remove(h.mesh);
      this.host.particles.burst(h.at.clone().setY(h.at.y + 0.3), '#c8b090', 14);
      for (const m of this.members()) {
        if (!m.up || Math.hypot(m.pos.x - h.at.x, m.pos.z - h.at.z) > h.r || Math.abs(m.pos.y - h.at.y) > 2.5) continue;
        if (m.k === 'me') this.host.hurtPlayer(h.dmg, h.from);
        else if (m.ally) this.hurtAlly(m.ally, h.dmg);
      }
      return false;
    });
  }

  /** The hazard a henchman is standing in, if any: they step out of what they can see coming. */
  private inHazard(p: THREE.Vector3): Hazard | null {
    for (const h of this.run!.hazards) if (Math.hypot(p.x - h.at.x, p.z - h.at.z) < h.r + 0.6) return h;
    return null;
  }

  // ---------------------------------------------------------------- Henchmen
  /** One henchman's turn; returns how fast they moved (for the walk). */
  private allyAct(a: Ally, i: number, dt: number, engaged: Enemy[]): number {
    if (a.down) { a.downFor += dt; return 0; }
    const r = this.run!, P = this.host.player();
    a.cd -= dt; a.mend -= dt; a.skill -= dt;
    // Out of a circle before anything else
    const hz = this.inHazard(a.pos);
    if (hz) {
      const away = new THREE.Vector3(a.pos.x - hz.at.x, 0, a.pos.z - hz.at.z);
      if (away.lengthSq() < 0.01) away.set(Math.cos(i * 2.1), 0, Math.sin(i * 2.1));
      away.normalize().multiplyScalar(4);
      return a.stepToward(a.pos.x + away.x, a.pos.z + away.z, 6.5, dt) ? 6.5 : 0;
    }
    if (!engaged.length) {
      if (r.calm > 3) a.heal(a.max * 0.3 * dt);
      return this.follow(a, i, dt);
    }
    if (a.role === 'healer') return this.healer(a, i, dt, engaged);
    // Tank: the boss, or whatever is on someone else; damage: what you're hitting, or what the tank holds
    const tank = r.allies.find((x) => x.role === 'tank' && !x.down);
    const onOther = (e: Enemy) => this.victim(e).k !== 'a' + a.bubble;
    let t: Enemy | undefined;
    if (a.role === 'tank') {
      t = engaged.find((e) => e.isBoss) ?? engaged.filter(onOther).sort((x, y) => x.pos.distanceTo(P) - y.pos.distanceTo(P))[0] ?? this.nearest(a.pos, engaged);
      if (a.skill <= 0) {
        const near = engaged.filter((e) => e.pos.distanceTo(a.pos) < 9 && onOther(e));
        if (near.length) {
          a.skill = 7;
          for (const e of near) { const tm = r.threat.get(e); const top = tm ? Math.max(0, ...tm.values()) : 0; this.addThreat(e, 'a' + a.bubble, top * 1.5 + 30 - (tm?.get('a' + a.bubble) ?? 0)); }
          this.host.particles.burst(a.pos.clone().setY(a.pos.y + 1), '#7fb0e0', 16);
          a.act = 'cleave'; a.actTime = 0;
          if (a.quiet > 5) this.bark(a, a.def.barks.pull);
        }
      }
    } else {
      const mine = this.host.target();
      t = (mine && engaged.includes(mine) ? mine : undefined) ?? (tank ? engaged.filter((e) => this.victim(e).k === 'a' + tank.bubble)[0] : undefined) ?? this.nearest(a.pos, engaged);
    }
    if (!t) return this.follow(a, i, dt);
    // Into reach (damage dealers to the side, not on top of the tank), then hit
    const reach = (t.def.elite ? 2.9 : 2.3) + (t.isBoss ? 0.8 : 0);
    const side = a.role === 'tank' ? 0 : (i % 2 ? 1 : -1) * 1.3;
    const to = new THREE.Vector3(a.pos.x - t.pos.x, 0, a.pos.z - t.pos.z);
    const d = to.length();
    if (d > reach) {
      to.normalize();
      const gx = t.pos.x + to.x * (reach - 0.4) - to.z * side, gz = t.pos.z + to.z * (reach - 0.4) + to.x * side;
      const moved = a.stepToward(gx, gz, 5.6, dt);
      a.stuck = moved ? 0 : a.stuck + dt;
      if (a.stuck > 2.5) this.catchUp(a, t.pos);
      return moved ? 5.6 : 0;
    }
    a.face(t.pos.x, t.pos.z);
    if (a.cd <= 0) {
      a.cd = a.every * (0.9 + Math.random() * 0.2);
      a.act = 'attack'; a.actTime = 0;
      this.allyHit(a, t, a.hit * (0.9 + Math.random() * 0.2));
    }
    return 0;
  }

  private healer(a: Ally, i: number, dt: number, engaged: Enemy[]): number {
    const r = this.run!, P = this.host.player();
    const L = a.level;
    const hurt: { frac: number; pos: THREE.Vector3; heal: (n: number) => number }[] = [];
    if (!this.host.dead()) { const v = this.host.hp(); hurt.push({ frac: v.hp / v.max, pos: P, heal: (n) => { const h = Math.min(v.max - v.hp, Math.round(n)); this.host.healPlayer(h); return h; } }); }
    for (const o of r.allies) if (!o.down) hurt.push({ frac: o.hp / o.max, pos: o.pos, heal: (n) => o.heal(n) });
    const inReach = hurt.filter((h) => h.pos.distanceTo(a.pos) < 16);
    // A round for everyone when two or more are hurt, otherwise the worst first
    const low = inReach.filter((h) => h.frac < 0.65);
    if (a.skill <= 0 && low.length >= 2) {
      a.skill = 14; a.act = 'heal'; a.actTime = 0;
      for (const h of inReach) { const got = h.heal(a.mendBy); if (got > 0) { this.host.float(h.pos, 2.2, `+${got}`, 'heal'); this.host.particles.heal(h.pos); } }
      this.healThreat(a, engaged, 30);
      this.host.sfx('heal', 0.4);
    } else if (a.mend <= 0) {
      const worst = inReach.sort((x, y) => x.frac - y.frac)[0];
      if (worst && worst.frac < 0.78) {
        a.mend = 2.3; a.act = 'heal'; a.actTime = 0;
        a.face(worst.pos.x, worst.pos.z);
        const got = worst.heal(a.mendBy);
        if (got > 0) { this.host.float(worst.pos, 2.2, `+${got}`, 'heal'); this.host.particles.heal(worst.pos); }
        this.healThreat(a, engaged, got * 0.3);
        if (a.quiet > 9 && Math.random() < 0.4) this.bark(a, a.def.barks.mend ?? []);
      }
    }
    // Keep back from the fight, behind whoever's holding it; a bolt when there's nothing to mend
    const tank = r.allies.find((x) => x.role === 'tank' && !x.down);
    const front = tank ? tank.pos : P;
    const foe = this.nearest(front, engaged);
    let gx = front.x, gz = front.z;
    if (foe) { const dx = front.x - foe.pos.x, dz = front.z - foe.pos.z, d = Math.hypot(dx, dz) || 1; gx += (dx / d) * 6 + (i % 2 ? 1.5 : -1.5); gz += (dz / d) * 6; }
    const dist = Math.hypot(a.pos.x - gx, a.pos.z - gz);
    if (foe && a.cd <= 0 && a.mend > 0.4 && foe.pos.distanceTo(a.pos) < 14) {
      a.cd = a.every;
      this.allyHit(a, foe, a.hit);
      this.host.particles.sparks(foe.pos.clone().setY(foe.pos.y + 0.8), 6, '#e8ffd0');
    }
    if (dist > 2) {
      const moved = a.stepToward(gx, gz, 5.2, dt);
      a.stuck = moved ? 0 : a.stuck + dt;
      if (a.stuck > 3) this.catchUp(a, front);
      return moved ? 5.2 : 0;
    }
    if (foe) a.face(foe.pos.x, foe.pos.z);
    return 0;
  }

  private healThreat(a: Ally, engaged: Enemy[], n: number): void { for (const e of engaged) if (this.run!.threat.get(e)?.size) this.addThreat(e, 'a' + a.bubble, n); }

  private allyHit(a: Ally, e: Enemy, raw: number): void {
    const dmg = Math.max(1, Math.round(raw));
    e.takeDamage(dmg, a.pos, this.clock);
    this.host.float(e.pos, e.model.plateHeight + 0.2, String(dmg), 'tick');
    this.host.particles.sparks(e.pos.clone().setY(e.pos.y + 0.7), 4, '#ffb060');
    this.addThreat(e, 'a' + a.bubble, dmg * (a.role === 'tank' ? 2.5 : 1));
    if (e.justDied) this.host.killed(e);
  }

  private nearest(p: THREE.Vector3, list: Enemy[]): Enemy | undefined {
    let best: Enemy | undefined, bd = Infinity;
    for (const e of list) { const d = e.pos.distanceTo(p); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  /** Follow the player's footsteps, each a few steps further back. */
  private follow(a: Ally, i: number, dt: number): number {
    const r = this.run!, P = this.host.player();
    const back = 3 + i * 2;
    const goal = r.trail.length > back ? r.trail[r.trail.length - 1 - back] : P;
    const d = Math.hypot(a.pos.x - goal.x, a.pos.z - goal.z);
    if (a.pos.distanceTo(P) > 30) { this.catchUp(a, P); return 0; }
    if (d < 1.2) { a.stuck = 0; return 0; }
    // Head for the next footstep after the nearest one, so corners are walked round, not cut
    let k = r.trail.length - 1 - back, best = Infinity;
    for (let j = 0; j < r.trail.length - back; j++) { const dd = r.trail[j].distanceTo(a.pos); if (dd < best) { best = dd; k = j; } }
    const step = r.trail[Math.min(r.trail.length - 1 - back, k + 1)] ?? goal;
    const speed = d > 6 ? 6.4 : 4.4;
    const moved = a.stepToward(step.x, step.z, speed, dt);
    a.stuck = moved ? 0 : a.stuck + dt;
    if (a.stuck > 2.5) this.catchUp(a, goal);
    return moved ? speed : 0;
  }

  /** Lost behind: they turn up at the nearest footstep to the player (never in sight of a wall's inside). */
  private catchUp(a: Ally, near: THREE.Vector3): void {
    const r = this.run!;
    const spot = r.trail.length > 2 ? r.trail[Math.max(0, r.trail.length - 3)] : near;
    a.place(spot.x, spot.y, spot.z);
    a.stuck = 0;
  }

  /** Who's down, getting up, and a wipe. */
  private downs(dt: number, fighting: boolean): void {
    const r = this.run!;
    const healer = r.allies.find((a) => a.role === 'healer' && !a.down);
    // A healer gets a downed henchman up, after a moment
    for (const a of r.allies) {
      if (!a.down) continue;
      if ((healer && a.downFor > 6) || (!fighting && r.calm > 3)) {
        a.getUp(fighting ? 0.4 : 0.5);
        this.host.say(a.name, a.def.barks.up, a.bubble);
        if (healer) this.host.particles.heal(a.pos);
      }
    }
    if (this.host.dead()) {
      if (r.raiseIn < 0) r.raiseIn = healer ? 5 : -1;
      else {
        r.raiseIn -= dt;
        if (r.raiseIn <= 0 && healer) {
          r.raiseIn = -1;
          this.host.raise(0.4);
          this.host.say(healer.name, 'Up you get. Slowly.', healer.bubble);
          this.host.particles.heal(this.host.player());
        }
      }
    } else r.raiseIn = -1;
  }

  /** Will a henchman get you up where you fell? (Then the game doesn't send you back to the start.) */
  get raising(): boolean { return !!this.run && this.run.allies.some((a) => a.role === 'healer' && !a.down); }

  /** Where you come round after going down with nobody to get you up: the start of the dungeon. */
  respawnAt(): [number, number, number] | null {
    const r = this.run;
    if (!r?.act.arrive) return null;
    // A wipe: everyone back to the start, and the fight that killed you resets
    for (const b of r.bosses) if (!b.done) this.resetBoss(b);
    for (const e of [...r.mobs]) if (e.alive && e.state !== 'idle') e.state = 'return';
    r.threat.clear();
    const [x, y, z] = r.act.arrive;
    r.allies.forEach((a, i) => { a.getUp(0.6); a.place(x + 1.2 + (i % 2) * 1.1, y, z + (i - 1) * 1.3); });
    r.trail = [];
    return r.act.arrive;
  }

  // ---------------------------------------------------------------- In the world
  /** The door in (outside), the ladder out and the chest (inside): things to press E on. */
  candidates(P: THREE.Vector3, openFinder: (id: string) => void): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const d of DUNGEONS) {
      if (Math.hypot(P.x - d.door[0], P.z - d.door[2]) < 2.6 && Math.abs(P.y - d.door[1]) < 2.5) {
        out.push({ label: `${d.name} (group dungeon): open the Group Finder`, pos: new THREE.Vector3(d.door[0], d.door[1] + 1.2, d.door[2]), use: () => openFinder(d.id) });
      }
    }
    const r = this.run;
    if (r && r.spawned) {
      const ex = r.act.exit!;
      if (Math.hypot(P.x - ex[0], P.z - ex[2]) < 2.6 && Math.abs(P.y - ex[1]) < 2.5) out.push({ label: r.done ? 'Climb the ladder back up' : 'Climb the ladder back up (leave the dungeon)', pos: new THREE.Vector3(ex[0], ex[1] + 1.2, ex[2]), use: () => this.leave() });
      const c = r.act.chest!;
      if (r.done && !r.chest && Math.hypot(P.x - c[0], P.z - c[2]) < 2.6 && Math.abs(P.y - c[1]) < 2.5) out.push({ label: 'Open the chest', pos: new THREE.Vector3(c[0], c[1] + 0.5, c[2]), use: () => this.openChest() });
    }
    return out;
  }

  private openChest(): void {
    const r = this.run!;
    r.chest = true;
    const c = r.def.chest;
    const today = new Date().toDateString();
    const daily = this.host.flag('gdDaily') !== today;
    if (daily) this.host.setFlag('gdDaily', today);
    const k = rewardScale(this.host.level(), r.def.level);
    this.host.reward(Math.round(c.xp * k * (daily ? 1.5 : 1)), Math.round((c.marks + (daily ? 60 : 0)) * k), c.items, daily ? `${r.def.name}: the chest, and the day's first dungeon` : `${r.def.name}: the chest`);
    this.host.sfx('open');
    this.host.persist();
  }

  // ---------------------------------------------------------------- The group frames and bubbles
  /** Henchmen as group rows (under yours), for the frames. */
  rows(): GroupRow[] {
    const r = this.run;
    if (!r) return [];
    return r.allies.map((a) => ({ id: a.bubble, name: a.name, hp: a.hp, max: a.max, level: a.level, leader: false, me: false, near: true, calling: ROLE_NAMES[a.role], hench: true }));
  }

  /** Where a henchman's speech bubble goes. */
  bubbleAt(id: number): THREE.Vector3 | null { return this.run?.allies.find((a) => a.bubble === id)?.pos ?? null; }

  /** Save the way back out, not a spot in a dungeon that won't be there when you load. */
  savePos(): [number, number, number] | null { return this.run ? [this.run.def.out[0], this.run.def.out[1], this.run.def.out[2]] : null; }

  get queueSecs(): number { return this.queued ? this.clock - this.queued.since : 0; }
  static readonly FILL_SECS = FILL_MS;
}

/** Henchmen by id. */
const HENCH: Record<string, (typeof HENCHMEN)[number]> = Object.fromEntries(HENCHMEN.map((h) => [h.id, h]));
