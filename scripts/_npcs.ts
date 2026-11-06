import { NPCS } from '../src/data/npcs';
import { inMorrow } from '../src/world/morrow';
const m = NPCS.filter((n) => inMorrow(n.schedule[0].at[0]));
console.log('npcs', NPCS.length, 'in morrow', m.length, m.slice(0, 8).map((n) => n.id + '@' + n.schedule[0].at.map(Math.round)).join(' '));
// Morrow NPCs that might still be in the local frame (x < 4096 but meant for Morrow)
const ids = ['mateu_bosch', 'quim_soler', 'xisca_mir'];
for (const id of ids) { const n = NPCS.find((q) => q.id === id); console.log(id, n?.schedule.map((s) => s.at.map(Math.round).join(',')).join(' ')); }
