import { boardToday, contractSecs, contractTitle, HOUSES } from '../src/data/company';
for (const day of [20757, 20758]) for (const h of HOUSES) console.log(day, h.id, boardToday(h.id, day).map((c) => `${contractTitle(c)} ${c.kind === 'carry' ? Math.round(contractSecs(c) / 60) + 'm ' : ''}${c.marks}m/${c.scrip}s`).join(' | '));
