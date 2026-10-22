import * as THREE from 'three';
import { ESCORTS, EscortDef } from '../data/escorts';
import { EnemyDef, ENEMIES } from '../data/gameplay';
import type { Henchman } from '../data/dungeons';
import { Ally } from '../entities/Ally';
import { B } from '../world/blocks';
import type { Enemy, EnemyContext } from '../entities/Enemy';
import type { MapMarker } from '../ui/Hud';
import type { ActivityHost, EventPanel } from './Activities';

// Escorts (data/escorts.ts) as they happen: the walker waits at the start; press E to set off with
// them. They walk the road at their own pace, stop while creatures are near and wait if you fall
// behind. Ambushers go for the walker until you hit them; then they're yours.

const SPEED = 2.6;
/** What an ambusher can't be set down on (a canopy, a roof, the water). */
const NOT_GROUND = new Set<number>([B.Water, B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.OakLog, B.BirchLog, B.PineLog, B.Planks, B.DarkPlanks, B.Thatch, B.Barrier]);
/** How far behind you can fall before they stop and wait for you. */
const WAIT = 22;

interface Live {
  def: EscortDef;
  walker: Ally;
  state: 'waiting' | 'walking' | 'done' | 'down';
  /** The route point they're walking to. */
  leg: number;
  sprung: Set<number>;
  ambushers: Enemy[];
  /** Seconds left before they go back to the start (after an end) and talked-to markers. */
  restLeft: number;
  asked: boolean;
  hurtSaid: boolean;
  waitSaid: number;
}

export class Escorts {
  private live = new Map<string, Live>();
  /** Ambushers the player has hit: they leave the walker alone. */
  private struck = new WeakSet<Enemy>();
  private clock = 0;

  constructor(private host: ActivityHost, private spawn: (def: EnemyDef, x: number, z: number) => Enemy) {}

  private hench(def: EscortDef): Henchman {
    return { id: def.id, name: def.who.name, title: def.who.title, role: 'damage', look: def.who.look, held: def.who.held, barks: { pull: [], low: [], kill: [], down: '', up: '' } };
  }

  update(dt: number, P: THREE.Vector3): void {
    this.clock += dt;
    for (const def of ESCORTS) {
      const [sx, sz] = def.route[0];
      let l = this.live.get(def.id);
      const near = Math.hypot(P.x - sx, P.z - sz) < 70;
      if (!l) {
        if (!near || !this.host.voxels.isLoaded(sx, sz) || (Number(this.host.flag('escortRest:' + def.id) ?? 0) > Date.now())) continue;
        const walker = new Ally(this.hench(def), Math.max(1, this.host.level?.() ?? 1), this.host.voxels);
        walker.place(sx + 0.5, this.host.voxels.groundBelow(sx + 0.5, 140, sz + 0.5), sz + 0.5);
        walker.face(def.route[1][0], def.route[1][1]);
        this.host.scene.add(walker.model.root);
        l = { def, walker, state: 'waiting', leg: 1, sprung: new Set(), ambushers: [], restLeft: 0, asked: false, hurtSaid: false, waitSaid: -99 };
        this.live.set(def.id, l);
      }
      const w = l.walker;
      const far = Math.hypot(P.x - w.pos.x, P.z - w.pos.z);
      // Put away when nobody is about (a walk abandoned counts as gone home)
      if (far > 120 || (l.state === 'waiting' && !near)) { this.close(l); continue; }
      let moving = 0;
      if (l.state === 'waiting') {
        if (far < 9 && !l.asked) { l.asked = true; w.face(P.x, P.z); this.host.say?.(def.who.name, def.lines.ask, w.bubble); }
        if (far > 16) l.asked = false;
      } else if (l.state === 'walking') {
        if (!this.host.alive()) { this.fail(l); continue; }
        // Creatures jump out as they reach each ambush point
        for (const [i, a] of def.ambush.entries()) {
          if (l.sprung.has(i) || l.leg <= a.at) continue;
          l.sprung.add(i);
          this.ambush(l, a.type, a.count);
          this.host.say?.(def.who.name, def.lines.ambush[i % def.lines.ambush.length], w.bubble);
        }
        l.ambushers = l.ambushers.filter((e) => e.alive);
        const danger = l.ambushers.some((e) => e.pos.distanceTo(w.pos) < 18);
        const behind = far > WAIT;
        if (behind && !danger && this.clock - l.waitSaid > 20) { l.waitSaid = this.clock; this.host.say?.(def.who.name, def.lines.wait, w.bubble); }
        if (!danger && !behind) {
          const [tx, tz] = def.route[l.leg];
          const before = w.pos.clone();
          if (Math.hypot(tx + 0.5 - w.pos.x, tz + 0.5 - w.pos.z) < 1.5) {
            l.leg++;
            if (l.leg >= def.route.length) { this.arrive(l); continue; }
          } else if (!w.stepToward(tx + 0.5, tz + 0.5, SPEED, dt)) {
            // Something in the way: a small hop past it rather than standing there
            w.place(w.pos.x + Math.sin(w.yaw) * 0.6, w.pos.y + 1.1, w.pos.z + Math.cos(w.yaw) * 0.6);
          }
          moving = before.distanceTo(w.pos) / Math.max(dt, 1e-3);
        } else if (danger) {
          const t = l.ambushers.reduce((a, b) => (a.pos.distanceTo(w.pos) < b.pos.distanceTo(w.pos) ? a : b));
          w.face(t.pos.x, t.pos.z);
        } else w.face(P.x, P.z);
        if (!l.hurtSaid && w.hp < w.max * 0.4) { l.hurtSaid = true; this.host.say?.(def.who.name, def.lines.hurt, w.bubble); }
        if (w.down) { this.fail(l); continue; }
      } else {
        if ((l.restLeft -= dt) <= 0) { this.close(l); continue; }
      }
      w.update(dt, moving);
    }
  }

  private ambush(l: Live, type: keyof typeof ENEMIES, count: number): void {
    const w = l.walker, def = l.def;
    // From the roadside ahead of them, a little either side
    const [tx, tz] = def.route[Math.min(l.leg, def.route.length - 1)];
    const dir = new THREE.Vector2(tx - w.pos.x, tz - w.pos.z).normalize();
    const V = this.host.voxels;
    for (let i = 0; i < count; i++) {
      let x = 0, z = 0;
      for (let k = 0; k < 12; k++) {
        const side = (i % 2 ? 1 : -1) * (3 + Math.random() * 5);
        const ahead = 11 + Math.random() * 6;
        x = w.pos.x + dir.x * ahead - dir.y * side; z = w.pos.z + dir.y * ahead + dir.x * side;
        const y = V.topSolid(Math.floor(x), Math.floor(z));
        if (y >= 0 && !NOT_GROUND.has(V.get(Math.floor(x), y, Math.floor(z)))) break;
      }
      const e = this.spawn(ENEMIES[type], x, z);
      e.questTag = 'escort:' + def.id;
      e.respawnIn = Infinity;
      e.state = 'chase';
      l.ambushers.push(e);
    }
  }

  private arrive(l: Live): void {
    const def = l.def;
    l.state = 'done';
    l.restLeft = 20;
    this.host.say?.(def.who.name, def.lines.end, l.walker.bubble);
    this.host.reward(def.xp, def.marks, def.loot, `${def.name}: ${def.who.name} got to ${def.to}`);
    this.host.banner('Escort complete', def.name);
    this.host.sound('levelUp');
    this.host.daily?.('event');
    this.host.setFlag('escortRest:' + def.id, Date.now() + def.rest * 1000);
    this.host.setFlag('escorted:' + def.id, Number(this.host.flag('escorted:' + def.id) ?? 0) + 1);
  }

  private fail(l: Live): void {
    l.state = 'down';
    l.restLeft = 8;
    this.host.system(l.def.lines.fail);
    this.host.banner('Escort failed', l.def.name);
    this.host.setFlag('escortRest:' + l.def.id, Date.now() + 60 * 1000);
    const gone = l.ambushers;
    l.ambushers = [];
    setTimeout(() => { for (const e of gone) this.host.removeEnemy(e); }, 8000);
  }

  private close(l: Live): void {
    this.host.scene.remove(l.walker.model.root);
    for (const e of l.ambushers) this.host.removeEnemy(e);
    this.live.delete(l.def.id);
  }

  /** "Walk with Tam to the Waystation" while they wait. */
  candidates(P: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    for (const l of this.live.values()) {
      if (l.state !== 'waiting' || l.walker.pos.distanceTo(P) > 3) continue;
      out.push({ label: `Walk with ${l.def.who.name.split(' ')[0]} to ${l.def.to}`, pos: l.walker.pos.clone().setY(l.walker.pos.y + 2.2), use: () => this.start(l) });
    }
    return out;
  }

  private start(l: Live): void {
    if (l.state !== 'waiting') return;
    l.state = 'walking';
    this.host.say?.(l.def.who.name, l.def.lines.start, l.walker.bubble);
    this.host.sound('open');
  }

  /** A creature the player hits stops going for the walker. */
  onPlayerHit(e: Enemy): void { if (e.questTag?.startsWith('escort:')) this.struck.add(e); }

  onKilled(e: Enemy): void {
    if (!e.questTag?.startsWith('escort:')) return;
    setTimeout(() => this.host.removeEnemy(e), 6000);
  }

  /** The context an ambusher fights in: the walker, until the player has hit it. */
  ctxFor(e: Enemy, base: EnemyContext): EnemyContext | null {
    if (!e.questTag?.startsWith('escort:') || this.struck.has(e)) return null;
    const l = this.live.get(e.questTag.slice(7));
    if (!l || l.state !== 'walking' || l.walker.down) return null;
    const w = l.walker;
    return {
      player: w.pos, playerAlive: true, playerInvulnerable: false, playerSwimming: false, level: base.level, sound: base.sound,
      hitPlayer: (d) => { w.hurt(d * (0.9 + Math.random() * 0.2)); },
    };
  }

  bubbleAt(id: number): THREE.Vector3 | null {
    for (const l of this.live.values()) if (l.walker.bubble === id) return l.walker.pos.clone().setY(l.walker.pos.y + 0.3);
    return null;
  }

  panel(P: THREE.Vector3): EventPanel | null {
    for (const l of this.live.values()) {
      if (l.state !== 'walking' || l.walker.pos.distanceTo(P) > 60) continue;
      const w = l.walker;
      return { kind: 'escort', title: l.def.name, goal: `Keep ${l.def.who.name} safe to ${l.def.to}.`, progress: (l.leg - 1) / (l.def.route.length - 1), count: `${Math.round((w.hp / w.max) * 100)}% health` };
    }
    return null;
  }

  markers(): MapMarker[] {
    const out: MapMarker[] = [];
    for (const def of ESCORTS) out.push({ x: def.route[0][0], z: def.route[0][1], kind: 'task', label: `${def.name}: ${def.who.name}` });
    for (const l of this.live.values()) if (l.state === 'walking') out.push({ x: l.walker.pos.x, z: l.walker.pos.z, kind: 'ally', label: l.def.who.name });
    return out;
  }
}
