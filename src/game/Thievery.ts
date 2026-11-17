import * as THREE from 'three';
import { ITEMS } from '../data/items';
import { jurisdictionAt } from '../data/justice';
import { CONTAINERS, MARKS_BY_TIER, POCKET, POCKET_ODDS, SEEN, STOLEN_IDS, THEFT_MIN, TOWN_TABLE, WILD_TABLE } from '../data/thievery';

// Looting and stealing (data/thievery.ts says what and how much; owner 2026-11-17: "add looting and stealing like elder
// scrolls/elder scrolls online"). The world's barrels, crates, chests, dressers and desks (every site's props) can be
// searched; in a town's bounds that's theft, and a witness puts it on the town's book (game/Justice.ts). A chest or a
// strongbox in town is locked: the lockpick (the same as the gaol's). Sneaking (Left Ctrl) shrinks how far you're seen,
// and lets you pick a pocket from behind. Each container fills again a day after it was emptied.

export interface ThiefHost {
  props(): { t: string; item?: string; x: number; y: number; z: number }[];
  player(): THREE.Vector3;
  facing(): number;
  sneaking(): boolean;
  night(): boolean;
  /** Townsfolk you could pick: id, name, where, and the way they face. */
  people(): { id: string; name: string; pos: THREE.Vector3; yaw: number }[];
  witnesses(at: THREE.Vector3, r: number): number;
  /** On the town's book, if anyone saw: the goods' worth; true if it was seen. */
  crime(at: THREE.Vector3, price: number, what: string): boolean;
  lockpick(): Promise<boolean>;
  count(item: string): number;
  give(item: string, n?: number): boolean;
  addMarks(n: number): void;
  level(): number;
  flag(k: string): unknown;
  setFlag(k: string, v: unknown): void;
  system(text: string): void;
  say(at: THREE.Vector3, text: string): void;
  sfx(name: 'pickup' | 'coin' | 'fail' | 'click' | 'discover'): void;
  bump(k: string): void;
}

const day = () => Math.floor(Date.now() / 86_400_000);
const pickFrom = (table: [string, number][]) => { const total = table.reduce((a, [, w]) => a + w, 0); let r = Math.random() * total; for (const [id, w] of table) { if ((r -= w) <= 0) return id; } return table[0][0]; };
const kindOf = (p: { t: string; item?: string }) => (p.t === 'furn' ? p.item ?? '' : p.t);

export class Thievery {
  private list: { key: string; kind: string; x: number; y: number; z: number }[] | null = null;
  private busy = false;
  constructor(private host: ThiefHost) {}

  /** Every container in the world, keyed by where it stands (worked out once). */
  private containers() {
    if (!this.list) {
      this.list = [];
      for (const p of this.host.props()) { const k = kindOf(p); if (CONTAINERS[k]) this.list.push({ key: `${Math.round(p.x * 2)},${Math.round(p.z * 2)}`, kind: k, x: p.x, y: p.y, z: p.z }); }
    }
    return this.list;
  }
  private emptied(key: string): boolean { const m = this.host.flag('looted') as Record<string, number> | undefined; return !!m && m[key] === day(); }
  private markEmptied(key: string): void {
    const m = { ...((this.host.flag('looted') as Record<string, number> | undefined) ?? {}) }, d = day();
    for (const k of Object.keys(m)) if (m[k] !== d) delete m[k];
    m[key] = d;
    this.host.setFlag('looted', m);
  }

  /** What you can do near you: search a container, or (sneaking, behind them) pick a pocket. */
  candidates(): { label: string; sub?: string; pos: THREE.Vector3; use: () => void; warn?: string }[] {
    if (this.busy) return [];
    const p = this.host.player(), out: { label: string; sub?: string; pos: THREE.Vector3; use: () => void; warn?: string }[] = [];
    let best: ReturnType<Thievery['containers']>[number] | null = null, bd = 1.8;
    for (const c of this.containers()) { const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd && Math.abs(c.y - p.y) < 2.5) { bd = d; best = c; } }
    if (best && !this.emptied(best.key)) {
      const c = best, town = jurisdictionAt(c.x, c.z), def = CONTAINERS[c.kind];
      const locked = !!town && def.tier === 2;
      out.push({ label: town ? `Steal from the ${def.name}` : `Search the ${def.name}`, sub: town ? `${town.name}'s${locked ? '; locked' : ''}${this.host.sneaking() ? '' : '; sneak to be seen less'}` : undefined, pos: new THREE.Vector3(c.x, c.y + 1.1, c.z), use: () => void this.take(c), warn: town ? 'Stealing' : undefined });
    }
    if (this.host.sneaking()) {
      for (const n of this.host.people()) {
        const d = n.pos.distanceTo(p);
        if (d > 1.8 || !jurisdictionAt(n.pos.x, n.pos.z)) continue;
        // behind them: you're on the far side of the way they face
        const fx = Math.sin(n.yaw), fz = Math.cos(n.yaw), behind = ((p.x - n.pos.x) * fx + (p.z - n.pos.z) * fz) / Math.max(0.01, d) < -0.2;
        if (!behind || this.emptied('pocket:' + n.id)) continue;
        out.push({ label: `Pick ${n.name}'s pocket`, sub: `${Math.round(this.pocketOdds() * 100)}% to come away clean`, pos: n.pos.clone().setY(n.pos.y + 1.2), use: () => this.pocket(n), warn: 'Stealing' });
        break;
      }
    }
    return out;
  }

  private pocketOdds(): number { return Math.min(POCKET_ODDS.cap, POCKET_ODDS.base + this.host.level() * POCKET_ODDS.perLevel); }
  private seenR(): number { return (this.host.sneaking() ? SEEN.sneak : SEEN.stand) * (this.host.night() ? SEEN.nightMul : 1); }

  /** Search or steal from a container. */
  private async take(c: { key: string; kind: string; x: number; y: number; z: number }): Promise<void> {
    const town = jurisdictionAt(c.x, c.z), def = CONTAINERS[c.kind], at = new THREE.Vector3(c.x, c.y, c.z);
    if (town && def.tier === 2) {
      if (this.host.count('lockpick') < 1) { this.host.system('It\'s locked. A lockpick would open it: the Ropewalk Cellar sells them, and so do some who shouldn\'t.'); this.host.sfx('fail'); return; }
      this.busy = true;
      const ok = await this.host.lockpick().catch(() => false);
      this.busy = false;
      if (!ok) { this.host.system('The lock holds.'); return; }
    }
    this.markEmptied(c.key);
    const got: string[] = [];
    let worth = 0;
    const [lo, hi] = MARKS_BY_TIER[def.tier], marks = Math.floor(lo + Math.random() * (hi - lo + 1));
    if (marks > 0) { this.host.addMarks(marks); worth += marks; got.push(`${marks} marks`); }
    const rolls = def.tier === 2 ? 2 : Math.random() < 0.7 ? 1 : 0;
    for (let i = 0; i < rolls; i++) {
      const id = pickFrom((town ? TOWN_TABLE : WILD_TABLE)[def.tier]);
      if (!ITEMS[id] || !this.host.give(id, 1)) continue;
      worth += ITEMS[id].value; got.push(ITEMS[id].name.toLowerCase());
    }
    this.host.sfx(got.length ? 'pickup' : 'click');
    if (!town) { this.host.system(got.length ? `In the ${def.name}: ${got.join(', ')}.` : `The ${def.name} is empty. Somebody was here first.`); this.host.bump('looted'); return; }
    this.host.bump('stolen');
    const seen = this.host.witnesses(at, this.seenR()) > 0 && this.host.crime(at, Math.max(THEFT_MIN, worth), def.name);
    this.host.system(got.length ? `You take ${got.join(', ')}.${seen ? '' : ' Nobody saw.'}` : `Nothing worth taking.${seen ? '' : ' Nobody saw.'}`);
  }

  /** Pick a pocket: marks, now and then a trinket; or a hand on your wrist. */
  private pocket(n: { id: string; name: string; pos: THREE.Vector3 }): void {
    this.markEmptied('pocket:' + n.id);
    if (Math.random() > this.pocketOdds()) {
      this.host.say(n.pos, ['Hey! Thief!', 'Get your hand out of my coat!', 'Watch! Watch! Thief!'][Math.floor(Math.random() * 3)]);
      this.host.sfx('fail');
      this.host.crime(n.pos, THEFT_MIN * 2, 'pocket');
      return;
    }
    const [lo, hi] = POCKET.marks, m = Math.floor(lo + Math.random() * (hi - lo + 1));
    this.host.addMarks(m);
    let extra = '';
    if (Math.random() < POCKET.extra) { const id = POCKET.extras[Math.floor(Math.random() * POCKET.extras.length)]; if (this.host.give(id, 1)) extra = ` and ${ITEMS[id]?.name.toLowerCase()}`; }
    this.host.sfx('coin');
    this.host.bump('pockets');
    this.host.system(`${n.name}'s purse is ${m} marks lighter${extra}. They didn't feel a thing.`);
  }

  /** Taken in by the watch: what you stole goes back. */
  confiscate(take: (id: string, n: number) => void, count: (id: string) => number): number {
    let n = 0;
    for (const id of STOLEN_IDS) { const k = count(id); if (k > 0) { take(id, k); n += k; } }
    return n;
  }
}
