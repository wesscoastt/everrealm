import * as THREE from 'three';
import { ENEMIES, type EnemyType } from '../data/gameplay';
import { checkpointUnder, ENCOUNTERS, HALL_AT, HALL_ENTRY, HALL_SPAWNS, HALL_Y, MODIFIERS, THEMES, TOWER, towerDef, towerFloor, type FloorFoe, type FloorPlan } from '../data/tower';
import { Enemy } from '../entities/Enemy';
import { utcDay, utcWeek } from '../data/calendar';
import type { VoxelWorld } from '../world/VoxelWorld';

// A run up the Endless Tower (data/tower.ts, docs/TOWER_BRIEF.md). You start at floor 1 or at a
// checkpoint you have cleared (every tenth floor), and each floor takes you to the hall of its theme
// under the tower, where its foes come at you in its own way: a clear, waves, holding out, against the
// sand, bad ground, an elite pack, a champion, a keeper. The foes are the realm's own creatures at the
// floor's scale, fought with the realm's own combat. Clear a floor and the stair takes you up to the
// next; fall, or walk out, and the run is over, with every checkpoint you've cleared still yours.

export interface TowerHost {
  scene: THREE.Scene;
  voxels: VoxelWorld;
  player(): THREE.Vector3;
  dead(): boolean;
  /** How many are climbing together (the party, you included). */
  partySize(): number;
  addEnemy(e: Enemy): void;
  removeEnemy(e: Enemy): void;
  /** Take you somewhere with a banner (the floor's hall, or out of the door). */
  travel(at: THREE.Vector3, yaw: number, banner: string, sub: string): void;
  banner(title: string, sub: string): void;
  system(text: string): void;
  reward(xp: number, marks: number, items: string[], why: string): void;
  flag(key: string): unknown;
  setFlag(key: string, value: unknown): void;
  sfx(name: 'levelUp' | 'discover' | 'fail' | 'bell'): void;
}

interface Run {
  start: number;
  floor: number;
  plan: FloorPlan;
  wave: number;
  mobs: Enemy[];
  boss: Enemy | null;
  /** Seconds on this floor. */
  t: number;
  /** Seconds before the next thing happens (the first wave, the next floor). */
  wait: number;
  state: 'arrive' | 'fight' | 'cleared';
  floorsCleared: number;
  started: number;
}

/** The first time a climber clears these floors, Annot Crowle has something put by for them: tokens, and a cloak at 25 and 100. */
export const MILESTONES: Record<number, { tokens: number; items: string[]; line: string }> = {
  10: { tokens: 10, items: [], line: 'Floor ten. Crowle writes your name in the book in ink, not pencil.' },
  25: { tokens: 25, items: ['cape_stair'], line: 'Floor twenty-five. Crowle sends down the Stair cloak.' },
  50: { tokens: 50, items: [], line: 'Floor fifty. Crowle\'s mother had six climbers who saw fifty. Now she has seven.' },
  75: { tokens: 75, items: [], line: 'Floor seventy-five. Even Crowle stops writing for a moment.' },
  100: { tokens: 150, items: ['cape_tower'], line: 'Floor one hundred. Crowle sends down the Endless cloak, the first she has given.' },
};

/** The day's climb and the week's: floors cleared, and what Crowle pays when they're done, once each. */
export const TOWER_DAILY = { floors: 5, tokens: 15 };
export const TOWER_WEEKLY = { floors: 30, tokens: 60 };
interface Tally { n: number; floors: number; paid: boolean }

/** Tower tokens a floor pays the first time and every time after. */
export const tokensFor = (n: number, first: boolean) => (first ? 3 : 1) + Math.floor(n / 10) + (n % 10 === 0 ? 5 : n % 5 === 0 ? 2 : 0);

export class Tower {
  run: Run | null = null;
  private clock = 0;
  constructor(private host: TowerHost) {}

  /** Your records: the highest floor cleared, and the highest reached. */
  best(): number { return Number(this.host.flag('tower:best') ?? 0); }
  reached(): number { return Number(this.host.flag('tower:reached') ?? 0); }
  /** The floors you may start from: the first, and every checkpoint you have cleared. */
  starts(): number[] { const out = [1]; for (let n = 10; n <= this.best(); n += 10) out.push(n); return out; }

  /** The day's and the week's climbs so far (floors cleared, whether paid). */
  tally(): { day: Tally; week: Tally } {
    const read = (k: string, n: number): Tally => { const v = this.host.flag(k) as Tally | undefined; return v && typeof v === 'object' && v.n === n ? v : { n, floors: 0, paid: false }; };
    return { day: read('tower:day', utcDay()), week: read('tower:week', utcWeek()) };
  }
  private count(): void {
    const t = this.tally();
    for (const [k, v, goal, why] of [['tower:day', t.day, TOWER_DAILY, 'The day\'s climb'], ['tower:week', t.week, TOWER_WEEKLY, 'The week\'s climb']] as const) {
      const now = { ...v, floors: v.floors + 1 };
      if (!now.paid && now.floors >= goal.floors) { now.paid = true; this.host.reward(0, 0, Array<string>(goal.tokens).fill('tower_token'), `${why} done, ${goal.floors} floors: ${goal.tokens} tower tokens`); }
      this.host.setFlag(k, now);
    }
  }

  /** Start a run at floor n (1, or a checkpoint you have cleared: you start on the floor after it). */
  begin(from: number): string | null {
    if (this.run) return 'You are already climbing.';
    const cp = from <= 1 ? 1 : checkpointUnder(from);
    if (cp > 1 && cp > this.best()) return `You have not cleared floor ${cp} yet.`;
    const first = cp <= 1 ? 1 : cp + 1;
    this.run = { start: first, floor: first, plan: towerFloor(first, this.host.partySize()), wave: 0, mobs: [], boss: null, t: 0, wait: 2.5, state: 'arrive', floorsCleared: 0, started: this.clock };
    this.enterFloor();
    return null;
  }

  /** Walk out: the run ends, and you are at the tower's door. */
  leave(why = 'You leave the tower.'): void {
    const r = this.run;
    if (!r) return;
    for (const e of r.mobs) this.host.removeEnemy(e);
    if (r.boss) this.host.removeEnemy(r.boss);
    this.run = null;
    this.host.travel(new THREE.Vector3(TOWER.x - 9.5, 0, TOWER.z + 0.5), -Math.PI / 2, 'The Endless Tower', why);
  }

  private hallPoint(dx: number, dz: number): THREE.Vector3 {
    const h = HALL_AT[this.run!.plan.theme];
    return new THREE.Vector3(h.x + dx + 0.5, HALL_Y, h.z + dz + 0.5);
  }

  private enterFloor(): void {
    const r = this.run!;
    const p = r.plan, th = THEMES[p.theme], enc = ENCOUNTERS[p.encounter];
    r.t = 0; r.wave = 0; r.mobs = []; r.boss = null; r.state = 'arrive'; r.wait = 2.5;
    if (r.floor > this.reached()) this.host.setFlag('tower:reached', r.floor);
    const mods = p.modifiers.map((m) => MODIFIERS[m].name).join(', ');
    this.host.travel(this.hallPoint(HALL_ENTRY[0], HALL_ENTRY[1]), Math.PI, `Floor ${r.floor}`, `${th.name} · ${enc.name}${mods ? ' · ' + mods : ''}`);
  }

  /** A foe of the floor, at a spawn point (the k-th), counted with the floor's. */
  private spawn(f: FloorFoe, k: number): Enemy | null {
    const base = ENEMIES[f.type as EnemyType];
    if (!base) return null;
    const r = this.run!;
    const def = towerDef(base, f, r.plan);
    const [sx, sz] = HALL_SPAWNS[k % HALL_SPAWNS.length];
    const at = this.hallPoint(sx + ((k * 3) % 3) - 1, sz);
    const e = new Enemy(def, Math.floor(at.x), Math.floor(at.z), this.host.voxels);
    e.home.copy(at);
    e.pos.copy(at);
    e.questTag = 'tower';
    e.state = 'chase';
    this.host.addEnemy(e);
    return e;
  }

  private spawnWave(): void {
    const r = this.run!;
    const wave = r.plan.waves[r.wave] ?? [];
    r.mobs.push(...wave.map((f, k) => this.spawn(f, k)).filter((e): e is Enemy => !!e));
    if (r.wave === 0 && r.plan.boss) {
      r.boss = this.spawn(r.plan.boss, 1);
      if (r.boss) this.host.banner(r.plan.boss.name!, r.plan.boss.mechanics.join(' · '));
    }
    if (r.plan.waves.length > 1) this.host.system(`Wave ${r.wave + 1} of ${r.plan.waves.length}.`);
  }

  /** A foe of the run fell. */
  onKilled(e: Enemy): void {
    const r = this.run;
    if (!r) return;
    r.mobs = r.mobs.filter((m) => m !== e);
    if (r.boss === e) r.boss = null;
  }

  /** What the tracker says while you climb. */
  objective(): { title: string; lines: string[] } | null {
    const r = this.run;
    if (!r) return null;
    const p = r.plan, enc = ENCOUNTERS[p.encounter];
    const lines = [enc.ask];
    const left = r.mobs.filter((m) => m.alive).length + (r.boss?.alive ? 1 : 0);
    if (p.secs && p.encounter === 'survive') lines.push(`Hold out: ${Math.max(0, Math.ceil(p.secs - r.t))} s`);
    else if (p.secs && p.encounter === 'timed') lines.push(`Sand left: ${Math.max(0, Math.ceil(p.secs - r.t))} s · ${left} left`);
    else lines.push(`${left} left${p.waves.length > 1 ? ` · wave ${Math.min(r.wave + 1, p.waves.length)} of ${p.waves.length}` : ''}`);
    lines.push(`Best: floor ${this.best()}`);
    return { title: `The Endless Tower · floor ${r.floor}`, lines };
  }

  update(dt: number): void {
    this.clock += dt;
    const r = this.run;
    if (!r) return;
    if (this.host.dead()) { this.fall(); return; }
    r.t += dt;
    if (r.state === 'arrive') { if ((r.wait -= dt) <= 0) { r.state = 'fight'; r.t = 0; this.spawnWave(); } return; }
    if (r.state === 'cleared') { if ((r.wait -= dt) <= 0) this.nextFloor(); return; }
    const p = r.plan;
    const left = r.mobs.filter((m) => m.alive).length + (r.boss?.alive ? 1 : 0);
    if (p.encounter === 'timed' && p.secs && r.t > p.secs && left > 0) { this.fall('The sand ran out.'); return; }
    if (p.encounter === 'survive' && p.secs) {
      // Waves come every quarter of the time, held off or not; the stair opens when the time is up
      const due = Math.min(p.waves.length - 1, Math.floor((r.t / p.secs) * p.waves.length));
      while (r.wave < due) { r.wave++; this.spawnWave(); }
      if (r.t >= p.secs) { for (const e of r.mobs) this.host.removeEnemy(e); r.mobs = []; this.cleared(); }
      return;
    }
    if (left > 0) return;
    if (r.wave < p.waves.length - 1) { r.wave++; this.spawnWave(); return; }
    this.cleared();
  }

  private cleared(): void {
    const r = this.run!;
    const n = r.floor, first = n > this.best();
    if (first) this.host.setFlag('tower:best', n);
    r.floorsCleared++;
    this.count();
    r.state = 'cleared'; r.wait = 4;
    const tokens = tokensFor(n, first);
    this.host.reward(Math.round(40 + n * 6), Math.round(5 + n * 1.5), Array<string>(tokens).fill('tower_token'), `Floor ${n} cleared${first ? ', for the first time' : ''}: ${tokens} tower token${tokens > 1 ? 's' : ''}`);
    // A milestone, the first time: more tokens, and at 25 and 100 a cloak
    const ms = first ? MILESTONES[n] : undefined;
    if (ms) { this.host.reward(0, 0, [...Array<string>(ms.tokens).fill('tower_token'), ...ms.items], ms.line); }
    this.host.sfx(n % 10 === 0 ? 'levelUp' : 'discover');
    this.host.banner(`Floor ${n} cleared`, n % 10 === 0 ? `A checkpoint: you can start from floor ${n + 1} now` : 'The stair opens');
  }

  private nextFloor(): void {
    const r = this.run!;
    r.floor++;
    r.plan = towerFloor(r.floor, this.host.partySize());
    this.enterFloor();
  }

  /** You fell, or the sand ran out: the run is over. */
  private fall(why = 'You fell.'): void {
    const r = this.run!;
    this.host.sfx('fail');
    this.host.system(`${why} The run is over: floors ${r.start} to ${r.floor - 1 < r.start ? r.start : r.floor - 1}, ${r.floorsCleared} cleared. Your best is floor ${this.best()}.`);
    this.leave(why);
  }
}
