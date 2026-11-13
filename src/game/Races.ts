import * as THREE from 'three';
import { BEND, BOOK_DAILY_LIMIT, DOWNS, POST_AT, RACE_MS, RACE_STAKES, STRAIGHT, T_CLOSE, T_OFF, T_PARADE, T_STALLS, TRACK_W } from '../data/races';
import { mountModel, type CreatureModel } from '../entities/creatures';
import { Humanoid, type Appearance } from '../entities/humanoid';
import { riderLift } from '../entities/seats';
import { SEA } from '../world/terrain';
import { coursePoint, fieldFor, horsesAt, LAP, raceNow, runRace, TRIP } from './racing';

// Amberwold Downs on the day (data/races.ts, the races themselves game/racing.ts): the white rails round the
// course, six runners and their jockeys going down to the start and racing, a crowd in the stand that roars them
// home, the caller's voice, and Barnabas Quick's book. Every race is the realm clock's, so everyone watching sees
// the same one; a bet is paid when its race is run, wherever you are by then.

export interface RacesHost {
  scene: THREE.Scene;
  player(): THREE.Vector3;
  now(): number;
  marks(): number;
  addMarks(n: number): void;
  flag(key: string): unknown;
  setFlag(key: string, v: unknown): void;
  /** The caller's voice and the book's word. */
  say(from: string, text: string): void;
  system(text: string): void;
  sound(n: 'coin' | 'click' | 'quest' | 'fail' | 'cheer' | 'open' | 'close'): void;
  persist(): void;
}

interface Ticket { k: number; i: number; stake: number }

const NEAR = 240, CROWD_NEAR = 150;
const BASE = SEA + 3; // (the course is levelled to the sea and three: world/sites.ts 'downs')
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const hand = new THREE.Vector3(), hand2 = new THREE.Vector3();

/** Seeded, for the crowd's looks and seats (the same crowd for everyone). */
function seeded(seed: number) { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

export class Races {
  private built = false;
  private group = new THREE.Group();
  private runners: { horse: CreatureModel; jockey: Humanoid; id: string }[] = [];
  private fieldK = -1;
  private crowd: { h: Humanoid; seated: boolean; x: number; y: number; z: number }[] = [];
  private said = new Set<string>();
  private el: HTMLDivElement | null = null;
  private stake = RACE_STAKES[1];
  private note = '';

  constructor(private host: RacesHost) {}

  get bookOpen(): boolean { return !!this.el; }

  private tickets(): Ticket[] { return ((this.host.flag('raceBets') as Ticket[] | undefined) ?? []).filter((t) => t && Number.isFinite(t.k)); }
  private today = () => new Date().toDateString();
  private wonToday(): number { const w = this.host.flag('bookWon') as { day: string; n: number } | undefined; return w && w.day === this.today() ? w.n : 0; }

  // ---- The course ----

  /** The white rails, inside and out, on posts. */
  private buildRails(): void {
    const half = TRACK_W / 2 + 0.3, postGeo = new THREE.BoxGeometry(0.14, 1.1, 0.14), railGeo = new THREE.BoxGeometry(1, 0.12, 0.08);
    const white = new THREE.MeshLambertMaterial({ color: '#f4f2ea' });
    const nPost = Math.ceil(LAP / 3), nRail = Math.ceil(LAP / 1.5);
    const posts = new THREE.InstancedMesh(postGeo, white, nPost * 2 + 40), rails = new THREE.InstancedMesh(railGeo, white, nRail * 2 + 80);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    let pi = 0, ri = 0;
    for (const off of [-half, half]) {
      const R = BEND + off, perim = 4 * STRAIGHT + 2 * Math.PI * R;
      // (stepped along the rail's own length, so the outer one's posts are as close as the inner's)
      const toS = (u: number) => (u / perim) * LAP;
      for (let u = 0; u < perim; u += 3) {
        const p = coursePoint(toS(u), off);
        m.compose(new THREE.Vector3(p.x, BASE + 0.55, p.z), q.identity(), sc.set(1, 1, 1));
        posts.setMatrixAt(pi++, m);
      }
      for (let u = 0; u < perim; u += 1.5) {
        const a = coursePoint(toS(u), off), b = coursePoint(toS(u + 1.5), off);
        const len = Math.hypot(b.x - a.x, b.z - a.z), yaw = Math.atan2(b.x - a.x, b.z - a.z) - Math.PI / 2;
        // (the outer rail breaks for the apron in front of the stand: no, it runs on, as a real course's does)
        m.compose(new THREE.Vector3((a.x + b.x) / 2, BASE + 1.05, (a.z + b.z) / 2), q.setFromAxisAngle(up, yaw), sc.set(len + 0.05, 1, 1));
        rails.setMatrixAt(ri++, m);
      }
    }
    // The furlong poles: red and white, every eighth of the trip back from the post
    const pole = new THREE.MeshLambertMaterial({ color: '#c8281e' });
    for (let f = 1; f < 4; f++) {
      const p = coursePoint(POST_AT - (TRIP / 4) * f, half + 0.4);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), pole);
      mesh.position.set(p.x, BASE + 0.95, p.z);
      this.group.add(mesh);
    }
    posts.count = pi; rails.count = ri;
    posts.instanceMatrix.needsUpdate = rails.instanceMatrix.needsUpdate = true;
    posts.castShadow = rails.castShadow = true;
    this.group.add(posts, rails);
  }

  /** The stand's crowd: seated on the tiers, a few on their feet at the rail. */
  private buildCrowd(): void {
    const r = seeded(4242), X0 = DOWNS.x - 22, X1 = DOWNS.x + 36, Z0 = DOWNS.z + BEND + Math.ceil(TRACK_W / 2) + 2, T0 = Z0 + 3;
    const skins = ['#f1c9a5', '#e0b090', '#c9946a', '#a8744c', '#8a5a3a', '#6a4430', '#f5d6b8'];
    const hairs = ['#2a1c12', '#4a2e1a', '#8a6a3a', '#c8a060', '#a84a22', '#3a3a3a', '#d8d0c0', '#1a1a1e'];
    const cloth = ['#6a5a3c', '#4a5a6a', '#7a3a2a', '#3a5a3a', '#8a7a5a', '#5a4a6a', '#a0522d', '#2a4a8a', '#c8a03a', '#704a5a'];
    const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
    const look = (): Partial<Appearance> => {
      const f = r() < 0.5;
      return { frame: f ? 'f' : 'm', skin: pick(skins), hair: pick(hairs), hairStyle: Math.floor(r() * 6), eyes: '#3a2a1e', tunic: pick(cloth), trim: pick(cloth), trousers: pick(['#3a3430', '#2a2a30', '#4a3a2c']), boots: '#2a1e14', hat: r() < 0.35 ? pick(['wide', 'cap', 'kerchief']) as Appearance['hat'] : undefined, hatColor: pick(cloth), lashes: f };
    };
    const taken = new Set<string>();
    for (let n = 0; n < 22; n++) {
      const t = Math.floor(r() * 5), x = X0 + 1 + Math.floor(r() * (X1 - X0 - 2)), k = `${t}:${x}`;
      if (taken.has(k)) continue;
      taken.add(k);
      const h = new Humanoid(look() as Appearance);
      const y = BASE + t, z = T0 + t * 2 + 0.6;
      h.root.position.set(x + 0.5, y, z);
      h.root.rotation.y = Math.PI;
      h.setState('seated');
      this.group.add(h.root);
      this.crowd.push({ h, seated: true, x: x + 0.5, y, z });
    }
    for (let n = 0; n < 10; n++) {
      const x = X0 - 6 + r() * (X1 - X0 + 6), z = Z0 + 0.6 + r() * 1.4;
      const h = new Humanoid(look() as Appearance);
      h.root.position.set(x, BASE, z);
      h.root.rotation.y = Math.PI + (r() - 0.5) * 0.6;
      h.setState('idle');
      this.group.add(h.root);
      this.crowd.push({ h, seated: false, x, y: BASE, z });
    }
  }

  private build(): void {
    if (this.built) return;
    this.built = true;
    this.buildRails();
    this.buildCrowd();
    this.host.scene.add(this.group);
  }

  private unbuild(): void {
    if (!this.built) return;
    this.built = false;
    this.host.scene.remove(this.group);
    this.group = new THREE.Group();
    this.runners = []; this.crowd = []; this.fieldK = -1;
  }

  /** Race k's six, saddled and up. */
  private saddle(k: number): void {
    for (const r of this.runners) { this.group.remove(r.horse.root); this.group.remove(r.jockey.root); }
    this.runners = [];
    for (const h of fieldFor(k).runners) {
      const horse = mountModel({ coat: h.coat, mane: h.mane, cloth: h.silks[0] });
      const jockey = new Humanoid({ frame: /^(Ada|Mags|Tess|Kit|Bryony)/.test(h.jockey) ? 'f' : 'm', skin: '#e0b090', hair: '#3a2a1e', hairStyle: 0, eyes: '#3a2a1e', tunic: h.silks[0], trim: h.silks[1], sleeves: h.silks[1], shirt: h.silks[1], trousers: '#f4f0e6', boots: '#1a1a1e', shoes: 1, hat: 'cap', hatColor: h.silks[1], build: 0.85, height: 0.88 } as Appearance);
      jockey.setState('ride');
      jockey.straddle = horse.girth;
      this.group.add(horse.root, jockey.root);
      this.runners.push({ horse, jockey, id: h.id });
    }
    this.fieldK = k;
  }

  // ---- Each frame ----

  update(dt: number): void {
    const now = this.host.now(), { k, t } = raceNow(now);
    this.settle(now);
    const P = this.host.player(), d = Math.hypot(P.x - DOWNS.x, P.z - DOWNS.z);
    if (d > NEAR) { this.unbuild(); return; }
    this.build();
    if (this.fieldK !== k) this.saddle(k);
    const at = horsesAt(k, t), lift = riderLift(null);
    at.forEach((a, i) => {
      const r = this.runners[i];
      if (!r) return;
      // (the field spreads a little across the track as it runs, each on its own line)
      const lane = (a.lane - 2.5) * 1.3;
      const p = coursePoint(a.s, lane), p2 = coursePoint(a.s + 0.5, lane);
      r.horse.root.position.set(p.x, BASE, p.z);
      r.horse.root.rotation.y = Math.atan2(p2.x - p.x, p2.z - p.z);
      r.horse.setAnim(a.gait);
      r.horse.update(dt, a.speed);
      r.jockey.root.position.set(p.x, BASE + lift, p.z);
      r.jockey.root.rotation.y = r.horse.root.rotation.y;
      r.jockey.update(dt, 0);
      r.horse.holdReins(r.jockey.handsAt(hand, hand2));
    });
    // The crowd, on its feet and roaring as they come home
    const running = t >= T_OFF && t < T_OFF + 45, home = t >= T_OFF + 25 && t < T_OFF + 45;
    if (d < CROWD_NEAR) for (const c of this.crowd) {
      c.h.setState(home ? (c.seated ? 'cheer' : 'cheer') : c.seated ? 'seated' : running ? 'point' : 'idle');
      c.h.root.position.y = home && c.seated ? c.y + 0.05 : c.y;
      c.h.update(dt, 0);
    }
    this.call(k, t, d);
    if (this.el) this.renderBook();
  }

  /** The caller, over the course: the parade, the stalls, the off, the turn, the finish. */
  private call(k: number, t: number, d: number): void {
    if (d > 200) return;
    const f = fieldFor(k), once = (id: string, text: string) => { const key = k + id; if (this.said.has(key)) return; this.said.add(key); if (this.said.size > 60) this.said.delete(this.said.values().next().value!); this.host.say('The caller', text); };
    if (t >= T_PARADE && t < T_PARADE + 3) once('parade', `The runners for the ${this.raceName(k)} are on the course: ${f.runners.map((r) => r.name).join(', ')}. Make your bets with Barnabas at the book.`);
    if (t >= T_STALLS && t < T_STALLS + 3) once('stalls', 'They\'re going into the stalls. The book is closed.');
    if (t >= T_OFF && t < T_OFF + 2) { once('off', 'And they\'re off!'); if (!this.said.has(k + 'roar')) { this.said.add(k + 'roar'); this.host.sound('cheer'); } }
    const run = runRace(k);
    const lead = (at: number) => { const hs = horsesAt(k, at).map((h, i) => [h.s, i] as const).sort((a, b) => b[0] - a[0]); return [f.runners[hs[0][1]].name, f.runners[hs[1][1]].name]; };
    if (t >= T_OFF + 12 && t < T_OFF + 14) { const [a, b] = lead(t); once('mid', `${a} leads from ${b} as they pass the stand the first time.`); }
    if (t >= T_OFF + 27 && t < T_OFF + 29) { const [a, b] = lead(t); once('turn', `Round the far turn and into the straight. ${a} in front, ${b} coming at them!`); }
    const fin = Math.min(...run.time);
    if (t >= T_OFF + fin + 1 && t < T_OFF + fin + 4) {
      const [w, s2, s3] = run.order.map((i) => f.runners[i].name), gap = run.time[run.order[1]] - run.time[run.order[0]];
      once('win', `${w} wins it${gap < 0.15 ? ' by a nose' : gap < 0.4 ? ' by a neck' : gap > 1.5 ? ' easing down' : ''}! ${s2} second, ${s3} third. ${f.odds[run.order[0]] === 'evens' ? 'The favourite at evens.' : `Returned at ${f.odds[run.order[0]]}.`}`);
      this.host.sound('cheer');
    }
  }

  /** Races are named for the hour they go off, as the course has it. */
  raceName(k: number): string {
    const d = new Date(k * RACE_MS + T_OFF * 1000);
    return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ---- The book ----

  /** Pay out on any race run since the bet was laid (wherever you are now). */
  private settle(now: number): void {
    const tickets = this.tickets();
    if (!tickets.length) return;
    const keep: Ticket[] = [];
    let paid = 0, lost = 0;
    const lines: string[] = [];
    for (const tk of tickets) {
      const run = runRace(tk.k);
      const done = now >= tk.k * RACE_MS + (T_OFF + Math.max(...run.time.filter(Number.isFinite)) + 2) * 1000;
      if (!done) { keep.push(tk); continue; }
      const f = fieldFor(tk.k), name = f.runners[tk.i]?.name ?? 'Your horse';
      if (run.order[0] === tk.i) { const back = Math.round(tk.stake * f.price[tk.i]); paid += back; lines.push(`${name} won the ${this.raceName(tk.k)} at ${f.odds[tk.i]}: Barnabas pays you ${back} marks.`); }
      else { lost += tk.stake; lines.push(`${name} ran ${['', 'first', 'second', 'third', 'fourth', 'fifth', 'last'][run.order.indexOf(tk.i) + 1]} in the ${this.raceName(tk.k)}. Your ${tk.stake} stays with the book.`); }
    }
    if (keep.length === tickets.length) return;
    this.host.setFlag('raceBets', keep);
    if (paid) {
      this.host.addMarks(paid);
      const w = this.host.flag('bookWon') as { day: string; n: number } | undefined;
      this.host.setFlag('bookWon', { day: this.today(), n: (w && w.day === this.today() ? w.n : 0) + paid });
      this.host.sound('quest');
    }
    for (const l of lines) this.host.system(l);
    void lost;
    this.host.persist();
  }

  /** Which race the book is taking bets on: this one until the stalls, then the next. */
  private openRace(): number { const { k, t } = raceNow(this.host.now()); return t < T_CLOSE ? k : k + 1; }

  private back(i: number): void {
    const k = this.openRace(), f = fieldFor(k);
    if (this.wonToday() >= BOOK_DAILY_LIMIT) { this.note = '"You\'ve had enough off me today. Come back tomorrow, and bring a worse eye for a horse."'; this.host.sound('fail'); return; }
    if (this.host.marks() < this.stake) { this.note = 'You haven\'t the marks for that.'; this.host.sound('fail'); return; }
    const mine = this.tickets();
    if (mine.filter((t) => t.k === k).length >= 6) { this.note = '"Six slips on one race is plenty, friend."'; return; }
    this.host.addMarks(-this.stake);
    this.host.setFlag('raceBets', [...mine, { k, i, stake: this.stake }]);
    this.note = `Barnabas writes you a slip: ${this.stake} on ${f.runners[i].name} at ${f.odds[i]}, the ${this.raceName(k)}.`;
    this.host.sound('coin');
    this.host.persist();
  }

  openBook(): void {
    if (this.el) return;
    this.el = document.createElement('div');
    this.el.id = 'tavern';
    document.body.appendChild(this.el);
    this.note = '';
    this.host.sound('open');
    this.renderBook(true);
  }

  closeBook(): void {
    if (!this.el) return;
    this.el.remove(); this.el = null;
    this.host.sound('close');
  }

  private bookKey = '';
  private renderBook(force = false): void {
    if (!this.el) return;
    const now = this.host.now(), { k, t } = raceNow(now), open = this.openRace(), f = fieldFor(open);
    const left = open === k ? Math.max(0, Math.ceil(T_CLOSE - t)) : Math.ceil((RACE_MS / 1000 - t) + T_CLOSE);
    const mine = this.tickets();
    const key = `${open}|${Math.floor(left / 5)}|${this.stake}|${this.note}|${mine.length}|${this.host.marks()}`;
    if (!force && key === this.bookKey) return;
    this.bookKey = key;
    const last = runRace(k - 1), lf = fieldFor(k - 1);
    const lastLine = `Last race, the ${this.raceName(k - 1)}: ${last.order.slice(0, 3).map((i, n) => `${['1st', '2nd', '3rd'][n]} ${lf.runners[i].name}`).join(', ')}.`;
    const rows = f.runners.map((r, i) => `<div class="rb-row"><span class="rb-silk" style="background:linear-gradient(90deg, ${r.silks[0]} 60%, ${r.silks[1]} 60%)"></span>
      <div class="rb-name"><b>${esc(r.name)}</b><small>${esc(r.jockey)} · ${esc(r.note)}</small></div><span class="rb-odds">${f.odds[i]}</span>
      <button class="btn" data-back="${i}">Back it</button></div>`).join('');
    const slips = mine.map((tk) => { const ff = fieldFor(tk.k); return `<li>${tk.stake} on ${esc(ff.runners[tk.i]?.name ?? '?')} at ${ff.odds[tk.i]}, the ${this.raceName(tk.k)}</li>`; }).join('');
    this.el.innerHTML = `<div class="tv-box"><div class="tv-head"><b>The book: the ${this.raceName(open)}</b><span class="tv-marks">${this.host.marks().toLocaleString()} marks</span><button class="tv-x" data-close>✕</button></div>
      <p class="tv-say">${open === k ? `Bets close in ${left >= 60 ? `${Math.floor(left / 60)} min ${left % 60}s` : `${left}s`}, when they go into the stalls.` : `This race is closed. Taking bets on the next, the ${this.raceName(open)}, off in about ${Math.ceil(left / 60)} min.`} Win only: if it wins, Barnabas pays the price on the board, your stake included.</p>
      <div class="rb-list">${rows}</div>
      <div class="tv-foot"><span class="tv-chips">Stake: ${RACE_STAKES.map((s) => `<button class="tv-chip${s === this.stake ? ' on' : ''}" data-rs="${s}">${s}</button>`).join('')}</span><span class="tv-status">${esc(this.note || lastLine)}</span></div>
      ${slips ? `<p class="tv-note">Your slips:</p><ul class="rb-slips">${slips}</ul>` : ''}</div>`;
    this.el.querySelector('[data-close]')?.addEventListener('click', () => this.closeBook());
    this.el.querySelectorAll<HTMLElement>('[data-rs]').forEach((b) => b.addEventListener('click', () => { this.stake = Number(b.dataset.rs); this.host.sound('click'); this.renderBook(true); }));
    this.el.querySelectorAll<HTMLElement>('[data-back]').forEach((b) => b.addEventListener('click', () => { this.back(Number(b.dataset.back)); this.renderBook(true); }));
  }
}
