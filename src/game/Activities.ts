import * as THREE from 'three';
import { FORT_BY_ID, FORT_RESPAWN } from '../data/forts';
import { regionLevel } from '../data/scaling';
import { realmNow } from '../world/clock';
import { BOSS_UP, BOSS_WARN, BossDef, EventDef, EVENTS, SHARDFALL_EVERY, SHARDFALLS, WORLD_BOSSES } from '../data/activities';
import { EnemyDef, EnemyType, ENEMIES } from '../data/gameplay';
import { ITEMS } from '../data/items';
import { Enemy } from '../entities/Enemy';
import type { MapMarker } from '../ui/Hud';
import { plan, Site } from '../world/sites';
import { REGION_INFO, RegionId } from '../world/terrain';
import { Tasks } from './Tasks';
import { Escorts } from './Escorts';
import { Puzzles } from './Puzzles';
import { RARES, RareDef, rareLairs, TREASURE_MAPS, TreasureMap, treasureSpot } from '../data/wilds';
import { hash2 } from '../world/noise';
import type { VoxelWorld } from '../world/VoxelWorld';

// The world's activities, in the manner of the big online games:
//   dynamic events (GW2): flare up when you come near, run in waves against the clock, pay out by
//     how much of the work was yours (gold, silver, bronze);
//   world bosses: rise on a schedule every player shares (it runs off the real clock), announced
//     ahead, with ground quakes to dodge and adds called in as they weaken;
//   Shardfalls (ESO's dark anchors, reworked): a star comes down in Scarth, one site after another;
//   public dungeons and delves (ESO): creatures that live there and come back, a champion, a chest;
//   vistas (GW2): climb, look, and the camera takes in the view; wonders pay for being found;
//   rares and treasure maps (data/wilds.ts): named creatures that turn up at landmarks, and maps
//     that mark where something was buried.

export interface ActivityHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  alive(): boolean;
  addEnemy(e: Enemy): void;
  removeEnemy(e: Enemy): void;
  hitPlayer(damage: number, from: Enemy): void;
  reward(xp: number, marks: number, items: string[], why: string): void;
  /** The player's level (everything scales to it). */
  level?(): number;
  banner(title: string, sub: string): void;
  system(text: string): void;
  sound(name: 'discover' | 'levelUp' | 'bell' | 'open'): void;
  /** Standing in a region goes up (game/Game.ts gainStanding). */
  standing?(region: string, n: number): void;
  flag(key: string): unknown;
  setFlag(key: string, value: unknown): void;
  discovered(id: string): boolean;
  cinematic(view: [number, number, number, number, number, number], then: () => void): void;
  setEvent(panel: EventPanel | null): void;
  /** An enemy fell other than by the player's blow (a shared boss): run the game's kill handling. */
  killed?(e: Enemy): void;
  /** Work toward the day's writs. */
  daily?(kind: 'event' | 'chore'): void;
  /** Someone speaks: in the chat, and in a bubble over them if one is given (an escort's walker). */
  say?(who: string, text: string, bubble?: number): void;
  /** The pack: treasure maps are read from it, and spent when dug. */
  count(item: string): number;
  take(item: string, n?: number): boolean;
  /** Online: the world boss's health is the server's, shared with every player there. */
  shared?: {
    on(): boolean; sync(id: string, cycle: number, max: number): void; hit(id: string, cycle: number, dmg: number, max: number): void;
    evStart(id: string, waves: number[], time: number, cooldown: number): void; evKill(id: string): void;
  };
}

export interface EventPanel { kind: 'event' | 'boss' | 'shard' | 'task' | 'escort'; title: string; goal: string; progress: number; count: string; time?: number }

interface LiveEvent { def: EventDef; wave: number; enemies: Enemy[]; killed: number; total: number; endsAt: number; shared?: { killed: number }; stalled?: number }
interface LiveBoss { def: BossDef; enemy: Enemy; cycle: number; calls: number; nextQuake: number; quake?: { at: THREE.Vector3; t: number }; adds: Enemy[]; shared: boolean; hitByMe: boolean; credit: boolean }
interface LiveShard { idx: number; cycle: number; wave: number; enemies: Enemy[]; crystal: THREE.Group; fall: number }

const QUAKE_R = 8, QUAKE_WINDUP = 1.8;
/** A shared world boss's health on the realm server, the same for everyone whatever their level. */
const SHARED_HP = 20000;

/** A bigger, harder one of an ordinary creature: event leaders and dungeon champions. */
function championOf(type: EnemyType, scale = 1.4): EnemyDef {
  const d = ENEMIES[type];
  return { ...d, name: (d.elite ? '' : 'Champion ') + d.name, hp: Math.round(d.hp * 3.6), damage: Math.round(d.damage * 1.35), scale: (d.scale ?? 1) * scale, xp: d.xp * 4, elite: true, marks: [d.marks[0] * 3, d.marks[1] * 3], respawn: 300 };
}

export class Activities {
  private cool = new Map<string, number>();
  private live = new Map<string, LiveEvent>();
  /** Online: when we last asked the server about each event (so we don't ask every second). */
  private asked = new Map<string, number>();
  private boss: LiveBoss | null = null;
  private announced = new Set<string>();
  private shard: LiveShard | null = null;
  private dungeons = new Map<string, Enemy[]>();
  private checkTimer = 0;
  private clock = 0;
  private quakeMesh: THREE.Mesh;
  private sites: Site[];
  readonly tasks: Tasks;
  readonly escorts: Escorts;
  readonly puzzles: Puzzles;

  constructor(private host: ActivityHost) {
    this.tasks = new Tasks(host, (def, x, z) => this.spawn(def, x, z, false));
    this.escorts = new Escorts(host, (def, x, z) => this.spawn(def, x, z, false));
    this.puzzles = new Puzzles(host);
    this.sites = plan().sites.filter((s) => s.act);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(QUAKE_R, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.3, depthWrite: false }));
    ring.visible = false;
    ring.renderOrder = 3;
    this.quakeMesh = ring;
    host.scene.add(ring);
  }

  private now(): number { return realmNow() / 1000; }

  update(dt: number): void {
    this.clock += dt;
    const P = this.host.player();
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) {
      this.checkTimer = 1;
      this.startEvents(P);
      this.scheduleBosses(P);
      this.runShardfall(P);
      this.populateDungeons(P);
      this.checkForts();
      this.foundWonders(P);
      this.runRares(P);
    }
    this.tickTreasure(P);
    this.tickEvents(P);
    this.tickBoss(dt, P);
    this.tickShard(dt, P);
    this.tasks.update(dt, P);
    this.escorts.update(dt, P);
    this.puzzles.update(dt, P);
    this.panel(P);
  }

  // ---------------------------------------------------------------- Dynamic events
  private startEvents(P: THREE.Vector3): void {
    for (const def of EVENTS) {
      if (this.live.has(def.id) || (this.cool.get(def.id) ?? 0) > this.clock) continue;
      const d = Math.hypot(P.x - def.x, P.z - def.z);
      if (d > 70 || !this.host.voxels.isLoaded(def.x, def.z)) continue;
      if (Math.random() < 0.6) continue; // not every visit: they flare up when they will
      if (this.host.shared?.on()) {
        // Online the server runs it: ask, and it starts the run (or says one is on, or resting)
        if ((this.asked.get(def.id) ?? 0) > this.clock) continue;
        this.asked.set(def.id, this.clock + 8);
        this.host.shared.evStart(def.id, waveSizes(def), def.time, def.cooldown);
        continue;
      }
      const ev: LiveEvent = { def, wave: -1, enemies: [], killed: 0, total: def.waves.reduce((n, w) => n + w.count, 0) + (def.leader ? 1 : 0), endsAt: this.clock + def.time };
      this.live.set(def.id, ev);
      this.nextWave(ev);
      this.host.banner(def.name, `Event · ${REGION_INFO[def.region].name}`);
      this.host.sound('bell');
    }
  }

  private nextWave(ev: LiveEvent, already = 0): void {
    ev.wave++;
    const w = ev.def.waves[ev.wave];
    const last = ev.wave === ev.def.waves.length - 1;
    const types: EnemyDef[] = Array.from({ length: w.count }, () => ENEMIES[w.type]);
    if (last && ev.def.leader) types.push(championOf(ev.def.leader));
    // Joining a shared wave part-way through: only what's left of it
    types.splice(0, Math.min(already, types.length - 1));
    types.forEach((def, i) => {
      const a = (i / types.length) * Math.PI * 2 + ev.wave, r = 5 + (i % 3) * 2;
      ev.enemies.push(this.spawn(def, ev.def.x + Math.cos(a) * r, ev.def.z + Math.sin(a) * r, true));
    });
  }

  private tickEvents(P: THREE.Vector3): void {
    for (const ev of this.live.values()) {
      if (ev.shared) {
        // The server keeps the clock and the count; leaving the area lets it go on without us
        if (Math.hypot(P.x - ev.def.x, P.z - ev.def.z) > 260) { this.endEvent(ev, 30); continue; }
        // Ours are all down but the wave isn't done (others' kills went elsewhere, or a message was
        // lost): after a moment the rest of the wave turns up here
        if (ev.enemies.some((e) => e.alive)) ev.stalled = undefined;
        else if (ev.stalled === undefined) ev.stalled = this.clock;
        else if (this.clock - ev.stalled > 6) {
          ev.stalled = undefined;
          const end = waveSizes(ev.def).slice(0, ev.wave + 1).reduce((a, b) => a + b, 0);
          const before = end - waveSizes(ev.def)[ev.wave];
          ev.wave--;
          this.nextWave(ev, Math.max(0, ev.shared.killed - before));
        }
        continue;
      }
      const far = Math.hypot(P.x - ev.def.x, P.z - ev.def.z) > 260;
      if (far || this.clock > ev.endsAt) {
        if (!far) { this.host.banner('Event failed', ev.def.name); }
        this.endEvent(ev, far ? 60 : ev.def.cooldown);
        continue;
      }
      if (ev.enemies.every((e) => !e.alive)) {
        if (ev.wave < ev.def.waves.length - 1) this.nextWave(ev);
        else {
          // Success: the share of the work that was yours sets the medal
          const share = ev.killed / Math.max(1, ev.total);
          this.award(ev, share >= 0.75 ? 'Gold' : share >= 0.4 ? 'Silver' : 'Bronze');
          this.endEvent(ev, ev.def.cooldown);
        }
      }
    }
  }

  private endEvent(ev: LiveEvent, cooldown: number): void {
    for (const e of ev.enemies) this.host.removeEnemy(e);
    this.live.delete(ev.def.id);
    this.cool.set(ev.def.id, this.clock + cooldown);
  }

  /** The server's word on a shared event: join it if we're near, and keep up with its waves. */
  eventState(id: string, killed: number, total: number, wave: number, left: number): void {
    const def = EVENTS.find((d) => d.id === id);
    if (!def) return;
    const P = this.host.player();
    let ev = this.live.get(id);
    if (!ev) {
      if (Math.hypot(P.x - def.x, P.z - def.z) > 160 || !this.host.voxels.isLoaded(def.x, def.z)) return;
      ev = { def, wave: -1, enemies: [], killed: 0, total, endsAt: this.clock + left, shared: { killed } };
      this.live.set(id, ev);
      this.host.banner(def.name, `Event · ${REGION_INFO[def.region].name}`);
      this.host.sound('bell');
    }
    ev.shared = { killed };
    ev.endsAt = this.clock + left;
    if (wave > ev.wave) {
      // The wave has moved on (others finished it): what was left of ours slips away
      for (const e of ev.enemies) if (e.alive) this.host.removeEnemy(e);
      ev.enemies = ev.enemies.filter((e) => !e.alive);
      const before = waveSizes(def).slice(0, wave).reduce((a, b) => a + b, 0);
      ev.wave = wave - 1;
      this.nextWave(ev, Math.max(0, killed - before));
    }
  }

  /** A shared event is over: the medal goes by our share of the work. */
  eventDone(id: string, ok: boolean, total: number, shares: Record<string, number>, me: string): void {
    const ev = this.live.get(id);
    const def = EVENTS.find((d) => d.id === id);
    if (!def) return;
    this.cool.set(id, this.clock + (ok ? def.cooldown : 60));
    if (!ev) return;
    if (!ok) { this.host.banner('Event failed', def.name); this.endEvent(ev, 60); return; }
    const mine = Number(shares[me] ?? 0), people = Math.max(1, Object.keys(shares).length);
    const fair = total / people;
    if (mine === 0) { this.host.banner('Event complete', `${def.name} · others saw it through`); this.endEvent(ev, def.cooldown); return; }
    const k = mine / fair;
    const medal = k >= 0.75 ? 'Gold' : k >= 0.4 ? 'Silver' : 'Bronze';
    this.award(ev, medal);
    this.endEvent(ev, def.cooldown);
  }

  /** That event ran lately: don't ask again until it's rested. */
  eventCool(id: string, left: number): void {
    this.cool.set(id, this.clock + left);
  }

  /** Pay out an event by medal. */
  private award(ev: LiveEvent, medal: 'Gold' | 'Silver' | 'Bronze'): void {
    const k = medal === 'Gold' ? 1 : medal === 'Silver' ? 0.75 : 0.5;
    const items = ev.def.loot.filter((l) => Math.random() < l.chance * (medal === 'Gold' ? 1.5 : 1)).map((l) => l.item);
    const [lo, hi] = ev.def.marks;
    this.host.reward(Math.round(ev.def.xp * k), Math.round((lo + Math.random() * (hi - lo)) * k), items, `${ev.def.name}: ${medal}`);
    this.host.banner('Event complete', `${ev.def.name} · ${medal}`);
    const best = this.host.flag('ev:' + ev.def.id);
    if (best !== 'Gold' && !(best === 'Silver' && medal === 'Bronze')) this.host.setFlag('ev:' + ev.def.id, medal);
    this.host.sound('levelUp');
    this.host.daily?.('event');
  }

  // ---------------------------------------------------------------- World bosses
  /** Where a boss is in its cycle: seconds until it rises (negative while it's up), and the cycle's number. */
  private bossClock(def: BossDef): { until: number; cycle: number } {
    const t = this.now() - def.offset;
    const cycle = Math.floor(t / def.every), phase = t - cycle * def.every;
    return { until: phase < BOSS_UP ? -(BOSS_UP - phase) : def.every - phase, cycle };
  }

  private scheduleBosses(P: THREE.Vector3): void {
    for (const def of WORLD_BOSSES) {
      const { until, cycle } = this.bossClock(def);
      const name = ENEMIES[def.type].name;
      const key = def.id + ':' + cycle;
      if (until > 0 && until < BOSS_WARN && !this.announced.has(key + 'w')) {
        this.announced.add(key + 'w');
        this.host.system(`${name} will rise in ${def.where} in ${Math.ceil(until / 60)} minutes.`);
      }
      const up = until < 0;
      const beaten = this.host.flag('boss:' + def.id) === cycle;
      if (up && !beaten && !this.boss && Math.hypot(P.x - def.x, P.z - def.z) < 200 && this.host.voxels.isLoaded(def.x, def.z)) {
        const e = this.spawn({ ...ENEMIES[def.type] }, def.x, def.z, true);
        const shared = !!this.host.shared?.on();
        this.boss = { def, enemy: e, cycle, calls: 0, nextQuake: this.clock + 8, adds: [], shared, hitByMe: false, credit: true };
        if (shared) this.host.shared!.sync(def.id, cycle, SHARED_HP);
        this.host.banner(name, `World boss · ${def.where}`);
        this.host.sound('bell');
      }
    }
    if (this.boss) {
      const b = this.boss, { until, cycle } = this.bossClock(b.def);
      if (cycle !== b.cycle || until > 0 || Math.hypot(P.x - b.def.x, P.z - b.def.z) > 260) this.dropBoss();
    }
  }

  private tickBoss(dt: number, P: THREE.Vector3): void {
    const b = this.boss;
    if (!b) { this.quakeMesh.visible = false; return; }
    const e = b.enemy;
    if (!e.alive) return;
    // Rose before the connection was up: join the shared fight once it is
    if (!b.shared && this.host.shared?.on()) { b.shared = true; this.host.shared.sync(b.def.id, b.cycle, SHARED_HP); }
    // Adds at two-thirds and one-third
    const hp = e.hp / e.def.hp;
    if ((b.calls === 0 && hp < 0.66) || (b.calls === 1 && hp < 0.33)) {
      b.calls++;
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + b.calls; b.adds.push(this.spawn(ENEMIES[b.def.adds], e.pos.x + Math.cos(a) * 6, e.pos.z + Math.sin(a) * 6, true)); }
      this.host.system(`${e.def.name} calls its kin.`);
    }
    // The quake: a ring on the ground round it, then the blow; roll out or roll through
    if (!b.quake && this.clock > b.nextQuake && e.pos.distanceTo(P) < 30) b.quake = { at: e.pos.clone(), t: 0 };
    if (b.quake) {
      b.quake.t += dt;
      const k = Math.min(1, b.quake.t / QUAKE_WINDUP);
      this.quakeMesh.visible = true;
      this.quakeMesh.position.set(b.quake.at.x, b.quake.at.y + 0.08, b.quake.at.z);
      this.quakeMesh.scale.setScalar(0.25 + k * 0.75);
      (this.quakeMesh.material as THREE.MeshBasicMaterial).opacity = 0.18 + k * 0.3;
      if (k >= 1) {
        if (this.host.alive() && Math.hypot(P.x - b.quake.at.x, P.z - b.quake.at.z) < QUAKE_R && Math.abs(P.y - b.quake.at.y) < 4) this.host.hitPlayer(Math.round(e.def.damage * 1.3), e);
        b.quake = undefined;
        b.nextQuake = this.clock + 10 + Math.random() * 4;
        this.quakeMesh.visible = false;
      }
    }
  }

  private dropBoss(): void {
    const b = this.boss!;
    this.host.removeEnemy(b.enemy);
    for (const a of b.adds) this.host.removeEnemy(a);
    this.boss = null;
    this.quakeMesh.visible = false;
  }

  // ---------------------------------------------------------------- Shardfalls
  private runShardfall(P: THREE.Vector3): void {
    const t = this.now(), cycle = Math.floor(t / SHARDFALL_EVERY), idx = cycle % SHARDFALLS.length;
    const [sx, sz] = SHARDFALLS[idx];
    if (this.shard && this.shard.cycle !== cycle) this.endShard();
    const done = this.host.flag('shard') === cycle;
    if (!this.shard && !done && Math.hypot(P.x - sx, P.z - sz) < 90 && this.host.voxels.isLoaded(sx, sz)) {
      const crystal = shardCrystal();
      const y = this.host.voxels.topSolid(sx, sz) + 1;
      crystal.position.set(sx + 0.5, y + 40, sz + 0.5);
      this.host.scene.add(crystal);
      this.shard = { idx, cycle, wave: -1, enemies: [], crystal, fall: y };
      this.host.banner('A Shardfall', 'A star comes down in Scarth');
      this.host.sound('bell');
    }
  }

  private tickShard(dt: number, P: THREE.Vector3): void {
    const s = this.shard;
    if (!s) return;
    const c = s.crystal;
    if (c.position.y > s.fall) {
      c.position.y = Math.max(s.fall, c.position.y - dt * 30);
      c.rotation.y += dt * 2;
      if (c.position.y === s.fall) this.nextShardWave(s);
      return;
    }
    c.rotation.y += dt * 0.3;
    if (Math.hypot(P.x - c.position.x, P.z - c.position.z) > 200) { this.endShard(); return; }
    if (s.wave >= 0 && s.enemies.every((e) => !e.alive)) {
      if (s.wave < 2) this.nextShardWave(s);
      else {
        this.host.reward(1400, 40 + Math.round(Math.random() * 20), ['star_crystal', 'star_crystal', ...(Math.random() < 0.12 ? ['starglass_edge'] : [])], 'Shardfall sealed');
        this.host.banner('Shardfall sealed', 'The star is still');
        this.host.setFlag('shard', s.cycle);
        this.host.setFlag('shardsSealed', Number(this.host.flag('shardsSealed') ?? 0) + 1);
        this.endShard();
      }
    }
  }

  private nextShardWave(s: LiveShard): void {
    s.wave++;
    const [sx, sz] = SHARDFALLS[s.idx];
    const list: EnemyDef[] = s.wave === 2 ? [ENEMIES.shardwarden, ENEMIES.shardjelly, ENEMIES.shardjelly] : Array.from({ length: 3 + s.wave }, () => ENEMIES.shardjelly);
    list.forEach((def, i) => { const a = (i / list.length) * Math.PI * 2; s.enemies.push(this.spawn(def, sx + Math.cos(a) * 6, sz + Math.sin(a) * 6, true)); });
  }

  private endShard(): void {
    const s = this.shard!;
    for (const e of s.enemies) this.host.removeEnemy(e);
    this.host.scene.remove(s.crystal);
    this.shard = null;
  }

  // ---------------------------------------------------------------- Dungeons and delves
  private populateDungeons(P: THREE.Vector3): void {
    for (const s of this.sites) {
      const a = s.act!;
      if (a.kind !== 'dungeon' && a.kind !== 'delve' && a.kind !== 'dive' && a.kind !== 'camp' && a.kind !== 'fort') continue;
      const near = Math.hypot(P.x - s.x, P.z - s.z) < 70 && this.host.voxels.isLoaded(s.x, s.z);
      const list = this.dungeons.get(s.id);
      if (near && !list) {
        const out: Enemy[] = [];
        if (a.kind === 'fort') {
          // A gang: its members, the chief's two seconds, and the chief; when emptied, they drift back together
          const f = FORT_BY_ID[s.id.slice(5)];
          for (const [x, y, z, type] of a.spawns ?? []) out.push(this.spawnAt({ ...ENEMIES[type as EnemyType], respawn: FORT_RESPAWN }, x, y, z));
          for (const [x, y, z, type] of a.guards ?? []) out.push(this.spawnAt({ ...championOf(type as EnemyType, 1.12), name: `${f?.gangName ?? 'Gang'} lieutenant`, respawn: FORT_RESPAWN }, x, y, z));
          if (a.boss) out.push(this.spawnAt({ ...ENEMIES[a.boss[3] as EnemyType] }, a.boss[0], a.boss[1], a.boss[2]));
          this.fortDone.delete(s.id);
          this.dungeons.set(s.id, out);
          continue;
        }
        for (const [x, y, z, type] of a.spawns ?? []) out.push(this.spawnAt({ ...ENEMIES[type as EnemyType], respawn: 150 }, x, y, z));
        if (a.boss) out.push(this.spawnAt(championOf(a.boss[3] as EnemyType, a.kind === 'dungeon' ? 1.7 : 1.45), a.boss[0], a.boss[1], a.boss[2]));
        this.dungeons.set(s.id, out);
      } else if (!near && list && Math.hypot(P.x - s.x, P.z - s.z) > 110) {
        for (const e of list) this.host.removeEnemy(e);
        this.dungeons.delete(s.id);
      }
    }
  }

  // ---------------------------------------------------------------- Bandit forts
  /** Forts emptied of their gang (until any of it comes back). */
  private fortDone = new Set<string>();

  /** A fort with every one of its gang down is cleared: the region's thanks, and the chest opens. */
  private checkForts(): void {
    for (const s of this.sites) {
      if (s.act?.kind !== 'fort') continue;
      const list = this.dungeons.get(s.id);
      if (!list?.length) continue;
      const down = list.every((e) => !e.alive);
      if (!down) { this.fortDone.delete(s.id); continue; }
      if (this.fortDone.has(s.id)) continue;
      this.fortDone.add(s.id);
      const f = FORT_BY_ID[s.id.slice(5)];
      const first = !this.host.flag('fort:' + f.id);
      this.host.setFlag('fort:' + f.id, Date.now());
      this.host.setFlag('fortClears', Number(this.host.flag('fortClears') ?? 0) + 1);
      this.host.banner(`${f.name} cleared`, first ? `The ${f.gangName} are broken. The chief's chest is yours.` : `The ${f.gangName} are scattered again, for now.`);
      this.host.sound('levelUp');
      this.host.reward(first ? 1600 : 500, first ? 90 : 25, [], `Clearing ${f.name}`);
      this.host.standing?.(f.region, first ? 120 : 30);
    }
  }

  // ---------------------------------------------------------------- Chests, vistas, wonders
  /** Things to press E on: dungeon chests (refill each half hour) and vistas (once each). */
  candidates(P: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [...this.escorts.candidates(P), ...this.puzzles.candidates(P), ...this.tasks.candidates(P)];
    for (const s of this.sites) {
      const a = s.act!;
      if (a.chest && a.kind === 'fort' && !this.fortDone.has(s.id) && Math.hypot(P.x - a.chest[0], P.z - a.chest[2]) < 2.4 && Math.abs(P.y - a.chest[1]) < 2.5) {
        out.push({ label: 'The chief\'s chest is locked (clear the fort first)', pos: new THREE.Vector3(a.chest[0], a.chest[1] + 0.5, a.chest[2]), use: () => {} });
        continue;
      }
      if (a.chest && a.kind !== 'group' && Math.hypot(P.x - a.chest[0], P.z - a.chest[2]) < 2.4 && Math.abs(P.y - a.chest[1]) < 2.5) {
        const opened = Number(this.host.flag('chest:' + s.id) ?? 0);
        const ready = Date.now() - opened > 30 * 60 * 1000;
        out.push({ label: ready ? 'Open the chest' : 'The chest is empty (it fills again in a while)', pos: new THREE.Vector3(a.chest[0], a.chest[1] + 0.5, a.chest[2]), use: () => ready && this.openChest(s) });
      }
      // (treasure: below, once per map)
      a.caches?.forEach((c, i) => {
        if (Math.hypot(P.x - c[0], P.z - c[2]) > 2.6 || Math.abs(P.y - c[1]) > 2.8) return;
        const ready = Date.now() - Number(this.host.flag(`cache:${s.id}:${i}`) ?? 0) > 45 * 60 * 1000;
        out.push({ label: ready ? 'Open the sunken chest' : 'Empty (the sea brings more in a while)', pos: new THREE.Vector3(c[0], c[1] + 0.5, c[2]), use: () => ready && this.openCache(s, i) });
      });
      if (a.view && Math.hypot(P.x - a.view[0], P.z - a.view[2]) < 3 && Math.abs(P.y - a.view[1]) < 2.5) {
        const seen = !!this.host.flag('vista:' + s.id);
        out.push({ label: seen ? 'Take in the view again' : 'Take in the view', pos: new THREE.Vector3(a.view[0], a.view[1] + 1, a.view[2]), use: () => this.vista(s, seen) });
      }
    }
    for (const m of TREASURE_MAPS) {
      if (this.host.count(m.id) === 0) continue;
      const s = this.spotOf(m);
      if (s && Math.hypot(P.x - s.x, P.z - s.z) < 3 && Math.abs(P.y - (this.host.voxels.topSolid(s.x, s.z) + 1)) < 3) out.push({ label: 'Dig at the turned earth', pos: new THREE.Vector3(s.x, P.y + 0.3, s.z), use: () => this.dig(m) });
    }
    return out;
  }

  // ---------------------------------------------------------------- Rares
  private rares = new Map<string, { enemy: Enemy; lair: number; seen: boolean; deadFor: number }>();
  private lairCache = new Map<string, [number, number][]>();

  private lairsOf(r: RareDef): [number, number][] {
    let l = this.lairCache.get(r.id);
    if (!l) { l = rareLairs(r, plan()); this.lairCache.set(r.id, l); }
    return l;
  }

  /** Rares turn up at one lair at a time, the same one for everybody (it moves on every forty minutes). */
  private runRares(P: THREE.Vector3): void {
    const now = this.now();
    for (const r of RARES) {
      const lairs = this.lairsOf(r);
      if (!lairs.length) continue;
      const idx = Math.floor(now / 2400 + hash2(r.id.length, r.id.charCodeAt(1), 902) * lairs.length) % lairs.length;
      const [lx, lz] = lairs[idx];
      const live = this.rares.get(r.id);
      if (live) {
        if (!live.enemy.alive) {
          // Killed: gone for this player for twenty-five minutes, counted for the feat
          if (live.deadFor === 0) {
            this.host.setFlag('rareAt:' + r.id, realmNow());
            this.host.setFlag('rareKill:' + r.id, Number(this.host.flag('rareKill:' + r.id) ?? 0) + 1);
            this.host.banner(r.name, 'Rare · slain');
          }
          live.deadFor += 1;
          if (live.deadFor > 8) { this.host.removeEnemy(live.enemy); this.rares.delete(r.id); }
          continue;
        }
        if (live.lair !== idx || Math.hypot(P.x - live.enemy.pos.x, P.z - live.enemy.pos.z) > 240) { this.host.removeEnemy(live.enemy); this.rares.delete(r.id); continue; }
        if (!live.seen && live.enemy.pos.distanceTo(P) < 48) {
          live.seen = true;
          this.host.banner(r.name, `Rare · ${REGION_INFO[r.region].name}`);
          this.host.sound('bell');
        }
        continue;
      }
      if (realmNow() - Number(this.host.flag('rareAt:' + r.id) ?? 0) < 25 * 60 * 1000) continue;
      if (Math.hypot(P.x - lx, P.z - lz) > 160 || !this.host.voxels.isLoaded(lx, lz)) continue;
      const e = this.spawn(ENEMIES[r.type], lx, lz, true);
      this.rares.set(r.id, { enemy: e, lair: idx, seen: false, deadFor: 0 });
    }
  }

  // ---------------------------------------------------------------- Treasure maps
  private spots = new Map<string, { x: number; z: number }>();
  private mounds = new Map<string, THREE.Group>();

  spotOf(m: TreasureMap): { x: number; z: number } | null {
    let s = this.spots.get(m.id);
    if (s === undefined) { s = treasureSpot(m, plan()) ?? undefined; if (s) this.spots.set(m.id, s); }
    return s ?? null;
  }

  /** The turned earth over each held map's X, shown once you're near it. */
  private tickTreasure(P: THREE.Vector3): void {
    for (const m of TREASURE_MAPS) {
      const s = this.host.count(m.id) > 0 ? this.spotOf(m) : null;
      const near = !!s && Math.hypot(P.x - s.x, P.z - s.z) < 60 && this.host.voxels.isLoaded(s.x, s.z);
      let g = this.mounds.get(m.id);
      if (near && !g) {
        g = dirtMound();
        g.position.set(s!.x, this.host.voxels.topSolid(s!.x, s!.z) + 1, s!.z);
        this.host.scene.add(g);
        this.mounds.set(m.id, g);
      } else if (!near && g) {
        this.host.scene.remove(g);
        this.mounds.delete(m.id);
      }
      if (g) g.children[1].rotation.y += 0.02;
    }
  }

  /** Dig at a held map's X. */
  private dig(m: TreasureMap): void {
    if (!this.host.take(m.id, 1)) return;
    this.host.setFlag('dug:' + m.id, Number(this.host.flag('dug:' + m.id) ?? 0) + 1);
    const lvl = regionLevel(m.region);
    const mats: Record<RegionId, string> = { greenwake: 'copper_ore', crownroad: 'boar_hide', brambledeep: 'elder_logs', saltwind: 'crab_shell', redstone: 'iron_ore', starfall: 'star_crystal', gannet: 'gannet_egg', wrath: 'smoked_eel', tolmen: 'iron_ore', inkholm: 'chanterelles', kell: 'brass_cog' };
    const items = [mats[m.region], mats[m.region]];
    const gear = Object.values(ITEMS).filter((d) => d.set && d.set !== 'tolley' && !DUNGEON_SETS.has(d.set));
    const regional = gear.filter((d) => GEAR_REGION[d.set!] === m.region);
    if (Math.random() < 0.4) items.push((regional.length ? regional : gear)[Math.floor(Math.random() * (regional.length || gear.length))].id);
    this.host.reward(300 + lvl * 30, 20 + lvl * 3, items, `Treasure dug up in ${REGION_INFO[m.region].name}`);
    this.host.sound('open');
    const g = this.mounds.get(m.id);
    if (g) { this.host.scene.remove(g); this.mounds.delete(m.id); }
  }

  /** A treasure map, now and then, from a chest: one of that region's you don't have. */
  private mapFrom(region: RegionId, chance: number): string[] {
    if (Math.random() >= chance) return [];
    const own = TREASURE_MAPS.filter((m) => m.region === region && this.host.count(m.id) === 0);
    return own.length ? [own[Math.floor(Math.random() * own.length)].id] : [];
  }

  private openChest(s: Site): void {
    this.host.setFlag('chest:' + s.id, Date.now());
    const big = s.act!.kind === 'dungeon' || s.act!.kind === 'fort';
    const reg = s.region;
    const gear = Object.values(ITEMS).filter((d) => d.set && d.set !== 'tolley' && !DUNGEON_SETS.has(d.set));
    const regional = gear.filter((d) => GEAR_REGION[d.set!] === reg);
    const items: string[] = [];
    if (Math.random() < (big ? 0.4 : 0.22)) items.push((regional.length ? regional : gear)[Math.floor(Math.random() * (regional.length || gear.length))].id);
    const mats: Record<RegionId, string> = { greenwake: 'copper_ore', crownroad: 'boar_hide', brambledeep: 'elder_logs', saltwind: 'crab_shell', redstone: 'iron_ore', starfall: 'star_crystal', gannet: 'boar_hide', wrath: 'jelly_residue', tolmen: 'iron_ore', inkholm: 'stemwood', kell: 'brass_cog' };
    items.push(mats[reg], mats[reg], ...this.mapFrom(reg, 0.3));
    this.host.reward(big ? 900 : 450, big ? 60 : 30, items, `The chest in ${s.name}`);
    this.host.sound('open');
  }

  /** A sunken chest: marks, what the sea grows, and now and then a piece of the coast's gear. */
  private openCache(s: Site, i: number): void {
    this.host.setFlag(`cache:${s.id}:${i}`, Date.now());
    const deep = s.region === 'starfall' || s.region === 'tolmen' || s.region === 'redstone';
    const sea = deep ? ['shark_tooth', 'shark_tooth', 'ray_barb', 'raw_seabass'] : ['conger_skin', 'ray_barb', 'raw_mackerel', 'raw_huss'];
    const items = [sea[Math.floor(Math.random() * sea.length)], sea[Math.floor(Math.random() * sea.length)]];
    const gear = Object.values(ITEMS).filter((d) => d.set && (GEAR_REGION[d.set] === s.region || d.set === 'brine'));
    if (gear.length && Math.random() < 0.25) items.push(gear[Math.floor(Math.random() * gear.length)].id);
    items.push(...this.mapFrom(s.region, 0.25));
    this.host.reward(deep ? 520 : 300, deep ? 34 : 20, items, `A sunken chest at ${s.name}`);
    this.host.sound('open');
  }

  private vista(s: Site, seen: boolean): void {
    this.host.cinematic(s.act!.view!, () => {
      if (seen) return;
      this.host.setFlag('vista:' + s.id, 1);
      this.host.reward(400, 0, [], s.name.replace('Vista: ', 'Vista · '));
      this.host.banner('Vista', s.name.replace('Vista: ', ''));
    });
  }

  /** Finding a wonder, a dungeon or a delve pays a little the first time. */
  private foundWonders(P: THREE.Vector3): void {
    for (const s of this.sites) {
      const a = s.act!;
      if (a.kind === 'vista' || a.kind === 'camp' || a.kind === 'group' || this.host.flag('found:' + s.id)) continue;
      if (Math.hypot(P.x - s.x, P.z - s.z) > 40) continue;
      this.host.setFlag('found:' + s.id, 1);
      const what = a.kind === 'dungeon' ? 'Public dungeon' : a.kind === 'delve' ? 'Delve' : a.kind === 'dive' ? 'Dive site' : a.kind === 'fort' ? 'Bandit fort' : 'Wonder';
      this.host.reward(a.kind === 'scenic' ? 500 : 250, 0, [], `${what} found: ${s.name}`);
      this.host.banner(s.name, what + ' discovered');
      this.host.sound('discover');
    }
  }

  // ---------------------------------------------------------------- Shared
  private spawn(def: EnemyDef, x: number, z: number, hunt: boolean): Enemy {
    const e = new Enemy(def, Math.floor(x), Math.floor(z), this.host.voxels);
    if (hunt) e.questTag = 'activity';
    this.host.addEnemy(e);
    return e;
  }

  private spawnAt(def: EnemyDef, x: number, y: number, z: number): Enemy {
    const e = new Enemy(def, Math.floor(x), Math.floor(z), this.host.voxels);
    e.home.set(Math.floor(x) + 0.5, y, Math.floor(z) + 0.5);
    e.pos.copy(e.home);
    this.host.addEnemy(e);
    return e;
  }

  /**
   * A blow on an enemy, before it lands. A shared world boss never falls from our blow alone: the
   * blow goes to the server, and the boss stays on at least one point until the server says it's
   * down. Returns the damage to apply here.
   */
  beforeHit(e: Enemy, dmg: number): number {
    const b = this.boss;
    if (!b || b.enemy !== e || !b.shared) return dmg;
    if (!this.host.shared?.on()) { b.shared = false; return dmg; }
    b.hitByMe = true;
    // Each player's boss is at their own level, so the realm keeps its health as a share of SHARED_HP
    this.host.shared.hit(b.def.id, b.cycle, Math.max(1, Math.round((dmg / e.def.hp) * SHARED_HP)), SHARED_HP);
    return Math.min(dmg, Math.max(0, e.hp - 1));
  }

  /** The server's word on a shared boss's health. */
  bossState(id: string, cycle: number, hp: number): void {
    const b = this.boss;
    if (!b || b.def.id !== id || b.cycle !== cycle || !b.enemy.alive) return;
    b.enemy.hp = Math.max(1, Math.min(b.enemy.def.hp, Math.round((hp / SHARED_HP) * b.enemy.def.hp)));
  }

  /** The server says the boss is down: it falls here too. Those who fought it get the reward. */
  bossDown(id: string, cycle: number, by: string[], me: string): void {
    const b = this.boss;
    if (!b || b.def.id !== id || b.cycle !== cycle || !b.enemy.alive) return;
    b.credit = b.hitByMe || by.includes(me);
    const others = by.filter((n) => n !== me);
    if (others.length) this.host.system(`${b.enemy.def.name} falls. Fought by ${by.join(', ')}.`);
    b.enemy.takeDamage(b.enemy.hp + 1, b.enemy.pos, this.clock);
    // Fighters get the full kill (its loot, marks and the boss's own reward); onlookers only see it fall
    if (b.credit) this.host.killed?.(b.enemy); else this.onKilled(b.enemy);
  }

  /** The game tells us about every kill; ours count toward events. */
  onKilled(e: Enemy): void {
    this.tasks.onKilled(e);
    this.escorts.onKilled(e);
    for (const ev of this.live.values()) if (ev.enemies.includes(e)) {
      ev.killed++;
      if (ev.shared) this.host.shared?.evKill(ev.def.id);
    }
    const b = this.boss;
    if (b && b.enemy === e) {
      // Besides its own loot: one of its region's pieces for certain, and the cycle is done
      const pieces = e.def.loot.filter((l) => l.chance < 1 && !ITEMS[l.item]?.mount).map((l) => l.item);
      if (b.credit) {
        this.host.reward(e.def.xp, 0, pieces.length ? [pieces[Math.floor(Math.random() * pieces.length)]] : [], `${e.def.name} defeated`);
        this.host.banner(`${e.def.name} defeated`, 'World boss');
      } else this.host.banner(`${e.def.name} defeated`, 'Others brought it down; land a blow next time for a share');
      this.host.setFlag('boss:' + b.def.id, b.cycle);
      if (b.credit) this.host.setFlag('killed:' + b.def.id, 1);
      for (const a of b.adds) if (a.alive) this.host.removeEnemy(a);
      this.quakeMesh.visible = false;
      setTimeout(() => { if (this.boss === b) { this.host.removeEnemy(b.enemy); this.boss = null; } }, 8000);
    }
  }

  private panel(P: THREE.Vector3): void {
    let best: EventPanel | null = null, bd = Infinity;
    for (const ev of this.live.values()) {
      const d = Math.hypot(P.x - ev.def.x, P.z - ev.def.z);
      if (d > 160 || d > bd) continue;
      bd = d;
      const killed = ev.shared ? ev.shared.killed : ev.enemies.filter((e) => !e.alive).length + ev.def.waves.slice(0, ev.wave).reduce((n, w) => n + w.count, 0);
      best = { kind: 'event', title: ev.def.name, goal: ev.def.goal, progress: killed / ev.total, count: `${killed}/${ev.total}`, time: Math.max(0, ev.endsAt - this.clock) };
    }
    const b = this.boss;
    if (b && b.enemy.alive && Math.hypot(P.x - b.def.x, P.z - b.def.z) < 160) best = { kind: 'boss', title: b.enemy.def.name, goal: `World boss in ${b.def.where}. Roll out of the red ring.`, progress: 1 - b.enemy.hp / b.enemy.def.hp, count: `${Math.round((b.enemy.hp / b.enemy.def.hp) * 100)}% left`, time: -this.bossClock(b.def).until };
    const s = this.shard;
    if (s && s.wave >= 0) best = { kind: 'shard', title: 'Shardfall', goal: s.wave < 2 ? 'Shatter what came down with the star' : 'Break the Shardwarden', progress: (s.wave + (s.enemies.filter((e) => !e.alive).length / Math.max(1, s.enemies.length))) / 3, count: `Wave ${s.wave + 1}/3` };
    // An escort you are on comes first: it is the thing you are doing
    this.host.setEvent(this.escorts.panel(P) ?? best ?? this.tasks.panel(P));
  }

  /** Map and minimap markers: events running, bosses up or coming, the Shardfall. */
  markers(): MapMarker[] {
    const out: MapMarker[] = [];
    for (const ev of this.live.values()) out.push({ x: ev.def.x, z: ev.def.z, kind: 'event', label: ev.def.name });
    for (const def of WORLD_BOSSES) {
      const { until } = this.bossClock(def);
      const name = ENEMIES[def.type].name;
      if (until < 0) out.push({ x: def.x, z: def.z, kind: 'boss', label: name });
      else if (until < 600) out.push({ x: def.x, z: def.z, kind: 'bossSoon', label: `${name} in ${Math.floor(until / 60)}:${String(Math.floor(until % 60)).padStart(2, '0')}` });
    }
    const cycle = Math.floor(this.now() / SHARDFALL_EVERY);
    if (this.host.flag('shard') !== cycle) { const [sx, sz] = SHARDFALLS[cycle % SHARDFALLS.length]; out.push({ x: sx, z: sz, kind: 'shard', label: 'Shardfall' }); }
    out.push(...this.tasks.markers(), ...this.escorts.markers(), ...this.puzzles.markers());
    // The X on every treasure map in the pack
    for (const m of TREASURE_MAPS) {
      if (this.host.count(m.id) === 0) continue;
      const s = this.spotOf(m);
      if (s) out.push({ x: s.x, z: s.z, kind: 'treasure', label: 'Treasure map' });
    }
    return out;
  }
}

/** Turned earth over a treasure map's X: a low mound of soil and a slow gold glint above it. */
function dirtMound(): THREE.Group {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#5a4028' }));
  soil.scale.set(1, 0.35, 1);
  g.add(soil);
  const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: '#ffd860' }));
  glint.position.y = 0.9;
  g.add(glint);
  return g;
}

/** How many creatures each wave brings (the leader comes with the last). */
function waveSizes(def: EventDef): number[] {
  return def.waves.map((w, i) => w.count + (i === def.waves.length - 1 && def.leader ? 1 : 0));
}

/** Group dungeons' sets drop only in their dungeons. */
const DUNGEON_SETS = new Set(['oldman', 'fold', 'escapement']);

/** Which region each gear set comes from (dungeon chests favour their own region's pieces). */
const GEAR_REGION: Record<string, string> = { tollriders: 'crownroad', thornback: 'brambledeep', brine: 'saltwind', harrow: 'redstone', starglass: 'starfall' };

/** The fallen star: a cluster of glowing crystal. */
function shardCrystal(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: '#9fe8ff', emissive: new THREE.Color('#3ab8e0'), emissiveIntensity: 0.9 });
  for (let i = 0; i < 7; i++) {
    const h = i === 0 ? 7 : 2.5 + (i % 3) * 1.4;
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0).scale(i === 0 ? 1.4 : 0.8, h / 2, i === 0 ? 1.4 : 0.8), mat);
    const a = i * 1.9;
    m.position.set(i === 0 ? 0 : Math.cos(a) * 2.2, h / 2 - 0.4, i === 0 ? 0 : Math.sin(a) * 2.2);
    m.rotation.set(i === 0 ? 0 : Math.cos(a) * 0.4, a, i === 0 ? 0 : Math.sin(a) * 0.4);
    g.add(m);
  }
  return g;
}
