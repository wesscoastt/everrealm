import { NPCS } from '../src/data/npcs';
for (const n of NPCS) if (n.name === 'Clara Ferrer' || n.name === 'Nina Vidal') for (const s of n.schedule) console.log(n.name, s.from, s.to, s.at.map((v) => v.toFixed(1)).join(','), s.indoors ? 'indoors' : '', s.y ?? '');
