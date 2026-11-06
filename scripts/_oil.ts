import { ITEMS } from '../src/data/items';
import { CONTENT } from '../src/data/content';
for (const c of CONTENT) for (const it of c.items ?? []) if (it.id === 'oilskin') console.log('content item oilskin in', c.id);
console.log('ITEMS.oilskin', ITEMS['oilskin']?.name, ITEMS['oilskin']?.kind);
console.log('armour ids with oilskin', Object.keys(ITEMS).filter((k) => k.startsWith('oilskin')).join(','));
