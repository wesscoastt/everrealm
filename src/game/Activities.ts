import * as THREE from 'three';
import { BOSS_UP, BOSS_WARN, BossDef, EventDef, EVENTS, SHARDFALL_EVERY, SHARDFALLS, WORLD_BOSSES } from '../data/activities';
import { EnemyDef, EnemyType, ENEMIES } from '../data/gameplay';
import { ITEMS } from '../data/items';
import { Enemy } from '../entities/Enemy';
import type { MapMarker } from '../ui/Hud';
import { plan, Site } from '../world/sites';
import { REGION_INFO } from '../world/terrain';
import type { VoxelWorld } from '../world/VoxelWorld';

// The world's activities, in the manner of the big online games:
//   dynamic events (GW2): flare up when you come near, run in waves against the clock, pay out by
//     how much of the work was yours (gold, silver, bronze);
//   world bosses: rise on a schedule every player shares (it runs off the real clock), announced
//     ahead, with ground quakes to dodge and adds called in as they weaken;
//   Shardfalls (ESO's dark anchors, reworked): a star comes down in Scarth, one site after another;
//   public dungeons and delves (ESO): creatures that live there and come back, a champion, a chest;
//   vistas (GW2): climb, look, and the camera takes in the view; wonders pay for being found.

export interface ActivityHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  alive(): boolean;
  addEnemy(e: Enemy): void;
  removeEnemy(e: Enemy): void;
  hitPlayer(damage: number, from: Enemy): void;
  reward(xp: number, marks: number, items: string[], why: string): void;
  banner(title: string, sub: string): void;
  system(text: string): void;
  sound(name: 'discover' | 'levelUp' | 'bell' | 'open'): void;
  flag(key: string): unknown;
  setFlag(key: string, value: unknown): void;
  discovered(id: string): boolean;
  cinematic(view: [number, number, number, number, number, number], then: () => void): void;
  setEvent(panel: EventPanel | null): void;
}

export interface EventPanel { kind: 'event' | 'boss' | 'shard'; title: string; goal: string; progress: number; count: string; time?: number }

interface LiveEvent { def: EventDef; wave: number; enemies: Enemy[]; killed: number; total: number; endsAt: number }
interface LiveBoss { def: BossDef; enemy: Enemy; cycle: number; calls: number; nextQuake: number; quake?: { at: THREE.Vector3; t: number }; adds: Enemy[] }
interface LiveShard { idx: number; cycle: number; wave: number; enemies: Enemy[]; crystal: THREE.Group; fall: number }

const QUAKE_R = 8, QUAKE_WINDUP = 1.8;

/** A bigger, harder one of an ordinary creature: event leaders and dungeon champions. */
function championOf(type: EnemyType, scale = 1.4): EnemyDef {
  const d = ENEMIES[type];
  return { ...d, name: (d.elite ? '' : 'Champion ') + d.name, hp: Math.round(d.hp * 3.6), damage: Math.round(d.damage * 1.35), scale: (d.scale ?? 1) * scale, xp: d.xp * 4, elite: true, marks: [d.marks[0] * 3, d.marks[1] * 3], respawn: 300 };
}

export class Activities {
  private cool = new Map<string, number>();
  private live = new Map<string, LiveEvent>();
  private boss: LiveBoss | null = null;
  private announced = new Set<string>();
  private shard: LiveShard | null = null;
  private dungeons = new Map<string, Enemy[]>();
  private checkTimer = 0;
  private clock = 0;
  private quakeMesh: THREE.Mesh;
  private sites: Site[];

  constructor(private host: ActivityHost) {
    this.sites = plan().sites.filter((s) => s.act);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(QUAKE_R, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a2a', transparent: true, opacity: 0.3, depthWrite: false }));
    ring.visible = false;
    ring.renderOrder = 3;
    this.quakeMesh = ring;
    host.scene.add(ring);
  }

  private now(): number { return Date.now() / 1000; }

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
      this.foundWonders(P);
    }
    this.tickEvents(P);
    this.tickBoss(dt, P);
    this.tickShard(dt, P);
    this.panel(P);
  }

  // ---------------------------------------------------------------- Dynamic events
  private startEvents(P: THREE.Vector3): void {
    for (const def of EVENTS) {
      if (this.live.has(def.id) || (this.cool.get(def.id) ?? 0) > this.clock) continue;
      const d = Math.hypot(P.x - def.x, P.z - def.z);
      if (d > 70 || !this.host.voxels.isLoaded(def.x, def.z)) continue;
      if (Math.random() < 0.6) continue; // not every visit: they flare up when they will
      const ev: LiveEvent = { def, wave: -1, enemies: [], killed: 0, total: def.waves.reduce((n, w) => n + w.count, 0) + (def.leader ? 1 : 0), endsAt: this.clock + def.time };
      this.live.set(def.id, ev);
      this.nextWave(ev);
      this.host.banner(def.name, `Event · ${REGION_INFO[def.region].name}`);
      this.host.sound('bell');
    }
  }

  private nextWave(ev: LiveEvent): void {
    ev.wave++;
    const w = ev.def.waves[ev.wave];
    const last = ev.wave === ev.def.waves.length - 1;
    const types: EnemyDef[] = Array.from({ length: w.count }, () => ENEMIES[w.type]);
    if (last && ev.def.leader) types.push(championOf(ev.def.leader));
    types.forEach((def, i) => {
      const a = (i / types.length) * Math.PI * 2 + ev.wave, r = 5 + (i % 3) * 2;
      ev.enemies.push(this.spawn(def, ev.def.x + Math.cos(a) * r, ev.def.z + Math.sin(a) * r, true));
    });
  }

  private tickEvents(P: THREE.Vector3): void {
    for (const ev of this.live.values()) {
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
          const medal = share >= 0.75 ? 'Gold' : share >= 0.4 ? 'Silver' : 'Bronze';
          const k = medal === 'Gold' ? 1 : medal === 'Silver' ? 0.75 : 0.5;
          const items = ev.def.loot.filter((l) => Math.random() < l.chance * (medal === 'Gold' ? 1.5 : 1)).map((l) => l.item);
          const [lo, hi] = ev.def.marks;
          this.host.reward(Math.round(ev.def.xp * k), Math.round((lo + Math.random() * (hi - lo)) * k), items, `${ev.def.name}: ${medal}`);
          this.host.banner('Event complete', `${ev.def.name} · ${medal}`);
          const best = this.host.flag('ev:' + ev.def.id);
          if (best !== 'Gold' && !(best === 'Silver' && medal === 'Bronze')) this.host.setFlag('ev:' + ev.def.id, medal);
          this.host.sound('levelUp');
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
        this.boss = { def, enemy: e, cycle, calls: 0, nextQuake: this.clock + 8, adds: [] };
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
      if (a.kind !== 'dungeon' && a.kind !== 'delve') continue;
      const near = Math.hypot(P.x - s.x, P.z - s.z) < 70 && this.host.voxels.isLoaded(s.x, s.z);
      const list = this.dungeons.get(s.id);
      if (near && !list) {
        const out: Enemy[] = [];
        for (const [x, y, z, type] of a.spawns ?? []) out.push(this.spawnAt({ ...ENEMIES[type as EnemyType], respawn: 150 }, x, y, z));
        if (a.boss) out.push(this.spawnAt(championOf(a.boss[3] as EnemyType, a.kind === 'dungeon' ? 1.7 : 1.45), a.boss[0], a.boss[1], a.boss[2]));
        this.dungeons.set(s.id, out);
      } else if (!near && list && Math.hypot(P.x - s.x, P.z - s.z) > 110) {
        for (const e of list) this.host.removeEnemy(e);
        this.dungeons.delete(s.id);
      }
    }
  }

  // ---------------------------------------------------------------- Chests, vistas, wonders
  /** Things to press E on: dungeon chests (refill each half hour) and vistas (once each). */
  candidates(P: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const s of this.sites) {
      const a = s.act!;
      if (a.chest && Math.hypot(P.x - a.chest[0], P.z - a.chest[2]) < 2.4 && Math.abs(P.y - a.chest[1]) < 2.5) {
        const opened = Number(this.host.flag('chest:' + s.id) ?? 0);
        const ready = Date.now() - opened > 30 * 60 * 1000;
        out.push({ label: ready ? 'Open the chest' : 'The chest is empty (it fills again in a while)', pos: new THREE.Vector3(a.chest[0], a.chest[1] + 0.5, a.chest[2]), use: () => ready && this.openChest(s) });
      }
      if (a.view && Math.hypot(P.x - a.view[0], P.z - a.view[2]) < 3 && Math.abs(P.y - a.view[1]) < 2.5) {
        const seen = !!this.host.flag('vista:' + s.id);
        out.push({ label: seen ? 'Take in the view again' : 'Take in the view', pos: new THREE.Vector3(a.view[0], a.view[1] + 1, a.view[2]), use: () => this.vista(s, seen) });
      }
    }
    return out;
  }

  private openChest(s: Site): void {
    this.host.setFlag('chest:' + s.id, Date.now());
    const big = s.act!.kind === 'dungeon';
    const reg = s.region;
    const gear = Object.values(ITEMS).filter((d) => d.set && d.set !== 'tolley');
    const regional = gear.filter((d) => GEAR_REGION[d.set!] === reg);
    const items: string[] = [];
    if (Math.random() < (big ? 0.4 : 0.22)) items.push((regional.length ? regional : gear)[Math.floor(Math.random() * (regional.length || gear.length))].id);
    const mats: Record<string, string> = { greenwake: 'copper_ore', crownroad: 'boar_hide', brambledeep: 'elder_logs', saltwind: 'crab_shell', redstone: 'iron_ore', starfall: 'star_crystal' };
    items.push(mats[reg], mats[reg]);
    this.host.reward(big ? 900 : 450, big ? 60 : 30, items, `The chest in ${s.name}`);
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
      if (a.kind === 'vista' || this.host.flag('found:' + s.id)) continue;
      if (Math.hypot(P.x - s.x, P.z - s.z) > 40) continue;
      this.host.setFlag('found:' + s.id, 1);
      const what = a.kind === 'dungeon' ? 'Public dungeon' : a.kind === 'delve' ? 'Delve' : 'Wonder';
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

  /** The game tells us about every kill; ours count toward events. */
  onKilled(e: Enemy): void {
    for (const ev of this.live.values()) if (ev.enemies.includes(e)) ev.killed++;
    const b = this.boss;
    if (b && b.enemy === e) {
      // Besides its own loot: one of its region's pieces for certain, and the cycle is done
      const pieces = e.def.loot.filter((l) => l.chance < 1 && !ITEMS[l.item]?.mount).map((l) => l.item);
      this.host.reward(e.def.xp, 0, pieces.length ? [pieces[Math.floor(Math.random() * pieces.length)]] : [], `${e.def.name} defeated`);
      this.host.banner(`${e.def.name} defeated`, 'World boss');
      this.host.setFlag('boss:' + b.def.id, b.cycle);
      this.host.setFlag('killed:' + b.def.id, 1);
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
      const killed = ev.enemies.filter((e) => !e.alive).length + ev.def.waves.slice(0, ev.wave).reduce((n, w) => n + w.count, 0);
      best = { kind: 'event', title: ev.def.name, goal: ev.def.goal, progress: killed / ev.total, count: `${killed}/${ev.total}`, time: Math.max(0, ev.endsAt - this.clock) };
    }
    const b = this.boss;
    if (b && b.enemy.alive && Math.hypot(P.x - b.def.x, P.z - b.def.z) < 160) best = { kind: 'boss', title: b.enemy.def.name, goal: `World boss in ${b.def.where}. Roll out of the red ring.`, progress: 1 - b.enemy.hp / b.enemy.def.hp, count: `${Math.round((b.enemy.hp / b.enemy.def.hp) * 100)}% left`, time: -this.bossClock(b.def).until };
    const s = this.shard;
    if (s && s.wave >= 0) best = { kind: 'shard', title: 'Shardfall', goal: s.wave < 2 ? 'Shatter what came down with the star' : 'Break the Shardwarden', progress: (s.wave + (s.enemies.filter((e) => !e.alive).length / Math.max(1, s.enemies.length))) / 3, count: `Wave ${s.wave + 1}/3` };
    this.host.setEvent(best);
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
    return out;
  }
}

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
