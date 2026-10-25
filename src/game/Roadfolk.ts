import * as THREE from 'three';
import { Appearance, HeldItem, Humanoid } from '../entities/humanoid';
import { characterDetail } from '../entities/lod';
import type { Enemy } from '../entities/Enemy';
import { VoxelWorld } from '../world/VoxelWorld';
import { B, isSolid } from '../world/blocks';
import { GW, heightAt, SEA, WORLD_ROADS } from '../world/terrain';
import { ROADS as VALE_ROADS } from '../world/generate';
import { realmHour, realmNow } from '../world/clock';
import { CreatureModel } from '../entities/creatures';
import { PEDLARS, type Pedlar } from '../data/content/pedlars';

// People on the roads and the watch in the towns, the same for everyone in the realm.
//
// Travellers walk the roads between towns on a timetable: each has a pace and a rest at either end,
// and where they are is worked out from the realm's clock, so every player sees the same carter on
// the same bend. They keep to the right, pass each other, and go in out of sight at each end. At
// night only a few are out.
//
// The watch: guards walk the streets the roads run down, back and forth, and in the bigger towns two
// stand at each way in. They're on the clock too. Anything with teeth that comes within reach of
// one gets a blade in it.
//
// Pedlars walk the long roads the same way, leading a pack pony, and stop when someone comes up to
// deal with them (game/Game.ts opens their pack). A pedlar kept talking falls behind the clock and
// hurries a little after, until they're back where everyone else sees them.
//
// Looks come from a seed, not from chance, for the same reason. Only the ones near the player are
// built (and each keeps its own figure after that: there are only a hundred or so in the realm);
// the rest are just numbers.

type Pt = [number, number];

/** A walk along a line of points, back and forth, from the clock. */
interface Beat {
  line: Pt[];
  lens: number[];
  len: number;
  speed: number;
  /** Seconds resting at each end. */
  rest: number;
  phase: number;
  /** Out of sight while resting (a traveller gone into town), or standing there (a guard). */
  hideAtEnds: boolean;
  /** Which side of the line to keep to, in blocks. */
  side: number;
}

interface Figure {
  id: string;
  kind: 'traveller' | 'guard' | 'post' | 'pedlar';
  /** The town a guard keeps the peace in (data/justice.ts). */
  town?: string;
  /** Sent after someone by the law (game/Justice.ts): running at them instead of walking the beat; then easing back onto it. */
  chasing?: boolean;
  back?: { from: THREE.Vector3; t: number };
  look: Appearance;
  held: HeldItem;
  lines: readonly string[];
  /** Out at night too? */
  night: boolean;
  beat?: Beat;
  /** A gate guard: where they stand and which way they face. */
  post?: { x: number; z: number; yaw: number };
  model?: Humanoid;
  pos: THREE.Vector3;
  yaw: number;
  moving: number;
  shown: boolean;
  chat: number;
  swing: number;
  /** How far aside they've stepped to get round something in the way. */
  dodge: number;
  /** A pedlar: who, the seconds they've stood dealing (behind the clock by that much), and their pony. */
  pedlar?: Pedlar;
  lag: number;
  pony?: CreatureModel;
}

export interface Town { id: string; x: number; z: number; r: number }

const SHOW = 95;
const MAX_BUILT = 18;

/** A small seeded random: the same figure, the same everywhere. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashStr = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

const SKINS = ['#f0cfb0', '#e2b894', '#d8a882', '#c89070', '#b07a52', '#8a5a3a'];
const HAIRS = ['#1e1612', '#3a2418', '#6a4a2a', '#9a948c', '#7a3a1e', '#c8a060', '#2a2a2a'];
const CLOTH = ['#6a4a2a', '#4a5a3a', '#7a6a4a', '#5a3a2a', '#3a4a5a', '#8a7a5a', '#6a3a2a', '#4a3a2a', '#7a5a3a'];

const KINDS: { name: string; lines: string[]; look: (r: () => number) => Partial<Appearance>; held: HeldItem }[] = [
  { name: 'carter', held: 'none', look: (r) => ({ top: 6, apron: r() < 0.5, hat: r() < 0.5 ? 'wide' : 'cap' }), lines: [
    'Two days to Gullmouth with this lot, if the wheel holds.',
    'Toll\'s gone up again at the Waystation. Everything goes up but the pay.',
    'Mind the ruts by the old milestone. Took a wheel off me last spring.',
  ] },
  { name: 'pedlar', held: 'none', look: (r) => ({ top: 3, cape: CLOTH[Math.floor(r() * CLOTH.length)], hat: 'kerchief' }), lines: [
    'Needles, pins, ribbon, a good knife. No? Your loss.',
    'I sold a mirror in Kelderby once. They\'d never seen one. Never again; they argued for a week.',
    'If you see a woman selling buttons in Ansbury, she stole that pitch off me.',
  ] },
  { name: 'drover', held: 'none', look: () => ({ top: 6, hat: 'hood', shoes: 1 }), lines: [
    'Seen a brown ewe with one ear? No? Then I\'ve lost her for good.',
    'Wolves have been bold this year. Took two off me at the ford.',
    'The road\'s better since the Charter paved it. My feet don\'t think so.',
  ] },
  { name: 'pilgrim', held: 'none', look: (r) => ({ top: 2, hat: r() < 0.5 ? 'hood' : 'none', cape: '#8a7a5a' }), lines: [
    'I\'m walking to the Glass Kirk. My mother asked me to, before she died.',
    'They say the light in the Kirk windows shows you where you went wrong. I\'d like to know.',
    'Every mile has a stone on it, if you look. Somebody set them all.',
  ] },
  { name: 'courier', held: 'none', look: () => ({ top: 1, hat: 'cap', cape: '#2a3a6a', shoes: 1 }), lines: [
    'Can\'t stop. Charter post.',
    'If it\'s sealed, I don\'t know what\'s in it. If it isn\'t, I still don\'t.',
    'Gullmouth to Ansbury and back by Friday. Ask me how my knees are.',
  ] },
];

/** Each town's watch: its colours, and what they say to you in passing. */
const WATCH: Record<string, { tunic: string; trim: string; lines: string[] }> = {
  ansbury: { tunic: '#2a4a8a', trim: '#e0bd64', lines: ['Keep your blade in its sheath inside the walls.', 'Charter Hall\'s straight up the avenue. You can\'t miss it; people try.', 'Move along, friend. Nothing to see but me.'] },
  gullmouth: { tunic: '#2a6a6a', trim: '#d8d0b8', lines: ['Mind the harbour steps, they\'re slick at low water.', 'Wrecking\'s a hanging matter here. Just so you know.', 'The light\'s been lit every night for ninety years. Not one missed.'] },
  harrowgate: { tunic: '#8a3a1a', trim: '#2a2a2a', lines: ['Company ground. Mind where you dig.', 'Shift changes on the bell. Stay out of the yard when it goes.', 'If you\'re looking for work, the office is by the gate. If you\'re looking for trouble, I\'m right here.'] },
  hollinford: { tunic: '#4a6a2a', trim: '#c8a060', lines: ['Quiet day. I like a quiet day.', 'If you\'re for the Pit, it\'s up past the smithy.', 'Maud says I\'m to keep an eye on strangers. Consider yourself kept an eye on.'] },
  kelderby: { tunic: '#5a5a6a', trim: '#d8d0c0', lines: ['Wolves came down past the fold last night.', 'Wind\'s got teeth up here. Keep your hood up.'] },
  // Morrow's towns
  callis: { tunic: '#e8e4d8', trim: '#2a3a6a', lines: ['The Assembly keeps the peace in Callis. Help it.', 'Mind the river stairs after dark.', 'If you\'re lost, the plaza\'s south. Everyone is, the first day.'] },
  northgate: { tunic: '#5a5a6a', trim: '#c8c0a8', lines: ['Gate shuts at dusk. Be on the right side of it.', 'The Held\'s quiet. I don\'t like it quiet.'] },
  coldharbour: { tunic: '#3a4a5a', trim: '#d8d0c0', lines: ['Ice in the harbour mouth again.', 'Nobody rows out after dark. Nobody.'] },
  tenwells: { tunic: '#b8862a', trim: '#5a3a1e', lines: ['Water\'s counted here. Don\'t waste it.', 'Reavers were seen on the Flats. Keep inside the wells.'] },
};
const WATCH_ANY = { tunic: '#4a4a5a', trim: '#b8a070', lines: ['Stay on the road after dark.', 'Evening. Keep out of trouble and we\'ll get on.'] };

/** Where a line's points are, a block apart. */
function along(line: Pt[]): { pts: Pt[] } {
  const pts: Pt[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], l = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < l; s += 1) pts.push([ax + ((bx - ax) * s) / l, az + ((bz - az) * s) / l]);
  }
  pts.push(line[line.length - 1]);
  return { pts };
}
function beatOf(line: Pt[], speed: number, rest: number, phase: number, hideAtEnds: boolean, side: number): Beat {
  const lens = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]));
  return { line, lens, len: lens.reduce((a, b) => a + b, 0), speed, rest, phase, hideAtEnds, side };
}

export class Roadfolk {
  private figures: Figure[] = [];
  private chatT = 0;
  private swingT = 0;
  /** The realm clock at the last update: a pedlar's stop is measured on it, as their walk is. */
  private lastT = 0;

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly voxels: VoxelWorld,
    towns: Town[],
    private readonly say: (pos: THREE.Vector3, height: number, text: string) => void,
  ) {
    // Travellers: a few on every road, more on the long ones
    WORLD_ROADS.forEach((road, ri) => {
      const len = beatOf(road, 1, 0, 0, true, 0).len;
      const n = Math.max(2, Math.min(6, Math.round(len / 260)));
      for (let j = 0; j < n; j++) {
        const id = `t${ri}.${j}`, r = seeded(hashStr(id));
        const kind = KINDS[Math.floor(r() * KINDS.length)];
        const speed = 1.4 + r() * 0.6, rest = 40 + r() * 60;
        const period = 2 * (len / speed + rest);
        this.add({
          id, kind: 'traveller', look: this.lookFor(r, kind.look(r)), held: kind.held, lines: kind.lines, night: j % 3 === 0,
          beat: beatOf(road, speed, rest, r() * period, true, 0.9),
        });
      }
    });
    // Pedlars, each on their own road with a pony
    for (const pd of PEDLARS) {
      const road = WORLD_ROADS[pd.road];
      if (!road) continue;
      const len = beatOf(road, 1, 0, 0, true, 0).len, r = seeded(hashStr('pd.' + pd.id));
      const period = 2 * (len / pd.speed + pd.rest);
      this.add({ id: 'pd.' + pd.id, kind: 'pedlar', look: this.lookFor(r, pd.look), held: 'none', lines: pd.hello, night: false, pedlar: pd, beat: beatOf(road, pd.speed, pd.rest, r() * period, false, 0.9) });
    }
    // The watch
    for (const t of towns) {
      const W = WATCH[t.id] ?? WATCH_ANY;
      const uniform = (r: () => number): Partial<Appearance> => ({ tunic: W.tunic, trim: W.trim, shoulderPads: '#8a8e94', hat: 'coif', hatColor: '#9aa0a6', top: 4, trousers: '#3a3a3e', boots: '#2a2420', shoes: 1, gloves: '#4a3a2a', cape: r() < 0.4 ? W.tunic : null });
      // The streets the roads run down, inside the town
      const roads: Pt[][] = t.x < GW && t.z < GW ? (VALE_ROADS as Pt[][]) : WORLD_ROADS;
      const pieces: Pt[][] = [];
      const gates: { x: number; z: number; ox: number; oz: number }[] = [];
      for (const road of roads) {
        const { pts } = along(road);
        let run: Pt[] = [];
        let was = false;
        pts.forEach((p, i) => {
          const inside = Math.hypot(p[0] - t.x, p[1] - t.z) < t.r * 0.9;
          if (inside) run.push(p);
          // Where a road comes in from outside: a way in, for the gate guards
          if (i > 0 && inside !== was) { const q = inside ? p : pts[i - 1]; gates.push({ x: q[0], z: q[1], ox: q[0] - t.x, oz: q[1] - t.z }); }
          if (!inside && run.length) { if (run.length > 12) pieces.push(run); run = []; }
          was = inside;
        });
        if (run.length > 12) pieces.push(run);
      }
      const patrols = pieces.length ? Math.min(t.r > 150 ? 10 : t.r >= 60 ? 4 : t.r >= 40 ? 3 : 1, pieces.length * 2) : 0;
      for (let k = 0; k < patrols; k++) {
        const id = `w.${t.id}.${k}`, r = seeded(hashStr(id));
        const line = pieces[k % pieces.length];
        const len = beatOf(line, 1, 0, 0, false, 0).len;
        const speed = 1.15 + r() * 0.2, rest = 6 + r() * 6;
        this.add({ id, kind: 'guard', town: t.id, look: this.lookFor(r, uniform(r)), held: 'sword', lines: W.lines, night: true, beat: beatOf(line, speed, rest, r() * 2 * (len / speed + rest), false, k % 2 ? 1.2 : -1.2) });
      }
      // Two at each way into a walled-size town
      if (t.r >= 60) gates.forEach((g, gi) => {
        const l = Math.hypot(g.ox, g.oz) || 1, ux = g.ox / l, uz = g.oz / l;
        for (const s of [1, -1]) {
          const id = `g.${t.id}.${gi}.${s}`, r = seeded(hashStr(id));
          this.add({ id, kind: 'post', town: t.id, look: this.lookFor(r, uniform(r)), held: 'sword', lines: W.lines, night: true, post: { x: g.x - uz * 2.4 * s, z: g.z + ux * 2.4 * s, yaw: Math.atan2(ux, uz) } });
        }
      });
    }
  }

  private add(f: Omit<Figure, 'pos' | 'yaw' | 'moving' | 'shown' | 'chat' | 'swing' | 'dodge' | 'lag'>): void {
    this.figures.push({ ...f, pos: new THREE.Vector3(), yaw: 0, moving: 0, shown: false, chat: 0, swing: 0, dodge: 0, lag: 0 });
  }

  private lookFor(r: () => number, over: Partial<Appearance>): Appearance {
    const fem = r() < 0.4, pick = <T>(a: readonly T[]) => a[Math.floor(r() * a.length)];
    return {
      skin: pick(SKINS), hair: pick(HAIRS), hairStyle: Math.floor(r() * 13), eyes: pick(['#3a5a7a', '#4a3a2a', '#3a5a3a', '#5a4a3a']),
      tunic: pick(CLOTH), trim: pick(CLOTH), trousers: pick(CLOTH), boots: '#3a2a1c', frame: fem ? 'f' : 'm', lashes: fem,
      facial: !fem && r() < 0.5 ? 1 + Math.floor(r() * 8) : 0, build: 0.92 + r() * 0.2, height: 0.92 + r() * 0.14, age: r() * 0.7,
      ...over,
    };
  }

  /** Where a beat puts its walker at this moment, or null while they're in out of sight. */
  private place(f: Figure, b: Beat, t: number): boolean {
    const walk = b.len / b.speed, period = 2 * (walk + b.rest);
    let u = (((t - f.lag + b.phase) % period) + period) % period, s: number, dir: number;
    if (u < walk) { s = u * b.speed; dir = 1; }
    else if ((u -= walk) < b.rest) { if (b.hideAtEnds) return false; s = b.len; dir = 0; }
    else if ((u -= b.rest) < walk) { s = b.len - u * b.speed; dir = -1; }
    else { if (b.hideAtEnds) return false; s = 0; dir = 0; }
    let i = 0;
    while (i < b.lens.length - 1 && s > b.lens[i]) { s -= b.lens[i]; i++; }
    const [ax, az] = b.line[i], [bx, bz] = b.line[i + 1], l = b.lens[i] || 1, ux = (bx - ax) / l, uz = (bz - az) / l;
    // Keep to the right of the way you're going
    const side = b.side * (dir < 0 ? -1 : 1);
    f.pos.x = ax + ux * s - uz * side;
    f.pos.z = az + uz * s + ux * side;
    if (dir) { f.yaw = Math.atan2(ux * dir, uz * dir); f.moving = b.speed; } else f.moving = 0;
    // A signpost, a lamp or a well in the way: step aside round it, the same way in every game
    // (it's read off the world, which everyone has the same), easing out and back in
    let want = 0;
    if (dir && this.blocked(f.pos.x + ux * dir * 0.7, f.pos.z + uz * dir * 0.7) || this.blocked(f.pos.x, f.pos.z)) {
      for (const o of [0.9, -0.9, 1.6, -1.6, 2.3]) if (!this.blocked(f.pos.x - uz * o, f.pos.z + ux * o) && !this.blocked(f.pos.x - uz * o + ux * dir * 0.7, f.pos.z + ux * o + uz * dir * 0.7)) { want = o; break; }
    }
    f.dodge += (want - f.dodge) * 0.2;
    f.pos.x -= uz * f.dodge;
    f.pos.z += ux * f.dodge;
    return true;
  }

  /** Something a person would walk round at (x, z): a prop's barrier, or a wall, at standing height. */
  private blocked(x: number, z: number): boolean {
    const ix = Math.floor(x), iz = Math.floor(z);
    if (!this.voxels.isLoaded(ix, iz)) return false;
    const y = this.ground(x, z);
    const a = this.voxels.get(ix, y, iz), b = this.voxels.get(ix, y + 1, iz);
    return a === B.Barrier || b === B.Barrier || (a !== B.Air && a !== B.Water && a !== undefined && isSolid(a));
  }

  /** Standing height: on the road, through any leaves overhead, up onto a bridge over water. */
  private ground(x: number, z: number): number {
    const ix = Math.floor(x), iz = Math.floor(z), vale = ix < GW && iz < GW && ix >= 0 && iz >= 0;
    let y = this.voxels.groundBelow(x, vale ? 40 : heightAt(ix, iz) + 3, z);
    // (through leaves overhead, and never up onto the barrier round a signpost or a lamp)
    while (y > 1 && [B.OakLeaves, B.BirchLeaves, B.PineLeaves, B.Barrier].includes(this.voxels.get(ix, y - 1, iz) as never)) y = this.voxels.groundBelow(x, y - 2, z);
    if (!vale && (y <= SEA || this.voxels.get(ix, y - 1, iz) === B.Water)) y = this.voxels.groundBelow(x, heightAt(ix, iz) + 8, z);
    return y;
  }

  update(dt: number, player: THREE.Vector3, camera: THREE.Vector3, enemies: Enemy[], now: number, paused = false): void {
    const t = realmNow() / 1000, hour = realmHour(), night = hour < 6 || hour >= 21;
    const real = this.lastT ? Math.max(0, Math.min(5, t - this.lastT)) : 0;
    this.lastT = t;
    this.chatT -= dt;
    this.swingT -= dt;
    const near: Figure[] = [];
    for (const f of this.figures) {
      let out = !night || f.night;
      if (f.chasing && this.chaseTo) {
        // After someone: run at them, and stop at arm's length
        const dx = this.chaseTo.x - f.pos.x, dz = this.chaseTo.z - f.pos.z, d = Math.hypot(dx, dz) || 1;
        const step = d > 1.6 ? Math.min(d - 1.6, 5.6 * dt) : 0;
        f.pos.x += (dx / d) * step; f.pos.z += (dz / d) * step;
        f.yaw = Math.atan2(dx, dz);
        f.moving = step > 0 ? 5.6 : 0;
        out = true;
      } else {
        if (out && f.beat) out = this.place(f, f.beat, t);
        else if (out && f.post) { f.pos.x = f.post.x; f.pos.z = f.post.z; f.yaw = f.post.yaw; f.moving = 0; }
        // Back from a chase: ease over to where the beat has them now
        if (f.back) {
          f.back.t += dt / 3;
          if (f.back.t >= 1 || !out) f.back = undefined;
          else { const k = f.back.t; f.pos.x = f.back.from.x + (f.pos.x - f.back.from.x) * k; f.pos.z = f.back.from.z + (f.pos.z - f.back.from.z) * k; f.moving = Math.max(f.moving, 1.2); out = true; }
        }
      }
      const d = Math.hypot(f.pos.x - player.x, f.pos.z - player.z);
      if (f.pedlar) {
        // Someone to deal with: stand and face them (the clock runs on without us); then catch up
        if (out && d < 4.5) { f.lag += real; f.moving = 0; f.yaw = Math.atan2(player.x - f.pos.x, player.z - f.pos.z); }
        else if (f.lag > 0) f.lag = Math.max(0, f.lag - real * 0.35);
      }
      if (!out || d > SHOW || !this.voxels.isLoaded(Math.floor(f.pos.x), Math.floor(f.pos.z))) { this.hide(f); continue; }
      near.push(f);
    }
    // Only the nearest are built
    near.sort((a, b) => Math.hypot(a.pos.x - player.x, a.pos.z - player.z) - Math.hypot(b.pos.x - player.x, b.pos.z - player.z));
    near.slice(MAX_BUILT).forEach((f) => this.hide(f));
    for (const f of near.slice(0, MAX_BUILT)) {
      if (!f.model) { f.model = new Humanoid(f.look); f.model.setHeld(f.held); }
      if (!f.shown) {
        this.scene.add(f.model.root);
        f.pos.y = this.ground(f.pos.x, f.pos.z);
        f.model.root.rotation.y = f.yaw;
      }
      f.shown = true;
      const g = this.ground(f.pos.x, f.pos.z);
      f.pos.y += (g - f.pos.y) * Math.min(1, dt * 10);
      // The watch: anything hostile in reach gets a blade
      f.swing -= dt;
      if (f.kind !== 'traveller' && !paused && f.swing <= 0) {
        const foe = enemies.find((e) => e.alive && !e.def.anchored && e.pos.distanceTo(f.pos) < 3.2);
        if (foe) {
          f.swing = 1.1;
          f.yaw = Math.atan2(foe.pos.x - f.pos.x, foe.pos.z - f.pos.z);
          f.model.setState('attack');
          foe.takeDamage(Math.max(1, Math.round(foe.def.hp * 0.12)), f.pos, now);
        }
      }
      const busy = f.swing > 0.6;
      if (!busy) f.model.setState(f.moving > 4 ? 'run' : f.moving > 0 ? 'walk' : 'idle');
      f.model.update(dt, f.moving);
      f.model.root.position.copy(f.pos);
      if (f.pedlar) this.lead(f, dt);
      let dy = f.yaw - f.model.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      f.model.root.rotation.y += dy * Math.min(1, dt * 6);
      characterDetail(f.model.root, f.pos.distanceTo(camera));
      // A word in passing
      f.chat -= dt;
      if (!paused && f.chat <= 0 && this.chatT <= 0 && f.pos.distanceTo(player) < 4.5) {
        this.say(f.pos, 2.3, f.lines[Math.floor(Math.random() * f.lines.length)]);
        f.chat = 40;
        this.chatT = 8;
      }
    }
  }

  private hide(f: Figure): void {
    if (f.shown && f.model) this.scene.remove(f.model.root);
    if (f.shown && f.pony) this.scene.remove(f.pony.root);
    f.shown = false;
  }

  /** A pedlar's pony: on a short lead, a couple of blocks behind, stopping when they stop. */
  private lead(f: Figure, dt: number): void {
    const pd = f.pedlar!;
    if (!f.pony) {
      f.pony = new CreatureModel('horse', { a: pd.pony.coat, b: pd.pony.mane, c: pd.pony.cloth, breed: 'pack' });
      f.pony.root.scale.setScalar(0.82);
      const back = f.yaw + Math.PI;
      f.pony.root.position.set(f.pos.x + Math.sin(back) * 2.3, f.pos.y, f.pos.z + Math.cos(back) * 2.3);
    }
    if (!f.pony.root.parent) this.scene.add(f.pony.root);
    const pr = f.pony.root.position;
    const dx = f.pos.x - pr.x, dz = f.pos.z - pr.z, d = Math.hypot(dx, dz) || 1;
    // Keep to the end of the lead: close up when they're more than 2.3 away, wait when nearer
    const step = d > 2.3 ? Math.min(d - 2.3, Math.max(f.moving, 1.6) * 1.15 * dt + (d > 5 ? d - 5 : 0)) : 0;
    pr.x += (dx / d) * step;
    pr.z += (dz / d) * step;
    const g = this.ground(pr.x, pr.z);
    pr.y += (g - pr.y) * Math.min(1, dt * 8);
    if (step > 0) {
      let dy = Math.atan2(dx, dz) - f.pony.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      f.pony.root.rotation.y += dy * Math.min(1, dt * 5);
    }
    f.pony.setAnim(step > 0 ? 'walk' : 'idle');
    f.pony.update(dt, step / Math.max(dt, 1e-3));
  }

  private chaseTo: THREE.Vector3 | null = null;

  /** The watch near a point, built and in sight: for the law (game/Justice.ts). */
  guards(p: THREE.Vector3, r: number): { id: string; town: string; pos: THREE.Vector3 }[] {
    const out: { id: string; town: string; pos: THREE.Vector3 }[] = [];
    for (const f of this.figures) if ((f.kind === 'guard' || f.kind === 'post') && f.shown && f.town && f.pos.distanceTo(p) < r) out.push({ id: f.id, town: f.town, pos: f.pos });
    return out;
  }

  /** Sends one of the watch after a point (or calls them all off): the rest keep their beats. */
  chase(id: string | null, target: THREE.Vector3 | null): void {
    this.chaseTo = target ? target.clone() : null;
    for (const f of this.figures) {
      const on = !!id && f.id === id;
      if (f.chasing && !on) f.back = { from: f.pos.clone(), t: 0 };
      f.chasing = on;
    }
  }

  /** One of the watch swings their blade. */
  swing(id: string): void {
    const f = this.figures.find((x) => x.id === id);
    if (f?.model) { f.swing = 1.1; f.model.setState('attack'); }
  }

  /** Pedlars standing within reach of a point: for dealing with, and their name plates. */
  pedlarsNear(p: THREE.Vector3, r: number): { id: string; name: string; title: string; pos: THREE.Vector3; height: number }[] {
    const out: { id: string; name: string; title: string; pos: THREE.Vector3; height: number }[] = [];
    for (const f of this.figures) if (f.pedlar && f.shown && Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < r) out.push({ id: f.pedlar.id, name: f.pedlar.name, title: f.pedlar.title, pos: f.pos, height: f.look.height ?? 1 });
    return out;
  }

  /** Say something from a pedlar (their greeting when you open their pack). */
  pedlarSay(id: string): void {
    const f = this.figures.find((x) => x.pedlar?.id === id);
    if (f) { this.say(f.pos, 2.3, f.lines[Math.floor(Math.random() * f.lines.length)]); f.chat = 40; }
  }

  /** How many are out on the realm's clock right now, and how many are built near you. */
  get counts(): { all: number; shown: number } { return { all: this.figures.length, shown: this.figures.filter((f) => f.shown).length }; }
}
