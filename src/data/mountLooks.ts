import type { Breed, MountLook } from '../entities/creatures';
import { ITEMS } from './items';

// A mount's look, chosen when you buy it: a coat (the colours a breeder has, and for horses the
// markings too: piebald, skewbald) and a saddle cloth, or a wagon's paint. The first of each is the
// look the halter's description talks about. The choice is kept on the character (flag look:<id>)
// and travels with the mount's id to everyone who sees you ride: "halter_bay.25" is a bay halter in
// coat 2 with cloth 5.

export interface Coat { name: string; a: string; b: string; breed?: Breed | null }
export interface Cloth { name: string; hex: string }

const scale = (hex: string, k: number) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');

const HORSE_SOLID: Coat[] = [
  { name: 'Bay', a: '#8a5a2e', b: '#1e1610' },
  { name: 'Black', a: '#1a1618', b: '#0e0c0c' },
  { name: 'Chestnut', a: '#a8532a', b: '#6a2e14' },
  { name: 'Grey', a: '#b8b8b0', b: '#e8e6e0' },
  { name: 'Dun', a: '#b89a62', b: '#3a2a1a' },
  { name: 'Palomino', a: '#d8b060', b: '#f4ecd8' },
  { name: 'Roan', a: '#9a6a62', b: '#4a2a20' },
];
const HORSE_MARKED: Coat[] = [
  { name: 'Piebald', a: '#2a2220', b: '#1a1410', breed: 'pied' },
  { name: 'Skewbald', a: '#8a5a2e', b: '#3a2a1a', breed: 'pied' },
];
const DEER: Coat[] = [
  { name: 'Red deer', a: '#8a4a1e', b: '#5a3a1e' },
  { name: 'Fallow', a: '#b88a5a', b: '#4a3a2a' },
  { name: 'Sika', a: '#5a3a24', b: '#2a1e14' },
  { name: 'White', a: '#f0f0ec', b: '#d8d8e0' },
];
const SHEEP: Coat[] = [
  { name: 'Cream fleece', a: '#e0d8c4', b: '#4a3a2a' },
  { name: 'Grey fleece', a: '#a8a8a0', b: '#3a3a3a' },
  { name: 'Moorit', a: '#7a5a3a', b: '#2a1e14' },
  { name: 'Black fleece', a: '#3a3230', b: '#1a1410' },
];

export const CLOTHS: Cloth[] = [
  { name: 'Charter blue', hex: '#2e4a7a' }, { name: 'Oxblood', hex: '#7a2a24' }, { name: 'Forest', hex: '#3a5a2a' },
  { name: 'Ochre', hex: '#b8862a' }, { name: 'Plum', hex: '#5a2e4a' }, { name: 'Teal', hex: '#2a6a6a' },
  { name: 'Black', hex: '#1e1a1a' }, { name: 'Cream', hex: '#d8ccb0' },
];

/** The coats a mount can be had in: the first is the halter's own. */
export function coatsOf(id: string): Coat[] {
  const m = ITEMS[id]?.mount;
  if (!m) return [];
  const own: Coat = { name: 'As described', a: m.coat, b: m.mane };
  const breed = m.breed;
  if (m.glow || breed === 'kelpie') return [own, { name: 'Darker', a: scale(m.coat, 0.65), b: scale(m.mane, 0.75) }, { name: 'Paler', a: scale(m.coat, 1.35), b: scale(m.mane, 1.2) }];
  if (!breed || breed === 'pied') return [own, ...HORSE_SOLID.map((c) => ({ ...c, breed: null })), ...HORSE_MARKED];
  if (breed === 'shire' || breed === 'pack') return [own, ...HORSE_SOLID];
  if (breed === 'elk') return [own, ...DEER];
  if (breed === 'ram') return [own, ...SHEEP];
  return [own, { name: 'Dark', a: scale(m.coat, 0.62), b: scale(m.mane, 0.75) }, { name: 'Pale', a: scale(m.coat, 1.3), b: scale(m.mane, 1.2) }];
}

/** The cloths (a wagon's paint, for a wagon): the first is the halter's own. */
export function clothsOf(id: string): Cloth[] {
  const m = ITEMS[id]?.mount;
  if (!m) return [];
  return [{ name: 'As described', hex: m.wagon?.paint ?? m.cloth }, ...CLOTHS];
}

export function mountKey(id: string, coat = 0, cloth = 0): string {
  return coat || cloth ? `${id}.${Math.min(9, coat)}${Math.min(9, cloth)}` : id;
}
export function parseMountKey(key: string): { id: string; coat: number; cloth: number } {
  const [id, v] = key.split('.');
  return { id, coat: v ? Number(v[0]) || 0 : 0, cloth: v ? Number(v[1]) || 0 : 0 };
}

/** A mount's look in a chosen coat and cloth (null: not a mount). */
export function mountLook(id: string, coat = 0, cloth = 0): MountLook | null {
  const m = ITEMS[id]?.mount;
  if (!m) return null;
  const c = coatsOf(id)[coat] ?? coatsOf(id)[0], k = clothsOf(id)[cloth] ?? clothsOf(id)[0];
  const breed = c.breed === null ? undefined : c.breed ?? m.breed;
  const look: MountLook = { ...m, coat: c.a, mane: c.b, breed };
  if (cloth) {
    look.cloth = k.hex;
    if (m.wagon) look.wagon = { ...m.wagon, paint: k.hex };
  }
  return look;
}

/** A mount's look by its key, as it travels to other players ("halter_bay.25"). */
export function mountOf(key: string | null | undefined): MountLook | null {
  if (!key) return null;
  const { id, coat, cloth } = parseMountKey(key);
  return mountLook(id, coat, cloth);
}
