import { DIALOGUE } from '../src/data/dialogue';
import { SHOPS } from '../src/data/shops';
import { NPCS } from '../src/data/npcs';
import '../src/data/pledges';
const fake = new Proxy({}, { get: () => () => undefined }) as never;
for (const [id, sh] of Object.entries(SHOPS)) {
  if (sh.currency || id.startsWith('co_') || id.startsWith('inf_') || id.startsWith('biz_') || id.startsWith('yard_')) continue;
  const t = DIALOGUE[sh.owner]; const n = NPCS.find((x) => x.id === sh.owner);
  let start = '?'; try { start = t?.start(fake) ?? '-'; } catch { start = 'err'; }
  const opts = t?.nodes[start]?.options?.map((o) => (typeof o.text === 'string' ? o.text : 'fn')).slice(0, 4).join(' | ');
  console.log(id.padEnd(16), (n?.name ?? '-').padEnd(20), (n?.title ?? '').slice(0, 22).padEnd(22), start, '::', opts);
}
