import { ITEMS } from '../src/data/items';
const by = new Map<string, string[]>();
for (const d of Object.values(ITEMS)) { if (!(d.kind === 'tool' || d.kind === 'trophy')) continue; const k = d.kind + ':' + d.icon.shape; by.set(k, [...(by.get(k) ?? []), d.name]); }
for (const [k, v] of by) console.log(k.padEnd(18), v.length, v.slice(0, 8).join(' | '));
