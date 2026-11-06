import { QUESTS } from '../src/data/quests';
const list = Object.values(QUESTS).filter((q) => q.story).sort((a, b) => a.story!.chapter - b.story!.chapter);
console.log(list.map((q) => `${q.story!.chapter} ${q.story!.title}${q.next ? ' -> ' + q.next[0] : ''}`).join('\n'));
const seen = new Map<number, number>(); for (const q of list) seen.set(q.story!.chapter, (seen.get(q.story!.chapter) ?? 0) + 1);
console.log('duplicates:', [...seen].filter(([, n]) => n > 1).map(([c]) => c).join(',') || 'none', '; gaps:', list.map((q) => q.story!.chapter).filter((c, i, a) => i && c !== a[i - 1] + 1).join(',') || 'none');
