import './_landmorrow';
import { generateChunk } from '../src/world/chunkgen';
import { plan } from '../src/world/sites';
plan();
for (const [cx, cz] of [[66, 35], [67, 36], [5, 5], [70, 37]]) {
  try { const r = generateChunk(cx, cz); console.log(cx, cz, 'ok', r.data.length); } catch (e) { console.log(cx, cz, 'ERR', (e as Error).stack?.split('\n').slice(0, 6).join('\n')); }
}
