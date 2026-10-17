import { LOGIN_TRACK, untilReset, utcDay, utcMonth, WRIT_BUNDLE, WritKind, writsFor } from '../data/calendar';
import { ITEMS, SkillId } from '../data/items';

// The daily round for one character: the login track and the day's three writs, kept in the save's
// flags ('daily:login' and 'daily:writs'). Everything checks the date as it goes, so a session that
// runs past midnight UTC rolls over by itself.

export interface DailyHost {
  flag(key: string): unknown;
  setFlag(key: string, value: unknown): void;
  addMarks(n: number): void;
  addXp(skill: SkillId, n: number): void;
  give(item: string, n?: number): boolean;
  banner(title: string, sub: string): void;
  system(text: string): void;
  sound(): void;
  /** Hears every event too (the festival writ counts the same things). */
  also?(kind: WritKind, n: number): void;
}

interface LoginState { month: string; count: number; lastDay: number }
interface WritState { day: number; prog: Record<string, number>; done: string[]; bundle: boolean }

export interface DailyView {
  writs: { id: string; name: string; desc: string; have: number; need: number; done: boolean; marks: number }[];
  bundleDone: boolean;
  resetIn: number;
  login: { month: string; count: number; claimedToday: boolean; track: { label: string; rare: boolean; items: [string, number][]; marks: number }[] };
  /** What finishing all three writs may give: marks, and one of these items. */
  bundle: { marks: number; items: string[] };
}

function describe(r: { marks?: number; items?: string[] }): string {
  const parts: string[] = [];
  if (r.marks) parts.push(r.marks + ' marks');
  const counts = new Map<string, number>();
  for (const it of r.items ?? []) counts.set(it, (counts.get(it) ?? 0) + 1);
  for (const [it, n] of counts) parts.push((n > 1 ? n + ' × ' : '') + (ITEMS[it]?.name ?? it));
  return parts.join(', ');
}

export class Dailies {
  constructor(private host: DailyHost) {}

  private login(): LoginState {
    const s = (this.host.flag('daily:login') as LoginState | undefined) ?? { month: '', count: 0, lastDay: -1 };
    if (s.month !== utcMonth()) return { month: utcMonth(), count: 0, lastDay: s.lastDay };
    return { ...s };
  }

  private writs(): WritState {
    const s = this.host.flag('daily:writs') as WritState | undefined;
    const day = utcDay();
    return s && s.day === day ? s : { day, prog: {}, done: [], bundle: false };
  }

  /** Today's login reward is still to take. */
  get loginReady(): boolean {
    const s = this.login();
    return s.lastDay !== utcDay() && s.count < LOGIN_TRACK.length;
  }

  claimLogin(): void {
    const s = this.login();
    if (s.lastDay === utcDay() || s.count >= LOGIN_TRACK.length) return;
    const r = LOGIN_TRACK[s.count];
    s.count++;
    s.lastDay = utcDay();
    this.host.setFlag('daily:login', s);
    if (r.marks) this.host.addMarks(r.marks);
    for (const it of r.items ?? []) this.host.give(it, 1);
    this.host.banner('Day ' + s.count + ' reward', describe(r));
    this.host.sound();
  }

  /** Some work toward today's writs. */
  bump(kind: WritKind, n = 1): void {
    this.host.also?.(kind, n);
    const s = this.writs();
    let changed = false;
    for (const w of writsFor(s.day)) {
      if (w.kind !== kind || s.done.includes(w.id)) continue;
      s.prog[w.id] = Math.min(w.need, (s.prog[w.id] ?? 0) + n);
      changed = true;
      if (s.prog[w.id] >= w.need) {
        s.done.push(w.id);
        this.host.addMarks(w.marks);
        this.host.addXp(w.skill, w.xp);
        this.host.banner('Writ done', w.name);
        this.host.system('Charter writ done: ' + w.name + '. ' + w.marks + ' marks.');
        this.host.sound();
      }
    }
    if (!changed) return;
    if (!s.bundle && s.done.length >= 3) {
      s.bundle = true;
      this.host.addMarks(WRIT_BUNDLE.marks);
      const item = WRIT_BUNDLE.items[Math.floor(Math.random() * WRIT_BUNDLE.items.length)];
      this.host.give(item, 1);
      this.host.system('All three writs done for the day: ' + WRIT_BUNDLE.marks + ' marks and ' + ITEMS[item].name + '.');
    }
    this.host.setFlag('daily:writs', s);
  }

  view(): DailyView {
    const w = this.writs(), l = this.login();
    return {
      writs: writsFor(w.day).map((d) => ({ id: d.id, name: d.name, desc: d.desc, have: w.prog[d.id] ?? 0, need: d.need, done: w.done.includes(d.id), marks: d.marks })),
      bundleDone: w.bundle,
      resetIn: untilReset(),
      login: { month: l.month, count: l.count, claimedToday: l.lastDay === utcDay(), track: LOGIN_TRACK.map((r) => ({ label: describe(r), rare: !!r.label, marks: r.marks ?? 0, items: [...(r.items ?? []).reduce((m, it) => m.set(it, (m.get(it) ?? 0) + 1), new Map<string, number>())] })) },
      bundle: { marks: WRIT_BUNDLE.marks, items: [...new Set(WRIT_BUNDLE.items)] },
    };
  }
}
