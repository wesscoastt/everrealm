import { NPCS } from '../src/data/npcs';
const [x, z, r] = process.argv.slice(2).map(Number);
for (const n of NPCS) { const a = n.schedule[0].at; if (Math.hypot(a[0] - x, a[1] - z) < r) console.log(n.id.padEnd(20), (n.name ?? '').padEnd(22), (n.title ?? '').slice(0, 40).padEnd(40), a.map((v) => v.toFixed(1)).join(','), n.schedule.length > 1 ? `(${n.schedule.length} slots)` : ''); }
