import * as THREE from 'three';
import * as SK from '../data/skua';
import { Humanoid, type Appearance } from '../entities/humanoid';
import { shipModel, SHIPS } from '../world/ships';
import { SEA } from '../world/terrain';
import type { PropMaterials } from '../world/props';

// Skua Rock, as it's lived (the place: data/skua.ts and world/sites.ts buildSkuaRock; the people:
// data/content/skua.ts). Taken in with a big price on you, you don't go to the town cells: the watch's
// wagon takes you down to Gullmouth's south jetty, and the Charter's boat, the Tern, takes you out to the
// Rock with three other convicts and two guards, all of you in irons on her deck. Then a cell, B 14 on
// Broadway, its door barred from lights-out to morning; by day the yard, the work shed and the stone
// detail in the quarry, where breaking a stint of stone takes a fifth off what's left. Leave the
// prison's ground and the tower shouts you back, with time added.
//
// Or you go out the way Amos Kitto has planned for eleven years: scrape out the vent grille behind your
// bunk (three goes at it, a rest between), take four oilskins off the work shed's lines to make a float,
// then through the vent into the utility corridor, up the ladder to the roof, down the drainpipe and the
// gully to the rocks, and push off for the town in the dark. Nobody's done it. Gullmouth won't forgive
// it: the price goes up by half again and more.
//
// Flags: jail (with rock: true, and `out` while you're on your way off), rockVent (0..3), rockVentAt
// (when you last scraped), rockSkinAt (when you last took an oilskin), rockPlan (Amos has told you),
// rockEscapes, rockStones (the quarry stint's blocks broken).

export interface RockHost {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  props: PropMaterials;
  player: { position: THREE.Vector3; yaw: number; locked: boolean; seat: number; teleport(x: number, y: number, z: number): void };
  look: Appearance;
  setPose(state: 'seated' | 'sit' | 'hammer' | 'idle' | null): void;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  system(text: string): void;
  banner(title: string, sub: string): void;
  sfx(name: string, vol?: number): void;
  say(pos: THREE.Vector3, h: number, text: string): void;
  ground(x: number, z: number, fromY: number): number;
  hudHidden(on: boolean): void;
  hour(): number;
  count(item: string): number;
  give(item: string, n?: number): boolean;
  take(item: string, n?: number): void;
  /** Bar a doorway (two high) and lock the door in it, or open it. */
  lockDoorway(x: number, y: number, z: number, shut: boolean): void;
  setBounty(town: string, n: number): void;
  bounty(town: string): number;
  townName(town: string): string;
}

export interface RockJail { gaol: string; until: number; town: string; bounty: number; rock: true; escaped?: boolean; out?: 'corridor' | 'roof' | 'ledge' }

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The deck's standing height on a cog (as world/ships.ts lofts her), and a bench's seat above it. */
const DECK = SHIPS.cog.deck + 0.17, BENCH = 0.45;
/** Who's aboard the Tern, where on her deck (bow toward +x), and what they say on the way out. */
const ABOARD: { look: Partial<Appearance>; at: [number, number]; seated: boolean; name: string }[] = [
  { name: 'dory', look: { tunic: '#5a5048', trim: '#3a3430', hair: '#c8a060', skin: '#f0cfb0', frame: 'm', facial: 0, build: 0.85, age: 0.1 }, at: [1.0, 1.5], seated: true },
  { name: 'saul', look: { tunic: '#3a3430', trim: '#2a2420', hair: '#2a1e18', skin: '#c89070', frame: 'm', facial: 3, build: 1.25, age: 0.55, scar: true }, at: [-1.2, -1.5], seated: true },
  { name: 'mags', look: { tunic: '#4a4a52', trim: '#2a2a30', hair: '#6a3a2a', skin: '#e0b090', frame: 'f', lashes: true, build: 0.95, age: 0.45 }, at: [1.0, -1.5], seated: true },
  { name: 'guard', look: { tunic: '#2a3a5a', trim: '#c8b070', hat: 'coif', hatColor: '#9aa0a6', cape: '#2a3a5a', frame: 'm', facial: 2, skin: '#d8a882', hair: '#3a2a1e' }, at: [4.4, 0], seated: false },
  { name: 'guard2', look: { tunic: '#2a3a5a', trim: '#c8b070', hat: 'coif', hatColor: '#9aa0a6', frame: 'f', skin: '#c89070', hair: '#1a1410', lashes: true }, at: [-5.0, 0.6], seated: false },
];
const LINES: [number, string, string][] = [
  [2.5, 'guard', 'Sit still. Nobody swims from here, and nobody\'s tried twice.'],
  [7, 'dory', 'That\'s it, isn\'t it. That\'s the Rock. My brother did six years on it.'],
  [10.5, 'saul', 'Your brother talks too much. So do you.'],
  [13.5, 'guard2', 'Eyes down, Brack.'],
  [17, 'mags', 'You can see the town from the yard, they say. Every night. Every lamp in it.'],
  [21.5, 'guard', 'Landing. On your feet when I say, not before.'],
];
/** The player's place on the bench, starboard side aft. */
const SEAT: [number, number] = [-1.2, 1.5];
const OUT_SECS = 25, FLOAT_SECS = 26;

type Boat = { ship: THREE.Group; t: number; dur: number; path: THREE.Vector3[]; cum: number[]; aboard: { h: Humanoid; name: string }[]; said: number; lines: [number, string, string][]; seat: [number, number]; seated: boolean; then: () => void; float: boolean };

export class Rock {
  private boat: Boat | null = null;
  private fade: (on: boolean) => void;
  private work: { kind: 'stone' | 'vent' | 'skin'; t: number; i?: number } | null = null;
  private tick = 0;
  private warned = 0;

  constructor(private host: RockHost, fade: (on: boolean) => void) { this.fade = fade; }

  get busy(): boolean { return !!this.boat; }
  static is(j: unknown): j is RockJail { return !!j && typeof j === 'object' && (j as RockJail).rock === true; }

  // ------------------------------------------------------------------------------- the boat out

  /** Out to the Rock in irons on the Tern; then into B 14. Called when the watch's wagon reaches Gullmouth. */
  sendOut(town: string, bounty: number): void {
    const from = V3(SK.BOAT_FROM.x, SEA - 0.14, SK.BOAT_FROM.z), to = V3(SK.BOAT_TO.x, SEA - 0.14, SK.BOAT_TO.z);
    const ship = shipModel(this.host.props, 'cog', { sails: 'set', hull: '#1e1c1c', wale: '#4a4e56', sail: '#8a8478', trim: '#9aa0a6', flag: '#2a3a5a', name: 'TERN' });
    this.sail([from, to], OUT_SECS, ship, LINES, SEAT, true, false, () => {
      const secs = SK.rockSentence(bounty);
      const c = SK.MY_CELL;
      this.host.player.teleport(c.x + 1.5, c.y, (c.z0 + c.z1) / 2 + 0.5);
      this.host.player.yaw = Math.PI;
      this.host.setFlag('jail', { gaol: 'gaol-skua', until: Date.now() + secs * 1000, town, bounty, rock: true } satisfies RockJail);
      this.host.setFlag('arrests:' + town, Number(this.host.flag('arrests:' + town) ?? 0) + 1);
      this.host.setFlag('rockStones', []);
      this.host.banner('Skua Rock', `B 14, Broadway. ${Math.ceil(secs / 60)} minutes`);
      this.host.system('Your door\'s barred from lights-out to morning. By day you have the yard, the work shed, and the stone detail in the quarry: break a stint of stone and they take time off. Leave the prison\'s ground and the tower will shout you back, with time added.');
    });
  }

  /** A boat (or a float) along a course, people aboard, the camera off her side; `then` when she's in. */
  private sail(path: THREE.Vector3[], dur: number, ship: THREE.Group, lines: [number, string, string][], seat: [number, number], seated: boolean, float: boolean, then: () => void): void {
    this.host.scene.add(ship);
    const aboard: { h: Humanoid; name: string }[] = [];
    if (!float) for (const a of ABOARD) {
      const h = new Humanoid({ ...this.host.look, costume: null, top: 2, lashes: false, hat: undefined, cape: undefined, ...a.look } as Appearance);
      h.setState(a.seated ? 'seated' : 'idle');
      h.root.position.set(a.at[0], DECK + (a.seated ? BENCH - 0.45 : 0), a.at[1]);
      // (seated ones face across the deck; the guards face aft, at the convicts)
      h.root.rotation.y = a.seated ? (a.at[1] > 0 ? Math.PI : 0) : a.at[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
      ship.add(h.root);
      aboard.push({ h, name: a.name });
    }
    if (!float) {
      // The benches along her sides the convicts are chained to
      const M = this.host.props;
      for (const z of [1.5, -1.5]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.5), M.darkWood);
        b.position.set(-0.1, DECK + BENCH - 0.06, z + (z > 0 ? 0.15 : -0.15));
        ship.add(b);
      }
    }
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
    this.boat = { ship, t: 0, dur, path, cum, aboard, said: 0, lines, seat, seated, then, float };
    this.host.player.locked = true;
    this.host.hudHidden(true);
    // (in irons on the bench, or sat on the float with a plank for a paddle)
    this.host.setPose('seated');
    this.host.sfx('bell', 0.5);
    this.place(0);
  }

  private place(dt: number): void {
    const b = this.boat!, S = b.ship;
    const u = Math.min(1, b.t / b.dur), k = u * u * (3 - 2 * u);
    const d = k * b.cum[b.cum.length - 1];
    let i = 1;
    while (i < b.cum.length - 1 && b.cum[i] < d) i++;
    const a = b.path[i - 1], c = b.path[i], f = (d - b.cum[i - 1]) / Math.max(1e-6, b.cum[i] - b.cum[i - 1]);
    S.position.lerpVectors(a, c, f);
    const want = Math.atan2(c.x - a.x, c.z - a.z) - Math.PI / 2;
    const dh = Math.atan2(Math.sin(want - S.rotation.y), Math.cos(want - S.rotation.y));
    S.rotation.y += dt > 0 ? dh * Math.min(1, dt * 0.8) : dh;
    const now = performance.now() / 1000;
    S.position.y = SEA - 0.14 + Math.sin(now * 0.9) * (b.float ? 0.12 : 0.18);
    S.rotation.x = Math.sin(now * 0.7) * (b.float ? 0.06 : 0.035);
    S.rotation.z = Math.sin(now * 0.55 + 1) * (b.float ? 0.05 : 0.025);
    for (const a2 of b.aboard) a2.h.update(dt, 0, false);
    // You: on the bench (in irons), or flat on the float
    const deck = b.float ? 0.25 : DECK + (b.seated ? BENCH - 0.45 : 0);
    const at = S.localToWorld(V3(b.seat[0], deck, b.seat[1]));
    const P = this.host.player;
    P.teleport(at.x, at.y, at.z);
    P.yaw = S.rotation.y + (b.float ? Math.PI / 2 : Math.PI);
    P.seat = b.seated ? BENCH - 0.5 : -0.3;
    // The camera off her quarter, swinging slowly round her as she goes
    const C = this.host.camera, heading = S.rotation.y + Math.PI / 2;
    const side = heading + Math.PI / 2 + (-0.7 + 1.4 * u) * (b.float ? 0.6 : 1);
    const dist = b.float ? 7 : 13;
    C.position.set(S.position.x + Math.sin(side) * dist, S.position.y + (b.float ? 2.6 : 5.5), S.position.z + Math.cos(side) * dist);
    C.lookAt(S.position.x, S.position.y + (b.float ? 0.4 : 2.2), S.position.z);
  }

  /** Each frame while sailing; true while the boat has the player. */
  updateBoat(dt: number): boolean {
    const b = this.boat;
    if (!b) return false;
    b.t += dt;
    this.place(dt);
    while (b.said < b.lines.length && b.t >= b.lines[b.said][0]) {
      const [, who, text] = b.lines[b.said++];
      const h = b.aboard.find((a) => a.name === who)?.h;
      this.host.say(h ? h.root.getWorldPosition(V3(0, 0, 0)) : this.host.player.position.clone(), 2.2, text);
    }
    if (b.t >= b.dur && !(b as { ending?: boolean }).ending) {
      (b as { ending?: boolean }).ending = true;
      this.fade(true);
      setTimeout(() => {
        this.host.scene.remove(b.ship);
        this.boat = null;
        this.host.player.seat = 0;
        this.host.setPose(null);
        this.host.player.locked = false;
        this.host.hudHidden(false);
        b.then();
        setTimeout(() => this.fade(false), 300);
      }, 800);
    }
    return true;
  }

  // ------------------------------------------------------------------------------- on the Rock

  private get jail(): RockJail | null { const j = this.host.flag('jail'); return Rock.is(j) ? j : null; }
  private inCell(p: THREE.Vector3): boolean { const c = SK.MY_CELL; return p.x >= c.x - 0.2 && p.x <= c.x + 2.2 && p.z >= c.z0 - 0.2 && p.z <= c.z1 + 1.2 && Math.abs(p.y - c.y) < 2; }
  private inGrounds(p: THREE.Vector3): boolean {
    const C = SK.CELLHOUSE;
    return p.x >= C.x0 - 4 && p.x <= SK.QUARRY.x1 + 2 && p.z >= SK.SHED.z0 - 3 && p.z <= SK.YARD.z1 + 1 && p.y > SK.QUARRY.floor - 3 && p.y < C.roof;
  }
  private night(): boolean { const h = this.host.hour(); return h >= 21 || h < 6; }
  private toCell(line: string, add = 0): void {
    const j = this.jail;
    if (!j) return;
    this.work = null;
    this.host.setPose(null);
    this.fade(true);
    setTimeout(() => {
      const c = SK.MY_CELL;
      this.host.player.teleport(c.x + 1.5, c.y, (c.z0 + c.z1) / 2 + 0.5);
      if (add) this.host.setFlag('jail', { ...j, until: j.until + add * 1000, out: undefined });
      else if (j.out) this.host.setFlag('jail', { ...j, out: undefined });
      this.fade(false);
      this.host.system(line);
    }, 500);
  }

  /** The routine, once a frame while you're on the Rock (not sailing). */
  update(dt: number, j: RockJail): void {
    const P = this.host.player.position;
    this.tick += dt;
    // The work in hand: hammering stone, scraping at the grille, getting an oilskin off the line unseen
    if (this.work) {
      this.work.t -= dt;
      if (this.work.t <= 0) this.finishWork();
    }
    if (this.tick < 0.5) return;
    this.tick = 0;
    // Your door: barred from lights-out (nine) to six, open by day
    const c = SK.MY_CELL;
    this.host.lockDoorway(c.doorX, c.y, c.doorZ, this.night() && !j.out);
    if (j.out === 'corridor' || j.out === 'ledge') return;
    if (j.out === 'roof') {
      if (P.y < SK.CELLHOUSE.roof - 0.5) this.toCell('Down off the roof and straight into the arms of the night guard. He walks you back to B 14 without a word, and the grille goes back in. Two more minutes on your time.', 120);
      return;
    }
    // In the sea round the Rock: the current, and the guards' boat, and back you come
    if (P.y < SEA + 0.5 && !this.inGrounds(P)) { this.toCell('The current has you before you\'ve gone twenty strokes. The guards\' boat fishes you out, and you\'re walked up the Steps dripping. Two more minutes.', 120); this.host.setFlag('rockVent', 0); return; }
    if (!this.inGrounds(P)) {
      if (performance.now() - this.warned > 4000) { this.warned = performance.now(); this.toCell('"You! Back inside the wall!" The tower has you, and two guards walk you back to your cell. A minute more on your time.', 60); }
      return;
    }
    if (this.night() && !this.inCell(P)) this.toCell('Lights out. A guard walks you back to B 14 and bars the door behind you.');
  }

  private finishWork(): void {
    const w = this.work!, j = this.jail;
    this.work = null;
    this.host.setPose(null);
    if (!j) return;
    if (w.kind === 'stone') {
      const done = [...((this.host.flag('rockStones') as number[] | undefined) ?? []), w.i!];
      if (done.length >= SK.QUARRY_STONES.length) {
        const left = Math.max(0, j.until - Date.now());
        this.host.setFlag('jail', { ...j, until: j.until - left * SK.QUARRY_CUT });
        this.host.setFlag('rockStones', []);
        this.host.sfx('quest', 0.6);
        this.host.system(`A stint of stone broken. The quarry guard marks it in his book: a fifth off what's left. ${mm(Math.ceil(left * (1 - SK.QUARRY_CUT) / 1000))} to go.`);
      } else {
        this.host.setFlag('rockStones', done);
        this.host.sfx('stepStone', 0.8);
        this.host.system(`The block splits along the grain. ${done.length} of ${SK.QUARRY_STONES.length} for the stint.`);
      }
    } else if (w.kind === 'vent') {
      const n = Number(this.host.flag('rockVent') ?? 0) + 1;
      this.host.setFlag('rockVent', n);
      this.host.setFlag('rockVentAt', Date.now());
      this.host.system(n >= SK.VENT_NIGHTS ? 'The last of the mortar comes away in a damp crumble, and the grille lifts out in your hands. Behind it, the dark of the utility corridor, and the smell of the sea.' : `You work the sharpened spoon round the grille's edge until your fingers bleed, and push the bunk back over the dust. ${n} of ${SK.VENT_NIGHTS}.`);
    } else if (w.kind === 'skin') {
      this.host.give('rock_oilskin', 1);
      this.host.setFlag('rockSkinAt', Date.now());
      const n = this.host.count('rock_oilskin');
      this.host.system(n >= SK.OILSKINS ? 'Four oilskins, rolled tight under your shirt in turns. Amos says that\'s enough for a float, sewn and tarred.' : `An oilskin off the line and under your shirt while the guard's looking at the sea. ${n} of ${SK.OILSKINS}.`);
    }
  }

  /** Things to do on the Rock where you stand. */
  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    const j = this.jail;
    if (!j || this.boat || this.work) return out;
    const c = SK.MY_CELL, left = Math.max(0, Math.ceil((j.until - Date.now()) / 1000));
    const plan = !!this.host.flag('rockPlan'), vent = Number(this.host.flag('rockVent') ?? 0);
    const busy = (kind: 'stone' | 'vent' | 'skin', secs: number, pose: 'hammer' | 'sit' | 'idle', line: string, i?: number) => { this.work = { kind, t: secs, i }; this.host.setPose(pose); this.host.system(line); };
    if (!j.out && this.inCell(p)) {
      out.push({ label: `Lie on your bunk (${mm(left)} left)`, pos: V3(c.x + 1.5, c.y + 0.8, (c.z0 + c.z1) / 2 + 0.5), use: () => { this.host.setPose('sit'); this.host.system('You lie back on the bunk and listen to the gulls. The time goes quicker this way.'); } });
      const vp = V3(c.ventX + 0.5, c.y + 0.6, c.ventZ + (c.row === 's' ? 1.0 : 0));
      if (plan && vent < SK.VENT_NIGHTS) {
        const wait = 45_000 - (Date.now() - Number(this.host.flag('rockVentAt') ?? 0));
        out.push({ label: wait > 0 ? `The grille (your hands need ${Math.ceil(wait / 1000)}s)` : `Work at the vent grille (${vent}/${SK.VENT_NIGHTS})`, pos: vp, use: () => { if (wait > 0) { this.host.system('Not yet. The gallery guard comes by every few minutes, and your fingers are raw.'); return; } busy('vent', 10, 'hammer', 'You pull the bunk out from the wall and go at the mortar round the grille with the spoon\'s sharpened handle.'); } });
      }
      if (vent >= SK.VENT_NIGHTS) out.push({ label: 'Go through the vent', pos: vp, use: () => this.intoVent() });
    }
    // The stone detail, by day
    if (!j.out && !this.night()) {
      const done = (this.host.flag('rockStones') as number[] | undefined) ?? [];
      SK.QUARRY_STONES.forEach(([x, z], i) => {
        if (done.includes(i)) return;
        const d = Math.hypot(p.x - x - 0.5, p.z - z - 0.5);
        if (d < 2.2 && Math.abs(p.y - SK.QUARRY.floor) < 2) out.push({ label: `Break stone (${done.length}/${SK.QUARRY_STONES.length})`, pos: V3(x + 0.5, SK.QUARRY.floor + 1.2, z + 0.5), use: () => busy('stone', 4, 'hammer', 'You swing the hammer down on the block. And again.', i) });
      });
      // An oilskin off the line behind the work shed, once Amos has told you what for
      const n = this.host.count('rock_oilskin');
      if (plan && n < SK.OILSKINS) for (const [x, z] of SK.OILSKIN_LINES) {
        const d = Math.hypot(p.x - x, p.z - z);
        if (d > 2.4) continue;
        const wait = 30_000 - (Date.now() - Number(this.host.flag('rockSkinAt') ?? 0));
        out.push({ label: wait > 0 ? 'The oilskins (a guard\'s looking this way)' : `Take an oilskin off the line (${n}/${SK.OILSKINS})`, pos: V3(x, SK.TOP + 1.6, z), use: () => { if (wait > 0) { this.host.system('Not with the yard guard looking straight at you. Wait.'); return; } busy('skin', 3, 'idle', 'You walk along the line as if you were looking for your own, and one of them comes down into your arms.'); } });
        break;
      }
    }
    // The way off
    if (j.out === 'corridor') {
      const L = SK.ESCAPE.ladder;
      if (Math.hypot(p.x - L.x - 0.5, p.z - L.z - 0.5) < 2.4) out.push({ label: 'Climb the ladder to the roof', pos: V3(L.x + 0.5, SK.TOP + 2, L.z + 0.5), use: () => this.ontoRoof() });
      out.push({ label: 'Back to your cell', pos: V3(c.ventX + 0.5, c.y + 0.8, SK.BLOCK.util + 0.5), use: () => this.toCell('You crawl back through the vent and push the grille in after you. Nobody\'s the wiser.') });
    }
    if (j.out === 'roof') {
      const C = SK.CELLHOUSE, cx = C.x1 - 1.5, cz = C.z0 + 1.5;
      if (Math.hypot(p.x - cx, p.z - cz) < 3) out.push({ label: 'Down the drainpipe', pos: V3(cx, C.roof + 1.6, cz), use: () => this.downPipe() });
    }
    if (j.out === 'ledge') {
      const L = SK.ESCAPE.ledge;
      if (Math.hypot(p.x - L.x - 0.5, p.z - L.z - 0.5) < 3) out.push({ label: 'Put the float in the water and push off', pos: V3(L.x + 0.5, p.y + 0.8, L.z + 0.5), use: () => this.pushOff() });
    }
    return out;
  }

  private step(to: [number, number, number], yaw: number, out: RockJail['out'], line: string): void {
    const j = this.jail;
    if (!j) return;
    this.fade(true);
    setTimeout(() => {
      this.host.player.teleport(to[0], to[1], to[2]);
      this.host.player.yaw = yaw;
      this.host.setFlag('jail', { ...j, out });
      this.fade(false);
      this.host.system(line);
    }, 550);
  }

  private intoVent(): void {
    if (this.host.count('rock_oilskin') < SK.OILSKINS) { this.host.system(`The grille's out, but Amos is right: off the Rock you'll need something to float on. Four oilskins, from the lines behind the work shed. You have ${this.host.count('rock_oilskin')}.`); return; }
    const c = SK.MY_CELL;
    this.step([c.ventX + 0.5, SK.TOP, SK.BLOCK.util + 0.5], Math.PI / 2, 'corridor', 'You squeeze through where the grille was, into the dark between the cells. Pipes, dripping; the backs of forty men\'s walls. At the far end, east, a ladder goes up into the black.');
  }
  private ontoRoof(): void {
    const H = SK.ESCAPE.hatch;
    this.host.sfx('doorOpen', 0.5);
    this.step([H.x + 0.5, H.y + 1, H.z + 0.5], Math.PI, 'roof', 'The hatch is rusted at one hinge. You put your shoulder to it, and it gives all at once, and you\'re out on the roof in the wind with the lighthouse going round. The drainpipe is at the north-east corner.');
  }
  private downPipe(): void {
    const L = SK.ESCAPE.ledge, y = this.host.ground(L.x + 0.5, L.z + 0.5, SK.TOP);
    this.step([L.x + 0.5, y, L.z + 0.5], Math.PI, 'ledge', 'Down the pipe hand under hand, over the wall where the tower can\'t see, and down the gully on your backside in a shower of loose stone. The rocks at the bottom are wet and black. You unroll the oilskins and lash them over the driftwood the way Amos said.');
  }

  /** Off the Rock on the float, along the north side and across to the dunes north of Gullmouth. */
  private pushOff(): void {
    const j = this.jail;
    if (!j) return;
    this.host.take('rock_oilskin', SK.OILSKINS);
    const L = SK.ESCAPE.ledge, A = SK.ASHORE;
    const path = [V3(L.x + 0.5, SEA - 0.1, L.z - 4), V3(L.x - 10, SEA - 0.1, SK.SKUA.z - 56), V3(SK.SKUA.x - 110, SEA - 0.1, SK.SKUA.z - 54), V3(A.x + 14, SEA - 0.1, A.z)];
    const M = this.host.props, raft = new THREE.Group();
    for (let i = -1; i <= 1; i++) { const log = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.32), M.bark); log.position.set(0, 0.05, i * 0.36); raft.add(log); }
    const skin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.1), new THREE.MeshLambertMaterial({ color: '#c8a040' }));
    skin.position.y = 0.2; raft.add(skin);
    this.sail(path, FLOAT_SECS, raft, [[4, 'you', 'Paddle. Don\'t look back. Paddle.'], [14, 'you', 'The lamps of the town. Closer.']], [0, 0], false, true, () => {
      const y = this.host.ground(A.x, A.z, 40);
      this.host.player.teleport(A.x, y, A.z);
      this.host.player.yaw = -Math.PI / 2;
      const price = Math.round(j.bounty * 1.5) + 300;
      this.host.setBounty(j.town, price);
      this.host.setFlag('jail', null);
      this.host.setFlag('rockVent', 0);
      this.host.setFlag('rockEscapes', Number(this.host.flag('rockEscapes') ?? 0) + 1);
      this.host.banner('Off the Rock', 'Nobody had done it. Now somebody has.');
      this.host.sfx('discover');
      this.host.system(`You crawl up the sand on your hands and knees and lie there. Behind you the lighthouse goes round. ${this.host.townName(j.town)} wants ${price} marks for you now, and every watch on the coast will know your face by morning.`);
    });
  }

  /** Time served: the Tern brings you back to the south jetty. */
  release(): void {
    const papers = !!this.host.flag('rockPapers');
    this.work = null;
    this.host.setPose(null);
    this.host.setFlag('jail', null);
    this.host.setFlag('rockStones', []);
    this.host.setFlag('rockPapers', null);
    this.fade(true);
    setTimeout(() => {
      const y = this.host.ground(SK.FREED.x, SK.FREED.z, 40);
      this.host.player.teleport(SK.FREED.x, y, SK.FREED.z);
      this.host.player.yaw = Math.PI / 2;
      this.fade(false);
      this.host.banner('Let go', papers ? 'Sergeant Pollard reads the stamp and nothing else' : 'The Tern sets you ashore at Gullmouth. Don\'t come back.');
      this.host.system(pick(['The guard on the jetty hands you back your things in a sack and doesn\'t watch you go.', 'Gullmouth smells of fish and tar and freedom. Mostly fish.']));
    }, 700);
  }
}
