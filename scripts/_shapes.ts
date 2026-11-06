import { ITEMS } from '../src/data/items';
const by = new Map<string, string[]>();
for (const d of Object.values(ITEMS)) { if (d.weapon?.model || d.trinket?.model || (d.armor?.look && d.armor.slot !== 'hands')) continue; const k = d.icon.shape + ' / ' + d.kind; (by.get(k) ?? by.set(k, []).get(k)!).push(d.name); }
for (const [k, v] of [...by].sort((a, b) => b[1].length - a[1].length).slice(0, 22)) console.log(String(v.length).padStart(4), k.padEnd(26), v.slice(0, 7).join('; '));
