import { ITEMS } from '../src/data/items';
console.log(JSON.stringify(Object.values(ITEMS).filter((d) => d.kind === 'trophy' || ['lockpick', 'loupe'].includes(d.id)).map((d) => d.id).slice(0, 14)));
