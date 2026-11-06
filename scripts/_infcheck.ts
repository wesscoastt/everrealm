import { NPCS } from '../src/data/npcs';
import { DIALOGUE } from '../src/data/dialogue';
for (const id of ['co_jenifer', 'co_cadan', 'co_lionel']) console.log(id, !!NPCS.find((n) => n.id === id), !!DIALOGUE[id]);
const t = DIALOGUE['co_jenifer'];
const fake = { flag: (k: string) => (k === 'co:job' ? { kind: 'collect', debtor: 'co_jenifer' } : undefined), has: () => false } as never;
console.log('start', t?.start(fake), Object.keys(t?.nodes ?? {}));
