import type { Equip } from '../data/items';
import type { Appearance } from '../entities/humanoid';
import { ITEMS, SkillId } from '../data/items';
import { levelForXp } from '../data/gameplay';

export const INV_SIZE = 28;
export const SAVE_KEY = 'everrealm.save.v1';

export interface Stack { id: string; n: number }

export interface Settings {
  master: number;
  sfx: number;
  ambience: number;
  music: number;
  shadows: boolean;
  renderScale: number;
  dayLength: number; // real minutes per in-game day
  viewDist: number; // chunks
}

export interface SaveData {
  v: 1;
  name: string;
  look: Appearance;
  pos: [number, number, number];
  yaw: number;
  hour: number;
  hp: number;
  xp: Record<SkillId, number>;
  inv: (Stack | null)[];
  equip: Equip;
  marks: number;
  flags: Record<string, unknown>;
  quests: Record<string, string>;
  discovered: string[];
  playTime: number;
  settings: Settings;
  /** Chunk keys the player has seen, for the explored map. */
  explored?: number[];
  /** Where the character grew up (an id from ORIGINS), chosen in the creator. */
  origin?: string;
}

export const DEFAULT_SETTINGS: Settings = { master: 0.8, sfx: 0.9, ambience: 0.7, music: 0.45, shadows: true, renderScale: 1, dayLength: 24, viewDist: 6 };

export function newSave(name: string, look: Appearance): SaveData {
  const inv: (Stack | null)[] = new Array(INV_SIZE).fill(null);
  inv[0] = { id: 'farm_hatchet', n: 1 };
  inv[1] = { id: 'bread', n: 3 };
  return {
    v: 1, name, look,
    pos: [150.5, 19, 187.5], yaw: Math.PI, hour: 8.5, hp: 100,
    xp: { melee: 0, mining: 0, smithing: 0, fishing: 0, cooking: 0, woodcutting: 0 },
    inv, equip: { weapon: 'worn_sword', head: null },
    marks: 12, flags: {}, quests: {}, discovered: [], playTime: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSave(key = SAVE_KEY): SaveData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1) return null;
    d.settings = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) };
    d.inv = d.inv.map((s) => (s && ITEMS[s.id] ? s : null));
    while (d.inv.length < INV_SIZE) d.inv.push(null);
    return d;
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData, key = SAVE_KEY): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}

/** Inventory operations over the save's slot array. */
export class Inventory {
  constructor(private d: SaveData) {}

  get slots(): (Stack | null)[] { return this.d.inv; }

  count(id: string): number {
    let n = 0;
    for (const s of this.d.inv) if (s?.id === id) n += s.n;
    return n;
  }

  freeSlots(): number {
    return this.d.inv.filter((s) => !s).length;
  }

  canAdd(id: string, n = 1): boolean {
    const def = ITEMS[id];
    if (!def) return false;
    if (def.stack && this.d.inv.some((s) => s?.id === id)) return true;
    return this.freeSlots() >= (def.stack ? 1 : n);
  }

  add(id: string, n = 1): boolean {
    const def = ITEMS[id];
    if (!def || !this.canAdd(id, n)) return false;
    if (def.stack) {
      const s = this.d.inv.find((x) => x?.id === id);
      if (s) { s.n += n; return true; }
      const i = this.d.inv.indexOf(null);
      this.d.inv[i] = { id, n };
      return true;
    }
    for (let k = 0; k < n; k++) {
      const i = this.d.inv.indexOf(null);
      this.d.inv[i] = { id, n: 1 };
    }
    return true;
  }

  remove(id: string, n = 1): boolean {
    if (this.count(id) < n) return false;
    let left = n;
    for (let i = this.d.inv.length - 1; i >= 0 && left > 0; i--) {
      const s = this.d.inv[i];
      if (s?.id !== id) continue;
      const take = Math.min(left, s.n);
      s.n -= take;
      left -= take;
      if (s.n <= 0) this.d.inv[i] = null;
    }
    return true;
  }

  removeAt(i: number, n = 1): Stack | null {
    const s = this.d.inv[i];
    if (!s) return null;
    const take = Math.min(n, s.n);
    s.n -= take;
    if (s.n <= 0) this.d.inv[i] = null;
    return { id: s.id, n: take };
  }

  swap(a: number, b: number): void {
    const t = this.d.inv[a];
    this.d.inv[a] = this.d.inv[b];
    this.d.inv[b] = t;
  }

  /** Best usable tool for a skill given the player's level. */
  bestTool(skill: SkillId, level: number): string | null {
    let best: string | null = null;
    let power = 0;
    for (const s of this.d.inv) {
      const t = s && ITEMS[s.id].tool;
      if (t && t.skill === skill && t.level <= level && t.power > power) { best = s!.id; power = t.power; }
    }
    return best;
  }
}

export function skillLevel(d: SaveData, skill: SkillId): number {
  return levelForXp(d.xp[skill]);
}
