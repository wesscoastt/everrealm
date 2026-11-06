import { coastX } from '../src/world/terrain';
import { POSTS } from '../src/data/travel';
console.log('coastX(600)', coastX(600), 'coastX(500)', coastX(500), 'coastX(700)', coastX(700));
for (const p of POSTS.filter((q) => ['gullmouth', 'mewstones', 'inkholm', 'kell', 'sickle', 'skua', 'callis', 'saltpenny', 'coldharbour'].includes(q.id))) console.log(p.id, p.x, p.z, p.ferryFrom ?? '');
