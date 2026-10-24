import * as THREE from 'three';
import { CRIME, DECAY_PER_MIN, FIXER_CUT, GAOL, GAOLS, HEAT, JURISDICTIONS, jurisdictionAt, REFUGE, REFUGES, sentence, type GaolDef, type Jurisdiction } from '../data/justice';
import { mountModel, type CreatureModel } from '../entities/creatures';
import { Humanoid, type Appearance } from '../entities/humanoid';
import { WAGON_BENCH, WAGON_ROWS } from '../entities/voxmounts';
import { heightAt } from '../world/terrain';
import { ROCK_PRICE, rockSentence } from '../data/skua';
import type { PropMaterials } from '../world/props';
import { Rock } from './Rock';

/** Standing height out in a town: the ground, not a roof over it. */
const street = (x: number, z: number) => heightAt(Math.floor(x), Math.floor(z)) + 3;

// The law at work (the rules and places are in data/justice.ts). A strike in town that anyone sees
// puts a price on you in that town's book; its watch remembers your face from then on. A small price
// gets a warning; a bigger one, a guard comes to take you in, and you pay, go quietly, or run; a big
// one, or a blow at the watch, and they come with blades out until you drop. Going quietly, or
// dropping, the watch's wagon takes you to the gaol: you sit out your time in a cell (quicker picking
// oakum, quicker still lying on the plank bed), or pick the lock and slip out with a worse price.
// Prices fade while you keep out of trouble; a fixer in a refuge clears every book at once.
//
// Prices are flags (bounty:<town>), a sentence is flag jail, arrests are counted per town
// (arrests:<town>): the watch of a town where you've been taken in before knows you.

export interface GuardRef { id: string; town: string; pos: THREE.Vector3 }

export interface JusticeHost {
  /** A crime done where your companion could see it. */
  noticed?(): void;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: { position: THREE.Vector3; yaw: number; locked: boolean; seat: number; teleport(x: number, y: number, z: number): void };
  setPose(state: 'seated' | 'sit' | 'hammer' | 'idle' | null): void;
  look: Appearance;
  marks(): number;
  spend(n: number): void;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  system(text: string): void;
  banner(title: string, sub: string): void;
  sfx(name: string, vol?: number): void;
  say(pos: THREE.Vector3, h: number, text: string): void;
  hp(): [number, number];
  hurt(n: number, from: THREE.Vector3): void;
  /** The watch near a point (built ones only), and making one of them run at you, or stop. */
  guards(p: THREE.Vector3, r: number): GuardRef[];
  chase(id: string | null, target: THREE.Vector3 | null): void;
  swing(id: string): void;
  /** Townsfolk and named people near a point who'd see a blow struck. */
  witnesses(p: THREE.Vector3, r: number): number;
  ground(x: number, z: number, fromY: number): number;
  dismount(): void;
  hudHidden(on: boolean): void;
  lockpick(): Promise<boolean>;
  busy(): boolean;
  /** For Skua Rock (game/Rock.ts): the ship and its people, the hour, the oilskins, a cell door. */
  props: PropMaterials;
  hour(): number;
  count(item: string): number;
  give(item: string, n?: number): boolean;
  take(item: string, n?: number): void;
  lockDoorway(x: number, y: number, z: number, shut: boolean): void;
}

const WATCH_SAYS = {
  warn: ['Watch yourself. I saw that.', 'Do that again and we\'ll talk.', 'You\'re on the book now. Keep it small.'],
  known: ['I know your face. Behave.', 'You again. Hands where I can see them.', 'Not looking for trouble, are we?'],
  halt: ['You there! Stop!', 'Stop where you are!', 'In the name of the watch, stop!'],
  blades: ['That\'s the one. Take them!', 'Blades out!', 'Don\'t let them run!'],
};
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

type Arrest = { j: Jurisdiction; guard: string; mode: 'take' | 'blades'; panel: boolean; t: number; lost: number };
type Ride = { gaol: GaolDef; t: number; wagon: CreatureModel; driver: Humanoid; yaw: number; from: THREE.Vector3; secs: number; town: string; bounty: number; rock: boolean };
interface Jail { gaol: string; until: number; town: string; bounty: number; escaped?: boolean }

export class Justice {
  private arrest: Arrest | null = null;
  private ride: Ride | null = null;
  private tick = 0;
  private spoke = new Map<string, number>();
  private badge: HTMLDivElement | null = null;
  private panel: HTMLDivElement | null = null;
  private fade: HTMLDivElement | null = null;
  private oakum = 0;
  private resting = false;
  private picking = false;
  /** Skua Rock, for the worst: the boat out, the routine, the way off. */
  readonly rock: Rock;

  constructor(private host: JusticeHost) {
    this.rock = new Rock({
      ...host, player: host.player, look: host.look,
      setBounty: (t, n) => this.setBounty(t, n), bounty: (t) => this.bounty(t),
      townName: (t) => JURISDICTIONS.find((j) => j.id === t)?.name ?? 'The town',
    }, (on) => this.blackout(on));
  }

  // ------------------------------------------------------------------------------------------ books

  bounty(town: string): number { return Math.round(Number(this.host.flag('bounty:' + town) ?? 0)); }
  private setBounty(town: string, n: number): void { this.host.setFlag('bounty:' + town, Math.max(0, n)); }
  /** Every town's price on you, largest first. */
  prices(): { j: Jurisdiction; n: number }[] { return JURISDICTIONS.map((j) => ({ j, n: this.bounty(j.id) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n); }
  get total(): number { return this.prices().reduce((a, b) => a + b.n, 0); }
  /** What a fixer charges to clear every book. */
  get fixerPrice(): number { return Math.round(this.total * (1 + FIXER_CUT)); }
  /** A fixer clears every book (the fee is paid by the caller). */
  clearAll(): void {
    for (const j of JURISDICTIONS) this.setBounty(j.id, 0);
    if (this.arrest) this.endArrest();
  }
  private get jail(): Jail | null { return (this.host.flag('jail') as Jail | undefined) ?? null; }
  get jailed(): boolean { return !!this.jail && !this.jail.escaped; }
  /** Busy with the law (being taken in, in the wagon): the game holds other things back. */
  get busy(): boolean { return !!this.ride || !!this.arrest?.panel || this.rock.busy; }

  // ----------------------------------------------------------------------------------------- crimes

  /**
   * A blow struck at `at`: a town beast (its kind), a townsperson, or one of the watch. Seen by
   * anyone, it goes in that town's book.
   */
  crime(kind: 'beast' | 'assault' | 'guard', at: THREE.Vector3, what?: string, guardId?: string): void {
    const j = jurisdictionAt(at.x, at.z);
    if (!j || this.ride || this.jailed) return;
    // Your companion sees it, whoever else does (game/Companions.ts)
    this.host.noticed?.();
    const price = kind === 'beast' ? CRIME.beast[what ?? ''] ?? 40 : kind === 'assault' ? CRIME.assault : CRIME.guard;
    const seen = kind === 'guard' || this.host.guards(at, 26).some((g) => g.town === j.id) || this.host.witnesses(at, 18) > 0;
    if (!seen) { this.host.system('Nobody saw that.'); return; }
    const was = this.bounty(j.id);
    this.setBounty(j.id, was + price);
    const now = this.bounty(j.id);
    this.host.system(`${j.name} puts ${price} marks on your head: ${now} in all. ${j.watch[0].toUpperCase() + j.watch.slice(1)} will know your face.`);
    this.host.sfx('fail', 0.6);
    if (kind === 'guard') { this.startArrest(j, guardId ?? null, 'blades'); return; }
    if (this.arrest) { if (now >= HEAT.onSight) this.arrest.mode = 'blades'; return; }
    if (now >= HEAT.arrest) this.startArrest(j, null, now >= HEAT.onSight ? 'blades' : 'take');
  }

  // ---------------------------------------------------------------------------------------- the watch

  private startArrest(j: Jurisdiction, guard: string | null, mode: 'take' | 'blades'): void {
    const P = this.host.player.position;
    const g = guard ? this.host.guards(P, 60).find((x) => x.id === guard) : this.host.guards(P, 30).filter((x) => x.town === j.id).sort((a, b) => a.pos.distanceTo(P) - b.pos.distanceTo(P))[0];
    if (!g) return;
    this.arrest = { j, guard: g.id, mode, panel: false, t: 0, lost: 0 };
    this.host.chase(g.id, P);
    this.host.say(g.pos, 2.3, pick(mode === 'blades' ? WATCH_SAYS.blades : WATCH_SAYS.halt));
    this.host.banner(mode === 'blades' ? 'The watch is coming for you' : 'The watch wants a word', `${j.name}: ${this.bounty(j.id)} marks on your head`);
  }

  private endArrest(): void {
    this.host.chase(null, null);
    this.closePanel();
    this.host.player.locked = false;
    this.arrest = null;
  }

  update(dt: number): void {
    const P = this.host.player.position;
    this.tick += dt;
    if (this.ride) { this.updateRide(dt); this.updateBadge(); return; }
    if (this.rock.updateBoat(dt)) { this.updateBadge(); return; }
    const jail = this.jail;
    if (jail && !jail.escaped && Rock.is(jail)) {
      this.rock.update(dt, jail);
      // (time served, or a release in the warden's hand from Mags Tregear: data/content/skua.ts)
      if ((Date.now() >= jail.until || this.host.flag('rockPapers')) && !jail.out) this.rock.release();
      this.updateBadge();
      return;
    }
    if (jail && !jail.escaped) { this.updateJail(dt, jail); this.updateBadge(); return; }
    // Prices fade, once a second; time away counts too, as in ESO (half the rate, and the books never
    // forget more than a day's worth at once)
    if (this.tick >= 1) {
      const seen = Number(this.host.flag('lawSeen') ?? 0), now = Date.now();
      const away = seen ? Math.min(24 * 60, Math.max(0, (now - seen) / 60000 - 1)) * 0.5 : 0;
      this.host.setFlag('lawSeen', now);
      const fade = (DECAY_PER_MIN / 60) * this.tick + DECAY_PER_MIN * away;
      for (const j of JURISDICTIONS) {
        const n = Number(this.host.flag('bounty:' + j.id) ?? 0);
        if (n > 0 && this.arrest?.j.id !== j.id) this.setBounty(j.id, n - fade < 0.5 ? 0 : n - fade);
      }
      this.tick = 0;
      if (jail?.escaped && this.total === 0) this.host.setFlag('jail', null);
    }
    if (this.arrest) this.updateArrest(dt);
    else if (!this.host.busy()) this.watchLooks(P);
    this.updateBadge();
  }

  /** The watch about town: a word for someone with a small price or a record, or a guard sent after a bigger one. */
  private watchLooks(P: THREE.Vector3): void {
    const j = jurisdictionAt(P.x, P.z);
    if (!j) return;
    const n = this.bounty(j.id), known = Number(this.host.flag('arrests:' + j.id) ?? 0) > 0;
    for (const g of this.host.guards(P, 14)) {
      if (g.town !== j.id) continue;
      const d = g.pos.distanceTo(P);
      if (n >= HEAT.arrest) { this.startArrest(j, g.id, n >= HEAT.onSight ? 'blades' : 'take'); return; }
      const last = this.spoke.get(g.id) ?? -999;
      if (d < 6 && performance.now() / 1000 - last > 60 && (n >= HEAT.warn || known)) {
        this.spoke.set(g.id, performance.now() / 1000);
        this.host.say(g.pos, 2.3, pick(n >= HEAT.warn ? WATCH_SAYS.warn : WATCH_SAYS.known));
      }
    }
  }

  private updateArrest(dt: number): void {
    const a = this.arrest!, P = this.host.player.position;
    a.t += dt;
    const g = this.host.guards(P, 80).find((x) => x.id === a.guard);
    // Lost them: out of the town's reach, or the guard out of sight behind you
    const out = Math.hypot(P.x - a.j.x, P.z - a.j.z) > a.j.r * 1.3;
    if (!g || out || g.pos.distanceTo(P) > 42) {
      a.lost += dt;
      if (a.lost > 1.5 || out) {
        this.host.system(`You've lost them. ${a.j.name} still wants ${this.bounty(a.j.id)} marks, and its watch knows your face.`);
        this.endArrest();
      }
      return;
    }
    a.lost = 0;
    this.host.chase(a.guard, P);
    const d = g.pos.distanceTo(P);
    if (a.mode === 'take') {
      if (d < 2.4 && !a.panel && !this.host.busy()) this.openPanel(g);
      return;
    }
    // Blades out: a blow every second and a bit while they're on you, until you drop or get away
    if (d < 2.6 && a.t > 1.2) {
      a.t = 0;
      this.host.swing(a.guard);
      const [hp, max] = this.host.hp();
      this.host.hurt(Math.max(1, Math.round(max * 0.09)), g.pos);
      if (hp - max * 0.09 < max * 0.2) {
        this.host.system('The watch beats you down and puts the irons on you.');
        this.takeIn(a.j, 1.5);
      }
    }
  }

  private openPanel(g: GuardRef): void {
    const a = this.arrest!, n = this.bounty(a.j.id), can = this.host.marks() >= n;
    a.panel = true;
    this.host.player.locked = true;
    this.host.sfx('open', 0.6);
    const el = document.createElement('div');
    el.id = 'arrestpanel';
    el.innerHTML = `<b>${a.j.watch[0].toUpperCase() + a.j.watch.slice(1)}, ${a.j.name}</b>
      <p>"You're on the book for ${n} marks. Pay it here and now, or you're coming with me."</p>
      <div class="ap-btns"><button class="btn" data-pay${can ? '' : ' disabled'}>Pay ${n} marks</button><button class="btn" data-go>Go quietly</button><button class="btn ghost" data-run>Run</button></div>
      <i>${n >= ROCK_PRICE ? `Going quietly, at that price: Skua Rock, the Charter's prison out in the bay, for about ${Math.ceil(rockSentence(n) / 60)} minutes` : `Going quietly: about ${Math.ceil(sentence(n) / 60)} minute${sentence(n) > 60 ? 's' : ''} in the cells`}, and the price is gone. Running adds ${CRIME.resist} marks.</i>`;
    document.body.appendChild(el);
    this.panel = el;
    el.querySelector('[data-pay]')!.addEventListener('click', () => {
      if (this.host.marks() < n) return;
      this.host.spend(n);
      this.setBounty(a.j.id, 0);
      this.host.sfx('coin');
      this.host.say(g.pos, 2.3, 'Paid in full. Keep it that way.');
      this.endArrest();
    });
    el.querySelector('[data-go]')!.addEventListener('click', () => { this.closePanel(); this.takeIn(a.j, 1); });
    el.querySelector('[data-run]')!.addEventListener('click', () => {
      this.closePanel();
      this.host.player.locked = false;
      this.setBounty(a.j.id, n + CRIME.resist);
      a.mode = 'blades'; a.panel = false; a.t = 0;
      this.host.say(g.pos, 2.3, pick(WATCH_SAYS.blades));
    });
  }

  private closePanel(): void { this.panel?.remove(); this.panel = null; }

  // ------------------------------------------------------------------------------- the wagon, the gaol

  /** Taken in: the watch's wagon comes, you go in the back, and it takes you to the gaol. */
  private takeIn(j: Jurisdiction, longer: number): void {
    const gaol = GAOLS.find((x) => x.id === j.gaol) ?? GAOLS[0];
    const bounty = this.bounty(j.id);
    this.host.chase(null, null);
    this.closePanel();
    this.arrest = null;
    if (!gaol) { this.setBounty(j.id, 0); return; }
    this.host.dismount();
    const P = this.host.player.position, yaw = this.host.player.yaw;
    // The wagon draws up beside you, facing the way you were going
    const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(2.6);
    const at = P.clone().add(side);
    at.y = this.host.ground(at.x, at.z, P.y + 3);
    const wagon = mountModel({ coat: '#141214', mane: '#0a0a0a', cloth: '#2a3a5a', seats: 5, wagon: { kind: 'cage', bed: 0, paint: '#2a2a30' } });
    wagon.root.position.copy(at);
    wagon.root.rotation.y = yaw;
    this.host.scene.add(wagon.root);
    const driver = new Humanoid({ ...this.host.look, costume: null, tunic: '#2a3a5a', trim: '#c8b070', hat: 'coif', hatColor: '#9aa0a6', top: 4, cape: '#2a3a5a', facial: 2, frame: 'm', lashes: false, hair: '#3a2a1e', skin: '#d8a882' } as Appearance);
    driver.setState('seated');
    this.host.scene.add(driver.root);
    this.ride = { gaol, t: 0, wagon, driver, yaw, from: at.clone(), secs: Math.round(sentence(bounty) * longer), town: j.id, bounty, rock: bounty >= ROCK_PRICE };
    this.host.player.locked = true;
    this.host.hudHidden(true);
    this.host.setPose('seated');
    this.host.sfx('doorShut', 0.8);
  }

  private updateRide(dt: number): void {
    const r = this.ride!;
    r.t += dt;
    const W = r.wagon.root, fwd = new THREE.Vector3(Math.sin(r.yaw), 0, Math.cos(r.yaw));
    // Rolling off after a moment, slow, along the way it faces
    const go = Math.max(0, r.t - 1.2), dist = go * go * 0.8 + go * 1.2;
    W.position.copy(r.from).addScaledVector(fwd, dist);
    W.position.y = this.host.ground(W.position.x, W.position.z, W.position.y + 2);
    r.wagon.setAnim(go > 0 ? 'walk' : 'idle');
    r.wagon.update(dt, go > 0 ? 1.2 + go * 1.6 : 0);
    const seat = W.position.clone().addScaledVector(fwd, -WAGON_ROWS[0]).add(new THREE.Vector3(Math.cos(r.yaw), 0, -Math.sin(r.yaw)).multiplyScalar(0.34));
    this.host.player.teleport(seat.x, seat.y, seat.z);
    this.host.player.yaw = r.yaw;
    this.host.player.seat = WAGON_BENCH - 0.5;
    r.driver.root.position.copy(W.position).setY(W.position.y + 0.88);
    r.driver.root.rotation.y = r.yaw;
    r.driver.update(dt, 0, false);
    // The camera off to the side, following
    const C = this.host.camera, sideV = new THREE.Vector3(Math.cos(r.yaw), 0, -Math.sin(r.yaw));
    C.position.copy(W.position).addScaledVector(sideV, 7.5).addScaledVector(fwd, 2.5 - Math.min(2, r.t * 0.3)).setY(W.position.y + 3.4);
    C.lookAt(W.position.x, W.position.y + 1.2, W.position.z);
    if (r.t > 4.2 && !this.fade) this.blackout(true);
    if (r.t > 5.4 && r.rock) {
      // Too big a price for the town cells: down to Gullmouth's south jetty and out to the Rock on the Tern
      this.host.scene.remove(W);
      this.host.scene.remove(r.driver.root);
      this.ride = null;
      this.setBounty(r.town, 0);
      this.host.banner('Skua Rock', 'The Charter\'s boat is waiting at Gullmouth');
      this.rock.sendOut(r.town, r.bounty);
      // (dark a while longer, while the harbour loads round the boat)
      setTimeout(() => this.blackout(false), 2200);
      return;
    }
    if (r.t > 5.4) {
      // At the gaol: into the cell
      this.host.scene.remove(W);
      this.host.scene.remove(r.driver.root);
      const g = r.gaol;
      this.host.player.seat = 0;
      this.host.setPose(null);
      this.host.player.teleport(g.x + GAOL.cell[0], g.floor, g.z + GAOL.cell[1]);
      this.host.player.yaw = -Math.PI / 2;
      this.setBounty(r.town, 0);
      this.host.setFlag('jail', { gaol: g.id, until: Date.now() + r.secs * 1000, town: r.town, bounty: r.bounty } satisfies Jail);
      this.host.setFlag('arrests:' + r.town, Number(this.host.flag('arrests:' + r.town) ?? 0) + 1);
      this.ride = null;
      this.host.player.locked = false;
      this.host.hudHidden(false);
      setTimeout(() => this.blackout(false), 300);
      this.host.banner(g.name[0].toUpperCase() + g.name.slice(1), `${Math.ceil(r.secs / 60)} minute${r.secs > 60 ? 's' : ''} in the cells`);
      this.host.system('Sit it out, or work oakum to shorten it. A lockpick and a steady hand would get you out sooner, at a price.');
    }
  }

  private blackout(on: boolean): void {
    if (on && !this.fade) {
      this.fade = document.createElement('div');
      this.fade.id = 'lawfade';
      document.body.appendChild(this.fade);
      requestAnimationFrame(() => this.fade?.classList.add('on'));
    } else if (!on && this.fade) {
      const f = this.fade;
      this.fade = null;
      f.classList.remove('on');
      setTimeout(() => f.remove(), 700);
    }
  }

  private gaolOf(j: Jail): GaolDef | undefined { return GAOLS.find((g) => g.id === j.gaol); }

  private updateJail(dt: number, j: Jail): void {
    const g = this.gaolOf(j);
    if (!g) { this.host.setFlag('jail', null); return; }
    const P = this.host.player.position;
    const inCell = Math.hypot(P.x - (g.x + GAOL.cell[0]), P.z - (g.z + GAOL.cell[1])) < 3 && Math.abs(P.y - g.floor) < 3;
    // Somewhere else (the game was left and came back elsewhere): back in the cell
    if (!inCell && !this.picking) this.host.player.teleport(g.x + GAOL.cell[0], g.floor, g.z + GAOL.cell[1]);
    // Lying on the plank bed, time passes quicker; working oakum takes a little off
    if (this.resting) {
      j.until -= dt * 2000;
      if (this.host.player.position.distanceToSquared(this.restAt) > 0.05) { this.resting = false; this.host.setPose(null); }
    }
    if (this.oakum > 0) { this.oakum -= dt; if (this.oakum <= 0) { j.until -= Math.max(0, j.until - Date.now()) * 0.15; this.host.setPose(null); this.host.system('A heap of picked oakum. The gaoler takes a little off your time.'); } }
    if (this.resting || this.oakum > 0) this.host.setFlag('jail', { ...j });
    if (Date.now() >= j.until) this.release(g, 'Time\'s up. Up you go, and don\'t let me see you back.');
  }

  private restAt = new THREE.Vector3();

  private release(g: GaolDef, line: string): void {
    this.resting = false; this.oakum = 0;
    this.host.setPose(null);
    this.host.setFlag('jail', null);
    this.blackout(true);
    setTimeout(() => {
      const y = this.host.ground(g.out[0], g.out[1], street(g.out[0], g.out[1]));
      this.host.player.teleport(g.out[0], y, g.out[1]);
      this.host.player.yaw = g.out[2];
      this.blackout(false);
      this.host.banner('Let go', line);
    }, 700);
  }

  // ------------------------------------------------------------------------------- what you can do here

  /** Things to do where you stand: in a cell, at a refuge's hatch or foot. */
  candidates(p: THREE.Vector3): { label: string; pos: THREE.Vector3; use: () => void }[] {
    const out: { label: string; pos: THREE.Vector3; use: () => void }[] = [];
    const j = this.jail;
    if (j && !j.escaped && Rock.is(j)) return this.rock.candidates(p);
    if (j && !j.escaped) {
      const g = this.gaolOf(j);
      if (!g) return out;
      const left = Math.max(0, Math.ceil((j.until - Date.now()) / 1000));
      const cell = new THREE.Vector3(g.x + GAOL.cell[0], g.floor + 1, g.z + GAOL.cell[1]);
      if (p.distanceTo(cell) < 3) {
        out.push({ label: `Lie on the plank bed (${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} left)`, pos: cell.clone().add(new THREE.Vector3(1, 0, 0)), use: () => { this.resting = true; this.restAt.copy(this.host.player.position); this.host.setPose('sit'); this.host.system('You lie back on the planks. The time goes quicker this way.'); } });
        if (this.oakum <= 0) out.push({ label: 'Pick oakum', pos: cell.clone().add(new THREE.Vector3(-0.8, 0, -0.8)), use: () => { this.oakum = 8; this.host.setPose('hammer'); this.host.system('You pick old rope apart into oakum, strand by strand.'); } });
        out.push({ label: 'Pick the cell lock', pos: new THREE.Vector3(g.x + 2.5, g.floor + 1.3, g.z + GAOL.cell[1]), use: () => void this.pickLock(g, j) });
      }
      return out;
    }
    for (const r of REFUGES) {
      const hatch = new THREE.Vector3(r.hatch[0], 0, r.hatch[1]);
      if (Math.hypot(p.x - hatch.x, p.z - hatch.z) < 2.4 && p.y > r.floor + 5) out.push({ label: `Go down into ${r.name}`, pos: hatch.setY(p.y + 0.4), use: () => this.through(r.x + REFUGE.foot[0], r.floor, r.z + REFUGE.foot[1], 0) });
      const foot = new THREE.Vector3(r.x + REFUGE.foot[0], r.floor + 1, r.z + REFUGE.foot[1]);
      if (p.distanceTo(foot) < 2.6) out.push({ label: 'Climb up to the street', pos: foot.clone().add(new THREE.Vector3(-0.5, 1, -1)), use: () => this.through(r.hatch[0] + 1.6, this.host.ground(r.hatch[0] + 1.6, r.hatch[1], street(r.hatch[0] + 1.6, r.hatch[1])), r.hatch[1], Math.PI / 2) });
    }
    return out;
  }

  private through(x: number, y: number, z: number, yaw: number): void {
    this.blackout(true);
    this.host.sfx('doorOpen', 0.6);
    setTimeout(() => { this.host.player.teleport(x, y, z); this.host.player.yaw = yaw; this.blackout(false); }, 450);
  }

  private async pickLock(g: GaolDef, j: Jail): Promise<void> {
    if (this.picking) return;
    this.picking = true;
    const ok = await this.host.lockpick();
    this.picking = false;
    if (!ok) return;
    // Out of the cell, past the gaoler's back and up the stair: with a worse price on you
    const town = JURISDICTIONS.find((x) => x.id === j.town);
    this.setBounty(j.town, Math.round(j.bounty * 1.5) + 50);
    this.host.setFlag('jail', { ...j, escaped: true });
    this.host.system(`The lock gives. You're up the stair and out while the gaoler's at his book. ${town?.name ?? 'The town'} wants ${this.bounty(j.town)} marks for you now.`);
    this.release(g, 'Out. Keep your head down.');
  }

  // ------------------------------------------------------------------------------------------- display

  private updateBadge(): void {
    const j = this.jail, P = this.host.player.position, here = jurisdictionAt(P.x, P.z);
    let text = '';
    if (this.ride) text = 'In the watch\'s wagon';
    else if (this.rock.busy) text = j && Rock.is(j) && j.out ? 'Off the Rock: paddle' : 'In irons';
    else if (j && !j.escaped && Rock.is(j)) { const left = Math.max(0, Math.ceil((j.until - Date.now()) / 1000)); text = j.out ? 'Off the Rock: keep going' : `Skua Rock: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
    else if (j && !j.escaped) { const left = Math.max(0, Math.ceil((j.until - Date.now()) / 1000)); text = `In the cells: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; }
    else if (here && this.bounty(here.id) > 0) text = `Wanted in ${here.name}: ${this.bounty(here.id)} marks`;
    if (!text) { this.badge?.remove(); this.badge = null; return; }
    if (!this.badge) { this.badge = document.createElement('div'); this.badge.id = 'bountybadge'; document.body.appendChild(this.badge); }
    if (this.badge.textContent !== text) this.badge.textContent = text;
    this.badge.classList.toggle('hot', !!this.arrest || (!!here && this.bounty(here.id) >= HEAT.arrest));
  }
}
