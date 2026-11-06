import { ITEMS } from '../src/data/items';
const all = Object.values(ITEMS);
const pick = (f: (d: typeof all[number]) => boolean, n: number) => all.filter(f).slice(0, n).map((d) => d.id);
const fams = new Map<string, string>();
for (const d of all) if (d.weapon?.model && !fams.has(d.weapon.model.family)) fams.set(d.weapon.model.family, d.id);
console.log(JSON.stringify([...fams.values(), ...pick((d) => !!d.trinket?.model, 4), ...(['head', 'chest', 'legs', 'hands', 'feet'] as const).flatMap((s) => pick((d) => d.armor?.slot === s && !!d.armor.look, 2))]));
