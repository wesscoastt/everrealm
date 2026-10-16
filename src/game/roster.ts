import { loadSave, SAVE_KEY, SaveData } from './state';

// The characters kept in this browser. Each character is its own save under its own key; the
// roster lists them and remembers which was played last. The first character a browser ever made
// lives at the original single-save key ("main"), so saves from before the roster load unchanged.

const ROSTER_KEY = 'everrealm.roster.v1';
export const MAX_CHARACTERS = 6;

interface RosterData { ids: string[]; last: string | null }

export function saveKeyFor(id: string): string {
  return id === 'main' ? SAVE_KEY : `${SAVE_KEY}:${id}`;
}

function read(): RosterData {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) {
      const d = JSON.parse(raw) as RosterData;
      if (Array.isArray(d.ids)) return { ids: d.ids.filter((x) => typeof x === 'string'), last: d.last ?? null };
    }
  } catch { /* storage unavailable or corrupt: fall through to what the old key says */ }
  const legacy = loadSave(SAVE_KEY);
  return { ids: legacy ? ['main'] : [], last: legacy ? 'main' : null };
}

function write(d: RosterData): void {
  try { localStorage.setItem(ROSTER_KEY, JSON.stringify(d)); } catch { /* private window: the roster lasts this session */ }
}

export interface Character { id: string; save: SaveData }

/** Every character with a readable save, in roster order. Entries whose save has gone are dropped. */
export function listCharacters(): Character[] {
  const d = read();
  const out: Character[] = [];
  for (const id of d.ids) {
    const save = loadSave(saveKeyFor(id));
    if (save) out.push({ id, save });
  }
  if (out.length !== d.ids.length) write({ ids: out.map((c) => c.id), last: out.some((c) => c.id === d.last) ? d.last : out[0]?.id ?? null });
  return out;
}

export function lastPlayed(): string | null {
  return read().last;
}

export function setLastPlayed(id: string): void {
  const d = read();
  if (!d.ids.includes(id)) d.ids.push(id);
  d.last = id;
  write(d);
}

/** A fresh id for a new character. The first character in an empty browser takes the original key. */
export function newCharacterId(): string {
  const d = read();
  if (!d.ids.includes('main') && !loadSave(SAVE_KEY)) return 'main';
  let id = '';
  do id = Math.random().toString(36).slice(2, 8); while (d.ids.includes(id));
  return id;
}

/** Add a character (its save already written under its key) to the roster without playing it. */
export function rememberCharacter(id: string): void {
  const d = read();
  if (!d.ids.includes(id)) { d.ids.push(id); if (!d.last) d.last = id; write(d); }
}

export function deleteCharacter(id: string): void {
  try { localStorage.removeItem(saveKeyFor(id)); } catch { /* storage unavailable */ }
  const d = read();
  d.ids = d.ids.filter((x) => x !== id);
  if (d.last === id) d.last = d.ids[0] ?? null;
  write(d);
}
