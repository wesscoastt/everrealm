import { NPCS } from '../src/data/npcs';
const by = new Map<string, string[]>();
for (const n of NPCS) { const first = n.name.replace(/^(The|Old|Young|Mother|Father|Brother|Sister|Captain|Mr|Mrs|Miss|Master|Mistress)\s+/, '').split(/[\s,]/)[0]; if (!/^[A-Z][a-z]+$/.test(first)) continue; (by.get(first) ?? by.set(first, []).get(first)!).push(n.name + ' [' + n.id + ']'); }
const dup = [...by].filter(([, v]) => new Set(v.map((x) => x.split(' [')[0])).size > 1).sort((a, b) => b[1].length - a[1].length);
console.log(dup.length, 'first names shared by different people;', dup.filter(([, v]) => v.length >= 3).length, 'by three or more');
for (const [k, v] of dup.slice(0, 40)) console.log(String(v.length).padStart(2), k.padEnd(10), v.join('; '));
