import { DIALOGUE } from '../src/data/dialogue';
for (const id of ['marta_vidal']) console.log(id, Object.keys(DIALOGUE[id].nodes).join(' '));
